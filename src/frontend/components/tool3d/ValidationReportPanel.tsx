import React, { useState } from 'react';
import { AnalysisFile } from '../../types';
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
    if (score >= 90) return 'text-positive bg-positive-tint border-positive/40';
    if (score >= 70) return 'text-warning bg-warning-tint border-warning/40';
    return 'text-danger bg-danger-tint border-danger/40';
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
    <div className="bg-surface rounded-lg p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line-subtle pb-3">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-fg-muted font-bold block">
            Kiểm Tra Tính Toàn Vẹn & Khả Năng In // Mesh QA & Auto-Fix
          </span>
          <h3 className="font-bold text-sm sm:text-base text-fg flex items-center gap-2 mt-0.5">
            <Icon name="fact_check" size={18} className="text-primary" />
            Báo Cáo Kiểm Định Hình Học & Sửa Lỗi
          </h3>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-sm border border-line-subtle text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('level3')}
            className={`px-2.5 py-1 rounded-sm font-bold transition-colors ${
              activeTab === 'level3' ? 'bg-primary text-primary-fg shadow-e1' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Level 3: In Ấn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('level2')}
            className={`px-2.5 py-1 rounded-sm font-bold transition-colors ${
              activeTab === 'level2' ? 'bg-primary text-primary-fg shadow-e1' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Level 2: Hình Học
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('level1')}
            className={`px-2.5 py-1 rounded-sm font-bold transition-colors ${
              activeTab === 'level1' ? 'bg-primary text-primary-fg shadow-e1' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Level 1: Tệp Tin
          </button>
        </div>
      </div>

      {/* QUICK AUTO-REPAIR & COMPARISON BAR */}
      <div className="bg-surface-muted p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFixClick}
            disabled={isFixing}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 shadow-e1 disabled:opacity-50"
          >
            {isFixing ? (
              <span className="w-3.5 h-3.5 border-2 border-primary-fg border-t-transparent animate-spin rounded-full inline-block"></span>
            ) : (
              <Icon name="build" size={18} />
            )}
            Tự Động Sửa Lưới Mesh
          </button>

          {onToggleDefects && (
            <button
              type="button"
              onClick={onToggleDefects}
              className={`px-3 py-1.5 text-xs font-sans font-bold rounded-sm border transition-colors flex items-center gap-1 ${
                showDefects
                  ? 'bg-warning text-primary-fg border-warning'
                  : 'bg-surface hover:bg-surface-muted text-fg border-line-control'
              }`}
            >
              <Icon name="wb_incandescent" size={18} />
              {showDefects ? 'Tắt Bản Đồ Lỗi' : 'Hiện Vùng Lỗi'}
            </button>
          )}
        </div>

        {/* Before vs After Comparison Switcher */}
        {onSetCompareMode && (
          <div className="flex items-center gap-1 bg-surface-muted p-0.5 rounded-sm text-xs">
            <span className="text-xs text-fg-muted px-1.5 font-sans">So Sánh:</span>
            <button
              type="button"
              onClick={() => onSetCompareMode('normal')}
              className={`px-2 py-0.5 text-xs font-bold rounded-sm transition-colors ${
                compareMode === 'normal' ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Chuẩn
            </button>
            <button
              type="button"
              onClick={() => onSetCompareMode('before')}
              className={`px-2 py-0.5 text-xs font-bold rounded-sm transition-colors ${
                compareMode === 'before' ? 'bg-danger text-primary-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Trước Khi Sửa
            </button>
            <button
              type="button"
              onClick={() => onSetCompareMode('after')}
              className={`px-2 py-0.5 text-xs font-bold rounded-sm transition-colors ${
                compareMode === 'after' ? 'bg-positive text-primary-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Sau Khi Sửa
            </button>
          </div>
        )}
      </div>

      {/* Level 3: Printability Risk Score */}
      {activeTab === 'level3' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-muted rounded-sm">
            <div>
              <div className="text-xs uppercase tracking-widest text-fg-muted font-bold">
                Chỉ Số Khả Năng In Thành Công (Risk Score)
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
              <div className={`px-4 py-2 border rounded-sm text-center shrink-0 ${getScoreBadgeColor(printability.printabilityScore)}`}>
                <div className="font-tech text-2xl font-bold leading-none">
                  {printability.printabilityScore}/100
                </div>
                <div className="text-xs uppercase tracking-wider font-bold mt-1">
                  {countMeasuredScoreInputs(file) < 4
                    ? `Chấm từ ${countMeasuredScoreInputs(file)}/4 số đo`
                    // R4: `level === null` (chua xep muc) KHONG duoc hien "Rui Ro Cao".
                    : printability.level === null
                    ? '—'
                    : printability.level === 'good' ? 'Rất Khả Thi' : printability.level === 'warning' ? 'Cần Chú Ý' : 'Rủi Ro Cao'}
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 border rounded-sm text-center shrink-0 bg-surface-muted border-line-control text-fg-muted">
                <div className="font-tech text-2xl font-bold leading-none">—/100</div>
                <div className="text-xs uppercase tracking-wider font-bold mt-1">Chưa chấm điểm</div>
              </div>
            )}
          </div>

          {/* Orientation Recommendation */}
          <div className="p-3.5 bg-primary-tint/60 border border-primary/20 rounded-sm text-xs flex items-start gap-2.5">
            <Icon name="explore" size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-primary block">Hướng đặt phôi in gợi ý (mặc định, chưa tối ưu theo máy):</strong>
              <span className="text-fg">{printability.recommendedOrientation}</span>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-fg">Danh sách phân tích chi tiết:</div>
            {printability.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-sm border text-xs flex items-start gap-2.5 ${
                  issue.severity === 'high'
                    ? 'bg-danger-tint/70 border-danger/30 text-danger'
                    : issue.severity === 'medium'
                    ? 'bg-warning-tint/70 border-warning/30 text-warning'
                    : issue.severity === 'low'
                    ? 'bg-positive-tint/70 border-positive/30 text-positive'
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
            <div className="bg-surface-muted p-3.5 rounded-sm">
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
                  ? 'Kín (watertight)'
                  : file.isWatertight === false
                  ? 'Không kín (non-manifold)'
                  : 'Chưa phân tích'}
              </span>
            </div>

            <div className="bg-surface-muted p-3.5 rounded-sm">
              <span className="text-xs uppercase tracking-widest text-fg-muted block">Số Tam Giác</span>
              <span className="font-tech font-bold text-fg mt-1 block text-xs">
                {file.triangleCount.toLocaleString()} triangles
              </span>
            </div>

            <div className="bg-surface-muted p-3.5 rounded-sm">
              <span className="text-xs uppercase tracking-widest text-fg-muted block">Diện Tích Bề Mặt</span>
              <span className="font-tech font-bold text-fg mt-1 block text-xs">
                {file.surfaceArea.toFixed(1)} cm²
              </span>
            </div>

            <div className="bg-surface-muted p-3.5 rounded-sm">
              <span className="text-xs uppercase tracking-widest text-fg-muted block">Cạnh Non-manifold</span>
              <span className={`font-tech font-bold mt-1 block text-xs ${
                file.nonManifoldEdges === null ? 'text-fg-muted' : file.nonManifoldEdges > 0 ? 'text-warning' : 'text-positive'
              }`}>
                {file.nonManifoldEdges === null ? '—' : `${file.nonManifoldEdges} cạnh`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-canvas rounded-sm">
              <span className="text-fg-muted block text-xs uppercase font-bold">Vector Pháp Tuyến Nghịch (Inverted):</span>
              <span className="font-tech font-bold text-fg">
                {file.invertedNormals === null ? '—' : `${file.invertedNormals} faces`}
              </span>
            </div>
            <div className="p-3 bg-canvas rounded-sm">
              <span className="text-fg-muted block text-xs uppercase font-bold">Độ Dày Thành Tối Thiểu (Min Wall):</span>
              <span className="font-tech font-bold text-fg">
                {typeof file.minWallThickness === 'number' ? `${file.minWallThickness.toFixed(2)} mm` : '—'}
              </span>
            </div>
            {/* R4 (MP-10): bien ho la phep do RIENG — truoc day no bi gan nham cho "phap tuyen nghich". */}
            <div className="p-3 bg-canvas rounded-sm">
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
        <div className="space-y-3 text-xs font-sans">
          <div className="p-3.5 bg-surface-muted rounded-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-fg-muted">Tên tập tin:</span>
              <span className="font-bold text-fg">{file.fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-muted">Định dạng:</span>
              <span className="font-tech font-bold text-primary">{file.format} CAD Standard</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-muted">Dung lượng:</span>
              <span className="font-tech text-fg">{file.fileSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-muted">Mã băm SHA-256:</span>
              <span className="font-tech text-xs text-fg-muted truncate max-w-[200px]">
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
