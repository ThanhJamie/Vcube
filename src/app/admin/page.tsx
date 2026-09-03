import React from 'react'
import { Printer, AlertTriangle, Activity, CheckCircle2, Flame } from 'lucide-react'

export default function AdminPage() {
  const printers = [
    {
      id: 'P-01',
      model: 'Bambu Lab X1-Carbon #01',
      type: 'FDM Industrial',
      job: 'VCB-2026-8801 (Gearbox Housing)',
      material: 'PETG-CF',
      progress: 42,
      nozzleTemp: '260°C',
      bedTemp: '80°C',
      status: 'Printing',
    },
    {
      id: 'P-02',
      model: 'Bambu Lab X1-Carbon #02',
      type: 'FDM Industrial',
      job: 'VCB-2026-8804 (Bracket Quad)',
      material: 'PLA Tough',
      progress: 88,
      nozzleTemp: '220°C',
      bedTemp: '60°C',
      status: 'Printing',
    },
    {
      id: 'P-03',
      model: 'Creality K1 Max #01',
      type: 'FDM Large Scale (300×300mm)',
      job: 'Đang rảnh - Chờ xếp lệnh in',
      material: 'ABS Tech',
      progress: 0,
      nozzleTemp: '35°C',
      bedTemp: '30°C',
      status: 'Idle',
    },
    {
      id: 'P-04',
      model: 'Formlabs Form 4 #01',
      type: 'SLA Resin High Precision',
      job: 'VCB-2026-8807 (Khuôn đúc kim loại)',
      material: 'Grey Pro Resin',
      progress: 15,
      nozzleTemp: 'Laser 405nm',
      bedTemp: 'Tank 32°C',
      status: 'Printing',
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Fleet Monitor Máy In 3D</h1>
        <p className="text-xs text-slate-400 mt-1">
          Theo dõi thời gian thực cảm biến nhiệt độ, cuộn nhựa, và tiến độ in của các cụm máy tại xưởng VCUBE.
        </p>
      </div>

      {/* Fleet Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#090D18] border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-mono">Tổng Máy In</span>
          <p className="text-2xl font-bold text-white mt-1">24 <span className="text-xs font-normal text-slate-400">máy</span></p>
          <span className="text-[11px] text-emerald-400">18 FDM • 6 SLA Resin</span>
        </div>
        <div className="bg-[#090D18] border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-mono">Đang Chạy Máy</span>
          <p className="text-2xl font-bold text-white mt-1">19 <span className="text-xs font-normal text-slate-400">máy</span></p>
          <span className="text-[11px] text-cyan-400">Tỉ lệ tải: 79.1%</span>
        </div>
        <div className="bg-[#090D18] border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-mono">Hàng Đợi Chờ Lát Cắt</span>
          <p className="text-2xl font-bold text-white mt-1">5 <span className="text-xs font-normal text-slate-400">files</span></p>
          <span className="text-[11px] text-amber-400">Chờ kỹ sư duyệt slice</span>
        </div>
        <div className="bg-[#090D18] border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-mono">Cảnh Báo Kẹt Nhựa / Lỗi</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">0 <span className="text-xs font-normal text-slate-400">lỗi</span></p>
          <span className="text-[11px] text-emerald-400">Cảm biến AI lidar bình thường</span>
        </div>
      </div>

      {/* Printer List */}
      <div className="bg-[#090D18] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Danh Sách Máy Đang Kết Nối Mạng Xưởng</h3>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live WebSocket Sync
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {printers.map((p) => (
            <div key={p.id} className="p-5 hover:bg-slate-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                  p.status === 'Printing'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{p.model}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Lệnh in: <span className="font-semibold text-white">{p.job}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cuộn nhựa: <span className="text-[#38BDF8] font-mono">{p.material}</span> • Đầu đùn: {p.nozzleTemp} • Bàn in: {p.bedTemp}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-56 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Tiến độ in:</span>
                  <span className="font-bold text-white">{p.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      p.status === 'Printing' ? 'bg-gradient-to-r from-[#00687A] to-[#38BDF8]' : 'bg-slate-600'
                    }`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
