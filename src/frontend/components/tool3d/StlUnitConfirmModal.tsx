import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@frontend/ui';

interface StlUnitConfirmModalProps {
  isOpen: boolean;
  fileName: string;
  dimensionsMm: { x: number; y: number; z: number };
  onConfirmMm: () => void;
  onConvertToInch: () => void;
  onCancel: () => void;
}

export const StlUnitConfirmModal: React.FC<StlUnitConfirmModalProps> = ({
  isOpen,
  fileName,
  dimensionsMm,
  onConfirmMm,
  onConvertToInch,
  onCancel
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const dimsInchesConverted = {
    x: (dimensionsMm.x * 25.4).toFixed(1),
    y: (dimensionsMm.y * 25.4).toFixed(1),
    z: (dimensionsMm.z * 25.4).toFixed(1)
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-surface-inverse/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-surface rounded-lg max-w-lg w-full p-6 sm:p-7 shadow-e3 space-y-5 animate-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-warning-tint border border-warning/40 text-warning flex items-center justify-center shrink-0">
            <Icon name="straighten" size={28} />
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-fg-subtle font-bold block">
              Xác Nhận Đơn Vị Đo STL // Unit Verification
            </span>
            <h3 className="font-sans font-bold text-base sm:text-lg text-fg mt-0.5">
              Xác Nhận Đơn Vị Đo Cho File STL
            </h3>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg text-xs space-y-2 text-warning">
          <p className="font-semibold">
            Tập tin <span className="font-mono text-fg font-bold">{fileName}</span> là định dạng STL tiêu chuẩn.
          </p>
          <p className="leading-relaxed">
            Định dạng STL không lưu trữ thông tin đơn vị đo chuẩn trong header. Hệ thống hiện đang hiểu kích thước hình học là <strong>Millimet (mm)</strong>.
          </p>
        </div>

        {/* Dimension Comparison Cards */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 border-2 border-primary bg-primary-tint/50 rounded-lg">
            <div className="text-xs uppercase tracking-wider font-bold text-primary mb-1">
              Khuyến nghị: Chuẩn Millimet (mm)
            </div>
            <div className="font-mono text-base font-bold text-fg">
              {dimensionsMm.x} × {dimensionsMm.y} × {dimensionsMm.z} mm
            </div>
            <div className="text-xs text-fg-subtle mt-1">Phù hợp kích thước bàn in thông dụng</div>
          </div>

          <div className="p-3.5 border border-line bg-canvas rounded-lg">
            <div className="text-xs uppercase tracking-wider font-bold text-fg-subtle mb-1">
              Nếu file gốc vẽ theo Inch:
            </div>
            <div className="font-mono text-base font-bold text-fg">
              {dimsInchesConverted.x} × {dimsInchesConverted.y} × {dimsInchesConverted.z} mm
            </div>
            <div className="text-xs text-fg-subtle mt-1">Tự động phóng to x25.4 lần</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            onClick={onConfirmMm}
            className="flex-1 py-3 px-4 bg-surface-inverse hover:bg-surface-inverse text-on-inverse text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all shadow-e1 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Icon name="check" size={18} />
            Đúng, Kích Thước Là Millimet (mm)
          </button>
          <button
            onClick={onConvertToInch}
            className="py-3 px-4 bg-canvas hover:bg-surface-muted border border-line text-fg text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all shadow-e1 cursor-pointer"
          >
            Chuyển Đổi Sang Inch (x25.4)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
