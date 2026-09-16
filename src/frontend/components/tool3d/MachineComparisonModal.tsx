import React from 'react';
import { MachineComparisonItem } from '../../types';
import { Icon, Modal } from '@frontend/ui';
import { EMPTY_VALUE } from '../../lib/format';

/** Số hữu hạn hay không — NULL/NaN ⇒ KHÔNG có giá trị (không đoán hộ). */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Tiền VND: thiếu giá trị ⇒ `—`, KHÔNG `NaN đ` và KHÔNG ném.
 */
const vnd = (v: unknown): string =>
  isNum(v) && v > 0 ? `${v.toLocaleString('vi-VN')} đ` : EMPTY_VALUE;

interface MachineComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MachineComparisonItem[];
  selectedPrinterId: string;
  onSelectPrinter: (printerId: string) => void;
  /**
   * Chỉ ADMIN được thấy cột GIÁ VỐN. Khách chỉ thấy giá bán (tránh lộ giá vốn của xưởng).
   */
  showCost?: boolean;
}

export const MachineComparisonModal: React.FC<MachineComparisonModalProps> = ({
  isOpen,
  onClose,
  items,
  selectedPrinterId,
  onSelectPrinter,
  showCost = false
}) => {
  if (!isOpen) return null;

  /*
   * GỢI Ý ĐIỀU PHỐI — chỉ suy từ SỐ ĐO của chính lượt so sánh này, không nêu máy nào ngoài `items`.
   */
  const pricedItems = items.filter((i) => isNum(i.sellingPrice) && i.sellingPrice > 0);
  const timedItems = items.filter((i) => isNum(i.printTimeHours) && i.printTimeHours > 0);
  const cheapest = pricedItems.length
    ? pricedItems.reduce((best, i) => (i.sellingPrice < best.sellingPrice ? i : best))
    : null;
  const fastest = timedItems.length
    ? timedItems.reduce((best, i) => (i.printTimeHours < best.printTimeHours ? i : best))
    : null;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      bodyClassName="p-0"
      title={
        <span className="flex w-full items-center justify-between gap-3">
          <span>
            <span className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
                PRC-009 // So Sánh Đa Máy In Tương Thích (Multi-Machine Slicer)
              </span>
              <span className="px-2 py-0.5 text-xs bg-primary-tint text-primary font-bold rounded-sm">
                Smart Router
              </span>
            </span>
            <span className="block font-sans font-bold text-base sm:text-lg text-fg">
              Ma Trận Lựa Chọn Thiết Bị Gia Công Tối Ưu
            </span>
          </span>
          <button
            onClick={onClose}
            aria-label="Đóng so sánh máy in"
            className="shrink-0 p-1.5 hover:bg-surface-muted text-fg-subtle hover:text-fg rounded-lg transition-colors cursor-pointer"
          >
            <Icon name="close" size={24} />
          </button>
        </span>
      }
    >
      <div className="space-y-5 p-5 sm:p-7">
        {/* Comparison Table */}
        <div className="border border-line rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-canvas text-fg-subtle text-xs uppercase tracking-wider border-b border-line">
              <tr>
                <th className="p-3">Thiết Bị / Công Nghệ</th>
                <th className="p-3">Thời Gian In</th>
                <th className="p-3">{showCost ? 'Giá Vốn / Bán' : 'Giá Bán'}</th>
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
                      {showCost && (
                        <div className="text-xs text-fg-subtle">Vốn: {vnd(item.costPrice)}</div>
                      )}
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
                        className={`px-3 py-1.5 text-xs uppercase font-mono tracking-wider font-bold rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-fg shadow-e1'
                            : 'bg-surface-inverse hover:bg-surface-inverse-raised text-on-inverse'
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

        {/* Optimization Tips — chỉ từ số đo của chính bảng trên */}
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
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-surface hover:bg-surface-muted border border-line-control text-fg text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-colors shadow-e1 cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </Modal>
  );
};
