import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig, SiteContentConfig } from '@/types';
import { CATEGORIES, POPULAR_TAGS, MATERIALS_CATALOG, DEFAULT_SITE_CONTENT } from '@/data/mockData';
import { ThreeModelViewer } from '../components/LazyThreeModelViewer';
import { CanvasErrorBoundary } from '../components/CanvasErrorBoundary';
import { CadQuickViewModal } from '../components/CadQuickViewModal';
import { CustomIdeaRequestModal } from '../components/custom/CustomIdeaRequestModal';
import { HorizontalScrollFilter } from '../components/HorizontalScrollFilter';
import { ServiceShowcaseSection } from '../components/services/ServiceShowcaseSection';
import { SEOHead } from '../components/SEOHead';
import { EMPTY_VALUE, formatNumber, formatPercent } from '@frontend/lib/format';
import { realProductImageUrl } from '@frontend/lib/productImage';
import { Icon, Button, Card, EmptyState, InfoTip } from '@frontend/ui';

interface HomeViewProps {
  products: Product[];
  /** true khi catalog đang nạp từ DB (hiện skeleton thay vì rỗng). */
  productsLoading?: boolean;
  /** Lỗi đọc catalog lần gần nhất — phân biệt "lỗi tải" với "kho rỗng"/"filter miss". */
  productsError?: boolean;
  /** Gọi lại lượt đọc catalog (nút "Thử lại"). */
  onRetryProducts?: () => void;
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
 * Tiền VND: thiếu giá trị ⇒ `—`, không bịa `0 ₫`.
 * `0` KHÔNG phải một mức giá: `price_digital` / `price_physical` = 0 nghĩa là người bán KHÔNG
 * bán kênh đó. Cùng luật với `ExploreView.tsx` (`Number.isFinite(value) && value > 0 ? … : EMPTY_VALUE`).
 * CC-14 (D-B): ký hiệu tiền là **`₫`** như `formatCurrency`/`Money` — Home từng nối tay ` đ`
 * nên cùng một mức giá hiện 2 kiểu giữa Home và Explore/PDP/Cart.
 */
const vnd = (v: unknown, locale: string): string =>
  isNum(v) && v > 0 ? `${formatNumber(v, { locale, maximumFractionDigits: 0 })} ₫` : EMPTY_VALUE;

/** Điểm đánh giá chỉ có nghĩa khi CÓ cả điểm VÀ số lượng đánh giá thật. */
const hasRating = (product: Product): boolean =>
  isNum(product.rating) && product.rating > 0 && isNum(product.reviewsCount) && product.reviewsCount > 0;

/** Nhãn giấy phép: đọc `license_type`; chưa khai ⇒ nói thẳng, KHÔNG đoán "Commercial". */
const LICENSE_VI: Record<string, string> = {
  standard: 'Tiêu chuẩn',
  commercial: 'Thương mại',
  exclusive: 'Độc quyền',
};
const licenseLabel = (license?: string | null): string => {
  const value = typeof license === 'string' ? license.trim() : '';
  if (!value) return `${EMPTY_VALUE} (người bán chưa khai báo)`;
  return LICENSE_VI[value.toLowerCase()] ?? value;
};

/** Vật liệu hỗ trợ — chỉ đọc từ dữ liệu sản phẩm, thiếu ⇒ `—` (không đoán). */
const materialLabel = (product: Product): string => {
  const names = (product.supportedMaterials || [])
    .map((m) => (typeof m === 'string' ? m.trim() : ''))
    .filter(Boolean);
  return names.length > 0 ? names.slice(0, 2).join(' · ') : EMPTY_VALUE;
};

/** Icon placeholder theo danh mục khi sản phẩm chưa có ảnh thật. */
const CATEGORY_ICON: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.icon]),
);
const categoryIcon = (category?: string): string =>
  (category && CATEGORY_ICON[category]) || 'view_in_ar';

/** UI copy seed cũ còn tiếng Anh/"File" trong `DEFAULT_SITE_CONTENT` (file dữ liệu, ngoài
 *  write-scope W2). Chỉ thay khi giá trị VẪN ĐÚNG BẰNG seed cũ — admin đã cấu hình nội dung
 *  khác thì giữ nguyên (D0: chuỗi hiển thị VI-only). */
const LEGACY_SITE_COPY: Record<string, string> = {
  'VCUBE PRECISION ANTHOLOGY // 2026': 'TUYỂN TẬP CHẾ TÁC CHÍNH XÁC VCUBE 2026',
  'Báo Giá File 3D Tức Thì': 'Báo giá tệp 3D tức thì',
};
const siteCopy = (value: string | undefined, fallback: string): string => {
  const v = (value || '').trim();
  if (!v) return fallback;
  return LEGACY_SITE_COPY[v] ?? v;
};

/** Số sản phẩm hiển thị mỗi lượt ở lưới catalog (3 cột × 2 hàng). */
const CATALOG_PAGE_SIZE = 6;

/** Hotline hiển thị được: đủ 8 chữ số và KHÔNG phải dãy lặp (chặn placeholder '00000000000'). */
const isDisplayableHotline = (v?: string): boolean => {
  const digits = ((v || '').match(/\d/g) || []).join('');
  if (digits.length < 8) return false;
  return !/^(\d)\1+$/.test(digits);
};

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
    labelVi: 'Bánh răng',
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
    labelVi: 'Drone',
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
    labelVi: 'Vỏ hộp',
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
    labelVi: 'Vòm',
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
  productsLoading = false,
  productsError,
  onRetryProducts,
  materials = MATERIALS_CATALOG,
  pricingConfig,
  siteContent,
  onAddToCart,
  onNavigate,
  onSelectProduct,
  onShowToast
}) => {
  const locale = 'vi-VN';
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
  const [catalogLimit, setCatalogLimit] = useState<number>(CATALOG_PAGE_SIZE);

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

  /** Đổi bộ lọc ⇒ thu gọn về trang đầu (tránh "Xem thêm" giữ trạng thái cũ). */
  useEffect(() => {
    setCatalogLimit(CATALOG_PAGE_SIZE);
  }, [cadSearch, selectedCategory, selectedTag]);

  /** Catalog hiển thị theo trang: 6 sản phẩm đầu, "Xem thêm" nạp tiếp. */
  const visibleProducts = useMemo(
    () => displayedProducts.slice(0, catalogLimit),
    [displayedProducts, catalogLimit],
  );
  const hasMoreProducts = displayedProducts.length > visibleProducts.length;
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
      onShowToast?.(`Sản phẩm "${product.name}" không mở bán kênh file số (giá file số không lớn hơn 0) nên chưa thể mua.`);
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
      onShowToast(`Đã thêm tệp CAD "${product.name}" vào giỏ!`);
    }
  };

  // §3 data-honesty: KHÔNG rơi về danh sách đoán. Rỗng ⇒ ẩn cả khối thành tích.
  const partnersList = (activeContent.trustPartnersList ?? DEFAULT_SITE_CONTENT.trustPartnersList ?? [])
    .filter((p) => typeof p === 'string' && p.trim() !== '');
  const hasPartners = partnersList.length > 0;
  // Dải số liệu: giá trị rỗng ⇒ "Chưa cấu hình" (nhập ở /admin -> Nội dung site), không đoán.
  const heroMetrics = [
    { label: activeContent.heroMetric1Label || ('Dung Sai Đo Kiểm'), value: (activeContent.heroMetric1Value || '').trim() },
    { label: activeContent.heroMetric2Label || ('Thời Gian Bàn Giao'), value: (activeContent.heroMetric2Value || '').trim() },
    { label: activeContent.heroMetric3Label || ('Tiêu Chuẩn Sản Xuất'), value: (activeContent.heroMetric3Value || '').trim() },
  ];
  // P1 §5: cả 3 chỉ số rỗng ⇒ gộp thành MỘT DÒNG MẢNH thay vì một hàng 3 thẻ trống.
  const heroMetricsFilled = heroMetrics.filter((m) => m.value);
  const toleranceSpec = (activeContent.toleranceSpec || '').trim();

  return (
    <div className="min-h-dvh flex flex-col bg-canvas text-fg font-sans relative selection:bg-primary selection:text-primary-fg">
      {/* SEO & Dynamic Head */}
      <SEOHead
        title={activeContent.seoTitle || ('VCUBE — Dịch Vụ In 3D Công Nghiệp & Báo Giá CAD Tức Thì')}
        description={activeContent.seoDescription || ('Nền tảng sản xuất bồi đắp linh kiện cơ khí và khuôn mẫu kỹ thuật số hàng đầu Việt Nam.')}
        image={activeContent.seoOgImage}
        url={activeContent.seoCanonicalUrl}
        type="website"
      />

      {/* §1.1/§0: nền trang là `canvas` phẳng. Lớp "ambient radiance" (3 vệt blur 2 màu)
          đã bỏ — đó là gradient màu trang trí, không nằm trong bảng token. */}

      {/* 1. Dynamic Top Campaign Banner */}
      {activeContent.announcementActive && (
        <section className="bg-surface-inverse text-on-inverse py-2.5 sm:py-3 px-4 sm:px-6 md:px-12 border-b border-on-inverse/15 shadow-soft">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              {/* §2.5/§3: không emoji làm icon, không bịa tên chiến dịch ⇒ badge rỗng thì ẩn hẳn. */}
              {activeContent.announcementBadge && (
                <span className="bg-on-inverse text-surface-inverse text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-sm tracking-wider shrink-0 flex items-center gap-1.5 border border-on-inverse/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping motion-reduce:animate-none" />
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
                <span>{activeContent.announcementActionText || ('Xem Sản Phẩm Tag 2/9')}</span>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 2. Hero Section with Interactive 3D Model Switcher — band sáng có viền (§3.1/§3.7) */}
      <section className="relative px-4 py-6 sm:px-6 sm:py-8 md:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl rounded-xl bg-surface p-4 shadow-soft sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-muted border border-line rounded-full text-xs font-semibold uppercase tracking-wider text-fg-muted w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                <span>{siteCopy(activeContent.heroBadge, 'TUYỂN TẬP CHẾ TÁC CHÍNH XÁC VCUBE 2026')}</span>
              </div>

              <h1 className="fluid-hero-heading text-fg tracking-tight">
                {activeContent.heroHeadlineLine1 || ('CHẾ TÁC CƠ KHÍ')}
                <br />
                <span className="text-primary">
                  {activeContent.heroHeadlineHighlight || ('IN 3D CÔNG NGHIỆP CHÍNH XÁC')}
                </span>
              </h1>

              <div className="flex gap-4 sm:gap-6 items-start max-w-xl">
                <div className="w-1.5 h-14 bg-primary rounded-full flex-shrink-0 mt-1" />
                <p className="text-sm sm:text-base text-fg-muted leading-relaxed font-sans font-normal">
                  {(!activeContent.heroSubheadline || activeContent.heroSubheadline.includes('Dữ liệu mẫu để kiểm thử') || activeContent.heroSubheadline.includes('--remove'))
                    ? ('Nền tảng sản xuất bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số.')
                    : activeContent.heroSubheadline}
                </p>
              </div>

              {/* Main CTAs — 1 CTA chính duy nhất cho mỗi viewport (§2.4) */}
              <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
                <Button size="lg"
                  onClick={() => onNavigate('quote')}
                  leadingIcon={<Icon name="upload_file" size={20} />}
                >
                  <span>{siteCopy(activeContent.heroCtaQuoteText, 'Báo giá tệp 3D tức thì')}</span>
                </Button>

                <Button size="lg" variant="secondary"
                  onClick={() => {
                    const el = document.getElementById('browse-cad-catalog');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  leadingIcon={<Icon name="view_in_ar" size={20} className="text-primary" />}
                >
                  <span>{activeContent.heroCtaCatalogText || ('Khám Phá Kho Mẫu CAD')}</span>
                </Button>
              </div>

              {/* 3 Technical Quality Spec Metrics Cards */}
              {/* Dải số liệu kiểm định — nền `surface` + viền nhạt (§2.1: tint KHÔNG dùng cho thẻ KPI).
                  P1 §5: cả 3 rỗng ⇒ GỘP thành một dòng mảnh (trước đây là một hàng 3 thẻ trống). */}
              {heroMetricsFilled.length === 0 ? (
                <p className="pt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
                  <Icon name="info" size={16} className="text-fg-muted shrink-0" />
                  <span>
                    Dung sai đo kiểm, thời gian bàn giao và tiêu chuẩn sản xuất:
                  </span>
                  <span className="font-mono font-semibold text-fg-muted">
                    Chưa cấu hình
                  </span>
                  <Button variant="ghost" size="sm" className="text-primary font-bold"
                    onClick={() => onNavigate('admin')}
                  >
                    Nhập ở /admin
                  </Button>
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {heroMetrics.map((m) => (
                    <Card key={m.label} variant="soft" padding="md">
                      <span className="block text-xs text-fg-muted font-medium mb-1">{m.label}</span>
                      {m.value ? (
                        <span className="font-mono text-sm sm:text-base font-semibold text-fg tabular-nums">{m.value}</span>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-fg-muted">
                          Chưa cấu hình
                        </span>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Interactive 3D Showcase with Modern Chassis */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center pt-2 lg:pt-0">
              <div className="w-full overflow-hidden rounded-lg border border-line bg-surface shadow-soft">
                {/* Hairline đơn sắc thay cho gradient 3 màu (§0: không gradient màu) */}
                <div className="h-px w-full bg-accent/40" />

                {/* Thanh tiêu đề khung — sáng (soften chassis); chỉ viewport giữ nền tối */}
                <div className="z-10 flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full bg-positive" aria-hidden="true" />
                    <span className="truncate font-mono text-xs font-bold uppercase tracking-wider text-fg">
                      Khung xem 3D
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs text-fg-muted">
                      WebGL 2.0
                    </span>
                    <span className="hidden rounded-full border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs text-fg-muted sm:inline-flex">
                      Tương tác
                    </span>
                  </div>
                </div>

                {/* Model Selector — segmented pill (chip), nền sáng */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 no-scrollbar">
                  {HERO_CHASSIS_MODELS.map((item) => {
                    const isSelected = heroModel === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setHeroModel(item.id)}
                        className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          isSelected
                            ? 'bg-primary text-primary-fg shadow-e1'
                            : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
                        }`}
                      >
                        <Icon name={item.icon} size={14} aria-hidden="true" />
                        <span>{item.labelVi}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 3D Canvas Viewer Stage */}
                <div className="w-full h-[300px] sm:h-[340px] lg:h-[360px] relative bg-surface-inverse">
                  <CanvasErrorBoundary fallbackHeight="h-full">
                    <ThreeModelViewer
                      modelType={heroModel}
                      color={activeHeroModelMeta.color}
                      showGrid={true}
                      autoRotate={true}
                      className="h-full w-full border-0 rounded-none"
                    />
                  </CanvasErrorBoundary>

                  {/* HUD chip sáng trên viewport tối (§3.8) — mô hình minh họa, KHÔNG phải
                      sản phẩm thật nên không in số đo/vật liệu cụ thể (tránh khẳng định sai). */}
                  <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]">
                    <div className="space-y-0.5 rounded-md border border-line bg-surface/90 px-3 py-2 shadow-e2 backdrop-blur-sm">
                      <p className="max-w-[260px] truncate font-mono text-xs font-bold text-fg">
                        {activeHeroModelMeta.titleVi}
                      </p>
                      <p className="font-mono text-xs text-fg-muted">
                        Mô hình minh họa theo danh mục
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thanh chân khung — sáng */}
                <div className="z-10 flex items-center justify-center gap-2 border-t border-line bg-surface px-4 py-3">
                  <Icon name="touch_app" size={16} className="shrink-0 text-fg-muted" aria-hidden="true" />
                  <span className="text-center font-mono text-xs text-fg-muted">
                    Kéo chuột để xoay 360° • Cuộn để thu phóng
                  </span>
                </div>
              </div>

              {/* Dải dung sai cam kết — CHỈ hiện khi có dữ liệu thật.
                  P1 §5: rỗng thì bỏ hẳn panel rời rạc "lạc lõng"; thông tin đã nằm
                  trong dòng mảnh ở cột trái (kèm lối nhập ở /admin). */}
              {toleranceSpec && (
                <Card variant="soft" padding="sm" className="mt-3 flex w-full items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 shrink-0 place-items-center rounded-md bg-tile-mint text-fg">
                      <Icon name="verified" size={18} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <span className="block font-mono text-xs font-bold uppercase tracking-wider text-fg-muted">
                        Dung sai cam kết
                      </span>
                      <p className="text-xs font-medium text-fg">{toleranceSpec}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Instant CAD Dropzone — hạ xuống dưới grid để headline + CTA chính nằm gọn
              trong màn hình đầu tiên (next-steps §2.2 "hero fit viewport"). */}
          <div className="mt-6 sm:mt-8 max-w-3xl">
            <div
              role="button"
              tabIndex={0}
              aria-label="Tải tệp CAD lên để báo giá"
              onClick={() => heroFileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  heroFileInputRef.current?.click();
                }
              }}
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
              className={`group cursor-pointer rounded-lg border border-dashed p-4 transition-colors duration-200 motion-reduce:transition-none sm:p-5 ${
                isDraggingFile
                  ? 'border-primary bg-primary-tint ring-2 ring-ring/20'
                  : 'border-line-control bg-surface-muted hover:border-fg-subtle hover:bg-surface'
              }`}
              title="Bấm hoặc kéo thả tệp STL, 3MF, STEP, OBJ vào đây để nhận báo giá tức thì"
            >
              <input
                ref={heroFileInputRef}
                type="file"
                accept=".stl,.3mf,.step,.stp,.obj"
                aria-label="Tải tệp CAD để báo giá"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    onNavigate('quote', { uploadedFile: file });
                  }
                }}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <div className={`grid size-12 shrink-0 place-items-center rounded-md ${
                  isDraggingFile ? 'bg-primary text-primary-fg' : 'bg-tile-mint text-fg'
                }`}>
                  <Icon name={isDraggingFile ? 'download' : 'cloud_upload'} size={26} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-tech text-xs uppercase tracking-wider font-bold text-primary bg-primary-tint px-1.5 py-0.5 rounded-sm">
                      {isDraggingFile ? ('Thả để tải lên') : ('Kéo & thả')}
                    </span>
                    <span className="font-bold text-xs text-fg">
                      {isDraggingFile
                        ? ('Thả tệp CAD vào đây để phân tích tức thì!')
                        : ('Kéo thả tệp CAD vào đây hoặc bấm để chọn')}
                    </span>
                    <InfoTip label="Tệp CAD được xử lý thế nào?">
                      Hệ thống tính thể tích, kiểm tra độ kín nước và dựng BOM từ chính tệp bạn tải lên. Mọi số đo hiển thị ở /quote đều lấy từ tệp đó.
                    </InfoTip>
                  </div>
                  <p className="text-xs text-fg-muted truncate mt-0.5 font-tech">
                    STL · 3MF · STEP · STP · OBJ
                  </p>
                </div>
                <span className="hidden sm:flex items-center gap-1 text-xs font-tech uppercase tracking-wider text-primary font-bold shrink-0">
                  <Icon name="drag_pan" size={18} />
                  <span>Thả tệp</span>
                </span>
              </div>
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
      <section id="browse-cad-catalog" className="scroll-mt-20 bg-canvas px-4 py-12 sm:px-6 sm:py-16 md:px-12">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Section Header with CAD Quality Value Props */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-line">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block">
                  KHO BẢN VẼ CAD CÔNG NGHIỆP VCUBE
                </span>
              </div>
              <h2 className="fluid-h2 text-fg">
                {'Khám Phá Kho Mẫu & Bản Vẽ CAD Kỹ Thuật'}
              </h2>
              <p className="text-xs sm:text-sm text-fg-muted mt-1 max-w-2xl">
                Tuyển tập bản vẽ kỹ thuật cơ khí chính xác, vỏ hộp bo mạch và linh kiện tự động hóa. Đầy đủ định dạng STEP/STL gốc cho từng bản vẽ có trong kho.
              </p>
            </div>

            {/* 4 CAD Precision Badges */}
            <div className="grid min-w-0 grid-cols-2 gap-2 font-tech text-xs text-fg-muted sm:grid-cols-4">
              <div className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-2 shadow-soft">
                <Icon name="verified" size={16} className="shrink-0 text-positive" aria-hidden="true" />
                <span>Kiểm tra lưới theo tệp</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-2 shadow-soft">
                <Icon name="category" size={16} className="shrink-0 text-fg-muted" aria-hidden="true" />
                <span>STEP / STL / 3MF</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-2 shadow-soft">
                <Icon name="straighten" size={16} className="shrink-0 text-fg-muted" aria-hidden="true" />
                <span>Dung sai theo thoả thuận</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-2 shadow-soft">
                <Icon name="license" size={16} className="shrink-0 text-info" aria-hidden="true" />
                <span>Giấy phép theo từng tệp</span>
              </div>
            </div>
          </div>

          {/* Interactive Command & Filter Strip */}
          <Card variant="soft" className="space-y-3.5">
            {/* Search Bar + View Toggles */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Live Search Input */}
              <div className="relative w-full md:w-96">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Tìm kiếm linh kiện CAD"
                  placeholder="Tìm linh kiện CAD (vd: Bánh răng, ESP32, Drone, NEMA)..."
                  value={cadSearch}
                  onChange={(e) => setCadSearch(e.target.value)}
                  className="h-11 w-full rounded-full border border-line-control bg-surface pl-9 pr-9 font-sans text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {cadSearch && (
                  <Button iconOnly variant="ghost" size="sm" aria-label="Xóa tìm kiếm"
                    onClick={() => setCadSearch('')}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2"
                    leadingIcon={<Icon name="close" size={16} />}
                  />
                )}
              </div>

              {/* View Layout & Action Controls */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                {/* Result count */}
                <span className="font-tech text-xs text-fg-muted">
                  Tìm thấy <strong className="text-primary font-bold tabular-nums">{displayedProducts.length}</strong> bản vẽ CAD
                </span>

                <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted p-1">
                  <button
                    type="button"
                    aria-label="Xem dạng lưới thẻ"
                    aria-pressed={catalogViewMode === 'grid'}
                    onClick={() => setCatalogViewMode('grid')}
                    className={`grid size-10 max-md:size-12 place-items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      catalogViewMode === 'grid'
                        ? 'bg-surface text-fg shadow-soft'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Icon name="grid_view" size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Xem bảng thông số kỹ thuật"
                    aria-pressed={catalogViewMode === 'tech-table'}
                    onClick={() => setCatalogViewMode('tech-table')}
                    className={`grid size-10 max-md:size-12 place-items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      catalogViewMode === 'tech-table'
                        ? 'bg-surface text-fg shadow-soft'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Icon name="view_list" size={16} />
                  </button>
                </div>

                <Button variant="secondary" size="sm"
                  onClick={() => handleProtectedAction(() => onNavigate('explore'))}
                  trailingIcon={<Icon name="arrow_forward" size={16} />}
                >
                  <span>Toàn Bộ Kho Bản Vẽ</span>
                </Button>
              </div>
            </div>

            {/* Category Filter Chips Matrix with Smooth Horizontal Scroll */}
            <HorizontalScrollFilter className="border-t border-line-subtle pt-2">
              <Button size="sm" shape="pill" variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
                onClick={() => setSelectedCategory('all')}
                aria-pressed={selectedCategory === 'all'}
                leadingIcon={<Icon name="select_all" size={16} />}
              >
                <span>Tất cả danh mục</span>
                <span className="font-mono text-xs tabular-nums px-1.5 rounded-full bg-surface-muted text-fg-muted">
                  {products.length}
                </span>
              </Button>

              {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <Button key={cat.id} size="sm" shape="pill" variant={isActive ? 'primary' : 'secondary'}
                    onClick={() => setSelectedCategory(isActive ? 'all' : cat.id)}
                    aria-pressed={isActive}
                    leadingIcon={<Icon name={cat.icon} size={16} />}
                  >
                    <span>{cat.name}</span>
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
                Thẻ nhanh:
              </span>

              <div className="flex-1 min-w-0">
                <HorizontalScrollFilter>
                  {POPULAR_TAGS.map((tag) => {
                    const isActive = selectedTag === tag.id;
                    const is29 = tag.id === '2/9';

                    return (
                      <button
                        key={tag.id}
                        aria-pressed={isActive}
                        onClick={() => setSelectedTag(isActive ? 'all' : tag.id)}
                        className={`min-h-11 px-3.5 py-1.5 rounded-full border text-xs font-mono whitespace-nowrap shrink-0 transition-colors duration-200 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          isActive
                            ? is29
                              ? 'bg-danger text-primary-fg border-danger font-semibold'
                              : 'bg-primary text-primary-fg border-primary font-semibold'
                            : is29
                            ? 'bg-danger-tint text-danger border-danger/20 hover:border-danger font-semibold'
                            : 'bg-surface text-fg-muted border-line hover:border-line-control hover:text-fg'
                        }`}
                      >
                        <span>#{tag.nameVi}</span>
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
                  Bỏ lọc tag
                </Button>
              )}
            </div>
          </Card>

          {/* Dải cảnh báo: lỗi làm mới nhưng còn dữ liệu cũ để xem (D2). */}
          {productsError && products.length > 0 && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-tint px-3 py-2 text-xs text-warning"
            >
              <Icon name="warning" size={16} />
              Không làm mới được kho — đang hiển thị dữ liệu lần trước.
            </p>
          )}

          {/* Loading skeleton — catalog đang nạp từ DB (không hiện "0 bản vẽ" rồi mới bung ra) */}
          {productsLoading && products.length === 0 && displayedProducts.length === 0 ? (
            <div
              role="status"
              aria-label="Đang tải kho bản vẽ"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-lg bg-surface shadow-soft">
                  <div className="aspect-4/3 bg-surface-muted animate-pulse motion-reduce:animate-none" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 rounded-sm bg-surface-muted animate-pulse motion-reduce:animate-none" />
                    <div className="h-3 w-1/2 rounded-sm bg-surface-muted animate-pulse motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          ) : Boolean(productsError) && products.length === 0 ? (
            /* ERROR — lỗi TẢI hẳn, KHÔNG đổ cho filter; bọc role="alert". */
            <Card variant="soft" padding="none">
              <div role="alert">
                <EmptyState
                  icon={<Icon name="error" size={20} />}
                  title="Không tải được kho bản vẽ"
                  description="Không kết nối được tới máy chủ dữ liệu. Kiểm tra kết nối mạng rồi thử lại."
                  action={
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={Boolean(productsLoading)}
                        loadingLabel="Đang tải…"
                        leadingIcon={<Icon name="refresh" size={16} />}
                        onClick={() => onRetryProducts?.()}
                      >
                        Thử lại
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leadingIcon={<Icon name="upload_file" size={16} />}
                        onClick={() => onNavigate('quote')}
                      >
                        Báo giá tệp 3D của bạn
                      </Button>
                    </>
                  }
                />
              </div>
            </Card>
          ) : displayedProducts.length === 0 ? (
            /* EMPTY — phân biệt KHO RỖNG THẬT với FILTER KHÔNG KHỚP (F9). */
            <Card variant="soft" padding="none">
              <EmptyState
                bordered={false}
                icon={<Icon name={products.length === 0 ? 'inventory_2' : 'search_off'} size={20} />}
                title={products.length === 0
                  ? ('Kho bản vẽ đang trống')
                  : ('Không tìm thấy linh kiện CAD phù hợp')}
                description={products.length === 0
                  ? ('Chưa có bản vẽ CAD nào được đăng trên VCUBE.')
                  : ('Bộ lọc hiện tại không khớp bản vẽ nào trong kho — thử xóa từ khóa hoặc đổi danh mục.')}
                action={products.length === 0 ? (
                  <Button size="sm" onClick={() => handleProtectedAction(() => onNavigate('tool_3d'))}>
                    Tải tệp CAD của bạn
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary"
                    onClick={() => {
                      setCadSearch('');
                      setSelectedCategory('all');
                      setSelectedTag('all');
                    }}
                  >
                    Hiển thị tất cả bản vẽ
                  </Button>
                )}
              />
            </Card>
          ) : catalogViewMode === 'grid' ? (
            /* GRID VIEW MODE */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProducts.map((product) => (
                <Card
                  key={product.id}
                  as="article"
                  variant="soft"
                  padding="none"
                  className="content-auto group flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-e2 motion-reduce:transition-none"
                >
                  {/* 1. Ảnh / khung 3D — tỉ lệ 4:3, phủ overlay soi 3D */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Xem chi tiết: ${product.name}`}
                    className="relative aspect-4/3 cursor-pointer overflow-hidden bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    onClick={() => handleSelectProductAction(product, 'product_detail')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectProductAction(product, 'product_detail');
                      }
                    }}
                  >
                    {/* Ảnh thật (nếu có) phủ lên placeholder danh mục; ảnh stock/lỗi ⇒ placeholder */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-fg-subtle"
                    >
                      <Icon name={categoryIcon(product.category)} size={44} />
                      <span className="font-tech text-xs uppercase tracking-wider">
                        Chưa có ảnh
                      </span>
                    </div>
                    {realProductImageUrl(product.images, product.thumbnailUrl) ? (
                      <img
                        src={realProductImageUrl(product.images, product.thumbnailUrl)}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        className="relative h-full w-full object-cover"
                      />
                    ) : null}

                    {/* Badge trên ảnh — ảnh có thể tối nên dùng nền sáng mờ + viền (§3.4) */}
                    {product.badge && (
                      <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-e1 ${
                        product.badge.includes('2/9')
                          ? 'bg-danger text-primary-fg border-danger/20'
                          : 'bg-surface/90 backdrop-blur-sm text-fg-muted border-line'
                      }`}>
                        {product.badge}
                      </span>
                    )}

                    {/* Nút soi 3D: hover trên desktop, luôn hiện trên thiết bị cảm ứng */}
                    <button
                      type="button"
                      onClick={(e) => handleOpen3DPreview(product, e)}
                      aria-label={`Xem trước 3D: ${product.name}`}
                      className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 bg-surface-inverse/70 font-tech text-xs font-bold uppercase tracking-wider text-on-inverse opacity-0 transition-opacity pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:bg-surface-inverse/40 [@media(hover:none)]:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      title="Xoay xem 3D ngay tại đây"
                    >
                      <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-fg shadow-e1">
                        <Icon name="3d_rotation" size={24} />
                      </span>
                      <span className="rounded-md border border-line bg-surface-inverse px-3 py-1 text-accent">
                        Soi 3D 360° trực tiếp
                      </span>
                    </button>

                    {/* Thời gian in — thiếu `print_time` ⇒ `—`, không bịa giờ in */}
                    <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-xs text-fg-muted shadow-e1 backdrop-blur-sm">
                      <Icon name="timer" size={14} className="shrink-0 text-fg-muted" aria-hidden="true" />
                      {product.printTime || EMPTY_VALUE}
                    </span>
                  </div>

                  {/* 2→6. Tác giả/đánh giá → tiêu đề → vật liệu & định dạng → giá & giấy phép → CTA */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {/* Tác giả & đánh giá */}
                    <div className="flex items-center justify-between gap-2 font-sans text-xs text-fg-muted">
                      <span className="flex min-w-0 items-center gap-1 truncate font-tech font-semibold uppercase tracking-wider">
                        <Icon name="engineering" size={14} className="shrink-0 text-fg-muted" aria-hidden="true" />
                        <span className="truncate">{product.designer || EMPTY_VALUE}</span>
                      </span>
                      {/* CI-03 + T3: chỉ hiện sao khi có CẢ điểm và số đánh giá thật.
                          `rating` NULL hoặc `reviewsCount = 0` ⇒ chữ, KHÔNG `★ 0`/`NaN`. */}
                      {hasRating(product) ? (
                        <span className="flex shrink-0 items-center gap-1 font-tech text-xs font-bold tabular-nums text-fg">
                          <Star size={14} className="text-warning-strong" fill="currentColor" aria-hidden="true" />
                          {product.rating}
                        </span>
                      ) : (
                        <span className="shrink-0 font-sans text-xs text-fg-muted">
                          Chưa có đánh giá
                        </span>
                      )}
                    </div>

                    {/* Tiêu đề */}
                    <button
                      type="button"
                      onClick={() => handleSelectProductAction(product, 'product_detail')}
                      className="line-clamp-2 cursor-pointer rounded-sm text-left text-base font-semibold leading-snug tracking-tight text-fg transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {product.name}
                    </button>

                    {/* Vật liệu · định dạng · kích thước — chỉ dữ liệu thật, thiếu ⇒ — */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-subtle pt-2.5 font-tech text-xs text-fg-muted">
                      <span className="flex min-w-0 items-center gap-1">
                        <Icon name="layers" size={14} className="shrink-0" aria-hidden="true" />
                        <span className="truncate" title={`Vật liệu: ${materialLabel(product)}`}>
                          Vật liệu: {materialLabel(product)}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1">
                        <Icon name="category" size={14} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">Định dạng: {product.cadFormat || EMPTY_VALUE}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1">
                        <Icon name="straighten" size={14} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">Kích thước: {product.specs?.dimensions || EMPTY_VALUE}</span>
                      </span>
                    </div>

                    {/* Thẻ kỹ thuật của sản phẩm (giá trị từ DB) */}
                    <div className="flex flex-wrap gap-1">
                      {(product.tags || []).slice(0, 3).map((tg) => (
                        <button
                          key={tg}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(tg);
                          }}
                          className={`min-h-6 cursor-pointer rounded-full border px-2 py-0.5 font-tech text-xs uppercase transition-colors ${
                            tg.includes('2/9')
                              ? 'border-danger/30 bg-danger-tint font-bold text-fg'
                              : 'border-line bg-surface-muted text-fg-muted hover:border-line-control'
                          }`}
                        >
                          #{tg}
                        </button>
                      ))}
                    </div>

                    {/* Giá & giấy phép */}
                    <div className="mt-auto space-y-2 pt-3 border-t border-line-subtle">
                      <div className="flex items-baseline justify-between gap-2 font-sans">
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                            Tệp số
                          </span>
                          <span className="font-tech text-sm font-bold tabular-nums text-fg">
                            {vnd(product.priceDigital, locale)}
                          </span>
                        </div>
                        <div className="min-w-0 text-right">
                          <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                            In vật lý
                          </span>
                          <span className="font-tech text-sm font-bold tabular-nums text-fg">
                            {vnd(product.pricePhysical, locale)}
                          </span>
                        </div>
                      </div>

                      <p className="flex min-w-0 items-center gap-1.5 text-xs text-fg-muted" title={licenseLabel(product.licenseType)}>
                        <Icon name="license" size={14} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">Giấy phép: {licenseLabel(product.licenseType)}</span>
                      </p>

                      {/* CTA — 1 CTA mua tệp + 1 CTA xem/đặt in + tuỳ biến nếu có */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" className="flex-1"
                          onClick={(e) => handleQuickAddDigital(product, e)}
                          disabled={!(isNum(product.priceDigital) && product.priceDigital > 0)}
                          title={isNum(product.priceDigital) && product.priceDigital > 0
                            ? ('Tải tệp CAD STL/STEP gốc')
                            : ('Người bán không mở bán kênh tệp số.')}
                          leadingIcon={<Icon name="download" size={16} />}
                        >
                          <span>
                            {isNum(product.priceDigital) && product.priceDigital > 0
                              ? ('Mua tệp CAD')
                              : ('Không bán tệp số')}
                          </span>
                        </Button>

                        <Button size="sm" variant="secondary"
                          onClick={() => handleSelectProductAction(product, 'product_detail')}
                          title={'Xem chi tiết & đặt in vật lý'}
                          leadingIcon={<Icon name="precision_manufacturing" size={16} className="text-fg" />}
                        >
                          <span>Đặt in</span>
                        </Button>

                        {product.isCustomizable && (
                          <Button iconOnly size="sm" variant="secondary"
                            aria-label="Khắc tên / Tùy biến kích thước"
                            onClick={() => handleSelectProductAction(product, 'personalize')}
                            leadingIcon={<Icon name="tune" size={16} className="text-fg" />}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* TECHNICAL TABLE VIEW MODE — density bảng §3.5 giữ nguyên */
            <Card variant="soft" padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans">
                  <thead className="bg-surface-muted text-xs uppercase tracking-wider text-fg-subtle border-b border-line">
                    <tr>
                      <th className="h-10 px-4 text-left font-semibold">Linh Kiện CAD</th>
                      <th className="h-10 px-4 text-left font-semibold">Danh Mục</th>
                      <th className="h-10 px-4 text-left font-semibold">Kích Thước</th>
                      <th className="h-10 px-4 text-left font-semibold">Thời Gian In</th>
                      <th className="h-10 px-4 text-right font-semibold">Giá tệp số</th>
                      <th className="h-10 px-4 text-right font-semibold">Giá In Vật Lý</th>
                      <th className="h-10 px-4 text-right font-semibold">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {visibleProducts.map((product) => (
                      <tr key={product.id} className="h-11 hover:bg-surface-muted/60 transition-colors group">
                        <td className="px-4 py-2 text-sm text-fg">
                          <div className="flex items-center gap-3">
                            {realProductImageUrl(product.images, product.thumbnailUrl) ? (
                              <img
                                src={realProductImageUrl(product.images, product.thumbnailUrl)}
                                alt={product.name}
                                loading="lazy"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                className="w-12 h-12 object-cover rounded-md shrink-0"
                              />
                            ) : (
                              <div
                                aria-hidden="true"
                                className="grid size-12 shrink-0 place-items-center rounded-md bg-surface-muted text-fg-muted"
                              >
                                <Icon name={categoryIcon(product.category)} size={22} />
                              </div>
                            )}
                            <div>
                              <button
                                type="button"
                                onClick={() => handleSelectProductAction(product, 'product_detail')}
                                className="font-bold text-sm text-fg hover:text-primary cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                              >
                                {product.name}
                              </button>
                              <span className="block font-tech text-xs text-fg-muted">
                                Tác giả: {product.designer || EMPTY_VALUE} • SKU: {product.sku || EMPTY_VALUE}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-mono font-semibold uppercase text-fg-muted">
                          {product.category}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-fg">
                          {product.specs?.dimensions || EMPTY_VALUE}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-fg-muted">
                          {product.printTime || EMPTY_VALUE}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono font-semibold tabular-nums text-fg">
                          {vnd(product.priceDigital, locale)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono tabular-nums text-fg-muted">
                          {vnd(product.pricePhysical, locale)}
                        </td>
                        <td className="px-4 py-2 text-right">
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
                                ? ('Tải CAD')
                                : ('Không bán tệp số')}
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

          {/* Xem thêm — mặc định 6 sản phẩm (2 hàng × 3 cột) để tránh ngợp thông tin */}
          {hasMoreProducts ? (
            <div className="pt-2 flex flex-col items-center gap-2">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setCatalogLimit((n) => n + CATALOG_PAGE_SIZE)}
                leadingIcon={<Icon name="expand_more" size={20} />}
              >
                {`Xem thêm ${formatNumber(displayedProducts.length - visibleProducts.length)} mẫu CAD`}
              </Button>
              <button
                type="button"
                onClick={() => handleProtectedAction(() => onNavigate('explore'))}
                className="text-xs text-fg-muted hover:text-primary font-medium cursor-pointer underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Hoặc xem toàn bộ kho bản vẽ
              </button>
            </div>
          ) : null}

          {/* Footer Callout */}
          <Card variant="soft" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-xs text-fg-muted">
              Bạn có tệp 3D của riêng mình? Sử dụng công cụ phân tích lưới và báo giá tức thì của chúng tôi.
            </span>
            <Button variant="secondary" size="sm" className="shrink-0"
              onClick={() => handleProtectedAction(() => onNavigate('tool_3d'))}
              leadingIcon={<Icon name="upload_file" size={16} className="text-primary" />}
            >
              <span>Tải tệp của bạn lên</span>
            </Button>
          </Card>
        </div>
      </section>

      {/* 4.5 Quy trình 4 bước đặt hàng — tăng niềm tin trước CTA */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 md:px-12 bg-canvas">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              QUY TRÌNH ĐẶT HÀNG
            </span>
            <h2 className="fluid-h2 text-fg">
              Từ Bản Vẽ Đến Chi Tiết Hoàn Thiện
            </h2>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: 'upload_file', titleVi: 'Tải bản vẽ', descVi: 'Tải tệp STL / STEP / 3MF lên hệ thống.', titleEn: 'Upload CAD', descEn: 'Upload an STL / STEP / 3MF file.' },
              { icon: 'request_quote', titleVi: 'Phân tích & báo giá', descVi: 'Hệ thống đọc lưới, tính thể tích và báo giá từ chính tệp.', titleEn: 'Analyse & quote', descEn: 'Mesh is read, volume computed, quote built from the file.' },
              { icon: 'precision_manufacturing', titleVi: 'Chọn xưởng & xác nhận', descVi: 'Chọn vật liệu, xưởng in phù hợp và xác nhận đơn.', titleEn: 'Match & confirm', descEn: 'Pick material and workshop, then confirm the order.' },
              { icon: 'local_shipping', titleVi: 'Giao nhận & theo dõi', descVi: 'Theo dõi tiến độ sản xuất và nhận chi tiết hoàn thiện.', titleEn: 'Track & receive', descEn: 'Track production progress and receive the finished part.' },
            ].map((step, i) => (
              <li key={step.icon} className="space-y-3 rounded-lg bg-surface p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-md bg-primary-tint text-primary flex items-center justify-center">
                    <Icon name={step.icon} size={20} />
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-fg-muted">0{i + 1}</span>
                </div>
                <h3 className="font-semibold text-base tracking-tight text-fg">{step.titleVi}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{step.descVi}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Callout cuối trang — panel tối giữa nền sáng (§1.1), 1 CTA chính + 1 CTA phụ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 md:px-12 bg-canvas">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-xl border border-on-inverse/10 bg-surface-inverse p-8 text-on-inverse shadow-soft sm:p-12">
          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-inverse-raised/80 border border-on-inverse/15 rounded-full text-xs font-semibold uppercase tracking-wider text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse motion-reduce:animate-none" />
              <span>SẴN SÀNG SẢN XUẤT</span>
            </div>

            <h2 className="fluid-h2 text-on-inverse tracking-tight">
              Hiện Thực Hoá Mô Hình 3D Của Bạn
            </h2>

            <p className="text-sm sm:text-base text-on-inverse/70 max-w-2xl mx-auto font-sans leading-relaxed">
              Tải tệp CAD để nhận báo giá tức thì, phân tích lưới in 3D tự động và kết nối trực tiếp với mạng lưới xưởng in công nghiệp đạt chuẩn.
            </p>

            {/* Feature Guarantees */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2 text-xs font-mono text-on-inverse/80">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-inverse-raised/70 border border-on-inverse/15">
                <Icon name="verified_user" size={16} className="text-accent" />
                <span>Bảo mật dữ liệu chuẩn NDA</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-inverse-raised/70 border border-on-inverse/15">
                <Icon name="straighten" size={16} className="text-accent" />
                <span>Kiểm soát dung sai kỹ thuật</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-inverse-raised/70 border border-on-inverse/15">
                <Icon name="local_shipping" size={16} className="text-accent" />
                <span>Giao hàng nhanh toàn quốc</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="accent"
                onClick={() => onNavigate('quote')}
                leadingIcon={<Icon name="upload_file" size={20} />}
                className="w-full sm:w-auto shadow-e1"
              >
                <span>Báo giá tệp 3D của bạn</span>
              </Button>

              <Button
                size="lg"
                variant="ghost"
                onClick={() => setIsCustomIdeaModalOpen(true)}
                leadingIcon={<Icon name="lightbulb" size={20} />}
                className="w-full sm:w-auto border border-on-inverse/15 bg-surface-inverse-raised text-on-inverse"
              >
                <span>{'Tư Vấn & Tuỳ Biến Theo Ý Tưởng'}</span>
              </Button>
            </div>

            {/* Partner Network (if present) */}
            {hasPartners && (
              <div className="pt-8 border-t border-on-inverse/15 mt-8 space-y-3">
                <span className="text-xs uppercase font-mono font-bold text-on-inverse/60 tracking-widest block">
                  {activeContent.trustPartnersTitle || ('Đơn Vị Đồng Hành Cùng VCUBE')}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono text-xs font-bold text-on-inverse/80">
                  {partnersList.map((partner, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-3 py-1.5 bg-surface-inverse-raised/70 rounded-sm border border-on-inverse/15 text-on-inverse/90"
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

      {/* Hotline cố định — CHỈ hiện khi số hợp lệ (không bịa/không hiện số placeholder) */}
      {isDisplayableHotline(activeContent.hotline) ? (
        <a
          href={`tel:${activeContent.hotline.replace(/[^\d+]/g, '')}`}
          className="fixed bottom-6 left-6 z-drawer hidden min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-3 font-sans text-xs font-semibold text-primary-fg shadow-e2 transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:flex"
          aria-label={`Gọi hotline ${activeContent.hotline}`}
        >
          <Icon name="call" size={18} />
          <span className="tabular-nums">{activeContent.hotline}</span>
        </a>
      ) : null}

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
