/**
 * Button — primitive nút duy nhất của VCUBE (spec: docs/design/tokens.md §8).
 *
 * Hợp đồng:
 * - 5 biến thể: `primary` (bg-primary / text-primary-fg / shadow-e1), `secondary` (bg-surface /
 *   border-line-control / text-fg), `ghost` (text-fg-muted, hover nền `surface-muted`),
 *   `danger` (bg-danger / text-white) và `danger-ghost` (chữ `text-danger`, hover nền
 *   `danger-tint`). **Không gradient.**
 * - Biến thể hành động phá huỷ phải được chọn **bên trong** primitive: `cn()` không merge
 *   xung đột utility và thứ tự CSS build đã đo được đặt `.bg-danger` TRƯỚC `.bg-primary`,
 *   nên `className` truyền từ ngoài KHÔNG ghi đè được nhóm class nền/chữ của biến thể.
 * - Cao 40px ở desktop (`size="md"`), **≥44px dưới `md`** (390px là bề rộng chặn của QA).
 * - **Bán kính `rounded-md` = 12px** (DESIGN-LANGUAGE-v3 §2.1/§3.2: nút KHÔNG pill).
 *   `shape="pill"` là opt-in **chỉ cho nav / search / chip** — CTA, form và toolbar
 *   giữ 12px. Mặc định `shape="rounded"` nên mọi call-site cũ không đổi.
 *   `size="sm"` (36px, icon 16px) dành cho toolbar — vùng bấm mobile vẫn ≥44×44 nhờ
 *   `max-md:min-h-11` / icon-only `max-md:size-12`.
 * - Focus nhìn thấy được: ring 2px `ring-ring` + offset 2 (thay cho việc xoá outline — lỗi cũ).
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

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
/** `rounded` = 12px (mặc định, mọi control) · `pill` = chỉ nav/search/chip. */
export type ButtonShape = 'rounded' | 'pill';

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mặc định `rounded` (12px). `pill` CHỈ dùng cho điều hướng, ô tìm kiếm, chip. */
  shape?: ButtonShape;
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
  'font-medium whitespace-nowrap',
  'transition-colors duration-200 ease-out',
  'active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
  'aria-busy:cursor-progress',
].join(' ');

/** Bán kính tách khỏi BASE để `shape` là biến thể opt-in (mặc định giữ đúng 12px). */
const SHAPE: Record<ButtonShape, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full',
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-e1 hover:bg-primary-hover',
  // Nhấn mạnh trên bề mặt TỐI (banner HUD): nền accent sáng + chữ tối, tương phản mạnh.
  accent: 'bg-accent text-fg hover:brightness-95',
  secondary:
    'border border-line-control bg-surface text-fg hover:border-fg-subtle hover:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  // Nút phá huỷ — chọn ở đây, KHÔNG ghi đè `bg-*`/`text-*` từ `className`.
  // Chữ trắng trên nền danger = 5.72:1 (đạt AA; xem
  // `node scripts/check-contrast.mjs`: "fg on danger fill").
  // Hover dùng `brightness-95` (đúng DESIGN-LANGUAGE §3.2) chứ KHÔNG dùng `bg-danger/90`.
  danger: 'bg-danger text-white hover:brightness-95',
  'danger-ghost': 'text-danger hover:bg-danger-tint',
};

/** Cao 40px desktop; dưới `md` nâng lên ≥44px (đích chạm tay). */
const SIZE: Record<ButtonSize, string> = {
  // `max-md:min-h-11` (44px): nút chữ NGẮN ("sm", "Huỷ") vẫn đạt vùng bấm ≥44×44 ở mobile.
  sm: 'h-9 px-3 text-xs max-md:min-h-11',
  md: 'h-10 px-4 text-sm max-md:min-h-11',
  lg: 'h-12 px-6 text-base',
};

/** Icon-only: bỏ `px-*` của SIZE để không xung đột; 40px desktop / 48px mobile. */
const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'size-10 max-md:size-12',
  md: 'size-10 max-md:size-12',
  lg: 'size-12',
};

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    shape = 'rounded',
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

  return (
    <button
      {...rest}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? true : undefined}
      className={cn(
        BASE,
        SHAPE[shape],
        VARIANT[variant],
        iconOnly ? ICON_SIZE[size] : SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {iconOnly ? (
        loading ? (
          <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
        ) : (
          leadingIcon ?? children
        )
      ) : (
        <>
          {loading ? (
            <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          ) : (
            leadingIcon
          )}
          {loading && loadingLabel ? loadingLabel : children}
          {!loading ? trailingIcon : null}
        </>
      )}
    </button>
  );
}
