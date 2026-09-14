/**
 * Sheet — bottom sheet (mobile) / side panel (desktop), dựng trên **cùng cơ chế**
 * `<dialog>` + `showModal()` của `Modal` (nên thừa hưởng top-layer, inert, focus trap,
 * Esc, click backdrop theo toạ độ và khoá scroll body có đếm tham chiếu).
 *
 * - `side='bottom'`: panel dán đáy, bo góc trên (14px), cao tối đa 85dvh (mặc định mobile).
 * - `side='right'`: panel dán phải, cao full, rộng tối đa `max-w-md` (side panel).
 * - `side='left'`: panel dán trái, rộng tối đa `max-w-xs` — dùng cho `SideNav` mobile
 *   của `AppShell` (thêm 2026-09-20).
 *
 * Dùng cho: giỏ hàng, mobile nav, bộ lọc nâng cao, chi tiết hàng trên mobile.
 * Việc chuyển call site (CartDrawer, mobile drawer của Header) thuộc A3/A4 — Phase 2
 * KHÔNG sửa call site.
 */

import type { ReactNode } from 'react';
import { Modal } from './Modal';
import type { ModalSize } from './Modal';

export type SheetSide = 'bottom' | 'left' | 'right';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: SheetSide;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
  panelClassName?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  closeLabel?: string;
  'aria-label'?: string;
}

export function Sheet({
  open,
  onClose,
  side = 'bottom',
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  panelClassName,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  closeLabel,
  'aria-label': ariaLabel,
}: SheetProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      placement={side}
      size={size}
      title={title}
      description={description}
      footer={footer}
      className={className}
      panelClassName={panelClassName}
      showCloseButton={showCloseButton}
      closeOnBackdropClick={closeOnBackdropClick}
      closeOnEscape={closeOnEscape}
      closeLabel={closeLabel}
      aria-label={ariaLabel}
    >
      {side === 'bottom' ? (
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
      ) : null}
      {children}
    </Modal>
  );
}
