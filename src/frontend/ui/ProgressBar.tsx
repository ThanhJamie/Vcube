/**
 * ProgressBar — tiến độ có số đo thật (spec §8 + qa-checklist: upload/parse CAD phải
 * minh bạch %, dung lượng và thời gian còn lại).
 *
 * Hợp đồng:
 * - Hiện **%**, **bytes** (`formatBytes`) và **ETA** cùng lúc, đều `tabular-nums`.
 * - `role="progressbar"` + `aria-valuenow/min/max` + `aria-valuetext` gộp cả ba thông tin
 *   (screen reader nghe được đầy đủ, không chỉ một con số trần).
 * - `value` rỗng -> chế độ không xác định (indeterminate): KHÔNG bịa số 0%.
 * - `onCancel` -> nút "Huỷ" (hành động tần suất thấp, có nhãn chữ).
 * - Không animate theo mặc định (`animated=false`): tiến độ upload cập nhật liên tục nên
 *   transition sẽ giật (spec §7: không animate hành động tần suất cao).
 */

import { useId } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from './cn';
import { EMPTY_VALUE, formatBytes, formatPercent } from '@frontend/lib/format';

export type ProgressSize = 'sm' | 'md';

export interface ProgressBytes {
  loaded: number;
  total?: number | null;
}

export interface ProgressBarProps {
  /** Giá trị hiện tại; `null`/`undefined` = không xác định. */
  value?: number | null;
  max?: number;
  label?: ReactNode;
  bytes?: number | ProgressBytes | null;
  /** Số giây còn lại, hoặc chuỗi đã format sẵn ("~2 phút"). */
  eta?: number | string | null;
  onCancel?: () => void;
  cancelLabel?: string;
  size?: ProgressSize;
  animated?: boolean;
  indeterminate?: boolean;
  showPercent?: boolean;
  className?: string;
}

const SIZE: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2',
};

/** 90 -> "1 ph 30 gi"; 30 -> "30 gi"; 4000 -> "1 giờ 6 ph". */
export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return EMPTY_VALUE;

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  if (hours > 0) return `${hours} giờ ${minutes} ph`;
  if (minutes > 0) return `${minutes} ph ${String(rest).padStart(2, '0')} gi`;
  return `${rest} gi`;
}

function formatBytesPart(bytes: number | ProgressBytes | null | undefined): string | null {
  if (bytes === null || bytes === undefined) return null;
  if (typeof bytes === 'number') return formatBytes(bytes);
  const loaded = formatBytes(bytes.loaded);
  if (bytes.total === null || bytes.total === undefined) return loaded;
  return `${loaded} / ${formatBytes(bytes.total)}`;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  bytes,
  eta,
  onCancel,
  cancelLabel = 'Huỷ',
  size = 'md',
  animated = false,
  indeterminate,
  showPercent = true,
  className,
}: ProgressBarProps) {
  const labelId = useId();

  const isIndeterminate = indeterminate ?? (value === null || value === undefined);
  const safeMax = max > 0 ? max : 100;
  const ratio = isIndeterminate ? 0 : Math.min(1, Math.max(0, (value as number) / safeMax));
  const percent = ratio * 100;
  const percentLabel = formatPercent(percent);

  const bytesLabel = formatBytesPart(bytes);
  const etaLabel = typeof eta === 'number' ? formatEta(eta) : (eta ?? null);

  const valueText = isIndeterminate
    ? 'Đang xử lý, chưa xác định được tiến độ'
    : [percentLabel, bytesLabel, etaLabel ? `còn ${etaLabel}` : null].filter(Boolean).join(', ');

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {label ? (
          <span id={labelId} className="text-xs font-medium text-fg-muted">
            {label}
          </span>
        ) : null}

        <span className="ml-auto flex flex-wrap items-baseline gap-2 text-xs tabular-nums text-fg-muted">
          {showPercent ? <span className="font-medium text-fg">{isIndeterminate ? EMPTY_VALUE : percentLabel}</span> : null}
          {bytesLabel ? <span>{bytesLabel}</span> : null}
          {etaLabel ? <span>Còn {etaLabel}</span> : null}
        </span>

        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : 'Tiến độ'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isIndeterminate ? undefined : Math.round(percent)}
        aria-valuetext={valueText}
        className={cn('w-full overflow-hidden rounded-full bg-surface-muted', SIZE[size])}
      >
        <div
          className={cn(
            'h-full rounded-full',
            animated && 'transition-[width] duration-200 ease-out motion-reduce:transition-none',
            isIndeterminate ? 'w-full animate-pulse bg-primary/40 motion-reduce:animate-none' : 'bg-primary',
          )}
          style={isIndeterminate ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
