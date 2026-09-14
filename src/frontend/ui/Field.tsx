/**
 * Field — vỏ bọc cho MỌI trường nhập liệu (spec: docs/design/tokens.md §8).
 *
 * Hợp đồng:
 * - `<label htmlFor>` **luôn tồn tại** (trước đây `htmlFor` = 0 chỗ trong `components/admin`).
 *   `id` do Field tự sinh (`useId`) nếu không truyền, nên không thể quên ghép label.
 * - Đánh dấu **cả** field bắt buộc (`*` + chữ cho screen reader) **và** không bắt buộc.
 * - Lỗi: hiện inline + `aria-invalid` + `aria-describedby` (trỏ tới cả hint và error).
 * - Hint text cho hướng dẫn; lỗi có icon + chữ (không truyền đạt chỉ bằng màu).
 * - **Component KHÔNG tự validate.** Nó chỉ render trạng thái nhận từ prop `error`.
 *   Việc gọi validate do consumer quyết định qua `onValidate`, mặc định chạy khi **blur**
 *   (`validateOn='blur'`) — không validate khi đang gõ.
 *
 * Cách dùng (render prop):
 * ```tsx
 * <Field id="email" label="Email" required error={error} hint="Dùng email công việc"
 *        onValidate={() => setError(validateEmail(value))}>
 *   {(control) => (
 *     <Input {...control} type="email" value={value} onChange={(e) => setValue(e.target.value)} />
 *   )}
 * </Field>
 * ```
 * Lưu ý: spread `{...control}` trước rồi mới tới prop của bạn. Khi `validateOn='change'`,
 * `control.onChange` được cấp thêm — nếu bạn ghi đè nó thì nhớ gọi lại bên trong handler.
 */

import { CircleAlert } from 'lucide-react';
import { useId } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent, ReactNode } from 'react';
import { cn } from './cn';

/** Props Field bơm vào control qua render prop. */
export interface FieldControlProps {
  id: string;
  required?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  /** Chỉ có mặt khi `validateOn === 'change'`. */
  onChange?: (event: ChangeEvent<HTMLElement> | FormEvent<HTMLElement>) => void;
}

export type FieldValidateOn = 'blur' | 'change';

export interface FieldProps {
  /** Nhãn hiển thị (đã có sẵn `*`/“(không bắt buộc)” do Field vẽ). */
  label: ReactNode;
  /** Render prop nhận control props; PHẢI spread `{...control}` vào control. */
  children: (control: FieldControlProps) => ReactNode;
  /** Không truyền thì Field tự sinh id bằng `useId()`. */
  id?: string;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  validateOn?: FieldValidateOn;
  /** Gọi khi cần validate (blur hoặc change theo `validateOn`). */
  onValidate?: () => void;
  /** `null` = ẩn hẳn dấu "(không bắt buộc)". */
  optionalLabel?: string | null;
  requiredLabel?: string;
  requiredMark?: string;
  /** Ẩn nhãn khỏi màn hình nhưng vẫn giữ cho screen reader (ô tìm kiếm, filter…). */
  hideLabel?: boolean;
  showErrorIcon?: boolean;
  className?: string;
  labelClassName?: string;
  hintClassName?: string;
  errorClassName?: string;
}

export function Field({
  label,
  children,
  id,
  required = false,
  error,
  hint,
  validateOn = 'blur',
  onValidate,
  optionalLabel = 'không bắt buộc',
  requiredLabel = 'bắt buộc',
  requiredMark = '*',
  hideLabel = false,
  showErrorIcon = true,
  className,
  labelClassName,
  hintClassName,
  errorClassName,
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const invalid = Boolean(error);

  const describedBy =
    [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ') || undefined;

  const control: FieldControlProps = {
    id: fieldId,
    required,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    onBlur: () => {
      if (validateOn === 'blur') onValidate?.();
    },
    ...(validateOn === 'change' ? { onChange: () => onValidate?.() } : {}),
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={fieldId}
        className={cn('text-xs font-medium text-fg-muted', hideLabel && 'sr-only', labelClassName)}
      >
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-danger">
              {requiredMark}
            </span>
            <span className="sr-only"> ({requiredLabel})</span>
          </>
        ) : optionalLabel ? (
          <span className="ml-1 font-normal text-fg-subtle">({optionalLabel})</span>
        ) : null}
      </label>

      {children(control)}

      {hint ? (
        <p id={hintId} className={cn('text-xs text-fg-subtle', hintClassName)}>
          {hint}
        </p>
      ) : null}

      {invalid ? (
        <p
          id={errorId}
          role="alert"
          className={cn('flex items-start gap-1 text-xs font-medium text-danger', errorClassName)}
        >
          {showErrorIcon ? (
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          ) : null}
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
