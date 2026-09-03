import React from 'react';

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
  if (!isOpen) return null;

  const dimsInchesConverted = {
    x: (dimensionsMm.x * 25.4).toFixed(1),
    y: (dimensionsMm.y * 25.4).toFixed(1),
    z: (dimensionsMm.z * 25.4).toFixed(1)
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-black/20 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">straighten</span>
          </div>
          <div>
            <span className="font-sans text-[10px] uppercase tracking-widest text-[#7D7565] font-bold block">
              Xác Nhận Đơn Vị Đo STL // Unit Verification
            </span>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#1C1C1C] mt-0.5">
              Xác Nhận Đơn Vị Đo Cho File STL
            </h3>
          </div>
        </div>

        <div className="bg-[#FFFDF0] border border-amber-200 p-4 rounded text-xs space-y-2 text-[#664D03]">
          <p className="font-semibold">
            Tập tin <span className="font-mono text-[#1C1C1C]">{fileName}</span> là định dạng STL tiêu chuẩn.
          </p>
          <p className="leading-relaxed">
            Định dạng STL không lưu trữ thông tin đơn vị đo chuẩn trong header. Hệ thống hiện đang hiểu kích thước hình học là <strong>Millimet (mm)</strong>.
          </p>
        </div>

        {/* Dimension Comparison Cards */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 border-2 border-[#00687a] bg-cyan-50/40 rounded">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#00687a] mb-1">
              Khuyến nghị: Chuẩn Millimet (mm)
            </div>
            <div className="font-tech text-base font-bold text-[#1C1C1C]">
              {dimensionsMm.x} × {dimensionsMm.y} × {dimensionsMm.z} mm
            </div>
            <div className="text-[10px] text-[#5A554C] mt-1">Phù hợp kích thước bàn in thông dụng</div>
          </div>

          <div className="p-3.5 border border-black/10 bg-[#F7F6F2] rounded">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#7D7565] mb-1">
              Nếu file gốc vẽ theo Inch:
            </div>
            <div className="font-tech text-base font-bold text-[#1C1C1C]">
              {dimsInchesConverted.x} × {dimsInchesConverted.y} × {dimsInchesConverted.z} mm
            </div>
            <div className="text-[10px] text-[#7D7565] mt-1">Tự động phóng to x25.4 lần</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            onClick={onConfirmMm}
            className="flex-1 py-3 px-4 bg-[#1C1C1C] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Đúng, Kích Thước Là Millimet (mm)
          </button>
          <button
            onClick={onConvertToInch}
            className="py-3 px-4 bg-[#F7F6F2] hover:bg-[#EAE8E0] border border-black/20 text-[#1C1C1C] text-xs font-sans uppercase tracking-widest font-bold transition-colors"
          >
            Chuyển Đổi Sang Inch (x25.4)
          </button>
        </div>
      </div>
    </div>
  );
};
