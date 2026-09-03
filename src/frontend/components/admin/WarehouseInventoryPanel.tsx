import React, { useState } from 'react';
import { MaterialProfile, AccessoryItem } from '../../types';

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

  // Calculate Aggregated Metrics
  const totalMaterialSpools = materials.reduce((sum, m) => sum + (m.stockRollsCount || 0), 0);
  const totalMaterialValue = materials.reduce((sum, m) => {
    const cost = m.costPerKg || (m.pricePerGram * 1000);
    return sum + (cost * (m.stockRollsCount || 0));
  }, 0);

  const totalAccessoriesCount = accessories.reduce((sum, a) => sum + (a.stockCount || 0), 0);
  const totalAccessoriesValue = accessories.reduce((sum, a) => sum + (a.costPrice * (a.stockCount || 0)), 0);

  const totalInventoryValuation = totalMaterialValue + totalAccessoriesValue;

  const lowStockMaterials = materials.filter(m => (m.stockRollsCount || 0) <= 3);
  const lowStockAccessories = accessories.filter(a => a.stockCount <= a.lowStockThreshold);
  const totalLowStockAlerts = lowStockMaterials.length + lowStockAccessories.length;

  // Extract Unique Locations
  const locations = Array.from(
    new Set(accessories.map(a => a.warehouseLocation).filter(Boolean) as string[])
  ).sort();

  // Handle Material Stock Adjust
  const handleMaterialStockAdjust = (id: string, delta: number) => {
    const updated = materials.map(m => {
      if (m.id === id) {
        const count = Math.max(0, (m.stockRollsCount || 0) + delta);
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
        const count = Math.max(0, a.stockCount + delta);
        return { ...a, stockCount: count };
      }
      return a;
    });
    onUpdateAccessories(updated);
    onShowToast(`Đã cập nhật tồn kho phụ kiện (${delta > 0 ? `+${delta}` : delta})`);
  };

  return (
    <div className="space-y-6">
      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-[#C5C6CD] rounded shadow-xs">
          <div className="flex items-center justify-between text-[#545F73]">
            <span className="text-[10px] font-tech uppercase font-bold tracking-wider">Tổng Giá Trị Tồn Kho</span>
            <span className="material-symbols-outlined text-[#00687A]">account_balance_wallet</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-tech font-bold text-[#091426]">
              {totalInventoryValuation.toLocaleString('vi-VN')} đ
            </span>
            <p className="text-[10px] text-[#545F73] mt-0.5">
              Vật liệu: {totalMaterialValue.toLocaleString('vi-VN')} đ • Phụ kiện: {totalAccessoriesValue.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>

        <div className="bg-white p-4 border border-[#C5C6CD] rounded shadow-xs">
          <div className="flex items-center justify-between text-[#545F73]">
            <span className="text-[10px] font-tech uppercase font-bold tracking-wider">Vật Liệu Nhựa & Resin</span>
            <span className="material-symbols-outlined text-blue-600">inventory_2</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-tech font-bold text-[#091426]">
              {totalMaterialSpools} cuộn / bình
            </span>
            <p className="text-[10px] text-[#545F73] mt-0.5">
              {materials.length} chủng loại nhựa (PLA, PETG, ABS, TPU, SLA...)
            </p>
          </div>
        </div>

        <div className="bg-white p-4 border border-[#C5C6CD] rounded shadow-xs">
          <div className="flex items-center justify-between text-[#545F73]">
            <span className="text-[10px] font-tech uppercase font-bold tracking-wider">Phụ Kiện & Bao Bì</span>
            <span className="material-symbols-outlined text-emerald-600">extension</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-tech font-bold text-[#091426]">
              {totalAccessoriesCount.toLocaleString('vi-VN')} món
            </span>
            <p className="text-[10px] text-[#545F73] mt-0.5">
              {accessories.length} mặt hàng (móc khóa, ốc cấy, nam châm, hộp...)
            </p>
          </div>
        </div>

        <div className="bg-white p-4 border border-[#C5C6CD] rounded shadow-xs">
          <div className="flex items-center justify-between text-[#545F73]">
            <span className="text-[10px] font-tech uppercase font-bold tracking-wider">Cảnh Báo Sắp Hết Hàng</span>
            <span className={`material-symbols-outlined ${totalLowStockAlerts > 0 ? 'text-red-600 animate-pulse' : 'text-slate-400'}`}>
              warning
            </span>
          </div>
          <div className="mt-2">
            <span className={`text-xl font-tech font-bold ${totalLowStockAlerts > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {totalLowStockAlerts} mặt hàng
            </span>
            <p className="text-[10px] text-[#545F73] mt-0.5">
              {lowStockMaterials.length} vật liệu & {lowStockAccessories.length} phụ kiện cần nhập thêm
            </p>
          </div>
        </div>
      </div>

      {/* Warehouse Location Matrix & Stock Synchronizer */}
      <div className="bg-gradient-to-r from-cyan-900 to-slate-900 text-white p-5 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#57DFFE]">shelves</span>
              <h3 className="font-bold text-sm text-white">Sơ Đồ Kệ Kho Xưởng & Đồng Bộ Báo Giá (Stock Mapping)</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Tất cả các số lượng tồn kho hiển thị tại đây được liên kết trực tiếp vào <strong>Tool Báo Giá 3D Quoting</strong> và <strong>Trình Dự Toán Xưởng</strong>. Khi khách chọn loại nhựa hoặc phụ kiện, hệ thống sẽ tự kiểm tra tính khả dụng.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded text-xs font-tech font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Đồng Bộ Thời Gian Thực
            </span>
          </div>
        </div>

        {/* Quick Location Filter Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-700/60">
          <span className="text-[10px] font-tech uppercase text-slate-400 font-bold">Lọc theo Vị Trí Kệ:</span>
          <button
            type="button"
            onClick={() => setSelectedLocation('all')}
            className={`px-2.5 py-1 text-[11px] rounded font-tech transition-colors ${
              selectedLocation === 'all'
                ? 'bg-[#57DFFE] text-[#091426] font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Tất Cả Kệ
          </button>
          {locations.map(loc => (
            <button
              key={loc}
              type="button"
              onClick={() => setSelectedLocation(loc)}
              className={`px-2.5 py-1 text-[11px] rounded font-tech transition-colors ${
                selectedLocation === loc
                  ? 'bg-[#57DFFE] text-[#091426] font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 border border-[#C5C6CD] rounded flex flex-col md:flex-row items-center justify-between gap-3">
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
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                filterType === tab.id
                  ? 'bg-[#00687A] text-white shadow-xs'
                  : 'bg-[#F4F6F9] text-[#545F73] hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72 relative">
          <span className="material-symbols-outlined absolute left-3 top-2 text-[#545F73] text-sm">search</span>
          <input
            type="text"
            placeholder="Tìm theo tên hàng, mã SKU, vị trí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-[#C5C6CD] rounded text-xs focus:outline-none focus:border-[#00687A]"
          />
        </div>
      </div>

      {/* 1. SECTON: TỒN KHO NHỰA IN & RESIN (FILAMENTS / RESINS) */}
      {(filterType === 'all' || filterType === 'materials' || filterType === 'low_stock') && (
        <div className="bg-white border border-[#C5C6CD] rounded overflow-hidden shadow-xs">
          <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#C5C6CD] flex items-center justify-between">
            <h3 className="font-bold text-xs text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A] text-sm">palette</span>
              Tồn Kho Cuộn Nhựa Filament & Nhựa Resin (Đang Đồng Bộ Báo Giá)
            </h3>
            <span className="text-[11px] font-tech text-[#545F73]">
              Tổng: <strong>{totalMaterialSpools} cuộn</strong> ({totalMaterialValue.toLocaleString('vi-VN')} đ)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F9] border-b border-[#C5C6CD] text-[#545F73] uppercase font-tech text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Tên Vật Liệu</th>
                  <th className="py-2.5 px-4">Thương Hiệu</th>
                  <th className="py-2.5 px-4 text-right">Giá Vốn / kg</th>
                  <th className="py-2.5 px-4 text-right">Giá Báo / g</th>
                  <th className="py-2.5 px-4 text-center">Tồn Kho (Cuộn)</th>
                  <th className="py-2.5 px-4 text-center">Trạng Thái Báo Giá</th>
                  <th className="py-2.5 px-4 text-right">Nhập / Xuất Kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EEFF]">
                {materials
                  .filter(m => {
                    const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      m.brand.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchLow = filterType !== 'low_stock' || (m.stockRollsCount || 0) <= 3;
                    return matchSearch && matchLow;
                  })
                  .map((mat) => {
                    const count = mat.stockRollsCount || 0;
                    const isLow = count <= 3;
                    const costKg = mat.costPerKg || (mat.pricePerGram * 1000);

                    return (
                      <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                              {mat.colors.slice(0, 3).map((col, idx) => (
                                <span
                                  key={idx}
                                  className="w-3.5 h-3.5 rounded-full border border-white shadow-xs inline-block"
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                            </div>
                            <div>
                              <p className="font-bold text-[#091426]">{mat.name}</p>
                              <p className="text-[10px] text-[#545F73]">{mat.recommendedFor || 'In mẫu kỹ thuật'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-sans text-[#545F73]">
                          {mat.brand}
                        </td>

                        <td className="py-3 px-4 text-right font-tech text-[#545F73]">
                          {costKg.toLocaleString('vi-VN')} đ
                        </td>

                        <td className="py-3 px-4 text-right font-tech font-bold text-[#00687A]">
                          {mat.pricePerGram.toLocaleString('vi-VN')} đ/g
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-tech font-bold text-sm ${isLow ? 'text-red-700' : 'text-[#091426]'}`}>
                              {count} cuộn
                            </span>
                            {isLow && (
                              <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded mt-0.5">
                                Cần nhập thêm (&lt;=3)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-tech font-bold ${
                            mat.inStock && count > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {mat.inStock && count > 0 ? 'Sẵn Sàng Cho Khách' : 'Tạm Hết Hàng'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleMaterialStockAdjust(mat.id, -1)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-tech font-bold text-[10px]"
                              title="Xuất 1 cuộn"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMaterialStockAdjust(mat.id, 1)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-tech font-bold text-[10px]"
                              title="Nhập 1 cuộn"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMaterialStockAdjust(mat.id, 5)}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-tech font-bold text-[10px]"
                              title="Nhập 5 cuộn"
                            >
                              +5
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SECTION: TỒN KHO PHỤ KIỆN & BAO BÌ (ACCESSORIES / PACKAGING / HARDWARE) */}
      {(filterType === 'all' || filterType === 'accessories' || filterType === 'low_stock') && (
        <div className="bg-white border border-[#C5C6CD] rounded overflow-hidden shadow-xs">
          <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#C5C6CD] flex items-center justify-between">
            <h3 className="font-bold text-xs text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A] text-sm">extension</span>
              Tồn Kho Phụ Kiện, Linh Kiện & Đóng Gói (Hardware & Packaging Stock)
            </h3>
            <span className="text-[11px] font-tech text-[#545F73]">
              Tổng: <strong>{totalAccessoriesCount.toLocaleString('vi-VN')} món</strong> ({totalAccessoriesValue.toLocaleString('vi-VN')} đ)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F9] border-b border-[#C5C6CD] text-[#545F73] uppercase font-tech text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Tên Phụ Kiện / Mã SKU</th>
                  <th className="py-2.5 px-4">Phân Loại</th>
                  <th className="py-2.5 px-4">Vị Trí Kệ</th>
                  <th className="py-2.5 px-4 text-right">Giá Vốn</th>
                  <th className="py-2.5 px-4 text-right">Giá Báo Khách</th>
                  <th className="py-2.5 px-4 text-center">Tồn Kho</th>
                  <th className="py-2.5 px-4 text-right">Nhập / Xuất Nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EEFF]">
                {accessories
                  .filter(a => {
                    const matchSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      a.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (a.warehouseLocation && a.warehouseLocation.toLowerCase().includes(searchTerm.toLowerCase()));
                    const matchLocation = selectedLocation === 'all' || a.warehouseLocation === selectedLocation;
                    const matchLow = filterType !== 'low_stock' || a.stockCount <= a.lowStockThreshold;
                    return matchSearch && matchLocation && matchLow;
                  })
                  .map((acc) => {
                    const isLow = acc.stockCount <= acc.lowStockThreshold;

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={acc.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'}
                              alt={acc.name}
                              className="w-8 h-8 rounded object-cover border border-[#C5C6CD]"
                            />
                            <div>
                              <p className="font-bold text-[#091426]">{acc.name}</p>
                              <span className="font-tech text-[10px] text-[#00687A] font-semibold">{acc.sku}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-sans capitalize text-[#545F73]">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded text-[10px] font-bold">
                            {acc.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-tech font-bold text-xs text-[#00687A]">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">shelves</span>
                            {acc.warehouseLocation || 'Kho Tổng'}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-tech text-[#545F73]">
                          {acc.costPrice.toLocaleString('vi-VN')} đ
                        </td>

                        <td className="py-3 px-4 text-right font-tech font-bold text-[#091426]">
                          {acc.sellingPrice.toLocaleString('vi-VN')} đ
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-tech font-bold text-sm ${isLow ? 'text-red-700' : 'text-[#091426]'}`}>
                              {acc.stockCount} {acc.unit}
                            </span>
                            {isLow && (
                              <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded mt-0.5">
                                Cảnh báo hết (&lt;={acc.lowStockThreshold})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleAccessoryStockAdjust(acc.id, -10)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-tech font-bold text-[10px]"
                              title="Giảm 10"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAccessoryStockAdjust(acc.id, 10)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-tech font-bold text-[10px]"
                              title="Tăng 10"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAccessoryStockAdjust(acc.id, 50)}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-tech font-bold text-[10px]"
                              title="Nhập 50"
                            >
                              +50
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
