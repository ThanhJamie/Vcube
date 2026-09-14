import React, { useState, useMemo, useRef } from 'react';
import { Star } from 'lucide-react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig, SiteContentConfig } from '../types';
import { CATEGORIES, POPULAR_TAGS, MATERIALS_CATALOG, DEFAULT_SITE_CONTENT } from '../data/mockData';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { CadQuickViewModal } from '../components/CadQuickViewModal';
import { HorizontalScrollFilter } from '../components/HorizontalScrollFilter';
import { MaterialComparisonMatrix } from '../components/MaterialComparisonMatrix';
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

  // Active Model in Hero
  const [heroModel, setHeroModel] = useState<'gear' | 'drone' | 'box'>('gear');

  // CAD Catalog Filter & Browse State
  const [cadSearch, setCadSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'tech-table'>('grid');

  // 3D Quick-Inspect Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState<boolean>(false);

  // Quick Calculator State
  const [calcMaterialId, setCalcMaterialId] = useState<string>(materialsList[0]?.id || 'pla-tough');
  const [calcInfill, setCalcInfill] = useState<number>(30);
  const [calcPartSize, setCalcPartSize] = useState<'small' | 'medium' | 'large'>('medium');

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

  // Fast calculations for simulator from dynamic Admin config
  // A11 GUARD: `MATERIALS_CATALOG` (fixture) đã bị rỗng hoá ⇒ `materialsList[0]` là `undefined`
  // và dòng tính gram ngay dưới ném TypeError (trang chủ trắng). Không bịa tỉ trọng/đơn giá:
  // thiếu vật liệu ⇒ hiện `—` + nói rõ nguyên nhân và nơi nhập (xem JSX bên dưới).
  const activeMaterial = materialsList.find(m => m.id === calcMaterialId) || materialsList[0];
  const baseWeight = calcPartSize === 'small' ? 35 : calcPartSize === 'medium' ? 85 : 190;
  /**
   * D8 (bỏ default bịa): `density` (g/cm³) và `pricePerGram` là DỮ LIỆU ĐO ĐƯỢC, không phải
   * hằng số để đoán. Vật liệu chưa khai (NULL, hoặc NaN) ⇒ trả `null` để JSX hiện `—`,
   * KHÔNG mượn tỉ trọng/đơn giá mặc định nào để nấu ra một con số trông như thật.
   */
  const density = activeMaterial && isNum(activeMaterial.density) && activeMaterial.density > 0 ? activeMaterial.density : null;
  const pricePerGram = activeMaterial && isNum(activeMaterial.pricePerGram) && activeMaterial.pricePerGram > 0 ? activeMaterial.pricePerGram : null;
  const estimatedGrams = activeMaterial && density !== null
    ? Math.round(baseWeight * (0.5 + (calcInfill / 100) * 0.7) * (density / 1.24))
    : null;
  const estimatedHours = estimatedGrams === null ? null : ((estimatedGrams / 35) + 0.8).toFixed(1);

  /**
   * Bộ tính nhanh chỉ được trả một con số khi MỌI thông số của nó có nguồn thật.
   * Trước đây dòng dưới rơi về `8 / 2.5 / 5` (số Inkiri) ⇒ khách nhìn thấy phụ phí 15,5%
   * không ai cấu hình. Nay thiếu ⇒ `null` ⇒ `—` + InfoTip nêu tên thông số.
   */
  const estimatorBaseOverhead: number | null = (() => {
    if (!cfg) return null;
    if (isNum(cfg.fastEstimatorBaseOverhead)) return cfg.fastEstimatorBaseOverhead;
    const packaging = isNum(cfg.fixedPackagingCost) ? cfg.fixedPackagingCost : null;
    const overhead = isNum(cfg.overheadPerUnit) ? cfg.overheadPerUnit : null;
    const labor = isNum(cfg.laborHourlyRate) ? cfg.laborHourlyRate : null;
    if (packaging === null || overhead === null || labor === null) return null;
    return packaging + overhead + Math.round((labor * 20) / 60);
  })();
  const markupPercent = cfg && isNum(cfg.defaultMarkupPercent) ? cfg.defaultMarkupPercent : null;
  const markupMultiplier = markupPercent === null ? null : 1 + markupPercent / 100;

  const feeParams: { key: string; value: number | null }[] = [
    { key: 'platformCommissionPercent', value: cfg && isNum(cfg.platformCommissionPercent) ? cfg.platformCommissionPercent : null },
    { key: 'paymentGatewayFeePercent', value: cfg && isNum(cfg.paymentGatewayFeePercent) ? cfg.paymentGatewayFeePercent : null },
    { key: 'designerRoyaltyPercent', value: cfg && isNum(cfg.designerRoyaltyPercent) ? cfg.designerRoyaltyPercent : null },
  ];
  const missingFeeParams = feeParams.filter((p) => p.value === null).map((p) => p.key);
  const feeSurchargePercent = missingFeeParams.length === 0
    ? feeParams.reduce((sum, p) => sum + (p.value as number), 0)
    : null;
  const feeSurchargeMultiplier = feeSurchargePercent === null ? null : 1 + feeSurchargePercent / 100;

  const estimatedRawCost =
    activeMaterial && estimatedGrams !== null && pricePerGram !== null && estimatorBaseOverhead !== null
      ? estimatedGrams * pricePerGram + estimatorBaseOverhead
      : null;

  /** Làm tròn theo `roundingRule` thật; chưa khai ⇒ KHÔNG làm tròn (không mượn mốc 1.000đ). */
  const roundingStep = cfg?.roundingRule === '5000' ? 5000 : cfg?.roundingRule === '10000' ? 10000 : cfg?.roundingRule === '1000' ? 1000 : 0;
  const estimatedPrice =
    estimatedRawCost === null || markupMultiplier === null || feeSurchargeMultiplier === null
      ? null
      : (() => {
          const raw = estimatedRawCost * markupMultiplier * feeSurchargeMultiplier;
          return roundingStep > 0 ? Math.round(raw / roundingStep) * roundingStep : Math.round(raw);
        })();

  /** Tên các thông số giá còn thiếu (nêu đích danh, không đoán hộ). */
  const missingEstimatorParams: string[] = [];
  if (!cfg) missingEstimatorParams.push('pricing_configs (chưa nạp cấu hình giá)');
  if (estimatedGrams === null) missingEstimatorParams.push('materials.density');
  if (pricePerGram === null) missingEstimatorParams.push('materials.pricePerGram');
  if (estimatorBaseOverhead === null) missingEstimatorParams.push('fastEstimatorBaseOverhead / fixedPackagingCost + overheadPerUnit + laborHourlyRate');
  if (markupMultiplier === null) missingEstimatorParams.push('defaultMarkupPercent');
  missingEstimatorParams.push(...missingFeeParams);

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
  // P1 §4: dòng hỗ trợ ở CTA cuối trang — bỏ giá trị rỗng, hết dữ liệu thì ẩn cả khối.
  const supportLine = [
    activeContent.hotline ? `Hotline: ${activeContent.hotline}` : '',
    activeContent.contactEmail ? `Email: ${activeContent.contactEmail}` : '',
  ].filter(Boolean).join(' • ');
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
                  {activeContent.heroSubheadline}
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
              <Card padding="lg" className="w-full bg-surface-inverse text-on-inverse border-line shadow-e3 relative flex flex-col justify-between overflow-hidden">
                {/* Top header on 3D Box */}
                <div className="w-full flex items-center justify-between z-sticky text-on-inverse/70 font-mono text-xs uppercase tracking-wider">
                  <span className="font-bold text-accent flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    CHASSIS // 3D VIEWER
                  </span>
                  <div className="flex items-center gap-1 bg-surface-inverse-raised p-1 rounded-md border border-line">
                    {([['gear', 'Bánh Răng'], ['drone', 'Khung Drone'], ['box', 'Vỏ Hộp IoT']] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setHeroModel(id)}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono font-bold transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          heroModel === id ? 'bg-primary text-primary-fg' : 'text-on-inverse/70 hover:text-on-inverse'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D Canvas Viewer */}
                <div className="w-full h-[280px] sm:h-[320px] relative my-3">
                  <ThreeModelViewer
                    modelType={heroModel}
                    color={heroModel === 'gear' ? '#00687a' : heroModel === 'drone' ? '#38bdf8' : '#e2e8f0'}
                    className="h-full w-full"
                  />
                </div>

                {/* Bottom Footer on 3D Box */}
                <div className="w-full flex items-center justify-between z-sticky pt-3 border-t border-line">
                  <span className="font-mono text-xs text-accent flex items-center gap-1.5">
                    <Icon name="360" size={16} className="animate-spin" />
                    XOAY 3D 360° TƯƠNG TÁC
                  </span>
                  <div className="text-right">
                    <span className="block font-mono text-xs text-on-inverse/70 uppercase tracking-widest">
                      {(activeContent.hanoiWorkshopAddress || '').split(':')[0] || 'XƯỞNG VCUBE'}
                    </span>
                  </div>
                </div>
              </Card>

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
                  className="group flex flex-col overflow-hidden transition-shadow duration-150 hover:shadow-e1"
                >
                  {/* Card Image Area with Quick 3D Inspect Overlay */}
                  <div
                    className="relative aspect-4/3 bg-surface-inverse cursor-pointer overflow-hidden"
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
                          : 'bg-surface-inverse text-accent border border-accent/30'
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
                  <thead className="bg-surface-inverse text-on-inverse font-tech text-xs uppercase tracking-wider">
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

      {/* 4. Live 3D Quoting Cost Simulator Widget — band tối (§2.3 "khối khác biệt") */}
      <section className="bg-surface-inverse py-20 sm:py-24 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-on-inverse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left: Info & Values */}
              <div className="lg:col-span-5 space-y-4">
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-accent font-bold block">
                  {activeContent.estimatorBadge || 'VCUBE FAST ESTIMATOR // LIVE QUOTE'}
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-on-inverse tracking-tight">
                  {activeContent.estimatorTitle || 'Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp'}
                </h2>
                <p className="text-xs sm:text-sm text-on-inverse/80 leading-relaxed font-sans">
                  {activeContent.estimatorSubtitle || 'Chọn vật liệu kỹ thuật, độ đặc infill và kích cỡ mẫu để mô phỏng tức thì chi phí gia công theo bảng giá xưởng VCUBE.'}
                </p>

                <div className="pt-2 space-y-2.5 text-xs text-on-inverse/80 font-sans">
                  <div className="flex items-center gap-2.5">
                    <Icon name="check_circle" size={16} className="text-accent" />
                    <span>{activeContent.estimatorBenefit1 || 'Tự động tính toán theo tỉ trọng vật liệu g/cm³ chuẩn xác'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Icon name="check_circle" size={16} className="text-accent" />
                    <span>{activeContent.estimatorBenefit2 || 'Miễn phí gọt support & rửa cồn siêu âm xử lý bề mặt UV'}</span>
                  </div>
                </div>
              </div>

              {/* Right: Interactive Controls & Instant Price Display Card */}
              <Card padding="lg" className="lg:col-span-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  {/* Material Selection */}
                  <div>
                    <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-2">
                      {t('calcMaterial', 'Loại vật liệu:', 'Material:')}
                    </label>
                    <select
                      value={calcMaterialId}
                      onChange={(e) => setCalcMaterialId(e.target.value)}
                      className="w-full bg-canvas border border-line-control p-2.5 text-sm text-fg font-bold rounded-md focus:outline-none focus:border-primary cursor-pointer"
                    >
                      {materialsList.length === 0 && (
                        <option value="">— Chưa có vật liệu trong hệ thống —</option>
                      )}
                      {materialsList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.strength ? `${m.name} (${m.strength})` : m.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-fg-muted mt-1">
                      {activeMaterial
                        ? activeMaterial.desc || EMPTY_VALUE
                        : 'Chưa có vật liệu nào trong hệ thống nên không tính được chi phí. Quản trị viên nhập danh mục nhựa ở /admin, mục Cấu hình giá, Danh Mục Nhựa & Resin.'}
                    </p>
                  </div>

                  {/* Part Scale Selector */}
                  <div>
                    <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-2">
                      {isVi ? 'Kích thước linh kiện:' : 'Part scale:'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['small', 'medium', 'large'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setCalcPartSize(sz)}
                          className={`py-2 text-xs font-bold rounded-md transition-colors duration-150 uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            calcPartSize === sz
                              ? 'bg-primary text-primary-fg'
                              : 'bg-surface-muted text-fg-muted border border-line-control hover:text-fg'
                          }`}
                        >
                          {sz === 'small' ? (isVi ? 'Nhỏ (<5cm)' : 'Small') : sz === 'medium' ? (isVi ? 'Vừa (<10cm)' : 'Medium') : (isVi ? 'Lớn (<20cm)' : 'Large')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Infill Slider */}
                  <div className="sm:col-span-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-mono uppercase font-bold text-fg-muted">
                        {t('calcInfill', 'Độ đặc Infill:', 'Infill Density:')}
                      </label>
                      <span className="font-mono font-bold text-xs text-primary tabular-nums">{calcInfill}%</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="100"
                      step="5"
                      value={calcInfill}
                      onChange={(e) => setCalcInfill(Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-xs font-mono text-fg-muted mt-0.5">
                      <span>15% (Trưng bày/Vỏ)</span>
                      <span>50% (Cơ khí chịu lực)</span>
                      <span>100% (Đặc hoàn toàn)</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Live Estimation Result Strip */}
                <Card padding="md" className="bg-surface-muted flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-center sm:text-left w-full sm:w-auto">
                    <div>
                      <span className="text-xs text-fg-muted uppercase block font-medium">{t('calcEstWeight', 'Trọng lượng:', 'Weight:')}</span>
                      <span className="font-mono text-sm font-bold text-fg tabular-nums">
                        {estimatedGrams === null ? EMPTY_VALUE : `~${formatNumber(estimatedGrams, { locale, maximumFractionDigits: 0 })}g`}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-fg-muted uppercase block font-medium">{t('calcEstTime', 'Thời gian in:', 'Print time:')}</span>
                      <span className="font-mono text-sm font-bold text-fg tabular-nums">
                        {estimatedHours === null ? EMPTY_VALUE : `~${estimatedHours}h`}
                      </span>
                    </div>
                  </div>

                  <div className="text-center sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-line-subtle">
                    <span className="text-xs text-fg-muted uppercase block font-medium flex items-center justify-center sm:justify-end gap-1">
                      {t('calcEstPrice', 'Chi phí ước tính:', 'Estimated cost:')}
                      {estimatedPrice === null && missingEstimatorParams.length > 0 && (
                        <InfoTip label={isVi ? 'Vì sao chưa ra được giá?' : 'Why no price yet?'}
                          title={isVi ? 'Thiếu thông số giá' : 'Missing pricing parameters'}>
                          {isVi
                            ? `Hệ thống không đoán hộ. Cần cấu hình: ${missingEstimatorParams.join(' · ')}. Nhập ở /admin, mục Cấu hình giá.`
                            : `Nothing is guessed. Required configuration: ${missingEstimatorParams.join(' · ')}. Set it in /admin, Pricing configuration.`}
                        </InfoTip>
                      )}
                    </span>
                    <span className="font-mono text-xl font-bold text-primary tabular-nums block">
                      {estimatedPrice !== null && estimatedPrice > 0 ? `${formatNumber(estimatedPrice, { locale, maximumFractionDigits: 0 })} đ` : EMPTY_VALUE}
                    </span>
                    {/* Dòng phụ phí CHỈ hiện khi cả 3 thông số phí đều có nguồn thật.
                        Thiếu ⇒ ẩn hẳn (trước đây hiển thị 15,5% bằng số Inkiri). */}
                    {feeSurchargePercent !== null && (
                      <span className="text-xs text-fg-muted font-sans block mt-0.5">
                        {isVi
                          ? `Đã gồm phụ phí nền tảng · cổng thanh toán · bản quyền: ${formatPercent(feeSurchargePercent, { locale })}`
                          : `Includes platform · gateway · royalty fees: ${formatPercent(feeSurchargePercent, { locale })}`}
                      </span>
                    )}
                    {markupPercent !== null && (
                      <span className="text-xs text-fg-muted font-sans block">
                        {isVi ? `Biên lợi nhuận mục tiêu: ${formatPercent(markupPercent, { locale })}` : `Target margin: ${formatPercent(markupPercent, { locale })}`}
                      </span>
                    )}
                  </div>
                </Card>

                {/* Call to Action to full 3D Upload */}
                <Button size="lg" fullWidth
                  onClick={() => handleProtectedAction(() => onNavigate('tool_3d'))}
                  leadingIcon={<Icon name="upload_file" size={16} />}
                  trailingIcon={<Icon name="arrow_forward" size={16} />}
                >
                  <span>{activeContent.estimatorCtaText || 'Tải File STL Lên Để Báo Giá Chi Tiết'}</span>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 4.5 Technical Material Comparison Matrix */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 md:px-12 bg-canvas">
        <div className="max-w-7xl mx-auto">
          <MaterialComparisonMatrix
            materials={materialsList}
            onNavigate={onNavigate}
          />
        </div>
      </section>

      {/* 5. Technical Taxonomy & Application Categories */}
      <section className="py-20 sm:py-24 bg-surface px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-line gap-3">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block mb-1 font-bold">
                {t('sectionTaxonomyPre', 'TAXONOMY // PHÂN LOẠI', 'TAXONOMY // CATEGORIES')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                {t('sectionTaxonomyTitle', 'Danh Mục Ứng Dụng Kỹ Thuật', 'Engineering Application Categories')}
              </h2>
            </div>
            <Button variant="ghost" size="sm" className="text-primary self-start sm:self-auto"
              onClick={() => onNavigate('explore')}
              trailingIcon={<Icon name="arrow_forward" size={16} />}
            >
              <span>{isVi ? `Xem toàn bộ kho bản vẽ (${products.length})` : `Browse full library (${products.length})`}</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {CATEGORIES.filter(c => c.id !== 'all').map((cat, idx) => {
              const count = products.filter((p) => p.category === cat.id).length;
              return (
                <Card
                  key={cat.id}
                  as="button"
                  interactive
                  padding="lg"
                  className="text-left flex flex-col justify-between min-h-[160px] gap-4"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    const el = document.getElementById('browse-cad-catalog');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs text-fg-muted font-bold tabular-nums">0{idx + 1}</span>
                    <Icon name={cat.icon} size={28} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-fg leading-snug">
                      {isVi ? cat.name : (cat as any).nameEn || cat.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-line-subtle font-mono text-xs">
                      <span className="text-primary font-bold tabular-nums">{count} files</span>
                      <Icon name="arrow_forward" size={16} className="text-fg-muted" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. 3-Step Precision Manufacturing Process Chronicle */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 sm:mb-14 text-center max-w-xl mx-auto space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block font-bold">
              {activeContent.workflowBadge || 'CHRONICLE // QUY TRÌNH XƯỞNG'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-fg tracking-tight">
              {activeContent.workflowTitle || 'Quy Trình Gia Công 3 Bước Chuẩn Xác'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                phase: 'PHASE 01',
                title: activeContent.workflowStep1Title || 'Tải Lên & Khảo Sát Mesh STL',
                desc: activeContent.workflowStep1Desc || 'Thuật toán quét hình học của chính tệp bạn tải lên để đo kích thước, thể tích vật liệu và dựng mô hình 3D trong trình xem.',
              },
              {
                phase: 'PHASE 02',
                title: activeContent.workflowStep2Title || 'Cắt Lớp & In Nhiệt Chuẩn Xác',
                desc: activeContent.workflowStep2Desc || 'Gia công trên hệ thống máy in của xưởng với các loại vật liệu kỹ thuật đã khai báo trong hệ thống.',
              },
              {
                phase: 'PHASE 03',
                title: activeContent.workflowStep3Title || 'Kiểm Định QC & Bàn Giao',
                desc: activeContent.workflowStep3Desc || 'Đo kiểm theo quy trình và mục tiêu dung sai đã thoả thuận với khách hàng, đóng gói chống sốc và giao hàng toàn quốc.',
              },
            ].map((step, idx) => (
              <Card key={step.phase} padding="lg" className="relative flex flex-col justify-between">
                {/* Chữ số bước là chữ HIỂN THỊ ⇒ dùng màu đạt ngưỡng chữ lớn (>= 3:1). */}
                <span aria-hidden="true" className="font-mono text-5xl font-black text-line-control absolute top-5 right-5 select-none pointer-events-none tabular-nums">
                  0{idx + 1}
                </span>
                <div className="relative z-sticky space-y-2">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block font-bold">{step.phase}</span>
                  <h3 className="font-bold text-lg text-fg">{step.title}</h3>
                  <p className="text-xs text-fg-muted leading-relaxed font-sans">{step.desc}</p>
                </div>
                <div className="w-10 h-1 bg-primary rounded-full mt-6" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Band kết — surface-inverse cho CTA cuối (§2.3). Khối thành tích chỉ hiện khi có dữ liệu. */}
      <section className="py-20 sm:py-24 bg-surface-inverse px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto text-center space-y-5">
          {hasPartners && (
            <>
              <span className="text-xs uppercase font-mono font-bold text-on-inverse/70 tracking-widest block">
                {activeContent.trustPartnersTitle || 'Đơn Vị Đồng Hành Cùng VCUBE'}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs font-bold text-on-inverse">
                {partnersList.map((partner, pIdx) => (
                  <span
                    key={pIdx}
                    className="px-4 py-2 bg-surface-inverse-raised rounded-sm transition-all"
                  >
                    {partner}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="pt-2 flex justify-center">
            <Button size="lg" onClick={() => onNavigate('quote')}
              leadingIcon={<Icon name="upload_file" size={20} />}
            >
              <span>{isVi ? 'Báo Giá File 3D Của Bạn' : 'Quote Your 3D File'}</span>
            </Button>
          </div>

          {/* Workshop Contact Details Strip */}
          <div className="pt-6 border-t border-line grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-on-inverse/70">
            <div>
              <strong className="text-on-inverse block font-bold mb-0.5">Xưởng Bắc:</strong>
              <span>{activeContent.hanoiWorkshopAddress || EMPTY_VALUE}</span>
            </div>
            <div>
              <strong className="text-on-inverse block font-bold mb-0.5">Xưởng Nam:</strong>
              <span>{activeContent.hcmWorkshopAddress || EMPTY_VALUE}</span>
            </div>
            {supportLine && (
              <div>
                <strong className="text-on-inverse block font-bold mb-0.5">
                  {isVi ? 'Hỗ Trợ Kỹ Thuật:' : 'Technical Support:'}
                </strong>
                <span>{supportLine}</span>
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
    </div>
  );
};
