-- VCUBE — W2b BUNDLE 2026-09-24 (payout table phase 1 + storage scheme policy)
-- KHÔNG gồm 20261013100000 (drop cột bank) — H-gated, áp SAU khi deploy+verify.

-- ============================================================
-- >>> supabase/migrations/20261013090000_sec01_payout_table.sql
-- ============================================================
-- ==============================================================================
-- SEC-01 / T20 (phase 1) — Tách thông tin nhận tiền của nhà thiết kế ra bảng riêng.
-- ==============================================================================
-- BỐI CẢNH
--   Hotfix T0A-3 (20261011090000_sec01_designer_payout_hotfix.sql) đã đóng lỗ hổng
--   bằng cách revoke SELECT mức bảng trên `designer_profiles` và chỉ grant theo cột
--   an toàn; 3 cột `bank_name/bank_account/tax_id` chỉ còn đọc được qua 2 RPC
--   security definer. Đó là defense-in-depth MỨC QUYỀN.
--
--   T20 đi thêm một bước MỨC SCHEMA: đưa 3 cột nhận tiền sang bảng riêng
--   `public.designer_payout_info` để bề mặt `designer_profiles` (bảng đọc công khai)
--   KHÔNG CÒN chứa PII thanh toán ngay cả khi ai đó grant nhầm `select *`.
--
-- PHASE 1 (file này, apply-ready):
--   1. Tạo bảng `designer_payout_info` (1-1 với `designer_profiles`, FK cascade).
--   2. RLS: chủ sở hữu đọc/ghi hàng của mình; admin đọc/sửa mọi hàng (không có đường
--      DELETE); anon bị revoke sạch.
--   3. Chép dữ liệu hiện có từ `designer_profiles` (chỉ hàng có ít nhất 1 cột non-empty).
--   4. Trỏ lại `get_my_payout_info()` / `admin_get_designer_payout(uuid)` vào bảng mới.
--   5. Thêm RPC `upsert_my_payout_info(...)` (security definer) cho chủ hồ sơ tự ghi.
--
-- PHASE 2 (file RIÊNG, cổng H — CHƯA áp):
--   `20261013100000_drop_designer_bank_columns.sql` mới drop 3 cột khỏi
--   `designer_profiles`, sau khi client mới đã deploy và đã kiểm chứng không còn
--   writer/reader nào chạm 3 cột đó (xem seed-sample-data.mjs + useDesignerAdminStore.ts).
-- ==============================================================================

begin;

-- ---------- 1. Bảng thông tin nhận tiền (1-1 designer_profiles) ----------
create table if not exists public.designer_payout_info (
    designer_id   uuid primary key references public.designer_profiles(id) on delete cascade,
    bank_name     text default '',
    bank_account  text default '',
    tax_id        text default '',
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

comment on table public.designer_payout_info is
  'SEC-01/T20: thông tin nhận tiền (PII thanh toán) tách khỏi designer_profiles; RLS chủ sở hữu + admin, anon bị chặn.';

-- ---------- 2. RLS + quyền ----------
alter table public.designer_payout_info enable row level security;

-- Anon KHÔNG BAO GIỜ được chạm bảng này. Bảng mới của Supabase nhận quyền ALL mặc định
-- (default privileges) cho `authenticated` ⇒ phải revoke CẢ `authenticated` rồi grant lại
-- đúng select/insert/update. KHÔNG có đường DELETE: chủ hồ sơ không được xoá dấu vết nhận
-- tiền và `authenticated` không được grant DELETE, nên policy
-- `vcube_designer_payout_info_admin_all` chỉ còn hiệu lực cho select/insert/update
-- (admin cũng không xoá được qua PostgREST).
revoke all on public.designer_payout_info from public, anon, authenticated;
grant select, insert, update on public.designer_payout_info to authenticated;

-- Chủ sở hữu: `designer_id` phải là hàng `designer_profiles` có `user_id = auth.uid()`.
-- Biểu thức này chạy dưới RLS của `designer_profiles` (chủ đọc được hàng của mình qua
-- `vcube_designer_profiles_owner_all`), không cần security definer.
drop policy if exists vcube_designer_payout_info_owner_select on public.designer_payout_info;
create policy vcube_designer_payout_info_owner_select
  on public.designer_payout_info
  for select
  to authenticated
  using (designer_id in (select id from public.designer_profiles where user_id = (select auth.uid())));

drop policy if exists vcube_designer_payout_info_owner_insert on public.designer_payout_info;
create policy vcube_designer_payout_info_owner_insert
  on public.designer_payout_info
  for insert
  to authenticated
  with check (designer_id in (select id from public.designer_profiles where user_id = (select auth.uid())));

drop policy if exists vcube_designer_payout_info_owner_update on public.designer_payout_info;
create policy vcube_designer_payout_info_owner_update
  on public.designer_payout_info
  for update
  to authenticated
  using (designer_id in (select id from public.designer_profiles where user_id = (select auth.uid())))
  with check (designer_id in (select id from public.designer_profiles where user_id = (select auth.uid())));

drop policy if exists vcube_designer_payout_info_admin_all on public.designer_payout_info;
create policy vcube_designer_payout_info_admin_all
  on public.designer_payout_info
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 3. Chép dữ liệu hiện có (idempotent) ----------
-- Chỉ tạo hàng khi có ít nhất 1 cột non-empty; hàng toàn rỗng để trống (đọc qua RPC
-- trả NULL y như trước hotfix). `on conflict do nothing` để chạy lại không ghi đè.
insert into public.designer_payout_info
      (designer_id, bank_name, bank_account, tax_id, created_at, updated_at)
select dp.id,
       coalesce(dp.bank_name, ''),
       coalesce(dp.bank_account, ''),
       coalesce(dp.tax_id, ''),
       dp.created_at,
       dp.updated_at
  from public.designer_profiles dp
 where coalesce(dp.bank_name, '') <> ''
    or coalesce(dp.bank_account, '') <> ''
    or coalesce(dp.tax_id, '') <> ''
on conflict (designer_id) do nothing;

-- ---------- 4. Trỏ lại 2 RPC đọc bảng mới ----------
create or replace function public.get_my_payout_info()
returns table(bank_name text, bank_account text, tax_id text)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.bank_name, p.bank_account, p.tax_id
  from public.designer_profiles dp
  left join public.designer_payout_info p on p.designer_id = dp.id
  where dp.user_id = (select auth.uid())
$$;
revoke all on function public.get_my_payout_info() from public, anon;
grant execute on function public.get_my_payout_info() to authenticated;

create or replace function public.admin_get_designer_payout(p_designer_id uuid)
returns table(bank_name text, bank_account text, tax_id text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select p.bank_name, p.bank_account, p.tax_id
               from public.designer_payout_info p
              where p.designer_id = p_designer_id;
end $$;
revoke all on function public.admin_get_designer_payout(uuid) from public, anon;
grant execute on function public.admin_get_designer_payout(uuid) to authenticated;

-- ---------- 5. RPC chủ hồ sơ tự ghi thông tin nhận tiền ----------
-- Chỉ ghi được cho CHÍNH hàng `designer_profiles` của người gọi (không nhận designer_id
-- từ client ⇒ không thể ghi hộ người khác). Không có hàng designer ⇒ 42501.
create or replace function public.upsert_my_payout_info(
  p_bank_name text,
  p_bank_account text,
  p_tax_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid         uuid := (select auth.uid());
  v_designer_id uuid;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- `designer_profiles.user_id` KHÔNG có unique ⇒ chọn hàng cũ nhất cho tất định.
  select dp.id into v_designer_id
    from public.designer_profiles dp
   where dp.user_id = v_uid
   order by dp.created_at
   limit 1;

  if v_designer_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.designer_payout_info
        (designer_id, bank_name, bank_account, tax_id, updated_at)
  values
        (v_designer_id,
         coalesce(p_bank_name, ''),
         coalesce(p_bank_account, ''),
         coalesce(p_tax_id, ''),
         now())
  on conflict (designer_id) do update
    set bank_name    = excluded.bank_name,
        bank_account = excluded.bank_account,
        tax_id       = excluded.tax_id,
        updated_at   = now();
end
$fn$;
revoke all on function public.upsert_my_payout_info(text, text, text) from public, anon;
grant execute on function public.upsert_my_payout_info(text, text, text) to authenticated;

commit;

-- ============================================================
-- >>> supabase/migrations/20261013110000_storage_scheme.sql
-- ============================================================
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

