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
  { id: 'slicing', step: 2, label: 'Duyệt tệp CAD', shortLabel: 'Cắt lớp', icon: 'tune', desc: 'Cắt lớp & G-code' },
  { id: 'nesting', step: 3, label: 'Xếp bàn in', shortLabel: 'Xếp bàn', icon: 'grid_view', desc: 'Tối ưu layout bàn' },
  { id: 'heating', step: 4, label: 'Gia nhiệt máy', shortLabel: 'Gia nhiệt', icon: 'thermostat', desc: 'Cân bàn & đùn phôi' },
  { id: 'printing', step: 5, label: 'Đang in 3D', shortLabel: 'In 3D', icon: 'precision_manufacturing', desc: 'Thiêu kết / Đùn sợi' },
  { id: 'post_cure', step: 6, label: 'Xử lý bề mặt', shortLabel: 'Hậu kỳ', icon: 'cleaning_services', desc: 'Rửa cồn siêu âm & UV' },
  { id: 'qc_check', step: 7, label: 'Đo kiểm QC', shortLabel: 'Đo kiểm', icon: 'verified', desc: 'Theo thoả thuận' },
  { id: 'shipping', step: 8, label: 'Xuất xưởng giao', shortLabel: 'Đang giao', icon: 'local_shipping', desc: 'Chưa có mã vận đơn' },
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
      <div className={`flex items-center gap-3 rounded-lg border border-danger/20 bg-danger-tint p-3 text-danger ${className}`}>
        <Icon name="cancel" size={20} />
        <div className="text-xs font-mono">
          <span className="font-bold">ĐƠN HÀNG ĐÃ HỦY:</span> Tiến trình chế tác đã dừng. Hoàn tiền (nếu có) thực hiện theo chính sách ghi trong đơn.
        </div>
      </div>
    );
  }

  // Compact variant: for cards in MyOrdersView
  if (variant === 'compact') {
    return (
      <div className={`space-y-2 font-mono ${className}`}>
        {/* Track 8 nấc: nền surface-muted, đoạn xong = primary, đoạn đang chạy = info (D-2). */}
        <div
          className="flex items-center gap-1"
          role="progressbar"
          aria-label="Tiến độ gia công 8 nấc"
          aria-valuemin={hasStage ? 1 : undefined}
          aria-valuemax={8}
          aria-valuenow={hasStage ? Math.min(8, activeStage + 1) : undefined}
          aria-valuetext={
            hasStage
              ? `Nấc ${Math.min(8, activeStage + 1)}/8: ${MES_PIPELINE_STAGES[Math.min(7, activeStage)]?.label}`
              : 'Chưa có dữ liệu từ xưởng'
          }
        >
          {MES_PIPELINE_STAGES.map((stage, idx) => {
            const isCompleted = idx < activeStage;
            const isCurrent = idx === activeStage;
            return (
              <div key={stage.id} className="group relative flex-1">
                <div
                  title={`${stage.step}. ${stage.label}`}
                  className={`h-2 w-full rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                    isCompleted
                      ? 'bg-primary'
                      : isCurrent
                      ? 'bg-info'
                      : 'bg-surface-muted'
                  }`}
                />
                {/* Micro tooltip on hover */}
                <div aria-hidden="true" className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 max-md:hidden bg-surface-inverse text-on-inverse text-xs px-2 py-1 rounded-sm shadow-e2 whitespace-nowrap pointer-events-none z-sticky">
                  {stage.step}. {stage.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status text row */}
        <div className="flex items-center justify-between gap-2 text-xs text-fg-muted tabular-nums">
          <span className="flex items-center gap-1.5 font-bold text-fg">
            {hasStage ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                Nấc {Math.min(8, activeStage + 1)}/8: {MES_PIPELINE_STAGES[Math.min(7, activeStage)]?.label}
              </>
            ) : (
              <span className="text-fg-muted" title="Xưởng chưa báo nấc gia công">Nấc: — (chưa có dữ liệu từ xưởng)</span>
            )}
          </span>
          {activeStage === 4 && typeof layerProgress === 'number' && (
            <span className="font-bold text-info">
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
      {/* 8-Stage chips — mỗi nấc có NHÃN CHỮ + màu: xong = positive, đang chạy = info, chờ = muted. */}
      <div className="grid grid-cols-1 gap-3 font-mono sm:grid-cols-2 lg:grid-cols-4">
        {MES_PIPELINE_STAGES.map((stage, idx) => {
          const isCompleted = idx < activeStage;
          const isCurrent = idx === activeStage;
          const stateLabel = isCompleted ? 'Đã xong' : isCurrent ? 'Đang chạy' : hasStage ? 'Chưa tới' : '—';
          return (
            <div key={stage.id} className="space-y-1.5">
              <div
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  isCompleted
                    ? 'bg-positive-tint text-positive border-positive/20'
                    : isCurrent
                    ? 'bg-info-tint text-info border-info/20'
                    : 'bg-surface-muted text-fg-muted border-line'
                }`}
              >
                <Icon name={isCompleted ? 'check_circle' : stage.icon} size={16} className="shrink-0" />
                <span className="tabular-nums">0{stage.step}</span>
                <span className="uppercase tracking-wider truncate">{stage.shortLabel}</span>
              </div>
              <p className="text-xs text-fg-muted tabular-nums">
                <span className="font-semibold">{stateLabel}</span>
                {' · '}
                {isCurrent && stage.id === 'printing' && typeof layerProgress === 'number'
                  ? `${layerProgress}% Hoàn tất`
                  : stage.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

