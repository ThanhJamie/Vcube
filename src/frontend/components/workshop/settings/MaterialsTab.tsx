// MaterialsTab — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { useMemo } from 'react';
import { ArrowDownToLine, Layers } from 'lucide-react';
import { Badge, Button, Card, DataTable, EmptyState, type DataTableColumn } from '@frontend/ui';
import { formatCurrency, formatNumber, EMPTY_VALUE } from '@frontend/lib/format';
import { type MyMaterial } from '@backend/services/workshopService';
import type { WorkshopSettingsController } from './types';


export interface MaterialsTabProps {
  ctl: WorkshopSettingsController;
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({ ctl }) => {
  const { handleDeleteMaterial, loadMaterialsAndLogs, loadingMaterials, materialCatalog,
    materials, materialsError, openLogModal, openMaterialModal,
    workshopKey } = ctl;

const materialColumns = useMemo<DataTableColumn<MyMaterial>[]>(
    () => [
      {
        key: 'name',
        header: 'Vật liệu',
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-fg">{row.name || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">
              {row.type || EMPTY_VALUE}
              {row.color ? ` · ${row.color}` : ''}
            </span>
          </div>
        ),
        value: (row) => row.name,
      },
      {
        key: 'stock',
        header: 'Tồn kho',
        numeric: true,
        render: (row) =>
          row.currentStockGrams != null ? (
            <span className="text-xs tabular-nums text-fg">{formatNumber(row.currentStockGrams)} g</span>
          ) : (
            <Badge variant="neutral">Chưa ghi nhận</Badge>
          ),
        value: (row) => (row.currentStockGrams != null ? row.currentStockGrams : -1),
      },
      {
        key: 'threshold',
        header: 'Ngưỡng cảnh báo',
        numeric: true,
        render: (row) =>
          row.lowStockThresholdGrams != null ? (
            <span className="text-xs tabular-nums text-fg">
              {formatNumber(row.lowStockThresholdGrams)} g
            </span>
          ) : (
            <span className="text-fg-subtle">{EMPTY_VALUE}</span>
          ),
      },
      {
        key: 'pricePerKg',
        header: 'Đơn giá',
        numeric: true,
        render: (row) =>
          row.pricePerKg != null ? (
            <span className="text-xs tabular-nums text-fg">{formatCurrency(row.pricePerKg)}/kg</span>
          ) : (
            <Badge variant="warning">Chưa khai</Badge>
          ),
        value: (row) => (row.pricePerKg != null ? row.pricePerKg : -1),
      },
      {
        key: 'stockStatus',
        header: 'Trạng thái kho',
        render: (row) => (
          <Badge
            variant={
              row.stockStatus === 'OutOfStock'
                ? 'danger'
                : row.stockStatus === 'LowStock'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {row.stockStatus === 'OutOfStock'
              ? 'Hết hàng'
              : row.stockStatus === 'LowStock'
                ? 'Sắp hết'
                : row.stockStatus === 'Tracking'
                  ? 'Đang theo dõi'
                  : row.stockStatus === 'NotTracking'
                    ? 'Chưa theo dõi'
                    : 'Chưa khai'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => openLogModal(row.id)}>
              Nhập kho
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openMaterialModal(row)}>
              Sửa
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => handleDeleteMaterial(row)}>
              Xoá
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workshopKey],
  );

  return (
<section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                  <Layers className="size-5 text-primary" aria-hidden="true" />
                  Vật liệu & tồn kho của xưởng bạn
                </h2>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Tồn kho để trống nghĩa là <strong>chưa từng ghi nhận</strong> (khác với 0 g). Đơn giá để
                  trống nghĩa là <strong>chưa khai</strong>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" leadingIcon={<ArrowDownToLine className="size-4" />} onClick={() => openLogModal()}>
                  Ghi phiếu kho
                </Button>
                <Button variant="primary" leadingIcon={<Layers className="size-4" />} onClick={() => openMaterialModal()}>
                  Khai báo vật liệu
                </Button>
              </div>
            </div>

            <DataTable<MyMaterial>
              columns={materialColumns}
              rows={materials}
              getRowId={(row) => row.id}
              caption="Vật liệu của xưởng"
              tableLabel="Vật liệu của xưởng"
              rowClassName={(row) =>
                row.stockStatus === 'OutOfStock'
                  ? 'bg-danger-tint'
                  : row.stockStatus === 'LowStock'
                    ? 'bg-warning-tint'
                    : ''
              }
              pagination={false}
              loading={loadingMaterials}
              onRetry={loadMaterialsAndLogs}
              error={materialsError}
              errorTitle="Không tải được danh sách vật liệu"
              emptyState={
                <EmptyState
                  live
                  icon={<Layers className="size-5" />}
                  title="Xưởng bạn chưa khai vật liệu nào"
                  description="Chưa có hàng nào trong workshop_materials cho hồ sơ xưởng này. Khai báo cuộn phôi đầu tiên rồi ghi phiếu nhập để theo dõi tồn."
                  action={
                    <Button variant="primary" onClick={() => openMaterialModal()}>
                      Khai báo vật liệu đầu tiên
                    </Button>
                  }
                />
              }
            />

            {materialCatalog.length > 0 ? (
              <Card padding="md">
                <p className="text-xs font-semibold text-fg">Danh mục vật liệu tham chiếu của VCUBE</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  Đây là danh mục dùng chung của nền tảng, <strong>không phải</strong> tồn kho của xưởng bạn.
                  Dùng để đối chiếu tên/loại khi khai báo.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {materialCatalog.map((m) => (
                    <Badge key={m.id} variant="neutral">
                      {m.name}
                      {m.type ? ` · ${m.type}` : ''}
                    </Badge>
                  ))}
                </div>
              </Card>
            ) : null}
          </section>
  );
};

export default MaterialsTab;
