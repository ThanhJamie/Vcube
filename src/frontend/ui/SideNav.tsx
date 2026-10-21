/**
 * SideNav — điều hướng dọc của `AppShell` (spec: docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md §3.7).
 *
 * Hợp đồng:
 * - Rộng **240px** (`w-60`), thu gọn **64px** (`w-16`) — kích thước do `AppShell` đặt,
 *   `SideNav` chỉ lo nội dung.
 * - `variant="tint"` (MẶC ĐỊNH — giữ nguyên console v2): mục đang chọn nền
 *   `bg-primary-tint` + chữ `text-fg font-semibold` + **vạch nhấn trái** `bg-primary`
 *   (không chỉ dựa vào màu chữ) + `aria-current="page"`.
 * - `variant="pill"` (v3, opt-in): nav nằm trên nền `bg-canvas`, mục đang chọn là
 *   **pill trắng `bg-surface` + `shadow-soft`**, bỏ vạch dọc; bo `rounded-full`.
 *   Dùng cho console v3 (D2 hybrid) và các nav dọc mới; không đổi mặc định.
 * - Badge số **chỉ hiện khi có giá trị** — nơi gọi truyền `badge={count > 0 ? … : null}`
 *   để "0" không bao giờ được vẽ (`docs/design/data-honesty.md`).
 * - Icon điều hướng **18px** (`size-4.5`) — giữ nguyên (không thu nhỏ như icon trong control).
 * - Mỗi mục cao ≥44px (`min-h-11`) để đạt đích chạm trên mobile.
 * - Mục có `href` render `<a>`, chỉ có `onClick` render `<button>`.
 * - Thu gọn: nhãn ẩn khỏi màn hình nhưng vẫn nằm trong DOM ở dạng `sr-only`? **Không** —
 *   ở chế độ thu gọn mỗi mục được đặt `title` + `aria-label` = nhãn, tránh chồng chữ.
 */

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';
import type { ReactNode } from 'react';

export interface SideNavItem {
  id: string;
  label: string;
  /** Icon lucide đã render (18px) — `aria-hidden` do nơi gọi đặt. */
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Badge số — CHỈ truyền khi > 0. */
  badge?: ReactNode;
  active?: boolean;
  disabled?: boolean;
}

export interface SideNavGroup {
  id?: string;
  /** Nhãn nhóm (chữ nhỏ, in hoa). */
  label?: string;
  items: SideNavItem[];
}

/** `tint` = tint + vạch dọc (mặc định) · `pill` = pill trắng + shadow (v3 storefront/console mới). */
export type SideNavVariant = 'tint' | 'pill';

export interface SideNavProps {
  /** Mặc định `tint` (console v2). `pill` là biến thể opt-in của v3. */
  variant?: SideNavVariant;
  /** Nhóm có nhãn — dùng cho nav nhiều miền nghiệp vụ. */
  groups?: SideNavGroup[];
  /** Danh sách phẳng (không nhãn nhóm). */
  items?: SideNavItem[];
  /** Logo/khu thương hiệu — cao 56px để thẳng hàng với `Topbar`. */
  header?: ReactNode;
  footer?: ReactNode;
  activeId?: string;
  onSelect?: (id: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapseLabel?: string;
  expandLabel?: string;
  label?: string;
  className?: string;
}

const ITEM_BASE = [
  'relative flex min-h-11 w-full items-center gap-3 px-3 py-2 text-sm font-medium',
  'transition-colors duration-200 ease-out motion-reduce:transition-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

/** Mặc định giữ `rounded-md` (12px); pill chỉ bật khi nơi gọi chọn `variant="pill"`. */
const ITEM_RADIUS: Record<SideNavVariant, string> = {
  tint: 'rounded-md',
  pill: 'rounded-full',
};

const ROOT_BG: Record<SideNavVariant, string> = {
  tint: 'bg-surface',
  pill: 'bg-canvas',
};

const ACTIVE: Record<SideNavVariant, string> = {
  tint: 'bg-primary-tint font-semibold text-fg',
  pill: 'bg-surface font-semibold text-fg shadow-soft',
};

function ItemNode({
  item,
  active,
  collapsed,
  variant,
  onSelect,
}: {
  item: SideNavItem;
  active: boolean;
  collapsed: boolean;
  variant: SideNavVariant;
  onSelect?: (id: string) => void;
}) {
  const content = (
    <>
      {active && variant === 'tint' ? (
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-primary"
        />
      ) : null}

      {item.icon ? (
        <span aria-hidden="true" className="flex size-4.5 shrink-0 items-center justify-center">
          {item.icon}
        </span>
      ) : null}

      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{item.label}</span>}

      {!collapsed && item.badge != null ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-surface-muted px-2 text-xs font-medium tabular-nums text-fg-muted">
          {item.badge}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    ITEM_BASE,
    ITEM_RADIUS[variant],
    collapsed && 'justify-center px-0',
    active ? ACTIVE[variant] : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
    item.disabled && 'pointer-events-none opacity-50',
  );

  const handleClick = () => {
    if (item.disabled) return;
    item.onClick?.();
    onSelect?.(item.id);
  };

  if (item.href) {
    return (
      <a
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={handleClick}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      disabled={item.disabled}
      onClick={handleClick}
      className={className}
    >
      {content}
    </button>
  );
}

export function SideNav({
  variant = 'tint',
  groups,
  items,
  header,
  footer,
  activeId,
  onSelect,
  collapsed = false,
  onCollapsedChange,
  collapseLabel = 'Thu gọn điều hướng',
  expandLabel = 'Mở rộng điều hướng',
  label = 'Điều hướng chính',
  className,
}: SideNavProps) {
  const resolvedGroups: SideNavGroup[] =
    groups && groups.length > 0
      ? groups
      : [{ items: items ?? [] }];

  return (
    <nav
      aria-label={label}
      className={cn('flex h-full min-h-0 flex-col gap-2', ROOT_BG[variant], className)}
    >
      <div className={cn('flex h-14 shrink-0 items-center gap-3 px-3', collapsed && 'justify-center px-0')}>
        {header}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-block overflow-y-auto px-2 pb-2">
        {resolvedGroups.map((group, groupIndex) => (
          <div key={group.id ?? groupIndex} className="flex flex-col gap-1">
            {group.label && !collapsed ? (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                {group.label}
              </p>
            ) : null}

            {group.items.map((item) => (
              <ItemNode
                key={item.id}
                item={item}
                active={item.active ?? item.id === activeId}
                collapsed={collapsed}
                variant={variant}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>

      {footer ? <div className="shrink-0 px-3 pb-3">{footer}</div> : null}

      {onCollapsedChange ? (
        <div
          className={cn(
            'shrink-0 border-t border-line-subtle p-2',
            collapsed && 'flex justify-center',
          )}
        >
          <Button
            iconOnly
            variant="ghost"
            size="sm"
            aria-label={collapsed ? expandLabel : collapseLabel}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? (
              <ChevronsRight aria-hidden="true" className="size-4" />
            ) : (
              <ChevronsLeft aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
