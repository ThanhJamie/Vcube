'use client'

import React, { useState } from 'react'
import { Calculator, Upload, Layers, Cpu, ShieldCheck, Check, Sparkles } from 'lucide-react'

export default function QuotesPage() {
  const [material, setMaterial] = useState('petg-cf')
  const [infill, setInfill] = useState(30)
  const [quantity, setQuantity] = useState(1)

  // Demo calculation based on VCUBE pricing engine
  const baseWeightGrams = 85
  const estimatedWeight = Math.round(baseWeightGrams * (0.6 + infill / 100 * 0.8))
  const materialRate = material === 'pla' ? 450 : material === 'petg-cf' ? 950 : 1200 // VND per gram
  const machineRatePerHour = 35000 // VND per hour
  const estimatedHours = (estimatedWeight / 20).toFixed(1)
  const subtotal = Math.round((estimatedWeight * materialRate + parseFloat(estimatedHours) * machineRatePerHour) * quantity)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Tính Giá In 3D Tức Thì</h1>
        <p className="text-xs text-slate-400 mt-1">
          Thuật toán định mức BOM & Slicing tự động của VCUBE phân tích dung tích, thời gian máy in và vật liệu kỹ thuật.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Config */}
        <div className="lg:col-span-2 space-y-5 bg-[#0A1120] border border-slate-800 rounded-2xl p-6">
          {/* File Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              File Mô Hình 3D (Đang thử nghiệm mẫu)
            </label>
            <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00687A]/20 border border-[#00687A]/40 flex items-center justify-center text-[#38BDF8]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Robotics_Joint_Bracket.step</p>
                  <p className="text-[11px] text-slate-400">Thể tích: 72.4 cm³ • Kích thước: 65 × 48 × 32 mm</p>
                </div>
              </div>
              <button className="text-xs text-[#38BDF8] hover:underline flex items-center gap-1 font-medium">
                <Upload className="w-3.5 h-3.5" />
                <span>Đổi file</span>
              </button>
            </div>
          </div>

          {/* Material Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Chọn Vật Liệu Kỹ Thuật
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'pla', name: 'PLA Technical', desc: 'Mô hình mẫu, chi tiết visual', price: '450đ/g' },
                { id: 'petg-cf', name: 'PETG-CF Carbon', desc: 'Chịu lực, kháng tia UV, cứng vững', price: '950đ/g' },
                { id: 'nylon', name: 'Nylon PA12', desc: 'Chịu mài mòn, bánh răng, khớp xoay', price: '1.200đ/g' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMaterial(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    material === m.id
                      ? 'bg-[#00687A]/20 border-[#00687A] text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{m.name}</span>
                    {material === m.id && <Check className="w-3.5 h-3.5 text-[#38BDF8]" />}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">{m.desc}</p>
                  <span className="text-[10px] font-mono text-cyan-400">{m.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Infill Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mật Độ Ruột (Infill Density)
              </label>
              <span className="font-mono text-xs font-bold text-[#38BDF8]">{infill}% Gyroid</span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              step={5}
              value={infill}
              onChange={(e) => setInfill(Number(e.target.value))}
              className="w-full accent-[#00687A] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>15% (Tiết kiệm)</span>
              <span>40% (Tiêu chuẩn kỹ thuật)</span>
              <span>100% (Đặc hoàn toàn)</span>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Số Lượng Chi Tiết
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold hover:bg-slate-800"
              >
                -
              </button>
              <span className="font-mono font-bold text-sm text-white w-12 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold hover:bg-slate-800"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Price Breakdown & Order CTA */}
        <div className="bg-[#0A1120] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-[#38BDF8]" />
              <span>Bảng Bóc Tách Chi Phí</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Khối lượng tính toán:</span>
                <span className="font-mono text-white">{estimatedWeight} gram / chiếc</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Thời gian in ước tính:</span>
                <span className="font-mono text-white">~{estimatedHours} giờ</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Máy in điều phối:</span>
                <span className="font-mono text-emerald-400">Bambu X1-Carbon</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Dung sai chế tạo:</span>
                <span className="font-mono text-white">±0.15 mm</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400 font-semibold">TỔNG BÁO GIÁ:</span>
                <span className="text-2xl font-bold font-mono text-white text-[#38BDF8]">
                  {subtotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <p className="text-[10px] text-slate-500 text-right mt-0.5">Đã bao gồm VAT & bóc tách support</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#00687A]/25 transition-all">
              Đặt In 3D Ngay
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cam kết bảo mật tệp CAD & Đổi trả nếu lỗi in</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
