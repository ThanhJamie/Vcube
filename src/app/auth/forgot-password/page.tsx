'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { forgotPasswordAction } from '../actions'

export default function ForgotPasswordPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await forgotPasswordAction(formData)
      if (result?.error) {
        setErrorMessage(result.error)
      } else if (result?.message) {
        setSuccessMessage(result.message)
      }
    })
  }

  return (
    <div className="bg-[#0D1525]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Quay lại đăng nhập</span>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Quên Mật Khẩu?</h1>
        <p className="text-sm text-slate-400 mt-1">
          Nhập email đăng ký tài khoản VCUBE, chúng tôi sẽ gửi liên kết khôi phục bảo mật.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {successMessage ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="leading-relaxed">{successMessage}</p>
          </div>
          <p className="text-slate-400 text-[11px] pl-7">
            Không thấy email? Hãy kiểm tra thư mục Spam hoặc thử lại sau 2 phút.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email tài khoản
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                name="email"
                type="email"
                required
                placeholder="ten@congty.com"
                className="w-full h-11 pl-10 pr-4 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#00687A] focus:ring-1 focus:ring-[#00687A] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#00687A]/25 transition-all disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi link...</span>
              </>
            ) : (
              <>
                <span>Gửi liên kết khôi phục</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
