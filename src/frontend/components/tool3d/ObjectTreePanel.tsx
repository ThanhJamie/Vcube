import React from 'react';
import { ModelPart, SlicerPresetInfo, PlateInfo, MaterialProfile } from '../../types';
import { EmptyState, Icon } from '@frontend/ui';
import { EMPTY_VALUE, formatNumber, formatWeight } from '@frontend/lib/format';

/**
 * F7 — đổi số giây của slicer thành nhãn giờ/phút. Giá trị thiếu/0/âm/NaN ⇒ `—`
 * (KHÔNG bịa "0 phút"). Ưu tiên `predictionFormatted` sẵn có từ chính tệp khi hiển thị.
 */
const formatSeconds = (seconds: number | null | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return EMPTY_VALUE;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  return `${minutes} phút`;
};

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
  /** Danh sách vật liệu THẬT từ bảng `materials` (DB) — không dùng danh mục hardcode. */
  materials?: MaterialProfile[];
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
  materials = [],
  plates = [],
  activePlateIndex = 0,
  onSelectPlate,
  onChangePartPlate
}) => {
  // Count unique active extruders for multi-material tool swaps.
  // F2 (P3): `extruderIndex` có thể `undefined` (tệp không khai đầu đùn) — chỉ đếm số THẬT,
  // không gộp `undefined` thành "1 đầu đùn" giả.
  const activeExtruders = new Set(
    parts
      .map(p => p.extruderIndex)
      .filter((idx): idx is number => typeof idx === 'number' && Number.isFinite(idx) && idx > 0)
  ).size;
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
            {uniqueColors.map((hex) => (
              <span
                key={hex}
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

      {/* F7 — Gram / thời gian in theo từng bàn, CHỈ khi tệp thật sự kèm dữ liệu slicer.
          Tệp không có bàn in thì nói thẳng, không dựng số theo bàn. */}
      <div className="bg-surface-muted p-3 rounded-sm space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-fg-muted flex items-center gap-1">
            <Icon name="layers" size={18} className="text-primary" />
            Dữ liệu bàn in (Slicer):
          </span>
          {plates.length > 0 && (
            <span className="font-tech text-xs text-fg-muted">{plates.length} bàn</span>
          )}
        </div>

        {plates.length === 0 ? (
          <p className="text-xs text-fg-muted flex items-start gap-1.5 leading-relaxed">
            <Icon name="info" size={16} className="text-fg-muted shrink-0 mt-0.5" />
            Tệp không kèm dữ liệu bàn in (slicer). Hệ thống không hiển thị gram/giờ theo bàn vì tệp không có số đo nào.
          </p>
        ) : (
          <div className="space-y-1.5">
            {plates.map((plate) => {
              const isActive = activePlateIndex === plate.index;
              return (
                <div
                  key={plate.index}
                  className="flex flex-wrap items-center justify-between gap-2 bg-surface border border-line-subtle rounded-sm px-2.5 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => onSelectPlate && onSelectPlate(plate.index)}
                    disabled={!onSelectPlate}
                    className={`text-xs font-tech font-bold px-1.5 py-0.5 rounded-sm transition-colors ${
                      isActive ? 'bg-primary text-primary-fg' : 'text-fg hover:text-primary'
                    } disabled:cursor-default`}
                    aria-pressed={isActive}
                  >
                    Bàn {plate.index}
                  </button>
                  <div className="flex items-center gap-3 font-tech text-xs text-fg">
                    <span className="flex items-center gap-1" title="Khối lượng nhựa của bàn (từ tệp)">
                      <Icon name="inventory_2" size={14} className="text-fg-muted" />
                      {formatWeight(plate.filamentGrams)}
                    </span>
                    <span className="flex items-center gap-1" title="Thời gian in của bàn (từ tệp)">
                      <Icon name="schedule" size={14} className="text-fg-muted" />
                      {plate.predictionFormatted || formatSeconds(plate.predictionSeconds)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Parts List Tree */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {parts.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Icon name="account_tree" size={20} />}
            title="Chưa có chi tiết nào để gán"
            description="Tệp chưa tách được khối rời, hoặc đang phân tích. Khi bộ đọc nhận diện được các chi tiết, chúng sẽ hiện ở đây để gán vật liệu, đầu đùn và bàn in."
          />
        ) : (
          parts.map((part, index) => {
          const isSelected = selectedPartId === part.id;

          return (
            <div
              key={part.id}
              onClick={() => onSelectPart && onSelectPart(isSelected ? null : part.id)}
              className={`p-3.5 rounded-lg transition-colors cursor-pointer ${
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
                    aria-label={part.visible ? 'Ẩn chi tiết này' : 'Hiện chi tiết này'}
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
                        value={part.plateIndex ?? ''}
                        onChange={(e) => onChangePartPlate && onChangePartPlate(part.id, Number(e.target.value))}
                        aria-label={`Chọn bàn in cho ${part.name}`}
                        className="bg-surface border border-line-control text-xs font-tech font-bold text-primary px-1.5 py-0.5 rounded-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                        title="Chuyển chi tiết này sang Bàn in khác"
                      >
                        {/* F2 (P2): tệp không khai chi tiết thuộc bàn nào ⇒ "Chưa khai", không ngầm gán Bàn 1. */}
                        {part.plateIndex == null && (
                          <option value="" disabled>Chưa khai</option>
                        )}
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
                      value={part.extruderIndex ?? ''}
                      onChange={(e) => onChangeExtruder(part.id, Number(e.target.value))}
                      aria-label={`Chọn đầu đùn cho ${part.name}`}
                      className="bg-surface border border-line-control text-xs font-tech font-bold px-1.5 py-0.5 rounded-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* F2 (P3): tệp không khai đầu đùn ⇒ hiện "Chưa khai", KHÔNG ngầm chọn T1. */}
                      {part.extruderIndex == null && (
                        <option value="" disabled>Chưa khai</option>
                      )}
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
                  value={part.materialId || ''}
                  disabled={materials.length === 0}
                  onChange={(e) => onChangeMaterial && onChangeMaterial(part.id, e.target.value)}
                  aria-label={`Chọn vật liệu cho ${part.name}`}
                  className="bg-surface-muted border border-line-control text-xs font-sans text-fg py-1 px-2 rounded-sm w-full max-w-[240px] focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {materials.length === 0 ? (
                    <option value="">Chưa có vật liệu trong DB</option>
                  ) : (
                    <>
                      <option value="" disabled>Chọn vật liệu</option>
                      {materials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.brand ? `${mat.name} · ${mat.brand}` : mat.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Row 3: Part stats & color swatches */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line-subtle text-xs" onClick={(e) => e.stopPropagation()}>
                <div className="font-tech text-fg-muted flex items-center gap-2">
                  <span>{formatNumber(part.triangleCount)} tam giác</span>
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
                        aria-label={`Đặt màu ${pal.name}`}
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
                        aria-label={`Chọn màu tùy chỉnh cho ${part.name}`}
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
          })
        )}
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
