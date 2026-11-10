/**
 * publishGuard.ts — cổng UI-01 dùng chung cho `dbService.insertProduct`/`saveProduct`.
 *
 * TRANSITION-AWARE (P1-1)
 * -----------------------
 * - Tạo mới với `published` ⇒ phải đủ điều kiện (chặn).
 * - Chuyển từ trạng thái khác sang `published` ⇒ phải đủ điều kiện (chặn).
 * - Sản phẩm ĐÃ `published` từ trước ⇒ CHO LƯU field khác; nếu legacy còn thiếu
 *   license/ảnh/designer thì chỉ `console.warn` (UI hiển thị cảnh báo), KHÔNG chặn.
 *
 * GIỚI HẠN ĐÃ BIẾT (báo cáo rõ, không che)
 * ----------------------------------------
 * Hàm chạy trong bundle client; client khác gọi thẳng PostgREST/upsert vẫn BYPASS được cổng
 * transition này. Cổng không thể vượt phải là CHECK/trigger phía DB (migration riêng khi dữ
 * liệu đã sạch — `docs/po/IMPLEMENTATION-PLAN-V2-2026-11-10.md` §4.2 phương án B).
 * KHÔNG tự chạy migration.
 */

import type { Product } from '../../types';
import {
  evaluatePublishTransition,
  formatPublishIssues,
  resolveStoredProductStatus,
  type PublishGuardContext,
} from '../../lib/productPublish';
import { supabase } from '../supabase/client';
import { failWith } from './result';

/** `null` = được ghi; ngược lại là kết quả fail kèm đủ `issues` cho caller/UI hiển thị lý do. */
export function publishGuardFailure(
  product: Product,
  context: PublishGuardContext = {}
): ReturnType<typeof failWith> | null {
  const transition = evaluatePublishTransition(product, context);
  if (!transition.targetPublished) return null;

  if (transition.enteringPublish && !transition.readiness.ready) {
    console.warn('Chặn đăng bán sản phẩm chưa đủ điều kiện:', formatPublishIssues(transition.readiness));
    return failWith(
      transition.readiness.issues.map(({ code, field, message }) => ({ code, field, message }))
    );
  }

  // Đã published từ trước: dữ liệu legacy có thể thiếu license/ảnh/designer — chỉ cảnh báo.
  if (transition.alreadyPublished && !transition.readiness.ready) {
    console.warn(
      'Sản phẩm đã đăng bán nhưng còn thiếu điều kiện (vẫn cho lưu):',
      formatPublishIssues(transition.readiness)
    );
  }

  return null;
}

type StoredStatusLookup =
  | { state: 'found'; status: unknown }
  | { state: 'missing' }
  | { state: 'error'; error: string };

/** Đọc `products.status` hiện tại (RLS admin/owner) khi UI không truyền `previousStatus`. */
async function readStoredProductStatus(productId: string): Promise<StoredStatusLookup> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('status')
      .eq('id', productId)
      .maybeSingle();
    if (error) return { state: 'error', error: error.message };
    if (!data) return { state: 'missing' };
    return { state: 'found', status: (data as { status?: unknown }).status };
  } catch (err) {
    return {
      state: 'error',
      error: err instanceof Error ? err.message : 'Không đọc được trạng thái sản phẩm.',
    };
  }
}

/**
 * Guard cho UPDATE/upsert. UI bình thường truyền `previousStatus` từ danh sách sản phẩm;
 * không truyền ⇒ tự đọc status cũ. Đọc lỗi ⇒ KHÔNG chặn (tránh khoá hàng published legacy)
 * nhưng log rõ — direct API gap vẫn cần DB trigger mới bịt được.
 */
export async function publishGuardForSave(
  product: Product,
  options?: { previousStatus?: unknown }
): Promise<ReturnType<typeof failWith> | null> {
  if (options && Object.prototype.hasOwnProperty.call(options, 'previousStatus')) {
    return publishGuardFailure(product, { previousStatus: options.previousStatus });
  }
  if (resolveStoredProductStatus(product.status) !== 'published') return null;

  const lookup = await readStoredProductStatus(product.id);
  if (lookup.state === 'error') {
    console.warn(
      'Không đọc được trạng thái cũ của sản phẩm — bỏ qua publish guard để không chặn lưu:',
      lookup.error
    );
    return null;
  }
  // 'missing' ⇒ coi như tạo mới: guard xét như lần publish đầu.
  return publishGuardFailure(product, {
    previousStatus: lookup.state === 'found' ? lookup.status : undefined,
  });
}
