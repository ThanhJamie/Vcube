-- SEC-01 hotfix (T0A-3): designer_profiles đang lộ bank_name/bank_account/tax_id
-- vì bảng bị `select('*')` ở client. Thu hẹp quyền SELECT cho anon/authenticated
-- xuống danh sách cột an toàn; đọc 3 cột nhạy cảm qua 2 RPC security definer.
-- UPDATE/INSERT giữ nguyên (chưa đụng); designer vẫn ghi được bank_* trực tiếp cho tới T20.
begin;
revoke select on public.designer_profiles from anon, authenticated;
grant  select (id, user_id, display_name, bio, portfolio_url, avatar_url, royalty_percent, verified_status, rating, total_sales, created_at, updated_at) on public.designer_profiles to anon, authenticated;
-- UPDATE/INSERT giữ nguyên (chưa đụng); designer vẫn ghi được bank_* trực tiếp cho tới T20.

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
commit;
