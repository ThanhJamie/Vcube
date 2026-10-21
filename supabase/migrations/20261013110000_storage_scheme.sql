-- T25 — Storage scheme cho file CAD: `cad/<uid>/<uuid>/<file>` + policy chủ sở hữu (D3).
--
-- NGỮ CẢNH (T25a, chốt D3 ngày 2026-09-24):
--   * Không có đường upload nào đang chạy: `dbService.uploadCadFile` là DEAD CODE (0 call site).
--   * `orders/<order_id>/...` BẤT KHẢ THI: upload xảy ra TRƯỚC khi đơn tồn tại (từ Tool3D/báo
--     giá), nên không thể đặt tên theo order_id. Việc gắn file vào đơn làm SAU, qua bảng
--     `order_files` khi tạo đơn (T40) — policy người mua theo `order_files` đã có từ 20261010.
--   * Scheme chốt: `cad/<uid|guest_session>/<uuid>/<file>`.
--     - User đăng nhập: `cad/<auth.uid()>/<uuid>/<file>` — policy dưới đây phủ ĐÚNG thư mục
--       cấp 2 = uid của người gọi nên chủ A không chạm được file của chủ B.
--     - Guest: KHÔNG dùng được `auth.uid()` (NULL) ⇒ cần luồng service-role/signed upload
--       riêng, CHƯA làm ở task này. KHÔNG thêm policy anon (sẽ mở bucket cho mọi khách).
--
-- MỤC TIÊU: chủ file tự đọc/ghi/xoá file của mình trong `cad/<uid>/...`; người khác KHÔNG.
-- Bucket `cad-files` là PRIVATE; policy admin (`vcube_cad_files_admin_all`) và policy người
-- mua (`vcube_cad_files_order_files_read` / `vcube_cad_files_buyer_read`) KHÔNG đổi.
--
-- VÌ SAO `(select auth.uid())`: gói trong subquery để Postgres initplan hoá một lần cho cả
-- câu truy vấn thay vì gọi lại mỗi hàng (đúng mẫu của 20261010_harden_rls.sql).
--
-- ⚠️ OBJECT CŨ dưới `cad/` phẳng (`cad/<file>`, scheme trước đây): `(storage.foldername(name))[2]`
--    là NULL nên chúng KHÔNG khớp policy này. Chúng vẫn đọc được qua admin + policy người mua
--    (nếu `order_files.storage_path` / `orders.items` trỏ tới), nhưng cần rà & đổi tên khi
--    backfill `order_files` (T40). Không thêm policy đọc tạm cho prefix phẳng — sẽ mở file.
--
-- POST-CHECK (chạy sau khi áp, chỉ đọc):
--     select policyname, cmd, roles, qual, with_check
--       from pg_policies
--      where schemaname = 'storage' and tablename = 'objects'
--        and policyname = 'vcube_cad_files_cad_owner_rw';
--   Kỳ vọng: đúng 1 dòng, cmd = 'ALL', roles = '{authenticated}', qual + with_check đều chứa
--   `foldername` và `auth.uid()`. `select ... from storage.objects` bằng user A phải chỉ thấy
--   object dưới `cad/<uid-A>/...`.
--
-- DRAFT: file này do subagent soạn, CHƯA áp lên production. H áp theo §1.4 của
-- docs/tasks/DRIFT-TASKS.md (backup + SQL Editor + post-check).
begin;

do $do$
begin
  if to_regclass('storage.objects') is null then
    raise warning 'SKIP  storage.objects không tồn tại — bỏ qua policy cad/<uid>/...';
    return;
  end if;

  -- Idempotent: Postgres không có `create policy if not exists` ⇒ drop rồi tạo lại. Chỉ đụng
  -- ĐÚNG tên policy của mình, không xoá policy khác trên bucket.
  --
  -- GUARD PATH (review nit T25): `foldername[1..2]` một mình vẫn nhận path lách kiểu
  --   `cad/<uidA>/../<uidB>/f` (storage resolve `..` thành `cad/<uidB>/f` ⇒ chủ A chạm file
  --   của B) hoặc path thiếu cấp (`cad/<uid>/f`). Vì vậy:
  --     * position('..' in name) = 0        — chặn mọi đoạn `..`;
  --     * array_length(foldername, 1) >= 3 — bắt buộc đủ `cad/<uid>/<uuid>/<file>`.
  --   Guard phải có ở CẢ using lẫn with check: using chặn đọc/ghi đè/xoá, with check chặn ghi.
  execute 'drop policy if exists vcube_cad_files_cad_owner_rw on storage.objects';
  execute $pol$create policy vcube_cad_files_cad_owner_rw on storage.objects
             for all to authenticated
             using (bucket_id = 'cad-files'
                    and (storage.foldername(name))[1] = 'cad'
                    and (storage.foldername(name))[2] = (select auth.uid())::text
                    and position('..' in name) = 0
                    and coalesce(array_length(storage.foldername(name), 1), 0) >= 3)
             with check (bucket_id = 'cad-files'
                    and (storage.foldername(name))[1] = 'cad'
                    and (storage.foldername(name))[2] = (select auth.uid())::text
                    and position('..' in name) = 0
                    and coalesce(array_length(storage.foldername(name), 1), 0) >= 3)$pol$;
  -- FOR ALL = select/insert/update/delete; USING áp cho select/update/delete, WITH CHECK áp
  -- cho insert/update (insert bắt buộc có with check, nếu không Postgres lấy using làm check).
  raise notice 'OK    cad-files: chủ file tự quản trong cad/<uid>/ (select/insert/update/delete)';
end
$do$;

commit;
