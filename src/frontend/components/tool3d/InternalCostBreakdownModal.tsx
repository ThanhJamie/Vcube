import React, { useState } from 'react';
import { DetailedCostBreakdown, PrinterProfile } from '../../types';
import { Icon, Modal } from '@frontend/ui';

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
  const [overrideError, setOverrideError] = useState<string>('');

  if (!isOpen) return null;

  /** Tỷ trọng an toàn: `baseCost` = 0/không hợp lệ ⇒ `—`, KHÔNG `Infinity%`/`NaN%`. */
  const sharePercent = (value: number): string =>
    Number.isFinite(breakdown.baseCost) && breakdown.baseCost > 0
      ? ((value / breakdown.baseCost) * 100).toFixed(1)
      : '—';

  // R4 (data-honesty PC-08): moi con so trong khoi cong thuc phai doc tu `breakdown`
  // (nguon: `pricing_global_settings` + `InkiriCostFormulaConfig`), khong duoc la hang so.
  const totalVariableFeePercent = Number(
    (
      breakdown.platformCommissionPercent +
      breakdown.paymentGatewayFeePercent +
      breakdown.designerRoyaltyPercent
    ).toFixed(2)
  );
  const markupMultiplier = Number((1 + breakdown.targetMarkupPercent / 100).toFixed(2));
  const variableFeeRate = Number((totalVariableFeePercent / 100).toFixed(4));

  const totalBatchCostPrice = breakdown.costPrice * quantity;
  const totalBatchSellingPrice = breakdown.finalSellingPriceRounded * quantity;
  const totalBatchGrossProfit = totalBatchSellingPrice - totalBatchCostPrice;

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideError('');
    const newPrice = Number(overridePriceInput);
    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      setOverrideError('Đơn giá điều chỉnh phải là số dương hợp lệ.');
      return;
    }
    if (newPrice < breakdown.costPrice) {
      setOverrideError(`Giá bán điều chỉnh không được thấp hơn giá vốn xuất xưởng (${breakdown.costPrice.toLocaleString('vi-VN')} đ).`);
      return;
    }
    if (!overrideReason.trim()) {
      setOverrideError('Vui lòng nhập lý do điều chỉnh giá (bắt buộc để lưu audit log nội bộ).');
      return;
    }
    onApplyOverride?.(newPrice, overrideReason);
    setOverrideSuccessMsg(`Đã ghi đè đơn giá: ${newPrice.toLocaleString('vi-VN')} đ/cái`);
  };

  const costItems = [
    {
      title: '1. Chi phí Vật liệu (Filament / Resin)',
      amount: breakdown.materialCost,
      percent: sharePercent(breakdown.materialCost),
      details: `${breakdown.totalFilamentGrams}g nhựa (Model: ${breakdown.modelGrams}g + Support: ${breakdown.supportGrams}g + Purge: ${breakdown.purgeGrams}g + Brim: ${breakdown.brimRaftGrams}g) × ${breakdown.materialCostPerGram} đ/g`
    },
    {
      title: '2. Chi phí Điện năng tiêu thụ',
      amount: breakdown.electricityCost,
      percent: sharePercent(breakdown.electricityCost),
      details: `${breakdown.averagePowerKW} kW (Công suất TB) × ${breakdown.printHours}h × ${breakdown.electricityRatePerKWh.toLocaleString()} đ/kWh`
    },
    {
      title: '3. Khấu hao máy & Vật tư hao mòn (Nozzle/Plate)',
      amount: breakdown.machineOperatingCost,
      percent: sharePercent(breakdown.machineOperatingCost),
      details: `Khấu hao: ${breakdown.machineDepreciationCost.toLocaleString()}đ + Bảo trì/Vật tư: ${breakdown.maintenanceAndConsumablesCost.toLocaleString()}đ (${currentPrinter.name})`
    },
    {
      title: '4. Chi phí Nhân công kỹ thuật (Labor)',
      amount: breakdown.laborCost,
      percent: sharePercent(breakdown.laborCost),
      // R1/R4: in DUNG so phut va DON GIA dang dung trong ban tinh (`DetailedCostBreakdown`).
      // Truoc day dong nay hardcode "Review 4p + Setup 5p + ... + Pack 3p @ 65.000đ/h" nen van in
      // 65.000đ/h ke ca khi `pricing_global_settings.labor_hourly_rate_vnd` dat don gia khac.
      details:
        `${breakdown.totalLaborMinutes} phút phân bổ (Review ${breakdown.fileReviewLaborMinutes}p`
        + ` + Setup ${breakdown.setupLaborMinutes}p`
        + ` + Gỡ support ${breakdown.supportRemovalMinutes}p`
        + ` + Post-process ${breakdown.postProcessingLaborMinutes}p`
        + ` + QC ${breakdown.qcLaborMinutes}p`
        + ` + Pack ${breakdown.packagingLaborMinutes}p)`
        + ` @ ${breakdown.laborHourlyRate.toLocaleString('vi-VN')} đ/h`
    },
    {
      title: '5. Phụ kiện & Đóng gói tiêu chuẩn',
      amount: breakdown.accessoriesCost,
      percent: sharePercent(breakdown.accessoriesCost),
      details: 'Hộp carton sóng, túi zip chống ẩm, hạt hút ẩm, màng xốp nổ PE Foam'
    },
    {
      title: '6. Chi phí Cố định phân bổ (Overhead)',
      amount: breakdown.overheadPerUnit,
      percent: sharePercent(breakdown.overheadPerUnit),
      details: 'Mặt bằng xưởng, bản quyền phần mềm Slicer/CAD, internet, quản lý'
    }
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      bodyClassName="p-0"
      title={
        <span>
          <span className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
              PRC-006 // Báo Cáo Giá Vốn &amp; Lợi Nhuận Nội Bộ (Internal Costing)
            </span>
            <span className="px-2 py-0.5 text-xs bg-danger-tint text-danger font-bold rounded-sm border border-danger/40">
              Chỉ Dành Cho Kỹ Sư &amp; Quản Đốc
            </span>
          </span>
          <span className="block font-sans font-bold text-base sm:text-lg text-fg">
            Cấu Trúc Chi Phí &amp; Định Giá: {fileName}
          </span>
        </span>
      }
    >
        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-surface-muted rounded-sm">
              <span className="text-xs uppercase font-sans text-fg-muted font-bold block">Giá Vốn Xuất Xưởng (1 cái)</span>
              <span className="font-tech text-base font-bold text-fg mt-1 block">
                {breakdown.costPrice.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-xs text-fg-muted">Gồm {(breakdown.failureReserveRate * 100).toFixed(0)}% dự phòng hỏng</span>
            </div>

            <div className="p-3.5 bg-primary-tint/60 border border-primary/30 rounded-sm">
              <span className="text-xs uppercase font-sans text-primary font-bold block">Giá Bán Đề Xuất (1 cái)</span>
              <span className="font-tech text-base font-bold text-primary mt-1 block">
                {breakdown.finalSellingPriceRounded.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-xs text-primary">Markup {breakdown.targetMarkupPercent}% • Margin {breakdown.calculatedGrossMarginPercent}%</span>
            </div>

            <div className="p-3.5 bg-positive-tint/60 border border-positive/40 rounded-sm">
              <span className="text-xs uppercase font-sans text-positive font-bold block">Lợi Nhuận Gộp Tổng Lô (x{quantity})</span>
              <span className="font-tech text-base font-bold text-positive mt-1 block">
                +{totalBatchGrossProfit.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-xs text-positive">Sau khi trừ giá vốn</span>
            </div>

            <div className="p-3.5 bg-surface-muted rounded-sm">
              <span className="text-xs uppercase font-sans text-fg-muted font-bold block">Thời Gian Máy Chạy</span>
              <span className="font-tech text-base font-bold text-fg mt-1 block">
                {breakdown.printHours} giờ / cái
              </span>
              <span className="text-xs text-fg-muted">Tổng lô: {(breakdown.printHours * quantity).toFixed(1)}h</span>
            </div>
          </div>

          {/* 6-Level Cost Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-bold text-sm text-fg flex items-center gap-1.5">
                <Icon name="bar_chart" size={18} className="text-primary" />
                Bảng Bóc Tách Chi Phí Sản Xuất Cơ Sở (Base Cost Breakdown)
              </h3>
              <span className="text-xs font-tech font-bold text-fg-muted">
                Tổng Base Cost: {breakdown.baseCost.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="border border-line-subtle rounded-sm overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-surface-muted text-fg-muted text-xs uppercase tracking-wider border-b border-line-subtle">
                  <tr>
                    <th className="p-3">Hạng Mục Chi Phí</th>
                    <th className="p-3">Công Thức & Diễn Giải Chi Tiết</th>
                    <th className="p-3 text-right">Tỷ Trọng</th>
                    <th className="p-3 text-right">Chi Phí (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {costItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-muted">
                      <td className="p-3 font-semibold text-fg whitespace-nowrap">{item.title}</td>
                      <td className="p-3 text-fg-muted text-xs font-sans">{item.details}</td>
                      <td className="p-3 text-right font-tech text-fg-muted">{item.percent}%</td>
                      <td className="p-3 text-right font-tech font-bold text-fg">{item.amount.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                  
                  {/* Failure Reserve Row */}
                  <tr className="bg-warning-tint/50 text-warning font-semibold">
                    <td className="p-3">7. Dự phòng in hỏng (Failure Reserve)</td>
                    <td className="p-3 text-xs">
                      Tỷ lệ rủi ro {(breakdown.failureReserveRate * 100).toFixed(0)}% dựa trên độ dốc Overhang & số màu in
                    </td>
                    <td className="p-3 text-right font-tech">{(breakdown.failureReserveRate * 100).toFixed(0)}%</td>
                    <td className="p-3 text-right font-tech font-bold text-warning">
                      +{breakdown.failureReserveCost.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>

                  {/* Summary Cost Price Row */}
                  <tr className="bg-surface-inverse text-on-inverse font-bold">
                    <td className="p-3 uppercase tracking-wider" colSpan={2}>
                      = TỔNG GIÁ VỐN XUẤT XƯỞNG (COST PRICE / UNIT)
                    </td>
                    <td className="p-3 text-right font-tech">100%</td>
                    <td className="p-3 text-right font-tech text-primary text-sm">
                      {breakdown.costPrice.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reverse Fee Calculation & Pricing Math */}
          <div className="bg-surface-muted p-4 rounded-lg space-y-3">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-fg flex items-center gap-1.5">
              <Icon name="functions" size={18} className="text-primary" />
              Giải Ngược Phí Sàn & Thuật Toán Tính Giá Bán (Reverse Fee Formula)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-surface rounded-sm">
                <span className="text-fg-muted block text-xs uppercase">1. Markup Mục Tiêu</span>
                <span className="font-tech font-bold text-base text-fg mt-0.5 block">{breakdown.targetMarkupPercent}%</span>
                <span className="text-xs text-fg-muted">Giá trước phí: {breakdown.preFeeSellingPrice.toLocaleString()} đ</span>
              </div>

              <div className="p-3 bg-surface rounded-sm">
                <span className="text-fg-muted block text-xs uppercase">2. Phí Biến Đổi Theo Doanh Thu</span>
                <span className="font-tech font-bold text-base text-fg mt-0.5 block">{totalVariableFeePercent}% Tổng</span>
                <span className="text-xs text-fg-muted">
                  Platform {breakdown.platformCommissionPercent}% + Cổng TT {breakdown.paymentGatewayFeePercent}% + Royalty {breakdown.designerRoyaltyPercent}%
                </span>
              </div>

              <div className="p-3 bg-surface rounded-sm">
                <span className="text-fg-muted block text-xs uppercase">3. Biên Lợi Nhuận Gộp Thực (Gross Margin)</span>
                <span className="font-tech font-bold text-base text-positive mt-0.5 block">{breakdown.calculatedGrossMarginPercent}%</span>
                <span className="text-xs text-positive">Lãi ròng trên doanh thu bán</span>
              </div>
            </div>

            <div className="p-3 bg-surface rounded-sm font-mono text-xs text-fg-muted">
              <code>
                SellingPrice = (CostPrice × (1 + Markup)) ÷ (1 − (PlatformFee% + PaymentFee% + Royalty%)) = 
                ({breakdown.costPrice.toLocaleString()} × {markupMultiplier}) ÷ (1 − {variableFeeRate}) = <strong>{breakdown.finalSellingPriceRounded.toLocaleString('vi-VN')} đ</strong> (Làm tròn lên 1.000đ)
              </code>
            </div>
          </div>

          {/* Admin Manual Price Override Box */}
          <div className="bg-warning/10 border border-warning/40 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-warning flex items-center gap-1.5">
                <Icon name="edit_note" size={18} />
                Ghi Đè Giá Bán Thủ Công (Admin / Operator Override)
              </span>
              <span className="text-xs text-warning">Yêu cầu nhập lý do lưu Audit Trail</span>
            </div>

            <form onSubmit={handleSaveOverride} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="text-xs font-sans uppercase tracking-wider font-bold text-warning block mb-1">
                  Đơn giá mới (VNĐ / cái)
                </label>
                <input
                  type="number"
                  min={breakdown.costPrice}
                  step="1000"
                  value={overridePriceInput}
                  onChange={(e) => setOverridePriceInput(e.target.value)}
                  className="w-full bg-surface border border-warning/40 p-2 text-xs font-tech font-bold text-fg rounded-sm focus:outline-none focus:border-warning"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="text-xs font-sans uppercase tracking-wider font-bold text-warning block mb-1">
                  Lý do điều chỉnh (Bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khách hàng thân thiết VIP, đơn dự án cơ khí..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-surface border border-warning/40 p-2 text-xs text-fg rounded-sm focus:outline-none focus:border-warning"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-surface-inverse hover:bg-surface-inverse-raised text-on-inverse text-xs font-sans uppercase tracking-wider font-bold rounded-sm transition-colors"
                >
                  Áp Dụng Override
                </button>
              </div>
            </form>

            {overrideError && (
              <div role="alert" className="text-xs text-danger font-bold bg-danger-tint p-2 rounded-sm">
                {overrideError}
              </div>
            )}
            {overrideSuccessMsg && (
              <div className="text-xs text-positive font-bold bg-positive-tint p-2 rounded-sm">
                {overrideSuccessMsg}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-line-subtle bg-surface-muted flex items-center justify-between text-xs">
          <span className="text-fg-muted">
            Mã hiệu thuật toán: <code className="font-mono text-fg">VCUBE-PRC-V2.4</code>
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-surface-inverse hover:bg-surface-inverse-raised text-on-inverse text-xs font-sans uppercase tracking-widest font-bold transition-colors rounded-sm"
          >
            Đóng Báo Cáo Nội Bộ
          </button>
        </div>
    </Modal>
  );
};
