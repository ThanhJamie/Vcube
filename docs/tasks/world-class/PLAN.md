<!-- doc-meta: status=active; verified=2026-10-23; owner=lead -->
# FULL-FLOW PLAN — VCUBE (v2: full flow trước, tích hợp 3rd-party sau)

> **Định hướng chủ dự án (2026-10-23):** các phần "real" như thanh toán thất bại, gateway, storage/payout
> bên thứ ba **để sau**. Việc cần làm trước là **hoàn chỉnh full flow của app** cho 4 nhóm đối tượng.
> Khi flow đã khép kín, thay từng khớp nối 3rd-party qua adapter mà không đổi nghiệp vụ/UI.

> **Nguyên tắc:** theme UI đã duyệt — **không restyle**. Bám dữ liệu thật/đã có: Supabase DB + Supabase
> Storage (hạ tầng của chính dự án, không phải 3rd party) + xác nhận thanh toán/payout **thủ công bởi
> admin** trong giai đoạn này. Mọi điểm sẽ thay bằng dịch vụ ngoài đều đi qua **adapter interface** ngay
> từ đầu, để sau chỉ đổi implementation.

---

## 1. Khác biệt so với plan v1 (và vì sao)

| v1 (đã gộp vào backlog "later") | v2 (làm ngay) |
|---|---|
| Tích hợp VNPay/MoMo/Stripe + webhook | **Thanh toán thủ công**: VietQR + admin xác nhận "đã nhận tiền"; `payment_transactions` ghi Method=`manual/vietqr`, status=`pending→paid` |
| Payout qua API ngân hàng | **Admin đánh dấu đã trả** trên `orders.*_payout_status/paid_at/paid_by`; designer/xưởng thấy sao kê |
| Email/Zalo/SMS provider | **Thông báo in-app** (badge/timeline); adapter `NotificationProvider` để sau |
| Storage/CDN ngoài | **Supabase Storage** bucket `cad-files` (`cad/<uid>/<uuid>/<file>`, RLS đã có) + signed URL |
| Refund/dispute/coupon | Chưa làm — nhưng chừa trạng thái/chỗ nối trong order status & service |

---

## 2. Nền đã có sẵn (dùng ngay, không thiết kế lại)

| Thành phần | Trạng thái | Dùng cho |
|---|---|---|
| `order_items` (snapshot commission/royalty/payout/platform fee) | schema ✅, writer ❌ | dòng hàng + chia 3 bên |
| `orders` §3b (`subtotal/vat/platform_fee/workshop_payout/designer_payout/*_payout_status/paid_*`) | schema ✅, writer ❌ | P&L cấp đơn, công nợ |
| `payment_transactions` | schema ✅, writer ❌ | ghi nhận thanh toán thủ công |
| `order_files` + bucket `cad-files` + policy `cad/<uid>/…` | schema/bucket/RLS ✅, writer ❌ | giao file số |
| `digital_assets` (RLS owner) + `AssetService.createSignedUrl` | read ✅, write ❌ | thư viện file đã mua |
| `reviews` + trigger `fn_sync_product_review_stats` | schema + trigger ✅, writer ❌ | rating thật |
| `workshop_commission_terms`, `pricing_global_settings.default_workshop_commission_percent` | schema ✅, code ❌ | chiết khấu xưởng |
| `designer_payout_info` + RPC `get_my_payout_info`/`upsert_my_payout_info` | schema + RPC ✅, UI ❌ | KYC/rút tiền designer |
| `assigned_workshop_id` + `getMyQueueOrders` + cập nhật stage | read/update ✅, **assign writer ❌** | điều phối đơn |
| Adapter cần tạo | — | `PaymentProvider` (manual), `PayoutProvider` (manual), `NotificationProvider` (in-app), `FileStorage` (Supabase) |

---

## 3. Full flow đích (định nghĩa "khép kín")

### 3.1 Khách mua (vật lý + file số)
1. Tìm/3D/quote → **Đặt in** hoặc **Mua file** → cart.
2. Checkout: chọn phương thức (VietQR/COD), tạo đơn.
3. **Đơn ghi đủ**: `orders` (tổng, snapshot tiền), `order_items` (từng dòng + seller/fulfillment + payout split), `payment_transactions` (pending), `order_files` (nếu mua file).
4. Admin xác nhận đã nhận tiền → order `paid` (COD: xác nhận sau giao).
5. Đơn in: admin **gán xưởng** → xưởng nhận → cập nhật tiến độ → hoàn tất → khách theo dõi + review.
   Đơn file số: khách mở `/assets` → **tải file qua signed URL** ngay khi `paid`.
6. Khách luôn thấy đơn trong `/orders` + hoá đơn đọc lại được từ DB + timeline trạng thái.

### 3.2 Xưởng in
1. Đăng ký → hồ sơ xưởng → admin duyệt.
2. Nhận đơn được gán: thấy **spec + file + deadline + payout dự kiến**.
3. Nhận/từ chối → cập nhật stage (in, QC, đóng gói, giao) → hoàn tất.
4. Thấy **sao kê**: đơn nào, payout bao nhiêu, trạng thái `unpaid/paid`.

### 3.3 Designer
1. Upload file thật lên Supabase Storage → tạo sản phẩm (giá in, giá file, license, royalty %).
2. Admin duyệt → sản phẩm live.
3. Bán được → `order_items` chốt royalty → **ledger doanh thu**.
4. Yêu cầu rút → admin duyệt → `designer_payout_status=paid`.

### 3.4 Admin
1. Order console 360°: items, tiền, payment, files, dispatch, timeline, ghi chú.
2. Xác nhận thanh toán thủ công; gán xưởng; xử lý payout.
3. **Tài chính**: doanh thu − COGS − phí nền tảng − payout = lãi; công nợ xưởng/designer; đối soát tháng.
4. Duyệt KYC/mẫu, audit, cấu hình giá/commission.

---

## 4. Workstream & thứ tự (full flow trước)

| ID | Workstream | Phạm vi | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| **FL-0** ✅ | Harness & adapter skeleton | seed 4 role, e2e script đặt đơn, adapter interfaces (`PaymentProvider`, `PayoutProvider`, `NotificationProvider`, `FileStorage`) | — | 2–3 ngày |
| **FL-1** ✅ DONE | Transaction core | checkout ghi `order_items` + snapshot tiền + `payment_transactions`; admin order detail + xác nhận paid; invoice đọc DB | FL-0 | 1–2 tuần |
| **FL-2** 🔄 (2a code DONE, **blocked DB**; 2b tiếp) | Digital fulfilment | designer upload Supabase Storage (`cad/<uid>/<uuid>/…` + `digital_assets`); còn: `order_files` khi mua file + `/assets` tải signed URL + license/download limit | FL-1 | 1 tuần |
| **FL-3** | Dispatch & workshop flow | admin gán `assigned_workshop_id`; queue xưởng có spec/file; accept/reject; stage + ETA + ghi chú; hoàn tất | FL-1 | 1–2 tuần |
| **FL-4** | Payout & settlement (manual) | ledger từ `order_items`; công nợ xưởng/designer; yêu cầu rút; admin mark paid; sao kê | FL-1, FL-3 | 1 tuần |
| **FL-5** | Admin finance & full-flow console | dashboard doanh thu/COGS/margin/take-rate/payables; đối soát; VAT tháng; audit UI | FL-1, FL-4 | 1–2 tuần |
| **FL-6** | Trust & account | review verified (trigger đã có); thông báo in-app; account/địa chỉ; timeline; huỷ đơn cơ bản | FL-3 | 1 tuần |
| **FL-7 (later)** | 3rd-party integrations | payment gateway + webhook, payout API, email/Zalo/SMS, CDN/e-invoice, shipping API | flow đã khép kín | sau |

**Tổng: 6–9 tuần với 2–3 agent song song** (không tính FL-7).

---

## 5. Acceptance gates (full flow)

1. **E2E đơn in:** guest đặt đơn → admin xác nhận tiền → gán xưởng A → xưởng A nhận + chạy 4 bước → hoàn tất → khách thấy trạng thái cuối + review được; DB: `orders` + `order_items` + `payment_transactions` + `assigned_workshop_id` + `reviews` đủ.
2. **E2E đơn file số:** khách mua file → admin xác nhận → khách tải được file từ `/assets` bằng signed URL; tải lại được trong hạn license; người khác không tải được (RLS).
3. **E2E xưởng:** queue hiện đơn kèm spec/file; từ chối được; tiến độ cập nhật tới khách; sao kê payout đúng số.
4. **E2E designer:** upload file thật → duyệt → bán → ledger royalty đúng → rút tiền → paid.
5. **E2E admin tài chính:** doanh thu − COGS − phí − payout = lãi; đối soát tháng khớp; không có đơn "mồ côi" (thiếu items/payment).
6. **Kỹ thuật:** e2e 4 luồng trong CI; F5 không mất state; 0 lỗi console; RLS 0 bảng hở.

---

## 6. Quyết định cần chốt (tối thiểu, không chặn khởi động)

| # | Quyết định | Mặc định đề xuất nếu chưa chốt |
|---|---|---|
| D1 | Có dùng xác nhận thanh toán thủ công (VietQR + admin mark paid) giai đoạn này? | **Có** (đúng định hướng "payment real để sau") |
| D2 | Điều phối thủ công (admin gán) hay auto-match? | **Admin gán tay**; auto-match ở FL-7 |
| D3 | Số % hoa hồng: platform fee / workshop commission / designer royalty | Đọc từ `pricing_global_settings` + `pricing_configs` hiện có; thiếu ⇒ chặn tính & báo "chưa cấu hình" (không bịa) |
| D4 | License mặc định file CAD, giới hạn tải | `personal`, tải lại không giới hạn trong 12 tháng (cấu hình được) |
| D5 | Chính sách huỷ/hoàn cơ bản | Huỷ trước khi vào sản xuất: hoàn 100% (admin thực hiện thủ công) |

---

## 7. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Ghi tiền không khớp sổ | Snapshot bất biến; chỉ admin sửa tiền (RLS đã chặn); test đối soát từng đồng |
| Lộ file bản quyền | Bucket private + signed URL ngắn hạn + RLS `cad/<uid>/…` + audit download |
| Đơn mồ côi (thiếu items/payment) | Transaction ở tầng service: insert orders + items + payment trong 1 hàm; e2e kiểm |
| Xưởng nhận trùng đơn | Gán 1 lần (CAS trên `assigned_workshop_id` null), log ai gán |
| Payout tính lại theo cấu hình mới | Tính từ snapshot lúc đặt hàng, không đọc config hiện tại |
| Scope creep sang 3rd-party | FL-7 khoá cứng đến khi 6 gate §5 xanh |

---

## 8. Bắt đầu ngay

**FL-0 (2–3 ngày):**
1. Adapter skeleton (`src/backend/integrations/`): `paymentProvider` (manual), `payoutProvider` (manual), `notificationProvider` (in-app), `fileStorage` (Supabase).
2. Seed 4 role + script e2e đặt đơn + reset DB demo.
3. Chốt D1–D5 (mục 6) — mặc định đã đề xuất.

**FL-1 backlog (sprint kế tiếp, 1 builder + QA):**
- [ ] `OrderService.createOrder` mở rộng: insert `orders` (kèm snapshot tiền) + `order_items` + `payment_transactions` (pending) + `order_files` (nếu digital) trong 1 luồng, có rollback.
- [ ] Checkout: hiển thị breakdown (hàng/VAT/ship/tổng) + VietQR/manual instructions + ghi đúng.
- [ ] Admin: `/admin/orders/:id` — items, tiền, payment, files, timeline; nút **Xác nhận đã nhận tiền** (orders.payment_status + payment_transactions + status).
- [ ] Invoice đọc từ DB theo order id (không phụ thuộc RAM), in được.
- [ ] Unit test cho split tiền + e2e "đặt đơn ghi đủ 3 bảng".

---

## 9. Tiến độ thực thi (cập nhật 2026-10-23)

| Phase | Trạng thái | Bằng chứng |
|---|---|---|
| FL-0 | ✅ xong trong FL-1/FL-2a | Adapter `src/backend/integrations/*` + `scripts/e2e/guest-order-flow.ts` |
| FL-1 | ✅ DONE | Code: `orderMoney.ts` (công thức 3 bên, 11 test) · `OrderService.confirmManualPayment` (idempotent, compensation) · `AdminOrderDetailPanel` · Checkout payment block · Invoice DB-backed · **sửa bug guest checkout `upsert → insert` (RLS 42501)**. Bằng chứng: **e2e DB thật 10/10 PASS** (guest insert → RPC token → anon bị RLS chặn đúng → admin thật confirm → paid + order_items + payment_transactions; cleanup 0 sót), smoke 14/14, gates 15/15. Handoff `handoff/fl1-order-flow.md`. |
| FL-2a | ⚠️ CODE DONE — **BLOCKED bởi 2 policy DB** | `fileStorage.ts` + `AssetService.createDigitalAsset` + wizard upload thật + 23 test. **Verify bằng account thật 2026-10-23** (`handoff/real-account-verification.md`): upload `cad/<uid>/...` bị 403 vì migration `20261013110000_storage_scheme.sql` **chưa áp production**; designer insert `products` bị 42501 vì chưa có policy designer. Đối chứng: upload `digital/<uid>/…` + `digital_assets` + signed URL + sha256 **PASS**; cross-user bị chặn. **Cần chủ dự án áp** `docs/tasks/world-class/sql/APPLY-CHECKLIST.md` rồi chạy lại. |
| FL-2b | ⏭ tiếp theo | `order_files` insert đã có ở FL-1 (khi `digital_assets` có `storage_path`); còn: UI `/assets` đọc `order_files` + signed URL + license/download limit. |
| FL-3 | ⏭ sau FL-2b | Dispatch: admin gán `assigned_workshop_id` → queue xưởng + spec/file + accept/reject + tiến độ. |

**Blocker cần chủ dự án:** cấp **1 tài khoản designer + 1 admin** (hoặc cho phép tạo 4 account demo `@vcube.test`) để
verify end-to-end thật các luồng upload file & xác nhận thanh toán/thao tác admin (hiện e2e dùng admin tạm tạo–xoá
bằng secret key; designer upload mới chỉ verify bằng mock + smoke với token giả bị Storage từ chối đúng).

---

## 10. Real-account verification (2026-10-23) — kết quả & việc cần chủ dự án

**Accounts trong DB (login thật bằng mật khẩu demo):** admin `admin.forge@vcube.vn` + `chithanhso10@gmail.com`;
designer `creator.lethang@vcube.vn` (verified) + `designer@gmail.com` (unverified); lab `workshop.mes@vcube.vn`;
riêng `khachhang@vcube.vn` **fail** (sai mật khẩu demo + thiếu row `user_profiles`).

| Hạng mục | Kết quả |
|---|---|
| **FL-1 admin confirm (thật)** | ✅ **PASS 17 check** — guest order (anon, 1 in + 1 file số) → admin UI confirm → DB `paid` + `order_items=2` + `payment_transactions=paid/550000/vietqr_manual` + `order_files=1` (khớp asset thật) + snapshot §3b đúng; invoice đọc DB; F5 390/1440 OK. Đơn thứ 2 có `assigned_workshop_id` + terms 12%: platform fee 81.000, workshop payout 470.000, designer payout 10.000 — **công thức chạy đúng trên DB thật**. |
| **FL-2a designer upload (thật)** | ⛔ **BLOCKED 2 policy DB** — (a) storage `cad/<uid>/...` 403 RLS (migration #12 là DRAFT, chưa áp); (b) `products` designer insert 42501 (chưa có policy). Không phải bug code: cùng session upload `digital/<uid>/…` OK, `digital_assets` insert OK, signed URL 200, sha256 khớp, cross-user DENIED. |
| **Role gates** | ✅ PASS — admin `/admin`; lab `/lab`; designer `/designer`; customer `/orders`; non-admin vào `/admin` nhận màn 403. |
| Cleanup | ✅ 0 leftover (orders/products/assets/temp users/storage objects). |
| Bug phụ | `/lab` @390 tràn ngang do toast viewport `AppOverlays.tsx:105` → **đã sửa trong commit này** (`left-4 right-4 sm:left-6 sm:right-auto sm:w-full`). |

**Việc cần chủ dự án làm để mở khoá FL-2a (5–10 phút):** theo `docs/tasks/world-class/sql/APPLY-CHECKLIST.md`
1. Chạy `supabase/migrations/20261013110000_storage_scheme.sql` trên SQL Editor (policy `cad/<uid>/…`).
2. Chạy `docs/tasks/world-class/sql/PROPOSED-20261024-designer-publish.sql` (thêm `products.designer_id` + policy designer tự đăng bản chưa xuất bản; admin vẫn publish).
3. Sửa sample account `khachhang@vcube.vn` (insert `user_profiles` role customer) — SQL trong checklist.

**Sau đó:** mình wire `designer_id` vào payload sản phẩm + chuẩn hoá status (`Under Review`/`pending`) → chạy lại verify → FL-2b (`order_files` → `/assets` signed URL + license/download limit).
