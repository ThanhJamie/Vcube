<!-- doc-meta: status=active; verified=2026-10-21; owner=ui-auditor -->
# HANDOFF — Phase 5c: independent verification (combined bundle)

> **Work item:** `task-23` · **Verifier:** `ui-auditor` (independent of 5a/5b builders) · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `6e3247d` + **unstaged Phase-5 changes** (5a + 5b)
> **Official build:** tôi đã `rm -rf dist && npm run build` — `dist/` hiện tại là build chính thức của Phase 5
> (gitignored). `dist-ssr/` của hai builder đã cross-check xong và **đã xoá** (41 MB, gitignored).
> **Không commit/push. Không sửa `src/**`** (chỉ đọc). File này là deliverable duy nhất trong repo.
>
> ## ✅ VERDICT: **GO** (with low risks)
>
> 1. Mọi claim định lượng của 5a/5b **đã xác minh độc lập, đúng** (raw byte, chunk graph, preload, route split,
>    `confetti`, 3D lazy, fallback no-CLS).
> 2. **Initial critical payload: 464.251 B → 285.807 B gzip (−178.444 B, −38,44%)** — target ≤330 KB **PASS**,
>    dư ~44 KB.
> 3. Gates: `lint` PASS · `build` PASS · **10/10 offline gates** `KHÔNG TỆ HƠN BASELINE`.
> 4. Browser smoke độc lập trên prod preview: **28 route-check (14 route × 390/1440), 0 pageerror, 0 tràn ngang**,
>    3D canvas mount trên Home + PDP, guard `/orders` `/assets` vẫn redirect login, lazy chunk chỉ tải đúng route,
>    fallback box **=** viewer box (`sameBox=true` ở cả 390 và 1440).
> 5. Scope discipline đạt: đúng 9 file source của 5a+5b (+1 file mới), không đổi route/props/behavior, không thêm dep,
>    không hex cứng, VI-only, `role="status"` fallback.
>
> **Một điểm cần sửa tài liệu (không chặn GO):** `03-resources.md` (bị `pdp-viewer` sửa ngoài scope) — số **after**
> khớp 100% build của tôi, nhưng **delta dùng baseline pre-Phase-1 (466.642/901.288) trong khi baseline chính thức
> của Phase-1 HEAD là 464.251/892.820**, và trong cùng file có chỗ dùng baseline khác nhau — xem §9.3.

---

## 1. Phương pháp & môi trường đo

| Bước | Cách làm | Ghi chú |
|---|---|---|
| Build AFTER | `rm -rf dist && npm run build` (Vite 6.4.3) | Hash deterministic: `index-CXYaozqd.js` — **trùng khớp** `dist-ssr/p5b-after` của builder |
| Build BEFORE | `git archive HEAD \| tar -x -C /tmp/vcube-p5c-baseline` + symlink `node_modules`/`.env`, `vite build` | Không đụng cây chính; HEAD = `6e3247d` (Phase 1, chưa có Phase 5); hash `index-du8e82Q8.js` = baseline Lead |
| Kích thước | Raw = `stat`; gzip = **Node `zlib.gzipSync(level 9)`** — **cùng phương pháp** với baseline Lead (464.251 B tái tạo khớp tuyệt đối) | Cross-check bằng `gzip -9 -n` (CLI) — lệch ~1–2 KB do thư viện nén; không trộn nguồn khi so |
| Initial payload | Parse `dist/index.html`: `<script type=module src>`, mọi `<link rel=modulepreload>`, `<link rel=stylesheet>` | Nguồn sự thật của request chặn first paint |
| Browser | `vite preview --outDir dist --port 4173` + Chromium headless 1244 + SwiftShader, Playwright 1.64 (local `~/.local/share/opencode-pwlibs` cho shared libs) | Supabase paused ⇒ fixture **chỉ ở network layer** (`/tmp/vcube-fixtures.cjs`): REST products/materials/pricing, auth trả 400 |
| Viewport | 390×844 và 1440×900, `prefers-reduced-motion: reduce`, locale `vi-VN` | Ảnh: `/tmp/p5c-shots/` |

---

## 2. Before/after — initial critical payload (official numbers)

**Baseline Lead `464.251 K gzip` đã tái tạo chính xác** bằng build HEAD sạch → dùng làm BEFORE.

| Initial resource | BEFORE raw | BEFORE gzip z9 | AFTER raw | AFTER gzip z9 | Δ gzip |
|---|---:|---:|---:|---:|---:|
| `index-*.js` (entry) | 892.820 | 239.321 | **714.080** | **194.316** | **−45.005 (−18,8%)** |
| `react-vendor-*.js` (preload) | 51.499 | 18.190 | 51.499 | 18.190 | 0 |
| `supabase-vendor-*.js` (preload) | 221.007 | 57.646 | 221.007 | 57.646 | 0 |
| `three-vendor-*.js` (preload → **bỏ**) | 531.663 | 133.439 | **0 (không preload)** | **0** | **−133.439** |
| `index-*.css` (stylesheet) | 89.454 | 15.655 | 89.454 | 15.655 | 0 |
| **TỔNG INITIAL (critical)** | **1.786.443** | **464.251** | **1.076.040** | **285.807** | **−178.444 (−38,44%)** |

- **Target ≤330.000 B gzip: PASS** (285.807 B, dư **44.193 B**); target PLAN gốc (~300–330 KB / −30–35%) cũng vượt.
- Delta raw: **−710.403 B (−39,77%)**. Entry JS gzip −18,8%; toàn bộ phần còn lại của mức giảm đến từ **three rời critical path**.
- Cross-check độc lập bằng `gzip -9 -n` (CLI): BEFORE 462.217 → AFTER 284.400 (−177.817, −38,47%) — cùng kết luận.
- Vite report (tham chiếu, không dùng tính tổng): baseline index `240,15 kB gzip`; after `194,97 kB`; three `133,90 kB`; CSS `15,77 kB`.

---

## 3. Proof — `three` thực sự lazy (không còn chặn first paint)

### 3.1 `index.html` — nguồn sự thật của initial load

```html
<script type="module" crossorigin src="/assets/index-CXYaozqd.js"></script>
<link rel="modulepreload" crossorigin href="/assets/react-vendor-foTQgREL.js">
<link rel="modulepreload" crossorigin href="/assets/supabase-vendor-Dou1_KsT.js">
<link rel="stylesheet" crossorigin href="/assets/index-G97cpGoT.css">
```

`grep -c three-vendor dist/index.html` → **0**. (BEFORE có thêm `<link rel="modulepreload" … three-vendor-Dzvn5SQW.js>`.)

### 3.2 Index chunk không static-import three-vendor

```bash
grep -c 'import"\./three-vendor' dist/assets/index-*.js   # 0
grep -c 'from"\./three-vendor'   dist/assets/index-*.js   # 0
```

**`__vite__mapDeps` — giải thích false positive (đúng như 5b nói):** literal `three-vendor` trong index xuất hiện **1 lần**,
nằm trong bảng map dependency của dynamic import do Vite sinh, **không phải** static import:

```js
__vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ThreeModelViewer-bhpHjY5m.js",
"assets/react-vendor-foTQgREL.js","assets/three-vendor-DxYt6jHo.js", … ])))
```

Cùng chỗ có dynamic import thật: `import("./ThreeModelViewer-bhpHjY5m.js")`. Tiêu chí đúng là **index.html + static import**
(3.1/3.2), không dùng literal grep.

### 3.3 Chunk static-import three-vendor — cả 3 đều lazy, không chunk nào trong initial

| Chunk | raw | gzip z9 | Vì sao lazy |
|---|---:|---:|---|
| `ThreeModelViewer-bhpHjY5m.js` | 8.788 | 3.763 | chỉ được `import()` bởi wrapper `LazyThreeModelViewer` (code wrapper nằm trong index, **không** import three) |
| `PersonalizeView-Fmxq2wkx.js` | 46.459 | 13.713 | route `/personalize*` dùng `React.lazy` (5a) |
| `Tool3DView-D_6aTz7B.js` | 351.499 | 97.376 | route `/quote` đã lazy từ trước (không hồi quy) |

Không chunk nào nằm trong `index.html`; `grep -c` cho `ThreeModelViewer`/`three-vendor`/`PersonalizeView`/`Tool3DView`
trong `index.html` = **0/0/0/0**.

### 3.4 Runtime order (prod preview, Home 1440)

`performance.getEntriesByType('resource')`:
`index-CXYaozqd.js` @16 ms → `ThreeModelViewer-bhpHjY5m.js` @294 ms → `three-vendor-DxYt6jHo.js` @294 ms
⇒ three **sau** entry, không chặn parse/FCP. `/explore` idle 2,2 s: **0 request** `ThreeModelViewer-*` / `three-vendor-*`
(quick-view chưa mở) — on-demand thật.

---

## 4. Proof — 9 route chunk + `confetti` + 3D lazy chunk

| View (5a) | Chunk | raw | gzip z9 | dynamic import trong index | static import trong index |
|---|---|---:|---:|---:|---:|
| CartView | `CartView-BWpT6xwv.js` | 17.117 | 4.886 | 1 | 0 |
| CheckoutView | `CheckoutView-BjOaXf58.js` | 34.385 | 11.297 | 1 | 0 |
| OrderSuccessView | `OrderSuccessView-CgFGgB_U.js` | 9.181 | 3.054 | 1 | 0 |
| OrderTrackingView | `OrderTrackingView-BAdC0CLL.js` | 18.226 | 4.566 | 1 | 0 |
| MyOrdersView | `MyOrdersView-ChVwkIaR.js` | 16.058 | 5.234 | 1 | 0 |
| AssetLibraryView | `AssetLibraryView-BsBNWuG0.js` | 8.217 | 3.150 | 1 | 0 |
| LoginView | `LoginView-BjTT7j_D.js` | 4.309 | 1.869 | 1 | 0 |
| RegisterView | `RegisterView-BL38Rea7.js` | 10.870 | 3.695 | 1 | 0 |
| PersonalizeView | `PersonalizeView-Fmxq2wkx.js` | 46.459 | 13.713 | 1 | 0 |
| **Tổng 9 chunk** | | **164.822** | **51.464** | **9/9** | **0/9** |

- `canvas-confetti`: **0** occurrence trong `index-*.js`; chỉ `CheckoutView-BjOaXf58.js` chứa (grep -l) ⇒ chỉ tải khi mở `/checkout`.
- 3D lazy chunk: `ThreeModelViewer-bhpHjY5m.js` (8.788/3.737) + `three-vendor-DxYt6jHo.js` (531.663/133.438) +
  deps `UnifiedCadToolbar-Bu_uKYsQ.js` (3.913/1.131), `dispose-Cc0Zn8sM.js` (408/275) — tất cả ngoài initial.
- CSS **không đổi**: `index-G97cpGoT.css` 89.454/15.655 ở cả before/after.

---

## 5. Diff review — scope discipline & behavior

### 5.1 File thay đổi (so `HEAD 6e3247d`)

| File | Δ | Đánh giá |
|---|---|---|
| `src/App.tsx` | 14+ / 9− (23 dòng) | **ĐÚNG scope 5a**: xoá 9 static import; thêm 9 `React.lazy` + 5 dòng comment. Không hunk nào khác ⇒ JSX/route/props/guard giữ nguyên |
| `src/frontend/components/LazyThreeModelViewer.tsx` | **MỚI** 59 dòng | Đúng scope 5b; wrapper `React.lazy` + `Suspense`; không import `three`/lucide |
| `src/frontend/components/ThreeModelViewer.tsx` | 1+ / 1− | Chỉ `interface` → **`export interface ThreeModelViewerProps`**; scene/lights/geometry/behavior 0 đổi |
| 7 call sites (`HomeView`, `ProductDetailView`, `AssetLibraryView`, `CadQuickViewModal`, `ServiceShowcaseSection`, `DesignerUploadWizardTab`, `DesignerModelsManagerTab`) | mỗi file 1+ / 1− | Chỉ đổi import path → `…/LazyThreeModelViewer`; không đổi JSX/props |
| `docs/tasks/optimization/03-resources.md` | 203 dòng | **NGOÀI scope 5a/5b** (pdp-viewer sửa) — số after khớp build của tôi; delta baseline lẫn lộn, xem §9.3 |
| `phase5-routes.md`, `phase5-three.md` | mới | Handoff builder — tôi không sửa |

**Không có file source nào khác bị sửa.** Không đổi `package.json`, `package-lock.json`, `vite.config.ts`
(`git diff HEAD --` các file này = rỗng) ⇒ **không thêm dependency/config**.

### 5.2 Suspense coverage — 1 boundary duy nhất, đủ cho cả 3 helper route

- `src/App.tsx:1547` `<React.Suspense fallback={<PageSkeleton />}>` … `:1883` `</React.Suspense>`;
  `<Routes>` nằm trong `RouteErrorBoundary` nằm trong Suspense (`:1555-1883`).
- 9 lazy element render **trong** Routes: Cart `:1658`, Checkout `:1671`, MyOrders `:1728` (trong ProtectedRoute),
  AssetLibrary `:1743`, Login `:1874`, Register `:1876`, Personalize qua `PersonalizeRoute` `:1614/:1627`,
  OrderSuccess qua `OrderSuccessRoute` `:1685/:1695`, OrderTracking qua `OrderTrackingRoute` `:1705/:1716`.
- 3 helper (`PersonalizeRoute`/`OrderSuccessRoute`/`OrderTrackingRoute`) định nghĩa ở module scope nhưng
  **chỉ được render làm `element=` của Route** (`:256/:295/:313` chỉ nằm trong thân helper) ⇒ khi lazy child suspend,
  boundary gần nhất vẫn là `:1547`. Không thêm Suspense thứ hai, fallback vẫn `PageSkeleton` duy nhất.
- Không có nơi nào render 9 view ngoài `<Routes>` (đã grep toàn App.tsx).

### 5.3 Wrapper `LazyThreeModelViewer` — chất lượng

| Tiêu chí | Kết quả |
|---|---|
| Cùng tên + cùng props + spread | ✅ `ThreeModelViewerProps` export từ file thật; spread toàn bộ props; call site JSX không đổi |
| Không kéo `three` vào index | ✅ chỉ `import type` (bị TS xoá) + `React.lazy(() => import('./ThreeModelViewer'))` |
| Không CLS | ✅ dùng **đúng chuỗi class khung** của viewer thật: `relative bg-surface-inverse select-none rounded-lg overflow-hidden border border-line flex flex-col font-sans` + cùng `className` caller + default `h-96 w-full` (so `ThreeModelViewer.tsx:409` và default `:40`) |
| A11y fallback | ✅ `role="status"` + `aria-live="polite"` + `aria-busy="true"`; nhãn VI sr-only “Đang tải trình xem 3D…”; chấm đồ hoạ `aria-hidden`, tôn trọng `motion-reduce` |
| Không hex cứng | ✅ chỉ token `bg-surface-inverse`, `bg-accent`; `grep '#hex/rgb()/hsl('` = 0 |
| VI-only | ✅ không có chuỗi English hiển thị; comment tiếng Việt |
| Không đổi hành vi viewer | ✅ `useInViewport`/scene/lights/geometry trong file gốc giữ nguyên; wrapper chỉ đổi thời điểm load module |

### 5.4 Không đổi route/props/behavior

`git diff HEAD -- src/App.tsx` chỉ có 2 hunk (import block + lazy block). Route path/slug/IA, guard
(`ProtectedRoute`/`RoleGuard`), `routeElement` helper, `Navigate` redirect, `RouteErrorBoundary`, `PageSkeleton`
không đổi. Không có raw hex/English/dep mới.

---

## 6. Gates (official build)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Lint | `npm run lint` | **PASS** (exit 0, `tsc --noEmit`) |
| Build | `npm run build` (sau `rm -rf dist`) | **PASS** — `✓ built in 4.75s`, 0 warning chặn |
| Offline gates (10) | `node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast --only check-error-handling --only check-fabricated --only check-icon-names --only check-ui-rules --only check-unitprice-multiplier --only a8-sql-syntax-check --only lint-rls-migration --only lint-rls-sources` | **PASS** — 10/10 `[ OK ]`, `KẾT QUẢ: KHÔNG TỆ HƠN BASELINE` |

```
[ OK ] check-contrast-combos rc=0 vi pham=0      [ OK ] check-ui-rules         rc=0
[ OK ] check-contrast        rc=0                [ OK ] check-unitprice-multiplier rc=0
[ OK ] check-error-handling  rc=0                [ OK ] a8-sql-syntax-check    rc=0
[ OK ] check-fabricated      rc=0                [ OK ] lint-rls-migration     rc=0
[ OK ] check-icon-names      rc=0                [ OK ] lint-rls-sources       rc=0
KẾT QUẢ: KHÔNG TỆ HƠN BASELINE (10 gate so được)
```

---

## 7. Browser smoke (prod preview, độc lập)

Môi trường: `vite preview --outDir dist --port 4173`; Chromium headless (SwiftShader) + Playwright; Supabase paused ⇒
fixture ở network layer. Script: `/tmp/p5c-probe/smoke.cjs`, `/tmp/p5c-probe/routes2.cjs`; JSON `/tmp/p5c-smoke-results.json`;
ảnh `/tmp/p5c-shots/`.

### 7.1 Core routes — 8 route × 2 viewport = 16 check, **16 PASS**

| Route | 390 | 1440 | Lazy chunk quan sát | Ghi chú |
|---|---|---|---|---|
| `/` | PASS | PASS | `ThreeModelViewer` + `three-vendor` | canvas **324×300** / **481×360**; 3D render (ảnh) |
| `/explore` | PASS | PASS | *(không có)* | idle 2,2 s: 0 request three/viewer ✅ on-demand |
| `/products/p1` | PASS | PASS | `ThreeModelViewer` + `three-vendor` | canvas **334×380** / **664×480**; 3D render |
| `/cart` | PASS | PASS | `CartView` | không tải three |
| `/checkout` | PASS | PASS | `CheckoutView` (+confetti trong chunk) | không tải three |
| `/auth/login` | PASS | PASS | `LoginView` | — |
| `/orders` | PASS | PASS | `LoginView` | final URL `/auth/login` — guard còn chạy |
| `/assets` | PASS | PASS | `LoginView` | final URL `/auth/login` — guard còn chạy |

Tất cả: **0 pageerror**, **0 tràn ngang** (`scrollWidth ≤ innerWidth+1`), 0 request lỗi ngoài Supabase fixture.

### 7.2 Lazy routes bổ sung — 6 route × 2 viewport = 12 check, **12 PASS**

| Route | Chunk | Kết quả |
|---|---|---|
| `/tracking` | `OrderTrackingView` | PASS, canvas 0, 0 error |
| `/auth/register` | `RegisterView` | PASS |
| `/personalize` | `PersonalizeView` + `three-vendor` | PASS, canvas mount (route lazy kéo three — đúng thiết kế) |
| `/personalize/p1` | `PersonalizeView` + `three-vendor` | PASS, canvas mount |
| `/order-success` | *(không có)* | PASS — guard không có order ⇒ không render lazy view (hành vi cũ) |
| `/quote` | `Tool3DView` + `three-vendor` | PASS, console route lazy cũ không hồi quy |

### 7.3 Fallback no-CLS + không flash trắng

| Viewport | Fallback box | Viewer box | `sameBox` | Nền fallback | Live-region |
|---|---|---:|---:|---|---|
| 1440 (delay chunk 1,8 s) | 481×360 | 481×360 | **true** | `rgb(28, 25, 23)` = `--color-surface-inverse` (graphite D7) | `role=status`, `aria-live=polite`, text “Đang tải trình xem 3D…” |
| 390 (delay 1,5 s) | 324×300 | 324×300 | **true** | như trên | như trên |

Ảnh đối chứng: `/tmp/p5c-shots/fallback-delayed-home.png`, `fallback-after-viewer.png`, `390-fallback.png`,
`390-after-viewer.png`, `1440-home.png`, `1440-pdp.png`, `390-home.png`, `390-pdp.png`, `390-cart.png`, `1440-login.png`…
Screenshot xác nhận: Home hero 3D (bánh răng + grid) và PDP 3D (box + grid) render thật, khung graphite D7, không flash trắng.

### 7.4 Gaps của browser verification (khai báo trung thực)

- **Chưa** test mobile thật / Safari iOS; **chưa** Lighthouse/Web Vitals (CLS chứng minh bằng box equality + screenshot,
  không phải PerformanceObserver); Chromium SwiftShader (không đại diện GPU thật).
- **Supabase paused** ⇒ dùng fixture network-layer; chưa kiểm với DB/auth thật. Vì vậy 4 view không phát chunk trong
  smoke của builder (`OrderSuccess`/`MyOrders`/`AssetLibrary`/`Personalize` khi trống dữ liệu) — tôi đã bổ sung kiểm
  `/personalize` (fixture catalog) và static proof 9/9 chunk; `MyOrders`/`AssetLibrary` chỉ chứng minh bằng static proof
  + guard redirect (không có phiên đăng nhập thật).
- Dev-mode StrictMode quick-view modal: builder đã kiểm; tôi chỉ kiểm prod (rủi ro thấp, thay đổi chỉ là import path).

---

## 8. Đối chiếu handoff của hai builder (confirm/correct)

| Claim | Kiểm độc lập | Kết luận |
|---|---|---|
| 5a: `App.tsx` 14+/9−, chỉ 9 import→lazy | `git diff HEAD` đúng 2 hunk, 14+/9−; không đổi JSX | ✅ **ĐÚNG** |
| 5a: 9 chunk lazy tồn tại + dynamic import, static import = 0 | §4 (9/9 dyn=1, static=0) | ✅ **ĐÚNG** |
| 5a: `confetti` rời initial, chỉ trong CheckoutView | index=0; `grep -l` = CheckoutView | ✅ **ĐÚNG** |
| 5a: Suspense 1 boundary, 3 helper route nằm trong | §5.2 | ✅ **ĐÚNG** |
| 5a: initial JS+CSS gzip 464,25 → 286,74 (−38,1%) | Đo lại Node z9: **464.251 → 285.807 (−38,44%)** | ✅ **ĐÚNG** (chênh 0,9 KB do gzip method, cùng kết luận) |
| 5a: BEFORE index 884,98 kB (isolated A/B) | `dist-ssr/p5a-before` = 884.975 B | ✅ đúng artifact — **nhưng** đây là tree đã có 5b, không phải baseline HEAD; baseline chính thức = **892.820** (xem §9.3) |
| 5b: wrapper 59 dòng, `import type`, fallback cùng khung, VI, role=status | §5.3 + CLS test | ✅ **ĐÚNG** |
| 5b: `ThreeModelViewer` chỉ đổi 1 dòng `export interface` | diff 1+/1− | ✅ **ĐÚNG** |
| 5b: 7 call site mỗi file 1 dòng import | diff 7 × (1+/1−) | ✅ **ĐÚNG** |
| 5b: `three-vendor` rời `index.html`; 3 chunk static import đều lazy | §3.1/3.3 | ✅ **ĐÚNG** |
| 5b: `/explore` idle 0 request three | smoke 2,2 s idle = 0 | ✅ **ĐÚNG** |
| 5b: PDP canvas 664×480, Home render, pageerror 0 | đo lại đúng 664×480 / 481×360; 0 pageerror | ✅ **ĐÚNG** |
| 5b: fallback box = viewer box (no CLS) | `sameBox=true` ở 390 và 1440 | ✅ **ĐÚNG** |
| 5b: `PHASE 5a` cần land cùng 5b để three rời initial | §3 + build p5b (726.275, three preload) vs combined (714.080, không preload) | ✅ **ĐÚNG** |
| 5b: "12-route smoke 0 pageerror" | 28 check độc lập, 0 pageerror | ✅ **ĐÚNG** |

---

## 9. `03-resources.md` (file bị sửa ngoài scope) — sanity check số liệu

### 9.1 Số **after** — khớp 100% build chính thức của tôi

| Chỉ số trong `03-resources.md` | Build của tôi | Khớp |
|---|---|---:|
| `index-*.js` 714.080 / 194.316 | 714.080 / 194.316 (Node z9) | ✅ |
| `three-vendor` 531.663 / 133.438 | 531.663 / 133.438 | ✅ |
| `supabase-vendor` 221.007 / 57.646 | 221.007 / 57.646 | ✅ |
| `react-vendor` 51.499 / 18.190 | 51.499 / 18.190 | ✅ |
| CSS 89.454 / 15.655 | 89.454 / 15.655 | ✅ |
| Initial critical 1.076.040 / 285.807 | 1.076.040 / 285.807 | ✅ |
| `dist/` total 10.450.040 = assets 2.843.653 + wasm 7.604.031 (+ root 2.356) | đúng từng phần (assets 2.843.653; wasm 7.604.031; index.html+favicon 2.356) | ✅ |
| 40 file trong `dist/assets` | 40 | ✅ |
| 14 module lazy (9 mới + 5 cũ) | đúng | ✅ |

### 9.2 Điểm **chưa đúng/không nhất quán** (không ảnh hưởng verdict)

1. **Baseline delta bị lẫn:** `03-resources.md` §0 báo “Delta so baseline: 466.642 → 285.807 (−38,7%)” và
   “index −187.208 raw / −47.356 gzip” — đây là baseline **pre-Phase-1** (build 10:13: 1.795.301/466.642;
   index 901.288/241.672). Nhưng baseline chính thức Lead giao cho Phase 5 là **Phase-1 HEAD `6e3247d`**:
   **464.251 gzip** (đã kiểm khớp) và index **892.820/239.321**. Tính đúng theo baseline Phase-1:
   - critical: **464.251 → 285.807 = −178.444 (−38,44%)**;
   - index raw: **892.820 → 714.080 = −178.740 (−20,03%)**;
   - index gzip: **239.321 → 194.316 = −45.005 (−18,80%)**.
   Con số after vẫn đúng; chỉ delta bị phóng thêm phần Phase-1 (−2.391 gzip / −8.468 raw index).
2. **Trong cùng file dùng 2 baseline khác nhau:** §0 dùng pre-Phase-1 (187.208/47.356), còn §1.7 L2 lại dùng
   Phase-1 (178.740/45.005) — cần thống nhất một baseline (đề xuất: Phase-1 HEAD 464.251/892.820 như brief).
3. Ghi chú phương pháp gzip nên ghi rõ là **Node z9** (khớp 464.251/285.807); CLI `gzip -9` cho số nhỏ hơn ~1–2 KB.

**Kết luận:** số after và mọi kết luận định lượng của Phase 5 **đúng**; chỉ cần sửa 3 dòng baseline/delta trong
`03-resources.md` (doc fix, không phải code fix).

---

## 10. Rủi ro & follow-up (không chặn GO)

| # | Mức | Vấn đề | Đề xuất |
|---|---|---|---|
| 1 | Trung bình | `supabase-vendor` vẫn eager **57.646 B gzip (20,2% critical)**; `@supabase/supabase-js` chiếm phần lớn initial còn lại | Phase 5 tiếp theo: lazy client/service theo route hoặc tách `createClient` (cần audit trước, không thuộc Phase 5) |
| 2 | Trung bình | **Home vẫn tải three sau first paint** (lazy chunk 3,7 KB + three 133,4 KB) vì hero render viewer ngay ⇒ network Home vẫn ~133 KB sau FCP | Quyết định B1 (thay hero bằng poster) — ngoài scope Phase 5; nếu giữ viewer, chấp nhận network cost sau first paint |
| 3 | Trung bình | Entry còn **714 KB raw / 194 KB gzip**: 4 modal luôn mount (`AuthModal` 17,9K, `InvoiceModal` 9,8K, `CartDrawer` 8,9K, `ChatSupportModal` 3,2K), iconMap/lucide, phần Home/Explore/PDP eager | Follow-up phase: lazy 4 modal theo nhu cầu mở; tách iconMap; xem `03-resources.md` backlog |
| 4 | Thấp | Lần đầu vào route tải thêm 1,9–13,6 KB gzip; fallback `PageSkeleton` toàn trang có thể thấy ~vài trăm ms trên mạng chậm; **chưa có prefetch/preload on hover** | Cân nhắc `modulepreload` khi hover nav (không thêm dep); hoặc chấp nhận |
| 5 | Thấp | Chunk-load fail (mạng chập) chưa có auto-retry; `RouteErrorBoundary` bắt lỗi render/import nhưng cần user thao tác lại | Ghi nhận; hành vi bằng 5 console route lazy sẵn có |
| 6 | Thấp | `/personalize` kéo theo `three-vendor` (route lazy) — đúng thiết kế nhưng nếu tối ưu hơn có thể tách viewer trong Personalize | Follow-up |
| 7 | Thấp | `03-resources.md` delta baseline lẫn (mục §9.2) | Docs owner sửa 3 dòng baseline (Phase-1 HEAD) |
| 8 | Thấp | QA gaps: chưa mobile thật/Safari, chưa Lighthouse, Supabase paused | QA ở W6/Phase 6 khi Resume DB |

---

## 11. Trạng thái cây & dọn dẹp

- `dist/` (11 MB) = **build chính thức Phase 5** của tôi, giữ lại cho Lead (gitignored).
- `dist-ssr/` (41 MB, gitignored, build tạm của 5a/5b) — đã cross-check xong, **đã xoá**.
- Preview server :4173 — **đã tắt** (không còn listener).
- `git status` sau verify **không đổi** so với trước verify: đúng 10 file modified + 2 handoff + 1 file mới
  (`LazyThreeModelViewer.tsx`); không có file phát sinh ngoài dự kiến.
- **Không commit/push**; HEAD vẫn `6e3247d`. Không sửa `src/**` trong quá trình verify.

---

### Phụ lục A — Bảng đầy đủ 40 asset của build chính thức

| # | Asset | Raw (B) | gzip z9 (B) | Loại |
|---:|---|---:|---:|---|
| 1 | `AdminDashboardView-B7ndL4pt.js` | 16.580 | 4.939 | Route/panel chunk |
| 2 | `AdminProductsPanel-DE3NNPGN.js` | 16.606 | 4.833 | Route/panel chunk |
| 3 | `AdminSeoPanel-DfNT72Ah.js` | 21.180 | 5.466 | Route/panel chunk |
| 4 | `AdminSettingsPanel-BhSoOUdi.js` | 8.710 | 3.464 | Route/panel chunk |
| 5 | `AdminStorefrontPanel-Deb0SBTA.js` | 31.966 | 7.339 | Route/panel chunk |
| 6 | `AssetLibraryView-BsBNWuG0.js` | 8.217 | 3.150 | Route/panel chunk |
| 7 | `CartView-BWpT6xwv.js` | 17.117 | 4.886 | Route/panel chunk |
| 8 | `CheckoutView-BjOaXf58.js` | 34.385 | 11.297 | Route/panel chunk |
| 9 | `DataTable-CD6ejzgs.js` | 11.912 | 4.740 | Shared/lazy chunk |
| 10 | `DesignerDashboardView-3AwzaPip.js` | 51.083 | 13.031 | Route/panel chunk |
| 11 | `Group0OverviewPanel-Bq0ZI4fE.js` | 16.457 | 5.416 | Route/panel chunk |
| 12 | `Group1WorkshopsPanel-e_5ixTrX.js` | 54.663 | 13.109 | Route/panel chunk |
| 13 | `Group2DesignersPanel-DBxEPTxo.js` | 27.829 | 8.015 | Route/panel chunk |
| 14 | `Group3CustomersPanel-DGDBtzXr.js` | 37.472 | 9.842 | Route/panel chunk |
| 15 | `Group4PricingEnginePanel-CbkeUwqm.js` | 163.719 | 31.631 | Route/panel chunk |
| 16 | `Group5ProductionPanel-CXwnRjej.js` | 42.137 | 11.683 | Route/panel chunk |
| 17 | `LoginView-BjTT7j_D.js` | 4.309 | 1.869 | Route/panel chunk |
| 18 | `MyOrdersView-ChVwkIaR.js` | 16.058 | 5.234 | Route/panel chunk |
| 19 | `OrderProgress-C0Q9ZXa3.js` | 4.308 | 1.931 | Shared/lazy chunk |
| 20 | `OrderSuccessView-CgFGgB_U.js` | 9.181 | 3.054 | Route/panel chunk |
| 21 | `OrderTrackingView-BAdC0CLL.js` | 18.226 | 4.566 | Route/panel chunk |
| 22 | `PageHeader-CqVGqVN6.js` | 2.904 | 1.170 | Shared/lazy chunk |
| 23 | `PanelErrorBoundary-p9cHW4tb.js` | 1.610 | 864 | Shared/lazy chunk |
| 24 | `PersonalizeView-Fmxq2wkx.js` | 46.459 | 13.713 | Route/panel chunk |
| 25 | `RegisterView-BL38Rea7.js` | 10.870 | 3.695 | Route/panel chunk |
| 26 | `StatCard-DeYy3Xu0.js` | 2.163 | 1.073 | Shared/lazy chunk |
| 27 | `ThreeModelViewer-bhpHjY5m.js` | 8.788 | 3.763 | Shared/lazy chunk |
| 28 | `Tool3DView-D_6aTz7B.js` | 351.499 | 97.376 | Route/panel chunk |
| 29 | `UnifiedCadToolbar-Bu_uKYsQ.js` | 3.913 | 1.137 | Shared/lazy chunk |
| 30 | `WarehouseInventoryPanel-9wOLLh5r.js` | 16.409 | 4.494 | Route/panel chunk |
| 31 | `WorkshopOnboardingWizard-DECYtSIL.js` | 38.703 | 9.622 | Route/panel chunk |
| 32 | `WorkshopSettingsView-wKEu9Lgt.js` | 56.720 | 13.711 | Route/panel chunk |
| 33 | `cadParser.worker-wcZ8WCcY.js` | 66.120 | 24.090 | Worker (on-demand) |
| 34 | `dispose-Cc0Zn8sM.js` | 408 | 274 | Shared/lazy chunk |
| 35 | `index-CXYaozqd.js` | 714.080 | 194.316 | **Entry (initial)** |
| 36 | `index-G97cpGoT.css` | 89.454 | 15.655 | **CSS (initial)** |
| 37 | `pricingEngine-S41zjPCa.js` | 17.269 | 6.890 | Shared chunk |
| 38 | `react-vendor-foTQgREL.js` | 51.499 | 18.190 | **Vendor (preload)** |
| 39 | `supabase-vendor-Dou1_KsT.js` | 221.007 | 57.646 | **Vendor (preload)** |
| 40 | `three-vendor-DxYt6jHo.js` | 531.663 | 133.438 | **Lazy vendor (viewer)** |
| | **TỔNG `dist/assets`** | **2.843.653** | **760.612** | |

> Ngoài `assets/`: `dist/wasm/occt-import-js.wasm` 7.604.031 B (không nằm trong initial, chỉ tải khi parse
> STEP/IGES ở `/quote`); `dist/index.html` 1.702 B; `dist/favicon.svg` 654 B. Tổng `dist/` = 10.450.040 B.
