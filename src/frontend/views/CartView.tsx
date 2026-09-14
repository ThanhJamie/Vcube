import React, { useEffect, useState } from 'react';
import { CartItem, VatLine } from '../../types';
import { useLanguage } from '../context/LanguageContext';
import { useCartStore } from '../stores/useCartStore';
import { computeShippingFee, DEFAULT_SALES_RULES } from '../../backend/supabase/database';
import { computeVat, vatLabel, vatNotConfiguredLabel, vatRateFromPercent, vatTotalNote } from '../lib/vat';
import { usePricingGlobalSettings } from '../hooks/useSettings';
import { Icon } from '@frontend/ui';
import { Button } from '@frontend/ui';

interface CartViewProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
  /** Nguồn duy nhất cho phí ship / ngưỡng freeship (từ `site_content`). */
  siteContent?: { standardShippingFee?: number; freeShippingThreshold?: number };
}

export const CartView: React.FC<CartViewProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate,
  onShowToast,
  siteContent
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // P0: mã giảm giá sống trong store để KHÔNG mất khi sang /checkout.
  const appliedDiscount = useCartStore((s) => s.appliedDiscount);
  const appliedPromoCode = useCartStore((s) => s.appliedPromoCode);
  const clearAppliedDiscount = useCartStore((s) => s.clearAppliedDiscount);

  // Đợt 9 (R1): tỉ lệ VAT đọc từ `pricing_global_settings.vat_percent` — hết 8% cứng.
  // Hook đứng TRƯỚC `if (cart.length === 0) return …` bên dưới (luật hook của React).
  const { data: pricingGlobal } = usePricingGlobalSettings();
  const vatRate = vatRateFromPercent(pricingGlobal?.vatPercent);

  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const physicalItems = cart.filter(i => i.type === 'physical');
  const digitalItems = cart.filter(i => i.type === 'digital');

  const subtotalPhysical = physicalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotalDigital = digitalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotal = subtotalPhysical + subtotalDigital;

  // Phí ship lấy từ MỘT nguồn duy nhất (site_content, mặc định DEFAULT_SALES_RULES).
  const freeShippingThreshold = siteContent?.freeShippingThreshold ?? DEFAULT_SALES_RULES.freeShippingThreshold;
  const shippingFee = computeShippingFee(subtotalPhysical, physicalItems.length > 0, siteContent);
  const remainingForFreeShip = Math.max(0, freeShippingThreshold - subtotalPhysical);
  const freeShipPercent = freeShippingThreshold > 0
    ? Math.min(100, Math.round((subtotalPhysical / freeShippingThreshold) * 100))
    : 0;

  // Giá niêm yết CHƯA gồm VAT; VAT là một dòng riêng (xem `lib/vat.ts`).
  // `pricing_global_settings.vat_percent` NULL ⇒ `vat === null` ⇒ ẨN dòng VAT.
  const afterDiscount = Math.max(0, subtotal + shippingFee - appliedDiscount);
  const vat: VatLine | null = computeVat(afterDiscount, vatRate);
  const totalAmount = vat ? vat.total : afterDiscount;

  /**
   * TRUNG THỰC DỮ LIỆU (docs/design/data-honesty.md): schema KHÔNG có bảng khuyến mãi nào,
   * nên không mã nào xác thực được. Ô này trước đây nhận 3 mã cứng — `TECH3D` (−20.000 đ),
   * `VCUBE10` / `VN3DHUN` (−10%) — rồi trừ thẳng vào số tiền khách nhìn thấy: một khoản giảm
   * giá không có nguồn nào trong hệ thống. Nay ô chỉ TỪ CHỐI và nói rõ lý do; KHÔNG mã nào
   * làm thay đổi số tiền phải trả.
   */
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoMessage({
      text: isVi
        ? `Không xác thực được mã "${code}": hệ thống chưa có danh sách khuyến mãi nào để đối chiếu, nên không khoản giảm giá nào được áp dụng.`
        : `Cannot validate "${code}": there is no promotions source to check against, so no discount is applied.`,
      isError: true
    });
    // Phản hồi ngay cạnh ô nhập lẫn ở toast: mã KHÔNG được áp dụng, và vì sao.
    onShowToast(isVi
      ? 'Mã ưu đãi không được áp dụng: hệ thống chưa có nguồn khuyến mãi để xác thực.'
      : 'Promo code not applied: no promotions source exists to validate it.');
  };

  // Khoản giảm giá do các mã cứng cũ vẫn nằm trong store (persist `vcube_cart_store`) nên vẫn
  // trừ tiền ở /cart và /checkout. Gỡ MỘT LẦN khi mở giỏ hàng và nói rõ vì sao — không âm
  // thầm giữ một khoản giảm giá không có nguồn xác thực.
  useEffect(() => {
    if (useCartStore.getState().appliedDiscount > 0) {
      clearAppliedDiscount();
      setPromoMessage({
        text: isVi
          ? 'Khoản giảm giá đang ghi trên đơn không có nguồn xác thực trong hệ thống nên đã được gỡ bỏ.'
          : 'The discount previously applied had no verifiable source, so it has been removed.',
        isError: true
      });
    }
  }, [clearAppliedDiscount, isVi]);

  // EMPTY CART STATE
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-canvas py-16 sm:py-24 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-surface p-8 sm:p-10 rounded-lg shadow-e2 space-y-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto shadow-e0">
            <Icon name="shopping_cart" size={30} />
          </div>

          <div className="space-y-2">
            <h2 className="font-extrabold text-xl text-fg">
              {isVi ? 'Giỏ hàng của bạn đang trống' : 'Your cart is empty'}
            </h2>
            <p className="text-xs text-fg-subtle font-mono leading-relaxed">
              {isVi
                ? 'Chưa có bản vẽ kỹ thuật CAD hoặc linh kiện in 3D nào được chọn. Hãy khám phá kho thư viện cơ khí tuyển chọn của VCUBE.'
                : 'No CAD files or 3D printed parts added yet. Explore the curated mechanical catalog.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              leadingIcon={<Icon name="explore" size={18} />}
              onClick={() => onNavigate('explore')}
            >
              {isVi ? 'Khám Phá Bản Vẽ CAD' : 'Explore CAD Catalog'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              leadingIcon={<Icon name="upload_file" size={18} />}
              onClick={() => onNavigate('tool_3d')}
            >
              {isVi ? 'Báo Giá Mesh STL' : 'Instant Quote STL'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header & Step Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-fg-subtle mb-1">
              <span className="text-primary font-bold">BƯỚC 01/03</span>
              <span>•</span>
              <span className="uppercase">Kiểm tra danh mục đặt hàng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg">
              {isVi ? 'Giỏ Hàng & Cấu Hình Đơn' : 'Shopping Cart & Manifest'}
              <span className="text-fg-subtle text-lg font-mono font-normal ml-2">
                ({cart.reduce((a, b) => a + b.quantity, 0)} {isVi ? 'mục' : 'items'})
              </span>
            </h1>
          </div>

          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Icon name="arrow_back" size={18} />}
            onClick={() => onNavigate('explore')}
          >
            {isVi ? 'Tiếp tục chọn bản vẽ' : 'Continue Shopping'}
          </Button>
        </div>

        {/* Free Shipping Progress Banner for Physical Orders */}
        {physicalItems.length > 0 && (
          <div className="bg-surface p-4 rounded-lg shadow-e1 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Icon name="local_shipping" size={20} className="text-primary" />
                {remainingForFreeShip > 0 ? (
                  <span>
                    {isVi ? 'Mua thêm ' : 'Add '}
                    <strong className="text-primary">{remainingForFreeShip.toLocaleString('vi-VN')} đ</strong>
                    {isVi ? ' để được MIỄN PHÍ VẬN CHUYỂN toàn quốc!' : ' for FREE SHIPPING!'}
                  </span>
                ) : (
                  <span className="text-positive font-bold flex items-center gap-1">
                    <Icon name="verified" size={18} />
                    {isVi
                      ? `Đủ điều kiện MIỄN PHÍ GIAO HÀNG toàn quốc (đơn từ ${freeShippingThreshold.toLocaleString('vi-VN')} đ)!`
                      : `FREE SHIPPING UNLOCKED (orders from ${freeShippingThreshold.toLocaleString('vi-VN')} đ)!`}
                  </span>
                )}
              </div>
              <span className="font-bold text-primary">{freeShipPercent}%</span>
            </div>
            <div className="w-full bg-line-subtle h-2 rounded-full overflow-hidden border border-line/60">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${freeShipPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Cart Layout: Left Items + Right Sticky Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Cart Items categorized by Persona */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. DIGITAL CAD ASSETS SECTION */}
            {digitalItems.length > 0 && (
              <div className="bg-surface rounded-lg p-5 sm:p-7 shadow-e1 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="folder_zip" size={20} className="text-primary" />
                    <h2 className="font-extrabold text-sm sm:text-base text-fg">
                      {isVi ? 'Bản Quyền File CAD Kỹ Thuật' : 'Digital CAD Files'} ({digitalItems.length})
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-primary bg-primary-tint px-2 py-0.5 rounded-md border border-primary/30">
                    Tải Tức Thời • Phí Giao: 0 đ
                  </span>
                </div>

                <div className="divide-y divide-line">
                  {digitalItems.map((item) => (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 rounded-lg object-cover border border-line bg-surface-muted shrink-0"
                        />
                        <div className="space-y-1">
                          <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider block">
                            {item.designer}
                          </span>
                          <h3 className="font-bold text-sm text-fg leading-tight">{item.name}</h3>
                          <div className="flex items-center gap-2 text-xs font-mono text-fg-subtle">
                            <span>Định dạng: <strong className="text-fg">{item.fileFormat || 'STL + STEP + 3MF'}</strong></span>
                            <span>•</span>
                            <span className="text-positive font-bold">{item.licenseType || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                        <div className="text-right font-mono">
                          <span className="text-base font-extrabold text-primary block">
                            {item.price.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-xs text-fg-subtle">Bản quyền vĩnh viễn</span>
                        </div>

                        <Button
                          iconOnly
                          variant="ghost"
                          size="sm"
                          className="text-fg-subtle hover:text-danger hover:bg-danger-tint"
                          title="Xóa khỏi giỏ hàng"
                          aria-label="Xóa khỏi giỏ hàng"
                          onClick={() => onRemoveItem(item.id)}
                          leadingIcon={<Icon name="delete" size={18} />}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. PHYSICAL 3D PRINT FABRICATIONS SECTION */}
            {physicalItems.length > 0 && (
              <div className="bg-surface rounded-lg p-5 sm:p-7 shadow-e1 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="precision_manufacturing" size={20} className="text-fg" />
                    <h2 className="font-extrabold text-sm sm:text-base text-fg">
                      {isVi ? 'Sản Phẩm In 3D Gia Công Vật Lý' : 'Physical 3D Prints'} ({physicalItems.length})
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {isVi ? 'Đo kiểm theo thoả thuận' : 'Inspection on agreement'}
                  </span>
                </div>

                <div className="divide-y divide-line">
                  {physicalItems.map((item) => (
                    <div key={item.id} className="py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover border border-line bg-surface-muted shrink-0"
                        />
                        <div className="space-y-1">
                          <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider block">
                            {item.designer}
                          </span>
                          <h3 className="font-bold text-sm text-fg leading-tight">{item.name}</h3>
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-fg-subtle">
                            <span>Vật liệu: <strong className="text-fg">{item.material}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              Màu:
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block border border-line"
                                style={{ backgroundColor: item.colorHex || 'var(--color-line)' }}
                              />
                              <strong className="text-fg">{item.color}</strong>
                            </span>
                            {item.resolution && (
                              <>
                                <span>•</span>
                                <span>{item.resolution}</span>
                              </>
                            )}
                          </div>

                          {item.customText && (
                            <p className="text-xs font-mono text-primary bg-primary/5 px-2 py-0.5 rounded-sm inline-block">
                              Khắc Laser: "{item.customText}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                        {/* Quantity Selector */}
                        <div className="flex items-center border border-line rounded-lg bg-canvas overflow-hidden shadow-e0">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-1.5 hover:bg-surface-muted active:scale-90 text-fg font-bold text-xs font-mono touch-target-btn cursor-pointer transition-all select-none"
                          >
                            -
                          </button>
                          <span className="px-3.5 py-1.5 font-mono text-xs font-bold text-fg bg-surface border-x border-line tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-1.5 hover:bg-surface-muted active:scale-90 text-fg font-bold text-xs font-mono touch-target-btn cursor-pointer transition-all select-none"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right font-mono min-w-[90px]">
                          <span className="font-extrabold text-sm text-fg block tabular-nums">
                            {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-xs text-fg-subtle">
                            {item.price.toLocaleString('vi-VN')} đ / cái
                          </span>
                        </div>

                        <Button
                          iconOnly
                          variant="ghost"
                          size="sm"
                          className="text-fg-subtle hover:text-danger hover:bg-danger-tint"
                          title="Xóa linh kiện này"
                          aria-label="Xóa linh kiện này"
                          onClick={() => onRemoveItem(item.id)}
                          leadingIcon={<Icon name="delete" size={18} />}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Promo Voucher Box */}
            <div className="bg-surface rounded-lg p-5 shadow-e1 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="cart-promo-code" className="font-mono text-xs uppercase font-bold text-fg flex items-center gap-1.5 cursor-pointer">
                  <Icon name="confirmation_number" size={18} className="text-primary" />
                  {isVi ? 'Mã Giảm Giá / Ưu Đãi Doanh Nghiệp' : 'Promo Voucher'}
                </label>
                {appliedDiscount > 0 && (
                  <span className="text-xs font-mono text-positive font-bold">
                    {appliedPromoCode ? `${appliedPromoCode} • ` : ''}- {appliedDiscount.toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  id="cart-promo-code"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder={isVi ? 'Nhập mã ưu đãi...' : 'Enter promo code...'}
                  className="flex-1 bg-canvas border border-line-control rounded-lg px-3.5 py-2 text-xs font-mono uppercase text-fg focus:outline-none focus:border-primary"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => handleApplyPromo()}
                >
                  {isVi ? 'Áp dụng' : 'Apply'}
                </Button>
              </div>

              {/* KHÔNG còn "mã gợi ý": các mã cũ (VCUBE10 / TECH3D / VN3DHUN) không có
                  nguồn nào trong schema nên không được quảng cáo như mã thật. */}
              <p className="text-xs font-mono text-fg-subtle leading-relaxed pt-1">
                {isVi
                  ? 'Hệ thống chưa có danh sách khuyến mãi để đối chiếu: mọi mã đều bị từ chối và không mã nào thay đổi số tiền phải trả.'
                  : 'No promotions list exists to check against: every code is refused and none changes the amount due.'}
              </p>

              {promoMessage && (
                <p className={`text-xs font-mono mt-1 ${promoMessage.isError ? 'text-danger' : 'text-positive font-bold'}`}>
                  {promoMessage.text}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Order Summary Card */}
          <div className="lg:col-span-4">
            <div className="bg-surface border border-line rounded-lg p-6 shadow-e2 space-y-6 lg:sticky lg:top-24">
              <h2 className="font-extrabold text-base text-fg border-b border-line pb-3 font-mono uppercase tracking-wide">
                {isVi ? 'Tóm Tắt Đơn Hàng' : 'Order Summary'}
              </h2>

              <div className="space-y-3 text-xs font-mono text-fg-muted">
                {digitalItems.length > 0 && (
                  <div className="flex justify-between">
                    <span>Tạm tính File CAD ({digitalItems.length}):</span>
                    <span className="font-bold text-fg">{subtotalDigital.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                {physicalItems.length > 0 && (
                  <div className="flex justify-between">
                    <span>Tạm tính In 3D ({physicalItems.reduce((a, b) => a + b.quantity, 0)} sp):</span>
                    <span className="font-bold text-fg">{subtotalPhysical.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span>Phí vận chuyển:</span>
                    {shippingFee === 0 && physicalItems.length > 0 && (
                      <span className="text-xs bg-positive-tint text-positive px-1.5 py-0.2 rounded-sm font-bold">FREESHIP</span>
                    )}
                  </div>
                  <span className={`font-bold ${shippingFee === 0 ? 'text-positive' : 'text-fg'}`}>
                    {physicalItems.length === 0 ? '0 đ (Online)' : (shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`)}
                  </span>
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-positive font-bold">
                    <span>Giảm giá ưu đãi{appliedPromoCode ? ` (${appliedPromoCode})` : ''}:</span>
                    <span>- {appliedDiscount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                {vat ? (
                  <div className="flex justify-between">
                    <span>{vatLabel(vat.rate)}:</span>
                    <span className="font-bold text-fg">{vat.amount.toLocaleString('vi-VN')} đ</span>
                  </div>
                ) : (
                  <p className="text-xs text-fg-subtle leading-relaxed">{vatNotConfiguredLabel(isVi)}</p>
                )}

                <div className="pt-3 border-t border-line flex justify-between items-baseline">
                  <span className="text-sm font-bold text-fg">Tổng thanh toán:</span>
                  <div className="text-right">
                    <span className="font-mono text-xl font-black text-primary block">
                      {totalAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-xs text-fg-subtle block">
                      {vatTotalNote(isVi, vatRate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Checkout Action */}
              <Button
                size="lg"
                fullWidth
                variant="primary"
                className="font-mono"
                onClick={() => onNavigate('checkout')}
                trailingIcon={<Icon name="arrow_forward" size={18} />}
              >
                <span>{isVi ? 'TIẾN HÀNH THANH TOÁN' : 'PROCEED TO CHECKOUT'}</span>
              </Button>

              {/* Guarantee badges */}
              <div className="pt-4 border-t border-line space-y-2 text-xs font-mono text-fg-subtle">
                <div className="flex items-center gap-2">
                  <Icon name="lock" size={16} className="text-primary" />
                  <span>Bảo mật giao dịch thanh toán mã hóa 256-bit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="verified" size={16} className="text-primary" />
                  <span>{isVi ? 'In lại miễn phí nếu lỗi kỹ thuật thuộc VCUBE (theo điều khoản)' : 'Free reprint for VCUBE-caused defects (per terms)'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
