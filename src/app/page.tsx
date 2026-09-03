import React from 'react'
import Link from 'next/link'
import {
  Box,
  Printer,
  Zap,
  ShieldCheck,
  ArrowRight,
  Layers,
  Cpu,
  Calculator,
  LayoutDashboard,
  Lock,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070D18] text-[#F1F5F9] flex flex-col font-sans selection:bg-[#00687A] selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#0A1120]/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00687A] to-[#0B1C30] border border-[#00687A]/40 flex items-center justify-center text-white shadow-lg shadow-[#00687A]/20">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-wider text-white">VCUBE</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#00687A]/30 text-[#38BDF8] border border-[#00687A]/50">
                  Vietnam
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Next.js 15 + Supabase SSR</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Đăng Nhập
            </Link>
            <Link
              href="/auth/register"
              className="h-9 px-4 rounded-xl bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-[#00687A]/25 transition-all"
            >
              <span>Đăng Ký Tài Khoản</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 lg:py-20 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#00687A]/20 text-[#38BDF8] border border-[#00687A]/40">
            <Zap className="w-3.5 h-3.5" />
            <span>Nền tảng In 3D Theo Yêu Cầu Thế Hệ Mới Tại Việt Nam</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
            Chế Tác Mẫu Kỹ Thuật & In 3D Chuẩn Công Nghiệp
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Hạ tầng Next.js 15 App Router & Supabase Auth SSR. Báo giá tức thì từ file CAD (.STL, .STEP),
            điều phối cụm 24 máy in Bambu Lab / Formlabs và bàn giao sản phẩm trong 24h.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/login"
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white text-sm font-bold flex items-center gap-2 shadow-xl shadow-[#00687A]/30 transition-all"
            >
              <span>Đăng Nhập VCUBE</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Calculator className="w-4 h-4 text-[#38BDF8]" />
              <span>Báo Giá In 3D & File CAD</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
          <div className="bg-[#0A1120] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-[#00687A]/15 border border-[#00687A]/30 flex items-center justify-center text-[#38BDF8] mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Supabase Auth SSR 2026</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Xác thực phiên bảo mật với `@supabase/ssr`, cookie HTTP-Only, Middleware bảo vệ route, và hỗ trợ PKCE code exchange chuẩn Next.js 15.
            </p>
          </div>

          <div className="bg-[#0A1120] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Điều Phối Xưởng 3D Fleet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tích hợp hệ thống máy in FDM công nghiệp sợi Carbon PETG-CF, Nylon PA12 và máy SLA Resin độ mịn cao cho chi tiết lắp ráp chính xác.
            </p>
          </div>

          <div className="bg-[#0A1120] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Sẵn Sàng Deploy Vercel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cấu trúc App Router modular, typesafe 100% với TypeScript, Tailwind CSS, sẵn sàng đưa lên Vercel chỉ với 1 click GitHub import.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0A1120] py-6 text-center text-xs text-slate-500">
        <p>© 2026 VCUBE Vietnam • Next.js 15 App Router + Supabase Auth SSR + Tailwind CSS</p>
      </footer>
    </div>
  )
}
