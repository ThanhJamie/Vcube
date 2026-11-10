/**
 * warrantyService — yêu cầu bảo hành của khách (`warranty_claims`).
 *
 * Bất biến dữ liệu (docs/design/data-honesty.md):
 * - Mã hồ sơ hiển thị cho khách là `warranty_claims.id` **thật** do DB sinh; không dựng mã giả.
 * - `order_number` chỉ lấy từ `orders`; không đọc được thì trả `null` (UI hiện `—`), không bịa.
 * - Khách chỉ tạo claim cho đơn CỦA MÌNH (kiểm `orders.user_id = auth.uid()` trước khi insert;
 *   RLS hiện chỉ kiểm `user_id` trên claim — siết policy là việc của gate Phase B).
 * - Xưởng chỉ thấy claim thuộc đơn `orders.assigned_workshop_id = partnerId`; lọc ở service
 *   vì RLS `vcube_warranty_claims_staff_read` hiện cho mọi tài khoản lab đọc mọi claim.
 */

import { supabase } from '../supabase/client';
import { ok, fail, type WriteResult } from '../lib/result';

export type WarrantyClaimStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'resolved';

export interface WarrantyClaim {
  id: string;
  orderId: string;
  orderNumber: string | null;
  userId: string | null;
  reason: string;
  description: string;
  photoPaths: string[];
  status: WarrantyClaimStatus;
  resolution: string;
  handledBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarrantyClaimInput {
  orderId: string;
  issueType: 'tolerance' | 'surface' | 'material' | 'strength';
  measuredDeviation: string;
  notes: string;
}

/** Nhãn VI của phân loại sự cố — khớp đúng 4 lựa chọn trong biểu mẫu khách. */
const ISSUE_TYPE_LABELS: Record<CreateWarrantyClaimInput['issueType'], string> = {
  tolerance: 'Sai lệch kích thước so với bản vẽ',
  surface: 'Lỗi bề mặt, tách lớp in',
  material: 'Sai chủng loại vật liệu hoặc màu sắc yêu cầu',
  strength: 'Độ cứng cơ tính không đạt thông số nhà sản xuất',
};

const STATUS_VALUES: WarrantyClaimStatus[] = [
  'submitted',
  'reviewing',
  'approved',
  'rejected',
  'resolved',
];

const CLAIM_COLUMNS =
  'id,order_id,user_id,reason,description,photo_paths,status,resolution,handled_by,created_at,updated_at';

interface WarrantyClaimRow {
  id: string;
  order_id: string;
  user_id: string | null;
  reason: string;
  description: string | null;
  photo_paths: string[] | null;
  status: string;
  resolution: string | null;
  handled_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapClaim(row: WarrantyClaimRow, orderNumber: string | null): WarrantyClaim {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    orderNumber,
    userId: row.user_id ?? null,
    reason: String(row.reason ?? ''),
    description: String(row.description ?? ''),
    photoPaths: Array.isArray(row.photo_paths)
      ? row.photo_paths.filter((path): path is string => typeof path === 'string')
      : [],
    status: (STATUS_VALUES.includes(row.status as WarrantyClaimStatus)
      ? row.status
      : 'submitted') as WarrantyClaimStatus,
    resolution: String(row.resolution ?? ''),
    handledBy: row.handled_by ?? null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

function normalizeOrderNumber(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * Gửi yêu cầu bảo hành cho một đơn CỦA chính người đang đăng nhập.
 * Thiếu phiên / đơn không thuộc user ⇒ fail, KHÔNG ghi gì vào DB.
 */
export async function createWarrantyClaim(
  input: CreateWarrantyClaimInput,
): Promise<WriteResult<WarrantyClaim>> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return fail(authError, 'Không kiểm tra được phiên đăng nhập.');
  const uid = authData.user?.id;
  if (!uid) return fail('Bạn cần đăng nhập để gửi yêu cầu bảo hành.');

  if (!input.orderId) return fail('Thiếu mã đơn hàng cần bảo hành.');

  // Xác minh quyền sở hữu đơn trước khi tạo claim (RLS claim insert chưa kiểm điều này).
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,order_number')
    .eq('id', input.orderId)
    .eq('user_id', uid)
    .maybeSingle();
  if (orderError) return fail(orderError, 'Không kiểm tra được đơn hàng.');
  if (!order) return fail('Không tìm thấy đơn hàng của bạn.');

  const reason = ISSUE_TYPE_LABELS[input.issueType];
  if (!reason) return fail('Phân loại sự cố không hợp lệ.');

  const deviation = input.measuredDeviation.trim();
  const notes = input.notes.trim();
  const description = [
    deviation ? `Độ lệch đo được: ${deviation}` : '',
    notes ? `Mô tả: ${notes}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  const { data, error } = await supabase
    .from('warranty_claims')
    .insert({
      order_id: input.orderId,
      user_id: uid,
      reason,
      description,
      status: 'submitted',
    })
    .select(CLAIM_COLUMNS)
    .single();

  if (error) return fail(error, 'Gửi yêu cầu bảo hành thất bại.');
  if (!data) return fail('Máy chủ không trả về hồ sơ bảo hành vừa tạo.');

  return ok(mapClaim(data as unknown as WarrantyClaimRow, normalizeOrderNumber(order.order_number)));
}

/**
 * Danh sách claim của chính khách đang đăng nhập, mới nhất trước.
 * Lỗi truy vấn ném lỗi để tầng UI hiển thị ErrorState thay vì "rỗng" giả.
 */
export async function listMyWarrantyClaims(): Promise<WarrantyClaim[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const uid = authData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('warranty_claims')
    .select(CLAIM_COLUMNS)
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as WarrantyClaimRow[];
  const orderIds = Array.from(new Set(rows.map((row) => row.order_id)));
  const orderNumbers = await fetchOrderNumbers(orderIds);

  return rows.map((row) => mapClaim(row, orderNumbers.get(row.order_id) ?? null));
}

/**
 * Claim thuộc các đơn xưởng NÀY được giao (`orders.assigned_workshop_id = partnerId`).
 * RLS hiện cho mọi lab đọc mọi claim ⇒ phải lọc tại đây; partnerId rỗng ⇒ [].
 */
export async function listWorkshopWarrantyClaims(partnerId: string): Promise<WarrantyClaim[]> {
  if (!partnerId.trim()) return [];

  const { data: orderRows, error: orderError } = await supabase
    .from('orders')
    .select('id,order_number')
    .eq('assigned_workshop_id', partnerId);
  if (orderError) throw new Error(orderError.message);

  const orders = (orderRows ?? []) as Array<{ id: string; order_number: string | null }>;
  if (orders.length === 0) return [];

  const orderNumbers = new Map<string, string | null>();
  orders.forEach((order) => {
    orderNumbers.set(String(order.id), normalizeOrderNumber(order.order_number));
  });

  const { data, error } = await supabase
    .from('warranty_claims')
    .select(CLAIM_COLUMNS)
    .in('order_id', Array.from(orderNumbers.keys()))
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as WarrantyClaimRow[]).map((row) =>
    mapClaim(row, orderNumbers.get(row.order_id) ?? null),
  );
}

/** Xưởng/admin cập nhật trạng thái + kết quả xử lý. `.select('id')` để phát hiện RLS chặn. */
export async function updateWarrantyClaim(input: {
  id: string;
  status: WarrantyClaimStatus;
  resolution: string;
}): Promise<WriteResult> {
  if (!input.id) return fail('Thiếu mã hồ sơ bảo hành.');
  if (!STATUS_VALUES.includes(input.status)) return fail('Trạng thái bảo hành không hợp lệ.');

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return fail(authError, 'Không kiểm tra được phiên đăng nhập.');
  const uid = authData.user?.id;
  if (!uid) return fail('Bạn cần đăng nhập để xử lý yêu cầu bảo hành.');

  const { data, error } = await supabase
    .from('warranty_claims')
    .update({
      status: input.status,
      resolution: input.resolution.trim(),
      handled_by: uid,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('id');

  if (error) return fail(error, 'Cập nhật yêu cầu bảo hành thất bại.');
  if (!data || data.length === 0) {
    return fail(
      'Máy chủ không cập nhật hàng nào (hồ sơ không thuộc quyền xử lý hoặc tài khoản chưa được cấp quyền). Chưa có thay đổi nào được lưu.',
    );
  }

  return ok();
}

/** Đọc `order_number` cho các claim của khách. Không đọc được ⇒ map rỗng (UI hiện `—`). */
async function fetchOrderNumbers(orderIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (orderIds.length === 0) return map;

  const { data, error } = await supabase
    .from('orders')
    .select('id,order_number')
    .in('id', orderIds);
  if (error) return map;

  ((data ?? []) as Array<{ id: string; order_number: string | null }>).forEach((order) => {
    map.set(String(order.id), normalizeOrderNumber(order.order_number));
  });
  return map;
}
