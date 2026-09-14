import React, { useState } from 'react';
import { AccessoryItem } from '../../types';
import { Icon, InfoTip } from '@frontend/ui';
import { EMPTY_VALUE } from '../../lib/format';

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
    warehouseLocation: 'Kệ A1 - Hộc 01',
    supplier: 'Xưởng Kim Khí Tân Bình',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Móc khóa', 'Quà tặng']
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

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa phụ kiện "${name}" khỏi danh mục?`)) {
      const updated = accessories.filter(a => a.id !== id);
      onUpdateAccessories(updated);
      onShowToast(`Đã xóa phụ kiện: ${name}`);
    }
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
      warehouseLocation: newItemForm.warehouseLocation || 'Kho Tổng',
      supplier: newItemForm.supplier || '',
      description: newItemForm.description || '',
      imageUrl: newItemForm.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
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

  return (
    <div className="space-y-6">
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

      {/* Accessories Table */}
      <div className="bg-surface rounded-sm overflow-hidden shadow-e1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-line text-fg-muted uppercase font-tech text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4">Tên Phụ Kiện / SKU</th>
                <th className="py-3 px-4">Phân Loại</th>
                <th className="py-3 px-4 text-right">Giá Vốn Xưởng</th>
                <th className="py-3 px-4 text-right">Giá Báo Khách</th>
                <th className="py-3 px-4 text-center">Tồn Kho</th>
                <th className="py-3 px-4">Vị Trí Kệ Kho</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {accessories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center">
                    <Icon name="extension" size={32} className="text-fg-subtle mx-auto" />
                    <p className="mt-2 text-sm font-bold text-fg">Chưa có phụ kiện nào trong cơ sở dữ liệu</p>
                    <p className="mt-1 text-xs text-fg-muted max-w-xl mx-auto">
                      Bảng <span className="font-tech">accessories</span> đang rỗng — nền tảng không tự sinh phụ kiện mẫu.
                      Hãy thêm phụ kiện thật bằng nút "Thêm Phụ Kiện Mới".
                    </p>
                  </td>
                </tr>
              ) : filteredAccessories.length > 0 ? (
                filteredAccessories.map((item) => {
                  const isLow = isLowStock(item);
                  const stockUnknown = isMissingNum(item.stockCount);
                  // Đợt T: thiếu giá vốn hoặc giá bán ⇒ KHÔNG hiện "+0% margin" (số bịa).
                  const grossMargin = isMissingNum(item.sellingPrice) || isMissingNum(item.costPrice) || item.sellingPrice <= 0
                    ? null
                    : Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100);

                  return (
                    <tr key={item.id} className="hover:bg-canvas/70 transition-colors">
                      {/* Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'}
                            alt={item.name}
                            className="w-10 h-10 rounded-sm object-cover border border-line shrink-0"
                          />
                          <div>
                            <p className="font-bold text-fg leading-snug">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-fg-muted">
                              <span className="font-tech font-bold text-primary">{item.sku || '—'}</span>
                              {item.supplier && <span>• NCC: {item.supplier}</span>}
                            </div>
                            {item.compatibleWith && item.compatibleWith.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.compatibleWith.map((c, i) => (
                                  <span key={i} className="text-xs bg-surface-muted text-fg-muted px-1.5 py-0.2 rounded-sm font-sans">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 font-sans text-fg-muted capitalize">
                        <span className="px-2 py-0.5 bg-info-tint text-info rounded-sm text-xs font-bold">
                          {item.category}
                        </span>
                        <div className="text-xs text-fg-muted mt-0.5">ĐVT: {item.unit}</div>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-4 text-right font-tech text-fg-muted">
                        {numText(item.costPrice, ' đ')}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-tech font-bold text-fg">
                          {numText(item.sellingPrice, ' đ')}
                        </span>
                        <div
                          className={`text-xs font-tech font-semibold ${grossMargin === null ? 'text-fg-subtle' : 'text-positive'}`}
                          title={grossMargin === null ? 'Chưa đủ giá vốn và giá bán để tính biên lợi nhuận' : undefined}
                        >
                          {grossMargin === null ? `${EMPTY_VALUE} margin` : `+${grossMargin}% margin`}
                        </div>
                      </td>

                      {/* Stock Count with Quick Adjust */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-tech font-bold text-sm ${isLow ? 'text-danger' : 'text-fg'}`}>
                              {numText(item.stockCount)}
                            </span>
                            <span className="text-xs text-fg-muted">{item.unit}</span>
                          </div>

                          {isLow && (
                            <span className="px-1.5 py-0.2 bg-danger-tint text-danger rounded-sm text-xs font-bold animate-pulse">
                              Sắp hết (&lt;={numText(item.lowStockThreshold)})
                            </span>
                          )}

                          {/* Quick Adjust Buttons */}
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(item.id, -10)}
                              className="px-1.5 py-0.5 bg-surface-muted hover:bg-line-subtle text-fg-muted rounded-sm text-xs font-tech font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                              disabled={stockUnknown}
                              title={stockUnknown ? 'Chưa có số tồn kho — không điều chỉnh nhanh được' : 'Giảm 10'}
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(item.id, 10)}
                              className="px-1.5 py-0.5 bg-surface-muted hover:bg-line-subtle text-fg-muted rounded-sm text-xs font-tech font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                              disabled={stockUnknown}
                              title={stockUnknown ? 'Chưa có số tồn kho — không điều chỉnh nhanh được' : 'Thêm 10'}
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(item.id, 50)}
                              className="px-1.5 py-0.5 bg-positive-tint hover:bg-positive/20 text-positive rounded-sm text-xs font-tech font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                              disabled={stockUnknown}
                              title={stockUnknown ? 'Chưa có số tồn kho — không điều chỉnh nhanh được' : 'Nhập 50'}
                            >
                              +50
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Warehouse Location */}
                      <td className="py-3 px-4 font-sans text-xs text-fg">
                        <div className="flex items-center gap-1 font-tech font-bold text-primary">
                          <Icon name="shelves" size={16} />
                          {item.warehouseLocation || 'Chưa định vị'}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id)}
                          className={`px-2.5 py-1 rounded-sm text-xs font-tech font-bold transition-all ${
                            item.isActive
                              ? 'bg-positive-tint text-positive hover:bg-positive/30'
                              : 'bg-surface-muted text-fg-muted hover:bg-line-subtle'
                          }`}
                        >
                          {item.isActive ? 'Đang Dùng' : 'Tạm Ẩn'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-sm transition-colors"
                            title="Chỉnh sửa thông số"
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 bg-danger-tint hover:bg-danger-tint text-danger rounded-sm transition-colors"
                            title="Xóa phụ kiện"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-fg-muted">
                    Không tìm thấy phụ kiện nào phù hợp với từ khóa hoặc bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Thêm Phụ Kiện Mới */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-modal bg-surface-inverse/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-e3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-sm text-fg flex items-center gap-2">
                <Icon name="add_circle" size={24} className="text-primary" />
                Thêm Phụ Kiện / Bao Bì Mới Vào Hệ Thống
              </h3>
              <button aria-label="Đóng"
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-fg-muted hover:text-fg"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

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
          </div>
        </div>
      )}

      {/* MODAL: Sửa Phụ Kiện */}
      {editingItem && (
        <div className="fixed inset-0 z-modal bg-surface-inverse/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-e3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-sm text-fg flex items-center gap-2">
                <Icon name="edit" size={24} className="text-primary" />
                Chỉnh Sửa Phụ Kiện: {editingItem.name}
              </h3>
              <button aria-label="Đóng"
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-fg-muted hover:text-fg"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

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
          </div>
        </div>
      )}
    </div>
  );
};
