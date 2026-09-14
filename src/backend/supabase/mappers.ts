/**
 * VCUBE — MỘT nơi duy nhất map row Supabase (snake_case) → domain type của UI
 * (`docs/plans/06-supabase-vercel.md` §2.4 bước 3 và §2.5; `R3` ở §1.3).
 *
 * Trước đây cùng một phép map tồn tại 3 bản với default KHÁC NHAU:
 *   1. `src/backend/supabase/database.ts` (inline trong từng method)
 *   2. `src/backend/supabase/seedService.ts:512-553` (`syncFromSupabase`)
 *   3. `src/App.tsx:339-365` (handler realtime, inline)
 * Bản trong `App.tsx` thuộc agent khác nên **chưa** được sửa ở Phase này (A8 chỉ sở
 * hữu `supabase/**` + `backend/**`), nhưng hàm map đã export sẵn ở đây để call site
 * đó chuyển sang dùng chung mà không phải viết lại logic.
 *
 * LUẬT TRUNG THỰC DỮ LIỆU (`docs/design/data-honesty.md`) — A10 đã THI HÀNH
 * -----------------------------------------------------------------------------
 * Trước đây (A8) file này giữ nguyên các default bịa để không đổi shape dữ liệu. NAY
 * theo quyết định "bỏ hẳn mock khỏi production" của chủ dự án:
 *   - KYC: thiếu dữ liệu ⇒ `unverified`, KHÔNG BAO GIỜ `verified` (AT-05, Critical/High).
 *   - `specs` / `colors` / `supportedMaterials`: KHÔNG sinh giá trị mẫu; trường thiếu ⇒
 *     rỗng và UI render `—` (CI-02: không được trưng "80x80x40mm" cho hàng chưa đo).
 *   - Không sinh SKU ngẫu nhiên, không quy kết tác giả ('VCUBE Engineering'), không mặc
 *     định thời gian in ('2h'), không mặc định 5.0 sao (CI-03), không bịa tồn kho hay
 *     năng lực xưởng (CI-05/CI-07).
 *   - Số ĐO/THÔNG SỐ VẬN HÀNH: chỉ dùng giá trị của cột. Khi cột vắng, giá trị dự phòng
 *     trùng đúng default của cột trong `20260901_baseline_schema.sql` (ghi rõ tại từng
 *     chỗ) — đây là giá trị DB ghi cho hàng thiếu, không phải số A10 tự chọn; và `n()`
 *     được dùng thay `||` để giá trị 0 THẬT không bị biến thành số khác. ⚠️ Chỉ còn đúng với
 *     cột NOT NULL: cột đã nullable (Đợt Q) thì PHẢI giữ `null` — xem LUẬT "null hay 0" dưới.
 *   - Giữ nguyên các default ĐÃ trung thực từ trước: `statusStageIndex` / `layerProgress`
 *     / `timeRemaining` = null khi MES chưa báo (AD-05, AD-09); `payment.isPaid` chỉ true
 *     khi DB ghi nhận (PC-03, OT-13).
 *
 * LUẬT "null hay 0" (W2-E) — áp dụng cho MỌI trường trong file
 * -----------------------------------------------------------------------------
 *   · Type CHO PHÉP VẮNG (`T | null`, `T | undefined`, khai `field?`) ⇒ cột NULL/vắng giữ
 *     `null`/`undefined` (`numOrNull` / `optNum` / `optStr`), KHÔNG điền `0`/`false`: `0` là
 *     một giá trị ĐO ĐƯỢC, khác hẳn "chưa biết".
 *   · GIÁ `pricePhysical` / `priceDigital` GIỮ `n()` (NULL ⇒ `0`) — xem khối giải thích tại mục GIÁ
 *     bên dưới: cột DB vẫn `not null default 0`, nên `null` sẽ làm hỏng đường ghi (`23502`) và
 *     làm ném TypeError ở `CadQuickViewModal.tsx:293` / `AdminProductsPanel.tsx:296,299`.
 *     `0` ở đây mang nghĩa đã tài liệu hoá "người bán KHÔNG mở bán kênh đó" và UI render `—`.
 *   · Type BẮT BUỘC (`number`, `boolean`, object) ⇒ phép quy đổi được GIỮ NGUYÊN (đổi sẽ phá
 *     hợp đồng type); chỗ đáng nới type nằm trong ghi chú "⚠️ CÒN LẠI" tại từng mục.
 *   · Chuỗi không nullable vẫn dùng `''` làm sentinel "chưa ghi nhận" như cũ — `''` không bịa
 *     ra một giá trị đo; chỉ SỐ và CỜ mới bịa được.
 *   · Cờ dùng `=== true` (inStock / hasEnclosure / hasAMS / isActive) là quy ước đã ghi trong
 *     file: thiếu dữ liệu KHÔNG BAO GIỜ khẳng định "có" ⇒ giữ nguyên.
 */
import type {
  AccessoryItem,
  AppUserProfile,
  CustomDesignMessage,
  CustomDesignRequest,
  MaterialProfile,
  Order,
  PrinterProfile,
  Product,
  SiteContentConfig,
  WorkshopPartner,
} from '../../types';

/** Một dòng bất kỳ đọc từ PostgREST (chưa có type sinh từ DB). */
export type SupabaseRow = Record<string, any>;

/** Số hữu hạn; giá trị thiếu/không hợp lệ → fallback. */
const n = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};

/**
 * Số ĐO ĐƯỢC hoặc `null` = CHƯA ĐO ĐƯỢC.
 *
 * Đợt Q: baseline đã gỡ default của 41 cột (14 cột gỡ luôn NOT NULL) ⇒ mapper **KHÔNG** được
 * điền số thay cho cột NULL, vì làm vậy engine sẽ không bao giờ thấy trạng thái "chưa cấu hình"
 * và mọi guard `PricingUnavailableError` ở `pricingEngine` trở thành vô hiệu trên đường DB thật.
 * KHÔNG có tham số "giá trị mặc định" ở đây.
 */
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

/** `''` và khoảng trắng đều quy về `null` (dùng cho `app_settings`). */
const nullable = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
};

/** Số hữu hạn; thiếu/không hợp lệ ⇒ `undefined`. KHÁC `0`: 0 là giá trị đo được. */
const optNum = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
};

/** Chuỗi đã trim; rỗng/thiếu ⇒ `undefined` (dùng cho trường optional). */
const optStr = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const t = String(v).trim();
  return t === '' ? undefined : t;
};

/** KYC: thiếu/không hợp lệ ⇒ `'unverified'` — KHÔNG bao giờ mặc định `'verified'` (AT-05). */
function normalizeKycStatus(v: unknown): AppUserProfile['kycStatus'] {
  const raw = typeof v === 'string' ? v.trim() : '';
  // Cột DB cho phép 'pending_review'; type UI chỉ có 'pending' ⇒ quy về 'pending'.
  if (raw === 'pending_review') return 'pending';
  if (raw === 'unverified' || raw === 'pending' || raw === 'verified' || raw === 'rejected') {
    return raw;
  }
  return 'unverified';
}

/* ============================================================================
 * Sản phẩm
 * ========================================================================== */

/**
 * `specs` khi DB KHÔNG ghi nhận gì: mọi trường RỖNG.
 * `''` nghĩa là "chưa có số đo" và UI phải render `—` (data-honesty CI-02). Trước đây
 * giá trị mẫu `80 x 80 x 40 mm / 60g / 0.12mm` bị trưng như thông số thật.
 */
export const EMPTY_PRODUCT_SPECS: Product['specs'] = {
  dimensions: '',
  weight: '',
  resolution: '',
  infillDefault: '',
  technology: '',
};

/** `specs` đọc từ DB: chỉ nhận giá trị có thật, trường thiếu ⇒ rỗng. */
function normalizeSpecs(v: unknown): Product['specs'] {
  if (!v || typeof v !== 'object') return { ...EMPTY_PRODUCT_SPECS };
  const j = v as Record<string, unknown>;
  return {
    dimensions: optStr(j.dimensions) ?? '',
    weight: optStr(j.weight) ?? '',
    resolution: optStr(j.resolution) ?? '',
    infillDefault: optStr(j.infillDefault) ?? '',
    technology: optStr(j.technology) ?? '',
  };
}

export function rowToProduct(d: SupabaseRow): Product {
  return {
    id: d.id,
    // KHÔNG sinh SKU ngẫu nhiên (`VC-1234`): mã hàng bịa. Chưa có ⇒ để trống.
    sku: optStr(d.sku),
    name: d.name,
    category: d.category,
    // KHÔNG quy kết tác giả 'VCUBE Engineering' cho hàng không rõ nguồn.
    designer: d.designer || '',
    // GIÁ — W2-E từng đổi sang `numOrNull`; COORDINATOR ĐÃ HOÀN NGUYÊN về `n()` (NULL/vắng ⇒ `0`)
    // vì `null` KHÔNG biểu diễn được đầu-cuối cho hai cột này:
    //   · Cột vẫn là `numeric not null default 0` (20260901_baseline_schema.sql:32-33) và KHÔNG nằm
    //     trong danh sách gỡ `not null` của Đợt Q ⇒ `database.ts:140-141` gửi NULL lên sẽ bị Postgres
    //     chận `23502`, nghĩa là LƯU SẢN PHẨM SẼ HỎNG.
    //   · Hai chỗ đọc thẳng `.toLocaleString()` không guard sẽ ném TypeError khi gặp null:
    //     `CadQuickViewModal.tsx:293` và `AdminProductsPanel.tsx:296,299`.
    //   · Không lợi gì cho người dùng: từ W1-B mọi màn đã coi `0` = "KHÔNG bán kênh đó"
    //     và render `—`, nên NULL và 0 hiện y hệt nhau.
    // Muốn NULL thật thì phải làm MỘT LƯỢT: nới `types/index.ts:9-10` thành `number | null`,
    // guard 3 chỗ đọc trên, và thêm `alter column ... drop not null, drop default` cho 2 cột.
    pricePhysical: n(d.price_physical ?? d.pricePhysical),
    priceDigital: n(d.price_digital ?? d.priceDigital),
    images: Array.isArray(d.images) ? d.images : [d.images].filter(Boolean),
    thumbnailUrl: d.thumbnail_url || (Array.isArray(d.images) ? d.images[0] : ''),
    cadFileUrl: d.cad_file_url || '',
    // Không mặc định 'STL' (định dạng tệp là dữ kiện, không phải giá trị đoán).
    cadFormat: optStr(d.cad_format) as Product['cadFormat'],
    fileSizeBytes: optNum(d.file_size_bytes ?? d.fileSizeBytes),
    description: d.description || '',
    features: Array.isArray(d.features) ? d.features : [],
    specs: normalizeSpecs(d.specs),
    supportedMaterials: Array.isArray(d.supported_materials ?? d.supportedMaterials)
      ? (d.supported_materials ?? d.supportedMaterials)
      : [],
    // KHÔNG sinh màu mẫu 'Đen Kỹ Thuật' cho sản phẩm chưa khai báo màu.
    colors: Array.isArray(d.colors) ? d.colors : [],
    tags: Array.isArray(d.tags) ? d.tags : [],
    badge: d.badge || '',
    // 0 = chưa có đánh giá (đi kèm reviewsCount = 0). KHÔNG mặc định 5.0 sao (CI-03).
    // ⚠️ CÒN LẠI (phải nới type TRƯỚC): `Product.rating/reviewsCount/printsCount` khai BẮT BUỘC
    // `number` (`src/types/index.ts:25-27`) nên NULL vẫn bị quy về `0`. Muốn hàng chưa có đánh
    // giá hiện `—` thì đổi type thành `number | null` — nhiều view đã tự phòng vệ sẵn
    // (`ProductDetailView.tsx:119-120`, `HomeView.tsx:38`).
    rating: n(d.rating),
    reviewsCount: n(d.reviews_count ?? d.reviewsCount),
    printsCount: n(d.prints_count ?? d.printsCount),
    // KHÔNG mặc định '2h'.
    printTime: d.print_time || d.printTime || '',
    // `isCustomizable?: boolean` ⇒ cột vắng = CHƯA KHAI (`undefined`), KHÔNG phải lời phủ định
    // `false` (tự ẩn nút cá nhân hoá của hàng chưa khai). `Boolean(x ?? false)` còn suýt soát
    // hơn: nó biến mọi giá trị "truthy" không phải boolean (`'false'`, `'0'`) thành `true` —
    // một khẳng định bịa. Cột `is_customizable boolean not null default false` nên `false`
    // THẬT vẫn đi qua nguyên vẹn.
    isCustomizable: d.is_customizable ?? d.isCustomizable ?? undefined,
    // Cột `status` là NOT NULL default 'published' trong schema ⇒ giá trị này là của DB,
    // không phải số A10 chọn.
    status: (d.status ? String(d.status).toLowerCase() : 'published') as Product['status'],
    // Chưa ghi nhận độ sẵn sàng sản xuất ⇒ để trống (UI render `—`).
    productionReadiness: d.production_readiness || d.productionReadiness || undefined,
    // R4: cot `license_type` truoc day KHONG duoc map ⇒ moi san pham doc tu DB co
    // `licenseType === undefined`, va fallback 'Commercial License' ban cho 100% san pham that
    // (tinh nang giay phep hong tu dau-cuoi). Rong/khong co cot ⇒ `null` = CHUA AI KHAI:
    // khong duoc khang dinh mot loai giay phep nao.
    licenseType: (optStr(d.license_type ?? d.licenseType) ?? null) as Product['licenseType'],
  } as Product;
}

/* ============================================================================
 * Vật liệu in
 * ========================================================================== */
export function rowToMaterial(d: SupabaseRow): MaterialProfile {
  return {
    id: d.id,
    name: d.name,
    brand: d.brand,
    // density/costPerKg/pricePerGram/unitPriceMultiplier/spoolWeightGrams: Đợt Q đã gỡ default
    // (và gỡ NOT NULL) của các cột này ⇒ `numOrNull` giữ `null` = CHƯA CẤU HÌNH, KHÁC HẲN `0`
    // (0 g/cm³ hay 0 đ/kg là con số vô nghĩa nhưng vẫn bị đọc như một "số đo"). `||` trước đây
    // còn biến cả số 0 THẬT thành default.
    density: numOrNull(d.density),
    strength: d.strength || '',
    heatResistance: d.heat_resistance || '',
    flexibility: d.flexibility || '',
    costPerKg: numOrNull(d.cost_per_kg),
    pricePerGram: numOrNull(d.price_per_gram),
    unitPriceMultiplier: numOrNull(d.unit_price_multiplier),
    spoolWeightGrams: numOrNull(d.spool_weight_grams),
    extruderTempMin: optNum(d.extruder_temp_min),
    extruderTempMax: optNum(d.extruder_temp_max),
    bedTemp: optNum(d.bed_temp),
    colors: Array.isArray(d.colors) ? d.colors : [],
    desc: d.desc || '',
    recommendedFor: d.recommended_for || '',
    // Chỉ true khi DB ghi nhận; thiếu dữ liệu KHÔNG có nghĩa "còn hàng" (CI-05).
    inStock: d.in_stock === true,
    // KHÔNG mặc định 10 cuộn: tồn kho chưa từng ghi nhận ⇒ để trống, UI render `—`.
    stockRollsCount: optNum(d.stock_rolls_count),
    // Đợt P: phụ phí dự phòng in hỏng RIÊNG của vật liệu (cột nullable, KHÔNG default).
    // `optNum` giữ nguyên `null` = "không cộng thêm" — KHÔNG suy ra số nào.
    failureExtraPercent: optNum(d.failure_extra_percent),
  };
}

/* ============================================================================
 * Máy in
 * ========================================================================== */
export function rowToPrinter(d: SupabaseRow): PrinterProfile {
  return {
    id: d.id,
    name: d.name,
    // KHÔNG quy kết hãng máy 'Bambu Lab' cho thiết bị không rõ nguồn.
    brand: d.brand || '',
    // KHÔNG trưng 256×256×256 mm như thông số thật khi DB chưa ghi; `null` = chưa đo được.
    bedDimensions: d.bed_dimensions
      ? { x: numOrNull(d.bed_dimensions.x), y: numOrNull(d.bed_dimensions.y), z: numOrNull(d.bed_dimensions.z) }
      : null,
    // Các SỐ dưới đây là cột nullable (Đợt Q đã gỡ default) ⇒ `numOrNull` / `optNum` giữ
    // `null`/`undefined` = CHƯA ĐO ĐƯỢC, KHÔNG điền số thay. `technology` / `status` là cột
    // NOT NULL có default trong schema nên giá trị dự phòng trùng đúng default của cột.
    // Cờ `has_enclosure` / `has_ams` là `boolean default false`: chỉ nhận `true` khi DB ghi
    // nhận (xem luật đầu file), không suy diễn.
    nozzleDiameter: numOrNull(d.nozzle_diameter),
    technology: (d.technology || 'FDM') as PrinterProfile['technology'],
    powerKW: numOrNull(d.power_kw),
    acquisitionCost: numOrNull(d.acquisition_cost),
    expectedLifetimeHours: numOrNull(d.expected_lifetime_hours),
    consumablesHourlyRate: numOrNull(d.consumables_hourly_rate),
    hourlyRate: numOrNull(d.hourly_rate),
    maxPrintSpeedMmS: optNum(d.max_print_speed_mms),
    heatedBedMaxTemp: optNum(d.heated_bed_max_temp),
    hasEnclosure: d.has_enclosure === true,
    hasAMS: d.has_ams === true,
    status: d.status || 'Idle',
  } as PrinterProfile;
}

/* ============================================================================
 * Phụ kiện / vật tư
 * ========================================================================== */
export function rowToAccessory(d: SupabaseRow): AccessoryItem {
  return {
    id: d.id,
    name: d.name,
    nameEn: d.name_en || d.name,
    category: (d.type || d.category || 'hardware') as AccessoryItem['category'],
    unit: d.unit || 'cái',
    // KHÔNG suy giá vốn = 50% giá bán: đó là con số kế toán bịa (MP-14).
    // ⚠️ CÒN LẠI (phải nới type TRƯỚC): `AccessoryItem.costPrice/sellingPrice/stockCount` khai
    // BẮT BUỘC `number` (`src/types/index.ts:327,328,330`) nên NULL vẫn bị quy về `0`. Muốn giữ
    // `null` = "chưa cấu hình" thì đổi type thành `number | null` — `AccessoriesManager.tsx:6-37`
    // đã sẵn sàng render `—` (`numText`/`isMissingNum`), nhưng `Group0OverviewPanel.tsx:108` và
    // `WarehouseInventoryPanel.tsx:51-52` phải thêm guard trước.
    costPrice: n(d.cost_price),
    sellingPrice: n(d.price ?? d.selling_price),
    // KHÔNG sinh SKU 'ACC-xxxxxx'.
    sku: d.sku || '',
    // Tồn kho: cùng lý do như `costPrice` (type bắt buộc `number`, không có chỗ cho `null`).
    stockCount: n(d.stock_quantity ?? d.stock_count),
    // Đợt Q: KHÔNG mặc định 10 — ngưỡng cảnh báo tồn kho nay là nullable (chưa cấu hình ⇒ `null`).
    lowStockThreshold: numOrNull(d.low_stock_threshold),
    // KHÔNG bịa vị trí kho / nhà cung cấp.
    warehouseLocation: d.warehouse_location || '',
    supplier: d.supplier || '',
    description: d.description || '',
    imageUrl: d.image_url || '',
    // Thiếu dữ liệu ⇒ không coi là đang bán (trước đây mặc định `true`).
    isActive: d.in_stock ?? d.is_active ?? false,
    // KHÔNG gán danh sách ứng dụng mẫu ['Móc khóa', 'Vỏ hộp IoT', 'Đồ gá'].
    compatibleWith: Array.isArray(d.compatible_with) ? d.compatible_with : [],
  };
}

/* ============================================================================
 * Đơn hàng
 * ========================================================================== */
export function rowToOrder(d: SupabaseRow): Order {
  const payment = d.payment || {};
  const shippingFee =
    payment.shippingFee !== undefined && payment.shippingFee !== null
      ? Number(payment.shippingFee)
      : d.shipping_fee !== undefined && d.shipping_fee !== null
        ? Number(d.shipping_fee)
        : 0;
  const total =
    payment.total !== undefined && payment.total !== null
      ? Number(payment.total)
      : d.total_amount !== undefined && d.total_amount !== null
        ? Number(d.total_amount)
        : 0;

  return {
    id: d.id,
    orderNumber: d.order_number || d.id,
    date: d.date || d.created_at || '',
    estimatedDelivery: d.estimated_delivery || '',
    status: d.status || 'processing',
    statusStageIndex: d.status_stage_index ?? null,
    // Tiến độ lớp chỉ có khi máy in/MES đã báo — không mặc định 64%.
    layerProgress: d.layer_progress ?? d.layerProgress ?? null,
    timeRemaining: d.time_remaining ?? null,
    secureAccessToken: d.secure_access_token || d.secureAccessToken,
    items: d.items || [],
    shippingAddress: d.shipping_address || {
      fullName: '',
      phone: '',
      address: '',
      city: '',
      district: '',
    },
    carrier: d.carrier || { name: '', trackingCode: '' },
    payment: {
      method: payment.method || d.payment_method || '',
      paidDate: payment.paidDate || d.paid_at || '',
      subtotalPhysical: Number(payment.subtotalPhysical ?? 0),
      subtotalDigital: Number(payment.subtotalDigital ?? 0),
      shippingFee,
      discount: Number(payment.discount ?? 0),
      tax: Number(payment.tax ?? 0),
      total,
      // Chỉ tin cờ đã lưu; thiếu dữ liệu ⇒ chưa thanh toán.
      isPaid: payment.isPaid === true || d.payment_status === 'paid',
      status: d.payment_status || (payment.isPaid === true ? 'paid' : 'unpaid'),
    },
  } as Order;
}

/**
 * Bản dùng cho luồng "đồng bộ từ Supabase" cũ (`seedService.syncFromSupabase`).
 *
 * W2-E: `statusStageIndex` / `layerProgress` thôi bịa default (`?? 1`, `?? 0`). Hai trường này
 * khai `number | null` (`src/types/index.ts:86,88`) kèm hợp đồng "null = chưa có dữ liệu từ
 * xưởng/MES, UI phải render `—`" (AD-05, AD-09, OT-07) — và `OrderProgress.tsx:25-28` đã nhận
 * đúng `null`. Một nấc `1` hay tiến độ `0%` tự chọn chính là con số khách nhìn thấy. `rowToOrder`
 * đã trả `null`; bản này nay giữ nguyên như vậy.
 *
 * `date` / `estimatedDelivery` GIỮ default cũ: `Order.date` / `estimatedDelivery` khai BẮT BUỘC
 * `string` nên không có chỗ cho "chưa biết". Chúng vẫn là giá trị bịa và đã được báo lại để điều
 * phối xử lý (ngoài phạm vi file này).
 */
export function rowToOrderForSync(d: SupabaseRow): Order {
  const base = rowToOrder(d);
  return {
    ...base,
    date: d.date || d.created_at || new Date().toISOString(),
    estimatedDelivery: d.estimated_delivery || '3 ngày sau khi duyệt',
    statusStageIndex: d.status_stage_index ?? null,
    layerProgress: d.layer_progress ?? null,
  };
}

/* ============================================================================
 * Người dùng
 * ========================================================================== */
export function rowToUserProfile(d: SupabaseRow): AppUserProfile {
  return {
    uid: d.id,
    email: d.email,
    displayName: d.display_name,
    phone: d.phone || '',
    role: d.role || 'customer',
    company: d.company || '',
    avatarUrl: d.avatar_url || '',
    // `createdAt` khai `string` BẮT BUỘC ⇒ không có chỗ cho "chưa biết"; default `now()` chỉ
    // chạy khi dòng thiếu cột và vẫn là giá trị bịa (đã báo lại cho điều phối).
    createdAt: d.created_at || new Date().toISOString(),
    // `lastLoginAt?: string` ⇒ chưa ghi nhận thì để TRỐNG, KHÔNG lấy `now()` làm thời điểm đăng
    // nhập: một sự kiện chưa xảy ra thì không được bịa ra.
    lastLoginAt: optStr(d.updated_at),
    // AT-05 (Critical/High): KYC KHÔNG được mặc định 'verified'. Thiếu dữ liệu nghĩa là
    // CHƯA xác minh — khớp default `unverified` của cột trong schema.
    kycStatus: normalizeKycStatus(d.kyc_status),
    accountStatus: d.account_status || 'active',
    // `totalOrders?` / `totalSpent?` (optional) ⇒ chưa tổng hợp thì để TRỐNG, KHÔNG khẳng định
    // `0 đ` / `0 đơn` như một số liệu đã đo.
    totalOrders: optNum(d.total_orders),
    totalSpent: optNum(d.total_spent),
    notes: d.notes || '',
  } as AppUserProfile;
}

/* ============================================================================
 * Nội dung website
 * ========================================================================== */
/**
 * Map `site_content` → `SiteContentConfig`.
 *
 * `defaults` BẮT BUỘC truyền vào: module này KHÔNG tự import `DEFAULT_SITE_CONTENT`
 * (mockData) để không biến mock thành nguồn sự thật thứ hai bên trong tầng map.
 * Accessor trung thực hơn nằm ở `settingsService.getSiteContent()` — trả `null`
 * khi chưa cấu hình thay vì rơi về hằng số đoán.
 */
export function rowToSiteContent(d: SupabaseRow, defaults: SiteContentConfig): SiteContentConfig {
  return {
    ...defaults,
    heroBadge: d.hero_badge || defaults.heroBadge,
    heroHeadline: d.hero_title || defaults.heroHeadline,
    heroSubheadline: d.hero_subtitle || defaults.heroSubheadline,
    hotline: d.phone || defaults.hotline,
    contactEmail: d.email || defaults.contactEmail,
    hanoiWorkshopAddress: d.hanoi_workshop_address || defaults.hanoiWorkshopAddress,
    hcmWorkshopAddress: d.hcm_workshop_address || defaults.hcmWorkshopAddress,
    announcementText: d.announcement_text || defaults.announcementText,
    announcementActive: d.announcement_enabled ?? defaults.announcementActive,
  };
}

/* ============================================================================
 * Đối tác xưởng
 * ========================================================================== */
export function rowToWorkshopPartner(d: SupabaseRow): WorkshopPartner {
  return {
    id: d.id,
    name: d.name,
    region: (d.region || 'hanoi') as WorkshopPartner['region'],
    address: d.address || '',
    // KHÔNG bịa tên người liên hệ ('Kỹ sư quản trị xưởng').
    contactPerson: d.contact_person || '',
    phone: d.phone || '',
    email: d.email || '',
    // CI-07: KHÔNG bịa năng lực kỹ thuật, dung tích buồng in, số máy, SLA, số job,
    // hàng đợi hay danh sách vật liệu tồn kho. Thiếu dữ liệu ⇒ rỗng / 0 (UI render `—`).
    // ⚠️ CÒN LẠI (phải nới type TRƯỚC): `WorkshopPartner.maxBuildVolume` /
    // `activePrintersCount` / `availablePrintersCount` / `slaRating` / `completedJobsCount` /
    // `currentQueueLength` khai BẮT BUỘC `number`/object (`src/types/index.ts:814-819`) nên NULL
    // vẫn bị quy về `0` / `{ x: 0, y: 0, z: 0 }` — một dung tích buồng in "0 mm" là khẳng định
    // sai, không phải chỗ trống.
    supportedTechnologies: Array.isArray(d.supported_technologies) ? d.supported_technologies : [],
    maxBuildVolume: d.max_build_volume || { x: 0, y: 0, z: 0 },
    activePrintersCount: n(d.active_jobs_count ?? d.active_printers_count),
    availablePrintersCount: n(d.available_printers_count),
    slaRating: n(d.rating ?? d.sla_rating),
    completedJobsCount: n(d.completed_jobs_count),
    currentQueueLength: n(d.current_queue_length),
    inStockMaterials: Array.isArray(d.in_stock_materials) ? d.in_stock_materials : [],
    status: (d.capacity_status === 'available' || d.status === 'active'
      ? 'active'
      : d.capacity_status || d.status || 'active') as WorkshopPartner['status'],
  };
}

/* ============================================================================
 * app_settings (kho pháp lý & định danh — docs/plans/09-admin-settings.md §3.1)
 * ========================================================================== */

/**
 * Mọi trường văn bản là `string | null`: **`null` = CHƯA CẤU HÌNH**. UI phải phân
 * biệt "chưa cấu hình" với "cấu hình rỗng" và tuyệt đối không rơi về giá trị đoán.
 */
export interface AppSettings {
  id: string;
  legalName: string | null;
  /** `null` = chưa cấu hình ⇒ hoá đơn KHÔNG in mã nào (09 §6 #1). */
  taxCode: string | null;
  invoiceAddress: string | null;
  hotline: string | null;
  contactEmail: string | null;
  bankAccount: string | null;
  bankName: string | null;
  warrantyTerms: string | null;
  depositPolicy: string | null;
  settings: Record<string, unknown>;
  updatedBy: string | null;
  updatedAt: string | null;
}

export function rowToAppSettings(d: SupabaseRow): AppSettings {
  return {
    id: d.id,
    legalName: nullable(d.legal_name),
    taxCode: nullable(d.tax_code),
    invoiceAddress: nullable(d.invoice_address),
    hotline: nullable(d.hotline),
    contactEmail: nullable(d.contact_email),
    bankAccount: nullable(d.bank_account),
    bankName: nullable(d.bank_name),
    warrantyTerms: nullable(d.warranty_terms),
    depositPolicy: nullable(d.deposit_policy),
    settings: d.settings && typeof d.settings === 'object' ? d.settings : {},
    updatedBy: nullable(d.updated_by),
    updatedAt: nullable(d.updated_at),
  };
}

/** Ngược lại: domain → cột DB. Bỏ qua `undefined` để UPDATE từng phần không xoá cột. */
export function appSettingsToRow(patch: Partial<AppSettings>): SupabaseRow {
  const row: SupabaseRow = {};
  const put = (col: string, v: unknown) => {
    if (v !== undefined) row[col] = v === '' ? null : v;
  };
  put('legal_name', patch.legalName);
  put('tax_code', patch.taxCode);
  put('invoice_address', patch.invoiceAddress);
  put('hotline', patch.hotline);
  put('contact_email', patch.contactEmail);
  put('bank_account', patch.bankAccount);
  put('bank_name', patch.bankName);
  put('warranty_terms', patch.warrantyTerms);
  put('deposit_policy', patch.depositPolicy);
  if (patch.settings !== undefined) row.settings = patch.settings;
  if (patch.updatedBy !== undefined) row.updated_by = patch.updatedBy;
  return row;
}

/**
 * Map dòng bảng `custom_design_requests` → `CustomDesignRequest` của UI.
 * Tuân thủ Data Honesty: không bịa thông số rỗng, không bịa giá trị.
 */
export function rowToCustomDesignRequest(row: SupabaseRow): CustomDesignRequest {
  const specs = typeof row.target_specs === 'object' && row.target_specs !== null ? row.target_specs : {};
  const statusRaw = String(row.status || 'pending').toLowerCase();
  const statusMap: Record<string, CustomDesignRequest['status']> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    quoted: 'Quoted',
    completed: 'Completed',
    declined: 'Completed',
  };
  const status: CustomDesignRequest['status'] = statusMap[statusRaw] || 'Pending';

  const rawMessages: any[] = Array.isArray(row.messages) ? row.messages : [];
  const messages: CustomDesignMessage[] = rawMessages.map((m: any) => ({
    id: String(m.id || `msg-${Date.now()}`),
    sender: m.sender === 'designer' ? 'designer' : 'client',
    senderName: String(m.senderName || m.sender_name || '—'),
    senderInitials: String(m.senderInitials || m.sender_initials || '—'),
    time: String(m.time || '—'),
    text: String(m.text || ''),
    attachment: m.attachment
      ? {
          name: String(m.attachment.name || ''),
          size: String(m.attachment.size || ''),
          type: m.attachment.type || 'stl',
        }
      : undefined,
    quote: m.quote
      ? {
          amount: Number(m.quote.amount) || 0,
          currency: String(m.quote.currency || 'VND'),
          description: String(m.quote.description || ''),
          status: m.quote.status || 'sent',
        }
      : undefined,
  }));

  const lastMessage = messages[messages.length - 1];
  const clientName = String(row.client_name || '');
  const clientInitials = String(
    row.client_initials || (clientName ? clientName.slice(0, 2).toUpperCase() : 'KH')
  );

  let formattedTime = '—';
  if (row.updated_at) {
    try {
      formattedTime = new Date(row.updated_at).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      formattedTime = '—';
    }
  }

  return {
    id: String(row.id || ''),
    clientName,
    clientInitials,
    title: String(row.title || ''),
    previewMessage: lastMessage ? lastMessage.text : String(row.preview_message || ''),
    time: formattedTime,
    status,
    unread: Boolean(row.unread),
    budget: String(row.budget || '—'),
    deadline: String(row.deadline || '—'),
    serviceType: String(row.service_type || 'Thiết kế CAD tùy chỉnh'),
    targetSpecs: {
      material: String(specs.material || '—'),
      infill: String(specs.infill || '—'),
      nozzle: String(specs.nozzle || '—'),
    },
    referenceFiles: Array.isArray(row.reference_files) ? row.reference_files : [],
    messages,
  };
}

