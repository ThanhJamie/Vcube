import React from 'react';
import { Icon } from '@frontend/ui';

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
      className={`flex items-center gap-1.5 bg-surface-inverse/85 backdrop-blur-md px-2 py-1.5 rounded-lg border border-surface-inverse-raised/60 shadow-e3 text-on-inverse ${className}`}
    >
      {/* Optional Angle Presets (ISO, TOP, FRONT, SIDE) */}
      {showAnglePresets && onSelectAngle && (
        <div className="hidden sm:flex items-center gap-0.5 bg-surface-inverse p-0.5 rounded-sm border border-surface-inverse-raised/40 mr-1 text-xs font-mono">
          {(['iso', 'top', 'front', 'side'] as const).map((ang) => (
            <button
              key={ang}
              type="button"
              onClick={() => onSelectAngle(ang)}
              className={`px-2 py-0.5 rounded-sm uppercase font-bold transition-all active:scale-95 select-none cursor-pointer ${
                activeAngle === ang
                  ? 'bg-primary text-primary-fg shadow-e1'
                  : 'text-on-inverse/70 hover:text-on-inverse'
              }`}
              title={`Góc nhìn ${ang.toUpperCase()}`}
            >
              {ang}
            </button>
          ))}
        </div>
      )}

      {/* Camera Mode Toggle (Perspective / Orthographic) */}
      {onToggleCameraMode && (
        <button
          type="button"
          onClick={onToggleCameraMode}
          title={
            cameraMode === 'orthographic'
              ? 'Chuyển sang Phối cảnh (Perspective)'
              : 'Chuyển sang Trục đo phẳng (Orthographic)'
          }
          className={`p-1.5 rounded-md hover:bg-surface-inverse-raised transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            cameraMode === 'orthographic'
              ? 'text-accent bg-primary/30'
              : 'text-on-inverse/70 hover:text-on-inverse'
          }`}
          aria-label="Toggle camera mode"
        >
          <Icon name={cameraMode === 'orthographic' ? 'crop_square' : 'deployed_code'} size={18} />
        </button>
      )}

      {/* Auto Rotate 360° Toggle */}
      <button
        type="button"
        onClick={onToggleRotate}
        title={isRotating ? 'Dừng xoay 360°' : 'Bật xoay 360° tự động'}
        className={`p-1.5 rounded-md hover:bg-surface-inverse-raised transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isRotating ? 'text-accent bg-primary/30' : 'text-on-inverse/70 hover:text-on-inverse'
        }`}
        aria-label="Toggle auto rotate"
      >
        <Icon name="360" size={18} />
      </button>

      {/* Wireframe / Solid Toggle */}
      <button
        type="button"
        onClick={onToggleWireframe}
        title={wireframe ? 'Chế độ Đặc (Solid)' : 'Chế độ Khung dây (Wireframe)'}
        className={`p-1.5 rounded-md hover:bg-surface-inverse-raised transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          wireframe ? 'text-accent bg-primary/30' : 'text-on-inverse/70 hover:text-on-inverse'
        }`}
        aria-label="Toggle wireframe"
      >
        <Icon name="grid_4x4" size={18} />
      </button>

      {/* Reset Camera View */}
      <button
        type="button"
        onClick={onResetView}
        title="Đặt lại góc nhìn chuẩn (Center Focus)"
        className="p-1.5 rounded-md hover:bg-surface-inverse-raised text-on-inverse/70 hover:text-on-inverse transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Reset camera"
      >
        <Icon name="center_focus_strong" size={18} />
      </button>

      {/* Fullscreen Toggle */}
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Xem toàn màn hình'}
          className="p-1.5 rounded-md hover:bg-surface-inverse-raised text-on-inverse/70 hover:text-on-inverse transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Toggle fullscreen"
        >
          <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={18} />
        </button>
      )}
    </div>
  );
};

