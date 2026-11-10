import React, { useState } from 'react';
import type { Order } from '@/types';
import { Badge, Button, Icon, Money } from '@frontend/ui';
import { EMPTY_VALUE, formatDateTime } from '@frontend/lib/format';

/**
 * OPS-01 — khối "Thanh toán" dùng CHUNG cho `/order-success`, `/tracking` và khối
 * "Đã tạo đơn hàng" của `/checkout`.
 *
 * NGUỒN DỮ LIỆU DUY NHẤT: chính đơn hàng (`order.payment.transferInstructions` — snapshot
 * đã ghi lúc đặt). Component TUYỆT ĐỐI không đọc `app_settings` hiện tại: ngân hàng/số TK có
 * thể đã đổi, đơn cũ phải hiện đúng thông tin khách đã nhận khi đặt (data-honesty).
 *
 * Các trạng thái hiển thị (theo thứ tự ưu tiên, loại trừ nhau):
 *   1. `cancelled`                         → "Đơn đã hủy — không cần thanh toán".
 *   2. `payment.isPaid` / `status='paid'`  → "Đã thanh toán" + ngày nếu có.
 *   3. COD (`status='cod'` hoặc method COD) → "Thanh toán khi nhận hàng".
 *   4. Bank + snapshot `configured=true`   → ngân hàng / số TK / chủ TK / số tiền / nội dung CK.
 *   5. Còn lại (bank nhưng chưa có snapshot, hoặc `configured=false`)
 *                                          → nói thật "chưa lưu thông tin nhận tiền".
 */

/** `paidDate` có thể là ISO (đọc từ DB) hoặc chuỗi hiển thị (đơn vừa tạo) — không đoán sai ngày. */
function paidDateText(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(raw)) return raw;
  const formatted = formatDateTime(raw);
  return formatted === EMPTY_VALUE ? raw : formatted;
}

export interface TransferInstructionsCardProps {
  order: Order;
  className?: string;
  /**
   * `false` khi màn cha ĐÃ có badge thanh toán riêng (tránh 2 badge trùng nhau trên `/tracking`).
   * Mặc định `true` để component đứng một mình vẫn nói rõ trạng thái.
   */
  showStatusBadge?: boolean;
}

export const TransferInstructionsCard: React.FC<TransferInstructionsCardProps> = ({
  order,
  className = '',
  showStatusBadge = true,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const payment = order.payment;
  const snapshot = payment?.transferInstructions;
  const isCancelled = order.status === 'cancelled' || payment?.status === 'cancelled';
  const isPaid = payment?.isPaid === true || payment?.status === 'paid';
  const isCod = payment?.status === 'cod' || /cod/i.test(payment?.method || '');
  const paidAt = paidDateText(payment?.paidDate);
  // Số tiền: ưu tiên snapshot đã chốt cùng đơn; đơn COD không có snapshot dùng `payment.total`.
  const amount = snapshot?.amount ?? payment?.total ?? null;
  const transferContent = snapshot?.transferContent || order.orderNumber;

  const copyText = async (field: string, value: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* ignore: trình duyệt chặn clipboard — không báo "đã chép" giả, người dùng vẫn copy tay được */
    }
  };

  const badge = isCancelled
    ? { variant: 'danger' as const, label: 'ĐÃ HỦY' }
    : isPaid
    ? { variant: 'success' as const, label: 'ĐÃ THANH TOÁN' }
    : isCod
    ? { variant: 'info' as const, label: 'THU KHI GIAO (COD)' }
    : { variant: 'warning' as const, label: 'CHỜ THANH TOÁN' };

  return (
    <section
      aria-label="Hướng dẫn thanh toán"
      className={`space-y-3 rounded-lg border border-line bg-surface-muted p-4 text-left ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon name="payments" size={18} className="shrink-0 text-fg-muted" aria-hidden="true" />
          <span>Thanh toán</span>
        </p>
        {showStatusBadge && (
          <Badge variant={badge.variant} size="sm" dot className="font-mono">
            {badge.label}
          </Badge>
        )}
      </div>

      {isCancelled ? (
        <div className="rounded-md border border-danger/20 bg-danger-tint p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-danger">
            <Icon name="cancel" size={16} aria-hidden="true" />
            <span>Đơn đã hủy — không cần thanh toán</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
            Đơn {order.orderNumber} đã bị hủy nên không phát sinh khoản phải trả. Nếu bạn đã
            chuyển tiền, liên hệ VCUBE để được hỗ trợ đối soát.
          </p>
        </div>
      ) : isPaid ? (
        <div className="rounded-md border border-positive/20 bg-positive-tint p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-positive">
            <Icon name="check_circle" size={16} aria-hidden="true" />
            <span>Đã thanh toán</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
            {paidAt
              ? `Thời điểm ghi nhận: ${paidAt}.`
              : 'Chưa ghi nhận thời điểm thanh toán trên đơn.'}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-fg-muted">Số tiền</span>
            <Money value={amount} size="base" className="font-semibold text-fg" />
          </div>
        </div>
      ) : isCod ? (
        <div className="space-y-2 rounded-md border border-info/20 bg-info-tint p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-info">
            <Icon name="local_shipping" size={16} aria-hidden="true" />
            <span>Thanh toán khi nhận hàng (COD)</span>
          </p>
          <p className="text-xs leading-relaxed text-fg-muted">
            Bạn thanh toán cho đơn vị giao hàng khi nhận. Không cần chuyển khoản trước; VCUBE
            xác nhận đơn và xưởng bắt đầu in sau đó.
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-fg-muted">Số tiền thanh toán khi nhận hàng</span>
            <Money value={amount} size="base" className="font-semibold text-fg" />
          </div>
        </div>
      ) : snapshot?.configured && snapshot.bankName && snapshot.bankAccount ? (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-fg-muted">Ngân hàng</span>
            <strong className="text-fg">{snapshot.bankName}</strong>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-fg-muted">Số tài khoản</span>
            <span className="flex flex-wrap items-center gap-2">
              <strong className="font-mono text-fg tabular-nums">{snapshot.bankAccount}</strong>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copyText('account', snapshot.bankAccount)}
                leadingIcon={
                  <Icon
                    name={copiedField === 'account' ? 'check' : 'content_copy'}
                    size={14}
                    aria-hidden="true"
                  />
                }
              >
                {copiedField === 'account' ? 'Đã chép' : 'Sao chép'}
              </Button>
            </span>
          </div>
          {snapshot.accountHolder && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-fg-muted">Chủ tài khoản</span>
              <strong className="text-fg">{snapshot.accountHolder}</strong>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-fg-muted">Số tiền</span>
            <Money value={snapshot.amount} size="base" className="font-semibold text-fg" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-2">
            <span className="text-fg-muted">Nội dung chuyển khoản</span>
            <span className="flex flex-wrap items-center gap-2">
              <strong className="font-mono text-fg">{transferContent}</strong>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copyText('content', transferContent)}
                leadingIcon={
                  <Icon
                    name={copiedField === 'content' ? 'check' : 'content_copy'}
                    size={14}
                    aria-hidden="true"
                  />
                }
              >
                {copiedField === 'content' ? 'Đã chép' : 'Sao chép'}
              </Button>
            </span>
          </div>
          <p className="pt-1 text-xs leading-relaxed text-fg-muted">
            Đơn chỉ chuyển sang trạng thái ĐÃ THANH TOÁN sau khi VCUBE đối soát được khoản chuyển.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-warning/20 bg-warning-tint p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-warning">
            <Icon name="warning" size={16} aria-hidden="true" />
            <span>Đơn này chưa lưu thông tin nhận tiền</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
            Liên hệ VCUBE để được hướng dẫn chuyển khoản — không tự chuyển theo thông tin khác.
          </p>
        </div>
      )}
    </section>
  );
};
