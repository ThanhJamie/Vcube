import React, { useMemo, useState } from 'react';
import { Order, Product, PrinterProfile, MaterialProfile, AccessoryItem } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { AdminNavSection } from '../AdminSidebar';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Icon,
  StatCard, InfoTip } from '@frontend/ui';
import { EMPTY_VALUE, formatCurrency, formatPercent } from '@frontend/lib/format';

interface Group0OverviewPanelProps {
  orders?: Order[];
  products?: Product[];
  printers?: PrinterProfile[];
  materials?: MaterialProfile[];
  accessories?: AccessoryItem[];
  onNavigateSection?: (section: AdminNavSection) => void;
  onNavigateTracking?: (order: Order) => void;
}

type Timeframe = 'today' | 'week' | 'month' | 'quarter';

/**
 * Bảng màu biểu đồ theo token (spec §2.6) — KHÔNG dùng hex cố định.
 * Dùng cho mọi thanh/phân đoạn biểu đồ trong panel này.
 */
const CHART_SERIES = [
  { key: 'printing', labelVi: 'Đang in', labelEn: 'Printing', color: 'var(--color-primary)' },
  { key: 'idle', labelVi: 'Rảnh', labelEn: 'Idle', color: 'var(--color-positive)' },
  { key: 'maintenance', labelVi: 'Bảo trì', labelEn: 'Maintenance', color: 'var(--color-warning)' }
] as const;

const PERIOD_DAYS: Record<Timeframe, number> = { today: 1, week: 7, month: 30, quarter: 90 };

const dayMs = 24 * 60 * 60 * 1000;

/** Mốc bắt đầu của kỳ hiện tại và kỳ liền trước, suy từ chính kỳ đang chọn. */
function periodWindows(timeframe: Timeframe, now: number): { start: number; prevStart: number } {
  const days = PERIOD_DAYS[timeframe];
  const span = days * dayMs;
  return { start: now - span, prevStart: now - 2 * span };
}

/** Chỉ nhận mốc thời gian hợp lệ; đơn thiếu/không đọc được ngày sẽ bị loại khỏi tổng (không đoán). */
function orderTimestamp(order: Order): number | null {
  const parsed = Date.parse(order.date ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

export const Group0OverviewPanel: React.FC<Group0OverviewPanelProps> = ({
  orders = [],
  products = [],
  printers = [],
  materials = [],
  accessories = [],
  onNavigateSection,
  onNavigateTracking
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [timeframe, setTimeframe] = useState<Timeframe>('month');

  // ---------------------------------------------------------------------------
  // Số liệu: TÍNH từ mảng đã nạp. Không có dữ liệu ⇒ `—`, không rơi về hằng số.
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const now = Date.now();
    const { start, prevStart } = periodWindows(timeframe, now);

    const knownOrders = orders
      .map((order) => ({ order, ts: orderTimestamp(order) }))
      .filter((row): row is { order: Order; ts: number } => row.ts !== null);

    const sumAmount = (rows: { order: Order }[]) =>
      rows.reduce((sum, row) => sum + (row.order.payment?.total ?? 0), 0);

    const currentRows = knownOrders.filter((row) => row.ts >= start);
    const previousRows = knownOrders.filter((row) => row.ts >= prevStart && row.ts < start);

    const revenueCurrent = currentRows.length > 0 ? sumAmount(currentRows) : null;
    const revenuePrevious = previousRows.length > 0 ? sumAmount(previousRows) : null;
    const growthRatio =
      revenueCurrent !== null && revenuePrevious !== null && revenuePrevious > 0
        ? (revenueCurrent - revenuePrevious) / revenuePrevious
        : null;

    const inProduction = orders.filter(
      (order) => order.statusStageIndex !== null && order.statusStageIndex >= 1 && order.statusStageIndex <= 6
    ).length;

    const totalPrinters = printers.length;
    const printingPrinters = printers.filter((printer) => printer.status === 'Printing').length;
    const idlePrinters = printers.filter((printer) => printer.status === 'Idle').length;
    const maintenancePrinters = printers.filter((printer) => printer.status === 'Maintenance').length;
    const fleetUtilisation = totalPrinters > 0 ? printingPrinters / totalPrinters : null;

    // `stockRollsCount` là số đo thật; `inStock === false` là cờ hết hàng thật.
    const lowStockMaterials = materials.filter(
      (material) => material.inStock === false || material.stockRollsCount === 0
    );
    const lowStockAccessories = accessories.filter(
      (accessory) => accessory.stockCount <= accessory.lowStockThreshold
    );
    const inventoryKnown = materials.length > 0 || accessories.length > 0;
    const lowStockTotal = inventoryKnown
      ? lowStockMaterials.length + lowStockAccessories.length
      : null;

    return {
      revenueCurrent,
      growthRatio,
      inProduction,
      knownOrdersCount: knownOrders.length,
      totalPrinters,
      printingPrinters,
      idlePrinters,
      maintenancePrinters,
      fleetUtilisation,
      lowStockMaterials,
      lowStockAccessories,
      lowStockTotal,
      inventoryKnown
    };
  }, [orders, printers, materials, accessories, timeframe]);

  // ---------------------------------------------------------------------------
  // Cảnh báo: SINH TỪ dữ liệu đã nạp (không có mốc thời gian ⇒ không hiện giờ).
  // ---------------------------------------------------------------------------
  const alerts = useMemo(() => {
    const list: {
      id: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      description: string;
      target: AdminNavSection;
      action: string;
    }[] = [];

    metrics.lowStockMaterials.forEach((material) => {
      list.push({
        id: `material-${material.id}`,
        severity: material.stockRollsCount === 0 ? 'critical' : 'warning',
        title: isVi
          ? `${material.name} dưới ngưỡng tồn kho`
          : `${material.name} is below the stock threshold`,
        // D8: `stock_rolls_count` NULL/thiếu ⇒ KHÔNG được in "Còn undefined cuộn".
        // Ba trạng thái phải khác nhau: chưa ghi nhận · hết hàng · còn hàng.
        description:
          material.stockRollsCount == null
            ? isVi
              ? 'Chưa ghi nhận số cuộn tồn kho.'
              : 'No spool count recorded.'
            : material.stockRollsCount <= 0
              ? isVi
                ? 'Đã hết cuộn trong kho.'
                : 'No spool left in stock.'
              : isVi
                ? `Còn ${material.stockRollsCount} cuộn trong kho.`
                : `${material.stockRollsCount} spools left in stock.`,
        target: 'inventory',
        action: isVi ? 'Xem kho' : 'Open inventory'
      });
    });

    metrics.lowStockAccessories.forEach((accessory) => {
      list.push({
        id: `accessory-${accessory.id}`,
        severity: accessory.stockCount === 0 ? 'critical' : 'warning',
        title: isVi
          ? `${accessory.name} dưới ngưỡng tồn kho`
          : `${accessory.name} is below the stock threshold`,
        description: isVi
          ? `Còn ${accessory.stockCount} ${accessory.unit} (ngưỡng ${accessory.lowStockThreshold}).`
          : `${accessory.stockCount} ${accessory.unit} left (threshold ${accessory.lowStockThreshold}).`,
        target: 'inventory',
        action: isVi ? 'Xem kho' : 'Open inventory'
      });
    });

    printers
      .filter((printer) => printer.status === 'Maintenance')
      .forEach((printer) => {
        list.push({
          id: `printer-${printer.id}`,
          severity: 'warning',
          title: isVi
            ? `${printer.name} đang ở trạng thái bảo trì`
            : `${printer.name} is in maintenance`,
          description: isVi
            ? 'Máy đang được đánh dấu bảo trì trong hồ sơ thiết bị.'
            : 'The device record is flagged as under maintenance.',
          target: 'machines',
          action: isVi ? 'Xem đội máy' : 'Open fleet'
        });
      });

    orders
      .filter((order) => order.status === 'pending_payment')
      .forEach((order) => {
        list.push({
          id: `order-${order.id}`,
          severity: 'info',
          title: isVi
            ? `Đơn ${order.orderNumber} chờ thanh toán`
            : `Order ${order.orderNumber} awaits payment`,
          description: isVi
            ? 'Chưa ghi nhận thanh toán cho đơn này.'
            : 'No payment has been recorded for this order.',
          target: 'orders',
          action: isVi ? 'Xem đơn' : 'Open order'
        });
      });

    return list;
  }, [metrics, printers, orders, isVi]);

  const timeframeLabel = (tf: Timeframe) =>
    tf === 'today'
      ? isVi
        ? 'Hôm Nay'
        : 'Today'
      : tf === 'week'
        ? isVi
          ? 'Tuần Này'
          : 'Week'
        : tf === 'month'
          ? isVi
            ? 'Tháng Này'
            : 'Month'
          : isVi
            ? 'Quý Này'
            : 'Quarter';

  const fleetSegments = CHART_SERIES.map((series) => {
    const count =
      series.key === 'printing'
        ? metrics.printingPrinters
        : series.key === 'idle'
          ? metrics.idlePrinters
          : metrics.maintenancePrinters;
    return {
      ...series,
      label: isVi ? series.labelVi : series.labelEn,
      count,
      percent: metrics.totalPrinters > 0 ? (count / metrics.totalPrinters) * 100 : 0
    };
  }).filter((segment) => segment.count > 0);

  return (
    <div className="space-y-6">
      {/* 1. Tiêu đề & lối tắt */}
      <Card padding="lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-sm border border-line bg-surface-muted px-2.5 py-0.5 font-tech text-xs font-bold uppercase tracking-wider text-fg-muted">
              {isVi ? 'Tổng quan' : 'Overview'}
            </span>
            <h2 className="text-lg font-bold text-fg mt-2 flex items-center gap-2.5">
              <Icon name="dashboard" size={24} className="text-primary" />
              {isVi ? 'Tổng Quan Điều Hành Hệ Sinh Thái VCUBE' : 'VCUBE Executive Operations Hub'}
            </h2>
            <div className="mt-1">
              <InfoTip label={isVi ? 'Các chỉ số này được tính thế nào?' : 'How are these figures computed?'}>
                {isVi
                  ? 'Mọi chỉ số dưới đây được tính từ dữ liệu đã nạp (đội máy in, đơn hàng, kho vật tư). Chỉ số không có nguồn dữ liệu hiển thị “—”.'
                  : 'Every figure below is computed from loaded data (printer fleet, orders, inventory). Metrics without a source render “—”.'}
              </InfoTip>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg" role="group" aria-label={isVi ? 'Chọn kỳ báo cáo' : 'Reporting period'}>
              {(['today', 'week', 'month', 'quarter'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  aria-pressed={timeframe === tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    timeframe === tf
                      ? 'bg-surface text-primary shadow-e1'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {timeframeLabel(tf)}
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              leadingIcon={<Icon name="precision_manufacturing" size={18} />}
              onClick={() => onNavigateSection?.('queue')}
            >
              {isVi ? 'Hàng Đợi MES' : 'MES Queue'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Thẻ KPI — dùng primitive StatCard; thiếu dữ liệu ⇒ “—” */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={isVi ? 'Tỷ lệ sử dụng đội máy' : 'Fleet utilisation'}
          value={
            metrics.fleetUtilisation === null
              ? EMPTY_VALUE
              : formatPercent(metrics.fleetUtilisation, { isRatio: true, fractionDigits: 1 })
          }
          icon={<Icon name="print" size={20} />}
          hint={
            metrics.totalPrinters === 0
              ? isVi
                ? 'Chưa khai báo máy in nào'
                : 'No printer recorded yet'
              : isVi
                ? `${metrics.printingPrinters} đang in / ${metrics.totalPrinters} máy`
                : `${metrics.printingPrinters} printing / ${metrics.totalPrinters} printers`
          }
          onClick={() => onNavigateSection?.('machines')}
        />

        <StatCard
          label={isVi ? 'Đơn đang chế tác' : 'Orders in production'}
          value={orders.length === 0 ? EMPTY_VALUE : metrics.inProduction}
          icon={<Icon name="precision_manufacturing" size={20} />}
          hint={
            orders.length === 0
              ? isVi
                ? 'Chưa có đơn hàng nào'
                : 'No orders loaded'
              : isVi
                ? `${orders.length} đơn trong hệ thống`
                : `${orders.length} orders loaded`
          }
          onClick={() => onNavigateSection?.('queue')}
        />

        <StatCard
          label={`${isVi ? 'Doanh thu' : 'Revenue'} · ${timeframeLabel(timeframe)}`}
          value={
            metrics.revenueCurrent === null
              ? EMPTY_VALUE
              : formatCurrency(metrics.revenueCurrent, { maximumFractionDigits: 0 })
          }
          icon={<Icon name="payments" size={20} />}
          delta={
            metrics.growthRatio === null
              ? undefined
              : {
                  value: formatPercent(metrics.growthRatio, { isRatio: true, fractionDigits: 1 }),
                  direction: metrics.growthRatio >= 0 ? 'up' : 'down',
                  label: isVi ? 'so với kỳ trước' : 'vs. previous period'
                }
          }
          hint={
            metrics.revenueCurrent === null
              ? isVi
                ? 'Chưa có đơn hàng trong kỳ này'
                : 'No order in this period'
              : isVi
                ? `${metrics.knownOrdersCount} đơn có mốc thời gian`
                : `${metrics.knownOrdersCount} orders with a valid date`
          }
          onClick={() => onNavigateSection?.('orders')}
        />

        <StatCard
          label={isVi ? 'Cảnh báo tồn kho' : 'Inventory alerts'}
          value={metrics.lowStockTotal === null ? EMPTY_VALUE : metrics.lowStockTotal}
          icon={<Icon name="inventory_2" size={20} />}
          hint={
            metrics.inventoryKnown
              ? isVi
                ? `${metrics.lowStockMaterials.length} vật liệu · ${metrics.lowStockAccessories.length} phụ kiện dưới ngưỡng`
                : `${metrics.lowStockMaterials.length} materials · ${metrics.lowStockAccessories.length} accessories below threshold`
              : isVi
                ? 'Chưa có dữ liệu kho vật tư'
                : 'No inventory data yet'
          }
          onClick={() => onNavigateSection?.('inventory')}
        />
      </div>

      {/* 3. Cơ cấu chi phí Inkiri — chỉ hiển thị khi có bản ghi chi phí thật */}
      <Card padding="lg">
        <CardHeader className="border-b border-line-subtle pb-3">
          <div>
            <span className="inline-flex items-center rounded-sm border border-line bg-surface-muted px-2 py-0.5 font-tech text-xs font-bold text-fg-muted">
              INKIRI
            </span>
            <CardTitle className="text-lg mt-2 flex items-center gap-2">
              <Icon name="pie_chart" size={24} className="text-primary" />
              {isVi
                ? 'Biểu Đồ Phân Bổ Cơ Cấu Chi Phí & Định Giá Inkiri'
                : 'Inkiri Cost Structure & Pricing Breakdown'}
            </CardTitle>
            <span className="flex items-center gap-1.5">
              <InfoTip label={isVi ? 'Cơ cấu chi phí lấy từ đâu?' : 'Where does the cost structure come from?'}>
                {isVi
                  ? 'Cơ cấu chi phí chỉ được vẽ từ bản ghi chi phí thật của kỳ đang chọn.'
                  : 'The cost structure is drawn only from real cost records for the selected period.'}
              </InfoTip>
            </span>
          </div>

        </CardHeader>

        <CardContent className="pt-4">
          <EmptyState
            size="sm"
            title={isVi ? 'Chưa có dữ liệu cơ cấu chi phí' : 'No cost structure data'}
            description={
              isVi
                ? 'Chưa có bản ghi chi phí (khấu hao, điện, nhân công, vật tư) cho kỳ này nên không tính được tỷ trọng.'
                : 'No cost record (depreciation, power, labour, material) exists for this period, so no share can be computed.'
            }
            icon={<Icon name="pie_chart" size={20} className="text-primary" />}
            action={
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="tune" size={18} />}
                onClick={() => onNavigateSection?.('pricing')}
              >
                {isVi ? 'Mở cấu hình giá' : 'Open pricing setup'}
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* 4. Cảnh báo vận hành + phân bổ đội máy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="lg" className="lg:col-span-2 space-y-4">
          <CardHeader className="border-b border-line-subtle pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="notifications_active" size={24} className="text-warning" />
                {isVi ? 'Cảnh Báo Vận Hành' : 'Operational alerts'}
              </CardTitle>
              <span className="flex items-center gap-1.5">
                <InfoTip label={isVi ? 'Cảnh báo vận hành sinh từ đâu?' : 'Where do operational alerts come from?'}>
                  {isVi
                    ? 'Sinh trực tiếp từ đội máy in, kho vật tư và đơn hàng đã nạp — không có mốc thời gian thì không hiển thị giờ.'
                    : 'Derived directly from the loaded fleet, inventory and orders — no timestamp is shown when none exists.'}
                </InfoTip>
              </span>
            </div>
            {alerts.length > 0 && (
              <span className="text-xs font-tech font-bold px-2 py-0.5 bg-warning-tint text-warning rounded-full">
                {alerts.length}
              </span>
            )}
          </CardHeader>

          {alerts.length === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có cảnh báo nào' : 'No alerts'}
              description={
                isVi
                  ? 'Không có vật tư nào dưới ngưỡng, không máy nào ở trạng thái bảo trì và không đơn nào chờ thanh toán trong dữ liệu hiện có.'
                  : 'No material below threshold, no printer under maintenance and no order awaiting payment in the loaded data.'
              }
              icon={<Icon name="check_circle" size={20} />}
              action={
                <Button variant="secondary" size="sm" onClick={() => onNavigateSection?.('inventory')}>
                  {isVi ? 'Kiểm tra kho' : 'Check inventory'}
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 text-xs ${
                    alert.severity === 'critical'
                      ? 'bg-danger-tint/60 border-danger/30'
                      : alert.severity === 'warning'
                        ? 'bg-warning-tint/60 border-warning/30'
                        : 'bg-surface-muted border-line-subtle'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Icon
                      name={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                      size={20}
                      className={`shrink-0 mt-0.5 ${
                        alert.severity === 'critical'
                          ? 'text-danger'
                          : alert.severity === 'warning'
                            ? 'text-warning'
                            : 'text-info'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-fg">{alert.title}</div>
                      <p className="text-fg-muted mt-0.5">{alert.description}</p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigateSection?.(alert.target)}
                  >
                    {alert.action}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="lg" className="space-y-4">
          <CardHeader className="border-b border-line-subtle pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="hub" size={24} className="text-primary" />
                {isVi ? 'Phân Bổ Đội Máy In' : 'Printer fleet distribution'}
              </CardTitle>
              <span className="flex items-center gap-1.5">
                <InfoTip label={isVi ? 'Phân bổ đội máy in đếm theo tiêu chí nào?' : 'How is the fleet distribution counted?'}>
                  {isVi ? 'Đếm theo trạng thái thiết bị đã khai báo.' : 'Counted from recorded device status.'}
                </InfoTip>
              </span>
            </div>
          </CardHeader>

          {metrics.totalPrinters === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có máy in nào' : 'No printer recorded'}
              description={
                <span className="flex flex-wrap items-center justify-center gap-1.5">
                  <span>
                    {isVi ? 'Chưa nhận được thiết bị nào từ bảng printer_fleet.' : 'No device received from printer_fleet.'}
                  </span>
                  <InfoTip label={isVi ? 'Vì sao chưa có gì để phân bổ?' : 'Why is there nothing to break down?'}>
                    {isVi
                      ? 'Bảng điều khiển chưa nhận được thiết bị nào từ bảng printer_fleet, nên không có gì để phân bổ.'
                      : 'The dashboard received no device from printer_fleet, so there is nothing to break down.'}
                  </InfoTip>
                </span>
              }
              icon={<Icon name="print" size={20} />}
              action={
                <Button variant="primary" size="sm" onClick={() => onNavigateSection?.('machines')}>
                  {isVi ? 'Khai báo máy in' : 'Register a printer'}
                </Button>
              }
            />
          ) : (
            <>
              {/* Bảng màu biểu đồ theo token (spec §2.6) + nhãn chữ, không truyền đạt chỉ bằng màu */}
              <div
                className="w-full h-8 bg-surface-muted rounded-sm overflow-hidden flex"
                role="img"
                aria-label={fleetSegments
                  .map((segment) => `${segment.label}: ${segment.count}/${metrics.totalPrinters}`)
                  .join(', ')}
              >
                {fleetSegments.map((segment) => (
                  <div
                    key={segment.key}
                    style={{ width: `${segment.percent}%`, backgroundColor: segment.color }}
                    className="h-full"
                    title={`${segment.label}: ${segment.count} (${Math.round(segment.percent)}%)`}
                  />
                ))}
              </div>

              <ul className="space-y-2">
                {fleetSegments.map((segment) => (
                  <li key={segment.key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="font-bold text-fg truncate">{segment.label}</span>
                    </span>
                    <span className="font-tech font-bold text-fg tabular-nums shrink-0">
                      {segment.count} · {Math.round(segment.percent)}%
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => onNavigateSection?.('partners')}
              >
                {isVi ? 'Quản lý mạng lưới xưởng in' : 'Manage workshop network'}
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* 5. Danh mục sản phẩm đã nạp (đếm thật, không suy diễn doanh số) */}
      <Card padding="lg">
        <CardHeader>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Icon name="inventory_2" size={24} className="text-primary" />
              {isVi ? 'Danh Mục Sản Phẩm Đã Nạp' : 'Loaded catalog'}
            </CardTitle>
            <span className="flex items-center gap-1.5">
              <InfoTip label={isVi ? 'Danh mục đã nạp đếm những gì?' : 'What does the loaded catalog count?'}>
                {isVi
                  ? 'Chỉ đếm số bản ghi đọc được; không kèm lượt bán hay đánh giá vì chưa có nguồn dữ liệu.'
                  : 'Counts loaded records only; no sales or ratings because no source exists.'}
              </InfoTip>
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {products.length === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có sản phẩm nào' : 'No product yet'}
              description={
                isVi
                  ? 'Bảng products chưa có bản ghi nào, nên catalog đang rỗng.'
                  : 'The products table has no row, so the catalog is empty.'
              }
              icon={<Icon name="inventory_2" size={20} />}
              action={
                <Button variant="primary" size="sm" onClick={() => onNavigateSection?.('products')}>
                  {isVi ? 'Thêm sản phẩm' : 'Add a product'}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-muted">
                <div className="text-fg-subtle">{isVi ? 'Sản phẩm' : 'Products'}</div>
                <div className="font-tech font-bold text-lg text-fg tabular-nums">{products.length}</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-muted">
                <div className="text-fg-subtle">{isVi ? 'Vật liệu' : 'Materials'}</div>
                <div className="font-tech font-bold text-lg text-fg tabular-nums">{materials.length}</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-muted">
                <div className="text-fg-subtle">{isVi ? 'Phụ kiện' : 'Accessories'}</div>
                <div className="font-tech font-bold text-lg text-fg tabular-nums">{accessories.length}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Group0OverviewPanel;
