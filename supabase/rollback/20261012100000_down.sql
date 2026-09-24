-- Rollback T22b (20261012100000_check_constraints.sql).
--
-- Chỉ DROP các ràng buộc do migration này THÊM THẬT:
--   * orders_payment_status_chk   (mới)
--   * kyc_records_status_chk      (mới)
--   * orders_status_stage_index_chk (chỉ được thêm nếu DB chưa chạy baseline §3c)
--
-- KHÔNG drop `orders_status_chk` / `orders_status_stage_index_range_chk`: chúng có TRƯỚC
-- migration này (baseline 20260901_baseline_schema.sql §3c); rollback không được xoá ràng
-- buộc của baseline. `drop ... if exists` nên an toàn cả khi migration đã no-op.
begin;

alter table public.orders      drop constraint if exists orders_payment_status_chk;
alter table public.kyc_records drop constraint if exists kyc_records_status_chk;
alter table public.orders      drop constraint if exists orders_status_stage_index_chk;

commit;
