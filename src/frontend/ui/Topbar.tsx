/**
 * Topbar — thanh trên cùng của `AppShell`, cao **56px** (spec: 21-saas-spec.md §3).
 *
 * Hợp đồng:
 * - Slots theo vai trò: `leading` (nút mở điều hướng mobile / nút quay lại), `brand`
 *   (logo/khu thương hiệu — chỉ render node, nơi gọi tự ẩn chữ dưới `sm`), `breadcrumb`,
 *   `search` (ô tìm kiếm lệnh — ẩn dưới `md` để không tràn 390px), `actions` (CTA chính),
 *   `avatar` (menu tài khoản).
 * - **Không** lặp lại nav storefront (điều hướng nằm ở `SideNav`).
 * - `sticky` (mặc định): dính trên cùng với `z-header`; chỉ bật khi topbar là con trực tiếp
 *   của vùng cuộn — `AppShell` đã lo việc này.
 * - `searchShape="pill"` (v3, opt-in): bo tròn ô tìm kiếm bên trong slot `search` bằng
 *   class con `[&_input]:rounded-full` — **không** đổi chiều cao 56px, không đổi hành vi,
 *   không cần sửa call-site. Mặc định `default` giữ nguyên control 12px.
 */

import type { ReactNode } from 'react';
import { cn } from './cn';

export type TopbarSearchShape = 'default' | 'pill';

export interface TopbarProps {
  leading?: ReactNode;
  /** Logo/khu thương hiệu — render giữa `leading` và `breadcrumb`, không co giãn. */
  brand?: ReactNode;
  breadcrumb?: ReactNode;
  search?: ReactNode;
  /** `pill` chỉ đổi bán kính ô search bên trong slot — mặc định `default` (12px). */
  searchShape?: TopbarSearchShape;
  actions?: ReactNode;
  avatar?: ReactNode;
  sticky?: boolean;
  label?: string;
  className?: string;
  searchClassName?: string;
}

export function Topbar({
  leading,
  brand,
  breadcrumb,
  search,
  searchShape = 'default',
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
        'flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur-md sm:px-4',
        sticky && 'sticky top-0 z-header',
        className,
      )}
    >
      {leading ? <div className="flex shrink-0 items-center gap-1">{leading}</div> : null}

      {brand ? <div className="flex shrink-0 items-center gap-2">{brand}</div> : null}

      {breadcrumb ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">{breadcrumb}</div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      {search ? (
        <div
          className={cn(
            'hidden w-64 shrink-0 md:block',
            searchShape === 'pill' && '[&_input]:rounded-full',
            searchClassName,
          )}
        >
          {search}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {avatar}
      </div>
    </header>
  );
}
