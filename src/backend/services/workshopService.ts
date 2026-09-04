import { supabase } from '../supabase/client';
import {
  WorkshopProfile,
  WorkshopMachine,
  WorkshopMaterial,
  MaterialInventoryLog,
  DesignerProfile,
  CustomerProfile,
  PricingGlobalSettings,
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
    contactPhone: '0988.123.456',
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
    contactPhone: '0905.789.101',
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
    contactPhone: '0912.345.678',
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
    createdBy: 'Thành Kỹ Thuật (Admin)',
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
    payoutBankInfo: 'Techcombank - 19033488291012 - HOANG BACH',
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
    payoutBankInfo: 'MB Bank - 0988112233 - LE MINH TRI',
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
    companyName: 'FPT Software Smart Device R&D',
    taxId: '0101778163',
    billingEmail: 'hardware-rnd@fpt.com',
    preferredPaymentMethod: 'vietqr',
    defaultShippingAddress: {
      recipientName: 'Vũ Anh Tuấn (Team IoT Hub)',
      phone: '0988.777.666',
      streetAddress: 'Tòa nhà FPT Cầu Giấy, Số 10 Phạm Văn Bạch',
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
    companyName: 'Khoa Đăng Tech Studio',
    billingEmail: 'khoa.dang@gmail.com',
    preferredPaymentMethod: 'vietqr',
    defaultShippingAddress: {
      recipientName: 'Đặng Đăng Khoa',
      phone: '0912.888.999',
      streetAddress: 'Số 45 Lê Duẩn, Phường Bến Nghé',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh'
    },
    ndaSigned: false,
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z'
  }
];

export const SEED_PRICING_GLOBAL_SETTINGS: PricingGlobalSettings = {
  id: 'default',
  electricityRateVndKwh: 2850,
  defaultLaborRateVndHour: 65000,
  defaultScrapRatePercent: 5,
  profitMode: 'Markup',
  defaultProfitPercent: 35,
  marketplaceFeePercent: 8,
  marketplaceFixedFeeVnd: 5000,
  overheadMonthlyCost: 15000000,
  avgProductsSoldPerMonth: 300,
  enableAccessoriesPricing: true,
  enableMarketplaceFeeMode: false,
  enableAdvancedOverhead: true,
  version: 1,
  updatedBy: 'VCUBE Chief Operating Officer',
  updatedAt: '2026-09-05T00:00:00.000Z'
};

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

    try {
      const { error } = await supabase.from('workshop_profiles').upsert({
        id: fullProfile.id,
        user_id: fullProfile.userId || null,
        partner_id: fullProfile.partnerId || null,
        workshop_name: fullProfile.workshopName,
        address: fullProfile.address,
        region: fullProfile.region,
        total_machines: fullProfile.totalMachines,
        active_machines_now: fullProfile.activeMachinesNow,
        electricity_rate_override: fullProfile.electricityRateOverride,
        labor_rate_override: fullProfile.laborRateOverride,
        verified_status: fullProfile.verifiedStatus,
        contact_phone: fullProfile.contactPhone,
        contact_email: fullProfile.contactEmail,
        updated_at: fullProfile.updatedAt
      });
      if (error) throw error;
      return { success: true, data: fullProfile };
    } catch (e: any) {
      return { success: true, data: fullProfile, error: e?.message };
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
      return { success: true, error: e?.message };
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
      return { success: true, data: fullMachine, error: e?.message };
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
      return { success: true, error: e?.message };
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
      return { success: true, error: e?.message };
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
      return { success: true, data: fullMat, error: e?.message };
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
      return { success: true, error: e?.message };
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
      return { success: true, error: e?.message };
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
      return { success: true, data: fullLog, error: e?.message };
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
      return { success: true, data: fullProfile, error: e?.message };
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
      return { success: true, error: e?.message };
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
      return { success: true, data: fullProfile, error: e?.message };
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
      return { success: true, error: e?.message };
    }
  }

  // ----------------------------------------------------------------------------
  // 7. PRICING GLOBAL SETTINGS (pricing_global_settings)
  // ----------------------------------------------------------------------------
  static async getPricingGlobalSettings(): Promise<PricingGlobalSettings> {
    try {
      const { data, error } = await supabase
        .from('pricing_global_settings')
        .select('*')
        .eq('id', 'default')
        .limit(1)
        .single();

      if (!error && data) {
        const mapped: PricingGlobalSettings = {
          id: data.id,
          electricityRateVndKwh: Number(data.electricity_rate_vnd_kwh || 2850),
          defaultLaborRateVndHour: Number(data.default_labor_rate_vnd_hour || 65000),
          defaultScrapRatePercent: Number(data.default_scrap_rate_percent || 5),
          profitMode: data.profit_mode || 'Markup',
          defaultProfitPercent: Number(data.default_profit_percent || 35),
          marketplaceFeePercent: Number(data.marketplace_fee_percent || 8),
          marketplaceFixedFeeVnd: Number(data.marketplace_fixed_fee_vnd || 5000),
          overheadMonthlyCost: Number(data.overhead_monthly_cost || 15000000),
          avgProductsSoldPerMonth: Number(data.avg_products_sold_per_month || 300),
          enableAccessoriesPricing: Boolean(data.enable_accessories_pricing ?? true),
          enableMarketplaceFeeMode: Boolean(data.enable_marketplace_fee_mode ?? false),
          enableAdvancedOverhead: Boolean(data.enable_advanced_overhead ?? true),
          version: Number(data.version || 1),
          updatedBy: data.updated_by,
          updatedAt: data.updated_at
        };
        writeToStorage(STORAGE_KEYS.PRICING_SETTINGS, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[WorkshopService] Supabase getPricingGlobalSettings fallback to local:', e);
    }
    return readFromStorage<PricingGlobalSettings>(STORAGE_KEYS.PRICING_SETTINGS, SEED_PRICING_GLOBAL_SETTINGS);
  }

  static async savePricingGlobalSettings(
    settings: Partial<PricingGlobalSettings>
  ): Promise<{ success: boolean; data?: PricingGlobalSettings; error?: string }> {
    const current = await WorkshopService.getPricingGlobalSettings();
    const updated: PricingGlobalSettings = {
      ...current,
      ...settings,
      id: 'default',
      version: (current.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };

    writeToStorage(STORAGE_KEYS.PRICING_SETTINGS, updated);

    try {
      const { error } = await supabase.from('pricing_global_settings').upsert({
        id: 'default',
        electricity_rate_vnd_kwh: updated.electricityRateVndKwh,
        default_labor_rate_vnd_hour: updated.defaultLaborRateVndHour,
        default_scrap_rate_percent: updated.defaultScrapRatePercent,
        profit_mode: updated.profitMode,
        default_profit_percent: updated.defaultProfitPercent,
        marketplace_fee_percent: updated.marketplaceFeePercent,
        marketplace_fixed_fee_vnd: updated.marketplaceFixedFeeVnd,
        overhead_monthly_cost: updated.overheadMonthlyCost,
        avg_products_sold_per_month: updated.avgProductsSoldPerMonth,
        enable_accessories_pricing: updated.enableAccessoriesPricing,
        enable_marketplace_fee_mode: updated.enableMarketplaceFeeMode,
        enable_advanced_overhead: updated.enableAdvancedOverhead,
        version: updated.version,
        updated_by: updated.updatedBy || 'admin',
        updated_at: updated.updatedAt
      });
      if (error) throw error;
      return { success: true, data: updated };
    } catch (e: any) {
      return { success: true, data: updated, error: e?.message };
    }
  }

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
      return { success: true, data: fullAcc, error: e?.message };
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
      return { success: true, error: e?.message };
    }
  }
}

export const workshopService = WorkshopService;