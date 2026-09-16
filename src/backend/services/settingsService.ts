/**
 * VCUBE — `settingsService`: tầng dữ liệu cho 4 KHO CẤU HÌNH
 * (`docs/plans/09-admin-settings.md` §3.1) + audit log + validate + cache + realtime.
 *
 *   | kho                       | nội dung                                                  | ai ghi |
 *   |---------------------------|-----------------------------------------------------------|--------|
 *   | `site_content`            | nội dung storefront + phí ship + ngưỡng free-ship + SEO    | admin  |
 *   | `app_settings`            | pháp lý & định danh (MST, tên pháp nhân, hotline, TK ngân hàng) | admin  |
 *   | `pricing_global_settings` | VAT %, điện, nhân công, phí nền tảng %, currency           | admin  |
 *   | `pricing_configs`         | công thức giá (JSONB)                                     | admin  |
 *
 * VÌ SAO ĐẶT Ở `src/backend/services/`
 * -----------------------------------------------------------------------------
 * `supabase/*` là nơi giữ client + row mapper + `dbService` (một facade 28 method).
 * `services/*` là nơi chứa nghiệp vụ có kiểm tra/đối chiếu (`workshopService`,
 * `orderService`, `catalogService`, `pricingService` đều ở đây) — audit + validate +
 * cache + realtime đúng là nghiệp vụ, không phải truy cập DB thuần. Module này vẫn
 * truy cập DB **chỉ** qua `src/backend/supabase/*` (client + mappers), không tự tạo
 * client thứ hai, nên vẫn giữ split backend/frontend.
 *
 * LUẬT TRUNG THỰC DỮ LIỆU (`docs/design/data-honesty.md`, `09` §3.2 #1)
 * -----------------------------------------------------------------------------
 *   * KHÔNG có giá trị mặc định đoán. Chưa cấu hình ⇒ trả `null` (hoặc field `null`),
 *     UI hiển thị "Chưa cấu hình" / ẩn dòng đó.
 *   * Mọi thay đổi qua service đều ghi `setting_audit` (old → new + changed_by).
 *   * `pricing_configs` rỗng ⇒ trả `null`; **không** hạ cấp về
 *     `DEFAULT_INKIRI_FORMULA_CONFIG`. Việc nối công thức vào pricing engine thuộc A5
 *     (`QuoteSummaryPanel.tsx`); module này chỉ cung cấp accessor.
 *
 * GIỚI HẠN ĐÃ BIẾT (báo cáo rõ, không che)
 * -----------------------------------------------------------------------------
 *   1. Chưa có Edge Function ⇒ `validate` ở đây chạy trong bundle client và **có thể
 *      bị bỏ qua** bởi một client khác. Tầng server-side thật sự hiện có là
 *      `CHECK constraint` trong migration (`app_settings_tax_code_format_chk`,
 *      `pricing_global_settings_vat_range_chk`, …) — đó mới là cổng chặn không thể
 *      vượt. Hàm `validateSetting()` được export để Edge Function dùng lại nguyên vẹn.
 *   2. `pricing_global_settings.vat_percent` đã được bỏ DEFAULT trong baseline; nếu
 *      project đã áp bản baseline CŨ thì giá trị 8 vẫn nằm trong DB như một con số
 *      thật. Cần chạy lại baseline (idempotent) rồi xác nhận cột là NULL.
 *   3. `workshopService.getPricingGlobalSettings()` (`workshopService.ts:1081-1116`)
 *      đọc các cột KHÔNG tồn tại trong baseline
 *      (`electricity_rate_vnd_kwh`, `default_labor_rate_vnd_hour`, …), nuốt lỗi rồi
 *      rơi về seed — thuộc quyền A7. Module này đọc đúng cột của baseline.
 */
import { supabase } from '../supabase/client';
import {
  rowToAppSettings,
  rowToSiteContent,
  appSettingsToRow,
  type AppSettings,
  type SupabaseRow,
} from '../supabase/mappers';
import type { InkiriCostFormulaConfig, SiteContentConfig } from '../../types';

/* ============================================================================
 * 0. Hằng số schema — cột thật của baseline (20260901_baseline_schema.sql)
 * ========================================================================== */

export const SETTINGS_STORES = [
  'site_content',
  'app_settings',
  'pricing_global_settings',
  'pricing_configs',
] as const;

export type SettingsStore = (typeof SETTINGS_STORES)[number];

/** Khoá 1 hàng của từng kho (mọi kho đều dùng 1 hàng trừ `pricing_configs`). */
export const SETTINGS_ROW_IDS = {
  site_content: 'default',
  app_settings: 'settings',
  pricing_global_settings: 'global',
} as const;

/** Cột JSONB tuỳ ý của từng kho — nơi chứa các trường mở rộng chưa thành cột riêng. */
const JSONB_COLUMN: Record<SettingsStore, string | null> = {
  site_content: 'settings',
  app_settings: 'settings',
  pricing_global_settings: 'settings',
  pricing_configs: 'config',
};

/** Cột mang `updated_at` (để biết hàng có bị sửa không). */
const UPDATED_AT_COLUMN: Partial<Record<SettingsStore, string>> = {
  site_content: 'updated_at',
  app_settings: 'updated_at',
  pricing_global_settings: 'updated_at',
  pricing_configs: 'updated_at',
};

/* ============================================================================
 * 1. Kết quả trả về — KHÔNG nuốt lỗi (06 §2.5 #3)
 * ========================================================================== */

export interface SettingsResult<T> {
  /** `null` = CHƯA CẤU HÌNH (khác hẳn với lỗi). */
  data: T | null;
  error: string | null;
}

export interface WriteResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  /** Lỗi validate (khác lỗi mạng/DB) — UI hiển thị ngay cạnh trường nhập. */
  issues?: ValidationIssue[];
}

/* ============================================================================
 * 2. VALIDATE — hàm THUẦN, không phụ thuộc React/DB, dùng lại được ở Edge Function
 * ========================================================================== */

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/* -- nguyên thuỷ validate (exported để test và để Edge Function dùng lại) ----- */

/** Mã số thuế VN: 10 chữ số, hoặc 10-3 (chi nhánh). Chuỗi rỗng/null = chưa cấu hình. */
export function isValidTaxCode(v: string | null | undefined): boolean {
  if (v === null || v === undefined || String(v).trim() === '') return true; // chưa cấu hình
  return /^[0-9]{10}(-[0-9]{3})?$/.test(String(v).trim());
}

export const VAT_MIN_PERCENT = 0;
export const VAT_MAX_PERCENT = 20;

/** Phí nền tảng: khớp CHECK constraint của baseline `0..30` (nullable, KHÔNG default). */
export const MARKETPLACE_FEE_MIN_PERCENT = 0;
export const MARKETPLACE_FEE_MAX_PERCENT = 30;

/** Phí nền tảng 0–30%. `null`/'' = chưa cấu hình (hợp lệ, nhưng KHÔNG phải 0). */
export function isValidMarketplaceFeePercent(v: number | string | null | undefined): boolean {
  if (v === null || v === undefined || String(v).trim() === '') return true;
  const x = Number(v);
  return Number.isFinite(x) && x >= MARKETPLACE_FEE_MIN_PERCENT && x <= MARKETPLACE_FEE_MAX_PERCENT;
}

/** VAT 0–20%. `null`/'' = chưa cấu hình (hợp lệ, nhưng KHÔNG phải 0). */
export function isValidVatPercent(v: number | string | null | undefined): boolean {
  if (v === null || v === undefined || String(v).trim() === '') return true;
  const x = Number(v);
  return Number.isFinite(x) && x >= VAT_MIN_PERCENT && x <= VAT_MAX_PERCENT;
}

/** Phí ship ≥ 0. `null`/'' = chưa cấu hình. */
export function isValidShippingFee(v: number | string | null | undefined): boolean {
  if (v === null || v === undefined || String(v).trim() === '') return true;
  const x = Number(v);
  return Number.isFinite(x) && x >= 0;
}

/** Email hợp lệ; `null`/'' = chưa cấu hình. */
export function isValidEmail(v: string | null | undefined): boolean {
  if (v === null || v === undefined || String(v).trim() === '') return true;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v).trim());
}

/**
 * Hotline VN hợp lệ: 8–15 ký tự, chỉ chữ số + `+ - . ( )` và khoảng trắng, và phải
 * có ít nhất 8 chữ số. `null`/'' = chưa cấu hình.
 */
export function isValidHotline(v: string | null | undefined): boolean {
  if (v === null || v === undefined || String(v).trim() === '') return true;
  const t = String(v).trim();
  if (!/^[0-9+().\-\s]{8,20}$/.test(t)) return false;
  return (t.match(/[0-9]/g) ?? []).length >= 8;
}

/** Số tài khoản ngân hàng: chỉ chữ số. `null`/'' = chưa cấu hình. */
export function isValidBankAccount(v: string | null | undefined): boolean {
  if (v === null || v === undefined || String(v).trim() === '') return true;
  return /^[0-9]+$/.test(String(v).trim());
}

/* -- validate theo khoá cụ thể ------------------------------------------------ */

/** Tập khoá được validate, theo store. Khoá ngoài tập này không bị chặn. */
const VALIDATORS: Record<string, (v: any) => ValidationResult> = {
  'app_settings.taxCode': (v) => ({
    valid: isValidTaxCode(v),
    issues: isValidTaxCode(v)
      ? []
      : [{ field: 'taxCode', message: 'Mã số thuế phải là 10 chữ số, hoặc 10 chữ số + "-" + 3 chữ số.' }],
  }),
  'app_settings.contactEmail': (v) => ({
    valid: isValidEmail(v),
    issues: isValidEmail(v) ? [] : [{ field: 'contactEmail', message: 'Email liên hệ không hợp lệ.' }],
  }),
  'app_settings.hotline': (v) => ({
    valid: isValidHotline(v),
    issues: isValidHotline(v) ? [] : [{ field: 'hotline', message: 'Hotline không hợp lệ (8–20 ký tự, tối thiểu 8 chữ số).' }],
  }),
  'app_settings.bankAccount': (v) => ({
    valid: isValidBankAccount(v),
    issues: isValidBankAccount(v) ? [] : [{ field: 'bankAccount', message: 'Số tài khoản chỉ được chứa chữ số.' }],
  }),
  'pricing_global_settings.vatPercent': (v) => ({
    valid: isValidVatPercent(v),
    issues: isValidVatPercent(v) ? [] : [{ field: 'vatPercent', message: `VAT phải trong khoảng ${VAT_MIN_PERCENT}–${VAT_MAX_PERCENT}%.` }],
  }),
  'pricing_global_settings.marketplaceFeePercent': (v) => ({
    valid: isValidMarketplaceFeePercent(v),
    issues: isValidMarketplaceFeePercent(v)
      ? []
      : [{ field: 'marketplaceFeePercent', message: `Phí nền tảng phải trong khoảng ${MARKETPLACE_FEE_MIN_PERCENT}–${MARKETPLACE_FEE_MAX_PERCENT}%.` }],
  }),
  'pricing_global_settings.electricityRateVnd': (v) => ({
    valid: isValidShippingFee(v),
    issues: isValidShippingFee(v) ? [] : [{ field: 'electricityRateVnd', message: 'Đơn giá điện phải ≥ 0.' }],
  }),
  'pricing_global_settings.laborHourlyRateVnd': (v) => ({
    valid: isValidShippingFee(v),
    issues: isValidShippingFee(v) ? [] : [{ field: 'laborHourlyRateVnd', message: 'Đơn giá nhân công/giờ phải ≥ 0.' }],
  }),
  'site_content.standardShippingFee': (v) => ({
    valid: isValidShippingFee(v),
    issues: isValidShippingFee(v) ? [] : [{ field: 'standardShippingFee', message: 'Phí vận chuyển phải ≥ 0.' }],
  }),
  'site_content.freeShippingThreshold': (v) => ({
    valid: isValidShippingFee(v),
    issues: isValidShippingFee(v) ? [] : [{ field: 'freeShippingThreshold', message: 'Ngưỡng miễn phí vận chuyển phải ≥ 0.' }],
  }),
  'site_content.contactEmail': (v) => ({
    valid: isValidEmail(v),
    issues: isValidEmail(v) ? [] : [{ field: 'contactEmail', message: 'Email liên hệ không hợp lệ.' }],
  }),
  'site_content.hotline': (v) => ({
    valid: isValidHotline(v),
    issues: isValidHotline(v) ? [] : [{ field: 'hotline', message: 'Hotline không hợp lệ (8–20 ký tự, tối thiểu 8 chữ số).' }],
  }),
};

/**
 * Validate MỘT giá trị theo `store` + `key`. Khoá không nằm trong danh sách thì
 * coi là hợp lệ (nội dung văn bản tự do) — không tự bịa luật cho trường chưa chốt.
 */
export function validateSetting(store: SettingsStore, key: string, value: unknown): ValidationResult {
  const fn = VALIDATORS[`${store}.${key}`];
  if (!fn) return { valid: true, issues: [] };
  return fn(value);
}

/** Validate cả một bản patch; `field` trong issue là tên domain (camelCase). */
export function validatePatch(store: SettingsStore, patch: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  for (const [key, value] of Object.entries(patch)) {
    issues.push(...validateSetting(store, key, value).issues);
  }
  return { valid: issues.length === 0, issues };
}

/* ============================================================================
 * 3. CACHE + REALTIME (pattern đã có ở App.tsx)
 * ========================================================================== */

/** Snapshot trong bộ nhớ. `undefined` = CHƯA ĐỌC (khác `null` = đã đọc, chưa cấu hình). */
export interface SettingsSnapshot {
  site_content: SiteContentConfig | null;
  app_settings: AppSettings | null;
  pricing_global_settings: PricingGlobalSettings | null;
  pricing_configs: InkiriCostFormulaConfig | null;
}

const cache: Partial<SettingsSnapshot> = {};
const loadedAt: Partial<Record<SettingsStore, number>> = {};
const listeners = new Set<(snapshot: SettingsSnapshot) => void>();

let channel: ReturnType<typeof supabase.channel> | null = null;
let bootstrapPromise: Promise<SettingsResult<SettingsSnapshot>> | null = null;

function notify() {
  const snapshot = snapshotOf();
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (e) {
      console.warn('[settingsService] listener lỗi:', e);
    }
  });
}

/** Snapshot hiện tại. Trường `undefined` nghĩa là CHƯA ĐỌC từ DB. */
export function snapshotOf(): SettingsSnapshot {
  return {
    site_content: cache.site_content ?? null,
    app_settings: cache.app_settings ?? null,
    pricing_global_settings: cache.pricing_global_settings ?? null,
    pricing_configs: cache.pricing_configs ?? null,
  };
}

/**
 * Đọc cache KHÔNG chạm DB — dùng cho render đầu tiên (tránh mỗi component gọi DB).
 * `undefined` = chưa nạp lần nào.
 */
export function peekSettings<T extends SettingsStore>(store: T): SettingsSnapshot[T] | undefined {
  return cache[store] as SettingsSnapshot[T] | undefined;
}

/** Xoá cache (dùng khi đăng xuất để không giữ dữ liệu cũ). */
export function clearSettingsCache(): void {
  (Object.keys(cache) as SettingsStore[]).forEach((k) => delete cache[k]);
  (Object.keys(loadedAt) as SettingsStore[]).forEach((k) => delete loadedAt[k]);
  notify();
}

/**
 * Đăng ký nhận cập nhật (cache thay đổi hoặc realtime báo).
 * Trả hàm huỷ đăng ký. Việc subscribe realtime chỉ mở MỘT channel cho cả app.
 */
export function subscribeSettings(fn: (snapshot: SettingsSnapshot) => void): () => void {
  listeners.add(fn);
  fn(snapshotOf());
  ensureRealtime();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}

const REALTIME_TABLES: SettingsStore[] = [
  'site_content',
  'app_settings',
  'pricing_global_settings',
  'pricing_configs',
];

function ensureRealtime(): void {
  if (channel) return;
  if (typeof window === 'undefined') return;

  channel = supabase.channel('vcube:settings');
  for (const table of REALTIME_TABLES) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload: any) => {
        // Cập nhật cache ngay từ payload (không round-trip thêm một query), rồi báo
        // cho consumer. Trường hợp DELETE: nạp lại để biết hàng còn tồn tại không.
        if (payload?.eventType === 'DELETE') {
          delete cache[table];
          delete loadedAt[table];
          void loadStore(table).then(notify);
          return;
        }
        applyRowToCache(table, payload?.new ?? null);
        notify();
      }
    );
  }
  channel.subscribe();
}

/* ============================================================================
 * 4. ĐỌC / GHI TỪNG KHO
 * ========================================================================== */

export interface PricingGlobalSettings {
  id: string;
  /** `null` = chưa cấu hình (KHÔNG rơi về 2850). */
  electricityRateVnd: number | null;
  /** `null` = chưa cấu hình (KHÔNG rơi về 65000). */
  laborHourlyRateVnd: number | null;
  currency: string;
  /**
   * Phí nền tảng (%). `null` = CHƯA CẤU HÌNH — KHÔNG rơi về 8.
   * ⚠️ Cột `pricing_global_settings.marketplace_fee_percent` (baseline: nullable, CHECK 0–30).
   * Công thức giá hiện đọc `pricing_configs.platformCommissionPercent` cho cùng vai trò —
   * xem ghi chú "hai ô trùng vai trò" ở `PricingConfigPanel`.
   */
  marketplaceFeePercent: number | null;
  /** `null` = chưa cấu hình (KHÔNG rơi về 8). */
  vatPercent: number | null;
  settings: Record<string, unknown>;
  updatedAt: string | null;
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

const strOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
};

/** Row → domain cho `pricing_global_settings`. Không có default nghiệp vụ nào. */
export function rowToPricingGlobalSettings(d: SupabaseRow): PricingGlobalSettings {
  return {
    id: d.id,
    electricityRateVnd: numOrNull(d.electricity_rate_vnd),
    laborHourlyRateVnd: numOrNull(d.labor_hourly_rate_vnd),
    currency: d.currency || 'VND',
    marketplaceFeePercent: numOrNull(d.marketplace_fee_percent),
    vatPercent: numOrNull(d.vat_percent),
    settings: d.settings && typeof d.settings === 'object' ? d.settings : {},
    updatedAt: strOrNull(d.updated_at),
  };
}

/** Cột DB thật của `site_content` mà UI đang đọc/ghi. */
const SITE_CONTENT_COLUMNS = [
  'hero_badge',
  'hero_title',
  'hero_subtitle',
  'phone',
  'email',
  'hanoi_workshop_address',
  'hcm_workshop_address',
  'announcement_text',
  'announcement_enabled',
] as const;

export const SITE_CONTENT_EXTRA_KEYS = [
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

/** Domain → row cho `site_content`; phần mở rộng nằm trong cột `settings` (jsonb). */
function siteContentToRow(patch: Partial<SiteContentConfig>): {
  row: SupabaseRow;
  extras: Record<string, unknown>;
} {
  const row: SupabaseRow = {};
  if (patch.heroBadge !== undefined) row.hero_badge = patch.heroBadge;
  if (patch.heroHeadline !== undefined) row.hero_title = patch.heroHeadline;
  if (patch.heroSubheadline !== undefined) row.hero_subtitle = patch.heroSubheadline;
  if (patch.hotline !== undefined) row.phone = patch.hotline;
  if (patch.contactEmail !== undefined) row.email = patch.contactEmail;
  if (patch.hanoiWorkshopAddress !== undefined) row.hanoi_workshop_address = patch.hanoiWorkshopAddress;
  if (patch.hcmWorkshopAddress !== undefined) row.hcm_workshop_address = patch.hcmWorkshopAddress;
  if (patch.announcementText !== undefined) row.announcement_text = patch.announcementText;
  if (patch.announcementActive !== undefined) row.announcement_enabled = patch.announcementActive;

  // Nhóm storefront/SEO đã có CỘT riêng trong `site_content` (xem baseline). Phải map ở đây
  // nữa để hai đường ghi (settingsService / dbService) không lệch nhau.
  const COLUMN_MAP: Array<[keyof SiteContentConfig, string]> = [
    ['announcementBadge', 'announcement_badge'],
    ['announcementActionText', 'announcement_action_text'],
    ['announcementActionTag', 'announcement_action_tag'],
    ['heroHeadlineLine1', 'hero_headline_line1'],
    ['heroHeadlineHighlight', 'hero_headline_highlight'],
    ['heroCtaQuoteText', 'hero_cta_quote_text'],
    ['heroCtaCatalogText', 'hero_cta_catalog_text'],
    ['heroMetric1Label', 'hero_metric1_label'],
    ['heroMetric1Value', 'hero_metric1_value'],
    ['heroMetric2Label', 'hero_metric2_label'],
    ['heroMetric2Value', 'hero_metric2_value'],
    ['heroMetric3Label', 'hero_metric3_label'],
    ['heroMetric3Value', 'hero_metric3_value'],
    ['workflowBadge', 'workflow_badge'],
    ['workflowTitle', 'workflow_title'],
    ['workflowStep1Title', 'workflow_step1_title'],
    ['workflowStep1Desc', 'workflow_step1_desc'],
    ['workflowStep2Title', 'workflow_step2_title'],
    ['workflowStep2Desc', 'workflow_step2_desc'],
    ['workflowStep3Title', 'workflow_step3_title'],
    ['workflowStep3Desc', 'workflow_step3_desc'],
    ['estimatorBadge', 'estimator_badge'],
    ['estimatorTitle', 'estimator_title'],
    ['estimatorSubtitle', 'estimator_subtitle'],
    ['estimatorBenefit1', 'estimator_benefit1'],
    ['estimatorBenefit2', 'estimator_benefit2'],
    ['estimatorCtaText', 'estimator_cta_text'],
    ['trustPartnersTitle', 'trust_partners_title'],
    ['trustPartnersList', 'trust_partners_list'],
    ['seoTitle', 'seo_title'],
    ['seoDescription', 'seo_description'],
    ['seoKeywords', 'seo_keywords'],
    ['seoOgImage', 'seo_og_image'],
    ['seoCanonicalUrl', 'seo_canonical_url'],
    ['seoRobotsIndex', 'seo_robots_index'],
    ['seoStructuredData', 'seo_structured_data'],
  ];
  for (const [key, column] of COLUMN_MAP) {
    if (patch[key] !== undefined) row[column] = patch[key];
  }

  // Các trường CHƯA có cột riêng → cột `settings` jsonb (xem baseline).
  const extras: Record<string, unknown> = {};
  for (const key of SITE_CONTENT_EXTRA_KEYS) {
    if ((patch as any)[key] !== undefined) extras[key] = (patch as any)[key];
  }
  return { row, extras };
}

/** Đọc `settings` jsonb của `site_content` thành phần mở rộng của domain type. */
function siteContentExtras(settings: unknown): Partial<SiteContentConfig> {
  if (!settings || typeof settings !== 'object') return {};
  const j = settings as Record<string, unknown>;
  const out: Partial<SiteContentConfig> = {};
  if (numOrNull(j.standardShippingFee) !== null) out.standardShippingFee = Number(j.standardShippingFee);
  if (numOrNull(j.freeShippingThreshold) !== null) out.freeShippingThreshold = Number(j.freeShippingThreshold);
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
 * Nạp MỘT kho từ DB vào cache. Không bao giờ ném; luôn ghi `loadedAt`.
 * Trả `null` khi hàng chưa tồn tại (chưa cấu hình) — KHÔNG trả mock.
 */
async function loadStore(store: SettingsStore): Promise<void> {
  switch (store) {
    case 'app_settings': {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', SETTINGS_ROW_IDS.app_settings)
        .maybeSingle();
      if (error) throw new Error(`app_settings: ${error.message}`);
      cache.app_settings = data ? rowToAppSettings(data) : null;
      break;
    }
    case 'pricing_global_settings': {
      const { data, error } = await supabase
        .from('pricing_global_settings')
        .select('*')
        .eq('id', SETTINGS_ROW_IDS.pricing_global_settings)
        .maybeSingle();
      if (error) throw new Error(`pricing_global_settings: ${error.message}`);
      cache.pricing_global_settings = data ? rowToPricingGlobalSettings(data) : null;
      break;
    }
    case 'pricing_configs': {
      const { data, error } = await supabase
        .from('pricing_configs')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`pricing_configs: ${error.message}`);
      // KHÔNG hạ cấp về DEFAULT_INKIRI_FORMULA_CONFIG: rỗng ⇒ null (việc chọn
      // fallback là quyết định của pricing engine/A5, không phải của tầng dữ liệu).
      cache.pricing_configs = data?.config ? (data.config as InkiriCostFormulaConfig) : null;
      break;
    }
    case 'site_content': {
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .eq('id', SETTINGS_ROW_IDS.site_content)
        .maybeSingle();
      if (error) throw new Error(`site_content: ${error.message}`);
      if (!data) {
        // Hàng chưa tồn tại ⇒ chưa cấu hình. Nhưng `SiteContentConfig` là object bắt
        // buộc nhiều trường, nên trả null và để caller quyết định nguồn hiển thị.
        cache.site_content = null;
      } else {
        // `rowToSiteContent` cần `defaults`; truyền object rỗng nghĩa là "không có
        // nguồn default nào" — trường thiếu sẽ là `undefined` và UI phải xử lý.
        const base = rowToSiteContent(data, {} as SiteContentConfig);
        cache.site_content = { ...base, ...siteContentExtras(data.settings) } as SiteContentConfig;
      }
      break;
    }
  }
  loadedAt[store] = Date.now();
}

/** Áp payload realtime vào cache mà không gọi thêm DB. */
function applyRowToCache(store: SettingsStore, row: SupabaseRow | null): void {
  if (!row) return;
  switch (store) {
    case 'app_settings':
      cache.app_settings = rowToAppSettings(row);
      break;
    case 'pricing_global_settings':
      cache.pricing_global_settings = rowToPricingGlobalSettings(row);
      break;
    case 'site_content': {
      const base = rowToSiteContent(row, {} as SiteContentConfig);
      cache.site_content = { ...base, ...siteContentExtras(row.settings) } as SiteContentConfig;
      break;
    }
    case 'pricing_configs':
      cache.pricing_configs = row.config ? (row.config as InkiriCostFormulaConfig) : null;
      break;
  }
  loadedAt[store] = Date.now();
}

/* --------------------------- API đọc (typed accessor) ----------------------- */

/**
 * Nạp tất cả 4 kho MỘT LẦN (boot). Gọi lại sẽ trả cùng promise.
 * Lỗi của từng kho được trả trong `error` chứ không ném — app vẫn chạy với các kho
 * đọc được, và UI hiển thị "lỗi khi tải" cho kho hỏng.
 *
 * Nạp XONG không kho nào lỗi ⇒ gọi `notify()` để subscriber biết giá trị đã về (đúng quy ước
 * của file: cache đổi ⇒ `notify()`). Nạp LỖI ⇒ KHÔNG báo: một snapshot thiếu kho là trạng thái
 * ĐỌC HỎNG, còn `null` mà consumer nhận được lại có nghĩa "CHƯA CẤU HÌNH" — hai chuyện khác nhau.
 */
export function bootstrapSettings(): Promise<SettingsResult<SettingsSnapshot>> {
  if (bootstrapPromise) return bootstrapPromise;

  /** Lỗi THẬT của riêng lượt nạp này — vừa để trả trong `error`, vừa để quyết định `notify()`. */
  const failures: string[] = [];

  bootstrapPromise = (async () => {
    try {
      await Promise.all(
        SETTINGS_STORES.map(async (store) => {
          try {
            await loadStore(store);
          } catch (e: any) {
            failures.push(`${store}: ${e?.message ?? String(e)}`);
            console.warn(`[settingsService] bootstrap ${store} lỗi:`, e);
          }
        })
      );

      // BÁO cho subscriber khi cache ĐÃ có dữ liệu. Trước đây hàm này không gọi `notify()`:
      // ai `subscribeSettings()` TRƯỚC khi bootstrap xong chỉ nhận được snapshot RỖNG lúc
      // đăng ký rồi không bao giờ được báo lại (đo được: `subCalls: 1, stateMkt: null,
      // cacheMkt: 8` — cache có số mà state của consumer vẫn `null`).
      // Lỗi một phần/toàn bộ ⇒ KHÔNG báo (xem docstring ở trên).
      if (failures.length === 0) notify();

      return {
        data: snapshotOf(),
        error: failures.length ? failures.join(' • ') : null,
      };
    } finally {
      // Cho phép gọi lại bootstrap (ví dụ sau khi đổi phiên đăng nhập).
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

/** Đọc 1 kho (có cache; `force` để bỏ cache). */
export async function getStore<T extends SettingsStore>(
  store: T,
  opts: { force?: boolean } = {}
): Promise<SettingsResult<SettingsSnapshot[T]>> {
  if (!opts.force && loadedAt[store] !== undefined) {
    return { data: (cache[store] ?? null) as SettingsSnapshot[T], error: null };
  }
  try {
    await loadStore(store);
    return { data: (cache[store] ?? null) as SettingsSnapshot[T], error: null };
  } catch (e: any) {
    return { data: null, error: e?.message ?? String(e) };
  }
}

/** `app_settings` — pháp lý & định danh. `null` ⇒ UI hiện "Chưa cấu hình". */
export async function getAppSettings(opts?: { force?: boolean }): Promise<SettingsResult<AppSettings>> {
  return getStore('app_settings', opts);
}

/** `pricing_global_settings` — VAT/điện/nhân công. Field `null` ⇒ chưa cấu hình. */
export async function getPricingGlobalSettings(opts?: { force?: boolean }): Promise<SettingsResult<PricingGlobalSettings>> {
  return getStore('pricing_global_settings', opts);
}

/**
 * `site_content` — nội dung storefront. Trả `null` nếu hàng chưa tồn tại.
 */
export async function getSiteContent(opts?: { force?: boolean }): Promise<SettingsResult<SiteContentConfig>> {
  return getStore('site_content', opts);
}

/**
 * `pricing_configs` (công thức giá). `null` = chưa có cấu hình nào active.
 *
 * ⚠️ KHÔNG thay thế `DEFAULT_INKIRI_FORMULA_CONFIG` ở call site và KHÔNG ghi vào
 * `src/utils/pricingEngine.ts` (việc nối công thức vào engine thuộc A5). A5/A6 dùng
 * accessor này rồi tự quyết định fallback:
 *     const { data: cfg } = await getPricingConfig();
 *     const formula = cfg ?? DEFAULT_INKIRI_FORMULA_CONFIG;   // A5 quyết định
 */
export async function getPricingConfig(opts?: { force?: boolean }): Promise<SettingsResult<InkiriCostFormulaConfig>> {
  return getStore('pricing_configs', opts);
}

/** Accessor tiện dụng chỉ đọc CACHE (đồng bộ) — dùng trong render. */
export const settingsAccessors = {
  appSettings: (): AppSettings | null => cache.app_settings ?? null,
  pricingGlobal: (): PricingGlobalSettings | null => cache.pricing_global_settings ?? null,
  siteContent: (): SiteContentConfig | null => cache.site_content ?? null,
  pricingConfig: (): InkiriCostFormulaConfig | null => cache.pricing_configs ?? null,
};

/* ============================================================================
 * 5. AUDIT (`setting_audit`) — mọi thay đổi qua service phải ghi
 * ========================================================================== */

export interface SettingAuditEntry {
  id: string;
  settingKey: string;
  store: SettingsStore;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string | null;
  changedAt: string;
}

function rowToAudit(d: SupabaseRow): SettingAuditEntry {
  return {
    id: d.id,
    settingKey: d.setting_key,
    store: d.store,
    oldValue: d.old_value ?? null,
    newValue: d.new_value ?? null,
    changedBy: d.changed_by ?? null,
    changedAt: d.changed_at,
  };
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Ghi audit. Bảng này append-only ở tầng policy (không có policy UPDATE/DELETE), nên
 * INSERT là thao tác duy nhất. `changed_by` lấy từ phiên đăng nhập hiện tại; RLS chỉ
 * cho admin ghi, nên nếu không phải admin thì INSERT sẽ bị từ chối và ta trả lỗi.
 */
export async function writeSettingAudit(input: {
  store: SettingsStore;
  settingKey: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy?: string | null;
}): Promise<WriteResult<SettingAuditEntry>> {
  const changedBy = input.changedBy !== undefined ? input.changedBy : await currentUserId();
  const { data, error } = await supabase
    .from('setting_audit')
    .insert({
      setting_key: input.settingKey,
      store: input.store,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      changed_by: changedBy,
    })
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error: `setting_audit: ${error.message}` };
  return { success: true, data: data ? rowToAudit(data) : undefined };
}

/** Lịch sử thay đổi (chỉ admin đọc được — RLS). */
export async function getSettingAudit(
  opts: { store?: SettingsStore; settingKey?: string; limit?: number } = {}
): Promise<SettingsResult<SettingAuditEntry[]>> {
  let q = supabase.from('setting_audit').select('*').order('changed_at', { ascending: false });
  if (opts.store) q = q.eq('store', opts.store);
  if (opts.settingKey) q = q.eq('setting_key', opts.settingKey);
  q = q.limit(opts.limit ?? 100);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []).map(rowToAudit), error: null };
}

/* ============================================================================
 * 6. GHI (kèm audit) — chỉ đường admin; RLS là cổng chặn thật
 * ========================================================================== */

/**
 * Ghi `app_settings`. Chỉ gửi các cột có trong `patch` (không xoá cột khác).
 * Validate TRƯỚC khi ghi; DB còn có CHECK constraint làm cổng chặn thứ hai.
 */
export async function saveAppSettings(patch: Partial<AppSettings>): Promise<WriteResult<AppSettings>> {
  const validation = validatePatch('app_settings', patch as Record<string, unknown>);
  if (!validation.valid) {
    return { success: false, error: 'Dữ liệu không hợp lệ.', issues: validation.issues };
  }

  const before = cache.app_settings ?? null;
  const row = appSettingsToRow({ ...patch, updatedBy: patch.updatedBy ?? (await currentUserId()) });
  if (Object.keys(row).length === 0) {
    return { success: false, error: 'Không có trường nào để lưu.' };
  }

  const { data, error } = await supabase
    .from('app_settings')
    .upsert({ id: SETTINGS_ROW_IDS.app_settings, ...row }, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error: `app_settings: ${error.message}` };

  const after = data ? rowToAppSettings(data) : null;
  cache.app_settings = after;

  await auditPatch('app_settings', before as any, after as any);
  notify();
  return { success: true, data: after ?? undefined };
}

/**
 * Ghi `pricing_global_settings`. VAT 0–20%, điện/nhân công ≥ 0.
 * ⚠️ `vatPercent: null` = XOÁ cấu hình (không phải 0%).
 */
export async function savePricingGlobalSettings(
  patch: Partial<PricingGlobalSettings>
): Promise<WriteResult<PricingGlobalSettings>> {
  const domainPatch: Record<string, unknown> = {};
  if (patch.vatPercent !== undefined) domainPatch.vatPercent = patch.vatPercent;
  if (patch.electricityRateVnd !== undefined) domainPatch.electricityRateVnd = patch.electricityRateVnd;
  if (patch.laborHourlyRateVnd !== undefined) domainPatch.laborHourlyRateVnd = patch.laborHourlyRateVnd;
  if (patch.marketplaceFeePercent !== undefined) domainPatch.marketplaceFeePercent = patch.marketplaceFeePercent;

  const validation = validatePatch('pricing_global_settings', domainPatch);
  if (!validation.valid) {
    return { success: false, error: 'Dữ liệu không hợp lệ.', issues: validation.issues };
  }

  const row: SupabaseRow = { id: SETTINGS_ROW_IDS.pricing_global_settings };
  if (patch.vatPercent !== undefined) row.vat_percent = patch.vatPercent;
  if (patch.electricityRateVnd !== undefined) row.electricity_rate_vnd = patch.electricityRateVnd;
  if (patch.laborHourlyRateVnd !== undefined) row.labor_hourly_rate_vnd = patch.laborHourlyRateVnd;
  if (patch.marketplaceFeePercent !== undefined) row.marketplace_fee_percent = patch.marketplaceFeePercent;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.settings !== undefined) row.settings = patch.settings;
  row.updated_at = new Date().toISOString();

  const before = cache.pricing_global_settings ?? null;
  const { data, error } = await supabase
    .from('pricing_global_settings')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error: `pricing_global_settings: ${error.message}` };

  const after = data ? rowToPricingGlobalSettings(data) : null;
  cache.pricing_global_settings = after;

  await auditPatch('pricing_global_settings', before as any, after as any);
  notify();
  return { success: true, data: after ?? undefined };
}

/**
 * Ghi `site_content`. Các trường chưa có cột riêng (phí ship, ngưỡng free-ship,
 * dung sai, SEO) đi vào cột `settings` jsonb; `mergeExtras` mặc định `true` để
 * không xoá các khoá khác đang có trong jsonb.
 */
export async function saveSiteContent(
  patch: Partial<SiteContentConfig>,
  opts: { mergeExtras?: boolean } = {}
): Promise<WriteResult<SiteContentConfig>> {
  const validation = validatePatch('site_content', patch as Record<string, unknown>);
  if (!validation.valid) {
    return { success: false, error: 'Dữ liệu không hợp lệ.', issues: validation.issues };
  }

  const { row, extras } = siteContentToRow(patch);
  row.id = SETTINGS_ROW_IDS.site_content;
  row.updated_at = new Date().toISOString();

  const before = cache.site_content ?? null;

  if (Object.keys(extras).length > 0) {
    const mergeExtras = opts.mergeExtras !== false;
    row.settings = mergeExtras
      ? { ...(await readRawJsonb('site_content', SETTINGS_ROW_IDS.site_content, 'settings')), ...extras }
      : extras;
  }

  const { data, error } = await supabase
    .from('site_content')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error: `site_content: ${error.message}` };

  let after: SiteContentConfig | null = null;
  if (data) {
    after = { ...rowToSiteContent(data, {} as SiteContentConfig), ...siteContentExtras(data.settings) } as SiteContentConfig;
    cache.site_content = after;
  }

  await auditPatch('site_content', before as any, after as any);
  notify();
  return { success: true, data: after ?? undefined };
}

/**
 * Ghi `pricing_configs` (công thức giá) — chỉ lưu, KHÔNG áp vào pricing engine.
 *
 * ⚠️ RỦI RO CAO NHẤT trong 4 kho (09 §6 #2): đổi hệ số là đổi tiền của mọi báo giá.
 * A6 **bắt buộc** dựng "xem trước ảnh hưởng lên báo giá mẫu" + version trước khi gọi
 * hàm này; ở đây lưu kèm `formula_version` để giữ vết phiên bản.
 */
export async function savePricingConfig(
  config: InkiriCostFormulaConfig,
  opts: { id?: string; configName?: string; formulaVersion?: string } = {}
): Promise<WriteResult<InkiriCostFormulaConfig>> {
  if (!config || typeof config !== 'object') {
    return { success: false, error: 'Công thức giá không hợp lệ.' };
  }
  const id = opts.id ?? 'default-active-formula';
  const before = cache.pricing_configs ?? null;

  const { data, error } = await supabase
    .from('pricing_configs')
    .upsert(
      {
        id,
        config_name: opts.configName ?? 'Inkiri Formula',
        formula_version: opts.formulaVersion ?? 'v1',
        is_active: true,
        config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error: `pricing_configs: ${error.message}` };

  const after = data?.config ? (data.config as InkiriCostFormulaConfig) : null;
  cache.pricing_configs = after;

  await auditPatch('pricing_configs', before as any, after as any);
  notify();
  return { success: true, data: after ?? undefined };
}

/** Đọc thẳng 1 khoá jsonb (dùng để merge thay vì ghi đè cả cột `settings`). */
async function readRawJsonb(store: SettingsStore, id: string, column: string): Promise<Record<string, unknown>> {
  const col = JSONB_COLUMN[store] ?? column;
  const { data, error } = await supabase.from(store).select(col).eq('id', id).maybeSingle();
  if (error || !data) return {};
  const v = (data as SupabaseRow)[col];
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/**
 * So sánh `before`/`after` theo từng khoá và ghi 1 dòng `setting_audit` cho mỗi khoá
 * THAY ĐỔI. Không có thay đổi ⇒ không ghi gì (tránh nhiễu nhật ký).
 */
async function auditPatch(store: SettingsStore, before: any, after: any): Promise<void> {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changed: Promise<unknown>[] = [];
  for (const key of keys) {
    if (key === 'updatedAt' || key === 'updatedBy' || key === 'id') continue;
    const oldValue = before?.[key] ?? null;
    const newValue = after?.[key] ?? null;
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    changed.push(
      writeSettingAudit({ store, settingKey: key, oldValue, newValue }).catch((e) => {
        console.warn('[settingsService] không ghi được audit:', e);
      })
    );
  }
  if (changed.length) await Promise.all(changed);
}

/** Ghi nhiều khoá của CÙNG một kho trong một lượt (validate cả lô trước khi ghi). */
export async function saveSettingsPatch(
  store: SettingsStore,
  patch: Record<string, unknown>
): Promise<WriteResult<unknown>> {
  switch (store) {
    case 'app_settings':
      return saveAppSettings(patch as Partial<AppSettings>);
    case 'pricing_global_settings':
      return savePricingGlobalSettings(patch as Partial<PricingGlobalSettings>);
    case 'site_content':
      return saveSiteContent(patch as Partial<SiteContentConfig>);
    default:
      return { success: false, error: `saveSettingsPatch chưa hỗ trợ kho ${store} (công thức giá cần quy trình version + preview).` };
  }
}

/** Thời điểm nạp gần nhất của một kho (`undefined` = chưa nạp). */
export function lastLoadedAt(store: SettingsStore): number | undefined {
  return loadedAt[store];
}

/* `UPDATED_AT_COLUMN` và `SITE_CONTENT_COLUMNS` được giữ lại làm tài liệu schema:
 * chúng ghi rõ cột nào của baseline ứng với kho nào, để lần sau thêm trường không
 * phải dò lại migration. */
export const SETTINGS_SCHEMA_NOTES = {
  updatedAtColumn: UPDATED_AT_COLUMN,
  siteContentColumns: SITE_CONTENT_COLUMNS,
  jsonbColumn: JSONB_COLUMN,
} as const;
