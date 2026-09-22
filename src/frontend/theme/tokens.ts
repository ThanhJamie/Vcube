/**
 * VCUBE theme tokens — nguồn DUY NHẤT cho màu sắc dùng trong JavaScript.
 *
 * Vì sao cần: token trong `src/index.css` là biến CSS, nên mọi màu viết bằng
 * `className` tự đúng token. Nhưng màu vẽ trong JS — ví dụ `new THREE.Color(0x...)`
 * ở `ModelViewer3D.tsx` (grid, axes, bbox, vật liệu) — không nằm trong `className`,
 * nên phải đọc qua module này.
 *
 * App là LIGHT-ONLY: không còn theme provider hay chế độ dark.
 *
 * Nguyên tắc:
 * 1. Đọc giá trị thật lúc chạy bằng `getComputedStyle(document.documentElement)`
 *    → luôn khớp với `src/index.css`.
 * 2. Có bảng hằng số light dự phòng (khớp đúng `src/index.css`) để chạy được
 *    khi không có DOM (SSR, script Node, unit test) hoặc khi biến CSS rỗng.
 * 3. Module thuần: KHÔNG import `three`, KHÔNG import React.
 */

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

/** Tên token màu hợp lệ (không kèm tiền tố `--color-`). */
export type ColorTokenName = keyof typeof LIGHT_COLOR_TOKENS;

export type ReadTokenOptions = {
  /** Gốc để đọc biến CSS (mặc định `document.documentElement`). */
  root?: HTMLElement | null;
};

function resolveRoot(root?: HTMLElement | null): HTMLElement | null {
  if (root) return root;
  if (typeof document === 'undefined' || !document.documentElement) return null;
  return document.documentElement;
}

/**
 * Đọc một token màu: ưu tiên biến CSS thật, rơi về hằng số light khi
 * không có DOM hoặc biến rỗng.
 */
export function readColorToken(name: ColorTokenName | string, options: ReadTokenOptions = {}): string {
  const fallback = (LIGHT_COLOR_TOKENS as unknown as Record<string, string>)[name] ?? '';
  const el = resolveRoot(options.root);
  const g = globalThis as unknown as { getComputedStyle?: (target: Element) => CSSStyleDeclaration };
  if (el && typeof g.getComputedStyle === 'function') {
    const raw = g.getComputedStyle(el).getPropertyValue(COLOR_TOKEN_PREFIX + name).trim();
    if (raw) return raw;
  }
  return fallback;
}
