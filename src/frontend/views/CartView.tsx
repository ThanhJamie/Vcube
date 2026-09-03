import React, { useState } from 'react';
import { CartItem } from '../../types';
import { useLanguage } from '../context/LanguageContext';

interface CartViewProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const CartView: React.FC<CartViewProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate,
  onShowToast
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const physicalItems = cart.filter(i => i.type === 'physical');
  const digitalItems = cart.filter(i => i.type === 'digital');

  const subtotalPhysical = physicalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotalDigital = digitalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotal = subtotalPhysical + subtotalDigital;

  // Free shipping threshold: 300,000 VND for physical parts
  const freeShippingThreshold = 300000;
  const shippingFee = physicalItems.length > 0 ? (subtotalPhysical >= freeShippingThreshold ? 0 : 30000) : 0;
  const remainingForFreeShip = Math.max(0, freeShippingThreshold - subtotalPhysical);
  const freeShipPercent = Math.min(100, Math.round((subtotalPhysical / freeShippingThreshold) * 100));

  const totalAmount = Math.max(0, subtotal + shippingFee - appliedDiscount);

  const handleApplyPromo = (codeToApply?: string) => {
    const code = (codeToApply || promoCode).trim().toUpperCase();
    if (!code) return;

    if (code === 'TECH3D') {
      const disc = 20000;
      setAppliedDiscount(disc);
      setPromoMessage({ text: isVi ? 'Áp dụng mã TECH3D: Giảm 20.000 đ' : 'Promo TECH3D applied: 20,000 VND OFF', isError: false });
      onShowToast(isVi ? 'Đã áp dụng mã giảm giá 20.000 đ!' : 'Applied 20,000 VND discount!');
    } else if (code === 'VCUBE10' || code === 'VN3DHUB') {
      const disc = Math.round(subtotal * 0.1);
      setAppliedDiscount(disc);
      setPromoMessage({ text: isVi ? `Áp dụng mã ${code}: Giảm 10% (-${disc.toLocaleString('vi-VN')} đ)` : `Promo ${code} applied: 10% OFF`, isError: false });
      onShowToast(isVi ? 'Đã áp dụng mã ưu đãi 10%!' : 'Applied 10% discount!');
    } else {
      setPromoMessage({ text: isVi ? 'Mã ưu đãi không hợp lệ. Vui lòng kiểm tra lại.' : 'Invalid promo code. Please check again.', isError: true });
    }
  };

  // EMPTY CART STATE
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-16 sm:py-24 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-white p-8 sm:p-10 rounded-2xl border border-[#CBD5E1] shadow-md space-y-6">
          <div className="w-16 h-16 bg-[#00687A]/10 text-[#00687A] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-3xl">shopping_cart</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-extrabold text-xl text-[#091426]">
              {isVi ? 'Giỏ hàng của bạn đang trống' : 'Your cart is empty'}
            </h2>
            <p className="text-xs text-[#64748B] font-mono leading-relaxed">
              {isVi
                ? 'Chưa có bản vẽ kỹ thuật CAD hoặc linh kiện in 3D nào được chọn. Hãy khám phá kho thư viện cơ khí tuyển chọn của VCUBE.'
                : 'No CAD files or 3D printed parts added yet. Explore the curated mechanical catalog.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('explore')}
              className="px-6 py-3.5 bg-[#00687A] hover:bg-[#005260] text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-target-btn"
            >
              <span className="material-symbols-outlined text-base">explore</span>
              <span>{isVi ? 'Khám Phá Bản Vẽ CAD' : 'Explore CAD Catalog'}</span>
            </button>
            <button
              onClick={() => onNavigate('tool_3d')}
              className="px-6 py-3.5 border border-[#CBD5E1] hover:border-[#00687A] hover:bg-[#F8FAFC] text-[#091426] font-mono text-xs uppercase tracking-wider font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer touch-target-btn shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>{isVi ? 'Báo Giá Mesh STL' : 'Instant Quote STL'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091426] py-6 sm:py-10 px-4 sm:px-6 md:px-12 pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header & Step Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#CBD5E1]">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#64748B] mb-1">
              <span className="text-[#00687A] font-bold">BƯỚC 01/03</span>
              <span>•</span>
              <span className="uppercase">Kiểm tra danh mục đặt hàng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091426]">
              {isVi ? 'Giỏ Hàng & Cấu Hình Đơn' : 'Shopping Cart & Manifest'}
              <span className="text-[#64748B] text-lg font-mono font-normal ml-2">
                ({cart.reduce((a, b) => a + b.quantity, 0)} {isVi ? 'mục' : 'items'})
              </span>
            </h1>
          </div>

          <button
            onClick={() => onNavigate('explore')}
            className="text-xs font-mono font-bold text-[#00687A] hover:text-[#005260] flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs hover:border-[#00687A] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>{isVi ? 'Tiếp tục chọn bản vẽ' : 'Continue Shopping'}</span>
          </button>
        </div>

        {/* Free Shipping Progress Banner for Physical Orders */}
        {physicalItems.length > 0 && (
          <div className="bg-white border border-[#CBD5E1] p-4 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00687A] text-lg">local_shipping</span>
                {remainingForFreeShip > 0 ? (
                  <span>
                    {isVi ? 'Mua thêm ' : 'Add '}
                    <strong className="text-[#00687A]">{remainingForFreeShip.toLocaleString('vi-VN')} đ</strong>
                    {isVi ? ' để được MIỄN PHÍ VẬN CHUYỂN toàn quốc!' : ' for FREE SHIPPING!'}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">verified</span>
                    {isVi ? 'Đủ điều kiện MIỄN PHÍ GIAO HÀNG toàn quốc (Đơn > 300k)!' : 'FREE SHIPPING UNLOCKED!'}
                  </span>
                )}
              </div>
              <span className="font-bold text-[#00687A]">{freeShipPercent}%</span>
            </div>
            <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden border border-[#CBD5E1]/60">
              <div
                className="bg-[#00687A] h-full rounded-full transition-all duration-500"
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
              <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00687A] text-lg">folder_zip</span>
                    <h2 className="font-extrabold text-sm sm:text-base text-[#091426]">
                      {isVi ? 'Bản Quyền File CAD Kỹ Thuật' : 'Digital CAD Files'} ({digitalItems.length})
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                    Tải Tức Thời • Phí Giao: 0 đ
                  </span>
                </div>

                <div className="divide-y divide-[#CBD5E1]">
                  {digitalItems.map((item) => (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover border border-[#CBD5E1] bg-[#091426] shrink-0"
                        />
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-[#00687A] font-bold uppercase tracking-wider block">
                            {item.designer}
                          </span>
                          <h3 className="font-bold text-sm text-[#091426] leading-tight">{item.name}</h3>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748B]">
                            <span>Định dạng: <strong className="text-[#091426]">{item.fileFormat || 'STL + STEP + 3MF'}</strong></span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">{item.licenseType || 'Commercial License'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#CBD5E1]/60">
                        <div className="text-right font-mono">
                          <span className="text-base font-extrabold text-[#00687A] block">
                            {item.price.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-[10px] text-[#64748B]">Bản quyền vĩnh viễn</span>
                        </div>

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-2 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer touch-target-btn"
                          title="Xóa khỏi giỏ hàng"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. PHYSICAL 3D PRINT FABRICATIONS SECTION */}
            {physicalItems.length > 0 && (
              <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#091426] text-lg">precision_manufacturing</span>
                    <h2 className="font-extrabold text-sm sm:text-base text-[#091426]">
                      {isVi ? 'Sản Phẩm In 3D Gia Công Vật Lý' : 'Physical 3D Prints'} ({physicalItems.length})
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-[#00687A] bg-[#00687A]/10 px-2 py-0.5 rounded-md">
                    QC Dung Sai ±0.05mm
                  </span>
                </div>

                <div className="divide-y divide-[#CBD5E1]">
                  {physicalItems.map((item) => (
                    <div key={item.id} className="py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover border border-[#CBD5E1] bg-[#091426] shrink-0"
                        />
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-[#00687A] font-bold uppercase tracking-wider block">
                            {item.designer}
                          </span>
                          <h3 className="font-bold text-sm text-[#091426] leading-tight">{item.name}</h3>
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#64748B]">
                            <span>Vật liệu: <strong className="text-[#091426]">{item.material}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              Màu:
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                                style={{ backgroundColor: item.colorHex || '#1C1C1C' }}
                              />
                              <strong className="text-[#091426]">{item.color}</strong>
                            </span>
                            {item.resolution && (
                              <>
                                <span>•</span>
                                <span>{item.resolution}</span>
                              </>
                            )}
                          </div>

                          {item.customText && (
                            <p className="text-[11px] font-mono text-[#00687A] bg-[#00687A]/5 px-2 py-0.5 rounded inline-block">
                              Khắc Laser: "{item.customText}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#CBD5E1]/60">
                        {/* Quantity Selector */}
                        <div className="flex items-center border border-[#CBD5E1] rounded-xl bg-[#F8FAFC] overflow-hidden shadow-2xs">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-1.5 hover:bg-white text-[#091426] font-bold text-xs font-mono touch-target-btn cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          <span className="px-3.5 py-1.5 font-mono text-xs font-bold text-[#091426] bg-white border-x border-[#CBD5E1]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-1.5 hover:bg-white text-[#091426] font-bold text-xs font-mono touch-target-btn cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right font-mono min-w-[90px]">
                          <span className="font-extrabold text-sm text-[#091426] block">
                            {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-[10px] text-[#64748B]">
                            {item.price.toLocaleString('vi-VN')} đ / cái
                          </span>
                        </div>

                        {/* Remove item */}
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-2 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer touch-target-btn"
                          title="Xóa linh kiện này"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Promo Voucher Box */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-bold text-[#091426] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#00687A] text-base">confirmation_number</span>
                  {isVi ? 'Mã Giảm Giá / Ưu Đãi Doanh Nghiệp' : 'Promo Voucher'}
                </span>
                {appliedDiscount > 0 && (
                  <span className="text-[11px] font-mono text-emerald-600 font-bold">
                    - {appliedDiscount.toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder={isVi ? 'Nhập mã VCUBE10, TECH3D...' : 'Enter promo code...'}
                  className="flex-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-[#091426] focus:outline-none focus:border-[#00687A]"
                />
                <button
                  type="button"
                  onClick={() => handleApplyPromo()}
                  className="px-4 py-2 bg-[#091426] hover:bg-[#00687A] text-white font-mono text-xs uppercase font-bold rounded-xl transition-all cursor-pointer touch-target-btn shadow-2xs"
                >
                  {isVi ? 'Áp dụng' : 'Apply'}
                </button>
              </div>

              {/* Quick voucher pill buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] font-mono text-[#64748B]">Gợi ý:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPromoCode('VCUBE10');
                    handleApplyPromo('VCUBE10');
                  }}
                  className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#00687A]/10 border border-[#CBD5E1] hover:border-[#00687A] rounded-lg text-[10px] font-mono font-bold text-[#00687A] transition-colors cursor-pointer"
                >
                  VCUBE10 (-10%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPromoCode('TECH3D');
                    handleApplyPromo('TECH3D');
                  }}
                  className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#00687A]/10 border border-[#CBD5E1] hover:border-[#00687A] rounded-lg text-[10px] font-mono font-bold text-[#00687A] transition-colors cursor-pointer"
                >
                  TECH3D (-20k)
                </button>
              </div>

              {promoMessage && (
                <p className={`text-xs font-mono mt-1 ${promoMessage.isError ? 'text-red-600' : 'text-emerald-700 font-bold'}`}>
                  {promoMessage.text}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Order Summary Card */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-md space-y-6 lg:sticky lg:top-24">
              <h2 className="font-extrabold text-base text-[#091426] border-b border-[#CBD5E1] pb-3 font-mono uppercase tracking-wide">
                {isVi ? 'Tóm Tắt Đơn Hàng' : 'Order Summary'}
              </h2>

              <div className="space-y-3 text-xs font-mono text-[#475569]">
                {digitalItems.length > 0 && (
                  <div className="flex justify-between">
                    <span>Tạm tính File CAD ({digitalItems.length}):</span>
                    <span className="font-bold text-[#091426]">{subtotalDigital.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                {physicalItems.length > 0 && (
                  <div className="flex justify-between">
                    <span>Tạm tính In 3D ({physicalItems.reduce((a, b) => a + b.quantity, 0)} sp):</span>
                    <span className="font-bold text-[#091426]">{subtotalPhysical.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span>Phí vận chuyển:</span>
                    {shippingFee === 0 && physicalItems.length > 0 && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">FREESHIP</span>
                    )}
                  </div>
                  <span className={`font-bold ${shippingFee === 0 ? 'text-emerald-700' : 'text-[#091426]'}`}>
                    {physicalItems.length === 0 ? '0 đ (Online)' : (shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`)}
                  </span>
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Giảm giá ưu đãi:</span>
                    <span>- {appliedDiscount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#CBD5E1] flex justify-between items-baseline">
                  <span className="text-sm font-bold text-[#091426]">Tổng thanh toán:</span>
                  <div className="text-right">
                    <span className="font-mono text-xl font-black text-[#00687A] block">
                      {totalAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[10px] text-[#64748B] block">Đã bao gồm VAT & Kiểm định</span>
                  </div>
                </div>
              </div>

              {/* Primary Checkout Action */}
              <button
                onClick={() => onNavigate('checkout')}
                className="w-full py-4 bg-[#00687A] hover:bg-[#005260] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-target-btn active:scale-95"
              >
                <span>{isVi ? 'TIẾN HÀNH THANH TOÁN' : 'PROCEED TO CHECKOUT'}</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>

              {/* Guarantee badges */}
              <div className="pt-4 border-t border-[#CBD5E1] space-y-2 text-[10px] font-mono text-[#64748B]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00687A] text-sm">lock</span>
                  <span>Bảo mật giao dịch thanh toán mã hóa 256-bit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00687A] text-sm">verified</span>
                  <span>Bảo hành hoàn tiền nếu sai lệch dung sai ±0.05mm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
