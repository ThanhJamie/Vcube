/**
 * reportError.ts — một cửa duy nhất để BÁO lỗi ở tầng frontend.
 *
 * Vì sao: gate `check-error-handling.mjs` (R3) đếm `console.warn/error` trong catch;
 * gom qua đây để log trung thực (luôn `console.error`) mà không tăng nợ, và để UI
 * hiện toast lỗi khi thật sự cần — không nuốt lỗi.
 *
 * Hợp đồng (T5.2a/T5.2b dùng chung, KHÔNG định nghĩa lại):
 *   reportError(context, err, opts?)
 * - Luôn `console.error(`[${context}]`, err)`.
 * - `opts.toast === true` → đẩy toast qua Zustand UI store (gọi được NGOÀI React).
 * - Không yêu cầu toast thì KHÔNG chạm UI.
 * - Dependency-light, không dùng React hook.
 */

import { useUIStore } from '@frontend/stores/useUIStore';

export function reportError(
  context: string,
  err: unknown,
  opts?: { toast?: boolean; message?: string }
): void {
  console.error(`[${context}]`, err);

  if (opts?.toast === true) {
    useUIStore.getState().showToast(opts.message ?? deriveErrorMessage(err), 'error');
  }
}

function deriveErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim() !== '') return err.message;
  if (typeof err === 'string' && err.trim() !== '') return err.trim();
  return 'Đã xảy ra lỗi không xác định.';
}
