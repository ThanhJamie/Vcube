export interface Product {
  id: string;
  name: string;
  category: string;
  designer: string;
  designerAvatar?: string;
  isPro?: boolean;
  isVerified?: boolean;
  pricePhysical: number;
  priceDigital: number;
  images: string[];
  description: string;
  features: string[];
  specs: {
    dimensions: string;
    weight: string;
    resolution: string;
    infillDefault: string;
    technology: string;
  };
  supportedMaterials: string[];
  colors: { name: string; hex: string; available: boolean }[];
  tags: string[];
  badge?: string; // "MỚI", "BÁN CHẠY", "CÁ NHÂN HÓA", "HOT"
  rating: number;
  reviewsCount: number;
  printsCount: number;
  printTime: string;
  batchProgress?: { current: number; total: number; targetDate: string };
  isCustomizable?: boolean;
  licenseType?: 'Standard' | 'Commercial' | 'Exclusive';
  status?: ProductStatus | 'Published' | 'Draft' | 'Archived' | 'Under Review' | 'Out of Stock';
  productionReadiness?: 'ready_to_print' | 'missing_profile' | 'cad_review_needed';
  sku?: string;
  salesCount?: number;
  cadFileUrl?: string;
  cadFormat?: 'STL' | 'STEP' | '3MF';
  fileSizeBytes?: number;
  thumbnailUrl?: string;
}

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface CartItem {
  id: string;
  productId: string;
  type: 'physical' | 'digital';
  name: string;
  designer: string;
  image: string;
  price: number;
  quantity: number;
  material?: string;
  color?: string;
  colorHex?: string;
  dimensions?: string;
  resolution?: string;
  customText?: string;
  customFont?: string;
  customFontSize?: number;
  uploadedLogoName?: string;
  fileFormat?: string;
  licenseType?: string;
  selectedAccessories?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
}

/**
 * Trạng thái thanh toán của đơn. `awaiting_payment` = đã tạo đơn nhưng CHƯA nhận
 * được tiền; chỉ một cổng thanh toán đã kiểm chứng hoặc người vận hành mới được
 * chuyển sang `paid` (xem `docs/design/data-honesty.md` PC-03).
 */
export type OrderPaymentStatus = 'awaiting_payment' | 'paid' | 'cod' | 'cancelled' | 'unpaid';

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  estimatedDelivery: string;
  status: 'pending_payment' | 'processing' | 'printing' | 'post_processing' | 'packaging' | 'shipping' | 'completed' | 'cancelled';
  /** null = chưa có dữ liệu từ xưởng/MES. UI phải render `—`, không được mặc định. */
  statusStageIndex: number | null; // 0 to 7
  /** null = chưa có dữ liệu từ máy in. UI phải render `—`, không mặc định 64. */
  layerProgress?: number | null;
  timeRemaining?: string | null;
  customerType?: 'guest' | 'registered';
  secureAccessToken?: string;
  items: {
    id: string;
    name: string;
    designer: string;
    type: 'physical' | 'digital';
    image: string;
    price: number;
    quantity: number;
    material?: string;
    color?: string;
    resolution?: string;
    infill?: string;
    license?: string;
    version?: string;
    customText?: string;
  }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    district: string;
    note?: string;
  };
  carrier: {
    name: string;
    trackingCode: string;
  };
  payment: {
    method: string;
    /** '' = chưa ghi nhận thời điểm thanh toán. UI render `—`. */
    paidDate: string;
    subtotalPhysical: number;
    subtotalDigital: number;
    shippingFee: number;
    discount: number;
    /** VAT tách riêng, KHÔNG gộp vào `total` (giá niêm yết chưa gồm VAT). */
    tax: number;
    /** Tỉ lệ VAT đã áp dụng, ví dụ 0.08. 0 = không xuất hoá đơn VAT. */
    vatRate?: number;
    total: number;
    isPaid?: boolean;
    status?: OrderPaymentStatus;
  };
}

/** Một dòng VAT dùng chung cho cart / checkout / order summary / hoá đơn. */
export interface VatLine {
  /** Tỉ lệ VAT, ví dụ 0.08. */
  rate: number;
  /** Tiền hàng trước VAT (chưa gồm VAT, đã trừ giảm giá). */
  taxableAmount: number;
  /** Tiền VAT làm tròn. */
  amount: number;
  /** Tổng phải trả = taxableAmount + amount. */
  total: number;
}

export interface DigitalAsset {
  id: string;
  name: string;
  designer: string;
  isVerified?: boolean;
  format: 'STL' | '3MF' | 'OBJ' | 'STEP';
  version: string;
  license: 'Personal' | 'Commercial' | 'Exclusive';
  purchaseDate: string;
  downloadsCount: number;
  maxDownloads: string;
  fileSize: string;
  image: string;
  hasUpdate?: boolean;
  model3DType?: 'gear' | 'box' | 'arch' | 'skull';
  /**
   * Đường dẫn trong bucket Supabase Storage `cad-files` do dữ liệu ĐÃ MUA quyết định.
   * undefined = chưa có bảng `order_files` nên không suy ra được ⇒ UI phải nói rõ
   * "chưa hỗ trợ tải trực tiếp", KHÔNG được hiện link giả.
   */
  storagePath?: string;
}

export interface FilamentPaletteItem {
  index: number; // 1-indexed (AMS Slot 1, 2, 3, 4...)
  colorHex: string;
  name: string;
  materialType: string; // e.g. "PLA", "PETG", "TPU", "ABS", "PA-CF"
  vendor?: string; // e.g. "Bambu Lab", "PolyLite", "eSUN"
  density?: number; // g/cm3 e.g. 1.24
  usedGrams?: number; // e.g. 18.5g
  usedMeters?: number; // e.g. 6.2m
  costPerKg?: number; // VND / kg
}

export interface PlateInfo {
  index: number; // 1-indexed (1, 2, 3...)
  name: string; // "Plate 1", "Bàn 1: Thân chính", etc.
  predictionSeconds?: number;
  predictionFormatted?: string; // "1h 45m"
  filamentGrams?: number; // 38.5g
  filamentMeters?: number; // 12.8m
  partCount?: number;
  partIds?: string[];
  dimensions?: { x: number; y: number; z: number };
  bedType?: string; // "Textured PEI Plate", "Smooth PEI", "High Temp Plate"
  nozzleTemp?: number; // e.g. 220
  bedTemp?: number; // e.g. 55
  isCurrent?: boolean;
}

export interface SlicerPresetInfo {
  software: string; // "Bambu Studio" | "OrcaSlicer" | "PrusaSlicer" | "Cura" | "3MF Standard"
  printerModel?: string; // "Bambu Lab X1-Carbon 0.4 nozzle", "P1S", "A1 mini", "Prusa MK4"
  nozzleDiameter?: number; // 0.4 mm
  layerHeight?: number; // 0.20 mm
  initialLayerHeight?: number; // 0.20 mm
  infillDensity?: string; // "15%"
  infillPattern?: string; // "gyroid", "grid", "honeycomb"
  wallLoops?: number; // 2
  topShellLayers?: number; // 4
  bottomShellLayers?: number; // 3
  printSpeed?: number; // mm/s
  estimatedPrintTimeFormatted?: string; // "1h 45m"
  estimatedPrintTimeSeconds?: number;
  totalFilamentGrams?: number;
  totalFilamentMeters?: number;
  plateCount?: number;
  activePlateIndex?: number;
  plates?: PlateInfo[];
  palettes: FilamentPaletteItem[];
}

export interface ModelPart {
  id: string;
  name: string;
  color: string;
  colorHex: string;
  materialId?: string;
  visible: boolean;
  triangleCount: number;
  volumeCm3: number;
  extruderIndex: number; // 1 to 4
  plateIndex?: number; // 1-indexed (Plate 1, Plate 2...)
}

export interface ValidationIssue {
  code: 'THIN_WALL' | 'OVERHANG' | 'BED_FIT' | 'NON_MANIFOLD' | 'INVERTED_NORMALS' | 'ZIP_CHECK';
  severity: 'high' | 'medium' | 'low' | 'info';
  message: string;
  details?: string;
}

export interface PrintabilityAnalysis {
  /**
   * R4 (data-honesty MP-04): `null` = **CHƯA CHẤM ĐIỂM vì THIẾU SỐ ĐO** — KHÁC HẲN `0`
   * (đã chấm và được 0 điểm). Bộ đọc lưới trả `null` cho mọi phép đo khi lưới vượt trần
   * phân tích (`meshParser.MAX_TOPOLOGY_TRIANGLES`), khi đó KHÔNG có gì để chấm.
   * Tầng hiển thị in `—` + "Chưa chấm điểm" (kèm lý do), KHÔNG in một con số, và `null`
   * KHÔNG được làm thay đổi giá.
   */
  printabilityScore: number | null; // 0..100 khi đã chấm; `null` = thiếu số đo
  /** R4: `null` đi cùng `printabilityScore === null` — chưa đủ số đo để xếp mức. */
  level: 'good' | 'warning' | 'critical' | null;
  issues: ValidationIssue[];
  recommendedOrientation: string;
  bedFit: boolean;
  /**
   * R2 (data-honesty MP-07): `null` = CHƯA ĐO ĐƯỢC góc nhô (khác hẳn `0` = đo được và bằng 0).
   * Trước đây `number` bắt buộc nên tầng view phải ép kiểu cục bộ để biểu diễn "chưa đo".
   */
  overhangPercentage: number | null;
}

export interface TransformState {
  scaleUniform: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  unit: 'mm' | 'inch';
  layFlat: boolean;
  centered: boolean;
}

export interface MeasurementResult {
  p1: { x: number; y: number; z: number };
  p2: { x: number; y: number; z: number };
  distanceMm: number;
}

export interface MaterialProfile {
  id: string;
  name: string;
  brand?: string;
  /**
   * Đợt Q: các cột dưới đây là **nullable trong DB** (baseline đã gỡ default bịa) ⇒
   * `null` = CHƯA CẤU HÌNH, KHÁC HẲN `0`. Mọi nơi đọc PHẢI kiểm `Number.isFinite` trước khi
   * tính toán/hiển thị (engine sẽ CHẶN tính giá nếu thiếu — xem `pricingEngine`).
   */
  density: number | null; // g/cm3
  strength: string;
  heatResistance: string;
  flexibility: string;
  costPerKg: number | null; // VND/kg
  pricePerGram: number | null; // VND/g
  unitPriceMultiplier: number | null;
  spoolWeightGrams?: number | null;
  extruderTempMin?: number;
  extruderTempMax?: number;
  bedTemp?: number;
  colors: string[];
  desc: string;
  recommendedFor: string;
  inStock?: boolean;
  stockRollsCount?: number;
  /**
   * Đợt P (P3): phụ phí dự phòng in hỏng RIÊNG cho vật liệu này (%).
   * Thay cho luật cũ `id.includes('nylon' | 'resin' | 'pa-cf')` — luật đó nhận diện vật liệu
   * khó bằng CHUỖI CON TRONG `id`, nên trên nền tảng có id khác nó **im lặng không chạy**.
   * `null`/bỏ trống = KHÔNG cộng thêm gì (KHÔNG mượn số 4% của Inkiri).
   */
  failureExtraPercent?: number | null;
}

export interface AccessoryItem {
  id: string;
  name: string;
  nameEn?: string;
  category: 'keychain' | 'hardware' | 'fastener' | 'packaging' | 'bearing' | 'magnet' | 'electronic' | 'other';
  unit: string; // 'chiếc', 'bộ', 'cái', 'hộp', 'túi', 'cuộn'
  costPrice: number; // Giá vốn xưởng (VNĐ)
  sellingPrice: number; // Giá bán lẻ / tính vào báo giá (VNĐ)
  sku: string; // SKU quản lý kho
  stockCount: number; // Số lượng tồn kho thực tế
  lowStockThreshold: number | null; // Ngưỡng cảnh báo sắp hết hàng — `null` = chưa cấu hình
  warehouseLocation?: string; // Vị trí kệ kho (Kệ A1, Ngăn B3...)
  supplier?: string; // Nhà cung cấp
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  compatibleWith?: string[]; // Gợi ý ứng dụng: ['Móc khóa', 'Vỏ hộp IoT', 'Đồ gá', 'Mô hình robot']
}

export interface VolumeDiscountTier {
  minQty: number;
  maxQty?: number;
  discountPercent: number;
  label: string;
}

export interface InkiriCostFormulaConfig {
  // 1. Electricity / Điện năng
  /**
   * ⚠️ KHÔNG còn là nguồn giá trị (Đợt 9/R1 + Đợt P). Engine đọc giá điện từ
   * `pricing_global_settings.electricity_rate_vnd`; ô này chỉ còn để đọc được cấu hình cũ.
   * Ô nhập tương ứng trong /admin đã bị VÔ HIỆU + ghi rõ nguồn thật.
   */
  electricityRatePerKWh: number; // VND/kWh — không còn dùng để tính giá

  // 2. Labor & Operations / Nhân công kỹ thuật
  /** ⚠️ KHÔNG còn là nguồn giá trị: nguồn thật là `pricing_global_settings.labor_hourly_rate_vnd`. */
  laborHourlyRate: number; // VND/hour — không còn dùng để tính giá
  fileReviewLaborMinutes: number; // Kiểm tra slicing & mesh (phút)
  setupLaborMinutes: number; // Chuẩn bị máy, xịt keo (phút)
  supportRemovalMinutes: number; // Bóc support (phút)
  /** Đợt P (mới): phút bóc support khi đơn KHÔNG dùng support (trước đây cứng `2`). */
  noSupportRemovalMinutes?: number;
  postProcessingLaborMinutes: number; // Mài nhẵn / deburring (phút)
  qcLaborMinutes: number; // Đo kiểm kích thước (phút)
  packagingLaborMinutes: number; // Đóng gói (phút)

  // 3. Packaging & Consumables / Đóng gói & Vật tư phụ
  fixedPackagingCost: number; // VND/unit, e.g. 12000
  multiColorPackagingExtra: number; // VND/unit, e.g. 5000
  ipaSolventCost?: number; // VND/unit, e.g. 8000 Chi phí cồn IPA hoàn thiện & dung môi rửa
  defaultMachineDepreciationPerHour?: number; // VND/hour, e.g. 4375 Khấu hao máy in cơ sở theo giờ

  // 4. Overhead & Management / Mặt bằng & Chi phí quản lý chung
  overheadPerUnit: number; // VND/unit, e.g. 15000

  // 5. Failure Contingency / Dự phòng rủi ro in lỗi
  baseFailureReservePercent: number; // Dự phòng in hỏng cơ bản (%)
  lowPrintabilityExtraPercent: number; // Cộng thêm khi điểm khả in thấp (%)
  multiColorExtraPercent: number; // Cộng thêm khi in nhiều màu (%)
  /**
   * ⚠️ KHÔNG còn được engine đọc (Đợt P/P3). Luật "vật liệu khó" nay khai theo TỪNG vật liệu
   * qua `MaterialProfile.failureExtraPercent` — vì luật cũ nhận diện bằng chuỗi con trong `id`
   * nên không bao giờ chạy đúng trên nền tảng có id khác mà cũng không báo lỗi.
   */
  difficultMaterialExtraPercent?: number; // không còn dùng để tính giá (xem ghi chú trên)

  // 6. Pricing & Margins / Biên lợi nhuận & Chiết khấu
  /**
   * Đợt P (mới): `'markup'` = lãi trên giá vốn (công thức hiện tại), `'margin'` = lãi trên giá
   * bán. Engine hiện CHỈ có Markup — chọn `'margin'` sẽ bị CHẶN (`PricingUnavailableError`)
   * chứ không âm thầm tính bằng markup, vì đó là ĐỔI CÔNG THỨC (ngoài phạm vi đợt này).
   */
  profitMode?: 'markup' | 'margin';
  defaultMarkupPercent: number; // Tỷ lệ lợi nhuận mục tiêu (%)
  /**
   * ⚠️ KHÔNG còn được engine đọc (Đợt Q / #4). Phí nền tảng nay có MỘT nguồn duy nhất là
   * `pricing_global_settings.marketplace_fee_percent` (mục 0 trong /admin) — hai nguồn cho cùng
   * một con số là lỗi "hai nguồn sự thật". Giữ trường để đọc lại cấu hình cũ.
   */
  platformCommissionPercent?: number; // không còn dùng để tính giá
  paymentGatewayFeePercent: number; // %, e.g. 2.5%
  designerRoyaltyPercent: number; // %, e.g. 5%
  roundingRule: '1000' | '5000' | '10000' | 'none';
  /** Đợt P (mới): ngưỡng cảnh báo "đơn lớn" theo SỐ LƯỢNG (chiếc) — trước đây cứng `50`. */
  bulkOrderQuantityThreshold?: number;
  /** Đợt P (mới): ngưỡng cảnh báo "đơn lớn" theo SỐ TIỀN (đ) — trước đây cứng `15.000.000`. */
  bulkOrderAmountThresholdVnd?: number;

  // 7. Quantity Discounts / Chiết khấu theo số lượng
  volumeDiscounts: VolumeDiscountTier[];

  // 8. Customization & Addon Fees / Phí dịch vụ cá nhân hóa
  customEngravingFee?: number; // VND, e.g. 50000 (khắc tên / laser / đùn nổi)
  customLogoUploadFee?: number; // VND, e.g. 80000 (chèn logo vector)

  // 9. Delivery Package Lead Time Adjustments / Tùy chỉnh chiết khấu & phụ phí giao hàng
  economyDiscountPercent?: number; // %, e.g. 10% (Gói Tiết kiệm 5-7 ngày)
  expressRushSurchargePercent?: number; // %, e.g. 30% (Gói Hỏa tốc 24H)

  // 10. Slicing Model Constants / Hệ số tiêu hao phôi & tháp xả
  supportVolumeRatioPercent?: number; // %, e.g. 16% khối lượng support
  brimRaftGrams?: number; // Grams, e.g. 6g vành brim bám dính
  multiColorToolChangeMins?: number; // Phút, e.g. 1.5 phút/lần đổi màu AMS
  multiColorPurgeWasteGrams?: number; // Grams, e.g. 28g tháp xả mỗi màu thêm
  /**
   * Chi phí cơ sở cho bộ tính nhanh (đ).
   * ⚠️ CHỈ được `HomeView` đọc (`HomeView.tsx:128`), engine KHÔNG đọc. Ô nhập vẫn nằm ở
   * /admin vì nó ảnh hưởng con số khách nhìn thấy ở trang chủ.
   */
  fastEstimatorBaseOverhead?: number;
}

export interface PrinterProfile {
  id: string;
  name: string;
  brand: string;
  /** Đợt Q: nullable thật — `null` = CHƯA ĐO ĐƯỢC (xem `MaterialProfile`). */
  bedDimensions: { x: number | null; y: number | null; z: number | null } | null; // mm
  nozzleDiameter: number | null; // mm e.g. 0.4
  technology: 'FDM' | 'SLA' | 'SLS';
  powerKW: number | null; // Average power e.g. 0.18 kW
  acquisitionCost: number | null; // VND e.g. 35,000,000
  expectedLifetimeHours: number | null; // e.g. 8000 hours
  consumablesHourlyRate: number | null; // VND / hour (nozzle, plate, belt)
  hourlyRate: number | null; // VND per hour legacy/general
  maxPrintSpeedMmS?: number; // mm/s e.g. 500
  heatedBedMaxTemp?: number; // °C e.g. 120
  hasEnclosure?: boolean;
  hasAMS?: boolean;
  status: 'Idle' | 'Printing' | 'Maintenance';
}

export type QuoteTierType = 'quick_estimate' | 'exact_slice' | 'manual_review';

export interface DetailedCostBreakdown {
  // 3.1 Material
  modelGrams: number;
  supportGrams: number;
  brimRaftGrams: number;
  purgeGrams: number;
  totalFilamentGrams: number;
  materialCostPerGram: number;
  materialCost: number;

  // 3.2 Electricity
  printHours: number;
  averagePowerKW: number;
  electricityRatePerKWh: number;
  electricityCost: number;

  // 3.3 Machine Depreciation & Maintenance
  machineDepreciationCost: number;
  maintenanceAndConsumablesCost: number;
  machineOperatingCost: number;

  // 3.4 Labor
  fileReviewLaborMinutes: number;
  setupLaborMinutes: number;
  supportRemovalMinutes: number;
  postProcessingLaborMinutes: number;
  qcLaborMinutes: number;
  packagingLaborMinutes: number;
  totalLaborMinutes: number;
  laborHourlyRate: number;
  laborCost: number;

  // 3.5 Accessories & Packaging & IPA Finishing
  accessoriesCost: number; // Inserts, magnets, box, bubble wrap, labels
  ipaSolventCost?: number; // Chi phí cồn IPA hoàn thiện & dung môi rửa

  // 3.6 Overhead Allocation
  overheadPerUnit: number; // Rent, software, licenses, shop utilities

  // 3.7 Failure Reserve
  failureReserveRate: number; // e.g. 0.12 (12%)
  failureReserveCost: number;

  // 3.8 Base & Cost Price (Giá vốn)
  baseCost: number;
  costPrice: number; // Giá vốn xuất xưởng

  // 4. Selling Price & Fees (Markup vs Gross Margin & Reverse Fees)
  targetMarkupPercent: number; // e.g. 35%
  calculatedGrossMarginPercent: number; // e.g. 26%
  platformCommissionPercent: number; // 8%
  paymentGatewayFeePercent: number; // 2.5%
  designerRoyaltyPercent: number; // 5%
  fixedAdminFee: number;
  
  preFeeSellingPrice: number;
  finalSellingPrice: number; // Price with reverse fee calculation
  roundingAdjustment: number;
  finalSellingPriceRounded: number; // Clean integer VND (e.g. rounded to 1,000 VND)
}

export interface DeliveryPackageOption {
  tier: 'economy' | 'standard' | 'express';
  name: string;
  leadTimeDays: string;
  completionDate: string;
  pricePerUnit: number;
  totalPrice: number;
  description: string;
  isPopular?: boolean;
}

export interface MachineComparisonItem {
  printerId: string;
  printerName: string;
  technology: string;
  printTimeFormatted: string;
  printTimeHours: number;
  costPrice: number;
  sellingPrice: number;
  completionDate: string;
  riskLevel: 'Thấp' | 'Trung Bình' | 'Cảnh Báo';
  recommendationTag?: 'Rẻ Nhất' | 'Nhanh Nhất' | 'Lợi Nhuận Tối Đa' | 'Máy Sẵn Sàng';
}

export interface QuoteSnapshot {
  id: string;
  quoteNumber: string;
  createdAt: string;
  expiresAt: string; // 7 days validity
  tier: QuoteTierType;
  slicerVersion: string;
  profileVersion: string;
  formulaVersion: string;
  isLocked: boolean;
  manualReviewReasons?: string[];
  operatorOverride?: {
    originalPrice: number;
    overriddenPrice: number;
    reason: string;
    operatorName: string;
    overrideTimestamp: string;
  };
}

export interface AnalysisFile {
  id: string;
  fileName: string;
  fileSize: string;
  format: 'STL' | '3MF' | 'STEP' | 'OBJ';
  uploadDate: string;
  dimensions: { x: number; y: number; z: number }; // mm
  volume: number; // cm3
  surfaceArea: number; // cm2
  triangleCount: number;
  partsCount: number;
  parts: ModelPart[];
  /**
   * R2: các trường dưới đây là SỐ ĐO của bộ đọc lưới (`src/utils/meshParser.ts`).
   * `null` = CHƯA ĐO ĐƯỢC (ví dụ lưới vượt trần phân tích cạnh, hoặc không dò được chiều dày) —
   * KHÁC HẲN `0` = đã đo và bằng 0. Tầng hiển thị phải in "—"/"chưa đo", không được suy diễn.
   */
  isWatertight: boolean | null;
  nonManifoldEdges: number | null;
  invertedNormals: number | null;
  minWallThickness: number | null; // mm
  /** Số cạnh chỉ có 1 mặt (biên hở) — MP-10 tách riêng khỏi "pháp tuyến nghịch". */
  boundaryEdges?: number | null;
  recommendedTech: string;
  requiresSupport: boolean;
  printability: PrintabilityAnalysis;
  tag: string;
  status: 'Ready' | 'Needs Fix';
  modelType: 'gear' | 'drone' | 'box' | 'arch' | 'vase' | 'custom' | string;
  sha256Hash?: string;
  isUnitConfirmed?: boolean;
  customGeometry?: any;
  customObjectGroup?: any;
  slicerPreset?: SlicerPresetInfo;
  plates?: PlateInfo[];
  activePlateIndex?: number;
}

export interface CustomDesignMessage {
  id: string;
  sender: 'client' | 'designer';
  senderName: string;
  senderInitials: string;
  time: string;
  text: string;
  attachment?: {
    name: string;
    size: string;
    type: 'stl' | 'image' | 'step';
  };
  quote?: {
    amount: number;
    currency: string;
    description: string;
    status: 'draft' | 'sent' | 'accepted' | 'declined';
  };
}

export interface CustomDesignRequest {
  id: string;
  clientName: string;
  clientInitials: string;
  title: string;
  previewMessage: string;
  time: string;
  status: 'Pending' | 'In Progress' | 'Quoted' | 'Completed';
  unread: boolean;
  budget: string;
  deadline: string;
  serviceType: string;
  targetSpecs: {
    material?: string;
    /** Chỉ ghi khi khách/admin thực sự nêu; thiếu ⇒ để trống, KHÔNG bịa. */
    infill?: string;
    nozzle?: string;
  };
  referenceFiles: {
    name: string;
    type: 'image' | 'stl';
    url?: string;
  }[];
  messages: CustomDesignMessage[];
}

export interface PayoutTransaction {
  id: string;
  date: string;
  reference: string;
  method: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface ModerationProductItem {
  id: string;
  title: string;
  format: string;
  designer: string;
  isVerifiedDesigner: boolean;
  license: string;
  scale: string;
  material: string;
  price: number;
  image: string;
  status: 'PENDING' | 'APPROVED' | 'FLAGGED' | 'REVISED';
  flagReason?: string;
  autoCheckFailed?: boolean;
}

export interface DesignerApplication {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  status: 'Pending' | 'Verified' | 'Flagged' | 'Rejected';
  portfolioUrl: string;
  software: string[];
  bio: string;
  warningNote?: string;
  submissionDate: string;
}

export interface DisputeRecord {
  id: string;
  customer: string;
  designer: string;
  amount: number;
  status: 'UNDER REVIEW' | 'ESCALATED' | 'AWAITING INFO' | 'RESOLVED';
  isTopSeller?: boolean;
  isVerified?: boolean;
}

export interface DMCAReport {
  id: string;
  modelName: string;
  image: string;
  reporter: string;
  dateFiled: string;
  status: 'Pending Review' | 'Investigating' | 'Takedown Issued' | 'Dismissed';
}

export interface SiteContentConfig {
  // Top Announcement / Campaign
  announcementText: string;
  announcementActive: boolean;
  announcementBadge?: string;
  announcementActionText?: string;
  announcementActionTag?: string;

  // Hero Section
  heroBadge?: string;
  heroHeadline: string;
  heroHeadlineLine1?: string;
  heroHeadlineHighlight?: string;
  heroSubheadline: string;
  heroCtaQuoteText?: string;
  heroCtaCatalogText?: string;
  heroMetric1Label?: string;
  heroMetric1Value?: string;
  heroMetric2Label?: string;
  heroMetric2Value?: string;
  heroMetric3Label?: string;
  heroMetric3Value?: string;

  // 3-Step Workshop Workflow
  workflowBadge?: string;
  workflowTitle?: string;
  workflowStep1Title?: string;
  workflowStep1Desc?: string;
  workflowStep2Title?: string;
  workflowStep2Desc?: string;
  workflowStep3Title?: string;
  workflowStep3Desc?: string;

  // Live Fast Estimator
  estimatorBadge?: string;
  estimatorTitle?: string;
  estimatorSubtitle?: string;
  estimatorBenefit1?: string;
  estimatorBenefit2?: string;
  estimatorCtaText?: string;

  // Trust Partners & R&D Labs
  trustPartnersTitle?: string;
  trustPartnersList?: string[];

  // Facilities, Specifications & Shipping
  toleranceSpec: string;
  // ⚠️ `?` CÓ CHỦ Ý (data-honesty AT-06): phí ship và ngưỡng freeship là do chủ shop
  // cấu hình ở /admin → "Nội dung site". CHƯA TỪNG cấu hình ⇒ khoá VẮNG MẶT.
  // `undefined` = "chưa cấu hình" — KHÁC HẲN `0` = "miễn phí vận chuyển thật".
  // Khai bắt buộc `number` từng buộc thượng nguồn phải bịa 25.000 / 300.000 để thoả kiểu;
  // hai số bịa đó bị màn admin HIỂN THỊ như thể đã cấu hình rồi bị GHI vào
  // `site_content.settings` ngay khi admin sửa một ô bất kỳ.
  standardShippingFee?: number;
  freeShippingThreshold?: number;
  hotline: string;
  contactEmail: string;
  hanoiWorkshopAddress: string;
  hcmWorkshopAddress: string;

  // SEO & Metadata Management
  // ⚠️ VẮNG MẶT = CHƯA CẤU HÌNH (W3-A: cùng luật với phí ship ở trên): KHÔNG có giá trị
  // mặc định nào thay thế. Tầng hiển thị phải nói rõ "chưa cấu hình" (hoặc không phát thẻ
  // meta nào), TUYỆT ĐỐI không bịa tiêu đề, mô tả, ảnh OG, canonical hay JSON-LD.
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoOgImage?: string;
  seoCanonicalUrl?: string;
  seoRobotsIndex?: boolean;
  seoStructuredData?: string;

  // Custom 3D Model by Idea Section CMS
  customIdeaActive?: boolean;
  customIdeaBadge?: string;
  customIdeaTitle?: string;
  customIdeaSubtitle?: string;
  customIdeaCtaText?: string;
  customIdeaImageUrl?: string;
  customIdeaStep1Title?: string;
  customIdeaStep1Desc?: string;
  customIdeaStep2Title?: string;
  customIdeaStep2Desc?: string;
  customIdeaStep3Title?: string;
  customIdeaStep3Desc?: string;
}

export type UserRole = 'customer' | 'designer' | 'admin' | 'lab';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  company?: string;
  engineerRank?: string;
  designerBio?: string;
  specialties?: string[];
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  createdAt: string;
  lastLoginAt?: string;
  // KYC & Compliance
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycDocumentType?: 'id_card' | 'passport' | 'business_license';
  kycDocumentNumber?: string;
  kycDocumentImages?: string[];
  kycSubmittedAt?: string;
  kycVerifiedAt?: string;
  kycRejectionReason?: string;
  // Account Status & Metrics
  accountStatus?: 'active' | 'suspended' | 'under_review' | 'flagged';
  totalOrders?: number;
  totalSpent?: number;
  totalRevenue?: number;
  workshopPartnerId?: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// 3-SIDED MARKETPLACE DOMAIN TYPES (BUYERS, CREATORS, WORKSHOP MES)
// -----------------------------------------------------------------------------
export interface WorkshopPartner {
  id: string;
  name: string;
  region: 'hanoi' | 'danang' | 'hcm';
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  supportedTechnologies: ('FDM' | 'SLA' | 'SLS')[];
  maxBuildVolume: { x: number; y: number; z: number };
  activePrintersCount: number;
  availablePrintersCount: number;
  slaRating: number; // 0.0 - 5.0
  completedJobsCount: number;
  currentQueueLength: number; // active print hours in queue
  inStockMaterials: string[];
  status: 'active' | 'busy' | 'offline';
}

export interface ProductLicensingConfig {
  allowDigitalDownload: boolean;
  priceDigital: number;
  allowPhysicalManufacturing: boolean;
  physicalRoyaltyPercent: number; // 5% to 20%
  exclusiveBuyoutPrice?: number;
  commercialLicenseFee?: number;
}

export interface OrderFinancialSplit {
  orderId: string;
  orderNumber: string;
  grossAmount: number;
  paymentGatewayFee: number; // 2%
  creatorRoyalty: number;    // Designer physical royalty or 90% digital
  workshopPayout: number;    // BOM + Machine Time + Labor + 80% rush + personalization
  platformTakeRate: number;  // VCUBE platform revenue
  escrowStatus: 'holding' | 'disputed' | 'released';
  escrowReleaseDate: string; // 7 days after completion
}

export interface DispatchAssignment {
  id: string;
  orderId: string;
  workshopId: string;
  workshopName: string;
  assignedAt: string;
  responseDeadline: string; // 30 minutes SLA
  status: 'dispatched' | 'accepted' | 'rejected' | 'auto_rerouted' | 'in_production' | 'completed';
  assignedPrinterId?: string;
  printHoursEstimated: number;
}

export interface QualityControlRecord {
  id: string;
  orderId: string;
  workshopId: string;
  inspectorName: string;
  measuredWeightGrams: number;
  expectedWeightGrams: number;
  criticalDimensionsToleranceMm: number; // e.g. 0.03
  isWithinTolerance: boolean;
  visualDefectCheck: boolean;
  photoInspectionUrls: string[];
  inspectionNotes?: string;
  inspectedAt: string;
  passed: boolean;
}

export type AdminNavSection =
  | 'overview'
  // Group 0: Overview
  | 'group0-overview'
  // Group 1: Workshops
  | 'workshops'
  | 'partners'
  | 'machines'
  // Group 2: Designers
  | 'designers'
  // Group 3: Customers
  | 'users'
  | 'customers'
  // Group 4: Pricing Engine (Inkiri Standard)
  | 'pricing'
  | 'pricing-engine'
  | 'pricing-setup'
  | 'cost-rules'
  | 'materials'
  | 'hardware'
  | 'quote-calc'
  // Group 5: Production & MES
  | 'orders'
  | 'products'
  | 'queue'
  | 'inventory'
  // Content & System
  | 'storefront'
  | 'seo'
  | 'settings';

export type AdminTab = AdminNavSection;

// ==============================================================================
// INKIRI COST ENGINE & ROLE PROFILES (MULTI-TENANT VCUBE)
// ==============================================================================

export interface WorkshopProfile {
  id: string;
  userId?: string;
  partnerId?: string;
  workshopName: string;
  address: string;
  region: 'Bắc' | 'Trung' | 'Nam' | 'hanoi' | 'danang' | 'hcm';
  totalMachines: number;
  activeMachinesNow: number;
  electricityRateOverride?: number;
  laborRateOverride?: number;
  verifiedStatus: 'Pending' | 'Verified' | 'Suspended';
  contactPhone?: string;
  contactEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkshopMachine {
  id: string;
  workshopId: string;
  machineName: string;
  machineType: 'FDM' | 'SLA' | 'SLS' | 'PolyJet';
  /**
   * D2(A) — BA trường dưới đây **không có cột nào** trong `workshop_machines`
   * (`20260901_baseline_schema.sql`) nên KHÔNG lưu được: wizard xưởng đã ngừng thu thập.
   * Giữ ở dạng `?` để các call site cũ (admin panel / store / seed service) không gãy;
   * nơi nào cần chi phí máy thì dùng `hourlyRate` — cột CÓ THẬT.
   */
  avgPowerKW?: number;       // Average running power in kW (không có cột trong DB)
  purchasePrice?: number;    // Purchase price in VND (không có cột trong DB)
  lifetimeHours?: number;    // Expected lifetime in hours (không có cột trong DB)
  /** `workshop_machines.hourly_rate` — đơn giá giờ máy xưởng tự khai. `null` = chưa khai. */
  hourlyRate?: number | null;
  status: 'Free' | 'Busy' | 'Maintenance' | 'Offline';
  currentJobId?: string;
  buildVolumeMm?: { x: number; y: number; z: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkshopMaterial {
  id: string;
  workshopId: string;
  materialName: string;
  materialType: 'PLA' | 'PETG' | 'ABS' | 'ASA' | 'TPU' | 'PC' | 'PA' | 'PVA' | 'Resin';
  pricePerKg: number;
  colorHex: string;
  colorName?: string;
  density: number;
  stockStatus: 'Tracking' | 'NotTracking' | 'LowStock' | 'OutOfStock';
  currentStockGrams: number;
  lowStockThresholdGrams?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaterialInventoryLog {
  id: string;
  materialId: string;
  action: 'Import' | 'Export' | 'Adjustment';
  grams: number;
  pricePerKgAtTime?: number;
  supplier?: string;
  batchCode?: string;
  note?: string;
  createdBy?: string;
  createdAt: string;
}

export interface DesignerProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  socialLinks?: Record<string, string>;
  defaultRoyaltyPercent: number; // e.g. 10%
  licenseMode: 'PrintOnly' | 'CommercialSubscription';
  badgeTier: 'Standard' | 'TopCreator' | 'VerifiedEngineer' | 'PioneerMaker';
  payoutBankInfo?: string;
  totalSalesCount?: number;
  totalRoyaltiesEarned?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  defaultShippingAddress?: Record<string, any>;
  preferredPaymentMethod: 'vietqr' | 'momo' | 'vnpay' | 'cod';
  companyName?: string;
  taxId?: string;
  billingEmail?: string;
  ndaSigned?: boolean;
  ndaSignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PricingGlobalSettings {
  id: string;
  electricityRateVndKwh: number;        // e.g. 2850
  defaultLaborRateVndHour: number;      // e.g. 65000
  defaultScrapRatePercent: number;      // e.g. 5%
  profitMode: 'Markup' | 'Margin';      // Markup (on cost) vs Margin (on revenue)
  defaultProfitPercent: number;         // e.g. 35%
  marketplaceFeePercent: number;        // e.g. 8%
  marketplaceFixedFeeVnd: number;       // e.g. 5000
  overheadMonthlyCost: number;          // e.g. 15,000,000 VND
  avgProductsSoldPerMonth: number;      // e.g. 300 units
  enableAccessoriesPricing: boolean;
  enableMarketplaceFeeMode: boolean;
  enableAdvancedOverhead: boolean;
  version: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface WorkshopAccessory {
  id: string;
  workshopId?: string;
  name: string;
  groupName: string; // 'Hardware' | 'Packaging' | 'Fastener' | 'Magnet'
  qtyPerPack: number;
  pricePerPack: number;
  isActive: boolean;
  createdAt?: string;
}

export interface InkiriCalculationInput {
  printHours: number;
  postProcessingHours?: number;
  setupHours?: number;
  laborHours?: number;
  machine: {
    avgPowerKW: number;
    purchasePrice: number;
    lifetimeHours: number;
    maintenanceCostPerHour?: number;
  };
  material: {
    grams: number;
    pricePerKg: number;
    materialName?: string;
  };
  materials?: {
    grams: number;
    pricePerKg: number;
    materialName?: string;
  }[];
  accessories?: {
    name?: string;
    usedQty: number;
    packQty: number;
    packPrice: number;
  }[];
  customCosts?: number;
  globalSettings?: Partial<PricingGlobalSettings>;
}

export interface InkiriCalculationResult {
  depreciationPerHour: number;
  electricityPerHour: number;
  machineCost: number;
  materialCost: number;
  laborCost: number;
  accessoriesCost: number;
  allocatedOverhead: number;
  rawBaseCost: number;
  scrapReserveCost: number;
  finalCost: number;
  sellingPricePreFee: number;
  marketplaceFeeAmount: number;
  finalSellingPrice: number;
  profitMode: 'Markup' | 'Margin';
  profitPercent: number;
}

