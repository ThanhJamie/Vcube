import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Icon } from '@frontend/ui';
import { ENABLE_GOOGLE_OAUTH } from '../components/AuthModal';

interface RegisterViewProps {
  onNavigate?: (screen: string, payload?: any) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(true);

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
        label: isVi ? 'Chưa nhập' : 'Empty',
        labelClass: 'text-fg-subtle',
        bar1: 'bg-line-subtle',
        bar2: 'bg-line-subtle',
        bar3: 'bg-line-subtle',
      };
    }
    if (len < 6) {
      return {
        label: isVi ? 'Mức độ: YẾU' : 'WEAK',
        labelClass: 'text-danger font-bold',
        bar1: 'bg-danger',
        bar2: 'bg-line-subtle',
        bar3: 'bg-line-subtle',
      };
    }
    if (len < 10 || (!hasNumber && !hasSpecial)) {
      return {
        label: isVi ? 'Mức độ: TRUNG BÌNH' : 'MEDIUM',
        labelClass: 'text-warning font-bold',
        bar1: 'bg-warning',
        bar2: 'bg-warning',
        bar3: 'bg-line-subtle',
      };
    }
    return {
      label: isVi ? 'Mức độ: MẠNH' : 'STRONG',
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
      setErrorMessage(isVi ? 'Vui lòng điền đầy đủ email và mật khẩu.' : 'Please enter email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage(isVi ? 'Mật khẩu phải có ít nhất 6 ký tự.' : 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(isVi ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }

    if (!termsAgreed) {
      setErrorMessage(isVi ? 'Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.' : 'Please accept terms of service.');
      return;
    }

    setIsLoading(true);
    try {
      // Vai trò KHÔNG do người đăng ký chọn: trigger fn_create_profile_for_new_user()
      // luôn tạo 'customer' trong public.user_profiles.role, và SQL là nơi duy nhất
      // quyết định quyền. Đăng ký xong chưa chắc đã có phiên (nếu bật xác nhận email).
      const result = await signUpWithEmail(email.trim(), password, fullName.trim() || email.split('@')[0]);
      if (result.hasSession) {
        setSuccessMessage(
          isVi
            ? 'Đăng ký thành công — bạn đã được đăng nhập. Đang chuyển hướng...'
            : 'Registration successful — you are now signed in. Redirecting...'
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
          isVi
            ? 'Đã gửi yêu cầu đăng ký — kiểm tra email để xác nhận rồi đăng nhập.'
            : 'Sign-up request submitted — check your email to confirm, then sign in.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Đăng ký không thành công. Vui lòng thử lại.' : 'Registration failed. Please try again.'));
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
      setErrorMessage(err?.message || (isVi ? 'Không thể kết nối Google OAuth.' : 'Google OAuth failed.'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 flex items-center justify-center bg-canvas">
      <div className="w-full max-w-2xl bg-surface shadow-e3 rounded-lg overflow-hidden animate-in fade-in duration-200">

        {/* Top Header Banner */}
        <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-line-subtle bg-canvas text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary text-primary-fg mb-3 shadow-e2">
            <Icon name="person_add" size={26} />
          </div>
          <div className="font-mono text-xs font-bold text-fg-muted uppercase tracking-wider mb-1">
            VCUBE HUBS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg">
            {isVi ? 'Đăng Ký Tài Khoản' : 'Create Account'}
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

          {successMessage && (
            <div className="mb-6 p-3.5 rounded-md bg-positive-tint flex items-start gap-2.5 text-xs text-positive">
              <Icon name="check_circle" size={18} className="text-positive shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{successMessage}</span>
            </div>
          )}

          {/* Vai trò: nói đúng sự thật — đăng ký luôn là Khách hàng, quyền khác do VCUBE duyệt */}
          <div className="mb-6 p-3.5 rounded-md bg-info-tint flex items-start gap-2.5 text-xs text-info">
            <Icon name="info" size={18} className="text-info shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium space-y-0.5">
              <p className="font-bold">
                {isVi ? 'Tài khoản mới có vai trò Khách hàng.' : 'New accounts start as Customer.'}
              </p>
              <p>
                {isVi
                  ? 'Vai trò được đọc từ hồ sơ trên máy chủ (user_profiles.role). Muốn trở thành Tác giả 3D hoặc Xưởng in, hãy gửi yêu cầu để VCUBE duyệt sau khi đăng nhập.'
                  : 'Your role is read from the server-side profile (user_profiles.role). To become a 3D Creator or Print Lab, request verification after signing in.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-5 text-xs font-sans">
            {/* 2-Column: Full Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-fg-muted block mb-2">
                  {isVi ? 'Họ và tên *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <Icon name="badge" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isVi ? 'Nguyễn Văn Minh' : 'Nguyen Van Minh'}
                    className="w-full bg-surface-muted border border-line-subtle pl-11 pr-4 py-3 text-sm text-fg rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-sans placeholder-fg-subtle"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-fg-muted block mb-2">
                  {isVi ? 'Địa chỉ Email *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <Icon name="mail" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@doanhnghiep.vn"
                    className="w-full bg-surface-muted border border-line-subtle pl-11 pr-4 py-3 text-sm text-fg rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-sans placeholder-fg-subtle"
                  />
                </div>
              </div>
            </div>

            {/* 2-Column: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-fg-muted block mb-2">
                  {isVi ? 'Mật khẩu *' : 'Password *'}
                </label>
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

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-fg-subtle">{isVi ? 'Độ mạnh mật khẩu:' : 'Strength:'}</span>
                      <span className={strength.labelClass}>{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 h-1.5">
                      <div className={`rounded-full transition-all ${strength.bar1}`}></div>
                      <div className={`rounded-full transition-all ${strength.bar2}`}></div>
                      <div className={`rounded-full transition-all ${strength.bar3}`}></div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-fg-muted block mb-2">
                  {isVi ? 'Xác nhận lại mật khẩu *' : 'Confirm Password *'}
                </label>
                <div className="relative">
                  <Icon name="lock_reset" size={20} className="absolute left-3.5 top-3 text-fg-subtle" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full bg-surface-muted border pl-11 pr-4 py-3 text-sm text-fg rounded-md focus:outline-none transition-all font-sans placeholder-fg-subtle ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-danger/30 focus:border-danger focus:ring-2 focus:ring-danger/15'
                        : 'border-line-subtle focus:border-primary focus:ring-2 focus:ring-primary/15'
                    }`}
                  />
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-danger mt-1 font-medium">
                    {isVi ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.'}
                  </p>
                )}
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-sm border-line text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-xs text-fg-muted leading-relaxed">
                  {isVi ? (
                    <>
                      Tôi đồng ý với{' '}
                      <span className="text-primary font-semibold underline">Điều khoản dịch vụ</span> và{' '}
                      <span className="text-primary font-semibold underline">Chính sách bảo mật</span> của VCube Hubs.
                    </>
                  ) : (
                    'I agree to the Terms of Service and Data Privacy Policy of VCube Hubs.'
                  )}
                </span>
              </label>
            </div>

            {/* Submit Button — CTA chính duy nhất của màn hình */}
            <button
              type="submit"
              disabled={isLoading || (confirmPassword !== '' && confirmPassword !== password)}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-full shadow-e2 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-fg/30 border-t-primary-fg rounded-full animate-spin"></span>
                  <span>{isVi ? 'Đang khởi tạo tài khoản...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{isVi ? 'Đăng Ký Tài Khoản' : 'Sign Up'}</span>
                  <Icon name="arrow_forward" size={18} />
                </>
              )}
            </button>

            {awaitingEmailConfirm && !isLoading && (
              <Link
                to="/auth/login"
                className="w-full py-3 border border-line-subtle hover:bg-surface-muted bg-surface text-fg font-bold rounded-full transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <Icon name="login" size={18} />
                <span>{isVi ? 'Đã xác nhận email — Đăng nhập' : 'Email confirmed — Sign in'}</span>
              </Link>
            )}

            {/* Divider */}
            {/* D7 — Google OAuth tam gac: xem `ENABLE_GOOGLE_OAUTH` o AuthModal.tsx */}
            {ENABLE_GOOGLE_OAUTH && (
              <>
              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line-subtle"></div>
                </div>
                <span className="relative bg-surface px-3 text-xs font-mono text-fg-subtle uppercase">
                  {isVi ? 'Hoặc đăng ký nhanh qua' : 'Or quick register with'}
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
                <span>{isVi ? 'Đăng ký với Google' : 'Sign up with Google'}</span>
              </button>
              </>
            )}
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-line-subtle text-center">
            <p className="text-xs text-fg-subtle">
              {isVi ? 'Đã có tài khoản trên VCube Hubs?' : 'Already have a VCube Hubs account?'}{' '}
              <Link
                to="/auth/login"
                className="font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-0.5 ml-1"
              >
                <span>{isVi ? 'Đăng Nhập' : 'Sign In'}</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
