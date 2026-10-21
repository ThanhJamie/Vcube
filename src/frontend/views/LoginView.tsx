import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button, Card, Field, Icon, Input } from '@frontend/ui';
import { ENABLE_GOOGLE_OAUTH, ENABLE_PASSWORD_RESET } from '../components/AuthModal';

interface LoginViewProps {
  onNavigate?: (screen: string, payload?: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // UI-013: KHÔNG dùng hộp thoại chặn UI của trình duyệt. Ghi chú luồng quên mật khẩu hiển thị inline.
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setErrorMessage(isVi ? 'Vui lòng nhập đầy đủ email và mật khẩu.' : 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      const redirectTarget = searchParams.get('redirectTo') || '/';
      if (onNavigate) {
        onNavigate(redirectTarget.replace(/^\//, '') || 'home');
      } else {
        navigate(redirectTarget);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          (isVi
            ? 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
            : 'Login failed. Please verify your credentials.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage(null);
      setNotice(null);
      await signInWithGoogle();
      const redirectTarget = searchParams.get('redirectTo') || '/';
      navigate(redirectTarget);
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Không thể kết nối Google OAuth.' : 'Failed to connect to Google OAuth.'));
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
            <Icon name="view_in_ar" size={20} />
          </div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Trung tâm VCUBE
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            {isVi ? 'Đăng Nhập' : 'Sign In'}
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

          {notice && (
            <div role="status" className="mb-6 flex items-start gap-2 rounded-md border border-info/20 bg-info-tint p-3 text-sm text-info">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-info" />
              <span className="font-medium leading-relaxed">{notice}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Field label={isVi ? 'Email hoặc Mã định danh' : 'Email or Account ID'} required>
              {(control) => (
                <div className="relative">
                  <Icon
                    name="mail"
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                  />
                  <Input
                    {...control}
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.vn"
                    className="pl-10"
                  />
                </div>
              )}
            </Field>

            <Field label={isVi ? 'Mật khẩu' : 'Password'} required>
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

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              {ENABLE_PASSWORD_RESET && (
                <button
                  type="button"
                  onClick={() =>
                    setNotice(
                      isVi
                        ? 'Tính năng đặt lại mật khẩu qua email chưa được bật. Vui lòng liên hệ bộ phận hỗ trợ VCUBE để được cấp lại quyền truy cập.'
                        : 'Email password reset is not enabled yet. Please contact VCUBE support to restore access.'
                    )
                  }
                  className="cursor-pointer rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
                </button>
              )}
              {/* Cờ reset đang tắt (chưa có SMTP) ⇒ giữ kênh gợi ý bằng chữ tĩnh,
                  không phải link/alert, không bịa hotline (không có site_content trong cây này). */}
              {!ENABLE_PASSWORD_RESET && (
                <span className="text-sm text-fg-muted">
                  {isVi ? 'Quên mật khẩu? Liên hệ hỗ trợ' : 'Forgot password? Contact support'}
                </span>
              )}
            </div>

            {/* Submit Button — CTA chính duy nhất của màn hình */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              loadingLabel={isVi ? 'Đang xác thực...' : 'Authenticating...'}
              trailingIcon={<Icon name="arrow_forward" size={16} />}
            >
              {isVi ? 'Đăng Nhập' : 'Sign In'}
            </Button>

            {/* Divider */}
            {/* D7 — Google OAuth tam gac: xem `ENABLE_GOOGLE_OAUTH` o AuthModal.tsx */}
            {ENABLE_GOOGLE_OAUTH && (
              <>
              <div className="relative flex items-center justify-center py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line-subtle"></div>
                </div>
                <span className="relative bg-surface px-3 text-xs text-fg-subtle uppercase">
                  {isVi ? 'Hoặc tiếp tục với' : 'Or continue with'}
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
                {isVi ? 'Đăng nhập với Google' : 'Sign in with Google'}
              </Button>
              </>
            )}
          </form>

          {/* Switch to Register */}
          <div className="mt-6 border-t border-line-subtle pt-6 text-center">
            <p className="text-sm text-fg-muted">
              {isVi ? 'Chưa có tài khoản VCUBE?' : "Don't have a VCUBE account?"}{' '}
              <Link
                to="/auth/register"
                className="ml-1 inline-flex items-center gap-0.5 font-semibold text-primary underline-offset-4 hover:underline"
              >
                <span>{isVi ? 'Đăng Ký' : 'Register'}</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
