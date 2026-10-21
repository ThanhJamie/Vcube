import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Button, ConfirmDialog, Field, Icon, Input, Modal } from '@frontend/ui';

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
  // T58 — loại tài khoản tự chọn khi đăng ký: chỉ 'customer' | 'designer'.
  const [signupRole, setSignupRole] = useState<'customer' | 'designer'>('customer');
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
      // T58: loại tài khoản người dùng chọn là gợi ý; trigger fn_create_profile_for_new_user()
      // chỉ ánh xạ đúng 'designer', mọi giá trị khác (kể cả 'admin') về 'customer'.
      // Quyền thật do public.user_profiles.role (SQL) quyết định.
      const result = await signUpWithEmail(email, password, fullName, signupRole);
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
          label: 'Quản trị viên',
          badgeClass: 'border border-info/20 bg-info-tint text-info',
          icon: 'admin_panel_settings',
          color: 'text-info',
        };
      case 'designer':
        return {
          label: 'Tác giả thiết kế 3D',
          badgeClass: 'border border-warning/20 bg-warning-tint text-warning',
          icon: 'design_services',
          color: 'text-warning',
        };
      case 'lab':
        return {
          label: 'Xưởng in (MES)',
          badgeClass: 'border border-positive/20 bg-positive-tint text-positive',
          icon: 'precision_manufacturing',
          color: 'text-positive',
        };
      default:
        return {
          label: 'Khách hàng',
          badgeClass: 'border border-primary/20 bg-primary-tint text-primary',
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
      bodyClassName="p-0"
      aria-label="Tài khoản VCUBE"
    >
      {/*
        CC-01 (B) — BẪY StrictMode: trước đây component `return null` khi đóng nên `<Modal>` chỉ
        được MOUNT lúc mở. Ở dev, StrictMode mount → cleanup → mount: cleanup của `Modal` gọi
        `dialog.close()` và sự kiện `close` bắn BẤT ĐỒNG BỘ vào listener của lần mount thứ hai ⇒
        `onClose()` ⇒ modal đóng ngay (nút "Đăng nhập" như bị chết). Cách sửa (cùng pattern
        `CadQuickViewModal`): **luôn render `<Modal>`** để effect mở dialog chạy đúng một lần;
        chỉ nội dung phụ thuộc trạng thái mở mới nằm sau guard. Props/hành vi/call-site không đổi.
      */}
      {isOpen && (
        <>
        {/* Header */}
        <div className="shrink-0 border-b border-line bg-surface px-6 py-5 text-fg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-fg">
                <Icon name="view_in_ar" size={20} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight uppercase text-fg">Trung tâm VCUBE</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick logout button right in header if logged in */}
              {isLoggedIn && (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Đăng xuất khỏi tài khoản"
                  aria-label="Đăng xuất khỏi tài khoản"
                  className="mr-1"
                  leadingIcon={<Icon name="logout" size={16} />}
                >
                  <span className="hidden sm:inline">Đăng Xuất</span>
                </Button>
              )}
              <Button
                iconOnly
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Đóng hộp thoại"
                leadingIcon={<Icon name="close" size={16} />}
              />
            </div>
          </div>

          {/* Active Logged-in Mini Status Bar */}
          {isLoggedIn && (
            <div className="mt-3.5 flex items-center justify-between rounded-lg border border-line-subtle bg-surface-muted px-3 py-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="size-2 shrink-0 animate-pulse rounded-full bg-positive motion-reduce:animate-none"></span>
                <span className="text-xs text-fg-muted">Đang đăng nhập:</span>
                <span className="truncate text-xs font-semibold text-fg">{profile?.displayName || user?.user_metadata?.full_name || 'Thành viên'}</span>
                <span className={`px-2 py-0.5 text-xs font-semibold uppercase rounded-full ${activeRoleBadge.badgeClass}`}>
                  {activeRoleBadge.label}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2 shrink-0"
                onClick={() => {
                  setMode(mode === 'account' ? 'signin' : 'account');
                  setError(null);
                }}
              >
                {mode === 'account' ? 'Đổi tài khoản' : 'Xem tài khoản'}
              </Button>
            </div>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="shrink-0 bg-surface px-6 pt-5 pb-0">
          <div className="inline-flex w-full items-center gap-1 rounded-full border border-line bg-surface-muted p-1">
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => { setMode('account'); setError(null); setSuccessInfo(null); }}
                aria-pressed={mode === 'account'}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  mode === 'account'
                    ? 'bg-surface font-semibold text-fg shadow-soft'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <Icon name="account_circle" size={16} />
                <span>Tài Khoản</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSuccessInfo(null); }}
              aria-pressed={mode === 'signin'}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                mode === 'signin'
                  ? 'bg-surface font-semibold text-fg shadow-soft'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name="login" size={16} />
              <span>{isLoggedIn ? 'Đổi Tài Khoản' : 'Đăng Nhập'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSuccessInfo(null); }}
              aria-pressed={mode === 'signup'}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                mode === 'signup'
                  ? 'bg-surface font-semibold text-fg shadow-soft'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name="person_add" size={16} />
              <span>Đăng Ký</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-5 p-6 sm:p-8">
          {/* Notifications */}
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger-tint p-3 text-sm text-danger">
              <Icon name="error" size={16} className="mt-0.5 shrink-0 text-danger" />
              <div className="flex-1 leading-relaxed">{error}</div>
              <Button iconOnly variant="ghost" size="sm" aria-label="Đóng thông báo lỗi" onClick={() => setError(null)}>
                <Icon name="close" size={16} />
              </Button>
            </div>
          )}

          {successInfo && (
            <div role="status" className="flex items-start gap-2 rounded-md border border-positive/20 bg-positive-tint p-3 text-sm text-positive">
              <Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-positive" />
              <div className="flex-1 leading-relaxed">{successInfo}</div>
              <Button iconOnly variant="ghost" size="sm" aria-label="Đóng thông báo" onClick={() => setSuccessInfo(null)}>
                <Icon name="close" size={16} />
              </Button>
            </div>
          )}

          {/* LOGOUT CONFIRMATION MODAL / PANEL */}
          <ConfirmDialog
            open={showLogoutConfirm}
            tone="danger"
            title="Xác nhận đăng xuất tài khoản"
            description={
              <>
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản{' '}
                <strong className="font-semibold">{profile?.displayName || user?.user_metadata?.full_name || 'hiện tại'}</strong>{' '}
                ({profile?.email || user?.email})?
              </>
            }
            confirmLabel="Đăng Xuất Ngay"
            cancelLabel="Hủy bỏ"
            loading={loading}
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutConfirm(false)}
          />

          {/* ======================================================== */}
          {/* 1. ACCOUNT DETAILS & LOGOUT VIEW                          */}
          {/* ======================================================== */}
          {mode === 'account' && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="space-y-3 rounded-lg border border-line bg-surface-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-md bg-primary text-lg font-bold text-primary-fg">
                      {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'V'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold tracking-tight text-fg">
                          {profile?.displayName || user?.user_metadata?.full_name || 'Thành viên VCUBE'}
                        </h4>
                        <span className={`px-2 py-0.5 text-xs font-semibold uppercase rounded-full ${activeRoleBadge.badgeClass}`}>
                          {activeRoleBadge.label}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-fg-muted">
                        {profile?.email || user?.email || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-line-subtle pt-2 text-xs">
                  <div className="rounded-sm border border-line-subtle bg-surface p-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">Phương thức xác thực:</span>
                    <span className="font-semibold text-fg">
                      {user?.app_metadata?.provider === 'google' ? 'Google OAuth' : user ? 'Supabase Auth' : '—'}
                    </span>
                  </div>
                  <div className="rounded-sm border border-line-subtle bg-surface p-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">Trạng thái tài khoản:</span>
                    <span className="flex items-center gap-1 font-semibold text-positive">
                      <span className="size-1.5 rounded-full bg-positive"></span>
                      Đang hoạt động
                    </span>
                  </div>
                </div>

                {profile?.company && (
                  <p className="text-xs text-fg-muted italic">
                    Tổ chức / Đơn vị: <strong className="text-fg not-italic">{profile.company}</strong>
                  </p>
                )}
              </div>

              {/* Action Buttons for Logged In User */}
              <div className="space-y-2 pt-1">
                {/* PROMINENT LOGOUT BUTTON */}
                <Button
                  variant="danger-ghost"
                  size="lg"
                  fullWidth
                  onClick={() => setShowLogoutConfirm(true)}
                  leadingIcon={<Icon name="logout" size={16} />}
                >
                  <span>Đăng Xuất Khỏi Thiết Bị Này</span>
                </Button>

                <div className="pt-1">
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={() => { setMode('signin'); setError(null); }}
                    leadingIcon={<Icon name="swap_horiz" size={16} className="text-primary" />}
                  >
                    <span>Đổi Tài Khoản Khác</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. SIGN IN VIEW                                           */}
          {/* ======================================================== */}
          {mode === 'signin' && (
            <div className="space-y-4">
              {/* Notice if already logged in */}
              {isLoggedIn && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-warning/20 bg-warning-tint p-3 text-xs">
                  <div className="flex items-center gap-2 text-warning">
                    <Icon name="info" size={16} className="text-warning" />
                    <span>Bạn đang đăng nhập: <strong>{profile?.displayName}</strong></span>
                  </div>
                  <Button type="button" variant="danger-ghost" size="sm" onClick={() => setShowLogoutConfirm(true)}>
                    Đăng xuất
                  </Button>
                </div>
              )}

              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <Field label="Email hoặc Mã định danh" required>
                  {(control) => (
                    <div className="relative">
                      <Icon
                        name="account_circle"
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                      />
                      <Input
                        {...control}
                        type="text"
                        inputMode="email"
                        autoComplete="username"
                        placeholder="name@domain.vn hoặc UID-xxxxx"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </Field>

                <div>
                  <Field label="Mật khẩu" required>
                    {(control) => (
                      <div className="relative">
                        <Icon
                          name="lock"
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                        />
                        <Input
                          {...control}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="Nhập mật khẩu truy cập"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-12"
                        />
                        <Button
                          iconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-0.5 top-1/2 -translate-y-1/2"
                          leadingIcon={<Icon name={showPassword ? 'visibility_off' : 'visibility'} size={16} />}
                        />
                      </div>
                    )}
                  </Field>
                  <div className="mt-2 flex justify-end">
                    {ENABLE_PASSWORD_RESET && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot_password'); setError(null); }}
                        className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                    {/* Cờ reset đang tắt ⇒ chữ tĩnh thay nút, không link/alert, không hotline bịa. */}
                    {!ENABLE_PASSWORD_RESET && (
                      <span className="text-sm text-fg-muted">Quên mật khẩu? Liên hệ hỗ trợ</span>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="mt-2"
                  loading={loading}
                  loadingLabel="Đang xác thực..."
                  trailingIcon={<Icon name="arrow_forward" size={16} />}
                >
                  <span>Đăng nhập</span>
                </Button>

            {/* D7 — Google OAuth tam gac: xem `ENABLE_GOOGLE_OAUTH` o AuthModal.tsx */}
            {ENABLE_GOOGLE_OAUTH && (
              <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-line-subtle" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-surface px-3 text-xs uppercase text-fg-subtle">
                        Hoặc tiếp tục với
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={handleGoogleSignIn}
                    loading={loading}
                    leadingIcon={
                      <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                    }
                  >
                    <span>Đăng nhập với Google</span>
                  </Button>
              </>
            )}
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. SIGN UP VIEW                                           */}
          {/* ======================================================== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              {/* Vai trò: chọn Khách hàng / Nhà thiết kế; quyền cuối cùng do DB quyết định */}
              <div className="flex items-start gap-2 rounded-md border border-info/20 bg-info-tint p-3 text-sm text-info">
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-info" />
                <div className="space-y-0.5 font-medium leading-relaxed">
                  <p className="font-semibold">Chọn loại tài khoản phù hợp.</p>
                  <p>
                    Khách hàng dùng để mua và đặt in. Tác giả 3D có thêm hồ sơ tác giả ở trạng
                    thái chờ VCUBE duyệt. Quyền cuối cùng được đọc từ hồ sơ trên máy chủ.
                  </p>
                </div>
              </div>

              {/* T58 — lựa chọn loại tài khoản (chỉ Khách hàng / Nhà thiết kế) */}
              <div>
                <span id="authmodal-signup-role-label" className="mb-2 block text-sm font-medium text-fg">
                  Loại tài khoản
                </span>
                <div
                  role="group"
                  aria-labelledby="authmodal-signup-role-label"
                  className="inline-flex w-full items-center gap-1 rounded-md border border-line bg-surface-muted p-1"
                >
                  <button
                    type="button"
                    onClick={() => setSignupRole('customer')}
                    aria-pressed={signupRole === 'customer'}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      signupRole === 'customer' ? 'bg-surface font-semibold text-fg shadow-soft' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Icon name="person" size={16} />
                    <span>Khách hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole('designer')}
                    aria-pressed={signupRole === 'designer'}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      signupRole === 'designer' ? 'bg-surface font-semibold text-fg shadow-soft' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Icon name="design_services" size={16} />
                    <span>Tác giả 3D</span>
                  </button>
                </div>
              </div>

              {/* 2-Column: Full Name and Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Họ và Tên" required>
                  {(control) => (
                    <div className="relative">
                      <Icon
                        name="person"
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                      />
                      <Input
                        {...control}
                        type="text"
                        autoComplete="name"
                        placeholder="Nguyễn Văn Minh"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </Field>

                <Field label="Địa chỉ Email" required>
                  {(control) => (
                    <div className="relative">
                      <Icon
                        name="mail"
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                      />
                      <Input
                        {...control}
                        type="email"
                        autoComplete="email"
                        placeholder="contact@doanhnghiep.vn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </Field>
              </div>

              {/* 2-Column: Password and Confirm Password */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Mật khẩu" required>
                  {(control) => (
                    <div className="relative">
                      <Icon
                        name="lock"
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                      />
                      <Input
                        {...control}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Ít nhất 6 ký tự"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </Field>
                <Field label="Xác nhận mật khẩu" required>
                  {(control) => (
                    <div className="relative">
                      <Icon
                        name="lock_reset"
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                      />
                      <Input
                        {...control}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Nhập lại mật khẩu"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </Field>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 text-xs text-fg-subtle">
                <label htmlFor="authmodal-show-password" className="flex cursor-pointer items-center gap-2">
                  <input
                    id="authmodal-show-password"
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="size-4 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <span className="text-sm text-fg-muted">Hiện mật khẩu</span>
                </label>
                <span className="text-xs font-medium">
                  Mật khẩu:{' '}
                  <span className={password.length >= 8 ? 'font-bold text-positive' : password.length >= 6 ? 'font-bold text-warning' : 'text-fg-subtle'}>
                    {password.length >= 8 ? 'Mạnh' : password.length >= 6 ? 'Hợp lệ' : 'Tối thiểu 6 ký tự'}
                  </span>
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                className="mt-3"
                loading={loading}
                loadingLabel="Đang tạo tài khoản..."
                trailingIcon={<Icon name="arrow_forward" size={16} />}
              >
                <span>Tạo tài khoản ngay</span>
              </Button>
            </form>
          )}

          {/* ======================================================== */}
          {/* 4. FORGOT PASSWORD VIEW                                   */}
          {/* ======================================================== */}
          {ENABLE_PASSWORD_RESET && mode === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <Field label="Địa chỉ Email đã đăng ký" required>
                {(control) => (
                  <div className="relative">
                    <Icon
                      name="mail"
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                    />
                    <Input
                      {...control}
                      type="email"
                      placeholder="engineer@vcube.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
              </Field>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={loading}
                  loadingLabel="Gửi Hướng Dẫn Đặt Lại"
                >
                  <span>Gửi Hướng Dẫn Đặt Lại</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setMode('signin'); setError(null); setSuccessInfo(null); }}
                >
                  Quay lại
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-muted px-4 py-3 text-xs text-fg-muted sm:px-5">
          <div className="flex items-center gap-2">
            <Icon name="lock" size={16} className="text-fg-muted" />
            <span>Phiên đăng nhập do Supabase Auth quản lý</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 font-medium">
            {mode === 'signin' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setMode('signup'); setError(null); }}
              >
                Chưa có tài khoản? Đăng ký ngay
              </Button>
            )}

            {mode === 'signup' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setMode('signin'); setError(null); }}
              >
                Đã có tài khoản? Đăng nhập
              </Button>
            )}

            {ENABLE_PASSWORD_RESET && mode === 'forgot_password' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setMode('signin'); setError(null); }}
              >
                Quay lại màn hình đăng nhập
              </Button>
            )}

            {mode === 'account' && (
              <Button
                type="button"
                variant="danger-ghost"
                size="sm"
                onClick={() => setShowLogoutConfirm(true)}
              >
                Đăng xuất tài khoản
              </Button>
            )}
          </div>
        </div>
        </>
      )}
    </Modal>
  );
};
