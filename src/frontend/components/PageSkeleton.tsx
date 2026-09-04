import React from 'react';

export interface PageSkeletonProps {
  title?: string;
  subtitle?: string;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  title = 'Đang nạp mô-đun kỹ thuật...',
  subtitle = 'Đang tải thư viện xử lý 3D & Dữ liệu CAD bồi đắp theo chuẩn ISO/ASTM 52900'
}) => {
  return (
    <div className="min-h-[calc(100vh-140px)] w-full bg-[#F8FAFC] text-[#091426] p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Top Breadcrumb & Status Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 bg-[#E2E8F0] rounded animate-pulse" />
              <span className="text-[#94A3B8]">/</span>
              <div className="h-4 w-32 bg-[#E2E8F0] rounded animate-pulse" />
            </div>
            <div className="h-7 w-64 bg-[#CBD5E1] rounded-lg animate-pulse" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-[#E2E8F0] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#00687A] animate-ping" />
              <span className="text-xs font-mono text-[#00687A] font-semibold tracking-wider uppercase">
                VCUBE-SYSTEM-INITIALIZING
              </span>
            </div>
          </div>
        </div>

        {/* Central Workspace Skeleton Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main 3D Viewport / Canvas Placeholder */}
          <div className="lg:col-span-8 bg-[#091426] rounded-2xl border border-[#1E293B] overflow-hidden min-h-[460px] relative flex flex-col items-center justify-center p-8 shadow-sm">
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #57DFFE 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Radar Center Spinner & Technical Loading Indicator */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-md">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[#00687A]/20 border border-[#57DFFE]/40 flex items-center justify-center text-[#57DFFE]">
                  <span className="material-symbols-outlined text-3xl animate-spin">
                    progress_activity
                  </span>
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-[#57DFFE]/10 blur-sm -z-10 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-white text-base font-bold tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {/* Monospace Progress Shimmer */}
              <div className="w-48 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00687A] via-[#57DFFE] to-[#00687A] w-full animate-pulse" />
              </div>

              <div className="text-[10px] text-[#64748B] font-mono tracking-widest uppercase">
                SHADERS & SLICER COMPILED ON-DEMAND
              </div>
            </div>

            {/* Corner Industrial Telemetry Markings */}
            <div className="absolute top-4 left-4 text-[10px] font-mono text-[#545F73]">
              + ENGINE: THREE_R185
            </div>
            <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[#545F73]">
              STATUS: LAZY_CHUNKING_ACTIVE
            </div>
          </div>

          {/* Right Sidebar Control Skeleton */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="h-4 w-16 bg-[#F1F5F9] rounded animate-pulse" />
              </div>

              <div className="space-y-3 pt-2">
                <div className="h-10 w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl animate-pulse" />
                <div className="h-10 w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl animate-pulse" />
                <div className="h-10 w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl animate-pulse" />
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] space-y-2">
                <div className="h-4 w-28 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="h-12 w-full bg-[#F1F5F9] rounded-xl animate-pulse" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3 shadow-xs">
              <div className="h-4 w-36 bg-[#E2E8F0] rounded animate-pulse" />
              <div className="h-8 w-full bg-[#00687A]/10 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
