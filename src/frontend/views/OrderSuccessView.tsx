import React, { useState } from 'react';
import { Order } from '../../types';
import { useLanguage } from '../context/LanguageContext';
import { Icon, Button } from '@frontend/ui';
import { EMPTY_VALUE, formatDateTime } from '../lib/format';

/**
 * `Order.date` đến từ HAI nguồn khác nhau:
 *   * `/checkout` ghi một CHUỖI HIỂN THỊ (`dd/mm/yyyy hh:mm` theo `toLocaleDateString`).
 *   * Đơn ĐỌC LẠI từ DB mang ISO/timestamptz (cột `orders.date` → `rowToOrder` ở mappers).
 * Chỉ định dạng lại giá trị ISO; chuỗi đã là bản hiển thị thì giữ nguyên — đem `new Date()` đi
 * đoán `dd/mm` sẽ bị đọc thành `mm/dd`, tức là HIỂN SAI NGÀY. Giá trị trống hoặc không đọc
 * được thì in nguyên văn thứ đang có, KHÔNG bịa một ngày.
 *
 * (Đây là bản sao có chủ đích ở `InvoiceModal.tsx`; gộp lại cần sửa `src/frontend/lib/format.ts`,
 * nằm ngoài phạm vi 2 file này.)
 */
function orderDateText(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return EMPTY_VALUE;
  if (!/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(raw)) return raw;
  const formatted = formatDateTime(raw);
  return formatted === EMPTY_VALUE ? raw : formatted;
}

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

  // Trạng thái thanh toán ĐỌC TỪ ĐƠN ĐÃ LƯU, không suy diễn.
  const isCod = order.payment?.status === 'cod' || /cod/i.test(order.payment?.method || '');
  const isPaid = order.payment?.isPaid === true || order.payment?.status === 'paid';
  // Xưởng chỉ bắt đầu sau khi tiền được xác nhận (hoặc với COD, sau khi chốt đơn).
  const canStartProduction = isPaid || isCod;

  return (
    <div className="min-h-dvh bg-canvas text-fg py-8 sm:py-12 px-4 sm:px-6 md:px-12">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Main Success Card */}
        <div className="bg-surface p-6 sm:p-10 rounded-lg text-center space-y-6 shadow-e2">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-positive-tint text-positive rounded-lg flex items-center justify-center mx-auto shadow-e0">
            <Icon name="check_circle" size={30} className="font-bold" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 font-mono text-xs text-fg-subtle uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-positive animate-pulse"></span>
              <span>Đơn Hàng Đã Được Khởi Tạo Thành Công</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Xác Nhận Đơn Hàng Thành Công
            </h1>
            <p className="text-xs font-mono text-fg-subtle mt-2">
              Mã đơn: <strong className="text-primary text-sm">{order.orderNumber}</strong> • Ngày tạo: {orderDateText(order.date)}
            </p>
          </div>

          {/* Guest Checkout Access Token Badge */}
          {order.secureAccessToken && (
            <div className="bg-gradient-to-r from-positive-tint to-primary-tint border border-positive/30 rounded-lg p-4 text-left shadow-e1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-positive flex items-center gap-1.5">
                  <Icon name="key" size={16} className="text-positive" />
                  <span>MÃ TRA CỨU KHÁCH VÃNG LAI (GUEST ACCESS TOKEN)</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-positive-tint text-positive font-mono text-xs font-bold">
                  Không Cần Mật Khẩu
                </span>
              </div>
              <p className="text-xs text-positive font-sans">
                Bạn đang đặt hàng ở chế độ Khách Vãng Lai. Hãy lưu mã này để tra cứu trạng thái in và tiến độ đơn hàng bất kỳ lúc nào:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <code className="px-3 py-1.5 bg-surface border border-positive/30 rounded-lg text-xs font-mono font-bold text-positive select-all flex-1 truncate">
                  {order.secureAccessToken}
                </code>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    navigator.clipboard?.writeText(order.secureAccessToken!);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  leadingIcon={<Icon name={copiedToken ? 'check' : 'content_copy'} size={16} />}
                >
                  <span>{copiedToken ? 'Đã chép' : 'Sao chép'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Next-steps stepper — trạng thái lấy từ ĐƠN ĐÃ LƯU, không hứa trước.
              OT-08: trước đây màn này khẳng định "Thanh toán — Đã xác nhận" cho một
              đơn vừa tạo trong trình duyệt vài trăm ms trước đó. */}
          <div className="py-6 border-y border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
            {/* Stage 1 — phụ thuộc phương thức thanh toán thật */}
            <div className={`space-y-1.5 p-2 rounded-lg border ${
              isPaid ? 'bg-positive-tint border-positive/30' : 'bg-warning-tint border-warning/30'
            }`}>
              <div className={`w-6 h-6 flex items-center justify-center mx-auto text-xs font-bold rounded-full ${
                isPaid ? 'bg-positive text-primary-fg' : 'bg-warning text-primary-fg'
              }`}>
                {isPaid ? '✓' : '!'}
              </div>
              <p className={`font-bold text-xs ${isPaid ? 'text-positive' : 'text-warning'}`}>1. Thanh toán</p>
              <p className={`text-xs ${isPaid ? 'text-positive' : 'text-warning'}`}>
                {isPaid
                  ? (isVi ? 'Đã xác nhận' : 'Confirmed')
                  : isCod
                  ? (isVi ? 'Thu khi giao hàng (COD)' : 'Cash on delivery')
                  : (isVi ? 'Đang chờ thanh toán' : 'Awaiting payment')}
              </p>
            </div>

            {/* Stage 2 — chỉ "đang duyệt" khi đơn đã qua bước thanh toán */}
            <div className={`space-y-1.5 p-2 rounded-lg border ${
              canStartProduction
                ? 'bg-primary/10 border-primary/30'
                : 'bg-canvas border-line opacity-60'
            }`}>
              <div className={`w-6 h-6 flex items-center justify-center mx-auto text-xs font-bold rounded-full ${
                canStartProduction ? 'bg-primary text-primary-fg' : 'bg-line text-fg'
              }`}>
                2
              </div>
              <p className="font-bold text-xs text-fg">{isVi ? '2. Duyệt file & cắt lớp' : '2. File review & slicing'}</p>
              <p className="text-xs text-fg-subtle">
                {canStartProduction
                  ? (isVi ? 'Xưởng sẽ tiếp nhận' : 'Workshop will pick up')
                  : (isVi ? 'Chờ xác nhận thanh toán' : 'Waiting for payment')}
              </p>
            </div>

            {/* Stage 3 */}
            <div className="space-y-1.5 p-2 rounded-lg bg-canvas border border-line opacity-60">
              <div className="w-6 h-6 bg-line text-fg flex items-center justify-center mx-auto text-xs font-bold rounded-full">
                3
              </div>
              <p className="font-bold text-xs text-fg">{isVi ? '3. Lên bàn in 3D' : '3. Queue on printer'}</p>
              <p className="text-xs text-fg-subtle">{isVi ? 'Chưa gán máy in' : 'No printer assigned yet'}</p>
            </div>

            {/* Stage 4 — không hứa hẹn dung sai khi chưa có hồ sơ đo kiểm */}
            <div className="space-y-1.5 p-2 rounded-lg bg-canvas border border-line opacity-60">
              <div className="w-6 h-6 bg-line text-fg flex items-center justify-center mx-auto text-xs font-bold rounded-full">
                4
              </div>
              <p className="font-bold text-xs text-fg">{isVi ? '4. Giao hàng' : '4. Delivery'}</p>
              <p className="text-xs text-fg-subtle">{isVi ? 'Chưa có mã vận đơn' : 'No tracking code yet'}</p>
            </div>
          </div>

          {/* Instant Digital CAD Download Box (If order contains CAD items) */}
          {hasDigitalItems && (
            <div className="p-4 bg-primary/5 border border-primary/30 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary text-primary-fg flex items-center justify-center shrink-0">
                  <Icon name="folder_zip" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-fg">{isVi ? 'Bản quyền file CAD trong đơn' : 'CAD licences in this order'}</h4>
                  <p className="text-xs text-fg-subtle font-mono">
                    {isVi
                      ? 'File nằm trong Kho Tệp CAD. Tình trạng tải trực tiếp hiển thị theo quyền thực tế của từng file.'
                      : 'Files live in the CAD library. Direct download availability reflects each file’s real entitlement.'}
                  </p>
                </div>
              </div>
              <Button
                size="md"
                variant="primary"
                onClick={() => onNavigate('assets')}
                leadingIcon={<Icon name="download" size={18} />}
              >
                <span>Mở Kho Tệp CAD</span>
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 font-mono">
            {hasPhysicalItems && (
              <Button
                size="lg"
                variant="primary"
                className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider font-bold"
                onClick={() => onNavigate('tracking', { orderId: order.id })}
                leadingIcon={<Icon name="sensors" size={18} />}
              >
                <span>{isVi ? 'THEO DÕI TIẾN ĐỘ ĐƠN HÀNG' : 'TRACK ORDER PROGRESS'}</span>
              </Button>
            )}

            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider font-bold"
              onClick={() => onOpenInvoice(order)}
              leadingIcon={<Icon name="receipt_long" size={18} />}
            >
              <span>{isVi ? 'Xem / In hoá đơn' : 'View / print invoice'}</span>
            </Button>
          </div>
        </div>

        {/* Order Details & Summary Card */}
        <div className="bg-surface p-5 sm:p-7 rounded-lg shadow-e1 space-y-5">
          <h2 className="font-extrabold text-sm sm:text-base text-fg flex items-center gap-2 border-b border-line pb-3.5 font-mono uppercase">
            <Icon name="inventory_2" size={20} className="text-primary" />
            <span>Danh Sách Linh Kiện & Dịch Vụ ({order.items.length})</span>
          </h2>

          <div className="divide-y divide-line">
            {order.items.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3.5 truncate">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-md object-cover border border-line bg-surface-muted shrink-0"
                  />
                  <div className="truncate">
                    <h3 className="font-bold text-xs text-fg truncate">{item.name}</h3>
                    <p className="text-xs text-fg-subtle">
                      {item.type === 'digital' ? 'Bản quyền CAD (.STL + .STEP)' : `${item.quantity}x • ${item.material} • ${item.color || ''}`}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-xs text-fg shrink-0 ml-3">
                  {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3.5 border-t border-line flex items-center justify-between text-xs font-mono">
            <span className="text-xs text-fg-subtle uppercase">Phương thức thanh toán:</span>
            <span className="font-bold text-fg">{order.payment.method}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-xs text-fg-subtle uppercase">{isVi ? 'Tổng tiền đơn hàng:' : 'Order total:'}</span>
            <span className="font-mono font-black text-base sm:text-lg text-primary">
              {order.payment.total.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
