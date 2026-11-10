/**
 * paymentMethods — phương thức thanh toán KHẢ DỤNG ở `/checkout` (UX-05).
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * VNPAY **chưa được kết nối** (không có provider/secret — xem
 * `docs/po/IMPLEMENTATION-PLAN-V2-2026-11-10.md` UX-05), nhưng UI cũ vẫn cho chọn như một
 * phương thức hoạt động ⇒ khách tưởng thanh toán online đã bật. Cùng lúc thông tin nhận
 * chuyển khoản (`app_settings`) có thể trống: UI phải nói rõ "chưa cấu hình" thay vì tạo
 * kỳ vọng thanh toán hoàn tất.
 *
 * File THUẦN (không React/DB) để unit-test được. Không thêm cổng/provider nào.
 */

export type CheckoutPaymentMethod = 'vietqr' | 'vnpay' | 'cod';

export interface PaymentMethodAvailability {
  method: CheckoutPaymentMethod;
  selectable: boolean;
  /** Lý do KHÔNG chọn được (VI). `null` khi chọn được. */
  reason: string | null;
}

export interface PaymentMethodContext {
  /** COD chỉ áp dụng khi giỏ có ít nhất một dòng in 3D (hàng vật lý). */
  hasPhysicalItems: boolean;
}

/** VNPAY chưa có cổng thanh toán — copy dùng nguyên văn ở UI, không hứa "sắp có". */
export const VNPAY_NOT_CONNECTED_REASON = 'Chưa kết nối cổng thanh toán VNPAY';

export function getPaymentMethodAvailability(
  method: CheckoutPaymentMethod,
  context: PaymentMethodContext
): PaymentMethodAvailability {
  if (method === 'vnpay') {
    return { method, selectable: false, reason: VNPAY_NOT_CONNECTED_REASON };
  }
  if (method === 'cod') {
    return context.hasPhysicalItems
      ? { method, selectable: true, reason: null }
      : { method, selectable: false, reason: 'Chỉ áp dụng cho đơn có hàng in 3D' };
  }
  // VietQR chuyển khoản thủ công luôn khả dụng: đơn được tạo ở trạng thái CHỜ THANH TOÁN.
  return { method, selectable: true, reason: null };
}

export function isPaymentMethodSelectable(
  method: CheckoutPaymentMethod,
  context: PaymentMethodContext
): boolean {
  return getPaymentMethodAvailability(method, context).selectable;
}

/**
 * Phương thức THỰC SỰ dùng khi tạo đơn. Nếu lựa chọn hiện tại không khả dụng (VNPAY đã gỡ,
 * COD với giỏ chỉ có tệp số) ⇒ quay về VietQR — đơn vẫn được tạo ở trạng thái chờ thanh toán.
 */
export function resolveSelectablePaymentMethod(
  method: CheckoutPaymentMethod,
  context: PaymentMethodContext
): CheckoutPaymentMethod {
  return isPaymentMethodSelectable(method, context) ? method : 'vietqr';
}

/* ── Thông tin nhận chuyển khoản (`app_settings`) ─────────────────────────── */

export type TransferInfoField = 'bankName' | 'bankAccount' | 'accountHolder';

export const TRANSFER_FIELD_LABELS: Record<TransferInfoField, string> = {
  bankName: 'ngân hàng',
  bankAccount: 'số tài khoản',
  accountHolder: 'tên pháp nhân',
};

export interface TransferInfoReadiness {
  /**
   * `true` khi đủ thông tin để CHUYỂN TIỀN: ngân hàng + số tài khoản (2/3), khớp với
   * `ManualPaymentProvider.buildInstructions().configured` (P2-3 — một định nghĩa duy nhất).
   * Tên pháp nhân vẫn được nêu trong `missing` để nhắc bổ sung nhưng không chặn chuyển khoản.
   */
  configured: boolean;
  missing: TransferInfoField[];
}

/**
 * Trạng thái trung thực của thông tin nhận tiền: thiếu trường nào nêu đúng trường đó.
 * Không suy diễn, không điền giá trị mặc định.
 */
export function getTransferInfoReadiness(info: {
  bankName?: string | null;
  bankAccount?: string | null;
  accountHolder?: string | null;
}): TransferInfoReadiness {
  const missing: TransferInfoField[] = [];
  if (!info.bankName?.trim()) missing.push('bankName');
  if (!info.bankAccount?.trim()) missing.push('bankAccount');
  if (!info.accountHolder?.trim()) missing.push('accountHolder');
  return { configured: Boolean(info.bankName?.trim() && info.bankAccount?.trim()), missing };
}
