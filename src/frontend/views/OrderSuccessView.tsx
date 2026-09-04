import React, { useState } from 'react';
import { Order } from '../../types';
import { useLanguage } from '../context/LanguageContext';

interface OrderSuccessViewProps {
  order: Order;
  onNavigate: (screen: string, payload?: any) => void;
  onOpenInvoice: (order: Order) => void;
}

export const OrderSuccessView: React.FC<OrderSuccessViewProps> = ({
  order,
  onNavigate,
  onOpenInvoice
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [copiedToken, setCopiedToken] = useState(false);

  const hasDigitalItems = order.items.some(i => i.type === 'digital');
  const hasPhysicalItems = order.items.some(i => i.type === 'physical');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091426] py-8 sm:py-12 px-4 sm:px-6 md:px-12">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Main Success Card */}
        <div className="bg-white border border-[#CBD5E1] p-6 sm:p-10 rounded-2xl text-center space-y-6 shadow-md">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-3xl font-bold">check_circle</span>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 font-mono text-xs text-[#64748B] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Đơn Hàng Đã Được Khởi Tạo Thành Công</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091426]">
              Xác Nhận Đơn Hàng Thành Công
            </h1>
            <p className="text-xs font-mono text-[#64748B] mt-2">
              Mã đơn: <strong className="text-[#00687A] text-sm">{order.orderNumber}</strong> • Ngày tạo: {order.date}
            </p>
          </div>

          {/* Guest Checkout Access Token Badge */}
          {order.secureAccessToken && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-left shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-700">key</span>
                  <span>MÃ TRA CỨU KHÁCH VÃNG LAI (GUEST ACCESS TOKEN)</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                  Không Cần Mật Khẩu
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 font-sans">
                Bạn đang đặt hàng ở chế độ Khách Vãng Lai. Hãy lưu mã này để tra cứu trạng thái in và tiến độ đơn hàng bất kỳ lúc nào:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <code className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900 select-all flex-1 truncate">
                  {order.secureAccessToken}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(order.secureAccessToken!);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-xs">{copiedToken ? 'check' : 'content_copy'}</span>
                  <span>{copiedToken ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 4-Step Live Pipeline Status Indicator */}
          <div className="py-6 border-y border-[#CBD5E1] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
            {/* Stage 1 */}
            <div className="space-y-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="w-6 h-6 bg-emerald-700 text-white flex items-center justify-center mx-auto text-xs font-bold rounded-full">
                ✓
              </div>
              <p className="font-bold text-emerald-900 text-[11px]">1. Thanh toán</p>
              <p className="text-[10px] text-emerald-700">Đã xác nhận</p>
            </div>

            {/* Stage 2 (Active) */}
            <div className="space-y-1.5 p-2 rounded-xl bg-[#00687A]/10 border border-[#00687A]/30">
              <div className="w-6 h-6 bg-[#00687A] text-white flex items-center justify-center mx-auto text-xs font-bold rounded-full animate-pulse">
                2
              </div>
              <p className="font-bold text-[#00687A] text-[11px]">2. Cắt lớp G-Code</p>
              <p className="text-[10px] text-[#00687A]">Kỹ sư đang duyệt</p>
            </div>

            {/* Stage 3 */}
            <div className="space-y-1.5 p-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] opacity-70">
              <div className="w-6 h-6 bg-[#CBD5E1] text-[#091426] flex items-center justify-center mx-auto text-xs font-bold rounded-full">
                3
              </div>
              <p className="font-bold text-[#091426] text-[11px]">3. Lên bàn in 3D</p>
              <p className="text-[10px] text-[#64748B]">Bambu X1C Farm</p>
            </div>

            {/* Stage 4 */}
            <div className="space-y-1.5 p-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] opacity-50">
              <div className="w-6 h-6 bg-[#CBD5E1] text-[#091426] flex items-center justify-center mx-auto text-xs font-bold rounded-full">
                4
              </div>
              <p className="font-bold text-[#091426] text-[11px]">4. Giao VCUBE</p>
              <p className="text-[10px] text-[#64748B]">Dung sai ±0.05mm</p>
            </div>
          </div>

          {/* Instant Digital CAD Download Box (If order contains CAD items) */}
          {hasDigitalItems && (
            <div className="p-4 bg-[#00687A]/5 border border-[#00687A]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00687A] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">folder_zip</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#091426]">Tệp CAD Kỹ Thuật Số Sẵn Sàng</h4>
                  <p className="text-[11px] text-[#64748B] font-mono">
                    Gói file .STL + .STEP + .3MF kèm Commercial License đã được cấp quyền.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('assets')}
                className="px-4 py-2 bg-[#00687A] hover:bg-[#005260] text-white font-mono text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Mở Kho Tệp CAD</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 font-mono">
            {hasPhysicalItems && (
              <button
                onClick={() => onNavigate('tracking', { orderId: order.id })}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#091426] hover:bg-[#00687A] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer touch-target-btn active:scale-95"
              >
                <span className="material-symbols-outlined text-base">sensors</span>
                <span>THEO DÕI CAMERA XƯỞNG IN 3D</span>
              </button>
            )}

            <button
              onClick={() => onOpenInvoice(order)}
              className="w-full sm:w-auto px-5 py-3.5 border border-[#CBD5E1] hover:border-[#00687A] hover:bg-[#F8FAFC] text-[#091426] text-xs uppercase tracking-wider font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer touch-target-btn shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              <span>Xuất Hóa Đơn VAT (PDF)</span>
            </button>
          </div>
        </div>

        {/* Order Details & Summary Card */}
        <div className="bg-white border border-[#CBD5E1] p-5 sm:p-7 rounded-2xl shadow-xs space-y-5">
          <h2 className="font-extrabold text-sm sm:text-base text-[#091426] flex items-center gap-2 border-b border-[#CBD5E1] pb-3.5 font-mono uppercase">
            <span className="material-symbols-outlined text-[#00687A] text-lg">inventory_2</span>
            <span>Danh Sách Linh Kiện & Dịch Vụ ({order.items.length})</span>
          </h2>

          <div className="divide-y divide-[#CBD5E1]">
            {order.items.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3.5 truncate">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#CBD5E1] bg-[#091426] shrink-0"
                  />
                  <div className="truncate">
                    <h3 className="font-bold text-xs text-[#091426] truncate">{item.name}</h3>
                    <p className="text-[11px] text-[#64748B]">
                      {item.type === 'digital' ? 'Bản quyền CAD (.STL + .STEP)' : `${item.quantity}x • ${item.material} • ${item.color || ''}`}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-xs text-[#091426] shrink-0 ml-3">
                  {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3.5 border-t border-[#CBD5E1] flex items-center justify-between text-xs font-mono">
            <span className="text-[11px] text-[#64748B] uppercase">Phương thức thanh toán:</span>
            <span className="font-bold text-[#091426]">{order.payment.method}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[11px] text-[#64748B] uppercase">Tổng thanh toán đã duyệt:</span>
            <span className="font-mono font-black text-base sm:text-lg text-[#00687A]">
              {order.payment.total.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
