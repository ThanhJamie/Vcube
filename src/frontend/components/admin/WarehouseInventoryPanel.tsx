import React, { useMemo, useState } from 'react';
import { MaterialProfile, AccessoryItem } from '../../types';
import { Icon, InfoTip, DataTable, EmptyState, Field, Input, Button, Badge } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { EMPTY_VALUE, formatNumber } from '../../lib/format';

/**
 * Đợt S (#1): `materials.cost_per_kg` / `price_per_gram` / `stock_rolls_count` … nay là
 * **nullable THẬT** (`mappers.numOrNull` — không còn số mặc định) ⇒ `null` = CHƯA KHAI.
 * `.toLocaleString()` trên `null` làm **crash trắng** trang kho, nên mọi chỗ hiển thị đi qua
 * `numText()`: thiếu số ⇒ `—`, KHÔNG bịa 0.
 *
 * W2-H: `null` KHÁC `0` ở MỌI phép tính, không chỉ ở chỗ hiển thị. `x || 0` biến "chưa khai"
 * thành "bằng không" ⇒ tổng bị thiếu mà không ai biết, và một dòng chưa khai tồn bị xếp
 * "sắp hết". Mọi phép cộng/so sánh dưới đây đi qua `declaredNumber()`; dòng nào thiếu dữ liệu
 * thì bị LOẠI khỏi tổng và bật cờ `…Incomplete` để người đọc biết con số đang thiếu.
 */
const numText = (v: number | null | undefined, suffix = ''): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${formatNumber(v)}${suffix}` : EMPTY_VALUE;

/** Ngưỡng "sắp hết" cho vật liệu (cuộn/bình) — MỘT nơi khai báo (KPI, bộ lọc, từng dòng). */
const MATERIAL_LOW_STOCK_THRESHOLD = 3;

/**
 * Số ĐÃ KHAI (hữu hạn) hay `null` (CHƯA khai).
 *
 * VÌ SAO KHÔNG dùng `?? 0` ở nơi tính toán: dòng chưa khai `stock_rolls_count` mà bị coi là 0
 * sẽ (a) nằm trong tổng như một số đo thật, và (b) thoả `0 <= 3` nên bị gắn nhãn "sắp hết" —
 * đúng thứ tài liệu `docs/design/data-honesty.md` cấm.
 */
const declaredNumber = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** Giá vốn / kg suy từ dữ liệu THẬT: `costPerKg`, hoặc `pricePerGram × 1000`. Thiếu cả hai ⇒ `null`. */
const costPerKgOf = (m: MaterialProfile): number | null => {
  if (typeof m.costPerKg === 'number' && Number.isFinite(m.costPerKg)) return m.costPerKg;
  if (typeof m.pricePerGram === 'number' && Number.isFinite(m.pricePerGram)) return m.pricePerGram * 1000;
  return null;
};

/** Vật liệu "sắp hết": CHỈ khi tồn đã được khai và `<= MATERIAL_LOW_STOCK_THRESHOLD`. */
const isMaterialLow = (m: MaterialProfile): boolean => {
  const stock = declaredNumber(m.stockRollsCount);
  return stock !== null && stock <= MATERIAL_LOW_STOCK_THRESHOLD;
};

/** Phụ kiện "sắp hết": CHỈ khi ngưỡng đã được cấu hình (`null` = chưa cấu hình, KHÔNG phải 0). */
const isAccessoryLow = (a: AccessoryItem): boolean => {
  const threshold = declaredNumber(a.lowStockThreshold);
  const stock = declaredNumber(a.stockCount);
  return threshold !== null && stock !== null && stock <= threshold;
};

interface WarehouseInventoryPanelProps {
  materials: MaterialProfile[];
  accessories: AccessoryItem[];
  onUpdateMaterials: (materials: MaterialProfile[]) => void;
  onUpdateAccessories: (accessories: AccessoryItem[]) => void;
  onShowToast: (message: string) => void;
}

export const WarehouseInventoryPanel: React.FC<WarehouseInventoryPanelProps> = ({
  materials,
  accessories,
  onUpdateMaterials,
  onUpdateAccessories,
  onShowToast
}) => {
  const [filterType, setFilterType] = useState<'all' | 'materials' | 'accessories' | 'low_stock'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Calculate Aggregated Metrics — chỉ cộng những dòng ĐÃ KHAI.
  const spoolCounts = materials.map((m) => declaredNumber(m.stockRollsCount));
  const declaredSpools = spoolCounts.filter((v): v is number => v !== null);
  const totalMaterialSpools = declaredSpools.reduce((sum, v) => sum + v, 0);
  // Có dòng CHƯA khai tồn ⇒ tổng là số THIẾU, phải nói rõ (không để người đọc tưởng là đủ).
  const materialStockIncomplete = spoolCounts.some((v) => v === null);

  /**
   * Tổng cuộn/bình. Bảng CÓ dòng nhưng KHÔNG dòng nào khai tồn ⇒ `—` (không phải "0 cuộn",
   * vì 0 là một số đo và ta chưa đo được gì).
   */
  const materialSpoolsText = (suffix: string): string =>
    declaredSpools.length === 0 && materials.length > 0 ? EMPTY_VALUE : numText(totalMaterialSpools, suffix);

  const totalMaterialValue = materials.reduce((sum, m) => {
    const stock = declaredNumber(m.stockRollsCount);
    const cost = costPerKgOf(m);
    // Thiếu VẾ NÀO thì giá trị là KHÔNG BIẾT: không nhân với 0 rồi cộng như thể đã đo.
    if (stock === null || cost === null) return sum;
    return sum + cost * stock;
  }, 0);
  // Đợt S (#1): có vật liệu ĐANG TỒN nhưng CHƯA khai giá vốn ⇒ tổng là số THIẾU ⇒ phải nói rõ,
  // không được để người đọc tưởng đây là toàn bộ giá trị kho. W2-H: thêm cả trường hợp CHƯA
  // khai tồn (trước đây `(m.stockRollsCount || 0) > 0` khiến dòng đó không hề bật cờ).
  const materialValueIncomplete = materials.some((m) => {
    const stock = declaredNumber(m.stockRollsCount);
    if (stock === null) return true; // chưa khai tồn ⇒ không biết giá trị
    if (stock === 0) return false; // 0 cuộn/bình ⇒ giá trị 0, đã biết
    return costPerKgOf(m) === null; // có tồn nhưng chưa khai giá vốn
  });

  const totalAccessoriesCount = accessories.reduce(
    (sum, a) => sum + (declaredNumber(a.stockCount) ?? 0),
    0
  );
  const totalAccessoriesValue = accessories.reduce((sum, a) => {
    const stock = declaredNumber(a.stockCount);
    const cost = declaredNumber(a.costPrice);
    if (stock === null || cost === null) return sum;
    return sum + cost * stock;
  }, 0);
  const accessoryValueIncomplete = accessories.some(
    (a) => declaredNumber(a.stockCount) === null || declaredNumber(a.costPrice) === null
  );

  const totalInventoryValuation = totalMaterialValue + totalAccessoriesValue;
  const inventoryValueIncomplete = materialValueIncomplete || accessoryValueIncomplete;

  const lowStockMaterials = materials.filter(isMaterialLow);
  const lowStockAccessories = accessories.filter(isAccessoryLow);
  const totalLowStockAlerts = lowStockMaterials.length + lowStockAccessories.length;

  // Extract Unique Locations
  const locations = Array.from(
    new Set(accessories.map(a => a.warehouseLocation).filter(Boolean) as string[])
  ).sort();

  // Handle Material Stock Adjust
  const handleMaterialStockAdjust = (id: string, delta: number) => {
    const updated = materials.map(m => {
      if (m.id === id) {
        // Bấm ±1 CHÍNH LÀ hành vi khai tồn: dòng CHƯA khai (`null`) lấy mốc 0 rồi ghi số mới
        // do người dùng chọn — không âm thầm coi "chưa khai" là 0 ở bất kỳ chỗ nào khác.
        const base = declaredNumber(m.stockRollsCount) ?? 0;
        const count = Math.max(0, base + delta);
        return { ...m, stockRollsCount: count, inStock: count > 0 };
      }
      return m;
    });
    onUpdateMaterials(updated);
    onShowToast(`Đã cập nhật tồn kho vật liệu (${delta > 0 ? `+${delta}` : delta} cuộn/bình)`);
  };

  // Handle Accessory Stock Adjust
  const handleAccessoryStockAdjust = (id: string, delta: number) => {
    const updated = accessories.map(a => {
      if (a.id === id) {
        const base = declaredNumber(a.stockCount) ?? 0;
        const count = Math.max(0, base + delta);
        return { ...a, stockCount: count };
      }
      return a;
    });
    onUpdateAccessories(updated);
    onShowToast(`Đã cập nhật tồn kho phụ kiện (${delta > 0 ? `+${delta}` : delta})`);
  };

  const filteredMaterials = useMemo(
    () =>
      materials.filter((m) => {
        const matchSearch =
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchLow = filterType !== 'low_stock' || isMaterialLow(m);
        return matchSearch && matchLow;
      }),
    [materials, searchTerm, filterType]
  );

  /** Cột bảng vật liệu dùng primitive `DataTable`. */
  const materialColumns = useMemo<DataTableColumn<MaterialProfile>[]>(() => [
    {
      key: 'name',
      header: 'Tên Vật Liệu',
      value: (m) => m.name,
      render: (mat) => (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {mat.colors.slice(0, 3).map((col, idx) => (
              <span key={`${col}-${idx}`} className="inline-block h-3.5 w-3.5 rounded-full border border-line" style={{ backgroundColor: col }} />
            ))}
          </div>
          <div>
            <p className="font-bold text-fg">{mat.name}</p>
            <p className="text-xs text-fg-muted">{mat.recommendedFor || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'brand', header: 'Thương Hiệu', value: (m) => m.brand || '', render: (mat) => <span className="text-fg-muted">{mat.brand || '—'}</span> },
    {
      key: 'costPerKg',
      header: 'Giá Vốn / kg',
      numeric: true,
      value: (m) => costPerKgOf(m) ?? 0,
      render: (mat) => <span className="font-mono tabular-nums text-fg-muted">{numText(costPerKgOf(mat), ' ₫')}</span>,
    },
    {
      key: 'pricePerGram',
      header: 'Giá Báo / g',
      numeric: true,
      value: (m) => m.pricePerGram ?? 0,
      render: (mat) => <span className="font-mono font-bold tabular-nums text-primary">{numText(mat.pricePerGram, ' đ/g')}</span>,
    },
    {
      key: 'stockRollsCount',
      header: 'Tồn Kho (Cuộn)',
      align: 'center',
      value: (m) => m.stockRollsCount ?? 0,
      render: (mat) => {
        const count = declaredNumber(mat.stockRollsCount);
        const isLow = isMaterialLow(mat);
        const outOfStock = count !== null && count <= 0;
        return (
          <div className="flex flex-col items-center gap-1.5">
            <span className={`font-mono text-sm font-bold tabular-nums ${isLow ? 'text-danger' : 'text-fg'}`}>{numText(count, ' cuộn')}</span>
            {count === null ? (
              <Badge variant="neutral" dot>Chưa khai tồn</Badge>
            ) : outOfStock ? (
              <Badge variant="danger" dot icon={<Icon name="warning" size={12} />}>Hết hàng</Badge>
            ) : isLow ? (
              <Badge variant="warning" dot icon={<Icon name="warning" size={12} />}>
                Cần nhập thêm (&lt;={MATERIAL_LOW_STOCK_THRESHOLD})
              </Badge>
            ) : (
              <Badge variant="success" dot>Đủ hàng</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'quoteStatus',
      header: 'Trạng Thái Báo Giá',
      align: 'center',
      render: (mat) => {
        const count = declaredNumber(mat.stockRollsCount);
        if (count === null) {
          return <Badge variant="neutral">Chưa khai tồn</Badge>;
        }
        if (mat.inStock && count > 0) {
          return <Badge variant="success" dot>Sẵn Sàng Cho Khách</Badge>;
        }
        return <Badge variant="danger" dot>Tạm Hết Hàng</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Nhập / Xuất Kho',
      align: 'right',
      render: (mat) => (
        <div className="flex items-center justify-end gap-1">
          {[
            { delta: -1, label: '-1', variant: 'secondary' as const },
            { delta: 1, label: '+1', variant: 'secondary' as const },
            { delta: 5, label: '+5', variant: 'primary' as const },
          ].map((btn) => (
            <Button
              key={btn.delta}
              type="button"
              size="sm"
              variant={btn.variant}
              onClick={() => handleMaterialStockAdjust(mat.id, btn.delta)}
              aria-label={`${btn.label} ${mat.name}`}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const filteredAccessoriesList = useMemo(
    () =>
      accessories.filter((a) => {
        const matchSearch =
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (a.warehouseLocation && a.warehouseLocation.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchLocation = selectedLocation === 'all' || a.warehouseLocation === selectedLocation;
        const matchLow = filterType !== 'low_stock' || isAccessoryLow(a);
        return matchSearch && matchLocation && matchLow;
      }),
    [accessories, searchTerm, selectedLocation, filterType]
  );

  /** Cột bảng phụ kiện dùng primitive `DataTable`. */
  const accessoryColumns = useMemo<DataTableColumn<AccessoryItem>[]>(() => [
    {
      key: 'name',
      header: 'PK / SKU',
      value: (a) => a.name,
      render: (acc) => (
        <div className="flex items-center gap-2.5">
          {acc.imageUrl ? (
            <img src={acc.imageUrl} alt={acc.name} className="h-8 w-8 rounded-md border border-line object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line-subtle bg-surface-muted text-fg-subtle">
              <Icon name="inventory" size={16} />
            </span>
          )}
          <div>
            <p className="font-bold text-fg">{acc.name}</p>
            <span className="font-mono text-xs font-semibold text-primary">{acc.sku || '—'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Phân Loại',
      value: (a) => a.category,
      render: (acc) => <Badge variant="info" className="capitalize">{acc.category}</Badge>,
    },
    {
      key: 'warehouseLocation',
      header: 'Vị Trí Kệ',
      value: (a) => a.warehouseLocation || '',
      render: (acc) => (
        <span className="flex items-center gap-1 font-mono text-xs font-bold text-primary">
          <Icon name="shelves" size={14} />
          {acc.warehouseLocation || '—'}
        </span>
      ),
    },
    { key: 'costPrice', header: 'Giá Vốn', numeric: true, value: (a) => a.costPrice ?? 0, render: (acc) => <span className="font-mono tabular-nums text-fg-muted">{numText(acc.costPrice, ' ₫')}</span> },
    { key: 'sellingPrice', header: 'Giá Báo Khách', numeric: true, value: (a) => a.sellingPrice ?? 0, render: (acc) => <span className="font-mono font-bold tabular-nums text-fg">{numText(acc.sellingPrice, ' ₫')}</span> },
    {
      key: 'stockCount',
      header: 'Tồn Kho',
      align: 'center',
      value: (a) => a.stockCount ?? 0,
      render: (acc) => {
        const threshold = declaredNumber(acc.lowStockThreshold);
        const isLow = isAccessoryLow(acc);
        const stock = declaredNumber(acc.stockCount);
        const outOfStock = stock !== null && stock <= 0;
        return (
          <div className="flex flex-col items-center gap-1.5">
            <span className={`font-mono text-sm font-bold tabular-nums ${isLow ? 'text-danger' : 'text-fg'}`}>{numText(acc.stockCount)} {acc.unit}</span>
            {stock === null ? (
              <Badge variant="neutral" dot>Chưa kiểm kê</Badge>
            ) : outOfStock ? (
              <Badge variant="danger" dot icon={<Icon name="warning" size={12} />}>Hết hàng</Badge>
            ) : isLow ? (
              <Badge variant="warning" dot icon={<Icon name="warning" size={12} />}>
                Cảnh báo hết (&lt;={numText(threshold)})
              </Badge>
            ) : (
              <Badge variant="success" dot>Đủ hàng</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Nhập / Xuất Nhanh',
      align: 'right',
      render: (acc) => (
        <div className="flex items-center justify-end gap-1">
          {[
            { delta: -10, label: '-10', variant: 'secondary' as const },
            { delta: 10, label: '+10', variant: 'secondary' as const },
            { delta: 50, label: '+50', variant: 'primary' as const },
          ].map((btn) => (
            <Button
              key={btn.delta}
              type="button"
              size="sm"
              variant={btn.variant}
              onClick={() => handleAccessoryStockAdjust(acc.id, btn.delta)}
              aria-label={`${btn.label} ${acc.name}`}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <div className="space-y-6">
      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line-subtle bg-surface p-4">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng Giá Trị Tồn Kho</span>
            <Icon name="account_balance_wallet" size={24} className="text-primary" />
          </div>
          <div className="mt-2">
            <span className="font-mono text-xl font-bold tabular-nums text-fg">
              {numText(totalInventoryValuation, ' ₫')}
              {inventoryValueIncomplete && <span className="font-sans text-xs font-normal text-warning"> (thiếu)</span>}
            </span>
            <p className="mt-0.5 text-xs text-fg-muted">
              Vật liệu: {numText(totalMaterialValue, ' ₫')} • Phụ kiện: {numText(totalAccessoriesValue, ' ₫')}
              {inventoryValueIncomplete && ' • có dòng tồn kho chưa khai số lượng hoặc giá vốn'}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-line-subtle bg-surface p-4">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Vật Liệu Nhựa & Resin</span>
            <Icon name="inventory_2" size={24} className="text-info" />
          </div>
          <div className="mt-2">
            <span className="font-mono text-xl font-bold tabular-nums text-fg">
              {materialSpoolsText(' cuộn / bình')}
              {materialStockIncomplete && <span className="font-sans text-xs font-normal text-warning"> (thiếu)</span>}
            </span>
            <p className="mt-0.5 text-xs text-fg-muted">
              {materials.length} chủng loại nhựa (PLA, PETG, ABS, TPU, SLA...)
              {materialStockIncomplete && ' • có vật liệu chưa khai tồn kho'}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-line-subtle bg-surface p-4">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Phụ Kiện & Bao Bì</span>
            <Icon name="extension" size={24} className="text-positive" />
          </div>
          <div className="mt-2">
            <span className="font-mono text-xl font-bold tabular-nums text-fg">
              {numText(totalAccessoriesCount, ' món')}
            </span>
            <p className="mt-0.5 text-xs text-fg-muted">
              {accessories.length} mặt hàng (móc khóa, ốc cấy, nam châm, hộp...)
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-line-subtle bg-surface p-4">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Cảnh Báo Sắp Hết Hàng</span>
            <Icon name="warning" size={24} className={totalLowStockAlerts > 0 ? 'text-warning' : 'text-fg-subtle'} />
          </div>
          <div className="mt-2">
            <span className={`font-mono text-xl font-bold tabular-nums ${totalLowStockAlerts > 0 ? 'text-warning' : 'text-positive'}`}>
              {totalLowStockAlerts} mặt hàng
            </span>
            <p className="mt-0.5 text-xs text-fg-muted">
              {lowStockMaterials.length} vật liệu & {lowStockAccessories.length} phụ kiện cần nhập thêm
            </p>
          </div>
        </div>
      </div>

      {/* Warehouse Location Matrix & Stock Synchronizer */}
      <div className="rounded-lg border border-line-subtle bg-surface-muted p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="shelves" size={24} className="text-primary" />
              <h3 className="text-sm font-bold tracking-tight text-fg">Sơ Đồ Kệ Kho Xưởng & Đồng Bộ Báo Giá (Stock Mapping)</h3>
            </div>
            <div className="mt-1">
              <InfoTip label="Số lượng tồn kho này được dùng ở đâu?">
                Tất cả các số lượng tồn kho hiển thị tại đây được liên kết trực tiếp vào{' '}
                <strong>Tool Báo Giá 3D Quoting</strong> và <strong>Trình Dự Toán Xưởng</strong>. Khi khách chọn loại
                nhựa hoặc phụ kiện, hệ thống sẽ tự kiểm tra tính khả dụng.
              </InfoTip>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="neutral" dot>
              Dữ Liệu Tồn Kho Từ CSDL
            </Badge>
          </div>
        </div>

        {/* Quick Location Filter Tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Lọc theo Vị Trí Kệ:</span>
          <button
            type="button"
            onClick={() => setSelectedLocation('all')}
            className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors max-md:min-h-11 ${
              selectedLocation === 'all'
                ? 'bg-surface font-semibold text-fg shadow-e1'
                : 'text-fg-muted hover:bg-surface'
            }`}
          >
            Tất Cả Kệ
          </button>
          {locations.map(loc => (
            <button
              key={loc}
              type="button"
              onClick={() => setSelectedLocation(loc)}
              className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors max-md:min-h-11 ${
                selectedLocation === loc
                  ? 'bg-surface font-semibold text-fg shadow-e1'
                  : 'text-fg-muted hover:bg-surface'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-lg border border-line-subtle bg-surface p-4 md:flex-row">
        <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-md border border-line bg-surface-muted p-1 md:w-auto">
          {[
            { id: 'all', label: 'Tất Cả Tồn Kho' },
            { id: 'materials', label: `Nhựa In & Resin (${materials.length})` },
            { id: 'accessories', label: `Phụ Kiện & Bao Bì (${accessories.length})` },
            { id: 'low_stock', label: `Sắp Hết Hàng (${totalLowStockAlerts})`, isAlert: totalLowStockAlerts > 0 }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              aria-pressed={filterType === tab.id}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors max-md:min-h-11 ${
                filterType === tab.id
                  ? 'bg-surface font-semibold text-fg shadow-e1'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <Field id="warehouse-search" label="Tìm hàng trong kho theo tên, mã SKU hoặc vị trí" hideLabel optionalLabel={null}>
            {(control) => (
              <div className="relative">
                <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                <Input
                  {...control}
                  type="search"
                  placeholder="Tìm theo tên hàng, mã SKU, vị trí..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            )}
          </Field>
        </div>
      </div>

      {/* 1. SECTON: TỒN KHO NHỰA IN & RESIN (FILAMENTS / RESINS) */}
      {(filterType === 'all' || filterType === 'materials' || filterType === 'low_stock') && (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle bg-surface-muted px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg">
              <Icon name="palette" size={16} className="text-primary" />
              Tồn Kho Cuộn Nhựa Filament & Nhựa Resin (Đang Đồng Bộ Báo Giá)
            </h3>
            <span className="font-mono text-xs tabular-nums text-fg-muted">
              Tổng: <strong>{materialSpoolsText(' cuộn')}</strong> ({numText(totalMaterialValue, ' ₫')})
              {materialStockIncomplete && <span className="text-warning"> • thiếu dòng chưa khai tồn</span>}
            </span>
          </div>

          <DataTable<MaterialProfile>
            columns={materialColumns}
            rows={filteredMaterials}
            getRowId={(row) => row.id}
            caption="Tồn kho vật liệu"
            tableLabel="Tồn kho vật liệu"
            defaultSort={[{ key: 'name', direction: 'asc' }]}
            emptyState={
              <EmptyState
                live
                title="Không có vật liệu phù hợp"
                description="Thử xoá từ khoá hoặc đổi bộ lọc."
              />
            }
          />
        </div>
      )}

      {/* 2. SECTION: TỒN KHO PHỤ KIỆN & BAO BÌ (ACCESSORIES / PACKAGING / HARDWARE) */}
      {(filterType === 'all' || filterType === 'accessories' || filterType === 'low_stock') && (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle bg-surface-muted px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg">
              <Icon name="extension" size={16} className="text-primary" />
              Tồn Kho Phụ Kiện, Linh Kiện & Đóng Gói (Hardware & Packaging Stock)
            </h3>
            <span className="font-mono text-xs tabular-nums text-fg-muted">
              Tổng: <strong>{numText(totalAccessoriesCount, ' món')}</strong> ({numText(totalAccessoriesValue, ' ₫')})
              {accessoryValueIncomplete && <span className="text-warning"> • thiếu dòng chưa khai giá vốn</span>}
            </span>
          </div>

          <DataTable<AccessoryItem>
            columns={accessoryColumns}
            rows={filteredAccessoriesList}
            getRowId={(row) => row.id}
            caption="Tồn kho phụ kiện"
            tableLabel="Tồn kho phụ kiện"
            defaultSort={[{ key: 'name', direction: 'asc' }]}
            emptyState={
              <EmptyState
                live
                title="Không có phụ kiện phù hợp"
                description="Thử xoá từ khoá hoặc đổi bộ lọc vị trí."
              />
            }
          />
        </div>
      )}
    </div>
  );
};
