import React from 'react';
import { Icon } from '@frontend/ui';

/** Nhãn VI cho 4 góc nhìn chuẩn CAD (D0: hiển thị VI, giữ mã kỹ thuật ISO/TOP/FRONT/SIDE trong code). */
const VIEW_ANGLE_LABEL: Record<'iso' | 'top' | 'front' | 'side', string> = {
  iso: 'CHUẨN',
  top: 'TRÊN',
  front: 'TRƯỚC',
  side: 'CẠNH'
};

export interface UnifiedCadToolbarProps {
  isRotating: boolean;
  onToggleRotate: () => void;
  wireframe: boolean;
  onToggleWireframe: () => void;
  onResetView: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  activeAngle?: 'iso' | 'top' | 'front' | 'side';
  onSelectAngle?: (angle: 'iso' | 'top' | 'front' | 'side') => void;
  showAnglePresets?: boolean;
  cameraMode?: 'perspective' | 'orthographic';
  onToggleCameraMode?: () => void;
  className?: string;
}

export const UnifiedCadToolbar: React.FC<UnifiedCadToolbarProps> = ({
  isRotating,
  onToggleRotate,
  wireframe,
  onToggleWireframe,
  onResetView,
  isFullscreen,
  onToggleFullscreen,
  activeAngle = 'iso',
  onSelectAngle,
  showAnglePresets = false,
  cameraMode,
  onToggleCameraMode,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border border-line bg-surface/95 p-1.5 text-fg shadow-e2 backdrop-blur-md ${className}`}
    >
      {/* Optional Angle Presets (ISO, TOP, FRONT, SIDE) */}
      {showAnglePresets && onSelectAngle && (
        <div className="hidden sm:flex items-center gap-0.5 rounded-sm border border-line bg-surface-muted p-0.5 mr-1 text-xs font-mono">
          {(['iso', 'top', 'front', 'side'] as const).map((ang) => (
            <button
              key={ang}
              type="button"
              onClick={() => onSelectAngle(ang)}
              className={`px-2 py-0.5 rounded-sm uppercase font-bold transition-colors active:scale-[0.97] select-none cursor-pointer ${
                activeAngle === ang
                  ? 'bg-primary text-primary-fg'
                  : 'text-fg-muted hover:text-fg'
              }`}
              title={`Góc nhìn ${VIEW_ANGLE_LABEL[ang]}`}
              aria-label={`Góc nhìn ${VIEW_ANGLE_LABEL[ang]}`}
              aria-pressed={activeAngle === ang}
            >
              {VIEW_ANGLE_LABEL[ang]}
            </button>
          ))}
        </div>
      )}

      {/* Camera Mode Toggle (Perspective / Orthographic) */}
      {onToggleCameraMode && (
        <button
          type="button"
          onClick={onToggleCameraMode}
          aria-pressed={cameraMode === 'orthographic'}
          title={
            cameraMode === 'orthographic'
              ? 'Chuyển sang phối cảnh'
              : 'Chuyển sang trực giao'
          }
          className={`inline-flex h-10 w-10 max-md:size-11 items-center justify-center rounded-md hover:bg-surface-muted transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            cameraMode === 'orthographic'
              ? 'bg-primary text-primary-fg'
              : 'text-fg-muted hover:text-fg'
          }`}
          aria-label={cameraMode === 'orthographic' ? 'Chuyển sang phối cảnh' : 'Chuyển sang trực giao'}
        >
          <Icon name={cameraMode === 'orthographic' ? 'crop_square' : 'deployed_code'} size={18} />
        </button>
      )}

      {/* Auto Rotate 360° Toggle */}
      <button
        type="button"
        onClick={onToggleRotate}
        title={isRotating ? 'Dừng xoay 360°' : 'Bật xoay 360° tự động'}
        aria-pressed={isRotating}
        className={`inline-flex h-10 w-10 max-md:size-11 items-center justify-center rounded-md hover:bg-surface-muted transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isRotating ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
        }`}
        aria-label={isRotating ? 'Dừng xoay tự động 360°' : 'Bật xoay tự động 360°'}
      >
        <Icon name="360" size={18} />
      </button>

      {/* Wireframe / Solid Toggle */}
      <button
        type="button"
        onClick={onToggleWireframe}
        title={wireframe ? 'Chuyển sang chế độ đặc' : 'Chuyển sang chế độ khung dây'}
        aria-pressed={wireframe}
        className={`inline-flex h-10 w-10 max-md:size-11 items-center justify-center rounded-md hover:bg-surface-muted transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          wireframe ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
        }`}
        aria-label={wireframe ? 'Chuyển sang chế độ đặc' : 'Chuyển sang chế độ khung dây'}
      >
        <Icon name="grid_4x4" size={18} />
      </button>

      {/* Reset Camera View */}
      <button
        type="button"
        onClick={onResetView}
        title="Đặt lại góc nhìn chuẩn"
        className="inline-flex h-10 w-10 max-md:size-11 items-center justify-center rounded-md hover:bg-surface-muted text-fg-muted hover:text-fg transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Đặt lại góc nhìn chuẩn"
      >
        <Icon name="center_focus_strong" size={18} />
      </button>

      {/* Fullscreen Toggle */}
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Xem toàn màn hình'}
          className="inline-flex h-10 w-10 max-md:size-11 items-center justify-center rounded-md hover:bg-surface-muted text-fg-muted hover:text-fg transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Xem toàn màn hình'}
        >
          <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={18} />
        </button>
      )}
    </div>
  );
};

