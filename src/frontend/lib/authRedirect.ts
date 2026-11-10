/**
 * authRedirect — chuẩn hoá `?redirectTo=` của luồng đăng nhập (UX-02).
 *
 * Vì sao cần: `ProtectedRoute`/`RoleGuard` đẩy guest sang `/auth/login?redirectTo=<path>`
 * để đăng nhập xong quay lại đúng chỗ. Giá trị này đến TỪ URL nên phải coi là dữ liệu
 * không tin cậy — chỉ chấp nhận **path nội bộ** của chính app:
 *   - phải bắt đầu bằng `/`;
 *   - KHÔNG được là protocol-relative (`//evil.com`) hay dùng backslash (`/\evil.com`);
 *   - không chứa scheme (`https:`, `javascript:`…) — đã bị loại bởi điều kiện bắt đầu `/`;
 *   - không chứa ký tự điều khiển (xuống dòng, NUL…);
 *   - KHÔNG trỏ vào chính khu vực auth (`/auth/*`, hoặc alias `/login`, `/register`) —
 *     nếu không, đăng nhập/đăng ký xong lại quay về form auth (vòng lặp UX).
 *
 * Mọi giá trị không hợp lệ rơi về `/` (trang chủ) thay vì ném lỗi: sai `redirectTo`
 * không được làm hỏng luồng đăng nhập.
 */

export const DEFAULT_AUTH_REDIRECT = '/';

/** Hai màn auth canonical — dùng cho helper chuyển qua lại login ⟷ register. */
export type AuthScreenPath = '/auth/login' | '/auth/register';

/**
 * `redirectTo` trỏ vào khu vực auth (kể cả alias cũ `/login`, `/register`) sẽ khiến
 * luồng đăng nhập/đăng ký quay lại chính form auth ⇒ chặn trước khi ghép URL.
 *
 * Chuẩn hoá **CHỈ để so sánh** (trim, bỏ query/hash, bỏ `/` cuối, lowercase) để bắt
 * được biến thể `/LOGIN`, `/login/`, `/Auth/Login`…; giá trị path hợp lệ trả về từ
 * `sanitizeRedirectPath` vẫn giữ nguyên chữ hoa/dấu `/` gốc.
 */
function isAuthAreaPath(value: string): boolean {
  const pathname = value
    .trim()
    .split(/[?#]/)[0]
    .replace(/\/+$/, '')
    .toLowerCase();
  return (
    pathname === '/auth' ||
    pathname.startsWith('/auth/') ||
    pathname === '/login' ||
    pathname === '/register'
  );
}

/** Chỉ giữ path nội bộ; trả `/` cho mọi giá trị thiếu/không hợp lệ. */
export function sanitizeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AUTH_REDIRECT;
  const value = raw.trim();
  if (!value.startsWith('/')) return DEFAULT_AUTH_REDIRECT;
  if (value.startsWith('//')) return DEFAULT_AUTH_REDIRECT;
  if (value.includes('\\')) return DEFAULT_AUTH_REDIRECT;
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_AUTH_REDIRECT;
  if (isAuthAreaPath(value)) return DEFAULT_AUTH_REDIRECT;
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

/**
 * Link chuyển giữa hai màn auth (login ⟷ register) mà **vẫn mang theo** `?redirectTo=`.
 *
 * `redirectTo` truyền vào là giá trị ĐÃ decode (lấy từ `useSearchParams().get()`), nên
 * helper encode lại đúng một lần. Không có `redirectTo` ⇒ trả route trần (không thêm
 * query rỗng). Giá trị không hợp lệ vẫn đi qua `sanitizeRedirectPath` nên rơi về `/`.
 */
export function buildAuthSwitchHref(
  screen: AuthScreenPath,
  redirectTo: string | null | undefined
): string {
  if (!redirectTo) return screen;
  const target = sanitizeRedirectPath(redirectTo);
  return `${screen}?redirectTo=${encodeURIComponent(target)}`;
}
