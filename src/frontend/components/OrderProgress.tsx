import React from 'react';

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
  { id: 'qc_check', step: 7, label: 'Đo kiểm QC', shortLabel: 'Đo kiểm', icon: 'verified', desc: 'Dung sai ±0.05mm' },
  { id: 'shipping', step: 8, label: 'Xuất xưởng giao', shortLabel: 'Đang giao', icon: 'local_shipping', desc: 'VCUBE Express' },
];

interface OrderProgressProps {
  currentStageIndex: number; // 0 to 7
  layerProgress?: number; // 0 to 100%
  variant?: 'compact' | 'full';
  status?: string;
  className?: string;
}

export const OrderProgress: React.FC<OrderProgressProps> = ({
  currentStageIndex = 4,
  layerProgress = 64,
  variant = 'compact',
  status,
  className = '',
}) => {
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className={`p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 ${className}`}>
        <span className="material-symbols-outlined text-lg">cancel</span>
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
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage.id} className="flex-1 flex flex-col items-center group relative">
                <div
                  className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#00687A]'
                      : isCurrent
                      ? 'bg-gradient-to-r from-[#00687A] to-[#57DFFE] animate-pulse ring-1 ring-[#57DFFE]'
                      : 'bg-slate-200'
                  }`}
                />
                {/* Micro tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#091426] text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                  {stage.step}. {stage.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status text row */}
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5 font-bold text-[#091426]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#57DFFE] animate-ping" />
            Nấc {Math.min(8, currentStageIndex + 1)}/8: {MES_PIPELINE_STAGES[Math.min(7, currentStageIndex)]?.label}
          </span>
          {currentStageIndex === 4 && (
            <span className="text-[#00687A] font-bold">
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
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          return (
            <div
              key={stage.id}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-[#00687A] bg-[#091426] text-white shadow-md ring-2 ring-[#00687A]/40 scale-[1.02]'
                  : isCompleted
                  ? 'border-teal-200 bg-teal-50/80 text-[#091426]'
                  : 'border-slate-200 bg-[#F8FAFC] text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold ${isCurrent ? 'text-[#57DFFE]' : isCompleted ? 'text-[#00687A]' : 'text-slate-400'}`}>
                  0{stage.step}
                </span>
                <span className={`material-symbols-outlined text-sm ${isCurrent ? 'text-[#57DFFE] animate-spin-slow' : isCompleted ? 'text-[#00687A] font-bold' : 'text-slate-400'}`}>
                  {isCompleted ? 'check_circle' : stage.icon}
                </span>
              </div>
              <div>
                <p className={`font-bold text-[11px] leading-tight uppercase tracking-wider ${isCurrent ? 'text-white' : 'text-[#091426]'}`}>
                  {stage.shortLabel}
                </p>
                <p className={`text-[9px] mt-0.5 truncate ${isCurrent ? 'text-[#57DFFE]' : 'text-slate-500'}`}>
                  {isCurrent && stage.id === 'printing' ? `${layerProgress}% Hoàn tất` : stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

