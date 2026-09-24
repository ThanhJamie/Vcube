<!-- doc-meta: status=active; verified=2026-09-24; owner=thanh -->
# Runbook — Designer onboarding (cấp quyền Nhà thiết kế)

Cách biến một tài khoản `customer` thành `designer` để truy cập `/designer`.

## 1. Khoảng trống hiện tại (current gap)

Không có đường code nào tạo ra nhà thiết kế:

- Trigger tự tạo profile khi đăng ký **luôn ghi `role='customer'`**:
  `supabase/migrations/20260901_baseline_schema.sql:1429` (`fn_create_profile_for_new_user`).
  Không có nhánh self-signup-as-designer.
- **Không có UI promotion** cho tác nhân người dùng: panel admin hiện có
  (`src/frontend/components/admin/groups/Group2DesignersPanel.tsx`) chỉ đọc/ghi
  `designer_profiles`, không đổi `user_profiles.role`.
- `WorkshopService.saveDesignerProfile()` (`src/backend/services/workshopService.ts:961`) là
  **code chết** — không được UI nào gọi để cấp quyền; và `designer_profiles` không chứa `role`.
- Hệ quả thực tế: 2 dòng `designer_profiles` hiện có là fixture seed (`[MẪU]`); tài khoản
  liên kết `creator.lethang@vcube.vn` resolve ra `customer`, nên `RoleGuard` (designer/admin)
  chặn `/designer`.

## 2. Cách chính: thao tác admin trên UI

Một task khác bổ sung nút **“Cấp quyền Designer”** trong **Group3** (panel quản trị khách hàng
/ tài khoản). Đây là **đường ưu tiên**:

1. Đăng nhập bằng tài khoản `admin`.
2. Vào khu vực quản trị, panel **Group3**, tìm tài khoản người dùng theo email.
3. Bấm **“Cấp quyền Designer”**.

Nút này cập nhật `public.user_profiles.role='designer'` trong ngữ cảnh `authenticated` +
`is_admin()` (trigger `trg_protect_profile_privileged_columns` cho phép admin), và đảm bảo có
dòng `designer_profiles` tương ứng. Dùng UI khi có thể — nó là luồng được kiểm thử và không
cần quyền `postgres`.

## 3. Fallback SQL (Supabase SQL Editor, vai trò `postgres`)

Chỉ dùng khi chưa có UI hoặc cần xử lý thủ công. Thay `<email>` bằng email thật.

```sql
update public.user_profiles set role = 'designer' where email = '<email>';
with u as (select id, coalesce(display_name,'') as dn from public.user_profiles where email = '<email>')
insert into public.designer_profiles (user_id, display_name, verified_status)
select u.id, u.dn, 'Verified' from u
where not exists (select 1 from public.designer_profiles dp where dp.user_id = u.id);
```

Ghi chú an toàn:

- `trg_protect_profile_privileged_columns` (`20260901_baseline_schema.sql:1474`) chặn đổi `role`
  khi **không phải admin** (`is_admin()` false) — ví dụ chạy trong ngữ cảnh `anon` hoặc
  `authenticated` thường. Nếu câu `update` raise `insufficient_privilege`, hãy:
  - cấp quyền qua **admin UI** (mục 2) khi đang đăng nhập bằng admin, **hoặc**
  - chạy lại với vai trò **`postgres`** trong Dashboard (SQL Editor).
- Câu lệnh idempotent: `where not exists` tránh tạo trùng `designer_profiles` cho cùng `user_id`.

## 4. Kiểm chứng (verify)

```sql
select role from public.user_profiles where email = '<email>';
select user_id, display_name, verified_status from public.designer_profiles;
```

Kỳ vọng: `role = 'designer'`, và có đúng một dòng `designer_profiles` cho `user_id` đó. Sau đó
mở `/designer` — `RoleGuard` cho phép `designer` và `admin`; tài khoản phải vào được thay vì
nhận 403.

## 5. Quyết định sản phẩm còn mở

Tự đăng ký với vai trò designer (self-signup as designer) **chưa được triển khai** và chưa
được chốt. Hiện tại chỉ có admin cấp quyền (UI hoặc SQL fallback). Khi quyết định thay đổi,
cần cập nhật trigger `fn_create_profile_for_new_user` và/hoặc thêm luồng yêu cầu duyệt.
