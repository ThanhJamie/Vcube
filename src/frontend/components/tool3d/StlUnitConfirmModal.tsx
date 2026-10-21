import React from 'react';
import { Icon, Modal } from '@frontend/ui';

interface StlUnitConfirmModalProps {
  isOpen: boolean;
  fileName: string;
  dimensionsMm: { x: number; y: number; z: number };
  onConfirmMm: () => void;
  onConvertToInch: () => void;
  onCancel: () => void;
}

/**
 * Xác nhận đơn vị đo cho STL. STL không lưu đơn vị trong header nên phải hỏi khách trước khi
 * báo giá. Dùng primitive `Modal` (`<dialog>` + `showModal`) để có top-layer, focus trap và
 * khoá cuộn nền — thay cho `div` tự chế + `createPortal`.
 */
export const StlUnitConfirmModal: React.FC<StlUnitConfirmModalProps> = ({
  isOpen,
  fileName,
  dimensionsMm,
  onConfirmMm,
  onConvertToInch,
  onCancel
}) => {
  // W2-NEW-1 (StrictMode): KHÔNG return null khi đóng — luôn mount <Modal>, chỉ đổi prop `open`.
  // Mount có điều kiện khiến dialog mount→cleanup→mount, `dialog.close()` trong cleanup đóng
  // modal vừa mở ⇒ bấm nút không thấy gì ở dev server.
  const dimsInchesConverted = {
    x: (dimensionsMm.x * 25.4).toFixed(1),
    y: (dimensionsMm.y * 25.4).toFixed(1),
    z: (dimensionsMm.z * 25.4).toFixed(1)
  };

  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      size="lg"
      closeLabel="Đóng xác nhận đơn vị đo"
      title={
        <span className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-warning/20 bg-warning-tint text-warning">
            <Icon name="straighten" size={28} />
          </span>
          <span className="flex flex-col">
            <span className="block font-mono text-xs font-bold uppercase tracking-widest text-fg-subtle">
              XÁC NHẬN ĐƠN VỊ ĐO STL
            </span>
            <span className="mt-0.5 font-sans text-base font-bold text-fg sm:text-lg">
              Xác nhận đơn vị đo cho tệp STL
            </span>
          </span>
        </span>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2 rounded-md border border-warning/20 bg-warning-tint p-3.5 text-xs text-warning">
          <p className="font-semibold">
            Tệp <span className="font-mono font-bold text-fg">{fileName}</span> là định dạng STL tiêu chuẩn.
          </p>
          <p className="leading-relaxed">
            Định dạng STL không lưu trữ thông tin đơn vị đo chuẩn trong header. Hệ thống hiện đang hiểu kích thước hình học là <strong>Mi-li-mét (mm)</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-primary bg-primary-tint p-3.5">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">
              Khuyến nghị: chuẩn mi-li-mét (mm)
            </div>
            <div className="font-mono text-base font-bold text-fg">
              {dimensionsMm.x} × {dimensionsMm.y} × {dimensionsMm.z} mm
            </div>
            <div className="mt-1 text-xs text-fg-muted">Phù hợp kích thước bàn in thông dụng</div>
          </div>

          <div className="rounded-lg border border-line bg-surface-muted p-3.5">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-fg-muted">
              Nếu tệp gốc vẽ theo inch:
            </div>
            <div className="font-mono text-base font-bold text-fg">
              {dimsInchesConverted.x} × {dimsInchesConverted.y} × {dimsInchesConverted.z} mm
            </div>
            <div className="mt-1 text-xs text-fg-muted">Tự động phóng to ×25,4 lần</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={onConfirmMm}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-4 h-10 max-md:min-h-11 text-sm font-semibold text-primary-fg shadow-e1 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Icon name="check" size={18} />
            Đúng, kích thước là mi-li-mét (mm)
          </button>
          <button
            type="button"
            onClick={onConvertToInch}
            className="cursor-pointer rounded-md border border-line-control bg-surface px-4 h-10 max-md:min-h-11 text-sm font-semibold text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Chuyển đổi sang inch (×25,4)
          </button>
        </div>
      </div>
    </Modal>
  );
};
