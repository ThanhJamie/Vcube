/**
 * Một câu chuyện VAT duy nhất cho toàn funnel: /quote → /cart → /checkout → /orders → hoá đơn.
 *
 * Chốt (theo `docs/plans/03-pages-transaction.md` §3.2 #3 và §1.4 #30):
 *  - Giá niêm yết của VCUBE là giá CHƯA gồm VAT.
 *  - VAT là MỘT DÒNG RIÊNG, không được gộp vào giá đơn vị.
 *  - Cùng một tỉ lệ, cùng một cách làm tròn ở mọi màn hình.
 *
 * LỊCH SỬ — ĐÃ SỬA ở Đợt 9 / R1 (2026-09-12), nêu đúng trạng thái code:
 *  - `QuoteSummaryPanel` (route `/quote`) ghi nhãn "Đã gồm VAT & Gói …" trong khi giá gói là
 *    giá CHƯA gồm VAT — câu đó VẪN CÒN trong mã tới hết Đợt 8C. Bản comment trước ở đây đọc
 *    như thể lỗi đã được sửa, tức là comment nói dối về trạng thái code; nay đã bỏ nhãn sai
 *    và thay bằng DÒNG VAT thật.
 *  - `CheckoutView` set `tax: 0` còn `InvoiceModal` tự cộng thêm 8% ⇒ ba con số khác nhau
 *    cho cùng một đơn.
 *  - Nay cả BỐN chỗ (`/quote`, `/cart`, `/checkout`, hoá đơn) cùng gọi `computeVat` với CÙNG
 *    một tỉ lệ đọc từ `pricing_global_settings.vat_percent` ⇒ chỉ còn MỘT con số.
 *
 * ═══ Đợt 9 (R1) — NGUỒN CỦA TỈ LỆ: `pricing_global_settings.vat_percent` ═══
 * File này TỪNG chứa hằng số `VAT_RATE = 0.08` và mọi call site im lặng dùng nó, nên
 * hoá đơn vẫn in "VAT 8%" kể cả khi chưa ai cấu hình thuế. Nay:
 *
 *   * KHÔNG còn tỉ lệ mặc định trong mã. Tỉ lệ đến từ `pricing_global_settings.vat_percent`
 *     (Supabase) và được truyền **tường minh** vào các hàm dưới đây.
 *   * `vat_percent` NULL/rỗng = **CHƯA CẤU HÌNH** ⇒ `computeVat` trả `null` ⇒ caller **ẩn
 *     dòng VAT** và nói rõ bằng `vatNotConfiguredLabel()`. KHÔNG in `0%`, KHÔNG in `8%`,
 *     KHÔNG in `—`.
 *   * `vat_percent = 0` là giá trị THẬT (VAT 0%) — khác hẳn `null`.
 *   * Hàm ở đây THUẦN (không DB, không React) nên test được; việc đọc DB thuộc call site
 *     (`usePricingGlobalSettings()` / `settingsAccessors.pricingGlobal()`).
 *
 * CÔNG THỨC KHÔNG ĐỔI: `Math.round(base * rate)`, tiền làm tròn về đồng,
 * `total = base + amount`; đơn vị tỉ lệ vẫn là PHÂN SỐ (0.08) đúng như `VatLine.rate` và
 * `Order.payment.vatRate` đang lưu trong DB — `vatRateFromPercent()` chỉ là phép quy đổi
 * ở BIÊN (8 → 0.08), không phải một công thức mới.
 */
import { VatLine } from '../../types';

/** Đường dẫn admin để cấu hình lại — dùng chung trong câu giải thích. */
export const VAT_CONFIG_PATH = '/admin → Cấu hình giá → Thuế VAT';

/**
 * Quy đổi `pricing_global_settings.vat_percent` (phần trăm, ví dụ `8`) sang tỉ lệ dùng
 * trong công thức (`0.08`) — đúng đơn vị mà `VatLine.rate` / `Order.payment.vatRate` lưu.
 *
 * Trả `null` = **CHƯA CẤU HÌNH** (KHÔNG rơi về 0.08). `0` là giá trị thật (VAT 0%).
 */
export function vatRateFromPercent(percent: number | null | undefined): number | null {
  if (percent === null || percent === undefined) return null;
  const x = Number(percent);
  return Number.isFinite(x) ? x / 100 : null;
}

/**
 * Tính dòng VAT từ số tiền chịu thuế (đã trừ giảm giá, đã gồm phí vận chuyển).
 * Tiền VAT được làm tròn về đồng; `total` = tiền chịu thuế + VAT.
 *
 * `rate === null` ⇒ **CHƯA CẤU HÌNH**: trả `null` để caller ẩn dòng VAT (KHÔNG trả 0%).
 */
export function computeVat(taxableAmount: number, rate: number | null): VatLine | null {
  if (rate === null || !Number.isFinite(rate)) return null;
  const base = Math.max(0, Math.round(taxableAmount));
  const amount = Math.round(base * rate);
  return {
    rate,
    taxableAmount: base,
    amount,
    total: base + amount,
  };
}

/**
 * Nhãn hiển thị thống nhất cho dòng VAT, ví dụ `VAT (8%)`.
 * `null` ⇒ chưa cấu hình ⇒ caller ẩn dòng (KHÔNG in "VAT (0%)" hay "VAT (—)").
 */
export function vatLabel(rate: number | null): string | null {
  if (rate === null || !Number.isFinite(rate)) return null;
  return `VAT (${Math.round(rate * 100)}%)`;
}

/**
 * Câu nói TRUNG THỰC khi chưa cấu hình `vat_percent`: thay cho dòng VAT bị ẩn.
 * Dùng chung ở mọi màn hình để không nơi nào tự bịa một tỉ lệ.
 */
export function vatNotConfiguredLabel(isVi: boolean): string {
  return isVi
    ? `VAT chưa được cấu hình — đơn chưa được cộng thuế (${VAT_CONFIG_PATH}).`
    : `VAT is not configured — no tax is added to this order (${VAT_CONFIG_PATH}).`;
}

/**
 * Câu nhỏ dưới tổng tiền. Chỉ nhắc tỉ lệ khi ĐÃ cấu hình — chưa cấu hình thì nói thẳng
 * là chưa cấu hình thay vì hứa "VAT là dòng riêng" như thể có một dòng thật.
 */
export function vatTotalNote(isVi: boolean, rate: number | null): string {
  if (rate === null) return vatNotConfiguredLabel(isVi);
  return isVi
    ? 'Giá niêm yết chưa gồm VAT • VAT là dòng riêng'
    : 'Prices exclude VAT • VAT shown separately';
}
