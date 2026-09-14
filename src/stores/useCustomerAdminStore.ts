import { create } from 'zustand';
import { supabase } from '../backend/supabase/client';

/* ============================================================================
 * KHÁCH HÀNG — ĐỌC/GHI BẢNG THẬT `customer_profiles`
 *
 * VÌ SAO KHÔNG dùng `WorkshopService.getCustomerProfiles()` / `saveCustomerProfile()`
 * (có sẵn ở `src/backend/services/workshopService.ts:1018,1054`):
 *   1. ĐỌC: khi bảng RỖNG **hoặc truy vấn LỖI** hàm đó đều trả về
 *      `readFromStorage(..., SEED_CUSTOMER_PROFILES)` — một hồ sơ khách BỊA — và KHÔNG có
 *      kênh lỗi ⇒ màn quản trị không thể phân biệt "bảng rỗng" với "đọc lỗi"
 *      (đúng thứ `docs/design/data-honesty.md` cấm).
 *   2. GHI: hàm đó upsert `company_name` / `billing_email` / `preferred_payment_method` /
 *      `default_shipping_address` — cột của migration CŨ
 *      (`supabase/legacy/20260905_role_profiles_and_pricing_schema.sql`, README ghi
 *      "KHÔNG CHẠY"), không có trong baseline đang dùng.
 *
 * Nguyên tắc ở đây giống hệt store designer: ĐỌC `select('*')` rồi map theo cột CÓ THẬT
 * (thiếu cột ⇒ `null` ⇒ UI hiện '—'), GHI chỉ cột đã thấy trong dòng đọc được, và lỗi được
 * trả về nguyên văn — không fixture, không localStorage, không "thành công giả".
 *
 * LƯU Ý: `customer_profiles` KHÔNG có cột tên/email người dùng ở baseline — danh tính nằm
 * ở `user_profiles` (ghép theo `user_id`); `Group3CustomersPanel` ghép bằng `dbService.getUsers()`.
 * ========================================================================== */

export interface CustomerRow {
  id: string;
  userId: string | null;
  /** `display_name` (baseline). */
  profileName: string | null;
  /** `company_name` (schema cũ) hoặc `company` (baseline). */
  companyName: string | null;
  taxId: string | null;
  /** `billing_email` (schema cũ) — baseline không có cột này. */
  billingEmail: string | null;
  /** `phone` (baseline). */
  phone: string | null;
  /** `business_address` (baseline). */
  businessAddress: string | null;
  /** `preferred_payment_method` (schema cũ) — baseline không có cột này. */
  preferredPaymentMethod: string | null;
  /** `default_shipping_address` (schema cũ) — baseline không có cột này. */
  shippingAddress: Record<string, any> | null;
  ndaSigned: boolean;
  ndaSignedAt: string | null;
  createdAt: string | null;
}

export interface CustomerAdminFilters {
  customerType: 'all' | 'B2B' | 'B2C';
  /**
   * `customer_profiles` chỉ có `nda_signed` boolean ⇒ chỉ có 2 trạng thái THẬT.
   * Trạng thái "chờ duyệt" không tồn tại ở tầng dữ liệu nên đã bỏ khỏi bộ lọc.
   */
  ndaStatus: 'all' | 'Signed' | 'None';
  searchQuery: string;
}

export interface CustomerAdminStats {
  totalCustomers: number;
  b2bCount: number;
  b2cCount: number;
  signedNDACount: number;
}

export interface CustomerAdminState {
  customers: CustomerRow[];
  /** Tên cột THẬT của `customer_profiles` (lấy từ dòng đầu tiên đọc được). */
  customerColumns: string[];
  isLoading: boolean;
  error: string | null;
  filters: CustomerAdminFilters;

  setFilterCustomerType: (type: CustomerAdminFilters['customerType']) => void;
  setFilterNdaStatus: (status: CustomerAdminFilters['ndaStatus']) => void;
  setSearchQuery: (query: string) => void;

  loadCustomers: () => Promise<void>;
  setNdaSigned: (
    customerId: string,
    signed: boolean
  ) => Promise<{ success: boolean; error?: string }>;

  getCustomerStats: () => CustomerAdminStats;
}

const strOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Dòng `customer_profiles` (cột nào có thì đọc cột đó) → `CustomerRow`. Không bịa mặc định. */
export const rowToCustomerRow = (d: Record<string, any>): CustomerRow => ({
  id: String(d.id),
  userId: strOrNull(d.user_id),
  profileName: strOrNull(d.display_name),
  companyName: strOrNull(d.company_name ?? d.company),
  taxId: strOrNull(d.tax_id),
  billingEmail: strOrNull(d.billing_email),
  phone: strOrNull(d.phone),
  businessAddress: strOrNull(d.business_address),
  preferredPaymentMethod: strOrNull(d.preferred_payment_method),
  shippingAddress:
    d.default_shipping_address && typeof d.default_shipping_address === 'object'
      ? d.default_shipping_address
      : null,
  ndaSigned: d.nda_signed === true,
  ndaSignedAt: strOrNull(d.nda_signed_at),
  createdAt: strOrNull(d.created_at)
});

/** B2B = hồ sơ có tên công ty hoặc mã số thuế (suy ra từ dữ liệu thật, không có cột "loại khách"). */
export const isB2b = (row: CustomerRow): boolean => Boolean(row.companyName || row.taxId);

export const useCustomerAdminStore = create<CustomerAdminState>((set, get) => ({
  customers: [],
  customerColumns: [],
  isLoading: false,
  error: null,
  filters: {
    customerType: 'all',
    ndaStatus: 'all',
    searchQuery: ''
  },

  setFilterCustomerType: (customerType) =>
    set((state) => ({ filters: { ...state.filters, customerType } })),

  setFilterNdaStatus: (ndaStatus) =>
    set((state) => ({ filters: { ...state.filters, ndaStatus } })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({ filters: { ...state.filters, searchQuery } })),

  loadCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        set({ customers: [], customerColumns: [], isLoading: false, error: error.message });
        return;
      }
      const rows = (data ?? []) as Record<string, any>[];
      set({
        customers: rows.map(rowToCustomerRow),
        customerColumns: rows.length > 0 ? Object.keys(rows[0]) : [],
        isLoading: false,
        error: null
      });
    } catch (e: any) {
      set({
        customers: [],
        customerColumns: [],
        isLoading: false,
        error: e?.message || 'Lỗi không xác định khi đọc customer_profiles.'
      });
    }
  },

  setNdaSigned: async (customerId, signed) => {
    const columns = get().customerColumns;
    if (columns.length > 0 && !columns.includes('nda_signed')) {
      return {
        success: false,
        error: 'Bảng customer_profiles không có cột nda_signed — không có gì được ghi.'
      };
    }

    const payload: Record<string, unknown> = {
      nda_signed: signed,
      // Thu hồi NDA ⇒ xoá luôn mốc ký, không để lại ngày ký cũ cạnh trạng thái "chưa ký".
      nda_signed_at: signed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .update(payload)
        .eq('id', customerId)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Máy chủ không ghi được hàng nào (quyền RLS) — chưa có thay đổi nào được lưu.'
        };
      }
      await get().loadCustomers();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi lưu trạng thái NDA.' };
    }
  },

  getCustomerStats: () => {
    const { customers } = get();
    const b2bCount = customers.filter(isB2b).length;
    return {
      totalCustomers: customers.length,
      b2bCount,
      b2cCount: customers.length - b2bCount,
      signedNDACount: customers.filter((c) => c.ndaSigned).length
    };
  }
}));
