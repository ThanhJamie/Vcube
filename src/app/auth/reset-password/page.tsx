'use client'

import React, { useState, useTransition } from 'react'
import { Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { resetPasswordAction } from '../actions'

export default function ResetPasswordPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await resetPasswordAction(formData)
      if (result?.error) {
        setErrorMessage(result.error)
      }
    })
  }

  return (
    <div className="bg-[#0D1525]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Đặt Lại Mật Khẩu Mới</h1>
        <p className="text-sm text-slate-400 mt-1">
          Nhập mật khẩu mới an toàn cho tài khoản VCUBE của bạn.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Mật khẩu mới
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              name="newPassword"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full h-11 pl-10 pr-4 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#00687A] focus:ring-1 focus:ring-[#00687A] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
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
              <span>Đang cập nhật...</span>
            </>
          ) : (
            <>
              <span>Cập nhật mật khẩu</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
