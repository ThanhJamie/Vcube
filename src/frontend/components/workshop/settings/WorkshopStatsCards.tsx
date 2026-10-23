// WorkshopStatsCards (4 StatCard theo tab) — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { useMemo } from 'react';
import { StatCard, Icon } from '@frontend/ui';
import { formatNumber, EMPTY_VALUE } from '@frontend/lib/format';
import { type MyQueueOrder } from '@backend/services/workshopService';
import type { WorkshopSettingsController } from './types';


export interface WorkshopStatsCardsProps {
  ctl: WorkshopSettingsController;
}

export const WorkshopStatsCards: React.FC<WorkshopStatsCardsProps> = ({ ctl }) => {
  const { accessories, activeTab, hasPartner, machines,
    materials, orders } = ctl;

const stats = useMemo(() => {
    const idx = (o: MyQueueOrder) => (typeof o.statusStageIndex === 'number' ? o.statusStageIndex : null);
    // Nấc cuối pipeline MES (index 7 = "Xuất xưởng giao") là TRẠNG THÁI KẾT THÚC ⇒ không được
    // tính đồng thời vào "đang xử lý" và "đã hoàn thành" (trước đây double-count).
    const isTerminal = (o: MyQueueOrder) => o.status === 'completed' || idx(o) === 7;
    const active = orders.filter((o) => o.status !== 'cancelled' && !isTerminal(o));
    const inPrint = orders.filter((o) => {
      const i = idx(o);
      return i != null && i >= 3 && i <= 4;
    });
    const done = orders.filter(isTerminal);
    const stockGrams = materials.reduce((sum, m) => sum + (m.currentStockGrams ?? 0), 0);
    const lowStock = materials.filter(
      (m) =>
        m.currentStockGrams != null &&
        m.lowStockThresholdGrams != null &&
        m.currentStockGrams <= m.lowStockThresholdGrams,
    ).length;
    const freeMachines = machines.filter((m) => m.status === 'Free').length;
    return {
      active: active.length,
      inPrint: inPrint.length,
      done: done.length,
      stockGrams,
      lowStock,
      hasStockData: materials.some((m) => m.currentStockGrams != null),
      freeMachines,
      machinesWithoutRate: machines.filter((m) => m.hourlyRate == null).length,
    };
  }, [orders, materials, machines]);

  return (
<div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {activeTab === 'machines' ? (
            <>
              <StatCard
                label="Máy in"
                value={formatNumber(machines.length)}
                icon={<Icon name="build" className="size-4" />}
                hint={machines.length === 0 ? 'Chưa khai máy in nào' : `${formatNumber(stats.freeMachines)} đang rảnh`}
              />
              <StatCard
                label="Đang in"
                value={formatNumber(machines.filter((m) => m.status === 'Busy').length)}
                icon={<Icon name="printer" className="size-4" />}
                hint="Theo trạng thái xưởng tự đặt"
              />
              <StatCard
                label="Bảo trì / Tắt"
                value={formatNumber(machines.filter((m) => m.status === 'Maintenance' || m.status === 'Offline').length)}
                icon={<Icon name="warning" className="size-4" />}
                hint="Máy cần chú ý"
              />
              <StatCard
                label="Chưa khai đơn giá giờ"
                value={formatNumber(stats.machinesWithoutRate)}
                icon={<Icon name="build" className="size-4" />}
                hint={stats.machinesWithoutRate > 0 ? 'Bổ sung để báo giá chuẩn' : 'Đã khai đủ'}
              />
            </>
          ) : activeTab === 'materials' ? (
            <>
              <StatCard
                label="Vật liệu"
                value={formatNumber(materials.length)}
                icon={<Icon name="layers" className="size-4" />}
                hint={materials.length === 0 ? 'Chưa khai vật liệu nào' : 'Loại phôi đã khai'}
              />
              <StatCard
                label="Tồn kho phôi"
                value={stats.hasStockData ? `${formatNumber(stats.stockGrams)} g` : EMPTY_VALUE}
                icon={<Icon name="layers" className="size-4" />}
                hint={stats.hasStockData ? 'Tổng theo vật liệu' : 'Chưa từng ghi nhận tồn kho'}
              />
              <StatCard
                label="Tới ngưỡng cảnh báo"
                value={formatNumber(stats.lowStock)}
                icon={<Icon name="warning" className="size-4" />}
                hint={stats.lowStock > 0 ? 'Cần nhập thêm phôi' : 'Tồn kho an toàn'}
              />
              <StatCard
                label="Chưa ghi nhận tồn"
                value={formatNumber(materials.filter((m) => m.currentStockGrams == null).length)}
                icon={<Icon name="layers" className="size-4" />}
                hint="Vật liệu chưa từng nhập/xuất"
              />
            </>
          ) : activeTab === 'accessories' ? (
            <>
              <StatCard
                label="Phụ kiện riêng"
                value={formatNumber(accessories.length)}
                icon={<Icon name="package" className="size-4" />}
                hint={accessories.length === 0 ? 'Chưa khai phụ kiện nào' : 'Theo hồ sơ xưởng'}
              />
              <StatCard
                label="Máy in"
                value={formatNumber(machines.length)}
                icon={<Icon name="build" className="size-4" />}
                hint={`${formatNumber(stats.freeMachines)} đang rảnh`}
              />
              <StatCard
                label="Vật liệu"
                value={formatNumber(materials.length)}
                icon={<Icon name="layers" className="size-4" />}
                hint={stats.hasStockData ? `${formatNumber(stats.stockGrams)} g tồn` : 'Chưa ghi nhận tồn'}
              />
              <StatCard
                label="Đơn đang xử lý"
                value={hasPartner ? formatNumber(stats.active) : EMPTY_VALUE}
                icon={<Icon name="clipboard_list" className="size-4" />}
                hint={hasPartner ? 'Đơn được giao cho xưởng' : 'Chưa gắn mã đối tác'}
              />
            </>
          ) : (
            <>
              <StatCard
                label="Đơn đang xử lý"
                value={hasPartner ? formatNumber(stats.active) : EMPTY_VALUE}
                icon={<Icon name="clipboard_list" className="size-4" />}
                hint={hasPartner ? `Tổng ${formatNumber(orders.length)} đơn được giao cho xưởng bạn` : 'Chưa gắn mã đối tác xưởng'}
              />
              <StatCard
                label="Đang in / hậu kỳ"
                value={hasPartner ? formatNumber(stats.inPrint) : EMPTY_VALUE}
                icon={<Icon name="printer" className="size-4" />}
                hint={hasPartner ? `${formatNumber(stats.done)} đơn đã hoàn thành` : 'Chưa gắn mã đối tác xưởng'}
              />
              <StatCard
                label="Máy in của xưởng"
                value={formatNumber(machines.length)}
                icon={<Icon name="build" className="size-4" />}
                hint={
                  machines.length === 0
                    ? 'Chưa khai máy in nào'
                    : `${formatNumber(stats.freeMachines)} rảnh${stats.machinesWithoutRate > 0 ? ` · ${formatNumber(stats.machinesWithoutRate)} chưa khai đơn giá giờ` : ''}`
                }
              />
              <StatCard
                label="Tồn kho phôi"
                value={stats.hasStockData ? `${formatNumber(stats.stockGrams)} g` : EMPTY_VALUE}
                icon={<Icon name="layers" className="size-4" />}
                hint={
                  materials.length === 0
                    ? 'Chưa khai vật liệu nào'
                    : stats.hasStockData
                      ? `${formatNumber(materials.length)} vật liệu · ${formatNumber(stats.lowStock)} tới ngưỡng cảnh báo`
                      : 'Chưa từng ghi nhận tồn kho'
                }
              />
            </>
          )}
        </div>
  );
};

export default WorkshopStatsCards;
