-- ============================================================================
-- 20261024090000 — Designer tự đăng bán sản phẩm (products.designer_id + 4 policy)
--
-- TRẠNG THÁI: ĐÃ ÁP lên production 2026-10-23 (chủ dự án chạy APPLY-TODAY.sql qua SQL Editor).
-- File này ghi lại đúng SQL đã áp để repo khớp DB (không chạy lại nếu DB đã có — idempotent nhờ if not exists/drop policy if exists).
--
-- BỐI CẢNH: verify real-account 2026-10-23 cho thấy designer upload file + digital_assets OK nhưng
-- INSERT products bị RLS 42501 vì bảng chỉ có public-read (status published) + admin-all.
-- FL-2a cần designer tạo sản phẩm CHƯA xuất bản; admin vẫn là bên publish.
--
-- LUẬT: designer chỉ đọc/thêm/sửa/xoá sản phẩm CỦA MÌNH và ở trạng thái chưa xuất bản
-- (lower(status) in ('under review','pending','draft')). Không tự publish. Sản phẩm pending không lộ public.
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
