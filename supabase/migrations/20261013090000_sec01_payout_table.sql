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
