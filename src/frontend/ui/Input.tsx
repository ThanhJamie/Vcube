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
 */

import type { ComponentPropsWithRef, CSSProperties } from 'react';
import { cn } from './cn';

export type InputSize = 'sm' | 'md';

export interface InputProps
  extends Omit<ComponentPropsWithRef<'input'>, 'size' | 'className'> {
  /** Ô số: `tabular-nums` + `inputMode='decimal'` mặc định. */
  numeric?: boolean;
  invalid?: boolean;
  size?: InputSize;
  /** Căn nội dung; mặc định theo `numeric` là `left` (đổi sang `right` nếu cần). */
  align?: 'left' | 'right';
  className?: string;
  style?: CSSProperties;
}

const BASE = [
  'w-full rounded-md border bg-surface text-fg',
  'placeholder:text-fg-subtle',
  'transition-colors duration-150 ease-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle',
  'read-only:bg-surface-muted',
].join(' ');

const SIZE: Record<InputSize, string> = {
  sm: 'h-9 min-h-9 px-3 text-xs max-md:min-h-12',
  md: 'h-10 min-h-10 px-3 text-sm max-md:min-h-12',
};

export function Input({
  numeric = false,
  invalid = false,
  size = 'md',
  align,
  className,
  type = 'text',
  inputMode,
  style,
  ...rest
}: InputProps) {
  const borderTone = invalid ? 'border-danger' : 'border-line-control';
  const textAlign = align === 'right' ? 'text-right' : align === 'left' ? 'text-left' : undefined;

  return (
    <input
      {...rest}
      type={type}
      inputMode={inputMode ?? (numeric ? 'decimal' : undefined)}
      aria-invalid={invalid ? true : rest['aria-invalid']}
      style={style}
      className={cn(BASE, SIZE[size], borderTone, numeric && 'tabular-nums', textAlign, className)}
    />
  );
}
