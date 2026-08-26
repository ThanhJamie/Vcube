import React, { useState } from 'react';
import { AccessoryItem } from '../../types';

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
    costPrice: 2000,
    sellingPrice: 5000,
    sku: `ACC-${Math.floor(1000 + Math.random() * 9000)}`,
    stockCount: 100,
    lowStockThreshold: 20,
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
    const newItem: AccessoryItem = {
      id: `acc-${Date.now()}`,
      name: newItemForm.name,
      nameEn: newItemForm.nameEn || '',
      category: newItemForm.category || 'keychain',
      unit: newItemForm.unit || 'cái',
      costPrice: Number(newItemForm.costPrice) || 0,
      sellingPrice: Number(newItemForm.sellingPrice) || 0,
      sku: newItemForm.sku || `ACC-${Date.now()}`,
      stockCount: Number(newItemForm.stockCount) || 0,
      lowStockThreshold: Number(newItemForm.lowStockThreshold) || 10,
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

  const lowStockCount = accessories.filter(a => a.stockCount <= a.lowStockThreshold).length;

  return (
    <div className="space-y-6">
      {/* Header Banner & Stats */}
      <div className="bg-white p-5 border border-[#C5C6CD] rounded shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">extension</span>
              Quản Lý Phụ Kiện, Linh Kiện & Đóng Gói (Hardware & Packaging)
            </h2>
            <p className="text-xs text-[#545F73] mt-0.5">
              Cấu hình giá vốn xưởng, giá báo cho khách, vị trí kho và theo dõi mức tồn kho thực tế cho móc khóa, ốc cấy ren, nam châm, bao bì...
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {lowStockCount > 0 && (
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-300 rounded flex items-center gap-1.5 text-xs text-amber-900 font-bold">
                <span className="material-symbols-outlined text-sm text-amber-600">warning</span>
                {lowStockCount} mặt hàng sắp hết
              </div>
            )}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 bg-[#00687A] text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-[#005463] flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Thêm Phụ Kiện Mới
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 border border-[#C5C6CD] rounded flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#545F73] text-sm">search</span>
            <input
              type="text"
              placeholder="Tìm theo tên phụ kiện, mã SKU, vị trí kệ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#C5C6CD] rounded text-xs focus:outline-none focus:border-[#00687A]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-[#545F73] font-bold shrink-0">Danh mục:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-[#C5C6CD] rounded text-xs font-bold bg-white focus:outline-none focus:border-[#00687A]"
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
      <div className="bg-white border border-[#C5C6CD] rounded overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6F9] border-b border-[#C5C6CD] text-[#545F73] uppercase font-tech text-[10px] tracking-wider">
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
            <tbody className="divide-y divide-[#E5EEFF]">
              {filteredAccessories.length > 0 ? (
                filteredAccessories.map((item) => {
                  const isLow = item.stockCount <= item.lowStockThreshold;
                  const grossMargin = item.sellingPrice > 0 ? Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'}
                            alt={item.name}
                            className="w-10 h-10 rounded object-cover border border-[#C5C6CD] shrink-0"
                          />
                          <div>
                            <p className="font-bold text-[#091426] leading-snug">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#545F73]">
                              <span className="font-tech font-bold text-[#00687A]">{item.sku}</span>
                              {item.supplier && <span>• NCC: {item.supplier}</span>}
                            </div>
                            {item.compatibleWith && item.compatibleWith.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.compatibleWith.map((c, i) => (
                                  <span key={i} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-sans">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 font-sans text-[#545F73] capitalize">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded text-[10px] font-bold">
                          {item.category}
                        </span>
                        <div className="text-[10px] text-[#7D7565] mt-0.5">ĐVT: {item.unit}</div>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-4 text-right font-tech text-[#545F73]">
                        {item.costPrice.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-tech font-bold text-[#091426]">
                          {item.sellingPrice.toLocaleString('vi-VN')} đ
                        </span>
                        <div className="text-[10px] text-emerald-700 font-tech font-semibold">
                          +{grossMargin}% margin
                        </div>
                      </td>

                      {/* Stock Count with Quick Adjust */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-tech font-bold text-sm ${isLow ? 'text-red-700' : 'text-[#091426]'}`}>
                              {item.stockCount}
                            </span>
                            <span className="text-[10px] text-[#545F73]">{item.unit}</span>
                          </div>

                          {isLow && (
                            <span className="px-1.5 py-0.2 bg-red-100 text-red-800 rounded text-[9px] font-bold animate-pulse">
                              Sắp hết (&lt;={item.lowStockThreshold})
                            </span>
                          )}

                          {/* Quick Adjust Buttons */}
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(item.id, -10)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-tech font-bold"
                              title="Giảm 10"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(item.id, 10)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-tech font-bold"
                              title="Thêm 10"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(item.id, 50)}
                              className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-tech font-bold"
                              title="Nhập 50"
                            >
                              +50
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Warehouse Location */}
                      <td className="py-3 px-4 font-sans text-xs text-[#091426]">
                        <div className="flex items-center gap-1 font-tech font-bold text-[#00687A]">
                          <span className="material-symbols-outlined text-sm">shelves</span>
                          {item.warehouseLocation || 'Chưa định vị'}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id)}
                          className={`px-2.5 py-1 rounded text-[10px] font-tech font-bold transition-all ${
                            item.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                            className="p-1.5 bg-[#E5EEFF] hover:bg-[#D0E2FF] text-[#00687A] rounded transition-colors"
                            title="Chỉnh sửa thông số"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
                            title="Xóa phụ kiện"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#545F73]">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="font-bold text-sm text-[#091426] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00687A]">add_circle</span>
                Thêm Phụ Kiện / Bao Bì Mới Vào Hệ Thống
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-[#545F73] hover:text-black"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-[#091426] block mb-1">Tên Phụ Kiện (Tiếng Việt) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Khoen móc khóa Inox 304 có dây xích 25mm"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded focus:outline-none focus:border-[#00687A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Mã SKU Quản Lý *</label>
                  <input
                    type="text"
                    required
                    value={newItemForm.sku}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Phân Loại</label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-bold bg-white"
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
                  <label className="font-bold text-[#091426] block mb-1">Đơn Vị Tính (ĐVT)</label>
                  <input
                    type="text"
                    placeholder="cái, bộ, con, sợi, hộp, túi..."
                    value={newItemForm.unit}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Vị Trí Kệ Kho</label>
                  <input
                    type="text"
                    placeholder="Kệ A1 - Hộc 02"
                    value={newItemForm.warehouseLocation}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, warehouseLocation: e.target.value }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Giá Vốn Nhập Xưởng (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={newItemForm.costPrice}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Giá Báo / Bán Cho Khách (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newItemForm.sellingPrice}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, sellingPrice: Number(e.target.value) }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold text-[#00687A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Tồn Kho Ban Đầu</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemForm.stockCount}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, stockCount: Number(e.target.value) }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Ngưỡng Báo Sắp Hết</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemForm.lowStockThreshold}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, lowStockThreshold: Number(e.target.value) }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech text-red-700 font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[#091426] block mb-1">Nhà Cung Cấp</label>
                  <input
                    type="text"
                    placeholder="Xưởng Kim Khí Tân Bình, Fasteners VN..."
                    value={newItemForm.supplier}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[#091426] block mb-1">Mô Tả Kỹ Thuật</label>
                  <textarea
                    rows={2}
                    placeholder="Đặc tính kim loại, dung sai, khả năng chịu lực..."
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border border-[#C5C6CD] rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-[#C5C6CD] rounded font-bold hover:bg-black/5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00687A] text-white rounded font-bold uppercase hover:bg-[#005463]"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="font-bold text-sm text-[#091426] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00687A]">edit</span>
                Chỉnh Sửa Phụ Kiện: {editingItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-[#545F73] hover:text-black"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-[#091426] block mb-1">Tên Phụ Kiện *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded focus:outline-none focus:border-[#00687A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Mã SKU *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Phân Loại</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-bold bg-white"
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
                  <label className="font-bold text-[#091426] block mb-1">Đơn Vị Tính</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Vị Trí Kệ Kho</label>
                  <input
                    type="text"
                    value={editingItem.warehouseLocation || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, warehouseLocation: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Giá Vốn Nhập Xưởng (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.costPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, costPrice: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Giá Báo Khách (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.sellingPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold text-[#00687A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Số Lượng Tồn Kho</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.stockCount}
                    onChange={(e) => setEditingItem({ ...editingItem, stockCount: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#091426] block mb-1">Ngưỡng Báo Hết</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.lowStockThreshold}
                    onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech text-red-700 font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[#091426] block mb-1">Nhà Cung Cấp</label>
                  <input
                    type="text"
                    value={editingItem.supplier || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[#091426] block mb-1">Mô Tả</label>
                  <textarea
                    rows={2}
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-[#C5C6CD] rounded font-bold hover:bg-black/5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00687A] text-white rounded font-bold uppercase hover:bg-[#005463]"
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
