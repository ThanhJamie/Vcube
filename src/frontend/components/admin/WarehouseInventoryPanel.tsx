import React, { useMemo, useState } from 'react';
import { MaterialProfile, AccessoryItem } from '../../types';
import { Icon, InfoTip, DataTable, EmptyState } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { EMPTY_VALUE } from '../../lib/format';
import { useLanguage } from '../../context/LanguageContext';

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
  typeof v === 'number' && Number.isFinite(v) ? `${v.toLocaleString('vi-VN')}${suffix}` : EMPTY_VALUE;

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
  const { language } = useLanguage();
  const isVi = language === 'vi';
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
      header: isVi ? 'Tên Vật Liệu' : 'Material',
      value: (m) => m.name,
      render: (mat) => (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {mat.colors.slice(0, 3).map((col, idx) => (
              <span key={idx} className="w-3.5 h-3.5 rounded-full border border-line shadow-e1 inline-block" style={{ backgroundColor: col }} />
            ))}
          </div>
          <div>
            <p className="font-bold text-fg">{mat.name}</p>
            <p className="text-xs text-fg-muted">{mat.recommendedFor || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'brand', header: isVi ? 'Thương Hiệu' : 'Brand', value: (m) => m.brand || '', render: (mat) => <span className="text-fg-muted">{mat.brand || '—'}</span> },
    {
      key: 'costPerKg',
      header: isVi ? 'Giá Vốn / kg' : 'Cost / kg',
      numeric: true,
      value: (m) => costPerKgOf(m) ?? 0,
      render: (mat) => <span className="text-fg-muted">{numText(costPerKgOf(mat), ' đ')}</span>,
    },
    {
      key: 'pricePerGram',
      header: isVi ? 'Giá Báo / g' : 'Price / g',
      numeric: true,
      value: (m) => m.pricePerGram ?? 0,
      render: (mat) => <span className="font-bold text-primary">{numText(mat.pricePerGram, ' đ/g')}</span>,
    },
    {
      key: 'stockRollsCount',
      header: isVi ? 'Tồn Kho (Cuộn)' : 'Stock (rolls)',
      align: 'center',
      value: (m) => m.stockRollsCount ?? 0,
      render: (mat) => {
        const count = declaredNumber(mat.stockRollsCount);
        const isLow = isMaterialLow(mat);
        return (
          <div className="flex flex-col items-center">
            <span className={`font-tech font-bold text-sm ${isLow ? 'text-danger' : 'text-fg'}`}>{numText(count, ' cuộn')}</span>
            {isLow && (
              <span className="text-xs font-bold text-danger bg-danger-tint px-1.5 py-0.5 rounded-sm mt-0.5">
                Cần nhập thêm (&lt;={MATERIAL_LOW_STOCK_THRESHOLD})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'quoteStatus',
      header: isVi ? 'Trạng Thái Báo Giá' : 'Quote status',
      align: 'center',
      render: (mat) => {
        const count = declaredNumber(mat.stockRollsCount);
        if (count === null) {
          return <span className="px-2 py-0.5 rounded-sm text-xs font-tech font-bold bg-surface-muted text-fg-muted">{isVi ? 'Chưa khai tồn' : 'Stock not declared'}</span>;
        }
        if (mat.inStock && count > 0) {
          return <span className="px-2 py-0.5 rounded-sm text-xs font-tech font-bold bg-positive-tint text-positive">{isVi ? 'Sẵn Sàng Cho Khách' : 'Available'}</span>;
        }
        return <span className="px-2 py-0.5 rounded-sm text-xs font-tech font-bold bg-danger-tint text-danger">{isVi ? 'Tạm Hết Hàng' : 'Out of stock'}</span>;
      },
    },
    {
      key: 'actions',
      header: isVi ? 'Nhập / Xuất Kho' : 'Adjust stock',
      align: 'right',
      render: (mat) => (
        <div className="flex items-center justify-end gap-1">
          {[
            { delta: -1, label: '-1', cls: 'bg-surface-muted hover:bg-line-subtle text-fg-muted' },
            { delta: 1, label: '+1', cls: 'bg-surface-muted hover:bg-line-subtle text-fg-muted' },
            { delta: 5, label: '+5', cls: 'bg-positive-tint hover:bg-positive/20 text-positive' },
          ].map((btn) => (
            <button
              key={btn.delta}
              type="button"
              onClick={() => handleMaterialStockAdjust(mat.id, btn.delta)}
              className={`px-2 py-1 rounded-sm font-tech font-bold text-xs ${btn.cls}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isVi]);

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
            <img src={acc.imageUrl} alt={acc.name} className="w-8 h-8 rounded-sm object-cover border border-line" />
          ) : (
            <span className="w-8 h-8 rounded-sm border border-line bg-surface-muted text-fg-subtle flex items-center justify-center shrink-0">
              <Icon name="inventory" size={16} />
            </span>
          )}
          <div>
            <p className="font-bold text-fg">{acc.name}</p>
            <span className="font-tech text-xs text-primary font-semibold">{acc.sku || '—'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: isVi ? 'Phân Loại' : 'Category',
      value: (a) => a.category,
      render: (acc) => <span className="px-2 py-0.5 bg-info-tint text-info rounded-sm text-xs font-bold capitalize">{acc.category}</span>,
    },
    {
      key: 'warehouseLocation',
      header: isVi ? 'Vị Trí Kệ' : 'Shelf',
      value: (a) => a.warehouseLocation || '',
      render: (acc) => (
        <span className="flex items-center gap-1 font-tech font-bold text-xs text-primary">
          <Icon name="shelves" size={14} />
          {acc.warehouseLocation || '—'}
        </span>
      ),
    },
    { key: 'costPrice', header: isVi ? 'Giá Vốn' : 'Cost', numeric: true, value: (a) => a.costPrice ?? 0, render: (acc) => <span className="text-fg-muted">{numText(acc.costPrice, ' đ')}</span> },
    { key: 'sellingPrice', header: isVi ? 'Giá Báo Khách' : 'Sell', numeric: true, value: (a) => a.sellingPrice ?? 0, render: (acc) => <span className="font-bold text-fg">{numText(acc.sellingPrice, ' đ')}</span> },
    {
      key: 'stockCount',
      header: isVi ? 'Tồn Kho' : 'Stock',
      align: 'center',
      value: (a) => a.stockCount ?? 0,
      render: (acc) => {
        const threshold = declaredNumber(acc.lowStockThreshold);
        const isLow = isAccessoryLow(acc);
        return (
          <div className="flex flex-col items-center">
            <span className={`font-tech font-bold text-sm ${isLow ? 'text-danger' : 'text-fg'}`}>{numText(acc.stockCount)} {acc.unit}</span>
            {isLow && (
              <span className="text-xs font-bold text-danger bg-danger-tint px-1.5 py-0.5 rounded-sm mt-0.5">
                Cảnh báo hết (&lt;={numText(threshold)})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: isVi ? 'Nhập / Xuất Nhanh' : 'Quick adjust',
      align: 'right',
      render: (acc) => (
        <div className="flex items-center justify-end gap-1">
          {[
            { delta: -10, label: '-10', cls: 'bg-surface-muted hover:bg-line-subtle text-fg-muted' },
            { delta: 10, label: '+10', cls: 'bg-surface-muted hover:bg-line-subtle text-fg-muted' },
            { delta: 50, label: '+50', cls: 'bg-positive-tint hover:bg-positive/20 text-positive' },
          ].map((btn) => (
            <button
              key={btn.delta}
              type="button"
              onClick={() => handleAccessoryStockAdjust(acc.id, btn.delta)}
              className={`px-2 py-1 rounded-sm font-tech font-bold text-xs ${btn.cls}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isVi]);

  return (
    <div className="space-y-6">
      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-4 border border-line rounded-sm shadow-e1">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-tech uppercase font-bold tracking-wider">Tổng Giá Trị Tồn Kho</span>
            <Icon name="account_balance_wallet" size={24} className="text-primary" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-tech font-bold text-fg">
              {numText(totalInventoryValuation, ' đ')}
              {inventoryValueIncomplete && <span className="text-xs font-sans font-normal text-warning"> (thiếu)</span>}
            </span>
            <p className="text-xs text-fg-muted mt-0.5">
              Vật liệu: {numText(totalMaterialValue, ' đ')} • Phụ kiện: {numText(totalAccessoriesValue, ' đ')}
              {inventoryValueIncomplete && ' • có dòng tồn kho chưa khai số lượng hoặc giá vốn'}
            </p>
          </div>
        </div>

        <div className="bg-surface p-4 border border-line rounded-sm shadow-e1">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-tech uppercase font-bold tracking-wider">Vật Liệu Nhựa & Resin</span>
            <Icon name="inventory_2" size={24} className="text-info" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-tech font-bold text-fg">
              {materialSpoolsText(' cuộn / bình')}
              {materialStockIncomplete && <span className="text-xs font-sans font-normal text-warning"> (thiếu)</span>}
            </span>
            <p className="text-xs text-fg-muted mt-0.5">
              {materials.length} chủng loại nhựa (PLA, PETG, ABS, TPU, SLA...)
              {materialStockIncomplete && ' • có vật liệu chưa khai tồn kho'}
            </p>
          </div>
        </div>

        <div className="bg-surface p-4 border border-line rounded-sm shadow-e1">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-tech uppercase font-bold tracking-wider">Phụ Kiện & Bao Bì</span>
            <Icon name="extension" size={24} className="text-positive" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-tech font-bold text-fg">
              {numText(totalAccessoriesCount, ' món')}
            </span>
            <p className="text-xs text-fg-muted mt-0.5">
              {accessories.length} mặt hàng (móc khóa, ốc cấy, nam châm, hộp...)
            </p>
          </div>
        </div>

        <div className="bg-surface p-4 border border-line rounded-sm shadow-e1">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-tech uppercase font-bold tracking-wider">Cảnh Báo Sắp Hết Hàng</span>
            <Icon name="warning" size={24} className={totalLowStockAlerts > 0 ? 'text-danger animate-pulse' : 'text-fg-subtle'} />
          </div>
          <div className="mt-2">
            <span className={`text-xl font-tech font-bold ${totalLowStockAlerts > 0 ? 'text-danger' : 'text-positive'}`}>
              {totalLowStockAlerts} mặt hàng
            </span>
            <p className="text-xs text-fg-muted mt-0.5">
              {lowStockMaterials.length} vật liệu & {lowStockAccessories.length} phụ kiện cần nhập thêm
            </p>
          </div>
        </div>
      </div>

      {/* Warehouse Location Matrix & Stock Synchronizer */}
      <div className="bg-gradient-to-r from-surface-inverse to-surface-inverse text-on-inverse p-5 rounded-lg shadow-e1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="shelves" size={24} className="text-accent" />
              <h3 className="font-bold text-sm text-on-inverse">Sơ Đồ Kệ Kho Xưởng & Đồng Bộ Báo Giá (Stock Mapping)</h3>
            </div>
            <div className="mt-1">
              <InfoTip
                label="Số lượng tồn kho này được dùng ở đâu?"
                className="[&_button]:text-on-inverse/80 [&_button:hover]:text-on-inverse"
              >
                Tất cả các số lượng tồn kho hiển thị tại đây được liên kết trực tiếp vào{' '}
                <strong>Tool Báo Giá 3D Quoting</strong> và <strong>Trình Dự Toán Xưởng</strong>. Khi khách chọn loại
                nhựa hoặc phụ kiện, hệ thống sẽ tự kiểm tra tính khả dụng.
              </InfoTip>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 bg-positive/20 border border-positive/30 text-accent rounded-sm text-xs font-tech font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-positive animate-ping"></span>
              Đồng Bộ Thời Gian Thực
            </span>
          </div>
        </div>

        {/* Quick Location Filter Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-surface-inverse-raised">
          <span className="text-xs font-tech uppercase text-fg-subtle font-bold">Lọc theo Vị Trí Kệ:</span>
          <button
            type="button"
            onClick={() => setSelectedLocation('all')}
            className={`px-2.5 py-1 text-xs rounded-sm font-tech transition-colors ${
              selectedLocation === 'all'
                ? 'bg-surface-inverse text-accent font-bold'
                : 'bg-surface-muted text-fg-muted hover:bg-line-subtle'
            }`}
          >
            Tất Cả Kệ
          </button>
          {locations.map(loc => (
            <button
              key={loc}
              type="button"
              onClick={() => setSelectedLocation(loc)}
              className={`px-2.5 py-1 text-xs rounded-sm font-tech transition-colors ${
                selectedLocation === loc
                  ? 'bg-surface-inverse text-accent font-bold'
                  : 'bg-surface-muted text-fg-muted hover:bg-line-subtle'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-surface p-4 border border-line rounded-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
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
              className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${
                filterType === tab.id
                  ? 'bg-primary text-primary-fg shadow-e1'
                  : 'bg-surface-muted text-fg-muted hover:bg-line-subtle'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72 relative">
          <Icon name="search" size={16} className="absolute left-3 top-2 text-fg-muted" />
          <input
            type="text"
            placeholder="Tìm theo tên hàng, mã SKU, vị trí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-line rounded-sm text-xs focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* 1. SECTON: TỒN KHO NHỰA IN & RESIN (FILAMENTS / RESINS) */}
      {(filterType === 'all' || filterType === 'materials' || filterType === 'low_stock') && (
        <div className="bg-surface rounded-sm overflow-hidden shadow-e1">
          <div className="bg-canvas px-4 py-3 border-b border-line flex items-center justify-between">
            <h3 className="font-bold text-xs text-fg flex items-center gap-2">
              <Icon name="palette" size={16} className="text-primary" />
              Tồn Kho Cuộn Nhựa Filament & Nhựa Resin (Đang Đồng Bộ Báo Giá)
            </h3>
            <span className="text-xs font-tech text-fg-muted">
              Tổng: <strong>{materialSpoolsText(' cuộn')}</strong> ({numText(totalMaterialValue, ' đ')})
              {materialStockIncomplete && <span className="text-warning"> • thiếu dòng chưa khai tồn</span>}
            </span>
          </div>

          <DataTable<MaterialProfile>
            columns={materialColumns}
            rows={filteredMaterials}
            getRowId={(row) => row.id}
            caption={isVi ? 'Tồn kho vật liệu' : 'Material inventory'}
            tableLabel={isVi ? 'Tồn kho vật liệu' : 'Material inventory'}
            defaultSort={[{ key: 'name', direction: 'asc' }]}
            emptyState={
              <EmptyState
                live
                title={isVi ? 'Không có vật liệu phù hợp' : 'No matching materials'}
                description={isVi ? 'Thử xoá từ khoá hoặc đổi bộ lọc.' : 'Clear the search or change the filter.'}
              />
            }
          />
        </div>
      )}

      {/* 2. SECTION: TỒN KHO PHỤ KIỆN & BAO BÌ (ACCESSORIES / PACKAGING / HARDWARE) */}
      {(filterType === 'all' || filterType === 'accessories' || filterType === 'low_stock') && (
        <div className="bg-surface rounded-sm overflow-hidden shadow-e1">
          <div className="bg-canvas px-4 py-3 border-b border-line flex items-center justify-between">
            <h3 className="font-bold text-xs text-fg flex items-center gap-2">
              <Icon name="extension" size={16} className="text-primary" />
              Tồn Kho Phụ Kiện, Linh Kiện & Đóng Gói (Hardware & Packaging Stock)
            </h3>
            <span className="text-xs font-tech text-fg-muted">
              Tổng: <strong>{numText(totalAccessoriesCount, ' món')}</strong> ({numText(totalAccessoriesValue, ' đ')})
              {accessoryValueIncomplete && <span className="text-warning"> • thiếu dòng chưa khai giá vốn</span>}
            </span>
          </div>

          <DataTable<AccessoryItem>
            columns={accessoryColumns}
            rows={filteredAccessoriesList}
            getRowId={(row) => row.id}
            caption={isVi ? 'Tồn kho phụ kiện' : 'Accessory inventory'}
            tableLabel={isVi ? 'Tồn kho phụ kiện' : 'Accessory inventory'}
            defaultSort={[{ key: 'name', direction: 'asc' }]}
            emptyState={
              <EmptyState
                live
                title={isVi ? 'Không có phụ kiện phù hợp' : 'No matching accessories'}
                description={isVi ? 'Thử xoá từ khoá hoặc đổi bộ lọc vị trí.' : 'Clear the search or change the location filter.'}
              />
            }
          />
        </div>
      )}
    </div>
  );
};
