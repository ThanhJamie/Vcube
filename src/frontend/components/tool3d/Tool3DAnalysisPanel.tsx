import React from 'react';
import { Icon } from '@frontend/ui';
import type { AnalysisFile, TransformState } from '@/types';
import { countMeasuredScoreInputs, describeUnmeasuredScoreInputs, formatOverhangLabel } from './tool3dAnalysis';
import { PresetPalettePanel } from './PresetPalettePanel';
import { TransformControlsPanel } from './TransformControlsPanel';
import { ValidationReportPanel } from './ValidationReportPanel';

/**
 * Tab "2. Phân tích" của cột trái /quote (báo cáo kiểm định + sub-tab 2/3/4) — block-move từ
 * `views/Tool3DView.tsx` dòng 1453–1782. Identifier giữ nguyên tên (nay là props).
 */
export interface Tool3DAnalysisPanelProps {
  selectedFile: AnalysisFile;
  handleAutoFixMesh: () => void;
  showDefects: boolean;
  setShowDefects: (value: boolean) => void;
  compareMode: 'normal' | 'before' | 'after';
  setCompareMode: (value: 'normal' | 'before' | 'after') => void;
  activeWorkspaceTab: 'objects' | 'preset' | 'transforms' | 'validation';
  setActiveWorkspaceTab: (value: 'objects' | 'preset' | 'transforms' | 'validation') => void;
  selectedPartId: string | null;
  handleChangePartColor: (partId: string, colorHex: string, colorName: string) => void;
  transformedDimensions: { x: number; y: number; z: number };
  transformedVolume: number;
  transform: TransformState;
  setTransform: React.Dispatch<React.SetStateAction<TransformState>>;
  onShowToast: (message: string) => void;
}

export const Tool3DAnalysisPanel: React.FC<Tool3DAnalysisPanelProps> = ({
  selectedFile,
  handleAutoFixMesh,
  showDefects,
  setShowDefects,
  compareMode,
  setCompareMode,
  activeWorkspaceTab,
  setActiveWorkspaceTab,
  selectedPartId,
  handleChangePartColor,
  transformedDimensions,
  transformedVolume,
  transform,
  setTransform,
  onShowToast
}) => (
            <div className="rounded-lg border border-line bg-surface p-5 sm:p-6 space-y-5 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon name="fact_check" size={20} className="text-primary" />
                    <h3 className="font-bold text-sm sm:text-base text-fg uppercase tracking-wider font-mono">
                      Báo cáo kiểm định lưới & khả năng in
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-fg-subtle block mt-0.5">
                    Kiểm tra hình học FDM — tự động phát hiện lỗi khép kín
                  </span>
                </div>

                {/* Score Badge */}
                {/* R4: `null` cho MOI phep do hinh hoc (luoi vuot tran phan tich) ⇒ khong co gi de
                    cham diem. Cong bo "x/100 Score" khi do la ket luan bia ⇒ trang thai thu ba. */}
                <div className="flex items-center gap-2 font-mono">
                  {typeof selectedFile.printability.printabilityScore === 'number' ? (
                    <div
                      title={
                        describeUnmeasuredScoreInputs(selectedFile).length > 0
                          ? `Bỏ qua (chưa đo được): ${describeUnmeasuredScoreInputs(selectedFile).join(', ')}`
                          : undefined
                      }
                      className={`px-3 py-1.5 rounded-lg border text-center ${
                        selectedFile.printability.printabilityScore >= 90
                          ? 'bg-positive-tint border-positive/20 text-positive'
                          : selectedFile.printability.printabilityScore >= 70
                          ? 'bg-warning-tint border-warning/20 text-warning'
                          : 'bg-danger-tint border-danger/20 text-danger'
                      }`}
                    >
                      <span className="text-xs font-bold block">{selectedFile.printability.printabilityScore}/100 điểm</span>
                      <span className="text-xs uppercase tracking-wider block font-semibold">
                        {countMeasuredScoreInputs(selectedFile) < 4
                          ? `Chấm từ ${countMeasuredScoreInputs(selectedFile)}/4 số đo`
                          // R4: `level` cung co the `null` ⇒ KHONG duoc roi vao nhan "Rui Ro" (ket luan khong co so do).
                          : selectedFile.printability.level === null
                          ? '—'
                          : selectedFile.printability.level === 'good' ? 'Rất khả thi' : selectedFile.printability.level === 'warning' ? 'Cần chú ý' : 'Rủi ro'}
                      </span>
                    </div>
                  ) : (
                    <div
                      title={`Thiếu số đo: ${describeUnmeasuredScoreInputs(selectedFile).join(', ')}`}
                      className="px-3 py-1.5 rounded-lg border text-center bg-surface-muted border-line text-fg-muted"
                    >
                      <span className="text-xs font-bold block">—/100 điểm</span>
                      <span className="text-xs uppercase tracking-wider block font-semibold">Chưa chấm điểm</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3 Core Geometry Checks: Watertight, Wall Thickness, Overhang Angle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                {/* 1. Watertight Check */}
                {/* R4: `isWatertight` co BA trang thai — `true` (do duoc: kin), `false` (do duoc:
                    khong kin), `null` (CHUA phan tich: luoi vuot tran, bo doc khong chay ban do canh).
                    `null` KHONG duoc hien "Khong kin": do la ket luan tu du lieu khong ton tai. */}
                <div className={`p-3.5 rounded-lg border ${
                  selectedFile.isWatertight === true
                    ? 'bg-positive-tint border-positive/20 text-positive'
                    : selectedFile.isWatertight === false
                    ? 'bg-warning-tint border-warning/20 text-warning'
                    : 'bg-surface-muted border-line text-fg-muted'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {/* Q2: icon/màu phải bám số đo — trước đây icon luôn mang `text-positive` kể cả khi
                        lưới KHÔNG kín (cùng lỗi với ValidationReportPanel). */}
                    <Icon
                      name={
                        selectedFile.isWatertight === true ? 'verified'
                          : selectedFile.isWatertight === false ? 'warning'
                          : 'help'
                      }
                      size={16}
                      className={
                        selectedFile.isWatertight === true ? 'text-positive'
                          : selectedFile.isWatertight === false ? 'text-warning'
                          : 'text-fg-muted'
                      }
                    />
                    <span className="text-xs uppercase">Độ kín nước</span>
                  </div>
                  <div className="text-xs font-bold">
                    {selectedFile.isWatertight === true
                      ? 'Kín nước'
                      : selectedFile.isWatertight === false
                      ? 'Không kín (lưới non-manifold)'
                      : 'Chưa phân tích'}
                  </div>
                  <span className="text-xs text-fg-muted block mt-0.5">
                    {/* Q2 (MP-10) + R4: `nonManifoldEdges` / `boundaryEdges` la hai SO DO RIENG.
                        `null` = chua do duoc ⇒ chi noi "chua do", khong suy ra "kin"/"ho". */}
                    {selectedFile.nonManifoldEdges === null
                      ? 'Chưa đo được số cạnh non-manifold'
                      : selectedFile.nonManifoldEdges > 0
                      ? `${selectedFile.nonManifoldEdges} cạnh non-manifold`
                      : typeof selectedFile.boundaryEdges === 'number' && selectedFile.boundaryEdges > 0
                      ? `${selectedFile.boundaryEdges} biên hở (cạnh chỉ có 1 mặt)`
                      : selectedFile.isWatertight === true
                      ? 'Không phát hiện biên hở'
                      : selectedFile.isWatertight === false
                      ? 'Còn biên hở — chưa đo được số biên hở'
                      : 'Chưa đo được độ kín'}
                  </span>
                </div>

                {/* 2. Wall Thickness Check */}
                {/* R4: `minWallThickness` co BA trang thai. `null` (chua do duoc) truoc day in ra
                    "Min: null mm" va gan nhan "Canh bao qua mong" — mot ket luan khong co so do. */}
                <div className={`p-3.5 rounded-lg border ${
                  typeof selectedFile.minWallThickness !== 'number'
                    ? 'bg-surface-muted border-line text-fg-muted'
                    : selectedFile.minWallThickness >= 0.8
                    ? 'bg-positive-tint border-positive/20 text-positive'
                    : 'bg-danger-tint border-danger/20 text-danger'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Icon
                      name="straighten"
                      size={16}
                      className={typeof selectedFile.minWallThickness === 'number' ? 'text-primary' : 'text-fg-muted'}
                    />
                    <span className="text-xs uppercase">Độ dày thành</span>
                  </div>
                  <div className="text-xs font-bold">
                    {typeof selectedFile.minWallThickness === 'number'
                      ? `Nhỏ nhất: ${selectedFile.minWallThickness.toFixed(2)} mm`
                      : 'Nhỏ nhất: —'}
                  </div>
                  <span className="text-xs text-fg-muted block mt-0.5">
                    {typeof selectedFile.minWallThickness !== 'number'
                      ? 'Chưa đo được'
                      : selectedFile.minWallThickness >= 0.8
                      ? 'Đạt ngưỡng tối thiểu (≥ 0,8 mm)'
                      : 'Cảnh báo quá mỏng'}
                  </span>
                </div>

                {/* 3. Overhang Angle Check */}
                {/* Q2 (MP-07): chưa đo được ⇒ tile trung tính + "Chưa đo", không có số mặc định. */}
                <div className={`p-3.5 rounded-lg border ${
                  typeof selectedFile.printability.overhangPercentage === 'number'
                    ? 'bg-primary-tint border-primary/20 text-primary'
                    : 'bg-surface-muted border-line text-fg-muted'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Icon name="explore" size={16} />
                    <span className="text-xs uppercase">Góc nhô</span>
                  </div>
                  <div className="text-xs font-bold">
                    {formatOverhangLabel(selectedFile.printability.overhangPercentage)}
                  </div>
                  <span className="text-xs text-fg-muted block mt-0.5">
                    Góc nghiêng an toàn ≤ 45°
                  </span>
                </div>
              </div>

              {/* Auto-Repair & Comparison Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-muted border border-line rounded-lg text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFixMesh}
                    className="h-10 max-md:min-h-11 px-4 bg-primary hover:bg-primary-hover text-primary-fg rounded-md font-semibold text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-e1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Icon name="auto_fix_high" size={18} />
                    Tự động sửa lưới
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDefects(!showDefects)}
                    aria-pressed={showDefects}
                    className={`h-10 max-md:min-h-11 px-3 rounded-md border font-medium text-sm transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      showDefects
                        ? 'bg-surface text-fg border-line shadow-e1 font-semibold'
                        : 'bg-surface text-fg-muted border-line-control hover:bg-surface-muted hover:text-fg'
                    }`}
                  >
                    <Icon name="wb_incandescent" size={18} />
                    {showDefects ? 'Tắt vùng lỗi' : 'Hiện vùng lỗi'}
                  </button>
                </div>

                {/* Compare Mode */}
                <div className="flex items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-xs">
                  <span className="text-fg-muted px-1 text-xs">So Sánh:</span>
                  <button
                    type="button"
                    onClick={() => setCompareMode('normal')}
                    aria-pressed={compareMode === 'normal'}
                    className={`px-3 py-1.5 max-md:min-h-11 rounded-sm font-medium text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      compareMode === 'normal' ? 'bg-surface text-fg shadow-e1 font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    Chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('before')}
                    aria-pressed={compareMode === 'before'}
                    className={`px-3 py-1.5 max-md:min-h-11 rounded-sm font-medium text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      compareMode === 'before' ? 'bg-surface text-fg shadow-e1 font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    Trước Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('after')}
                    aria-pressed={compareMode === 'after'}
                    className={`px-3 py-1.5 max-md:min-h-11 rounded-sm font-medium text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      compareMode === 'after' ? 'bg-surface text-fg shadow-e1 font-semibold' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    Sau Sửa
                  </button>
                </div>
              </div>

              {/* Sub-panels Navigation Tabs */}
              <div className="space-y-3 pt-2 font-mono">
                <div className="flex flex-wrap items-center gap-2 border-b border-line pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('preset')}
                    aria-pressed={activeWorkspaceTab === 'preset'}
                    className={`pb-2 px-3 max-md:min-h-11 uppercase tracking-wider font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      activeWorkspaceTab === 'preset'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-fg-muted hover:text-fg'
                    }`}
                  >
                    2. Bảng Màu 3MF
                    <span className="px-1.5 py-0.2 text-xs font-bold rounded-sm bg-primary/15 text-primary">
                      {selectedFile.slicerPreset?.palettes?.length || selectedFile.parts.length} màu
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('transforms')}
                    aria-pressed={activeWorkspaceTab === 'transforms'}
                    className={`pb-2 px-3 max-md:min-h-11 uppercase tracking-wider font-bold transition-colors border-b-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      activeWorkspaceTab === 'transforms'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-fg-muted hover:text-fg'
                    }`}
                  >
                    3. Tỷ Lệ & Tọa Độ
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('validation')}
                    aria-pressed={activeWorkspaceTab === 'validation'}
                    className={`pb-2 px-3 max-md:min-h-11 uppercase tracking-wider font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      activeWorkspaceTab === 'validation'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-fg-muted hover:text-fg'
                    }`}
                  >
                    4. Chi Tiết QA
                  </button>
                </div>

                {/* Sub-panel Content */}
                {activeWorkspaceTab === 'objects' && (
                  <div className="rounded-md border border-line-subtle bg-surface-muted p-4 text-sm text-fg-muted">
                    Cây đối tượng hiển thị ở cột trái, cạnh mô hình 3D. Chọn một chi tiết để gán vật liệu, đầu đùn và bàn in.
                  </div>
                )}

                {activeWorkspaceTab === 'preset' && (
                  <PresetPalettePanel
                    slicerPreset={selectedFile.slicerPreset}
                    parts={selectedFile.parts}
                    selectedPartId={selectedPartId}
                    onChangeColor={handleChangePartColor}
                    format={selectedFile.format}
                  />
                )}

                {activeWorkspaceTab === 'transforms' && (
                  <TransformControlsPanel
                    transform={transform}
                    onUpdateTransform={(up) => setTransform(prev => ({ ...prev, ...up }))}
                    onResetTransform={() => setTransform({
                      scaleUniform: 100,
                      scaleX: 100,
                      scaleY: 100,
                      scaleZ: 100,
                      rotationX: 0,
                      rotationY: 0,
                      rotationZ: 0,
                      positionX: 0,
                      positionY: 0,
                      positionZ: 0,
                      unit: 'mm',
                      layFlat: true,
                      centered: true
                    })}
                    onLayFlat={() => {
                      setTransform(prev => ({ ...prev, rotationX: 0, rotationZ: 0 }));
                      onShowToast('Đã đặt mặt đáy tiếp xúc phẳng sát bàn in (Z=0).');
                    }}
                    onCenterModel={() => {
                      setTransform(prev => ({ ...prev, positionX: 0, positionZ: 0 }));
                      onShowToast('Đã căn tâm hình học mô hình vào chính giữa bàn in.');
                    }}
                  />
                )}

                {activeWorkspaceTab === 'validation' && (
                  <ValidationReportPanel
                    file={selectedFile}
                    transformedDimensions={transformedDimensions}
                    transformedVolume={transformedVolume}
                    showDefects={showDefects}
                    onToggleDefects={() => setShowDefects(!showDefects)}
                    compareMode={compareMode}
                    onSetCompareMode={setCompareMode}
                    onAutoFixMesh={handleAutoFixMesh}
                  />
                )}
              </div>
            </div>
);
