import React, { useState } from 'react';
import { Order } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminOrdersPanelProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => void;
  onNavigateTracking: (order: Order) => void;
  onShowToast: (message: string) => void;
}

export const AdminOrdersPanel: React.FC<AdminOrdersPanelProps> = ({
  orders,
  onUpdateOrderStatus,
  onNavigateTracking,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // 8 Production Stages Definition with Concise Labels
  const PRODUCTION_STAGES = [
    { index: 0, key: 'pending_payment', shortLabel: 'Received', fullLabel: '1. Nhận đơn & Chờ xác nhận', desc: 'Kiểm tra thông tin thanh toán & file' },
    { index: 1, key: 'processing', shortLabel: 'Prepared / Sliced', fullLabel: '2. Chuẩn bị file & Cắt lớp', desc: 'Kỹ sư tạo G-code & phân tích ứng suất' },
    { index: 2, key: 'processing', shortLabel: 'Scheduled', fullLabel: '3. Xếp bàn in & Khởi động', desc: 'Vệ sinh bàn in PEI & cân bằng nhiệt' },
    { index: 3, key: 'printing', shortLabel: 'Printing', fullLabel: '4. Đang in 3D (FDM/SLA)', desc: 'Máy in công nghiệp Bambu Lab/Formlabs' },
    { index: 4, key: 'post_processing', shortLabel: 'Post Processing', fullLabel: '5. Xử lý bề mặt & Rửa UV', desc: 'Tách support, xử lý nhẵn & chiếu UV' },
    { index: 5, key: 'packaging', shortLabel: 'QC Inspection', fullLabel: '6. Đo kiểm QC Dung sai', desc: 'Xác thực thước kẹp Mitutoyo ±0.05mm' },
    { index: 6, key: 'shipping', shortLabel: 'Packing & Shipping', fullLabel: '7. Đóng gói & Bàn giao Shipper', desc: 'Bọc xốp chống sốc & gửi VCUBE Express' },
    { index: 7, key: 'completed', shortLabel: 'Delivered', fullLabel: '8. Giao hàng thành công', desc: 'Khách hàng đã nhận & nghiệm thu' }
  ];

  const handleSetProductionStage = (orderId: string, stageIndex: number) => {
    const stage = PRODUCTION_STAGES[stageIndex];
    if (!stage) return;
    const progressCalc = Math.round(((stageIndex + 1) / PRODUCTION_STAGES.length) * 100);
    onUpdateOrderStatus(orderId, stageIndex, stage.key as Order['status'], progressCalc);
    onShowToast(isVi ? `Đã cập nhật đơn ${orderId} sang: ${stage.shortLabel}` : `Updated order ${orderId} to: ${stage.shortLabel}`);
    if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
      setSelectedOrderDetail({
        ...selectedOrderDetail,
        statusStageIndex: stageIndex,
        status: stage.key as Order['status']
      });
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.shippingAddress.fullName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.shippingAddress.phone.includes(orderSearch);
    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter Toolbar */}
      <div className="bg-white p-4 border border-[#C5C6CD] rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#545F73] text-sm">search</span>
            <input
              type="text"
              placeholder={isVi ? 'Tìm mã đơn, tên khách, số điện thoại...' : 'Search by order #, customer, phone...'}
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#C5C6CD] rounded-lg text-xs focus:outline-none focus:border-[#00687A] bg-[#F8F9FF]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-[11px] text-[#545F73] font-bold">{isVi ? 'Trạng thái:' : 'Status:'}</span>
          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-[#00687A] cursor-pointer"
          >
            <option value="all">{isVi ? 'Tất Cả Đơn Hàng' : 'All Orders'}</option>
            <option value="processing">{isVi ? 'Đang Xử Lý & Cắt Lớp' : 'Processing'}</option>
            <option value="printing">{isVi ? 'Đang In 3D' : 'Printing'}</option>
            <option value="post_processing">{isVi ? 'Xử Lý Bề Mặt / QC' : 'Post Processing'}</option>
            <option value="shipping">{isVi ? 'Đang Giao Hàng' : 'Shipping'}</option>
            <option value="completed">{isVi ? 'Đã Hoàn Thành' : 'Completed'}</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#C5C6CD] rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#EFF4FF] text-[#091426] font-bold font-tech uppercase text-[10px] border-b border-[#C5C6CD]">
            <tr>
              <th className="py-3 px-4">Mã Đơn</th>
              <th className="py-3 px-4">Ngày Đặt</th>
              <th className="py-3 px-4">Khách Hàng</th>
              <th className="py-3 px-4">Sản Phẩm & Chi Tiết</th>
              <th className="py-3 px-4">Tổng Tiền</th>
              <th className="py-3 px-4">Tiến Độ Gia Công</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EEFF]">
            {filteredOrders.map((order) => {
              const currentStage = PRODUCTION_STAGES[order.statusStageIndex || 0] || PRODUCTION_STAGES[0];
              const isCompleted = order.status === 'completed';
              const isPrinting = order.status === 'printing';

              return (
                <tr key={order.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-4 font-tech font-bold text-[#00687A]">
                    {order.orderNumber}
                    {order.customerType === 'guest' && (
                      <span className="block text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded w-max mt-0.5 font-sans font-normal">
                        Khách chưa đăng ký
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-tech text-[#545F73]">
                    {order.date}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#091426]">{order.shippingAddress.fullName}</p>
                    <p className="text-[11px] text-[#545F73] font-tech">{order.shippingAddress.phone}</p>
                    <p className="text-[10px] text-[#75777D] truncate max-w-[180px]">
                      {order.shippingAddress.address}, {order.shippingAddress.city}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 max-w-[220px]">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-bold text-[#00687A]">{item.quantity}x</span>
                          <span className="truncate">{item.name}</span>
                          {item.material && (
                            <span className="text-[9px] bg-gray-100 px-1 rounded font-tech text-gray-700 shrink-0">
                              {item.material}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-tech font-bold text-[#091426]">
                    {order.payment.total.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                    <span className="block text-[9px] text-[#545F73] font-normal font-sans">
                      {order.payment.method}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5">
                      {/* Concise status badge */}
                      <span
                        title={currentStage.fullLabel}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-tech font-bold uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPrinting
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {currentStage.shortLabel}
                      </span>

                      {/* Mini progress bar */}
                      <div className="w-28 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#00687A] h-full transition-all duration-300"
                          style={{ width: `${Math.round(((order.statusStageIndex + 1) / PRODUCTION_STAGES.length) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedOrderDetail(order)}
                        className="px-2.5 py-1.5 bg-white border border-[#C5C6CD] hover:border-[#00687A] text-[#091426] text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Xem chi tiết đơn"
                      >
                        <span className="material-symbols-outlined text-xs">visibility</span>
                        {isVi ? 'Chi tiết' : 'View'}
                      </button>
                      <button
                        onClick={() => onNavigateTracking(order)}
                        className="px-2.5 py-1.5 bg-[#091426] hover:bg-[#1E293B] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Xem trang tracking khách"
                      >
                        <span className="material-symbols-outlined text-xs text-[#57DFFE]">route</span>
                        Track
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="p-8 text-center text-[#545F73] text-xs">
            {isVi ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc.' : 'No orders found matching filters.'}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-[#C5C6CD]">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-4">
              <div>
                <span className="text-[10px] font-tech text-[#545F73] uppercase tracking-widest block font-bold">
                  CHI TIẾT ĐƠN HÀNG XƯỞNG
                </span>
                <h3 className="text-lg font-bold text-[#091426] flex items-center gap-2">
                  <span className="font-tech text-[#00687A]">{selectedOrderDetail.orderNumber}</span>
                  <span className="text-xs text-[#545F73] font-normal">({selectedOrderDetail.date})</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1 rounded-lg text-[#545F73] hover:text-[#091426] hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Customer & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#F8F9FF] p-4 rounded-xl border border-[#C5C6CD]/60">
              <div>
                <span className="text-[10px] font-tech uppercase text-[#545F73] font-bold block mb-1">
                  Thông Tin Người Nhận
                </span>
                <p className="font-bold text-[#091426]">{selectedOrderDetail.shippingAddress.fullName}</p>
                <p className="text-[#545F73] font-tech">{selectedOrderDetail.shippingAddress.phone}</p>
                <p className="text-[#545F73] mt-1">{selectedOrderDetail.shippingAddress.address}, {selectedOrderDetail.shippingAddress.city}</p>
              </div>
              <div>
                <span className="text-[10px] font-tech uppercase text-[#545F73] font-bold block mb-1">
                  Thanh Toán & Hóa Đơn
                </span>
                <p className="font-tech font-bold text-sm text-[#091426]">
                  {selectedOrderDetail.payment.total.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                </p>
                <p className="text-[#545F73]">{selectedOrderDetail.payment.method}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-tech font-bold bg-emerald-100 text-emerald-800">
                  {selectedOrderDetail.payment.isPaid ? 'Đã Thanh Toán' : 'Chờ Thanh Toán'}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#091426] uppercase tracking-wider block">
                Danh Sách Sản Phẩm In ({selectedOrderDetail.items.length})
              </span>
              <div className="divide-y divide-[#E5EEFF] border border-[#C5C6CD] rounded-xl overflow-hidden">
                {selectedOrderDetail.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded border border-[#C5C6CD]" />
                      )}
                      <div>
                        <p className="font-bold text-[#091426]">{item.name}</p>
                        <p className="text-[11px] text-[#545F73]">
                          {item.material && `Vật liệu: ${item.material}`} {item.color && `• Màu: ${item.color}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-tech font-bold text-[#091426]">{item.price.toLocaleString()} đ</span>
                      <span className="block text-[10px] text-[#545F73]">SL: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Advance Stage Selector */}
            <div className="space-y-2 pt-2 border-t border-[#C5C6CD]">
              <span className="text-xs font-bold text-[#091426] uppercase tracking-wider block">
                Cập Nhật Nhanh Tiến Độ Sản Xuất
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRODUCTION_STAGES.map((stg) => {
                  const isCurrent = (selectedOrderDetail.statusStageIndex || 0) === stg.index;
                  return (
                    <button
                      key={stg.index}
                      onClick={() => handleSetProductionStage(selectedOrderDetail.id, stg.index)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#00687A] text-white border-[#00687A] font-bold shadow-xs'
                          : 'bg-[#F8FAFC] border-[#C5C6CD] text-[#091426] hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] font-tech block opacity-80 font-bold">BƯỚC {stg.index + 1}</span>
                      <span className="truncate block font-bold">{stg.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#091426] font-bold text-xs rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
