// AccessoriesTab — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { useMemo } from 'react';
import { Package } from 'lucide-react';
import { Button, DataTable, EmptyState, type DataTableColumn } from '@frontend/ui';
import { formatCurrency, formatNumber, EMPTY_VALUE } from '@frontend/lib/format';
import { type MyAccessory } from '@backend/services/workshopService';
import type { WorkshopSettingsController } from './types';


export interface AccessoriesTabProps {
  ctl: WorkshopSettingsController;
}

export const AccessoriesTab: React.FC<AccessoriesTabProps> = ({ ctl }) => {
  const { accessories, accessoriesError, handleDeleteAcc, loadAccessories,
    loadingAccessories, openAccModal, profile, workshopKey } = ctl;

const accessoryColumns = useMemo<DataTableColumn<MyAccessory>[]>(
    () => [
      {
        key: 'name',
        header: 'Phụ kiện',
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-fg">{row.name || EMPTY_VALUE}</span>
            <span className="font-mono text-xs text-fg-subtle">{row.sku || EMPTY_VALUE}</span>
          </div>
        ),
        value: (row) => row.name,
      },
      {
        key: 'quantity',
        header: 'Số lượng',
        numeric: true,
        render: (row) => (
          <span className="text-xs tabular-nums text-fg">
            {row.quantity != null ? formatNumber(row.quantity) : EMPTY_VALUE} {row.unit || ''}
          </span>
        ),
      },
      {
        key: 'prices',
        header: 'Giá vốn / Giá bán',
        render: (row) => (
          <span className="text-xs tabular-nums text-fg">
            {row.costPrice != null ? formatCurrency(row.costPrice) : EMPTY_VALUE} /{' '}
            {row.sellingPrice != null ? formatCurrency(row.sellingPrice) : EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => openAccModal(row)}>
              Sửa
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => handleDeleteAcc(row)}>
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
                  <Package className="size-5 text-primary" aria-hidden="true" />
                  Phụ kiện riêng của xưởng bạn
                </h2>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Chỉ hiển thị bản ghi <code className="font-mono">workshop_accessories.workshop_id = {profile.id}</code>.
                  Phụ kiện dùng chung của nền tảng không thuộc năng lực riêng của xưởng nên không liệt kê ở đây.
                </p>
              </div>
              <Button variant="primary" leadingIcon={<Package className="size-4" />} onClick={() => openAccModal()}>
                Khai báo phụ kiện
              </Button>
            </div>

            <DataTable<MyAccessory>
              columns={accessoryColumns}
              rows={accessories}
              getRowId={(row) => row.id}
              caption="Phụ kiện của xưởng"
              tableLabel="Phụ kiện của xưởng"
              pagination={false}
              loading={loadingAccessories}
              onRetry={loadAccessories}
              error={accessoriesError}
              errorTitle="Không tải được danh sách phụ kiện"
              emptyState={
                <EmptyState
                  live
                  icon={<Package className="size-5" />}
                  title="Xưởng bạn chưa khai phụ kiện nào"
                  description="Chưa có hàng nào trong workshop_accessories cho hồ sơ xưởng này. Khai báo ốc cấy nhiệt, nam châm, hộp đóng gói… nếu xưởng có dùng."
                  action={
                    <Button variant="primary" onClick={() => openAccModal()}>
                      Khai báo phụ kiện đầu tiên
                    </Button>
                  }
                />
              }
            />
          </section>
  );
};

export default AccessoriesTab;
