import React, { useState } from 'react';
import { Order } from '../types';

interface MyOrdersViewProps {
  orders: Order[];
  onNavigate: (screen: string, payload?: any) => void;
  onOpenInvoice: (order: Order) => void;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  orders,
  onNavigate,
  onOpenInvoice
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOrders = orders.filter((ord) => {
    if (activeFilter === 'printing' && ord.status !== 'printing') return false;
    if (activeFilter === 'completed' && ord.status !== 'completed') return false;
    if (activeFilter === 'shipping' && ord.status !== 'shipping') return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNumber = ord.orderNumber.toLowerCase().includes(q);
      const matchItems = ord.items.some(i => i.name.toLowerCase().includes(q));
      if (!matchNumber && !matchItems) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-6 sm:py-10 px-4 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-black/10">
          <div>
            <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#A69C8A] block mb-1">
              Archive // VCUBE Records
            </span>
            <h1 className="fluid-h1 text-[#1C1C1C]">
              Lịch Sử Đơn Hàng & Gia Công
            </h1>
            <p className="text-xs sm:text-sm text-[#7D7565] mt-1 font-serif">
              Theo dõi tình trạng gia công, trích xuất hóa đơn GTGT và kiểm tra dữ liệu kỹ thuật.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc tên linh kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-black/15 text-xs text-[#1C1C1C] focus:outline-none focus:border-black font-sans"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#7D7565] text-base">
              search
            </span>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 font-sans">
          {[
            { id: 'all', label: 'Tất cả đơn hàng' },
            { id: 'printing', label: 'Đang gia công in 3D' },
            { id: 'shipping', label: 'Đang vận chuyển' },
            { id: 'completed', label: 'Đã hoàn thành' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 sm:px-4 py-2 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-colors border touch-target-btn ${
                activeFilter === tab.id
                  ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]'
                  : 'bg-white text-[#7D7565] hover:text-[#1C1C1C] border-black/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders Listing */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-black/10 p-10 sm:p-16 text-center">
            <span className="material-symbols-outlined text-4xl text-[#A69C8A] mb-2">receipt_long</span>
            <p className="font-serif font-bold text-base text-[#1C1C1C]">Không có đơn hàng nào trong phân loại này</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white border border-black/10 p-5 sm:p-8 hover:border-black/30 transition-all space-y-4 sm:space-y-6"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-black/10 gap-2 font-sans">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-tech font-bold text-xs sm:text-sm text-[#1C1C1C]">{ord.orderNumber}</span>
                    <span className="text-[11px] text-[#7D7565] font-tech">• {ord.date}</span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold ${
                      ord.status === 'printing'
                        ? 'bg-[#1C1C1C] text-white'
                        : ord.status === 'completed'
                        ? 'bg-[#7D7565] text-white'
                        : 'bg-[#F7F6F2] text-[#1C1C1C] border border-black/10'
                    }`}>
                      {ord.status === 'printing' ? 'Đang In 3D (64%)' : 'Đã Hoàn Tất'}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {ord.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 sm:gap-4 bg-[#F7F6F2] p-3 sm:p-4 border border-black/5">
                      <img src={item.image} alt={item.name} className="w-12 sm:w-14 h-12 sm:h-14 object-cover border border-black/10 shrink-0 bg-[#2A2A2A]" />
                      <div className="truncate text-xs font-sans">
                        <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1C1C1C] truncate">{item.name}</h4>
                        <p className="text-[11px] text-[#7D7565] font-serif">
                          {item.quantity}x • {item.material || 'File STL'} • {item.color || 'Tiêu chuẩn'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Total & Actions */}
                <div className="pt-3 sm:pt-4 border-t border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 font-sans">
                  <div className="text-xs text-[#5A554C]">
                    Tổng thanh toán: <strong className="text-sm font-bold text-[#1C1C1C] font-tech">{ord.payment.total.toLocaleString('vi-VN')} đ</strong>
                    <span className="text-[#7D7565] ml-2">({ord.payment.method})</span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => onNavigate('order_tracking', { order: ord })}
                      className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 bg-[#1C1C1C] hover:bg-[#333] text-white text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-1.5 touch-target-btn"
                    >
                      <span className="material-symbols-outlined text-sm">sensors</span>
                      Tiến Độ
                    </button>
                    <button
                      onClick={() => onOpenInvoice(ord)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 border border-black/20 hover:bg-black/5 text-[#1C1C1C] text-[10px] uppercase tracking-widest font-bold transition-colors touch-target-btn text-center"
                    >
                      Hóa Đơn
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
