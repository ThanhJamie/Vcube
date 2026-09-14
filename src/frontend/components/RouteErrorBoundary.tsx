/**
 * RouteErrorBoundary — lưới an toàn cấp ROUTE (U0-2 / B0-3).
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * Trước file này toàn app chỉ có DUY NHẤT một ErrorBoundary: `CanvasErrorBoundary`, và nó
 * chỉ bọc khung 3D (`Tool3DView.tsx:1099-1131`). Một throw khi render ở bất kỳ view nào
 * làm React unmount cả cây ⇒ trắng cả app. Đã tái hiện thật: `/quote` trắng hoàn toàn khi
 * khách upload tệp CAD (`QuoteSummaryPanel.tsx:183` gọi engine ngay trong render).
 *
 * HỢP ĐỒNG
 * --------
 * - Render trong `App.tsx`, bọc `<Routes>`, NGAY TRONG `<BrowserRouter>`.
 * - Trung thực: in NGUYÊN VĂN `error.message`, không viết lại, không thêm mã lỗi giả.
 *   (`docs/design/data-honesty.md` — không bịa.)
 * - Đây là class component nên không dùng được hook: điều hướng về trang chủ nhận qua prop
 *   `onGoHome` (do `App.tsx` truyền `handleNavigate('home')`); không truyền ⇒ ẩn nút.
 * - `resetKey` (App truyền `location.pathname`): đổi route ⇒ xoá trạng thái lỗi. Không có
 *   nhánh này thì bấm link ở Header vẫn thấy nguyên màn lỗi vì boundary đã render fallback.
 * - `componentDidCatch` log ra console: truy vết được, không nuốt lỗi.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, EmptyState, Icon } from '@frontend/ui';

interface Props {
  children: ReactNode;
  /** App truyền `location.pathname`: đổi giá trị ⇒ xoá trạng thái lỗi. */
  resetKey?: string;
  /** Điều hướng về trang chủ; không truyền thì nút "Về trang chủ" không hiện. */
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: unknown): State {
    // `throw 'chuỗi'` vẫn phải hiện đúng cái đã throw, không được nuốt thành chuỗi rỗng.
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RouteErrorBoundary caught render error:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleGoHome = () => {
    // Xoá lỗi TRƯỚC khi điều hướng: boundary bọc `<Routes>`, giữ `hasError` thì trang chủ
    // cũng bị thay bằng màn lỗi.
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onGoHome?.();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
      >
        <EmptyState
          bordered
          icon={<Icon name="error" size={20} />}
          title="Trang này không hiển thị được"
          description="Một lỗi xảy ra trong lúc render trang nên nội dung bị dừng. Thông báo lỗi thật ở ngay bên dưới."
          action={
            <>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="refresh" size={16} />}
                onClick={this.handleRetry}
              >
                Thử lại
              </Button>
              {this.props.onGoHome ? (
                <Button
                  size="sm"
                  leadingIcon={<Icon name="home" size={16} />}
                  onClick={this.handleGoHome}
                >
                  Về trang chủ
                </Button>
              ) : null}
            </>
          }
        />

        {/* Nguyên văn thông báo lỗi — không viết lại, không rút gọn. */}
        <div className="w-full max-w-2xl rounded-lg border border-danger/40 bg-danger-tint p-3">
          <p className="mb-1 text-xs font-semibold text-fg">Thông báo lỗi (nguyên văn)</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-danger">
            {this.state.errorMessage}
          </pre>
        </div>
      </div>
    );
  }
}
