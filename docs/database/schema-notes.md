<!-- doc-meta: status=active; verified=2026-09-24; owner=thanh -->
# VCUBE — Schema Notes (ngữ nghĩa & drift code ↔ DB ↔ docs)

Tài liệu này là **phần thủ công** đi kèm `docs/database/schema.md` — file sẽ do generator
(T26) sinh từ DB local/staging. Không chép cấu trúc (bảng/cột/index/policy/trigger) vào
đây; chạy generator hoặc `npm run check` để lấy số liệu. Nội dung ở đây là những thứ
generator không suy ra được: bất biến hành vi, chênh lệch giữa code — DB — docs cũ, và
trạng thái các migration còn cổng người.

Quy ước tham chiếu: dùng **tên symbol** (hàm/trigger/constraint) + tên file migration,
không dùng `file:line`.

---

## 1. Cột đặc quyền `user_profiles` — chặn bằng lỗi `42501`, không bỏ qua

Trigger `trg_protect_profile_privileged_columns` gọi hàm
`public.fn_protect_profile_privileged_columns()` (định nghĩa lại ở
`20261010_harden_rls.sql` §6, bản gốc ở `20260901_baseline_schema.sql` §9.3).

- Với người gọi **không phải admin** (`public.is_admin()`), mọi thay đổi
  `role` / `kyc_status` / `account_status` / `total_orders` / `total_spent` đều
  `raise exception ... using errcode = 'insufficient_privilege'` — tức **SQLSTATE 42501**.
- Bản hardening thay phép so sánh trực tiếp cho `total_orders`/`total_spent` (và
  `account_status`) bằng guard `to_jsonb(new) ? '<cột>'` để không nổ `42703` trên DB
  khuyết cột; khi cột tồn tại và bị đổi thì vẫn ném đúng `42501`.
- **Hệ quả:** UPDATE cố tình đổi hai cột thống kê này bị **từ chối bằng lỗi**, không có
  cơ chế giữ nguyên giá trị cũ trong im lặng. Bản `schema.md` cũ mô tả sai cơ chế này
  (cho rằng giá trị được bảo toàn ngầm); ghi chú tại đây thay thế mô tả đó.
- Chỉ `public.is_admin()` đi qua nhánh `return new` (không bị chặn).

---

## 2. `orders.payment_status` — drift 3 chiều

| Nguồn | Tập giá trị | Trạng thái |
|---|---|---|
| `src/types/index.ts` — type `OrderPaymentStatus` | `awaiting_payment`, `paid`, `cod`, `cancelled`, `unpaid` | Nguồn code (sự thật) |
| `docs/database/schema.md` bản cũ (bảng Value Constraints) | `unpaid`, `pending`, `paid`, `failed`, `refunded` | **Sai** — không nguồn nào xác nhận |
| DB — `orders_payment_status_chk` (`20261012100000_check_constraints.sql`) | `awaiting_payment`, `paid`, `cod`, `cancelled`, `unpaid` | `NOT VALID` (D11), chờ audit + `VALIDATE` |

- Đường ghi thực tế: `CheckoutView.tsx` ghi `cod` / `awaiting_payment`; `database.ts`
  fallback ghi `paid` / `unpaid`; default DB là `unpaid`.
- **`pending` / `failed` / `refunded` KHÔNG nằm trong constraint.** Vì ràng buộc đang
  `NOT VALID`, dòng cũ chứa các giá trị này không bị chặn, nhưng mọi INSERT/UPDATE mới
  đều bị từ chối.
- Trước khi `VALIDATE` phải audit dữ liệu thật
  (`select payment_status, count(*) from public.orders group by 1`) và xử lý theo D11:
  nếu dữ liệu hợp lệ dùng giá trị bị thiếu (ví dụ `refunded`) thì **mở rộng tập** rồi mới
  validate; **không** xoá dữ liệu thật để chiều constraint.

---

## 3. `kyc_records.status` — baseline không có CHECK

- Khối `create table public.kyc_records` trong baseline chỉ khai
  `status text not null default 'pending'`, **không kèm CHECK**.
- `kyc_records_status_chk` (`20261012100000_check_constraints.sql`, `NOT VALID`) phủ:
  `pending`, `pending_review`, `verified`, `rejected`, `unverified`.
- `pending_review` **bắt buộc** có: admin UI gộp `pending` → `pending_review`
  (`Group3CustomersPanel.tsx`); `database.ts` (`updateUserKyc`) ghi
  `verified` / `pending_review` / `rejected` / `unverified`; default DB là `pending`.
- Drift phụ trong `schema.md` cũ: bảng Value Constraints liệt kê đúng tập 5 giá trị, nhưng
  phần mô tả cột `kyc_records.status` lại ghi `'pending'`, `'approved'`, `'rejected'` —
  `approved` không tồn tại trong code lẫn DB.

---

## 4. `orders.status` & `orders.status_stage_index` — đã có CHECK từ baseline

Hai cột này **không phải** diện thêm mới ở T22b; chúng đã có ràng buộc từ baseline §3c:

- `orders_status_chk` — đúng 8 giá trị union `Order['status']`:
  `pending_payment`, `processing`, `printing`, `post_processing`, `packaging`,
  `shipping`, `completed`, `cancelled`.
- `orders_status_stage_index_range_chk` — `status_stage_index between 0 and 7`
  (khớp 8 nấc MES).

Baseline cũng đổi default của `orders.status` từ `'pending'` (không có trong union) sang
`'pending_payment'` — trạng thái khởi tạo thật của app.

`20261012100000_check_constraints.sql` chỉ thêm bản sao có guard `if not exists`
(`orders_status_chk`, và tên dự phòng `orders_status_stage_index_chk`): no-op trên DB đã
chạy baseline, chỉ có tác dụng trên DB khuyết baseline. Không tạo ràng buộc trùng nghĩa.

---

## 5. ERD là quan hệ **logic**, không phải khóa ngoại

Các cặp dưới đây xuất hiện trên ERD nhưng cột nối **không có** `references`:

| Quan hệ logic | Cột nối | Lý do / ghi chú |
|---|---|---|
| `workshop_partners` → `orders` | `orders.assigned_workshop_id` (`text`) | Không FK; cùng không gian giá trị với `order_items.workshop_id` |
| `app_settings` → `setting_audit` | `setting_audit.store` + `setting_key` | Không có cột FK; nối bằng giá trị `store` (`app_settings`, `site_content`, …) |
| `products` → `order_items` | `order_items.product_id` (`text`) | Không FK |
| `products` → `digital_assets` | `digital_assets.product_id` (`text`) | Không FK: file số có thể thuộc sản phẩm chưa seed |
| `products` → `cart_items` | `cart_items.product_id` (`text`) | Không FK: giỏ phải chịu được sản phẩm chưa seed hoặc đã gỡ khỏi catalog |

Ghi chú thêm: `order_items.workshop_id` và `order_items.designer_id` cũng **không FK**
(comment ngay trong baseline). Vì vậy ERD (kể cả mermaid trong `schema.md`) là mô hình
logic; generator T26 chỉ nên vẽ FK thật, các cạnh trên ghi chú riêng.

### 5b. File CAD: `products.cad_file_url` (cũ) **khác** `digital_assets.storage_path` (private, FL-2a)

| Cột | Bản chất | Ai đọc được | Ghi bởi |
|---|---|---|---|
| `products.cad_file_url` / `cad_format` / `file_size_bytes` | Metadata + URL **công khai kiểu cũ** (có thể trỏ CDN ngoài) | Bất kỳ ai đọc được products đã publish | Seed/legacy + `saveProduct` (nếu form có) |
| `digital_assets.storage_path` | Đường dẫn object trong bucket **private `cad-files`**, scheme `cad/<designer_uid>/<uuid>/<file>` | Designer sở hữu + admin (RLS); khách nhận qua signed URL sau khi mua (FL-2b) | FL-2a: `DesignerUploadWizardTab` upload thật → `AssetService.createDigitalAsset` |

Nguyên tắc (FL-2a):

- **Không trộn hai nguồn.** Upload mới **KHÔNG** set `products.cad_file_url` — tránh biến file
  private thành URL công khai/đoán được. `cad_file_url` chỉ còn là dữ liệu cũ, **không ghi đè**.
- Tệp đã mua phải lấy qua `AssetService.createSignedUrl(storage_path, ttl)`; không dùng
  `getPublicUrl` cho bucket `cad-files`.
- Khi tạo sản phẩm (FL-2a) client ghi `digital_assets` **sau** khi upload Storage thành công;
  product + asset hiện là 2 request riêng (chưa transaction) — FL-7 sẽ gộp RPC server-side.
  Nếu insert asset lỗi, client compensation xoá object vừa upload.
- `digital_assets.product_id` là `text`, **không FK** (xem §5) — đừng dựa FK để đảm bảo thứ tự.

---

## 6. `designer_payout_info` (SEC-01 / T20) và việc drop cột `bank_*`

- Bảng mới `public.designer_payout_info` — `20261013090000_sec01_payout_table.sql`:
  - `designer_id uuid primary key references public.designer_profiles(id) on delete cascade`
    (quan hệ 1-1 thật, có FK).
  - Chứa 3 cột PII thanh toán `bank_name`, `bank_account`, `tax_id`.
  - RLS: chủ sở hữu (`designer_id` thuộc hồ sơ có `user_id = auth.uid()`) đọc/ghi hàng của
    mình; `is_admin()` đọc/sửa mọi hàng (không có đường DELETE — không grant DELETE);
    `anon` bị revoke sạch.
  - Đọc/ghi qua RPC `security definer`: `get_my_payout_info()`,
    `admin_get_designer_payout(uuid)`, `upsert_my_payout_info(text, text, text)`.
    Thiếu quyền (không phải chủ, không phải admin, hoặc không có hồ sơ designer) → `42501`.
- `designer_profiles.bank_name` / `bank_account` / `tax_id` bị drop ở phase 2 —
  `20261013100000_drop_designer_bank_columns.sql`. File này mang **CỔNG H: KHÔNG áp tự
  động**, chỉ chạy sau khi (1) phase 1 đã áp trên prod, (2) client mới đã deploy, (3) đã
  kiểm chứng không còn reader/writer nào chạm 3 cột.
- Hệ quả tài liệu: trước khi cổng H được mở, 3 cột **vẫn tồn tại trên prod**; mọi mô tả
  schema phải theo trạng thái DB thật, không theo trạng thái mong muốn. `schema.md` cũ vẫn
  liệt kê `bank_*` trong `designer_profiles`; sau T26 file sinh sẽ tự phản ánh đúng trạng
  thái đã áp. Phần bối cảnh này được giữ lại ở đây.

---

## 7. Quy tắc chung khi đọc `schema.md`

- `schema.md` (sau T26) là **nguồn sinh** cho cấu trúc; file này là nguồn cho ngữ nghĩa.
  Khi hai file mâu thuẫn về cấu trúc, tin `schema.md`; khi mâu thuẫn về ý nghĩa/drift, tin
  file này (đã đối chiếu migration + code).
- Ràng buộc `NOT VALID` (D11) chỉ áp cho dòng mới. Không suy ra "dữ liệu cũ đã hợp lệ"
  từ việc constraint tồn tại.
- Giá trị `NULL` luôn là "chưa có dữ liệu / chưa khai", không quy đổi thành 0 hay mặc
  định — xem `docs/design/data-honesty.md`.
