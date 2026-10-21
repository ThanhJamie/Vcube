import React, { useMemo, useState } from 'react';
import { AccessoryItem } from '../../types';
import { Icon, InfoTip, ConfirmDialog, DataTable, EmptyState, Field, Input, Modal, Button, Badge, Select } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { EMPTY_VALUE, formatNumber } from '../../lib/format';

/**
 * Đợt S (#1): phòng vệ cho cột nullable — hôm nay `rowToAccessory` vẫn quy NULL về `0`
 * (`n(v)` không truyền default) nên hiển thị `0 đ`; nếu về sau mapper trả `null` thật thì
 * `.toLocaleString()` sẽ **crash trắng** và component này đã sẵn sàng hiện `—`.
 */
const numText = (v: number | null | undefined, suffix = ''): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${formatNumber(v)}${suffix}` : EMPTY_VALUE;

/**
 * Đợt T: ô nhập số để trống ⇒ `null` ("chưa cấu hình"), KHÔNG quy về 0.
 * `Number('')` trả 0 nên không thể dùng lại `Number(x) || 0` như trước.
 */
const parseNumOrNull = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Giá trị cho `<input type="number">`: chỉ nhận số hữu hạn, còn lại để trống. */
const numInputValue = (v: number | null | undefined): string | number =>
  typeof v === 'number' && Number.isFinite(v) ? v : '';

/** Thiếu số (`null` / `undefined` / `NaN`) — không được dùng làm toán hạng. */
const isMissingNum = (v: number | null | undefined): boolean =>
  !(typeof v === 'number' && Number.isFinite(v));

/**
 * Đợt T: cảnh báo "sắp hết" CHỈ khi biết CẢ tồn kho LẪN ngưỡng.
 * Trước đây `null <= null` luôn `true` nên phụ kiện chưa cấu hình bị báo động giả.
 */
const isLowStock = (a: AccessoryItem): boolean =>
  !isMissingNum(a.stockCount) && !isMissingNum(a.lowStockThreshold) && a.stockCount <= a.lowStockThreshold;

interface AccessoriesManagerProps {
  accessories: AccessoryItem[];
  onUpdateAccessories: (accessories: AccessoryItem[]) => void;
  onShowToast: (message: string) => void;
}

export const AccessoriesManager: React.FC<AccessoriesManagerProps> = ({
  accessories,
  onUpdateAccessories,
  onShowToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<AccessoryItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState<Partial<AccessoryItem>>({
    name: '',
    nameEn: '',
    category: 'keychain',
    unit: 'cái',
    // Đợt T: KHÔNG điền sẵn số liệu bịa cho giá vốn / giá bán / tồn kho / ngưỡng cảnh báo.
    // Để trống ⇒ lưu `null` = "chưa cấu hình" và UI hiện `—`.
    // Không sinh mã: SKU do admin tự nhập (bắt buộc) — không bịa mã định danh.
    sku: '',
    warehouseLocation: '',
    supplier: '',
    description: '',
    imageUrl: '',
    isActive: true,
    compatibleWith: []
  });

  const categories = [
    { id: 'all', label: 'Tất Cả Danh Mục', count: accessories.length },
    { id: 'keychain', label: 'Móc Khóa & Dây Đeo (Keychain)', count: accessories.filter(a => a.category === 'keychain').length },
    { id: 'fastener', label: 'Ốc Cấy Ren & Tán Nhiệt (Inserts)', count: accessories.filter(a => a.category === 'fastener').length },
    { id: 'hardware', label: 'Bu Lông, Ốc Vít & Đế Silicon', count: accessories.filter(a => a.category === 'hardware').length },
    { id: 'magnet', label: 'Nam Châm Neodymium N52', count: accessories.filter(a => a.category === 'magnet').length },
    { id: 'bearing', label: 'Vòng Bi Bạc Đạn (Bearings)', count: accessories.filter(a => a.category === 'bearing').length },
    { id: 'packaging', label: 'Hộp Quà & Bao Bì Zip Chống Sốc', count: accessories.filter(a => a.category === 'packaging').length },
    { id: 'other', label: 'Phụ Tùng Khác', count: accessories.filter(a => a.category === 'other').length }
  ];

  const filteredAccessories = accessories.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nameEn && item.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.warehouseLocation && item.warehouseLocation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleQuickStockAdjust = (id: string, delta: number) => {
    const target = accessories.find(item => item.id === id);
    // Đợt T: tồn kho chưa cấu hình (`null`) ⇒ KHÔNG coi là 0 rồi cộng ra số bịa.
    if (!target || isMissingNum(target.stockCount)) {
      onShowToast('Phụ kiện này chưa có số tồn kho — mở "Sửa" và nhập tồn kho thực tế trước.');
      return;
    }
    const updated = accessories.map(item => {
      if (item.id === id) {
        const newCount = Math.max(0, item.stockCount + delta);
        return { ...item, stockCount: newCount };
      }
      return item;
    });
    onUpdateAccessories(updated);
    onShowToast(`Đã điều chỉnh tồn kho (${delta > 0 ? `+${delta}` : delta})`);
  };

  const handleToggleActive = (id: string) => {
    const updated = accessories.map(item => {
      if (item.id === id) {
        return { ...item, isActive: !item.isActive };
      }
      return item;
    });
    onUpdateAccessories(updated);
    onShowToast('Đã thay đổi trạng thái phụ kiện');
  };

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteItem = (id: string, name: string) => {
    setPendingDelete({ id, name });
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name?.trim()) {
      onShowToast('Vui lòng nhập tên phụ kiện!');
      return;
    }
    if (!newItemForm.sku?.trim()) {
      onShowToast('Vui lòng nhập mã SKU phụ kiện!');
      return;
    }
    const newItem: AccessoryItem = {
      id: `acc-${Date.now()}`,
      name: newItemForm.name,
      nameEn: newItemForm.nameEn || '',
      category: newItemForm.category || 'keychain',
      unit: newItemForm.unit || 'cái',
      // Đợt T: để trống ⇒ `null` (chưa cấu hình) — KHÔNG 0 và KHÔNG ngưỡng mặc định.
      costPrice: parseNumOrNull(newItemForm.costPrice),
      sellingPrice: parseNumOrNull(newItemForm.sellingPrice),
      sku: newItemForm.sku.trim(),
      stockCount: parseNumOrNull(newItemForm.stockCount),
      lowStockThreshold: parseNumOrNull(newItemForm.lowStockThreshold),
      warehouseLocation: newItemForm.warehouseLocation || '',
      supplier: newItemForm.supplier || '',
      description: newItemForm.description || '',
      imageUrl: newItemForm.imageUrl || '',
      isActive: newItemForm.isActive ?? true,
      compatibleWith: newItemForm.compatibleWith || []
    };

    onUpdateAccessories([...accessories, newItem]);
    setIsNewModalOpen(false);
    onShowToast(`Đã thêm phụ kiện mới: "${newItem.name}"`);
  };

  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const updated = accessories.map(a => a.id === editingItem.id ? editingItem : a);
    onUpdateAccessories(updated);
    setEditingItem(null);
    onShowToast(`Đã cập nhật phụ kiện: "${editingItem.name}"`);
  };

  // Đợt T: chỉ đếm khi biết CẢ tồn kho LẪN ngưỡng (trước đây `null <= null` luôn `true` ⇒ báo động giả).
  const lowStockCount = accessories.filter(isLowStock).length;

  /** Cột bảng phụ kiện dùng primitive `DataTable` (sort + phân trang + empty ngoài bảng). */
  const accessoryColumns = useMemo<DataTableColumn<AccessoryItem>[]>(() => [
    {
      key: 'name',
      header: 'Tên Phụ Kiện / SKU',
      value: (a) => a.name,
      render: (item) => (
        <div className="flex items-center gap-3">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line-subtle bg-surface-muted text-fg-subtle">
              <Icon name="inventory" size={18} />
            </span>
          )}
          <div>
            <p className="font-bold text-fg leading-snug">{item.name}</p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-fg-muted">
              <span className="font-mono font-bold text-primary">{item.sku || '—'}</span>
              {item.supplier && <span>• NCC: {item.supplier}</span>}
            </div>
            {item.compatibleWith && item.compatibleWith.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.compatibleWith.map((c) => (
                  <span key={c} className="text-xs bg-surface-muted text-fg-muted px-1.5 py-0.5 rounded-sm font-sans">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Phân Loại',
      value: (a) => a.category,
      render: (item) => (
        <div>
          <span className="rounded-sm bg-info-tint px-2 py-0.5 text-xs font-semibold capitalize text-info">{item.category}</span>
          <div className="text-xs text-fg-muted mt-0.5">ĐVT: {item.unit}</div>
        </div>
      ),
    },
    {
      key: 'costPrice',
      header: 'Giá Vốn Xưởng',
      numeric: true,
      value: (a) => a.costPrice ?? 0,
      render: (item) => <span className="font-mono tabular-nums text-fg-muted">{numText(item.costPrice, ' ₫')}</span>,
    },
    {
      key: 'sellingPrice',
      header: 'Giá Báo Khách',
      numeric: true,
      value: (a) => a.sellingPrice ?? 0,
      render: (item) => {
        const grossMargin =
          isMissingNum(item.sellingPrice) || isMissingNum(item.costPrice) || item.sellingPrice <= 0
            ? null
            : Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100);
        return (
          <div>
            <span className="font-mono font-bold tabular-nums text-fg">{numText(item.sellingPrice, ' ₫')}</span>
            <div className={`text-xs font-mono font-semibold tabular-nums ${grossMargin === null ? 'text-fg-subtle' : 'text-positive'}`}>
              {grossMargin === null ? `${EMPTY_VALUE} margin` : `+${grossMargin}% margin`}
            </div>
          </div>
        );
      },
    },
    {
      key: 'stockCount',
      header: 'Tồn Kho',
      align: 'center',
      value: (a) => a.stockCount ?? 0,
      render: (item) => {
        const isLow = isLowStock(item);
        const stockUnknown = isMissingNum(item.stockCount);
        const outOfStock = !stockUnknown && (item.stockCount as number) <= 0;
        return (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`font-mono text-sm font-bold tabular-nums ${isLow ? 'text-danger' : 'text-fg'}`}>{numText(item.stockCount)}</span>
              <span className="text-xs text-fg-muted">{item.unit}</span>
            </div>
            {stockUnknown ? (
              <Badge variant="neutral" dot>Chưa kiểm kê</Badge>
            ) : outOfStock ? (
              <Badge variant="danger" dot icon={<Icon name="warning" size={12} />}>Hết hàng</Badge>
            ) : isLow ? (
              <Badge variant="warning" dot icon={<Icon name="warning" size={12} />}>
                Sắp hết (&lt;={numText(item.lowStockThreshold)})
              </Badge>
            ) : (
              <Badge variant="success" dot>Đủ hàng</Badge>
            )}
            <div className="mt-1 flex items-center gap-1">
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
                  onClick={() => handleQuickStockAdjust(item.id, btn.delta)}
                  disabled={stockUnknown}
                  title={stockUnknown ? 'Chưa có số tồn kho — không điều chỉnh nhanh được' : btn.label}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      key: 'warehouseLocation',
      header: 'Vị Trí Kệ Kho',
      value: (a) => a.warehouseLocation || '',
      render: (item) => (
        <span className="flex items-center gap-1 font-mono font-bold text-primary">
          <Icon name="shelves" size={16} />
          {item.warehouseLocation || '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Trạng Thái',
      align: 'center',
      value: (a) => (a.isActive ? 'active' : 'hidden'),
      render: (item) => (
        <button
          type="button"
          onClick={() => handleToggleActive(item.id)}
          aria-pressed={item.isActive}
          className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-md:min-h-11"
        >
          <Badge variant={item.isActive ? 'success' : 'neutral'} dot>
            {item.isActive ? 'Đang Dùng' : 'Tạm Ẩn'}
          </Badge>
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            iconOnly
            size="sm"
            variant="ghost"
            aria-label={`Sửa ${item.name}`}
            title="Chỉnh sửa thông số"
            onClick={() => setEditingItem(item)}
            leadingIcon={<Icon name="edit" size={16} />}
          />
          <Button
            type="button"
            iconOnly
            size="sm"
            variant="danger-ghost"
            aria-label={`Xoá ${item.name}`}
            title="Xóa phụ kiện"
            onClick={() => handleDeleteItem(item.id, item.name)}
            leadingIcon={<Icon name="delete" size={16} />}
          />
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title="Xoá phụ kiện"
        description={
          pendingDelete
            ? `Bạn có chắc muốn xoá phụ kiện "${pendingDelete.name}" khỏi danh mục? Hành động này không hoàn tác được.`
            : ''
        }
        confirmLabel="Xoá phụ kiện"
        cancelLabel="Huỷ"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const updated = accessories.filter((a) => a.id !== pendingDelete.id);
          onUpdateAccessories(updated);
          onShowToast(`Đã xóa phụ kiện: ${pendingDelete.name}`);
          setPendingDelete(null);
        }}
      />
      {/* Header Banner & Stats */}
      <div className="rounded-lg border border-line-subtle bg-surface p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
              <Icon name="extension" size={24} className="text-primary" />
              Quản Lý Phụ Kiện, Linh Kiện & Đóng Gói (Hardware & Packaging)
            </h2>
            <div className="mt-1">
              <InfoTip label="Phụ kiện quản lý những trường nào?">
                Cấu hình giá vốn xưởng, giá báo cho khách, vị trí kho và theo dõi mức tồn kho thực tế cho móc khóa,
                ốc cấy ren, nam châm, bao bì…
              </InfoTip>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {lowStockCount > 0 && (
              <Badge variant="warning" icon={<Icon name="warning" size={16} />}>
                {lowStockCount} mặt hàng sắp hết
              </Badge>
            )}
            <Button
              variant="primary"
              leadingIcon={<Icon name="add_circle" size={16} />}
              onClick={() => setIsNewModalOpen(true)}
            >
              Thêm Phụ Kiện Mới
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-lg border border-line-subtle bg-surface p-4 md:flex-row">
        <div className="flex w-full max-w-md flex-1 items-center gap-2 md:w-auto">
          <div className="relative w-full">
            <Field id="accessory-search" label="Tìm phụ kiện" hideLabel optionalLabel={null}>
              {(control) => (
                <div className="relative">
                  <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                  <Input
                    {...control}
                    type="search"
                    placeholder="Tìm theo tên phụ kiện, mã SKU, vị trí kệ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </Field>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
          <span className="shrink-0 text-sm font-medium text-fg-muted">Danh mục:</span>
          <div className="w-full md:w-56">
            <Field id="accessory-category-filter" label="Lọc theo danh mục phụ kiện" hideLabel optionalLabel={null}>
              {(control) => (
                <Select
                  {...control}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.count})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </div>
      </div>

      {/* Accessories Table — primitive DataTable */}
      {accessories.length === 0 ? (
        <div className="rounded-lg border border-line-subtle bg-surface p-6">
          <EmptyState
            icon={<Icon name="extension" size={20} />}
            title="Chưa có phụ kiện nào trong cơ sở dữ liệu"
            description="Bảng phụ kiện đang rỗng — nền tảng không tự sinh phụ kiện mẫu. Hãy thêm phụ kiện thật."
            action={
              <Button variant="primary" size="sm" onClick={() => setIsNewModalOpen(true)}>
                Thêm Phụ Kiện Mới
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable<AccessoryItem>
          columns={accessoryColumns}
          rows={filteredAccessories}
          getRowId={(row) => row.id}
          caption="Danh sách phụ kiện"
          tableLabel="Danh sách phụ kiện"
          defaultSort={[{ key: 'name', direction: 'asc' }]}
          emptyState={
            <EmptyState
              live
              title="Không tìm thấy phụ kiện phù hợp"
              description="Thử xoá từ khoá hoặc đổi bộ lọc phân loại."
            />
          }
        />
      )}

      {/* MODAL: Thêm Phụ Kiện Mới */}
      {isNewModalOpen && (
        <Modal
          open
          onClose={() => setIsNewModalOpen(false)}
          size="lg"
          title={<span className="flex items-center gap-2"><Icon name="add_circle" size={22} className="text-primary" />Thêm Phụ Kiện / Bao Bì Mới Vào Hệ Thống</span>}
        >
            <form onSubmit={handleSaveNewItem} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="new-accessory-name" className="mb-1 block text-sm font-medium text-fg">Tên Phụ Kiện (Tiếng Việt) *</label>
                  <input
                    id="new-accessory-name"
                    type="text"
                    required
                    placeholder="Ví dụ: Khoen móc khóa Inox 304 có dây xích 25mm"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="new-accessory-sku" className="mb-1 block text-sm font-medium text-fg">Mã SKU Quản Lý *</label>
                  <input
                    id="new-accessory-sku"
                    type="text"
                    required
                    value={newItemForm.sku}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="new-accessory-category" className="mb-1 block text-sm font-medium text-fg">Phân Loại</label>
                  <select
                    id="new-accessory-category"
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm font-medium text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="keychain">Móc Khóa & Dây Đeo (Keychain)</option>
                    <option value="fastener">Ốc Cấy Ren & Tán Nhiệt (Inserts)</option>
                    <option value="hardware">Bu Lông, Ốc Vít & Chân Silicon</option>
                    <option value="magnet">Nam Châm Neodymium N52</option>
                    <option value="bearing">Vòng Bi Bạc Đạn (Bearing)</option>
                    <option value="packaging">Hộp Quà & Bao Bì Zip</option>
                    <option value="other">Phụ Tùng Khác</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-accessory-unit" className="mb-1 block text-sm font-medium text-fg">Đơn Vị Tính (ĐVT)</label>
                  <input
                    id="new-accessory-unit"
                    type="text"
                    placeholder="cái, bộ, con, sợi, hộp, túi..."
                    value={newItemForm.unit}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="new-accessory-location" className="mb-1 block text-sm font-medium text-fg">Vị Trí Kệ Kho</label>
                  <input
                    id="new-accessory-location"
                    type="text"
                    placeholder="Kệ A1 - Hộc 02"
                    value={newItemForm.warehouseLocation}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, warehouseLocation: e.target.value }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="new-accessory-cost" className="mb-1 block text-sm font-medium text-fg">Giá Vốn Nhập Xưởng (VNĐ)</label>
                  <input
                    id="new-accessory-cost"
                    type="number"
                    min="0"
                    step="100"
                    value={numInputValue(newItemForm.costPrice)}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, costPrice: parseNumOrNull(e.target.value) }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-semibold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="new-accessory-price" className="mb-1 block text-sm font-medium text-fg">Giá Báo / Bán Cho Khách (VNĐ)</label>
                  <input
                    id="new-accessory-price"
                    type="number"
                    min="0"
                    step="500"
                    value={numInputValue(newItemForm.sellingPrice)}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, sellingPrice: parseNumOrNull(e.target.value) }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-primary placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="new-accessory-stock" className="mb-1 block text-sm font-medium text-fg">Tồn Kho Ban Đầu</label>
                  <input
                    id="new-accessory-stock"
                    type="number"
                    min="0"
                    value={numInputValue(newItemForm.stockCount)}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, stockCount: parseNumOrNull(e.target.value) }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-semibold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="new-accessory-threshold" className="mb-1 block text-sm font-medium text-fg">Ngưỡng Báo Sắp Hết</label>
                  <input
                    id="new-accessory-threshold"
                    type="number"
                    min="1"
                    value={numInputValue(newItemForm.lowStockThreshold)}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, lowStockThreshold: parseNumOrNull(e.target.value) }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-danger placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="new-accessory-supplier" className="mb-1 block text-sm font-medium text-fg">Nhà Cung Cấp</label>
                  <input
                    id="new-accessory-supplier"
                    type="text"
                    placeholder="Xưởng Kim Khí Tân Bình, Fasteners VN..."
                    value={newItemForm.supplier}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, supplier: e.target.value }))}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="new-accessory-description" className="mb-1 block text-sm font-medium text-fg">Mô Tả Kỹ Thuật</label>
                  <textarea
                    id="new-accessory-description"
                    rows={2}
                    placeholder="Đặc tính kim loại, dung sai, khả năng chịu lực..."
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-20 w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line-subtle pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  Lưu Phụ Kiện
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL: Sửa Phụ Kiện */}
      {editingItem && (
        <Modal
          open
          onClose={() => setEditingItem(null)}
          size="lg"
          title={<span className="flex items-center gap-2"><Icon name="edit" size={22} className="text-primary" />Chỉnh Sửa Phụ Kiện: {editingItem.name}</span>}
        >
            <form onSubmit={handleSaveEditItem} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-accessory-name" className="mb-1 block text-sm font-medium text-fg">Tên Phụ Kiện *</label>
                  <input
                    id="edit-accessory-name"
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="edit-accessory-sku" className="mb-1 block text-sm font-medium text-fg">Mã SKU *</label>
                  <input
                    id="edit-accessory-sku"
                    type="text"
                    required
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="edit-accessory-category" className="mb-1 block text-sm font-medium text-fg">Phân Loại</label>
                  <select
                    id="edit-accessory-category"
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm font-medium text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="keychain">Móc Khóa & Dây Đeo (Keychain)</option>
                    <option value="fastener">Ốc Cấy Ren & Tán Nhiệt (Inserts)</option>
                    <option value="hardware">Bu Lông, Ốc Vít & Chân Silicon</option>
                    <option value="magnet">Nam Châm Neodymium N52</option>
                    <option value="bearing">Vòng Bi Bạc Đạn (Bearing)</option>
                    <option value="packaging">Hộp Quà & Bao Bì Zip</option>
                    <option value="other">Phụ Tùng Khác</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-accessory-unit" className="mb-1 block text-sm font-medium text-fg">Đơn Vị Tính</label>
                  <input
                    id="edit-accessory-unit"
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="edit-accessory-location" className="mb-1 block text-sm font-medium text-fg">Vị Trí Kệ Kho</label>
                  <input
                    id="edit-accessory-location"
                    type="text"
                    value={editingItem.warehouseLocation || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, warehouseLocation: e.target.value })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="edit-accessory-cost" className="mb-1 block text-sm font-medium text-fg">Giá Vốn Nhập Xưởng (VNĐ)</label>
                  <input
                    id="edit-accessory-cost"
                    type="number"
                    min="0"
                    value={numInputValue(editingItem.costPrice)}
                    onChange={(e) => setEditingItem({ ...editingItem, costPrice: parseNumOrNull(e.target.value) })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-semibold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="edit-accessory-price" className="mb-1 block text-sm font-medium text-fg">Giá Báo Khách (VNĐ)</label>
                  <input
                    id="edit-accessory-price"
                    type="number"
                    min="0"
                    value={numInputValue(editingItem.sellingPrice)}
                    onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: parseNumOrNull(e.target.value) })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-primary placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="edit-accessory-stock" className="mb-1 block text-sm font-medium text-fg">Số Lượng Tồn Kho</label>
                  <input
                    id="edit-accessory-stock"
                    type="number"
                    min="0"
                    value={numInputValue(editingItem.stockCount)}
                    onChange={(e) => setEditingItem({ ...editingItem, stockCount: parseNumOrNull(e.target.value) })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-semibold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="edit-accessory-threshold" className="mb-1 block text-sm font-medium text-fg">Ngưỡng Báo Hết</label>
                  <input
                    id="edit-accessory-threshold"
                    type="number"
                    min="1"
                    value={numInputValue(editingItem.lowStockThreshold)}
                    onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: parseNumOrNull(e.target.value) })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-danger placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="edit-accessory-supplier" className="mb-1 block text-sm font-medium text-fg">Nhà Cung Cấp</label>
                  <input
                    id="edit-accessory-supplier"
                    type="text"
                    value={editingItem.supplier || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="edit-accessory-description" className="mb-1 block text-sm font-medium text-fg">Mô Tả</label>
                  <textarea
                    id="edit-accessory-description"
                    rows={2}
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="min-h-20 w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line-subtle pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingItem(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  Lưu Thay Đổi
                </Button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};
