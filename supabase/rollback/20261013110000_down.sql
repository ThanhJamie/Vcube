-- Rollback T25 — bỏ policy chủ sở hữu cho scheme `cad/<uid>/<uuid>/<file>` (D3).
--
-- LƯU Ý: rollback chỉ GỠ POLICY, không xoá object. File đã upload theo scheme mới sẽ không
-- còn đường đọc của chủ (chỉ còn admin + signed URL), nên cân nhắc trước khi chạy.
begin;

do $do$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists vcube_cad_files_cad_owner_rw on storage.objects;
    raise notice 'OK    đã bỏ policy vcube_cad_files_cad_owner_rw';
  else
    raise notice 'SKIP  storage.objects không tồn tại';
  end if;
end
$do$;

commit;
