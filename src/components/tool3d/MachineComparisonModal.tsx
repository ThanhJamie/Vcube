import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-black/20 max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-sans text-[9px] uppercase tracking-widest text-[#00687a] font-bold">
                PRC-009 // So Sánh Đa Máy In Tương Thích (Multi-Machine Slicer)
              </span>
              <span className="px-2 py-0.5 text-[9px] bg-cyan-100 text-[#00687a] font-bold rounded">
                Smart Router
              </span>
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#1C1C1C]">
              Ma Trận Lựa Chọn Thiết Bị Gia Công Tối Ưu
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/10 text-[#5A554C] hover:text-[#1C1C1C] rounded transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Comparison Table */}
        <div className="border border-black/10 rounded overflow-hidden">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#FAF9F5] text-[#7D7565] text-[10px] uppercase tracking-wider border-b border-black/10">
              <tr>
                <th className="p-3">Thiết Bị / Công Nghệ</th>
                <th className="p-3">Thời Gian In</th>
                <th className="p-3">Giá Vốn / Bán</th>
                <th className="p-3">Dự Kiến Xong</th>
                <th className="p-3">Mức Rủi Ro</th>
                <th className="p-3 text-right">Lựa Chọn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {items.map((item) => {
                const isSelected = selectedPrinterId === item.printerId;
                return (
                  <tr
                    key={item.printerId}
                    className={`hover:bg-[#F7F6F2] transition-colors ${
                      isSelected ? 'bg-cyan-50/50 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-[#1C1C1C] flex items-center gap-1.5">
                        <span>{item.printerName}</span>
                        {item.recommendationTag && (
                          <span className={`px-1.5 py-0.2 text-[9px] font-tech font-bold rounded ${
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
                      <span className="text-[10px] text-[#7D7565]">{item.technology} Industrial</span>
                    </td>

                    <td className="p-3 font-tech text-[#1C1C1C]">
                      {item.printTimeFormatted}
                    </td>

                    <td className="p-3 font-tech">
                      <div className="font-bold text-[#00687a]">{item.sellingPrice.toLocaleString('vi-VN')} đ</div>
                      <div className="text-[10px] text-[#7D7565]">Vốn: {item.costPrice.toLocaleString('vi-VN')} đ</div>
                    </td>

                    <td className="p-3 font-tech text-[#1C1C1C]">
                      {item.completionDate}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-tech font-bold rounded ${
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
                        className={`px-3 py-1.5 text-[10px] uppercase font-sans tracking-wider font-bold rounded transition-colors ${
                          isSelected
                            ? 'bg-[#00687a] text-white'
                            : 'bg-[#1C1C1C] hover:bg-[#333] text-white'
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
        <div className="p-3.5 bg-[#FAF9F5] border border-black/10 rounded text-xs space-y-1 text-[#5A554C]">
          <strong className="text-[#1C1C1C] block">Gợi ý thuật toán điều phối (Smart Routing):</strong>
          <p>
            • Chọn <strong>Bambu Lab X1C</strong> nếu bạn cần in nhanh và đa màu AMS chính xác.<br/>
            • Chọn <strong>Anycubic Kobra Max</strong> nếu phôi có chiều cao &gt; 250mm hoặc cần tối ưu giá thành lô lớn.<br/>
            • Chọn <strong>Formlabs Form 4 SLA</strong> khi cần bề mặt bóng láng hoàn hảo và độ chi tiết ren vặn cực nhỏ.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#F7F6F2] hover:bg-[#EAE8E0] border border-black/20 text-[#1C1C1C] text-xs font-sans uppercase tracking-wider font-bold rounded transition-colors"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>
  );
};
