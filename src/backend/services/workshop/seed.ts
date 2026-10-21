import { WorkshopProfile, WorkshopMachine, WorkshopMaterial, MaterialInventoryLog, DesignerProfile, CustomerProfile, WorkshopAccessory } from '../../../types';



// ==============================================================================
// DEFAULT SEED DATA (Used when DB/LocalStorage is empty)
// ==============================================================================
export const SEED_WORKSHOP_PROFILES: WorkshopProfile[] = [
  {
    id: 'ws_hanoi_hub',
    partnerId: 'partner-hn-01',
    workshopName: 'VCUBE Innovation Lab & Central Hub - Hà Nội',
    address: 'Số 10 Tạ Quang Bửu, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
    region: 'Bắc',
    totalMachines: 16,
    activeMachinesNow: 12,
    electricityRateOverride: 2850,
    laborRateOverride: 70000,
    verifiedStatus: 'Verified',
    // P4 (data-honesty): KHÔNG bịa hotline xưởng. Nguồn thật là `app_settings.hotline`
    // do admin cấu hình; chưa cấu hình thì để trống, UI ẩn dòng hotline.
    contactPhone: '',
    contactEmail: 'hanoi.hub@vcube.vn',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'ws_danang_smart',
    partnerId: 'partner-dn-02',
    workshopName: 'VCUBE FabLab Miền Trung - Đà Nẵng',
    address: 'Khu Công Nghệ Cao Đà Nẵng, Hòa Vang, Đà Nẵng',
    region: 'Trung',
    totalMachines: 8,
    activeMachinesNow: 6,
    electricityRateOverride: 2750,
    laborRateOverride: 60000,
    verifiedStatus: 'Verified',
    // Q1 — Đợt 8C §0 / data-honesty CI-07: hotline xưởng bịa đã gỡ.
    // Nguồn thật: `app_settings.hotline`; rỗng ⇒ UI ẩn dòng hotline.
    contactPhone: '',
    contactEmail: 'danang.lab@vcube.vn',
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'ws_hcm_speed',
    partnerId: 'partner-hcm-03',
    workshopName: 'VCUBE Rapid Prototyping Center - TP. Hồ Chí Minh',
    address: 'Khu Công Nghệ Cao TP.HCM, Quận 9 (TP. Thủ Đức), TP. Hồ Chí Minh',
    region: 'Nam',
    totalMachines: 24,
    activeMachinesNow: 20,
    electricityRateOverride: 2900,
    laborRateOverride: 75000,
    verifiedStatus: 'Verified',
    // Q1 — Đợt 8C §0 / data-honesty CI-07: hotline xưởng bịa đã gỡ.
    // Nguồn thật: `app_settings.hotline`; rỗng ⇒ UI ẩn dòng hotline.
    contactPhone: '',
    contactEmail: 'hcm.speed@vcube.vn',
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  }
];

export const SEED_WORKSHOP_MACHINES: WorkshopMachine[] = [
  {
    id: 'wm_bambu_x1c_01',
    workshopId: 'ws_hanoi_hub',
    machineName: 'Bambu Lab X1-Carbon AMS #01',
    machineType: 'FDM',
    avgPowerKW: 0.18,
    purchasePrice: 36000000,
    lifetimeHours: 8000,
    status: 'Free',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'wm_bambu_p1s_02',
    workshopId: 'ws_hanoi_hub',
    machineName: 'Bambu Lab P1S Combo AMS #02',
    machineType: 'FDM',
    avgPowerKW: 0.16,
    purchasePrice: 24500000,
    lifetimeHours: 7500,
    status: 'Busy',
    currentJobId: 'ORD-2026-8801',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'wm_creality_k1max_03',
    workshopId: 'ws_hanoi_hub',
    machineName: 'Creality K1 Max High-Speed #03',
    machineType: 'FDM',
    avgPowerKW: 0.22,
    purchasePrice: 19500000,
    lifetimeHours: 6500,
    status: 'Maintenance',
    buildVolumeMm: { x: 300, y: 300, z: 300 },
    createdAt: '2026-01-12T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'wm_formlabs_form4_04',
    workshopId: 'ws_hcm_speed',
    machineName: 'Formlabs Form 4 Industrial SLA',
    machineType: 'SLA',
    avgPowerKW: 0.28,
    purchasePrice: 115000000,
    lifetimeHours: 10000,
    status: 'Free',
    buildVolumeMm: { x: 200, y: 125, z: 210 },
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'wm_kobra2max_05',
    workshopId: 'ws_danang_smart',
    machineName: 'Anycubic Kobra 2 Max Pro',
    machineType: 'FDM',
    avgPowerKW: 0.25,
    purchasePrice: 16800000,
    lifetimeHours: 6000,
    status: 'Offline',
    buildVolumeMm: { x: 420, y: 420, z: 500 },
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  }
];

export const SEED_WORKSHOP_MATERIALS: WorkshopMaterial[] = [
  {
    id: 'wmat_pla_tough',
    workshopId: 'ws_hanoi_hub',
    materialName: 'PLA Tough / PLA+ Công Nghiệp',
    materialType: 'PLA',
    pricePerKg: 320000,
    colorHex: '#00687a',
    colorName: 'Xanh Teal VCUBE',
    density: 1.24,
    stockStatus: 'Tracking',
    currentStockGrams: 12500,
    lowStockThresholdGrams: 2000,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'wmat_petg_pro',
    workshopId: 'ws_hanoi_hub',
    materialName: 'PETG Technical Pro Kháng Hóa Chất',
    materialType: 'PETG',
    pricePerKg: 380000,
    colorHex: '#1E293B',
    colorName: 'Đen Kỹ Thuật',
    density: 1.27,
    stockStatus: 'Tracking',
    currentStockGrams: 8400,
    lowStockThresholdGrams: 2000,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'wmat_abs_industrial',
    workshopId: 'ws_hcm_speed',
    materialName: 'ABS Industrial Grade Chịu Nhiệt',
    materialType: 'ABS',
    pricePerKg: 420000,
    colorHex: '#64748B',
    colorName: 'Xám Titan',
    density: 1.04,
    stockStatus: 'LowStock',
    currentStockGrams: 1400,
    lowStockThresholdGrams: 2000,
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'wmat_resin_std',
    workshopId: 'ws_hcm_speed',
    materialName: 'Standard UV Tough Resin 405nm',
    materialType: 'Resin',
    pricePerKg: 750000,
    colorHex: '#CBD5E1',
    colorName: 'Xám Bán Trong',
    density: 1.15,
    stockStatus: 'OutOfStock',
    currentStockGrams: 0,
    lowStockThresholdGrams: 1000,
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  }
];

export const SEED_MATERIAL_INVENTORY_LOGS: MaterialInventoryLog[] = [
  {
    id: 'log_001_import_pla',
    materialId: 'wmat_pla_tough',
    action: 'Import',
    grams: 10000,
    pricePerKgAtTime: 310000,
    supplier: 'Bambu Lab Direct VN',
    batchCode: 'LOT-202608-PLA',
    note: 'Nhập lô 10 cuộn 1kg định kỳ đầu tháng',
    // Q1 — Đợt 8C §0: tên nhân sự bịa trong log kho đã gỡ (nguồn thật: `created_by` do
    // phiên đăng nhập ghi khi thao tác thật).
    createdBy: '',
    createdAt: '2026-08-01T09:00:00.000Z'
  },
  {
    id: 'log_002_export_pla',
    materialId: 'wmat_pla_tough',
    action: 'Export',
    grams: 850,
    note: 'Xuất in đơn hàng đồ gá jig công nghiệp #ORD-8801',
    createdBy: 'Operator WS-01',
    createdAt: '2026-08-15T14:30:00.000Z'
  }
];

export const SEED_DESIGNER_PROFILES: DesignerProfile[] = [
  {
    id: 'des_hoang_bach_3d',
    userId: 'usr_designer_01',
    displayName: 'Hoàng Bách CAD/CAM',
    bio: 'Kỹ sư cơ điện tử Bách Khoa, chuyên thiết kế đồ gá Jig công nghiệp và vỏ hộp IoT tối ưu khí động học.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80',
    socialLinks: {
      github: 'https://github.com/hoangbach3d',
      portfolio: 'https://grabcad.com/hoangbach',
      printables: 'https://printables.com/@hoangbach'
    },
    defaultRoyaltyPercent: 12,
    licenseMode: 'PrintOnly',
    badgeTier: 'TopCreator',
    // Q1 — Đợt 8C §0 / data-honesty CI-08 + AD-06: số tài khoản ngân hàng bịa kèm PII
    // tên người (giá trị cũ ghi trong báo cáo Q1) đã gỡ.
    // Nguồn thật: hồ sơ chi trả của designer do admin nhập
    // (`designer_profiles.payout_bank_info`) + `app_settings.bankName`/`bankAccount`.
    payoutBankInfo: '',
    totalSalesCount: 142,
    totalRoyaltiesEarned: 18450000,
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'des_minh_tri_maker',
    userId: 'usr_designer_02',
    displayName: 'Minh Trí Industrial Design',
    bio: 'Chuyên gia phụ kiện custom cho camera, drone và gimbal FPV. Thiết kế tối ưu in 3D không cần support.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    socialLinks: {
      makerworld: 'https://makerworld.com/en/@minhtri'
    },
    defaultRoyaltyPercent: 10,
    licenseMode: 'CommercialSubscription',
    badgeTier: 'VerifiedEngineer',
    // Q1 — Đợt 8C §0 / data-honesty CI-08 + AD-06: số tài khoản ngân hàng bịa kèm PII
    // tên người (giá trị cũ ghi trong báo cáo Q1) đã gỡ. Nguồn thật: `designer_profiles.payout_bank_info`.
    payoutBankInfo: '',
    totalSalesCount: 88,
    totalRoyaltiesEarned: 9650000,
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  }
];

export const SEED_CUSTOMER_PROFILES: CustomerProfile[] = [
  {
    id: 'cust_fpt_software',
    userId: 'usr_customer_01',
    // Q1 — Đợt 8C §0: định danh một doanh nghiệp THẬT bị dùng làm fixture khách hàng đã gỡ
    // (data-honesty CI-08: fixture khách hàng từng bị seed vào DB thật).
    // Nguồn thật: `customer_profiles.company_name` do khách hàng/admin nhập.
    companyName: '',
    // Q1 — Đợt 8C §0 (gate `fake-financial-id`) / data-honesty CI-08: MST bịa (trùng MST
    // một doanh nghiệp thật) đã gỡ. Nguồn thật: `customer_profiles.tax_id` do
    // khách hàng nhập; MST của VCUBE là `app_settings.taxCode`.
    taxId: '',
    // Q1 — Đợt 8C §0: email nghiệp vụ của bên thứ ba trong fixture đã gỡ.
    // Nguồn thật: `customer_profiles.billing_email` do khách hàng nhập.
    billingEmail: '',
    preferredPaymentMethod: 'vietqr',
    defaultShippingAddress: {
      // Q1 — Đợt 8C §0: PII tên người nhận bịa đã gỡ. Nguồn thật: hồ sơ khách hàng
      // (`customer_profiles.default_shipping_address`) do chính khách hàng nhập.
      recipientName: '',
      // Q1 — Đợt 8C §0: SĐT bịa đã gỡ (nguồn thật: hồ sơ khách hàng).
      phone: '',
      // Q1 — Đợt 8C §0: địa chỉ toà nhà của doanh nghiệp THẬT trong fixture đã gỡ.
      // Nguồn thật: địa chỉ do khách hàng nhập khi đặt hàng.
      streetAddress: '',
      ward: 'Dịch Vọng',
      district: 'Cầu Giấy',
      city: 'Hà Nội'
    },
    ndaSigned: true,
    ndaSignedAt: '2026-01-15T10:00:00.000Z',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  },
  {
    id: 'cust_individual_khoa',
    userId: 'usr_customer_02',
    // Q1 — Đợt 8C §0: định danh doanh nghiệp bịa trong fixture khách hàng đã gỡ
    // (nguồn thật: `customer_profiles.company_name`).
    companyName: '',
    // Q1 — Đợt 8C §0: email cá nhân bịa trong fixture đã gỡ (nguồn thật: hồ sơ khách hàng).
    billingEmail: '',
    preferredPaymentMethod: 'vietqr',
    defaultShippingAddress: {
      // Q1 — Đợt 8C §0: PII tên người nhận bịa đã gỡ. Nguồn thật: hồ sơ khách hàng
      // (`customer_profiles.default_shipping_address`) do chính khách hàng nhập.
      recipientName: '',
      // Q1 — Đợt 8C §0: SĐT bịa đã gỡ (nguồn thật: hồ sơ khách hàng).
      phone: '',
      streetAddress: 'Số 45 Lê Duẩn, Phường Bến Nghé',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh'
    },
    ndaSigned: false,
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  }
];

/* ── Đợt P (Việc 5): `SEED_PRICING_GLOBAL_SETTINGS` đã bị XOÁ ────────────────────
 * Nó là một hàng "cấu hình giá toàn hệ thống" BỊA (2.850đ/kWh, 65.000đ/giờ, markup 35%,
 * phí sàn 8%…) dùng `id: 'default'`, trong khi hàng thật trong DB là `id: 'global'`
 * (`settingsService.SETTINGS_ROW_IDS.pricing_global_settings`), và ghi vào 14 CỘT KHÔNG
 * TỒN TẠI (`electricity_rate_vnd_kwh`, `default_labor_rate_vnd_hour`, `default_scrap_rate_percent`…).
 * Đây là "nguồn sự thật thứ hai" — nay thông số thật nằm ở `pricing_global_settings`
 * (điện · nhân công · VAT) + `pricing_configs` (công thức), đọc/ghi qua `settingsService`.
 * ────────────────────────────────────────────────────────────────────────────── */

export const SEED_WORKSHOP_ACCESSORIES: WorkshopAccessory[] = [
  {
    id: 'acc_heatset_m3',
    name: 'Ốc cấy nhiệt ren đồng M3x4x5mm (Heat-set Inserts)',
    groupName: 'Hardware',
    qtyPerPack: 100,
    pricePerPack: 65000,
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'acc_heatset_m4',
    name: 'Ốc cấy nhiệt ren đồng M4x5x6mm (Heat-set Inserts)',
    groupName: 'Hardware',
    qtyPerPack: 100,
    pricePerPack: 78000,
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'acc_magnet_6x3',
    name: 'Nam châm đất hiếm Neodymium N52 tròn 6x3mm',
    groupName: 'Magnet',
    qtyPerPack: 50,
    pricePerPack: 85000,
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'acc_box_standard',
    name: 'Hộp carton định hình VCUBE Eco + Mút xốp chống va đập',
    groupName: 'Packaging',
    qtyPerPack: 50,
    pricePerPack: 350000,
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'acc_bearing_608zz',
    name: 'Vòng bi thép tốc độ cao 608ZZ (cho con lăn & xoay)',
    groupName: 'Fastener',
    qtyPerPack: 20,
    pricePerPack: 95000,
    isActive: true,
    createdAt: '2026-01-15T08:00:00.000Z'
  }
];
