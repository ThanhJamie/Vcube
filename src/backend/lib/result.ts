/**
 * result.ts — Hợp đồng kết quả GHI duy nhất của backend (canonical).
 *
 * Bất biến:
 * - **Discriminated union** trên `success`: `if (r.success)` narrow được `r.data`,
 *   nhánh còn lại narrow `r.error`/`r.issues`. KHÔNG dùng `success: boolean`.
 * - Field phụ tuỳ service (`alreadyProcessed`, `stockUpdated`, `newStockGrams`…)
 *   đi qua generic `E` thay vì mở rộng shape bằng field rời rạc.
 * - Giữ `error?: undefined` ở nhánh success và `data?: undefined` ở nhánh failure
 *   để code cũ `if (res.error)` / `res.data` vẫn compile.
 * - **Lá thuần**: module này KHÔNG import gì từ `src/backend/services/*`,
 *   `src/backend/supabase/*`, React hay frontend. Service được phép import
 *   `ok`/`fail`/`WriteResult` từ đây, KHÔNG bao giờ ngược lại.
 * - `ValidationIssue` định nghĩa tại đây; `settingsService` chỉ re-export.
 */

export interface ValidationIssue {
  field: string;
  message: string;
  code?: string;
}

export type WriteResult<T = void, E = unknown> =
  | ((T extends void ? { success: true; data?: undefined } : { success: true; data: T })
      & { error?: undefined; issues?: undefined } & E)
  | { success: false; data?: undefined; error: string; issues?: ValidationIssue[] };

export function ok(): WriteResult<void>;
export function ok<T>(data: T): WriteResult<T>;
export function ok<T>(data?: T): WriteResult<T> {
  return data === undefined
    ? ({ success: true } as WriteResult<T>)
    : ({ success: true, data } as WriteResult<T>);
}

export function fail(err: unknown, fallback?: string): { success: false; error: string } {
  return { success: false, error: deriveErrorMessage(err, fallback) };
}

export function failWith(issues: ValidationIssue[]): { success: false; error: string; issues: ValidationIssue[] } {
  const first = issues.find(
    (issue) => issue && typeof issue.message === 'string' && issue.message.trim() !== ''
  );
  return {
    success: false,
    error: first ? first.message : 'Dữ liệu không hợp lệ.',
    issues,
  };
}

function deriveErrorMessage(err: unknown, fallback?: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string' && err.trim() !== '') return err.trim();
  return fallback ?? 'Đã xảy ra lỗi không xác định.';
}
