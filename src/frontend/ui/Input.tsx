/**
 * Input — ô nhập liệu dùng token (spec: docs/design/tokens.md §8).
 *
 * - Viền `border-line-control` (đạt ≥3:1 — `border-line` KHÔNG đủ cho viền control).
 * - `inputMode` / `autoComplete` / `type` truyền thẳng qua (prop native, không chặn).
 * - `numeric`: thêm `tabular-nums` và mặc định `inputMode='decimal'` (KHÔNG tự đổi
 *   `type='number'` — tránh mất số 0 đầu và mũi tên spinner).
 * - `invalid`: viền `border-danger` + `aria-invalid` (chọn theo biến, không lồng class
 *   xung đột để không phụ thuộc thứ tự CSS).
 * - disabled/readOnly có style phân biệt; vẫn dùng qua `Field` để có `<label for>`.
 * - `tone='chrome'`: nền `chrome-raised`, chữ `chrome-fg`, viền `chrome-border`, ring
 *   `chrome-ring` — bộ class riêng, không xếp chồng lên bộ light.
 */

import type { ComponentPropsWithRef, CSSProperties } from 'react';
import { cn } from './cn';
import type { Tone } from './tone';

export type InputSize = 'sm' | 'md';

export interface InputProps
  extends Omit<ComponentPropsWithRef<'input'>, 'size' | 'className'> {
  /** Ô số: `tabular-nums` + `inputMode='decimal'` mặc định. */
  numeric?: boolean;
  invalid?: boolean;
  /** Bề mặt render lên: `light` (mặc định) hoặc `chrome` (console tối). */
  tone?: Tone;
  size?: InputSize;
  /** Căn nội dung; mặc định theo `numeric` là `left` (đổi sang `right` nếu cần). */
  align?: 'left' | 'right';
  className?: string;
  style?: CSSProperties;
}

/** Tone `light` — giữ NGUYÊN chuỗi class cũ (tone mặc định ⇒ 0 đổi UI). */
const BASE = [
  'w-full rounded-md border bg-surface text-fg',
  'placeholder:text-fg-subtle',
  'transition-colors duration-fast ease-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle',
  'read-only:bg-surface-muted',
].join(' ');

/** Tone `chrome` — bộ class riêng, KHÔNG xếp chồng lên BASE (cn() không merge). */
const BASE_CHROME = [
  'w-full rounded-md border bg-chrome-raised text-chrome-fg',
  'placeholder:text-chrome-fg-muted',
  'transition-colors duration-fast ease-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-ring',
  'disabled:cursor-not-allowed disabled:bg-chrome disabled:text-chrome-fg-muted',
  'read-only:bg-chrome',
].join(' ');

const SIZE: Record<InputSize, string> = {
  sm: 'h-9 min-h-9 px-3 text-xs max-md:min-h-12',
  md: 'h-10 min-h-10 px-3 text-sm max-md:min-h-12',
};

export function Input({
  numeric = false,
  invalid = false,
  tone = 'light',
  size = 'md',
  align,
  className,
  type = 'text',
  inputMode,
  style,
  ...rest
}: InputProps) {
  const borderTone = invalid
    ? 'border-danger'
    : tone === 'chrome'
      ? 'border-chrome-border'
      : 'border-line-control';
  const textAlign = align === 'right' ? 'text-right' : align === 'left' ? 'text-left' : undefined;

  return (
    <input
      {...rest}
      type={type}
      inputMode={inputMode ?? (numeric ? 'decimal' : undefined)}
      aria-invalid={invalid ? true : rest['aria-invalid']}
      style={style}
      className={cn(
        tone === 'chrome' ? BASE_CHROME : BASE,
        SIZE[size],
        borderTone,
        numeric && 'tabular-nums',
        textAlign,
        className,
      )}
    />
  );
}
