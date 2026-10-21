<!-- doc-meta: status=active; verified=2026-10-21; owner=ops-consoles -->
# HANDOFF — Phase 4c: tách `WorkshopSettingsView` + `workshopService` (behavior-preserving)

> **Work item:** `task-34` · **Agent:** `ops-consoles` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `dd0b86b` (Phase 1–3 pushed) + unstaged Phase-4c changes.
> **Không commit/push.** Không sửa `Group1WorkshopsPanel`, `WorkshopOnboardingWizard`, `dbService`, `src/App.tsx`,
> `package.json`, `vite.config.ts`, `src/index.css`; không thêm dependency; không đổi route/props public của view.
> **Script tách:** `/tmp/p4c/gen-view.mjs`, `/tmp/p4c/split-service.mjs`, verify `/tmp/p4c/verify-view.mjs`,
> `/tmp/p4c/verify-service.mjs`, `/tmp/p4c/gen-controller-type.mjs` (ngoài repo, **không commit**).

## ✅ VERDICT: **DONE — block-move 100%, API service y hệt, gates xanh**

1. `WorkshopSettingsView.tsx`: **2.574 → 865 dòng** (−1.709, −66,4%; mục tiêu ≤1.000).
2. `workshopService.ts`: **2.243 → 128 dòng** façade (−2.115, −94,3%; mục tiêu ≤150) + **14 module** `src/backend/services/workshop/*.ts` (module lớn nhất **385** dòng ≤600).
3. View: **17 file** mới trong `src/frontend/components/workshop/settings/` (module lớn nhất **343** dòng ≤600); **17/17 block JSX chuyển nguyên văn** (verify bằng substring + render-equivalence của trạng thái/guard).
4. **`WorkshopService` public surface y hệt:** 38 export top-level (38/38), 52 public static method (52/52), 8 private helper chuyển sang `workshop/shared.ts`; `grep "workshopService\.[A-Za-z]*"` before/after **IDENTICAL**; **0 importer phải sửa**.
5. `npm run lint` **PASS** · build `npx vite build --outDir dist-ssr/p4c --emptyOutDir` **PASS** (5,27 s).
6. 7 checker offline (`ui-rules`, `fabricated`, `contrast`, `contrast-combos`, `icon-names`, `error-handling`, `unitprice`) **rc=0**.
7. Browser smoke **best-effort có giới hạn**: server preview 200, Chromium headless render OK ở 390/1440, **0 pageerror/console error**; `/lab/settings` bị **RoleGuard/AuthContext chặn → login** (Supabase paused, không có session) nên **không mount được 6 tab** — nêu rõ ở §7.

---

## 1. LOC & file before → after

| File / nhóm | Trước | Sau | Ghi chú |
|---|---:|---:|---|
| `src/frontend/views/WorkshopSettingsView.tsx` | **2.574** | **865** | parent giữ state/handler + composition; không còn JSX tab/modal/header |
| `src/backend/services/workshopService.ts` | **2.243** | **128** | façade: import namespace + delegate 1-1 + re-export |
| `src/backend/services/workshop/*.ts` (14 file) | — | **2.313** | lớn nhất `seed.ts` 385 · `inventory.ts` 280 |
| `src/frontend/components/workshop/settings/` (17 file) | — | **2.164** | lớn nhất `QueueTab.tsx` 343 · `MaterialsTab.tsx` 196 |
| **Tổng** | **4.817** | **5.470** | +653 dòng là import/header/type ở file mới (block-move, không logic mới) |

`git diff --stat` (chỉ 2 file gốc): **2 files changed, +230 / −4.054**; 31 file mới (14 backend + 17 frontend).

---

## 2. File mới — trách nhiệm

### 2.1 `src/backend/services/workshop/` (tách theo nhóm method, block-move verbatim)

| File | Dòng | Trách nhiệm |
|---|---:|---|
| `types.ts` | 268 | Toàn bộ interface/type `My*` + `PrinterFleet*` + `MaterialCatalog*` (moved verbatim) |
| `constants.ts` | 39 | `MY_ORDER_STATUS_LABELS/BY_STAGE`, `MY_MACHINE_STATUSES/LABELS` |
| `seed.ts` | 385 | Toàn bộ `SEED_*` (không xoá legacy/seed theo yêu cầu phase này) |
| `storage.ts` | 46 | `STORAGE_KEYS`, in-memory cache, `readFromStorage`/`writeToStorage` (fallback localStorage) |
| `shared.ts` | 155 | `getCurrentUserId`, `computeStockStatus`, 6 `mapMy*`, `toNumberOrNull` (8 private static cũ) |
| `profiles.ts` | 213 | workshop profile CRUD + healthcheck + `getMyWorkshopProfile`/`saveMyWorkshopProfile` |
| `machines.ts` | 214 | workshop machines CRUD + my-machines/save/status/delete |
| `materials.ts` | 212 | workshop materials CRUD + my-materials/save/delete |
| `inventory.ts` | 280 | inventory logs + my logs + `addMyInventoryLog` + `deductMaterialsForCompletedOrder` |
| `accessories.ts` | 177 | workshop accessories CRUD + my accessories |
| `designers.ts` | 120 | designer profiles CRUD |
| `customers.ts` | 101 | customer profiles CRUD |
| `queue.ts` | 77 | `getMyQueueOrders` + `updateMyOrderProgress` |
| `catalogs.ts` | 26 | `getPrinterFleetCatalog` + `getMaterialsCatalog` |

`workshopService.ts` façade: `import * as profiles from './workshop/profiles' …` + 52 method delegate giữ **nguyên chữ ký + kiểu trả về** + re-export toàn bộ type/constant/seed + `export const workshopService = WorkshopService`.

### 2.2 `src/frontend/components/workshop/settings/` (mỗi tab + modal editor 1 file)

| File | Dòng | Trách nhiệm |
|---|---:|---|
| `tabs.ts` | 26 | `TabId` + `LAB_TAB_IDS`/`LAB_TAB_LABELS` (moved verbatim) |
| `helpers.ts` | 49 | `MACHINE_STATUS_STYLE/DOT`, `QUEUE_KANBAN_COLUMNS`, `REGION_OPTIONS`, `digitsOnly`, `parseRateInput` |
| `types.ts` | 142 | `WorkshopSettingsController` — **sinh tự động từ TS checker** (type thật của state/handler trong view), không khai báo tay |
| `SettingsHeader.tsx` | 105 | `PageHeader` + segmented 6 tab (block-move) |
| `SettingsBanners.tsx` | 47 | cảnh báo chưa gắn `partner_id` / trùng hồ sơ (block-move) |
| `SettingsStates.tsx` | 73 | 3 trạng thái chặn render: loading / lỗi hồ sơ / chưa có hồ sơ (block-move từ 3 guard `if`) |
| `WorkshopStatsCards.tsx` | 174 | `stats` useMemo + 4 `StatCard` theo tab (block-move) |
| `QueueTab.tsx` | 343 | `queueColumns` + tab Hàng đợi (list + Kanban) |
| `MachinesTab.tsx` | 168 | `machineColumns` + tab Máy in |
| `MaterialsTab.tsx` | 196 | `materialColumns` + tab Vật liệu & kho (+ danh mục tham chiếu) |
| `AccessoriesTab.tsx` | 117 | `accessoryColumns` + tab Phụ kiện |
| `AuditTrailTab.tsx` | 154 | `logColumns` + tab Sổ kho |
| `PreferencesTab.tsx` | 164 | tab Cấu hình xưởng |
| `MachineModal.tsx` | 126 | modal Khai báo/Chỉnh sửa máy in |
| `MaterialModal.tsx` | 100 | modal Khai báo/Chỉnh sửa vật liệu |
| `InventoryLogModal.tsx` | 115 | modal Phiếu nhập/xuất kho |
| `AccessoryModal.tsx` | 65 | modal Khai báo/Chỉnh sửa phụ kiện |

**Không tạo hook** `src/frontend/hooks/useWorkshopSettingsData.ts` (optional trong task): view cha giữ nguyên **state + handler + composition** đúng luật; component chỉ nhận `ctl` (controller object) + tự `useMemo` cột bảng. Controller gom 133 field (state/handler/derived) — view cha tạo 1 object, truyền xuống 11 component.

---

## 3. Public API proof (yêu cầu bắt buộc)

| Kiểm tra | Kết quả |
|---|---|
| Export top-level của `workshopService.ts` (class + interface/type/const/SEED) | **38 trước = 38 sau, IDENTICAL** (AST compare) |
| Public static method của `WorkshopService` | **52 trước = 52 sau, IDENTICAL** |
| Private static helper (không thuộc public API) | 8 → `workshop/shared.ts` (export nội bộ, **không** re-export façade) |
| `grep -rho "workshopService\.[A-Za-z]*" src/ \| sort -u` | **IDENTICAL trước/sau** |
| `WorkshopService.<method>` ngoài module service | **IDENTICAL** (chỉ 8 method ở `WorkshopOnboardingWizard`, `LabRoute`; importers **không sửa**) |
| Importer phải sửa | **0** — `grep "services/workshopService"` vẫn đúng 3 file, build PASS |

---

## 4. Bằng chứng block-move (không reprint)

- **Service:** 60/60 class member block xuất hiện **nguyên văn** trong module tương ứng (script `verify-service.mjs`: dedent 2 space + đổi `static async x(` → `export async function x(`, `WorkshopService.` → direct call — chỉ reference nội bộ; 0 lỗi).
- **View:** 17/17 block (5 cột DataTable + 1 statsMemo + 6 tab section + 4 modal + 1 stats grid) xuất hiện **nguyên văn** trong component file (substring check).
- Header/banners: block nguồn (dòng 1458–1540, 1545–1572) xuất hiện nguyên văn với indent +6; 3 guard JSX (loading/lỗi/chưa hồ sơ) nguyên văn trong `SettingsStates.tsx` (chỉ thay `onClick={() => void loadProfile()}` → `onClick={onRetry}`).
- **Không mất code:** LCS so base↔parent: 1.815 dòng bị xoá = **1.736** trong moved ranges + **52** dòng import block được viết lại (gộp import) + **10** comment section của tab/modal + **17** dòng trắng ở ranh giới range. **0 dòng code ngoài phạm vi bị mất.**
- Diff chỉ 2 file gốc (+230/−4.054) chủ yếu là **xoá** block đã chuyển.

---

## 5. Gates

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (`tsc --noEmit`, 0 lỗi) |
| Build | `npx vite build --outDir dist-ssr/p4c --emptyOutDir` | **PASS** (`✓ built in 5.46s`; không ghi `dist/`) |
| UI rules | `node scripts/check-ui-rules.mjs` | **rc=0** (0 vi phạm mới) |
| Fabricated | `node scripts/check-fabricated.mjs` | **rc=0** (SẠCH) |
| Contrast token / combos | 2 script contrast | **rc=0 / rc=0** (0 unexpected fail; near-miss không tăng) |
| Icon names | `node scripts/check-icon-names.mjs` | **PASS** |
| Error handling | `node scripts/check-error-handling.mjs` | **PASS** |
| Unit-price multiplier | `node scripts/check-unitprice-multiplier.mjs` | **PASS** |
| `git diff --check` | — | **PASS** (không whitespace error) |

Build artifact: `dist-ssr/p4c/assets/WorkshopSettingsView-QrnkliMe.js` (62,18 kB / gzip 15,92) — vẫn lazy route riêng như Phase 5; `dist-ssr/p4c` gitignored.

**Không `any` mới:** `any` trong service = **33 trước = 33 sau** (chỉ **di chuyển** cùng legacy code); trong file mới chỉ 1 `any` là `payload?: any` **đã có sẵn** trong `WorkshopSettingsViewProps` (type sinh tự động giữ nguyên chữ ký). Không thêm dependency.

---

## 6. Behavior-preserving — lập luận

1. **Block-move verbatim** (không sửa logic/điều kiện/class/chuỗi VI) — verify §4.
2. Service: chữ ký + thân method y hệt (chỉ đổi `WorkshopService.foo(...)` nội bộ → `foo(...)` sau khi helper chuyển sang module); `ok/fail/WriteResult/supabase/SEED/storage` import tương đương; **không đổi thứ tự thao tác** (các method độc lập, không `this`, không cross-call domain — đã kiểm 0 `this.`, cross-ref chỉ helper).
3. View: parent giữ **toàn bộ state/handler/effects/derived**; component chỉ render + `useMemo` cột bảng (dey array giữ nguyên như cũ); hooks order trong mỗi component ổn định (chỉ `useMemo`). Truyền 1 object `controller` thay vì closure trực tiếp — cùng giá trị mỗi render, không memo hoá mới.
4. Guard 3 trạng thái tách thành component nhưng **vẫn `return` sớm đúng thứ tự** trong parent (loading → lỗi → chưa hồ sơ). Modal vẫn render vô điều kiện với `open` từ state (như cũ).
5. `tabs.ts`/`helpers.ts`/`types.ts` không chứa logic mới; `WorkshopSettingsController` sinh từ type thật của view (checker) nên parent **bị typecheck bắt buộc** khớp field.

---

## 7. Browser smoke — best effort (có giới hạn, nêu rõ)

**Môi trường:** repo **không cài Playwright** (`require.resolve('playwright')` fail). Dùng Chromium headless shell có sẵn
(`~/.cache/ms-playwright/chromium_headless_shell-1244/...`, `LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu`),
preview build riêng: `npx vite preview --outDir dist-ssr/p4c --port 4174 --strictPort` (HTTP 200).

| Bước | Kết quả |
|---|---|
| `/` (sanity bundle boots) | DOM 190.009 B, render bình thường |
| `/lab/settings` @390×844 | HTTP 200 → app render **login gate** (`Đăng nhập`), DOM 29.122 B |
| `/lab/settings` @1440×900 | giống hệt (DOM 29.122 B) |
| Console/pageerror | **0** ở cả 2 viewport (grep `CONSOLE/Uncaught/TypeError/ReferenceError`) |

**Vì sao không mount được 6 tab:** `/lab` đi qua `RoleGuard` + `LabRoute`; không có session (Supabase paused) ⇒ chuyển
`/auth/login` trước khi `WorkshopSettingsView` lazy-load. Vì vậy smoke này chỉ chứng minh **bundle/build boot OK + route guard
không lỗi**, **không** chứng minh render 6 tab. Cần QA/browser có DB thật (hoặc fixture auth) để chụp `/lab/settings` 390/1440
và xác nhận 6 tab + 4 modal — đây là **việc còn lại duy nhất** của phase này.

---

## 8. Rủi ro & ghi chú

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| Chưa verify runtime 6 tab (auth/DB) | **Trung bình** | bù bằng tsc/build + block-move verbatim + API surface identical; QA live cần xác nhận (§7) |
| Formatting component kiểu block-move (indent lệch, không prettier) | Thấp | cố ý giữ verbatim để chứng minh move; có thể prettier riêng ở phase cleanup, không đổi logic |
| Controller object tạo mỗi render, truyền 11 component | Thấp | cùng chi phí như JSX inline cũ; không phải memo/perf regression đáng kể |
| 10 comment section tab/modal ở parent bị bỏ | Thấp | nội dung đã nằm ở header từng component; không mất thông tin hành vi |
| Không tạo hook (optional) | Thấp | đúng luật "view cha giữ state + composition"; nếu Lead muốn hook hoá data-loading, tách tiếp không đổi hành vi |
| Concurrent agents đang sửa `App.tsx`, `Group1WorkshopsPanel`… | — | **không phải thay đổi của task-34**; `git status` toàn repo 28 mục (gồm 4 mục của tôi: 2 file M + 2 thư mục mới) |
| `dist/` | — | **không ghi**; chỉ `dist-ssr/p4c` (gitignored) |

---

## 9. Tái lập / verify

```bash
# tách (script ngoài repo, đọc bản gốc backup)
node /tmp/p4c/split-service.mjs --write
node /tmp/p4c/gen-view.mjs                     # đọc backup + blocks.json, ghi parent + components
# verify
node /tmp/p4c/verify-service.mjs               # 60/60 block, export 38/38, class 52/52
node /tmp/p4c/verify-view.mjs                  # 17/17 block, header/banners/states, deleted-lines accounting
npm run lint
npx vite build --outDir dist-ssr/p4c --emptyOutDir
# diff gốc trước khi tách (nếu cần so):
#   /tmp/p4c/workshopService.orig.ts · /tmp/p4c/WorkshopSettingsView.orig.tsx · ...base.tsx
```

**Trạng thái cuối:** 2 file gốc modified + 31 file mới (untracked) + handoff này; **không commit/push**; không sửa file ngoài
write scope; `dist-ssr/p4c` giữ để Lead verify (gitignored, có thể xoá).
