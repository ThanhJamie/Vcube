import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Order } from '../types';
import { OrderProgress } from '../components/OrderProgress';
import { dbService } from '../../backend/supabase/database';
import { Icon, Button } from '@frontend/ui';
import { formatCurrency } from '../lib/format';

interface OrderTrackingViewProps {
  order?: Order;
  /** true khi App không resolve được đơn theo id trên URL (đã bị chặn fallback). */
  notFound?: boolean;
  onNavigate: (screen: string, payload?: any) => void;
  onOpenChat: () => void;
  onOpenInvoice: (order: Order) => void;
}

/**
 * `—` cho mọi giá trị chưa có nguồn thật (data-honesty §3).
 * Không bao giờ render một con số mặc định trông như số đo thật.
 */
const Unknown: React.FC<{ title?: string }> = ({ title = 'Chưa có dữ liệu' }) => (
  <span className="text-fg-subtle font-mono" title={title} aria-label={title}>
    —
  </span>
);

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  order: initialOrder,
  notFound = false,
  onNavigate,
  onOpenChat,
  onOpenInvoice
}) => {
  const location = useLocation();
  const [currentOrder, setCurrentOrder] = useState<Order | null>(initialOrder ?? null);
  // Cổng tra cứu khách: chỉ mở khi chưa có đơn nào để hiển thị.
  const [isGuestSearchMode, setIsGuestSearchMode] = useState<boolean>(!initialOrder);
  const [lookupCode, setLookupCode] = useState<string>('');
  const [lookupAuth, setLookupAuth] = useState<string>('');
  const [lookupError, setLookupError] = useState<string>('');
  const [lookupState, setLookupState] = useState<'idle' | 'searching' | 'not_found'>('idle');

  // Sync when the resolved order prop changes (điều hướng trong app).
  useEffect(() => {
    if (initialOrder) {
      setCurrentOrder(initialOrder);
      setIsGuestSearchMode(false);
      setLookupState('idle');
      setLookupError('');
    } else {
      setCurrentOrder(null);
      setIsGuestSearchMode(true);
    }
  }, [initialOrder]);

  // `?code=` / `?token=` chỉ là tiện ích điền sẵn — KHÔNG tự tra cứu, vì tra cứu
  // bắt buộc phải có token (xem handleGuestLookup).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('code') || params.get('order');
    const tokenParam = params.get('token');
    if (codeParam) setLookupCode(codeParam);
    if (tokenParam) setLookupAuth(tokenParam);
    if (codeParam || tokenParam) setIsGuestSearchMode(true);
  }, [location.search]);

  /**
   * Tra cứu đơn khách vãng lai.
   *
   * P0 (OT-02): trước đây hàm này `return true` khi không nhập mã xác thực, nên
   * CHỈ CẦN MÃ ĐƠN là đọc được tên / SĐT / địa chỉ / hoá đơn của người khác
   * (nguồn dữ liệu là `MOCK_ORDERS` + `localStorage`).
   *
   * Quy tắc hiện tại:
   *  - BẮT BUỘC token; thiếu token ⇒ từ chối, không truy vấn.
   *  - Truy vấn DUY NHẤT qua RPC SECURITY DEFINER `get_order_by_guest_token`.
   *  - Không đọc `MOCK_ORDERS`, không đọc `localStorage`.
   *  - Sai mã và không tồn tại trả về CÙNG một thông báo ⇒ không dò được đơn nào có thật.
   */
  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    const cleanCode = lookupCode.trim();
    const cleanToken = lookupAuth.trim();

    if (!cleanCode) {
      setLookupError('Vui lòng nhập mã đơn hàng.');
      return;
    }
    if (!cleanToken) {
      setLookupState('idle');
      setLookupError(
        'Cần thêm số điện thoại hoặc mã token để bảo vệ thông tin đơn hàng. Tra cứu chỉ bằng mã đơn không được phép.'
      );
      return;
    }

    setLookupState('searching');
    let found: Order | null = null;
    try {
      found = await dbService.getOrderByToken(cleanCode, cleanToken);
    } catch (err) {
      console.warn('Guest order lookup failed:', err);
      found = null;
    }

    if (found) {
      setCurrentOrder(found);
      setIsGuestSearchMode(false);
      setLookupState('idle');
      setLookupError('');
      return;
    }

    // Một thông báo duy nhất cho "sai token" và "không tồn tại": không tiết lộ
    // đơn nào có thật trên hệ thống.
    setCurrentOrder(null);
    setLookupState('not_found');
    setLookupError('');
  };

  // ---------------------------------------------------------------- NOT FOUND / PORTAL
  if (!currentOrder) {
    return (
      <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-start sm:items-center gap-3">
            <Button
              iconOnly
              variant="secondary"
              size="md"
              onClick={() => onNavigate('my_orders')}
              aria-label="Quay lại danh sách đơn hàng"
              leadingIcon={<Icon name="arrow_back" size={20} />}
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Tra Cứu Đơn Hàng
            </h1>
          </div>

          {lookupState === 'not_found' && (
            <div className="bg-surface rounded-lg p-6 sm:p-8 space-y-2 shadow-e1" role="status">
              <div className="flex items-center gap-2 text-fg">
                <Icon name="search_off" size={24} className="text-fg-subtle" />
                <h2 className="font-bold text-base">Không tìm thấy đơn hàng</h2>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                Chúng tôi không có đơn hàng nào khớp với thông tin bạn nhập. Vui lòng kiểm tra lại mã đơn,
                hoặc dùng đúng mã token / số điện thoại đã dùng khi đặt hàng.
              </p>
            </div>
          )}

          <div className="bg-surface border-2 border-primary/30 rounded-lg p-6 shadow-e2 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-primary">
                <Icon name="travel_explore" size={24} />
                <h3 className="font-bold text-sm text-fg uppercase font-mono tracking-wider">
                  Cổng Tra Cứu Đơn Hàng Khách Vãng Lai
                </h3>
              </div>
              <span className="text-xs font-mono text-fg-subtle">Không cần mật khẩu đăng nhập</span>
            </div>

            <p className="text-xs text-fg-muted leading-relaxed">
              Để bảo vệ thông tin đơn hàng, tra cứu yêu cầu <strong>cả mã đơn và mã token</strong> (hoặc số
              điện thoại nhận hàng) đã dùng khi đặt hàng. Mã token được cấp ở màn hình xác nhận đơn.
            </p>

            <form onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-5">
                <label htmlFor="lookup-code" className="block text-xs font-bold text-fg mb-1">
                  Mã Đơn Hàng:
                </label>
                <input
                  id="lookup-code"
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="Ví dụ: #VCUBE-8924"
                  className="w-full p-2.5 bg-canvas border border-line-control rounded-lg font-mono text-xs focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="sm:col-span-5">
                <label htmlFor="lookup-token" className="block text-xs font-bold text-fg mb-1">
                  Mã Token Hoặc Số Điện Thoại Nhận Hàng (bắt buộc):
                </label>
                <input
                  id="lookup-token"
                  type="text"
                  value={lookupAuth}
                  onChange={(e) => setLookupAuth(e.target.value)}
                  placeholder="Token trong màn hình xác nhận đơn"
                  className="w-full p-2.5 bg-canvas border border-line-control rounded-lg font-mono text-xs focus:outline-none focus:border-primary"
                  required
                  aria-describedby="lookup-token-hint"
                />
                <p id="lookup-token-hint" className="text-xs text-fg-subtle mt-1">
                  Chúng tôi không hiển thị đơn hàng nếu chỉ có mã đơn.
                </p>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={lookupState === 'searching'}
                  className="font-mono font-bold text-xs uppercase"
                >
                  {lookupState === 'searching' ? 'Đang tra...' : 'Tra Cứu'}
                </Button>
              </div>
            </form>

            {lookupError && (
              <p className="text-xs text-danger bg-danger-tint p-2.5 rounded-lg border border-danger/30" role="alert">
                {lookupError}
              </p>
            )}

            {notFound && !lookupError && lookupState === 'idle' && (
              <p className="text-xs text-fg-muted">
                Liên kết bạn mở không ứng với đơn hàng nào trong phiên làm việc này. Hãy tra cứu bằng mã đơn
                và token, hoặc đăng nhập để xem đơn của chính bạn.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- ORDER DETAIL
  // null = chưa có dữ liệu từ xưởng ⇒ render `—` thay vì mặc định 64% / nấc 4.
  const layerProgress = currentOrder.layerProgress ?? null;
  const currentStageIndex = currentOrder.statusStageIndex ?? null;
  const hasCarrierData = Boolean(currentOrder.carrier?.trackingCode);

  return (
    <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Breadcrumb & Return Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-line">
          <div className="flex items-start sm:items-center gap-3">
            <Button
              iconOnly
              variant="secondary"
              size="md"
              onClick={() => onNavigate('my_orders')}
              aria-label="Quay lại danh sách đơn hàng"
              leadingIcon={<Icon name="arrow_back" size={20} />}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                {/* OT-04: bỏ badge "Live Telemetry" khi không có nhịp tim từ MES. */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-muted border border-line-subtle text-fg-subtle text-xs sm:text-xs uppercase tracking-widest font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-line-control"></span>
                  Không có tín hiệu MES
                </span>
                <span className="px-2.5 py-0.5 bg-primary-tint text-primary border border-primary/20 text-xs font-mono font-bold rounded-md shrink-0">
                  {currentOrder.orderNumber}
                </span>
                {currentOrder.customerType === 'guest' && (
                  <span className="px-2 py-0.5 bg-warning-tint text-warning text-xs font-mono font-bold rounded-md">
                    GUEST ORDER
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Tiến Độ Gia Công Đơn Hàng
              </h1>
              <p className="text-xs text-fg-muted mt-0.5">
                Ngày đặt: <strong className="text-fg">{currentOrder.date || <Unknown />}</strong>
                {' • '}Dự kiến hoàn thành:{' '}
                <strong className="text-fg">
                  {currentOrder.estimatedDelivery || <Unknown title="Chưa có lịch từ xưởng" />}
                </strong>
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto font-mono">
            <Button
              size="md"
              variant="secondary"
              onClick={() => setIsGuestSearchMode(!isGuestSearchMode)}
              leadingIcon={<Icon name="search" size={18} />}
            >
              <span>{isGuestSearchMode ? 'Xem Đơn Hiện Tại' : 'Tra Cứu Mã Khác'}</span>
            </Button>
            <Button
              size="md"
              variant="primary"
              onClick={onOpenChat}
              leadingIcon={<Icon name="support_agent" size={18} />}
            >
              <span>Hỗ Trợ</span>
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => onOpenInvoice(currentOrder)}
              leadingIcon={<Icon name="receipt_long" size={18} />}
            >
              <span>Hoá Đơn</span>
            </Button>
          </div>
        </div>

        {/* Guest lookup card (mở khi người dùng muốn tra mã khác) */}
        {isGuestSearchMode && (
          <div className="bg-surface border-2 border-primary/30 rounded-lg p-6 shadow-e2 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-primary">
                <Icon name="travel_explore" size={24} />
                <h3 className="font-bold text-sm text-fg uppercase font-mono tracking-wider">
                  Tra Cứu Đơn Khác
                </h3>
              </div>
              <span className="text-xs font-mono text-fg-subtle">Bắt buộc mã token hoặc SĐT</span>
            </div>

            <form onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-5">
                <label htmlFor="lookup-code-2" className="block text-xs font-bold text-fg mb-1">
                  Mã Đơn Hàng:
                </label>
                <input
                  id="lookup-code-2"
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="Ví dụ: #VCUBE-8924"
                  className="w-full p-2.5 bg-canvas border border-line-control rounded-lg font-mono text-xs focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="sm:col-span-5">
                <label htmlFor="lookup-token-2" className="block text-xs font-bold text-fg mb-1">
                  Mã Token Hoặc Số Điện Thoại (bắt buộc):
                </label>
                <input
                  id="lookup-token-2"
                  type="text"
                  value={lookupAuth}
                  onChange={(e) => setLookupAuth(e.target.value)}
                  placeholder="Token trong màn hình xác nhận đơn"
                  className="w-full p-2.5 bg-canvas border border-line-control rounded-lg font-mono text-xs focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={lookupState === 'searching'}
                  className="font-mono font-bold text-xs uppercase"
                >
                  {lookupState === 'searching' ? 'Đang tra...' : 'Tra Cứu'}
                </Button>
              </div>
            </form>

            {lookupError && (
              <p className="text-xs text-danger bg-danger-tint p-2.5 rounded-lg border border-danger/30" role="alert">
                {lookupError}
              </p>
            )}
            {lookupState === 'not_found' && (
              <p className="text-xs text-fg-muted bg-canvas p-2.5 rounded-lg border border-line" role="status">
                Không tìm thấy đơn hàng khớp với thông tin đã nhập.
              </p>
            )}
          </div>
        )}

        {/* Pipeline Card */}
        <div className="bg-surface rounded-lg p-5 sm:p-7 space-y-6 shadow-e1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-line gap-2">
            <h2 className="font-bold text-base text-fg flex items-center gap-2">
              <Icon name="linear_scale" size={20} className="text-primary" />
              Quy Trình Gia Công 8 Bước
            </h2>
            {/* OT-06: bỏ badge "Xưởng Vận Hành ISO 9001" — không có chứng nhận nào được lưu. */}
            <span className="text-xs font-mono text-fg-subtle flex items-center gap-1.5 px-3 py-1 bg-surface-muted rounded-full border border-line-subtle self-start sm:self-auto">
              Trạng thái cập nhật từ xưởng
            </span>
          </div>

          <OrderProgress
            currentStageIndex={currentStageIndex}
            layerProgress={layerProgress ?? undefined}
            variant="full"
            status={currentOrder.status}
          />

          {/* OT-04/OT-05: bỏ dải telemetry bịa và mô phỏng "digital twin". */}
          <div className="bg-canvas border border-line rounded-lg p-5 text-xs font-mono space-y-2">
            <p className="font-bold text-fg">Chưa có dữ liệu từ máy in</p>
            <p className="text-fg-subtle">
              Đầu đùn: <Unknown /> • Bàn nhiệt: <Unknown /> • Tốc độ: <Unknown /> • Lớp: <Unknown />
            </p>
            <p className="text-fg-subtle">
              Trạng thái này chỉ hiển thị số liệu khi xưởng kết nối hệ thống MES.
            </p>
            <p className="text-fg-subtle pt-1">
              Tiến độ lớp: {layerProgress === null ? <Unknown title="Chưa có dữ liệu từ máy in" /> : `${layerProgress}%`}
              {' • '}Thời gian còn lại:{' '}
              {currentOrder.timeRemaining || <Unknown title="Chưa có dữ liệu từ máy in" />}
            </p>
          </div>
        </div>

        {/* Order details + delivery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <div className="lg:col-span-6 space-y-5">
            {/* OT-06: thay bảng "chứng nhận dung sai" bằng trạng thái đo kiểm thật. */}
            <div className="bg-surface rounded-lg p-5 space-y-3 text-xs shadow-e1">
              <h3 className="font-bold text-sm text-fg flex items-center gap-2">
                <Icon name="straighten" size={18} className="text-primary" />
                Kết Quả Đo Kiểm
              </h3>
              <p className="text-fg-muted leading-relaxed">
                Chưa có biên bản đo kiểm nào được ghi cho đơn này. VCUBE chỉ công bố kết quả dung sai khi
                xưởng đã thực hiện đo và lưu kết quả vào hồ sơ đơn hàng.
              </p>
              <p className="text-xs text-fg-subtle">
                Cần đo kiểm theo yêu cầu? Hãy mở trao đổi với xưởng để thoả thuận phương pháp đo và tiêu chí nghiệm thu.
              </p>
              <button
                onClick={onOpenChat}
                className="text-primary font-bold underline font-mono text-xs cursor-pointer"
              >
                Liên hệ xưởng về đo kiểm →
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-5">
            {/* Ordered Items */}
            <div className="bg-surface rounded-lg p-5 space-y-4 shadow-e1">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-bold text-sm text-fg">
                  Linh Kiện Trong Đơn Hàng ({currentOrder.items.length})
                </h3>
                <span className="text-xs font-mono text-fg-subtle">
                  Tổng: {formatCurrency(currentOrder.payment.total)}
                </span>
              </div>

              <div className="divide-y divide-line">
                {currentOrder.items.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 truncate">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-13 h-13 object-cover border border-line rounded-lg bg-surface-muted shrink-0"
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-sm text-fg truncate">{item.name}</h4>
                        <p className="text-xs text-fg-subtle font-mono mt-0.5">
                          {item.quantity}x
                          {item.material ? ` • ${item.material}` : ''}
                          {item.color ? ` • ${item.color}` : ''}
                        </p>
                        {item.resolution && (
                          <span className="text-xs text-primary font-mono block">
                            Độ phân giải: {item.resolution}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-primary shrink-0 ml-3">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment + Delivery — chỉ hiện dữ liệu thật */}
            <div className="bg-surface rounded-lg p-5 space-y-4 text-xs shadow-e1">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-bold text-sm text-fg flex items-center gap-2">
                  <Icon name="local_shipping" size={18} className="text-primary" />
                  Thanh Toán & Vận Chuyển
                </h3>
                <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-sm border ${
                  currentOrder.payment.isPaid
                    ? 'text-positive bg-positive-tint border-positive/30'
                    : 'text-warning bg-warning-tint border-warning/30'
                }`}>
                  {currentOrder.payment.isPaid
                    ? 'ĐÃ THANH TOÁN'
                    : currentOrder.payment.status === 'cod'
                    ? 'THU KHI GIAO (COD)'
                    : 'CHỜ THANH TOÁN'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-fg-subtle text-xs font-mono uppercase tracking-wider block">
                    Phương thức:
                  </span>
                  <span className="font-bold text-fg">
                    {currentOrder.payment.method || <Unknown title="Chưa ghi nhận phương thức" />}
                  </span>
                </div>
                <div>
                  <span className="text-fg-subtle text-xs font-mono uppercase tracking-wider block">
                    Ngày thanh toán:
                  </span>
                  <span className="font-bold text-fg">
                    {currentOrder.payment.paidDate || <Unknown title="Chưa ghi nhận thời điểm thanh toán" />}
                  </span>
                </div>
                <div>
                  <span className="text-fg-subtle text-xs font-mono uppercase tracking-wider block">
                    Đơn vị vận chuyển:
                  </span>
                  <span className="font-bold text-fg">
                    {currentOrder.carrier?.name || <Unknown title="Chưa có đơn vị vận chuyển" />}
                  </span>
                </div>
                <div>
                  <span className="text-fg-subtle text-xs font-mono uppercase tracking-wider block">
                    Mã vận đơn:
                  </span>
                  <span className="font-mono font-bold text-primary">
                    {hasCarrierData ? currentOrder.carrier.trackingCode : (
                      <span className="text-fg-subtle" title="Chưa có mã vận đơn">Chưa có mã vận đơn</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-fg-subtle text-xs font-mono uppercase tracking-wider block">
                    Người Nhận:
                  </span>
                  <span className="font-bold text-fg">
                    {currentOrder.shippingAddress.fullName || <Unknown />}
                    {currentOrder.shippingAddress.phone ? ` (${currentOrder.shippingAddress.phone})` : ''}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-fg-subtle text-xs font-mono uppercase tracking-wider block">
                    Địa Chỉ Nhận Hàng:
                  </span>
                  <span className="text-fg-muted">
                    {[currentOrder.shippingAddress.address, currentOrder.shippingAddress.district, currentOrder.shippingAddress.city]
                      .filter(Boolean)
                      .join(', ') || <Unknown />}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('my_orders')}
                className="text-primary font-bold underline font-mono text-xs cursor-pointer"
              >
                ← Về danh sách đơn hàng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
