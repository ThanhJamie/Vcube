import React from 'react';
import { Icon } from '@frontend/ui';

export interface MESStage {
  id: string;
  step: number;
  label: string;
  shortLabel: string;
  icon: string;
  desc: string;
}

export const MES_PIPELINE_STAGES: MESStage[] = [
  { id: 'placed', step: 1, label: 'Đã nhận đơn', shortLabel: 'Nhận đơn', icon: 'receipt_long', desc: 'Hệ thống xác thực' },
  { id: 'slicing', step: 2, label: 'Duyệt file CAD', shortLabel: 'Cắt lớp', icon: 'tune', desc: 'G-Code & Slicing' },
  { id: 'nesting', step: 3, label: 'Xếp bàn in', shortLabel: 'Xếp bàn', icon: 'grid_view', desc: 'Tối ưu layout bàn' },
  { id: 'heating', step: 4, label: 'Gia nhiệt máy', shortLabel: 'Gia nhiệt', icon: 'thermostat', desc: 'Cân bàn & đùn phôi' },
  { id: 'printing', step: 5, label: 'Đang in 3D', shortLabel: 'In 3D', icon: 'precision_manufacturing', desc: 'Thiêu kết / Đùn sợi' },
  { id: 'post_cure', step: 6, label: 'Xử lý bề mặt', shortLabel: 'Hậu kỳ', icon: 'cleaning_services', desc: 'Rửa cồn siêu âm & UV' },
  { id: 'qc_check', step: 7, label: 'Đo kiểm QC', shortLabel: 'Đo kiểm', icon: 'verified', desc: 'Theo thoả thuận' },
  { id: 'shipping', step: 8, label: 'Xuất xưởng giao', shortLabel: 'Đang giao', icon: 'local_shipping', desc: 'VCUBE Express' },
];

interface OrderProgressProps {
  /** null = xưởng chưa báo nấc nào. UI hiển thị "chưa có dữ liệu", KHÔNG mặc định nấc 4. */
  currentStageIndex: number | null;
  /** null = máy in chưa báo tiến độ lớp. UI hiển thị `—`, KHÔNG mặc định 64%. */
  layerProgress?: number | null;
  variant?: 'compact' | 'full';
  status?: string;
  className?: string;
}

export const OrderProgress: React.FC<OrderProgressProps> = ({
  currentStageIndex,
  layerProgress,
  variant = 'compact',
  status,
  className = '',
}) => {
  const isCancelled = status === 'cancelled';
  const hasStage = typeof currentStageIndex === 'number';
  // Nấc hiệu dụng chỉ dùng để tô sáng; khi chưa có dữ liệu thì không tô nấc nào.
  const activeStage = hasStage ? (currentStageIndex as number) : -1;

  if (isCancelled) {
    return (
      <div className={`p-3 bg-danger-tint border border-danger/30 rounded-lg flex items-center gap-3 text-danger ${className}`}>
        <Icon name="cancel" size={20} />
        <div className="text-xs font-mono">
          <span className="font-bold">ĐƠN HÀNG ĐÃ HỦY:</span> Tiến trình chế tác đã dừng và hoàn phí theo chính sách.
        </div>
      </div>
    );
  }

  // Compact variant: for cards in MyOrdersView
  if (variant === 'compact') {
    return (
      <div className={`space-y-2 font-mono ${className}`}>
        {/* Progress bar segmented 8 steps */}
        <div className="flex items-center gap-1">
          {MES_PIPELINE_STAGES.map((stage, idx) => {
            const isCompleted = idx < activeStage;
            const isCurrent = idx === activeStage;
            return (
              <div key={stage.id} className="flex-1 flex flex-col items-center group relative">
                <div
                  className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary'
                      : isCurrent
                      ? 'bg-gradient-to-r from-primary to-accent animate-pulse motion-reduce:animate-none ring-1 ring-accent'
                      : 'bg-line-subtle'
                  }`}
                />
                {/* Micro tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-surface-inverse text-on-inverse text-xs px-2 py-1 rounded-sm shadow-e2 whitespace-nowrap pointer-events-none z-sticky">
                  {stage.step}. {stage.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status text row */}
        <div className="flex items-center justify-between text-xs text-fg-subtle">
          <span className="flex items-center gap-1.5 font-bold text-fg">
            {hasStage ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping motion-reduce:animate-none" />
                Nấc {Math.min(8, activeStage + 1)}/8: {MES_PIPELINE_STAGES[Math.min(7, activeStage)]?.label}
              </>
            ) : (
              <span className="text-fg-subtle" title="Xưởng chưa báo nấc gia công">Nấc: — (chưa có dữ liệu từ xưởng)</span>
            )}
          </span>
          {activeStage === 4 && typeof layerProgress === 'number' && (
            <span className="text-primary font-bold">
              Tiến độ đùn lớp: {layerProgress}%
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full variant: for OrderTrackingView
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 8-Stage Interactive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-mono">
        {MES_PIPELINE_STAGES.map((stage, idx) => {
          const isCompleted = idx < activeStage;
          const isCurrent = idx === activeStage;
          return (
            <div
              key={stage.id}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-primary bg-surface-inverse text-on-inverse shadow-e2 ring-2 ring-primary/40 scale-[1.02]'
                  : isCompleted
                  ? 'border-primary/30 bg-primary-tint/80 text-fg'
                  : 'border-line-subtle bg-canvas text-fg-subtle opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${isCurrent ? 'text-accent' : isCompleted ? 'text-primary' : 'text-fg-subtle'}`}>
                  0{stage.step}
                </span>
                <Icon name={isCompleted ? 'check_circle' : stage.icon} size={18} className={isCurrent ? 'text-accent animate-spin motion-reduce:animate-none' : isCompleted ? 'text-primary font-bold' : 'text-fg-subtle'} />
              </div>
              <div>
                <p className={`font-bold text-xs leading-tight uppercase tracking-wider ${isCurrent ? 'text-on-inverse' : 'text-fg'}`}>
                  {stage.shortLabel}
                </p>
                <p className={`text-xs mt-0.5 truncate ${isCurrent ? 'text-accent' : 'text-fg-subtle'}`}>
                  {isCurrent && stage.id === 'printing' && typeof layerProgress === 'number'
                    ? `${layerProgress}% Hoàn tất`
                    : stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

