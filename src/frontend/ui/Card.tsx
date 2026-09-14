/**
 * Card — bề mặt phẳng có viền (spec: docs/design/tokens.md §8).
 *
 * - `rounded-lg` (12px) + **`border-line-subtle`** + `bg-surface` + `shadow-e0`.
 *   ĐỔI 2026-09-20 (redesign Modern SaaS, `docs/plans/21-saas-spec.md` §1.2): phân tách
 *   bằng **viền nhạt** thay cho `border-line` đậm hơn. Chọn `shadow-e0` (không bóng) làm
 *   mặc định vì §2.4 quy định "**không** bóng cho phần tử trong luồng" — Card mặc định
 *   nằm trong luồng; chỉ khi `interactive` mới nâng lên `shadow-e1` (card nổi).
 * - **Không gradient.**
 * - `interactive`: hover nâng lên `shadow-e1`. Khi card có `onClick` mà phần tử không
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

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  as?: CardElement;
  interactive?: boolean;
  padding?: CardPadding;
  className?: string;
  children?: ReactNode;
  href?: string;
  ref?: Ref<HTMLElement>;
}

const BASE = 'rounded-lg border border-line-subtle bg-surface text-fg shadow-e0';

/* Mật độ SaaS §1.3: padding panel 16–20px (bản cũ cho `lg` tới 24px). */
const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const INTERACTIVE =
  'cursor-pointer transition-shadow duration-150 ease-out hover:shadow-e1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Card({
  as = 'div',
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
      className: cn(BASE, PADDING[padding], interactive && INTERACTIVE, className),
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
