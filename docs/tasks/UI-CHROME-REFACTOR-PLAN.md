# UI Chrome Refactor — Kế hoạch thi công (cho subagent)

> **Status**: READY — nguồn sự thật DUY NHẤT cho đợt refactor UI/UX chrome.
> **Base**: `main`. **Ngôn ngữ**: tiếng Việt. **Không commit/push** trừ khi chủ dự án yêu cầu.
> **Bối cảnh**: thay lớp presentation (chrome) của các console sang **sidebar tối + topbar sáng + content sáng**,
> token hoá additive, xoá hẳn dark theme, thêm gate chống nuốt lỗi. Giữ nguyên engine/store/Supabase.

---

## 0. Bất biến (mọi task phải tuân)

1. **Presentation-only**: KHÔNG đụng `src/utils/pricingEngine.ts`, `src/utils/meshParser.ts`, Three.js viewers,
   OCCT WASM, Zustand stores, `src/backend/supabase/*` (trừ việc đổi kiểu trả về ở W5), realtime trong `App.tsx`.
2. **Token-only**: không hex trong component mới; không đổi tên token cũ.
3. Giữ **Be Vietnam Pro + JetBrains Mono**, **lucide + `iconMap`**, **light-first**, **data-honesty**.
4. Sàn chữ 12px; `prefers-reduced-motion`; không thêm dependency; không GSAP.
5. **Mỗi màn một tầng chrome** (`App.tsx` `CHROMELESS_SCREENS`).
6. Đọc `docs/design/taste-contract.md` trước khi chạm UI.

## 0.1 Quyết định đã chốt (không bàn lại)

| Chủ đề | Quyết định |
|---|---|
| Accent | Teal `#00687A` = primary CTA/link toàn app; cam `#FF9736` = **chỉ** nav active trên chrome tối |
| Layout chrome | **Topbar sáng full-width** (logo + search + user) + **sidebar tối** bên dưới (ảnh TechVerse) |
| Phạm vi chrome | Chỉ `/admin`, `/lab`, `/designer`. Storefront `Header` giữ nguyên |
| Token | Additive, giữ tên cũ, thêm nhóm `--color-chrome*` |
| Dark theme | **Xoá hẳn** (light-only vĩnh viễn) |
| Cam + chữ | Chữ tối `#0F172A` trên cam (8.27:1, đạt AA) |
| `motion` dep | Gỡ, thay hover bằng CSS |
| Error handling | Gate tĩnh (R1/R2 cứng, R3 budget) **và** Layer 2 (`WriteResult`/`reportError`) làm luôn |

## 0.2 Định vị trước khi sửa (bắt buộc)

> Mọi `file:line` trong plan là **gợi ý tham chiếu tại 2026-09**, KHÔNG phải toạ độ tuyệt đối.
> Các task chạy tuần tự và sửa lẫn nhau nên số dòng **sẽ trôi**.
> **Trước mỗi thao tác**, subagent phải `grep` theo **tên symbol** dưới đây rồi tự xác nhận vị trí.
> Nếu **không tìm thấy symbol → DỪNG, báo cáo, KHÔNG đoán** vị trí thay thế.

| Việc | Anchor symbol (grep) |
|---|---|
| Bỏ theme provider | `RouteThemeSync`, `import { ThemeProvider }` |
| Rút gọn tokens | `DARK_COLOR_TOKENS`, `subscribeTheme`, `isDarkActive`, `ThemeMode` |
| Bỏ CSS dark | khối `.dark {`, `@custom-variant dark` |
| Sửa gate contrast | `'DARK `, `TOKENS.dark`, `ratios.dark`, đoạn slice `.dark {` |
| Dark trong ServiceShowcase | effect `subscribeTheme`, state `themeTick` |
| Empty catch | 6 × `try { localStorage.setItem('vcube_products'` |
| Contract lỗi | `WriteResult`, `SettingsResult`, `ValidationIssue`, `ok(`, `fail(` |
| Write-service | tên hàm liệt kê ở T5.2a/T5.2b |
| Shell | lời gọi `<AppShell`, `<SideNav`, `<Topbar` |
| Gỡ motion | `import { motion } from 'motion/react'` |

> **Số liệu trong plan là THAM CHIẾU tại thời điểm viết**, không phải sự thật bất biến.
> Subagent phải **tự `grep`/đếm lại** trước khi hành động và **báo sai lệch nếu có** — KHÔNG im lặng
> sửa/đổi kết quả cho khớp con số ghim cứng. Nếu số thực khác (nhiều/ít hàm, entry, chỗ hơn), lấy số thực làm chuẩn.

## 0.3 Chạy gate (baseline trước khi bắt đầu, và sau mỗi task)

```bash
npm run lint && npm run build
node scripts/check-contrast.mjs
node scripts/check-contrast-combos.mjs
node scripts/check-icon-names.mjs
node scripts/check-fabricated.mjs
node scripts/check-ui-rules.mjs
node scripts/check-unitprice-multiplier.mjs
```
Sau W5 thêm: `node scripts/check-error-handling.mjs`.

## 0.4 Token chrome khoá theo ảnh tham chiếu

```css
/* Tier-3 · chrome — console tối, CỐ ĐỊNH, khai NGOÀI .dark */
--color-chrome:            #0F172A;
--color-chrome-raised:     #1E293B;
--color-chrome-fg:         #E2E8F0;
--color-chrome-fg-muted:   #64748B;
--color-chrome-border:     #1E293B;
--color-chrome-active:     #FF9736;   /* cam */
--color-chrome-active-fg:  #0F172A;   /* chữ tối trên cam */
--color-chrome-ring:       #FF9736;   /* focus ring trên nền tối */
```

---

## 1. W1 — Tokens (P1)

> **Thứ tự bắt buộc**: T1.1 → (T1.2 ∥ T1.3). T1.1 và T1.2 **cùng sửa `src/index.css`** nên KHÔNG chạy song song.
> Nếu buộc song song: quy định vùng chèn cố định trong `@theme static` (chrome trước
> `/* --- Màu: nền & bề mặt --- */`, motion sau khối radius) và không chồng lấn.

### T1.1 · Chrome tokens
- **Goal**: có token chrome để shell dùng.
- **Files**: `src/index.css` (khối `@theme static`).
- **Steps**: thêm 8 token ở §0.4 vào `@theme static` (KHÔNG trong `.dark`).
- **Acceptance** (chạy được):
  ```bash
  grep -qE -- '--color-chrome:\s*#0F172A' src/index.css \
    && npm run build \
    && grep -qE -- '--color-chrome:\s*#0F172A' dist/assets/*.css \
    && echo OK
  ```
  ⚠️ KHÔNG kiểm `.bg-chrome` ở đây: utility chỉ được sinh khi có consumer; `@theme static` chỉ ép phát **biến**.
  Việc kiểm `.bg-chrome` chuyển sang W3 (đã có component dùng).
  **Dự phòng**: nếu build tool tree-shake cả custom property và grep trên `dist/` fail vì lý do tối ưu
  (không phải code sai), thì chỉ cần `grep -- '--color-chrome:' src/index.css` là đủ — KHÔNG bắt buộc thấy trong `dist/`.
- **Gate**: `npm run lint && npm run build`.
- **Depends**: none.

### T1.2 · Motion tokens
- **Goal**: hết drift "docs khai motion, code không".
- **Files**: `src/index.css` (`@theme`), migrate primitives.
- **Steps**:
  1. Khai `--duration-instant 100 / fast 150 / base 200 / moderate 250 / slow 320`;
     `--ease-out cubic-bezier(0.2,0,0,1)`, `--ease-in-out cubic-bezier(0.4,0,0.2,1)`, `--ease-exit cubic-bezier(0.3,0,1,1)`.
  2. Migrate **primitive** (map đúng giá trị, 0 đổi pixel): `ui/Button.tsx` (`duration-150`→`duration-fast`),
     `ui/Input.tsx`, `ui/Select.tsx`, `ui/Card.tsx`, `ui/PageHeader.tsx`, `ui/SideNav.tsx` (150→fast);
     `ui/Modal.tsx`, `ui/ToastViewport.tsx`, `ui/ProgressBar.tsx` (200→base).
  3. KHÔNG migrate `duration-300/500` (chưa có token).
- **Acceptance**: 0 thay đổi thời lượng thực tế; lint/build xanh.
- **Gate**: `npm run lint && npm run build`.
- **Depends**: T1.1 (cùng file).

### T1.3 · Docs + contrast gate cho chrome
- **Files**: `docs/design/tokens.md`, `scripts/check-contrast.mjs`.
- **Steps**: thêm mục "Chrome — console tối" (giá trị + nguồn ảnh + lý do chữ tối);
  thêm cặp contrast `chrome-fg`/`chrome-raised` trên `chrome` (chữ ≥4.5), `chrome-ring`/`chrome-border` (≥3).
- **Gate**: `node scripts/check-contrast.mjs` RC=0.
- **Depends**: T1.1.

---

## 2. W2 — Xoá hẳn dark theme (P1b)

> `useThemeMode` **0 consumer**, **0 class `dark:`** trong `.tsx`, chỉ 2 điểm chạm ngoài module theme.

### T2.1 · Xoá provider, unwrap App
- **Files**: `src/frontend/theme/ThemeProvider.tsx` (DELETE), `src/App.tsx`.
- **Steps**: xoá import `ThemeProvider`; xoá component `RouteThemeSync`; đưa `<AuthProvider>` lên trực tiếp
  thay wrapper. Giữ `useLocation` (dùng ở `MainApp`).
- **Acceptance**: app render, không còn `.dark` trên `<html>`.

### T2.2 · Rút gọn `theme/tokens.ts` + consumer
- **Files**: `src/frontend/theme/tokens.ts`, `src/frontend/components/services/ServiceShowcaseSection.tsx`.
- **Steps**: xoá `ThemeMode`, `THEME_STORAGE_KEY`, `DARK_COLOR_TOKENS`, `isDarkActive`, `subscribeTheme`,
  `readColorNumber`, `parseColorToNumber`, `readColorTokens`, `ReadTokenOptions.isDark`. Giữ `LIGHT_COLOR_TOKENS`,
  `readColorToken`, `ColorTokenName`. Bỏ effect `subscribeTheme` + state `themeTick` trong `ServiceShowcaseSection` → dùng `useMemo`.

### T2.3 · Dọn CSS/HTML
- **Files**: `src/index.css`, `index.html`.
- **Steps**: xoá `@custom-variant dark` (anchor), xoá khối `.dark { … }`; thêm `color-scheme: light` vào
  `@layer base :root`; cập nhật comment nhắc dark. Xoá meta `theme-color` dark + comment trong `index.html`.
- **Acceptance**: `grep -rn '\.dark\|dark:' src` = 0 (trừ comment cố ý).

### T2.4 · Sửa 2 gate contrast
- **Files**: `scripts/check-contrast.mjs`, `scripts/check-contrast-combos.mjs`.
- **Steps**: xoá **47 entry `'DARK …'`** (`check-contrast.mjs`); bỏ `TOKENS.dark`, `RULES.ratios.dark`,
  vòng lặp `['light','dark']`→`['light']`, đoạn slice `.dark {` trong bookkeeping, cập nhật comment sổ sách.
- **Acceptance**: cả 2 script RC=0; `--json` xác nhận light-only. **Ghi lại tổng số cặp mới** (hiện tại
  `check-contrast` báo "82/100 pass, 18 expected non-pass"; sau khi bỏ 47 entry DARK, tổng sẽ giảm đúng 47
  — cập nhật kỳ vọng trong header script).
- **Gate**: `check-contrast` + `check-contrast-combos` RC=0.

### T2.5 · Docs drift
- **Files**: `docs/design/tokens.md` (§1/§3/§9), `docs/design/taste-contract.md` (§4), `docs/design/qa-checklist.md`,
  `docs/design/research-brief.md`, `docs/design/ui-audit-2026-09.md`, comment `ui/Button.tsx`, `ui/ConfirmDialog.tsx`.
- **Steps**: đổi "dual-theme/light-dark/dark opt-in" → **light-only**; bỏ `DARK_ROUTE_PREFIXES` khỏi mô tả.

**Gate W2 tổng**: `lint` · `build` · `check-contrast` · `check-contrast-combos` · browser smoke (không nháy dark).

---

## 3. W3 — `tone` cho primitives (P2)

### T3 · `tone` chrome cho primitives
- **Goal**: primitives nhận `tone` chrome; mặc định `light` → 0 đổi UI hiện tại.
- **Files & steps**:
  - `ui/SideNav.tsx`: thêm `tone?: 'light'|'chrome'`. Chrome: nav `bg-chrome`; item active
    `bg-chrome-active text-chrome-active-fg` + **vạch trái** (giữ tín hiệu không-chỉ-màu); inactive
    `text-chrome-fg-muted hover:bg-chrome-raised hover:text-chrome-fg`; nhãn nhóm `text-chrome-fg-muted`;
    badge `bg-chrome-raised text-chrome-fg`; focus `focus-visible:ring-chrome-ring`.
  - `ui/Modal.tsx`: thêm `tone` cho `PANEL_BASE` (`bg-chrome text-chrome-fg` thay `bg-surface`).
  - `ui/Sheet.tsx`: truyền `tone` xuống `Modal`.
  - `ui/Input.tsx`, `ui/Select.tsx`, `ui/Field.tsx`: thêm `tone` chrome (`bg-chrome-raised text-chrome-fg border-chrome-border`).
- **Bắt buộc**: dùng **prop `tone`**, KHÔNG ghép `bg-chrome` đè `bg-surface` (`cn()` không merge xung đột).
- **Acceptance**: `npm run build && grep -q 'bg-chrome' dist/assets/*.css` (đã có consumer) + snapshot parity route sáng.
- **Gate**: `lint` · `build`.

---

## 4. W4 — Shell + admin/lab/designer (P3)

### T4.1 · `AppShell` topbar full-width
- **Files**: `ui/AppShell.tsx`, `ui/Topbar.tsx`.
- **Layout đích**:
  ```
  ┌───────────────────────────────────────────────┐
  │ Topbar SÁNG full-width: brand · search · user  │ sticky top-0 z-header
  ├─────────────┬─────────────────────────────────┤
  │ SIDEBAR TỐI │ content SÁNG (main max-w-[1400])│
  └─────────────┴─────────────────────────────────┘
  ```
- **Steps**: thêm `chrome?: boolean` + slot `brand`; render topbar **ra ngoài** hàng `flex` (full-width);
  `<aside>` `sticky top-14 h-[calc(100dvh-3.5rem)]` + tone; drawer mobile `Sheet tone="chrome"`; giữ skip-link + `z-header`.
  `Topbar`: thêm slot `brand`, giữ `leading` (hamburger). Mặc định `chrome=false`.

### T4.2 · Nối `/admin`, `/lab`, `/designer`
- **Files**: `src/App.tsx` (`DashboardShell`, `LabDashboardShell`, `DesignerDashboardShell`),
  `src/frontend/views/AdminDashboardView.tsx` (lời gọi `<AppShell>`…`</AppShell>`).
- **Steps**: truyền `chrome`; chuyển logo/brandTitle từ `SideNav.header` → `Topbar brand`;
  nav-search trong sidebar admin dùng `Input tone="chrome"`; giữ nguyên nav id/state/`navigate`/deep-link.
- **Acceptance**:
  - `/admin/:section`, `/lab/:tab`, `/designer/:tab` — topbar sáng full-width, sidebar tối, active cam chữ tối,
    drawer mobile tối, focus ring cam; storefront KHÔNG đổi.
  - **a11y (bắt buộc)**: item active có `aria-current="page"` + vạch trái `aria-hidden` (tín hiệu phi-màu);
    tab order topbar → sidebar → content; hamburger → drawer có **focus trap + Esc + trả focus**;
    focus ring cam quan sát được (≥3:1); sidebar desktop không trap bàn phím; collapse/expand thao tác được bằng keyboard.
- **Gate**: browser 390/768/1440 (Playwright MCP) + click-through toàn bộ mục nav + deep-link.

**Thứ tự bắt buộc**: T4.1 (chrome=false, verify parity `/admin` cũ) → bật chrome admin → lab → designer.

---

## 5. W5 — Error handling + dọn dẹp (P4)

> **Thứ tự bắt buộc**: T5.1 (pin baseline) → **T5.2-pre (tạo contract dùng chung, KHÔNG song song)** → (T5.2a ∥ T5.2b).
> KHÔNG chạy T5.1 song song T5.2 vì T5.2 sửa catch làm đổi số đếm R3. T5.2a/b chỉ được song song SAU khi T5.2-pre xong.

### T5.1 · Gate `scripts/check-error-handling.mjs`
- **Cơ chế**: allowlist + budget (như `check-ui-rules.mjs`).
- **Luật**:
  | Luật | Kiểu | Ngưỡng | Ghi chú |
  |---|---|---|---|
  | R1 `empty-catch` | Cứng | 0 | Cho `catch { /* ignore: <lý do> */ }`; sửa 6 chỗ `localStorage.setItem('vcube_products'…)` trong `App.tsx` |
  | R2 `false-success-in-catch` | Cứng | 0 | `return { success: true }`/`return true` trong `catch`; hiện đã 0 |
  | R3 `warn-in-catch` | Budget | **số nguyên chính xác do scanner in ra** | `console.warn/error` trong `catch`; chỉ được GIẢM |
- **Steps**: viết rule scanner (tôn trọng `{}`/chuỗi như `check-ui-rules`), **in ra N chính xác**, pin N vào ALLOWLIST,
  thêm gate vào `AGENTS.md` §"Gate bổ sung".
- **Lưu ý baseline**: N **phụ thuộc cửa sổ scanner** (đo tham khảo: heuristic 1 dòng = 65, cửa sổ 9 dòng = 75).
  KHÔNG hardcode "≈65"; lấy đúng output scanner. Sau T5.2, **đo lại và hạ trần** xuống số mới.
- **Acceptance**: RC=0; cố tình thêm empty catch → FAIL; cố tình tăng warn-in-catch → FAIL.

### T5.2-pre · Tạo contract dùng chung (KHÔNG song song)
- **Files mới**: `src/backend/lib/result.ts`, `src/frontend/lib/reportError.ts`.
- **Contract canonical — discriminated union** (narrow thật, chặn "báo thành công giả"):
  ```ts
  export interface ValidationIssue { field: string; message: string; code?: string }

  export type WriteResult<T = void, E = unknown> =
    | ((T extends void ? { success: true; data?: undefined } : { success: true; data: T })
        & { error?: undefined; issues?: undefined } & E)
    | { success: false; data?: undefined; error: string; issues?: ValidationIssue[] };

  export function ok(): WriteResult<void>;
  export function ok<T>(data: T): WriteResult<T>;
  export function fail(err: unknown, fallback?: string): { success: false; error: string };
  export function failWith(issues: ValidationIssue[]): { success: false; error: string; issues: ValidationIssue[] };
  ```
  - **Đánh đổi CÓ CHỦ ĐÍCH**: dùng union `success: true|false` (KHÔNG phải `success: boolean`) để `if (r.success)`
    narrow được `r.data`. Field phụ (`alreadyProcessed`, `stockUpdated`…) đi qua generic `E`.
  - Giữ `error?: undefined` ở nhánh success và `data?: undefined` ở nhánh failure để code cũ truy cập
    `r.error`/`r.data` vẫn compile (không phá `if (res.error)`).
- **Chiều import (quan trọng)**: `result.ts` là **lá thuần** — **KHÔNG import bất kỳ gì từ
  `src/backend/services/*` hay `src/backend/supabase/*`**. Ngược lại, service **được phép** import
  `ok`/`fail`/`WriteResult` từ `result.ts`. `ValidationIssue` định nghĩa tại `result.ts`; `settingsService` re-export.
- **`reportError` contract** (T5.2a/B dùng chung — KHÔNG tự định nghĩa khác):
  ```ts
  // src/frontend/lib/reportError.ts
  export function reportError(context: string, err: unknown, opts?: { toast?: boolean; message?: string }): void;
  ```
- **Acceptance**: 2 file biên dịch độc lập; `result.ts` không có import từ service/supabase. Phải xong TRƯỚC T5.2a/b.
- **Gate**: `npm run lint && npm run build`.

### T5.2a · database + settings (sau T5.2-pre, ∥ T5.2b)
- **Vấn đề**: repo có 3 dạng result chồng lấn → hợp nhất về canonical, KHÔNG phát minh thêm.
  - `settingsService.ts`: `WriteResult<T>`, `SettingsResult<T>`
  - `workshopService.ts`: `WriteResult { success; error: string|null }`
  - `database.ts`: inline `{ success: boolean; error?: string }`
- **Chi tiết hợp nhất**:
  - `ValidationIssue` chuyển định nghĩa vào `result.ts`; `settingsService` re-export.
  - `settingsService.WriteResult<T>` (có `issues?`) → thay bằng canonical + re-export.
  - `SettingsResult<T> { data; error }` GIỮ NGUYÊN (read-result, khác shape).
  - `database.ts`: field phụ `alreadyProcessed` dùng generic `E` → `WriteResult<void, { alreadyProcessed?: boolean }>`.
- **Hàm migrate (T5.2a) — số tham chiếu, phải grep lại**: `database.ts` **15**, `settingsService` **5**.
  - `database.ts` (15): `saveProduct, deleteProduct, saveOrder, updateOrderStatus, saveUser, updateUserKyc,
    saveMaterial, savePrinter, savePricingConfig, saveSiteContent, saveWorkshopPartner, saveAccessory,
    deleteAccessory, deleteMaterial, deletePrinter`.
  - `settingsService.ts` (5): `saveAppSettings, savePricingGlobalSettings, saveSiteContent, savePricingConfig, saveSettingsPatch`.
- **Acceptance**: mọi hàm trên dùng `ok()/fail()`; catch KHÔNG trả success; UI kiểm `success` thật.
- **Gate**: `lint` · `build` · `check-error-handling` · browser luồng ghi (lưu settings, thử lỗi → báo đúng).

### T5.2b · workshop + customDesign (sau T5.2-pre, ∥ T5.2a)
- **Files**: `src/backend/services/workshopService.ts`, `src/backend/services/customDesignService.ts`,
  `src/frontend/lib/reportError.ts` (contract đã tạo ở T5.2-pre — KHÔNG định nghĩa lại).
- **Hàm migrate — số tham chiếu, phải grep lại**:
  - `workshopService.ts` (**22**): `saveWorkshopProfile, deleteWorkshopProfile, saveWorkshopMachine, updateMachineStatus,
    deleteWorkshopMachine, saveWorkshopMaterial, updateMaterialStock, deleteWorkshopMaterial, saveDesignerProfile,
    deleteDesignerProfile, saveCustomerProfile, deleteCustomerProfile, saveWorkshopAccessory, deleteWorkshopAccessory,
    saveMyWorkshopProfile, saveMyMachine, deleteMyMachine, saveMyMaterial, deleteMyMaterial, saveMyAccessory,
    deleteMyAccessory, updateMyOrderProgress`.
  - `customDesignService.ts` (**4**, ƯU TIÊN ĐẦU — hiện trả `void`, UI không thể biết thành/bại):
    `createRequest, updateStatus, appendMessage, sendQuote`.
- **Cạm bẫy khi đổi shape (đã đo, phải xử lý tường minh)**:
  - `workshopService.ts` có **28 literal `{ success: true, error: null }`** → đổi thành `ok()` (union không cho `error`
    ở nhánh success). Riêng `{ success:true, error:null, stockUpdated:true, newStockGrams }` → `ok()` + generic `E`
    hoặc named type giữ field phụ.
  - **8** chỗ khai `Promise<WriteResult>` trong `workshopService.ts` phải cập nhật theo generic.
  - Grep **tất cả** chỗ đọc `.error`/`.success` của các hàm này trước khi đổi type. Đo được: **0** chỗ dùng
    `!== null` (không có bẫy null-vs-undefined kiểu đó), **4** chỗ dùng truthy (`if (res.error)`, `!saved.error`)
    vẫn đúng với `undefined`, và **1** chỗ truy cập `.error` trên biến union (`WorkshopOnboardingWizard.tsx`)
    cần nhánh `error?: undefined` ở success (canonical đã có).
- **Acceptance**: `customDesignService` không còn hàm ghi trả `void`; mọi catch trả `fail()`; 0 literal `error: null` còn lại.
- **Gate**: `lint` · `build` · `check-error-handling` · browser luồng xưởng/designer.

### T5.3 · Gỡ `motion`
- **Files**: `src/frontend/components/services/ServiceShowcaseSection.tsx` (anchor `import { motion } from 'motion/react'`), `package.json`.
- **Steps**: thay `<motion.div whileHover={{y:-3}} transition={{duration:0.15}}>` bằng
  `hover:-translate-y-[3px] transition-transform duration-150`; gỡ dep `motion`.
- **Acceptance**: không còn import `motion/react`; hover tương đương; ghi bundle size trước/sau.

### T5.4 · Dọn khác
- **E1**: gỡ `@supabase/ssr`, `@google/genai` khỏi `package.json` (0 import).
- **B2**: tiền/số → `Money`/`formatNumber` (19 `toLocaleString`, 5 consumer).
- **B6**: 5 overlay `fixed inset-0` + 2 `window.confirm` → `Modal`/`Sheet`/`ConfirmDialog`
  (loại trừ `ModelViewer3D`, `PersonalizeModelViewer3D`, `AdminSidebar`, background layer Home/Explore).
- **Gate**: `check-error-handling` + toàn bộ gate UI + browser luồng ghi.

---

## 6. W6 — Backlog UI (P5, chưa làm trong đợt này)

- **DataTable Tier-3**: `--color-table-header`, `--color-row-hover`; badge trạng thái 3D + progress; tabs/filter.
- **Storefront**: hero fit viewport (cần sign-off), `content-visibility` cho list dài, i18n leftovers.
- **Panel inspector 3D/PBR** phải (theo ảnh), KPI row, FAB.
- **B1**: raw `<select>` (52) / `<input>` (289) → `Field`+`Select`+`Input` theo route.
- **C1**: drawer mobile của `Header.tsx` → `Sheet` (thống nhất a11y).
- **AssetLibrary storage**: `createSignedUrl` inline → tầng service (AGENTS yêu cầu).
- **Lab (UI)**: `ConfirmDialog` cho xoá máy/vật liệu/phụ kiện.
- **Data-honesty**: `SEOHead.tsx` OG ảnh Unsplash; `QuoteSummaryPanel.tsx` ảnh stock.
  (`AdminProductsPanel.tsx` là blacklist — giữ.)
- **`App.tsx` tách hook** (`useCatalogSync`, `useRealtimeProducts`, `useFabVisibility`), B3/B4/B5, D2/D3/D4.

---

## 7. NGOÀI PHẠM VI (không làm trong plan này)

- **Lab stage "delivered" thứ 9 / nới DB CHECK `status_stage_index between 0 and 7`** — đổi schema + business logic,
  vi phạm bất biến §0 #1 (presentation-only). Chuyển sang **backlog backend riêng**, không đưa vào W6.

---

## 8. Dispatch cho subagent

| Wave | Task | Subagent | Song song? |
|---|---|---|---|
| W1 | T1.1 | `general` (worker) | — |
| W1 | T1.2 | `general` | **sau T1.1** (cùng `index.css`) |
| W1 | T1.3 | `general` | ∥ T1.2 (khác file) |
| W2 | T2.1→T2.5 | `general` (worker) tuần tự | không (cùng `index.css`) |
| W2 | review | `general` (reviewer) | sau W2 |
| W3 | T3 | `general` | không |
| W4 | T4.1 | `general` | không |
| W4 | T4.2 | `general` | sau T4.1 |
| W5 | T5.1 | `general` | trước T5.2 (pin baseline) |
| W5 | T5.2-pre | `general` | **sau T5.1**; KHÔNG song song (tạo contract dùng chung) |
| W5 | T5.2a / T5.2b | `general` ×2 | ∥ — **chỉ sau T5.2-pre** (khác file) |
| W5 | T5.3 / T5.4 | `general` | song song |
| — | verify | `general` (reviewer) | cuối |

Mỗi task: ghi `progress.md` (theo mẫu `.agents/*/`), trả báo cáo gồm **symbol đã sửa** (không chỉ số dòng) + **kết quả gate**.

## 9. Definition of Done

- [ ] `npm run lint` + `npm run build` PASS.
- [ ] `check-contrast` + `check-contrast-combos` light-only PASS; `check-error-handling` PASS.
- [ ] 0 tham chiếu sống tới `dark`/`ThemeMode`/`subscribeTheme`.
- [ ] `/admin`,`/lab`,`/designer`: topbar sáng full-width, sidebar tối, active cam chữ tối, drawer tối, focus cam,
      `aria-current="page"` + tab order + focus trap drawer đúng.
- [ ] Storefront không đổi.
- [ ] Write-service trả `success` thật; 6 empty-catch xử lý; `customDesignService` hết hàm ghi trả `void`; `motion` gỡ.
- [ ] `src/backend/lib/result.ts` là lá thuần (0 import từ service/supabase); `WriteResult` là discriminated union (narrow được).
- [ ] **Bundle size**: ghi `dist/assets/*.js` (gzip) trước/sau khi gỡ `motion`/`@supabase/ssr`/`@google/genai`;
      kỳ vọng giảm, không chunk nào phình bất thường.
- [ ] **R3 baseline**: pinned **số nguyên chính xác** do scanner in ra (không còn `≈`), chỉ được giảm.
- [ ] Docs cập nhật; không commit/push.

## 10. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Số dòng lệch giữa các task tuần tự | Định vị bằng `grep`/symbol (§0.2); KHÔNG dùng số dòng làm toạ độ |
| T1.1/T1.2 song song đụng `index.css` | Chuyển tuần tự T1.1→T1.2→T1.3, hoặc vùng chèn cố định không chồng lấn |
| AppShell restructure vỡ sticky/mobile | T4.1 `chrome=false`, verify parity trước khi bật |
| `check-contrast-combos` "xanh giả" khi bỏ `.dark` | chạy `--json`, kiểm token-drift light; cập nhật tổng cặp |
| `cn()` không merge class | dùng prop `tone` |
| Migrate `WriteResult` phá luồng cũ | giữ alias export; chỉ đổi write-service; test luồng ghi |
| Baseline R3 chụp sai do T5.2 sửa catch | T5.1 pin baseline TRƯỚC T5.2; sau T5.2 đo lại và hạ trần |
| T5.2b import `ok/fail` khi `result.ts` chưa tạo xong | Tách **T5.2-pre** tạo file dùng chung, chạy trước, không song song |
| Đổi `error: string\|null` → `error?: string` lệch `null`/`undefined` | Grep toàn bộ phép đọc `.error` của hàm liên quan trước khi đổi type (đã đo 0 chỗ `!== null`, 4 chỗ truthy, 28 literal `error:null`) |
| `result.ts` import ngược từ service gây vòng | `result.ts` là lá thuần — chỉ KHÔNG import từ service/supabase; service được import từ nó |
| Cam + trắng fail AA | đã dùng chữ tối `#0F172A` |
