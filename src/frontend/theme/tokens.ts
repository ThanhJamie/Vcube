/**
 * VCUBE theme tokens — nguồn DUY NHẤT cho màu sắc dùng trong JavaScript.
 *
 * Vì sao cần: token trong `src/index.css` là biến CSS, nên mọi màu viết bằng
 * `className` tự đúng theme. Nhưng màu vẽ trong JS — ví dụ `new THREE.Color(0x...)`
 * ở `ModelViewer3D.tsx` (grid, axes, bbox, vật liệu) — không nằm trong `className`,
 * nên phải đọc qua module này (docs/plans/01-theme-migration.md §8.2, §8.3).
 *
 * Nguyên tắc:
 * 1. Đọc giá trị thật lúc chạy bằng `getComputedStyle(document.documentElement)`
 *    → luôn khớp với `src/index.css`, kể cả khi Stage B/C đổi giá trị.
 * 2. Có bảng hằng số light/dark dự phòng (khớp đúng `src/index.css`) để chạy được
 *    khi không có DOM (SSR, script Node, unit test) hoặc khi biến CSS rỗng.
 * 3. Module thuần: KHÔNG import `three`, KHÔNG import React.
 */

/** Chế độ theme người dùng chọn. `auto` = theo route family (xem ThemeProvider). */
export type ThemeMode = 'light' | 'dark' | 'auto';

/** Khoá localStorage cho override theme — cũng là nguồn cho ThemeProvider. */
export const THEME_STORAGE_KEY = 'vcube_theme';

/** Tiền tố biến CSS của token màu. */
export const COLOR_TOKEN_PREFIX = '--color-';

/** Bảng màu light dự phòng — PHẢI khớp khối `@theme` trong `src/index.css`. */
export const LIGHT_COLOR_TOKENS = {
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  'surface-raised': '#FFFFFF',
  'surface-muted': '#F8F9FF',
  'surface-inverse': '#091426',
  'surface-inverse-raised': '#1E293B',
  'on-inverse': '#FFFFFF',
  line: '#CBD5E1',
  'line-subtle': '#E2E8F0',
  'line-control': '#8590A6',
  fg: '#091426',
  'fg-muted': '#545F73',
  'fg-subtle': '#64748B',
  primary: '#00687A',
  'primary-hover': '#005260',
  'primary-fg': '#FFFFFF',
  accent: '#57DFFE',
  positive: '#15803D',
  warning: '#B45309',
  'warning-strong': '#D97706',
  danger: '#B91C1C',
  info: '#1D4ED8',
  ring: '#00687A',
} as const;

/** Bảng màu dark dự phòng — PHẢI khớp khối `.dark` trong `src/index.css`. */
export const DARK_COLOR_TOKENS = {
  canvas: '#080D16',
  surface: '#0E1520',
  'surface-raised': '#1A2434',
  'surface-muted': '#131C2A',
  'surface-inverse': '#131C2A',
  'surface-inverse-raised': '#1A2434',
  'on-inverse': '#E8EEF7',
  line: '#232F42',
  'line-subtle': '#1B2434',
  'line-control': '#4E6490',
  fg: '#E8EEF7',
  'fg-muted': '#9BA9BE',
  'fg-subtle': '#7A8798',
  primary: '#3AB8CE',
  'primary-hover': '#57DFFE',
  'primary-fg': '#07272E',
  accent: '#57DFFE',
  positive: '#4ADE80',
  warning: '#FBBF24',
  'warning-strong': '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
  ring: '#57DFFE',
} as const;

/** Tên token màu hợp lệ (không kèm tiền tố `--color-`). */
export type ColorTokenName = keyof typeof LIGHT_COLOR_TOKENS;

export type ReadTokenOptions = {
  /** Ép bảng dự phòng light/dark thay vì dò `class="dark"`. */
  isDark?: boolean;
  /** Gốc để đọc biến CSS (mặc định `document.documentElement`). */
  root?: HTMLElement | null;
};

function resolveRoot(root?: HTMLElement | null): HTMLElement | null {
  if (root) return root;
  if (typeof document === 'undefined' || !document.documentElement) return null;
  return document.documentElement;
}

function fallbackTable(isDark: boolean): Record<string, string> {
  return (isDark ? DARK_COLOR_TOKENS : LIGHT_COLOR_TOKENS) as unknown as Record<string, string>;
}

/** `<html>` hiện có `.dark` không (mặc định false khi không có DOM). */
export function isDarkActive(root?: HTMLElement | null): boolean {
  const el = resolveRoot(root);
  if (!el || !el.classList || typeof el.classList.contains !== 'function') return false;
  return el.classList.contains('dark');
}

/**
 * Đọc một token màu: ưu tiên biến CSS thật, rơi về hằng số light/dark khi
 * không có DOM hoặc biến rỗng.
 */
export function readColorToken(name: ColorTokenName | string, options: ReadTokenOptions = {}): string {
  const isDark = options.isDark ?? isDarkActive(options.root);
  const fallback = fallbackTable(isDark)[name] ?? '';
  const el = resolveRoot(options.root);
  const g = globalThis as unknown as { getComputedStyle?: (target: Element) => CSSStyleDeclaration };
  if (el && typeof g.getComputedStyle === 'function') {
    const raw = g.getComputedStyle(el).getPropertyValue(COLOR_TOKEN_PREFIX + name).trim();
    if (raw) return raw;
  }
  return fallback;
}

/** Đọc nhiều token một lượt — dùng cho viewer 3D (grid/bbox/material). */
export function readColorTokens(
  names: readonly (ColorTokenName | string)[],
  options: ReadTokenOptions = {},
): Record<string, string> {
  const isDark = options.isDark ?? isDarkActive(options.root);
  const out: Record<string, string> = {};
  for (const name of names) {
    out[name] = readColorToken(name, { ...options, isDark });
  }
  return out;
}

/**
 * `rgb()`/`#rrggbb` -> số hex 0xRRGGBB cho `new THREE.Color(...)`.
 * Trả về giá trị dự phòng nếu chuỗi không phân tích được (ví dụ `oklch(...)`).
 */
export function readColorNumber(name: ColorTokenName | string, options: ReadTokenOptions = {}): number {
  const raw = readColorToken(name, options);
  const parsed = parseColorToNumber(raw);
  if (parsed !== null) return parsed;
  const isDark = options.isDark ?? isDarkActive(options.root);
  const fallback = parseColorToNumber(fallbackTable(isDark)[name] ?? '');
  return fallback ?? 0x000000;
}

/** `#rgb`, `#rrggbb`, `rgb(r g b)` -> 0xRRGGBB, hoặc null nếu không hiểu. */
export function parseColorToNumber(value: string): number | null {
  if (!value) return null;
  const text = value.trim().toLowerCase();

  const rgbMatch = text.match(/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/);
  if (rgbMatch) {
    const [r, g, b] = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map((part) => Math.max(0, Math.min(255, Math.round(Number(part)))));
    if ([r, g, b].some((channel) => !Number.isFinite(channel))) return null;
    return (r << 16) | (g << 8) | b;
  }

  const hex = text.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/.test(full)) return null;
  return parseInt(full, 16);
}

/**
 * Theo dõi đổi theme (class `dark` trên `<html>`) → callback.
 * Trả về hàm unsubscribe. CHỈ gọi callback khi giá trị ĐỔI (không gọi ngay lúc
 * đăng ký — đọc trạng thái đầu bằng `isDarkActive()`).
 */
export function subscribeTheme(cb: (isDark: boolean) => void): () => void {
  if (typeof cb !== 'function') return () => {};
  if (typeof document === 'undefined' || !document.documentElement) return () => {};

  const g = globalThis as unknown as {
    MutationObserver?: new (callback: () => void) => {
      observe: (target: Element, options: MutationObserverInit) => void;
      disconnect: () => void;
    };
  };
  if (typeof g.MutationObserver !== 'function') return () => {};

  const root = document.documentElement;
  let last = isDarkActive(root);
  const observer = new g.MutationObserver(() => {
    const next = isDarkActive(root);
    if (next === last) return;
    last = next;
    cb(next);
  });
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });

  return () => observer.disconnect();
}
