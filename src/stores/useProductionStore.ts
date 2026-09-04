import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProductionStageKey =
  | 'pending_payment'
  | 'cad_prep'
  | 'slicing'
  | 'printing'
  | 'post_processing'
  | 'qc_inspection'
  | 'packaging'
  | 'delivering';

export interface ProductionStageInfo {
  index: number;
  key: ProductionStageKey;
  labelVi: string;
  labelEn: string;
  shortVi: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  role: string;
  avgDuration: string;
}

export const KANBAN_STAGES: ProductionStageInfo[] = [
  {
    index: 0,
    key: 'pending_payment',
    labelVi: '1. Chờ thanh toán & Tiếp nhận',
    labelEn: '1. Awaiting Payment & Intake',
    shortVi: 'Chờ thanh toán',
    icon: 'hourglass_empty',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    role: 'Kế toán / Sale Hub',
    avgDuration: '15 phút'
  },
  {
    index: 1,
    key: 'cad_prep',
    labelVi: '2. Chuẩn bị file CAD & Kiểm lỗi',
    labelEn: '2. CAD Preparation & Healing',
    shortVi: 'Chuẩn bị CAD',
    icon: 'folder_open',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    role: 'Kỹ sư CAD / CAM',
    avgDuration: '25 phút'
  },
  {
    index: 2,
    key: 'slicing',
    labelVi: '3. Đang cắt lớp (Slicing G-code)',
    labelEn: '3. Slicing & G-Code Generation',
    shortVi: 'Đang cắt lớp',
    icon: 'layers',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    role: 'Kỹ sư Slicing CAM',
    avgDuration: '20 phút'
  },
  {
    index: 3,
    key: 'printing',
    labelVi: '4. Đang in 3D (FDM / SLA)',
    labelEn: '4. Active 3D Printing',
    shortVi: 'Đang in',
    icon: 'print',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    role: 'Kỹ thuật viên Farm',
    avgDuration: '3h - 12h'
  },
  {
    index: 4,
    key: 'post_processing',
    labelVi: '5. Hậu kỳ, bóc support & UV',
    labelEn: '5. Post-Processing & Curing',
    shortVi: 'Hậu kỳ',
    icon: 'handyman',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    role: 'Thợ hoàn thiện bề mặt',
    avgDuration: '45 phút'
  },
  {
    index: 5,
    key: 'qc_inspection',
    labelVi: '6. Kiểm định QC & Thước kẹp',
    labelEn: '6. QC & Dimensional Check',
    shortVi: 'Kiểm định QC',
    icon: 'verified',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    role: 'Giám sát chất lượng QC',
    avgDuration: '20 phút'
  },
  {
    index: 6,
    key: 'packaging',
    labelVi: '7. Đóng gói & Chống sốc xốp',
    labelEn: '7. Protective Packaging',
    shortVi: 'Đóng gói',
    icon: 'inventory_2',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    role: 'Nhân viên đóng gói',
    avgDuration: '15 phút'
  },
  {
    index: 7,
    key: 'delivering',
    labelVi: '8. Đang giao (VCUBE Express)',
    labelEn: '8. Delivering & Logistics',
    shortVi: 'Đang giao',
    icon: 'local_shipping',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    role: 'Đối tác giao vận',
    avgDuration: '1 - 2 ngày'
  }
];

export interface GeoDispatchRecommendation {
  workshopId: string;
  workshopName: string;
  region: 'Bắc' | 'Trung' | 'Nam';
  city: string;
  suggestedPrinterId: string;
  suggestedPrinterName: string;
  printerStatus: 'Free' | 'Busy' | 'Maintenance' | 'Offline';
  stockStatus: 'Sufficient' | 'LowStock' | 'OutOfStock';
  availableStockGrams: number;
  requiredGrams: number;
  matchScore: number; // 0 - 100
  distanceEstimateKm: number;
  matchReasons: string[];
}

export interface ProductionJob {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  region: 'Bắc' | 'Trung' | 'Nam';
  stageIndex: number;
  stageKey: ProductionStageKey;
  
  // Model & print parameters
  itemsSummary: string;
  modelFileName?: string;
  materialName: string;
  colorName: string;
  colorHex: string;
  layerHeightMm: number;
  infillPercent: number;
  totalGrams: number;
  estimatedPrintHours: number;
  estimatedDeliveryDate: string;
  
  // Fleet & Workshop Assignment
  assignedWorkshopId: string | null;
  assignedWorkshopName: string | null;
  assignedPrinterId: string | null;
  assignedPrinterName: string | null;
  dispatchStatus: 'unassigned' | 'suggested' | 'confirmed' | 'reassigned';
  dispatchConfirmedAt?: string;
  dispatchConfirmedBy?: string;
  
  // Intelligent Geo Recommendation
  geoRecommendation?: GeoDispatchRecommendation;
  
  // Live telemetry
  layerProgress: number; // 0 - 100
  currentLayer?: number;
  totalLayers?: number;
  bedTempC?: number;
  nozzleTempC?: number;
  remainingTimeStr?: string;
  
  // Notes & Quality
  priority: 'low' | 'normal' | 'high' | 'urgent';
  operatorNotes: string;
  qcInspectionPassed?: boolean;
  qcNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopTelemetryNode {
  id: string;
  name: string;
  region: 'Bắc' | 'Trung' | 'Nam';
  address: string;
  activeMachines: number;
  totalMachines: number;
  freeMachines: number;
  materialsStock: {
    materialName: string;
    stockGrams: number;
    colorHex: string;
  }[];
  fleet: {
    id: string;
    name: string;
    type: 'FDM' | 'SLA';
    status: 'Free' | 'Busy' | 'Maintenance' | 'Offline';
    currentJobId?: string;
    currentMaterial?: string;
    progressPercent?: number;
  }[];
}

export const INITIAL_WORKSHOP_NODES: WorkshopTelemetryNode[] = [
  {
    id: 'ws-hanoi-hub',
    name: 'VCUBE R&D & MES Farm Hà Nội',
    region: 'Bắc',
    address: 'Số 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
    totalMachines: 16,
    activeMachines: 11,
    freeMachines: 5,
    materialsStock: [
      { materialName: 'PLA Pro (Standard)', stockGrams: 28500, colorHex: '#1C1C1C' },
      { materialName: 'PETG Technical Pro', stockGrams: 14200, colorHex: '#3b82f6' },
      { materialName: 'ABS Industrial', stockGrams: 8900, colorHex: '#64748b' },
      { materialName: 'Resin Engineering 8K', stockGrams: 4200, colorHex: '#00687a' }
    ],
    fleet: [
      { id: 'p-hn-x1c-01', name: 'Bambu Lab X1-Carbon #01', type: 'FDM', status: 'Busy', progressPercent: 74, currentMaterial: 'PLA Pro (Standard)' },
      { id: 'p-hn-x1c-02', name: 'Bambu Lab X1-Carbon #02', type: 'FDM', status: 'Free', currentMaterial: 'PETG Technical Pro' },
      { id: 'p-hn-x1c-03', name: 'Bambu Lab X1-Carbon #03', type: 'FDM', status: 'Free', currentMaterial: 'PLA Pro (Standard)' },
      { id: 'p-hn-k1m-01', name: 'Creality K1 Max High Speed', type: 'FDM', status: 'Busy', progressPercent: 42, currentMaterial: 'ABS Industrial' },
      { id: 'p-hn-sla-01', name: 'Elegoo Saturn 4 Ultra 12K', type: 'SLA', status: 'Free', currentMaterial: 'Resin Engineering 8K' }
    ]
  },
  {
    id: 'ws-danang-lab',
    name: 'VCUBE Innovation Hub Đà Nẵng',
    region: 'Trung',
    address: 'Khu Công Nghệ Cao Đà Nẵng, Hòa Vang, Đà Nẵng',
    totalMachines: 8,
    activeMachines: 5,
    freeMachines: 3,
    materialsStock: [
      { materialName: 'PLA Pro (Standard)', stockGrams: 12400, colorHex: '#ffffff' },
      { materialName: 'PETG Technical Pro', stockGrams: 6500, colorHex: '#10b981' },
      { materialName: 'Resin Engineering 8K', stockGrams: 2100, colorHex: '#64748b' }
    ],
    fleet: [
      { id: 'p-dn-p1s-01', name: 'Bambu Lab P1S #01', type: 'FDM', status: 'Busy', progressPercent: 88, currentMaterial: 'PLA Pro (Standard)' },
      { id: 'p-dn-p1s-02', name: 'Bambu Lab P1S #02', type: 'FDM', status: 'Free', currentMaterial: 'PETG Technical Pro' },
      { id: 'p-dn-sla-01', name: 'Anycubic Photon Mono M5s', type: 'SLA', status: 'Free', currentMaterial: 'Resin Engineering 8K' }
    ]
  },
  {
    id: 'ws-hcm-mega',
    name: 'VCUBE Smart MES Hub TP. Hồ Chí Minh',
    region: 'Nam',
    address: 'Khu Công Nghệ Cao (SHTP), TP. Thủ Đức, TP.HCM',
    totalMachines: 28,
    activeMachines: 19,
    freeMachines: 9,
    materialsStock: [
      { materialName: 'PLA Pro (Standard)', stockGrams: 52000, colorHex: '#1C1C1C' },
      { materialName: 'PETG Technical Pro', stockGrams: 31000, colorHex: '#3b82f6' },
      { materialName: 'ABS Industrial', stockGrams: 18500, colorHex: '#dc2626' },
      { materialName: 'Resin Engineering 8K', stockGrams: 9800, colorHex: '#00687a' },
      { materialName: 'TPU 95A Flexible', stockGrams: 7200, colorHex: '#f59e0b' }
    ],
    fleet: [
      { id: 'p-hcm-x1c-01', name: 'Bambu Lab X1-Carbon #04', type: 'FDM', status: 'Busy', progressPercent: 62, currentMaterial: 'PLA Pro (Standard)' },
      { id: 'p-hcm-x1c-02', name: 'Bambu Lab X1-Carbon #05', type: 'FDM', status: 'Free', currentMaterial: 'PETG Technical Pro' },
      { id: 'p-hcm-x1c-03', name: 'Bambu Lab X1-Carbon #06', type: 'FDM', status: 'Free', currentMaterial: 'PLA Pro (Standard)' },
      { id: 'p-hcm-prusa-01', name: 'Prusa MK4 Enterprise #01', type: 'FDM', status: 'Free', currentMaterial: 'ABS Industrial' },
      { id: 'p-hcm-sla-01', name: 'Formlabs Form 4 LFS', type: 'SLA', status: 'Busy', progressPercent: 30, currentMaterial: 'Resin Engineering 8K' }
    ]
  }
];

export const INITIAL_PRODUCTION_JOBS: ProductionJob[] = [
  {
    id: 'job-101',
    orderId: 'order-1',
    orderNumber: 'VC-8821',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0912.345.678',
    customerAddress: 'Tòa Landmark 81, P. 22, Q. Bình Thạnh',
    customerCity: 'TP. Hồ Chí Minh',
    region: 'Nam',
    stageIndex: 3, // Đang in
    stageKey: 'printing',
    itemsSummary: 'Khung Vỏ Hộp Cảm Biến ESP32 IoT (Snap-Fit) x 2 cái',
    modelFileName: 'esp32-enclosure-v2.3mf',
    materialName: 'PETG Technical Pro',
    colorName: 'Xanh Navy Kỹ Thuật',
    colorHex: '#3b82f6',
    layerHeightMm: 0.16,
    infillPercent: 30,
    totalGrams: 145,
    estimatedPrintHours: 3.8,
    estimatedDeliveryDate: '2026-09-07',
    assignedWorkshopId: 'ws-hcm-mega',
    assignedWorkshopName: 'VCUBE Smart MES Hub TP. Hồ Chí Minh',
    assignedPrinterId: 'p-hcm-x1c-01',
    assignedPrinterName: 'Bambu Lab X1-Carbon #04',
    dispatchStatus: 'confirmed',
    dispatchConfirmedAt: '2026-09-04T10:15:00Z',
    dispatchConfirmedBy: 'Điều phối viên Lê Tuấn',
    layerProgress: 68,
    currentLayer: 480,
    totalLayers: 705,
    bedTempC: 70,
    nozzleTempC: 245,
    remainingTimeStr: '1h 12m',
    priority: 'high',
    operatorNotes: 'Bàn in số #04 (Bambu X1C) đang chạy tốc độ 250mm/s. Dung sai snap-fit đạt chuẩn.',
    createdAt: '2026-09-04T08:30:00Z',
    updatedAt: '2026-09-05T00:45:00Z'
  },
  {
    id: 'job-102',
    orderId: 'order-2',
    orderNumber: 'VC-8822',
    customerName: 'Trần Thị Thu Thảo',
    customerPhone: '0988.112.233',
    customerAddress: 'Số 45 Tràng Tiền, Hoàn Kiếm',
    customerCity: 'Hà Nội',
    region: 'Bắc',
    stageIndex: 1, // Chuẩn bị file CAD
    stageKey: 'cad_prep',
    itemsSummary: 'Khớp Nối Cánh Tay Robot 6 Bậc Tự Do x 1 bộ',
    modelFileName: 'robot-arm-joint-j2.step',
    materialName: 'PLA Pro (Standard)',
    colorName: 'Đen Mờ Nhám',
    colorHex: '#1C1C1C',
    layerHeightMm: 0.2,
    infillPercent: 40,
    totalGrams: 280,
    estimatedPrintHours: 6.2,
    estimatedDeliveryDate: '2026-09-08',
    assignedWorkshopId: null,
    assignedWorkshopName: null,
    assignedPrinterId: null,
    assignedPrinterName: null,
    dispatchStatus: 'suggested',
    geoRecommendation: {
      workshopId: 'ws-hanoi-hub',
      workshopName: 'VCUBE R&D & MES Farm Hà Nội',
      region: 'Bắc',
      city: 'Hà Nội',
      suggestedPrinterId: 'p-hn-x1c-03',
      suggestedPrinterName: 'Bambu Lab X1-Carbon #03',
      printerStatus: 'Free',
      stockStatus: 'Sufficient',
      availableStockGrams: 28500,
      requiredGrams: 280,
      matchScore: 98,
      distanceEstimateKm: 6.4,
      matchReasons: [
        'Cùng khu vực Miền Bắc (Hà Nội -> Cầu Giấy)',
        'Máy in Bambu Lab X1-Carbon #03 đang Trống (Free)',
        'Tồn kho nhựa PLA Pro dồi dào (28.5 kg sẵn có)'
      ]
    },
    layerProgress: 15,
    priority: 'urgent',
    operatorNotes: 'Khách yêu cầu độ bền ren ốc cao, đề xuất chèn ốc ren đồng M3 x 4 con sau in.',
    createdAt: '2026-09-04T14:20:00Z',
    updatedAt: '2026-09-04T15:00:00Z'
  },
  {
    id: 'job-103',
    orderId: 'order-3',
    orderNumber: 'VC-8823',
    customerName: 'Kỹ Sư Hoàng Minh',
    customerPhone: '0905.777.888',
    customerAddress: 'Khu Công Nghệ Cao Hòa Lạc, Thạch Thất',
    customerCity: 'Hà Nội',
    region: 'Bắc',
    stageIndex: 2, // Đang cắt lớp
    stageKey: 'slicing',
    itemsSummary: 'Mô hình Động Cơ Phản Lực Mini Cắt Bổ Mặt x 1 bộ',
    modelFileName: 'jet-engine-turbofan.stl',
    materialName: 'ABS Industrial',
    colorName: 'Xám Titan Kỹ Thuật',
    colorHex: '#64748b',
    layerHeightMm: 0.12,
    infillPercent: 50,
    totalGrams: 510,
    estimatedPrintHours: 11.5,
    estimatedDeliveryDate: '2026-09-09',
    assignedWorkshopId: null,
    assignedWorkshopName: null,
    assignedPrinterId: null,
    assignedPrinterName: null,
    dispatchStatus: 'suggested',
    geoRecommendation: {
      workshopId: 'ws-hanoi-hub',
      workshopName: 'VCUBE R&D & MES Farm Hà Nội',
      region: 'Bắc',
      city: 'Hà Nội',
      suggestedPrinterId: 'p-hn-x1c-02',
      suggestedPrinterName: 'Bambu Lab X1-Carbon #02',
      printerStatus: 'Free',
      stockStatus: 'Sufficient',
      availableStockGrams: 8900,
      requiredGrams: 510,
      matchScore: 95,
      distanceEstimateKm: 18.2,
      matchReasons: [
        'Khu vực Miền Bắc tối ưu chi phí vận chuyển',
        'Máy buồng kín Creality K1 / Bambu sẵn sàng in ABS',
        'Tồn kho ABS xám titan đủ định mức'
      ]
    },
    layerProgress: 30,
    priority: 'normal',
    operatorNotes: 'Đang xếp bàn in tối ưu hướng lớp in để cánh quạt không bị giòn gãy.',
    createdAt: '2026-09-04T16:00:00Z',
    updatedAt: '2026-09-04T17:10:00Z'
  },
  {
    id: 'job-104',
    orderId: 'order-4',
    orderNumber: 'VC-8824',
    customerName: 'Bác Sĩ Lê Trọng Nghĩa',
    customerPhone: '0933.222.111',
    customerAddress: 'Khu Đô Thị FPT City, Q. Ngũ Hành Sơn',
    customerCity: 'Đà Nẵng',
    region: 'Trung',
    stageIndex: 4, // Hậu kỳ
    stageKey: 'post_processing',
    itemsSummary: 'Mô Hình Giải Phẫu Xương Hàm Phục Hình x 1 chiếc',
    modelFileName: 'mandible-reconstruction-8k.stl',
    materialName: 'Resin Engineering 8K',
    colorName: 'Trắng Ngà Y Tế',
    colorHex: '#ffffff',
    layerHeightMm: 0.05,
    infillPercent: 100,
    totalGrams: 110,
    estimatedPrintHours: 4.5,
    estimatedDeliveryDate: '2026-09-06',
    assignedWorkshopId: 'ws-danang-lab',
    assignedWorkshopName: 'VCUBE Innovation Hub Đà Nẵng',
    assignedPrinterId: 'p-dn-sla-01',
    assignedPrinterName: 'Anycubic Photon Mono M5s',
    dispatchStatus: 'confirmed',
    dispatchConfirmedAt: '2026-09-03T11:00:00Z',
    layerProgress: 85,
    priority: 'high',
    operatorNotes: 'Đang ngâm rửa cồn Isopropyl 99% và chiếu tia UV 405nm trong 15 phút. Chuẩn bị đo kiểm dung sai.',
    createdAt: '2026-09-03T09:00:00Z',
    updatedAt: '2026-09-05T00:30:00Z'
  },
  {
    id: 'job-105',
    orderId: 'order-5',
    orderNumber: 'VC-8825',
    customerName: 'Phạm Hải Đăng',
    customerPhone: '0977.444.555',
    customerAddress: 'Đại Lộ Bình Dương, TP. Thủ Dầu Một',
    customerCity: 'Bình Dương',
    region: 'Nam',
    stageIndex: 0, // Chờ thanh toán
    stageKey: 'pending_payment',
    itemsSummary: 'Đồ Gá Hàn Mạch Điện Tử PCB Kháng Nhiệt x 3 chiếc',
    materialName: 'PETG Technical Pro',
    colorName: 'Đen Mờ Nhám',
    colorHex: '#1C1C1C',
    layerHeightMm: 0.2,
    infillPercent: 50,
    totalGrams: 320,
    estimatedPrintHours: 5.0,
    estimatedDeliveryDate: '2026-09-09',
    assignedWorkshopId: null,
    assignedWorkshopName: null,
    assignedPrinterId: null,
    assignedPrinterName: null,
    dispatchStatus: 'unassigned',
    geoRecommendation: {
      workshopId: 'ws-hcm-mega',
      workshopName: 'VCUBE Smart MES Hub TP. Hồ Chí Minh',
      region: 'Nam',
      city: 'TP. Hồ Chí Minh',
      suggestedPrinterId: 'p-hcm-x1c-02',
      suggestedPrinterName: 'Bambu Lab X1-Carbon #05',
      printerStatus: 'Free',
      stockStatus: 'Sufficient',
      availableStockGrams: 31000,
      requiredGrams: 320,
      matchScore: 96,
      distanceEstimateKm: 22.0,
      matchReasons: [
        'Khu vực Miền Nam giáp ranh Bình Dương (giao vận nhanh < 24h)',
        'Máy in X1-Carbon tốc độ cao sẵn sàng',
        'PETG chịu nhiệt đạt yêu cầu kỹ thuật'
      ]
    },
    layerProgress: 0,
    priority: 'normal',
    operatorNotes: 'Chờ đối soát thanh toán VietQR chuyển khoản.',
    createdAt: '2026-09-05T00:10:00Z',
    updatedAt: '2026-09-05T00:10:00Z'
  },
  {
    id: 'job-106',
    orderId: 'order-6',
    orderNumber: 'VC-8826',
    customerName: 'Võ Quốc Huy',
    customerPhone: '0944.999.000',
    customerAddress: 'Khu Dân Cư An Phú, TP. Tam Kỳ',
    customerCity: 'Quảng Nam',
    region: 'Trung',
    stageIndex: 5, // Kiểm định QC
    stageKey: 'qc_inspection',
    itemsSummary: 'Gá Lắp Cảm Biến Flycam Drone Carbon x 4 chiếc',
    materialName: 'PETG Technical Pro',
    colorName: 'Xanh Lá Neon',
    colorHex: '#10b981',
    layerHeightMm: 0.16,
    infillPercent: 60,
    totalGrams: 160,
    estimatedPrintHours: 3.2,
    estimatedDeliveryDate: '2026-09-07',
    assignedWorkshopId: 'ws-danang-lab',
    assignedWorkshopName: 'VCUBE Innovation Hub Đà Nẵng',
    assignedPrinterId: 'p-dn-p1s-02',
    assignedPrinterName: 'Bambu Lab P1S #02',
    dispatchStatus: 'confirmed',
    layerProgress: 95,
    priority: 'normal',
    operatorNotes: 'Đã hoàn tất đo kiểm thước kẹp Mitutoyo dung sai ±0.03mm, bề mặt láng mịn không khuyết tật.',
    qcInspectionPassed: true,
    qcNotes: 'Pass tiêu chuẩn cấp 1 VCUBE Precision Standard',
    createdAt: '2026-09-03T15:00:00Z',
    updatedAt: '2026-09-05T00:20:00Z'
  },
  {
    id: 'job-107',
    orderId: 'order-7',
    orderNumber: 'VC-8827',
    customerName: 'Hoàng Ánh Nguyệt',
    customerPhone: '0919.888.777',
    customerAddress: 'Vinhomes Central Park, Bình Thạnh',
    customerCity: 'TP. Hồ Chí Minh',
    region: 'Nam',
    stageIndex: 6, // Đóng gói
    stageKey: 'packaging',
    itemsSummary: 'Đèn Trang Trí Parametric Voronoi x 1 bộ',
    materialName: 'PLA Pro (Standard)',
    colorName: 'Trắng Sữa Satin',
    colorHex: '#ffffff',
    layerHeightMm: 0.2,
    infillPercent: 20,
    totalGrams: 420,
    estimatedPrintHours: 8.0,
    estimatedDeliveryDate: '2026-09-06',
    assignedWorkshopId: 'ws-hcm-mega',
    assignedWorkshopName: 'VCUBE Smart MES Hub TP. Hồ Chí Minh',
    assignedPrinterId: 'p-hcm-x1c-03',
    assignedPrinterName: 'Bambu Lab X1-Carbon #06',
    dispatchStatus: 'confirmed',
    layerProgress: 98,
    priority: 'low',
    operatorNotes: 'Đang đóng hộp xốp định hình 3 lớp, chèn bọt khí chống va đập khi vận chuyển.',
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-04T18:00:00Z'
  },
  {
    id: 'job-108',
    orderId: 'order-8',
    orderNumber: 'VC-8828',
    customerName: 'Đặng Quốc Bảo',
    customerPhone: '0962.333.444',
    customerAddress: 'Số 10 Hai Bà Trưng, P. Bến Nghé, Q. 1',
    customerCity: 'TP. Hồ Chí Minh',
    region: 'Nam',
    stageIndex: 7, // Đang giao
    stageKey: 'delivering',
    itemsSummary: 'Bộ Cờ Vua Độc Bản Cyberpunk 3D x 1 bộ',
    materialName: 'Resin Engineering 8K',
    colorName: 'Xanh Khói & Đen Obsidian',
    colorHex: '#1C1C1C',
    layerHeightMm: 0.05,
    infillPercent: 100,
    totalGrams: 650,
    estimatedPrintHours: 14.0,
    estimatedDeliveryDate: '2026-09-05',
    assignedWorkshopId: 'ws-hcm-mega',
    assignedWorkshopName: 'VCUBE Smart MES Hub TP. Hồ Chí Minh',
    assignedPrinterId: 'p-hcm-sla-01',
    assignedPrinterName: 'Formlabs Form 4 LFS',
    dispatchStatus: 'confirmed',
    layerProgress: 100,
    priority: 'normal',
    operatorNotes: 'Đã bàn giao shipper VCUBE Express - Mã vận đơn VC-EXP-99214.',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-04T16:00:00Z'
  }
];

export interface ProductionStoreState {
  jobs: ProductionJob[];
  workshops: WorkshopTelemetryNode[];
  selectedJobId: string | null;
  activeStageFilter: 'all' | ProductionStageKey;
  activeRegionFilter: 'all' | 'Bắc' | 'Trung' | 'Nam';
  activeWorkshopFilter: 'all' | string;
  searchQuery: string;

  // Actions
  setSelectedJobId: (id: string | null) => void;
  setActiveStageFilter: (stage: 'all' | ProductionStageKey) => void;
  setActiveRegionFilter: (region: 'all' | 'Bắc' | 'Trung' | 'Nam') => void;
  setActiveWorkshopFilter: (workshopId: 'all' | string) => void;
  setSearchQuery: (query: string) => void;

  // Kanban Stage Progression
  advanceStage: (jobId: string) => { success: boolean; newStage?: ProductionStageInfo; message?: string };
  regressStage: (jobId: string) => { success: boolean; newStage?: ProductionStageInfo };
  setJobStage: (jobId: string, stageIndex: number) => void;
  updateJobProgress: (jobId: string, progress: number, layerInfo?: { current: number; total: number }) => void;

  // Geo-Dispatcher Human-in-the-loop
  confirmDispatch: (jobId: string, operatorName?: string) => void;
  reassignWorkshop: (
    jobId: string,
    workshopId: string,
    printerId?: string,
    operatorName?: string
  ) => void;
  assignPrinter: (jobId: string, printerId: string, printerName: string) => void;
  calculateGeoDispatchRecommendation: (job: ProductionJob) => GeoDispatchRecommendation;

  // Job Management
  updateOperatorNotes: (jobId: string, notes: string) => void;
  updateQcStatus: (jobId: string, passed: boolean, notes?: string) => void;
  addProductionJob: (newJob: Partial<ProductionJob>) => void;
  resetToDefaultData: () => void;
}

export const useProductionStore = create<ProductionStoreState>()(
  persist(
    (set, get) => ({
      jobs: INITIAL_PRODUCTION_JOBS,
      workshops: INITIAL_WORKSHOP_NODES,
      selectedJobId: null,
      activeStageFilter: 'all',
      activeRegionFilter: 'all',
      activeWorkshopFilter: 'all',
      searchQuery: '',

      setSelectedJobId: (id) => set({ selectedJobId: id }),
      setActiveStageFilter: (stage) => set({ activeStageFilter: stage }),
      setActiveRegionFilter: (region) => set({ activeRegionFilter: region }),
      setActiveWorkshopFilter: (workshopId) => set({ activeWorkshopFilter: workshopId }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      advanceStage: (jobId) => {
        const { jobs } = get();
        const job = jobs.find((j) => j.id === jobId);
        if (!job) return { success: false, message: 'Job not found' };

        const currentIdx = job.stageIndex;
        if (currentIdx >= KANBAN_STAGES.length - 1) {
          return { success: false, message: 'Đã hoàn tất quy trình sản xuất' };
        }

        const nextStage = KANBAN_STAGES[currentIdx + 1];
        const updatedJobs = jobs.map((j) => {
          if (j.id === jobId) {
            const nextProgress = Math.min(100, Math.round(((currentIdx + 2) / KANBAN_STAGES.length) * 100));
            return {
              ...j,
              stageIndex: nextStage.index,
              stageKey: nextStage.key,
              layerProgress: nextProgress,
              updatedAt: new Date().toISOString()
            };
          }
          return j;
        });

        set({ jobs: updatedJobs });
        return { success: true, newStage: nextStage };
      },

      regressStage: (jobId) => {
        const { jobs } = get();
        const job = jobs.find((j) => j.id === jobId);
        if (!job || job.stageIndex <= 0) return { success: false };

        const prevStage = KANBAN_STAGES[job.stageIndex - 1];
        const updatedJobs = jobs.map((j) => {
          if (j.id === jobId) {
            const prevProgress = Math.max(0, Math.round((job.stageIndex / KANBAN_STAGES.length) * 100));
            return {
              ...j,
              stageIndex: prevStage.index,
              stageKey: prevStage.key,
              layerProgress: prevProgress,
              updatedAt: new Date().toISOString()
            };
          }
          return j;
        });

        set({ jobs: updatedJobs });
        return { success: true, newStage: prevStage };
      },

      setJobStage: (jobId, stageIndex) => {
        const targetStage = KANBAN_STAGES[stageIndex];
        if (!targetStage) return;

        set((state) => ({
          jobs: state.jobs.map((j) => {
            if (j.id === jobId) {
              const progressCalc = Math.min(100, Math.round(((stageIndex + 1) / KANBAN_STAGES.length) * 100));
              return {
                ...j,
                stageIndex: targetStage.index,
                stageKey: targetStage.key,
                layerProgress: progressCalc,
                updatedAt: new Date().toISOString()
              };
            }
            return j;
          })
        }));
      },

      updateJobProgress: (jobId, progress, layerInfo) => {
        set((state) => ({
          jobs: state.jobs.map((j) => {
            if (j.id === jobId) {
              return {
                ...j,
                layerProgress: progress,
                currentLayer: layerInfo?.current ?? j.currentLayer,
                totalLayers: layerInfo?.total ?? j.totalLayers,
                updatedAt: new Date().toISOString()
              };
            }
            return j;
          })
        }));
      },

      calculateGeoDispatchRecommendation: (job) => {
        const { workshops } = get();
        
        // 1. Determine target region from customer location
        let targetRegion: 'Bắc' | 'Trung' | 'Nam' = job.region || 'Nam';
        const cityLower = (job.customerCity + ' ' + job.customerAddress).toLowerCase();
        if (cityLower.includes('hà nội') || cityLower.includes('hải phòng') || cityLower.includes('bắc ninh') || cityLower.includes('thái nguyên')) {
          targetRegion = 'Bắc';
        } else if (cityLower.includes('đà nẵng') || cityLower.includes('huế') || cityLower.includes('quảng nam') || cityLower.includes('bình định')) {
          targetRegion = 'Trung';
        } else if (cityLower.includes('hồ chí minh') || cityLower.includes('sài gòn') || cityLower.includes('bình dương') || cityLower.includes('đồng nai') || cityLower.includes('cần thơ')) {
          targetRegion = 'Nam';
        }

        // 2. Find matching workshop in that region
        const regionalWorkshop = workshops.find((w) => w.region === targetRegion) || workshops[0];

        // 3. Find free machine
        const freePrinter = regionalWorkshop.fleet.find((p) => p.status === 'Free') || regionalWorkshop.fleet[0];

        // 4. Check material stock
        const matStock = regionalWorkshop.materialsStock.find((m) =>
          m.materialName.toLowerCase().includes(job.materialName.toLowerCase().slice(0, 4))
        );
        const availableStockGrams = matStock?.stockGrams || 5000;
        const requiredGrams = job.totalGrams || 200;
        const hasSufficientStock = availableStockGrams >= requiredGrams;

        // 5. Score calculation
        let score = 50;
        const matchReasons: string[] = [];

        if (regionalWorkshop.region === targetRegion) {
          score += 25;
          matchReasons.push(`Trạm ${regionalWorkshop.name} cùng khu vực Miền ${targetRegion}`);
        }
        if (freePrinter && freePrinter.status === 'Free') {
          score += 15;
          matchReasons.push(`Máy in ${freePrinter.name} đang ở trạng thái Trống (Free)`);
        }
        if (hasSufficientStock) {
          score += 10;
          matchReasons.push(`Tồn kho vật liệu ${job.materialName} đủ (${(availableStockGrams / 1000).toFixed(1)}kg)`);
        }

        return {
          workshopId: regionalWorkshop.id,
          workshopName: regionalWorkshop.name,
          region: targetRegion,
          city: regionalWorkshop.address.split(',').pop()?.trim() || targetRegion,
          suggestedPrinterId: freePrinter?.id || 'p-auto',
          suggestedPrinterName: freePrinter?.name || 'Máy in khuyến nghị',
          printerStatus: freePrinter?.status || 'Free',
          stockStatus: hasSufficientStock ? 'Sufficient' : 'LowStock',
          availableStockGrams,
          requiredGrams,
          matchScore: Math.min(99, score),
          distanceEstimateKm: targetRegion === 'Bắc' ? 8.5 : targetRegion === 'Trung' ? 6.2 : 12.0,
          matchReasons
        };
      },

      confirmDispatch: (jobId, operatorName = 'Điều phối viên MES') => {
        set((state) => ({
          jobs: state.jobs.map((j) => {
            if (j.id === jobId) {
              const rec = j.geoRecommendation || get().calculateGeoDispatchRecommendation(j);
              return {
                ...j,
                assignedWorkshopId: rec.workshopId,
                assignedWorkshopName: rec.workshopName,
                assignedPrinterId: rec.suggestedPrinterId,
                assignedPrinterName: rec.suggestedPrinterName,
                dispatchStatus: 'confirmed',
                dispatchConfirmedAt: new Date().toISOString(),
                dispatchConfirmedBy: operatorName,
                updatedAt: new Date().toISOString()
              };
            }
            return j;
          })
        }));
      },

      reassignWorkshop: (jobId, workshopId, printerId, operatorName = 'Điều phối viên MES') => {
        const { workshops } = get();
        const targetWs = workshops.find((w) => w.id === workshopId);
        if (!targetWs) return;

        let selectedPrinter = targetWs.fleet.find((p) => p.id === printerId);
        if (!selectedPrinter) {
          selectedPrinter = targetWs.fleet.find((p) => p.status === 'Free') || targetWs.fleet[0];
        }

        set((state) => ({
          jobs: state.jobs.map((j) => {
            if (j.id === jobId) {
              return {
                ...j,
                assignedWorkshopId: targetWs.id,
                assignedWorkshopName: targetWs.name,
                assignedPrinterId: selectedPrinter?.id || null,
                assignedPrinterName: selectedPrinter?.name || null,
                dispatchStatus: 'reassigned',
                dispatchConfirmedAt: new Date().toISOString(),
                dispatchConfirmedBy: `${operatorName} (Đổi trạm thủ công)`,
                updatedAt: new Date().toISOString()
              };
            }
            return j;
          })
        }));
      },

      assignPrinter: (jobId, printerId, printerName) => {
        set((state) => ({
          jobs: state.jobs.map((j) => {
            if (j.id === jobId) {
              return {
                ...j,
                assignedPrinterId: printerId,
                assignedPrinterName: printerName,
                dispatchStatus: 'confirmed',
                updatedAt: new Date().toISOString()
              };
            }
            return j;
          })
        }));
      },

      updateOperatorNotes: (jobId, notes) => {
        set((state) => ({
          jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, operatorNotes: notes, updatedAt: new Date().toISOString() } : j))
        }));
      },

      updateQcStatus: (jobId, passed, notes) => {
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  qcInspectionPassed: passed,
                  qcNotes: notes || j.qcNotes,
                  updatedAt: new Date().toISOString()
                }
              : j
          )
        }));
      },

      addProductionJob: (newJob) => {
        const id = newJob.id || `job-${Date.now()}`;
        const defaultJob: ProductionJob = {
          id,
          orderId: newJob.orderId || `order-${Date.now()}`,
          orderNumber: newJob.orderNumber || `VC-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: newJob.customerName || 'Khách hàng',
          customerPhone: newJob.customerPhone || '0900.000.000',
          customerAddress: newJob.customerAddress || 'Hà Nội',
          customerCity: newJob.customerCity || 'Hà Nội',
          region: newJob.region || 'Bắc',
          stageIndex: 0,
          stageKey: 'pending_payment',
          itemsSummary: newJob.itemsSummary || 'Mẫu in 3D theo yêu cầu',
          materialName: newJob.materialName || 'PLA Pro (Standard)',
          colorName: newJob.colorName || 'Đen',
          colorHex: newJob.colorHex || '#1C1C1C',
          layerHeightMm: newJob.layerHeightMm || 0.2,
          infillPercent: newJob.infillPercent || 25,
          totalGrams: newJob.totalGrams || 150,
          estimatedPrintHours: newJob.estimatedPrintHours || 3.5,
          estimatedDeliveryDate: newJob.estimatedDeliveryDate || '2026-09-10',
          assignedWorkshopId: null,
          assignedWorkshopName: null,
          assignedPrinterId: null,
          assignedPrinterName: null,
          dispatchStatus: 'suggested',
          layerProgress: 0,
          priority: newJob.priority || 'normal',
          operatorNotes: newJob.operatorNotes || 'Khởi tạo từ đơn hàng mới.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const jobWithRec = {
          ...defaultJob,
          geoRecommendation: get().calculateGeoDispatchRecommendation(defaultJob)
        };

        set((state) => ({ jobs: [jobWithRec, ...state.jobs] }));
      },

      resetToDefaultData: () => {
        set({
          jobs: INITIAL_PRODUCTION_JOBS,
          workshops: INITIAL_WORKSHOP_NODES,
          selectedJobId: null,
          activeStageFilter: 'all',
          activeRegionFilter: 'all',
          activeWorkshopFilter: 'all',
          searchQuery: ''
        });
      }
    }),
    {
      name: 'vcube_production_store_v1'
    }
  )
);
