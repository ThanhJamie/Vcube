// QueueTab — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { useMemo } from 'react';
import { ClipboardList, Clock, LayoutGrid, List, Printer, TriangleAlert } from 'lucide-react';
import { Button, DataTable, EmptyState, Field, Input, type DataTableColumn } from '@frontend/ui';
import { formatDate, formatNumber, EMPTY_VALUE } from '@frontend/lib/format';
import { MES_PIPELINE_STAGES } from '../../OrderProgress';
import { MY_ORDER_STATUS_LABELS, type MyQueueOrder } from '@backend/services/workshopService';
import { QUEUE_KANBAN_COLUMNS } from './helpers';
import type { WorkshopSettingsController } from './types';


export interface QueueTabProps {
  ctl: WorkshopSettingsController;
}

export const QueueTab: React.FC<QueueTabProps> = ({ ctl }) => {
  const { applyStage, busyOrderId, handleAcceptJob, handleConfirmDone,
    handleMarkDelivered, handleSaveLayerProgress, hasPartner, layerDraft,
    loadQueue, loadingOrders, machines, orders,
    ordersError, partnerId, queueView, setActiveTab,
    setBusyLabel, setLayerDraft, setQueueView } = ctl;

const queueColumns = useMemo<DataTableColumn<MyQueueOrder>[]>(
    () => [
      {
        key: 'orderNumber',
        header: 'Đơn hàng',
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-fg">{row.orderNumber || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">
              Đặt: {row.date ? formatDate(row.date) : EMPTY_VALUE} · Hạn:{' '}
              {row.estimatedDelivery ? formatDate(row.estimatedDelivery) : EMPTY_VALUE}
            </span>
          </div>
        ),
        value: (row) => row.orderNumber,
      },
      {
        key: 'items',
        header: 'Mặt hàng',
        render: (row) =>
          row.items.length === 0 ? (
            <span className="text-fg-subtle">{EMPTY_VALUE}</span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {row.items.slice(0, 3).map((it) => (
                <li key={it.id || it.name} className="text-xs text-fg">
                  {it.name || EMPTY_VALUE}
                  <span className="text-fg-subtle">
                    {' '}
                    ×{formatNumber(it.quantity)}
                    {it.material ? ` · ${it.material}` : ''}
                  </span>
                </li>
              ))}
              {row.items.length > 3 ? (
                <li className="text-xs text-fg-subtle">+{row.items.length - 3} mặt hàng khác</li>
              ) : null}
            </ul>
          ),
        value: (row) => row.items.map((i) => i.name).join(', '),
      },
      {
        key: 'stage',
        header: 'Nấc gia công (8 nấc)',
        render: (row) => {
          const stageIndex = row.statusStageIndex;
          const stage = stageIndex != null ? MES_PIPELINE_STAGES[stageIndex] : null;
          return (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-fg">
                {stage ? `Nấc ${stageIndex + 1}/8 · ${stage.label}` : `Nấc: ${EMPTY_VALUE} (xưởng chưa báo)`}
              </span>
              <span className="text-xs text-fg-subtle">{MY_ORDER_STATUS_LABELS[row.status] ?? row.status}</span>
            </div>
          );
        },
        value: (row) => (row.statusStageIndex != null ? row.statusStageIndex : -1),
      },
      {
        key: 'layer',
        header: 'Tiến độ lớp',
        render: (row) => (
          <span className="text-xs tabular-nums text-fg">
            {row.layerProgress != null ? `${formatNumber(row.layerProgress)}%` : EMPTY_VALUE}
          </span>
        ),
        value: (row) => (row.layerProgress != null ? row.layerProgress : -1),
      },
      {
        key: 'actions',
        header: 'Cập nhật tiến độ',
        render: (row) => {
          const stageIndex = row.statusStageIndex;
          const disabled = busyOrderId === row.id;
          return (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleAcceptJob(row)}
                >
                  Nhận việc
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleConfirmDone(row)}
                >
                  Xác nhận hoàn thành
                </Button>
                {(row.statusStageIndex ?? -1) >= 7 && row.status !== 'completed' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={disabled}
                    onClick={() => handleMarkDelivered(row)}
                  >
                    Đánh dấu đã giao
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {MES_PIPELINE_STAGES.map((stage, idx) => (
                  <button
                    key={stage.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setBusyLabel(`Đang ghi nấc ${idx + 1}/8…`);
                      void applyStage(row, idx, stage.shortLabel).finally(() => setBusyLabel(null));
                    }}
                    title={`Đặt nấc ${idx + 1}/8 — ${stage.label}`}
                    aria-label={`Đặt nấc ${idx + 1}/8 — ${stage.label}`}
                    className={`inline-flex items-center justify-center rounded-sm border px-1.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 max-md:min-h-11 max-md:min-w-11 ${
                      stageIndex === idx
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-line-control bg-surface text-fg-muted hover:bg-surface-muted'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-1.5">
                <Field label="Tiến độ lớp (%)" hideLabel>
                  {(control) => (
                    <Input
                      {...control}
                      size="sm"
                      numeric
                      className="w-24"
                      value={layerDraft[row.id] ?? ''}
                      onChange={(ev) => setLayerDraft((prev) => ({ ...prev, [row.id]: ev.target.value }))}
                      placeholder="—"
                    />
                  )}
                </Field>
                <Button variant="ghost" size="sm" disabled={disabled} onClick={() => handleSaveLayerProgress(row)}>
                  Lưu %
                </Button>
              </div>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyOrderId, layerDraft, applyStage],
  );

  return (
<section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                  <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                  Hàng đợi việc của xưởng bạn
                </h2>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Chỉ hiển thị đơn có <code className="font-mono">assigned_workshop_id = {partnerId || '—'}</code>.
                  Nấc tiến độ dùng đúng 8 nấc khách nhìn thấy ở trang theo dõi đơn.
                </p>
              </div>
              <div
                role="group"
                aria-label="Kiểu xem hàng đợi"
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted p-1"
              >
                <button
                  type="button"
                  onClick={() => setQueueView('list')}
                  aria-pressed={queueView === 'list'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 motion-reduce:transition-none ${
                    queueView === 'list'
                      ? 'bg-surface font-semibold text-fg shadow-soft'
                      : 'font-medium text-fg-muted hover:text-fg'
                  }`}
                >
                  <List className="size-4" aria-hidden="true" /> Danh sách
                </button>
                <button
                  type="button"
                  onClick={() => setQueueView('board')}
                  aria-pressed={queueView === 'board'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 motion-reduce:transition-none ${
                    queueView === 'board'
                      ? 'bg-surface font-semibold text-fg shadow-soft'
                      : 'font-medium text-fg-muted hover:text-fg'
                  }`}
                >
                  <LayoutGrid className="size-4" aria-hidden="true" /> Kanban
                </button>
              </div>
            </div>

            {queueView === 'list' && (
            <DataTable<MyQueueOrder>
              columns={queueColumns}
              rows={orders}
              getRowId={(row) => row.id}
              caption="Hàng đợi việc được giao cho xưởng"
              tableLabel="Hàng đợi việc"
              filterable
              filterPlaceholder="Tìm theo mã đơn hoặc mặt hàng…"
              filterFn={(row, query) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  row.orderNumber.toLowerCase().includes(q) ||
                  row.items.some((it) => it.name.toLowerCase().includes(q))
                );
              }}
              pagination
              defaultPageSize={10}
              loading={loadingOrders}
              onRetry={loadQueue}
              loadingLabel="Đang tải hàng đợi việc"
              error={ordersError}
              errorTitle="Không tải được hàng đợi việc"
              emptyState={
                hasPartner ? (
                  <EmptyState
                    live
                    icon={<ClipboardList className="size-5" />}
                    title="Chưa có đơn nào được giao cho xưởng bạn"
                    description={
                      `Hệ thống chưa giao đơn nào cho mã đối tác ${partnerId}. Hãy khai báo năng lực ` +
                      '(máy in, vật liệu) để sẵn sàng nhận việc, và quay lại đây khi có đơn được điều phối.'
                    }
                    action={
                      <>
                        <Button variant="primary" onClick={() => setActiveTab('machines')}>
                          Khai báo máy in
                        </Button>
                        <Button variant="secondary" onClick={() => setActiveTab('materials')}>
                          Khai báo vật liệu
                        </Button>
                      </>
                    }
                  />
                ) : (
                  <EmptyState
                    live
                    icon={<TriangleAlert className="size-5" />}
                    title="Chưa gắn mã đối tác xưởng"
                    description="Hồ sơ xưởng của bạn chưa có partner_id nên không có đơn nào được giao. Hãy nhờ quản trị viên gắn mã đối tác."
                    action={
                      <Button variant="secondary" onClick={() => setActiveTab('preferences')}>
                        Xem cấu hình xưởng
                      </Button>
                    }
                  />
                )
              }
            />
            )}

            {queueView === 'board' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {QUEUE_KANBAN_COLUMNS.map((col) => {
                  const items = orders.filter((o) => {
                    const idx = o.statusStageIndex ?? 0;
                    return idx >= col.min && idx <= col.max;
                  });
                  return (
                    <div key={col.id} className="rounded-lg border border-line-subtle bg-surface-muted/50 p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                          <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${col.dot}`} />
                          <span className="truncate">{col.label}</span>
                        </span>
                        <span className="rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-fg-muted">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.length === 0 ? (
                          <p className="rounded-md border border-dashed border-line-subtle bg-surface/50 px-3 py-4 text-center text-xs text-fg-subtle">
                            Không có đơn
                          </p>
                        ) : items.map((o) => (
                          <div
                            key={o.id}
                            className="space-y-1 rounded-md border border-line bg-surface p-3 shadow-e0 transition-all duration-300 hover:border-line hover:shadow-e1 motion-reduce:transition-none"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-mono text-xs font-semibold text-fg">{o.orderNumber}</span>
                              {typeof o.layerProgress === 'number' ? (
                                <span className="shrink-0 font-mono text-xs tabular-nums text-info">{o.layerProgress}%</span>
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-fg-muted">{o.items[0]?.name || EMPTY_VALUE}</p>
                            <p className="truncate font-mono text-xs text-fg-subtle">
                              {formatNumber(o.items.reduce((s, it) => s + it.quantity, 0))} chi tiết
                              {o.items[0]?.material ? ` · ${o.items[0].material}` : ''}
                            </p>
                            <p className="flex items-center gap-1 truncate text-xs text-fg-subtle">
                              <Printer className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                              {machines.find((m) => m.id === o.assignedPrinterId)?.name || 'Chưa gắn máy'}
                            </p>
                            {o.estimatedDelivery ? (
                              <p className="flex items-center gap-1 truncate text-xs text-fg-subtle">
                                <Clock className="size-3.5 shrink-0" aria-hidden="true" /> Hạn: {formatDate(o.estimatedDelivery)}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
  );
};

export default QueueTab;
