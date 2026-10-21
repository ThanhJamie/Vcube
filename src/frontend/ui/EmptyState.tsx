/**
 * EmptyState — trạng thái rỗng có nghĩa (spec §8 + `docs/design/qa-checklist.md` mục U2).
 *
 * Hợp đồng: **icon + 1 câu nêu NGUYÊN NHÂN + 1 hành động**.
 * - `description` là **bắt buộc ở tầng type** — đúng yêu cầu "1 câu nêu nguyên nhân";
 *   đừng viết "Không có dữ liệu" chung chung, hãy nói vì sao rỗng (chưa có đơn nào khớp
 *   bộ lọc / tài khoản chưa mua bản vẽ nào…).
 * - `action` là 1 CTA duy nhất (nút reset bộ lọc, nút "Tải file lên"…).
 * - `live`: bọc `role="status"` cho trường hợp empty state xuất hiện SAU một tác vụ
 *   (lọc xong mới rỗng) để screen reader được thông báo.
 */

import { Inbox } from 'lucide-react';
import { createElement, isValidElement } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { cn } from './cn';

export type EmptyStateSize = 'sm' | 'md';

export type EmptyStateIcon = ComponentType<Record<string, unknown>> | ReactElement;

export interface EmptyStateProps {
  title: ReactNode;
  /** BẮT BUỘC: 1 câu nêu nguyên nhân. */
  description: ReactNode;
  icon?: EmptyStateIcon;
  /** 1 hành động (nút/link). */
  action?: ReactNode;
  size?: EmptyStateSize;
  bordered?: boolean;
  live?: boolean;
  className?: string;
}

const SIZE: Record<EmptyStateSize, string> = {
  sm: 'px-4 py-6',
  md: 'px-6 py-10',
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  size = 'md',
  bordered = false,
  live = false,
  className,
}: EmptyStateProps) {
  const iconNode = isValidElement(icon)
    ? icon
    : createElement((icon ?? Inbox) as ComponentType<Record<string, unknown>>, {
        className: 'size-5',
        size: 20,
        'aria-hidden': true,
      });

  return (
    <div
      role={live ? 'status' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        SIZE[size],
        bordered && 'rounded-lg border border-line-subtle bg-surface',
        className,
      )}
    >
      {/* Ô icon 48px: v3 nâng `--radius-lg` lên 20px nên `rounded-lg` ở đây sẽ thành
          gần tròn (bẫy A19) — dùng `rounded-md` (12px, ~0.5 cạnh) là bán kính đúng. */}
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-md bg-surface-muted text-fg-subtle"
      >
        {iconNode}
      </span>

      <div className="flex max-w-prose flex-col gap-1">
        <p className="text-base font-semibold text-fg">{title}</p>
        <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      </div>

      {action ? <div className="flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
