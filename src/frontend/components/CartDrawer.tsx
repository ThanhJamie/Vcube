import React, { useEffect } from 'react';
import { CartItem } from '../../types';
import { useLanguage } from '../context/LanguageContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onNavigate: (screen: string, payload?: any) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

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
  const totalAmount = subtotalPhysical + subtotalDigital;

  // Free shipping threshold: 300,000 VND
  const freeShippingThreshold = 300000;
  const isFreeShipping = subtotalPhysical >= freeShippingThreshold;
  const remainingForFreeShip = Math.max(0, freeShippingThreshold - subtotalPhysical);
  const progressPercent = Math.min(100, Math.round((subtotalPhysical / freeShippingThreshold) * 100));

  const handleCheckout = () => {
    onClose();
    onNavigate('checkout');
  };

  const handleGoToCart = () => {
    onClose();
    onNavigate('cart');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#CBD5E1] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-[#CBD5E1] flex items-center justify-between bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A] text-xl">shopping_cart</span>
              <h2 className="font-extrabold text-base text-[#091426] tracking-tight">
                {isVi ? 'Giỏ Hàng Chế Tác' : 'Cart & Slicing Queue'}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#00687A] text-white rounded-full">
                {totalItemsCount}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#091426] hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Đóng giỏ hàng"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Free Shipping Progress Indicator (if physical items exist) */}
          {physicalItems.length > 0 && (
            <div className="px-4 sm:px-5 py-3 bg-[#EFF6FF] border-b border-[#BFDBFE]/60 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px] mb-1.5">
                <span className="flex items-center gap-1 text-[#1E40AF] font-bold">
                  <span className="material-symbols-outlined text-sm">local_shipping</span>
                  {isFreeShipping
                    ? (isVi ? 'Đã đạt Miễn Phí Vận Chuyển!' : 'Free Shipping Unlocked!')
                    : (isVi ? `Thêm ${remainingForFreeShip.toLocaleString('vi-VN')} đ để FreeShip` : `Add ${remainingForFreeShip.toLocaleString()} đ for Free Ship`)}
                </span>
                <span className="text-[#1E40AF] font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-blue-200/70 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#00687A] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Drawer Body - Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#94A3B8]">
                  <span className="material-symbols-outlined text-3xl">remove_shopping_cart</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#091426]">
                    {isVi ? 'Giỏ hàng đang trống' : 'Your cart is empty'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
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
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005260] text-white text-xs font-mono font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">explore</span>
                  {isVi ? 'Khám Phá Bản Vẽ' : 'Browse Catalog'}
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 divide-y divide-slate-100">
                {cart.map((item) => (
                  <div key={item.id} className="pt-3.5 first:pt-0 flex gap-3 group">
                    {/* Item Thumbnail */}
                    <div className="w-16 h-16 rounded-xl border border-[#CBD5E1] bg-[#091426] shrink-0 overflow-hidden relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300';
                        }}
                      />
                      <span className={`absolute bottom-0 inset-x-0 text-[8px] font-mono text-center font-bold text-white py-0.2 ${
                        item.type === 'physical' ? 'bg-[#00687A]' : 'bg-[#091426]'
                      }`}>
                        {item.type === 'physical' ? 'IN 3D' : 'CAD'}
                      </span>
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-[#091426] truncate leading-snug">
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer shrink-0"
                            title="Xóa sản phẩm"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>

                        {/* Specs summary */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-slate-500 mt-0.5">
                          {item.material && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[#00687A] font-semibold">
                              {item.material}
                            </span>
                          )}
                          {item.color && (
                            <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.colorHex && (
                                <span
                                  className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                                  style={{ backgroundColor: item.colorHex }}
                                />
                              )}
                              {item.color}
                            </span>
                          )}
                          {item.customText && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                              Khắc: "{item.customText}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Unit Price */}
                      <div className="flex items-center justify-between mt-2 pt-1">
                        {item.type === 'physical' ? (
                          <div className="flex items-center border border-[#CBD5E1] rounded-lg bg-white overflow-hidden font-mono">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="px-2 py-0.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer text-xs"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-bold text-[#091426]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="px-2 py-0.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer text-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            Bản quyền kỹ thuật số
                          </span>
                        )}

                        <span className="font-mono font-bold text-xs text-[#091426]">
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
            <div className="p-4 sm:p-5 border-t border-[#CBD5E1] bg-[#F8FAFC] space-y-3">
              {/* Order Breakdown Summary */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{isVi ? 'Tạm tính' : 'Subtotal'}:</span>
                  <span>{totalAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                {physicalItems.length > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{isVi ? 'Vận chuyển' : 'Shipping'}:</span>
                    <span className={isFreeShipping ? 'text-emerald-700 font-bold' : ''}>
                      {isFreeShipping ? (isVi ? 'MIỄN PHÍ' : 'FREE') : '30.000 đ'}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between pt-2 border-t border-[#CBD5E1] text-[#091426]">
                  <span className="font-extrabold text-sm">{isVi ? 'Tổng thanh toán' : 'Total'}:</span>
                  <div className="text-right">
                    <span className="font-extrabold text-lg text-[#00687A]">
                      {(totalAmount + (isFreeShipping || physicalItems.length === 0 ? 0 : 30000)).toLocaleString('vi-VN')} đ
                    </span>
                    <span className="block text-[9px] text-slate-400 font-sans">
                      {isVi ? '(Đã gồm VAT & QC dung sai)' : '(VAT & QC metrology included)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1 font-mono">
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-3 bg-[#00687A] hover:bg-[#005260] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">lock</span>
                  <span>{isVi ? 'Tiến Hành Đặt Hàng' : 'Proceed to Checkout'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToCart}
                  className="w-full py-2 bg-white hover:bg-slate-100 border border-[#CBD5E1] text-[#091426] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
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

