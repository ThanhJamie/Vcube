/**
 * Helper dùng chung cho form phụ kiện (modal tạo mới + sửa).
 * Tách riêng để component cha và `AccessoryFormFields` dùng CHUNG một cách parse số.
 */

/**
 * Đợt T: ô nhập số để trống ⇒ `null` ("chưa cấu hình"), KHÔNG quy về 0.
 * `Number('')` trả 0 nên không thể dùng lại `Number(x) || 0` như trước.
 */
export const parseNumOrNull = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : null;
};
