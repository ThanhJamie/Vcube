'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MailCheck, ArrowRight, RefreshCw } from 'lucide-react'
import { createClient } from '@/src/backend/supabase/client'

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'email của bạn'
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  const handleResendEmail = async () => {
    if (!email || email === 'email của bạn') return
    try {
      setResendStatus('loading')
      const supabase = createClient()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      })
      if (error) {
        setResendStatus('error')
      } else {
        setResendStatus('sent')
      }
    } catch {
      setResendStatus('error')
    }
  }

  return (
    <div className="bg-[#0D1525]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#00687A]/20 border border-[#00687A]/40 flex items-center justify-center text-[#38BDF8] mx-auto mb-6 shadow-xl shadow-[#00687A]/20">
        <MailCheck className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
        Kiểm Tra Hộp Thư Của Bạn
      </h1>

      <p className="text-sm text-slate-300 leading-relaxed mb-4">
        Chúng tôi đã gửi một liên kết xác thực kích hoạt tài khoản VCUBE đến:
      </p>

      <div className="inline-block px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 font-mono text-sm text-cyan-400 font-semibold mb-6">
        {email}
      </div>

      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs text-slate-400 space-y-2 mb-6">
        <p className="font-semibold text-slate-300">Các bước tiếp theo:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Mở email từ VCUBE (tiêu đề: <em>Confirm Your Signup</em>).</li>
          <li>Nhấp vào nút hoặc liên kết <strong>Confirm your email</strong>.</li>
          <li>Hệ thống sẽ tự động đăng nhập và đưa bạn vào Dashboard quản lý in 3D.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleResendEmail}
          disabled={resendStatus === 'loading' || resendStatus === 'sent'}
          className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resendStatus === 'loading' ? 'animate-spin' : ''}`} />
          <span>
            {resendStatus === 'sent'
              ? 'Đã gửi lại email xác nhận!'
              : resendStatus === 'loading'
              ? 'Đang gửi lại...'
              : 'Chưa nhận được? Gửi lại email xác nhận'}
          </span>
        </button>

        <Link
          href="/auth/login"
          className="w-full h-11 rounded-xl bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Quay lại trang Đăng nhập</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
