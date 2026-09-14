import { create } from 'zustand';
import { supabase } from '../backend/supabase/client';

/* ============================================================================
 * NHÀ THIẾT KẾ — ĐỌC/GHI BẢNG THẬT `designer_profiles`
 *
 * VÌ SAO KHÔNG dùng `WorkshopService.getDesignerProfiles()` / `saveDesignerProfile()`
 * (dù chúng có sẵn ở `src/backend/services/workshopService.ts:913,953`):
 *   1. ĐỌC: hàm đó `select('*')` rồi map theo schema CŨ, và khi bảng RỖNG **hoặc truy vấn
 *      LỖI** đều `return readFromStorage(..., SEED_DESIGNER_PROFILES)` — tức là trả về 2
 *      hồ sơ BỊA ("Hoàng Bách CAD/CAM" 18.450.000đ hoa hồng, "Minh Trí Industrial Design").
 *      Không có kênh lỗi ⇒ màn quản trị KHÔNG THỂ phân biệt "bảng rỗng" với "đọc lỗi", mà
 *      hiển thị 2 hồ sơ bịa như dữ liệu thật là đúng thứ `docs/design/data-honesty.md` cấm.
 *   2. GHI: `saveDesignerProfile()` upsert các cột `default_royalty_percent` / `license_mode`
 *      / `badge_tier` / `payout_bank_info` / `total_sales_count` — đó là cột của migration
 *      CŨ (`supabase/legacy/20260905_role_profiles_and_pricing_schema.sql`, README ghi rõ
 *      "KHÔNG CHẠY"), không có trong baseline đang dùng.
 *
 * Vì vậy store này đọc/ghi thẳng bảng, với 2 nguyên tắc:
 *   * ĐỌC `select('*')` (không bao giờ lỗi vì tên cột) rồi map theo cột CÓ THẬT; trường nào
 *     bảng không có ⇒ `null` ⇒ UI hiện '—'. KHÔNG có fixture, KHÔNG localStorage.
 *   * GHI chỉ những cột đã thấy trong dòng đọc được (`designerColumns`); thiếu cột ⇒ trả lỗi
 *     nói rõ tên cột, KHÔNG báo thành công giả.
 * ========================================================================== */

export interface DesignerRow {
  id: string;
  userId: string | null;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  portfolioUrl: string | null;
  bankName: string | null;
  bankAccount: string | null;
  taxId: string | null;
  /** `royalty_percent` (baseline) hoặc `default_royalty_percent` (schema cũ). `null` = chưa có. */
  royaltyPercent: number | null;
  /** `verified_status` — giá trị thật trong DB (`Pending` / `Verified`). */
  verifiedStatus: string | null;
  rating: number | null;
  /** `total_sales` (baseline) hoặc `total_sales_count` (schema cũ). */
  totalSales: number | null;
  /** `total_royalties_earned` — CHỈ có ở schema cũ; `null` = bảng không có cột này. */
  totalRoyaltiesEarned: number | null;
  /** `badge_tier` — CHỈ có ở schema cũ; `null` = bảng không có cột này. */
  badgeTier: string | null;
  createdAt: string | null;
}

export interface DesignerAdminFilters {
  badgeTier: 'all' | string;
  verifiedStatus: 'all' | string;
  searchQuery: string;
}

export interface DesignerAdminStats {
  totalDesigners: number;
  /** `null` = bảng không có cột `badge_tier` ⇒ KHÔNG được hiển thị 0 như số thật. */
  topCreatorsCount: number | null;
  verifiedEngineersCount: number | null;
  pioneerMakersCount: number | null;
  /** `null` = không có cột doanh thu ⇒ hiện '—'. */
  totalRoyaltiesPaidVnd: number | null;
  /** `null` = chưa có nguồn dữ liệu chi trả (xem `Group2DesignersPanel` tab Lệnh Rút Tiền). */
  pendingPayoutVnd: number | null;
  totalActiveModels: number | null;
}

export interface DesignerAdminState {
  designers: DesignerRow[];
  /** Tên cột THẬT của `designer_profiles` (lấy từ dòng đầu tiên đọc được). */
  designerColumns: string[];
  isLoading: boolean;
  /** Lỗi THẬT của truy vấn (không bao giờ bị nuốt thành "0 bản ghi"). */
  error: string | null;
  filters: DesignerAdminFilters;

  setFilterBadgeTier: (badgeTier: DesignerAdminFilters['badgeTier']) => void;
  setFilterVerifiedStatus: (verifiedStatus: DesignerAdminFilters['verifiedStatus']) => void;
  setSearchQuery: (query: string) => void;

  loadDesigners: () => Promise<void>;
  updateDesigner: (
    designerId: string,
    patch: { royaltyPercent?: number; badgeTier?: string }
  ) => Promise<{ success: boolean; error?: string }>;

  getDesignerStats: () => DesignerAdminStats;
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

const strOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Dòng `designer_profiles` (cột nào có thì đọc cột đó) → `DesignerRow`. Không bịa mặc định. */
export const rowToDesignerRow = (d: Record<string, any>): DesignerRow => ({
  id: String(d.id),
  userId: strOrNull(d.user_id),
  displayName: strOrNull(d.display_name) || '',
  bio: strOrNull(d.bio),
  avatarUrl: strOrNull(d.avatar_url),
  portfolioUrl: strOrNull(d.portfolio_url),
  bankName: strOrNull(d.bank_name),
  bankAccount: strOrNull(d.bank_account),
  taxId: strOrNull(d.tax_id),
  royaltyPercent: numOrNull(d.royalty_percent ?? d.default_royalty_percent),
  verifiedStatus: strOrNull(d.verified_status),
  rating: numOrNull(d.rating),
  totalSales: numOrNull(d.total_sales ?? d.total_sales_count),
  totalRoyaltiesEarned: numOrNull(d.total_royalties_earned),
  badgeTier: strOrNull(d.badge_tier),
  createdAt: strOrNull(d.created_at)
});

export const useDesignerAdminStore = create<DesignerAdminState>((set, get) => ({
  designers: [],
  designerColumns: [],
  isLoading: false,
  error: null,
  filters: {
    badgeTier: 'all',
    verifiedStatus: 'all',
    searchQuery: ''
  },

  setFilterBadgeTier: (badgeTier) =>
    set((state) => ({ filters: { ...state.filters, badgeTier } })),

  setFilterVerifiedStatus: (verifiedStatus) =>
    set((state) => ({ filters: { ...state.filters, verifiedStatus } })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({ filters: { ...state.filters, searchQuery } })),

  loadDesigners: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('designer_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        // Lỗi thật: giữ danh sách RỖNG và nói rõ lỗi, KHÔNG hiện SEED như thể có dữ liệu.
        set({ designers: [], designerColumns: [], isLoading: false, error: error.message });
        return;
      }
      const rows = (data ?? []) as Record<string, any>[];
      set({
        designers: rows.map(rowToDesignerRow),
        designerColumns: rows.length > 0 ? Object.keys(rows[0]) : [],
        isLoading: false,
        error: null
      });
    } catch (e: any) {
      set({
        designers: [],
        designerColumns: [],
        isLoading: false,
        error: e?.message || 'Lỗi không xác định khi đọc designer_profiles.'
      });
    }
  },

  updateDesigner: async (designerId, patch) => {
    const columns = get().designerColumns;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (patch.royaltyPercent !== undefined) {
      if (columns.includes('royalty_percent')) {
        payload.royalty_percent = patch.royaltyPercent;
      } else if (columns.includes('default_royalty_percent')) {
        payload.default_royalty_percent = patch.royaltyPercent;
      } else {
        return {
          success: false,
          error:
            'Bảng designer_profiles không có cột % hoa hồng (royalty_percent) — không có gì được ghi.'
        };
      }
    }

    if (patch.badgeTier !== undefined) {
      if (!columns.includes('badge_tier')) {
        return {
          success: false,
          error:
            'Bảng designer_profiles không có cột badge_tier — huy hiệu chưa được ghi. Cần migration thêm cột trước.'
        };
      }
      payload.badge_tier = patch.badgeTier;
    }

    try {
      const { data, error } = await supabase
        .from('designer_profiles')
        .update(payload)
        .eq('id', designerId)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Máy chủ không ghi được hàng nào (quyền RLS) — chưa có thay đổi nào được lưu.'
        };
      }
      await get().loadDesigners();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi không xác định khi lưu hồ sơ designer.' };
    }
  },

  getDesignerStats: () => {
    const { designers, designerColumns } = get();
    const hasBadge = designerColumns.includes('badge_tier');
    const countTier = (tier: string) => designers.filter((d) => d.badgeTier === tier).length;

    const royalties = designers
      .map((d) => d.totalRoyaltiesEarned)
      .filter((v): v is number => v !== null);

    return {
      totalDesigners: designers.length,
      topCreatorsCount: hasBadge ? countTier('TopCreator') : null,
      verifiedEngineersCount: hasBadge ? countTier('VerifiedEngineer') : null,
      pioneerMakersCount: hasBadge ? countTier('PioneerMaker') : null,
      totalRoyaltiesPaidVnd: royalties.length > 0 ? royalties.reduce((a, b) => a + b, 0) : null,
      pendingPayoutVnd: null,
      totalActiveModels: null
    };
  }
}));
