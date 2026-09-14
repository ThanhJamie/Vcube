import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from '@frontend/ui';

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
          } bg-surface-inverse border border-surface-inverse-raised rounded-lg flex flex-col items-center justify-center p-6 text-center text-on-inverse relative overflow-hidden font-sans`}
        >
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#57DFFE 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          {/* Top Engine HUD Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono pointer-events-none z-panel">
            <div className="bg-surface-inverse/90 border border-line px-3 py-1 rounded-lg flex items-center gap-2 text-accent">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-bold">VCUBE MESH ENGINE v2.6</span>
              <span className="text-fg-subtle">//</span>
              <span className="text-warning text-xs font-semibold uppercase">Render Error</span>
            </div>
          </div>

          <div className="w-14 h-14 rounded-lg bg-primary-tint border border-primary/30 flex items-center justify-center text-accent mb-3 relative z-sticky shadow-e2">
            <Icon name="view_in_ar" size={30} />
          </div>

          <h3 className="font-extrabold text-base text-on-inverse tracking-tight mb-1 relative z-sticky">
            {this.props.fallbackTitle || 'Không dựng được khung 3D — thử tải lại'}
          </h3>

          <p className="text-xs text-fg-subtle max-w-md mx-auto mb-3 leading-relaxed relative z-sticky">
            Khung nhìn 3D gặp lỗi khi dựng. Phần còn lại của trang vẫn dùng bình thường; bấm nút bên dưới để dựng lại khung 3D.
          </p>

          {this.state.errorMessage && (
            <div className="mb-4 px-3 py-1 bg-surface-inverse/70 border border-line rounded-lg text-xs font-mono text-accent max-w-sm truncate relative z-sticky">
              Mã lỗi: {this.state.errorMessage}
            </div>
          )}

          <div className="flex items-center gap-3 relative z-sticky">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-mono font-bold uppercase tracking-wider rounded-full transition-all shadow-e2 hover:shadow-e2 flex items-center gap-2 cursor-pointer"
            >
              <Icon name="refresh" size={18} />
              <span>Kích Hoạt Lại Engine 3D</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

