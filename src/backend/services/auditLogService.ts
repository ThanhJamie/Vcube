import { isSupabaseConfigured, supabase } from '@backend/supabase/client';

/**
 * Nhật ký thay đổi cấu hình — đọc THẬT bảng `public.setting_audit`.
 *
 * Bảng này append-only ở tầng RLS (`vcube_setting_audit_admin_read`): chỉ admin đọc được,
 * không ai được UPDATE/DELETE. Service CHỈ ĐỌC, không tự tạo log — log do
 * `settingsService.writeSettingAudit()` ghi mỗi khi cấu hình đổi.
 *
 * Cột thật: `id, setting_key, store, old_value, new_value, changed_by, changed_at`
 * (`old_value`/`new_value` là jsonb nên có thể là object, mảng, số, chuỗi hoặc null).
 *
 * `changed_by` chỉ là uuid; tên hiển thị phải đọc từ `user_profiles` (`display_name` →
 * `email`). Không suy đoán tên, không fallback sang email hardcode: thiếu hồ sơ ⇒ `null`
 * và UI hiển thị `—`.
 */

/** Trần số bản ghi mới nhất trả về (UI hiển thị rõ trần này, không giả vờ đã tải toàn bộ). */
export const AUDIT_LOG_LIMIT = 200;

export interface AuditLogEntry {
  id: string;
  settingKey: string;
  store: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
}

type SupabaseRow = Record<string, unknown>;

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function mapRow(row: SupabaseRow): AuditLogEntry {
  return {
    id: String(row.id ?? ''),
    settingKey: typeof row.setting_key === 'string' ? row.setting_key : '',
    store: typeof row.store === 'string' ? row.store : '',
    oldValue: row.old_value ?? null,
    newValue: row.new_value ?? null,
    changedBy: asNullableString(row.changed_by),
    changedByName: null,
    changedAt: typeof row.changed_at === 'string' ? row.changed_at : '',
  };
}

/** Chuẩn hoá `limit`: chỉ nhận số nguyên dương, mặc định/không hợp lệ ⇒ `AUDIT_LOG_LIMIT`. */
function resolveLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) return AUDIT_LOG_LIMIT;
  return Math.min(Math.floor(limit), 500);
}

/**
 * Đọc nhật ký thay đổi cấu hình, mới nhất trước.
 *
 * - `store`: lọc đúng 1 nguồn (5 giá trị CHECK của bảng).
 * - `search`: tìm gần đúng theo `setting_key` (`ilike`, không phân biệt hoa/thường).
 * - `limit`: mặc định {@link AUDIT_LOG_LIMIT}.
 *
 * Lỗi truy vấn ⇒ ném `Error` với thông điệp tiếng Việt để panel hiển thị và cho retry;
 * KHÔNG trả mảng rỗng giả (mảng rỗng chỉ có nghĩa "thật sự chưa có bản ghi").
 */
export async function listAuditLog(
  options: { limit?: number; store?: string; search?: string } = {},
): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Hệ thống dữ liệu chưa được cấu hình nên không đọc được nhật ký thay đổi.');
  }

  let query = supabase
    .from('setting_audit')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(resolveLimit(options.limit));

  const store = options.store?.trim();
  if (store) query = query.eq('store', store);

  const search = options.search?.trim();
  if (search) query = query.ilike('setting_key', `%${search}%`);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Không tải được nhật ký thay đổi cấu hình: ${error.message}`);
  }

  const rows = (data ?? []).map((row) => mapRow(row as SupabaseRow));

  // Tên người đổi: một truy vấn duy nhất cho mọi `changed_by` (không N+1).
  const changedByIds = Array.from(
    new Set(rows.map((row) => row.changedBy).filter((id): id is string => Boolean(id))),
  );

  if (changedByIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, display_name, email')
      .in('id', changedByIds);

    if (profileError) {
      throw new Error(`Không tải được tên người thay đổi: ${profileError.message}`);
    }

    const nameById = new Map<string, string>();
    for (const profile of profiles ?? []) {
      const row = profile as SupabaseRow;
      const id = typeof row.id === 'string' ? row.id : '';
      if (!id) continue;
      const displayName = typeof row.display_name === 'string' ? row.display_name.trim() : '';
      const email = typeof row.email === 'string' ? row.email.trim() : '';
      const name = displayName || email;
      if (name) nameById.set(id, name);
    }

    for (const row of rows) {
      if (row.changedBy) row.changedByName = nameById.get(row.changedBy) ?? null;
    }
  }

  return rows;
}
