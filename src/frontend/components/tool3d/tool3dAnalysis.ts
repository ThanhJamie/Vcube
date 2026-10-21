import type { AnalysisFile, PrinterProfile } from '../../types';
import { EMPTY_VALUE, formatNumber } from '../../lib/format';

/* ── Tách từ `views/Tool3DView.tsx` (Phase 4a, block-move) ────────────────────────────────────
 * Logic đo lường/parse thuần, không React. Nội dung dưới đây là BẢN SAO NGUYÊN VĂN block
 * dòng 18–209 của file gốc (chỉ thêm từ khoá `export`). Không sửa logic/copy. */


/* ── Q (#2): hậu quả của việc cột DB nay NULL thật (`mappers.ts` không còn điền số mặc định) ──
 * `materials.price_per_gram` / `printer_fleet.bed_dimensions` … có thể là `null` = CHƯA ĐO ĐƯỢC.
 * `.toLocaleString()` trên `null` làm TRẮNG MÀN HÌNH, nên mọi chỗ hiển thị/so sánh phải đi qua
 * hai hàm dưới đây. Thiếu số ⇒ `—`, KHÔNG bịa số và KHÔNG in chữ "null" ra UI. */
export const measuredText = (v: number | null | undefined, suffix = ''): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${formatNumber(v)}${suffix}` : EMPTY_VALUE;

/** Khổ bàn in của máy — `null` = chưa đo được CẢ 3 cạnh ⇒ không so sánh, không hiển thị số. */
export const bedOf = (p: PrinterProfile | undefined): { x: number; y: number; z: number } | null =>
  p && p.bedDimensions &&
  typeof p.bedDimensions.x === 'number' && Number.isFinite(p.bedDimensions.x) &&
  typeof p.bedDimensions.y === 'number' && Number.isFinite(p.bedDimensions.y) &&
  typeof p.bedDimensions.z === 'number' && Number.isFinite(p.bedDimensions.z)
    ? { x: p.bedDimensions.x, y: p.bedDimensions.y, z: p.bedDimensions.z }
    : null;

/** Khổ bàn in dạng chữ (mm); thiếu ⇒ `—`. */
export const bedText = (p: PrinterProfile | undefined): string => {
  const bed = bedOf(p);
  return bed ? `${bed.x}×${bed.y}×${bed.z} mm` : EMPTY_VALUE;
};

/**
 * Thể tích khổ bàn ĐO ĐƯỢC (mm³). `null` = máy chưa khai khổ bàn ⇒ KHÔNG so sánh được.
 * Dùng để chọn "máy khổ lớn hơn" theo SỐ ĐO, thay cho việc hardcode id máy của nền tảng khác.
 */
export const bedVolume = (p: PrinterProfile | undefined): number | null => {
  const bed = bedOf(p);
  return bed ? bed.x * bed.y * bed.z : null;
};

// P4 (data-honesty MP-04): diem "kha nang in" PHAI suy tu so do that cua tep, khong duoc la
// hang so bia (truoc day: `isWatertight ? 94 : 76`). Ham duoi day chi doc cac phep do da chay:
// do kin (isWatertight), so canh non-manifold, so phap tuyen nghich, do day thanh nho nhat.
// Moi loi do duoc tru diem theo bang duoi; khong phat hien loi nao => 100.
//
// R4 (MP-04 — R1 bao): `null` = CHUA DO DUOC, khac han `0` = do duoc va bang 0. Trong JavaScript
// `!null === true` va `null < 0.8 === true`, nen ban cu am tham bien "chua do" thanh "co loi" va
// tra 60/100 cho mot tep KHONG co phep do nao. Nay:
//   - `null` KHONG bi tru diem (bo qua, khong coi la loi);
//   - CA BON phep do deu `null` ⇒ tra `null` = CHUA CHAM DIEM (giao dien khong hien con so nao).
export function derivePrintabilityScore(measured: {
  isWatertight: boolean | null;
  nonManifoldEdges: number | null;
  invertedNormals: number | null;
  minWallThickness: number | null;
}): number | null {
  const noMeasurement =
    measured.isWatertight === null &&
    measured.nonManifoldEdges === null &&
    measured.invertedNormals === null &&
    measured.minWallThickness === null;
  if (noMeasurement) return null;

  let score = 100;
  if (measured.isWatertight === false) score -= 25;
  if (measured.nonManifoldEdges !== null) {
    score -= Math.min(30, Math.max(0, measured.nonManifoldEdges) * 5);
  }
  if (measured.invertedNormals !== null) {
    score -= Math.min(20, Math.max(0, measured.invertedNormals) * 5);
  }
  if (measured.minWallThickness !== null && measured.minWallThickness < 0.8) score -= 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function derivePrintabilityLevel(score: number): 'good' | 'warning' | 'critical' {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

/**
 * R4: cong thuc diem dung BON phep do. Ham dem xem bao nhieu phep trong so do CO so that
 * (`0` la so do that; `null` moi la chua do duoc).
 */
export function countMeasuredScoreInputs(file: AnalysisFile): number {
  return [file.isWatertight, file.nonManifoldEdges, file.invertedNormals, file.minWallThickness]
    .filter((v) => v !== null).length;
}

/** R4: nhan cac phep do CHUA co so — de noi ro diem duoc cham tu phan nao, bo qua muc nao. */
export function describeUnmeasuredScoreInputs(file: AnalysisFile): string[] {
  const missing: string[] = [];
  if (file.isWatertight === null) missing.push('độ kín');
  if (file.nonManifoldEdges === null) missing.push('cạnh non-manifold');
  if (file.invertedNormals === null) missing.push('pháp tuyến nghịch');
  if (file.minWallThickness === null) missing.push('độ dày thành tối thiểu');
  return missing;
}

// ── Q2 (data-honesty MP-01/07/08/11) ─────────────────────────────────────────────────────────────
// Nguyên tắc: mọi con số hiển thị cho khách phải đến từ phép đo trên CHÍNH tệp khách tải lên, hoặc
// không hiển thị gì. Bốn thứ dưới đây thay cho các hằng số bịa cũ: góc nhô mặc định, cờ "kín"
// được gán sau khi sửa, hộp phôi dựng sẵn và hash mẫu.

/** MP-01: trạng thái "không đọc được tệp". Không kèm bất kỳ số đo nào và KHÔNG có `AnalysisFile`. */
export interface ParseFailure {
  fileName: string;
  fileSize: string;
  reason: string;
  file: File;
}

// MP-07 (R2/Q2) + R4: `PrintabilityAnalysis` nay da khai bao `number | null` cho CA BA truong
// `printabilityScore`, `level` va `overhangPercentage` (`src/types/index.ts`) ⇒ khong con can type
// tam hay ep kieu nao o tang view. `null` = CHUA DO / CHUA CHAM DIEM, khac han `0`.

/** MP-07: `null`/`NaN` ⇒ "Chưa đo"; trước đây dòng này in một giá trị mặc định như thể đã đo. */
export function formatOverhangLabel(pct: number | null | undefined): string {
  return typeof pct === 'number' && Number.isFinite(pct) ? `${pct.toFixed(1)}% cần vật liệu đỡ` : 'Chưa đo';
}

/** MP-07: chỉ nhận số đo THẬT từ bộ đọc lưới; mọi trường hợp khác ⇒ `null`. */
export function measuredOverhang(parsed: { overhangPercentage?: number }): number | null {
  const pct = parsed.overhangPercentage;
  return typeof pct === 'number' && Number.isFinite(pct) ? pct : null;
}

/**
 * MP-11: băm THẬT byte của tệp khách tải lên. `crypto.subtle` chỉ tồn tại trong secure context
 * (https / localhost); khi không có (ví dụ preview qua IP LAN) trả `undefined` để giao diện in "—",
 * KHÔNG rơi về một hash mẫu.
 */
export async function computeSha256(file: File): Promise<string | undefined> {
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined;
  if (!subtle) return undefined;
  try {
    const digest = await subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

/** Nhãn dung lượng dùng chung cho panel lỗi (không làm tròn thành "0.0 MB"). */
export function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Q2 (MP-01 + MP-03): kiểm CẤU TRÚC tệp trước khi giao cho bộ đọc.
 *
 * Vì sao cần: `src/utils/meshParser.ts` (KHÔNG thuộc quyền sửa của Q2) bắt lỗi `STLLoader` rồi thay
 * bằng một hộp 85×32×60 dựng sẵn và trả về như một lưới hợp lệ — nên tệp rác vẫn hiện
 * "85.0 × 60.0 × 32.0 mm / 12 tam giác" trên /quote. Kiểm ở đây để tệp KHÔNG đọc được rơi vào panel
 * lỗi trung thực, không bao giờ thành một mô hình bịa.
 *
 * Chỉ từ chối khi tệp CHẮC CHẮN không thuộc định dạng đó. Tệp nhị phân hợp lệ luôn có
 * `(size - 84) % 50 === 0`, kể cả khi header ghi sai số tam giác — nên phép kiểm này không loại
 * nhầm tệp thật.
 */
export async function findFileStructureProblem(file: File, lowerName: string): Promise<string | null> {
  if (lowerName.endsWith('.stl')) {
    const headBytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const headText = new TextDecoder().decode(headBytes);

    if (/^\s*solid/i.test(headText) || /facet\s+normal/i.test(headText)) {
      if (!/facet\s+normal/i.test(headText) || !/vertex\s/i.test(headText)) {
        return 'Tệp .stl này không chứa cấu trúc tam giác (không có "facet normal" / "vertex").';
      }
      return null;
    }

    if (file.size < 84) {
      return 'Tệp .stl nhỏ hơn 84 byte tối thiểu của STL nhị phân và cũng không có cấu trúc STL ASCII.';
    }
    const triangles = new DataView(headBytes.buffer, headBytes.byteOffset, 84).getUint32(80, true);
    const fitsByLength = (file.size - 84) % 50 === 0;
    if (triangles === 0) {
      return 'Header STL nhị phân ghi 0 tam giác.';
    }
    if (!fitsByLength && file.size < 84 + triangles * 50) {
      return 'Kích thước tệp không khớp số tam giác ghi trong header STL nhị phân.';
    }
    return null;
  }

  if (lowerName.endsWith('.3mf')) {
    const sig = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    // 3MF là một gói ZIP ⇒ bắt đầu bằng "PK".
    if (sig[0] !== 0x50 || sig[1] !== 0x4b) {
      return 'Tệp .3mf không phải gói ZIP (3MF là gói ZIP chứa model XML).';
    }
    return null;
  }

  return null;
}
