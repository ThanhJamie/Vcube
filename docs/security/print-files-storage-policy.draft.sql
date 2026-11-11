-- VCUBE — DRAFT policy cho tệp in private (V1)
-- KHÔNG chạy trong supabase/migrations. Owner review rồi mới áp.
-- Base f5af78d; bucket mới tách khỏi cad-files để không trộn tài sản bán file số.
-- Path: print/<owner_uid>/<draft_id>/<uuid>.<ext>
-- Ref trong orders.items[].printFile = { path, name, sizeBytes, contentType, checksum }
--
-- Giả định:
--   * chỉ authenticated upload (V1a); guest upload cần signed upload URL/Edge Function (V1b)
--   * workshop lấy signed URL ngắn hạn; policy select dưới đây là cổng quyền
--   * workshop chỉ đọc object có path xuất hiện trong orders.items của đơn được gán
--   * path string KHÔNG chứng minh object tồn tại; service phải list/createSignedUrl để kiểm

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'print-files', 'print-files', false, 524288000,
  array[
    'application/octet-stream','model/stl','model/step','model/3mf','model/obj',
    'application/zip','application/x-zip-compressed'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Owner: upload/select/delete đúng prefix print/<uid>/...
drop policy if exists vcube_print_files_owner_rw on storage.objects;
create policy vcube_print_files_owner_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'print-files'
    and (storage.foldername(name))[1] = 'print'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'print-files'
    and (storage.foldername(name))[1] = 'print'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- Admin: đọc/hỗ trợ toàn bộ bucket (không dùng để upload hộ khách).
drop policy if exists vcube_print_files_admin_all on storage.objects;
create policy vcube_print_files_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'print-files' and public.is_admin())
  with check (bucket_id = 'print-files' and public.is_admin());

-- Workshop được gán: CHỈ select object có path trong items của đơn assigned cho mình.
-- `storage.foldername(name)` với print/<uid>/<draft>/<file> = {print,uid,draft}.
-- JSONB containment: orders.items chứa object printFile có path tương ứng.
drop policy if exists vcube_print_files_assigned_workshop_read on storage.objects;
create policy vcube_print_files_assigned_workshop_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'print-files'
    and (storage.foldername(name))[1] = 'print'
    and exists (
      select 1
      from public.orders o
      where o.assigned_workshop_id = public.current_workshop_partner_id()
        and o.status <> 'cancelled'
        and o.items @> jsonb_build_array(
          jsonb_build_object('printFile', jsonb_build_object('path', storage.objects.name))
        )
    )
  );

-- Ghi chú review:
-- 1) `current_workshop_partner_id()` chỉ grant authenticated; policy chỉ `to authenticated`.
-- 2) Không tạo policy anon/guest. V1a guest upload bị chặn; V1b cần signed upload URL.
-- 3) Owner delete hiện cho phép cả khi đơn active; nếu cần chặn, phải thêm điều kiện
--    `not exists (select 1 from orders ... status in ('processing','printing',...))`
--    hoặc chuyển delete sang service/admin.
-- 4) Cần test: owner A không đọc path B; workshop assigned đọc; workshop khác 0; admin đọc;
--    object missing createSignedUrl fail; path tampered không khớp orders.items.
-- 5) Bucket limit 500MB là đề xuất; owner chốt theo gói. TUS/resumable >6MB cần client riêng.
