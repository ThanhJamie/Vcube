import React, { useState, useEffect } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'role_select' | 'account';
  onSuccess?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess,
}) => {
  const { 
    user,
    profile,
    role: currentRole,
    isLoggedIn,
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    switchDemoRole, 
    sendPasswordReset,
    logout 
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'role_select' | 'account' | 'forgot_password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sync mode whenever initialMode or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessInfo(null);
      setShowLogoutConfirm(false);
      if (initialMode === 'account' || (isLoggedIn && initialMode === 'signin')) {
        setMode('account');
      } else {
        setMode(initialMode);
      }
    }
  }, [isOpen, initialMode, isLoggedIn]);

  if (!isOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);
    setLoading(true);

    try {
      await signInWithEmail(email, password);
      if (onSuccess) onSuccess('Đăng nhập thành công vào hệ thống VCUBE!');
      onClose();
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Quá nhiều lần thử không thành công. Vui lòng thử lại sau vài phút.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Nhà cung cấp xác thực đang được cấu hình. Đã tự động kích hoạt phiên demo an toàn.');
      } else {
        setError(err.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên đầy đủ của bạn.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, fullName, selectedRole);
      if (onSuccess) onSuccess(`Đăng ký thành công với quyền ${selectedRole.toUpperCase()}!`);
      onClose();
    } catch (err: any) {
      console.error('Sign up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Địa chỉ email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.');
      } else if (err.code === 'auth/weak-password') {
        setError('Mật khẩu quá yếu. Vui lòng bổ sung thêm chữ số hoặc ký tự đặc biệt.');
      } else {
        setError(err.message || 'Có lỗi xảy ra trong quá trình tạo tài khoản.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Vui lòng nhập địa chỉ email cần khôi phục mật khẩu.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (sendPasswordReset) {
        await sendPasswordReset(email);
      }
      setSuccessInfo(`Đã gửi liên kết đặt lại mật khẩu tới hộp thư ${email}. Vui lòng kiểm tra hộp thư đến hoặc thư rác.`);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi email khôi phục mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessInfo(null);
    setLoading(true);
    try {
      await signInWithGoogle(selectedRole);
      if (onSuccess) onSuccess('Đăng nhập bằng Google ID thành công!');
      onClose();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Không thể đăng nhập bằng Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickDemo = async (targetRole: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await switchDemoRole(targetRole);
      if (onSuccess) onSuccess(`Đã chuyển phiên làm việc sang: ${targetRole.toUpperCase()}`);
      onClose();
    } catch (err: any) {
      setError('Lỗi khi chuyển vai trò thử nghiệm.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      await logout();
      setShowLogoutConfirm(false);
      setSuccessInfo('Đã đăng xuất tài khoản thành công!');
      if (onSuccess) onSuccess('Đã đăng xuất khỏi hệ thống VCUBE.');
      // Switch back to signin mode
      setMode('signin');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Logout error:', err);
      setError('Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to fill demo credentials in login box
  const handleQuickFill = (accEmail: string, accPass: string = 'Password123!@') => {
    setEmail(accEmail);
    setPassword(accPass);
    setError(null);
  };

  const getRoleBadgeInfo = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return {
          label: 'Quản Trị Viên (Admin)',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: 'admin_panel_settings',
          color: 'text-purple-700',
        };
      case 'designer':
        return {
          label: 'Tác Giả 3D (Creator)',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: 'design_services',
          color: 'text-amber-700',
        };
      default:
        return {
          label: 'Khách Hàng (Customer)',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: 'person',
          color: 'text-blue-700',
        };
    }
  };

  const activeRoleBadge = getRoleBadgeInfo(currentRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-[#091426]/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div className="relative bg-white border border-[#CBD5E1] w-full max-w-2xl shadow-2xl rounded-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#091426] text-white px-6 py-5 border-b border-[#1E293B] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00687A] to-[#0E7490] flex items-center justify-center font-bold text-white shadow-md">
                <span className="material-symbols-outlined text-xl">view_in_ar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl tracking-tight uppercase italic text-white">VCUBE HUBS</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick logout button right in header if logged in */}
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Đăng xuất khỏi tài khoản"
                  className="px-3 py-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-700/80 border border-rose-800/60 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer mr-1"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span className="hidden sm:inline">Đăng Xuất</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-[#94A3B8] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                aria-label="Đóng popup"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
          </div>

          {/* Active Logged-in Mini Status Bar */}
          {isLoggedIn && (
            <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs bg-white/5 px-3.5 py-2 rounded-lg">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="text-[#94A3B8] text-xs">Đang đăng nhập:</span>
                <span className="font-bold text-white truncate text-xs">{profile?.displayName || user?.user_metadata?.full_name || 'Thành viên'}</span>
                <span className={`text-[9px] font-tech uppercase px-2 py-0.5 rounded font-bold border ${activeRoleBadge.badgeClass}`}>
                  {currentRole}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'account' ? 'signin' : 'account');
                  setError(null);
                }}
                className="text-xs text-[#57DFFE] hover:underline font-bold shrink-0 ml-2 cursor-pointer"
              >
                {mode === 'account' ? 'Đổi tài khoản' : 'Xem tài khoản'}
              </button>
            </div>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-5 pb-0 bg-white shrink-0">
          <div className="flex p-1 bg-[#F1F5F9] rounded-xl text-xs font-sans font-bold">
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => { setMode('account'); setError(null); setSuccessInfo(null); }}
                className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'account' 
                    ? 'bg-white text-[#00687A] shadow-xs font-bold' 
                    : 'text-[#64748B] hover:text-[#091426]'
                }`}
              >
                <span className="material-symbols-outlined text-base">account_circle</span>
                <span>Tài Khoản</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSuccessInfo(null); }}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signin' 
                  ? 'bg-white text-[#00687A] shadow-xs font-bold' 
                  : 'text-[#64748B] hover:text-[#091426]'
              }`}
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>{isLoggedIn ? 'Đổi Tài Khoản' : 'Đăng Nhập'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSuccessInfo(null); }}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup' 
                  ? 'bg-white text-[#00687A] shadow-xs font-bold' 
                  : 'text-[#64748B] hover:text-[#091426]'
              }`}
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>Đăng Ký</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-start gap-2 animate-in fade-in duration-150">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-rose-600">error</span>
              <div className="flex-1 leading-relaxed">{error}</div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-700">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-start gap-2 animate-in fade-in duration-150">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-emerald-600">check_circle</span>
              <div className="flex-1 leading-relaxed">{successInfo}</div>
              <button onClick={() => setSuccessInfo(null)} className="text-emerald-500 hover:text-emerald-800">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* LOGOUT CONFIRMATION MODAL / PANEL */}
          {showLogoutConfirm && (
            <div className="p-4 bg-rose-50/90 border border-rose-300 rounded-lg space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 text-rose-900 font-bold text-sm">
                <span className="material-symbols-outlined text-rose-600">warning</span>
                <span>Xác nhận đăng xuất tài khoản</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản{' '}
                <strong className="font-semibold">{profile?.displayName || user?.user_metadata?.full_name || 'hiện tại'}</strong>{' '}
                ({profile?.email || user?.email})?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {loading ? (
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">logout</span>
                  )}
                  Đăng Xuất Ngay
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 bg-white border border-rose-300 hover:bg-rose-100/50 text-rose-800 font-semibold text-xs rounded transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. ACCOUNT DETAILS & LOGOUT VIEW                          */}
          {/* ======================================================== */}
          {mode === 'account' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Profile Card */}
              <div className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-xs ${
                      currentRole === 'admin' ? 'bg-purple-800' : currentRole === 'designer' ? 'bg-amber-600' : 'bg-[#00687A]'
                    }`}>
                      {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'V'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#091426]">
                          {profile?.displayName || user?.user_metadata?.full_name || 'Khách Mua Hàng'}
                        </h4>
                        <span className={`text-[9px] font-tech uppercase px-2 py-0.5 rounded font-bold border ${activeRoleBadge.badgeClass}`}>
                          {activeRoleBadge.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] font-mono mt-0.5">
                        {profile?.email || user?.email || 'guest@vcube.vn'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] text-[11px]">
                  <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[10px] uppercase font-tech">Phương thức xác thực:</span>
                    <span className="font-semibold text-[#091426]">
                      {user?.app_metadata?.provider === 'google' ? 'Google OAuth' : user ? 'Supabase Auth' : 'Phiên làm việc nội bộ'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[10px] uppercase font-tech">Trạng thái tài khoản:</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Đang hoạt động (Active)
                    </span>
                  </div>
                </div>

                {profile?.company && (
                  <p className="text-[11px] text-[#64748B] italic">
                    Tổ chức / Đơn vị: <strong className="text-[#091426] not-italic">{profile.company}</strong>
                  </p>
                )}
              </div>

              {/* Action Buttons for Logged In User */}
              <div className="space-y-2 pt-1">
                {/* PROMINENT LOGOUT BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 text-rose-700 hover:text-white font-sans text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-2 shadow-xs group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base group-hover:text-white transition-colors">logout</span>
                  <span>Đăng Xuất Khỏi Thiết Bị Này</span>
                </button>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null); }}
                    className="w-full py-2 px-3 border border-[#CBD5E1] hover:border-[#00687A] hover:bg-[#F8FAFC] text-xs font-bold text-[#091426] rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-[#00687A]">swap_horiz</span>
                    <span>Đổi Tài Khoản Khác</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. SIGN IN VIEW                                           */}
          {/* ======================================================== */}
          {mode === 'signin' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Notice if already logged in */}
              {isLoggedIn && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-900">
                    <span className="material-symbols-outlined text-amber-600 text-base">info</span>
                    <span>Bạn đang đăng nhập: <strong>{profile?.displayName}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="text-rose-600 hover:text-rose-800 font-bold underline text-[11px] cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}

              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                    Email hoặc Mã định danh
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-[20px]">
                      account_circle
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="name@domain.vn hoặc UID-xxxxx"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687A] focus:ring-2 focus:ring-[#00687A]/15 outline-none transition font-sans"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot_password'); setError(null); }}
                      className="text-xs text-[#00687A] hover:underline font-semibold cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-[20px]">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Nhập mật khẩu truy cập"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687A] focus:ring-2 focus:ring-[#00687A]/15 outline-none transition font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#334155] font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00687A] border-[#CBD5E1] focus:ring-[#00687A] cursor-pointer"
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 bg-[#091426] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin text-[#57DFFE]">sync</span>
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập</span>
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E2E8F0]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-[#64748B] font-mono text-[11px] uppercase">
                      Hoặc tiếp tục với
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F172A] transition flex items-center justify-center gap-2.5 cursor-pointer shadow-xs disabled:opacity-60"
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
                  <span>Đăng nhập với Google</span>
                </button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. SIGN UP VIEW                                           */}
          {/* ======================================================== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4 animate-in fade-in duration-150">
              {/* Role Selector: 3 options (Customer, Designer, Lab) - Modern Cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                  Vai trò đăng ký
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('customer')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedRole === 'customer'
                        ? 'border-[#00687A] bg-[#00687A]/5 ring-2 ring-[#00687A] text-[#00687A]'
                        : 'border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#94A3B8] text-[#334155]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedRole === 'customer' ? 'bg-[#00687A] text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <span className="material-symbols-outlined text-lg">person</span>
                      </div>
                      {selectedRole === 'customer' && (
                        <span className="w-2 h-2 rounded-full bg-[#00687A]"></span>
                      )}
                    </div>
                    <span className="text-xs font-bold block">Khách hàng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('designer')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedRole === 'designer'
                        ? 'border-[#00687A] bg-[#00687A]/5 ring-2 ring-[#00687A] text-[#00687A]'
                        : 'border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#94A3B8] text-[#334155]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedRole === 'designer' ? 'bg-[#00687A] text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <span className="material-symbols-outlined text-lg">draw</span>
                      </div>
                      {selectedRole === 'designer' && (
                        <span className="w-2 h-2 rounded-full bg-[#00687A]"></span>
                      )}
                    </div>
                    <span className="text-xs font-bold block">Thiết kế CAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('lab')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedRole === 'lab'
                        ? 'border-[#00687A] bg-[#00687A]/5 ring-2 ring-[#00687A] text-[#00687A]'
                        : 'border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#94A3B8] text-[#334155]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedRole === 'lab' ? 'bg-[#00687A] text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <span className="material-symbols-outlined text-lg">precision_manufacturing</span>
                      </div>
                      {selectedRole === 'lab' && (
                        <span className="w-2 h-2 rounded-full bg-[#00687A]"></span>
                      )}
                    </div>
                    <span className="text-xs font-bold block">Xưởng in 3D</span>
                  </button>
                </div>
              </div>

              {/* 2-Column: Full Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                    Họ và Tên
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-lg">person</span>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn Minh"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687A] focus:ring-2 focus:ring-[#00687A]/15 outline-none transition font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-lg">mail</span>
                    <input
                      type="email"
                      required
                      placeholder="engineer@vcube.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687A] focus:ring-2 focus:ring-[#00687A]/15 outline-none transition font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* 2-Column: Password and Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-lg">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Ít nhất 6 ký tự"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687A] focus:ring-2 focus:ring-[#00687A]/15 outline-none transition font-sans"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-lg">lock_reset</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687A] focus:ring-2 focus:ring-[#00687A]/15 outline-none transition font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00687A] border-[#CBD5E1] focus:ring-[#00687A] cursor-pointer"
                  />
                  <span>Hiện mật khẩu</span>
                </label>
                <span className="font-medium text-[11px]">Mật khẩu: {password.length >= 8 ? '🟢 Mạnh' : password.length >= 6 ? '🟡 Hợp lệ' : '⚪ Tối thiểu 6 ký tự'}</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 bg-[#091426] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group mt-3 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin text-[#57DFFE]">sync</span>
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Tạo tài khoản ngay</span>
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* 4. FORGOT PASSWORD VIEW                                   */}
          {/* ======================================================== */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                  Địa chỉ Email đã đăng ký
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-lg">mail</span>
                  <input
                    type="email"
                    required
                    placeholder="engineer@vcube.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687A] focus:ring-2 focus:ring-[#00687A]/15 outline-none transition font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 px-4 bg-[#091426] hover:bg-[#1E293B] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {loading && <span className="material-symbols-outlined text-sm animate-spin text-[#57DFFE]">sync</span>}
                  <span>Gửi Hướng Dẫn Đặt Lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setSuccessInfo(null); }}
                  className="px-5 py-3.5 border border-[#CBD5E1] hover:bg-[#F8FAFC] text-xs font-bold text-[#0F172A] rounded-xl transition-colors cursor-pointer"
                >
                  Quay lại
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* 5. DEMO RBAC MODE SWITCHER                                */}
          {/* ======================================================== */}
          {mode === 'role_select' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 bg-[#EFF4FF] border border-[#CBD5E1] rounded-md text-xs">
                <p className="font-bold text-[#091426] mb-1">Kiểm thử phân quyền RBAC tức thì:</p>
                <p className="text-[#64748B] leading-relaxed">
                  Nhấp vào một vai trò bất kỳ để chuyển quyền ngay lập tức trên toàn bộ giao diện (Khách Hàng, Tác Giả 3D, Admin) mà không cần mật khẩu.
                </p>
              </div>

              <div className="space-y-2.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isCurrent = currentRole === acc.role;
                  return (
                    <div
                      key={acc.role}
                      onClick={() => handleSelectQuickDemo(acc.role)}
                      className={`p-3.5 border rounded-lg cursor-pointer transition-all hover:border-[#00687A] ${
                        isCurrent 
                          ? 'border-[#00687A] bg-[#00687A]/5 ring-1 ring-[#00687A]' 
                          : 'border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]'
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
                        <span className={`text-[9px] font-tech uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                          acc.role === 'admin' ? 'bg-purple-100 text-purple-800' : acc.role === 'designer' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {acc.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] font-sans mb-1.5">{acc.desc}</p>
                      <div className="flex items-center justify-between text-[10px] font-tech text-[#94A3B8] border-t border-[#E2E8F0] pt-1.5">
                        <span>Email: {acc.email}</span>
                        {isCurrent ? (
                          <span className="font-bold text-[#00687A] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00687A]"></span>
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="text-[#00687A] hover:underline font-bold">Nhấp để kích hoạt →</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Logout button in demo mode */}
              {isLoggedIn && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full py-2 px-3 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#F8FAFC] px-4 sm:px-5 py-3 border-t border-[#CBD5E1] text-[11px] text-[#64748B] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#00687A]">lock</span>
            <span>Bảo mật AES-256 Cloud</span>
          </div>

          <div className="flex items-center gap-3 font-semibold">
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className="text-[#00687A] hover:underline cursor-pointer"
              >
                Chưa có tài khoản? Đăng ký ngay
              </button>
            )}

            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className="text-[#00687A] hover:underline cursor-pointer"
              >
                Đã có tài khoản? Đăng nhập
              </button>
            )}

            {mode === 'forgot_password' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className="text-[#00687A] hover:underline cursor-pointer"
              >
                Quay lại màn hình đăng nhập
              </button>
            )}

            {mode === 'account' && (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
              >
                Đăng xuất tài khoản
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
