import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface RegisterViewProps {
  onNavigate?: (screen: string, payload?: any) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'designer' | 'lab'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
        labelClass: 'text-[#75777D]',
        bar1: 'bg-[#DCE9FF]',
        bar2: 'bg-[#DCE9FF]',
        bar3: 'bg-[#DCE9FF]',
      };
    }
    if (len < 6) {
      return {
        label: isVi ? 'Mức độ: YẾU' : 'WEAK',
        labelClass: 'text-[#BA1A1A] font-bold',
        bar1: 'bg-[#BA1A1A]',
        bar2: 'bg-[#DCE9FF]',
        bar3: 'bg-[#DCE9FF]',
      };
    }
    if (len < 10 || (!hasNumber && !hasSpecial)) {
      return {
        label: isVi ? 'Mức độ: TRUNG BÌNH' : 'MEDIUM',
        labelClass: 'text-amber-600 font-bold',
        bar1: 'bg-amber-500',
        bar2: 'bg-amber-500',
        bar3: 'bg-[#DCE9FF]',
      };
    }
    return {
      label: isVi ? 'Mức độ: MẠNH' : 'STRONG',
      labelClass: 'text-emerald-700 font-bold',
      bar1: 'bg-emerald-600',
      bar2: 'bg-emerald-600',
      bar3: 'bg-emerald-600',
    };
  };

  const strength = getPasswordStrength();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
      await signUpWithEmail(email.trim(), password, fullName.trim() || email.split('@')[0], selectedRole);
      setSuccessMessage(isVi ? 'Tài khoản đã được tạo thành công! Đang chuyển hướng...' : 'Account created successfully! Redirecting...');
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('home');
        } else {
          navigate('/');
        }
      }, 1500);
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
      await signInWithGoogle(selectedRole);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Không thể kết nối Google OAuth.' : 'Google OAuth failed.'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-2xl bg-white border border-[#CBD5E1] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Top Header Banner */}
        <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#091426] to-[#1E293B] text-[#57DFFE] mb-3 shadow-md">
            <span className="material-symbols-outlined text-[26px]">person_add</span>
          </div>
          <div className="font-mono text-[11px] font-bold text-[#00687A] uppercase tracking-wider mb-1">
            VCUBE HUBS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#091426]">
            {isVi ? 'Đăng Ký Tài Khoản' : 'Create Account'}
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

          {successMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
              <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">check_circle</span>
              <span className="leading-relaxed font-medium">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5 text-xs font-sans">
            {/* Role Selector: 3 options (Customer, Designer, Lab) - Modern Cards */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#334155] block mb-2">
                {isVi ? 'Vai trò tham gia *' : 'Account Role *'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('customer')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
                  <span className="text-xs font-bold block">{isVi ? 'Khách hàng' : 'Customer'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('designer')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
                  <span className="text-xs font-bold block">{isVi ? 'Thiết kế CAD' : 'CAD Designer'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('lab')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
                  <span className="text-xs font-bold block">{isVi ? 'Xưởng in 3D' : 'Print Lab'}</span>
                </button>
              </div>
            </div>

            {/* 2-Column: Full Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#334155] block mb-2">
                  {isVi ? 'Họ và tên *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-3 text-lg text-[#64748B]">badge</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isVi ? 'Nguyễn Văn Minh' : 'Nguyen Van Minh'}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] pl-11 pr-4 py-3 text-sm text-[#0F172A] rounded-xl focus:outline-none focus:border-[#00687A] focus:bg-white focus:ring-2 focus:ring-[#00687A]/15 transition-all font-sans placeholder-[#94A3B8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#334155] block mb-2">
                  {isVi ? 'Địa chỉ Email *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-3 text-lg text-[#64748B]">mail</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@doanhnghiep.vn"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] pl-11 pr-4 py-3 text-sm text-[#0F172A] rounded-xl focus:outline-none focus:border-[#00687A] focus:bg-white focus:ring-2 focus:ring-[#00687A]/15 transition-all font-sans placeholder-[#94A3B8]"
                  />
                </div>
              </div>
            </div>

            {/* 2-Column: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#334155] block mb-2">
                  {isVi ? 'Mật khẩu *' : 'Password *'}
                </label>
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

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[#64748B]">{isVi ? 'Độ mạnh mật khẩu:' : 'Strength:'}</span>
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
                <label className="text-xs font-bold uppercase tracking-wider text-[#334155] block mb-2">
                  {isVi ? 'Xác nhận lại mật khẩu *' : 'Confirm Password *'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-3 text-lg text-[#64748B]">lock_reset</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full bg-[#F8FAFC] border pl-11 pr-4 py-3 text-sm text-[#0F172A] rounded-xl focus:outline-none transition-all font-sans placeholder-[#94A3B8] ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                        : 'border-[#CBD5E1] focus:border-[#00687A] focus:ring-2 focus:ring-[#00687A]/15 focus:bg-white'
                    }`}
                  />
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
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
                  className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] text-[#00687A] focus:ring-[#00687A] cursor-pointer"
                />
                <span className="text-xs text-[#475569] leading-relaxed">
                  {isVi ? (
                    <>
                      Tôi đồng ý với{' '}
                      <span className="text-[#00687A] font-semibold underline">Điều khoản dịch vụ</span> và{' '}
                      <span className="text-[#00687A] font-semibold underline">Chính sách bảo mật</span> của VCube Hubs.
                    </>
                  ) : (
                    'I agree to the Terms of Service and Data Privacy Policy of VCube Hubs.'
                  )}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (confirmPassword !== '' && confirmPassword !== password)}
              className="w-full py-3.5 bg-[#091426] hover:bg-[#1E293B] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>{isVi ? 'Đang khởi tạo tài khoản...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{isVi ? 'Đăng Ký Tài Khoản' : 'Sign Up'}</span>
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
                {isVi ? 'Hoặc đăng ký nhanh qua' : 'Or quick register with'}
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
              <span>{isVi ? 'Đăng ký với Google' : 'Sign up with Google'}</span>
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] text-center">
            <p className="text-xs text-[#64748B]">
              {isVi ? 'Đã có tài khoản trên VCube Hubs?' : 'Already have a VCube Hubs account?'}{' '}
              <Link
                to="/auth/login"
                className="font-bold text-[#00687A] hover:underline cursor-pointer inline-flex items-center gap-0.5 ml-1"
              >
                <span>{isVi ? 'Đăng Nhập' : 'Sign In'}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
