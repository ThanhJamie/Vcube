import React, { useState } from 'react';
import { MaterialProfile, PrinterProfile, InkiriCostFormulaConfig, AccessoryItem } from '../../types';
import { calculateManualInkiriEstimate } from '../../utils/pricingEngine';

interface SelectedAccessoryConfig {
  accessoryId: string;
  quantityPerPart: number;
}

interface WorkshopEstimatorBOMProps {
  materials: MaterialProfile[];
  printers: PrinterProfile[];
  accessories: AccessoryItem[];
  pricingConfig: InkiriCostFormulaConfig;
  onShowToast: (message: string) => void;
}

export const WorkshopEstimatorBOM: React.FC<WorkshopEstimatorBOMProps> = ({
  materials,
  printers,
  accessories,
  pricingConfig,
  onShowToast
}) => {
  // Fabrication Parameters
  const [jobName, setJobName] = useState<string>('Gia Công Móc Khóa 3D & Linh Kiện Cơ Khí');
  const [customerName, setCustomerName] = useState<string>('Anh Tuấn (Công ty Công Nghệ)');
  const [weightGrams, setWeightGrams] = useState<number>(45);
  const [printHours, setPrintHours] = useState<number>(2.0);
  const [quantity, setQuantity] = useState<number>(50);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id || 'pla-tough');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(printers[0]?.id || 'bambu-x1c');
  const [customMarkup, setCustomMarkup] = useState<number>(pricingConfig.defaultMarkupPercent || 35);
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);

  // Selected Accessories & Hardware Add-ons
  const [selectedAccessories, setSelectedAccessories] = useState<SelectedAccessoryConfig[]>([
    { accessoryId: 'acc-keychain-ring-chain', quantityPerPart: 1 },
    { accessoryId: 'acc-pack-zip-esd', quantityPerPart: 1 }
  ]);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId) || materials[0];
  const selectedPrinter = printers.find(p => p.id === selectedPrinterId) || printers[0];

  // Calculate Labor Minutes from Formula
  const totalLaborMins = (pricingConfig.fileReviewLaborMinutes ?? 4) +
    (pricingConfig.setupLaborMinutes ?? 5) +
    (pricingConfig.supportRemovalMinutes ?? 8) +
    (pricingConfig.postProcessingLaborMinutes ?? 6) +
    (pricingConfig.qcLaborMinutes ?? 4) +
    (pricingConfig.packagingLaborMinutes ?? 3);

  // Calculate Accessories Total Cost & Selling Price per Unit
  const detailedSelectedAccessories = selectedAccessories.map(item => {
    const acc = accessories.find(a => a.id === item.accessoryId);
    if (!acc) return null;
    const totalRequired = item.quantityPerPart * quantity;
    const isOutOfStock = totalRequired > acc.stockCount;
    const missingCount = Math.max(0, totalRequired - acc.stockCount);

    return {
      accessory: acc,
      quantityPerPart: item.quantityPerPart,
      unitCost: acc.costPrice * item.quantityPerPart,
      unitPrice: acc.sellingPrice * item.quantityPerPart,
      totalRequired,
      currentStock: acc.stockCount,
      isOutOfStock,
      missingCount
    };
  }).filter(Boolean) as {
    accessory: AccessoryItem;
    quantityPerPart: number;
    unitCost: number;
    unitPrice: number;
    totalRequired: number;
    currentStock: number;
    isOutOfStock: boolean;
    missingCount: number;
  }[];

  const totalAccessoriesCostPerPart = detailedSelectedAccessories.reduce((sum, item) => sum + item.unitCost, 0);
  const totalAccessoriesSellingPerPart = detailedSelectedAccessories.reduce((sum, item) => sum + item.unitPrice, 0);

  // Run Deterministic Calculation via Pricing Engine
  const estimate = calculateManualInkiriEstimate({
    filamentGrams: weightGrams,
    printHours: printHours,
    materialPricePerKg: selectedMaterial?.costPerKg || (selectedMaterial?.pricePerGram ? selectedMaterial.pricePerGram * 1000 : 350000),
    printerAcquisitionCost: selectedPrinter?.acquisitionCost || 30000000,
    printerLifetimeHours: selectedPrinter?.expectedLifetimeHours || 8000,
    printerConsumablesPerHour: selectedPrinter?.consumablesHourlyRate || 2500,
    printerPowerKW: selectedPrinter?.powerKW || 0.18,
    electricityRatePerKWh: pricingConfig.electricityRatePerKWh || 2850,
    laborHourlyRate: pricingConfig.laborHourlyRate || 65000,
    laborTotalMinutes: totalLaborMins,
    packagingCost: pricingConfig.fixedPackagingCost || 12000,
    accessoriesCost: totalAccessoriesCostPerPart,
    overheadCost: pricingConfig.overheadPerUnit || 15000,
    failureRatePercent: pricingConfig.baseFailureReservePercent || 8,
    markupPercent: customMarkup,
    taxAndGatewayPercent: (pricingConfig.platformCommissionPercent || 8) + (pricingConfig.paymentGatewayFeePercent || 2.5) + (pricingConfig.designerRoyaltyPercent || 5),
    quantity: quantity
  });

  // Apply optional wholesale / custom discount
  const finalUnitPriceBeforeDiscount = estimate.finalUnitPrice;
  const unitDiscountAmount = Math.round(finalUnitPriceBeforeDiscount * (customDiscountPercent / 100));
  const finalUnitPriceAfterDiscount = finalUnitPriceBeforeDiscount - unitDiscountAmount;
  const totalBatchPrice = finalUnitPriceAfterDiscount * quantity;
  const totalBatchCost = estimate.totalCostBatch;
  const totalBatchProfit = totalBatchPrice - totalBatchCost;
  const netMarginPercent = totalBatchPrice > 0 ? Number(((totalBatchProfit / totalBatchPrice) * 100).toFixed(1)) : 0;

  // Toggle Accessory Selection
  const handleToggleAccessory = (accId: string) => {
    setSelectedAccessories(prev => {
      const exists = prev.find(a => a.accessoryId === accId);
      if (exists) {
        return prev.filter(a => a.accessoryId !== accId);
      } else {
        return [...prev, { accessoryId: accId, quantityPerPart: 1 }];
      }
    });
  };

  // Adjust Quantity of Accessory per part
  const handleUpdateAccessoryQty = (accId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedAccessories(prev => prev.filter(a => a.accessoryId !== accId));
      return;
    }
    setSelectedAccessories(prev => prev.map(a => a.accessoryId === accId ? { ...a, quantityPerPart: qty } : a));
  };

  // Generate Formal Copyable Quote Text for Zalo / Email
  const handleCopyFormalQuote = () => {
    const accessoriesListText = detailedSelectedAccessories.length > 0
      ? detailedSelectedAccessories.map(a => `   + ${a.accessory.name} (x${a.quantityPerPart} cái)`).join('\n')
      : '   + Đóng gói màng bọc chống trầy tiêu chuẩn';

    const text = `================================================
🛠️ BẢNG DỰ TOÁN BÁO GIÁ GIA CÔNG IN 3D - VCUBE VIETNAM
================================================
📌 Khách Hàng: ${customerName}
📦 Dự Án / Hạng Mục: ${jobName}
🔢 Số Lượng Đặt In: ${quantity.toLocaleString('vi-VN')} chiếc

⚙️ THÔNG SỐ KỸ THUẬT & VẬT LIỆU:
• Công nghệ: FDM / SLA Độ chính xác cao
• Loại Nhựa: ${selectedMaterial?.name || 'PLA Tough'} (${selectedMaterial?.brand})
• Máy In Sản Xuất: ${selectedPrinter?.name || 'Bambu Lab X1C'}
• Khối Lượng Ước Tính: ~${weightGrams}g /chiếc
• Thời Gian In: ~${printHours} giờ /chiếc

🔩 PHỤ KIỆN & BAO BÌ ĐÓNG GÓI KÈM THEO:
${accessoriesListText}

💰 ĐƠN GIÁ & TỔNG CHI PHÍ GIA CÔNG:
• Đơn giá xuất xưởng: ${finalUnitPriceAfterDiscount.toLocaleString('vi-VN')} đ /chiếc
${customDiscountPercent > 0 ? `• Chiết khấu ưu đãi: -${customDiscountPercent}% (Tiết kiệm ${(unitDiscountAmount * quantity).toLocaleString('vi-VN')} đ)\n` : ''}• TỔNG GIÁ TRỊ ĐƠN HÀNG: ${totalBatchPrice.toLocaleString('vi-VN')} VNĐ
(Đã bao gồm: Chi phí vật liệu, gia công máy, nhân công QC dung sai ±0.05mm, phụ kiện & bao bì)

⏱️ TIẾN ĐỘ & BẢO HÀNH:
• Thời gian hoàn thành: 2 - 3 ngày làm việc
• Bảo hành: Đổi mới 100% nếu cong vênh hoặc sai lệch kích thước kỹ thuật.

📞 Kỹ sư tư vấn VCUBE: ${pricingConfig ? 'Hotline: 0988.123.456' : '0988.123.456'}
================================================`;

    navigator.clipboard.writeText(text);
    onShowToast('Đã sao chép bảng báo giá chi tiết! Bạn có thể dán trực tiếp gửi Zalo/Email cho khách.');
  };

  const hasOutOfStockAccessories = detailedSelectedAccessories.some(a => a.isOutOfStock);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 border border-[#C5C6CD] rounded shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">receipt_long</span>
              <h2 className="text-base font-bold text-[#091426]">
                Trình Dự Toán BOM Kỹ Thuật & Báo Giá Nhanh Xưởng (Workshop Estimator)
              </h2>
            </div>
            <p className="text-xs text-[#545F73] mt-1">
              Dành riêng cho Quản lý & Kỹ thuật viên: Bóc tách cấu trúc giá thành 8 tầng chi phí, tích hợp tự động phụ kiện (móc khóa, ốc cấy, bao bì) và kiểm tra tồn kho kho xưởng tức thì.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyFormalQuote}
            className="px-4 py-2.5 bg-[#00687A] text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-[#005463] flex items-center gap-2 shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-sm">content_copy</span>
            Sao Chép Báo Giá Gửi Khách (Zalo/Email)
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs (Left) & BOM Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project & Manufacturing Parameters */}
        <div className="lg:col-span-6 space-y-5">
          {/* 1. Job Information */}
          <div className="bg-white p-5 border border-[#C5C6CD] rounded space-y-4 shadow-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#091426] flex items-center gap-2 pb-2 border-b border-[#E5EEFF]">
              <span className="material-symbols-outlined text-[#00687A] text-sm">badge</span>
              1. Thông Tin Khách Hàng & Đơn Hàng Gia Công
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-[#091426] block mb-1">Tên Dự Án / Phôi In</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="w-full p-2 border border-[#C5C6CD] rounded font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[#091426] block mb-1">Tên Khách Hàng / Đơn Vị</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 border border-[#C5C6CD] rounded font-medium"
                />
              </div>
            </div>
          </div>

          {/* 2. Slicing & Machine Parameters */}
          <div className="bg-white p-5 border border-[#C5C6CD] rounded space-y-4 shadow-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#091426] flex items-center gap-2 pb-2 border-b border-[#E5EEFF]">
              <span className="material-symbols-outlined text-[#00687A] text-sm">precision_manufacturing</span>
              2. Thông Số Kỹ Thuật In 3D & Máy Móc
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-[#091426] block mb-1">Máy In Sử Dụng</label>
                <select
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  className="w-full p-2 border border-[#C5C6CD] rounded font-bold bg-white"
                >
                  {printers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.technology}) - {p.powerKW} kW
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#091426] block mb-1">Loại Nhựa / Resin</label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full p-2 border border-[#C5C6CD] rounded font-bold bg-white"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.pricePerGram.toLocaleString()} đ/g - Còn {m.stockRollsCount || 0} cuộn)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#091426] block mb-1">Khối Lượng Nhựa (g / cái)</label>
                <input
                  type="number"
                  min="1"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(Number(e.target.value))}
                  className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#091426] block mb-1">Thời Gian In (giờ / cái)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={printHours}
                  onChange={(e) => setPrintHours(Number(e.target.value))}
                  className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#091426] block mb-1">Số Lượng Đặt In (Batch)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-[#C5C6CD] rounded font-tech font-bold text-base text-[#00687A]"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[1, 10, 50, 100].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className={`px-2 py-1.5 text-[10px] font-tech font-bold rounded border ${
                          quantity === q ? 'bg-[#091426] text-white border-[#091426]' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        x{q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#091426] block mb-1">Markup Lợi Nhuận Xưởng (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={customMarkup}
                    onChange={(e) => setCustomMarkup(Number(e.target.value))}
                    className="w-full accent-[#00687A]"
                  />
                  <span className="font-tech font-bold text-xs text-[#00687A] w-12 text-right">
                    {customMarkup}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Phụ Kiện & Bao Bì Đóng Gói Đi Kèm (Key Feature) */}
          <div className="bg-white p-5 border border-[#C5C6CD] rounded space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5EEFF]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#091426] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00687A] text-sm">extension</span>
                3. Chọn Phụ Kiện & Bao Bì Đóng Gói (Add-on Hardware)
              </h3>
              <span className="text-[10px] font-tech text-[#545F73]">
                Đã chọn: <strong>{detailedSelectedAccessories.length}</strong> món
              </span>
            </div>

            {hasOutOfStockAccessories && (
              <div className="p-3 bg-red-50 border border-red-300 rounded text-xs text-red-900 flex items-center gap-2 font-bold animate-pulse">
                <span className="material-symbols-outlined text-base text-red-700">warning</span>
                Cảnh báo: Có phụ kiện trong đơn hàng đang thiếu hàng trong kho! Cần nhập thêm.
              </div>
            )}

            {/* Accessories Checklist */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {accessories.map((acc) => {
                const isSelected = selectedAccessories.some(a => a.accessoryId === acc.id);
                const currentSelection = selectedAccessories.find(a => a.accessoryId === acc.id);
                const qtyPerPart = currentSelection?.quantityPerPart || 1;
                const totalNeeded = qtyPerPart * quantity;
                const isStockShortage = totalNeeded > acc.stockCount;

                return (
                  <div
                    key={acc.id}
                    className={`p-3 border rounded transition-all text-xs ${
                      isSelected
                        ? 'border-[#00687A] bg-cyan-50/40 ring-1 ring-[#00687A]'
                        : 'border-[#E5EEFF] hover:border-[#C5C6CD] bg-[#FAF9F5]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleAccessory(acc.id)}
                          className="accent-[#00687A] w-4 h-4 rounded"
                        />
                        <div className="truncate">
                          <p className="font-bold text-[#091426] truncate">{acc.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-[#545F73]">
                            <span>Vốn: {acc.costPrice.toLocaleString('vi-VN')} đ</span>
                            <span>•</span>
                            <span className="text-[#00687A] font-bold">Báo khách: {acc.sellingPrice.toLocaleString('vi-VN')} đ</span>
                            <span>•</span>
                            <span className={acc.stockCount < totalNeeded ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                              Kho còn: {acc.stockCount} {acc.unit} ({acc.warehouseLocation || 'Kho'})
                            </span>
                          </div>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-[#545F73] font-bold">SL/chiếc:</span>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={qtyPerPart}
                            onChange={(e) => handleUpdateAccessoryQty(acc.id, Number(e.target.value))}
                            className="w-12 p-1 border border-[#00687A] rounded text-center font-tech font-bold bg-white"
                          />
                        </div>
                      )}
                    </div>

                    {isSelected && isStockShortage && (
                      <div className="mt-2 text-[10px] text-red-700 bg-red-50 p-1.5 rounded border border-red-200 font-bold">
                        Thiếu {totalNeeded - acc.stockCount} {acc.unit} (Yêu cầu: {totalNeeded} • Tồn: {acc.stockCount})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Full Manufacturing BOM Breakdown */}
        <div className="lg:col-span-6 space-y-5">
          {/* Summary Price Card */}
          <div className="bg-gradient-to-br from-[#091426] to-[#1E293B] text-white p-6 rounded-lg shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-tech uppercase tracking-widest text-[#57DFFE] block">
                  BÁO GIÁ XUẤT XƯỞNG DỰ TÍNH (BATCH BẢNG GIÁ)
                </span>
                <h3 className="text-xl font-bold font-tech text-white mt-0.5">
                  {totalBatchPrice.toLocaleString('vi-VN')} VNĐ
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-300 block uppercase">Đơn Giá 1 Chiếc</span>
                <span className="text-base font-tech font-bold text-[#57DFFE]">
                  {finalUnitPriceAfterDiscount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white/5 p-2.5 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 block">Tổng Giá Vốn (COGS)</span>
                <span className="font-tech font-bold text-white">
                  {totalBatchCost.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="bg-white/5 p-2.5 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 block">Lợi Nhuận Xưởng</span>
                <span className="font-tech font-bold text-emerald-400">
                  +{totalBatchProfit.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="bg-white/5 p-2.5 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 block">Biên Lợi Nhuận</span>
                <span className="font-tech font-bold text-[#57DFFE]">
                  {netMarginPercent}%
                </span>
              </div>
            </div>

            {/* Wholesale / Discount Adjustment */}
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
              <span className="text-slate-300">Chiết khấu ưu đãi khách hàng (%):</span>
              <div className="flex items-center gap-2">
                {[0, 5, 10, 15, 20].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCustomDiscountPercent(d)}
                    className={`px-2 py-0.5 text-[10px] font-tech font-bold rounded ${
                      customDiscountPercent === d
                        ? 'bg-[#57DFFE] text-[#091426]'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {d === 0 ? '0%' : `-${d}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 8-Part Manufacturing Bill of Materials (BOM) Table */}
          <div className="bg-white p-5 border border-[#C5C6CD] rounded shadow-xs space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#091426] flex items-center gap-2 pb-2 border-b border-[#E5EEFF]">
              <span className="material-symbols-outlined text-[#00687A] text-sm">account_tree</span>
              Bảng Phân Tích Chi Phí Sản Xuất Chi Tiết (8 Lớp Chi Phí BOM)
            </h3>

            <div className="space-y-2 text-xs divide-y divide-[#E5EEFF]">
              {/* 1. Material */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="font-bold text-[#091426]">1. Chi Phí Nhựa In ({selectedMaterial?.name})</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-[#091426]">{estimate.materialCost.toLocaleString('vi-VN')} đ</span>
                  <span className="text-[10px] text-[#545F73] block">({weightGrams}g x {quantity} cái = {(estimate.materialCost * quantity).toLocaleString('vi-VN')} đ)</span>
                </div>
              </div>

              {/* 2. Electricity */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-bold text-[#091426]">2. Điện Năng Máy In ({selectedPrinter?.powerKW} kW)</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-[#091426]">{estimate.electricityCost.toLocaleString('vi-VN')} đ</span>
                  <span className="text-[10px] text-[#545F73] block">({(estimate.electricityCost * quantity).toLocaleString('vi-VN')} đ/lô)</span>
                </div>
              </div>

              {/* 3. Machine Depreciation & Consumables */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="font-bold text-[#091426]">3. Khấu Hao Máy & Hao Mòn Nozzle</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-[#091426]">{estimate.machineTotal.toLocaleString('vi-VN')} đ</span>
                  <span className="text-[10px] text-[#545F73] block">({(estimate.machineTotal * quantity).toLocaleString('vi-VN')} đ/lô)</span>
                </div>
              </div>

              {/* 4. Engineering & QC Labor */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-[#091426]">4. Nhân Công Kỹ Thuật ({totalLaborMins} phút)</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-[#091426]">{estimate.laborCost.toLocaleString('vi-VN')} đ</span>
                  <span className="text-[10px] text-[#545F73] block">({(estimate.laborCost * quantity).toLocaleString('vi-VN')} đ/lô)</span>
                </div>
              </div>

              {/* 5. Accessories & Packaging Add-ons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <div>
                    <span className="font-bold text-[#091426]">5. Phụ Kiện & Đóng Gói Kèm Theo</span>
                    {detailedSelectedAccessories.map(a => (
                      <span key={a.accessory.id} className="block text-[10px] text-[#545F73]">
                        • {a.accessory.name} (x{a.quantityPerPart}): +{a.unitCost.toLocaleString('vi-VN')} đ
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-[#091426]">{(estimate.packaging + estimate.accessories).toLocaleString('vi-VN')} đ</span>
                  <span className="text-[10px] text-[#545F73] block">({((estimate.packaging + estimate.accessories) * quantity).toLocaleString('vi-VN')} đ/lô)</span>
                </div>
              </div>

              {/* 6. Workshop Overhead */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <span className="font-bold text-[#091426]">6. Quản Lý Xưởng & Mặt Bằng</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-[#091426]">{estimate.overhead.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* 7. Failure Reserve */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="font-bold text-[#091426]">7. Dự Phòng Rủi Ro Hỏng Mẫu ({pricingConfig.baseFailureReservePercent || 8}%)</span>
                </div>
                <div className="text-right font-tech text-red-700 font-bold">
                  +{estimate.failureCost.toLocaleString('vi-VN')} đ
                </div>
              </div>

              {/* Summary Total Cost Row */}
              <div className="flex items-center justify-between pt-3 bg-slate-50 p-2 rounded font-bold text-xs text-[#091426]">
                <span>TỔNG GIÁ THÀNH XUẤT XƯỞNG (COGS / Cái):</span>
                <span className="font-tech text-sm text-[#00687A]">
                  {estimate.costPriceUnit.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
