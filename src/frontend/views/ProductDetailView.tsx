import React, { useState } from 'react';
import { Star, Minus } from 'lucide-react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../../types';
import { MATERIALS_CATALOG } from '../../data/mockData';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { CanvasErrorBoundary } from '../components/CanvasErrorBoundary';
import { MaterialTechnicalAdvisory } from '../components/material/MaterialTechnicalAdvisory';
import { SEOHead } from '../components/SEOHead';
import { useLanguage } from '../context/LanguageContext';
import { EMPTY_VALUE, formatNumber } from '@frontend/lib/format';
import { Icon, Button, Card, EmptyState, InfoTip, Badge, KeyValue, ProgressBar } from '@frontend/ui';

interface ProductDetailViewProps {
  product: Product;
  allProducts?: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

/** Số hữu hạn hay không — NULL/NaN ⇒ KHÔNG có giá trị (không đoán hộ). */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Tiền VND: thiếu giá trị ⇒ `—` (không bịa `0 đ`).
 * `0` KHÔNG phải một mức giá: `price_digital` / `price_physical` = 0 nghĩa là người bán KHÔNG
 * bán kênh đó. Cùng luật với `ExploreView.tsx` (`Number.isFinite(value) && value > 0 ? … : EMPTY_VALUE`).
 */
const vnd = (v: unknown, locale: string): string =>
  isNum(v) && v > 0 ? `${formatNumber(v, { locale, maximumFractionDigits: 0 })} đ` : EMPTY_VALUE;

/** Nhãn giấy phép trung thực khi người bán chưa khai (T3). */
const LICENSE_UNSET = '— (người bán chưa khai báo)';

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  allProducts = [],
  materials = MATERIALS_CATALOG,
  pricingConfig,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const locale = isVi ? 'vi-VN' : 'en-US';

  const materialsList = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;
  /**
   * Đợt P: `DEFAULT_INKIRI_FORMULA_CONFIG` KHÔNG còn là nguồn giá trị ở đây. Không có cấu
   * hình thật ⇒ `null`; mọi thông số phái sinh là `—`/ẩn, KHÔNG rơi về số mẫu của Inkiri.
   */
  const cfg: InkiriCostFormulaConfig | null = pricingConfig ?? null;

  const [viewMode, setViewMode] = useState<'3d' | 'image'>('3d');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(product.supportedMaterials?.[0] ?? '');
  const [selectedColorName, setSelectedColorName] = useState<string>(product.colors?.[0]?.name || '');
  const [resolution, setResolution] = useState('0.16 mm (Tiêu chuẩn kỹ thuật)');
  const [customEngraving, setCustomEngraving] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews' | 'slicing'>('desc');
  const [isAdding, setIsAdding] = useState(false);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const imageList = Array.isArray(product.images) ? product.images : [];
  const colorOptions = Array.isArray(product.colors) ? product.colors : [];
  const declaredMaterials = Array.isArray(product.supportedMaterials) ? product.supportedMaterials : [];
  const selectedColor = colorOptions.find((c) => c.name === selectedColorName) || null;

  // A5 (data-honesty): KHÔNG ghi cứng `'PLA Tough'`. Người bán chưa khai vật liệu ⇒ không có
  // vật liệu nào để gắn vào đơn; bắt buộc chặn đặt in thay vì âm thầm mặc định một vật liệu bịa.
  const materialSelected = selectedMaterial.trim().length > 0;
  const materialBlocked = !materialSelected;

  // Dynamic pricing calculation
  const selectedMaterialObj = selectedMaterial
    ? materialsList.find(
        m => m.name.toLowerCase().includes(selectedMaterial.toLowerCase()) ||
             m.id.toLowerCase() === selectedMaterial.toLowerCase()
      ) || materialsList[0]
    : null;

  const applicableDiscountTier = (cfg?.volumeDiscounts || []).find(
    d => quantity >= d.minQty && (d.maxQty === undefined || quantity <= d.maxQty)
  );
  const volumeDiscountPercent = applicableDiscountTier?.discountPercent || 0;

  /**
   * T1: KHÔNG bịa phí khắc chữ. `customEngravingFee` chưa cấu hình ⇒ `null`.
   * Khách có yêu cầu khắc mà phí chưa có ⇒ CHẶN đặt hàng và nêu đích danh thông số thiếu,
   * đúng luật của `pricingEngine` (`docs/plans/27-pricing-parameters.md` §3.1).
   */
  const engravingFee: number | null = cfg && isNum(cfg.customEngravingFee) ? cfg.customEngravingFee : null;
  const engravingRequested = customEngraving.trim().length > 0;
  const engravingBlocked = engravingRequested && engravingFee === null;
  /** Chỉ CỘNG vào đơn giá khi khách thật sự nhập nội dung khắc (giữ nguyên hành vi cũ). */
  const engravingFeeAmount = engravingRequested ? (engravingFee ?? 0) : 0;

  /**
   * T3 + P0-2: chỉ `> 0` mới là CÓ BÁN. `price_physical` / `price_digital` = 0 nghĩa là người bán
   * KHÔNG bán kênh đó (NULL cũng được `mappers.ts` quy về 0) ⇒ coi như KHÔNG có đơn giá, đúng
   * luật của `ExploreView.tsx` (`Number.isFinite(value) && value > 0`). Nhờ vậy `purchaseBlocked`
   * và `disabled={digitalPrice === null}` chặn luôn CTA của kênh không bán — không còn đẩy được
   * một dòng 0đ vào giỏ.
   */
  const physicalPrice: number | null = isNum(product.pricePhysical) && product.pricePhysical > 0 ? product.pricePhysical : null;
  const digitalPrice: number | null = isNum(product.priceDigital) && product.priceDigital > 0 ? product.priceDigital : null;
  /**
   * Giá bán 1 sản phẩm = giá niêm yết của chính sản phẩm + phí khắc (nếu khách yêu cầu).
   *
   * `unit_price_multiplier` KHÔNG được nhân vào giá bán ở đây. Bằng chứng: `pricingEngine.ts:70-88`
   * định nghĩa trường này là hệ số SUY ĐƠN GIÁ NHỰA đ/g (`costPerKg ÷ 1000 × hệ số`) — KHÔNG phải
   * hệ số nhân giá bán; dữ liệu thật trong bảng `materials` là 270/320/620/1400/1850 nên nhân
   * thẳng vào giá là sai 270–1850 lần (đo trên DOM: giá niêm yết 250.000 đ hiện thành 67.500.000 đ).
   *
   * Hệ quả CÓ CHỦ Ý: giá hiển thị KHÔNG gồm chênh lệch vật liệu. Muốn cộng chênh lệch thì phải lấy
   * từ dữ liệu thật của chính vật liệu (`pricePerGram`, hoặc `costPerKg ÷ 1000 × unitPriceMultiplier`
   * đúng như engine làm) rồi NHÂN với số gram — view này không có số gram nên KHÔNG bịa hệ số;
   * thay vào đó nói rõ ngay dưới bộ chọn vật liệu.
   */
  const unitBeforeDiscount = physicalPrice === null
    ? null
    : Math.round(physicalPrice) + engravingFeeAmount;
  const dynamicPricePhysical = unitBeforeDiscount === null
    ? null
    : Math.round(unitBeforeDiscount * (1 - volumeDiscountPercent / 100));
  const orderTotal = dynamicPricePhysical === null ? null : dynamicPricePhysical * quantity;
  const purchaseBlocked = dynamicPricePhysical === null || engravingBlocked || materialBlocked;

  // T3: đánh giá chỉ có nghĩa khi có CẢ điểm VÀ số lượng đánh giá thật.
  const reviewsCount: number | null = isNum(product.reviewsCount) ? product.reviewsCount : null;
  const ratingValue: number | null = isNum(product.rating) && product.rating > 0 ? product.rating : null;
  const showRating = ratingValue !== null && reviewsCount !== null && reviewsCount > 0;
  const reviewsCountLabel = reviewsCount !== null && reviewsCount > 0 ? formatNumber(reviewsCount, { locale, maximumFractionDigits: 0 }) : EMPTY_VALUE;

  // Related compatible products
  const relatedProducts = (allProducts || [])
    .filter(p => p.id !== product.id && (p.category === product.category || p.tags?.some(t => product.tags?.includes(t))))
    .slice(0, 3);

  const handleAddPhysical = () => {
    if (purchaseBlocked) return;
    setIsAdding(true);
    const item: CartItem = {
      id: `cart-${Date.now()}`,
      productId: product.id,
      type: 'physical',
      name: product.name,
      designer: product.designer,
      image: imageList[0],
      price: dynamicPricePhysical as number,
      quantity: quantity,
      material: selectedMaterial,
      color: selectedColor?.name,
      colorHex: selectedColor?.hex,
      dimensions: product.specs?.dimensions,
      resolution: resolution,
      customText: customEngraving.trim() || undefined
    };

    onAddToCart(item);
    setTimeout(() => {
      setIsAdding(false);
      onShowToast(isVi ? `Đã thêm ${quantity}x "${product.name}" vào đơn hàng!` : `Added ${quantity}x "${product.name}" to cart!`);
    }, 200);
  };

  const handleAddDigital = () => {
    if (digitalPrice === null) {
      onShowToast(isVi
        ? `Bản vẽ "${product.name}" không mở bán kênh file số (giá file số không lớn hơn 0) nên chưa thể mua.`
        : `"${product.name}" is not sold as a CAD file (its CAD price is not greater than 0), so it cannot be purchased.`);
      return;
    }
    const item: CartItem = {
      id: `cart-${Date.now()}-stl`,
      productId: product.id,
      type: 'digital',
      name: product.name,
      designer: product.designer,
      image: imageList[0],
      price: digitalPrice,
      quantity: 1,
      // Data-honesty: chỉ nêu định dạng CÓ THẬT của chính bản vẽ này.
      fileFormat: product.cadFormat ?? undefined,
      // R4: KHONG khang dinh 'Commercial License (Được phép sản xuất)' cho moi sản phẩm —
      // giấy phép chỉ được nêu khi chính sản phẩm đó khai (`license_type` từ DB, map ở
      // `src/backend/supabase/mappers.ts`). Chưa khai ⇒ để trống; giỏ hàng render `—`.
      licenseType: product.licenseType ?? undefined
    };

    onAddToCart(item);
    onShowToast(isVi ? `Đã thêm File 3D "${product.name}" vào giỏ hàng!` : `Added 3D CAD file "${product.name}" to cart!`);
  };

  const modelGeometryType = product.id.includes('gear')
    ? 'gear'
    : product.id.includes('drone')
    ? 'drone'
    : product.id.includes('vase')
    ? 'vase'
    : 'box';

  const specItems = [
    { label: 'Kích Thước Phủ Bì', value: product.specs?.dimensions || EMPTY_VALUE },
    { label: 'Khối Lượng Nhựa In', value: product.specs?.weight || EMPTY_VALUE },
    { label: 'Độ Phân Giải Lớp In', value: product.specs?.resolution || EMPTY_VALUE },
    { label: 'Công Nghệ Gia Công', value: product.specs?.technology || EMPTY_VALUE },
    { label: 'Thời Gian In Dự Kiến', value: product.printTime || EMPTY_VALUE },
    { label: 'Định Dạng File Nguồn', value: product.cadFormat || EMPTY_VALUE },
    { label: 'Loại Giấy Phép', value: product.licenseType || LICENSE_UNSET },
    { label: isVi ? 'Dung Sai Lắp Ghép' : 'Fit tolerance', value: isVi ? 'Chưa có hồ sơ đo kiểm' : 'No inspection record' },
  ];

  return (
    <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-8 px-4 sm:px-6 md:px-12 pb-24 lg:pb-12">
      <SEOHead
        title={product.name}
        description={product.description || (isVi ? `Chi tiết mô hình CAD và thông số in 3D ${product.name} tại VCUBE.` : `Specifications and 3D printing details for ${product.name} at VCUBE.`)}
        image={product.thumbnailUrl || imageList[0]}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
        type="product"
        schema={{
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.name,
          image: product.thumbnailUrl || imageList[0],
          description: product.description,
          sku: product.sku || product.id,
          brand: {
            '@type': 'Brand',
            name: 'VCUBE Vietnam'
          },
          // Chỉ khai giá khi có giá THẬT (`> 0`) — không đẩy `null`/`0` (người bán chưa mở bán
          // kênh này) vào structured data, tránh để máy tìm kiếm đọc "0₫" như một mức giá.
          ...(physicalPrice !== null && physicalPrice > 0
            ? {
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'VND',
                  price: physicalPrice,
                  availability: 'https://schema.org/InStock'
                }
              }
            : {})
        }}
      />

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Breadcrumbs & Quick Action Bar */}
        <Card padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-xs font-mono text-fg-muted overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-primary transition-colors whitespace-nowrap font-bold cursor-pointer"
            >
              VCUBE 3D
            </button>
            <span aria-hidden="true">/</span>
            <button
              onClick={() => onNavigate('explore')}
              className="hover:text-primary transition-colors whitespace-nowrap cursor-pointer"
            >
              {isVi ? 'Khám phá CAD' : 'Catalog'}
            </button>
            <span aria-hidden="true">/</span>
            <span className="text-primary font-bold uppercase truncate max-w-[120px] sm:max-w-[180px]">
              {product.category}
            </span>
            <span aria-hidden="true">/</span>
            <span className="text-fg font-bold truncate max-w-[180px] sm:max-w-xs">
              {product.name}
            </span>
          </nav>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button size="sm" variant="secondary"
              onClick={() => {
                setIsBookmarked(!isBookmarked);
                onShowToast(isBookmarked ? (isVi ? 'Đã bỏ lưu bản vẽ' : 'Removed from bookmarks') : (isVi ? 'Đã lưu bản vẽ vào mục yêu thích!' : 'Bookmarked!'));
              }}
              title="Lưu bản vẽ"
              leadingIcon={
                <Icon
                  name={isBookmarked ? 'bookmark' : 'bookmark_border'}
                  size={16}
                  fill={isBookmarked ? 'currentColor' : 'none'}
                  className={isBookmarked ? 'text-warning-strong' : 'text-fg-muted'}
                />
              }
            >
              <span className="font-mono">{isBookmarked ? (isVi ? 'Đã lưu' : 'Saved') : (isVi ? 'Lưu' : 'Save')}</span>
            </Button>

            <Button size="sm" variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                onShowToast(isVi ? 'Đã sao chép liên kết sản phẩm!' : 'Copied link to clipboard!');
              }}
              title="Chia sẻ link"
              leadingIcon={<Icon name="share" size={16} />}
            >
              <span className="font-mono">Share</span>
            </Button>
          </div>
        </Card>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: 3D Viewport / Image Gallery & Detailed Technical Tabs */}
          <div className="lg:col-span-7 space-y-6">
            {/* View Mode Switcher Header */}
            <Card padding="sm" className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-surface-muted border border-line-subtle p-0.5 rounded-md min-w-0 overflow-x-auto scrollbar-none">
                <Button size="sm" variant={viewMode === '3d' ? 'primary' : 'ghost'}
                  onClick={() => setViewMode('3d')}
                  leadingIcon={<Icon name="3d_rotation" size={16} />}
                >
                  <span>3D Interactive Canvas</span>
                </Button>
                <Button size="sm" variant={viewMode === 'image' ? 'primary' : 'ghost'}
                  onClick={() => setViewMode('image')}
                  leadingIcon={<Icon name="photo_library" size={16} />}
                >
                  <span>Gallery ({imageList.length})</span>
                </Button>
              </div>

              {viewMode === '3d' ? (
                <Button size="sm" variant={isWireframe ? 'primary' : 'secondary'}
                  className="max-md:w-full"
                  onClick={() => setIsWireframe(!isWireframe)}
                >
                  Mesh Wireframe
                </Button>
              ) : (
                <span className="text-xs font-mono text-fg-muted">
                  {imageList.length} góc chụp thực tế
                </span>
              )}
            </Card>

            {/* Viewer Display Frame */}
            {viewMode === '3d' ? (
              <Card padding="md" className="bg-surface text-fg border border-line shadow-e2 relative flex flex-col justify-between h-[420px] sm:h-[480px]">
                {/* HUD Top Bar */}
                <div className="w-full flex items-center justify-between z-sticky text-fg-muted font-mono text-xs uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5 bg-surface-muted px-2.5 py-1 rounded-md border border-line">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none"></span>
                    <span className="font-bold text-fg">WebGL 360° Inspection</span>
                  </span>
                  <span className="bg-surface-muted px-2.5 py-1 rounded-md border border-line text-primary font-bold truncate ml-2">
                    Vật liệu: {selectedMaterial || EMPTY_VALUE}
                  </span>
                </div>

                {/* 3D Model Rendering Canvas */}
                <div className="flex-1 w-full h-full relative rounded-md overflow-hidden">
                  <CanvasErrorBoundary fallbackHeight="h-full">
                    <ThreeModelViewer
                      modelType={modelGeometryType}
                      color={selectedColor?.hex}
                      wireframe={isWireframe}
                      className="h-full w-full"
                    />
                  </CanvasErrorBoundary>
                </div>

                {/* HUD Bottom Bar */}
                <div className="w-full flex items-center justify-between z-sticky text-fg-muted font-mono text-xs uppercase tracking-widest bg-surface-muted px-3 py-1.5 rounded-md border border-line mt-2">
                  <span>Xoay: Kéo chuột • Zoom: Cuộn bánh xe</span>
                  <span className="font-bold">{isVi ? 'Lưới (watertight): —' : 'Mesh (watertight): —'}</span>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="relative aspect-4/3 bg-surface-muted border border-line rounded-lg overflow-hidden flex items-center justify-center">
                  {imageList.length > 0 ? (
                    <img
                      src={imageList[selectedImageIndex]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-mono text-fg-subtle">
                      {isVi ? 'Người bán chưa tải ảnh lên' : 'Seller has not uploaded images'}
                    </span>
                  )}
                  {imageList.length > 0 && (
                    <span className="absolute bottom-3 right-3 bg-surface/90 text-fg text-xs font-mono px-2.5 py-1 rounded-md border border-line tabular-nums shadow-e1">
                      Ảnh {selectedImageIndex + 1} / {imageList.length}
                    </span>
                  )}
                </div>

                {/* Image Thumbnails Strip */}
                {imageList.length > 0 && (
                  <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none">
                    {imageList.map((img, idx) => (
                      <button
                        key={img}
                        onClick={() => setSelectedImageIndex(idx)}
                        aria-label={isVi ? `Xem ảnh ${idx + 1}` : `View image ${idx + 1}`}
                        className={`w-18 h-18 rounded-md border-2 shrink-0 transition overflow-hidden cursor-pointer ${
                          selectedImageIndex === idx
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-line-subtle opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Batch Production Co-Printing Progress Card */}
            {product.batchProgress && (
              <Card padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-positive animate-pulse motion-reduce:animate-none"></span>
                    <span className="font-mono text-xs uppercase tracking-wider font-bold text-fg">
                      Đợt Sản Xuất Gom Chung
                    </span>
                    <Badge variant="info">Co-printing VCUBE</Badge>
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    Đã đăng ký <strong className="text-fg tabular-nums">{product.batchProgress.current}/{product.batchProgress.total}</strong> đơn. Dự kiến bấm máy xuất xưởng vào ngày <strong className="text-primary">{product.batchProgress.targetDate}</strong>.
                  </p>
                </div>
                <ProgressBar
                  value={product.batchProgress.current}
                  max={product.batchProgress.total}
                  className="w-full sm:w-40 shrink-0"
                />
              </Card>
            )}

            {/* Technical Detail Tabs: Overview, Specs & Tolerances, Reviews, Slicing */}
            <Card padding="lg">
              <div
                role="tablist"
                aria-label={isVi ? 'Nội dung chi tiết sản phẩm' : 'Product detail sections'}
                className="flex border-b border-line-subtle gap-4 sm:gap-6 text-xs font-mono uppercase tracking-wider mb-6 overflow-x-auto scrollbar-none"
              >
                <button
                  type="button"
                  role="tab"
                  id="pdp-tab-desc"
                  aria-selected={activeTab === 'desc'}
                  aria-controls="pdp-panel-desc"
                  onClick={() => setActiveTab('desc')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'desc'
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-fg-muted hover:text-fg'
                  }`}
                >
                  {isVi ? 'Tổng quan & Kết cấu' : 'Overview & Features'}
                </button>
                <button
                  type="button"
                  role="tab"
                  id="pdp-tab-specs"
                  aria-selected={activeTab === 'specs'}
                  aria-controls="pdp-panel-specs"
                  onClick={() => setActiveTab('specs')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'specs'
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-fg-muted hover:text-fg'
                  }`}
                >
                  {isVi ? 'Thông số & Dung sai' : 'Specs & Tolerances'}
                </button>
                <button
                  type="button"
                  role="tab"
                  id="pdp-tab-reviews"
                  aria-selected={activeTab === 'reviews'}
                  aria-controls="pdp-panel-reviews"
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'reviews'
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-fg-muted hover:text-fg'
                  }`}
                >
                  {isVi ? `Đánh giá (${reviewsCountLabel})` : `Reviews (${reviewsCountLabel})`}
                </button>
                <button
                  type="button"
                  role="tab"
                  id="pdp-tab-slicing"
                  aria-selected={activeTab === 'slicing'}
                  aria-controls="pdp-panel-slicing"
                  onClick={() => setActiveTab('slicing')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'slicing'
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-fg-muted hover:text-fg'
                  }`}
                >
                  {isVi ? 'Profile In & Slicing' : 'Slicing Profiles'}
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'desc' && (
                <div
                  role="tabpanel"
                  id="pdp-panel-desc"
                  aria-labelledby="pdp-tab-desc"
                  className="space-y-4 text-sm text-fg-muted leading-relaxed"
                >
                  <Card padding="md" className="bg-surface-muted text-base text-fg font-medium leading-relaxed">
                    {product.description || EMPTY_VALUE}
                  </Card>
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-fg-muted block mb-3 font-bold">
                      {isVi ? 'Đặc tính kết cấu kỹ thuật:' : 'Engineering Characteristics:'}
                    </span>
                    {(product.features || []).length === 0 ? (
                      <p className="text-xs text-fg-muted">{isVi ? 'Người bán chưa khai đặc tính kết cấu.' : 'The seller has not declared engineering characteristics.'}</p>
                    ) : (
                      <ul className="space-y-2.5 text-xs text-fg">
                        {(product.features || []).map((f, i) => (
                          <Card key={i} as="li" padding="sm" className="bg-surface-muted flex items-start gap-2.5">
                            <span className="font-mono text-xs text-fg-muted font-bold tabular-nums">0{i + 1}.</span>
                            <span className="leading-snug">{f}</span>
                          </Card>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Technical Specs — `KeyValue` (nhãn/giá trị ngữ nghĩa <dl>) */}
              {activeTab === 'specs' && (
                <div role="tabpanel" id="pdp-panel-specs" aria-labelledby="pdp-tab-specs" className="space-y-3">
                  <KeyValue items={specItems} columns={2} variant="panel" labelWidth="8.5rem" />
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Icon name="info" size={16} className="shrink-0" />
                    <span>
                      {isVi
                        ? 'Ô nào người bán chưa khai thì hiện dấu gạch, hệ thống không tự đoán.'
                        : 'Fields the seller has not declared show a dash — nothing is guessed.'}
                    </span>
                  </p>
                </div>
              )}

              {/* Tab 3: Reviews */}
              {activeTab === 'reviews' && (
                <div role="tabpanel" id="pdp-panel-reviews" aria-labelledby="pdp-tab-reviews" className="space-y-4">
                  {showRating ? (
                    <Card padding="md" className="bg-surface-muted flex items-center gap-5">
                      <div className="text-center pr-5 border-r border-line-subtle">
                        <span className="font-mono text-3xl font-bold text-fg tabular-nums">
                          {ratingValue}
                        </span>
                        <div className="flex items-center justify-center gap-0.5 mt-1" role="img" aria-label={`${ratingValue}/5`}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={16}
                              aria-hidden="true"
                              className={i <= Math.round(ratingValue as number) ? 'text-warning-strong' : 'text-line-control'}
                              fill={i <= Math.round(ratingValue as number) ? 'currentColor' : 'none'}
                            />
                          ))}
                        </div>
                        <span className="text-xs uppercase text-fg-muted font-mono block mt-1 tabular-nums">
                          {reviewsCountLabel} {isVi ? 'đánh giá' : 'reviews'}
                        </span>
                      </div>
                    </Card>
                  ) : (
                    <Card padding="none">
                      <EmptyState
                        size="sm"
                        icon={<Icon name="chat" size={20} />}
                        title={isVi ? 'Chưa có đánh giá' : 'No reviews yet'}
                        description={isVi ? 'Bản vẽ này chưa có đánh giá nào từ đơn hàng thật.' : 'This design has no reviews from real orders yet.'}
                        action={
                          <InfoTip label={isVi ? 'Vì sao chưa có đánh giá?' : 'Why no reviews yet?'}>
                            {isVi
                              ? 'VCUBE chỉ hiển thị đánh giá đến từ đơn hàng thật, nên bản vẽ chưa phát sinh đơn sẽ không có điểm.'
                              : 'VCUBE only shows reviews that come from real orders, so a design without orders has no score.'}
                          </InfoTip>
                        }
                      />
                    </Card>
                  )}
                </div>
              )}

              {/* Tab 4: Slicing Profiles — chỉ in thông số đã khai ở cấp SẢN PHẨM.
                  KHÔNG hardcode profile máy (Bambu X1C 215–230°C…) và KHÔNG gắn nhãn
                  "In được" cho mọi sản phẩm: đó là khẳng định không có nguồn. */}
              {activeTab === 'slicing' && (
                <div role="tabpanel" id="pdp-panel-slicing" aria-labelledby="pdp-tab-slicing" className="space-y-3 text-xs font-mono">
                  <div className="p-3.5 bg-canvas border border-line rounded-md text-fg-muted">
                    {isVi
                      ? 'Thông số cắt lớp ở cấp sản phẩm. Nhiệt độ đùn/bàn in phụ thuộc vật liệu & máy cụ thể — xưởng xác nhận khi báo giá.'
                      : 'Product-level slicing parameters. Extruder/bed temperatures depend on the specific material and machine — the workshop confirms them in the quote.'}
                  </div>
                  <Card padding="sm" className="bg-surface-muted font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-fg-muted">{isVi ? 'Độ phân giải lớp:' : 'Layer resolution:'}</span>
                      <span className="font-bold text-fg">{product.specs?.resolution || EMPTY_VALUE}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">{isVi ? 'Infill mặc định:' : 'Default infill:'}</span>
                      <span className="font-bold text-fg">{product.specs?.infillDefault || EMPTY_VALUE}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">{isVi ? 'Công nghệ gia công:' : 'Technology:'}</span>
                      <span className="font-bold text-fg">{product.specs?.technology || EMPTY_VALUE}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">{isVi ? 'Kích thước phủ bì:' : 'Overall size:'}</span>
                      <span className="font-bold text-fg">{product.specs?.dimensions || EMPTY_VALUE}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">{isVi ? 'Nhiệt độ đùn / bàn in:' : 'Extruder / bed temp:'}</span>
                      <span className="font-bold text-fg-subtle">{EMPTY_VALUE}</span>
                    </div>
                  </Card>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Dual Persona Buying Box & Smart Configurator */}
          <div className="lg:col-span-5 space-y-6">
            <Card padding="lg" className="space-y-6 shadow-e1 lg:sticky lg:top-24">
              {/* Product Header */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2 font-mono gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-primary font-bold uppercase truncate">
                      {product.designer || EMPTY_VALUE}
                    </span>
                    <Badge variant="neutral">{product.cadFormat || EMPTY_VALUE}</Badge>
                  </div>
                  {/* T3: `rating` NULL hoặc `reviewsCount = 0` ⇒ KHÔNG hiện sao. */}
                  {showRating ? (
                    <span className="text-xs text-fg font-bold flex items-center gap-1 shrink-0 tabular-nums">
                      <Star size={14} className="text-warning-strong" fill="currentColor" aria-hidden="true" />
                      {ratingValue} ({reviewsCountLabel})
                    </span>
                  ) : (
                    <span className="text-xs text-fg-muted shrink-0">
                      {isVi ? 'Chưa có đánh giá' : 'No reviews yet'}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-fg leading-snug">
                  {product.name}
                </h1>
                <span className="text-xs font-mono text-fg-muted block mt-1">
                  SKU: {product.sku || EMPTY_VALUE}
                </span>
              </div>

              {/* DUAL PERSONA: DIGITAL CAD ASSET CARD */}
              <div className="p-4 rounded-md border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon name="folder_zip" size={16} className="text-primary shrink-0" />
                    <span className="font-mono text-xs uppercase font-bold text-primary">
                      Bản Quyền Tải File CAD Gốc
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold text-primary tabular-nums shrink-0">
                    {vnd(digitalPrice, locale)}
                  </span>
                </div>

                {/* R4: bo hai khang dinh khong co nguon — "da kiem tra ket cau luoi (watertight)"
                    va "kem Commercial License". Chi neu dinh dang tep va loai giay phep CO THAT;
                    chua khai ⇒ `— (người bán chưa khai báo)`. */}
                <p className="text-xs text-fg-muted leading-relaxed">
                  Tệp CAD gốc của sản phẩm{product.cadFormat ? ` (${product.cadFormat})` : ''}. Loại giấy phép:{' '}
                  <strong className="text-fg">{product.licenseType || LICENSE_UNSET}</strong>
                </p>

                <Button size="md" fullWidth
                  onClick={handleAddDigital}
                  disabled={digitalPrice === null}
                  leadingIcon={<Icon name="download" size={16} />}
                >
                  <span>{isVi ? 'Mua & Tải File CAD Ngay' : 'Buy CAD License'}</span>
                </Button>
                {digitalPrice === null && (
                  <p className="text-xs text-danger">
                    {isVi
                      ? 'Người bán không mở bán kênh file số cho sản phẩm này (price_digital không lớn hơn 0) nên chưa thể mua.'
                      : 'The seller does not sell this product as a CAD file (price_digital is not greater than 0), so it cannot be purchased yet.'}
                  </p>
                )}
              </div>

              {/* DUAL PERSONA: PHYSICAL 3D PRINT CONFIGURATOR */}
              <div className="pt-2 border-t border-line-subtle space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <Icon name="precision_manufacturing" size={16} className="text-fg" />
                    <span className="font-mono text-xs uppercase font-bold text-fg">
                      Cấu Hình Đặt In 3D Hoàn Thiện
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-extrabold text-fg block tabular-nums">
                      {vnd(orderTotal, locale)}
                    </span>
                    {volumeDiscountPercent > 0 && (
                      <span className="text-xs font-mono text-positive font-bold block">
                        Đã giảm {volumeDiscountPercent}% ({applicableDiscountTier?.label})
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Material Selector */}
                <div>
                  <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-2 flex items-center justify-between">
                    <span>1. Vật liệu chế tạo:</span>
                    <span className="text-primary font-bold text-xs">
                      {selectedMaterialObj?.strength || EMPTY_VALUE}
                    </span>
                  </label>
                  {declaredMaterials.length === 0 ? (
                    <p className="text-xs text-danger">
                      {isVi
                        ? 'Người bán chưa khai vật liệu hỗ trợ nên chưa thể đặt in — hệ thống không tự gán một vật liệu thay thế.'
                        : 'The seller has not declared supported materials, so this print cannot be ordered — no substitute material is assigned automatically.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {declaredMaterials.map((mat) => {
                        const isSelected = selectedMaterial === mat;
                        return (
                          <Button
                            key={mat}
                            size="sm"
                            fullWidth
                            variant={isSelected ? 'primary' : 'secondary'}
                            onClick={() => setSelectedMaterial(mat)}
                            className="font-mono"
                          >
                            <span className="truncate">{mat}</span>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Khuyến nghị kỹ thuật cho vật liệu cao cấp (R3) */}
                <MaterialTechnicalAdvisory
                  materialName={selectedMaterial}
                  isVi={isVi}
                />

                {/* Data-honesty: không cộng chênh lệch vật liệu, và cũng KHÔNG bịa hệ số nào — nói rõ. */}
                <p className="text-xs text-fg-muted mt-2 leading-relaxed">
                  {isVi
                    ? 'Đơn giá in theo giá niêm yết của sản phẩm — chưa gồm chênh lệch vật liệu (xưởng xác nhận khi báo giá).'
                    : 'The print price is the product list price — material price differences are not included (the workshop confirms them in the quote).'}
                </p>

                {/* 2. Color Swatches Picker — `rounded-full` GIỮ (đúng hình dạng ô màu tròn) */}
                <div>
                  <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-2">
                    2. Sắc thái hoàn thiện:{' '}
                    <span className="text-fg font-bold">{selectedColor?.name || EMPTY_VALUE}</span>
                  </label>
                  {colorOptions.length === 0 ? (
                    <p className="text-xs text-fg-muted">
                      {isVi ? 'Người bán chưa khai báo màu sắc.' : 'The seller has not declared colours.'}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {colorOptions.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => c.available && setSelectedColorName(c.name)}
                          disabled={!c.available}
                          aria-label={c.available ? c.name : `${c.name} (Hết hàng)`}
                          className={`relative w-8 h-8 rounded-full border-2 transition touch-target-btn cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selectedColor?.name === c.name
                              ? 'border-primary scale-110 ring-2 ring-primary/30'
                              : 'border-line-subtle hover:scale-105'
                          } ${!c.available ? 'opacity-40 cursor-not-allowed' : ''}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.available ? c.name : `${c.name} (Hết hàng)`}
                        >
                          {selectedColor?.name === c.name && (
                            <Icon name="check" size={16} className="text-primary-fg absolute inset-0 m-auto font-bold" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Layer Resolution */}
                <div>
                  <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-1.5">
                    3. Độ phân giải lớp in (Layer Height)
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-canvas border border-line-control rounded-md p-2.5 text-sm text-fg font-mono focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="0.12 mm (Chính xác vi mô)">0.12 mm — Bề mặt siêu mịn / Dung sai ngặt</option>
                    <option value="0.16 mm (Tiêu chuẩn kỹ thuật)">0.16 mm — Tiêu chuẩn kỹ thuật (Khuyên dùng)</option>
                    <option value="0.20 mm (In nhanh tiêu chuẩn)">0.20 mm — In nhanh tiết kiệm</option>
                  </select>
                </div>

                {/* 4. Custom Laser Engraving — phí khắc CHỈ hiện khi cấu hình có thật */}
                {product.isCustomizable && (
                  <div>
                    <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-1.5 flex items-center justify-between gap-2">
                      <span>4. Khắc laser tên dự án / số hiệu:</span>
                      <span className={`text-xs font-bold tabular-nums ${engravingFee !== null && engravingFee > 0 ? 'text-primary' : 'text-fg-muted'}`}>
                        {engravingFee !== null && engravingFee > 0 ? `+${vnd(engravingFee, locale)}` : EMPTY_VALUE}
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={25}
                      placeholder="VD: VCUBE-LAB-01..."
                      value={customEngraving}
                      onChange={(e) => setCustomEngraving(e.target.value)}
                      className="w-full bg-canvas border border-line-control rounded-md px-3 py-2 text-sm text-fg font-mono focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {engravingBlocked && (
                      <p className="flex items-start gap-1.5 text-xs text-danger mt-1.5">
                        <Icon name="error" size={16} className="shrink-0 mt-0.5" />
                        <span>
                          {isVi
                            ? 'Chưa cấu hình phí khắc laser (customEngravingFee) nên chưa thể đặt khắc. Quản trị viên nhập ở /admin, mục Cấu hình giá.'
                            : 'The laser engraving fee (customEngravingFee) is not configured, so engraving cannot be ordered yet. An admin can set it in /admin, Pricing configuration.'}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* 5. Quantity Counter & Volume Discount */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase font-bold text-fg-muted">Số lượng:</span>
                    <div className="flex items-center border border-line-control rounded-md bg-surface overflow-hidden">
                      <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Giảm số lượng' : 'Decrease quantity'}
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        leadingIcon={<Minus size={16} aria-hidden="true" />}
                      />
                      <span className="px-4 py-1.5 font-mono text-xs font-bold text-fg border-x border-line-subtle tabular-nums">
                        {quantity}
                      </span>
                      <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Tăng số lượng' : 'Increase quantity'}
                        onClick={() => setQuantity(quantity + 1)}
                        leadingIcon={<Icon name="add" size={16} />}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Physical Order Action */}
                <Button size="lg" fullWidth className="font-mono"
                  onClick={handleAddPhysical}
                  disabled={isAdding || purchaseBlocked}
                  leadingIcon={<Icon name="shopping_bag" size={16} />}
                >
                  <span>{isAdding ? 'ĐANG XỬ LÝ...' : (isVi ? 'ĐẶT GIA CÔNG IN 3D' : 'ORDER 3D PRINT')} ({vnd(orderTotal, locale)})</span>
                </Button>

                {physicalPrice === null && (
                  <p className="text-xs text-danger">
                    {isVi
                      ? 'Người bán không mở bán kênh in vật lý cho sản phẩm này (price_physical không lớn hơn 0) nên chưa thể đặt in.'
                      : 'The seller does not sell this product as a physical print (price_physical is not greater than 0), so it cannot be ordered yet.'}
                  </p>
                )}

                {materialBlocked && physicalPrice !== null && (
                  <p className="text-xs text-danger">
                    {isVi
                      ? 'Chưa chọn được vật liệu vì người bán chưa khai vật liệu hỗ trợ nên chưa thể đặt in.'
                      : 'No material can be selected because the seller has not declared supported materials, so the print cannot be ordered.'}
                  </p>
                )}

                {/* 3D Personalization & Laser Engraving Action */}
                <Button size="lg" fullWidth variant="secondary" className="font-mono"
                  onClick={() => onNavigate('personalize', { product })}
                  leadingIcon={<Icon name="draw" size={16} className="text-primary" />}
                >
                  <span>TÙY BIẾN 3D & KHẮC LASER RIÊNG</span>
                </Button>
              </div>

              {/* Guarantees Badges */}
              <div className="pt-4 border-t border-line-subtle grid grid-cols-2 gap-3 text-xs font-mono text-fg-muted">
                <div className="flex items-center gap-1.5">
                  <Icon name="verified" size={16} className="text-primary" />
                  <span>{isVi ? 'Dung sai theo thoả thuận' : 'Tolerance as agreed'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="local_shipping" size={16} className="text-primary" />
                  <span>{isVi ? 'Giao toàn quốc' : 'Nationwide delivery'}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Compatible & Related CAD Models Section */}
        {relatedProducts.length > 0 && (
          <div className="pt-8 border-t border-line-subtle space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-lg text-fg">
                  {isVi ? 'Linh Kiện Thường Được In Cùng' : 'Frequently Co-Printed Parts'}
                </h3>
                <p className="text-xs text-fg-muted font-mono">
                  {isVi ? 'Các module cơ khí và phụ kiện cùng hệ sinh thái thiết kế' : 'Compatible mechanical modules & accessories'}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary shrink-0"
                onClick={() => onNavigate('explore')}
                trailingIcon={<Icon name="arrow_forward" size={16} />}
              >
                <span>{isVi ? 'Xem tất cả' : 'View all'}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedProducts.map((rel) => (
                <Card
                  key={rel.id}
                  as="button"
                  interactive
                  padding="md"
                  className="flex items-center gap-4 text-left w-full"
                  onClick={() => onNavigate('product_detail', { product: rel })}
                >
                  <img
                    src={rel.thumbnailUrl || rel.images?.[0]}
                    alt={rel.name}
                    className="w-16 h-16 object-cover rounded-md border border-line-subtle shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-primary font-bold uppercase block truncate">
                      {rel.category}
                    </span>
                    <h4 className="font-bold text-xs text-fg truncate">
                      {rel.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-xs font-mono">
                      <span className="text-fg-muted tabular-nums">
                        CAD: {vnd(rel.priceDigital, locale)}
                      </span>
                      <span className="font-bold text-fg tabular-nums">
                        {vnd(rel.pricePhysical, locale)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Order Bar (< lg screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-sticky bg-surface backdrop-blur-md border-t border-line-subtle p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] shadow-e3 flex items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-mono text-fg-muted block">
            {isVi ? 'Đơn giá in 3D' : 'Print Price'}
          </span>
          <span className="text-base font-mono font-bold text-fg tabular-nums">
            {vnd(orderTotal, locale)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary"
            onClick={handleAddDigital}
            disabled={digitalPrice === null}
            title={isVi ? 'Tải File CAD' : 'Download CAD file'}
            leadingIcon={<Icon name="download" size={16} />}
          >
            <span>CAD</span>
          </Button>
          <Button size="sm"
            onClick={handleAddPhysical}
            disabled={isAdding || purchaseBlocked}
            leadingIcon={<Icon name="precision_manufacturing" size={16} />}
          >
            <span>{isAdding ? '...' : (isVi ? 'Đặt In 3D' : 'Order Print')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
