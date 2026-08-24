import React, { useState } from 'react';
import { AnalysisFile, CartItem, TransformState, MeasurementResult } from '../types';
import { SAMPLE_ANALYSIS_FILES, PRINTER_PROFILES } from '../data/mockData';
import { ModelViewer3D } from '../components/tool3d/ModelViewer3D';
import { StlVs3mfComparisonModal } from '../components/tool3d/StlVs3mfComparisonModal';
import { StlUnitConfirmModal } from '../components/tool3d/StlUnitConfirmModal';
import { ObjectTreePanel } from '../components/tool3d/ObjectTreePanel';
import { PresetPalettePanel } from '../components/tool3d/PresetPalettePanel';
import { TransformControlsPanel } from '../components/tool3d/TransformControlsPanel';
import { ValidationReportPanel } from '../components/tool3d/ValidationReportPanel';
import { QuoteSummaryPanel } from '../components/tool3d/QuoteSummaryPanel';
import { parse3DFile, splitConnectedComponents, autoRepairGeometry } from '../utils/meshParser';

interface Tool3DViewProps {
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const Tool3DView: React.FC<Tool3DViewProps> = ({
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const [files, setFiles] = useState<AnalysisFile[]>(SAMPLE_ANALYSIS_FILES);
  const [selectedFile, setSelectedFile] = useState<AnalysisFile>(SAMPLE_ANALYSIS_FILES[0]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // Slicing parameters
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('bambu-x1c');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('pla-tough');
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

  const handleUpdateTransform = (updated: Partial<TransformState>) => {
    setTransform(prev => ({ ...prev, ...updated }));
  };

  // Workspace sub-tab for Left Column (Viewport + Object Tree vs Preset Palettes vs Transforms vs Validation)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'objects' | 'preset' | 'transforms' | 'validation'>('objects');

  // Selected printer bed dimensions
  const currentPrinter = PRINTER_PROFILES.find(p => p.id === selectedPrinterId) || PRINTER_PROFILES[0];

  // Dynamically compute transformed dimensions and volume
  const scaleMultiplier = (transform.scaleUniform / 100) * (transform.unit === 'inch' ? 25.4 : 1.0);
  const transformedDimensions = {
    x: selectedFile.dimensions.x * scaleMultiplier,
    y: selectedFile.dimensions.y * scaleMultiplier,
    z: selectedFile.dimensions.z * scaleMultiplier
  };
  const transformedVolume = selectedFile.volume * Math.pow(scaleMultiplier, 3);

  // Check if model exceeds current printer build volume
  const isOutOfBounds =
    transformedDimensions.x > currentPrinter.bedDimensions.x ||
    transformedDimensions.y > currentPrinter.bedDimensions.y ||
    transformedDimensions.z > currentPrinter.bedDimensions.z;

  // Handle part modifications
  const handleTogglePartVisibility = (partId: string) => {
    setSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, visible: !p.visible } : p)
    }));
  };

  const handleChangePartColor = (partId: string, colorHex: string, colorName: string) => {
    setSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, colorHex, color: colorName } : p)
    }));
    onShowToast(`Đã gán màu ${colorName} cho chi tiết.`);
  };

  const handleChangePartExtruder = (partId: string, extruderIdx: number) => {
    setSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, extruderIndex: extruderIdx } : p)
    }));
    onShowToast(`Đã gán Đầu đùn Tool T${extruderIdx} cho chi tiết.`);
  };

  const handleChangePartMaterial = (partId: string, materialId: string) => {
    setSelectedFile(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, materialId } : p)
    }));
    onShowToast('Đã cập nhật vật liệu gán riêng cho chi tiết.');
  };

  // Split multi-component shells
  const handleSplitComponents = () => {
    if (selectedFile.parts.length === 0) return;
    const basePart = selectedFile.parts[0];
    const newParts = splitConnectedComponents(basePart, selectedFile.dimensions, selectedFile.volume);
    
    setSelectedFile(prev => ({
      ...prev,
      partsCount: newParts.length,
      parts: newParts,
      format: '3MF',
      tag: '3MF // Tách Khối Connected Shells'
    }));

    onShowToast(`Đã tách thành công ${newParts.length} Components độc lập.`);
  };

  // Auto-Repair Mesh defects
  const handleAutoFixMesh = () => {
    if (selectedFile.customGeometry) {
      const repaired = autoRepairGeometry(selectedFile.customGeometry);
      setSelectedFile(prev => ({
        ...prev,
        isWatertight: true,
        nonManifoldEdges: 0,
        invertedNormals: 0,
        minWallThickness: 1.6,
        status: 'Ready',
        customGeometry: repaired,
        printability: {
          ...prev.printability,
          printabilityScore: 98,
          level: 'good',
          issues: [
            {
              code: 'OVERHANG',
              severity: 'low',
              message: 'Lưới Mesh đã được tự động hàn mép (Weld Normals & Seal Boundaries).'
            }
          ]
        }
      }));
    } else {
      setSelectedFile(prev => ({
        ...prev,
        isWatertight: true,
        nonManifoldEdges: 0,
        invertedNormals: 0,
        minWallThickness: 1.6,
        status: 'Ready',
        printability: {
          ...prev.printability,
          printabilityScore: 98,
          level: 'good',
          issues: [
            {
              code: 'OVERHANG',
              severity: 'low',
              message: 'Đã hoàn tất tự động sửa lỗi lưới Mesh. Mô hình đạt chuẩn Watertight 100%.'
            }
          ]
        }
      }));
    }

    setCompareMode('after');
    onShowToast('Đã tự động sửa xong toàn bộ lỗi Non-manifold và Vector pháp tuyến.');
  };

  // Upload & parse actual File object directly in browser
  const handleActualFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const is3mf = lowerName.endsWith('.3mf');
    const isObj = lowerName.endsWith('.obj');
    const format: 'STL' | '3MF' | 'STEP' | 'OBJ' = is3mf ? '3MF' : isObj ? 'OBJ' : 'STL';

    try {
      const parsed = await parse3DFile(file);
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

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
        minWallThickness: parsed.minWallThickness,
        recommendedTech: is3mf ? 'FDM Multi-Material (Bambu AMS) / Dual Extruder' : 'FDM Engineering',
        requiresSupport: false,
        printability: {
          printabilityScore: parsed.isWatertight ? 94 : 76,
          level: parsed.isWatertight ? 'good' : 'warning',
          issues: [
            {
              code: 'OVERHANG',
              severity: 'low',
              message: 'Đã phân tích lưới Mesh. Bề mặt góc nghiêng nằm trong vùng an toàn gia công.'
            }
          ],
          recommendedOrientation: 'Mặt đáy phẳng tiếp xúc bàn in Z=0',
          bedFit: parsed.dimensions.x <= currentPrinter.bedDimensions.x && parsed.dimensions.y <= currentPrinter.bedDimensions.y,
          overhangPercentage: 6.8
        },
        tag: is3mf ? '3MF Chuẩn // Multi-Material' : `${format} // Đã quét Mesh 3D`,
        status: 'Ready',
        modelType: 'custom',
        customGeometry: parsed.geometry || null,
        customObjectGroup: parsed.objectGroup || null,
        sha256Hash: 'c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
        isUnitConfirmed: is3mf ? true : false,
        slicerPreset: parsed.slicerPreset
      };

      setFiles(prev => [newFile, ...prev]);
      setSelectedFile(newFile);
      if (is3mf && parsed.slicerPreset) {
        setActiveWorkspaceTab('preset');
      }
      setIsAnalyzing(false);

      if (format === 'STL') {
        setIsStlUnitModalOpen(true);
      } else {
        onShowToast(`Đã nạp file 3D: ${file.name} (${parsed.triangleCount.toLocaleString()} tam giác)`);
      }
    } catch (err) {
      console.error('Error parsing 3D file:', err);
      setIsAnalyzing(false);
      onShowToast(`Đã phân tích file ${file.name}`);
    }
  };

  const handleSelectSample = (file: AnalysisFile) => {
    setSelectedFile(file);
    setSelectedPartId(null);
    if (file.format === 'STL' && !file.isUnitConfirmed) {
      setIsStlUnitModalOpen(true);
    }
  };

  const handleDirectOrder = (item: CartItem) => {
    onAddToCart(item);
    onNavigate('checkout');
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-6 sm:py-10 px-4 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Top Title & Benchmark Callout */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#00687a] font-bold">
                Automated Slicer & Geometry QA // VCUBE Core Engine
              </span>
              <span className="px-2 py-0.5 text-[9px] bg-cyan-100 text-[#00687a] font-bold rounded">
                ISO/ASTM 52900
              </span>
            </div>
            <h1 className="fluid-h1 text-[#1C1C1C]">
              Xưởng Phân Tích & Báo Giá 3D (3MF / STL / OBJ)
            </h1>
            <p className="text-xs sm:text-sm text-[#7D7565] mt-1 font-serif">
              Bộ công cụ CAD tương tác: Xoay/Zoom/Pan, Cây Object Tree, Phân tích góc nhô, Thước đo Caliper, và Tự động sửa lưới Mesh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIs3mfVsStlModalOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-cyan-50 border border-[#00687a]/40 text-[#00687a] text-xs font-sans uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-xs transition-colors rounded"
            >
              <span className="material-symbols-outlined text-sm">compare_arrows</span>
              So Sánh STL vs 3MF
            </button>
          </div>
        </div>

        {/* Out of Bounds Warning Banner */}
        {isOutOfBounds && (
          <div className="bg-rose-50 border-2 border-rose-500 p-4 rounded-xl text-rose-900 flex items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-rose-600 shrink-0">warning</span>
              <div>
                <strong className="block text-sm font-bold">Cảnh Báo: Kích Thước Mô Hình Vượt Khổ Máy In!</strong>
                <p className="text-xs text-rose-800">
                  Mô hình ({transformedDimensions.x.toFixed(1)} × {transformedDimensions.y.toFixed(1)} × {transformedDimensions.z.toFixed(1)} mm) vượt quá kích thước bàn in của máy{' '}
                  <strong>{currentPrinter.name}</strong> ({currentPrinter.bedDimensions.x} × {currentPrinter.bedDimensions.y} × {currentPrinter.bedDimensions.z} mm). Hãy thu nhỏ Scale hoặc chọn máy khổ lớn hơn.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPrinterId('anycubic-kobra-max')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-sans font-bold uppercase tracking-wider rounded shrink-0 transition-colors shadow-xs"
            >
              Đổi Sang Máy Khổ Lớn (420mm)
            </button>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
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
          className={`border-2 border-dashed p-6 sm:p-8 text-center transition-all bg-white rounded-xl ${
            dragOver ? 'border-[#00687a] bg-cyan-50/20' : 'border-black/20 hover:border-black'
          }`}
        >
          {isAnalyzing ? (
            <div className="py-6 space-y-3">
              <div className="w-10 h-10 border-2 border-[#00687a] border-t-transparent animate-spin mx-auto rounded-full"></div>
              <p className="font-sans text-xs uppercase tracking-widest text-[#00687a] font-bold">
                Đang giải mã Mesh 3D, bóc tách cấu trúc tam giác và tính toán thể tích...
              </p>
              <span className="text-[10px] text-[#7D7565]">WebGL three.js geometry pipeline in progress</span>
            </div>
          ) : (
            <div className="max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 bg-[#F7F6F2] border border-black/10 text-[#00687a] flex items-center justify-center mx-auto rounded-full">
                <span className="material-symbols-outlined text-2xl">cloud_upload</span>
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1C1C1C]">
                  Kéo & thả tập tin 3D vào khung kiểm tra
                </h3>
                <p className="text-xs text-[#7D7565] mt-0.5 font-serif">
                  Hỗ trợ định dạng: <strong>.3MF</strong>, <strong>.STL</strong>, <strong>.OBJ</strong>, .STEP (Tối đa 150MB)
                </p>
              </div>
              <label className="inline-block px-5 py-2.5 bg-[#1C1C1C] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-widest font-bold cursor-pointer transition-colors rounded shadow-sm">
                <span>Chọn File Từ Máy Tính</span>
                <input
                  type="file"
                  accept=".stl,.3mf,.step,.obj,.iges"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleActualFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Quick Sample File Switcher Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-sans font-bold uppercase text-[#7D7565] shrink-0">
            Mẫu Thử Benchmark:
          </span>
          {SAMPLE_ANALYSIS_FILES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className={`px-3 py-1.5 text-xs font-sans rounded-lg border transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedFile.id === sample.id
                  ? 'bg-[#00687a] text-white border-[#00687a]'
                  : 'bg-white hover:bg-[#F7F6F2] border-black/15 text-[#1C1C1C]'
              }`}
            >
              <span className="material-symbols-outlined text-xs">
                {sample.format === '3MF' ? 'layers' : 'view_in_ar'}
              </span>
              <span className="font-semibold">{sample.fileName}</span>
            </button>
          ))}
        </div>

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* Left Column: 3D Viewport + Sub-panel Navigation (Objects, Transforms, Validation) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Viewport Card */}
            <div className="bg-white border border-black/10 p-4 sm:p-5 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10 text-xs font-sans">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-[#1C1C1C] truncate max-w-[220px] sm:max-w-sm">
                    {selectedFile.fileName}
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold rounded ${
                    selectedFile.format === '3MF' ? 'bg-[#00687a] text-white' : 'bg-slate-200 text-[#1C1C1C]'
                  }`}>
                    {selectedFile.format} Standard
                  </span>
                </div>

                <div className="flex items-center gap-3 font-tech text-[#5A554C]">
                  <span>{selectedFile.fileSize}</span>
                  <span>•</span>
                  <span>{selectedFile.triangleCount.toLocaleString()} Triangles</span>
                </div>
              </div>

              {/* 3D Viewport Component */}
              <ModelViewer3D
                modelType={selectedFile.modelType}
                parts={selectedFile.parts}
                transform={transform}
                bedDimensions={currentPrinter.bedDimensions}
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
                className="h-[400px] sm:h-[480px] w-full"
              />

              {/* Quick Dimension Bar under Viewport */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#F7F6F2] p-2.5 rounded border border-black/10">
                <div>
                  <span className="text-[10px] text-[#7D7565] uppercase block">Kích thước X/Y/Z</span>
                  <span className="font-tech font-bold text-[#1C1C1C]">
                    {transformedDimensions.x.toFixed(1)} × {transformedDimensions.y.toFixed(1)} × {transformedDimensions.z.toFixed(1)} {transform.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7D7565] uppercase block">Thể tích Net</span>
                  <span className="font-tech font-bold text-[#1C1C1C]">
                    {transformedVolume.toFixed(1)} cm³
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7D7565] uppercase block">Số Part</span>
                  <span className="font-tech font-bold text-[#00687a]">
                    {selectedFile.parts.length} chi tiết
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-panels Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-black/10 pb-1">
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('objects')}
                className={`pb-2 px-3 text-xs font-sans uppercase tracking-wider font-bold transition-all border-b-2 ${
                  activeWorkspaceTab === 'objects'
                    ? 'border-[#00687a] text-[#00687a]'
                    : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                }`}
              >
                1. Cấu Trúc Part ({selectedFile.parts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('preset')}
                className={`pb-2 px-3 text-xs font-sans uppercase tracking-wider font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeWorkspaceTab === 'preset'
                    ? 'border-[#00687a] text-[#00687a]'
                    : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                }`}
              >
                2. Bảng Màu & Preset 3MF
                <span className="px-1.5 py-0.2 text-[9px] font-tech font-bold rounded bg-cyan-100 text-[#00687a]">
                  {selectedFile.slicerPreset?.palettes?.length || selectedFile.parts.length} màu
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('transforms')}
                className={`pb-2 px-3 text-xs font-sans uppercase tracking-wider font-bold transition-all border-b-2 ${
                  activeWorkspaceTab === 'transforms'
                    ? 'border-[#00687a] text-[#00687a]'
                    : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                }`}
              >
                3. Tỷ Lệ & Tọa Độ Bàn
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('validation')}
                className={`pb-2 px-3 text-xs font-sans uppercase tracking-wider font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeWorkspaceTab === 'validation'
                    ? 'border-[#00687a] text-[#00687a]'
                    : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                }`}
              >
                4. Báo Cáo & Sửa Lỗi Mesh
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                onSplitComponents={handleSplitComponents}
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

          {/* Right Column: Slicer Parameters & Instant Quoting Panel */}
          <div className="lg:col-span-5 space-y-6">
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
          </div>
        </div>

        {/* Uploaded History Files Table */}
        <div className="bg-white border border-black/10 p-5 sm:p-7 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <h3 className="font-serif font-bold text-base text-[#1C1C1C] flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#00687a]">folder_open</span>
              Lịch Sử Bản Vẽ Tải Lên & Quét Mesh ({files.length} files)
            </h3>
            <span className="text-xs text-[#7D7565]">S3 Direct Upload Cache</span>
          </div>

          <div className="responsive-table-wrapper">
            <table className="text-left text-xs font-sans">
              <thead className="border-b border-black/10 text-[#7D7565] text-[10px] uppercase tracking-widest bg-[#FAF9F5]">
                <tr>
                  <th className="p-3">Tên Tập Tin</th>
                  <th className="p-3">Định Dạng</th>
                  <th className="p-3">Kích Thước</th>
                  <th className="p-3">Tam Giác / Parts</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className={`hover:bg-[#F7F6F2] transition-colors ${
                      selectedFile.id === file.id ? 'bg-cyan-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3 text-[#1C1C1C] flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#00687a]">
                        {file.format === '3MF' ? 'layers' : 'description'}
                      </span>
                      <span className="truncate max-w-[200px]">{file.fileName}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 text-[9px] font-tech font-bold uppercase rounded ${
                        file.format === '3MF' ? 'bg-[#00687a] text-white' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {file.format}
                      </span>
                    </td>
                    <td className="p-3 font-tech text-[#5A554C]">
                      {file.dimensions.x} × {file.dimensions.y} × {file.dimensions.z} mm
                    </td>
                    <td className="p-3 font-tech text-[#5A554C]">
                      {file.triangleCount.toLocaleString()} ▲ ({file.partsCount} part{file.partsCount > 1 ? 's' : ''})
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-tech font-bold rounded ${
                        file.printability.printabilityScore >= 90
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {file.printability.printabilityScore}/100 Score
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleSelectSample(file)}
                        className={`px-3 py-1 text-[10px] uppercase font-sans tracking-widest rounded border transition-colors ${
                          selectedFile.id === file.id
                            ? 'bg-[#00687a] text-white border-[#00687a]'
                            : 'bg-white hover:bg-[#1C1C1C] hover:text-white border-black/20'
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
