'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { loginAction } from '../actions'
import { createClient } from '@/src/backend/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(urlError)
  const [isPending, startTransition] = useTransition()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    const formData = new FormData(e.currentTarget)
    formData.append('redirectTo', redirectTo)

    startTransition(async () => {
      const result = await loginAction(formData)
      if (result?.error) {
        setErrorMessage(result.error)
      }
    })
  }

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true)
      setErrorMessage(null)
      const supabase = createClient()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        setErrorMessage(error.message)
        setIsGoogleLoading(false)
      }
    } catch {
      setErrorMessage('Không thể kết nối Google OAuth. Vui lòng kiểm tra cấu hình.')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="p-8 sm:p-12 flex flex-col justify-center bg-white">
      <div className="max-w-xl w-full mx-auto">
        {/* Header with VCube Hubs Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#091426] to-[#1E293B] text-[#57dffe] mb-3 shadow-md">
            <span className="material-symbols-outlined text-[28px]">view_in_ar</span>
          </div>
          <div className="font-mono text-xs font-bold text-[#00687a] uppercase tracking-wider mb-1">
            VCUBE HUBS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30]">
            Đăng Nhập
          </h1>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-[#ba1a1a]">
            <AlertCircle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Main Login Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Email / Identifier Field */}
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2"
              htmlFor="login-email"
            >
              Email hoặc Mã định danh
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-[20px]">
                mail
              </span>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@doanhnghiep.vn"
                className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/15 outline-none transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-xs font-bold uppercase tracking-wider text-[#334155]"
                htmlFor="login-password"
              >
                Mật khẩu
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[#00687a] hover:underline font-semibold"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#64748B] text-[20px]">
                lock
              </span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-11 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/15 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title="Ẩn/Hiện mật khẩu"
                className="absolute right-3.5 top-3 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]" id="password-toggle-icon">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#334155] font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#00687a] border-[#CBD5E1] focus:ring-[#00687a] cursor-pointer"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-5 bg-[#091426] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#57dffe]" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>Đăng Nhập</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#CBD5E1]/60" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-[#64748B] font-mono text-[11px] uppercase">
              Hoặc tiếp tục với
            </span>
          </div>
        </div>

        {/* Single Google SSO Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isPending}
            className="w-full py-3 px-4 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F172A] transition flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 cursor-pointer"
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
            <span>Đăng nhập với Google</span>
          </button>
        </div>

        {/* Bottom Switch to Sign Up */}
        <div className="mt-6 text-center text-xs text-[#64748B]">
          Chưa có tài khoản trên VCube Hubs?
          <Link
            href="/auth/register"
            className="text-[#00687a] font-bold hover:underline ml-1"
          >
            Đăng Ký
          </Link>
        </div>
      </div>
    </div>
  )
}
