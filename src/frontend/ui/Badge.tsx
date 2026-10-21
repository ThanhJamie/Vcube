/**
 * Badge — nhãn trạng thái nhỏ (spec: docs/design/tokens.md §8).
 *
 * - 6 biến thể: `neutral` / `success` / `warning` / `danger` / `info` / `technical`.
 *   `technical` = badge mang sắc `primary-tint` (dùng cho nhãn kỹ thuật trên ảnh/HUD).
 * - Cỡ chữ `text-xs` = **12px** — đúng sàn chữ, không nhỏ hơn.
 * - `rounded-full` (pill) + nền tint + chữ màu đặc + viền cùng màu 20% — DESIGN-LANGUAGE
 *   §1.4/§3.4. Tỉ lệ tương phản đã đo: positive 5.21 · warning 4.84 · danger 5.72 ·
 *   info 5.55 · primary 15.20 (đều đạt AA cho chữ 12px).
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

const BASE = 'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap';

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'border-line bg-surface-muted text-fg-muted',
  success: 'border-positive/20 bg-positive-tint text-positive',
  warning: 'border-warning/20 bg-warning-tint text-warning',
  danger: 'border-danger/20 bg-danger-tint text-danger',
  info: 'border-info/20 bg-info-tint text-info',
  technical: 'border-primary/20 bg-primary-tint text-primary',
};

const SIZE: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

const DOT: Record<BadgeVariant, string> = {
  neutral: 'bg-fg-subtle',
  success: 'bg-positive',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  technical: 'bg-primary',
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
