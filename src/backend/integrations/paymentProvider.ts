/**
 * paymentProvider — adapter "cổng thanh toán" (FL-1 dùng THANH TOÁN THỦ CÔNG).
 *
 * GIAI ĐOẠN NÀY (plan v2): KHÔNG gateway bên thứ ba. Khách chuyển khoản/VietQR theo hướng dẫn;
 * ADMIN xác nhận "đã nhận tiền" trong order console → `payment_transactions` ghi
 * `payment_gateway='manual'` (hoặc `vietqr`) + `status='paid'`.
 *
 * TODO(FL-7): thay `ManualPaymentProvider` bằng implementation gateway thật (VNPay/MoMo/Stripe)
 * + webhook server-side (service_role) để ghi `payment_transactions`; giữ NGUYÊN interface
 * `PaymentProvider` + payload để UI/nghiệp vụ không phải sửa. Không gọi mạng ngoài ở FL-1.
 */

import type { Order } from '../../types';
import { dbService } from '../supabase/database';
import type { WriteResult } from '../lib/result';

/** Thông tin nhận tiền đọc từ `app_settings` (null = chưa cấu hình, KHÔNG bịa). */
export interface PaymentBankSettings {
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
}

/** Hướng dẫn chuyển khoản hiển thị cho khách ngay sau khi tạo đơn. */
export interface PaymentInstructions {
  /** `false` = `app_settings` chưa có thông tin nhận tiền ⇒ UI nói "chưa cấu hình". */
  configured: boolean;
  method: string;
  /** Số tiền phải chuyển — đọc từ đơn đã lưu, KHÔNG tính lại. */
  amount: number | null;
  /** Nội dung chuyển khoản = mã đơn (để VCUBE đối soát). */
  transferContent: string;
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
  /** Các dòng hướng dẫn đã soạn sẵn (VI). */
  lines: string[];
}

export interface ManualPaymentRecord {
  orderId: string;
  amount: number;
  method?: string;
  note?: string;
  actorId?: string;
  /** ISO-8601 thời điểm admin xác nhận. */
  paidAtIso?: string;
}

export interface PaymentProvider {
  readonly id: string;
  /** Soạn hướng dẫn thanh toán từ đơn + cấu hình ngân hàng (không gọi mạng). */
  buildInstructions(order: Order, bank: PaymentBankSettings): PaymentInstructions;
  /** Admin xác nhận đã nhận tiền → ghi `payment_transactions`. */
  recordManualPayment(record: ManualPaymentRecord): Promise<WriteResult>;
}

const trimmed = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
};

/** Dựng payload `payment_transactions` (tách hàm thuần để unit-test được). */
export function buildManualPaymentRow(record: ManualPaymentRecord): Record<string, unknown> {
  const method = (record.method ?? 'manual').trim() || 'manual';
  return {
    id: `pay_${record.orderId}`,
    order_id: record.orderId,
    // UNIQUE ⇒ idempotent: xác nhận 2 lần không tạo 2 giao dịch.
    transaction_id: `manual_${record.orderId}`,
    amount: record.amount,
    payment_gateway: method,
    payload: {
      source: 'manual_confirmation',
      note: record.note ?? null,
      actor_id: record.actorId ?? null,
      confirmed_at: record.paidAtIso ?? new Date().toISOString(),
      // TODO(FL-7): gateway/webhook sẽ ghi payload giao dịch thật (mã GD, ngân hàng, thời điểm).
    },
    status: 'paid',
  };
}

export class ManualPaymentProvider implements PaymentProvider {
  readonly id = 'manual';

  /** Soạn hướng dẫn chuyển khoản. Thiếu cấu hình ⇒ `configured=false`, KHÔNG bịa số TK. */
  buildInstructions(order: Order, bank: PaymentBankSettings): PaymentInstructions {
    const bankName = trimmed(bank.bankName);
    const bankAccount = trimmed(bank.bankAccount);
    const accountHolder = trimmed(bank.accountHolder);
    const configured = Boolean(bankName && bankAccount);
    const amount = typeof order.payment?.total === 'number' && Number.isFinite(order.payment.total)
      ? order.payment.total
      : null;
    const transferContent = order.orderNumber || order.id;
    const lines: string[] = [];

    if (!configured) {
      lines.push(
        'Chưa cấu hình thông tin nhận tiền (ngân hàng/số tài khoản) trong hệ thống. ' +
          'Vui lòng liên hệ VCUBE để nhận thông tin chuyển khoản chính xác — không tự chuyển theo số khác.'
      );
    } else {
      lines.push(`Ngân hàng: ${bankName}`);
      lines.push(`Số tài khoản: ${bankAccount}`);
      if (accountHolder) lines.push(`Chủ tài khoản: ${accountHolder}`);
      // Không dùng `toLocaleString` trần (gate check-ui-rules yêu cầu định dạng có guard);
      // `Intl.NumberFormat` với style currency cho đúng quy ước VND của repo.
      const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
      lines.push(`Số tiền: ${amount === null ? '—' : vnd.format(amount)}`);
      lines.push(`Nội dung chuyển khoản: ${transferContent}`);
      lines.push(
        'Đơn sẽ ở trạng thái CHỜ THANH TOÁN cho tới khi VCUBE đối soát được khoản chuyển; xưởng chỉ bắt đầu sau khi xác nhận.'
      );
    }

    return {
      configured,
      method: order.payment?.method || 'Chuyển khoản',
      amount,
      transferContent,
      bankName,
      bankAccount,
      accountHolder,
      lines,
    };
  }

  async recordManualPayment(record: ManualPaymentRecord): Promise<WriteResult> {
    return dbService.insertPaymentTransaction(buildManualPaymentRow(record));
  }
}

/** Singleton dùng ở tầng service/UI (FL-7 chỉ thay implementation, không đổi call site). */
export const manualPaymentProvider = new ManualPaymentProvider();
