import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Icon } from '@frontend/ui';
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
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 flex items-center justify-center bg-canvas">
      <div className="w-full max-w-xl bg-surface shadow-e3 rounded-lg overflow-hidden animate-in fade-in duration-200">

        {/* Top Header Banner */}
        <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-line-subtle bg-canvas text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-surface-inverse text-accent mb-3 shadow-e2">
            <Icon name="view_in_ar" size={26} />
          </div>
          <div className="font-mono text-xs font-bold text-fg-muted uppercase tracking-wider mb-1">
            VCUBE HUBS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg">
            {isVi ? 'Đăng Nhập' : 'Sign In'}
          </h1>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-10">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-md bg-danger-tint flex items-start gap-2.5 text-xs text-danger">
              <Icon name="error" size={18} className="text-danger shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 text-xs font-sans">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-fg-muted block mb-2">
                {isVi ? 'Email hoặc Mã định danh' : 'Email or Account ID'}
              </label>
              <div className="relative">
                <Icon name="mail" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.vn"
                  className="w-full bg-surface-muted border border-line-subtle pl-11 pr-4 py-3 text-sm text-fg rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-sans placeholder-fg-subtle"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                  {isVi ? 'Mật khẩu' : 'Password'}
                </label>
                {ENABLE_PASSWORD_RESET && (
                  <button
                    type="button"
                    onClick={() => alert(isVi ? 'Vui lòng liên hệ quản trị viên hoặc sử dụng tính năng đặt lại mật khẩu để khôi phục.' : 'Please contact support or request a password reset.')}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
                  </button>
                )}
                {/* Cờ reset đang tắt (chưa có SMTP) ⇒ giữ kênh gợi ý bằng chữ tĩnh,
                    không phải link/alert, không bịa hotline (không có site_content trong cây này). */}
                {!ENABLE_PASSWORD_RESET && (
                  <span className="text-fg-muted text-xs">
                    {isVi ? 'Quên mật khẩu? Liên hệ hỗ trợ' : 'Forgot password? Contact support'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Icon name="lock" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-surface-muted border border-line-subtle pl-11 pr-11 py-3 text-sm text-fg rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-sans placeholder-fg-subtle"
                />
                <button aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-fg-subtle hover:text-fg cursor-pointer"
                  tabIndex={-1}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-line text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-xs text-fg-muted font-medium">
                  {isVi ? 'Ghi nhớ đăng nhập trên thiết bị này' : 'Remember me on this device'}
                </span>
              </label>
            </div>

            {/* Submit Button — CTA chính duy nhất của màn hình */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-full shadow-e2 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-fg/30 border-t-primary-fg rounded-full animate-spin"></span>
                  <span>{isVi ? 'Đang xác thực...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{isVi ? 'Đăng Nhập' : 'Sign In'}</span>
                  <Icon name="arrow_forward" size={18} />
                </>
              )}
            </button>

            {/* Divider */}
            {/* D7 — Google OAuth tam gac: xem `ENABLE_GOOGLE_OAUTH` o AuthModal.tsx */}
            {ENABLE_GOOGLE_OAUTH && (
              <>
              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line-subtle"></div>
                </div>
                <span className="relative bg-surface px-3 text-xs font-mono text-fg-subtle uppercase">
                  {isVi ? 'Hoặc tiếp tục với' : 'Or continue with'}
                </span>
              </div>

              {/* Google SSO Button — hành động phụ */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading}
                className="w-full py-3 border border-line-subtle hover:bg-surface-muted bg-surface text-fg font-bold rounded-full transition-all flex items-center justify-center gap-2.5 text-xs cursor-pointer"
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
                <span>{isVi ? 'Đăng nhập với Google' : 'Sign in with Google'}</span>
              </button>
              </>
            )}
          </form>

          {/* Switch to Register */}
          <div className="mt-6 pt-5 border-t border-line-subtle text-center">
            <p className="text-xs text-fg-subtle">
              {isVi ? 'Chưa có tài khoản trên VCube Hubs?' : "Don't have an account on VCube Hubs?"}{' '}
              <Link
                to="/auth/register"
                className="font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-0.5 ml-1"
              >
                <span>{isVi ? 'Đăng Ký' : 'Register'}</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
