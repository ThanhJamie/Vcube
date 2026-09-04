import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  CreditCard,
  Building2,
  FileCheck,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Wallet,
  Truck,
  FileText,
  Download,
  Save,
  Info,
  Phone,
  Mail,
  Check,
  Building
} from 'lucide-react';
import { CustomerProfile } from '../types';

export interface CustomerSettingsViewProps {
  onNavigate?: (screen: string, payload?: any) => void;
  onShowToast?: (message: string) => void;
}

const DEFAULT_CUSTOMER_PROFILE: CustomerProfile = {
  id: 'cust-usr-01',
  userId: 'usr-customer-minh',
  preferredPaymentMethod: 'vietqr',
  defaultShippingAddress: {
    recipientName: 'Nguyễn Văn Minh',
    phone: '0912 345 678',
    streetAddress: 'Tầng 5, Tòa nhà FPT Cầu Giấy, Phố Duy Tân',
    ward: 'Dịch Vọng Hậu',
    district: 'Cầu Giấy',
    city: 'Hà Nội',
    deliveryNotes: 'Giao giờ hành chính (8h30 - 17h30), gọi trước 15 phút'
  },
  companyName: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ CHẾ TẠO MÁY TỰ ĐỘNG ROBOMATION',
  taxId: '0109876543',
  billingEmail: 'accounting@robomation.vn',
  ndaSigned: true,
  ndaSignedAt: '2026-03-01T14:30:00.000Z',
  createdAt: '2026-01-20T10:00:00.000Z',
  updatedAt: new Date().toISOString()
};

export const CustomerSettingsView: React.FC<CustomerSettingsViewProps> = ({
  onNavigate,
  onShowToast
}) => {
  // Load profile from localStorage
  const [profile, setProfile] = useState<CustomerProfile>(() => {
    try {
      const saved = localStorage.getItem('vcube_customer_profile');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMER_PROFILE;
    } catch {
      return DEFAULT_CUSTOMER_PROFILE;
    }
  });

  // Basic Account States
  const [fullName, setFullName] = useState(profile.defaultShippingAddress?.recipientName || 'Nguyễn Văn Minh');
  const [phone, setPhone] = useState(profile.defaultShippingAddress?.phone || '0912 345 678');
  const [accountEmail, setAccountEmail] = useState(profile.billingEmail || 'khachhang@vcube.vn');

  // Shipping Address States
  const [streetAddress, setStreetAddress] = useState(profile.defaultShippingAddress?.streetAddress || '');
  const [city, setCity] = useState(profile.defaultShippingAddress?.city || 'Hà Nội');
  const [district, setDistrict] = useState(profile.defaultShippingAddress?.district || 'Cầu Giấy');
  const [ward, setWard] = useState(profile.defaultShippingAddress?.ward || 'Dịch Vọng Hậu');
  const [deliveryNotes, setDeliveryNotes] = useState(profile.defaultShippingAddress?.deliveryNotes || '');

  // Payment Method State
  const [preferredPayment, setPreferredPayment] = useState<CustomerProfile['preferredPaymentMethod']>(
    profile.preferredPaymentMethod || 'vietqr'
  );

  // B2B Corporate States
  const [enableB2B, setEnableB2B] = useState<boolean>(!!profile.companyName || !!profile.taxId);
  const [companyName, setCompanyName] = useState(profile.companyName || '');
  const [taxId, setTaxId] = useState(profile.taxId || '');
  const [billingEmail, setBillingEmail] = useState(profile.billingEmail || '');
  const [businessAddress, setBusinessAddress] = useState(
    'Tầng 8, Tháp Doanh Nhân, 128 Nguyễn Trãi, Thanh Xuân, Hà Nội'
  );

  // NDA State
  const [ndaSigned, setNdaSigned] = useState<boolean>(profile.ndaSigned || false);
  const [ndaSignedAt, setNdaSignedAt] = useState<string | undefined>(profile.ndaSignedAt);
  const [viewingNdaModal, setViewingNdaModal] = useState(false);

  // Toggle NDA signing
  const handleToggleNda = (checked: boolean) => {
    setNdaSigned(checked);
    if (checked) {
      const nowIso = new Date().toISOString();
      setNdaSignedAt(nowIso);
      onShowToast?.('Đã xác nhận ký thỏa thuận bảo mật NDA điện tử!');
    } else {
      setNdaSignedAt(undefined);
    }
  };

  // Save Settings
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updated: CustomerProfile = {
      ...profile,
      preferredPaymentMethod: preferredPayment,
      defaultShippingAddress: {
        recipientName: fullName.trim(),
        phone: phone.trim(),
        streetAddress: streetAddress.trim(),
        city: city.trim(),
        district: district.trim(),
        ward: ward.trim(),
        deliveryNotes: deliveryNotes.trim()
      },
      companyName: enableB2B ? companyName.trim() : undefined,
      taxId: enableB2B ? taxId.trim() : undefined,
      billingEmail: enableB2B ? billingEmail.trim() : undefined,
      ndaSigned: enableB2B ? ndaSigned : false,
      ndaSignedAt: enableB2B ? ndaSignedAt : undefined,
      updatedAt: new Date().toISOString()
    };

    setProfile(updated);
    try {
      localStorage.setItem('vcube_customer_profile', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }
    onShowToast?.('Đã lưu thông tin cấu hình Khách Hàng thành công!');
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] text-slate-800 pb-16 font-sans">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00687A] text-white flex items-center justify-center shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Cài Đặt Tài Khoản & Địa Chỉ Nhận Hàng</h1>
              <p className="text-xs text-slate-500">
                Quản lý địa chỉ giao hàng, phương thức thanh toán và hồ sơ doanh nghiệp B2B
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            Lưu Thay Đổi
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: DEFAULT SHIPPING ADDRESS */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#00687A]" />
              Địa Chỉ Giao Hàng Mặc Định (Shipping Address)
            </h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Tự động điền khi Checkout
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Họ và tên người nhận <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn Minh"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-semibold focus:ring-1 focus:ring-[#00687A]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Số điện thoại người nhận <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="VD: 0912 345 678"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-semibold focus:ring-1 focus:ring-[#00687A]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Địa chỉ chi tiết (Số nhà, ngõ/đường, tòa nhà) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={streetAddress}
              onChange={e => setStreetAddress(e.target.value)}
              placeholder="VD: Tầng 5, Tòa nhà FPT Cầu Giấy, Phố Duy Tân"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-1 focus:ring-[#00687A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tỉnh / Thành phố</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-semibold"
              >
                <option value="Hà Nội">Hà Nội</option>
                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Hải Phòng">Hải Phòng</option>
                <option value="Bình Dương">Bình Dương</option>
                <option value="Đồng Nai">Đồng Nai</option>
                <option value="Cần Thơ">Cần Thơ</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quận / Huyện</label>
              <input
                type="text"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="VD: Cầu Giấy"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phường / Xã</label>
              <input
                type="text"
                value={ward}
                onChange={e => setWard(e.target.value)}
                placeholder="VD: Dịch Vọng Hậu"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ghi chú đóng gói & Hướng dẫn giao hàng cho Shipper
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder="VD: Hàng linh kiện 3D dễ vỡ, giao giờ hành chính, gọi trước khi đến 15 phút..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-1 focus:ring-[#00687A]"
            />
          </div>

          {/* Shipping Label Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-100 text-[#00687A] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900">
                  {fullName} • {phone}
                </div>
                <div className="text-slate-500 mt-0.5">
                  {streetAddress}, {ward}, {district}, {city}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#00687A] bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Nhãn Bưu Phẩm Mẫu
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: PREFERRED PAYMENT METHOD */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#00687A]" />
              Phương Thức Thanh Toán Ưu Tiên (Preferred Payment Method)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn phương thức bạn thường xuyên sử dụng để rút ngắn thời gian đặt hàng.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                id: 'vietqr',
                title: 'VietQR Pro (Khuyên Dùng)',
                desc: 'Quét mã QR ngân hàng Napas 24/7. Duyệt tự động trong 3 giây.',
                icon: QrCode,
                badge: 'Khuyên Dùng'
              },
              {
                id: 'momo',
                title: 'Ví Điện Tử MoMo',
                desc: 'Thanh toán 1 chạm qua app MoMo trên điện thoại.',
                icon: Wallet,
                badge: 'Phổ biến'
              },
              {
                id: 'vnpay',
                title: 'Cổng VNPAY / Thẻ Visa',
                desc: 'Hỗ trợ thẻ ATM nội địa & thẻ thanh toán quốc tế.',
                icon: CreditCard
              },
              {
                id: 'cod',
                title: 'Thanh Toán Khi Nhận (COD)',
                desc: 'Thanh toán tiền mặt cho shipper (cho đơn dưới 500k).',
                icon: Truck
              }
            ].map(item => {
              const isSel = preferredPayment === item.id;
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setPreferredPayment(item.id as any)}
                  className={`p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    isSel
                      ? 'border-[#00687A] bg-teal-50/50 shadow-sm ring-2 ring-[#00687A]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSel ? 'bg-[#00687A] text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSel && (
                        <div className="w-5 h-5 rounded-full bg-[#00687A] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900">{item.title}</div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>

                  {item.badge && (
                    <div className="mt-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                        {item.badge}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: B2B CORPORATE PROFILE & NDA AGREEMENT */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00687A]" />
                <h2 className="text-base font-bold text-slate-900">
                  Hồ Sơ Doanh Nghiệp B2B & Bảo Mật Bản Quyền NDA
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dành cho các doanh nghiệp, phòng R&D, xưởng cơ khí cần xuất hóa đơn VAT điện tử và bảo mật tuyệt đối file CAD 3D.
              </p>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={enableB2B}
                onChange={e => setEnableB2B(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00687A]" />
              <span className="ml-3 text-xs font-bold text-slate-700">
                {enableB2B ? 'Đang kích hoạt B2B' : 'Kích hoạt B2B'}
              </span>
            </label>
          </div>

          {enableB2B && (
            <div className="space-y-6 animate-fadeIn">
              {/* Corporate Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tên Doanh Nghiệp / Tổ Chức (Theo ĐKKD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="VD: CÔNG TY CỔ PHẦN CÔNG NGHỆ ROBOMATION VIỆT NAM"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-1 focus:ring-[#00687A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mã Số Thuế (Tax ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    placeholder="VD: 0109876543"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-mono font-bold focus:ring-1 focus:ring-[#00687A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Địa chỉ trụ sở doanh nghiệp
                  </label>
                  <input
                    type="text"
                    value={businessAddress}
                    onChange={e => setBusinessAddress(e.target.value)}
                    placeholder="Địa chỉ ghi trên giấy phép ĐKKD"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email nhận Hóa Đơn Điện Tử VAT (Billing Email) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={e => setBillingEmail(e.target.value)}
                    placeholder="ketoan@doanhnghiep.vn"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-semibold focus:ring-1 focus:ring-[#00687A]"
                  />
                  <span className="text-[11px] text-slate-400">Hóa đơn điện tử có mã cơ quan thuế gửi về email này sau khi nhận hàng</span>
                </div>
              </div>

              {/* NDA Section */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/40 border-2 border-teal-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Thỏa Thuận Bảo Mật Thông Tin & Bản Quyền R&D 3D (Mutual NDA)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cam kết pháp lý bảo mật song phương giữa Khách Hàng và Mạng Lưới Xưởng VCUBE
                      </p>
                    </div>
                  </div>

                  {ndaSigned ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      ĐÃ KÝ NDA ĐIỆN TỬ
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      CHƯA KÝ NDA
                    </div>
                  )}
                </div>

                {/* NDA Terms Summary */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#00687A]" />
                    Tóm tắt cam kết bảo vệ dữ liệu CAD/STL độc quyền:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                    <li>
                      <strong>Tiêu hủy dữ liệu G-code sau in:</strong> Toàn bộ file slice và tệp CAD gốc của quý công ty chỉ được nạp tạm thời vào máy in và tự động tiêu hủy vĩnh viễn trong vòng 7 ngày sau khi giao hàng.
                    </li>
                    <li>
                      <strong>Cấm sao chép / trích xuất:</strong> Các xưởng in đối tác trong hệ thống MES tuyệt đối không được nhân bản, phân phối hoặc cung cấp file 3D cho bên thứ ba.
                    </li>
                    <li>
                      <strong>Chế tài pháp lý:</strong> VCUBE cam kết bồi thường mọi thiệt hại phát sinh và chịu trách nhiệm pháp lý theo Luật Sở Hữu Trí Tuệ Việt Nam nếu có bất kỳ sự cố rò rỉ dữ liệu nào từ phía xưởng in.
                    </li>
                  </ul>
                </div>

                {/* NDA Interactive Checkbox & Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ndaSigned}
                      onChange={e => handleToggleNda(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-[#00687A] rounded border-slate-300 focus:ring-[#00687A]"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Tôi là đại diện có thẩm quyền của doanh nghiệp, đồng ý ký điện tử Thỏa Thuận Bảo Mật Song Phương (Mutual NDA) với VCUBE Network.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setViewingNdaModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#00687A] hover:underline whitespace-nowrap self-end sm:self-auto"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Xem Toàn Văn Hợp Đồng NDA
                  </button>
                </div>

                {ndaSigned && ndaSignedAt && (
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Thời gian ký ghi nhận: {new Date(ndaSignedAt).toLocaleString('vi-VN')} • Mã chứng thư số: #NDA-VCB-{profile.id.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Save Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white font-bold text-sm shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              Lưu Cấu Hình Khách Hàng
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: FULL NDA TEXT DOCUMENT */}
      {/* ========================================================================= */}
      {viewingNdaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="bg-[#00687A] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-200" />
                <h3 className="font-bold text-sm">THỎA THUẬN BẢO MẬT THÔNG TIN SONG PHƯƠNG (MUTUAL NDA)</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingNdaModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
              <div className="text-center border-b pb-3">
                <div className="font-bold text-sm uppercase text-slate-900">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-slate-500 text-[11px]">Độc lập - Tự do - Hạnh phúc</div>
                <div className="font-bold text-xs uppercase mt-2 text-[#00687A]">
                  VĂN BẢN THỎA THUẬN BẢO MẬT & BẢN QUYỀN MÔ HÌNH 3D (CAD/STL NDA)
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900">ĐIỀU 1: CÁC BÊN THAM GIA</h4>
                <p>
                  <strong>Bên A (Khách hàng Doanh nghiệp):</strong> {companyName || 'Doanh nghiệp đăng ký'}{' '}
                  (Mã số thuế: {taxId || 'N/A'})
                </p>
                <p>
                  <strong>Bên B (Nền tảng VCUBE & Mạng lưới Hub Xưởng MES):</strong> Công ty Cổ phần Công nghệ VCUBE 3D Manufacturing.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900">ĐIỀU 2: PHẠM VI DỮ LIỆU BẢO MẬT</h4>
                <p>
                  Toàn bộ các tệp tin kỹ thuật số bao gồm file CAD (STEP, IGES, SLDPRT), file lưới 3D (STL, 3MF, OBJ), bản vẽ 2D PDF và các thông số dung sai kỹ thuật do Bên A tải lên nền tảng VCUBE để phục vụ báo giá hoặc in ấn chế tác.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900">ĐIỀU 3: NGHĨA VỤ CỦA VCUBE VÀ XƯỞNG IN HUB</h4>
                <p>
                  1. Không được sao chép, phân phối, đăng tải công khai hoặc chuyển giao cho bất kỳ bên thứ ba nào khi chưa có sự đồng ý bằng văn bản của Bên A.
                </p>
                <p>
                  2. Mã G-code nạp vào máy in 3D của các hub xưởng chỉ được sử dụng cho đúng số lượng sản phẩm được đặt hàng. Sau khi nghiệm thu QC thành công, xưởng in cam kết tiêu hủy toàn bộ tệp tin tạm.
                </p>
                <p>
                  3. Bồi thường toàn bộ thiệt hại kinh tế nếu phát hiện có hành vi trích xuất hoặc vi phạm bí mật kinh doanh.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900">ĐIỀU 4: HIỆU LỰC</h4>
                <p>
                  Thỏa thuận này có hiệu lực kể từ thời điểm Bên A tick chọn xác nhận điện tử và có giá trị trong vòng 05 (năm) năm kể từ ngày ký.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onShowToast?.('Đang tải văn bản NDA (PDF)...');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#00687A] hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                Tải văn bản mẫu (PDF)
              </button>

              <button
                type="button"
                onClick={() => setViewingNdaModal(false)}
                className="px-4 py-2 rounded-xl bg-[#00687A] text-white text-xs font-bold"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSettingsView;
