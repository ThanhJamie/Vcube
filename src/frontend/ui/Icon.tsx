/**
 * Icon — điểm render icon DUY NHẤT của VCUBE (thay thế `<span>` icon Material Symbols).
 *
 * Hợp đồng:
 * - `size` mặc định **24** — đúng bằng kích thước HIỆU DỤNG của class cũ: `src/index.css`
 *   đặt `font-size: 24px` cho class icon Material Symbols ở tầng KHÔNG layer nên nó thắng
 *   `@layer utilities`; mọi class `text-*` trên icon trước đây **không có tác dụng**.
 *   Nay `size` là thật → truyền đúng số suy từ ý định của class cũ (bảng ở
 *   `docs/design/icon-map.md` § "size prop"): text-xs 14, text-sm 16, text-base 18,
 *   text-lg 20, text-xl 24, text-2xl 28, text-3xl 30, text-4xl 36, text-5xl 48.
 * - `strokeWidth` mặc định 2 (mặc định của lucide).
 * - **Trang trí là mặc định**: `aria-hidden="true"`. Khi icon là NỘI DUNG (không có chữ
 *   bên cạnh) thì truyền `label` → `role="img"` + `aria-label`, bỏ `aria-hidden`
 *   (`docs/design/tokens.md` §8 và `docs/design/icon-map.md` § "aria rules").
 * - `className` chỉ để thêm LAYOUT/VỊ TRÍ (`absolute left-3 top-3`, `shrink-0`, `mt-0.5`,
 *   `animate-spin`, `group-hover:*`). Màu đi theo `currentColor` — vẫn dùng class `text-*`
 *   như cũ trên chính icon, KHÔNG hardcode `stroke`/`color`.
 * - `fill` chỉ dùng cho trạng thái đã lưu: `fill={on ? 'currentColor' : 'none'}`.
 * - Glyph lạ → `FALLBACK_ICON` + `console.warn` **chỉ ở DEV** (production im lặng).
 */

import type { CSSProperties } from 'react';
import { FALLBACK_ICON, iconMap } from './iconMap';

/** `import.meta.env.DEV` không có type sẵn (repo không cài `vite/client`) → đọc qua cast. */
const IS_DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);

export type IconProps = {
  /** Tên glyph Material Symbols, ví dụ `'check_circle'` (xem `iconMap.ts`). */
  name: string;
  /** Cạnh icon, px. Mặc định 24 = kích thước hiệu dụng của class cũ. */
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Truyền khi icon là nội dung: đặt `role="img"` + `aria-label` và bỏ `aria-hidden`. */
  label?: string;
  /** Chỉ dùng cho trạng thái đã lưu: `'currentColor'` khi chọn, `'none'` khi không. */
  fill?: string;
  style?: CSSProperties;
};

export function Icon({ name, size = 24, strokeWidth = 2, className, label, fill, style }: IconProps) {
  const Glyph = iconMap[name];

  if (!Glyph && IS_DEV) {
    // Glyph lạ: không im lặng ở DEV (trước đây gõ sai tên là ra chữ thay vì icon).
    console.warn(`[Icon] glyph Material Symbols không có trong iconMap: "${name}"`);
  }

  const GlyphComponent = Glyph ?? FALLBACK_ICON;

  return (
    <GlyphComponent
      size={size}
      strokeWidth={strokeWidth}
      fill={fill}
      className={className}
      style={style}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    />
  );
}
