import React, { useState } from 'react';
import { CartItem } from '../types';

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
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<string>('');

  const physicalItems = cart.filter(i => i.type === 'physical');
  const digitalItems = cart.filter(i => i.type === 'digital');

  const subtotalPhysical = physicalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const subtotalDigital = digitalItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const shippingFee = physicalItems.length > 0 ? (subtotalPhysical > 500000 ? 0 : 25000) : 0;
  const totalAmount = Math.max(0, subtotalPhysical + subtotalDigital + shippingFee - appliedDiscount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'TECH3D') {
      setAppliedDiscount(20000);
      setPromoMessage('Áp dụng mã TECH3D: Giảm 20.000 đ');
      onShowToast('Đã áp dụng mã giảm giá 20.000 đ!');
    } else if (code === 'VCUBE10' || code === 'VN3DHUB') {
      const disc = Math.round((subtotalPhysical + subtotalDigital) * 0.1);
      setAppliedDiscount(disc);
      setPromoMessage(`Áp dụng mã VCUBE10: Giảm 10% (-${disc.toLocaleString()} đ)`);
      onShowToast(`Đã áp dụng mã giảm giá 10%!`);
    } else {
      setPromoMessage('Mã giảm giá không hợp lệ. Hãy thử "VCUBE10" hoặc "TECH3D".');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-md mx-auto text-center bg-white p-8 sm:p-12 border border-black/10">
          <div className="w-12 sm:w-14 h-12 sm:h-14 bg-[#F7F6F2] border border-black/10 text-[#1C1C1C] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-2xl">shopping_bag</span>
          </div>
          <h2 className="font-serif font-bold text-lg sm:text-xl text-[#1C1C1C]">Giỏ hàng của bạn đang trống</h2>
          <p className="text-xs text-[#7D7565] mt-2 mb-6 font-serif">
            Chưa có bản vẽ kỹ thuật hoặc sản phẩm in 3D nào được chọn. Hãy duyệt danh mục ấn phẩm tuyển chọn VCUBE.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => onNavigate('explore')}
              className="px-6 py-3.5 bg-[#1C1C1C] hover:bg-[#333] text-white font-sans text-[10px] uppercase tracking-widest font-bold transition-all touch-target-btn"
            >
              Xem Bản Vẽ Curation
            </button>
            <button
              onClick={() => onNavigate('tool_3d')}
              className="px-6 py-3.5 border border-black/20 hover:bg-black/5 text-[#1C1C1C] font-sans text-[10px] uppercase tracking-widest font-bold transition-all touch-target-btn"
            >
              Kiểm Tra Mesh STL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-6 sm:py-10 px-4 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-black/10">
          <div>
            <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#A69C8A] block mb-1">
              Order Manifest // Review
            </span>
            <h1 className="fluid-h1 text-[#1C1C1C]">
              Danh Mục Đặt Hàng ({cart.reduce((a, b) => a + b.quantity, 0)} mục)
            </h1>
          </div>
          <button
            onClick={() => onNavigate('explore')}
            className="text-[11px] font-sans uppercase tracking-widest text-[#7D7565] hover:text-[#1C1C1C] flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Tiếp tục duyệt bản vẽ
          </button>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
          {/* Left: Cart Items List */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            {/* Physical Print Orders */}
            {physicalItems.length > 0 && (
              <div className="bg-white border border-black/10 p-5 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-black/10 pb-4">
                  <h2 className="font-serif font-bold text-base text-[#1C1C1C] flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#1C1C1C]">precision_manufacturing</span>
                    Sản Phẩm Gia Công In 3D ({physicalItems.length})
                  </h2>
                  <span className="text-[9px] sm:text-[10px] font-sans uppercase tracking-widest text-[#7D7565]">QC Dung Sai</span>
                </div>

                <div className="divide-y divide-black/10">
                  {physicalItems.map((item) => (
                    <div key={item.id} className="py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                      <div className="flex items-start sm:items-center gap-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 sm:w-16 h-14 sm:h-16 object-cover border border-black/10 shrink-0 bg-[#2A2A2A]"
                        />
                        <div className="space-y-1">
                          <h3 className="font-serif font-bold text-sm text-[#1C1C1C]">{item.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#7D7565] font-sans">
                            <span>Vật liệu: <strong className="text-[#1C1C1C]">{item.material}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              Màu: <span className="w-2 h-2 rounded-full inline-block border border-black/20" style={{ backgroundColor: item.colorHex || '#1C1C1C' }}></span>
                              {item.color}
                            </span>
                          </div>
                          {item.customText && (
                            <p className="text-[11px] font-tech text-[#1C1C1C]">
                              Khắc chữ: <span>"{item.customText}"</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 shrink-0 font-sans pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5">
                        {/* Quantity Counter */}
                        <div className="flex items-center border border-black/15 bg-white">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-1.5 text-[#1C1C1C] hover:bg-black/5 font-bold text-xs touch-target-btn"
                          >
                            -
                          </button>
                          <span className="px-3 py-1.5 font-tech text-xs font-bold text-[#1C1C1C] border-x border-black/15">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-1.5 text-[#1C1C1C] hover:bg-black/5 font-bold text-xs touch-target-btn"
                          >
                            +
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className="font-tech font-bold text-sm text-[#1C1C1C] block">
                            {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-[9px] font-tech text-[#7D7565]">
                            {item.price.toLocaleString('vi-VN')} đ / sp
                          </span>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-[#7D7565] hover:text-[#1C1C1C] transition-colors touch-target-btn"
                          title="Xóa"
                          aria-label="Xóa sản phẩm"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Digital STL Downloads */}
            {digitalItems.length > 0 && (
              <div className="bg-white border border-black/10 p-5 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-black/10 pb-4">
                  <h2 className="font-serif font-bold text-base text-[#1C1C1C] flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#1C1C1C]">folder_zip</span>
                    Bản Quyền Kỹ Thuật Số (STL / STEP) ({digitalItems.length})
                  </h2>
                  <span className="text-[9px] sm:text-[10px] font-sans uppercase tracking-widest text-[#7D7565]">Instant Download</span>
                </div>

                <div className="divide-y divide-black/10">
                  {digitalItems.map((item) => (
                    <div key={item.id} className="py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                      <div className="flex items-start sm:items-center gap-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 sm:w-16 h-14 sm:h-16 object-cover border border-black/10 shrink-0 bg-[#2A2A2A]"
                        />
                        <div className="space-y-1">
                          <h3 className="font-serif font-bold text-sm text-[#1C1C1C]">{item.name}</h3>
                          <p className="text-xs text-[#7D7565] font-sans">
                            Định dạng: <strong className="text-[#1C1C1C]">{item.fileFormat || 'STL + STEP'}</strong>
                          </p>
                          <p className="text-[10px] font-sans uppercase tracking-widest text-[#7D7565]">
                            {item.licenseType || 'Commercial License'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 shrink-0 font-sans pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5">
                        <span className="px-2 py-0.5 bg-[#F7F6F2] border border-black/10 text-[#1C1C1C] text-[10px] font-sans uppercase tracking-widest">
                          Digital Delivery
                        </span>

                        <div className="text-right">
                          <span className="font-tech font-bold text-sm text-[#1C1C1C] block">
                            {item.price.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-[#7D7565] hover:text-[#1C1C1C] transition-colors touch-target-btn"
                          aria-label="Xóa file"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Checkout Summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-black/10 p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
              <h3 className="font-serif font-bold text-base text-[#1C1C1C] pb-3 border-b border-black/10">
                Tổng Kết Chi Phí
              </h3>

              {/* Promo Code Form */}
              <form onSubmit={handleApplyPromo} className="space-y-2">
                <label className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#7D7565] block">
                  Mã Voucher Tuyển Chọn:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="VCUBE10 hoặc TECH3D"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full bg-[#F7F6F2] border border-black/15 px-3 py-2 text-xs font-sans uppercase text-[#1C1C1C] focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1C1C1C] hover:bg-[#333] text-white text-[10px] font-sans uppercase tracking-widest font-bold shrink-0 touch-target-btn"
                  >
                    Áp Dụng
                  </button>
                </div>
                {promoMessage && (
                  <p className="text-[11px] font-serif text-[#1C1C1C] italic">
                    {promoMessage}
                  </p>
                )}
              </form>

              {/* Breakdown */}
              <div className="space-y-2.5 text-xs text-[#5A554C] pt-4 border-t border-black/10 font-sans">
                <div className="flex justify-between">
                  <span>Tạm tính in vật lý:</span>
                  <span className="font-tech font-semibold text-[#1C1C1C]">{subtotalPhysical.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Tạm tính file kỹ thuật số:</span>
                  <span className="font-tech font-semibold text-[#1C1C1C]">{subtotalDigital.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển chuyên dụng:</span>
                  <span className="font-tech font-semibold text-[#1C1C1C]">
                    {shippingFee === 0 ? <strong>Miễn phí</strong> : `${shippingFee.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-[#1C1C1C] font-semibold">
                    <span>Ưu đãi áp dụng:</span>
                    <span className="font-tech">-{appliedDiscount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="pt-4 border-t border-black/10 flex justify-between items-baseline">
                  <span className="font-bold text-xs uppercase tracking-widest text-[#1C1C1C]">Tổng thanh toán:</span>
                  <span className="font-tech text-xl font-bold text-[#1C1C1C]">
                    {totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => onNavigate('checkout', { totalAmount, appliedDiscount, shippingFee })}
                className="w-full py-4 bg-[#1C1C1C] hover:bg-[#333] text-white font-sans font-bold text-[11px] uppercase tracking-widest shadow-md transition-colors flex items-center justify-center gap-2 touch-target-btn"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
                TIẾN HÀNH ĐẶT HÀNG
              </button>

              <div className="text-[9px] text-[#7D7565] font-sans uppercase tracking-widest text-center">
                VCUBE Precision // Thanh toán chuẩn PCI DSS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
