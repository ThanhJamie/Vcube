/**
 * deliveryService — cổng CLIENT cho luồng giao file CAD sau khi mua (migration #14).
 *
 * DB đã có (SECURITY DEFINER, xem `scripts/sql/2026-11-09-digital-delivery.sql`):
 *   * `finalize_digital_delivery(p_order_id, p_token default null)` — cấp `order_files` khi
 *     đơn đã `paid` hoặc admin đã ghi `order_items.fulfillment = 'digital'`; idempotent;
 *     trả 0 dòng khi đơn CHƯA đủ điều kiện (không phải lỗi).
 *   * `get_my_order_files(p_order_id default null)` — đọc file của chính người gọi, kèm
 *     metadata từ `digital_assets` mà buyer không đọc trực tiếp được (RLS).
 *
 * LUẬT TRUNG THỰC DỮ LIỆU:
 * - RPC lỗi ⇒ NÉM lỗi thật (kèm `code` Postgres, ví dụ `42501` = không có quyền) để UI nói
 *   đúng trạng thái, KHÔNG nuốt lỗi và KHÔNG giả "đã cấp tệp".
 * - Trường DB không trả ⇒ giữ `null`/chuỗi rỗng; service không tự đoán tên, giấy phép, định dạng.
 */
import { supabase } from '../supabase/client';

/** Một dòng file CAD đã cấp cho đơn (đã map camelCase từ RPC). */
export interface OrderFileDelivery {
  id: string;
  orderId: string;
  productId: string | null;
  /** Tên sản phẩm từ `products.name`; `null` = sản phẩm không còn/không đọc được. */
  productName: string | null;
  /** Đường dẫn object trong bucket `cad-files`; `null`/rỗng = chưa có vị trí tệp thật. */
  storagePath: string | null;
  license: string | null;
  /** `digital_assets.file_format` (đã coalesce `''`); `''` = chưa khai. */
  fileFormat: string;
  fileSizeBytes: number | null;
  watermarkRequired: boolean;
  /** Chỉ `get_my_order_files` trả cột này; `null` = không giới hạn/chưa khai. */
  downloadLimit: number | null;
  createdAt: string | null;
}

/** Lỗi RPC có mã Postgres — UI có thể phân biệt `42501` (thiếu quyền) với lỗi mạng. */
export class DeliveryRpcError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null) {
    super(message);
    this.name = 'DeliveryRpcError';
    this.code = code;
  }
}

const asStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Row RPC (snake_case) → type nội bộ. Chỉ lấy đúng cột RPC khai báo, không chế thêm field.
 * Dòng thiếu `id` (không thể dùng làm khoá) bị bỏ qua thay vì bịa id.
 */
function mapDeliveryRow(row: Record<string, unknown>): OrderFileDelivery | null {
  const id = asStringOrNull(row.id);
  const orderId = asStringOrNull(row.order_id);
  if (!id || !orderId) return null;

  return {
    id,
    orderId,
    productId: asStringOrNull(row.product_id),
    productName: asStringOrNull(row.product_name),
    storagePath: asStringOrNull(row.storage_path),
    license: asStringOrNull(row.license),
    fileFormat: asStringOrNull(row.file_format) ?? '',
    fileSizeBytes: asNumberOrNull(row.file_size_bytes),
    watermarkRequired: row.watermark_required === true,
    downloadLimit: asNumberOrNull(row.download_limit),
    createdAt: asStringOrNull(row.created_at),
  };
}

function toDeliveryRows(data: unknown): OrderFileDelivery[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => (row && typeof row === 'object' ? mapDeliveryRow(row as Record<string, unknown>) : null))
    .filter((row): row is OrderFileDelivery => row !== null);
}

function toRpcError(context: string, error: unknown): DeliveryRpcError {
  const err = error as { message?: unknown; code?: unknown } | null | undefined;
  const message =
    typeof err?.message === 'string' && err.message.trim()
      ? err.message
      : 'Lỗi không xác định từ máy chủ.';
  const code = typeof err?.code === 'string' ? err.code : null;
  return new DeliveryRpcError(`${context}: ${message}`, code);
}

/**
 * Cấp file CAD cho đơn (idempotent). Chỉ gọi được với phiên `authenticated`.
 *
 * - Trả `[]` khi đơn CHƯA đủ điều kiện (chưa `paid`, admin chưa ghi `order_items` digital) —
 *   đây là trạng thái thật, KHÔNG phải lỗi.
 * - Ném `DeliveryRpcError` (kèm `code`) khi thiếu quyền (`42501`), thiếu mã đơn (`22023`), …
 */
export async function finalizeOrderDelivery(
  orderId: string,
  token?: string | null,
): Promise<OrderFileDelivery[]> {
  const cleanOrderId = (orderId || '').trim();
  if (!cleanOrderId) {
    throw new DeliveryRpcError('Thiếu mã đơn hàng để cấp tệp.', '22023');
  }

  const cleanToken = typeof token === 'string' ? token.trim() : '';
  const { data, error } = await supabase.rpc('finalize_digital_delivery', {
    p_order_id: cleanOrderId,
    // RPC yêu cầu token >= 12 ký tự; chuỗi ngắn hơn coi như không có token.
    p_token: cleanToken.length >= 12 ? cleanToken : null,
  });

  if (error) {
    throw toRpcError('Không cấp được tệp cho đơn hàng', error);
  }

  return toDeliveryRows(data);
}

/**
 * Gắn đơn khách vào tài khoản đang đăng nhập bằng mã đơn + token truy cập.
 *
 * RPC `claim_guest_order(p_order_id, p_token)` (SECURITY DEFINER) chỉ gắn khi đơn
 * chưa có chủ (`user_id is null`) hoặc đã thuộc chính người gọi, và token >= 12 ký tự
 * khớp tuyệt đối `orders.secure_access_token`.
 *
 * - Trả `true` = đơn đã được gắn; `false` = mã đơn/token không khớp hoặc đơn đã thuộc
 *   tài khoản khác (RPC trả `found = false`, KHÔNG phải lỗi).
 * - Ném `DeliveryRpcError` khi chưa đăng nhập / thiếu tham số / lỗi mạng.
 * - Token KHÔNG được lưu ở bất kỳ đâu; caller chỉ giữ trong state tạm rồi xoá.
 */
export async function claimGuestOrder(orderId: string, token: string): Promise<boolean> {
  const cleanOrderId = (orderId || '').trim();
  const cleanToken = (token || '').trim();

  if (!cleanOrderId) {
    throw new DeliveryRpcError('Thiếu mã đơn hàng để gắn vào tài khoản.', '22023');
  }
  if (cleanToken.length < 12) {
    throw new DeliveryRpcError('Mã truy cập đơn quá ngắn (tối thiểu 12 ký tự).', '22023');
  }

  const { data, error } = await supabase.rpc('claim_guest_order', {
    p_order_id: cleanOrderId,
    p_token: cleanToken,
  });

  if (error) {
    throw toRpcError('Không gắn được đơn khách vào tài khoản', error);
  }

  return data === true;
}

/**
 * Đọc file CAD của chính người gọi. `orderId` bỏ trống/null ⇒ tất cả đơn của người dùng.
 * Ném `DeliveryRpcError` khi RPC từ chối — caller phải hiển thị lỗi thật, không coi là rỗng.
 */
export async function getMyOrderFiles(orderId?: string | null): Promise<OrderFileDelivery[]> {
  const cleanOrderId = typeof orderId === 'string' ? orderId.trim() : '';

  const { data, error } = await supabase.rpc('get_my_order_files', {
    p_order_id: cleanOrderId || null,
  });

  if (error) {
    throw toRpcError('Không tải được thư viện tệp', error);
  }

  return toDeliveryRows(data);
}
