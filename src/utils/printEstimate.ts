import { PlateInfo } from '../types';

/**
 * F1 — Ước lượng nhựa / thời gian in từ dữ liệu THẬT của tệp, có GẮN NHÃN NGUỒN.
 *
 * Vì sao tách riêng: bộ đọc (`meshParser`) chỉ đọc được những gì tệp chứa; còn giá thì cần
 * gram + giờ. Trước đây `pricingEngine` tự bịa cả hai (`volume × density` và heuristic thể
 * tích) mà không nói cho ai biết đó là số ước lượng (data-honesty PC-05/MP-13). Hàm thuần này
 * chọn nguồn theo thứ tự ưu tiên và trả kèm `gramsSource`/`printHoursSource` để tầng hiển thị
 * dán nhãn "từ file" / "ước tính theo năng suất máy" / "ước tính theo thể tích".
 *
 * Bất biến:
 * - KHÔNG hard-code năng suất máy mặc định. `throughputGramsPerHour` thiếu ⇒ rơi về thể tích.
 * - `null`/`undefined` = CHƯA KHAI, khác hẳn `0`.
 * - Phòng vệ NaN / số âm / số 0 ở mọi đầu vào.
 * - Khi KHÔNG có dữ liệu slicer và KHÔNG có năng suất, giữ nguyên con số mà engine đã dùng
 *   (sàn 5 g và 0.6 giờ) để giá không đổi ngoài ý muốn.
 */

export type GramsSource = 'slicer' | 'volume_estimate';
export type TimeSource = 'slicer' | 'throughput' | 'volume_estimate';

export interface FilamentUsage {
  /** Gram nhựa của mô hình — LUÔN hữu hạn và > 0 sau khi resolve. */
  totalGrams: number;
  gramsSource: GramsSource;
  /** Giờ in — LUÔN hữu hạn và > 0 sau khi resolve. */
  printHours: number;
  printHoursSource: TimeSource;
  /** Năng suất (g/giờ) đã dùng để suy giờ in; `null` nếu không dùng / chưa khai. */
  throughputGramsPerHourUsed: number | null;
  /** Tổng hợp theo từng bàn in; `grams`/`printSeconds` = `null` khi tệp không khai. */
  perPlate: Array<{ index: number; grams: number | null; printSeconds: number | null }>;
}

export interface ResolveFilamentUsageInput {
  volumeCm3: number;
  density: number;
  infillPercent: number;
  layerHeightMm: number;
  slicerGrams?: number | null;
  slicerPrintSeconds?: number | null;
  plates?: PlateInfo[];
  throughputGramsPerHour?: number | null;
}

/** `number` hữu hạn và > 0 — mọi thứ khác (NaN, ±Infinity, 0, âm, null, undefined) đều không đạt. */
function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function resolveFilamentUsage(input: ResolveFilamentUsageInput): FilamentUsage {
  const volumeCm3 = isPositiveFinite(input.volumeCm3) ? input.volumeCm3 : 0;
  const density = isPositiveFinite(input.density) ? input.density : 0;
  const infillPercent =
    typeof input.infillPercent === 'number' && Number.isFinite(input.infillPercent) && input.infillPercent > 0
      ? input.infillPercent
      : 0;

  // ── GRAM ────────────────────────────────────────────────────────────────────────────────
  let totalGrams: number;
  let gramsSource: GramsSource;
  if (isPositiveFinite(input.slicerGrams)) {
    totalGrams = input.slicerGrams;
    gramsSource = 'slicer';
  } else {
    // Khớp đúng công thức cũ của engine (làm tròn + sàn 5 g) để không đổi giá khi tệp không
    // kèm dữ liệu slicer.
    const estimated = volumeCm3 * density * (0.22 + (infillPercent / 100) * 0.78);
    totalGrams = Number.isFinite(estimated) ? Math.max(5, Math.round(estimated)) : 5;
    gramsSource = 'volume_estimate';
  }

  // ── GIỜ IN ───────────────────────────────────────────────────────────────────────────────
  let printHours: number;
  let printHoursSource: TimeSource;
  let throughputGramsPerHourUsed: number | null = null;
  if (isPositiveFinite(input.slicerPrintSeconds)) {
    // Dùng NGUYÊN thời gian slicer — KHÔNG cộng tool-change (slicer đã tính vào dự phóng).
    printHours = input.slicerPrintSeconds / 3600;
    printHoursSource = 'slicer';
  } else if (isPositiveFinite(input.throughputGramsPerHour)) {
    printHours = totalGrams / input.throughputGramsPerHour;
    printHoursSource = 'throughput';
    throughputGramsPerHourUsed = input.throughputGramsPerHour;
  } else {
    const layerHeightMm = isPositiveFinite(input.layerHeightMm) ? input.layerHeightMm : 0;
    const heuristic = layerHeightMm > 0 ? (volumeCm3 * 3.8) / (layerHeightMm * 100) : 0;
    // Khớp đúng sàn 0.6 giờ của engine cũ để không đổi giá ngoài ý muốn.
    printHours = Number.isFinite(heuristic) ? Math.max(0.6, heuristic) : 0.6;
    printHoursSource = 'volume_estimate';
  }

  const perPlate = (Array.isArray(input.plates) ? input.plates : []).map((plate) => ({
    index: Number.isFinite(plate.index) ? plate.index : 0,
    grams: isPositiveFinite(plate.filamentGrams) ? plate.filamentGrams : null,
    printSeconds: isPositiveFinite(plate.predictionSeconds) ? plate.predictionSeconds : null,
  }));

  return {
    totalGrams,
    gramsSource,
    printHours,
    printHoursSource,
    throughputGramsPerHourUsed,
    perPlate,
  };
}
