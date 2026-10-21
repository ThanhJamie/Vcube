<!-- doc-meta: status=active; verified=2026-10-21; owner=storefront -->
# HANDOFF — Phase 5a: lazy-load 9 route views trong `src/App.tsx`

> **Trạng thái: DONE.** `npm run lint` PASS · build PASS (build riêng vào
> `dist-ssr/p5a`, **không ghi `dist/`**). Không commit/push (Lead commit theo phase).
> Write-scope: **chỉ `src/App.tsx`** + file này. Không đụng file của `pdp-viewer` (5b), không
> đụng `src/index.css`, `vite.config.ts`, `package.json`.
>
> **Tree lúc đo:** HEAD `6e3247d` + working tree của Phase 5b (`pdp-viewer`: `LazyThreeModelViewer`)
> + thay đổi của task này. `sha256(src/App.tsx)` = `4ee322de…` (giống mốc `pdp-viewer` ghi ở
> `handoff/phase5-three.md`). Vì 5a và 5b chạy song song trên cùng cây, **hai phase phải land
> cùng nhau** để `three-vendor` rời initial load — xem §6.1.

---

## 1. Diff summary

`git diff --stat src/App.tsx` → **14 insertions(+), 9 deletions(-)**; không đổi JSX/route/props.

| Hunk | Nội dung |
|---|---|
| −9 dòng import tĩnh | `CartView, CheckoutView, OrderSuccessView, OrderTrackingView, MyOrdersView, AssetLibraryView, LoginView, RegisterView, PersonalizeView` (khối import liền nhau, lines 47–55) |
| +9 `React.lazy` | cùng tên const, đặt cạnh các lazy console route sẵn có; giữ **cùng tên** nên mọi call site JSX không đổi |
| +5 dòng comment | nêu phạm vi Phase 5a + lý do KEEP eager |

```ts
const CartView = React.lazy(() => import('@frontend/views/CartView').then((m) => ({ default: m.CartView })));
// … tương tự cho 8 view còn lại (named export ⇒ phải map `.then(m => ({ default: m.X }))`)
```

**Giữ eager (đúng yêu cầu):** `HomeView`, `ExploreView`, `ProductDetailView` (storefront critical)
và 5 route console `React.lazy` sẵn có (`Tool3DView`, `AdminDashboardView`,
`DesignerDashboardView`, `WorkshopSettingsView`, `WorkshopOnboardingWizard`) — không sửa.

**Không đổi:** route path/slug/IA, props, guard (`ProtectedRoute`/`RoleGuard`), error boundary,
`PageSkeleton` (vẫn là fallback), hành vi redirect auth.

---

## 2. Guard: không còn importer eager nào khác

Quét toàn `src/` theo tên:

```bash
for v in CartView CheckoutView OrderSuccessView OrderTrackingView MyOrdersView \
         AssetLibraryView LoginView RegisterView PersonalizeView; do
  grep -rn "views/$v'" src --include=*.ts --include=*.tsx | grep -v "views/$v.tsx"
done
# → mỗi tên chỉ khớp đúng 1 dòng import cũ trong src/App.tsx (đã xoá) ⇒ không module nào
#   khác import eager 9 view này. Không phải "ép" lazy qua một importer khác.
```

Kiểm export: cả 9 file là **named export** (`export const X: React.FC<…>`) ⇒ dùng `.then(...)`.

---

## 3. Suspense verification — 1 boundary duy nhất, không thêm fallback

`src/App.tsx` hiện tại (số dòng sau khi sửa):

| Mốc | Dòng |
|---|---:|
| `<React.Suspense fallback={<PageSkeleton />}>` | **1547** |
| `<RouteErrorBoundary>` | 1553 |
| `<Routes>` … `</Routes>` | **1556 – 1881** |
| `</React.Suspense>` | **1883** |

Mọi element lazy mới đều nằm **trong** `Routes` (⇒ trong Suspense):

| Element | Dòng render | Trong Suspense |
|---|---:|---|
| `<CartView>` | 1658 | ✅ |
| `<CheckoutView>` | 1671 | ✅ |
| `<MyOrdersView>` (trong `ProtectedRoute`) | 1728 | ✅ |
| `<AssetLibraryView>` (trong `ProtectedRoute`) | 1743 | ✅ |
| `<LoginView>` | 1874 | ✅ |
| `<RegisterView>` | 1876 | ✅ |
| `<PersonalizeRoute>` (định nghĩa 236, render `<PersonalizeView>` ở 256) | route 1614, 1627 | ✅ |
| `<OrderSuccessRoute>` (định nghĩa 282, render `<OrderSuccessView>` ở 295) | route 1685, 1695 | ✅ |
| `<OrderTrackingRoute>` (định nghĩa 303, render `<OrderTrackingView>` ở 313) | route 1705, 1716 | ✅ |

- 3 helper (`PersonalizeRoute`/`OrderSuccessRoute`/`OrderTrackingRoute`) là **component định nghĩa
  ở module scope** — bản thân định nghĩa không cần Suspense; chúng chỉ được **render** làm
  `element=` của `<Route>` (1614/1627/1685/1695/1705/1716) nên khi lazy child suspend, Suspense
  gần nhất vẫn là boundary 1547. Đã kiểm: 3 helper **không** được render ở đâu ngoài `<Routes>`.
- **Không tạo Suspense thứ hai.** Fallback vẫn là `PageSkeleton` duy nhất cho cả storefront +
  transaction + console.

---

## 4. Build & phương pháp đo (không ghi `dist/`)

```bash
# BEFORE (cô lập đúng thay đổi của Phase 5a): tạm dùng App.tsx của HEAD, cùng working tree (có 5b)
cp src/App.tsx /tmp/p5a-App-after.tsx
git show HEAD:src/App.tsx > src/App.tsx
npx vite build --outDir dist-ssr/p5a-before --emptyOutDir
cp /tmp/p5a-App-after.tsx src/App.tsx      # sha256 kiểm lại = 4ee322de… (khớp)
# AFTER
npx vite build --outDir dist-ssr/p5a --emptyOutDir
```

- `dist-ssr/` đã gitignore (`git check-ignore dist-ssr`); **không** chạy `npm run build` vì script
  ghi `dist/` (baseline của Lead + agent khác build song song). Build dùng chung pipeline Vite ⇒
  tương đương gate build.
- Cặp before/after chạy **trên cùng cây** (cùng mọi file khác, chỉ khác `src/App.tsx`) ⇒ delta dưới
  đây quy đúng cho Phase 5a.

---

## 5. Số đo

### 5.1 Cặp before/after cô lập (cùng tree, chỉ khác `App.tsx`)

Số theo output Vite (cùng thang với baseline Lead):

| Chỉ số | BEFORE (App.tsx HEAD) | AFTER (5a) | Δ |
|---|---:|---:|---:|
| `index-*.js` raw | 884.98 kB | **714.08 kB** | **−170.90 kB (−19.3%)** |
| `index-*.js` gzip | 237.43 kB | **194.97 kB** | **−42.46 kB (−17.9%)** |
| `three-vendor` trong initial (modulepreload) | **có** (133.90 gzip) | **không** | **−133.90 kB gzip khỏi initial** |
| Initial JS gzip (entry + mọi `modulepreload`) | **447.33 kB** | **270.97 kB** | **−176.36 kB (−39.4%)** |
| CSS (`index-*.css`) | 89.45 kB / 15.77 gzip | 89.45 kB / 15.77 gzip | 0 |
| Initial JS+CSS gzip | **463.10 kB** | **286.74 kB** | **−176.36 kB (−38.1%)** |

Kiểm chéo bằng `gzip -9` trên file thật (không phụ thuộc Vite report):
`index` before 235,459 B → after **193,249 B** (−42.21 kB, −17.9%) — khớp bảng.
(`gzip -6` cho after = 193,936 B — đây là con số `pdp-viewer` ghi ở handoff 5b; raw **714,080 B**
giống nhau, chỉ khác mức nén.)

### 5.2 So với baseline Phase-1 Lead đưa (HEAD trước 5a/5b)

| Chỉ số | Baseline Phase-1 | Sau 5a+5b (đo ở đây) | Δ |
|---|---:|---:|---:|
| `index-*.js` gzip | **240.15 kB** | **194.97 kB** | **−45.18 kB (−18.8%)** |
| Initial JS+CSS gzip | **≈464.25 kB** | **286.74 kB** | **−177.5 kB (−38.2%)** |
| `three-vendor` initial | 531.66 kB / 133.37 gzip | **0** | −133.37 gzip |

> Mục tiêu Phase 5 trong `PLAN.md` là initial ~466 → 300–330 kB gzip (−30–35%); đo được
> **286.74 kB (−38.2%)** — vượt mục tiêu. Nhưng **phần lớn −176 kB đến từ ba-vendor rời initial**,
> thành quả **chung của 5a (PersonalizeView) + 5b (LazyThreeModelViewer)**, không quy riêng 5a.

### 5.3 9 chunk lazy mới (after)

| Chunk | raw kB | gzip kB |
|---|---:|---:|
| `CartView-BWpT6xwv.js` | 17.12 | 4.90 |
| `CheckoutView-BjOaXf58.js` | 34.39 | 11.32 |
| `OrderSuccessView-CgFGgB_U.js` | 9.18 | 3.06 |
| `OrderTrackingView-BAdC0CLL.js` | 18.23 | 4.57 |
| `MyOrdersView-ChVwkIaR.js` | 16.06 | 5.24 |
| `AssetLibraryView-BsBNWuG0.js` | 8.22 | 3.16 |
| `LoginView-BjTT7j_D.js` | 4.31 | 1.87 |
| `RegisterView-BL38Rea7.js` | 10.87 | 3.70 |
| `PersonalizeView-Fmxq2wkx.js` | 46.46 | 13.74 |
| **Tổng 9 chunk** | **164.84** | **51.56** |

→ index raw giảm 170.90 kB ≈ tổng chunk (164.84 kB) + phần khung route/import map được Vite dọn;
chunks chỉ tải khi vào route tương ứng.

### 5.4 `canvas-confetti` rời initial (yêu cầu kiểm)

```bash
$ grep -c confetti dist-ssr/p5a-before/assets/index-*.js   # 1  (nằm trong initial)
$ grep -c confetti dist-ssr/p5a/assets/index-*.js          # 0
$ grep -l confetti dist-ssr/p5a/assets/*.js | xargs -n1 basename
CheckoutView-BjOaXf58.js                                    # chỉ chunk CheckoutView
```
Đúng: `canvas-confetti` chỉ được import bởi `CheckoutView` ⇒ nay chỉ tải khi mở `/checkout`.

### 5.5 Static proof — chunk lazy không nằm trong initial load

```bash
# index.html (nguồn sự thật của initial load) — chỉ còn react + supabase
$ grep -oE '(<script[^>]+>|<link[^>]+modulepreload[^>]+>)' dist-ssr/p5a/index.html
<script type="module" crossorigin src="/assets/index-CXYaozqd.js">
<link rel="modulepreload" crossorigin href="/assets/react-vendor-foTQgREL.js">
<link rel="modulepreload" crossorigin href="/assets/supabase-vendor-Dou1_KsT.js">

# mỗi view là DYNAMIC import trong index, không static import
$ for v in CartView CheckoutView …; do grep -oE "import\(\"\./$v-[A-Za-z0-9_-]+\.js\"\)" index-*.js; done
import("./CartView-BWpT6xwv.js") … import("./PersonalizeView-Fmxq2wkx.js")   # đủ 9/9
$ grep -cE '(import|from)"\./(CartView|CheckoutView|…)-' dist-ssr/p5a/assets/index-*.js
0
```

---

## 6. Browser smoke — prod build, 390 + 1440

Serve bản build thật: `npx vite preview --outDir dist-ssr/p5a --port 4399`, Chromium headless
(SwiftShader), `prefers-reduced-motion: reduce`, Supabase bị chặn ở network layer (project paused).

| Route | 390 | 1440 | Lazy chunk tải | Ghi chú |
|---|---|---|---|---|
| `/` | OK | OK | `ThreeModelViewer` 200 | Home eager; 3D lazily tải sau first paint |
| `/explore` | OK | OK | — | Explore eager, không tải three |
| `/products/probe` | OK | OK | — | PDP eager; catalog rỗng ⇒ trạng thái không tìm thấy |
| `/cart` | OK | OK | `CartView` 200 | |
| `/checkout` | OK | OK | `CheckoutView` 200 | kéo theo `canvas-confetti` |
| `/orders` | OK | OK | `LoginView` 200 | `ProtectedRoute` redirect login **vẫn chạy** |
| `/tracking` | OK | OK | `OrderTrackingView` 200 | |
| `/assets` | OK | OK | `LoginView` 200 | `ProtectedRoute` redirect login **vẫn chạy** |
| `/auth/login` | OK | OK | `LoginView` 200 | |
| `/auth/register` | OK | OK | `RegisterView` 200 | |
| `/personalize` | OK | OK | — | A11 guard: catalog rỗng ⇒ `NotFoundView`, **không** render `PersonalizeView` (đúng hành vi cũ) |
| `/quote` | OK | OK | `Tool3DView` 200 | lazy console sẵn có, không hồi quy |

Tổng: **12 route × 2 viewport = 24 lượt, 0 pageerror, 0 request lỗi (ngoài Supabase bị chặn chủ
động), 0 tràn ngang, fallback `PageSkeleton` biến mất sau ~0.85 s** (local, chunk 2–14 kB gzip).

> `OrderSuccessView`, `MyOrdersView`, `AssetLibraryView`, `PersonalizeView` **không** phát request
> chunk trong smoke vì dữ liệu/phiên trống: `/orders`+`/assets` bị guard chặn trước khi render
> view, `/order-success` không có order để render, `/personalize` rơi vào guard catalog rỗng.
> Đó là hành vi cũ giữ nguyên (guard short-circuit trước khi chạm lazy) — không phải lỗi; cả 4
> chunk đã có trong build và là dynamic import trong index (§5.5).

Script: `/tmp/p5a-probe/smoke-final.mjs`; log build `/tmp/p5a-before.log`, `/tmp/p5a-after.log`.

---

## 7. Gate

| Gate | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS** (0 lỗi) |
| Build | **PASS** — `npx vite build --outDir dist-ssr/p5a --emptyOutDir` (5.3 s, 0 warning chặn) |
| `npm run build` vào `dist/` | **KHÔNG chạy** — Lead yêu cầu không ghi `dist/`; dùng build tương đương ở trên |
| 9 chunk lazy tồn tại + dynamic import | **ĐẠT** — §5.3/§5.5 |
| `confetti` rời initial | **ĐẠT** — §5.4 |
| Suspense | **ĐẠT** — 1 boundary duy nhất, 9/9 element + 3 helper nằm trong — §3 |
| Scope diff | **ĐẠT** — chỉ `src/App.tsx` (+ file handoff này), 14+/9− |
| Browser 390/1440 | **ĐẠT** — §6, 0 error/0 overflow |

---

## 8. Rủi ro / ghi chú cho Lead

1. **Phụ thuộc chéo 5a ⇄ 5b (quan trọng):** `three-vendor` chỉ rời initial khi **cả hai** có mặt:
   - 5b một mình: `App.tsx` cũ còn eager `PersonalizeView → PersonalizeModelViewer3D → three`
     ⇒ three **vẫn** trong initial (đo được: initial JS gzip **447.33**).
   - 5a một mình: `HomeView`/`ProductDetailView` còn import tĩnh `ThreeModelViewer`
     ⇒ three **vẫn** trong initial (đối chiếu `phase5-three.md` §3.1: 406.83 gzip).
   - **Cả hai:** initial JS gzip **270.97** (`three-vendor` = 0 trong `index.html`).
   ⇒ **Commit/land 2 phase cùng lượt** (hoặc rebuild lại và cập nhật số sau khi land đủ) — đừng
   kết luận “5a không giúp three rời initial”.
2. **Số đo phụ thuộc thời điểm cây:** cặp before/after ở §5.1 chạy trên cùng cây (có 5b). Khi Lead
   commit xong 5a+5b, nên chạy lại 1 lần `vite build` sạch để lấy số “official” (chunk hash sẽ đổi).
3. **Khác biệt gzip nhỏ giữa các lần build đo độc lập:** `index` raw trùng tuyệt đối **714,080 B**;
   gzip −9 = 193,249 B, −6 = 193,936 B, Vite report 194.97 kB. Dùng **raw + ghi rõ mức nén** khi so
   sánh; đừng trộn 3 nguồn.
4. **Chi phí mới khi điều hướng:** lần đầu vào mỗi route tải thêm 1.87–13.74 kB gzip; fallback
   `PageSkeleton` toàn trang trong lúc chờ (local ~0.85 s tổng cả app + chunk). Chưa thêm
   `modulepreload`/prefetch khi hover/nav — có thể làm tiếp ở Phase 5 nếu muốn giảm cảm giác chờ.
5. **Chunk load fail (mạng chập):** `RouteErrorBoundary` nằm trong Suspense nên lỗi render/import
   reject sẽ vào màn lỗi route (có nút thử lại/thoát); **không có auto-retry chunk**. Hành vi này
   bằng với các console route lazy sẵn có.
6. **Chỉ 1 Suspense quanh `<Routes>`:** nếu sau này có ai render 1 trong 9 lazy view **ngoài**
   `<Routes>` (vd. modal/portal cấp App), phải tự bọc Suspense — hiện tại không có chỗ nào như vậy.
7. **`OrderSuccessView`/`MyOrdersView`/`AssetLibraryView`/`PersonalizeView` chưa quan sát được lúc
   tải trong smoke** do dữ liệu/phiên trống (§6) — nên QA kiểm khi có đơn/đăng nhập thật (sau khi
   Supabase resume) để chắc chunk 200 + UI đúng.
8. **Không đổi behavior**: auth redirect (`/orders`,`/assets`), guard catalog rỗng
   (`/personalize`), route 404, error boundary đều giữ nguyên — đã smoke.
9. **Dọn build tạm:** `dist-ssr/p5a`, `dist-ssr/p5a-before` đều gitignored; có thể xoá sau khi Lead
   đối chiếu. Không xoá gì ngoài `dist-ssr/`.

## 9. Checklist tự kiểm

- [x] Chỉ sửa `src/App.tsx` (+ handoff); không file khác, không `dist/`.
- [x] 9 lazy đúng tên/cùng tên, JSX/route/props không đổi.
- [x] Home/Explore/PDP giữ eager; 5 console lazy không đổi.
- [x] 3 helper render function nằm trong Suspense; không thêm fallback thứ hai.
- [x] Không còn importer eager nào khác cho 9 view.
- [x] `confetti` rời initial; 9 chunk mới có dynamic import trong index.
- [x] lint PASS, build PASS, smoke 390/1440 PASS.
