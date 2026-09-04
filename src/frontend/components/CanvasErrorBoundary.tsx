import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    return { hasError: true, errorMessage: error.message || 'WebGL Context or Shader Exception' };
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
          } bg-[#091426] border border-[#1E293B] rounded-2xl flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden font-sans`}
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
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono pointer-events-none z-20">
            <div className="bg-[#091426]/90 border border-white/10 px-3 py-1 rounded-lg flex items-center gap-2 text-[#57DFFE]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold">VCUBE MESH ENGINE v2.6</span>
              <span className="text-slate-500">//</span>
              <span className="text-amber-400 text-[10px] font-semibold uppercase">Auto-Recovery Mode</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">ISO/ASTM 52900</span>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-[#57DFFE] mb-3 relative z-10 shadow-lg">
            <span className="material-symbols-outlined text-3xl">view_in_ar</span>
          </div>

          <h3 className="font-extrabold text-base text-white tracking-tight mb-1 relative z-10">
            {this.props.fallbackTitle || 'Không Gian 3D Đang Tự Động Phục Hồi'}
          </h3>

          <p className="text-xs text-slate-400 max-w-md mx-auto mb-3 leading-relaxed relative z-10">
            Hệ thống phát hiện tệp 3D vừa nạp cần chuẩn hóa cấu trúc lưới Mesh hoặc bộ nhớ đệm GPU cần cấp phát lại.
          </p>

          {this.state.errorMessage && (
            <div className="mb-4 px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-[11px] font-mono text-cyan-300 max-w-sm truncate relative z-10">
              Mã lỗi: {this.state.errorMessage}
            </div>
          )}

          <div className="flex items-center gap-3 relative z-10">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-[#00687A] hover:bg-[#005260] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-cyan-900/30 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Kích Hoạt Lại Engine 3D</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

