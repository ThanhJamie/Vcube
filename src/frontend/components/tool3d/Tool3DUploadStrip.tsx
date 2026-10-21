import React from 'react';
import { Button, Icon } from '@frontend/ui';
import type { AnalysisFile } from '@/types';

/**
 * Thanh "Tệp đang xử lý" + khối kéo–thả mở rộng của /quote — block-move từ
 * `views/Tool3DView.tsx` dòng 990–1097. Identifier giữ nguyên tên (nay là props).
 */
export interface Tool3DUploadStripProps {
  isAnalyzing: boolean;
  uploadExpanded: boolean;
  setUploadExpanded: (value: boolean) => void;
  dragOver: boolean;
  setDragOver: (value: boolean) => void;
  handleActualFileUpload: (file: File) => Promise<void> | void;
  workspaceFileRef: React.RefObject<HTMLInputElement | null>;
  selectedFile: AnalysisFile;
}

export const Tool3DUploadStrip: React.FC<Tool3DUploadStripProps> = ({
  isAnalyzing,
  uploadExpanded,
  setUploadExpanded,
  dragOver,
  setDragOver,
  handleActualFileUpload,
  workspaceFileRef,
  selectedFile
}) => (
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
          className={`border-2 border-dashed transition-colors bg-surface rounded-lg ${
            uploadExpanded ? 'p-8 text-center' : 'p-3 sm:p-3.5'
          } ${dragOver ? 'border-line-control bg-surface-muted' : 'border-line hover:border-line-control hover:bg-surface-muted'}`}
        >
          {isAnalyzing ? (
            <div className="py-6 space-y-3 font-mono">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent animate-spin motion-reduce:animate-none mx-auto rounded-full"></div>
              <p className="text-xs uppercase tracking-widest text-primary font-bold">
                Đang giải mã lưới 3D, bóc tách cấu trúc tam giác và tính toán thể tích...
              </p>
              <span className="text-xs text-fg-subtle">Đang đọc cấu trúc lưới bằng WebGL (Three.js)</span>
              <div className="mx-auto h-2 w-48 rounded-md bg-surface-muted animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            </div>
          ) : uploadExpanded ? (
            <div className="max-w-xl mx-auto space-y-3.5">
              <div className="w-12 h-12 bg-surface-muted border border-line text-fg-muted flex items-center justify-center mx-auto rounded-md">
                <Icon name="cloud_upload" size={28} />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-bold text-base sm:text-lg text-fg">
                  Kéo & thả tệp CAD 3D vào khung phân tích
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
                  Chọn tệp từ máy tính
                </Button>
                <input
                  ref={workspaceFileRef}
                  type="file"
                  accept=".stl,.3mf,.step,.obj,.iges"
                  className="hidden"
                  aria-label="Chọn tệp CAD khác để báo giá"
                  onChange={(e) => {
                    const picked = e.target.files && e.target.files[0];
                    // Reset value để chọn LẠI cùng một tệp vẫn kích hoạt onChange.
                    e.target.value = '';
                    if (picked) handleActualFileUpload(picked);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-left">
              <span className="w-9 h-9 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0">
                <Icon name="description" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-fg-subtle uppercase font-mono font-bold">
                  Tệp đang xử lý
                </p>
                <p className="text-sm font-bold text-fg truncate">
                  {selectedFile.fileName}
                  <span className="text-fg-subtle font-mono font-normal"> ({selectedFile.fileSize})</span>
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                leadingIcon={<Icon name="upload_file" size={16} />}
                onClick={() => setUploadExpanded(true)}
              >
                Đổi tệp khác
              </Button>
            </div>
          )}
        </div>
);
