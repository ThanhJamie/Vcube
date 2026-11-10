/**
 * Phân loại lỗi đọc chi tiết đơn (`OrderService.getOrderDetail`).
 *
 * VÌ SAO: `dbService.getOrderById` bọc lỗi PostgREST thành `new Error('Không tải được đơn
 * hàng: <message>')` (mã `code` bị mất), còn lỗi mạng của `fetch` ném thẳng `TypeError`
 * (`Failed to fetch`). UI cần tách "đơn không tồn tại" (`not_found`, không thử lại) khỏi
 * "không đọc được" (`network`/`forbidden`/`unknown`, có nút Thử lại). Hàm này chỉ đọc dữ
 * liệu trên object lỗi — KHÔNG gọi mạng, KHÔNG đoán bừa: không khớp luật nào ⇒ `unknown`.
 *
 * Thứ tự xét: forbidden trước network (một thông điệp hiếm khi mang cả hai, nhưng quyền bị
 * từ chối là thông tin chắc chắn hơn "có chữ timeout" trong text).
 */
import { OrderDetailError } from '../../types/orderRecords';
import type { OrderDetailErrorCode } from '../../types/orderRecords';

/** Mã PostgREST/Postgres biểu thị thiếu quyền hoặc phiên không hợp lệ. */
const FORBIDDEN_CODES = new Set(['42501', '401', '403', 'PGRST301', 'PGRST302']);

/** Mã lỗi tầng mạng (Node `fetch`/undici, DNS, timeout, abort). */
const NETWORK_CODES = new Set([
  'ABORT_ERR',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /permission denied/i,
  /row[-\s]level security/i,
  /insufficient privilege/i,
  /not authori[sz]ed/i,
  /jwt expired/i,
  /invalid (api )?key/i,
  /\b42501\b/,
];

const NETWORK_PATTERNS: readonly RegExp[] = [
  /failed to fetch/i,
  /fetch failed/i,
  /network ?error/i,
  /network request failed/i,
  /load failed/i,
  /timed? ?out/i,
  /timeout/i,
  /aborted/i,
  /socket hang up/i,
  /econnrefused/i,
  /enotfound/i,
  /econnreset/i,
  /etimedout/i,
];

const readString = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') return '';
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : '';
};

/** Gom mọi text có thể mang manh mối: message + name + details/hint/thông điệp gốc. */
const collectText = (err: unknown): string => {
  if (typeof err === 'string') return err;
  if (!err || typeof err !== 'object') return '';
  const parts = [
    readString(err, 'message'),
    readString(err, 'name'),
    readString(err, 'details'),
    readString(err, 'hint'),
    readString(err, 'error_description'),
  ];
  const cause = (err as { cause?: unknown }).cause;
  if (cause && typeof cause === 'object') parts.push(readString(cause, 'message'));
  return parts.filter(Boolean).join(' | ');
};

const collectCode = (err: unknown): string => {
  if (!err || typeof err !== 'object') return '';
  const code = (err as Record<string, unknown>).code;
  if (typeof code === 'string') return code;
  if (typeof code === 'number') return String(code);
  return '';
};

/**
 * Phân loại lỗi đọc đơn. `OrderDetailError` đã có mã ⇒ giữ nguyên mã (không phân loại lại).
 */
export function classifyOrderDetailError(err: unknown): OrderDetailErrorCode {
  if (err instanceof OrderDetailError) return err.code;

  const code = collectCode(err).toUpperCase();
  const text = collectText(err);

  if (FORBIDDEN_CODES.has(code) || FORBIDDEN_PATTERNS.some((re) => re.test(text))) return 'forbidden';
  if (NETWORK_CODES.has(code) || NETWORK_PATTERNS.some((re) => re.test(text))) return 'network';
  return 'unknown';
}
