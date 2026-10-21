-- ==============================================================================
-- Rollback T20 phase 2 (20261013100000) — thêm lại 3 cột vào `designer_profiles`.
-- ==============================================================================
-- ⚠️ MẤT DỮ LIỆU: `drop column` đã xoá giá trị gốc. File này chỉ tạo lại cột với
-- DEFAULT '' (RỖNG), KHÔNG khôi phục được dữ liệu. Bản sao duy nhất còn lại nằm ở
-- `public.designer_payout_info`; chép ngược thủ công nếu thật cần:
--
--   update public.designer_profiles dp
--      set bank_name    = p.bank_name,
--          bank_account = p.bank_account,
--          tax_id       = p.tax_id
--     from public.designer_payout_info p
--    where p.designer_id = dp.id;
--
-- 2 RPC của phase 1 vẫn đọc `designer_payout_info` nên app không phụ thuộc 3 cột này.
-- ==============================================================================
begin;

alter table public.designer_profiles
  add column if not exists bank_name    text default '',
  add column if not exists bank_account text default '',
  add column if not exists tax_id       text default '';

commit;
