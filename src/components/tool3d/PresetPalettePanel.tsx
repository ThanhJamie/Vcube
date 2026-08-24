import React, { useState } from 'react';
import { SlicerPresetInfo, ModelPart, FilamentPaletteItem } from '../../types';

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
    : parts.map((p, idx) => ({
        index: p.extruderIndex || idx + 1,
        colorHex: p.colorHex,
        name: p.color || `Màu Part ${idx + 1}`,
        materialType: p.materialId?.toUpperCase() || 'PLA/PETG',
        vendor: 'Bambu Lab AMS',
        density: 1.24,
        usedGrams: Number((p.volumeCm3 * 1.24).toFixed(1)),
        usedMeters: Number((p.volumeCm3 * 0.4).toFixed(2)),
        costPerKg: 350000
      }));

  const [currentPalettes, setCurrentPalettes] = useState<FilamentPaletteItem[]>(initialPalettes);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

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
    <div className="bg-white border border-black/10 p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <span className="font-sans text-[9px] uppercase tracking-widest text-[#00687a] font-bold block">
            Bóc Tách & Hoán Đổi Bảng Màu // AMS Multi-Color Palettes
          </span>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[#1C1C1C] flex items-center gap-2 mt-0.5">
            <span className="material-symbols-outlined text-lg text-[#00687a]">palette</span>
            Danh Sách Bảng Màu (Palettes Trong File) & Chuyển Đổi Màu Sắc
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[10px] font-tech uppercase tracking-wider font-bold bg-[#00687a] text-white rounded">
            {slicerPreset?.software || (format === '3MF' ? '3MF AMS Multi-Color' : `${format} Palette`)}
          </span>
        </div>
      </div>

      {/* Selected Part Quick Assignment Banner */}
      {selectedPart ? (
        <div className="bg-cyan-50 border border-[#00687a]/30 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687a] text-base">ads_click</span>
            <span>
              Đang chọn: <strong>{selectedPart.name}</strong> (Màu hiện tại: <span className="font-bold font-tech" style={{ color: selectedPart.colorHex }}>{selectedPart.color || selectedPart.colorHex}</span>)
            </span>
          </div>
          <span className="text-[10px] font-sans text-[#7D7565]">Bấm vào thẻ màu bên dưới để áp dụng trực tiếp</span>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-500 text-base">info</span>
            <span>Chọn 1 chi tiết (Part) trong tab "Cấu Trúc Part" để gán riêng, hoặc dùng nút <strong>"Đổi Cho Tất Cả"</strong> / <strong>"Hoán Đổi Slot"</strong> ở dưới.</span>
          </div>
        </div>
      )}

      {/* QUICK PRESET THEMES CHANGER */}
      <div className="bg-[#FAF9F5] border border-black/10 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#5A554C] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#00687a]">auto_awesome</span>
            Chuyển Đổi Nhanh Bộ Màu Sắc Toàn Diện (Palette Themes):
          </span>
          <span className="text-[10px] font-tech text-[#7D7565]">
            1-Click Batch Color Switch
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRESET_PALETTE_THEMES.map((theme, tIdx) => (
            <div
              key={tIdx}
              onClick={() => handleApplyTheme(theme)}
              className="p-3 bg-white hover:bg-cyan-50/40 border border-black/10 hover:border-[#00687a]/60 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs group"
            >
              <div className="min-w-0">
                <div className="font-bold text-xs text-[#1C1C1C] group-hover:text-[#00687a] transition-colors truncate">
                  {theme.name}
                </div>
                <div className="text-[10px] text-[#7D7565] truncate font-sans">
                  {theme.description}
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-1 shrink-0">
                {theme.colors.map((c, cIdx) => (
                  <span
                    key={cIdx}
                    style={{ backgroundColor: c.hex }}
                    className="w-4 h-4 rounded-full border border-black/20 block shadow-2xs"
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
          <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-[#5A554C] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#00687a]">format_color_fill</span>
            Các Khay Nhựa / Palette Slots Trong File ({currentPalettes.length} Slots):
          </h4>
          <span className="text-[10px] font-tech text-[#7D7565]">
            Nhấn đổi màu hoặc chuyển vị trí khay
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {currentPalettes.map((pal, palIdx) => {
            const isUsedInSelected = selectedPart?.colorHex.toLowerCase() === pal.colorHex.toLowerCase();

            return (
              <div
                key={palIdx}
                className={`p-4 border rounded-xl bg-white transition-all space-y-3 shadow-xs ${
                  isUsedInSelected ? 'border-[#00687a] ring-1 ring-[#00687a]/30' : 'border-black/10 hover:border-[#00687a]/40'
                }`}
              >
                {/* Header Row: Swatch & Name & Custom Color Picker */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <label className="cursor-pointer block" title="Nhấn để đổi màu cho khay này">
                        <span
                          style={{ backgroundColor: pal.colorHex }}
                          className="w-10 h-10 rounded-lg border border-black/20 block shadow-xs group-hover:scale-105 transition-transform"
                        />
                        <input
                          type="color"
                          value={pal.colorHex}
                          onChange={(e) => handleEditSlotColor(palIdx, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#1C1C1C] text-white font-tech text-[9px] font-bold rounded-full flex items-center justify-center pointer-events-none">
                        T{pal.index || palIdx + 1}
                      </span>
                    </div>

                    <div>
                      <h5 className="font-bold text-xs text-[#1C1C1C] flex items-center gap-1.5">
                        {pal.name}
                      </h5>
                      <span className="font-tech text-[10px] text-[#7D7565] block">
                        HEX: {pal.colorHex} • Hãng: {pal.vendor || 'Bambu Lab AMS'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 text-[9px] font-tech font-bold uppercase rounded bg-slate-100 text-[#1C1C1C]">
                    {pal.materialType || 'PLA'}
                  </span>
                </div>

                {/* Specs: Weight, Length, Density */}
                <div className="grid grid-cols-3 gap-2 text-[11px] bg-[#FAF9F5] p-2 rounded border border-black/5 font-tech">
                  <div>
                    <span className="text-[9px] text-[#7D7565] block font-sans">Tiêu hao</span>
                    <strong>{pal.usedGrams ? `${pal.usedGrams} g` : '~15.0 g'}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#7D7565] block font-sans">Chiều dài</span>
                    <strong>{pal.usedMeters ? `${pal.usedMeters} m` : '~4.8 m'}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#7D7565] block font-sans">Đổi Slot</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleSwapSlots(palIdx, (palIdx - 1 + currentPalettes.length) % currentPalettes.length)}
                        title="Hoán đổi màu với slot trước"
                        className="px-1.5 py-0.2 bg-white border border-black/15 hover:bg-slate-100 rounded text-[9px] font-bold"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwapSlots(palIdx, (palIdx + 1) % currentPalettes.length)}
                        title="Hoán đổi màu với slot sau"
                        className="px-1.5 py-0.2 bg-white border border-black/15 hover:bg-slate-100 rounded text-[9px] font-bold"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions: Apply to Selected Part OR Apply to All */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => handleApplyColorToAll(pal.colorHex, pal.name)}
                    className="text-[10px] font-sans font-bold text-[#7D7565] hover:text-[#00687a] underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">format_paint</span>
                    Đổi Cho Toàn Bộ Part
                  </button>

                  {selectedPartId && (
                    <button
                      type="button"
                      onClick={() => onChangeColor(selectedPartId, pal.colorHex, pal.name)}
                      className={`px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1 cursor-pointer ${
                        isUsedInSelected
                          ? 'bg-[#00687a] text-white'
                          : 'bg-[#F7F6F2] hover:bg-[#EAE8E0] border border-black/15 text-[#1C1C1C]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {isUsedInSelected ? 'check' : 'colorize'}
                      </span>
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

