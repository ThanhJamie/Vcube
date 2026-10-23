<!-- doc-meta: status=active; verified=2026-10-23; owner=commerce-auth -->
# HANDOFF — Real-account verification (FL-1 order flow + FL-2a designer upload + role gates)

> **Work item:** `task-46` · **Agent:** `commerce-auth` · **Ngày:** 2026-10-23 · **Repo:** `/home/thanh/home/thanh/project/Vcube` @ `579ef55` (sạch)
> **Không commit/push. Không đổi code sản phẩm nào** (chỉ chạy verification; script/artefact nằm ngoài repo `/tmp/fl-real`).
> **Đã tắt preview `:4178`.** Không in mật khẩu demo ra log/handoff (đọc từ `docs/plans/10-modernization-plan.md`, lưu tạm `/tmp/fl-real/demo-pass` quyền 600, không đưa vào repo).

---

## 0. Tóm tắt kết quả

| # | Hạng mục | Kết quả |
|---|---|---|
| 0 | Sample accounts + demo password | **5/6 đăng nhập thật OK** (admin×2, designer×2, lab). `khachhang@vcube.vn` **FAIL mật khẩu demo + KHÔNG có row `user_profiles`** (xem §4.4). |
| 1 | **FL-2a designer upload thật** | ❌ **BLOCKED bởi 2 policy DB chưa áp** (không phải bug code — xem §3): storage `cad/<uid>/…` 403 RLS; `products` insert bởi designer 42501. Phần hạ tầng còn lại (upload/asset/signed URL/hash/cross-user) **đã kiểm PASS** qua `digital/<uid>/…`. |
| 2 | **FL-1 admin confirm thật** | ✅ **PASS** — 17 check (16 pass + 1 check snapshot tôi phân loại lại là đúng honesty, xem §2.3); DB ghi `paid` + `order_items` + `payment_transactions=paid` + `order_files` + snapshot; invoice DB; F5 390/1440; 0 pageerror/overflow. |
| 3 | **Role gates** | ✅ **PASS** (sửa cách phân loại 403): admin→`/admin`; lab→`/lab`,`/lab/machines`; designer verified+unverified→`/designer`; customer→`/orders`; mọi role không phải admin vào `/admin` đều nhận **màn 403 "KHÔNG CÓ QUYỀN TRUY CẬP"**. ⚠️ phát hiện 1 bug UI 390 ở `/lab` (toast viewport, ngoài scope — §4.1). |
| 4 | Cleanup | ✅ **0 leftover**: 0 order test, 0 product/asset test, 0 storage object, 0 temp user (đo bằng secret key, §5). |

---

## 1. Môi trường & phương pháp

- App: build HEAD `579ef55` → `npx vite build --outDir dist-ssr/real`, preview `:4178` (đã tắt). Chromium
  `~/.cache/ms-playwright/chromium-1244/chrome-linux64/chrome` + `LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu`;
  Playwright npx cache `~/.npm/_npx/e41f203b7505f1fb`. DB: Supabase project trong `.env`; verify row/storage
  bằng **secret key trong Node server-side** (`createClient` service role) — không đưa secret vào bundle.
- Mật khẩu demo: đọc từ doc, dùng để đăng nhập UI thật cho từng account. Không in/không lưu vào repo.
- Script/artefact (ngoài repo, không commit): `/tmp/fl-real/{accounts,verify-admin,verify-snapshot,verify-designer,verify-roles,debug-*}.mjs|ts`,
  JSON kết quả, ảnh `*.png`; STL test 20×20×20 mm (`cube20.stl`, 684 B, sha256 `bd896cc3419f2a7a7547f63686cbaf7e66128e2d7ce69d5a4e8de084aee60efa`).

---

## 2. FL-1 — Admin confirm payment thật (PASS)

### 2.1 Tài khoản & luồng
- Guest order tạo bằng **anon key** (không auth user), gồm **1 dòng in + 1 dòng file số** (dòng số dùng
  `product_id` của `digital_assets` thật để test `order_files`), `payment_status=awaiting_payment`.
- Đăng nhập UI thật `admin.forge@vcube.vn` (role admin, kyc verified) → `/admin/orders` → mở
  "Chi tiết & thanh toán" của đúng đơn → bấm **Xác nhận đã nhận tiền** (2 bước) → đơn chuyển ĐÃ THANH TOÁN.

### 2.2 Bằng chứng DB sau confirm
| Kiểm | Kết quả |
|---|---|
| `orders.payment_status` | **paid** |
| `order_items` | **2 dòng** (1 print + 1 digital), đúng `fulfillment/seller_type/line_total` |
| `payment_transactions` | **1 dòng** `status=paid`, `amount=550000`, `payment_gateway=vietqr_manual`, `transaction_id=manual_<orderId>` |
| `order_files` | **1 dòng** đúng `storage_path` của `digital_assets` mẫu (`DEMO/cad/banh-rang-hanh-tinh.stl`), `license` khớp |
| `workshop_payout_status` / `designer_payout_status` | **unpaid / unpaid** (đúng FL-1, FL-4 mới mark paid) |
| UI | 0 pageerror; screenshot 390 + 1440 |
| Invoice | mở từ `/order-success/:id?token=`, đọc **bản ghi DB** + giao dịch thanh toán |
| F5 `/order-success/:id?token=` | render lại từ DB ở **390 và 1440**, 0 pageerror/overflow |
| Cleanup | xoá order (cascade) → **0 leftover** |

### 2.3 Snapshot tiền — kể cả ca thiếu cấu hình (đúng data-honesty)
- Đơn **không gán xưởng**, `pricing_global_settings.default_workshop_commission_percent = NULL` ⇒
  `platform_fee_amount`/`workshop_payout_amount` = **NULL** là **ĐÚNG** (không bịa 0). Các trường có nguồn:
  `subtotal=520000`, `designer_payout=10000` (royalty 5% từ `pricing_configs`), VAT ghi 0 theo đơn.
- Đơn thứ 2 **có `assigned_workshop_id=ws-test-01`** (terms 12%) + cùng cấu hình ⇒ verify tiếp, **tất cả non-NULL**:
  | Trường (orders) | Giá trị |
  |---|---:|
  | `subtotal_amount` | 700,000 |
  | `vat_percent_snapshot` / `vat_amount` | 8 / **0** (số VAT đã ghi trên đơn = 0 — ưu tiên số đã ghi) |
  | `platform_fee_percent_snapshot` / `platform_fixed_fee_snapshot` | **NULL** (trộn 2 tỉ lệ 12% + 8%) / 5,000 |
  | `platform_fee_amount` | **81,000** (= 60,000 in + 16,000 file số + 5,000 fixed) |
  | `workshop_payout_amount` | **470,000** (= 500,000 − 60,000 + 30,000 ship) |
  | `designer_payout_amount` | **10,000** (5% × 200,000) |
  | Dòng in (`order_items`) | `line_total=500000`, `workshop_commission=12`, `platform_fee=60000`, `workshop_payout=440000` |
  | Dòng số | `line_total=200000`, `royalty=5`, `platform_fee=16000`, `designer_payout=10000`, `seller_type=designer` |
  | `order_files` | 1 dòng, `storage_path` khớp asset thật |
- Kết luận công thức §3b đã chạy đúng trên DB thật, gồm cả nhánh "thiếu cấu hình ⇒ NULL".

---

## 3. FL-2a — Designer upload thật: **BLOCKED** (2 policy DB chưa áp; không sửa code)

### 3.1 Blocker A — storage policy `cad/<uid>/<uuid>/<file>` chưa có hiệu lực trên production
- Repro: đăng nhập UI `creator.lethang@vcube.vn` (designer verified) → `/designer/wizard` → chọn STL →
  **XUẤT BẢN** ⇒ toast lỗi; network:
  `POST /storage/v1/object/cad-files/cad/4a528ff9-…/<uuid>/cube20.stl` → **HTTP 400**, body:
  `{"statusCode":"403","error":"Unauthorized","message":"new row violates row-level security policy","code":"AccessDenied"}`;
  app tự compensation `DELETE /storage/v1/object/cad-files` → 200 (không để object mồ côi).
- Đối chứng cùng session/designer: upload `digital/<uid>/<uuid>/…` → **OK**; `digital_assets` insert → **OK**;
  `createSignedUrl` → **200**, tải về **684 B**, **sha256 khớp** `bd896cc3…`; cross-user: anon đọc → **DENIED**,
  designer khác đọc → **DENIED**, designer khác ghi vào thư mục owner → **DENIED (RLS)**.
- Nguyên nhân: production **chưa áp** migration `supabase/migrations/20261013110000_storage_scheme.sql`
  (header file ghi rõ **"DRAFT … CHƯA ÁP lên production"**, chờ `docs/tasks/DRIFT-TASKS.md` §1.4) — policy
  `vcube_cad_files_cad_owner_rw` (định nghĩa kỳ vọng ở `20261010_harden_rls.sql:1235-1246` và file draft
  `20261013110000_storage_scheme.sql:55-70`) **không có/khác** trên DB. Policy `digital/<uid>/` thì có (upload
  `digital/` chạy).
- Ảnh hưởng code: `src/frontend/components/designer/DesignerUploadWizardTab.tsx:231` (`buildCadStoragePath`)
  → `src/backend/integrations/fileStorage.ts:262-273` (`upload`). Code **đúng** theo scheme T25; không nên
  đổi scheme để "lách" vì `order_files`/buyer-read dựa trên path và tài liệu/FL-2b dùng `cad/`.
- Việc cần làm (Lead/H): chạy `20261013110000_storage_scheme.sql` bằng SQL Editor (backup + post-check theo
  DRIFT-TASKS), rồi chạy lại verification này.

### 3.2 Blocker B — `products` RLS không cho designer INSERT (kể cả khi upload đã sửa)
- Repro (authenticated designer, REST):
  `POST /rest/v1/products` với payload product mới → **`42501 new row violates row-level security policy for table "products"`**.
- Nguyên nhân: chỉ có `vcube_products_public_read` + `vcube_products_admin_all`
  (`supabase/migrations/20261010_harden_rls.sql:321-325`); không có policy INSERT cho `role=designer`.
- Ảnh hưởng code: `DesignerUploadWizardTab.tsx:246` (`await onAddNewProduct(newProd)`) — dù upload thành công,
  bước tạo product sẽ fail (và compensation xoá object). Designer **có** quyền `digital_assets` insert
  (`digital_assets` RLS cho designer sở hữu) — nên chỉ thiếu policy `products` cho designer.
- Việc cần làm: migration nhỏ `create policy vcube_products_designer_insert ... for insert to authenticated
  with check (public.current_app_role() = 'designer')` (hoặc qua RPC/Edge). **Không tự tạo migration trong
  task này** (ràng buộc task + cần review RLS).

### 3.3 Vì sao không "fix nhỏ trong scope"
Cả hai blocker là **DB policy/RLS drift**, không phải bug UI/service; sửa code (đổi path sang `digital/`
hoặc bỏ tạo product) sẽ phá scheme/hành vi đã chốt. Đã giữ code nguyên, ghi rõ tại đây.

---

## 4. Role gates + màn theo role (PASS, kèm 1 bug UI ngoài scope)

### 4.1 Kết quả (390×844 + 1440×900)
| Account | Route | Kết quả |
|---|---|---|
| `admin.forge@vcube.vn` (admin) | `/admin`, `/orders` | render OK cả 2 viewport; 0 pageerror; 0 tràn ngang |
| `workshop.mes@vcube.vn` (lab) | `/lab`, `/lab/machines` | render OK (queue + machines); 0 pageerror; **`/lab` @390 bị tràn ngang_pages (xem bug dưới)**; `/lab/machines` @390 sạch |
| `creator.lethang@vcube.vn` (designer verified) | `/designer`, `/designer/models` | render OK cả 2 viewport |
| `designer@gmail.com` (designer **unverified**) | `/designer` | render OK cả 2 viewport (không bị chặn oan) |
| customer (tạm — xem §4.4) | `/orders` | render OK cả 2 viewport (empty state thật; FL-2b/FL-5 chưa nạp đơn) |
| lab / designer / customer | `/admin` | **403 screen "KHÔNG CÓ QUYỀN TRUY CẬP"** (RoleGuard đúng; admin duy nhất vào được) |

### 4.2 Bug UI phát hiện: toast viewport tràn ngang ở 390 (ngoài scope FL-1/FL-2a)
- `src/frontend/components/shell/AppOverlays.tsx:105`:
  `className="fixed bottom-6 left-6 z-toast … max-w-sm w-full"`.
  Khi có toast hiển thị: width = 100vw tại `left:24px` ⇒ mép phải **414px > 390** ⇒ `document.scrollWidth=783`
  (đo `/lab` @390 khi có toast). Nội dung trang khác (tab bar 475, table 931) đều nằm trong container
  `overflow-x:auto` nên **không** gây tràn trang.
- Đề xuất fix (Phase 6/owner shell): `left-4 right-4 w-auto max-w-sm` hoặc `w-[calc(100vw-2rem)]`.
- **Không sửa** trong task này (file Phase-4 shell, ngoài write-scope FL-1/FL-2a).

### 4.3 Finding bảo mật/toàn vẹn dữ liệu (ghi nhận, không sửa)
- Policy `vcube_orders_guest_insert` chỉ kiểm `secure_access_token / customer_email / items / user_id`;
  **không chặn** các cột khác client gửi lên như `assigned_workshop_id`, `total_amount`, `shipping_fee`,
  thậm chí các cột snapshot tiền (`subtotal_amount`, `platform_fee_amount`…). Guest có thể INSERT đơn với
  số tiền/routing không do hệ thống tính. Admin confirm **ghi đè snapshot** nên P&L cuối cùng vẫn đúng,
  nhưng trước confirm UI có thể hiển thị số client gửi. **Fix đúng: Edge/RPC tạo đơn phía server (FL-7)**;
  ghi trong risk của FL-1. (Trong verification này tôi có dùng `assigned_workshop_id` để test nhánh snapshot
  non-NULL — đơn đã xoá.)

### 4.4 Ngoại lệ sample account
- `khachhang@vcube.vn`: **không có row `user_profiles`** (chỉ có auth user + có thể `customer_profiles`) và
  **mật khẩu demo sai** (`Invalid login credentials`). Không đổi mật khẩu (đúng ràng buộc). Để test màn
  customer, tôi **tạo customer TẠM** bằng secret key, test `/orders` + gate `/admin`, rồi **xoá user** ngay
  (0 temp user còn lại). Đề nghị Lead bổ sung password/profile cho account mẫu này.

---

## 5. Cleanup proof (sau toàn bộ verification)

Đo bằng secret key (script `/tmp/fl-real/final-cleanup-audit.mjs`):

```json
{ "leftoverOrders": 0, "leftoverProducts": 0, "leftoverE2EProducts": 0,
  "leftoverAssets": 0, "leftoverTempUsers": 0, "tempUserEmails": [],
  "cadFolders": [], "digitalFolders": [] }
```
- Đơn verify (`verify-real@vcube.test`, `verify-snap@vcube.test`) đã xoá (cascade `order_items`, `payment_transactions`, `order_files`).
- Object storage test đã xoá; `cad/` và `digital/` không còn folder test ở root bucket.
- Không tạo/xoá user thật; admin tạm (nếu dùng ở bước nào) đã xoá; customer tạm đã xoá.
- Preview `:4178` đã tắt (`curl` = 000).

---

## 6. Gates

**Không thay đổi file code nào trong repo** (`git status` sạch sau task) ⇒ không chạy lại gate sản phẩm.
Việc verify dùng build HEAD `579ef55` (`npx vite build --outDir dist-ssr/real` → PASS). Nếu Lead muốn, gate cũ
giữ nguyên trạng thái xanh từ commit trước.

## 7. Đề xuất cập nhật PLAN

`docs/tasks/world-class/PLAN.md` **chưa** cập nhật FL-2a = "verified real" vì **chưa pass** (2 blocker RLS ở §3).
Đề xuất thêm dòng trạng thái sau khi xử lý:
- `FL-2a: BLOCKED — cần áp migration storage_scheme (cad/<uid>) + policy products INSERT cho designer; đã
  verify phần hạ tầng (upload digital/<uid>, digital_assets, signed URL, sha256, cross-user deny) với account
  creator.lethang@vcube.vn.`

## 8. Việc chưa làm được / bàn giao

| Việc | Lý do |
|---|---|
| FL-2a end-to-end (UI→Storage→product/asset) | 2 blocker DB policy §3 (cần Lead áp migration/policy) |
| Verify bằng `khachhang@vcube.vn` | account mẫu thiếu profile + sai mật khẩu demo (§4.4) |
| Sửa toast overflow 390 | file shell ngoài scope FL-1/FL-2a; đã ghi §4.2 + gợi ý fix |
| Kiểm `/lab` sâu hơn (queue cập nhật nấc) | ngoài phạm vi task; role gate/render đã PASS |
