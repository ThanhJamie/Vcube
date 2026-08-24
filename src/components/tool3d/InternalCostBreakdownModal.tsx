import React, { useState } from 'react';
import { DetailedCostBreakdown, PrinterProfile } from '../../types';

interface InternalCostBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  quantity: number;
  breakdown: DetailedCostBreakdown;
  currentPrinter: PrinterProfile;
  onApplyOverride?: (newPrice: number, reason: string) => void;
}

export const InternalCostBreakdownModal: React.FC<InternalCostBreakdownModalProps> = ({
  isOpen,
  onClose,
  fileName,
  quantity,
  breakdown,
  currentPrinter,
  onApplyOverride
}) => {
  const [overridePriceInput, setOverridePriceInput] = useState<string>(String(breakdown.finalSellingPriceRounded));
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const totalBatchCostPrice = breakdown.costPrice * quantity;
  const totalBatchSellingPrice = breakdown.finalSellingPriceRounded * quantity;
  const totalBatchGrossProfit = totalBatchSellingPrice - totalBatchCostPrice;

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const newPrice = Number(overridePriceInput);
    if (newPrice < breakdown.costPrice) {
      alert('Cảnh báo: Giá bán điều chỉnh không được thấp hơn Giá vốn xuất xưởng (' + breakdown.costPrice.toLocaleString() + ' đ)');
      return;
    }
    if (!overrideReason.trim()) {
      alert('Vui lòng nhập lý do điều chỉnh giá (Bắt buộc theo quy định Audit Log nội bộ).');
      return;
    }
    if (onApplyOverride) {
      onApplyOverride(newPrice, overrideReason);
    }
    setOverrideSuccessMsg(`Đã ghi đè đơn giá thành công: ${newPrice.toLocaleString('vi-VN')} đ/cái`);
    setTimeout(() => {
      setOverrideSuccessMsg('');
      onClose();
    }, 1200);
  };

  const costItems = [
    {
      title: '1. Chi phí Vật liệu (Filament / Resin)',
      amount: breakdown.materialCost,
      percent: ((breakdown.materialCost / breakdown.baseCost) * 100).toFixed(1),
      details: `${breakdown.totalFilamentGrams}g nhựa (Model: ${breakdown.modelGrams}g + Support: ${breakdown.supportGrams}g + Purge: ${breakdown.purgeGrams}g + Brim: ${breakdown.brimRaftGrams}g) × ${breakdown.materialCostPerGram} đ/g`
    },
    {
      title: '2. Chi phí Điện năng tiêu thụ',
      amount: breakdown.electricityCost,
      percent: ((breakdown.electricityCost / breakdown.baseCost) * 100).toFixed(1),
      details: `${breakdown.averagePowerKW} kW (Công suất TB) × ${breakdown.printHours}h × ${breakdown.electricityRatePerKWh.toLocaleString()} đ/kWh`
    },
    {
      title: '3. Khấu hao máy & Vật tư hao mòn (Nozzle/Plate)',
      amount: breakdown.machineOperatingCost,
      percent: ((breakdown.machineOperatingCost / breakdown.baseCost) * 100).toFixed(1),
      details: `Khấu hao: ${breakdown.machineDepreciationCost.toLocaleString()}đ + Bảo trì/Vật tư: ${breakdown.maintenanceAndConsumablesCost.toLocaleString()}đ (${currentPrinter.name})`
    },
    {
      title: '4. Chi phí Nhân công kỹ thuật (Labor)',
      amount: breakdown.laborCost,
      percent: ((breakdown.laborCost / breakdown.baseCost) * 100).toFixed(1),
      details: `${breakdown.totalLaborMinutes} phút phân bổ (Review 4p + Setup 5p + Gỡ support ${breakdown.supportRemovalMinutes}p + Post-process 6p + QC 4p + Pack 3p) @ 65.000đ/h`
    },
    {
      title: '5. Phụ kiện & Đóng gói tiêu chuẩn',
      amount: breakdown.accessoriesCost,
      percent: ((breakdown.accessoriesCost / breakdown.baseCost) * 100).toFixed(1),
      details: 'Hộp carton sóng, túi zip chống ẩm, hạt hút ẩm, màng xốp nổ PE Foam'
    },
    {
      title: '6. Chi phí Cố định phân bổ (Overhead)',
      amount: breakdown.overheadPerUnit,
      percent: ((breakdown.overheadPerUnit / breakdown.baseCost) * 100).toFixed(1),
      details: 'Mặt bằng xưởng, bản quyền phần mềm Slicer/CAD, internet, quản lý'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-black/20 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-black/10 flex items-center justify-between bg-[#1C1C1C] text-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-sans text-[9px] uppercase tracking-widest text-cyan-400 font-bold">
                PRC-006 // Báo Cáo Giá Vốn & Lợi Nhuận Nội Bộ (Internal Costing)
              </span>
              <span className="px-2 py-0.5 text-[9px] bg-red-900/60 text-red-300 font-bold rounded border border-red-700/50">
                Chỉ Dành Cho Kỹ Sư & Quản Đốc
              </span>
            </div>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-white">
              Cấu Trúc Chi Phí & Định Giá: {fileName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-slate-300 hover:text-white transition-colors rounded"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#F7F6F2] border border-black/10 rounded">
              <span className="text-[9px] uppercase font-sans text-[#7D7565] font-bold block">Giá Vốn Xuất Xưởng (1 cái)</span>
              <span className="font-tech text-base font-bold text-[#1C1C1C] mt-1 block">
                {breakdown.costPrice.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[10px] text-[#7D7565]">Gồm {(breakdown.failureReserveRate * 100).toFixed(0)}% dự phòng hỏng</span>
            </div>

            <div className="p-3.5 bg-cyan-50/60 border border-[#00687a]/30 rounded">
              <span className="text-[9px] uppercase font-sans text-[#00687a] font-bold block">Giá Bán Đề Xuất (1 cái)</span>
              <span className="font-tech text-base font-bold text-[#00687a] mt-1 block">
                {breakdown.finalSellingPriceRounded.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[10px] text-[#00687a]">Markup {breakdown.targetMarkupPercent}% • Margin {breakdown.calculatedGrossMarginPercent}%</span>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-300 rounded">
              <span className="text-[9px] uppercase font-sans text-emerald-800 font-bold block">Lợi Nhuận Gộp Tổng Lô (x{quantity})</span>
              <span className="font-tech text-base font-bold text-emerald-800 mt-1 block">
                +{totalBatchGrossProfit.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[10px] text-emerald-700">Sau khi trừ giá vốn</span>
            </div>

            <div className="p-3.5 bg-[#FAF9F5] border border-black/10 rounded">
              <span className="text-[9px] uppercase font-sans text-[#7D7565] font-bold block">Thời Gian Máy Chạy</span>
              <span className="font-tech text-base font-bold text-[#1C1C1C] mt-1 block">
                {breakdown.printHours} giờ / cái
              </span>
              <span className="text-[10px] text-[#7D7565]">Tổng lô: {(breakdown.printHours * quantity).toFixed(1)}h</span>
            </div>
          </div>

          {/* 6-Level Cost Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-[#1C1C1C] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#00687a]">bar_chart</span>
                Bảng Bóc Tách Chi Phí Sản Xuất Cơ Sở (Base Cost Breakdown)
              </h3>
              <span className="text-xs font-tech font-bold text-[#5A554C]">
                Tổng Base Cost: {breakdown.baseCost.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="border border-black/10 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#F7F6F2] text-[#7D7565] text-[10px] uppercase tracking-wider border-b border-black/10">
                  <tr>
                    <th className="p-3">Hạng Mục Chi Phí</th>
                    <th className="p-3">Công Thức & Diễn Giải Chi Tiết</th>
                    <th className="p-3 text-right">Tỷ Trọng</th>
                    <th className="p-3 text-right">Chi Phí (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {costItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF9F5]">
                      <td className="p-3 font-semibold text-[#1C1C1C] whitespace-nowrap">{item.title}</td>
                      <td className="p-3 text-[#5A554C] text-[11px] font-sans">{item.details}</td>
                      <td className="p-3 text-right font-tech text-[#7D7565]">{item.percent}%</td>
                      <td className="p-3 text-right font-tech font-bold text-[#1C1C1C]">{item.amount.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                  
                  {/* Failure Reserve Row */}
                  <tr className="bg-amber-50/50 text-amber-950 font-semibold">
                    <td className="p-3">7. Dự phòng in hỏng (Failure Reserve)</td>
                    <td className="p-3 text-[11px]">
                      Tỷ lệ rủi ro {(breakdown.failureReserveRate * 100).toFixed(0)}% dựa trên độ dốc Overhang & số màu in
                    </td>
                    <td className="p-3 text-right font-tech">{(breakdown.failureReserveRate * 100).toFixed(0)}%</td>
                    <td className="p-3 text-right font-tech font-bold text-amber-900">
                      +{breakdown.failureReserveCost.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>

                  {/* Summary Cost Price Row */}
                  <tr className="bg-[#1C1C1C] text-white font-bold">
                    <td className="p-3 uppercase tracking-wider" colSpan={2}>
                      = TỔNG GIÁ VỐN XUẤT XƯỞNG (COST PRICE / UNIT)
                    </td>
                    <td className="p-3 text-right font-tech">100%</td>
                    <td className="p-3 text-right font-tech text-cyan-300 text-sm">
                      {breakdown.costPrice.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reverse Fee Calculation & Pricing Math */}
          <div className="bg-[#FAF9F5] border border-black/10 p-4 rounded-lg space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#00687a]">functions</span>
              Giải Ngược Phí Sàn & Thuật Toán Tính Giá Bán (Reverse Fee Formula)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-black/10 rounded">
                <span className="text-[#7D7565] block text-[10px] uppercase">1. Markup Mục Tiêu</span>
                <span className="font-tech font-bold text-base text-[#1C1C1C] mt-0.5 block">{breakdown.targetMarkupPercent}%</span>
                <span className="text-[10px] text-[#5A554C]">Giá trước phí: {breakdown.preFeeSellingPrice.toLocaleString()} đ</span>
              </div>

              <div className="p-3 bg-white border border-black/10 rounded">
                <span className="text-[#7D7565] block text-[10px] uppercase">2. Phí Biến Đổi Theo Doanh Thu</span>
                <span className="font-tech font-bold text-base text-[#1C1C1C] mt-0.5 block">15.5% Tổng</span>
                <span className="text-[10px] text-[#5A554C]">Platform 8% + Cổng TT 2.5% + Royalty 5%</span>
              </div>

              <div className="p-3 bg-white border border-black/10 rounded">
                <span className="text-[#7D7565] block text-[10px] uppercase">3. Biên Lợi Nhuận Gộp Thực (Gross Margin)</span>
                <span className="font-tech font-bold text-base text-emerald-700 mt-0.5 block">{breakdown.calculatedGrossMarginPercent}%</span>
                <span className="text-[10px] text-emerald-700">Lãi ròng trên doanh thu bán</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded border border-black/10 font-mono text-[11px] text-[#334155]">
              <code>
                SellingPrice = (CostPrice × (1 + Markup)) ÷ (1 − (PlatformFee% + PaymentFee% + Royalty%)) = 
                ({breakdown.costPrice.toLocaleString()} × 1.35) ÷ (1 − 0.155) = <strong>{breakdown.finalSellingPriceRounded.toLocaleString('vi-VN')} đ</strong> (Làm tròn lên 1.000đ)
              </code>
            </div>
          </div>

          {/* Admin Manual Price Override Box */}
          <div className="bg-[#FFF8E6] border border-amber-300 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">edit_note</span>
                Ghi Đè Giá Bán Thủ Công (Admin / Operator Override)
              </span>
              <span className="text-[10px] text-amber-800">Yêu cầu nhập lý do lưu Audit Trail</span>
            </div>

            <form onSubmit={handleSaveOverride} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-[#664D03] block mb-1">
                  Đơn giá mới (VNĐ / cái)
                </label>
                <input
                  type="number"
                  min={breakdown.costPrice}
                  step="1000"
                  value={overridePriceInput}
                  onChange={(e) => setOverridePriceInput(e.target.value)}
                  className="w-full bg-white border border-amber-400 p-2 text-xs font-tech font-bold text-[#1C1C1C] rounded focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-[#664D03] block mb-1">
                  Lý do điều chỉnh (Bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khách hàng thân thiết VIP, đơn dự án cơ khí..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-white border border-amber-400 p-2 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-[#1C1C1C] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-wider font-bold rounded transition-colors"
                >
                  Áp Dụng Override
                </button>
              </div>
            </form>

            {overrideSuccessMsg && (
              <div className="text-xs text-emerald-700 font-bold bg-emerald-100 p-2 rounded">
                {overrideSuccessMsg}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-black/10 bg-[#F7F6F2] flex items-center justify-between text-xs">
          <span className="text-[#7D7565]">
            Mã hiệu thuật toán: <code className="font-mono text-[#1C1C1C]">VCUBE-PRC-V2.4</code>
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#1C1C1C] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-widest font-bold transition-colors rounded"
          >
            Đóng Báo Cáo Nội Bộ
          </button>
        </div>

      </div>
    </div>
  );
};
