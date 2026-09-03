import React from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  Printer,
  Package,
  Layers,
  Users,
  Settings,
  ArrowLeft,
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#060911] text-[#F1F5F9] flex flex-col lg:flex-row font-sans">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-[#090D18] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-rose-900/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-wider text-white">VCUBE</span>
                  <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    ADMIN
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">Xưởng In & Điều Phối Fleet</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Fleet Máy In 3D</span>
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>Quản Lý Đơn Hàng</span>
            </Link>
            <Link
              href="/admin/materials"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Kho Nhựa In & Resin</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Khách Hàng & Designer</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <Link
            href="/dashboard"
            className="w-full h-9 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Portal Khách Hàng</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-6 border-b border-slate-800 bg-[#090D18]/70 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Trạng thái hạ tầng xưởng:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Đang hoạt động 24/24 (Hà Nội & TP. Hồ Chí Minh Hub)
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Quyền: <span className="text-rose-400 font-semibold">Super Admin</span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
