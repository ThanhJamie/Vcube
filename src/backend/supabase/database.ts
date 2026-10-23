import { supabase } from './client';
import { Order, Product, MaterialProfile, PrinterProfile, AppUserProfile, WorkshopPartner, AccessoryItem, SiteContentConfig, InkiriCostFormulaConfig } from '../../types';
// Chỉ còn nhãn mặc định cho `site_content` (đã bỏ mọi tuyên bố không kiểm chứng
// được — docs/design/data-honesty.md AT-06/CI-01). Mọi fixture thực thể đã bị gỡ.
import { DEFAULT_SITE_CONTENT } from '../../data/mockData';
// Row → domain: MỘT nơi duy nhất (06 §2.5). Xem src/backend/supabase/mappers.ts.
import {
  rowToProduct,
  rowToOrder,
  rowToMaterial,
  rowToPrinter,
  rowToUserProfile,
  rowToSiteContent,
  rowToAccessory,
  rowToWorkshopPartner,
  rowToOrderItem,
  rowToPaymentTransaction,
  rowToOrderFile,
} from './mappers';
import type {
  OrderFileRecord,
  OrderItemRecord,
  PaymentTransactionRecord,
} from '../../types/orderRecords';
// Hợp đồng ghi canonical (discriminated union) — xem src/backend/lib/result.ts.
import { ok, fail, type WriteResult } from '../lib/result';

/**
 * Quy tắc bán hàng mặc định (một nguồn duy nhất cho phí ship / ngưỡng freeship).
 * Giá trị thật có thể bị `site_content` ghi đè (xem `getSiteContent`).
 */
export const DEFAULT_SALES_RULES = {
  standardShippingFee: 30000,
  freeShippingThreshold: 300000,
} as const;

/**
 * Tính phí vận chuyển từ MỘT nguồn duy nhất. Mọi view (cart, drawer, checkout,
 * invoice) phải gọi hàm này thay vì hardcode 25.000 / 30.000.
 */
export function computeShippingFee(
  subtotalPhysical: number,
  hasPhysicalItems: boolean,
  rules: { standardShippingFee?: number; freeShippingThreshold?: number } = {}
): number {
  if (!hasPhysicalItems) return 0;
  const fee = rules.standardShippingFee ?? DEFAULT_SALES_RULES.standardShippingFee;
  const threshold = rules.freeShippingThreshold ?? DEFAULT_SALES_RULES.freeShippingThreshold;
  return subtotalPhysical >= threshold ? 0 : fee;
}

/**
 * Map 1 dòng `orders` (Supabase) → `Order` của UI.
 *
 * Logic đã được gom về `src/backend/supabase/mappers.ts` (06 §2.5). Giữ alias này
 * để call site nội bộ và mọi import cũ không phải đổi.
 */
const mapOrderRow = rowToOrder;

/**
 * Trường storefront CHƯA có cột riêng trong `site_content` — chúng nằm trong cột
 * `settings` (jsonb, xem 20260901_baseline_schema.sql).
 *
 * Vì sao cần: `AdminStorefrontPanel` đã cho admin sửa `standardShippingFee`
 * (`:638`), `freeShippingThreshold` (`:628`) và `toleranceSpec`, nhưng
 * `saveSiteContent` chỉ upsert 9 cột nên các giá trị đó **bị bỏ mất âm thầm** —
 * admin tưởng đã lưu. `settingsService.saveSiteContent()` (A8) đã ghi đúng; hai hàm
 * dưới đây đóng nốt vòng đọc/ghi của `dbService` để không còn đường nào làm mất dữ liệu.
 *
 * LUẬT "VẮNG MẶT = ĐÃ XOÁ" (W3-A/Bug 2): `saveSiteContent(content)` nhận MỘT
 * `SiteContentConfig` ĐẦY ĐỦ (không phải patch). Với 3 khoá trên: CÓ trong `content` ⇒ giá
 * trị đó là giá trị phải lưu; VẮNG MẶT ⇒ admin đã XOÁ ⇒ khoá phải BIẾN MẤT khỏi jsonb.
 * Trước đây `writeSiteContentExtras` trả `null` khi cả 3 khoá đều vắng ⇒ `saveSiteContent`
 * bỏ luôn cột `settings` ⇒ jsonb giữ nguyên số CŨ và thao tác xoá trắng của admin không có
 * tác dụng gì (im lặng). Xem `saveSiteContent` để biết vì sao cách ghi mới KHÔNG xoá khoá
 * của người khác.
 */
const SITE_CONTENT_EXTRA_KEYS = [
  'standardShippingFee',
  'freeShippingThreshold',
  'toleranceSpec',
  'customIdeaActive',
  'customIdeaBadge',
  'customIdeaTitle',
  'customIdeaSubtitle',
  'customIdeaCtaText',
  'customIdeaImageUrl',
  'customIdeaStep1Title',
  'customIdeaStep1Desc',
  'customIdeaStep2Title',
  'customIdeaStep2Desc',
  'customIdeaStep3Title',
  'customIdeaStep3Desc',
] as const;

function readSiteContentExtras(settings: unknown): Partial<SiteContentConfig> {
  if (!settings || typeof settings !== 'object') return {};
  const j = settings as Record<string, unknown>;
  const out: Partial<SiteContentConfig> = {};
  const fee = Number(j.standardShippingFee);
  const threshold = Number(j.freeShippingThreshold);
  if (j.standardShippingFee !== undefined && Number.isFinite(fee)) out.standardShippingFee = fee;
  if (j.freeShippingThreshold !== undefined && Number.isFinite(threshold)) out.freeShippingThreshold = threshold;
  if (typeof j.toleranceSpec === 'string') out.toleranceSpec = j.toleranceSpec;

  // Custom 3D Model by Idea Section settings
  if (typeof j.customIdeaActive === 'boolean') out.customIdeaActive = j.customIdeaActive;
  if (typeof j.customIdeaBadge === 'string') out.customIdeaBadge = j.customIdeaBadge;
  if (typeof j.customIdeaTitle === 'string') out.customIdeaTitle = j.customIdeaTitle;
  if (typeof j.customIdeaSubtitle === 'string') out.customIdeaSubtitle = j.customIdeaSubtitle;
  if (typeof j.customIdeaCtaText === 'string') out.customIdeaCtaText = j.customIdeaCtaText;
  if (typeof j.customIdeaImageUrl === 'string') out.customIdeaImageUrl = j.customIdeaImageUrl;
  if (typeof j.customIdeaStep1Title === 'string') out.customIdeaStep1Title = j.customIdeaStep1Title;
  if (typeof j.customIdeaStep1Desc === 'string') out.customIdeaStep1Desc = j.customIdeaStep1Desc;
  if (typeof j.customIdeaStep2Title === 'string') out.customIdeaStep2Title = j.customIdeaStep2Title;
  if (typeof j.customIdeaStep2Desc === 'string') out.customIdeaStep2Desc = j.customIdeaStep2Desc;
  if (typeof j.customIdeaStep3Title === 'string') out.customIdeaStep3Title = j.customIdeaStep3Title;
  if (typeof j.customIdeaStep3Desc === 'string') out.customIdeaStep3Desc = j.customIdeaStep3Desc;

  return out;
}

/**
 * 3 khoá mở rộng → object để ghi vào cột `settings`.
 *
 * LUÔN trả một object, kể cả `{}`: quyết định "ghi cột `settings` thế nào" nay thuộc
 * `saveSiteContent` và dựa trên jsonb HIỆN CÓ, chứ KHÔNG dựa vào việc object này rỗng —
 * chính chỗ `return null` cũ là nguyên nhân "xoá cả hai ô mà không xoá được" (Bug 2).
 */
function writeSiteContentExtras(content: SiteContentConfig): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  for (const key of SITE_CONTENT_EXTRA_KEYS) {
    const v = (content as any)[key];
    if (v !== undefined) extras[key] = v;
  }
  return extras;
}

/**
 * Chuẩn hoá một giá trị thời gian thành ISO-8601, hoặc `null` nếu không phải mốc thời gian.
 *
 * VÌ SAO CẦN (`orders.date` là `timestamptz` — 20260901_baseline_schema.sql:610): chỗ gọi
 * từng truyền thẳng chuỗi HIỂN THỊ của UI ("13/9/2026 14:05") vào cột đó ⇒ Postgres trả
 * `22008 date/time field value out of range` và đơn KHÔNG được ghi. Chuỗi hiển thị chỉ để
 * render; xuống DB chỉ có ISO-8601.
 */
function toIsoTimestampOrNull(value: unknown): string | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

export const dbService = {
  // Products
  // LUẬT TRUNG THỰC DỮ LIỆU (docs/design/data-honesty.md CI-01): lỗi truy vấn ⇒ ném lỗi
  // THẬT để caller hiện trạng thái "lỗi khi tải"; bảng rỗng ⇒ [] để caller hiện trạng
  // thái rỗng. KHÔNG rơi về fixture `PRODUCTS`, KHÔNG đọc localStorage.
  async getProducts(filterParams?: { status?: string; category?: string; limit?: number; offset?: number }): Promise<Product[]> {
    let query = supabase.from('products').select('*');

    if (filterParams?.status) {
      query = query.eq('status', filterParams.status.toLowerCase());
    }
    if (filterParams?.category && filterParams.category !== 'all') {
      query = query.eq('category', filterParams.category);
    }
    if (filterParams?.limit) {
      const offset = filterParams.offset || 0;
      query = query.range(offset, offset + filterParams.limit - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Không tải được danh sách sản phẩm: ${error.message}`);
    }
    return (data ?? []).map(rowToProduct);
  },

  async saveProduct(product: Product): Promise<WriteResult> {
    try {
      const normalizedStatus = (product.status ? product.status.toLowerCase() : 'published');
      const { error } = await supabase.from('products').upsert({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        designer: product.designer,
        price_physical: product.pricePhysical,
        price_digital: product.priceDigital,
        images: product.images,
        thumbnail_url: product.thumbnailUrl || product.images?.[0] || '',
        cad_file_url: product.cadFileUrl || '',
        cad_format: product.cadFormat || 'STL',
        file_size_bytes: product.fileSizeBytes || 0,
        description: product.description,
        features: product.features,
        specs: product.specs,
        supported_materials: product.supportedMaterials,
        colors: product.colors,
        tags: product.tags,
        badge: product.badge,
        rating: product.rating,
        reviews_count: product.reviewsCount,
        prints_count: product.printsCount,
        print_time: product.printTime,
        is_customizable: product.isCustomizable,
        status: normalizedStatus,
        production_readiness: product.productionReadiness || 'ready_to_print',
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.warn('Supabase saveProduct error:', error.message);
        return fail(error);
      }
      return ok();
    } catch (err: any) {
      console.warn('DB error on saveProduct:', err);
      return fail(err);
    }
  },

  async deleteProduct(productId: string): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) {
        console.warn('Supabase deleteProduct error:', error.message);
        return fail(error);
      }
      return ok();
    } catch (err: any) {
      console.warn('DB error on deleteProduct:', err);
      return fail(err);
    }
  },

  // Orders
  // LUẬT TRUNG THỰC DỮ LIỆU (docs/design/data-honesty.md OT-03/PC-03): đơn chỉ tồn tại
  // khi DB đã nhận. Ghi DB lỗi ⇒ trả `success: false` + lỗi thật; KHÔNG ghi localStorage
  // (localStorage không phải nguồn dữ liệu đơn hàng). Không tự bịa email/tên khách.
  async saveOrder(
    order: Order,
    explicitUserId?: string,
    options?: {
      /**
       * B2 — ISO-8601 cho `orders.date` (timestamptz). `Order.date` là chuỗi HIỂN THỊ;
       * truyền thẳng nó xuống DB là lỗi `22008`. Bỏ trống ⇒ suy từ `order.date` nếu nó
       * là mốc thời gian hợp lệ, còn không thì lấy thời điểm ghi.
       */
      createdAtIso?: string;
      /** B1b — xưởng nhận đơn (`orders.assigned_workshop_id`). null = chưa giao xưởng. */
      assignedWorkshopId?: string | null;
    }
  ): Promise<WriteResult> {
    try {
      const customerEmail = order.shippingAddress?.email || '';
      const customerName = order.shippingAddress?.fullName || '';
      const customerPhone = order.shippingAddress?.phone || '';
      const totalAmount = order.payment?.total || 0;
      const shippingFee = order.payment?.shippingFee || 0;
      const secureToken = order.secureAccessToken || `token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const nowIso = new Date().toISOString();

      // B2: chỉ ISO-8601 được ghi vào `orders.date` (timestamptz). Ưu tiên mốc ISO do
      // caller truyền, rồi tới `order.date` NẾU nó là mốc thời gian hợp lệ, cuối cùng là
      // thời điểm ghi. Chuỗi hiển thị kiểu "13/9/2026 14:05" KHÔNG BAO GIỜ tới được cột.
      const orderDateIso =
        toIsoTimestampOrNull(options?.createdAtIso) || toIsoTimestampOrNull(order.date) || nowIso;

      // Pass full user_id from user account if logged in (ensuring RLS auth.uid() = user_id works)
      let userId: string | null = explicitUserId || (order as any).userId || (order as any).user_id || null;
      if (!userId) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.id) {
            userId = authData.user.id;
          }
        } catch {
          // ignore: guest checkout — không có phiên đăng nhập.
        }
      }

      // FL-1: dùng INSERT (không phải UPSERT) — `ON CONFLICT DO UPDATE` yêu cầu policy UPDATE
      // trên `orders`, mà KHÁCH chỉ có policy INSERT (`vcube_orders_guest_insert`). Dùng upsert
      // khiến guest checkout bị RLS từ chối (42501) dù INSERT hợp lệ. Đơn tạo mới luôn là INSERT;
      // trùng id ⇒ lỗi thật (không ghi đè đơn đã có).
      const { error } = await supabase.from('orders').insert({
        id: order.id,
        order_number: order.orderNumber,
        user_id: userId,
        date: orderDateIso,
        estimated_delivery: order.estimatedDelivery,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_amount: totalAmount,
        shipping_fee: shippingFee,
        secure_access_token: secureToken,
        status: order.status,
        status_stage_index: order.statusStageIndex,
        layer_progress: order.layerProgress || 0,
        payment_method: order.payment?.method || '',
        // Ghi ĐÚNG trạng thái thanh toán đã chốt ở checkout ('cod' | 'awaiting_payment' | 'paid').
        // Trước đây luôn quy về 'unpaid' nên COD bị đọc lại thành "chờ thanh toán" ở
        // hoá đơn/theo dõi/đơn của tôi (mâu thuẫn với màn xác nhận).
        payment_status: order.payment?.status ?? (order.payment?.isPaid ? 'paid' : 'unpaid'),
        items: order.items,
        shipping_address: order.shippingAddress,
        carrier: order.carrier,
        payment: order.payment,
        // B1b: trước đây cột này KHÔNG bao giờ được ghi ⇒ đơn không thể định tuyến tới
        // xưởng (`vcube_orders_workshop_read` lọc theo `assigned_workshop_id`).
        assigned_workshop_id: options?.assignedWorkshopId ?? null,
        created_at: nowIso,
        updated_at: nowIso,
      });

      if (error) {
        return fail(`Không lưu được đơn hàng vào Supabase: ${error.message}`);
      }
      return ok();
    } catch (err: any) {
      console.warn('DB error on saveOrder:', err);
      return fail(err);
    }
  },

  async updateOrderStatus(
    orderId: string, 
    statusStageIndex: number, 
    status: string, 
    notes?: string
  ): Promise<WriteResult> {
    try {
      const updateData: Record<string, any> = {
        status,
        status_stage_index: statusStageIndex,
        updated_at: new Date().toISOString(),
      };
      if (notes) {
        updateData.notes = notes;
      }
      if (statusStageIndex >= 6) {
        updateData.layer_progress = 100;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      // KHÔNG đồng bộ localStorage: localStorage không còn là nguồn dữ liệu đơn hàng
      // (docs/design/data-honesty.md OT-03). DB là nguồn duy nhất.

      if (error) {
        console.warn('Supabase updateOrderStatus error:', error.message);
        return fail(error);
      }
      return ok();
    } catch (err: any) {
      console.warn('DB error on updateOrderStatus:', err);
      return fail(err);
    }
  },

  async getOrders(userEmail?: string): Promise<Order[]> {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (userEmail) {
      query = query.eq('customer_email', userEmail);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Không tải được danh sách đơn hàng: ${error.message}`);
    }
    // Bảng rỗng ⇒ []. KHÔNG rơi về fixture MOCK_ORDERS, KHÔNG đọc localStorage
    // (OT-02/OT-03: đơn của người khác tuyệt đối không được hiển thị).
    return (data ?? []).map(mapOrderRow);
  },

  // Guest order lookup via secure access token.
  //
  // SECURITY: đây là ĐƯỜNG DUY NHẤT để tra cứu đơn không đăng nhập. Truy vấn đi qua
  // RPC SECURITY DEFINER `public.get_order_by_guest_token(p_order_number, p_token)`.
  // KHÔNG được thay bằng truy vấn PostgREST có nội suy tham số người dùng vào `.or()`
  // (filter injection) và KHÔNG được nới điều kiện token: nếu sai/thiếu token thì
  // trả về null, tuyệt đối không fallback sang đơn khác.
  async getOrderByToken(identifier: string, token: string): Promise<Order | null> {
    const cleanIdentifier = (identifier || '').trim();
    const cleanToken = (token || '').trim();
    if (!cleanIdentifier || cleanToken.length < 12) {
      // Hàm SQL yêu cầu token >= 12 ký tự; chặn sớm để không tạo request vô ích.
      return null;
    }
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_order_by_guest_token', {
        p_order_number: cleanIdentifier,
        p_token: cleanToken,
      });

      if (rpcError) {
        console.warn('get_order_by_guest_token RPC error:', rpcError.message);
        return null;
      }

      const matched = (rpcData && rpcData.length > 0) ? rpcData[0] : null;
      if (matched) {
        return mapOrderRow(matched);
      }

    } catch (e) {
      console.warn('Supabase getOrderByToken error:', e);
    }

    // Không tìm thấy (sai mã / sai token / RPC lỗi) → trả null.
    // Không đọc localStorage: token trong máy khách không phải nguồn xác thực.
    return null;
  },

  // Quotes
  async saveQuote(quote: any): Promise<void> {
    try {
      await supabase.from('quotes').insert([quote]);
    } catch (e) {
      console.warn('Save quote error:', e);
    }
  },

  // Users & Multi-stakeholder Profiles
  async getUsers(): Promise<AppUserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Không tải được danh sách người dùng: ${error.message}`);
    }
    // Bảng rỗng ⇒ []. KHÔNG rơi về fixture MOCK_APP_USERS (AT-05/CI-08: fixture mang số
    // giấy tờ KYC + số tài khoản ngân hàng bịa, từng hiện như khách hàng thật), KHÔNG
    // đọc localStorage.
    return (data ?? []).map(rowToUserProfile);
  },

  async updateUserKyc(userId: string, kycStatus: 'verified' | 'pending_review' | 'rejected' | 'unverified', notes?: string): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('user_profiles').update({
        kyc_status: kycStatus,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  // Materials
  async getMaterials(): Promise<MaterialProfile[]> {
    const { data, error } = await supabase.from('materials').select('*');
    if (error) {
      throw new Error(`Không tải được danh mục vật liệu: ${error.message}`);
    }
    // Bảng rỗng ⇒ []. KHÔNG rơi về fixture MATERIALS_CATALOG, KHÔNG đọc localStorage.
    return (data ?? []).map(rowToMaterial);
  },

  async saveMaterial(mat: MaterialProfile): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('materials').upsert({
        id: mat.id,
        name: mat.name,
        brand: mat.brand,
        density: mat.density,
        strength: mat.strength,
        heat_resistance: mat.heatResistance,
        flexibility: mat.flexibility,
        cost_per_kg: mat.costPerKg,
        price_per_gram: mat.pricePerGram,
        unit_price_multiplier: mat.unitPriceMultiplier,
        spool_weight_grams: mat.spoolWeightGrams,
        extruder_temp_min: mat.extruderTempMin,
        extruder_temp_max: mat.extruderTempMax,
        bed_temp: mat.bedTemp,
        colors: mat.colors,
        desc: mat.desc,
        recommended_for: mat.recommendedFor,
        in_stock: mat.inStock,
        stock_rolls_count: mat.stockRollsCount,
        updated_at: new Date().toISOString(),
      });
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  // Printer Fleet
  async getPrinters(): Promise<PrinterProfile[]> {
    const { data, error } = await supabase.from('printer_fleet').select('*');
    if (error) {
      throw new Error(`Không tải được danh sách máy in: ${error.message}`);
    }
    // Bảng rỗng ⇒ []. KHÔNG rơi về fixture PRINTER_PROFILES, KHÔNG đọc localStorage.
    return (data ?? []).map(rowToPrinter);
  },

  async savePrinter(printer: PrinterProfile): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('printer_fleet').upsert({
        id: printer.id,
        name: printer.name,
        brand: printer.brand,
        bed_dimensions: printer.bedDimensions,
        nozzle_diameter: printer.nozzleDiameter,
        technology: printer.technology,
        power_kw: printer.powerKW,
        acquisition_cost: printer.acquisitionCost,
        expected_lifetime_hours: printer.expectedLifetimeHours,
        consumables_hourly_rate: printer.consumablesHourlyRate,
        hourly_rate: printer.hourlyRate,
        max_print_speed_mms: printer.maxPrintSpeedMmS,
        heated_bed_max_temp: printer.heatedBedMaxTemp,
        throughput_grams_per_hour: printer.throughputGramsPerHour ?? null,
        has_enclosure: printer.hasEnclosure,
        has_ams: printer.hasAMS,
        status: printer.status,
        updated_at: new Date().toISOString(),
      });
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  // Pricing Config
  // LUẬT TRUNG THỰC DỮ LIỆU (docs/plans/09-admin-settings.md §3.2 #1): chưa cấu hình ⇒
  // KHÔNG rơi về một con số đoán. Kiểu trả về ở đây là non-null nên trạng thái đó được
  // biểu diễn bằng lỗi thật (call site `src/App.tsx:459` đã có `.catch`); accessor trả
  // `null` tường minh nằm ở `settingsService.getPricingConfig()`.
  async getPricingConfig(): Promise<InkiriCostFormulaConfig> {
    const { data, error } = await supabase
      .from('pricing_configs')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Không tải được cấu hình công thức giá: ${error.message}`);
    }
    if (data?.config) {
      return data.config as InkiriCostFormulaConfig;
    }

    // `pricing_config` (số ít) là VIEW tương thích cho code cũ.
    const legacy = await supabase.from('pricing_config').select('*').limit(1).maybeSingle();
    if (!legacy.error && legacy.data?.config) {
      return legacy.data.config as InkiriCostFormulaConfig;
    }

    // KHÔNG rơi về DEFAULT_INKIRI_FORMULA_CONFIG, KHÔNG đọc localStorage.
    throw new Error('Chưa cấu hình công thức giá trong hệ thống (bảng pricing_configs rỗng).');
  },

  // Site Content & CMS
  // Chưa có hàng `site_content` ⇒ "chưa cấu hình" (ném lỗi thật, không đọc localStorage,
  // không coi nội dung mẫu là nội dung thật). Cột nào thiếu thì lấy nhãn từ
  // DEFAULT_SITE_CONTENT — đã bỏ mọi tuyên bố không kiểm chứng được (AT-06).
  async getSiteContent(): Promise<SiteContentConfig> {
    const { data, error } = await supabase.from('site_content').select('*').limit(1).maybeSingle();

    if (error) {
      throw new Error(`Không tải được nội dung website: ${error.message}`);
    }
    if (!data) {
      throw new Error('Chưa cấu hình nội dung website (bảng site_content rỗng).');
    }
    return { ...rowToSiteContent(data, DEFAULT_SITE_CONTENT), ...readSiteContentExtras(data.settings) };
  },

  async saveSiteContent(content: SiteContentConfig): Promise<WriteResult> {
    try {
      // KHÔNG ghi localStorage: DB là nguồn duy nhất.
      //
      // Cột `settings` (jsonb) là nơi duy nhất giữ 3 khoá mở rộng (SITE_CONTENT_EXTRA_KEYS).
      // Luật ghi (W3-A/Bug 2):
      //   · khoá CÓ trong `content`   ⇒ ghi giá trị mới;
      //   · khoá VẮNG trong `content` ⇒ admin đã XOÁ ⇒ xoá khoá khỏi jsonb.
      //     (Bản cũ bỏ qua cả cột khi mọi khoá vắng ⇒ số CŨ nằm lại: xoá trắng vô hiệu.)
      //
      // Vì sao phải ĐỌC jsonb trước khi ghi: cột `settings` còn giữ cả NHÓM SEO
      // (comment cột này trong 20260901_baseline_schema.sql) — dữ liệu KHÔNG thuộc hàm này.
      // Ghi đè cả cột bằng object chỉ có 3 khoá là xoá dữ liệu của người khác. Nên: merge
      // jsonb hiện có rồi chỉ thay/xoá ĐÚNG 3 khoá mình sở hữu ⇒ cả khi cả 3 khoá đều bị
      // xoá, cột vẫn được ghi bằng phần còn lại của jsonb, KHÔNG BAO GIỜ ghi đè bằng object
      // rỗng lên dữ liệu chưa đọc được.
      const { data: current, error: readError } = await supabase
        .from('site_content')
        .select('settings')
        .eq('id', 'default')
        .maybeSingle();
      if (readError) {
        // Không đọc được jsonb thì KHÔNG ghi bừa (ghi `{}` lúc này = xoá dữ liệu chưa đọc
        // được). Trả lỗi THẬT để admin biết lần lưu này không thành công.
        return fail(`Không đọc được settings hiện tại của site_content: ${readError.message}`);
      }
      const extras = writeSiteContentExtras(content);
      const currentSettings =
        current?.settings && typeof current.settings === 'object' && !Array.isArray(current.settings)
          ? (current.settings as Record<string, unknown>)
          : {};
      const mergedSettings: Record<string, unknown> = { ...currentSettings };
      for (const key of SITE_CONTENT_EXTRA_KEYS) {
        if (key in extras) mergedSettings[key] = extras[key];
        else delete mergedSettings[key];
      }

      const { error } = await supabase.from('site_content').upsert({
        id: 'default',
        hero_badge: content.heroBadge,
        hero_title: content.heroHeadline,
        hero_subtitle: content.heroSubheadline,
        phone: content.hotline,
        email: content.contactEmail,
        hanoi_workshop_address: content.hanoiWorkshopAddress,
        hcm_workshop_address: content.hcmWorkshopAddress,
        announcement_text: content.announcementText,
        announcement_enabled: content.announcementActive,
        // Nhóm storefront/SEO có CỘT riêng (baseline) — trước đây các ô này bị nuốt.
        announcement_badge: content.announcementBadge,
        announcement_action_text: content.announcementActionText,
        announcement_action_tag: content.announcementActionTag,
        hero_headline_line1: content.heroHeadlineLine1,
        hero_headline_highlight: content.heroHeadlineHighlight,
        hero_cta_quote_text: content.heroCtaQuoteText,
        hero_cta_catalog_text: content.heroCtaCatalogText,
        hero_metric1_label: content.heroMetric1Label,
        hero_metric1_value: content.heroMetric1Value,
        hero_metric2_label: content.heroMetric2Label,
        hero_metric2_value: content.heroMetric2Value,
        hero_metric3_label: content.heroMetric3Label,
        hero_metric3_value: content.heroMetric3Value,
        workflow_badge: content.workflowBadge,
        workflow_title: content.workflowTitle,
        workflow_step1_title: content.workflowStep1Title,
        workflow_step1_desc: content.workflowStep1Desc,
        workflow_step2_title: content.workflowStep2Title,
        workflow_step2_desc: content.workflowStep2Desc,
        workflow_step3_title: content.workflowStep3Title,
        workflow_step3_desc: content.workflowStep3Desc,
        estimator_badge: content.estimatorBadge,
        estimator_title: content.estimatorTitle,
        estimator_subtitle: content.estimatorSubtitle,
        estimator_benefit1: content.estimatorBenefit1,
        estimator_benefit2: content.estimatorBenefit2,
        estimator_cta_text: content.estimatorCtaText,
        trust_partners_title: content.trustPartnersTitle,
        trust_partners_list: content.trustPartnersList ?? [],
        seo_title: content.seoTitle,
        seo_description: content.seoDescription,
        seo_keywords: content.seoKeywords,
        seo_og_image: content.seoOgImage,
        seo_canonical_url: content.seoCanonicalUrl,
        seo_robots_index: content.seoRobotsIndex ?? null,
        seo_structured_data: content.seoStructuredData,
        // LUÔN gửi cột `settings` (kể cả object rỗng, khi hàng chưa từng cấu hình gì):
        // xem khối giải thích ở đầu hàm.
        settings: mergedSettings,
        updated_at: new Date().toISOString(),
      });
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  // Workshop Partners
  async getWorkshopPartners(): Promise<WorkshopPartner[]> {
    try {
      const { data, error } = await supabase
        .from('workshop_partners')
        .select('*')
        .order('created_at', { ascending: false });

      // LUẬT TRUNG THỰC DỮ LIỆU (docs/design/data-honesty.md CI-07 + "Recommended UI
      // states" §4): màn hình admin KHÔNG được rơi về WORKSHOP_PARTNERS (dữ liệu bịa
      // trong mockData) hay localStorage khi bảng rỗng/lỗi — admin sẽ tưởng đó là dữ
      // liệu thật của mạng lưới đối tác. Vì vậy:
      //   * lỗi truy vấn → ném lỗi THẬT để caller hiện trạng thái "lỗi khi tải"
      //   * bảng rỗng    → trả mảng rỗng để caller hiện "chưa có dữ liệu"
      // Không có nhánh fallback mock nào ở đây.
      if (error) {
        throw new Error(`Không tải được danh sách đối tác xưởng: ${error.message}`);
      }
      return (data ?? []).map(rowToWorkshopPartner);
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(`Không tải được danh sách đối tác xưởng: ${String(e)}`);
    }
  },

  async saveWorkshopPartner(partner: WorkshopPartner): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('workshop_partners').upsert({
        id: partner.id,
        name: partner.name,
        code: `WS-${partner.region.toUpperCase()}-${partner.id.substring(0, 4).toUpperCase()}`,
        region: partner.region,
        address: partner.address,
        phone: partner.phone,
        email: partner.email,
        capacity_status: partner.status === 'active' ? 'available' : partner.status,
        rating: partner.slaRating,
        // KHÔNG ghi `sla_on_time_rate`: chỉ số này chưa từng được đo (data-honesty
        // CI-07). Chỉ ghi giá trị do caller thật sự cung cấp.
        active_jobs_count: partner.activePrintersCount,
        supported_technologies: partner.supportedTechnologies,
        updated_at: new Date().toISOString(),
      });
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  // Accessories & Hardware Add-ons
  async getAccessories(): Promise<AccessoryItem[]> {
    const { data, error } = await supabase
      .from('accessories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Không tải được danh mục phụ kiện: ${error.message}`);
    }
    // Bảng rỗng ⇒ []. KHÔNG rơi về fixture ACCESSORIES_CATALOG, KHÔNG đọc localStorage.
    return (data ?? []).map(rowToAccessory);
  },

  async saveAccessory(acc: AccessoryItem): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('accessories').upsert({
        id: acc.id,
        sku: acc.sku || null,
        name: acc.name,
        name_en: acc.nameEn || '',
        type: acc.category,
        category: acc.category,
        unit: acc.unit || 'cái',
        cost_price: acc.costPrice ?? 0,
        price: acc.sellingPrice ?? 0,
        in_stock: acc.isActive && (acc.stockCount ?? 0) > 0,
        stock_quantity: acc.stockCount ?? 0,
        low_stock_threshold: acc.lowStockThreshold,
        warehouse_location: acc.warehouseLocation || '',
        supplier: acc.supplier || '',
        description: acc.description || '',
        image_url: acc.imageUrl || '',
        compatible_with: acc.compatibleWith || [],
        updated_at: new Date().toISOString(),
      });
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  async deleteAccessory(id: string): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('accessories').delete().eq('id', id);
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  async deleteMaterial(id: string): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  async deletePrinter(id: string): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('printer_fleet').delete().eq('id', id);
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  // ==========================================================================
  // FL-1 — ĐƠN HÀNG: đọc chi tiết + ghi dòng tiền/thanh toán/file (admin-only ở RLS)
  // ==========================================================================
  // RLS (20261010_harden_rls.sql): `order_items` chủ đơn đọc + admin ghi; `order_files`
  // người mua/admin-lab đọc, staff ghi; `payment_transactions` CHỈ admin. Vì vậy các method
  // GHI dưới đây sẽ bị RLS từ chối nếu caller không phải admin — đó là hành vi ĐÚNG; không
  // được "thử lại bằng service key" ở client.

  /** Đọc 1 đơn theo id (RLS quyết định ai đọc được). `null` = không tồn tại/không có quyền. */
  async getOrderById(orderId: string): Promise<Order | null> {
    if (!orderId) return null;
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (error) throw new Error(`Không tải được đơn hàng: ${error.message}`);
    return data ? rowToOrder(data) : null;
  },

  async getOrderItems(orderId: string): Promise<OrderItemRecord[]> {
    if (!orderId) return [];
    const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (error) throw new Error(`Không tải được dòng tiền của đơn: ${error.message}`);
    return (data ?? []).map(rowToOrderItem);
  },

  async getPaymentTransactions(orderId: string): Promise<PaymentTransactionRecord[]> {
    if (!orderId) return [];
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Không tải được giao dịch thanh toán: ${error.message}`);
    return (data ?? []).map(rowToPaymentTransaction);
  },

  async getOrderFiles(orderId: string): Promise<OrderFileRecord[]> {
    if (!orderId) return [];
    const { data, error } = await supabase.from('order_files').select('*').eq('order_id', orderId);
    if (error) throw new Error(`Không tải được file của đơn: ${error.message}`);
    return (data ?? []).map(rowToOrderFile);
  },

  /** Ghi nhiều dòng `order_items` (admin). Trả lỗi THẬT — caller phải compensation. */
  async insertOrderItems(rows: Record<string, unknown>[]): Promise<WriteResult> {
    if (rows.length === 0) return ok();
    try {
      const { error } = await supabase.from('order_items').insert(rows);
      if (error) return fail(`Không ghi được order_items: ${error.message}`);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  /** Xoá `order_items` theo id — compensation khi bước sau thất bại. */
  async deleteOrderItemsByIds(ids: string[]): Promise<WriteResult> {
    if (ids.length === 0) return ok();
    try {
      const { error } = await supabase.from('order_items').delete().in('id', ids);
      if (error) return fail(`Không hoàn tác được order_items: ${error.message}`);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  /**
   * Ghi 1 giao dịch thanh toán (admin). `transaction_id` UNIQUE theo đơn ⇒ chèn lần 2 sẽ bị
   * từ chối (23505) và caller coi là đã xác nhận (idempotent).
   */
  async insertPaymentTransaction(row: Record<string, unknown>): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('payment_transactions').insert(row);
      if (error) return fail(error);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  async deletePaymentTransactionById(id: string): Promise<WriteResult> {
    try {
      const { error } = await supabase.from('payment_transactions').delete().eq('id', id);
      if (error) return fail(`Không hoàn tác được payment_transactions: ${error.message}`);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  /** Ghi nhiều `order_files` (staff: admin/lab). Path phải là `digital_assets.storage_path` THẬT. */
  async insertOrderFiles(rows: Record<string, unknown>[]): Promise<WriteResult> {
    if (rows.length === 0) return ok();
    try {
      const { error } = await supabase.from('order_files').insert(rows);
      if (error) return fail(`Không ghi được order_files: ${error.message}`);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  async deleteOrderFilesByIds(ids: string[]): Promise<WriteResult> {
    if (ids.length === 0) return ok();
    try {
      const { error } = await supabase.from('order_files').delete().in('id', ids);
      if (error) return fail(`Không hoàn tác được order_files: ${error.message}`);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  /** Cập nhật snapshot tiền + trạng thái thanh toán trên `orders` (admin; trigger bảo vệ tiền). */
  async updateOrderPaymentSnapshot(orderId: string, patch: Record<string, unknown>): Promise<WriteResult> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) return fail(`Không cập nhật được đơn hàng: ${error.message}`);
      return ok();
    } catch (err: any) {
      return fail(err);
    }
  },

  /** Cấu hình tiền cần cho snapshot (public read; cột nullable = chưa cấu hình). */
  async getPricingGlobalMoneyConfig(): Promise<{
    vatPercent: number | null;
    marketplaceFeePercent: number | null;
    marketplaceFixedFeeVnd: number | null;
    defaultWorkshopCommissionPercent: number | null;
  }> {
    const { data, error } = await supabase
      .from('pricing_global_settings')
      .select('vat_percent, marketplace_fee_percent, marketplace_fixed_fee_vnd, default_workshop_commission_percent')
      .eq('id', 'global')
      .maybeSingle();
    if (error) throw new Error(`Không đọc được cấu hình phí nền tảng: ${error.message}`);
    const num = (v: unknown): number | null =>
      v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
    return {
      vatPercent: num(data?.vat_percent),
      marketplaceFeePercent: num(data?.marketplace_fee_percent),
      marketplaceFixedFeeVnd: num(data?.marketplace_fixed_fee_vnd),
      defaultWorkshopCommissionPercent: num(data?.default_workshop_commission_percent),
    };
  },

  /**
   * Chiết khấu % của MỘT xưởng. `workshop_commission_terms` chỉ admin đọc (RLS) ⇒ trả
   * `null` khi chưa có thoả thuận riêng (caller fallback default trong config).
   */
  async getWorkshopCommissionPercent(partnerId: string): Promise<number | null> {
    if (!partnerId) return null;
    const { data, error } = await supabase
      .from('workshop_commission_terms')
      .select('commission_percent')
      .eq('partner_id', partnerId)
      .maybeSingle();
    if (error) {
      // Không phải admin / bảng chưa có hàng ⇒ KHÔNG bịa số; caller dùng default/NULL.
      console.warn('getWorkshopCommissionPercent:', error.message);
      return null;
    }
    const v = data?.commission_percent;
    return v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);
  },

  /** Đọc sản phẩm theo danh sách id (admin thấy cả draft; dùng cho snapshot seller_type). */
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return [];
    const { data, error } = await supabase.from('products').select('*').in('id', unique);
    if (error) throw new Error(`Không đọc được sản phẩm của đơn: ${error.message}`);
    return (data ?? []).map(rowToProduct);
  },

  /**
   * Royalty % theo tên hiển thị designer (nguồn: `designer_profiles.royalty_percent`).
   * Tên khớp > 1 hồ sơ ⇒ KHÔNG chọn bừa: bỏ khỏi map để caller fallback/NULL.
   */
  async getDesignerRoyaltyByNames(names: string[]): Promise<Record<string, number>> {
    const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
    if (unique.length === 0) return {};
    const { data, error } = await supabase
      .from('designer_profiles')
      .select('display_name, royalty_percent')
      .in('display_name', unique);
    if (error) {
      console.warn('getDesignerRoyaltyByNames:', error.message);
      return {};
    }
    const out: Record<string, number> = {};
    const seen: Record<string, number> = {};
    for (const row of data ?? []) {
      const name = String(row.display_name ?? '').trim();
      if (!name) continue;
      const pct = row.royalty_percent;
      if (pct === null || pct === undefined || !Number.isFinite(Number(pct))) continue;
      seen[name] = (seen[name] ?? 0) + 1;
      out[name] = Number(pct);
    }
    for (const name of Object.keys(seen)) if (seen[name] > 1) delete out[name];
    return out;
  },

  /** File số thật của sản phẩm (`digital_assets`) — nguồn path cho `order_files`, không bịa. */
  async getDigitalAssetsByProductIds(
    productIds: string[]
  ): Promise<{ productId: string; storagePath: string; designerId: string | null; licenseType: string | null }[]> {
    const unique = Array.from(new Set(productIds.filter(Boolean)));
    if (unique.length === 0) return [];
    const { data, error } = await supabase
      .from('digital_assets')
      .select('product_id, storage_path, designer_id, license_type')
      .in('product_id', unique);
    if (error) {
      console.warn('getDigitalAssetsByProductIds:', error.message);
      return [];
    }
    return (data ?? [])
      .filter((r) => typeof r.storage_path === 'string' && r.storage_path.trim() !== '')
      .map((r) => ({
        productId: String(r.product_id),
        storagePath: String(r.storage_path),
        designerId: r.designer_id ? String(r.designer_id) : null,
        licenseType: r.license_type ? String(r.license_type) : null,
      }));
  },
};
