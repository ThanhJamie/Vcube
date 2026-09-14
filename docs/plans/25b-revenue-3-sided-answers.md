# 25B — Trả lời §4 của spec doanh thu 3 bên + 3 chỗ cần sửa trong spec

> Lập 2026-09-21. Đọc cùng `25` (spec doanh thu 3 bên). Mọi kết luận dưới đây **đọc từ code thật**, có dẫn chứng dòng.
> Kết luận ngắn: **spec đúng hướng, nhưng nếu sinh SQL như hiện tại thì sẽ tính sai tiền trong 2 trường hợp phổ biến.**

---

## A. Trả lời câu hỏi §4.1 — CÓ, một đơn chứa được cả hàng in lẫn file số

### Bằng chứng
- `orders` là **một hàng = một đơn**, và đã có `items jsonb not null default '[]'::jsonb` — tức **mảng nhiều dòng**.
- **KHÔNG có bảng `order_items`.** Chỉ có `order_files` (`order_id`, `product_id`, `storage_path`, `license`) — bảng này lưu **file số giao cho khách**, không phải dòng tiền.
- `cart_items` chỉ có `product_id`, `quantity`, `unit_price_snapshot` — **không có cột loại hàng**; loại (in / file số) phải suy từ `products`.
- 🔴 **Bằng chứng quyết định:** `src/types/index.ts:125-126` khai **`subtotalPhysical`** và **`subtotalDigital`** trong cùng một cấu trúc, và `src/backend/supabase/database.ts:32-39` tính phí ship theo `subtotalPhysical`. Nghĩa là **giỏ hàng được thiết kế để trộn cả hai loại trong một đơn**.

### Hệ quả — bộ cột chia tiền ở cấp `orders` là KHÔNG ĐỦ
Nếu một đơn có: 1 món in (xưởng A nhận) + 1 file số (designer B bán), thì với công thức đang viết trong spec:
```
workshop_commission_percent_snapshot = % của xưởng A
platform_fee_amount = total_amount × % / 100
```
→ **xưởng A bị tính phí trên CẢ phần tiền của file số mà xưởng A không hề làm.** Và designer B thì nhận `total_amount × royalty%` → **nhận royalty trên cả phần tiền in mà họ không bán.**

### Đề xuất sửa: thêm bảng `order_items` (một hàng = một dòng tiền)
```
order_items(id, order_id → orders(id) on delete cascade, product_id,
            seller_type, quantity, unit_price, line_total,
            fulfillment,              -- 'print' | 'digital'
            workshop_id,              -- chỉ khi fulfillment='print'
            designer_id,              -- chỉ khi seller_type='designer'
            workshop_commission_percent_snapshot,
            royalty_percent_snapshot,
            workshop_payout_amount, designer_payout_amount, platform_fee_amount)
```
Giữ nguyên các cột cấp `orders` trong spec nhưng đổi vai trò thành **TỔNG (đã chốt)**: `orders.platform_fee_amount = sum(order_items.platform_fee_amount)` v.v. Như vậy vẫn đối soát được ở cấp đơn **và** đúng ở cấp dòng.

---

## B. 🔴 Vấn đề kế toán spec CHƯA nhắc: `total_amount` chứa VAT

### Bằng chứng
- `orders` có `total_amount` và `shipping_fee` — **KHÔNG có** `subtotal`, `vat_amount`, `tax_amount` (đã liệt kê đủ 27 cột).
- Nhưng funnel **có** tính VAT: `computeVat` được dùng ở 4 nơi (`CartView`, `CheckoutView`, `InvoiceModal`, `QuoteSummaryPanel`) với `vat_percent` trong `pricing_global_settings`.
- ⇒ **Hoá đơn hiển thị VAT nhưng hàng `orders` không lưu VAT.** Không thể dựng lại hoá đơn từ đơn hàng, và không biết phần nào là thuế.

### Hệ quả
Nếu phí nền tảng tính trên `total_amount` (đã gồm VAT 8%), thì **nền tảng đang ăn phí trên tiền thuế** — tiền đó không phải doanh thu của nền tảng. Khi đối soát thuế, con số sẽ lệch đúng bằng 8% của phần phí.

### Đề xuất sửa
Thêm vào `orders`: `subtotal_amount` (trước thuế, chỉ hàng hoá — **không gồm ship**), `vat_percent_snapshot`, `vat_amount`.
Và **đổi cơ sở tính phí**: phí tính trên **`subtotal_amount` (trước thuế)**, không phải `total_amount`.
Đồng thời chốt rõ: **phí ship có nằm trong phần trả cho xưởng không?** (xưởng là bên trả cước vận chuyển). Đề xuất: ship **không** tính phí nền tảng, và ship chuyển cho xưởng.

> Ghi chú: đây là lựa chọn **kế toán**, không phải kỹ thuật — anh chốt. Nhưng nếu chọn tính trên `total_amount` thì nên ghi rõ trong tài liệu là "phí có gồm VAT theo chủ ý", để sau này không ai tưởng là lỗi.

---

## C. Trả lời §4.3 — trạng thái payout nên tách **hai** trạng thái, và tiền ĐÃ được bảo vệ

### C.1 Tiền đã được bảo vệ — không cần thêm gì (đã kiểm chứng)
Trigger `fn_protect_order_privileged_columns` (`20261010:858`) có `v_allowed = array['status','status_stage_index','layer_progress','updated_at']` và so bằng `to_jsonb(new) - v_allowed` — **fail-closed**: mọi cột không nằm trong danh sách **tự động bị chặn**.
⇒ **8 cột tiền mới trong spec tự động được bảo vệ khỏi xưởng in**, không cần viết thêm gì. Khách thì **không có policy UPDATE nào** trên `orders`. Chỉ admin đổi được tiền. (Đây là lợi ích trực tiếp của việc chọn thiết kế fail-closed từ trước.)

### C.2 Nhưng `payout_status` đơn nhất là chưa đủ
Một đơn in có thể đã trả tiền cho **xưởng** nhưng chưa trả **designer** (royalty). Một cột `payout_status` không diễn tả được trạng thái đó (`'partial'` là mơ hồ — thiếu ai?).
Đề xuất tách: `workshop_payout_status` · `designer_payout_status`, mỗi cái có `..._paid_at`, `..._paid_by`, `..._note`.

### C.3 Ai cập nhật, và audit
Đề xuất: **chỉ admin** cập nhật (đã đúng theo RLS hiện tại). Vì bất biến dự án là "audit log bắt buộc", mỗi lần đổi trạng thái payout phải ghi một hàng audit (dùng `setting_audit` với `store` mở rộng, hoặc bảng riêng) — **không** chỉ ghi `paid_at` rồi thôi.

---

## D. Trả lời §4.2 — giới hạn min/max: CÓ, nên thêm, và có một cái bẫy SQL

| Cột | Hiện tại | Đề xuất |
|---|---|---|
| `workshop_partners.platform_commission_percent` (mới) | — | `CHECK (0 ≤ x ≤ 30)` |
| `pricing_global_settings.default_workshop_commission_percent` (mới) | — | `CHECK (0 ≤ x ≤ 30)` |
| `pricing_global_settings.marketplace_fee_percent` (đang có) | 🔴 **KHÔNG có CHECK** | thêm `CHECK (0 ≤ x ≤ 30)` |
| `designer_profiles.royalty_percent` (đang có) | 🔴 **KHÔNG có CHECK** | thêm `CHECK (0 ≤ x ≤ 100)` (royalty có thể cao hơn phí sàn) |

Tiền lệ đã có trong repo: `vat_percent` có `CHECK 0..20`.

### ⚠️ Bẫy SQL bắt buộc biết
PostgreSQL **KHÔNG có** `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS`. Viết thẳng sẽ **lỗi khi dán lần thứ hai**, hoặc nếu bọc trong `do` mà kiểm sai thì sinh **ràng buộc trùng** (đúng lớp lỗi mà đặc tả D3 đã cảnh báo với `setting_audit_store_check`).
⇒ Phải dùng `do $$ begin if not exists (select 1 from pg_constraint where conname = '<tên>' and conrelid = 'public.<bảng>'::regclass) then alter table ... add constraint ...; end if; end $$;`

Và **cùng lý do với `alter column ... drop default` đã học**: thêm cột cho bảng đã tồn tại **phải** viết bằng `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, vì `create table if not exists` là **NO-OP** trên production.

---

## E. Tóm tắt 3 việc phải sửa trong spec trước khi sinh SQL

1. **Thêm `order_items`** (mục A) — nếu không, trộn hàng in + file số trong một đơn sẽ tính sai tiền cho **cả** xưởng **và** designer.
2. **Thêm snapshot VAT + đổi cơ sở tính phí sang giá trước thuế** (mục B) — nếu không, nền tảng ăn phí trên tiền thuế.
3. **Tách `payout_status` thành 2** + `paid_at`/`paid_by`/`note` + ghi audit (mục C) — kèm xác nhận tiền **đã** được trigger fail-closed bảo vệ.

Sau khi anh chốt 3 điểm này (và chốt "phí ship có tính phí nền tảng không"), tôi sinh phần SQL và **gộp vào cùng MỘT lần sinh lại `apply_all_manual.sql`** với D1/D2/D8 — để anh chỉ phải dán một lần.
