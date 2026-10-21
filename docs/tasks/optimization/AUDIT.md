<!-- doc-meta: status=active; verified=2026-10-21; owner=lead -->
# AUDIT — VCUBE hiện trạng (2026-10-21)

> **Mục đích:** chốt lại toàn bộ page/tính năng/kiến trúc hiện tại để lên plan clean-code + tối ưu
> resource. Đây là bản **AS-IS mới**, thay cho các số liệu cũ trong `docs/plans/**` (đã archive)
> và cập nhật sau đợt UI v3 "Soft Studio" đang nằm trong working tree (chưa commit).
>
> **Phương pháp:** đọc `src/**` + route/SQL/docs hiện tại; static import/reachability scan;
> `npm run build`; `npm run lint`; 10 gate offline. **Supabase đang paused** ⇒ không kiểm chứng
> dữ liệu/RLS thật, mọi kết luận data là từ code/SQL.

---

## 1. Snapshot

| Hạng mục | Giá trị |
|---|---|
| Git | `main` @ `97cc256`, **working tree bẩn** (113 M + 1 D + 45 untracked), chưa commit |
| Source | **139 file** `.ts/.tsx`, **65.772 LOC**; 16 view · 53 component · 29 module UI |
| Route | **30 route = 23 màn thật + 7 redirect**; 5 module lazy |
| Backend | 8 service + `dbService` (31 method) + `mappers` + `seedService`; 2 context; 6 store |
| DB (theo migration) | **32 bảng + 2 view**; 19 hàm thường trực; 9 định nghĩa trigger / ~29 instance; 92 policy bảng hiệu lực; 7 storage policy; 2 bucket; 11 bảng realtime |
| Build | `dist/` ~**2,8 MB**; initial: index **881K** (242K gzip), three-vendor **520K** (134K gzip), supabase-vendor **216K** (58K), react-vendor **51K**, CSS **88K** |
| Gate | `npm run lint` PASS · `npm run build` PASS · 10 gate offline PASS; `verify-rls`/`inspect-db` skip vì Supabase paused |
| UI v3 | P0 **0**, P1 **0**; P2 **5 ngoại lệ có ghi**; P3 còn nit (QA-03 key warning, UI-036, docblock, `đ/g` console) |

> **Kết luận nhanh:** code chạy được và UI v3 đã đồng bộ; nợ chính không còn là layout mà là
> **dead code, bilingual code chết, data layer phân mảnh, god-file, bundle eager và docs drift**.

---

## 2. Kiến trúc hiện tại

```
main.tsx
 └─ App.tsx (2152 LOC)  ← router + state toàn cục + 7 fetch + realtime + FAB/footer
     ├─ Header / AuthModal / CartDrawer / InvoiceModal / ChatSupportModal
     ├─ 12 view eager (Home, Explore, PDP, Cart, Checkout, Orders, ...)
     └─ 5 lazy (Tool3D, Admin, Designer, WorkshopSettings, Onboarding)
         └─ AdminDashboardView lazy 11 panel + 6 group panel

backend/
 ├─ supabase/{client,database,mappers,seedService}
 └─ services/{asset,catalog,customDesign,designer,order,pricing,settings,workshop}
      ├─ catalogService / pricingService / seedService: KHÔNG còn importer
      └─ orderService / settingsService / workshopService / designerService: đang dùng

UI: src/frontend/ui (29 module) + src/frontend/components (53 file)
State: src/frontend/stores (cart/UI) + src/stores (4 admin/MES) — 2 thư mục song song
```

---

## 3. Route / page inventory (23 màn + 7 redirect)

| # | Path | View / wrapper | Guard | Data hiện tại | Nguồn | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | `/` | HomeView | — | products, site_content, materials | DB + props | ✅ thật |
| 2 | `/explore` | ExploreView | — | products, materials, pricing | DB + props | ✅ thật |
| 3 | `/products/:productId` | ProductDetailView | — | product, materials, pricing | DB + props | ✅ thật (reviews UI-only) |
| 4 | `/personalize` | PersonalizeView | — | products[0], materials | DB + props | ✅ UI + cart |
| 5 | `/personalize/:productId` | PersonalizeRoute | — | product, materials | DB + props | ✅ UI + cart |
| 6 | `/quote` | Tool3DView (lazy) | — | file người dùng, printers/materials, pricing | client parser + DB | ⚠️ partial |
| 7 | `/cart` | CartView | — | Zustand `vcube_cart_store` | localStorage | ⚠️ local-only |
| 8 | `/checkout` | CheckoutView | — | cart, orders, settings | DB write | ⚠️ partial |
| 9 | `/order-success` | OrderSuccessView | — | orders | DB/state | ✅ |
| 10 | `/order-success/:orderId` | OrderSuccessRoute | — | order | DB/state | ✅ |
| 11 | `/tracking` | OrderTrackingView | — | guest RPC `get_order_by_guest_token` | DB RPC | ✅ |
| 12 | `/tracking/:orderId` | OrderTrackingRoute | — | order | DB/state | ✅ |
| 13 | `/orders` | MyOrdersView | ProtectedRoute | orders | DB | ✅ |
| 14 | `/assets` | AssetLibraryView | ProtectedRoute | AssetService signed URL | Storage | ❌ `order_files` chưa ghi |
| 15 | `/designer` | DesignerDashboardView (lazy) | RoleGuard designer/admin | tabs + DB | DB | ⚠️ partial |
| 16 | `/designer/:tab` | DesignerDashboardView | RoleGuard | 5 tab | DB | ⚠️ partial |
| 17 | `/admin` | AdminDashboardView (lazy) | RoleGuard admin | 11 panel | DB | ⚠️ partial |
| 18 | `/admin/:section` | AdminDashboardView | RoleGuard | section từ URL | DB | ⚠️ partial |
| 19 | `/lab` | LabRoute → Onboarding hoặc WorkshopSettings (lazy) | RoleGuard lab/workshop/admin | workshop profile | DB | ⚠️ partial |
| 20 | `/lab/:tab` | WorkshopSettingsView | RoleGuard | 6 tab MES | DB | ⚠️ partial |
| 21 | `/auth/login` | LoginView | — | AuthContext | Supabase Auth | ✅ |
| 22 | `/auth/register` | RegisterView | — | AuthContext | Supabase Auth | ✅ |
| 23 | `*` | NotFoundView | — | — | — | ✅ |

**Redirect:** `/tool-3d`→`/quote`, `/my-orders`→`/orders`, `/library`→`/assets`, `/creator` + `/creator/*`→`/designer`, `/login`→`/auth/login`, `/register`→`/auth/register`.

**Lazy hiện tại:** Tool3D, AdminDashboard, DesignerDashboard, WorkshopSettings, WorkshopOnboardingWizard.  
**Eager (12):** Home, Explore, PDP, Cart, Checkout, OrderSuccess, Tracking, MyOrders, Personalize, AssetLibrary, Login, Register + 4 modal luôn mount.

---

## 4. Feature matrix

| Feature | Schema | Service | UI | Prod-ready | Thiếu gì |
|---|---|---|---|---|---|
| Auth email/password + role DB | ✅ | AuthContext | ✅ | ✅ | — |
| Google OAuth | n/a | có | cờ tắt | ❌ | cấu hình project / quyết định bỏ |
| Password reset | n/a | có | cờ tắt | ❌ | cấu hình email / quyết định bỏ |
| Catalog read + realtime | ✅ | `dbService.getProducts` | ✅ | ✅ | — |
| Product CRUD admin/designer | ✅ | `dbService.save/deleteProduct` | ✅ | ✅ | — |
| Reviews | ✅ + trigger | **không đọc/ghi** | chỉ counter | ❌ | service + UI PDP |
| Quote 3D + pricing | ✅ | client pricingEngine | ✅ | ⚠️ | Edge function/validation server |
| Cart | `cart_items` ✅ | **không** | Zustand local | ❌ | persist DB / merge |
| Checkout tạo đơn | ✅ | `orderService`/`saveOrder` | ✅ | ⚠️ | payment, order_items |
| `order_items` chia 3 bên | ✅ | **không ghi** | ❌ | ❌ | writer + admin/report |
| Payment gateway | `payment_transactions` | `recordPaymentTransaction` 0 caller | chỉ ghi method | ❌ | gateway/webhook |
| Tracking guest + 8 stage | ✅ + RPC | `getOrderByToken` | ✅ | ✅ | realtime (optional) |
| Tải file CAD số | `order_files` + `digital_assets` | `AssetService` không data | `canDownload` false | ❌ | writer + signed URL |
| Bảo hành | `warranty_claims` | **không** | modal không lưu | ❌ | service + form |
| Designer upload | ✅ | `saveProduct` | ✅ | ⚠️ | payout/license flow |
| Custom design request | ✅ + view + RPC | `customDesignService` | ✅ | ✅ | — |
| Designer payout | `designer_payout_info` chỉ bank | RPC đọc | tab rỗng | ❌ | ledger/rút tiền |
| Lab machines/materials/inventory | ✅ | `workshopService` | ✅ | ✅ | — |
| Lab queue | `orders.assigned_workshop_id` | `getMyQueueOrders` | ✅ | ❌ | **không có write path** |
| Admin dispatcher | ✅ | **không** | nút đã gỡ | ❌ | assignment service |
| KYC/NDA review | ✅ | admin panel | ✅ | ✅ | — |
| Pricing config | ✅ | `settingsService` | ✅ | ✅ | — |
| Edge Function calculate-quote | — | — | — | ❌ | chưa nối client |
| Orders realtime | ✅ broadcast | trigger server | ❌ | ❌ | client subscribe |

---

## 5. Clean-code debt (đo được)

| Chỉ số | Hiện tại | Ghi chú |
|---|---:|---|
| `isVi ?` ternary | **1.201** trong 32 file | UI đã VI-only nhưng code vẫn giữ nhánh EN chết |
| `language === 'vi'` | 46 | cùng nguồn |
| `DICTIONARY` entries / `en:` fields | 85 / 85 | phần lớn en không bao giờ render |
| `t()` calls | 15 | dictionary gần như không dùng |
| `any` | 139 | `strict: false` |
| raw `<button>` / `<Button>` | 255 / 392 | còn drift |
| raw `<input>` / `<Input>` | 145 / 175 | còn drift |
| raw `<select>` / `<Select>` | 26 / 41 | còn drift |
| `localStorage` | 38 | cache products/materials/printers/siteContent + giỏ |
| god files > 2.000 LOC | 6 | App 2.152 · PricingConfig 3.079 · WorkshopSettings 2.574 · workshopService 2.243 · ModelViewer3D 2.116 · Group1 2.081 |
| file > 1.000 LOC | 19 | xem `wc -l` |
| dead files (0 importer) | 4 service + 3 shim | xem `DEAD-CODE.md` |
| dead UI primitive | 3 | Section 117 · Toolbar 87 · ToastViewport 297 |
| dead `dbService` methods | 6 | ~168 LOC |
| empty mock constants | 12+ | `src/data/mockData.ts` |
| stale test/config | `test-pricing.ts` 357 LOC + firebase/metadata | imports file không tồn tại |
| docs | 122 file; 39 plans archived | AGENTS/README/schema/RLS lệch |

---

## 6. Data/backend gaps (không xoá DB trong đợt clean-code)

Các bảng có schema+RLS nhưng **chưa có writer/reader client**: `order_items`, `order_files`,
`digital_assets` (khách), `cart_items`, `warranty_claims`, `reviews`, `cost_rules`,
`workshop_commission_terms`, `payment_transactions` (0 caller), `designer_payout_info` (chỉ RPC).
Đây là **feature gap**, không phải dead schema — không drop bảng/cột; plan tách “feature wiring”
khỏi “clean code”.

---

## 7. Docs drift

| Tài liệu | Ghi sai | Thực tế |
|---|---|---|
| `AGENTS.md` | chuỗi 3 migration, “không tạo migration mới”, 31 bảng/1 view, 13 hàm/7 trigger, 90/6 policy | 12 migration; 32 bảng/2 view; 19 hàm/9 trigger; 92 policy hiệu lực/7 storage |
| `docs/README.md` | 31 bảng/1 view, 90/6 | 32/2, 92/7 |
| `docs/database/schema.md` | 31/1, 13/7, thiếu 9 migration W2 | lạc hậu |
| `docs/security/rls-policies.md` / `rls-runbook.md` | 6 storage, vài chỗ 31 bảng | 7 storage, 32 bảng |
| `docs/plans/**` | 39 file SUPERSEDED | chỉ tham khảo lịch sử |
| `docs/tasks/ui-redesign/` | v2 Warm Studio | đã bị v3 thay; archive |
| `docs/pages/_routes.generated.md` | có thể lệch hash | regenerate |
| `docs/tasks/as-is/**` | snapshot 2026-10-19 | UI v3 đã đổi; cần đánh dấu snapshot/refresh |

---

## 8. Ưu tiên tổng thể

| Ưu tiên | Việc | Lý do |
|---|---|---|
| **P0** | Checkpoint/commit working tree; branch clean-code | 113 file dính; tránh trộn |
| **P1** | Xoá dead code an toàn + dependency/shim | giảm LOC, graph, rủi ro đọc sai |
| **P1** | Một ngôn ngữ: xoá 1.201 nhánh `isVi`/DICTIONARY EN | giảm ~2.000 LOC, hết dead branch |
| **P2** | Hợp nhất data/state: bỏ localStorage cache DB, gom store/service | một nguồn sự thật |
| **P2** | Tách god file: App, PricingConfig, WorkshopSettings, ModelViewer3D, Group1 | maintain/review |
| **P2** | Bundle: lazy 3D/routes/confetti, prune iconMap/deps | giảm initial ~40–50% gzip |
| **P3** | Docs-as-code + test thật | hết drift, chặn hồi quy |
| **P3** | Feature/data wiring (order_items, order_files, queue, payout…) | sau UI/clean-code |
