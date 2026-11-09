/**
 * Kiểu phụ trợ cho `database.ts` — CHỈ khai đúng những shape mà client Supabase
 * (chưa sinh type từ DB) không thể suy ra, dựa trên `supabase/migrations/20260901_baseline_schema.sql`.
 *
 * Không thay thế domain type trong `src/types`: đây là shape hàng ghi/đọc thô.
 */
import type { Order } from '../../types';

/**
 * Hợp đồng legacy của `saveOrder`: ngoài `Order`, caller cũ có thể gắn kèm liên kết
 * người dùng lên chính object đơn. Hai khoá này KHÔNG có trong type `Order` và không
 * phải cột của bảng `orders`, nên khai tường minh ở đây thay vì `(order as any)`.
 */
export interface OrderWithUserLink extends Order {
  userId?: string;
  user_id?: string;
}

/**
 * Dòng INSERT cho bảng `quotes` (baseline §3d). `id` là khoá chính `text` không default
 * nên bắt buộc; các cột còn lại có default/NULL trong schema ⇒ optional.
 */
export interface QuoteInsertRow {
  id: string;
  user_id?: string | null;
  order_id?: string | null;
  file_name?: string;
  material_id?: string | null;
  printer_id?: string | null;
  volume_cm3?: number | null;
  infill_percent?: number | null;
  layer_height_mm?: number | null;
  quantity?: number;
  unit_price?: number | null;
  total_price?: number | null;
  currency?: string;
  payload?: Record<string, unknown>;
  expires_at?: string | null;
  created_at?: string;
}
