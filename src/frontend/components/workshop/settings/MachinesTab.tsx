// MachinesTab — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { useMemo } from 'react';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn, Icon } from '@frontend/ui';
import { formatCurrency, EMPTY_VALUE } from '@frontend/lib/format';
import { MY_MACHINE_STATUS_LABELS, type MyMachine } from '@backend/services/workshopService';
import { MACHINE_STATUS_STYLE, MACHINE_STATUS_DOT } from './helpers';
import type { WorkshopSettingsController } from './types';


export interface MachinesTabProps {
  ctl: WorkshopSettingsController;
}

export const MachinesTab: React.FC<MachinesTabProps> = ({ ctl }) => {
  const { handleDeleteMachine, handleMachineStatus, loadMachines, loadingMachines,
    machines, machinesError, openMachineModal, orders,
    profile, workshopKey } = ctl;

const machineColumns = useMemo<DataTableColumn<MyMachine>[]>(
    () => [
      {
        key: 'name',
        header: 'Máy in',
        render: (row) => {
          const job = row.status === 'Busy'
            ? orders.find((o) => o.assignedPrinterId === row.id && typeof o.layerProgress === 'number')
            : undefined;
          return (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-fg">{row.name || EMPTY_VALUE}</span>
              <span className="text-xs text-fg-subtle">
                {row.technology || EMPTY_VALUE}
                {row.brand ? ` · ${row.brand}` : ''}
                {row.model ? ` ${row.model}` : ''}
              </span>
              {job ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full bg-info" style={{ width: `${Math.min(100, Math.max(0, job.layerProgress ?? 0))}%` }} />
                  </div>
                  <span className="font-mono text-xs tabular-nums text-info">{job.layerProgress}%</span>
                </div>
              ) : null}
            </div>
          );
        },
        value: (row) => row.name,
      },
      {
        key: 'bed',
        header: 'Khổ in (mm)',
        render: (row) => {
          // D8: `bed_dimensions` NULL ⇒ service trả `null` (hiện `—`). Nhưng JSON có thể là
          // `{x:null,…}` ⇒ service map thành 0 ⇒ KHÔNG được in "0×0×0" như một khổ in thật.
          const bed = row.bedDimensions;
          const hasBed =
            Boolean(bed) &&
            [bed!.x, bed!.y, bed!.z].every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0);
          return hasBed ? (
            <span className="text-xs tabular-nums text-fg">
              {bed!.x}×{bed!.y}×{bed!.z}
            </span>
          ) : (
            <span className="text-fg-subtle">{EMPTY_VALUE}</span>
          );
        },
      },
      {
        key: 'hourlyRate',
        header: 'Đơn giá giờ máy',
        numeric: true,
        render: (row) =>
          row.hourlyRate != null ? (
            <span className="text-xs tabular-nums text-fg">{formatCurrency(row.hourlyRate)}</span>
          ) : (
            <Badge variant="warning">Chưa khai</Badge>
          ),
        value: (row) => (row.hourlyRate != null ? row.hourlyRate : -1),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (row) => {
          const style = MACHINE_STATUS_STYLE[row.status] ?? 'border-line-control bg-surface text-fg-muted';
          const dot = MACHINE_STATUS_DOT[row.status] ?? 'bg-fg-muted';
          const next = row.status === 'Free' ? 'Maintenance' : 'Free';
          return (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>
                <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
                {MY_MACHINE_STATUS_LABELS[row.status] ?? row.status}
              </span>
              <Button variant="ghost" size="sm" onClick={() => handleMachineStatus(row, next)}>
                {next === 'Free' ? '→ Rảnh' : '→ Bảo trì'}
              </Button>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => openMachineModal(row)}>
              Sửa
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => handleDeleteMachine(row)}>
              Xoá
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workshopKey, orders],
  );

  return (
<section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                  <Icon name="printer" className="size-5 text-primary" aria-hidden="true" />
                  Máy in của xưởng bạn
                </h2>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Danh sách này lấy từ <code className="font-mono">workshop_machines</code> với{' '}
                  <code className="font-mono">workshop_id = {profile.id}</code>. Trạng thái do xưởng tự đặt,
                  không phải số đo tự động từ máy.
                </p>
              </div>
              <Button variant="primary" leadingIcon={<Icon name="printer" className="size-4" />} onClick={() => openMachineModal()}>
                Khai báo máy in
              </Button>
            </div>

            <DataTable<MyMachine>
              columns={machineColumns}
              rows={machines}
              getRowId={(row) => row.id}
              caption="Máy in của xưởng"
              tableLabel="Máy in của xưởng"
              pagination={false}
              loading={loadingMachines}
              onRetry={loadMachines}
              error={machinesError}
              errorTitle="Không tải được danh sách máy in"
              emptyState={
                <EmptyState
                  live
                  icon={<Icon name="printer" className="size-5" />}
                  title="Xưởng bạn chưa khai máy in nào"
                  description="Chưa có hàng nào trong workshop_machines cho hồ sơ xưởng này. Khai báo máy in đầu tiên để bắt đầu nhận việc."
                  action={
                    <Button variant="primary" onClick={() => openMachineModal()}>
                      Khai báo máy in đầu tiên
                    </Button>
                  }
                />
              }
            />
          </section>
  );
};

export default MachinesTab;
