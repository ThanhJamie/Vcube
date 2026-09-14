import { supabase, isSupabaseConfigured } from './client';
// Row → domain: dùng CHUNG `mappers.ts` (06 §2.5) — không còn bản map thứ hai với
// default bịa riêng trong file này.
import {
  rowToProduct,
  rowToOrderForSync,
  rowToMaterial,
  rowToPrinter,
  rowToUserProfile,
  rowToAccessory,
  rowToWorkshopPartner,
} from './mappers';

import { Product, Order, MaterialProfile, PrinterProfile, AccessoryItem, WorkshopPartner } from '../../types';

/**
 * Đọc toàn bộ hàng của một bảng. Lỗi truy vấn ⇒ ném lỗi THẬT (không nuốt rồi trả mảng
 * rỗng vì "rỗng" và "không đọc được" là hai trạng thái khác nhau — data-honesty §3).
 */
async function selectAllRows(table: string, orderBy?: string): Promise<any[]> {
  let query = supabase.from(table).select('*');
  if (orderBy) {
    query = query.order(orderBy, { ascending: false });
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Không tải được bảng ${table}: ${error.message}`);
  }
  return data ?? [];
}

export interface SyncHealthReport {
  ok: boolean;
  latencyMs: number;
  message: string;
  configured: boolean;
}

export const seedService = {
  /**
   * Pings Supabase to check connection and response latency
   */
  async checkSupabaseHealth(): Promise<SyncHealthReport> {
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        latencyMs: 0,
        message: 'Supabase URL hoặc Anon Key chưa được cấu hình đầy đủ.',
        configured: false,
      };
    }

    const start = performance.now();
    try {
      // Query light head request to check connection
      const { error } = await supabase.from('products').select('id', { count: 'exact', head: true });
      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        return {
          ok: false,
          latencyMs,
          message: `Supabase phản hồi lỗi: ${error.message} (Mã: ${error.code})`,
          configured: true,
        };
      }

      return {
        ok: true,
        latencyMs,
        message: `Kết nối Supabase Cloud hoàn tất (${latencyMs}ms)`,
        configured: true,
      };
    } catch (err: any) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        message: `Không thể kết nối Supabase: ${err?.message || 'Lỗi mạng'}`,
        configured: true,
      };
    }
  },

  // ĐÃ GỠ (Đợt 7): 4 export chết của chế độ nạp dữ liệu mẫu (2 hàm + 2 interface).
  //   Lý do: nút "Đồng Bộ DB" ở src/frontend/views/AdminDashboardView.tsx đã bị xoá nên
  //   không còn call site nào (grep toàn repo chỉ ra chính file này); comment cũ ở đây vẫn
  //   trỏ tới nút đó — đã sai sự thật.
  //   Đường nhập dữ liệu THẬT: từng nhóm trong /admin, hoặc SQL trực tiếp.

  /**
   * Đọc dữ liệu THẬT từ Supabase và map qua `mappers.ts` (một nguồn map duy nhất).
   *
   * ⚠️ TRƯỚC ĐÂY hàm này khởi tạo kết quả bằng toàn bộ fixture (`PRODUCTS`,
   * `MOCK_ORDERS`, `MATERIALS_CATALOG`, `PRINTER_PROFILES`, `MOCK_APP_USERS`,
   * `ACCESSORIES_CATALOG`, `WORKSHOP_PARTNERS`) rồi chỉ ghi đè khi bảng có dữ liệu,
   * đồng thời đổ tất cả vào `localStorage` — nghĩa là DB rỗng vẫn "đồng bộ" ra dữ liệu
   * bịa (data-honesty CI-01/CI-05/CI-06/CI-07, AT-05).
   *
   * NAY: mọi mảng chỉ chứa hàng đọc từ DB; lỗi truy vấn ⇒ ném lỗi thật; KHÔNG ghi
   * `localStorage` (localStorage không còn là nguồn dữ liệu).
   */
  async syncFromSupabase(): Promise<{
    products: Product[];
    orders: Order[];
    materials: MaterialProfile[];
    printers: PrinterProfile[];
    users: any[];
    accessories: AccessoryItem[];
    workshopPartners: WorkshopPartner[];
    syncTime: string;
  }> {
    const [productRows, orderRows, materialRows, printerRows, userRows, accessoryRows, partnerRows] =
      await Promise.all([
        selectAllRows('products', 'created_at'),
        selectAllRows('orders', 'created_at'),
        selectAllRows('materials'),
        selectAllRows('printer_fleet'),
        selectAllRows('user_profiles', 'created_at'),
        selectAllRows('accessories', 'created_at'),
        selectAllRows('workshop_partners', 'created_at'),
      ]);

    return {
      products: productRows.map(rowToProduct),
      orders: orderRows.map(rowToOrderForSync),
      materials: materialRows.map(rowToMaterial),
      printers: printerRows.map(rowToPrinter),
      users: userRows.map(rowToUserProfile),
      accessories: accessoryRows.map(rowToAccessory),
      workshopPartners: partnerRows.map(rowToWorkshopPartner),
      syncTime: new Date().toISOString(),
    };
  },
};
