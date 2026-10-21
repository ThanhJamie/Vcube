<!-- doc-meta: status=active; verified=2026-10-21; owner=commerce-auth -->
# HANDOFF — Phase 4e: independent verification (7 god-file splits)

> **Work item:** `task-36` (reassigned từ ui-auditor) · **Agent:** `commerce-auth` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `dd0b86b` + Phase-4 working tree **CHƯA commit**.
> **Mode:** read-only `src/**`; chỉ ghi file này. Không commit/push. Preview smoke **đã tắt** (`:4176` → down).
> **Nguồn so sánh:** baseline dựng độc lập từ `git archive dd0b86b` → `/tmp/vcube-p4-base` (+ symlink `.env`
> và `node_modules`); build baseline tại đó, build official tại `dist/` (gitignored).

---

## 0. VERDICT: **GO-WITH-RISKS** (không có blocker; 3 risk cần theo dõi ở Phase 6/QA)

| Trụ cột | Kết luận |
|---|---|
| LOC targets (7 file) | ✅ **7/7 đạt** (chi tiết §1) |
| Behavior parity | ✅ **mạnh**: App `<Routes>` + `handleNavigate` **byte-identical**; 4 file gốc còn lại **98,8–100%** dòng code gốc xuất hiện nguyên văn trong cây mới; service **38/38 export · 52/52 method body identical · 8/8 private helper**; **0 dòng copy VI bị đổi** |
| Scope / dependency | ✅ chỉ 7 file M + 65 file mới; `package.json`/`package-lock.json` **0 diff**; `git diff --check` clean |
| Import graph | ✅ `tsc` PASS · **0 circular import** (HEAD 143 file/481 cạnh → 208 file/737 cạnh, cycles 0→0) |
| Gates | ✅ `lint` PASS · `rm -rf dist && npm run build` PASS · **10/10 offline gate: KHÔNG TỆ HƠN BASELINE** |
| Bundle | ✅ trong ngưỡng: initial critical **277.322 → 278.448 B gzip9 = +0,406%** (<2%); 39 chunk, 15 dynamic import, `three-vendor` async — **không đổi** |
| Browser smoke | ✅ 24 route-check (12 route × 390/1440): **0 pageerror · 0 tràn ngang · 0 white**; `/quote` upload STL → workspace; Home/PDP canvas; CartDrawer; add-to-cart toast |

**3 risk (không blocker):** (R1) `/admin` + `/lab/settings` **không mount được** trong smoke (RoleGuard chặn do Supabase paused) ⇒ parity của 2 nhánh admin/lab chỉ dựa static (block-move 99%+tsc+API); (R2) initial critical **+0,41%** do overhead module mới (chấp nhận, <2%); (R3) phát hiện **+2 khai báo `payload?: any` mới** trong `workshop/settings/` (net `: any` +1) — claim "0 any mới" của builder 4c **không chính xác tuyệt đối** (không đổi runtime/typing semantics).

---

## 1. LOC — before (HEAD `dd0b86b`) → after → target

| File gốc | Before | After | Δ | Target | Kết quả |
|---|---:|---:|---:|---:|---|
| `src/App.tsx` | 1.100 | **343** | −757 (−68,8%) | ≤600 | ✅ |
| `src/frontend/views/Tool3DView.tsx` | 1.956 | **1.057** | −899 (−46,0%) | ≤1.100 | ✅ |
| `src/frontend/components/tool3d/ModelViewer3D.tsx` | 2.116 | **869** | −1.247 (−58,9%) | ≤1.100 | ✅ |
| `src/frontend/components/admin/PricingConfigPanel.tsx` | 3.079 | **985** | −2.094 (−68,0%) | ≤1.200 | ✅ |
| `src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx` | 2.012 | **755** | −1.257 (−62,5%) | ≤800 | ✅ |
| `src/frontend/views/WorkshopSettingsView.tsx` | 2.574 | **865** | −1.709 (−66,4%) | ≤1.000 | ✅ |
| `src/backend/services/workshopService.ts` | 2.243 | **128** (façade) | −2.115 (−94,3%) | ≤150 | ✅ |

**File mới: 65 file / 12.222 dòng** (không phải "~75" như mô tả task; đúng theo 4 handoff builder):

| Nhóm | Số file | LOC mới | File lớn nhất | Ghi chú |
|---|---:|---:|---:|---|
| App (routes/shell/hooks) | 4 | 1.006 | `routes/AppRoutes.tsx` 457 | + `useAppNavigation` 203 · `AppOverlays` 327 · `screens` 19 |
| tool3d | 11 | 2.748 | `useModelViewerScene.ts` **558** | max ≤700 ✅ |
| admin (10 pricing + 9 group1) | 19 | 3.991 | `pricing/FormulaCoreSections.tsx` **604** | max ≤700 ✅ |
| workshop (14 backend + 17 frontend) | 31 | 4.477 | backend `seed.ts` **385** · frontend `QueueTab.tsx` **343** | max ≤600 ✅ |
| **Tổng** | **65** | **12.222** | **604** | |

**Tổng LOC 7 module:** before **15.080** → after **17.224** (5.002 ở file gốc còn lại + 12.222 file mới) = **+2.144 (+14,2%)** — overhead import/type/props/composition, **không có logic mới**. Theo nhóm: App +249 · tool3d +602 · admin +640 · workshop +653 (khớp handoff từng builder).

---

## 2. Behavior parity — bằng chứng độc lập

### 2.1 App.tsx — **byte-identical** cho 2 khối quan trọng nhất

| Khối | Cách đo | Kết quả |
|---|---|---|
| `<Routes>…</Routes>` | cắt marker `<Routes>`/`</Routes>` từ `git show HEAD:src/App.tsx` và `routes/AppRoutes.tsx` → sha256 **raw** | **IDENTICAL** — 12.048 ký tự, sha256 `bcd48d1ef3b05e6d…` cả 2 bên |
| `handleNavigate` body | brace-matcher (tôn trọng string/comment) → strip indent/blank → sha256 | **IDENTICAL** — 4.591 ký tự, sha256 `0a2a8aa5552573ad…`; khác biệt duy nhất ngoài body: `payload?: any` → `payload?: AppNavPayload` (type-only, runtime y nguyên) |
| Route path | `[...matchAll(/path="([^"]+)"/g)]` | **30/30 route, đúng thứ tự** |
| Dynamic import trong entry chunk | `import("…")` trong `dist/assets/index-*.js` | **15/15 target, set identical** (baseline vs after, sau khi strip hash) — gồm 9 route view + 5 console view + `ThreeModelViewer` |
| Static import tới lazy route | grep import tĩnh 8 view lazy trong App graph | **0** (như baseline) |
| `useEffect` | đếm + so deps multiset | HEAD App **2** effect (deps `[isLoggedIn,user,mergeGuestCart]`, `[location.pathname,isChatOpen,isCartDrawerOpen]`); after App **2**, deps **identical**. 8 effect còn lại nằm trong hook files **không bị sửa** (`git status` không có `src/frontend/hooks/*` cũ) ⇒ **10/10 không đổi** |
| Realtime/subscribe | grep trong App + hooks liên quan, HEAD vs after | `.channel(` **1→1** · `removeChannel(` **1→1** · `subscribeSettings(` **2→2** · `addEventListener('scroll'` **1→1** |
| `AppOverlays` | so 164 dòng "significant" với App gốc | 146/164 (89%) nguyên văn; **18 dòng mới = docblock + `interface AppOverlaysProps` + chữ ký function + destructure props** — **0 dòng JSX/markup/class mới** |
| Handler/hook bị dời | so tên `handle*`/hook counts HEAD vs after | App `handle*` 5→4: chỉ mất `handleNavigate` → **có mặt trong `useAppNavigation.ts`** ✅ |

### 2.2 4 file gốc còn lại — coverage dòng code gốc trong cây mới

Mỗi dòng "significant" (bỏ blank/comment/import, ≥18 ký tự, chuẩn hoá whitespace + bỏ tiền tố `export `) của file HEAD được tìm lại trong **toàn bộ cây `src/` sau tách**:

| File gốc | Dòng gốc kiểm | Có trong cây mới | Coverage | Dòng thiếu (đã phân loại) |
|---|---:|---:|---:|---|
| `App.tsx` | 523 | 520 | **99,43%** | 2 dòng `} from '…'` (import gộp) + `const handleNavigate = (…` (đổi chữ ký hook) |
| `Tool3DView.tsx` | 986 | 986 | **100,00%** | — |
| `ModelViewer3D.tsx` | 1.270 | 1.270 | **100,00%** | — |
| `PricingConfigPanel.tsx` | 1.683 | 1.678 | **99,70%** | 5 dòng **composition** (`{subTab === 'x' && (` / `{(isNewMaterialOpen \|\| …) && (`) |
| `Group1WorkshopsPanel.tsx` | 847 | 841 | **99,29%** | 6 dòng **composition** (`{activeTab === 'x' && (` / `{isAdd*ModalOpen && (`) |
| `WorkshopSettingsView.tsx` | 1.210 | 1.195 | **98,76%** | 8 dòng import-type + 7 dòng **composition/sub-guard** (`{activeTab === 'x' && (`, nút retry `onClick` → `onRetry`) |
| `workshopService.ts` | 1.260 | 1.250 | **99,21%** | 2 dòng import + 8 chữ ký `private static` (→ `export function` ở `workshop/shared.ts`) |

⇒ Toàn bộ "dòng thiếu" là **ranh giới tách module** (import/composition/signature), **không có dòng logic/JSX/copy bị mất**.

### 2.3 File mới — dòng "mới" có đúng là glue?

- 65 file mới: **6.193** dòng significant; **774 dòng (12,50%) không xuất hiện trong file gốc**.
- Tập trung đúng chỗ: **3 file `types.ts`** (props contracts, 99–116 dòng, 100% mới theo thiết kế), interface params của hook (`useModelViewerScene/Mesh/Fullscreen`, `useAppNavigation`), import/export lists, composition JSX và chữ ký component.
- Không có file nào ngoài `types.ts`-nhóm vượt 30% dòng mới; `tool3d/useModelViewerScene` 89,6% từ gốc, `AppRoutes` 89,1%, `PricingConfigPanel` 90,5%.
- `workshop/shared.ts` 70,5% từ gốc — 28 dòng mới là 8 helper chuyển từ `private static` → `export function` (đã verify body 8/8 identical, §2.5).

### 2.4 tool3d — helper "chỉ thêm `export `"

`tool3dAnalysis.ts` 118 dòng code: **117/118** khớp nguyên văn HEAD sau khi bỏ tiền tố `export `; dòng còn lại là 2 import mới (module boundary) + `export interface ParseFailure` (nguyên văn `export interface ParseFailure {` từ HEAD).
`modelViewerHelpers.ts` 31 dòng: **30/31** khớp; dòng còn lại là import `PlateInfo` + `export type WebGLRecoveryState` (nguyên văn từ HEAD). ⇒ đúng claim "2 file helper chỉ thêm `export` + import".

### 2.5 workshopService — public surface & body

| Kiểm | Kết quả |
|---|---|
| Export top-level (class + type/const/SEED) | **38 trước = 38 sau, IDENTICAL** (không thiếu/không thêm) |
| Public static method | HEAD **52** (60 static − 8 private) = façade **52** — **danh sách IDENTICAL** |
| Body method public | **52/52 body-identical** sau normalize (`WorkshopService.` → direct call, `static ` → `export function `): 50/50 qua script breadth + `saveWorkshopProfile` (47/47 dòng) và `checkSupabaseHealth` (byte-identical) kiểm tay vì return-type có `{...}` |
| Private helper | **8/8** body-identical trong `workshop/shared.ts` (`computeStockStatus`, `mapMy*` ×6, `toNumberOrNull`) |
| Delegate | **52/52** delegate trỏ tới hàm **tồn tại thật** trong module tương ứng (0 bad) |
| `workshopService.*` usage toàn `src/` | **15/15 symbol, set IDENTICAL** trước/sau |
| Importer cũ | **3/3 không đổi**: `WorkshopOnboardingWizard`, `shell/LabRoute`, `WorkshopSettingsView` (không có trong `git status` modified) |
| Importer mới | 8 file **mới** trong `workshop/settings/` import type/const qua façade (cùng hướng phụ thuộc như view cũ; type/const chứ không gọi method) — **không tạo cycle** |

### 2.6 Public API 7 file gốc + hook/handler accounting

- Export sets 7 file gốc **IDENTICAL** (App 2/2 · Tool3DView 3/3 gồm `ParseFailure` re-export type · ModelViewer3D 3/3 gồm `WebGLRecoveryState` · Pricing 1/1 · Group1 3/3 · WorkshopView 3/3 · service 38/38).
- `ModelViewer3D`: `useEffect` 16→12, `useCallback` 3→2, `handle*` 16→11 — **5 handler mất ở parent đều có trong hook mới** (`handleContextLost`, `handleContextRestored`, `handleFsChange`, `handleKeyDown`, `handleVisibilityChange`); deps-array count tổng **19 = 19**.
- `WorkshopSettingsView`: `useMemo` 1→0 vì `stats` useMemo chuyển nguyên văn sang `WorkshopStatsCards.tsx` (đã kiểm).
- App `handleNavigate` chuyển sang `useAppNavigation` (§2.1).

### 2.7 Copy VI — **không đổi**

So **dòng code có ký tự Việt** (bỏ comment) của 7 file HEAD, chuẩn hoá whitespace + `${…}`:

| Kiểm | Kết quả |
|---|---|
| 1.321 dòng VI trong 7 file gốc | **1.320/1.321** xuất hiện nguyên văn trong cây mới |
| Dòng lệch duy nhất | `const PREVIEW_NOT_CONFIGURED = 'Chưa cấu hình';` → `export const …` (chỉ thêm `export`) |
| Dòng VI **mới** trong 65 file mới | **1** — chính là dòng export trên. **0 câu chữ VI nào bị viết lại/thêm/bớt** |

---

## 3. Scope, dependency, import graph

- `git status`: **7 file tracked M** (`src/App.tsx`, `workshopService.ts`, `Tool3DView`, `ModelViewer3D`, `PricingConfigPanel`, `Group1WorkshopsPanel`, `WorkshopSettingsView`) + **65 file mới** đúng 8 thư mục đã khai + 4 handoff của builder. **Không file nào ngoài write-scope bị sửa.**
- `git diff --stat`: **7 files, +713 / −10.791**. `git diff --check`: **clean**.
- `git diff package.json package-lock.json`: **0** → **không thêm dependency**. `vite.config.ts`, `src/index.css`, `supabase/**`, `docs/**` (ngoài handoff) không đổi.
- `any`: `: any` **131 → 132** (+1 net), `as any` **60 → 60**. Phân rã: service **33→33** (chuyển nguyên văn sang 14 module), Group1 **9→5+4**, ModelViewer **8→4+4**, Tool3D **4→3+1**, Pricing **1→0+1**, App **1→0**; **+2 khai báo mới** `payload?: any` trong `workshop/settings/types.ts:79` + `SettingsStates.tsx:50` (lặp lại type có sẵn thay vì import) ⇒ net +1. Không có `@ts-ignore`/`@ts-expect-error` mới; 4 `eslint-disable-next-line react-hooks/exhaustive-deps` **nguyên văn** từ HEAD (4→4).
- **Circular import:** script tự viết (resolve `.`/`@backend`/`@frontend`/`@` trên toàn `src/**`): HEAD **143 file / 481 cạnh / 0 cycle** → after **208 file / 737 cạnh / 0 cycle**.
- Cross-group imports file mới chỉ có: `routes → hooks` (AppRoutes dùng `AppNavigate`), `shell → hooks` (AppOverlays), `workshop/settings → façade workshopService` (type/constant). Không có import chéo lạ admin↔tool3d↔app.

---

## 4. Gates (tự chạy, không tin claim)

| Gate | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS** rc=0 |
| `rm -rf dist && npm run build` (official `dist/`, Lead đã cho phép) | **PASS** — `✓ built in 5.70s`, entry `index-B8uzUL4h.js` |
| 10 offline gate qua `run-checks.mjs` (contrast-combos, contrast, error-handling, fabricated, icon-names, ui-rules, unitprice-multiplier, a8-sql-syntax, lint-rls-migration, lint-rls-sources) | **10/10 rc=0 → "KHÔNG TỆ HƠN BASELINE"** |
| Gate live (`verify-rls`, `inspect-db`) | Không chạy (Supabase paused) — đúng phạm vi |
| `dist/` | gitignored, không tracked; preview tắt sau smoke |

---

## 5. Bundle — before vs after (cùng phương pháp, Node zlib level 9)

| Chỉ số | HEAD `dd0b86b` | After (Phase 4) | Δ |
|---|---:|---:|---:|
| **Initial critical gzip9** (entry + react-vendor + supabase-vendor + css) | **277.322 B** (khớp official Phase 3) | **278.448 B** | **+1.126 B = +0,406%** (<2% ✅) |
| Initial raw | 1.052.239 B | 1.054.485 B | +2.246 B (+0,21%) |
| `index-*.js` raw | 690.279 B | 692.525 B | +2.246 B (+0,325%) |
| `index-*.js` gzip (vite metric) | 186,47 kB | 187,63 kB | +1,16 kB (+0,62%) |
| `index-*.js` gzip9 | 185.831 B | 186.957 B | +1.126 B |
| react-vendor / supabase-vendor / css | 51.499 / 221.007 / 89.454 | **y hệt** | 0 |
| Số JS chunk | **39** | **39** | 0 ✅ |
| Dynamic import trong entry | **15** | **15**, set identical | 0 ✅ |
| Lazy chunk view/console | 5 view/console chunk (+Admin/Designer/… panels) | y hệt danh sách | 0 ✅ |
| `three-vendor` | async, **không** preload | async, **không** preload | 0 ✅ |

> Kết luận bundle: refactor tách file **trung tính** về số chunk/lazy/async; chỉ tăng nhẹ entry do overhead module (import/type ở ~65 file mới), **+0,406%** — dưới ngưỡng 2%.

---

## 6. Browser smoke (production preview `:4176` + fixture network-layer)

Tooling: Chromium `~/.cache/ms-playwright/chromium-1244/chrome-linux64/chrome` + `LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu`, Playwright `1.64.0-alpha` tại `/tmp/p5a-probe/node_modules`; Supabase paused ⇒ fixture `/tmp/vcube-fixtures.cjs` (REST products/materials/pricing, auth 400) — **network-layer, không sửa repo**. Preview `vite preview --outDir dist --port 4176` → **đã tắt**.

**12 route × 2 viewport (390×844, 1440×900) = 24 check → 0 pageerror / 0 overflow / 0 white screen.**

| Route | 390 | 1440 | Ghi chú |
|---|---|---|---|
| `/` | ✅ canvas=1 | ✅ canvas=1 | Home 3D canvas render |
| `/explore` | ✅ | ✅ | |
| `/products/p1` | ✅ canvas=1 | ✅ canvas=1 | PDP 3D canvas (ThreeModelViewer lazy chunk) |
| `/personalize` | ✅ | ✅ | lazy `PersonalizeView` |
| `/quote` | ✅ | ✅ | lazy `Tool3DView`; empty state OK |
| `/cart`, `/checkout` | ✅ | ✅ | empty-cart state |
| `/orders`, `/assets` | ✅ → `/auth/login` | ✅ → `/auth/login` | ProtectedRoute đúng |
| `/auth/login`, `/auth/register` | ✅ | ✅ | |
| `/tracking` | ✅ | ✅ | guest portal |

**Behavior checks bổ sung:**

| Kiểm | Kết quả |
|---|---|
| `/quote` upload STL thật (tứ diện 40×60×30, binary) | **workspace-rendered**, `canvas=1` ở **cả 390 và 1440**; 0 pageerror |
| CartDrawer (bấm nút giỏ hàng ở 390) | mở `dialog[open]`, `body overflow:hidden`, **0 pageerror** |
| Add-to-cart (PDP, fixture) | nút bấm được ở cả 2 viewport; toast `Đã thêm 1x "Vỏ hộp IoT Công nghiệp" vào đơn hàng!`; store `vcube_cart_store` = 1 item |
| `/orders` signed-out | redirect **`/auth/login`** đúng |
| `/admin`, `/lab/settings` | **bị RoleGuard/AuthContext đưa về `/auth/login`** (Supabase paused, không session) ⇒ **không mount 2 view**; 0 pageerror |

**Giới hạn smoke (trung thực):** không có session/auth thật ⇒ 2 nhánh `/admin` (Pricing/Group1) và `/lab/settings` (WorkshopSettings) **chưa được kiểm render runtime**; parity của chúng dựa trên block-move §2.2 + `tsc` + API §2.5. Canvas chỉ kiểm **sự tồn tại/kích thước**, không so pixel/chất lượng render. Fixture chỉ phủ products/materials/pricing — không phủ orders/assets thật.

---

## 7. Risks & Phase 6 notes

### 7.1 Risks

| # | Risk | Mức | Chi tiết / đề xuất |
|---|---|---|---|
| R1 | `/admin` + `/lab/settings` chưa runtime-verify | **Trung bình** | RoleGuard chặn do không có session. Parity static rất mạnh (99,2%/98,8% coverage + 38/38 API + block-move), nhưng **QA nên smoke có fixture auth** 1 lần để chốt 2 nhánh tách lớn nhất (Pricing 3.079, WorkshopView 2.574) |
| R2 | Initial critical gzip **+0,406%** | Thấp | Do overhead import/type 65 file mới; <2% nên chấp nhận. Nếu Phase 6 muốn bù, xem lazy thêm `AdminDashboard` panels hoặc bỏ over-export |
| R3 | **+2 `payload?: any` mới** (net `: any` +1) | Thấp | `workshop/settings/types.ts` + `SettingsStates.tsx` lặp lại chữ ký `onNavigate?: (screen, payload?: any)` thay vì import type từ view/façade. Đề xuất Phase 6: dùng `AppNavigate` / type chung, hạ `any` về 0 mới |
| R4 | 27 export "thừa" ở file mới | Thấp | Prop interface (`*Props`) export nhưng chỉ dùng trong chính file (không ai import). Không phải dead runtime code, nhưng nên bỏ `export`/gom vào `types.ts` khi cleanup |
| R5 | Hook coupling mới | Thấp | `AppOverlays` tự select 9 selector `useUIStore`; `AppRoutes` nhận props qua `Pick<…>`; `useAppNavigation` thu hẹp payload thành `AppNavPayload` (runtime y nguyên nhưng **thêm field payload phải khai báo type**). Ghi chú trong JSDoc của các file đó |
| R6 | `WorkshopSettingsController` (142 dòng) sinh từ TS checker | Thấp | Nếu đổi state/handler trong view phải regenerate type — `tsc` sẽ bắt lệch, nhưng nên ghi vào docs Phase 6 |
| R7 | `workshopService` façade giữ `SEED_*` + legacy method | — | Đúng deferral `DEAD-CODE.md` §8; chưa xoá |
| R8 | Docs cũ | Thấp | `docs/tasks/optimization/04-refactor.md` §1.5/§1.7 vẫn ghi kích thước cũ (`2.574`, `2.116`, `3.079`…) và "kỳ vọng 3.079 → ~200" (thực tế 985). **Chỉ report, không sửa** (ngoài write-scope) |

### 7.2 Phase 6 / cleanup notes

1. **File >800 dòng còn lại** (ứng viên tách tiếp, số hiện tại): `src/utils/meshParser.ts` **1.878** · `WorkshopOnboardingWizard.tsx` **1.448** · `ExploreView.tsx` **1.436** · `HomeView.tsx` **1.433** · `Group5ProductionPanel.tsx` **1.237** · `Group3CustomersPanel.tsx` **1.207** · `PersonalizeView.tsx` **1.160** · `ProductDetailView.tsx` **1.102** · `AdminStorefrontPanel.tsx` **1.092** · `Tool3DView.tsx` **1.057** (sát target) · `pricingEngine.ts` **1.054** · `settingsService.ts` **1.030** · `types/index.ts` **1.028**. (Baseline >2.000 dòng đã giảm từ 6 file → **0 file**.)
2. **Xoá over-export**: 27 `*Props`/helper export không dùng ngoài file (§7.1 R4).
3. **Gom type `payload`**: thay 2 khai báo `payload?: any` mới bằng `AppNavigate`/type chung (R3).
4. **Prettier/format pass**: nhiều file block-move giữ indent gốc (cố ý) — prettier riêng, không đổi logic.
5. **Docs stale**: cập nhật `04-refactor.md` §1.5/§1.7 + `AUDIT.md` §5 (số LOC/dead-file) theo số Phase 4; đánh dấu `phase4-*.md` là nguồn số mới.
6. **Fixture auth cho smoke admin/lab**: thêm 1 fixture session (role admin/lab) vào quy trình verify để chốt R1 ở QA/Phase 6.
7. **Không commit** `/tmp` artifacts (baseline `/tmp/vcube-p4-base`, script `/tmp/p4v/*`, build `dist/` — đều ngoài repo/gitignored).

---

## 8. Tái lập (ngoài repo, không commit)

```bash
# baseline độc lập
rm -rf /tmp/vcube-p4-base && mkdir -p /tmp/vcube-p4-base
git archive dd0b86b | tar -x -C /tmp/vcube-p4-base
ln -s "$PWD/node_modules" /tmp/vcube-p4-base/node_modules
ln -sf "$PWD/.env" /tmp/vcube-p4-base/.env
(cd /tmp/vcube-p4-base && npx vite build --outDir dist --emptyOutDir)

# official build (sau khi verify)
rm -rf dist && npm run build
npm run lint
node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast \
  --only check-error-handling --only check-fabricated --only check-icon-names \
  --only check-ui-rules --only check-unitprice-multiplier --only a8-sql-syntax-check \
  --only lint-rls-migration --only lint-rls-sources

# script verify (ngoài repo, giữ lại tham chiếu)
#   /tmp/p4v/parity.cjs / app-parity.cjs / exports.cjs / service-parity.cjs
#   /tmp/p4v/novelty.cjs / vi2.cjs / orphans.cjs / graph.cjs / measure.cjs / smoke.mjs
#   /tmp/p4v/smoke.json (raw), /tmp/p4v/orig/ (7 file HEAD)
# smoke: LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu node /tmp/p4v/smoke.mjs
```

**Trạng thái cuối:** 7 file M + 65 file mới + 4 handoff builder (untracked); `dist/` build official PASS; preview tắt; không commit/push; không sửa `src/**` ngoài việc build.
