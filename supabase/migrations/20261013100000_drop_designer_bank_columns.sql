-- ==============================================================================
-- SEC-01 / T20 (phase 2) — Drop 3 cột nhận tiền khỏi `designer_profiles`.
-- ==============================================================================
-- ⚠️ CỔNG H — KHÔNG ĐƯỢC ÁP TỰ ĐỘNG. Chỉ chạy SAU KHI:
--   1. `20261013090000_sec01_payout_table.sql` (phase 1) đã áp trên prod; và
--   2. client mới đã deploy (seed mới ghi vào `designer_payout_info`, store không còn
--      đọc cột bank_*); và
--   3. đã kiểm chứng: 2 RPC trả đúng dữ liệu từ bảng mới + không còn writer/reader nào
--      chạm `designer_profiles.bank_name/bank_account/tax_id` (grep `src` + `scripts`).
--
-- SAU FILE NÀY: dữ liệu nhận tiền CHỈ còn trong `public.designer_payout_info`; đọc/ghi
-- qua `get_my_payout_info()` / `admin_get_designer_payout(uuid)` /
-- `upsert_my_payout_info(...)`. Rollback file `_down.sql` chỉ thêm lại cột RỖNG —
-- muốn có dữ liệu phải chép tay từ `designer_payout_info`.
--
-- GHI CHÚ: trigger `fn_protect_designer_profile_privileged_columns`
-- (20261011110000_designer_profile_column_guard.sql) còn liệt kê 3 tên cột này trong
-- allowlist; tên không tồn tại là vô hại (`to_jsonb(new) - v_allowed`), có thể dọn ở
-- task sau — KHÔNG cần thiết cho tính đúng đắn.
-- ==============================================================================

begin;

alter table public.designer_profiles
  drop column if exists bank_name,
  drop column if exists bank_account,
  drop column if exists tax_id;

commit;
