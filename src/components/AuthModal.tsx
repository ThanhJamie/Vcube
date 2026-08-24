import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'role_select';
  onSuccess?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess,
}) => {
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    switchDemoRole, 
    role: currentRole,
    profile
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'role_select'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        if (onSuccess) onSuccess('Đăng nhập thành công vào VCUBE');
        onClose();
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Vui lòng nhập họ tên đầy đủ');
        }
        await signUpWithEmail(email, password, fullName, selectedRole);
        if (onSuccess) onSuccess(`Đăng ký thành công với quyền ${selectedRole.toUpperCase()}`);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được đăng ký tài khoản.');
      } else if (err.code === 'auth/weak-password') {
        setError('Mật khẩu cần ít nhất 6 ký tự.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Nhà cung cấp xác thực đang được cấu hình. Hệ thống đã tự động chuyển đổi sang phiên làm việc an toàn.');
      } else {
        setError(err.message || 'Có lỗi xảy ra trong quá trình xác thực.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle(selectedRole);
      if (onSuccess) onSuccess('Đăng nhập Google thành công');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể đăng nhập bằng Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickDemo = async (role: UserRole) => {
    setLoading(true);
    try {
      await switchDemoRole(role);
      if (onSuccess) onSuccess(`Đã chuyển quyền hoạt động: ${role.toUpperCase()}`);
      onClose();
    } catch (err: any) {
      setError('Lỗi khi chuyển quyền');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-[#091426]/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div className="relative bg-white border border-[#C5C6CD] w-full max-w-md shadow-2xl rounded z-10 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#091426] text-white p-5 border-b border-[#1E293B] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-xl tracking-tight uppercase italic text-white">VCUBE</span>
              <span className="text-[10px] font-tech text-[#57DFFE] uppercase tracking-widest border-l border-white/20 pl-2">
                Hệ Thống Phân Quyền
              </span>
            </div>
            <p className="text-xs text-[#8590A6] font-sans mt-0.5">
              {mode === 'signin' && 'Đăng nhập vào không gian chế tác số'}
              {mode === 'signup' && 'Tạo tài khoản mới và chọn phân quyền'}
              {mode === 'role_select' && 'Chuyển đổi vai trò kiểm thử hệ thống'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8590A6] hover:text-white transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-[#C5C6CD] bg-[#F8F9FF] text-xs font-sans font-bold">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              mode === 'signin' 
                ? 'border-[#00687A] text-[#00687A] bg-white' 
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              mode === 'signup' 
                ? 'border-[#00687A] text-[#00687A] bg-white' 
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            Đăng Ký
          </button>
          <button
            type="button"
            onClick={() => { setMode('role_select'); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
              mode === 'role_select' 
                ? 'border-[#00687A] text-[#00687A] bg-white' 
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Demo RBAC
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-start gap-2">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Switcher Mode */}
          {mode === 'role_select' ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#EFF4FF] border border-[#C5C6CD] rounded text-xs">
                <p className="font-bold text-[#091426] mb-1">Kiểm thử phân quyền RBAC tức thì:</p>
                <p className="text-[#545F73] leading-relaxed">
                  Chọn một vai trò bên dưới để trải nghiệm ngay quyền truy cập tương ứng trên toàn bộ hệ thống VCUBE (không cần gõ mật khẩu).
                </p>
              </div>

              <div className="space-y-2.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isCurrent = profile?.role === acc.role;
                  return (
                    <div
                      key={acc.role}
                      onClick={() => handleSelectQuickDemo(acc.role)}
                      className={`p-3.5 border rounded cursor-pointer transition-all hover:border-[#00687A] ${
                        isCurrent 
                          ? 'border-[#00687A] bg-[#00687A]/5 ring-1 ring-[#00687A]' 
                          : 'border-[#C5C6CD] bg-white hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-lg ${
                            acc.role === 'admin' ? 'text-purple-600' : acc.role === 'designer' ? 'text-amber-600' : 'text-blue-600'
                          }`}>
                            {acc.role === 'admin' ? 'admin_panel_settings' : acc.role === 'designer' ? 'design_services' : 'person'}
                          </span>
                          <span className="font-bold text-xs text-[#091426]">{acc.title}</span>
                        </div>
                        <span className={`text-[9px] font-tech uppercase tracking-wider px-2 py-0.5 rounded ${
                          acc.role === 'admin' ? 'bg-purple-100 text-purple-800' : acc.role === 'designer' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {acc.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#545F73] font-sans mb-1.5">{acc.desc}</p>
                      <div className="flex items-center justify-between text-[10px] font-tech text-[#75777D] border-t border-[#E5EEFF] pt-1.5">
                        <span>Email: {acc.email}</span>
                        {isCurrent && <span className="font-bold text-[#00687A]">● Đang sử dụng</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Standard Auth Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#091426] uppercase tracking-wider mb-1">
                      Họ và Tên
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn Minh"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#C5C6CD] rounded text-xs text-[#091426] focus:border-[#00687A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#091426] uppercase tracking-wider mb-1.5">
                      Đăng ký với vai trò
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('customer')}
                        className={`p-2.5 border rounded text-left transition-all ${
                          selectedRole === 'customer'
                            ? 'border-[#00687A] bg-[#EFF4FF] text-[#00687A] font-bold'
                            : 'border-[#C5C6CD] text-[#545F73] hover:border-black/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs mb-0.5">
                          <span className="material-symbols-outlined text-sm">person</span>
                          Khách Hàng
                        </div>
                        <p className="text-[10px] opacity-80 leading-tight">Đặt in & mua tệp 3D</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('designer')}
                        className={`p-2.5 border rounded text-left transition-all ${
                          selectedRole === 'designer'
                            ? 'border-[#00687A] bg-[#EFF4FF] text-[#00687A] font-bold'
                            : 'border-[#C5C6CD] text-[#545F73] hover:border-black/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs mb-0.5">
                          <span className="material-symbols-outlined text-sm">design_services</span>
                          Tác Giả 3D
                        </div>
                        <p className="text-[10px] opacity-80 leading-tight">Bán CAD & nhận hoa hồng</p>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-[#091426] uppercase tracking-wider mb-1">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="engineer@vcube.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#C5C6CD] rounded text-xs text-[#091426] focus:border-[#00687A] focus:outline-none font-sans"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#091426] uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => alert('Vui lòng liên hệ Admin qua hotline 1900 6833 để reset mật khẩu')}
                      className="text-[11px] text-[#00687A] hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#C5C6CD] rounded text-xs text-[#091426] focus:border-[#00687A] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#00687A] hover:bg-[#005463] text-white font-sans text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                {mode === 'signin' ? 'Xác thực & Đăng Nhập' : 'Tạo Tài Khoản VCUBE'}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#C5C6CD]"></div>
                <span className="flex-shrink mx-3 text-[10px] text-[#75777D] font-tech uppercase">Hoặc</span>
                <div className="flex-grow border-t border-[#C5C6CD]"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2 px-3 border border-[#C5C6CD] hover:bg-[#F8FAFC] text-xs font-bold text-[#091426] rounded flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Tiếp tục với Google ID
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#F8FAFC] px-5 py-3 border-t border-[#C5C6CD] text-[11px] text-[#545F73] flex items-center justify-between">
          <span>Bảo mật AES-256 Cloud</span>
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-[#00687A] font-bold hover:underline"
          >
            {mode === 'signin' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};
