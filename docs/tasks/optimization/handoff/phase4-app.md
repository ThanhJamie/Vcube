<!-- doc-meta: status=active; verified=2026-10-21; owner=design-foundation -->
# HANDOFF — Phase 4d: App.tsx 1.100 → 343 dòng (route table + useAppNavigation)

> **Work item:** `task-35` · **Agent:** `design-foundation` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `dd0b86b` (Phase 1–3 pushed) + thay đổi 4d **unstaged**.
> **Trạng thái:** DONE — behavior-preserving, lint/build xanh, browser smoke PASS. Không commit/push.
> **Chỉ sửa:** `src/App.tsx`, `src/frontend/routes/**`, `src/frontend/hooks/useAppNavigation.ts`,
> `src/frontend/components/shell/**` + file này. Không đụng views/components/hooks khác/backend/`package.json`/`dist/`.

---

## 1. Kết quả đo

| Chỉ số | Trước | Sau | Δ |
|---|---:|---:|---:|
| `src/App.tsx` | **1.100 dòng** | **343 dòng** | **−757 (−68,8%)** — target ≤600 ✅ |
| `git diff --stat src/App.tsx` | — | — | **+61 / −818** |
| File mới | 0 | **4 file / 1.006 dòng** | AppRoutes 457 · AppOverlays 327 · useAppNavigation 203 · screens 19 |
| `useEffect` (toàn graph liên quan) | **10** | **10** | 0 — deps multiset **giống hệt** |
| `supabase.channel('public:products')` / `removeChannel` | 1 / 1 | 1 / 1 | 0 |
| `subscribeSettings` / `addEventListener('scroll')` | 1 / 1 | 1 / 1 | 0 |
| Dynamic import trong entry chunk | **15** | **15** | 0 |
| Static ref tới lazy chunk trong entry | **0** | **0** | 0 |
| Route path | 30 | 30 | 0 |

---

## 2. Bản đồ vùng → file đích

| Vùng cũ (App.tsx) | Nội dung | Đích mới |
|---|---|---|
| dòng 260–414 | `handleNavigate` ("Central Navigation Adapter Bridge", 153 dòng logic) | **`src/frontend/hooks/useAppNavigation.ts`** — hook giữ nguyên body, nhận `{ role, isLoggedIn, orders, setActiveOrder, setAppliedDiscount, showToast }`, tự `useNavigate()`; trả `{ handleNavigate }` |
| dòng 499–824 | **`<Routes>…</Routes>`** (30 route + comments) | **`src/frontend/routes/AppRoutes.tsx`** — component nhận 1 props object; lazy declaration của 9 view chỉ route table dùng + `HomeView` eager + route wrappers + `DesignerDashboardShell`/`LabRoute`/`RoleGuard`/`NotFoundView` đặt tại đây; `labRouteElement` chuyển nguyên văn vào |
| dòng 830–1082 | FAB, toast live-region, AuthModal, ChatSupportModal, InvoiceModal, CartDrawer, footer storefront | **`src/frontend/components/shell/AppOverlays.tsx`** — JSX **byte-identical**; component tự `useLanguage()` + select UI store (cùng store/selector), nhận props dữ liệu/handler |
| dòng 230–235 | `CHROMELESS_SCREENS`, `FAB_HIDDEN_SCREENS` | **`src/frontend/components/shell/screens.ts`** — dùng chung App + AppOverlays, điều kiện render không đổi |
| phần còn lại | imports/lazy (trim), hook wiring, merge-cart + FAB effect, cart handlers, `getCurrentScreenFromPath`, Header, `<React.Suspense>`+`RouteErrorBoundary` wrapper, `App()` export | **`src/App.tsx`** (343) |

### 2.1 Props contracts

**`AppRoutesProps`** (`routes/AppRoutes.tsx`) — không `any`, tsc bắt thiếu/sai prop:
- `Pick<CatalogData, 'products'|'productsLoading'|'productsError'|'loadProducts'|'materials'|'printers'|'accessories'|'handleAddNewProduct'|'handleUpdateProduct'|'handleDeleteProduct'|'handleUpdateMaterials'|'handleUpdatePrinters'|'handleUpdateAccessories'>`
- `Pick<SiteSettings, 'siteContent'|'pricingConfig'|'effectivePricingConfig'|'handleUpdateSiteContent'|'handleUpdatePricingConfig'>`
- `Pick<OrdersData, 'orders'|'assets'|'handleOrderCompleted'|'handleUpdateOrderStatus'>`
- thêm: `cart`, `appliedDiscount`, `setInvoiceOrder`, `handleAddToCart`, `handleUpdateQuantity`, `handleRemoveItem`, `handleNavigate: AppNavigate`, `showToast`, `setIsChatOpen`.

**`AppOverlaysProps`** (`shell/AppOverlays.tsx`): `role`, `siteContent`, `cart`, `invoiceOrder`, `setInvoiceOrder`,
`handleUpdateQuantity`, `handleRemoveItem`, `handleNavigate`, `showToast`, `fabRef`, `isFabHidden`, `currentScreen`.
Tự select UI store: auth modal 3, chat 2, cart drawer 2, toast 2 (cùng `useUIStore`, cùng selector như bản cũ).

**`useAppNavigation`**: input `{ role: string; isLoggedIn: boolean; orders: Order[]; setActiveOrder; setAppliedDiscount; showToast }`
→ output `{ handleNavigate: AppNavigate }`. `AppNavPayload` bao đủ field bridge dùng: `product, order, orderId, category, search, tag, materialId, tab, section, appliedDiscount`
(thay `payload?: any` — không đổi runtime; payload lạ vẫn truyền tiếp qua `navigate(..., { state: payload })`).

---

## 3. Bằng chứng behavior-preserving

### 3.1 Sha256 khối JSX/logic (byte-identical)

| Khối | Số ký tự | Before sha256 | After sha256 | Kết quả |
|---|---:|---|---|---|
| `<Routes>…</Routes>` | 12.058 | `2cdcbdb14861b1dd5811763e0ecf14f5…` | **giống** | ✅ identical |
| `handleNavigate` body (trong `{ }`) | 4.585 | `a6f03590826c6610b76f98ae404b53c5…` | **giống** | ✅ identical |
| Overlays block (FAB→footer) | 12.626 | `e1929ade7c0c079d6ab6ddd51a716d3a…` | **giống** | ✅ identical |

Script so khớp: trích marker trong `/tmp/App.before-p4d.tsx` vs file mới rồi `sha256` — cả 3 **bằng
nhau tuyệt đối**, không chỉnh whitespace/nội dung.

### 3.2 Route table

- 30 `path="…"` khớp 1-1 trước/sau (kể cả redirect `/tool-3d`, `/creator`, `/creator/*`, `/library`,
  `/login`, `/register`, `/my-orders`, và fallback `*`).
- Thứ tự route + props views/RoleGuard/ProtectedRoute giữ nguyên (JSX nguyên văn).

### 3.3 Effects / realtime / lazy (AST scan + build)

```
effects BEFORE: 10 | AFTER: 10
deps multiset identical: true
  []×4 · [authLoading, user?.id, role, loadProducts] · [isLoggedIn, user, mergeGuestCart]
  · [location.pathname, isChatOpen, isCartDrawerOpen] · [pricingConfig] · [role] · [user?.id]
channel: "'public:products'" -> "'public:products'"
removeChannel: 1 -> 1 | subscribeSettings: 1 -> 1 | scroll listener: 1 -> 1
```

- Entry chunk (`dist-ssr/p4d/assets/index-*.js`): **dynamic `import(` = 15**, **static reference tới
  chunk lazy = 0** (giống baseline `dist-ssr/p4d-before`). 5 view lazy ngoài critical path vẫn chunk
  riêng (Personalize, OrderSuccess, OrderTracking, WorkshopSettings, Onboarding).
- `App.tsx` vẫn sở hữu merge-cart + FAB effect (state `isFabHidden`/`fabRef` ở App, truyền xuống
  `AppOverlays`) ⇒ **không di chuyển effect nào**, chỉ di chuyển JSX.

---

## 4. Gates

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** (rc=0, `tsc --noEmit`) |
| Build | **PASS** — `npx vite build --outDir dist-ssr/p4d --emptyOutDir` (lần cuối sau khi các agent khác settle: `✓ built in 8.95s`, entry `index-BFjLXzc6.js`) |
| Entry | 692.526 raw / **186.277 gzip9** (delta so với baseline 690.279 raw — phần lớn do agent khác sửa song song backend/Tool3D/admin trong lúc verify; refactor 4d trung tính về bundle: 15 dynamic import / 0 static ref như baseline) |
| `dist/` | **không ghi**; `dist-ssr/` gitignored |

> ⚠️ Trong lúc verify, các agent khác đang refactor `workshopService`/workshop-settings + Tool3D/PricingConfig;
> lint/build có lúc đỏ **tạm thời ở file của họ** (không phải file 4d). Lần chạy cuối sau khi họ settle:
> **lint rc=0, build rc=0**, parity sha256 vẫn identical, smoke 12/12 PASS trên build cuối. Không file nào
> của họ bị tôi sửa/revert.

---

## 5. Browser smoke — **PASS** (Chromium cache + `~/.local/share/opencode-pwlibs`)

`LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu` + `npx vite preview --outDir dist-ssr/p4d`;
CDP qua Node 24 (không cần playwright). **6 route × 390/1440 = 12 check:**

| Route | Kết quả |
|---|---|
| `/` | root render, header+main, **canvas 3D = 1**, 0 pageerror, 0 overflow |
| `/products/nonexistent-slug` | not-found state đúng (catalog paused), 0 pageerror, 0 overflow |
| `/cart` | empty-cart state (empty state đúng), 0 overflow |
| `/checkout` | empty-cart state, 0 overflow |
| `/orders` | **redirect `/orders` → `/auth/login`** đúng ProtectedRoute, 0 pageerror |
| `/auth/login` | render form, 0 overflow |

- **0 pageerror / 0 overflow trên 12/12 check**; `scrollWidth ≤ innerWidth` (390 = 390; 1440 → 1434 do scrollbar).
- Click "Giỏ hàng" ở 390: CartDrawer (trong `AppOverlays`) mở, `body { overflow: hidden }`, **0 pageerror**.
- **Toast add-to-cart chưa exercise được**: Supabase paused + catalog rỗng/sample mode ⇒ không có nút
  "Thêm vào giỏ" nào trên Home/Explore để bấm. Đã xác nhận live-region `role="status"` tồn tại và
  `handleAddToCart`/`handleRemoveItem` **không đổi** (App.tsx giữ nguyên handler; JSX toast byte-identical
  trong AppOverlays) ⇒ đề nghị QA W6 thử khi DB resumed.

---

## 6. Rủi ro & lưu ý (Phase 6)

1. **`AppOverlays` tự select `useUIStore`** (9 selector) thay vì nhận qua props: cùng store/selector, không
   tạo state trùng; nhưng nếu sau này đổi cấu trúc store cần sửa cả App + AppOverlays (đã ghi chú trong file).
2. **`AppRoutes` nhận props từ hook contracts qua `Pick<…>`**: thêm field mới cho views phải thêm vào
   `AppRoutesProps` + truyền ở App (tsc bắt) — đúng thiết kế, tránh prop ngầm.
3. **`handleNavigate` payload type** đổi từ `any` → `AppNavPayload`: call-site hiện tại không đổi (views truyền
   `any`/object literal). Nếu tương lai thêm field payload mới mà bridge dùng, phải bổ sung interface.
4. **`screens.ts`** là nơi mới giữ `CHROMELESS_SCREENS`/`FAB_HIDDEN_SCREENS` — sửa điều kiện shell/route phải
   sửa ở đây (App + AppOverlays dùng chung).
5. **`App()` export + Providers + `ScrollToTop`** giữ nguyên. `<React.Suspense>` + `RouteErrorBoundary` vẫn ở
   App (bọc `AppRoutes`) ⇒ lazy fallback/route error reset giữ nguyên hành vi.
6. **Phase 6 (route polish)**: route table giờ là 1 file độc lập, có thể thêm route guard/layout/nested route
   mà không chạm App; nhớ giữ `labRouteElement` pattern và cập nhật parity test nếu đổi path.
7. Không thêm dependency; không `any` mới (payload `any` cũ đã thay bằng interface); không đổi `dist/`.

---

## 7. Lệnh tái lập

```bash
npm run lint
npx vite build --outDir dist-ssr/p4d --emptyOutDir
wc -l src/App.tsx                                   # 343

# parity sha256 (script tạm /tmp):
python3 - <<'PY'   # trích 3 khối từ /tmp/App.before-p4d.tsx vs file mới, in sha256
...
PY

# effect/channel parity
node /tmp/parity-p4d.cjs

# smoke (Chromium cache + libs từ opencode):
LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu \
  node /tmp/smoke-p4d.mjs
```
