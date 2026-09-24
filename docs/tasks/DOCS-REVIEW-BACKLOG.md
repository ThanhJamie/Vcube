<!-- doc-meta: status=snapshot; verified=2026-09-24; owner=thanh -->
# VCUBE — Docs Review & Development Backlog

> **Ngày review:** 2026-09-23
> **Phương pháp:** 6 subagent review độc lập (read-only) theo miền — index/link, pages, architecture,
> database/security, design-system, và khai thác backlog từ plans + code. Mọi phát hiện kèm bằng chứng
> `file:line`; các mục P0/P1 đã được người điều phối xác minh lại trực tiếp trong source/migration.
> **Phạm vi:** toàn bộ docs canonical (`docs/README.md`, `README.md`, `AGENTS.md`,
> `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/design/`,
> `docs/SETUP_RUNBOOK.md`, `docs/tasks/`) đối chiếu `src/`, `supabase/`, `scripts/`, `package.json`.
> **Trạng thái:** tài liệu đã được refactor cho khớp hiện tại (26 file md, +727/−526 dòng, không đụng `src/`).
> File này liệt kê **lỗi còn tồn đọng** + **việc cần phát triển** phát hiện trong vòng review đó.
>
> **Snapshot note (2026-09-24):** mọi tham chiếu `docs/plans/**` dưới đây trỏ tới bộ kế hoạch cũ **đã archive** (xem `docs/archive/README.md`), không phải nguồn sự thật. Các `file:line` giữ nguyên theo thời điểm review và có thể đã trôi.

---

## 0. Tóm tắt điều hành

| Mức | Lỗi docs (`ERROR`/`DRIFT`/`CONTRADICTION`) | Gaps/STUB | Tổng |
|---|---|---|---|
| **P0** | 2 | 0 | 2 |
| **P1** | 17 | 8 | 25 |
| **P2** | 38 | 12 | 50 |
| **Tổng** | **57** | **20** | **77** |

**3 việc gấp nhất (P0):**

1. **SEC-01 — `designer_profiles` bị expose public gồm cột ngân hàng/mã số thuế.** Anon có thể `SELECT`
   `bank_name`/`bank_account`/`tax_id` qua policy `USING (true)`. Đây là rò rỉ dữ liệu tài chính của designer.
2. **DS-01 — `docs/design/qa-checklist.md` §3 "Both languages (VI/EN)" không còn thực thi được.** App đã
   chuyển VI-only; toàn bộ bước "Flip to EN" và bảng U9/i18n là bước chết.
3. **PAGE-01/02/03 — `docs/pages/customer-checkout.md` khẳng định "không có bảng `order_items`/`warranty_claims`/`order_files`".**
   Sai: cả 3 bảng đều có trong baseline migration. Vấn đề thật là **bảng tồn tại nhưng không có code đọc/ghi**
   (unwired), không phải "không có bảng".

---

## 1. Lỗi còn tồn đọng trong tài liệu

### 1.1 Bảo mật / RLS

| ID | Mức | Vị trí | Vấn đề | Bằng chứng | Cách sửa |
|---|---|---|---|---|---|
| SEC-01 | **P0** | `docs/security/rls-policies.md:103,219` | `designer_profiles` nằm trong `v_catalog_read` với policy `USING (true)` ⇒ anon đọc được `bank_name`, `bank_account`, `tax_id` | `supabase/migrations/20261010_harden_rls.sql:309` (allowlist), `:407-413` (policy); cột tại `20260901_baseline_schema.sql:892-894` | Bỏ `designer_profiles` khỏi `v_catalog_read`; tạo view `security_invoker` chỉ gồm cột portfolio (bio/avatar/rating), hoặc revoke column SELECT |
| SEC-02 | **P1** | `docs/security/rls-policies.md:113,326-331` | Policy designer của `custom_design_requests` khớp `designer_id is null` cho **mọi** authenticated ⇒ lộ `client_name`/`messages`/`reference_files` của khách khác | `20261010_harden_rls.sql:749-755` | Yêu cầu role designer (`public.current_app_role() = 'designer'`) hoặc bỏ nhánh `is null` |
| SEC-03 | **P1** | `docs/security/rls-policies.md:53` | Doc nói "Zero hardcoded emails in any production migration"; `bootstrap_admin.sql` hardcode `chithanhso10@gmail.com` và lint **không** quét `supabase/scripts/` | `supabase/scripts/bootstrap_admin.sql:21`; `scripts/lint-rls-sources.mjs:24-25` | Đổi mặc định thành `'__CHANGE_ME__'`; mở rộng lint sang `supabase/scripts/` |
| SEC-04 | P2 | `docs/security/rls-policies.md` (catalog) | Catalog public lộ dữ liệu COGS/tồn kho: `materials.cost_per_kg`, `printer_fleet.acquisition_cost/hourly_cost`, `accessories.cost_price`, `workshop_materials.price_per_kg`… | `20261010_harden_rls.sql:308-311` | View catalog loại cột cost, hoặc tách policy theo cột |
| SEC-05 | P2 | `docs/security/rls-policies.md:366` | Doc hứa "null count ⇒ UNKNOWN/exit 1", nhưng `verify-rls.mjs` dùng biến `status` chưa destructure ⇒ `ReferenceError` | `scripts/verify-rls.mjs:155,163` | Lấy `status` từ `countRows` trước khi dùng |
| SEC-06 | P2 | `docs/security/rls-runbook.md`; `docs/database/seeds-and-migrations.md` | `inspect-db.mjs` thiếu `custom_design_requests`; header `apply_all_manual.sql` tự nhận "đủ 31/31" | `scripts/inspect-db.mjs:56-94`; `supabase/scripts/apply_all_manual.sql:37-40` | Thêm bảng hoặc sửa text đếm |
| SEC-07 | **P1** | `docs/security/rls-policies.md:96-98,121` | Ma trận cấp quyền cho Designer/Workshop nhiều thứ migration **không** hề cài (orders/order_items/order_files/storage) | `20261010_harden_rls.sql:335-350,578-589,701-708,1177-1188` | Sửa ma trận cho khớp policy thật (hoặc bổ sung policy nếu là ý định) |
| SEC-08 | P2 | `docs/security/rls-policies.md:173` | Nói admin "full control across all buckets"; thực tế policy scoped `bucket_id='cad-files'` | `20261010_harden_rls.sql:1166-1170` | Ghi rõ scope từng bucket |
| SEC-09 | P2 | `docs/security/rls-policies.md:115,116` | `setting_audit` ghi "Full Access" nhưng policy chỉ SELECT+INSERT (append-only); `pricing_configs` ghi "Read active" nhưng policy `USING (true)` | `20261010_harden_rls.sql:409,547-552` | Sửa ma trận |
| SEC-10 | P2 | `docs/database/schema.md:1071`; `docs/security/rls-policies.md:170` | Doc mô tả path attachment `orders/<order_id>/...`; client upload thật vào `cad/<file>` | `src/backend/supabase/database.ts:284-298` | Sửa scheme hoặc implement |

### 1.2 Database & schema drift

| ID | Mức | Vị trí | Vấn đề | Bằng chứng | Cách sửa |
|---|---|---|---|---|---|
| DB-01 | **P1** | `docs/database/schema.md:1014` | Nói `total_spent`/`total_orders` bị "silently reset"; thực tế raise `42501` | `20260901_baseline_schema.sql:1462-1466`; `20261010_harden_rls.sql:841-848` | Sửa §6.1; đồng bộ với `rls-policies.md:141` |
| DB-02 | **P1** | `docs/database/schema.md:315` | Token mô tả `sec_<epoch>_<random>`; prefix thật là `token_` | `src/backend/supabase/database.ts:328` | Sửa text |
| DB-03 | P2 | `docs/database/schema.md:75,314` | `orders.payment_status` enum sai (5 giá trị gồm `failed/refunded`) và doc nói có CHECK; SQL không có CHECK; code union là `awaiting_payment\|paid\|cod\|cancelled\|unpaid` | `20260901_baseline_schema.sql:687`; `src/types/index.ts:79` | Reconcile §3 với §4.2, ghi rõ "no CHECK" |
| DB-04 | P2 | `docs/database/schema.md:77,606` | `kyc_records.status` liệt kê trong KYC CHECK 5 giá trị; cột không có CHECK | `20260901_baseline_schema.sql:877` | Reconcile |
| DB-05 | P2 | `docs/database/schema.md:995` | `get_order_by_guest_token` ghi `LANGUAGE plpgsql`; thật là `language sql` | `20260901_baseline_schema.sql:1399` | Sửa |
| DB-06 | P2 | `docs/database/schema.md:977-992` | Helpers ghi `plpgsql` + catch `undefined_table`; bản hardening thay bằng `language sql` không exception handler | `20261010_harden_rls.sql:52-108` | Ghi chữ ký cuối cùng |
| DB-07 | P2 | `docs/database/schema.md:102-106` | Danh sách index `products` thiếu `idx_products_fts` (1 trong 2 GIN) | `20260901_baseline_schema.sql:1205-1208` | Thêm |
| DB-08 | P2 | `docs/database/seeds-and-migrations.md:181` | Liệt kê cột NULL của `pricing_global_settings` thiếu `default_workshop_commission_percent` | `20260901_baseline_schema.sql:495` | Thêm |
| DB-09 | P2 | `docs/database/seeds-and-migrations.md:202` | Trình bày `seedService.syncFromSupabase()` như read path; hàm **0 call site** | `src/backend/supabase/seedService.ts:102` | Chỉ ra reader thật hoặc đánh dấu unused |
| DB-10 | P2 | `docs/database/schema.md:54-55` | ERD ngụ ý FK (`assigned_workshop_id`, `order_items.product_id`, `digital_assets.product_id`, `cart_items.product_id`) không tồn tại dưới dạng constraint | `20260901_baseline_schema.sql` (không có `references`) | Ghi rõ "logical, not FK" |
| DB-11 | **P1** | `docs/security/rls-runbook.md:4,143,187,200` | Nói client còn đọc role từ `user_metadata`, còn tạo user Google giả, migration chưa chạy — code/AGENTS nói đã xử lý xong | `src/frontend/context/AuthContext.tsx:81-94,280-333`; `AGENTS.md` "Vai trò UI: đã lấy từ DB" | Cập nhật trạng thái client |
| DB-12 | **P1** | `docs/security/rls-runbook.md:38,181` vs `:270,294` | Probe lịch sử ("project chưa có schema", "chưa chạy Postgres thật") đang được trình bày như hiện tại | Cùng file | Date-stamp §1.1/§9/§10.3 là historical; thêm header trạng thái hiện tại |
| DB-13 | P2 | `docs/security/rls-runbook.md:143,152` | Line refs cũ (`database.ts:248-271` cho `saveOrder`; `AuthContext.tsx:67-80`) | `database.ts:308-389` | Refresh/ bỏ line ref tuyệt đối |

### 1.3 Pages docs

| ID | Mức | Vị trí | Vấn đề | Bằng chứng | Cách sửa |
|---|---|---|---|---|---|
| PAGE-01 | **P1** | `docs/pages/customer-checkout.md:122,157` | Khẳng định "no `order_items` table" — sai, bảng có thật | `20260901_baseline_schema.sql:1131` | Ghi "bảng tồn tại nhưng chưa wire; items ghi vào `orders.items` jsonb" |
| PAGE-02 | **P1** | `docs/pages/customer-checkout.md:225` | "There is no `warranty_claims` table" — sai | `20260901_baseline_schema.sql:439` | Sửa: bảng có, form chưa persist |
| PAGE-03 | **P1** | `docs/pages/customer-checkout.md:244` | "there is no `order_files` table" — sai | `20260901_baseline_schema.sql:457` | Sửa: bảng có, 0 code đọc/ghi |
| PAGE-04 | **P1** | `docs/pages/customer-checkout.md:16,198-214` | MyOrders mô tả như "filterable order history"; non-admin không bao giờ load DB (chỉ `if (role==='admin')`), `getOrdersByCustomer` 0 caller | `src/App.tsx:680,911-922`; `src/backend/services/orderService.ts:46` | Dev: load đơn của owner (RLS đã cho phép) |
| PAGE-05 | **P1** | `docs/pages/designer-workshop-portals.md:82` | Payout History "fed by `PAYOUT_TRANSACTIONS` fixture"; fixture rỗng ⇒ luôn empty | `src/data/mockData.ts:225`; `DesignerPayoutsTab.tsx:28,105-113` | Ghi rõ "always empty state" |
| PAGE-06 | **P1** | `docs/pages/designer-workshop-portals.md:73` | Brief "target material, infill, nozzle" — modal chỉ submit material | `CustomIdeaRequestModal.tsx:134-136`; `customDesignService.ts:155-161` | Thêm field hoặc bỏ khỏi doc |
| PAGE-07 | P2 | `docs/pages/admin-portal.md:90` | "no LTV or order-count column" — code có `total_spent`/`total_orders` | `Group3CustomersPanel.tsx:703-709,372-383,532-542` | Sửa |
| PAGE-08 | P2 | `docs/pages/admin-portal.md:83`; `designer-workshop-portals.md:79-82` | "no payout table/ledger" tuyệt đối; cột payout có trên `orders`/`order_items` (chỉ thiếu bảng request) | `20260901_baseline_schema.sql:735-742,1147-1149` | Nói chính xác "không có payout-request table" |
| PAGE-09 | **P1** | `docs/pages/admin-portal.md:140-142` | Dispatcher "computes suggested workshop match" — `useProductionStore.workshops` hardcode rỗng, luôn nhánh "Chưa có trạm in nào" | `src/stores/useProductionStore.ts:278,320`; `Group5ProductionPanel.tsx:808-873` | Dev: nạp workshops từ `workshop_profiles` |
| PAGE-10 | **P1** | `docs/pages/admin-portal.md:142` | "no write path for `assigned_workshop_id`" — sai, `dbService.saveOrder` nhận `assignedWorkshopId` | `src/backend/supabase/database.ts:318-319,376`; `orderService.ts:37` | Sửa: thiếu caller UI, không thiếu write path |
| PAGE-11 | **P1** | `docs/pages/designer-workshop-portals.md:75` | Status pipeline `pending→quoted→in_progress→completed/declined`; UI chỉ ghi `quoted`, `updateStatus` 0 caller | `DesignerRequestsTab.tsx:147,156`; `customDesignService.ts:197` | Dev: thêm transition control hoặc đánh dấu unimplemented |
| PAGE-12 | **P1** | `docs/pages/storefront.md:56`; `designer-workshop-portals.md:56-57` | Wizard Step 1 claim "tự động quét lưới/kiểm tra kín nước" (sai), Step 2 hardcode "PETG / Nylon-CF" | `DesignerUploadWizardTab.tsx:189-192,280` | Bỏ claim hoặc implement |
| PAGE-13 | P2 | `docs/pages/admin-portal.md:65` | Group1 tab "materials": thêm vật liệu chỉ in-memory, KPI hardcode `—` | `Group1WorkshopsPanel.tsx:493-501,803-811` | Ghi rõ |
| PAGE-14 | P2 | `docs/pages/customer-checkout.md:15` | `/tracking` "carrier tracking integration" — order luôn tạo carrier rỗng nên không bao giờ populate | `CheckoutView.tsx:185-188`; `OrderTrackingView.tsx:529-543` | Sửa |
| PAGE-15 | P2 | `docs/pages/storefront.md:72` vs `customer-checkout.md:153` | Mâu thuẫn NDA: storefront nói custom idea "full NDA protection"; checkout nói không có NDA | `CustomIdeaRequestModal.tsx:240-245`; `Group3CustomersPanel.tsx:247` | Thống nhất: NDA là manual `customer_profiles.nda_signed` |
| PAGE-16 | P2 | `docs/pages/admin-portal.md:138` vs `designer-workshop-portals.md:7,94` | Hai định nghĩa "8 nấc" khác nhau cho cùng orders: `KANBAN_STAGES` vs `MES_PIPELINE_STAGES` | `useProductionStore.ts:27-132`; `OrderProgress.tsx:13-22` | Ghi rõ pipeline nào dùng ở đâu |
| PAGE-17 | P2 | `docs/pages/admin-portal.md:145` | "status (`published`/`draft`)"; tạo mới luôn `Published`, chỉ edit mới có Draft | `AdminProductsPanel.tsx:178-180` vs `:347-348,565` | Sửa |
| PAGE-18 | P2 | `docs/pages/customer-checkout.md:14-15` | `/order-success`,`/tracking` resolve từ mảng in-memory; reload mất ⇒ "không tìm thấy đơn" (không nêu limitation) | `src/App.tsx:267-270,300-311` | Thêm limitation |
| PAGE-19 | P2 | `docs/pages/designer-workshop-portals.md:68` | Royalty note cho digital price luôn `—` (percent chỉ ở physical) | `DesignerUploadWizardTab.tsx:450-453` vs `:471-482` | Sửa |

### 1.4 Architecture docs

| ID | Mức | Vị trí | Vấn đề | Bằng chứng | Cách sửa |
|---|---|---|---|---|---|
| ARCH-01 | **P1** | `docs/architecture/pricing-engine.md:242-246` | §3.5 "Financial Split" không khớp hàm thật (platform = residual, digital royalty = 90% gross, workshop = cost + 80% rush + 100% personalization, escrow 7 ngày); hàm **0 caller** | `src/utils/pricingEngine.ts:1020-1051` | Viết lại từ code hoặc đánh dấu unwired |
| ARCH-02 | **P1** | `docs/architecture/pricing-engine.md:216` | Diagram nói royalty = `RawSellingPrice × DesignerRoyalty%`; code trả digital 90% gross, không liên quan `designerRoyaltyPercent` | `src/utils/pricingEngine.ts:1022` | Sửa |
| ARCH-03 | **P1** | `docs/architecture/system-overview.md:429-462` | Claim "orders … synchronized … WebSocket subscriptions"; `App.tsx` chỉ mở 1 channel `public:products` | `src/App.tsx:820` | Nói rõ orders fetch on-demand (admin) hoặc thêm subscription |
| ARCH-04 | P2 | `docs/architecture/system-overview.md:427` | Thiếu channel thật `public:custom_design_requests` | `src/backend/services/customDesignService.ts:306` | Bổ sung §7 |
| ARCH-05 | P2 | `docs/architecture/pricing-engine.md:214-217` vs `:243-246` | Mâu thuẫn nội bộ: áp fee trên `RawSellingPrice` vs `FinalSellingPriceRounded` | Code dùng gross/final | Chọn 1 basis |
| ARCH-06 | P2 | `docs/architecture/pricing-engine.md:110,132,195,429,134` | Công thức hardcode trình bày như cấu hình: shell/infill `0.22/0.78`, `V×3.8` print-hour, thin-wall 0.8mm, `(extruders-1)*85` tool changes | `src/utils/printEstimate.ts:69,88`; `pricingEngine.ts:689,469` | Đưa vào config hoặc ghi rõ hardcoded |
| ARCH-07 | P2 | `docs/architecture/3d-cad-pipeline.md:27,318,424,428` | Ngưỡng hardcode không ghi rõ: STL worker 2 MB, timeout 30s, `MAX_TOPOLOGY_TRIANGLES=60000`, `THICKNESS_RAY_BUDGET=1.2M`, 64 samples, 4 part | `src/utils/meshParser.ts:174,177,226,1383,1443,1743` | Đánh dấu/đưa vào config |
| ARCH-08 | P2 | `docs/architecture/pricing-engine.md` | Thiếu doc cho `generateDeliveryPackages`, `comparePrintersForModel`, `calculateManualInkiriEstimate` | `pricingEngine.ts:822,883,736` | Bổ sung |
| ARCH-09 | P2 | `docs/architecture/system-overview.md:145-146` | Hardening chỉ ghi "90 policy + 6 storage"; thực tế còn tạo/recreate 4 trigger | `20261010_harden_rls.sql` | Bổ sung triggers |
| ARCH-10 | P2 | `docs/architecture/system-overview.md:44,146` | "90 table policies" thiếu caveat 2 policy `pricing_config` bị bỏ ⇒ 88 hiệu lực | `AGENTS.md` | Thêm caveat |
| ARCH-11 | P2 | `docs/architecture/system-overview.md:145` | Baseline ghi "5 triggers" lệch với AGENTS "7 định nghĩa" | `20260901_baseline_schema.sql` (5 tên), harden +2 | Reconcile: baseline 5, harden +2 = 7 định nghĩa / 27 instance |
| ARCH-12 | P2 | `docs/architecture/pricing-engine.md:122,141` | Density (PLA 1.24…) và công suất máy (X1C 0.18kW…) trình bày như thật; catalog rỗng | `src/data/mockData.ts:49,80` | Đánh dấu illustrative như §5 |
| ARCH-13 | P2 | `docs/architecture/system-overview.md:37` | Diagram vẽ "Shared Buffers" từ client vào Supabase; transferable buffer chỉ main↔worker | `src/utils/meshParser.ts:1420`; `cadParser.worker.ts:239` | Sửa diagram |
| ARCH-14 | P2 | `docs/architecture/system-overview.md:45` | `cad-files` ghi "(Authenticated)"; thật là private admin-write + buyer/designer-read | `20261010_harden_rls.sql:1169-1229`; `assetService.ts:6-10` | Sửa |
| ARCH-15 | P2 | `docs/architecture/system-overview.md:215` | Bootstrap kể `error`/`onerror` nhưng thiếu `unhandledrejection` cũng được đăng ký | `src/main.tsx:27-28` | Bổ sung |
| ARCH-16 | P2 | `docs/architecture/system-overview.md:391-425` | Thiếu 2 subsystem bảo mật: RPC `get_order_by_guest_token` (token ≥12, không fallback) và idempotency `payment_transactions` (`23505`) | `database.ts:450-480,797-825` | Bổ sung |
| ARCH-17 | P2 | `docs/architecture/pricing-engine.md` | Field chết `difficultMaterialExtraPercent` còn trong reference formula nhưng engine không đọc | `mockData.ts:154`; `types/index.ts:394` | Gỡ field hoặc note |

### 1.5 Index / portal / runbook

| ID | Mức | Vị trí | Vấn đề | Bằng chứng | Cách sửa |
|---|---|---|---|---|---|
| IDX-01 | **P1** | `AGENTS.md:7,9-14` | Repo path sai (`/home/thanh/projects/Vcube`); path thật `/home/thanh/home/thanh/project/Vcube` ⇒ mọi lệnh `wsl --cd` fail | env + `pwd` | Sửa cả AGENTS và SETUP §2.1 |
| IDX-02 | **P1** | `AGENTS.md:18` | Liệt kê `motion` trong stack; `package.json` không có, 0 import | `package.json:13-28` | Gỡ `motion` |
| IDX-03 | **P1** | `docs/README.md:109` | 5 link design chết (`../design/*` trỏ ra repo-root `/design`) | Cấu trúc repo | Đổi thành `./design/...` |
| IDX-04 | **P1** | `docs/README.md:182-198` | Bảng gate tự nhận "mirrors full local set" nhưng thiếu `check-error-handling.mjs` | `AGENTS.md:78`; `SETUP_RUNBOOK.md:385` | Thêm row |
| IDX-05 | **P1** | `docs/README.md:93` | Route `/workshop/settings` không tồn tại | `src/App.tsx` chỉ có `/lab`, `/lab/:tab` | Gỡ alias hoặc thêm route |
| IDX-06 | **P1** | `docs/architecture/system-overview.md:145` vs `AGENTS.md:57` | Trigger count lệch | (xem ARCH-11) | Reconcile |
| IDX-07 | **P1** | `docs/README.md:70,77` vs `:120,125` | Route param drift `:id` vs `:productId`/`:orderId` | `App.tsx` dùng `:productId`/`:orderId` | Chuẩn hoá |
| IDX-08 | P2 | `AGENTS.md:18` | Claim `tsconfig.json` exclude `src/app/**`, `server.ts`, `middleware.ts` — không tồn tại; tsconfig chỉ exclude node_modules/dist | `tsconfig.json:39-42` | Viết lại "đã gỡ; không cần exclude" |
| IDX-09 | P2 | `docs/README.md:108-110` | Master index thiếu `docs/design/taste-contract.md` và `ui-audit-2026-09.md` | `AGENTS.md:34`; `docs/tasks/README.md:29` | Thêm §3.4 |
| IDX-10 | P2 | `docs/README.md`, `AGENTS.md:96-102` | `docs/tasks/` không có trong doc map | `docs/tasks/README.md:3-5` | Thêm |
| IDX-11 | P2 | `README.md:3`; `SETUP_RUNBOOK.md:243` | Overstate mock fallback (`src/data/mockData.ts` catalogs rỗng `= []`) | `mockData.ts:49,80`; `pricingEngine.ts:126` | Qualify |
| IDX-12 | P2 | `SETUP_RUNBOOK.md:172,176,201-204` | Nhúng project ref production `<project-ref>` + JWT mẫu | Cùng file | Dùng `<project-ref>` placeholder |
| IDX-13 | P2 | `SETUP_RUNBOOK.md:219,739`; `.env.example:25` | `vcube.vn`, `vcube-red.vercel.app` chưa kiểm chứng | `vercel.json` | Đánh dấu ví dụ |
| IDX-14 | P2 | `AGENTS.md:75`; `docs/README.md:193`; `SETUP:386` | Gate a8 nhận "7 SQL files / 2 diagnostics" nhưng bỏ sót `rls_audit.sql` (thành 8) | `scripts/a8-sql-syntax-check.mjs:25-31` | Thêm file + sửa doc |
| IDX-15 | P2 | `SETUP_RUNBOOK.md §2.3` | Template `.env` thiếu `APP_URL` (có trong `.env.example:9`) | `.env.example:9` | Thêm hoặc note unused |
| IDX-16 | P2 | `docs/archive/README.md:4` | Banner canonical thiếu `docs/design/` và `docs/tasks/` | Cùng file bảng 18-28 | Bổ sung |
| IDX-17 | P2 | `README.md:9` | Claim hỗ trợ `bun`/`pnpm`; chỉ có `package-lock.json` | Repo | Nói rõ npm |

### 1.6 Design-system docs

| ID | Mức | Vị trí | Vấn đề | Bằng chứng | Cách sửa |
|---|---|---|---|---|---|
| DS-01 | **P0** | `docs/design/qa-checklist.md:55-71,162,380,413,450,470,580,601,630` | Toàn bộ §3 "Both languages (VI/EN)" + bước "Flip to EN" + U9/i18n không thực thi được (app VI-only) | `LanguageContext.tsx:452-477` (`setLanguage` ép `'vi'`); `Header.tsx` không còn switcher | Thay bằng note VI-only; xoá/chuyển các bước EN |
| DS-02 | **P1** | `docs/design/qa-checklist.md:603-619` | Nói `/lab` "(planned) not yet routed … falls to NotFound" — sai, đã route | `src/App.tsx:1854-1855,553,509,366` | Nâng thành per-page section |
| DS-03 | **P1** | `docs/design/taste-contract.md:48` | "GSAP … → `motion` (đã cài)" — không có `motion`/`framer-motion`/`gsap` | `package.json` | Gỡ claim hoặc thêm dep |
| DS-04 | **P1** | `docs/design/data-honesty.md:3-10` vs `:28,30,51` | Mâu thuẫn resolved/open: header nói đã khắc phục nhưng PC-01/MP-01 đã fix vẫn đọc như Critical hiện tại | `QuoteSummaryPanel.tsx:155-158`; `Tool3DView.tsx:213`; `mockData.ts:70,215` | Thêm cột trạng thái per-row |
| DS-05 | **P1** | `docs/design/tokens.md:386-393` | §10 gate list thiếu gate thực thi token: `check-ui-rules`, `check-icon-names`, `check-fabricated`, `check-unitprice-multiplier`, `check-error-handling` | Các script | Liệt kê đủ |
| DS-06 | **P1** | `docs/design/tokens.md:214` | Glass rule nói "chỉ 1 chỗ" + fallback `prefers-contrast`/`forced-colors`; code có 13 `backdrop-blur*`/8 file, 0 media query | 8 component liệt kê trong bằng chứng | Enforce bằng gate hoặc thu hẹp rule |
| DS-07 | P2 | `docs/design/qa-checklist.md:91,122,126-128,133,140,199,221,248,283,366,393` | Line ref `App.tsx` bên trong stale (top refs đúng) | Nhiều vị trí | Bỏ line ref tuyệt đối |
| DS-08 | P2 | `docs/design/qa-checklist.md:501` | "`DesignerDashboardView` never calls `useParams`" — sai | `DesignerDashboardView.tsx:37` | Đánh dấu resolved |
| DS-09 | P2 | `docs/design/qa-checklist.md:546` | Nhắc `AdminOrdersPanel` đã bị xoá | `src/frontend/components/admin/` | Cập nhật danh sách |
| DS-10 | P2 | `docs/design/qa-checklist.md:293-294` | Baseline "corrupt file fabricates a model"/"hardcoded SHA-256" đã fix | `Tool3DView.tsx:213` | Đánh dấu resolved |
| DS-11 | P2 | `docs/design/tokens.md:143` | ".font-mono (13px JetBrains Mono)" — `.font-mono` chỉ set family | `src/index.css:291-294` | Sửa |
| DS-12 | P2 | `docs/design/tokens.md:23-45,287-370` | Thiếu token `--color-surface-raised`, `--color-on-inverse` (có trong code, đang dùng) | `src/index.css:44,48` | Bổ sung §9 + `@theme static` |
| DS-13 | P2 | `docs/design/tokens.md:65` | "`bg-warning-tint` 83 lần / 30 file"; thật 31 file | grep | Cập nhật |
| DS-14 | P2 | `docs/design/tokens.md:193` | "1.833 chỗ `rounded-*`"; hiện ~1621 | grep | Refresh/ghi ngày đo |
| DS-15 | P2 | `docs/design/icon-map.md:308-318` | "Additional mappings" liệt kê `360` trùng với bảng chính `:145` | `iconMap.ts` | Gỡ khỏi Additional |
| DS-16 | P2 | `docs/design/icon-map.md:61` | Hướng dẫn `strokeWidth={1.5}`; wrapper mặc định `2` | `src/frontend/ui/Icon.tsx:42` | Sửa |
| DS-17 | P2 | `docs/design/ui-audit-2026-09.md:66-67` | §5 "Còn lại" lỗi thời (OCCT ~7.6MB; `/workshop/settings` đã gỡ) | `SETUP_RUNBOOK.md:54` | Đánh dấu resolved |
| DS-18 | P2 | `docs/design/ui-audit-2026-09.md:56` | §4 số liệu stale (Money/ConfirmDialog/DataTable/`<table>`; hex `#94A3B8` đã gỡ) | grep | Đánh dấu resolved |
| DS-19 | P2 | `docs/design/icon-map.md:9` | Rule "sửa cả 2 nơi" (iconMap.ts + md) không được gate enforce | `scripts/check-icon-names.mjs` | Thêm doc-sync check hoặc bỏ rule |
| DS-20 | P2 | `docs/design/qa-checklist.md:3` | "zero automated tests" trong khi có `scripts/test-catalog-sync.ts` | AGENTS.md | Sửa "no unit-test runner" |
| DS-21 | P2 | `docs/design/data-honesty.md:256-310` | §Verification trỏ `src/config/demoMode.ts`/`VITE_VCUBE_DEMO_MODE` không tồn tại | Repo | Đánh dấu proposal hoặc trỏ `check-fabricated.mjs` |

---

## 2. Việc cần phát triển (Development backlog)

Effort: **S** ≤ ~1 ngày · **M** ~2–5 ngày · **L** > 1 tuần. `(code|docs|ops|data)` = loại công việc.

### 2.1 Security / Ops / Compliance

- **[S] Rotate `SUPABASE_SECRET_KEY`** — đã lộ trong chat; `AGENTS.md:109`, `docs/security/rls-runbook.md`. Phụ thuộc Supabase dashboard. `(ops)`
- **[S] Google OAuth: bật provider hoặc gỡ nút** — cờ cứng `ENABLE_GOOGLE_OAUTH=false` (`AuthModal.tsx:22`), nút còn ở `LoginView.tsx:193`, `RegisterView.tsx:359`; bấm chỉ ra lỗi. `(code+ops)`
- **[S] Password reset: bật hoặc bỏ nhánh** — `ENABLE_PASSWORD_RESET=false` (`AuthModal.tsx:14`); `resetPasswordForEmail` đã gọi (`AuthContext.tsx:431`) nhưng không có mail/SMTP. `(code+ops)`
- **[S] Khai báo env trên Vercel** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`. `(ops)`
- **[M] Nối Edge Function `calculate-quote`** — hàm tồn tại + fail-closed (`supabase/functions/calculate-quote/index.ts:93`) nhưng **0 client invoke**; `QUOTE_SIGNING_SECRET` chưa khai. `(code+ops)`
- **[M] Tạo đơn qua Edge Function** (chống spam, ép `status`/`user_id`) — guest vẫn INSERT trực tiếp `orders`; `docs/plans/33-wave-log.md:279`. `(code)`
- **[S] Gỡ ghi `user_metadata` nhánh DEV + dọn tên env cũ `NEXT_PUBLIC_*`** — `AGENTS.md:108,109`; `SETUP_RUNBOOK.md:243`. `(code)`
- **[S] Cập nhật `rls-runbook.md` §10.6** — còn số 21 bảng + "chưa chạy production". `(docs)`
- **[P0][S] Vá `designer_profiles` public read** — xem SEC-01. `(code/DB)`
- **[P1][S] Siết policy `custom_design_requests` designer** — xem SEC-02. `(code/DB)`

### 2.2 Data / DB

- **[M] Seed dữ liệu thật/mẫu** — `scripts/seed-sample-data.mjs`; 4 bước nhập hub/máy/SKU/giá điện-lương `docs/tasks/ADMIN-MES-DATA-REMEDIATION.md §B`. `(ops/data)`
- **[M] Ghi `order_files` khi giao hàng → mở khoá tải CAD signed URL** — bảng + RLS có sẵn, **0 code đọc/ghi**; `AssetLibraryView.tsx:24` `TODO(order_files)`. `(code)`
- **[M] Bảng payout ledger + API quyết toán** — `DesignerPayoutsTab` đọc fixture rỗng `PAYOUT_TRANSACTIONS` (`mockData.ts:225`), nút rút tiền `disabled`. `(code+DB)`
- **[M] Persist `warranty_claims`** — bảng có, 0 code; form chỉ local state (`MyOrdersView.tsx:89-97`). `(code)`
- **[M] Writer/reader cho `reviews`** — RLS đã tạo, `from('reviews')` = 0; rating hiển thị `—`. Gắn review với `order_id` hoàn thành. `(code)`
- **[M/L] Đường code cho `digital_assets` / `order_items` / `cart_items`** — bảng + policy có, 0 truy vấn; library suy từ heuristic `orders.items`. `(code)`
- **[S] RFQ hết fallback localStorage** — `customDesignService.getRequests` trả local khi lỗi (`:55,64`). `(code)`
- **[S] Xoá dead service trả `[]`** — `catalogService.ts:17-32`, `pricingService.getMaterials/getPrinters` (`:34-41`). `(code)`

### 2.3 Core flows

- **[M] Write path điều phối `orders.assigned_workshop_id`** — nút "xác nhận điều phối" bị gỡ; `useProductionStore` workshops rỗng. `(code)`
- **[L] Telemetry cây máy / MES thật** — `layerProgress` nhập tay; biểu đồ hiệu suất + hao mòn cần cột DB mới. `(code+DB)`
- **[L] Payment state machine + PSP** — `awaiting_payment`/webhook; hiện chỉ ghi trạng thái chốt (`database.ts:366-369`). `(code)`
- **[M] Persist price override có audit (actor/reason/time)** — form ghi đè chỉ rewrite client + toast; PC-02. `(code)`
- **[S] `saveSettingsPatch` hỗ trợ `pricing_configs`** — hiện fail (`settingsService.ts:1014`). `(code)`
- **[M] Formula builder (admin tự dựng công thức)** — D3; `docs/plans/22-backlog-and-decisions.md:19`, `23-formula-builder-spec.md`. `(docs+code)`
- **[M] `order_events` + timeline thật, email/ZNS** — roadmap C1/D10; hiện toast-only. `(code)`
- **[S] `/lab/:tab` deep-link chọn đúng tab** — `WorkshopSettingsView` không nhận `initialTab` (B8). `(code)`
- **[S] `UserRole` thiếu `'workshop'` + `UserAvatarMenu` đưa lab vào `/admin` ⇒ 403** — B6/B7; `src/types/index.ts:811`. `(code)`

### 2.4 UI / Design system (W6 backlog — `docs/tasks/UI-CHROME-REFACTOR-PLAN.md §6`)

- **[L] Tách hook `App.tsx`** — 2119 dòng; cần `useCatalogSync`, `useRealtimeProducts`, `useFabVisibility`. `(code)`
- **[M] DataTable Tier-3** — token `--color-table-header`/`--color-row-hover`, badge trạng thái 3D + progress, tabs/filter. `(code)`
- **[L] Raw `<select>`/`<input>` → `Field`/`Select`/`Input`** — W6 B1. `(code)`
- **[L] i18n còn sót** — ~1186 nhánh `isVi ? …` trong `src/`; `ui-audit-2026-09.md:22`. `(code)`
- **[S] Header drawer mobile → `Sheet`** — W6 C1, thống nhất focus-trap a11y. `(code)`
- **[S] Lab xoá máy/vật liệu/phụ kiện → `ConfirmDialog`** — `WorkshopSettingsView.tsx`. `(code)`
- **[S] Data-honesty tồn: OG image stock / ảnh stock trong `QuoteSummaryPanel`** — verify trước khi sửa. `(code)`
- **[M] Realtime cho bảng admin sửa được** — hiện chỉ `products`, `vcube:settings`, `custom_design_requests`; roadmap C6. `(code)`
- **[S/M] Storefront hero fit viewport + `content-visibility` list dài** — cần sign-off. `(code)`

### 2.5 Growth features (planned, lower priority — `docs/plans/05-feature-roadmap.md`)

- **[M] Báo giá tải/chia sẻ (PDF + link) & khoá giá có hạn** — A2/A3. `(code)`
- **[M] Lead time theo ngày + gói Economy/Standard/Express delta giá** — A4. `(code)`
- **[M] Breakdown giá cho người mua + upsell số lượng** — A5. `(code)`
- **[M] Deposit + VietQR động + abstraction `paymentProvider`** — A6. `(code)`
- **[M] Material theo mục đích sử dụng (form `strength`/`heatResistance`/`flexibility`)** — A8. `(code+data)`
- **[S] Trang chính sách bắt buộc + badge online.gov.vn** — D1/D2. `(code+docs)`
- **[M] Coupon/voucher engine trong DB** — D5. `(code)`
- **[M] Zalo handoff + ZNS/SMS** — A7. `(code)`

---

## 3. Link & tham chiếu gãy

| ID | Vị trí | Loại | Sửa |
|---|---|---|---|
| LNK-01 | `docs/README.md:109` | 5 link tương đối `../design/*` trỏ sai (xem IDX-03) | `./design/...` |
| LNK-02 | `docs/README.md:93` | Route `/workshop/settings` không tồn tại (IDX-05) | Gỡ |
| LNK-03 | `docs/archive/README.md:4` | Banner canonical thiếu `docs/design/`, `docs/tasks/` (IDX-16) | Bổ sung |
| LNK-04 | `docs/design/data-honesty.md:256-310` | Trỏ `src/config/demoMode.ts`, `VITE_VCUBE_DEMO_MODE` không tồn tại (DS-21) | Trỏ `check-fabricated.mjs` |
| LNK-05 | `docs/design/qa-checklist.md:546` | Nhắc component đã xoá `AdminOrdersPanel` (DS-09) | Cập nhật |

**External URL cần chú ý (không fetch):**
- `docs/SETUP_RUNBOOK.md:172,201` — project ref production `https://<project-ref>.supabase.co` (IDX-12).
- `docs/SETUP_RUNBOOK.md:219,739` — `https://vcube.vn`, `https://vcube-red.vercel.app` chưa kiểm chứng (IDX-13).
- `README.md:18`, `SETUP_RUNBOOK.md:130` — `github.com/ThanhJamie/Vcube.git` (valid).
- `SETUP_RUNBOOK.md:91` — script cài NVM pin `v0.40.1` (valid).

---

## 4. Tuyên bố chưa kiểm chứng / cần nguồn

| ID | Vị trí | Nội dung | Xử lý |
|---|---|---|---|
| UNV-01 | `docs/security/rls-runbook.md §1.1,§9,§10.6` | Probe production (`9 PASS · 0 FAIL · 4 INFO`, 15/15 bảng, 2026-09-12) — không kiểm chứng được từ code | Giữ nhưng date-stamp historical |
| UNV-02 | `docs/security/rls-policies.md §5.2` | Path scheme `orders/<order_id>/...` là quy ước, không định nghĩa trong SQL | Sửa theo code (SEC-10) |
| UNV-03 | `docs/architecture/pricing-engine.md:122,141` | Density/power examples không có nguồn trong repo | Đánh dấu illustrative |
| UNV-04 | `docs/design/research-brief.md` | URL nghiên cứu & số liệu bên thứ ba | Giữ, ghi rõ nguồn ngoài |
| UNV-05 | `docs/design/tokens.md:65,193` | Số đo "83 lần/30 file", "1.833 rounded" là ảnh chụp cũ | Refresh kèm ngày |

---

## 5. Thứ tự ưu tiên đề xuất

**Đợt 1 — An toàn dữ liệu (làm ngay):**
1. SEC-01 (P0) vá `designer_profiles` public read.
2. SEC-02 (P1) siết policy `custom_design_requests`.
3. SEC-03 (P1) bỏ email hardcode trong `bootstrap_admin.sql` + mở rộng lint.
4. DS-01 (P0) dọn §3 qa-checklist VI/EN.

**Đợt 2 — Sửa lỗi docs sai sự thật (nhanh, rủi ro thấp):**
PAGE-01/02/03, DB-01/02/11/12, ARCH-01/02/03, IDX-01/02/03/04/05/07, DS-03/04/05.

**Đợt 3 — Đóng lỗ hổng tài liệu ↔ code:**
PAGE-04/09/10/11/12, SEC-04/05/06/07, DB-03..10/13, ARCH-04..17, DS-02/06/07..21, IDX-06/08..17.

**Đợt 4 — Phát triển tính năng (backlog §2):**
Ưu tiên `order_files` (mở khoá tải CAD), payout ledger, persist warranty, seed dữ liệu; sau đó W6 UI và growth.

---

## 6. Phụ lục — Những gì đã xác minh ĐÚNG (không cần sửa)

- **Schema:** 31 bảng + 1 view, 49 index (48 + 1 partial unique KYC; 2 GIN), 13 hàm thường trực
  (6 helper/RPC + 7 hàm trigger), 7 định nghĩa trigger / 27 instance, 2 bucket (`cad-files` 150 MB,
  `product-images` 10 MB), 11 bảng realtime, seed 3 singleton row.
- **RLS:** allowlist 90 policy bảng (88 áp dụng vì `pricing_config` là view) + 6 storage; `v_keep`=90,
  `v_names`=73, `v_ok`=6; trigger guard cột.
- **Migrations:** chuỗi `20260900 → 20260901 → 20261010`; `supabase/legacy/` 6 file không chạy;
  nút "Đồng Bộ DB" / `adminStorefrontService.syncToDatabase` vắng mặt; `test-catalog-sync` 5 test in-memory.
- **Stack:** React 19, Vite 6, TS 5.8, Tailwind 4, Zustand 5, react-router 7, three 0.185; **không có `motion`**.
- **Routes/guards:** route matrix + redirect legacy (`/tool-3d`, `/my-orders`, `/library`, `/creator/*`,
  `/login`, `/register`); `ProtectedRoute`/`RoleGuard`; light-only tokens.
- **Design:** iconMap 224 glyph khớp `iconMap.ts` (0 mismatch); contrast 49/60 + 11 expected;
  `check-*` đều RC=0; 86 `htmlFor`; 0 raw hex / 0 `text-[Npx]`.
- **Docs lịch sử:** `docs/plans/**` = 39 file đều SUPERSEDED; `docs/archive/` đúng.

---

## 7. Cách dùng file này

1. Mỗi mục có ID ổn định (`SEC-*`, `DB-*`, `PAGE-*`, `ARCH-*`, `IDX-*`, `DS-*`, `DEV`/backlog §2).
2. Khi sửa xong một mục: gạch ngang hoặc thêm cột `✅ <ngày>` — **không xoá ID** để giữ truy vết.
3. Gate bắt buộc sau mỗi đợt: `npm run lint`, `npm run build`, và toàn bộ `scripts/check-*.mjs` /
   `scripts/lint-rls-*.mjs` (xem `AGENTS.md §Gate bổ sung`).
4. Review lại file này mỗi khi hoàn tất một đợt; các mục P0/P1 phải về 0 trước khi coi tài liệu là "khớp hiện tại".
