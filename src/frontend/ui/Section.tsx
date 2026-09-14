/**
 * Section — khối nội dung có tiêu đề + ngữ cảnh + hành động, nhịp dọc chuẩn
 * (spec: docs/plans/21-saas-spec.md §2.3 + §4).
 *
 * Nhịp dọc (token trong `src/index.css`):
 * - giữa các khối trong section: `gap-block` = **16px**
 * - giữa tiêu đề và mô tả (nhãn ↔ giá trị): `gap-label` = **4px**
 * - giữa hai Section nằm cạnh nhau: dùng `space-y-section` = **24px** ở component cha
 *   (Section KHÔNG tự thêm margin ngoài — tránh margin collapse).
 *
 * Luật dùng:
 * - `title` là **heading thật** (`h2` mặc định) nên cấu trúc đề mục của trang vẫn đúng;
 *   mỗi trang chỉ có MỘT `h1` (do `PageHeader` giữ).
 * - `description` là chữ phụ (`text-fg-muted`), KHÔNG dùng `fg-subtle` cho heading.
 * - `actions` tối đa ~3 hành động; nhiều hơn thì gom vào overflow menu ở nơi gọi.
 * - Không tự vẽ viền/nền: Section là khối bố cục, không phải card. Cần card thì bọc
 *   `Card` bên trong.
 */

import { createElement } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type SectionSize = 'sm' | 'md';
export type SectionElement = 'section' | 'div' | 'article';

export interface SectionProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'className' | 'children' | 'content'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Nội dung chính. `children` được ưu tiên nếu truyền cả hai. */
  content?: ReactNode;
  children?: ReactNode;
  as?: SectionElement;
  /** `sm` cho vùng nhỏ (trong card, panel hẹp); `md` (mặc định) cho cấp trang. */
  size?: SectionSize;
  /** Vạch ngăn phía trên — dùng khi hai section cùng chức năng nằm liền nhau. */
  divided?: boolean;
  titleAs?: 'h2' | 'h3' | 'h4';
  titleId?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

const TITLE_SIZE: Record<SectionSize, string> = {
  sm: 'text-base',
  md: 'text-lg',
};

export function Section({
  title,
  description,
  actions,
  content,
  children,
  as = 'section',
  size = 'md',
  divided = false,
  titleAs = 'h2',
  titleId,
  className,
  headerClassName,
  contentClassName,
  ...rest
}: SectionProps) {
  const body = children ?? content;
  const hasHeader = Boolean(title || description || actions);

  const header = hasHeader ? (
    <div
      className={cn(
        'flex flex-col gap-block sm:flex-row sm:items-start sm:justify-between',
        headerClassName,
      )}
    >
      <div className="flex min-w-0 flex-col gap-label">
        {title
          ? createElement(
              titleAs,
              {
                id: titleId,
                className: cn(
                  TITLE_SIZE[size],
                  'font-semibold tracking-tight text-fg',
                ),
              },
              title,
            )
          : null}
        {description ? (
          <p className="max-w-prose text-sm text-fg-muted">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
      ) : null}
    </div>
  ) : null;

  return createElement(
    as as never,
    {
      ...rest,
      'aria-labelledby': title && titleId ? titleId : undefined,
      className: cn(
        'flex flex-col gap-block',
        divided && 'border-t border-line-subtle pt-block',
        className,
      ),
    } as never,
    header,
    body ? <div className={cn('min-w-0', contentClassName)}>{body}</div> : null,
  );
}
