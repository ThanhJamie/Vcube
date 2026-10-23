// AuditTrailTab — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { useMemo } from 'react';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn, Icon } from '@frontend/ui';
import { formatCurrency, formatDate, formatNumber, EMPTY_VALUE } from '@frontend/lib/format';
import { type MyInventoryLog } from '@backend/services/workshopService';
import type { WorkshopSettingsController } from './types';


export interface AuditTrailTabProps {
  ctl: WorkshopSettingsController;
}

export const AuditTrailTab: React.FC<AuditTrailTabProps> = ({ ctl }) => {
  const { logs, logsError, materials, openLogModal,
    setActiveTab } = ctl;

const logColumns = useMemo<DataTableColumn<MyInventoryLog>[]>(
    () => [
      {
        key: 'createdAt',
        header: 'Thời gian',
        render: (row) => (
          <span className="font-mono text-xs tabular-nums text-fg-subtle">
            {row.createdAt ? formatDate(row.createdAt) : EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Hành động',
        render: (row) => (
          <Badge variant={row.action === 'Import' ? 'success' : row.action === 'Export' ? 'info' : 'warning'}>
            {row.action === 'Import' ? 'Nhập kho' : row.action === 'Export' ? 'Xuất in' : 'Điều chỉnh'}
          </Badge>
        ),
      },
      {
        key: 'material',
        header: 'Vật liệu',
        render: (row) => (
          <span className="text-xs text-fg">
            {materials.find((m) => m.id === row.materialId)?.name ?? EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'grams',
        header: 'Khối lượng',
        numeric: true,
        render: (row) => (
          <span className="text-xs tabular-nums text-fg">
            {row.grams != null ? `${formatNumber(row.grams)} g` : EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'pricePerKgAtTime',
        header: 'Đơn giá tại thời điểm',
        numeric: true,
        render: (row) =>
          row.pricePerKgAtTime != null ? (
            <span className="text-xs tabular-nums text-fg">{formatCurrency(row.pricePerKgAtTime)}/kg</span>
          ) : (
            <span className="text-fg-subtle">{EMPTY_VALUE}</span>
          ),
      },
      {
        key: 'batch',
        header: 'Lô / Nhà cung cấp',
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs text-fg">{row.batchCode || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">{row.supplier || EMPTY_VALUE}</span>
          </div>
        ),
      },
      {
        key: 'note',
        header: 'Ghi chú / Người ghi',
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-xs text-fg-muted">{row.note || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">{row.createdBy || EMPTY_VALUE}</span>
          </div>
        ),
      },
    ],
    [materials],
  );

  return (
<section className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                <Icon name="open_in_new" className="size-5 text-primary" aria-hidden="true" />
                Sổ kho của xưởng bạn
              </h2>
              <p className="mt-0.5 text-xs text-fg-subtle">
                Mọi dòng đều thuộc vật liệu của xưởng bạn. Người ghi là danh tính phiên đăng nhập thật.
              </p>
            </div>

            <DataTable<MyInventoryLog>
              columns={logColumns}
              rows={logs}
              getRowId={(row) => row.id}
              caption="Sổ kho của xưởng"
              tableLabel="Sổ kho của xưởng"
              filterable
              filterPlaceholder="Tìm theo mã lô, nhà cung cấp, ghi chú…"
              filterFn={(row, query) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  row.batchCode.toLowerCase().includes(q) ||
                  String(row.supplier || '').toLowerCase().includes(q) ||
                  row.note.toLowerCase().includes(q)
                );
              }}
              defaultSort={[{ key: 'createdAt', direction: 'desc' }]}
              pagination
              defaultPageSize={10}
              error={logsError}
              errorTitle="Không tải được sổ kho"
              emptyState={
                <EmptyState
                  live
                  icon={<Icon name="open_in_new" className="size-5" />}
                  title="Sổ kho chưa có dòng nào"
                  description={
                    materials.length === 0
                      ? 'Chưa có vật liệu nào nên chưa thể có phiếu kho. Hãy khai báo vật liệu trước.'
                      : 'Chưa có phiếu nhập/xuất nào được ghi cho vật liệu của xưởng bạn.'
                  }
                  action={
                    materials.length === 0 ? (
                      <Button variant="primary" onClick={() => setActiveTab('materials')}>
                        Khai báo vật liệu
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => openLogModal()}>
                        Ghi phiếu kho đầu tiên
                      </Button>
                    )
                  }
                />
              }
            />
          </section>
  );
};

export default AuditTrailTab;
