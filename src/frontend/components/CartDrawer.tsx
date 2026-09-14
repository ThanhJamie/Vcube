import React, { useEffect } from 'react';
import { CartItem } from '../../types';
import { useLanguage } from '../context/LanguageContext';
import { useCartStore } from '../stores/useCartStore';
import { computeShippingFee, DEFAULT_SALES_RULES } from '../../backend/supabase/database';
import { computeVat, vatLabel, vatNotConfiguredLabel, vatRateFromPercent, vatTotalNote } from '../lib/vat';
import { usePricingGlobalSettings } from '../hooks/useSettings';
import { Icon } from '@frontend/ui';

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
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Mã giảm giá đọc từ store — drawer phải khớp với cart page và checkout.
  const appliedDiscount = useCartStore((st) => st.appliedDiscount);

  // Đợt 9 (R1): tỉ lệ VAT là CẤU HÌNH trong `pricing_global_settings` — hết 8% cứng.
  // Hook đứng TRƯỚC `if (!isOpen) return null;` bên dưới (luật hook của React; A22a từng
  // gây crash trắng màn hình vì đặt hook sau early return).
  const { data: pricingGlobal } = usePricingGlobalSettings();
  const vatRate = vatRateFromPercent(pricingGlobal?.vatPercent);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const physicalItems = cart.filter((i) => i.type === 'physical');
  const digitalItems = cart.filter((i) => i.type === 'digital');

  const subtotalPhysical = physicalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotalDigital = digitalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotal = subtotalPhysical + subtotalDigital;

  // Phí ship từ MỘT nguồn duy nhất (trước đây drawer hardcode 30.000 inline).
  const freeShippingThreshold = siteContent?.freeShippingThreshold ?? DEFAULT_SALES_RULES.freeShippingThreshold;
  const shippingFee = computeShippingFee(subtotalPhysical, physicalItems.length > 0, siteContent);
  const isFreeShipping = physicalItems.length > 0 && shippingFee === 0;
  const remainingForFreeShip = Math.max(0, freeShippingThreshold - subtotalPhysical);
  const progressPercent = freeShippingThreshold > 0
    ? Math.min(100, Math.round((subtotalPhysical / freeShippingThreshold) * 100))
    : 0;

  // Giá niêm yết chưa gồm VAT; VAT là một dòng riêng, cùng con số với cart/checkout.
  // `pricing_global_settings.vat_percent` NULL ⇒ `vat === null` ⇒ ẨN dòng VAT.
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
    <div className="fixed inset-0 z-drawer overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-surface-inverse/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface shadow-e3 flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-canvas">
            <div className="flex items-center gap-2">
              <Icon name="shopping_cart" size={24} className="text-primary" />
              <h2 className="font-extrabold text-base text-fg tracking-tight">
                {isVi ? 'Giỏ Hàng Chế Tác' : 'Cart & Slicing Queue'}
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-primary text-primary-fg rounded-full">
                {totalItemsCount}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-sm text-fg-muted hover:text-fg hover:bg-line-subtle/60 transition-colors cursor-pointer"
              aria-label="Đóng giỏ hàng"
            >
              <Icon name="close" size={24} />
            </button>
          </div>

          {/* Free Shipping Progress Indicator (if physical items exist) */}
          {physicalItems.length > 0 && (
            <div className="px-4 sm:px-5 py-3 bg-info/10 border-b border-info/30 text-xs">
              <div className="flex items-center justify-between font-mono text-xs mb-1.5">
                <span className="flex items-center gap-1 text-info font-bold">
                  <Icon name="local_shipping" size={18} />
                  {isFreeShipping
                    ? (isVi ? 'Đã đạt Miễn Phí Vận Chuyển!' : 'Free Shipping Unlocked!')
                    : (isVi ? `Thêm ${remainingForFreeShip.toLocaleString('vi-VN')} đ để FreeShip` : `Add ${remainingForFreeShip.toLocaleString()} đ for Free Ship`)}
                </span>
                <span className="text-info font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-info/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Drawer Body - Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-lg bg-surface-muted flex items-center justify-center text-fg-subtle">
                  <Icon name="remove_shopping_cart" size={30} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-fg">
                    {isVi ? 'Giỏ hàng đang trống' : 'Your cart is empty'}
                  </h3>
                  <p className="text-xs text-fg-subtle mt-1 max-w-xs mx-auto">
                    {isVi
                      ? 'Chọn mẫu 3D từ Marketplace hoặc tải file CAD lên để báo giá ngay.'
                      : 'Explore our 3D CAD catalog or upload your custom model to request a quote.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('explore');
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-mono font-bold rounded-lg transition-all shadow-e1 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Icon name="explore" size={18} />
                  {isVi ? 'Khám Phá Bản Vẽ' : 'Browse Catalog'}
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 divide-y divide-line-subtle">
                {cart.map((item) => (
                  <div key={item.id} className="pt-3.5 first:pt-0 flex gap-3 group">
                    {/* Item Thumbnail */}
                    <div className="w-16 h-16 rounded-lg border border-line bg-surface-inverse shrink-0 overflow-hidden relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300';
                        }}
                      />
                      <span className={`absolute bottom-0 inset-x-0 text-xs font-mono text-center font-bold py-0.2 ${
                        item.type === 'physical' ? 'bg-primary text-primary-fg' : 'bg-surface-inverse text-on-inverse'
                      }`}>
                        {item.type === 'physical' ? 'IN 3D' : 'CAD'}
                      </span>
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-fg truncate leading-snug">
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-fg-subtle hover:text-danger transition-colors p-0.5 cursor-pointer shrink-0"
                            title="Xóa sản phẩm"
                          >
                            <Icon name="delete" size={18} />
                          </button>
                        </div>

                        {/* Specs summary */}
                        <div className="flex flex-wrap items-center gap-1 text-xs font-mono text-fg-subtle mt-0.5">
                          {item.material && (
                            <span className="bg-surface-muted px-1.5 py-0.5 rounded-sm text-primary font-semibold">
                              {item.material}
                            </span>
                          )}
                          {item.color && (
                            <span className="flex items-center gap-1 bg-surface-muted px-1.5 py-0.5 rounded-sm">
                              {item.colorHex && (
                                <span
                                  className="w-2 h-2 rounded-full border border-line-control shrink-0"
                                  style={{ backgroundColor: item.colorHex }}
                                />
                              )}
                              {item.color}
                            </span>
                          )}
                          {item.customText && (
                            <span className="bg-warning-tint text-warning border border-warning/30 px-1.5 py-0.5 rounded-sm">
                              Khắc: "{item.customText}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Unit Price */}
                      <div className="flex items-center justify-between mt-2 pt-1">
                        {item.type === 'physical' ? (
                          <div className="flex items-center border border-line-control rounded-lg bg-surface overflow-hidden font-mono">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="px-2 py-0.5 hover:bg-surface-muted text-fg-muted transition-colors cursor-pointer text-xs"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-bold text-fg">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="px-2 py-0.5 hover:bg-surface-muted text-fg-muted transition-colors cursor-pointer text-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-fg-subtle">
                            Bản quyền kỹ thuật số
                          </span>
                        )}

                        <span className="font-mono font-bold text-xs text-fg">
                          {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-line bg-canvas space-y-3">
              {/* Order Breakdown Summary */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between text-fg-muted">
                  <span>{isVi ? 'Tạm tính' : 'Subtotal'}:</span>
                  <span>{subtotal.toLocaleString('vi-VN')} đ</span>
                </div>
                {physicalItems.length > 0 && (
                  <div className="flex items-center justify-between text-fg-muted">
                    <span>{isVi ? 'Vận chuyển' : 'Shipping'}:</span>
                    <span className={isFreeShipping ? 'text-positive font-bold' : ''}>
                      {isFreeShipping
                        ? (isVi ? 'MIỄN PHÍ' : 'FREE')
                        : `${shippingFee.toLocaleString('vi-VN')} đ`}
                    </span>
                  </div>
                )}
                {appliedDiscount > 0 && (
                  <div className="flex items-center justify-between text-positive font-bold">
                    <span>{isVi ? 'Giảm giá ưu đãi' : 'Discount'}:</span>
                    <span>- {appliedDiscount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {vat ? (
                  <div className="flex items-center justify-between text-fg-muted">
                    <span>{vatLabel(vat.rate)}:</span>
                    <span>{vat.amount.toLocaleString('vi-VN')} đ</span>
                  </div>
                ) : (
                  <p className="text-xs text-fg-subtle leading-relaxed">{vatNotConfiguredLabel(isVi)}</p>
                )}
                <div className="flex items-baseline justify-between pt-2 border-t border-line text-fg">
                  <span className="font-extrabold text-sm">{isVi ? 'Tổng thanh toán' : 'Total'}:</span>
                  <div className="text-right">
                    <span className="font-extrabold text-lg text-primary">
                      {totalAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="block text-xs text-fg-subtle font-sans">
                      {vatTotalNote(isVi, vatRate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1 font-mono">
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-e1 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icon name="lock" size={18} />
                  <span>{isVi ? 'Tiến Hành Đặt Hàng' : 'Proceed to Checkout'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToCart}
                  className="w-full py-2 bg-surface hover:bg-surface-muted border border-line-control text-fg font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icon name="open_in_new" size={18} />
                  <span>{isVi ? 'Xem Toàn Bộ Giỏ Hàng' : 'View Full Cart Details'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

