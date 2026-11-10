/**
 * authRedirect — chuẩn hoá `?redirectTo=` của luồng đăng nhập (UX-02).
 *
 * Vì sao cần: `ProtectedRoute`/`RoleGuard` đẩy guest sang `/auth/login?redirectTo=<path>`
 * để đăng nhập xong quay lại đúng chỗ. Giá trị này đến TỪ URL nên phải coi là dữ liệu
 * không tin cậy — chỉ chấp nhận **path nội bộ** của chính app:
 *   - phải bắt đầu bằng `/`;
 *   - KHÔNG được là protocol-relative (`//evil.com`) hay dùng backslash (`/\evil.com`);
 *   - không chứa scheme (`https:`, `javascript:`…) — đã bị loại bởi điều kiện bắt đầu `/`;
 *   - không chứa ký tự điều khiển (xuống dòng, NUL…).
 *
 * Mọi giá trị không hợp lệ rơi về `/` (trang chủ) thay vì ném lỗi: sai `redirectTo`
 * không được làm hỏng luồng đăng nhập.
 */

export const DEFAULT_AUTH_REDIRECT = '/';

/** Chỉ giữ path nội bộ; trả `/` cho mọi giá trị thiếu/không hợp lệ. */
export function sanitizeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AUTH_REDIRECT;
  const value = raw.trim();
  if (!value.startsWith('/')) return DEFAULT_AUTH_REDIRECT;
  if (value.startsWith('//')) return DEFAULT_AUTH_REDIRECT;
  if (value.includes('\\')) return DEFAULT_AUTH_REDIRECT;
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_AUTH_REDIRECT;
  return value;
}

/**
 * Ghép URL đăng nhập kèm đường về. `pathname`/`search` lấy từ router nên luôn nội bộ,
 * nhưng vẫn đi qua `sanitizeRedirectPath` để một nguồn luật duy nhất.
 */
export function buildLoginHref(pathname: string, search = ''): string {
  const target = sanitizeRedirectPath(`${pathname}${search}`);
  return `/auth/login?redirectTo=${encodeURIComponent(target)}`;
}
