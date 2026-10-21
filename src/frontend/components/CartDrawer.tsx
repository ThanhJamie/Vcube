import React from 'react';
import { CartItem } from '../../types';
import { useCartStore } from '@frontend/stores/useCartStore';
import { computeShippingFee, DEFAULT_SALES_RULES } from '../../backend/supabase/database';
import { computeVat, vatLabel, vatNotConfiguredLabel, vatRateFromPercent, vatTotalNote } from '../lib/vat';
import { usePricingGlobalSettings } from '../hooks/useSettings';
import { Button, EmptyState, Icon, Modal, Money } from '@frontend/ui';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onNavigate: (screen: string, payload?: any) => void;
  /** Nguồn duy nhất cho phí ship / ngưỡng freeship (từ `site_content`). */
  siteContent?: { standardShippingFee?: number; freeShippingThreshold?: number };
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate,
  siteContent
}) => {

  // Mã giảm giá đọc từ store
  const appliedDiscount = useCartStore((st) => st.appliedDiscount);

  // Cấu hình tỉ lệ thuế VAT
  const { data: pricingGlobal, loading: pricingLoading, error: pricingError } = usePricingGlobalSettings();
  const vatRate = vatRateFromPercent(pricingGlobal?.vatPercent);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const physicalItems = cart.filter((i) => i.type === 'physical');
  const digitalItems = cart.filter((i) => i.type === 'digital');

  const subtotalPhysical = physicalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotalDigital = digitalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotal = subtotalPhysical + subtotalDigital;

  // Phí vận chuyển từ cấu hình site_content hoặc mặc định
  const freeShippingThreshold = siteContent?.freeShippingThreshold ?? DEFAULT_SALES_RULES.freeShippingThreshold;
  const shippingFee = computeShippingFee(subtotalPhysical, physicalItems.length > 0, siteContent);
  const isFreeShipping = physicalItems.length > 0 && shippingFee === 0;
  const remainingForFreeShip = Math.max(0, freeShippingThreshold - subtotalPhysical);
  const progressPercent = freeShippingThreshold > 0
    ? Math.min(100, Math.round((subtotalPhysical / freeShippingThreshold) * 100))
    : 0;

  // Tính thuế VAT theo cấu hình
  const afterDiscount = Math.max(0, subtotal + shippingFee - appliedDiscount);
  const vat = computeVat(afterDiscount, vatRate);
  const totalAmount = vat ? vat.total : afterDiscount;

  const handleCheckout = () => {
    onClose();
    onNavigate('checkout');
  };

  const handleGoToCart = () => {
    onClose();
    onNavigate('cart');
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      placement="right"
      showCloseButton={false}
      bodyClassName="flex min-h-0 flex-1 flex-col"
      panelClassName="font-sans"
      aria-label="Giỏ hàng"
    >
      {/*
        CC-01 (B) — BẪY StrictMode: trước đây `if (!isOpen) return null` khiến `<Modal>` chỉ
        mount lúc mở; cleanup ở lần mount đầu gọi `dialog.close()`, sự kiện `close` bắn bất đồng bộ
        vào listener của lần mount thứ hai ⇒ drawer tự đóng (nút giỏ hàng như bị chết ở dev).
        Sửa theo `CadQuickViewModal`: `<Modal>` LUÔN mount, chỉ nội dung theo `isOpen`.
      */}
      {isOpen && (
        <>
          {/* Drawer Header */}
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface p-4">
            <div className="flex min-w-0 items-center gap-2">
              <Icon name="shopping_cart" size={20} className="shrink-0 text-fg-muted" />
              <h2 className="truncate text-base font-semibold tracking-tight text-fg">
                Giỏ Hàng Chế Tác
              </h2>
              <span className="rounded-full bg-primary px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-primary-fg">
                {totalItemsCount}
              </span>
            </div>

            <Button
              iconOnly
              variant="ghost"
              size="sm"
              aria-label="Đóng giỏ hàng"
              onClick={onClose}
            >
              <Icon name="close" size={20} />
            </Button>
          </div>

          {/* Free Shipping Progress Indicator (if physical items exist) */}
          {physicalItems.length > 0 && (
            <div className="border-b border-line bg-info-tint px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3 font-mono text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-info">
                  <Icon name="local_shipping" size={16} className="shrink-0" />
                  {isFreeShipping ? (
                    'Đã đạt miễn phí vận chuyển!'
                  ) : (
                    <>
                      {'Thêm '}
                      <Money value={remainingForFreeShip} size="sm" className="font-mono font-semibold text-info" />
                      {' để được miễn phí vận chuyển'}
                    </>
                  )}
                </span>
                <span className="font-semibold tabular-nums text-info">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-info transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Drawer Body - Items List */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <EmptyState
                size="sm"
                icon={<Icon name="remove_shopping_cart" size={20} />}
                title="Giỏ hàng đang trống"
                description="Chọn mẫu 3D từ sàn VCUBE hoặc tải tệp CAD lên để báo giá ngay."
                action={
                  <Button
                    variant="primary"
                    size="md"
                    leadingIcon={<Icon name="explore" size={16} />}
                    onClick={() => {
                      onClose();
                      onNavigate('explore');
                    }}
                  >
                    Khám Phá Bản Vẽ
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-md border border-line-subtle p-3">
                    {/* Item Thumbnail */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-line-subtle bg-surface-muted">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Không thay bằng ảnh stock bịa: ẩn ảnh hỏng và để lộ nền trung tính.
                          const el = e.currentTarget;
                          el.style.visibility = 'hidden';
                        }}
                      />
                      <span className={`absolute inset-x-0 bottom-0 py-0.5 text-center font-mono text-xs font-semibold ${
                        item.type === 'physical' ? 'bg-primary text-primary-fg' : 'border-t border-line bg-surface-muted text-fg'
                      }`}>
                        {item.type === 'physical' ? 'IN 3D' : 'CAD'}
                      </span>
                    </div>

                    {/* Item Details */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-sm font-semibold leading-snug text-fg">
                            {item.name}
                          </h3>
                          <Button
                            iconOnly
                            variant="danger-ghost"
                            size="sm"
                            title="Xóa sản phẩm"
                            aria-label="Xóa sản phẩm"
                            onClick={() => onRemoveItem(item.id)}
                            leadingIcon={<Icon name="delete" size={16} />}
                          />
                        </div>

                        {/* Specs summary */}
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-fg-subtle">
                          {item.material && (
                            <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-mono font-medium text-fg-muted">
                              {item.material}
                            </span>
                          )}
                          {item.color && (
                            <span className="flex items-center gap-1 rounded-sm bg-surface-muted px-1.5 py-0.5">
                              {item.colorHex && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full border border-line-control"
                                  style={{ backgroundColor: item.colorHex }}
                                />
                              )}
                              {item.color}
                            </span>
                          )}
                          {item.customText && (
                            <span className="rounded-sm border border-warning/20 bg-warning-tint px-1.5 py-0.5 font-medium text-warning">
                              Khắc: "{item.customText}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Unit Price */}
                      <div className="flex items-center justify-between gap-3">
                        {item.type === 'physical' ? (
                          <div className="flex items-center overflow-hidden rounded-md border border-line-control bg-surface font-mono">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              aria-label={`Giảm số lượng ${item.name}`}
                              className="flex min-h-11 min-w-11 cursor-pointer select-none items-center justify-center text-xs text-fg-muted transition-colors duration-200 hover:bg-surface-muted hover:text-fg active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-semibold tabular-nums text-fg">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              aria-label={`Tăng số lượng ${item.name}`}
                              className="flex min-h-11 min-w-11 cursor-pointer select-none items-center justify-center text-xs text-fg-muted transition-colors duration-200 hover:bg-surface-muted hover:text-fg active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-fg-subtle">
                            Bản quyền kỹ thuật số
                          </span>
                        )}

                        <Money value={item.price * item.quantity} size="base" className="font-mono font-semibold tabular-nums text-right text-fg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="space-y-4 border-t border-line bg-surface p-4">
              {/* Order Breakdown Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3 text-fg-muted">
                  <span>Tạm tính:</span>
                  <Money value={subtotal} size="base" className="font-mono font-semibold tabular-nums text-right text-fg" />
                </div>
                {physicalItems.length > 0 && (
                  <div className="flex items-center justify-between gap-3 text-fg-muted">
                    <span>Vận chuyển:</span>
                    <span className={`text-right font-mono tabular-nums ${isFreeShipping ? 'font-semibold text-positive' : 'text-fg'}`}>
                      {isFreeShipping ? (
                        'MIỄN PHÍ'
                      ) : (
                        <Money value={shippingFee} size="base" className="font-mono tabular-nums" />
                      )}
                    </span>
                  </div>
                )}
                {appliedDiscount > 0 && (
                  <div className="flex items-center justify-between gap-3 font-semibold text-positive">
                    <span>Giảm giá ưu đãi:</span>
                    <span className="text-right font-mono tabular-nums">- <Money value={appliedDiscount} size="base" className="font-mono text-positive" /></span>
                  </div>
                )}
                {vat ? (
                  <div className="flex items-center justify-between gap-3 text-fg-muted">
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
                <div className="flex items-baseline justify-between gap-3 border-t border-line-subtle pt-4 text-fg">
                  <span className="text-lg font-bold">Tổng thanh toán:</span>
                  <div className="text-right">
                    <Money value={totalAmount} size="heading" className="block font-mono tabular-nums text-right text-fg" />
                    <span className="block text-xs text-fg-subtle">
                      {vatTotalNote(vatRate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCheckout}
                  leadingIcon={<Icon name="lock" size={16} />}
                >
                  <span>Tiến Hành Đặt Hàng</span>
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={handleGoToCart}
                  leadingIcon={<Icon name="open_in_new" size={16} />}
                >
                  <span>Xem Toàn Bộ Giỏ Hàng</span>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

