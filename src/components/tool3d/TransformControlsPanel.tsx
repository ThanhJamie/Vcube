import React, { useState } from 'react';
import { TransformState } from '../../types';

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
    <div className="bg-white border border-black/10 p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <div>
          <span className="font-sans text-[9px] uppercase tracking-widest text-[#7D7565] font-bold block">
            Hiệu Chỉnh Không Gian // Model Transforms & Bed Positioning
          </span>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#1C1C1C] flex items-center gap-2 mt-0.5">
            <span className="material-symbols-outlined text-base text-[#00687a]">transform</span>
            Tỷ Lệ, Góc Xoay & Tọa Độ Bàn In
          </h3>
        </div>
        <button
          type="button"
          onClick={onResetTransform}
          className="text-[10px] uppercase font-sans tracking-wider text-[#7D7565] hover:text-[#1C1C1C] flex items-center gap-1 hover:underline font-bold"
        >
          <span className="material-symbols-outlined text-xs">restart_alt</span>
          Đặt Lại
        </button>
      </div>

      {/* Mode Sub-Tabs (Scale / Rotate / Move) */}
      <div className="grid grid-cols-3 gap-1 bg-[#F7F6F2] p-1 rounded-lg border border-black/10 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('scale')}
          className={`py-1.5 font-bold rounded text-xs flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'scale' ? 'bg-[#00687a] text-white shadow-xs' : 'text-[#5A554C] hover:text-[#1C1C1C]'
          }`}
        >
          <span className="material-symbols-outlined text-xs">open_in_full</span>
          Scale (Thu Phóng)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rotate')}
          className={`py-1.5 font-bold rounded text-xs flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'rotate' ? 'bg-[#00687a] text-white shadow-xs' : 'text-[#5A554C] hover:text-[#1C1C1C]'
          }`}
        >
          <span className="material-symbols-outlined text-xs">rotate_right</span>
          Rotate (Xoay)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('move')}
          className={`py-1.5 font-bold rounded text-xs flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'move' ? 'bg-[#00687a] text-white shadow-xs' : 'text-[#5A554C] hover:text-[#1C1C1C]'
          }`}
        >
          <span className="material-symbols-outlined text-xs">drag_pan</span>
          Move (Tọa Độ)
        </button>
      </div>

      {/* TAB 1: SCALE CONTROLS */}
      {activeTab === 'scale' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[#1C1C1C] flex items-center gap-1">
                <span>Tỷ lệ đồng nhất (Uniform Scale):</span>
              </label>
              <span className="font-tech font-bold text-[#00687a] text-sm">
                {transform.scaleUniform}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="300"
              step="5"
              value={transform.scaleUniform}
              onChange={(e) => onUpdateTransform({ scaleUniform: Number(e.target.value) })}
              className="w-full accent-[#00687a] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#7D7565] font-tech">
              <span>20%</span>
              <span>50%</span>
              <span className="font-bold text-[#1C1C1C]">100% Gốc</span>
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
                className={`flex-1 py-1 text-[11px] font-tech font-bold rounded border transition-colors ${
                  transform.scaleUniform === s
                    ? 'bg-[#00687a] text-white border-[#00687a]'
                    : 'bg-[#F7F6F2] hover:bg-[#EAE8E0] border-black/10 text-[#1C1C1C]'
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
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#1C1C1C] block">
              Xoay nhanh 90° từng trục:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateTransform({ rotationX: (transform.rotationX + 90) % 360 })}
                className="py-2 px-3 bg-[#F7F6F2] hover:bg-[#EAE8E0] border border-black/15 text-xs font-tech font-bold text-[#1C1C1C] rounded transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">sync</span>
                X: +90°
              </button>
              <button
                type="button"
                onClick={() => onUpdateTransform({ rotationY: (transform.rotationY + 90) % 360 })}
                className="py-2 px-3 bg-[#F7F6F2] hover:bg-[#EAE8E0] border border-black/15 text-xs font-tech font-bold text-[#1C1C1C] rounded transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">sync</span>
                Y: +90°
              </button>
              <button
                type="button"
                onClick={() => onUpdateTransform({ rotationZ: (transform.rotationZ + 90) % 360 })}
                className="py-2 px-3 bg-[#F7F6F2] hover:bg-[#EAE8E0] border border-black/15 text-xs font-tech font-bold text-[#1C1C1C] rounded transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">sync</span>
                Z: +90°
              </button>
            </div>
          </div>

          {/* Arbitrary Angle Sliders */}
          <div className="space-y-2 pt-2 border-t border-black/5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#5A554C]">Góc Xoay Trục X:</span>
              <span className="font-tech font-bold text-[#00687a]">{transform.rotationX}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={transform.rotationX}
              onChange={(e) => onUpdateTransform({ rotationX: Number(e.target.value) })}
              className="w-full accent-[#00687a]"
            />
          </div>
        </div>
      )}

      {/* TAB 3: MOVE / POSITION CONTROLS */}
      {activeTab === 'move' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[#5A554C]">Tọa Độ X (mm):</span>
                <span className="font-tech font-bold text-[#00687a]">{transform.positionX || 0}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={transform.positionX || 0}
                onChange={(e) => onUpdateTransform({ positionX: Number(e.target.value) })}
                className="w-full accent-[#00687a]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[#5A554C]">Tọa Độ Y (mm):</span>
                <span className="font-tech font-bold text-[#00687a]">{transform.positionZ || 0}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={transform.positionZ || 0}
                onChange={(e) => onUpdateTransform({ positionZ: Number(e.target.value) })}
                className="w-full accent-[#00687a]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Placement Quick Utilities (Lay Flat & Center) */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5">
        <button
          type="button"
          onClick={onLayFlat}
          className="py-2 px-3 bg-[#091426] hover:bg-[#1E293B] text-white text-xs font-sans font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">horizontal_distribute</span>
          Áp Sát Bàn In
        </button>
        <button
          type="button"
          onClick={onCenterModel}
          className="py-2 px-3 bg-[#F7F6F2] hover:bg-[#EAE8E0] border border-black/20 text-[#1C1C1C] text-xs font-sans font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">filter_center_focus</span>
          Căn Giữa Bàn
        </button>
      </div>

      {/* Unit Conversion Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs">
        <span className="text-[#5A554C]">Đơn vị hiển thị:</span>
        <div className="flex items-center gap-1 border border-black/20 p-0.5 rounded bg-[#F7F6F2]">
          <button
            type="button"
            onClick={() => onUpdateTransform({ unit: 'mm' })}
            className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
              transform.unit === 'mm' ? 'bg-[#00687a] text-white' : 'text-[#5A554C] hover:text-[#1C1C1C]'
            }`}
          >
            Millimet (mm)
          </button>
          <button
            type="button"
            onClick={() => onUpdateTransform({ unit: 'inch' })}
            className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
              transform.unit === 'inch' ? 'bg-[#00687a] text-white' : 'text-[#5A554C] hover:text-[#1C1C1C]'
            }`}
          >
            Inches (in)
          </button>
        </div>
      </div>
    </div>
  );
};
