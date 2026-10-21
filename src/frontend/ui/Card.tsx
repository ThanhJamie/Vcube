/**
 * Card — bề mặt phẳng có viền (spec: docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md §3.1).
 *
 * - `variant="flat"` (MẶC ĐỊNH, giữ nguyên hành vi v2/console): `rounded-lg` (20px) +
 *   **`border-line-subtle`** + `bg-surface` + `shadow-e0`. Phân tách bằng **viền nhạt** thay
 *   cho bóng; `shadow-e0` (không bóng) vì "**không** bóng cho phần tử trong luồng".
 *   (CC-05, W5: trả primitive về `line-subtle` — 103 panel/card tự dựng trong console cũng
 *   dùng `line-subtle`; `line` chỉ dành cho panel mạnh: band, modal, popover, toolbar.)
 * - `variant="soft"` (v3, opt-in cho storefront — Home/Explore/PDP/commerce): **bỏ viền**,
 *   dùng `--shadow-soft` ấm. `interactive` khi đó nâng lên `shadow-e2` thay vì thêm viền.
 *   Console KHÔNG dùng variant này (density + hairline), trừ khi được duyệt.
 * - **Không gradient.**
 * - `interactive`: hover nâng elevation. Khi card có `onClick` mà phần tử không
 *   phải `<button>`/`<a>`, Card tự thêm `role="button"` + `tabIndex=0` + xử lý
 *   `Enter`/`Space` — sửa đúng lỗi U4 của QA checklist (overlay chỉ hover được, không
 *   tới được bằng bàn phím).
 * - Kèm sẵn `CardHeader/CardTitle/CardDescription/CardContent/CardFooter` để các view
 *   không phải tự dựng lại padding.
 */

import { createElement } from 'react';
import type { HTMLAttributes, KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode, Ref } from 'react';
import { cn } from './cn';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardElement = 'div' | 'article' | 'section' | 'li' | 'button' | 'a';
/** `flat` = viền hairline (console, mặc định cũ) · `soft` = borderless + shadow ấm (storefront v3). */
export type CardVariant = 'flat' | 'soft';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  as?: CardElement;
  /** Mặc định `flat` — đổi sang `soft` là quyết định của từng bề mặt, không phải global. */
  variant?: CardVariant;
  interactive?: boolean;
  padding?: CardPadding;
  className?: string;
  children?: ReactNode;
  href?: string;
  ref?: Ref<HTMLElement>;
}

const BASE = 'rounded-lg bg-surface text-fg';

const VARIANT: Record<CardVariant, string> = {
  flat: 'border border-line-subtle shadow-e0',
  soft: 'border-0 shadow-soft',
};

/* Mật độ "Soft Studio" §2.3 + docs/design/tokens.md: sm 12 / md 16 / lg 20. */
const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

/**
 * A11Y-02 (W5c): `focus-visible:ring-*` KHÔNG được vẽ trên `variant="flat"` vì `shadow-e0`/`shadow-e1`
 * cũng ghi `box-shadow` (đo trên admin StatCard: `boxShadow: none`, `outline-style: none`).
 * Giữ ring (cho các trình duyệt/utility nơi ring thắng cascade) + thêm **outline không dùng shadow**
 * làm chỉ báo chắc chắn. Bỏ `outline-none`: ở Tailwind v4 `outline-none` đặt
 * `--tw-outline-style: none` nên nếu giữ, `outline-2` cũng bị vô hiệu.
 */
const INTERACTIVE_BASE =
  'cursor-pointer transition-shadow duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none';

const INTERACTIVE: Record<CardVariant, string> = {
  flat: 'hover:border-line hover:shadow-e1',
  soft: 'hover:shadow-e2',
};

export function Card({
  as = 'div',
  variant = 'flat',
  interactive = false,
  padding = 'md',
  className,
  children,
  onClick,
  onKeyDown,
  ...rest
}: CardProps) {
  const isNativeInteractive = as === 'button' || as === 'a';
  const needsKeyboardShim = interactive && Boolean(onClick) && !isNativeInteractive;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (!needsKeyboardShim || event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(event as unknown as ReactMouseEvent<HTMLElement>);
    }
  };

  return createElement(
    as as never,
    {
      ...rest,
      onClick,
      onKeyDown: handleKeyDown,
      role: needsKeyboardShim ? (rest.role ?? 'button') : rest.role,
      tabIndex: needsKeyboardShim ? (rest.tabIndex ?? 0) : rest.tabIndex,
      className: cn(
        BASE,
        VARIANT[variant],
        PADDING[padding],
        interactive && INTERACTIVE_BASE,
        interactive && INTERACTIVE[variant],
        className,
      ),
    } as never,
    children,
  );
}

export interface CardSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  className?: string;
  children?: ReactNode;
}

export function CardHeader({ className, children, ...rest }: CardSectionProps) {
  return (
    <div {...rest} className={cn('flex items-start justify-between gap-3', className)}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends Omit<HTMLAttributes<HTMLHeadingElement>, 'className'> {
  className?: string;
  children?: ReactNode;
}

export function CardTitle({ className, children, ...rest }: CardTitleProps) {
  return (
    <h3 {...rest} className={cn('text-base font-semibold tracking-tight text-fg', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...rest }: CardSectionProps) {
  return (
    <p {...rest} className={cn('text-xs text-fg-muted', className)}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...rest }: CardSectionProps) {
  return (
    <div {...rest} className={cn('text-sm text-fg', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: CardSectionProps) {
  return (
    <div {...rest} className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
    </div>
  );
}
