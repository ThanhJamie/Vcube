import React from 'react';
import type { Group1KpiProps } from './types';

export const Group1Kpi: React.FC<Group1KpiProps> = (props) => {
  const { workshopsError, workshopsLoading, stats, fleetError, fleetPrinters, fleetCounts } = props;

  return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tổng Xưởng</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {workshopsError ? '—' : workshopsLoading ? '…' : stats.totalWorkshops}
          </div>
          <div className="text-xs text-positive font-medium mt-0.5">
            {workshopsError
              ? 'Lỗi đọc workshop_profiles'
              : `${stats.verifiedCount} ${'Đã duyệt'}`}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Chờ Duyệt</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">{workshopsError ? '—' : stats.pendingCount}</div>
          <div className="text-xs text-warning font-medium mt-0.5">
            {workshopsError
              ? 'Xem lỗi ở tab Danh Sách Xưởng'
              : 'Cần phê duyệt'}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tổng Máy In</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.total}
          </div>
          <div className="text-xs text-fg-subtle font-medium mt-0.5">
            {fleetError
              ? 'Lỗi đọc printer_fleet'
              : 'Bảng printer_fleet'}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Máy Rảnh</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.free}
          </div>
          <div className="text-xs text-positive font-medium mt-0.5">Sẵn sàng nhận lệnh</div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Đang In</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.busy}
          </div>
          <div className="text-xs text-info font-medium mt-0.5">
            {fleetError || fleetPrinters === null || fleetCounts.total === 0
              ? '—'
              : `${Math.round((fleetCounts.busy / fleetCounts.total) * 100)}% ${'công suất'}`}
          </div>
        </div>

        {/* Tab Tồn Kho Nhựa CHƯA nối nguồn DB (`workshop_materials` bị RLS theo xưởng, và
            bảng danh mục `materials` không có cột tồn kho theo xưởng) ⇒ KHÔNG hiện "0 / Đủ tồn kho"
            như một khẳng định thật. */}
        <div className="p-4 rounded-lg border border-line-subtle bg-surface">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Cảnh Báo Nhựa
          </div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">—</div>
          <div className="text-xs font-medium mt-0.5 text-fg-subtle">
            Chưa nối nguồn tồn kho
          </div>
        </div>
      </div>
  );
};
