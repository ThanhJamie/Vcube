/**
 * AdminOrderDetailPanel — màn CHI TIẾT ĐƠN cho admin (FL-1).
 *
 * Vai trò:
 * - Đọc đơn + `order_items` + `payment_transactions` + `order_files` từ DB (`OrderService.getOrderDetail`).
 * - Hiển thị: items, snapshot tiền §3b (trước/sau khi chốt), giao dịch thanh toán, file số, timeline trạng thái.
 * - Nút **"Xác nhận đã nhận tiền"** → `OrderService.confirmManualPayment` (thủ công; không gateway).
 *
 * LUẬT TRUNG THỰC: trường `null` = CHƯA CHỐT/CHƯA CẤU HÌNH ⇒ render `—`/nhãn "chưa cấu hình".
 * Không hiển thị số 0 thay cho "chưa biết"; không tự coi là đã thanh toán khi DB chưa ghi.
 *
 * Component là NỘI DUNG (không tự bọc `<Modal>`) để nhúng vào modal chi tiết đơn sẵn có của
 * Group5ProductionPanel — không tạo route mới, không đổi layout/màn cũ.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { Order } from '@/types';
import type { OrderDetailResult } from '@/types/orderRecords';
import { OrderService } from '../../../../backend/services/orderService';
import { useAuth } from '@frontend/context/AuthContext';
import { Badge, Button, Field, Icon, Input, Money, Select, Skeleton } from '@frontend/ui';
import { EMPTY_VALUE, formatCurrency, formatDateTime } from '../../../lib/format';

interface AdminOrderDetailPanelProps {
  orderId: string;
  onShowToast?: (message: string) => void;
  /** Gọi sau khi xác nhận thành công để panel cha tải lại danh sách đơn. */
  onConfirmed?: (order: Order) => void;
}

const moneyOrDash = (v: number | null | undefined): React.ReactNode =>
  typeof v === 'number' && Number.isFinite(v) ? <Money value={v} size="base" className="text-fg" /> : EMPTY_VALUE;

const percentOrDash = (v: number | null | undefined): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${v}%` : EMPTY_VALUE;

const dateOrDash = (v: string | null | undefined): string => {
  if (!v) return EMPTY_VALUE;
  const formatted = formatDateTime(v);
  return formatted === EMPTY_VALUE ? v : formatted;
};

export const AdminOrderDetailPanel: React.FC<AdminOrderDetailPanelProps> = ({
  orderId,
  onShowToast,
  onConfirmed,
}) => {
  const { user } = useAuth();
  const [detail, setDetail] = useState<OrderDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [method, setMethod] = useState('vietqr_manual');
  const [note, setNote] = useState('');
  const [resultNote, setResultNote] = useState<string | null>(null);
  const [resultMissing, setResultMissing] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await OrderService.getOrderDetail(orderId);
      setDetail(res);
      setAmountInput(String(res.order.payment?.total ?? ''));
    } catch (err: any) {
      setDetail(null);
      setLoadError(err?.message || 'Không đọc được chi tiết đơn từ DB.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirmPayment = async () => {
    if (!detail) return;
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      onShowToast?.('Số tiền xác nhận không hợp lệ — nhập số tiền thực nhận lớn hơn 0.');
      return;
    }
    setSubmitting(true);
    setResultNote(null);
    try {
      const res = await OrderService.confirmManualPayment(orderId, {
        amount,
        method,
        note: note.trim() || undefined,
        actorId: user?.id,
      });
      setResultMissing(res.missingConfig);
      if (res.status === 'confirmed') {
        setResultNote('Đã xác nhận thanh toán: đã ghi dòng tiền, giao dịch và cập nhật đơn sang PAID.');
        onShowToast?.('Đã xác nhận thanh toán — đơn chuyển sang ĐÃ THANH TOÁN.');
        setConfirming(false);
        onConfirmed?.(res.order);
        await load();
      } else if (res.status === 'already_confirmed') {
        setResultNote('Đơn này đã được xác nhận thanh toán trước đó — không ghi thêm giao dịch.');
        setConfirming(false);
        await load();
      } else {
        setResultNote(`Không xác nhận được: ${res.error ?? 'lỗi không xác định'}`);
        onShowToast?.('Xác nhận thanh toán thất bại — xem chi tiết trong panel.');
      }
    } catch (err: any) {
      setResultNote(`Không xác nhận được: ${err?.message || 'lỗi không xác định'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="space-y-3" role="status" aria-label="Đang tải chi tiết đơn">
        <Skeleton variant="text" width="16rem" />
        <Skeleton variant="rect" height="7rem" rounded="lg" className="w-full" />
        <Skeleton variant="rect" height="9rem" rounded="lg" className="w-full" />
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="rounded-lg border border-danger/20 bg-danger-tint p-4 text-xs text-danger space-y-2" role="alert">
        <p className="flex items-center gap-1.5 font-semibold">
          <Icon name="error" size={16} aria-hidden="true" />
          Không đọc được chi tiết đơn
        </p>
        <p className="leading-relaxed">{loadError ?? 'Không tìm thấy đơn hàng.'}</p>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Thử lại
        </Button>
      </div>
    );
  }

  const { order } = detail;
  const isPaid = order.payment?.isPaid === true || order.payment?.status === 'paid';
  const money = order.money;
  const hasSnapshot =
    money != null &&
    (money.subtotalAmount !== null ||
      money.platformFeeAmount !== null ||
      money.workshopPayoutAmount !== null ||
      money.designerPayoutAmount !== null);
  const missing: string[] = [];
  if (!isPaid) missing.push('Đơn CHƯA được xác nhận thanh toán.');

  return (
    <div className="space-y-5 text-xs">
      {/* Trạng thái + nút xác nhận */}
      <div className="rounded-lg border border-line bg-surface-muted p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isPaid ? 'success' : 'warning'} dot>
              {isPaid ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN'}
            </Badge>
            <Badge variant="neutral">{order.status}</Badge>
            <span className="text-xs text-fg-muted">
              Tổng đơn: <Money value={order.payment?.total} size="base" className="font-semibold text-fg" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void load()} loading={loading} loadingLabel="Đang tải…">
              Làm mới
            </Button>
            {!isPaid && !confirming && (
              <Button variant="primary" size="sm" onClick={() => setConfirming(true)} leadingIcon={<Icon name="payments" size={14} />}>
                Xác nhận đã nhận tiền
              </Button>
            )}
          </div>
        </div>

        {isPaid && (
          <p className="text-xs text-fg-muted">
            Đã xác nhận lúc <strong className="font-mono text-fg">{dateOrDash(order.payment?.paidDate)}</strong>
            {detail.paymentTransactions.length > 0 && (
              <>
                {' '}
                • Giao dịch: <strong className="font-mono text-fg">{detail.paymentTransactions[0].transactionId}</strong>
              </>
            )}
          </p>
        )}

        {confirming && !isPaid && (
          <div className="space-y-3 rounded-md border border-line bg-surface p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Số tiền thực nhận (đ)" required>
                {(control) => (
                  <Input
                    {...control}
                    numeric
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="Số tiền đã nhận"
                  />
                )}
              </Field>
              <Field label="Phương thức">
                {(control) => (
                  <Select {...control} value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="vietqr_manual">VietQR / chuyển khoản (thủ công)</option>
                    <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                    <option value="cod">COD — thu khi giao</option>
                  </Select>
                )}
              </Field>
              <Field label="Ghi chú đối soát" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Mã giao dịch ngân hàng / người xác nhận…"
                  />
                )}
              </Field>
            </div>
            <p className="text-xs leading-relaxed text-fg-muted">
              Thao tác này ghi <strong>order_items</strong>, <strong>payment_transactions</strong> (status=paid),
              <strong> order_files</strong> cho file số có thật, rồi cập nhật snapshot tiền trên <strong>orders</strong>.
              Không atomic ở client — nếu bước sau lỗi, hệ thống tự hoàn tác các bước trước (chi tiết server-side ở FL-7).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="md" loading={submitting} loadingLabel="Đang ghi nhận…" onClick={() => void handleConfirmPayment()}>
                Xác nhận đã nhận tiền
              </Button>
              <Button variant="secondary" size="md" onClick={() => setConfirming(false)} disabled={submitting}>
                Huỷ
              </Button>
            </div>
          </div>
        )}

        {resultNote && (
          <p
            className={`rounded-md px-3 py-2 text-xs ${
              resultNote.startsWith('Đã') || resultNote.startsWith('Đơn này')
                ? 'border border-positive/20 bg-positive-tint text-positive'
                : 'border border-danger/20 bg-danger-tint text-danger'
            }`}
            role="status"
          >
            {resultNote}
          </p>
        )}
        {resultMissing.length > 0 && (
          <div className="rounded-md border border-warning/20 bg-warning-tint px-3 py-2 text-xs text-fg-muted">
            <p className="font-semibold text-warning">Một số khoản chưa tính được (thiếu cấu hình — không bịa số):</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {resultMissing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Snapshot tiền §3b */}
      <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider text-fg-muted">Snapshot tiền (orders §3b)</span>
          {!hasSnapshot && <span className="text-xs text-fg-muted">Chưa chốt — xác nhận thanh toán để tính</span>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <div className="text-xs text-fg-muted">Tiền hàng (trước thuế)</div>
            <div className="font-mono font-semibold tabular-nums">{moneyOrDash(money?.subtotalAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-fg-muted">VAT ({percentOrDash(money?.vatPercentSnapshot)})</div>
            <div className="font-mono font-semibold tabular-nums">{moneyOrDash(money?.vatAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-fg-muted">Phí nền tảng ({percentOrDash(money?.platformFeePercentSnapshot)})</div>
            <div className="font-mono font-semibold tabular-nums">{moneyOrDash(money?.platformFeeAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-fg-muted">Phí cố định</div>
            <div className="font-mono font-semibold tabular-nums">{moneyOrDash(money?.platformFixedFeeSnapshot)}</div>
          </div>
          <div>
            <div className="text-xs text-fg-muted">Payout xưởng</div>
            <div className="font-mono font-semibold tabular-nums">{moneyOrDash(money?.workshopPayoutAmount)}</div>
            <div className="text-xs text-fg-muted">Trạng thái: {money?.workshopPayoutStatus ?? EMPTY_VALUE}</div>
          </div>
          <div>
            <div className="text-xs text-fg-muted">Payout designer</div>
            <div className="font-mono font-semibold tabular-nums">{moneyOrDash(money?.designerPayoutAmount)}</div>
            <div className="text-xs text-fg-muted">Trạng thái: {money?.designerPayoutStatus ?? EMPTY_VALUE}</div>
          </div>
        </div>
        {money?.platformFeePercentSnapshot === null && money?.platformFeeAmount !== null && (
          <p className="text-xs text-fg-muted">
            Đơn trộn nhiều tỉ lệ phí ⇒ % cấp đơn để trống (số tiền là tổng đúng theo từng dòng bên dưới).
          </p>
        )}
      </div>

      {/* Dòng tiền order_items */}
      <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider text-fg-muted">Dòng tiền (order_items)</span>
          <span className="text-xs text-fg-muted">{detail.items.length} dòng · nguồn: {detail.sources.items}</span>
        </div>
        {detail.items.length === 0 ? (
          <p className="text-xs text-fg-muted">
            Chưa có dòng tiền nào được ghi. {detail.warnings[0] ?? 'Bấm “Xác nhận đã nhận tiền” để chốt sau khi đối soát.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-fg-muted">
                <tr>
                  <th className="py-1 pr-2 font-semibold">Sản phẩm</th>
                  <th className="py-1 pr-2 font-semibold">Loại</th>
                  <th className="py-1 pr-2 text-right font-semibold">SL</th>
                  <th className="py-1 pr-2 text-right font-semibold">Đơn giá</th>
                  <th className="py-1 pr-2 text-right font-semibold">Thành tiền</th>
                  <th className="py-1 pr-2 text-right font-semibold">Phí nền tảng</th>
                  <th className="py-1 pr-2 text-right font-semibold">Payout xưởng</th>
                  <th className="py-1 text-right font-semibold">Royalty</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id} className="border-t border-line-subtle">
                    <td className="py-1.5 pr-2 font-mono text-fg">{it.productId}</td>
                    <td className="py-1.5 pr-2 text-fg-muted">
                      {it.fulfillment === 'digital' ? 'File số' : 'In 3D'} · {it.sellerType}
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{it.quantity}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-fg">{formatCurrency(it.lineTotal)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{moneyOrDash(it.platformFeeAmount)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{moneyOrDash(it.workshopPayoutAmount)}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{moneyOrDash(it.designerPayoutAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Giao dịch + file + timeline */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
          <div className="font-semibold uppercase tracking-wider text-fg-muted">Giao dịch thanh toán</div>
          {detail.paymentTransactions.length === 0 ? (
            <p className="text-xs text-fg-muted">Chưa có giao dịch nào (nguồn: {detail.sources.payments}).</p>
          ) : (
            detail.paymentTransactions.map((tx) => (
              <div key={tx.id} className="rounded-md border border-line-subtle bg-surface-muted p-2 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-fg">{tx.transactionId}</span>
                  <Badge variant={tx.status === 'paid' ? 'success' : 'neutral'} size="sm">
                    {tx.status || EMPTY_VALUE}
                  </Badge>
                </div>
                <div className="text-xs text-fg-muted">
                  {formatCurrency(tx.amount)} · {tx.paymentGateway || EMPTY_VALUE} · {dateOrDash(tx.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
          <div className="font-semibold uppercase tracking-wider text-fg-muted">File số đã giao</div>
          {detail.files.length === 0 ? (
            <p className="text-xs text-fg-muted">Chưa có file nào (nguồn: {detail.sources.files}).</p>
          ) : (
            detail.files.map((f) => (
              <div key={f.id} className="rounded-md border border-line-subtle bg-surface-muted p-2 text-xs">
                <div className="font-mono text-fg">{f.productId ?? EMPTY_VALUE}</div>
                <div className="text-fg-muted">Giấy phép: {f.license || EMPTY_VALUE}</div>
                {/* KHÔNG in storage_path: chỉ hiển thị sự tồn tại + license. */}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Timeline tối thiểu từ dữ liệu đã có */}
      <div className="rounded-lg border border-line bg-surface p-4 space-y-1">
        <div className="font-semibold uppercase tracking-wider text-fg-muted">Timeline</div>
        <p className="text-xs text-fg-muted">
          Tạo đơn: <strong className="font-mono text-fg">{dateOrDash(order.date)}</strong>
        </p>
        <p className="text-xs text-fg-muted">
          Thanh toán: <strong className="font-mono text-fg">{order.payment?.paidDate ? dateOrDash(order.payment.paidDate) : EMPTY_VALUE}</strong>
        </p>
        <p className="text-xs text-fg-muted">
          Trạng thái hiện tại: <strong className="text-fg">{order.status}</strong> · nấc{' '}
          <strong className="font-mono text-fg">{order.statusStageIndex ?? EMPTY_VALUE}</strong>
        </p>
      </div>

      {detail.warnings.length > 0 && (
        <div className="rounded-md border border-warning/20 bg-warning-tint p-3 text-xs text-fg-muted space-y-1">
          <p className="font-semibold text-warning">Ghi chú dữ liệu (RLS/nguồn):</p>
          {detail.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
};
