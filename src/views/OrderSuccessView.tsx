import React from 'react';
import { Order } from '../types';

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
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-8 sm:py-12 px-4 sm:px-6 md:px-12">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Success Card */}
        <div className="bg-white border border-black/10 p-6 sm:p-10 text-center space-y-6">
          <div className="w-12 sm:w-14 h-12 sm:h-14 bg-[#1C1C1C] text-white flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">check</span>
          </div>

          <div>
            <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#A69C8A] block mb-2">
              Transmission Confirmed // VCUBE System
            </span>
            <h1 className="fluid-h2 text-[#1C1C1C]">
              Đơn Hàng Khởi Tạo Thành Công
            </h1>
            <p className="text-xs text-[#7D7565] font-sans mt-2">
              Mã đơn: <strong className="text-[#1C1C1C] font-tech">{order.orderNumber}</strong> • Ngày lập: {order.date}
            </p>
          </div>

          {/* 3-Step Live Pipeline Status Indicator */}
          <div className="py-4 sm:py-6 border-y border-black/10 grid grid-cols-3 gap-2 text-center text-xs font-sans">
            <div className="space-y-1.5">
              <div className="w-7 h-7 bg-[#1C1C1C] text-white flex items-center justify-center mx-auto text-xs font-bold font-tech">
                1
              </div>
              <p className="font-bold text-[#1C1C1C] uppercase tracking-wider text-[10px] sm:text-[11px]">Thanh toán</p>
              <p className="text-[9px] sm:text-[10px] text-[#7D7565] font-tech">Hoàn tất</p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 border border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center mx-auto text-xs font-bold font-tech animate-pulse">
                2
              </div>
              <p className="font-bold text-[#1C1C1C] uppercase tracking-wider text-[10px] sm:text-[11px]">Xử lý G-Code</p>
              <p className="text-[9px] sm:text-[10px] text-[#7D7565] font-tech">Đang cắt lớp</p>
            </div>

            <div className="space-y-1.5 opacity-40">
              <div className="w-7 h-7 bg-[#F7F6F2] border border-black/20 text-[#7D7565] flex items-center justify-center mx-auto text-xs font-bold font-tech">
                3
              </div>
              <p className="font-semibold text-[#1C1C1C] uppercase tracking-wider text-[10px] sm:text-[11px]">Lên bàn in 3D</p>
              <p className="text-[9px] sm:text-[10px] text-[#7D7565] font-tech">Dự kiến 26/10</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 font-sans">
            <button
              onClick={() => onNavigate('order_tracking', { order })}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#1C1C1C] hover:bg-[#333] text-white text-[11px] uppercase tracking-widest font-bold shadow-md transition-all flex items-center justify-center gap-2 touch-target-btn"
            >
              <span className="material-symbols-outlined text-sm">sensors</span>
              THEO DÕI TIẾN ĐỘ IN TRỰC TIẾP
            </button>

            <button
              onClick={() => onOpenInvoice(order)}
              className="w-full sm:w-auto px-6 py-3.5 border border-black/20 hover:bg-black/5 text-[#1C1C1C] text-[11px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 touch-target-btn"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              Xuất Hóa Đơn PDF
            </button>
          </div>
        </div>

        {/* Order Details & Summary Card */}
        <div className="bg-white border border-black/10 p-5 sm:p-8 space-y-6">
          <h2 className="font-serif font-bold text-base text-[#1C1C1C] flex items-center gap-2 border-b border-black/10 pb-4">
            <span className="material-symbols-outlined text-base text-[#1C1C1C]">inventory_2</span>
            Danh Sách Linh Kiện Đặt Gia Công ({order.items.length})
          </h2>

          <div className="divide-y divide-black/10">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-3 sm:gap-4 truncate">
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover border border-black/10 bg-[#2A2A2A] shrink-0" />
                  <div className="truncate">
                    <h3 className="font-serif font-bold text-sm text-[#1C1C1C] truncate">{item.name}</h3>
                    <p className="text-[11px] text-[#7D7565]">
                      {item.quantity}x • {item.material || 'Bản vẽ STL'}
                    </p>
                  </div>
                </div>
                <span className="font-tech font-bold text-sm text-[#1C1C1C] shrink-0 ml-3">
                  {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-black/10 flex items-center justify-between text-xs font-sans">
            <span className="text-[10px] uppercase tracking-widest text-[#7D7565]">Tổng thanh toán:</span>
            <span className="font-tech font-bold text-base sm:text-lg text-[#1C1C1C]">{order.payment.total.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
