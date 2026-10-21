<!-- doc-meta: status=active; verified=2026-10-21; owner=tool3d -->
# HANDOFF — Phase 4a: tách `Tool3DView.tsx` + `tool3d/ModelViewer3D.tsx`

> **Work item:** `task-32` · **Agent:** `tool3d` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `dd0b86b` (Phase 1–3 đã push).
> **Trạng thái:** **DONE** — behavior-preserving, lint/build xanh, smoke browser xanh, không commit/push.
> **Build vào `dist-ssr/p4a/`** (gitignored, `git check-ignore` xác nhận) — **không ghi `dist/`**.
> **Không sửa:** `ThreeModelViewer.tsx`, `LazyThreeModelViewer.tsx`, `src/App.tsx`, views khác, backend,
> `package.json`, `src/index.css`. Không thêm dependency, không thêm `any` mới.

---

## 1. Kết quả đo

| Chỉ số | Trước | Sau | Δ |
|---|---:|---:|---:|
| `src/frontend/views/Tool3DView.tsx` | **1.956 dòng** | **1.057 dòng** | **−899 (−46,0%)** — target ≤ 1.100 ✅ |
| `src/frontend/components/tool3d/ModelViewer3D.tsx` | **2.116 dòng** | **869 dòng** | **−1.247 (−58,9%)** — target ≤ 1.100 ✅ |
| File mới | 0 | **11 file / 2.748 dòng** | lớn nhất **558** — target ≤ 700 ✅ |
| `git diff --stat` 2 file gốc | — | — | **+195 / −2.341** |
| Tổng LOC 2 file gốc + file mới | 4.072 | **4.674** | +602 (typings cho hook param — xem §8.2) |
| Public export | — | — | **giữ nguyên 100%** (§4.3) |
| `scene.background` / lights / geometry | `0x0a1120` + 3 directional + hemi + ambient | **y nguyên** (block-move) | 0 đổi |
| JSX/class/copy hiển thị | — | **byte-identical** (block-move) | 0 đổi (§4.1) |
| Render DOM (baseline HEAD vs sau tách) | — | **byte-identical** sau normalize | 0 đổi (§4.2) |

**Bảng file mới:**

| File | Dòng | Trách nhiệm |
|---|---:|---|
| `components/tool3d/tool3dAnalysis.ts` | 199 | Helper đo lường/parse **thuần** (không React): `measuredText/bedOf/bedText/bedVolume/derivePrintabilityScore/derivePrintabilityLevel/countMeasuredScoreInputs/describeUnmeasuredScoreInputs/formatOverhangLabel/measuredOverhang/computeSha256/formatFileSize/findFileStructureProblem` + `ParseFailure` |
| `components/tool3d/ParseFailurePanel.tsx` | 80 | Panel lỗi đọc tệp (presentational, props y nguyên) |
| `components/tool3d/Tool3DEmptyState.tsx` | 144 | Khối `if (!selectedFile) return (...)` của `/quote` |
| `components/tool3d/Tool3DUploadStrip.tsx` | 138 | Thanh "Tệp đang xử lý" + khung kéo–thả mở rộng |
| `components/tool3d/Tool3DSlicingConfigPanel.tsx` | 219 | Tab "1. Cấu hình" (máy in/vật liệu/độ đặc/lớp in/vật liệu đỡ/số lượng) |
| `components/tool3d/Tool3DAnalysisPanel.tsx` | 378 | Tab "2. Phân tích" (báo cáo kiểm định + sub-tab 2/3/4 + 3 panel con) |
| `components/tool3d/modelViewerHelpers.ts` | 52 | `WebGLRecoveryState`, `VIEW_ANGLE_LABEL`, `MIN_VIEW_FRAME`, `formatSeconds`, `plateMetaText` |
| `components/tool3d/useModelViewerFullscreen.ts` | 86 | Hook Fullscreen API + fallback + ESC + body-lock (3 hook con) |
| `components/tool3d/useModelViewerScene.ts` | 558 | Hook scene graph/renderer/cameras/lights/input/context-loss FSM/render loop/resize |
| `components/tool3d/useModelViewerMesh.ts` | 402 | Hook geometry+mesh+stencil capping+auto-fit camera |
| `components/tool3d/ModelViewerChrome.tsx` | 492 | Toàn bộ chrome/HUD/toolbar/overlay bên trong khung 3D (presentational) |

---

## 2. Bản đồ vùng → file đích (line-map)

### 2.1 `views/Tool3DView.tsx`

| Vùng cũ | Nội dung | Đích |
|---|---|---|
| 18–209 | helper đo lường/parse thuần | `tool3d/tool3dAnalysis.ts` |
| 212–286 | `ParseFailurePanel` | `tool3d/ParseFailurePanel.tsx` |
| 611–715 | JSX trạng thái rỗng | `tool3d/Tool3DEmptyState.tsx` |
| 990–1097 | upload strip | `tool3d/Tool3DUploadStrip.tsx` |
| 1281–1448 | tab "1. Cấu hình" | `tool3d/Tool3DSlicingConfigPanel.tsx` |
| 1453–1782 | tab "2. Phân tích" | `tool3d/Tool3DAnalysisPanel.tsx` |
| còn lại (state/handlers/effect parse/header/out-of-bounds/object-tree/quote/history/modals/color tab) | container + compose | **`views/Tool3DView.tsx` (1.057)** |

Parent giữ **nguyên vị trí** state, 5 handler file/part, effect `parse`-sync, grid workspace, cột object tree, cột báo giá,
accordion lịch sử, 2 modal; chỉ thay 5 khối JSX bằng lời gọi component với **cùng tên prop**.

### 2.2 `components/tool3d/ModelViewer3D.tsx`

| Vùng cũ | Nội dung | Đích |
|---|---|---|
| 8–16, 48–84 | type/helper/const thuần | `tool3d/modelViewerHelpers.ts` |
| 285–349 | `handleToggleFullscreen` + sync fullscreen + body-lock effect | `tool3d/useModelViewerFullscreen.ts` |
| 401–901 | effect dựng scene/renderer/cameras/lights/bed/input/context-loss/loop/resize (501 dòng) | `tool3d/useModelViewerScene.ts` |
| 912–1265 | effect mesh/stencil/auto-fit | `tool3d/useModelViewerMesh.ts` |
| 1724–2113 | JSX chrome/HUD/toolbar/overlay | `tool3d/ModelViewerChrome.tsx` |
| còn lại (state/refs/effects còn lại/handlers/wrapper drag-drop/`return`) | container | **`ModelViewer3D.tsx` (869)** |

**Thứ tự hook/effect không đổi:** 2 hook được gọi **đúng vị trí** khối cũ
(`useModelViewerFullscreen` tại chỗ `handleToggleFullscreen`; `useModelViewerScene` tại chỗ effect scene;
`useModelViewerMesh` tại chỗ effect mesh; `<ModelViewerChrome>` trong wrapper cũ). Các `useEffect` còn lại
(transform/material/visibility/slice-plane/…) vẫn nằm sau, đúng thứ tự cũ.

---

## 3. Hook contracts (dep array giữ nguyên)

| Hook | Inputs | Ghi chú |
|---|---|---|
| `useModelViewerFullscreen({ isFullscreen, setIsFullscreen, rootWrapperRef })` → `handleToggleFullscreen` | state + ref do component sở hữu | 2 effect `[isFullscreen]` giữ nguyên |
| `useModelViewerScene(params)` | `containerRef, bed, viewFrame, contextEpoch, interactionMode, cameraMode` + 17 ref Three.js + `fpsDisplayRef, localMeasurementActiveRef, handleMeasureClickRef, onSelectPartRef` + `setWebglState, setContextEpoch, setHoveredPartName` | effect deps **y nguyên** `[bed?.x, bed?.y, bed?.z, contextEpoch]` |
| `useModelViewerMesh(params)` | `meshGroupRef/stencilGroupRef/partMeshMapRef/clipPlaneRef/stencilMat*Ref/orbitTargetRef/perspectiveCameraRef/orthoCameraRef` + `customGeometry, customObjectGroup, modelType, parts, selectedPartId, showDefects, compareMode, activePlateIndex, currentPlate, wireframe, setModelDims, setModelHeight, contextEpoch` | effect deps **y nguyên** `[customGeometry, customObjectGroup, modelType, parts.length, contextEpoch]` |
| `<ModelViewerChrome …>` | 41 prop presentational | không state/effect riêng; JSX nguyên văn |

---

## 4. Bằng chứng behavior-preserving

### 4.1 Block-move: **byte-identical** (không sửa một ký tự JSX/logic)

Script kiểm tra đọc lại file gốc `git show dd0b86b:<file>` (bản sao `/tmp/p4a-orig/`) và so **nguyên văn** từng dòng
với file mới (chỉ chấp nhận khác duy nhất tiền tố `export ` ở 2 file helper):

| Block gốc | Dòng | File mới | Kết quả |
|---|---|---|---|
| `Tool3DView.tsx` | 611–715 | `Tool3DEmptyState.tsx` | **OK — 105/105 dòng nguyên văn** |
| `Tool3DView.tsx` | 990–1097 | `Tool3DUploadStrip.tsx` | **OK — 108/108** |
| `Tool3DView.tsx` | 1281–1448 | `Tool3DSlicingConfigPanel.tsx` | **OK — 168/168** |
| `Tool3DView.tsx` | 1453–1782 | `Tool3DAnalysisPanel.tsx` | **OK — 330/330** |
| `Tool3DView.tsx` | 212–286 | `ParseFailurePanel.tsx` | **OK — 71/71** (chỉ `const` → `export const`, comment giữ nguyên) |
| `Tool3DView.tsx` | 18–209 | `tool3dAnalysis.ts` | **OK — 192/192** (chỉ thêm `export `) |
| `ModelViewer3D.tsx` | 1724–2113 | `ModelViewerChrome.tsx` | **OK — 390/390 nguyên văn** |
| `ModelViewer3D.tsx` | 285–349 | `useModelViewerFullscreen.ts` | **OK — 65/65** |
| `ModelViewer3D.tsx` | 402–900 | `useModelViewerScene.ts` | **OK — 499/499** |
| `ModelViewer3D.tsx` | 913–1264 | `useModelViewerMesh.ts` | **OK — 352/352** |
| `ModelViewer3D.tsx` | 48–84 | `modelViewerHelpers.ts` | **OK — chỉ thêm `export `** |

⇒ Không có thay đổi nào về: JSX, class/token UI, copy VI, điều kiện, handler, công thức pricing/mesh,
`scene.background = 0x0a1120`, 3 directional + hemisphere + ambient light, material, geometry.

### 4.2 DOM-equivalence với baseline HEAD `dd0b86b`

- Dựng **baseline sạch** `git worktree add /tmp/p4a-base dd0b86b` → `vite build` → `vite preview :4192`;
  build sau tách → `vite preview :4191`.
- Playwright/Chromium headless mở `/quote` ở 390×844 và 1440×900, route-intercept Supabase (paused),
  `reducedMotion: reduce`; chụp `document.body.innerHTML` ở 2 trạng thái: **empty** và **workspace sau khi upload STL**.
- Chuẩn hoá: `\d+ FPS`, id `useId` (`_r_*`, `aria-*`), và giờ đồng hồ chat (`HH:MM` — component ngoài scope).
- Kết quả **byte-identical**:

| Snapshot | sha256 (normalized) | Baseline vs sau tách |
|---|---|---|
| 390 empty | `b2e7b0bb61b36676` | **IDENTICAL** |
| 390 workspace | `8a47eccc40b6f144` | **IDENTICAL** |
| 1440 empty | `b2e7b0bb61b36676` | **IDENTICAL** |
| 1440 workspace | `e99a542356884fa5` | **IDENTICAL** |

- Trước khi normalize: 1440 đã identical tuyệt đối; 390 chỉ khác đúng phút đồng hồ của widget chat
  (`13:19` vs `13:20`, `ChatSupportModal` — ngoài file scope), không liên quan bản tách.

### 4.3 Public API/export giữ nguyên

| File | Export trước | Sau |
|---|---|---|
| `views/Tool3DView.tsx` | `export const Tool3DView`, `export default Tool3DView`, `export interface ParseFailure` | y nguyên (`ParseFailure` nay re-export type từ `tool3dAnalysis`) |
| `components/tool3d/ModelViewer3D.tsx` | `export type WebGLRecoveryState`, `export interface ModelViewer3DProps`, `export const ModelViewer3D` | y nguyên (`WebGLRecoveryState` re-export type từ `modelViewerHelpers`) |

`ModelViewer3DProps` và `Tool3DViewProps` **giữ nguyên văn** trong file gốc (không đổi prop nào).

---

## 5. Gates

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (tsc --noEmit, 0 lỗi — chạy lúc 13:2x sau khi 3 workstream Phase 4 khác trong cây đã ổn định; trong scope `tool3d/**` + `Tool3DView` = 0 lỗi suốt quá trình) |
| Build | `npx vite build --outDir dist-ssr/p4a --emptyOutDir` | **PASS** — `✓ built in 5.18s` (chunk `Tool3DView-*.js` 355,97 kB / 99,58 kB gzip; `three-vendor` 531,66 kB tách riêng như cũ) |
| Build dir | `dist-ssr/p4a/` | gitignored (`.gitignore:9 dist-ssr/`), **`dist/` không bị ghi** (`git status -- dist/` trống) |
| Scope | `git status` | chỉ 2 file gốc `M` + 11 file mới `??` + handoff này; **0 file ngoài write-scope** |
| Dependency | `git status -- package.json` | **không đổi** |
| `any` mới | grep 11 file mới | **0 `any` mới**; 4 chỗ `as any` (webkit fullscreen) + 1 `as any` (`supportsMode`) là **nguyên văn di chuyển** từ code cũ |
| Copy/UI | block-move §4.1 | **0 ký tự copy/class bị đổi** |

> Ghi chú minh bạch: trong ~30 phút đầu, cây làm việc còn 3 workstream Phase 4 khác đang dở
> (`workshopService`, `PricingConfigPanel`, `AppRoutes/App`) nên `tsc` tạm báo lỗi **ở file của họ**;
> scope `tool3d/**` luôn 0 lỗi. Lần chạy cuối (sau khi họ ổn định) `npm run lint` = **PASS**.

---

## 6. Browser smoke (best effort — Supabase paused)

- Tooling: Playwright npx cache `~/.npm/_npx/e41f203b7505f1fb/node_modules` (playwright 1.64.1),
  Chromium `~/.cache/ms-playwright/chromium-1244/chrome-linux64/chrome`,
  `LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu`.
- Script: `/tmp/p4a-smoke/smoke.mjs` (Smoke), `/tmp/p4a-smoke/compare.mjs` (DOM baseline diff).
  Ảnh: `/tmp/p4a-smoke/quote-{empty,workspace,analysis}-{390,1440}.png`.
- Môi trường: `vite preview` build `dist-ssr/p4a`; Supabase **route-intercept** ở tầng network
  (không fixture vào repo) ⇒ materials/printers rỗng, giá rỗng là trạng thái data-honesty hợp lệ.
  Upload tệp **STL nhị phân thật** sinh ở `/tmp` (tứ diện 40×60×30) để kiểm luồng parse + viewer.

| Kiểm | 390×844 | 1440×900 |
|---|---|---|
| `pageerror` / console error | **0** | **0** |
| Trang `/quote` render (h1, empty state) | ✅ | ✅ |
| Upload STL → workspace (parse thật) | ✅ (modal xác nhận đơn vị STL mở đúng hành vi) | ✅ |
| WebGL canvas sau tách hook | **1 canvas** | **1 canvas** |
| HUD/toolbar chrome (nút điều khiển) | **13 nút** trong viewer | **13 nút** |
| Bottom slicer bar (`LỚP IN:`) | ✅ | ✅ |
| Tab workspace (component tách) | `1. Cấu hình / 2. Phân tích / 3. Màu sắc` | như 390 |
| Tab Phân tích render báo cáo (component tách) | ✅ `BÁO CÁO KIỂM ĐỊNH` | ✅ |
| Modal STL vs 3MF | mở, cuộn được, **không tràn ngang** | mở, cuộn được, không tràn |
| Tràn ngang trang | `scrollW 390 = clientW 390` | `scrollW 1440 = clientW 1440` |

---

## 7. Rollback

```bash
cd /home/thanh/home/thanh/project/Vcube
git checkout -- src/frontend/views/Tool3DView.tsx src/frontend/components/tool3d/ModelViewer3D.tsx
rm -f src/frontend/components/tool3d/{tool3dAnalysis.ts,ParseFailurePanel.tsx,Tool3DEmptyState.tsx,Tool3DUploadStrip.tsx,Tool3DSlicingConfigPanel.tsx,Tool3DAnalysisPanel.tsx,modelViewerHelpers.ts,useModelViewerFullscreen.ts,useModelViewerScene.ts,useModelViewerMesh.ts,ModelViewerChrome.tsx}
# (xóa handoff nếu cần) — không có thay đổi DB/route/package nào khác
```

---

## 8. Rủi ro & lưu ý cho các pha sau

1. **Vị trí gọi hook là một phần của behavior:** 3 hook mới được gọi đúng chỗ khối cũ để giữ **thứ tự effect**.
   Nếu pha sau di chuyển lời gọi hook, phải kiểm lại thứ tự mount (scene trước mesh/transform) — không tự ý đổi.
2. **Hook nhận refs qua param object** ⇒ nếu sau này đổi cấu trúc refs trong component, cập nhật type ở
   `useModelViewerScene.ts`/`useModelViewerMesh.ts` cùng lúc. Net LOC +602 chủ yếu do khối typing param này;
   có thể gọn hơn ở pha clean-code bằng một `ViewerRefs` interface dùng chung (không làm trong pha này để giữ
   block-move thuần).
3. **Deps của `useModelViewerMesh` giữ nguyên bản gốc** (`[customGeometry, customObjectGroup, modelType,
   parts.length, contextEpoch]` — `parts`/`selectedPartId`/`showDefects`/`compareMode`/`wireframe` là closure,
   không nằm trong deps). Đây là hành vi **có sẵn**, không phải regression; đừng "sửa deps" ở pha tách file.
4. **`useModelViewerFullscreen` chứa 4 `as any` webkit** — nguyên văn từ code cũ; nếu muốn dọn `any` phải làm ở
   pha khác có test trình duyệt (Safari/iOS).
5. **`formatSeconds`/`plateMetaText`** chuyển sang `modelViewerHelpers.ts`; `Tool3DView` không còn dùng trực tiếp.
   Nếu pha sau cần `formatSeconds` cho panel khác, import từ helpers (đừng copy lại).
6. **DOM-compare chỉ so cấu trúc/text**, không so pixel canvas (WebGL phụ thuộc GPU/AA). Canvas đã kiểm
   `canvas=1`, không pageerror; nếu muốn chắc hơn, pha test sau có thể so `renderer.info` / screenshot pixel.
7. **Smoke không có dữ liệu DB thật** (Supabase paused) ⇒ luồng pricing/material thật chưa chạy end-to-end;
   phần đó là block-move, không đổi logic, nhưng QA nên kiểm lại sau khi resume Supabase.
8. **Cây làm việc đang có 3 workstream Phase 4 song song** (admin/pricing, workshopService, App/routes).
   Gate ở trên đo trên cây chia sẻ tại thời điểm 13:2x; nếu chạy lại thấy `lint` đỏ, kiểm lỗi thuộc file nào
   trước khi kết luận hồi quy từ task này.
9. **Handoff chưa cập nhật `docs/tasks/optimization/04-refactor.md`** (file của audit, ngoài write-scope) —
   số sau tách: `Tool3DView 1.057`, `ModelViewer3D 869`; đề nghị Lead/audit cập nhật §1.5/§1.7 nếu cần.
