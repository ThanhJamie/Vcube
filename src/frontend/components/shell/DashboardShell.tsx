/**
 * DashboardShell — khung AppShell dùng chung cho 2 console đã đăng nhập (`/lab`, `/designer`).
 * Tách NGUYÊN VĂN từ `src/App.tsx` (Phase 3c), không đổi hành vi/cấu trúc DOM.
 *
 * Giữ đúng primitive của Đợt 11A: `AppShell` + `SideNav` (240px/64px) + `Topbar` (56px),
 * nội dung `max-w-[1400px]`, drawer mobile bằng `Sheet side="left"`, có skip-link.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@frontend/context/AuthContext';
import { AppShell, Button, SideNav, Topbar, Icon } from '@frontend/ui';
import type { DashboardNavGroup } from './navConfig';

export const DashboardShell: React.FC<{
  basePath: '/lab' | '/designer';
  activeId: string;
  groups: DashboardNavGroup[];
  brandTitle: string;
  brandHint: string;
  navLabel: string;
  children: React.ReactNode;
}> = ({ basePath, activeId, groups, brandTitle, brandHint, navLabel, children }) => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel =
    groups.flatMap((group) => group.items).find((item) => item.id === activeId)?.label ?? '';

  const who = (profile?.displayName || user?.email || '?').trim();
  const initials = who.charAt(0).toUpperCase();

  return (
    <AppShell
      collapsed={collapsed}
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      navLabel={navLabel}
      sidebar={
        <SideNav
          variant="pill"
          label={navLabel}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          activeId={activeId}
          onSelect={(id) => navigate(`${basePath}/${id}`)}
          groups={groups.map((group) => ({
            id: group.label,
            label: group.label,
            items: group.items.map((item) => ({
              id: item.id,
              label: item.label,
              icon: <Icon name={item.icon} className="size-4.5" aria-hidden="true" />,
            })),
          }))}
        />
      }
      topbar={({ openNav }) => (
        <Topbar
          leading={
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              aria-label="Mở điều hướng"
              onClick={openNav}
              className="lg:hidden"
            >
              <Icon name="menu" aria-hidden="true" className="size-4" />
            </Button>
          }
          brand={
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-fg shadow-soft">
                V
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span className="truncate text-sm font-semibold tracking-tight text-fg">
                  {brandTitle}
                </span>
                <span className="truncate text-xs text-fg-subtle">{brandHint}</span>
              </span>
            </span>
          }
          breadcrumb={
            <span className="truncate text-xs text-fg-muted">
              {brandTitle}
              {activeLabel ? ` / ${activeLabel}` : ''}
            </span>
          }
          actions={
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Icon name="store" aria-hidden="true" className="size-4" />}
              onClick={() => navigate('/')}
            >
              Về cửa hàng
            </Button>
          }
          avatar={
            <span
              aria-hidden="true"
              title={who}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-fg-muted"
            >
              {initials}
            </span>
          }
        />
      )}
    >
      {children}
    </AppShell>
  );
};
