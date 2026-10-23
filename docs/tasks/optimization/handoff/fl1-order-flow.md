<!-- doc-meta: status=active; verified=2026-10-23; owner=commerce-auth -->
# HANDOFF — FL-1: full flow đơn hàng + xác nhận thanh toán thủ công + admin order console

> **Work item:** `task-44` (plan v2 `docs/tasks/world-class/PLAN.md`) · **Agent:** `commerce-auth` · **Ngày:** 2026-10-23
> **HEAD:** `14e8526` + thay đổi FL-1/FL-2a trong working tree. **Không commit/push.** **Không tạo migration/dependency.**
> **Trạng thái:** **DONE** — lint/build/test:unit PASS, 15 offline gate "KHÔNG TỆ HƠN BASELINE",
> e2e DB thật **10/10 PASS** (gồm admin confirm thật), browser smoke **14/14 PASS**.
> Preview `:4177` đã tắt. Đơn/admin test đã dọn sạch (0 leftover).

---

## 1. Files changed

### 1.1 Sửa (8 file)

| File | Thay đổi |
|---|---|
| `src/backend/services/orderService.ts` | Thêm `getOrderDetail` (đọc DB + nguồn/warnings) và `confirmManualPayment` (idempotent, thứ tự an toàn, compensation, serialize theo orderId). |
| `src/backend/supabase/database.ts` | +14 method FL-1: `getOrderById`, `getOrderItems`, `getPaymentTransactions`, `getOrderFiles`, `insertOrderItems`/`deleteOrderItemsByIds`, `insertPaymentTransaction`/`deletePaymentTransactionById`, `insertOrderFiles`/`deleteOrderFilesByIds`, `updateOrderPaymentSnapshot`, `getPricingGlobalMoneyConfig`, `getWorkshopCommissionPercent`, `getProductsByIds`, `getDesignerRoyaltyByNames`, `getDigitalAssetsByProductIds`. **Sửa 1 bug chặn full flow**: `saveOrder` đổi `.upsert()` → `.insert()` (xem §8). |
| `src/backend/supabase/mappers.ts` | `rowToOrder` map thêm `assignedWorkshopId` + `money` snapshot §3b; `rowToProduct` map `sellerType`; thêm `rowToOrderItem`, `rowToPaymentTransaction`, `rowToOrderFile`, `rowToOrderMoney`. |
| `src/types/index.ts` | `Order.money?: OrderMoneySnapshot`, `Order.assignedWorkshopId?`, `Product.sellerType?` (additive). |
| `src/frontend/views/CheckoutView.tsx` | **Khối thanh toán thủ công sau khi tạo đơn** (số tiền, nội dung CK = mã đơn, ngân hàng từ `app_settings` hoặc "chưa cấu hình", copy, breakdown giữ nguyên, CTA theo dõi/hoá đơn). Không còn auto-navigate rời trang ngay. |
| `src/frontend/components/InvoiceModal.tsx` | **Hoá đơn bền**: đọc lại đơn từ DB theo `id` (+ token khách), hiện "Bản ghi đơn trên hệ thống", giao dịch thanh toán, file số đã giao (không lộ storage path); lỗi RLS ⇒ vẫn in từ số đã ghi + ghi rõ nguồn. |
| `src/frontend/components/admin/groups/Group5ProductionPanel.tsx` | Nút **"Chi tiết & thanh toán"** trên thẻ đơn (tab Điều phối) + nhúng `AdminOrderDetailPanel` vào modal chi tiết đơn sẵn có (không thêm route). |
| `src/frontend/routes/routeWrappers.tsx` | `OrderSuccessRoute`: nếu đơn không còn trên RAM (F5/tab mới) thì đọc lại từ DB theo `:orderId` (+ `?token=` cho khách). Không fallback sang đơn khác. |

### 1.2 File mới (9 file / 1.764 dòng)

| File | Dòng | Vai trò |
|---|---:|---|
| `src/backend/services/orderMoney.ts` | 298 | **Công thức chia tiền THUẦN** + idempotency helper + payload builder. |
| `src/types/orderRecords.ts` | 131 | Type `OrderMoneySnapshot`, `OrderItemRecord`, `PaymentTransactionRecord`, `OrderFileRecord`, `OrderDetailResult`, `ConfirmManualPaymentResult`. |
| `src/backend/integrations/paymentProvider.ts` | 136 | `PaymentProvider` + **ManualPaymentProvider** (`buildInstructions`, `recordManualPayment`), payload builder thuần. TODO(FL-7): gateway thật. |
| `src/backend/integrations/payoutProvider.ts` | 58 | `PayoutProvider` + **ManualPayoutProvider** skeleton (FL-4 mới ghi paid; FL-1 trả `not_implemented`, KHÔNG báo thành công giả). |
| `src/backend/integrations/notificationProvider.ts` | 66 | `NotificationProvider` + **InAppNotificationProvider** (log có cấu trúc). TODO(FL-7): email/SMS. |
| `src/frontend/components/admin/orders/AdminOrderDetailPanel.tsx` | 416 | Chi tiết đơn cho admin: items, snapshot §3b, giao dịch, file, timeline, warnings + **nút xác nhận đã nhận tiền** (2 bước, loading/error). |
| `scripts/e2e/guest-order-flow.ts` | 379 | E2E DB thật: guest insert anon → RPC token → RLS âm → (tuỳ chọn) admin confirm thật → cleanup. Flags `--live/--cleanup/--admin-session/--provision-admin`. |
| `tests/unit/orderMoney.test.ts` | 280 | 11 test: split đơn in/đơn trộn/file số, NULL-config, làm tròn, idempotency, row builders, payment instructions. |
| `docs/tasks/optimization/handoff/fl1-order-flow.md` | — | File này. |

**Không sửa:** `App.tsx`, `main.tsx`, `index.css`, migrations, `package.json`, store. Không thêm dependency.

---

## 2. Luồng dữ liệu (theo RLS thật)

```
KHÁCH (anon, policy `vcube_orders_guest_insert` — chỉ INSERT `orders`)
  └─ CheckoutView.handleCompleteOrder
       → OrderService.createOrder → dbService.saveOrder  (INSERT `orders`, status pending_payment)
       → KHỐI THANH TOÁN: số tiền + nội dung CK (mã đơn) + ngân hàng từ app_settings
         (thiếu cấu hình ⇒ "Chưa cấu hình thông tin nhận tiền", KHÔNG bịa số TK)

ADMIN (session thật, RLS `is_admin()`)
  └─ /admin/orders → thẻ đơn → "Chi tiết & thanh toán"
       → OrderService.getOrderDetail(orderId)      (orders + order_items + payment_transactions + order_files)
       → bấm "Xác nhận đã nhận tiền"
       → OrderService.confirmManualPayment(orderId)
            1. đọc đơn + IDEMPOTENCY (đã paid/đã có items/payment ⇒ already_confirmed, không ghi thêm)
            2. đọc config (pricing_global_settings / pricing_configs / workshop_commission_terms /
               designer_profiles / products) → computeOrderMoney
            3. INSERT order_items           (admin_all)
            4. INSERT payment_transactions  (admin-only) — transaction_id UNIQUE theo đơn
            5. INSERT order_files           (staff_insert) chỉ khi có digital_assets.storage_path THẬT
            6. UPDATE orders                (payment_status=paid, status=processing, snapshot §3b) ← COMMIT POINT
            7. đọc lại từ DB + notification in-app
            Lỗi bước 3–6 ⇒ compensation xoá NGƯỢC thứ tự những gì vừa ghi, trả failed + lỗi thật.
```

**Vì sao khách KHÔNG tự ghi `order_items`/`payment_transactions`:** policy hiện tại
`payment_transactions` = admin-only (`vcube_payment_transactions_admin_all`), `order_items` = chủ đơn
read + admin all, `order_files` = người mua read + staff insert. Ghi từ client khách sẽ bị **42501**
— e2e chứng minh bằng thử nghiệm âm (§6). Không dùng service key trong client.

---

## 3. Công thức chia tiền (đã unit-test) — §3b `20260901_baseline_schema.sql`

| Khoản | Công thức | Nguồn % | Thiếu cấu hình |
|---|---|---|---|
| `subtotal_amount` | Σ `line_total` (đơn giá × SL) | đơn | luôn tính được |
| `platform_fee_amount` (dòng) | **in**: `line_total × workshop_commission_percent`; **file số**: `line_total × marketplace_fee_percent` | xưởng: `workshop_commission_terms.commission_percent` (của xưởng được gán) → fallback `pricing_global_settings.default_workshop_commission_percent`; file số: `pricing_global_settings.marketplace_fee_percent` | **NULL** (không 0) |
| `platform_fee_amount` (đơn) | Σ phí dòng + `marketplace_fixed_fee_vnd` | `pricing_global_settings` | NULL nếu bất kỳ dòng chưa tính được |
| `platform_fee_percent_snapshot` (đơn) | tỉ lệ CHUNG của mọi dòng; trộn tỉ lệ ⇒ **NULL** (cấp dòng giữ số) | — | NULL |
| `workshop_payout_amount` (dòng in) | `line_total − platform_fee_amount(dòng)` | — | NULL |
| `workshop_payout_amount` (đơn) | Σ payout dòng in **+ shipping_fee** | — | NULL nếu không có dòng in hoặc thiếu % xưởng |
| `designer_payout_amount` (dòng số) | `line_total × royalty_percent` | `designer_profiles.royalty_percent` khớp **duy nhất** theo tên designer → fallback `pricing_configs.designerRoyaltyPercent` | NULL |
| `designer_payout_amount` (đơn) | Σ payout dòng số | — | NULL nếu không có file số hoặc thiếu royalty |
| `vat_percent_snapshot` / `vat_amount` | ưu tiên **số đã ghi trên đơn** (`payment.tax` / `payment.vatRate`); chưa có ⇒ `vat_percent × subtotal` | `pricing_global_settings.vat_percent` | NULL |
| `platform_fixed_fee_snapshot` | `marketplace_fixed_fee_vnd` | `pricing_global_settings` | NULL |

**Quyết định đã ghi trong code:**
- Phí nền tảng tính trên **tiền hàng trước thuế, KHÔNG gồm ship/VAT** (đúng §3b).
- Một đơn TRỘN in + file số ⇒ tính **cấp dòng** rồi cộng (tránh xưởng ăn phí trên tiền file & designer
  ăn royalty trên tiền in — cảnh báo `docs/plans/25b` mục A).
- Làm tròn về đồng (`Math.round`) ở **từng dòng**; order = tổng dòng đã tròn.
- **`null` ≠ `0`**: thiếu cấu hình ⇒ NULL + `missingConfig[]` hiển thị "chưa cấu hình" (không bịa 0).
- `order_items` snapshot: `seller_type` lấy từ `products.seller_type` (thiếu ⇒ in=`platform`,
  file số=`designer` nếu tính được royalty), `workshop_id` = xưởng được gán (nếu có), `designer_id` = null
  (products chưa có cột designer_id — không đoán; FL-2/FL-3 bổ sung khi cần).

---

## 4. Idempotency & rollback (client-side, KHÔNG atomic — FL-7)

- **Idempotent kép:** (a) kiểm trước: `payment_status='paid'` / đã có `order_items` / đã có payment
  ⇒ trả `already_confirmed` (không ghi thêm); (b) DB: `payment_transactions.transaction_id =
  'manual_<orderId>'` UNIQUE ⇒ chèn lần 2 bị 23505. Ngoài ra `OrderService.confirmManualPayment` giữ
  một `Map<orderId, Promise>` để 2 cú click cùng tab không chạy song song.
- **Thứ tự ghi:** items → payment → files → **orders cuối** (commit point). Lỗi bất kỳ bước nào
  ⇒ compensation: files → payment → items → trả `failed` + `steps[]` ghi rõ bước lỗi.
- **Giới hạn:** không phải transaction DB ⇒ nếu tab bị kill giữa chừng có thể còn items/payment mà
  `orders` chưa paid; admin bấm xác nhận lại sẽ thấy `already_confirmed` (do có items) — cần công cụ
  đối soát; **FL-7** chuyển sang RPC/Edge Function atomic (1 transaction) và webhook.

---

## 5. UI

1. **Checkout sau khi tạo đơn** (390/1440): khối "Đã tạo đơn hàng" gồm mã đơn, trạng thái CHỜ THANH
   TOÁN, số tiền, ngân hàng/Số TK/Chủ TK (từ `app_settings`, thiếu ⇒ cảnh báo "chưa cấu hình"),
   nội dung CK = mã đơn + nút sao chép, breakdown hàng/ship/giảm/VAT/tổng (giữ nguyên công thức
   checkout), mã tra cứu (token) cho khách, CTA **Theo dõi đơn hàng** / **Xem đơn & hoá đơn**.
   Đơn đã xuống DB rồi mới hiện khối (giữ luật OT-03); không đổi theme/layout cũ.
2. **Admin order console**: nút "Chi tiết & thanh toán" trên mỗi thẻ đơn (tab Điều phối) + trong modal
   chi tiết đơn Kanban: snapshot tiền §3b (null ⇒ "Chưa chốt"), bảng `order_items`, giao dịch thanh
   toán, file số (license, KHÔNG lộ path), timeline, warnings nguồn/RLS, `missingConfig`; form
   **xác nhận đã nhận tiền** (số tiền thực nhận, phương thức, ghi chú, 2 bước xác nhận, loading/error).
3. **Hoá đơn bền**: `InvoiceModal` đọc lại đơn từ DB khi mở; F5 `/order-success/:id` hoạt động cho
   chủ đơn/admin (RLS) và cho khách nếu URL có `?token=<secure_access_token>`; mở từ `/tracking`
   sau tra cứu token cũng đọc DB. Hoá đơn khách chỉ hiện dữ liệu khách được phép đọc (orders snapshot);
   giao dịch/file chi tiết hiện khi chủ đơn/admin đọc được (RLS) — nguồn ghi rõ trong UI.

---

## 6. Bằng chứng e2e DB THẬT (Supabase project trong `.env`)

Lệnh đã chạy (2026-10-23):

```bash
npx tsx scripts/e2e/guest-order-flow.ts                # dry-run: PASS=1/SKIP=3
npx tsx scripts/e2e/guest-order-flow.ts --live --cleanup --provision-admin
```

Kết quả **LIVE 10/10 PASS** (đơn test + admin tạm đã xoá; kiểm tra lại DB: **0 đơn test, 0 user @vcube.test**):

| # | Check | Kết quả |
|---|---|---|
| 1 | `db.reachable` | PASS — Supabase phản hồi |
| 2 | `guest.insert` — **anon key, KHÔNG auth user** ghi `orders` | PASS (`VCB-…`, tổng 350.000) |
| 3 | `guest.read_by_token` — RPC `get_order_by_guest_token(order_number, token)` | PASS — đọc đúng đơn, `payment_status=awaiting_payment`, `items=1` |
| 4 | **RLS âm**: anon ghi `order_items` | PASS — bị chặn `42501 permission denied` |
| 5 | **RLS âm**: anon ghi `payment_transactions` | PASS — bị chặn RLS |
| 6 | `admin.provision` (admin TẠM, chỉ khi bật cờ) | PASS |
| 7 | `admin.signin` — đăng nhập admin thật | PASS |
| 8 | **`admin.confirm`** — `OrderService.confirmManualPayment` thật | PASS `confirmed` |
| 9 | DB sau confirm | PASS — `orders.payment_status=paid`, `order_items=1`, `payment_transactions.status=paid` |
| 10 | cleanup (order + admin tạm) | PASS |

> Không có `E2E_ADMIN_EMAIL/PASSWORD` trong repo ⇒ mặc định `--admin-session` = SKIP. Để vẫn chứng minh
> luồng admin thật, e2e có `--provision-admin` tạo admin TẠM bằng `SUPABASE_SECRET_KEY` **trong Node
> (server-side, không lên bundle)**, test xong xoá cả user + đơn. Đây là công cụ test, không phải đường
> ghi của app.

---

## 7. Browser smoke (Chromium headless + prod build `dist-ssr/fl1`, preview `:4177` — đã tắt)

**14/14 PASS** (390×844 và 1440×900):

| Check | Kết quả |
|---|---|
| `/` 390 + 1440 | render, **0 pageerror, 0 tràn ngang** |
| Checkout → submit (cart seed 1 món, DB thật) | **khối thanh toán hiện đúng** (số tiền, nội dung CK, ngân hàng/chưa cấu hình, token), **0 pageerror, 0 tràn ngang** cả 390/1440 |
| DB sau checkout | `orders` tạo thật: `payment_status=awaiting_payment`, tổng 378.000 (gồm VAT 8% + ship) |
| F5 `/order-success/:id?token=…` 390/1440 | render lại từ DB (**hoá đơn bền**), 0 pageerror/overflow |
| Invoice trong trang F5 | mở được, đọc bản ghi DB |
| **Admin UI**: login admin tạm → `/admin/orders` → mở "Chi tiết & thanh toán" | panel chi tiết hiện đúng |
| **Admin UI**: bấm "Xác nhận đã nhận tiền" (2 bước) | PASS — UI báo đã xác nhận |
| DB sau thao tác UI | `payment_status=paid`, `order_items=1`, `payment_transactions.status=paid` |
| Cleanup | xoá đơn smoke + admin tạm (**0 leftover**) |

Ảnh: `/tmp/fl1-smoke/{payment-block-390,payment-block-1440,invoice-1440,admin-order-detail-1440}.png`
(ngoài repo, không commit).

**Phát hiện + sửa bug chặn full flow:** guest checkout trước FL-1 dùng `supabase.from('orders').upsert(...)`;
`ON CONFLICT DO UPDATE` đòi policy **UPDATE** trên `orders` mà khách không có ⇒ **mọi đơn guest bị
RLS từ chối 42501** (smoke tái hiện: "ĐƠN HÀNG CHƯA ĐƯỢC TẠO … new row violates row-level security
policy"). Đã đổi `saveOrder` sang `.insert()` (đơn tạo mới luôn là INSERT; trùng id ⇒ lỗi thật). Sau
sửa: guest order tạo thật thành công (e2e + smoke).

---

## 8. Gates (2026-10-23)

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** (0 lỗi) |
| `npm run build` (`rm -rf dist && npm run build`) | **PASS** — `✓ built in 6.63s`; entry `index-DbcrkPTw.js` 715,34 kB / 193,53 kB gzip (tăng do feature mới; Phase 5 baseline không bị hồi quy logic) |
| `npm run test:unit` | **PASS** — **105 test** (11 test mới `orderMoney.test.ts`; 94 test sẵn có) |
| 15 gate offline so baseline (`run-checks --only…`) | **"KHÔNG TỆ HƠN BASELINE"** — lint, test-unit, build, contrast-combos, contrast, error-handling, fabricated, icon-names, icon-library, ui-rules, unitprice-multiplier, a8-sql, lint-rls-migration, lint-rls-sources, test-catalog-sync = **15/15 OK rc=0** |
| Gate live (`verify-rls`, `inspect-db`) | Không chạy trong lượt gate cuối (theo quy ước: chỉ offline); e2e ở §6 đã chạm DB thật cho luồng đơn |
| Migration/dependency | **0 migration mới, 0 dependency mới** (`git diff package.json` = 0) |

---

## 9. Risks

| # | Risk | Mức | Ghi chú |
|---|---|---|---|
| R1 | **Không atomic** (client ghi 3 bảng rồi update orders) | **Trung bình** | Có thứ tự + compensation + idempotency; crash giữa chừng cần đối soát. **FL-7**: RPC/Edge transaction + webhook. |
| R2 | Khách không đọc được `order_items`/`payment_transactions`/`order_files` (RLS) | Thấp (đúng thiết kế) | Hoá đơn khách chỉ hiện `orders` snapshot; chi tiết chỉ admin/chủ đơn. Nếu muốn khách thấy giao dịch, cần policy/RPC riêng (FL-2b/FL-6). |
| R3 | F5 `/order-success/:id` cho **khách** cần `?token=` | Thấp | Không token ⇒ "không tìm thấy" (không fallback đơn khác). Sau này có thể lưu token localStorage có kiểm soát (FL-6). |
| R4 | `order.items[].id` dùng làm `product_id` khi lookup products/digital_assets | **Trung bình** | Với cart từ PDP id = product id; item từ `/quote` có thể khác ⇒ `seller_type`/`order_files` có thể NULL + warning (không bịa). **FL-2b** cần chuẩn hoá `productId` trên line item/quote. |
| R5 | Phí xưởng cần `assigned_workshop_id` | Thấp | Chưa gán xưởng ⇒ dùng default commission; thiếu cả hai ⇒ payout xưởng NULL (đúng honesty). FL-3 gán xưởng rồi có thể xác nhận lại (chưa hỗ trợ “recompute” — FL-4/5). |
| R6 | e2e `--live` ghi vào **DB production** | Thấp | Chỉ đơn prefix `E2E-` + cleanup `--cleanup` (secret key, Node-only). Đã kiểm 0 leftover. CI nên chạy dry-run mặc định. |
| R7 | Admin UI confirm dùng chung modal chi tiết đơn hiện có | Thấp | Không thêm route; modal cũ vẫn giữ ghi chú/QC trong phiên. |
| R8 | `payment_transactions` chưa có UI lịch sử ngoài order detail | Thấp | FL-5 (admin finance) sẽ làm dashboard/đối soát. |
| R9 | ManualPayoutProvider chưa ghi paid | — | Đúng defer FL-4; skeleton trả `not_implemented`, không báo thành công giả. |
| R10 | OrderMoney `seller_type` cho hàng in mặc định `platform` khi product thiếu | Thấp | Snapshot minh bạch; khi FL-2/3 có `designer_id`/commission đầy đủ sẽ chốt lại. |

### Việc còn lại cho FL-7 (server-side)
1. RPC/Edge Function atomic `confirm_manual_payment(order_id, …)` + RLS/role check phía server (không tin client).
2. Gateway thật (VNPay/MoMo/Stripe) + webhook service_role ghi `payment_transactions`; `ManualPaymentProvider` thay implementation, **không đổi UI/nghiệp vụ**.
3. Payout API thật + audit log khi mark paid (thay `ManualPayoutProvider`).
4. E-invoice/signature thật (hiện hoá đơn nói rõ "chưa có chữ ký số").
5. Email/Zalo/SMS (thay `InAppNotificationProvider`).
6. `/assets` đọc `order_files` + signed URL (FL-2b) — hiện FL-1 đã ghi `order_files` khi có
   `digital_assets.storage_path`; phần đọc/limit thuộc FL-2b.

---

## 10. Tái lập

```bash
# gates
npm run lint && npm run test:unit && rm -rf dist && npm run build
node scripts/run-checks.mjs --only lint --only test-unit --only build \
  --only check-contrast-combos --only check-contrast --only check-error-handling \
  --only check-fabricated --only check-icon-names --only check-icon-library \
  --only check-ui-rules --only check-unitprice-multiplier --only a8-sql-syntax-check \
  --only lint-rls-migration --only lint-rls-sources --only test-catalog-sync

# e2e DB thật (guest + RLS + admin confirm thật; tự dọn)
npx tsx scripts/e2e/guest-order-flow.ts                 # dry-run
npx tsx scripts/e2e/guest-order-flow.ts --live --cleanup --provision-admin

# smoke (ngoài repo; cần Chromium + libs)
#   build: npx vite build --outDir dist-ssr/fl1
#   preview: npx vite preview --outDir dist-ssr/fl1 --port 4177
#   script: /tmp/fl1-smoke/smoke.mjs (Playwright npx cache; ảnh /tmp/fl1-smoke/*.png)
```
