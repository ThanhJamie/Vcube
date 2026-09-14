/**
 * ToastViewport — vùng thông báo (spec §8 + qa-checklist mục "Toast screen-reader
 * announcement": hiện tại container KHÔNG có `role` và `aria-live` nào trong toàn frontend).
 *
 * Hợp đồng:
 * - Hai live region RIÊNG: `role="status"` + `aria-live="polite"` cho
 *   success/warning/info, và `role="alert"` (assertive) cho **error** — đúng yêu cầu
 *   "lỗi dùng role=alert". Cả hai region luôn được mount (rỗng) để trình đọc màn hình
 *   chắc chắn công bố nội dung thêm vào.
 * - Giữ **severity** (icon khác hình + viền khác màu + chữ) và **undo action**.
 * - Tự hết hạn, **pause khi hover hoặc focus**; tính lại thời gian còn lại sau khi pause
 *   (không reset về đầu) — WCAG 2.2.1.
 * - **Lỗi nghiêm trọng không tự đóng** (`autoDismissErrors=false`, mặc định): item có
 *   `severity='error'` hoặc `sticky` chỉ mất khi người dùng đóng.
 * - Wrapper `pointer-events-none`, từng toast `pointer-events-auto` để không chặn FAB
 *   hỗ trợ (lỗi đã ghi trong QA checklist).
 *
 * Nối store: `showToast(message, type, undoAction, undoLabel)` của
 * `src/frontend/stores/useUIStore.ts` đã hỗ trợ undo. Phase 2 **KHÔNG sửa store**;
 * dùng hook adapter bên dưới:
 * ```tsx
 * const { toasts, onDismiss } = useUIStoreToasts();
 * <ToastViewport toasts={toasts} onDismiss={onDismiss} />
 * ```
 * ⚠️ Giới hạn đã biết (không sửa được từ đây): store tự `setTimeout(..., 4000)` và xoá
 * MỌI toast, kể cả lỗi. Muốn lỗi không tự mất thì phải sửa store ở phase sở hữu
 * `useUIStore.ts`, hoặc đẩy toast lỗi qua props `toasts` từ nguồn khác.
 */

import { CircleAlert, CircleCheck, Info, TriangleAlert, Undo2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useUIStore } from '@frontend/stores/useUIStore';
import { Button } from './Button';
import { cn } from './cn';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface ToastViewportItem {
  id: string;
  message: ReactNode;
  description?: ReactNode;
  severity?: ToastSeverity;
  /** ms; mặc định `defaultDuration`. `0` = không tự hết hạn. */
  duration?: number;
  /** Không bao giờ tự hết hạn (dùng cho lỗi nghiêm trọng). */
  sticky?: boolean;
  undoAction?: () => void;
  undoLabel?: string;
  onDismiss?: () => void;
}

export type ToastPosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'top-right'
  | 'top-center';

export interface ToastViewportProps {
  toasts: ToastViewportItem[];
  onDismiss: (id: string) => void;
  position?: ToastPosition;
  defaultDuration?: number;
  /** Số toast giữ lại (mặc định 5 — khớp `slice(-4)` + toast mới của store). */
  max?: number;
  /** `false` = lỗi không tự đóng (mặc định). */
  autoDismissErrors?: boolean;
  labels?: {
    dismiss?: string;
    undo?: string;
  };
  className?: string;
}

const POSITION: Record<ToastPosition, string> = {
  'bottom-left': 'bottom-4 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  'top-right': 'top-4 right-4 items-end',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
};

const SEVERITY_ICON = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
} as const;

const SEVERITY_BORDER: Record<ToastSeverity, string> = {
  success: 'border-positive/40',
  error: 'border-danger/60',
  warning: 'border-warning/40',
  info: 'border-info/40',
};

const SEVERITY_ICON_TONE: Record<ToastSeverity, string> = {
  success: 'text-positive',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

interface ToastCardProps {
  item: ToastViewportItem;
  onDismiss: (id: string) => void;
  defaultDuration: number;
  autoDismiss: boolean;
  labels: { dismiss: string; undo: string };
}

function ToastCard({ item, onDismiss, defaultDuration, autoDismiss, labels }: ToastCardProps) {
  const severity: ToastSeverity = item.severity ?? 'info';
  const duration = item.duration ?? defaultDuration;

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  const remainingRef = useRef(duration);
  const startedAtRef = useRef(0);
  const shouldAutoDismiss = autoDismiss && !item.sticky && duration > 0;

  // Giữ callback trong ref: đồng hồ chỉ phụ thuộc id/duration/pause, không phụ thuộc
  // việc consumer có tạo lại closure mỗi lần render hay không.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const itemDismissRef = useRef(item.onDismiss);
  itemDismissRef.current = item.onDismiss;
  const itemId = item.id;

  // Reset đồng hồ khi item đổi (id/duration mới).
  useEffect(() => {
    remainingRef.current = duration;
    startedAtRef.current = 0;
  }, [duration, itemId]);

  useEffect(() => {
    if (!shouldAutoDismiss || paused) return;

    startedAtRef.current = Date.now();
    const timer = window.setTimeout(() => {
      onDismissRef.current(itemId);
      itemDismissRef.current?.();
    }, remainingRef.current);

    return () => {
      window.clearTimeout(timer);
      // Pause: giữ lại phần thời gian CHƯA dùng, không reset về đầu.
      const elapsed = Date.now() - startedAtRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    };
  }, [paused, shouldAutoDismiss, itemId, duration]);

  const SeverityIcon = SEVERITY_ICON[severity];

  const handleDismiss = () => {
    onDismiss(item.id);
    item.onDismiss?.();
  };

  const handleUndo = () => {
    item.undoAction?.();
    handleDismiss();
  };

  return (
    <div
      aria-atomic="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface p-3 shadow-e2',
        'transition duration-200 ease-out starting:translate-y-2 starting:opacity-0',
        'motion-reduce:transition-none',
        SEVERITY_BORDER[severity],
      )}
    >
      <SeverityIcon
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', SEVERITY_ICON_TONE[severity])}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm text-fg">{item.message}</p>
        {item.description ? <p className="text-xs text-fg-muted">{item.description}</p> : null}

        {item.undoAction ? (
          <div className="pt-1">
            <Button variant="ghost" size="sm" onClick={handleUndo}>
              <Undo2 aria-hidden="true" className="size-3.5" />
              {item.undoLabel ?? labels.undo}
            </Button>
          </div>
        ) : null}
      </div>

      <Button iconOnly variant="ghost" size="sm" aria-label={labels.dismiss} onClick={handleDismiss}>
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
  position = 'bottom-left',
  defaultDuration = 4000,
  max = 5,
  autoDismissErrors = false,
  labels,
  className,
}: ToastViewportProps) {
  const resolvedLabels = {
    dismiss: labels?.dismiss ?? 'Đóng thông báo',
    undo: labels?.undo ?? 'Hoàn tác',
  };

  // Giữ các toast MỚI NHẤT khi vượt `max`.
  const visible = useMemo(() => (toasts.length > max ? toasts.slice(toasts.length - max) : toasts), [toasts, max]);

  const errorToasts = visible.filter((item) => item.severity === 'error');
  const politeToasts = visible.filter((item) => item.severity !== 'error');

  const renderCard = (item: ToastViewportItem) => (
    <ToastCard
      key={item.id}
      item={item}
      onDismiss={onDismiss}
      defaultDuration={defaultDuration}
      autoDismiss={!(item.severity === 'error' && !autoDismissErrors)}
      labels={resolvedLabels}
    />
  );

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-toast flex w-full max-w-sm flex-col gap-2',
        POSITION[position],
        className,
      )}
    >
      <div
        role="status"
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none flex w-full flex-col gap-2"
      >
        {politeToasts.map(renderCard)}
      </div>

      <div
        role="alert"
        aria-live="assertive"
        aria-relevant="additions text"
        className="pointer-events-none flex w-full flex-col gap-2"
      >
        {errorToasts.map(renderCard)}
      </div>
    </div>
  );
}

/**
 * Adapter tuỳ chọn sang `useUIStore` — CHỈ ĐỌC store, không sửa.
 * Không dùng cũng được: `ToastViewport` hoạt động hoàn toàn bằng props.
 */
export function useUIStoreToasts(): {
  toasts: ToastViewportItem[];
  onDismiss: (id: string) => void;
} {
  const storeToasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  const mapped = useMemo<ToastViewportItem[]>(
    () =>
      storeToasts.map((toast) => ({
        id: toast.id,
        message: toast.message,
        severity: toast.type ?? 'info',
        duration: toast.duration,
        undoAction: toast.undoAction,
        undoLabel: toast.undoLabel,
        sticky: toast.type === 'error',
      })),
    [storeToasts],
  );

  return { toasts: mapped, onDismiss: removeToast };
}
