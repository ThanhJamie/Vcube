import React from 'react';
import { ModelPart, SlicerPresetInfo, PlateInfo } from '../../types';

interface ObjectTreePanelProps {
  parts: ModelPart[];
  format: string;
  slicerPreset?: SlicerPresetInfo;
  selectedPartId?: string | null;
  onSelectPart?: (partId: string | null) => void;
  onToggleVisibility: (partId: string) => void;
  onChangeColor: (partId: string, colorHex: string, colorName: string) => void;
  onChangeExtruder: (partId: string, extruderIdx: number) => void;
  onChangeMaterial?: (partId: string, materialId: string) => void;
  onSplitComponents?: () => void;
  plates?: PlateInfo[];
  activePlateIndex?: number;
  onSelectPlate?: (plateIndex: number) => void;
  onChangePartPlate?: (partId: string, plateIndex: number) => void;
}

const AVAILABLE_PALETTE = [
  { name: 'Xanh Teal Công Nghiệp', hex: '#00687a' },
  { name: 'Cam Cảnh Báo Cơ Khí', hex: '#ea580c' },
  { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C' },
  { name: 'Trắng Sứ Mịn', hex: '#ffffff' },
  { name: 'Xám Titan Pro', hex: '#64748b' },
  { name: 'Đỏ Cơ Tính', hex: '#dc2626' },
  { name: 'Xanh Lá Neon', hex: '#10b981' },
  { name: 'Vàng Cảnh Báo', hex: '#f59e0b' },
  { name: 'Tím Polyamide', hex: '#7c3aed' }
];

const AVAILABLE_MATERIALS = [
  { id: 'petg-pro', name: 'PETG Chịu Lực (Bền Nhiệt 75°C)', tech: 'FDM' },
  { id: 'pla-tough', name: 'PLA Tough / PLA-CF Gia Cường', tech: 'FDM' },
  { id: 'pla-basic', name: 'PLA Kỹ Thuật Standard (Eco)', tech: 'FDM' },
  { id: 'abs-engineering', name: 'ABS Chịu Nhiệt Cao (85°C)', tech: 'FDM' },
  { id: 'tpu-flexible', name: 'TPU 95A Đàn Hồi Cao Su', tech: 'FDM' },
  { id: 'pa-cf-carbon', name: 'Nylon PA12-CF Sợi Carbon Siêu Cứng', tech: 'FDM/SLS' },
  { id: 'sla-tough-resin', name: 'Resin Tough 2000 Chi Tiết Cao', tech: 'SLA' }
];

export const ObjectTreePanel: React.FC<ObjectTreePanelProps> = ({
  parts,
  format,
  slicerPreset,
  selectedPartId,
  onSelectPart,
  onToggleVisibility,
  onChangeColor,
  onChangeExtruder,
  onChangeMaterial,
  onSplitComponents,
  plates = [],
  activePlateIndex = 0,
  onSelectPlate,
  onChangePartPlate
}) => {
  // Count unique active extruders for multi-material tool swaps
  const activeExtruders = new Set(parts.map(p => p.extruderIndex)).size;
  const isMultiColor = activeExtruders > 1;

  // Extract unique colors in the model
  const uniqueColors = Array.from(new Set(parts.map(p => p.colorHex)));

  // Combine default palette with 3MF preset palettes
  const presetPalettes = slicerPreset?.palettes || [];
  const displayPaletteList = [
    ...presetPalettes.map(p => ({ name: p.name, hex: p.colorHex })),
    ...AVAILABLE_PALETTE.filter(p => !presetPalettes.some(preset => preset.colorHex.toLowerCase() === p.hex.toLowerCase()))
  ];

  return (
    <div className="bg-white border border-black/10 p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <div>
          <span className="font-sans text-[9px] uppercase tracking-widest text-[#7D7565] font-bold block">
            Cấu Trúc Khối 3D // Component Hierarchy & Material
          </span>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#1C1C1C] flex items-center gap-2 mt-0.5">
            <span className="material-symbols-outlined text-base text-[#00687a]">account_tree</span>
            Cây Đối Tượng ({parts.length} Part{parts.length > 1 ? 's' : ''})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {onSplitComponents && (
            <button
              type="button"
              onClick={onSplitComponents}
              title="Tách các thành phần rời rạc thành từng Body độc lập (Split Connected Components)"
              className="px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wider bg-[#F7F6F2] hover:bg-[#EAE8E0] border border-black/15 text-[#1C1C1C] rounded transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs text-[#00687a]">call_split</span>
              Tách Shells
            </button>
          )}

          <span className={`px-2 py-0.5 text-[9px] font-tech uppercase tracking-wider font-bold rounded ${
            format === '3MF' ? 'bg-[#00687a] text-white' : 'bg-[#EAE8E0] text-[#5A554C]'
          }`}>
            {format === '3MF' ? '3MF Multi-Body Standard' : `${format} Body`}
          </span>
        </div>
      </div>

      {/* Detected Materials / Color Palette Bar */}
      <div className="bg-[#FAF9F5] p-3 rounded border border-black/5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#5A554C] flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-[#00687a]">palette</span>
            Màu & Vật Liệu Trong File:
          </span>
          <div className="flex items-center gap-1.5">
            {uniqueColors.map((hex, i) => (
              <span
                key={i}
                style={{ backgroundColor: hex }}
                className="w-4 h-4 rounded-full border border-black/20 inline-block shadow-xs"
                title={`Màu HEX: ${hex}`}
              />
            ))}
          </div>
        </div>
        <span className="font-tech text-[10px] text-[#7D7565]">
          {activeExtruders} Đầu Đùn / Kênh AMS Hoạt Động
        </span>
      </div>

      {/* Parts List Tree */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {parts.map((part, index) => {
          const isSelected = selectedPartId === part.id;

          return (
            <div
              key={part.id}
              onClick={() => onSelectPart && onSelectPart(isSelected ? null : part.id)}
              className={`p-3.5 border rounded-lg transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#00687a] bg-cyan-50/40 ring-1 ring-[#00687a]/40 shadow-xs'
                  : part.visible
                  ? 'border-black/10 bg-white hover:border-black/25'
                  : 'border-dashed border-black/10 bg-slate-50 opacity-60'
              }`}
            >
              {/* Row 1: Visibility, Name & Extruder */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 truncate">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(part.id);
                    }}
                    title={part.visible ? 'Ẩn chi tiết này trên 3D Viewport' : 'Hiện chi tiết này'}
                    className="p-1 hover:bg-black/10 text-[#5A554C] hover:text-[#1C1C1C] rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">
                      {part.visible ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>

                  <span className={`font-bold text-xs truncate ${isSelected ? 'text-[#00687a]' : 'text-[#1C1C1C]'}`}>
                    {index + 1}. {part.name}
                  </span>
                </div>

                {/* Extruder & Plate Assignment */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {plates && plates.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#7D7565] font-sans">Bàn:</span>
                      <select
                        value={part.plateIndex || 1}
                        onChange={(e) => onChangePartPlate && onChangePartPlate(part.id, Number(e.target.value))}
                        className="bg-white border border-cyan-700/40 text-[11px] font-tech font-bold text-[#00687a] px-1.5 py-0.5 rounded focus:outline-none focus:border-[#00687a]"
                        title="Chuyển chi tiết này sang Bàn in khác"
                      >
                        {plates.map((pl) => (
                          <option key={pl.index} value={pl.index}>
                            Bàn {pl.index}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#7D7565] font-sans">Đầu đùn:</span>
                    <select
                      value={part.extruderIndex}
                      onChange={(e) => onChangeExtruder(part.id, Number(e.target.value))}
                      className="bg-white border border-black/20 text-[11px] font-tech font-bold px-1.5 py-0.5 rounded focus:outline-none focus:border-[#00687a]"
                    >
                      <option value={1}>Tool T1</option>
                      <option value={2}>Tool T2</option>
                      <option value={3}>Tool T3</option>
                      <option value={4}>Tool T4</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Material Selection per Part */}
              <div className="mb-2.5 pt-2 border-t border-black/5 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] font-sans text-[#7D7565] shrink-0">Vật liệu:</span>
                <select
                  value={part.materialId || 'petg-pro'}
                  onChange={(e) => onChangeMaterial && onChangeMaterial(part.id, e.target.value)}
                  className="bg-[#F7F6F2] border border-black/15 text-[11px] font-sans text-[#1C1C1C] py-1 px-2 rounded w-full max-w-[240px] focus:outline-none focus:border-[#00687a]"
                >
                  {AVAILABLE_MATERIALS.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name} ({mat.tech})
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Part stats & color swatches */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5 text-[11px]" onClick={(e) => e.stopPropagation()}>
                <div className="font-tech text-[#7D7565] flex items-center gap-2">
                  <span>{part.triangleCount.toLocaleString()} tam giác</span>
                  <span>•</span>
                  <span>{part.volumeCm3.toFixed(1)} cm³</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#5A554C] font-sans">Màu:</span>
                  <div className="flex items-center gap-1">
                    {displayPaletteList.slice(0, 8).map((pal) => (
                      <button
                        key={pal.hex}
                        type="button"
                        onClick={() => onChangeColor(part.id, pal.hex, pal.name)}
                        title={pal.name}
                        style={{ backgroundColor: pal.hex }}
                        className={`w-4 h-4 rounded-full border transition-transform ${
                          part.colorHex.toLowerCase() === pal.hex.toLowerCase()
                            ? 'border-[#00687a] scale-125 ring-2 ring-[#00687a]/30'
                            : 'border-black/20 hover:scale-110'
                        }`}
                      />
                    ))}
                    {/* Custom Hex Color Picker Input */}
                    <label className="relative cursor-pointer w-4 h-4 rounded-full border border-black/30 overflow-hidden inline-block" title="Chọn màu tùy chỉnh">
                      <input
                        type="color"
                        value={part.colorHex}
                        onChange={(e) => onChangeColor(part.id, e.target.value, `Màu Custom (${e.target.value})`)}
                        className="absolute -top-2 -left-2 w-8 h-8 opacity-0 cursor-pointer"
                      />
                      <span className="block w-full h-full" style={{ backgroundColor: part.colorHex }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-material Purge & Tool Swap Estimation Notice */}
      {isMultiColor && (
        <div className="bg-[#FFF8E6] border border-amber-300 p-3.5 rounded text-xs space-y-1.5 text-[#664D03]">
          <div className="font-bold flex items-center gap-1 text-amber-900">
            <span className="material-symbols-outlined text-sm">palette</span>
            Phát Hiện In Đa Màu (Multi-Material AMS / MMU)
          </div>
          <p className="text-[11px] leading-relaxed text-[#7A5B00]">
            Mô hình đang sử dụng <strong>{activeExtruders} màu/đầu đùn</strong> độc lập. Hệ thống sẽ tự động tính toán tháp súc nhựa (Purge Tower) và thời gian tráo sợi nhựa vào bảng dự toán chi phí.
          </p>
        </div>
      )}
    </div>
  );
};
