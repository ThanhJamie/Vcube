/**
 * PageHeader — đầu trang chuẩn cho mọi trang (spec: docs/plans/21-saas-spec.md §3 + §4).
 *
 * Thứ tự bắt buộc: **breadcrumb → tiêu đề (+ mô tả) + hành động → tabs → slot phụ**.
 * - `title` là `h1` DUY NHẤT của trang (`titleAs='h2'` khi nhúng vào ngăn kéo/panel).
 * - `breadcrumb`: mảng `{ label, href?, onClick? }`; mục cuối là trang hiện tại
 *   (`aria-current="page"`). Có `href` -> `<a>`; chỉ có `onClick` -> `<button>`.
 * - `tabs`: `role="tablist"`; mục active có gạch chân `border-primary`. Truyền `href`
 *   để tab là link (điều hướng thật) hoặc `onTabChange` để tab là nút.
 * - Nhịp dọc theo token: `gap-block` (16px) giữa các khối, `gap-label` (4px) giữa
 *   tiêu đề và mô tả.
 */

import { ChevronRight } from 'lucide-react';
import { Fragment, createElement } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface PageHeaderBreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface PageHeaderTabItem {
  id: string;
  label: ReactNode;
  /** Badge/chip nhỏ cạnh nhãn (chỉ render khi có — đừng truyền số 0). */
  badge?: ReactNode;
  href?: string;
  disabled?: boolean;
  /** Tên không đổi khi tab là biểu tượng — hiếm dùng. */
  'aria-label'?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: PageHeaderBreadcrumbItem[];
  tabs?: PageHeaderTabItem[];
  /** `id` của tab đang chọn (controlled). */
  activeTab?: string;
  onTabChange?: (id: string) => void;
  titleAs?: 'h1' | 'h2';
  titleId?: string;
  /** Slot dưới tabs — thường là `Toolbar`. */
  children?: ReactNode;
  breadcrumbLabel?: string;
  tabsLabel?: string;
  className?: string;
  actionsClassName?: string;
}

const TAB_BASE = [
  'relative inline-flex min-h-11 items-center gap-2 rounded-t-md border-b-2 px-3 text-sm',
  'transition-colors duration-150 ease-out motion-reduce:transition-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  tabs,
  activeTab,
  onTabChange,
  titleAs = 'h1',
  titleId,
  children,
  breadcrumbLabel = 'Đường dẫn',
  tabsLabel = 'Mục trong trang',
  className,
  actionsClassName,
}: PageHeaderProps) {
  const crumbs = breadcrumb ?? [];
  const tabItems = tabs ?? [];

  return (
    <header className={cn('flex flex-col gap-block', className)}>
      {crumbs.length > 0 ? (
        <nav aria-label={breadcrumbLabel}>
          <ol className="flex flex-wrap items-center gap-1 text-xs text-fg-muted">
            {crumbs.map((item, index) => {
              const isLast = index === crumbs.length - 1;
              const key = `${index}-${typeof item.label === 'string' ? item.label : 'crumb'}`;

              let node: ReactNode;
              if (isLast) {
                node = (
                  <span aria-current="page" className="font-medium text-fg">
                    {item.label}
                  </span>
                );
              } else if (item.href) {
                node = (
                  <a
                    href={item.href}
                    className="rounded-sm hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                  </a>
                );
              } else {
                node = (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="rounded-sm hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                  </button>
                );
              }

              return (
                <Fragment key={key}>
                  {index > 0 ? (
                    <li aria-hidden="true" className="flex items-center">
                      <ChevronRight className="size-3.5 shrink-0 text-fg-subtle" />
                    </li>
                  ) : null}
                  <li className="flex min-w-0 items-center">{node}</li>
                </Fragment>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-block sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-label">
          {createElement(
            titleAs,
            {
              id: titleId,
              className: 'text-xl font-semibold tracking-tight text-fg',
            },
            title,
          )}
          {description ? (
            <p className="max-w-prose text-sm text-fg-muted">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className={cn('flex flex-wrap items-center gap-2 sm:shrink-0', actionsClassName)}>
            {actions}
          </div>
        ) : null}
      </div>

      {tabItems.length > 0 ? (
        <div
          role="tablist"
          aria-label={tabsLabel}
          className="flex flex-wrap items-center gap-1 border-b border-line-subtle"
        >
          {tabItems.map((tab) => {
            const selected = activeTab === tab.id;
            const tabClass = cn(
              TAB_BASE,
              selected
                ? 'border-primary font-medium text-fg'
                : 'border-transparent text-fg-muted hover:text-fg',
              tab.disabled && 'pointer-events-none opacity-50',
            );
            const inner = (
              <>
                <span>{tab.label}</span>
                {tab.badge != null ? (
                  <span className="inline-flex items-center rounded-sm bg-surface-muted px-1.5 text-xs font-medium tabular-nums text-fg-muted">
                    {tab.badge}
                  </span>
                ) : null}
              </>
            );

            if (tab.href) {
              return (
                <a
                  key={tab.id}
                  href={tab.href}
                  role="tab"
                  aria-selected={selected}
                  aria-label={tab['aria-label']}
                  className={tabClass}
                >
                  {inner}
                </a>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={tab['aria-label']}
                disabled={tab.disabled}
                onClick={() => onTabChange?.(tab.id)}
                className={tabClass}
              >
                {inner}
              </button>
            );
          })}
        </div>
      ) : null}

      {children}
    </header>
  );
}
