/**
 * contact.ts — luật chung "kênh liên hệ này có HIỂN THỊ ĐƯỢC không?".
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * `site_content` có thể chứa giá trị của seed demo (`mau@example.com`, `0000000000`),
 * giá trị admin nhập dở, hoặc nhãn `[MẪU]`. Trước đây mỗi bề mặt tự kiểm một kiểu:
 * footer lọc placeholder nhưng lại thay bằng email đoán, còn Quote/ChatSupport chỉ kiểm
 * hình thức nên vẫn mời khách gửi tới `mau@example.com`. Ba nơi phải dùng CÙNG một luật:
 * chỉ hiện email/hotline THẬT; còn lại ẩn và fallback "Hỏi trợ lý tự động".
 *
 * Hàm THUẦN — không đọc DB/backend, không phụ thuộc React.
 */

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** RFC 2606: `example.com|org|net` là tên miền dành riêng cho tài liệu/thử nghiệm. */
const RESERVED_EMAIL_DOMAIN = /@example\.(?:com|org|net)$/i;
/** Nhãn dữ liệu mẫu của `scripts/seed-sample-data.mjs` (không phải kênh liên hệ thật). */
const SAMPLE_MARKER = /\[MẪU\]/iu;

/** Email chỉ hiển thị khi có hình thức hợp lệ và không phải placeholder/dữ liệu mẫu. */
export function isDisplayableEmail(email?: string | null): boolean {
  const value = (email ?? '').trim();
  if (!value || SAMPLE_MARKER.test(value)) return false;
  if (!EMAIL_SHAPE.test(value)) return false;
  return !RESERVED_EMAIL_DOMAIN.test(value);
}

/**
 * Hotline chỉ hiển thị khi có 8–15 chữ số và không phải dãy lặp `000…`
 * (giá trị placeholder của seed) hay dữ liệu mẫu có nhãn `[MẪU]`.
 */
export function isDisplayableHotline(phone?: string | null): boolean {
  const value = (phone ?? '').trim();
  if (!value || SAMPLE_MARKER.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return false;
  return !/^0+$/.test(digits);
}
