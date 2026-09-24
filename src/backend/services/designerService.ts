/**
 * designerService — thao tác admin cấp quyền Designer cho một hồ sơ người dùng.
 *
 * Trước đây KHÔNG có đường nào tạo designer thật: trigger đăng ký luôn gán
 * `user_profiles.role='customer'` và không có UI thăng cấp. Hàm dưới đây là đường admin
 * duy nhất, ghi đúng hai bảng theo RLS hiện hữu (`vcube_profiles_admin_all`,
 * `vcube_designer_profiles_admin_all` — `supabase/migrations/20261010_harden_rls.sql:402,486`).
 *
 * Chỉ dùng cột CÓ THẬT trong baseline (`supabase/migrations/20260901_baseline_schema.sql`):
 *   - `user_profiles.id` (uuid, khoá chính), `role`.
 *   - `designer_profiles.user_id` (uuid), `display_name`, `verified_status`.
 * `designer_profiles.user_id` KHÔNG có ràng buộc unique ⇒ đọc trước rồi update/insert,
 * KHÔNG dùng `upsert(..., { onConflict })` (sẽ lỗi 42P10).
 */

import { supabase } from '../supabase/client';

export interface PromoteUserToDesignerOptions {
  /** Ghi vào `designer_profiles.display_name`; bỏ trống ⇒ chuỗi rỗng (default cột). */
  displayName?: string;
  /** Ghi vào `designer_profiles.verified_status`; bỏ trống ⇒ `'Pending'` (default cột). */
  verifiedStatus?: string;
}

export interface PromoteUserToDesignerResult {
  ok: boolean;
  error?: string;
}

export const designerService = {
  async promoteUserToDesigner(
    userProfileId: string,
    opts: PromoteUserToDesignerOptions = {}
  ): Promise<PromoteUserToDesignerResult> {
    const id = (userProfileId || '').trim();
    if (!id) {
      return { ok: false, error: 'Thiếu userProfileId — không có hồ sơ nào được thăng cấp.' };
    }

    const now = new Date().toISOString();

    // 1. Đổi vai trò trên `user_profiles` (RLS admin). `.select('id')` để phát hiện bị chặn.
    const { data: updated, error: roleError } = await supabase
      .from('user_profiles')
      .update({ role: 'designer', updated_at: now })
      .eq('id', id)
      .select('id');

    if (roleError) {
      return { ok: false, error: roleError.message };
    }
    if (!updated || updated.length === 0) {
      return {
        ok: false,
        error: 'Không cập nhật được vai trò — RLS từ chối hoặc không tìm thấy hồ sơ người dùng.'
      };
    }

    // 2. Đồng bộ `designer_profiles`: sửa dòng sẵn có (theo `user_id`) hoặc tạo mới.
    const { data: existing, error: readError } = await supabase
      .from('designer_profiles')
      .select('id')
      .eq('user_id', id)
      .limit(1);

    if (readError) {
      return { ok: false, error: readError.message };
    }

    const displayName = opts.displayName ?? '';
    const verifiedStatus = opts.verifiedStatus ?? 'Pending';
    const existingId = existing && existing.length > 0 ? existing[0].id : null;

    const write = existingId
      ? await supabase
          .from('designer_profiles')
          .update({ display_name: displayName, verified_status: verifiedStatus, updated_at: now })
          .eq('id', existingId)
      : await supabase.from('designer_profiles').insert({
          user_id: id,
          display_name: displayName,
          verified_status: verifiedStatus,
          updated_at: now
        });

    if (write.error) {
      return {
        ok: false,
        error: `Đã đổi vai trò nhưng chưa ghi được designer_profiles: ${write.error.message}`
      };
    }

    return { ok: true };
  }
};
