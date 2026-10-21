<!-- doc-meta: status=active; verified=2026-10-21; owner=pdp-viewer -->
# HANDOFF — Phase 5b: lazy-load ThreeModelViewer (three-vendor ra khỏi initial load)

> **Trạng thái: DONE.** `npm run lint` PASS · build-equivalent PASS (build riêng vào
> `dist-ssr/p5b-after`, **không ghi `dist/`**). Không commit/push (Lead commit theo phase).
> Không đụng `src/App.tsx` (task-21/`storefront` đang song song), không đụng
> `PersonalizeModelViewer3D`/`ModelViewer3D`/`three/dispose.ts`/`vite.config.ts`.
> Tree lúc đo: HEAD `6e3247d` + working tree của task-21 (`App.tsx` lazy 9 route — cần cho proof)
> + thay đổi của task này; `sha256(App.tsx)` lúc baseline = `4ee322de…` và không đổi tới lúc build after.

---

## 1. Files changed

| File | Thay đổi |
|---|---|
| `src/frontend/components/ThreeModelViewer.tsx` | **1 dòng**: `interface ThreeModelViewerProps` → **`export interface ThreeModelViewerProps`**. Không đổi scene/lights/geometry/behavior. |
| `src/frontend/components/LazyThreeModelViewer.tsx` | **MỚI** — wrapper `React.lazy` + `Suspense` fallback (chi tiết §2). Không import `three`, không import lucide. |
| `src/frontend/views/HomeView.tsx` | chỉ dòng import (line 5) → `../components/LazyThreeModelViewer`. |
| `src/frontend/views/ProductDetailView.tsx` | chỉ dòng import (line 5) → `../components/LazyThreeModelViewer`. |
| `src/frontend/views/AssetLibraryView.tsx` | chỉ dòng import (line 3) → `../components/LazyThreeModelViewer`. |
| `src/frontend/components/CadQuickViewModal.tsx` | chỉ dòng import (line 4) → `./LazyThreeModelViewer`. |
| `src/frontend/components/services/ServiceShowcaseSection.tsx` | chỉ dòng import (line 4) → `../LazyThreeModelViewer`. |
| `src/frontend/components/designer/DesignerUploadWizardTab.tsx` | chỉ dòng import (line 3) → `../LazyThreeModelViewer`. |
| `src/frontend/components/designer/DesignerModelsManagerTab.tsx` | chỉ dòng import (line 3) → `../LazyThreeModelViewer`. |

Không call site nào import export khác từ `ThreeModelViewer.tsx` (chỉ named `ThreeModelViewer`;
`export default` vẫn còn nhưng không dùng — giữ nguyên). Không thêm dependency.

**Bằng chứng `git diff -U0`:** mỗi file call-site đúng **1 hunk / 1 dòng** (import path);
`ThreeModelViewer.tsx` đúng **1 dòng** (`export interface`). File mới untracked.

---

## 2. Wrapper `LazyThreeModelViewer.tsx`

```tsx
import React, { Suspense } from 'react';
import type { ThreeModelViewerProps } from './ThreeModelViewer';

const HeavyThreeModelViewer = React.lazy(() =>
  import('./ThreeModelViewer').then((m) => ({ default: m.ThreeModelViewer })),
);

// Cùng class khung với root của ThreeModelViewer.tsx để fallback chiếm đúng box
const VIEWER_FRAME =
  'relative bg-surface-inverse select-none rounded-lg overflow-hidden border border-line flex flex-col font-sans';

export const ThreeModelViewer: React.FC<ThreeModelViewerProps> = (props) => {
  const { className = 'h-96 w-full' } = props;   // cùng default với file thật
  return (
    <Suspense fallback={
      <div role="status" aria-live="polite" aria-busy="true"
           className={`${VIEWER_FRAME} ${className}`}>
        <span className="sr-only">Đang tải trình xem 3D…</span>
        <div aria-hidden="true" className="flex flex-1 items-center justify-center">
          <span className="size-2.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
        </div>
      </div>
    }>
      <HeavyThreeModelViewer {...props} />
    </Suspense>
  );
};
```

Quyết định:
- `import type { ThreeModelViewerProps }` **bị TypeScript xoá khi build** ⇒ wrapper không tạo static
  dependency vào module thật; chunk lazy mới là nơi kéo `three`.
- Fallback dùng **đúng bộ class khung** của viewer thật + cùng `className` từ caller + cùng default
  `h-96 w-full` ⇒ **không layout shift**. Nền `bg-surface-inverse` (D7 graphite) — token, **không hex**;
  dấu hiệu tải là chấm `bg-accent` `animate-pulse` có `motion-reduce:animate-none`.
- A11y: `role="status"` + `aria-live="polite"` + `aria-busy` + nhãn VI `sr-only`
  “Đang tải trình xem 3D…”; phần đồ hoạ `aria-hidden` để AT không đọc chấm.
- Không `forwardRef` (viewer gốc không dùng ref/forwardRef — đã kiểm), spread toàn bộ props nên
  call site giữ nguyên JSX.

---

## 3. Build & số đo (trước → sau)

Build **riêng**, không ghi `dist/`:
```bash
npx vite build --outDir dist-ssr/p5b --emptyOutDir          # BEFORE: tree đã có task-21, chưa có 5b
npx vite build --outDir dist-ssr/p5b-after --emptyOutDir    # AFTER: task-21 + 5b
```
(`dist-ssr/` đã gitignore — `git check-ignore` xác nhận.)

### 3.1 Cặp before/after cùng tree (khớp chính xác — dùng số này trong báo cáo)

| Chỉ số | BEFORE (`p5b`) | AFTER (`p5b-after`) | Δ |
|---|---:|---:|---:|
| `index-*.js` raw / gzip | 726.275 / **197.626** | 714.080 / **193.936** | -12.195 / **-3.690** (-1,9%) |
| `three-vendor-*.js` trong `index.html` modulepreload | **có** (133.372 gzip) | **không** | **-133.372 gzip khỏi initial** |
| Initial JS gzip (index + mọi `modulepreload`) | **406.834** | **269.772** | **-137.062 (-33,7%)** |
| Initial JS raw | 1.530.444 | 986.586 | -543.858 (-35,5%) |
| `index.html` modulepreload | react + supabase + **three** | react + supabase | — |

### 3.2 So với baseline Phase-1 mà Lead đưa (index `du8e82Q8`, trước task-21)

| Chỉ số | Phase-1 baseline | Sau 5a+5b | Δ |
|---|---:|---:|---:|
| `index-*.js` gzip | **240,15 K** | **193.936 B ≈ 189,4 KiB** | **-46,2 K gzip (-19,2%)** |
| Initial gzip (JS+CSS, 464.251 B) | **464.251** | 269.772 + CSS 15.655 = **285.427** | **-178.824 (-38,5%)** |
| `three-vendor` initial | 531.663 / 133.439 gzip | **0** | -133.439 gzip |

> Lưu ý: con số index chỉ giảm ~3,7 KB gzip vì `three-vendor` **vốn là chunk riêng**, không nằm trong
> byte của `index`; thắng thật nằm ở **initial network/preload** (-133,4 KB gzip three) — đúng mục tiêu
> “three không còn trong critical path”. `index` giảm thêm phần code viewer đã chuyển sang lazy chunk.

### 3.3 Chunk 3D sau khi lazy

| Chunk | raw | gzip | Vai trò |
|---|---:|---:|---|
| `index-CXYaozqd.js` | 714.080 | 193.936 | entry eager (chứa wrapper, không import three) |
| `ThreeModelViewer-bhpHjY5m.js` | **8.788** | **3.768** | lazy viewer — static import `three-vendor` |
| `three-vendor-DxYt6jHo.js` | **531.663** | **133.373** | chỉ được tải khi lazy viewer mount |
| `UnifiedCadToolbar-Bu_uKYsQ.js` | 3.913 | 1.161 | dep của lazy viewer |
| `dispose-Cc0Zn8sM.js` | 408 | 295 | dep của lazy viewer |

**Tổng payload lazy khi viewer mount:** 544.772 raw / **138.597 gzip** — sau first paint, không chặn FCP.
Tên `three-vendor` đổi hash (`Dzvn5SQW` → `DxYt6jHo`) do graph chunk thay đổi; nội dung three không đổi.

---

## 4. Static proof — three-vendor không còn trong initial load

### 4.1 `index.html` (nguồn sự thật của initial load)

```bash
$ grep -c 'three-vendor' dist-ssr/p5b-after/index.html
0
$ grep -oE '(<script[^>]+>|<link[^>]+modulepreload[^>]+>)' dist-ssr/p5b-after/index.html
<script type="module" crossorigin src="/assets/index-CXYaozqd.js">
<link rel="modulepreload" crossorigin href="/assets/react-vendor-foTQgREL.js">
<link rel="modulepreload" crossorigin href="/assets/supabase-vendor-Dou1_KsT.js">
```
Trước đó (BEFORE) có thêm `<link rel="modulepreload" href="…three-vendor-Dzvn5SQW.js">`.

### 4.2 `index` chunk không có static import three-vendor

```bash
$ grep -c 'import"\./three-vendor' dist-ssr/p5b-after/assets/index-*.js
0
$ grep -c 'from"\./three-vendor' dist-ssr/p5b-after/assets/index-*.js
0
```

### 4.3 Vì sao `grep -c 'three-vendor-' index-*.js` ra **1** (không phải 0)

Đó là **string trong `__vite__mapDeps`** — bảng dependency của dynamic import do Vite sinh để
preload đúng lúc chunk lazy được gọi, **không phải** `import` tĩnh:

```
…__vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ThreeModelViewer-bhpHjY5m.js",
"assets/react-vendor-foTQgREL.js","assets/three-vendor-DxYt6jHo.js",…
```

Cùng chỗ đó có dynamic import thật:
```js
React.lazy(()=>__vitePreload(()=>import("./ThreeModelViewer-bhpHjY5m.js"),__vite__mapDeps([...])))
```
⇒ Tiêu chí đúng là **`index.html` không preload + index không static import** (4.1/4.2), đã đạt.
Đừng dùng literal `grep -c three-vendor` để kết luận fail — nó bắt cả mapDeps.

### 4.4 Chunk nào static import `three-vendor` (tất cả đều lazy)

```bash
$ for f in dist-ssr/p5b-after/assets/*.js; do grep -qE 'from"\./three-vendor-[^"]+"|import"\./three-vendor-[^"]+"' "$f" && basename "$f"; done
PersonalizeView-Fmxq2wkx.js     # lazy route (task-21)
ThreeModelViewer-bhpHjY5m.js    # lazy viewer (task-22)
Tool3DView-D_6aTz7B.js          # lazy route (có sẵn từ trước)
```
Không chunk nào trong 3 chunk trên nằm trong `index.html`.

### 4.5 On-demand thật: `/explore` không tải three khi chưa mở quick-view

Prod preview (`vite preview --outDir dist-ssr/p5b-after --port 4173`) + fixture network-layer:

| Thời điểm | request `three-vendor` | request `ThreeModelViewer-*` | canvas |
|---|---:|---:|---:|
| `/explore` idle 2,5 s (quick-view component render nhưng chưa mở) | **0** | **0** | 0 |
| sau khi bấm “Xem trước 3D” | **1** (`three-vendor-DxYt6jHo.js`) | **1** | 1 |

---

## 5. 3D vẫn render (browser) + fallback không CLS

Prod preview :4173, Chromium headless (SwiftShader), fixture chỉ tiêm ở network layer (Supabase unreachable):

| Kiểm | Kết quả |
|---|---|
| PDP `/products/p1` 1440 | canvas 664×480, model + grid hiển thị trong screenshot, `pageerror = 0`; request lazy đúng thứ tự |
| Home `/` 1440 | hero 3D render (bánh răng + grid), `pageerror = 0` |
| Fallback (delay lazy chunk 1,5 s) | `role="status"` box **664×480** = viewer box **664×480** (`sameBox=true`), text “Đang tải trình xem 3D…”, class khung khớp viewer ⇒ **không layout shift** |
| Dev StrictMode (Vite :3000) | PDP canvas mount 664×480; quick-view modal vẫn mở (`open dialogs=1`), canvas 484×296, không kẹt fallback; `pageerror = 0` |

Ảnh: `/tmp/vcube-pdp-shots/p5b-pdp-prod-1440.png`, `p5b-home-prod-1440.png`,
`p5b-fallback-1440.png`, `p5b-dev-pdp.png`, `p5b-dev-quickview.png`.
Script: `/tmp/vcube-p5b-verify.cjs`, `/tmp/vcube-p5b-ondemand.cjs`, `/tmp/vcube-p5b-dev.cjs`,
fixture `/tmp/vcube-fixtures.cjs`.

> Ghi chú đo: `canvas.toDataURL()` trả ảnh đen với `ThreeModelViewer` (không bật
> `preserveDrawingBuffer`) nên **pixel-ratio đo bằng dataURL không dùng được**; kết luận render dựa
> trên screenshot (model/grid nhìn thấy) + canvas mount + 0 error. PersonalizeModelViewer3D có
> `preserveDrawingBuffer: true` nên đo pixel được (dùng ở handoff W2).

---

## 6. Gate

| Gate | Kết quả |
|---|---|
| `npm run lint` (tsc --noEmit) | **PASS** |
| build-equivalent (`npx vite build --outDir dist-ssr/p5b-after --emptyOutDir`) | **PASS** (5.75 s, 0 warning chặn) |
| `npm run build` vào `dist/` | **KHÔNG chạy** — Lead yêu cầu không ghi `dist/` (baseline + agent khác build song song); dùng lệnh build tương đương ở trên |
| Static proof initial | **ĐẠT** — §4 |
| Fallback a11y/VI + no-CLS | **ĐẠT** — §5 |
| `git diff -U0` scope | **ĐẠT** — 1 dòng/file, đúng 7 call-site + 1 dòng export |

---

## 7. Rủi ro / ghi chú cho Lead & QA

1. **Phụ thuộc task-21 (App.tsx)**: proof “index không còn three” chỉ đạt khi `PersonalizeView`
   đã lazy (chain eager `App → PersonalizeView → PersonalizeModelViewer3D → three` là chain thứ 5).
   Lúc đo, working tree của `storefront` đã lazy 9 route (`sha256(App.tsx)=4ee322de…`, giữ nguyên
   suốt quá trình). Nếu task-21 đổi tiếp, cần rebuild lại và so lại số §3 (index sẽ xê dịch đôi chút).
2. **Home vẫn fetch three sau first paint**: hero Home render `ThreeModelViewer` ngay ⇒ lazy chunk +
   three được tải **sau** main bundle (không chặn parse/FCP) nhưng vẫn là bytes trên Home. Muốn Home
   không tải three thì phải thay hero bằng poster (quyết định B1 trong `03-resources.md`) — ngoài scope.
3. **Một network round-trip mới**: máy chậm/3G có thể thấy fallback ~vài trăm ms. Fallback cùng box,
   cùng nền tối, nên không CLS; đã đo box khớp tuyệt đối. Fallback có `role=status` + VI sr-only.
4. **Vite mapDeps** làm literal grep trên `index-*.js` ra 1 (xem §4.3). Reviewer/QA nên dùng 4.1/4.2.
5. **Chưa chạy Lighthouse/WebPageTest thật**; CLS được chứng minh bằng so box + screenshot, không
   phải Web Vitals instrumentation. Chromium headless dùng SwiftShader (không đại diện GPU thật).
6. **Không thay đổi behavior**: viewer vẫn lazy WebGL theo `useInViewport` bên trong; wrapper chỉ đổi
   thời điểm load module. Designer/AssetLibrary/ServiceShowcase chỉ đổi import.
7. **Dọn build tạm**: `dist-ssr/p5b` (before) và `dist-ssr/p5b-after` (after) đều gitignored; có thể xoá
   sau khi Lead đối chiếu. Không đụng `dist/` và không xoá gì ngoài `dist-ssr/`.

---

## 8. Việc chưa browser-verified

- Chưa test trên **mobile thật / Safari iOS** (chỉ Chromium headless 1440; layout wrapper không khác
  call site cũ nên rủi ro thấp).
- Chưa đo **CLS bằng PerformanceObserver** khi mạng thật chậm (chỉ so box fallback/viewer + screenshot).
- Chưa test **route Designer/Lab** (nơi có 2 call-site designer): chúng là lazy route; viewer render
  sau khi route mở — logic import đổi path nên hành vi giữ nguyên, nhưng chưa chụp ảnh.
