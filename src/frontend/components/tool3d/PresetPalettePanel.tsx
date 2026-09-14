import React, { useState, useEffect } from 'react';
import { SlicerPresetInfo, ModelPart, FilamentPaletteItem } from '../../types';
import { Icon } from '@frontend/ui';

interface PresetPalettePanelProps {
  slicerPreset?: SlicerPresetInfo;
  parts: ModelPart[];
  selectedPartId?: string | null;
  onChangeColor: (partId: string, colorHex: string, colorName: string) => void;
  onBatchApplyPalette?: (paletteMap: { [partId: string]: string }) => void;
  format: string;
}

const PRESET_PALETTE_THEMES: { name: string; description: string; colors: { name: string; hex: string }[] }[] = [
  {
    name: 'Theme 1: Cyber Teal & Neon (Bambu Default)',
    description: 'Tone màu hiện đại, nổi bật cho mô hình cơ khí & art',
    colors: [
      { name: 'Xanh Cyan Kỹ Thuật', hex: '#00d2ff' },
      { name: 'Xanh Teal Đậm', hex: '#00687a' },
      { name: 'Cam Cảnh Báo', hex: '#ea580c' },
      { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C' }
    ]
  },
  {
    name: 'Theme 2: Dragon Fire / Ruby Red',
    description: 'Tone màu rực rỡ phong cách rồng / sinh vật huyền bí',
    colors: [
      { name: 'Đỏ Ruby Đậm', hex: '#dc2626' },
      { name: 'Cam Hỏa Diệm', hex: '#f97316' },
      { name: 'Vàng Hoàng Kim', hex: '#eab308' },
      { name: 'Đen Than Titan', hex: '#18181b' }
    ]
  },
  {
    name: 'Theme 3: Forest Jade & Gold',
    description: 'Phong cách rồng ngọc bích, thiên nhiên cao cấp',
    colors: [
      { name: 'Ngọc Bích Jade', hex: '#10b981' },
      { name: 'Xanh Rêu Đậm', hex: '#065f46' },
      { name: 'Vàng Ánh Kim', hex: '#f59e0b' },
      { name: 'Trắng Sứ Mịn', hex: '#f8fafc' }
    ]
  },
  {
    name: 'Theme 4: Stealth Obsidian & Silver',
    description: 'Màu kim loại công nghiệp xám titan và đen nhám',
    colors: [
      { name: 'Đen Huyền Bí', hex: '#0f172a' },
      { name: 'Xám Titan Pro', hex: '#475569' },
      { name: 'Bạc Kim Loại', hex: '#cbd5e1' },
      { name: 'Xanh Điện Tử', hex: '#38bdf8' }
    ]
  }
];

export const PresetPalettePanel: React.FC<PresetPalettePanelProps> = ({
  slicerPreset,
  parts,
  selectedPartId,
  onChangeColor,
  onBatchApplyPalette,
  format
}) => {
  // If no preset is present, construct info from parts
  const initialPalettes: FilamentPaletteItem[] = slicerPreset?.palettes && slicerPreset.palettes.length > 0
    ? slicerPreset.palettes
    // R4 (MP-13/MP-14, data-honesty): tep KHONG kem du lieu slicer thi KHONG duoc suy dien.
    // Bo han `vendor: 'Bambu Lab AMS'`, `density: 1.24`, `costPerKg: 350000` va hai phep nhan
    // `volumeCm3 x 1.24` / `x 0.4` — do la cac con so bia duoc trung nhu du lieu cua file.
    // Chi giu lai nhung gi doc duoc TU CHINH tep: slot, mau, ten mau, loai vat lieu.
    : parts.map((p, idx) => ({
        index: p.extruderIndex || idx + 1,
        colorHex: p.colorHex,
        name: p.color || `Màu Part ${idx + 1}`,
        materialType: p.materialId?.toUpperCase() || 'PLA/PETG'
      }));

  const [currentPalettes, setCurrentPalettes] = useState<FilamentPaletteItem[]>(initialPalettes);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  // Synchronize palettes when a new file or preset is loaded
  useEffect(() => {
    if (slicerPreset?.palettes && slicerPreset.palettes.length > 0) {
      setCurrentPalettes(slicerPreset.palettes);
    } else if (parts.length > 0) {
      setCurrentPalettes(
        // R4: xem ghi chu o `initialPalettes` — khong suy dien khoi luong / chieu dai / hang nhua.
        parts.map((p, idx) => ({
          index: p.extruderIndex || idx + 1,
          colorHex: p.colorHex,
          name: p.color || `Màu Part ${idx + 1}`,
          materialType: p.materialId?.toUpperCase() || 'PLA/PETG'
        }))
      );
    }
  }, [slicerPreset, parts]);

  const selectedPart = parts.find(p => p.id === selectedPartId);

  // Apply a whole theme palette across all parts
  const handleApplyTheme = (theme: typeof PRESET_PALETTE_THEMES[0]) => {
    parts.forEach((p, idx) => {
      const colorObj = theme.colors[idx % theme.colors.length];
      onChangeColor(p.id, colorObj.hex, colorObj.name);
    });

    // Update local palettes display
    setCurrentPalettes(prev =>
      prev.map((pal, idx) => {
        const c = theme.colors[idx % theme.colors.length];
        return {
          ...pal,
          colorHex: c ? c.hex : pal.colorHex,
          name: c ? c.name : pal.name
        };
      })
    );
  };

  // Swap palette color of slot A with slot B
  const handleSwapSlots = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= currentPalettes.length || toIdx >= currentPalettes.length) return;

    const newPalettes = [...currentPalettes];
    const temp = newPalettes[fromIdx];
    newPalettes[fromIdx] = { ...newPalettes[toIdx], index: fromIdx + 1 };
    newPalettes[toIdx] = { ...temp, index: toIdx + 1 };
    setCurrentPalettes(newPalettes);

    // Apply color swap across corresponding parts
    parts.forEach((p, pIdx) => {
      const slot = (pIdx % newPalettes.length);
      const chosenPal = newPalettes[slot];
      if (chosenPal) {
        onChangeColor(p.id, chosenPal.colorHex, chosenPal.name);
      }
    });
  };

  // Quick edit color of a palette slot
  const handleEditSlotColor = (slotIdx: number, newHex: string, newName?: string) => {
    const newPalettes = currentPalettes.map((pal, idx) => {
      if (idx === slotIdx) {
        return {
          ...pal,
          colorHex: newHex,
          name: newName || `Màu Tùy Chỉnh (${newHex})`
        };
      }
      return pal;
    });
    setCurrentPalettes(newPalettes);

    // Also update parts that match this slot or selected part
    if (selectedPartId) {
      onChangeColor(selectedPartId, newHex, newName || `Màu Slot ${slotIdx + 1}`);
    } else {
      parts.forEach((p, pIdx) => {
        if (pIdx % newPalettes.length === slotIdx) {
          onChangeColor(p.id, newHex, newName || `Màu Slot ${slotIdx + 1}`);
        }
      });
    }
  };

  // Distribute one specific palette color to ALL parts
  const handleApplyColorToAll = (colorHex: string, colorName: string) => {
    parts.forEach(p => {
      onChangeColor(p.id, colorHex, colorName);
    });
  };

  return (
    <div className="bg-surface rounded-lg p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle pb-4">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-primary font-bold block">
            Bóc Tách & Hoán Đổi Bảng Màu // AMS Multi-Color Palettes
          </span>
          <h3 className="font-bold text-base sm:text-lg text-fg flex items-center gap-2 mt-0.5">
            <Icon name="palette" size={20} className="text-primary" />
            Danh Sách Bảng Màu (Palettes Trong File) & Chuyển Đổi Màu Sắc
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-tech uppercase tracking-wider font-bold bg-primary text-primary-fg rounded-sm">
            {slicerPreset?.software || (format === '3MF' ? '3MF AMS Multi-Color' : `${format} Palette`)}
          </span>
        </div>
      </div>

      {/* Selected Part Quick Assignment Banner */}
      {selectedPart ? (
        <div className="bg-primary-tint border border-primary/30 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Icon name="ads_click" size={18} className="text-primary" />
            <span>
              Đang chọn: <strong>{selectedPart.name}</strong> (Màu hiện tại: <span className="font-bold font-tech" style={{ color: selectedPart.colorHex }}>{selectedPart.color || selectedPart.colorHex}</span>)
            </span>
          </div>
          <span className="text-xs font-sans text-fg-muted">Bấm vào thẻ màu bên dưới để áp dụng trực tiếp</span>
        </div>
      ) : (
        <div className="bg-canvas border border-line-subtle p-3 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
          <div className="flex items-center gap-2">
            <Icon name="info" size={18} className="text-fg-subtle" />
            <span>Chọn 1 chi tiết (Part) trong tab "Cấu Trúc Part" để gán riêng, hoặc dùng nút <strong>"Đổi Cho Tất Cả"</strong> / <strong>"Hoán Đổi Slot"</strong> ở dưới.</span>
          </div>
        </div>
      )}

      {/* QUICK PRESET THEMES CHANGER */}
      <div className="bg-surface-muted p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
            <Icon name="auto_awesome" size={18} className="text-primary" />
            Chuyển Đổi Nhanh Bộ Màu Sắc Toàn Diện (Palette Themes):
          </span>
          <span className="text-xs font-tech text-fg-muted">
            1-Click Batch Color Switch
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRESET_PALETTE_THEMES.map((theme, tIdx) => (
            <div
              key={tIdx}
              onClick={() => handleApplyTheme(theme)}
              className="p-3 bg-surface hover:bg-primary-tint/40 border border-line-subtle hover:border-primary/60 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-3 shadow-e0 group"
            >
              <div className="min-w-0">
                <div className="font-bold text-xs text-fg group-hover:text-primary transition-colors truncate">
                  {theme.name}
                </div>
                <div className="text-xs text-fg-muted truncate font-sans">
                  {theme.description}
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-1 shrink-0">
                {theme.colors.map((c, cIdx) => (
                  <span
                    key={cIdx}
                    style={{ backgroundColor: c.hex }}
                    className="w-4 h-4 rounded-full border border-line-control block shadow-e0"
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filament Palettes List in Current File */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
            <Icon name="format_color_fill" size={18} className="text-primary" />
            Các Khay Nhựa / Palette Slots Trong File ({currentPalettes.length} Slots):
          </h4>
          <span className="text-xs font-tech text-fg-muted">
            {slicerPreset?.palettes && slicerPreset.palettes.length > 0
              ? 'Nhấn đổi màu hoặc chuyển vị trí khay'
              : 'Tệp này không kèm dữ liệu slicer: tiêu hao / chiều dài / hãng nhựa hiển thị —'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {currentPalettes.map((pal, palIdx) => {
            const isUsedInSelected = selectedPart?.colorHex.toLowerCase() === pal.colorHex.toLowerCase();

            return (
              <div
                key={palIdx}
                className={`p-4 border rounded-lg bg-surface transition-all space-y-3 shadow-e1 ${
                  isUsedInSelected ? 'border-primary ring-1 ring-primary/30' : 'border-line-subtle hover:border-primary/40'
                }`}
              >
                {/* Header Row: Swatch & Name & Custom Color Picker */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <label className="cursor-pointer block" title="Nhấn để đổi màu cho khay này">
                        <span
                          style={{ backgroundColor: pal.colorHex }}
                          className="w-10 h-10 rounded-md border border-line-control block shadow-e1 group-hover:scale-105 transition-transform"
                        />
                        <input
                          type="color"
                          value={pal.colorHex}
                          onChange={(e) => handleEditSlotColor(palIdx, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-surface-inverse text-on-inverse font-tech text-xs font-bold rounded-full flex items-center justify-center pointer-events-none">
                        T{pal.index || palIdx + 1}
                      </span>
                    </div>

                    <div>
                      <h5 className="font-bold text-xs text-fg flex items-center gap-1.5">
                        {pal.name}
                      </h5>
                      <span className="font-tech text-xs text-fg-muted block">
                        HEX: {pal.colorHex} • Hãng: {pal.vendor || '—'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 text-xs font-tech font-bold uppercase rounded-sm bg-surface-muted text-fg">
                    {pal.materialType || 'PLA'}
                  </span>
                </div>

                {/* Specs: Weight, Length, Density */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-surface-muted p-2 rounded-sm font-tech">
                  <div>
                    <span className="text-xs text-fg-muted block font-sans">Tiêu hao</span>
                    <strong>{typeof pal.usedGrams === 'number' ? `${pal.usedGrams} g` : '—'}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-fg-muted block font-sans">Chiều dài</span>
                    <strong>{typeof pal.usedMeters === 'number' ? `${pal.usedMeters} m` : '—'}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-fg-muted block font-sans">Đổi Slot</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleSwapSlots(palIdx, (palIdx - 1 + currentPalettes.length) % currentPalettes.length)}
                        title="Hoán đổi màu với slot trước"
                        className="px-1.5 py-0.2 bg-surface border border-line-control hover:bg-surface-muted rounded-sm text-xs font-bold"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwapSlots(palIdx, (palIdx + 1) % currentPalettes.length)}
                        title="Hoán đổi màu với slot sau"
                        className="px-1.5 py-0.2 bg-surface border border-line-control hover:bg-surface-muted rounded-sm text-xs font-bold"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions: Apply to Selected Part OR Apply to All */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle">
                  <button
                    type="button"
                    onClick={() => handleApplyColorToAll(pal.colorHex, pal.name)}
                    className="text-xs font-sans font-bold text-fg-muted hover:text-primary underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Icon name="format_paint" size={18} />
                    Đổi Cho Toàn Bộ Part
                  </button>

                  {selectedPartId && (
                    <button
                      type="button"
                      onClick={() => onChangeColor(selectedPartId, pal.colorHex, pal.name)}
                      className={`px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-1 cursor-pointer ${
                        isUsedInSelected
                          ? 'bg-primary text-primary-fg'
                          : 'bg-surface-muted hover:bg-line-subtle border border-line-control text-fg'
                      }`}
                    >
                      <Icon name={isUsedInSelected ? 'check' : 'colorize'} size={18} />
                      {isUsedInSelected ? 'Đang Dùng' : 'Áp Dụng Cho Part Đang Chọn'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

