import { supabase } from '@backend/supabase/client';
import { dbService } from '@backend/supabase/database';
import type { Order } from '@/types';

/**
 * Đánh giá sản phẩm đã published — hình dạng tối thiểu cho PDP.
 *
 * KHÔNG join `user_profiles`: `reviews.author_id` trỏ thẳng `auth.users` (không có FK tới
 * bảng public nào), nên PostgREST không thể join tên người viết trong một query đơn.
 * Vì vậy service chỉ trả `authorId`; UI render nhãn trung tính "Khách hàng", tuyệt đối
 * không tự chế tên/tên viết tắt từ UUID.
 */
export interface ProductReview {
  id: string;
  rating: number;
  comment: string;
  photos: string[];
  createdAt: string;
  authorId: string;
}

export interface SubmitProductReviewInput {
  orderId: string;
  productId: string;
  rating: number;
  comment?: string;
}

const REVIEW_COLUMNS = 'id, author_id, rating, comment, photos, created_at';

function mapReviewRow(row: Record<string, unknown>): ProductReview {
  return {
    id: String(row.id ?? ''),
    rating: Number(row.rating ?? 0),
    comment: typeof row.comment === 'string' ? row.comment : '',
    photos: Array.isArray(row.photos)
      ? row.photos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [],
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
    authorId: typeof row.author_id === 'string' ? row.author_id : '',
  };
}

/**
 * Danh sách đánh giá ĐÃ DUYỆT của một sản phẩm, mới nhất trước.
 *
 * RLS `vcube_reviews_public_read` chỉ trả `status = 'published'`; điều kiện `status` ở
 * đây là chủ ý (đọc rõ ý định + dùng index `idx_reviews_target`), không phải nới quyền.
 */
export async function listProductReviews(productId: string): Promise<ProductReview[]> {
  const cleanId = (productId || '').trim();
  if (!cleanId) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('target_type', 'product')
    .eq('target_id', cleanId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Không tải được đánh giá sản phẩm: ${error.message}`);
  }

  return (data ?? []).map((row) => mapReviewRow(row as Record<string, unknown>));
}

/**
 * Gửi đánh giá mới cho sản phẩm.
 *
 * RLS `vcube_reviews_author_insert` yêu cầu `author_id = auth.uid()` VÀ `status = 'pending'`;
 * tác giả không được tự publish. `author_id` lấy từ phiên Supabase thật, không nhận từ caller.
 */
export async function submitProductReview(input: SubmitProductReviewInput): Promise<ProductReview> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;
  if (authError || !user?.id) {
    throw new Error('Bạn cần đăng nhập để đánh giá sản phẩm.');
  }

  const productId = (input.productId || '').trim();
  const orderId = (input.orderId || '').trim();
  if (!productId) throw new Error('Không xác định được sản phẩm cần đánh giá.');
  if (!orderId) throw new Error('Vui lòng chọn đơn hàng đã mua sản phẩm này.');
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('Điểm đánh giá phải từ 1 đến 5 sao.');
  }

  const comment = (input.comment ?? '').trim();

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      order_id: orderId,
      author_id: user.id,
      target_type: 'product',
      target_id: productId,
      rating: input.rating,
      comment,
      status: 'pending',
    })
    .select(REVIEW_COLUMNS)
    .single();

  if (error) {
    // Unique (order_id, author_id, target_type, target_id) — mỗi đơn chỉ đánh giá 1 lần.
    if (error.code === '23505') {
      throw new Error('Bạn đã đánh giá sản phẩm này cho đơn hàng đã chọn.');
    }
    throw new Error(`Không gửi được đánh giá: ${error.message}`);
  }

  return mapReviewRow((data ?? {}) as Record<string, unknown>);
}

/**
 * Đơn hàng của người đang đăng nhập có chứa sản phẩm này.
 *
 * `Order.items` (snapshot JSON trong `orders.items`) KHÔNG có `productId`: `item.id` là id
 * dòng giỏ hàng (`cart-…`), không phải id sản phẩm. Nguồn sự thật của liên kết sản phẩm là
 * bảng `order_items.product_id`; `dbService.getOrderItems` đọc read-only và RLS
 * `vcube_order_items_owner_read` chỉ cho chủ đơn xem dòng của chính mình.
 *
 * Đơn không đọc được `order_items` (RLS/mạng) bị BỎ QUA thay vì đoán đủ điều kiện. Fallback
 * `item.id === productId` chỉ áp cho snapshot cũ từng lưu id sản phẩm vào `item.id`.
 */
export async function listMyEligibleOrders(productId: string): Promise<Order[]> {
  const cleanId = (productId || '').trim();
  if (!cleanId) return [];

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) return [];

  const orders = await dbService.getOrders();

  const checks = await Promise.all(
    orders.map(async (order) => {
      try {
        const items = await dbService.getOrderItems(order.id);
        const boughtProduct =
          items.some((item) => item.productId === cleanId) ||
          (order.items ?? []).some((item) => item.id === cleanId);
        return boughtProduct ? order : null;
      } catch {
        // Không kết luận được đơn này có sản phẩm hay không — bỏ qua, không bịa.
        return null;
      }
    }),
  );

  return checks.filter((order): order is Order => order !== null);
}
