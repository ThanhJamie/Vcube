/**
 * Skeleton — khối xương đúng layout (spec §8: "loading là skeleton đúng layout, KHÔNG
 * phải spinner toàn trang").
 *
 * - 3 biến thể: `text` (1 hoặc nhiều dòng), `rect` (khối), `circle` (avatar/icon).
 * - Màu `bg-line-subtle` — nhìn thấy được ở cả light (xám sáng) và dark (navy mờ), khác
 *   với `bg-surface-muted` gần như vô hình trên nền `bg-surface`.
 * - Tôn trọng `prefers-reduced-motion`: `motion-reduce:animate-none` + `index.css` đã có
 *   media query hạ `animation-duration` toàn cục.
 * - Mặc định `aria-hidden` (trang trí). Truyền `label` khi cần công bố cho screen reader
 *   ("Đang tải danh sách đơn hàng") — khi đó khối được bọc `role="status"`.
 */

import type { CSSProperties } from 'react';
import { cn } from './cn';

export type SkeletonVariant = 'text' | 'rect' | 'circle';
export type SkeletonRounded = 'sm' | 'md' | 'lg' | 'full';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Chỉ dùng cho `variant='text'`: số dòng (mặc định 1). */
  lines?: number;
  /** Chuỗi CSS: '12rem', '60%', '8ch'… */
  width?: string;
  height?: string;
  rounded?: SkeletonRounded;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const BAR = 'animate-pulse bg-line-subtle motion-reduce:animate-none';

const ROUNDED: Record<SkeletonRounded, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  variant = 'text',
  lines = 1,
  width,
  height,
  rounded = 'md',
  label,
  className,
  style,
}: SkeletonProps) {
  const shape =
    variant === 'circle' ? 'rounded-full' : variant === 'rect' ? ROUNDED[rounded] : 'rounded-sm';

  const sizeClass =
    variant === 'circle' ? 'size-8' : variant === 'rect' ? (height ? '' : 'h-12 w-full') : 'h-3 w-full';

  const barStyle: CSSProperties = {
    ...(width ? { width } : null),
    ...(height ? { height } : null),
    ...style,
  };

  const content =
    variant === 'text' && lines > 1 ? (
      <div className={cn('flex w-full flex-col gap-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <span
            key={index}
            aria-hidden="true"
            style={index === lines - 1 ? { ...barStyle, width: width ?? '60%' } : barStyle}
            className={cn(BAR, 'h-3', ROUNDED.sm, index === lines - 1 && !width && 'w-3/5', index !== lines - 1 && 'w-full')}
          />
        ))}
      </div>
    ) : (
      <span aria-hidden="true" style={barStyle} className={cn(BAR, shape, sizeClass, className)} />
    );

  if (label) {
    return (
      <div role="status" aria-label={label} className="contents">
        {content}
      </div>
    );
  }

  return content;
}
