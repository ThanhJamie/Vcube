/**
 * Badge — nhãn trạng thái nhỏ (spec: docs/design/tokens.md §8).
 *
 * - 6 biến thể: `neutral` / `success` / `warning` / `danger` / `info` / `technical`.
 *   `technical` = chữ `text-accent` trên nền `bg-surface-inverse` (panel HUD tối).
 * - Cỡ chữ `text-xs` = **12px** — đúng sàn chữ, không nhỏ hơn.
 * - `rounded-sm` (6px) theo bảng radius.
 * - Nền dùng `bg-surface` + viền màu + chữ màu (KHÔNG dùng nền tint 10%): tint làm
 *   tương phản chữ tụt xuống ~4.4:1, dưới ngưỡng AA 4.5:1 cho chữ 12px. Cách này giữ
 *   `positive` 5.02:1 / `danger` 6.47:1 (light) và các màu dark đều > 5:1.
 * - Trạng thái không chỉ bằng màu: chữ trong badge là nguồn nghĩa chính; có thể thêm
 *   `icon`/`dot` để nhấn thêm.
 */

import type { ReactNode } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'technical';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Icon lucide đã render (nên `aria-hidden`) hoặc bất kỳ node nào. */
  icon?: ReactNode;
  /** Thêm chấm màu phía trước (chỉ trang trí — nghĩa nằm ở chữ). */
  dot?: boolean;
  className?: string;
  title?: string;
}

const BASE = 'inline-flex items-center gap-1 rounded-sm border font-medium whitespace-nowrap';

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'border-line bg-surface-muted text-fg-muted',
  success: 'border-positive/40 bg-surface text-positive',
  warning: 'border-warning/40 bg-surface text-warning',
  danger: 'border-danger/40 bg-surface text-danger',
  info: 'border-info/40 bg-surface text-info',
  technical: 'border-transparent bg-surface-inverse text-accent',
};

const SIZE: Record<BadgeSize, string> = {
  sm: 'h-5 px-1.5 text-xs',
  md: 'h-6 px-2 text-xs',
};

const DOT: Record<BadgeVariant, string> = {
  neutral: 'bg-fg-subtle',
  success: 'bg-positive',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  technical: 'bg-accent',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  dot = false,
  className,
  title,
}: BadgeProps) {
  return (
    <span title={title} className={cn(BASE, VARIANT[variant], SIZE[size], className)}>
      {dot ? <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', DOT[variant])} /> : null}
      {icon}
      {children}
    </span>
  );
}
