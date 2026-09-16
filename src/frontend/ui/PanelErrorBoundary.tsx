/**
 * PanelErrorBoundary — lưới an toàn cấp PANEL (không phải cấp route).
 *
 * VÌ SAO CẦN: `RouteErrorBoundary` (App.tsx) bọc toàn bộ `<Routes>`; một throw khi render
 * một panel nặng (ví dụ `QuoteSummaryPanel` chỉ mount SAU khi nạp xong model) làm React
 * thay cả màn hình bằng trang lỗi — người dùng mất luôn nút chọn tệp. Boundary này giữ
 * phần còn lại của trang hoạt động và chỉ thay đúng panel bị lỗi.
 *
 * Hợp đồng:
 * - Class component (React bắt buộc cho error boundary).
 * - Trung thực: in NGUYÊN VĂN `error.message` (không viết lại, không bịa mã lỗi).
 * - `resetKey` đổi ⇒ tự xoá trạng thái lỗi (ví dụ đổi tệp/model đang chọn).
 * - `onRetry` tuỳ chọn: nút "Thử lại" gọi callback rồi xoá lỗi.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

interface PanelErrorBoundaryProps {
  children: ReactNode;
  /** Nhãn ngắn cho người dùng, ví dụ "Bảng báo giá". */
  label?: string;
  /** Đổi giá trị ⇒ xoá trạng thái lỗi (giống `RouteErrorBoundary.resetKey`). */
  resetKey?: string | number;
  onRetry?: () => void;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  public state: PanelErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: unknown): PanelErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PanelErrorBoundary caught render error:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: PanelErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRetry?.();
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label ?? 'Khu vực này';

    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger-tint p-4"
      >
        <div className="flex items-center gap-2 text-danger">
          <Icon name="error" size={18} />
          <p className="text-sm font-semibold text-fg">{label} không hiển thị được</p>
        </div>
        <p className="text-xs text-fg-muted">
          Một lỗi xảy ra khi render khu vực này. Phần còn lại của trang vẫn dùng bình thường.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-danger/30 bg-surface p-2 font-mono text-xs text-danger">
          {this.state.errorMessage}
        </pre>
        <div>
          <Button variant="secondary" size="sm" leadingIcon={<Icon name="refresh" size={16} />} onClick={this.handleRetry}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }
}
