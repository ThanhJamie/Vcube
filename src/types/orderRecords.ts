/**
 * FL-1 — kiểu dữ liệu cho dòng tiền / thanh toán / file của đơn.
 *
 * Tách khỏi `src/types/index.ts` để giảm khả năng xung đột khi nhiều workstream cùng sửa
 * file "types tổng"; `Order.money` chỉ import type từ đây.
 *
 * LUẬT TRUNG THỰC DỮ LIỆU (`docs/design/data-honesty.md`): mọi trường số tiền/tỉ lệ ở đây là
 * `number | null` — `null` = CHƯA CHỐT / CHƯA CẤU HÌNH, KHÁC HẲN `0`. UI phải render `—`
 * hoặc "chưa cấu hình" cho `null`, không được bịa 0.
 */

/** Snapshot tiền cấp ĐƠN (các cột §3b trên bảng `orders`). */
export interface OrderMoneySnapshot {
  /** Tiền hàng TRƯỚC thuế, KHÔNG gồm shipping. `null` = chưa chốt. */
  subtotalAmount: number | null;
  vatPercentSnapshot: number | null;
  vatAmount: number | null;
  /** Phí nền tảng (%). Nhiều dòng khác tỉ lệ ⇒ `null` ở cấp đơn (cấp dòng mới chính xác). */
  platformFeePercentSnapshot: number | null;
  platformFixedFeeSnapshot: number | null;
  /** = sum(order_items.platform_fee_amount) khi mọi dòng tính được, ngược lại `null`. */
  platformFeeAmount: number | null;
  /** = tổng payout dòng in + shipping khi tính được; đơn thuần file số ⇒ `null`. */
  workshopPayoutAmount: number | null;
  /** = tổng royalty dòng số khi tính được; đơn không có file số ⇒ `null`. */
  designerPayoutAmount: number | null;
  workshopPayoutStatus: PayoutStatus | null;
  designerPayoutStatus: PayoutStatus | null;
}

export type PayoutStatus = 'unpaid' | 'paid' | 'partial';

/** Một dòng tiền của đơn (`order_items`). */
export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  sellerType: 'platform' | 'designer';
  fulfillment: 'print' | 'digital';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  workshopId: string | null;
  designerId: string | null;
  workshopCommissionPercentSnapshot: number | null;
  royaltyPercentSnapshot: number | null;
  workshopPayoutAmount: number | null;
  designerPayoutAmount: number | null;
  platformFeeAmount: number | null;
}

/** Một giao dịch thanh toán (`payment_transactions`). */
export interface PaymentTransactionRecord {
  id: string;
  orderId: string | null;
  transactionId: string;
  amount: number;
  paymentGateway: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string | null;
}

/** Một file số giao cho đơn (`order_files`). */
export interface OrderFileRecord {
  id: string;
  orderId: string;
  productId: string | null;
  storagePath: string;
  license: string;
  createdAt: string | null;
}

/**
 * Kết quả `OrderService.getOrderDetail` — đọc từ DB (bền qua F5).
 *
 * `sources` nói RÕ nguồn từng phần để UI không bịa: guest không có quyền đọc
 * `order_items`/`payment_transactions`/`order_files` (RLS) nên các mảng đó rỗng và nguồn
 * ghi `unavailable_rls`, KHÔNG phải "đơn không có hàng".
 */
export interface OrderDetailResult {
  order: import('./index').Order;
  items: OrderItemRecord[];
  paymentTransactions: PaymentTransactionRecord[];
  files: OrderFileRecord[];
  sources: {
    order: 'orders_table' | 'guest_token';
    items: 'order_items' | 'orders_json_snapshot' | 'unavailable_rls' | 'not_found';
    payments: 'payment_transactions' | 'unavailable_rls' | 'not_found';
    files: 'order_files' | 'unavailable_rls' | 'not_found';
  };
  /** Lý do phần nào chưa có dữ liệu (hiển thị trung thực cho admin/khách). */
  warnings: string[];
}

/** Kết quả từng bước của `confirmManualPayment` (client-side, không atomic — FL-7 làm server-side). */
export interface ConfirmManualPaymentStep {
  step:
    | 'load_order'
    | 'already_confirmed'
    | 'compute_money'
    | 'insert_order_items'
    | 'insert_payment_transaction'
    | 'insert_order_files'
    | 'update_order'
    | 'compensate';
  ok: boolean;
  detail?: string;
}

export interface ConfirmManualPaymentInput {
  /** Số tiền thực nhận; bỏ trống ⇒ dùng `orders.total_amount` đã ghi. */
  amount?: number;
  /** `vietqr`/`bank_transfer`/`cod`… ghi vào `payment_transactions.payment_gateway`. */
  method?: string;
  note?: string;
  /** `auth.uid()` của admin thực hiện (ghi vào payload để audit). */
  actorId?: string;
}

export interface ConfirmManualPaymentResult {
  status: 'confirmed' | 'already_confirmed' | 'failed';
  order: import('./index').Order;
  items: OrderItemRecord[];
  payments: PaymentTransactionRecord[];
  files: OrderFileRecord[];
  steps: ConfirmManualPaymentStep[];
  /** Các phần chưa tính được vì thiếu cấu hình (hiển thị cho admin, không bịa số). */
  missingConfig: string[];
  error?: string;
}
