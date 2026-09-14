/**
 * StatCard — thẻ số liệu, dựng trên `Card` (spec §8).
 *
 * - Nhãn + giá trị (`tabular-nums`) + delta + trạng thái loading (skeleton ĐÚNG layout:
 *   xương cho nhãn/giá trị/delta, không phải spinner).
 * - Delta không chỉ thể hiện bằng màu: có icon mũi tên (tăng/giảm/không đổi) + chữ cho
 *   screen reader (`direction` + `label`) — theo luật "không truyền đạt trạng thái chỉ
 *   bằng màu".
 * - Giá trị rỗng: để `Money`/`formatCurrency` quyết định ('—'), không bịa 0.
 * - ĐỔI 2026-09-20 (redesign Modern SaaS, `docs/plans/21-saas-spec.md` §2.1/§4):
 *   **bỏ nền tint** quanh icon — thẻ KPI chỉ còn **nhãn + số + delta**; icon giữ 20px
 *   (§1.3 "icon trong thẻ KPI giữ 20–30px, KHÔNG thu nhỏ") và không có khung nền.
 */

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { createElement, isValidElement } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { cn } from './cn';

export type StatDeltaDirection = 'up' | 'down' | 'flat';
export type StatDeltaTone = 'positive' | 'negative' | 'neutral';
export type StatCardIcon = ComponentType<Record<string, unknown>> | ReactElement;

export interface StatDelta {
  /** Đã format sẵn (thường là `<Money signed />` hoặc `formatPercent`). */
  value: ReactNode;
  direction?: StatDeltaDirection;
  /** Mặc định suy từ `direction`; truyền tay khi "giảm" lại là tin tốt. */
  tone?: StatDeltaTone;
  /** Ngữ cảnh cho screen reader, ví dụ "so với 7 ngày trước". */
  label?: string;
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  delta?: StatDelta;
  icon?: StatCardIcon;
  hint?: ReactNode;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

const TONE: Record<StatDeltaTone, string> = {
  positive: 'text-positive',
  negative: 'text-danger',
  neutral: 'text-fg-muted',
};

const DIRECTION_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

const DIRECTION_TEXT: Record<StatDeltaDirection, string> = {
  up: 'tăng',
  down: 'giảm',
  flat: 'không đổi',
};

export function StatCard({
  label,
  value,
  delta,
  icon,
  hint,
  loading = false,
  className,
  onClick,
}: StatCardProps) {
  const iconNode = isValidElement(icon)
    ? icon
    : icon
      ? createElement(icon as ComponentType<Record<string, unknown>>, {
          className: 'size-5',
          size: 20,
          'aria-hidden': true,
        })
      : null;

  if (loading) {
    return (
      <Card padding="md" className={cn('flex flex-col gap-3', className)}>
        <Skeleton variant="text" width="40%" label={`Đang tải ${typeof label === 'string' ? label : 'số liệu'}`} />
        <Skeleton variant="text" height="1.75rem" width="60%" />
        <Skeleton variant="text" width="30%" />
      </Card>
    );
  }

  const direction = delta?.direction ?? 'flat';
  const DirectionIcon = DIRECTION_ICON[direction];
  const tone: StatDeltaTone = delta?.tone ?? (direction === 'up' ? 'positive' : direction === 'down' ? 'negative' : 'neutral');

  return (
    <Card
      padding="md"
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={cn('flex flex-col gap-2', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-fg-muted">{label}</p>
        {iconNode ? (
          <span aria-hidden="true" className="shrink-0 text-fg-subtle">
            {iconNode}
          </span>
        ) : null}
      </div>

      <p className="text-2xl font-semibold tabular-nums tracking-tight text-fg">{value}</p>

      {delta ? (
        <p className={cn('flex flex-wrap items-center gap-1 text-xs tabular-nums', TONE[tone])}>
          <DirectionIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only">{DIRECTION_TEXT[direction]} </span>
          <span className="font-medium">{delta.value}</span>
          {delta.label ? <span className="text-fg-subtle">{delta.label}</span> : null}
        </p>
      ) : null}

      {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
    </Card>
  );
}
