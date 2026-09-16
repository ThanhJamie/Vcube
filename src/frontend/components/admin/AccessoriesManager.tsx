import React, { useMemo, useState } from 'react';
import { AccessoryItem } from '../../types';
import { Icon, InfoTip, ConfirmDialog, DataTable, EmptyState, Modal } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { EMPTY_VALUE } from '../../lib/format';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Đợt S (#1): phòng vệ cho cột nullable — hôm nay `rowToAccessory` vẫn quy NULL về `0`
 * (`n(v)` không truyền default) nên hiển thị `0 đ`; nếu về sau mapper trả `null` thật thì
 * `.toLocaleString()` sẽ **crash trắng** và component này đã sẵn sàng hiện `—`.
 */
const numText = (v: number | null | undefined, suffix = ''): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toLocaleString('vi-VN')}${suffix}` : EMPTY_VALUE;

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
  const { language } = useLanguage();
  const isVi = language === 'vi';
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
      header: isVi ? 'Tên Phụ Kiện / SKU' : 'Accessory / SKU',
      value: (a) => a.name,
      render: (item) => (
        <div className="flex items-center gap-3">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-sm object-cover border border-line shrink-0" />
          ) : (
            <span className="w-10 h-10 rounded-sm border border-line bg-surface-muted text-fg-subtle flex items-center justify-center shrink-0">
              <Icon name="inventory" size={18} />
            </span>
          )}
          <div>
            <p className="font-bold text-fg leading-snug">{item.name}</p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-fg-muted">
              <span className="font-tech font-bold text-primary">{item.sku || '—'}</span>
              {item.supplier && <span>• NCC: {item.supplier}</span>}
            </div>
            {item.compatibleWith && item.compatibleWith.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.compatibleWith.map((c, i) => (
                  <span key={i} className="text-xs bg-surface-muted text-fg-muted px-1.5 py-0.5 rounded-sm font-sans">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: isVi ? 'Phân Loại' : 'Category',
      value: (a) => a.category,
      render: (item) => (
        <div>
          <span className="px-2 py-0.5 bg-info-tint text-info rounded-sm text-xs font-bold capitalize">{item.category}</span>
          <div className="text-xs text-fg-muted mt-0.5">ĐVT: {item.unit}</div>
        </div>
      ),
    },
    {
      key: 'costPrice',
      header: isVi ? 'Giá Vốn Xưởng' : 'Cost price',
      numeric: true,
      value: (a) => a.costPrice ?? 0,
      render: (item) => <span className="text-fg-muted">{numText(item.costPrice, ' đ')}</span>,
    },
    {
      key: 'sellingPrice',
      header: isVi ? 'Giá Báo Khách' : 'Sell price',
      numeric: true,
      value: (a) => a.sellingPrice ?? 0,
      render: (item) => {
        const grossMargin =
          isMissingNum(item.sellingPrice) || isMissingNum(item.costPrice) || item.sellingPrice <= 0
            ? null
            : Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100);
        return (
          <div>
            <span className="font-tech font-bold text-fg">{numText(item.sellingPrice, ' đ')}</span>
            <div className={`text-xs font-tech font-semibold ${grossMargin === null ? 'text-fg-subtle' : 'text-positive'}`}>
              {grossMargin === null ? `${EMPTY_VALUE} margin` : `+${grossMargin}% margin`}
            </div>
          </div>
        );
      },
    },
    {
      key: 'stockCount',
      header: isVi ? 'Tồn Kho' : 'Stock',
      align: 'center',
      value: (a) => a.stockCount ?? 0,
      render: (item) => {
        const isLow = isLowStock(item);
        const stockUnknown = isMissingNum(item.stockCount);
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span className={`font-tech font-bold text-sm ${isLow ? 'text-danger' : 'text-fg'}`}>{numText(item.stockCount)}</span>
              <span className="text-xs text-fg-muted">{item.unit}</span>
            </div>
            {isLow && (
              <span className="px-1.5 py-0.5 bg-danger-tint text-danger rounded-sm text-xs font-bold">
                Sắp hết (&lt;={numText(item.lowStockThreshold)})
              </span>
            )}
            <div className="flex items-center gap-1 mt-1">
              {[
                { delta: -10, label: '-10', cls: 'bg-surface-muted hover:bg-line-subtle text-fg-muted' },
                { delta: 10, label: '+10', cls: 'bg-surface-muted hover:bg-line-subtle text-fg-muted' },
                { delta: 50, label: '+50', cls: 'bg-positive-tint hover:bg-positive/20 text-positive' },
              ].map((btn) => (
                <button
                  key={btn.delta}
                  type="button"
                  onClick={() => handleQuickStockAdjust(item.id, btn.delta)}
                  className={`px-1.5 py-0.5 rounded-sm text-xs font-tech font-bold disabled:opacity-40 disabled:cursor-not-allowed ${btn.cls}`}
                  disabled={stockUnknown}
                  title={stockUnknown ? 'Chưa có số tồn kho — không điều chỉnh nhanh được' : btn.label}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      key: 'warehouseLocation',
      header: isVi ? 'Vị Trí Kệ Kho' : 'Shelf location',
      value: (a) => a.warehouseLocation || '',
      render: (item) => (
        <span className="flex items-center gap-1 font-tech font-bold text-primary">
          <Icon name="shelves" size={16} />
          {item.warehouseLocation || '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: isVi ? 'Trạng Thái' : 'Status',
      align: 'center',
      value: (a) => (a.isActive ? 'active' : 'hidden'),
      render: (item) => (
        <button
          type="button"
          onClick={() => handleToggleActive(item.id)}
          aria-pressed={item.isActive}
          className={`px-2.5 py-1 rounded-sm text-xs font-tech font-bold transition-colors ${
            item.isActive ? 'bg-positive-tint text-positive hover:bg-positive/30' : 'bg-surface-muted text-fg-muted hover:bg-line-subtle'
          }`}
        >
          {item.isActive ? 'Đang Dùng' : 'Tạm Ẩn'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: isVi ? 'Thao Tác' : 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditingItem(item)}
            className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-sm transition-colors"
            aria-label={isVi ? `Sửa ${item.name}` : `Edit ${item.name}`}
            title={isVi ? 'Chỉnh sửa thông số' : 'Edit'}
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteItem(item.id, item.name)}
            className="p-1.5 bg-danger-tint text-danger rounded-sm transition-colors"
            aria-label={isVi ? `Xoá ${item.name}` : `Delete ${item.name}`}
            title={isVi ? 'Xóa phụ kiện' : 'Delete'}
          >
            <Icon name="delete" size={16} />
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isVi]);

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
      <div className="bg-surface p-5 border border-line rounded-sm shadow-e1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-fg flex items-center gap-2">
              <Icon name="extension" size={24} className="text-primary" />
              Quản Lý Phụ Kiện, Linh Kiện & Đóng Gói (Hardware & Packaging)
            </h2>
            <div className="mt-0.5">
              <InfoTip label="Phụ kiện quản lý những trường nào?">
                Cấu hình giá vốn xưởng, giá báo cho khách, vị trí kho và theo dõi mức tồn kho thực tế cho móc khóa,
                ốc cấy ren, nam châm, bao bì…
              </InfoTip>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {lowStockCount > 0 && (
              <div className="px-3 py-1.5 bg-warning-tint border border-warning/30 rounded-sm flex items-center gap-1.5 text-xs text-warning font-bold">
                <Icon name="warning" size={16} className="text-warning" />
                {lowStockCount} mặt hàng sắp hết
              </div>
            )}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 bg-primary text-primary-fg rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-primary-hover flex items-center gap-1.5 shadow-e1"
            >
              <Icon name="add_circle" size={16} />
              Thêm Phụ Kiện Mới
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface p-4 border border-line rounded-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Icon name="search" size={16} className="absolute left-3 top-2.5 text-fg-muted" />
            <input
              type="text"
              placeholder="Tìm theo tên phụ kiện, mã SKU, vị trí kệ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-line rounded-sm text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-fg-muted font-bold shrink-0">Danh mục:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-line rounded-sm text-xs font-bold bg-surface focus:outline-none focus:border-primary"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Accessories Table — primitive DataTable */}
      {accessories.length === 0 ? (
        <div className="bg-surface rounded-sm p-6 shadow-e1">
          <EmptyState
            icon={<Icon name="extension" size={20} />}
            title={isVi ? 'Chưa có phụ kiện nào trong cơ sở dữ liệu' : 'No accessories yet'}
            description={isVi
              ? 'Bảng accessories đang rỗng — nền tảng không tự sinh phụ kiện mẫu. Hãy thêm phụ kiện thật.'
              : 'The accessories table is empty — no sample data is generated. Add real accessories.'}
            action={
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                {isVi ? 'Thêm Phụ Kiện Mới' : 'Add accessory'}
              </button>
            }
          />
        </div>
      ) : (
        <DataTable<AccessoryItem>
          columns={accessoryColumns}
          rows={filteredAccessories}
          getRowId={(row) => row.id}
          caption={isVi ? 'Danh sách phụ kiện' : 'Accessory list'}
          tableLabel={isVi ? 'Danh sách phụ kiện' : 'Accessory list'}
          defaultSort={[{ key: 'name', direction: 'asc' }]}
          emptyState={
            <EmptyState
              live
              title={isVi ? 'Không tìm thấy phụ kiện phù hợp' : 'No matching accessories'}
              description={isVi ? 'Thử xoá từ khoá hoặc đổi bộ lọc phân loại.' : 'Clear the search or change the category filter.'}
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
            <form onSubmit={handleSaveNewItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-fg block mb-1">Tên Phụ Kiện (Tiếng Việt) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Khoen móc khóa Inox 304 có dây xích 25mm"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border border-line rounded-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Mã SKU Quản Lý *</label>
                  <input
                    type="text"
                    required
                    value={newItemForm.sku}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full p-2 border border-line rounded-sm font-tech"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Phân Loại</label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full p-2 border border-line rounded-sm font-bold bg-surface"
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
                  <label className="font-bold text-fg block mb-1">Đơn Vị Tính (ĐVT)</label>
                  <input
                    type="text"
                    placeholder="cái, bộ, con, sợi, hộp, túi..."
                    value={newItemForm.unit}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full p-2 border border-line rounded-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Vị Trí Kệ Kho</label>
                  <input
                    type="text"
                    placeholder="Kệ A1 - Hộc 02"
                    value={newItemForm.warehouseLocation}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, warehouseLocation: e.target.value }))}
                    className="w-full p-2 border border-line rounded-sm font-tech"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Giá Vốn Nhập Xưởng (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={numInputValue(newItemForm.costPrice)}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, costPrice: parseNumOrNull(e.target.value) }))}
                    className="w-full p-2 border border-line rounded-sm font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Giá Báo / Bán Cho Khách (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={numInputValue(newItemForm.sellingPrice)}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, sellingPrice: parseNumOrNull(e.target.value) }))}
                    className="w-full p-2 border border-line rounded-sm font-tech font-bold text-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Tồn Kho Ban Đầu</label>
                  <input
                    type="number"
                    min="0"
                    value={numInputValue(newItemForm.stockCount)}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, stockCount: parseNumOrNull(e.target.value) }))}
                    className="w-full p-2 border border-line rounded-sm font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Ngưỡng Báo Sắp Hết</label>
                  <input
                    type="number"
                    min="1"
                    value={numInputValue(newItemForm.lowStockThreshold)}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, lowStockThreshold: parseNumOrNull(e.target.value) }))}
                    className="w-full p-2 border border-line rounded-sm font-tech text-danger font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-fg block mb-1">Nhà Cung Cấp</label>
                  <input
                    type="text"
                    placeholder="Xưởng Kim Khí Tân Bình, Fasteners VN..."
                    value={newItemForm.supplier}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full p-2 border border-line rounded-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-fg block mb-1">Mô Tả Kỹ Thuật</label>
                  <textarea
                    rows={2}
                    placeholder="Đặc tính kim loại, dung sai, khả năng chịu lực..."
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border border-line rounded-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-sm font-bold hover:bg-surface-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-fg rounded-sm font-bold uppercase hover:bg-primary-hover"
                >
                  Lưu Phụ Kiện
                </button>
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
            <form onSubmit={handleSaveEditItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-fg block mb-1">Tên Phụ Kiện *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full p-2 border border-line rounded-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Mã SKU *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                    className="w-full p-2 border border-line rounded-sm font-tech"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Phân Loại</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-sm font-bold bg-surface"
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
                  <label className="font-bold text-fg block mb-1">Đơn Vị Tính</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full p-2 border border-line rounded-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Vị Trí Kệ Kho</label>
                  <input
                    type="text"
                    value={editingItem.warehouseLocation || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, warehouseLocation: e.target.value })}
                    className="w-full p-2 border border-line rounded-sm font-tech"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Giá Vốn Nhập Xưởng (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={numInputValue(editingItem.costPrice)}
                    onChange={(e) => setEditingItem({ ...editingItem, costPrice: parseNumOrNull(e.target.value) })}
                    className="w-full p-2 border border-line rounded-sm font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Giá Báo Khách (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={numInputValue(editingItem.sellingPrice)}
                    onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: parseNumOrNull(e.target.value) })}
                    className="w-full p-2 border border-line rounded-sm font-tech font-bold text-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Số Lượng Tồn Kho</label>
                  <input
                    type="number"
                    min="0"
                    value={numInputValue(editingItem.stockCount)}
                    onChange={(e) => setEditingItem({ ...editingItem, stockCount: parseNumOrNull(e.target.value) })}
                    className="w-full p-2 border border-line rounded-sm font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">Ngưỡng Báo Hết</label>
                  <input
                    type="number"
                    min="1"
                    value={numInputValue(editingItem.lowStockThreshold)}
                    onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: parseNumOrNull(e.target.value) })}
                    className="w-full p-2 border border-line rounded-sm font-tech text-danger font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-fg block mb-1">Nhà Cung Cấp</label>
                  <input
                    type="text"
                    value={editingItem.supplier || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                    className="w-full p-2 border border-line rounded-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-fg block mb-1">Mô Tả</label>
                  <textarea
                    rows={2}
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full p-2 border border-line rounded-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-line rounded-sm font-bold hover:bg-surface-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-fg rounded-sm font-bold uppercase hover:bg-primary-hover"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};
