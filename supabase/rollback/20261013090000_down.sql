-- ==============================================================================
-- Rollback T20 phase 1 (20261013090000) — trả về trạng thái SAU hotfix T0A-3:
-- 3 cột bank_* nằm lại `designer_profiles`, 2 RPC đọc từ đó, bỏ bảng tách + RPC upsert.
--
-- KHÔNG grant lại SELECT mức bảng trên `designer_profiles`: rollback này giữ nguyên
-- hotfix SEC-01 (grant theo cột). Chỉ dùng khi phase 1 gây sự cố trước khi phase 2 chạy.
-- ==============================================================================
begin;

-- 1. Chép ngược dữ liệu về 3 cột gốc (phase 1 chưa drop nên cột vẫn tồn tại).
update public.designer_profiles dp
   set bank_name    = p.bank_name,
       bank_account = p.bank_account,
       tax_id       = p.tax_id
  from public.designer_payout_info p
 where p.designer_id = dp.id;

-- 2. Trả 2 RPC về đúng định nghĩa hotfix T0A-3.
create or replace function public.get_my_payout_info()
returns table(bank_name text, bank_account text, tax_id text)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.bank_name, p.bank_account, p.tax_id
  from public.designer_profiles p
  where p.user_id = (select auth.uid())
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
               from public.designer_profiles p where p.id = p_designer_id;
end $$;
revoke all on function public.admin_get_designer_payout(uuid) from public, anon;
grant execute on function public.admin_get_designer_payout(uuid) to authenticated;

-- 3. Bỏ RPC upsert + bảng tách (drop table tự bỏ policy + grant của bảng).
drop function if exists public.upsert_my_payout_info(text, text, text);
drop table if exists public.designer_payout_info cascade;

commit;
