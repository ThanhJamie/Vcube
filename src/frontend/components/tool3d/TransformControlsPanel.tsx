import React, { useState } from 'react';
import { TransformState } from '@/types';
import { Icon } from '@frontend/ui';

interface TransformControlsPanelProps {
  transform: TransformState;
  onUpdateTransform: (updated: Partial<TransformState>) => void;
  onResetTransform: () => void;
  onLayFlat: () => void;
  onCenterModel: () => void;
}

export const TransformControlsPanel: React.FC<TransformControlsPanelProps> = ({
  transform,
  onUpdateTransform,
  onResetTransform,
  onLayFlat,
  onCenterModel
}) => {
  const [activeTab, setActiveTab] = useState<'scale' | 'rotate' | 'move'>('scale');

  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line-subtle pb-3">
        <div>
          <h3 className="font-semibold text-base tracking-tight text-fg flex items-center gap-2 mt-0.5">
            <Icon name="transform" size={18} className="text-primary" />
            Tỷ lệ, góc xoay & toạ độ bàn in
          </h3>
        </div>
        <button
          type="button"
          onClick={onResetTransform}
          className="inline-flex h-8 max-md:min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Icon name="restart_alt" size={18} />
          Đặt Lại
        </button>
      </div>

      {/* Mode Sub-Tabs (Scale / Rotate / Move) */}
      <div
        role="tablist"
        aria-label="Chế độ hiệu chỉnh mô hình"
        className="grid grid-cols-3 gap-1 rounded-md border border-line bg-surface-muted p-1 text-xs"
      >
        <button
          type="button"
          role="tab"
          id="transform-tab-scale"
          aria-selected={activeTab === 'scale'}
          aria-controls="transform-panel-scale"
          onClick={() => setActiveTab('scale')}
          className={`py-1.5 max-md:min-h-11 font-medium rounded-sm text-sm flex items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === 'scale' ? 'bg-surface text-fg font-semibold shadow-e1' : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="open_in_full" size={18} />
          Thu phóng
        </button>
        <button
          type="button"
          role="tab"
          id="transform-tab-rotate"
          aria-selected={activeTab === 'rotate'}
          aria-controls="transform-panel-rotate"
          onClick={() => setActiveTab('rotate')}
          className={`py-1.5 max-md:min-h-11 font-medium rounded-sm text-sm flex items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === 'rotate' ? 'bg-surface text-fg font-semibold shadow-e1' : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="rotate_right" size={18} />
          Xoay
        </button>
        <button
          type="button"
          role="tab"
          id="transform-tab-move"
          aria-selected={activeTab === 'move'}
          aria-controls="transform-panel-move"
          onClick={() => setActiveTab('move')}
          className={`py-1.5 max-md:min-h-11 font-medium rounded-sm text-sm flex items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === 'move' ? 'bg-surface text-fg font-semibold shadow-e1' : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="drag_pan" size={18} />
          Toạ độ
        </button>
      </div>

      {/* TAB 1: SCALE CONTROLS */}
      {activeTab === 'scale' && (
        <div role="tabpanel" id="transform-panel-scale" aria-labelledby="transform-tab-scale" className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="transform-scale-uniform" className="font-semibold text-fg flex items-center gap-1">
                <span>Tỷ lệ đồng nhất:</span>
              </label>
              <span className="font-tech font-bold text-primary text-sm">
                {transform.scaleUniform}%
              </span>
            </div>
            <input
              id="transform-scale-uniform"
              type="range"
              min="20"
              max="300"
              step="5"
              value={transform.scaleUniform}
              onChange={(e) => onUpdateTransform({ scaleUniform: Number(e.target.value) })}
              className="w-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="flex justify-between text-xs text-fg-muted font-tech">
              <span>20%</span>
              <span>50%</span>
              <span className="font-bold text-fg">100% Gốc</span>
              <span>200%</span>
              <span>300%</span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-2 pt-1">
            {[50, 75, 100, 125, 150, 200].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onUpdateTransform({ scaleUniform: s })}
                className={`h-8 max-md:min-h-11 flex-1 py-1 text-xs font-mono font-medium tabular-nums rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  transform.scaleUniform === s
                    ? 'bg-primary text-primary-fg border-primary'
                    : 'bg-surface hover:bg-surface-muted border-line text-fg-muted'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ROTATE CONTROLS */}
      {activeTab === 'rotate' && (
        <div role="tabpanel" id="transform-panel-rotate" aria-labelledby="transform-tab-rotate" className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-fg block">
              Xoay nhanh 90° từng trục:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateTransform({ rotationX: (transform.rotationX + 90) % 360 })}
                className="h-10 max-md:min-h-11 px-3 bg-surface hover:bg-surface-muted border border-line-control text-sm font-medium text-fg rounded-md transition-colors flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icon name="sync" size={18} />
                X: +90°
              </button>
              <button
                type="button"
                onClick={() => onUpdateTransform({ rotationY: (transform.rotationY + 90) % 360 })}
                className="h-10 max-md:min-h-11 px-3 bg-surface hover:bg-surface-muted border border-line-control text-sm font-medium text-fg rounded-md transition-colors flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icon name="sync" size={18} />
                Y: +90°
              </button>
              <button
                type="button"
                onClick={() => onUpdateTransform({ rotationZ: (transform.rotationZ + 90) % 360 })}
                className="h-10 max-md:min-h-11 px-3 bg-surface hover:bg-surface-muted border border-line-control text-sm font-medium text-fg rounded-md transition-colors flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icon name="sync" size={18} />
                Z: +90°
              </button>
            </div>
          </div>

          {/* Arbitrary Angle Sliders */}
          <div className="space-y-2 pt-2 border-t border-line-subtle text-xs">
            <div className="flex items-center justify-between">
              <span className="text-fg-muted">Góc Xoay Trục X:</span>
              <span className="font-tech font-bold text-primary">{transform.rotationX}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={transform.rotationX}
              aria-label="Góc xoay trục X"
              onChange={(e) => onUpdateTransform({ rotationX: Number(e.target.value) })}
              className="w-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>
      )}

      {/* TAB 3: MOVE / POSITION CONTROLS */}
      {activeTab === 'move' && (
        <div role="tabpanel" id="transform-panel-move" aria-labelledby="transform-tab-move" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-fg-muted">Tọa Độ X (mm):</span>
                <span className="font-tech font-bold text-primary">{transform.positionX || 0}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={transform.positionX || 0}
                aria-label="Tọa độ X (mm)"
                onChange={(e) => onUpdateTransform({ positionX: Number(e.target.value) })}
                className="w-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-fg-muted">Tọa Độ Y (mm):</span>
                <span className="font-tech font-bold text-primary">{transform.positionY || 0}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={transform.positionY || 0}
                aria-label="Tọa độ Y (mm)"
                onChange={(e) => onUpdateTransform({ positionY: Number(e.target.value) })}
                className="w-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Placement Quick Utilities (Lay Flat & Center) */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line-subtle">
        <button
          type="button"
          onClick={onLayFlat}
          className="h-10 max-md:min-h-11 px-3 bg-primary hover:bg-primary-hover text-primary-fg text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Icon name="horizontal_distribute" size={18} />
          Áp Sát Bàn In
        </button>
        <button
          type="button"
          onClick={onCenterModel}
          className="h-10 max-md:min-h-11 px-3 bg-surface hover:bg-surface-muted border border-line-control text-fg text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Icon name="filter_center_focus" size={18} />
          Căn Giữa Bàn
        </button>
      </div>

      {/* Unit Conversion Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-line-subtle text-xs">
        <span className="text-fg-muted">Đơn vị hiển thị:</span>
        <div className="flex items-center gap-1 border border-line p-0.5 rounded-md bg-surface-muted">
          <button
            type="button"
            onClick={() => onUpdateTransform({ unit: 'mm' })}
            aria-pressed={transform.unit === 'mm'}
            className={`px-3 py-1 max-md:min-h-11 text-xs font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              transform.unit === 'mm' ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Mi-li-mét (mm)
          </button>
          <button
            type="button"
            onClick={() => onUpdateTransform({ unit: 'inch' })}
            aria-pressed={transform.unit === 'inch'}
            className={`px-3 py-1 max-md:min-h-11 text-xs font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              transform.unit === 'inch' ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Inch (in)
          </button>
        </div>
      </div>
    </div>
  );
};
