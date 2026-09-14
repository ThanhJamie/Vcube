/**
 * ConfirmDialog — hộp thoại xác nhận, dựng trên `Modal` (`<dialog>` + `showModal()`).
 *
 * Đây là primitive thay thế 9 chỗ `window.confirm/alert` (DoD #7 của
 * `docs/plans/07-execution-phases.md`). Phase 2 **chỉ dựng primitive**, KHÔNG sửa call site —
 * việc chuyển call site thuộc A3/A4/A6.
 *
 * - `tone='danger'`: hành động phá huỷ. Nút xác nhận dùng **biến thể `danger` của `Button`**
 *   (A12) — không còn inline style `var(--color-danger)`: biến thể được chọn bên trong
 *   primitive vì `cn()` không giải quyết xung đột utility và thứ tự CSS không đảm bảo
 *   (`.bg-danger` đứng TRƯỚC `.bg-primary` trong CSS build). Chữ `text-primary-fg`
 *   (light: chữ trắng trên nền danger = 6.47:1; dark: chữ navy trên nền danger = 5.67:1 —
 *   hai theme đều đạt AA).
 * - Có icon cảnh báo + tiêu đề chữ: trạng thái nguy hiểm không chỉ thể hiện bằng màu.
 * - `loading` khoá cả hai nút để không submit hai lần.
 */

import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import type { ModalSize } from './Modal';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  size?: ModalSize;
  closeOnBackdropClick?: boolean;
  /** Nội dung bổ sung (ví dụ danh sách hệ quả của hành động). */
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  tone = 'default',
  onConfirm,
  onCancel,
  loading = false,
  size = 'sm',
  closeOnBackdropClick = false,
  children,
}: ConfirmDialogProps) {
  const isDanger = tone === 'danger';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size={size}
      closeOnBackdropClick={closeOnBackdropClick}
      showCloseButton={false}
      role={isDanger ? 'alertdialog' : 'dialog'}
      title={
        isDanger ? (
          <span className="flex items-center gap-2">
            <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-danger" />
            {title}
          </span>
        ) : (
          title
        )
      }
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            loadingLabel={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
