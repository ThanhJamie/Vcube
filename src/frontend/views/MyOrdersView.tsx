import React, { useState } from 'react';
import { Order } from '../types';
import { OrderProgress } from '../components/OrderProgress';

interface MyOrdersViewProps {
  orders: Order[];
  onNavigate: (screen: string, payload?: any) => void;
  onOpenInvoice: (order: Order) => void;
}

interface WarrantyClaimState {
  isOpen: boolean;
  order: Order | null;
  issueType: 'tolerance' | 'surface' | 'material' | 'strength';
  measuredDeviation: string;
  notes: string;
  submitted: boolean;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  orders,
  onNavigate,
  onOpenInvoice
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [warrantyModal, setWarrantyModal] = useState<WarrantyClaimState>({
    isOpen: false,
    order: null,
    issueType: 'tolerance',
    measuredDeviation: '+0.12mm',
    notes: '',
    submitted: false
  });
  const [reorderSuccessId, setReorderSuccessId] = useState<string | null>(null);

  const filterTabs = [
    { id: 'all', label: 'Tất cả đơn', count: orders.length },
    { id: 'pending_payment', label: 'Chờ thanh toán', count: orders.filter(o => o.status === 'pending_payment').length },
    { id: 'printing', label: 'Đang in 3D', count: orders.filter(o => o.status === 'printing' || o.status === 'processing').length },
    { id: 'post_processing', label: 'Hậu kỳ & QC', count: orders.filter(o => o.status === 'post_processing' || o.status === 'packaging').length },
    { id: 'shipping', label: 'Đang vận chuyển', count: orders.filter(o => o.status === 'shipping').length },
    { id: 'completed', label: 'Đã hoàn thành', count: orders.filter(o => o.status === 'completed').length },
    { id: 'cancelled', label: 'Đã hủy', count: orders.filter(o => o.status === 'cancelled').length },
  ];

  const filteredOrders = orders.filter((ord) => {
    if (activeFilter === 'pending_payment' && ord.status !== 'pending_payment') return false;
    if (activeFilter === 'printing' && ord.status !== 'printing' && ord.status !== 'processing') return false;
    if (activeFilter === 'post_processing' && ord.status !== 'post_processing' && ord.status !== 'packaging') return false;
    if (activeFilter === 'shipping' && ord.status !== 'shipping') return false;
    if (activeFilter === 'completed' && ord.status !== 'completed') return false;
    if (activeFilter === 'cancelled' && ord.status !== 'cancelled') return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNumber = ord.orderNumber.toLowerCase().includes(q);
      const matchItems = ord.items.some(i => i.name.toLowerCase().includes(q) || (i.material && i.material.toLowerCase().includes(q)));
      const matchTracking = ord.carrier?.trackingCode?.toLowerCase().includes(q);
      if (!matchNumber && !matchItems && !matchTracking) return false;
    }
    return true;
  });

  const handleReorder = (order: Order) => {
    setReorderSuccessId(order.id);
    setTimeout(() => {
      setReorderSuccessId(null);
      onNavigate('tool_3d', { reorderItems: order.items });
    }, 1200);
  };

  const handleOpenWarranty = (order: Order) => {
    setWarrantyModal({
      isOpen: true,
      order,
      issueType: 'tolerance',
      measuredDeviation: '+0.12mm',
      notes: '',
      submitted: false
    });
  };

  const handleSubmitWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    setWarrantyModal(prev => ({ ...prev, submitted: true }));
    setTimeout(() => {
      setWarrantyModal({
        isOpen: false,
        order: null,
        issueType: 'tolerance',
        measuredDeviation: '',
        notes: '',
        submitted: false
      });
    }, 2200);
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'printing':
      case 'processing':
        return { label: 'Đang Gia Công In 3D', bg: 'bg-teal-50 border-teal-200 text-[#00687A]', dot: 'bg-[#57DFFE]' };
      case 'post_processing':
      case 'packaging':
        return { label: 'Xử Lý Bề Mặt / QC', bg: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'bg-amber-500' };
      case 'shipping':
        return { label: 'Đang Giao Hàng', bg: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500' };
      case 'completed':
        return { label: 'Hoàn Thành Xuất Sắc', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', dot: 'bg-emerald-500' };
      case 'pending_payment':
        return { label: 'Chờ Thanh Toán', bg: 'bg-yellow-50 border-yellow-200 text-yellow-800', dot: 'bg-yellow-500' };
      case 'cancelled':
        return { label: 'Đã Hủy Đơn', bg: 'bg-rose-50 border-rose-200 text-rose-700', dot: 'bg-rose-500' };
      default:
        return { label: 'Đang Tiếp Nhận', bg: 'bg-slate-50 border-slate-200 text-slate-700', dot: 'bg-slate-400' };
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091426] py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Title & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-[#CBD5E1]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#00687A] font-bold px-2 py-0.5 bg-teal-50 rounded border border-teal-200">
                VCUBE MES ARCHIVE // CLIENT FABRICATION RECORDS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091426] tracking-tight">
              Lịch Sử Đơn Hàng & Gia Công Kỹ Thuật
            </h1>
            <p className="text-xs sm:text-sm text-[#545F73] mt-1">
              Quản lý tiến độ máy in 3D thời gian thực, chứng nhận dung sai ISO/ASTM và trích xuất hóa đơn GTGT điện tử.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm theo mã đơn, mã vận đơn, tên chi tiết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#091426] placeholder-[#94A3B8] focus:outline-none focus:border-[#00687A] focus:ring-1 focus:ring-[#00687A] font-sans shadow-2xs transition-all"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#64748B] text-base">
              search
            </span>
          </div>
        </div>

        {/* 7 Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 font-sans no-scrollbar">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isActive
                    ? 'bg-[#091426] text-white border-[#091426] shadow-sm'
                    : 'bg-white text-[#545F73] hover:text-[#091426] hover:bg-slate-50 border-[#CBD5E1]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#64748B]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Orders Listing */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-10 sm:p-16 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-[#64748B]">
              <span className="material-symbols-outlined text-3xl">receipt_long</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-[#091426]">Không tìm thấy đơn hàng nào phù hợp</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm mã đơn / tên chi tiết.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('tool_3d')}
                className="px-5 py-2.5 bg-[#00687A] hover:bg-[#005260] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Tạo Báo Giá In 3D Mới
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {filteredOrders.map((ord) => {
              const statusBadge = getStatusBadge(ord.status);
              const stageIdx = ord.statusStageIndex ?? (ord.status === 'completed' ? 7 : ord.status === 'shipping' ? 7 : ord.status === 'post_processing' ? 5 : ord.status === 'printing' ? 4 : 0);

              return (
                <div
                  key={ord.id}
                  className="bg-white border border-[#CBD5E1] rounded-2xl p-5 sm:p-7 hover:border-[#00687A]/50 transition-all space-y-5 shadow-xs"
                >
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#CBD5E1] gap-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-mono font-bold text-sm sm:text-base text-[#091426] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {ord.orderNumber}
                      </span>
                      <span className="text-xs text-[#64748B] font-mono">
                        Đặt lúc: {ord.date}
                      </span>
                      {ord.carrier?.trackingCode && (
                        <span className="text-[11px] font-mono text-[#00687A] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Vận đơn: {ord.carrier.trackingCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${statusBadge.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${statusBadge.dot} animate-pulse`}></span>
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* 8-Stage Pipeline Progress Strip (Compact) */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                      <span className="text-[#64748B] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#00687A]">precision_manufacturing</span>
                        Tiến độ dây chuyền chế tác MES
                      </span>
                      {ord.status === 'printing' && (
                        <span className="text-[#00687A] font-bold">
                          Đang đùn lớp: {ord.layerProgress || 64}% • Dự kiến: {ord.timeRemaining || '03h 40m'}
                        </span>
                      )}
                      {ord.status === 'completed' && (
                        <span className="text-emerald-700 font-bold">
                          Đã vượt qua kiểm định QC ±0.05mm
                        </span>
                      )}
                    </div>
                    <OrderProgress
                      currentStageIndex={stageIdx}
                      layerProgress={ord.layerProgress || 64}
                      variant="compact"
                      status={ord.status}
                    />
                  </div>

                  {/* Ordered Parts Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ord.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-13 h-13 object-cover rounded-lg border border-[#CBD5E1] shrink-0 bg-slate-200"
                        />
                        <div className="truncate text-xs">
                          <h4 className="font-bold text-xs sm:text-sm text-[#091426] truncate">
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-[#64748B] font-mono mt-0.5 truncate">
                            SL: {item.quantity}x • {item.material || 'Nhựa Kỹ Thuật'} • {item.color || 'Tiêu chuẩn'}
                          </p>
                          {item.customText && (
                            <span className="text-[10px] text-[#00687A] font-mono font-medium block truncate">
                              Khắc: "{item.customText}"
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer Total & Action Controls */}
                  <div className="pt-4 border-t border-[#CBD5E1] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="text-xs text-[#545F73]">
                      <span>Tổng thanh toán ({ord.payment.method}): </span>
                      <strong className="text-base font-extrabold text-[#091426] font-mono ml-1">
                        {ord.payment.total.toLocaleString('vi-VN')} ₫
                      </strong>
                      <span className="text-[11px] text-[#64748B] ml-2 block sm:inline">
                        • Giao tới: {ord.shippingAddress.fullName} ({ord.shippingAddress.city})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-mono">
                      {/* Live Telemetry Progress */}
                      <button
                        onClick={() => onNavigate('order_tracking', { order: ord })}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#091426] hover:bg-[#1E293B] text-white text-xs uppercase font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm text-[#57DFFE]">sensors</span>
                        <span>Tiến Độ MES</span>
                      </button>

                      {/* VAT Invoice */}
                      <button
                        onClick={() => onOpenInvoice(ord)}
                        className="flex-1 sm:flex-initial px-3.5 py-2 border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#091426] text-xs uppercase font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-sm">receipt_long</span>
                        <span>Hóa Đơn</span>
                      </button>

                      {/* Tolerance Warranty Claim */}
                      <button
                        onClick={() => handleOpenWarranty(ord)}
                        className="flex-1 sm:flex-initial px-3 py-2 border border-[#00687A]/30 bg-teal-50/70 hover:bg-teal-100 text-[#00687A] text-xs uppercase font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Yêu cầu bảo hành dung sai ±0.05mm"
                      >
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        <span>Bảo Hành ±0.05mm</span>
                      </button>

                      {/* 1-Click Reorder */}
                      <button
                        onClick={() => handleReorder(ord)}
                        disabled={reorderSuccessId === ord.id}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#00687A] hover:bg-[#005260] text-white text-xs uppercase font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {reorderSuccessId === ord.id ? 'check_circle' : 'replay'}
                        </span>
                        <span>{reorderSuccessId === ord.id ? 'Đang Chuyển...' : 'In Lại'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tolerance Claim Interactive Modal */}
      {warrantyModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#CBD5E1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#091426] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#57DFFE]">verified_user</span>
                <div>
                  <h3 className="font-bold text-sm">YÊU CẦU BẢO HÀNH DUNG SAI KỸ THUẬT</h3>
                  <p className="text-[10px] text-[#94A3B8] font-mono">
                    Cam kết chuẩn công nghiệp ±0.05mm // Hoàn phí hoặc in lại miễn phí
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWarrantyModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {warrantyModal.submitted ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-2xl">check</span>
                </div>
                <h4 className="font-bold text-base text-[#091426]">Yêu Cầu Đã Được Tiếp Nhận!</h4>
                <p className="text-xs text-[#545F73]">
                  Mã khiếu nại kỹ thuật <strong className="text-[#091426] font-mono">QC-CLAIM-{warrantyModal.order?.orderNumber}</strong> đã được chuyển tới Đội ngũ Trưởng ca Kỹ thuật VCUBE.
                </p>
                <p className="text-[11px] text-[#64748B] font-mono">
                  Phản hồi cam kết trong vòng 2 giờ làm việc.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitWarranty} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#091426] mb-1">
                    Đơn hàng áp dụng:
                  </label>
                  <p className="font-mono text-[#00687A] bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {warrantyModal.order?.orderNumber} • Đặt ngày: {warrantyModal.order?.date}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-[#091426] mb-1">
                    Phân loại sự cố kỹ thuật:
                  </label>
                  <select
                    value={warrantyModal.issueType}
                    onChange={(e) => setWarrantyModal(prev => ({ ...prev, issueType: e.target.value as any }))}
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#091426] focus:outline-none focus:border-[#00687A]"
                  >
                    <option value="tolerance">Sai lệch kích thước vượt ngưỡng ±0.05mm (Tolerance Deviation)</option>
                    <option value="surface">Lỗi bề mặt, tách lớp (Delamination / Layer Separation)</option>
                    <option value="material">Sai chủng loại vật liệu hoặc màu sắc yêu cầu</option>
                    <option value="strength">Độ cứng cơ tính không đạt thông số Datasheet</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#091426] mb-1">
                    Độ lệch đo được bằng thước cặp (Caliper measurement):
                  </label>
                  <input
                    type="text"
                    value={warrantyModal.measuredDeviation}
                    onChange={(e) => setWarrantyModal(prev => ({ ...prev, measuredDeviation: e.target.value }))}
                    placeholder="Ví dụ: Lỗ ren thiết kế Ø10.0mm nhưng in ra Ø9.75mm (-0.25mm)"
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#091426] focus:outline-none focus:border-[#00687A]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#091426] mb-1">
                    Mô tả thêm & yêu cầu xử lý:
                  </label>
                  <textarea
                    rows={3}
                    value={warrantyModal.notes}
                    onChange={(e) => setWarrantyModal(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Mô tả cụ thể vị trí sai lệch và đề xuất (In lại ngay / Hoàn tín dụng vào ví VCUBE)..."
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#091426] focus:outline-none focus:border-[#00687A]"
                  />
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                  <span className="material-symbols-outlined text-base shrink-0 mt-0.5">info</span>
                  <span>
                    Chính sách VCUBE: Với bất kỳ sản phẩm in có sai lệch vượt chuẩn cam kết, kỹ sư sẽ tiến hành hiệu chuẩn lại máy in và in lại đợt mới trong 24h không phụ phí.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 font-mono">
                  <button
                    type="button"
                    onClick={() => setWarrantyModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 border border-[#CBD5E1] text-[#64748B] hover:text-[#091426] font-bold rounded-xl cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00687A] hover:bg-[#005260] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    Gửi Hồ Sơ Khiếu Nại
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
