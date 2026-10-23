/**
 * notificationProvider — adapter thông báo (FL-1: IN-APP).
 *
 * GIAI ĐOẠN NÀY: chỉ thông báo trong app (toast/badge/timeline ở UI). KHÔNG email/Zalo/SMS.
 *
 * TODO(FL-7): thêm implementation Email/Zalo/SMS provider; giữ interface + payload để
 * service chỉ đổi implementation. Không gọi mạng ngoài ở FL-1.
 */

export type NotificationEventType =
  | 'order_created'
  | 'payment_confirmed'
  | 'order_paid'
  | 'order_status_changed'
  | 'payout_marked_paid';

export interface NotificationEvent {
  type: NotificationEventType;
  orderId?: string;
  /** Người nhận (uuid) nếu biết; bỏ trống = thông báo chung cho admin. */
  recipientId?: string | null;
  title: string;
  body?: string;
  /** Dữ liệu thô để provider sau này render template/email. */
  data?: Record<string, unknown>;
  createdAtIso?: string;
}

export interface NotificationResult {
  ok: boolean;
  /** `logged` = đã ghi log in-app; `no_channel` = chưa có kênh ngoài (FL-7). */
  delivered: 'logged' | 'no_channel' | 'error';
  message?: string;
}

export interface NotificationProvider {
  readonly id: string;
  send(event: NotificationEvent): Promise<NotificationResult>;
}

export class InAppNotificationProvider implements NotificationProvider {
  readonly id = 'in_app';

  /**
   * FL-1 chưa có bảng notification/queue: ghi log có cấu trúc (dev/ops xem được) và trả
   * `delivered:'logged'`. UI tự hiện toast ngay tại hành động — provider này là chỗ nối
   * cho FL-6 (thông báo in-app có bảng riêng) và FL-7 (email/SMS).
   */
  async send(event: NotificationEvent): Promise<NotificationResult> {
    try {
      // eslint-disable-next-line no-console -- adapter thông báo: log có chủ đích, chưa có kênh gửi.
      console.info('[vcube:notify]', {
        type: event.type,
        orderId: event.orderId ?? null,
        recipientId: event.recipientId ?? null,
        title: event.title,
        at: event.createdAtIso ?? new Date().toISOString(),
      });
      return { ok: true, delivered: 'logged' };
    } catch (err: any) {
      return { ok: false, delivered: 'error', message: err?.message || 'Không ghi được thông báo in-app.' };
    }
  }
}

export const inAppNotificationProvider = new InAppNotificationProvider();
