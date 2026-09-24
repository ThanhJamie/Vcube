# VCUBE — Danh sách vấn đề tài liệu (đã xác minh)

> **Ngày xác minh:** 2026-09-23 (vòng 2)
> **Nguồn:** xác minh độc lập 6 subagent lại toàn bộ `docs/tasks/DOCS-REVIEW-BACKLOG.md`
> (97 mục + 5 link) bằng cách mở trực tiếp từng `file:line` doc ↔ code/migration, rồi quét vấn đề mới.
> **Quan hệ với file khác:** `DOCS-REVIEW-BACKLOG.md` giữ bằng chứng dài + backlog phát triển.
> **File này** là sổ đăng ký trạng thái hiện tại (đã kiểm chứng) + các vấn đề MỚI phát hiện.
> **Phạm vi:** `docs/README.md`, `README.md`, `AGENTS.md`, `docs/architecture/`, `docs/pages/`,
> `docs/database/`, `docs/security/`, `docs/design/`, `docs/SETUP_RUNBOOK.md`, `docs/tasks/`,
> đối chiếu `src/`, `supabase/`, `scripts/`, `package.json`.

---

## 0. Tổng hợp trạng thái

| Nhóm | Đã kiểm | CONFIRMED (còn lỗi) | PARTIAL (cần chỉnh mức/nuance) | FALSE-POSITIVE | Đã sửa trong vòng này |
|---|---|---|---|---|---|
| SEC (bảo mật/RLS) | 10 | 9 | 1 | 0 | 0 |
| DB (schema/migration) | 13 | 11 | 1 | 1 | 0 |
| PAGE (pages docs) | 19 | 15 | 4 | 0 | 0 |
| ARCH (architecture docs) | 17 | 13 | 3 | 1 | 0 |
| IDX (index/portal) | 17 | 12 | 5 | 0 | 1 |
| DS (design-system) | 21 | 18 | 3 | 0 | 0 |
| **Backlog con (97 mục)** | **97** | **78** | **17** | **2** | **1** |
| **MỚI (NEW-01…NEW-30)** | **30** | — | — | — | 0 |

> `LNK-01…LNK-05` (5 link gãy) **không cộng riêng** vào 97: LNK-01/02/03/05 trùng IDX-03/05/16 và DS-09; LNK-04 đã liệt kê trong NEW-16.

- **Còn mở cần xử lý:** 78 (CONFIRMED) + 17 (PARTIAL) + 30 (NEW) = **125 mục**.
- **Không còn đúng (bỏ khỏi backlog):** DB-02, ARCH-17.
- **Đã xử lý trong vòng này:** IDX-06 (attribution 13 hàm/7 trigger của AGENTS/README — đã sửa lại thành *baseline 7 hàm/5 trigger, cộng dồn 13/7*).
- **Quyết định đã chốt (2026-09-23):** **VI-only chính thức** → DS-01, NEW-11, NEW-28 xử lý theo hướng xoá bước EN / sửa doc, bỏ dần `isVi ?`; không làm song ngữ. Xem `DRIFT-REMEDIATION-PLAN.md §6`.

**5 việc gấp nhất:**

1. **SEC-01 (P0)** — `designer_profiles` public read làm lộ `bank_name`/`bank_account`/`tax_id`.
2. **DS-01 (P0)** — `qa-checklist.md` §3 "Both languages VI/EN" không thực thi được (app VI-only).
3. **NEW-24 (P1)** — `.env.example` thiếu toàn bộ khoá `VITE_*`/`SUPABASE_SECRET_KEY` mà README lại hướng dẫn `cp .env.example .env`.
4. **SEC-02 (P1)** — policy `custom_design_requests` mở cho mọi authenticated khi `designer_id is null`.
5. **DB-11/DB-12 (P1)** — `rls-runbook.md` mô tả trạng thái cũ (đọc role từ `user_metadata`, tạo user Google giả, "chưa chạy production").

---

## 1. Sổ đăng ký theo nhóm (đã xác minh)

### 1.1 Bảo mật / RLS (SEC)

| ID | Mức | Trạng thái | Vấn đề hiện tại | Bằng chứng đã xác minh |
|---|---|---|---|---|
| SEC-01 | **P0** | CONFIRMED | `designer_profiles` nằm trong `v_catalog_read`, policy `USING (true)` ⇒ anon đọc `bank_name`/`bank_account`/`tax_id` | `20261010_harden_rls.sql:309` + `:407-413`; cột `20260901_baseline_schema.sql:892-894` |
| SEC-02 | **P1** | CONFIRMED | Policy designer `custom_design_requests` khớp `designer_id is null` cho **mọi** authenticated ⇒ lộ `client_name`/`messages`/`reference_files` | `20261010_harden_rls.sql:749-755` |
| SEC-03 | **P1** | PARTIAL | Câu "Zero hardcoded emails…" scoped "production **migration**"; nhưng `bootstrap_admin.sql` hardcode `chithanhso10@gmail.com` và lint không quét `supabase/scripts/` | `bootstrap_admin.sql:21`; `lint-rls-sources.mjs:24-25`; `apply_all_manual.sql:3354` |
| SEC-04 | P2 | CONFIRMED | Catalog public lộ cột COGS/tồn kho (`cost_per_kg`, `acquisition_cost`, `hourly_cost`, `cost_price`, `price_per_kg`…) | `20261010_harden_rls.sql:308-311`; cột `baseline:66,92,96,114,962` |
| SEC-05 | P2 | CONFIRMED | `verify-rls.mjs` dùng biến `status` chưa định nghĩa trong `expectZero` ⇒ `ReferenceError`, phá vỡ hứa "null count = UNKNOWN" | `verify-rls.mjs:154,163` (doc `rls-policies.md:366`) |
| SEC-06 | P2 | CONFIRMED | `inspect-db.mjs` thiếu `custom_design_requests`; `apply_all_manual.sql` tự nhận "đủ 31/31" | `inspect-db.mjs:56-94`; `apply_all_manual.sql:33-35` |
| SEC-07 | **P1** | CONFIRMED | Ma trận cấp Designer/Workshop nhiều quyền orders/order_items/order_files/storage mà migration **không** cài | `rls-policies.md:96-98,121`; `20261010_harden_rls.sql:335-350,578-589,701-708,1177-1188` |
| SEC-08 | P2 | CONFIRMED | "Admin full control across all buckets"; thực tế scoped `bucket_id='cad-files'` | `rls-policies.md:173`; `harden:1167-1170` |
| SEC-09 | P2 | CONFIRMED | `setting_audit` ghi "Full Access" (thật: chỉ SELECT+INSERT); `pricing_configs` ghi "Read active" (thật: `USING (true)`) | `harden:547-552,407-409` |
| SEC-10 | P2 | CONFIRMED | Doc ghi scheme `orders/<order_id>/...`; client upload thật vào `cad/<file>` (không policy nào phủ) | `schema.md:1071`; `rls-policies.md:170`; `database.ts:288` |

### 1.2 Database & schema drift (DB)

| ID | Mức | Trạng thái | Vấn đề hiện tại | Bằng chứng đã xác minh |
|---|---|---|---|---|
| DB-01 | **P1** | CONFIRMED | Nói `total_spent`/`total_orders` bị "silently reset"; thật raise `42501` | `schema.md:1014`; `baseline:1462-1466`; `harden:841-848` |
| DB-02 | P1 | **FALSE-POSITIVE** | Doc `sec_<epoch>_<random>` **đúng**: client mint `sec_` tại `CheckoutView.tsx:155`; `database.ts:328` (`token_`) chỉ là fallback | `CheckoutView.tsx:155`; `database.ts:328` |
| DB-03 | P2 | CONFIRMED | `orders.payment_status` sai ở cả 2 chỗ, và 3-way lệch với code (`awaiting_payment\|paid\|cod\|cancelled\|unpaid`); SQL không CHECK | `schema.md:75,314`; `baseline:687`; `types/index.ts:79` |
| DB-04 | P2 | CONFIRMED | `kyc_records.status` không có CHECK (chỉ `user_profiles.kyc_status` có) | `schema.md:77,606`; `baseline:877` vs `:857` |
| DB-05 | P2 | CONFIRMED | `get_order_by_guest_token` ghi `LANGUAGE plpgsql`; thật `language sql` | `schema.md:995`; `baseline:1399` |
| DB-06 | P2 | CONFIRMED | Helper mô tả `plpgsql` + catch `undefined_table`; chuỗi cuối là `language sql`, không handler | `schema.md:977-992`; `harden:46-64,68-108` |
| DB-07 | P2 | CONFIRMED | Danh sách index `products` thiếu `idx_products_fts` (GIN thứ 2) | `schema.md:102-106`; `baseline:1205-1208` |
| DB-08 | P2 | CONFIRMED | Cột NULL `pricing_global_settings` thiếu `default_workshop_commission_percent` | `seeds-and-migrations.md:181`; `baseline:495` |
| DB-09 | P2 | CONFIRMED | `seedService.syncFromSupabase()` là "read path" nhưng **0 call site** | `seeds-and-migrations.md:202`; `seedService.ts:102` |
| DB-10 | P2 | PARTIAL | Đúng là 4 cột không phải FK, nhưng line ref sai/incomplete (ERD còn ngụ ý `workshop_partners→orders`, `app_settings→setting_audit`) | `schema.md:37,54-55`; `baseline:694,1065,1097,1134` |
| DB-11 | **P1** | CONFIRMED | Runbook nói client còn đọc role từ `user_metadata`, còn tạo user Google giả | `rls-runbook.md:143,187,200`; `AuthContext.tsx:81-94,305-336` |
| DB-12 | **P1** | CONFIRMED | Runbook tự mâu thuẫn: "chưa có schema"/"chưa chạy Postgres thật" vs "đã áp/kiểm chứng 2026-09-12", không đánh dấu historical | `rls-runbook.md:4,38,181` vs `:270,294-306` |
| DB-13 | P2 | CONFIRMED | Line refs stale (`database.ts:248-271` cho saveOrder; `AuthContext.tsx:67-80`) | `rls-runbook.md:143,152`; `database.ts:308-389` |

### 1.3 Pages docs (PAGE)

| ID | Mức | Trạng thái | Vấn đề hiện tại | Bằng chứng đã xác minh |
|---|---|---|---|---|
| PAGE-01 | **P1** | CONFIRMED | "no `order_items` table" — bảng có thật (chỉ unwired) | `customer-checkout.md:157,122`; `baseline:1131` |
| PAGE-02 | **P1** | CONFIRMED | "no `warranty_claims` table" — bảng có thật | `customer-checkout.md:225`; `baseline:439` |
| PAGE-03 | **P1** | CONFIRMED | "no `order_files` table" — bảng có thật, 0 code đọc/ghi | `customer-checkout.md:244`; `baseline:457` |
| PAGE-04 | **P1** | CONFIRMED | MyOrders "filterable history" nhưng non-admin không bao giờ load DB | `customer-checkout.md:16`; `App.tsx:911`; `orderService.ts:46` |
| PAGE-05 | **P1** | CONFIRMED | Payout History "fed by fixture" nhưng fixture rỗng ⇒ luôn empty | `designer-workshop-portals.md:82`; `mockData.ts:225`; `DesignerPayoutsTab.tsx:105-113` |
| PAGE-06 | **P1** | CONFIRMED | Brief claim material+infill+nozzle; modal chỉ submit material | `designer-workshop-portals.md:73`; `CustomIdeaRequestModal.tsx:134-136`; `DesignerRequestsTab.tsx:377-384` |
| PAGE-07 | P2 | CONFIRMED | "no LTV/order-count column"; code có `total_spent`/`total_orders` | `admin-portal.md:90`; `Group3CustomersPanel.tsx:372-383,532-542` |
| PAGE-08 | P2 | PARTIAL | "no payout table/ledger" tuyệt đối; cột payout có trên `orders`/`order_items` (chỉ thiếu bảng request) | `admin-portal.md:83`; `baseline:735-742,1147-1148` |
| PAGE-09 | P2 | PARTIAL | Dispatcher mô tả như có match; `workshops` hardcode rỗng nên không bao giờ match | `admin-portal.md:142`; `useProductionStore.ts` `INITIAL_WORKSHOP_NODES=[]`; `Group5ProductionPanel.tsx:878` |
| PAGE-10 | **P1** | CONFIRMED | "no write path for assigned_workshop_id" — write path tồn tại, chỉ thiếu caller UI | `admin-portal.md:142`; `database.ts:319,376`; `orderService.ts:37` |
| PAGE-11 | **P1** | CONFIRMED | Pipeline status 4 bước nhưng UI chỉ ghi `quoted`; `updateStatus` 0 caller | `designer-workshop-portals.md:75`; `customDesignService.ts:197`; `DesignerRequestsTab.tsx:156` |
| PAGE-12 | **P1** | PARTIAL | Doc đã nói metrics `—`/không extraction, nhưng UI vẫn quảng cáo "tự động quét lưới" + hardcode `PETG/Nylon-CF` | `DesignerUploadWizardTab.tsx:189-192,278-281` |
| PAGE-13 | P2 | CONFIRMED | Group1 thêm material in-memory; KPI hardcode `—` | `admin-portal.md:65`; `Group1WorkshopsPanel.tsx:493,806` |
| PAGE-14 | P2 | CONFIRMED | `/tracking` "carrier integration" nhưng order luôn carrier rỗng | `customer-checkout.md:15`; `CheckoutView.tsx:185-188`; `OrderTrackingView.tsx:538,544` |
| PAGE-15 | P2 | CONFIRMED | Mâu thuẫn NDA giữa storefront và checkout; NDA chỉ là `customer_profiles.nda_signed` | `storefront.md:72`; `customer-checkout.md:153`; `Group3CustomersPanel.tsx:247` |
| PAGE-16 | P2 | CONFIRMED | Hai định nghĩa "8 nấc" khác nhau (`KANBAN_STAGES` vs `MES_PIPELINE_STAGES`) | `admin-portal.md:138`; `designer-workshop-portals.md:94`; `useProductionStore.ts:27-132`; `OrderProgress.tsx:13-22` |
| PAGE-17 | P2 | CONFIRMED | Chỉ ghi `published/draft`; tạo mới luôn `Published`, edit có `archived` | `admin-portal.md:145`; `AdminProductsPanel.tsx:180,347-349,560-569` |
| PAGE-18 | P2 | CONFIRMED | `/order-success`,`/tracking` chỉ resolve từ in-memory; reload mất (không nêu limitation) | `customer-checkout.md:14-15`; `App.tsx:267-270,911` |
| PAGE-19 | P2 | PARTIAL | Royalty note cho digital luôn `—` (percent chỉ ở physical) — doc không nêu | `designer-workshop-portals.md:68`; `DesignerUploadWizardTab.tsx:450-453,471-482` |

### 1.4 Architecture docs (ARCH)

| ID | Mức | Trạng thái | Vấn đề hiện tại | Bằng chứng đã xác minh |
|---|---|---|---|---|
| ARCH-01 | **P1** | CONFIRMED | §3.5 split sai (platform là residual, digital 90% gross, workshop = cost + 80% rush + 100% personalization); hàm **0 caller** | `pricing-engine.md:243-246`; `pricingEngine.ts:1020-1036,974` |
| ARCH-02 | **P1** | CONFIRMED | Diagram nói royalty = `RawSellingPrice × DesignerRoyalty%`; code trả 90% gross | `pricing-engine.md:216`; `pricingEngine.ts:1022` |
| ARCH-03 | **P1** | CONFIRMED | Claim orders realtime; `App.tsx` chỉ mở `public:products` | `system-overview.md:429`; `App.tsx:819-820` |
| ARCH-04 | P2 | CONFIRMED | Thiếu channel thật `public:custom_design_requests` | `system-overview.md:427`; `customDesignService.ts:306` |
| ARCH-05 | P2 | CONFIRMED | Mâu thuẫn nội bộ: áp fee trên `RawSellingPrice` vs `FinalSellingPriceRounded` | `pricing-engine.md:214-217` vs `:243-246` |
| ARCH-06 | P2 | PARTIAL | Constants hardcode (`0.22/0.78`, `V×3.8`, `(extruders-1)*85`, thin-wall 0.8) — doc có "(e.g.)" nhưng `*85` không nhắc; line `:429` vượt phạm vi file | `printEstimate.ts:69,88`; `pricingEngine.ts:469,689` |
| ARCH-07 | P2 | PARTIAL | Các ngưỡng **đã được doc ghi** (`2 MB`, `60000`, `1.2M`, `64 samples`, `4 parts`); chỉ timeout 30s là chưa ghi | `3d-cad-pipeline.md:27,318,424,428`; `meshParser.ts:1383` |
| ARCH-08 | P2 | CONFIRMED | Thiếu doc cho `generateDeliveryPackages`, `comparePrintersForModel`, `calculateManualInkiriEstimate` (đều có caller) | `pricingEngine.ts:736,822,883`; `QuoteSummaryPanel.tsx:255,278`; `WorkshopEstimatorBOM.tsx:175` |
| ARCH-09 | P2 | CONFIRMED | Hardening không được nhắc tạo/recreate 4 trigger | `system-overview.md:145-146`; `harden:860,912,991,1078` |
| ARCH-10 | P2 | CONFIRMED | "90 table policies" thiếu caveat 88 hiệu lực | `system-overview.md:44,146`; `harden:523-527,1088-1106` |
| ARCH-11 | P2 | CONFIRMED | Baseline ghi "5 triggers" (đúng cho file baseline) nhưng thiếu phần harden +2 ⇒ 7 | `system-overview.md:145`; `baseline:1442,1475,1511,1537,1617` |
| ARCH-12 | P2 | PARTIAL | Density/power examples vẫn đọc như thật; catalog rỗng | `pricing-engine.md:122,141`; `mockData.ts:49,80` |
| ARCH-13 | P2 | CONFIRMED | Diagram vẽ "Shared Buffers" từ client vào Supabase (thật là main↔worker) | `system-overview.md:37`; `meshParser.ts:1420`; `cadParser.worker.ts:239` |
| ARCH-14 | P2 | CONFIRMED | `cad-files (Authenticated)` sai — bucket private scoped | `system-overview.md:46`; `harden:1169-1245`; `assetService.ts:6-10` |
| ARCH-15 | P2 | CONFIRMED | Thiếu `unhandledrejection` | `system-overview.md:215`; `main.tsx:28` |
| ARCH-16 | P2 | CONFIRMED | Thiếu RPC guest token + idempotency `payment_transactions` | `system-overview.md:391-425`; `database.ts:450-480,797-825` |
| ARCH-17 | P2 | **FALSE-POSITIVE** | Doc không hề chứa field chết `difficultMaterialExtraPercent` (chỉ dùng `failureExtraPercent`) | `pricing-engine.md:197` |

### 1.5 Index / portal / link (IDX, LNK)

| ID | Mức | Trạng thái | Vấn đề hiện tại | Bằng chứng đã xác minh |
|---|---|---|---|---|
| IDX-01 | **P1** | CONFIRMED | `AGENTS.md` repo path sai `/home/thanh/projects/Vcube` | `AGENTS.md:7,9-14`; `pwd` = `/home/thanh/home/thanh/project/Vcube` |
| IDX-02 | **P1** | CONFIRMED | Liệt kê `motion` trong stack; package.json không có | `AGENTS.md:18`; `package.json:13-28` |
| IDX-03 | **P1** | CONFIRMED | 5 link design chết `../design/*` | `docs/README.md:109` |
| IDX-04 | **P1** | CONFIRMED | Bảng gate "mirrors full local set" thiếu `check-error-handling` (+ `test-catalog-sync`) | `docs/README.md:183,187-199`; `AGENTS.md:78` |
| IDX-05 | **P1** | CONFIRMED | Route `/workshop/settings` không tồn tại | `docs/README.md:93`; `App.tsx:1854-1855` |
| IDX-06 | P1 | **ĐÃ SỬA 2026-09-23** | AGENTS/README gán 13 hàm/7 trigger cho riêng baseline (thật: baseline 7 hàm/5 trigger; cộng dồn 13/7) | sửa `AGENTS.md:57`, `README.md:45` |
| IDX-07 | **P1** | CONFIRMED | Route param drift `:id` vs `:productId`/`:orderId` | `docs/README.md:70,77`; `App.tsx:1580,1677` |
| IDX-08 | P2 | CONFIRMED | Claim tsconfig exclude `src/app/**`/`server.ts`/`middleware.ts` (không tồn tại) | `AGENTS.md:18`; `tsconfig.json:39-42` |
| IDX-09 | P2 | PARTIAL | §3.4 có nhưng thiếu `taste-contract.md` + `ui-audit-2026-09.md` | `docs/README.md:108-111` |
| IDX-10 | P2 | PARTIAL | `docs/tasks/` nay có trong docs/README nhưng `AGENTS.md` doc map vẫn thiếu | `docs/README.md:110`; `AGENTS.md:96-102` |
| IDX-11 | P2 | PARTIAL | SETUP overstate mock fixtures (catalog `= []`); citation `README.md:3` là sai | `SETUP_RUNBOOK.md:243`; `mockData.ts:49,60,80` |
| IDX-12 | P2 | CONFIRMED | Nhúng project ref production + JWT mẫu | `SETUP_RUNBOOK.md:172,176,187,201` |
| IDX-13 | P2 | PARTIAL | `vcube.vn` đã qualified "(e.g.)"; `.env.example` nêu `vcube-red.vercel.app` như thật | `SETUP_RUNBOOK.md:219`; `.env.example:25` |
| IDX-14 | P2 | CONFIRMED | a8 gate "7 SQL files" nhưng `rls_audit.sql` tồn tại ⇒ 8 | `a8-sql-syntax-check.mjs:24-32`; `AGENTS.md:75`; `docs/README.md:194`; `SETUP:386,431` |
| IDX-15 | P2 | CONFIRMED | Template `.env` thiếu `APP_URL` | `SETUP_RUNBOOK.md:163-211`; `.env.example:9` |
| IDX-16 | P2 | CONFIRMED | Banner archive thiếu `docs/design/` + `docs/tasks/` | `docs/archive/README.md:4` |
| IDX-17 | P2 | PARTIAL | README nói hỗ trợ `bun`/`pnpm`; `bun.lock` có (git-tracked), pnpm không | `README.md:9`; `bun.lock` |
| LNK-01 | **P1** | CONFIRMED | Trùng IDX-03 (5 link chết) | `docs/README.md:109` |
| LNK-02 | **P1** | CONFIRMED | Trùng IDX-05 (`/workshop/settings`) | `docs/README.md:93` |
| LNK-03 | P2 | CONFIRMED | Trùng IDX-16 (banner archive) | `docs/archive/README.md:4` |
| LNK-04 | P2 | CONFIRMED | Trỏ `src/config/demoMode.ts` + `VITE_VCUBE_DEMO_MODE` không tồn tại | `data-honesty.md:230,260,308` |
| LNK-05 | P2 | CONFIRMED | Nhắc `AdminOrdersPanel` đã xoá, mâu thuẫn nội bộ `:543` vs `:546` | `qa-checklist.md:543,546` |

### 1.6 Design-system (DS)

| ID | Mức | Trạng thái | Vấn đề hiện tại | Bằng chứng đã xác minh |
|---|---|---|---|---|
| DS-01 | **P0** | CONFIRMED | §3 "Both languages VI/EN" + bước "Flip to EN" + U9/i18n không thực thi được (app VI-only) | `qa-checklist.md:55-71,162,380,413,450,470,580,601,630`; `LanguageContext.tsx:468-469` |
| DS-02 | **P1** | CONFIRMED | Nói `/lab` "(planned) … falls to NotFound" — sai, đã route; còn nói "no home route" | `qa-checklist.md:603-605`; `App.tsx:1854-1855` |
| DS-03 | **P1** | CONFIRMED | "`motion` (đã cài)" — không có `motion`/`framer-motion`/`gsap` | `taste-contract.md:48`; `package.json` |
| DS-04 | P1 | PARTIAL | Banner "AUDIT SNAPSHOT" đã có; nhưng row PC-01/MP-01 đã fix vẫn đọc như Critical hiện tại (thiếu cột trạng thái) | `data-honesty.md:3-10,28,30,51`; `QuoteSummaryPanel.tsx:155-158` |
| DS-05 | **P1** | CONFIRMED | §10 gate list thiếu `check-ui-rules`, `check-icon-names`, `check-fabricated`, `check-unitprice-multiplier`, `check-error-handling` | `tokens.md:386-393` |
| DS-06 | **P1** | CONFIRMED | Glass rule "chỉ 1 chỗ" + fallback `prefers-contrast`/`forced-colors`; code 13 `backdrop-blur`/8 file, 0 media query | `tokens.md:214`; `index.css` |
| DS-07 | P2 | CONFIRMED | Line ref `App.tsx` bên trong stale (top refs đúng) | `qa-checklist.md:91,122,…`; `App.tsx:1127` |
| DS-08 | P2 | CONFIRMED | "`DesignerDashboardView` never calls `useParams`" — sai | `qa-checklist.md:501`; `DesignerDashboardView.tsx:37` |
| DS-09 | P2 | CONFIRMED | Nhắc `AdminOrdersPanel` đã xoá | `qa-checklist.md:546` |
| DS-10 | P2 | CONFIRMED | Baseline "fabricates a model"/"hardcoded SHA-256" đã fix | `qa-checklist.md:293-294`; `Tool3DView.tsx:213` |
| DS-11 | P2 | CONFIRMED | ".font-mono (13px)" — `.font-mono` chỉ set family | `tokens.md:143`; `index.css:291-292` |
| DS-12 | P2 | CONFIRMED | Thiếu token `--color-surface-raised`, `--color-on-inverse` | `tokens.md`; `index.css:44,48` |
| DS-13 | P2 | CONFIRMED | "83 lần / 30 file"; thật 83/31 file | `tokens.md:65` |
| DS-14 | P2 | CONFIRMED | "1.833 chỗ rounded"; thật ~1648 | `tokens.md:193` |
| DS-15 | P2 | CONFIRMED | `360` trùng ở main table và "Additional mappings" | `icon-map.md:145,318` |
| DS-16 | P2 | CONFIRMED | Hướng dẫn `strokeWidth={1.5}`; wrapper mặc định `2` | `icon-map.md:61`; `Icon.tsx:42` |
| DS-17 | P2 | PARTIAL | OCCT đã đúng (~7.6 MB); `/workshop/settings` vẫn còn trong docs/README (xem IDX-05) | `ui-audit-2026-09.md:66-67` |
| DS-18 | P2 | CONFIRMED (moot) | Số liệu §4 stale; doc đã là snapshot có ngày | `ui-audit-2026-09.md:51-56` |
| DS-19 | P2 | CONFIRMED | Rule "sửa cả 2 nơi" không được gate enforce | `icon-map.md:9`; `check-icon-names.mjs:111` |
| DS-20 | P2 | CONFIRMED | "zero automated tests"; có `scripts/test-catalog-sync.ts` | `qa-checklist.md:3` |
| DS-21 | P2 | PARTIAL | §Demo proposal có nhãn, nhưng §Verification viết như chạy được + trỏ module không tồn tại | `data-honesty.md:230,260,295,308` |

---

## 2. Vấn đề MỚI (chưa từng list)

### 2.1 Bảo mật / DB / pages

- **NEW-01 [P2]** `rls-policies.md:56-70` trình bày `current_app_role()` là PL/pgSQL có handler `undefined_table`; chuỗi cuối là `LANGUAGE sql` không handler. Evidence: `harden:46-64,68-70`.
- **NEW-02 [P2]** `schema.md:73-76` liệt kê `orders.status` (8 giá trị), `status_stage_index` 0-7, payout status như có CHECK; DDL không có CHECK nào. Evidence: `baseline:677-687,332-333`. (Mở rộng DB-03 vốn chỉ nói `payment_status`.)
- **NEW-03 [P2]** Scheme storage bỏ sót prefix upload thật `cad/`, và `cad/` không khớp policy nào. Evidence: `schema.md:1070-1071`; `harden:1221-1228`; `database.ts:288`. (Mở rộng SEC-10.)
- **NEW-04 [P2]** `storefront.md:165` ghi `/products/:id`, thật `/products/:productId` (bảng cùng file `:13` lại đúng). Evidence: `App.tsx:1580`.
- **NEW-05 [P2]** `storefront.md:242` nói tab Reviews chỉ hiện "when a real rating exists"; nút tab render vô điều kiện (chỉ nội dung gated). Evidence: `ProductDetailView.tsx:483-497,137`.
- **NEW-06 [P2]** `admin-portal.md:23` credit `AdminProductsPanel` "pricing overrides" — không có control override nào. Evidence: 0 grep `override` trong `AdminProductsPanel.tsx`.
- **NEW-07 [P2]** `admin-portal.md:145` chỉ nêu `published/draft`; code có 3 bộ từ vựng status khác nhau (`published/draft/archived`, `Published/Out of Stock/Under Review`, create hardcode `Published`). Evidence: `AdminProductsPanel.tsx:180,347-349,560-569`.
- **NEW-08 [P2]** `designer-workshop-portals.md:56` nói wizard không extraction nhưng UI vẫn quảng cáo "tự động quét lưới/kiểm tra kín nước" và hardcode `PETG/Nylon-CF`. Evidence: `DesignerUploadWizardTab.tsx:189-192,278-281`. (Mở rộng PAGE-12.)

### 2.2 Architecture

- **NEW-09 [P2]** `system-overview.md:54` lặp lại claim tsconfig exclude cây Next đã xoá. Evidence: `tsconfig.json:39-42`. (Trùng nội dung IDX-08, khác file.)
- **NEW-10 [P2]** `3d-cad-pipeline.md:102` nói `CadQuickViewModal` có "Dual CTA ('Đặt In 3D' hoặc 'Tải Tệp CAD')"; thật là "Đặt In 3D"/"Thêm File CAD Vào Giỏ"/"Tùy Biến". Evidence: `CadQuickViewModal.tsx:492-515`.
- **NEW-11 [P2]** `system-overview.md:197` bootstrap nói "Load active locale ('vi' | 'en')" mâu thuẫn VI-only ở §6. Evidence: `LanguageContext.tsx:455,468-477`.
- **NEW-12 [P2]** `system-overview.md:413-414` danh sách mappers thiếu `rowToOrderForSync` và `rowToCustomDesignRequest`. Evidence: `mappers.ts:389,596`.
- **NEW-13 [P2]** `system-overview.md:420` nói client dùng `VITE_SUPABASE_PUBLISHABLE_KEY`; code đọc `NEXT_PUBLIC_*` (Vite map `VITE_*` → define). Evidence: `client.ts:6-7`; `vite.config.ts:20-24`.

### 2.3 Index / contradiction

- **NEW-14 [P1] [KONTRA]** docs/README + AGENTS/README cần ghi caveat "2 policy `pricing_config` bị bỏ ⇒ 88 hiệu lực" ở các chỗ còn thiếu (`system-overview.md:45,146`). Evidence: `AGENTS.md:58`.
- **NEW-15 [P2] [KONTRA]** `rls_audit.sql` khiến a8 gate quét 8 file, nhưng AGENTS/docs/README/SETUP ghi 7. Evidence: `a8-sql-syntax-check.mjs:24-32`; `supabase/diagnostics/rls_audit.sql`. (Trùng IDX-14.)
- **NEW-16 [LINK]** Danh sách link chết bổ sung (target không tồn tại):
  `data-honesty.md:45,56,57,97-121` → `src/ai/services/modelAnalysisService.ts`, `src/app/api/ai/analyze/route.ts`, `tool3d/InstantQuoteWidget.tsx`, `quoteVerifier.ts`, `useAdminOverviewStore.ts`, `AdminOverviewPanel.tsx`, `AdminUsersPanel.tsx`, `DesignerSettingsView.tsx`;
  `icon-map.md:79,334-367` → `src/app/auth/login|register/page.tsx`, `AdminOverviewPanel.tsx`, `AdminPartnersPanel.tsx`, `InstantQuoteWidget.tsx`, `AdminUsersPanel.tsx`;
  `ui-audit-2026-09.md:63,64` → `src/backend/supabase/admin.ts`, `docs/plans/00–07`;
  `tasks/UI-CHROME-REFACTOR-PLAN.md:145` → `src/frontend/theme/ThemeProvider.tsx`;
  `seeds-and-migrations.md:192` → `src/data/mockData` (thiếu `.ts`);
  `AGENTS.md:18` → `src/backend/supabase/server.ts` (văn xuôi).
  **Lưu ý:** hầu hết nằm trong doc đã đánh dấu snapshot/historical; chỉ cần thêm nhãn hoặc sửa path.

### 2.4 Design

- **NEW-17 [P2]** `icon-map.md:13` câu tự mâu thuẫn: "so only these canonical names work: … `Storefront` are not exported any more" (vế sau liệt kê alias đã bỏ).
- **NEW-18 [P2]** `icon-map.md:37` map `text-xs` → 14px, nhưng `--text-xs: 12px`. Evidence: `index.css:126`; `tokens.md:132`.
- **NEW-19 [P2]** `icon-map.md:79` claim "`src/app/**` excluded by `tsconfig.json` (line 46)"; tsconfig chỉ 43 dòng, không có exclude đó. Evidence: `tsconfig.json:39-43`.
- **NEW-20 [P2]** `icon-map.md:57` còn note size 24px gắn với class Material Symbols đã yêu cầu xoá (`:80`).
- **NEW-21 [P2]** `ui-audit-2026-09.md:53` "24 overlay `backdrop-blur`"; thật 13/8 file. Evidence: `tokens.md:214`.
- **NEW-22 [P2]** `ui-audit-2026-09.md:55` nói hex `#94A3B8` ở `PersonalizeView.tsx:18`; dòng đó nay là comment, grep hex = 0. Evidence: `PersonalizeView.tsx:19`.
- **NEW-23 [P2]** `taste-contract.md:3` ghi "ACTIVE (2026-09)" nhưng §4 dựa trên `motion` không tồn tại. Evidence: `taste-contract.md:3,48`. (Mở rộng DS-03.)

### 2.5 Dev / cấu hình / nguồn sự thật

- **NEW-24 [P1]** `.env.example:1-31` **thiếu mọi khoá bắt buộc** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`, `SUPABASE_SECRET_KEY`); chỉ có `NEXT_PUBLIC_*`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `APP_URL`. `README.md:28` hướng dẫn `cp .env.example .env` ⇒ dẫn tới chạy mock. Mâu thuẫn `SETUP_RUNBOOK.md:172-186`. Evidence: `.env.example`; `vite.config.ts:16-18`; `README.md:28`.
- **NEW-25 [P1]** `qa-checklist.md:133,412,743` "zero `prefers-reduced-motion` handling" — sai: có global `@media (prefers-reduced-motion: reduce)` + ~20 file dùng `motion-reduce:animate-none`. Evidence: `index.css:507-511`; `ScrollToTop.tsx:12-17`.
- **NEW-26 [P2]** `bun.lock` còn pin `motion`/`framer-motion` không có trong `package.json` ⇒ nguồn gốc khiến docs nói "motion đã cài". Evidence: `bun.lock:19,716`; `package.json:13-28`.
- **NEW-27 [P2]** `package.json` khai `vite` trùng ở `dependencies` và `devDependencies`. Evidence: `package.json:26,40`.
- **NEW-28 [P2]** Backlog §2.4 ghi "~395 nhánh `isVi ?`"; thật ~**1186** trong `src`. Evidence: grep.
- **NEW-29 [P2]** Comment trong `src` mâu thuẫn schema (cùng lớp PAGE-01/02/03): `AssetLibraryView.tsx:20` "Không có bảng `order_files`"; `MyOrdersView.tsx:89-90` "chưa có bảng `warranty_claims`" — cả hai đều tồn tại. Evidence: `baseline:457,439`.
- **NEW-30 [P2]** `system-overview.md:154-160` gate list thiếu `check-contrast-combos.mjs` (và không nhắc `gen-apply-all.mjs`, `seed-sample-data.mjs`, `loop-audit.mjs`). Evidence: `scripts/`.

---

## 3. Mục đã đóng (không cần xử lý)

| ID | Lý do |
|---|---|
| DB-02 | FALSE-POSITIVE — doc `sec_` đúng; client mint tại `CheckoutView.tsx:155`. |
| ARCH-17 | FALSE-POSITIVE — doc không chứa field chết. |
| IDX-06 | Đã sửa attribution 13 hàm/7 trigger (baseline 7/5; cộng dồn 13/7). |
| Dev §2.3 "`/lab/:tab` deep-link" | ALREADY-FIXED — `WorkshopSettingsView.tsx:171-173` dùng `useParams` làm nguồn sự thật. |
| DS-18 · phần lớn DS-04/17/21 | Moot vì doc đã là snapshot có banner/ngày; chỉ giữ phần forward-facing (DS-01/02/03/05/06/12/19). |

---

## 4. Trạng thái backlog phát triển (§2 của DOCS-REVIEW-BACKLOG)

Đã mở từng file xác minh — **tất cả CONFIRMED** trừ các ngoại lệ:

| Item | Trạng thái | Ghi chú |
|---|---|---|
| Rotate `SUPABASE_SECRET_KEY`, khai env Vercel | UNVERIFIABLE (ops) | Không có artifact trong repo |
| Ghi `order_files` mở khoá tải CAD | CONFIRMED | `AssetLibraryView.tsx:24,239` TODO; baseline có bảng |
| Payout ledger, persist warranty, writer `reviews`, code cho `digital_assets`/`order_items`/`cart_items` | CONFIRMED | Bảng/policy có, 0 truy vấn |
| Google OAuth & password reset | CONFIRMED | `AuthModal.tsx:14,22` cờ `false` |
| Edge Fn `calculate-quote` chưa nối | CONFIRMED | 0 client invoke; secret chưa khai |
| Dispatcher `assigned_workshop_id` | PARTIAL | Write path có, thiếu caller UI |
| i18n còn sót | PARTIAL | Thực tế ~1186 nhánh `isVi ?` (xem NEW-28) |
| `/lab/:tab` deep-link | ALREADY-FIXED | xem §3 |
| Growth A2–A8/D1–D5, formula builder, payment PSP, MES telemetry | CONFIRMED | Chưa có code |

---

## 5. Đề xuất hành động

**Đợt 1 — An toàn dữ liệu + cấu hình (làm ngay):**
SEC-01, SEC-02, NEW-24 (.env.example), SEC-03, DS-01.

**Đợt 2 — Sửa lỗi docs sai sự thật:**
PAGE-01/02/03, DB-01/03/05/11/12, ARCH-01/02/03, IDX-01/02/03/04/05/07, NEW-04/05/06/07/08/09/10/11, SEC-07/08/09, DS-02/03/05.

**Đợt 3 — Đóng nốt drift tài liệu ↔ code:**
DB-04/06/07/08/09/13, ARCH-04..16, IDX-08..17, DS-06..21, NEW-01/02/03/12/13/14/15/16/17..23, NEW-25..30.

**Đợt 4 — Backlog phát triển (§4 + §2 backlog):**
`order_files` → CAD download; payout ledger; persist warranty/reviews; seed dữ liệu; sau đó W6 UI và growth.

---

## 6. Cách dùng

1. ID ổn định: `SEC-*`, `DB-*`, `PAGE-*`, `ARCH-*`, `IDX-*`, `LNK-*`, `DS-*`, `NEW-*`.
2. Khi xử lý xong: đổi `Trạng thái` sang `✅ <ngày>` (không xoá ID) để giữ truy vết.
3. Gate bắt buộc sau mỗi đợt: `npm run lint`, `npm run build`, và toàn bộ `scripts/check-*.mjs` + `scripts/lint-rls-*.mjs` (`AGENTS.md §Gate bổ sung`).
4. Mục P0/P1 phải về 0 trước khi coi tài liệu là "khớp hiện tại"; review lại file này mỗi đợt.
