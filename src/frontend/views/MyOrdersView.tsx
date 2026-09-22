import React, { useState } from 'react';
import { Order } from '../types';
import { OrderProgress } from '../components/OrderProgress';
import { Icon, Button, Badge, Modal } from '@frontend/ui';
import { formatCurrency, formatDateTime } from '../lib/format';
import { isFabricatedImage } from '../lib/productImage';

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
    // OT-10: KHÔNG prefill một số đo khách chưa từng đo. Trường này bắt buộc và trống.
    measuredDeviation: '',
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
      measuredDeviation: '',
      notes: '',
      submitted: false
    });
  };

  /**
   * OT-10: biểu mẫu bảo hành CHƯA được nối vào backend (chưa có bảng
   * `warranty_claims`). Vì vậy không được bịa mã hồ sơ `QC-CLAIM-…` hay hứa
   * "phản hồi trong 2 giờ". Trạng thái gửi ở đây nói rõ sự thật.
   */
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
    }, 4000);
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'printing':
      case 'processing':
        return { label: 'Đang Gia Công In 3D', bg: 'bg-info-tint border-info/30 text-info', dot: 'bg-info' };
      case 'post_processing':
      case 'packaging':
        return { label: 'Xử Lý Bề Mặt / QC', bg: 'bg-warning-tint border-warning/30 text-warning', dot: 'bg-warning' };
      case 'shipping':
        return { label: 'Đang Giao Hàng', bg: 'bg-info-tint border-info/30 text-info', dot: 'bg-info' };
      case 'completed':
        return { label: 'Đã Hoàn Thành', bg: 'bg-positive-tint border-positive/30 text-positive', dot: 'bg-positive' };
      case 'pending_payment':
        return { label: 'Chờ Thanh Toán', bg: 'bg-danger-tint border-danger/30 text-danger', dot: 'bg-danger' };
      case 'cancelled':
        return { label: 'Đã Hủy Đơn', bg: 'bg-surface-muted border-line-subtle text-fg-muted', dot: 'bg-line-control' };
      default:
        return { label: 'Đang Tiếp Nhận', bg: 'bg-canvas border-line-subtle text-fg-muted', dot: 'bg-line-control' };
    }
  };

  return (
    <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Title & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold px-2 py-0.5 bg-primary-tint rounded-sm border border-primary/30">
                VCUBE MES ARCHIVE // CLIENT FABRICATION RECORDS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Lịch Sử Đơn Hàng & Gia Công Kỹ Thuật
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-1">
              Theo dõi trạng thái gia công của từng đơn và xem lại chứng từ đã phát hành.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm theo mã đơn, mã vận đơn, tên chi tiết..."
              aria-label="Tìm đơn hàng theo mã đơn, mã vận đơn hoặc tên chi tiết"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-surface border border-line-control rounded-lg text-xs text-fg placeholder-fg-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans shadow-e0 transition-colors"
            />
            <Icon name="search" size={18} className="absolute left-2.5 top-2.5 text-fg-subtle" />
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
                className={`px-3 sm:px-3.5 py-1.5 text-xs font-mono font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 border cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-fg border-primary shadow-e1'
                    : 'bg-surface text-fg-muted hover:text-fg hover:bg-canvas border-line'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs font-mono px-1.5 py-0.2 rounded-sm tabular-nums ${
                    isActive ? 'bg-primary-fg/20 text-primary-fg' : 'bg-surface-muted text-fg-subtle'
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
          <div className="bg-surface rounded-lg p-10 sm:p-16 text-center space-y-4 shadow-e1">
            <div className="w-14 h-14 bg-surface-muted rounded-lg flex items-center justify-center mx-auto text-fg-subtle">
              <Icon name="receipt_long" size={30} />
            </div>
            <div>
              <h3 className="font-bold text-base text-fg">Không tìm thấy đơn hàng nào phù hợp</h3>
              <p className="text-xs text-fg-subtle mt-1">
                Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm mã đơn / tên chi tiết.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigate('quote')}
                leadingIcon={<Icon name="add" size={18} />}
              >
                Tạo Báo Giá In 3D Mới
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {filteredOrders.map((ord) => {
              const statusBadge = getStatusBadge(ord.status);
              // Nấc đến từ DB; nếu DB không có thì suy từ trạng thái đã lưu (không bịa tiến độ).
              const stageIdx = ord.statusStageIndex ?? (ord.status === 'completed' ? 7 : ord.status === 'shipping' ? 7 : ord.status === 'post_processing' ? 5 : ord.status === 'printing' ? 4 : 0);
              // CTA chính theo trạng thái — thao tác phụ gom vào menu "…".
              const isPendingPayment = ord.status === 'pending_payment';
              const isShipping = ord.status === 'shipping';
              const isCompleted = ord.status === 'completed';
              const primary: { label: string; icon: string; variant: 'accent' | 'primary'; onClick: () => void } = isPendingPayment
                ? { label: 'Thanh toán ngay', icon: 'payments', variant: 'accent', onClick: () => onOpenInvoice(ord) }
                : isShipping
                ? { label: 'Theo dõi hành trình', icon: 'local_shipping', variant: 'primary', onClick: () => onNavigate('order_tracking', { order: ord }) }
                : isCompleted
                ? { label: 'In lại đơn này', icon: 'replay', variant: 'primary', onClick: () => handleReorder(ord) }
                : { label: 'Xem tiến độ', icon: 'sensors', variant: 'primary', onClick: () => onNavigate('order_tracking', { order: ord }) };

              return (
                <div key={ord.id} className="bg-surface rounded-lg p-5 sm:p-7 hover:border-primary/50 transition-colors space-y-5 shadow-e1" >
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-line gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h2 className="font-mono font-extrabold text-lg sm:text-xl text-fg tracking-tight">
                          {ord.orderNumber}
                        </h2>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${statusBadge.bg}`}>
                          <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`}></span>
                          {statusBadge.label}
                        </span>
                      </div>
                      <p className="text-xs text-fg-muted font-mono mt-1 truncate">
                        Đặt ngày {formatDateTime(ord.date)}
                        {ord.carrier?.trackingCode
                          ? ` • ${ord.carrier.name || 'Vận chuyển'}: ${ord.carrier.trackingCode}`
                          : ''}
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-xs text-fg-subtle uppercase tracking-wider block">
                        {ord.payment.isPaid ? 'Đã thanh toán' : ord.payment.status === 'cod' ? 'Thanh toán COD' : 'Chờ thanh toán'}
                      </span>
                      <span className="font-mono font-extrabold text-lg text-fg tabular-nums">
                        {formatCurrency(ord.payment.total)}
                      </span>
                    </div>
                  </div>

                  {/* 8-Stage Pipeline Progress Strip (Compact) */}
                  <div className="bg-canvas border border-line-subtle rounded-lg p-3.5">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-fg-subtle font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Icon name="precision_manufacturing" size={16} className="text-primary" />
                        Tiến độ dây chuyền chế tác MES
                      </span>
                      {ord.status === 'printing' && (
                        <span className="text-primary font-bold">
                          Đang đùn lớp:{' '}
                          {typeof ord.layerProgress === 'number' ? `${ord.layerProgress}%` : '—'}
                          {' • Dự kiến: '}
                          {ord.timeRemaining || '—'}
                        </span>
                      )}
                      {/* OT-07: chỉ công bố QC khi có biên bản đo kiểm được ghi. */}
                      {ord.status === 'completed' && (
                        <span className="text-fg-subtle font-bold">Chưa có biên bản đo kiểm</span>
                      )}
                    </div>
                    <OrderProgress
                      currentStageIndex={stageIdx}
                      layerProgress={typeof ord.layerProgress === 'number' ? ord.layerProgress : undefined}
                      variant="compact"
                      status={ord.status}
                    />
                  </div>

                  {/* Ordered Parts Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ord.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-canvas p-3 rounded-lg border border-line-subtle"
                      >
                        <div className="relative w-13 h-13 rounded-lg border border-line shrink-0 overflow-hidden bg-surface-muted flex items-center justify-center text-fg-subtle">
                          <Icon name="view_in_ar" size={20} />
                          {item.image && !isFabricatedImage(item.image) ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="truncate text-xs">
                          <h4 className="font-bold text-xs sm:text-sm text-fg truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-fg-subtle font-mono mt-0.5 truncate">
                            SL: {item.quantity}x • {item.material || '—'} • {item.color || '—'}
                          </p>
                          {item.customText && (
                            <span className="text-xs text-primary font-mono font-medium block truncate">
                              Khắc: "{item.customText}"
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer — địa chỉ + CTA chính & menu thao tác phụ */}
                  <div className="pt-4 border-t border-line flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="text-xs text-fg-muted min-w-0">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="local_shipping" size={16} className="text-fg-subtle shrink-0" />
                        Giao tới: {ord.shippingAddress.fullName} ({ord.shippingAddress.city})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono shrink-0">
                      {/* CTA chính theo trạng thái đơn */}
                      <Button
                        size="sm"
                        variant={primary.variant}
                        onClick={primary.onClick}
                        disabled={isCompleted && reorderSuccessId === ord.id}
                        leadingIcon={<Icon name={isCompleted && reorderSuccessId === ord.id ? 'check_circle' : primary.icon} size={16} />}
                      >
                        <span>{isCompleted && reorderSuccessId === ord.id ? 'Đang chuyển…' : primary.label}</span>
                      </Button>

                      {/* Thao tác phụ gom vào menu "…" */}
                      <details className="relative">
                        <summary
                          aria-label="Thao tác khác"
                          className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center justify-center h-9 min-h-9 min-w-9 px-2 rounded-md border border-line-control bg-surface text-fg hover:bg-surface-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Icon name="more_horiz" size={18} />
                        </summary>
                        <div className="absolute right-0 z-panel mt-1 w-56 rounded-md border border-line-subtle bg-surface shadow-e2 p-1 space-y-0.5">
                          {(isPendingPayment || isCompleted) && (
                            <button type="button" onClick={() => onNavigate('order_tracking', { order: ord })} className="w-full text-left px-3 py-2 rounded-md text-xs font-bold text-fg hover:bg-surface-muted flex items-center gap-2 cursor-pointer">
                              <Icon name="sensors" size={16} className="text-primary" /> Xem tiến độ
                            </button>
                          )}
                          <button type="button" onClick={() => onOpenInvoice(ord)} className="w-full text-left px-3 py-2 rounded-md text-xs font-bold text-fg hover:bg-surface-muted flex items-center gap-2 cursor-pointer">
                            <Icon name="receipt_long" size={16} className="text-primary" /> Hóa đơn VAT
                          </button>
                          {!isCompleted && (
                            <button type="button" onClick={() => handleReorder(ord)} className="w-full text-left px-3 py-2 rounded-md text-xs font-bold text-fg hover:bg-surface-muted flex items-center gap-2 cursor-pointer">
                              <Icon name="replay" size={16} className="text-primary" /> In lại đơn
                            </button>
                          )}
                          <button type="button" onClick={() => handleOpenWarranty(ord)} className="w-full text-left px-3 py-2 rounded-md text-xs font-bold text-fg hover:bg-surface-muted flex items-center gap-2 cursor-pointer">
                            <Icon name="verified_user" size={16} className="text-primary" /> Kiểm tra / Bảo hành
                          </button>
                        </div>
                      </details>
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
        <Modal
          open
          onClose={() => setWarrantyModal(prev => ({ ...prev, isOpen: false }))}
          size="lg"
          title="YÊU CẦU BẢO HÀNH DUNG SAI KỸ THUẬT"
          description="Ghi nhận sai lệch kích thước / bề mặt để xưởng kiểm tra"
        >
            {warrantyModal.submitted ? (
              <div role="alert" className="p-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-warning-tint text-warning flex items-center justify-center mx-auto">
                  <Icon name="error" size={28} />
                </div>
                <h4 className="font-bold text-base text-fg">Chưa gửi được yêu cầu</h4>
                <p className="text-xs text-fg-muted">
                  Hệ thống tiếp nhận bảo hành trực tuyến chưa được nối vào cơ sở dữ liệu, nên yêu cầu của bạn
                  <strong className="text-fg"> chưa được ghi nhận</strong> và không có mã hồ sơ nào được tạo.
                </p>
                <p className="text-xs text-fg-subtle font-mono">
                  Vui lòng liên hệ trực tiếp xưởng để được xử lý ngay.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitWarranty} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-fg mb-1">
                    Đơn hàng áp dụng:
                  </label>
                  <p className="font-mono text-primary bg-canvas p-2 rounded-lg border border-line-subtle">
                    {warrantyModal.order?.orderNumber} • Đặt ngày: {warrantyModal.order ? formatDateTime(warrantyModal.order.date) : '—'}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-fg mb-1">
                    Phân loại sự cố kỹ thuật:
                  </label>
                  <select
                    value={warrantyModal.issueType}
                    onChange={(e) => setWarrantyModal(prev => ({ ...prev, issueType: e.target.value as any }))}
                    className="w-full p-2.5 bg-surface border border-line-control rounded-lg text-xs text-fg focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="tolerance">Sai lệch kích thước so với bản vẽ (Tolerance Deviation)</option>
                    <option value="surface">Lỗi bề mặt, tách lớp (Delamination / Layer Separation)</option>
                    <option value="material">Sai chủng loại vật liệu hoặc màu sắc yêu cầu</option>
                    <option value="strength">Độ cứng cơ tính không đạt thông số Datasheet</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-fg mb-1">
                    Độ lệch đo được bằng thước cặp (Caliper measurement):
                  </label>
                  <input
                    type="text"
                    value={warrantyModal.measuredDeviation}
                    onChange={(e) => setWarrantyModal(prev => ({ ...prev, measuredDeviation: e.target.value }))}
                    placeholder="Ví dụ: Lỗ ren thiết kế Ø10.0mm nhưng in ra Ø9.75mm (-0.25mm)"
                    className="w-full p-2.5 bg-surface border border-line-control rounded-lg text-xs text-fg focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-fg mb-1">
                    Mô tả thêm & yêu cầu xử lý:
                  </label>
                  <textarea
                    rows={3}
                    value={warrantyModal.notes}
                    onChange={(e) => setWarrantyModal(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Mô tả cụ thể vị trí sai lệch và đề xuất (In lại ngay / Hoàn tín dụng vào ví VCUBE)..."
                    className="w-full p-2.5 bg-surface border border-line-control rounded-lg text-xs text-fg focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="bg-warning-tint p-3 rounded-lg border border-warning/30 text-warning text-xs flex items-start gap-2">
                  <Icon name="info" size={18} className="shrink-0 mt-0.5" />
                  <span>
                    Chính sách VCUBE: khi chi tiết không khớp lắp ghép, kỹ sư sẽ kiểm tra nguyên nhân, hiệu chuẩn lại máy in và in lại.
                    Mọi kết luận dựa trên số đo thực tế của cả hai bên; tiêu chí nghiệm thu được thoả thuận trước khi sản xuất.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 font-mono">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setWarrantyModal(prev => ({ ...prev, isOpen: false }))}
                  >
                    Đóng
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                  >
                    Gửi Hồ Sơ Khiếu Nại
                  </Button>
                </div>
              </form>
            )}
        </Modal>
      )}
    </div>
  );
};
