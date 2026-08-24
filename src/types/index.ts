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
  status?: 'Published' | 'Under Review' | 'Draft' | 'Out of Stock';
  sku?: string;
  salesCount?: number;
}

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
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  estimatedDelivery: string;
  status: 'pending_payment' | 'processing' | 'printing' | 'post_processing' | 'packaging' | 'shipping' | 'completed' | 'cancelled';
  statusStageIndex: number; // 0 to 7
  layerProgress?: number;
  timeRemaining?: string;
  customerType?: 'guest' | 'registered';
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
    paidDate: string;
    subtotalPhysical: number;
    subtotalDigital: number;
    shippingFee: number;
    discount: number;
    tax: number;
    total: number;
    isPaid?: boolean;
  };
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
}

export interface ValidationIssue {
  code: 'THIN_WALL' | 'OVERHANG' | 'BED_FIT' | 'NON_MANIFOLD' | 'INVERTED_NORMALS' | 'ZIP_CHECK';
  severity: 'high' | 'medium' | 'low' | 'info';
  message: string;
  details?: string;
}

export interface PrintabilityAnalysis {
  printabilityScore: number; // 0 to 100
  level: 'good' | 'warning' | 'critical';
  issues: ValidationIssue[];
  recommendedOrientation: string;
  bedFit: boolean;
  overhangPercentage: number;
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

export interface PrinterProfile {
  id: string;
  name: string;
  brand: string;
  bedDimensions: { x: number; y: number; z: number }; // mm
  nozzleDiameter: number; // mm e.g. 0.4
  technology: 'FDM' | 'SLA' | 'SLS';
  powerKW: number; // Average power e.g. 0.18 kW
  acquisitionCost: number; // VND e.g. 35,000,000
  expectedLifetimeHours: number; // e.g. 8000 hours
  consumablesHourlyRate: number; // VND / hour (nozzle, plate, belt)
  hourlyRate: number; // VND per hour legacy/general
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

  // 3.5 Accessories & Packaging
  accessoriesCost: number; // Inserts, magnets, box, bubble wrap, labels

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
  isWatertight: boolean;
  nonManifoldEdges: number;
  invertedNormals: number;
  minWallThickness: number; // mm
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
    material: string;
    infill: string;
    nozzle: string;
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
  announcementText: string;
  announcementActive: boolean;
  heroHeadline: string;
  heroSubheadline: string;
  toleranceSpec: string;
  standardShippingFee: number;
  freeShippingThreshold: number;
  hotline: string;
  contactEmail: string;
  hanoiWorkshopAddress: string;
  hcmWorkshopAddress: string;
}

export type UserRole = 'customer' | 'designer' | 'admin';

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
}
