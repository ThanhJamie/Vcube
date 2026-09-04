import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MachineComparisonItem } from '../../types';

interface MachineComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MachineComparisonItem[];
  selectedPrinterId: string;
  onSelectPrinter: (printerId: string) => void;
}

export const MachineComparisonModal: React.FC<MachineComparisonModalProps> = ({
  isOpen,
  onClose,
  items,
  selectedPrinterId,
  onSelectPrinter
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#00687A] font-bold">
                PRC-009 // So Sánh Đa Máy In Tương Thích (Multi-Machine Slicer)
              </span>
              <span className="px-2 py-0.5 text-[9px] bg-cyan-100 text-[#00687A] font-bold rounded">
                Smart Router
              </span>
            </div>
            <h3 className="font-sans font-bold text-base sm:text-lg text-[#091426]">
              Ma Trận Lựa Chọn Thiết Bị Gia Công Tối Ưu
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-[#64748B] hover:text-[#091426] rounded-xl transition-colors cursor-pointer"
            title="Đóng (ESC)"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Comparison Table */}
        <div className="border border-[#CBD5E1] rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase tracking-wider border-b border-[#CBD5E1]">
              <tr>
                <th className="p-3">Thiết Bị / Công Nghệ</th>
                <th className="p-3">Thời Gian In</th>
                <th className="p-3">Giá Vốn / Bán</th>
                <th className="p-3">Dự Kiến Xong</th>
                <th className="p-3">Mức Rủi Ro</th>
                <th className="p-3 text-right">Lựa Chọn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {items.map((item) => {
                const isSelected = selectedPrinterId === item.printerId;
                return (
                  <tr
                    key={item.printerId}
                    className={`hover:bg-[#F8FAFC] transition-colors ${
                      isSelected ? 'bg-cyan-50/70 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-[#091426] flex items-center gap-1.5">
                        <span>{item.printerName}</span>
                        {item.recommendationTag && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                            item.recommendationTag === 'Nhanh Nhất'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.recommendationTag === 'Rẻ Nhất'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.recommendationTag}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748B]">{item.technology} Industrial</span>
                    </td>

                    <td className="p-3 font-mono text-[#091426]">
                      {item.printTimeFormatted}
                    </td>

                    <td className="p-3 font-mono">
                      <div className="font-bold text-[#00687A]">{item.sellingPrice.toLocaleString('vi-VN')} đ</div>
                      <div className="text-[10px] text-[#64748B]">Vốn: {item.costPrice.toLocaleString('vi-VN')} đ</div>
                    </td>

                    <td className="p-3 font-mono text-[#091426]">
                      {item.completionDate}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                        item.riskLevel === 'Thấp'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.riskLevel === 'Trung Bình'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.riskLevel}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPrinter(item.printerId);
                          onClose();
                        }}
                        className={`px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00687A] text-white shadow-xs'
                            : 'bg-[#091426] hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isSelected ? 'Đang Dùng' : 'Chọn Máy Này'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Optimization Tips */}
        <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs space-y-1 text-[#475569]">
          <strong className="text-[#091426] block">Gợi ý thuật toán điều phối (Smart Routing):</strong>
          <p className="leading-relaxed">
            • Chọn <strong>Bambu Lab X1C</strong> nếu bạn cần in nhanh và đa màu AMS chính xác.<br/>
            • Chọn <strong>Anycubic Kobra Max</strong> nếu phôi có chiều cao &gt; 250mm hoặc cần tối ưu giá thành lô lớn.<br/>
            • Chọn <strong>Formlabs Form 4 SLA</strong> khi cần bề mặt bóng láng hoàn hảo và độ chi tiết ren vặn cực nhỏ.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-[#CBD5E1] text-[#091426] text-xs font-mono uppercase tracking-wider font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
