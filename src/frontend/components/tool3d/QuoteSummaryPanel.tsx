import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnalysisFile, MaterialProfile, PrinterProfile, CartItem, DeliveryPackageOption, MachineComparisonItem, InkiriCostFormulaConfig } from '../../types';
import { MATERIALS_CATALOG, PRINTER_PROFILES } from '../../data/mockData';
import {
  calculateDetailedPricing,
  generateDeliveryPackages,
  comparePrintersForModel
} from '../../utils/pricingEngine';
import { computeVat, vatLabel, vatNotConfiguredLabel, vatRateFromPercent } from '../../lib/vat';
import { usePricingGlobalSettings } from '../../hooks/useSettings';
import { InternalCostBreakdownModal } from './InternalCostBreakdownModal';
import { MachineComparisonModal } from './MachineComparisonModal';
import { EmptyState, Icon, InfoTip } from '@frontend/ui';
import { useAuth } from '../../context/AuthContext';
import { EMPTY_VALUE } from '../../lib/format';

/**
 * Q (#2): `materials.price_per_gram` nay là **nullable thật** (mappers không còn điền 850).
 * `null` = CHƯA CẤU HÌNH ⇒ hiển thị `—`; gọi `.toLocaleString()` trên `null` từng làm trắng
 * màn hình `/quote`.
 */
const perGramText = (v: number | null | undefined): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toLocaleString('vi-VN')} đ/g` : EMPTY_VALUE;

/** Số hữu hạn hay không — NULL/NaN ⇒ KHÔNG có giá trị (không đoán hộ). */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Tiền VND của báo giá: thiếu giá trị ⇒ `—`, KHÔNG `NaN đ` và KHÔNG ném.
 * Cùng luật với `HomeView.tsx:26-34` / `ProductDetailView.tsx:21-30`: `0` không phải một mức giá.
 */
const vnd = (v: unknown): string =>
  isNum(v) && v > 0 ? `${v.toLocaleString('vi-VN')} đ` : EMPTY_VALUE;

/**
 * Dòng tiền được phép BẰNG 0 THẬT: `vat_percent = 0` là cấu hình hợp lệ (`lib/vat.ts`),
 * nên chỉ chặn khi giá trị KHÔNG phải số hữu hạn — không được biến một số 0 thật thành `—`.
 */
const vndAllowZero = (v: unknown): string =>
  isNum(v) ? `${v.toLocaleString('vi-VN')} đ` : EMPTY_VALUE;

interface QuoteSummaryPanelProps {
  file: AnalysisFile;
  transformedVolume: number;
  selectedPrinterId: string;
  selectedMaterialId: string;
  infillDensity: number;
  infillPattern: string;
  layerHeight: string;
  supportsMode: 'auto' | 'tree' | 'none';
  quantity: number;
  materials?: MaterialProfile[];
  printers?: PrinterProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onPrinterChange: (id: string) => void;
  onMaterialChange: (id: string) => void;
  onInfillChange: (val: number) => void;
  onInfillPatternChange: (val: string) => void;
  onLayerHeightChange: (val: string) => void;
  onSupportsModeChange: (val: 'auto' | 'tree' | 'none') => void;
  onQuantityChange: (val: number) => void;
  onAddToCart: (item: CartItem) => void;
  onDirectOrder: (item: CartItem) => void;
  onShowToast: (msg: string) => void;
}

export const QuoteSummaryPanel: React.FC<QuoteSummaryPanelProps> = ({
  file,
  transformedVolume,
  selectedPrinterId,
  selectedMaterialId,
  infillDensity,
  infillPattern,
  layerHeight,
  supportsMode,
  quantity,
  materials = MATERIALS_CATALOG,
  printers = PRINTER_PROFILES,
  pricingConfig,
  onPrinterChange,
  onMaterialChange,
  onInfillChange,
  onInfillPatternChange,
  onLayerHeightChange,
  onSupportsModeChange,
  onQuantityChange,
  onAddToCart,
  onDirectOrder,
  onShowToast
}) => {
  const [selectedPackageTier, setSelectedPackageTier] = useState<'economy' | 'standard' | 'express'>('standard');
  const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [customOverriddenPrice, setCustomOverriddenPrice] = useState<number | null>(null);
  const [isRequestingManualReview, setIsRequestingManualReview] = useState(false);
  const [manualReviewSent, setManualReviewSent] = useState(false);

  // N3b/PC-01: "Giá Vốn Xưởng" là báo cáo NỘI BỘ (giá vốn, biên lợi nhuận, ghi đè giá) —
  // chỉ render cho vai trò quản trị, không lộ cho khách. Hook đứng trước mọi `return` dưới.
  const { role } = useAuth();
  const canSeeInternalCost = role === 'admin';

  // Đợt 9 (R1): tỉ lệ VAT đọc từ `pricing_global_settings.vat_percent`.
  // Hook đặt Ở ĐÂY — TRƯỚC mọi `return` bên dưới — vì panel có early return khi chưa tính
  // được giá; đặt sau early return sẽ làm số hook khác nhau giữa các lần render (React
  // crash trắng màn hình, đúng lỗi A22a từng gây ra). Hook này cũng khiến /quote tự vẽ lại
  // khi cache cấu hình nạp xong (`bootstrapSettings()` ở main.tsx không `await`).
  const { data: pricingGlobal } = usePricingGlobalSettings();
  const vatRate = vatRateFromPercent(pricingGlobal?.vatPercent);

  // A11 GUARD: nguồn thật của máy in/vật liệu là bảng DB (`materials`, `printer_fleet`);
  // fixture `MATERIALS_CATALOG` / `PRINTER_PROFILES` đã rỗng hoá ⇒ `printers[0]` là `undefined`
  // ở runtime (type cũ che mất vì `noUncheckedIndexedAccess` đang tắt). Khai báo thẳng `| undefined`.
  const currentPrinter: PrinterProfile | undefined =
    printers.length > 0 ? printers.find(p => p.id === selectedPrinterId) ?? printers[0] : undefined;
  const currentMaterial: MaterialProfile | undefined =
    materials.length > 0 ? materials.find(m => m.id === selectedMaterialId) ?? materials[0] : undefined;

  // Core Pricing Calculation — thiếu máy in / vật liệu thì KHÔNG tính, KHÔNG hiện giá 0đ.
  let pricingResult: ReturnType<typeof calculateDetailedPricing> | null = null;
  let pricingUnavailableReason: string | null = null;

  if (!currentPrinter) {
    pricingUnavailableReason =
      'Chưa có máy in nào trong hệ thống, nên không có khổ bàn, công suất và khấu hao máy để tính giá.';
  } else if (!currentMaterial) {
    pricingUnavailableReason =
      'Chưa có vật liệu nào trong hệ thống, nên không có đơn giá nhựa (đ/g) để tính giá.';
  } else {
    try {
      pricingResult = calculateDetailedPricing({
        file,
        transformedVolume,
        selectedPrinterId,
        selectedMaterialId,
        infillDensity,
        infillPattern,
        layerHeight,
        supportsMode,
        quantity,
        customPricingConfig: pricingConfig,
        customPrinters: printers,
        customMaterials: materials
      });
    } catch (err) {
      pricingUnavailableReason =
        err instanceof Error ? err.message : 'Không tính được giá từ dữ liệu hiện có.';
    }
  }

  // Trạng thái rỗng TRUNG THỰC (docs/design/data-honesty.md §"Recommended UI states" #3):
  // nêu nguyên nhân + 1 hành động. Không hiện số liệu đoán, không hiện "đang tải" giả,
  // không hiện giá 0đ như thật.
  if (!pricingResult || !currentPrinter || !currentMaterial) {
    return (
      <div className="bg-surface p-5 sm:p-7 space-y-4 lg:sticky lg:top-24 shadow-e1 rounded-lg font-sans">
        <div className="border-b border-line pb-3">
          <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold block">
            VCUBE PRICING ENGINE
          </span>
          <h2 className="font-bold text-base sm:text-lg text-fg mt-0.5">
            Bảng Báo Giá Gia Công 3D Tức Thì
          </h2>
        </div>

        <EmptyState
          icon={<Icon name="precision_manufacturing" size={20} />}
          title="Chưa thể báo giá tự động"
          description={`${pricingUnavailableReason ?? 'Thiếu dữ liệu máy in hoặc vật liệu thật để tính giá.'} Quản trị viên thêm ở /admin → Cấu hình giá (Đội Máy In / Danh Mục Nhựa & Resin).`}
          action={
            <Link
              to="/admin/pricing"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase tracking-wider rounded-lg shadow-e1 transition-colors"
            >
              <Icon name="tune" size={18} />
              Mở Cấu hình giá (/admin/pricing)
            </Link>
          }
        />
      </div>
    );
  }

  const { breakdown, quickEstimateRange, tier, manualReviewReasons, volumeDiscount } = pricingResult;

  // Effective unit price (either overridden or standard calculated)
  const effectiveUnitPrice = customOverriddenPrice || breakdown.finalSellingPriceRounded;

  // P0-1: `generateDeliveryPackages` NÉM khi thiếu thông số giá (vd `economyDiscountPercent` /
  // `expressRushSurchargePercent` NULL ⇒ `PricingUnavailableError`). Trước đây nó được gọi THẲNG
  // trong thân render, KHÔNG bọc ⇒ lỗi lan ra ngoài render ⇒ React tháo TOÀN BỘ cây ⇒ `/quote`
  // trắng trang (0 ký tự) ngay khi khách vừa tải tệp CAD lên. Nay bọc ĐÚNG như
  // `calculateDetailedPricing` ở trên (:114-132): hỏng ⇒ `null` + NGUYÊN NHÂN THẬT, chỉ ẩn khối
  // phụ thuộc gói giao hàng, KHÔNG bao giờ làm trắng trang.
  let packages: DeliveryPackageOption[] | null = null;
  let packagesUnavailableReason: string | null = null;
  try {
    packages = generateDeliveryPackages(effectiveUnitPrice, quantity, pricingConfig);
  } catch (err) {
    packagesUnavailableReason =
      err instanceof Error ? err.message : 'Không dựng được gói giao hàng từ dữ liệu hiện có.';
  }
  // Danh sách rỗng ⇒ coi như KHÔNG có gói nào (không rơi vào `undefined` rồi ném tiếp ở JSX).
  const packageOptions: DeliveryPackageOption[] = packages ?? [];
  const selectedPackage: DeliveryPackageOption | null =
    packageOptions.length > 0
      ? packageOptions.find(p => p.tier === selectedPackageTier) || packageOptions[1] || packageOptions[0]
      : null;

  // Dòng VAT của báo giá: CÙNG `computeVat` + CÙNG tỉ lệ với /cart, /checkout và hoá đơn.
  // `selectedPackage.totalPrice` là giá CHƯA gồm VAT (`lib/vat.ts`) nên đây là tiền chịu thuế.
  // `vat_percent` NULL ⇒ `vat === null` ⇒ ẩn dòng VAT + nói rõ chưa cấu hình.
  const vat = selectedPackage ? computeVat(selectedPackage.totalPrice, vatRate) : null;

  // P0-1: `comparePrintersForModel` tính giá cho MỌI máy trong đội máy, nên CHỈ CẦN một dòng
  // `printer_fleet` thiếu khổ bàn (`bed_dimensions` NULL — vd bản ghi mẫu "[MẪU] Máy chưa khai
  // báo buồng in") là nó NÉM, và lỗi đó từng làm trắng cả trang `/quote`. Bọc cùng cách trên.
  let machineComparisons: MachineComparisonItem[] | null = null;
  let machineComparisonUnavailableReason: string | null = null;
  try {
    machineComparisons = comparePrintersForModel(
      file,
      transformedVolume,
      selectedMaterialId,
      infillDensity,
      layerHeight,
      supportsMode,
      quantity,
      pricingConfig,
      printers,
      materials
    );
  } catch (err) {
    machineComparisonUnavailableReason =
      err instanceof Error ? err.message : 'Không so sánh được các máy in từ dữ liệu hiện có.';
  }

  // Expiration Date (7 days from now)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  const expirationFormatted = expirationDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Handle building cart item — nhận ĐÚNG gói đã chọn (không đọc biến có thể `null`).
  const handleBuildCartItem = (pkg: DeliveryPackageOption): CartItem => {
    return {
      id: `custom-quote-${Date.now()}`,
      productId: file.id,
      type: 'physical',
      name: `Gia công 3D [${pkg.name}]: ${file.fileName}`,
      designer: 'VCUBE Engineering Studio',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      price: pkg.pricePerUnit,
      quantity: quantity,
      material: `${currentMaterial.name} (${currentPrinter.name})`,
      color: file.parts.length > 1 ? `${file.parts.length} màu chi tiết` : file.parts[0]?.color || 'Xanh Teal Công Nghiệp',
      colorHex: file.parts[0]?.colorHex || '#00687a',
      dimensions: `${file.dimensions.x.toFixed(1)} x ${file.dimensions.y.toFixed(1)} x ${file.dimensions.z.toFixed(1)} mm`,
      resolution: `${layerHeight}mm Layer • Infill ${infillDensity}% ${infillPattern} • Giao: ${pkg.completionDate}`
    };
  };

  const handleSendManualReview = () => {
    setIsRequestingManualReview(true);
    setTimeout(() => {
      setIsRequestingManualReview(false);
      setManualReviewSent(true);
      onShowToast('Đã gửi yêu cầu thẩm định phôi in đến đội ngũ Kỹ sư xưởng.');
    }, 1000);
  };

  return (
    <div className="bg-surface p-5 sm:p-7 space-y-6 lg:sticky lg:top-24 shadow-e1 rounded-lg font-sans">
      
      {/* Header & 3-Tier Status */}
      <div className="border-b border-line pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold block">
            VCUBE PRICING ENGINE
          </span>
          <h2 className="font-bold text-base sm:text-lg text-fg mt-0.5">
            Bảng Báo Giá Gia Công 3D Tức Thì
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsMachineModalOpen(true)}
            disabled={machineComparisons === null}
            className="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-canvas hover:bg-surface-muted border border-line text-fg rounded-full transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={machineComparisons === null
              ? 'Chưa so sánh được các máy in — xem lý do ở nút thông tin bên cạnh'
              : 'So sánh giữa các máy in tương thích'}
          >
            <Icon name="tune" size={18} className="text-primary" />
            So Sánh Máy
          </button>

          {/* P0-1: khối so sánh máy hỏng (một máy thiếu khổ bàn / thiếu thông số giá) ⇒ ẩn bảng
              so sánh và nói NGUYÊN NHÂN THẬT, thay vì để lỗi ném ra và trắng cả trang. */}
          {machineComparisons === null && (
            <InfoTip label="Vì sao chưa so sánh được các máy in?">
              {`${machineComparisonUnavailableReason ?? 'Không tính được giá cho một máy trong đội máy.'} Bảng so sánh cần khổ bàn (bed_dimensions) và thông số giá của MỌI máy. Quản trị viên bổ sung ở /admin → Cấu hình giá (Đội Máy In).`}
            </InfoTip>
          )}

          {canSeeInternalCost && (
            <button
              type="button"
              onClick={() => setIsInternalModalOpen(true)}
              className="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-surface-inverse hover:bg-surface-inverse text-accent rounded-full transition-colors flex items-center gap-1 cursor-pointer"
              title="Xem bóc tách giá vốn nội bộ (chỉ vai trò quản trị)"
            >
              <Icon name="analytics" size={18} />
              Giá Vốn Xưởng
            </button>
          )}
        </div>
      </div>

      {/* Volume Discount Live Banner */}
      {volumeDiscount ? (
        <div className="p-3.5 bg-positive-tint border border-positive/40 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-positive flex items-center gap-1.5 font-mono">
              <Icon name="verified" size={18} className="text-positive" />
              {volumeDiscount.tierLabel}
            </span>
            <span className="font-mono text-xs font-bold text-positive bg-positive-tint px-2 py-0.5 rounded-sm">
              -{volumeDiscount.discountPercent}% OFF
            </span>
          </div>
          <div className="text-xs text-positive flex justify-between pt-0.5 font-mono">
            <span>Tiết kiệm đơn này:</span>
            <strong className="text-positive font-bold">{isNum(volumeDiscount.totalSavings) ? `-${volumeDiscount.totalSavings.toLocaleString('vi-VN')} đ` : EMPTY_VALUE}</strong>
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-canvas border border-line rounded-lg flex items-center justify-between text-xs text-fg-muted font-mono">
          <span>Chiết khấu số lượng:</span>
          <span className="text-primary font-bold">Từ 5 cái (-8%) đến 50+ cái (-30%)</span>
        </div>
      )}

      {/* 1. MỨC 1: GIÁ ƯỚC TÍNH NHANH (Quick Estimate Banner) */}
      <div className="p-3.5 bg-canvas border border-line rounded-lg space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-fg-muted flex items-center gap-1">
            <Icon name="speed" size={18} className="text-primary" />
            1. Ước Tính Hình Học Sơ Bộ:
          </span>
          <span className="font-mono text-xs font-bold text-primary">
            {isNum(quickEstimateRange.min) && isNum(quickEstimateRange.max)
              ? `${quickEstimateRange.min.toLocaleString('vi-VN')} – ${quickEstimateRange.max.toLocaleString('vi-VN')} đ/cái`
              : EMPTY_VALUE}
          </span>
        </div>
      </div>

      {/* Slicer Config Controls */}
      <div className="space-y-4 pt-1">
        
        {/* Máy In & Vật Liệu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="quote-printer" className="text-xs font-sans uppercase tracking-wider text-fg-subtle font-bold block">
              Máy In Gia Công
            </label>
            <select
              id="quote-printer"
              value={selectedPrinterId}
              onChange={(e) => onPrinterChange(e.target.value)}
              className="w-full bg-canvas border border-line p-2 text-xs text-fg rounded-lg font-sans focus:outline-none focus:border-primary"
            >
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.technology})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="quote-material" className="text-xs font-sans uppercase tracking-wider text-fg-subtle font-bold block">
              Loại Nhựa Kỹ Thuật
            </label>
            <select
              id="quote-material"
              value={selectedMaterialId}
              onChange={(e) => onMaterialChange(e.target.value)}
              className="w-full bg-canvas border border-line p-2 text-xs text-fg rounded-lg font-sans focus:outline-none focus:border-primary"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({perGramText(m.pricePerGram)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Infill & Pattern */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="quote-infill" className="text-xs font-sans uppercase tracking-wider text-fg-subtle font-bold">
              Độ Đặc Ruột (Infill): <span className="font-tech text-primary">{infillDensity}% {infillPattern}</span>
            </label>
            <div className="flex items-center gap-1">
              {['Gyroid', 'Grid', 'Honeycomb'].map((pat) => (
                <button
                  key={pat}
                  type="button"
                  onClick={() => onInfillPatternChange(pat)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-mono transition-colors ${
                    infillPattern === pat
                      ? 'bg-primary text-primary-fg border-primary font-bold shadow-e1'
                      : 'bg-canvas text-fg-subtle border-line hover:text-fg'
                  }`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>
          <input
            id="quote-infill"
            type="range"
            min="10"
            max="100"
            step="5"
            value={infillDensity}
            onChange={(e) => onInfillChange(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
        </div>

        {/* Layer Height & Support */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quote-layer-height" className="text-xs font-sans uppercase tracking-wider text-fg-subtle font-bold block mb-1">
              Độ Dày Lớp In
            </label>
            <select
              id="quote-layer-height"
              value={layerHeight}
              onChange={(e) => onLayerHeightChange(e.target.value)}
              className="w-full bg-canvas border border-line p-2 text-xs text-fg rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="0.08">0.08 mm (Ultra Fine)</option>
              <option value="0.12">0.12 mm (Fine Detail)</option>
              <option value="0.16">0.16 mm (Standard Pro)</option>
              <option value="0.20">0.20 mm (Draft Fast)</option>
            </select>
          </div>

          <div>
            <label htmlFor="quote-supports-mode" className="text-xs font-sans uppercase tracking-wider text-fg-subtle font-bold block mb-1">
              Cấu Hình Support
            </label>
            <select
              id="quote-supports-mode"
              value={supportsMode}
              onChange={(e) => onSupportsModeChange(e.target.value as any)}
              className="w-full bg-canvas border border-line p-2 text-xs text-fg rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="tree">Tree Support (Dễ bóc)</option>
              <option value="auto">Auto Grid Standard</option>
              <option value="none">Không dùng Support</option>
            </select>
          </div>
        </div>

        {/* Batch Quantity Selector */}
        <div className="flex items-center justify-between pt-1">
          <label className="text-xs font-semibold text-fg">
            Số lượng đặt in (Batch):
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 5, 10, 20].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => onQuantityChange(qty)}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition-colors ${
                  quantity === qty
                    ? 'bg-primary text-primary-fg border-primary shadow-e1'
                    : 'bg-canvas text-fg border-line hover:border-primary'
                }`}
              >
                x{qty}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MỨC 2: 3 GÓI BÁO GIÁ CHÍNH XÁC (Customer Packages: Economy, Standard, Express) */}
      <div className="space-y-3 pt-2 border-t border-line">
        <div className="flex items-center justify-between">
          <label className="text-xs font-sans uppercase tracking-wider font-bold text-fg flex items-center gap-1">
            <Icon name="local_shipping" size={18} className="text-primary" />
            2. Báo Giá Chính Xác Theo Tiến Độ Giao Hàng
          </label>
          <span className="text-xs text-fg-subtle font-mono">Hiệu lực: {expirationFormatted}</span>
        </div>

        {selectedPackage === null ? (
          <EmptyState
            size="sm"
            bordered
            icon={<Icon name="precision_manufacturing" size={20} />}
            title="Chưa dựng được gói giao hàng"
            description={`${packagesUnavailableReason ?? 'Chưa cấu hình chiết khấu gói Tiết kiệm / phụ thu gói Hỏa tốc để dựng 3 gói báo giá.'} Quản trị viên bổ sung ở /admin → Cấu hình giá (Cấu hình chung).`}
            action={
              <Link
                to="/admin/pricing"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase tracking-wider rounded-lg shadow-e1 transition-colors"
              >
                <Icon name="tune" size={18} />
                Mở Cấu hình giá (/admin/pricing)
              </Link>
            }
          />
        ) : (
        <div className="space-y-2">
          {packageOptions.map((pkg) => {
            const isSelected = selectedPackageTier === pkg.tier;
            return (
              <div
                key={pkg.tier}
                onClick={() => setSelectedPackageTier(pkg.tier)}
                className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary-tint/40 ring-1 ring-primary'
                    : 'border-line hover:border-line bg-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      id={`quote-package-${pkg.tier}`}
                      type="radio"
                      name="packageTier"
                      aria-label={`Chọn gói ${pkg.name}`}
                      checked={isSelected}
                      onChange={() => setSelectedPackageTier(pkg.tier)}
                      className="accent-primary"
                    />
                    <div>
                      <div className="font-bold text-xs text-fg flex items-center gap-1.5">
                        <span>{pkg.name}</span>
                        {pkg.isPopular && (
                          <span className="px-1.5 py-0.2 text-xs bg-primary text-primary-fg font-mono uppercase rounded-sm">
                            Phổ Biến
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-fg-subtle mt-0.5">
                        Thời gian: <strong>{pkg.leadTimeDays}</strong> (Dự kiến xong: {pkg.completionDate})
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm sm:text-base font-bold text-fg">
                      {vnd(pkg.pricePerUnit)}
                      <span className="text-xs font-normal text-fg-subtle"> /cái</span>
                    </div>
                    {quantity > 1 && (
                      <div className="text-xs font-mono text-primary font-semibold">
                        Tổng ({quantity} cái): {vnd(pkg.totalPrice)}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-fg-subtle mt-1 pl-5">
                  {pkg.description}
                </p>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* 3. MỨC 3: BÁO GIÁ CẦN KIỂM DUYỆT (Manual Review / Approval Alert) */}
      {tier === 'manual_review' && (
        <div className="p-4 bg-warning-tint border border-warning/40 rounded-lg space-y-2.5">
          <div className="flex items-center gap-2 text-warning font-bold text-xs">
            <Icon name="policy" size={18} className="text-warning" />
            3. Phôi In Cần Kỹ Sư Kiểm Duyệt (Manual Review Required)
          </div>
          <p className="text-xs text-warning leading-relaxed">
            Hệ thống phát hiện một số thông số kỹ thuật đặc biệt cần xưởng thẩm định trực tiếp trước khi sản xuất:
          </p>
          <ul className="text-xs text-warning space-y-1 list-disc pl-4">
            {manualReviewReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>

          {manualReviewSent ? (
            <div className="text-xs text-positive font-bold bg-positive-tint p-2 rounded-sm flex items-center gap-1.5">
              <Icon name="check_circle" size={18} />
              Đã gửi yêu cầu thẩm định! Kỹ sư xưởng sẽ phản hồi trong 30 phút.
            </div>
          ) : (
            <button
              type="button"
              disabled={isRequestingManualReview}
              onClick={handleSendManualReview}
              className="w-full py-2 bg-warning hover:opacity-90 text-primary-fg text-xs font-sans uppercase tracking-wider font-bold rounded-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Icon name="send" size={18} />
              {isRequestingManualReview ? 'Đang Gửi Yêu Cầu...' : 'Gửi Yêu Cầu Thẩm Định Kỹ Thuật'}
            </button>
          )}
        </div>
      )}

      {/* Final Total Summary Bar.
          Đợt 9 (R1): giá gói là giá CHƯA gồm VAT (hợp đồng của `lib/vat.ts`), nên nhãn cũ
          "Đã gồm VAT & Gói …" là một khẳng định SAI về thuế — đã bỏ. Nay in giá gói, DÒNG
          VAT thật (cùng tỉ lệ với /cart → /checkout → hoá đơn) và tổng SAU VAT.
          P0-1: không có gói giao hàng thật thì KHÔNG có tổng nào để in — ẩn thanh này thay vì
          bịa số; nguyên nhân đã nêu ở khối "2. Báo Giá Chính Xác" ngay phía trên. */}
      {selectedPackage && (
      <div className="bg-surface-inverse text-on-inverse p-4 rounded-lg space-y-2.5 border border-surface-inverse-raised/60 shadow-e2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs uppercase font-mono tracking-widest text-on-inverse/70 block">
            Tổng Giá Trị Đơn Hàng ({quantity} cái):
          </span>
          <span className="text-xs text-accent font-mono shrink-0">Gói {selectedPackage.name}</span>
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex items-baseline justify-between">
            <span className="text-on-inverse/70">Giá gói (chưa gồm VAT):</span>
            <span>{vnd(selectedPackage.totalPrice)}</span>
          </div>
          {vat ? (
            <div className="flex items-baseline justify-between">
              <span className="text-on-inverse/70">{vatLabel(vat.rate)}:</span>
              <span>{vndAllowZero(vat.amount)}</span>
            </div>
          ) : (
            <p className="text-xs text-on-inverse/70 leading-relaxed font-sans">{vatNotConfiguredLabel(true)}</p>
          )}
          <div className="flex items-baseline justify-between border-t border-surface-inverse-raised/60 pt-1.5">
            <span className="font-bold">Tổng phải trả:</span>
            <span className="font-mono text-2xl font-bold text-accent">
              {vnd(vat ? vat.total : selectedPackage.totalPrice)}
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Action Buttons — chỉ hiện khi CÓ gói giao hàng thật (không bán một gói không tồn tại). */}
      {selectedPackage && (
      <div className="space-y-2 pt-1 font-mono">
        <button
          type="button"
          onClick={() => onAddToCart(handleBuildCartItem(selectedPackage))}
          className="w-full py-3.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-e1 rounded-full cursor-pointer"
        >
          <Icon name="shopping_cart" size={18} />
          Thêm Đơn Gia Công Vào Giỏ Hàng
        </button>

        <button
          type="button"
          onClick={() => onDirectOrder(handleBuildCartItem(selectedPackage))}
          className="w-full py-3 bg-surface-inverse hover:bg-surface-inverse text-on-inverse font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 rounded-full cursor-pointer border border-surface-inverse-raised"
        >
          <Icon name="precision_manufacturing" size={18} className="text-accent" />
          Đặt In Ngay (Chuyển Đến Thanh Toán)
        </button>
      </div>
      )}

      {/* Modals */}
      {canSeeInternalCost && (
        <InternalCostBreakdownModal
          isOpen={isInternalModalOpen}
          onClose={() => setIsInternalModalOpen(false)}
          fileName={file.fileName}
          quantity={quantity}
          breakdown={breakdown}
          currentPrinter={currentPrinter}
          onApplyOverride={(newPrice, reason) => {
            setCustomOverriddenPrice(newPrice);
            onShowToast(`Đã áp dụng giá điều chỉnh: ${isNum(newPrice) ? newPrice.toLocaleString('vi-VN') : EMPTY_VALUE} đ (Lý do: ${reason})`);
          }}
        />
      )}

      <MachineComparisonModal
        isOpen={isMachineModalOpen && machineComparisons !== null}
        onClose={() => setIsMachineModalOpen(false)}
        items={machineComparisons ?? []}
        selectedPrinterId={selectedPrinterId}
        showCost={canSeeInternalCost}
        onSelectPrinter={(id) => {
          onPrinterChange(id);
          // A11: `PRINTER_PROFILES` (fixture) đã rỗng ⇒ đọc từ danh sách thật để không hiện 'undefined'.
          onShowToast(`Đã chuyển đổi máy in sang ${printers.find(p => p.id === id)?.name ?? id}`);
        }}
      />

    </div>
  );
};
