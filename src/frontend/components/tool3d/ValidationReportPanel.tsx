import React, { useState } from 'react';
import { AnalysisFile } from '../../types';
import { formatNumber } from '@frontend/lib/format';
import { Icon } from '@frontend/ui';

/**
 * R4: cong thuc diem dung BON phep do. Dem so phep CO so that (`0` la so do that, `null` = chua do).
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

interface ValidationReportPanelProps {
  file: AnalysisFile;
  transformedDimensions: { x: number; y: number; z: number };
  transformedVolume: number;
  showDefects?: boolean;
  onToggleDefects?: () => void;
  compareMode?: 'normal' | 'before' | 'after';
  onSetCompareMode?: (mode: 'normal' | 'before' | 'after') => void;
  onAutoFixMesh?: () => void;
}

export const ValidationReportPanel: React.FC<ValidationReportPanelProps> = ({
  file,
  transformedDimensions,
  transformedVolume,
  showDefects = false,
  onToggleDefects,
  compareMode = 'normal',
  onSetCompareMode,
  onAutoFixMesh
}) => {
  const [activeTab, setActiveTab] = useState<'level3' | 'level2' | 'level1'>('level3');
  const [isFixing, setIsFixing] = useState(false);
  const printability = file.printability;

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'text-positive bg-positive-tint border-positive/20';
    if (score >= 70) return 'text-warning bg-warning-tint border-warning/20';
    return 'text-danger bg-danger-tint border-danger/20';
  };

  const handleFixClick = () => {
    if (!onAutoFixMesh) return;
    setIsFixing(true);
    setTimeout(() => {
      onAutoFixMesh();
      setIsFixing(false);
    }, 600);
  };

  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line-subtle pb-3">
        <div>
          <h3 className="font-semibold text-base tracking-tight text-fg flex items-center gap-2 mt-0.5">
            <Icon name="fact_check" size={18} className="text-primary" />
            Báo cáo kiểm định hình học & sửa lỗi
          </h3>
        </div>

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Cấp độ kiểm định"
          className="flex items-center gap-1 rounded-md border border-line bg-surface-muted p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            id="validation-tab-level3"
            aria-selected={activeTab === 'level3'}
            aria-controls="validation-panel-level3"
            onClick={() => setActiveTab('level3')}
            className={`px-3 py-1.5 max-md:min-h-11 rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activeTab === 'level3' ? 'bg-surface text-fg font-semibold shadow-e1' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Cấp 3: In ấn
          </button>
          <button
            type="button"
            role="tab"
            id="validation-tab-level2"
            aria-selected={activeTab === 'level2'}
            aria-controls="validation-panel-level2"
            onClick={() => setActiveTab('level2')}
            className={`px-3 py-1.5 max-md:min-h-11 rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activeTab === 'level2' ? 'bg-surface text-fg font-semibold shadow-e1' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Cấp 2: Hình học
          </button>
          <button
            type="button"
            role="tab"
            id="validation-tab-level1"
            aria-selected={activeTab === 'level1'}
            aria-controls="validation-panel-level1"
            onClick={() => setActiveTab('level1')}
            className={`px-3 py-1.5 max-md:min-h-11 rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activeTab === 'level1' ? 'bg-surface text-fg font-semibold shadow-e1' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Cấp 1: Tệp tin
          </button>
        </div>
      </div>

      {/* QUICK AUTO-REPAIR & COMPARISON BAR */}
      <div className="bg-surface-muted border border-line-subtle p-3.5 rounded-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFixClick}
            disabled={isFixing}
            className="h-10 max-md:min-h-11 px-4 bg-primary hover:bg-primary-hover text-primary-fg text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-e1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isFixing ? (
              <span className="w-3.5 h-3.5 border-2 border-primary-fg border-t-transparent animate-spin motion-reduce:animate-none rounded-full inline-block"></span>
            ) : (
              <Icon name="build" size={18} />
            )}
            Tự động sửa lưới
          </button>

          {onToggleDefects && (
            <button
              type="button"
              onClick={onToggleDefects}
              className={`h-10 max-md:min-h-11 px-3 text-sm font-medium rounded-md border transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                showDefects
                  ? 'bg-surface text-fg border-line shadow-e1 font-semibold'
                  : 'bg-surface hover:bg-surface-muted text-fg border-line-control'
              }`}
            >
              <Icon name="wb_incandescent" size={18} />
              {showDefects ? 'Tắt bản đồ lỗi' : 'Hiện vùng lỗi'}
            </button>
          )}
        </div>

        {/* Before vs After Comparison Switcher */}
        {onSetCompareMode && (
          <div className="flex items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-xs">
            <span className="text-xs text-fg-muted px-1.5 font-sans">So Sánh:</span>
            <button
              type="button"
              aria-pressed={compareMode === 'normal'}
              onClick={() => onSetCompareMode('normal')}
              className={`px-3 py-1.5 max-md:min-h-11 text-sm font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                compareMode === 'normal' ? 'bg-surface text-fg shadow-e1 font-semibold' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Chuẩn
            </button>
            <button
              type="button"
              aria-pressed={compareMode === 'before'}
              onClick={() => onSetCompareMode('before')}
              className={`px-3 py-1.5 max-md:min-h-11 text-sm font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                compareMode === 'before' ? 'bg-surface text-fg shadow-e1 font-semibold' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Trước Khi Sửa
            </button>
            <button
              type="button"
              aria-pressed={compareMode === 'after'}
              onClick={() => onSetCompareMode('after')}
              className={`px-3 py-1.5 max-md:min-h-11 text-sm font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                compareMode === 'after' ? 'bg-surface text-fg shadow-e1 font-semibold' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Sau Khi Sửa
            </button>
          </div>
        )}
      </div>

      {/* Level 3: Printability Risk Score */}
      {activeTab === 'level3' && (
        <div role="tabpanel" id="validation-panel-level3" aria-labelledby="validation-tab-level3" className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-muted rounded-sm">
            <div>
              <div className="text-xs uppercase tracking-widest text-fg-muted font-bold">
                Chỉ số khả năng in thành công
              </div>
              <div className="text-xs text-fg-muted mt-0.5">
                {/* R4: noi RO diem den tu may phep do va muc nao bi bo qua; khong cham diem tu `null`. */}
                {typeof printability.printabilityScore === 'number'
                  ? describeUnmeasuredScoreInputs(file).length > 0
                    ? `Chấm trên ${countMeasuredScoreInputs(file)}/4 phép đo đã chạy. Bỏ qua (chưa đo được): ${describeUnmeasuredScoreInputs(file).join(', ')}.`
                    : 'Điểm suy trực tiếp từ 4 phép đo đã chạy trên lưới bạn tải lên: độ kín, cạnh non-manifold, pháp tuyến nghịch và độ dày vách tối thiểu.'
                  : `Chưa chấm điểm: thiếu số đo (${describeUnmeasuredScoreInputs(file).join(', ')}). Hệ thống không chấm điểm từ dữ liệu không có.`}
              </div>
            </div>

            {typeof printability.printabilityScore === 'number' ? (
              <div className={`px-4 py-2 border rounded-lg text-center shrink-0 ${getScoreBadgeColor(printability.printabilityScore)}`}>
                <div className="font-mono tabular-nums text-2xl font-bold leading-none">
                  {printability.printabilityScore}/100
                </div>
                <div className="text-xs uppercase tracking-wider font-bold mt-1">
                  {countMeasuredScoreInputs(file) < 4
                    ? `Chấm từ ${countMeasuredScoreInputs(file)}/4 số đo`
                    // R4: `level === null` (chua xep muc) KHONG duoc hien "Rui Ro Cao".
                    : printability.level === null
                    ? '—'
                    : printability.level === 'good' ? 'Rất khả thi' : printability.level === 'warning' ? 'Cần chú ý' : 'Rủi ro cao'}
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 border rounded-lg text-center shrink-0 bg-surface-muted border-line text-fg-muted">
                <div className="font-mono tabular-nums text-2xl font-bold leading-none">—/100</div>
                <div className="text-xs uppercase tracking-wider font-bold mt-1">Chưa chấm điểm</div>
              </div>
            )}
          </div>

          {/* Orientation Recommendation */}
          <div className="p-3.5 bg-primary-tint border border-line rounded-md text-xs flex items-start gap-2.5">
            <Icon name="explore" size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-primary block">Hướng đặt phôi in gợi ý (mặc định, chưa tối ưu theo máy):</strong>
              <span className="text-fg">{printability.recommendedOrientation}</span>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-fg">Danh sách phân tích chi tiết:</div>
            {printability.issues.map((issue) => (
              <div
                key={`${issue.code}-${issue.message}`}
                className={`p-3 rounded-md border text-xs flex items-start gap-2.5 ${
                  issue.severity === 'high'
                    ? 'bg-danger-tint border-danger/20 text-danger'
                    : issue.severity === 'medium'
                    ? 'bg-warning-tint border-warning/20 text-warning'
                    : issue.severity === 'low'
                    ? 'bg-positive-tint border-positive/20 text-positive'
                    : 'bg-surface-muted border-line text-fg-muted'
                }`}
              >
                {/* Q2: `info` (ví dụ "chưa đo được …") không được tô xanh như một kết luận đạt. */}
                <Icon
                  name={issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : issue.severity === 'low' ? 'check_circle' : 'info'}
                  size={18}
                  className="shrink-0 mt-0.5"
                />
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>{issue.code}</span>
                    <span className="text-xs uppercase px-1.5 py-0.2 rounded-sm border border-line-subtle bg-surface-muted">
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 leading-relaxed">{issue.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Level 2: Geometry Analysis */}
      {activeTab === 'level2' && (
        <div role="tabpanel" id="validation-panel-level2" aria-labelledby="validation-tab-level2" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
            <div className="bg-surface-muted p-3.5 rounded-md border border-line-subtle">
              <span className="text-xs uppercase tracking-widest text-fg-muted block">Độ Kín Nước</span>
              {/* Q2 (data-honesty): trước đây icon `verified` + `text-positive` render CẢ khi lưới
                  KHÔNG kín ⇒ màu và biểu tượng nói ngược số đo. Giờ bám đúng `file.isWatertight`. */}
              <span className={`font-tech font-bold flex items-center gap-1 mt-1 text-xs ${
                file.isWatertight === true ? 'text-positive' : file.isWatertight === false ? 'text-warning' : 'text-fg-muted'
              }`}>
                <Icon
                  name={file.isWatertight === true ? 'verified' : file.isWatertight === false ? 'warning' : 'help'}
                  size={18}
                />
                {file.isWatertight === true
                  ? 'Kín nước'
                  : file.isWatertight === false
                  ? 'Không kín (non-manifold)'
                  : 'Chưa phân tích'}
              </span>
            </div>

            <div className="bg-surface-muted p-3.5 rounded-md border border-line-subtle">
              <span className="text-xs uppercase tracking-widest text-fg-muted block">Số Tam Giác</span>
              <span className="font-tech font-bold text-fg mt-1 block text-xs">
                {formatNumber(file.triangleCount)} tam giác
              </span>
            </div>

            <div className="bg-surface-muted p-3.5 rounded-md border border-line-subtle">
              <span className="text-xs uppercase tracking-widest text-fg-muted block">Diện Tích Bề Mặt</span>
              <span className="font-tech font-bold text-fg mt-1 block text-xs">
                {file.surfaceArea.toFixed(1)} cm²
              </span>
            </div>

            <div className="bg-surface-muted p-3.5 rounded-md border border-line-subtle">
              <span className="text-xs uppercase tracking-widest text-fg-muted block">Cạnh Non-manifold</span>
              <span className={`font-tech font-bold mt-1 block text-xs ${
                file.nonManifoldEdges === null ? 'text-fg-muted' : file.nonManifoldEdges > 0 ? 'text-warning' : 'text-positive'
              }`}>
                {file.nonManifoldEdges === null ? '—' : `${file.nonManifoldEdges} cạnh`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-surface-muted rounded-md">
              <span className="text-fg-muted block text-xs uppercase font-bold">Vector pháp tuyến nghịch:</span>
              <span className="font-tech font-bold text-fg">
                {file.invertedNormals === null ? '—' : `${file.invertedNormals} mặt`}
              </span>
            </div>
            <div className="p-3 bg-surface-muted rounded-md">
              <span className="text-fg-muted block text-xs uppercase font-bold">Độ dày thành tối thiểu:</span>
              <span className="font-tech font-bold text-fg">
                {typeof file.minWallThickness === 'number' ? `${file.minWallThickness.toFixed(2)} mm` : '—'}
              </span>
            </div>
            {/* R4 (MP-10): bien ho la phep do RIENG — truoc day no bi gan nham cho "phap tuyen nghich". */}
            <div className="p-3 bg-surface-muted rounded-md">
              <span className="text-fg-muted block text-xs uppercase font-bold">Biên Hở (cạnh chỉ có 1 mặt):</span>
              <span className="font-tech font-bold text-fg">
                {typeof file.boundaryEdges === 'number' ? `${file.boundaryEdges} cạnh` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Level 1: File Metadata QA */}
      {activeTab === 'level1' && (
        <div role="tabpanel" id="validation-panel-level1" aria-labelledby="validation-tab-level1" className="space-y-3 text-xs font-sans">
          <div className="p-3.5 bg-surface-muted border border-line-subtle rounded-md space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-fg-muted">Tên tập tin:</span>
              <span className="font-bold text-fg truncate">{file.fileName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-fg-muted">Định dạng:</span>
              <span className="font-mono font-bold text-fg">{file.format} · chuẩn CAD</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-fg-muted">Dung lượng:</span>
              <span className="font-mono text-fg tabular-nums">{file.fileSize}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-fg-muted">Mã băm SHA-256:</span>
              <span className="font-mono text-xs text-fg-muted truncate max-w-[200px]">
                {/* Q2 (MP-11): bỏ fallback = SHA-256 của chuỗi rỗng; chưa băm được ⇒ in "—". */}
                {file.sha256Hash || '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
