/**
 * Định dạng tiền / số / ngày / dung lượng / khối lượng — một chỗ duy nhất.
 *
 * Quy ước chung (docs/design/data-honesty.md + docs/design/tokens.md §8):
 * - Hàm THUẦN, không side-effect, không đọc DOM/`Date.now()` ẩn.
 * - `null` / `undefined` / `NaN` / chuỗi rỗng -> `EMPTY_VALUE` ('—'), KHÔNG bịa số 0.
 * - Locale mặc định `vi-VN` (dấu phân cách nghìn '.', thập phân ',').
 * - Mọi cột số trên UI nên kèm `tabular-nums` (xem tokens.md §4).
 *
 * Phase 6 (báo giá/hóa đơn) dùng các hàm này; không format tiền rải rác trong component.
 */

/** Giá trị hiển thị khi thiếu dữ liệu — thống nhất với quy ước bảng của tokens.md §8. */
export const EMPTY_VALUE = '—';

/** Locale mặc định cho toàn bộ helper. */
export const DEFAULT_LOCALE = 'vi-VN';

/** Tiền tệ mặc định (VND — không có phần thập phân). */
export const DEFAULT_CURRENCY = 'VND';

type NumericInput = number | string | null | undefined;
type DateInput = Date | string | number | null | undefined;

type NumberOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: 'standard' | 'compact';
};

type CurrencyOptions = {
  locale?: string;
  currency?: string;
  maximumFractionDigits?: number;
};

type PercentOptions = {
  locale?: string;
  /** Số chữ số thập phân (mặc định 0 nếu là số nguyên, 1 nếu lẻ). */
  fractionDigits?: number;
  /** `true` khi đầu vào là tỷ lệ 0..1 (0.125 -> 12,5%). Mặc định false. */
  isRatio?: boolean;
};

type DateOptions = {
  locale?: string;
  /** 'short' = 09/12/2026 (mặc định), 'long' = 9 tháng 12, 2026. */
  style?: 'short' | 'long';
};

type DateTimeOptions = DateOptions & {
  withSeconds?: boolean;
  /** Mặc định 'HH:mm'. */
  hour12?: boolean;
};

type BytesOptions = {
  locale?: string;
  /** Số chữ số thập phân (mặc định 1; giá trị 0 B luôn là "0 B"). */
  decimals?: number;
  /** 1000 (SI, mặc định) hoặc 1024. */
  base?: 1000 | 1024;
};

type WeightOptions = {
  locale?: string;
  /** Đơn vị của GIÁ TRỊ ĐẦU VÀO (mặc định 'g' — khớp dữ liệu in 3D). */
  unit?: 'g' | 'kg';
  /** Số chữ số thập phân khi hiển thị kg (mặc định 2). */
  decimals?: number;
};

/** Chỉ nhận number hữu hạn hoặc chuỗi số JS ("12.5"); mọi thứ khác -> null. */
function toFiniteNumber(value: NumericInput): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Intl có thể thiếu (môi trường build tối giản) — luôn có đường lui. */
function safeFormat(build: () => string, fallback: () => string): string {
  try {
    return build();
  } catch {
    return fallback();
  }
}

function formatFixed(value: number, fractionDigits: number): string {
  return value.toFixed(fractionDigits);
}

/** Số thuần: 1_234_567,5 -> "1.234.567,5" (vi-VN). */
export function formatNumber(value: NumericInput, options: NumberOptions = {}): string {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return EMPTY_VALUE;
  const locale = options.locale ?? DEFAULT_LOCALE;
  return safeFormat(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: options.minimumFractionDigits,
        maximumFractionDigits: options.maximumFractionDigits ?? (options.notation === 'compact' ? 1 : 3),
        notation: options.notation ?? 'standard',
      }).format(parsed),
    () => formatFixed(parsed, options.maximumFractionDigits ?? 0),
  );
}

/** Tiền VND: 1250000 -> "1.250.000 ₫". */
export function formatCurrency(value: NumericInput, options: CurrencyOptions = {}): string {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return EMPTY_VALUE;
  const locale = options.locale ?? DEFAULT_LOCALE;
  const currency = options.currency ?? DEFAULT_CURRENCY;
  return safeFormat(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: options.maximumFractionDigits ?? 0,
      }).format(parsed),
    () => `${formatNumber(parsed, { locale })} ${currency}`,
  );
}

/** Phần trăm: 12.5 -> "12,5%"; `{ isRatio: true }` với 0.125 -> "12,5%". */
export function formatPercent(value: NumericInput, options: PercentOptions = {}): string {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return EMPTY_VALUE;
  const ratio = options.isRatio ? parsed * 100 : parsed;
  const fractionDigits =
    options.fractionDigits ?? (Number.isInteger(ratio) ? 0 : 1);
  const locale = options.locale ?? DEFAULT_LOCALE;
  return safeFormat(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(ratio / 100),
    () => `${formatFixed(ratio, fractionDigits)}%`,
  );
}

/** Ngày: "2026-12-09" -> "09/12/2026". */
export function formatDate(value: DateInput, options: DateOptions = {}): string {
  const date = toValidDate(value);
  if (!date) return EMPTY_VALUE;
  const locale = options.locale ?? DEFAULT_LOCALE;
  const style = options.style ?? 'short';
  return safeFormat(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: style === 'long' ? 'long' : '2-digit',
        year: 'numeric',
      }).format(date),
    () => formatFixed(date.getDate(), 0).padStart(2, '0') + '/' +
      formatFixed(date.getMonth() + 1, 0).padStart(2, '0') + '/' +
      formatFixed(date.getFullYear(), 0),
  );
}

/** Ngày + giờ: "09/12/2026 14:30". */
export function formatDateTime(value: DateInput, options: DateTimeOptions = {}): string {
  const date = toValidDate(value);
  if (!date) return EMPTY_VALUE;
  const locale = options.locale ?? DEFAULT_LOCALE;
  const style = options.style ?? 'short';
  return safeFormat(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: style === 'long' ? 'long' : '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(options.withSeconds ? { second: '2-digit' } : {}),
        hour12: options.hour12 ?? false,
      }).format(date),
    () => {
      const hh = formatFixed(date.getHours(), 0).padStart(2, '0');
      const mm = formatFixed(date.getMinutes(), 0).padStart(2, '0');
      return `${formatDate(date, options)} ${hh}:${mm}`;
    },
  );
}

const BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'] as const;

/** Dung lượng file: 1572864 (base 1024) -> "1,5 MB"; 0 -> "0 B". */
export function formatBytes(bytes: NumericInput, options: BytesOptions = {}): string {
  const parsed = toFiniteNumber(bytes);
  if (parsed === null || parsed < 0) return EMPTY_VALUE;
  const base = options.base ?? 1000;
  const decimals = options.decimals ?? 1;
  if (parsed === 0) return '0 B';

  let unitIndex = 0;
  let scaled = parsed;
  while (scaled >= base && unitIndex < BYTE_UNITS.length - 1) {
    scaled /= base;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : decimals;
  const numberText = formatNumber(Number(scaled.toFixed(digits)), {
    locale: options.locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
  return `${numberText} ${BYTE_UNITS[unitIndex]}`;
}

/** Khối lượng in: 250 (g) -> "250 g"; 1250 (g) -> "1,25 kg"; unit 'kg' -> tự quy đổi. */
export function formatWeight(value: NumericInput, options: WeightOptions = {}): string {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return EMPTY_VALUE;
  const locale = options.locale;
  const inputUnit = options.unit ?? 'g';
  const decimals = options.decimals ?? 2;

  const grams = inputUnit === 'kg' ? parsed * 1000 : parsed;
  if (Math.abs(grams) >= 1000) {
    const kilograms = Number((grams / 1000).toFixed(decimals));
    return `${formatNumber(kilograms, { locale, minimumFractionDigits: 0, maximumFractionDigits: decimals })} kg`;
  }
  const gramValue = Number(grams.toFixed(decimals));
  return `${formatNumber(gramValue, { locale, minimumFractionDigits: 0, maximumFractionDigits: decimals })} g`;
}
