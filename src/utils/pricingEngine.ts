import { AnalysisFile, DetailedCostBreakdown, PrinterProfile, DeliveryPackageOption, MachineComparisonItem } from '../types';
import { MATERIALS_CATALOG, PRINTER_PROFILES } from '../data/mockData';

export const ELECTRICITY_PRICE_PER_KWH = 2850; // VND / kWh (Commercial Tier 2)
export const BASE_LABOR_HOURLY_RATE = 65000; // VND / hour technician wage
export const PLATFORM_FEE_PERCENT = 0.08; // 8% Platform Commission
export const PAYMENT_GATEWAY_FEE_PERCENT = 0.025; // 2.5% Payment gateway fee
export const DESIGNER_ROYALTY_PERCENT = 0.05; // 5% Designer digital royalty
export const FIXED_PACKAGING_BASE = 12000; // Box, antistatic zip, desiccant pouch, bubble foam
export const FIXED_OVERHEAD_PER_UNIT = 15000; // Workshop rent, software licenses, internet, management

export interface PricingEngineInput {
  file: AnalysisFile;
  transformedVolume: number;
  selectedPrinterId: string;
  selectedMaterialId: string;
  infillDensity: number;
  infillPattern: string;
  layerHeight: string;
  supportsMode: 'auto' | 'tree' | 'none';
  quantity: number;
  targetMarkupPercent?: number; // default 35%
}

/**
 * VCUBE Core Slicer & Pricing Engine (PRC-005)
 * Pure deterministic calculation - Integer VND safe output
 */
export function calculateDetailedPricing(input: PricingEngineInput): {
  breakdown: DetailedCostBreakdown;
  quickEstimateRange: { min: number; max: number };
  tier: 'quick_estimate' | 'exact_slice' | 'manual_review';
  manualReviewReasons: string[];
} {
  const {
    file,
    transformedVolume,
    selectedPrinterId,
    selectedMaterialId,
    infillDensity,
    layerHeight,
    supportsMode,
    quantity,
    targetMarkupPercent = 35
  } = input;

  const currentPrinter = PRINTER_PROFILES.find(p => p.id === selectedPrinterId) || PRINTER_PROFILES[0];
  const currentMaterial = MATERIALS_CATALOG.find(m => m.id === selectedMaterialId) || MATERIALS_CATALOG[0];

  // 1. Multi-color & Part Extruder analysis
  const activeExtruders = new Set(file.parts.map(p => p.extruderIndex)).size;
  const isMultiColor = activeExtruders > 1;
  const toolChangesCount = isMultiColor ? (activeExtruders - 1) * 85 : 0;
  const purgeWasteGrams = isMultiColor ? (activeExtruders - 1) * 28 : 0;

  // 2. Material Grams Breakdown
  // Shell volume (perimeter walls ~22%) + infill volume
  const rawModelGrams = Math.max(5, Math.round(transformedVolume * currentMaterial.density * (0.22 + (infillDensity / 100) * 0.78)));
  const supportGrams = supportsMode === 'none' ? 0 : Math.round(rawModelGrams * 0.16);
  const brimRaftGrams = 6; // Standard 5mm brim contact anchor
  const totalFilamentGramsPerUnit = rawModelGrams + supportGrams + brimRaftGrams + purgeWasteGrams;
  
  const materialCostPerGram = currentMaterial.pricePerGram;
  const materialCost = Math.round(totalFilamentGramsPerUnit * materialCostPerGram);

  // 3. Print Time (Hours) & Electricity Cost
  const layerHeightMm = Number(layerHeight);
  const basePrintHours = Math.max(0.6, (transformedVolume * 3.8) / (layerHeightMm * 100));
  const toolChangeHours = (toolChangesCount * 1.5) / 60; // 1.5 min per multi-filament swap
  const totalPrintHoursPerUnit = Number((basePrintHours + toolChangeHours).toFixed(2));

  const averagePowerKW = currentPrinter.powerKW || 0.18;
  const electricityCost = Math.round(averagePowerKW * totalPrintHoursPerUnit * ELECTRICITY_PRICE_PER_KWH);

  // 4. Machine Depreciation & Consumables
  const machineLifetimeHours = currentPrinter.expectedLifetimeHours || 8000;
  const machineAcquisitionCost = currentPrinter.acquisitionCost || 35000000;
  const machineDepreciationPerHour = machineAcquisitionCost / machineLifetimeHours;
  const consumablesPerHour = currentPrinter.consumablesHourlyRate || 2500;
  
  const machineOperatingCostPerHour = machineDepreciationPerHour + consumablesPerHour;
  const machineDepreciationCost = Math.round(machineDepreciationPerHour * totalPrintHoursPerUnit);
  const maintenanceAndConsumablesCost = Math.round(consumablesPerHour * totalPrintHoursPerUnit);
  const machineOperatingCost = machineDepreciationCost + maintenanceAndConsumablesCost;

  // 5. Labor Cost Allocation
  const fileReviewMinutes = 4;
  const setupMinutes = 5;
  const supportRemovalMinutes = supportsMode === 'none' ? 2 : 8;
  const postProcessingMinutes = 6; // Deburring & optical measurement
  const qcMinutes = 4;
  const packagingMinutes = 3;
  const totalLaborMinutes = fileReviewMinutes + setupMinutes + supportRemovalMinutes + postProcessingMinutes + qcMinutes + packagingMinutes;
  const laborHourlyRate = BASE_LABOR_HOURLY_RATE;
  const laborCost = Math.round((totalLaborMinutes / 60) * laborHourlyRate);

  // 6. Accessories & Packaging
  const accessoriesCost = FIXED_PACKAGING_BASE + (isMultiColor ? 5000 : 0);

  // 7. Overhead Allocation
  const overheadPerUnit = FIXED_OVERHEAD_PER_UNIT;

  // 8. Failure Reserve Rate
  let failureReserveRate = 0.08; // 8% baseline
  if (file.printability.printabilityScore < 80) failureReserveRate += 0.06;
  if (isMultiColor) failureReserveRate += 0.05;
  if (currentMaterial.id.includes('nylon') || currentMaterial.id.includes('resin')) failureReserveRate += 0.04;

  const baseCost = materialCost + electricityCost + machineOperatingCost + laborCost + accessoriesCost + overheadPerUnit;
  const failureReserveCost = Math.round(baseCost * failureReserveRate);
  const costPrice = baseCost + failureReserveCost; // Giá vốn xuất xưởng 1 sản phẩm

  // 9. Selling Price with Markup & Reverse Variable Fee Calculation
  // Reverse fees formula: SellingPrice = (CostPrice * (1 + Markup)) / (1 - (Platform% + Payment% + Royalty%))
  const targetMarkup = targetMarkupPercent / 100;
  const totalVariableFeeRate = PLATFORM_FEE_PERCENT + PAYMENT_GATEWAY_FEE_PERCENT + DESIGNER_ROYALTY_PERCENT;
  
  const preFeeSellingPrice = Math.round(costPrice * (1 + targetMarkup));
  const rawSellingPrice = Math.round(preFeeSellingPrice / (1 - totalVariableFeeRate));
  
  // Round up to nearest 1,000 VND
  const finalSellingPriceRounded = Math.ceil(rawSellingPrice / 1000) * 1000;
  const roundingAdjustment = finalSellingPriceRounded - rawSellingPrice;

  // Gross Margin = (SellingPrice - CostPrice) / SellingPrice
  const calculatedGrossMarginPercent = Number((((finalSellingPriceRounded - costPrice) / finalSellingPriceRounded) * 100).toFixed(1));

  const breakdown: DetailedCostBreakdown = {
    modelGrams: rawModelGrams,
    supportGrams,
    brimRaftGrams,
    purgeGrams: purgeWasteGrams,
    totalFilamentGrams: totalFilamentGramsPerUnit,
    materialCostPerGram,
    materialCost,

    printHours: totalPrintHoursPerUnit,
    averagePowerKW,
    electricityRatePerKWh: ELECTRICITY_PRICE_PER_KWH,
    electricityCost,

    machineDepreciationCost,
    maintenanceAndConsumablesCost,
    machineOperatingCost,

    fileReviewLaborMinutes: fileReviewMinutes,
    setupLaborMinutes: setupMinutes,
    supportRemovalMinutes,
    postProcessingLaborMinutes: postProcessingMinutes,
    qcLaborMinutes: qcMinutes,
    packagingLaborMinutes: packagingMinutes,
    totalLaborMinutes,
    laborHourlyRate,
    laborCost,

    accessoriesCost,
    overheadPerUnit,
    failureReserveRate,
    failureReserveCost,

    baseCost,
    costPrice,

    targetMarkupPercent,
    calculatedGrossMarginPercent,
    platformCommissionPercent: PLATFORM_FEE_PERCENT * 100,
    paymentGatewayFeePercent: PAYMENT_GATEWAY_FEE_PERCENT * 100,
    designerRoyaltyPercent: DESIGNER_ROYALTY_PERCENT * 100,
    fixedAdminFee: 0,

    preFeeSellingPrice,
    finalSellingPrice: rawSellingPrice,
    roundingAdjustment,
    finalSellingPriceRounded
  };

  // Quick Estimate Range (for Tier 1)
  const quickMin = Math.floor((finalSellingPriceRounded * 0.9) / 1000) * 1000;
  const quickMax = Math.ceil((finalSellingPriceRounded * 1.18) / 1000) * 1000;
  const quickEstimateRange = { min: quickMin, max: quickMax };

  // Manual Review Triggers (Tier 3)
  const manualReviewReasons: string[] = [];
  if (file.dimensions.x > currentPrinter.bedDimensions.x || file.dimensions.y > currentPrinter.bedDimensions.y || file.dimensions.z > currentPrinter.bedDimensions.z) {
    manualReviewReasons.push(`Kích thước phôi (${file.dimensions.x}x${file.dimensions.y}x${file.dimensions.z}mm) vượt quá khổ bàn in ${currentPrinter.name}.`);
  }
  if (!file.isWatertight || file.invertedNormals > 0) {
    manualReviewReasons.push('File chứa lỗi hình học Mesh non-manifold hoặc mặt tam giác đảo pháp tuyến.');
  }
  if (file.minWallThickness < 0.8) {
    manualReviewReasons.push(`Độ dày thành cực nhỏ (${file.minWallThickness}mm) dưới ngưỡng an toàn của đầu phun 0.4mm.`);
  }
  if (quantity >= 50 || finalSellingPriceRounded * quantity >= 15000000) {
    manualReviewReasons.push('Đơn hàng số lượng lớn (>50 cái hoặc >15 triệu VNĐ) cần kỹ sư xưởng xếp khay tối ưu.');
  }
  if (activeExtruders > 4) {
    manualReviewReasons.push('Số lượng màu (>4 màu) vượt quá 1 cụm AMS/MMU tiêu chuẩn, cần setup mở rộng.');
  }

  const tier = manualReviewReasons.length > 0 ? 'manual_review' : 'exact_slice';

  return {
    breakdown,
    quickEstimateRange,
    tier,
    manualReviewReasons
  };
}

/**
 * Generate 3 Customer Packages: Economy, Standard, Express (PRC-007)
 */
export function generateDeliveryPackages(unitBasePrice: number, quantity: number): DeliveryPackageOption[] {
  const today = new Date();
  
  // Economy: 5-7 days (Batch optimized printing) - 10% discount
  const ecoDate = new Date(today);
  ecoDate.setDate(today.getDate() + 6);
  const ecoUnitPrice = Math.ceil((unitBasePrice * 0.90) / 1000) * 1000;

  // Standard: 3-4 days (Regular factory queue)
  const stdDate = new Date(today);
  stdDate.setDate(today.getDate() + 3);
  const stdUnitPrice = unitBasePrice;

  // Express: 1-2 days (Priority rush queue) + 30% rush fee
  const expDate = new Date(today);
  expDate.setDate(today.getDate() + 1);
  const expUnitPrice = Math.ceil((unitBasePrice * 1.30) / 1000) * 1000;

  return [
    {
      tier: 'economy',
      name: 'Gói Tiết Kiệm',
      leadTimeDays: '5–7 ngày làm việc',
      completionDate: ecoDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      pricePerUnit: ecoUnitPrice,
      totalPrice: ecoUnitPrice * quantity,
      description: 'Ghép khay in theo lô tối ưu chi phí, phù hợp dự án không gấp.',
      isPopular: false
    },
    {
      tier: 'standard',
      name: 'Gói Tiêu Chuẩn',
      leadTimeDays: '3–4 ngày làm việc',
      completionDate: stdDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      pricePerUnit: stdUnitPrice,
      totalPrice: stdUnitPrice * quantity,
      description: 'Lựa chọn phổ biến nhất. In độc lập, kiểm định quang học dung sai ±0.05mm.',
      isPopular: true
    },
    {
      tier: 'express',
      name: 'Gói Hỏa Tốc (24H)',
      leadTimeDays: '1–2 ngày làm việc',
      completionDate: expDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      pricePerUnit: expUnitPrice,
      totalPrice: expUnitPrice * quantity,
      description: 'Ưu tiên máy in ngay lập tức, kỹ thuật viên trực đêm gia công cấp tốc.',
      isPopular: false
    }
  ];
}

/**
 * Compare Multiple Compatible Machines (PRC-009)
 */
export function comparePrintersForModel(
  file: AnalysisFile,
  transformedVolume: number,
  selectedMaterialId: string,
  infillDensity: number,
  layerHeight: string,
  supportsMode: 'auto' | 'tree' | 'none',
  quantity: number
): MachineComparisonItem[] {
  return PRINTER_PROFILES.map((printer) => {
    const calc = calculateDetailedPricing({
      file,
      transformedVolume,
      selectedPrinterId: printer.id,
      selectedMaterialId,
      infillDensity,
      infillPattern: 'Gyroid',
      layerHeight,
      supportsMode,
      quantity
    });

    const hours = calc.breakdown.printHours;
    const hoursInt = Math.floor(hours);
    const minsInt = Math.round((hours - hoursInt) * 60);

    const finishDate = new Date();
    finishDate.setHours(finishDate.getHours() + Math.ceil(hours * quantity) + 24);

    let riskLevel: 'Thấp' | 'Trung Bình' | 'Cảnh Báo' = 'Thấp';
    if (file.dimensions.x > printer.bedDimensions.x || file.dimensions.y > printer.bedDimensions.y) {
      riskLevel = 'Cảnh Báo';
    } else if (calc.breakdown.failureReserveRate > 0.12) {
      riskLevel = 'Trung Bình';
    }

    let recommendationTag: 'Rẻ Nhất' | 'Nhanh Nhất' | 'Lợi Nhuận Tối Đa' | 'Máy Sẵn Sàng' | undefined;
    if (printer.id === 'bambu-x1c') recommendationTag = 'Nhanh Nhất';
    if (printer.id === 'anycubic-kobra-max') recommendationTag = 'Rẻ Nhất';
    if (printer.id === 'formlabs-form-4') recommendationTag = 'Lợi Nhuận Tối Đa';

    return {
      printerId: printer.id,
      printerName: printer.name,
      technology: printer.technology,
      printTimeFormatted: `${hoursInt}h ${minsInt}m`,
      printTimeHours: hours,
      costPrice: calc.breakdown.costPrice,
      sellingPrice: calc.breakdown.finalSellingPriceRounded,
      completionDate: finishDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      riskLevel,
      recommendationTag
    };
  });
}
