/**
 * Button — primitive nút duy nhất của VCUBE (spec: docs/design/tokens.md §8).
 *
 * Hợp đồng:
 * - 5 biến thể: `primary` (bg-primary / text-primary-fg), `secondary` (bg-surface /
 *   border-line-control / text-fg), `ghost` (không nền), `danger` (bg-danger / text-primary-fg)
 *   và `danger-ghost` (không nền, chữ `text-danger`, hover viền `danger` + nền `surface-muted`).
 *   **Không gradient.**
 * - Biến thể hành động phá huỷ phải được chọn **bên trong** primitive: `cn()` không merge
 *   xung đột utility và thứ tự CSS build đã đo được đặt `.bg-danger` TRƯỚC `.bg-primary`,
 *   nên `className` truyền từ ngoài KHÔNG ghi đè được nhóm class nền/chữ của biến thể.
 * - Cao 40px ở desktop, **≥48px dưới `md`** (390px là bề rộng chặn của QA).
 * - **Bán kính `rounded-md` = 8px** (ĐỔI 2026-09-20 — redesign Modern SaaS,
 *   `docs/plans/21-saas-spec.md` §1.1: nút KHÔNG còn pill). Token `--radius-md` điều khiển;
 *   `size="sm"` (36px, icon 16px) dành cho toolbar — vùng bấm mobile vẫn ≥44×44 nhờ
 *   `max-md:min-h-12` / `min-h-11 min-w-11` ở nhánh icon-only.
 * - Focus nhìn thấy được: ring 2px `ring-ring` (thay cho việc xoá outline — lỗi cũ).
 * - `loading`: khoá nút + spinner + `aria-busy="true"`, chặn double-click.
 * - `iconOnly`: **bắt buộc `aria-label` ở tầng type**; vùng bấm ≥44×44 (≥48×48 dưới `md`).
 * - `type` mặc định `'button'` để không vô tình submit form.
 *
 * Không dùng `asChild`/polymorphic: cần link thì bọc `<a>` ngoài hoặc dùng
 * `Button` cho hành động, `<a>` cho điều hướng.
 */

import { Loader2 } from 'lucide-react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Chữ hiện thay `children` khi `loading` (nên truyền để trạng thái không chỉ là spinner). */
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
};

type ButtonNativeProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'className' | 'aria-label'
>;

/**
 * Union phân biệt: khi `iconOnly` thì `aria-label` là **bắt buộc** — TypeScript chặn
 * nút chỉ có icon mà không có tên.
 */
export type ButtonProps =
  | (ButtonNativeProps &
      ButtonOwnProps & {
        iconOnly: true;
        'aria-label': string;
        children?: ReactNode;
      })
  | (ButtonNativeProps &
      ButtonOwnProps & {
        iconOnly?: false;
        'aria-label'?: string;
        children: ReactNode;
      });

const BASE = [
  'inline-flex shrink-0 select-none items-center justify-center gap-2',
  'rounded-md border font-medium whitespace-nowrap',
  'transition duration-150 ease-out',
  'active:scale-[0.97] motion-reduce:active:scale-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:pointer-events-none disabled:opacity-50',
  'aria-busy:cursor-progress',
].join(' ');

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border-line-control bg-surface text-fg hover:bg-surface-muted',
  ghost: 'border-transparent bg-transparent text-fg hover:bg-surface-muted',
  // Nút phá huỷ — chọn ở đây, KHÔNG ghi đè `bg-*`/`text-*` từ `className`.
  // `text-primary-fg` đổi theo theme nên một cặp class đạt AA ở cả hai:
  //   light: #FFFFFF trên #B91C1C = 6.47:1 · dark: #07272E trên #F87171 = 5.67:1
  // (xem `node scripts/check-contrast.mjs`: "fg on danger fill").
  // Hover dùng `opacity-90` (đúng thông lệ cũ của `ConfirmDialog`) chứ KHÔNG dùng `bg-danger/90`:
  // alpha modifier của token khai trong `@theme` sinh **hex tĩnh** làm fallback ngoài
  // `@supports (color:color-mix(...))` ⇒ ở dark theme nút sẽ hover bằng màu đỏ của light theme.
  danger: 'border-transparent bg-danger text-primary-fg hover:opacity-90',
  'danger-ghost':
    'border-transparent bg-transparent text-danger hover:border-danger hover:bg-surface-muted',
};

/** Cao 40px desktop; dưới `md` nâng lên ≥48px (đích chạm tay). */
const SIZE: Record<ButtonSize, string> = {
  // `max-md:min-w-11` (44px): nút chữ NGẮN ("sm", "Huỷ") vẫn đạt vùng bấm ≥44×44 ở mobile
  // (§1.3) — đo được 42×48 trước khi thêm.
  sm: 'h-9 min-h-9 px-3 text-xs max-md:min-h-11 max-md:min-w-11',
  md: 'h-10 min-h-10 px-4 text-sm max-md:min-h-11 max-md:min-w-11',
  lg: 'h-12 min-h-12 px-5 text-base',
};

/** Icon-only: bỏ `px-*` của SIZE để không xung đột, dùng min-h/min-w thay `h-*`. */
const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'aspect-square p-0 min-h-11 min-w-11 max-md:min-h-12 max-md:min-w-12',
  md: 'aspect-square p-0 min-h-11 min-w-11 max-md:min-h-12 max-md:min-w-12',
  lg: 'aspect-square p-0 min-h-12 min-w-12',
};

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    className,
    iconOnly = false,
    disabled,
    type = 'button',
    children,
    ...rest
  } = props as ButtonNativeProps &
    ButtonOwnProps & { iconOnly?: boolean; children?: ReactNode };

  const isDisabled = Boolean(disabled) || loading;

  // Icon-only: nội dung là icon (leadingIcon hoặc children).
  const content = iconOnly ? leadingIcon ?? children : children;

  return (
    <button
      {...rest}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? true : undefined}
      className={cn(
        BASE,
        VARIANT[variant],
        iconOnly ? ICON_SIZE[size] : SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
      ) : (
        leadingIcon
      )}
      {loading && !iconOnly && loadingLabel ? loadingLabel : content}
      {!loading && !iconOnly ? trailingIcon : null}
    </button>
  );
}
