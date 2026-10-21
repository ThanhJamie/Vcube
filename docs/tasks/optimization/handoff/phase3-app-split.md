<!-- doc-meta: status=active; verified=2026-10-21; owner=design-foundation -->
# HANDOFF — Phase 3c: tách `src/App.tsx` (routes / shell / hooks)

> **Work item:** `task-30` · **Agent:** `design-foundation` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `387e86c` + Phase 3a/3b (task-28) unstaged.
> **Trạng thái:** DONE — behavior-preserving, lint/build xanh, không commit/push.
> **Không sửa:** views, components khác, backend, `package.json`, `src/index.css`, `src/stores`.
> **Build vào `dist-ssr/p3c/`** (gitignored) — **không ghi `dist/`**.

---

## 1. Kết quả đo

| Chỉ số | Trước | Sau | Δ |
|---|---:|---:|---:|
| `src/App.tsx` | **2.090 dòng** | **1.100 dòng** | **−990 (−47,4%)** — target ≤ ~1.300 ✅ |
| `git diff --stat src/App.tsx` | — | — | **+63 / −1.116** |
| File mới | 0 | **10 file / 1.207 dòng** | xem §2 |
| effect `useEffect` | **9** | **10** | +1 = **tách 1 effect bootstrap thành 2 theo domain** (xem §4.1 — deps y hệt) |
| `supabase.channel('public:products')` | 1 | 1 | 0 |
| `supabase.removeChannel(...)` | 1 | 1 | 0 |
| Route path trong `<Routes>` | 30 | 30 | **0 đổi** (danh sách khớp 1-1) |
| JSX `MainApp` (return…`);`) | 26.846 ký tự | 26.846 ký tự | **byte-identical** (sha256 `aaee28f6…`) |
| bundle entry | (rổ 2b2: 691.048 raw / 184.439 gzip9) | 690.279 raw / **185.224 gzip9** | ~trung tính (chunk graph đổi nhẹ; không phải mục tiêu phase) |
| lazy chunks | 5 view ngoài critical path | **vẫn 5 chunk riêng** | 0 đổi |

---

## 2. Bản đồ vùng → file đích (line-map)

| Vùng cũ (App.tsx) | Nội dung | Đích mới |
|---|---|---|
| 89–344 | `ProtectedRoute`, `ExploreRoute`, `ProductDetailRoute`, `PersonalizeRoute`, `resolveOrderById`, `OrderSuccessRoute`, `OrderTrackingRoute`, `OrderNotFoundView` | **`src/frontend/routes/routeWrappers.tsx`** (284 dòng, named exports; lazy declaration của Personalize/OrderSuccess/OrderTracking chuyển theo) |
| 364–402 | `DashboardNavItem/Group`, `LAB_NAV`, `DESIGNER_NAV` | **`src/frontend/components/shell/navConfig.ts`** (61) |
| 404–506 | `DashboardShell` | **`src/frontend/components/shell/DashboardShell.tsx`** (119) |
| 508–524 | `LabDashboardShell` | **`src/frontend/components/shell/LabDashboardShell.tsx`** (22) |
| 526–542 | `DesignerDashboardShell` | **`src/frontend/components/shell/DesignerDashboardShell.tsx`** (22) |
| 544–616 | `LabRoute` (+ lazy WorkshopSettingsView/WorkshopOnboardingWizard) | **`src/frontend/components/shell/LabRoute.tsx`** (84) |
| — | barrel shell | **`src/frontend/components/shell/index.ts`** (6) |
| 629–1046 (+ effects 771–892, 1338–1396) | products/materials/printers/accessories, refs chống double-fetch/revision, realtime products, CRUD optimistic+rollback+toast | **`src/frontend/hooks/useCatalogData.ts`** (326) |
| 677/700/707–727, 846–874 (phần settings), 974–1011, 1418–1427 | siteContent, pricingConfig, marketplace fee + subscribe, effectivePricingConfig, 2 handler lưu DB | **`src/frontend/hooks/useSiteSettings.ts`** (149) |
| 674–675, 881–892, 1048, 1306–1416 | orders, assets, activeOrder, admin-fetch effect, `handleOrderCompleted`, `handleUpdateOrderStatus` | **`src/frontend/hooks/useOrdersData.ts`** (134) |
| còn lại | imports/lazy (đã trim), MainApp JSX/`<Routes>`/footer/modals/FAB/toasts, cart handlers, `handleNavigate`, `App` export | **`src/App.tsx`** (1.100) |

> View eager `ExploreView`/`ProductDetailView` + lazy `PersonalizeView`/`OrderSuccessView`/`OrderTrackingView` được import/khai báo trong `routeWrappers.tsx` (nơi duy nhất dùng); `WorkshopSettingsView`/`WorkshopOnboardingWizard` chuyển vào `LabRoute.tsx`. Không đổi cách code-split: build vẫn tạo đủ 5 chunk lazy riêng.

---

## 3. Hook contracts

### 3.1 `useCatalogData({ showToast })`

**Input:** `{ showToast: (msg: string) => void }` (CRUD cần toast; truyền vào thay vì hook tự lấy store để không tạo phụ thuộc ẩn).
**Tự dùng:** `useAuth()` (user/role/authLoading) — cùng context, không state trùng.
**Output `CatalogData`:**

| Field | Type | Nguồn/ghi chú |
|---|---|---|
| `products` | `Product[]` | DB duy nhất; khởi tạo `[]` |
| `productsLoading` / `productsError` | `boolean` | loading nạp catalog / lỗi boolean (không lộ message) |
| `loadProducts` | `() => Promise<void>` | `useCallback([])`; double-fetch guard + revision guard + auth-key refetch queue |
| `materials` / `printers` / `accessories` | `MaterialProfile[]` / `PrinterProfile[]` / `AccessoryItem[]` | fetch 1 lần; bảng rỗng = thật |
| `handleAddNewProduct` / `handleUpdateProduct` / `handleDeleteProduct` | `(…) => Promise<void>` | optimistic + rollback + toast y nguyên |
| `handleUpdateMaterials` / `handleUpdatePrinters` / `handleUpdateAccessories` | `(…) => void` | upsert phần còn + xoá phần bị bỏ (y nguyên) |

**Effect sở hữu:** mount-ref `[]`; auth-fetch `[authLoading, user?.id, role, loadProducts]`; realtime products `[]`; materials/printers/accessories `[]`.

### 3.2 `useSiteSettings()`

**Output `SiteSettings`:**

| Field | Type | Ghi chú |
|---|---|---|
| `siteContent` | `SiteContentConfig` | khởi tạo `DEFAULT_SITE_CONTENT`, nạp DB |
| `pricingConfig` | `InkiriCostFormulaConfig \| null` | `null` = chưa cấu hình ⇒ views hiện `—` |
| `effectivePricingConfig` | `InkiriCostFormulaConfig \| null` | `useMemo([pricingConfig, marketplaceFeePercent])`, chỉ bù `platformCommissionPercent` bằng số thật |
| `handleUpdateSiteContent` | `(c) => Promise<WriteResult>` | `dbService.saveSiteContent`, trả kết quả thật |
| `handleUpdatePricingConfig` | `(c) => Promise<WriteResult<InkiriCostFormulaConfig>>` | `settingsService.savePricingConfig` (validate + audit + cache + realtime) |

**Effect sở hữu:** subscribe settings `[pricingConfig]`; bootstrap pricing/siteContent `[]`.

### 3.3 `useOrdersData()`

**Tự dùng:** `useAuth()` (`role`), `useCartStore` (selector `clearCart` — chuyển từ App xuống, cùng store/selector).
**Output `OrdersData`:** `orders`, `assets`, `activeOrder`, `setActiveOrder`, `handleOrderCompleted`, `handleUpdateOrderStatus` (kiểu chữ ký y nguyên bản cũ).
**Effect sở hữu:** admin orders fetch `[role]`.

---

## 4. Bằng chứng behavior-preserving

### 4.1 `useEffect` deps — before vs after (AST scan)

**BEFORE (9 effect) — `/tmp/App.before-p3c.tsx`:**

```
[user?.id] · [pricingConfig] · [] · [authLoading, user?.id, role, loadProducts] · []
· [] · [role] · [location.pathname, isChatOpen, isCartDrawerOpen] · [isLoggedIn, user, mergeGuestCart]
```

**AFTER (10 effect):**

```
App.tsx:              [isLoggedIn, user, mergeGuestCart] · [location.pathname, isChatOpen, isCartDrawerOpen]
LabRoute.tsx:         [user?.id]
useCatalogData.ts:    [] · [authLoading, user?.id, role, loadProducts] · [] · []
useSiteSettings.ts:   [pricingConfig] · []
useOrdersData.ts:     [role]
```

→ Multiset deps **khớp hoàn toàn**, chỉ **+1 `[]`**: đúng 1 effect bootstrap cũ (`getPricingConfig + getSiteContent +
getMaterials + getPrinters + getAccessories`) được **tách theo domain** thành 2 effect `[]` (settings: 2 call;
catalog: 3 call) — mỗi effect giữ cleanup `isMounted`; không đổi thứ tự fetch/không phụ thuộc nhau.
Đây là **khác biệt cấu trúc duy nhất** được phép; không effect nào bị đổi deps.

So với `git show HEAD:src/App.tsx` (9 effect, channel `'public:products'`, removeChannel 1): **khớp**.

### 4.2 Realtime / side-effects

| Kiểm | Before | After |
|---|---|---|
| `supabase.channel(...)` | 1 — `'public:products'` | **1 — `'public:products'`** (cùng `.on('postgres_changes', { event:'*', schema:'public', table:'products' }, cb)` + `.subscribe()`) |
| `supabase.removeChannel(channel)` | 1 | **1** (cleanup y nguyên) |
| `settingsService.subscribeSettings(...)` | 1 | **1** (cleanup `unsubscribe` y nguyên) |
| `window.addEventListener('scroll')` FAB | 1 (passive) | **1** (cùng rAF throttle/600ms settle/400ms evaluate/cleanup) |
| mergeGuestCart effect | `[isLoggedIn, user, mergeGuestCart]` | **giữ nguyên ở App.tsx** |
| localStorage cache | 0 code (task-28) | **0 code** (chỉ comment nhắc "cache đã bỏ") |

### 4.3 JSX / route / props — không đổi

- Khối `MainApp.return (...)` **byte-identical** trước/sau: `len=26.846`, sha256 `aaee28f60de4b0f5…` (script trích theo marker rồi so).
- **30 route path** trong `<Routes>` khớp 1-1 (kể cả redirect `/tool-3d`, `/creator/*`, `/library`, `/login`, `/register`, `/my-orders`).
- Props truyền views/RoleGuard/ProtectedRoute giữ nguyên tên + giá trị (JSX nguyên văn).
- `handleNavigate` (adapter screen→URL), cart handlers, footer, FAB, toast live-region, modals giữ nguyên ở App.
- Lazy declarations chỉ **di chuyển vị trí** (cùng `import()` + `.then(m => ({default: m.X}))`), không đổi view nào sang eager.

### 4.4 Không state trùng / không `any` mới

- Mỗi state chỉ khai 1 lần (`products`, `materials`, `printers`, `accessories`, `siteContent`, `pricingConfig`,
  `marketplaceFeePercent`, `orders`, `assets`, `activeOrder`) — `grep useState` trong hooks: không trùng tên.
- `any` trong file mới đều là **di chuyển nguyên văn** (`payload?: any` của onNavigate, `payload.new/old` của
  Supabase callback, `catch (e: any)` của settings) — **không thêm any mới**. App.tsx chỉ còn 1 `any` (payload
  `handleNavigate`, giữ nguyên).
- Không đổi store selector: cart 7 selector ở App + 1 `clearCart` ở hook = 8 như cũ; UI store 11 selector như cũ.

---

## 5. Gates

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** (tsc --noEmit, rc=0) |
| Build | **PASS** — `npx vite build --outDir dist-ssr/p3c --emptyOutDir` (`✓ built in 4.81s`, entry `index-D3jLx4zC.js`) |
| Entry | 690.279 raw / **185.224 gzip9**; CSS `index-G97cpGoT.css` 89.454 / 15.581 (hash không đổi) |
| Lazy chunks | **5 view ngoài critical path vẫn chunk riêng** (Personalize 46,4K · OrderSuccess 8,7K · OrderTracking 18,2K · WorkshopSettings 56,7K · Onboarding 38,7K) |
| `dist/` | **không ghi**; `dist-ssr/` gitignored |

---

## 6. Browser smoke — **CHƯA CHẠY ĐƯỢC** (blocked by environment)

Đã cố chạy headless Chromium từ cache Playwright + CDP (Node 24 `WebSocket`) trên 5 route × 390/1440:

```
~/.cache/ms-playwright/chromium-1244/chrome-linux64/chrome:
  error while loading shared libraries: libnspr4.so: cannot open shared object file
~/.cache/ms-playwright/chromium_headless_shell-1244/chrome-headless-shell-linux64/chrome-headless-shell:
  error while loading shared libraries: libnspr4.so
```

- `libnspr4` không có trên máy (`ldconfig -p | grep libnspr4` = 0), không có `playwright`/`puppeteer` module trong repo;
  không thể `apt install` trong phiên này ⇒ **không chụp/đo DOM được**. **Không** kết luận smoke PASS.
- Phần chạy được: `npx vite preview --outDir dist-ssr/p3c --port 4173` + HTTP check — **`/`, `/products/x`, `/cart`,
  `/checkout`, `/orders` đều 200** (SPA fallback hoạt động với build mới). Supabase paused ⇒ mọi route sẽ dùng
  empty/loading state dù mở browser.
- **Đề nghị QA W6**: chạy browser smoke trên máy có Playwright deps (`libnspr4`) — 5 route × 390/1440, kỳ vọng
  **0 pageerror, 0 overflow**; so sánh DOM/toast/cart flow trước-sau (hành vi được bảo chứng bằng JSX byte-identical
  + deps/realtime parity ở §4 nên rủi ro chủ yếu là lỗi import/khởi tạo — đã được lint+build che).

---

## 7. Rủi ro & lưu ý

1. **Effect bootstrap tách 2** (§4.1): chấp nhận có chủ đích; nếu reviewer muốn đúng 1 effect thì phải gộp 2 domain
   (không nên — sẽ tái phụ thuộc chéo domain).
2. **Thứ tự khai báo effect/hook thay đổi** (merge-cart effect giờ đứng trước FAB; fetch settings/catalog chạy trong
   hook). Các effect độc lập, không có thứ tự nhân quả; deps giữ nguyên từng cái.
3. **`handleNavigate` vẫn ở App.tsx** (~155 dòng) — cố ý giữ vì phụ thuộc nhiều domain (orders/cart/toast/role);
   Phase 4 có thể tách `useAppNavigation` + route table.
4. **Route table vẫn ở App.tsx** đúng chỉ đạo (Phase 4 mới tách). Khi tách `<Routes>` cần chuyển props y nguyên —
   `MainApp` hiện chỉ còn destructure hook + local UI state nên đã sẵn sàng.
5. **Lazy declaration di chuyển**: nếu sau này ai import trực tiếp `PersonalizeView`/`OrderSuccessView`/
   `OrderTrackingView` từ App.tsx sẽ không còn biến local đó — dùng `@frontend/views/*` như các nơi khác.
6. **`activeOrder`** không còn lộ ra App (không dùng ở JSX); hook vẫn giữ để `handleUpdateOrderStatus` đồng bộ.
7. Không có dependency mới; không đổi `src/stores` (agent khác đã move ở 3a/3b — không chạm).

---

## 8. Lệnh tái lập

```bash
npm run lint
npx vite build --outDir dist-ssr/p3c --emptyOutDir
wc -l src/App.tsx                                  # 1.100

# parity effect/realtime (script tạm /tmp/parity-p3c.cjs):
node /tmp/parity-p3c.cjs                           # deps multiset + channel/removeChannel
git show HEAD:src/App.tsx > /tmp/App.HEAD.tsx      # đối chiếu HEAD: 9 effect, 1 channel, 1 removeChannel

# JSX identity: trích "  return (" → "  );" của MainApp trước/sau và so sha256
# route list: grep -oE 'path="[^"]+"' src/App.tsx | sort
```
