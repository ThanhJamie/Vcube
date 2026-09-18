import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Icon, Modal } from '@frontend/ui';

/**
 * Chuc nang "Quen mat khau" TAM AN.
 *
 * Ly do: repo chua co dich vu gui mail; `resetPasswordForEmail` phu thuoc SMTP cua
 * Supabase Auth (Dashboard -> Authentication -> Email) va chua duoc xac nhan.
 * Bat lai: cau hinh SMTP trong Dashboard, roi doi co nay thanh `true`.
 * Quyet dinh + audit: docs/plans/09-admin-settings.md SS8.
 */
export const ENABLE_PASSWORD_RESET = false;

/**
 * D7 — Google OAuth TAM GAC. Project CHUA bat Google provider trong Supabase Dashboard,
 * nen bam nut Google se di vao cho loi. Nut VAN CON trong code (khong xoa) nhung bi chan
 * boi co nay. Bat lai: cau hinh provider Google, roi doi co nay thanh `true`.
 * Quyet dinh: docs/plans/22-backlog-and-decisions.md (D7).
 */
export const ENABLE_GOOGLE_OAUTH = false;


interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'account';
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
    sendPasswordReset,
    logout
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'account' | 'forgot_password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
      // Bản phát hành KHÔNG có công cụ đổi góc nhìn: nút demo và màn chọn vai trò đã bị
      // xoá hẳn (N3), nên không còn nhánh nào render danh sách vai trò.
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
      // signInWithEmail đã dịch lỗi Supabase sang thông báo tiếng Việt; giữ nguyên nó.
      setError(err?.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
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
      // Vai trò KHÔNG do người đăng ký chọn: trigger fn_create_profile_for_new_user()
      // luôn tạo 'customer' trong public.user_profiles.role (SQL là nơi quyết định quyền).
      const result = await signUpWithEmail(email, password, fullName);
      if (result.hasSession) {
        // Có phiên thật ⇒ mới được nói "đã đăng nhập".
        if (onSuccess) onSuccess('Đăng ký thành công — bạn đã được đăng nhập.');
        onClose();
      } else {
        // Không có phiên (dự án bật xác nhận email) ⇒ KHÔNG hứa đã có quyền/đã đăng nhập.
        setSuccessInfo('Đã gửi yêu cầu đăng ký — kiểm tra email để xác nhận rồi đăng nhập.');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra trong quá trình tạo tài khoản.');
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
      await signInWithGoogle();
      if (onSuccess) onSuccess('Đang chuyển sang Google để xác thực…');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể đăng nhập bằng Google.');
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
      setError('Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeInfo = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return {
          label: 'Quản Trị Viên (Admin)',
          badgeClass: 'bg-info-tint text-info',
          icon: 'admin_panel_settings',
          color: 'text-info',
        };
      case 'designer':
        return {
          label: 'Tác Giả 3D (Creator)',
          badgeClass: 'bg-warning-tint text-warning',
          icon: 'design_services',
          color: 'text-warning',
        };
      case 'lab':
        return {
          label: 'Xưởng In MES (Lab Hub)',
          badgeClass: 'bg-positive-tint text-positive',
          icon: 'precision_manufacturing',
          color: 'text-positive',
        };
      default:
        return {
          label: 'Khách Hàng (Customer)',
          badgeClass: 'bg-primary-tint text-primary',
          icon: 'person',
          color: 'text-primary',
        };
    }
  };

  const activeRoleBadge = getRoleBadgeInfo(currentRole);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      bodyClassName="flex min-h-0 flex-1 flex-col"
      aria-label="Tài khoản VCUBE"
    >
        {/* Header */}
        <div className="bg-surface text-fg px-6 py-5 border-b border-line shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-primary-fg shadow-e2">
                <Icon name="view_in_ar" size={24} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl tracking-tight uppercase italic text-fg">VCUBE HUBS</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick logout button right in header if logged in */}
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Đăng xuất khỏi tài khoản"
                  className="px-3 py-1.5 text-xs font-bold text-danger bg-danger-tint hover:bg-canvas rounded-full flex items-center gap-1.5 transition-colors cursor-pointer mr-1"
                >
                  <Icon name="logout" size={18} />
                  <span className="hidden sm:inline">Đăng Xuất</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-fg-muted hover:text-fg transition-colors p-1.5 rounded-full hover:bg-surface-muted cursor-pointer"
                aria-label="Đóng popup"
              >
                <Icon name="close" size={24} />
              </button>
            </div>
          </div>

          {/* Active Logged-in Mini Status Bar */}
          {isLoggedIn && (
            <div className="mt-3.5 pt-2.5 border-t border-line flex items-center justify-between text-xs bg-on-inverse/5 px-3.5 py-2 rounded-lg">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-positive animate-pulse motion-reduce:animate-none shrink-0"></span>
                <span className="text-on-inverse/70 text-xs">Đang đăng nhập:</span>
                <span className="font-bold text-on-inverse truncate text-xs">{profile?.displayName || user?.user_metadata?.full_name || 'Thành viên'}</span>
                <span className={`text-xs font-tech uppercase px-2 py-0.5 rounded-full font-bold ${activeRoleBadge.badgeClass}`}>
                  {currentRole}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'account' ? 'signin' : 'account');
                  setError(null);
                }}
                className="text-xs text-accent hover:underline font-bold shrink-0 ml-2 cursor-pointer"
              >
                {mode === 'account' ? 'Đổi tài khoản' : 'Xem tài khoản'}
              </button>
            </div>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-5 pb-0 bg-surface shrink-0">
          <div className="flex p-1 bg-surface-muted rounded-full text-xs font-sans font-bold">
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => { setMode('account'); setError(null); setSuccessInfo(null); }}
                className={`flex-1 py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'account'
                    ? 'bg-surface text-primary shadow-e1 font-bold'
                    : 'text-fg-subtle hover:text-fg'
                }`}
              >
                <Icon name="account_circle" size={18} />
                <span>Tài Khoản</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSuccessInfo(null); }}
              className={`flex-1 py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-surface text-primary shadow-e1 font-bold'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              <Icon name="login" size={18} />
              <span>{isLoggedIn ? 'Đổi Tài Khoản' : 'Đăng Nhập'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSuccessInfo(null); }}
              className={`flex-1 py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-surface text-primary shadow-e1 font-bold'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              <Icon name="person_add" size={18} />
              <span>Đăng Ký</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-danger-tint text-danger text-xs rounded-md flex items-start gap-2 animate-in fade-in duration-150">
              <Icon name="error" size={18} className="shrink-0 mt-0.5 text-danger" />
              <div className="flex-1 leading-relaxed">{error}</div>
              <button aria-label="Đóng" onClick={() => setError(null)} className="text-danger/70 hover:text-danger cursor-pointer">
                <Icon name="close" size={18} />
              </button>
            </div>
          )}

          {successInfo && (
            <div className="p-3 bg-positive-tint text-positive text-xs rounded-md flex items-start gap-2 animate-in fade-in duration-150">
              <Icon name="check_circle" size={18} className="shrink-0 mt-0.5 text-positive" />
              <div className="flex-1 leading-relaxed">{successInfo}</div>
              <button aria-label="Đóng" onClick={() => setSuccessInfo(null)} className="text-positive hover:text-positive cursor-pointer">
                <Icon name="close" size={18} />
              </button>
            </div>
          )}

          {/* LOGOUT CONFIRMATION MODAL / PANEL */}
          {showLogoutConfirm && (
            <div className="p-4 bg-danger-tint rounded-lg space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 text-danger font-bold text-sm">
                <Icon name="warning" size={24} className="text-danger" />
                <span>Xác nhận đăng xuất tài khoản</span>
              </div>
              <p className="text-xs text-danger leading-relaxed">
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản{' '}
                <strong className="font-semibold">{profile?.displayName || user?.user_metadata?.full_name || 'hiện tại'}</strong>{' '}
                ({profile?.email || user?.email})?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="flex-1 py-2 px-3 bg-danger hover:bg-danger text-on-inverse font-bold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-e1 cursor-pointer"
                >
                  {loading ? (
                    <Icon name="sync" size={18} className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Icon name="logout" size={18} />
                  )}
                  Đăng Xuất Ngay
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 bg-surface hover:bg-canvas text-fg font-semibold text-xs rounded-full transition-colors cursor-pointer"
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
              <div className="p-4 rounded-lg bg-surface-muted space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md flex items-center justify-center font-bold text-lg text-primary-fg shadow-e1 bg-primary">
                      {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'V'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-fg">
                          {profile?.displayName || user?.user_metadata?.full_name || 'Thành viên VCUBE'}
                        </h4>
                        <span className={`text-xs font-tech uppercase px-2 py-0.5 rounded-full font-bold ${activeRoleBadge.badgeClass}`}>
                          {activeRoleBadge.label}
                        </span>
                      </div>
                      <p className="text-xs text-fg-subtle font-mono mt-0.5">
                        {profile?.email || user?.email || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line-subtle text-xs">
                  <div className="p-2 rounded-sm bg-surface">
                    <span className="text-fg-subtle block text-xs uppercase font-tech">Phương thức xác thực:</span>
                    <span className="font-semibold text-fg">
                      {user?.app_metadata?.provider === 'google' ? 'Google OAuth' : user ? 'Supabase Auth' : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded-sm bg-surface">
                    <span className="text-fg-subtle block text-xs uppercase font-tech">Trạng thái tài khoản:</span>
                    <span className="font-semibold text-positive flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-positive"></span>
                      Đang hoạt động (Active)
                    </span>
                  </div>
                </div>

                {profile?.company && (
                  <p className="text-xs text-fg-subtle italic">
                    Tổ chức / Đơn vị: <strong className="text-fg not-italic">{profile.company}</strong>
                  </p>
                )}
              </div>

              {/* Action Buttons for Logged In User */}
              <div className="space-y-2 pt-1">
                {/* PROMINENT LOGOUT BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-2.5 px-4 bg-danger-tint hover:bg-danger text-danger hover:text-on-inverse font-sans text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-2 shadow-e1 group cursor-pointer"
                >
                  <Icon name="logout" size={18} className="group-hover:text-on-inverse transition-colors" />
                  <span>Đăng Xuất Khỏi Thiết Bị Này</span>
                </button>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null); }}
                    className="w-full py-2 px-3 bg-surface hover:bg-surface-muted text-xs font-bold text-fg rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="swap_horiz" size={18} className="text-primary" />
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
                <div className="p-3 bg-warning-tint rounded-md flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-warning">
                    <Icon name="info" size={18} className="text-warning" />
                    <span>Bạn đang đăng nhập: <strong>{profile?.displayName}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="text-danger hover:text-danger font-bold underline text-xs cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}

              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                    Email hoặc Mã định danh
                  </label>
                  <div className="relative">
                    <Icon name="account_circle" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                    <input
                      type="text"
                      required
                      placeholder="name@domain.vn hoặc UID-xxxxx"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface-muted border border-line-subtle rounded-md text-sm text-fg placeholder-fg-subtle focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition font-sans"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                      Mật khẩu
                    </label>
                    {ENABLE_PASSWORD_RESET && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot_password'); setError(null); }}
                        className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                    {/* Cờ reset đang tắt ⇒ chữ tĩnh thay nút, không link/alert, không hotline bịa. */}
                    {!ENABLE_PASSWORD_RESET && (
                      <span className="text-fg-muted text-xs">Quên mật khẩu? Liên hệ hỗ trợ</span>
                    )}
                  </div>
                  <div className="relative">
                    <Icon name="lock" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Nhập mật khẩu truy cập"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-surface-muted border border-line-subtle rounded-md text-sm text-fg placeholder-fg-subtle focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-fg-subtle hover:text-fg transition cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-fg-muted font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-sm text-primary border-line-control focus:ring-primary cursor-pointer"
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm rounded-full shadow-e2 transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Icon name="sync" size={18} className="animate-spin motion-reduce:animate-none text-primary-fg" />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập</span>
                      <Icon name="arrow_forward" size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

            {/* D7 — Google OAuth tam gac: xem `ENABLE_GOOGLE_OAUTH` o AuthModal.tsx */}
            {ENABLE_GOOGLE_OAUTH && (
              <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-line-subtle" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-surface px-3 text-fg-subtle font-mono text-xs uppercase">
                        Hoặc tiếp tục với
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-surface hover:bg-surface-muted border border-line-subtle rounded-full text-xs font-bold text-fg transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
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
              </>
            )}
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. SIGN UP VIEW                                           */}
          {/* ======================================================== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4 animate-in fade-in duration-150">
              {/* Vai trò: nói đúng sự thật — đăng ký luôn là Khách hàng, quyền khác do VCUBE duyệt */}
              <div className="p-3.5 rounded-md bg-info-tint flex items-start gap-2.5 text-xs text-info">
                <Icon name="info" size={18} className="text-info shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium space-y-0.5">
                  <p className="font-bold">Tài khoản mới có vai trò Khách hàng.</p>
                  <p>
                    Vai trò được đọc từ hồ sơ trên máy chủ (user_profiles.role). Muốn trở thành
                    Tác giả 3D hoặc Xưởng in, hãy gửi yêu cầu để VCUBE duyệt sau khi đăng nhập.
                  </p>
                </div>
              </div>

              {/* 2-Column: Full Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                    Họ và Tên
                  </label>
                  <div className="relative">
                    <Icon name="person" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn Minh"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface-muted border border-line-subtle rounded-md text-sm text-fg placeholder-fg-subtle focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Icon name="mail" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                    <input
                      type="email"
                      required
                      placeholder="contact@doanhnghiep.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface-muted border border-line-subtle rounded-md text-sm text-fg placeholder-fg-subtle focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* 2-Column: Password and Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Icon name="lock" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Ít nhất 6 ký tự"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface-muted border border-line-subtle rounded-md text-sm text-fg placeholder-fg-subtle focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition font-sans"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Icon name="lock_reset" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface-muted border border-line-subtle rounded-md text-sm text-fg placeholder-fg-subtle focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-fg-subtle pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-primary border-line-control focus:ring-primary cursor-pointer"
                  />
                  <span>Hiện mật khẩu</span>
                </label>
                <span className="font-medium text-xs">
                  Mật khẩu:{' '}
                  <span className={password.length >= 8 ? 'text-positive font-bold' : password.length >= 6 ? 'text-warning font-bold' : 'text-fg-subtle'}>
                    {password.length >= 8 ? 'Mạnh' : password.length >= 6 ? 'Hợp lệ' : 'Tối thiểu 6 ký tự'}
                  </span>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm rounded-full shadow-e2 transition-all flex items-center justify-center gap-2 group mt-3 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Icon name="sync" size={18} className="animate-spin motion-reduce:animate-none text-primary-fg" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Tạo tài khoản ngay</span>
                    <Icon name="arrow_forward" size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* 4. FORGOT PASSWORD VIEW                                   */}
          {/* ======================================================== */}
          {ENABLE_PASSWORD_RESET && mode === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                  Địa chỉ Email đã đăng ký
                </label>
                <div className="relative">
                  <Icon name="mail" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                  <input
                    type="email"
                    required
                    placeholder="engineer@vcube.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-surface-muted border border-line-subtle rounded-md text-sm text-fg placeholder-fg-subtle focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 px-4 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-wider rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-e2 cursor-pointer"
                >
                  {loading && <Icon name="sync" size={18} className="animate-spin motion-reduce:animate-none text-primary-fg" />}
                  <span>Gửi Hướng Dẫn Đặt Lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setSuccessInfo(null); }}
                  className="px-5 py-3.5 bg-surface hover:bg-surface-muted text-xs font-bold text-fg rounded-full transition-colors cursor-pointer"
                >
                  Quay lại
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-canvas px-4 sm:px-5 py-3 border-t border-line text-xs text-fg-subtle flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="lock" size={18} className="text-primary" />
            <span>Phiên đăng nhập do Supabase Auth quản lý</span>
          </div>

          <div className="flex items-center gap-3 font-semibold">
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className="text-primary hover:underline cursor-pointer"
              >
                Chưa có tài khoản? Đăng ký ngay
              </button>
            )}

            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className="text-primary hover:underline cursor-pointer"
              >
                Đã có tài khoản? Đăng nhập
              </button>
            )}

            {ENABLE_PASSWORD_RESET && mode === 'forgot_password' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className="text-primary hover:underline cursor-pointer"
              >
                Quay lại màn hình đăng nhập
              </button>
            )}

            {mode === 'account' && (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="text-danger hover:text-danger font-bold hover:underline cursor-pointer"
              >
                Đăng xuất tài khoản
              </button>
            )}
          </div>
        </div>
    </Modal>
  );
};
