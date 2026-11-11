import type { Order } from '@/types';

/**
 * G2 — Quy tắc trạng thái/thanh toán dùng chung cho Xưởng in.
 *
 * GIẢ ĐỊNH TẠM (PO chưa chốt cuối):
 *  - COD (`payment.status === 'cod'`) được bắt đầu sản xuất trước khi thu tiền.
 *  - Chuyển khoản/VietQR (`awaiting_payment`/`unpaid`) PHẢI `paid` trước khi nhận/print.
 *  - Không cho lùi nấc đã giao/hoàn tất/hủy.
 *  - Chỉ tiến một nấc/lần; `completed` là trạng thái terminal riêng.
 *
 * Hàm thuần, không đọc DB; dùng cho lab lẫn admin để tránh hai bộ guard lệch nhau.
 */
export type PaymentSource = {
  paymentStatus?: string | null;
  isPaid?: boolean;
  payment?: { status?: string | null; isPaid?: boolean } | null;
};

const paymentStatusOf = (order: PaymentSource): string | null =>
  order.paymentStatus ?? order.payment?.status ?? null;

export const isCodPayment = (order: PaymentSource): boolean =>
  paymentStatusOf(order) === 'cod';

export const isPaidPayment = (order: PaymentSource): boolean =>
  order.isPaid === true || order.payment?.isPaid === true || paymentStatusOf(order) === 'paid';

/** VietQR cần paid; COD được phép bắt đầu trước khi thu. */
export const canStartProduction = (order: PaymentSource): boolean =>
  isCodPayment(order) || isPaidPayment(order);

export const isTerminalOrderStatus = (status: string | null | undefined): boolean =>
  status === 'completed' || status === 'cancelled';

/** Nhận việc: chỉ khi đã đủ điều kiện thanh toán, chưa terminal, nấc 0/1. */
export const canAcceptJob = (
  order: PaymentSource & { status?: string | null },
  stageIndex: number | null
): boolean =>
  !isTerminalOrderStatus(order.status ?? null) &&
  canStartProduction(order) &&
  stageIndex !== null &&
  stageIndex >= 0 &&
  stageIndex <= 1;

/** Chỉ cho tiến đúng một nấc, không nhảy/lùi. */
export const canAdvanceTo = (current: number | null, next: number): boolean =>
  current !== null && next === current + 1 && next >= 0 && next <= 7;

/** Đánh dấu đã giao chỉ từ nấc cuối (7) và trạng thái đang giao. */
export const canMarkDelivered = (stageIndex: number | null, status: string | null): boolean =>
  stageIndex === 7 && status === 'shipping';

/** Lùi nấc chỉ trước khi đang giao/terminal. */
export const canRollback = (stageIndex: number | null, status: string | null): boolean =>
  stageIndex !== null && stageIndex > 0 && !isTerminalOrderStatus(status) && status !== 'shipping';

/** Nhãn hành động kế tiếp cho UI lab (không tự ghi DB). */
export type ProgressOrder = PaymentSource & {
  statusStageIndex: number | null;
  status?: string | null;
};

export function nextLabAction(order: ProgressOrder): { label: string; stage: number } | null {
  const stage = order.statusStageIndex ?? 0;
  if (isTerminalOrderStatus(order.status) || stage >= 7) return null;
  if (!canStartProduction(order)) return null;
  if (stage <= 1) return { label: 'Nhận việc', stage: 1 };
  return { label: `Chuyển nấc ${stage + 2}/8`, stage: stage + 1 };
}

export type { Order };
