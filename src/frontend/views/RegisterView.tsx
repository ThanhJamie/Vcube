import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, Icon, Input } from '@frontend/ui';
import { ENABLE_GOOGLE_OAUTH } from '../components/AuthModal';

interface RegisterViewProps {
  onNavigate?: (screen: string, payload?: any) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Đồng ý điều khoản là hành vi CHỦ ĐỘNG: mặc định chưa tick (QA register §Terms).
  const [termsAgreed, setTermsAgreed] = useState(false);
  // T58 — tự chọn loại tài khoản khi đăng ký. Chỉ 'customer' | 'designer'; quyền
  // thật vẫn do trigger SQL trong public.user_profiles.role quyết định.
  const [signupRole, setSignupRole] = useState<'customer' | 'designer'>('customer');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Đăng ký xong mà CHƯA có phiên (dự án bật xác nhận email) ⇒ không được hứa "đã đăng nhập".
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = () => {
    const len = password.length;
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (len === 0) {
      return {
        label: 'Chưa nhập',
        labelClass: 'text-fg-subtle',
        bar1: 'bg-line-subtle',
        bar2: 'bg-line-subtle',
        bar3: 'bg-line-subtle',
      };
    }
    if (len < 6) {
      return {
        label: 'Mức độ: YẾU',
        labelClass: 'text-danger font-bold',
        bar1: 'bg-danger',
        bar2: 'bg-line-subtle',
        bar3: 'bg-line-subtle',
      };
    }
    if (len < 10 || (!hasNumber && !hasSpecial)) {
      return {
        label: 'Mức độ: TRUNG BÌNH',
        labelClass: 'text-warning font-bold',
        bar1: 'bg-warning',
        bar2: 'bg-warning',
        bar3: 'bg-line-subtle',
      };
    }
    return {
      label: 'Mức độ: MẠNH',
      labelClass: 'text-positive font-bold',
      bar1: 'bg-positive',
      bar2: 'bg-positive',
      bar3: 'bg-positive',
    };
  };

  const strength = getPasswordStrength();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setAwaitingEmailConfirm(false);

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!termsAgreed) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.');
      return;
    }

    setIsLoading(true);
    try {
      // T58: vai trò do người dùng chọn là GỢI Ý; trigger fn_create_profile_for_new_user()
      // chỉ ánh xạ đúng 'designer' → 'designer' (mọi giá trị khác, kể cả 'admin', → 'customer').
      // Quyền thật nằm ở public.user_profiles.role (SQL). Đăng ký xong chưa chắc đã có phiên.
      const result = await signUpWithEmail(
        email.trim(),
        password,
        fullName.trim() || email.split('@')[0],
        signupRole
      );
      if (result.hasSession) {
        setSuccessMessage(
          'Đăng ký thành công — bạn đã được đăng nhập. Đang chuyển hướng...'
        );
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('home');
          } else {
            navigate('/');
          }
        }, 1500);
      } else {
        setAwaitingEmailConfirm(true);
        setSuccessMessage(
          'Đã gửi yêu cầu đăng ký — kiểm tra email để xác nhận rồi đăng nhập.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || ('Đăng ký không thành công. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage(null);
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err?.message || ('Không thể kết nối Google OAuth.'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-80px)] items-center justify-center bg-canvas px-4 py-12 sm:px-6">
      <Card variant="soft" padding="lg" className="mx-auto w-full max-w-md sm:p-8">

        {/* Top Header Banner */}
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-md bg-primary text-primary-fg">
            <Icon name="person_add" size={20} />
          </div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Trung tâm VCUBE
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            Đăng Ký Tài Khoản
          </h1>
        </div>

        {/* Form Body */}
        <div className="mt-6">
          {errorMessage && (
            <div role="alert" className="mb-6 flex items-start gap-2 rounded-md border border-danger/20 bg-danger-tint p-3 text-sm text-danger">
              <Icon name="error" size={16} className="mt-0.5 shrink-0 text-danger" />
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div role="status" className="mb-6 flex items-start gap-2 rounded-md border border-positive/20 bg-positive-tint p-3 text-sm text-positive">
              <Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-positive" />
              <span className="font-medium leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Vai trò: nói đúng sự thật — chọn Khách hàng/Nhà thiết kế, quyền cuối do DB */}
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-info/20 bg-info-tint p-4 text-sm text-info">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-info" />
            <div className="space-y-0.5 font-medium leading-relaxed">
              <p className="font-semibold">
                Chọn loại tài khoản phù hợp.
              </p>
              <p>
                Khách hàng dùng để mua và đặt in. Tác giả 3D có thêm hồ sơ tác giả ở trạng thái chờ VCUBE duyệt để đăng bán mẫu 3D. Quyền cuối cùng được đọc từ hồ sơ trên máy chủ.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {/* T58 — lựa chọn loại tài khoản (chỉ Khách hàng / Nhà thiết kế) */}
            <div>
              <span id="signup-role-label" className="mb-2 block text-sm font-medium text-fg">
                Loại tài khoản *
              </span>
              <div
                role="group"
                aria-labelledby="signup-role-label"
                className="inline-flex w-full items-center gap-1 rounded-full border border-line bg-surface-muted p-1"
              >
                <button
                  type="button"
                  onClick={() => setSignupRole('customer')}
                  aria-pressed={signupRole === 'customer'}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    signupRole === 'customer'
                      ? 'bg-surface font-semibold text-fg shadow-soft'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  <Icon name="person" size={16} />
                  <span>Khách hàng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupRole('designer')}
                  aria-pressed={signupRole === 'designer'}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    signupRole === 'designer'
                      ? 'bg-surface font-semibold text-fg shadow-soft'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  <Icon name="design_services" size={16} />
                  <span>Tác giả 3D</span>
                </button>
              </div>
            </div>

            {/* Full Name and Email */}
            <div className="grid grid-cols-1 gap-4">
              <Field label="Họ và tên *" required>
                {(control) => (
                  <div className="relative">
                    <Icon
                      name="badge"
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                    />
                    <Input
                      {...control}
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn Minh"
                      className="pl-10"
                    />
                  </div>
                )}
              </Field>

              <Field label="Địa chỉ Email *" required>
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@doanhnghiep.vn"
                      className="pl-10"
                    />
                  </div>
                )}
              </Field>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Field label="Mật khẩu *" required>
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="pl-10 pr-12"
                      />
                      <Button
                        iconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0.5 top-1/2 -translate-y-1/2"
                        leadingIcon={<Icon name={showPassword ? 'visibility_off' : 'visibility'} size={16} />}
                      />
                    </div>
                  )}
                </Field>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1" role="status" aria-label={`Độ mạnh mật khẩu: ${strength.label}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-fg-subtle">Độ mạnh mật khẩu:</span>
                      <span className={strength.labelClass}>{strength.label}</span>
                    </div>
                    <div className="grid h-1.5 grid-cols-3 gap-1.5">
                      <div className={`rounded-full transition-all ${strength.bar1}`}></div>
                      <div className={`rounded-full transition-all ${strength.bar2}`}></div>
                      <div className={`rounded-full transition-all ${strength.bar3}`}></div>
                    </div>
                  </div>
                )}
              </div>

              <Field
                label="Xác nhận lại mật khẩu *"
                required
                error={
                  confirmPassword && confirmPassword !== password
                    ? 'Mật khẩu xác nhận không khớp.'
                    : null
                }
              >
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-10"
                      invalid={Boolean(confirmPassword && confirmPassword !== password)}
                    />
                  </div>
                )}
              </Field>
            </div>

            {/* Terms Agreement */}
            <div className="pt-1">
              <label htmlFor="registerview-terms" className="flex cursor-pointer select-none items-start gap-2.5">
                <input
                  id="registerview-terms"
                  type="checkbox"
                  required
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 size-4 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span className="text-sm leading-relaxed text-fg-muted">
                  {(
                    <>
                      Tôi đồng ý với{' '}
                      <strong className="font-semibold text-fg">Điều khoản dịch vụ</strong> và{' '}
                      <strong className="font-semibold text-fg">Chính sách bảo mật</strong> của VCUBE.
                    </>
                  )}
                </span>
              </label>
            </div>

            {/* Submit Button — CTA chính duy nhất của màn hình */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="mt-2"
              disabled={confirmPassword !== '' && confirmPassword !== password}
              loading={isLoading}
              loadingLabel="Đang khởi tạo tài khoản..."
              trailingIcon={<Icon name="arrow_forward" size={16} />}
            >
              Đăng Ký Tài Khoản
            </Button>

            {awaitingEmailConfirm && !isLoading && (
              <Link
                to="/auth/login"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-line-control bg-surface text-base font-medium text-fg transition-colors duration-200 hover:border-fg-subtle hover:bg-surface-muted"
              >
                <Icon name="login" size={16} />
                <span>Đã xác nhận email — Đăng nhập</span>
              </Link>
            )}

            {/* Divider */}
            {/* D7 — Google OAuth tam gac: xem `ENABLE_GOOGLE_OAUTH` o AuthModal.tsx */}
            {ENABLE_GOOGLE_OAUTH && (
              <>
              <div className="relative flex items-center justify-center py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line-subtle"></div>
                </div>
                <span className="relative bg-surface px-3 text-xs text-fg-subtle uppercase">
                  Hoặc đăng ký nhanh qua
                </span>
              </div>

              {/* Google SSO Button — hành động phụ */}
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={handleGoogleAuth}
                loading={isGoogleLoading}
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
                Đăng ký với Google
              </Button>
              </>
            )}
          </form>

          {/* Switch to Login */}
          <div className="mt-6 border-t border-line-subtle pt-6 text-center">
            <p className="text-sm text-fg-muted">
              Đã có tài khoản VCUBE?{' '}
              <Link
                to="/auth/login"
                className="ml-1 inline-flex items-center gap-0.5 font-semibold text-primary underline-offset-4 hover:underline"
              >
                <span>Đăng Nhập</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
