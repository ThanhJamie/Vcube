/**
 * orderGateway — RANH GIỚI DUY NHẤT giữa CheckoutView và tầng ghi đơn.
 *
 * Mục tiêu PR-3: chuyển việc tạo đơn từ chuỗi lời gọi client-side sang MỘT RPC
 * server-side atomic, nhưng không làm gãy luồng hiện tại khi chưa apply SQL.
 *
 *   * `LegacyOrderGateway` — bọc `OrderService.createOrder` (hành vi cũ, mặc định).
 *   * `RpcOrderGateway`    — gọi `public.create_order_atomic` / `confirm_payment_atomic`
 *                            (xem `scripts/sql/2026-11-09-order-atomic.sql`).
 *
 * BẬT/TẮT bằng biến môi trường `VITE_ATOMIC_ORDER === 'true'` (mặc định: legacy).
 * Khi flag BẬT và RPC lỗi, gateway NÉM lỗi thật — CheckoutView hiện lỗi và KHÔNG
 * fallback sang legacy (fallback âm thầm có thể tạo 2 đơn cho cùng một lần bấm).
 *
 * LUẬT TRUNG THỰC DỮ LIỆU:
 * - Không tự bịa id/token/mã đơn: lấy đúng giá trị RPC trả về.
 * - `user_id` KHÔNG gửi từ client — server suy từ `auth.uid()`.
 * - `order_items` chỉ gửi khi caller đã có `seller_type`/royalty THẬT
 *   (`options.orderItems`); Checkout hiện không có dữ liệu đó nên gửi `[]`.
 */
import type { Order } from '../../types';
import { supabase } from '../supabase/client';
import { OrderService } from './orderService';
import type { CreateOrderOptions } from './orderService';

/** Đơn nháp: `Order` không có id (server sinh) hoặc có id do caller đề xuất. */
export type OrderDraft = Omit<Order, 'id'> & { id?: string };

export interface CreateOrderGatewayOptions extends CreateOrderOptions {
  /**
   * Khoá idempotency cho MỘT lần đặt hàng. Retry phải dùng LẠI cùng khoá để
   * server trả về đơn đã tạo thay vì tạo đơn thứ hai. Bỏ trống ⇒ RPC sinh khoá
   * tạm (không retry an toàn được) — CheckoutView luôn truyền khoá.
   */
  idempotencyKey?: string;
  /**
   * Dòng `order_items` (snake_case) khi caller đã biết `seller_type`/royalty.
   * Bỏ trống/rỗng ⇒ không ghi dòng tiền (admin sẽ chốt khi xác nhận thanh toán).
   */
  orderItems?: Record<string, unknown>[];
}

export interface ConfirmPaymentGatewayInput {
  orderId: string;
  /** Mã giao dịch/đối soát — dùng làm `payment_transactions.transaction_id` (idempotent). */
  ref?: string;
  /** Chỉ dùng ở legacy gateway (số tiền admin nhập tay). */
  amount?: number;
  method?: string;
  note?: string;
  actorId?: string;
}

export interface ConfirmPaymentGatewayResult {
  /** `true` = đơn đã ở trạng thái paid từ trước, không ghi thêm giao dịch. */
  alreadyPaid: boolean;
  paymentTransactionId: string | null;
  /** Số file số đã cấp trong lần gọi này (0 nếu không có dòng digital). */
  finalizedFiles: number;
}

export interface OrderGateway {
  createOrder(order: OrderDraft, options?: CreateOrderGatewayOptions): Promise<Order>;
  confirmPayment(input: ConfirmPaymentGatewayInput): Promise<ConfirmPaymentGatewayResult>;
}

/** Lỗi RPC có mã Postgres (ví dụ `42501`) để UI/log phân biệt thiếu quyền với lỗi mạng. */
export class OrderGatewayError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = 'OrderGatewayError';
    this.code = code;
  }
}

/** Đọc feature flag. `import.meta.env` không có type sẵn (repo không cài `vite/client`). */
export function isAtomicOrderEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  return env?.VITE_ATOMIC_ORDER === 'true';
}

/** Gateway đang bật theo feature flag — mặc định legacy. */
export function getOrderGateway(): OrderGateway {
  return isAtomicOrderEnabled() ? new RpcOrderGateway() : new LegacyOrderGateway();
}

// ===========================================================================
// Legacy — hành vi y nguyên trước PR-3 (nhiều bước client-side trong OrderService)
// ===========================================================================
export class LegacyOrderGateway implements OrderGateway {
  async createOrder(order: OrderDraft, options: CreateOrderGatewayOptions = {}): Promise<Order> {
    const legacyOptions: CreateOrderOptions = {
      userId: options.userId,
      createdAtIso: options.createdAtIso,
      assignedWorkshopId: options.assignedWorkshopId,
    };
    // `idempotencyKey`/`orderItems` không được legacy hỗ trợ — cố ý bỏ qua,
    // KHÔNG giả vờ đã idempotent.
    return OrderService.createOrder(order, legacyOptions);
  }

  async confirmPayment(input: ConfirmPaymentGatewayInput): Promise<ConfirmPaymentGatewayResult> {
    const result = await OrderService.confirmManualPayment(input.orderId, {
      amount: input.amount,
      method: input.method,
      note: input.note,
      actorId: input.actorId,
    });

    if (result.status === 'failed') {
      throw new OrderGatewayError(
        result.error || 'Không xác nhận được thanh toán cho đơn hàng.',
        null,
      );
    }

    return {
      alreadyPaid: result.status === 'already_confirmed',
      paymentTransactionId: result.payments[0]?.id ?? null,
      finalizedFiles: result.files.length,
    };
  }
}

// ===========================================================================
// Atomic — gọi RPC SECURITY DEFINER trên server
// ===========================================================================
interface CreateOrderRpcRow {
  order_id?: unknown;
  order_number?: unknown;
  secure_access_token?: unknown;
}

interface ConfirmPaymentRpcRow {
  already_paid?: unknown;
  payment_transaction_id?: unknown;
  finalized_files?: unknown;
}

function rpcErrorMessage(context: string, error: unknown): OrderGatewayError {
  const err = error as { message?: unknown; code?: unknown } | null | undefined;
  const message =
    typeof err?.message === 'string' && err.message.trim()
      ? err.message
      : 'Lỗi không xác định từ máy chủ.';
  const code = typeof err?.code === 'string' ? err.code : null;
  return new OrderGatewayError(`${context}: ${message}`, code);
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (data && typeof data === 'object') return data as T;
  return null;
}

/** Sinh khoá idempotency dự phòng (chỉ dùng khi caller không truyền). */
function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** `Order` (camelCase) → payload snake_case ĐÚNG whitelist của RPC. */
function buildOrderPayload(
  order: OrderDraft,
  options: CreateOrderGatewayOptions,
): Record<string, unknown> {
  return {
    id: order.id ?? null,
    order_number: order.orderNumber,
    // CHỈ ISO-8601 được ghi vào `orders.date` (timestamptz). Không bao giờ gửi
    // `order.date` vì đó là chuỗi hiển thị ("13/9/2026 14:05") ⇒ Postgres 22008.
    date: options.createdAtIso ?? new Date().toISOString(),
    estimated_delivery: order.estimatedDelivery,
    customer_email: order.shippingAddress?.email ?? '',
    customer_name: order.shippingAddress?.fullName ?? '',
    customer_phone: order.shippingAddress?.phone ?? '',
    customer_type: order.customerType ?? (options.userId ? 'registered' : 'guest'),
    total_amount: order.payment?.total ?? 0,
    shipping_fee: order.payment?.shippingFee ?? 0,
    payment_method: order.payment?.method ?? '',
    payment_status: order.payment?.status ?? 'awaiting_payment',
    items: order.items,
    shipping_address: order.shippingAddress,
    carrier: order.carrier,
    payment: order.payment,
    assigned_workshop_id: options.assignedWorkshopId ?? order.assignedWorkshopId ?? null,
    // KHÔNG gửi: user_id (server suy từ auth.uid), secure_access_token (server sinh),
    // status/status_stage_index (server ép pending_payment/0).
  };
}

export class RpcOrderGateway implements OrderGateway {
  async createOrder(order: OrderDraft, options: CreateOrderGatewayOptions = {}): Promise<Order> {
    const idempotencyKey = options.idempotencyKey?.trim() || makeIdempotencyKey();

    const { data, error } = await supabase.rpc('create_order_atomic', {
      p_order: buildOrderPayload(order, options),
      p_items: options.orderItems ?? [],
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      throw rpcErrorMessage('Không tạo được đơn hàng trên máy chủ', error);
    }

    const row = firstRow<CreateOrderRpcRow>(data);
    const orderId = typeof row?.order_id === 'string' ? row.order_id : '';
    const token = typeof row?.secure_access_token === 'string' ? row.secure_access_token : '';
    if (!orderId || !token) {
      // RPC trả về nhưng thiếu dữ liệu tối thiểu ⇒ KHÔNG được coi là thành công.
      throw new OrderGatewayError(
        'Máy chủ trả về đơn hàng thiếu mã đơn hoặc mã truy cập — không thể xác nhận đã tạo đơn.',
        null,
      );
    }

    return {
      ...order,
      id: orderId,
      orderNumber:
        typeof row?.order_number === 'string' && row.order_number
          ? row.order_number
          : order.orderNumber,
      secureAccessToken: token,
    };
  }

  async confirmPayment(input: ConfirmPaymentGatewayInput): Promise<ConfirmPaymentGatewayResult> {
    const orderId = input.orderId?.trim();
    if (!orderId) {
      throw new OrderGatewayError('Thiếu mã đơn hàng để xác nhận thanh toán.', '22023');
    }

    const { data, error } = await supabase.rpc('confirm_payment_atomic', {
      p_order_id: orderId,
      p_ref: input.ref?.trim() || null,
    });

    if (error) {
      throw rpcErrorMessage('Không xác nhận được thanh toán trên máy chủ', error);
    }

    const row = firstRow<ConfirmPaymentRpcRow>(data);
    if (!row) {
      throw new OrderGatewayError(
        'Máy chủ không trả về kết quả xác nhận thanh toán.',
        null,
      );
    }

    const files = Number(row.finalized_files);

    return {
      alreadyPaid: row.already_paid === true,
      paymentTransactionId:
        typeof row.payment_transaction_id === 'string' ? row.payment_transaction_id : null,
      finalizedFiles: Number.isFinite(files) ? files : 0,
    };
  }
}
