-- DB-03 / DB-04 / NEW-02 (T22b, quyết định D11) — CHECK cho các cột enum-like.
--
-- Chiến lược D11: `NOT VALID` → người vận hành audit dữ liệu thật → dọn → `VALIDATE`.
-- `add constraint ... not valid` KHÔNG quét bảng hiện có (không khoá lâu, không đỏ vì dữ
-- liệu cũ) nhưng VẪN thi hành cho mọi INSERT/UPDATE mới ⇒ không có cửa sổ dữ liệu bẩn mới.
--
-- Trạng thái thực tế (đã rà 2026-09-24, KHÁC giả định "4 cột đều trống"): 2/4 cột ĐÃ có
-- CHECK từ baseline §3c (20260901_baseline_schema.sql):
--   * `orders.status`             → `orders_status_chk`                     (dòng 802-810)
--   * `orders.status_stage_index` → `orders_status_stage_index_range_chk`    (dòng 777-784)
-- Để KHÔNG trùng tên và KHÔNG tạo 2 ràng buộc cùng nghĩa, hai cột này được thêm có GUARD
-- `if not exists` (no-op trên DB đã chạy baseline; chỉ thêm thật trên DB khuyết baseline).
-- Hai cột còn lại THIẾU CHECK và được thêm thật ở đây:
--   * `orders.payment_status`     → `orders_payment_status_chk`   (MỚI)
--   * `kyc_records.status`        → `kyc_records_status_chk`       (MỚI)
--
-- Tập giá trị cho phép = HỢP(default DB, union code). Từng khối nêu nguồn file:line.
begin;

-- 1. orders.payment_status — MỚI.
--    Union code: `OrderPaymentStatus` = src/types/index.ts:79
--      'awaiting_payment' | 'paid' | 'cod' | 'cancelled' | 'unpaid'.
--    Đường ghi thực tế:
--      * CheckoutView.tsx:141-142 → 'cod' | 'awaiting_payment' (đơn mới KHÔNG tự nhận 'paid').
--      * database.ts:369          → 'paid' | 'unpaid' (fallback).
--      * default DB 'unpaid'      (baseline 20260901, khối `orders`).
--    ⚠️ docs/database/schema.md:75 ghi 'pending'/'failed'/'refunded' — ĐÓ LÀ DRIFT: không giá
--    trị nào trong 3 nguồn trên. T11 (`schema-notes.md`) ghi lại chênh lệch 3 chiều này.
alter table public.orders add constraint orders_payment_status_chk
  check (payment_status in ('awaiting_payment','paid','cod','cancelled','unpaid')) not valid;

-- 2. kyc_records.status — MỚI.
--    Union code:
--      * database.ts:531 updateUserKyc — 'verified' | 'pending_review' | 'rejected' | 'unverified'
--      * Group3CustomersPanel.tsx:10 KycStatus — 'verified' | 'pending_review' | 'rejected' | 'unverified'
--      * types/index.ts:832 kycStatus — 'unverified' | 'pending' | 'verified' | 'rejected'
--      * docs/database/schema.md:77 liệt kê cùng tập cho `kyc_records.status`.
--    default DB 'pending' (baseline 20260901, khối `kyc_records`) — đã nằm trong tập.
--    'pending_review' BẮT BUỘC có: admin UI gộp 'pending' → 'pending_review'
--    (Group3CustomersPanel.tsx:35). Seed-sample-data.mjs:673 ghi 'pending'.
alter table public.kyc_records add constraint kyc_records_status_chk
  check (status in ('pending','pending_review','verified','rejected','unverified')) not valid;

-- 3. orders.status — ĐÃ CÓ `orders_status_chk` (baseline §3c). Guard chỉ để idempotent.
--    Union code: `Order['status']` = src/types/index.ts:86 (đúng 8 giá trị).
do $do$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'orders_status_chk'
       and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_status_chk
      check (status in ('pending_payment','processing','printing','post_processing',
                        'packaging','shipping','completed','cancelled')) not valid;
    raise notice 'T22b: đã thêm orders_status_chk (DB chưa chạy baseline §3c)';
  else
    raise notice 'T22b: bỏ qua orders_status_chk — ràng buộc đã tồn tại';
  end if;
end
$do$;

-- 4. orders.status_stage_index — ĐÃ CÓ `orders_status_stage_index_range_chk` (baseline §3c).
--    Guard theo CẢ HAI tên để không tạo ràng buộc trùng nghĩa.
--    Nguồn 0..7: MES_PIPELINE_STAGES = src/frontend/components/OrderProgress.tsx:13-21
--    (ĐÚNG 8 nấc, step 1..8), useProductionStore.ts cùng 8 khoá, types/index.ts:88 "0 to 7".
do $do$
begin
  if not exists (
    select 1 from pg_constraint
     where conname in ('orders_status_stage_index_range_chk','orders_status_stage_index_chk')
       and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_status_stage_index_chk
      check (status_stage_index >= 0 and status_stage_index <= 7) not valid;
    raise notice 'T22b: đã thêm orders_status_stage_index_chk (DB chưa chạy baseline §3c)';
  else
    raise notice 'T22b: bỏ qua status_stage_index — ràng buộc đã tồn tại';
  end if;
end
$do$;

commit;

-- ============================================================================
-- BƯỚC NGƯỜI VẬN HÀNH — CHẠY SAU (KHÔNG thuộc transaction trên)
-- ============================================================================
-- D11: sau `add ... not valid`, ràng buộc chỉ áp cho dòng MỚI. Trước khi `VALIDATE`
-- (quét toàn bảng và áp cho dòng CŨ) PHẢI audit + dọn dữ liệu. Chạy từng khối trong
-- SQL Editor với vai trò postgres.
--
-- (a) AUDIT — đếm giá trị thật đang có:
--   select payment_status, count(*) from public.orders      group by 1 order by 2 desc;
--   select status,         count(*) from public.kyc_records group by 1 order by 2 desc;
--   select status,         count(*) from public.orders      group by 1 order by 2 desc;
--   select status_stage_index, count(*) from public.orders  group by 1 order by 2 desc;
--
-- (b) TÌM DÒNG VI PHẠM (dòng cũ mà constraint mới sẽ từ chối):
--   select id, payment_status from public.orders
--    where payment_status not in ('awaiting_payment','paid','cod','cancelled','unpaid');
--   select id, status from public.kyc_records
--    where status not in ('pending','pending_review','verified','rejected','unverified');
--   select id, status from public.orders
--    where status not in ('pending_payment','processing','printing','post_processing',
--                         'packaging','shipping','completed','cancelled');
--   select id, status_stage_index from public.orders
--    where status_stage_index < 0 or status_stage_index > 7;
--
-- (c) DỌN — ánh xạ từng giá trị lạ về giá trị hợp lệ gần nghĩa nhất (KHÔNG bịa).
--     Ví dụ (SỬA theo kết quả audit thật, đây chỉ là mẫu):
--   -- update public.orders set payment_status = 'unpaid'
--   --  where payment_status not in ('awaiting_payment','paid','cod','cancelled','unpaid');
--   -- update public.kyc_records set status = 'pending'
--   --  where status not in ('pending','pending_review','verified','rejected','unverified');
--     Nếu audit cho thấy một giá trị HỢP LỆ bị thiếu trong tập (ví dụ dữ liệu cũ dùng
--     'refunded'), thì mở rộng tập: `drop constraint` rồi `add constraint ... not valid`
--     với tập mới, rồi mới validate — KHÔNG xoá dữ liệu thật để chiều constraint.
--     Ghi kết quả audit/chênh lệch vào báo cáo T11 `docs/database/schema-notes.md`.
--
-- (d) VALIDATE — sau khi (b) trả 0 dòng cho mọi cột:
--   alter table public.orders      validate constraint orders_payment_status_chk;
--   alter table public.kyc_records validate constraint kyc_records_status_chk;
--   -- Hai ràng buộc dưới đã validated trên DB chạy baseline §3c; lệnh là no-op an toàn:
--   alter table public.orders      validate constraint orders_status_chk;
--   alter table public.orders      validate constraint orders_status_stage_index_range_chk;
--
-- (e) KIỂM CHỨNG — tất cả phải `convalidated = true`:
--   select conname, convalidated from pg_constraint
--    where conrelid in ('public.orders'::regclass, 'public.kyc_records'::regclass)
--      and contype = 'c'
--    order by conname;
