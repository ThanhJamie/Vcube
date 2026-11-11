import type { BadgeVariant } from '@frontend/ui';
import { Badge, Button, Card, Icon } from '@frontend/ui';
import { EMPTY_VALUE, formatDate, formatNumber, formatWeight } from '@frontend/lib/format';

/**
 * PrintJobDetail — phiếu việc in của MỘT đơn thuộc xưởng đang đăng nhập.
 *
 * Kiểu dữ liệu khai báo cục bộ (structural) để component frontend không import tầng
 * backend/service; caller `QueueTab` truyền `MyQueueOrder` tương thích.
 */
interface PrintJobItem {
  id: string;
  name: string;
  quantity: number;
  material?: string | null;
  color?: string | null;
  productId?: string | null;
  dimensions?: string | null;
  resolution?: string | null;
  infill?: string | null;
  layerHeightMm?: number | null;
  weightGrams?: number | null;
  note?: string | null;
}
interface PrintJobOrder {
  id: string;
  orderNumber: string;
  date: string | null;
  estimatedDelivery: string;
  status: string;
  statusStageIndex: number | null;
  paymentStatus?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerNote?: string | null;
  items: PrintJobItem[];
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  processing: 'Đang gia công',
  printing: 'Đang in 3D',
  post_processing: 'Hậu kỳ',
  packaging: 'Đóng gói',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

/** Nhãn + sắc badge thanh toán dùng chung cho hàng đợi và phiếu việc. */
export function paymentStatusInfo(status: string | null | undefined): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'paid':
      return { label: 'Đã trả', variant: 'success' };
    case 'cod':
      return { label: 'COD', variant: 'info' };
    case 'awaiting_payment':
    case 'unpaid':
      return { label: 'Chưa trả', variant: 'warning' };
    case 'cancelled':
      return { label: 'Đã huỷ', variant: 'danger' };
    default:
      return { label: 'Chưa có dữ liệu', variant: 'neutral' };
  }
}

/** `true` = trạng thái thanh toán chưa cho phép xưởng bắt đầu sản xuất (VietQR/unpaid). */
export function isPaymentBlocked(status: string | null | undefined): boolean {
  return status === 'awaiting_payment' || status === 'unpaid';
}

export const PaymentBadge: React.FC<{ status: string | null | undefined; className?: string }> = ({
  status,
  className,
}) => {
  const info = paymentStatusInfo(status);
  return (
    <Badge variant={info.variant} size="sm" className={className}>
      Thanh toán: {info.label}
    </Badge>
  );
};

/** Trường thiếu ⇒ "Chưa có" (không dùng `—` trần vì phiếu việc cần câu rõ nghĩa). */
const text = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return 'Chưa có';
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : 'Chưa có';
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium text-fg-muted">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-fg">{value}</dd>
  </div>
);

const ITEM_FIELDS = (item: PrintJobItem): { label: string; value: string }[] => [
  { label: 'Vật liệu', value: text(item.material) },
  { label: 'Màu', value: text(item.color) },
  { label: 'Kích thước', value: text(item.dimensions) },
  { label: 'Độ phân giải', value: text(item.resolution) },
  { label: 'Độ đặc', value: text(item.infill) },
  {
    label: 'Độ dày lớp',
    value: item.layerHeightMm != null ? `${formatNumber(item.layerHeightMm, { maximumFractionDigits: 2 })} mm` : 'Chưa có',
  },
  { label: 'Khối lượng', value: item.weightGrams != null ? formatWeight(item.weightGrams) : 'Chưa có' },
  { label: 'Mã sản phẩm', value: text(item.productId) },
];

export interface PrintJobDetailProps {
  order: PrintJobOrder;
  onClose: () => void;
}

export const PrintJobDetail: React.FC<PrintJobDetailProps> = ({ order, onClose }) => {
  const stageText =
    order.statusStageIndex != null
      ? `Nấc ${order.statusStageIndex + 1}/8`
      : `Nấc: ${EMPTY_VALUE}`;
  const statusText = STATUS_LABELS[order.status] ?? (order.status || 'Chưa có');

  return (
    <Card as="section" padding="lg" className="space-y-4" aria-label="Phiếu việc in">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-subtle pb-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            <Icon name="description" size={18} className="shrink-0 text-primary" aria-hidden="true" />
            Phiếu việc in
          </p>
          <p className="font-mono text-sm font-semibold text-fg">
            {order.orderNumber || EMPTY_VALUE}
            <span className="ml-2 font-sans text-xs font-normal text-fg-subtle">
              {order.date ? `Đặt: ${formatDate(order.date)}` : 'Chưa có ngày đặt'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge status={order.paymentStatus} />
          <Badge variant="neutral" size="sm">
            {stageText} · {statusText}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            leadingIcon={<Icon name="close" size={16} aria-hidden="true" />}
          >
            Đóng
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoRow label="Khách nhận hàng" value={text(order.customerName)} />
        <InfoRow label="Số điện thoại" value={text(order.customerPhone)} />
        <div className="sm:col-span-2">
          <InfoRow label="Địa chỉ giao" value={text(order.customerAddress)} />
        </div>
        <div className="sm:col-span-2">
          <InfoRow label="Ghi chú của khách" value={text(order.customerNote)} />
        </div>
      </dl>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-fg">
          Chi tiết in ({order.items.length} dòng)
        </h3>
        {order.items.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-surface-muted px-3 py-4 text-sm text-fg-subtle">
            Đơn chưa lưu dòng hàng nào — xưởng cần đối chiếu với bộ phận điều phối trước khi in.
          </p>
        ) : (
          <ul className="space-y-2">
            {order.items.map((item, index) => (
              <li
                key={item.id || `${item.name}-${index}`}
                className="space-y-2 rounded-md border border-line-subtle bg-surface-muted/40 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-semibold text-fg">{text(item.name)}</p>
                  <Badge variant="technical" size="sm">
                    SL: {formatNumber(item.quantity)}
                  </Badge>
                </div>
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {ITEM_FIELDS(item).map((field) => (
                    <InfoRow key={field.label} label={field.label} value={field.value} />
                  ))}
                </dl>
                <p className="text-xs text-fg-muted">
                  Ghi chú dòng hàng: <span className="text-fg">{text(item.note)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="flex items-start gap-2 rounded-md border border-dashed border-line bg-surface-muted p-3 text-xs text-fg-muted">
        <Icon name="info" size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-fg">Tệp in: chưa có trong đơn.</strong>{' '}
          Đơn hàng hiện không lưu liên kết tệp in, nên phiếu này không có tệp để mở — xưởng nhận tệp
          qua kênh điều phối hoặc liên hệ bộ phận vận hành.
        </span>
      </p>
    </Card>
  );
};

export default PrintJobDetail;
