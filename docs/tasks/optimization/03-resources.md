<!-- doc-meta: status=active; verified=2026-10-21; owner=resource-auditor -->
# 03 — Resource & bundle audit (read-only)

> **Snapshot:** working tree ngày **2026-10-21** (HEAD `aaff7c4`; code baseline `4d4a5d1` + Phase 1 + Phase 5a đã landed).
> **Read-only:** không sửa `src/**`, không commit; chỉ ghi file này.
> **Build đo:** **xanh lúc 10:53** (Vite **6.4.3**) — `index-CXYaozqd.js` (**714.080 B raw / 194.316 B gzip**),
> `three-vendor-DxYt6jHo.js` (**async**, không còn preload), `supabase-vendor-Dou1_KsT.js`; 40 file trong
> `dist/assets`. Baseline trước Phase 1/5a là build 10:13 (`index-C8O2jQ4p.js`, 901.288 / 241.672).
> Lần 10:33 có fail tạm thời vì `src/frontend/data/mockData.ts` bị xoá giữa chừng; shim 37 B được thêm lúc
> 10:35 và build 10:41 xanh; Phase 5a (route lazy + `LazyThreeModelViewer`) build 10:53.
> **Delta (2 mốc, đừng trộn):**
> - so **baseline phase 0** (10:13, trước Phase 1): initial critical **466.642 → 285.807 B gzip (-38,7%)**;
> - so **baseline Phase-1 HEAD `6e3247d`** (chính thức của Phase 5): **464.251 → 285.807 B gzip (-178.444, -38,44%)**;
>   `index` **892.820/239.321 → 714.080/194.316** = **-178.740 raw / -45.005 gzip**.
>
> Nếu tính cả three async thì network Home vẫn tải thêm 531.663/133.438 nhưng **sau** first paint.
> **Bổ sung cho** [`RESOURCES.md`](./RESOURCES.md): cùng baseline, nhưng tách theo source-map,
> có số raw/gzip từng module, line-level evidence và backlog đầy đủ.

### 0.1 Thay đổi đã landed **trong lúc audit** (không phải do file này)

| Thời điểm | Thay đổi | Ảnh hưởng tới audit |
|---|---|---|
| 10:27 (`4d4a5d1` + working tree) | Xoá `dotenv`, `autoprefixer` khỏi `package.json`; xoá `bun.lock`, `firebase-applet-config.json`, `firestore.rules`, `metadata.json`, `assets/.aistudio`, `test-pricing.ts`, 3 service/shim chết | §2.1/§2.6/§4: các mục tương ứng **đã DONE**, giữ lại làm baseline |
| 10:27 | `iconMap` xoá **18 key** không có literal (219 → **201** key gốc) | §2.5: số hiện tại 206 key; ước tính prune còn lại ~0 |
| 10:33 → 10:35 | `src/frontend/data/mockData.ts` bị xoá trong khi `HomeView.tsx:4` còn import `../data/mockData` → build fail; shim 37 B được thêm lại | Build **đã xanh lại 10:41** |
| **10:53** | **Phase 5a**: 9 view chuyển `React.lazy`; thêm `LazyThreeModelViewer` cho Home/PDP/Explore/AssetLibrary/Designer; three rời preload | §1.2/§1.3/§1.5/§1.7: B1+B2 **đã DONE**, đo được **-180.835 B gzip critical (-38,7%)** |

## 0. TL;DR — số đo chốt

| Chỉ số | Giá trị | Ghi chú |
|---|---:|---|
| Initial critical JS + CSS | **1.076.040 B raw / 285.807 B gzip** | build 10:53; **three đã async**; baseline 1.795.301 / 466.642 |
| `index-*.js` | **714.080 / 194.316** | 68,0% critical; entry duy nhất; baseline 901.288 / 241.672 |
| `three-vendor-*.js` | **531.663 / 133.438** | **async**, không preload; tải khi viewer render |
| `supabase-vendor-*.js` | **221.007 / 57.646** | 20,2% critical |
| `react-vendor-*.js` | **51.499 / 18.190** | 6,4%; **không** chứa phần lớn react-dom |
| `index-*.css` | **89.454 / 15.655** | 5,5% |
| `dist/` toàn bộ | **10.450.040 B** | 2.843.653 assets + 7.604.031 wasm |
| `public/wasm/occt-import-js.wasm` | **7.604.031 B** (7,25 MiB) | gzip -9 = **3.091.489 B**; không nằm trong initial |

**Kết luận ngắn**

1. Baseline: `three` eager **không phải do `manualChunks` sai**, mà do **5 chuỗi import tĩnh** từ các view
   eager (`src/App.tsx:44-55`). `manualChunks` chỉ đổi tên chunk; chunk vendor vẫn là static import của
   entry nên bị `modulepreload`. **Phase 5a đã sửa đúng cách**: `LazyThreeModelViewer` +
   `React.lazy` cho 9 route; build 10:53 **không còn `<link rel=modulepreload three-vendor>`**.
2. Baseline **12/16 view eager**, chỉ **5 module** dùng `React.lazy` (`src/App.tsx:82-88`). Phase 5a
   lazy hoá 9 view; hiện chỉ Home/Explore/PDP còn eager (`src/App.tsx:44-46`). Bốn modal nặng vẫn
   **luôn mount** ở `App.tsx:1973-2002`.
3. `index` baseline 901 KB: **20,2% react-dom-client** bị đặt sai chunk, **9,5% lucide**, **~26% code
   view không phải Home**. Current 714 KB sau khi 9 view rời entry + 18 icon bị prune.
4. **Đo được sau Phase 5a:** critical gzip **466,6 → 285,8 KB (-38,7%)**; index **-187.208 B raw /
   -47.356 B gzip**; three **rời preload**. Nếu Home thay hero bằng poster thì network trang chủ cũng
   bỏ luôn 133,4 KB three; nếu giữ viewer, three tải **sau** first paint.
5. `jszip` + loader 3MF/OBJ chỉ dùng cho định dạng tương ứng nhưng nằm cứng trong chunk `/quote`
   (**~36 KB gzip**); `occt` glue **58,8 KB / 89,9%** worker chunk bị tải cho cả STL > 2 MB.
6. Ba vấn đề runtime đáng tiền hơn byte: **2–3 WebGL context render 60 fps liên tục** trên Home,
   **rebuild geometry mỗi tick slider** ở Personalize, **worker + WASM compile lại mỗi lần parse**
   STEP/IGES.
7. **Trạng thái hiện tại:** Phase 1 + Phase 5a đã xử lý các mục lớn nhất (three, 9 route, 18 icon,
   `dotenv`/`autoprefixer`, `bun.lock`, remnant Firebase); build 10:53 xanh. Backlog còn lại nằm ở
   `/quote` (jszip/loader), `workshopService`, modal, worker/WASM và runtime 3D.

---

## 1. Initial bundle graph

### 1.1 Số đo chunk — baseline 10:13 (trước Phase 1)

> Bảng này là **baseline** để so sánh; số sau Phase 1 ở §1.6, sau Phase 5a ở §1.7. `%` tính trên tổng
> baseline 466.642 B gzip.

| Chunk | Raw (B) | Gzip (B) | % gzip initial | Nội dung chính |
|---|---:|---:|---:|---|
| `index-C8O2jQ4p.js` | 901.288 | 241.672 | 51,8% | entry + 12 view eager + modals + iconMap + react-dom-client |
| `three-vendor-Dzvn5SQW.js` | 531.663 | 133.439 | 28,6% | `three.module.js` 344.813 + `three.core.js` 182.731 |
| `supabase-vendor-Dou1_KsT.js` | 221.007 | 57.646 | 12,4% | `@supabase/supabase-js` |
| `react-vendor-DNjtIxli.js` | 51.499 | 18.190 | 3,9% | react-router 39.542 + react 7.522 + react-dom shim 3.546 |
| `index-o-l8Q9-D.css` | 89.844 | 15.695 | 3,4% | Tailwind v4 output |
| **Initial total** | **1.795.301** | **466.642** | **100%** | chưa tính font Google (10 weight) |

Graph thực tế (rút từ `dist/index.html:16-20` + header chunk):

```text
dist/index.html:16  <script type=module src=index-*.js>
  ├─ static import react-vendor        (51,5 KB raw)   ─┐
  ├─ static import supabase-vendor     (221,0 KB raw)   ├─ modulepreload: dòng 17-19
  ├─ static import three-vendor        (531,7 KB raw)  ─┘
  ├─ static import CSS                 (89,8 KB raw)
  └─ lazy (__vite__mapDeps): Tool3DView, AdminDashboardView, DesignerDashboardView,
                            WorkshopSettingsView, WorkshopOnboardingWizard
```

`three-vendor` nằm trong **initial graph** vì entry chunk import nó trực tiếp
(`dist/assets/index-C8O2jQ4p.js` mở đầu bằng `import{…}from"./three-vendor-Dzvn5SQW.js"`), kéo theo
`<link rel="modulepreload" href="/assets/three-vendor-…js">` ở `dist/index.html:19`.
`manualChunks` (`vite.config.ts:52-56`) chỉ tách file, **không** biến nó thành lazy.

### 1.2 Vì sao `three` eager — baseline (đã fix ở Phase 5a)

> Chuỗi dưới là **nguyên nhân baseline**; từ 10:53 các importer đã chuyển sang
> `src/frontend/components/LazyThreeModelViewer.tsx` và `dist/index.html` **không còn preload three**.

| # | Chuỗi | Dòng |
|---|---|---|
| 1 | `App` → `HomeView` → `ThreeModelViewer` → `import * as THREE` | `src/App.tsx:44`, `src/frontend/views/HomeView.tsx:5`, `src/frontend/components/ThreeModelViewer.tsx:2` |
| 2 | `App` → `ProductDetailView` → `ThreeModelViewer` | `src/App.tsx:46`, `src/frontend/views/ProductDetailView.tsx:5` |
| 3 | `App` → `PersonalizeView` → `PersonalizeModelViewer3D` → `THREE` | `src/App.tsx:52`, `src/frontend/views/PersonalizeView.tsx:4`, `src/frontend/components/personalize/PersonalizeModelViewer3D.tsx:2` |
| 4 | `App` → `AssetLibraryView` → `ThreeModelViewer` | `src/App.tsx:53`, `src/frontend/views/AssetLibraryView.tsx:3` |
| 5 | `App` → `ExploreView` → `CadQuickViewModal` → `ThreeModelViewer` | `src/App.tsx:45`, `src/frontend/views/ExploreView.tsx:5`, `src/frontend/components/CadQuickViewModal.tsx:4` |

Thêm `ServiceShowcaseSection` (render trong Home) import `ThreeModelViewer` ở
`src/frontend/components/services/ServiceShowcaseSection.tsx:4`. Vì `Tool3DView` (lazy) cũng dùng
`three`, Rollup gom toàn bộ three vào `three-vendor`; chunk này vừa là dependency của entry (5 chuỗi
trên) vừa của lazy route, nên bị preload.

**Hệ quả baseline:** người vào `/` tải 531,7 KB raw / 133,4 KB gzip three **trước khi** thấy hero, dù
`useInViewport` trong `ThreeModelViewer.tsx:45` chỉ dựng WebGL renderer khi canvas vào viewport —
module three đã nằm sẵn trong bundle. **Đã fix:** `LazyThreeModelViewer` (React.lazy + Suspense fallback
cùng khung) thay 5 import site; build 10:53 không còn `three-vendor` trong preload, chunk
`ThreeModelViewer-*.js` 8,79 KB chỉ kéo three khi viewer thực sự render.

### 1.3 Vì sao nhiều view eager — baseline (đã fix một phần ở Phase 5a)

Baseline `src/App.tsx:44-55` import tĩnh **12 view**: Home, Explore, ProductDetail, Cart, Checkout,
OrderSuccess, OrderTracking, MyOrders, Personalize, AssetLibrary, Login, Register. Chỉ 5 module lazy ở
`src/App.tsx:82-88` (Tool3D, Admin, Designer, WorkshopSettings, Onboarding). Không có route-level
`React.lazy` cho 11 view còn lại; `React.Suspense` đã có sẵn ở `src/App.tsx:1547` nên việc lazy hoá
không cần thêm hạ tầng.

**Phase 5a (10:53):** 9 view chuyển `React.lazy` (`App.tsx:72-85`): Cart, Checkout, OrderSuccess,
OrderTracking, MyOrders, AssetLibrary, Login, Register, Personalize. Hiện chỉ **Home/Explore/PDP** eager
(`App.tsx:44-46`), đúng critical path storefront; 14 module lazy tổng cộng.

Bốn modal nặng bị mount thường trực (`src/App.tsx:1973-2002`): `AuthModal` (17.870 B trong index),
`InvoiceModal` (9.776), `CartDrawer` (8.885), `ChatSupportModal` (3.195) — kể cả khi `isOpen=false`.
`InvoiceModal` còn chạy `subscribeSettings` khi đóng (`InvoiceModal.tsx:58-64`).

Home tự kéo thêm component nặng: `ServiceShowcaseSection` 20.124 B, `CadQuickViewModal` 14.506 B,
`CustomIdeaRequestModal` 10.797 B, `ThreeModelViewer` 8.030 B — **~53,5 KB chỉ để render Home**.

### 1.4 `index` 901 KB gồm những gì (source-map baseline 10:13)

Build source-map riêng (`vite build --sourcemap --outDir /tmp/vcube-dist-audit`), giải mã segment để
gán byte generated cho từng source. Map phủ **879.113 / 901.331 B (97,5%)**; phần còn lại là
prelude/runtime của Rollup. `%` tính trên 879.113 B đã map.

| Nguồn | Byte | % mapped | Ghi chú |
|---|---:|---:|---|
| `react-dom-client.production.js` | 177.654 | 20,2% | **nằm trong index**, không ở `react-vendor` |
| `lucide-react` (192 icon module) | 81.818 | 9,3% | + 1.797 B hạ tầng lucide = **83.615 B** |
| `workshopService.ts` | 40.504 | 4,6% | chỉ dùng cho `/lab` (lazy route) |
| `HomeView.tsx` | 45.313 | 5,2% | |
| `ExploreView.tsx` | 41.040 | 4,7% | |
| `App.tsx` | 34.632 | 3,9% | |
| `ProductDetailView.tsx` | 33.078 | 3,8% | |
| `PersonalizeView.tsx` | 32.599 | 3,7% | |
| `frontend/ui/*` | 30.608 | 3,5% | `iconMap.ts` chỉ 4.310 B; byte icon nằm ở lucide |
| `backend/supabase/*` | 28.195 | 3,2% | `database.ts` 16.431 + `mappers.ts` 11.260 |
| `CheckoutView.tsx` | 22.089 | 2,5% | gồm `canvas-confetti` 11.087 |
| `ServiceShowcaseSection.tsx` | 20.124 | 2,3% | |
| `AuthModal.tsx` | 17.870 | 2,0% | |
| `OrderTrackingView.tsx` | 17.273 | 2,0% | |
| `CartView.tsx` | 16.413 | 1,9% | |
| `MyOrdersView.tsx` | 15.148 | 1,7% | |
| `auth/UserAvatarMenu.tsx` | 14.559 | 1,7% | |
| `CadQuickViewModal.tsx` | 14.506 | 1,7% | |
| `PersonalizeModelViewer3D.tsx` | 12.330 | 1,4% | |
| `context/*` | 12.315 | 1,4% | Auth + Language |
| `Header.tsx` | 12.100 | 1,4% | |
| `canvas-confetti` | 11.087 | 1,3% | static import trong Checkout |
| `CustomIdeaRequestModal.tsx` | 10.797 | 1,2% | |
| `RegisterView.tsx` | 10.287 | 1,2% | |
| `MaterialTechnicalAdvisory.tsx` | 10.270 | 1,2% | chỉ PDP dùng (grep) |
| `InvoiceModal.tsx` | 9.776 | 1,1% | |
| `CartDrawer.tsx` | 8.885 | 1,0% | |
| `OrderSuccessView.tsx` | 8.739 | 1,0% | |
| `ThreeModelViewer.tsx` | 8.030 | 0,9% | |
| `AssetLibraryView.tsx` | 7.345 | 0,8% | |
| `mockData.ts` | 4.914 | 0,6% | fixture hiện rỗng (`PRODUCTS=[]`…) |

**Điểm bất ngờ:** `react-vendor` chỉ 51,5 KB; **react-dom-client 177,7 KB nằm trong entry**. Lý do:
`manualChunks` object khai `'react-dom'` (`vite.config.ts:54`) nhưng code import `react-dom/client`;
entry `react-dom/client` không khớp key nên phần lớn react-dom + scheduler rơi vào index. Đây là lỗi
cấu hình chunk, không phải lỗi bundle size (tổng byte không đổi), nhưng làm **mất cache immutable**
cho 177,7 KB raw / ~48 KB gzip mỗi lần deploy.

### 1.5 Thứ có thể lazy + định lượng

| # | Đưa ra khỏi critical path | Raw (B) | Gzip ước tính | % initial gzip | Ghi chú |
|---|---|---:|---:|---:|---|
| L1 | `three-vendor` (+ 3 component viewer: `ThreeModelViewer` 8.030, `PersonalizeModelViewer3D` 12.330, `UnifiedCadToolbar` 3.683) | 531.663 (+24.043) | **133.438** | 28,6% (baseline) | ✅ **DONE 10:53** — `LazyThreeModelViewer`; three không preload |
| L2 | 9 view không phải critical: Cart, Checkout, OrderSuccess, OrderTracking, MyOrders, AssetLibrary, Login, Register, Personalize | 178.740 (thực đo index) | **45.005** (thực đo, gồm icon prune) | 9,6% (baseline) | ✅ **DONE 10:53** — dự báo 234.615/63.100 cao hơn thực tế vì shared chunk |
| L3 | `workshopService` (chỉ `/lab`) | 40.504 | ~10.900 | 2,3% | import ở `App.tsx:37`, dùng trong `LabRoute` |
| L4 | 4 modal luôn mount | 39.726 | ~10.700 | 2,3% | mở mới tải; `Modal` đã có sẵn |
| L5 | 18 key icon không literal (Phase 1) | ~7.700 (đã xoá) | ~1.700–2.500 | ~0,4–0,5% | ✅ **DONE 10:27** |
| L6 | `canvas-confetti` (dynamic trong handler) | 11.087 | **6.903** | 1,5% | chỉ giảm chunk Checkout, không giảm initial nếu Checkout đã lazy |
| L7 | `jszip` + `3MFLoader` + `fflate` + `OBJLoader` (chỉ tải khi đúng định dạng) | 96.821 + 13.736 + 5.592 + 8.653 = 124.802 | ~34.000–36.000 | — | giảm `/quote` từ 351,5 KB → ~227 KB raw (97,6 → ~62 KB gzip) |

**Current:** critical **285,8 KB gzip** (đã gồm L1+L2). Nếu làm nốt **L3+L4**: 285,8 − 21,6 ≈
**264,2 KB gzip (-43,4% so baseline 466,6)**. L6/L7 không đổi initial (đã nằm trong lazy chunk), nhưng
giảm mạnh `/checkout` và `/quote`. L5 đã xong.

### 1.6 Sau Phase 1 — build 10:41 (delta so baseline 10:13)

| Chunk | Current raw / gzip | Delta raw / gzip | Ghi chú |
|---|---:|---:|---|
| `index-du8e82Q8.js` | 892.820 / 239.321 | **-8.468 / -2.351** | 18 icon module + dead code |
| `three-vendor-Dzvn5SQW.js` | 531.663 / 133.439 | 0 / 0 | chưa lazy hoá — vẫn preload |
| `supabase-vendor-Dou1_KsT.js` | 221.007 / 57.646 | 0 / 0 | |
| `react-vendor-DNjtIxli.js` | 51.499 / 18.190 | 0 / 0 | |
| `index-G97cpGoT.css` | 89.454 / 15.655 | **-390 / -40** | |
| **Initial total** | **1.786.443 / 464.251** | **-8.858 / -2.391 (-0,5%)** | vẫn còn three eager |

Nhận xét: Phase 1 chỉ giảm **0,5% gzip**; gần như toàn bộ tiềm năng còn nằm ở **lazy hoá** (§1.5), không
phải xoá dead code. `dist/` hiện tại là build 10:53 (10.450.040 B), không còn stale.

### 1.7 Sau Phase 5a — build 10:53 (current)

> **Baseline của bảng này là phase 0 (10:13).** Nếu so với baseline **Phase-1 HEAD `6e3247d`** (chính thức
> cho Phase 5): `index` **892.820/239.321 → 714.080/194.316** = **-178.740 raw / -45.005 gzip (-20,03%/-18,80%)**;
> critical **464.251 → 285.807 gzip = -178.444 (-38,44%)**.

| Chunk | Raw / gzip | Delta vs baseline 10:13 | Critical? |
|---|---:|---:|---|
| `index-CXYaozqd.js` | **714.080 / 194.316** | **-187.208 / -47.356** | **có** |
| `supabase-vendor-Dou1_KsT.js` | 221.007 / 57.646 | 0 / 0 | **có** |
| `react-vendor-foTQgREL.js` | 51.499 / 18.190 | 0 / 0 | **có** |
| `index-G97cpGoT.css` | 89.454 / 15.655 | -390 / -40 | **có** |
| **Critical total** | **1.076.040 / 285.807** | **-719.261 / -180.835 (-38,7%)** | |
| `three-vendor-DxYt6jHo.js` | 531.663 / 133.438 | 0 / 0 | **không** — async khi viewer render |
| `ThreeModelViewer-bhpHjY5m.js` | 8.790 / 3.770 | mới | async (kéo three) |
| `UnifiedCadToolbar-Bu_uKYsQ.js` | 3.910 / 1.140 | mới | async |
| `dispose-Cc0Zn8sM.js` | 410 / 270 | mới | async |
| `CheckoutView-BjOaXf58.js` | 34.390 / 11.320 | mới | lazy route (chứa confetti) |
| `PersonalizeView-Fmxq2wkx.js` | 46.460 / 13.740 | mới | lazy route |
| 9 route chunk còn lại | 4,3–18,2 KB mỗi chunk | mới | lazy route |

**Đã verify:** `dist/index.html` chỉ còn preload `react-vendor`, `supabase-vendor`, CSS — **không còn
`three-vendor`**. `dist/assets/index-CXYaozqd.js` vẫn có `three-vendor` trong `__vite__mapDeps`, nhưng chỉ
là dependency của lazy chunk. Nếu tính cả three (network của Home khi hero render): 1.607.703 B raw /
419.245 B gzip, vẫn **-10,2%** so baseline; nhưng three không còn chặn first paint.

**Sai lệch dự báo:** L2 dự báo 234.615 B raw / 63.100 B gzip nhưng thực tế index chỉ giảm 178.740 B raw
(45.005 B gzip) vì nhiều component dùng chung ở lại index; 9 view chunk cộng lại ~150 KB raw. Bài học:
ước tính theo source-map là **trần trên**, không phải số sẽ giảm.

---

## 2. Dependencies

### 2.1 `package.json` vs import thực tế

Quét toàn bộ `src/**`, `scripts/**`, config tại baseline: **24 dependency khai báo**, 10 dùng ở runtime.
Sau Phase 1 còn **22** (đã bỏ `dotenv` + `autoprefixer`).

| Package | Khai báo | Import thực tế | Kết luận |
|---|---|---|---|
| `react`, `react-dom`, `react-router-dom` | dep | 114 / 1 / 15 file | giữ |
| `@supabase/supabase-js` | dep | 5 file | giữ; 221 KB chunk |
| `three` | dep | 10 file | giữ; lazy hoá (L1) |
| `zustand` | dep | 7 file | giữ |
| `lucide-react` | dep | 22 file + iconMap | giữ; prune map |
| `canvas-confetti` | dep | **1 file** (`CheckoutView.tsx:3`) | giữ; dynamic import |
| `jszip` | dep | **1 file** (`meshParser.ts:6`) | giữ; dynamic import |
| `occt-import-js` | dep | **1 file** (`cadParser.worker.ts:6`) | giữ; wasm ngoài bundle |
| `vite` | **dep + devDep** (`package.json:27,40`) | config/CLI | gộp devDep |
| `@tailwindcss/vite`, `@vitejs/plugin-react` | **dep** (`:17-18`) | config | chuyển devDep |
| `tailwindcss` | devDep | `src/index.css:1` (`@import`) | giữ |
| `typescript`, `tsx` | devDep | CLI/script (`npx tsx scripts/…` theo AGENTS) | giữ |
| `esbuild` | devDep | **0 import/CLI reference trực tiếp** trong repo | kiểm tra trước khi bỏ; Vite đã có esbuild nội bộ |
| `@types/*` | devDep | TS | giữ |
| ~~`dotenv`~~ | ~~dep~~ | **0 import** | ✅ **đã bỏ 2026-10-21 (Phase 1)** |
| ~~`autoprefixer`~~ | ~~devDep~~ | **0 config/import** | ✅ **đã bỏ** (Tailwind 4 dùng plugin Vite) |

Baseline `dotenv` chiếm **156 KB** `node_modules`; `autoprefixer` **452 KB** + `postcss` 352 KB +
`browserslist` 104 KB (một phần dùng chung). Không ảnh hưởng bundle vì không được import, nhưng tăng
install time/supply-chain surface — Phase 1 đã xoá cả hai khỏi `package.json`.

**Config chết:** `vite.config.ts:34` define `process.env.GEMINI_API_KEY` nhưng **0 chỗ dùng**;
`:37` define `NEXT_PUBLIC_SITE_URL` cũng 0 chỗ dùng. Đây là **secret-injection hazard**: nếu sau này
ai viết `process.env.GEMINI_API_KEY` trong `src/**`, Vite sẽ nhúng nguyên key vào bundle client. Xoá
2 define này (giữ 2 define Supabase đang được `src/backend/supabase/client.ts:6-7` đọc).

### 2.2 `canvas-confetti`

- Static import: `src/frontend/views/CheckoutView.tsx:3`; dùng 1 lần ở `:228`.
- Đóng góp **11.087 B** trong `index` (1,3% mapped), **6.903 B gzip** (gzip riêng module).
- Vì `CheckoutView` đang eager, confetti cũng eager theo. Chuyển sang
  `const { default: confetti } = await import('canvas-confetti')` **bên trong** handler thành công
  (sau khi DB nhận đơn, `CheckoutView.tsx:224-234`) — không đổi hành vi, chỉ trễ hiệu ứng vài chục ms.

### 2.3 `jszip`

- Import tĩnh `src/utils/meshParser.ts:6`; dùng ở `:947`, `:1659`, `:1697`, `:1707` — **chỉ nhánh 3MF**
  (và fallback `ThreeMFLoader` cần `window.JSZip`).
- Trong `Tool3DView` chunk: **96.821 B (28,2%)**, gzip riêng **28.312 B**.
- `Tool3DView` đã lazy, nhưng ai mở `/quote` là tải luôn 96,8 KB jszip dù chưa upload file.
  Dynamic import trong nhánh `fileName.endsWith('.3mf')` (kèm `ThreeMFLoader`/`fflate` 19,3 KB) là
  thắng rõ nhất của route này.

### 2.4 `occt-import-js` + wasm

- Package `node_modules/occt-import-js` **12 MB**, trong đó bản wasm **7.604.031 B** trùng với
  `public/wasm/occt-import-js.wasm` (file được **track trong git**: `git ls-files public/wasm`).
- Worker import tĩnh glue: `src/workers/cadParser.worker.ts:6`; khởi tạo wasm chỉ khi
  `getOcctInstance()` (`:32-60`), được gọi **chỉ cho STEP/STP/IGES/IGS** (`:226-227`).
- **Nhưng** worker được tạo cho **mọi** lần parse, kể cả STL > 2 MB
  (`src/utils/meshParser.ts:1377`, alias `parseStlWithWorker` ở `:1432`).
- Worker chunk: **66.120 B / 23.968 B gzip**, source-map cho thấy **58.785 B (89,9%) là occt glue**.
  ⇒ mỗi lần parse STL > 2 MB tải/parse **~21,5 KB gzip glue không dùng**, và mỗi lần parse STEP/IGES
  **compile/instantiate lại 7,6 MB wasm** vì `worker.terminate()` ở `:1388`/`:1415`/`:1423` huỷ luôn
  `occtPromise` cache trong worker.
- Build log cảnh báo `Module "path"` và `"crypto"` bị externalize bởi `occt-import-js`
  (`vite:resolve`) — cần smoke test STEP/IGES thật sau mỗi lần đổi worker.
- `vercel.json` chỉ cache `/assets/(.*)` (`vercel.json:12-21`); **`/wasm/*` không có header
  immutable** và không có bản nén sẵn. Wasm gzip -9 = 3.091.489 B (giảm 59,3% so với 7,6 MB).

### 2.5 `lucide-react` / `iconMap` — 219 → 201 key gốc (Phase 1)

Đo trực tiếp `src/frontend/ui/iconMap.ts`:

| Chỉ số | Baseline (10:13) | Hiện tại (10:33) | Ghi chú |
|---|---:|---:|---|
| Key gốc | **219** | **201** | Phase 1 xoá 18 |
| Key composed | **5** | **5** | `add_shopping_cart`, `remove_shopping_cart`, `cloud_sync`, `lock_reset`, `square_foot` |
| Tổng key | **224** | **206** | |
| Key có reference tường minh (`<Icon name="…">`, `icon: '…'`) | **189** | **189** | không đổi |
| Key không reference tường minh | **35** | **17** | 18 key đã xoá |
| Key không xuất hiện dưới bất kỳ string literal nào trong `src/` | **19** | **1** (`cloud_sync`) | gần như đã prune xong |
| Icon module thực sự vào `index` | **192** | ~174 (chưa build lại) | |
| Byte lucide trong `index` | **81.818 B icon + 1.797 B hạ tầng = 83.615 B (9,5% mapped)** | ước tính ~74,1 KB raw (chưa xác nhận) | |

**Phase 1 đã xoá 18 key** (đúng nhóm "không literal" của audit): `arrow_upward`, `call_split`,
`celebration`, `event`, `hexagon`, `home_repair_service`, `hourglass_top`, `location_on`,
`navigate_next`, `pending_actions`, `price_check`, `production_quantity_limits`, `rocket_launch`,
`route`, `science`, `security`, `shield_person`, `warehouse`, và các import tương ứng. Ước tính bundle giảm
**~7,7 KB raw / ~1,7–2,5 KB gzip**; build 10:53 xác nhận tổng index giảm **187.208 B raw**, trong đó
Phase 1 (18 icon + dead code) ~8.468 B, phần còn lại là Phase 5a route lazy (cùng CSS -390 B).

**Còn lại:** 17 key không reference tường minh nhưng **có** xuất hiện dưới string literal ở nơi khác
(`bookmark`, `done`, `fullscreen`, `token`, `visibility_off`…) — phần lớn là false positive hoặc alias;
chỉ `cloud_sync` là không literal. **Không còn đáng làm** (0–1 KB gzip); nếu làm tiếp phải grep
`mockData`, store, migration seed và chạy `check-icon-names` + DEV (Icon.tsx:45-48 cảnh báo glyph thiếu)
vì tên icon có thể đến từ DB.

### 2.6 Lockfile trùng + lệch — ✅ đã xử lý

| File | Size baseline | Trạng thái |
|---|---:|---|
| `package-lock.json` | 112.643 B | giữ; khớp `package.json`; Vercel dùng `npm run build` (`vercel.json:4`) |
| `bun.lock` | 112.685 B | ✅ **đã xoá 2026-10-21 (Phase 1, working tree)** — trước đó chứa `next@16.3.4`, `firebase`, `express`, `motion`, `@google/genai@2.18.0`, `@supabase/ssr` không có trong `package.json` |

Baseline hai lockfile cùng tracked là nguồn drift (Bun sẽ cài lại Next/Firebase/Express đã bị xoá).
Sau khi xoá `bun.lock`, chỉ còn npm; không cần thêm CI gate `bun install --frozen-lockfile`.

### 2.7 Trọng lượng install (không deploy)

| Package | `node_modules` |
|---|---:|
| `lucide-react` | **44 MB** (1.868 file icon) |
| `three` | **26 MB** |
| `occt-import-js` | **12 MB** (chứa wasm trùng 7,6 MB) |
| `@supabase/supabase-js` | 8,9 MB |
| `jszip` | 920 KB |
| `canvas-confetti` | 120 KB |

Không ảnh hưởng bundle nhưng ảnh hưởng CI cache/install. `dotenv`/`autoprefixer` đã bị xoá khỏi
`package.json`; `node_modules` có thể còn tới lần `npm install` kế tiếp.

---

## 3. Runtime / memory

### 3.1 Ba nhóm 3D viewer và dispose path

| Viewer | Dùng ở | Renderer / vòng lặp | Cleanup | Vấn đề |
|---|---|---|---|---|
| `ThreeModelViewer.tsx` | Home hero (`HomeView.tsx:524`), ServiceShowcase (`:434`, `:596`), PDP (`:421`), AssetLibrary, CadQuickView (`:310`), Designer tabs | `WebGLRenderer` antialias + **shadowMap PCFSoft** (`:149-157`), pixelRatio ≤ 2 (`:154`), **rAF vô điều kiện** (`:345-353`), autoRotate mặc định `true` (`:37`) | `disposeHierarchy(scene)` + `renderer.dispose()` + `WEBGL_lose_context.loseContext()` (`:370-393`) — **tốt** | Home có thể có **2 context đồng thời** (hero + showcase khi scroll tới), mỗi context **60 fps**; rời viewport bị **destroy context** rồi tạo lại khi quay lại (scroll churn) |
| `PersonalizeModelViewer3D.tsx` | `/personalize` | `preserveDrawingBuffer: true` (`:484`) nhưng **không có `toDataURL`** trong file; on-demand render (`:95-112`) | `disposeHierarchy(scene)` + `renderer.dispose()` + `loseContext()` (`:608-625`) — tốt | **Rebuild toàn bộ geometry mỗi tick slider** (`buildModelGeometry` phụ thuộc `localLidLift` ở `:442`, effect `:635-640`) trong khi đã có effect riêng cập nhật vị trí nắp (`:695-700`); `disposeHierarchy` **dispose luôn material/texture dùng chung** (`dispose.ts:16-26`) rồi tái sử dụng → recompile/re-upload mỗi tick; 3 material tạo mới mỗi render qua `useRef(new …)` (`:67-83`) |
| `tool3d/ModelViewer3D.tsx` | `/quote` | `preserveDrawingBuffer: true` (`:439`) cho screenshot (`:1652`); loop **render mỗi frame khi visible** (`:809-837`) dù comment ghi "on-demand" (`:792`); dừng khi ra viewport (`:856-864`) | `disposeHierarchy(scene)` + `renderer.dispose()` (`:875-900`) nhưng **không gọi `loseContext`/`forceContextLoss`** | Vào/ra `/quote` nhiều lần có thể giữ context tới khi GC; nên thêm `renderer.forceContextLoss()`; render liên tục khi tĩnh là lãng phí GPU |

`disposeHierarchy` (`src/frontend/three/dispose.ts:10-28`) chỉ dispose geometry/material/texture gắn
với mesh; **không** dispose `scene.environment`, render target, uniform texture của `ShaderMaterial`.
Hiện scene không dùng env map nên chấp nhận được, nhưng nếu thêm PBR env phải mở rộng hàm.

**Ước tính lợi ích:** render-on-demand khi `!isRotating` + tắt shadow map (không có mesh castShadow
đáng kể trong ThreeModelViewer; `gear core` có `castShadow` nhưng scene không cần) cắt **>90% số
frame** ở trạng thái idle. Đo bằng `renderer.info.render.frame` hoặc Performance panel trước/sau;
không có số trace trong audit này.

### 3.2 Worker lifecycle

- Mỗi lần parse tạo `new Worker(...)` (`meshParser.ts:1377`), terminate sau response (`:1388`),
  onerror (`:1415`), timeout 30 s (`:1380-1383`), hoặc lỗi đọc file (`:1423`). Không leak worker,
  **nhưng không reuse**.
- Response có transfer list cho `positions`/`normals` (`cadParser.worker.ts:237-239`) — tốt, không
  clone đôi bộ nhớ lưới.
- Hệ quả: STEP/IGES lần 2 trở đi vẫn **compile wasm mới** (worker mới), mất ~7,6 MB đọc từ HTTP cache
  + instantiate; STL > 2 MB tải occt glue 58,8 KB không dùng (§2.4).
- Đề xuất: singleton worker + protocol request id; `import('occt-import-js')` **động trong nhánh
  STEP/IGES** để tách glue khỏi worker STL; giữ terminate khi route unmount hoặc idle 60 s. Rủi ro
  trung bình vì phải xử lý hàng đợi/cancel; gate: parse STL/3MF/STEP/IGES + memory snapshot.

### 3.3 Subscription / realtime

| Chỗ | Cơ chế | Đánh giá |
|---|---|---|
| `App.tsx:831-888` | 1 channel `public:products`, cleanup `removeChannel` | tốt, 1 channel |
| `settingsService.ts:312-325` | singleton `vcube:settings`, 4 bảng, listener set; **đóng channel khi listener cuối rời** (`:318-322`) | tốt về số channel, nhưng modal mở/đóng có thể đóng/mở lại channel (network churn) |
| `useSettings.ts:72` | mỗi consumer subscribe; App + LanguageContext (2) + InvoiceModal + Checkout + admin panels | nhiều listener cùng channel — chấp nhận |
| `customDesignService.ts:374-390` | **mỗi caller tạo channel riêng** `public:custom_design_requests` | hiện chỉ 1 tab designer mount (`DesignerDashboardView.tsx:113-160`) nên ≤1 channel; nếu sau này mount 2 tab cùng lúc sẽ trùng topic — nên dedupe |
| `AuthContext.tsx:176` | 1 `onAuthStateChange` | tốt |
| `App.tsx:764-765` | effect phụ thuộc `[pricingConfig]` → resubscribe mỗi lần admin lưu config | nhỏ, nên đổi dependency rỗng |
| Boot | `bootstrapSettings()` đọc **4 store** song song (`settingsService.ts:629-646`) + App gọi **6** `dbService.get*` (`App.tsx:787`, `:889-910`) | **~10 query Supabase** trước khi Home ổn định; materials/printers/accessories/pricing_configs chỉ cần `/quote`/`/admin` → defer được 4 |

### 3.4 localStorage cache

| Key | Đọc | Ghi | Nhận xét |
|---|---|---|---|
| `vcube_products` | `App.tsx:638` (JSON.parse đồng bộ trước render) | `:1400,1409,1422,1431,1444,1453` (trong `setState` updater) | side effect trong updater → StrictMode dev gọi 2 lần ⇒ 2 lần `JSON.stringify`; cache cũ vẫn hiện khi fetch lỗi (`:793-795`) mà không có nhãn "stale" |
| `vcube_materials` | `:703` | `:1065` | chỉ dùng admin/quote |
| `vcube_printers` | `:713` | `:1081` | chỉ dùng admin/quote |
| `vcube_site_content` | `:693` | `:1483` | merge với default |
| `vcube_pricing_config` | **không đọc** | `:1018` | **write-only, dead key** |
| `vcube_language` | **không đọc** | `LanguageContext.tsx:475` | **write-only** (D0: UI luôn VI) |
| `vcube_active_local_user`, `vcube_guest_role` | — | chỉ `removeItem` khi logout (`AuthContext.tsx:438-439`) | dọn legacy |

Không có version/TTL/`storage` event. Với catalog thật ~100 sản phẩm × 1,5 KB ≈ **150 KB JSON**,
`JSON.parse` đồng bộ có thể 1–3 ms trên mobile trung bình; ghi mỗi lần admin sửa sản phẩm 2–5 ms.
Đề xuất: cache có `{v, ts}`, giới hạn kích thước, và **không coi cache là nguồn sự thật** (đã đúng
tinh thần data-honesty nhưng thiếu nhãn stale); hoặc bỏ 4 cache DB-backed theo PLAN Phase 3.

### 3.5 `App.tsx` state fan-out

- **2.152 LOC**, 38 static import, **19 `useState`**, 10 `useEffect`, **32 `<Route>`**, 19 selector
  Zustand (`useCartStore` 8 + `useUIStore` 11).
- Mọi thay đổi `cart`/`toastQueue` → `MainApp` re-render → `Header`, 4 modal luôn mount
  (`App.tsx:1973-2002`), FAB và subtree route. Các view không `React.memo`; `products` là mảng mới
  sau realtime nên Home/Explore re-render toàn bộ grid.
- `CHROMELESS_SCREENS`/`FAB_HIDDEN_SCREENS` tạo mảng mới mỗi render (`:1130`, `:1135`) — nhỏ.
- Đề xuất: layout route + `<Outlet>` (tách `MainApp`), `React.memo` cho `Header`/view, selector
  Zustand cho từng modal thay vì subscribe cả `toastQueue`, đưa catalog/settings vào store có
  selector. Không giảm byte; đo bằng React Profiler (số commit/lần gõ phím, thời gian render Home).

---

## 4. Static assets

| Path | Size | Tracked | Deploy | Hành động |
|---|---:|---|---|---|
| `public/wasm/occt-import-js.wasm` | **7.604.031 B** (7,25 MiB) | **có** | copy → `dist/wasm`, tải khi STEP/IGES | giữ; nén trước + `Cache-Control: immutable`; cân nhắc Git LFS (`.git` hiện 15 MB) |
| `dist/` | **10.450.040 B** | không (`.gitignore:8`) | Vercel upload | build 10:53; không commit |
| `dist/assets/` | 2.843.653 B | — | 40 file | — |
| `.playwright-mcp/` | **3.863.145 B** / 54 file | không (`.gitignore:73`) | không | xoá local; không ảnh hưởng bundle |
| ~~`assets/` (root)~~ | chỉ `assets/.aistudio/.gitignore` 2 B | ~~có~~ | không | ✅ **đã xoá 10:27** |
| ~~`firebase-applet-config.json`~~ | 560 B | ~~có~~ | không | ✅ **đã xoá 10:27** (không có `firebase` trong `package.json`) |
| ~~`firestore.rules`~~ | 1.453 B | ~~có~~ | không | ✅ **đã xoá 10:27** |
| ~~`metadata.json`~~ | 239 B | ~~có~~ | không | ✅ **đã xoá 10:27** (remnant AI Studio `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`) |
| `public/favicon.svg` | 654 B | có | có | giữ |
| Google Fonts | 10 weight / 2 family (`index.html:15`) | ngoài repo | render-blocking CSS | cân nhắc self-host subset hoặc giảm còn 3–4 weight (P3; chưa đo byte font) |

`public/wasm` hiện **không có cache header** trong `vercel.json` (chỉ `/assets`), nên lần tải thứ hai
có thể phải revalidate 7,6 MB. Thêm:
`{"source":"/wasm/(.*)","headers":[{"key":"Cache-Control","value":"public, max-age=31536000, immutable"}]}`
và bật nén wasm (Brotli nếu CDN hỗ trợ; gzip -9 đo được 3.091.489 B).

---

## 5. Optimization backlog

### 5.1 Top 10 khoản tiết kiệm (xếp theo lợi ích đo được)

| # | Action | Saving | % baseline | Priority |
|---:|---|---:|---:|---|
| 1 | Lazy **toàn bộ** 5 chuỗi three (đã làm bằng `LazyThreeModelViewer`) | **133.438 B gzip** — thực đo; three không còn preload | **-28,6%** baseline | ✅ **DONE 10:53** |
| 2 | Lazy 9 view không phải critical + viewer/advisory/OrderProgress (đã làm) | **45.005 B gzip** thực đo ở index (dự báo 63.100) | **-9,7%** baseline | ✅ **DONE 10:53** |
| 3 | Dynamic import `jszip` + `3MFLoader` + `fflate` + `OBJLoader` trong `meshParser` (chỉ khi đúng đuôi file) | **~34–36 KB gzip** khỏi `/quote` (97,6 → ~62 KB) | -37% chunk `/quote` | **P1** |
| 4 | Tách `WorkshopService` khỏi `App.tsx` (đưa vào lazy `LabRoute`) | **40.504 B raw / ~10.900 B gzip** | -2,3% | **P1** |
| 5 | Lazy 4 modal luôn mount (`AuthModal`, `InvoiceModal`, `CartDrawer`, `ChatSupportModal`) — chỉ render body/import khi mở | **~39.726 B raw / ~10.700 B gzip** | -2,3% | **P2** |
| 6 | `canvas-confetti` → dynamic import trong handler | **6.903 B gzip** khỏi chunk Checkout | -1,5% initial (nếu Checkout chưa lazy) | **P2** |
| 7 | Tách occt glue khỏi worker STL: `import('occt-import-js')` chỉ trong nhánh STEP/IGES | **~21.500 B gzip** khỏi mỗi lần parse STL >2 MB (worker 24 → ~2,5 KB) | — (không phải initial) | **P1** |
| 8 | Nén sẵn wasm + cache immutable `/wasm/*` | **7.604.031 → 3.091.489 B** lần tải đầu STEP/IGES; lần sau 0 B (cache) | -59% wasm | **P1** |
| 9 | Sửa `manualChunks` để react-dom-client + scheduler vào `react-vendor` | 0 byte initial, nhưng **177,7 KB raw / ~48 KB gzip** giữ cache qua deploy thay vì nằm trong index đổi hash | cache hit | **P2** |
| 10 | Render-on-demand cho 3 viewer + bỏ shadow map không dùng + `forceContextLoss` ở `ModelViewer3D` | >90% frame idle bị bỏ (ước tính từ code); giảm 2–3 context 60 fps trên Home xuống 1–2 khi cần | runtime/GPU | **P1** |

**Current sau 1+2:** critical **285,8 KB gzip (-38,7% so baseline 466,6)**. Làm nốt **4+5**:
**264,2 KB (-43,4%)**. Con số này **chưa** tính 57,6 KB `supabase-vendor` (xem §5.3) và 89,5 KB CSS.
Icon prune (L5) đã xong trong Phase 1; #3/#6/#7 không đổi initial nhưng giảm `/quote`/`/checkout`.

### 5.2 Backlog chi tiết

| Priority | Action | Evidence | Expected impact | Risk | Gate |
|---|---|---|---|---|---|
| ✅ **RESOLVED** | `../data/mockData` bị xoá giữa chừng → shim `src/frontend/data/mockData.ts` (37 B) đã khôi phục; build 10:41 xanh | `HomeView.tsx:4`; build 10:33 fail | Không còn blocker; số current ở §1.7 | — | `npm run build` xanh; `npm run lint` |
| ✅ **DONE 10:53** | Lazy three bằng `LazyThreeModelViewer` (Home/PDP/Explore/AssetLibrary/Designer); three rời preload | `src/frontend/components/LazyThreeModelViewer.tsx`; build 10:53 | **-133,4 KB gzip critical** (thực đo) | Đã verify không preload; CLS fallback dùng đúng khung | Lighthouse 390 + screenshot Home/PDP; network waterfall |
| ✅ **DONE 10:53** | Lazy 9 route: Cart, Checkout, OrderSuccess, OrderTracking, MyOrders, AssetLibrary, Login, Register, Personalize | `App.tsx:72-85` | **index -187,2 KB raw / -47,4 KB gzip** (gồm icon; route ~45 KB gzip) | Đã build; chunk 404 nếu deploy thiếu asset | `npm run build`; smoke 12 route; bảng §1.7 |
| **P1** | Tách `WorkshopService` khỏi module scope `App.tsx` (dynamic import trong `LabRoute` hoặc component `LabGate` lazy) | `App.tsx:37`, dùng `:575`; `workshopService` 40.504 B / 2.243 dòng | -40,5 KB raw / -10,9 KB gzip; `/lab` chỉ tải khi role phù hợp | Thấp: chỉ đổi thời điểm import | `npm run lint/build`; `/lab` smoke cho 3 nhánh gate |
| **P1** | Dynamic import `jszip` + `ThreeMFLoader` + `OBJLoader` theo đuôi file | `meshParser.ts:6,947,1659,1697,1707`; Tool3D source-map: jszip 96.821 B | `/quote` 351,5 → ~227 KB raw; -34…36 KB gzip | Thấp–TB: fallback `window.JSZip` cho `ThreeMFLoader`; lỗi chỉ ở 3MF/OBJ | parse STL/OBJ/3MF/STEP thật ở `/quote`; so số đo tam giác/volume trước-sau |
| **P1** | `ThreeModelViewer`: chỉ render khi `isRotating`/dirty; tắt `shadowMap` nếu không dùng; giữ context thay vì destroy mỗi lần ra viewport (hoặc chỉ pause loop) | `ThreeModelViewer.tsx:149-157,340-353,370-393` | >90% frame idle; giảm CPU/GPU/battery; 2 context Home | TB: auto-rotate/visual regression; context memory nếu giữ | Performance panel (frame count), Playwright scroll in/out, `renderer.info.memory` ổn định |
| **P1** | `ModelViewer3D`: dirty-flag render, `renderer.forceContextLoss()` khi unmount | `ModelViewer3D.tsx:809-837,875-900` | Bỏ render tĩnh 60 fps; hết leak context khi vào/ra `/quote` | TB: screenshot `toDataURL` cần `preserveDrawingBuffer` (giữ) | `/quote` rotate/slice/measure + vào/ra 10 lần, đếm context qua `performance.memory`/DevTools |
| **P1** | Worker pool 1 + dynamic `import('occt-import-js')` trong nhánh STEP/IGES + cancel | `meshParser.ts:1372-1430`; `cadParser.worker.ts:6,32-60,216-242` | STL >2 MB giảm ~21,5 KB gzip glue; STEP lần 2 không compile lại wasm | TB: protocol/queue, terminate an toàn | Parse 4 định dạng; memory snapshot; timeout 30 s vẫn đúng |
| **P1** | Nén sẵn wasm + header `/wasm/*` immutable | `public/wasm/occt-import-js.wasm`; `vercel.json:12-21` | 7,6 MB → 3,09 MB gzip lần đầu; lần sau cache | Thấp: cấu hình CDN; kiểm MIME `application/wasm` | `curl -I` header; upload STEP/IGES lần 1/2; Lighthouse cache |
| **P2** | Lazy 4 modal; chỉ mount body khi `isOpen` (giữ pattern dialog hiện tại) | `App.tsx:1973-2002`; `InvoiceModal.tsx:58-64` | -39,7 KB raw / -10,7 KB gzip; bớt listener khi đóng | TB: focus/dialog/StrictMode (đã có comment CC-01) | Mở/đóng modal ở 390/1440; a11y focus trap; không double-close |
| ✅ **DONE** | `iconMap` prune 18 key không literal (Phase 1) | `iconMap.ts` hiện 206 key; 189 referenced; chỉ `cloud_sync` không literal | **~7,7 KB raw / ~1,7–2,5 KB gzip** (chưa build lại) | Đã xử lý; rủi ro còn lại là icon động từ DB | `npm run check` (icon gate); grep DB seed; QA màn có icon động |
| **P2** | `canvas-confetti` dynamic import | `CheckoutView.tsx:3,228` | -6,9 KB gzip khỏi checkout chunk | Rất thấp: hiệu ứng trễ vài chục ms | Checkout success (DB nhận đơn mới bắn) |
| **P2** | `manualChunks`: thêm `react-dom/client` + `scheduler`; **không** gom `three/examples/jsm/*` vào vendor eager (để loader ở chunk lazy của `/quote`) | `vite.config.ts:52-56`; source-map: react-dom-client 177.654 B trong index; three subpath 32.510 B trong Tool3D | Index 901 → ~724 KB raw; cache react 177,7 KB/48 KB qua deploy; giữ loader 3MF/OBJ ngoài initial | Thấp: chỉ chunk graph | build + so hash/cache; app boot/login/realtime; xác nhận three-loaders không bị preload |
| **P2** | Bỏ write-only `vcube_pricing_config`, `vcube_language`; thêm version/TTL/nhãn stale cho cache DB-backed | `App.tsx:1018`; `LanguageContext.tsx:475`; `App.tsx:638-721` | Dọn quota + tránh dữ liệu cũ không nhãn; 0 byte | TB: data-honesty/offline | Test offline/fetch lỗi; logout/login; quota |
| ✅ **DONE / P3** | ✅ `dotenv`, `autoprefixer`, `bun.lock` đã xoá (Phase 1). Còn: gộp `vite` về devDep; xoá 2 define chết | `package.json:27,40`; `vite.config.ts:34,37` | 0,6 MB install + drift Next/Firebase **đã xử lý**; define chỉ còn là secret-injection hazard | Thấp: build không dùng define | `npm ci && npm run build`; `npm ls`; Vercel preview |
| **P2** | Defer 4 query boot: `materials`, `printers`, `accessories`, `pricing_configs` chỉ tải ở `/quote`/`/admin` | `App.tsx:889-910`; `settingsService.ts:629-646` | ~10 → 6 query trước Home; giảm RTT mobile | TB: view cần dữ liệu phải có loading/empty đúng | Home/quote/admin smoke; đo network waterfall |
| **P2** | Personalize: bỏ `localLidLift` khỏi `buildModelGeometry` deps, chỉ set `lidGroup.position.y`; `preserveDrawingBuffer:false`; khởi tạo material một lần | `PersonalizeModelViewer3D.tsx:67-83,442,484,635-640,695-700`; `dispose.ts:16-26` | Slider 40 tick: bỏ 40 lần rebuild geometry + dispose/recompile material/texture | TB: vị trí nắp/visual | Kéo slider 0→40, kiểm texture/material, FPS; screenshot |
| **P3** | Self-host/subset font hoặc giảm weight; `preload` font chính | `index.html:15` (10 weight) | Giảm request/render-block; chưa đo | Thấp–TB: typography | Lighthouse + visual 390/1440 |
| ✅ **DONE** | Xoá `assets/.aistudio`, Firebase remnant, `metadata.json` | §4 | Đã xoá 10:27 (2 KB repo) | — | `git status` sạch |
| **P3** | Dọn `.playwright-mcp/` (54 file, 3,86 MB) khỏi máy local | §4 | 3,86 MB disk, **không** ảnh hưởng bundle/deploy | Rất thấp | `git status` sạch |
| **P3** | Tách `MainApp` layout/route, memo Header/view, selector cho modal | `App.tsx` 2.152 LOC; §3.5 | Giảm re-render; 0 byte | TB: refactor rộng | React Profiler; 30 route smoke |
| **P3** | Nghiên cứu defer `supabase-vendor` (auth-only shell) | `supabase-vendor` 221 KB/57,6 KB gzip; `AuthContext.tsx:176` | Tiềm năng -57,6 KB gzip (-12,3%) | **Cao**: mất session restore sớm/flash login; RLS/auth là critical | Chỉ làm sau khi có auth loading state + đo; không đưa vào top 10 |

### 5.3 Đã cân nhắc và **không** làm

| Ý tưởng | Lý do loại |
|---|---|
| Đổi `import * as THREE` → named imports để tree-shake three | **Đo thực tế: 0 tiết kiệm**. Bundle esbuild 529.033 B cho cả namespace và named (24 class); three core phụ thuộc chéo, không tree-shake được. Đừng mất công. |
| Lazy `supabase-vendor` ngay | 57,6 KB gzip là khoản lớn thứ 2 sau three, nhưng `AuthProvider` cần `getSession` trước khi render UI; defer dễ gây flash/route guard sai. Cần thiết kế auth shell trước (P3). |
| Tách từng icon lucide thành dynamic import | 192 request nhỏ tệ hơn 1 chunk; giữ static map và prune. |
| Xoá toàn bộ localStorage cache DB-backed ngay | Có thể mất fallback khi Supabase paused/offline (hiện `vcube_products` là fallback có chủ đích, `App.tsx:793-795`); phải giữ cache có nhãn stale hoặc chuyển IndexedDB trước. |
| Đưa `three` sang CDN | Mất version lock/SRI, thêm request; chunk local đã immutable. Không đáng. |

---

## 6. Cách đo lại (bắt buộc sau mỗi phase)

> **Điều kiện:** build 10:53 đã xanh (`index-CXYaozqd`). Nếu cây tiếp tục đổi trong Phase 1/5, chạy lại
> `npm run build` trước khi so sánh; số §1.6 là mốc current, §1.1 là baseline trước Phase 1.

```bash
# 1) build & bảng chunk
npm run build
for f in dist/assets/index-*.js dist/assets/three-vendor-*.js \
         dist/assets/supabase-vendor-*.js dist/assets/react-vendor-*.js \
         dist/assets/index-*.css; do
  raw=$(stat -c%s "$f"); gz=$(gzip -9 -c "$f" | wc -c)
  echo "$(basename "$f") raw=$raw gzip=$gz"
done

# 2) xác nhận three không còn preload
grep -c 'three-vendor' dist/index.html        # kỳ vọng 0 sau B1
grep -c 'modulepreload' dist/index.html

# 3) attribution index (tuỳ chọn)
npx vite build --sourcemap --outDir /tmp/vcube-dist-audit
# giải mã sourcemap để lấy byte/module (xem §1.4)

# 4) gate bắt buộc
npm run lint
npm run check
```

**Gate chấp nhận:** initial gzip không tăng; `three-vendor` không còn trong `dist/index.html`;
12 route + `/quote` + `/lab` + `/admin` smoke 390/1440; 3D unmount không tăng context; STEP/IGES parse
vẫn đúng số đo; `npm run check` xanh (hoặc không hồi quy baseline).

---

## Phụ lục A — raw measurements

| Mục | Giá trị |
|---|---|
| Build | 10:53: Vite 6.4.3, **1.873 module**, 6,22 s, exit 0, `index-CXYaozqd` 714.080/194.316. Baseline 10:13: 1.875 module, `index-C8O2jQ4p` 901.288/241.672. Lần 10:33 fail tạm thời (`../data/mockData`); shim 10:35 |
| Delta Phase 1 | Initial **-8.858 B raw / -2.391 B gzip** (index -8.468/-2.351, CSS -390/-40) |
| Delta Phase 5a | Initial critical **-719.261 B raw / -180.835 B gzip (-38,7%)**; three rời preload |
| Warning build | `path`/`crypto` externalized bởi `occt-import-js` |
| JS chunk | 39 file (gồm worker + 14 chunk lazy) |
| Source-map coverage index | 879.113 / 901.331 B = 97,5% |
| `index` react-dom-client | 177.654 B (20,2% mapped) |
| `index` lucide | 83.615 B (9,5%), 192 icon module, 426 B/icon (baseline; Phase 1 còn ~174 module) |
| `index` workshopService | 40.504 B |
| `Tool3DView` jszip | 96.821 B (28,2% chunk), gzip 28.312 B |
| Worker occt glue | 58.785 B (89,9% worker chunk), gzip 26.574 B (file gốc) |
| `three-vendor` | three.module 344.813 + three.core 182.731 = 527.544 B (+4.119 prelude) |
| Wasm | 7.604.031 B; gzip -9 3.091.489 B (59,3% reduction) |
| `dist` | **10.450.040 B** = assets 2.843.653 + wasm 7.604.031 + html/favicon 2.356 (baseline 10.455.717) |
| `.playwright-mcp` | 3.863.145 B / 54 file (ignored) |
| Font | 2 family / 10 weight, Google Fonts render-blocking (`index.html:15`) |

## Phụ lục B — giới hạn của audit

1. **Supabase đang paused** — không đo được network thật, không xác minh realtime/RLS; mọi kết luận
   runtime là đọc code, không phải trace.
2. **Không chạy browser/Playwright** trong audit này ⇒ không có LCP/TBT/FPS thực; các con số runtime
   là ước tính từ cấu hình renderer/vòng lặp.
3. Gzip đo bằng `gzip -9`; Vercel/CDN có thể dùng Brotli/mức nén khác ⇒ số transfer thực thấp hơn.
4. Attribution source-map là **xấp xỉ** (gán byte theo segment; segment lẫn giữa module có thể lệch
   ±1–2%); dùng để xếp hạng, không dùng làm số kế toán.
5. Build có thể bị ảnh hưởng bởi các agent khác đang sửa working tree; số baseline gắn với
   `index-C8O2jQ4p.js` / `three-vendor-Dzvn5SQW.js`, số current gắn với `index-CXYaozqd.js` /
   `three-vendor-DxYt6jHo.js` (10:53). Nếu `src/**` đổi, phải build lại.
6. Trong lúc audit, Phase 1 + Phase 5a đã landed: xoá `dotenv`/`autoprefixer`/`bun.lock`/Firebase
   remnant/`metadata.json`/`assets/.aistudio`, prune 18 icon key, xoá dead service, lazy 9 route và
   `LazyThreeModelViewer`. Các mục đó được đánh dấu ✅ và **không** còn là backlog. Build tạm fail lúc
   10:33 do `src/frontend/data/mockData.ts` bị xoá giữa chừng; shim 37 B đã khôi phục và build 10:53
   xanh. Số §1.7 phản ánh trạng thái sau Phase 5a.
