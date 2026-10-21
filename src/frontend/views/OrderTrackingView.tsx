import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Order } from '../types';
import { OrderProgress } from '../components/OrderProgress';
import { dbService } from '../../backend/supabase/database';
import { Icon, Button, Badge, Card, Field, Input, Skeleton } from '@frontend/ui';
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
  <span className="text-fg-muted font-mono" title={title} aria-label={title}>
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
              Tra Cứu Đơn Hàng
            </h1>
          </div>

          {lookupState === 'not_found' && (
            <Card variant="soft" padding="lg" className="space-y-2" role="status">
              <div className="flex items-center gap-2 text-fg">
                <Icon name="search_off" size={20} className="text-fg-subtle" />
                <h2 className="text-base font-semibold tracking-tight text-fg">Không tìm thấy đơn hàng</h2>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                Chúng tôi không có đơn hàng nào khớp với thông tin bạn nhập. Vui lòng kiểm tra lại mã đơn,
                hoặc dùng đúng mã truy cập / số điện thoại đã dùng khi đặt hàng.
              </p>
            </Card>
          )}

          <Card variant="soft" padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2 text-fg">
                <Icon name="travel_explore" size={20} className="text-fg-muted" />
                <h3 className="text-sm font-semibold uppercase font-mono tracking-wider text-fg">
                  Cổng Tra Cứu Đơn Hàng Khách Vãng Lai
                </h3>
              </div>
              <span className="text-xs font-mono text-fg-subtle">Không cần mật khẩu đăng nhập</span>
            </div>

            <p className="text-xs text-fg-muted leading-relaxed">
              Để bảo vệ thông tin đơn hàng, tra cứu yêu cầu <strong>cả mã đơn và mã truy cập</strong> (hoặc số
              điện thoại nhận hàng) đã dùng khi đặt hàng. Mã truy cập được cấp ở màn hình xác nhận đơn.
            </p>

            <form id="guest-lookup-form" onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <Field id="lookup-code" label="Mã Đơn Hàng:" className="sm:col-span-5">
                {(control) => (
                  <Input {...control} type="text" value={lookupCode} className="font-mono" required
                    onChange={(e) => setLookupCode(e.target.value)} placeholder="Ví dụ: #VCUBE-8924" />
                )}
              </Field>

              <Field id="lookup-token" className="sm:col-span-5"
                label="Mã truy cập hoặc số điện thoại nhận hàng (bắt buộc):"
                hint="Chúng tôi không hiển thị đơn hàng nếu chỉ có mã đơn.">
                {(control) => (
                  <Input {...control} type="text" value={lookupAuth} className="font-mono" required
                    onChange={(e) => setLookupAuth(e.target.value)} placeholder="Mã truy cập trong màn hình xác nhận đơn" />
                )}
              </Field>

              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={lookupState === 'searching'}
                  loadingLabel="Đang tra..."
                  disabled={lookupState === 'searching'}
                  className="font-mono font-bold text-xs uppercase"
                >
                  {lookupState === 'searching' ? 'Đang tra...' : 'Tra Cứu'}
                </Button>
              </div>
            </form>

            {lookupError && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-danger/20 bg-danger-tint p-3" role="alert">
                <p className="text-xs text-danger flex-1 min-w-[12rem]">{lookupError}</p>
                <Button type="submit" form="guest-lookup-form" variant="secondary" size="sm"
                  loading={lookupState === 'searching'} loadingLabel="Đang tra...">Thử lại</Button>
              </div>
            )}

            {notFound && !lookupError && lookupState === 'idle' && (
              <p className="text-xs text-fg-muted">
                Liên kết bạn mở không ứng với đơn hàng nào trong phiên làm việc này. Hãy tra cứu bằng mã đơn
                và mã truy cập, hoặc đăng nhập để xem đơn của chính bạn.
              </p>
            )}

            {/* Trạng thái đang tra cứu: skeleton đúng layout thẻ đơn (pipeline + 2 cột chi tiết). */}
            {lookupState === 'searching' && (
              <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6" role="status" aria-label="Đang tra cứu đơn hàng">
                <Skeleton variant="text" width="12rem" />
                <div className="flex items-center gap-1">
                  <Skeleton variant="rect" height="0.5rem" rounded="full" className="flex-1" />
                  <Skeleton variant="rect" height="0.5rem" rounded="full" className="flex-1" />
                  <Skeleton variant="rect" height="0.5rem" rounded="full" className="flex-1" />
                  <Skeleton variant="rect" height="0.5rem" rounded="full" className="flex-1" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Skeleton variant="rect" height="7rem" rounded="lg" className="w-full" />
                  <Skeleton variant="rect" height="7rem" rounded="lg" className="w-full" />
                </div>
              </div>
            )}
          </Card>
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle"></span>
                  Không có tín hiệu MES
                </span>
                <Badge variant="technical" size="sm" className="font-mono tabular-nums">
                  {currentOrder.orderNumber}
                </Badge>
                {currentOrder.customerType === 'guest' && (
                  <Badge variant="warning" size="sm">
                    Đơn khách vãng lai
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
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
          <Card variant="soft" padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2 text-fg">
                <Icon name="travel_explore" size={20} className="text-fg-muted" />
                <h3 className="text-sm font-semibold uppercase font-mono tracking-wider text-fg">
                  Tra Cứu Đơn Khác
                </h3>
              </div>
              <span className="text-xs font-mono text-fg-subtle">Bắt buộc mã truy cập hoặc SĐT</span>
            </div>

            <form id="guest-lookup-form-2" onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <Field id="lookup-code-2" label="Mã Đơn Hàng:" className="sm:col-span-5">
                {(control) => (
                  <Input {...control} type="text" value={lookupCode} className="font-mono" required
                    onChange={(e) => setLookupCode(e.target.value)} placeholder="Ví dụ: #VCUBE-8924" />
                )}
              </Field>
              <Field id="lookup-token-2" label="Mã truy cập hoặc số điện thoại (bắt buộc):" className="sm:col-span-5">
                {(control) => (
                  <Input {...control} type="text" value={lookupAuth} className="font-mono" required
                    onChange={(e) => setLookupAuth(e.target.value)} placeholder="Mã truy cập trong màn hình xác nhận đơn" />
                )}
              </Field>
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={lookupState === 'searching'}
                  loadingLabel="Đang tra..."
                  disabled={lookupState === 'searching'}
                  className="font-mono font-bold text-xs uppercase"
                >
                  {lookupState === 'searching' ? 'Đang tra...' : 'Tra Cứu'}
                </Button>
              </div>
            </form>

            {lookupError && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-danger/20 bg-danger-tint p-3" role="alert">
                <p className="text-xs text-danger flex-1 min-w-[12rem]">{lookupError}</p>
                <Button type="submit" form="guest-lookup-form-2" variant="secondary" size="sm"
                  loading={lookupState === 'searching'} loadingLabel="Đang tra...">Thử lại</Button>
              </div>
            )}
            {lookupState === 'not_found' && (
              <p className="text-xs text-fg-muted rounded-lg border border-line bg-surface-muted p-3" role="status">
                Không tìm thấy đơn hàng khớp với thông tin đã nhập.
              </p>
            )}
            {/* Trạng thái đang tra cứu: skeleton đúng layout thẻ đơn. */}
            {lookupState === 'searching' && (
              <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6" role="status" aria-label="Đang tra cứu đơn hàng">
                <Skeleton variant="text" width="12rem" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Skeleton variant="rect" height="7rem" rounded="lg" className="w-full" />
                  <Skeleton variant="rect" height="7rem" rounded="lg" className="w-full" />
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Pipeline Card */}
        <Card variant="soft" padding="lg" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line-subtle">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-fg">
              <Icon name="linear_scale" size={20} className="text-fg-muted" />
              Quy Trình Gia Công 8 Bước
            </h2>
            {/* OT-06: bỏ badge "Xưởng Vận Hành ISO 9001" — không có chứng nhận nào được lưu. */}
            <span className="flex items-center gap-1.5 self-start rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-mono text-fg-muted sm:self-auto">
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
          <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 text-xs font-mono space-y-2">
            <p className="font-bold text-fg-muted">Chưa có dữ liệu từ máy in</p>
            <p className="text-fg-muted">
              Đầu đùn: <Unknown /> • Bàn nhiệt: <Unknown /> • Tốc độ: <Unknown /> • Lớp: <Unknown />
            </p>
            <p className="text-fg-muted">
              Trạng thái này chỉ hiển thị số liệu khi xưởng kết nối hệ thống MES.
            </p>
            <p className="text-fg-muted pt-1 tabular-nums">
              Tiến độ lớp: {layerProgress === null ? <Unknown title="Chưa có dữ liệu từ máy in" /> : `${layerProgress}%`}
              {' • '}Thời gian còn lại:{' '}
              {currentOrder.timeRemaining || <Unknown title="Chưa có dữ liệu từ máy in" />}
            </p>
          </div>
        </Card>

        {/* Order details + delivery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <div className="lg:col-span-6 space-y-5">
            {/* OT-06: thay bảng "chứng nhận dung sai" bằng trạng thái đo kiểm thật. */}
            <Card variant="soft" padding="md" className="space-y-3 text-xs sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg">
                <Icon name="straighten" size={18} className="text-fg-muted" />
                Kết Quả Đo Kiểm
              </h3>
              <p className="text-fg-muted leading-relaxed">
                Chưa có biên bản đo kiểm nào được ghi cho đơn này. VCUBE chỉ công bố kết quả dung sai khi
                xưởng đã thực hiện đo và lưu kết quả vào hồ sơ đơn hàng.
              </p>
              <p className="text-xs text-fg-muted">
                Cần đo kiểm theo yêu cầu? Hãy mở trao đổi với xưởng để thoả thuận phương pháp đo và tiêu chí nghiệm thu.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="max-md:min-h-11"
                onClick={onOpenChat}
                trailingIcon={<span aria-hidden="true">→</span>}
              >
                Liên hệ xưởng về đo kiểm
              </Button>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-5">
            {/* Ordered Items — bảng chi tiết theo DESIGN-LANGUAGE §3.5 */}
            <Card variant="soft" padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle px-4 py-3">
                <h3 className="text-sm font-semibold tracking-tight text-fg">
                  Linh Kiện Trong Đơn Hàng ({currentOrder.items.length})
                </h3>
                <span className="text-xs font-mono text-fg-subtle tabular-nums">
                  Tổng: {formatCurrency(currentOrder.payment.total)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-xs uppercase tracking-wider text-fg-muted">
                    <tr>
                      <th scope="col" className="h-10 px-4 text-left font-semibold">Linh kiện</th>
                      <th scope="col" className="h-10 px-4 text-right font-semibold">SL</th>
                      <th scope="col" className="h-10 px-4 text-right font-semibold">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrder.items.map((item) => (
                      <tr key={item.id} className="border-t border-line-subtle hover:bg-surface-muted/60">
                        <td className="px-4 py-2 text-sm text-fg">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-8 h-8 object-cover border border-line rounded-sm bg-surface-muted shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-fg truncate">{item.name}</p>
                              <p className="text-xs text-fg-subtle font-mono mt-0.5 truncate">
                                {item.quantity}x
                                {item.material ? ` • ${item.material}` : ''}
                                {item.color ? ` • ${item.color}` : ''}
                                {item.resolution ? ` • Độ phân giải: ${item.resolution}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 text-right font-mono tabular-nums text-fg-muted whitespace-nowrap">
                          {item.quantity}
                        </td>
                        <td className="px-4 text-right font-mono tabular-nums font-semibold text-fg whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Payment + Delivery — chỉ hiện dữ liệu thật */}
            <Card variant="soft" padding="md" className="space-y-4 text-xs sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg">
                  <Icon name="local_shipping" size={18} className="text-fg-muted" />
                  Thanh Toán & Vận Chuyển
                </h3>
                <Badge
                  variant={currentOrder.payment.isPaid ? 'success' : 'warning'}
                  dot
                  className="font-mono"
                >
                  {currentOrder.payment.isPaid
                    ? 'ĐÃ THANH TOÁN'
                    : currentOrder.payment.status === 'cod'
                    ? 'THU KHI GIAO (COD)'
                    : 'CHỜ THANH TOÁN'}
                </Badge>
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

              <Button
                variant="ghost"
                size="sm"
                className="max-md:min-h-11"
                onClick={() => onNavigate('my_orders')}
                leadingIcon={<span aria-hidden="true">←</span>}
              >
                Về danh sách đơn hàng
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
