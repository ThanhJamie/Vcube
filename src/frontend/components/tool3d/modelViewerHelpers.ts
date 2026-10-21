import type { PlateInfo } from '../../types';
import { EMPTY_VALUE, formatWeight } from '../../lib/format';

/**
 * Helper/type thuần của ModelViewer3D — block-move từ `components/tool3d/ModelViewer3D.tsx`
 * (Phase 4a). Bản sao nguyên văn; chỉ đổi `const` nội bộ thành `export` khi cần dùng lại.
 */
export type WebGLRecoveryState = 'ACTIVE' | 'CONTEXT_LOST' | 'RECOVERING';

/**
 * Sàn khung dựng cảnh (đơn vị cảnh) khi CHƯA có bàn in và CHƯA đo được mô hình.
 * Đây là hằng số DỰNG CẢNH — KHÔNG phải thông số bàn in của máy nào và KHÔNG bao giờ được
 * hiển thị như một số đo (Đợt S #3: trước đây component tự mặc định một khối bàn in 256 mm).
 */
export const MIN_VIEW_FRAME = 260;

/** F7 — đổi số giây slicer thành nhãn giờ/phút; thiếu/0/âm/NaN ⇒ `—`. */
export const formatSeconds = (seconds: number | null | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return EMPTY_VALUE;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  return `${minutes} phút`;
};

/**
 * F7 — nhãn gram/giờ của MỘT bàn, chỉ dựng từ số đo tệp khai. Không có số nào ⇒ `null`
 * để UI không bày dòng rỗng hay số đoán.
 */
export const plateMetaText = (plate: PlateInfo): string | null => {
  const grams =
    typeof plate.filamentGrams === 'number' && Number.isFinite(plate.filamentGrams)
      ? formatWeight(plate.filamentGrams)
      : null;
  const time =
    plate.predictionFormatted ||
    (typeof plate.predictionSeconds === 'number' &&
    Number.isFinite(plate.predictionSeconds) &&
    plate.predictionSeconds > 0
      ? formatSeconds(plate.predictionSeconds)
      : null);
  const parts = [grams, time].filter((v): v is string => Boolean(v));
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const VIEW_ANGLE_LABEL: Record<'iso' | 'top' | 'front' | 'side', string> = {
  iso: 'CHUẨN',
  top: 'TRÊN',
  front: 'TRƯỚC',
  side: 'CẠNH'
};
