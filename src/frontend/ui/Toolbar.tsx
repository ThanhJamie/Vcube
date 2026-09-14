/**
 * Toolbar — một hàng công cụ cao **44px** phía trên vùng dữ liệu
 * (spec: docs/plans/21-saas-spec.md §4).
 *
 * Hợp đồng:
 * - Đúng MỘT hàng ở desktop (`min-h-11` = 44px); hẹp hơn `sm` thì tự xuống dòng thay vì
 *   tràn ngang (390px là bề rộng chặn của QA).
 * - Slot theo đúng vai trò: `search` (ô tìm kiếm), `filters` (select/chip lọc),
 *   `viewToggle` (segmented đổi cách xem), `bulkActions` (hành động khi đã chọn nhiều),
 *   thêm `leading`/`trailing` cho ngoại lệ.
 * - `role="toolbar"` + `aria-label` (mặc định "Công cụ") để screen reader gom nhóm.
 * - `variant="panel"`: thêm viền nhạt + nền surface khi toolbar nằm rời trong trang.
 *   Mặc định `plain` vì phần lớn toolbar nằm ngay dưới `PageHeader` (không cần viền).
 * - Nút trong toolbar nên dùng `Button size="sm"` + icon **16px** (§1.3).
 */

import type { ReactNode } from 'react';
import { cn } from './cn';

export type ToolbarVariant = 'plain' | 'panel';

export interface ToolbarProps {
  search?: ReactNode;
  filters?: ReactNode;
  viewToggle?: ReactNode;
  bulkActions?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  variant?: ToolbarVariant;
  sticky?: boolean;
  label?: string;
  className?: string;
  /** Bọc ô tìm kiếm: mặc định `sm:max-w-xs`. */
  searchClassName?: string;
}

const VARIANT: Record<ToolbarVariant, string> = {
  plain: '',
  panel: 'rounded-md border border-line-subtle bg-surface px-2',
};

export function Toolbar({
  search,
  filters,
  viewToggle,
  bulkActions,
  leading,
  trailing,
  variant = 'plain',
  sticky = false,
  label = 'Công cụ',
  className,
  searchClassName,
}: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        'flex min-h-11 flex-wrap items-center gap-2',
        VARIANT[variant],
        sticky && 'sticky top-0 z-sticky bg-canvas',
        className,
      )}
    >
      {leading ? <div className="flex items-center gap-2">{leading}</div> : null}

      {search ? (
        <div className={cn('min-w-0 flex-1 sm:max-w-xs', searchClassName)}>{search}</div>
      ) : null}

      {filters ? (
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {viewToggle}
        {bulkActions ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-surface-muted px-2 py-1">
            {bulkActions}
          </div>
        ) : null}
        {trailing}
      </div>
    </div>
  );
}
