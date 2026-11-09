-- ============================================================================
-- VCUBE — dọn dữ liệu demo trước khi mở bán
-- Chạy: node scripts/db-query.mjs --file scripts/sql/2026-11-09-demo-data-cleanup.sql --apply
--
-- An toàn: chỉ UPDATE/DELETE có điều kiện `[MẪU]` / ảnh bịa / fixture review.
-- Không xoá catalog (tránh FK order_items) — chỉ ẩn `status='draft'`.
-- Rollback: dùng snapshot/Bảng backup trước khi chạy (xem docs/tasks/demo-data-cleanup.md).
-- ============================================================================

begin;

-- 0) Đếm trước để đối chiếu sau khi chạy.
select
  (select count(*) from public.products    where name like '%[MẪU]%') as products_demo,
  (select count(*) from public.accessories where name like '%[MẪU]%') as accessories_demo,
  (select count(*) from public.reviews     where comment like '%[MẪU]%') as reviews_demo;

-- 1) Ẩn sản phẩm demo khỏi storefront (KHÔNG xoá — giữ FK order_items).
update public.products
   set status = 'draft',
       updated_at = now()
 where name like '%[MẪU]%'
   and status <> 'draft';

-- 2) Ảnh bịa → NULL (data-honesty: không thay bằng ảnh bịa khác).
update public.products
   set images = '[]'::jsonb,
       thumbnail_url = null,
       updated_at = now()
 where images::text like '%images.unsplash.com%'
    or images::text like '%picsum.photos%'
    or thumbnail_url like '%images.unsplash.com%'
    or thumbnail_url like '%picsum.photos%';

update public.accessories
   set image_url = null
 where image_url like '%images.unsplash.com%'
    or image_url like '%picsum.photos%';

-- 3) Nội dung site demo → tắt banner + xoá chuỗi demo, KHÔNG bịa thông tin liên hệ.
update public.site_content
   set announcement_enabled = false,
       announcement_text    = case when announcement_text like '%[MẪU]%' then '' else announcement_text end,
       hero_badge           = case when hero_badge like '%[MẪU]%' then 'TUYỂN TẬP CHẾ TÁC CHÍNH XÁC VCUBE 2026' else hero_badge end,
       hero_title           = case when hero_title like '%[MẪU]%' then 'In 3D & CAD chính xác' else hero_title end,
       hero_subtitle        = case when hero_subtitle like '%[MẪU]%' then '' else hero_subtitle end,
       phone                = case when phone like '%[MẪU]%' or phone ~ '^0+$' then '' else phone end,
       email                = case when email like '%[MẪU]%' or email like '%example.com%' then '' else email end,
       hanoi_workshop_address  = case when hanoi_workshop_address like '%[MẪU]%' then '' else hanoi_workshop_address end,
       danang_workshop_address = case when danang_workshop_address like '%[MẪU]%' then '' else danang_workshop_address end,
       hcm_workshop_address    = case when hcm_workshop_address like '%[MẪU]%' then '' else hcm_workshop_address end,
       settings             = case when settings::text like '%[MẪU]%' then settings - 'note' else settings end,
       updated_at           = now()
 where id = 'default';

-- 4) Xoá fixture review demo (không phải review thật).
delete from public.reviews
 where id = 'd0d0d0d0-0000-4000-8000-000000000051'
    or comment like '%[MẪU]%';

-- 5) Báo cáo sau khi chạy.
select
  (select count(*) from public.products    where name like '%[MẪU]%' and status <> 'draft') as products_demo_visible,
  (select count(*) from public.products    where thumbnail_url like '%unsplash%') as products_fake_thumb,
  (select count(*) from public.accessories where image_url like '%unsplash%') as accessories_fake_img,
  (select count(*) from public.site_content where announcement_enabled) as announcement_on,
  (select count(*) from public.reviews     where comment like '%[MẪU]%') as reviews_demo;

commit;
