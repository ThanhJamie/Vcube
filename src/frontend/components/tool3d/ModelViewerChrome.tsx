import React from 'react';
import * as THREE from 'three';
import type { PlateInfo, TransformState } from '@/types';
import { Icon } from '@frontend/ui';
import type { WebGLRecoveryState } from './modelViewerHelpers';
import { VIEW_ANGLE_LABEL, plateMetaText } from './modelViewerHelpers';

/**
 * Toàn bộ chrome/HUD/toolbar/overlay bên trong khung 3D của ModelViewer3D — block-move từ
 * `components/tool3d/ModelViewer3D.tsx` dòng 1724–2113 (Phase 4a). Identifier giữ nguyên tên
 * (nay là props) để phần JSX không bị sửa; component thuần presentational, không state riêng.
 */
export interface ModelViewerChromeProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDragOver: boolean;
  webglState: WebGLRecoveryState;
  setWebglState: React.Dispatch<React.SetStateAction<WebGLRecoveryState>>;
  setContextEpoch: React.Dispatch<React.SetStateAction<number>>;
  displayName: string;
  fpsDisplayRef: React.RefObject<HTMLSpanElement | null>;
  isFullscreen: boolean;
  handleToggleFullscreen: () => void | Promise<void>;
  cameraMode: 'perspective' | 'orthographic';
  handleToggleCameraMode: () => void;
  isRotating: boolean;
  setIsRotating: React.Dispatch<React.SetStateAction<boolean>>;
  wireframe: boolean;
  setWireframe: React.Dispatch<React.SetStateAction<boolean>>;
  isBoundingBoxActive: boolean;
  handleToggleBoundingBox: () => void;
  isMeasurementActive: boolean;
  handleToggleMeasurement: () => void;
  activeAngle: 'iso' | 'top' | 'front' | 'side';
  setCameraAngle: (angle: 'iso' | 'top' | 'front' | 'side') => void;
  plates: PlateInfo[];
  activePlateIndex: number;
  onSelectPlate?: (plateIndex: number) => void;
  handleAutoFit: () => void;
  isBedOverflow: boolean;
  bed: { x: number; y: number; z: number } | null;
  modelDims: { x: number; y: number; z: number };
  scaleMultiplier: number;
  onUpdateTransform?: (updated: Partial<TransformState>) => void;
  handleScaleToFitBed: () => void;
  caliperPoints: THREE.Vector3[];
  caliperDistance: number | null;
  clearMeasurement: () => void;
  hoveredPartName: string | null;
  handleResetCamera: () => void;
  handleCaptureThumbnail: () => void;
  currentSlice: number;
  handleSliceChange: (value: number) => void;
  transform: TransformState;
  modelHeight: number;
}

export const ModelViewerChrome: React.FC<ModelViewerChromeProps> = ({
  containerRef,
  isDragOver,
  webglState,
  setWebglState,
  setContextEpoch,
  displayName,
  fpsDisplayRef,
  isFullscreen,
  handleToggleFullscreen,
  cameraMode,
  handleToggleCameraMode,
  isRotating,
  setIsRotating,
  wireframe,
  setWireframe,
  isBoundingBoxActive,
  handleToggleBoundingBox,
  isMeasurementActive,
  handleToggleMeasurement,
  activeAngle,
  setCameraAngle,
  plates,
  activePlateIndex,
  onSelectPlate,
  handleAutoFit,
  isBedOverflow,
  bed,
  modelDims,
  scaleMultiplier,
  onUpdateTransform,
  handleScaleToFitBed,
  caliperPoints,
  caliperDistance,
  clearMeasurement,
  hoveredPartName,
  handleResetCamera,
  handleCaptureThumbnail,
  currentSlice,
  handleSliceChange,
  transform,
  modelHeight
}) => (
  <>
      {/* Drag and Drop Over Canvas Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-modal bg-primary/90 flex flex-col items-center justify-center text-primary-fg border-2 border-dashed border-accent">
          <Icon name="upload_file" size={48} className="animate-bounce motion-reduce:animate-none text-accent" />
          <p className="font-mono text-sm font-bold mt-2 uppercase tracking-wider">Thả tệp 3D (3MF / STL / OBJ / STEP) vào đây</p>
          <span className="text-xs text-primary-fg font-mono">Hệ thống sẽ bóc tách cấu trúc 3D tự động</span>
        </div>
      )}

      {/* WebGL Context Loss Recovery Overlay (R5) */}
      {webglState !== 'ACTIVE' && (
        <div className="absolute inset-0 z-modal bg-surface/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-lg bg-surface-muted border border-line flex items-center justify-center mb-4">
            <Icon name="sync" size={32} className="animate-spin motion-reduce:animate-none text-fg-muted" />
          </div>
          <h3 className="text-base font-bold text-fg tracking-wide mb-1.5 font-mono">
            Đang khôi phục tài nguyên đồ họa 3D...
          </h3>
          <p className="text-xs text-fg-muted max-w-md mb-4 font-mono leading-relaxed">
            Ngữ cảnh WebGL đang được thiết lập lại từ bộ nhớ đệm hình học. Quá trình này diễn ra tự động mà không làm mất trạng thái của mô hình.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-muted border border-line text-xs font-mono text-fg-muted mb-4">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse motion-reduce:animate-none" />
            <span>
              {webglState === 'CONTEXT_LOST'
                ? 'Trạng thái: Mất ngữ cảnh GPU (Đang chờ khôi phục)'
                : 'Trạng thái: Đang tái cấu trúc Scene & Buffer'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setWebglState('RECOVERING');
              setContextEpoch((prev) => prev + 1);
            }}
            className="px-4 h-10 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-mono font-bold rounded-md transition-colors cursor-pointer inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Icon name="refresh" size={16} />
            <span>Khôi phục thủ công ngay</span>
          </button>
        </div>
      )}

      {/* 3D WebGL Canvas. A11Y-04: canvas không có nội dung DOM ⇒ role="img" + nhãn VI trên
          container canvas (wrapper còn toolbar/HUD nên không gắn role="img" ở wrapper). */}
      <div
        ref={containerRef}
        role="img"
        aria-label={`Mô hình 3D ${displayName} — dùng chuột để xoay, cuộn để thu phóng.`}
        className="w-full flex-1 cursor-grab active:cursor-grabbing min-h-[340px]"
      />

      {/* Top Header Bar: Status Badge + Live FPS on Left, Dimensions + Fullscreen on Right */}
      <div className="absolute top-3 left-3 right-3 z-panel flex items-center justify-between gap-2 pointer-events-none">
        {/* Top-Left: VCUBE ENGINE v2.6 // 60 FPS // Model Name */}
        <div className="pointer-events-auto flex min-w-0 max-w-full items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1 text-xs text-fg-muted font-mono backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none shrink-0"></span>
          {/* 390: nhãn dài bị cắt trong khung hẹp — bản đầy đủ hiện từ sm, bản ngắn chỉ ở mobile. */}
          <span className="hidden sm:inline font-bold text-fg tracking-wider shrink-0">BỘ MÁY LƯỚI 3D VCUBE v2.6</span>
          <span className="sm:hidden font-bold text-fg tracking-wider shrink-0">VCUBE v2.6</span>
          <span className="hidden sm:inline text-fg-muted">·</span>
          <span ref={fpsDisplayRef} className="text-positive font-bold shrink-0">60 FPS</span>
          {isFullscreen && (
            <>
              <span className="text-fg-muted">·</span>
              <span className="font-bold uppercase text-xs bg-primary-tint px-1.5 py-0.5 rounded-sm border border-line tracking-wider">
                TOÀN MÀN HÌNH
              </span>
            </>
          )}
          <span className="text-fg-muted hidden sm:inline">·</span>
          <span className="text-fg-muted font-medium truncate max-w-[110px] sm:max-w-[200px] hidden sm:inline" title={displayName}>
            {displayName}
          </span>
        </div>

        {/* Top-Right: Dimension Chip + Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-surface/90 text-fg-muted font-mono text-xs backdrop-blur-sm">
            <Icon name="straighten" size={16} className="text-fg-muted" />
            <span className="font-bold tabular-nums">
              {modelDims.x > 0 && modelDims.y > 0 && modelDims.z > 0
                ? `${modelDims.x.toFixed(1)} × ${modelDims.y.toFixed(1)} × ${modelDims.z.toFixed(1)} mm`
                : '— chưa đo'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình (phím ESC)' : 'Toàn màn hình xem CAD'}
            aria-label={isFullscreen ? 'Thoát toàn màn hình xem CAD' : 'Mở toàn màn hình xem CAD'}
            className={`inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-mono font-bold transition-colors cursor-pointer max-md:h-11 max-md:min-w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isFullscreen
                ? 'bg-primary text-primary-fg border-primary hover:bg-primary-hover'
                : 'bg-surface/90 border-line text-fg-muted hover:text-fg hover:bg-surface-muted'
            }`}
          >
            <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={18} />
            {isFullscreen && (
              <span className="text-xs text-primary-fg hidden sm:inline uppercase tracking-wider pr-1">
                Thoát (ESC)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Floating CAD Control Row: tools left, view presets right — exactly one row at top-14 */}
      <div className="absolute top-14 left-3 right-3 z-panel pointer-events-auto flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto rounded-md border border-line bg-surface/95 p-1.5 text-fg shadow-e2 backdrop-blur-md">
          {/* 360 Auto-Rotate */}
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Dừng xoay tự động 360°' : 'Bật xoay tự động 360°'}
            aria-label={isRotating ? 'Dừng xoay tự động 360°' : 'Bật xoay tự động 360°'}
            aria-pressed={isRotating}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer max-md:h-11 max-md:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isRotating ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
            }`}
          >
            <Icon name="360" size={18} />
          </button>

          {/* Wireframe / Solid */}
          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            title={wireframe ? 'Chuyển sang chế độ đặc' : 'Chuyển sang chế độ khung dây'}
            aria-label={wireframe ? 'Chuyển sang chế độ đặc' : 'Chuyển sang chế độ khung dây'}
            aria-pressed={wireframe}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer max-md:h-11 max-md:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              wireframe ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
            }`}
          >
            <Icon name="grid_4x4" size={18} />
          </button>

          {/* Camera Mode Toggle (Perspective / Ortho) */}
          <button
            type="button"
            onClick={handleToggleCameraMode}
            title={cameraMode === 'orthographic' ? 'Đang trực giao — bấm để chuyển phối cảnh' : 'Đang phối cảnh — bấm để chuyển trực giao'}
            aria-label={cameraMode === 'orthographic' ? 'Chuyển sang phối cảnh' : 'Chuyển sang trực giao'}
            aria-pressed={cameraMode === 'orthographic'}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-mono font-bold text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg cursor-pointer max-md:h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Icon name="view_in_ar" size={18} />
            <span>{cameraMode === 'orthographic' ? 'TRỰC GIAO' : 'PHỐI CẢNH'}</span>
          </button>

          <div className="w-px h-4 bg-line shrink-0" />

          {/* Bounding Box Toggle */}
          <button
            type="button"
            onClick={handleToggleBoundingBox}
            title={isBoundingBoxActive ? 'Ẩn khung bao' : 'Hiện khung bao'}
            aria-label={isBoundingBoxActive ? 'Ẩn khung bao' : 'Hiện khung bao'}
            aria-pressed={isBoundingBoxActive}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer max-md:h-11 max-md:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isBoundingBoxActive ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
            }`}
          >
            <Icon name="square_foot" size={18} />
          </button>

          {/* Caliper 2-Point Measurement Toggle */}
          <button
            type="button"
            onClick={handleToggleMeasurement}
            title={isMeasurementActive ? 'Tắt thước cặp' : 'Bật thước cặp 2 điểm'}
            aria-label={isMeasurementActive ? 'Tắt thước cặp' : 'Bật thước cặp 2 điểm'}
            aria-pressed={isMeasurementActive}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer max-md:h-11 max-md:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isMeasurementActive ? 'bg-warning-tint text-warning border border-warning/40' : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
            }`}
          >
            <Icon name="straighten" size={18} />
          </button>
        </div>

        {/* View presets (Iso / Top / Front / Side) — segmented, top-right */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-surface/95 p-1 font-mono text-xs shadow-e2 backdrop-blur-md">
          {(['iso', 'top', 'front', 'side'] as const).map((ang) => (
            <button
              key={ang}
              type="button"
              onClick={() => setCameraAngle(ang)}
              title={`Góc nhìn ${VIEW_ANGLE_LABEL[ang]}`}
              aria-label={`Góc nhìn ${VIEW_ANGLE_LABEL[ang]}`}
              aria-pressed={activeAngle === ang}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-2 font-bold uppercase transition-colors cursor-pointer max-md:h-11 max-md:min-w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                activeAngle === ang
                  ? 'bg-primary text-primary-fg'
                  : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
              }`}
            >
              {VIEW_ANGLE_LABEL[ang]}
            </button>
          ))}
        </div>
      </div>

      {/* Dedicated Multi-Plate Dock (Positioned at Bottom-Left above Slicer) */}
      {plates && plates.length > 1 && (
        <div className="absolute bottom-16 left-3 z-panel pointer-events-auto flex items-center gap-1.5 rounded-md border border-line bg-surface/95 p-1.5 font-mono text-xs shadow-e2 backdrop-blur-md max-w-[calc(100%-9rem)] overflow-x-auto">
          <span className="px-2 py-1 text-xs text-fg-muted font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Icon name="layers" size={16} className="text-fg-muted" />
            Bàn In:
          </span>
          <button
            type="button"
            onClick={() => {
              if (onSelectPlate) onSelectPlate(0);
              handleAutoFit();
            }}
            aria-pressed={activePlateIndex === 0}
            className={`px-2.5 h-8 rounded-sm font-bold transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activePlateIndex === 0
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
            }`}
            title="Hiển thị tất cả chi tiết đã lắp ráp"
          >
            Tất cả
          </button>
          {plates.map((plate) => {
            const isActive = activePlateIndex === plate.index;
            // F7: chỉ hiện gram/giờ khi CHÍNH tệp khai số cho bàn này.
            const meta = plateMetaText(plate);
            return (
              <button
                key={plate.index}
                type="button"
                onClick={() => {
                  if (onSelectPlate) onSelectPlate(plate.index);
                  handleAutoFit();
                }}
                aria-pressed={isActive}
                className={`px-2.5 h-8 rounded-sm font-bold transition-colors cursor-pointer text-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-primary text-primary-fg'
                    : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
                }`}
                title={`Chuyển sang Bàn ${plate.index}`}
              >
                <span className="block">Bàn {plate.index}</span>
                {meta && (
                  <span
                    className={`block text-xs font-normal tabular-nums ${
                      isActive ? 'text-primary-fg/80' : 'text-fg-subtle'
                    }`}
                  >
                    {meta}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Bed overflow warning banner when dimensions exceed build plate */}
      {isBedOverflow && (
        <div className="absolute top-32 left-3 right-3 z-panel bg-danger-tint border border-danger/40 text-danger px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-pulse motion-reduce:animate-none">
          <div className="flex items-center gap-2.5">
            <Icon name="warning" size={24} className="text-danger shrink-0" />
            <div>
              <strong className="font-bold text-danger block sm:inline">
                CẢNH BÁO: KÍCH THƯỚC VƯỢT KHỔ BÀN IN ({bed ? `${bed.x} × ${bed.y} × ${bed.z} mm` : 'chưa khai khổ bàn'})
              </strong>
              <span className="text-xs text-danger/80 block sm:inline sm:ml-2">
                Mô hình ({(modelDims.x * scaleMultiplier).toFixed(1)} × {(modelDims.y * scaleMultiplier).toFixed(1)} × {(modelDims.z * scaleMultiplier).toFixed(1)} mm) vượt quá khổ máy.
              </span>
            </div>
          </div>
          {onUpdateTransform && (
            <button
              type="button"
              onClick={handleScaleToFitBed}
              className="px-3 h-10 bg-danger hover:brightness-95 text-white rounded-md font-bold text-sm transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Icon name="fit_screen" size={18} />
              Co vừa bàn
            </button>
          )}
        </div>
      )}

      {/* Metrology Overlay: Caliper 2-point measurement indicator */}
      {isMeasurementActive && (
        <div className="absolute bottom-32 left-3 bg-surface/95 p-3 rounded-lg border border-line text-xs text-fg-muted max-w-xs shadow-e2 backdrop-blur-md space-y-2 z-panel font-mono">
          <div className="flex items-center justify-between gap-2 font-bold text-warning">
            <span className="flex items-center gap-1.5">
              <Icon name="straighten" size={16} />
              THƯỚC CẶP 2 ĐIỂM
            </span>
            <button
              type="button"
              onClick={clearMeasurement}
              className="text-xs text-fg-muted hover:text-fg uppercase underline cursor-pointer"
            >
              Xóa điểm
            </button>
          </div>
          <div className="text-xs text-fg-muted leading-relaxed">
            {caliperPoints.length === 0 && '1. Nhấp chuột chọn điểm thứ nhất trên phôi 3D...'}
            {caliperPoints.length === 1 && '2. Nhấp chuột chọn điểm thứ hai để tính khoảng cách...'}
            {caliperPoints.length === 2 && (
              <div className="bg-warning-tint p-2 rounded-md border border-warning/40 mt-1">
                <span className="text-warning text-xs block">KHOẢNG CÁCH THỰC TẾ:</span>
                <span className="text-warning text-sm font-bold block tabular-nums">
                  {caliperDistance} mm
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredPartName && (
        <div className="absolute bottom-32 right-3 bg-surface/95 px-3 py-1.5 rounded-md border border-line text-xs font-mono text-fg-muted pointer-events-none shadow-e2 backdrop-blur-md z-panel">
          <span className="text-fg-muted">Chi tiết:</span> {hoveredPartName}
        </div>
      )}

      {/* Bottom-Right: fit / reset / capture toolbar */}
      <div className="absolute bottom-16 right-3 z-panel flex items-center gap-1 rounded-md border border-line bg-surface/95 p-1.5 shadow-e2 backdrop-blur-md">
        <button
          type="button"
          onClick={handleAutoFit}
          title="Căn mô hình vừa khung nhìn"
          aria-label="Căn mô hình vừa khung nhìn"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg cursor-pointer max-md:h-11 max-md:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Icon name="fit_screen" size={18} />
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          title="Đặt lại góc nhìn chuẩn"
          aria-label="Đặt lại góc nhìn chuẩn"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg cursor-pointer max-md:h-11 max-md:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Icon name="center_focus_strong" size={18} />
        </button>
        <button
          type="button"
          onClick={handleCaptureThumbnail}
          title="Chụp ảnh mô hình 3D (PNG)"
          aria-label="Chụp ảnh mô hình 3D (PNG)"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg cursor-pointer max-md:h-11 max-md:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Icon name="photo_camera" size={18} />
        </button>
      </div>

      {/* Bottom: Unified Layer Slicer progress slider with percentage and clipping plane */}
      <div className="absolute bottom-3 left-3 right-3 bg-surface/95 px-4 py-2.5 rounded-lg border border-line flex items-center justify-between gap-4 text-fg-muted font-mono z-panel shadow-e2 backdrop-blur-md">
        <div className="flex items-center gap-2 shrink-0">
          <Icon name="layers" size={18} className="text-fg-muted" />
          <span className="text-xs text-fg-muted font-bold">LỚP IN: {currentSlice}%</span>
          <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-xs font-mono text-fg-muted tabular-nums">
            {transform.unit === 'inch' ? 'in' : 'mm'} · {transform.scaleUniform}%
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={currentSlice}
          aria-label="Cắt lớp mô hình theo chiều cao"
          onChange={(e) => handleSliceChange(Number(e.target.value))}
          className="w-full min-w-0 flex-1 h-1.5 bg-line-subtle rounded-full appearance-none cursor-pointer accent-primary"
          title={`Cắt lớp 3D: ${currentSlice}%`}
        />
        <div className="hidden sm:flex items-center gap-2 text-xs text-fg-muted shrink-0">
          <span className="text-fg font-bold tabular-nums">
            {((modelHeight * currentSlice) / 100).toFixed(1)} mm
          </span>
          <span className="text-fg-muted">/</span>
          <span className="text-fg-muted tabular-nums">{modelHeight.toFixed(1)} mm</span>
          <span className="hidden sm:inline px-1.5 py-0.5 bg-surface-muted border border-line rounded-sm text-xs text-fg-muted tabular-nums">
            Lớp in 0,16 mm
          </span>
        </div>
      </div>
  </>
);
