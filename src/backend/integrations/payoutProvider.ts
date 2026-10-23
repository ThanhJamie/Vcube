/**
 * payoutProvider — adapter chi trả cho XƯỞNG IN / DESIGNER (FL-1 chỉ là skeleton).
 *
 * GIAI ĐOẠN NÀY: chi trả THỦ CÔNG — admin đánh dấu đã trả trên đơn
 * (`orders.workshop_payout_status` / `designer_payout_status` + `*_paid_at` / `*_paid_by`).
 * FL-1 chỉ đọc/ghi trạng thái mặc định 'unpaid'; màn quyết toán + mark-paid thuộc FL-4.
 *
 * TODO(FL-7): thay bằng payout API ngân hàng; giữ nguyên interface + trạng thái DB để
 * không phải migrate dữ liệu.
 */

export type PayoutParty = 'workshop' | 'designer';

export interface PayoutTarget {
  orderId: string;
  party: PayoutParty;
  /** Số tiền payout đã snapshot trên đơn; `null` = chưa tính được. */
  amount: number | null;
  /** ISO-8601 khi admin xác nhận đã chi; `null` = chưa chi. */
  paidAtIso?: string | null;
  paidBy?: string | null;
}

export interface PayoutResult {
  ok: boolean;
  /** `not_implemented` = FL-4 sẽ nối; KHÔNG giả vờ đã chi tiền. */
  reason?: 'not_implemented' | 'amount_unknown' | 'error';
  message?: string;
}

export interface PayoutProvider {
  readonly id: string;
  /** Đánh dấu đã chi (FL-4 dùng). FL-1 trả `not_implemented` thay vì báo thành công giả. */
  markPaid(target: PayoutTarget): Promise<PayoutResult>;
}

export class ManualPayoutProvider implements PayoutProvider {
  readonly id = 'manual';

  async markPaid(target: PayoutTarget): Promise<PayoutResult> {
    if (target.amount === null) {
      return {
        ok: false,
        reason: 'amount_unknown',
        message: 'Chưa có số payout trên đơn (thiếu cấu hình phí/hoa hồng) — không đánh dấu đã chi.',
      };
    }
    // FL-4 mới ghi `orders.*_payout_status|paid_at|paid_by` + audit. FL-1 KHÔNG thực hiện ghi
    // để tránh màn hình báo "đã chi" trong khi chưa có luồng quyết toán.
    return {
      ok: false,
      reason: 'not_implemented',
      message: 'Chi trả thủ công được nối ở FL-4 (payout & settlement).',
    };
  }
}

export const manualPayoutProvider = new ManualPayoutProvider();
