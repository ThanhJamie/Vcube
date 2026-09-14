import React, { useEffect, useState } from 'react';
import { MaterialProfile, PrinterProfile, InkiriCostFormulaConfig, AccessoryItem } from '../../types';
import { calculateManualInkiriEstimate } from '../../utils/pricingEngine';
import { getStore, settingsAccessors, subscribeSettings } from '../../../backend/services/settingsService';
import { Icon } from '@frontend/ui';

/** Snapshot `app_settings` suy ra từ accessor — `null` = CHƯA cấu hình. */
type AppSettingsSnapshot = ReturnType<typeof settingsAccessors.appSettings>;

/**
 * `true` khi `v` là số hữu hạn ĐÃ được cấu hình (khác `undefined`/`null`/`NaN`).
 * Dùng để phân biệt "chưa cấu hình" với "giá trị thật" — KHÔNG bao giờ thay bằng số đoán.
 */
const isConfiguredNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Ô nhập rỗng ⇒ `undefined` (CHƯA CẤU HÌNH), KHÔNG rơi về 0 hay một số đoán. */
const numberOrUndefined = (text: string): number | undefined => (String(text).trim() === '' ? undefined : Number(text));

/** Chưa có nguồn ⇒ `—`: không bao giờ in `undefined`, `NaN` hay một con số đoán. */
const money = (v: number | null | undefined): string => (isConfiguredNumber(v) ? v.toLocaleString('vi-VN') : '—');
const plainNumber = (v: number | null | undefined): string => (isConfiguredNumber(v) ? String(v) : '—');

/**
 * Số phụ kiện cho mỗi chiếc khi admin vừa tick chọn. Đây là giá trị của Ô NHẬP trong form
 * (admin thấy và sửa được ngay), không phải số liệu đo hay cấu hình giá nào.
 */
const accessoryDefaultQtyPerPart = 1;

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
  // Fabrication Parameters — admin TỰ NHẬP. Để TRỐNG mặc định: báo giá gửi khách chỉ được
  // chứa con số do admin gõ hoặc đọc từ cấu hình, không phải giá trị đoán hộ.
  // Ô trống: KHÔNG mặc định sẵn tên khách hàng / tên dự án (trước đây là dữ liệu bịa và bị
  // in thẳng vào báo giá gửi khách). Admin gõ tên thật của đơn đang dự toán.
  const [jobName, setJobName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [weightGrams, setWeightGrams] = useState<number | null>(null);
  const [printHours, setPrintHours] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id ?? '');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(printers[0]?.id ?? '');
  const [customMarkup, setCustomMarkup] = useState<number | null>(
    isConfiguredNumber(pricingConfig.defaultMarkupPercent) ? pricingConfig.defaultMarkupPercent : null
  );
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);

  // Cấu hình pháp lý & liên hệ THẬT (`app_settings`) — `null` = CHƯA cấu hình.
  // Báo giá gửi khách chỉ được in dữ liệu có nguồn; chưa cấu hình ⇒ bỏ hẳn dòng đó.
  const [appSettings, setAppSettings] = useState<AppSettingsSnapshot>(() => settingsAccessors.appSettings());

  useEffect(() => {
    // Cache có thể còn rỗng (chưa chạy `bootstrapSettings`) ⇒ nạp đúng kho `app_settings`.
    if (settingsAccessors.appSettings() === null) {
      void getStore('app_settings');
    }
    // `subscribeSettings` bắn snapshot ngay lập tức + mỗi lần admin lưu / realtime báo.
    return subscribeSettings(() => {
      setAppSettings(settingsAccessors.appSettings());
    });
  }, []);

  // Selected Accessories & Hardware Add-ons
  // Rỗng mặc định: KHÔNG tự chọn sẵn phụ kiện (trước đây hardcode 2 id của bộ seed cũ ⇒
  // cộng thẳng tiền phụ kiện vào báo giá khách dù admin chưa chọn).
  const [selectedAccessories, setSelectedAccessories] = useState<SelectedAccessoryConfig[]>([]);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId) ?? materials[0];
  const selectedPrinter = printers.find(p => p.id === selectedPrinterId) ?? printers[0];

  const quantityKnown = isConfiguredNumber(quantity);

  // Định mức phút nhân công — CHỈ tính tổng khi MỌI ô đã được cấu hình (không bịa số phút).
  const laborMinuteFields = [
    'fileReviewLaborMinutes',
    'setupLaborMinutes',
    'supportRemovalMinutes',
    'postProcessingLaborMinutes',
    'qcLaborMinutes',
    'packagingLaborMinutes',
  ] as const;
  const laborMinuteValues = laborMinuteFields.map((field) => pricingConfig[field]);
  const totalLaborMins: number | null = laborMinuteValues.every(isConfiguredNumber)
    ? (laborMinuteValues as number[]).reduce((sum, v) => sum + v, 0)
    : null;

  // Đơn giá nhựa: chỉ nhận giá TRỊ THẬT của vật liệu đang chọn (không rơi về 350.000).
  const materialPricePerKg: number | null = isConfiguredNumber(selectedMaterial?.costPerKg)
    ? (selectedMaterial as MaterialProfile).costPerKg
    : isConfiguredNumber(selectedMaterial?.pricePerGram)
      ? (selectedMaterial as MaterialProfile).pricePerGram * 1000
      : null;

  // Danh sách thông số CÒN THIẾU — nguồn duy nhất để quyết định có tính được giá hay không.
  const unavailableInputs: string[] = [];
  if (!selectedMaterial) unavailableInputs.push('Chưa có vật liệu nào trong danh mục (tab 2. Nhựa In & Resin).');
  else if (materialPricePerKg === null) unavailableInputs.push(`Đơn giá nhựa của "${selectedMaterial.name}" (tab 2. Nhựa In & Resin).`);
  if (!selectedPrinter) unavailableInputs.push('Chưa có máy in nào trong đội máy (tab 3. Đội Máy In).');
  else {
    if (!isConfiguredNumber(selectedPrinter.acquisitionCost)) unavailableInputs.push(`Giá trị đầu tư của máy "${selectedPrinter.name}" (tab 3).`);
    if (!isConfiguredNumber(selectedPrinter.expectedLifetimeHours)) unavailableInputs.push(`Tuổi thọ khấu hao của máy "${selectedPrinter.name}" (tab 3).`);
    if (!isConfiguredNumber(selectedPrinter.consumablesHourlyRate)) unavailableInputs.push(`Hao mòn vật tư / giờ của máy "${selectedPrinter.name}" (tab 3).`);
    if (!isConfiguredNumber(selectedPrinter.powerKW)) unavailableInputs.push(`Công suất điện của máy "${selectedPrinter.name}" (tab 3).`);
  }
  if (!isConfiguredNumber(pricingConfig.electricityRatePerKWh)) unavailableInputs.push('Đơn giá điện (tab 1. Công Thức Tính Giá).');
  if (!isConfiguredNumber(pricingConfig.laborHourlyRate)) unavailableInputs.push('Mức lương kỹ thuật viên (tab 1).');
  if (totalLaborMins === null) unavailableInputs.push('Định mức phút nhân công còn ô trống (tab 1, mục 2).');
  if (!isConfiguredNumber(pricingConfig.fixedPackagingCost)) unavailableInputs.push('Phí đóng gói cố định (tab 1).');
  if (!isConfiguredNumber(pricingConfig.ipaSolventCost)) unavailableInputs.push('Chi phí cồn IPA & dung môi hoàn thiện (tab 1).');
  if (!isConfiguredNumber(pricingConfig.overheadPerUnit)) unavailableInputs.push('Chi phí quản lý mặt bằng xưởng (tab 1).');
  if (!isConfiguredNumber(pricingConfig.baseFailureReservePercent)) unavailableInputs.push('Dự phòng rủi ro in lỗi (tab 1, mục 3).');
  if (!isConfiguredNumber(pricingConfig.platformCommissionPercent)) unavailableInputs.push('Phí Platform (tab 1).');
  if (!isConfiguredNumber(pricingConfig.paymentGatewayFeePercent)) unavailableInputs.push('Phí cổng thanh toán (tab 1).');
  if (!isConfiguredNumber(pricingConfig.designerRoyaltyPercent)) unavailableInputs.push('Bản quyền 3D (tab 1).');
  if (!isConfiguredNumber(weightGrams)) unavailableInputs.push('Khối lượng nhựa (g / cái) — ô nhập bên trái.');
  if (!isConfiguredNumber(printHours)) unavailableInputs.push('Thời gian in (giờ / cái) — ô nhập bên trái.');
  if (!quantityKnown) unavailableInputs.push('Số lượng đặt in — ô nhập bên trái.');
  if (!isConfiguredNumber(customMarkup)) unavailableInputs.push('Markup lợi nhuận xưởng (%) — ô nhập bên trái.');

  const estimateComplete = unavailableInputs.length === 0;

  // Calculate Accessories Total Cost & Selling Price per Unit
  const detailedSelectedAccessories = selectedAccessories.map(item => {
    const acc = accessories.find(a => a.id === item.accessoryId);
    if (!acc) return null;
    const totalRequired = quantityKnown ? item.quantityPerPart * (quantity as number) : null;
    const isOutOfStock = totalRequired !== null && totalRequired > acc.stockCount;
    const missingCount = totalRequired !== null ? Math.max(0, totalRequired - acc.stockCount) : null;

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
    totalRequired: number | null;
    currentStock: number;
    isOutOfStock: boolean;
    missingCount: number | null;
  }[];

  const totalAccessoriesCostPerPart = detailedSelectedAccessories.reduce((sum, item) => sum + item.unitCost, 0);
  const totalAccessoriesSellingPerPart = detailedSelectedAccessories.reduce((sum, item) => sum + item.unitPrice, 0);

  // Run Deterministic Calculation via Pricing Engine — CHỈ khi mọi thông số đã có nguồn thật.
  // Thiếu bất kỳ thông số nào ⇒ KHÔNG gọi engine, KHÔNG hiện giá (không suy đoán hộ).
  const estimate = estimateComplete
    ? calculateManualInkiriEstimate({
        filamentGrams: weightGrams as number,
        printHours: printHours as number,
        materialPricePerKg: materialPricePerKg as number,
        printerAcquisitionCost: selectedPrinter?.acquisitionCost as number,
        printerLifetimeHours: selectedPrinter?.expectedLifetimeHours as number,
        printerConsumablesPerHour: selectedPrinter?.consumablesHourlyRate as number,
        printerPowerKW: selectedPrinter?.powerKW as number,
        electricityRatePerKWh: pricingConfig.electricityRatePerKWh,
        laborHourlyRate: pricingConfig.laborHourlyRate,
        laborTotalMinutes: totalLaborMins as number,
        packagingCost: pricingConfig.fixedPackagingCost,
        ipaCost: pricingConfig.ipaSolventCost,
        accessoriesCost: totalAccessoriesCostPerPart,
        overheadCost: pricingConfig.overheadPerUnit,
        failureRatePercent: pricingConfig.baseFailureReservePercent,
        markupPercent: customMarkup as number,
        taxAndGatewayPercent:
          pricingConfig.platformCommissionPercent + pricingConfig.paymentGatewayFeePercent + pricingConfig.designerRoyaltyPercent,
        quantity: quantity as number
      })
    : null;

  // Apply optional wholesale / custom discount
  const finalUnitPriceBeforeDiscount: number | null = estimate ? estimate.finalUnitPrice : null;
  const unitDiscountAmount: number | null =
    finalUnitPriceBeforeDiscount !== null ? Math.round(finalUnitPriceBeforeDiscount * (customDiscountPercent / 100)) : null;
  const finalUnitPriceAfterDiscount: number | null =
    finalUnitPriceBeforeDiscount !== null && unitDiscountAmount !== null
      ? finalUnitPriceBeforeDiscount - unitDiscountAmount
      : null;
  const totalBatchPrice: number | null =
    finalUnitPriceAfterDiscount !== null && quantityKnown ? finalUnitPriceAfterDiscount * (quantity as number) : null;
  const totalBatchCost: number | null = estimate ? estimate.totalCostBatch : null;
  const totalBatchProfit: number | null =
    totalBatchPrice !== null && totalBatchCost !== null ? totalBatchPrice - totalBatchCost : null;
  const netMarginPercent: number | null =
    totalBatchPrice !== null && totalBatchProfit !== null && totalBatchPrice > 0
      ? Number(((totalBatchProfit / totalBatchPrice) * 100).toFixed(1))
      : null;

  // Toggle Accessory Selection
  const handleToggleAccessory = (accId: string) => {
    setSelectedAccessories(prev => {
      const exists = prev.find(a => a.accessoryId === accId);
      if (exists) {
        return prev.filter(a => a.accessoryId !== accId);
      } else {
        return [...prev, { accessoryId: accId, quantityPerPart: accessoryDefaultQtyPerPart }];
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
    // KHÔNG dựng báo giá khi còn thông số chưa có nguồn: báo giá gửi khách chỉ chứa số THẬT.
    if (!estimateComplete || finalUnitPriceAfterDiscount === null || totalBatchPrice === null || !quantityKnown) {
      onShowToast(
        `KHÔNG tạo báo giá: còn ${unavailableInputs.length} thông số chưa cấu hình — xem danh sách ở cột phải. Hệ thống không tự điền số đoán vào báo giá gửi khách.`
      );
      return;
    }

    // Mọi dòng dưới đây chỉ lấy từ dữ liệu CÓ THẬT: cấu hình `app_settings` hoặc lựa chọn
    // của admin trong form. Không có nguồn ⇒ bỏ hẳn dòng, tuyệt đối không in giá trị đoán.
    const hotline = appSettings?.hotline?.trim() || null;
    const contactEmail = appSettings?.contactEmail?.trim() || null;
    const warrantyTerms = appSettings?.warrantyTerms?.trim() || null;
    const companyName = appSettings?.legalName?.trim() || 'VCUBE';

    const materialName = selectedMaterial?.name?.trim() || null;
    const materialBrand = selectedMaterial?.brand?.trim() || null;
    const materialLabel = materialName ? `${materialName}${materialBrand ? ` (${materialBrand})` : ''}` : '—';

    const accessoriesListText = detailedSelectedAccessories.length > 0
      ? detailedSelectedAccessories.map(a => `   + ${a.accessory.name} (x${a.quantityPerPart} cái)`).join('\n')
      : '   + Đóng gói tiêu chuẩn';

    const contactLine = [
      hotline ? `Hotline ${hotline}` : null,
      contactEmail ? `Email ${contactEmail}` : null
    ].filter(Boolean).join(' • ');

    const scheduleLines = [
      '• Thời gian hoàn thành: theo xác nhận khi chốt đơn',
      warrantyTerms ? `• Bảo hành: ${warrantyTerms}` : null
    ].filter(Boolean).join('\n');

    const text = `================================================
BẢNG DỰ TOÁN BÁO GIÁ GIA CÔNG IN 3D - ${companyName}
================================================
Khách Hàng: ${customerName.trim() || '—'}
Dự Án / Hạng Mục: ${jobName.trim() || '—'}
Số Lượng Đặt In: ${money(quantity)} chiếc

THÔNG SỐ KỸ THUẬT & VẬT LIỆU:
• Công nghệ: ${selectedPrinter?.technology || '—'}
• Loại Nhựa: ${materialLabel}
• Máy In Sản Xuất: ${selectedPrinter?.name || '—'}
• Khối Lượng Ước Tính: ~${plainNumber(weightGrams)}g /chiếc
• Thời Gian In: ~${plainNumber(printHours)} giờ /chiếc

PHỤ KIỆN & BAO BÌ ĐÓNG GÓI KÈM THEO:
${accessoriesListText}

ĐƠN GIÁ & TỔNG CHI PHÍ GIA CÔNG:
• Đơn giá xuất xưởng: ${money(finalUnitPriceAfterDiscount)} đ /chiếc
${customDiscountPercent > 0 ? `• Chiết khấu ưu đãi: -${customDiscountPercent}% (Tiết kiệm ${money(unitDiscountAmount !== null ? unitDiscountAmount * (quantity as number) : null)} đ)\n` : ''}• TỔNG GIÁ TRỊ ĐƠN HÀNG: ${money(totalBatchPrice)} VNĐ
(Đã bao gồm: Chi phí vật liệu, gia công máy, nhân công kỹ thuật & QC, phụ kiện & bao bì)

${warrantyTerms ? 'TIẾN ĐỘ & BẢO HÀNH:' : 'TIẾN ĐỘ:'}
${scheduleLines}
${contactLine ? `\nLiên hệ VCUBE: ${contactLine}` : ''}
================================================`;

    navigator.clipboard.writeText(text);
    onShowToast('Đã sao chép bảng báo giá chi tiết! Bạn có thể dán trực tiếp gửi Zalo/Email cho khách.');
  };

  const hasOutOfStockAccessories = detailedSelectedAccessories.some(a => a.isOutOfStock);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-surface p-5 border border-line rounded-sm shadow-e1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="receipt_long" size={24} className="text-primary" />
              <h2 className="text-base font-bold text-fg">
                Trình Dự Toán BOM Kỹ Thuật & Báo Giá Nhanh Xưởng (Workshop Estimator)
              </h2>
            </div>
            <p className="text-xs text-fg-muted mt-1">
              Dành riêng cho Quản lý & Kỹ thuật viên: Bóc tách cấu trúc giá thành 8 tầng chi phí, tích hợp tự động phụ kiện (móc khóa, ốc cấy, bao bì) và kiểm tra tồn kho kho xưởng tức thì.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyFormalQuote}
            className="px-4 py-2.5 bg-primary text-primary-fg rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-primary-hover flex items-center gap-2 shadow-e1 shrink-0"
          >
            <Icon name="content_copy" size={16} />
            Sao Chép Báo Giá Gửi Khách (Zalo/Email)
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs (Left) & BOM Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project & Manufacturing Parameters */}
        <div className="lg:col-span-6 space-y-5">
          {/* 1. Job Information */}
          <div className="bg-surface p-5 border border-line rounded-sm space-y-4 shadow-e1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-fg flex items-center gap-2 pb-2 border-b border-line-subtle">
              <Icon name="badge" size={16} className="text-primary" />
              1. Thông Tin Khách Hàng & Đơn Hàng Gia Công
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="bom-job-name" className="font-bold text-fg block mb-1">Tên Dự Án / Phôi In</label>
                <input
                  id="bom-job-name"
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="w-full p-2 border border-line rounded-sm font-medium"
                />
              </div>

              <div>
                <label htmlFor="bom-customer" className="font-bold text-fg block mb-1">Tên Khách Hàng / Đơn Vị</label>
                <input
                  id="bom-customer"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 border border-line rounded-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* 2. Slicing & Machine Parameters */}
          <div className="bg-surface p-5 border border-line rounded-sm space-y-4 shadow-e1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-fg flex items-center gap-2 pb-2 border-b border-line-subtle">
              <Icon name="precision_manufacturing" size={16} className="text-primary" />
              2. Thông Số Kỹ Thuật In 3D & Máy Móc
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="bom-printer" className="font-bold text-fg block mb-1">Máy In Sử Dụng</label>
                <select
                  id="bom-printer"
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  className="w-full p-2 border border-line rounded-sm font-bold bg-surface"
                >
                  {printers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.technology}) - {plainNumber(p.powerKW)} kW
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bom-material" className="font-bold text-fg block mb-1">Loại Nhựa / Resin</label>
                <select
                  id="bom-material"
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full p-2 border border-line rounded-sm font-bold bg-surface"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({money(m.pricePerGram)} đ/g - Còn {plainNumber(m.stockRollsCount)} cuộn)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bom-weight" className="font-bold text-fg block mb-1">Khối Lượng Nhựa (g / cái)</label>
                <input
                  id="bom-weight"
                  type="number"
                  min="0"
                  placeholder="Chưa nhập"
                  value={weightGrams ?? ''}
                  onChange={(e) => setWeightGrams(numberOrUndefined(e.target.value))}
                  className="w-full p-2 border border-line rounded-sm font-tech font-bold"
                />
              </div>

              <div>
                <label htmlFor="bom-hours" className="font-bold text-fg block mb-1">Thời Gian In (giờ / cái)</label>
                <input
                  id="bom-hours"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Chưa nhập"
                  value={printHours ?? ''}
                  onChange={(e) => setPrintHours(numberOrUndefined(e.target.value))}
                  className="w-full p-2 border border-line rounded-sm font-tech font-bold"
                />
              </div>

              <div>
                <label htmlFor="bom-quantity" className="font-bold text-fg block mb-1">Số Lượng Đặt In (Batch)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="bom-quantity"
                    type="number"
                    min="1"
                    placeholder="Chưa nhập"
                    value={quantity ?? ''}
                    onChange={(e) => setQuantity(numberOrUndefined(e.target.value))}
                    className="w-full p-2 border border-line rounded-sm font-tech font-bold text-base text-primary"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[1, 10, 50, 100].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className={`px-2 py-1.5 text-xs font-tech font-bold rounded-sm border ${
                          quantity === q ? 'bg-surface-inverse text-on-inverse border-line' : 'bg-surface-muted text-fg-muted'
                        }`}
                      >
                        x{q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="bom-markup" className="font-bold text-fg block mb-1">Markup Lợi Nhuận Xưởng (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    id="bom-markup"
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={isConfiguredNumber(customMarkup) ? customMarkup : 10}
                    onChange={(e) => setCustomMarkup(numberOrUndefined(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <span className="font-tech font-bold text-xs text-primary w-12 text-right">
                    {isConfiguredNumber(customMarkup) ? `${customMarkup}%` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Phụ Kiện & Bao Bì Đóng Gói Đi Kèm (Key Feature) */}
          <div className="bg-surface p-5 border border-line rounded-sm space-y-4 shadow-e1">
            <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
              <h3 className="font-bold text-xs uppercase tracking-wider text-fg flex items-center gap-2">
                <Icon name="extension" size={16} className="text-primary" />
                3. Chọn Phụ Kiện & Bao Bì Đóng Gói (Add-on Hardware)
              </h3>
              <span className="text-xs font-tech text-fg-muted">
                Đã chọn: <strong>{detailedSelectedAccessories.length}</strong> món
              </span>
            </div>

            {hasOutOfStockAccessories && (
              <div className="p-3 bg-danger-tint border border-danger/30 rounded-sm text-xs text-danger flex items-center gap-2 font-bold animate-pulse">
                <Icon name="warning" size={18} className="text-danger" />
                Cảnh báo: Có phụ kiện trong đơn hàng đang thiếu hàng trong kho! Cần nhập thêm.
              </div>
            )}

            {/* Accessories Checklist */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {accessories.map((acc) => {
                const isSelected = selectedAccessories.some(a => a.accessoryId === acc.id);
                const currentSelection = selectedAccessories.find(a => a.accessoryId === acc.id);
                const qtyPerPart = currentSelection ? currentSelection.quantityPerPart : accessoryDefaultQtyPerPart;
                const totalNeeded = quantityKnown ? qtyPerPart * (quantity as number) : null;
                const isStockShortage = totalNeeded !== null && totalNeeded > acc.stockCount;

                return (
                  <div
                    key={acc.id}
                    className={`p-3 border rounded-sm transition-all text-xs ${
                      isSelected
                        ? 'border-primary bg-primary-tint/40 ring-1 ring-primary'
                        : 'border-line-subtle hover:border-line bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`acc-${acc.id}`} className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          id={`acc-${acc.id}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleAccessory(acc.id)}
                          className="accent-primary w-4 h-4 rounded-sm"
                        />
                        <div className="truncate">
                          <p className="font-bold text-fg truncate">{acc.name}</p>
                          <div className="flex items-center gap-2 text-xs text-fg-muted">
                            <span>Vốn: {acc.costPrice.toLocaleString('vi-VN')} đ</span>
                            <span>•</span>
                            <span className="text-primary font-bold">Báo khách: {acc.sellingPrice.toLocaleString('vi-VN')} đ</span>
                            <span>•</span>
                            <span className={totalNeeded === null ? 'text-fg-muted font-bold' : acc.stockCount < totalNeeded ? 'text-danger font-bold' : 'text-positive font-bold'}>
                              Kho còn: {acc.stockCount} {acc.unit} ({acc.warehouseLocation || 'Kho'})
                            </span>
                          </div>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="flex items-center gap-2 shrink-0">
                          <label htmlFor={`acc-qty-${acc.id}`} className="text-xs text-fg-muted font-bold">SL/chiếc:</label>
                          <input
                            id={`acc-qty-${acc.id}`}
                            type="number"
                            min="1"
                            max="20"
                            value={qtyPerPart}
                            onChange={(e) => handleUpdateAccessoryQty(acc.id, Number(e.target.value))}
                            className="w-12 p-1 border border-primary rounded-sm text-center font-tech font-bold bg-surface"
                          />
                        </div>
                      )}
                    </div>

                    {isSelected && isStockShortage && (
                      <div className="mt-2 text-xs text-danger bg-danger-tint p-1.5 rounded-sm border border-danger/30 font-bold">
                        Thiếu {(totalNeeded as number) - acc.stockCount} {acc.unit} (Yêu cầu: {plainNumber(totalNeeded)} • Tồn: {acc.stockCount})
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
          {/* Thiếu cấu hình ⇒ KHÔNG hiện giá (không suy đoán hộ), chỉ liệt kê việc cần làm */}
          {!estimateComplete && (
            <div role="status" className="bg-surface p-5 border border-warning/40 rounded-sm shadow-e1 space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-warning flex items-center gap-2">
                <Icon name="warning" size={16} />
                Chưa đủ cấu hình để tính giá — {unavailableInputs.length} thông số còn thiếu
              </h3>
              <p className="text-xs text-fg-muted">
                Hệ thống KHÔNG tự điền giá trị đoán và KHÔNG tạo báo giá gửi khách khi còn thông số chưa có nguồn.
              </p>
              <ul className="text-xs text-fg-muted list-disc pl-5 space-y-0.5">
                {unavailableInputs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Price Card */}
          <div className="bg-gradient-to-br from-surface-inverse to-surface-inverse-raised text-on-inverse p-6 rounded-lg shadow-e2 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-inverse-raised pb-3">
              <div>
                <span className="text-xs font-tech uppercase tracking-widest text-accent block">
                  BÁO GIÁ XUẤT XƯỞNG DỰ TÍNH (BATCH BẢNG GIÁ)
                </span>
                <h3 className="text-xl font-bold font-tech text-on-inverse mt-0.5">
                  {money(totalBatchPrice)} VNĐ
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-fg-subtle block uppercase">Đơn Giá 1 Chiếc</span>
                <span className="text-base font-tech font-bold text-accent">
                  {money(finalUnitPriceAfterDiscount)} đ
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-on-inverse/5 p-2.5 rounded-sm border border-on-inverse/10">
                <span className="text-xs text-fg-subtle block">Tổng Giá Vốn (COGS)</span>
                <span className="font-tech font-bold text-on-inverse">
                  {money(totalBatchCost)} đ
                </span>
              </div>
              <div className="bg-on-inverse/5 p-2.5 rounded-sm border border-on-inverse/10">
                <span className="text-xs text-fg-subtle block">Lợi Nhuận Xưởng</span>
                <span className="font-tech font-bold text-positive">
                  {totalBatchProfit === null ? '—' : `+${money(totalBatchProfit)} đ`}
                </span>
              </div>
              <div className="bg-on-inverse/5 p-2.5 rounded-sm border border-on-inverse/10">
                <span className="text-xs text-fg-subtle block">Biên Lợi Nhuận</span>
                <span className="font-tech font-bold text-accent">
                  {netMarginPercent === null ? '—' : `${netMarginPercent}%`}
                </span>
              </div>
            </div>

            {/* Wholesale / Discount Adjustment */}
            <div className="pt-2 border-t border-surface-inverse-raised flex items-center justify-between text-xs">
              <span className="text-fg-subtle">Chiết khấu ưu đãi khách hàng (%):</span>
              <div className="flex items-center gap-2">
                {[0, 5, 10, 15, 20].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCustomDiscountPercent(d)}
                    className={`px-2 py-0.5 text-xs font-tech font-bold rounded-sm ${
                      customDiscountPercent === d
                        ? 'bg-surface-inverse text-accent'
                        : 'bg-surface-muted text-fg-muted hover:bg-line-subtle'
                    }`}
                  >
                    {d === 0 ? '0%' : `-${d}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 8-Part Manufacturing Bill of Materials (BOM) Table */}
          <div className="bg-surface p-5 border border-line rounded-sm shadow-e1 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-fg flex items-center gap-2 pb-2 border-b border-line-subtle">
              <Icon name="account_tree" size={16} className="text-primary" />
              Bảng Phân Tích Chi Phí Sản Xuất Chi Tiết (8 Lớp Chi Phí BOM)
            </h3>

            <div className="space-y-2 text-xs divide-y divide-line-subtle">
              {/* 1. Material */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-info"></span>
                  <span className="font-bold text-fg">1. Chi Phí Nhựa In ({selectedMaterial?.name || '—'})</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-fg">{money(estimate?.materialCost)} đ</span>
                  <span className="text-xs text-fg-muted block">
                    ({plainNumber(weightGrams)}g x {plainNumber(quantity)} cái = {money(estimate && quantityKnown ? estimate.materialCost * (quantity as number) : null)} đ)
                  </span>
                </div>
              </div>

              {/* 2. Electricity */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning"></span>
                  <span className="font-bold text-fg">2. Điện Năng Máy In ({selectedPrinter ? `${plainNumber(selectedPrinter.powerKW)} kW` : '—'})</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-fg">{money(estimate?.electricityCost)} đ</span>
                  <span className="text-xs text-fg-muted block">({money(estimate && quantityKnown ? estimate.electricityCost * (quantity as number) : null)} đ/lô)</span>
                </div>
              </div>

              {/* 3. Machine Depreciation & Consumables */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-info"></span>
                  <span className="font-bold text-fg">3. Khấu Hao Máy & Hao Mòn Nozzle</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-fg">{money(estimate?.machineTotal)} đ</span>
                  <span className="text-xs text-fg-muted block">({money(estimate && quantityKnown ? estimate.machineTotal * (quantity as number) : null)} đ/lô)</span>
                </div>
              </div>

              {/* 4. Engineering & QC Labor */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-positive"></span>
                  <span className="font-bold text-fg">4. Nhân Công Kỹ Thuật ({plainNumber(totalLaborMins)} phút)</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-fg">{money(estimate?.laborCost)} đ</span>
                  <span className="text-xs text-fg-muted block">({money(estimate && quantityKnown ? estimate.laborCost * (quantity as number) : null)} đ/lô)</span>
                </div>
              </div>

              {/* 5. Accessories & Packaging Add-ons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <div>
                    <span className="font-bold text-fg">5. Phụ Kiện & Đóng Gói Kèm Theo</span>
                    {detailedSelectedAccessories.map(a => (
                      <span key={a.accessory.id} className="block text-xs text-fg-muted">
                        • {a.accessory.name} (x{a.quantityPerPart}): +{money(a.unitCost)} đ
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-fg">{money(estimate ? estimate.packaging + estimate.accessories : null)} đ</span>
                  <span className="text-xs text-fg-muted block">({money(estimate && quantityKnown ? (estimate.packaging + estimate.accessories) * (quantity as number) : null)} đ/lô)</span>
                </div>
              </div>

              {/* 6. Workshop Overhead */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-fg-subtle"></span>
                  <span className="font-bold text-fg">6. Quản Lý Xưởng & Mặt Bằng</span>
                </div>
                <div className="text-right font-tech">
                  <span className="font-bold text-fg">{money(estimate?.overhead)} đ</span>
                </div>
              </div>

              {/* 7. Failure Reserve */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-danger"></span>
                  <span className="font-bold text-fg">7. Dự Phòng Rủi Ro Hỏng Mẫu ({plainNumber(pricingConfig.baseFailureReservePercent)}%)</span>
                </div>
                <div className="text-right font-tech text-danger font-bold">
                  {estimate ? `+${money(estimate.failureCost)} đ` : '—'}
                </div>
              </div>

              {/* Summary Total Cost Row */}
              <div className="flex items-center justify-between pt-3 bg-canvas p-2 rounded-sm font-bold text-xs text-fg">
                <span>TỔNG GIÁ THÀNH XUẤT XƯỞNG (COGS / Cái):</span>
                <span className="font-tech text-sm text-primary">
                  {money(estimate?.costPriceUnit)} đ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
