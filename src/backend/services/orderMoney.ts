/**
 * orderMoney — công thức chia tiền 3 bên cho MỘT đơn (FL-1).
 *
 * NGUỒN CÔNG THỨC: `supabase/migrations/20260901_baseline_schema.sql` §3b (đã chốt):
 *
 *   * Phí nền tảng tính trên `subtotal_amount` = tiền hàng TRƯỚC thuế,
 *     KHÔNG gồm `shipping_fee`, KHÔNG gồm VAT.
 *   * `platform_fee_amount = subtotal_amount × platform_fee_percent/100 + platform_fixed_fee`
 *   * `workshop_payout_amount = subtotal_amount − platform_fee_amount + shipping_fee`
 *     (% phí xưởng: `workshop_commission_terms.commission_percent` của xưởng được gán,
 *      fallback `pricing_global_settings.default_workshop_commission_percent`)
 *   * `designer_payout_amount = tiền hàng SỐ × royalty_percent/100`
 *   * Cấp ĐƠN là TỔNG của cấp DÒNG (`order_items`) — cần thiết vì một đơn được phép TRỘN
 *     hàng in + file số; tính ở cấp đơn sẽ khiến xưởng ăn phí trên tiền file số và designer
 *     nhận royalty trên tiền in (đúng cảnh báo `docs/plans/25b` mục A).
 *
 * LUẬT TRUNG THỰC DỮ LIỆU:
 *   - Mọi trường tỉ lệ/tiền **NULLABLE**: `null` = CHƯA CẤU HÌNH / CHƯA TÍNH ĐƯỢC.
 *     Tuyệt đối không trả `0` thay cho "chưa biết" (`docs/design/data-honesty.md` §3).
 *   - Hàm THUẦN (không DB, không React) để unit-test được toàn bộ công thức.
 */

export type Fulfillment = 'print' | 'digital';
export type SellerType = 'platform' | 'designer';

/** Dữ liệu cấu hình đã đọc từ DB (mỗi trường `null` = chưa cấu hình). */
export interface OrderMoneyConfig {
  /** `pricing_global_settings.vat_percent` (%) — cho VAT snapshot. */
  vatPercent: number | null;
  /** `pricing_global_settings.marketplace_fee_percent` (%) — phí nền tảng dòng FILE SỐ. */
  marketplaceFeePercent: number | null;
  /** `pricing_global_settings.marketplace_fixed_fee_vnd` — phí cố định mỗi đơn. */
  marketplaceFixedFeeVnd: number | null;
  /** % phí xưởng đã resolve cho xưởng nhận đơn (terms riêng → default → null). */
  workshopCommissionPercent: number | null;
  /** Fallback royalty: `pricing_configs.config.designerRoyaltyPercent` (%). */
  defaultDesignerRoyaltyPercent: number | null;
  /** Royalty % theo tên designer đọc từ `designer_profiles` (chỉ tên khớp DUY NHẤT). */
  designerRoyaltyByName: Record<string, number>;
}

/** Metadata sản phẩm cần cho snapshot (đọc từ `products`; thiếu ⇒ null/undefined). */
export interface OrderItemMeta {
  sellerType?: SellerType | null;
  designerId?: string | null;
}

export interface OrderMoneyItemInput {
  productId: string;
  type: 'physical' | 'digital';
  unitPrice: number;
  quantity: number;
  /** Tên designer hiển thị trên đơn — dùng tra royalty trong `designerRoyaltyByName`. */
  designerName?: string;
}

export interface ComputeOrderMoneyInput {
  items: OrderMoneyItemInput[];
  shippingFee: number;
  assignedWorkshopId?: string | null;
  config: OrderMoneyConfig;
  metaByProductId?: Record<string, OrderItemMeta>;
  /** VAT đã ghi trên đơn lúc checkout (`order.payment.tax`) — ưu tiên để hoá đơn khớp. */
  recordedVatAmount?: number | null;
  /** Tỉ lệ VAT đã ghi lúc checkout (`order.payment.vatRate` dạng phân số, 0.08). */
  recordedVatRate?: number | null;
}

/** Một dòng `order_items` đã tính (chưa có id/orderId — caller sinh khi ghi). */
export interface ComputedOrderItem {
  productId: string;
  sellerType: SellerType;
  fulfillment: Fulfillment;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  workshopId: string | null;
  designerId: string | null;
  workshopCommissionPercentSnapshot: number | null;
  royaltyPercentSnapshot: number | null;
  workshopPayoutAmount: number | null;
  designerPayoutAmount: number | null;
  platformFeeAmount: number | null;
}

/** Snapshot cấp đơn (đúng cột §3b trên `orders`) + dòng chi tiết. */
export interface ComputedOrderMoney {
  subtotalAmount: number;
  vatPercentSnapshot: number | null;
  vatAmount: number | null;
  platformFeePercentSnapshot: number | null;
  platformFixedFeeSnapshot: number | null;
  platformFeeAmount: number | null;
  workshopPayoutAmount: number | null;
  designerPayoutAmount: number | null;
  items: ComputedOrderItem[];
  /** Lý do những trường NULL (cho UI "chưa cấu hình", KHÔNG bịa số). */
  missingConfig: string[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const roundVnd = (v: number): number => Math.round(v);
const percentOf = (base: number, percent: number): number => roundVnd((base * percent) / 100);

/**
 * Tính toàn bộ tiền của đơn từ items + cấu hình.
 *
 * Ghi chú các quyết định (đều bám §3b, không tự đặt luật mới):
 * - `subtotalAmount` LUÔN tính được (từ đơn) — không phụ thuộc cấu hình.
 * - VAT ưu tiên số ĐÃ GHI trên đơn lúc checkout; nếu chưa có thì tính từ `vat_percent`.
 * - Phí nền tảng: cấp đơn = tổng phí DÒNG + phí cố định (formula ghi
 *   `+ coalesce(platform_fixed_fee_snapshot, 0)`), CHỈ khi mọi dòng tính được phí; ngược
 *   lại cấp đơn là `null` (không lấy tổng thiếu dòng).
 * - `workshop_payout_amount` chỉ có nghĩa khi đơn CÓ dòng in; cộng `shipping_fee` đúng như
 *   công thức (ship chuyển cho xưởng). Đơn thuần file số ⇒ `null`, không phải `0`.
 * - `designer_payout_amount` chỉ có nghĩa khi đơn CÓ dòng file số; không có ⇒ `null`.
 */
export function computeOrderMoney(input: ComputeOrderMoneyInput): ComputedOrderMoney {
  const { items, shippingFee, assignedWorkshopId, config, metaByProductId = {} } = input;
  const missing = new Set<string>();

  const computedItems: ComputedOrderItem[] = items.map((item) => {
    const lineTotal = roundVnd(item.unitPrice * item.quantity);
    const meta = metaByProductId[item.productId];
    const fulfillment: Fulfillment = item.type === 'digital' ? 'digital' : 'print';

    if (fulfillment === 'print') {
      const commission = config.workshopCommissionPercent;
      if (commission === null) missing.add('workshop_commission_percent');
      const platformFeeAmount = commission === null ? null : percentOf(lineTotal, commission);
      const workshopPayoutAmount = platformFeeAmount === null ? null : lineTotal - platformFeeAmount;
      return {
        productId: item.productId,
        // Hàng in do nền tảng/xưởng thực hiện; nếu sản phẩm khai seller_type thì tôn trọng.
        sellerType: meta?.sellerType ?? 'platform',
        fulfillment,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal,
        workshopId: assignedWorkshopId ?? null,
        // Không trả royalty cho dòng IN trong công thức đã chốt (§3b chỉ royalty cho file số).
        designerId: null,
        workshopCommissionPercentSnapshot: commission,
        royaltyPercentSnapshot: null,
        workshopPayoutAmount,
        designerPayoutAmount: null,
        platformFeeAmount,
      };
    }

    // FILE SỐ: royalty của designer + phí nền tảng theo % marketplace.
    const designerName = (item.designerName ?? '').trim();
    const royaltyFromProfile = designerName ? config.designerRoyaltyByName[designerName] : undefined;
    const royalty = isNum(royaltyFromProfile)
      ? royaltyFromProfile
      : isNum(config.defaultDesignerRoyaltyPercent)
        ? config.defaultDesignerRoyaltyPercent
        : null;
    if (royalty === null) missing.add('designer_royalty_percent');

    const marketplaceFee = config.marketplaceFeePercent;
    if (marketplaceFee === null) missing.add('marketplace_fee_percent');

    const designerPayoutAmount = royalty === null ? null : percentOf(lineTotal, royalty);
    const platformFeeAmount = marketplaceFee === null ? null : percentOf(lineTotal, marketplaceFee);
    const sellerType: SellerType =
      meta?.sellerType ?? (designerPayoutAmount !== null ? 'designer' : 'platform');

    return {
      productId: item.productId,
      sellerType,
      fulfillment,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal,
      workshopId: null,
      designerId: meta?.designerId ?? null,
      workshopCommissionPercentSnapshot: null,
      royaltyPercentSnapshot: royalty,
      workshopPayoutAmount: null,
      designerPayoutAmount,
      platformFeeAmount,
    };
  });

  const subtotalAmount = computedItems.reduce((sum, it) => sum + it.lineTotal, 0);

  // VAT: ưu tiên số đã ghi trên đơn (khách đã trả) → tỉ lệ đã ghi → cấu hình hiện tại.
  const recordedVat = isNum(input.recordedVatAmount) ? input.recordedVatAmount : null;
  const recordedRatePercent = isNum(input.recordedVatRate) ? input.recordedVatRate * 100 : null;
  const vatPercentSnapshot = isNum(recordedRatePercent)
    ? recordedRatePercent
    : isNum(config.vatPercent)
      ? config.vatPercent
      : null;
  const vatAmount =
    recordedVat !== null
      ? roundVnd(recordedVat)
      : isNum(config.vatPercent)
        ? percentOf(subtotalAmount, config.vatPercent)
        : null;
  if (vatPercentSnapshot === null && vatAmount === null) missing.add('vat_percent');

  // Phí nền tảng cấp đơn = tổng phí dòng + phí cố định (formula: + coalesce(fixed, 0)).
  const allLineFeesKnown = computedItems.length > 0 && computedItems.every((it) => it.platformFeeAmount !== null);
  const sumLineFees = computedItems.reduce((sum, it) => sum + (it.platformFeeAmount ?? 0), 0);
  const platformFixedFeeSnapshot = config.marketplaceFixedFeeVnd;
  const platformFeeAmount = allLineFeesKnown
    ? sumLineFees + (isNum(platformFixedFeeSnapshot) ? platformFixedFeeSnapshot : 0)
    : null;

  // Tỉ lệ % cấp đơn CHỈ ghi khi mọi dòng chịu CÙNG một tỉ lệ (nếu trộn ⇒ null, dòng giữ số).
  const lineRates = computedItems
    .map((it) => (it.fulfillment === 'print' ? it.workshopCommissionPercentSnapshot : config.marketplaceFeePercent))
    .filter((r): r is number => r !== null);
  const uniformFeeRate =
    lineRates.length === computedItems.length && new Set(lineRates).size === 1 ? lineRates[0] : null;
  const platformFeePercentSnapshot = uniformFeeRate;

  // Payout xưởng: chỉ khi CÓ dòng in và tính được mọi dòng in; + shipping theo công thức.
  const printItems = computedItems.filter((it) => it.fulfillment === 'print');
  const workshopPayoutAmount =
    printItems.length > 0 && printItems.every((it) => it.workshopPayoutAmount !== null)
      ? printItems.reduce((sum, it) => sum + (it.workshopPayoutAmount ?? 0), 0) + (isNum(shippingFee) ? shippingFee : 0)
      : null;

  // Payout designer: chỉ khi CÓ dòng file số và tính được mọi dòng số.
  const digitalItems = computedItems.filter((it) => it.fulfillment === 'digital');
  const designerPayoutAmount =
    digitalItems.length > 0 && digitalItems.every((it) => it.designerPayoutAmount !== null)
      ? digitalItems.reduce((sum, it) => sum + (it.designerPayoutAmount ?? 0), 0)
      : null;

  return {
    subtotalAmount,
    vatPercentSnapshot,
    vatAmount,
    platformFeePercentSnapshot,
    platformFixedFeeSnapshot,
    platformFeeAmount,
    workshopPayoutAmount,
    designerPayoutAmount,
    items: computedItems,
    missingConfig: Array.from(missing),
  };
}

/**
 * Idempotency THUẦN: đơn đã được xác nhận thanh toán chưa?
 * Coi là "đã xác nhận" khi DB đã ghi BẤT KỲ dấu vết nào của bước confirm:
 * `payment_status='paid'`, có payment transaction status paid, hoặc đã có order_items.
 */
export function isOrderAlreadyConfirmed(signals: {
  paymentStatus?: string | null;
  isPaid?: boolean | null;
  paymentTransactions?: { status?: string | null }[];
  orderItems?: unknown[];
}): boolean {
  if (signals.isPaid === true || signals.paymentStatus === 'paid') return true;
  if ((signals.paymentTransactions ?? []).some((tx) => (tx.status ?? '').toLowerCase() === 'paid')) return true;
  if ((signals.orderItems ?? []).length > 0) return true;
  return false;
}

/** `transaction_id` XÁC ĐỊNH theo đơn ⇒ chèn lần 2 bị UNIQUE chặn (idempotent ở DB). */
export function manualPaymentTransactionId(orderId: string): string {
  return `manual_${orderId}`;
}

/** Id ổn định cho payment row (khoá chính text) — cùng đơn ⇒ cùng id. */
export function manualPaymentRowId(orderId: string): string {
  return `pay_${orderId}`;
}

/** Dựng payload `order_items` từ kết quả `computeOrderMoney` (chưa có id/order_id). */
export function buildOrderItemRows(
  orderId: string,
  money: ComputedOrderMoney,
  makeId: () => string
): Record<string, unknown>[] {
  return money.items.map((item) => ({
    id: makeId(),
    order_id: orderId,
    product_id: item.productId,
    seller_type: item.sellerType,
    fulfillment: item.fulfillment,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
    workshop_id: item.workshopId,
    designer_id: item.designerId,
    workshop_commission_percent_snapshot: item.workshopCommissionPercentSnapshot,
    royalty_percent_snapshot: item.royaltyPercentSnapshot,
    workshop_payout_amount: item.workshopPayoutAmount,
    designer_payout_amount: item.designerPayoutAmount,
    platform_fee_amount: item.platformFeeAmount,
  }));
}
