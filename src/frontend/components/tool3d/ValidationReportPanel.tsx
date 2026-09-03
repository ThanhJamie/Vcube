import React, { useState } from 'react';
import { AnalysisFile } from '../../types';

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
    if (score >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (score >= 70) return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-rose-700 bg-rose-50 border-rose-300';
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
    <div className="bg-white border border-black/10 p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 pb-3">
        <div>
          <span className="font-sans text-[9px] uppercase tracking-widest text-[#7D7565] font-bold block">
            Kiểm Tra Tính Toàn Vẹn & Khả Năng In // Mesh QA & Auto-Fix
          </span>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#1C1C1C] flex items-center gap-2 mt-0.5">
            <span className="material-symbols-outlined text-base text-[#00687a]">fact_check</span>
            Báo Cáo Kiểm Định Hình Học & Sửa Lỗi
          </h3>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#F7F6F2] p-1 rounded border border-black/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('level3')}
            className={`px-2.5 py-1 rounded font-bold transition-colors ${
              activeTab === 'level3' ? 'bg-[#00687a] text-white shadow-xs' : 'text-[#5A554C] hover:text-[#1C1C1C]'
            }`}
          >
            Level 3: In Ấn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('level2')}
            className={`px-2.5 py-1 rounded font-bold transition-colors ${
              activeTab === 'level2' ? 'bg-[#00687a] text-white shadow-xs' : 'text-[#5A554C] hover:text-[#1C1C1C]'
            }`}
          >
            Level 2: Hình Học
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('level1')}
            className={`px-2.5 py-1 rounded font-bold transition-colors ${
              activeTab === 'level1' ? 'bg-[#00687a] text-white shadow-xs' : 'text-[#5A554C] hover:text-[#1C1C1C]'
            }`}
          >
            Level 1: Tệp Tin
          </button>
        </div>
      </div>

      {/* QUICK AUTO-REPAIR & COMPARISON BAR */}
      <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-black/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFixClick}
            disabled={isFixing}
            className="px-3.5 py-1.5 bg-[#00687a] hover:bg-[#005260] text-white text-xs font-sans font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {isFixing ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full inline-block"></span>
            ) : (
              <span className="material-symbols-outlined text-sm">build</span>
            )}
            Tự Động Sửa Lưới Mesh
          </button>

          {onToggleDefects && (
            <button
              type="button"
              onClick={onToggleDefects}
              className={`px-3 py-1.5 text-xs font-sans font-bold rounded border transition-colors flex items-center gap-1 ${
                showDefects
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white hover:bg-slate-100 text-[#1C1C1C] border-black/15'
              }`}
            >
              <span className="material-symbols-outlined text-xs">wb_incandescent</span>
              {showDefects ? 'Tắt Bản Đồ Lỗi' : 'Hiện Vùng Lỗi'}
            </button>
          )}
        </div>

        {/* Before vs After Comparison Switcher */}
        {onSetCompareMode && (
          <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-black/15 text-xs">
            <span className="text-[10px] text-[#7D7565] px-1.5 font-sans">So Sánh:</span>
            <button
              type="button"
              onClick={() => onSetCompareMode('normal')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                compareMode === 'normal' ? 'bg-[#00687a] text-white' : 'text-[#5A554C] hover:text-[#1C1C1C]'
              }`}
            >
              Chuẩn
            </button>
            <button
              type="button"
              onClick={() => onSetCompareMode('before')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                compareMode === 'before' ? 'bg-rose-700 text-white' : 'text-[#5A554C] hover:text-[#1C1C1C]'
              }`}
            >
              Trước Khi Sửa
            </button>
            <button
              type="button"
              onClick={() => onSetCompareMode('after')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                compareMode === 'after' ? 'bg-emerald-700 text-white' : 'text-[#5A554C] hover:text-[#1C1C1C]'
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
          <div className="flex items-center justify-between p-4 bg-[#F7F6F2] border border-black/10 rounded">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#7D7565] font-bold">
                Chỉ Số Khả Năng In Thành Công (Risk Score)
              </div>
              <div className="text-xs text-[#5A554C] mt-0.5">
                Dựa trên mô phỏng góc nhô (Overhang), độ dày vách và diện tích tiếp xúc bàn in
              </div>
            </div>

            <div className={`px-4 py-2 border rounded text-center shrink-0 ${getScoreBadgeColor(printability.printabilityScore)}`}>
              <div className="font-tech text-2xl font-bold leading-none">
                {printability.printabilityScore}/100
              </div>
              <div className="text-[9px] uppercase tracking-wider font-bold mt-1">
                {printability.level === 'good' ? 'Rất Khả Thi' : printability.level === 'warning' ? 'Cần Chú Ý' : 'Rủi Ro Cao'}
              </div>
            </div>
          </div>

          {/* Orientation Recommendation */}
          <div className="p-3.5 bg-cyan-50/60 border border-[#00687a]/20 rounded text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#00687a] text-base shrink-0 mt-0.5">
              explore
            </span>
            <div>
              <strong className="text-[#00687a] block">Hướng đặt phôi in đề xuất bởi AI Slicer:</strong>
              <span className="text-[#1C1C1C]">{printability.recommendedOrientation}</span>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#1C1C1C]">Danh sách phân tích chi tiết:</div>
            {printability.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border text-xs flex items-start gap-2.5 ${
                  issue.severity === 'high'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : issue.severity === 'medium'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}
              >
                <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
                  {issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'check_circle'}
                </span>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>{issue.code}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded border bg-white/70">
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
            <div className="bg-[#F7F6F2] p-3.5 border border-black/10 rounded">
              <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block">Độ Kín Nước</span>
              <span className="font-tech font-bold text-[#1C1C1C] flex items-center gap-1 mt-1 text-xs text-emerald-700">
                <span className="material-symbols-outlined text-xs">verified</span>
                {file.isWatertight ? '100% Watertight' : 'Non-manifold'}
              </span>
            </div>

            <div className="bg-[#F7F6F2] p-3.5 border border-black/10 rounded">
              <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block">Số Tam Giác</span>
              <span className="font-tech font-bold text-[#1C1C1C] mt-1 block text-xs">
                {file.triangleCount.toLocaleString()} triangles
              </span>
            </div>

            <div className="bg-[#F7F6F2] p-3.5 border border-black/10 rounded">
              <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block">Diện Tích Bề Mặt</span>
              <span className="font-tech font-bold text-[#1C1C1C] mt-1 block text-xs">
                {file.surfaceArea.toFixed(1)} cm²
              </span>
            </div>

            <div className="bg-[#F7F6F2] p-3.5 border border-black/10 rounded">
              <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block">Cạnh Non-manifold</span>
              <span className={`font-tech font-bold mt-1 block text-xs ${file.nonManifoldEdges > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                {file.nonManifoldEdges} cạnh
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-black/10 rounded">
              <span className="text-[#7D7565] block text-[10px] uppercase font-bold">Vector Pháp Tuyến Nghịch (Inverted):</span>
              <span className="font-tech font-bold text-[#1C1C1C]">{file.invertedNormals} faces</span>
            </div>
            <div className="p-3 bg-slate-50 border border-black/10 rounded">
              <span className="text-[#7D7565] block text-[10px] uppercase font-bold">Độ Dày Thành Tối Thiểu (Min Wall):</span>
              <span className="font-tech font-bold text-[#1C1C1C]">{file.minWallThickness} mm</span>
            </div>
          </div>
        </div>
      )}

      {/* Level 1: File Metadata QA */}
      {activeTab === 'level1' && (
        <div className="space-y-3 text-xs font-sans">
          <div className="p-3.5 bg-[#F7F6F2] border border-black/10 rounded space-y-2">
            <div className="flex justify-between">
              <span className="text-[#7D7565]">Tên tập tin:</span>
              <span className="font-bold text-[#1C1C1C]">{file.fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7D7565]">Định dạng:</span>
              <span className="font-tech font-bold text-[#00687a]">{file.format} CAD Standard</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7D7565]">Dung lượng:</span>
              <span className="font-tech text-[#1C1C1C]">{file.fileSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7D7565]">Mã băm SHA-256:</span>
              <span className="font-tech text-[10px] text-[#7D7565] truncate max-w-[200px]">
                {file.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
