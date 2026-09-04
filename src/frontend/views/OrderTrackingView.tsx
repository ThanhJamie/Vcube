import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Order } from '../types';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { OrderProgress } from '../components/OrderProgress';
import { MOCK_ORDERS } from '../../data/mockData';
import { dbService } from '../../backend/supabase/database';

interface OrderTrackingViewProps {
  order?: Order;
  onNavigate: (screen: string, payload?: any) => void;
  onOpenChat: () => void;
  onOpenInvoice: (order: Order) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  order: initialOrder,
  onNavigate,
  onOpenChat,
  onOpenInvoice
}) => {
  const location = useLocation();
  const [currentOrder, setCurrentOrder] = useState<Order>(initialOrder || MOCK_ORDERS[0]);
  const [isGuestSearchMode, setIsGuestSearchMode] = useState<boolean>(false);
  const [lookupCode, setLookupCode] = useState<string>('');
  const [lookupAuth, setLookupAuth] = useState<string>('');
  const [lookupError, setLookupError] = useState<string>('');
  const [warrantyClaimSent, setWarrantyClaimSent] = useState<boolean>(false);

  // Inspect URL parameters for magic tracking links (?code=... or ?token=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('code') || params.get('order');
    if (codeParam) {
      const found = MOCK_ORDERS.find(
        (o) => o.orderNumber.toLowerCase() === codeParam.toLowerCase() || o.id.toLowerCase() === codeParam.toLowerCase()
      );
      if (found) {
        setCurrentOrder(found);
        setIsGuestSearchMode(false);
      } else {
        setLookupCode(codeParam);
        setIsGuestSearchMode(true);
      }
    }
  }, [location.search]);

  // Sync when initialOrder prop changes
  useEffect(() => {
    if (initialOrder) {
      setCurrentOrder(initialOrder);
    }
  }, [initialOrder]);

  const layerProgress = currentOrder.layerProgress || 64;
  const currentStageIndex = currentOrder.statusStageIndex ?? (
    currentOrder.status === 'completed' ? 7 :
    currentOrder.status === 'shipping' ? 7 :
    currentOrder.status === 'post_processing' ? 5 :
    currentOrder.status === 'printing' ? 4 : 0
  );

  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    const cleanCode = lookupCode.trim();
    const cleanCodeLower = cleanCode.toLowerCase();
    const cleanAuth = lookupAuth.trim();
    const cleanAuthLower = cleanAuth.toLowerCase();

    // 1. If security token is provided, attempt database query via secure_access_token
    if (cleanAuth) {
      try {
        const dbOrder = await dbService.getOrderByToken(cleanCode, cleanAuth);
        if (dbOrder) {
          setCurrentOrder(dbOrder);
          setIsGuestSearchMode(false);
          setLookupError('');
          return;
        }
      } catch (err) {
        console.warn('Lookup via dbService error:', err);
      }
    }

    // 2. Fallback to localStorage orders
    try {
      const storedOrders: Order[] = JSON.parse(localStorage.getItem('vcube_orders') || '[]');
      const foundStored = storedOrders.find((o) => {
        const matchCode = o.orderNumber.toLowerCase() === cleanCodeLower || o.id.toLowerCase() === cleanCodeLower || o.orderNumber.replace('#', '').toLowerCase() === cleanCodeLower;
        if (!matchCode) return false;
        if (cleanAuthLower) {
          const matchPhone = o.shippingAddress?.phone?.replace(/\s/g, '').includes(cleanAuthLower.replace(/\s/g, ''));
          const matchToken = o.secureAccessToken?.toLowerCase() === cleanAuthLower;
          return matchPhone || matchToken;
        }
        return true;
      });
      if (foundStored) {
        setCurrentOrder(foundStored);
        setIsGuestSearchMode(false);
        setLookupError('');
        return;
      }
    } catch {}

    // 3. Fallback to MOCK_ORDERS
    const found = MOCK_ORDERS.find((o) => {
      const matchCode = o.orderNumber.toLowerCase() === cleanCodeLower || o.id.toLowerCase() === cleanCodeLower || o.orderNumber.replace('#', '').toLowerCase() === cleanCodeLower;
      if (!matchCode) return false;
      if (cleanAuthLower) {
        const matchPhone = o.shippingAddress.phone.replace(/\s/g, '').includes(cleanAuthLower.replace(/\s/g, ''));
        const matchToken = o.secureAccessToken?.toLowerCase() === cleanAuthLower;
        return matchPhone || matchToken;
      }
      return true;
    });

    if (found) {
      setCurrentOrder(found);
      setIsGuestSearchMode(false);
      setLookupError('');
    } else {
      setLookupError('Không tìm thấy đơn hàng với thông tin này. Vui lòng kiểm tra mã đơn hoặc token / số điện thoại.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091426] py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Breadcrumb & Return Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-[#CBD5E1]">
          <div className="flex items-start sm:items-center gap-3">
            <button
              onClick={() => onNavigate('my_orders')}
              className="p-2 border border-[#CBD5E1] bg-white hover:bg-slate-100 text-[#091426] rounded-xl transition-colors shrink-0 mt-1 sm:mt-0 cursor-pointer shadow-2xs"
              aria-label="Quay lại danh sách đơn hàng"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#00687A] text-[9px] sm:text-[10px] uppercase tracking-widest font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#57DFFE] animate-pulse"></span>
                  Live Telemetry // VCUBE MES Hub
                </span>
                <span className="px-2.5 py-0.5 bg-[#091426] text-white text-[10px] font-mono font-bold rounded-lg shrink-0">
                  {currentOrder.orderNumber}
                </span>
                {currentOrder.customerType === 'guest' && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-mono font-bold rounded-md">
                    GUEST ORDER
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091426] tracking-tight">
                Tiến Độ Gia Công & Kiểm Tra Dung Sai QC
              </h1>
              <p className="text-xs text-[#545F73] mt-0.5">
                Ngày đặt: <strong className="text-[#091426]">{currentOrder.date}</strong> • Dự kiến giao xưởng: <strong className="text-[#091426]">{currentOrder.estimatedDelivery}</strong>
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto font-mono">
            <button
              onClick={() => setIsGuestSearchMode(!isGuestSearchMode)}
              className="px-3 py-2 border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#545F73] hover:text-[#091426] text-xs uppercase font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">search</span>
              <span>{isGuestSearchMode ? 'Xem Đơn Hiện Tại' : 'Tra Cứu Mã Khác'}</span>
            </button>
            <button
              onClick={onOpenChat}
              className="px-4 py-2 bg-[#00687A] hover:bg-[#005260] text-white text-xs uppercase font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">support_agent</span>
              <span>Kỹ Sư Trực Ca</span>
            </button>
            <button
              onClick={() => onOpenInvoice(currentOrder)}
              className="px-4 py-2 border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#091426] text-xs uppercase font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              <span>Hóa Đơn PDF</span>
            </button>
          </div>
        </div>

        {/* Guest Magic Tracking Search Card (Expandable) */}
        {isGuestSearchMode && (
          <div className="bg-white border-2 border-[#00687A]/30 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-2 text-[#00687A]">
                <span className="material-symbols-outlined text-xl">travel_explore</span>
                <h3 className="font-bold text-sm text-[#091426] uppercase font-mono tracking-wider">
                  Cổng Tra Cứu Đơn Hàng Khách Vãng Lai (Guest Magic Portal)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#64748B]">Không cần mật khẩu đăng nhập</span>
            </div>

            <form onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-[#091426] mb-1">
                  Mã Đơn Hàng:
                </label>
                <input
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="Ví dụ: #VCUBE-8924-A"
                  className="w-full p-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-mono text-xs focus:outline-none focus:border-[#00687A]"
                  required
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-[#091426] mb-1">
                  Số Điện Thoại Nhận Hàng hoặc Mã PIN:
                </label>
                <input
                  type="text"
                  value={lookupAuth}
                  onChange={(e) => setLookupAuth(e.target.value)}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full p-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-mono text-xs focus:outline-none focus:border-[#00687A]"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#091426] hover:bg-[#1E293B] text-white font-mono font-bold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Tra Cứu
                </button>
              </div>
            </form>

            {lookupError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {lookupError}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#64748B]">
              <span>Mã mẫu thử nghiệm:</span>
              <button
                type="button"
                onClick={() => {
                  setLookupCode('#VCUBE-8924-A');
                  setLookupAuth('0987 654 321');
                }}
                className="text-[#00687A] underline font-mono cursor-pointer"
              >
                #VCUBE-8924-A (Đang in)
              </button>
            </div>
          </div>
        )}

        {/* 8-Stage Pipeline Card */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#CBD5E1] gap-2">
            <h2 className="font-bold text-base text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-[#00687A]">linear_scale</span>
              Quy Trình 8 Bước Gia Công Công Nghiệp & Kiểm Định Dung Sai (QC)
            </h2>
            <span className="text-xs font-mono text-[#00687A] font-bold flex items-center gap-1.5 px-3 py-1 bg-teal-50 rounded-full border border-teal-200 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse"></span>
              Xưởng Vận Hành ISO 9001
            </span>
          </div>

          {/* Full Pipeline Visualizer */}
          <OrderProgress
            currentStageIndex={currentStageIndex}
            layerProgress={layerProgress}
            variant="full"
            status={currentOrder.status}
          />

          {/* Real-time Hardware Telemetry Strip */}
          <div className="bg-[#091426] p-5 text-white rounded-xl flex flex-col lg:flex-row items-center justify-between gap-6 border border-[#1E293B] shadow-sm">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="w-11 h-11 bg-[#00687A]/30 border border-[#57DFFE]/40 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#57DFFE] text-2xl animate-spin-slow">
                  precision_manufacturing
                </span>
              </div>
              <div className="text-xs">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#57DFFE] font-bold">
                  Máy In Khí Động Học #08 // VCUBE Precision X1
                </p>
                <p className="text-slate-300 font-sans mt-0.5">
                  Đầu đùn: <strong className="text-white font-mono">220°C</strong> • Bàn nhiệt: <strong className="text-white font-mono">60°C</strong> • Tốc độ: <strong className="text-white font-mono">250 mm/s</strong>
                </p>
              </div>
            </div>

            <div className="w-full lg:w-96 flex items-center gap-4 text-xs font-mono">
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Lớp cắt: 384 / 600</span>
                  <span className="text-[#57DFFE] font-bold">{layerProgress}%</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-[#00687A] to-[#57DFFE] h-full rounded-full transition-all duration-500"
                    style={{ width: `${layerProgress}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Thời gian còn lại:</span>
                <span className="font-bold text-white text-sm">{currentOrder.timeRemaining || '04h 12m'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column: Live 3D Simulation Viewport + Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left: 3D Realtime Layer Model View */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
                <h3 className="font-bold text-sm text-[#091426] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#00687A]">view_in_ar</span>
                  Mô Phỏng Lớp In 3D (Digital Twin Preview)
                </h3>
                <span className="text-[10px] font-mono text-[#00687A] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 font-bold">
                  Layer Height: 0.16mm
                </span>
              </div>

              <div className="bg-[#091426] rounded-xl border border-[#1E293B] p-2 overflow-hidden shadow-inner">
                <ThreeModelViewer
                  modelType="box"
                  color="#57DFFE"
                  className="h-[280px] sm:h-[340px] lg:h-[360px] w-full"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono pt-1">
                <span>Trọng lượng ước tính: 84.5g</span>
                <span>Dung sai cam kết: ±0.05mm</span>
              </div>
            </div>

            {/* Tolerance Guarantee Commitment Banner */}
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-4.5 flex items-start gap-3 text-xs">
              <span className="material-symbols-outlined text-xl text-[#00687A] shrink-0 mt-0.5">
                verified
              </span>
              <div className="space-y-1">
                <h4 className="font-bold text-[#091426]">Chứng Nhận Dung Sai Kỹ Thuật VCUBE Assurance</h4>
                <p className="text-[#545F73]">
                  Mỗi chi tiết xuất xưởng đều được quét 3D laser hoặc đo bằng thước cặp điện tử Mitutoyo để đảm bảo không bị sai lệch quá ±0.05mm. Nếu không khớp lắp ghép, bạn được bảo hành in lại miễn phí trong 48h.
                </p>
                {warrantyClaimSent ? (
                  <span className="text-emerald-700 font-bold font-mono inline-block pt-1">
                    ✓ Hồ sơ khiếu nại đã gửi tới kỹ sư ca trực.
                  </span>
                ) : (
                  <button
                    onClick={() => setWarrantyClaimSent(true)}
                    className="text-[#00687A] font-bold underline font-mono text-[11px] pt-1 cursor-pointer"
                  >
                    Báo cáo sai số lắp ghép (Kích hoạt bảo hành) →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Items, Carrier & Shipping Details */}
          <div className="lg:col-span-6 space-y-5">
            {/* Ordered Items */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
                <h3 className="font-bold text-sm text-[#091426]">
                  Linh Kiện Trong Đơn Hàng ({currentOrder.items.length})
                </h3>
                <span className="text-xs font-mono text-[#64748B]">
                  Tổng: {currentOrder.payment.total.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              <div className="divide-y divide-[#CBD5E1]">
                {currentOrder.items.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 truncate">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-13 h-13 object-cover border border-[#CBD5E1] rounded-xl bg-slate-100 shrink-0"
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-sm text-[#091426] truncate">{item.name}</h4>
                        <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                          {item.quantity}x • {item.material || 'Nhựa PLA+'} • {item.color || 'Kỹ thuật'}
                        </p>
                        {item.resolution && (
                          <span className="text-[10px] text-[#00687A] font-mono block">
                            Độ phân giải: {item.resolution}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-[#00687A] shrink-0 ml-3">
                      {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Carrier & Delivery Info */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 text-xs shadow-xs">
              <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
                <h3 className="font-bold text-sm text-[#091426] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#00687A]">local_shipping</span>
                  Vận Chuyển Chuyên Dụng Chống Va Đập
                </h3>
                <span className="text-[#00687A] font-mono font-bold text-xs bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                  {currentOrder.carrier.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[#64748B] text-[10px] font-mono uppercase tracking-wider block">Mã Vận Đơn:</span>
                  <span className="font-mono font-bold text-sm text-[#00687A]">{currentOrder.carrier.trackingCode}</span>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px] font-mono uppercase tracking-wider block">Người Nhận:</span>
                  <span className="font-bold text-[#091426]">{currentOrder.shippingAddress.fullName} ({currentOrder.shippingAddress.phone})</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#64748B] text-[10px] font-mono uppercase tracking-wider block">Địa Chỉ Nhận Hàng:</span>
                  <span className="text-[#334155]">{currentOrder.shippingAddress.address}, {currentOrder.shippingAddress.district}, {currentOrder.shippingAddress.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
