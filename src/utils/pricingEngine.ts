import { AnalysisFile, DetailedCostBreakdown, PrinterProfile, MaterialProfile, InkiriCostFormulaConfig, DeliveryPackageOption, MachineComparisonItem } from '../types';
import { MATERIALS_CATALOG, PRINTER_PROFILES, DEFAULT_INKIRI_FORMULA_CONFIG } from '../data/mockData';

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
  customPricingConfig?: InkiriCostFormulaConfig;
  customPrinters?: PrinterProfile[];
  customMaterials?: MaterialProfile[];
  selectedAccessories?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
}

/**
 * VCUBE Core Slicer & Pricing Engine (PRC-005) - Inkiri Cost Model
 * Pure deterministic calculation - Integer VND safe output
 */
export function calculateDetailedPricing(input: PricingEngineInput): {
  breakdown: DetailedCostBreakdown;
  quickEstimateRange: { min: number; max: number };
  tier: 'quick_estimate' | 'exact_slice' | 'manual_review';
  manualReviewReasons: string[];
  volumeDiscount?: {
    tierLabel: string;
    discountPercent: number;
    discountedUnitPrice: number;
    totalSavings: number;
    totalAfterDiscount: number;
  };
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
    customPricingConfig,
    customPrinters = PRINTER_PROFILES,
    customMaterials = MATERIALS_CATALOG,
    selectedAccessories = []
  } = input;

  const cfg = customPricingConfig || DEFAULT_INKIRI_FORMULA_CONFIG;
  const targetMarkupPercent = input.targetMarkupPercent !== undefined ? input.targetMarkupPercent : cfg.defaultMarkupPercent;

  const currentPrinter = customPrinters.find(p => p.id === selectedPrinterId) || customPrinters[0] || PRINTER_PROFILES[0];
  const currentMaterial = customMaterials.find(m => m.id === selectedMaterialId) || customMaterials[0] || MATERIALS_CATALOG[0];

  // 1. Multi-color & Part Extruder analysis
  const activeExtruders = new Set(file.parts.map(p => p.extruderIndex)).size;
  const isMultiColor = activeExtruders > 1;
  const toolChangeMinutes = cfg.multiColorToolChangeMins ?? 1.5;
  const toolChangesCount = isMultiColor ? (activeExtruders - 1) * 85 : 0;
  const purgeWasteGrams = isMultiColor ? (activeExtruders - 1) * (cfg.multiColorPurgeWasteGrams ?? 28) : 0;

  // 2. Material Grams Breakdown
  // Shell volume (perimeter walls ~22%) + infill volume
  const supportRatio = (cfg.supportVolumeRatioPercent ?? 16) / 100;
  const rawModelGrams = Math.max(5, Math.round(transformedVolume * currentMaterial.density * (0.22 + (infillDensity / 100) * 0.78)));
  const supportGrams = supportsMode === 'none' ? 0 : Math.round(rawModelGrams * supportRatio);
  const brimRaftGrams = cfg.brimRaftGrams ?? 6; // Standard brim contact anchor
  const totalFilamentGramsPerUnit = rawModelGrams + supportGrams + brimRaftGrams + purgeWasteGrams;
  
  const materialCostPerGram = currentMaterial.pricePerGram || (currentMaterial.costPerKg ? Math.round(currentMaterial.costPerKg / 1000 * (currentMaterial.unitPriceMultiplier || 1)) : 850);
  const materialCost = Math.round(totalFilamentGramsPerUnit * materialCostPerGram);

  // 3. Print Time (Hours) & Electricity Cost
  const layerHeightMm = Number(layerHeight) || 0.2;
  const basePrintHours = Math.max(0.6, (transformedVolume * 3.8) / (layerHeightMm * 100));
  const toolChangeHours = (toolChangesCount * toolChangeMinutes) / 60;
  const totalPrintHoursPerUnit = Number((basePrintHours + toolChangeHours).toFixed(2));

  const averagePowerKW = currentPrinter.powerKW || 0.18;
  const electricityCost = Math.round(averagePowerKW * totalPrintHoursPerUnit * cfg.electricityRatePerKWh);

  // 4. Machine Depreciation & Consumables
  const machineLifetimeHours = currentPrinter.expectedLifetimeHours || 8000;
  const machineAcquisitionCost = currentPrinter.acquisitionCost || 35000000;
  const machineDepreciationPerHour = machineAcquisitionCost / machineLifetimeHours;
  const consumablesPerHour = currentPrinter.consumablesHourlyRate || 2500;
  
  const machineOperatingCostPerHour = machineDepreciationPerHour + consumablesPerHour;
  const machineDepreciationCost = Math.round(machineDepreciationPerHour * totalPrintHoursPerUnit);
  const maintenanceAndConsumablesCost = Math.round(consumablesPerHour * totalPrintHoursPerUnit);
  const machineOperatingCost = machineDepreciationCost + maintenanceAndConsumablesCost;

  // 5. Labor Cost Allocation (Configurable via Admin Inkiri model)
  const fileReviewMinutes = cfg.fileReviewLaborMinutes ?? 4;
  const setupMinutes = cfg.setupLaborMinutes ?? 5;
  const supportRemovalMinutes = supportsMode === 'none' ? 2 : (cfg.supportRemovalMinutes ?? 8);
  const postProcessingMinutes = cfg.postProcessingLaborMinutes ?? 6; // Deburring & optical measurement
  const qcMinutes = cfg.qcLaborMinutes ?? 4;
  const packagingMinutes = cfg.packagingLaborMinutes ?? 3;
  const totalLaborMinutes = fileReviewMinutes + setupMinutes + supportRemovalMinutes + postProcessingMinutes + qcMinutes + packagingMinutes;
  const laborHourlyRate = cfg.laborHourlyRate ?? BASE_LABOR_HOURLY_RATE;
  const laborCost = Math.round((totalLaborMinutes / 60) * laborHourlyRate);

  // 6. Accessories & Packaging
  const basePackagingCost = (cfg.fixedPackagingCost ?? FIXED_PACKAGING_BASE) + (isMultiColor ? (cfg.multiColorPackagingExtra ?? 5000) : 0);
  const accessoriesAddonCost = selectedAccessories.reduce((sum, item) => sum + (item.unitPrice * (item.quantity || 1)), 0);
  const accessoriesCost = basePackagingCost + accessoriesAddonCost;

  // 7. Overhead Allocation
  const overheadPerUnit = cfg.overheadPerUnit ?? FIXED_OVERHEAD_PER_UNIT;

  // 8. Failure Reserve Rate (Inkiri Risk formula)
  let failureReserveRate = (cfg.baseFailureReservePercent ?? 8) / 100;
  if (file.printability.printabilityScore < 80) failureReserveRate += (cfg.lowPrintabilityExtraPercent ?? 6) / 100;
  if (isMultiColor) failureReserveRate += (cfg.multiColorExtraPercent ?? 5) / 100;
  if (currentMaterial.id.includes('nylon') || currentMaterial.id.includes('resin') || currentMaterial.id.includes('pa-cf')) {
    failureReserveRate += (cfg.difficultMaterialExtraPercent ?? 4) / 100;
  }

  const baseCost = materialCost + electricityCost + machineOperatingCost + laborCost + accessoriesCost + overheadPerUnit;
  const failureReserveCost = Math.round(baseCost * failureReserveRate);
  const costPrice = baseCost + failureReserveCost; // Giá vốn xuất xưởng 1 sản phẩm

  // 9. Selling Price with Markup & Reverse Variable Fee Calculation
  // Reverse fees formula: SellingPrice = (CostPrice * (1 + Markup)) / (1 - (Platform% + Payment% + Royalty%))
  const targetMarkup = targetMarkupPercent / 100;
  const platformFeeRate = (cfg.platformCommissionPercent ?? 8) / 100;
  const paymentFeeRate = (cfg.paymentGatewayFeePercent ?? 2.5) / 100;
  const royaltyFeeRate = (cfg.designerRoyaltyPercent ?? 5) / 100;
  const totalVariableFeeRate = platformFeeRate + paymentFeeRate + royaltyFeeRate;
  
  const preFeeSellingPrice = Math.round(costPrice * (1 + targetMarkup));
  const rawSellingPrice = Math.round(preFeeSellingPrice / (1 - totalVariableFeeRate));
  
  // Rounding rule
  let finalSellingPriceRounded = rawSellingPrice;
  const rounding = cfg.roundingRule || '1000';
  if (rounding === '1000') {
    finalSellingPriceRounded = Math.ceil(rawSellingPrice / 1000) * 1000;
  } else if (rounding === '5000') {
    finalSellingPriceRounded = Math.ceil(rawSellingPrice / 5000) * 5000;
  } else if (rounding === '10000') {
    finalSellingPriceRounded = Math.ceil(rawSellingPrice / 10000) * 10000;
  }
  const roundingAdjustment = finalSellingPriceRounded - rawSellingPrice;

  // Gross Margin = (SellingPrice - CostPrice) / SellingPrice
  const calculatedGrossMarginPercent = Number((((finalSellingPriceRounded - costPrice) / finalSellingPriceRounded) * 100).toFixed(1));

  // Volume discount evaluation
  let volumeDiscount: {
    tierLabel: string;
    discountPercent: number;
    discountedUnitPrice: number;
    totalSavings: number;
    totalAfterDiscount: number;
  } | undefined = undefined;

  if (cfg.volumeDiscounts && cfg.volumeDiscounts.length > 0) {
    const matchedTier = cfg.volumeDiscounts.find(
      tier => quantity >= tier.minQty && (tier.maxQty === undefined || quantity <= tier.maxQty)
    );
    if (matchedTier && matchedTier.discountPercent > 0) {
      const discountedUnitPrice = Math.round(finalSellingPriceRounded * (1 - matchedTier.discountPercent / 100));
      const totalOriginal = finalSellingPriceRounded * quantity;
      const totalAfterDiscount = discountedUnitPrice * quantity;
      const totalSavings = totalOriginal - totalAfterDiscount;
      volumeDiscount = {
        tierLabel: matchedTier.label,
        discountPercent: matchedTier.discountPercent,
        discountedUnitPrice,
        totalSavings,
        totalAfterDiscount
      };
    }
  }

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
    electricityRatePerKWh: cfg.electricityRatePerKWh,
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
    platformCommissionPercent: platformFeeRate * 100,
    paymentGatewayFeePercent: paymentFeeRate * 100,
    designerRoyaltyPercent: royaltyFeeRate * 100,
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
    manualReviewReasons,
    volumeDiscount
  };
}

/**
 * Direct simulator for Admin manual quick cost calculation (Inkiri Style)
 */
export interface ManualCalcInput {
  filamentGrams: number;
  printHours: number;
  materialPricePerKg: number; // VND
  printerAcquisitionCost: number; // VND
  printerLifetimeHours: number;
  printerConsumablesPerHour: number; // VND
  printerPowerKW: number;
  electricityRatePerKWh: number; // VND
  laborHourlyRate: number; // VND
  laborTotalMinutes: number;
  packagingCost: number; // VND
  accessoriesCost?: number; // VND (hardware / add-ons cost)
  overheadCost: number; // VND
  failureRatePercent: number; // %
  markupPercent: number; // %
  taxAndGatewayPercent: number; // %
  quantity: number;
}

export function calculateManualInkiriEstimate(input: ManualCalcInput) {
  const {
    filamentGrams,
    printHours,
    materialPricePerKg,
    printerAcquisitionCost,
    printerLifetimeHours,
    printerConsumablesPerHour,
    printerPowerKW,
    electricityRatePerKWh,
    laborHourlyRate,
    laborTotalMinutes,
    packagingCost,
    accessoriesCost = 0,
    overheadCost,
    failureRatePercent,
    markupPercent,
    taxAndGatewayPercent,
    quantity
  } = input;

  // 1. Material
  const materialCost = Math.round((filamentGrams * materialPricePerKg) / 1000);

  // 2. Electricity
  const electricityCost = Math.round(printerPowerKW * printHours * electricityRatePerKWh);

  // 3. Machine Depreciation & Consumables
  const machineDepreciation = Math.round((printerAcquisitionCost / Math.max(100, printerLifetimeHours)) * printHours);
  const consumablesCost = Math.round(printerConsumablesPerHour * printHours);
  const machineTotal = machineDepreciation + consumablesCost;

  // 4. Labor
  const laborCost = Math.round((laborTotalMinutes / 60) * laborHourlyRate);

  // 5. Packaging & Accessories
  const packaging = packagingCost;
  const accessories = accessoriesCost;

  // 6. Overhead
  const overhead = overheadCost;

  // 7. Base Cost & Failure
  const subtotalCost = materialCost + electricityCost + machineTotal + laborCost + packaging + accessories + overhead;
  const failureCost = Math.round(subtotalCost * (failureRatePercent / 100));
  const costPriceUnit = subtotalCost + failureCost;

  // 8. Selling Price
  const preFeePrice = Math.round(costPriceUnit * (1 + markupPercent / 100));
  const feeMultiplier = Math.max(0.01, 1 - taxAndGatewayPercent / 100);
  const rawSellingPrice = Math.round(preFeePrice / feeMultiplier);
  const finalUnitPrice = Math.ceil(rawSellingPrice / 1000) * 1000;

  const profitPerUnit = finalUnitPrice - costPriceUnit;
  const totalCostBatch = costPriceUnit * quantity;
  const totalRevenueBatch = finalUnitPrice * quantity;
  const totalProfitBatch = profitPerUnit * quantity;
  const grossMarginPercent = Number(((profitPerUnit / finalUnitPrice) * 100).toFixed(1));

  return {
    materialCost,
    electricityCost,
    machineDepreciation,
    consumablesCost,
    machineTotal,
    laborCost,
    packaging,
    accessories,
    overhead,
    failureCost,
    costPriceUnit,
    finalUnitPrice,
    profitPerUnit,
    grossMarginPercent,
    totalCostBatch,
    totalRevenueBatch,
    totalProfitBatch
  };
}

/**
 * Generate 3 Customer Packages: Economy, Standard, Express (PRC-007)
 */
export function generateDeliveryPackages(unitBasePrice: number, quantity: number, customPricingConfig?: InkiriCostFormulaConfig): DeliveryPackageOption[] {
  const today = new Date();
  const cfg = customPricingConfig || DEFAULT_INKIRI_FORMULA_CONFIG;
  const ecoDiscount = (cfg.economyDiscountPercent ?? 10) / 100;
  const expRushSurcharge = (cfg.expressRushSurchargePercent ?? 30) / 100;
  
  // Economy: 5-7 days (Batch optimized printing) - Configurable discount
  const ecoDate = new Date(today);
  ecoDate.setDate(today.getDate() + 6);
  const ecoUnitPrice = Math.ceil((unitBasePrice * (1 - ecoDiscount)) / 1000) * 1000;

  // Standard: 3-4 days (Regular factory queue)
  const stdDate = new Date(today);
  stdDate.setDate(today.getDate() + 3);
  const stdUnitPrice = unitBasePrice;

  // Express: 1-2 days (Priority rush queue) + Configurable rush fee
  const expDate = new Date(today);
  expDate.setDate(today.getDate() + 1);
  const expUnitPrice = Math.ceil((unitBasePrice * (1 + expRushSurcharge)) / 1000) * 1000;

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
  quantity: number,
  customPricingConfig?: InkiriCostFormulaConfig,
  customPrinters?: PrinterProfile[],
  customMaterials?: MaterialProfile[]
): MachineComparisonItem[] {
  const printersList = customPrinters && customPrinters.length > 0 ? customPrinters : PRINTER_PROFILES;
  return printersList.map((printer) => {
    const calc = calculateDetailedPricing({
      file,
      transformedVolume,
      selectedPrinterId: printer.id,
      selectedMaterialId,
      infillDensity,
      infillPattern: 'Gyroid',
      layerHeight,
      supportsMode,
      quantity,
      customPricingConfig,
      customPrinters: printersList,
      customMaterials
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
