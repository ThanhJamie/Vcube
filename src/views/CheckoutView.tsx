import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CartItem, Order, SiteContentConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface CheckoutViewProps {
  cart: CartItem[];
  appliedDiscount?: number;
  siteContent?: SiteContentConfig;
  onOrderCompleted: (order: Order) => void;
  onNavigate: (screen: string, payload?: any) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  appliedDiscount = 0,
  siteContent,
  onOrderCompleted,
  onNavigate
}) => {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Guest vs Logged-in Mode
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'registered'>(user ? 'registered' : 'guest');
  const [fullName, setFullName] = useState(profile?.displayName || 'Nguyễn Văn Minh');
  const [phone, setPhone] = useState(profile?.phone || '0987 654 321');
  const [email, setEmail] = useState(profile?.email || 'customer@vcube.vn');
  const [address, setAddress] = useState('Tòa nhà FPT Tower, Tầng 8, Phạm Văn Bạch');
  const [city, setCity] = useState('Hà Nội');
  const [district, setDistrict] = useState('Cầu Giấy');
  const [note, setNote] = useState('Yêu cầu in đúng dung sai lỗ ốc M3 để lắp cảm biến.');
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'bank' | 'cod'>('vnpay');
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotalPhysical = cart.filter(i => i.type === 'physical').reduce((a, b) => a + b.price * b.quantity, 0);
  const subtotalDigital = cart.filter(i => i.type === 'digital').reduce((a, b) => a + b.price * b.quantity, 0);
  const subtotal = subtotalPhysical + subtotalDigital;

  // Dynamic shipping calculation based on siteContent
  const standardFee = siteContent?.standardShippingFee ?? 25000;
  const freeThreshold = siteContent?.freeShippingThreshold ?? 300000;
  const shippingFee = (subtotalPhysical > 0 && subtotal >= freeThreshold) ? 0 : (subtotalPhysical > 0 ? standardFee : 0);
  const totalAmount = Math.max(0, subtotal + shippingFee - appliedDiscount);

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // silent fallback
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: `#VCUBE-${randomSuffix}`,
        date: new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US') + ' ' + new Date().toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        estimatedDelivery: '2-3 ngày làm việc',
        status: 'processing',
        statusStageIndex: 1, // Kỹ sư VCUBE đang chuẩn bị file
        layerProgress: 0,
        timeRemaining: '06h 30m',
        customerType: checkoutMode,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          designer: item.designer,
          type: item.type,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
          material: item.material,
          color: item.color,
          resolution: item.resolution,
          license: item.licenseType,
          version: 'v2.1'
        })),
        shippingAddress: {
          fullName,
          phone,
          email,
          address,
          city,
          district,
          note
        },
        carrier: {
          name: 'VCUBE Logistics Express (Chuyên dụng cơ khí)',
          trackingCode: `VCUBE-${Math.floor(10000000 + Math.random() * 90000000)}`
        },
        payment: {
          method: paymentMethod === 'vnpay' ? 'VNPAY QR' : paymentMethod === 'bank' ? 'Chuyển khoản Ngân hàng' : 'Thanh toán COD',
          paidDate: new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US') + ' ' + new Date().toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          subtotalPhysical,
          subtotalDigital,
          shippingFee,
          discount: appliedDiscount,
          tax: 0,
          total: totalAmount,
          isPaid: paymentMethod !== 'cod'
        }
      };

      onOrderCompleted(newOrder);
      setIsProcessing(false);
      onNavigate('order_success', { order: newOrder });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Back & Title */}
        <div className="flex items-center gap-3 pb-6 border-b border-black/10">
          <button
            onClick={() => onNavigate('cart')}
            className="p-2 border border-black/15 hover:bg-black/5 text-[#1C1C1C] transition-colors rounded touch-target-btn"
            aria-label="Quay lại giỏ hàng"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <span className="font-tech text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#00687A] font-bold block">
              Step 02 // Checkout & Verification
            </span>
            <h1 className="fluid-h2 text-[#1C1C1C]">
              {isVi ? 'Xác Nhận & Thanh Toán Đơn Hàng' : 'Checkout & Order Confirmation'}
            </h1>
          </div>
        </div>

        {/* Guest vs Registered Toggle Notice */}
        <div className="bg-white border border-black/10 p-4 rounded flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#EFF4FF] text-[#00687A] flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-base">person</span>
            </div>
            <div>
              <p className="font-bold text-xs text-[#1C1C1C]">
                {checkoutMode === 'guest'
                  ? (isVi ? 'Đang thanh toán dưới dạng Khách vãng lai (Guest Checkout)' : 'Checking out as Guest (No login required)')
                  : (isVi ? `Đăng nhập: ${profile?.displayName || user?.email}` : `Logged in as: ${profile?.displayName || user?.email}`)}
              </p>
              <p className="text-[11px] text-[#545F73]">
                {isVi
                  ? 'Bạn có thể đặt hàng ngay mà không bắt buộc phải tạo tài khoản.'
                  : 'You can complete your order instantly without creating an account.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-tech text-xs">
            <button
              type="button"
              onClick={() => setCheckoutMode('guest')}
              className={`px-3 py-1.5 rounded transition-all font-bold ${
                checkoutMode === 'guest'
                  ? 'bg-[#091426] text-white'
                  : 'bg-[#F1F5F9] text-[#545F73] hover:text-[#091426]'
              }`}
            >
              {isVi ? 'Khách Vãng Lai' : 'Guest'}
            </button>
            <button
              type="button"
              onClick={() => setCheckoutMode('registered')}
              className={`px-3 py-1.5 rounded transition-all font-bold ${
                checkoutMode === 'registered'
                  ? 'bg-[#091426] text-white'
                  : 'bg-[#F1F5F9] text-[#545F73] hover:text-[#091426]'
              }`}
            >
              {isVi ? 'Thành Viên' : 'Registered'}
            </button>
          </div>
        </div>

        <form onSubmit={handleCompleteOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
          {/* Left Column: Delivery details & Payment Method */}
          <div className="lg:col-span-8 space-y-6">
            {/* Delivery Info */}
            <div className="bg-white border border-black/10 p-5 sm:p-8 rounded space-y-6 shadow-xs">
              <h2 className="font-bold text-base text-[#1C1C1C] flex items-center gap-2 border-b border-black/10 pb-4">
                <span className="material-symbols-outlined text-base text-[#00687A]">local_shipping</span>
                {isVi ? '1. Thông Tin Nhận Hàng & Xưởng Gia Công' : '1. Delivery & Customer Details'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1.5">
                    {isVi ? 'Họ và tên người nhận *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-black/15 px-3 py-2.5 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1.5">
                    {isVi ? 'Số điện thoại nhận hàng *' : 'Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-black/15 px-3 py-2.5 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1.5">
                    {isVi ? 'Tỉnh / Thành phố *' : 'City / Province *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-black/15 px-3 py-2.5 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1.5">
                    {isVi ? 'Quận / Huyện *' : 'District *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-black/15 px-3 py-2.5 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1.5">
                    {isVi ? 'Địa chỉ chi tiết (Số nhà, đường, tòa nhà) *' : 'Street Address *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-black/15 px-3 py-2.5 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-[#00687A]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1.5">
                    {isVi ? 'Ghi chú đặc thù cho kỹ sư vận hành máy:' : 'Technical / Tolerance Notes for Engineer:'}
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={isVi ? 'Ghi chú về dung sai ren ốc, hướng đặt bàn in hoặc màu sắc đặc thù...' : 'Tolerance, layer height or custom requirements...'}
                    className="w-full bg-[#F8FAFC] border border-black/15 p-2.5 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white border border-black/10 p-5 sm:p-8 rounded space-y-6 shadow-xs">
              <h2 className="font-bold text-base text-[#1C1C1C] flex items-center gap-2 border-b border-black/10 pb-4">
                <span className="material-symbols-outlined text-base text-[#00687A]">payment</span>
                {isVi ? '2. Phương Thức Thanh Toán' : '2. Payment Method'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`p-4 border text-left transition-all rounded touch-target-btn ${
                    paymentMethod === 'vnpay'
                      ? 'border-[#00687A] bg-[#00687A] text-white font-bold shadow-xs'
                      : 'border-black/10 bg-[#F8FAFC] text-[#1C1C1C] hover:border-black/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                    <span className="text-xs font-bold uppercase tracking-wider">VNPAY QR</span>
                  </div>
                  <p className="text-[10px] opacity-80 font-normal">
                    {isVi ? 'Quét mã QR tức thì qua App ngân hàng' : 'Instant mobile banking QR'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`p-4 border text-left transition-all rounded touch-target-btn ${
                    paymentMethod === 'bank'
                      ? 'border-[#00687A] bg-[#00687A] text-white font-bold shadow-xs'
                      : 'border-black/10 bg-[#F8FAFC] text-[#1C1C1C] hover:border-black/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-base">account_balance</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Chuyển Khoản</span>
                  </div>
                  <p className="text-[10px] opacity-80 font-normal">
                    {isVi ? 'VietQR 24/7 (VCB, TCB, MB)' : 'VietQR 24/7 Transfer'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 border text-left transition-all rounded touch-target-btn ${
                    paymentMethod === 'cod'
                      ? 'border-[#00687A] bg-[#00687A] text-white font-bold shadow-xs'
                      : 'border-black/10 bg-[#F8FAFC] text-[#1C1C1C] hover:border-black/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-base">handshake</span>
                    <span className="text-xs font-bold uppercase tracking-wider">COD Khi Nhận</span>
                  </div>
                  <p className="text-[10px] opacity-80 font-normal">
                    {isVi ? 'Kiểm tra dung sai và nhận hàng' : 'Cash on delivery'}
                  </p>
                </button>
              </div>

              {/* QR VietQR Mockup */}
              {(paymentMethod === 'vnpay' || paymentMethod === 'bank') && (
                <div className="mt-4 p-4 sm:p-5 bg-[#F8FAFC] border border-[#CBD5E1] rounded flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="w-24 h-24 bg-white p-2 border border-black/20 rounded flex items-center justify-center shrink-0 shadow-xs">
                    <div className="w-full h-full bg-[#091426] p-1 flex flex-col justify-between rounded-xs">
                      <div className="flex justify-between">
                        <div className="w-5 h-5 bg-white"></div>
                        <div className="w-5 h-5 bg-white"></div>
                      </div>
                      <div className="text-[7px] font-tech text-center text-white font-bold">VCUBE-QR</div>
                      <div className="flex justify-between">
                        <div className="w-5 h-5 bg-white"></div>
                        <div className="w-3 h-3 bg-white"></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-[#545F73] font-sans text-center sm:text-left">
                    <p className="font-bold text-[#091426] uppercase tracking-wider text-xs">
                      {isVi ? 'Thông Tin Tài Khoản VCUBE Fabrication' : 'VCUBE Bank Account Details'}
                    </p>
                    <p>Ngân hàng: <strong>Vietcombank (Sở Giao Dịch)</strong></p>
                    <p>Số tài khoản: <strong className="font-tech text-[#00687A]">9882 1004 8888</strong></p>
                    <p>Chủ tài khoản: <strong>CONG TY CO PHAN VCUBE VIET NAM</strong></p>
                    <p>Nội dung CK: <strong className="font-tech text-[#091426]">VCUBE {phone}</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Order Breakdown */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-black/10 p-6 rounded space-y-6 lg:sticky lg:top-24 shadow-xs">
              <h3 className="font-bold text-base text-[#1C1C1C] pb-3 border-b border-black/10 flex items-center justify-between">
                <span>{isVi ? 'Chi Tiết Đơn Hàng' : 'Order Summary'}</span>
                <span className="font-tech text-xs bg-[#EFF4FF] text-[#00687A] px-2 py-0.5 rounded font-bold">
                  {cart.reduce((a, b) => a + b.quantity, 0)} {isVi ? 'món' : 'items'}
                </span>
              </h3>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs font-sans">
                    <div className="flex items-center gap-2.5 truncate">
                      <img src={item.image} alt={item.name} className="w-9 h-9 object-cover rounded border border-black/10 shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-[#1C1C1C] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#545F73] font-tech">{item.quantity}x • {item.material || 'Digital File'}</p>
                      </div>
                    </div>
                    <span className="font-tech font-bold text-[#1C1C1C] shrink-0 ml-2">
                      {(item.price * item.quantity).toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-black/10 space-y-2 text-xs text-[#545F73] font-sans">
                <div className="flex justify-between">
                  <span>{isVi ? 'Tạm tính linh kiện:' : 'Subtotal:'}</span>
                  <span className="font-tech font-bold text-[#1C1C1C]">{subtotal.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>{isVi ? 'Phí vận chuyển kỹ thuật:' : 'Shipping fee:'}</span>
                  <span className="font-tech font-bold text-[#1C1C1C]">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold">{isVi ? 'MIỄN PHÍ' : 'FREE'}</span>
                    ) : (
                      `${shippingFee.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ`
                    )}
                  </span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>{isVi ? 'Ưu đãi mã giảm:' : 'Discount:'}</span>
                    <span className="font-tech">-{appliedDiscount.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ</span>
                  </div>
                )}
                <div className="pt-4 border-t border-black/10 flex justify-between items-baseline">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#1C1C1C]">
                    {isVi ? 'Tổng thanh toán:' : 'Total Amount:'}
                  </span>
                  <span className="font-tech text-xl font-bold text-[#00687A]">
                    {totalAmount.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 bg-[#00687A] hover:bg-[#005463] text-white font-sans font-bold text-xs uppercase tracking-widest rounded shadow-sm transition-colors flex items-center justify-center gap-2 touch-target-btn cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">verified</span>
                {isProcessing
                  ? (isVi ? 'ĐANG TẠO MÃ GIA CÔNG...' : 'PROCESSING ORDER...')
                  : (isVi ? 'XÁC NHẬN ĐẶT HÀNG' : 'PLACE ORDER NOW')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
