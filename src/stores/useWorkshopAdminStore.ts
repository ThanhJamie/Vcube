import { create } from 'zustand';
import { supabase } from '../backend/supabase/client';
import { WorkshopProfile, WorkshopMachine, WorkshopMaterial } from '../types';

export interface WorkshopFilterState {
  region: 'all' | 'Bắc' | 'Trung' | 'Nam';
  status: 'all' | 'Pending' | 'Verified' | 'Suspended';
  searchQuery: string;
}

/**
 * Dữ liệu ĐỦ ĐỂ TẠO một xưởng mới — chỉ những trường form thật sự thu thập.
 * `totalMachines` / `activeMachinesNow` KHÔNG có ở đây: modal không có ô nhập nào cho
 * chúng, nên để cột tự nhận default của DB thay vì ghi số bịa (trước đây là 2 máy).
 */
export interface WorkshopDraft {
  workshopName: string;
  address: string;
  region: WorkshopProfile['region'];
  verifiedStatus: WorkshopProfile['verifiedStatus'];
  contactPhone?: string;
  contactEmail?: string;
  /** `null`/bỏ trống = CHƯA KHAI (cột nullable), KHÔNG rơi về 2.850đ. */
  electricityRateOverride?: number | null;
  /** `null`/bỏ trống = CHƯA KHAI (cột nullable), KHÔNG rơi về 65.000đ. */
  laborRateOverride?: number | null;
}

export interface WorkshopAdminState {
  workshops: WorkshopProfile[];
  /** Tên cột THẬT của `workshop_profiles` (lấy từ dòng đầu tiên đọc được). */
  workshopColumns: string[];
  workshopsLoading: boolean;
  /** Lỗi THẬT của truy vấn — không bao giờ bị nuốt thành "0 xưởng". */
  workshopsError: string | null;
  materials: WorkshopMaterial[];
  filters: WorkshopFilterState;
  selectedWorkshopId: string | null;

  // Actions for Workshops
  setFilterRegion: (region: WorkshopFilterState['region']) => void;
  setFilterStatus: (status: WorkshopFilterState['status']) => void;
  setSearchQuery: (query: string) => void;
  setSelectedWorkshopId: (id: string | null) => void;

  loadWorkshops: () => Promise<void>;
  setWorkshopVerifiedStatus: (
    id: string,
    status: WorkshopProfile['verifiedStatus']
  ) => Promise<{ success: boolean; error?: string }>;
  addWorkshop: (workshop: WorkshopDraft) => Promise<{ success: boolean; error?: string }>;
  updateWorkshop: (id: string, updates: Partial<WorkshopProfile>) => void;
  deleteWorkshop: (id: string) => void;

  // Actions for Materials
  updateMaterialStock: (materialId: string, newStockGrams: number) => void;
  addMaterial: (material: Omit<WorkshopMaterial, 'id' | 'createdAt' | 'updatedAt' | 'stockStatus'> & { stockStatus?: WorkshopMaterial['stockStatus'] }) => void;
  updateMaterial: (materialId: string, updates: Partial<WorkshopMaterial>) => void;
  deleteMaterial: (materialId: string) => void;

  // Computations / Helpers
  getDepreciationPerHour: (machine: WorkshopMachine) => number;
  getElectricityPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => number;
  getMachineTotalRunningCostPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => number;
  getLowStockMaterials: () => WorkshopMaterial[];
  getWorkshopStats: () => {
    totalWorkshops: number;
    verifiedCount: number;
    pendingCount: number;
    suspendedCount: number;
    lowStockMaterialsCount: number;
  };
}

const DEFAULT_ELECTRICITY_RATE_VND = 2850;

/* ── DANH SÁCH XƯỞNG: ĐỌC/GHI BẢNG THẬT `workshop_profiles` ──────────────────────
 * VÌ SAO KHÔNG dùng `WorkshopService.getWorkshopProfiles()` (`workshopService.ts:458`):
 * khi bảng RỖNG **hoặc truy vấn LỖI** hàm đó trả `readFromStorage(..., SEED_WORKSHOP_PROFILES)`
 * — 6 xưởng BỊA (12/6/8/4/24/5 máy, đơn giá điện 2.750–3.100đ, lương 55.000–75.000đ/h)
 * đúng bộ số mà `docs/design/data-honesty.md` AD-05/CI-05 đã buộc gỡ khỏi store, và nó
 * không có kênh lỗi. Ở đây: `select('*')` rồi map theo cột CÓ THẬT, lỗi trả nguyên văn.
 * ────────────────────────────────────────────────────────────────────────────── */

const strOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

export const rowToWorkshopProfile = (d: Record<string, any>): WorkshopProfile => ({
  id: String(d.id),
  userId: strOrNull(d.user_id) ?? undefined,
  partnerId: strOrNull(d.partner_id) ?? undefined,
  workshopName: strOrNull(d.workshop_name) || '',
  address: strOrNull(d.address) || '',
  region: (strOrNull(d.region) || 'Bắc') as WorkshopProfile['region'],
  totalMachines: numOrNull(d.total_machines) ?? 0,
  activeMachinesNow: numOrNull(d.active_machines_now) ?? 0,
  electricityRateOverride: numOrNull(d.electricity_rate_override) ?? undefined,
  laborRateOverride: numOrNull(d.labor_rate_override) ?? undefined,
  verifiedStatus: (strOrNull(d.verified_status) || 'Pending') as WorkshopProfile['verifiedStatus'],
  contactPhone: strOrNull(d.contact_phone) ?? undefined,
  contactEmail: strOrNull(d.contact_email) ?? undefined,
  createdAt: strOrNull(d.created_at) ?? undefined,
  updatedAt: strOrNull(d.updated_at) ?? undefined
});

/* ── ĐÃ XOÁ: `machines` + `approveWorkshop`/`suspendWorkshop`/`reactivateWorkshop` ──
 * `INITIAL_MACHINES = []` + `updateMachineStatus`/`addMachine`/… chỉ được
 * `Group1WorkshopsPanel` đọc, và panel đó hiển thị "TỔNG MÁY IN 0" trong khi bảng thật
 * `printer_fleet` có dữ liệu. Tab "Đội Máy (Fleet)" giờ đọc/ghi thẳng `printer_fleet`
 * (`dbService.getPrinters()` / `dbService.savePrinter()`, `database.ts:537,546`).
 * Ba hàm duyệt/tạm đình chỉ cũ chỉ sửa mảng RAM (mất khi reload) nên đã thay bằng
 * `setWorkshopVerifiedStatus()` ghi cột `workshop_profiles.verified_status`.
 * Ba hàm tính chi phí bên dưới được GIỮ vì panel vẫn dùng chúng trên dữ liệu thật.
 * ────────────────────────────────────────────────────────────────────────────── */

export const useWorkshopAdminStore = create<WorkshopAdminState>((set, get) => ({
  workshops: [],
  workshopColumns: [],
  workshopsLoading: false,
  workshopsError: null,
  materials: [],
  filters: {
    region: 'all',
    status: 'all',
    searchQuery: ''
  },
  selectedWorkshopId: null,

  setFilterRegion: (region) =>
    set((state) => ({ filters: { ...state.filters, region } })),

  setFilterStatus: (status) =>
    set((state) => ({ filters: { ...state.filters, status } })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({ filters: { ...state.filters, searchQuery } })),

  setSelectedWorkshopId: (selectedWorkshopId) =>
    set({ selectedWorkshopId }),

  loadWorkshops: async () => {
    set({ workshopsLoading: true, workshopsError: null });
    try {
      const { data, error } = await supabase
        .from('workshop_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        set({ workshops: [], workshopColumns: [], workshopsLoading: false, workshopsError: error.message });
        return;
      }
      const rows = (data ?? []) as Record<string, any>[];
      set({
        workshops: rows.map(rowToWorkshopProfile),
        workshopColumns: rows.length > 0 ? Object.keys(rows[0]) : [],
        workshopsLoading: false,
        workshopsError: null
      });
    } catch (e: any) {
      set({
        workshops: [],
        workshopColumns: [],
        workshopsLoading: false,
        workshopsError: e?.message || 'Lỗi không xác định khi đọc workshop_profiles.'
      });
    }
  },

  setWorkshopVerifiedStatus: async (id, status) => {
    // `verified_status` là cột ĐẶC QUYỀN: trigger của `20261010_harden_rls.sql` chỉ cho
    // admin đổi. Nếu RLS/trigger chặn, ta trả lỗi thật thay vì báo đã duyệt.
    try {
      const { data, error } = await supabase
        .from('workshop_profiles')
        .update({ verified_status: status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Máy chủ không ghi được hàng nào (quyền RLS) — chưa có thay đổi nào được lưu.'
        };
      }
      await get().loadWorkshops();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi lưu trạng thái xưởng.' };
    }
  },

  addWorkshop: async (workshopData) => {
    // Chỉ gửi cột có dữ liệu THẬT từ form. KHÔNG gửi `total_machines` /
    // `active_machines_now` (form cũ điền sẵn 2 máy nhưng không có ô nhập ⇒ đó là số bịa);
    // để cột tự nhận default của chính DB.
    const payload: Record<string, unknown> = {
      workshop_name: workshopData.workshopName,
      address: workshopData.address,
      region: workshopData.region,
      verified_status: workshopData.verifiedStatus
    };
    if (workshopData.contactPhone) payload.contact_phone = workshopData.contactPhone;
    if (workshopData.contactEmail) payload.contact_email = workshopData.contactEmail;
    if (workshopData.electricityRateOverride != null) {
      payload.electricity_rate_override = workshopData.electricityRateOverride;
    }
    if (workshopData.laborRateOverride != null) {
      payload.labor_rate_override = workshopData.laborRateOverride;
    }

    try {
      const { data, error } = await supabase.from('workshop_profiles').insert(payload).select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không tạo được hàng nào (quyền RLS).' };
      }
      await get().loadWorkshops();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi tạo xưởng.' };
    }
  },

  updateWorkshop: (id, updates) =>
    set((state) => ({
      workshops: state.workshops.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
      )
    })),

  deleteWorkshop: (id) =>
    set((state) => ({
      workshops: state.workshops.filter((w) => w.id !== id),
      materials: state.materials.filter((mat) => mat.workshopId !== id)
    })),

  updateMaterialStock: (materialId, newStockGrams) =>
    set((state) => ({
      materials: state.materials.map((mat) => {
        if (mat.id !== materialId) return mat;
        const threshold = mat.lowStockThresholdGrams ?? 1000;
        const stockStatus =
          newStockGrams <= 0
            ? 'OutOfStock'
            : newStockGrams <= threshold
            ? 'LowStock'
            : 'Tracking';
        return {
          ...mat,
          currentStockGrams: newStockGrams,
          stockStatus,
          updatedAt: new Date().toISOString()
        };
      })
    })),

  addMaterial: (materialData) => {
    const threshold = materialData.lowStockThresholdGrams ?? 1000;
    const stockStatus =
      materialData.currentStockGrams <= 0
        ? 'OutOfStock'
        : materialData.currentStockGrams <= threshold
        ? 'LowStock'
        : 'Tracking';

    const newMaterial: WorkshopMaterial = {
      ...materialData,
      id: `mat-${Date.now().toString(36)}`,
      stockStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => ({ materials: [newMaterial, ...state.materials] }));
  },

  updateMaterial: (materialId, updates) =>
    set((state) => ({
      materials: state.materials.map((mat) => {
        if (mat.id !== materialId) return mat;
        const updated = { ...mat, ...updates, updatedAt: new Date().toISOString() };
        if (updates.currentStockGrams !== undefined || updates.lowStockThresholdGrams !== undefined) {
          const threshold = updated.lowStockThresholdGrams ?? 1000;
          updated.stockStatus =
            updated.currentStockGrams <= 0
              ? 'OutOfStock'
              : updated.currentStockGrams <= threshold
              ? 'LowStock'
              : 'Tracking';
        }
        return updated;
      })
    })),

  deleteMaterial: (materialId) =>
    set((state) => ({
      materials: state.materials.filter((mat) => mat.id !== materialId)
    })),

  getDepreciationPerHour: (machine: WorkshopMachine) => {
    if (!machine.lifetimeHours || machine.lifetimeHours <= 0) return 0;
    return Math.round(machine.purchasePrice / machine.lifetimeHours);
  },

  getElectricityPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => {
    const rate = electricityRateOverride ?? DEFAULT_ELECTRICITY_RATE_VND;
    return Math.round(machine.avgPowerKW * rate);
  },

  getMachineTotalRunningCostPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => {
    const dep = get().getDepreciationPerHour(machine);
    const elec = get().getElectricityPerHour(machine, electricityRateOverride);
    return dep + elec;
  },

  getLowStockMaterials: () => {
    const { materials } = get();
    return materials.filter(
      (m) =>
        m.stockStatus === 'LowStock' ||
        m.stockStatus === 'OutOfStock' ||
        m.currentStockGrams <= (m.lowStockThresholdGrams ?? 1000)
    );
  },

  getWorkshopStats: () => {
    const { workshops, materials } = get();
    const verifiedCount = workshops.filter((w) => w.verifiedStatus === 'Verified').length;
    const pendingCount = workshops.filter((w) => w.verifiedStatus === 'Pending').length;
    const suspendedCount = workshops.filter((w) => w.verifiedStatus === 'Suspended').length;

    const lowStockMaterialsCount = materials.filter(
      (m) =>
        m.stockStatus === 'LowStock' ||
        m.stockStatus === 'OutOfStock' ||
        m.currentStockGrams <= (m.lowStockThresholdGrams ?? 1000)
    ).length;

    return {
      totalWorkshops: workshops.length,
      verifiedCount,
      pendingCount,
      suspendedCount,
      lowStockMaterialsCount
    };
  }
}));
