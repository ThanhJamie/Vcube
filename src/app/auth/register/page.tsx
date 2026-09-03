'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import { signupAction } from '../actions'
import { createClient } from '@/src/backend/supabase/client'

export default function RegisterPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [selectedRole, setSelectedRole] = useState<'customer' | 'designer' | 'lab'>('customer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(true)

  // Password strength calculation
  const getPasswordStrength = () => {
    const len = password.length
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (len === 0) {
      return {
        label: 'Chưa nhập',
        labelClass: 'text-[#75777d]',
        bar1: 'bg-[#dce9ff]',
        bar2: 'bg-[#dce9ff]',
        bar3: 'bg-[#dce9ff]',
      }
    }
    if (len < 6) {
      return {
        label: 'Mức độ: YẾU',
        labelClass: 'text-[#ba1a1a] font-medium',
        bar1: 'bg-[#ba1a1a]',
        bar2: 'bg-[#dce9ff]',
        bar3: 'bg-[#dce9ff]',
      }
    }
    if (len < 10 || (!hasNumber && !hasSpecial)) {
      return {
        label: 'Mức độ: TRUNG BÌNH',
        labelClass: 'text-[#eb6905] font-medium',
        bar1: 'bg-[#eb6905]',
        bar2: 'bg-[#eb6905]',
        bar3: 'bg-[#dce9ff]',
      }
    }
    return {
      label: 'Mức độ: MẠNH',
      labelClass: 'text-[#00687a] font-semibold',
      bar1: 'bg-[#00687a]',
      bar2: 'bg-[#00687a]',
      bar3: 'bg-[#00687a]',
    }
  }

  // Confirm password match calculation
  const getMatchStatus = () => {
    if (confirmPassword.length === 0) {
      return {
        label: '',
        labelClass: 'text-[#75777d]',
      }
    }
    if (password === confirmPassword) {
      return {
        label: '✓ Mật khẩu khớp',
        labelClass: 'text-[#00687a] font-medium',
      }
    }
    return {
      label: '✕ Chưa trùng khớp',
      labelClass: 'text-[#ba1a1a] font-medium',
    }
  }

  const strength = getPasswordStrength()
  const matchStatus = getMatchStatus()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận chưa trùng khớp với mật khẩu.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có tối thiểu 6 ký tự.')
      return
    }

    if (!termsAgreed) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.')
      return
    }

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('role', selectedRole)
    formData.append('accountType', selectedRole)
    formData.append('fullName', fullName.trim() || email.split('@')[0])

    startTransition(async () => {
      const result = await signupAction(formData)
      if (result?.error) {
        setErrorMessage(result.error)
      }
    })
  }

  const handleGoogleSignup = async () => {
    try {
      setIsGoogleLoading(true)
      setErrorMessage(null)
      const supabase = createClient()
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
        },
      })
      if (error) {
        setErrorMessage(error.message)
        setIsGoogleLoading(false)
      }
    } catch {
      setErrorMessage('Đã xảy ra lỗi khi đăng ký bằng Google.')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="p-8 sm:p-12 flex flex-col justify-center bg-white">
      <div className="max-w-2xl w-full mx-auto">
        {/* Brand & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#091426] to-[#1E293B] text-[#57dffe] shadow-md mb-3">
            <span className="material-symbols-outlined text-[28px]">
              person_add
            </span>
          </div>

          <div className="font-mono text-xs tracking-wider text-[#00687a] uppercase font-bold mb-1">
            VCUBE HUBS
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Đăng Ký Tài Khoản
          </h1>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-[#ba1a1a]">
            <AlertCircle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Registration Form */}
        <form className="flex flex-col space-y-5" id="register-form" onSubmit={handleSubmit}>
          {/* Role Selector: 3 options (Customer, Designer, Lab) - Excluding Admin */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#334155]">
              Vai trò tham gia <span className="text-[#ba1a1a]">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                id="role-customer-btn"
                onClick={() => setSelectedRole('customer')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  selectedRole === 'customer'
                    ? 'border-[#00687A] bg-[#F0FDF4] shadow-sm ring-1 ring-[#00687A]'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white text-[#64748B]'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRole === 'customer' ? 'bg-[#00687A] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold ${selectedRole === 'customer' ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
                    Khách Hàng
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate">Đặt in &amp; Mua CAD</div>
                </div>
              </button>

              <button
                type="button"
                id="role-designer-btn"
                onClick={() => setSelectedRole('designer')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  selectedRole === 'designer'
                    ? 'border-[#00687A] bg-[#F0FDF4] shadow-sm ring-1 ring-[#00687A]'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white text-[#64748B]'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRole === 'designer' ? 'bg-[#00687A] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">draw</span>
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold ${selectedRole === 'designer' ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
                    Nhà Thiết Kế
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate">Đăng tải &amp; Bán mẫu</div>
                </div>
              </button>

              <button
                type="button"
                id="role-lab-btn"
                onClick={() => setSelectedRole('lab')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  selectedRole === 'lab'
                    ? 'border-[#00687A] bg-[#F0FDF4] shadow-sm ring-1 ring-[#00687A]'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white text-[#64748B]'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRole === 'lab' ? 'bg-[#00687A] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">precision_manufacturing</span>
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold ${selectedRole === 'lab' ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
                    Xưởng In 3D
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate">Gia công &amp; Giao hàng</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2-Column: Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="flex flex-col space-y-2">
              <label
                className="text-xs font-bold uppercase tracking-wider text-[#334155]"
                htmlFor="full-name"
              >
                Họ và tên / Đơn vị
              </label>
              <div className="relative flex items-center rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#00687a] focus-within:ring-2 focus-within:ring-[#00687a]/15 focus-within:bg-white transition-all">
                <span className="material-symbols-outlined text-[#64748B] absolute left-3.5 pointer-events-none text-[20px]">
                  badge
                </span>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn Minh"
                  className="w-full bg-transparent py-3 pl-11 pr-4 text-[#0F172A] text-sm outline-none placeholder:text-[#94A3B8]"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col space-y-2">
              <label
                className="text-xs font-bold uppercase tracking-wider text-[#334155]"
                htmlFor="email"
              >
                Địa chỉ Email <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative flex items-center rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#00687a] focus-within:ring-2 focus-within:ring-[#00687a]/15 focus-within:bg-white transition-all">
                <span className="material-symbols-outlined text-[#64748B] absolute left-3.5 pointer-events-none text-[20px]">
                  mail
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@doanhnghiep.vn"
                  className="w-full bg-transparent py-3 pl-11 pr-4 text-[#0F172A] text-sm outline-none placeholder:text-[#94A3B8]"
                />
              </div>
            </div>
          </div>

          {/* 2-Column: Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-bold uppercase tracking-wider text-[#334155]"
                  htmlFor="password"
                >
                  Mật khẩu <span className="text-[#ba1a1a]">*</span>
                </label>
                <span className={`font-mono text-[11px] ${strength.labelClass}`} id="strength-label">
                  {strength.label}
                </span>
              </div>
              <div className="relative flex items-center rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#00687a] focus-within:ring-2 focus-within:ring-[#00687a]/15 focus-within:bg-white transition-all">
                <span className="material-symbols-outlined text-[#64748B] absolute left-3.5 pointer-events-none text-[20px]">
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full bg-transparent py-3 pl-11 pr-11 text-[#0F172A] text-sm outline-none placeholder:text-[#94A3B8]"
                />
                <button
                  type="button"
                  id="toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3.5 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]" id="pw-icon">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Password Strength Meter */}
              <div className="flex items-center gap-1.5 pt-1">
                <div className={`h-1.5 flex-1 rounded-full transition-colors ${strength.bar1}`} id="bar-1" />
                <div className={`h-1.5 flex-1 rounded-full transition-colors ${strength.bar2}`} id="bar-2" />
                <div className={`h-1.5 flex-1 rounded-full transition-colors ${strength.bar3}`} id="bar-3" />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-bold uppercase tracking-wider text-[#334155]"
                  htmlFor="confirm-password"
                >
                  Xác nhận mật khẩu <span className="text-[#ba1a1a]">*</span>
                </label>
                <span className={`font-mono text-[11px] ${matchStatus.labelClass}`} id="match-status">
                  {matchStatus.label}
                </span>
              </div>
              <div className="relative flex items-center rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#00687a] focus-within:ring-2 focus-within:ring-[#00687a]/15 focus-within:bg-white transition-all">
                <span className="material-symbols-outlined text-[#64748B] absolute left-3.5 pointer-events-none text-[20px]">
                  verified_user
                </span>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full bg-transparent py-3 pl-11 pr-4 text-[#0F172A] text-sm outline-none placeholder:text-[#94A3B8]"
                />
              </div>
            </div>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer group select-none">
              <input
                id="terms"
                required
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="w-4 h-4 rounded text-[#00687a] border-[#CBD5E1] focus:ring-[#00687a] mt-0.5 cursor-pointer"
              />
              <span className="text-xs text-[#64748B] leading-tight">
                Tôi đồng ý với{' '}
                <a className="text-[#00687a] hover:underline font-bold" href="#">
                  Điều khoản dịch vụ
                </a>{' '}
                và{' '}
                <a className="text-[#00687a] hover:underline font-bold" href="#">
                  Chính sách bảo mật dữ liệu
                </a>{' '}
                của VCube Hubs.
              </span>
            </label>
          </div>

          {/* Submit Action CTA */}
          <div className="pt-2">
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 px-5 rounded-xl bg-[#091426] hover:bg-[#1E293B] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#57dffe]" />
                  <span>Đang khởi tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <span>Tạo Tài Khoản Ngay</span>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative flex items-center my-5">
          <div className="flex-grow h-px bg-[#CBD5E1]/60" />
          <span className="flex-shrink-0 mx-3 font-mono text-[11px] text-[#64748B] uppercase tracking-wider">
            Hoặc tiếp tục với
          </span>
          <div className="flex-grow h-px bg-[#CBD5E1]/60" />
        </div>

        {/* SSO Actions */}
        <div className="w-full">
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isPending}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-bold transition shadow-xs border border-[#CBD5E1] disabled:opacity-60 cursor-pointer"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#00687a]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>Đăng ký nhanh với Google</span>
          </button>
        </div>

        {/* Footer Link to Login */}
        <div className="mt-6 pt-2 flex items-center justify-center gap-1 text-center">
          <span className="text-xs text-[#64748B]">Đã có tài khoản trên VCube Hubs?</span>
          <Link
            href="/auth/login"
            className="text-xs text-[#00687a] hover:underline font-bold flex items-center gap-0.5"
          >
            <span>Đăng Nhập</span>
            <span className="material-symbols-outlined text-[16px]">navigate_next</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
