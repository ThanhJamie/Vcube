import React, { useState } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../../types';
import { PersonalizeModelViewer3D } from '../components/personalize/PersonalizeModelViewer3D';
import { CanvasErrorBoundary } from '../components/CanvasErrorBoundary';
import { Badge, Button, Card, EmptyState, Icon, InfoTip } from '@frontend/ui';
import { EMPTY_VALUE, formatCurrency, formatNumber } from '@frontend/lib/format';

interface PersonalizeViewProps {
  product?: Product;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

/** Màu CHỈ dùng cho khung xem trước 3D khi sản phẩm chưa khai báo bảng màu — không phải lời khai về kho.
 *  Dùng giá trị token `line-control` (#8590A6, 3.21:1) thay cho #94A3B8 đã bị loại khỏi token. */
const VIEWER_NEUTRAL_HEX = '#8590A6';

/** Số hữu hạn > 0 (tiền/phí). `null` = CHƯA CẤU HÌNH, khác hẳn 0. */
const positiveNumberOrNull = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Số hữu hạn >= 0 (phần trăm chiết khấu/phụ thu). 0 là giá trị THẬT, không phải "thiếu". */
const nonNegativeNumberOrNull = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** `rating`/`reviewsCount` NULL hoặc 0 ⇒ "Chưa có đánh giá" (KHÔNG "★ 0", KHÔNG NaN). */
const ratingOf = (product: Product): { value: number; count: number } | null => {
  const value = Number(product?.rating);
  const count = Number(product?.reviewsCount);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (!Number.isFinite(count) || count <= 0) return null;
  return { value, count };
};

/** `license_type` NULL ⇒ nói thẳng người bán chưa khai báo, KHÔNG đoán hộ. */
const licenseLabel = (license?: string | null): string => {
  const value = typeof license === 'string' ? license.trim() : '';
  return value ? value : `${EMPTY_VALUE} (người bán chưa khai báo)`;
};

/** Bước cấu hình có số thứ tự — quét nhanh thứ tự trên card dài. */
const StepNumber: React.FC<{ n: number }> = ({ n }) => (
  <span
    aria-hidden="true"
    className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-tint font-mono text-xs font-bold text-primary"
  >
    {n}
  </span>
);

/** Nhãn VI cho gói tiến độ — không render enum tiếng Anh ra UI. */
const PACKAGE_LABEL: Record<'economy' | 'standard' | 'express', string> = {
  economy: 'Tiết kiệm',
  standard: 'Tiêu chuẩn',
  express: 'Hỏa tốc'
};

/** Nhãn VI cho kiểu khắc — không render enum `embossed`/`laser`/`recessed` thô ra UI. */
const ENGRAVING_DEPTH_LABEL: Record<'embossed' | 'laser' | 'recessed', string> = {
  embossed: 'đùn nổi',
  laser: 'khắc laser',
  recessed: 'khoét âm'
};

/** Không có sản phẩm để cá nhân hoá ⇒ nói thật, KHÔNG dựng sản phẩm mẫu để bán. */
const PersonalizeUnavailable: React.FC<{ onNavigate: (screen: string, payload?: any) => void }> = ({ onNavigate }) => (
  <div className="min-h-dvh bg-canvas px-4 py-10 font-sans text-fg sm:px-6 md:px-12">
    <div className="mx-auto max-w-3xl">
      <Card variant="soft" padding="lg">
        <EmptyState
          icon={<Icon name="view_in_ar" size={20} />}
          title="Chưa có sản phẩm để cá nhân hoá"
          description="Trang này cần một sản phẩm cụ thể. Hãy chọn một bản vẽ trong kho rồi mở lại phần tuỳ biến."
          action={
            <Button
              variant="primary"
              size="md"
              leadingIcon={<Icon name="explore" size={18} />}
              onClick={() => onNavigate('explore')}
            >
              Mở kho bản vẽ
            </Button>
          }
        />
      </Card>
    </div>
  </div>
);

export const PersonalizeView: React.FC<PersonalizeViewProps> = (props) => {
  if (!props.product) {
    return <PersonalizeUnavailable onNavigate={props.onNavigate} />;
  }
  return <PersonalizeConfigurator {...props} product={props.product} />;
};

const PersonalizeConfigurator: React.FC<PersonalizeViewProps & { product: Product }> = ({
  product,
  materials = [],
  pricingConfig,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const currentProduct = product;
  /** Danh mục vật liệu CHỈ đọc từ bảng `materials` thật — không rơi về bộ số mẫu. */
  const materialsList = Array.isArray(materials) ? materials : [];

  const rating = ratingOf(currentProduct);

  // State
  const [selectedMaterial, setSelectedMaterial] = useState<string>(() => materialsList[0]?.name || '');
  const declaredColors = Array.isArray(currentProduct.colors)
    ? currentProduct.colors.filter((c) => c && typeof c.hex === 'string' && c.hex.trim())
    : [];
  const firstAvailableColor = declaredColors.find((c) => c.available !== false) || declaredColors[0] || null;
  const [selectedColorHex, setSelectedColorHex] = useState<string>(firstAvailableColor?.hex || VIEWER_NEUTRAL_HEX);
  const [selectedColorName, setSelectedColorName] = useState<string>(firstAvailableColor?.name || '');
  // Bắt đầu TRỐNG: trước đây mặc định 'PROTOTYPE-01' khiến đơn mặc định "đã yêu cầu khắc chữ"
  // dù khách chưa nhập gì (bịa nội dung khách hàng).
  const [engravingText, setEngravingText] = useState('');
  const [selectedFont, setSelectedFont] = useState('JetBrains Mono');
  const [fontSizeMm, setFontSizeMm] = useState(12);
  const [engravingDepth, setEngravingDepth] = useState<'laser' | 'embossed' | 'recessed'>('embossed');
  const [engravingPosition, setEngravingPosition] = useState<'center' | 'top-left' | 'bottom-right'>('center');
  const [lidExplodeDistance, setLidExplodeDistance] = useState<number>(0);
  const [uploadedLogoName, setUploadedLogoName] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedPackageTier, setSelectedPackageTier] = useState<'economy' | 'standard' | 'express'>('standard');

  // Model physical dimensions
  const parsedDimensions = { x: 120.0, y: 85.5, z: 45.2 };

  /**
   * ── ĐƯỜNG TIỀN ──────────────────────────────────────────────────────────────
   * Mọi thông số giá đọc từ dữ liệu THẬT (sản phẩm + `pricing_configs`). Thiếu ⇒ KHÔNG
   * đoán: giá hiển thị `—` và nút đặt in bị khoá kèm tên thông số thiếu (đúng luật đã áp
   * trong `pricingEngine`). Trước đây: `pricePhysical || 450000` (bịa giá gốc) và
   * `customEngravingFee ?? 50000` / `customLogoUploadFee ?? 80000` (bịa phí dịch vụ Inkiri).
   */
  const basePrice = positiveNumberOrNull(currentProduct.pricePhysical);
  const engravingFee = positiveNumberOrNull(pricingConfig?.customEngravingFee);
  const logoFee = positiveNumberOrNull(pricingConfig?.customLogoUploadFee);
  const economyPercent = nonNegativeNumberOrNull(pricingConfig?.economyDiscountPercent);
  const expressPercent = nonNegativeNumberOrNull(pricingConfig?.expressRushSurchargePercent);

  /**
   * Chiết khấu số lượng: đọc từ `pricing_configs.volumeDiscounts` (nguồn sự thật) thay cho
   * bậc cứng 5/10/20 ⇒ 8/15/22% (bậc cứng đó LỆCH với cấu hình thật ở mốc 20 và 50 chiếc).
   */
  const discountTiers = Array.isArray(pricingConfig?.volumeDiscounts)
    ? pricingConfig!.volumeDiscounts.filter(
        (t) => Number.isFinite(Number(t?.minQty)) && Number.isFinite(Number(t?.discountPercent))
      )
    : [];
  const matchedTier =
    discountTiers.length > 0
      ? discountTiers.find(
          (t) => quantity >= Number(t.minQty) && (t.maxQty == null || quantity <= Number(t.maxQty))
        ) || null
      : null;
  const volumeDiscountPercent = matchedTier ? Number(matchedTier.discountPercent) : null;

  const packageMultiplier =
    selectedPackageTier === 'economy'
      ? economyPercent !== null
        ? 1 - economyPercent / 100
        : null
      : selectedPackageTier === 'express'
        ? expressPercent !== null
          ? 1 + expressPercent / 100
          : null
        : 1;

  /** Tên thông số giá còn thiếu ⇒ chặn tính giá và NÊU TÊN (không hiện tổng tiền như thật). */
  const missingPricingParams: string[] = [];
  if (basePrice === null) missingPricingParams.push('products.price_physical');
  if (volumeDiscountPercent === null) missingPricingParams.push('pricing_configs.volumeDiscounts');
  if (selectedPackageTier === 'economy' && economyPercent === null)
    missingPricingParams.push('pricing_configs.economyDiscountPercent');
  if (selectedPackageTier === 'express' && expressPercent === null)
    missingPricingParams.push('pricing_configs.expressRushSurchargePercent');
  const priceUnavailable = missingPricingParams.length > 0;

  const wantsEngraving = engravingText.trim().length > 0;
  const wantsLogo = Boolean(uploadedLogoName);
  /** Phí dịch vụ chưa được cấu hình mà khách ĐANG chọn ⇒ không hiện dòng phí, không cộng, nhưng phải nói ra. */
  const unconfiguredFees: string[] = [];
  if (wantsEngraving && engravingFee === null) unconfiguredFees.push('phí khắc chữ (customEngravingFee)');
  if (wantsLogo && logoFee === null) unconfiguredFees.push('phí xử lý vector logo (customLogoUploadFee)');

  const serviceFees =
    (wantsEngraving && engravingFee !== null ? engravingFee : 0) +
    (wantsLogo && logoFee !== null ? logoFee : 0);

  const unitBasePrice =
    priceUnavailable || basePrice === null || volumeDiscountPercent === null || packageMultiplier === null
      ? null
      : Math.round((basePrice + serviceFees) * (1 - volumeDiscountPercent / 100) * packageMultiplier);
  const totalCost = unitBasePrice === null ? null : unitBasePrice * quantity;

  /** D-B (Lead): ký hiệu tiền thống nhất `₫` với `formatCurrency`/`Money`. */
  const money = (value: number | null): string =>
    value === null || !Number.isFinite(value) ? EMPTY_VALUE : `${formatNumber(Math.round(value))} ₫`;

  /** Vật liệu khớp với lựa chọn hiện tại (danh mục thật). Không khớp ⇒ KHÔNG mượn số của bộ mẫu. */
  const matchingMaterial = materialsList.find(
    (m) =>
      selectedMaterial &&
      (selectedMaterial.toLowerCase().includes((m.name || '').toLowerCase()) ||
        (m.name || '').toLowerCase().includes(selectedMaterial.toLowerCase()) ||
        selectedMaterial.toLowerCase().includes((m.id || '').toLowerCase()))
  );
  const materialDensity = matchingMaterial ? positiveNumberOrNull(matchingMaterial.density) : null;
  const materialPricePerGram = matchingMaterial ? positiveNumberOrNull(matchingMaterial.pricePerGram) : null;
  const materialCostPerKg = matchingMaterial ? positiveNumberOrNull(matchingMaterial.costPerKg) : null;
  /**
   * `unit_price_multiplier` KHÔNG được dùng để nhân giá bán. Bằng chứng: `pricingEngine.ts:70-88`
   * định nghĩa nó là hệ số SUY ĐƠN GIÁ đ/g (`costPerKg ÷ 1000 × hệ số`), không phải hệ số nhân
   * giá sản phẩm; và dữ liệu thật trong `materials` là 270/320/620/1400/1850 ⇒ nhân thẳng vào
   * giá sẽ ra giá sai 270 lần. Vì vậy view này KHÔNG áp phụ phí vật liệu và nói rõ điều đó.
   */
  const materialSurchargeApplied = false;

  const specs = currentProduct.specs;
  const specRows: { label: string; value: string }[] = [
    { label: 'Kích thước (D×R×C)', value: specs?.dimensions || EMPTY_VALUE },
    { label: 'Khối lượng', value: specs?.weight || EMPTY_VALUE },
    { label: 'Độ phân giải lớp', value: specs?.resolution || EMPTY_VALUE },
    { label: 'Độ đặc mặc định', value: specs?.infillDefault || EMPTY_VALUE },
    { label: 'Công nghệ in', value: specs?.technology || EMPTY_VALUE },
    { label: 'Thời gian in', value: currentProduct.printTime || EMPTY_VALUE }
  ];

  const quantityPresets = [1, 2, 5, 10, 20, 50];
  const volumeDiscountLabel = discountTiers
    .filter((t) => Number(t.discountPercent) > 0)
    .map((t) => `${Number(t.minQty)}+ (-${Number(t.discountPercent)}%)`)
    .join(' • ');

  const createCartPayload = (price: number): CartItem => ({
    id: `custom-cart-${Date.now()}`,
    productId: currentProduct.id,
    type: 'physical',
    name: `${currentProduct.name} [Khắc: ${engravingText.trim() || 'Không'}] (${selectedPackageTier === 'express' ? 'HỎA TỐC' : selectedPackageTier === 'economy' ? 'TIẾT KIỆM' : 'TIÊU CHUẨN'})`,
    designer: currentProduct.designer,
    image: currentProduct.images?.[0] || '',
    price,
    quantity: quantity,
    material: selectedMaterial || undefined,
    color: selectedColorName || undefined,
    colorHex: selectedColorHex,
    customText: engravingText.trim() || undefined,
    customFont: selectedFont,
    customFontSize: fontSizeMm,
    uploadedLogoName: uploadedLogoName || undefined
  });

  const handleAddToCart = () => {
    if (unitBasePrice === null) {
      onShowToast(
        `Chưa ra được giá: thiếu ${missingPricingParams.join(', ') || 'thông số giá'}. Đã khoá thêm vào giỏ.`
      );
      return;
    }
    onAddToCart(createCartPayload(unitBasePrice));
    onShowToast('Đã thêm sản phẩm cá nhân hóa vào giỏ hàng!');
  };

  const handleOrderNow = () => {
    if (unitBasePrice === null) {
      onShowToast(
        `Chưa ra được giá: thiếu ${missingPricingParams.join(', ') || 'thông số giá'}. Đã khoá đặt in.`
      );
      return;
    }
    onAddToCart(createCartPayload(unitBasePrice));
    onShowToast('Đang chuyển đến giỏ hàng thanh toán...');
    onNavigate('cart');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      setUploadedLogoName(fileName);
      onShowToast(`Đã nhận file logo: ${fileName}`);
    }
  };

  const isTextTooLong = engravingText.length > 20 || (fontSizeMm > 18 && engravingText.length > 12);

  const colorOptions = declaredColors.map((c) => ({
    name: c.name || EMPTY_VALUE,
    hex: c.hex,
    available: c.available !== false
  }));

  /** Cấu hình đang chọn — đọc thẳng từ state, không suy diễn thêm. */
  const summaryRows: { label: string; value: string }[] = [
    { label: 'Vật liệu', value: selectedMaterial || EMPTY_VALUE },
    { label: 'Màu sắc', value: selectedColorName || EMPTY_VALUE },
    { label: 'Nội dung khắc', value: engravingText.trim() || 'Không khắc' },
    { label: 'Gói tiến độ', value: PACKAGE_LABEL[selectedPackageTier] }
  ];

  return (
    <div className="min-h-dvh bg-canvas pb-28 font-sans text-fg lg:pb-12">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Breadcrumbs & quick actions — cùng template với PDP */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav
              aria-label="Đường dẫn trang cá nhân hoá"
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
                Kho bản vẽ
              </button>
              <span aria-hidden="true" className="text-fg-subtle">/</span>
              <span className="max-w-[120px] truncate text-primary sm:max-w-[180px]">
                {currentProduct.category || EMPTY_VALUE}
              </span>
              <span aria-hidden="true" className="text-fg-subtle">/</span>
              <span className="max-w-[180px] truncate font-bold text-fg sm:max-w-xs">
                {currentProduct.name}
              </span>
            </nav>

            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <span className="rounded-full border border-primary/20 bg-primary-tint px-2.5 py-1 font-mono text-xs font-bold text-fg">
                SKU: {currentProduct.sku || EMPTY_VALUE}
              </span>

              <Button
                variant={isBookmarked ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={isBookmarked}
                onClick={() => {
                  setIsBookmarked(!isBookmarked);
                  onShowToast(isBookmarked ? 'Đã bỏ lưu bản vẽ' : 'Đã lưu cấu hình vào mục yêu thích!');
                }}
                leadingIcon={
                  <Icon
                    name={isBookmarked ? 'bookmark' : 'bookmark_border'}
                    size={18}
                    fill={isBookmarked ? 'currentColor' : 'none'}
                    className={isBookmarked ? 'text-warning-strong' : 'text-fg-muted'}
                  />
                }
              >
                {isBookmarked ? 'Đã lưu' : 'Lưu'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="share" size={18} />}
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  onShowToast('Đã sao chép liên kết cấu hình!');
                }}
              >
                Chia sẻ
              </Button>
            </div>
          </div>

          {/* Product headline — tiêu đề/hạng đánh giá nằm trên cùng mọi viewport */}
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="rounded-full border border-primary/20 bg-primary-tint px-2.5 py-1 font-mono text-xs font-bold text-primary">
                Xưởng thiết kế VCUBE
              </span>
              <span className="flex items-center gap-1 font-mono text-xs text-fg-muted">
                {rating ? (
                  <>
                    <Icon name="star" aria-hidden="true" className="size-3.5 fill-current text-warning-strong" />
                    <span className="font-bold tabular-nums text-fg">{rating.value}</span>
                    <span>({rating.count} đánh giá)</span>
                  </>
                ) : (
                  'Chưa có đánh giá'
                )}
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-snug tracking-tight text-fg sm:text-3xl">
              {currentProduct.name}
            </h1>
            <p className="text-xs text-fg-muted">
              Thiết kế kỹ thuật bởi{' '}
              <strong className="text-fg">{currentProduct.designer || EMPTY_VALUE}</strong>
              {' • '}Giấy phép:{' '}
              <strong className="text-fg">{licenseLabel(currentProduct.licenseType)}</strong>
            </p>
          </header>

          {/* Template Detail §4.3: 7/5 — trái khung 3D + thông số, phải tổng kết sticky */}
          <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
            {/* LEFT 7 — khung xem trước 3D + thông số kỹ thuật thật */}
            <div className="space-y-6 lg:col-span-7">
              <Card variant="soft" padding="none" className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-muted px-3 py-1 font-mono text-xs font-bold text-fg">
                    <Icon name="3d_rotation" size={16} className="text-primary" aria-hidden="true" />
                    Khung xem trước 3D
                  </span>
                  <Badge variant="info" dot>Mô hình minh hoạ</Badge>
                </div>

                {/* Viewport tối graphite (D7) — engine giữ nguyên scene/ánh sáng */}
                <div className="relative mx-3 mb-3 overflow-hidden rounded-md bg-surface-inverse sm:mx-4 sm:mb-4">
                  <div className="h-[400px] sm:h-[460px] lg:h-[480px]">
                    <CanvasErrorBoundary fallbackHeight="h-full">
                      <PersonalizeModelViewer3D
                        modelType="arduino-case"
                        colorHex={selectedColorHex}
                        materialName={selectedMaterial || EMPTY_VALUE}
                        engravingText={engravingText}
                        fontFamily={selectedFont}
                        fontSizeMm={fontSizeMm}
                        engravingDepth={engravingDepth}
                        engravingPosition={engravingPosition}
                        logoName={uploadedLogoName}
                        lidExplodeDistance={lidExplodeDistance}
                        onLidExplodeChange={(distance) => setLidExplodeDistance(distance)}
                        dimensions={parsedDimensions}
                        className="h-full w-full"
                      />
                    </CanvasErrorBoundary>
                  </div>
                </div>
              </Card>

              {/* Proxy disclosure (docs/design/data-honesty.md §3): khung 3D là mô hình minh hoạ,
                  số đo trên khung là của mô hình đó — KHÔNG phải số đo của sản phẩm. */}
              <p className="flex items-start gap-1.5 text-xs text-fg-muted">
                <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-warning" />
                <span>
                  Khung 3D hiển thị MÔ HÌNH MINH HOẠ (proxy) để xem vật liệu, màu và nội dung khắc — không phải
                  bản thể CAD của sản phẩm. Kích thước in thật nằm ở ô “Kích thước (D×R×C)” ngay bên dưới.
                </span>
              </p>

              {/* Engineering specs — CHỈ dữ liệu sản phẩm khai; thiếu ⇒ "—" */}
              <Card variant="soft" padding="lg" className="space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-line-subtle pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full bg-primary animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                    <span className="truncate font-mono text-xs font-bold uppercase tracking-wider text-fg">
                      Thông số kỹ thuật (từ dữ liệu sản phẩm)
                    </span>
                  </div>
                  <Badge variant="info" dot>Đọc từ DB</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-3">
                  {specRows.map((row) => (
                    <div key={row.label} className="rounded-md bg-surface-muted p-3">
                      <span className="mb-0.5 block text-xs uppercase text-fg-muted">{row.label}</span>
                      <span className="break-words font-bold tabular-nums text-fg">{row.value}</span>
                    </div>
                  ))}
                </div>

                <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <span>Ô nào người bán chưa khai thì hiện {EMPTY_VALUE}.</span>
                  <InfoTip label="Vì sao có ô hiện dấu gạch?">
                    Thông số lấy từ trường specs của sản phẩm và từ bảng materials (mật độ, đơn giá nhựa).
                    Trường chưa được khai báo sẽ hiện {EMPTY_VALUE} — hệ thống không điền số mẫu thay người bán,
                    vì đó sẽ là một con số khách có thể đọc như số đo thật.
                  </InfoTip>
                </p>
              </Card>

              {/* 1–2. Vật liệu & màu sắc */}
              <Card variant="soft" padding="lg" className="space-y-5">
                <section className="space-y-3" aria-labelledby="pz-material">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="pz-material" className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <StepNumber n={1} />
                      Vật liệu chế tác
                    </h2>
                    <InfoTip label="Phụ phí vật liệu được tính thế nào?">
                      Danh mục vật liệu đọc từ bảng materials. Đơn giá nhựa hiển thị đúng trường price_per_gram
                      (hoặc cost_per_kg) của vật liệu; trường chưa khai hiện {EMPTY_VALUE}. Cột unit_price_multiplier
                      trong DB là hệ số SUY ĐƠN GIÁ đ/g theo pricingEngine, KHÔNG phải hệ số nhân giá bán, nên view
                      này không dùng nó để đổi giá — chênh lệch vật liệu do xưởng xác nhận.
                    </InfoTip>
                  </div>

                  {materialsList.length === 0 ? (
                    <p className="rounded-md border border-line-subtle bg-surface-muted p-3 text-xs text-fg-muted">
                      Chưa có vật liệu nào trong bảng materials ⇒ chưa chọn được vật liệu. Không dựng danh mục mẫu.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {materialsList.map((mat) => {
                        const isSelected = selectedMaterial === mat.name;
                        const perGram = positiveNumberOrNull(mat.pricePerGram);
                        const perKg = positiveNumberOrNull(mat.costPerKg);
                        const density = positiveNumberOrNull(mat.density);
                        return (
                          <button
                            key={mat.id || mat.name}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setSelectedMaterial(mat.name)}
                            className={`relative flex cursor-pointer flex-col justify-between gap-1 rounded-md border p-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              isSelected
                                ? 'border-primary bg-primary-tint ring-1 ring-primary'
                                : 'border-line bg-surface hover:border-line-control hover:bg-surface-muted'
                            }`}
                          >
                            <span className="truncate font-mono text-xs font-bold text-fg">
                              {mat.name || EMPTY_VALUE}
                            </span>
                            <span className="block text-xs leading-tight text-fg-muted">
                              {mat.strength || EMPTY_VALUE}
                              {' • '}
                              {density !== null ? `${density} g/cm³` : EMPTY_VALUE}
                            </span>
                            <span className="block font-mono text-xs tabular-nums text-fg-muted">
                              {perGram !== null ? `${formatNumber(perGram)} ₫/g` : EMPTY_VALUE}
                              {perKg !== null ? ` • ${formatNumber(perKg)} ₫/kg` : ''}
                            </span>
                            <span className="block font-mono text-xs text-primary">
                              {mat.recommendedFor || EMPTY_VALUE}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="space-y-3 border-t border-line-subtle pt-4" aria-labelledby="pz-color">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="pz-color" className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <StepNumber n={2} />
                      Sắc thái hoàn thiện
                    </h2>
                    <span className="font-mono text-xs font-bold text-primary">
                      {selectedColorName || EMPTY_VALUE}
                    </span>
                  </div>

                  {colorOptions.length === 0 ? (
                    <p className="rounded-md border border-line-subtle bg-surface-muted p-3 text-xs text-fg-muted">
                      Người bán chưa khai báo bảng màu cho sản phẩm này ⇒ không dựng bảng màu mẫu. Khung xem trước
                      3D đang dùng một màu trung tính chỉ để hiển thị.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      {colorOptions.map((c) => {
                        const isSelected = selectedColorHex === c.hex;
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            disabled={!c.available}
                            aria-pressed={isSelected}
                            aria-label={`${c.name}${c.available ? '' : ' (người bán báo hết)'}`}
                            onClick={() => {
                              setSelectedColorHex(c.hex);
                              setSelectedColorName(c.name);
                            }}
                            className={`relative size-9 cursor-pointer rounded-full border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-line hover:border-line-control'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={`${c.name}${c.available ? '' : ' — người bán báo hết'}`}
                          >
                            {isSelected && (
                              <Icon
                                name="check"
                                size={18}
                                className={`absolute inset-0 flex items-center justify-center font-bold ${c.hex === '#f8f9ff' || c.hex === '#F9FAFB' ? 'text-fg' : 'text-on-inverse'}`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </Card>
            </div>

            {/* RIGHT 5 — tổng kết sticky + các card cấu hình */}
            <div className="space-y-5 lg:col-span-5">
              <div className="z-sticky lg:sticky lg:top-24">
                <Card variant="soft" padding="lg" className="space-y-5">
                  <div className="space-y-1.5">
                    <span className="font-mono text-xs uppercase tracking-wider text-fg-muted">
                      Tổng chi phí gia công · {quantity} cái
                    </span>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-3xl font-bold tabular-nums text-fg">
                        {money(totalCost)}
                      </span>
                      <span className="font-mono text-xs text-fg-muted tabular-nums">
                        Đơn giá {money(unitBasePrice)}{unitBasePrice !== null ? ' / cái' : ''}
                      </span>
                    </div>
                    {volumeDiscountPercent !== null && volumeDiscountPercent > 0 && (
                      <Badge variant="success" size="sm">Giảm {volumeDiscountPercent}% theo cấu hình</Badge>
                    )}
                  </div>

                  {priceUnavailable && (
                    <div role="alert" className="space-y-1 rounded-lg border border-danger/20 bg-danger-tint p-3 text-xs">
                      <p className="inline-flex items-center gap-1.5 font-bold uppercase text-danger">
                        <Icon name="warning" size={16} className="shrink-0" />
                        Chưa ra được giá — thiếu thông số
                      </p>
                      <p className="text-fg">
                        Hệ thống KHÔNG đoán hộ. Thiếu:{' '}
                        <strong className="font-mono">{missingPricingParams.join(', ')}</strong>. Nút thêm vào giỏ /
                        đặt in đang bị khoá.
                      </p>
                    </div>
                  )}

                  {/* Cấu hình đang chọn — tóm tắt thật từ state */}
                  <dl className="space-y-1.5 border-t border-line-subtle pt-4 text-xs">
                    {summaryRows.map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-fg-muted">{row.label}</dt>
                        <dd className="min-w-0 truncate text-right font-medium text-fg">{row.value}</dd>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-fg-muted">Số lượng</dt>
                      <dd className="font-mono font-bold tabular-nums text-fg">{quantity} cái</dd>
                    </div>
                  </dl>

                  {/* CTA — CHỈ desktop. Dưới lg, thanh đặt hàng cố định thay thế (một CTA / viewport). */}
                  <div className="hidden gap-2.5 lg:flex lg:flex-col">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      leadingIcon={<Icon name="precision_manufacturing" size={18} />}
                      disabled={priceUnavailable}
                      onClick={handleOrderNow}
                    >
                      Đặt in ngay
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      leadingIcon={<Icon name="add_shopping_cart" size={18} />}
                      disabled={priceUnavailable}
                      onClick={handleAddToCart}
                    >
                      Thêm vào giỏ hàng
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-fg-muted">
                    <span className="flex items-center gap-1">
                      <Icon name="schedule" size={14} className="text-primary" />
                      Xuất xưởng: {selectedPackageTier === 'express' ? '24 giờ hỏa tốc' : selectedPackageTier === 'economy' ? '5–7 ngày' : '48 giờ kiểm định'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="verified" size={14} className="text-primary" />
                      Bảo hành cơ khí 12 tháng
                    </span>
                  </div>
                </Card>
              </div>

              {/* 3. Khắc tên / số hiệu / logo */}
              <Card variant="soft" padding="lg" className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <StepNumber n={3} />
                    Khắc tên / số hiệu / logo
                  </h2>
                  <span className={`font-mono text-xs ${engravingText.length > 20 ? 'font-bold text-warning' : 'text-fg-muted'}`}>
                    {engravingText.length} / 24 ký tự
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={24}
                    value={engravingText}
                    onChange={(e) => setEngravingText(e.target.value)}
                    placeholder="VD: VCUBE-LAB-01 hoặc tên dự án…"
                    aria-label="Nội dung khắc trên mặt vỏ"
                    className="h-10 w-full rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-fg-muted">
                      Phí khắc chữ:{' '}
                      <strong className="tabular-nums text-fg">
                        {engravingFee !== null ? money(engravingFee) : EMPTY_VALUE}
                      </strong>
                      {engravingFee === null && (
                        <span className="ml-1">(chưa cấu hình trong pricing_configs)</span>
                      )}
                    </span>
                    {isTextTooLong && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-warning">
                        <Icon name="warning" size={16} className="shrink-0 text-warning" />
                        Văn bản dài có thể vượt vùng phẳng của nắp hộp.
                        <InfoTip label="Khuyến nghị khi văn bản quá dài">
                          Hãy giảm cỡ chữ hoặc chọn vật liệu in chi tiết cao (resin) để chữ nét nhất. Đây là
                          khuyến nghị kỹ thuật, không phải giới hạn đã đo cho từng mô hình.
                        </InfoTip>
                      </span>
                    )}
                  </div>
                </div>

                {/* Engraving Depth & Finish Selector */}
                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-fg">
                    Kiểu hoàn thiện bề mặt
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'embossed', label: 'Đùn nổi 3D', sub: '+1.2mm', icon: 'layers' },
                      { id: 'laser', label: 'Khắc laser', sub: 'Carbon đen', icon: 'flare' },
                      { id: 'recessed', label: 'Khoét âm', sub: '-0.8mm', icon: 'vertical_align_bottom' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        aria-pressed={engravingDepth === mode.id}
                        onClick={() => setEngravingDepth(mode.id as any)}
                        className={`cursor-pointer rounded-md border p-2.5 text-center transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          engravingDepth === mode.id
                            ? 'border-primary bg-primary-tint font-bold text-primary'
                            : 'border-line bg-surface text-fg-muted hover:border-line-control hover:text-fg'
                        }`}
                      >
                        <Icon name={mode.icon} size={18} className="mb-0.5 block" />
                        <span className="block font-mono text-xs leading-tight">{mode.label}</span>
                        <span className="mt-0.5 block font-mono text-xs text-fg-muted">{mode.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alignment & Font Selector */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="pz-engraving-position" className="block text-sm font-medium text-fg">
                      Vị trí căn lề
                    </label>
                    <select
                      id="pz-engraving-position"
                      value={engravingPosition}
                      onChange={(e) => setEngravingPosition(e.target.value as any)}
                      className="h-10 w-full cursor-pointer rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="center">Chính giữa nắp</option>
                      <option value="top-left">Góc trên bên trái</option>
                      <option value="bottom-right">Góc dưới bên phải</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pz-engraving-font" className="block text-sm font-medium text-fg">
                      Phông chữ kỹ thuật
                    </label>
                    <select
                      id="pz-engraving-font"
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="h-10 w-full cursor-pointer rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="JetBrains Mono">JetBrains Mono (chuẩn kỹ thuật)</option>
                      <option value="Inter">Inter (hiện đại)</option>
                      <option value="Roboto Mono">Roboto Mono (công nghiệp)</option>
                    </select>
                  </div>
                </div>

                {/* Font Size Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pz-font-size" className="text-sm font-medium text-fg">
                      Cỡ chữ bề mặt
                    </label>
                    <span className="font-mono text-xs font-bold tabular-nums text-primary">
                      {fontSizeMm} mm
                    </span>
                  </div>
                  <input
                    id="pz-font-size"
                    type="range"
                    min={6}
                    max={24}
                    value={fontSizeMm}
                    onChange={(e) => setFontSizeMm(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Optional Logo Upload Box */}
                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-fg">
                    Tải lên tệp vector / logo (.SVG / .DXF / .PNG)
                  </span>
                  {uploadedLogoName ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary-tint p-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Icon name="attachment" size={20} className="shrink-0 text-primary" />
                        <div className="min-w-0">
                          <span className="block truncate font-mono text-xs font-bold text-fg">
                            {uploadedLogoName}
                          </span>
                          <span className="font-mono text-xs text-primary">
                            {logoFee !== null
                              ? `+${money(logoFee)} (phí xử lý vector)`
                              : `Phí xử lý vector: ${EMPTY_VALUE} (chưa cấu hình)`}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        className="shrink-0"
                        leadingIcon={<Icon name="close" size={16} aria-hidden="true" />}
                        onClick={() => setUploadedLogoName(null)}
                      >
                        Xoá tệp
                      </Button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer rounded-lg border border-dashed border-line-control bg-surface-muted p-4 text-center transition-colors duration-200 hover:border-primary">
                      <Icon name="upload_file" size={28} className="text-fg-muted" />
                      <span className="mt-1 block font-mono text-xs font-bold text-fg">
                        Kéo thả tệp vector hoặc nhấp để tải lên
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-fg-muted">
                        Hỗ trợ .SVG, .DXF, .PNG dưới 10MB
                        {logoFee !== null ? ` (+${money(logoFee)})` : ` — phí xử lý vector: ${EMPTY_VALUE} (chưa cấu hình)`}
                      </span>
                      <input type="file" accept=".svg,.dxf,.png" onChange={handleLogoUpload} className="sr-only" aria-label="Tải lên tệp logo vector" />
                    </label>
                  )}
                </div>
              </Card>

            </div>
          </div>

          {/* 4–6. Tuỳ chọn in + BOM chi phí — full width, 2 cột ở desktop */}
          <Card variant="soft" padding="lg">
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
              <div className="space-y-5">
                <section className="space-y-3" aria-labelledby="pz-explode">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="pz-explode" className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <StepNumber n={4} />
                      Tách nắp hộp
                      <InfoTip label="Tách nắp hộp để làm gì?">
                        Kéo trượt để nâng nắp hộp lên cao, cho phép soi rõ các chấu gắn bo mạch Arduino và cổng USB
                        bên trong. Đây chỉ là chế độ xem của khung 3D, không thay đổi sản phẩm in.
                      </InfoTip>
                    </h2>
                    <span className="font-mono text-xs font-bold tabular-nums text-primary">
                      +{lidExplodeDistance} mm
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={lidExplodeDistance}
                    onChange={(e) => setLidExplodeDistance(Number(e.target.value))}
                    aria-label="Khoảng tách nắp hộp (mm)"
                    className="w-full accent-primary"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Đóng', value: 0 },
                      { label: 'Mở 20 mm', value: 20 },
                      { label: 'Mở hết', value: 40 }
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        aria-pressed={lidExplodeDistance === preset.value}
                        onClick={() => setLidExplodeDistance(preset.value)}
                        className={`cursor-pointer rounded-md border px-2 py-1.5 font-mono text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          lidExplodeDistance === preset.value
                            ? 'border-primary bg-primary text-primary-fg'
                            : 'border-line-control bg-surface text-fg-muted hover:border-fg-subtle hover:text-fg'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-3 border-t border-line-subtle pt-4" aria-labelledby="pz-qty">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="pz-qty" className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <StepNumber n={5} />
                      Số lượng đặt in
                    </h2>
                    {volumeDiscountPercent !== null && volumeDiscountPercent > 0 && (
                      <Badge variant="success" icon={<Icon name="percent" size={16} />}>
                        Giảm {volumeDiscountPercent}%
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {quantityPresets.map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        aria-pressed={quantity === qty}
                        onClick={() => setQuantity(qty)}
                        className={`cursor-pointer rounded-md border py-2 font-mono text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          quantity === qty
                            ? 'border-primary bg-primary text-primary-fg'
                            : 'border-line-control bg-surface text-fg hover:border-fg-subtle'
                        }`}
                      >
                        x{qty}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 font-mono text-xs text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      Chiết khấu sỉ theo cấu hình:
                      <InfoTip label="Bậc chiết khấu lấy từ đâu?">
                        Bậc chiết khấu đọc từ trường volumeDiscounts trong bảng pricing_configs. Bậc cứng cũ
                        (5/10/20 chiếc ⇒ 8/15/22%) không còn được dùng vì lệch với cấu hình thật.
                      </InfoTip>
                    </span>
                    <span className="text-right tabular-nums">
                      {volumeDiscountLabel || EMPTY_VALUE}
                    </span>
                  </div>
                </section>

                <section className="space-y-3 border-t border-line-subtle pt-4" aria-labelledby="pz-package">
                  <h2 id="pz-package" className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <StepNumber n={6} />
                    Gói tiến độ & dung sai QC
                  </h2>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: 'economy' as const,
                        label: 'Tiết kiệm',
                        sub: '5–7 ngày',
                        discount: economyPercent !== null ? `-${economyPercent}%` : EMPTY_VALUE
                      },
                      { id: 'standard' as const, label: 'Tiêu chuẩn', sub: '2–3 ngày', discount: 'Chuẩn' },
                      {
                        id: 'express' as const,
                        label: 'Hỏa tốc 24 giờ',
                        sub: 'Trong 24 giờ',
                        discount: expressPercent !== null ? `+${expressPercent}%` : EMPTY_VALUE
                      }
                    ].map((pkg) => {
                      const isSelected = selectedPackageTier === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedPackageTier(pkg.id)}
                          className={`cursor-pointer rounded-md border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? 'border-primary bg-primary-tint ring-1 ring-primary'
                              : 'border-line bg-surface hover:border-line-control'
                          }`}
                        >
                          <div className="font-mono text-xs font-bold text-fg">{pkg.label}</div>
                          <div className="font-mono text-xs text-fg-muted">{pkg.sub}</div>
                          <div className={`mt-1 font-mono text-xs font-bold tabular-nums ${isSelected ? 'text-primary' : 'text-fg-muted'}`}>
                            {pkg.discount}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                {/* CAD Inspector Bridge Banner */}
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted p-3.5">
                  <div className="flex items-center gap-2.5">
                    <Icon name="view_in_ar" size={20} className="shrink-0 text-primary" />
                    <div>
                      <div className="font-mono text-xs font-bold text-fg">Kiểm tra lưới CAD 360°</div>
                      <div className="text-xs text-fg-muted">
                        Kiểm tra mặt cắt từng lớp, đo caliper và kiểm tra độ kín manifold
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onNavigate('tool_3d')}
                  >
                    Mở công cụ cắt lớp
                  </Button>
                </div>

                {/* BOM Cost Summary */}
                <section className="space-y-3 rounded-lg bg-surface-muted p-4 sm:p-5" aria-labelledby="pz-bom">
                  <div className="flex items-center gap-2 border-b border-line-subtle pb-2.5">
                    <Icon name="receipt_long" size={18} className="shrink-0 text-primary" />
                    <h2 id="pz-bom" className="font-mono text-xs font-bold uppercase tracking-wider text-fg">
                      Dự toán chi phí chi tiết
                    </h2>
                  </div>

                  <dl className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between gap-2 text-fg-muted">
                      <dt>Giá phôi cơ sở</dt>
                      <dd className="font-semibold tabular-nums text-fg">{money(basePrice)}</dd>
                    </div>
                    <div className="flex justify-between gap-2 text-fg-muted">
                      <dt>Vật liệu ({selectedMaterial || EMPTY_VALUE})</dt>
                      <dd className="font-semibold tabular-nums text-fg">
                        {materialPricePerGram !== null
                          ? `${formatCurrency(materialPricePerGram)}/g`
                          : materialCostPerKg !== null
                            ? `${formatCurrency(materialCostPerKg)}/kg`
                            : EMPTY_VALUE}
                        {materialDensity !== null ? ` • ${materialDensity} g/cm³` : ''}
                      </dd>
                    </div>
                    {engravingFee !== null && (
                      <div className="flex justify-between gap-2 text-fg-muted">
                        <dt>Phí khắc chữ ({ENGRAVING_DEPTH_LABEL[engravingDepth]})</dt>
                        <dd className="font-semibold tabular-nums text-fg">
                          {wantsEngraving ? `+${money(engravingFee)}` : money(0)}
                        </dd>
                      </div>
                    )}
                    {wantsLogo && logoFee !== null && (
                      <div className="flex justify-between gap-2 text-fg-muted">
                        <dt>Phí xử lý vector logo</dt>
                        <dd className="font-semibold tabular-nums text-fg">+{money(logoFee)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 text-fg-muted">
                      <dt>Số lượng & tiến độ</dt>
                      <dd className="font-semibold tabular-nums text-primary">
                        {quantity} cái {volumeDiscountPercent !== null && volumeDiscountPercent > 0 ? `(-${volumeDiscountPercent}%)` : ''} • {PACKAGE_LABEL[selectedPackageTier]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 text-fg-muted">
                      <dt>Đơn giá sau chiết khấu</dt>
                      <dd className="font-semibold tabular-nums text-fg">
                        {money(unitBasePrice)}
                        {unitBasePrice !== null ? ' / cái' : ''}
                      </dd>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 border-t border-line-subtle pt-2">
                      <dt className="font-mono text-xs font-bold uppercase text-fg">
                        Tổng chi phí gia công ({quantity} cái)
                      </dt>
                      <dd className="font-mono text-2xl font-bold tabular-nums text-fg">
                        {money(totalCost)}
                      </dd>
                    </div>
                  </dl>

                  {/* Nói rõ phần CHƯA nằm trong con số trên — không để tổng tiền trông "đã đủ". */}
                  {!priceUnavailable && (unconfiguredFees.length > 0 || !materialSurchargeApplied) && (
                    <div className="flex items-start gap-1.5 text-xs text-fg-muted">
                      <Icon name="warning" size={16} className="shrink-0 text-warning" />
                      <span>
                        Tổng trên CHƯA gồm:{' '}
                        {[
                          ...unconfiguredFees,
                          !materialSurchargeApplied ? 'chênh lệch phụ phí vật liệu (chờ xưởng xác nhận)' : null
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        .
                      </span>
                      <InfoTip label="Vì sao tổng chưa gồm các khoản này?">
                        Phí dịch vụ chỉ được cộng khi pricing_configs đã cấu hình con số thật. Phụ phí vật liệu
                        cần đơn giá đ/g × khối lượng mô hình thật; view này không có khối lượng nên không nhân
                        một hệ số đoán hộ vào giá bán.
                      </InfoTip>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* Mobile Sticky Order Bar (< lg) — CTA duy nhất trong viewport */}
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-surface/95 p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] shadow-e2 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block font-mono text-xs uppercase text-fg-muted">Tổng gia công</span>
            <span className="block truncate font-mono text-base font-bold tabular-nums text-fg">
              {money(totalCost)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              iconOnly
              variant="secondary"
              size="md"
              aria-label="Thêm vào giỏ"
              disabled={priceUnavailable}
              onClick={handleAddToCart}
              leadingIcon={<Icon name="add_shopping_cart" size={18} />}
            />
            <Button variant="primary" size="md" disabled={priceUnavailable} onClick={handleOrderNow}>
              Đặt in ngay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
