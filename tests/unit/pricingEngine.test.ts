/**
 * Unit test — `src/utils/pricingEngine.ts`
 *
 * Vì sao quan trọng: engine tính ra con số khách trả tiền. Luật data-honesty/PRC:
 * thiếu thông số ⇒ NÉM `PricingUnavailableError` (không được bịa số 0đ hay rơi về bộ số
 * mẫu của Inkiri). Các test dưới khoá: công thức làm tròn, guard thiếu tham số, và hành vi
 * "chưa cấu hình phí nền tảng ⇒ chặn" — nếu ai thêm lại default ngầm, test sẽ đỏ.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PricingUnavailableError,
  calculateDetailedPricing,
  calculateManualInkiriEstimate,
  compute3SidedOrderFinancialSplit,
  computeElectricityCostVnd,
  computeLaborCostVnd,
  generateDeliveryPackages,
  type PricingEngineInput,
} from '../../src/utils/pricingEngine';
import { DEFAULT_INKIRI_FORMULA_CONFIG } from '../../src/data/mockData';
import type { AnalysisFile, InkiriCostFormulaConfig, MaterialProfile, PrinterProfile } from '../../src/types';

/* ── Fixture tối thiểu nhưng ĐỦ field bắt buộc của type (không cast, không `any`) ─────────── */
const PRINTER: PrinterProfile = {
  id: 'prn-1',
  name: 'Máy test',
  brand: 'TestBrand',
  bedDimensions: { x: 256, y: 256, z: 256 },
  nozzleDiameter: 0.4,
  technology: 'FDM',
  powerKW: 0.5,
  acquisitionCost: 30_000_000,
  expectedLifetimeHours: 6000,
  consumablesHourlyRate: 1500,
  hourlyRate: 20_000,
  status: 'Idle',
};

const MATERIAL: MaterialProfile = {
  id: 'mat-1',
  name: 'PLA test',
  density: 1.24,
  strength: '',
  heatResistance: '',
  flexibility: '',
  costPerKg: 600_000,
  pricePerGram: 0.6,
  unitPriceMultiplier: 2.5,
  colors: [],
  desc: '',
  recommendedFor: '',
  inStock: true,
};

const FILE: AnalysisFile = {
  id: 'file-1',
  fileName: 'demo.stl',
  fileSize: '1 MB',
  format: 'STL',
  uploadDate: '2026-01-01',
  dimensions: { x: 50, y: 50, z: 50 },
  volume: 125,
  surfaceArea: 100,
  triangleCount: 1000,
  partsCount: 1,
  parts: [],
  isWatertight: true,
  nonManifoldEdges: 0,
  invertedNormals: 0,
  minWallThickness: 2,
  recommendedTech: 'FDM',
  requiresSupport: false,
  printability: {
    printabilityScore: 90,
    level: 'good',
    issues: [],
    recommendedOrientation: 'Z',
    bedFit: true,
    overhangPercentage: 5,
  },
  tag: 'demo',
  status: 'Ready',
  modelType: 'custom',
};

/** Bộ số mẫu Inkiri có ĐỦ ô engine đọc (3 ngưỡng "cần chủ dự án quyết" được điền trong test). */
const FORMULA: InkiriCostFormulaConfig = {
  ...DEFAULT_INKIRI_FORMULA_CONFIG,
  noSupportRemovalMinutes: 2,
  bulkOrderQuantityThreshold: 50,
  bulkOrderAmountThresholdVnd: 15_000_000,
};

const GLOBAL_RATES = { electricityRateVnd: 2850, laborHourlyRateVnd: 65_000, marketplaceFeePercent: 8 };

const makeInput = (overrides: Partial<PricingEngineInput> = {}): PricingEngineInput => ({
  file: FILE,
  transformedVolume: 100,
  selectedPrinterId: PRINTER.id,
  selectedMaterialId: MATERIAL.id,
  infillDensity: 20,
  infillPattern: 'grid',
  layerHeight: '0.2',
  supportsMode: 'auto',
  quantity: 10,
  customPricingConfig: FORMULA,
  customPrinters: [PRINTER],
  customMaterials: [MATERIAL],
  globalRates: GLOBAL_RATES,
  ...overrides,
});

const expectCode = (fn: () => unknown, code: PricingUnavailableError['code']): PricingUnavailableError => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof PricingUnavailableError, `phải ném PricingUnavailableError, nhận ${String(error)}`);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`mong đợi PricingUnavailableError(${code}) nhưng không có lỗi nào được ném`);
};

describe('pricingEngine — lỗi có mã ngữ cảnh', () => {
  test('PricingUnavailableError giữ name/code/message để call site render đúng lý do', () => {
    const error = new PricingUnavailableError('no_printer', 'Chưa có máy in');
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'PricingUnavailableError');
    assert.equal(error.code, 'no_printer');
    assert.equal(error.message, 'Chưa có máy in');
  });
});

describe('pricingEngine — hàm chi phí thuần & làm tròn về đồng', () => {
  test('tiền điện = round(kW × giờ × đơn giá kWh)', () => {
    assert.equal(computeElectricityCostVnd(0.2, 3, 2850), 1710);
    assert.equal(computeElectricityCostVnd(1, 1, 0), 0);
    // 1 × 1 × 0.5 = 0.5 ⇒ Math.round ⇒ 1 (làm tròn về đồng).
    assert.equal(computeElectricityCostVnd(1, 1, 0.5), 1);
  });

  test('tiền nhân công = round(phút / 60 × đơn giá giờ)', () => {
    assert.equal(computeLaborCostVnd(45, 65_000), 48_750);
    assert.equal(computeLaborCostVnd(30, 65_000), 32_500);
    assert.equal(computeLaborCostVnd(0, 65_000), 0);
  });
});

describe('pricingEngine — calculateManualInkiriEstimate (bộ ước lượng thủ công)', () => {
  const manualInput = {
    filamentGrams: 200,
    printHours: 4,
    materialPricePerKg: 600_000,
    printerAcquisitionCost: 30_000_000,
    printerLifetimeHours: 6000,
    printerConsumablesPerHour: 1500,
    printerPowerKW: 0.5,
    electricityRatePerKWh: 3000,
    laborHourlyRate: 65_000,
    laborTotalMinutes: 30,
    packagingCost: 12_000,
    ipaCost: 8000,
    accessoriesCost: 15_000,
    overheadCost: 10_000,
    failureRatePercent: 8,
    markupPercent: 35,
    taxAndGatewayPercent: 2.5,
    quantity: 10,
  } as const;

  test('các tầng chi phí + lãi + phí tính đúng như công thức hiện tại', () => {
    const r = calculateManualInkiriEstimate(manualInput);
    assert.equal(r.materialCost, 120_000); // 200g × 600.000 đ/kg ÷ 1000
    assert.equal(r.electricityCost, 6000); // 0.5 kW × 4h × 3.000 đ
    assert.equal(r.machineDepreciation, 20_000); // 30tr ÷ 6000h × 4h
    assert.equal(r.consumablesCost, 6000);
    assert.equal(r.machineTotal, 26_000);
    assert.equal(r.laborCost, 32_500); // 30 phút × 65.000 đ/h
    assert.equal(r.failureCost, 18_360); // 8% của 229.500
    assert.equal(r.costPriceUnit, 247_860);
    assert.equal(r.finalUnitPrice, 344_000); // làm tròn LÊN bội số 1.000
    assert.equal(r.profitPerUnit, 96_140);
    assert.equal(r.grossMarginPercent, 27.9);
    assert.equal(r.totalCostBatch, 2_478_600);
    assert.equal(r.totalRevenueBatch, 3_440_000);
    assert.equal(r.totalProfitBatch, 961_400);
  });

  test('tuổi thọ máy < 100h được chặn sàn 100h (không khấu hao vô lý)', () => {
    // Vì sao: chia cho tuổi thọ 0/50h sẽ đẩy khấu hao lên gấp nhiều lần; guard `Math.max(100, …)`
    // là hành vi đã có, test khoá lại để refactor không bỏ mất.
    const r = calculateManualInkiriEstimate({
      ...manualInput,
      filamentGrams: 0,
      printHours: 1,
      materialPricePerKg: 0,
      printerAcquisitionCost: 1_000_000,
      printerLifetimeHours: 50,
      printerConsumablesPerHour: 0,
      printerPowerKW: 0,
      electricityRatePerKWh: 0,
      laborHourlyRate: 0,
      laborTotalMinutes: 0,
      packagingCost: 0,
      ipaCost: 0,
      accessoriesCost: 0,
      overheadCost: 0,
      failureRatePercent: 0,
      markupPercent: 0,
      taxAndGatewayPercent: 0,
      quantity: 1,
    });
    assert.equal(r.machineDepreciation, 10_000); // 1tr ÷ 100h × 1h
    assert.equal(r.costPriceUnit, 10_000);
  });
});

describe('pricingEngine — generateDeliveryPackages (3 gói giao hàng)', () => {
  test('gói Tiết kiệm giảm 10%, Tiêu chuẩn = giá gốc, Hỏa tốc +30% (đã ceil 1.000đ)', () => {
    const packages = generateDeliveryPackages(100_000, 10, FORMULA);
    assert.deepEqual(packages.map((p) => p.tier), ['economy', 'standard', 'express']);
    assert.equal(packages[0].pricePerUnit, 90_000);
    assert.equal(packages[0].totalPrice, 900_000);
    assert.equal(packages[1].pricePerUnit, 100_000);
    assert.equal(packages[1].totalPrice, 1_000_000);
    assert.equal(packages[2].pricePerUnit, 130_000);
    assert.equal(packages[2].totalPrice, 1_300_000);
    assert.equal(packages[1].isPopular, true);
    assert.equal(packages[0].isPopular, false);
    assert.match(packages[0].completionDate, /^\d{2}\/\d{2}\/\d{4}$/u);
    assert.match(packages[0].leadTimeDays, /ngày/u);
  });

  test('giá gói luôn làm tròn LÊN bội số 1.000đ', () => {
    const packages = generateDeliveryPackages(100_500, 1, FORMULA);
    assert.equal(packages[0].pricePerUnit, 91_000); // ceil(90.450)
    assert.equal(packages[2].pricePerUnit, 131_000); // ceil(130.650)
  });

  test('thiếu cấu hình công thức ⇒ chặn, không dùng số mẫu', () => {
    expectCode(() => generateDeliveryPackages(100_000, 1, undefined), 'no_formula_config');
  });
});

describe('pricingEngine — calculateDetailedPricing: guard "không bịa số"', () => {
  test('thiếu cấu hình công thức ⇒ no_formula_config', () => {
    expectCode(() => calculateDetailedPricing(makeInput({ customPricingConfig: undefined })), 'no_formula_config');
  });

  test('không có máy in ⇒ no_printer (không giả định máy mặc định)', () => {
    expectCode(() => calculateDetailedPricing(makeInput({ customPrinters: [] })), 'no_printer');
  });

  test('không có vật liệu ⇒ no_material', () => {
    expectCode(() => calculateDetailedPricing(makeInput({ customMaterials: [] })), 'no_material');
  });

  test('chưa cấu hình đơn giá điện/nhân công ⇒ chặn với mã nêu đích danh', () => {
    const error = expectCode(
      () => calculateDetailedPricing(makeInput({ globalRates: { electricityRateVnd: null, laborHourlyRateVnd: 65_000, marketplaceFeePercent: 8 } })),
      'no_electricity_rate',
    );
    assert.match(error.message, /đơn giá điện/u);

    expectCode(
      () => calculateDetailedPricing(makeInput({ globalRates: { electricityRateVnd: 2850, laborHourlyRateVnd: null, marketplaceFeePercent: 8 } })),
      'no_labor_rate',
    );
  });

  test('chưa cấu hình phí nền tảng ⇒ missing_params nêu tên cột (không mặc định 0%)', () => {
    const error = expectCode(
      () => calculateDetailedPricing(makeInput({ globalRates: { electricityRateVnd: 2850, laborHourlyRateVnd: 65_000, marketplaceFeePercent: null } })),
      'missing_params',
    );
    assert.match(error.message, /marketplace_fee_percent/u);
    assert.match(error.message, /KHÔNG tính giá/u);
  });

  test('thông số đầu vào thiếu (NaN) ⇒ missing_params nêu tên trường', () => {
    const error = expectCode(() => calculateDetailedPricing(makeInput({ transformedVolume: Number.NaN })), 'missing_params');
    assert.match(error.message, /transformedVolume/u);
  });

  test('công thức chọn Margin chưa hỗ trợ ⇒ chặn thay vì âm thầm tính Markup', () => {
    expectCode(
      () => calculateDetailedPricing(makeInput({ customPricingConfig: { ...FORMULA, profitMode: 'margin' } })),
      'profit_mode_margin_unsupported',
    );
  });

  test('đủ thông số ⇒ tính được: tier exact_slice, giá làm tròn 1.000đ, có chiết khấu theo lô', () => {
    // Vì sao: một happy-path tối thiểu để chứng minh guard không chặn nhầm dữ liệu hợp lệ.
    const result = calculateDetailedPricing(makeInput());
    assert.equal(result.tier, 'exact_slice');
    assert.deepEqual(result.manualReviewReasons, []);
    assert.ok(result.breakdown.costPrice > 0, 'giá vốn phải > 0');
    assert.equal(result.breakdown.materialCostPerGram, 0.6);
    assert.equal(result.breakdown.finalSellingPriceRounded % 1000, 0, 'giá bán phải là bội số 1.000đ');
    assert.equal(result.volumeDiscount?.discountPercent, 15); // 10 sản phẩm ⇒ bậc 10–24
    assert.equal(result.volumeDiscount?.totalAfterDiscount, result.volumeDiscount!.discountedUnitPrice * 10);
  });
});

describe('pricingEngine — compute3SidedOrderFinancialSplit (chia 3 bên)', () => {
  test('đơn số: creator 90%, nền tảng giữ phần còn lại sau phí cổng', () => {
    const split = compute3SidedOrderFinancialSplit({
      orderId: 'o1',
      orderNumber: 'ORD-1',
      orderType: 'digital',
      grossAmount: 1_000_000,
      basePartPrice: 0,
      workshopCostPrice: 0,
      customPricingConfig: FORMULA,
    });
    assert.equal(split.paymentGatewayFee, 25_000); // 2,5%
    assert.equal(split.creatorRoyalty, 900_000);
    assert.equal(split.workshopPayout, 0);
    assert.equal(split.platformTakeRate, 75_000);
    assert.equal(split.escrowStatus, 'holding');
    assert.ok(Number.isFinite(Date.parse(split.escrowReleaseDate)));
  });

  test('đơn vật lý: chia đủ 4 phần và tổng luôn bằng gross', () => {
    const split = compute3SidedOrderFinancialSplit({
      orderId: 'o2',
      orderNumber: 'ORD-2',
      orderType: 'physical',
      grossAmount: 2_000_000,
      basePartPrice: 1_000_000,
      quantity: 2,
      volumeDiscountPercent: 10,
      rushSurcharge: 100_000,
      personalizationFee: 50_000,
      workshopCostPrice: 800_000,
      customPricingConfig: FORMULA,
    });
    assert.equal(split.paymentGatewayFee, 50_000);
    assert.equal(split.creatorRoyalty, 95_000); // 2tr × 0.95 × 5%
    assert.equal(split.workshopPayout, 930_000); // 800k + 80% × 100k + 50k
    assert.equal(split.platformTakeRate, 925_000);
    assert.equal(
      split.paymentGatewayFee + split.creatorRoyalty + split.workshopPayout + split.platformTakeRate,
      split.grossAmount,
      'không được mất/đẻ thêm đồng nào khi chia',
    );
  });

  test('thiếu cấu hình công thức ⇒ no_formula_config', () => {
    expectCode(
      () =>
        compute3SidedOrderFinancialSplit({
          orderId: 'o3',
          orderNumber: 'ORD-3',
          orderType: 'digital',
          grossAmount: 100_000,
          basePartPrice: 0,
          workshopCostPrice: 0,
          customPricingConfig: undefined,
        }),
      'no_formula_config',
    );
  });
});
