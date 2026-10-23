-- ============================================================================
-- APPLY TODAY (dán TOÀN BỘ file này vào Supabase Dashboard → SQL Editor → Run)
-- Gồm: (A) storage policy cad/<uid>/... ; (B) products designer publish ; (C) profile khách mẫu
-- Tạo bởi Lead 2026-10-23. **ĐÃ ÁP production 2026-10-23** (giữ làm lịch sử; không cần chạy lại).
-- Backup trước khi chạy. Không in/không commit secret.
-- ============================================================================

-- ============ (A) STORAGE POLICY (từ 20261013110000_storage_scheme.sql, DRAFT → ÁP) ============
-- T25 — Storage scheme cho file CAD: `cad/<uid>/<uuid>/<file>` + policy chủ sở hữu (D3).
--
-- NGỮ CẢNH (T25a, chốt D3 ngày 2026-09-24):
--   * Không có đường upload nào đang chạy: `dbService.uploadCadFile` là DEAD CODE (0 call site).
--   * `orders/<order_id>/...` BẤT KHẢ THI: upload xảy ra TRƯỚC khi đơn tồn tại (từ Tool3D/báo
--     giá), nên không thể đặt tên theo order_id. Việc gắn file vào đơn làm SAU, qua bảng
--     `order_files` khi tạo đơn (T40) — policy người mua theo `order_files` đã có từ 20261010.
--   * Scheme chốt: `cad/<uid|guest_session>/<uuid>/<file>`.
--     - User đăng nhập: `cad/<auth.uid()>/<uuid>/<file>` — policy dưới đây phủ ĐÚNG thư mục
--       cấp 2 = uid của người gọi nên chủ A không chạm được file của chủ B.
--     - Guest: KHÔNG dùng được `auth.uid()` (NULL) ⇒ cần luồng service-role/signed upload
--       riêng, CHƯA làm ở task này. KHÔNG thêm policy anon (sẽ mở bucket cho mọi khách).
--
-- MỤC TIÊU: chủ file tự đọc/ghi/xoá file của mình trong `cad/<uid>/...`; người khác KHÔNG.
-- Bucket `cad-files` là PRIVATE; policy admin (`vcube_cad_files_admin_all`) và policy người
-- mua (`vcube_cad_files_order_files_read` / `vcube_cad_files_buyer_read`) KHÔNG đổi.
--
-- VÌ SAO `(select auth.uid())`: gói trong subquery để Postgres initplan hoá một lần cho cả
-- câu truy vấn thay vì gọi lại mỗi hàng (đúng mẫu của 20261010_harden_rls.sql).
--
-- ⚠️ OBJECT CŨ dưới `cad/` phẳng (`cad/<file>`, scheme trước đây): `(storage.foldername(name))[2]`
--    là NULL nên chúng KHÔNG khớp policy này. Chúng vẫn đọc được qua admin + policy người mua
--    (nếu `order_files.storage_path` / `orders.items` trỏ tới), nhưng cần rà & đổi tên khi
--    backfill `order_files` (T40). Không thêm policy đọc tạm cho prefix phẳng — sẽ mở file.
--
-- POST-CHECK (chạy sau khi áp, chỉ đọc):
--     select policyname, cmd, roles, qual, with_check
--       from pg_policies
--      where schemaname = 'storage' and tablename = 'objects'
--        and policyname = 'vcube_cad_files_cad_owner_rw';
--   Kỳ vọng: đúng 1 dòng, cmd = 'ALL', roles = '{authenticated}', qual + with_check đều chứa
--   `foldername` và `auth.uid()`. `select ... from storage.objects` bằng user A phải chỉ thấy
--   object dưới `cad/<uid-A>/...`.
--
-- DRAFT: file này do subagent soạn, CHƯA áp lên production. H áp theo §1.4 của
-- docs/tasks/DRIFT-TASKS.md (backup + SQL Editor + post-check).
begin;

do $do$
begin
  if to_regclass('storage.objects') is null then
    raise warning 'SKIP  storage.objects không tồn tại — bỏ qua policy cad/<uid>/...';
    return;
  end if;

  -- Idempotent: Postgres không có `create policy if not exists` ⇒ drop rồi tạo lại. Chỉ đụng
  -- ĐÚNG tên policy của mình, không xoá policy khác trên bucket.
  --
  -- GUARD PATH (review nit T25): `foldername[1..2]` một mình vẫn nhận path lách kiểu
  --   `cad/<uidA>/../<uidB>/f` (storage resolve `..` thành `cad/<uidB>/f` ⇒ chủ A chạm file
  --   của B) hoặc path thiếu cấp (`cad/<uid>/f`). Vì vậy:
  --     * position('..' in name) = 0        — chặn mọi đoạn `..`;
  --     * array_length(foldername, 1) >= 3 — bắt buộc đủ `cad/<uid>/<uuid>/<file>`.
  --   Guard phải có ở CẢ using lẫn with check: using chặn đọc/ghi đè/xoá, with check chặn ghi.
  execute 'drop policy if exists vcube_cad_files_cad_owner_rw on storage.objects';
  execute $pol$create policy vcube_cad_files_cad_owner_rw on storage.objects
             for all to authenticated
             using (bucket_id = 'cad-files'
                    and (storage.foldername(name))[1] = 'cad'
                    and (storage.foldername(name))[2] = (select auth.uid())::text
                    and position('..' in name) = 0
                    and coalesce(array_length(storage.foldername(name), 1), 0) >= 3)
             with check (bucket_id = 'cad-files'
                    and (storage.foldername(name))[1] = 'cad'
                    and (storage.foldername(name))[2] = (select auth.uid())::text
                    and position('..' in name) = 0
                    and coalesce(array_length(storage.foldername(name), 1), 0) >= 3)$pol$;
  -- FOR ALL = select/insert/update/delete; USING áp cho select/update/delete, WITH CHECK áp
  -- cho insert/update (insert bắt buộc có with check, nếu không Postgres lấy using làm check).
  raise notice 'OK    cad-files: chủ file tự quản trong cad/<uid>/ (select/insert/update/delete)';
end
$do$;

commit;

-- ============ (B) PRODUCTS: DESIGNER ĐƯỢC ĐĂNG BÁN (bản chưa xuất bản) ============
-- ============================================================================
-- ĐỀ XUẤT (CHƯA ÁP) — cho phép DESIGNER đăng bán sản phẩm của mình.
--
-- VÌ SAO CẦN: hiện `products` chỉ có policy public-read (status published) + admin-all
-- (20261010_harden_rls.sql §5.1). Designer đăng nhập thật (creator.lethang@vcube.vn)
-- insert products bị RLS 42501 (verify 2026-10-23, handoff real-account-verification §3.1b)
-- ⇒ luồng upload của FL-2a không thể hoàn tất dù file đã upload + digital_assets OK.
--
-- NGUYÊN TẮC:
--   * Designer chỉ được tạo/sửa sản phẩm CỦA MÌNH và ở trạng thái CHƯA xuất bản
--     (`lower(status) in ('under review','pending','draft')` — app hiện dùng 'Under Review').
--   * Designer KHÔNG tự publish/archive; admin publish như hiện tại (admin-all giữ nguyên).
--   * Sản phẩm pending KHÔNG xuất hiện công khai (public_read vẫn chỉ `status='published'`).
--   * `designer_id` nullable để không phá dữ liệu cũ; sản phẩm admin tạo không cần designer_id.
--
-- CHẠY Ở ĐÂU: Supabase Dashboard → SQL Editor (DB production, có backup trước).
-- AN TOÀN: chỉ thêm cột (nullable) + index + 4 policy; không drop/sửa dữ liệu.
-- SAU KHI ÁP: chạy lại verification designer upload (FL-2a) + cập nhật AGENTS.md (13 migration?).
-- ============================================================================

alter table public.products
  add column if not exists designer_id uuid references auth.users(id) on delete set null;

create index if not exists idx_products_designer_id on public.products(designer_id);

-- (1) Designer đọc được sản phẩm của mình ở MỌI trạng thái (để quản lý/duyệt trong /designer).
drop policy if exists vcube_products_designer_read_own on public.products;
create policy vcube_products_designer_read_own on public.products
  for select to authenticated
  using (designer_id = (select auth.uid()));

-- (2) Designer INSERT sản phẩm mới: phải là của mình và status='pending'.
drop policy if exists vcube_products_designer_insert_pending on public.products;
create policy vcube_products_designer_insert_pending on public.products
  for insert to authenticated
  with check (designer_id = (select auth.uid()) and lower(status) in ('under review','pending','draft'));

-- (3) Designer UPDATE: chỉ sản phẩm CỦA MÌNH và còn pending (không tự publish).
drop policy if exists vcube_products_designer_update_pending on public.products;
create policy vcube_products_designer_update_pending on public.products
  for update to authenticated
  using (designer_id = (select auth.uid()) and lower(status) in ('under review','pending','draft'))
  with check (designer_id = (select auth.uid()) and lower(status) in ('under review','pending','draft'));

-- (4) Designer DELETE: chỉ sản phẩm CỦA MÌNH và còn pending.
drop policy if exists vcube_products_designer_delete_pending on public.products;
create policy vcube_products_designer_delete_pending on public.products
  for delete to authenticated
  using (designer_id = (select auth.uid()) and lower(status) in ('under review','pending','draft'));

-- ============ (C) SỬA SAMPLE ACCOUNT khachhang@vcube.vn (thiếu user_profiles) ============
insert into public.user_profiles (id, email, role, display_name, kyc_status)
select id, email, 'customer', 'Khách Demo', 'unverified'
  from auth.users where email = 'khachhang@vcube.vn'
on conflict (id) do update
  set email = excluded.email, role = 'customer';

-- ============ POST-CHECK (chạy sau, chỉ đọc) ============
select policyname, cmd, roles from pg_policies
 where schemaname='storage' and tablename='objects' and policyname='vcube_cad_files_cad_owner_rw';
select policyname, cmd from pg_policies
 where schemaname='public' and tablename='products' order by policyname;
select id, email, role from public.user_profiles where email='khachhang@vcube.vn';
