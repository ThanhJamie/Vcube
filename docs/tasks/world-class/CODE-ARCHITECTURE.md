<!-- doc-meta: status=active; verified=2026-10-23; owner=admin -->
# CODE-ARCHITECTURE — Kế hoạch clean-code & cấu trúc để **mở rộng tính năng** bền vững

> **Work item:** `task-48` · **Agent:** `admin` · **Ngày:** 2026-10-23
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `579ef55`
> **Chế độ:** plan-only — **read-only `src/**`**, không commit/push. Deliverable: file này + handoff
> `docs/tasks/optimization/handoff/code-architecture.md`.
>
> **Định hướng:** không phải “dọn cho đẹp”, mà là **hạ nợ kiến trúc theo ROI để thêm feature nhanh và an toàn**.
> Mọi số đo dưới đây **đo thật trên HEAD `579ef55`** (lệnh tái lập ở §11); số effort là **ước lượng** và ghi rõ.
> Bối cảnh nghiệp vụ: `docs/tasks/world-class/PLAN.md` v2 (full-flow trước, 3rd-party sau) — plan này phục vụ FL-2→FL-7
> và các feature sau đó, **không thay đổi định hướng sản phẩm**.

---

## 0. TL;DR (1 phút đọc)

- **Nợ số 1:** các flow tiền (`confirmManualPayment`, tạo đơn + items + payment + files) đang **client-side nhiều bước + compensation**; không có transaction server ⇒ mọi feature ví/payout/refund/gateway sau này đều phải viết bù trừ bằng tay. Đây là lý do ưu tiên **server boundary (Postgres RPC)** dù FL-7 còn xa.
- **Nợ số 2:** **không có CI + không có luật phụ thuộc**; 19 gate chạy tay. Feature commit FL-1 vừa rồi chạm **18 file / 3.211 dòng** ở 7 tầng (backend service, database, mappers, types, 4 màn UI, route, test) — blast radius đúng như nợ.
- **Nợ số 3:** UI **gọi thẳng tầng DB/backend**: 20 file frontend import `backend/supabase`, **41 call `dbService.*`** trong frontend, 30 import trực tiếp `backend/services` — thêm feature phải sửa nhiều nơi, test phụ thuộc DB.
- **Nợ số 4:** `src/types/index.ts` **988 dòng / 41 export** trộn 12+ domain; `orderRecords.ts` mới tách *ad-hoc* chính vì xung đột file; **142 `: any` + 60 `as any`**.
- **Nợ số 5:** **21 file >800 dòng** (max `meshParser.ts` 1.878), kể cả primitive `ui/DataTable.tsx` 854; 35 file >600; views 11.754 dòng. Kèm **test pyramid lệch**: 105 unit, 0 component, 1 e2e script ngoài CI.
- **Cấu trúc đích:** feature-sliced quanh 10 domain (`catalog`, `product-detail`, `personalize`, `quote`, `checkout`, `orders`, `designer`, `workshop`, `admin`, `account`) + `shared/{ui,lib,types,config,telemetry}` + `backend/{domain,repositories,integrations,rpc}`; **feature → shared/backend** (không feature↔feature), UI **không** chạm Supabase; mọi thao tác ghi nhiều bảng đi qua **RPC atomic**.
- **Lộ trình:** CA-0 guardrails/CI (≈3 ngày) → CA-1 tách types/contract (≈5) → CA-2 feature folders (≈7) → CA-3 server boundary (≈6) → CA-4 dọn god-file + inline DB (≈9) → CA-5 hardening (≈6). Tổng **≈36 dev-day** (~7 tuần 1 dev, ~4 tuần 2 dev), chạy **≤20% capacity** song song feature.
- **Làm ngay 2 tuần:** CI offline + 4 guard script (import-boundary, max-lines, any-budget, no-supabase-in-UI), tách types theo domain, viết RPC `create_order_atomic` + `confirm_manual_payment_atomic` sau adapter `OrderGateway` (feature flag).

---

## 1. Snapshot hiện trạng (đo trên HEAD `579ef55`)

| Nhóm | Số đo | Ghi chú |
|---|---:|---|
| File TS/TSX trong `src/` | **212** | `find src -name '*.ts*'` |
| Tổng LOC `src/` | **68.817** | gồm comment/type |
| File >800 LOC | **21** | >600: **35**, >500: **42** |
| File lớn nhất | `src/utils/meshParser.ts` **1.878** | kế: Explore 1.435, Home 1.432, OnboardingWizard 1.425, Group5 1.259, Group3 1.214, Personalize 1.159, PDP 1.102 |
| `src/frontend/views` | **11.754** dòng / **16 view** | view lớn nhất 1.435 |
| `src/frontend/components` | **35.505** dòng; `admin/` **15.340** (35 file), `tool3d/` 6.885 (22 file) | |
| `src/types/index.ts` | **988** dòng / **41 export** interface+type | + `orderRecords.ts` 131 dòng / 9 export (mới tách FL-1) |
| `: any` | **142** | FE **75**, BE **64**, utils 1, workers 1, types 2; top `database.ts` 24 |
| `as any` | **60** | FE 44 / BE 13 |
| `dbService.*` trong frontend | **41 call / 12 file** | top `useCatalogData` 14 |
| File frontend import `backend/supabase` | **20** | hooks 4, admin panels 6, stores 3, views 4, context 2, components khác 1 |
| File frontend import `backend/services` | **31 file** (35 import line) | WorkshopSettings* (9), designer (5), admin (4), checkout/order (2)… |
| Supabase client dùng trực tiếp trong frontend | **4 file / 13 call** | `AuthContext` 10 (auth boundary), 2 store, 1 hook |
| Dependency graph `src/` | **212 node / 737 cạnh / vòng lặp = 0** | tốt: **đã 0 cycle**, cần gate giữ 0 |
| Cạnh liên tầng đáng chú ý | `components→ui` 86 · `views→components` 58 · `components→types` 54 · `components→lib` 43 · **`components→backend/services` 25** · `components→backend/supabase` 7 · `hooks→backend/supabase` 6 · `views→backend/services` 4 | UI→backend là vi phạm cần đóng |
| Zustand stores | **6 store / 1.455 dòng** | **2 store gọi DB trực tiếp** (`useWorkshopAdminStore`, `useDesignerAdminStore`); `useCustomerAdminStore` hiện không gọi DB |
| Unit test | **105 test / 34 suite / 0,75 s** | 7 file `tests/unit/*`; coverage (module được test) **65,06% line / 80,83% branch / 53,78% func** |
| Component/e2e test | **0 component**, **1 e2e script** `scripts/e2e/guest-order-flow.ts` (379 dòng, cần DB thật + secret) | e2e **không** có trong `gate-manifest.json`, không CI |
| CI | **không có** (`.github/workflows` absent) | 19 gate trong `scripts/gate-manifest.json` (2 live, 2 advisory), chạy tay |
| Gate runtime (đo) | lint **9,32 s** · build **5,85 s** · 10 offline gate **1,82 s** · unit **0,75 s** | tổng ~17,7 s nếu chạy tuần tự |
| Bundle hiện tại | initial JS+CSS **284.376 B gzip** (`index` 193.530; react 18.190; supabase 57.646; CSS 15.702) | `three` đã lazy (133,9 kB gzip); build 5,85 s |
| `@frontend/ui` barrel | **112** import qua barrel, **0** deep import | tốt — cần gate hoá |
| console.* | **98** call; `reportError` chỉ **1** consumer | thiếu telemetry thống nhất |
| Realtime setup | **3 nơi**: `useCatalogData:157`, `settingsService:336`, `customDesignService:380` | dễ subscribe trùng khi thêm feature |
| Edge Function | `supabase/functions/calculate-quote/index.ts` **154** dòng, **0 client invoke** | hạ tầng “chết”/chưa nối |
| Blast radius feature gần nhất | FL-1 (`579ef55`): **18 file / 3.211 insertions**; FL-2a (`c6d28f0`): **6 file / 1.050** | FL-2a gọn hơn nhờ đã có adapter `fileStorage` |

> **Cách đọc:** phần lớn nợ **không phải code xấu**, mà là **thiếu biên (boundary) + thiếu luật**. Phase 1–6 đã dọn dead-code/bundle/i18n/god-file; plan này giải quyết phần **cấu trúc để feature không làm vỡ nhau**.

---

## 2. Vấn đề hiện trạng — bằng chứng, ảnh hưởng khi thêm feature, mức

> Mức: **P0/P1** = chặn/nguy hiểm khi thêm feature tiền & đa người; **P2** = ma sát rõ; **P3** = nợ nhỏ.
> Mọi dòng đều có bằng chứng đọc trực tiếp trên HEAD.

| ID | Mức | Vấn đề | Bằng chứng (file:line / số đo) | Ảnh hưởng khi thêm feature |
|---|---|---|---|---|
| **A1** | **P0** | **Không có server boundary cho flow tiền**: `confirmManualPayment` ghi 4 bảng tuần tự + compensation client-side; tạo đơn không idempotent | `orderService.ts:259` ghi rõ “client-side, **KHÔNG atomic** — server-side atomic là FL-7”; ghi `order_items:394`, `payment_transactions:419`, `order_files:462`, `orders:492`; compensation xoá ngược `:421-422`, `:464-466`, `:511-514`; `createOrder` tự sinh id ngẫu nhiên `:56-58`; `dbService.saveOrder` chỉ INSERT 1 bảng (`database.ts:248-327`) | FL-4 payout, FL-5 finance, FL-6 huỷ/hoàn, FL-7 gateway/webhook **đều phải viết compensation mới**; 1 lỗi mạng giữa chừng = đơn “mồ côi” (có items không payment hoặc ngược lại); refund/đối soát không có điểm commit tin cậy |
| **A2** | **P1** | **Không CI + không guardrail kiến trúc**: không workflow, không rule import-boundary/max-lines/any-budget; review bằng mắt | `.github/workflows` không tồn tại; `package.json` chỉ `lint/build/test:unit/check`; 19 gate trong `gate-manifest.json` (2 live) chạy tay; không ESLint config/dependency | Feature thêm nhanh sẽ tái tạo nợ ngay: thêm file 1.500 dòng, thêm `dbService` trong component, thêm `any` — không ai chặn; refactor lớn không có lưới an toàn |
| **A3** | **P1** | **UI gọi thẳng DB/backend**: 41 `dbService.*` trong frontend + 20 file import `backend/supabase` + **31 file** import `backend/services` | `useCatalogData:14` call; `Group1:5`, `Group3:4`, `Group5:4`; `CheckoutView:1`, `OrderTrackingView:1`; `AuthContext` 10 call `supabase.*`; `WorkshopSettings*` 9 file import `workshopService` | Mỗi feature mới tự chọn “gọi DB ở đâu cũng được” ⇒ khó test (unit phải mock DB), khó đổi nguồn (cache/optimistic/RPC), UI biết schema; bug vòng lặp fetch (hotfix `f5d3a1d`) là hệ quả trực tiếp của việc trộn data-fetch với UI |
| **A4** | **P1** | **Type god-file + hợp đồng dữ liệu phân tán**: `types/index.ts` 988 dòng/41 export cho 12+ domain; `orderRecords.ts` tách ad-hoc; **142 `: any` + 60 `as any`**; nhiều interface local trong view | `types/index.ts:1-988`; `orderRecords.ts:1-8` ghi lý do tách “giảm xung đột khi nhiều workstream cùng sửa file types tổng”; `database.ts:24 any`; UI local interface: `AdminSettingsPanel` 4, `AdminSidebar` 3… | Thêm field/đơn vị tiền phải sửa file dùng chung ⇒ conflict + review chậm; contract DB↔domain↔UI không có single source ⇒ lệch silent (mappers test chỉ phủ một phần); `any` xoá mất lợi ích TypeScript đúng chỗ tiền |
| **A5** | **P2** | **God-file còn lại**: 21 file >800; views 11.754 dòng; kể cả primitive dùng chung `DataTable` 854 | `meshParser` 1.878; `ExploreView` 1.435; `HomeView` 1.432; `WorkshopOnboardingWizard` 1.425; `Group5` 1.259; `Group3` 1.214; `DataTable` 854 | Feature chạm Home/Explore/Onboarding/DataTable phải đọc & sửa file khổng lồ; merge conflict; test khó; review risk (Phase 4 đã chứng minh tách được → cần tiếp tục) |
| **A6** | **P1→P2** | **State ownership không có luật**: 6 store 1.455 dòng, **2 store admin vừa giữ server data vừa gọi DB trực tiếp**; hook cùng giữ bản sao; realtime 3 nơi | `useWorkshopAdminStore:221` `supabase.from('workshop_profiles')`, `useDesignerAdminStore:258` `supabase.rpc(...)`; `useProductionStore` 417 dòng; realtime: `useCatalogData:157`, `settingsService:336`, `customDesignService:380` | Feature mới không biết “nguồn sự thật” ở đâu ⇒ dễ có 2 state cùng entity, refetch loop/identity bug (f5d3a1d), stale UI; thêm realtime thứ 4 dễ subscribe trùng |
| **A7** | **P2** | **Adapters có nhưng chưa injectable/không đồng nhất**: `paymentProvider` TODO gateway, import `dbService` trực tiếp; 2 provider còn là stub; orderService static-import dbService | `integrations/paymentProvider.ts:10` `TODO(FL-7)`; `:16` import `dbService`; sizes: fileStorage 323 (thật), payment 136, payout 58, notification 66; `orderService` gọi `dbService.*` 27 lần | FL-7 thay gateway/webhook sẽ phải sửa cả service + adapter; test không thể thay fake provider; “adapter skeleton” hiện chỉ là vỏ |
| **A8** | **P2** | **Observability/log/realtime không thống nhất**: 98 `console.*`, `reportError` 1 consumer, không có event/telemetry cho luồng tiền; realtime rải rác | `grep console` 98; `reportError` chỉ `DesignerRequestsTab` dùng; realtime 3 nơi (A6) | Feature mới log mỗi kiểu; sự cố tiền/đơn khó truy vết; không có correlation id; không đo feature usage |
| **A9** | **P3** | **Env/config rải rác**: key Supabase đọc ở 2 nơi (client.ts + vite define), dùng cả `VITE_` và `NEXT_PUBLIC_`; `import.meta.env` cast trong UI | `client.ts:6-7` đọc `process.env.NEXT_PUBLIC_*`; `vite.config.ts:35-37` define lại; key bị đọc ở cả 2 tên (`VITE_SUPABASE_URL` 12 tham chiếu + `NEXT_PUBLIC_SUPABASE_URL` 9; tương tự ANON_KEY); `ui/Icon.tsx:25` cast `import.meta.env` | Thêm môi trường/feature flag dễ sai key; khó audit “key nào lộ client”; onboarding dev chậm |
| **A10** | **P3** | **Hạ tầng chết/không nối**: Edge Function `calculate-quote` tồn tại nhưng 0 client invoke | `supabase/functions/calculate-quote` 154 dòng; `grep calculate-quote src` = 0; docs as-is ghi “CHƯA nối client” | Tạo ảo giác “đã có server boundary”; người mới tưởng giá đã server-side; cần quyết định xoá hoặc nối có chủ đích |
| **A11** | **P3** | **Convention module/barrel chưa được gate**: `ui/index.ts` barrel tốt (112 import, 0 deep) nhưng không có rule; file >800 vẫn tăng; `types` không chia domain | `ui/index.ts` 48 dòng; 21 file >800; `types/index.ts` 988 | Convention chỉ tồn tại trong review; feature sau dễ deep-import/barrel mới tuỳ ý |
| **A12** | **P3** | **Feature coupling tiềm ẩn**: vài import chéo domain giữa components (`designer→tool3d`, `personalize→tool3d`, `services→LazyThreeModelViewer`, `shell→AuthModal/ChatSupportModal/InvoiceModal/CartDrawer`) | Graph: 12 cạnh chéo domain; `components→components` phụ thuộc màn khác | Hiện nhỏ, nhưng không có luật ⇒ feature mới có thể import trực tiếp feature khác, tạo coupling vòng sau |

### 2.1 “Feature mới đắt vì đâu?” — ví dụ blast radius (đo từ git)

| Feature gần nhất | File chạm | Dòng | Tầng bị chạm |
|---|---:|---:|---|
| FL-1 order flow (`579ef55`) | **18** | **+3.211** | backend service mới, `database.ts` (+246), `mappers.ts` (+89), `types/index.ts` + `orderRecords.ts`, 4 màn UI (Checkout/Invoice/AdminOrderDetail/Group5), route wrapper, 21 file test/handoff |
| FL-2a designer upload (`c6d28f0`) | **6** | **+1.050** | adapter `fileStorage`, `assetService`, 1 tab designer, tests — **gọn hơn nhờ adapter + service seam đã có** |
| Hotfix loop Xưởng in (`f5d3a1d`) | — | — | hệ quả của state/data-fetch trộn trong UI + handler identity (A3/A6) — đã sửa root cause, nhưng lớp lỗi sẽ tái diễn nếu không có luật |

> Bài học: **feature nào đi qua seam tốt (adapter/service) thì blast radius nhỏ** (FL-2a 6 file) — mục tiêu của plan là biến *mọi* domain thành seam như vậy.

---

## 3. Cấu trúc đích (đủ cụ thể để làm theo)

### 3.1 Cây thư mục đích

```txt
src/
├─ app/                          # bootstrap & composition root (không chứa business)
│  ├─ App.tsx                    # provider stack + shell chrome (từ src/App.tsx hiện tại)
│  ├─ providers.tsx              # Auth/Language/Router/ErrorBoundary/Toast
│  └─ router/                    # AppRoutes.tsx + routeWrappers.tsx + lazy map
│
├─ features/                     # 1 domain = 1 slice; public surface = index.ts
│  ├─ catalog/                   # Home, Explore, card/filter/services (SEO browse)
│  │  ├─ ui/        # HomeView, ExploreView, ProductCardGrid, HorizontalScrollFilter…
│  │  ├─ model/     # types riêng domain + selectors (giá/độ sẵn sàng…)
│  │  ├─ api/       # useCatalogQuery, useCatalogRealtime (KHÔNG dbService trong UI)
│  │  └─ lib/       # filter/sort/search thuần
│  ├─ product-detail/            # PDP + gallery + specs + 3D frame
│  ├─ personalize/               # cấu hình in + 3D personalise
│  ├─ quote/                     # Tool3D + pricing UI + wizard + price breakdown
│  ├─ checkout/                  # CartView, CheckoutView, CartDrawer, InvoiceModal, success
│  ├─ orders/                    # MyOrders, OrderTracking, admin OrderDetail, order timeline
│  ├─ designer/                  # upload/models/requests/payouts
│  ├─ workshop/                  # settings, onboarding wizard, machines, materials, queue
│  ├─ admin/                     # console shell + dashboard + storefront CMS + SEO + settings
│  └─ account/                   # login/register/auth modal, profile, asset library
│
├─ shared/                       # KHÔNG import features/backend-services; không business
│  ├─ ui/                        # 29 primitive (từ frontend/ui) + barrel bắt buộc
│  ├─ lib/                       # format, money, vat, validation, result, dates
│  ├─ types/                     # primitives & enum dùng chung (≤300 dòng, ≤20 export)
│  ├─ config/                    # env.ts (MỘT nơi đọc VITE_*), feature flags, defaults
│  ├─ telemetry/                 # reportError, logger, event schema, correlation id
│  ├─ hooks/                     # hook hạ tầng (useInViewport, useDebounce…)
│  └─ three/                     # Three.js/native viewer dùng chung (LazyThreeModelViewer)
│
├─ backend/                      # KHÔNG import React / frontend
│  ├─ domain/                    # thuần nghiệp vụ: orderMoney, pricingEngine, state machines, validators
│  ├─ repositories/              # queries Supabase + row→domain (tách database.ts 1.042 dòng + mappers)
│  ├─ integrations/              # PaymentProvider, FileStorage, PayoutProvider, NotificationProvider (interface + impl)
│  └─ rpc/                       # typed client cho Postgres RPC / Edge Function (atomic flows)
│
├─ workers/                      # cadParser.worker (đã có)
└─ data/                         # CHỈ seed/default content tĩnh (không phải “mock runtime”)
```

**Nguyên tắc chuyển:** dùng **strangler** — tạo `src/features` & `src/shared` **song song** `src/frontend` cũ; chuyển domain theo feature, xoá dần thư mục cũ khi không còn import (không big-bang rename 212 file).

### 3.2 Mapping hiện trạng → đích (chuyển dần, theo domain)

| Hiện trạng | Đích | Ghi chú chuyển |
|---|---|---|
| `views/HomeView.tsx`, `ExploreView.tsx`, `components/services/ServiceShowcaseSection.tsx`, `HorizontalScrollFilter.tsx` | `features/catalog/{ui,model,lib}` | tách section theo luồng dữ liệu trước, không cắt JSX cơ học |
| `views/ProductDetailView.tsx`, `components/personalize/*`, `components/ThreeModelViewer.tsx`, `CadQuickViewModal.tsx` | `features/product-detail/` + `features/personalize/` + `shared/three/` | viewer 3D dùng chung → `shared/three` |
| `views/Tool3DView.tsx`, `components/tool3d/*`, `utils/pricingEngine.ts`, `services/orderMoney.ts` | `features/quote/` + `backend/domain/pricing` | engine thuần → `backend/domain` (giữ test hiện có) |
| `views/CartView/CheckoutView/OrderSuccessView`, `components/CartDrawer/InvoiceModal`, `services/orderService`, `integrations/paymentProvider` | `features/checkout/` + `features/orders/` + `backend/domain/order` + `integrations` | **pilot CA-2/CA-3** |
| `views/MyOrdersView/OrderTrackingView`, `components/OrderProgress`, `components/admin/orders/AdminOrderDetailPanel` | `features/orders/{ui,model,api}` | admin detail dùng chung model orders |
| `components/designer/*`, `DesignerDashboardView`, `routes` designer | `features/designer/` | đã có `assetService` + `fileStorage` seam |
| `components/workshop/settings/*` (17 file), `WorkshopSettingsView`, `components/onboarding/*`, admin Group1 | `features/workshop/` | settings tabs đã tách (Phase 4) — chỉ đổi vị trí + api |
| `views/AdminDashboardView`, `components/admin/**` (35 file), `routes` admin | `features/admin/` (compose feature khác) | admin **không** sở hữu logic domain; gọi API feature |
| `views/LoginView/RegisterView`, `AuthModal`, `components/auth/*`, `views/AssetLibraryView`, context auth | `features/account/` | auth boundary: `shared/api/auth` |
| `hooks/useCatalogData/useSiteSettings/useOrdersData` | `features/*/model` (hoặc `shared/api` cho settings) | không còn hook “god” cấp app |
| `stores/useCart/useUI` | `features/checkout/model/cartStore` + `shared/ui/uiStore` | cart = business state; UI = hạ tầng |
| `stores/use*AdminStore` | `features/admin|designer|workshop/model` | bỏ server-data khỏi store, chuyển thành query-hook |
| `frontend/ui/**` → `shared/ui/**`; `frontend/lib/{format,vat,reportError}` → `shared/lib` + `shared/telemetry` | | giữ barrel `shared/ui/index.ts` |
| `types/index.ts` (988) + `types/orderRecords.ts` | `shared/types` (primitives) + `features/*/model/types` + `backend/repositories/*Rows` | **CA-1** |
| `backend/supabase/database.ts` (1.042) + `mappers.ts` | `backend/repositories/<aggregate>.ts` (`orders`, `catalog`, `workshop`, `customers`, `designers`, `settings`) | tách theo aggregate, giữ `dbService` façade tạm thời |
| `supabase/functions/calculate-quote` | quyết định: **xoá** (nếu giá vẫn client + RPC mới) hoặc nối vào `backend/rpc/quote` | ADR-003 |
| `src/data/mockData.ts` | `shared/config/defaults` (site content defaults) + `supabase/scripts/seed*` | không import mock trong runtime path |

### 3.3 Luật phụ thuộc (dependency rules) — **bắt buộc, có gate**

| Từ \ Đến | `app` | `features/x` | `shared/{ui,lib,types,config,telemetry}` | `backend/{domain,repositories,integrations,rpc}` | Supabase client trực tiếp |
|---|:--:|:--:|:--:|:--:|:--:|
| `app/*` | ✅ | ✅ (public API) | ✅ | ✅ (qua feature api? trực tiếp domain OK) | ⚠️ chỉ bootstrap |
| `features/x/ui` | ❌ | ✅ **cùng feature** (`model/api/lib`) | ✅ | ❌ (chỉ qua `features/x/api`) | ❌ |
| `features/x/model` | ❌ | ✅ cùng feature | ✅ | ✅ domain types (không repositories) | ❌ |
| `features/x/api` | ❌ | ✅ cùng feature | ✅ | ✅ repositories/domain/integrations | ❌ (dùng `shared/api`/`backend`) |
| `features/x` → `features/y` | — | ❌ **cấm** (trừ contract trong `shared/types` hoặc route/app compose) | — | — | — |
| `shared/ui` | ❌ | ❌ | ✅ `shared/lib` | ❌ | ❌ |
| `shared/lib`, `shared/types` | ❌ | ❌ | ✅ thuần | ❌ (types: chỉ type import) | ❌ |
| `backend/domain` | ❌ | ❌ | ✅ types | ✅ cùng tầng | ❌ |
| `backend/repositories` | ❌ | ❌ | ✅ types | ✅ domain | ✅ **duy nhất được dùng** |
| `backend/integrations` | ❌ | ❌ | ✅ types | ✅ domain interfaces | ⚠️ qua SDK/gateway |

**Quy tắc cứng ghi vào ADR-001 + script:**
1. `no-frontend-to-supabase`: chỉ `shared/api/**`, `backend/repositories/**`, `features/*/api` được import `@backend/supabase/client`; **0** file `ui/components/views` được import.
2. `no-ui-to-dbservice`: `features/*/ui` & `shared/ui` không được chứa `dbService.`/`supabase.from(`.
3. `no-feature-to-feature`: import chéo feature phải qua public barrel + chỉ contract (`shared/types` hoặc event) — allowlist tạm trong baseline khi migrate.
4. `max-lines`: file mới ≤ **500** (shared/ui ≤400); file cũ được grandfather, chỉ được giảm.
5. `cycles=0`: giữ 0 (baseline đã 0) — bất kỳ cycle mới = fail.
6. `no-new-any`: `: any`/`as any` mới trong diff = fail; budget tổng giảm dần (§6).
7. `barrel policy`: cross-feature/cross-layer chỉ import qua `index.ts` public; cấm deep import vào `ui/`/`model/` của feature khác.
8. `backend-no-react`: `backend/**` không import React/JSX/DOM.

**Gate thực thi (không cần dependency mới):** `scripts/check-import-boundaries.mjs` + `check-max-lines.mjs` + `check-any-budget.mjs` + `check-no-supabase-in-ui.mjs` dùng TypeScript compiler API (đã có devDep `typescript`), khai báo vào `scripts/gate-manifest.json` + baseline list. CI chạy các gate này trên **diff** (fail khi file mới/cạnh mới vi phạm; giảm nợ cũ không bị chặn).

### 3.4 State ownership (quy ước)

| Loại state | Công cụ | Ví dụ | Luật |
|---|---|---|---|
| **Server state** (DB là nguồn) | Query-hook trong `features/*/api` (pattern hiện có `useSettings`/`useOrdersData`, tách per aggregate) | products, orders, printers, settings | 1 entity = 1 owner hook; **không** copy sang Zustand; refresh sau mutation; optimistic chỉ trong mutation đó + rollback (giữ pattern FL-1) |
| **Client business state** | Zustand, đặt trong `features` sở hữu | cart, appliedDiscount, checkout draft | 1 store/domain; persist chỉ UI/cart (không cache DB-backed — luật Phase 3 giữ nguyên) |
| **UI chrome state** | Zustand `shared/ui` | drawer/modal/toast/theme-ish | không chứa entity DB |
| **Ephemeral** | `useState` local | form đang gõ, tab, filter tạm | không đẩy lên store nếu 1 component dùng |
| **URL state** | router params | section admin, filter chia sẻ được | URL là nguồn sự thật cho điều hướng (giữ pattern `/admin/:section`) |
| **Realtime** | `shared/api/realtime.ts` registry | products/settings/design-requests/orders | mỗi table 1 subscription, feature đăng ký callback; cleanup tự động; không mở channel trong component |

**Cấm state trùng nguồn:** nếu server là nguồn, không mirror sang Zustand/`useState` cấp app. Admin store hiện giữ danh sách server → migrate dần sang query-hook feature; trong giai đoạn chuyển, đánh dấu `@deprecated` + single-writer.

### 3.5 Type & contract (một nguồn)

- `shared/types/` chỉ chứa **primitives & enum**: `OrderStatus`, `PayoutStatus`, `UserRole`, `Vnd`/`Money` convention, `Result/WriteResult`, `Page<T>`… — **≤300 dòng, ≤20 export**.
- `features/<x>/model/types.ts`: entity + view-model của domain (Product, OrderDetail, QuoteBreakdown…).
- `backend/repositories/<aggregate>Rows.ts`: `*Row` (snake_case, DB) — **chỉ** tồn tại trong backend; `mappers` chuyển Row→domain (test bắt buộc).
- UI **không** import Row/Supabase type; chỉ import domain từ feature public.
- **Không `any` mới.** Boundary dùng `unknown` + parser/guard (`isOrderRow`, `parseSettingValue`) hoặc mapper đã test. `as` chỉ ở adapter seam, kèm comment + test.
- Money: giữ `number` VND + helper `Money`/`formatCurrency` (hiện có) — **không** đổi đơn vị; snapshot tiền là `number | null` (luật FL-1); cấm cộng trừ 2 đơn vị ngoài helper.
- Contract test: mỗi aggregate có `tests/unit/mappers.<aggregate>.test.ts`; **thêm check schema drift** (parse SQL migration ↔ Row key, không cần dependency) — CA-1.
- Naming: folder `kebab-case`, component `PascalCase.tsx`, hook `useX.ts`, service `xService.ts`, type `X`/`XRow`/`XProps`; event `domain.action`.

### 3.6 Backend layering (giữ Supabase, không cần framework server)

```txt
features/x/api  ──►  backend/repositories/<aggregate>  ──►  supabase client + mappers
       │                     │
       └──► backend/domain (thuần) ◄── backend/integrations (Payment/Storage/Notify/Payout)
                                   ▲
                          backend/rpc (RPC/Edge typed client)
```

- `database.ts` 1.042 dòng hiện là **god repository** (40 async method, 24 `any`) → tách theo aggregate (`orders`, `catalog`, `workshop`, `customers`, `designers`, `settings`, `assets`), mỗi file ≤400 dòng, giữ `dbService` façade export để call-site cũ chạy trong lúc migrate.
- `backend/domain`: chuyển `utils/pricingEngine.ts`, `orderMoney.ts`, validators vào đây; **không** phụ thuộc React/Supabase; test unit thuần (đã có 105 test, tăng theo).
- `backend/integrations`: interface ở domain, impl ở integrations; **dependency injection** qua tham số/constructor (không static import `dbService` trong provider) — paymentProvider hiện import `dbService` trực tiếp là nợ A7.

### 3.7 Server boundary (atomic) — **Postgres RPC trước, Edge sau**

**Quyết định:** thao tác nguyên tử ghi nhiều bảng ⇒ **Postgres function `SECURITY DEFINER` trong migration** (không cần hạ tầng mới, chạy trong transaction, RLS kiểm bằng `auth.uid()`); **Edge Function** chỉ cho việc cần secret/webhook mạng ngoài (gateway webhook, email, signed quote), không cho CRUD nội bộ.

**RPC cần có (CA-3):**

| RPC | Thay cho | Hợp đồng tối thiểu |
|---|---|---|
| `create_order_atomic(p_order jsonb, p_idempotency_key text)` | `saveOrder` 1 bảng + insert items sau | trả `order_id`; UNIQUE(`idempotency_key`) ở bảng `orders`/bảng phụ; INSERT orders + order_items + payment pending + order_files trong 1 transaction; RLS: owner/guest insert; lỗi ⇒ rollback toàn bộ |
| `confirm_payment_atomic(p_order_id uuid, p_actor uuid, p_amount numeric, p_note text, p_idempotency_key text)` | `orderService.confirmManualPayment` 4 write + 3 compensation | khoá `SELECT … FOR UPDATE` theo order; kiểm trạng thái (đã paid ⇒ trả `already_confirmed`); ghi order_items + payment_transactions + order_files + UPDATE orders trong 1 transaction; trả order detail |
| `register_asset_upload(...)` (nếu cần) | `assetService` multi-step + storage | kiểm owner/license; ghi `digital_assets` + storage metadata atomic trong DB; signed URL vẫn client-side (storage API) |
| `assign_workshop_atomic`, `mark_payout_paid_atomic` | FL-3/FL-4 multi-write | khoá + audit columns (`paid_by/paid_at`) + idempotency |

**Chuyển dần (strangler 3 bước):**
1. **Adapter trước, RPC sau:** feature `checkout/api` định nghĩa `OrderGateway { createOrder, confirmPayment }`; implementation `LegacyClientOrderGateway` (orderService hiện tại) + `RpcOrderGateway` (cờ `VITE_ORDER_GATEWAY=rpc`).
2. **Shadow đọc-đối chiếu:** ở staging, gọi RPC rồi so kết quả với legacy (số tiền/items/trạng thái) trước khi bật production; **không dual-write** production.
3. **Cutover theo môi trường** (staging → production), giữ legacy 1–2 sprint làm rollback (feature flag), sau đó **xoá compensation** + adapter legacy; e2e `guest-order-flow.ts` mở rộng assert **1 lần gọi RPC** + dữ liệu đủ.

**Chi phí:** migration mới (theo luật repo: sửa trực tiếp chuỗi 12 file hiện có hoặc thêm file mới cần Lead duyệt — nợ quy ước cần chốt); 0 hạ tầng mới; Edge Functions chỉ khi FL-7 (free tier Supabase có quota invoke, cần theo dõi; secret webhook đặt trong Supabase secrets, không vào client).

**Vì sao không dựng server riêng (Express/Hono):** stack hiện là Vite SPA + Supabase; RPC đã là server-side transaction thật. Dựng server mới = thêm deploy/secret/monitoring, không cần cho atomic DB. Chỉ cần Edge/webhook ở FL-7 (hoặc server nhỏ riêng nếu cần orchestration dài hơi — quyết định ở ADR-003).

### 3.8 Testing & CI (pyramid + gate)

| Tầng | Hiện tại | Đích | Công cụ |
|---|---|---|---|
| Unit (pure) | 105 test, 7 file | +mappers per aggregate, domain rules, validators; coverage gate | `node:test` + `tsx` (giữ) + **coverage built-in Node 24** (`--experimental-test-coverage`, đã kiểm chứng chạy được) |
| Component | 0 | 8–12 test cho form/primitive quan trọng (Field/Modal/DataTable, checkout form) | Ưu tiên **CDP smoke no-dep** (đã dùng ở bugfix) hoặc thêm `@testing-library/react` + `jsdom` **devDeps** (ADR-008 quyết định; bundle không tăng) |
| E2E | 1 script (`guest-order-flow.ts`) ngoài CI | 4 luồng theo PLAN §5: order in, file số, xưởng, designer/admin finance + smoke 6 route admin/storefront | script `tsx` + Supabase thật (CI nightly, secrets) + CDP smoke |
| Gate | 19 (2 live) manual | CI required: lint/build/unit/offline gates/boundaries/max-lines/any-budget + build-size budget; PR ≤3 phút | GitHub Actions |

**CI skeleton (GitHub Actions — miễn phí 2.000 phút/tháng cho private repo):**
- `ci.yml` (mỗi PR): npm cache → `npm run lint` → `npm run test:unit` (coverage artifact) → 10 offline gate → 4 gate mới (boundaries/max-lines/any-budget/no-supabase) → `vite build` + **budget gzip** → upload artifact. Runtime mục tiêu **≤3 phút**.
- `e2e-nightly.yml`: dry-run `guest-order-flow` mỗi đêm; **live** (secrets `SUPABASE_URL/KEY`, admin test account) 2–3 lần/tuần hoặc manual; artifact screenshots.
- Required checks trên `main`; nhánh feature không merge khi đỏ. Secrets: rotate định kỳ, không log; dùng test project Supabase riêng nếu có (khuyến nghị).
- Gate manifest: thêm 4 script mới + `test:unit` (đã có) + coverage (optional); baseline `docs/tasks/baseline.json` cập nhật theo số đo CA-0.

### 3.9 Docs/ADR (nơi ghi quyết định)

```txt
docs/adr/
├─ README.md            # index + template
├─ ADR-001-feature-sliced-boundaries.md
├─ ADR-002-backend-layering.md
├─ ADR-003-server-boundary-rpc-first.md
├─ ADR-004-type-contracts.md
├─ ADR-005-state-ownership.md
├─ ADR-006-ci-testing.md
├─ ADR-007-module-size-barrels-naming.md
└─ ADR-008-dependency-decisions.md   # testing-library/react-query/supabase-cli: yes/no + lý do
```
Template: Context → Decision → Alternatives → Consequences → Enforcement (gate) → Status/Date/Owner. Mọi ngoại lệ boundary/max-lines ghi vào baseline có `why` + người sở hữu + ngày hết hạn.

---

## 4. Lộ trình migration tăng dần — CA-0 … CA-5

> Mỗi bước **phải xanh gate hiện có + gate mới**, không big-bang, không trộn feature lớn. Effort là ước lượng cho **1 dev quen repo**; 2 dev chạy song song được các bước độc lập (ghi rõ).

| Bước | Mục tiêu | Phạm vi chính | Effort | Phụ thuộc | Metric before → after | DoD | Rủi ro chính |
|---|---|---|---:|---|---|---|---|
| **CA-0** | Guardrails + CI skeleton | `.github/workflows/ci.yml`; `scripts/check-import-boundaries.mjs`, `check-max-lines.mjs`, `check-any-budget.mjs`, `check-no-supabase-in-ui.mjs`; baseline grandfather (21 file >800; 20 file UI→supabase; 41 dbService; 142 any; 60 as-any); cập nhật `gate-manifest.json` + baseline | **3 d** | — | CI **0→1**; gate tự động 19→23; PR check thời gian **n/a→≤3 phút**; nợ mới **=0** (baseline chặn) | PR đỏ khi thêm file >500/any mới/UI→supabase/cycle; `npm run check` offline xanh; docs gate | Baseline dễ bị “vá” tuỳ tiện — bắt buộc entry có `why/owner/expiry`; CI secrets cho e2e để sau |
| **CA-1** | Tách types + contract single-source | `types/index.ts` → `shared/types` (primitives) + `features/{orders,quote,catalog,workshop,designer,admin}/model/types.ts`; `backend/repositories/*Rows`; mappers test per aggregate; bắt đầu `unknown`+guard ở boundary; `orderRecords.ts` gộp đúng chỗ | **5 d** | CA-0 | `types/index.ts` **988→≤300**; export/file **41→≤20**; `: any` **142→≤110**; mapper tests 1→6+; top god-type file giảm | Không feature import `types/index` cho entity riêng; `tsc` xanh; contract test chạy CI | Conflict khi nhiều workstream; cần freeze `types/index.ts` trong 1–2 ngày; tránh đổi field/API |
| **CA-2** | Feature folders pilot 3 domain nhỏ (strangler) | (a) `features/orders` (Checkout/MyOrders/Tracking/Invoice + order hooks/api); (b) `features/designer` (upload/models/requests/payouts + asset service); (c) `features/workshop` (settings 17 file + onboarding + Group1 admin); mỗi feature có `ui/model/api/lib` + `index.ts`; migration `dbService` → feature api | **7 d** | CA-0, CA-1 | File trong feature ≤500 (mới); UI→supabase **20→≤8 file**; dbService frontend **41→≤15**; cycle **0 giữ**; view god: Checkout 981→≤600 | 3 feature chạy độc lập, public API rõ; route import qua feature index; e2e cũ xanh; lint/build/test xanh | Di chuyển file gây conflict; giữ re-export tạm ở path cũ 1 sprint; **không** đổi UI |
| **CA-3** | Server boundary atomic + adapter | Migration RPC `create_order_atomic`, `confirm_payment_atomic` (+ tests SQL/RLS); `backend/rpc/orderGateway.ts`; `checkout/api` interface `OrderGateway`; feature flag chọn legacy/rpc; mở rộng e2e guest-order; cutover staging → prod; xoá compensation + legacy sau ổn định | **6 d** | CA-2 (orders) + migration approval | Multi-write client flow **1→0**; compensation branches **3→0**; e2e atomic assert **0→2 case**; đơn “mồ côi” **=0**; roundtrip write **4→1 RPC** | RPC idempotent + rollback test; e2e live xanh 2 lần; feature flag off ⇒ legacy vẫn chạy; rollback plan có migration down/không phá dữ liệu | RPC `SECURITY DEFINER` sai RLS = lỗ hổng; phải review SQL + test role; dual-path lâu dài ⇒ hạn cutover 2 sprint |
| **CA-4** | Dọn god-file còn lại + inline DB | `meshParser` 1.878→5 module ≤500; `Home/Explore` 1.43k→section components ≤500; `OnboardingWizard` 1.425→step components+hook; admin Group3/5 1.2k→tab module (pattern Phase 4); `ui/DataTable` 854→core+toolbar+pagination; move nốt inline `dbService` 15→0 | **9 d** | CA-2 (pattern), CA-1 (types) | File >800 **21→≤5**; >600 **35→≤12**; max file **1.878→≤800 (mục tiêu ≤600)**; views LOC 11.7k→≤8k; dbService frontend **≤15→0** | Tách theo **chiều dữ liệu** (không cắt JSX cơ học); parity test/e2e cho parser; UI không đổi | Mesh parser rủi ro số đo — cần golden-file test trước khi tách; freeze file trong lúc tách |
| **CA-5** | Hardening (observability, config, docs, dọn cuối) | `shared/telemetry` thay `console.*` runtime; `shared/config/env.ts` single source (VITE_* only + fallback legacy 1 nơi); realtime registry; ADR đầy đủ; xoá dead infra (`calculate-quote` hoặc nối); dependency decisions; coverage gate nâng ngưỡng | **6 d** | CA-0..CA-4 | console runtime **98→≤20**; reportError dùng **1→100% catch path**; env key 2 nguồn → **1**; realtime setup **3 nguồn→1 registry**; coverage line **65,06%→≥75%**; ADR **0→8** | Telemetry có correlation id cho flow tiền; env audit “key nào client” trong docs; ADR-008 chốt dependency; gate xanh | Thay log có thể mất thông tin debug — giữ structured log tương đương; không thêm SaaS telemetry (chi phí) |

**Tổng:** **≈36 dev-day** (3+5+7+6+9+6), ~**7 tuần lịch 1 dev** / **~4 tuần nếu 2 dev song song** (CA-0+CA-1 song song; CA-2 (orders/designer/workshop) 3 nhánh song song; CA-4 sau CA-2). Khuyến nghị **≤20% capacity mỗi sprint** + 2 cửa sổ freeze 1 tuần (CA-3 migration, CA-4 parser).

**Biểu đồ phụ thuộc:**
```txt
CA-0 ──► CA-1 ──► CA-2a orders ──► CA-3 server boundary
                     ├─► CA-2b designer ─┐
                     └─► CA-2c workshop ─┴─► CA-4 god-file/inline DB ──► CA-5 hardening
```

---

## 5. Clean-code backlog Top 15 (ưu tiên ROI)

> ROI = (giá trị mở khóa feature + giảm rủi ro) / effort. Effort: **S ≤1 ngày**, **M 2–4 ngày**, **L 1–2 tuần**.

| # | Việc | Bằng chứng | Hành động | Effort | ROI | Bước |
|---:|---|---|---|---|:--:|---|
| 1 | **Server boundary atomic cho flow tiền** | `orderService.ts:259,394-514`; `database.ts:248` | RPC `create_order_atomic` + `confirm_payment_atomic` + adapter `OrderGateway` + e2e atomic | **L** | ★★★★★ | CA-3 |
| 2 | **CI + guardrails** | no `.github/workflows`; 19 gate tay | workflow + 4 script boundary/max-lines/any/no-supabase + baseline | **S–M** | ★★★★★ | CA-0 |
| 3 | **Tách `types/index.ts` (988/41)** | `types/index.ts`; `orderRecords.ts:1-8` | chia 6–7 domain model types; `*Rows` backend; contract tests | **M** | ★★★★★ | CA-1 |
| 4 | **Orders feature slice (pilot)** | Checkout 981; MyOrders 504; Tracking 597; AdminOrderDetail 416 | `features/orders|checkout` + api/gateway; route qua public index | **M** | ★★★★★ | CA-2 |
| 5 | **Bỏ inline `dbService` khỏi UI** | 41 call/12 file; 20 file import backend/supabase | chuyển sang feature api/repositories; cấm bằng gate | **M** | ★★★★☆ | CA-2/4 |
| 6 | **Idsempotency + xoá compensation sau RPC** | `createOrder:56`; compensation 421/464/511 | idempotency key + RPC; xoá 3 nhánh compensation | **M** | ★★★★☆ | CA-3 |
| 7 | **Admin stores → query-hook** | 6 store/1.455 dòng; 3 store gọi DB | 1 owner/entity; Zustand chỉ client state; realtime registry | **M** | ★★★★☆ | CA-2 |
| 8 | **Tách `meshParser` (1.878)** | `utils/meshParser.ts` | core parser/units/analysis/healing + golden-file test | **L** | ★★★★☆ | CA-4 |
| 9 | **Tách Home/Explore (~1.43k)** | `HomeView/ExploreView` | section components theo luồng dữ liệu; ≤500/file | **L** | ★★★★☆ | CA-4 |
| 10 | **Tách OnboardingWizard 1.425** | `components/onboarding/WorkshopOnboardingWizard` | step components + `useOnboardingWizard`; giữ flow | **M** | ★★★★☆ | CA-4 |
| 11 | **Tách admin Group3/Group5 (~1.2k)** | `Group3CustomersPanel`, `Group5ProductionPanel` | tab/sub-panel như Phase 4 (đã có pattern) | **M** | ★★★☆☆ | CA-4 |
| 12 | **`any`/`as any` burndown** | 142 `: any` + 60 `as any`; top `database.ts:24` | bắt đầu DB/repositories + boundary parsers; budget gate | **M** | ★★★☆☆ | CA-1/5 |
| 13 | **Error/log/telemetry thống nhất** | 98 console; reportError 1 consumer | `shared/telemetry` + correlation id + reportError mọi catch; event tiền/đơn | **M** | ★★★☆☆ | CA-5 |
| 14 | **Env/config single source** | `client.ts:6-7` + `vite.config.ts:35-37`; `Icon.tsx:25` | `shared/config/env.ts`; chỉ `VITE_*`; legacy fallback 1 nơi; docs key | **S** | ★★★☆☆ | CA-0/5 |
| 15 | **`ui/DataTable` 854 + barrel policy** | `ui/DataTable.tsx`; 112 barrel import/0 deep | tách core/toolbar/pagination; public barrel gate; `shared/ui` ≤400 | **S–M** | ★★★☆☆ | CA-4 |

**Tổng effort backlog:** ~31–39 dev-day ⇒ gần trùng CA-0..CA-5 (backlog là đơn vị thi công của lộ trình).

---

## 6. Metrics mục tiêu & ngưỡng (có gate)

| Metric | Baseline (HEAD 579ef55) | Mục tiêu CA-2 (sau ~3 tuần) | Mục tiêu CA-5 | Đo bằng / gate |
|---|---:|---:|---:|---|
| File LOC max (mới) | 1.878 (21 file >800) | file mới ≤500; cũ **21→≤12 >800** | max **≤600**, >800 **≤5** (grandfather hết) | `check-max-lines.mjs` + baseline |
| `types/index.ts` | 988 dòng / 41 export | ≤500 / ≤25 | **≤300 / ≤20** | gate max-lines theo file |
| Import cycle | **0** | 0 | 0 | `check-import-boundaries` (cycle) |
| UI file → Supabase client | **20 file** | ≤8 | **0** | `check-no-supabase-in-ui` |
| `dbService.*` trong frontend | **41 call / 12 file** | ≤15 | **0** | cùng gate (allowlist giảm) |
| Feature → feature import | 12 cạnh (components) | 0 mới (allowlist cũ) | 0 (trừ shared contract) | boundary gate |
| `: any` | **142** | ≤110 | **≤20** | `check-any-budget` (tổng + diff) |
| `as any` | **60** | ≤45 | **≤15** | như trên |
| Unit coverage (module được test) | **65,06% line / 80,83% branch** | ≥70% line | **≥80% line**; shared/lib ≥90% | coverage built-in, artifact CI |
| Test pyramid | 105 unit / 0 component / 1 e2e ngoài CI | +1 component harness + e2e dry-run CI | 4 e2e live trong nightly + smoke 6 route | CI |
| CI required gates | **0** | 1 workflow, 23 gate | 25 gate + coverage + e2e nightly | Actions |
| PR static time | n/a | ≤3 phút | ≤3 phút | Actions duration |
| Build initial gzip | **284.376 B** | ≤290.000 | **≤300.000** (index ≤200.000) | build budget script |
| Build wall | 5,85 s | ≤7 s | ≤8 s | CI log |
| Lint wall | 9,32 s | ≤11 s | ≤12 s | CI log |
| Offline gate suite (10) | 1,82 s | ≤3 s | ≤5 s | CI log |
| Feature blast radius (median file/PR) | FL-1 18, FL-2a 6 | ≤10 | ≤8 | script git log (đo sau) |
| console.* runtime | 98 | ≤60 | ≤20 | grep/report gate (mới) |
| Realtime setup locations | 3 | 2 | 1 (registry) | code review/ADR |
| Env sources cho 1 key | 2 (client + define) | 1 | 1 | `check-env-single-source` (mới, optional) |

**Nguyên tắc ngưỡng:** mỗi gate mới phải **chặn nợ mới** ngay từ CA-0, còn nợ cũ **giảm theo bước**; “budget chỉ giảm, không tăng”; ngoại lệ phải có entry baseline + owner + ngày hết hạn (ADR-007).

---

## 7. Giá trị mở khóa feature (vì sao đáng refactor)

| Feature sắp làm (PLAN v2) | Hiện tại sẽ đắt vì | Sau cấu trúc đích |
|---|---|---|
| **FL-2b order_files + `/assets` tải signed URL** | phải sửa `orderService`, `database.ts`, types, AssetLibrary, route, RLS — nhiều tầng; test DB | `features/orders/api` + `backend/repositories/assets` + `integrations/fileStorage`; thêm 1 use-case, 0 sửa UI khác |
| **FL-3 dispatch + queue xưởng** | admin Group1/Group5 god-file + store + dbService rải rác; nguy cơ loop như f5d3a1d | `features/workshop/model` 1 nguồn + realtime registry + tab modules; admin chỉ compose |
| **FL-4 payout/ledger** | phải viết compensation mới; dễ lệch sổ; admin Group3/5 | RPC `mark_payout_paid_atomic` + `backend/domain/settlement` + `features/admin/finance`; test đối soát unit |
| **FL-5 finance dashboard** | query rải rác trong component; type tiền phân tán | repository aggregate `finance` + query-hook; UI chart thuần; số liệu 1 nguồn |
| **FL-6 review/notification/account** | realtime 3 nơi, toast/log không thống nhất | `shared/telemetry` + `notificationProvider` injectable + `features/account` |
| **FL-7 gateway/webhook** | adapter hiện import `dbService` trực tiếp, TODO; client compensation | interface `PaymentProvider` + RPC/webhook Edge; đổi impl không sửa UI/nghiệp vụ |

**Ngược lại, nếu không refactor:** mỗi mốc FL sẽ cộng thêm ~10–18 file chạm + risk tiền; CI vắng ⇒ regression chỉ phát hiện ở production; số `any`/god-file tăng làm review chậm tuyến tính.

---

## 8. Trade-off: refactor vs feature velocity & cách tránh “refactor vô tận”

| Trade-off | Quan điểm cho VCUBE |
|---|---|
| Refactor lớn vs ra feature | **Không big-bang.** Refactor theo **feature-driven strangler**: chỉ chuyển vùng đang sửa cho feature kế tiếp; 80% capacity feature, 20% nợ. |
| Server boundary trước hay sau FL-7? | Làm **CA-3 sớm** (sau CA-2 orders) vì flow tiền đang client-side; RPC là DB-native, không cần chờ 3rd-party. |
| Thêm dependency (React Query/testing-library) | Mặc định **không**; nếu cần, ADR-008 phải nêu lợi ích > chi phí bundle/maintenance. Hiện `tsx/node:test/CDP` đủ cho unit+e2e smoke. |
| Feature-sliced vs giữ cấu trúc cũ | Hybrid: **thêm** `features/`/`shared/`, giữ `frontend/` đến khi xong; cấm trùng logic mới trong `frontend/`. Xoá dir cũ ở CA-4 khi 0 import. |
| Đổi sang framework server (Next/Hono) | **Không.** Vite SPA + Supabase đủ; thêm server = chi phí deploy/secret/observability, không giải quyết atomic DB. Edge Function chỉ cho webhook FL-7. |
| Refactor vô tận | Timebox từng item (M≤4 ngày, L≤10 ngày); nếu vượt **1,5×** ⇒ dừng, revert, tách nhỏ; exit criteria = metric/gate, không phải “thấy sạch”; mỗi PR refactor có **DoD + đo trước/sau**; không refactor file không liên quan feature/không có gate fail. |

**Cơ chế chống trôi:**
1. **Freeze windows:** 1 tuần cho CA-3 (migration) + 1 tuần CA-4 (meshParser) — thông báo trước, feature nhỏ chạy nhánh riêng.
2. **Boy-scout rule:** ai sửa file >500 dòng phải **giảm** nó (hoặc mở ticket) — không tăng.
3. **Architecture review 2 tuần/lần** (30 phút): xem metrics dashboard từ CI artifact, chỉ can thiệp khi lệch ngưỡng.
4. **Quyết định bằng ADR**, không bằng tranh luận: thay đổi boundary/state/dependency phải có ADR + gate.
5. **Rollback plan mỗi bước** (đặc biệt CA-3): feature flag + legacy path + migration không phá dữ liệu; doD gồm rollback đã tập.

---

## 9. Hạ tầng & chi phí (nếu cần)

| Hạng mục | Cần cho | Chi phí | Lợi ích |
|---|---|---|---|
| **GitHub Actions** | CA-0 CI | Miễn phí 2.000 phút/tháng (private; public unlimited). CI static ~2–3 phút/PR ⇒ ~40–60 run/ngày trong quota | Chặn hồi quy; bắt buộc merge gate; artifact coverage/build-size |
| **Supabase Postgres RPC** | CA-3 atomic | **0 đồng** (nằm trong DB hiện tại); chỉ cần migration + review SQL | Transaction thật, idempotency, RLS server-side; không thêm hạ tầng |
| **Supabase Edge Functions** | FL-7 webhook (sau), có thể tái dùng `calculate-quote` | Nằm trong plan Supabase (free tier có quota invoke/tháng; cần theo dõi dashboard) | Nhận webhook/secret server-side, không lộ service key client |
| **GitHub Secrets** | e2e live/nightly | 0 đồng (bảo mật: dùng test project + rotate) | E2E thật trong CI, không chạy tay |
| **`@testing-library/react` + `jsdom`** (tuỳ chọn) | component test | 2 devDeps (dev-only, không vào bundle) | Test form/primitive; nếu chưa duyệt ⇒ CDP smoke no-dep |
| **Supabase CLI / typegen** (tuỳ chọn) | contract DB | Dev tool, không vào bundle | Sinh type DB tự động; nhưng thêm bước cài — có thể thay bằng script drift no-dep |
| **Sentry/telemetry SaaS** (tuỳ chọn, **chưa đề xuất**) | observability | Có thể phát sinh chi phí | Chưa cần; `shared/telemetry` + console structured đủ giai đoạn này |

---

## 10. 5 việc nên làm ngay (2 tuần đầu)

1. **CA-0.1 — CI offline (0,5 ngày):** `.github/workflows/ci.yml` chạy lint → unit → 10 offline gate → build budget; required check trên `main`.
2. **CA-0.2 — 4 guard script + baseline (1,5 ngày):** `check-import-boundaries`, `check-max-lines`, `check-any-budget`, `check-no-supabase-in-ui`; grandfather nợ cũ có `why/owner/expiry`; thêm vào `gate-manifest.json`.
3. **CA-0.3 — freeze + chốt ADR khung (0,5 ngày):** ADR-001..005 (boundaries, backend layering, RPC-first, type contracts, state); freeze `types/index.ts` + `dbService` cho feature mới.
4. **CA-1.1 — tách types theo domain, pilot orders/quote (2–3 ngày):** `shared/types` primitives + `features/orders/model/types` + `features/quote/model/types`; cập nhật mappers test; `types/index.ts` bắt đầu giảm.
5. **CA-3.1 — thiết kế + viết RPC atomic (2–3 ngày, song song):** SQL `create_order_atomic`/`confirm_payment_atomic` + adapter `OrderGateway` sau feature flag; e2e guest-order mở rộng; **chưa cutover** khi chưa có shadow evidence.

> 5 việc này độc lập tương đối, có thể chạy 2–3 người song song; tổng ~7–8 ngày để có **lưới an toàn + seam server đầu tiên**, tạo đà cho CA-2..CA-5.

---

## 11. Phụ lục — lệnh đo & file bằng chứng

```bash
cd /home/thanh/home/thanh/project/Vcube   # HEAD 579ef55

# LOC / god-file
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} + | sort -rn | head -30
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} + | awk '$2!="total"{if($1>800)a++;if($1>600)b++;if($1>500)c++;t++}END{print a,b,c,t}'

# any
grep -roF ': any' src --include=*.ts --include=*.tsx | wc -l      # 142
grep -roF 'as any' src --include=*.ts --include=*.tsx | wc -l     # 60

# UI → DB
grep -ro "dbService\." src/frontend --include=*.ts --include=*.tsx | wc -l          # 41
grep -rl "backend/supabase" src/frontend --include=*.ts --include=*.tsx | wc -l     # 20
grep -rc "supabase\." src/frontend --include=*.ts --include=*.tsx | grep -v ':0'    # 4 file

# types
wc -l src/types/index.ts src/types/orderRecords.ts
grep -cE '^export (interface|type|enum)' src/types/index.ts                         # 41

# test + coverage + gates
npm run test:unit
npx tsx --test --experimental-test-coverage tests/unit/*.test.ts | tail -5
node -e "console.log(require('./scripts/gate-manifest.json').gates.length)"          # 19
node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast \
  --only check-error-handling --only check-fabricated --only check-icon-names \
  --only check-ui-rules --only check-unitprice-multiplier --only a8-sql-syntax-check \
  --only lint-rls-migration --only lint-rls-sources

# build + initial gzip (KHÔNG ghi dist/)
npx vite build --outDir dist-ssr/arch-baseline --emptyOutDir
node -e "…parse dist-ssr/arch-baseline/index.html + gzipSync…"   # 284.376 B gzip (chi tiết §1)

# blast radius feature gần nhất
git show --stat --oneline 579ef55 | tail -25
git show --stat --oneline c6d28f0 | tail -12

# import graph/cycles (script tạm dùng TypeScript compiler API — không thêm dep)
node /tmp/arch-graph.mjs    # kết quả: 212 node, 737 edge, cycles 0 (script chỉ dùng trong phiên)
```

**File bằng chứng chính:** `src/backend/services/orderService.ts` · `src/backend/supabase/database.ts` · `src/backend/supabase/mappers.ts` · `src/frontend/views/CheckoutView.tsx` · `src/types/index.ts` + `orderRecords.ts` · `scripts/gate-manifest.json` · `scripts/e2e/guest-order-flow.ts` · `supabase/functions/calculate-quote/index.ts` · `docs/tasks/world-class/PLAN.md`.

---

## 12. Quyết định cần chốt (để CA-0/CA-3 không bị chặn)

| # | Quyết định | Đề xuất mặc định |
|---|---|---|
| Q1 | Có chấp nhận **migration mới** cho RPC atomic (thay vì sửa 12 file cũ)? | Có — thêm migration theo thứ tự tên file; hoặc sửa file check-constraints nếu Lead muốn giữ “12 file” |
| Q2 | Có đồng ý **GitHub Actions** + secrets test project? | Có (miễn phí); dùng project test riêng nếu có |
| Q3 | Có đồng ý **devDeps** cho component test (`@testing-library/react`+`jsdom`)? | Chưa cần: CDP smoke no-dep trước; quyết định ở ADR-008 sau CA-2 |
| Q4 | Baseline nợ cũ (21 file >800, 20 UI→supabase, 142 any) có **grandfather có thời hạn**? | Có — expiry 3 sprint, owner theo vùng, gate không cho tăng |
| Q5 | Feature-freeze windows (CA-3/CA-4) chấp nhận? | Có — 2 tuần (không liên tiếp), thông báo trước 1 tuần |
| Q6 | `calculate-quote` Edge: xoá hay nối? | **Xoá** nếu giá vẫn client + RPC quote sau; nối khi làm server-side pricing (FL-7/ADR-003) — tránh hạ tầng chết |
