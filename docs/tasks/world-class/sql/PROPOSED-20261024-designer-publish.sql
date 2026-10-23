-- ============================================================================
-- ĐỀ XUẤT (CHƯA ÁP) — cho phép DESIGNER đăng bán sản phẩm của mình.
--
-- VÌ SAO CẦN: hiện `products` chỉ có policy public-read (status published) + admin-all
-- (20261010_harden_rls.sql §5.1). Designer đăng nhập thật (creator.lethang@vcube.vn)
-- insert products bị RLS 42501 (verify 2026-10-23, handoff real-account-verification §3.1b)
-- ⇒ luồng upload của FL-2a không thể hoàn tất dù file đã upload + digital_assets OK.
--
-- NGUYÊN TẮC:
--   * Designer chỉ được tạo/sửa sản phẩm CỦA MÌNH và ở trạng thái CHƯA xuất bản
--     (`lower(status) in ('under review','pending','draft')` — app hiện dùng 'Under Review').
--   * Designer KHÔNG tự publish/archive; admin publish như hiện tại (admin-all giữ nguyên).
--   * Sản phẩm pending KHÔNG xuất hiện công khai (public_read vẫn chỉ `status='published'`).
--   * `designer_id` nullable để không phá dữ liệu cũ; sản phẩm admin tạo không cần designer_id.
--
-- CHẠY Ở ĐÂU: Supabase Dashboard → SQL Editor (DB production, có backup trước).
-- AN TOÀN: chỉ thêm cột (nullable) + index + 4 policy; không drop/sửa dữ liệu.
-- SAU KHI ÁP: chạy lại verification designer upload (FL-2a) + cập nhật AGENTS.md (13 migration?).
-- ============================================================================

alter table public.products
  add column if not exists designer_id uuid references auth.users(id) on delete set null;

create index if not exists idx_products_designer_id on public.products(designer_id);

-- (1) Designer đọc được sản phẩm của mình ở MỌI trạng thái (để quản lý/duyệt trong /designer).
drop policy if exists vcube_products_designer_read_own on public.products;
create policy vcube_products_designer_read_own on public.products
  for select to authenticated
  using (designer_id = (select auth.uid()));

-- (2) Designer INSERT sản phẩm mới: phải là của mình và status='pending'.
drop policy if exists vcube_products_designer_insert_pending on public.products;
create policy vcube_products_designer_insert_pending on public.products
  for insert to authenticated
  with check (designer_id = (select auth.uid()) and lower(status) in ('under review','pending','draft'));

-- (3) Designer UPDATE: chỉ sản phẩm CỦA MÌNH và còn pending (không tự publish).
drop policy if exists vcube_products_designer_update_pending on public.products;
create policy vcube_products_designer_update_pending on public.products
  for update to authenticated
  using (designer_id = (select auth.uid()) and lower(status) in ('under review','pending','draft'))
  with check (designer_id = (select auth.uid()) and lower(status) in ('under review','pending','draft'));

-- (4) Designer DELETE: chỉ sản phẩm CỦA MÌNH và còn pending.
drop policy if exists vcube_products_designer_delete_pending on public.products;
create policy vcube_products_designer_delete_pending on public.products
  for delete to authenticated
  using (designer_id = (select auth.uid()) and lower(status) in ('under review','pending','draft'));
