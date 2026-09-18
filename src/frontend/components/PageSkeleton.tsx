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
    <div className="min-h-[calc(100vh-140px)] w-full bg-canvas text-fg p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Top Breadcrumb & Status Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line-subtle">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 bg-line-subtle rounded-sm animate-pulse motion-reduce:animate-none" />
              <span className="text-fg-subtle">/</span>
              <div className="h-4 w-32 bg-line-subtle rounded-sm animate-pulse motion-reduce:animate-none" />
            </div>
            <div className="h-7 w-64 bg-line rounded-sm animate-pulse motion-reduce:animate-none" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg shadow-e1">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping motion-reduce:animate-none" />
              <span className="text-xs font-mono text-primary font-semibold tracking-wider uppercase">
                VCUBE-SYSTEM-INITIALIZING
              </span>
            </div>
          </div>
        </div>

        {/* Central Workspace Skeleton Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main 3D Viewport / Canvas Placeholder */}
          <div className="lg:col-span-8 bg-surface-inverse rounded-lg border border-surface-inverse-raised overflow-hidden min-h-[460px] relative flex flex-col items-center justify-center p-8 shadow-e1">
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #57DFFE 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Radar Center Spinner & Technical Loading Indicator */}
            <div className="relative z-sticky flex flex-col items-center text-center space-y-4 max-w-md">
              <div className="relative">
                <div className="w-16 h-16 rounded-lg bg-primary/20 border border-accent/40 flex items-center justify-center text-accent">
                  <Icon name="progress_activity" size={30} className="animate-spin motion-reduce:animate-none" />
                </div>
                <div className="absolute -inset-1 rounded-lg bg-accent/10 blur-sm -z-10 animate-pulse motion-reduce:animate-none" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-on-inverse text-base font-bold tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-fg-subtle leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {/* Monospace Progress Shimmer */}
              <div className="w-48 h-1.5 bg-surface-inverse-raised rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary via-accent to-primary w-full animate-pulse motion-reduce:animate-none" />
              </div>

              <div className="text-xs text-fg-subtle font-mono tracking-widest uppercase">
                SHADERS & SLICER COMPILED ON-DEMAND
              </div>
            </div>

            {/* Corner Industrial Telemetry Markings */}
            <div className="absolute top-4 left-4 text-xs font-mono text-fg-muted">
              + ENGINE: THREE_R185
            </div>
            <div className="absolute bottom-4 right-4 text-xs font-mono text-fg-muted">
              STATUS: LAZY_CHUNKING_ACTIVE
            </div>
          </div>

          {/* Right Sidebar Control Skeleton */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-surface rounded-lg p-5 space-y-4 shadow-e1">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-line-subtle rounded-sm animate-pulse motion-reduce:animate-none" />
                <div className="h-4 w-16 bg-line-subtle rounded-sm animate-pulse motion-reduce:animate-none" />
              </div>

              <div className="space-y-3 pt-2">
                <div className="h-10 w-full bg-canvas border border-line-subtle rounded-md animate-pulse motion-reduce:animate-none" />
                <div className="h-10 w-full bg-canvas border border-line-subtle rounded-md animate-pulse motion-reduce:animate-none" />
                <div className="h-10 w-full bg-canvas border border-line-subtle rounded-md animate-pulse motion-reduce:animate-none" />
              </div>

              <div className="pt-4 border-t border-line-subtle space-y-2">
                <div className="h-4 w-28 bg-line-subtle rounded-sm animate-pulse motion-reduce:animate-none" />
                <div className="h-12 w-full bg-line-subtle rounded-md animate-pulse motion-reduce:animate-none" />
              </div>
            </div>

            <div className="bg-surface rounded-lg p-5 space-y-3 shadow-e1">
              <div className="h-4 w-36 bg-line-subtle rounded-sm animate-pulse motion-reduce:animate-none" />
              <div className="h-8 w-full bg-primary/10 rounded-sm animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
