import React, { useState } from 'react';
import { MaterialProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminMaterialsPanelProps {
  materials: MaterialProfile[];
  onUpdateMaterials: (materials: MaterialProfile[]) => void;
  onShowToast: (message: string) => void;
}

export const AdminMaterialsPanel: React.FC<AdminMaterialsPanelProps> = ({
  materials,
  onUpdateMaterials,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [editingMaterial, setEditingMaterial] = useState<MaterialProfile | null>(null);
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState(false);

  const [materialForm, setMaterialForm] = useState<Partial<MaterialProfile>>({
    name: '',
    brand: 'eSUN / Bambu Lab',
    density: 1.24,
    strength: 'Cao',
    heatResistance: '60°C',
    flexibility: 'Thấp',
    costPerKg: 350000,
    pricePerGram: 900,
    unitPriceMultiplier: 1.0,
    spoolWeightGrams: 1000,
    extruderTempMin: 205,
    extruderTempMax: 225,
    bedTemp: 60,
    colors: ['#1C1C1C', '#ffffff', '#00687a'],
    desc: 'Nhựa in 3D kỹ thuật cao cho bề mặt mịn màng.',
    recommendedFor: 'Prototypes, đồ gá, vỏ hộp tiêu chuẩn',
    inStock: true,
    stockRollsCount: 25
  });

  const handleSaveNewMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.name?.trim()) {
      onShowToast(isVi ? 'Vui lòng nhập tên vật liệu!' : 'Please enter material name');
      return;
    }
    const newId = `mat-${Date.now()}`;
    const newMat: MaterialProfile = {
      id: newId,
      name: materialForm.name,
      brand: materialForm.brand || 'Bambu Lab',
      density: Number(materialForm.density) || 1.24,
      strength: materialForm.strength || 'Cao',
      heatResistance: materialForm.heatResistance || '60°C',
      flexibility: materialForm.flexibility || 'Thấp',
      costPerKg: Number(materialForm.costPerKg) || 350000,
      pricePerGram: Number(materialForm.pricePerGram) || 900,
      unitPriceMultiplier: Number(materialForm.unitPriceMultiplier) || 1.0,
      spoolWeightGrams: Number(materialForm.spoolWeightGrams) || 1000,
      extruderTempMin: Number(materialForm.extruderTempMin) || 205,
      extruderTempMax: Number(materialForm.extruderTempMax) || 225,
      bedTemp: Number(materialForm.bedTemp) || 60,
      colors: materialForm.colors || ['#1C1C1C', '#ffffff'],
      desc: materialForm.desc || 'Nhựa in 3D chất lượng cao.',
      recommendedFor: materialForm.recommendedFor || 'Đồ gá & linh kiện',
      inStock: materialForm.inStock ?? true,
      stockRollsCount: Number(materialForm.stockRollsCount) || 20
    };
    const updatedList = [...materials, newMat];
    onUpdateMaterials(updatedList);
    setIsNewMaterialOpen(false);
    onShowToast(isVi ? `Đã thêm vật liệu mới: "${newMat.name}"` : `Added new material "${newMat.name}"`);
    setMaterialForm({
      name: '',
      brand: 'eSUN / Bambu Lab',
      density: 1.24,
      strength: 'Cao',
      heatResistance: '60°C',
      flexibility: 'Thấp',
      costPerKg: 350000,
      pricePerGram: 900,
      unitPriceMultiplier: 1.0,
      spoolWeightGrams: 1000,
      extruderTempMin: 205,
      extruderTempMax: 225,
      bedTemp: 60,
      colors: ['#1C1C1C', '#ffffff', '#00687a'],
      desc: 'Nhựa in 3D kỹ thuật cao cho bề mặt mịn màng.',
      recommendedFor: 'Prototypes, đồ gá, vỏ hộp tiêu chuẩn',
      inStock: true,
      stockRollsCount: 25
    });
  };

  const handleSaveEditMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    const updatedList = materials.map(m => m.id === editingMaterial.id ? editingMaterial : m);
    onUpdateMaterials(updatedList);
    setEditingMaterial(null);
    onShowToast(isVi ? `Đã cập nhật vật liệu "${editingMaterial.name}"` : `Updated material "${editingMaterial.name}"`);
  };

  const handleDeleteMaterial = (id: string, name: string) => {
    if (materials.length <= 1) {
      onShowToast(isVi ? 'Cần duy trì tối thiểu 1 loại vật liệu!' : 'At least 1 material required!');
      return;
    }
    if (window.confirm(isVi ? `Xóa vật liệu "${name}"?` : `Delete material "${name}"?`)) {
      const updatedList = materials.filter(m => m.id !== id);
      onUpdateMaterials(updatedList);
      onShowToast(isVi ? `Đã xóa vật liệu "${name}"` : `Deleted material "${name}"`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#C5C6CD] p-5 sm:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#57DFFE]/20 text-[#00687A] font-tech text-[10px] font-bold rounded border border-[#57DFFE]/40 uppercase tracking-widest">
              MATERIALS & POLYMERS
            </span>
            <span className="text-xs text-[#545F73]">Danh mục nhựa in FDM & Resin SLA</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#091426] mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A]">layers</span>
            {isVi ? 'Quản Lý Nhựa In & Giá Vật Tư Theo Gram' : 'Materials Catalog & Polymer Pricing'}
          </h2>
          <p className="text-xs text-[#545F73] mt-0.5">
            Cấu hình khối lượng riêng (g/cm³), nhiệt độ in, giá nhập theo cuộn và đơn giá bán lẻ theo gram tính vào báo giá tự động.
          </p>
        </div>

        <button
          onClick={() => setIsNewMaterialOpen(true)}
          className="px-4 py-2.5 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          {isVi ? 'Thêm Loại Nhựa Mới' : 'Add New Material'}
        </button>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {materials.map((mat) => {
          const costPerGram = Math.round(mat.costPerKg / (mat.spoolWeightGrams || 1000));

          return (
            <div
              key={mat.id}
              className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#00687A]/60 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header with in-stock badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-[#545F73]">
                      {mat.brand || 'Bambu Lab'} • {mat.density} g/cm³
                    </span>
                    <h3 className="font-bold text-sm text-[#091426]">
                      {mat.name}
                    </h3>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                    (mat.stockRollsCount ?? 10) > 5
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {mat.stockRollsCount ?? 10} Cuộn
                  </span>
                </div>

                <p className="text-xs text-[#545F73] line-clamp-2">
                  {mat.desc}
                </p>

                {/* Specs Box */}
                <div className="bg-[#F8F9FF] p-3 rounded-lg border border-[#C5C6CD]/60 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Độ bền cơ học:</span>
                    <span className="font-tech font-bold text-[#091426]">{mat.strength}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Kháng nhiệt:</span>
                    <span className="font-tech font-bold text-[#091426]">{mat.heatResistance}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Nhiệt độ đùn / Bàn in:</span>
                    <span className="font-tech font-bold text-[#00687A]">
                      {mat.extruderTempMin}°C - {mat.extruderTempMax}°C / {mat.bedTemp}°C
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73]">Màu sắc sẵn có:</span>
                    <div className="flex items-center gap-1">
                      {mat.colors.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="w-3.5 h-3.5 rounded-full border border-slate-400"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pricing Box */}
                <div className="p-3 bg-[#FAFBFD] rounded-lg border border-[#CBD5E1] space-y-1 text-xs font-tech">
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73] font-sans">Giá vốn nhập cuộn 1kg:</span>
                    <span className="font-bold text-[#091426]">{mat.costPerKg.toLocaleString()} đ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#545F73] font-sans">Giá vốn / gram:</span>
                    <span className="font-bold text-amber-700">{costPerGram} đ/g</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#CBD5E1]">
                    <span className="text-[#091426] font-bold font-sans">Đơn giá bán ra (Báo giá):</span>
                    <span className="font-bold text-[#00687A] text-sm">{mat.pricePerGram.toLocaleString()} đ/g</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  onClick={() => setEditingMaterial({ ...mat })}
                  className="px-3 py-1.5 bg-white border border-[#C5C6CD] hover:border-[#00687A] text-[#091426] text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">edit</span>
                  {isVi ? 'Sửa' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                  className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">delete</span>
                  {isVi ? 'Xóa' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-[#C5C6CD]">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="text-base font-bold text-[#091426]">
                {isVi ? 'Chỉnh Sửa Loại Nhựa In' : 'Edit Material'}
              </h3>
              <button onClick={() => setEditingMaterial(null)} className="p-1 text-[#545F73] hover:text-[#091426]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditMaterial} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Tên loại nhựa *</label>
                <input
                  type="text"
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                  className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Khối lượng riêng (g/cm³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMaterial.density}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, density: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Kháng nhiệt</label>
                  <input
                    type="text"
                    value={editingMaterial.heatResistance}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, heatResistance: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Giá vốn nhập cuộn (VNĐ/kg)</label>
                  <input
                    type="number"
                    value={editingMaterial.costPerKg}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, costPerKg: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Đơn giá bán ra (VNĐ/gram)</label>
                  <input
                    type="number"
                    value={editingMaterial.pricePerGram}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, pricePerGram: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold text-[#00687A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Extruder Min (°C)</label>
                  <input
                    type="number"
                    value={editingMaterial.extruderTempMin}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, extruderTempMin: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Extruder Max (°C)</label>
                  <input
                    type="number"
                    value={editingMaterial.extruderTempMax}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, extruderTempMax: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Bàn nhiệt Bed (°C)</label>
                  <input
                    type="number"
                    value={editingMaterial.bedTemp}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, bedTemp: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Tồn kho (Số cuộn)</label>
                <input
                  type="number"
                  value={editingMaterial.stockRollsCount ?? 10}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, stockRollsCount: Number(e.target.value) })}
                  className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#091426] font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white font-bold rounded-lg cursor-pointer"
                >
                  Lưu Loại Nhựa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Material Modal */}
      {isNewMaterialOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-[#C5C6CD]">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="text-base font-bold text-[#091426]">
                {isVi ? 'Thêm Loại Nhựa / Resin Mới' : 'Add Material'}
              </h3>
              <button onClick={() => setIsNewMaterialOpen(false)} className="p-1 text-[#545F73] hover:text-[#091426]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewMaterial} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Tên loại nhựa *</label>
                <input
                  type="text"
                  placeholder="VD: PETG-CF Carbon Fiber"
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                  className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Khối lượng riêng (g/cm³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.density}
                    onChange={(e) => setMaterialForm({ ...materialForm, density: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Kháng nhiệt</label>
                  <input
                    type="text"
                    value={materialForm.heatResistance}
                    onChange={(e) => setMaterialForm({ ...materialForm, heatResistance: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Giá vốn nhập cuộn (VNĐ/kg)</label>
                  <input
                    type="number"
                    value={materialForm.costPerKg}
                    onChange={(e) => setMaterialForm({ ...materialForm, costPerKg: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Đơn giá bán ra (VNĐ/gram)</label>
                  <input
                    type="number"
                    value={materialForm.pricePerGram}
                    onChange={(e) => setMaterialForm({ ...materialForm, pricePerGram: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold text-[#00687A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Extruder Min (°C)</label>
                  <input
                    type="number"
                    value={materialForm.extruderTempMin}
                    onChange={(e) => setMaterialForm({ ...materialForm, extruderTempMin: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Extruder Max (°C)</label>
                  <input
                    type="number"
                    value={materialForm.extruderTempMax}
                    onChange={(e) => setMaterialForm({ ...materialForm, extruderTempMax: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Bàn Bed (°C)</label>
                  <input
                    type="number"
                    value={materialForm.bedTemp}
                    onChange={(e) => setMaterialForm({ ...materialForm, bedTemp: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => setIsNewMaterialOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#091426] font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white font-bold rounded-lg cursor-pointer"
                >
                  Thêm Vào Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
