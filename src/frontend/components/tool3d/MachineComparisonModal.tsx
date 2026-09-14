import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MachineComparisonItem } from '../../types';
import { Icon } from '@frontend/ui';
import { EMPTY_VALUE } from '../../lib/format';

/** Số hữu hạn hay không — NULL/NaN ⇒ KHÔNG có giá trị (không đoán hộ). */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Tiền VND: thiếu giá trị ⇒ `—`, KHÔNG `NaN đ` và KHÔNG ném.
 * Cùng luật với `HomeView.tsx:26-34` / `ProductDetailView.tsx:21-30`.
 */
const vnd = (v: unknown): string =>
  isNum(v) && v > 0 ? `${v.toLocaleString('vi-VN')} đ` : EMPTY_VALUE;

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

  /*
   * GỢI Ý ĐIỀU PHỐI — chỉ suy từ SỐ ĐO của chính lượt so sánh này.
   * Khối cũ nêu đích danh ba máy ("Bambu Lab X1C" / "Anycubic Kobra Max" /
   * "Formlabs Form 4 SLA") bất kể đội máy thật của xưởng — lời khuyên BỊA, và có thể nhắc một
   * máy KHÔNG hề nằm trong bảng. Nay không nêu máy nào ngoài `items`.
   */
  const pricedItems = items.filter((i) => isNum(i.sellingPrice) && i.sellingPrice > 0);
  const timedItems = items.filter((i) => isNum(i.printTimeHours) && i.printTimeHours > 0);
  const cheapest = pricedItems.length
    ? pricedItems.reduce((best, i) => (i.sellingPrice < best.sellingPrice ? i : best))
    : null;
  const fastest = timedItems.length
    ? timedItems.reduce((best, i) => (i.printTimeHours < best.printTimeHours ? i : best))
    : null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-surface-inverse/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-lg max-w-3xl w-full p-5 sm:p-7 shadow-e3 space-y-5 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
                PRC-009 // So Sánh Đa Máy In Tương Thích (Multi-Machine Slicer)
              </span>
              <span className="px-2 py-0.5 text-xs bg-primary-tint text-primary font-bold rounded-sm">
                Smart Router
              </span>
            </div>
            <h3 className="font-sans font-bold text-base sm:text-lg text-fg">
              Ma Trận Lựa Chọn Thiết Bị Gia Công Tối Ưu
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-muted text-fg-subtle hover:text-fg rounded-lg transition-colors cursor-pointer"
            title="Đóng (ESC)"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="border border-line rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-canvas text-fg-subtle text-xs uppercase tracking-wider border-b border-line">
              <tr>
                <th className="p-3">Thiết Bị / Công Nghệ</th>
                <th className="p-3">Thời Gian In</th>
                <th className="p-3">Giá Vốn / Bán</th>
                <th className="p-3">Dự Kiến Xong</th>
                <th className="p-3">Mức Rủi Ro</th>
                <th className="p-3 text-right">Lựa Chọn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {items.map((item) => {
                const isSelected = selectedPrinterId === item.printerId;
                return (
                  <tr
                    key={item.printerId}
                    className={`hover:bg-canvas transition-colors ${
                      isSelected ? 'bg-primary-tint/70 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-fg flex items-center gap-1.5">
                        <span>{item.printerName}</span>
                        {item.recommendationTag && (
                          <span className={`px-1.5 py-0.5 text-xs font-mono font-bold rounded-sm ${
                            item.recommendationTag === 'Nhanh Nhất'
                              ? 'bg-positive-tint text-positive'
                              : item.recommendationTag === 'Rẻ Nhất'
                              ? 'bg-info-tint text-info'
                              : 'bg-info-tint text-info'
                          }`}>
                            {item.recommendationTag}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-fg-subtle">{item.technology} Industrial</span>
                    </td>

                    <td className="p-3 font-mono text-fg">
                      {item.printTimeFormatted}
                    </td>

                    <td className="p-3 font-mono">
                      <div className="font-bold text-primary">{vnd(item.sellingPrice)}</div>
                      <div className="text-xs text-fg-subtle">Vốn: {vnd(item.costPrice)}</div>
                    </td>

                    <td className="p-3 font-mono text-fg">
                      {item.completionDate}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded-sm ${
                        item.riskLevel === 'Thấp'
                          ? 'bg-positive-tint text-positive'
                          : item.riskLevel === 'Trung Bình'
                          ? 'bg-warning-tint text-warning'
                          : 'bg-danger-tint text-danger'
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
                        className={`px-3 py-1.5 text-xs uppercase font-mono tracking-wider font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-fg shadow-e1'
                            : 'bg-surface-inverse hover:bg-surface-inverse text-on-inverse'
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

        {/* Optimization Tips — chỉ từ số đo của chính bảng trên, không nêu máy nào ngoài `items` */}
        <div className="p-3.5 bg-canvas border border-line rounded-lg text-xs space-y-1 text-fg-muted">
          <strong className="text-fg block">Gợi ý thuật toán điều phối (Smart Routing):</strong>
          {items.length === 0 ? (
            <p className="leading-relaxed">
              Bảng so sánh chưa có máy nào từ đội máy thật của xưởng — không có cơ sở để đề xuất.
            </p>
          ) : (cheapest || fastest) ? (
            <ul className="leading-relaxed list-disc pl-4 space-y-1">
              {cheapest && (
                <li>
                  Giá bán thấp nhất trong {items.length} máy đang so sánh: <strong className="text-fg">{cheapest.printerName}</strong> ({vnd(cheapest.sellingPrice)}).
                </li>
              )}
              {fastest && (
                <li>
                  Thời gian in ngắn nhất: <strong className="text-fg">{fastest.printerName}</strong> ({fastest.printTimeFormatted}).
                </li>
              )}
              <li>
                Đây là toàn bộ căn cứ hệ thống có: giá bán, thời gian in và mức rủi ro của chính bảng trên.
                Không có khuyến nghị nào khác được đưa ra.
              </li>
            </ul>
          ) : (
            <p className="leading-relaxed">
              Lượt so sánh này chưa có máy nào kèm giá bán và thời gian in hợp lệ —
              hệ thống không đưa ra khuyến nghị nào.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-surface hover:bg-surface-muted border border-line-control text-fg text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all shadow-e1 cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
