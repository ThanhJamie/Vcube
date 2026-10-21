import React from 'react';
import { Icon } from '@frontend/ui';
import type { ParseFailure } from './tool3dAnalysis';

/* Block-move từ `views/Tool3DView.tsx` dòng 212–286 — presentational, không đổi logic/copy/class. */
/**
 * Q2 (MP-01): panel lỗi đọc tệp — thay hẳn `recoveryFile` + hộp phôi dựng sẵn +
 * toast "đã khởi tạo mô hình CAD phôi an toàn". Không mô hình, không số đo, không nút báo giá.
 */
export const ParseFailurePanel: React.FC<{
  failure: ParseFailure;
  manualReviewNoteShown: boolean;
  onRetry: () => void;
  onPickAnother: (file: File) => void;
  onRequestManualReview: () => void;
}> = ({ failure, manualReviewNoteShown, onRetry, onPickAnother, onRequestManualReview }) => (
  <div
    role="alert"
    className="bg-warning-tint border border-warning/20 rounded-lg p-4 sm:p-5 space-y-3 font-sans"
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
        className="px-4 h-10 max-md:min-h-11 bg-surface hover:bg-surface-muted border border-line-control text-fg text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Icon name="restart_alt" size={18} />
        Thử lại
      </button>

      <label className="px-4 h-10 bg-surface hover:bg-surface-muted border border-line-control text-fg text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer">
        <Icon name="upload_file" size={18} />
        <span>Chọn tệp khác</span>
        <input
          type="file"
          accept=".stl,.3mf,.step,.obj,.iges"
          className="hidden"
          aria-label="Chọn tệp CAD khác"
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
        className="px-4 h-10 max-md:min-h-11 bg-surface hover:bg-surface-muted text-fg border border-line-control text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Icon name="send" size={18} />
        Gửi yêu cầu thẩm định thủ công
      </button>
    </div>

    {manualReviewNoteShown && (
      <p className="text-xs text-fg-muted border-t border-warning/20 pt-3">
        Hệ thống chưa có kênh gửi hồ sơ tự động tới xưởng, nên KHÔNG có yêu cầu nào được gửi đi và
        cũng không có thông báo "đã gửi". Vui lòng dùng khung chat hỗ trợ ở góc màn hình, đính kèm{' '}
        <strong>{failure.fileName}</strong> để chuyển cho xưởng thẩm định.
      </p>
    )}
  </div>
);
