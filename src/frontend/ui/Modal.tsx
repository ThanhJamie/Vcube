/**
 * Modal — hộp thoại dựa trên **`<dialog>` + `showModal()`** (spec: docs/design/tokens.md §8).
 *
 * Vì sao `<dialog>`: `showModal()` cho **top-layer** (không cần `z-index` chồng lớp),
 * **inert** phần còn lại của trang và **focus trap** của nền tảng — đúng ba thứ mà 30
 * modal tự viết trong repo đang thiếu.
 *
 * Hợp đồng:
 * - Đóng bằng `Esc` (native) và click backdrop. Backdrop được nhận diện bằng **kiểm tra
 *   toạ độ**: click phải nằm NGOÀI `getBoundingClientRect()` của panel, và `pointerdown`
 *   phải bắt đầu ngoài panel (không đóng khi bôi đen chữ từ trong panel kéo ra ngoài).
 * - **Khoá scroll body có đếm tham chiếu** (`bodyLockCount`): mở 2 modal thì đóng 1 cái
 *   KHÔNG mở khoá scroll của cái còn lại (bug đã ghi ở `docs/plans/03-pages-admin.md` §1.5
 *   mục 48). Có bù `padding-right` bằng bề rộng scrollbar để không giật layout.
 * - `aria-labelledby` -> title, `aria-describedby` -> description (id sinh bằng `useId`).
 * - Trả focus về phần tử đã mở modal khi đóng (nếu phần tử còn trong DOM).
 * - Không tự vẽ `div` overlay: `::backdrop` của nền tảng + nền mờ trên chính `<dialog>`.
 * - Bán kính panel: `rounded-modal` = **14px** (`--radius-modal`, 21-saas-spec.md §1.1).
 *   Placement `'left'` phục vụ `SideNav` mobile của `AppShell`.
 */

import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import { Button } from './Button';
import { cn } from './cn';

/* -------------------------------------------------------------------------- */
/* Khoá scroll body — đếm tham chiếu (ref count)                              */
/* -------------------------------------------------------------------------- */

let bodyLockCount = 0;
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

/** Tăng ref count; chỉ tác động DOM ở lần khoá ĐẦU TIÊN. */
export function acquireBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  bodyLockCount += 1;
  if (bodyLockCount > 1) return;

  const body = document.body;
  savedBodyOverflow = body.style.overflow;
  savedBodyPaddingRight = body.style.paddingRight;

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

/** Giảm ref count; chỉ mở khoá khi về 0. Gọi thừa (count = 0) là no-op an toàn. */
export function releaseBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  if (bodyLockCount === 0) return;

  bodyLockCount -= 1;
  if (bodyLockCount > 0) return;

  const body = document.body;
  body.style.overflow = savedBodyOverflow;
  body.style.paddingRight = savedBodyPaddingRight;
}

/** Số lượt khoá đang hoạt động — hữu ích cho test/kiểm chứng thủ công. */
export function getBodyScrollLockCount(): number {
  return bodyLockCount;
}

/** Hook tiện dụng cho overlay không dùng `<dialog>` (ví dụ drawer cũ). */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    acquireBodyScrollLock();
    return () => releaseBodyScrollLock();
  }, [active]);
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
/** `bottom`/`left`/`right` phục vụ `Sheet`; cả bốn dùng chung một cơ chế `<dialog>`. */
export type ModalPlacement = 'center' | 'bottom' | 'left' | 'right';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  placement?: ModalPlacement;
  footer?: ReactNode;
  children?: ReactNode;
  /** Gắn vào chính `<dialog>` (lớp phủ toàn màn hình). */
  className?: string;
  /** Gắn thêm vào panel — CHỈ nên dùng class không trùng nhóm với class nền. */
  panelClassName?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  closeLabel?: string;
  role?: 'dialog' | 'alertdialog';
  'aria-label'?: string;
  /** Focus vào phần tử này ngay sau khi mở (mặc định: nền tảng tự quyết định). */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Lớp phủ: `<dialog>` phủ kín viewport rồi tự căn panel bằng flex — nhờ vậy click ra
 * vùng trống có `event.target` chính là `<dialog>` và kiểm tra toạ độ luôn chính xác.
 * `open:flex` là bắt buộc: khi thuộc tính `open` không có, UA stylesheet giữ `display:none`.
 */
const DIALOG_BASE = [
  'fixed inset-0 z-modal m-0 h-full w-full max-h-none max-w-none overflow-hidden p-0',
  'bg-surface-inverse/60 text-fg backdrop:bg-surface-inverse/40',
  'open:flex',
].join(' ');

const CONTAINER: Record<ModalPlacement, string> = {
  center: 'items-center justify-center p-4',
  bottom: 'items-end justify-center p-0',
  left: 'items-stretch justify-start p-0',
  right: 'items-stretch justify-end p-0',
};

const PANEL_BASE = [
  'relative flex flex-col overflow-hidden bg-surface text-fg shadow-e3',
  'transition duration-200 ease-out',
  'starting:scale-95 starting:opacity-0',
  'motion-reduce:transition-none',
].join(' ');

const SIZE_WIDTH: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-none',
};

/** Class panel tính theo biến (không lồng class xung đột để không phụ thuộc thứ tự CSS). */
function panelClasses(placement: ModalPlacement, size: ModalSize): string {
  // Bán kính panel = `--radius-modal` (14px) — 21-saas-spec.md §1.1 (bản cũ 20px).
  if (placement === 'bottom') return 'w-full max-w-none max-h-[85dvh] rounded-t-modal border border-b-0';
  if (placement === 'left') return 'h-full w-full max-w-xs rounded-none border border-y-0 border-l-0';
  if (placement === 'right') return 'h-full w-full max-w-md rounded-none border border-y-0 border-r-0';
  if (size === 'full') return 'h-full w-full max-w-none rounded-none border';
  return `w-full max-h-full rounded-modal border ${SIZE_WIDTH[size]}`;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  placement = 'center',
  footer,
  children,
  className,
  panelClassName,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  closeLabel = 'Đóng',
  role = 'dialog',
  'aria-label': ariaLabel,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pointerDownOutsideRef = useRef(false);

  const titleId = useId();
  const descriptionId = useId();

  // Đọc trong listener native -> giữ trong ref để không phải gắn lại listener.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeOnEscapeRef = useRef(closeOnEscape);
  closeOnEscapeRef.current = closeOnEscape;
  const initialFocusRefStable = useRef(initialFocusRef);
  initialFocusRefStable.current = initialFocusRef;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    let locked = false;
    let focusRestored = false;

    const restoreFocus = () => {
      if (focusRestored) return;
      focusRestored = true;
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (!target || target === document.body || !document.contains(target)) return;
      try {
        target.focus();
      } catch {
        /* phần tử đã bị unmount/không focus được — bỏ qua */
      }
    };

    const unlock = () => {
      if (!locked) return;
      locked = false;
      releaseBodyScrollLock();
    };

    if (!dialog.open) {
      // Lưu nơi focus đang đứng TRƯỚC khi mở để trả lại sau khi đóng.
      const active = document.activeElement;
      restoreFocusRef.current = active instanceof HTMLElement ? active : null;

      if (typeof dialog.showModal === 'function') {
        try {
          dialog.showModal();
        } catch {
          // Đã mở ở chế độ non-modal (hiếm): chỉ cần thuộc tính open.
          dialog.setAttribute('open', '');
        }
      } else {
        dialog.setAttribute('open', '');
      }

      acquireBodyScrollLock();
      locked = true;

      const focusTarget = initialFocusRefStable.current?.current;
      if (focusTarget) {
        window.requestAnimationFrame(() => {
          if (dialog.open) focusTarget.focus();
        });
      }
    }

    // `close` là sự kiện native (Esc, form method=dialog, close() từ nơi khác).
    const handleNativeClose = () => {
      unlock();
      restoreFocus();
      onCloseRef.current?.();
    };

    // `cancel` = Esc; chặn khi closeOnEscape = false.
    const handleNativeCancel = (event: Event) => {
      if (!closeOnEscapeRef.current) event.preventDefault();
    };

    dialog.addEventListener('close', handleNativeClose);
    dialog.addEventListener('cancel', handleNativeCancel);

    return () => {
      dialog.removeEventListener('close', handleNativeClose);
      dialog.removeEventListener('cancel', handleNativeCancel);
      // Đóng do prop `open` chuyển false hoặc component unmount: tự đóng, KHÔNG gọi
      // onClose (consumer đã là bên quyết định) — nên không có vòng lặp.
      if (dialog.open) dialog.close();
      unlock();
      restoreFocus();
    };
  }, [open]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDialogElement>) => {
    const panel = panelRef.current;
    pointerDownOutsideRef.current = !panel || !panel.contains(event.target as Node);
  };

  const handlePanelClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdropClick) return;
    const panel = panelRef.current;
    const target = event.target as Node;

    // 1) Click trong panel -> không đóng.
    if (panel && panel.contains(target)) return;
    // 2) Thao tác bắt đầu trong panel (bôi đen/kéo) -> không đóng.
    if (!pointerDownOutsideRef.current) return;
    // 3) Kiểm tra toạ độ: điểm click phải nằm ngoài hình chữ nhật của panel.
    if (panel) {
      const rect = panel.getBoundingClientRect();
      const { clientX, clientY } = event;
      const insidePanel =
        clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      if (insidePanel) return;
    }

    onClose();
  };

  const hasHeader = Boolean(title || description || showCloseButton);

  return (
    <dialog
      ref={dialogRef}
      role={role}
      className={cn(DIALOG_BASE, CONTAINER[placement], className)}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      onPointerDown={handlePointerDown}
      onClick={handlePanelClick}
    >
      <div ref={panelRef} className={cn(PANEL_BASE, panelClasses(placement, size), panelClassName)}>
        {hasHeader ? (
          <div className="flex items-start justify-between gap-4 border-b border-line p-4">
            <div className="flex min-w-0 flex-col gap-1">
              {title ? (
                <h2 id={titleId} className="text-lg font-semibold text-fg">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descriptionId} className="text-sm text-fg-muted">
                  {description}
                </p>
              ) : null}
            </div>
            {showCloseButton ? (
              <Button iconOnly variant="ghost" size="sm" aria-label={closeLabel} onClick={onClose}>
                <X aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </div>
        ) : null}

        {children ? <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div> : null}

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
