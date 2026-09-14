/**
 * Money — hiển thị tiền tệ qua `formatCurrency` (spec §8 + `docs/design/data-honesty.md`).
 *
 * - KHÔNG tự thêm ký hiệu tiền tệ: mọi ký hiệu/định dạng đến từ `formatCurrency`
 *   (`src/frontend/lib/format.ts`), nên toàn app chỉ có một quy ước `vi-VN` + `₫`.
 * - `tabular-nums` bắt buộc (mọi cột số, spec §4).
 * - Giá trị thiếu (`null`/`undefined`/`NaN`) -> `EMPTY_VALUE` ('—') do `formatCurrency`
 *   trả về, KHÔNG bịa `0 ₫`.
 * - `signed`: cho delta. Chỉ thêm dấu `+` khi giá trị **dương** (Intl đã tự thêm `-` cho
 *   số âm) — đây là dấu của phép so sánh, không phải ký hiệu tiền tệ.
 * - `tone`: màu cho delta; nhớ kèm icon/mũi tên ở component cha để không truyền đạt
 *   trạng thái chỉ bằng màu.
 */

import { EMPTY_VALUE, formatCurrency } from '@frontend/lib/format';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type MoneySize = 'sm' | 'base' | 'heading';
export type MoneyTone = 'inherit' | 'positive' | 'negative' | 'muted';
export type MoneyElement = 'span' | 'div' | 'p' | 'strong' | 'td';

export interface MoneyProps {
  value: number | string | null | undefined;
  size?: MoneySize;
  /** Delta: thêm dấu `+` cho giá trị dương. */
  signed?: boolean;
  currency?: string;
  locale?: string;
  maximumFractionDigits?: number;
  /** Mặc định suy ra từ `value` khi `signed`; ngược lại là `inherit`. */
  tone?: MoneyTone;
  as?: MoneyElement;
  className?: string;
  title?: string;
  children?: ReactNode;
}

const SIZE: Record<MoneySize, string> = {
  sm: 'text-xs',
  base: 'text-sm',
  heading: 'text-lg font-semibold',
};

const TONE: Record<MoneyTone, string> = {
  inherit: '',
  positive: 'text-positive',
  negative: 'text-danger',
  muted: 'text-fg-muted',
};

function toNumber(value: MoneyProps['value']): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function Money({
  value,
  size = 'base',
  signed = false,
  currency,
  locale,
  maximumFractionDigits,
  tone,
  as: Tag = 'span',
  className,
  title,
}: MoneyProps) {
  const numeric = toNumber(value);
  const formatted = formatCurrency(value, { currency, locale, maximumFractionDigits });

  const resolvedTone: MoneyTone =
    tone ?? (signed && numeric !== null ? (numeric > 0 ? 'positive' : numeric < 0 ? 'negative' : 'inherit') : 'inherit');

  const prefix = signed && numeric !== null && numeric > 0 ? '+' : '';

  return (
    <Tag
      title={title}
      className={cn('tabular-nums', SIZE[size], TONE[resolvedTone], className)}
      data-empty={formatted === EMPTY_VALUE ? 'true' : undefined}
    >
      {`${prefix}${formatted}`}
    </Tag>
  );
}
