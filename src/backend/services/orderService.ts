import { Order } from '../../types';
import type {
  ConfirmManualPaymentInput,
  ConfirmManualPaymentResult,
  ConfirmManualPaymentStep,
  OrderDetailResult,
  OrderItemRecord,
} from '../../types/orderRecords';
import { dbService } from '../supabase/database';
import { computeOrderMoney, buildOrderItemRows, isOrderAlreadyConfirmed } from './orderMoney';
import type { OrderMoneyConfig } from './orderMoney';
import { buildManualPaymentRow } from '../integrations/paymentProvider';
import { inAppNotificationProvider } from '../integrations/notificationProvider';

export type OrderStatus = Order['status'];

/**
 * Tham số ghi đơn KHÔNG nằm trong `Order`, vì chúng khác kiểu dữ liệu với thứ `Order` mang:
 *   * `Order.date` là chuỗi HIỂN THỊ ("13/9/2026 14:05") để render;
 *   * `orders.date` là `timestamptz`.
 * Trộn hai thứ này chính là lỗi `22008 date/time field value out of range` ở checkout.
 */
export interface CreateOrderOptions {
  /** `auth.uid()` của người đang đăng nhập; bỏ trống cho khách vãng lai. */
  userId?: string;
  /** ISO-8601 ghi vào `orders.date` (timestamptz). KHÔNG truyền chuỗi hiển thị. */
  createdAtIso?: string;
  /** Xưởng nhận đơn (`orders.assigned_workshop_id`); null/undefined = chưa giao xưởng. */
  assignedWorkshopId?: string | null;
}

export interface GetOrderDetailOptions {
  /**
   * Token tra cứu khách vãng lai (`orders.secure_access_token`). Có token ⇒ đọc được HÀNG
   * `orders` qua RPC SECURITY DEFINER dù không đăng nhập. Không có ⇒ RLS quyết định
   * (chủ đơn/admin).
   */
  token?: string;
}

const describeError = (err: unknown): string =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);

export class OrderService {
  /** Serialize confirm theo orderId trong CÙNG tab (double-click) — chống ghi trùng dòng tiền. */
  private static confirmInFlight = new Map<string, Promise<ConfirmManualPaymentResult>>();

  /**
   * Tạo đơn THẬT trong Supabase.
   *
   * NÉM LỖI nếu DB từ chối. Người gọi (CheckoutView) chỉ được hiện màn hình thành công
   * khi hàm này trả về bình thường — đơn chỉ tồn tại khi DB đã nhận
   * (`docs/design/data-honesty.md` OT-03).
   */
  static async createOrder(orderData: Omit<Order, 'id'>, options: CreateOrderOptions = {}): Promise<Order> {
    const newOrder: Order = {
      ...orderData,
      id: `VCB-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const result = await dbService.saveOrder(newOrder, options.userId, {
      createdAtIso: options.createdAtIso,
      assignedWorkshopId: options.assignedWorkshopId ?? null,
    });

    if (!result.success) {
      throw new Error(result.error || 'Không lưu được đơn hàng vào cơ sở dữ liệu.');
    }
    return newOrder;
  }

  static async getOrdersByCustomer(email: string): Promise<Order[]> {
    return await dbService.getOrders(email);
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus, stageIndex?: number, notes?: string): Promise<boolean> {
    const stageMap: Record<OrderStatus, number> = {
      pending_payment: 0,
      processing: 1,
      printing: 2,
      post_processing: 3,
      packaging: 4,
      shipping: 5,
      completed: 6,
      cancelled: 7,
    };
    const resolvedStage = stageIndex ?? stageMap[status] ?? 1;
    const res = await dbService.updateOrderStatus(orderId, resolvedStage, status, notes);
    return res.success;
  }

  // ==========================================================================
  // FL-1 — ĐỌC CHI TIẾT ĐƠN TỪ DB (bền qua F5) + XÁC NHẬN THANH TOÁN THỦ CÔNG
  // ==========================================================================

  /**
   * Đọc đơn + dòng tiền + giao dịch + file từ DB.
   *
   * NGUỒN THEO RLS (không cố vượt):
   * - Chủ đơn/admin: đọc `orders` + `order_items` + `payment_transactions` + `order_files`.
   * - Khách vãng lai có token: chỉ đọc được HÀNG `orders` qua RPC `get_order_by_guest_token`;
   *   các bảng con không có policy anon ⇒ trả rỗng + `sources.*='unavailable_rls'` + warning,
   *   KHÔNG bịa "đơn không có hàng".
   *
   * NÉM LỖI 'Không tìm thấy đơn hàng' khi không resolve được đơn.
   */
  static async getOrderDetail(orderId: string, options: GetOrderDetailOptions = {}): Promise<OrderDetailResult> {
    if (!orderId) throw new Error('Không tìm thấy đơn hàng.');

    const warnings: string[] = [];
    let order: Order | null = null;
    let orderSource: OrderDetailResult['sources']['order'] = 'orders_table';

    try {
      order = await dbService.getOrderById(orderId);
    } catch (err) {
      // Không có quyền đọc bảng (anon) — thử token nếu có.
      warnings.push(`Không đọc được orders qua RLS: ${describeError(err)}`);
    }

    if (!order && options.token && options.token.trim().length >= 12) {
      try {
        order = await dbService.getOrderByToken(orderId, options.token.trim());
        if (order) orderSource = 'guest_token';
      } catch (err) {
        warnings.push(`Không tra cứu được đơn bằng token: ${describeError(err)}`);
      }
    }

    if (!order) throw new Error('Không tìm thấy đơn hàng.');

    const [itemsRes, paymentsRes, filesRes] = await Promise.allSettled([
      dbService.getOrderItems(orderId),
      dbService.getPaymentTransactions(orderId),
      dbService.getOrderFiles(orderId),
    ]);

    let items: OrderItemRecord[] = [];
    let itemsSource: OrderDetailResult['sources']['items'] = 'order_items';
    if (itemsRes.status === 'fulfilled') {
      items = itemsRes.value;
    } else {
      itemsSource = orderSource === 'guest_token' ? 'unavailable_rls' : 'not_found';
      warnings.push(
        orderSource === 'guest_token'
          ? 'Đơn khách vãng lai: dòng tiền chi tiết (order_items) không đọc được bằng token — hiển thị từ snapshot `orders.items`.'
          : `Không đọc được order_items: ${describeError(itemsRes.reason)}`
      );
    }
    if (items.length === 0 && (order.items?.length ?? 0) > 0 && itemsSource === 'order_items') {
      itemsSource = 'orders_json_snapshot';
    }

    const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value : [];
    const paymentsSource: OrderDetailResult['sources']['payments'] =
      paymentsRes.status === 'fulfilled' ? 'payment_transactions' : 'unavailable_rls';
    if (paymentsRes.status === 'rejected') {
      warnings.push('Không đọc được giao dịch thanh toán (RLS/không có quyền).');
    }

    const files = filesRes.status === 'fulfilled' ? filesRes.value : [];
    const filesSource: OrderDetailResult['sources']['files'] =
      filesRes.status === 'fulfilled' ? 'order_files' : 'unavailable_rls';
    if (filesRes.status === 'rejected') {
      warnings.push('Không đọc được danh sách file của đơn (RLS/không có quyền).');
    }

    return {
      order,
      items,
      paymentTransactions: payments,
      files,
      sources: { order: orderSource, items: itemsSource, payments: paymentsSource, files: filesSource },
      warnings: Array.from(new Set(warnings)),
    };
  }

  /** Đọc cấu hình tiền + metadata sản phẩm cho snapshot. `null` = chưa cấu hình (không bịa). */
  private static async loadMoneyConfig(order: Order): Promise<{
    config: OrderMoneyConfig;
    metaByProductId: Record<string, { sellerType: 'platform' | 'designer' | null; designerId: string | null }>;
    notes: string[];
  }> {
    const notes: string[] = [];
    const productIds = Array.from(new Set(order.items.map((i) => i.id).filter(Boolean)));

    const [globalRes, pricingRes, productsRes] = await Promise.allSettled([
      dbService.getPricingGlobalMoneyConfig(),
      dbService.getPricingConfig(),
      dbService.getProductsByIds(productIds),
    ]);

    const global =
      globalRes.status === 'fulfilled'
        ? globalRes.value
        : {
            vatPercent: null,
            marketplaceFeePercent: null,
            marketplaceFixedFeeVnd: null,
            defaultWorkshopCommissionPercent: null,
          };
    if (globalRes.status === 'rejected') {
      notes.push(`Không đọc được pricing_global_settings: ${describeError(globalRes.reason)}`);
    }

    const pricing = pricingRes.status === 'fulfilled' && pricingRes.value ? pricingRes.value : null;
    if (!pricing) notes.push('Chưa cấu hình pricing_configs (không có royalty mặc định).');

    const products = productsRes.status === 'fulfilled' ? productsRes.value : [];

    const metaByProductId: Record<string, { sellerType: 'platform' | 'designer' | null; designerId: string | null }> = {};
    for (const p of products) {
      metaByProductId[p.id] = { sellerType: p.sellerType ?? null, designerId: null };
    }

    // Chiết khấu xưởng: terms riêng của xưởng được gán → default toàn hệ thống.
    let workshopCommissionPercent: number | null = null;
    if (order.assignedWorkshopId) {
      workshopCommissionPercent = await dbService.getWorkshopCommissionPercent(order.assignedWorkshopId);
    }
    if (workshopCommissionPercent === null) {
      workshopCommissionPercent = global.defaultWorkshopCommissionPercent;
      if (workshopCommissionPercent === null) {
        notes.push(
          'Chưa cấu hình % chiết khấu xưởng (workshop_commission_terms / default_workshop_commission_percent) — payout xưởng để trống.'
        );
      }
    }

    // Royalty theo tên designer (chỉ tên khớp DUY NHẤT trong designer_profiles).
    const designerNames = Array.from(new Set(order.items.map((i) => (i.designer ?? '').trim()).filter(Boolean)));
    let designerRoyaltyByName: Record<string, number> = {};
    try {
      designerRoyaltyByName = await dbService.getDesignerRoyaltyByNames(designerNames);
    } catch (err) {
      notes.push(`Không đọc được royalty designer: ${describeError(err)}`);
    }

    return {
      config: {
        vatPercent: global.vatPercent,
        marketplaceFeePercent: global.marketplaceFeePercent,
        marketplaceFixedFeeVnd: global.marketplaceFixedFeeVnd,
        workshopCommissionPercent,
        defaultDesignerRoyaltyPercent:
          typeof pricing?.designerRoyaltyPercent === 'number' && Number.isFinite(pricing.designerRoyaltyPercent)
            ? pricing.designerRoyaltyPercent
            : null,
        designerRoyaltyByName,
      },
      metaByProductId,
      notes,
    };
  }

  /**
   * ADMIN xác nhận "đã nhận tiền" cho một đơn (thủ công — không gateway).
   *
   * THỨ TỰ AN TOÀN (client-side, **KHÔNG atomic** — server-side atomic là FL-7):
   *   1) đọc đơn + kiểm idempotency (đã paid / đã có items / đã có payment ⇒ `already_confirmed`);
   *   2) đọc cấu hình ⇒ tính snapshot tiền + dòng `order_items`;
   *   3) ghi `order_items` → `payment_transactions` → `order_files`;
   *   4) CẬP NHẬT `orders` CUỐI CÙNG (điểm "commit" duy nhất nhìn thấy được);
   *   5) lỗi ở bước 3–4 ⇒ compensation xoá những gì vừa ghi, trả `failed` + lỗi thật.
   *
   * RLS: bước 3–4 chỉ chạy được với phiên ADMIN (`payment_transactions` admin-only,
   * `order_items` admin_all, `order_files` staff_insert, `orders` admin_all). Gọi bằng khách
   * ⇒ DB từ chối và trả `failed` — KHÔNG fallback service key ở client.
   */
  static async confirmManualPayment(
    orderId: string,
    input: ConfirmManualPaymentInput = {}
  ): Promise<ConfirmManualPaymentResult> {
    const existing = OrderService.confirmInFlight.get(orderId);
    if (existing) return existing;
    const run = OrderService.confirmManualPaymentInternal(orderId, input).finally(() => {
      OrderService.confirmInFlight.delete(orderId);
    });
    OrderService.confirmInFlight.set(orderId, run);
    return run;
  }

  private static async confirmManualPaymentInternal(
    orderId: string,
    input: ConfirmManualPaymentInput
  ): Promise<ConfirmManualPaymentResult> {
    const steps: ConfirmManualPaymentStep[] = [];
    const push = (step: ConfirmManualPaymentStep['step'], ok: boolean, detail?: string) =>
      steps.push({ step, ok, detail });

    // (1) Đọc đơn
    let order: Order;
    try {
      const loaded = await dbService.getOrderById(orderId);
      if (!loaded) throw new Error('Không tìm thấy đơn hàng.');
      order = loaded;
      push('load_order', true);
    } catch (err) {
      return {
        status: 'failed',
        order: { id: orderId } as Order,
        items: [],
        payments: [],
        files: [],
        steps,
        missingConfig: [],
        error: `Không tải được đơn hàng: ${describeError(err)}`,
      };
    }

    // (1b) Idempotency — đã xác nhận ⇒ trả trạng thái hiện tại, KHÔNG ghi thêm.
    try {
      const [items, payments] = await Promise.all([
        dbService.getOrderItems(orderId).catch(() => [] as OrderItemRecord[]),
        dbService.getPaymentTransactions(orderId).catch(() => []),
      ]);
      if (
        isOrderAlreadyConfirmed({
          paymentStatus: order.payment?.status,
          isPaid: order.payment?.isPaid,
          paymentTransactions: payments,
          orderItems: items,
        })
      ) {
        push('already_confirmed', true, 'Đơn đã được xác nhận thanh toán trước đó — không ghi thêm.');
        const detail = await OrderService.getOrderDetail(orderId).catch(() => null);
        return {
          status: 'already_confirmed',
          order: detail?.order ?? order,
          items: detail?.items ?? items,
          payments: detail?.payments ?? payments,
          files: detail?.files ?? [],
          steps,
          missingConfig: [],
        };
      }
    } catch (err) {
      // Không chặn confirm vì bước kiểm tra lỗi — UNIQUE ở payment sẽ chặn ghi trùng.
      push('already_confirmed', false, `Không kiểm tra được trạng thái cũ: ${describeError(err)}`);
    }

    // (2) Cấu hình + tính tiền
    let moneyBundle: Awaited<ReturnType<typeof OrderService.loadMoneyConfig>>;
    try {
      moneyBundle = await OrderService.loadMoneyConfig(order);
    } catch (err) {
      push('compute_money', false, describeError(err));
      return {
        status: 'failed',
        order,
        items: [],
        payments: [],
        files: [],
        steps,
        missingConfig: [],
        error: `Không đọc được cấu hình để tính tiền: ${describeError(err)}`,
      };
    }

    const amount =
      typeof input.amount === 'number' && Number.isFinite(input.amount) ? input.amount : order.payment?.total;

    const money = computeOrderMoney({
      items: order.items.map((i) => ({
        productId: i.id,
        type: i.type,
        unitPrice: i.price,
        quantity: i.quantity,
        designerName: i.designer,
      })),
      shippingFee: order.payment?.shippingFee ?? 0,
      assignedWorkshopId: order.assignedWorkshopId ?? null,
      config: moneyBundle.config,
      metaByProductId: moneyBundle.metaByProductId,
      recordedVatAmount: order.payment?.tax ?? null,
      recordedVatRate: order.payment?.vatRate ?? null,
    });
    push(
      'compute_money',
      true,
      `subtotal=${money.subtotalAmount}; missing=[${money.missingConfig.join(',')}]`
    );

    const missingConfig = Array.from(new Set([...moneyBundle.notes, ...money.missingConfig]));
    const createdAtIso = new Date().toISOString();
    const makeId = (): string =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `oi_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // (3a) order_items
    const itemRows = buildOrderItemRows(orderId, money, makeId);
    const itemIds = itemRows.map((r) => String(r.id));
    const itemWrite = await dbService.insertOrderItems(itemRows);
    if (!itemWrite.success) {
      push('insert_order_items', false, itemWrite.error);
      return {
        status: 'failed',
        order,
        items: [],
        payments: [],
        files: [],
        steps,
        missingConfig,
        error: `Không ghi được dòng tiền order_items: ${itemWrite.error}`,
      };
    }
    push('insert_order_items', true, `${itemRows.length} dòng`);

    // (3b) payment_transactions — `transaction_id` UNIQUE theo đơn ⇒ idempotent.
    const paymentRow = buildManualPaymentRow({
      orderId,
      amount: typeof amount === 'number' && Number.isFinite(amount) ? amount : money.subtotalAmount,
      method: input.method ?? 'vietqr_manual',
      note: input.note,
      actorId: input.actorId,
      paidAtIso: createdAtIso,
    });
    const paymentWrite = await dbService.insertPaymentTransaction(paymentRow);
    if (!paymentWrite.success) {
      await dbService.deleteOrderItemsByIds(itemIds);
      push('compensate', true, 'Đã hoàn tác order_items sau khi ghi payment thất bại');
      push('insert_payment_transaction', false, paymentWrite.error);
      return {
        status: 'failed',
        order,
        items: [],
        payments: [],
        files: [],
        steps,
        missingConfig,
        error: `Không ghi được giao dịch thanh toán: ${paymentWrite.error}`,
      };
    }
    push('insert_payment_transaction', true);

    // (3c) order_files cho dòng FILE SỐ — chỉ khi có storage_path THẬT trong digital_assets.
    const digitalItems = order.items.filter((i) => i.type === 'digital');
    const fileRows: Record<string, unknown>[] = [];
    const fileNotes: string[] = [];
    if (digitalItems.length > 0) {
      const assets = await dbService.getDigitalAssetsByProductIds(digitalItems.map((i) => i.id));
      for (const item of digitalItems) {
        const asset = assets.find((a) => a.productId === item.id);
        if (!asset) {
          fileNotes.push(
            `Sản phẩm "${item.name}" chưa có file số trong digital_assets — chưa ghi order_files (không bịa đường dẫn).`
          );
          continue;
        }
        fileRows.push({
          id: makeId(),
          order_id: orderId,
          product_id: item.id,
          storage_path: asset.storagePath,
          license: item.license ?? asset.licenseType ?? 'personal',
        });
      }
    }
    let fileIds: string[] = [];
    if (fileRows.length > 0) {
      const fileWrite = await dbService.insertOrderFiles(fileRows);
      if (!fileWrite.success) {
        await dbService.deletePaymentTransactionById(String(paymentRow.id));
        await dbService.deleteOrderItemsByIds(itemIds);
        push('compensate', true, 'Đã hoàn tác payment + order_items sau khi ghi order_files thất bại');
        push('insert_order_files', false, fileWrite.error);
        return {
          status: 'failed',
          order,
          items: [],
          payments: [],
          files: [],
          steps,
          missingConfig,
          error: `Không ghi được order_files: ${fileWrite.error}`,
        };
      }
      fileIds = fileRows.map((r) => String(r.id));
      push('insert_order_files', true, `${fileRows.length} file`);
    } else {
      push('insert_order_files', true, 'Không có dòng file số nào cần ghi');
    }

    // (4) CẬP NHẬT ORDERS — điểm "commit" cuối cùng.
    const updatedPayment = {
      ...(order.payment ?? {}),
      isPaid: true,
      paidDate: createdAtIso,
      status: 'paid' as const,
    };
    const updateRes = await dbService.updateOrderPaymentSnapshot(orderId, {
      payment_status: 'paid',
      payment: updatedPayment,
      // Đơn đã thanh toán chuyển sang bước duyệt file/cắt lớp; nấc 1 = processing.
      status: 'processing',
      status_stage_index: Math.max(order.statusStageIndex ?? 0, 1),
      subtotal_amount: money.subtotalAmount,
      vat_percent_snapshot: money.vatPercentSnapshot,
      vat_amount: money.vatAmount,
      platform_fee_percent_snapshot: money.platformFeePercentSnapshot,
      platform_fixed_fee_snapshot: money.platformFixedFeeSnapshot,
      platform_fee_amount: money.platformFeeAmount,
      workshop_payout_amount: money.workshopPayoutAmount,
      designer_payout_amount: money.designerPayoutAmount,
      // Payout mặc định chưa chi; FL-4 sẽ cập nhật paid/partial + audit.
      workshop_payout_status: 'unpaid',
      designer_payout_status: 'unpaid',
    });
    if (!updateRes.success) {
      await dbService.deleteOrderFilesByIds(fileIds);
      await dbService.deletePaymentTransactionById(String(paymentRow.id));
      await dbService.deleteOrderItemsByIds(itemIds);
      push('compensate', true, 'Đã hoàn tác order_files + payment + order_items sau khi cập nhật orders thất bại');
      push('update_order', false, updateRes.error);
      return {
        status: 'failed',
        order,
        items: [],
        payments: [],
        files: [],
        steps,
        missingConfig,
        error: `Không cập nhật được đơn hàng: ${updateRes.error}`,
      };
    }
    push('update_order', true);

    // (5) Đọc lại từ DB (nguồn duy nhất) + thông báo in-app.
    const detail = await OrderService.getOrderDetail(orderId);
    await inAppNotificationProvider.send({
      type: 'payment_confirmed',
      orderId,
      title: `Đã xác nhận thanh toán đơn ${detail.order.orderNumber}`,
      data: { amount: amount ?? null, method: input.method ?? 'manual', actorId: input.actorId ?? null },
      createdAtIso,
    });

    return {
      status: 'confirmed',
      order: detail.order,
      items: detail.items,
      payments: detail.paymentTransactions,
      files: detail.files,
      steps,
      missingConfig: Array.from(new Set([...missingConfig, ...fileNotes])),
    };
  }
}
