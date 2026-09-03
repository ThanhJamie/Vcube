import React, { useState } from 'react';
import { Order } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminProductionQueuePanelProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => void;
  onNavigateTracking: (order: Order) => void;
  onShowToast: (message: string) => void;
}

export const AdminProductionQueuePanel: React.FC<AdminProductionQueuePanelProps> = ({
  orders,
  onUpdateOrderStatus,
  onNavigateTracking,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [filterStage, setFilterStage] = useState<string>('all');
  const [operatorNotes, setOperatorNotes] = useState<Record<string, string>>({
    'order-1': 'Đang rửa cồn Isopropyl 99% và chiếu tia cực tím 405nm trong 15 phút.',
    'order-2': 'Bàn in số #04 (Bambu X1C) đang chạy ở tốc độ 250mm/s.',
    'order-3': 'Đã hoàn tất đo kiểm thước kẹp Mitutoyo dung sai ±0.03mm đạt chuẩn.'
  });

  // 8 Production Stages Definition
  const PRODUCTION_STAGES = [
    { index: 0, key: 'pending_payment', short: 'Received', full: '1. Nhận Đơn & Chờ Xác Nhận', operator: 'Sales / Admin', defaultDuration: '15 mins' },
    { index: 1, key: 'processing', short: 'Prepared', full: '2. Chuẩn Bị File & Cắt Lớp G-code', operator: 'CAD Slicer Engineer', defaultDuration: '30 mins' },
    { index: 2, key: 'processing', short: 'Scheduled', full: '3. Xếp Bàn In & Gia Nhiệt', operator: 'Workshop Lead', defaultDuration: '20 mins' },
    { index: 3, key: 'printing', short: 'Printing', full: '4. Đang In 3D (FDM/SLA)', operator: 'Bambu Lab X1C #04', defaultDuration: '3h 45m' },
    { index: 4, key: 'post_processing', short: 'Post Processing', full: '5. Xử Lý Bề Mặt & Rửa UV', operator: 'Finishing Technician', defaultDuration: '45 mins' },
    { index: 5, key: 'packaging', short: 'QC', full: '6. Đo Kiểm Dung Sai & Đóng Gói', operator: 'QC Inspector', defaultDuration: '20 mins' },
    { index: 6, key: 'shipping', short: 'Packing', full: '7. Bàn Giao VCUBE Express', operator: 'Logistics Shipper', defaultDuration: '1h 00m' },
    { index: 7, key: 'completed', short: 'Delivered', full: '8. Giao Hàng Thành Công', operator: 'Customer Received', defaultDuration: 'Done' }
  ];

  const handleAdvanceStage = (order: Order) => {
    const currentIdx = order.statusStageIndex || 0;
    if (currentIdx >= PRODUCTION_STAGES.length - 1) {
      onShowToast(isVi ? 'Đơn hàng đã hoàn thành toàn bộ quy trình chế tác!' : 'Order already completed!');
      return;
    }
    const nextIdx = currentIdx + 1;
    const nextStage = PRODUCTION_STAGES[nextIdx];
    const progressCalc = Math.round(((nextIdx + 1) / PRODUCTION_STAGES.length) * 100);
    onUpdateOrderStatus(order.id, nextIdx, nextStage.key as Order['status'], progressCalc);
    onShowToast(isVi ? `Đã chuyển đơn ${order.orderNumber} sang: ${nextStage.short}` : `Advanced ${order.orderNumber} to: ${nextStage.short}`);
  };

  const handleSelectStageDirect = (order: Order, stageIndex: number) => {
    const nextStage = PRODUCTION_STAGES[stageIndex];
    const progressCalc = Math.round(((stageIndex + 1) / PRODUCTION_STAGES.length) * 100);
    onUpdateOrderStatus(order.id, stageIndex, nextStage.key as Order['status'], progressCalc);
    onShowToast(isVi ? `Đã đặt trạng thái đơn ${order.orderNumber} sang: ${nextStage.short}` : `Set ${order.orderNumber} to: ${nextStage.short}`);
  };

  const activeOrders = orders.filter(o => {
    if (filterStage === 'all') return true;
    if (filterStage === 'printing') return o.status === 'printing';
    if (filterStage === 'post_processing') return o.status === 'post_processing';
    if (filterStage === 'active') return o.status !== 'completed' && o.status !== 'cancelled';
    if (filterStage === 'completed') return o.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-[#C5C6CD] p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#57DFFE]/20 text-[#00687A] font-tech text-[10px] font-bold rounded border border-[#57DFFE]/40 uppercase tracking-widest">
              TELEMETRY & SHOPFLOOR
            </span>
            <span className="text-xs text-[#545F73]">Giám sát luồng sản xuất 8 nấc thời gian thực</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#091426] mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A]">precision_manufacturing</span>
            {isVi ? 'Hàng Đợi Chế Tác & Trạng Thái Xưởng In' : 'Production Queue & Shopfloor Telemetry'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-3 py-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-[#00687A] cursor-pointer"
          >
            <option value="all">{isVi ? 'Tất Cả Lô Đơn' : 'All Production Orders'}</option>
            <option value="active">{isVi ? 'Đang Chế Tác (Chưa Giao)' : 'Active Jobs Only'}</option>
            <option value="printing">{isVi ? 'Đang In Trên Bàn (Printing)' : 'Printing'}</option>
            <option value="post_processing">{isVi ? 'Hậu Kỳ / UV (Post Processing)' : 'Post Processing'}</option>
            <option value="completed">{isVi ? 'Đã Hoàn Thành' : 'Completed'}</option>
          </select>
        </div>
      </div>

      {/* List of Orders with Compact Stepper + Operational Detail Card */}
      <div className="space-y-4">
        {activeOrders.map((order) => {
          const currentStageIdx = order.statusStageIndex || 0;
          const currentStage = PRODUCTION_STAGES[currentStageIdx] || PRODUCTION_STAGES[0];
          const isFinished = currentStageIdx >= PRODUCTION_STAGES.length - 1;
          const currentNote = operatorNotes[order.id] || (isVi ? 'Đang vận hành theo tiêu chuẩn chất lượng ISO/VCUBE.' : 'Operating per VCUBE standards.');

          return (
            <div
              key={order.id}
              className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#00687A]/60 transition-all"
            >
              {/* Order Header & Identification */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5EEFF]">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-[#091426] text-white font-tech font-bold text-xs rounded-lg">
                    {order.orderNumber}
                  </span>
                  <div>
                    <p className="font-bold text-xs text-[#091426] flex items-center gap-2">
                      <span>{order.shippingAddress.fullName}</span>
                      <span className="font-normal text-[#545F73] font-tech text-[11px]">({order.shippingAddress.phone})</span>
                    </p>
                    <p className="text-[11px] text-[#545F73]">
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-tech font-bold text-[#00687A] bg-[#57DFFE]/15 px-2.5 py-1 rounded-full border border-[#57DFFE]/30">
                    {Math.round(((currentStageIdx + 1) / PRODUCTION_STAGES.length) * 100)}% Hoàn Tất
                  </span>
                  <button
                    onClick={() => onNavigateTracking(order)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#091426] text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs text-[#00687A]">route</span>
                    Tracking Khách
                  </button>
                </div>
              </div>

              {/* 1. PROGRESS VISUALIZATION: COMPACT STEPPER */}
              <div className="bg-[#F8F9FF] p-3 rounded-xl border border-[#C5C6CD]/60 overflow-x-auto">
                <div className="flex items-center justify-between min-w-[620px] gap-1">
                  {PRODUCTION_STAGES.map((stg) => {
                    const isDone = stg.index < currentStageIdx;
                    const isCurrent = stg.index === currentStageIdx;
                    const isUpcoming = stg.index > currentStageIdx;

                    return (
                      <button
                        key={stg.index}
                        onClick={() => handleSelectStageDirect(order, stg.index)}
                        title={`Click để gán sang: ${stg.full}`}
                        className={`flex-1 flex flex-col items-center text-center p-1.5 rounded-lg transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#00687A] text-white shadow-xs font-bold'
                            : isDone
                            ? 'text-emerald-800 hover:bg-emerald-50'
                            : 'text-[#94A3B8] hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-tech font-bold">
                          {isDone && <span className="text-emerald-600 font-bold">✓</span>}
                          {isCurrent && <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-ping inline-block"></span>}
                          {isUpcoming && <span className="text-slate-400">○</span>}
                          <span className="truncate">{stg.short}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. OPERATIONAL DETAIL: CURRENT STAGE BOX */}
              <div className="bg-[#FAFBFD] border border-[#CBD5E1] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-tech font-bold uppercase tracking-widest text-[#545F73]">
                      CURRENT STAGE (GIAI ĐOẠN HIỆN TẠI):
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold bg-[#00687A] text-white uppercase">
                      BƯỚC {currentStageIdx + 1}: {currentStage.short}
                    </span>
                  </div>

                  <p className="font-bold text-sm text-[#091426]">
                    {currentStage.full}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#545F73] pt-1">
                    <span>
                      <strong>Bắt đầu:</strong> 26/08 14:30
                    </span>
                    <span>
                      <strong>Phụ trách:</strong> {currentStage.operator}
                    </span>
                    <span>
                      <strong>Ước tính:</strong> {currentStage.defaultDuration}
                    </span>
                  </div>

                  {/* Operational Notes */}
                  <div className="pt-2 text-xs text-[#091426] flex items-center gap-2">
                    <span className="text-[#545F73] font-bold">Ghi chú xưởng:</span>
                    <input
                      type="text"
                      value={currentNote}
                      onChange={(e) => setOperatorNotes({ ...operatorNotes, [order.id]: e.target.value })}
                      placeholder="Nhập ghi chú kỹ thuật..."
                      className="flex-1 px-2.5 py-1 bg-white border border-[#C5C6CD] rounded text-xs focus:outline-none focus:border-[#00687A]"
                    />
                  </div>
                </div>

                {/* Direct Action Button: Mark Complete / Advance */}
                <div className="shrink-0 flex items-center gap-2">
                  {!isFinished ? (
                    <button
                      onClick={() => handleAdvanceStage(order)}
                      className="px-4 py-2.5 bg-[#00687A] hover:bg-[#005463] text-white font-bold text-xs uppercase rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      {isVi ? 'Xác Nhận Xong & Chuyển Nấc' : 'Mark Stage Done & Advance'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold font-tech">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      ĐÃ GIAO HÀNG THÀNH CÔNG
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {activeOrders.length === 0 && (
          <div className="bg-white border border-[#C5C6CD] p-8 text-center text-[#545F73] text-xs rounded-xl">
            {isVi ? 'Không có đơn hàng nào trong hàng đợi sản xuất này.' : 'No orders in selected queue filter.'}
          </div>
        )}
      </div>
    </div>
  );
};
