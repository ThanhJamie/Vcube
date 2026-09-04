/**
 * ==============================================================================
 * VCUBE INDUSTRIAL 3D PRINTING - TEST PRICING & SECURITY LAYER
 * Test File: test-pricing.ts
 * Description: Automated test runner for Inkiri Cost Engine v3.4, HMAC SHA-256
 *              quote signing, anti-tamper verification, and WorkshopService CRUD.
 * ==============================================================================
 */

import { PricingEngineService, DEFAULT_PRICING_GLOBAL_SETTINGS } from './src/backend/services/pricingEngineService';
import { QuoteVerifier } from './src/backend/services/quoteVerifier';
import { WorkshopService } from './src/backend/services/workshopService';
import { InkiriCalculationInput } from './src/types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (detail) console.error(`         Detail: ${detail}`);
  }
}

async function runAllTests() {
  console.log('====================================================================');
  console.log('VCUBE DATA & SECURITY LAYER - INKIRI v3.4 ENGINE & SECURITY TEST');
  console.log('====================================================================\n');

  // ----------------------------------------------------------------------------
  // SUITE 1: INKIRI v3.4 FORMULA SPECIFICATION VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('>>> TEST SUITE 1: Công thức Inkiri v3.4 Mục 0 Chuẩn Xác');

  // Input model: Bambu Lab X1C, PLA Tough, 3.5 print hours, 0.5 post hours
  const baseInput: InkiriCalculationInput = {
    printHours: 3.5,
    postProcessingHours: 0.5,
    setupHours: 0.2,
    machine: {
      avgPowerKW: 0.18,
      purchasePrice: 36000000,
      lifetimeHours: 8000,
      maintenanceCostPerHour: 1500
    },
    material: {
      grams: 120,
      pricePerKg: 320000
    },
    accessories: [
      { name: 'Heat-set Inserts M3', usedQty: 4, packQty: 100, packPrice: 65000 },
      { name: 'Neodymium Magnet 6x3', usedQty: 2, packQty: 50, packPrice: 85000 }
    ],
    customCosts: 5000,
    globalSettings: {
      electricityRateVndKwh: 2850,
      defaultLaborRateVndHour: 65000,
      defaultScrapRatePercent: 5,
      profitMode: 'Markup',
      defaultProfitPercent: 35,
      overheadMonthlyCost: 15000000,
      avgProductsSoldPerMonth: 300,
      enableAccessoriesPricing: true,
      enableAdvancedOverhead: true,
      enableMarketplaceFeeMode: false
    }
  };

  const res1 = PricingEngineService.calculateInkiriCost(baseInput);

  // 1.1 Khấu hao máy/h = 36,000,000 / 8,000 = 4,500 VND/h
  assert(res1.depreciationPerHour === 4500, 'Khấu hao máy/h = Giá máy / Tuổi thọ (36tr / 8000h = 4,500 đ/h)', `Got: ${res1.depreciationPerHour}`);

  // 1.2 Điện/h = 0.18 kW * 2,850 VND/kWh = 513 VND/h
  assert(res1.electricityPerHour === 513, 'Điện/h = kW * Giá điện (0.18 kW * 2,850 đ = 513 đ/h)', `Got: ${res1.electricityPerHour}`);

  // 1.3 Chi phí máy = (4500 + 513 + 1500) * 3.5h = 6513 * 3.5 = 22,796 VND
  const expectedMachineCost = Math.round((4500 + 513 + 1500) * 3.5);
  assert(res1.machineCost === expectedMachineCost, `Chi phí máy = (Khấu hao + Điện + Bảo trì) * Giờ in (${expectedMachineCost} đ)`, `Got: ${res1.machineCost}`);

  // 1.4 Chi phí nhựa (single material): 120g / 1000 * 320,000 = 38,400 VND
  assert(res1.materialCost === 38400, 'Chi phí nhựa đơn = (120g / 1000) * 320,000 đ = 38,400 đ', `Got: ${res1.materialCost}`);

  // 1.5 Multi-material sum: 80g PLA (320k/kg) + 25g PVA support (750k/kg) = 25,600 + 18,750 = 44,350 VND
  const multiMatInput: InkiriCalculationInput = {
    ...baseInput,
    materials: [
      { materialName: 'PLA Tough', grams: 80, pricePerKg: 320000 },
      { materialName: 'PVA Soluble Support', grams: 25, pricePerKg: 750000 }
    ]
  };
  const resMultiMat = PricingEngineService.calculateInkiriCost(multiMatInput);
  const expectedMultiCost = Math.round((80 / 1000) * 320000) + Math.round((25 / 1000) * 750000);
  assert(resMultiMat.materialCost === expectedMultiCost, `Chi phí nhựa đa vật liệu multi-material sum = ${expectedMultiCost} đ (80g PLA + 25g PVA)`, `Got: ${resMultiMat.materialCost}`);

  // 1.6 Nhân công: Tổng thời gian = 3.5 + 0.5 + 0.2 = 4.2h * 65,000 = 273,000 VND
  const expectedLaborCost = Math.round((3.5 + 0.5 + 0.2) * 65000);
  assert(res1.laborCost === expectedLaborCost, `Chi phí nhân công = 4.2h * 65,000 đ/h = ${expectedLaborCost} đ`, `Got: ${res1.laborCost}`);

  // 1.7 Phụ kiện: (4/100 * 65,000) + (2/50 * 85,000) = 2,600 + 3,400 = 6,000 VND
  const expectedAccCost = Math.round((4 / 100) * 65000) + Math.round((2 / 50) * 85000);
  assert(res1.accessoriesCost === expectedAccCost, `Chi phí phụ kiện = 4 ốc cấy + 2 nam châm = ${expectedAccCost} đ`, `Got: ${res1.accessoriesCost}`);

  // 1.8 Phân bổ overhead: 15,000,000 / 300 = 50,000 VND/sản phẩm
  assert(res1.allocatedOverhead === 50000, 'Phân bổ overhead = 15tr / 300 sp = 50,000 đ/sp', `Got: ${res1.allocatedOverhead}`);

  // 1.9 Chi phí thô (rawBaseCost) = machine + material + labor + accessories + overhead + custom
  const expectedRaw = res1.machineCost + res1.materialCost + res1.laborCost + res1.accessoriesCost + res1.allocatedOverhead + 5000;
  assert(res1.rawBaseCost === expectedRaw, `Chi phí thô (Raw Base Cost) = ${expectedRaw} đ`, `Got: ${res1.rawBaseCost}`);

  // 1.10 Dự phòng in hỏng % (Scrap reserve) = 5% của rawBaseCost
  const expectedScrap = Math.round(expectedRaw * 0.05);
  assert(res1.scrapReserveCost === expectedScrap, `Dự phòng in hỏng (5% Scrap reserve) = ${expectedScrap} đ`, `Got: ${res1.scrapReserveCost}`);
  assert(res1.finalCost === expectedRaw + expectedScrap, `Tổng giá vốn thành phẩm Final Cost = ${expectedRaw + expectedScrap} đ`);

  // 1.11 So sánh Markup vs Margin:
  // Markup 35%: Selling = FinalCost * (1 + 0.35)
  const expectedMarkupSelling = Math.round(res1.finalCost * 1.35);
  assert(res1.sellingPricePreFee === expectedMarkupSelling, `Giá bán theo Markup (+35% trên vốn) = ${expectedMarkupSelling} đ`, `Got: ${res1.sellingPricePreFee}`);

  // Margin 35%: Selling = FinalCost / (1 - 0.35)
  const marginInput: InkiriCalculationInput = {
    ...baseInput,
    globalSettings: {
      ...baseInput.globalSettings,
      profitMode: 'Margin',
      defaultProfitPercent: 35
    }
  };
  const resMargin = PricingEngineService.calculateInkiriCost(marginInput);
  const expectedMarginSelling = Math.round(resMargin.finalCost / (1 - 0.35));
  assert(resMargin.sellingPricePreFee === expectedMarginSelling, `Giá bán theo Margin (35% biên lợi nhuận trên doanh thu) = ${expectedMarginSelling} đ`, `Got: ${resMargin.sellingPricePreFee}`);
  assert(resMargin.sellingPricePreFee > res1.sellingPricePreFee, 'Kiểm chứng Margin luôn cho giá bán cao hơn Markup cùng % (đúng nguyên lý kế toán)');

  // 1.12 Phí sàn (Marketplace fee mode): 8% fee + 5000 VND fixed fee
  const marketplaceInput: InkiriCalculationInput = {
    ...baseInput,
    globalSettings: {
      ...baseInput.globalSettings,
      enableMarketplaceFeeMode: true,
      marketplaceFeePercent: 8,
      marketplaceFixedFeeVnd: 5000
    }
  };
  const resMarketplace = PricingEngineService.calculateInkiriCost(marketplaceInput);
  const expectedMarketplaceSelling = Math.round((resMarketplace.sellingPricePreFee + 5000) / (1 - 0.08));
  assert(resMarketplace.finalSellingPrice === expectedMarketplaceSelling, `Giá bán bao gồm phí sàn (+5k fixed, 8% commission) = ${expectedMarketplaceSelling} đ`, `Got: ${resMarketplace.finalSellingPrice}`);
  assert(resMarketplace.marketplaceFeeAmount === expectedMarketplaceSelling - resMarketplace.sellingPricePreFee, 'Phí sàn được tính chính xác = FinalSelling - PreFee');

  // 1.13 Dual Quote Output: Customer Quote vs Internal BOM
  const dualQuote = PricingEngineService.generateDualQuote(res1);
  assert(dualQuote.customerQuote.unitPrice === res1.finalSellingPrice, 'Dual Quote Customer Unit Price khớp với Final Selling Price');
  assert(dualQuote.internalQuote.rawCost === res1.rawBaseCost, 'Dual Quote Internal Raw Cost khớp');
  assert(dualQuote.customerQuote.summary.length === 3, 'Customer quote gồm 3 hạng mục trong suốt');

  console.log('\n--------------------------------------------------------------------');
  console.log('>>> TEST SUITE 2: HMAC SHA-256 Token Signing & Anti-Tamper Security');
  console.log('--------------------------------------------------------------------');

  // 2.1 Ký hợp lệ từ calculateAndSignQuote
  const signedOutput = await PricingEngineService.calculateAndSignQuote({
    input: baseInput,
    workpieceMeta: {
      volumeCm3: 45.5,
      weightGrams: 56.4,
      materialId: 'wmat_pla_tough',
      printerId: 'wm_bambu_x1c_01',
      quantity: 2
    }
  });

  assert(Boolean(signedOutput.signedToken.signature), 'Tạo chữ ký HMAC SHA-256 thành công');
  assert(signedOutput.signedToken.payload.unitPrice === res1.finalSellingPrice, 'Đơn giá trong payload khớp chuẩn xác');
  assert(signedOutput.signedToken.payload.totalPrice === res1.finalSellingPrice * 2, 'Tổng giá 2 chiếc khớp chuẩn xác');

  // 2.2 Xác minh token nguyên bản hợp lệ 100%
  const verifyResult = await QuoteVerifier.verifyQuoteSignature(
    signedOutput.signedToken,
    signedOutput.signedToken.payload.totalPrice,
    {
      volumeCm3: 45.5,
      materialId: 'wmat_pla_tough',
      printerId: 'wm_bambu_x1c_01'
    }
  );
  assert(verifyResult.isValid === true, 'Xác minh token hợp lệ: THÀNH CÔNG (Pass 100%)', verifyResult.reason);

  // 2.3 TAMPER TEST 1: Kẻ gian can thiệp giảm giá trong Payload
  const tamperedPriceToken = JSON.parse(JSON.stringify(signedOutput.signedToken));
  tamperedPriceToken.payload.unitPrice = 10000; // Hạ giá xuống 10,000 VND
  tamperedPriceToken.payload.totalPrice = 20000;
  const tamperPriceResult = await QuoteVerifier.verifyQuoteSignature(tamperedPriceToken);
  assert(tamperPriceResult.isValid === false, 'Phát hiện can thiệp giá (Tampered Price): BỊ CHẶN TUYỆT ĐỐI');

  // 2.4 TAMPER TEST 2: Kẻ gian can thiệp đổi số lượng
  const tamperedQtyToken = JSON.parse(JSON.stringify(signedOutput.signedToken));
  tamperedQtyToken.payload.quantity = 10; // Thay đổi từ 2 lên 10
  const tamperQtyResult = await QuoteVerifier.verifyQuoteSignature(tamperedQtyToken);
  assert(tamperQtyResult.isValid === false, 'Phát hiện can thiệp số lượng (Tampered Quantity): BỊ CHẶN TUYỆT ĐỐI');

  // 2.5 TAMPER TEST 3: Kẻ gian can thiệp đổi vật liệu
  const tamperedMatToken = JSON.parse(JSON.stringify(signedOutput.signedToken));
  tamperedMatToken.payload.materialId = 'wmat_resin_expensive';
  const tamperMatResult = await QuoteVerifier.verifyQuoteSignature(tamperedMatToken);
  assert(tamperMatResult.isValid === false, 'Phát hiện can thiệp vật liệu (Tampered Material): BỊ CHẶN TUYỆT ĐỐI');

  // 2.6 TAMPER TEST 4: Kẻ gian can thiệp đổi thể tích phôi
  const tamperedVolToken = JSON.parse(JSON.stringify(signedOutput.signedToken));
  tamperedVolToken.payload.volumeCm3 = 120.0;
  const tamperVolResult = await QuoteVerifier.verifyQuoteSignature(tamperedVolToken);
  assert(tamperVolResult.isValid === false, 'Phát hiện can thiệp thể tích phôi in (Tampered Volume): BỊ CHẶN TUYỆT ĐỐI');

  // 2.7 TAMPER TEST 5: Kẻ gian giả mạo chữ ký HMAC
  const tamperedSigToken = JSON.parse(JSON.stringify(signedOutput.signedToken));
  tamperedSigToken.signature = 'deadbeef1234567890abcdefdeadbeef1234567890abcdefdeadbeef12345678';
  const tamperSigResult = await QuoteVerifier.verifyQuoteSignature(tamperedSigToken);
  assert(tamperSigResult.isValid === false, 'Chữ ký HMAC giả mạo (Fake Signature): BỊ CHẶN TUYỆT ĐỐI');

  // 2.8 EXPIRATION TEST: Token hết hạn sau 30 phút (TTL Expired)
  const expiredToken = JSON.parse(JSON.stringify(signedOutput.signedToken));
  expiredToken.payload.expiresAt = Date.now() - 1000; // Hết hạn 1 giây trước
  const expiredResult = await QuoteVerifier.verifyQuoteSignature(expiredToken);
  assert(expiredResult.isValid === false, 'Token báo giá quá hạn 30 phút (TTL Expired): BỊ TỪ CHỐI BẢO MẬT');

  console.log('\n--------------------------------------------------------------------');
  console.log('>>> TEST SUITE 3: WorkshopService CRUD & LocalStorage Fallback');
  console.log('--------------------------------------------------------------------');

  // 3.1 Workshop Profiles
  const profiles = await WorkshopService.getWorkshopProfiles();
  assert(profiles.length >= 3, `Đọc danh sách xưởng in thành công (${profiles.length} xưởng)`);

  const saveProfileRes = await WorkshopService.saveWorkshopProfile({
    id: 'ws_test_autogen',
    workshopName: 'Xưởng In Thực Nghiệm Hitech',
    address: 'Khu CNC Hòa Lạc, Hà Nội',
    region: 'Bắc',
    totalMachines: 4,
    activeMachinesNow: 3,
    verifiedStatus: 'Verified'
  });
  assert(saveProfileRes.success === true, 'Thêm mới hồ sơ xưởng thành công');

  const fetchedProfile = await WorkshopService.getWorkshopProfileById('ws_test_autogen');
  assert(fetchedProfile?.workshopName === 'Xưởng In Thực Nghiệm Hitech', 'Truy vấn xưởng theo ID thành công');

  // 3.2 Workshop Machines & Status Update
  const machines = await WorkshopService.getWorkshopMachines();
  assert(machines.length >= 5, `Đọc danh sách máy in thành công (${machines.length} máy)`);

  const saveMachineRes = await WorkshopService.saveWorkshopMachine({
    id: 'wm_test_k1',
    workshopId: 'ws_test_autogen',
    machineName: 'Creality K1 High Speed Lab #09',
    machineType: 'FDM',
    avgPowerKW: 0.22,
    purchasePrice: 18000000,
    lifetimeHours: 7000,
    status: 'Free'
  });
  assert(saveMachineRes.success === true, 'Thêm mới máy in thành công');

  const updateStatusRes = await WorkshopService.updateMachineStatus('wm_test_k1', 'Busy', 'JOB-TEST-001');
  assert(updateStatusRes.success === true, 'Cập nhật trạng thái máy in (Busy kèm mã job) thành công');

  const updatedMachine = await WorkshopService.getWorkshopMachineById('wm_test_k1');
  assert(updatedMachine?.status === 'Busy' && updatedMachine.currentJobId === 'JOB-TEST-001', 'Kiểm tra trạng thái máy đã đổi sang Busy');

  // 3.3 Workshop Materials & Inventory Log Trigger Logic
  const materials = await WorkshopService.getWorkshopMaterials();
  assert(materials.length >= 4, `Đọc danh sách vật liệu thành công (${materials.length} loại)`);

  const testMatId = 'wmat_test_petg';
  await WorkshopService.saveWorkshopMaterial({
    id: testMatId,
    workshopId: 'ws_test_autogen',
    materialName: 'PETG Carbon Fiber 1.75mm',
    materialType: 'PETG',
    pricePerKg: 550000,
    colorHex: '#111827',
    density: 1.25,
    stockStatus: 'Tracking',
    currentStockGrams: 2000,
    lowStockThresholdGrams: 1000
  });

  // Action Import: Nhập thêm 3000g với giá mới 520k/kg
  await WorkshopService.addInventoryLog({
    materialId: testMatId,
    action: 'Import',
    grams: 3000,
    pricePerKgAtTime: 520000,
    supplier: 'eSUN Vietnam',
    batchCode: 'LOT-PETG-CF-01',
    note: 'Nhập lô hàng thử nghiệm'
  });

  let checkMat = await WorkshopService.getWorkshopMaterialById(testMatId);
  assert(checkMat?.currentStockGrams === 5000, `Log Import tự động tăng tồn kho (2000g + 3000g = 5000g)`, `Got: ${checkMat?.currentStockGrams}`);
  assert(checkMat?.pricePerKg === 520000, `Log Import tự động cập nhật giá nhập mới nhất (520,000 đ/kg)`, `Got: ${checkMat?.pricePerKg}`);

  // Action Export: Xuất 4500g -> Còn 500g (dưới ngưỡng 1000g -> status LowStock)
  await WorkshopService.addInventoryLog({
    materialId: testMatId,
    action: 'Export',
    grams: 4500,
    note: 'Xuất in chi tiết vỏ hộp drone'
  });

  checkMat = await WorkshopService.getWorkshopMaterialById(testMatId);
  assert(checkMat?.currentStockGrams === 500, `Log Export tự động trừ tồn kho (5000g - 4500g = 500g)`, `Got: ${checkMat?.currentStockGrams}`);
  assert(checkMat?.stockStatus === 'LowStock', `Tồn kho dưới ngưỡng 1000g tự động đổi thành LowStock`, `Got: ${checkMat?.stockStatus}`);

  // Action Adjustment: Điều chỉnh kiểm kê về 0g -> OutOfStock
  await WorkshopService.addInventoryLog({
    materialId: testMatId,
    action: 'Adjustment',
    grams: 0,
    note: 'Hết cuộn dở'
  });

  checkMat = await WorkshopService.getWorkshopMaterialById(testMatId);
  assert(checkMat?.currentStockGrams === 0, 'Log Adjustment tự động gán lượng kiểm kê 0g', `Got: ${checkMat?.currentStockGrams}`);
  assert(checkMat?.stockStatus === 'OutOfStock', 'Tồn kho 0g tự động chuyển OutOfStock', `Got: ${checkMat?.stockStatus}`);

  // 3.4 Pricing Global Settings
  const settings = await WorkshopService.getPricingGlobalSettings();
  assert(settings.electricityRateVndKwh === 2850, 'Đọc Pricing Global Settings mặc định thành công (2,850 đ/kWh)');

  await WorkshopService.savePricingGlobalSettings({
    electricityRateVndKwh: 2950,
    defaultProfitPercent: 40
  });

  const updatedSettings = await WorkshopService.getPricingGlobalSettings();
  assert(updatedSettings.electricityRateVndKwh === 2950 && updatedSettings.defaultProfitPercent === 40, 'Cập nhật Pricing Global Settings thành công');

  // Cleanup test entities
  await WorkshopService.deleteWorkshopProfile('ws_test_autogen');
  await WorkshopService.deleteWorkshopMachine('wm_test_k1');
  await WorkshopService.deleteWorkshopMaterial(testMatId);

  console.log('\n====================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  if (passedTests === totalTests) {
    console.log('TOÀN BỘ CÔNG THỨC INKIRI V3.4 VÀ BẢO MẬT HMAC SHA-256 ĐẠT 100%!');
  }
  console.log('====================================================================\n');
}

runAllTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});