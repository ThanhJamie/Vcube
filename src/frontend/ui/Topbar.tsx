/**
 * Topbar — thanh trên cùng của `AppShell`, cao **56px** (spec: 21-saas-spec.md §3).
 *
 * Hợp đồng:
 * - Slots theo vai trò: `leading` (nút mở điều hướng mobile / nút quay lại), `breadcrumb`,
 *   `search` (ô tìm kiếm lệnh — ẩn dưới `md` để không tràn 390px), `actions` (CTA chính),
 *   `avatar` (menu tài khoản).
 * - **Không** lặp lại nav storefront (điều hướng nằm ở `SideNav`).
 * - `sticky` (mặc định): dính trên cùng với `z-header`; chỉ bật khi topbar là con trực tiếp
 *   của vùng cuộn — `AppShell` đã lo việc này.
 */

import type { ReactNode } from 'react';
import { cn } from './cn';

export interface TopbarProps {
  leading?: ReactNode;
  breadcrumb?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  avatar?: ReactNode;
  sticky?: boolean;
  label?: string;
  className?: string;
  searchClassName?: string;
}

export function Topbar({
  leading,
  breadcrumb,
  search,
  actions,
  avatar,
  sticky = true,
  label = 'Thanh trên cùng',
  className,
  searchClassName,
}: TopbarProps) {
  return (
    <header
      aria-label={label}
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 border-b border-line-subtle bg-surface px-3 sm:px-4',
        sticky && 'sticky top-0 z-header',
        className,
      )}
    >
      {leading ? <div className="flex shrink-0 items-center gap-1">{leading}</div> : null}

      {breadcrumb ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">{breadcrumb}</div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      {search ? (
        <div className={cn('hidden w-64 shrink-0 md:block', searchClassName)}>{search}</div>
      ) : null}

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {avatar}
      </div>
    </header>
  );
}
