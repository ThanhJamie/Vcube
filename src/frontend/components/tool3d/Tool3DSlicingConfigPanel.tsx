import React from 'react';
import { Icon } from '@frontend/ui';
import type { MaterialProfile, PrinterProfile } from '@/types';
import { bedText, measuredText } from './tool3dAnalysis';

/**
 * Tab "1. Cấu hình" của cột trái /quote — block-move từ `views/Tool3DView.tsx` dòng 1281–1448.
 * Identifier giữ nguyên tên (nay là props); không đổi control/layout/copy.
 */
export interface Tool3DSlicingConfigPanelProps {
  printers: PrinterProfile[];
  materials: MaterialProfile[];
  currentPrinter: PrinterProfile | undefined;
  currentMaterial: MaterialProfile | undefined;
  selectedPrinterId: string;
  setSelectedPrinterId: (id: string) => void;
  selectedMaterialId: string;
  setSelectedMaterialId: (id: string) => void;
  infillDensity: number;
  setInfillDensity: (value: number) => void;
  infillPattern: string;
  setInfillPattern: (value: string) => void;
  layerHeight: string;
  setLayerHeight: (value: string) => void;
  supportsMode: 'auto' | 'tree' | 'none';
  setSupportsMode: (value: 'auto' | 'tree' | 'none') => void;
  quantity: number;
  setQuantity: (value: number) => void;
}

export const Tool3DSlicingConfigPanel: React.FC<Tool3DSlicingConfigPanelProps> = ({
  printers,
  materials,
  currentPrinter,
  currentMaterial,
  selectedPrinterId,
  setSelectedPrinterId,
  selectedMaterialId,
  setSelectedMaterialId,
  infillDensity,
  setInfillDensity,
  infillPattern,
  setInfillPattern,
  layerHeight,
  setLayerHeight,
  supportsMode,
  setSupportsMode,
  quantity,
  setQuantity
}) => (
            <div className="rounded-lg border border-line bg-surface p-5 sm:p-6 space-y-4 font-sans">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="tune" size={20} className="text-primary" />
                  <h3 className="font-bold text-sm sm:text-base text-fg uppercase tracking-wider font-mono">
                    Thông số cắt lớp
                  </h3>
                </div>
                <span className="text-xs font-mono text-primary bg-primary-tint px-2.5 py-0.5 rounded-md border border-primary/20 font-bold">
                  Bambu Lab / Kobra
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Printer Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="tool3d-printer-select" className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold flex items-center justify-between">
                    <span>Máy In Gia Công</span>
                    <span className="text-fg">
                      {currentPrinter ? bedText(currentPrinter) : 'Chưa có máy in'}
                    </span>
                  </label>
                  <select
                    id="tool3d-printer-select"
                    value={selectedPrinterId}
                    onChange={(e) => setSelectedPrinterId(e.target.value)}
                    className="h-10 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg font-mono focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {printers.length === 0 && (
                      <option value="">— Chưa có máy in trong hệ thống —</option>
                    )}
                    {printers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.technology})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Material Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="tool3d-material-select" className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold flex items-center justify-between">
                    <span>Vật Liệu Kỹ Thuật</span>
                    <span className="text-fg">
                      {currentMaterial ? measuredText(currentMaterial.pricePerGram, ' đ/g') : 'Chưa có vật liệu'}
                    </span>
                  </label>
                  <select
                    id="tool3d-material-select"
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="h-10 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg font-mono focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {materials.length === 0 && (
                      <option value="">— Chưa có vật liệu trong hệ thống —</option>
                    )}
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({measuredText(m.pricePerGram, ' đ/g')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Infill Density & Pattern */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="tool3d-infill-range" className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold">
                    Độ đặc ruột: <span className="font-mono text-fg font-bold">{infillDensity}% {infillPattern}</span>
                  </label>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    {['Gyroid', 'Grid', 'Honeycomb'].map((pat) => (
                      <button
                        key={pat}
                        type="button"
                        onClick={() => setInfillPattern(pat)}
                        aria-pressed={infillPattern === pat}
                        className={`h-8 max-md:min-h-11 px-3 rounded-sm border text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          infillPattern === pat
                            ? 'bg-primary text-primary-fg border-primary'
                            : 'bg-surface text-fg-muted border-line hover:bg-surface-muted hover:text-fg'
                        }`}
                      >
                        {pat}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  id="tool3d-infill-range"
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  aria-label="Độ đặc ruột"
                  value={infillDensity}
                  onChange={(e) => setInfillDensity(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Layer Height & Supports Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="tool3d-layer-height" className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold block">
                    Độ dày lớp in
                  </label>
                  <select
                    id="tool3d-layer-height"
                    value={layerHeight}
                    onChange={(e) => setLayerHeight(e.target.value)}
                    className="h-10 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg font-mono focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* F2 (P9): nếu tệp khai layer height ngoài 4 mức sẵn có, hiện đúng giá trị đó
                        thay vì để select trống/kẹt ở lựa chọn không khớp. */}
                    {layerHeight && !['0.08', '0.12', '0.16', '0.20'].includes(layerHeight) && (
                      <option value={layerHeight}>{layerHeight} mm (theo tệp)</option>
                    )}
                    <option value="0.08">0,08 mm (siêu mịn — chi tiết sắc nét)</option>
                    <option value="0.12">0,12 mm (chi tiết mịn — chuẩn chất lượng)</option>
                    <option value="0.16">0,16 mm (tiêu chuẩn — cân bằng tốc độ/độ đẹp)</option>
                    <option value="0.20">0,20 mm (lớp nhanh — in nhanh mẫu thử)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tool3d-supports-mode" className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold block">
                    Cấu hình vật liệu đỡ
                  </label>
                  <select
                    id="tool3d-supports-mode"
                    value={supportsMode}
                    onChange={(e) => setSupportsMode(e.target.value as any)}
                    className="h-10 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg font-mono focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="tree">Đỡ dạng cây (dễ bóc — ít vết sẹo bề mặt)</option>
                    <option value="auto">Đỡ dạng lưới tự động (chắc chắn cho hình học lớn)</option>
                    <option value="none">Không dùng vật liệu đỡ (chỉ in cầu dầm ngang)</option>
                  </select>
                </div>
              </div>

              {/* Batch Quantity Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
                <div className="text-xs font-mono">
                  <span className="font-bold text-fg block">Số lượng sản xuất (lô):</span>
                  <span className="text-xs text-fg-subtle">Giảm giá lũy tiến tự động theo số lượng</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  {[1, 2, 5, 10, 20].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      aria-pressed={quantity === qty}
                      className={`h-8 max-md:min-h-11 px-3 text-sm font-medium rounded-sm border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        quantity === qty
                          ? 'bg-primary text-primary-fg border-primary'
                          : 'bg-surface text-fg-muted border-line hover:bg-surface-muted hover:text-fg'
                      }`}
                    >
                      x{qty}
                    </button>
                  ))}
                </div>
              </div>
            </div>
);
