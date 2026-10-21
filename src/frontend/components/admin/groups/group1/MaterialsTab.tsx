import React from 'react';
import { Icon, Button, EmptyState, DataTable } from '@frontend/ui';
import type { WorkshopMaterial } from '@/types';
import type { MaterialsTabProps } from './types';

export const MaterialsTab: React.FC<MaterialsTabProps> = (props) => {
  const { lowStockList, setIsAddMaterialModalOpen, materials, materialColumns } = props;

  return (
        <div className="space-y-4">
          {/* Low stock warning banner */}
          {lowStockList.length > 0 && (
            <div className="p-4 bg-danger-tint border border-danger/20 rounded-lg flex items-start gap-3">
              <Icon name="warning" size={28} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-danger text-sm">
                  {`Cảnh Báo: Có ${lowStockList.length} cuộn/loại vật liệu đang dưới ngưỡng an toàn!`}
                </h4>
                <p className="text-xs text-danger mt-1">
                  Cần nhập bổ sung ngay để không gián đoạn các đơn hàng in 3D đang dispatch tới xưởng.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockList.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 bg-surface border border-danger/20 text-danger text-xs font-medium rounded-md"
                    >
                      {m.materialName}: {m.currentStockGrams}g / {m.lowStockThresholdGrams}g
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Material inventory table controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="text-xs text-fg-subtle font-medium">
              Danh sách tồn kho CHƯA nối nguồn DB: `workshop_materials` bị RLS giới hạn theo xưởng và bảng danh mục `materials` không có cột tồn kho theo xưởng — nên bảng dưới đây không phải số liệu thật.
            </div>

            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Icon name="add" size={16} />}
              onClick={() => setIsAddMaterialModalOpen(true)}
              className="shrink-0"
            >
              Thêm Cuộn Nhựa / Resin
            </Button>
          </div>

          {/* Materials Table */}
          <div className="bg-surface rounded-lg border border-line overflow-hidden">
            {materials.length === 0 ? (
            <EmptyState
              size="sm"
              title="Chưa nối nguồn tồn kho"
              description={
                'Đây KHÔNG phải "kho rỗng": màn này chưa có hàm service nào đọc tồn kho theo xưởng, nên không hiển thị số liệu thay thế.'
              }
              icon={<Icon name="layers" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add" size={18} />}
                  onClick={() => setIsAddMaterialModalOpen(true)}
                >
                  Thêm Cuộn Nhựa / Resin
                </Button>
              }
            />
            ) : (
            <DataTable<WorkshopMaterial>
              columns={materialColumns}
              rows={materials}
              getRowId={(row) => row.id}
              caption="Tồn kho vật liệu theo xưởng"
              tableLabel="Tồn kho vật liệu theo xưởng"
              defaultSort={[{ key: 'materialName', direction: 'asc' }]}
            />
            )}
          </div>
        </div>
  );
};
