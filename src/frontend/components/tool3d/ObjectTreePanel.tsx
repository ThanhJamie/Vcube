import React from 'react';
import { ModelPart, SlicerPresetInfo, PlateInfo } from '../../types';
import { Icon } from '@frontend/ui';

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
  // D9 (Đợt 10): KHÔNG còn prop xử lý tách-khối. Nút đã bị bỏ vì bộ đọc chưa có phân tích thành
  // phần rời rạc (MP-09 — hàm cũ từng bịa 2 chi tiết; xem `docs/plans/22-backlog-and-decisions.md`).
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
    <div className="bg-surface rounded-lg p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line-subtle pb-3">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-fg-muted font-bold block">
            Cấu Trúc Khối 3D // Component Hierarchy & Material
          </span>
          <h3 className="font-bold text-sm sm:text-base text-fg flex items-center gap-2 mt-0.5">
            <Icon name="account_tree" size={18} className="text-primary" />
            Cây Đối Tượng ({parts.length} Part{parts.length > 1 ? 's' : ''})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-tech uppercase tracking-wider font-bold rounded-sm ${
            format === '3MF' ? 'bg-primary text-primary-fg' : 'bg-line-subtle text-fg-muted'
          }`}>
            {format === '3MF' ? '3MF Multi-Body Standard' : `${format} Body`}
          </span>
        </div>
      </div>

      {/* Detected Materials / Color Palette Bar */}
      <div className="bg-surface-muted p-3 rounded-sm flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-fg-muted flex items-center gap-1">
            <Icon name="palette" size={18} className="text-primary" />
            Màu & Vật Liệu Trong File:
          </span>
          <div className="flex items-center gap-1.5">
            {uniqueColors.map((hex, i) => (
              <span
                key={i}
                style={{ backgroundColor: hex }}
                className="w-4 h-4 rounded-full border border-line-control inline-block shadow-e1"
                title={`Màu HEX: ${hex}`}
              />
            ))}
          </div>
        </div>
        <span className="font-tech text-xs text-fg-muted">
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
              className={`p-3.5 rounded-lg transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary-tint ring-1 ring-primary/40 shadow-e1'
                  : part.visible
                  ? 'bg-surface-muted hover:bg-line-subtle'
                  : 'bg-canvas opacity-60'
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
                    className="p-1 hover:bg-surface-muted text-fg-muted hover:text-fg rounded-full transition-colors"
                  >
                    <Icon name={part.visible ? 'visibility' : 'visibility_off'} size={18} />
                  </button>

                  <span className={`font-bold text-xs truncate ${isSelected ? 'text-primary' : 'text-fg'}`}>
                    {index + 1}. {part.name}
                  </span>
                </div>

                {/* Extruder & Plate Assignment */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {plates && plates.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-fg-muted font-sans">Bàn:</span>
                      <select
                        value={part.plateIndex || 1}
                        onChange={(e) => onChangePartPlate && onChangePartPlate(part.id, Number(e.target.value))}
                        className="bg-surface border border-line-control text-xs font-tech font-bold text-primary px-1.5 py-0.5 rounded-sm focus:outline-none focus:border-primary"
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
                    <span className="text-xs text-fg-muted font-sans">Đầu đùn:</span>
                    <select
                      value={part.extruderIndex}
                      onChange={(e) => onChangeExtruder(part.id, Number(e.target.value))}
                      className="bg-surface border border-line-control text-xs font-tech font-bold px-1.5 py-0.5 rounded-sm focus:outline-none focus:border-primary"
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
              <div className="mb-2.5 pt-2 border-t border-line-subtle flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-sans text-fg-muted shrink-0">Vật liệu:</span>
                <select
                  value={part.materialId || 'petg-pro'}
                  onChange={(e) => onChangeMaterial && onChangeMaterial(part.id, e.target.value)}
                  className="bg-surface-muted border border-line-control text-xs font-sans text-fg py-1 px-2 rounded-sm w-full max-w-[240px] focus:outline-none focus:border-primary"
                >
                  {AVAILABLE_MATERIALS.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name} ({mat.tech})
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Part stats & color swatches */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line-subtle text-xs" onClick={(e) => e.stopPropagation()}>
                <div className="font-tech text-fg-muted flex items-center gap-2">
                  <span>{part.triangleCount.toLocaleString()} tam giác</span>
                  <span>•</span>
                  <span>{part.volumeCm3.toFixed(1)} cm³</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-fg-muted font-sans">Màu:</span>
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
                            ? 'border-primary scale-125 ring-2 ring-primary/30'
                            : 'border-line-control hover:scale-110'
                        }`}
                      />
                    ))}
                    {/* Custom Hex Color Picker Input */}
                    <label className="relative cursor-pointer w-4 h-4 rounded-full border border-line-control overflow-hidden inline-block" title="Chọn màu tùy chỉnh">
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
        <div className="bg-warning/10 border border-warning/40 p-3.5 rounded-sm text-xs space-y-1.5 text-warning">
          <div className="font-bold flex items-center gap-1 text-warning">
            <Icon name="palette" size={18} />
            Phát Hiện In Đa Màu (Multi-Material AMS / MMU)
          </div>
          <p className="text-xs leading-relaxed text-warning">
            Mô hình đang sử dụng <strong>{activeExtruders} màu/đầu đùn</strong> độc lập. Hệ thống sẽ tự động tính toán tháp súc nhựa (Purge Tower) và thời gian tráo sợi nhựa vào bảng dự toán chi phí.
          </p>
        </div>
      )}
    </div>
  );
};
