/**
 * AppShell — khung dashboard dùng chung cho khu ĐÃ ĐĂNG NHẬP
 * (`/admin`, `/lab`, `/designer`, `/orders`, `/assets`) — spec: docs/plans/21-saas-spec.md §3.
 *
 * Bố cục:
 * - `SideNav` trái: **240px** (`w-60`), thu gọn **64px** (`w-16`); dưới `lg` chuyển thành
 *   drawer trượt từ trái (dùng `Sheet side="left"` — cùng cơ chế `<dialog>` của `Modal`,
 *   nên có top-layer + focus trap + Esc).
 * - `Topbar` cao **56px**.
 * - Vùng nội dung `PageHeader` + `Section`, bề rộng `max-w-[1400px]` (dashboard);
 *   `maxWidth="reading"` = `max-w-3xl` cho trang đọc (chi tiết, hoá đơn).
 *
 * ⚠️ **`AppShell`/`SideNav`/`Topbar` là primitive MỚI của Đợt 11A — CHƯA áp vào trang nào.**
 * Việc thay `AdminSidebar`/`AdminDashboardView` bằng `AppShell` thuộc Đợt 11B+ và phải làm
 * theo từng khu, không gộp (`21-saas-spec.md` §6).
 *
 * Lưu ý kỹ thuật:
 * - `sidebar` được render **hai lần** (một `<aside>` chỉ hiện từ `lg`, một trong `Sheet` chỉ
 *   hiện dưới `lg`). Đây là cách chuẩn để một nav vừa cố định vừa thành drawer; state bên
 *   trong `sidebar` (nếu có) sẽ tách thành hai bản — nên `SideNav` cố tình **không giữ state
 *   điều hướng nội bộ** ngoài `collapsed` do nơi gọi truyền vào.
 * - Có **skip link** tới `#<main>` để bàn phím nhảy qua điều hướng (WCAG 2.4.1).
 */

import { Menu } from 'lucide-react';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { cn } from './cn';

export type AppShellMaxWidth = 'dashboard' | 'reading' | 'full';

export interface AppShellNavControls {
  openNav: () => void;
  closeNav: () => void;
  navOpen: boolean;
}

export interface AppShellProps {
  /** Thường là `<SideNav … />`. */
  sidebar: ReactNode;
  /** Node, hoặc hàm nhận `{ openNav }` để gắn nút mở drawer vào `Topbar leading`. */
  topbar?: ReactNode | ((controls: AppShellNavControls) => ReactNode);
  children: ReactNode;
  footer?: ReactNode;
  /** Trạng thái thu gọn sidebar (controlled — nơi gọi giữ state). */
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  /** `dashboard` (mặc định) = `max-w-[1400px]`; `reading` = `max-w-3xl`. */
  maxWidth?: AppShellMaxWidth;
  /** Nhãn của `<main>` khi trang không có `h1` (mặc định "Nội dung chính"). */
  mainLabel?: string;
  /** Nhãn cho drawer mobile (`Sheet`). */
  navLabel?: string;
  skipLinkLabel?: string;
  /** Nút mở drawer mặc định (chỉ hiện dưới `lg`) — truyền `false` để tự làm nút khác. */
  showMobileNavButton?: boolean;
  openNavLabel?: string;
  className?: string;
  contentClassName?: string;
}

const MAX_WIDTH: Record<AppShellMaxWidth, string> = {
  dashboard: 'max-w-[1400px]',
  reading: 'max-w-3xl',
  full: 'max-w-none',
};

export function AppShell({
  sidebar,
  topbar,
  children,
  footer,
  collapsed = false,
  mobileOpen = false,
  onMobileOpenChange,
  maxWidth = 'dashboard',
  mainLabel = 'Nội dung chính',
  navLabel = 'Điều hướng khu vực',
  skipLinkLabel = 'Bỏ qua điều hướng',
  showMobileNavButton = true,
  openNavLabel = 'Mở điều hướng',
  className,
  contentClassName,
}: AppShellProps) {
  const mainId = `app-shell-main-${useId().replace(/:/g, '')}`;

  const openNav = () => onMobileOpenChange?.(true);
  const closeNav = () => onMobileOpenChange?.(false);
  const controls: AppShellNavControls = { openNav, closeNav, navOpen: mobileOpen };

  const topbarIsRenderProp = typeof topbar === 'function';
  const topbarNode = topbarIsRenderProp ? (topbar as (c: AppShellNavControls) => ReactNode)(controls) : topbar;

  // Nút mở drawer mặc định CHỈ khi nơi gọi không tự gắn nút qua `topbar={({ openNav }) => …}`.
  const mobileTrigger =
    showMobileNavButton && !topbarIsRenderProp && onMobileOpenChange ? (
      <Button
        iconOnly
        variant="ghost"
        size="sm"
        aria-label={openNavLabel}
        aria-expanded={mobileOpen}
        onClick={openNav}
        className="lg:hidden"
      >
        <Menu aria-hidden="true" className="size-4" />
      </Button>
    ) : null;

  return (
    <div className={cn('min-h-dvh bg-canvas text-fg', className)}>
      <a
        href={`#${mainId}`}
        className={cn(
          'sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-toast',
          'focus:rounded-md focus:border focus:border-line-control focus:bg-surface',
          'focus:px-3 focus:py-2 focus:text-sm focus:text-fg',
        )}
      >
        {skipLinkLabel}
      </a>

      <div className="flex">
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh shrink-0 border-r border-line-subtle bg-surface lg:flex lg:flex-col',
            collapsed ? 'lg:w-16' : 'lg:w-60',
          )}
        >
          {sidebar}
        </aside>

        {/* Drawer mobile: cùng `sidebar`, chỉ hiện dưới `lg`. */}
        <Sheet
          open={mobileOpen}
          onClose={closeNav}
          side="left"
          aria-label={navLabel}
          showCloseButton={false}
          panelClassName="lg:hidden"
        >
          <div className="flex h-full min-h-0 flex-col">{sidebar}</div>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          {topbarNode || mobileTrigger ? (
            <div className="sticky top-0 z-header flex flex-col">
              {mobileTrigger ? (
                <div className="flex h-14 items-center border-b border-line-subtle bg-surface px-3 sm:px-4 lg:hidden">
                  {mobileTrigger}
                </div>
              ) : null}
              {topbarNode}
            </div>
          ) : null}

          <main
            id={mainId}
            aria-label={mainLabel}
            className={cn(
              'mx-auto flex w-full min-w-0 flex-1 flex-col gap-section px-4 py-6 sm:px-6',
              MAX_WIDTH[maxWidth],
              contentClassName,
            )}
          >
            {children}
          </main>

          {footer}
        </div>
      </div>
    </div>
  );
}
