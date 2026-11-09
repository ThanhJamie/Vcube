import { supabase } from '../../supabase/client';
import { ok, fail, type WriteResult } from '../../lib/result';
import { CustomerProfile } from '../../../types';

// ----------------------------------------------------------------------------
// 6. CUSTOMER PROFILES (public.customer_profiles)
// ----------------------------------------------------------------------------
/**
 * Nguồn dữ liệu DUY NHẤT: bảng thật `public.customer_profiles`.
 * KHÔNG còn fallback localStorage/seed — đọc lỗi thì ném lỗi thật, bảng rỗng thì trả `[]`.
 *
 * Cột THẬT (baseline `20260901_baseline_schema.sql`):
 *   id, user_id, display_name, company, tax_id, business_address, phone,
 *   nda_signed, nda_signed_at, created_at, updated_at.
 *
 * Type `CustomerProfile` (src/types) vẫn mang trường của schema CŨ, map như sau:
 *   company          -> companyName   (alias cũ, giữ để call-site đọc được)
 *   tax_id           -> taxId
 *   display_name     -> displayName   (bổ sung ngoài type cũ)
 *   business_address -> businessAddress (bổ sung ngoài type cũ)
 *   phone            -> phone         (bổ sung ngoài type cũ)
 *   nda_signed(_at)  -> ndaSigned(_at)
 *
 * Trường KHÔNG có cột trong DB ⇒ KHÔNG đọc/ghi, KHÔNG bịa cột:
 *   * billingEmail            (không có cột `billing_email`)
 *   * defaultShippingAddress  (không có cột `default_shipping_address`)
 *   * preferredPaymentMethod  (không có cột `preferred_payment_method`; type bắt buộc
 *                              nên chỉ giữ mặc định `'vietqr'` khi map, không lưu DB)
 */
type DbCustomerProfile = CustomerProfile & {
  displayName?: string;
  company?: string;
  businessAddress?: string;
  phone?: string;
};

/** Input ghi: giữ đúng trường façade đang nhận + cho phép tên cột thật nếu caller đã dùng. */
type CustomerProfileInput = Partial<CustomerProfile> & {
  userId: string;
  displayName?: string;
  company?: string;
  businessAddress?: string;
  phone?: string;
};

const COLUMNS =
  'id, user_id, display_name, company, tax_id, business_address, phone, nda_signed, nda_signed_at, created_at, updated_at';

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Dòng DB (snake_case) → hồ sơ camelCase. Không chế thêm giá trị ngoài dữ liệu thật. */
function mapRow(row: Record<string, unknown>): DbCustomerProfile {
  const company = asText(row.company);
  return {
    id: asText(row.id),
    userId: asText(row.user_id),
    // Tên/địa chỉ/SĐT là cột thật của baseline; type cũ chưa khai nên bổ sung ở đây.
    displayName: asText(row.display_name),
    company,
    companyName: company,
    taxId: asText(row.tax_id),
    businessAddress: asText(row.business_address),
    phone: asText(row.phone),
    // Không có cột DB cho phương thức thanh toán — chỉ giữ mặc định do type bắt buộc.
    preferredPaymentMethod: 'vietqr',
    ndaSigned: row.nda_signed === true,
    ndaSignedAt: asText(row.nda_signed_at) || undefined,
    createdAt: asText(row.created_at) || undefined,
    updatedAt: asText(row.updated_at) || undefined
  };
}

export async function getCustomerProfiles(): Promise<CustomerProfile[]> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select(COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Không tải được danh sách hồ sơ khách hàng: ${error.message}`);
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getCustomerProfileById(id: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Không tải được hồ sơ khách hàng: ${error.message}`);
  }
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function getCustomerProfileByUserId(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Không tải được hồ sơ khách hàng theo người dùng: ${error.message}`);
  }
  return data ? mapRow(data as Record<string, unknown>) : null;
}

/** Chuyển input → cột DB; chỉ ghi trường có cột thật và có giá trị được truyền. */
function toDbRow(profile: CustomerProfileInput, now: string): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  // `display_name`: ưu tiên tên mới, không có thì thôi (không suy từ email/tên khác).
  if (profile.displayName !== undefined) row.display_name = profile.displayName.trim();
  // `company`: nhận tên cột thật, fallback alias cũ `companyName` từ type.
  const company = profile.company ?? profile.companyName;
  if (company !== undefined) row.company = company.trim();
  if (profile.taxId !== undefined) row.tax_id = profile.taxId.trim();
  if (profile.businessAddress !== undefined) row.business_address = profile.businessAddress.trim();
  if (profile.phone !== undefined) row.phone = profile.phone.trim();

  if (profile.ndaSigned !== undefined) {
    row.nda_signed = Boolean(profile.ndaSigned);
    // Ký NDA lần đầu ⇒ ghi mốc thời gian thật; thu hồi ⇒ xoá mốc cũ.
    row.nda_signed_at = profile.ndaSigned ? profile.ndaSignedAt || now : null;
  }

  row.updated_at = now;
  return row;
}

export async function saveCustomerProfile(
  profile: CustomerProfileInput
): Promise<WriteResult<CustomerProfile>> {
  const now = new Date().toISOString();
  const dbRow = toDbRow(profile, now);

  try {
    // Xác định dòng hiện có: ưu tiên `id` caller đưa, sau đó tới `user_id`.
    let existingId = profile.id;
    if (!existingId) {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', profile.userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      existingId = (data as { id?: string } | null)?.id;
    }

    if (existingId) {
      const { data, error } = await supabase
        .from('customer_profiles')
        .update(dbRow)
        .eq('id', existingId)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw error;
      if (data) return ok(mapRow(data as Record<string, unknown>) as CustomerProfile);
      // Dòng vừa bị xoá giữa chừng — rơi xuống nhánh INSERT.
    }

    const insertRow: Record<string, unknown> = { ...dbRow, user_id: profile.userId };
    if (profile.id) insertRow.id = profile.id;

    const { data, error } = await supabase
      .from('customer_profiles')
      .insert(insertRow)
      .select(COLUMNS)
      .single();

    if (error) {
      // 23505: unique index `ux_customer_profiles_user_id` đã áp và có dòng chen ngang.
      // Cập nhật lại dòng của chính user thay vì báo lỗi giả.
      if (error.code === '23505') {
        const { data: updated, error: updateError } = await supabase
          .from('customer_profiles')
          .update(dbRow)
          .eq('user_id', profile.userId)
          .select(COLUMNS)
          .maybeSingle();
        if (!updateError && updated) {
          return ok(mapRow(updated as Record<string, unknown>) as CustomerProfile);
        }
      }
      throw error;
    }

    return ok(mapRow((data ?? {}) as Record<string, unknown>) as CustomerProfile);
  } catch (e) {
    return fail(e, 'Không lưu được hồ sơ khách hàng.');
  }
}

export async function deleteCustomerProfile(id: string): Promise<WriteResult> {
  try {
    const { data, error } = await supabase
      .from('customer_profiles')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Máy chủ không xoá được hồ sơ nào (hồ sơ không tồn tại hoặc thiếu quyền RLS).');
    }
    return ok();
  } catch (e) {
    return fail(e, 'Không xoá được hồ sơ khách hàng.');
  }
}
