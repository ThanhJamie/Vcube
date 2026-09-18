import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { AnalysisFile, CartItem, TransformState, MeasurementResult, MaterialProfile, PrinterProfile, PrintabilityAnalysis, InkiriCostFormulaConfig, SlicerPresetInfo } from '../types';
import { SAMPLE_ANALYSIS_FILES, PRINTER_PROFILES, MATERIALS_CATALOG } from '../data/mockData';
import { ModelViewer3D } from '../components/tool3d/ModelViewer3D';
import { CanvasErrorBoundary } from '../components/CanvasErrorBoundary';
import { StlVs3mfComparisonModal } from '../components/tool3d/StlVs3mfComparisonModal';
import { StlUnitConfirmModal } from '../components/tool3d/StlUnitConfirmModal';
import { ObjectTreePanel } from '../components/tool3d/ObjectTreePanel';
import { PresetPalettePanel } from '../components/tool3d/PresetPalettePanel';
import { TransformControlsPanel } from '../components/tool3d/TransformControlsPanel';
import { ValidationReportPanel } from '../components/tool3d/ValidationReportPanel';
import { QuoteSummaryPanel } from '../components/tool3d/QuoteSummaryPanel';
import { parse3DFile, autoRepairGeometry, analyzeMeshDefects } from '../../utils/meshParser';
import { Button, EmptyState, Icon, InfoTip, PanelErrorBoundary } from '@frontend/ui';
import { EMPTY_VALUE } from '../lib/format';

/* ── Q (#2): hậu quả của việc cột DB nay NULL thật (`mappers.ts` không còn điền số mặc định) ──
 * `materials.price_per_gram` / `printer_fleet.bed_dimensions` … có thể là `null` = CHƯA ĐO ĐƯỢC.
 * `.toLocaleString()` trên `null` làm TRẮNG MÀN HÌNH, nên mọi chỗ hiển thị/so sánh phải đi qua
 * hai hàm dưới đây. Thiếu số ⇒ `—`, KHÔNG bịa số và KHÔNG in chữ "null" ra UI. */
const measuredText = (v: number | null | undefined, suffix = ''): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toLocaleString('vi-VN')}${suffix}` : EMPTY_VALUE;

/** Khổ bàn in của máy — `null` = chưa đo được CẢ 3 cạnh ⇒ không so sánh, không hiển thị số. */
const bedOf = (p: PrinterProfile | undefined): { x: number; y: number; z: number } | null =>
  p && p.bedDimensions &&
  typeof p.bedDimensions.x === 'number' && Number.isFinite(p.bedDimensions.x) &&
  typeof p.bedDimensions.y === 'number' && Number.isFinite(p.bedDimensions.y) &&
  typeof p.bedDimensions.z === 'number' && Number.isFinite(p.bedDimensions.z)
    ? { x: p.bedDimensions.x, y: p.bedDimensions.y, z: p.bedDimensions.z }
    : null;

/** Khổ bàn in dạng chữ (mm); thiếu ⇒ `—`. */
const bedText = (p: PrinterProfile | undefined): string => {
  const bed = bedOf(p);
  return bed ? `${bed.x}×${bed.y}×${bed.z} mm` : EMPTY_VALUE;
};

/**
 * Thể tích khổ bàn ĐO ĐƯỢC (mm³). `null` = máy chưa khai khổ bàn ⇒ KHÔNG so sánh được.
 * Dùng để chọn "máy khổ lớn hơn" theo SỐ ĐO, thay cho việc hardcode id máy của nền tảng khác.
 */
const bedVolume = (p: PrinterProfile | undefined): number | null => {
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
function derivePrintabilityScore(measured: {
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

function derivePrintabilityLevel(score: number): 'good' | 'warning' | 'critical' {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

/**
 * R4: cong thuc diem dung BON phep do. Ham dem xem bao nhieu phep trong so do CO so that
 * (`0` la so do that; `null` moi la chua do duoc).
 */
function countMeasuredScoreInputs(file: AnalysisFile): number {
  return [file.isWatertight, file.nonManifoldEdges, file.invertedNormals, file.minWallThickness]
    .filter((v) => v !== null).length;
}

/** R4: nhan cac phep do CHUA co so — de noi ro diem duoc cham tu phan nao, bo qua muc nao. */
function describeUnmeasuredScoreInputs(file: AnalysisFile): string[] {
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
function formatOverhangLabel(pct: number | null | undefined): string {
  return typeof pct === 'number' && Number.isFinite(pct) ? `${pct.toFixed(1)}% cần Support` : 'Chưa đo';
}

/** MP-07: chỉ nhận số đo THẬT từ bộ đọc lưới; mọi trường hợp khác ⇒ `null`. */
function measuredOverhang(parsed: { overhangPercentage?: number }): number | null {
  const pct = parsed.overhangPercentage;
  return typeof pct === 'number' && Number.isFinite(pct) ? pct : null;
}

/**
 * MP-11: băm THẬT byte của tệp khách tải lên. `crypto.subtle` chỉ tồn tại trong secure context
 * (https / localhost); khi không có (ví dụ preview qua IP LAN) trả `undefined` để giao diện in "—",
 * KHÔNG rơi về một hash mẫu.
 */
async function computeSha256(file: File): Promise<string | undefined> {
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
function formatFileSize(bytes: number): string {
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
async function findFileStructureProblem(file: File, lowerName: string): Promise<string | null> {
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


/**
 * Q2 (MP-01): panel lỗi đọc tệp — thay hẳn `recoveryFile` + hộp phôi dựng sẵn +
 * toast "đã khởi tạo mô hình CAD phôi an toàn". Không mô hình, không số đo, không nút báo giá.
 */
const ParseFailurePanel: React.FC<{
  failure: ParseFailure;
  manualReviewNoteShown: boolean;
  onRetry: () => void;
  onPickAnother: (file: File) => void;
  onRequestManualReview: () => void;
}> = ({ failure, manualReviewNoteShown, onRetry, onPickAnother, onRequestManualReview }) => (
  <div
    role="alert"
    className="bg-warning-tint border border-warning/40 rounded-lg p-4 sm:p-5 space-y-3 font-sans"
  >
    <div className="flex items-start gap-2.5">
      <Icon name="warning" size={18} className="text-warning shrink-0 mt-0.5" />
      <div className="space-y-1 min-w-0">
        <h3 className="font-bold text-sm text-warning">Không phân tích được tệp</h3>
        <p className="text-xs text-fg break-words">
          Tệp: <strong>{failure.fileName}</strong> ({failure.fileSize})
        </p>
        <p className="text-xs text-fg-muted break-words">Lý do: {failure.reason}</p>
        <p className="text-xs text-fg-muted">
          Hệ thống KHÔNG tạo dữ liệu thay thế cho tệp này: không kích thước, không thể tích, không số
          tam giác và không báo giá nào được sinh ra từ một tệp không đọc được.
        </p>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onRetry}
        className="px-3.5 py-2 bg-surface hover:bg-primary-tint border border-line-control text-fg text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <Icon name="restart_alt" size={18} />
        Thử lại
      </button>

      <label className="px-3.5 py-2 bg-surface hover:bg-primary-tint border border-line-control text-fg text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center gap-1.5 cursor-pointer">
        <Icon name="upload_file" size={18} />
        <span>Chọn tệp khác</span>
        <input
          type="file"
          accept=".stl,.3mf,.step,.obj,.iges"
          className="hidden"
          onChange={(e) => {
            const next = e.target.files && e.target.files[0];
            e.target.value = '';
            if (next) onPickAnother(next);
          }}
        />
      </label>

      <button
        type="button"
        onClick={onRequestManualReview}
        className="px-4 py-2 bg-surface hover:bg-surface-muted text-fg border border-line-control text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-e1"
      >
        <Icon name="send" size={18} />
        Gửi yêu cầu thẩm định thủ công
      </button>
    </div>

    {manualReviewNoteShown && (
      <p className="text-xs text-fg-muted border-t border-warning/30 pt-3">
        Hệ thống chưa có kênh gửi hồ sơ tự động tới xưởng, nên KHÔNG có yêu cầu nào được gửi đi và
        cũng không có thông báo "đã gửi". Vui lòng dùng khung chat hỗ trợ ở góc màn hình, đính kèm{' '}
        <strong>{failure.fileName}</strong> để chuyển cho xưởng thẩm định.
      </p>
    )}
  </div>
);

interface Tool3DViewProps {
  materials?: MaterialProfile[];
  printers?: PrinterProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const Tool3DView: React.FC<Tool3DViewProps> = ({
  materials = MATERIALS_CATALOG,
  printers = PRINTER_PROFILES,
  pricingConfig,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // A11 GUARD: fixture mẫu đã bị rỗng hoá (`SAMPLE_ANALYSIS_FILES = []` — bỏ mock khỏi
  // production) nên `SAMPLE_ANALYSIS_FILES[0]` là `undefined` ⇒ TypeError ngay khi mount
  // `/quote`. KHÔNG bịa một tệp mẫu thay thế: chưa có tệp nào thì render trạng thái rỗng
  // "chưa có bản vẽ nào để phân tích" + CTA tải tệp (xem guard bên dưới).
  const [files, setFiles] = useState<AnalysisFile[]>(SAMPLE_ANALYSIS_FILES);
  const [selectedFile, setSelectedFile] = useState<AnalysisFile | null>(
    () => SAMPLE_ANALYSIS_FILES[0] ?? null
  );
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [activePlateIndex, setActivePlateIndex] = useState<number>(() => {
    const firstSample = SAMPLE_ANALYSIS_FILES[0];
    if (!firstSample) return 0;
    return firstSample.activePlateIndex || ((firstSample.plates?.length ?? 0) > 0 ? 1 : 0);
  });

  // Slicing parameters
  // Không có máy/vật liệu nào trong DB ⇒ để TRỐNG id, KHÔNG gán id bịa ('bambu-x1c'/'pla-tough')
  // để tránh báo giá từ dữ liệu không tồn tại (data-honesty).
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(printers[0]?.id || '');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id || '');
  const [infillDensity, setInfillDensity] = useState<number>(25);
  const [infillPattern, setInfillPattern] = useState<string>('Gyroid');
  const [layerHeight, setLayerHeight] = useState<string>('0.16');
  const [supportsMode, setSupportsMode] = useState<'auto' | 'tree' | 'none'>('tree');
  const [quantity, setQuantity] = useState<number>(1);

  // CAD 3D Viewport Controls State
  const [cameraMode, setCameraMode] = useState<'perspective' | 'orthographic'>('perspective');
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(false);
  const [showDefects, setShowDefects] = useState<boolean>(false);
  const [measurementActive, setMeasurementActive] = useState<boolean>(false);
  const [compareMode, setCompareMode] = useState<'normal' | 'before' | 'after'>('normal');

  // Transform state
  const [transform, setTransform] = useState<TransformState>({
    scaleUniform: 100,
    scaleX: 100,
    scaleY: 100,
    scaleZ: 100,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    unit: 'mm',
    layFlat: true,
    centered: true
  });

  // Modals state
  const [is3mfVsStlModalOpen, setIs3mfVsStlModalOpen] = useState<boolean>(false);
  const [isStlUnitModalOpen, setIsStlUnitModalOpen] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  // Q2 (MP-01): lỗi đọc tệp của khách — hiển thị trạng thái trung thực, không có tệp thay thế.
  const [parseFailure, setParseFailure] = useState<ParseFailure | null>(null);
  const [manualReviewNoteShown, setManualReviewNoteShown] = useState<boolean>(false);

  const handleUpdateTransform = (updated: Partial<TransformState>) => {
    setTransform(prev => ({ ...prev, ...updated }));
  };

  // F2 (P9): tệp có dữ liệu slicer ⇒ khởi tạo layer height / infill / pattern từ CHÍNH tệp,
  // không để mặc định cứng (25% / Gyroid / 0.16) áp đè lên cấu hình thật của khách.
  const applySlicerPresetDefaults = (preset?: SlicerPresetInfo) => {
    if (!preset) return;
    if (typeof preset.layerHeight === 'number' && Number.isFinite(preset.layerHeight) && preset.layerHeight > 0) {
      setLayerHeight(String(preset.layerHeight));
    }
    if (preset.infillPattern) {
      setInfillPattern(preset.infillPattern);
    }
    if (preset.infillDensity) {
      const pct = parseFloat(preset.infillDensity);
      if (Number.isFinite(pct) && pct > 0) setInfillDensity(Math.round(pct));
    }
  };

  // Workspace sub-tab for Left Column (Viewport + Object Tree vs Preset Palettes vs Transforms vs Validation)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'objects' | 'preset' | 'transforms' | 'validation'>('objects');

  // Selected printer & material profiles.
  // A11 GUARD: đội máy in / danh mục vật liệu có thể RỖNG (nguồn thật là bảng DB; fixture đã
  // rỗng hoá) ⇒ `[0]` là `undefined` và type cũ che mất điều đó. Khai báo thẳng `| undefined`.
  const currentPrinter: PrinterProfile | undefined =
    printers.length > 0 ? printers.find(p => p.id === selectedPrinterId) ?? printers[0] : undefined;
  const currentMaterial: MaterialProfile | undefined =
    materials.length > 0 ? materials.find(m => m.id === selectedMaterialId) ?? materials[0] : undefined;

  // Upload & parse actual File object directly in browser
  const handleActualFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    // Bọc toàn bộ trong try/finally: mọi nhánh — kể cả lỗi xảy ra TRƯỚC `try` bên trong
    // (ví dụ `findFileStructureProblem` reject) — đều phải trả `isAnalyzing` về false.
    // Trước đây `setIsAnalyzing(false)` chỉ nằm trong các nhánh sau `try`, nên một reject
    // sớm làm nút chọn tệp kẹt ở spinner vĩnh viễn.
    try {
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const is3mf = lowerName.endsWith('.3mf');
    const isObj = lowerName.endsWith('.obj');
    const isStep = lowerName.endsWith('.step') || lowerName.endsWith('.stp') || lowerName.endsWith('.iges');
    const format: 'STL' | '3MF' | 'STEP' | 'OBJ' = is3mf ? '3MF' : isObj ? 'OBJ' : isStep ? 'STEP' : 'STL';

    // Tệp mới ⇒ xoá trạng thái lỗi cũ trước khi đọc.
    setParseFailure(null);
    setManualReviewNoteShown(false);

    // Q2 (MP-01/MP-03): tệp không đúng cấu trúc ⇒ KHÔNG giao cho bộ đọc (bộ đọc sẽ thay bằng
    // một hộp dựng sẵn), dừng ngay ở panel lỗi trung thực.
    const structureProblem = await findFileStructureProblem(file, lowerName);
    if (structureProblem) {
      setIsAnalyzing(false);
      setParseFailure({
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        reason: structureProblem,
        file
      });
      onShowToast(`Không đọc được tệp "${file.name}" — hệ thống không tạo số liệu thay thế.`);
      return;
    }

    try {
      const parsed = await parse3DFile(file);
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      // P4: diem kha nang in suy tu so do that cua tep (khong dung hang so 94/76).
      // R4: `printabilityScore === null` = khong co phep do nao ⇒ muc do cung khong duoc suy ra.
      const printabilityScore = derivePrintabilityScore(parsed);
      const printabilityLevel = printabilityScore === null ? null : derivePrintabilityLevel(printabilityScore);
      // Q2 (MP-07): chỉ nhận giá trị ĐO ĐƯỢC; tệp không kèm số đo ⇒ `null` ⇒ giao diện "Chưa đo".
      const overhangPct = measuredOverhang(parsed);
      // Q2 (MP-11): băm thật byte của tệp khách tải lên (trước đây là một hex literal).
      const sha256Hash = await computeSha256(file);
      // Q2 (MP-07): không còn câu khẳng định "vùng góc nghiêng an toàn" khi chưa đo được góc nhô.
      const printabilityIssues: PrintabilityAnalysis['issues'] = overhangPct === null
        ? [
            {
              code: 'OVERHANG',
              severity: 'info',
              message: 'Tệp này không kèm số đo góc nhô nên hệ thống không kết luận gì về vùng nghiêng.'
            }
          ]
        : [
            {
              code: 'OVERHANG',
              severity: overhangPct > 45 ? 'medium' : 'low',
              message: `Đo từ lưới vừa đọc: ${overhangPct.toFixed(1)}% số tam giác nghiêng quá 45° so với bàn in.`
            }
          ];

      const newFile: AnalysisFile = {
        id: `ana-${Date.now()}`,
        fileName: file.name,
        fileSize: fileSizeMb,
        format: format,
        uploadDate: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        dimensions: parsed.dimensions,
        volume: parsed.volume,
        surfaceArea: parsed.surfaceArea,
        triangleCount: parsed.triangleCount,
        partsCount: parsed.parts.length,
        parts: parsed.parts,
        isWatertight: parsed.isWatertight,
        nonManifoldEdges: parsed.nonManifoldEdges,
        invertedNormals: parsed.invertedNormals,
        // R4 (MP-10): so BIEN HO (canh chi co 1 mat) la phep do rieng cua bo doc — truoc day
        // khong duoc map nen khong bao gio toi duoc UI.
        boundaryEdges: parsed.boundaryEdges,
        minWallThickness: parsed.minWallThickness,
        recommendedTech: is3mf ? 'FDM Multi-Material (Bambu AMS) / Dual Extruder' : 'FDM Engineering',
        requiresSupport: false,
        printability: {
          printabilityScore,
          level: printabilityLevel,
          issues: printabilityIssues,
          recommendedOrientation: 'Mặt đáy phẳng tiếp xúc bàn in Z=0',
          // A11: chưa cấu hình máy in ⇒ KHÔNG thể biết "vừa khổ bàn" hay không.
          // Type `PrintabilityAnalysis.bedFit` là `boolean` bắt buộc, nên biểu diễn thận trọng
          // bằng `false` (không khẳng định vừa khổ). A5 nên nới type thành `boolean | null` + render `—`.
          // Q (#2): `bedDimensions` nay có thể `null` ⇒ chỉ so khi ĐO ĐƯỢC khổ bàn, còn lại giữ
          // `false` (không khẳng định "vừa khổ") như quy ước A11 ở trên.
          bedFit: bedOf(currentPrinter)
            ? parsed.dimensions.x <= bedOf(currentPrinter)!.x && parsed.dimensions.y <= bedOf(currentPrinter)!.y
            : false,
          overhangPercentage: overhangPct
        },
        // Q2 (MP-16): bỏ nhãn tuyên bố "đã quét mesh" — chỉ nhánh STL chạy `analyzeMeshDefects`;
        // nhánh 3MF/OBJ chỉ đọc hình học nên không được nói là đã quét kiểm định.
        tag: is3mf ? '3MF Chuẩn // Multi-Material' : `${format} // Lưới đọc từ tệp của bạn`,
        status: 'Ready',
        modelType: 'custom',
        customGeometry: parsed.geometry || null,
        customObjectGroup: parsed.objectGroup || null,
        sha256Hash,
        isUnitConfirmed: is3mf ? true : false,
        slicerPreset: parsed.slicerPreset,
        plates: parsed.plates || (parsed.slicerPreset?.plates) || [],
        // F2 (P6): index bàn in THẬT từ tệp; không khai ⇒ `undefined` (KHÔNG cứng = 1).
        activePlateIndex: parsed.activePlateIndex
      };

      setFiles(prev => [newFile, ...prev]);
      setSelectedFile(newFile);
      setSelectedPartId(null);
      setActivePlateIndex(parsed.activePlateIndex ?? 0);

      // Default true 1:1 scale (100%) on import
      setTransform({
        scaleUniform: 100,
        scaleX: 100,
        scaleY: 100,
        scaleZ: 100,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        unit: 'mm',
        layFlat: true,
        centered: true
      });

      // F2 (P9): áp cấu hình cắt lớp thật của tệp (nếu có) trước khi người dùng chỉnh.
      applySlicerPresetDefaults(parsed.slicerPreset);

      if (is3mf && parsed.slicerPreset) {
        setActiveWorkspaceTab('preset');
      }
      setIsAnalyzing(false);

      // STL không lưu đơn vị đo trong header ⇒ hỏi khách xác nhận mm/inch trước khi báo giá.
      if (format === 'STL') setIsStlUnitModalOpen(true);

      onShowToast(`Đã nạp file 3D & Khởi tạo VCUBE Mesh Engine: ${file.name} (${parsed.triangleCount.toLocaleString()} tam giác)`);
    } catch (err) {
      // Q2 (MP-01): KHÔNG dựng "mô hình phôi an toàn" và KHÔNG bịa số đo cho tệp của khách.
      console.error('Không phân tích được tệp 3D (không tạo dữ liệu thay thế):', err);
      setIsAnalyzing(false);

      const reason = err instanceof Error && err.message
        ? err.message
        : 'Bộ đọc lưới Mesh không nhận diện được cấu trúc tệp.';

      // Không thêm tệp vào `files`, không đổi `selectedFile`, không kích thước / thể tích / tam giác
      // / hash / điểm khả năng in — chỉ ghi nhận sự thật để hiển thị panel lỗi.
      setParseFailure({
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        reason,
        file
      });
      onShowToast(`Không phân tích được tệp "${file.name}" — hệ thống không tạo số liệu thay thế.`);
    }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sync material from MaterialComparisonMatrix or CAD file dropped in Hero dropzone
  useEffect(() => {
    const matParam = searchParams.get('material') || (location.state as any)?.materialId;
    if (matParam) {
      const match = materials.find(
        (m) => m.id.toLowerCase() === matParam.toLowerCase() || m.name.toLowerCase().includes(matParam.toLowerCase())
      );
      if (match) {
        setSelectedMaterialId(match.id);
        onShowToast(`Đã áp dụng vật liệu chế tác: ${match.name}`);
      }
    }
    const uploaded = (location.state as any)?.uploadedFile;
    if (uploaded && uploaded instanceof File) {
      handleActualFileUpload(uploaded);
    }
  }, [searchParams, location.state]);


  /**
   * Input file ẩn của trạng thái rỗng. Dùng `useRef` + `<Button>` THAY cho `<label>` bọc input:
   * `<label>` là flex item của khối action nên bị bóp về đúng bề rộng padding (48px) và chữ
   * tràn ra ngoài hộp (đo được `width: 48px` trong khi nội dung 247px). Nút thật thì không bị.
   */
  const emptyStateFileRef = useRef<HTMLInputElement | null>(null);
  /** Input file ẩn của trạng thái ĐÃ nạp model (trước đây là `<label>` tự chế, dễ vỡ layout). */
  const workspaceFileRef = useRef<HTMLInputElement | null>(null);

  // ── A11: TRẠNG THÁI RỖNG THẬT CỦA /quote ────────────────────────────────────────────────
  // `SAMPLE_ANALYSIS_FILES` đã bị rỗng hoá và người dùng chưa tải tệp nào ⇒ không có mẫu nào
  // để dựng viewport / đo đạc / báo giá. Không bịa tệp mẫu, không hiện "đang tải" giả:
  // nêu NGUYÊN NHÂN + 1 HÀNH ĐỘNG (tải tệp). Kéo–thả vẫn chạy vì khung dropzone bọc EmptyState.
  if (!selectedFile) {
    return (
      <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="pb-6 border-b border-line">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary font-bold">
                Automated Slicer & Geometry QA // VCUBE Mesh Engine v2.6
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-fg tracking-tight">
              Xưởng Phân Tích & Báo Giá 3D Tức Thì
            </h1>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleActualFileUpload(e.dataTransfer.files[0]);
              }
            }}
            className={`rounded-lg border-2 border-dashed bg-surface shadow-e1 transition-all ${
              dragOver ? 'border-primary bg-primary-tint/30' : 'border-line'
            }`}
          >
            {isAnalyzing ? (
              <div className="py-10 space-y-3 font-mono text-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent animate-spin motion-reduce:animate-none mx-auto rounded-full" />
                <p className="text-xs uppercase tracking-widest text-primary font-bold">
                  Đang giải mã Mesh 3D, bóc tách cấu trúc tam giác và tính toán thể tích...
                </p>
                <span className="text-xs text-fg-subtle">WebGL Three.js geometry pipeline in progress</span>
              </div>
            ) : (
              <EmptyState
                size="sm"
                icon={<Icon name="cloud_upload" size={20} />}
                title="Chưa có bản vẽ nào để phân tích"
                description={
                  /* Dọn trạng thái rỗng: MỘT dòng chính + InfoTip cho phần giải thích dài
                     (yêu cầu chủ dự án: khung thấp hơn, không còn đoạn 3 dòng trên mặt tiền). */
                  <span className="flex flex-wrap items-center justify-center gap-1.5">
                    <span>Tải tệp CAD lên để đo kích thước, thể tích và báo giá.</span>
                    <InfoTip label="Tệp nào được phân tích tự động?">
                      Hệ thống không còn tệp mẫu sẵn và bạn chưa tải tệp CAD nào lên — tệp do bạn tải lên là nguồn
                      dữ liệu duy nhất để đo kích thước, thể tích và báo giá. Chỉ .stl / .3mf / .obj được phân tích
                      tự động; STEP/IGES cần bản tessellation hoặc báo giá thủ công.
                    </InfoTip>
                  </span>
                }
                action={
                  <>
                    <Button
                      variant="primary"
                      leadingIcon={<Icon name="cloud_upload" size={16} />}
                      onClick={() => emptyStateFileRef.current?.click()}
                    >
                      Tải tệp lưới 3D (.stl / .3mf / .obj)
                    </Button>
                    <input
                      ref={emptyStateFileRef}
                      type="file"
                      accept=".stl,.3mf,.step,.obj,.iges"
                      className="hidden"
                      onChange={(e) => {
                        const picked = e.target.files && e.target.files[0];
                        // Reset value để chọn LẠI cùng một tệp vẫn kích hoạt onChange.
                        e.target.value = '';
                        if (picked) handleActualFileUpload(picked);
                      }}
                    />
                  </>
                }
              />
            )}
          </div>

          {/* Q2 (MP-01): tệp lỗi ⇒ nói thẳng; không mô hình thay thế, không số đo, không giá. */}
          {parseFailure && (
            <ParseFailurePanel
              failure={parseFailure}
              manualReviewNoteShown={manualReviewNoteShown}
              onRetry={() => handleActualFileUpload(parseFailure.file)}
              onPickAnother={(next) => handleActualFileUpload(next)}
              onRequestManualReview={() => setManualReviewNoteShown(true)}
            />
          )}

          {(!currentPrinter || !currentMaterial) && (
            <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-tint p-3.5 text-xs text-warning font-sans">
              <Icon name="warning" size={16} className="text-warning shrink-0" />
              <p>
                {!currentPrinter ? 'Chưa có máy in nào trong hệ thống. ' : ''}
                {!currentMaterial ? 'Chưa có vật liệu nào trong hệ thống. ' : ''}
                Báo giá tự động chỉ tính khi có dữ liệu thật — quản trị viên thêm ở{' '}
                <strong>/admin → Cấu hình giá → Đội Máy In / Danh Mục Nhựa &amp; Resin</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /** A11: `selectedFile` là `AnalysisFile | null`; qua guard ở trên nó luôn khác `null`.
   *  Helper giữ nguyên ngữ nghĩa cập nhật theo hàm (`prev`) mà không cần ép kiểu. */
  const updateSelectedFile = (updater: (prev: AnalysisFile) => AnalysisFile) => {
    setSelectedFile(prev => (prev === null ? prev : updater(prev)));
  };

  // A11: `selectedFile` đã qua guard non-null ở trên.
  // Dynamically compute transformed dimensions and volume
  const scaleMultiplier = (transform.scaleUniform / 100) * (transform.unit === 'inch' ? 25.4 : 1.0);
  const transformedDimensions = {
    x: selectedFile.dimensions.x * scaleMultiplier,
    y: selectedFile.dimensions.y * scaleMultiplier,
    z: selectedFile.dimensions.z * scaleMultiplier
  };
  const transformedVolume = selectedFile.volume * Math.pow(scaleMultiplier, 3);

  // Check if model exceeds current printer build volume.
  // A11: chưa có máy in ⇒ không có khổ bàn để so ⇒ không bật banner "vượt khổ" (không đoán).
  // Q (#2): khổ bàn in nay có thể `null` ⇒ không so được thì KHÔNG bật banner "vượt khổ".
  const printerBed = bedOf(currentPrinter);
  const isOutOfBounds =
    !!printerBed &&
    (transformedDimensions.x > printerBed.x ||
      transformedDimensions.y > printerBed.y ||
      transformedDimensions.z > printerBed.z);

  // Đợt S (#2): nút "đổi sang máy khổ lớn hơn" KHÔNG còn hardcode ID MÁY của nền tảng mẫu
  // (id đó không tồn tại ở đây ⇒ luật cũ im lặng không chạy). Nay chọn theo SỐ ĐO: máy có khổ bàn
  // ĐO ĐƯỢC và thể tích lớn nhất, lớn hơn máy đang chọn. Không có máy nào đo được ⇒ `null`
  // ⇒ KHÔNG hiện nút (không bịa).
  const biggerPrinter: PrinterProfile | undefined = (() => {
    const currentVolume = bedVolume(currentPrinter);
    let best: PrinterProfile | undefined;
    let bestVolume = currentVolume ?? -1;
    for (const p of printers) {
      if (p.id === currentPrinter?.id) continue;
      const v = bedVolume(p);
      if (v !== null && v > bestVolume) {
        best = p;
        bestVolume = v;
      }
    }
    return best;
  })();

  // Handle part modifications
  const handleTogglePartVisibility = (partId: string) => {
    updateSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, visible: !p.visible } : p)
    }));
  };

  const handleChangePartColor = (partId: string, colorHex: string, colorName: string) => {
    updateSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, colorHex, color: colorName } : p)
    }));
    onShowToast(`Đã gán màu ${colorName} cho chi tiết.`);
  };

  const handleChangePartExtruder = (partId: string, extruderIdx: number) => {
    updateSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, extruderIndex: extruderIdx } : p)
    }));
    onShowToast(`Đã gán Đầu đùn Tool T${extruderIdx} cho chi tiết.`);
  };

  const handleChangePartMaterial = (partId: string, materialId: string) => {
    updateSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, materialId } : p)
    }));
    onShowToast('Đã cập nhật vật liệu gán riêng cho chi tiết.');
  };

  const handleSelectPlate = (plateIdx: number) => {
    setActivePlateIndex(plateIdx);
    updateSelectedFile(prev => ({
      ...prev,
      activePlateIndex: plateIdx
    }));
    const plate = selectedFile.plates?.find(p => p.index === plateIdx);
    onShowToast(plateIdx === 0 ? 'Đang hiển thị tất cả các bàn in.' : `Đã chuyển sang ${plate?.name || `Bàn in ${plateIdx}`}.`);
  };

  const handleChangePartPlate = (partId: string, plateIndex: number) => {
    updateSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, plateIndex } : p)
    }));
    onShowToast(`Đã chuyển chi tiết sang Bàn ${plateIndex}.`);
  };

  // D9 (Đợt 10): tính năng tách-khối nhiều shell đã bị BỎ HẲN (nút + prop + hai hàm bịa trong bộ đọc).
  // Không còn handler/toast nào ở đây — không hứa một tính năng không tồn tại.

  // Q2 (data-honesty MP-08): `meshParser.autoRepairGeometry` chỉ `clone()` + `computeVertexNormals()`
  // — KHÔNG hàn mép, KHÔNG đóng biên. Nên sau khi sửa phải ĐO LẠI rồi mới báo cáo. Trước đây hàm này
  // gán thẳng cờ kín + 0 cạnh hở + 1.6 mm + điểm 98 kèm toast "đã sửa xong toàn bộ lỗi".
  const handleAutoFixMesh = () => {
    const sourceGeometry = selectedFile.customGeometry as THREE.BufferGeometry | null | undefined;

    if (!sourceGeometry || !sourceGeometry.attributes || !sourceGeometry.attributes.position) {
      // Đường 3MF/OBJ chỉ giữ `objectGroup` ⇒ không có BufferGeometry để đo lại. Giữ nguyên số liệu
      // lần đọc trước và NÓI RÕ là chưa đo lại; không suy diễn, không tuyên bố "đã sửa xong".
      updateSelectedFile(prev => {
        const issues: PrintabilityAnalysis['issues'] = [
          {
            code: 'NON_MANIFOLD',
            severity: 'info',
            message: 'Chưa đo lại được lưới sau khi sửa: bộ đọc không giữ hình học tam giác trong bộ nhớ. Số liệu kiểm định phía trên vẫn là kết quả của lần đọc trước đó.'
          },
          ...prev.printability.issues
        ];
        return {
          ...prev,
          printability: { ...prev.printability, issues }
        };
      });
      setCompareMode('after');
      onShowToast('Chưa đo lại được lưới (không có hình học trong bộ nhớ) — không thay đổi số liệu kiểm định.');
      return;
    }

    const repaired = autoRepairGeometry(sourceGeometry);
    const measured = analyzeMeshDefects(repaired);
    const score = derivePrintabilityScore({
      isWatertight: measured.isWatertight,
      nonManifoldEdges: measured.nonManifoldCount,
      invertedNormals: measured.invertedNormalsCount,
      minWallThickness: measured.minWallThickness
    });
    const measuredPct = Number.isFinite(measured.overhangPercentage) ? measured.overhangPercentage : null;
    // R4: `null` (chua do lai duoc) KHONG duoc ket luan "van KHONG kin" — `!null === true` trong JS.
    const remeasured = measured.isWatertight !== null && measured.nonManifoldCount !== null;
    const stillOpen = remeasured ? (measured.nonManifoldCount > 0 || !measured.isWatertight) : null;

    updateSelectedFile(prev => {
      const issues: PrintabilityAnalysis['issues'] = [
        {
          code: 'NON_MANIFOLD',
          severity: stillOpen === null ? 'info' : stillOpen ? 'high' : 'low',
          // Chỉ nêu đúng thứ đo được: độ kín + số cạnh non-manifold. `invertedNormalsCount` của
          // `analyzeMeshDefects` thực chất đếm biên hở (MP-10) nên không được nhắc tới như số mặt.
          message: stillOpen === null
            ? 'Chưa đo lại được lưới sau khi sửa (bộ phân tích trả `null`) nên KHÔNG kết luận kín hay hở.'
            : stillOpen
            ? `Đo lại sau khi sửa: lưới vẫn KHÔNG kín (${measured.nonManifoldCount} cạnh non-manifold). Thao tác vừa chạy chỉ tính lại vector pháp tuyến, không hàn mép.`
            : 'Đo lại sau khi sửa: lưới kín, không còn cạnh non-manifold.'
        }
      ];
      const printability: PrintabilityAnalysis = {
        ...prev.printability,
        printabilityScore: score,
        level: score === null ? null : derivePrintabilityLevel(score),
        overhangPercentage: measuredPct,
        issues
      };
      return {
        ...prev,
        isWatertight: measured.isWatertight,
        nonManifoldEdges: measured.nonManifoldCount,
        invertedNormals: measured.invertedNormalsCount,
        minWallThickness: measured.minWallThickness,
        status: stillOpen === false ? 'Ready' : 'Needs Fix',
        customGeometry: repaired,
        printability
      };
    });

    setCompareMode('after');
    onShowToast(
      stillOpen === null
        ? 'Đã tính lại vector pháp tuyến. Chưa đo lại được lưới nên KHÔNG kết luận kín hay hở.'
        : stillOpen
        ? `Đã tính lại vector pháp tuyến. Đo lại lưới: vẫn KHÔNG kín (${measured.nonManifoldCount} cạnh non-manifold).`
        : 'Đã tính lại vector pháp tuyến. Đo lại lưới: kín, 0 cạnh non-manifold.'
    );
  };


  const handleSelectSample = (file: AnalysisFile) => {
    setSelectedFile(file);
    setSelectedPartId(null);
    // F2 (P9): mẫu có preset ⇒ cũng khởi tạo tham số cắt lớp từ preset thật.
    applySlicerPresetDefaults(file.slicerPreset);
    setActivePlateIndex(file.activePlateIndex ?? (file.plates && file.plates.length > 0 ? 1 : 0));
    setTransform({
      scaleUniform: 100,
      scaleX: 100,
      scaleY: 100,
      scaleZ: 100,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      unit: 'mm',
      layFlat: true,
      centered: true
    });
  };

  const handleDirectOrder = (item: CartItem) => {
    onAddToCart(item);
    onNavigate('checkout');
  };

  return (
    <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Top Title & Benchmark Callout */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs sm:text-xs uppercase tracking-[0.2em] text-primary font-bold">
                Automated Slicer & Geometry QA // VCUBE Mesh Engine v2.6
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-fg tracking-tight">
              Xưởng Phân Tích & Báo Giá 3D Tức Thì
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-1">
              Bộ công cụ CAD tương tác: Xoay/Zoom/Pan, cắt lớp Layer Slicer, báo cáo kiểm tra lưới, thước đo Caliper & báo giá tự động.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIs3mfVsStlModalOpen(true)}
              leadingIcon={<Icon name="compare_arrows" size={18} />}
            >
              So Sánh STL vs 3MF
            </Button>
          </div>
        </div>

        {/* Out of Bounds Warning Banner */}
        {isOutOfBounds && currentPrinter && (
          <div className="bg-danger-tint border-2 border-danger/50 p-4 sm:p-5 rounded-lg text-danger flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-e1 animate-pulse motion-reduce:animate-none font-mono">
            <div className="flex items-center gap-3">
              <Icon name="warning" size={28} className="text-danger shrink-0" />
              <div>
                <strong className="block text-sm font-bold">Cảnh Báo: Kích Thước Mô Hình Vượt Khổ Máy In!</strong>
                <p className="text-xs text-danger mt-0.5">
                  Mô hình ({transformedDimensions.x.toFixed(1)} × {transformedDimensions.y.toFixed(1)} × {transformedDimensions.z.toFixed(1)} mm) vượt quá kích thước bàn in của máy{' '}
                  <strong>{currentPrinter.name}</strong> ({bedText(currentPrinter)}).
                </p>
              </div>
            </div>
            {/* Đợt S (#2): nhãn suy từ khổ bàn THẬT của máy tìm được, không viết cứng "420mm".
                Không tìm được máy nào đo được khổ bàn ⇒ không hiện nút. */}
            {biggerPrinter && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setSelectedPrinterId(biggerPrinter.id)}
              >
                Đổi Sang {biggerPrinter.name} ({bedText(biggerPrinter)})
              </Button>
            )}
          </div>
        )}

        {/* Clean File Upload / Dropzone Header with Supported Formats Badges */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleActualFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className={`border-2 border-dashed p-6 sm:p-8 text-center transition-all bg-surface rounded-lg shadow-e1 ${
            dragOver ? 'border-primary bg-primary-tint/30' : 'border-line hover:border-primary'
          }`}
        >
          {isAnalyzing ? (
            <div className="py-6 space-y-3 font-mono">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent animate-spin motion-reduce:animate-none mx-auto rounded-full"></div>
              <p className="text-xs uppercase tracking-widest text-primary font-bold">
                Đang giải mã Mesh 3D, bóc tách cấu trúc tam giác và tính toán thể tích...
              </p>
              <span className="text-xs text-fg-subtle">WebGL Three.js geometry pipeline in progress</span>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-3.5">
              <div className="w-12 h-12 bg-canvas border border-line text-primary flex items-center justify-center mx-auto rounded-md shadow-e1">
                <Icon name="cloud_upload" size={28} />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-bold text-base sm:text-lg text-fg">
                  Kéo & thả tập tin CAD 3D vào khung phân tích
                </h3>
                <p className="text-xs text-fg-subtle">
                  Hệ thống đọc cấu trúc lưới tam giác của chính tệp bạn tải lên để đo kích thước, thể tích và tính toán báo giá.
                </p>
              </div>

              {/* R4: STEP/STP/IGES được giải mã qua WebAssembly CAD Kernel (occt-import-js) trong
                  Web Worker — `meshParser.parse3DFile` xử lý thật, miễn WASM tải được. */}
              <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs pt-0.5">
                <span className="text-xs text-fg-subtle uppercase font-semibold">Phân tích được:</span>
                {['STL', '3MF', 'OBJ', 'STEP', 'IGES'].map(fmt => (
                  <span
                    key={fmt}
                    className="px-2.5 py-1 rounded-md bg-primary-tint text-primary font-bold border border-primary/20 shadow-e0 text-xs"
                  >
                    {fmt}
                  </span>
                ))}
                <span className="text-xs text-fg-subtle pl-1">(Tối đa 150MB)</span>
              </div>

              <p className="text-xs text-fg-subtle">
                STEP / IGES được giải mã bằng nhân CAD WebAssembly (OpenCASCADE) ngay trên trình duyệt
                — tệp lớn có thể mất vài giây. Nếu kernel không tải được, hệ thống báo lỗi thật thay vì
                dựng số đo giả.
              </p>

              <div className="pt-1 font-mono">
                <Button
                  variant="primary"
                  leadingIcon={<Icon name="cloud_upload" size={16} />}
                  onClick={() => workspaceFileRef.current?.click()}
                >
                  Chọn File Từ Máy Tính
                </Button>
                <input
                  ref={workspaceFileRef}
                  type="file"
                  accept=".stl,.3mf,.step,.obj,.iges"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files && e.target.files[0];
                    // Reset value để chọn LẠI cùng một tệp vẫn kích hoạt onChange.
                    e.target.value = '';
                    if (picked) handleActualFileUpload(picked);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Q2 (MP-01): lỗi đọc tệp hiển thị ngay dưới khung tải lên; KHÔNG có tệp/mô hình thay thế. */}
        {parseFailure && (
          <ParseFailurePanel
            failure={parseFailure}
            manualReviewNoteShown={manualReviewNoteShown}
            onRetry={() => handleActualFileUpload(parseFailure.file)}
            onPickAnother={(next) => handleActualFileUpload(next)}
            onRequestManualReview={() => setManualReviewNoteShown(true)}
          />
        )}

        {/* Quick Sample File Switcher Bar.
            A11: `SAMPLE_ANALYSIS_FILES` (fixture mẫu) đã bị rỗng hoá ⇒ ẩn HẲN thanh này,
            không để lại một nhãn "Mẫu Thử Benchmark:" trống không có mẫu nào. */}
        {SAMPLE_ANALYSIS_FILES.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono">
          <span className="text-xs font-bold uppercase text-fg-subtle shrink-0">
            Mẫu Thử Benchmark:
          </span>
          {SAMPLE_ANALYSIS_FILES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedFile.id === sample.id
                  ? 'bg-primary text-primary-fg border-primary shadow-e1'
                  : 'bg-surface hover:bg-surface-muted border-line text-fg'
              }`}
            >
              <Icon name={sample.format === '3MF' ? 'layers' : 'view_in_ar'} size={18} />
              <span className="font-semibold">{sample.fileName}</span>
            </button>
          ))}
        </div>
        )}

        {/* A11: thiếu máy in / vật liệu ⇒ nói rõ vì sao bảng báo giá không tính được. */}
        {(!currentPrinter || !currentMaterial) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-tint p-3.5 text-xs text-warning font-sans">
            <Icon name="warning" size={16} className="text-warning shrink-0" />
            <p>
              {!currentPrinter ? 'Chưa có máy in nào trong hệ thống. ' : ''}
              {!currentMaterial ? 'Chưa có vật liệu nào trong hệ thống. ' : ''}
              Báo giá tự động chỉ tính khi có dữ liệu thật — quản trị viên thêm ở{' '}
              <strong>/admin → Cấu hình giá → Đội Máy In / Danh Mục Nhựa &amp; Resin</strong>.
            </p>
          </div>
        )}

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* Left Column: 3D Viewport + Slicing Parameters + Mesh Validation Report */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Viewport Card */}
            <div className="bg-surface p-4 sm:p-5 rounded-lg shadow-e1 space-y-3 font-sans">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-fg truncate max-w-[180px] sm:max-w-xs">
                    {selectedFile.fileName}
                  </span>
                  <span className={`px-2 py-0.5 text-xs uppercase tracking-wider font-mono font-bold rounded-md ${
                    selectedFile.format === '3MF' ? 'bg-primary text-primary-fg' : 'bg-line-subtle text-fg'
                  }`}>
                    {selectedFile.format} Standard
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary-tint text-primary text-xs font-mono font-bold border border-primary/20 shadow-e0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                    <span>VCUBE MESH ENGINE v2.6</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-fg-subtle text-xs">
                  <span>{selectedFile.fileSize}</span>
                  <span>•</span>
                  <span>{selectedFile.triangleCount.toLocaleString()} Triangles</span>
                </div>
              </div>

              {/* 3D Viewport Component Protected by CanvasErrorBoundary */}
              <CanvasErrorBoundary className="w-full">
                <ModelViewer3D
                  fileName={selectedFile.fileName}
                  modelType={selectedFile.modelType}
                  parts={selectedFile.parts}
                  transform={transform}
                  bedDimensions={currentPrinter?.bedDimensions ?? undefined}
                  customGeometry={selectedFile.customGeometry}
                  customObjectGroup={selectedFile.customObjectGroup}
                  selectedPartId={selectedPartId}
                  onSelectPart={(pId) => setSelectedPartId(pId)}
                  onDropFile={handleActualFileUpload}
                  cameraMode={cameraMode}
                  onCameraModeChange={setCameraMode}
                  showBoundingBox={showBoundingBox}
                  onToggleBoundingBox={() => setShowBoundingBox(!showBoundingBox)}
                  showDefects={showDefects}
                  onToggleDefects={() => setShowDefects(!showDefects)}
                  measurementActive={measurementActive}
                  onToggleMeasurement={() => setMeasurementActive(!measurementActive)}
                  onMeasurementChange={(res: MeasurementResult | null) => {
                    if (res) {
                      onShowToast(`Khoảng cách đo: ${res.distanceMm} mm`);
                    }
                  }}
                  compareMode={compareMode}
                  onUpdateTransform={handleUpdateTransform}
                  plates={selectedFile.plates || selectedFile.slicerPreset?.plates || []}
                  activePlateIndex={activePlateIndex}
                  onSelectPlate={handleSelectPlate}
                  className="h-[400px] sm:h-[480px] w-full"
                />
              </CanvasErrorBoundary>

              {/* Quick Dimension Bar under Viewport */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-canvas p-2.5 rounded-lg border border-line font-mono">
                <div>
                  <span className="text-xs text-fg-subtle uppercase block font-semibold">Kích thước X/Y/Z</span>
                  <span className="font-bold text-fg">
                    {transformedDimensions.x.toFixed(1)} × {transformedDimensions.y.toFixed(1)} × {transformedDimensions.z.toFixed(1)} {transform.unit}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-fg-subtle uppercase block font-semibold">Thể tích Net</span>
                  <span className="font-bold text-fg">
                    {transformedVolume.toFixed(1)} cm³
                  </span>
                </div>
                <div>
                  <span className="text-xs text-fg-subtle uppercase block font-semibold">Số Chi Tiết</span>
                  <span className="font-bold text-primary">
                    {selectedFile.parts.length} chi tiết
                  </span>
                </div>
              </div>
            </div>

            {/* Slicing Parameters Card */}
            <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-e1 space-y-4 font-sans">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="tune" size={20} className="text-primary" />
                  <h3 className="font-bold text-sm sm:text-base text-fg uppercase tracking-wider font-mono">
                    Thông Số Cắt Lớp // Slicing Parameters
                  </h3>
                </div>
                <span className="text-xs font-mono text-primary bg-primary-tint px-2.5 py-0.5 rounded-md border border-primary/20 font-bold">
                  Bambu Lab / Kobra Engine
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Printer Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold flex items-center justify-between">
                    <span>Máy In Gia Công</span>
                    <span className="text-primary">
                      {currentPrinter ? bedText(currentPrinter) : 'Chưa có máy in'}
                    </span>
                  </label>
                  <select
                    value={selectedPrinterId}
                    onChange={(e) => setSelectedPrinterId(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2.5 text-xs text-fg rounded-lg font-mono focus:outline-none focus:border-primary"
                  >
                    {printers.length === 0 && (
                      <option value="">— Chưa có máy in trong hệ thống —</option>
                    )}
                    {printers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.technology})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Material Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold flex items-center justify-between">
                    <span>Vật Liệu Kỹ Thuật</span>
                    <span className="text-primary">
                      {currentMaterial ? measuredText(currentMaterial.pricePerGram, ' đ/g') : 'Chưa có vật liệu'}
                    </span>
                  </label>
                  <select
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2.5 text-xs text-fg rounded-lg font-mono focus:outline-none focus:border-primary"
                  >
                    {materials.length === 0 && (
                      <option value="">— Chưa có vật liệu trong hệ thống —</option>
                    )}
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({measuredText(m.pricePerGram, ' đ/g')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Infill Density & Pattern */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold">
                    Độ Đặc Ruột (Infill Density): <span className="font-mono text-primary font-bold">{infillDensity}% {infillPattern}</span>
                  </label>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    {['Gyroid', 'Grid', 'Honeycomb'].map((pat) => (
                      <button
                        key={pat}
                        type="button"
                        onClick={() => setInfillPattern(pat)}
                        className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer font-bold ${
                          infillPattern === pat
                            ? 'bg-primary text-primary-fg border-primary shadow-e1'
                            : 'bg-canvas text-fg-muted border-line hover:bg-surface-muted'
                        }`}
                      >
                        {pat}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={infillDensity}
                  onChange={(e) => setInfillDensity(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-2 bg-line-subtle rounded-full"
                />
              </div>

              {/* Layer Height & Supports Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold block">
                    Độ Dày Lớp In (Layer Height)
                  </label>
                  <select
                    value={layerHeight}
                    onChange={(e) => setLayerHeight(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2.5 text-xs text-fg rounded-lg font-mono focus:outline-none focus:border-primary"
                  >
                    {/* F2 (P9): nếu tệp khai layer height ngoài 4 mức sẵn có, hiện đúng giá trị đó
                        thay vì để select trống/kẹt ở lựa chọn không khớp. */}
                    {layerHeight && !['0.08', '0.12', '0.16', '0.20'].includes(layerHeight) && (
                      <option value={layerHeight}>{layerHeight} mm (theo tệp)</option>
                    )}
                    <option value="0.08">0.08 mm (Ultra Fine - Chi tiết sắc nét)</option>
                    <option value="0.12">0.12 mm (Fine Detail - Chuẩn chất lượng)</option>
                    <option value="0.16">0.16 mm (Standard Pro - Cân bằng tốc độ/đẹp)</option>
                    <option value="0.20">0.20 mm (Draft Fast - In nhanh mẫu thử)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-fg-subtle font-bold block">
                    Cấu Hình Chân Đỡ (Supports Mode)
                  </label>
                  <select
                    value={supportsMode}
                    onChange={(e) => setSupportsMode(e.target.value as any)}
                    className="w-full bg-canvas border border-line-control p-2.5 text-xs text-fg rounded-lg font-mono focus:outline-none focus:border-primary"
                  >
                    <option value="tree">Tree Support (Dễ bóc - Ít vết sẹo bề mặt)</option>
                    <option value="auto">Auto Grid Standard (Chắc chắn cho hình học lớn)</option>
                    <option value="none">Không dùng Support (Chỉ in cầu dầm ngang)</option>
                  </select>
                </div>
              </div>

              {/* Batch Quantity Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
                <div className="text-xs font-mono">
                  <span className="font-bold text-fg block">Số lượng sản xuất (Batch):</span>
                  <span className="text-xs text-fg-subtle">Giảm giá lũy tiến tự động theo số lượng</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  {[1, 2, 5, 10, 20].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                        quantity === qty
                          ? 'bg-primary text-primary-fg border-primary shadow-e1'
                          : 'bg-canvas text-fg-muted border-line hover:bg-surface-muted'
                      }`}
                    >
                      x{qty}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mesh Validation Report Panel */}
            <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-e1 space-y-5 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon name="fact_check" size={20} className="text-primary" />
                    <h3 className="font-bold text-sm sm:text-base text-fg uppercase tracking-wider font-mono">
                      Báo Cáo Kiểm Định Lưới Mesh & Khả Năng In
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-fg-subtle block mt-0.5">
                    Kiểm tra hình học FDM // Tự động phát hiện lỗi khép kín
                  </span>
                </div>

                {/* Score Badge */}
                {/* R4: `null` cho MOI phep do hinh hoc (luoi vuot tran phan tich) ⇒ khong co gi de
                    cham diem. Cong bo "x/100 Score" khi do la ket luan bia ⇒ trang thai thu ba. */}
                <div className="flex items-center gap-2 font-mono">
                  {typeof selectedFile.printability.printabilityScore === 'number' ? (
                    <div
                      title={
                        describeUnmeasuredScoreInputs(selectedFile).length > 0
                          ? `Bỏ qua (chưa đo được): ${describeUnmeasuredScoreInputs(selectedFile).join(', ')}`
                          : undefined
                      }
                      className={`px-3 py-1.5 rounded-lg border text-center ${
                        selectedFile.printability.printabilityScore >= 90
                          ? 'bg-positive-tint border-positive/30 text-positive'
                          : selectedFile.printability.printabilityScore >= 70
                          ? 'bg-warning-tint border-warning/30 text-warning'
                          : 'bg-danger-tint border-danger/30 text-danger'
                      }`}
                    >
                      <span className="text-xs font-bold block">{selectedFile.printability.printabilityScore}/100 Score</span>
                      <span className="text-xs uppercase tracking-wider block font-semibold">
                        {countMeasuredScoreInputs(selectedFile) < 4
                          ? `Chấm từ ${countMeasuredScoreInputs(selectedFile)}/4 số đo`
                          // R4: `level` cung co the `null` ⇒ KHONG duoc roi vao nhan "Rui Ro" (ket luan khong co so do).
                          : selectedFile.printability.level === null
                          ? '—'
                          : selectedFile.printability.level === 'good' ? 'Rất Khả Thi' : selectedFile.printability.level === 'warning' ? 'Cần Chú Ý' : 'Rủi Ro'}
                      </span>
                    </div>
                  ) : (
                    <div
                      title={`Thiếu số đo: ${describeUnmeasuredScoreInputs(selectedFile).join(', ')}`}
                      className="px-3 py-1.5 rounded-lg border text-center bg-surface-muted border-line text-fg-muted"
                    >
                      <span className="text-xs font-bold block">—/100 Score</span>
                      <span className="text-xs uppercase tracking-wider block font-semibold">Chưa chấm điểm</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3 Core Geometry Checks: Watertight, Wall Thickness, Overhang Angle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                {/* 1. Watertight Check */}
                {/* R4: `isWatertight` co BA trang thai — `true` (do duoc: kin), `false` (do duoc:
                    khong kin), `null` (CHUA phan tich: luoi vuot tran, bo doc khong chay ban do canh).
                    `null` KHONG duoc hien "Khong kin": do la ket luan tu du lieu khong ton tai. */}
                <div className={`p-3.5 rounded-lg border ${
                  selectedFile.isWatertight === true
                    ? 'bg-positive-tint/70 border-positive/30 text-positive'
                    : selectedFile.isWatertight === false
                    ? 'bg-warning-tint/70 border-warning/30 text-warning'
                    : 'bg-surface-muted border-line text-fg-muted'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {/* Q2: icon/màu phải bám số đo — trước đây icon luôn mang `text-positive` kể cả khi
                        lưới KHÔNG kín (cùng lỗi với ValidationReportPanel). */}
                    <Icon
                      name={
                        selectedFile.isWatertight === true ? 'verified'
                          : selectedFile.isWatertight === false ? 'warning'
                          : 'help'
                      }
                      size={16}
                      className={
                        selectedFile.isWatertight === true ? 'text-positive'
                          : selectedFile.isWatertight === false ? 'text-warning'
                          : 'text-fg-subtle'
                      }
                    />
                    <span className="text-xs uppercase">Watertight Check</span>
                  </div>
                  <div className="text-xs font-bold">
                    {selectedFile.isWatertight === true
                      ? 'Kín (watertight)'
                      : selectedFile.isWatertight === false
                      ? 'Không kín (non-manifold mesh)'
                      : 'Chưa phân tích'}
                  </div>
                  <span className="text-xs text-fg-subtle block mt-0.5">
                    {/* Q2 (MP-10) + R4: `nonManifoldEdges` / `boundaryEdges` la hai SO DO RIENG.
                        `null` = chua do duoc ⇒ chi noi "chua do", khong suy ra "kin"/"ho". */}
                    {selectedFile.nonManifoldEdges === null
                      ? 'Chưa đo được số cạnh non-manifold'
                      : selectedFile.nonManifoldEdges > 0
                      ? `${selectedFile.nonManifoldEdges} cạnh non-manifold`
                      : typeof selectedFile.boundaryEdges === 'number' && selectedFile.boundaryEdges > 0
                      ? `${selectedFile.boundaryEdges} biên hở (cạnh chỉ có 1 mặt)`
                      : selectedFile.isWatertight === true
                      ? 'Không phát hiện biên hở'
                      : selectedFile.isWatertight === false
                      ? 'Còn biên hở — chưa đo được số biên hở'
                      : 'Chưa đo được độ kín'}
                  </span>
                </div>

                {/* 2. Wall Thickness Check */}
                {/* R4: `minWallThickness` co BA trang thai. `null` (chua do duoc) truoc day in ra
                    "Min: null mm" va gan nhan "Canh bao qua mong" — mot ket luan khong co so do. */}
                <div className={`p-3.5 rounded-lg border ${
                  typeof selectedFile.minWallThickness !== 'number'
                    ? 'bg-surface-muted border-line text-fg-muted'
                    : selectedFile.minWallThickness >= 0.8
                    ? 'bg-positive-tint/70 border-positive/30 text-positive'
                    : 'bg-danger-tint/70 border-danger/30 text-danger'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Icon
                      name="straighten"
                      size={16}
                      className={typeof selectedFile.minWallThickness === 'number' ? 'text-primary' : 'text-fg-subtle'}
                    />
                    <span className="text-xs uppercase">Wall Thickness</span>
                  </div>
                  <div className="text-xs font-bold">
                    {typeof selectedFile.minWallThickness === 'number'
                      ? `Min: ${selectedFile.minWallThickness.toFixed(2)} mm`
                      : 'Min: —'}
                  </div>
                  <span className="text-xs text-fg-subtle block mt-0.5">
                    {typeof selectedFile.minWallThickness !== 'number'
                      ? 'Chưa đo được'
                      : selectedFile.minWallThickness >= 0.8
                      ? 'Đạt ngưỡng tối thiểu (≥ 0.8mm)'
                      : 'Cảnh báo quá mỏng'}
                  </span>
                </div>

                {/* 3. Overhang Angle Check */}
                {/* Q2 (MP-07): chưa đo được ⇒ tile trung tính + "Chưa đo", không có số mặc định. */}
                <div className={`p-3.5 rounded-lg border ${
                  typeof selectedFile.printability.overhangPercentage === 'number'
                    ? 'bg-primary-tint/70 border-primary/30 text-primary'
                    : 'bg-surface-muted border-line text-fg-muted'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Icon name="explore" size={16} />
                    <span className="text-xs uppercase">Overhang Angle</span>
                  </div>
                  <div className="text-xs font-bold">
                    {formatOverhangLabel(selectedFile.printability.overhangPercentage)}
                  </div>
                  <span className="text-xs text-fg-subtle block mt-0.5">
                    Góc nghiêng an toàn ≤ 45°
                  </span>
                </div>
              </div>

              {/* Auto-Repair & Comparison Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-canvas border border-line rounded-lg text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFixMesh}
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg rounded-md font-bold uppercase text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-e1"
                  >
                    <Icon name="auto_fix_high" size={18} />
                    Tự Động Sửa Lưới Mesh
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDefects(!showDefects)}
                    className={`px-3 py-1.5 rounded-md border font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                      showDefects
                        ? 'bg-warning text-primary-fg border-warning'
                        : 'bg-surface text-fg-muted border-line hover:bg-surface-muted'
                    }`}
                  >
                    <Icon name="wb_incandescent" size={18} />
                    {showDefects ? 'Tắt Vùng Lỗi' : 'Hiện Vùng Lỗi'}
                  </button>
                </div>

                {/* Compare Mode */}
                <div className="flex items-center gap-1 bg-surface p-1 rounded-lg text-xs">
                  <span className="text-fg-subtle px-1 text-xs">So Sánh:</span>
                  <button
                    type="button"
                    onClick={() => setCompareMode('normal')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                      compareMode === 'normal' ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    Chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('before')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                      compareMode === 'before' ? 'bg-danger text-primary-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    Trước Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('after')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                      compareMode === 'after' ? 'bg-positive text-primary-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    Sau Sửa
                  </button>
                </div>
              </div>

              {/* Sub-panels Navigation Tabs */}
              <div className="space-y-3 pt-2 font-mono">
                <div className="flex flex-wrap items-center gap-2 border-b border-line pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('objects')}
                    className={`pb-2 px-3 uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer ${
                      activeWorkspaceTab === 'objects'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-fg-subtle hover:text-fg'
                    }`}
                  >
                    1. Cấu Trúc Part ({selectedFile.parts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('preset')}
                    className={`pb-2 px-3 uppercase tracking-wider font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                      activeWorkspaceTab === 'preset'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-fg-subtle hover:text-fg'
                    }`}
                  >
                    2. Bảng Màu 3MF
                    <span className="px-1.5 py-0.2 text-xs font-bold rounded-sm bg-primary/15 text-primary">
                      {selectedFile.slicerPreset?.palettes?.length || selectedFile.parts.length} màu
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('transforms')}
                    className={`pb-2 px-3 uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer ${
                      activeWorkspaceTab === 'transforms'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-fg-subtle hover:text-fg'
                    }`}
                  >
                    3. Tỷ Lệ & Tọa Độ
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('validation')}
                    className={`pb-2 px-3 uppercase tracking-wider font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                      activeWorkspaceTab === 'validation'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-fg-subtle hover:text-fg'
                    }`}
                  >
                    4. Chi Tiết QA
                  </button>
                </div>

                {/* Sub-panel Content */}
                {activeWorkspaceTab === 'objects' && (
                  <ObjectTreePanel
                    parts={selectedFile.parts}
                    format={selectedFile.format}
                    slicerPreset={selectedFile.slicerPreset}
                    selectedPartId={selectedPartId}
                    onSelectPart={(pId) => setSelectedPartId(pId)}
                    onToggleVisibility={handleTogglePartVisibility}
                    onChangeColor={handleChangePartColor}
                    onChangeExtruder={handleChangePartExtruder}
                    onChangeMaterial={handleChangePartMaterial}
                    materials={materials}
                    plates={selectedFile.plates || selectedFile.slicerPreset?.plates || []}
                    activePlateIndex={activePlateIndex}
                    onSelectPlate={handleSelectPlate}
                    onChangePartPlate={handleChangePartPlate}
                  />
                )}

                {activeWorkspaceTab === 'preset' && (
                  <PresetPalettePanel
                    slicerPreset={selectedFile.slicerPreset}
                    parts={selectedFile.parts}
                    selectedPartId={selectedPartId}
                    onChangeColor={handleChangePartColor}
                    format={selectedFile.format}
                  />
                )}

                {activeWorkspaceTab === 'transforms' && (
                  <TransformControlsPanel
                    transform={transform}
                    onUpdateTransform={(up) => setTransform(prev => ({ ...prev, ...up }))}
                    onResetTransform={() => setTransform({
                      scaleUniform: 100,
                      scaleX: 100,
                      scaleY: 100,
                      scaleZ: 100,
                      rotationX: 0,
                      rotationY: 0,
                      rotationZ: 0,
                      positionX: 0,
                      positionY: 0,
                      positionZ: 0,
                      unit: 'mm',
                      layFlat: true,
                      centered: true
                    })}
                    onLayFlat={() => {
                      setTransform(prev => ({ ...prev, rotationX: 0, rotationZ: 0 }));
                      onShowToast('Đã đặt mặt đáy tiếp xúc phẳng sát bàn in (Z=0).');
                    }}
                    onCenterModel={() => {
                      setTransform(prev => ({ ...prev, positionX: 0, positionZ: 0 }));
                      onShowToast('Đã căn tâm hình học mô hình vào chính giữa bàn in.');
                    }}
                  />
                )}

                {activeWorkspaceTab === 'validation' && (
                  <ValidationReportPanel
                    file={selectedFile}
                    transformedDimensions={transformedDimensions}
                    transformedVolume={transformedVolume}
                    showDefects={showDefects}
                    onToggleDefects={() => setShowDefects(!showDefects)}
                    compareMode={compareMode}
                    onSetCompareMode={setCompareMode}
                    onAutoFixMesh={handleAutoFixMesh}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Slicer Parameters & Instant Quoting Panel */}
          <div className="lg:col-span-5 space-y-6">
            {/* Lưới an toàn cấp panel: một throw khi tính/format giá KHÔNG được thay cả trang
                (sẽ làm mất luôn nút chọn tệp). `resetKey` = tệp đang chọn ⇒ nạp tệp khác tự reset. */}
            <PanelErrorBoundary label="Bảng báo giá" resetKey={selectedFile.id}>
              <QuoteSummaryPanel
                file={selectedFile}
                transformedVolume={transformedVolume}
                selectedPrinterId={selectedPrinterId}
                selectedMaterialId={selectedMaterialId}
                infillDensity={infillDensity}
                infillPattern={infillPattern}
                layerHeight={layerHeight}
                supportsMode={supportsMode}
                quantity={quantity}
                materials={materials}
                printers={printers}
                pricingConfig={pricingConfig}
                onPrinterChange={setSelectedPrinterId}
                onMaterialChange={setSelectedMaterialId}
                onInfillChange={setInfillDensity}
                onInfillPatternChange={setInfillPattern}
                onLayerHeightChange={setLayerHeight}
                onSupportsModeChange={setSupportsMode}
                onQuantityChange={setQuantity}
                onAddToCart={(item) => {
                  onAddToCart(item);
                  onShowToast(`Đã thêm ${selectedFile.fileName} (x${quantity}) vào giỏ hàng!`);
                }}
                onDirectOrder={handleDirectOrder}
                onShowToast={onShowToast}
              />
            </PanelErrorBoundary>
          </div>
        </div>

        {/* Uploaded History Files Table */}
        <div className="bg-surface p-5 sm:p-7 rounded-lg shadow-e1 space-y-4 font-sans">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-bold text-base text-fg flex items-center gap-2 font-mono">
              <Icon name="folder_open" size={18} className="text-primary" />
              Lịch Sử Bản Vẽ Tải Lên & Quét Mesh ({files.length} files)
            </h3>
            <span className="text-xs text-fg-subtle font-mono">S3 Direct Upload Cache</span>
          </div>

          <div className="responsive-table-wrapper">
            <table className="text-left text-xs font-sans w-full">
              <thead className="border-b border-line text-fg-subtle text-xs uppercase font-mono tracking-widest bg-canvas">
                <tr>
                  <th className="p-3">Tên Tập Tin</th>
                  <th className="p-3">Định Dạng</th>
                  <th className="p-3">Kích Thước</th>
                  <th className="p-3">Tam Giác / Parts</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className={`hover:bg-canvas transition-colors ${
                      selectedFile.id === file.id ? 'bg-primary-tint/40 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3 text-fg flex items-center gap-2">
                      <Icon name={file.format === '3MF' ? 'layers' : 'description'} size={16} className="text-primary" />
                      <span className="truncate max-w-[200px]">{file.fileName}</span>
                    </td>
                    <td className="p-3 font-mono">
                      <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-md ${
                        file.format === '3MF' ? 'bg-primary text-primary-fg' : 'bg-line-subtle text-fg'
                      }`}>
                        {file.format}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-fg-muted">
                      {file.dimensions.x} × {file.dimensions.y} × {file.dimensions.z} mm
                    </td>
                    <td className="p-3 font-mono text-fg-muted">
                      {file.triangleCount.toLocaleString()} ▲ ({file.partsCount} part{file.partsCount > 1 ? 's' : ''})
                    </td>
                    <td className="p-3 font-mono">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${
                        typeof file.printability.printabilityScore !== 'number'
                          ? 'bg-surface-muted border-line text-fg-muted'
                          : file.printability.printabilityScore >= 90
                          ? 'bg-positive-tint border-positive/30 text-positive'
                          : 'bg-warning-tint border-warning/30 text-warning'
                      }`}>
                        {typeof file.printability.printabilityScore === 'number'
                          ? `${file.printability.printabilityScore}/100 Score`
                          : '—/100'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">
                      <button
                        onClick={() => handleSelectSample(file)}
                        className={`px-3 py-1 text-xs uppercase tracking-wider rounded-md border transition-all cursor-pointer font-bold ${
                          selectedFile.id === file.id
                            ? 'bg-primary text-primary-fg border-primary shadow-e1'
                            : 'bg-surface hover:bg-surface-muted hover:text-primary border-line text-fg'
                        }`}
                      >
                        {selectedFile.id === file.id ? 'Đang Xem' : 'Phân Tích'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* STL vs 3MF Technical Comparison Modal */}
      <StlVs3mfComparisonModal
        isOpen={is3mfVsStlModalOpen}
        onClose={() => setIs3mfVsStlModalOpen(false)}
      />

      {/* STL Unit Confirmation Modal */}
      <StlUnitConfirmModal
        isOpen={isStlUnitModalOpen}
        fileName={selectedFile.fileName}
        dimensionsMm={selectedFile.dimensions}
        onConfirmMm={() => {
          setIsStlUnitModalOpen(false);
          setTransform(prev => ({ ...prev, unit: 'mm' }));
          onShowToast('Đã xác nhận đơn vị đo Millimet (mm).');
        }}
        onConvertToInch={() => {
          setIsStlUnitModalOpen(false);
          setTransform(prev => ({ ...prev, unit: 'inch', scaleUniform: 100 }));
          onShowToast('Đã chuyển đổi hệ số kích thước sang Inch (x25.4).');
        }}
        onCancel={() => setIsStlUnitModalOpen(false)}
      />
    </div>
  );
};

export default Tool3DView;
