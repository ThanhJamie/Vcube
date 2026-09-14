import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CartItem, Order, OrderPaymentStatus, SiteContentConfig } from '../../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCartStore } from '../stores/useCartStore';
import { computeShippingFee, DEFAULT_SALES_RULES } from '../../backend/supabase/database';
import { computeVat, vatLabel, vatNotConfiguredLabel, vatRateFromPercent, vatTotalNote } from '../lib/vat';
import { usePricingGlobalSettings } from '../hooks/useSettings';
import { Icon, Button } from '@frontend/ui';
import { settingsAccessors, subscribeSettings, getAppSettings } from '../../backend/services/settingsService';
import { OrderService } from '../../backend/services/orderService';

/**
 * Q1 (Đợt 8C §0 + data-honesty PC-03): ngân hàng / số tài khoản / tên pháp nhân nhận
 * chuyển khoản là DỮ LIỆU CẤU HÌNH trong `app_settings`, KHÔNG phải hằng số trong mã.
 * Kiểu suy ra từ chính accessor của `settingsService` (không import thêm type).
 */
type TransferSettings = NonNullable<ReturnType<typeof settingsAccessors.appSettings>>;

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

  // Q1 (Đợt 8C §0 / data-honesty PC-03): số tài khoản ngân hàng và tên pháp nhân trước
  // đây là HẰNG SỐ trong mã — khách nhìn thấy một số tài khoản BỊA ngay ở bước thanh toán
  // (giá trị cũ ghi trong báo cáo Q1). Nay đọc từ `app_settings` qua settingsService.
  // Giá trị rỗng ⇒ ẨN DÒNG đó (KHÔNG in "Số tài khoản: —"). Hook đặt TRƯỚC mọi early
  // return của component (luật hook của React).
  const [transferSettings, setTransferSettings] = useState<TransferSettings | null>(
    () => settingsAccessors.appSettings()
  );

  useEffect(() => {
    const unsubscribe = subscribeSettings((snap) => setTransferSettings(snap.app_settings));
    if (!settingsAccessors.appSettings()) {
      void getAppSettings().then(({ data }) => { if (data) setTransferSettings(data); });
    }
    return unsubscribe;
  }, []);

  // Đợt 9 (R1): tỉ lệ VAT đọc từ `pricing_global_settings.vat_percent` — hết 8% cứng.
  // Hook đứng TRƯỚC mọi early return của component (luật hook của React).
  const { data: pricingGlobal } = usePricingGlobalSettings();
  const vatRate = vatRateFromPercent(pricingGlobal?.vatPercent);

  const bankName = transferSettings?.bankName?.trim() || '';
  const bankAccount = transferSettings?.bankAccount?.trim() || '';
  const accountHolder = transferSettings?.legalName?.trim() || '';
  const hasTransferInfo = Boolean(bankName || bankAccount || accountHolder);
  // CTA tới /admin chỉ hiện với người xem là admin (role lấy từ DB — AuthContext).
  const canConfigureTransferInfo = profile?.role === 'admin';

  // P0 (data-honesty #2): KHÔNG prefill PII của người khác. Chỉ điền sẵn thông tin
  // của CHÍNH người dùng đang đăng nhập và đã tự lưu trong hồ sơ; khách vãng lai
  // bắt đầu với form trống. Trước đây mọi khách đều thấy tên/SĐT/địa chỉ của một
  // "Kỹ Sư Trần Tuấn Anh" bịa sẵn làm giá trị mặc định.
  const [fullName, setFullName] = useState(profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'vnpay' | 'cod'>('vietqr');
  const [needsVatInvoice, setNeedsVatInvoice] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  /**
   * B1 — lỗi THẬT từ tầng ghi DB. Có giá trị ⇒ đơn CHƯA tồn tại và UI phải nói đúng
   * điều đó; màn hình thành công chỉ được mở khi DB đã nhận đơn (data-honesty OT-03).
   */
  const [orderError, setOrderError] = useState<string | null>(null);

  const physicalItems = cart.filter(i => i.type === 'physical');
  const digitalItems = cart.filter(i => i.type === 'digital');

  const subtotalPhysical = physicalItems.reduce((a, b) => a + b.price * b.quantity, 0);
  const subtotalDigital = digitalItems.reduce((a, b) => a + b.price * b.quantity, 0);
  const subtotal = subtotalPhysical + subtotalDigital;

  // Phí vận chuyển: MỘT nguồn duy nhất (`computeShippingFee` ← site_content).
  // Trước đây ba nơi hardcode ba giá trị khác nhau (25.000 / 30.000 / inline 30.000).
  const shippingFee = computeShippingFee(subtotalPhysical, physicalItems.length > 0, siteContent);
  const freeThreshold = siteContent?.freeShippingThreshold ?? DEFAULT_SALES_RULES.freeShippingThreshold;

  // VAT: giá niêm yết CHƯA gồm VAT; VAT là một dòng riêng, cùng con số với /quote, /cart
  // và hoá đơn (trước đây checkout set `tax: 0` còn InvoiceModal tự cộng 8%). Tỉ lệ đọc từ
  // `pricing_global_settings.vat_percent`; NULL ⇒ `vat === null` ⇒ ẩn dòng VAT (KHÔNG 0%/8%).
  const afterDiscount = Math.max(0, subtotal + shippingFee - appliedDiscount);
  const vat = computeVat(afterDiscount, vatRate);
  const totalAmount = vat ? vat.total : afterDiscount;

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return; // chống gửi 2 lần (S10)
    setIsProcessing(true);
    setOrderError(null);

    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // silent fallback
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    // B2 — MỘT mốc thời gian, HAI biểu diễn, không bao giờ trộn:
    //   * `createdAtIso` (ISO-8601) là thứ DUY NHẤT được ghi vào cột `orders.date`
    //     (timestamptz). Trước đây chuỗi hiển thị bị ghi thẳng ⇒ Postgres `22008`.
    //   * `displayDate` chỉ để RENDER (OrderSuccessView/InvoiceModal in thẳng `order.date`).
    const createdAt = new Date();
    const createdAtIso = createdAt.toISOString();
    const displayDate =
      createdAt.toLocaleDateString(isVi ? 'vi-VN' : 'en-US') +
      ' ' +
      createdAt.toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    // P0 (PC-03 / data-honesty §5): đơn mới KHÔNG bao giờ tự nhận đã thanh toán.
    // VietQR/VNPAY chỉ được chuyển sang `paid` bởi webhook cổng thanh toán đã
    // kiểm chứng hoặc bởi người vận hành. COD là `cod` — thu tiền khi giao.
    const paymentStatus: OrderPaymentStatus =
      paymentMethod === 'cod' ? 'cod' : 'awaiting_payment';

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `#VCUBE-${randomSuffix}`,
      date: displayDate,
      // Không hứa hạn giao khi chưa có đơn vị vận chuyển nào nhận đơn.
      estimatedDelivery: '',
      status: 'pending_payment',
      statusStageIndex: 0,
      layerProgress: null,
      timeRemaining: null,
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
      // OT-11: không bịa hãng vận chuyển và mã vận đơn. Chỉ điền khi đơn vị
      // vận chuyển thực sự trả về; UI render "Chưa có mã vận đơn".
      carrier: {
        name: '',
        trackingCode: ''
      },
      payment: {
        method: paymentMethod === 'vietqr' ? 'VietQR Chuyển Khoản' : paymentMethod === 'vnpay' ? 'VNPAY QR' : 'Thanh toán COD',
        // '' = chưa nhận được tiền, chưa có thời điểm thanh toán.
        paidDate: '',
        subtotalPhysical,
        subtotalDigital,
        shippingFee,
        discount: appliedDiscount,
        // Chưa cấu hình VAT ⇒ KHÔNG ghi một tỉ lệ nào vào đơn (hoá đơn sẽ không in dòng
        // VAT và nói rõ chưa cấu hình). `tax: 0` = không cộng thêm đồng thuế nào.
        tax: vat ? vat.amount : 0,
        vatRate: vat ? vat.rate : undefined,
        total: totalAmount,
        isPaid: false,
        status: paymentStatus
      }
    };

    try {
      // B1 — ĐƠN PHẢI XUỐNG DB TRƯỚC KHI BÁO THÀNH CÔNG. Đường ghi đi qua tầng service
      // (`src/backend/services/orderService.ts` → `dbService.saveOrder`), KHÔNG gọi
      // Supabase trong component. `user?.id` là `auth.uid()` thật để RLS
      // `vcube_orders_owner_read` đọc lại được đơn của chính người đặt.
      const savedOrder = await OrderService.createOrder(newOrder, {
        userId: user?.id,
        createdAtIso,
      });

      // Chỉ tới đây — khi DB ĐÃ nhận đơn — mới được chuyển sang màn hình thành công.
      onOrderCompleted(savedOrder);
      onNavigate('order_success', { order: savedOrder });
    } catch (err: any) {
      // Ghi DB hỏng ⇒ KHÔNG có màn hình thành công, KHÔNG đơn "trên RAM".
      // Hiện nguyên văn lỗi thật để người dùng/người vận hành biết chuyện gì xảy ra.
      setOrderError(
        err?.message || (isVi ? 'Không lưu được đơn hàng vào cơ sở dữ liệu.' : 'Could not save the order to the database.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Step Progress Tracker */}
        <div className="bg-surface p-4 sm:p-5 rounded-lg shadow-e1">
          <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-mono">
            {/* Step 1 */}
            <button
              onClick={() => onNavigate('cart')}
              className="flex items-center gap-2 text-primary font-bold cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-positive-tint text-positive flex items-center justify-center text-xs">
                ✓
              </span>
              <span className="hidden sm:inline">01. Giỏ hàng</span>
            </button>

            <div className="h-0.5 w-12 sm:w-20 bg-primary"></div>

            {/* Step 2 (Active) */}
            <div className="flex items-center gap-2 text-primary font-extrabold">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-fg flex items-center justify-center text-xs shadow-e1">
                2
              </span>
              <span>02. Thanh toán</span>
            </div>

            <div className="h-0.5 w-12 sm:w-20 bg-line"></div>

            {/* Step 3 */}
            <div className="flex items-center gap-2 text-fg-subtle">
              <span className="w-6 h-6 rounded-full bg-line-subtle text-fg-muted flex items-center justify-center text-xs border border-line">
                3
              </span>
              <span className="hidden sm:inline">03. Hoàn tất & In 3D</span>
            </div>
          </div>
        </div>

        {/* Account Authentication Banner */}
        {isLoggedIn ? (
          <div className="bg-surface p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-e1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                <Icon name="verified_user" size={24} />
              </div>
              <div>
                <p className="font-bold text-xs text-fg">
                  {isVi ? `Tài khoản đặt hàng: ${profile?.displayName || user?.email}` : `Ordering Account: ${profile?.displayName || user?.email}`}
                </p>
                <p className="text-xs text-fg-subtle font-mono">
                  {isVi
                    ? 'Đơn hàng sẽ tự động lưu vào kho lưu trữ số và cấp quyền theo dõi tiến độ in 3D.'
                    : 'Order will be stored in your digital library with real-time print tracking.'}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-primary/10 text-primary rounded-lg uppercase">
              {profile?.role || '—'}
            </span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-positive-tint to-primary-tint border border-positive/30 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-e1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-positive text-primary-fg flex items-center justify-center font-bold shrink-0 shadow-e1">
                <Icon name="bolt" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xs text-positive">
                    {isVi ? 'Chế độ Đặt Hàng Khách Vãng Lai (Guest Checkout)' : 'Guest Checkout Active'}
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-positive/20 text-positive text-xs font-mono font-bold">
                    Không Cần Mật Khẩu
                  </span>
                </div>
                <p className="text-xs text-positive font-sans mt-0.5">
                  {isVi
                    ? 'Bạn có thể đặt in trực tiếp bằng SĐT & Địa chỉ. Hệ thống tự động cấp Mã Truy Cập Riêng (Access Token) để tra cứu trạng thái đơn hàng.'
                    : 'Checkout instantly with phone & address. A secure token will be generated to track your fabrication live.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/auth/login?redirectTo=/checkout"
                className="px-3.5 py-1.5 bg-surface hover:bg-positive-tint text-positive border border-positive/30 rounded-sm text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="login" size={16} />
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
            <div className="bg-surface p-6 sm:p-7 rounded-lg shadow-e1 space-y-5">
              <h2 className="font-extrabold text-base text-fg flex items-center gap-2 border-b border-line pb-3.5 font-mono uppercase">
                <Icon name="local_shipping" size={24} className="text-primary" />
                <span>1. Thông Tin Nhận Hàng & Lệnh Chế Tác</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label htmlFor="checkout-full-name" className="text-xs uppercase font-bold text-fg-subtle block mb-1.5">
                    Họ và tên người nhận *
                  </label>
                  <input
                    id="checkout-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-canvas border border-line-control px-3.5 py-2.5 text-xs text-fg rounded-md focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="checkout-phone" className="text-xs uppercase font-bold text-fg-subtle block mb-1.5">
                    Số điện thoại nhận hàng *
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-canvas border border-line-control px-3.5 py-2.5 text-xs text-fg rounded-md focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-email" className="text-xs uppercase font-bold text-fg-subtle block mb-1.5">
                    Email nhận file CAD & hóa đơn VAT *
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-canvas border border-line-control px-3.5 py-2.5 text-xs text-fg rounded-md focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="checkout-city" className="text-xs uppercase font-bold text-fg-subtle block mb-1.5">
                    Tỉnh / Thành phố *
                  </label>
                  <select
                    id="checkout-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-canvas border border-line-control px-3 py-2.5 text-xs text-fg rounded-md focus:outline-none focus:border-primary cursor-pointer"
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
                  <label htmlFor="checkout-district" className="text-xs uppercase font-bold text-fg-subtle block mb-1.5">
                    Quận / Huyện / Khu Công Nghệ *
                  </label>
                  <input
                    id="checkout-district"
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-canvas border border-line-control px-3.5 py-2.5 text-xs text-fg rounded-md focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-address" className="text-xs uppercase font-bold text-fg-subtle block mb-1.5">
                    Địa chỉ chi tiết (Số nhà, tòa nhà, phòng Lab) *
                  </label>
                  <input
                    id="checkout-address"
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-canvas border border-line-control px-3.5 py-2.5 text-xs text-fg rounded-md focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-note" className="text-xs uppercase font-bold text-fg-subtle block mb-1.5">
                    Ghi chú kỹ thuật dung sai cho kỹ sư vận hành xưởng
                  </label>
                  <textarea
                    id="checkout-note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-canvas border border-line-control px-3.5 py-2.5 text-xs text-fg rounded-md focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method Selection */}
            <div className="bg-surface p-6 sm:p-7 rounded-lg shadow-e1 space-y-4">
              <h2 className="font-extrabold text-base text-fg flex items-center gap-2 border-b border-line pb-3.5 font-mono uppercase">
                <Icon name="payments" size={24} className="text-primary" />
                <span>2. Phương Thức Thanh Toán</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                {/* Method 1: VietQR */}
                <label
                  htmlFor="checkout-payment-vietqr"
                  onClick={() => setPaymentMethod('vietqr')}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    paymentMethod === 'vietqr'
                      ? 'border-primary bg-primary/5 shadow-e1'
                      : 'border-line bg-surface hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon name="qr_code_2" size={24} className="text-primary" />
                    <input
                      id="checkout-payment-vietqr"
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'vietqr'}
                      onChange={() => setPaymentMethod('vietqr')}
                      className="accent-primary"
                    />
                  </div>
                  <div>
                    <strong className="text-xs text-fg block">VietQR Ngân Hàng</strong>
                    <span className="text-xs text-fg-subtle">Tự động điền số tiền & xác nhận 2s</span>
                  </div>
                </label>

                {/* Method 2: VNPAY */}
                <label
                  htmlFor="checkout-payment-vnpay"
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    paymentMethod === 'vnpay'
                      ? 'border-primary bg-primary/5 shadow-e1'
                      : 'border-line bg-surface hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon name="account_balance_wallet" size={24} className="text-primary" />
                    <input
                      id="checkout-payment-vnpay"
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'vnpay'}
                      onChange={() => setPaymentMethod('vnpay')}
                      className="accent-primary"
                    />
                  </div>
                  <div>
                    <strong className="text-xs text-fg block">Cổng VNPAY QR</strong>
                    <span className="text-xs text-fg-subtle">Thẻ ATM / Visa / Ví VNPAY</span>
                  </div>
                </label>

                {/* Method 3: COD */}
                <label
                  htmlFor="checkout-payment-cod"
                  onClick={() => physicalItems.length > 0 && setPaymentMethod('cod')}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col justify-between space-y-2 ${
                    physicalItems.length === 0
                      ? 'opacity-40 border-line cursor-not-allowed'
                      : paymentMethod === 'cod'
                      ? 'border-primary bg-primary/5 shadow-e1 cursor-pointer'
                      : 'border-line bg-surface hover:border-primary cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon name="handshake" size={24} className="text-primary" />
                    <input
                      id="checkout-payment-cod"
                      type="radio"
                      name="payment"
                      disabled={physicalItems.length === 0}
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-primary"
                    />
                  </div>
                  <div>
                    <strong className="text-xs text-fg block">Thanh Toán COD</strong>
                    <span className="text-xs text-fg-subtle">
                      {physicalItems.length === 0 ? 'Chỉ áp dụng hàng in 3D' : 'Nhận hàng & kiểm tra QC'}
                    </span>
                  </div>
                </label>
              </div>

              {/* VietQR Instructions Box */}
              {paymentMethod === 'vietqr' && (
                <div className="p-4 bg-canvas border border-line rounded-lg font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-primary font-bold">
                    <span>Thông Tin Chuyển Khoản:</span>
                    {/* PC-03: không được quảng cáo "Tự động duyệt" khi chưa có cổng thanh toán. */}
                    <span className="text-xs bg-warning-tint text-warning px-2 py-0.5 rounded-sm">
                      Thanh toán mô phỏng — xác nhận thủ công
                    </span>
                  </div>
                  {hasTransferInfo ? (
                    <div className="grid grid-cols-2 gap-2 text-xs text-fg-muted">
                      {bankName && (
                        <div>Ngân hàng: <strong className="text-fg">{bankName}</strong></div>
                      )}
                      {bankAccount && (
                        <div>Số tài khoản: <strong className="text-primary">{bankAccount}</strong></div>
                      )}
                      {accountHolder && (
                        <div>Chủ tài khoản: <strong className="text-fg">{accountHolder}</strong></div>
                      )}
                      <div>
                        Số tiền: <strong className="text-primary">{totalAmount.toLocaleString('vi-VN')} đ</strong>
                      </div>
                      <div className="col-span-2">
                        Nội dung chuyển khoản: <strong className="text-warning">VCUBE {phone.replace(/\s/g, '') || '<SĐT>'}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-warning-tint border border-warning/30 rounded-md space-y-2 text-xs text-fg-muted">
                      <p className="font-bold text-warning">
                        {isVi
                          ? 'Chưa cấu hình thông tin chuyển khoản — liên hệ VCUBE'
                          : 'Transfer details not configured — contact VCUBE'}
                      </p>
                      <p className="leading-relaxed">
                        {isVi
                          ? `VCUBE chưa khai báo ngân hàng, số tài khoản và tên pháp nhân nhận chuyển khoản. Vui lòng liên hệ VCUBE để nhận thông tin chính xác trước khi chuyển ${totalAmount.toLocaleString('vi-VN')} đ.`
                          : `VCUBE has not configured a receiving bank account. Contact VCUBE for the correct details before transferring ${totalAmount.toLocaleString('vi-VN')} đ.`}
                      </p>
                      {canConfigureTransferInfo && (
                        <Link
                          to="/admin"
                          className="inline-flex items-center gap-1.5 font-mono font-bold text-primary hover:underline"
                        >
                          <Icon name="settings" size={16} />
                          <span>{isVi ? 'Cấu hình ngay (Cấu hình → Pháp lý & Định danh)' : 'Configure now (Settings → Legal & Identity)'}</span>
                        </Link>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-fg-subtle leading-relaxed pt-1">
                    {isVi
                      ? 'Đơn hàng sẽ ở trạng thái CHỜ THANH TOÁN cho tới khi VCUBE đối soát được khoản chuyển. Xưởng chỉ bắt đầu in sau khi thanh toán được xác nhận.'
                      : 'The order stays AWAITING PAYMENT until the transfer is reconciled. Production starts only after payment is confirmed.'}
                  </p>
                </div>
              )}
            </div>

            {/* 3. Electronic VAT Invoice Toggle */}
            <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-e1 space-y-3 font-mono">
              <label htmlFor="checkout-needs-vat-invoice" className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="checkout-needs-vat-invoice"
                  type="checkbox"
                  checked={needsVatInvoice}
                  onChange={(e) => setNeedsVatInvoice(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-primary accent-primary"
                />
                <span className="text-xs font-bold text-fg">
                  {vat
                    ? `Yêu cầu xuất hóa đơn điện tử ${vatLabel(vat.rate)} cho Doanh nghiệp / Dự án`
                    : 'Yêu cầu xuất hóa đơn điện tử cho Doanh nghiệp / Dự án (VAT chưa được cấu hình)'}
                </span>
              </label>

              {needsVatInvoice && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line text-xs">
                  <div>
                    <label htmlFor="checkout-vat-company-name" className="text-xs uppercase font-bold text-fg-subtle block mb-1">
                      Tên doanh nghiệp / Đơn vị *
                    </label>
                    <input
                      id="checkout-vat-company-name"
                      type="text"
                      placeholder="CÔNG TY TNHH CÔNG NGHỆ..."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-canvas border border-line-control px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-vat-tax-code" className="text-xs uppercase font-bold text-fg-subtle block mb-1">
                      Mã số thuế *
                    </label>
                    <input
                      id="checkout-vat-tax-code"
                      type="text"
                      placeholder="Nhập mã số thuế"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full bg-canvas border border-line-control px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-vat-address" className="text-xs uppercase font-bold text-fg-subtle block mb-1">
                      Địa chỉ đăng ký kinh doanh *
                    </label>
                    <input
                      id="checkout-vat-address"
                      type="text"
                      placeholder="Tầng 5, Tòa nhà Innovation, Cầu Giấy, Hà Nội"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="w-full bg-canvas border border-line-control px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Manifest Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface border border-line rounded-lg p-6 shadow-e2 space-y-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="font-extrabold text-base text-fg font-mono uppercase tracking-wide">
                  Đơn Hàng ({cart.length} mục)
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('cart')}
                  className="text-xs font-mono font-bold text-primary hover:underline cursor-pointer"
                >
                  Sửa giỏ hàng
                </button>
              </div>

              {/* Items Mini-list */}
              <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-line/60 pr-1 scrollbar-none">
                {cart.map((item) => (
                  <div key={item.id} className="pt-2 flex items-center gap-3 font-mono text-xs">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-md object-cover border border-line bg-surface-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-fg truncate text-xs">{item.name}</p>
                      <p className="text-xs text-fg-subtle">
                        {item.type === 'digital' ? 'Bản quyền CAD' : `${item.material} • Qty: ${item.quantity}`}
                      </p>
                    </div>
                    <span className="font-bold text-fg text-xs shrink-0">
                      {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="space-y-2.5 text-xs font-mono text-fg-muted border-t border-line pt-4">
                <div className="flex justify-between">
                  <span>Tạm tính sản phẩm:</span>
                  <span className="font-bold text-fg">{subtotal.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className={`font-bold ${shippingFee === 0 ? 'text-positive' : 'text-fg'}`}>
                    {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-positive font-bold">
                    <span>Mã ưu đãi đã áp dụng:</span>
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

              {/* B1 — ghi DB hỏng thì KHÔNG có màn hình thành công; lỗi thật hiện ở đây. */}
              {orderError && (
                <div
                  role="alert"
                  className="p-3 bg-danger-tint border border-danger/40 rounded-lg font-mono text-xs space-y-1"
                >
                  <p className="font-bold text-danger flex items-center gap-1.5">
                    <Icon name="error" size={16} className="shrink-0" />
                    <span>{isVi ? 'ĐƠN HÀNG CHƯA ĐƯỢC TẠO' : 'ORDER NOT CREATED'}</span>
                  </p>
                  <p className="text-fg-muted leading-relaxed">
                    {isVi
                      ? 'Hệ thống chưa ghi được đơn vào cơ sở dữ liệu, nên đơn CHƯA tồn tại. Chi tiết lỗi:'
                      : 'The order was not written to the database, so it does NOT exist. Error detail:'}
                  </p>
                  <p className="text-danger break-words">{orderError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isProcessing}
                className="font-mono font-bold text-xs uppercase tracking-wider shadow-e2"
                leadingIcon={<Icon name={isProcessing ? 'hourglass_top' : 'check_circle'} size={18} />}
              >
                <span>{isProcessing ? 'ĐANG KHỞI TẠO ĐƠN HÀNG...' : 'XÁC NHẬN & TẠO ĐƠN HÀNG'}</span>
              </Button>

              <p className="text-xs font-mono text-center text-fg-subtle leading-snug">
                Bằng việc xác nhận đặt hàng, bạn đồng ý với Điều khoản Chế tác & Bản quyền thương mại của VCUBE.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
