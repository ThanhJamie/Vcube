import React, { useState } from 'react';
import { MaterialProfile } from '../../types';
import { MATERIALS_CATALOG } from '../../data/mockData';

interface MaterialComparisonMatrixProps {
  materials?: MaterialProfile[];
  onSelectMaterial?: (materialId: string) => void;
  onNavigate?: (screen: string, payload?: any) => void;
  className?: string;
}

interface MaterialSpecComparison {
  id: string;
  name: string;
  category: 'FDM Standard' | 'FDM Engineering' | 'SLA Resin' | 'High Performance';
  tensileStrength: number; // 1-10
  heatResistanceTemp: number; // in °C
  surfaceFinish: number; // 1-10
  impactResistance: number; // 1-10
  chemicalResistance: number; // 1-10
  priceTier: '$' | '$$' | '$$$' | '$$$$';
  recommendedUse: string;
  limitations: string;
  colorHex: string;
}

const EXTENDED_COMPARISONS: MaterialSpecComparison[] = [
  {
    id: 'pla-tough',
    name: 'PLA Tough (PolyLite)',
    category: 'FDM Standard',
    tensileStrength: 7,
    heatResistanceTemp: 60,
    surfaceFinish: 7,
    impactResistance: 6,
    chemicalResistance: 4,
    priceTier: '$',
    recommendedUse: 'Mẫu thử nghiệm R&D, đồ gá, vỏ hộp tiêu chuẩn trong nhà, chi tiết mỹ thuật.',
    limitations: 'Không chịu được nhiệt độ cao trên 60°C hoặc ánh nắng chiếu trực tiếp lâu dài.',
    colorHex: '#00687A',
  },
  {
    id: 'petg-pro',
    name: 'PETG Pro V-Shield',
    category: 'FDM Standard',
    tensileStrength: 8,
    heatResistanceTemp: 80,
    surfaceFinish: 7.5,
    impactResistance: 8,
    chemicalResistance: 8,
    priceTier: '$$',
    recommendedUse: 'Chi tiết cơ khí chịu rung, phụ tùng ngoài trời, vỏ thiết bị điện, bình chứa nước.',
    limitations: 'Dễ bám tơ (stringing) nếu không sấy khô kỹ trước khi gia công.',
    colorHex: '#0E7490',
  },
  {
    id: 'abs-ind',
    name: 'ABS Industrial Plus',
    category: 'FDM Engineering',
    tensileStrength: 8.5,
    heatResistanceTemp: 100,
    surfaceFinish: 8,
    impactResistance: 9,
    chemicalResistance: 7,
    priceTier: '$$',
    recommendedUse: 'Linh kiện ô tô, xe máy, chi tiết trong khoang động cơ, vỏ máy sấy, đồ gá công nghiệp.',
    limitations: 'Yêu cầu lồng ủ nhiệt kín (Enclosure) và bàn nhiệt cao để tránh cong vênh mép.',
    colorHex: '#F59E0B',
  },
  {
    id: 'resin-8k',
    name: 'Resin 8K High-Precision',
    category: 'SLA Resin',
    tensileStrength: 6.5,
    heatResistanceTemp: 55,
    surfaceFinish: 10,
    impactResistance: 4,
    chemicalResistance: 5,
    priceTier: '$$$',
    recommendedUse: 'Tượng sưu tầm, mô hình kiến trúc siêu nét, trang sức nha khoa, bề mặt không thấy vân sọc.',
    limitations: 'Độ giòn cao hơn sợi nhựa nhiệt dẻo, cần xử lý cồn IPA và sấy UV kỹ càng.',
    colorHex: '#8B5CF6',
  },
  {
    id: 'tpu-flex',
    name: 'TPU 95A Flexible',
    category: 'FDM Engineering',
    tensileStrength: 6,
    heatResistanceTemp: 75,
    surfaceFinish: 6.5,
    impactResistance: 10,
    chemicalResistance: 8.5,
    priceTier: '$$$',
    recommendedUse: 'Gioăng đệm làm kín, chân đế chống rung, bánh lốp robot, ốp lưng chống sốc.',
    limitations: 'Tốc độ in chậm hơn (30-60mm/s), khó in các chi tiết có cấu trúc treo dài.',
    colorHex: '#10B981',
  },
  {
    id: 'pa-cf',
    name: 'PA-CF (Nylon Carbon Fiber)',
    category: 'High Performance',
    tensileStrength: 9.8,
    heatResistanceTemp: 155,
    surfaceFinish: 9,
    impactResistance: 9.5,
    chemicalResistance: 9.5,
    priceTier: '$$$$',
    recommendedUse: 'Thay thế chi tiết kim loại nhôm CNC, drone bay tốc độ cao, tay kẹp robot công nghiệp nặng.',
    limitations: 'Chi phí phôi cao, đòi hỏi đầu phun thép cứng Hardened Steel chống mài mòn.',
    colorHex: '#1E293B',
  },
];

export const MaterialComparisonMatrix: React.FC<MaterialComparisonMatrixProps> = ({
  materials = MATERIALS_CATALOG,
  onSelectMaterial,
  onNavigate,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeHighlightId, setActiveHighlightId] = useState<string>('pla-tough');

  const filteredMaterials = selectedCategory === 'all'
    ? EXTENDED_COMPARISONS
    : EXTENDED_COMPARISONS.filter((m) => m.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  const activeMaterial = EXTENDED_COMPARISONS.find((m) => m.id === activeHighlightId) || EXTENDED_COMPARISONS[0];

  const handleChooseForQuote = (matId: string) => {
    if (onSelectMaterial) {
      onSelectMaterial(matId);
    }
    if (onNavigate) {
      onNavigate('quote', { materialId: matId });
    }
  };

  return (
    <div className={`bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm ${className}`}>
      {/* Header & Categories Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#00687A]/10 text-[#00687A] text-[11px] font-mono font-bold uppercase tracking-wider mb-1.5">
            <span className="material-symbols-outlined text-xs">science</span>
            <span>Ma Trận Vật Liệu Chế Tác ISO/ASTM</span>
          </div>
          <h2 className="text-xl font-black text-[#091426] tracking-tight">
            So Sánh Kỹ Thuật: PLA, PETG, ABS, Resin 8K & Carbon Fiber
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Đánh giá định lượng về cơ tính, chịu nhiệt, độ bóng và chi phí để chọn vật liệu tối ưu cho đơn hàng của bạn.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-[#F1F5F9] p-1 rounded-xl">
          {[
            { id: 'all', label: 'Tất Cả (6)' },
            { id: 'standard', label: 'Tiêu Chuẩn' },
            { id: 'engineering', label: 'Kỹ Thuật' },
            { id: 'resin', label: 'Resin Siêu Nét' },
            { id: 'performance', label: 'Cao Cấp CF' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-white text-[#00687A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#091426]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
        {/* Table Overview (8 cols) */}
        <div className="lg:col-span-8 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#CBD5E1] text-[11px] font-mono text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-3">Vật Liệu</th>
                <th className="py-3 px-2 text-center">Độ Bền Kéo</th>
                <th className="py-3 px-2 text-center">Chịu Nhiệt</th>
                <th className="py-3 px-2 text-center">Độ Mịn Mặt</th>
                <th className="py-3 px-2 text-center">Chống Va Đập</th>
                <th className="py-3 px-2 text-center">Giá</th>
                <th className="py-3 px-3 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredMaterials.map((mat) => {
                const isSelected = mat.id === activeHighlightId;
                return (
                  <tr
                    key={mat.id}
                    onClick={() => setActiveHighlightId(mat.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#00687A]/5 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: mat.colorHex }}
                        />
                        <div>
                          <div className="font-bold text-[#091426]">{mat.name}</div>
                          <span className="text-[10px] text-[#64748B] font-mono uppercase">{mat.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* Tensile Strength */}
                    <td className="py-3.5 px-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="font-mono font-bold text-[#091426]">{mat.tensileStrength}</span>
                        <span className="text-[10px] text-[#94A3B8]">/10</span>
                      </div>
                    </td>

                    {/* Heat Deflection Temp */}
                    <td className="py-3.5 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                        mat.heatResistanceTemp >= 100
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : mat.heatResistanceTemp >= 75
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-[#475569]'
                      }`}>
                        {mat.heatResistanceTemp}°C
                      </span>
                    </td>

                    {/* Surface Finish */}
                    <td className="py-3.5 px-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="font-mono font-bold text-[#091426]">{mat.surfaceFinish}</span>
                        <span className="text-[10px] text-[#94A3B8]">/10</span>
                      </div>
                    </td>

                    {/* Impact Resistance */}
                    <td className="py-3.5 px-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="font-mono font-bold text-[#091426]">{mat.impactResistance}</span>
                        <span className="text-[10px] text-[#94A3B8]">/10</span>
                      </div>
                    </td>

                    {/* Price Tier */}
                    <td className="py-3.5 px-2 text-center font-mono font-bold text-[#00687A]">
                      {mat.priceTier}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChooseForQuote(mat.id);
                        }}
                        className="px-2.5 py-1 bg-[#00687A] hover:bg-[#005260] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Báo Giá
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Material Deep-Dive Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 bg-white border border-[#CBD5E1] text-[10px] font-mono font-bold text-[#00687A] rounded-md uppercase">
                {activeMaterial.category}
              </span>
              <span className="text-xs font-mono font-bold text-[#64748B]">Mức Giá: {activeMaterial.priceTier}</span>
            </div>

            <h3 className="text-base font-black text-[#091426] mt-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeMaterial.colorHex }} />
              {activeMaterial.name}
            </h3>

            {/* Visual Spec Bars */}
            <div className="space-y-2.5 mt-4 text-[11px]">
              <div>
                <div className="flex justify-between text-[#475569] mb-1">
                  <span>Độ Bền Kéo & Chịu Lực</span>
                  <span className="font-mono font-bold text-[#091426]">{activeMaterial.tensileStrength} / 10</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00687A] rounded-full transition-all"
                    style={{ width: `${activeMaterial.tensileStrength * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#475569] mb-1">
                  <span>Độ Mịn Bề Mặt (Layer Resolution)</span>
                  <span className="font-mono font-bold text-[#091426]">{activeMaterial.surfaceFinish} / 10</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all"
                    style={{ width: `${activeMaterial.surfaceFinish * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#475569] mb-1">
                  <span>Khả Năng Chống Va Đập</span>
                  <span className="font-mono font-bold text-[#091426]">{activeMaterial.impactResistance} / 10</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${activeMaterial.impactResistance * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#475569] mb-1">
                  <span>Nhiệt Độ Chịu Biến Dạng (HDT)</span>
                  <span className="font-mono font-bold text-[#091426]">{activeMaterial.heatResistanceTemp}°C</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((activeMaterial.heatResistanceTemp / 160) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#475569] mb-1">
                  <span>Khung Giá Phôi & Gia Công</span>
                  <span className="font-mono font-bold text-[#00687A]">{activeMaterial.priceTier}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00687A] rounded-full transition-all"
                    style={{
                      width: activeMaterial.priceTier === '$' ? '25%' : activeMaterial.priceTier === '$$' ? '50%' : activeMaterial.priceTier === '$$$' ? '75%' : '100%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Best For & Caveats */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="p-2.5 bg-white border border-[#CBD5E1] rounded-lg">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 block mb-0.5">
                  ✓ Ứng Dụng Tối Ưu:
                </span>
                <p className="text-[#334155] leading-relaxed">{activeMaterial.recommendedUse}</p>
              </div>

              <div className="p-2.5 bg-white border border-[#CBD5E1] rounded-lg">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-700 block mb-0.5">
                  ⚠ Giới Hạn Kỹ Thuật:
                </span>
                <p className="text-[#334155] leading-relaxed">{activeMaterial.limitations}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleChooseForQuote(activeMaterial.id)}
            className="w-full py-2.5 bg-[#00687A] hover:bg-[#005260] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">precision_manufacturing</span>
            <span>Chọn {activeMaterial.name} Báo Giá</span>
          </button>
        </div>
      </div>
    </div>
  );
};

