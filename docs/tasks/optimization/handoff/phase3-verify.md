<!-- doc-meta: status=active; verified=2026-10-21; owner=ui-auditor -->
# HANDOFF — Phase 3d: independent verification (single data source · store merge · App split)

> **Work item:** `task-31` · **Verifier:** `ui-auditor` (độc lập với 3a/3b/3c) · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `387e86c` (Phase 2 committed) + **unstaged Phase 3**
> **Phạm vi:** read-only `src/**`; chỉ ghi file này; **không commit/push**. Official `dist/` Phase 3 giữ lại cho Lead.
> **Preview :4175 đã tắt sau smoke.** Baseline Phase 2 dựng lại độc lập từ `HEAD` trong `/tmp` (`git archive` + symlink
> `node_modules`/`.env`). Không có `dist-ssr` sót lại.
>
> ## ✅ VERDICT: **GO**
>
> 1. **Dữ liệu một nguồn:** 0 code đọc/ghi cache DB-backed; localStorage còn đúng 2 key ngoài phạm vi (auth demo),
>    0 key DB (`vcube_products/materials/printers/site_content/pricing_config`) trong `localStorage` sau khi chạy app.
>    *Nit:* còn **1 comment** chứa literal `vcube_printers` (grep gate “0” không đạt tuyệt đối — xem §7.1).
> 2. **Store hợp nhất:** `src/stores` không tồn tại; 0 path cũ trong `src/`; 13 import đều `@frontend/stores/*`;
>    4 file move chỉ khác **đường dẫn tương đối độ sâu** (`../`→`../../`), không đổi logic/API/state.
> 3. **App split tương đương hành vi:** `App.tsx` **2.153 → 1.100 dòng** (`git diff +63/−1.116`); 10 file mới 1.207 dòng.
>    AST độc lập xác nhận: **9→10 effect** (multiset deps khớp, chỉ +1 `[]` do tách bootstrap),
>    **MainApp JSX return byte-identical** (sha256 `e280c0a0…`, 26.849 ký tự), **`<Routes>` byte-identical**
>    (`bcd48d1e…`, 30 path 1:1), `handleNavigate` + `App()` byte-identical, 36 `useState` trùng khớp,
>    16 service-call trùng multiset, store selector 8 cart + 11 UI trùng, 12/12 declaration move tương đương text,
>    **0 vòng import** (143 file), 15 dynamic import / 0 static cho lazy chunks.
> 4. **D11l:** 7 hằng rỗng đã bị Lead xoá; **0 code importer** toàn `src/`+`scripts` (chỉ còn 4 comment lịch sử);
>    10 export còn lại đều có importer (PRODUCTS vẫn được `scripts/test-catalog-sync.ts` dùng).
> 5. **Gates:** `lint` PASS · `build` PASS · **10/10 offline gates** `KHÔNG TỆ HƠN BASELINE`.
> 6. **Bundle:** initial critical **275.930 → 277.322 B gzip (Node z9; +1.392 B, +0,50%)** — tăng nhẹ, **không**
>    có drop bất thường, **không** chunk mới (40 asset / 39 logical JS chunk trước=sau). Builder báo “~trung tính”
>    do **trộn 2 phương pháp gzip** (xem §5).
> 7. **Browser smoke:** **24 route-check** (12 × 390/1440) — **0 pageerror, 0 overflow, 0 white screen, 0 cache key**;
>    canvas 3D Home/PDP; lazy chunk đúng route; `/orders` `/assets` redirect login; **add-to-cart + toast + /cart**
>    hoạt động ở cả 2 viewport; DB-down không trắng màn, empty state đúng; reload hiển thị lại dữ liệu **từ DB fixture**
>    (không phải cache).

---

## 1. Dữ liệu một nguồn (localStorage cache đã bỏ)

| Kiểm | Lệnh | Kết quả |
|---|---|---|
| Key DB-backed trong `src/` | `grep -rEn "vcube_products\|vcube_materials\|vcube_printers\|vcube_site_content\|vcube_pricing_config" src/` | **0 code**, **1 comment** (`Group1WorkshopsPanel.tsx:111` — xem §7.1) |
| `localStorage` trong `App.tsx` | `grep -n "localStorage" src/App.tsx` | **0** (rc=1) |
| Key `localStorage.*` còn lại trong `src/` | grep toàn `src/` | **2**: `vcube_active_local_user`, `vcube_guest_role` (AuthContext — **file không bị sửa** ⇒ semantics nguyên vẹn) |
| Key ở HEAD (trước Phase 3) | cùng grep trên `git show HEAD` | **17** hit gồm 15 hit DB-backed (`vcube_products` 8, `materials` 2, `printers` 2, `site_content` 2, `pricing_config` 1) + 2 guest key ⇒ **đã xoá đúng 15** |
| Zustand persist | `grep "name: 'vcube_"` HEAD vs now | `vcube_cart_store` **giữ nguyên** (file store không bị sửa); không có persist key DB-backed |
| Runtime (browser) | `Object.keys(localStorage)` sau load `/` | **[]** — không có key DB nào; reload vẫn **[]** |
| DB call parity (AST) | `(dbService\|settingsService).<method>` | 16 method, multiset **identical** HEAD App ⇄ App+hooks (getProducts 1, getSiteContent 1, saveSiteContent 1, saveProduct 2, …) |

**Kết luận:** DB là nguồn duy nhất; cache localStorage DB-backed đã bị bỏ đúng; 2 key ngoài phạm vi không đổi.

---

## 2. Store hợp nhất (`src/stores` → `src/frontend/stores`)

| Kiểm | Kết quả |
|---|---|
| `src/stores` tồn tại? | **Không** (`ls` → No such file) |
| Path cũ trong `src/` | **0** (`grep "src/stores\|../../../../stores/\|../../stores/\|../stores/"` rc=1) |
| Import store | **13 dòng** tất cả `@frontend/stores/*` (App 2, hooks 1, reportError 1, admin group 4, views 3, components 2) |
| Rename detection | `git diff HEAD -M --summary`: customer **99%**, designer **99%**, production **100%**, workshop **99%** |
| Nội dung 4 file move (so `git show HEAD:src/stores/X`): | chỉ khác **depth import**: customer 1 dòng (`../backend` → `../../backend`); designer 1 dòng; production **0 dòng**; workshop **2 dòng** (`../backend`, `../types`). **Không** đổi logic/API/state/selector |
| Import ngoài alias (`../stores`, `../../stores`) | **0** |
| Store bị xoá trong phase | **0**; cả 6 store (`cart/ui` + 4 moved) vẫn có ≥1 importer ngoài chính nó (`useCartStore` 20 refs, `useUIStore` 17, `useProductionStore` 4, 3 store còn lại 2) ⇒ không có dead store mới |

---

## 3. App split — behavior parity (AST độc lập)

### 3.1 Số đo

| Chỉ số | HEAD `387e86c` | Sau Phase 3 | Δ |
|---|---:|---:|---:|
| `wc -l src/App.tsx` | **2.153** | **1.100** (`split('\n')`=1.101) | **−1.053** |
| `git diff --numstat src/App.tsx` | — | **+63 / −1.116** | net −1.053 |
| File mới | 0 | **10 file / 1.207 dòng** | hooks 609 (326+134+149) · routes 284 · shell 314 (119+22+6+22+84+61) |
| So mốc builder (sau 3a 2.090) | 2.090 | 1.100 | −990 (−47,4%) — khớp claim |

### 3.2 Parity bằng chứng (script AST, không dựa vào lời builder)

| Hạng mục | HEAD | Sau | Kết luận |
|---|---:|---:|---|
| `useEffect` | 9 | **10** | deps **multiset khớp tuyệt đối**, chỉ **+1 `[]`** = tách 1 bootstrap thành 2 theo domain |
| deps arrays | `[user?.id]`, `[pricingConfig]`, `[]×3`, `[authLoading,user?.id,role,loadProducts]`, `[role]`, `[pathname,isChatOpen,isCartDrawerOpen]`, `[isLoggedIn,user,mergeGuestCart]` | y hệt + thêm 1 `[]` | ✅ |
| `supabase.channel(...)` / `removeChannel` | 1 / 1 | **1 / 1** (channel `'public:products'` + callback/cleanup y nguyên, chuyển vào `useCatalogData`) | ✅ |
| `subscribeSettings` / `scroll` listener / `mergeGuestCart` | 1 / 1 / 4 idents | **1 / 1 / 4** | ✅ |
| 30 route path | 30 | **30, đúng thứ tự** | ✅ |
| `<Routes>` block | sha `bcd48d1ef3b05e6d` | **sha y hệt** | ✅ byte-identical |
| `MainApp` JSX return | 26.849 ký tự, sha `e280c0a0c0788235` | **y hệt** | ✅ byte-identical |
| `App()` wrapper (providers) | sha `00be3016ad085935` | **y hệt** | ✅ |
| `handleNavigate` | 4.643 ký tự, sha `fafc497da517d1d6` | **y hệt** (vẫn ở App — Phase 4) | ✅ |
| `useState` tên biến | 36 | **36, cùng tập** (products, materials, printers, accessories, siteContent, pricingConfig, marketplaceFeePercent, orders, assets, activeOrder, invoiceOrder, isFabHidden, collapsed, mobileOpen, gate, profile + setters) | ✅ không state trùng/thiếu |
| Store selector calls | cart 8 / UI 11 | **8 / 11** | ✅ |
| Service call multiset | 16 method | **16 method, cùng count** | ✅ |
| `: any` | 12 | **12** | ✅ không thêm `any` |
| React.lazy declarations | 14 view | **14, cùng tập view** (chỉ đổi vị trí: 3 route lazy → `routeWrappers`, 2 workshop lazy → `LabRoute`, 9 còn lại App) | ✅ |
| Declaration move text (normalize export+whitespace) | — | **12/12 identical** (`ProtectedRoute`, `ExploreRoute`, `ProductDetailRoute`, `PersonalizeRoute`, `resolveOrderById`, `OrderSuccessRoute`, `OrderTrackingRoute`, `OrderNotFoundView`, `DashboardShell`, `LabDashboardShell`, `DesignerDashboardShell`, `LabRoute`) + `LAB_NAV`/`DESIGNER_NAV` identical | ✅ |
| Hook contracts | — | `useCatalogData` trả 13/13 key App destructure; `useSiteSettings` trả đúng 5/5; `useOrdersData` trả 6, App dùng 5 (`activeOrder` chỉ dùng nội bộ hook — chấp nhận, P3) | ✅ |
| Dynamic imports trong index | 14 lazy view + `ThreeModelViewer` | **15 dynamic / 0 static**, chunk lazy vẫn tách | ✅ |

### 3.3 Effect split — chi tiết & thứ tự

- HEAD effect `[]` bootstrap (5 call, 7 guard `isMounted`) tách thành:
  - `useSiteSettings` `[]`: `getPricingConfig` + `getSiteContent` (4 guard);
  - `useCatalogData` `[]`: `getMaterials` + `getPrinters` + `getAccessories` (5 guard).
  Tổng **calls 5 = 5**; guard +2 vì mỗi effect có `isMounted`/cleanup riêng — **an toàn** (huỷ độc lập từng domain).
- Thứ tự thực thi effect đổi (App effects → hook effects theo thứ tự gọi hook), nhưng:
  - mỗi effect giữ **nguyên deps**; không effect nào đọc state do effect khác set trong cùng commit
    (catalog set products/materials/printers/accessories; settings set siteContent/pricingConfig; orders set orders;
    FAB chỉ đọc UI local; merge-cart đọc auth + cart store);
  - `loadProducts` vẫn `useCallback([])` ổn định — không tạo vòng refetch mới.
- Kết luận: khác biệt cấu trúc duy nhất = +1 effect `[]` (được khai báo từ handoff 3c); không đổi hành vi.

### 3.4 Circular imports / coupling

- Tarjan SCC trên **143 file** `src/**` (TS/TSX, resolve cả alias `@frontend/@backend/@` → file thật):
  **0 vòng import**.
- 3 hook mới (`useCatalogData`, `useOrdersData`, `useSiteSettings`) **không** import `App.tsx`, `routes/`,
  `components/shell/` ⇒ không coupling ngược; hooks chỉ import React, store alias, services, types.
- `routeWrappers` 10 dep; `shell` files không import App/routes.

---

## 4. D11l + mockData (Lead edits trong phase)

| Kiểm | Kết quả |
|---|---|
| 7 hằng rỗng đã xoá khỏi `src/data/mockData.ts` | `ACCESSORIES_CATALOG`, `INITIAL_CART_ITEMS`, `MOCK_ORDERS`, `DIGITAL_ASSETS`, `DEFAULT_ACCESSORIES`, `WORKSHOP_PARTNERS`, `MOCK_APP_USERS` — **đã xoá** (+5 type import không dùng) |
| Importer còn lại | `src/` + `scripts/`: **0 code ref**; chỉ 4 comment lịch sử nói “KHÔNG rơi về fixture …” (database.ts, OrderTrackingView) — không phải import |
| `App.tsx` import mockData | chỉ còn `DEFAULT_SITE_CONTENT` (config thật) — đúng D11 note |
| Remaining exports còn dùng | CATEGORIES 3 · POPULAR_TAGS 3 · MATERIALS_CATALOG 7 · PRODUCTS **3** (gồm `scripts/test-catalog-sync.ts`, `scripts/seed-sample-data.mjs`) · PRINTER_PROFILES 4 · INKIRI_REFERENCE_VALUES 2 · DEFAULT_INKIRI_FORMULA_CONFIG 6 · SAMPLE_ANALYSIS_FILES 1 · PAYOUT_TRANSACTIONS 1 · DEFAULT_SITE_CONTENT 3 ⇒ **0 export mồ côi** |
| Comment fix `Group1WorkshopsPanel.tsx` | Chỉ comment (thay mô tả cache cũ); **vẫn còn literal `vcube_printers`** trong comment → xem §7.1 |

---

## 5. Bundle delta (refactor, không đổi lazy)

**Cùng phương pháp Node `zlib.gzipSync(level 9)`** với baseline Phase 2 official:

| Chỉ số | BEFORE (HEAD Phase 2) | AFTER (Phase 3) | Δ | % |
|---|---:|---:|---:|---:|
| `index-*.js` raw | 691.048 | **690.279** | **−769** | −0,11% |
| `index-*.js` gzip z9 | 184.439 | **185.831** | **+1.392** | **+0,75%** |
| `react-vendor` raw/gzip | 51.499 / 18.190 | 51.499 / 18.190 | 0 | 0 |
| `supabase-vendor` raw/gzip | 221.007 / 57.646 | 221.007 / 57.646 | 0 | 0 |
| `index-*.css` (hash `G97cpGoT`) | 89.454 / 15.655 | 89.454 / 15.655 | 0 | 0 |
| **Initial critical raw** | **1.053.008** | **1.052.239** | **−769** | −0,07% |
| **Initial critical gzip z9** | **275.930** | **277.322** | **+1.392** | **+0,50%** |
| Toàn bộ `dist/assets` raw | 2.790.637 | 2.789.873 | −764 | −0,03% |
| Toàn bộ `dist/assets` gzip | 738.869 | 740.225 | +1.356 | +0,18% |
| Số asset file / logical JS chunk | 40 / 39 | **40 / 39** | 0 | — |

- **Không có chunk mới/không mất chunk**: tập tên chunk (bỏ hash) trước = sau (39); 72 entry "đổi" chỉ là
  **36 chunk đổi hash** (module-graph re-order do App split) — nội dung/size gần như y nguyên.
- **Không có drop >2%** (mà là tăng nhẹ +0,50% initial). Đây là **refactor**, không nhắm giảm bundle;
  chi phí tăng nhỏ đến từ wrapper/module của split.
- **Đính chính claim builder:** handoff 3c ghi entry “185.224 gzip9” so baseline “184.439” ⇒ delta +785.
  Thực ra **185.224 là `gzip -9` CLI**, còn **184.439 là Node z9** (baseline Phase 2 dùng Node z9).
  Đo cùng phương pháp: Node z9 **+1.392 B (+0,75%)**; CLI `gzip -9 -n`: **274.730 → 276.394 (+1.664, +0,61%)**.
  Kết luận “small delta” vẫn đúng, nhưng con số +785 là **trộn phương pháp** — nên chuẩn hoá Node z9 cho Phase 4.

---

## 6. Gates

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (exit 0) |
| Build | `rm -rf dist && npm run build` | **PASS** — `✓ built in 4.66s`, entry `index-D3jLx4zC.js` |
| Offline gates (10) | `node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast --only check-error-handling --only check-fabricated --only check-icon-names --only check-ui-rules --only check-unitprice-multiplier --only a8-sql-syntax-check --only lint-rls-migration --only lint-rls-sources` | **PASS** — 10/10 `[ OK ]`, `KẾT QUẢ: KHÔNG TỆ HƠN BASELINE` |
| Deps/config | `git diff HEAD -- package.json package-lock.json vite.config.ts index.html` | **rỗng** — không thêm dependency/đổi cấu hình/build entry |

---

## 7. Browser smoke (prod preview :4175 + fixture network-layer)

Chromium headless 1244 + SwiftShader, Playwright local, `LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu`
(nơi có `libnspr4`/`libnss3` — đây là lý do smoke của builder 3c bị chặn). Supabase paused ⇒ fixture `/tmp/vcube-fixtures.cjs`
(REST products/materials/pricing; auth trả 400).

### 7.1 12 route × 390/1440 = 24 check

| Kết quả | Số |
|---|---:|
| **pageerror** | **0** |
| tràn ngang | **0** |
| white screen (text <20 / root rỗng) | **0** |
| cache DB key trong `localStorage` | **0** |
| 3D canvas Home/PDP | **1** mỗi màn (390 & 1440) |
| `/orders`, `/assets` | redirect `/auth/login` (guard còn chạy) |
| lazy chunk theo route | `CartView`@/cart, `CheckoutView`@/checkout, `OrderTrackingView`@/tracking, `LoginView`@login, `RegisterView`@register, `PersonalizeView`@/personalize, `Tool3DView`@/quote, `ThreeModelViewer`@Home/PDP — **đúng route, không tải sớm** |

### 7.2 Cart flow (add-to-cart → toast → /cart) — 390 & 1440

| Bước | Kết quả |
|---|---|
| Click `Đặt In 3D` ở PDP | **clicked=true** cả 2 viewport |
| Toast | `Đã thêm 1x "Vỏ hộp IoT Công nghiệp" vào đơn hàng!` (nội dung VI, không đổi) |
| Cart store (`vcube_cart_store`) | `items=1 qty=1` |
| `/cart` | hiển thị đúng sản phẩm + **6** ký hiệu `₫` |
| pageerror trong flow | **0** |

### 7.3 DB unreachable / reload / empty states

| Test | Kết quả |
|---|---|
| `/` + `/explore` với toàn bộ `**/rest/v1/**` + `**/auth/v1/**` bị abort | **không trắng màn**, empty-state hint có (`Chưa có…`), pageerror **0**, cache key **0** |
| Reload `/` (fixture) | Product **xuất hiện lại sau reload** (network DB fixture, không phải cache); `localStorage` **[]**; pageerror **0** |
| Data single-source | network `/rest/v1/products` được gọi lại sau reload (không đọc `vcube_products`) |

### 7.4 Gaps khai báo trung thực

- **Không smoke** `/admin`, `/designer`, `/lab` (RoleGuard + Supabase paused) — parity được bảo chứng bằng JSX/route
  byte-identical + declaration text identical + tsc; cần QA lại khi Resume.
- Chưa test **auth thật/orders thật/invoice** (paused) — flow cart mới kiểm guest + fixture.
- 3D chỉ xác nhận **canvas mount + screenshot** (SwiftShader), không đo pixel/CLS web-vitals.
- Không test dev StrictMode (chỉ prod build).

---

## 8. Regression / rủi ro & follow-up

| # | Mức | Vấn đề | Đề xuất |
|---|---|---|---|
| 1 | **P3** | Grep gate “DB cache keys = 0” còn **1 hit comment**: `src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx:111` — `// … bỏ hẳn cache localStorage \`vcube_printers\`` (Lead sửa comment nhưng vẫn giữ literal key) | Viết lại comment không chứa key (vd. “cache localStorage cũ đã bỏ”) — 1 dòng, không đổi code |
| 2 | P3 | `docs/**` còn **87 hit `src/stores`** ở **37 file** (trong đó `docs/design/icon-map.md:380` là doc đang active; còn lại data-honesty/plans archive) | Docs owner cập nhật path → `src/frontend/stores`; archive plans chỉ cần ghi chú |
| 3 | P3 | Builder 3c báo gzip **trộn phương pháp** (185.224 CLI vs 184.439 Node z9) ⇒ delta +785 thay vì +1.392 | Chuẩn hoá **Node z9** cho mọi phase; ghi rõ method trong handoff |
| 4 | P3 | `useOrdersData` trả `activeOrder` nhưng App không destructure (hook dùng nội bộ cho `handleUpdateOrderStatus`) | Giữ (hợp lý) hoặc bỏ khỏi return nếu không cần public |
| 5 | Thấp | Thứ tự effect đổi do split; bootstrap tách 2 effect `[]` (chấp nhận có chủ đích) | Không cần sửa; nếu muốn đúng 1 effect thì gộp domain (không nên) |
| 6 | Thấp | 36 chunk đổi hash (cache invalidate 1 lần), react-vendor hash đổi dù size y nguyên | Bình thường sau refactor; không ảnh hưởng runtime |
| 7 | **Phase 4** | Route table `<Routes>` + `handleNavigate` (~4,6 KB) **vẫn ở App.tsx** (đúng chỉ đạo phase này) | Tách `routeTable` + `useAppNavigation` ở Phase 4 |
| 8 | **Phase 4** | **19 call `dbService.*` inline trong hooks** (catalog 14, siteSettings 4, orders 1) chưa chuyển service layer | Gom về service (giữ hook mỏng) ở phase data/service |
| 9 | Phase 4 | `useProductionStore` vẫn còn 4 ref (không dead) + 4 admin store mới move; chưa audit dead store/persist | Phase 6 review |
| 10 | — | Không đụng `.env`, `.playwright-mcp`; `dist/` official giữ; `HEAD` không đổi | — |

---

## 9. Trạng thái cây & dọn dẹp

- `dist/` (11 MB) = build official Phase 3 (`index-D3jLx4zC.js` 690.279 B) — giữ cho Lead (gitignored).
- Preview `:4175` — **đã tắt** (PID 38095; HTTP 000 xác nhận).
- `git status` trước/sau verify **không đổi**: 16 file tracked (12 modified + 4 rename) + 13 untracked
  (10 file source mới + 3 handoff builder) + file handoff này.
- **Không commit/push**; `HEAD` vẫn `387e86c`. Không sửa `src/**`.

### Phụ lục — lệnh tái lập chính

```bash
# stores
ls src/stores                                   # không tồn tại
grep -rn "src/stores\|\.\./\.\./\.\./\.\./stores/" src/   # 0
git diff HEAD -M --summary | grep stores        # 4 rename (99/99/100/99%)

# app parity
node /tmp/p3/parity.cjs                         # deps multiset, MainApp return, Routes block, state, service calls
node /tmp/p3/moved.cjs                          # 12 declaration move + App()/nav parity
node /tmp/p3/circular.cjs                       # 0 cycle / 143 file

# gates + build
npm run lint && rm -rf dist && npm run build
node scripts/run-checks.mjs --only check-contrast-combos ... (10 gate)

# smoke
./node_modules/.bin/vite preview --port 4175 --strictPort   # nền
LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu node /tmp/p3/smoke.cjs
```

Script ngoài repo: `/tmp/p3/{parity,moved,circular,measure}.cjs`, `/tmp/p3/smoke.cjs`, `/tmp/p3/smoke.json`;
baseline build `/tmp/vcube-p3-baseline/`; ảnh smoke `/tmp/p3-shot-1440-*.png`.
