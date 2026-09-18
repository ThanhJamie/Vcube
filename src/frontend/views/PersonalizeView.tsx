import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../../types';
import { PersonalizeModelViewer3D } from '../components/personalize/PersonalizeModelViewer3D';
import { CanvasErrorBoundary } from '../components/CanvasErrorBoundary';
import { Badge, Button, Card, EmptyState, Icon, InfoTip } from '@frontend/ui';
import { EMPTY_VALUE } from '@frontend/lib/format';

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

/** Không có sản phẩm để cá nhân hoá ⇒ nói thật, KHÔNG dựng sản phẩm mẫu để bán. */
const PersonalizeUnavailable: React.FC<{ onNavigate: (screen: string, payload?: any) => void }> = ({ onNavigate }) => (
  <div className="min-h-dvh bg-canvas text-fg py-10 px-4 sm:px-6 md:px-12 font-sans">
    <div className="max-w-3xl mx-auto">
      <EmptyState
        bordered
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

  const money = (value: number | null): string =>
    value === null || !Number.isFinite(value) ? EMPTY_VALUE : `${Math.round(value).toLocaleString('vi-VN')} đ`;

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
    { label: 'Infill mặc định', value: specs?.infillDefault || EMPTY_VALUE },
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

  return (
    <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-8 px-4 sm:px-6 md:px-12 pb-28 lg:pb-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Breadcrumbs & Quick Action Bar */}
        <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-xs font-mono text-fg-subtle overflow-x-auto pb-1 scrollbar-none">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('home')}>
              VCUBE 3D
            </Button>
            <span aria-hidden="true">/</span>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('explore')}>
              Catalog
            </Button>
            <span aria-hidden="true">/</span>
            <span className="text-primary font-bold uppercase truncate max-w-[120px] sm:max-w-[180px]">
              {currentProduct.category || EMPTY_VALUE}
            </span>
            <span aria-hidden="true">/</span>
            <span className="text-fg font-bold truncate max-w-[180px] sm:max-w-xs">
              {currentProduct.name}
            </span>
          </nav>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="font-mono text-xs text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
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
                  className={isBookmarked ? 'text-warning-strong' : 'text-fg-subtle'}
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
              Share
            </Button>

            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Icon name="arrow_back" size={18} />}
              onClick={() => onNavigate('explore')}
            >
              Catalog
            </Button>
          </div>
        </Card>

        {/* Main 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: 3D Personalization Viewport & Real Specs */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3D Canvas Frame — panel HUD tối, giữ nguyên token nghịch đảo */}
            <div className="bg-surface-inverse border border-surface-inverse-raised rounded-lg shadow-e3 relative overflow-hidden flex flex-col h-[480px] sm:h-[560px] lg:h-[620px]">
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
                  className="w-full h-full"
                />
              </CanvasErrorBoundary>
            </div>

            {/* Proxy disclosure (docs/design/data-honesty.md §3): khung 3D là mô hình minh hoạ,
                số đo trên khung là của mô hình đó — KHÔNG phải số đo của sản phẩm. */}
            <p className="text-xs text-fg-muted flex items-start gap-1.5">
              <Icon name="warning" size={16} className="text-warning shrink-0" />
              <span>
                Khung 3D hiển thị MÔ HÌNH MINH HOẠ (proxy) để xem vật liệu, màu và nội dung khắc — không phải
                bản thể CAD của sản phẩm. Kích thước in thật nằm ở ô “Kích thước (D×R×C)” ngay bên dưới.
              </span>
            </p>

            {/* Engineering specs — CHỈ dữ liệu sản phẩm khai; thiếu ⇒ "—" */}
            <Card padding="lg" className="space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                  <span className="font-mono text-xs uppercase font-bold text-fg tracking-wider truncate">
                    Thông Số Kỹ Thuật (từ dữ liệu sản phẩm)
                  </span>
                </div>
                <span className="shrink-0">
                  <Badge variant="info" dot>Đọc từ DB</Badge>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                {specRows.map((row) => (
                  <div key={row.label} className="bg-canvas p-3 rounded-lg border border-line">
                    <span className="text-xs uppercase text-fg-muted block mb-0.5">{row.label}</span>
                    <span className="font-bold text-fg tabular-nums break-words">{row.value}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-fg-muted flex items-center gap-1.5">
                <span>Ô nào người bán chưa khai thì hiện {EMPTY_VALUE}.</span>
                <InfoTip label="Vì sao có ô hiện dấu gạch?">
                  Thông số lấy từ trường specs của sản phẩm và từ bảng materials (mật độ, đơn giá nhựa).
                  Trường chưa được khai báo sẽ hiện {EMPTY_VALUE} — hệ thống không điền số mẫu thay người bán,
                  vì đó sẽ là một con số khách có thể đọc như số đo thật.
                </InfoTip>
              </p>
            </Card>
          </div>

          {/* Right Column: Configurator Panel */}
          <div className="lg:col-span-5 space-y-6">
            <Card padding="lg" className="space-y-6">
              {/* Product Header */}
              <div className="border-b border-line pb-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-sm">
                    VCUBE STUDIO // PERSONALIZATION
                  </span>
                  <span className="text-xs font-mono text-fg-muted inline-flex items-center gap-1">
                    {rating ? (
                      <>
                        <Star aria-hidden="true" className="size-3.5 fill-current text-warning" />
                        <span className="font-bold text-warning tabular-nums">{rating.value}</span>
                        <span>({rating.count} đánh giá)</span>
                      </>
                    ) : (
                      'Chưa có đánh giá'
                    )}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-fg leading-snug">
                  {currentProduct.name}
                </h1>
                <p className="text-xs text-fg-muted">
                  Thiết kế kỹ thuật bởi{' '}
                  <strong className="text-fg">{currentProduct.designer || EMPTY_VALUE}</strong>
                  {' • '}Giấy phép:{' '}
                  <strong className="text-fg">{licenseLabel(currentProduct.licenseType)}</strong>
                </p>
              </div>

              {/* 1. Material Selector — danh mục THẬT từ bảng materials */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono uppercase font-bold text-fg flex items-center gap-1.5">
                    <Icon name="science" size={16} className="text-primary" />
                    1. Vật Liệu Chế Tác:
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <InfoTip label="Phụ phí vật liệu được tính thế nào?">
                      Danh mục vật liệu đọc từ bảng materials. Đơn giá nhựa hiển thị đúng trường price_per_gram
                      (hoặc cost_per_kg) của vật liệu; trường chưa khai hiện {EMPTY_VALUE}. Cột unit_price_multiplier
                      trong DB là hệ số SUY ĐƠN GIÁ đ/g theo pricingEngine, KHÔNG phải hệ số nhân giá bán, nên view
                      này không dùng nó để đổi giá — chênh lệch vật liệu do xưởng xác nhận.
                    </InfoTip>
                  </span>
                </div>

                {materialsList.length === 0 ? (
                  <p className="text-xs text-fg-muted bg-canvas border border-line rounded-lg p-3">
                    Chưa có vật liệu nào trong bảng materials ⇒ chưa chọn được vật liệu. Không dựng danh mục mẫu.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                          className={`p-3 rounded-lg border text-left transition cursor-pointer relative flex flex-col justify-between gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                              : 'border-line bg-canvas hover:border-primary/60'
                          }`}
                        >
                          <span className={`font-mono text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-fg'}`}>
                            {mat.name || EMPTY_VALUE}
                          </span>
                          <span className="text-xs text-fg-muted block leading-tight">
                            {mat.strength || EMPTY_VALUE}
                            {' • '}
                            {density !== null ? `${density} g/cm³` : EMPTY_VALUE}
                          </span>
                          <span className="text-xs font-mono text-fg-muted block tabular-nums">
                            {perGram !== null ? `${perGram.toLocaleString('vi-VN')} đ/g` : EMPTY_VALUE}
                            {perKg !== null ? ` • ${perKg.toLocaleString('vi-VN')} đ/kg` : ''}
                          </span>
                          <span className="text-xs font-mono text-primary block">
                            {mat.recommendedFor || EMPTY_VALUE}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Color Swatches — bảng màu do người bán khai */}
              <div className="space-y-3 pt-4 border-t border-line">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-mono uppercase font-bold text-fg flex items-center gap-1.5">
                    <Icon name="palette" size={16} className="text-primary" />
                    2. Sắc Thái Hoàn Thiện:
                  </span>
                  <span className="font-mono text-xs font-bold text-primary">
                    {selectedColorName || EMPTY_VALUE}
                  </span>
                </div>

                {colorOptions.length === 0 ? (
                  <p className="text-xs text-fg-muted bg-canvas border border-line rounded-lg p-3">
                    Người bán chưa khai báo bảng màu cho sản phẩm này ⇒ không dựng bảng màu mẫu. Khung xem trước
                    3D đang dùng một màu trung tính chỉ để hiển thị.
                  </p>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
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
                          className={`relative w-9 h-9 rounded-full border-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected ? 'border-primary scale-110 ring-2 ring-primary/40' : 'border-line hover:scale-105'
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
              </div>

              {/* 3. Surface Engraving & Personalization */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase font-bold text-fg flex items-center gap-1.5">
                    <Icon name="edit_note" size={16} className="text-primary" />
                    3. Khắc Tên / Số Hiệu / Logo Lên Mặt Vỏ:
                  </label>
                  <span className={`text-xs font-mono ${engravingText.length > 20 ? 'text-warning font-bold' : 'text-fg-muted'}`}>
                    {engravingText.length} / 24 ký tự
                  </span>
                </div>

                {/* Text input */}
                <div>
                  <input
                    type="text"
                    maxLength={24}
                    value={engravingText}
                    onChange={(e) => setEngravingText(e.target.value)}
                    placeholder="VD: VCUBE-LAB-01 hoặc Tên dự án..."
                    aria-label="Nội dung khắc trên mặt vỏ"
                    className="w-full bg-canvas border border-line-control p-3 text-xs font-mono font-bold rounded-md focus:outline-none focus:border-primary text-fg"
                  />
                  <div className="mt-2 flex items-start justify-between gap-2 text-xs">
                    <span className="text-fg-muted">
                      Phí khắc chữ:{' '}
                      <strong className="text-fg tabular-nums">
                        {engravingFee !== null ? money(engravingFee) : EMPTY_VALUE}
                      </strong>
                      {engravingFee === null && (
                        <span className="ml-1">(chưa cấu hình trong pricing_configs)</span>
                      )}
                    </span>
                    {isTextTooLong && (
                      <span className="inline-flex items-center gap-1.5 text-warning font-semibold">
                        <Icon name="warning" size={16} className="text-warning shrink-0" />
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
                <div>
                  <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-1.5">
                    Kiểu Hoàn Thiện Bề Mặt:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'embossed', label: 'Đùn Nổi 3D', sub: '+1.2mm', icon: 'layers' },
                      { id: 'laser', label: 'Khắc Laser', sub: 'Carbon Đen', icon: 'flare' },
                      { id: 'recessed', label: 'Khoét Âm', sub: '-0.8mm', icon: 'vertical_align_bottom' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        aria-pressed={engravingDepth === mode.id}
                        onClick={() => setEngravingDepth(mode.id as any)}
                        className={`p-2.5 rounded-md border text-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          engravingDepth === mode.id
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-line bg-canvas text-fg-muted hover:text-fg'
                        }`}
                      >
                        <Icon name={mode.icon} size={18} className="block mb-0.5" />
                        <span className="font-mono text-xs block leading-tight">{mode.label}</span>
                        <span className="font-mono text-xs text-fg-muted block mt-0.5">{mode.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alignment & Font Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-1">
                      Vị Trí Căn Lề:
                    </label>
                    <select
                      value={engravingPosition}
                      onChange={(e) => setEngravingPosition(e.target.value as any)}
                      aria-label="Vị trí căn lề nội dung khắc"
                      className="w-full bg-canvas border border-line-control p-2.5 text-xs font-mono rounded-md focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="center">Chính giữa nắp (Center)</option>
                      <option value="top-left">Góc trên bên trái</option>
                      <option value="bottom-right">Góc dưới bên phải</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-1">
                      Phông Chữ Kỹ Thuật:
                    </label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      aria-label="Phông chữ khắc"
                      className="w-full bg-canvas border border-line-control p-2.5 text-xs font-mono rounded-md focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="JetBrains Mono">JetBrains Mono (Chuẩn Kỹ Thuật)</option>
                      <option value="Inter">Inter (Hiện Đại)</option>
                      <option value="Roboto Mono">Roboto Mono (Công Nghiệp)</option>
                    </select>
                  </div>
                </div>

                {/* Font Size Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono uppercase font-bold text-fg-muted">
                      Cỡ Chữ Bề Mặt:
                    </span>
                    <span className="font-mono text-xs font-bold text-primary tabular-nums">
                      {fontSizeMm} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={24}
                    value={fontSizeMm}
                    onChange={(e) => setFontSizeMm(Number(e.target.value))}
                    aria-label="Cỡ chữ khắc (mm)"
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                {/* Optional Logo Upload Box */}
                <div>
                  <label className="text-xs font-mono uppercase font-bold text-fg-muted block mb-1.5">
                    Tải Lên File Vector / Logo (.SVG / .DXF / .PNG):
                  </label>
                  {uploadedLogoName ? (
                    <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Icon name="attachment" size={20} className="text-primary" />
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-fg truncate block">
                            {uploadedLogoName}
                          </span>
                          <span className="text-xs font-mono text-primary">
                            {logoFee !== null
                              ? `+${money(logoFee)} (Phí xử lý vector)`
                              : `Phí xử lý vector: ${EMPTY_VALUE} (chưa cấu hình)`}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        className="shrink-0"
                        leadingIcon={<X size={16} aria-hidden="true" />}
                        onClick={() => setUploadedLogoName(null)}
                      >
                        Xóa file
                      </Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-line-control hover:border-primary p-4 rounded-lg text-center cursor-pointer block bg-canvas transition-colors">
                      <Icon name="upload_file" size={28} className="text-fg-muted" />
                      <span className="block text-xs font-mono font-bold text-fg mt-1">
                        Kéo thả file vector hoặc nhấp để tải lên
                      </span>
                      <span className="block text-xs text-fg-muted font-mono mt-0.5">
                        Hỗ trợ .SVG, .DXF, .PNG dưới 10MB
                        {logoFee !== null ? ` (+${money(logoFee)})` : ` — phí xử lý vector: ${EMPTY_VALUE} (chưa cấu hình)`}
                      </span>
                      <input type="file" accept=".svg,.dxf,.png" onChange={handleLogoUpload} className="sr-only" aria-label="Tải lên file logo vector" />
                    </label>
                  )}
                </div>
              </div>

              {/* 4. Lid Explosion Slider */}
              <div className="space-y-3 pt-4 border-t border-line">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-mono uppercase font-bold text-fg flex items-center gap-1.5">
                    <Icon name="vertical_align_top" size={16} className="text-primary" />
                    4. Tách Nắp Hộp (Exploded View):
                    <InfoTip label="Tách nắp hộp để làm gì?">
                      Kéo trượt để nâng nắp hộp lên cao, cho phép soi rõ các chấu gắn bo mạch Arduino và cổng USB
                      bên trong. Đây chỉ là chế độ xem của khung 3D, không thay đổi sản phẩm in.
                    </InfoTip>
                  </span>
                  <span className="font-mono text-xs font-bold text-primary tabular-nums">
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
                  className="w-full accent-primary cursor-pointer"
                />

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Đóng 0mm', value: 0 },
                    { label: 'Mở 50% 20mm', value: 20 },
                    { label: 'Mở Hết 40mm', value: 40 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      aria-pressed={lidExplodeDistance === preset.value}
                      onClick={() => setLidExplodeDistance(preset.value)}
                      className={`py-1.5 px-2 rounded-md text-xs font-mono font-bold transition cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        lidExplodeDistance === preset.value
                          ? 'bg-primary text-primary-fg border-primary'
                          : 'bg-canvas text-fg-muted border-line-control hover:text-fg'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Batch Quantity & Volume Discounts (đọc từ pricing_configs) */}
              <div className="bg-canvas border border-line rounded-lg p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon name="layers" size={18} className="text-primary" />
                    <span className="font-mono text-xs uppercase font-bold text-fg tracking-wider">
                      Số Lượng Đặt In (Batch Quantity)
                    </span>
                  </div>
                  {volumeDiscountPercent !== null && volumeDiscountPercent > 0 && (
                    <Badge variant="success" icon={<Icon name="percent" size={16} />}>
                      Giảm {volumeDiscountPercent}% theo cấu hình
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {quantityPresets.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      aria-pressed={quantity === qty}
                      onClick={() => setQuantity(qty)}
                      className={`py-2 text-xs font-mono font-bold rounded-md border transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        quantity === qty
                          ? 'bg-primary text-primary-fg border-primary'
                          : 'bg-surface text-fg border-line-control hover:border-primary'
                      }`}
                    >
                      x{qty}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs font-mono text-fg-muted">
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
              </div>

              {/* 6. Delivery Packages (đọc từ pricing_configs) */}
              <div className="bg-canvas border border-line rounded-lg p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon name="local_shipping" size={18} className="text-primary" />
                  <span className="font-mono text-xs uppercase font-bold text-fg tracking-wider">
                    Gói Tiến Độ & Dung Sai QC
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'economy' as const,
                      label: 'Tiết Kiệm',
                      sub: '5-7 ngày',
                      discount: economyPercent !== null ? `-${economyPercent}%` : EMPTY_VALUE
                    },
                    { id: 'standard' as const, label: 'Tiêu Chuẩn', sub: '2-3 ngày', discount: 'Chuẩn' },
                    {
                      id: 'express' as const,
                      label: 'Hỏa Tốc 24H',
                      sub: 'Trong 24h',
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
                        className={`p-2.5 rounded-md border text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isSelected
                            ? 'border-primary bg-primary-tint/50 ring-1 ring-primary'
                            : 'border-line-control bg-surface hover:border-line-control'
                        }`}
                      >
                        <div className="font-mono text-xs font-bold text-fg">{pkg.label}</div>
                        <div className="text-xs font-mono text-fg-muted">{pkg.sub}</div>
                        <div className={`text-xs font-mono font-bold mt-1 tabular-nums ${isSelected ? 'text-primary' : 'text-fg-muted'}`}>
                          {pkg.discount}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. CAD Inspector Bridge Banner */}
              <div className="bg-surface-muted border border-line rounded-lg p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Icon name="view_in_ar" size={20} className="text-primary" />
                  <div>
                    <div className="font-mono text-xs font-bold text-fg">CAD Mesh Inspector 360°</div>
                    <div className="text-xs text-fg-muted">
                      Kiểm tra mặt cắt Stencil từng lớp, đo caliper và kiểm tra khép kín manifold
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onNavigate('tool_3d')}
                >
                  Mở CAD Slicer
                </Button>
              </div>

              {/* 8. BOM Cost Summary */}
              <div className="bg-canvas border border-line rounded-lg p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-line pb-2.5">
                  <Icon name="receipt_long" size={18} className="text-primary" />
                  <span className="font-mono text-xs uppercase font-bold text-fg tracking-wider">
                    Dự Toán Chi Phí Chi Tiết (BOM Breakdown)
                  </span>
                </div>

                {priceUnavailable && (
                  <div
                    role="alert"
                    className="bg-surface border border-danger/40 rounded-lg p-3 text-xs space-y-1"
                  >
                    {/* KHÔNG dùng chữ `text-warning` trên nền `bg-warning-tint` (4.47:1 < 4.5 —
                        xem docs/plans/24-holistic-review.md §4 / D1). Chữ danger trên surface = 6.47:1. */}
                    <p className="font-bold uppercase text-danger inline-flex items-center gap-1.5">
                      <Icon name="warning" size={16} className="shrink-0" />
                      Chưa ra được giá — thiếu thông số
                    </p>
                    <p className="text-fg">
                      Hệ thống KHÔNG đoán hộ. Thiếu:{' '}
                      <strong className="font-mono">{missingPricingParams.join(', ')}</strong>. Mọi ô tiền bên
                      dưới hiện {EMPTY_VALUE} và nút thêm vào giỏ / đặt in đang bị khoá.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-fg-muted gap-2">
                    <span>Giá phôi cơ sở (Base Part):</span>
                    <span className="font-semibold text-fg tabular-nums">{money(basePrice)}</span>
                  </div>
                  <div className="flex justify-between text-fg-muted gap-2">
                    <span>Vật liệu ({selectedMaterial || EMPTY_VALUE}):</span>
                    <span className="font-semibold text-fg tabular-nums">
                      {materialPricePerGram !== null
                        ? `${materialPricePerGram.toLocaleString('vi-VN')} đ/g`
                        : materialCostPerKg !== null
                          ? `${materialCostPerKg.toLocaleString('vi-VN')} đ/kg`
                          : EMPTY_VALUE}
                      {materialDensity !== null ? ` • ${materialDensity} g/cm³` : ''}
                    </span>
                  </div>
                  {engravingFee !== null && (
                    <div className="flex justify-between text-fg-muted gap-2">
                      <span>Phí khắc chữ ({engravingDepth}):</span>
                      <span className="font-semibold text-fg tabular-nums">
                        {wantsEngraving ? `+${money(engravingFee)}` : money(0)}
                      </span>
                    </div>
                  )}
                  {wantsLogo && logoFee !== null && (
                    <div className="flex justify-between text-fg-muted gap-2">
                      <span>Phí xử lý vector logo:</span>
                      <span className="font-semibold text-fg tabular-nums">+{money(logoFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-fg-muted gap-2">
                    <span>Số lượng & Tiến độ:</span>
                    <span className="font-semibold text-primary tabular-nums">
                      {quantity} cái {volumeDiscountPercent !== null && volumeDiscountPercent > 0 ? `(-${volumeDiscountPercent}%)` : ''} • {selectedPackageTier.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-fg-muted gap-2">
                    <span>Đơn giá sau chiết khấu:</span>
                    <span className="font-semibold text-fg tabular-nums">
                      {money(unitBasePrice)}
                      {unitBasePrice !== null ? ' đ/cái' : ''}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-line flex justify-between items-baseline gap-2">
                    <span className="font-mono text-xs uppercase font-bold text-fg">
                      TỔNG CHI PHÍ GIA CÔNG ({quantity} cái):
                    </span>
                    <span className="font-mono text-2xl font-extrabold text-primary tabular-nums">
                      {money(totalCost)}
                    </span>
                  </div>
                </div>

                {/* Nói rõ phần CHƯA nằm trong con số trên — không để tổng tiền trông "đã đủ". */}
                {!priceUnavailable && (unconfiguredFees.length > 0 || !materialSurchargeApplied) && (
                  <div className="text-xs text-fg-muted flex items-start gap-1.5">
                    <Icon name="warning" size={16} className="text-warning shrink-0" />
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

                <div className="pt-2 text-xs font-mono text-fg-muted flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Icon name="schedule" size={14} className="text-primary" />
                    Xuất xưởng: {selectedPackageTier === 'express' ? '24h hỏa tốc' : selectedPackageTier === 'economy' ? '5-7 ngày' : '48h kiểm định'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="verified" size={14} className="text-primary" />
                    Bảo hành cơ khí 12T
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="lg"
                  leadingIcon={<Icon name="add_shopping_cart" size={18} />}
                  disabled={priceUnavailable}
                  onClick={handleAddToCart}
                >
                  Thêm Vào Giỏ Hàng
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  leadingIcon={<Icon name="precision_manufacturing" size={18} />}
                  disabled={priceUnavailable}
                  onClick={handleOrderNow}
                >
                  Đặt In Ngay
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Order Bar (< lg screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-sticky bg-surface/95 backdrop-blur-md border-t border-line p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] shadow-e3 flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-fg-muted uppercase block">TỔNG GIA CÔNG:</span>
          <span className="font-mono text-base font-extrabold text-primary tabular-nums">
            {money(totalCost)}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
            Đặt In Ngay
          </Button>
        </div>
      </div>
    </div>
  );
};
