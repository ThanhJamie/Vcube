import React from 'react';

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
      className={`flex items-center gap-1.5 bg-[#091426]/85 backdrop-blur-md px-2 py-1.5 rounded-xl border border-[#334155]/60 shadow-xl text-white ${className}`}
    >
      {/* Optional Angle Presets (ISO, TOP, FRONT, SIDE) */}
      {showAnglePresets && onSelectAngle && (
        <div className="hidden sm:flex items-center gap-0.5 bg-[#0f172a] p-0.5 rounded-lg border border-[#334155]/40 mr-1 text-[9px] font-mono">
          {(['iso', 'top', 'front', 'side'] as const).map((ang) => (
            <button
              key={ang}
              type="button"
              onClick={() => onSelectAngle(ang)}
              className={`px-2 py-0.5 rounded-md uppercase font-bold transition-colors cursor-pointer ${
                activeAngle === ang
                  ? 'bg-[#00687A] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
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
          className={`p-1.5 rounded-lg hover:bg-[#1e293b] transition-colors cursor-pointer ${
            cameraMode === 'orthographic'
              ? 'text-[#57DFFE] bg-[#00687A]/30'
              : 'text-slate-400 hover:text-white'
          }`}
          aria-label="Toggle camera mode"
        >
          <span className="material-symbols-outlined text-base">
            {cameraMode === 'orthographic' ? 'crop_square' : 'deployed_code'}
          </span>
        </button>
      )}

      {/* Auto Rotate 360° Toggle */}
      <button
        type="button"
        onClick={onToggleRotate}
        title={isRotating ? 'Dừng xoay 360°' : 'Bật xoay 360° tự động'}
        className={`p-1.5 rounded-lg hover:bg-[#1e293b] transition-colors cursor-pointer ${
          isRotating ? 'text-[#57DFFE] bg-[#00687A]/30' : 'text-slate-400 hover:text-white'
        }`}
        aria-label="Toggle auto rotate"
      >
        <span className="material-symbols-outlined text-base">360</span>
      </button>

      {/* Wireframe / Solid Toggle */}
      <button
        type="button"
        onClick={onToggleWireframe}
        title={wireframe ? 'Chế độ Đặc (Solid)' : 'Chế độ Khung dây (Wireframe)'}
        className={`p-1.5 rounded-lg hover:bg-[#1e293b] transition-colors cursor-pointer ${
          wireframe ? 'text-[#57DFFE] bg-[#00687A]/30' : 'text-slate-400 hover:text-white'
        }`}
        aria-label="Toggle wireframe"
      >
        <span className="material-symbols-outlined text-base">grid_4x4</span>
      </button>

      {/* Reset Camera View */}
      <button
        type="button"
        onClick={onResetView}
        title="Đặt lại góc nhìn chuẩn (Center Focus)"
        className="p-1.5 rounded-lg hover:bg-[#1e293b] text-slate-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Reset camera"
      >
        <span className="material-symbols-outlined text-base">center_focus_strong</span>
      </button>

      {/* Fullscreen Toggle */}
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Xem toàn màn hình'}
          className="p-1.5 rounded-lg hover:bg-[#1e293b] text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Toggle fullscreen"
        >
          <span className="material-symbols-outlined text-base">
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
      )}
    </div>
  );
};

