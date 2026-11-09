-- ============================================================================
-- PR-2 — Toàn vẹn dữ liệu khách hàng: 1 hồ sơ `customer_profiles` / `user_id`
-- CHƯA ÁP PRODUCTION. Chạy sau các migration hiện có (schema nền `20260901_baseline_schema.sql`).
--
-- Vì sao cần:
--   `public.customer_profiles` chỉ có index THƯỜNG `idx_customer_user(user_id)`,
--   nên một user có thể có nhiều dòng hồ sơ. Code đọc/ghi (customerProfileService,
--   workshop/customers) đã phải tự chọn `.limit(1)` để chịu được dữ liệu bẩn.
--   Index UNIQUE một phần dưới đây chốt bất biến "1 user ⇒ tối đa 1 hồ sơ".
--
-- An toàn dữ liệu:
--   * Chỉ xoá khi THỰC SỰ có trùng `user_id`; giữ dòng có `updated_at` mới nhất
--     (fallback `created_at`, cuối cùng là `id`) — DELETE chỉ chạm `rn > 1`.
--   * `user_id IS NULL` KHÔNG bị đụng tới: các dòng mồ côi/khách vãng lai được giữ
--     nguyên, và index là index MỘT PHẦN (`where user_id is not null`).
--   * Idempotent: chạy lại lần 2 không còn trùng ⇒ 0 dòng bị xoá;
--     `create unique index if not exists` là no-op.
--
-- ROLLBACK:
--   begin;
--     drop index if exists public.ux_customer_profiles_user_id;
--   commit;
--   ⚠ Các dòng trùng đã bị xoá KHÔNG tự khôi phục được — chụp snapshot/backup
--   bảng trước khi chạy (ví dụ `create table public.customer_profiles_bak_pr2 as
--   select * from public.customer_profiles;`), cần thì chép lại thủ công.
-- ============================================================================

begin;

-- 0) Báo cáo trước khi dọn: nhóm `user_id` đang có nhiều hơn 1 hồ sơ.
select user_id, count(*) as so_dong
  from public.customer_profiles
 where user_id is not null
 group by user_id
having count(*) > 1
 order by so_dong desc;

-- 1) Dedupe: giữ dòng mới nhất cho mỗi `user_id` (chỉ xoá phần dư `rn > 1`).
--    Thứ tự ưu tiên: updated_at → created_at → id (deterministic).
with ranked as (
  select id,
         row_number() over (
           partition by user_id
           order by updated_at desc nulls last,
                    created_at desc nulls last,
                    id
         ) as rn
    from public.customer_profiles
   where user_id is not null
)
delete from public.customer_profiles cp
 using ranked r
 where cp.id = r.id
   and r.rn > 1;

-- 2) Chốt bất biến 1-1 ở tầng DB (index một phần: bỏ qua user_id NULL).
create unique index if not exists ux_customer_profiles_user_id
  on public.customer_profiles (user_id)
  where user_id is not null;

commit;

-- 3) Kiểm tra sau khi chạy (kỳ vọng 0 dòng).
-- select user_id, count(*) as so_dong
--   from public.customer_profiles
--  where user_id is not null
--  group by user_id
-- having count(*) > 1;
