import React, { useState } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../../types';
import { MATERIALS_CATALOG } from '../../data/mockData';
import { ThreeModelViewer } from '../components/LazyThreeModelViewer';
import { CanvasErrorBoundary } from '../components/CanvasErrorBoundary';
import { MaterialTechnicalAdvisory } from '../components/material/MaterialTechnicalAdvisory';
import { SEOHead } from '../components/SEOHead';
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
 * Ký hiệu tiền: `₫` (D-B của Lead, thống nhất với `formatCurrency`/`Money`).
 */
const vnd = (v: unknown, locale: string): string =>
  isNum(v) && v > 0 ? `${formatNumber(v, { locale, maximumFractionDigits: 0 })} ₫` : EMPTY_VALUE;

/** Nhãn giấy phép trung thực khi người bán chưa khai (T3). */
const LICENSE_UNSET = '— (người bán chưa khai báo)';

/** Bước cấu hình có số thứ tự — dùng chấm tròn `primary-tint` để quét nhanh thứ tự. */
const StepNumber: React.FC<{ n: number }> = ({ n }) => (
  <span
    aria-hidden="true"
    className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-tint font-mono text-xs font-bold text-primary"
  >
    {n}
  </span>
);

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  allProducts = [],
  materials = MATERIALS_CATALOG,
  pricingConfig,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const locale = 'vi-VN';

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
      onShowToast(`Đã thêm ${quantity}x "${product.name}" vào đơn hàng!`);
    }, 200);
  };

  const handleAddDigital = () => {
    if (digitalPrice === null) {
      onShowToast(`Bản vẽ "${product.name}" không mở bán kênh tệp số (giá tệp số không lớn hơn 0) nên chưa thể mua.`);
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
    onShowToast(`Đã thêm tệp 3D "${product.name}" vào giỏ hàng!`);
  };

  const modelGeometryType = product.id.includes('gear')
    ? 'gear'
    : product.id.includes('drone')
    ? 'drone'
    : product.id.includes('vase')
    ? 'vase'
    : 'box';

  const specItems = [
    { label: 'Kích Thước Phủ Bì', value: product.specs?.dimensions || EMPTY_VALUE, numeric: true },
    { label: 'Khối Lượng Nhựa In', value: product.specs?.weight || EMPTY_VALUE, numeric: true },
    { label: 'Độ Phân Giải Lớp In', value: product.specs?.resolution || EMPTY_VALUE, numeric: true },
    { label: 'Công Nghệ Gia Công', value: product.specs?.technology || EMPTY_VALUE },
    { label: 'Thời Gian In Dự Kiến', value: product.printTime || EMPTY_VALUE, numeric: true },
    { label: 'Định Dạng Tệp Nguồn', value: product.cadFormat || EMPTY_VALUE },
    { label: 'Loại Giấy Phép', value: product.licenseType || LICENSE_UNSET },
    { label: 'Dung Sai Lắp Ghép', value: 'Chưa có hồ sơ đo kiểm' },
  ];

  const tabButtonClass = (active: boolean) =>
    /* A11Y-05: pill 31px cao ở 390 ⇒ `max-md:min-h-11` (desktop giữ nguyên). */
    `shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 max-md:min-h-11 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active ? 'bg-surface font-semibold text-fg shadow-soft' : 'text-fg-muted hover:text-fg'
    }`;

  const hasGalleryImages = imageList.length > 0;

  return (
    <div className="min-h-dvh bg-canvas pb-28 text-fg lg:pb-12">
      <SEOHead
        title={product.name}
        description={product.description || (`Chi tiết mô hình CAD và thông số in 3D ${product.name} tại VCUBE.`)}
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

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Breadcrumbs & quick actions — tách khỏi card để giảm "card soup" */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav
              aria-label="Đường dẫn sản phẩm"
              className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs text-fg-muted scrollbar-none"
            >
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="cursor-pointer whitespace-nowrap rounded-sm px-1 font-bold text-fg transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                VCUBE
              </button>
              <span aria-hidden="true" className="text-fg-subtle">/</span>
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="cursor-pointer whitespace-nowrap rounded-sm px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Khám phá CAD
              </button>
              <span aria-hidden="true" className="text-fg-subtle">/</span>
              <span className="max-w-[120px] truncate text-primary sm:max-w-[180px]">
                {product.category}
              </span>
              <span aria-hidden="true" className="text-fg-subtle">/</span>
              <span className="max-w-[180px] truncate font-bold text-fg sm:max-w-xs">
                {product.name}
              </span>
            </nav>

            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsBookmarked(!isBookmarked);
                  onShowToast(isBookmarked ? ('Đã bỏ lưu bản vẽ') : ('Đã lưu bản vẽ vào mục yêu thích!'));
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
                <span className="font-mono">{isBookmarked ? ('Đã lưu') : ('Lưu')}</span>
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  onShowToast('Đã sao chép liên kết sản phẩm!');
                }}
                title="Chia sẻ liên kết sản phẩm"
                leadingIcon={<Icon name="share" size={16} />}
              >
                <span className="font-mono">Chia sẻ</span>
              </Button>
            </div>
          </div>

          {/* Product headline — tiêu đề/hạng đánh giá nằm trên cùng mọi viewport */}
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                {product.designer || EMPTY_VALUE}
              </span>
              <Badge variant="neutral">{product.cadFormat || EMPTY_VALUE}</Badge>
              {/* T3: `rating` NULL hoặc `reviewsCount = 0` ⇒ KHÔNG hiện sao. */}
              {showRating ? (
                <span className="flex items-center gap-1 font-mono text-xs font-bold text-fg tabular-nums">
                  <Icon name="star" size={14} className="text-warning-strong" fill="currentColor" aria-hidden="true" />
                  {ratingValue} ({reviewsCountLabel} đánh giá)
                </span>
              ) : (
                <span className="font-mono text-xs text-fg-muted">
                  Chưa có đánh giá
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-snug tracking-tight text-fg sm:text-3xl">
              {product.name}
            </h1>
            <p className="font-mono text-xs text-fg-muted">
              SKU: {product.sku || EMPTY_VALUE}
            </p>
          </header>

          {/* Template Detail §4.3: 7/5 — trái 3D/thư viện, phải báo giá sticky */}
          <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
            {/* LEFT 7 — 3D viewport / gallery (hàng 1) */}
            <div className="space-y-6 lg:col-span-7 lg:col-start-1 lg:row-start-1">
              <Card variant="soft" padding="none" className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
                  <div
                    role="group"
                    aria-label="Chế độ xem sản phẩm"
                    className="inline-flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface-muted p-1 scrollbar-none"
                  >
                    <button
                      type="button"
                      aria-pressed={viewMode === '3d'}
                      onClick={() => setViewMode('3d')}
                      className={tabButtonClass(viewMode === '3d')}
                    >
                      <Icon name="3d_rotation" size={16} className="mr-1.5 inline align-[-3px]" aria-hidden="true" />
                      Khung 3D
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewMode === 'image'}
                      onClick={() => setViewMode('image')}
                      className={tabButtonClass(viewMode === 'image')}
                    >
                      <Icon name="photo_library" size={16} className="mr-1.5 inline align-[-3px]" aria-hidden="true" />
                      Thư viện ảnh ({imageList.length})
                    </button>
                  </div>

                  {viewMode === '3d' ? (
                    <Button
                      size="sm"
                      variant={isWireframe ? 'primary' : 'secondary'}
                      onClick={() => setIsWireframe(!isWireframe)}
                      aria-pressed={isWireframe}
                    >
                      Lưới khung
                    </Button>
                  ) : (
                    <span className="font-mono text-xs text-fg-muted">
                      {imageList.length} góc chụp thực tế
                    </span>
                  )}
                </div>

                {viewMode === '3d' ? (
                  <>
                    {/* Viewport tối graphite (D7) — chỉ soften khung/HUD, không đổi scene/ánh sáng */}
                    <div className="relative mx-3 mb-3 overflow-hidden rounded-md bg-surface-inverse sm:mx-4 sm:mb-4">
                      <div className="h-[380px] sm:h-[440px] lg:h-[480px]">
                        <CanvasErrorBoundary fallbackHeight="h-full">
                          <ThreeModelViewer
                            modelType={modelGeometryType}
                            color={selectedColor?.hex}
                            wireframe={isWireframe}
                            className="h-full w-full rounded-none border-0"
                          />
                        </CanvasErrorBoundary>
                      </div>

                      {/* HUD chip §3.8 — MỘT chip góc trái; không đè toolbar CAD của viewer
                          (toolbar nằm góc phải trong component ThreeModelViewer). */}
                      <span className="pointer-events-none absolute left-3 top-3 z-panel inline-flex max-w-[55%] items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1 font-mono text-xs shadow-soft backdrop-blur-sm">
                        <span className="size-2 shrink-0 rounded-full bg-primary animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                        <span className="truncate font-bold text-fg">WebGL 360°</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line-subtle px-3 py-2.5 font-mono text-xs text-fg-muted sm:px-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="touch_app" size={16} className="shrink-0 text-fg-subtle" aria-hidden="true" />
                        Kéo để xoay · Cuộn để phóng to
                      </span>
                      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          Vật liệu: <strong className="font-bold text-fg">{selectedMaterial || EMPTY_VALUE}</strong>
                        </span>
                        <span className="font-bold">Lưới (kín nước): {EMPTY_VALUE}</span>
                      </span>
                    </div>
                    <p className="border-t border-line-subtle px-3 py-2 text-xs leading-relaxed text-fg-muted sm:px-4">
                      Mô hình 3D minh hoạ theo danh mục — không phải tệp CAD gốc của sản phẩm. Số đo thật nằm ở tab
                      “Thông số &amp; Dung sai”.
                    </p>
                  </>
                ) : (
                  <div className="space-y-3 px-3 pb-4 sm:px-4">
                    <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-md bg-surface-muted">
                      {hasGalleryImages ? (
                        <img
                          src={imageList[selectedImageIndex]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-6 text-center">
                          <Icon name="photo_library" size={28} className="text-fg-subtle" aria-hidden="true" />
                          <span className="font-mono text-xs text-fg-muted">
                            Người bán chưa tải ảnh lên
                          </span>
                        </div>
                      )}
                      {hasGalleryImages && (
                        <span className="absolute bottom-3 right-3 rounded-full border border-line bg-surface/90 px-3 py-1 font-mono text-xs text-fg-muted tabular-nums backdrop-blur-sm">
                          Ảnh {selectedImageIndex + 1} / {imageList.length}
                        </span>
                      )}
                    </div>

                    {hasGalleryImages && (
                      <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none">
                        {imageList.map((img, idx) => (
                          <button
                            key={img}
                            type="button"
                            onClick={() => setSelectedImageIndex(idx)}
                            aria-label={`Xem ảnh ${idx + 1}`}
                            aria-pressed={selectedImageIndex === idx}
                            className={`h-18 w-18 shrink-0 cursor-pointer overflow-hidden rounded-md border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              selectedImageIndex === idx
                                ? 'border-primary ring-2 ring-primary'
                                : 'border-line opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Batch Production Co-Printing Progress Card */}
              {product.batchProgress && (
                <Card variant="soft" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="size-2 rounded-full bg-positive animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-fg">
                        Đợt sản xuất gom chung
                      </span>
                      <Badge variant="info">In gom VCUBE</Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-fg-muted">
                      Đã đăng ký <strong className="tabular-nums text-fg">{product.batchProgress.current}/{product.batchProgress.total}</strong> đơn. Dự kiến bấm máy xuất xưởng vào ngày <strong className="text-fg">{product.batchProgress.targetDate}</strong>.
                    </p>
                  </div>
                  <ProgressBar
                    value={product.batchProgress.current}
                    max={product.batchProgress.total}
                    className="w-full shrink-0 sm:w-40"
                  />
                </Card>
              )}
            </div>

            {/* RIGHT 5 — báo giá sticky + cấu hình (span 2 hàng để sticky chạy hết cột) */}
            <div className="space-y-5 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
              <div className="z-sticky lg:sticky lg:top-24">
                <Card variant="soft" padding="lg" className="space-y-5">
                  {/* Tổng tiền — phân cấp lớn nhất trong card */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-fg-muted">
                        Tổng đặt in · {quantity} cái
                      </span>
                      {volumeDiscountPercent > 0 && (
                        <Badge variant="success" size="sm">Giảm {volumeDiscountPercent}%</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-3xl font-bold tabular-nums text-fg">
                        {vnd(orderTotal, locale)}
                      </span>
                      <span className="font-mono text-xs text-fg-muted tabular-nums">
                        Đơn giá {vnd(dynamicPricePhysical, locale)} / cái
                      </span>
                    </div>
                    {volumeDiscountPercent > 0 && applicableDiscountTier?.label && (
                      <p className="font-mono text-xs font-bold text-positive">
                        {applicableDiscountTier.label}
                      </p>
                    )}
                  </div>

                  {/* Số lượng — dùng chung cho cả đặt in và kênh tệp CAD */}
                  <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-4">
                    <span className="text-sm font-medium text-fg">Số lượng đặt in</span>
                    <div className="flex items-center overflow-hidden rounded-md border border-line-control bg-surface">
                      <Button
                        iconOnly
                        size="sm"
                        variant="ghost"
                        aria-label="Giảm số lượng"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        leadingIcon={<Icon name="remove" size={16} aria-hidden="true" />}
                      />
                      <span className="min-w-10 border-x border-line-subtle px-3 text-center font-mono text-sm font-bold tabular-nums text-fg">
                        {quantity}
                      </span>
                      <Button
                        iconOnly
                        size="sm"
                        variant="ghost"
                        aria-label="Tăng số lượng"
                        onClick={() => setQuantity(quantity + 1)}
                        leadingIcon={<Icon name="add" size={16} />}
                      />
                    </div>
                  </div>

                  {/* CTA mua — CHỈ desktop. Dưới lg, thanh đặt hàng cố định thay thế
                      để mỗi viewport chỉ có một CTA chính (UI-008). */}
                  <div className="hidden space-y-2.5 lg:block">
                    <Button
                      size="lg"
                      fullWidth
                      onClick={handleAddPhysical}
                      disabled={isAdding || purchaseBlocked}
                      leadingIcon={<Icon name="shopping_bag" size={16} />}
                    >
                      <span>{isAdding ? 'Đang xử lý…' : 'Đặt in 3D'}</span>
                      <span className="font-mono tabular-nums">— {vnd(orderTotal, locale)}</span>
                    </Button>

                    <Button
                      size="md"
                      variant="secondary"
                      fullWidth
                      onClick={handleAddDigital}
                      disabled={digitalPrice === null}
                      leadingIcon={<Icon name="download" size={16} />}
                    >
                      <span>Mua tệp CAD</span>
                      {digitalPrice !== null && (
                        <span className="font-mono tabular-nums text-fg-muted">— {vnd(digitalPrice, locale)}</span>
                      )}
                    </Button>
                  </div>

                  {/* Lý do kênh bị khoá — luôn hiển thị (kể cả mobile, nơi CTA nằm ở thanh dưới) */}
                  {digitalPrice === null && (
                    <p className="text-xs leading-relaxed text-danger">
                      Người bán không mở bán kênh tệp số cho sản phẩm này (price_digital không lớn hơn 0) nên chưa thể mua.
                    </p>
                  )}
                  {physicalPrice === null && (
                    <p className="text-xs leading-relaxed text-danger">
                      Người bán không mở bán kênh in vật lý cho sản phẩm này (price_physical không lớn hơn 0) nên chưa thể đặt in.
                    </p>
                  )}
                  {materialBlocked && physicalPrice !== null && (
                    <p className="text-xs leading-relaxed text-danger">
                      Chưa chọn được vật liệu vì người bán chưa khai vật liệu hỗ trợ nên chưa thể đặt in.
                    </p>
                  )}

                  <p className="text-xs leading-relaxed text-fg-muted">
                    Đơn giá in theo giá niêm yết của sản phẩm — chưa gồm chênh lệch vật liệu (xưởng xác nhận khi báo giá).
                  </p>

                  <Button
                    size="md"
                    variant="ghost"
                    fullWidth
                    onClick={() => onNavigate('personalize', { product })}
                    leadingIcon={<Icon name="draw" size={16} className="text-primary" />}
                  >
                    Tuỳ biến 3D & khắc laser
                  </Button>

                  {/* Guarantees Badges — mức cam kết hiện có, không phải số đo bịa */}
                  <div className="grid grid-cols-2 gap-2 border-t border-line-subtle pt-4 font-mono text-xs text-fg-muted">
                    <div className="flex items-center gap-1.5">
                      <Icon name="verified" size={16} className="shrink-0 text-primary" />
                      <span>Dung sai theo thoả thuận</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon name="local_shipping" size={16} className="shrink-0 text-primary" />
                      <span>Giao toàn quốc</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Card cấu hình — nội dung dài, không sticky */}
              <Card variant="soft" padding="lg" className="space-y-6">
                {/* Kênh tệp CAD gốc: chỉ NÊU thông tin thật, CTA mua ở khung báo giá phía trên */}
                <section className="space-y-2.5" aria-labelledby="pdp-cad-license">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="pdp-cad-license" className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Icon name="folder_zip" size={16} className="shrink-0 text-primary" />
                      Tệp CAD gốc & giấy phép
                    </h2>
                    <span className="font-mono text-sm font-bold tabular-nums text-fg">
                      {vnd(digitalPrice, locale)}
                    </span>
                  </div>
                  {/* R4: bo hai khang dinh khong co nguon — "da kiem tra ket cau luoi (watertight)"
                      va "kem Commercial License". Chi neu dinh dang tep va loai giay phep CO THAT;
                      chua khai ⇒ `— (người bán chưa khai báo)`. */}
                  <p className="text-xs leading-relaxed text-fg-muted">
                    Tệp CAD gốc của sản phẩm{product.cadFormat ? ` (${product.cadFormat})` : ''}. Loại giấy phép:{' '}
                    <strong className="text-fg">{product.licenseType || LICENSE_UNSET}</strong>
                  </p>
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-3 font-mono text-xs">
                    <div>
                      <span className="block text-fg-muted">Định dạng</span>
                      <span className="font-bold text-fg">{product.cadFormat || EMPTY_VALUE}</span>
                    </div>
                    <div>
                      <span className="block text-fg-muted">Giấy phép</span>
                      <span className="font-bold text-fg">{product.licenseType || EMPTY_VALUE}</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-5 border-t border-line-subtle pt-5" aria-labelledby="pdp-config">
                  <h2 id="pdp-config" className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <Icon name="precision_manufacturing" size={16} className="shrink-0 text-primary" />
                    Cấu hình đặt in 3D
                  </h2>

                  {/* 1. Material Selector */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StepNumber n={1} />
                        <span className="text-sm font-medium text-fg">Vật liệu chế tạo</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-primary">
                        {selectedMaterialObj?.strength || EMPTY_VALUE}
                      </span>
                    </div>
                    {declaredMaterials.length === 0 ? (
                      <p className="text-xs leading-relaxed text-danger">
                        Người bán chưa khai vật liệu hỗ trợ nên chưa thể đặt in — hệ thống không tự gán một vật liệu thay thế.
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
                              aria-pressed={isSelected}
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
                  />

                  {/* 2. Color Swatches Picker — `rounded-full` GIỮ (đúng hình dạng ô màu tròn) */}
                  <div className="space-y-2.5 border-t border-line-subtle pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StepNumber n={2} />
                        <span className="text-sm font-medium text-fg">Sắc thái hoàn thiện</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-fg">
                        {selectedColor?.name || EMPTY_VALUE}
                      </span>
                    </div>
                    {colorOptions.length === 0 ? (
                      <p className="text-xs text-fg-muted">
                        Người bán chưa khai báo màu sắc.
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        {colorOptions.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => c.available && setSelectedColorName(c.name)}
                            disabled={!c.available}
                            aria-label={c.available ? c.name : `${c.name} (Hết hàng)`}
                            aria-pressed={selectedColor?.name === c.name}
                            className={`relative size-8 cursor-pointer rounded-full border transition duration-200 touch-target-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                              selectedColor?.name === c.name
                                ? 'border-primary ring-2 ring-primary ring-offset-2'
                                : 'border-line hover:border-line-control'
                            } ${!c.available ? 'cursor-not-allowed opacity-40' : ''}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.available ? c.name : `${c.name} (Hết hàng)`}
                          >
                            {selectedColor?.name === c.name && (
                              <Icon name="check" size={16} className="absolute inset-0 m-auto font-bold text-primary-fg" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Layer Resolution */}
                  <div className="space-y-2 border-t border-line-subtle pt-4">
                    <label htmlFor="pdp-layer-height" className="flex items-center gap-2 text-sm font-medium text-fg">
                      <StepNumber n={3} />
                      Độ phân giải lớp in
                    </label>
                    <select
                      id="pdp-layer-height"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="h-10 max-md:min-h-11 w-full cursor-pointer rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0.12 mm (Chính xác vi mô)">0.12 mm — Bề mặt siêu mịn / Dung sai ngặt</option>
                      <option value="0.16 mm (Tiêu chuẩn kỹ thuật)">0.16 mm — Tiêu chuẩn kỹ thuật (Khuyên dùng)</option>
                      <option value="0.20 mm (In nhanh tiêu chuẩn)">0.20 mm — In nhanh tiết kiệm</option>
                    </select>
                  </div>

                  {/* 4. Custom Laser Engraving — phí khắc CHỈ hiện khi cấu hình có thật */}
                  {product.isCustomizable && (
                    <div className="space-y-2 border-t border-line-subtle pt-4">
                      <label htmlFor="pdp-engraving" className="flex items-center justify-between gap-2 text-sm font-medium text-fg">
                        <span className="flex items-center gap-2">
                          <StepNumber n={4} />
                          Khắc laser tên dự án / số hiệu
                        </span>
                        <span className={`font-mono text-xs font-bold tabular-nums ${engravingFee !== null && engravingFee > 0 ? 'text-primary' : 'text-fg-muted'}`}>
                          {engravingFee !== null && engravingFee > 0 ? `+${vnd(engravingFee, locale)}` : EMPTY_VALUE}
                        </span>
                      </label>
                      <input
                        id="pdp-engraving"
                        type="text"
                        maxLength={25}
                        placeholder="VD: VCUBE-LAB-01…"
                        value={customEngraving}
                        onChange={(e) => setCustomEngraving(e.target.value)}
                        className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {engravingBlocked && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
                          <Icon name="error" size={16} className="mt-0.5 shrink-0" />
                          <span>
                            Chưa cấu hình phí khắc laser (customEngravingFee) nên chưa thể đặt khắc. Quản trị viên nhập ở /admin, mục Cấu hình giá.
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </Card>
            </div>

            {/* TABS — con thứ 3 của grid: desktop hàng 2 cột trái, mobile sau khối báo giá */}
            <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2">
              <Card variant="soft" padding="lg">
            <div
              role="tablist"
              aria-label="Nội dung chi tiết sản phẩm"
              className="nav-fade-right mb-6 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface-muted p-1 scrollbar-none"
            >
              <button
                type="button"
                role="tab"
                id="pdp-tab-desc"
                aria-selected={activeTab === 'desc'}
                aria-controls="pdp-panel-desc"
                onClick={() => setActiveTab('desc')}
                className={tabButtonClass(activeTab === 'desc')}
              >
                {'Tổng quan & Kết cấu'}
              </button>
              <button
                type="button"
                role="tab"
                id="pdp-tab-specs"
                aria-selected={activeTab === 'specs'}
                aria-controls="pdp-panel-specs"
                onClick={() => setActiveTab('specs')}
                className={tabButtonClass(activeTab === 'specs')}
              >
                {'Thông số & Dung sai'}
              </button>
              <button
                type="button"
                role="tab"
                id="pdp-tab-reviews"
                aria-selected={activeTab === 'reviews'}
                aria-controls="pdp-panel-reviews"
                onClick={() => setActiveTab('reviews')}
                className={tabButtonClass(activeTab === 'reviews')}
              >
                {showRating ? (`Đánh giá (${reviewsCountLabel})`) : ('Đánh giá')}
              </button>
              <button
                type="button"
                role="tab"
                id="pdp-tab-slicing"
                aria-selected={activeTab === 'slicing'}
                aria-controls="pdp-panel-slicing"
                onClick={() => setActiveTab('slicing')}
                className={tabButtonClass(activeTab === 'slicing')}
              >
                {'Hồ sơ in & cắt lớp'}
              </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'desc' && (
              <div
                role="tabpanel"
                id="pdp-panel-desc"
                aria-labelledby="pdp-tab-desc"
                className="space-y-4 text-sm leading-relaxed text-fg-muted"
              >
                <div className="rounded-lg bg-surface-muted p-4 text-base font-medium leading-relaxed text-fg">
                  {product.description || EMPTY_VALUE}
                </div>
                <div>
                  <span className="mb-3 block font-mono text-xs font-bold uppercase tracking-wider text-fg-muted">
                    Đặc tính kết cấu kỹ thuật
                  </span>
                  {(product.features || []).length === 0 ? (
                    <p className="text-xs text-fg-muted">Người bán chưa khai đặc tính kết cấu.</p>
                  ) : (
                    <ul className="space-y-2.5 text-xs text-fg">
                      {(product.features || []).map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 rounded-md bg-surface-muted p-3">
                          <span className="font-mono text-xs font-bold tabular-nums text-fg-muted">0{i + 1}.</span>
                          <span className="leading-snug">{f}</span>
                        </li>
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
                    Ô nào người bán chưa khai thì hiện dấu gạch, hệ thống không tự đoán.
                  </span>
                </p>
              </div>
            )}

            {/* Tab 3: Reviews */}
            {activeTab === 'reviews' && (
              <div role="tabpanel" id="pdp-panel-reviews" aria-labelledby="pdp-tab-reviews" className="space-y-4">
                {showRating ? (
                  <div className="flex flex-col gap-4 rounded-lg bg-surface-muted p-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="border-r-0 border-line-subtle text-center sm:border-r sm:pr-6">
                      <span className="font-mono text-3xl font-bold tabular-nums text-fg">
                        {ratingValue}
                      </span>
                      <div className="mt-1 flex items-center justify-center gap-0.5" role="img" aria-label={`${ratingValue}/5`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Icon
                            key={i}
                            name="star"
                            size={16}
                            aria-hidden="true"
                            className={i <= Math.round(ratingValue as number) ? 'text-warning-strong' : 'text-line-control'}
                            fill={i <= Math.round(ratingValue as number) ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="mt-1 block font-mono text-xs uppercase tabular-nums text-fg-muted">
                        {reviewsCountLabel} đánh giá
                      </span>
                    </div>
                    <p className="max-w-md text-xs leading-relaxed text-fg-muted">
                      Điểm trung bình chỉ tính các đánh giá đến từ đơn hàng thật trên VCUBE. Bản vẽ chưa phát sinh đơn sẽ không có điểm.
                    </p>
                  </div>
                ) : (
                  <EmptyState
                    size="sm"
                    icon={<Icon name="chat" size={20} />}
                    title="Chưa có đánh giá"
                    description="Bản vẽ này chưa có đánh giá nào từ đơn hàng thật."
                    action={
                      <InfoTip label="Vì sao chưa có đánh giá?">
                        VCUBE chỉ hiển thị đánh giá đến từ đơn hàng thật, nên bản vẽ chưa phát sinh đơn sẽ không có điểm.
                      </InfoTip>
                    }
                  />
                )}
              </div>
            )}

            {/* Tab 4: Slicing Profiles — chỉ in thông số đã khai ở cấp SẢN PHẨM.
                KHÔNG hardcode profile máy (Bambu X1C 215–230°C…) và KHÔNG gắn nhãn
                "In được" cho mọi sản phẩm: đó là khẳng định không có nguồn. */}
            {activeTab === 'slicing' && (
              <div role="tabpanel" id="pdp-panel-slicing" aria-labelledby="pdp-tab-slicing" className="space-y-3 font-mono text-xs">
                <div className="rounded-md border border-line-subtle bg-surface-muted p-3.5 text-fg-muted">
                  {'Thông số cắt lớp ở cấp sản phẩm. Nhiệt độ đùn/bàn in phụ thuộc vật liệu & máy cụ thể — xưởng xác nhận khi báo giá.'}
                </div>
                <div className="space-y-1.5 rounded-lg bg-surface-muted p-4 tabular-nums">
                  <div className="flex justify-between gap-3">
                    <span className="text-fg-muted">Độ phân giải lớp:</span>
                    <span className="font-bold text-fg">{product.specs?.resolution || EMPTY_VALUE}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-fg-muted">Độ đặc mặc định:</span>
                    <span className="font-bold text-fg">{product.specs?.infillDefault || EMPTY_VALUE}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-fg-muted">Công nghệ gia công:</span>
                    <span className="font-bold text-fg">{product.specs?.technology || EMPTY_VALUE}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-fg-muted">Kích thước phủ bì:</span>
                    <span className="font-bold text-fg">{product.specs?.dimensions || EMPTY_VALUE}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-fg-muted">Nhiệt độ đùn / bàn in:</span>
                    <span className="font-bold text-fg-muted">{EMPTY_VALUE}</span>
                  </div>
                </div>
              </div>
            )}
              </Card>
            </div>
          </div>

          {/* Compatible & Related CAD Models Section */}
          {relatedProducts.length > 0 && (
            <div className="space-y-5 border-t border-line-subtle pt-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-fg">
                    Linh Kiện Thường Được In Cùng
                  </h3>
                  <p className="font-mono text-xs text-fg-muted">
                    Các module cơ khí và phụ kiện cùng hệ sinh thái thiết kế
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-primary"
                  onClick={() => onNavigate('explore')}
                  trailingIcon={<Icon name="arrow_forward" size={16} />}
                >
                  <span>Xem tất cả</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProducts.map((rel) => (
                  <Card
                    key={rel.id}
                    as="button"
                    variant="soft"
                    interactive
                    padding="md"
                    className="flex w-full items-center gap-4 text-left"
                    onClick={() => onNavigate('product_detail', { product: rel })}
                  >
                    <img
                      src={rel.thumbnailUrl || rel.images?.[0]}
                      alt={rel.name}
                      className="size-16 shrink-0 rounded-md border border-line-subtle object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-bold uppercase text-primary">
                        {rel.category}
                      </span>
                      <h4 className="truncate text-xs font-bold text-fg">
                        {rel.name}
                      </h4>
                      <div className="mt-1 flex items-center justify-between gap-2 font-mono text-xs">
                        <span className="tabular-nums text-fg-muted">
                          CAD: {vnd(rel.priceDigital, locale)}
                        </span>
                        <span className="font-bold tabular-nums text-fg">
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
      </div>

      {/* Mobile Sticky Order Bar (< lg) — CTA duy nhất trong viewport (UI-008) */}
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-surface/95 p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] shadow-e2 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block font-mono text-xs uppercase text-fg-muted">
              Tổng đặt in
            </span>
            <span className="block truncate font-mono text-base font-bold tabular-nums text-fg">
              {vnd(orderTotal, locale)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddDigital}
              disabled={digitalPrice === null}
              title="Mua tệp CAD"
              leadingIcon={<Icon name="download" size={16} />}
            >
              <span>Tệp CAD</span>
            </Button>
            <Button
              size="sm"
              onClick={handleAddPhysical}
              disabled={isAdding || purchaseBlocked}
              leadingIcon={<Icon name="precision_manufacturing" size={16} />}
            >
              <span>{isAdding ? 'Đang xử lý…' : ('Đặt in 3D')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
