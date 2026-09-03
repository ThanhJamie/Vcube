import React from 'react'
import { Package, Search, Filter, ArrowDownToLine, Clock, CheckCircle2, Truck } from 'lucide-react'

export default function OrdersPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Đơn Hàng In 3D</h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi trạng thái lát cắt (Slicing), chạy máy in (Printing), đóng gói và vận chuyển.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc tên file..."
              className="h-9 pl-9 pr-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00687A]"
            />
          </div>
          <button className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-1.5 hover:bg-slate-800">
            <Filter className="w-3.5 h-3.5" />
            <span>Bộ lọc</span>
          </button>
        </div>
      </div>

      <div className="bg-[#0A1120] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Mã Đơn Hàng</th>
                <th className="px-5 py-3">Chi Tiết In 3D</th>
                <th className="px-5 py-3">Vật Liệu & Độ Mịn (Layer)</th>
                <th className="px-5 py-3">Ngày Đặt</th>
                <th className="px-5 py-3">Trạng Thái Xưởng</th>
                <th className="px-5 py-3 text-right">Tổng Tiền</th>
                <th className="px-5 py-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-900/40">
                <td className="px-5 py-4 font-mono font-semibold text-[#38BDF8]">VCB-2026-8801</td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-white">Gearbox_Housing_V2.step</p>
                  <p className="text-[10px] text-slate-400">Khối lượng: 142g • Infill: 40% Gyroid</p>
                </td>
                <td className="px-5 py-4 font-mono text-[11px]">
                  PETG Carbon Fiber (0.16mm)
                </td>
                <td className="px-5 py-4 text-slate-400">02/09/2026</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Clock className="w-3 h-3 animate-spin" />
                    Đang in trên Bambu X1C
                  </span>
                </td>
                <td className="px-5 py-4 text-right font-mono font-bold text-white">640.000 đ</td>
                <td className="px-5 py-4 text-center">
                  <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white" title="Tải hóa đơn VAT">
                    <ArrowDownToLine className="w-4 h-4" />
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-slate-900/40">
                <td className="px-5 py-4 font-mono font-semibold text-[#38BDF8]">VCB-2026-8794</td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-white">Drone_Arm_Lightweight.stl</p>
                  <p className="text-[10px] text-slate-400">Khối lượng: 65g • Infill: 100% Solid</p>
                </td>
                <td className="px-5 py-4 font-mono text-[11px]">
                  Nylon PA12 Kỹ Thuật (0.20mm)
                </td>
                <td className="px-5 py-4 text-slate-400">28/08/2026</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Truck className="w-3 h-3" />
                    Đã Giao Thành Công
                  </span>
                </td>
                <td className="px-5 py-4 text-right font-mono font-bold text-white">380.000 đ</td>
                <td className="px-5 py-4 text-center">
                  <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white" title="Tải hóa đơn VAT">
                    <ArrowDownToLine className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
