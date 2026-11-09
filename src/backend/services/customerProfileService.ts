import { supabase, isSupabaseConfigured } from '@backend/supabase/client';

/**
 * Hồ sơ khách hàng doanh nghiệp — bảng THẬT `public.customer_profiles`.
 *
 * KHÔNG dùng `workshop/customers.ts`: module đó ghi các cột không tồn tại
 * (`company_name`, `billing_email`, `preferred_payment_method`, `default_shipping_address`)
 * và còn cache localStorage; coi như deprecated.
 *
 * Cột thật của bảng: `id, user_id, display_name, company, tax_id, business_address,
 * phone, nda_signed, nda_signed_at, created_at, updated_at`.
 * RLS `vcube_customer_profiles_owner_all` cho chủ sở hữu (`user_id = auth.uid()`) toàn quyền
 * trên dòng của mình, nên service luôn lọc theo `user_id` lấy từ phiên Supabase thật —
 * không nhận `user_id` từ caller.
 */
export interface CustomerProfile {
  id: string;
  userId: string;
  displayName: string;
  company: string;
  taxId: string;
  businessAddress: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

/** Chỉ các trường người dùng được tự sửa (không gồm `nda_signed*`). */
export interface CustomerProfilePatch {
  displayName?: string;
  company?: string;
  taxId?: string;
  businessAddress?: string;
  phone?: string;
}

const COLUMNS = 'id, user_id, display_name, company, tax_id, business_address, phone, created_at, updated_at';

function mapRow(row: Record<string, unknown>): CustomerProfile {
  return {
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? ''),
    displayName: typeof row.display_name === 'string' ? row.display_name : '',
    company: typeof row.company === 'string' ? row.company : '',
    taxId: typeof row.tax_id === 'string' ? row.tax_id : '',
    businessAddress: typeof row.business_address === 'string' ? row.business_address : '',
    phone: typeof row.phone === 'string' ? row.phone : '',
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
  };
}

/** Đọc `auth.uid()` từ phiên thật; ném lỗi rõ ràng nếu chưa đăng nhập. */
async function requireUserId(): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Hệ thống dữ liệu chưa được cấu hình nên không đọc/lưu được hồ sơ.');
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(`Không xác thực được phiên đăng nhập: ${error.message}`);
  }
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error('Bạn cần đăng nhập để xem hoặc sửa hồ sơ khách hàng.');
  }
  return userId;
}

/** Chuyển patch (camelCase) sang cột DB, chỉ nhận 5 trường được phép và trim. */
function toDbRow(patch: CustomerProfilePatch): Record<string, string> {
  const row: Record<string, string> = {};
  if (patch.displayName !== undefined) row.display_name = patch.displayName.trim();
  if (patch.company !== undefined) row.company = patch.company.trim();
  if (patch.taxId !== undefined) row.tax_id = patch.taxId.trim();
  if (patch.businessAddress !== undefined) row.business_address = patch.businessAddress.trim();
  if (patch.phone !== undefined) row.phone = patch.phone.trim();
  return row;
}

/**
 * Hồ sơ khách hàng của người đang đăng nhập, hoặc `null` nếu chưa có dòng nào.
 *
 * Bảng KHÔNG có unique index trên `user_id` (chỉ index thường `idx_customer_user`), nên
 * dùng `.limit(1).maybeSingle()` + sắp xếp theo `created_at` để không vỡ khi dữ liệu cũ
 * lỡ có nhiều dòng.
 */
export async function getMyCustomerProfile(): Promise<CustomerProfile | null> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('customer_profiles')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Không tải được hồ sơ khách hàng: ${error.message}`);
  }
  return data ? mapRow(data as Record<string, unknown>) : null;
}

/**
 * Lưu hồ sơ khách hàng của người đang đăng nhập.
 *
 * Vì `user_id` không có unique constraint, KHÔNG dùng `upsert({ onConflict: 'user_id' })`
 * (Postgres sẽ báo không có unique index phù hợp). Thay vào đó: SELECT → UPDATE nếu đã có
 * dòng, ngược lại INSERT với `user_id = auth.uid()`.
 *
 * Lỗi DB được NÉM RA nguyên văn (không nuốt) để UI hiển thị đúng.
 */
export async function saveMyCustomerProfile(patch: CustomerProfilePatch): Promise<CustomerProfile> {
  const userId = await requireUserId();
  const dbRow = toDbRow(patch);
  const hasChanges = Object.keys(dbRow).length > 0;

  const { data: existing, error: selectError } = await supabase
    .from('customer_profiles')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Không đọc được hồ sơ khách hàng hiện có: ${selectError.message}`);
  }

  if (existing?.id) {
    // Không có trường nào thay đổi ⇒ trả lại dòng hiện có thay vì gửi UPDATE rỗng.
    if (!hasChanges) return mapRow(existing as Record<string, unknown>);

    const { data, error } = await supabase
      .from('customer_profiles')
      .update(dbRow)
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select(COLUMNS)
      .maybeSingle();

    if (error) {
      throw new Error(`Không lưu được thông tin hoá đơn: ${error.message}`);
    }
    if (data) return mapRow(data as Record<string, unknown>);
    // Dòng vừa bị xoá giữa chừng — rơi xuống nhánh INSERT bên dưới.
  }

  const { data, error } = await supabase
    .from('customer_profiles')
    .insert({ user_id: userId, ...dbRow })
    .select(COLUMNS)
    .single();

  if (error) {
    throw new Error(`Không tạo được hồ sơ khách hàng: ${error.message}`);
  }
  return mapRow((data ?? {}) as Record<string, unknown>);
}
