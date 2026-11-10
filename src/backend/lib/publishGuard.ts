/**
 * publishGuard.ts — cổng UI-01 dùng chung cho `dbService.insertProduct`/`saveProduct`.
 *
 * VÌ SAO TÁCH FILE
 * ----------------
 * `src/backend/supabase/database.ts` là facade lớn (giới hạn dòng của `check-max-lines`) và
 * điều kiện publish là logic thuần, không truy cập DB. Tách ra backend/lib (cùng tầng với
 * `result.ts`) để có MỘT nguồn, test được, và không phình facade.
 *
 * GIỚI HẠN ĐÃ BIẾT (báo cáo rõ, không che)
 * ----------------------------------------
 * Hàm chạy trong bundle client; một client khác gọi thẳng PostgREST/upsert vẫn BYPASS được.
 * Cổng không thể vượt phải là CHECK/trigger phía DB (migration riêng khi dữ liệu đã sạch —
 * `docs/po/IMPLEMENTATION-PLAN-V2-2026-11-10.md` §4.2 phương án B). KHÔNG tự chạy migration.
 */

import type { Product } from '../../types';
import {
  formatPublishIssues,
  normalizeProductStatus,
  validateProductForPublish,
} from '../../frontend/lib/productStatus';
import { failWith } from './result';

/** `null` = được ghi; ngược lại là kết quả fail kèm đủ `issues` cho caller/UI hiển thị lý do. */
export function publishGuardFailure(product: Product): ReturnType<typeof failWith> | null {
  if (normalizeProductStatus(product.status) !== 'published') return null;
  const readiness = validateProductForPublish(product);
  if (readiness.ready) return null;
  const reason = formatPublishIssues(readiness);
  console.warn('Chặn đăng bán sản phẩm chưa đủ điều kiện:', reason);
  return failWith(readiness.issues.map(({ code, field, message }) => ({ code, field, message })));
}
