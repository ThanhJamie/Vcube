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
  if (!isOpen) return null;

  const dimsInchesConverted = {
    x: (dimensionsMm.x * 25.4).toFixed(1),
    y: (dimensionsMm.y * 25.4).toFixed(1),
    z: (dimensionsMm.z * 25.4).toFixed(1)
  };

  return (
    <Modal
      open
      onClose={onCancel}
      size="lg"
      closeLabel="Đóng xác nhận đơn vị đo"
      title={
        <span className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-warning/40 bg-warning-tint text-warning">
            <Icon name="straighten" size={28} />
          </span>
          <span className="flex flex-col">
            <span className="block font-mono text-xs font-bold uppercase tracking-widest text-fg-subtle">
              Xác Nhận Đơn Vị Đo STL // Unit Verification
            </span>
            <span className="mt-0.5 font-sans text-base font-bold text-fg sm:text-lg">
              Xác Nhận Đơn Vị Đo Cho File STL
            </span>
          </span>
        </span>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs text-warning">
          <p className="font-semibold">
            Tập tin <span className="font-mono font-bold text-fg">{fileName}</span> là định dạng STL tiêu chuẩn.
          </p>
          <p className="leading-relaxed">
            Định dạng STL không lưu trữ thông tin đơn vị đo chuẩn trong header. Hệ thống hiện đang hiểu kích thước hình học là <strong>Millimet (mm)</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-lg border-2 border-primary bg-primary-tint/50 p-3.5">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">
              Khuyến nghị: Chuẩn Millimet (mm)
            </div>
            <div className="font-mono text-base font-bold text-fg">
              {dimensionsMm.x} × {dimensionsMm.y} × {dimensionsMm.z} mm
            </div>
            <div className="mt-1 text-xs text-fg-subtle">Phù hợp kích thước bàn in thông dụng</div>
          </div>

          <div className="rounded-lg border border-line bg-canvas p-3.5">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-fg-subtle">
              Nếu file gốc vẽ theo Inch:
            </div>
            <div className="font-mono text-base font-bold text-fg">
              {dimsInchesConverted.x} × {dimsInchesConverted.y} × {dimsInchesConverted.z} mm
            </div>
            <div className="mt-1 text-xs text-fg-subtle">Tự động phóng to x25.4 lần</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
          <button
            onClick={onConfirmMm}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-surface-inverse px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-on-inverse shadow-e1 transition-all hover:bg-surface-inverse"
          >
            <Icon name="check" size={18} />
            Đúng, Kích Thước Là Millimet (mm)
          </button>
          <button
            onClick={onConvertToInch}
            className="cursor-pointer rounded-lg border border-line bg-canvas px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-fg shadow-e1 transition-all hover:bg-surface-muted"
          >
            Chuyển Đổi Sang Inch (x25.4)
          </button>
        </div>
      </div>
    </Modal>
  );
};
