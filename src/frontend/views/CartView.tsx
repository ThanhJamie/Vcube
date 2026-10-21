import React, { useEffect, useState } from 'react';
import { CartItem, VatLine } from '../../types';
import { useCartStore } from '../stores/useCartStore';
import { computeShippingFee, DEFAULT_SALES_RULES } from '../../backend/supabase/database';
import { computeVat, vatLabel, vatNotConfiguredLabel, vatRateFromPercent, vatTotalNote } from '../lib/vat';
import { usePricingGlobalSettings } from '../hooks/useSettings';
import { Button, Card, EmptyState, Icon, Input, Money } from '@frontend/ui';

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

  // P0: mã giảm giá sống trong store để KHÔNG mất khi sang /checkout.
  const appliedDiscount = useCartStore((s) => s.appliedDiscount);
  const appliedPromoCode = useCartStore((s) => s.appliedPromoCode);
  const clearAppliedDiscount = useCartStore((s) => s.clearAppliedDiscount);

  // Đợt 9 (R1): tỉ lệ VAT đọc từ `pricing_global_settings.vat_percent` — hết 8% cứng.
  // Hook đứng TRƯỚC `if (cart.length === 0) return …` bên dưới (luật hook của React).
  const { data: pricingGlobal, loading: pricingLoading, error: pricingError } = usePricingGlobalSettings();
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
      text: `Không xác thực được mã "${code}": hệ thống chưa có danh sách khuyến mãi nào để đối chiếu, nên không khoản giảm giá nào được áp dụng.`,
      isError: true
    });
    // Phản hồi ngay cạnh ô nhập lẫn ở toast: mã KHÔNG được áp dụng, và vì sao.
    onShowToast('Mã ưu đãi không được áp dụng: hệ thống chưa có nguồn khuyến mãi để xác thực.');
  };

  // Khoản giảm giá do các mã cứng cũ vẫn nằm trong store (persist `vcube_cart_store`) nên vẫn
  // trừ tiền ở /cart và /checkout. Gỡ MỘT LẦN khi mở giỏ hàng và nói rõ vì sao — không âm
  // thầm giữ một khoản giảm giá không có nguồn xác thực.
  useEffect(() => {
    if (useCartStore.getState().appliedDiscount > 0) {
      clearAppliedDiscount();
      setPromoMessage({
        text: 'Khoản giảm giá đang ghi trên đơn không có nguồn xác thực trong hệ thống nên đã được gỡ bỏ.',
        isError: true
      });
    }
  }, [clearAppliedDiscount]);

  // EMPTY CART STATE
  if (cart.length === 0) {
    return (
      <div className="flex items-center justify-center bg-canvas px-4 py-16 sm:px-6 sm:py-24">
        {/* A11Y-09: nhánh giỏ trống là màn duy nhất của `/cart` không có heading cấp 1.
            `sr-only` (absolute) nên không đổi layout; EmptyState giữ nguyên title dạng chữ. */}
        <h1 className="sr-only">Giỏ Hàng</h1>
        <EmptyState
          bordered
          className="w-full max-w-md bg-surface"
          icon={<Icon name="shopping_cart" size={22} />}
          title="Giỏ hàng của bạn đang trống"
          description={
            <>
              Chưa có bản vẽ kỹ thuật CAD hoặc linh kiện in 3D nào được chọn. Hãy khám phá kho thư viện cơ khí tuyển chọn của VCUBE.
              <span className="mt-2 block">
                <button
                  type="button"
                  onClick={() => onNavigate('tool_3d')}
                  className="cursor-pointer rounded-sm text-sm font-medium text-fg underline underline-offset-4 transition-colors duration-200 hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Báo Giá Mesh STL
                </button>
              </span>
            </>
          }
          action={
            <Button
              variant="primary"
              size="lg"
              leadingIcon={<Icon name="explore" size={18} />}
              onClick={() => onNavigate('explore')}
            >
              Khám Phá Bản Vẽ CAD
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header & Step Navigation */}
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 font-mono text-xs text-fg-subtle">
              <span className="font-bold text-fg">BƯỚC 01/03</span>
              <span>•</span>
              <span className="uppercase">Kiểm tra danh mục đặt hàng</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              {'Giỏ Hàng & Cấu Hình Đơn'}
              <span className="ml-2 font-mono text-lg font-normal text-fg-subtle">
                ({cart.reduce((a, b) => a + b.quantity, 0)} mục)
              </span>
            </h1>
          </div>

          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Icon name="arrow_back" size={18} />}
            onClick={() => onNavigate('explore')}
          >
            Tiếp tục chọn bản vẽ
          </Button>
        </div>

        {/* Free Shipping Progress Banner for Physical Orders */}
        {physicalItems.length > 0 && (
          <Card variant="soft" padding="md" className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Icon name="local_shipping" size={18} className="shrink-0 text-fg-muted" />
                {remainingForFreeShip > 0 ? (
                  <span className="text-fg-muted">
                    {'Mua thêm '}
                    <Money as="strong" value={remainingForFreeShip} size="sm" className="font-mono font-semibold text-fg" />
                    {' để được MIỄN PHÍ VẬN CHUYỂN toàn quốc!'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-positive">
                    <Icon name="verified" size={16} />
                    {'Đủ điều kiện MIỄN PHÍ GIAO HÀNG toàn quốc (đơn từ '}
                    <Money value={freeShippingThreshold} size="sm" className="font-mono font-semibold text-positive" />
                    )!
                  </span>
                )}
              </div>
              <span className="font-mono font-semibold tabular-nums text-fg">{freeShipPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${freeShipPercent}%` }}
              />
            </div>
          </Card>
        )}

        {/* Main Cart Layout: Left Items + Right Sticky Summary */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Cart Items categorized by Persona */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. DIGITAL CAD ASSETS SECTION */}
            {digitalItems.length > 0 && (
              <Card as="section" variant="soft" padding="lg" className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-line-subtle pb-4">
                  <div className="flex items-center gap-2">
                    <Icon name="folder_zip" size={18} className="text-fg-muted" />
                    <h2 className="text-lg font-bold tracking-tight text-fg">
                      Bản Quyền Tệp CAD Kỹ Thuật ({digitalItems.length})
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg-muted">
                    Tệp số • Không phí vận chuyển
                  </span>
                </div>

                <div className="space-y-3">
                  {digitalItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-4 rounded-lg border border-line-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 shrink-0 rounded-md border border-line-subtle bg-surface-muted object-cover"
                        />
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                            {item.designer}
                          </span>
                          <h3 className="text-base font-semibold text-fg">{item.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-fg-subtle">
                            <span>Định dạng: <strong className="font-mono font-semibold text-fg">{item.fileFormat || '—'}</strong></span>
                            <span>•</span>
                            <span className="font-semibold text-positive">{item.licenseType || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full shrink-0 items-center justify-between gap-3 border-t border-line-subtle pt-3 sm:w-auto sm:gap-6 sm:border-t-0 sm:pt-0">
                        <div className="min-w-0 text-right">
                          <Money value={item.price} size="base" className="block whitespace-nowrap font-mono font-semibold text-fg" />
                          <span className="text-xs text-fg-subtle">Giá một tệp</span>
                        </div>

                        <Button
                          iconOnly
                          variant="danger-ghost"
                          size="sm"
                          title="Xóa khỏi giỏ hàng"
                          aria-label="Xóa khỏi giỏ hàng"
                          onClick={() => onRemoveItem(item.id)}
                          leadingIcon={<Icon name="delete" size={16} />}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 2. PHYSICAL 3D PRINT FABRICATIONS SECTION */}
            {physicalItems.length > 0 && (
              <Card as="section" variant="soft" padding="lg" className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-line-subtle pb-4">
                  <div className="flex items-center gap-2">
                    <Icon name="precision_manufacturing" size={18} className="text-fg-muted" />
                    <h2 className="text-lg font-bold tracking-tight text-fg">
                      Sản Phẩm In 3D Gia Công Vật Lý ({physicalItems.length})
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg-muted">
                    Đo kiểm theo thoả thuận
                  </span>
                </div>

                <div className="space-y-3">
                  {physicalItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-4 rounded-lg border border-line-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3 sm:items-center">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 shrink-0 rounded-md border border-line-subtle bg-surface-muted object-cover"
                        />
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                            {item.designer}
                          </span>
                          <h3 className="text-base font-semibold text-fg">{item.name}</h3>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                            <span>Vật liệu: <strong className="font-semibold text-fg">{item.material}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              Màu:
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full border border-line"
                                style={{ backgroundColor: item.colorHex || 'var(--color-line)' }}
                              />
                              <strong className="font-semibold text-fg">{item.color}</strong>
                            </span>
                            {item.resolution && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{item.resolution}</span>
                              </>
                            )}
                          </div>

                          {item.customText && (
                            <p className="inline-block rounded-sm border border-line-subtle bg-surface-muted px-2 py-0.5 text-xs text-fg-muted">
                              Khắc laser: "{item.customText}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex w-full shrink-0 items-center justify-between gap-3 border-t border-line-subtle pt-3 sm:w-auto sm:gap-6 sm:border-t-0 sm:pt-0">
                        {/* Quantity Selector */}
                        <div className="flex items-center overflow-hidden rounded-md border border-line-control bg-surface">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            aria-label={`Giảm số lượng ${item.name}`}
                            className="touch-target-btn cursor-pointer select-none px-3 py-1.5 font-mono text-xs font-semibold text-fg transition-colors duration-200 hover:bg-surface-muted active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            -
                          </button>
                          <span
                            className="border-x border-line bg-surface px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-fg"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            aria-label={`Tăng số lượng ${item.name}`}
                            className="touch-target-btn cursor-pointer select-none px-3 py-1.5 font-mono text-xs font-semibold text-fg transition-colors duration-200 hover:bg-surface-muted active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Breakdown */}
                        <div className="min-w-0 text-right">
                          <Money value={item.price * item.quantity} size="base" className="block whitespace-nowrap font-mono font-semibold tabular-nums text-fg" />
                          <span className="font-mono text-xs text-fg-subtle">
                            <Money value={item.price} size="sm" /> / cái
                          </span>
                        </div>

                        <Button
                          iconOnly
                          variant="danger-ghost"
                          size="sm"
                          title="Xóa linh kiện này"
                          aria-label="Xóa linh kiện này"
                          onClick={() => onRemoveItem(item.id)}
                          leadingIcon={<Icon name="delete" size={16} />}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Interactive Promo Voucher Box */}
            <Card variant="soft" padding="lg" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="cart-promo-code" className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  <Icon name="confirmation_number" size={16} />
                  Mã Giảm Giá / Ưu Đãi Doanh Nghiệp
                </label>
                {appliedDiscount > 0 && (
                  <span className="font-mono text-xs font-semibold text-positive">
                    {appliedPromoCode ? `${appliedPromoCode} • ` : ''}- <Money value={appliedDiscount} size="sm" className="font-mono text-positive" />
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="cart-promo-code"
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Nhập mã ưu đãi..."
                    className="font-mono uppercase"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => handleApplyPromo()}
                >
                  Áp dụng
                </Button>
              </div>

              {/* KHÔNG còn "mã gợi ý": các mã cũ (VCUBE10 / TECH3D / VN3DHUN) không có
                  nguồn nào trong schema nên không được quảng cáo như mã thật. */}
              <p className="pt-1 text-xs leading-relaxed text-fg-subtle">
                Hệ thống chưa có danh sách khuyến mãi để đối chiếu: mọi mã đều bị từ chối và không mã nào thay đổi số tiền phải trả.
              </p>

              {promoMessage && (
                <p className={`mt-1 text-xs ${promoMessage.isError ? 'text-danger' : 'font-semibold text-positive'}`}>
                  {promoMessage.text}
                </p>
              )}
            </Card>
          </div>

          {/* Right Column: Sticky Order Summary Card */}
          <div className="lg:col-span-4">
            <Card variant="soft" padding="lg" className="space-y-6 lg:sticky lg:top-24">
              <h2 className="border-b border-line-subtle pb-4 text-lg font-bold tracking-tight text-fg">
                Tóm Tắt Đơn Hàng
              </h2>

              <div className="space-y-3 text-sm text-fg-muted">
                {digitalItems.length > 0 && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span>Tạm tính tệp CAD ({digitalItems.length}):</span>
                    <Money value={subtotalDigital} size="base" className="font-mono font-semibold tabular-nums text-right text-fg" />
                  </div>
                )}

                {physicalItems.length > 0 && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span>Tạm tính in 3D ({physicalItems.reduce((a, b) => a + b.quantity, 0)} sản phẩm):</span>
                    <Money value={subtotalPhysical} size="base" className="font-mono font-semibold tabular-nums text-right text-fg" />
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Phí vận chuyển:</span>
                    {shippingFee === 0 && physicalItems.length > 0 && (
                      <span className="inline-flex items-center rounded-full border border-positive/20 bg-positive-tint px-2.5 py-1 text-xs font-medium text-positive">
                        Miễn phí vận chuyển
                      </span>
                    )}
                  </div>
                  <span className={`text-right font-mono tabular-nums ${shippingFee === 0 ? 'font-semibold text-positive' : 'font-semibold text-fg'}`}>
                    {physicalItems.length === 0 ? (
                      'Không áp dụng'
                    ) : shippingFee === 0 ? (
                      'Miễn phí'
                    ) : (
                      <Money value={shippingFee} size="base" className="font-mono font-semibold tabular-nums" />
                    )}
                  </span>
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between gap-4 text-sm font-semibold text-positive">
                    <span>Giảm giá ưu đãi{appliedPromoCode ? ` (${appliedPromoCode})` : ''}:</span>
                    <span className="text-right font-mono tabular-nums">- <Money value={appliedDiscount} size="base" className="font-mono text-positive" /></span>
                  </div>
                )}

                {vat ? (
                  <div className="flex justify-between gap-4 text-sm">
                    <span>{vatLabel(vat.rate)}:</span>
                    <Money value={vat.amount} size="base" className="font-mono font-semibold tabular-nums text-right text-fg" />
                  </div>
                ) : pricingError ? (
                  <p className="text-xs leading-relaxed text-danger">
                    {`Không đọc được cấu hình VAT: ${pricingError}`}
                  </p>
                ) : pricingLoading && pricingGlobal === null ? (
                  <p className="text-xs leading-relaxed text-fg-subtle">Đang đọc cấu hình VAT…</p>
                ) : (
                  <p className="text-xs leading-relaxed text-fg-subtle">{vatNotConfiguredLabel()}</p>
                )}

                <div className="flex items-baseline justify-between gap-4 border-t border-line-subtle pt-4">
                  <span className="text-lg font-bold text-fg">Tổng thanh toán:</span>
                  <div className="text-right">
                    <Money value={totalAmount} size="heading" className="block font-mono tabular-nums text-right text-fg" />
                    <span className="block text-xs text-fg-subtle">
                      {vatTotalNote(vatRate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Checkout Action */}
              <Button
                size="lg"
                fullWidth
                variant="primary"
                onClick={() => onNavigate('checkout')}
                trailingIcon={<Icon name="arrow_forward" size={18} />}
              >
                <span>TIẾN HÀNH THANH TOÁN</span>
              </Button>

              {/* Guarantee badges */}
              <div className="space-y-2 border-t border-line-subtle pt-4 text-xs text-fg-subtle">
                <div className="flex items-center gap-2">
                  <Icon name="lock" size={16} className="shrink-0 text-fg-muted" />
                  <span>Đơn hàng được lưu trên hệ thống VCUBE; thanh toán do VCUBE đối soát thủ công</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="verified" size={16} className="shrink-0 text-fg-muted" />
                  <span>In lại miễn phí nếu lỗi kỹ thuật thuộc VCUBE (theo điều khoản)</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
