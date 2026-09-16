import { supabase } from '../supabase/client';
import {
  WorkshopProfile,
  WorkshopMachine,
  WorkshopMaterial,
  MaterialInventoryLog,
  DesignerProfile,
  CustomerProfile,
  WorkshopAccessory
} from '../../types';

// ==============================================================================
// STORAGE KEYS FOR LOCALSTORAGE FALLBACK
// ==============================================================================
const STORAGE_KEYS = {
  WORKSHOP_PROFILES: 'vcube_db_workshop_profiles',
  WORKSHOP_MACHINES: 'vcube_db_workshop_machines',
  WORKSHOP_MATERIALS: 'vcube_db_workshop_materials',
  INVENTORY_LOGS: 'vcube_db_material_inventory_logs',
  DESIGNER_PROFILES: 'vcube_db_designer_profiles',
  CUSTOMER_PROFILES: 'vcube_db_customer_profiles',
  PRICING_SETTINGS: 'vcube_db_pricing_global_settings',
  WORKSHOP_ACCESSORIES: 'vcube_db_workshop_accessories',
};

// In-memory cache for Node.js / SSR runtime & LocalStorage synchronization
const inMemoryCache: Record<string, any> = {};

// Safe LocalStorage helpers with in-memory fallback
function readFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      if (item) return JSON.parse(item);
    }
  } catch (err) {
    console.warn(`[WorkshopService] Failed to read ${key} from localStorage:`, err);
  }
  if (inMemoryCache[key] !== undefined) {
    return inMemoryCache[key] as T;
  }
  return fallback;
}

function writeToStorage<T>(key: string, value: T): void {
  inMemoryCache[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.warn(`[WorkshopService] Failed to write ${key} to localStorage:`, err);
  }
}

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

// ==============================================================================
// WORKSHOP SERVICE CLASS
// ==============================================================================
export class WorkshopService {
  /**
   * Healthcheck to detect Supabase connectivity
   */
  static async checkSupabaseHealth(): Promise<{ online: boolean; message: string }> {
    try {
      const { error } = await supabase.from('pricing_global_settings').select('id').limit(1);
      if (error) throw error;
      return { online: true, message: 'Supabase Cloud PostgreSQL connected.' };
    } catch (err: any) {
      return { online: false, message: `Offline / Local fallback active: ${err?.message || 'Connection timeout'}` };
    }
  }

  // ----------------------------------------------------------------------------
  // 1. WORKSHOP PROFILES (workshop_profiles)
  // ----------------------------------------------------------------------------
  static async getWorkshopProfiles(filterRegion?: string): Promise<WorkshopProfile[]> {
    try {
      let query = supabase.from('workshop_profiles').select('*').order('created_at', { ascending: true });
      if (filterRegion && filterRegion !== 'all') {
        query = query.eq('region', filterRegion);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped: WorkshopProfile[] = data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          partnerId: d.partner_id,
          workshopName: d.workshop_name,
          address: d.address,
          region: d.region,
          totalMachines: Number(d.total_machines || 0),
          activeMachinesNow: Number(d.active_machines_now || 0),
          electricityRateOverride: d.electricity_rate_override ? Number(d.electricity_rate_override) : undefined,
          laborRateOverride: d.labor_rate_override ? Number(d.labor_rate_override) : undefined,
          verifiedStatus: d.verified_status || 'Pending',
          contactPhone: d.contact_phone,
          contactEmail: d.contact_email,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        writeToStorage(STORAGE_KEYS.WORKSHOP_PROFILES, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[WorkshopService] Supabase getWorkshopProfiles fallback to local:', e);
    }
    const local = readFromStorage<WorkshopProfile[]>(STORAGE_KEYS.WORKSHOP_PROFILES, SEED_WORKSHOP_PROFILES);
    return filterRegion && filterRegion !== 'all' ? local.filter(w => w.region === filterRegion) : local;
  }

  static async getWorkshopProfileById(id: string): Promise<WorkshopProfile | null> {
    const list = await WorkshopService.getWorkshopProfiles();
    return list.find(w => w.id === id) || null;
  }

  static async getWorkshopProfileByUserId(userId: string): Promise<WorkshopProfile | null> {
    const list = await WorkshopService.getWorkshopProfiles();
    return list.find(w => w.userId === userId) || null;
  }

  static async saveWorkshopProfile(profile: Partial<WorkshopProfile> & { workshopName: string; address: string }): Promise<{ success: boolean; data?: WorkshopProfile; error?: string }> {
    const now = new Date().toISOString();
    const id = profile.id || `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullProfile: WorkshopProfile = {
      id,
      userId: profile.userId,
      partnerId: profile.partnerId,
      workshopName: profile.workshopName,
      address: profile.address,
      region: profile.region || 'Bắc',
      totalMachines: profile.totalMachines ?? 0,
      activeMachinesNow: profile.activeMachinesNow ?? 0,
      electricityRateOverride: profile.electricityRateOverride,
      laborRateOverride: profile.laborRateOverride,
      verifiedStatus: profile.verifiedStatus || 'Pending',
      contactPhone: profile.contactPhone,
      contactEmail: profile.contactEmail,
      createdAt: profile.createdAt || now,
      updatedAt: now
    };

    // Update local storage first
    const local = readFromStorage<WorkshopProfile[]>(STORAGE_KEYS.WORKSHOP_PROFILES, SEED_WORKSHOP_PROFILES);
    const updatedLocal = [fullProfile, ...local.filter(w => w.id !== id)];
    writeToStorage(STORAGE_KEYS.WORKSHOP_PROFILES, updatedLocal);

    // W7 — `partner_id` và `verified_status` là 2 cột ĐẶC QUYỀN (chỉ admin gán/duyệt).
    // `upsert` = INSERT **hoặc** UPDATE: nếu gửi kèm 2 cột này khi UPDATE một hàng ĐÃ có
    // `partner_id`/`verified_status` thì payload vô tình ghi đè (null / 'Pending'), và trigger
    // `trg_protect_workshop_profile_privileged_columns` sẽ raise 42501 — nhìn như lỗi RLS.
    // ⇒ CHỈ gửi khi người gọi khai TƯỜNG MINH. Với hàng MỚI thì cột vắng mặt = NULL/DEFAULT,
    // y hệt giá trị cũ, nên đường onboarding không đổi hành vi.
    const payload: Record<string, unknown> = {
      id: fullProfile.id,
      user_id: fullProfile.userId || null,
      workshop_name: fullProfile.workshopName,
      address: fullProfile.address,
      region: fullProfile.region,
      total_machines: fullProfile.totalMachines,
      active_machines_now: fullProfile.activeMachinesNow,
      electricity_rate_override: fullProfile.electricityRateOverride,
      labor_rate_override: fullProfile.laborRateOverride,
      contact_phone: fullProfile.contactPhone,
      contact_email: fullProfile.contactEmail,
      updated_at: fullProfile.updatedAt
    };
    if (profile.partnerId !== undefined) payload.partner_id = profile.partnerId || null;
    if (profile.verifiedStatus !== undefined) payload.verified_status = profile.verifiedStatus;

    try {
      const { error } = await supabase.from('workshop_profiles').upsert(payload);
      if (error) throw error;
      return { success: true, data: fullProfile };
    } catch (e: any) {
      return { success: false, data: fullProfile, error: e?.message };
    }
  }

  static async deleteWorkshopProfile(id: string): Promise<{ success: boolean; error?: string }> {
    const local = readFromStorage<WorkshopProfile[]>(STORAGE_KEYS.WORKSHOP_PROFILES, SEED_WORKSHOP_PROFILES);
    writeToStorage(STORAGE_KEYS.WORKSHOP_PROFILES, local.filter(w => w.id !== id));
    try {
      const { error } = await supabase.from('workshop_profiles').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  // ----------------------------------------------------------------------------
  // 2. WORKSHOP MACHINES (workshop_machines)
  // ----------------------------------------------------------------------------
  static async getWorkshopMachines(workshopId?: string): Promise<WorkshopMachine[]> {
    try {
      let query = supabase.from('workshop_machines').select('*').order('created_at', { ascending: false });
      if (workshopId) {
        query = query.eq('workshop_id', workshopId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped: WorkshopMachine[] = data.map((d: any) => ({
          id: d.id,
          workshopId: d.workshop_id,
          machineName: d.machine_name,
          machineType: d.machine_type,
          avgPowerKW: Number(d.avg_power_kw || 0.18),
          purchasePrice: Number(d.purchase_price || 25000000),
          lifetimeHours: Number(d.lifetime_hours || 8000),
          status: d.status || 'Free',
          currentJobId: d.current_job_id,
          buildVolumeMm: d.build_volume_mm || { x: 256, y: 256, z: 256 },
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        writeToStorage(STORAGE_KEYS.WORKSHOP_MACHINES, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[WorkshopService] Supabase getWorkshopMachines fallback to local:', e);
    }
    const local = readFromStorage<WorkshopMachine[]>(STORAGE_KEYS.WORKSHOP_MACHINES, SEED_WORKSHOP_MACHINES);
    return workshopId ? local.filter(m => m.workshopId === workshopId) : local;
  }

  static async getWorkshopMachineById(id: string): Promise<WorkshopMachine | null> {
    const list = await WorkshopService.getWorkshopMachines();
    return list.find(m => m.id === id) || null;
  }

  static async saveWorkshopMachine(machine: WorkshopMachine): Promise<{ success: boolean; data?: WorkshopMachine; error?: string }> {
    const now = new Date().toISOString();
    const id = machine.id || `wm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullMachine: WorkshopMachine = {
      ...machine,
      id,
      createdAt: machine.createdAt || now,
      updatedAt: now
    };

    const local = readFromStorage<WorkshopMachine[]>(STORAGE_KEYS.WORKSHOP_MACHINES, SEED_WORKSHOP_MACHINES);
    writeToStorage(STORAGE_KEYS.WORKSHOP_MACHINES, [fullMachine, ...local.filter(m => m.id !== id)]);

    try {
      const { error } = await supabase.from('workshop_machines').upsert({
        id: fullMachine.id,
        workshop_id: fullMachine.workshopId,
        machine_name: fullMachine.machineName,
        machine_type: fullMachine.machineType,
        avg_power_kw: fullMachine.avgPowerKW,
        purchase_price: fullMachine.purchasePrice,
        lifetime_hours: fullMachine.lifetimeHours,
        status: fullMachine.status,
        current_job_id: fullMachine.currentJobId || null,
        build_volume_mm: fullMachine.buildVolumeMm,
        updated_at: fullMachine.updatedAt
      });
      if (error) throw error;
      return { success: true, data: fullMachine };
    } catch (e: any) {
      return { success: false, data: fullMachine, error: e?.message };
    }
  }

  static async updateMachineStatus(
    machineId: string,
    status: 'Free' | 'Busy' | 'Maintenance' | 'Offline',
    currentJobId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const local = readFromStorage<WorkshopMachine[]>(STORAGE_KEYS.WORKSHOP_MACHINES, SEED_WORKSHOP_MACHINES);
    const updated = local.map(m => m.id === machineId ? { ...m, status, currentJobId: currentJobId ?? (status === 'Busy' ? m.currentJobId : undefined), updatedAt: new Date().toISOString() } : m);
    writeToStorage(STORAGE_KEYS.WORKSHOP_MACHINES, updated);

    try {
      const { error } = await supabase.from('workshop_machines').update({
        status,
        current_job_id: currentJobId ?? (status === 'Busy' ? undefined : null),
        updated_at: new Date().toISOString()
      }).eq('id', machineId);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  static async deleteWorkshopMachine(id: string): Promise<{ success: boolean; error?: string }> {
    const local = readFromStorage<WorkshopMachine[]>(STORAGE_KEYS.WORKSHOP_MACHINES, SEED_WORKSHOP_MACHINES);
    writeToStorage(STORAGE_KEYS.WORKSHOP_MACHINES, local.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('workshop_machines').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  // ----------------------------------------------------------------------------
  // 3. WORKSHOP MATERIALS (workshop_materials)
  // ----------------------------------------------------------------------------
  static async getWorkshopMaterials(workshopId?: string): Promise<WorkshopMaterial[]> {
    try {
      let query = supabase.from('workshop_materials').select('*').order('created_at', { ascending: false });
      if (workshopId) {
        query = query.eq('workshop_id', workshopId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped: WorkshopMaterial[] = data.map((d: any) => ({
          id: d.id,
          workshopId: d.workshop_id,
          materialName: d.material_name,
          materialType: d.material_type,
          pricePerKg: Number(d.price_per_kg || 280000),
          colorHex: d.color_hex || '#1E293B',
          colorName: d.color_name || 'Tiêu chuẩn',
          density: Number(d.density || 1.24),
          stockStatus: d.stock_status || 'Tracking',
          currentStockGrams: Number(d.current_stock_grams || 0),
          lowStockThresholdGrams: Number(d.low_stock_threshold_grams || 1000),
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[WorkshopService] Supabase getWorkshopMaterials fallback to local:', e);
    }
    const local = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
    return workshopId ? local.filter(m => m.workshopId === workshopId) : local;
  }

  static async getWorkshopMaterialById(id: string): Promise<WorkshopMaterial | null> {
    const list = await WorkshopService.getWorkshopMaterials();
    return list.find(m => m.id === id) || null;
  }

  static async saveWorkshopMaterial(mat: WorkshopMaterial): Promise<{ success: boolean; data?: WorkshopMaterial; error?: string }> {
    const now = new Date().toISOString();
    const id = mat.id || `wmat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullMat: WorkshopMaterial = {
      ...mat,
      id,
      createdAt: mat.createdAt || now,
      updatedAt: now
    };

    const local = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
    writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, [fullMat, ...local.filter(m => m.id !== id)]);

    try {
      const { error } = await supabase.from('workshop_materials').upsert({
        id: fullMat.id,
        workshop_id: fullMat.workshopId,
        material_name: fullMat.materialName,
        material_type: fullMat.materialType,
        price_per_kg: fullMat.pricePerKg,
        color_hex: fullMat.colorHex,
        color_name: fullMat.colorName,
        density: fullMat.density,
        stock_status: fullMat.stockStatus,
        current_stock_grams: fullMat.currentStockGrams,
        low_stock_threshold_grams: fullMat.lowStockThresholdGrams,
        updated_at: fullMat.updatedAt
      });
      if (error) throw error;
      return { success: true, data: fullMat };
    } catch (e: any) {
      return { success: false, data: fullMat, error: e?.message };
    }
  }

  static async updateMaterialStock(
    materialId: string,
    currentStockGrams: number,
    stockStatus?: WorkshopMaterial['stockStatus']
  ): Promise<{ success: boolean; error?: string }> {
    const local = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
    const target = local.find(m => m.id === materialId);
    const threshold = target?.lowStockThresholdGrams || 1000;
    const computedStatus = stockStatus || (
      currentStockGrams <= 0 ? 'OutOfStock' :
      currentStockGrams <= threshold ? 'LowStock' : 'Tracking'
    );

    const updated = local.map(m => m.id === materialId ? {
      ...m,
      currentStockGrams,
      stockStatus: computedStatus,
      updatedAt: new Date().toISOString()
    } : m);
    writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, updated);

    try {
      const { error } = await supabase.from('workshop_materials').update({
        current_stock_grams: currentStockGrams,
        stock_status: computedStatus,
        updated_at: new Date().toISOString()
      }).eq('id', materialId);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  static async deleteWorkshopMaterial(id: string): Promise<{ success: boolean; error?: string }> {
    const local = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
    writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, local.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('workshop_materials').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  // ----------------------------------------------------------------------------
  // 4. MATERIAL INVENTORY LOGS (material_inventory_logs)
  // ----------------------------------------------------------------------------
  static async getInventoryLogs(materialId?: string): Promise<MaterialInventoryLog[]> {
    try {
      let query = supabase.from('material_inventory_logs').select('*').order('created_at', { ascending: false });
      if (materialId) {
        query = query.eq('material_id', materialId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped: MaterialInventoryLog[] = data.map((d: any) => ({
          id: d.id,
          materialId: d.material_id,
          action: d.action,
          grams: Number(d.grams || 0),
          pricePerKgAtTime: d.price_per_kg_at_time ? Number(d.price_per_kg_at_time) : undefined,
          supplier: d.supplier,
          batchCode: d.batch_code,
          note: d.note,
          createdBy: d.created_by,
          createdAt: d.created_at
        }));
        writeToStorage(STORAGE_KEYS.INVENTORY_LOGS, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[WorkshopService] Supabase getInventoryLogs fallback to local:', e);
    }
    const local = readFromStorage<MaterialInventoryLog[]>(STORAGE_KEYS.INVENTORY_LOGS, SEED_MATERIAL_INVENTORY_LOGS);
    return materialId ? local.filter(l => l.materialId === materialId) : local;
  }

  /**
   * Adds an inventory log and triggers stock level & price synchronization on workshop_materials
   */
  static async addInventoryLog(
    log: Omit<MaterialInventoryLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Promise<{ success: boolean; data?: MaterialInventoryLog; error?: string }> {
    const now = new Date().toISOString();
    const id = log.id || `inv_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullLog: MaterialInventoryLog = {
      ...log,
      id,
      createdAt: log.createdAt || now
    };

    // 1. Update local inventory logs
    const localLogs = readFromStorage<MaterialInventoryLog[]>(STORAGE_KEYS.INVENTORY_LOGS, SEED_MATERIAL_INVENTORY_LOGS);
    writeToStorage(STORAGE_KEYS.INVENTORY_LOGS, [fullLog, ...localLogs]);

    // 2. Offline trigger logic: Synchronize stock & price in workshop_materials
    const localMaterials = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
    const targetMat = localMaterials.find(m => m.id === log.materialId);

    if (targetMat) {
      let newStock = targetMat.currentStockGrams;
      let newPrice = targetMat.pricePerKg;

      if (log.action === 'Import') {
        newStock += log.grams;
        if (log.pricePerKgAtTime && log.pricePerKgAtTime > 0) {
          newPrice = log.pricePerKgAtTime;
        }
      } else if (log.action === 'Export') {
        newStock = Math.max(0, newStock - log.grams);
      } else if (log.action === 'Adjustment') {
        newStock = Math.max(0, log.grams);
      }

      const threshold = targetMat.lowStockThresholdGrams || 1000;
      const newStatus = (
        newStock <= 0 ? 'OutOfStock' :
        newStock <= threshold ? 'LowStock' : 'Tracking'
      );

      const updatedMaterials = localMaterials.map(m => m.id === log.materialId ? {
        ...m,
        currentStockGrams: newStock,
        pricePerKg: newPrice,
        stockStatus: newStatus,
        updatedAt: now
      } : m);
      writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, updatedMaterials);
    }

    // 3. Persist to Supabase if connected
    try {
      const { error } = await supabase.from('material_inventory_logs').insert({
        id: fullLog.id,
        material_id: fullLog.materialId,
        action: fullLog.action,
        grams: fullLog.grams,
        price_per_kg_at_time: fullLog.pricePerKgAtTime || null,
        supplier: fullLog.supplier || null,
        batch_code: fullLog.batchCode || null,
        note: fullLog.note || null,
        created_by: fullLog.createdBy || 'system',
        created_at: fullLog.createdAt
      });
      if (error) throw error;
      return { success: true, data: fullLog };
    } catch (e: any) {
      return { success: false, data: fullLog, error: e?.message };
    }
  }

  // ----------------------------------------------------------------------------
  // 5. DESIGNER PROFILES (designer_profiles)
  // ----------------------------------------------------------------------------
  static async getDesignerProfiles(): Promise<DesignerProfile[]> {
    try {
      const { data, error } = await supabase.from('designer_profiles').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const mapped: DesignerProfile[] = data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          displayName: d.display_name,
          bio: d.bio,
          avatarUrl: d.avatar_url,
          coverUrl: d.cover_url,
          socialLinks: d.social_links || {},
          defaultRoyaltyPercent: Number(d.default_royalty_percent || 10),
          licenseMode: d.license_mode || 'PrintOnly',
          badgeTier: d.badge_tier || 'Standard',
          payoutBankInfo: d.payout_bank_info,
          totalSalesCount: Number(d.total_sales_count || 0),
          totalRoyaltiesEarned: Number(d.total_royalties_earned || 0),
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        writeToStorage(STORAGE_KEYS.DESIGNER_PROFILES, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[WorkshopService] Supabase getDesignerProfiles fallback to local:', e);
    }
    return readFromStorage<DesignerProfile[]>(STORAGE_KEYS.DESIGNER_PROFILES, SEED_DESIGNER_PROFILES);
  }

  static async getDesignerProfileById(id: string): Promise<DesignerProfile | null> {
    const list = await WorkshopService.getDesignerProfiles();
    return list.find(d => d.id === id) || null;
  }

  static async getDesignerProfileByUserId(userId: string): Promise<DesignerProfile | null> {
    const list = await WorkshopService.getDesignerProfiles();
    return list.find(d => d.userId === userId) || null;
  }

  static async saveDesignerProfile(
    profile: Partial<DesignerProfile> & { userId: string; displayName: string }
  ): Promise<{ success: boolean; data?: DesignerProfile; error?: string }> {
    const now = new Date().toISOString();
    const id = profile.id || `des_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullProfile: DesignerProfile = {
      id,
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      coverUrl: profile.coverUrl,
      socialLinks: profile.socialLinks || {},
      defaultRoyaltyPercent: profile.defaultRoyaltyPercent ?? 10,
      licenseMode: profile.licenseMode || 'PrintOnly',
      badgeTier: profile.badgeTier || 'Standard',
      payoutBankInfo: profile.payoutBankInfo,
      totalSalesCount: profile.totalSalesCount ?? 0,
      totalRoyaltiesEarned: profile.totalRoyaltiesEarned ?? 0,
      createdAt: profile.createdAt || now,
      updatedAt: now
    };

    const local = readFromStorage<DesignerProfile[]>(STORAGE_KEYS.DESIGNER_PROFILES, SEED_DESIGNER_PROFILES);
    writeToStorage(STORAGE_KEYS.DESIGNER_PROFILES, [fullProfile, ...local.filter(d => d.id !== id)]);

    try {
      const { error } = await supabase.from('designer_profiles').upsert({
        id: fullProfile.id,
        user_id: fullProfile.userId,
        display_name: fullProfile.displayName,
        bio: fullProfile.bio,
        avatar_url: fullProfile.avatarUrl,
        cover_url: fullProfile.coverUrl,
        social_links: fullProfile.socialLinks,
        default_royalty_percent: fullProfile.defaultRoyaltyPercent,
        license_mode: fullProfile.licenseMode,
        badge_tier: fullProfile.badgeTier,
        payout_bank_info: fullProfile.payoutBankInfo,
        total_sales_count: fullProfile.totalSalesCount,
        total_royalties_earned: fullProfile.totalRoyaltiesEarned,
        updated_at: fullProfile.updatedAt
      });
      if (error) throw error;
      return { success: true, data: fullProfile };
    } catch (e: any) {
      return { success: false, data: fullProfile, error: e?.message };
    }
  }

  static async deleteDesignerProfile(id: string): Promise<{ success: boolean; error?: string }> {
    const local = readFromStorage<DesignerProfile[]>(STORAGE_KEYS.DESIGNER_PROFILES, SEED_DESIGNER_PROFILES);
    writeToStorage(STORAGE_KEYS.DESIGNER_PROFILES, local.filter(d => d.id !== id));
    try {
      const { error } = await supabase.from('designer_profiles').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  // ----------------------------------------------------------------------------
  // 6. CUSTOMER PROFILES (customer_profiles)
  // ----------------------------------------------------------------------------
  static async getCustomerProfiles(): Promise<CustomerProfile[]> {
    try {
      const { data, error } = await supabase.from('customer_profiles').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const mapped: CustomerProfile[] = data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          companyName: d.company_name,
          taxId: d.tax_id,
          billingEmail: d.billing_email,
          preferredPaymentMethod: d.preferred_payment_method || 'vietqr',
          defaultShippingAddress: d.default_shipping_address || {},
          ndaSigned: Boolean(d.nda_signed),
          ndaSignedAt: d.nda_signed_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        writeToStorage(STORAGE_KEYS.CUSTOMER_PROFILES, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[WorkshopService] Supabase getCustomerProfiles fallback to local:', e);
    }
    return readFromStorage<CustomerProfile[]>(STORAGE_KEYS.CUSTOMER_PROFILES, SEED_CUSTOMER_PROFILES);
  }

  static async getCustomerProfileById(id: string): Promise<CustomerProfile | null> {
    const list = await WorkshopService.getCustomerProfiles();
    return list.find(c => c.id === id) || null;
  }

  static async getCustomerProfileByUserId(userId: string): Promise<CustomerProfile | null> {
    const list = await WorkshopService.getCustomerProfiles();
    return list.find(c => c.userId === userId) || null;
  }

  static async saveCustomerProfile(
    profile: Partial<CustomerProfile> & { userId: string }
  ): Promise<{ success: boolean; data?: CustomerProfile; error?: string }> {
    const now = new Date().toISOString();
    const id = profile.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullProfile: CustomerProfile = {
      id,
      userId: profile.userId,
      companyName: profile.companyName,
      taxId: profile.taxId,
      billingEmail: profile.billingEmail,
      preferredPaymentMethod: profile.preferredPaymentMethod || 'vietqr',
      defaultShippingAddress: profile.defaultShippingAddress || {},
      ndaSigned: Boolean(profile.ndaSigned),
      ndaSignedAt: profile.ndaSigned ? (profile.ndaSignedAt || now) : undefined,
      createdAt: profile.createdAt || now,
      updatedAt: now
    };

    const local = readFromStorage<CustomerProfile[]>(STORAGE_KEYS.CUSTOMER_PROFILES, SEED_CUSTOMER_PROFILES);
    writeToStorage(STORAGE_KEYS.CUSTOMER_PROFILES, [fullProfile, ...local.filter(c => c.id !== id)]);

    try {
      const { error } = await supabase.from('customer_profiles').upsert({
        id: fullProfile.id,
        user_id: fullProfile.userId,
        company_name: fullProfile.companyName,
        tax_id: fullProfile.taxId,
        billing_email: fullProfile.billingEmail,
        preferred_payment_method: fullProfile.preferredPaymentMethod,
        default_shipping_address: fullProfile.defaultShippingAddress,
        nda_signed: fullProfile.ndaSigned,
        nda_signed_at: fullProfile.ndaSignedAt,
        updated_at: fullProfile.updatedAt
      });
      if (error) throw error;
      return { success: true, data: fullProfile };
    } catch (e: any) {
      return { success: false, data: fullProfile, error: e?.message };
    }
  }

  static async deleteCustomerProfile(id: string): Promise<{ success: boolean; error?: string }> {
    const local = readFromStorage<CustomerProfile[]>(STORAGE_KEYS.CUSTOMER_PROFILES, SEED_CUSTOMER_PROFILES);
    writeToStorage(STORAGE_KEYS.CUSTOMER_PROFILES, local.filter(c => c.id !== id));
    try {
      const { error } = await supabase.from('customer_profiles').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  /* ── Đợt P (Việc 5): nhóm hàm ghi legacy đã bị XOÁ ──────────────────────────────
   * `getPricingGlobalSettings()` + `savePricingGlobalSettings()` (0 caller, đã kiểm bằng
   * `grep -rn 'WorkshopService.getPricingGlobalSettings|...savePricingGlobalSettings'`):
   *   * dùng `id: 'default'` trong khi hàng thật là `id: 'global'` ⇒ ghi/đọc SAI hàng;
   *   * upsert 14 cột KHÔNG tồn tại trong baseline (`electricity_rate_vnd_kwh`,
   *     `default_labor_rate_vnd_hour`, `default_scrap_rate_percent`, `profit_mode`,
   *     `default_profit_percent`, `marketplace_fee_percent`, `marketplace_fixed_fee_vnd`,
   *     `overhead_monthly_cost`, `avg_products_sold_per_month`, …) ⇒ lỗi hoặc ghi rỗng;
   *   * nuốt lỗi rồi rơi về `SEED_PRICING_GLOBAL_SETTINGS` (đã xoá ở trên) ⇒ số bịa.
   * Đường ĐỌC/GHI duy nhất còn lại là `src/backend/services/settingsService.ts`
   * (`getPricingGlobalSettings` / `savePricingGlobalSettings` của module đó).
   * ────────────────────────────────────────────────────────────────────────────── */

  // ----------------------------------------------------------------------------
  // 8. WORKSHOP ACCESSORIES (workshop_accessories)
  // ----------------------------------------------------------------------------
  static async getWorkshopAccessories(workshopId?: string): Promise<WorkshopAccessory[]> {
    try {
      let query = supabase.from('workshop_accessories').select('*').order('created_at', { ascending: true });
      if (workshopId) {
        query = query.or(`workshop_id.eq.${workshopId},workshop_id.is.null`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped: WorkshopAccessory[] = data.map((d: any) => ({
          id: d.id,
          workshopId: d.workshop_id,
          name: d.name,
          groupName: d.group_name || 'Hardware',
          qtyPerPack: Number(d.qty_per_pack || 100),
          pricePerPack: Number(d.price_per_pack || 50000),
          isActive: Boolean(d.is_active ?? true),
          createdAt: d.created_at
        }));
        writeToStorage(STORAGE_KEYS.WORKSHOP_ACCESSORIES, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[WorkshopService] Supabase getWorkshopAccessories fallback to local:', e);
    }
    const local = readFromStorage<WorkshopAccessory[]>(STORAGE_KEYS.WORKSHOP_ACCESSORIES, SEED_WORKSHOP_ACCESSORIES);
    return workshopId ? local.filter(a => !a.workshopId || a.workshopId === workshopId) : local;
  }

  static async getWorkshopAccessoryById(id: string): Promise<WorkshopAccessory | null> {
    const list = await WorkshopService.getWorkshopAccessories();
    return list.find(a => a.id === id) || null;
  }

  static async saveWorkshopAccessory(
    acc: WorkshopAccessory
  ): Promise<{ success: boolean; data?: WorkshopAccessory; error?: string }> {
    const now = new Date().toISOString();
    const id = acc.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullAcc: WorkshopAccessory = {
      ...acc,
      id,
      createdAt: acc.createdAt || now
    };

    const local = readFromStorage<WorkshopAccessory[]>(STORAGE_KEYS.WORKSHOP_ACCESSORIES, SEED_WORKSHOP_ACCESSORIES);
    writeToStorage(STORAGE_KEYS.WORKSHOP_ACCESSORIES, [fullAcc, ...local.filter(a => a.id !== id)]);

    try {
      const { error } = await supabase.from('workshop_accessories').upsert({
        id: fullAcc.id,
        workshop_id: fullAcc.workshopId || null,
        name: fullAcc.name,
        group_name: fullAcc.groupName,
        qty_per_pack: fullAcc.qtyPerPack,
        price_per_pack: fullAcc.pricePerPack,
        is_active: fullAcc.isActive
      });
      if (error) throw error;
      return { success: true, data: fullAcc };
    } catch (e: any) {
      return { success: false, data: fullAcc, error: e?.message };
    }
  }

  static async deleteWorkshopAccessory(id: string): Promise<{ success: boolean; error?: string }> {
    const local = readFromStorage<WorkshopAccessory[]>(STORAGE_KEYS.WORKSHOP_ACCESSORIES, SEED_WORKSHOP_ACCESSORIES);
    writeToStorage(STORAGE_KEYS.WORKSHOP_ACCESSORIES, local.filter(a => a.id !== id));
    try {
      const { error } = await supabase.from('workshop_accessories').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  // ==========================================================================
  // W1b — BẢNG ĐIỀU KHIỂN XƯỞNG: CHỈ DỮ LIỆU CỦA CHÍNH XƯỞNG ĐANG ĐĂNG NHẬP
  //
  // Vì sao tách khỏi nhóm `getWorkshop*` phía trên: nhóm cũ rơi về `SEED_*` /
  // localStorage khi bảng rỗng. Với bảng điều khiển của xưởng, "rơi về seed" nghĩa là
  // xưởng A nhìn thấy máy / vật liệu của một xưởng không tồn tại — vừa RÒ DỮ LIỆU vừa
  // SỐ BỊA (`docs/design/data-honesty.md` CI-07). Nhóm hàm dưới đây:
  //   - KHÔNG đọc/ghi localStorage, KHÔNG rơi về `SEED_*`;
  //   - LUÔN lọc theo hồ sơ xưởng của `auth.uid()` (máy/vật liệu/phụ kiện) hoặc theo
  //     `partner_id` của xưởng đó (`orders.assigned_workshop_id`);
  //   - trả `{ data, error }` để tầng view nói THẬT khi máy chủ từ chối (RLS) thay vì
  //     báo thành công giả.
  // ==========================================================================

  /** `auth.uid()` hiện tại; `null` khi chưa đăng nhập. */
  static async getCurrentUserId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user?.id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Hồ sơ xưởng của CHÍNH người đang đăng nhập.
   *
   * `workshop_profiles` KHÔNG có unique constraint trên `user_id` (đã kiểm chứng trên
   * project thật) ⇒ một user có thể có nhiều hồ sơ. Hàm trả hàng MỚI NHẤT và kèm
   * `duplicateCount` để tầng view cảnh báo thay vì âm thầm chọn bừa.
   */
  static async getMyWorkshopProfile(): Promise<MyWorkshopProfileResult> {
    const uid = await WorkshopService.getCurrentUserId();
    if (!uid) return { profile: null, error: null, duplicateCount: 0 };

    const { data, error } = await supabase
      .from('workshop_profiles')
      .select(
        'id,user_id,partner_id,workshop_name,address,region,total_machines,active_machines_now,' +
          'electricity_rate_override,labor_rate_override,verified_status,contact_phone,contact_email,' +
          'created_at,updated_at'
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) return { profile: null, error: error.message, duplicateCount: 0 };
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    if (rows.length === 0) return { profile: null, error: null, duplicateCount: 0 };

    return {
      profile: WorkshopService.mapMyWorkshopProfile(rows[0]),
      error: null,
      duplicateCount: rows.length,
    };
  }

  /**
   * Lưu cấu hình của chính xưởng. `electricityRateOverride` / `laborRateOverride`:
   * số = có cấu hình, `null` = XOÁ cấu hình (rỗng = chưa cấu hình, KHÔNG mặc định số).
   */
  static async saveMyWorkshopProfile(
    profileId: string,
    patch: MyWorkshopProfilePatch
  ): Promise<WriteResult> {
    if (!profileId) return { success: false, error: 'Thiếu hồ sơ xưởng — không thể lưu.' };

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.workshopName !== undefined) payload.workshop_name = patch.workshopName;
    if (patch.address !== undefined) payload.address = patch.address;
    if (patch.region !== undefined) payload.region = patch.region;
    if (patch.contactPhone !== undefined) payload.contact_phone = patch.contactPhone;
    if (patch.contactEmail !== undefined) payload.contact_email = patch.contactEmail;
    if (patch.electricityRateOverride !== undefined) {
      payload.electricity_rate_override = patch.electricityRateOverride;
    }
    if (patch.laborRateOverride !== undefined) {
      payload.labor_rate_override = patch.laborRateOverride;
    }

    try {
      const { data, error } = await supabase
        .from('workshop_profiles')
        .update(payload)
        .eq('id', profileId)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Máy chủ không ghi được hàng nào (quyền RLS) — chưa có thay đổi nào được lưu.',
        };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi lưu hồ sơ xưởng.' };
    }
  }

  // --------------------------------------------------------------------------
  // W1b.1 — MÁY IN CỦA CHÍNH XƯỞNG (`workshop_machines`)
  // --------------------------------------------------------------------------
  static async getMyMachines(workshopProfileId: string): Promise<MyMachinesResult> {
    if (!workshopProfileId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('workshop_machines')
      .select('id,workshop_id,name,brand,model,technology,bed_dimensions,status,hourly_rate,created_at,updated_at')
      .eq('workshop_id', workshopProfileId)
      .order('created_at', { ascending: true });
    if (error) return { data: [], error: error.message };
    return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(WorkshopService.mapMyMachine), error: null };
  }

  static async saveMyMachine(input: MyMachineInput): Promise<WriteResult> {
    if (!input.workshopProfileId) {
      return { success: false, error: 'Thiếu hồ sơ xưởng — không thể khai báo máy in.' };
    }
    const payload: Record<string, unknown> = {
      workshop_id: input.workshopProfileId,
      name: input.name,
      brand: input.brand ?? '',
      model: input.model ?? '',
      technology: input.technology ?? 'FDM',
      bed_dimensions: input.bedDimensions ?? { x: 256, y: 256, z: 256 },
      status: input.status ?? 'Free',
      hourly_rate: input.hourlyRate ?? null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (input.id) {
        const { data, error } = await supabase
          .from('workshop_machines')
          .update(payload)
          .eq('id', input.id)
          .eq('workshop_id', input.workshopProfileId)
          .select('id');
        if (error) return { success: false, error: error.message };
        if (!data || data.length === 0) {
          return { success: false, error: 'Máy chủ không ghi được hàng nào (quyền RLS).' };
        }
        return { success: true, error: null };
      }

      const { data, error } = await supabase.from('workshop_machines').insert(payload).select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không tạo được hàng nào (quyền RLS).' };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi lưu máy in.' };
    }
  }

  static async setMyMachineStatus(
    machineId: string,
    workshopProfileId: string,
    status: string
  ): Promise<WriteResult> {
    try {
      const { data, error } = await supabase
        .from('workshop_machines')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', machineId)
        .eq('workshop_id', workshopProfileId)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không ghi được hàng nào (quyền RLS).' };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi đổi trạng thái máy.' };
    }
  }

  static async deleteMyMachine(machineId: string, workshopProfileId: string): Promise<WriteResult> {
    try {
      const { data, error } = await supabase
        .from('workshop_machines')
        .delete()
        .eq('id', machineId)
        .eq('workshop_id', workshopProfileId)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không xoá được hàng nào (quyền RLS).' };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi xoá máy in.' };
    }
  }

  // --------------------------------------------------------------------------
  // W1b.2 — VẬT LIỆU & TỒN KHO CỦA CHÍNH XƯỞNG
  // (`workshop_materials` + `material_inventory_logs`)
  // --------------------------------------------------------------------------
  static async getMyMaterials(workshopProfileId: string): Promise<MyMaterialsResult> {
    if (!workshopProfileId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('workshop_materials')
      .select(
        'id,workshop_id,name,type,color,current_stock_grams,low_stock_threshold_grams,price_per_kg,stock_status,created_at,updated_at'
      )
      .eq('workshop_id', workshopProfileId)
      .order('created_at', { ascending: true });
    if (error) return { data: [], error: error.message };
    return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(WorkshopService.mapMyMaterial), error: null };
  }

  static async saveMyMaterial(input: MyMaterialInput): Promise<WriteResult> {
    if (!input.workshopProfileId) {
      return { success: false, error: 'Thiếu hồ sơ xưởng — không thể khai báo vật liệu.' };
    }
    const payload: Record<string, unknown> = {
      workshop_id: input.workshopProfileId,
      name: input.name,
      type: input.type ?? 'PLA',
      color: input.color ?? '',
      current_stock_grams: input.currentStockGrams ?? null,
      low_stock_threshold_grams: input.lowStockThresholdGrams ?? null,
      price_per_kg: input.pricePerKg ?? null,
      stock_status: input.stockStatus ?? WorkshopService.computeStockStatus(
        input.currentStockGrams ?? null,
        input.lowStockThresholdGrams ?? null
      ),
      updated_at: new Date().toISOString(),
    };

    try {
      if (input.id) {
        const { data, error } = await supabase
          .from('workshop_materials')
          .update(payload)
          .eq('id', input.id)
          .eq('workshop_id', input.workshopProfileId)
          .select('id');
        if (error) return { success: false, error: error.message };
        if (!data || data.length === 0) {
          return { success: false, error: 'Máy chủ không ghi được hàng nào (quyền RLS).' };
        }
        return { success: true, error: null };
      }

      const { data, error } = await supabase.from('workshop_materials').insert(payload).select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không tạo được hàng nào (quyền RLS).' };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi lưu vật liệu.' };
    }
  }

  static async deleteMyMaterial(materialId: string, workshopProfileId: string): Promise<WriteResult> {
    try {
      const { data, error } = await supabase
        .from('workshop_materials')
        .delete()
        .eq('id', materialId)
        .eq('workshop_id', workshopProfileId)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không xoá được hàng nào (quyền RLS).' };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi xoá vật liệu.' };
    }
  }

  static async getMyInventoryLogs(materialIds: string[]): Promise<MyInventoryLogsResult> {
    const ids = materialIds.filter(Boolean);
    if (ids.length === 0) return { data: [], error: null };
    const { data, error } = await supabase
      .from('material_inventory_logs')
      .select('id,material_id,action,grams,price_per_kg_at_time,supplier,batch_code,note,created_by,created_at')
      .in('material_id', ids)
      .order('created_at', { ascending: false });
    if (error) return { data: [], error: error.message };
    return {
      data: ((data ?? []) as unknown as Record<string, unknown>[]).map(WorkshopService.mapMyInventoryLog),
      error: null,
    };
  }

  /**
   * Ghi phiếu nhập/xuất kho + cập nhật tồn của vật liệu (và đơn giá nếu phiếu nhập có giá).
   * Trả `stockUpdated = false` khi phiếu đã ghi nhưng tồn CHƯA cập nhật — tầng view phải
   * nói đúng trạng thái đó, không được báo "thành công" trọn vẹn.
   */
  static async addMyInventoryLog(input: MyInventoryLogInput): Promise<MyInventoryLogResult> {
    if (!input.workshopProfileId || !input.materialId) {
      return { success: false, error: 'Thiếu vật liệu hoặc hồ sơ xưởng.', stockUpdated: false, newStockGrams: null };
    }

    const payload: Record<string, unknown> = {
      material_id: input.materialId,
      action: input.action,
      grams: input.grams,
      price_per_kg_at_time: input.pricePerKgAtTime ?? null,
      supplier: input.supplier ?? '',
      batch_code: input.batchCode ?? '',
      note: input.note ?? '',
      created_by: input.createdBy ?? '',
    };

    try {
      const { data: logData, error: logError } = await supabase
        .from('material_inventory_logs')
        .insert(payload)
        .select('id');
      if (logError) return { success: false, error: logError.message, stockUpdated: false, newStockGrams: null };
      if (!logData || logData.length === 0) {
        return { success: false, error: 'Phiếu kho chưa được ghi (quyền RLS).', stockUpdated: false, newStockGrams: null };
      }

      // Đọc tồn hiện tại TỪ MÁY CHỦ (không tin state trong RAM) rồi mới tính tồn mới.
      const { data: matData, error: matError } = await supabase
        .from('workshop_materials')
        .select('current_stock_grams,price_per_kg,low_stock_threshold_grams')
        .eq('id', input.materialId)
        .eq('workshop_id', input.workshopProfileId);

      if (matError || !matData || matData.length === 0) {
        return {
          success: true,
          error: matError ? matError.message : 'Không đọc được vật liệu để cập nhật tồn.',
          stockUpdated: false,
          newStockGrams: null,
        };
      }

      const row = matData[0] as Record<string, unknown>;
      const currentStock = Number(row.current_stock_grams ?? 0);
      const threshold = Number(row.low_stock_threshold_grams ?? 500);
      let newStock: number;
      if (input.action === 'Import') newStock = currentStock + input.grams;
      else if (input.action === 'Export') newStock = Math.max(0, currentStock - input.grams);
      else newStock = Math.max(0, input.grams);

      const stockPayload: Record<string, unknown> = {
        current_stock_grams: newStock,
        stock_status: WorkshopService.computeStockStatus(newStock, threshold),
        updated_at: new Date().toISOString(),
      };
      if (input.action === 'Import' && typeof input.pricePerKgAtTime === 'number' && input.pricePerKgAtTime > 0) {
        stockPayload.price_per_kg = input.pricePerKgAtTime;
      }

      const { data: updData, error: updError } = await supabase
        .from('workshop_materials')
        .update(stockPayload)
        .eq('id', input.materialId)
        .eq('workshop_id', input.workshopProfileId)
        .select('id');

      if (updError) {
        return { success: false, error: updError.message, stockUpdated: false, newStockGrams: newStock };
      }
      if (!updData || updData.length === 0) {
        return {
          success: false,
          error: 'Phiếu kho đã ghi nhưng tồn kho CHƯA cập nhật (quyền RLS).',
          stockUpdated: false,
          newStockGrams: newStock,
        };
      }

      return { success: true, error: null, stockUpdated: true, newStockGrams: newStock };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi ghi phiếu kho.', stockUpdated: false, newStockGrams: null };
    }
  }

  // --------------------------------------------------------------------------
  // W1b.3 — PHỤ KIỆN RIÊNG CỦA XƯỞNG (`workshop_accessories`)
  // Chỉ bản ghi có `workshop_id` = xưởng của mình (bản ghi dùng chung của nền tảng
  // không thuộc phạm vi "năng lực của tôi" nên không hiển thị ở đây).
  // --------------------------------------------------------------------------
  static async getMyAccessories(workshopProfileId: string): Promise<MyAccessoriesResult> {
    if (!workshopProfileId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('workshop_accessories')
      .select('id,workshop_id,name,unit,quantity,cost_price,selling_price,sku,is_active,created_at,updated_at')
      .eq('workshop_id', workshopProfileId)
      .order('created_at', { ascending: true });
    if (error) return { data: [], error: error.message };
    return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(WorkshopService.mapMyAccessory), error: null };
  }

  static async saveMyAccessory(input: MyAccessoryInput): Promise<WriteResult> {
    if (!input.workshopProfileId) {
      return { success: false, error: 'Thiếu hồ sơ xưởng — không thể khai báo phụ kiện.' };
    }
    const payload: Record<string, unknown> = {
      workshop_id: input.workshopProfileId,
      name: input.name,
      unit: input.unit ?? 'cái',
      quantity: input.quantity ?? 0,
      cost_price: input.costPrice ?? null,
      selling_price: input.sellingPrice ?? null,
      sku: input.sku ?? '',
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    try {
      if (input.id) {
        const { data, error } = await supabase
          .from('workshop_accessories')
          .update(payload)
          .eq('id', input.id)
          .eq('workshop_id', input.workshopProfileId)
          .select('id');
        if (error) return { success: false, error: error.message };
        if (!data || data.length === 0) {
          return { success: false, error: 'Máy chủ không ghi được hàng nào (quyền RLS).' };
        }
        return { success: true, error: null };
      }
      const { data, error } = await supabase.from('workshop_accessories').insert(payload).select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không tạo được hàng nào (quyền RLS).' };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi lưu phụ kiện.' };
    }
  }

  static async deleteMyAccessory(accessoryId: string, workshopProfileId: string): Promise<WriteResult> {
    try {
      const { data, error } = await supabase
        .from('workshop_accessories')
        .delete()
        .eq('id', accessoryId)
        .eq('workshop_id', workshopProfileId)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không xoá được hàng nào (quyền RLS).' };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi xoá phụ kiện.' };
    }
  }

  // --------------------------------------------------------------------------
  // W1b.4 — HÀNG ĐỢI VIỆC: đơn được giao CHO XƯỞNG NÀY (`orders.assigned_workshop_id`)
  // --------------------------------------------------------------------------
  static async getMyQueueOrders(partnerId: string | null): Promise<MyQueueResult> {
    if (!partnerId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id,order_number,date,estimated_delivery,status,status_stage_index,layer_progress,items,assigned_printer_id'
      )
      .eq('assigned_workshop_id', partnerId)
      .order('created_at', { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(WorkshopService.mapMyQueueOrder), error: null };
  }

  /**
   * Cập nhật tiến độ một đơn CỦA XƯỞNG NÀY.
   *
   * Chỉ ghi đúng các cột trong phạm vi: `status_stage_index`, `status`, `layer_progress`.
   * Lọc thêm `assigned_workshop_id = partnerId` để một lệnh gọi sai id cũng không chạm
   * đơn của xưởng khác. `.select('id')` để phát hiện trường hợp RLS chặn âm thầm
   * (PostgREST trả 200 + 0 hàng) — khi đó KHÔNG được báo thành công.
   */
  static async updateMyOrderProgress(input: MyOrderProgressInput): Promise<MyOrderProgressResult> {
    if (!input.partnerId) {
      return { success: false, error: 'Tài khoản chưa gắn mã đối tác xưởng — không thể cập nhật đơn.', updatedRows: 0 };
    }
    if (!Number.isInteger(input.stageIndex) || input.stageIndex < 0 || input.stageIndex > 7) {
      return { success: false, error: 'Nấc tiến độ không hợp lệ (chỉ nhận 0–7).', updatedRows: 0 };
    }

    const payload: Record<string, unknown> = {
      status_stage_index: input.stageIndex,
      status: input.status,
    };
    if (typeof input.layerProgress === 'number' && Number.isFinite(input.layerProgress)) {
      const clamped = Math.max(0, Math.min(100, Math.round(input.layerProgress)));
      payload.layer_progress = clamped;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', input.orderId)
        .eq('assigned_workshop_id', input.partnerId)
        .select('id');

      if (error) return { success: false, error: error.message, updatedRows: 0 };
      const updatedRows = data ? data.length : 0;
      if (updatedRows === 0) {
        return {
          success: false,
          error:
            'Máy chủ không cập nhật hàng nào (đơn không thuộc xưởng này hoặc tài khoản chưa được cấp quyền sửa đơn). Chưa có thay đổi nào được lưu.',
          updatedRows: 0,
        };
      }
      return { success: true, error: null, updatedRows };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi cập nhật tiến độ đơn.', updatedRows: 0 };
    }
  }

  // --------------------------------------------------------------------------
  // W1b.5 — DANH MỤC THAM CHIẾU CỦA NỀN TẢNG (`printer_fleet`, `materials`)
  // Chỉ dùng để GỢI Ý thông số khi xưởng khai báo máy/vật liệu của mình. KHÔNG hiển thị
  // như tài sản của xưởng và KHÔNG dùng để tính bất kỳ số liệu tổng nào.
  // --------------------------------------------------------------------------
  static async getPrinterFleetCatalog(): Promise<PrinterFleetCatalogResult> {
    const { data, error } = await supabase
      .from('printer_fleet')
      .select('id,name,brand,model,technology,bed_dimensions,power_kw,status')
      .order('name', { ascending: true });
    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as unknown as PrinterFleetRef[], error: null };
  }

  static async getMaterialsCatalog(): Promise<MaterialCatalogResult> {
    const { data, error } = await supabase
      .from('materials')
      .select('id,name,brand,type,density,cost_per_kg')
      .order('name', { ascending: true });
    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as unknown as MaterialCatalogRef[], error: null };
  }

  // --------------------------------------------------------------------------
  // W1b.6 — HÀM ÁNH XẠ / TIỆN ÍCH NỘI BỘ
  // --------------------------------------------------------------------------
  private static computeStockStatus(grams: number | null, threshold: number | null): string {
    // Chưa khai tồn ⇒ KHÔNG kết luận hết hàng/sắp hết (tránh biến "chưa khai" thành 0 g).
    if (grams === null || grams === undefined) return 'Tracking';
    if (grams <= 0) return 'OutOfStock';
    if (threshold !== null && threshold !== undefined && grams <= threshold) return 'LowStock';
    return 'Tracking';
  }

  private static mapMyWorkshopProfile(d: Record<string, unknown>): MyWorkshopProfile {
    return {
      id: String(d.id ?? ''),
      userId: d.user_id ? String(d.user_id) : null,
      partnerId: d.partner_id ? String(d.partner_id) : null,
      workshopName: String(d.workshop_name ?? ''),
      address: String(d.address ?? ''),
      region: String(d.region ?? ''),
      verifiedStatus: String(d.verified_status ?? 'Pending'),
      contactPhone: String(d.contact_phone ?? ''),
      contactEmail: String(d.contact_email ?? ''),
      electricityRateOverride: WorkshopService.toNumberOrNull(d.electricity_rate_override),
      laborRateOverride: WorkshopService.toNumberOrNull(d.labor_rate_override),
      totalMachines: WorkshopService.toNumberOrNull(d.total_machines),
      activeMachinesNow: WorkshopService.toNumberOrNull(d.active_machines_now),
      createdAt: d.created_at ? String(d.created_at) : null,
      updatedAt: d.updated_at ? String(d.updated_at) : null,
    };
  }

  private static mapMyMachine(d: Record<string, unknown>): MyMachine {
    const bed = (d.bed_dimensions ?? null) as Record<string, unknown> | null;
    return {
      id: String(d.id ?? ''),
      workshopId: String(d.workshop_id ?? ''),
      name: String(d.name ?? ''),
      brand: String(d.brand ?? ''),
      model: String(d.model ?? ''),
      technology: String(d.technology ?? ''),
      status: String(d.status ?? ''),
      hourlyRate: WorkshopService.toNumberOrNull(d.hourly_rate),
      bedDimensions: bed
        ? {
            x: WorkshopService.toNumberOrNull(bed.x) ?? 0,
            y: WorkshopService.toNumberOrNull(bed.y) ?? 0,
            z: WorkshopService.toNumberOrNull(bed.z) ?? 0,
          }
        : null,
      createdAt: d.created_at ? String(d.created_at) : null,
      updatedAt: d.updated_at ? String(d.updated_at) : null,
    };
  }

  private static mapMyMaterial(d: Record<string, unknown>): MyMaterial {
    return {
      id: String(d.id ?? ''),
      workshopId: String(d.workshop_id ?? ''),
      name: String(d.name ?? ''),
      type: String(d.type ?? ''),
      color: String(d.color ?? ''),
      currentStockGrams: WorkshopService.toNumberOrNull(d.current_stock_grams),
      lowStockThresholdGrams: WorkshopService.toNumberOrNull(d.low_stock_threshold_grams),
      pricePerKg: WorkshopService.toNumberOrNull(d.price_per_kg),
      stockStatus: String(d.stock_status ?? ''),
      createdAt: d.created_at ? String(d.created_at) : null,
      updatedAt: d.updated_at ? String(d.updated_at) : null,
    };
  }

  private static mapMyInventoryLog(d: Record<string, unknown>): MyInventoryLog {
    return {
      id: String(d.id ?? ''),
      materialId: String(d.material_id ?? ''),
      action: String(d.action ?? ''),
      grams: WorkshopService.toNumberOrNull(d.grams),
      pricePerKgAtTime: WorkshopService.toNumberOrNull(d.price_per_kg_at_time),
      supplier: String(d.supplier ?? ''),
      batchCode: String(d.batch_code ?? ''),
      note: String(d.note ?? ''),
      createdBy: String(d.created_by ?? ''),
      createdAt: d.created_at ? String(d.created_at) : null,
    };
  }

  private static mapMyAccessory(d: Record<string, unknown>): MyAccessory {
    return {
      id: String(d.id ?? ''),
      workshopId: String(d.workshop_id ?? ''),
      name: String(d.name ?? ''),
      unit: String(d.unit ?? ''),
      quantity: WorkshopService.toNumberOrNull(d.quantity),
      costPrice: WorkshopService.toNumberOrNull(d.cost_price),
      sellingPrice: WorkshopService.toNumberOrNull(d.selling_price),
      sku: String(d.sku ?? ''),
      isActive: d.is_active === true,
      createdAt: d.created_at ? String(d.created_at) : null,
      updatedAt: d.updated_at ? String(d.updated_at) : null,
    };
  }

  private static mapMyQueueOrder(d: Record<string, unknown>): MyQueueOrder {
    const rawItems = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
    return {
      id: String(d.id ?? ''),
      orderNumber: String(d.order_number ?? ''),
      date: d.date ? String(d.date) : null,
      estimatedDelivery: d.estimated_delivery ? String(d.estimated_delivery) : '',
      status: String(d.status ?? ''),
      statusStageIndex: WorkshopService.toNumberOrNull(d.status_stage_index),
      layerProgress: WorkshopService.toNumberOrNull(d.layer_progress),
      assignedPrinterId: d.assigned_printer_id ? String(d.assigned_printer_id) : null,
      items: rawItems.map((it) => ({
        id: String(it.id ?? ''),
        name: String(it.name ?? ''),
        quantity: WorkshopService.toNumberOrNull(it.quantity) ?? 0,
        material: it.material ? String(it.material) : null,
        color: it.color ? String(it.color) : null,
      })),
    };
  }

  private static toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}

// ============================================================================
// W1b — KIỂU DỮ LIỆU CHO BẢNG ĐIỀU KHIỂN XƯỞNG
//
// Các kiểu dưới đây phản ánh ĐÚNG cột đang tồn tại trên project thật (kiểm chứng bằng
// OpenAPI của PostgREST). Chúng KHÔNG dùng `WorkshopMachine`/`WorkshopMaterial` trong
// `src/types/index.ts` vì hai kiểu đó mô tả cột không tồn tại (`machine_name`,
// `avg_power_kw`, `current_stock_grams`…) — dùng chúng sẽ cho ra `undefined` hàng loạt.
// ============================================================================

export interface WriteResult {
  success: boolean;
  error: string | null;
}

export interface MyWorkshopProfile {
  id: string;
  userId: string | null;
  /** `null` = tài khoản chưa được gắn đối tác ⇒ không thể nhận đơn. */
  partnerId: string | null;
  workshopName: string;
  address: string;
  region: string;
  verifiedStatus: string;
  contactPhone: string;
  contactEmail: string;
  /** `null` = CHƯA CẤU HÌNH (rỗng). KHÔNG được thay bằng một số mặc định. */
  electricityRateOverride: number | null;
  /** `null` = CHƯA CẤU HÌNH (rỗng). KHÔNG được thay bằng một số mặc định. */
  laborRateOverride: number | null;
  totalMachines: number | null;
  activeMachinesNow: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyWorkshopProfileResult {
  profile: MyWorkshopProfile | null;
  error: string | null;
  /** > 1 = user có nhiều hồ sơ xưởng (bảng KHÔNG có unique trên `user_id`). */
  duplicateCount: number;
}

export interface MyWorkshopProfilePatch {
  workshopName?: string;
  address?: string;
  region?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** `null` = xoá cấu hình (ô để trống). */
  electricityRateOverride?: number | null;
  laborRateOverride?: number | null;
}

/** Một máy in do CHÍNH xưởng khai báo (`workshop_machines`). */
export interface MyMachine {
  id: string;
  workshopId: string;
  name: string;
  brand: string;
  model: string;
  technology: string;
  status: string;
  /** `null` = xưởng chưa khai đơn giá giờ máy. */
  hourlyRate: number | null;
  bedDimensions: { x: number; y: number; z: number } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyMachinesResult {
  data: MyMachine[];
  error: string | null;
}

export interface MyMachineInput {
  id?: string;
  workshopProfileId: string;
  name: string;
  brand?: string;
  model?: string;
  technology?: string;
  status?: string;
  hourlyRate?: number | null;
  bedDimensions?: { x: number; y: number; z: number };
}

/** Một vật liệu của CHÍNH xưởng (`workshop_materials`). */
export interface MyMaterial {
  id: string;
  workshopId: string;
  name: string;
  type: string;
  color: string;
  /** `null` = chưa từng ghi nhận tồn (KHÁC `0`). */
  currentStockGrams: number | null;
  lowStockThresholdGrams: number | null;
  /** `null` = xưởng chưa khai đơn giá vật liệu. */
  pricePerKg: number | null;
  stockStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyMaterialsResult {
  data: MyMaterial[];
  error: string | null;
}

export interface MyMaterialInput {
  id?: string;
  workshopProfileId: string;
  name: string;
  type?: string;
  color?: string;
  currentStockGrams?: number | null;
  lowStockThresholdGrams?: number | null;
  pricePerKg?: number | null;
  stockStatus?: string;
}

/** Một dòng sổ kho của xưởng (`material_inventory_logs`). */
export interface MyInventoryLog {
  id: string;
  materialId: string;
  action: string;
  grams: number | null;
  pricePerKgAtTime: number | null;
  supplier: string;
  batchCode: string;
  note: string;
  createdBy: string;
  createdAt: string | null;
}

export interface MyInventoryLogsResult {
  data: MyInventoryLog[];
  error: string | null;
}

export interface MyInventoryLogInput {
  workshopProfileId: string;
  materialId: string;
  action: 'Import' | 'Export' | 'Adjustment';
  grams: number;
  pricePerKgAtTime?: number | null;
  supplier?: string;
  batchCode?: string;
  note?: string;
  /** Danh tính THẬT của người ghi phiếu (email phiên đăng nhập). */
  createdBy?: string;
}

export interface MyInventoryLogResult extends WriteResult {
  /** `false` = phiếu đã ghi nhưng tồn kho CHƯA cập nhật ⇒ view phải nói đúng. */
  stockUpdated: boolean;
  newStockGrams: number | null;
}

/** Một phụ kiện riêng của xưởng (`workshop_accessories`). */
export interface MyAccessory {
  id: string;
  workshopId: string;
  name: string;
  unit: string;
  quantity: number | null;
  costPrice: number | null;
  sellingPrice: number | null;
  sku: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyAccessoriesResult {
  data: MyAccessory[];
  error: string | null;
}

export interface MyAccessoryInput {
  id?: string;
  workshopProfileId: string;
  name: string;
  unit?: string;
  quantity?: number;
  costPrice?: number | null;
  sellingPrice?: number | null;
  sku?: string;
  isActive?: boolean;
}

export interface MyQueueItem {
  id: string;
  name: string;
  quantity: number;
  material: string | null;
  color: string | null;
}

/** Một đơn được giao CHO XƯỞNG NÀY (`orders.assigned_workshop_id = partner_id`). */
export interface MyQueueOrder {
  id: string;
  orderNumber: string;
  date: string | null;
  estimatedDelivery: string;
  status: string;
  /** `null` = xưởng chưa báo nấc nào. */
  statusStageIndex: number | null;
  /** `null` = máy in chưa báo tiến độ lớp. */
  layerProgress: number | null;
  assignedPrinterId: string | null;
  items: MyQueueItem[];
}

export interface MyQueueResult {
  data: MyQueueOrder[];
  error: string | null;
}

export interface MyOrderProgressInput {
  orderId: string;
  /** `orders.assigned_workshop_id` của xưởng đang đăng nhập — chốt phạm vi ở tầng truy vấn. */
  partnerId: string | null;
  /** 0..7, khớp `MES_PIPELINE_STAGES` trong `OrderProgress.tsx`. */
  stageIndex: number;
  status: string;
  layerProgress?: number | null;
}

export interface MyOrderProgressResult extends WriteResult {
  updatedRows: number;
}

export interface PrinterFleetRef {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  technology?: string | null;
  bed_dimensions?: { x?: number; y?: number; z?: number } | null;
  power_kw?: number | null;
  status?: string | null;
}

export interface PrinterFleetCatalogResult {
  data: PrinterFleetRef[];
  error: string | null;
}

export interface MaterialCatalogRef {
  id: string;
  name: string;
  brand?: string | null;
  type?: string | null;
  density?: number | null;
  cost_per_kg?: number | null;
}

export interface MaterialCatalogResult {
  data: MaterialCatalogRef[];
  error: string | null;
}

/** Nhãn trạng thái đơn — khớp union `Order['status']` trong `src/types/index.ts`. */
export const MY_ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  processing: 'Đang xử lý',
  printing: 'Đang in',
  post_processing: 'Hậu kỳ',
  packaging: 'Đóng gói',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

/**
 * Nấc thứ i (0..7) ⇒ `orders.status` thô. Giữ `status` đồng bộ với `status_stage_index`
 * vì `MyOrdersView` suy nấc từ `status` khi `status_stage_index` rỗng.
 */
export const MY_ORDER_STATUS_BY_STAGE: string[] = [
  'processing',
  'processing',
  'processing',
  'printing',
  'printing',
  'post_processing',
  'post_processing',
  'shipping',
];

/** Trạng thái máy in xưởng tự đặt (`workshop_machines.status`, không có CHECK ở DB). */
export const MY_MACHINE_STATUSES = ['Free', 'Busy', 'Maintenance', 'Offline'] as const;

export const MY_MACHINE_STATUS_LABELS: Record<string, string> = {
  Free: 'Rảnh',
  Busy: 'Đang in',
  Maintenance: 'Bảo trì',
  Offline: 'Tắt máy',
};

export const workshopService = WorkshopService;
