import React from 'react'
import Link from 'next/link'
import { createClient } from '@/src/backend/supabase/server'
import { redirect } from 'next/navigation'
import {
  Box,
  LayoutDashboard,
  Package,
  Calculator,
  FolderArchive,
  LogOut,
  User,
  ShieldAlert,
  Printer,
} from 'lucide-react'
import { signOutAction } from '../auth/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/dashboard')
  }

  const userEmail = user.email || 'Khách hàng VCUBE'
  const userName = user.user_metadata?.full_name || userEmail.split('@')[0]
  const accountType = user.user_metadata?.account_type || 'customer'

  return (
    <div className="min-h-screen bg-[#070D18] text-[#F1F5F9] flex flex-col lg:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0A1120] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00687A] to-[#0B1C30] border border-[#00687A]/50 flex items-center justify-center text-white shadow-md shadow-[#00687A]/20">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-wider text-white">VCUBE</span>
                <span className="text-[9px] uppercase font-bold tracking-widest px-1 py-0.2 rounded bg-[#00687A]/30 text-[#38BDF8] ml-1.5 border border-[#00687A]/40">
                  Cloud
                </span>
                <p className="text-[10px] text-slate-400 font-mono">Khách Hàng In 3D</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#00687A]/15 text-[#38BDF8] border border-[#00687A]/30 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tổng Quan</span>
            </Link>
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>Đơn Hàng In 3D</span>
            </Link>
            <Link
              href="/dashboard/quotes"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>Báo Giá Tức Thì</span>
            </Link>
            <Link
              href="/dashboard/files"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <FolderArchive className="w-4 h-4" />
              <span>Kho File STL / STEP</span>
            </Link>
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
              {userName.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
              <span className="inline-block text-[9px] font-mono text-[#38BDF8] uppercase">
                {accountType === 'enterprise' ? 'Doanh Nghiệp' : 'Cá Nhân'}
              </span>
            </div>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full h-9 px-3 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/50 text-slate-400 hover:text-rose-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-6 border-b border-slate-800/80 bg-[#0A1120]/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Hệ Thống Xưởng In 3D:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              24 Máy In Đang Sẵn Sàng (Bambu X1C / Creality K1 / Formlabs)
            </span>
          </div>

          <Link
            href="/dashboard/quotes"
            className="h-9 px-3.5 rounded-lg bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-[#00687A]/20 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Tạo Báo Giá In Mới</span>
          </Link>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
