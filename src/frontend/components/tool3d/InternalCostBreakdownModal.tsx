import React, { useState } from 'react';
import { DetailedCostBreakdown, PrinterProfile } from '../../types';
import { formatCurrency, formatNumber } from '@frontend/lib/format';
import { Icon, Modal, Money } from '@frontend/ui';

/**
 * F7 — nhãn NGUỒN của gram/giờ để báo cáo nội bộ truy được con số về đâu (data-honesty).
 * Thiếu provenance (bản ghi cũ) ⇒ "chưa xác định nguồn", KHÔNG đoán.
 */
const GRAMS_SOURCE_TEXT: Record<string, string> = {
  slicer: 'từ file slicer',
  volume_estimate: 'ước tính theo thể tích'
};

const TIME_SOURCE_TEXT: Record<string, string> = {
  slicer: 'từ file slicer',
  throughput: 'ước tính theo năng suất máy',
  volume_estimate: 'ước tính theo thể tích'
};

const sourceText = (map: Record<string, string>, source?: string): string =>
  source ? map[source] ?? source : 'chưa xác định nguồn';

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

  // W2-NEW-1 (StrictMode): luôn mount <Modal>, chỉ đổi prop `open`; không return null.
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
      setOverrideError(`Giá bán điều chỉnh không được thấp hơn giá vốn xuất xưởng (${formatCurrency(breakdown.costPrice)}).`);
      return;
    }
    if (!overrideReason.trim()) {
      setOverrideError('Vui lòng nhập lý do điều chỉnh giá (bắt buộc để lưu audit log nội bộ).');
      return;
    }
    onApplyOverride?.(newPrice, overrideReason);
    setOverrideSuccessMsg(`Đã ghi đè đơn giá: ${formatCurrency(newPrice)}/cái`);
  };

  const costItems = [
    {
      title: '1. Chi phí vật liệu (nhựa in / nhựa lỏng)',
      amount: breakdown.materialCost,
      percent: sharePercent(breakdown.materialCost),
      details: `${breakdown.totalFilamentGrams} g nhựa (mô hình: ${breakdown.modelGrams} g + vật liệu đỡ: ${breakdown.supportGrams} g + xả nhựa: ${breakdown.purgeGrams} g + viền đế: ${breakdown.brimRaftGrams} g) × ${breakdown.materialCostPerGram} ₫/g • Nguồn khối lượng: ${sourceText(GRAMS_SOURCE_TEXT, breakdown.gramsSource)}`
    },
    {
      title: '2. Chi phí điện năng tiêu thụ',
      amount: breakdown.electricityCost,
      percent: sharePercent(breakdown.electricityCost),
      details: `${breakdown.averagePowerKW} kW (công suất trung bình) × ${breakdown.printHours} h × ${formatNumber(breakdown.electricityRatePerKWh)} ₫/kWh`
    },
    {
      title: '3. Khấu hao máy & vật tư hao mòn (đầu phun / bàn in)',
      amount: breakdown.machineOperatingCost,
      percent: sharePercent(breakdown.machineOperatingCost),
      details: `Khấu hao: ${formatCurrency(breakdown.machineDepreciationCost)} + bảo trì/vật tư: ${formatCurrency(breakdown.maintenanceAndConsumablesCost)} (${currentPrinter.name})`
    },
    {
      title: '4. Chi phí nhân công kỹ thuật',
      amount: breakdown.laborCost,
      percent: sharePercent(breakdown.laborCost),
      // R1/R4: in DUNG so phut va DON GIA dang dung trong ban tinh (`DetailedCostBreakdown`).
      // Truoc day dong nay hardcode "Review 4p + Setup 5p + ... + Pack 3p @ 65.000đ/h" nen van in
      // 65.000đ/h ke ca khi `pricing_global_settings.labor_hourly_rate_vnd` dat don gia khac.
      details:
        `${breakdown.totalLaborMinutes} phút phân bổ (kiểm duyệt ${breakdown.fileReviewLaborMinutes} phút`
        + ` + chuẩn bị ${breakdown.setupLaborMinutes} phút`
        + ` + gỡ vật liệu đỡ ${breakdown.supportRemovalMinutes} phút`
        + ` + hậu xử lý ${breakdown.postProcessingLaborMinutes} phút`
        + ` + kiểm tra chất lượng ${breakdown.qcLaborMinutes} phút`
        + ` + đóng gói ${breakdown.packagingLaborMinutes} phút)`
        + ` @ ${formatCurrency(breakdown.laborHourlyRate)}/giờ`
    },
    {
      title: '5. Phụ kiện & đóng gói tiêu chuẩn',
      amount: breakdown.accessoriesCost,
      percent: sharePercent(breakdown.accessoriesCost),
      details: 'Hộp carton sóng, túi zip chống ẩm, hạt hút ẩm, màng xốp nổ PE'
    },
    {
      title: '6. Chi phí cố định phân bổ',
      amount: breakdown.overheadPerUnit,
      percent: sharePercent(breakdown.overheadPerUnit),
      details: 'Mặt bằng xưởng, bản quyền phần mềm cắt lớp/CAD, internet, quản lý'
    }
  ];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      bodyClassName="p-0"
      title={
        <span>
          <span className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
              PRC-006 // Báo cáo giá vốn &amp; lợi nhuận nội bộ
            </span>
            <span className="px-2 py-0.5 text-xs bg-danger-tint text-danger font-bold rounded-sm border border-danger/20">
              Chỉ dành cho kỹ sư &amp; quản đốc
            </span>
          </span>
          <span className="block font-sans font-bold text-base sm:text-lg text-fg">
            Cấu trúc chi phí &amp; định giá: {fileName}
          </span>
        </span>
      }
    >
        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-surface-muted border border-line-subtle rounded-md">
              <span className="text-xs uppercase font-sans text-fg-muted font-bold block">Giá vốn xuất xưởng (1 cái)</span>
              <span className="font-mono tabular-nums text-base font-bold text-fg mt-1 block">
                <Money value={breakdown.costPrice} />
              </span>
              <span className="text-xs text-fg-muted">Gồm {(breakdown.failureReserveRate * 100).toFixed(0)}% dự phòng hỏng</span>
            </div>

            <div className="p-3.5 bg-primary-tint border border-line rounded-md">
              <span className="text-xs uppercase font-sans text-fg-muted font-bold block">Giá bán đề xuất (1 cái)</span>
              <span className="font-mono tabular-nums text-base font-bold text-fg mt-1 block">
                <Money value={breakdown.finalSellingPriceRounded} className="text-fg font-bold" />
              </span>
              <span className="text-xs text-fg-muted">Hệ số nhân {breakdown.targetMarkupPercent}% • Biên lợi nhuận {breakdown.calculatedGrossMarginPercent}%</span>
            </div>

            <div className="p-3.5 bg-positive-tint border border-positive/20 rounded-md">
              <span className="text-xs uppercase font-sans text-positive font-bold block">Lợi nhuận gộp tổng lô (x{quantity})</span>
              <span className="font-mono tabular-nums text-base font-bold text-positive mt-1 block">
                <Money value={totalBatchGrossProfit} signed className="text-positive font-bold" />
              </span>
              <span className="text-xs text-positive">Sau khi trừ giá vốn</span>
            </div>

            <div className="p-3.5 bg-surface-muted border border-line-subtle rounded-md">
              <span className="text-xs uppercase font-sans text-fg-muted font-bold block">Thời gian máy chạy</span>
              <span className="font-mono tabular-nums text-base font-bold text-fg mt-1 block">
                {breakdown.printHours} giờ / cái
              </span>
              <span className="text-xs text-fg-muted">Tổng lô: {(breakdown.printHours * quantity).toFixed(1)}h</span>
              <span className="text-xs text-fg-muted block">
                Nguồn thời gian: {sourceText(TIME_SOURCE_TEXT, breakdown.printHoursSource)}
                {breakdown.printHoursSource === 'throughput' &&
                typeof breakdown.throughputGramsPerHourUsed === 'number' &&
                Number.isFinite(breakdown.throughputGramsPerHourUsed)
                  ? ` (${formatNumber(breakdown.throughputGramsPerHourUsed, { maximumFractionDigits: 1 })} g/h)`
                  : ''}
              </span>
            </div>
          </div>

          {/* 6-Level Cost Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-bold text-sm text-fg flex items-center gap-1.5">
                <Icon name="bar_chart" size={18} className="text-primary" />
                Bảng bóc tách chi phí sản xuất cơ sở
              </h3>
              <span className="text-xs font-tech font-bold text-fg-muted">
                Tổng giá vốn cơ sở: {formatCurrency(breakdown.baseCost)}
              </span>
            </div>

            {/* UI-020 (390): modal không ép cuộn ngang bảng 640px — dưới md render card list
                cùng dữ liệu `costItems`; từ md trở lên giữ bảng mật độ console. */}
            <div className="space-y-2 md:hidden">
              {costItems.map((item, idx) => (
                <div key={idx} className="rounded-md border border-line bg-surface p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-semibold text-fg">{item.title}</span>
                    <Money value={item.amount} as="span" className="shrink-0 font-bold text-fg" />
                  </div>
                  <p className="break-words text-xs text-fg-muted">{item.details}</p>
                  <span className="block font-mono text-xs tabular-nums text-fg-muted">Tỷ trọng: {item.percent}%</span>
                </div>
              ))}
              <div className="space-y-1 rounded-md border border-warning/20 bg-warning-tint p-3">
                <span className="text-sm font-semibold text-warning">7. Dự phòng in hỏng</span>
                <p className="break-words text-xs text-warning">
                  Tỷ lệ rủi ro {(breakdown.failureReserveRate * 100).toFixed(0)}% dựa trên góc nhô &amp; số màu in
                </p>
                <div className="flex items-center justify-between gap-2 font-mono text-xs text-warning">
                  <span className="tabular-nums">{(breakdown.failureReserveRate * 100).toFixed(0)}%</span>
                  <Money value={breakdown.failureReserveCost} signed className="font-bold text-warning" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-muted p-3">
                <span className="text-xs font-bold uppercase tracking-wider text-fg">= Tổng giá vốn xuất xưởng (một cái)</span>
                <Money value={breakdown.costPrice} className="font-bold text-fg" />
              </div>
            </div>

            <div className="hidden border border-line rounded-lg overflow-x-auto md:block">
              <table className="w-full text-left text-sm font-sans">
                <thead className="bg-surface-muted text-fg-subtle text-xs uppercase tracking-wider">
                  <tr>
                    <th className="h-10 px-4 text-left font-semibold">Hạng Mục Chi Phí</th>
                    <th className="h-10 px-4 text-left font-semibold">Công Thức &amp; Diễn Giải Chi Tiết</th>
                    <th className="h-10 px-4 text-right font-semibold">Tỷ Trọng</th>
                    <th className="h-10 px-4 text-right font-semibold">Chi phí (₫)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {costItems.map((item, idx) => (
                    <tr key={idx} className="border-t border-line-subtle hover:bg-surface-muted/60">
                      <td className="px-4 py-3 font-semibold text-fg whitespace-nowrap">{item.title}</td>
                      <td className="px-4 py-3 text-fg-muted text-xs font-sans">{item.details}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-fg-muted">{item.percent}%</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-fg"><Money value={item.amount} as="span" className="font-bold text-fg" /></td>
                    </tr>
                  ))}
                  
                  {/* Failure Reserve Row */}
                  <tr className="bg-warning-tint text-warning border-t border-line-subtle font-semibold">
                    <td className="px-4 py-3">7. Dự phòng in hỏng</td>
                    <td className="px-4 py-3 text-xs">
                      Tỷ lệ rủi ro {(breakdown.failureReserveRate * 100).toFixed(0)}% dựa trên góc nhô & số màu in
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{(breakdown.failureReserveRate * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-warning">
                      <Money value={breakdown.failureReserveCost} signed className="text-warning font-bold" />
                    </td>
                  </tr>

                  {/* Summary Cost Price Row */}
                  <tr className="bg-surface-muted text-fg border-t border-line-subtle font-bold">
                    <td className="px-4 py-3 uppercase tracking-wider" colSpan={2}>
                      = TỔNG GIÁ VỐN XUẤT XƯỞNG (MỘT CÁI)
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">100%</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-lg font-bold text-fg">
                      <Money value={breakdown.costPrice} className="text-fg font-bold" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reverse Fee Calculation & Pricing Math */}
          <div className="bg-surface-muted border border-line-subtle p-4 rounded-lg space-y-3">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-fg flex items-center gap-1.5">
              <Icon name="functions" size={18} className="text-primary" />
              Giải ngược phí sàn & thuật toán tính giá bán
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-surface border border-line-subtle rounded-md">
                <span className="text-fg-muted block text-xs uppercase">1. Hệ số nhân mục tiêu</span>
                <span className="font-mono tabular-nums font-bold text-base text-fg mt-0.5 block">{breakdown.targetMarkupPercent}%</span>
                <span className="text-xs text-fg-muted">Giá trước phí: {formatCurrency(breakdown.preFeeSellingPrice)}</span>
              </div>

              <div className="p-3 bg-surface border border-line-subtle rounded-md">
                <span className="text-fg-muted block text-xs uppercase">2. Phí biến đổi theo doanh thu</span>
                <span className="font-mono tabular-nums font-bold text-base text-fg mt-0.5 block">{totalVariableFeePercent}% Tổng</span>
                <span className="text-xs text-fg-muted">
                  Phí sàn {breakdown.platformCommissionPercent}% + cổng thanh toán {breakdown.paymentGatewayFeePercent}% + phí bản quyền {breakdown.designerRoyaltyPercent}%
                </span>
              </div>

              <div className="p-3 bg-surface border border-line-subtle rounded-md">
                <span className="text-fg-muted block text-xs uppercase">3. Biên lợi nhuận gộp thực</span>
                <span className="font-mono tabular-nums font-bold text-base text-positive mt-0.5 block">{breakdown.calculatedGrossMarginPercent}%</span>
                <span className="text-xs text-positive">Lãi ròng trên doanh thu bán</span>
              </div>
            </div>

            <div className="p-3 bg-surface border border-line-subtle rounded-md font-mono text-xs text-fg-muted">
              <code>
                Giá bán = (Giá vốn × (1 + hệ số nhân)) ÷ (1 − (phí sàn + phí thanh toán + phí bản quyền)) =
                ({formatCurrency(breakdown.costPrice)} × {markupMultiplier}) ÷ (1 − {variableFeeRate}) = <strong><Money value={breakdown.finalSellingPriceRounded} className="font-bold" /></strong> (làm tròn lên 1.000 ₫)
              </code>
            </div>
          </div>

          {/* Admin Manual Price Override Box */}
          <div className="bg-warning-tint border border-warning/20 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-warning flex items-center gap-1.5">
                <Icon name="edit_note" size={18} />
                Ghi đè giá bán thủ công (quản trị / vận hành)
              </span>
              <span id="override-audit-note" className="text-xs text-warning">Yêu cầu nhập lý do để lưu vết kiểm toán</span>
            </div>

            <form onSubmit={handleSaveOverride} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label htmlFor="override-price-input" className="text-xs font-sans uppercase tracking-wider font-bold text-warning block mb-1">
                  Đơn giá mới (₫ / cái)
                </label>
                <input
                  id="override-price-input"
                  type="number"
                  min={breakdown.costPrice}
                  step="1000"
                  value={overridePriceInput}
                  onChange={(e) => setOverridePriceInput(e.target.value)}
                  aria-invalid={Boolean(overrideError)}
                  aria-describedby={overrideError ? 'override-audit-note override-form-error' : 'override-audit-note'}
                  className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm font-mono font-bold text-fg focus:outline-none focus:border-warning focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="sm:col-span-5">
                <label htmlFor="override-reason-input" className="text-xs font-sans uppercase tracking-wider font-bold text-warning block mb-1">
                  Lý do điều chỉnh (Bắt buộc)
                </label>
                <input
                  id="override-reason-input"
                  type="text"
                  placeholder="Ví dụ: Khách hàng thân thiết VIP, đơn dự án cơ khí..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  aria-invalid={Boolean(overrideError)}
                  aria-describedby={overrideError ? 'override-audit-note override-form-error' : 'override-audit-note'}
                  className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg focus:outline-none focus:border-warning focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full h-10 max-md:min-h-11 px-4 bg-primary hover:bg-primary-hover text-primary-fg text-sm font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Áp dụng ghi đè
                </button>
              </div>
            </form>

            {overrideError && (
              <div id="override-form-error" role="alert" className="text-xs text-danger font-semibold bg-danger-tint border border-danger/20 p-2.5 rounded-md">
                {overrideError}
              </div>
            )}
            {overrideSuccessMsg && (
              <div className="text-xs text-positive font-semibold bg-positive-tint border border-positive/20 p-2.5 rounded-md">
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
            type="button"
            onClick={onClose}
            className="h-10 max-md:min-h-11 px-4 bg-surface hover:bg-surface-muted border border-line-control text-fg text-sm font-semibold transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Đóng báo cáo nội bộ
          </button>
        </div>
    </Modal>
  );
};
