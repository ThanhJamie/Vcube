-- Rollback SEC-01 hotfix (T0A-3): trả lại quyền SELECT toàn bảng (gồm cả
-- bank_name/bank_account/tax_id) và bỏ 2 RPC payout.
begin;
grant select on public.designer_profiles to anon, authenticated;
drop function if exists public.get_my_payout_info();
drop function if exists public.admin_get_designer_payout(uuid);
commit;
