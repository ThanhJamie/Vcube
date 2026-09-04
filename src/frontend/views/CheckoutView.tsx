import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CartItem, Order, SiteContentConfig } from '../../types';
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
  const { user, profile, isLoggedIn } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [fullName, setFullName] = useState(profile?.displayName || 'Kỹ Sư Trần Tuấn Anh');
  const [phone, setPhone] = useState(profile?.phone || '0912 345 678');
  const [email, setEmail] = useState(profile?.email || 'engineer@techlab.vn');
  const [address, setAddress] = useState('Khu Công Nghệ Cao Hòa Lạc, Km 29 Đại Lộ Thăng Long');
  const [city, setCity] = useState('Hà Nội');
  const [district, setDistrict] = useState('Thạch Thất');
  const [note, setNote] = useState('Yêu cầu kiểm tra kỹ dung sai lắp ghép ren M3 và làm sạch bavia trước khi đóng gói.');
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'vnpay' | 'cod'>('vietqr');
  const [needsVatInvoice, setNeedsVatInvoice] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const physicalItems = cart.filter(i => i.type === 'physical');
  const digitalItems = cart.filter(i => i.type === 'digital');

  const subtotalPhysical = physicalItems.reduce((a, b) => a + b.price * b.quantity, 0);
  const subtotalDigital = digitalItems.reduce((a, b) => a + b.price * b.quantity, 0);
  const subtotal = subtotalPhysical + subtotalDigital;

  // Dynamic shipping calculation
  const standardFee = siteContent?.standardShippingFee ?? 30000;
  const freeThreshold = siteContent?.freeShippingThreshold ?? 300000;
  const shippingFee = physicalItems.length > 0 ? (subtotalPhysical >= freeThreshold ? 0 : standardFee) : 0;
  const totalAmount = Math.max(0, subtotal + shippingFee - appliedDiscount);

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
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
        estimatedDelivery: physicalItems.length > 0 ? '24h - 48h (VCUBE Logistics)' : 'Tải tức thời qua Cloud',
        status: 'processing',
        statusStageIndex: 1, // Kỹ sư đang chuẩn bị file
        layerProgress: 0,
        timeRemaining: '04h 30m',
        customerType: isLoggedIn ? 'registered' : 'guest',
        secureAccessToken: !isLoggedIn ? `sec_${Date.now()}_${Math.random().toString(36).substring(2, 10)}` : undefined,
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
          customText: item.customText,
          version: 'v2.1'
        })),
        shippingAddress: {
          fullName,
          phone,
          email,
          address,
          city,
          district,
          note: needsVatInvoice ? `${note} [VAT: ${companyName} - MST: ${taxId}]` : note
        },
        carrier: {
          name: 'VCUBE Logistics Express (Chuyên dụng cơ khí)',
          trackingCode: `VCUBE-${Math.floor(10000000 + Math.random() * 90000000)}`
        },
        payment: {
          method: paymentMethod === 'vietqr' ? 'VietQR Chuyển Khoản' : paymentMethod === 'vnpay' ? 'VNPAY QR' : 'Thanh toán COD',
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
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091426] py-6 sm:py-10 px-4 sm:px-6 md:px-12 pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Step Progress Tracker */}
        <div className="bg-white border border-[#CBD5E1] p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-mono">
            {/* Step 1 */}
            <button
              onClick={() => onNavigate('cart')}
              className="flex items-center gap-2 text-[#00687A] font-bold cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">
                ✓
              </span>
              <span className="hidden sm:inline">01. Giỏ hàng</span>
            </button>

            <div className="h-0.5 w-12 sm:w-20 bg-[#00687A]"></div>

            {/* Step 2 (Active) */}
            <div className="flex items-center gap-2 text-[#00687A] font-extrabold">
              <span className="w-6 h-6 rounded-full bg-[#00687A] text-white flex items-center justify-center text-xs shadow-xs">
                2
              </span>
              <span>02. Thanh toán</span>
            </div>

            <div className="h-0.5 w-12 sm:w-20 bg-[#CBD5E1]"></div>

            {/* Step 3 */}
            <div className="flex items-center gap-2 text-[#64748B]">
              <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs border border-[#CBD5E1]">
                3
              </span>
              <span className="hidden sm:inline">03. Hoàn tất & In 3D</span>
            </div>
          </div>
        </div>

        {/* Account Authentication Banner */}
        {isLoggedIn ? (
          <div className="bg-white border border-[#CBD5E1] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00687A]/10 text-[#00687A] flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div>
                <p className="font-bold text-xs text-[#091426]">
                  {isVi ? `Tài khoản đặt hàng: ${profile?.displayName || user?.email}` : `Ordering Account: ${profile?.displayName || user?.email}`}
                </p>
                <p className="text-[11px] text-[#64748B] font-mono">
                  {isVi
                    ? 'Đơn hàng sẽ tự động lưu vào kho lưu trữ số và cấp quyền theo dõi tiến độ in 3D.'
                    : 'Order will be stored in your digital library with real-time print tracking.'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-3 py-1 bg-[#00687A]/10 text-[#00687A] rounded-lg uppercase">
              {profile?.role || 'ENGINEER'}
            </span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-xl">bolt</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xs text-emerald-950">
                    {isVi ? 'Chế độ Đặt Hàng Khách Vãng Lai (Guest Checkout)' : 'Guest Checkout Active'}
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-mono font-bold">
                    Không Cần Mật Khẩu
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-sans mt-0.5">
                  {isVi
                    ? 'Bạn có thể đặt in trực tiếp bằng SĐT & Địa chỉ. Hệ thống tự động cấp Mã Truy Cập Riêng (Access Token) để tra cứu trạng thái đơn hàng.'
                    : 'Checkout instantly with phone & address. A secure token will be generated to track your fabrication live.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/auth/login?redirectTo=/checkout"
                className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>{isVi ? 'Đăng nhập nếu có tài khoản' : 'Sign In'}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Checkout Main Form */}
        <form onSubmit={handleCompleteOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Delivery & Contact Details */}
            <div className="bg-white border border-[#CBD5E1] p-6 sm:p-7 rounded-2xl shadow-xs space-y-5">
              <h2 className="font-extrabold text-base text-[#091426] flex items-center gap-2 border-b border-[#CBD5E1] pb-3.5 font-mono uppercase">
                <span className="material-symbols-outlined text-[#00687A] text-xl">local_shipping</span>
                <span>1. Thông Tin Nhận Hàng & Lệnh Chế Tác</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1.5">
                    Họ và tên người nhận *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#091426] rounded-xl focus:outline-none focus:border-[#00687A]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1.5">
                    Số điện thoại nhận hàng *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#091426] rounded-xl focus:outline-none focus:border-[#00687A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1.5">
                    Email nhận file CAD & hóa đơn VAT *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#091426] rounded-xl focus:outline-none focus:border-[#00687A]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1.5">
                    Tỉnh / Thành phố *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2.5 text-xs text-[#091426] rounded-xl focus:outline-none focus:border-[#00687A] cursor-pointer"
                  >
                    <option value="Hà Nội">Hà Nội (Hub Miền Bắc - 24h)</option>
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh (Hub Miền Nam - 24h)</option>
                    <option value="Đà Nẵng">Đà Nẵng (Hub Miền Trung - 36h)</option>
                    <option value="Hải Phòng">Hải Phòng</option>
                    <option value="Bình Dương">Bình Dương</option>
                    <option value="Đồng Nai">Đồng Nai</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                    <option value="Tỉnh Thành Khác">Tỉnh Thành Khác</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1.5">
                    Quận / Huyện / Khu Công Nghệ *
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#091426] rounded-xl focus:outline-none focus:border-[#00687A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1.5">
                    Địa chỉ chi tiết (Số nhà, tòa nhà, phòng Lab) *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#091426] rounded-xl focus:outline-none focus:border-[#00687A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1.5">
                    Ghi chú kỹ thuật dung sai cho kỹ sư vận hành xưởng
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#091426] rounded-xl focus:outline-none focus:border-[#00687A]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method Selection */}
            <div className="bg-white border border-[#CBD5E1] p-6 sm:p-7 rounded-2xl shadow-xs space-y-4">
              <h2 className="font-extrabold text-base text-[#091426] flex items-center gap-2 border-b border-[#CBD5E1] pb-3.5 font-mono uppercase">
                <span className="material-symbols-outlined text-[#00687A] text-xl">payments</span>
                <span>2. Phương Thức Thanh Toán</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                {/* Method 1: VietQR */}
                <label
                  onClick={() => setPaymentMethod('vietqr')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    paymentMethod === 'vietqr'
                      ? 'border-[#00687A] bg-[#00687A]/5 shadow-xs'
                      : 'border-[#CBD5E1] bg-white hover:border-[#00687A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#00687A] text-xl">qr_code_2</span>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'vietqr'}
                      onChange={() => setPaymentMethod('vietqr')}
                      className="accent-[#00687A]"
                    />
                  </div>
                  <div>
                    <strong className="text-xs text-[#091426] block">VietQR Ngân Hàng</strong>
                    <span className="text-[10px] text-[#64748B]">Tự động điền số tiền & xác nhận 2s</span>
                  </div>
                </label>

                {/* Method 2: VNPAY */}
                <label
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    paymentMethod === 'vnpay'
                      ? 'border-[#00687A] bg-[#00687A]/5 shadow-xs'
                      : 'border-[#CBD5E1] bg-white hover:border-[#00687A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#00687A] text-xl">account_balance_wallet</span>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'vnpay'}
                      onChange={() => setPaymentMethod('vnpay')}
                      className="accent-[#00687A]"
                    />
                  </div>
                  <div>
                    <strong className="text-xs text-[#091426] block">Cổng VNPAY QR</strong>
                    <span className="text-[10px] text-[#64748B]">Thẻ ATM / Visa / Ví VNPAY</span>
                  </div>
                </label>

                {/* Method 3: COD */}
                <label
                  onClick={() => physicalItems.length > 0 && setPaymentMethod('cod')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-2 ${
                    physicalItems.length === 0
                      ? 'opacity-40 border-[#CBD5E1] cursor-not-allowed'
                      : paymentMethod === 'cod'
                      ? 'border-[#00687A] bg-[#00687A]/5 shadow-xs cursor-pointer'
                      : 'border-[#CBD5E1] bg-white hover:border-[#00687A] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#00687A] text-xl">handshake</span>
                    <input
                      type="radio"
                      name="payment"
                      disabled={physicalItems.length === 0}
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-[#00687A]"
                    />
                  </div>
                  <div>
                    <strong className="text-xs text-[#091426] block">Thanh Toán COD</strong>
                    <span className="text-[10px] text-[#64748B]">
                      {physicalItems.length === 0 ? 'Chỉ áp dụng hàng in 3D' : 'Nhận hàng & kiểm tra QC'}
                    </span>
                  </div>
                </label>
              </div>

              {/* VietQR Instructions Box */}
              {paymentMethod === 'vietqr' && (
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-[#00687A] font-bold">
                    <span>Tài Khoản Thụ Hưởng VCUBE:</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Tự động duyệt</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#475569]">
                    <div>Ngân hàng: <strong className="text-[#091426]">Vietcombank (VCB)</strong></div>
                    <div>Số tài khoản: <strong className="text-[#00687A]">1029384756</strong></div>
                    <div>Chủ tài khoản: <strong className="text-[#091426]">CONG TY CP CONG NGHE VCUBE 3D</strong></div>
                    <div>Cú pháp chuyển khoản: <strong className="text-amber-700">VCUBE {phone.replace(/\s/g, '')}</strong></div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Electronic VAT Invoice Toggle */}
            <div className="bg-white border border-[#CBD5E1] p-5 sm:p-6 rounded-2xl shadow-xs space-y-3 font-mono">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={needsVatInvoice}
                  onChange={(e) => setNeedsVatInvoice(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00687A] accent-[#00687A]"
                />
                <span className="text-xs font-bold text-[#091426]">
                  Yêu cầu xuất hóa đơn điện tử VAT (8%) cho Doanh nghiệp / Dự án
                </span>
              </label>

              {needsVatInvoice && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#CBD5E1] text-xs">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1">
                      Tên doanh nghiệp / Đơn vị *
                    </label>
                    <input
                      type="text"
                      placeholder="CÔNG TY TNHH CÔNG NGHỆ..."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 text-xs rounded-xl focus:outline-none focus:border-[#00687A]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1">
                      Mã số thuế *
                    </label>
                    <input
                      type="text"
                      placeholder="0109876543"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 text-xs rounded-xl focus:outline-none focus:border-[#00687A]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-[#64748B] block mb-1">
                      Địa chỉ đăng ký kinh doanh *
                    </label>
                    <input
                      type="text"
                      placeholder="Tầng 5, Tòa nhà Innovation, Cầu Giấy, Hà Nội"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2 text-xs rounded-xl focus:outline-none focus:border-[#00687A]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Manifest Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-md space-y-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
                <h2 className="font-extrabold text-base text-[#091426] font-mono uppercase tracking-wide">
                  Đơn Hàng ({cart.length} mục)
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('cart')}
                  className="text-[11px] font-mono font-bold text-[#00687A] hover:underline cursor-pointer"
                >
                  Sửa giỏ hàng
                </button>
              </div>

              {/* Items Mini-list */}
              <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-[#CBD5E1]/60 pr-1 scrollbar-none">
                {cart.map((item) => (
                  <div key={item.id} className="pt-2 flex items-center gap-3 font-mono text-xs">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover border border-[#CBD5E1] bg-[#091426] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#091426] truncate text-xs">{item.name}</p>
                      <p className="text-[10px] text-[#64748B]">
                        {item.type === 'digital' ? 'Bản quyền CAD' : `${item.material} • Qty: ${item.quantity}`}
                      </p>
                    </div>
                    <span className="font-bold text-[#091426] text-xs shrink-0">
                      {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="space-y-2.5 text-xs font-mono text-[#475569] border-t border-[#CBD5E1] pt-4">
                <div className="flex justify-between">
                  <span>Tạm tính sản phẩm:</span>
                  <span className="font-bold text-[#091426]">{subtotal.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className={`font-bold ${shippingFee === 0 ? 'text-emerald-700' : 'text-[#091426]'}`}>
                    {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Mã ưu đãi đã áp dụng:</span>
                    <span>- {appliedDiscount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#CBD5E1] flex justify-between items-baseline">
                  <span className="text-sm font-bold text-[#091426]">Tổng thanh toán:</span>
                  <div className="text-right">
                    <span className="font-mono text-xl font-black text-[#00687A] block">
                      {totalAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[10px] text-[#64748B] block">Đã bao gồm VAT & QC</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-[#00687A] hover:bg-[#005260] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-target-btn active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">
                  {isProcessing ? 'hourglass_top' : 'check_circle'}
                </span>
                <span>{isProcessing ? 'ĐANG KHỞI TẠO ĐƠN HÀNG...' : 'XÁC NHẬN & ĐẶT HÀNG NGAY'}</span>
              </button>

              <p className="text-[10px] font-mono text-center text-[#64748B] leading-snug">
                Bằng việc xác nhận đặt hàng, bạn đồng ý với Điều khoản Chế tác & Bản quyền thương mại của VCUBE.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
