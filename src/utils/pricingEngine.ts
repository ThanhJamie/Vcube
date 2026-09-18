import { AnalysisFile, DetailedCostBreakdown, PrinterProfile, MaterialProfile, InkiriCostFormulaConfig, DeliveryPackageOption, MachineComparisonItem, OrderFinancialSplit } from '../types';
import { MATERIALS_CATALOG, PRINTER_PROFILES } from '../data/mockData';
import { getPricingGlobalSettings, peekSettings, settingsAccessors } from '../backend/services/settingsService';
import { resolveFilamentUsage } from './printEstimate';

/* ── Đợt 9 (R1): HAI hằng số "giá mặc định" dưới đây đã bị XOÁ ─────────────────
 *   ELECTRICITY_PRICE_PER_KWH = 2850   (VND/kWh)
 *   BASE_LABOR_HOURLY_RATE    = 65000  (VND/giờ)
 * Chúng từng nằm trong mã và engine im lặng dùng khi công thức không khai báo ⇒ báo giá
 * vẫn ra tiền như thật dù chưa ai cấu hình. Nay nguồn DUY NHẤT của hai tham số này là
 * `pricing_global_settings` (`electricity_rate_vnd`, `labor_hourly_rate_vnd`); chưa cấu
 * hình ⇒ CHẶN tính giá (`resolveGlobalRates`). Không giữ hằng số lại để không ai vô tình
 * dùng lại làm fallback.
 * ────────────────────────────────────────────────────────────────────────────── */
/* ── Đợt P: NĂM hằng số "số của Inkiri" dưới đây đã bị XOÁ ──────────────────────
 *   PLATFORM_FEE_PERCENT = 0.08 · PAYMENT_GATEWAY_FEE_PERCENT = 0.025
 *   DESIGNER_ROYALTY_PERCENT = 0.05 · FIXED_PACKAGING_BASE = 12000
 *   FIXED_OVERHEAD_PER_UNIT = 15000
 * Không hằng số nào còn caller (đã `grep -rn` toàn repo) và tất cả đều đã có thông số
 * tương ứng trong `pricing_configs` (`platformCommissionPercent`,
 * `paymentGatewayFeePercent`, `designerRoyaltyPercent`, `fixedPackagingCost`,
 * `overheadPerUnit`). Giữ chúng lại chỉ tạo đường rơi về số của người khác.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Bộ gom **thông số CHƯA CẤU HÌNH** của một lượt tính giá.
 *
 * Vì sao cần: engine KHÔNG được có số mặc định (mọi số mặc định trước đây là số của Inkiri).
 * Thay vì ném ngay ở thông số thiếu ĐẦU TIÊN, bộ gom này đi hết danh sách rồi ném **một**
 * lỗi nêu đủ tên thông số ⇒ admin sửa một lần cho hết, và không có đồng giá nào được tạo ra
 * từ một lượt tính thiếu dữ liệu.
 */
class MissingParams {
  private missing: string[] = [];

  /** Ghi nhận một thông số thiếu (không trùng lặp). */
  miss(label: string): void {
    if (!this.missing.includes(label)) this.missing.push(label);
  }

  /**
   * Số hữu hạn (`0` là giá trị HỢP LỆ). `null`/`undefined`/`NaN`/chuỗi rỗng ⇒ ghi vào danh
   * sách thiếu và trả `0` tạm — `throwIfAny()` sẽ chặn TRƯỚC mọi phép tính.
   */
  num(raw: unknown, label: string): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
    this.miss(label);
    return 0;
  }

  /** Giá trị thuộc danh sách cho phép; thiếu/khác danh sách ⇒ ghi thiếu và trả phần tử đầu. */
  oneOf<T extends string>(raw: unknown, allowed: readonly T[], label: string): T {
    if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) return raw as T;
    this.miss(label);
    return allowed[0];
  }

  /** NÉM `PricingUnavailableError` nêu đủ danh sách thông số còn thiếu. */
  throwIfAny(): void {
    if (this.missing.length === 0) return;
    throw new PricingUnavailableError(
      'missing_params',
      `Chưa cấu hình ${this.missing.length} thông số giá nên KHÔNG tính giá (hệ thống không dùng số mẫu): ${this.missing.join(' · ')}. Nhập ở /admin → Cấu hình giá (Công thức & Định mức, hoặc hồ sơ máy in / vật liệu tương ứng).`
    );
  }
}

/**
 * Đơn giá nhựa (đ/g) của một vật liệu — KHÔNG có số mặc định.
 * Ưu tiên `pricePerGram`; nếu bỏ trống thì suy từ `costPerKg ÷ 1000 × unitPriceMultiplier`
 * (vẫn là dữ liệu thật của chính vật liệu đó). Thiếu cả hai nguồn ⇒ ghi vào `need`.
 */
function resolveMaterialCostPerGram(
  material: MaterialProfile,
  need: MissingParams,
  materialRef: string
): number {
  if (typeof material.pricePerGram === 'number' && Number.isFinite(material.pricePerGram)) {
    return material.pricePerGram;
  }
  if (
    typeof material.costPerKg === 'number' && Number.isFinite(material.costPerKg) &&
    typeof material.unitPriceMultiplier === 'number' && Number.isFinite(material.unitPriceMultiplier)
  ) {
    return Math.round((material.costPerKg / 1000) * material.unitPriceMultiplier);
  }
  need.miss(`pricePerGram — Đơn giá nhựa (đ/g) của vật liệu ${materialRef} (hoặc điền costPerKg + unitPriceMultiplier)`);
  return 0;
}

/**
 * Khổ bàn in (mm) của một máy — thiếu bất kỳ trục nào ⇒ ghi vào `need` (KHÔNG mặc định 256³).
 * Baseline đã gỡ default của `printer_fleet.bed_dimensions` nên cột này CÓ THỂ NULL.
 */
function requireBedDimensions(printer: PrinterProfile, need: MissingParams): { x: number; y: number; z: number } {
  const ref = `${printer.name} [${printer.id}]`;
  const bed = printer.bedDimensions;
  return {
    x: need.num(bed?.x, `bedDimensions.x — Khổ bàn in theo trục X (mm) của máy ${ref}`),
    y: need.num(bed?.y, `bedDimensions.y — Khổ bàn in theo trục Y (mm) của máy ${ref}`),
    z: need.num(bed?.z, `bedDimensions.z — Khổ bàn in theo trục Z (mm) của máy ${ref}`),
  };
}

/**
 * Tiền điện một chi tiết: `Math.round(công suất kW × giờ in × đơn giá kWh)`.
 * TÁCH NGUYÊN VĂN từ dòng tính cũ (không đổi hệ số, thứ tự hay cách làm tròn) để bản xem
 * trước tác động ở /admin gọi CHÍNH đoạn tính này thay vì tự tính lại một công thức khác.
 */
export function computeElectricityCostVnd(powerKW: number, printHours: number, rateVndPerKwh: number): number {
  return Math.round(powerKW * printHours * rateVndPerKwh);
}

/**
 * Tiền nhân công một chi tiết: `Math.round((tổng phút / 60) × đơn giá giờ)`.
 * TÁCH NGUYÊN VĂN từ dòng tính cũ — cùng lý do như trên.
 */
export function computeLaborCostVnd(totalLaborMinutes: number, hourlyRateVnd: number): number {
  return Math.round((totalLaborMinutes / 60) * hourlyRateVnd);
}

/**
 * A11 — Lỗi có ngữ cảnh khi engine KHÔNG có nguồn dữ liệu thật để tính giá.
 *
 * Vì sao cần: `MATERIALS_CATALOG` / `PRINTER_PROFILES` (src/data/mockData.ts) đã bị rỗng hoá
 * theo chủ trương "bỏ mock khỏi production" (docs/design/data-honesty.md CI-01, PC-05).
 * Trước đây `customPrinters[0]` / `customMaterials[0]` trả `undefined` rồi bị truy cập
 * `.density` / `.powerKW` ở giữa hàm ⇒ TypeError không nói lên nguyên nhân.
 *
 * Nguyên tắc: KHÔNG bịa máy in/vật liệu và KHÔNG trả một con số giá 0đ như thật.
 * Ném lỗi có mã để call site render trạng thái rỗng (nguyên nhân + hành động).
 * CÔNG THỨC GIÁ KHÔNG ĐỔI — đây thuần là guard ở đầu hàm.
 */
export type PricingUnavailableCode =
  | 'no_printer'
  | 'no_material'
  | 'no_electricity_rate'
  | 'no_labor_rate'
  | 'rates_loading'
  | 'missing_params'
  | 'no_formula_config'
  | 'profit_mode_margin_unsupported';

export class PricingUnavailableError extends Error {
  readonly code: PricingUnavailableCode;

  constructor(code: PricingUnavailableCode, message: string) {
    super(message);
    this.name = 'PricingUnavailableError';
    this.code = code;
  }
}

/**
 * Cấu hình công thức giá là BẮT BUỘC. Không có cấu hình ⇒ CHẶN.
 *
 * Trước đây: `customPricingConfig || DEFAULT_INKIRI_FORMULA_CONFIG` ⇒ khi không ai truyền cấu
 * hình, engine lặng lẽ tính bằng **bộ số mẫu của Inkiri**. Đợt P bỏ hẳn đường đó: bộ số mẫu
 * (`src/data/mockData.ts`) chỉ còn là MẪU THAM KHẢO về cấu trúc, không phải nguồn giá trị.
 */
function requireFormulaConfig(cfg: InkiriCostFormulaConfig | undefined): InkiriCostFormulaConfig {
  if (!cfg) {
    throw new PricingUnavailableError(
      'no_formula_config',
      'Chưa có cấu hình công thức giá (bảng pricing_configs chưa có hàng đang bật) — KHÔNG tính giá bằng bộ số mẫu. Nhập ở /admin → Cấu hình giá → Công thức & Định mức.'
    );
  }
  return cfg;
}

/** `number` hữu hạn ⇒ chính nó; mọi thứ khác (`null`/`undefined`/`NaN`) ⇒ `null` = chưa cấu hình. */
function asConfiguredRate(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * `true` khi `v` là SỐ ĐO THẬT (hữu hạn) — dùng cho các trường nullable của bộ đọc lưới
 * (`isWatertight`/`invertedNormals`/`minWallThickness`/`printabilityScore`/`overhangPercentage`).
 * `null`/`undefined`/`NaN` = **CHƯA ĐO ĐƯỢC** ⇒ không được đem đi so sánh ngưỡng, vì
 * `null < 0.8` và `null < 80` đều trả `true` trong JavaScript.
 */
function isMeasuredNumber(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Đọc HAI tham số toàn hệ thống từ `pricing_global_settings` — nguồn thật DUY NHẤT.
 *
 * ⚠️ Vì sao CHẶN thay vì có giá trị mặc định (`docs/design/data-honesty.md`): trước Đợt 9
 * engine rơi về `2850`/`65000` viết trong mã ⇒ khách nhận báo giá "như thật" dù chưa ai
 * cấu hình. Nay thiếu tham số ⇒ ném lỗi nêu ĐÍCH DANH thứ còn thiếu và 0 đồng nào được tính.
 *
 * `peekSettings()` phân biệt `undefined` = CHƯA ĐỌC (đang tải) với `null` = ĐÃ ĐỌC nhưng
 * chưa cấu hình; hai trạng thái này phải nói khác nhau, không gộp thành "chưa cấu hình".
 */
function resolveGlobalRates(input: PricingEngineInput): {
  electricityRateVnd: number;
  laborHourlyRateVnd: number;
  /** `null` = CHƯA CẤU HÌNH (xem `marketplace_fee_percent`) — người gọi phải CHẶN. */
  marketplaceFeePercent: number | null;
} {
  const explicit = input.globalRates;
  const cached = settingsAccessors.pricingGlobal();

  if (!explicit && peekSettings('pricing_global_settings') === undefined) {
    // `bootstrapSettings()` ở main.tsx KHÔNG `await` ⇒ cache có thể còn rỗng. Nạp cho lần
    // render sau rồi báo đúng trạng thái "đang tải", không kết luận sai là "chưa cấu hình".
    void getPricingGlobalSettings();
    throw new PricingUnavailableError(
      'rates_loading',
      'Đang tải cấu hình giá toàn hệ thống (đơn giá điện, đơn giá nhân công) từ Supabase — chưa có số liệu để tính giá.'
    );
  }

  const electricityRate =
    explicit && explicit.electricityRateVnd !== undefined ? explicit.electricityRateVnd : cached?.electricityRateVnd;
  const laborRate =
    explicit && explicit.laborHourlyRateVnd !== undefined ? explicit.laborHourlyRateVnd : cached?.laborHourlyRateVnd;

  const elec = asConfiguredRate(electricityRate);
  const labor = asConfiguredRate(laborRate);
  if (elec === null || labor === null) {
    const missing = [
      elec === null ? 'đơn giá điện (electricity_rate_vnd)' : null,
      labor === null ? 'đơn giá nhân công/giờ (labor_hourly_rate_vnd)' : null,
    ].filter((x): x is string => x !== null);
    throw new PricingUnavailableError(
      elec === null ? 'no_electricity_rate' : 'no_labor_rate',
      `Chưa cấu hình ${missing.join(' và ')} trong bảng pricing_global_settings — KHÔNG tính giá khi thiếu tham số (báo giá sẽ sai). Nhập ở /admin → Cấu hình giá → mục 0 "Cấu hình Chung Toàn Hệ Thống".`
    );
  }
  // Đợt Q (#4): PHÍ NỀN TẢNG cũng là thông số toàn hệ thống — MỘT nguồn duy nhất là
  // `pricing_global_settings.marketplace_fee_percent`. Trước đây engine đọc
  // bản sao `platformCommissionPercent` trong công thức) ⇒ hai nguồn cho cùng một con số.
  // Trả về `null` khi chưa cấu hình; việc CHẶN do bộ gom thông số ở `calculateDetailedPricing`.
  const marketplaceFeePercent = explicit && explicit.marketplaceFeePercent !== undefined
    ? explicit.marketplaceFeePercent
    : (cached?.marketplaceFeePercent ?? null);

  return { electricityRateVnd: elec, laborHourlyRateVnd: labor, marketplaceFeePercent };
}

export interface PricingEngineInput {
  file: AnalysisFile;
  transformedVolume: number;
  selectedPrinterId: string;
  selectedMaterialId: string;
  infillDensity: number;
  infillPattern: string;
  layerHeight: string;
  supportsMode: 'auto' | 'tree' | 'none';
  quantity: number;
  targetMarkupPercent?: number; // default 35%
  customPricingConfig?: InkiriCostFormulaConfig;
  customPrinters?: PrinterProfile[];
  customMaterials?: MaterialProfile[];
  /**
   * Hai tham số TOÀN HỆ THỐNG (Đợt 9 / R1) — nguồn thật là `pricing_global_settings`.
   * Bỏ trống ⇒ engine đọc cache `settingsAccessors.pricingGlobal()`.
   * `null` = CHƯA CẤU HÌNH ⇒ ném `PricingUnavailableError`, KHÔNG rơi về hằng số nào.
   */
  globalRates?: {
    electricityRateVnd?: number | null;
    laborHourlyRateVnd?: number | null;
    /** `pricing_global_settings.marketplace_fee_percent` (%). `null` = chưa cấu hình ⇒ CHẶN. */
    marketplaceFeePercent?: number | null;
  };
  selectedAccessories?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
}

/**
 * VCUBE Core Slicer & Pricing Engine (PRC-005) - Inkiri Cost Model
 * Pure deterministic calculation - Integer VND safe output
 *
 * NGUỒN THAM SỐ (Đợt 9 / R1): `electricity_rate_vnd` và `labor_hourly_rate_vnd` đọc từ
 * `pricing_global_settings` (Supabase) — KHÔNG còn hằng số trong mã. Hai tham số này chưa
 * được cấu hình ⇒ `PricingUnavailableError` (chặn tính giá), không có nhánh "đoán".
 * Các hệ số còn lại vẫn lấy từ `pricing_configs`/`DEFAULT_INKIRI_FORMULA_CONFIG` như cũ:
 * R1 CHỈ đổi NGUỒN của 2 tham số, KHÔNG đổi công thức, hệ số, thứ tự tính hay làm tròn.
 *
 * THÔNG SỐ GIÁ (Đợt P) — KHÔNG có số mặc định nào trong file này:
 *   * Mọi thông số đọc từ `pricing_configs` + hồ sơ MÁY IN/VẬT LIỆU thật +
 *     `pricing_global_settings` (điện, nhân công). Không có `?? <số>` / `|| <số>` nào.
 *   * Thiếu bất kỳ thông số nào ⇒ `MissingParams` gom lại và ném MỘT
 *     `PricingUnavailableError` (`missing_params`) **nêu đích danh từng thông số** ⇒ CHẶN
 *     tính giá. KHÔNG rơi về `DEFAULT_INKIRI_FORMULA_CONFIG` hay số mẫu của bên thứ ba.
 *   * `DEFAULT_INKIRI_FORMULA_CONFIG` chỉ còn là MẪU THAM KHẢO về cấu trúc, không phải
 *     nguồn giá trị (xem `src/data/mockData.ts`).
 *
 * SỐ ĐO NULLABLE (R2, Đợt 9) — `types/index.ts`: `null` = **CHƯA ĐO ĐƯỢC**, KHÁC HẲN `0`.
 * Engine phải phân biệt ba trạng thái, vì `null < 0.8` và `null < 80` đều là `true` trong
 * JavaScript ⇒ nếu không guard, tệp CHƯA ĐO bị kết luận oan là "thành cực nhỏ"/"mô hình khó"
 * và bị cộng thêm dự phòng hỏng dựa trên một số đo không tồn tại:
 *   null        ⇒ nói rõ "chưa đo/chưa phân tích", KHÔNG kết luận đạt–không đạt, KHÔNG cộng phí;
 *   0 / true    ⇒ đo được, kết quả XẤU  ⇒ xử lý như cũ;
 *   > 0 / false ⇒ đo được, kết quả TỐT  ⇒ xử lý như cũ.
 */
export function calculateDetailedPricing(input: PricingEngineInput): {
  breakdown: DetailedCostBreakdown;
  quickEstimateRange: { min: number; max: number };
  tier: 'quick_estimate' | 'exact_slice' | 'manual_review';
  manualReviewReasons: string[];
  volumeDiscount?: {
    tierLabel: string;
    discountPercent: number;
    discountedUnitPrice: number;
    totalSavings: number;
    totalAfterDiscount: number;
  };
} {
  const {
    file,
    transformedVolume,
    selectedPrinterId,
    selectedMaterialId,
    infillDensity,
    layerHeight,
    supportsMode,
    quantity,
    customPricingConfig,
    customPrinters = PRINTER_PROFILES,
    customMaterials = MATERIALS_CATALOG,
    selectedAccessories = []
  } = input;

  const cfg = requireFormulaConfig(customPricingConfig);

  // KHÔNG rơi về fixture `PRINTER_PROFILES` / `MATERIALS_CATALOG` (nay là mảng RỖNG có chủ ý):
  // thiếu máy in / vật liệu thì hai guard ngay dưới đây ném lỗi có ngữ cảnh.
  const currentPrinter = customPrinters.find(p => p.id === selectedPrinterId) ?? customPrinters[0];
  const currentMaterial = customMaterials.find(m => m.id === selectedMaterialId) ?? customMaterials[0];

  // A11 GUARD: fixture đã rỗng hoá ⇒ hai dòng trên có thể trả `undefined` (type cũ che mất vì
  // `noUncheckedIndexedAccess` đang tắt). Dừng NGAY tại đây bằng lỗi có ngữ cảnh, thay vì để
  // `undefined.density` (khối material grams) / `undefined.powerKW` (khối điện năng) ném
  // TypeError khó lần. Không có nhánh nào bịa thông số để "chạy cho xong".
  if (!currentPrinter) {
    throw new PricingUnavailableError(
      'no_printer',
      'Chưa có máy in nào trong hệ thống — không có thông số máy (công suất, khấu hao, khổ bàn) để tính giá. Thêm máy in ở /admin → Cấu hình giá → Đội Máy In.'
    );
  }
  if (!currentMaterial) {
    throw new PricingUnavailableError(
      'no_material',
      'Chưa có vật liệu nào trong hệ thống — không có đơn giá nhựa để tính giá. Thêm vật liệu ở /admin → Cấu hình giá → Danh Mục Nhựa & Resin.'
    );
  }

  // A11/R1 GUARD (Đợt 9): đơn giá điện & nhân công là CẤU HÌNH trong
  // `pricing_global_settings`, không phải hằng số trong mã. Chưa cấu hình ⇒ dừng TRƯỚC
  // mọi phép tính ⇒ không có báo giá nào được tạo ra.
  const globalRates = resolveGlobalRates(input);

  /* ══════════════════════════════════════════════════════════════════════════════
   * GIẢI THÔNG SỐ (Đợt P) — trong file này KHÔNG còn số mặc định nào.
   *
   * Mọi thông số đọc từ `pricing_configs` (`cfg`) + hồ sơ MÁY IN/VẬT LIỆU thật +
   * `pricing_global_settings` (điện, nhân công). Thiếu bất kỳ thông số nào ⇒ gom lại rồi
   * ném MỘT `PricingUnavailableError` NÊU ĐÍCH DANH ⇒ CHẶN tính giá.
   *
   * Vì sao: trước đây mỗi thông số có kèm sẵn một số mặc định của Inkiri viết ngay trong mã
   * (dạng "toán tử nullish rồi tới một con số", hay "hoặc-thì một con số"), nên admin xoá ô
   * trong /admin thì engine vẫn ra giá bằng số của người khác mà không báo gì. Nay
   * "chưa cấu hình" là một trạng thái thật, nhìn thấy được.
   * ══════════════════════════════════════════════════════════════════════════════ */
  const need = new MissingParams();

  // — Đầu vào của lượt tính (tệp đã phân tích + lựa chọn của người dùng) —
  const modelVolumeCm3 = need.num(transformedVolume, 'transformedVolume — Thể tích phôi sau biến đổi (cm³): cần phân tích lại tệp');
  const infillPercent = need.num(infillDensity, 'infillDensity — Độ đặc ruột (%)');
  const layerHeightMm = need.num(Number(layerHeight), 'layerHeight — Độ dày lớp in (mm)');

  // — Nhóm 1: điện & nhân công (nguồn: pricing_global_settings) —
  const electricityRateVnd = need.num(globalRates.electricityRateVnd, 'electricity_rate_vnd — Giá điện (đ/kWh)');
  const laborHourlyRate = need.num(globalRates.laborHourlyRateVnd, 'labor_hourly_rate_vnd — Lương giờ (đ)');

  // — Nhóm 2: thời gian công mỗi đơn (phút) —
  const fileReviewMinutes = need.num(cfg.fileReviewLaborMinutes, 'fileReviewLaborMinutes — Kiểm tra slicing & mesh (phút)');
  const setupMinutes = need.num(cfg.setupLaborMinutes, 'setupLaborMinutes — Chuẩn bị máy, xịt keo (phút)');
  const supportRemovalMinutes = supportsMode === 'none'
    ? need.num(cfg.noSupportRemovalMinutes, 'noSupportRemovalMinutes — Bóc support khi KHÔNG có support (phút)')
    : need.num(cfg.supportRemovalMinutes, 'supportRemovalMinutes — Bóc support (phút)');
  const postProcessingMinutes = need.num(cfg.postProcessingLaborMinutes, 'postProcessingLaborMinutes — Mài nhẵn / deburring (phút)');
  const qcMinutes = need.num(cfg.qcLaborMinutes, 'qcLaborMinutes — Đo kiểm kích thước (phút)');
  const packagingMinutes = need.num(cfg.packagingLaborMinutes, 'packagingLaborMinutes — Đóng gói (phút)');

  // — Nhóm 3: đóng gói & vật tư phụ —
  const fixedPackagingCost = need.num(cfg.fixedPackagingCost, 'fixedPackagingCost — Hộp, xốp, túi hút ẩm (đ/chi tiết)');
  const multiColorPackagingExtra = need.num(cfg.multiColorPackagingExtra, 'multiColorPackagingExtra — Phụ phí bảo vệ chi tiết màu (đ/chi tiết)');
  const ipaFinishingCost = need.num(cfg.ipaSolventCost, 'ipaSolventCost — Cồn IPA / sấy UV (đ/chi tiết)');
  const overheadPerUnit = need.num(cfg.overheadPerUnit, 'overheadPerUnit — Mặt bằng, phần mềm, internet (đ/chi tiết)');

  // — Nhóm 4: máy in đang chọn —
  const printerRef = `${currentPrinter.name} [${currentPrinter.id}]`;
  const averagePowerKW = need.num(currentPrinter.powerKW, `powerKW — Công suất trung bình khi in (kW) của máy ${printerRef}`);
  const machineLifetimeHours = need.num(currentPrinter.expectedLifetimeHours, `expectedLifetimeHours — Tuổi thọ (giờ) của máy ${printerRef}`);
  const machineAcquisitionCost = need.num(currentPrinter.acquisitionCost, `acquisitionCost — Giá mua (đ) của máy ${printerRef}`);
  const consumablesPerHour = need.num(currentPrinter.consumablesHourlyRate, `consumablesHourlyRate — Vật tư tiêu hao (đ/giờ) của máy ${printerRef}`);
  // `printer_fleet.bed_dimensions` đã bị gỡ default trong baseline ⇒ có thể NULL ⇒ phải kiểm.
  const bed = requireBedDimensions(currentPrinter, need);
  // Khấu hao: ưu tiên số admin cấu hình; bỏ trống ⇒ TỰ TÍNH = giá mua ÷ tuổi thọ (số liệu của
  // chính máy đó, không phải số mẫu). Không có nguồn nào ⇒ chặn.
  const machineDepreciationPerHour = isMeasuredNumber(cfg.defaultMachineDepreciationPerHour)
    ? cfg.defaultMachineDepreciationPerHour
    : (machineLifetimeHours > 0
        ? machineAcquisitionCost / machineLifetimeHours
        : need.num(null, 'defaultMachineDepreciationPerHour — Khấu hao máy in cơ sở (đ/giờ): điền số này, HOẶC điền giá mua + tuổi thọ của máy để hệ thống tự tính'));

  // — Nhóm 4b: vật liệu đang chọn —
  const materialRef = `${currentMaterial.name} [${currentMaterial.id}]`;
  const materialDensity = need.num(currentMaterial.density, `density — Khối lượng riêng (g/cm³) của vật liệu ${materialRef}`);
  const materialCostPerGram = resolveMaterialCostPerGram(currentMaterial, need, materialRef);

  // — Nhóm 5: biên lợi nhuận & phí —
  const defaultMarkupPercent = need.num(cfg.defaultMarkupPercent, 'defaultMarkupPercent — Tỷ lệ lợi nhuận mục tiêu (%)');
  const targetMarkupPercent = input.targetMarkupPercent !== undefined ? input.targetMarkupPercent : defaultMarkupPercent;
  const baseFailureReservePercent = need.num(cfg.baseFailureReservePercent, 'baseFailureReservePercent — Dự phòng in hỏng cơ bản (%)');
  const lowPrintabilityExtraPercent = need.num(cfg.lowPrintabilityExtraPercent, 'lowPrintabilityExtraPercent — Cộng thêm khi điểm khả in thấp (%)');
  const multiColorExtraPercent = need.num(cfg.multiColorExtraPercent, 'multiColorExtraPercent — Cộng thêm khi in nhiều màu (%)');
  // Đợt Q (#4): phí nền tảng CHỈ đọc từ `pricing_global_settings.marketplace_fee_percent`
  // (mục 0 trong /admin). Bản sao `platformCommissionPercent` trong công thức KHÔNG còn được đọc.
  const platformFeeRate = need.num(globalRates.marketplaceFeePercent, 'marketplace_fee_percent — Phí nền tảng toàn hệ thống (%)') / 100;
  const paymentFeeRate = need.num(cfg.paymentGatewayFeePercent, 'paymentGatewayFeePercent — Phí cổng thanh toán (%)') / 100;
  const royaltyFeeRate = need.num(cfg.designerRoyaltyPercent, 'designerRoyaltyPercent — Bản quyền designer (%)') / 100;
  const bulkOrderQuantityThreshold = need.num(cfg.bulkOrderQuantityThreshold, 'bulkOrderQuantityThreshold — Ngưỡng cảnh báo "đơn lớn" theo SỐ LƯỢNG (chiếc)');
  const bulkOrderAmountThresholdVnd = need.num(cfg.bulkOrderAmountThresholdVnd, 'bulkOrderAmountThresholdVnd — Ngưỡng cảnh báo "đơn lớn" theo SỐ TIỀN (đ)');
  // Chế độ lợi nhuận: công thức hiện tại CHỈ có Markup (lãi trên giá vốn). Chọn `margin` ⇒
  // CHẶN chứ không âm thầm tính bằng markup, vì đó là ĐỔI CÔNG THỨC.
  if (cfg.profitMode === 'margin') {
    throw new PricingUnavailableError(
      'profit_mode_margin_unsupported',
      'Chế độ lợi nhuận "Margin (lãi trên giá bán)" chưa có trong công thức — engine chỉ tính "Markup (lãi trên giá vốn)". Chọn Markup, hoặc yêu cầu bổ sung công thức Margin (việc đó ĐỔI CÔNG THỨC, ngoài phạm vi chỉ-đổi-nguồn-thông-số).'
    );
  }

  // — Nhóm 6: làm tròn, chiết khấu số lượng, hằng số slicing —
  const rounding = need.oneOf(cfg.roundingRule, ['1000', '5000', '10000', 'none'] as const, 'roundingRule — Quy tắc làm tròn giá bán (1000 / 5000 / 10000 / none)');
  const supportVolumeRatioPercent = need.num(cfg.supportVolumeRatioPercent, 'supportVolumeRatioPercent — Tỷ lệ khối lượng support (%)');
  const brimRaftGrams = need.num(cfg.brimRaftGrams, 'brimRaftGrams — Gram brim/raft');
  const toolChangeMinutes = need.num(cfg.multiColorToolChangeMins, 'multiColorToolChangeMins — Phút mỗi lần thay màu (AMS)');
  const purgeWasteGramsPerColor = need.num(cfg.multiColorPurgeWasteGrams, 'multiColorPurgeWasteGrams — Gram purge mỗi màu thêm');

  // — Phụ kiện đi kèm (nếu có) —
  const accessoriesAddonCost = selectedAccessories.reduce((sum, item) => {
    const unitQty = need.num(item.quantity, `selectedAccessories["${item.id}"].quantity — Số lượng phụ kiện "${item.name || item.id}"`);
    return sum + item.unitPrice * unitQty;
  }, 0);

  // CHẶN nếu còn thông số nào chưa cấu hình — TRƯỚC mọi phép tính.
  need.throwIfAny();

  // 1. Multi-color & Part Extruder analysis
  // Chỉ đếm đầu đùn TỆP KHAI THẬT (`extruderIndex` là số hữu hạn > 0). Trước đây đếm cả
  // `undefined` như một "màu" nên tệp không khai đầu đùn bị coi là multi-color (purge + thay
  // màu + phí đa màu bịa ra). Lọc trước khi đếm.
  const activeExtruders = new Set(
    file.parts
      .map(p => p.extruderIndex)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0)
  ).size;
  const isMultiColor = activeExtruders > 1;
  const toolChangesCount = isMultiColor ? (activeExtruders - 1) * 85 : 0;
  const purgeWasteGrams = isMultiColor ? (activeExtruders - 1) * purgeWasteGramsPerColor : 0;

  // 2. Material Grams Breakdown
  // Shell volume (perimeter walls ~22%) + infill volume.
  // Đợt F: `resolveFilamentUsage` chọn nguồn gram/giờ theo thứ tự ưu tiên (slicer trong tệp →
  // năng suất máy do admin khai → ước từ thể tích) và trả kèm NHÃN NGUỒN để tầng hiển thị nói
  // thật số nào đo được, số nào ước (data-honesty PC-05/MP-13). `null` năng suất KHÔNG bị thay
  // bằng số mặc định.
  const supportRatio = supportVolumeRatioPercent / 100;
  const usage = resolveFilamentUsage({
    volumeCm3: modelVolumeCm3,
    density: materialDensity,
    infillPercent,
    layerHeightMm,
    slicerGrams: file.slicerPreset?.totalFilamentGrams,
    slicerPrintSeconds: file.slicerPreset?.estimatedPrintTimeSeconds,
    plates: file.plates,
    throughputGramsPerHour: currentPrinter.throughputGramsPerHour,
  });
  const rawModelGrams = usage.totalGrams;
  // `gramsSource === 'slicer'` nghĩa là số đến từ `filament used_g` của Bambu/Orca — con số đó
  // ĐÃ bao gồm support, brim/raft, purge tower và mọi thứ đùn ra. Cộng thêm các ước lượng
  // support/brim/purge nữa là đếm trùng rồi dán nhãn "từ file" (thổi giá + sai nguồn). Khi có
  // slicer: để các thành phần additive = 0 để breakdown vẫn khớp tổng; khi không có slicer giữ
  // nguyên hành vi ước lượng cũ.
  const slicerIncludesAdditives = usage.gramsSource === 'slicer';
  const supportGrams = slicerIncludesAdditives || supportsMode === 'none' ? 0 : Math.round(rawModelGrams * supportRatio);
  const effectiveBrimRaftGrams = slicerIncludesAdditives ? 0 : brimRaftGrams;
  const effectivePurgeWasteGrams = slicerIncludesAdditives ? 0 : purgeWasteGrams;
  const totalFilamentGramsPerUnit = rawModelGrams + supportGrams + effectiveBrimRaftGrams + effectivePurgeWasteGrams;

  const materialCost = Math.round(totalFilamentGramsPerUnit * materialCostPerGram);

  // 3. Print Time (Hours) & Electricity Cost
  const basePrintHours = usage.printHours;
  // Tool-change CHỈ cộng khi giờ in KHÔNG đến từ slicer — slicer đã tính thời gian thay màu
  // vào dự phóng của nó, cộng thêm nữa là cộng trùng (thổi giá).
  const toolChangeHours = usage.printHoursSource === 'slicer' ? 0 : (toolChangesCount * toolChangeMinutes) / 60;
  const totalPrintHoursPerUnit = Number((basePrintHours + toolChangeHours).toFixed(2));

  const electricityCost = computeElectricityCostVnd(averagePowerKW, totalPrintHoursPerUnit, electricityRateVnd);

  // 4. Machine Depreciation & Consumables
  const machineOperatingCostPerHour = machineDepreciationPerHour + consumablesPerHour;
  const machineDepreciationCost = Math.round(machineDepreciationPerHour * totalPrintHoursPerUnit);
  const maintenanceAndConsumablesCost = Math.round(consumablesPerHour * totalPrintHoursPerUnit);
  const machineOperatingCost = machineDepreciationCost + maintenanceAndConsumablesCost;

  // 5. Labor Cost Allocation
  const totalLaborMinutes = fileReviewMinutes + setupMinutes + supportRemovalMinutes + postProcessingMinutes + qcMinutes + packagingMinutes;
  const laborCost = computeLaborCostVnd(totalLaborMinutes, laborHourlyRate);

  // 6. Accessories, IPA Finishing & Packaging
  const basePackagingCost = fixedPackagingCost + (isMultiColor ? multiColorPackagingExtra : 0);
  const accessoriesCost = basePackagingCost + ipaFinishingCost + accessoriesAddonCost;

  // 8. Failure Reserve Rate (Inkiri Risk formula)
  let failureReserveRate = baseFailureReservePercent / 100;
  // R2 (Đợt 9): chỉ cộng "phụ phí mô hình khó" khi ĐIỂM KHẢ IN đứng trên SỐ ĐO THẬT.
  // Hai điều kiện, cả hai đều cần:
  //   (1) `printabilityScore` là số hữu hạn (không `null`/`NaN`);
  //   (2) CÁC SỐ ĐO ĐỨNG SAU NÓ không phải `null` — vì `derivePrintabilityScore()`
  //       (`Tool3DView.tsx`) tính điểm từ `isWatertight`/`minWallThickness` bằng
  //       `!null === true` và `null < 0.8 === true`, nên tệp CHƯA ĐO vẫn ra một điểm
  //       trông như thật (đo được: 60/100) ⇒ nếu chỉ kiểm (1) thì engine vẫn cộng 6%
  //       dự phòng hỏng dựa trên số đo không tồn tại (14% thay vì 8%).
  const meshMeasuresUnmeasured =
    file.isWatertight === null || file.invertedNormals === null || file.minWallThickness === null;
  const printabilityScore: number | null | undefined = file.printability?.printabilityScore;
  if (isMeasuredNumber(printabilityScore) && !meshMeasuresUnmeasured && printabilityScore < 80) {
    failureReserveRate += lowPrintabilityExtraPercent / 100;
  }
  if (isMultiColor) failureReserveRate += multiColorExtraPercent / 100;
  // P3 (Đợt P): luật "vật liệu khó" KHÔNG còn suy từ CHUỖI CON TRONG `id`
  // (`id.includes('nylon'|'resin'|'pa-cf')`) — luật đó im lặng không chạy khi id của nền tảng
  // này khác, và cũng không ai kiểm được. Nay là thông số `failureExtraPercent` khai trên
  // TỪNG vật liệu: chưa khai (`null`/`undefined`) ⇒ KHÔNG cộng thêm gì (không mượn số 4% của Inkiri).
  if (isMeasuredNumber(currentMaterial.failureExtraPercent) && currentMaterial.failureExtraPercent > 0) {
    failureReserveRate += currentMaterial.failureExtraPercent / 100;
  }

  const baseCost = materialCost + electricityCost + machineOperatingCost + laborCost + accessoriesCost + overheadPerUnit;
  const failureReserveCost = Math.round(baseCost * failureReserveRate);
  const costPrice = baseCost + failureReserveCost; // Giá vốn xuất xưởng 1 sản phẩm

  // 9. Selling Price with Markup & Reverse Variable Fee Calculation
  // Reverse fees formula: SellingPrice = (CostPrice * (1 + Markup)) / (1 - (Platform% + Payment% + Royalty%))
  const targetMarkup = targetMarkupPercent / 100;
  const totalVariableFeeRate = platformFeeRate + paymentFeeRate + royaltyFeeRate;
  
  const preFeeSellingPrice = Math.round(costPrice * (1 + targetMarkup));
  const rawSellingPrice = Math.round(preFeeSellingPrice / (1 - totalVariableFeeRate));
  
  // Rounding rule
  let finalSellingPriceRounded = rawSellingPrice;
  if (rounding === '1000') {
    finalSellingPriceRounded = Math.ceil(rawSellingPrice / 1000) * 1000;
  } else if (rounding === '5000') {
    finalSellingPriceRounded = Math.ceil(rawSellingPrice / 5000) * 5000;
  } else if (rounding === '10000') {
    finalSellingPriceRounded = Math.ceil(rawSellingPrice / 10000) * 10000;
  }
  const roundingAdjustment = finalSellingPriceRounded - rawSellingPrice;

  // Gross Margin = (SellingPrice - CostPrice) / SellingPrice
  const calculatedGrossMarginPercent = Number((((finalSellingPriceRounded - costPrice) / finalSellingPriceRounded) * 100).toFixed(1));

  // Volume discount evaluation
  let volumeDiscount: {
    tierLabel: string;
    discountPercent: number;
    discountedUnitPrice: number;
    totalSavings: number;
    totalAfterDiscount: number;
  } | undefined = undefined;

  if (cfg.volumeDiscounts && cfg.volumeDiscounts.length > 0) {
    const matchedTier = cfg.volumeDiscounts.find(
      tier => quantity >= tier.minQty && (tier.maxQty === undefined || quantity <= tier.maxQty)
    );
    if (matchedTier && matchedTier.discountPercent > 0) {
      const discountedUnitPrice = Math.round(finalSellingPriceRounded * (1 - matchedTier.discountPercent / 100));
      const totalOriginal = finalSellingPriceRounded * quantity;
      const totalAfterDiscount = discountedUnitPrice * quantity;
      const totalSavings = totalOriginal - totalAfterDiscount;
      volumeDiscount = {
        tierLabel: matchedTier.label,
        discountPercent: matchedTier.discountPercent,
        discountedUnitPrice,
        totalSavings,
        totalAfterDiscount
      };
    }
  }

  const breakdown: DetailedCostBreakdown = {
    modelGrams: rawModelGrams,
    supportGrams,
    brimRaftGrams: effectiveBrimRaftGrams,
    purgeGrams: effectivePurgeWasteGrams,
    totalFilamentGrams: totalFilamentGramsPerUnit,
    materialCostPerGram,
    materialCost,

    // Nguồn gram/giờ in của lượt tính này (data-honesty): UI dùng để dán nhãn
    // "từ file" / "ước tính theo năng suất máy" / "ước tính theo thể tích".
    gramsSource: usage.gramsSource,
    printHoursSource: usage.printHoursSource,
    throughputGramsPerHourUsed: usage.throughputGramsPerHourUsed,

    printHours: totalPrintHoursPerUnit,
    averagePowerKW,
    electricityRatePerKWh: globalRates.electricityRateVnd,
    electricityCost,

    machineDepreciationCost,
    maintenanceAndConsumablesCost,
    machineOperatingCost,

    fileReviewLaborMinutes: fileReviewMinutes,
    setupLaborMinutes: setupMinutes,
    supportRemovalMinutes,
    postProcessingLaborMinutes: postProcessingMinutes,
    qcLaborMinutes: qcMinutes,
    packagingLaborMinutes: packagingMinutes,
    totalLaborMinutes,
    laborHourlyRate,
    laborCost,

    accessoriesCost,
    ipaSolventCost: ipaFinishingCost,
    overheadPerUnit,
    failureReserveRate,
    failureReserveCost,

    baseCost,
    costPrice,

    targetMarkupPercent,
    calculatedGrossMarginPercent,
    platformCommissionPercent: platformFeeRate * 100,
    paymentGatewayFeePercent: paymentFeeRate * 100,
    designerRoyaltyPercent: royaltyFeeRate * 100,
    fixedAdminFee: 0,

    preFeeSellingPrice,
    finalSellingPrice: rawSellingPrice,
    roundingAdjustment,
    finalSellingPriceRounded
  };

  // Quick Estimate Range (for Tier 1)
  const quickMin = Math.floor((finalSellingPriceRounded * 0.9) / 1000) * 1000;
  const quickMax = Math.ceil((finalSellingPriceRounded * 1.18) / 1000) * 1000;
  const quickEstimateRange = { min: quickMin, max: quickMax };

  // Manual Review Triggers (Tier 3)
  const manualReviewReasons: string[] = [];
  if (file.dimensions.x > bed.x || file.dimensions.y > bed.y || file.dimensions.z > bed.z) {
    manualReviewReasons.push(`Kích thước phôi (${file.dimensions.x}x${file.dimensions.y}x${file.dimensions.z}mm) vượt quá khổ bàn in ${currentPrinter.name} (${bed.x}×${bed.y}×${bed.z}mm).`);
  }
  // ── R2 (Đợt 9): BA trạng thái cho số đo nullable ─────────────────────────────
  // `null` = CHƯA ĐO ĐƯỢC ⇒ nói ĐÚNG việc đang xảy ra ("chưa phân tích"), KHÔNG gán cho tệp
  // một khuyết điểm kỹ thuật không có đo đạc đứng sau. `false` mới là non-manifold thật.
  const watertight: boolean | null = file.isWatertight;
  const invertedNormals: number | null = file.invertedNormals;
  if (watertight === null || invertedNormals === null) {
    manualReviewReasons.push(
      'Chưa phân tích được lưới (tệp lớn hoặc thiếu dữ liệu đo) — cần kiểm tra thủ công, KHÔNG kết luận đạt/không đạt.'
    );
  } else if (!watertight || invertedNormals > 0) {
    manualReviewReasons.push('File chứa lỗi hình học Mesh non-manifold hoặc mặt tam giác đảo pháp tuyến.');
  }

  const minWallThickness: number | null = file.minWallThickness;
  if (minWallThickness === null) {
    manualReviewReasons.push(
      'Chưa đo được độ dày thành tối thiểu — cần kiểm tra thủ công, KHÔNG kết luận đạt/không đạt.'
    );
  } else if (minWallThickness < 0.8) {
    manualReviewReasons.push(`Độ dày thành cực nhỏ (${minWallThickness}mm) dưới ngưỡng an toàn của đầu phun 0.4mm.`);
  }
  if (quantity >= bulkOrderQuantityThreshold || finalSellingPriceRounded * quantity >= bulkOrderAmountThresholdVnd) {
    manualReviewReasons.push(
      `Đơn hàng số lượng lớn (≥${bulkOrderQuantityThreshold} cái hoặc ≥${bulkOrderAmountThresholdVnd.toLocaleString('vi-VN')} đ) cần kỹ sư xưởng xếp khay tối ưu.`
    );
  }
  if (activeExtruders > 4) {
    manualReviewReasons.push('Số lượng màu (>4 màu) vượt quá 1 cụm AMS/MMU tiêu chuẩn, cần setup mở rộng.');
  }

  const tier = manualReviewReasons.length > 0 ? 'manual_review' : 'exact_slice';

  return {
    breakdown,
    quickEstimateRange,
    tier,
    manualReviewReasons,
    volumeDiscount
  };
}

/**
 * Direct simulator for Admin manual quick cost calculation (Inkiri Style)
 */
export interface ManualCalcInput {
  filamentGrams: number;
  printHours: number;
  materialPricePerKg: number; // VND
  printerAcquisitionCost: number; // VND
  printerLifetimeHours: number;
  printerConsumablesPerHour: number; // VND
  printerPowerKW: number;
  electricityRatePerKWh: number; // VND
  laborHourlyRate: number; // VND
  laborTotalMinutes: number;
  packagingCost: number; // VND
  ipaCost?: number; // VND (Cồn IPA & dung môi rửa sấy hoàn thiện)
  accessoriesCost?: number; // VND (hardware / add-ons cost)
  overheadCost: number; // VND
  failureRatePercent: number; // %
  markupPercent: number; // %
  taxAndGatewayPercent: number; // %
  quantity: number;
}

export function calculateManualInkiriEstimate(input: ManualCalcInput) {
  const {
    filamentGrams,
    printHours,
    materialPricePerKg,
    printerAcquisitionCost,
    printerLifetimeHours,
    printerConsumablesPerHour,
    printerPowerKW,
    electricityRatePerKWh,
    laborHourlyRate,
    laborTotalMinutes,
    packagingCost,
    ipaCost = 0,
    accessoriesCost = 0,
    overheadCost,
    failureRatePercent,
    markupPercent,
    taxAndGatewayPercent,
    quantity
  } = input;

  // 1. Material
  const materialCost = Math.round((filamentGrams * materialPricePerKg) / 1000);

  // 2. Electricity
  const electricityCost = Math.round(printerPowerKW * printHours * electricityRatePerKWh);

  // 3. Machine Depreciation & Consumables
  const machineDepreciation = Math.round((printerAcquisitionCost / Math.max(100, printerLifetimeHours)) * printHours);
  const consumablesCost = Math.round(printerConsumablesPerHour * printHours);
  const machineTotal = machineDepreciation + consumablesCost;

  // 4. Labor
  const laborCost = Math.round((laborTotalMinutes / 60) * laborHourlyRate);

  // 5. Packaging & Accessories & IPA
  const packaging = packagingCost;
  const ipa = ipaCost;
  const accessories = accessoriesCost;

  // 6. Overhead
  const overhead = overheadCost;

  // 7. Base Cost & Failure
  const subtotalCost = materialCost + electricityCost + machineTotal + laborCost + packaging + ipa + accessories + overhead;
  const failureCost = Math.round(subtotalCost * (failureRatePercent / 100));
  const costPriceUnit = subtotalCost + failureCost;

  // 8. Selling Price
  const preFeePrice = Math.round(costPriceUnit * (1 + markupPercent / 100));
  const feeMultiplier = Math.max(0.01, 1 - taxAndGatewayPercent / 100);
  const rawSellingPrice = Math.round(preFeePrice / feeMultiplier);
  const finalUnitPrice = Math.ceil(rawSellingPrice / 1000) * 1000;

  const profitPerUnit = finalUnitPrice - costPriceUnit;
  const totalCostBatch = costPriceUnit * quantity;
  const totalRevenueBatch = finalUnitPrice * quantity;
  const totalProfitBatch = profitPerUnit * quantity;
  const grossMarginPercent = Number(((profitPerUnit / finalUnitPrice) * 100).toFixed(1));

  return {
    materialCost,
    electricityCost,
    machineDepreciation,
    consumablesCost,
    machineTotal,
    laborCost,
    packaging,
    ipaCost: ipa,
    accessories,
    overhead,
    failureCost,
    costPriceUnit,
    finalUnitPrice,
    profitPerUnit,
    grossMarginPercent,
    totalCostBatch,
    totalRevenueBatch,
    totalProfitBatch
  };
}

/**
 * Generate 3 Customer Packages: Economy, Standard, Express (PRC-007)
 */
export function generateDeliveryPackages(unitBasePrice: number, quantity: number, customPricingConfig?: InkiriCostFormulaConfig): DeliveryPackageOption[] {
  const today = new Date();
  const cfg = requireFormulaConfig(customPricingConfig);
  // Đợt P: hai thông số này KHÔNG có số mặc định — thiếu ⇒ chặn (xem `MissingParams`).
  const needDiscounts = new MissingParams();
  const ecoDiscount = needDiscounts.num(cfg.economyDiscountPercent, 'economyDiscountPercent — Chiết khấu gói Tiết kiệm (%)') / 100;
  const expRushSurcharge = needDiscounts.num(cfg.expressRushSurchargePercent, 'expressRushSurchargePercent — Phụ thu gói Hỏa tốc (%)') / 100;
  needDiscounts.throwIfAny();
  
  // Economy: 5-7 days (Batch optimized printing) - Configurable discount
  const ecoDate = new Date(today);
  ecoDate.setDate(today.getDate() + 6);
  const ecoUnitPrice = Math.ceil((unitBasePrice * (1 - ecoDiscount)) / 1000) * 1000;

  // Standard: 3-4 days (Regular factory queue)
  const stdDate = new Date(today);
  stdDate.setDate(today.getDate() + 3);
  const stdUnitPrice = unitBasePrice;

  // Express: 1-2 days (Priority rush queue) + Configurable rush fee
  const expDate = new Date(today);
  expDate.setDate(today.getDate() + 1);
  const expUnitPrice = Math.ceil((unitBasePrice * (1 + expRushSurcharge)) / 1000) * 1000;

  return [
    {
      tier: 'economy',
      name: 'Gói Tiết Kiệm',
      leadTimeDays: '5–7 ngày làm việc',
      completionDate: ecoDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      pricePerUnit: ecoUnitPrice,
      totalPrice: ecoUnitPrice * quantity,
      description: 'Ghép khay in theo lô tối ưu chi phí, phù hợp dự án không gấp.',
      isPopular: false
    },
    {
      tier: 'standard',
      name: 'Gói Tiêu Chuẩn',
      leadTimeDays: '3–4 ngày làm việc',
      completionDate: stdDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      pricePerUnit: stdUnitPrice,
      totalPrice: stdUnitPrice * quantity,
      description: 'Lựa chọn phổ biến nhất. In độc lập, kiểm định quang học ngoại quan.',
      isPopular: true
    },
    {
      tier: 'express',
      name: 'Gói Hỏa Tốc (24H)',
      leadTimeDays: '1–2 ngày làm việc',
      completionDate: expDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      pricePerUnit: expUnitPrice,
      totalPrice: expUnitPrice * quantity,
      description: 'Ưu tiên máy in ngay lập tức, kỹ thuật viên trực đêm gia công cấp tốc.',
      isPopular: false
    }
  ];
}

/**
 * Compare Multiple Compatible Machines (PRC-009)
 */
export function comparePrintersForModel(
  file: AnalysisFile,
  transformedVolume: number,
  selectedMaterialId: string,
  infillDensity: number,
  layerHeight: string,
  supportsMode: 'auto' | 'tree' | 'none',
  quantity: number,
  customPricingConfig?: InkiriCostFormulaConfig,
  customPrinters?: PrinterProfile[],
  customMaterials?: MaterialProfile[]
): MachineComparisonItem[] {
  const printersList = customPrinters && customPrinters.length > 0 ? customPrinters : PRINTER_PROFILES;
  const items: MachineComparisonItem[] = printersList.map((printer) => {
    const calc = calculateDetailedPricing({
      file,
      transformedVolume,
      selectedPrinterId: printer.id,
      selectedMaterialId,
      infillDensity,
      infillPattern: 'Gyroid',
      layerHeight,
      supportsMode,
      quantity,
      customPricingConfig,
      customPrinters: printersList,
      customMaterials
    });

    const hours = calc.breakdown.printHours;
    const hoursInt = Math.floor(hours);
    const minsInt = Math.round((hours - hoursInt) * 60);

    const finishDate = new Date();
    finishDate.setHours(finishDate.getHours() + Math.ceil(hours * quantity) + 24);

    // Khổ bàn in cũng phải ĐO ĐƯỢC (cột đã gỡ default) — thiếu ⇒ chặn, không mặc định.
    const needBed = new MissingParams();
    const bed = requireBedDimensions(printer, needBed);
    needBed.throwIfAny();

    let riskLevel: 'Thấp' | 'Trung Bình' | 'Cảnh Báo' = 'Thấp';
    if (file.dimensions.x > bed.x || file.dimensions.y > bed.y) {
      riskLevel = 'Cảnh Báo';
    } else if (calc.breakdown.failureReserveRate > 0.12) {
      riskLevel = 'Trung Bình';
    }

    return {
      printerId: printer.id,
      printerName: printer.name,
      technology: printer.technology,
      printTimeFormatted: `${hoursInt}h ${minsInt}m`,
      printTimeHours: hours,
      costPrice: calc.breakdown.costPrice,
      sellingPrice: calc.breakdown.finalSellingPriceRounded,
      completionDate: finishDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      riskLevel
    };
  });

  // ── P3 (Đợt P): nhãn gợi ý máy KHÔNG còn gắn theo `id` ────────────────────────
  // Trước đây: `'bambu-x1c' → "Nhanh Nhất"`, `'anycubic-kobra-max' → "Rẻ Nhất"`,
  // `'formlabs-form-4' → "Lợi Nhuận Tối Đa"` — vừa là TUYÊN BỐ BỊA (không đo gì để nói câu đó),
  // vừa SAI cho nền tảng này (id khác ⇒ luật im lặng không chạy). Nay nhãn — nếu có — suy từ
  // chính SỐ ĐO của lượt tính này: thời gian in, giá bán, lợi nhuận đơn vị.
  if (items.length === 0) return items;
  let fastest = items[0];
  let cheapest = items[0];
  let bestProfit = items[0];
  for (const item of items) {
    if (item.printTimeHours < fastest.printTimeHours) fastest = item;
    if (item.sellingPrice < cheapest.sellingPrice) cheapest = item;
    if (item.sellingPrice - item.costPrice > bestProfit.sellingPrice - bestProfit.costPrice) bestProfit = item;
  }
  // Mỗi máy tối đa MỘT nhãn; thứ tự ưu tiên: lợi nhuận → nhanh → rẻ.
  bestProfit.recommendationTag = 'Lợi Nhuận Tối Đa';
  if (fastest.recommendationTag === undefined) fastest.recommendationTag = 'Nhanh Nhất';
  if (cheapest.recommendationTag === undefined) cheapest.recommendationTag = 'Rẻ Nhất';
  return items;
}

/**
 * PRC-005 v2: Multi-Party Financial Split (3-Sided Marketplace Engine)
 * Transparently splits gross order revenue among:
 * 1. Payment Gateway (2%)
 * 2. Designer Royalty (5% - 20% on physical, 90% on digital)
 * 3. Workshop MES Payout (BOM + Machine + Labor + 80% rush surcharge + 100% personalization)
 * 4. Platform Take-Rate (VCUBE marketplace margin)
 * Plus automated 7-day Escrow Buffer.
 */
export function compute3SidedOrderFinancialSplit(params: {
  orderId: string;
  orderNumber: string;
  orderType: 'physical' | 'digital' | 'mixed';
  grossAmount: number;
  /** P (Đợt P): BẮT BUỘC — trước đây mặc định `grossAmount * 0.7` (số bịa). */
  basePartPrice: number;
  quantity?: number;
  volumeDiscountPercent?: number;
  rushSurcharge?: number;
  personalizationFee?: number;
  designerRoyaltyRate?: number;
  /** P (Đợt P): BẮT BUỘC — trước đây mặc định `grossAmount * 0.60` (số bịa). */
  workshopCostPrice: number;
  customPricingConfig?: InkiriCostFormulaConfig;
}): OrderFinancialSplit {
  const {
    orderId,
    orderNumber,
    orderType,
    grossAmount,
    basePartPrice,
    quantity = 1,
    volumeDiscountPercent = 0,
    rushSurcharge = 0,
    personalizationFee = 0,
    designerRoyaltyRate,
    workshopCostPrice,
    customPricingConfig
  } = params;

  const cfg = requireFormulaConfig(customPricingConfig);
  const needFees = new MissingParams();
  const actualGatewayRate = needFees.num(cfg.paymentGatewayFeePercent, 'paymentGatewayFeePercent — Phí cổng thanh toán (%)') / 100;
  const actualRoyaltyRate = designerRoyaltyRate !== undefined
    ? designerRoyaltyRate
    : needFees.num(cfg.designerRoyaltyPercent, 'designerRoyaltyPercent — Bản quyền designer (%)') / 100;
  needFees.throwIfAny();

  // 1. Payment Gateway Fee
  const paymentGatewayFee = Math.round(grossAmount * actualGatewayRate);

  let creatorRoyalty = 0;
  let workshopPayout = 0;
  let platformTakeRate = 0;

  if (orderType === 'digital') {
    // 90% to creator, remainder to platform after gateway fee
    creatorRoyalty = Math.round(grossAmount * 0.90);
    workshopPayout = 0;
    platformTakeRate = Math.max(0, grossAmount - paymentGatewayFee - creatorRoyalty);
  } else {
    // Physical manufacturing:
    // Designer absorbs only half of any volume discount given to buyers
    const discountMultiplier = Math.max(0.5, 1 - (volumeDiscountPercent * 0.5) / 100);
    creatorRoyalty = Math.round((basePartPrice * quantity * discountMultiplier) * actualRoyaltyRate);

    // Workshop receives: production BOM & operational cost + 80% rush surcharge + 100% personalization fees
    const rushWorkshopPortion = Math.round(rushSurcharge * 0.8);
    workshopPayout = workshopCostPrice + rushWorkshopPortion + personalizationFee;

    // Platform take-rate (residual margin)
    platformTakeRate = Math.max(0, grossAmount - paymentGatewayFee - creatorRoyalty - workshopPayout);
  }

  // 7-day escrow hold date
  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + 7);

  return {
    orderId,
    orderNumber,
    grossAmount,
    paymentGatewayFee,
    creatorRoyalty,
    workshopPayout,
    platformTakeRate,
    escrowStatus: 'holding',
    escrowReleaseDate: releaseDate.toISOString()
  };
}
