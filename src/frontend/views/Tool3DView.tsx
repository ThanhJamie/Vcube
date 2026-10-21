import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { AnalysisFile, CartItem, TransformState, MeasurementResult, MaterialProfile, PrinterProfile, PrintabilityAnalysis, InkiriCostFormulaConfig, SlicerPresetInfo } from '@/types';
import { SAMPLE_ANALYSIS_FILES, PRINTER_PROFILES, MATERIALS_CATALOG } from '@/data/mockData';
import { ModelViewer3D } from '../components/tool3d/ModelViewer3D';
import { CanvasErrorBoundary } from '../components/CanvasErrorBoundary';
import { StlVs3mfComparisonModal } from '../components/tool3d/StlVs3mfComparisonModal';
import { StlUnitConfirmModal } from '../components/tool3d/StlUnitConfirmModal';
import { ObjectTreePanel } from '../components/tool3d/ObjectTreePanel';
import { PresetPalettePanel } from '../components/tool3d/PresetPalettePanel';
import { QuoteSummaryPanel } from '../components/tool3d/QuoteSummaryPanel';
import { parse3DFile, autoRepairGeometry, analyzeMeshDefects } from '../../utils/meshParser';
import { Button, Icon, PanelErrorBoundary } from '@frontend/ui';
import { formatNumber } from '../lib/format';
import {
  bedOf,
  bedText,
  bedVolume,
  computeSha256,
  countMeasuredScoreInputs,
  derivePrintabilityLevel,
  derivePrintabilityScore,
  describeUnmeasuredScoreInputs,
  findFileStructureProblem,
  formatFileSize,
  formatOverhangLabel,
  measuredOverhang,
  measuredText,
  type ParseFailure
} from '../components/tool3d/tool3dAnalysis';
import { ParseFailurePanel } from '../components/tool3d/ParseFailurePanel';
import { Tool3DEmptyState } from '../components/tool3d/Tool3DEmptyState';
import { Tool3DUploadStrip } from '../components/tool3d/Tool3DUploadStrip';
import { Tool3DSlicingConfigPanel } from '../components/tool3d/Tool3DSlicingConfigPanel';
import { Tool3DAnalysisPanel } from '../components/tool3d/Tool3DAnalysisPanel';

/** Public type giữ nguyên đường dẫn import cũ (`views/Tool3DView` re-export như trước). */
export type { ParseFailure } from '../components/tool3d/tool3dAnalysis';

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
  // Khung upload thu gọn thành thanh trạng thái sau khi đã có tệp; mở lại khi bấm "Đổi tệp khác".
  const [uploadExpanded, setUploadExpanded] = useState<boolean>(false);
  // Lịch sử tệp thu gọn mặc định; chỉ mở khi người dùng cần.
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
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
  // Top-level tab cho cột trái: Cấu hình in / Phân tích & QA / Màu sắc 3MF.
  const [leftTab, setLeftTab] = useState<'basic' | 'analysis' | 'color'>('basic');

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
        recommendedTech: is3mf ? 'FDM đa vật liệu (Bambu AMS) / hai đầu đùn' : 'FDM kỹ thuật',
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
        tag: is3mf ? '3MF chuẩn // Đa vật liệu' : `${format} // Lưới đọc từ tệp của bạn`,
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
      setUploadExpanded(false);

      // STL không lưu đơn vị đo trong header ⇒ hỏi khách xác nhận mm/inch trước khi báo giá.
      if (format === 'STL') setIsStlUnitModalOpen(true);

      onShowToast(`Đã nạp tệp 3D & khởi tạo lưới VCUBE: ${file.name} (${formatNumber(parsed.triangleCount)} tam giác)`);
    } catch (err) {
      // Q2 (MP-01): KHÔNG dựng "mô hình phôi an toàn" và KHÔNG bịa số đo cho tệp của khách.
      console.error('Không phân tích được tệp 3D (không tạo dữ liệu thay thế):', err);
      setIsAnalyzing(false);

      const reason = err instanceof Error && err.message
        ? err.message
        : 'Bộ đọc lưới không nhận diện được cấu trúc tệp.';

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
      <Tool3DEmptyState
        isAnalyzing={isAnalyzing}
        dragOver={dragOver}
        setDragOver={setDragOver}
        handleActualFileUpload={handleActualFileUpload}
        emptyStateFileRef={emptyStateFileRef}
        parseFailure={parseFailure}
        manualReviewNoteShown={manualReviewNoteShown}
        setManualReviewNoteShown={setManualReviewNoteShown}
        currentPrinter={currentPrinter}
        currentMaterial={currentMaterial}
      />
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
    onShowToast(`Đã gán đầu đùn T${extruderIdx} cho chi tiết.`);
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
    onShowToast(`Đã chuyển chi tiết sang bàn ${plateIndex}.`);
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
              <span className="font-mono text-xs uppercase tracking-wider text-fg-muted font-semibold">
                KIỂM TRA HÌNH HỌC & CẮT LỚP TỰ ĐỘNG // BỘ MÁY LƯỚI 3D VCUBE v2.6
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              Xưởng phân tích & báo giá 3D tức thì
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-1">
              Bộ công cụ CAD tương tác: xoay/thu phóng/dịch chuyển, cắt lớp, báo cáo kiểm tra lưới, thước cặp & báo giá tự động.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIs3mfVsStlModalOpen(true)}
              leadingIcon={<Icon name="compare_arrows" size={18} />}
            >
              So sánh STL và 3MF
            </Button>
          </div>
        </div>

        {/* Out of Bounds Warning Banner */}
        {isOutOfBounds && currentPrinter && (
          <div className="bg-danger-tint border border-danger/20 p-4 sm:p-5 rounded-lg text-danger flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3">
              <Icon name="warning" size={28} className="text-danger shrink-0" />
              <div>
                <strong className="block text-sm font-bold">Cảnh báo: kích thước mô hình vượt khổ máy in!</strong>
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
                Đổi sang {biggerPrinter.name} ({bedText(biggerPrinter)})
              </Button>
            )}
          </div>
        )}

        {/* Clean File Upload / Dropzone Header with Supported Formats Badges */}
        <Tool3DUploadStrip
          isAnalyzing={isAnalyzing}
          uploadExpanded={uploadExpanded}
          setUploadExpanded={setUploadExpanded}
          dragOver={dragOver}
          setDragOver={setDragOver}
          handleActualFileUpload={handleActualFileUpload}
          workspaceFileRef={workspaceFileRef}
          selectedFile={selectedFile}
        />

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
            không để lại một nhãn "Mẫu thử chuẩn đối chiếu:" trống không có mẫu nào. */}
        {SAMPLE_ANALYSIS_FILES.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono">
          <span className="text-xs font-bold uppercase text-fg-subtle shrink-0">
            Mẫu thử chuẩn đối chiếu:
          </span>
          {SAMPLE_ANALYSIS_FILES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className={`px-3 py-1.5 max-md:min-h-11 text-xs rounded-md border transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                selectedFile.id === sample.id
                  ? 'bg-primary text-primary-fg border-primary'
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
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/20 bg-warning-tint p-3.5 text-xs text-warning font-sans">
            <Icon name="warning" size={16} className="text-warning shrink-0" />
            <p>
              {!currentPrinter ? 'Chưa có máy in nào trong hệ thống. ' : ''}
              {!currentMaterial ? 'Chưa có vật liệu nào trong hệ thống. ' : ''}
              Báo giá tự động chỉ tính khi có dữ liệu thật — quản trị viên thêm ở{' '}
              <strong>/admin → Cấu hình giá → Đội Máy In / Danh Mục Nhựa &amp; Resin</strong>.
            </p>
          </div>
        )}

        {/* Main Workspace — object tree (left) · 3D viewport (center) · quote (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Rail: Object Tree — always visible next to the viewport on desktop */}
          <aside className="order-3 min-w-0 lg:col-span-12 xl:order-1 xl:col-span-3">
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
          </aside>

          {/* Center Column: 3D Viewport + Slicing Parameters + Mesh Validation Report */}
          <div className="order-1 min-w-0 space-y-6 lg:col-span-8 xl:order-2 xl:col-span-6">
            
            {/* Viewport Card */}
            <div className="rounded-lg border border-line bg-surface p-4 sm:p-5 space-y-3 font-sans">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-fg truncate max-w-[180px] sm:max-w-xs">
                    {selectedFile.fileName}
                  </span>
                  <span className={`px-2 py-0.5 text-xs uppercase tracking-wider font-mono font-bold rounded-md ${
                    selectedFile.format === '3MF' ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-fg-muted border border-line'
                  }`}>
                    {selectedFile.format}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-tint text-fg-muted text-xs font-mono font-semibold border border-line">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                    <span>BỘ MÁY LƯỚI 3D VCUBE v2.6</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-fg-subtle text-xs">
                  <span>{selectedFile.fileSize}</span>
                  <span>•</span>
                  <span>{formatNumber(selectedFile.triangleCount)} tam giác</span>
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
              <div className="grid grid-cols-1 min-[380px]:grid-cols-3 gap-2 text-center text-xs bg-surface-muted p-2.5 rounded-lg border border-line font-mono">
                <div className="min-w-0">
                  <span className="text-xs text-fg-muted uppercase block font-semibold">Kích thước X/Y/Z</span>
                  <span className="font-bold text-fg break-words">
                    {transformedDimensions.x.toFixed(1)} × {transformedDimensions.y.toFixed(1)} × {transformedDimensions.z.toFixed(1)} {transform.unit}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-fg-muted uppercase block font-semibold">Thể tích tịnh</span>
                  <span className="font-bold text-fg break-words">
                    {transformedVolume.toFixed(1)} cm³
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-fg-muted uppercase block font-semibold">Số chi tiết</span>
                  <span className="font-bold text-fg break-words">
                    {selectedFile.parts.length} chi tiết
                  </span>
                </div>
              </div>
            </div>

            {/* Left workspace tabs — Cấu hình in · Phân tích/QA · Màu sắc */}
            <div className="flex w-full items-center gap-1 rounded-md border border-line bg-surface-muted p-1 font-mono">
              {([
                { id: 'basic', label: '1. Cấu hình', icon: 'tune' },
                { id: 'analysis', label: '2. Phân tích', icon: 'fact_check' },
                { id: 'color', label: '3. Màu sắc', icon: 'palette' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLeftTab(tab.id)}
                  aria-pressed={leftTab === tab.id}
                  className={`min-w-0 flex-1 inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 max-md:min-h-11 text-sm font-medium rounded-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    leftTab === tab.id ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface hover:text-fg'
                  }`}
                >
                  <Icon name={tab.icon} size={16} className="hidden sm:block" />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </div>

            {leftTab === 'basic' && (
            <Tool3DSlicingConfigPanel
              printers={printers}
              materials={materials}
              currentPrinter={currentPrinter}
              currentMaterial={currentMaterial}
              selectedPrinterId={selectedPrinterId}
              setSelectedPrinterId={setSelectedPrinterId}
              selectedMaterialId={selectedMaterialId}
              setSelectedMaterialId={setSelectedMaterialId}
              infillDensity={infillDensity}
              setInfillDensity={setInfillDensity}
              infillPattern={infillPattern}
              setInfillPattern={setInfillPattern}
              layerHeight={layerHeight}
              setLayerHeight={setLayerHeight}
              supportsMode={supportsMode}
              setSupportsMode={setSupportsMode}
              quantity={quantity}
              setQuantity={setQuantity}
            />
            )}

            {/* Mesh Validation Report Panel / Workspace */}
            {leftTab === 'analysis' && (
            <Tool3DAnalysisPanel
              selectedFile={selectedFile}
              handleAutoFixMesh={handleAutoFixMesh}
              showDefects={showDefects}
              setShowDefects={setShowDefects}
              compareMode={compareMode}
              setCompareMode={setCompareMode}
              activeWorkspaceTab={activeWorkspaceTab}
              setActiveWorkspaceTab={setActiveWorkspaceTab}
              selectedPartId={selectedPartId}
              handleChangePartColor={handleChangePartColor}
              transformedDimensions={transformedDimensions}
              transformedVolume={transformedVolume}
              transform={transform}
              setTransform={setTransform}
              onShowToast={onShowToast}
            />
            )}

            {leftTab === 'color' && (
              <div className="rounded-lg border border-line bg-surface p-5 sm:p-6 font-sans">
                <PresetPalettePanel
                  slicerPreset={selectedFile.slicerPreset}
                  parts={selectedFile.parts}
                  selectedPartId={selectedPartId}
                  onChangeColor={handleChangePartColor}
                  format={selectedFile.format}
                />
              </div>
            )}
          </div>

          {/* Right Column: Slicer Parameters & Instant Quoting Panel */}
          <div className="order-2 min-w-0 space-y-6 lg:col-span-4 xl:order-3 xl:col-span-3">
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

        {/* Uploaded History Files — accordion */}
        <div className="rounded-lg border border-line bg-surface p-5 sm:p-7 font-sans">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-expanded={historyOpen}
            className="w-full flex items-center justify-between gap-3 border-b border-line pb-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <h3 className="font-bold text-base text-fg flex items-center gap-2 font-mono">
              <Icon name="folder_open" size={18} className="text-primary" />
              Lịch sử bản vẽ đã tải lên ({files.length})
            </h3>
            <span className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs text-fg-subtle font-mono truncate max-w-[220px]">
                {selectedFile.fileName}
              </span>
              <Icon name={historyOpen ? 'expand_less' : 'expand_more'} size={18} className="text-fg-muted" />
            </span>
          </button>

          {historyOpen && (
          <div className="responsive-table-wrapper mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-surface-muted text-fg-subtle text-xs uppercase tracking-wider">
                <tr>
                  <th className="h-10 px-4 text-left font-semibold">Tên tệp</th>
                  <th className="h-10 px-4 text-left font-semibold">Định Dạng</th>
                  <th className="h-10 px-4 text-left font-semibold">Kích Thước</th>
                  <th className="h-10 px-4 text-left font-semibold">Tam giác / Chi tiết</th>
                  <th className="h-10 px-4 text-left font-semibold">Điểm rủi ro</th>
                  <th className="h-10 px-4 text-right font-semibold">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className={`h-11 border-t border-line-subtle hover:bg-surface-muted/60 transition-colors ${
                      selectedFile.id === file.id ? 'bg-primary-tint font-semibold' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-fg flex items-center gap-2">
                      <Icon name={file.format === '3MF' ? 'layers' : 'description'} size={16} className="text-fg-subtle" />
                      <span className="truncate max-w-[200px]">{file.fileName}</span>
                    </td>
                    <td className="px-4 py-2 font-mono">
                      <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-sm ${
                        file.format === '3MF' ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-fg-muted border border-line'
                      }`}>
                        {file.format}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono tabular-nums text-fg-muted">
                      {file.dimensions.x} × {file.dimensions.y} × {file.dimensions.z} mm
                    </td>
                    <td className="px-4 py-2 font-mono tabular-nums text-fg-muted">
                      {formatNumber(file.triangleCount)} ▲ ({file.partsCount} chi tiết)
                    </td>
                    <td className="px-4 py-2 font-mono">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                        typeof file.printability.printabilityScore !== 'number'
                          ? 'bg-surface-muted border-line text-fg-muted'
                          : file.printability.printabilityScore >= 90
                          ? 'bg-positive-tint border-positive/20 text-positive'
                          : 'bg-warning-tint border-warning/20 text-warning'
                      }`}>
                        {typeof file.printability.printabilityScore === 'number'
                          ? `${file.printability.printabilityScore}/100 điểm`
                          : '—/100'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      <button
                        type="button"
                        onClick={() => handleSelectSample(file)}
                        aria-pressed={selectedFile.id === file.id}
                        className={`px-3 h-8 max-md:min-h-11 text-xs font-semibold rounded-md border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          selectedFile.id === file.id
                            ? 'bg-primary text-primary-fg border-primary'
                            : 'bg-surface hover:bg-surface-muted hover:text-fg border-line text-fg'
                        }`}
                      >
                        {selectedFile.id === file.id ? 'Đang xem' : 'Phân tích'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
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
          onShowToast('Đã xác nhận đơn vị đo mi-li-mét (mm).');
        }}
        onConvertToInch={() => {
          setIsStlUnitModalOpen(false);
          setTransform(prev => ({ ...prev, unit: 'inch', scaleUniform: 100 }));
          onShowToast('Đã chuyển đổi hệ số kích thước sang inch (×25,4).');
        }}
        onCancel={() => setIsStlUnitModalOpen(false)}
      />
    </div>
  );
};

export default Tool3DView;
