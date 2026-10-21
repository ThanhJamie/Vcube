<!-- doc-meta: status=active; verified=2026-10-21; owner=admin -->
# HANDOFF — Phase 4b: tách `PricingConfigPanel` + `Group1WorkshopsPanel` (behavior-preserving)

> **Work item:** `task-33` · **Agent:** `admin` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `dd0b86b` (Phase 1–3 đã push)
> **Không commit/push. Không thêm dependency. Không `any` mới. Không đổi copy VI/JSX/logic.**
> **Không sửa** `AdminDashboardView.tsx`, `dbService`, `workshopService`, `App.tsx`, components khác.
>
> ## ✅ VERDICT: **DONE** — 2 god-file tách theo sub-panel, 100% block move (43/43 kiểm tra byte-identical);
> LOC đạt target; `lint` (scope) + `build` PASS; smoke headless: app boot, admin bị RoleGuard chặn (không auth).

---

## 1. Kết quả LOC (trước → sau)

| File | Before | After | Δ | Target |
|---|---:|---:|---:|---|
| `admin/PricingConfigPanel.tsx` | **3.079** | **985** | **−2.094 (−68,0%)** | ≤1.200 ✅ |
| `admin/groups/Group1WorkshopsPanel.tsx` | **2.012** | **755** | **−1.257 (−62,5%)** | ≤800 ✅ |
| **2 file gốc (còn lại)** | **5.091** | **1.740** | **−3.351** | — |
| 19 file mới (10 pricing + 9 group1) | 0 | **3.991** | +3.991 | mỗi file ≤700 ✅ |
| **Tổng** | 5.091 | 5.731 | +640 (+12,6%) | overhead = import/interface/composition |

File mới lớn nhất: `pricing/FormulaCoreSections.tsx` **604** dòng (≤700); nhỏ nhất: `group1/group1Shared.ts` 34 dòng.
Overhead +640 dòng là **interface props + import + dòng export** (không có logic mới) — chấp nhận cho split bảo toàn hành vi.

---

## 2. Bảng file → trách nhiệm

### 2.1 `src/frontend/components/admin/pricing/` (10 file)

| File | Dòng | Trách nhiệm | Nguồn (dòng gốc) |
|---|---:|---|---|
| `pricingShared.tsx` | 80 | Hằng số/helper module-level: `isConfiguredNumber`, `PREVIEW_*`, `referenceFormulaForm/GlobalForm`, `formatPreviewVnd/Delta`, `FieldError`, type `GlobalFormField` | 38–110 + type ở 189 |
| `types.ts` | 122 | Props interface cho 10 component tách ra (typed, không `any`) | — |
| `PricingHeader.tsx` | 230 | Header + badge + banner "số mẫu Inkiri" + trạng thái DB + **6 tab bar** | 899–1117 |
| `FormulaTab.tsx` | 43 | `<form>` SUB-TAB 1: wrapper + compose 4 section + footer nút "Lưu Toàn Bộ Cấu Hình Công Thức" | 1121–2269, con thay bằng component |
| `FormulaGlobalCard.tsx` | 206 | Mục 0 `pricing_global_settings` (VAT · điện · nhân công · phí nền tảng) + bảng xem trước tác động + previewRows | 1130–1322 |
| `FormulaCoreSections.tsx` | 604 | Sections 1–3: Điện năng · Nhân công · Dự phòng rủi ro/Markup/Phí | 1324–1915 |
| `FormulaVolumeDiscount.tsx` | 125 | Section 4: bậc chiết khấu số lượng (CRUD mốc) | 1918–2031 |
| `FormulaAddonSections.tsx` | 236 | Sections 5–7: phí tuỳ biến/dịch vụ · gói giao hàng · hằng số cắt lớp | 2034–2258 |
| `MaterialsSection.tsx` | 367 | SUB-TAB 2 (danh sách nhựa) + modal thêm/sửa vật liệu | 2274–2380 + 2536–2776 |
| `PrintersSection.tsx` | 424 | SUB-TAB 3 (đội máy) + modal thêm/sửa máy in | 2385–2494 + 2781–3075 |

### 2.2 `src/frontend/components/admin/groups/group1/` (9 file)

| File | Dòng | Trách nhiệm | Nguồn (dòng gốc) |
|---|---:|---|---|
| `group1Shared.ts` | 34 | Helper module-level `printerStatusToMachineStatus` + `printerToMachine` (map `printer_fleet` → `WorkshopMachine`) | 22–53 |
| `types.ts` | 103 | Props interface cho 9 component tách ra | — |
| `Group1Header.tsx` | 83 | Header + tiêu đề + InfoTip + tab nav (workshops/fleet/materials/partners) | 647–719 |
| `Group1Kpi.tsx` | 77 | KPI strip 6 thẻ (xưởng, chờ duyệt, đội máy, rảnh, đang in, tồn kho) | 722–789 |
| `WorkshopsTab.tsx` | 267 | TAB 1: filter khu vực/trạng thái, search, lưới thẻ xưởng, empty/loading/error, action duyệt/đình chỉ | 793–1049 |
| `FleetTab.tsx` | 248 | TAB 2: filter trạng thái, search, lưới máy, breakdown chi phí/giờ, action đổi trạng thái | 1054–1290 |
| `MaterialsTab.tsx` | 87 | TAB 3: banner cảnh báo tồn thấp + `DataTable` tồn kho vật liệu | 1295–1370 |
| `PartnersTab.tsx` | 269 | TAB 4: `DataTable` đối tác + modal thêm/sửa đối tác (Supabase) | 1748–2006 |
| `Group1Modals.tsx` | 386 | 3 modal: Thêm Xưởng In · Biên chế Máy · Thêm Vật Liệu | 1375–1511, 1516–1636, 1641–1743 |

### 2.3 File gốc — chỉ còn gì

| File | Nội dung giữ lại |
|---|---|
| `PricingConfigPanel.tsx` (985) | `PricingConfigPanelProps` (nguyên vẹn) + **toàn bộ** state/`useState`/`useEffect`/derived/handlers/validation/`ConfirmDialog` xoá vật liệu–máy + **composition** (`<PricingHeader>`, `{subTab==='formula' && <FormulaTab>}`, 3 tab nhỏ accessories/inventory/estimator, 2 modal component) |
| `Group1WorkshopsPanel.tsx` (755) | `Group1WorkshopsPanelProps` (nguyên vẹn) + **toàn bộ** state/hooks/handlers/store calls + `materialColumns`/`partnerColumns` (`useMemo`) + composition (`<Group1Header>`, `<Group1Kpi>`, 4 tab, 3 modal component) + `export default` |

**Pattern composition:** parent giữ state/form/hook và **tạo object props có type** trước `return`
(`pricingHeaderProps`, `formulaTabProps`, `materialsTabProps`, …) rồi truyền `<X {...props} />`.
Sub-component là **presentation thuần** — destructure props đúng tên biến cũ nên **thân JSX dán nguyên văn**.

---

## 3. Bằng chứng "block move" (behavior-preserving)

Script kiểm tra tự động (đọc `git show HEAD:<file>` so với file mới) — **43/43 PASS**:

1. **Byte-identical:** 14 block JSX pricing + 9 block JSX Group1 xuất hiện **nguyên văn** trong file mới
   (không đổi 1 ký tự JSX/class/copy).
2. **Formula wrapper:** phần `<form>` còn lại (sau khi bỏ 4 block con) khớp **nguyên văn** phần còn lại
   trong `FormulaTab.tsx` (gồm opening `<form …>` và footer nút submit).
3. **Parent đã xoá block:** 8 block pricing + 8 block Group1 **không còn** trong file gốc.
4. **Hook/handler parity:** đếm `useState/useEffect/useMemo/useCallback/useRef` + danh sách `const handle*`
   của 2 parent **giống hệt** trước/sau → không mất/đổi hook, handler, effect.
5. **`as any` parity:** Pricing `HEAD=1 → new=1`; Group1 `HEAD=4 → new=4` (0 `any` mới; các `as any` là code cũ
   được move nguyên văn). Không có `@ts-ignore` mới.
6. **Public API:** `interface PricingConfigPanelProps` (không export) và `export interface Group1WorkshopsPanelProps`
   **không đổi**; `export const PricingConfigPanel`, `export const Group1WorkshopsPanel`, `export default` giữ nguyên.
7. **`git diff --stat` 2 file gốc:** `227 insertions(+), 3578 deletions(-)` — insertions = import + props object +
   composition lines; deletions = block đã move. Không có dòng logic mới trong 2 file gốc.

---

## 4. Gate & bằng chứng

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck **scope Phase 4b** | `npx tsc --noEmit -p <temp tsconfig include src/frontend/components/admin/**>` | **PASS (rc=0)** — 0 lỗi trong `admin/pricing/**` + 2 file gốc |
| Typecheck whole-repo | `npm run lint` | **PASS ngay sau khi tách** (0 lỗi). Ở lần chạy cuối, repo-wide có lỗi **chỉ thuộc agent Phase-4 khác đang sửa dở** (`src/frontend/components/workshop/settings/{SettingsBanners,SettingsHeader,types}.tsx`, `src/frontend/views/WorkshopSettingsView.tsx` — lỗi export `TabId/LAB_TAB_IDS` + controller props); **0 lỗi trong file thuộc task này** (xem §6.6) |
| Build (isolated) | `npx vite build --outDir dist-ssr/p4b --emptyOutDir` | **PASS** — `✓ built in 8.61s`; ghi `dist-ssr/p4b/` (**không ghi `dist/`**) |
| `dist/` không bị đụng | `git status` | 0 thay đổi `dist/` |
| LOC targets | `wc -l` | 985 / 755 / max file mới 604 — **đạt** |
| Block-move | script §3 | **43/43 PASS** |

Build chính: `index-BUPI492T.js 692.53 kB (gzip 187.64)`, `Tool3DView 355.97 kB`, `three-vendor 531.66 kB`
(hash đổi nhẹ so với trước do code-splitting chunk composition thay đổi — hành vi bundle không đổi về mặt entry).

---

## 5. Smoke trình duyệt (best effort) — `/admin` bị RoleGuard chặn

Công cụ: Chromium headless shell (Playwright cache `chromium_headless_shell-1244`) +
`vite preview --outDir dist-ssr/p4b --port 4327` (server riêng, đã tắt sau smoke; **không đụng dev server/agent khác**).

| Route | 390×900 | 1440×900 | Ghi chú |
|---|---|---|---|
| `/admin` | DOM 29.122 B | DOM 29.122 B | SPA boot OK; **RoleGuard → chuyển về màn Đăng nhập storefront** |
| `/admin/pricing` | 29.122 B | 29.122 B | cùng guard |
| `/admin/machines` | 29.122 B | 29.122 B | cùng guard |

- **0 uncaught JS error / 0 pageerror** (chỉ log sandbox `Failed to adjust OOM score` của môi trường container — không phải lỗi app).
- ⚠️ **Không thể vào console** để xem 6 tab pricing / 4 tab xưởng: Supabase paused + không có phiên admin
  (không login được, đúng dự kiến của task). ⇒ **Static + typecheck + build** là bằng chứng chính; phần visual
  để QA chụp khi có auth.
- QA checklist khi có auth: `/admin/pricing` → 6 tab (Formula gồm 0–7; Materials; Printers; Accessories; Inventory;
  Estimator) + 2 modal vật liệu/máy; `/admin/queue` & `/admin/partners` & `/admin/machines` → 4 tab Group1 +
  3 modal; kiểm 0 tràn ngang 390, console 0 error.
- Ghi chú: DOM ở 6 lần load **giống hệt nhau** (29.122 B) → không có crash/sai route; hash route guard hoạt động.

---

## 6. Rủi ro & việc còn lại

| # | Mức | Nội dung | Đề xuất |
|---|---|---|---|
| 1 | Thấp | **Props-drilling có type** trong `pricing/types.ts` + `group1/types.ts` gắn với tên biến nội bộ của parent (vd `formulaForm`, `filters`). Đổi tên state ở parent sau này phải sửa interface + props object. | Chấp nhận (bảo toàn hành vi); nếu muốn giảm, Phase sau tách hook `usePricingConfigForm` (file đã được cấp phép nhưng **không dùng ở task này** — xem #2) |
| 2 | Thấp | **Không tách hook** `usePricingConfigForm.ts`: logic form/validation ~750 dòng nằm trong parent theo đúng rule "parent giữ state/form/hook". Nếu đưa vào hook sẽ vượt target ≤700 dòng/file và tăng rủi ro hook-order/behavior. | Để Phase 4/6 nếu cần tách tiếp; hiện target đã đạt 985/755 |
| 3 | Rất thấp | `FormulaTab` nhận full `FormulaTabProps` (21 field) dù chỉ dùng `handleSaveFormula`; các section nhận subset. Thừa props nhưng **không đổi hành vi** và không đổi DOM. | Chấp nhận; có thể thu hẹp sau |
| 4 | Rất thấp | Modal mount semantics giữ nguyên: `{(isNewMaterialOpen || editingMaterial) && <MaterialEditorModal …/>}` y như conditional gốc ⇒ không render DOM khi đóng (giống trước). | Đã verify bằng diff + build |
| 5 | Rất thấp | Thư mục mới **untracked** (`admin/pricing/`, `admin/groups/group1/`); 2 file gốc ` M`. Khi commit dùng `git add -A` để nhận đủ 19 file mới + 2 file sửa. | Lead/integrator commit |
| 6 | Trung bình (ngoài scope) | Lúc bàn giao, **repo-wide `npm run lint` đỏ do agent khác** đang tách `WorkshopSettingsView` (`components/workshop/settings/*` + `WorkshopSettingsView.tsx` — lỗi export `TabId`/`LAB_TAB_IDS` & controller props). **Không liên quan file task này**; scope typecheck của tôi PASS. | Agent đó hoàn tất rồi chạy lại `npm run lint` tổng |
| 7 | Thấp | `dist-ssr/p4b/` (≈11 MB, gitignored) còn trên đĩa cho verifier đối chiếu | Có thể `rm -rf dist-ssr/p4b` sau verify |
| 8 | — | Không sửa `AdminDashboardView.tsx` (import `PricingConfigPanel`/`Group1WorkshopsPanel` giữ nguyên tên + props ⇒ không cần đổi) | — |
| 9 | — | Không đổi copy VI/JSX/class/token nào (block move verbatim) | — |

---

## 7. Cách tái lập kiểm chứng

```bash
cd /home/thanh/home/thanh/project/Vcube

# 1) LOC
wc -l src/frontend/components/admin/PricingConfigPanel.tsx \
      src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx \
      src/frontend/components/admin/pricing/* \
      src/frontend/components/admin/groups/group1/*

# 2) block-move: 43 check (byte-identical + hooks/handlers parity) — script tạm thời, không commit
#    (nội dung: git show HEAD:<file> so với block tương ứng trong file mới; xem §3)

# 3) typecheck scope task (tạo tsconfig tạm, xoá sau)
cat > tsconfig.p4b-scope.json <<'JSON'
{ "extends": "./tsconfig.json",
  "include": ["src/frontend/components/admin/**/*"],
  "exclude": ["node_modules", "dist", "dist-ssr"] }
JSON
npx tsc --noEmit -p tsconfig.p4b-scope.json && rm tsconfig.p4b-scope.json

# 4) build isolated (không ghi dist/)
npx vite build --outDir dist-ssr/p4b --emptyOutDir

# 5) trạng thái
git status --short
git diff --stat -- src/frontend/components/admin/PricingConfigPanel.tsx \
                     src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx
```

---

## 8. SHELL-REQUEST / phụ thuộc

**Không có.** Không cần sửa file ngoài scope; `AdminDashboardView` import 2 component với đúng tên + props cũ.
Không thêm dependency; không đổi route/store/backend.
