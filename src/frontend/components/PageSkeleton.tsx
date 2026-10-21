import React from 'react';
import { Icon } from '@frontend/ui';

export interface PageSkeletonProps {
  title?: string;
  subtitle?: string;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  title = 'Đang nạp mô-đun kỹ thuật...',
  subtitle = 'Đang tải thư viện xử lý 3D & dữ liệu CAD bồi đắp'
}) => {
  return (
    <div
      /* A11Y-03: PageSkeleton là `<Suspense fallback>` của mọi lazy route ⇒ phải là
         live region, nếu không screen reader nhận một khoảng trắng im lặng khi nạp chunk.
         Nhãn là text `sr-only` (không thêm `aria-label` để tránh hai tên cho cùng vùng). */
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-[calc(100dvh-140px)] w-full bg-canvas text-fg p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300"
    >
      <span className="sr-only">Đang tải trang, vui lòng chờ…</span>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Breadcrumb & Status Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line-subtle">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
              <span className="text-fg-subtle">/</span>
              <div className="h-4 w-32 bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
            </div>
            <div className="h-7 w-64 bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-line">
              <span className="size-1.5 rounded-full bg-primary animate-ping motion-reduce:animate-none" />
              <span className="text-xs font-mono text-fg-muted font-semibold tracking-wider uppercase">
                HỆ THỐNG VCUBE ĐANG KHỞI TẠO
              </span>
            </div>
          </div>
        </div>

        {/* Central Workspace Skeleton Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main 3D Viewport / Canvas Placeholder */}
          <div className="lg:col-span-8 bg-surface-muted rounded-lg border border-line overflow-hidden min-h-[460px] relative flex flex-col items-center justify-center p-8">
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-60 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-line) 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Radar Center Spinner & Technical Loading Indicator */}
            <div className="relative z-sticky flex flex-col items-center text-center space-y-4 max-w-md">
              <div className="relative">
                <div className="grid size-16 place-items-center rounded-lg bg-surface border border-line text-fg-subtle">
                  <Icon name="progress_activity" size={28} className="animate-spin motion-reduce:animate-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold tracking-tight text-fg">
                  {title}
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {/* Monospace Progress Shimmer */}
              <div className="w-48 h-1.5 bg-surface rounded-full overflow-hidden border border-line">
                <div className="h-full bg-primary w-full animate-pulse motion-reduce:animate-none" />
              </div>

              <div className="text-xs text-fg-subtle font-mono tracking-widest uppercase">
                ĐANG BIÊN DỊCH SHADER & CẮT LỚP
              </div>
            </div>

            {/* Corner Industrial Telemetry Markings */}
            <div className="absolute top-4 left-4 text-xs font-mono text-fg-subtle">
              + BỘ DỰNG: THREE_R185
            </div>
            <div className="absolute bottom-4 right-4 text-xs font-mono text-fg-subtle">
              TRẠNG THÁI: ĐANG NẠP MÃ
            </div>
          </div>

          {/* Right Sidebar Control Skeleton */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-surface rounded-lg border border-line p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
                <div className="h-4 w-16 bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
              </div>

              <div className="space-y-3 pt-2">
                <div className="h-10 w-full bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
                <div className="h-10 w-full bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
                <div className="h-10 w-full bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
              </div>

              <div className="pt-4 border-t border-line-subtle space-y-2">
                <div className="h-4 w-28 bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
                <div className="h-12 w-full bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
              </div>
            </div>

            <div className="bg-surface rounded-lg border border-line p-5 space-y-3">
              <div className="h-4 w-36 bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
              <div className="h-8 w-full bg-surface-muted rounded-md animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
