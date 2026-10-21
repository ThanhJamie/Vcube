<!-- doc-meta: status=active; verified=2026-10-21; owner=lead -->
# RESOURCES — bundle, dependency, runtime, assets

> Đo trên `dist/` build 2026-10-20/21. Số gzip tính bằng `gzip -c`. Supabase paused nên không có
> số đo network thật; mục tiêu là **giảm initial payload** và **giảm code chết**.

---

## 1. Bundle hiện tại

| Asset | Raw | Gzip | Vai trò |
|---|---:|---:|---|
| `index-*.js` | 901 KB | **241 KB** | app + 12 view eager + UI + iconMap + modals |
| `three-vendor-*.js` | 532 KB | **133 KB** | Three.js — đang **eager** vì Home/PDP import `ThreeModelViewer` |
| `supabase-vendor-*.js` | 221 KB | 58 KB | Supabase client |
| `react-vendor-*.js` | 51 KB | 18 KB | React/router |
| `index-*.css` | 90 KB | 16 KB | Tailwind + tokens |
| **Initial total** | **~1.79 MB** | **~466 KB** | index + three + supabase + react + css |
| `cadParser.worker-*.js` | 66 KB | 24 KB | chỉ tải khi parse 3D |
| `Tool3DView-*.js` | 351 KB | 98 KB | lazy route |
| `Group4PricingEnginePanel-*.js` | 160 KB | 32 KB | lazy admin panel |

**Vấn đề:** Three.js 133 KB gzip nằm trong initial graph dù chỉ cần khi xem 3D; 12 view eager
(Home/Explore/PDP/Cart/Checkout/Orders/...) làm index chunk lớn.

---

## 2. Hành động bundle (priority)

| # | Action | Ước tính | Rủi ro | Gate |
|---|---|---|---:|---|
| B1 | Lazy `ThreeModelViewer` ở Home/PDP (`React.lazy` + Suspense skeleton) | **-133 KB gzip initial** | 3D chậm hiện sau skeleton | LCP/3D smoke 390/1440 |
| B2 | Lazy 8 route không critical: Cart, Checkout, OrderSuccess, Tracking, MyOrders, Assets, Login, Register | tách index; **-80–150 KB gzip** | route transition chậm | 30 route smoke |
| B3 | `canvas-confetti` dynamic import trong handler Checkout | -3–5 KB | confetti trễ vài ms | checkout success |
| B4 | Prune iconMap 18 glyph không có reference literal (verify dynamic data) | -5–15 KB | icon name từ DB có thể miss | `check-icon-names` + QA |
| B5 | Bỏ dependency chết (`dotenv`, `autoprefixer`) | install sạch | build plugin cần? | build |
| B6 | Tách `iconMap` theo nhóm nếu B4 chưa đủ; giữ API `<Icon name>` | có thể -20–40 KB | refactor map | build + icon gate |

**Mục tiêu sau B1+B2:** initial JS gzip **~300–330 KB (-30–35%)**.

---

## 3. Dependency

| Package | Source use | Quyết định |
|---|---|---|
| `three` | 6 file; chủ yếu viewer | giữ; lazy chunk |
| `lucide-react` | 22 file; iconMap 219 glyph | giữ; prune map |
| `@supabase/supabase-js` | client/services | giữ |
| `react`, `react-dom`, `react-router-dom`, `zustand` | core | giữ |
| `canvas-confetti` | Checkout 1 chỗ | giữ; dynamic import |
| `jszip` | meshParser 1 chỗ | giữ; Tool3D lazy |
| `occt-import-js` | worker | giữ; only on STEP/IGES |
| `dotenv` | **0 import** | bỏ |
| `autoprefixer` | **0 config/import** | bỏ (Tailwind 4 Vite plugin) |
| dev types | build | giữ |

`bun.lock` (112 KB) trùng `package-lock.json`; chọn npm, xoá `bun.lock` (hoặc document lý do giữ).

---

## 4. Assets / static

| Asset | Size | Dùng? | Ghi chú |
|---|---:|---|---|
| `public/wasm/occt-import-js.wasm` | **7.4 MB** | worker STEP/IGES | chỉ tải khi parse; giữ; nén Brotli/CDN; không bundle |
| `public/favicon.svg` | 4 KB | index.html | giữ |
| `.playwright-mcp/` | **3.9 MB** | gitignored | dọn local, không commit |
| `assets/.aistudio` | 0 file thực | không | xoá |
| `firebase-applet-config.json` + `firestore.rules` + `metadata.json` | ~2 KB | không import | xoá |
| `test-pricing.ts` | 357 LOC | imports missing | xoá/rewrite |

---

## 5. Runtime / memory

| Vấn đề | Bằng chứng | Hành động |
|---|---|---|
| 5 localStorage cache DB-backed trong App | `vcube_products`, `vcube_materials`, `vcube_printers`, `vcube_site_content`, `vcube_pricing_config` | bỏ cache DB; server là nguồn |
| 2 thư mục store | `src/frontend/stores` + `src/frontend/stores` | gom 1; xoá store không dùng |
| 3D dispose | `src/frontend/three/dispose.ts`; viewers có cleanup | giữ; test unmount/StrictMode |
| Realtime channels | 3 channel; orders broadcast chưa subscribe | giữ; thêm subscribe khi feature |
| Worker | `cadParser.worker.ts` tạo mỗi parse? | kiểm tra singleton/terminate; tránh leak |
| `iconMap` static 219 glyph | initial index | prune/tách |

---

## 6. Cách đo lại

```bash
npm run build
for f in dist/assets/index-*.js dist/assets/three-vendor-*.js dist/assets/index-*.css; do
  raw=$(stat -c%s "$f"); gz=$(gzip -c "$f" | wc -c); echo "$f raw=$raw gzip=$gz";
done
```

Ghi bảng trước/sau mỗi phase vào `AUDIT.md`/`QA-REPORT.md`; không chấp nhận tăng initial.
