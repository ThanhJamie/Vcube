import React, { useState } from 'react';
import { MaterialProfile } from '../../types';
import { MATERIALS_CATALOG } from '../../data/mockData';
import { Icon } from '@frontend/ui';

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
    <div className={`bg-surface rounded-lg p-6 shadow-e1 ${className}`}>
      {/* Header & Categories Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line-subtle pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
            <Icon name="science" size={18} />
            <span>Ma Trận Vật Liệu Chế Tác</span>
          </div>
          <h2 className="text-xl font-black text-fg tracking-tight">
            So Sánh Kỹ Thuật: PLA, PETG, ABS, Resin 8K & Carbon Fiber
          </h2>
          <p className="text-xs text-fg-subtle mt-0.5">
            Đánh giá định lượng về cơ tính, chịu nhiệt, độ bóng và chi phí để chọn vật liệu tối ưu cho đơn hàng của bạn.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-line-subtle p-1 rounded-md">
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
              className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-surface text-primary shadow-e1'
                  : 'text-fg-muted hover:text-fg'
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
              <tr className="border-b border-line text-xs font-mono text-fg-subtle uppercase tracking-wider">
                <th className="py-3 px-3">Vật Liệu</th>
                <th className="py-3 px-2 text-center">Độ Bền Kéo</th>
                <th className="py-3 px-2 text-center">Chịu Nhiệt</th>
                <th className="py-3 px-2 text-center">Độ Mịn Mặt</th>
                <th className="py-3 px-2 text-center">Chống Va Đập</th>
                <th className="py-3 px-2 text-center">Giá</th>
                <th className="py-3 px-3 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filteredMaterials.map((mat) => {
                const isSelected = mat.id === activeHighlightId;
                return (
                  <tr
                    key={mat.id}
                    onClick={() => setActiveHighlightId(mat.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5 font-medium' : 'hover:bg-canvas'
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-line-control shrink-0"
                          style={{ backgroundColor: mat.colorHex }}
                        />
                        <div>
                          <div className="font-bold text-fg">{mat.name}</div>
                          <span className="text-xs text-fg-muted font-mono uppercase">{mat.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* Tensile Strength */}
                    <td className="py-3.5 px-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="font-mono font-bold text-fg">{mat.tensileStrength}</span>
                        <span className="text-xs text-fg-muted">/10</span>
                      </div>
                    </td>

                    {/* Heat Deflection Temp.
                        D-1 da lam nhat token `--color-warning-tint` (#FBF0E4 -> #FEF6EC, src/index.css) nen
                        `text-warning` tren `bg-warning-tint` nay dat 4.69:1 (light) / 9.49:1 (dark)
                        -> badge quay lai dung quy tac "nen tint + chu mau dac"; khong con can ban va cuc bo
                        bang `bg-surface-muted`. Luat nay duoc giu boi scripts/check-contrast-combos.mjs. */}
                    <td className="py-3.5 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-sm font-mono font-bold text-xs ${
                        mat.heatResistanceTemp >= 100
                          ? 'bg-danger-tint text-danger border border-danger/30'
                          : mat.heatResistanceTemp >= 75
                          ? 'bg-warning-tint text-warning border border-warning/30'
                          : 'bg-surface-muted text-fg-muted'
                      }`}>
                        {mat.heatResistanceTemp}°C
                      </span>
                    </td>

                    {/* Surface Finish */}
                    <td className="py-3.5 px-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="font-mono font-bold text-fg">{mat.surfaceFinish}</span>
                        <span className="text-xs text-fg-muted">/10</span>
                      </div>
                    </td>

                    {/* Impact Resistance */}
                    <td className="py-3.5 px-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="font-mono font-bold text-fg">{mat.impactResistance}</span>
                        <span className="text-xs text-fg-muted">/10</span>
                      </div>
                    </td>

                    {/* Price Tier */}
                    <td className="py-3.5 px-2 text-center font-mono font-bold text-primary">
                      {mat.priceTier}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChooseForQuote(mat.id);
                        }}
                        className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-full transition-colors cursor-pointer"
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
        <div className="lg:col-span-4 bg-canvas border border-line rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 bg-surface-muted border border-line-subtle text-xs font-mono font-bold text-primary rounded-sm uppercase">
                {activeMaterial.category}
              </span>
              <span className="text-xs font-mono font-bold text-fg-subtle">Mức Giá: {activeMaterial.priceTier}</span>
            </div>

            <h3 className="text-base font-black text-fg mt-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeMaterial.colorHex }} />
              {activeMaterial.name}
            </h3>

            {/* Visual Spec Bars */}
            <div className="space-y-2.5 mt-4 text-xs">
              <div>
                <div className="flex justify-between text-fg-muted mb-1">
                  <span>Độ Bền Kéo & Chịu Lực</span>
                  <span className="font-mono font-bold text-fg">{activeMaterial.tensileStrength} / 10</span>
                </div>
                <div className="h-1.5 w-full bg-line-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${activeMaterial.tensileStrength * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-fg-muted mb-1">
                  <span>Độ Mịn Bề Mặt (Layer Resolution)</span>
                  <span className="font-mono font-bold text-fg">{activeMaterial.surfaceFinish} / 10</span>
                </div>
                <div className="h-1.5 w-full bg-line-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-info rounded-full transition-all"
                    style={{ width: `${activeMaterial.surfaceFinish * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-fg-muted mb-1">
                  <span>Khả Năng Chống Va Đập</span>
                  <span className="font-mono font-bold text-fg">{activeMaterial.impactResistance} / 10</span>
                </div>
                <div className="h-1.5 w-full bg-line-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-positive rounded-full transition-all"
                    style={{ width: `${activeMaterial.impactResistance * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-fg-muted mb-1">
                  <span>Nhiệt Độ Chịu Biến Dạng (HDT)</span>
                  <span className="font-mono font-bold text-fg">{activeMaterial.heatResistanceTemp}°C</span>
                </div>
                <div className="h-1.5 w-full bg-line-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((activeMaterial.heatResistanceTemp / 160) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-fg-muted mb-1">
                  <span>Khung Giá Phôi & Gia Công</span>
                  <span className="font-mono font-bold text-primary">{activeMaterial.priceTier}</span>
                </div>
                <div className="h-1.5 w-full bg-line-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: activeMaterial.priceTier === '$' ? '25%' : activeMaterial.priceTier === '$$' ? '50%' : activeMaterial.priceTier === '$$$' ? '75%' : '100%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Best For & Caveats */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="p-2.5 bg-surface-muted rounded-lg">
                <span className="text-xs font-mono uppercase font-bold text-positive block mb-0.5">
                  ✓ Ứng Dụng Tối Ưu:
                </span>
                <p className="text-fg-muted leading-relaxed">{activeMaterial.recommendedUse}</p>
              </div>

              <div className="p-2.5 bg-surface-muted rounded-lg">
                <span className="text-xs font-mono uppercase font-bold text-warning block mb-0.5">
                  ⚠ Giới Hạn Kỹ Thuật:
                </span>
                <p className="text-fg-muted leading-relaxed">{activeMaterial.limitations}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleChooseForQuote(activeMaterial.id)}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow-e1 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="precision_manufacturing" size={18} />
            <span>Chọn {activeMaterial.name} Báo Giá</span>
          </button>
        </div>
      </div>
    </div>
  );
};

