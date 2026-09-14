import React, { useState, useMemo, useRef } from 'react';
import { Star } from 'lucide-react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig, SiteContentConfig } from '../types';
import { CATEGORIES, POPULAR_TAGS, MATERIALS_CATALOG, DEFAULT_SITE_CONTENT } from '../data/mockData';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { CadQuickViewModal } from '../components/CadQuickViewModal';
import { CustomIdeaRequestModal } from '../components/custom/CustomIdeaRequestModal';
import { HorizontalScrollFilter } from '../components/HorizontalScrollFilter';
import { MaterialComparisonMatrix } from '../components/MaterialComparisonMatrix';
import { ServiceShowcaseSection } from '../components/services/ServiceShowcaseSection';
import { SEOHead } from '../components/SEOHead';
import { useLanguage } from '../context/LanguageContext';
import { EMPTY_VALUE, formatNumber, formatPercent } from '@frontend/lib/format';
import { Icon, Button, Card, EmptyState, InfoTip } from '@frontend/ui';

interface HomeViewProps {
  products: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  siteContent?: SiteContentConfig;
  onAddToCart?: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onSelectProduct: (product: Product) => void;
  onShowToast?: (msg: string) => void;
}

/** Số hữu hạn hay không — dùng chung cho mọi thông số giá (NULL/NaN ⇒ KHÔNG có giá trị). */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Tiền VND: thiếu giá trị ⇒ `—`, không bịa `0 đ`.
 * `0` KHÔNG phải một mức giá: `price_digital` / `price_physical` = 0 nghĩa là người bán KHÔNG
 * bán kênh đó. Cùng luật với `ExploreView.tsx` (`Number.isFinite(value) && value > 0 ? … : EMPTY_VALUE`).
 */
const vnd = (v: unknown, locale: string): string =>
  isNum(v) && v > 0 ? `${formatNumber(v, { locale, maximumFractionDigits: 0 })} đ` : EMPTY_VALUE;

/** Điểm đánh giá chỉ có nghĩa khi CÓ cả điểm VÀ số lượng đánh giá thật. */
const hasRating = (product: Product): boolean =>
  isNum(product.rating) && product.rating > 0 && isNum(product.reviewsCount) && product.reviewsCount > 0;

interface HeroChassisModel {
  id: 'gear' | 'drone' | 'box' | 'arch';
  labelVi: string;
  labelEn: string;
  titleVi: string;
  titleEn: string;
  dims: string;
  material: string;
  color: string;
  icon: string;
}

const HERO_CHASSIS_MODELS: HeroChassisModel[] = [
  {
    id: 'gear',
    labelVi: 'Bánh Răng',
    labelEn: 'Spur Gear',
    titleVi: 'Bánh Răng Truyền Động (Module 2.5)',
    titleEn: 'Mechanical Spur Gear (Module 2.5)',
    dims: '95 × 95 × 22 mm',
    material: 'PA12-CF / Nylon',
    color: '#00687a',
    icon: 'settings',
  },
  {
    id: 'drone',
    labelVi: 'Khung Drone',
    labelEn: 'Drone Arm',
    titleVi: 'Cánh Tay Drone Gia Cường Carbon',
    titleEn: 'Carbon-Reinforced Drone Arm',
    dims: '160 × 42 × 18 mm',
    material: 'Carbon Fiber PLA',
    color: '#38bdf8',
    icon: 'flight',
  },
  {
    id: 'box',
    labelVi: 'Vỏ Hộp IoT',
    labelEn: 'IoT Case',
    titleVi: 'Vỏ Hộp Điện Tử IoT Kháng Nước IP65',
    titleEn: 'Water-Resistant IP65 IoT Enclosure',
    dims: '115 × 80 × 38 mm',
    material: 'PETG Chịu Lực',
    color: '#10b981',
    icon: 'inventory_2',
  },
  {
    id: 'arch',
    labelVi: 'Cấu Trúc Vòm',
    labelEn: 'Arch Truss',
    titleVi: 'Cấu Trúc Vòm Chịu Lực FEM',
    titleEn: 'FEM Topology Load Arch Bracket',
    dims: '130 × 65 × 50 mm',
    material: 'Resin High-Temp',
    color: '#f59e0b',
    icon: 'view_in_ar',
  },
];

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  materials = MATERIALS_CATALOG,
  pricingConfig,
  siteContent,
  onAddToCart,
  onNavigate,
  onSelectProduct,
  onShowToast
}) => {
  const { language, t } = useLanguage();
  const isVi = language === 'vi';
  const locale = isVi ? 'vi-VN' : 'en-US';
  const materialsList = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;
  /**
   * D8/Đợt P: `DEFAULT_INKIRI_FORMULA_CONFIG` KHÔNG còn là nguồn giá trị. Không có cấu hình
   * thật ⇒ `null` và mọi con số phái sinh đều là `—` kèm InfoTip nêu ĐÍCH DANH thông số thiếu
   * (đúng luật của `pricingEngine`, xem `docs/plans/27-pricing-parameters.md` §3).
   */
  const cfg: InkiriCostFormulaConfig | null = pricingConfig ?? null;
  const activeContent = siteContent || DEFAULT_SITE_CONTENT;

  // Hero Dropzone Interactive State & File Reference
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  // Active Model in Hero 3D Chassis
  const [heroModel, setHeroModel] = useState<'gear' | 'drone' | 'box' | 'arch'>('gear');
  const activeHeroModelMeta = HERO_CHASSIS_MODELS.find((m) => m.id === heroModel) || HERO_CHASSIS_MODELS[0];

  // CAD Catalog Filter & Browse State
  const [cadSearch, setCadSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'tech-table'>('grid');

  // 3D Quick-Inspect Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState<boolean>(false);

  // Custom 3D Idea Request Modal State
  const [isCustomIdeaModalOpen, setIsCustomIdeaModalOpen] = useState<boolean>(false);

  // Filter products based on Category, Tag, Search, and Pricing Mode
  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query Filter
      if (cadSearch.trim() !== '') {
        const q = cadSearch.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesigner = (p.designer || '').toLowerCase().includes(q);
        const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        if (!matchName && !matchDesigner && !matchTags && !matchSku) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // 3. Tag Filter
      if (selectedTag !== 'all') {
        const q = selectedTag.toLowerCase();
        const tags = p.tags || [];
        const features = p.features || [];
        if (q === '2/9') {
          const match29 = tags.some(t => t.includes('2/9') || t.toLowerCase().includes('đại lễ') || t.toLowerCase().includes('quốc khánh'));
          if (!match29) return false;
        } else if (q === 'mechanical') {
          const matchMech = p.category === 'mechanical' || tags.some(t => t.toLowerCase().includes('cơ khí') || t.toLowerCase().includes('mechanical') || t.toLowerCase().includes('gears'));
          if (!matchMech) return false;
        } else if (q === 'iot') {
          const matchIot = p.category === 'iot' || tags.some(t => t.toLowerCase().includes('iot') || t.toLowerCase().includes('arduino') || t.toLowerCase().includes('esp32'));
          if (!matchIot) return false;
        } else if (q === 'robotics') {
          const matchRobo = tags.some(t => t.toLowerCase().includes('robot') || t.toLowerCase().includes('nema') || t.toLowerCase().includes('drone'));
          if (!matchRobo) return false;
        } else if (q === 'snap-fit') {
          const matchSnap = tags.some(t => t.toLowerCase().includes('snap-fit') || t.toLowerCase().includes('snap fit')) || features.some(f => f.toLowerCase().includes('snap-fit'));
          if (!matchSnap) return false;
        } else if (q === 'resin-8k') {
          const matchResin = (p.supportedMaterials || []).some(m => m.toLowerCase().includes('resin')) || tags.some(t => t.toLowerCase().includes('resin'));
          if (!matchResin) return false;
        } else if (q === 'decor') {
          const matchDecor = p.category === 'tabletop' || tags.some(t => t.toLowerCase().includes('decor') || t.toLowerCase().includes('parametric') || t.toLowerCase().includes('vase'));
          if (!matchDecor) return false;
        } else if (q === 'bán-chạy') {
          const matchBest = (p.salesCount && p.salesCount > 100) || p.badge === 'BÁN CHẠY' || tags.some(t => t.toLowerCase().includes('bán chạy'));
          if (!matchBest) return false;
        } else {
          const matchGen = tags.some(t => t.toLowerCase().includes(q));
          if (!matchGen) return false;
        }
      }

      return true;
    });
  }, [products, cadSearch, selectedCategory, selectedTag]);
  // Open Walled Garden: Seamless guest exploration without forced login redirects
  const handleProtectedAction = (action: () => void) => {
    action();
  };

  const handleSelectProductAction = (product: Product, targetScreen: string = 'product_detail') => {
    onSelectProduct(product);
    onNavigate(targetScreen, { product });
  };

  const handleOpen3DPreview = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleQuickAddDigital = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAddToCart) {
      onSelectProduct(product);
      onNavigate('product_detail', { product });
      return;
    }
    // Data-honesty: `price_digital` không lớn hơn 0 (0 hoặc NULL/NaN) nghĩa là người bán KHÔNG
    // bán kênh file số ⇒ KHÔNG được đẩy vào giỏ một dòng 0đ. Chỉ giá `> 0` mới là CÓ BÁN.
    if (!(isNum(product.priceDigital) && product.priceDigital > 0)) {
      onShowToast?.(isVi
        ? `Sản phẩm "${product.name}" không mở bán kênh file số (giá file số không lớn hơn 0) nên chưa thể mua.`
        : `"${product.name}" is not sold as a CAD file (its CAD price is not greater than 0), so it cannot be purchased.`);
      return;
    }
    const item: CartItem = {
      id: `cart-digital-${Date.now()}-${Math.random()}`,
      productId: product.id,
      type: 'digital',
      name: product.name,
      designer: product.designer,
      image: product.images?.[0],
      price: product.priceDigital,
      quantity: 1,
      // Data-honesty (P3b): KHONG doan ho giay phep/dinh dang tep khi san pham chua khai.
      // Gia tri that duoc truyen thang; gio hang render `-` khi trong (xem CartView).
      fileFormat: product.cadFormat ?? undefined,
      licenseType: product.licenseType ?? undefined
    };
    onAddToCart(item);
    if (onShowToast) {
      onShowToast(isVi ? `Đã thêm File CAD "${product.name}" vào giỏ!` : `Added CAD File "${product.name}" to cart!`);
    }
  };

  // §3 data-honesty: KHÔNG rơi về danh sách đoán. Rỗng ⇒ ẩn cả khối thành tích.
  const partnersList = (activeContent.trustPartnersList ?? DEFAULT_SITE_CONTENT.trustPartnersList ?? [])
    .filter((p) => typeof p === 'string' && p.trim() !== '');
  const hasPartners = partnersList.length > 0;
  // Dải số liệu: giá trị rỗng ⇒ "Chưa cấu hình" (nhập ở /admin -> Nội dung site), không đoán.
  const heroMetrics = [
    { label: activeContent.heroMetric1Label || 'Dung Sai Đo Kiểm', value: (activeContent.heroMetric1Value || '').trim() },
    { label: activeContent.heroMetric2Label || 'Thời Gian Bàn Giao', value: (activeContent.heroMetric2Value || '').trim() },
    { label: activeContent.heroMetric3Label || 'Tiêu Chuẩn Sản Xuất', value: (activeContent.heroMetric3Value || '').trim() },
  ];
  // P1 §5: cả 3 chỉ số rỗng ⇒ gộp thành MỘT DÒNG MẢNH thay vì một hàng 3 thẻ trống.
  const heroMetricsFilled = heroMetrics.filter((m) => m.value);
  const toleranceSpec = (activeContent.toleranceSpec || '').trim();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-fg font-sans relative selection:bg-primary selection:text-primary-fg">
      {/* SEO & Dynamic Head */}
      <SEOHead
        title={activeContent.seoTitle || 'VCUBE — Dịch Vụ In 3D Công Nghiệp & Báo Giá CAD Tức Thì'}
        description={activeContent.seoDescription || 'Nền tảng sản xuất bồi đắp linh kiện cơ khí và khuôn mẫu kỹ thuật số hàng đầu Việt Nam.'}
        image={activeContent.seoOgImage}
        url={activeContent.seoCanonicalUrl}
        type="website"
      />

      {/* Background Ambient Glowing Radiance (Aligned with Login & Register) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-70">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-accent/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* 1. Dynamic Top Campaign Banner */}
      {activeContent.announcementActive && (
        <section className="bg-surface-inverse text-on-inverse py-2.5 sm:py-3 px-4 sm:px-6 md:px-12 border-b border-line/30 shadow-e1">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              {/* §2.5/§3: không emoji làm icon, không bịa tên chiến dịch ⇒ badge rỗng thì ẩn hẳn. */}
              {activeContent.announcementBadge && (
                <span className="bg-primary text-primary-fg text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-sm shadow-e1 tracking-wider shrink-0 flex items-center gap-1.5 border border-accent/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  {activeContent.announcementBadge}
                </span>
              )}
              <p className="text-xs sm:text-sm font-medium text-on-inverse/80 leading-snug">
                {activeContent.announcementText}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="secondary"
                onClick={() => {
                  if (activeContent.announcementActionTag) {
                    setSelectedTag(activeContent.announcementActionTag);
                  }
                  const el = document.getElementById('browse-cad-catalog');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                trailingIcon={<Icon name="arrow_downward" size={16} />}
              >
                <span>{activeContent.announcementActionText || 'Xem Sản Phẩm Tag 2/9'}</span>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 2. Hero Section with Interactive 3D Model Switcher */}
      <section className="relative overflow-hidden py-10 sm:py-14 lg:py-16 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-line-subtle rounded-sm text-xs uppercase font-mono tracking-[0.2em] text-primary font-bold w-fit">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>{activeContent.heroBadge || 'VCUBE PRECISION ANTHOLOGY // 2026'}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-fg tracking-tight leading-[1.12]">
                {activeContent.heroHeadlineLine1 || 'CHẾ TÁC CƠ KHÍ'}
                <br />
                <span className="text-primary">
                  {activeContent.heroHeadlineHighlight || 'IN 3D CÔNG NGHIỆP CHÍNH XÁC'}
                </span>
              </h1>

              <div className="flex gap-4 sm:gap-6 items-start max-w-xl">
                <div className="w-1.5 h-14 bg-primary rounded-full flex-shrink-0 mt-1" />
                <p className="text-sm sm:text-base text-fg-muted leading-relaxed font-sans font-normal">
                  {(!activeContent.heroSubheadline || activeContent.heroSubheadline.includes('Dữ liệu mẫu để kiểm thử') || activeContent.heroSubheadline.includes('--remove'))
                    ? (isVi ? 'Nền tảng sản xuất bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số.' : 'Additive manufacturing platform for precision parts, IoT enclosures, and rapid tooling.')
                    : activeContent.heroSubheadline}
                </p>
              </div>

              {/* Main CTAs — 1 CTA chính duy nhất cho mỗi viewport (§2.4) */}
              <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
                <Button size="lg"
                  onClick={() => onNavigate('quote')}
                  leadingIcon={<Icon name="upload_file" size={20} />}
                >
                  <span>{activeContent.heroCtaQuoteText || 'Báo Giá File 3D Tức Thì'}</span>
                </Button>

                <Button size="lg" variant="secondary"
                  onClick={() => {
                    const el = document.getElementById('browse-cad-catalog');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  leadingIcon={<Icon name="view_in_ar" size={20} className="text-primary" />}
                >
                  <span>{activeContent.heroCtaCatalogText || 'Khám Phá Kho Mẫu CAD'}</span>
                </Button>
              </div>

              {/* Instant CAD Dropzone Widget */}
              <div
                onClick={() => heroFileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    onNavigate('quote', { uploadedFile: file });
                  } else {
                    onNavigate('quote');
                  }
                }}
                className={`mt-2 p-3.5 border-2 border-dashed rounded-lg transition-all cursor-pointer group ${
                  isDraggingFile
                    ? 'border-primary bg-primary/15 shadow-e2 ring-2 ring-primary/30'
                    : 'bg-surface border-primary/40 hover:border-primary'
                }`}
                title="Bấm hoặc kéo thả file STL, 3MF, STEP, OBJ vào đây để nhận báo giá tức thì"
              >
                <input
                  ref={heroFileInputRef}
                  type="file"
                  accept=".stl,.3mf,.step,.stp,.obj"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      onNavigate('quote', { uploadedFile: file });
                    }
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center transition-transform ${
                    isDraggingFile ? 'bg-primary text-primary-fg scale-110' : 'bg-surface-muted text-primary group-hover:scale-105'
                  }`}>
                    <Icon name="cloud_upload" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-fg">
                        {isDraggingFile ? 'Thả tệp CAD vào đây để phân tích tức thì!' : 'Kéo thả tệp CAD (STL, 3MF, STEP, OBJ) vào đây hoặc bấm để chọn'}
                      </span>
                      <InfoTip label={isVi ? 'Tệp CAD được xử lý thế nào?' : 'How the CAD file is processed'}>
                        {isVi
                          ? 'Hệ thống tính thể tích, kiểm tra độ kín nước và dựng BOM từ chính tệp bạn tải lên. Mọi số đo hiển thị ở /quote đều lấy từ tệp đó.'
                          : 'Volume, watertightness and the BOM are computed from the file you upload. Every figure shown at /quote comes from that file.'}
                      </InfoTip>
                    </div>
                    <p className="text-xs text-fg-muted truncate">
                      STL · 3MF · STEP · STP · OBJ
                    </p>
                  </div>
                  <Icon name="arrow_forward" size={18} className="text-primary shrink-0" />
                </div>
              </div>

              {/* 3 Technical Quality Spec Metrics Cards */}
              {/* Dải số liệu kiểm định — nền `surface` + viền nhạt (§2.1: tint KHÔNG dùng cho thẻ KPI).
                  P1 §5: cả 3 rỗng ⇒ GỘP thành một dòng mảnh (trước đây là một hàng 3 thẻ trống). */}
              {heroMetricsFilled.length === 0 ? (
                <p className="pt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
                  <Icon name="info" size={16} className="text-fg-muted shrink-0" />
                  <span>
                    {isVi
                      ? 'Dung sai đo kiểm, thời gian bàn giao và tiêu chuẩn sản xuất:'
                      : 'Inspection tolerance, lead time and production standard:'}
                  </span>
                  <span className="font-mono font-semibold text-fg-muted">
                    {isVi ? 'Chưa cấu hình' : 'Not configured'}
                  </span>
                  <Button variant="ghost" size="sm" className="text-primary font-bold"
                    onClick={() => onNavigate('admin')}
                  >
                    {isVi ? 'Nhập ở /admin' : 'Set in /admin'}
                  </Button>
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {heroMetrics.map((m) => (
                    <Card key={m.label} padding="md">
                      <span className="block text-xs text-fg-muted font-medium mb-1">{m.label}</span>
                      {m.value ? (
                        <span className="font-mono text-sm sm:text-base font-extrabold text-primary tabular-nums">{m.value}</span>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-fg-muted">
                          {isVi ? 'Chưa cấu hình' : 'Not configured'}
                        </span>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Interactive 3D Showcase with Modern Chassis */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center pt-2 lg:pt-0">
              <div className="w-full rounded-2xl bg-surface-inverse text-on-inverse border border-line-subtle shadow-2xl relative flex flex-col overflow-hidden">
                {/* Tech Accent Top Edge */}
                <div className="h-0.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />

                {/* Top Header on 3D Chassis */}
                <div className="px-4 py-3 bg-surface-inverse/90 border-b border-line-subtle flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="font-mono text-xs font-bold text-accent tracking-wider uppercase">
                      CHASSIS // 3D VIEWER
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-surface-inverse-raised text-[10px] font-mono text-on-inverse/70 border border-line-subtle">
                      WebGL 2.0
                    </span>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded bg-surface-inverse-raised text-[10px] font-mono text-accent/80 border border-line-subtle">
                      INTERACTIVE
                    </span>
                  </div>
                </div>

                {/* Model Selector Tabs */}
                <div className="px-3 pt-2 pb-2 bg-surface-inverse/70 border-b border-line-subtle/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {HERO_CHASSIS_MODELS.map((item) => {
                    const isSelected = heroModel === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setHeroModel(item.id)}
                        className={`px-2.5 py-1.5 text-xs rounded-md font-mono font-bold transition-all duration-150 shrink-0 cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isSelected
                            ? 'bg-primary text-primary-fg shadow-sm'
                            : 'text-on-inverse/70 hover:text-on-inverse hover:bg-surface-inverse-raised/60'
                        }`}
                      >
                        <Icon name={item.icon} size={14} className={isSelected ? 'text-primary-fg' : 'text-accent/70'} />
                        <span>{isVi ? item.labelVi : item.labelEn}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 3D Canvas Viewer Stage */}
                <div className="w-full h-[320px] sm:h-[360px] relative bg-[#070d16]">
                  <ThreeModelViewer
                    modelType={heroModel}
                    color={activeHeroModelMeta.color}
                    showGrid={true}
                    autoRotate={true}
                    className="h-full w-full border-0 rounded-none"
                  />

                  {/* Telemetry HUD Overlay (Bottom Left) */}
                  <div className="absolute bottom-3 left-3 pointer-events-none z-10">
                    <div className="bg-surface-inverse/85 backdrop-blur-md px-3 py-2 rounded-lg border border-line-subtle shadow-e2 space-y-0.5">
                      <p className="font-mono text-xs font-bold text-accent truncate max-w-[220px]">
                        {isVi ? activeHeroModelMeta.titleVi : activeHeroModelMeta.titleEn}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-on-inverse/70">
                        <span>{activeHeroModelMeta.dims}</span>
                        <span>•</span>
                        <span className="text-on-inverse/90">{activeHeroModelMeta.material}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Action Bar on 3D Chassis */}
                <div className="px-4 py-3 bg-surface-inverse/95 border-t border-line-subtle flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
                  <div className="flex items-center gap-2 text-xs font-mono text-on-inverse/70">
                    <Icon name="touch_app" size={16} className="text-accent shrink-0" />
                    <span>
                      {isVi ? 'Kéo chuột để xoay 360° • Cuộn để thu phóng' : 'Drag to rotate 360° • Scroll to zoom'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onNavigate('quote')}
                    leadingIcon={<Icon name="upload_file" size={16} />}
                    className="shrink-0 w-full sm:w-auto shadow-md shadow-primary/20"
                  >
                    <span>{isVi ? 'Báo Giá Mẫu Này' : 'Quote This Model'}</span>
                  </Button>
                </div>
              </div>

              {/* Dải dung sai cam kết — CHỈ hiện khi có dữ liệu thật.
                  P1 §5: rỗng thì bỏ hẳn panel rời rạc "lạc lõng"; thông tin đã nằm
                  trong dòng mảnh ở cột trái (kèm lối nhập ở /admin). */}
              {toleranceSpec && (
                <Card padding="sm" className="w-full mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-sm bg-surface-muted text-primary flex items-center justify-center shrink-0">
                      <Icon name="verified" size={18} />
                    </div>
                    <div>
                      <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold block">
                        {isVi ? 'Dung Sai Cam Kết' : 'Committed Tolerance'}
                      </span>
                      <p className="text-xs font-medium text-fg">{toleranceSpec}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 CORE ENGINEERING SERVICES SHOWCASE // INTERACTIVE 3D & POPUPS */}
      <ServiceShowcaseSection
        onNavigate={onNavigate}
        onOpenCustomIdeaModal={() => setIsCustomIdeaModalOpen(true)}
      />

      {/* 3. BROWSE CAD CATALOG - MAIN SHOWCASE HUB (OPTIMIZED UI/UX) */}
      <section id="browse-cad-catalog" className="py-20 sm:py-24 bg-surface px-4 sm:px-6 md:px-12 scroll-mt-16">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Section Header with CAD Quality Value Props */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-line-subtle">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="font-tech text-xs uppercase tracking-[0.25em] text-primary font-bold block">
                  VCUBE CAD CATALOG // INDUSTRIAL ARCHIVE
                </span>
              </div>
              <h2 className="fluid-h2 text-fg">
                {isVi ? 'Khám Phá Kho Mẫu & Bản Vẽ CAD Kỹ Thuật' : 'Browse Industrial CAD & 3D Engineering Catalog'}
              </h2>
              <p className="text-xs sm:text-sm text-fg-muted mt-1 max-w-2xl">
                {isVi
                  ? 'Tuyển tập bản vẽ kỹ thuật cơ khí chính xác, vỏ hộp bo mạch và linh kiện tự động hóa. Đầy đủ định dạng STEP/STL gốc cho từng bản vẽ có trong kho.'
                  : 'Curated repository of precision mechanical models, IoT enclosures, and robotics parts. Original STEP/STL formats for every model listed in the catalog.'}
              </p>
            </div>

            {/* 4 CAD Precision Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-tech text-xs text-fg-muted min-w-0">
              <div className="bg-surface-muted p-2 rounded-sm flex items-center gap-1.5">
                <Icon name="verified" size={16} className="text-positive" />
                <span>{isVi ? 'Kiểm tra kín nước' : 'Mesh check'}</span>
              </div>
              <div className="bg-surface-muted p-2 rounded-sm flex items-center gap-1.5">
                <Icon name="category" size={16} className="text-primary" />
                <span>STEP / STL / 3MF</span>
              </div>
              <div className="bg-surface-muted p-2 rounded-sm flex items-center gap-1.5">
                <Icon name="straighten" size={16} className="text-fg-muted" />
                <span>{isVi ? 'Dung sai theo thoả thuận' : 'Tolerance as agreed'}</span>
              </div>
              <div className="bg-surface-muted p-2 rounded-sm flex items-center gap-1.5">
                <Icon name="license" size={16} className="text-info" />
                <span>Commercial Ready</span>
              </div>
            </div>
          </div>

          {/* Interactive Command & Filter Strip */}
          <Card padding="md" className="space-y-3.5">
            {/* Search Bar + View Toggles */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Live Search Input */}
              <div className="relative w-full md:w-96">
                <Icon name="search" size={16} className="absolute left-3 top-3 text-fg-muted" />
                <input
                  type="text"
                  placeholder={isVi ? 'Tìm linh kiện CAD (vd: Bánh răng, ESP32, Drone, NEMA)...' : 'Search CAD parts (e.g. Gear, ESP32, Drone, NEMA)...'}
                  value={cadSearch}
                  onChange={(e) => setCadSearch(e.target.value)}
                  className="w-full pl-9 pr-9 h-10 bg-canvas border border-line-control text-sm text-fg placeholder-fg-subtle focus:outline-none focus:border-primary rounded-md font-sans"
                />
                {cadSearch && (
                  <Button iconOnly variant="ghost" size="sm" aria-label={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
                    onClick={() => setCadSearch('')}
                    className="absolute right-0.5 top-0.5"
                    leadingIcon={<Icon name="close" size={16} />}
                  />
                )}
              </div>

              {/* View Layout & Action Controls */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                {/* Result count */}
                <span className="font-tech text-xs text-fg-muted">
                  {isVi ? 'Tìm thấy' : 'Found'} <strong className="text-primary font-bold tabular-nums">{displayedProducts.length}</strong> {isVi ? 'bản vẽ CAD' : 'CAD designs'}
                </span>

                <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-md">
                  <Button iconOnly size="sm" aria-label={isVi ? 'Xem dạng lưới thẻ' : 'Grid view'}
                    variant={catalogViewMode === 'grid' ? 'primary' : 'ghost'}
                    onClick={() => setCatalogViewMode('grid')}
                    leadingIcon={<Icon name="grid_view" size={16} />}
                  />
                  <Button iconOnly size="sm" aria-label={isVi ? 'Xem bảng thông số kỹ thuật' : 'Technical spec list view'}
                    variant={catalogViewMode === 'tech-table' ? 'primary' : 'ghost'}
                    onClick={() => setCatalogViewMode('tech-table')}
                    leadingIcon={<Icon name="view_list" size={16} />}
                  />
                </div>

                <Button variant="secondary" size="sm"
                  onClick={() => handleProtectedAction(() => onNavigate('explore'))}
                  trailingIcon={<Icon name="arrow_forward" size={16} />}
                >
                  <span>{isVi ? 'Toàn Bộ Kho Bản Vẽ' : 'Full Catalog'}</span>
                </Button>
              </div>
            </div>

            {/* Category Filter Chips Matrix with Smooth Horizontal Scroll */}
            <HorizontalScrollFilter className="border-t border-line-subtle pt-2">
              <Button size="sm" variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
                onClick={() => setSelectedCategory('all')}
                leadingIcon={<Icon name="select_all" size={16} />}
              >
                <span>{isVi ? 'Tất cả danh mục' : 'All Categories'}</span>
                <span className="font-mono text-xs tabular-nums px-1.5 rounded-full bg-surface-muted text-fg-muted">
                  {products.length}
                </span>
              </Button>

              {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <Button key={cat.id} size="sm" variant={isActive ? 'primary' : 'secondary'}
                    onClick={() => setSelectedCategory(cat.id)}
                    leadingIcon={<Icon name={cat.icon} size={16} />}
                  >
                    <span>{isVi ? cat.name : (cat as any).nameEn || cat.name}</span>
                    <span className={`font-mono text-xs tabular-nums px-1.5 rounded-full ${
                      isActive ? 'bg-primary-fg text-primary' : 'bg-surface-muted text-fg-muted'
                    }`}>
                      {products.filter((p) => p.category === cat.id).length}
                    </span>
                  </Button>
                );
              })}
            </HorizontalScrollFilter>

            {/* Quick Engineering Tag Chips (Smooth Horizontal Scroll - Single Row, No Orphan Wrap) */}
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-fg-muted shrink-0 flex items-center gap-1">
                <Icon name="sell" size={14} className="text-primary" />
                {isVi ? 'Tag nhanh:' : 'Tags:'}
              </span>

              <div className="flex-1 min-w-0">
                <HorizontalScrollFilter>
                  {POPULAR_TAGS.map((tag) => {
                    const isActive = selectedTag === tag.id;
                    const is29 = tag.id === '2/9';

                    return (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTag(isActive ? 'all' : tag.id)}
                        className={`px-2.5 py-1 rounded-sm border text-xs font-mono whitespace-nowrap shrink-0 transition-colors duration-150 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isActive
                            ? is29
                              ? 'bg-danger text-primary-fg border-danger font-extrabold'
                              : 'bg-primary text-primary-fg border-primary font-bold'
                            : is29
                            ? 'bg-danger-tint text-fg border-danger/30 hover:border-danger font-bold'
                            : 'bg-surface text-fg-muted border-line-control hover:border-fg-muted hover:text-fg'
                        }`}
                      >
                        <span>#{isVi ? tag.nameVi : tag.nameEn}</span>
                        {is29 && (
                          <span className="bg-warning-strong text-surface-inverse text-xs font-bold px-1 rounded-sm uppercase">
                            HOT
                          </span>
                        )}
                      </button>
                    );
                  })}
                </HorizontalScrollFilter>
              </div>

              {selectedTag !== 'all' && (
                <Button variant="ghost" size="sm" className="text-danger shrink-0"
                  onClick={() => setSelectedTag('all')}
                >
                  {isVi ? 'Bỏ lọc tag' : 'Clear tag'}
                </Button>
              )}
            </div>
          </Card>

          {/* Empty State — 1 dòng chính + 1 câu nguyên nhân + 1 CTA (U2) */}
          {displayedProducts.length === 0 ? (
            <Card padding="none">
              <EmptyState
                bordered={false}
                icon={<Icon name="search_off" size={20} />}
                title={isVi ? 'Không tìm thấy linh kiện CAD phù hợp' : 'No CAD parts match your criteria'}
                description={isVi
                  ? 'Bộ lọc hiện tại không khớp bản vẽ nào trong kho — thử xóa từ khóa hoặc đổi danh mục.'
                  : 'The current filters match nothing in the library — clear the query or switch category.'}
                action={
                  <Button size="sm"
                    onClick={() => {
                      setCadSearch('');
                      setSelectedCategory('all');
                      setSelectedTag('all');
                    }}
                  >
                    {isVi ? 'Hiển thị tất cả bản vẽ' : 'Reset All Filters'}
                  </Button>
                }
              />
            </Card>
          ) : catalogViewMode === 'grid' ? (
            /* GRID VIEW MODE */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayedProducts.map((product) => (
                <Card
                  key={product.id}
                  as="article"
                  padding="none"
                  className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-e2 hover:-translate-y-1 rounded-lg border border-line bg-surface"
                >
                  {/* Card Image Area with Quick 3D Inspect Overlay */}
                  <div
                    className="relative aspect-4/3 bg-surface-muted border-b border-line cursor-pointer overflow-hidden"
                    onClick={() => handleSelectProductAction(product, 'product_detail')}
                  >
                    <img
                      src={product.thumbnailUrl || product.images?.[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    />

                    {/* Badge */}
                    {product.badge && (
                      <span className={`absolute top-3 left-3 text-xs font-tech uppercase tracking-wider px-2 py-0.5 rounded-sm font-bold shadow-e2 ${
                        product.badge.includes('2/9')
                          ? 'bg-danger text-primary-fg'
                          : 'bg-primary text-primary-fg shadow-e1'
                      }`}>
                        {product.badge}
                      </span>
                    )}

                    {/* Floating 3D Inspect Trigger on Hover */}
                    <button
                      onClick={(e) => handleOpen3DPreview(product, e)}
                      className="absolute inset-0 bg-surface-inverse/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-on-inverse font-tech text-xs uppercase tracking-wider font-bold cursor-pointer focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={isVi ? 'Xoay xem 3D ngay tại đây' : 'Instant 3D Mesh Inspection'}
                    >
                      <span className="w-10 h-10 rounded-full bg-primary text-primary-fg flex items-center justify-center shadow-e2 border border-accent/50">
                        <Icon name="3d_rotation" size={24} />
                      </span>
                      <span className="bg-surface-inverse px-3 py-1 rounded-md border border-line text-accent">
                        {isVi ? 'Soi 3D 360° Trực Tiếp' : 'Inspect 3D Mesh'}
                      </span>
                    </button>

                    {/* Print time & specs pill — thiếu `print_time` ⇒ `—`, không bịa giờ in */}
                    <span className="absolute bottom-2.5 right-2.5 bg-surface text-fg text-xs font-tech px-2 py-0.5 rounded-sm font-bold shadow-e1 flex items-center gap-1">
                      <Icon name="timer" size={14} className="text-primary" />
                      {product.printTime || EMPTY_VALUE}
                    </span>
                  </div>

                  {/* Card Metadata Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* Designer & Rating */}
                      <div className="flex items-center justify-between text-xs text-fg-muted mb-1 font-sans">
                        <span className="uppercase tracking-wider truncate font-semibold font-tech flex items-center gap-1">
                          <Icon name="engineering" size={14} className="text-primary" />
                          {product.designer || EMPTY_VALUE}
                        </span>
                        {/* CI-03 + T3: chỉ hiện sao khi có CẢ điểm và số đánh giá thật.
                            `rating` NULL hoặc `reviewsCount = 0` ⇒ chữ, KHÔNG `★ 0`/`NaN`. */}
                        {hasRating(product) ? (
                          <span className="font-tech text-xs text-fg font-bold flex items-center gap-1 tabular-nums">
                            <Star size={14} className="text-warning-strong" fill="currentColor" aria-hidden="true" />
                            {product.rating}
                          </span>
                        ) : (
                          <span className="font-sans text-xs text-fg-muted">
                            {isVi ? 'Chưa có đánh giá' : 'No reviews yet'}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => handleSelectProductAction(product, 'product_detail')}
                        className="font-bold text-base text-fg hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
                      >
                        {product.name}
                      </h3>

                      {/* CAD Specs Micro Grid */}
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2.5 border-t border-line-subtle font-tech text-xs text-fg-muted">
                        <div className="bg-surface-muted p-1.5 rounded-sm flex items-center justify-between">
                          <span className="text-xs text-fg-muted">SIZE:</span>
                          <span className="font-bold text-fg truncate max-w-[80px]">{product.specs?.dimensions || EMPTY_VALUE}</span>
                        </div>
                        <div className="bg-surface-muted p-1.5 rounded-sm flex items-center justify-between">
                          <span className="text-xs text-fg-muted">FORMAT:</span>
                          <span className="font-bold text-primary">{product.cadFormat || EMPTY_VALUE}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {(product.tags || []).slice(0, 3).map((tg) => (
                          <button
                            key={tg}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(tg);
                            }}
                            className={`text-xs font-tech uppercase px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${
                              tg.includes('2/9')
                                ? 'bg-danger-tint text-fg border-danger/30 font-bold'
                                : 'bg-surface-muted text-fg-muted border-line hover:border-fg-muted'
                            }`}
                          >
                            #{tg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Matrix & Quick Actions */}
                    <div className="pt-3 border-t border-line-subtle">
                      <div className="flex items-baseline justify-between mb-3 font-sans">
                        <div>
                          <span className="text-xs text-fg-muted uppercase tracking-wider block font-medium">
                            {t('digitalAsset', 'File Số (STL/STEP)', 'CAD File (STL)')}
                          </span>
                          <span className="font-tech font-bold text-sm text-primary tabular-nums">
                            {vnd(product.priceDigital, locale)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-fg-muted uppercase tracking-wider block font-medium">
                            {t('physicalModel', 'In Vật Lý (FDM/Resin)', 'Physical Part')}
                          </span>
                          <span className="font-tech text-xs text-fg font-bold tabular-nums">
                            {vnd(product.pricePhysical, locale)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 1-Click Buy CAD File */}
                        <Button size="sm" className="flex-1"
                          onClick={(e) => handleQuickAddDigital(product, e)}
                          disabled={!(isNum(product.priceDigital) && product.priceDigital > 0)}
                          title={isNum(product.priceDigital) && product.priceDigital > 0
                            ? (isVi ? 'Tải file CAD STL/STEP gốc' : 'Get original CAD file')
                            : (isVi ? 'Người bán không mở bán kênh file số.' : 'The seller does not sell this product as a CAD file.')}
                          leadingIcon={<Icon name="download" size={16} />}
                        >
                          <span>
                            {isNum(product.priceDigital) && product.priceDigital > 0
                              ? (isVi ? 'Mua File CAD' : 'Buy CAD File')
                              : (isVi ? 'Không bán file số' : 'File not sold')}
                          </span>
                        </Button>

                        {/* Order Physical / Inspect 3D */}
                        <Button size="sm" variant="secondary"
                          onClick={() => handleSelectProductAction(product, 'product_detail')}
                          title={isVi ? 'Xem chi tiết & Đặt in vật lý' : 'Inspect details & Order Physical'}
                          leadingIcon={<Icon name="precision_manufacturing" size={16} className="text-primary" />}
                        >
                          <span>{isVi ? 'Đặt In' : 'Order'}</span>
                        </Button>

                        {/* Personalize if supported */}
                        {product.isCustomizable && (
                          <Button iconOnly size="sm" variant="secondary"
                            aria-label={isVi ? 'Khắc tên / Tùy biến kích thước' : 'Custom engraving & resizing'}
                            onClick={() => handleSelectProductAction(product, 'personalize')}
                            leadingIcon={<Icon name="tune" size={16} className="text-primary" />}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* TECHNICAL TABLE VIEW MODE */
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-surface-muted text-fg-muted border-b border-line font-tech text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Linh Kiện CAD</th>
                      <th className="py-3 px-3">Danh Mục</th>
                      <th className="py-3 px-3">Kích Thước</th>
                      <th className="py-3 px-3">Thời Gian In</th>
                      <th className="py-3 px-3">Giá File Số</th>
                      <th className="py-3 px-3">Giá In Vật Lý</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {displayedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-surface-muted transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.thumbnailUrl || product.images?.[0]}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-md shrink-0"
                            />
                            <div>
                              <h4
                                onClick={() => handleSelectProductAction(product, 'product_detail')}
                                className="font-bold text-sm text-fg hover:text-primary cursor-pointer"
                              >
                                {product.name}
                              </h4>
                              <span className="text-xs text-fg-muted font-tech block">
                                By {product.designer || EMPTY_VALUE} • SKU: {product.sku || EMPTY_VALUE}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-tech font-bold uppercase text-xs text-primary">
                          {product.category}
                        </td>
                        <td className="py-3 px-3 font-tech text-xs text-fg">
                          {product.specs?.dimensions || EMPTY_VALUE}
                        </td>
                        <td className="py-3 px-3 font-tech text-xs text-fg-muted">
                          {product.printTime || EMPTY_VALUE}
                        </td>
                        <td className="py-3 px-3 font-tech font-bold text-primary tabular-nums">
                          {vnd(product.priceDigital, locale)}
                        </td>
                        <td className="py-3 px-3 font-tech font-bold text-fg tabular-nums">
                          {vnd(product.pricePhysical, locale)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button iconOnly size="sm" variant="secondary"
                              aria-label="Soi 3D 360°"
                              onClick={(e) => handleOpen3DPreview(product, e)}
                              leadingIcon={<Icon name="3d_rotation" size={16} />}
                            />
                            <Button size="sm"
                              onClick={(e) => handleQuickAddDigital(product, e)}
                              disabled={!(isNum(product.priceDigital) && product.priceDigital > 0)}
                            >
                              {isNum(product.priceDigital) && product.priceDigital > 0
                                ? (isVi ? 'Tải CAD' : 'Buy STL')
                                : (isVi ? 'Không bán file số' : 'File not sold')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Footer Callout */}
          <Card padding="md" className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-fg-muted">
              {isVi
                ? 'Bạn có file 3D của riêng mình? Sử dụng công cụ phân tích lưới và báo giá tức thì của chúng tôi.'
                : 'Have your own CAD model? Upload to our automated mesh slicer and instant cost calculator.'}
            </span>
            <Button variant="secondary" size="sm" className="shrink-0"
              onClick={() => handleProtectedAction(() => onNavigate('tool_3d'))}
              leadingIcon={<Icon name="upload_file" size={16} className="text-primary" />}
            >
              <span>{isVi ? 'Tải File Của Bạn Lên' : 'Upload Your CAD File'}</span>
            </Button>
          </Card>
        </div>
      </section>

      {/* 4. Technical Material Comparison Matrix */}
      <section id="material-comparison-matrix" className="py-20 sm:py-24 px-4 sm:px-6 md:px-12 bg-canvas border-t border-line">
        <div className="max-w-7xl mx-auto">
          <MaterialComparisonMatrix
            materials={materialsList}
            onNavigate={onNavigate}
          />
        </div>
      </section>

      {/* 5. Modern High-Conversion Callout Card (Light-first container with glowing dark conversion card) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 bg-canvas">
        <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-b from-surface-inverse to-[#08111d] text-on-inverse p-8 sm:p-12 lg:p-16 border border-line-subtle shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Tech Glow */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-accent/15 blur-3xl pointer-events-none"
          />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-inverse-raised/80 border border-line-subtle rounded-full text-xs uppercase font-mono tracking-[0.2em] text-accent font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>{isVi ? 'SẴN SÀNG SẢN XUẤT // RAPID FABRICATION' : 'READY TO MANUFACTURE // ON DEMAND'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-on-inverse tracking-tight leading-tight">
              {isVi ? 'Hiện Thực Hoá Mô Hình 3D Của Bạn' : 'Bring Your 3D Designs to Life'}
            </h2>

            <p className="text-sm sm:text-base text-on-inverse/70 max-w-2xl mx-auto font-sans leading-relaxed">
              {isVi
                ? 'Tải file CAD để nhận báo giá tức thì, phân tích lưới in 3D tự động và kết nối trực tiếp với mạng lưới xưởng in công nghiệp đạt chuẩn.'
                : 'Upload your CAD models for instant quoting, automated mesh inspection, and direct manufacturing with certified industrial workshops.'}
            </p>

            {/* Feature Guarantees */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2 text-xs font-mono text-on-inverse/80">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-inverse-raised/70 border border-line-subtle">
                <Icon name="verified_user" size={16} className="text-accent" />
                <span>{isVi ? 'Bảo mật dữ liệu chuẩn NDA' : 'Strict NDA Protection'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-inverse-raised/70 border border-line-subtle">
                <Icon name="straighten" size={16} className="text-accent" />
                <span>{isVi ? 'Kiểm soát dung sai kỹ thuật' : 'Rigorous Tolerance QC'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-inverse-raised/70 border border-line-subtle">
                <Icon name="local_shipping" size={16} className="text-accent" />
                <span>{isVi ? 'Giao hàng nhanh toàn quốc' : 'Nationwide Fast Delivery'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('quote')}
                leadingIcon={<Icon name="upload_file" size={20} />}
                className="w-full sm:w-auto shadow-lg shadow-primary/25"
              >
                <span>{isVi ? 'Báo Giá File 3D Của Bạn' : 'Quote Your 3D File'}</span>
              </Button>

              <Button
                size="lg"
                variant="secondary"
                onClick={() => setIsCustomIdeaModalOpen(true)}
                leadingIcon={<Icon name="lightbulb" size={20} className="text-primary" />}
                className="w-full sm:w-auto bg-surface-inverse-raised text-on-inverse border-line-subtle hover:bg-surface-inverse-raised/80"
              >
                <span>{isVi ? 'Tư Vấn & Custom Theo Ý Tưởng' : 'Custom Service by Idea'}</span>
              </Button>
            </div>

            {/* Partner Network (if present) */}
            {hasPartners && (
              <div className="pt-8 border-t border-line-subtle/50 mt-8 space-y-3">
                <span className="text-xs uppercase font-mono font-bold text-on-inverse/60 tracking-widest block">
                  {activeContent.trustPartnersTitle || (isVi ? 'Đơn Vị Đồng Hành Cùng VCUBE' : 'Trusted by Leading Partners')}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono text-xs font-bold text-on-inverse/80">
                  {partnersList.map((partner, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-3 py-1.5 bg-surface-inverse-raised/70 rounded border border-line-subtle text-on-inverse/90"
                    >
                      {partner}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CAD Quick View 3D Modal */}
      <CadQuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={onAddToCart}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* Custom Idea Request Modal */}
      <CustomIdeaRequestModal
        isOpen={isCustomIdeaModalOpen}
        onClose={() => setIsCustomIdeaModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
