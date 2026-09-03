import React from 'react'
import Link from 'next/link'
import {
  Printer,
  Package,
  Layers,
  Clock,
  ArrowUpRight,
  UploadCloud,
  FileCheck,
  CheckCircle2,
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00687A]/20 via-[#0B1C30] to-[#0A1120] border border-[#00687A]/30 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#00687A]/40 text-[#38BDF8] border border-[#00687A]/50 mb-3">
            Hạ Tầng Chế Tác Nhanh VCUBE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Nền Tảng In 3D Kỹ Thuật Theo Yêu Cầu
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Tải lên file CAD (.STL, .STEP, .3MF), hệ thống tự động bóc tách thể tích,
            tính toán chi phí nhựa in/resin và giao hàng toàn quốc trong 24–48h.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link
              href="/dashboard/quotes"
              className="h-10 px-4 rounded-xl bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#00687A]/30 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Tải Lên File 3D & Báo Giá</span>
            </Link>
            <Link
              href="/dashboard/orders"
              className="h-10 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <span>Xem Tiến Độ Đơn In</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0A1120] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Đang In Thực Tế</span>
            <Printer className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <p className="text-2xl font-bold text-white">2 <span className="text-xs font-normal text-slate-400">chi tiết</span></p>
          <span className="text-[11px] text-emerald-400 mt-1 inline-block">● Đang chạy trên Bambu X1-Carbon</span>
        </div>

        <div className="bg-[#0A1120] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Đơn Hoàn Thành</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">18 <span className="text-xs font-normal text-slate-400">đơn</span></p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">100% đúng dung sai kỹ thuật</span>
        </div>

        <div className="bg-[#0A1120] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vật Liệu Sử Dụng</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">3.4 <span className="text-xs font-normal text-slate-400">kg</span></p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">PLA-CF, PETG, Resin Tough</span>
        </div>

        <div className="bg-[#0A1120] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Thời Gian Trung Bình</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">28 <span className="text-xs font-normal text-slate-400">giờ</span></p>
          <span className="text-[11px] text-emerald-400 mt-1 inline-block">Từ upload đến bàn giao mẫu</span>
        </div>
      </div>

      {/* Quick Upload STL / STEP Dropzone */}
      <div className="bg-[#0A1120] border-2 border-dashed border-slate-800 hover:border-[#00687A]/70 rounded-2xl p-8 text-center transition-colors group cursor-pointer">
        <div className="w-14 h-14 rounded-2xl bg-[#00687A]/15 border border-[#00687A]/30 flex items-center justify-center text-[#38BDF8] mx-auto mb-4 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          Kéo thả file CAD vào đây hoặc bấm để chọn
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
          Hỗ trợ định dạng: <strong>.STL, .STEP, .STP, .3MF, .OBJ</strong> (Tối đa 100MB).
          Hệ thống bảo mật NDA, mã hóa 100% quyền sở hữu trí tuệ trên Supabase Storage.
        </p>
        <Link
          href="/dashboard/quotes"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-semibold shadow-md transition-colors"
        >
          <span>Khởi động tính giá tự động</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Recent Orders List */}
      <div className="bg-[#0A1120] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Đơn Hàng Gần Đây</h3>
            <p className="text-xs text-slate-400">Tiến độ in 3D theo thời gian thực</p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs text-[#38BDF8] hover:underline font-medium"
          >
            Xem tất cả
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Mã Đơn</th>
                <th className="px-5 py-3">Tên File Chi Tiết</th>
                <th className="px-5 py-3">Công Nghệ & Vật Liệu</th>
                <th className="px-5 py-3">Số Lượng</th>
                <th className="px-5 py-3">Trạng Thái</th>
                <th className="px-5 py-3 text-right">Tổng Tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="px-5 py-3.5 font-mono text-[#38BDF8] font-semibold">VCB-2026-8801</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-white">Gearbox_Housing_V2.step</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                    FDM • PETG-CF (Carbon Fiber)
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono">04 bộ</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Đang in (Lớp 340/820)
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono font-semibold text-white">
                  640.000 đ
                </td>
              </tr>

              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="px-5 py-3.5 font-mono text-[#38BDF8] font-semibold">VCB-2026-8794</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-white">Drone_Arm_Lightweight.stl</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                    FDM • Nylon PA12
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono">02 cái</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Đã bàn giao (Viettel Post)
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono font-semibold text-white">
                  380.000 đ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
