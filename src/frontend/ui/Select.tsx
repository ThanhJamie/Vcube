/**
 * Select — `<select>` native, KHÔNG tự viết listbox (spec: docs/design/tokens.md §8).
 *
 * Lý do dùng native: bàn phím, screen reader, mobile wheel picker và form submission
 * đều miễn phí. Chỉ thay phần nhìn: `appearance-none` + chevron lucide + token màu.
 *
 * - Viền `border-line-control`, `invalid` -> `border-danger` + `aria-invalid`.
 * - `placeholder`: option **rỗng** (`value=''`) để biểu diễn "chưa chọn" và vẫn xoá được.
 * - `options` (mảng) hoặc `children` (`<option>`), hoặc cả hai.
 * - Dùng cùng `Field` để luôn có `<label for>`.
 */

import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import { cn } from './cn';

export type SelectSize = 'sm' | 'md';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<ComponentPropsWithRef<'select'>, 'size' | 'className' | 'children'> {
  /** Option dựng sẵn; có thể trộn với `children`. */
  options?: SelectOption[];
  /** Chữ của option rỗng đầu danh sách. */
  placeholder?: string;
  invalid?: boolean;
  numeric?: boolean;
  size?: SelectSize;
  className?: string;
  wrapperClassName?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

const BASE = [
  'w-full appearance-none rounded-md border bg-surface text-fg',
  'pr-9',
  'transition-colors duration-150 ease-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle',
].join(' ');

const SIZE: Record<SelectSize, string> = {
  sm: 'h-9 min-h-9 pl-3 text-xs max-md:min-h-12',
  md: 'h-10 min-h-10 pl-3 text-sm max-md:min-h-12',
};

export function Select({
  options,
  placeholder,
  invalid = false,
  numeric = false,
  size = 'md',
  className,
  wrapperClassName,
  children,
  style,
  ...rest
}: SelectProps) {
  const borderTone = invalid ? 'border-danger' : 'border-line-control';

  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <select
        {...rest}
        aria-invalid={invalid ? true : rest['aria-invalid']}
        style={style}
        className={cn(BASE, SIZE[size], borderTone, numeric && 'tabular-nums', className)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  );
}
