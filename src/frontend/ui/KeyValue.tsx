/**
 * KeyValue — danh sách nhãn/giá trị cho trang chi tiết (hoá đơn, hồ sơ, đơn hàng)
 * (spec: docs/plans/21-saas-spec.md §4).
 *
 * Hợp đồng:
 * - Ngữ nghĩa `<dl>`/`<dt>`/`<dd>` — screen reader đọc đúng cặp nhãn ↔ giá trị.
 * - Nhịp: `gap-label` (**4px**) giữa nhãn và giá trị (đúng §2.3), `gap-block` (**16px**)
 *   giữa các dòng.
 * - `numeric: true` -> `tabular-nums` cho giá trị (tiền, số lượng, tiến độ). Số tiền vẫn
 *   nên đi qua `Money` (đã tự `tabular-nums` + `—` khi thiếu).
 * - Giá trị thiếu: truyền `EMPTY_VALUE` ('—') từ `@frontend/lib/format`; component KHÔNG
 *   tự bịa 0.
 * - `variant="panel"`: bọc trong panel viền nhạt + đường kẻ giữa các dòng — dùng cho
 *   khối thông tin rời (ví dụ "Thông tin hoá đơn").
 */

import type { ReactNode } from 'react';
import { cn } from './cn';

export type KeyValueVariant = 'plain' | 'panel';
export type KeyValueColumns = 1 | 2 | 3;

export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
  /** Chú thích nhỏ dưới giá trị (metadata). */
  hint?: ReactNode;
  /** Giá trị là số -> `tabular-nums`. */
  numeric?: boolean;
}

export interface KeyValueRowProps extends KeyValueItem {
  /** Bề rộng cột nhãn từ `sm` trở lên (mặc định `10rem`). */
  labelWidth?: string;
  className?: string;
}

export interface KeyValueProps {
  items?: KeyValueItem[];
  /** Hoặc truyền `KeyValueRow` làm con. */
  children?: ReactNode;
  columns?: KeyValueColumns;
  variant?: KeyValueVariant;
  labelWidth?: string;
  className?: string;
}

export function KeyValueRow({
  label,
  value,
  hint,
  numeric = false,
  labelWidth = '10rem',
  className,
}: KeyValueRowProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-label sm:flex-row sm:gap-4', className)}>
      <dt
        style={{ width: labelWidth }}
        className="shrink-0 text-xs font-medium text-fg-muted"
      >
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 flex-col gap-label">
        <span className={cn('text-sm text-fg', numeric && 'tabular-nums')}>{value}</span>
        {hint ? <span className="text-xs text-fg-subtle">{hint}</span> : null}
      </dd>
    </div>
  );
}

export function KeyValue({
  items,
  children,
  columns = 1,
  variant = 'plain',
  labelWidth = '10rem',
  className,
}: KeyValueProps) {
  const gridClass =
    columns === 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : columns === 2
        ? 'sm:grid-cols-2'
        : '';

  const rowClass = variant === 'panel' ? 'border-b border-line-subtle px-3 py-2 last:border-b-0' : undefined;

  return (
    <dl
      className={cn(
        'grid gap-block',
        gridClass,
        variant === 'panel' &&
          'gap-0 overflow-hidden rounded-md border border-line-subtle bg-surface',
        className,
      )}
    >
      {items?.map((item, index) => (
        <KeyValueRow
          key={`${index}-${typeof item.label === 'string' ? item.label : 'kv'}`}
          {...item}
          labelWidth={labelWidth}
          className={rowClass}
        />
      ))}
      {children}
    </dl>
  );
}
