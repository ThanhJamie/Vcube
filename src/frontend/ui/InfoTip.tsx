/**
 * InfoTip — nút icon `Info` mở popover chứa đoạn giải thích ĐẦY ĐỦ
 * (docs/plans/24-holistic-review.md §4 tầng 1 + yêu cầu chủ dự án: "bỏ chữ khỏi mặt tiền
 * nhưng KHÔNG mất thông tin").
 *
 * Vì sao cần: các panel admin có rất nhiều đoạn "giải thích/lưu ý" chiếm chỗ trên mặt tiền.
 * Chuyển chúng vào `InfoTip` giữ nguyên nội dung (không cắt, không tóm tắt) nhưng chỉ hiện
 * một icon 16px.
 *
 * Hợp đồng truy cập (BẮT BUỘC — không được chỉ dựa vào hover):
 * - Mở bằng **bàn phím**: `Tab` tới nút ⇒ `focus` mở; `Enter`/`Space` cũng mở (nút thật).
 * - Mở bằng **chuột** (`hover`) và bằng **chạm** (`click`).
 * - `Esc` đóng và **trả focus về nút**.
 * - `aria-label` cho nút (prop `label`, nên nêu CHỦ ĐỀ: "Vì sao cần giá điện…"),
 *   `aria-describedby` trỏ tới nội dung khi đang mở, kèm `aria-expanded`/`aria-controls`.
 * - Nội dung chỉ để ĐỌC (không có phần tử focus được) nên dùng `role="tooltip"` — đúng
 *   chuẩn cho tooltip văn bản, và không nhốt focus như `Modal`/`Sheet`.
 * - Popover tự kẹp trong viewport (không đẩy trang tràn ngang ở 390px).
 *
 * Kích thước: icon 16px; vùng bấm 24×24 (sàn AA 2.5.8) và 32×32 dưới `md`. Cố ý KHÔNG dùng
 * 44×44 vì InfoTip nằm ngay trong dòng chữ — 44px sẽ phá nhịp dòng (khác với nút trong
 * toolbar, nơi 44×44 là bắt buộc).
 */

import { Info } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type InfoTipPlacement = 'auto' | 'top' | 'bottom';

export interface InfoTipProps {
  /** Nội dung đầy đủ — KHÔNG cắt bớt, KHÔNG tóm tắt. */
  children: ReactNode;
  /** Nhãn cho screen reader. Nêu chủ đề, đừng viết chung chung "Thông tin". */
  label?: string;
  /** Tiêu đề ngắn trong popover (tuỳ chọn). */
  title?: ReactNode;
  placement?: InfoTipPlacement;
  className?: string;
  panelClassName?: string;
}

export function InfoTip({
  children,
  label = 'Thông tin thêm',
  title,
  placement = 'auto',
  className,
  panelClassName,
}: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<'top' | 'bottom'>('bottom');
  const [shiftX, setShiftX] = useState(0);

  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLSpanElement | null>(null);
  const tipId = useId();

  const show = useCallback(() => {
    if (placement === 'auto') {
      const rect = triggerRef.current?.getBoundingClientRect();
      setResolved(rect && rect.top > window.innerHeight / 2 ? 'top' : 'bottom');
    } else {
      setResolved(placement);
    }
    setOpen(true);
  }, [placement]);

  const hide = useCallback(() => setOpen(false), []);

  // Đóng khi bấm ra ngoài (chuột/chạm) — nhưng KHÔNG đóng khi bấm chính nút.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) hide();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, hide]);

  // Kẹp popover trong viewport để không tạo tràn ngang (390px).
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const margin = 8;
    let dx = 0;
    if (rect.left < margin) dx = margin - rect.left;
    else if (rect.right > window.innerWidth - margin) dx = window.innerWidth - margin - rect.right;
    setShiftX(dx);
  }, [open, resolved]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      hide();
      triggerRef.current?.focus();
    }
  };

  return (
    <span
      ref={wrapRef}
      className={cn('relative inline-flex align-middle', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hide();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? tipId : undefined}
        aria-describedby={open ? tipId : undefined}
        onClick={() => (open ? hide() : show())}
        onFocus={show}
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-full max-md:size-8',
          'text-fg-subtle transition-colors duration-150 ease-out motion-reduce:transition-none',
          'hover:bg-surface-muted hover:text-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'bg-surface-muted text-fg',
        )}
      >
        <Info aria-hidden="true" className="size-4" />
      </button>

      {open ? (
        <span
          ref={panelRef}
          id={tipId}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${shiftX}px))` }}
          className={cn(
            'absolute left-1/2 z-panel w-max max-w-[min(20rem,calc(100vw-2rem))]',
            'rounded-md border border-line-subtle bg-surface-raised p-3 text-left',
            'text-xs leading-relaxed font-normal text-fg-muted shadow-e2',
            'transition-opacity duration-150 ease-out motion-reduce:transition-none',
            resolved === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
            panelClassName,
          )}
        >
          {title ? <span className="mb-1 block text-xs font-semibold text-fg">{title}</span> : null}
          {children}
        </span>
      ) : null}
    </span>
  );
}
