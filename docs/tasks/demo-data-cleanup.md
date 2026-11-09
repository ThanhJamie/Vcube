<!-- doc-meta: status=proposal; verified=2026-11-06; owner=lead -->
# Dọn dữ liệu demo trước khi mở bán

> Sinh bởi `node scripts/audit-demo-data.mjs` (read-only) — số đo 2026-11-06 trên project
> Supabase đang cấu hình trong `.env`. Tài liệu này **đề xuất**, chưa chạy gì trên DB.

## 1. Số đo thực

| Bảng | Tổng dòng | Dòng `[MẪU]` | Dòng ảnh bịa (Unsplash/picsum) | Ví dụ |
|---|---:|---:|---:|---|
| `products` | 9 | **9** | **9** | `DEMO-P01`, `DEMO-P02`, `DEMO-P05` |
| `materials` | 8 | 7 | 0 | `DEMO-M03`, `DEMO-M02`, `DEMO-M06` |
| `accessories` | 5 | **5** | **5** | `DEMO-A01`, `DEMO-A02`, `DEMO-A03` |
| `printer_fleet` | 7 | 6 | 0 | `DEMO-PR02`, `DEMO-PR04` |
| `site_content` | 1 | **1** | 0 | `default` |
| `app_settings` | 1 | 0 | 0 | — |
| `reviews` | 1 | 1 | 0 | fixture `d0d0d0d0-…-000000000051` |
| `digital_assets` | — | — | — | **RLS chặn** (HTTP 401 với publishable key) |
| `workshop_profiles` | 2 | 0 | 0 | — |

Hệ quả người dùng thấy: banner `[MẪU]`, tên sản phẩm `[MẪU] …`, ảnh không hiển thị (bị
`isFabricatedImage` chặn), và cảm giác “sản phẩm chưa xong” trên trang chủ/khám phá.

## 2. Rủi ro nếu để nguyên

1. **Mất niềm tin ngay first paint** — khách thấy nhãn `[MẪU]` trước khi thấy giá trị sản phẩm.
2. **SEO/OG image sai** — `site_content` demo khiến metadata chia sẻ mạng xã hội là nội dung mẫu.
3. **Đo lường nhiễu** — mọi KPI (CTR, add-to-cart) bị trộn dữ liệu demo không đại diện.

## 3. Phương án dọn (ĐỀ XUẤT — chưa chạy)

### Bước 0 — chụp snapshot
```sql
-- Chạy trong Supabase SQL Editor, lưu kết quả vào nơi an toàn trước khi sửa.
select 'products' t, count(*) from public.products where name like '%[MẪU]%'
union all select 'materials', count(*) from public.materials where name like '%[MẪU]%'
union all select 'accessories', count(*) from public.accessories where name like '%[MẪU]%'
union all select 'printer_fleet', count(*) from public.printer_fleet where name like '%[MẪU]%';
```

### Bước 1 — ẩn khỏi storefront trước (an toàn, không xoá)
```sql
-- Ẩn ngay khỏi catalog công khai; giữ dữ liệu để đối chiếu.
update public.products
set status = 'draft'
where name like '%[MẪU]%' and status <> 'draft';
```
> Không xoá ngay: `order_items` có FK tới `products`; nếu đã có đơn thật tham chiếu thì
> xoá sẽ lỗi/hoặc mất dấu đơn. Kiểm tra trước:
```sql
select count(*) from public.order_items oi
join public.products p on p.id = oi.product_id
where p.name like '%[MẪU]%';
```

### Bước 2 — thay nội dung site (bắt buộc trước khi demo cho khách)
```sql
update public.site_content
set announcement_enabled = false,
    announcement_text = null,
    hero_badge = '',
    hero_title = 'Chế tác cơ khí in 3D công nghiệp chính xác',
    hero_subtitle = 'Nền tảng sản xuất bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số.',
    phone = null,
    email = null
where id = 'default';
```
> Giá trị trên chỉ là placeholder **trung thực** (không bịa hotline/email). Chủ dự án phải
> điền thông tin thật trước khi bật lại `announcement_enabled`.

### Bước 3 — ảnh: KHÔNG thay bằng ảnh bịa khác
```sql
-- Data-honesty: ảnh Unsplash/picsum là placeholder bịa → set NULL để UI hiện empty-state thật.
update public.products
set images = '[]'::jsonb, thumbnail_url = null
where images::text like '%images.unsplash.com%' or thumbnail_url like '%images.unsplash.com%';

update public.accessories
set image_url = null
where image_url like '%images.unsplash.com%';
```
Sau đó upload ảnh thật vào bucket `product-images` và cập nhật URL.

### Bước 4 — xoá fixture review + dọn nốt (sau khi Bước 1–3 ổn định 1 tuần)
```sql
delete from public.reviews where id = 'd0d0d0d0-0000-4000-8000-000000000051';
-- Chỉ xoá catalog demo khi đã xác nhận 0 order_items tham chiếu (Bước 1).
```

### Rollback
- Bước 1–3 đều là `UPDATE` → khôi phục bằng snapshot/Bảng backup trước khi chạy.
- Không có `DELETE` nào ở Bước 1–3; chỉ Bước 4 xoá 1 review fixture.

## 4. Việc Product Owner phải quyết

1. **Có giữ catalog demo để bán thử không?** Nếu giữ, phải thay tên/ảnh thật (Bước 3 chỉ NULL ảnh).
2. **Thông tin liên hệ thật** (hotline/email/địa chỉ) để điền `site_content`.
3. **Có đơn thật nào đang trỏ vào `DEMO-*`?** Nếu có, tuyệt đối không xoá — chỉ chuyển `draft`.
