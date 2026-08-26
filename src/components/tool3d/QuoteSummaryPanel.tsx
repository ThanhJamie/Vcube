import React, { useState } from 'react';
import { AnalysisFile, MaterialProfile, PrinterProfile, CartItem, DeliveryPackageOption, InkiriCostFormulaConfig } from '../../types';
import { MATERIALS_CATALOG, PRINTER_PROFILES } from '../../data/mockData';
import {
  calculateDetailedPricing,
  generateDeliveryPackages,
  comparePrintersForModel
} from '../../utils/pricingEngine';
import { InternalCostBreakdownModal } from './InternalCostBreakdownModal';
import { MachineComparisonModal } from './MachineComparisonModal';

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

  const currentPrinter = printers.find(p => p.id === selectedPrinterId) || printers[0] || PRINTER_PROFILES[0];
  const currentMaterial = materials.find(m => m.id === selectedMaterialId) || materials[0] || MATERIALS_CATALOG[0];

  // Core Pricing Calculation
  const pricingResult = calculateDetailedPricing({
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

  const { breakdown, quickEstimateRange, tier, manualReviewReasons } = pricingResult;

  // Effective unit price (either overridden or standard calculated)
  const effectiveUnitPrice = customOverriddenPrice || breakdown.finalSellingPriceRounded;

  // 3 Customer Delivery Packages
  const packages = generateDeliveryPackages(effectiveUnitPrice, quantity);
  const selectedPackage = packages.find(p => p.tier === selectedPackageTier) || packages[1];

  // Machine comparison items
  const machineComparisons = comparePrintersForModel(
    file,
    transformedVolume,
    selectedMaterialId,
    infillDensity,
    layerHeight,
    supportsMode,
    quantity,
    pricingConfig,
    printers
  );

  // Expiration Date (7 days from now)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  const expirationFormatted = expirationDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Handle building cart item
  const handleBuildCartItem = (): CartItem => {
    return {
      id: `custom-quote-${Date.now()}`,
      productId: file.id,
      type: 'physical',
      name: `Gia công 3D [${selectedPackage.name}]: ${file.fileName}`,
      designer: 'VCUBE Engineering Studio',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      price: selectedPackage.pricePerUnit,
      quantity: quantity,
      material: `${currentMaterial.name} (${currentPrinter.name})`,
      color: file.parts.length > 1 ? `${file.parts.length} màu chi tiết` : file.parts[0]?.color || 'Xanh Teal Công Nghiệp',
      colorHex: file.parts[0]?.colorHex || '#00687a',
      dimensions: `${file.dimensions.x.toFixed(1)} x ${file.dimensions.y.toFixed(1)} x ${file.dimensions.z.toFixed(1)} mm`,
      resolution: `${layerHeight}mm Layer • Infill ${infillDensity}% ${infillPattern} • Giao: ${selectedPackage.completionDate}`
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
    <div className="bg-white border border-black/10 p-5 sm:p-7 space-y-6 lg:sticky lg:top-24 shadow-sm rounded-xl">
      
      {/* Header & 3-Tier Status */}
      <div className="border-b border-black/10 pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-sans text-[9px] uppercase tracking-widest text-[#7D7565] font-bold block">
            VCUBE PRICING ENGINE // ISO/ASTM 52900
          </span>
          <h2 className="font-serif font-bold text-base sm:text-lg text-[#1C1C1C] mt-0.5">
            Bảng Báo Giá Gia Công 3D
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsMachineModalOpen(true)}
            className="px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wider bg-[#F7F6F2] hover:bg-black/10 border border-black/20 text-[#1C1C1C] rounded transition-colors flex items-center gap-1"
            title="So sánh giữa các máy in tương thích"
          >
            <span className="material-symbols-outlined text-xs">tune</span>
            So Sánh Máy
          </button>

          <button
            type="button"
            onClick={() => setIsInternalModalOpen(true)}
            className="px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wider bg-slate-800 hover:bg-black text-cyan-300 rounded transition-colors flex items-center gap-1"
            title="Xem bóc tách giá vốn nội bộ"
          >
            <span className="material-symbols-outlined text-xs">analytics</span>
            Giá Vốn Xưởng
          </button>
        </div>
      </div>

      {/* 1. MỨC 1: GIÁ ƯỚC TÍNH NHANH (Quick Estimate Banner) */}
      <div className="p-3.5 bg-[#FAF9F5] border border-black/10 rounded-lg space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] font-sans uppercase tracking-wider font-bold text-[#7D7565] flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-[#00687a]">speed</span>
            1. Giá Ước Tính Nhanh (Geometry Estimate)
          </span>
          <span className="font-tech text-xs font-bold text-[#00687a]">
            {quickEstimateRange.min.toLocaleString('vi-VN')} – {quickEstimateRange.max.toLocaleString('vi-VN')} đ/cái
          </span>
        </div>
        <p className="text-[10px] text-[#7D7565] italic">
          * Dựa trên phân tích thể tích & kích thước hình học sơ bộ. Không dùng làm giá thanh toán cuối cùng.
        </p>
      </div>

      {/* Slicer Config Controls */}
      <div className="space-y-4 pt-1">
        
        {/* Máy In & Vật Liệu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-sans uppercase tracking-wider text-[#7D7565] font-bold block">
              Máy In Gia Công
            </label>
            <select
              value={selectedPrinterId}
              onChange={(e) => onPrinterChange(e.target.value)}
              className="w-full bg-[#F7F6F2] border border-black/20 p-2 text-xs text-[#1C1C1C] rounded font-sans focus:outline-none focus:border-[#00687a]"
            >
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.technology})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-sans uppercase tracking-wider text-[#7D7565] font-bold block">
              Loại Nhựa Kỹ Thuật
            </label>
            <select
              value={selectedMaterialId}
              onChange={(e) => onMaterialChange(e.target.value)}
              className="w-full bg-[#F7F6F2] border border-black/20 p-2 text-xs text-[#1C1C1C] rounded font-sans focus:outline-none focus:border-[#00687a]"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.pricePerGram.toLocaleString()} đ/g)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Infill & Pattern */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-[10px] font-sans uppercase tracking-wider text-[#7D7565] font-bold">
              Độ Đặc Ruột (Infill): <span className="font-tech text-[#00687a]">{infillDensity}% {infillPattern}</span>
            </label>
            <div className="flex items-center gap-1">
              {['Gyroid', 'Grid', 'Honeycomb'].map((pat) => (
                <button
                  key={pat}
                  type="button"
                  onClick={() => onInfillPatternChange(pat)}
                  className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                    infillPattern === pat
                      ? 'bg-[#00687a] text-white border-[#00687a]'
                      : 'bg-[#F7F6F2] text-[#5A554C] border-black/10'
                  }`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={infillDensity}
            onChange={(e) => onInfillChange(Number(e.target.value))}
            className="w-full accent-[#00687a] cursor-pointer"
          />
        </div>

        {/* Layer Height & Support */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-sans uppercase tracking-wider text-[#7D7565] font-bold block mb-1">
              Độ Dày Lớp In
            </label>
            <select
              value={layerHeight}
              onChange={(e) => onLayerHeightChange(e.target.value)}
              className="w-full bg-[#F7F6F2] border border-black/20 p-2 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-[#00687a]"
            >
              <option value="0.08">0.08 mm (Ultra Fine)</option>
              <option value="0.12">0.12 mm (Fine Detail)</option>
              <option value="0.16">0.16 mm (Standard Pro)</option>
              <option value="0.20">0.20 mm (Draft Fast)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-sans uppercase tracking-wider text-[#7D7565] font-bold block mb-1">
              Cấu Hình Support
            </label>
            <select
              value={supportsMode}
              onChange={(e) => onSupportsModeChange(e.target.value as any)}
              className="w-full bg-[#F7F6F2] border border-black/20 p-2 text-xs text-[#1C1C1C] rounded focus:outline-none focus:border-[#00687a]"
            >
              <option value="tree">Tree Support (Dễ bóc)</option>
              <option value="auto">Auto Grid Standard</option>
              <option value="none">Không dùng Support</option>
            </select>
          </div>
        </div>

        {/* Batch Quantity Selector */}
        <div className="flex items-center justify-between pt-1">
          <label className="text-xs font-semibold text-[#1C1C1C]">
            Số lượng đặt in (Batch):
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 5, 10, 20].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => onQuantityChange(qty)}
                className={`px-3 py-1 text-xs font-tech font-bold rounded border transition-colors ${
                  quantity === qty
                    ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]'
                    : 'bg-[#F7F6F2] text-[#1C1C1C] border-black/15 hover:border-black'
                }`}
              >
                x{qty}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MỨC 2: 3 GÓI BÁO GIÁ CHÍNH XÁC (Customer Packages: Economy, Standard, Express) */}
      <div className="space-y-3 pt-2 border-t border-black/10">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-sans uppercase tracking-wider font-bold text-[#1C1C1C] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-[#00687a]">local_shipping</span>
            2. Báo Giá Chính Xác Theo Tiến Độ Giao Hàng
          </label>
          <span className="text-[10px] text-[#7D7565] font-tech">Hiệu lực: {expirationFormatted}</span>
        </div>

        <div className="space-y-2">
          {packages.map((pkg) => {
            const isSelected = selectedPackageTier === pkg.tier;
            return (
              <div
                key={pkg.tier}
                onClick={() => setSelectedPackageTier(pkg.tier)}
                className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#00687a] bg-cyan-50/40 ring-1 ring-[#00687a]'
                    : 'border-black/10 hover:border-black/30 bg-[#FAF9F5]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="packageTier"
                      checked={isSelected}
                      onChange={() => setSelectedPackageTier(pkg.tier)}
                      className="accent-[#00687a]"
                    />
                    <div>
                      <div className="font-bold text-xs text-[#1C1C1C] flex items-center gap-1.5">
                        <span>{pkg.name}</span>
                        {pkg.isPopular && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-[#00687a] text-white font-tech uppercase rounded">
                            Phổ Biến
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#5A554C] mt-0.5">
                        Thời gian: <strong>{pkg.leadTimeDays}</strong> (Dự kiến xong: {pkg.completionDate})
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-tech text-sm sm:text-base font-bold text-[#1C1C1C]">
                      {pkg.pricePerUnit.toLocaleString('vi-VN')} đ
                      <span className="text-[10px] font-normal text-[#7D7565]"> /cái</span>
                    </div>
                    {quantity > 1 && (
                      <div className="text-[10px] font-tech text-[#00687a] font-semibold">
                        Tổng ({quantity} cái): {pkg.totalPrice.toLocaleString('vi-VN')} đ
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[#7D7565] mt-1 pl-5">
                  {pkg.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. MỨC 3: BÁO GIÁ CẦN KIỂM DUYỆT (Manual Review / Approval Alert) */}
      {tier === 'manual_review' && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-2.5">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <span className="material-symbols-outlined text-base text-amber-700">policy</span>
            3. Phôi In Cần Kỹ Sư Kiểm Duyệt (Manual Review Required)
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            Hệ thống phát hiện một số thông số kỹ thuật đặc biệt cần xưởng thẩm định trực tiếp trước khi sản xuất:
          </p>
          <ul className="text-[10px] text-amber-800 space-y-1 list-disc pl-4">
            {manualReviewReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>

          {manualReviewSent ? (
            <div className="text-xs text-emerald-800 font-bold bg-emerald-100 p-2 rounded flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Đã gửi yêu cầu thẩm định! Kỹ sư xưởng sẽ phản hồi trong 30 phút.
            </div>
          ) : (
            <button
              type="button"
              disabled={isRequestingManualReview}
              onClick={handleSendManualReview}
              className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-sans uppercase tracking-wider font-bold rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              {isRequestingManualReview ? 'Đang Gửi Yêu Cầu...' : 'Gửi Yêu Cầu Thẩm Định Kỹ Thuật'}
            </button>
          )}
        </div>
      )}

      {/* Final Total Summary Bar */}
      <div className="bg-[#1C1C1C] text-white p-4 rounded-lg space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] uppercase font-sans tracking-widest text-slate-400 block">
              Tổng Giá Trị Đơn Hàng ({quantity} cái):
            </span>
            <span className="text-[11px] text-cyan-300 font-sans">
              Đã gồm VAT, QC Dung Sai & Gói {selectedPackage.name}
            </span>
          </div>
          <div className="text-right">
            <span className="font-tech text-2xl font-bold text-cyan-300">
              {selectedPackage.totalPrice.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => onAddToCart(handleBuildCartItem())}
          className="w-full py-3.5 bg-[#00687a] hover:bg-[#005260] text-white font-sans font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm touch-target-btn rounded"
        >
          <span className="material-symbols-outlined text-base">shopping_cart</span>
          Thêm Đơn Gia Công Vào Giỏ Hàng
        </button>

        <button
          type="button"
          onClick={() => onDirectOrder(handleBuildCartItem())}
          className="w-full py-3 bg-[#1C1C1C] hover:bg-[#333] text-white font-sans font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 touch-target-btn rounded"
        >
          <span className="material-symbols-outlined text-base">precision_manufacturing</span>
          Đặt In Ngay (Chuyển Đến Thanh Toán)
        </button>
      </div>

      {/* Modals */}
      <InternalCostBreakdownModal
        isOpen={isInternalModalOpen}
        onClose={() => setIsInternalModalOpen(false)}
        fileName={file.fileName}
        quantity={quantity}
        breakdown={breakdown}
        currentPrinter={currentPrinter}
        onApplyOverride={(newPrice, reason) => {
          setCustomOverriddenPrice(newPrice);
          onShowToast(`Đã áp dụng giá điều chỉnh: ${newPrice.toLocaleString('vi-VN')} đ (Lý do: ${reason})`);
        }}
      />

      <MachineComparisonModal
        isOpen={isMachineModalOpen}
        onClose={() => setIsMachineModalOpen(false)}
        items={machineComparisons}
        selectedPrinterId={selectedPrinterId}
        onSelectPrinter={(id) => {
          onPrinterChange(id);
          onShowToast(`Đã chuyển đổi máy in sang ${PRINTER_PROFILES.find(p => p.id === id)?.name}`);
        }}
      />

    </div>
  );
};
