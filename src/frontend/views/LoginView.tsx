import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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
      await signInWithGoogle('customer');
      const redirectTarget = searchParams.get('redirectTo') || '/';
      navigate(redirectTarget);
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Không thể kết nối Google OAuth.' : 'Failed to connect to Google OAuth.'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-xl bg-white border border-[#CBD5E1] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Top Header Banner */}
        <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#091426] to-[#1E293B] text-[#57DFFE] mb-3 shadow-md">
            <span className="material-symbols-outlined text-[26px]">view_in_ar</span>
          </div>
          <div className="font-mono text-[11px] font-bold text-[#00687A] uppercase tracking-wider mb-1">
            VCUBE HUBS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#091426]">
            {isVi ? 'Đăng Nhập' : 'Sign In'}
          </h1>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-10">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <span className="material-symbols-outlined text-rose-600 text-base shrink-0 mt-0.5">error</span>
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 text-xs font-sans">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#334155] block mb-2">
                {isVi ? 'Email hoặc Mã định danh' : 'Email or Account ID'}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3 text-lg text-[#64748B]">mail</span>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.vn"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] pl-11 pr-4 py-3 text-sm text-[#0F172A] rounded-xl focus:outline-none focus:border-[#00687A] focus:bg-white focus:ring-2 focus:ring-[#00687A]/15 transition-all font-sans placeholder-[#94A3B8]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                  {isVi ? 'Mật khẩu' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => alert(isVi ? 'Vui lòng liên hệ quản trị viên hoặc sử dụng tính năng đặt lại mật khẩu để khôi phục.' : 'Please contact support or request a password reset.')}
                  className="text-xs text-[#00687A] hover:underline font-semibold cursor-pointer"
                >
                  {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3 text-lg text-[#64748B]">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] pl-11 pr-11 py-3 text-sm text-[#0F172A] rounded-xl focus:outline-none focus:border-[#00687A] focus:bg-white focus:ring-2 focus:ring-[#00687A]/15 transition-all font-sans placeholder-[#94A3B8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#00687A] focus:ring-[#00687A] cursor-pointer"
                />
                <span className="text-xs text-[#334155] font-medium">
                  {isVi ? 'Ghi nhớ đăng nhập trên thiết bị này' : 'Remember me on this device'}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#091426] hover:bg-[#1E293B] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>{isVi ? 'Đang xác thực...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{isVi ? 'Đăng Nhập' : 'Sign In'}</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E8F0]"></div>
              </div>
              <span className="relative bg-white px-3 text-[11px] font-mono text-[#64748B] uppercase">
                {isVi ? 'Hoặc tiếp tục với' : 'Or continue with'}
              </span>
            </div>

            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading}
              className="w-full py-3 border border-[#CBD5E1] hover:bg-[#F8FAFC] bg-white text-[#0F172A] font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 text-xs cursor-pointer shadow-xs"
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
              <span>{isVi ? 'Đăng nhập với Google' : 'Sign in with Google'}</span>
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] text-center">
            <p className="text-xs text-[#64748B]">
              {isVi ? 'Chưa có tài khoản trên VCube Hubs?' : "Don't have an account on VCube Hubs?"}{' '}
              <Link
                to="/auth/register"
                className="font-bold text-[#00687A] hover:underline cursor-pointer inline-flex items-center gap-0.5 ml-1"
              >
                <span>{isVi ? 'Đăng Ký' : 'Register'}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
