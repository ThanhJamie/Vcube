import React from 'react';
import { InkiriCostFormulaConfig } from '@/types';
import { formatNumber } from '../../../lib/format';
import { INKIRI_REFERENCE_VALUES } from '../../../../data/mockData';

/**
 * `true` khi `v` là một số HỮU HẠN đã được cấu hình (khác `undefined`/`null`/`NaN`).
 * Dùng để phân biệt "chưa cấu hình" với "giá trị thật" — không bao giờ thay bằng số đoán.
 */
export const isConfiguredNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Ví dụ minh hoạ CỐ ĐỊNH cho BẢN XEM TRƯỚC TÁC ĐỘNG (Đợt 9 / R1, việc 4).
 *
 * Đây KHÔNG phải số liệu của một đơn hàng thật: mọi tham số được IN NGAY TRÊN MÀN HÌNH
 * cạnh bảng kết quả để admin tự đối chiếu. Mục đích là để thấy tiền đổi thế nào TRƯỚC khi
 * bấm Lưu — đổi VAT/điện/nhân công là đổi giá của mọi báo giá.
 */
export const PREVIEW_EXAMPLE = {
  /** Công suất máy in trong ví dụ (kW). */
  powerKW: 0.18,
  /** Thời gian in trong ví dụ (giờ). */
  printHours: 2.5,
  /** Số phút nhân công trong ví dụ (phút). */
  laborMinutes: 45,
  /** Tiền hàng mẫu để minh hoạ VAT (đồng). */
  goodsVnd: 500000,
} as const;

/** Điện năng tiêu thụ của ví dụ (kWh) — in ra màn hình, không phải một hằng số ngầm. */
export const PREVIEW_KWH = PREVIEW_EXAMPLE.powerKW * PREVIEW_EXAMPLE.printHours;

/** Nhãn cho giá trị CHƯA cấu hình trong bản xem trước (KHÔNG in một con số đoán). */
export const PREVIEW_NOT_CONFIGURED = 'Chưa cấu hình';

/**
 * Bản sao SÂU của bộ số mẫu Inkiri để đưa vào form (không mutate hằng số dùng chung).
 * Đợt U: chỉ dùng để ĐIỀN FORM — không có lệnh ghi DB nào ở đây.
 */
export const referenceFormulaForm = (): Partial<InkiriCostFormulaConfig> => ({
  ...INKIRI_REFERENCE_VALUES.formula,
  volumeDiscounts: INKIRI_REFERENCE_VALUES.formula.volumeDiscounts.map((tier) => ({ ...tier })),
});

/** 4 ô ở "mục 0" (`pricing_global_settings`) dưới dạng chuỗi cho `<input>`. */
export const referenceGlobalForm = (): {
  vatPercent: string;
  electricityRateVnd: string;
  laborHourlyRateVnd: string;
  marketplaceFeePercent: string;
} => ({
  vatPercent: String(INKIRI_REFERENCE_VALUES.global.vatPercent),
  electricityRateVnd: String(INKIRI_REFERENCE_VALUES.global.electricityRateVnd),
  laborHourlyRateVnd: String(INKIRI_REFERENCE_VALUES.global.laborHourlyRateVnd),
  marketplaceFeePercent: String(INKIRI_REFERENCE_VALUES.global.marketplaceFeePercent),
});

export const formatPreviewVnd = (v: number | null): string =>
  v === null ? PREVIEW_NOT_CONFIGURED : `${formatNumber(v)} ₫`;

/** Chênh lệch giữa giá trị ĐANG GÕ và giá trị ĐANG LƯU; thiếu một bên ⇒ nói rõ chưa đủ dữ liệu. */
export const formatPreviewDelta = (saved: number | null, typed: number | null): string => {
  if (saved === null || typed === null) return 'Chưa đủ dữ liệu';
  const delta = typed - saved;
  if (delta === 0) return 'Không đổi';
  return `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta))} ₫`;
};

/**
 * Lỗi hiện NGAY CẠNH ô nhập (a11y: `role="alert"` + `aria-describedby` trỏ tới id này).
 * Bắt buộc theo `docs/plans/14-dot7-briefs.md` mục O2 — việc 4.
 */
export const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-danger">
      {message}
    </p>
  ) : null;

export type GlobalFormField = 'vatPercent' | 'electricityRateVnd' | 'laborHourlyRateVnd' | 'marketplaceFeePercent';
