# Apply checklist — 2 policy DB cần áp để mở khoá FL-2a (designer đăng bán)

> **Trạng thái: CHỜ CHỦ DỰ ÁN ÁP** trên Supabase SQL Editor (DB production).
> Verify 2026-10-23 (`handoff/real-account-verification.md`) chứng minh code đúng; chỉ thiếu policy.
> **Backup trước khi chạy** (Supabase Dashboard → Database → Backups, hoặc `pg_dump`).

## Bước 1 — Storage policy cho path `cad/<uid>/<uuid>/<file>` (BLOCKER A)
File đã có trong repo nhưng header ghi **DRAFT/CHƯA ÁP**:
`supabase/migrations/20261013110000_storage_scheme.sql`
→ Mở file, dán toàn bộ vào SQL Editor, chạy. Kiểm sau khi chạy:
```sql
select policyname, cmd, roles from pg_policies
 where schemaname='storage' and tablename='objects'
   and policyname='vcube_cad_files_cad_owner_rw';
-- kỳ vọng: 1 dòng, cmd=ALL, roles={authenticated}
```

## Bước 2 — Products: designer được đăng bán (BLOCKER B)
Chạy file: `docs/tasks/world-class/sql/PROPOSED-20261024-designer-publish.sql`
(thêm `products.designer_id` + 4 policy; admin-all và public-read giữ nguyên).
Kiểm:
```sql
select policyname, cmd from pg_policies
 where schemaname='public' and tablename='products' order by policyname;
-- kỳ vọng có: vcube_products_public_read, vcube_products_admin_all,
--            vcube_products_designer_{read_own,insert_pending,update_pending,delete_pending}
```

## Bước 3 — Sửa sample account khách hàng bị thiếu profile
`khachhang@vcube.vn` có auth user nhưng **không có row `user_profiles`** (verify: đăng nhập fail
mật khẩu demo + profile 0 dòng). Chạy (hoặc dùng secret key script):
```sql
insert into public.user_profiles (id, email, role, display_name, kyc_status)
select id, email, 'customer', 'Khách Demo', 'unverified'
  from auth.users where email = 'khachhang@vcube.vn'
on conflict (id) do update
  set email = excluded.email, role = 'customer';
```
(Đặt lại mật khẩu demo nếu cần phải làm qua Auth admin API — **không** sửa bằng SQL.)

## Bước 4 — Chạy lại verification (sau khi áp)
```bash
# tạo STL test 20mm nếu chưa có; đăng nhập designer → /designer/wizard → Xuất bản
# kỳ vọng: object cad/<uid>/<uuid>/... + digital_assets row + product(status=pending, designer_id=uid)
# admin /admin/products thấy sản phẩm pending → duyệt → published
# buyer PDP mở được sản phẩm đã publish
```
Sau pass: cập nhật `docs/tasks/world-class/PLAN.md` (FL-2a verified real) + AGENTS.md nếu số migration đổi.

## Ghi chú
- Không cần áp bước 1 nếu chủ dự án chọn đổi path scheme sang `digital/<uid>/...` (policy hiện có);
  nhưng khi đó phải sửa `fileStorage.ts` + docs + policy buyer-read (hiện buyer-read dựa `order_files.storage_path`,
  không phụ thuộc prefix) — **không khuyến nghị**, vì path scheme `cad/...` đã được thiết kế cho storage #12.
- Bước 2 là thay đổi **quyền ghi** ⇒ cần review kỹ trước khi áp production (chỉ designer tự đăng bản pending).
