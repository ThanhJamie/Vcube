/**
 * cn — ghép className có điều kiện, KHÔNG thêm dependency.
 *
 * `clsx` và `tailwind-merge` **không có** trong `package.json` (đã kiểm tra) nên helper
 * này chỉ nối chuỗi + lọc giá trị rỗng. Hệ quả cần biết khi dùng:
 *
 *   ⚠️ `cn()` KHÔNG giải quyết xung đột utility Tailwind. Class nào "thắng" là do
 *   THỨ TỰ TRONG CSS build ra, không phải thứ tự trong chuỗi className.
 *
 * Vì vậy mọi prop `className` của primitive trong `src/frontend/ui/**` chỉ nên **thêm**
 * class thuộc nhóm KHÁC với class nền (ví dụ `max-w-*`, `mt-*`), không nên ghi đè
 * `bg-*`/`p-*`/`rounded-*`/`text-*` đã có trong nền. Ở những chỗ buộc phải ghi đè
 * (nút danger của `ConfirmDialog`), primitive dùng inline style trỏ về token
 * (`var(--color-danger)`) để thắng chắc chắn — xem `ConfirmDialog.tsx`.
 */

export type ClassValue = string | number | null | undefined | false | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const parts: string[] = [];

  for (const value of values) {
    if (value === null || value === undefined || value === false || value === '') continue;

    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) parts.push(nested);
      continue;
    }

    parts.push(String(value));
  }

  return parts.join(' ');
}
