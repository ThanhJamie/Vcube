import React from 'react';
import { Button, EmptyState, Icon, InfoTip } from '@frontend/ui';
import type { AnalysisFile, MaterialProfile, PrinterProfile } from '@/types';
import { ParseFailurePanel } from './ParseFailurePanel';
import type { ParseFailure } from './tool3dAnalysis';

/**
 * Khối `if (!selectedFile) return (...)` của /quote — block-move từ `views/Tool3DView.tsx`
 * dòng 611–715. Mọi identifier giữ NGUYÊN TÊN như trong view gốc (nay là props cùng tên)
 * để phần JSX không bị sửa một ký tự nào.
 */
export interface Tool3DEmptyStateProps {
  isAnalyzing: boolean;
  dragOver: boolean;
  setDragOver: (value: boolean) => void;
  handleActualFileUpload: (file: File) => Promise<void> | void;
  emptyStateFileRef: React.RefObject<HTMLInputElement | null>;
  parseFailure: ParseFailure | null;
  manualReviewNoteShown: boolean;
  setManualReviewNoteShown: (value: boolean) => void;
  currentPrinter: PrinterProfile | undefined;
  currentMaterial: MaterialProfile | undefined;
  /** Giữ trong props để khớp chữ ký cũ; hiện khối rỗng không dùng tới. */
  selectedFile?: AnalysisFile | null;
}

export const Tool3DEmptyState: React.FC<Tool3DEmptyStateProps> = ({
  isAnalyzing,
  dragOver,
  setDragOver,
  handleActualFileUpload,
  emptyStateFileRef,
  parseFailure,
  manualReviewNoteShown,
  setManualReviewNoteShown,
  currentPrinter,
  currentMaterial
}) => (
      <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="pb-6 border-b border-line">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase tracking-wider text-fg-muted font-semibold">
                KIỂM TRA HÌNH HỌC & CẮT LỚP TỰ ĐỘNG // BỘ MÁY LƯỚI 3D VCUBE v2.6
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              Xưởng phân tích & báo giá 3D tức thì
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
            className={`rounded-lg border-2 border-dashed bg-surface p-8 text-center transition-colors ${
              dragOver ? 'border-line-control bg-surface-muted' : 'border-line hover:border-line-control hover:bg-surface-muted'
            }`}
          >
            {isAnalyzing ? (
              <div className="py-10 space-y-3 font-mono text-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent animate-spin motion-reduce:animate-none mx-auto rounded-full" />
                <p className="text-xs uppercase tracking-widest text-primary font-bold">
                  Đang giải mã lưới 3D, bóc tách cấu trúc tam giác và tính toán thể tích...
                </p>
                <span className="text-xs text-fg-subtle">Đang đọc cấu trúc lưới bằng WebGL (Three.js)</span>
                <div className="mx-auto h-2 w-48 rounded-md bg-surface-muted animate-pulse motion-reduce:animate-none" aria-hidden="true" />
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
                      aria-label="Chọn tệp CAD để báo giá"
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
        </div>
      </div>
);
