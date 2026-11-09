import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { PanelErrorBoundary } from '@frontend/ui';

/**
 * DashboardTabs — hạ tầng TAB dùng chung cho 3 console (`/admin`, `/designer`, `/lab`).
 *
 * Vì sao: trước đây mỗi console tự viết một chuỗi `activeTab === 'x' && <Panel/>`, nên
 *   - mỗi lần đổi tab, panel bị UNMOUNT → mất filter/form/scroll và fetch lại từ đầu;
 *   - không có error boundary ở cấp tab (lab) ⇒ 1 panel throw làm trắng cả console;
 *   - thêm tab mới phải sửa 3–4 nơi (type, nav, điều kiện render, route).
 *
 * Hợp đồng:
 *   - URL là nguồn sự thật: caller truyền `activeId` đã resolve từ route.
 *   - `DashboardPanelHost` giữ các tab ĐÃ MỞ mounted (keep-alive, LRU tối đa `maxKept`)
 *     để đổi tab không mất state và không fetch lại; tab chưa mở thì chưa mount.
 *   - Mỗi tab có `PanelErrorBoundary` riêng: lỗi 1 tab không kéo sập console.
 *   - `DashboardTabNav` là segmented control chuẩn (role=tablist, aria, bàn phím).
 *
 * Cách dùng:
 *   const tabs: DashboardTab[] = [
 *     { id: 'overview', label: 'Tổng quan', icon: 'dashboard', element: <Overview/> },
 *     { id: 'models', label: 'Ấn phẩm', icon: 'inventory_2', element: <Models/> },
 *   ];
 *   <DashboardTabNav tabs={tabs} activeId={activeId} onSelect={setActiveTab} ariaLabel="…" />
 *   <DashboardPanelHost tabs={tabs} activeId={activeId} />
 */

export interface DashboardTab {
  id: string;
  label: string;
  /** Tên glyph `iconMap` nếu nav do component này vẽ. */
  icon?: string;
  /** Nội dung tab. Chỉ mount khi tab được mở lần đầu. */
  element: React.ReactNode;
  /** Mặc định `true`: giữ mounted sau khi mở. `false` = unmount khi rời tab (state không giữ). */
  keepAlive?: boolean;
  /** Nhãn cho error boundary; mặc định = `label`. */
  boundaryLabel?: string;
}

export interface DashboardPanelHostProps {
  tabs: DashboardTab[];
  activeId: string;
  /** Số tab tối đa được giữ mounted (LRU). Mặc định 6. */
  maxKept?: number;
  /** Skeleton khi tab lazy-load; mặc định khối xám nhẹ. */
  fallback?: React.ReactNode;
}

/** Danh sách tab đã từng mở, cập nhật theo LRU (tab active luôn được giữ). */
export function useVisitedTabIds(activeId: string, ids: string[], maxKept = 6): string[] {
  // `ids` là mảng MỚI mỗi render ở call site (tabs.map) ⇒ phải so sánh theo GIÁ TRỊ,
  // nếu không effect setState chạy lại vô hạn (Maximum update depth exceeded).
  const idsKey = ids.join('\u0000');
  const allowed = useMemo(() => new Set(idsKey ? idsKey.split('\u0000') : []), [idsKey]);
  const [visited, setVisited] = useState<string[]>(() => (allowed.has(activeId) ? [activeId] : []));

  useEffect(() => {
    if (!allowed.has(activeId)) return;
    setVisited((prev) => {
      const next = prev.filter((id) => id !== activeId && allowed.has(id));
      next.push(activeId);
      while (next.length > Math.max(1, maxKept)) {
        const evictAt = next.findIndex((id) => id !== activeId);
        if (evictAt < 0) break;
        next.splice(evictAt, 1);
      }
      // Trả lại CHÍNH mảng cũ khi không đổi để React bail-out (chống loop).
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [activeId, allowed, maxKept]);

  return visited;
}

const DefaultFallback = (
  <div className="space-y-3 p-4" aria-hidden="true">
    <div className="h-8 w-1/3 rounded-md bg-surface-muted" />
    <div className="h-24 rounded-lg bg-surface-muted" />
    <div className="h-24 rounded-lg bg-surface-muted" />
  </div>
);

export const DashboardPanelHost: React.FC<DashboardPanelHostProps> = ({
  tabs,
  activeId,
  maxKept = 6,
  fallback = DefaultFallback,
}) => {
  const byId = useMemo(() => new Map(tabs.map((tab) => [tab.id, tab])), [tabs]);
  const visited = useVisitedTabIds(activeId, tabs.map((t) => t.id), maxKept);

  return (
    <>
      {visited.map((id) => {
        const tab = byId.get(id);
        if (!tab) return null;
        const isActive = id === activeId;
        // Tab không keep-alive: rời tab là unmount (state không giữ) — dùng cho panel quá nặng
        // hoặc có id DOM trùng khi nằm cạnh tab khác.
        if (tab.keepAlive === false && !isActive) return null;

        return (
          <section
            key={id}
            id={`dashboard-panel-${id}`}
            role="tabpanel"
            aria-label={tab.label}
            hidden={!isActive}
            aria-hidden={!isActive}
          >
            <PanelErrorBoundary label={tab.boundaryLabel ?? tab.label} resetKey={id}>
              <Suspense fallback={fallback}>{tab.element}</Suspense>
            </PanelErrorBoundary>
          </section>
        );
      })}
    </>
  );
};

export interface DashboardTabNavProps {
  tabs: Pick<DashboardTab, 'id' | 'label' | 'icon'>[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Segmented tab nav chuẩn (designer/lab dùng loại này; admin dùng SideNav riêng).
 * Hỗ trợ ArrowLeft/ArrowRight/Home/End, aria-selected, aria-controls.
 */
export const DashboardTabNav: React.FC<DashboardTabNavProps> = ({
  tabs,
  activeId,
  onSelect,
  ariaLabel,
  className,
}) => {
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next = index;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    onSelect(tabs[next].id);
    const el = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button[role="tab"]')[next];
    el?.focus();
  };

  return (
    <nav aria-label={ariaLabel} className={className ?? 'w-full overflow-x-auto'}>
      <div
        role="tablist"
        className="inline-flex min-w-full items-center gap-1 rounded-full border border-line bg-surface-muted p-1 sm:min-w-0"
      >
        {tabs.map((tab, index) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              id={`dashboard-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`dashboard-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 motion-reduce:transition-none ${
                active ? 'bg-surface font-semibold text-fg shadow-soft' : 'font-medium text-fg-muted hover:text-fg'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
