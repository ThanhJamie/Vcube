import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">straighten</span>
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold block">
              Xác Nhận Đơn Vị Đo STL // Unit Verification
            </span>
            <h3 className="font-sans font-bold text-base sm:text-lg text-[#091426] mt-0.5">
              Xác Nhận Đơn Vị Đo Cho File STL
            </h3>
          </div>
        </div>

        <div className="bg-[#FFFDF0] border border-amber-200 p-4 rounded-xl text-xs space-y-2 text-[#664D03]">
          <p className="font-semibold">
            Tập tin <span className="font-mono text-[#091426] font-bold">{fileName}</span> là định dạng STL tiêu chuẩn.
          </p>
          <p className="leading-relaxed">
            Định dạng STL không lưu trữ thông tin đơn vị đo chuẩn trong header. Hệ thống hiện đang hiểu kích thước hình học là <strong>Millimet (mm)</strong>.
          </p>
        </div>

        {/* Dimension Comparison Cards */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 border-2 border-[#00687A] bg-cyan-50/50 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#00687A] mb-1">
              Khuyến nghị: Chuẩn Millimet (mm)
            </div>
            <div className="font-mono text-base font-bold text-[#091426]">
              {dimensionsMm.x} × {dimensionsMm.y} × {dimensionsMm.z} mm
            </div>
            <div className="text-[10px] text-[#64748B] mt-1">Phù hợp kích thước bàn in thông dụng</div>
          </div>

          <div className="p-3.5 border border-[#CBD5E1] bg-[#F8FAFC] rounded-xl">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#64748B] mb-1">
              Nếu file gốc vẽ theo Inch:
            </div>
            <div className="font-mono text-base font-bold text-[#091426]">
              {dimsInchesConverted.x} × {dimsInchesConverted.y} × {dimsInchesConverted.z} mm
            </div>
            <div className="text-[10px] text-[#64748B] mt-1">Tự động phóng to x25.4 lần</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            onClick={onConfirmMm}
            className="flex-1 py-3 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-mono uppercase tracking-wider font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Đúng, Kích Thước Là Millimet (mm)
          </button>
          <button
            onClick={onConvertToInch}
            className="py-3 px-4 bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1] text-[#091426] text-xs font-mono uppercase tracking-wider font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Chuyển Đổi Sang Inch (x25.4)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
