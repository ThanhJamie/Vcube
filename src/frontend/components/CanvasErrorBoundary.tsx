import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Icon } from '@frontend/ui';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackHeight?: string;
  className?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CanvasErrorBoundary caught WebGL error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className={`w-full ${
            this.props.fallbackHeight || 'h-[360px]'
          } bg-surface border border-line rounded-lg flex flex-col items-center justify-center p-6 text-center text-fg relative overflow-hidden font-sans`}
        >
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(var(--color-line) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          {/* Top Engine HUD Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono pointer-events-none z-panel">
            <div className="bg-surface/90 border border-line px-3 py-1 rounded-full flex items-center gap-2 text-fg-muted backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-danger" />
              <span className="font-bold text-fg-muted">BỘ MÁY LƯỚI 3D VCUBE v2.6</span>
              <span className="text-fg-subtle">//</span>
              <span className="text-danger text-xs font-semibold uppercase">Lỗi kết xuất 3D</span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-md bg-danger-tint border border-danger/20 flex items-center justify-center text-danger mb-3 relative z-sticky">
            <Icon name="view_in_ar" size={24} />
          </div>

          <h3 className="font-semibold text-base text-fg tracking-tight mb-1 relative z-sticky">
            {this.props.fallbackTitle || 'Không dựng được khung 3D — thử tải lại'}
          </h3>

          <p className="text-sm text-fg-muted max-w-md mx-auto mb-3 leading-relaxed relative z-sticky">
            Khung nhìn 3D gặp lỗi khi dựng. Phần còn lại của trang vẫn dùng bình thường; bấm nút bên dưới để dựng lại khung 3D.
          </p>

          {this.state.errorMessage && (
            <div className="mb-4 px-3 py-1 bg-danger-tint border border-danger/20 rounded-md text-xs font-mono text-danger max-w-sm truncate relative z-sticky">
              Mã lỗi: {this.state.errorMessage}
            </div>
          )}

          <div className="flex items-center gap-3 relative z-sticky">
            <Button
              variant="secondary"
              onClick={this.handleRetry}
              leadingIcon={<Icon name="refresh" size={16} />}
            >
              <span>Kích hoạt lại khung 3D</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

