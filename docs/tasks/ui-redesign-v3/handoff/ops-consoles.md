<!-- doc-meta: status=active; verified=2026-10-20; owner=ops-consoles -->
# HANDOFF — W3 Console Designer + Lab + Onboarding (ops-consoles) · v3 "Soft Studio"

> **Trạng thái: DONE — surface-only, không đổi density/IA.** Gate offline xanh (`lint`, `build`,
> contrast, combos, ui-rules, fabricated, icon-names). **Không** chụp browser (task cho phép
> "skip live full check"; Supabase paused) ⇒ QA W6 xác nhận ảnh 390/768/1440 theo §7.
> Không commit/push. Không thêm dependency. Không đổi route/slug/state.
>
> Đọc kèm: `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` (v3, §3.1/§3.4/§3.5/§3.6/§3.7),
> `docs/tasks/ui-redesign-v3/handoff/design-foundation.md` (W1), `UI-DEFECTS.md`, `COPY-GLOSSARY.md`.

---

## 1. Phạm vi & nguyên tắc đã giữ

| Việc | Kết quả |
|---|---|
| Surface-only (token/radius/shadow/segmented/badge/table/form + copy) | ✅ Không đổi bố cục, thứ tự khối, luồng state |
| 5 tab Designer (`overview/models/wizard/payouts/requests`) | ✅ Nguyên vẹn (`DESIGNER_TAB_IDS` không đổi) |
| 6 tab Lab (`queue/machines/materials/accessories/audit_trail/preferences`) | ✅ Nguyên vẹn (`LAB_TAB_IDS` không đổi) |
| Route/URL là nguồn sự thật (`/designer/<tab>`, `/lab/<tab>`) | ✅ Không đổi; `setActiveTab` vẫn `navigate(...)` |
| Density console (bảng 40–44px, hairline, `shadow-e0/e1`) | ✅ Không nới padding/gap/height nào ở desktop |
| **Không** sửa `src/index.css`, `src/frontend/ui/**`, `src/App.tsx`, `Header.tsx`, backend/stores/utils/supabase, `format.ts` | ✅ Không có diff ngoài 8 file thuộc scope |
| `SideNav variant="pill"` | ✅ Đã bật sẵn bởi W1 trong `src/App.tsx:437` (DashboardShell dùng cho cả `/lab` + `/designer`) — **không cần SHELL-REQUEST** |
| Không thêm dep/font/dark theme/route; không commit | ✅ |

**File ngoài scope bị chạm: 0.** (Git status còn nhiều file do W1/W2/agent W3 khác sửa song song —
không thuộc handoff này.)

---

## 2. Files changed (8 — đúng write scope)

| # | File | Thay đổi chính |
|---|---|---|
| 1 | `src/frontend/views/DesignerDashboardView.tsx` | Segmented 5 tab → recipe v3 §3.6 (`rounded-full` track/item, active `bg-surface + shadow-soft`); giữ `overflow-x-auto`, `max-md:min-h-11`, focus ring. `Xem Catalog VCUBE` → `Xem danh mục VCUBE` |
| 2 | `components/designer/DesignerOverviewTab.tsx` | Badge trạng thái yêu cầu không render enum thô (`Pending…` → `Chờ duyệt/Đang thực hiện/Đã báo giá/Hoàn thành`); CTA raw → `Button variant="primary"`; copy D-E/D-A (`File Số`→`tệp số`, `Database`→`cơ sở dữ liệu`, `Marketplace`→`sàn`); `text-fg-subtle` trên tile → `fg-muted` |
| 3 | `components/designer/DesignerModelsManagerTab.tsx` | **UI-010**: nhãn giấy phép/xuất bản VI-only (bảng + select + modal + filter); nhãn danh mục slug → VI; tiền `đ` → `₫`; `File`→`Tệp`; `Catalog DB`/`License`/`Tags` → VI; thêm `focus-visible` cho nút toggle trạng thái; `text-fg-subtle`→`fg-muted` |
| 4 | `components/designer/DesignerRequestsTab.tsx` | Badge trạng thái VI; **D14/D-A**: `Mật Độ Infill:` → `Độ đặc:`; `Kích Thước Đầu Phun (Nozzle)` → `Đường kính đầu phun`; `Project Brief` → `Tóm tắt dự án`; **OC-1** (P2): sửa khung chat bị cắt ở 390 (xem §6) |
| 5 | `components/designer/DesignerUploadWizardTab.tsx` | **UI-010**: `Standard (Cá Nhân)`/`Commercial (Thương Mại)` → VI; `File`→`Tệp`, `mb`→ lưới, `manifold`→ bỏ, `THỂ TÍCH MESH`→`LƯỚI`; `VNĐ`→`₫`; `Catalog/DB` → danh mục; nhãn danh mục slug → VI; step chip tap target 390; `text-fg-subtle`→`fg-muted` |
| 6 | `components/designer/DesignerPayoutsTab.tsx` | **UI-022**: banner `Dữ liệu mẫu — chưa nối bảng quyết toán thật.` → **`Chưa nối bảng quyết toán — chưa có giao dịch.`** (fixture `PAYOUT_TRANSACTIONS = []`); badge trạng thái payout map VI; header bảng sentence-case; bỏ nhánh `isVi` chết ở banner |
| 7 | `views/WorkshopSettingsView.tsx` | Segmented 6 tab + toggle Danh sách/Kanban → recipe v3 §3.6 (`rounded-full`, active `shadow-soft`); thêm `role="group"` + `aria-label` cho toggle; **D-A** `Hub Hà Nội/Đà Nẵng/TP.HCM` → `đầu mối …`; `Đang in (Busy)` → `Đang in`; `Tracking/NotTracking` → `Đang theo dõi/Chưa theo dõi`; `Hotline`→`Đường dây nóng`; `telemetry`→`số đo tự động từ máy`; 8 nút nấc có `aria-label` + `focus-visible` + tap target 390 |
| 8 | `components/onboarding/WorkshopOnboardingWizard.tsx` | **UI-005** (nửa onboarding) + **D-A/D-B/D-E**: xem §4; `Hub`→`đầu mối`, `Hotline`→`số điện thoại`, `File`→`Tệp`, `đ/kWh`→`₫/kWh`, `/h`→`/giờ`; `Free`→`Rảnh`; `MES Hub Onboarding Wizard`/`Partner` → VI; step indicator `div onClick` → `<button disabled>`; label ↔ select có `htmlFor/id`; tap target nút xoá/swatch 390 |

---

## 3. Áp v3 surface (theo DESIGN-LANGUAGE v3)

| Hạng mục | Áp dụng |
|---|---|
| Segmented control §3.6 | 3 chỗ: tab Designer, tab Lab, toggle Danh sách/Kanban. Track `rounded-full border-line bg-surface-muted p-1`; item `rounded-full`; active `bg-surface font-semibold text-fg shadow-soft`. **Pill chỉ dùng cho nav/segmented**, không CTA/form |
| SideNav §3.7 | `variant="pill"` đã bật từ W1 (`App.tsx:437`) — sidebar `bg-canvas`, active pill trắng `shadow-soft`; không sửa shell |
| Card §3.1 | Console giữ **`flat`** (hairline + `shadow-e0`); **0** `Card variant="soft"` trong scope (đúng luật "console không soft"). Điểm nhấn phân cấp bằng viền hairline, không bằng bóng |
| Table §3.5 | Dùng nguyên `DataTable` (density 40–44px giữ nguyên); chỉ đổi nội dung header/cell (copy + map nhãn) |
| Form §3.3 | Dùng `Field`+`Input`/`Select` (không tự dựng control mới); input/select trong scope đều có label hoặc `aria-label` |
| Badge §3.4 | Giữ recipe tint + chữ đặc; chỉ đổi **chữ** sang VI |
| Màu/radius/shadow | 0 hex mới trong `.tsx` (trừ swatch màu vật liệu = dữ liệu, được phép); 0 `rounded-[Npx]`; 0 `text-[10px]/[11px]`; 0 `h-screen` |
| `shadow-soft` | 4 lần, **chỉ** ở active state của segmented (đúng §3.6) — không rải vào console |

**Kanban (lab `queueView='board'`) — tài liệu overflow:** grid responsive `grid-cols-1 → md:2 → xl:3 → 2xl:6`,
**không có `min-w`/cuộn ngang** ở bất kỳ breakpoint nào; 390 là 1 cột (không kéo ngang như
`Group5ProductionPanel` 2100px — UI-021 thuộc admin, không phải file này). Bảng Hàng đợi/Máy in/Vật
liệu/Sổ kho cuộn **trong khung** `DataTable` (`overflow-auto`), không tràn trang. Nav 5/6 tab cuộn
**trong** `nav` (`overflow-x-auto`), không tràn trang.

---

## 4. Copy — UI-005 / UI-010 / UI-022 / D-A, D-B, D-E

### 4.1 UI-005 (P1) — onboarding: **ĐÓNG phần thuộc scope**

| Vị trí | Trước | Sau |
|---|---|---|
| `WorkshopOnboardingWizard.tsx` toast sau khi gửi | `…chờ Quản trị viên duyệt (Pending).` | `…chờ quản trị viên duyệt.` |
| Step bar bước 4 | `Chờ duyệt Pending` | `Chờ duyệt` |
| Banner hồ sơ đã gửi | `<strong>Pending</strong> (chờ Quản trị viên duyệt)` | `<strong>Chờ duyệt</strong> (chờ quản trị viên duyệt)` |
| Badge bước 4 | `verified_status: Pending (Chờ Admin Duyệt)` | `verified_status: Pending — chờ quản trị viên duyệt` (D4: giữ mã kỹ thuật **có chú thích**) |
| Câu mô tả | `…chờ duyệt (Pending).` | `…chờ duyệt.` |
| Hướng dẫn | `<strong>Pending</strong>` / `<strong>Verified</strong>` | `<strong>Chờ duyệt</strong>` / `<strong>Đã duyệt</strong>` |

> **Nửa còn lại của UI-005 là `admin/groups/Group1WorkshopsPanel.tsx` (C29/C30) — KHÔNG thuộc scope
> này.** Tại thời điểm handoff, working tree đã hiển thị `Chờ duyệt`/`Đã duyệt`
> (`Group1WorkshopsPanel.tsx:1473-1474`, do agent `admin`). ⇒ **UI-005 có thể đóng toàn bộ** sau khi
> `admin` handoff; QA xác nhận ảnh 2 màn.

### 4.2 UI-010 (P1) — **ĐÓNG** (license + publish labels VI-only)

| File | Trước | Sau |
|---|---|---|
| `DesignerModelsManagerTab` (bảng + modal + filter) | `Standard (Cá nhân)` / `Commercial (Thương mại)` / `Exclusive (Độc quyền)` | **`Tiêu chuẩn` / `Thương mại` / `Độc quyền`** |
| `DesignerModelsManagerTab` | `Published (Đã xuất bản)` / `Under Review (Chờ duyệt)` / `Draft (Bản nháp)` | **`Đã xuất bản` / `Chờ duyệt` / `Bản nháp`** |
| `DesignerUploadWizardTab` | `Standard (Cá Nhân)` / `Commercial (Thương Mại)` | **`Tiêu chuẩn (cá nhân)` / `Thương mại`** |

Giá trị enum (`Standard|Commercial|Exclusive`, `Published|Under Review|Draft`) **chỉ còn trong
code/type/DB**; UI đọc qua map `LICENSE_LABELS` / `PUBLISH_STATUS_LABELS` (không render thô).

### 4.3 UI-022 (P2) — **ĐÓNG** (data honesty)

- Trước: banner `Dữ liệu mẫu — chưa nối bảng quyết toán thật.` nhưng `PAYOUT_TRANSACTIONS = []`
  (`src/data/mockData.ts:225`) ⇒ tự mâu thuẫn.
- Sau: **`Chưa nối bảng quyết toán — chưa có giao dịch.`** — không còn ngụ ý có dữ liệu mẫu,
  không thêm dữ liệu giả; empty-state lịch sử quyết toán giữ nguyên.
- Gate `check-fabricated` SẠCH sau khi sửa.

### 4.4 D-A / D-B / D-E / D-C trong scope

| Quyết định | Chuỗi đã sửa |
|---|---|
| **D-A** thuật ngữ in 3D | `Hub Hà Nội/Đà Nẵng/TP.HCM` → `đầu mối …` (onboarding + lab); `Mật Độ Infill:` → `Độ đặc:` (requests); `THỂ TÍCH MESH` → `THỂ TÍCH LƯỚI`; `lưới đa giác (mesh)` → bỏ ngoặc EN; `kín nước (manifold)` → `kín nước`; `Dashboard`/`Database`/`Catalog`/`Studio`/`Partner`/`Wizard`/`License`/`Tags`/`Nozzle` → VI |
| **D-B** tiền `₫` | `đ` suffix input (2 chỗ) → `₫`; `(VNĐ)` → `(₫)`; `VNĐ` suffix → `₫`; `đ/kWh` → `₫/kWh`; `/h` → `/giờ`. Không đổi `format.ts` |
| **D-E** `Email` giữ / `File`→`Tệp` | `File Số` → `tệp số`; `File Thiết Kế Số` → `tệp thiết kế số`; `file nguồn` → `tệp nguồn`; `file CAD` → `tệp CAD`; `File 3D` → `tệp 3D`. `Email` giữ nguyên (allowlist) |
| **D-C** eyebrow `//` | **0 eyebrow hiển thị** trong 8 file scope có EN sau `//` (chỉ còn comment code) |
| Nhãn EN lẫn khác | `Đang in (Busy)` → `Đang in`; `Free (Sẵn sàng nhận lệnh)` → `Rảnh (sẵn sàng nhận lệnh)`; `Hotline` → `Đường dây nóng`/`số điện thoại`; `telemetry` → `số đo tự động từ máy`; `Tracking/NotTracking` → `Đang theo dõi/Chưa theo dõi`; `Project Brief` → `Tóm tắt dự án`; `…/h` → `/giờ`; `VD: … 3D Printing …` → VI |

Ghi chú: `Kanban` được giữ như thuật ngữ vận hành đã dùng trong `UI-DEFECTS`/PLAN (tên kiểu xem),
không phải nhãn trạng thái; nếu Lead muốn Việt hoá triệt để ("bảng tiến độ") thì đổi 1 chỗ ở
`WorkshopSettingsView` toggle + handoff ghi nhận — chưa tự đổi để tránh lệch với nav/label khác.

---

## 5. Defect register — đóng / chạm trong scope

| ID | Mức | Trạng thái sau handoff | Ghi chú |
|---|---|---|---|
| **UI-005** | P1 | **ĐÓNG trong scope** (onboarding) | Group1 (admin) đã VI trong tree nhưng thuộc agent `admin` — QA chốt cả 2 ảnh |
| **UI-010** | P1 | **ĐÓNG** | Bảng + select + filter + radio wizard; enum không render thô |
| **UI-022** | P2 | **ĐÓNG** | Banner khớp fixture rỗng, không fake data |
| **UI-037** | P3 | **ĐÓNG phần `DesignerRequestsTab`** | `Mật Độ Infill:` → `Độ đặc:` (D-A) |
| **UI-017** | P2 | **GIẢM THÊM** | 4 vị trí `text-fg-subtle` trên `bg-surface-muted` (4.56:1) trong scope → `text-fg-muted`; combos gate còn **0 hit** ở 8 file scope |
| **UI-014** | P2 | **GIẢM (một phần)** | CTA raw `inline-flex h-10 bg-primary…` trong `DesignerOverviewTab` → `Button variant="primary"`; các `<button>` còn lại là tab/step/badge-toggle (đúng ngữ nghĩa, không phải CTA) |
| **UI-013/015/019/020/021/023/026** | — | **N/A** | Thuộc W2/W3 agent khác (login/auth, admin, tool3d) — không nằm trong 8 file scope |

### 5.1 Phát hiện mới trong scope (đề nghị QA/Lead ghi vào register)

| ID đề xuất | Mức | File | Mô tả | Trạng thái |
|---|---|---|---|---|
| **OC-1** | P2 | `DesignerRequestsTab.tsx` | Khung chat `h-[700px] overflow-hidden` + 2 khối `h-full` ⇒ ở 390 (layout cột) khối chat bị **cắt** bởi `overflow-hidden` (không cuộn tới đáy được). Đã sửa: khung `md:h-[700px]` (desktop giữ nguyên), mobile mỗi khối có chiều cao riêng (`max-md:h-72` danh sách, `max-md:h-[560px]` chat), header chat `max-md:h-auto max-md:flex-wrap` | **ĐÃ SỬA (code)** — QA cần ảnh 390 để xác nhận |
| **OC-2** | P3 (a11y) | `WorkshopOnboardingWizard.tsx` | Step indicator là `<div onClick>` (không tới được bằng bàn phím) và `<label>` không gắn `htmlFor` với `Select`; nút xoá máy/vật liệu, swatch màu, nút nấc 8 bước có tap target < 44px ở 390 | **ĐÃ SỬA**: `<button disabled={!isCompleted}>` + `aria-current`; `htmlFor`+`id`; `max-md:min-h-11/min-w-11`; 8 nút nấc có `aria-label` |
| **OC-3** | P3 | `DesignerUploadWizardTab.tsx` | `text-info/90` (4.69:1, sát ngưỡng) trong khối hướng dẫn onboarding-style | **ĐÃ SỬA** → `text-info` (5.55:1) |

---

## 6. Gate results (2026-10-20, working tree lúc handoff)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (`tsc --noEmit`, 0 lỗi) |
| Build | `npm run build` | **PASS** (`✓ built in 5.72s`) |
| Contrast token | `node scripts/check-contrast.mjs` | **56/70 pass · 14 expected non-pass · 0 unexpected fail** |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **rc=0**; **0 hit trong 8 file scope** (gần-miss 4.56:1 toàn repo giảm 25 → 21) |
| UI rules | `node scripts/check-ui-rules.mjs` | **PASS** — 139 file, 0 vi phạm mới |
| Fabricated | `node scripts/check-fabricated.mjs` | **SẠCH** — 139 file, 0 tuyên bố bịa |
| Icon names | `node scripts/check-icon-names.mjs` | **PASS** — 138 file, 224 glyph |
| `npm run check` đầy đủ (live/Supabase) | — | **BỎ QUA có chủ đích** (Supabase paused + task cho phép skip live full check) |

Không hồi quy so baseline W1: contrast/combos/ui-rules/fabricated giữ nguyên hoặc tốt hơn.

---

## 7. Bằng chứng density + responsive (static, chưa có ảnh)

### 7.1 Density — không đổi

- Bảng: **không sửa** `DataTable`/`Skeleton`/`Badge`; mọi bảng trong scope vẫn render qua primitive
  (row `h-11`, header `h-10`, `tabular-nums` cột số) ⇒ density console 40–44px giữ nguyên.
- Pad/gap: **không đổi** `p-*`/`gap-*`/`space-y-*` nào ở desktop. Thay đổi duy nhất về kích thước là
  **mobile-only** (`max-md:min-h-11`, `max-md:size-11`, `max-md:min-w-11`) để tap target ≥44px; desktop
  không bị ảnh hưởng.
- Tab bar: cao `min-h-9` (mobile `min-h-11`) **giữ nguyên**; chỉ đổi `rounded-md`→`rounded-full` +
  `shadow-e1`→`shadow-soft` cho active.
- Kanban: **cùng 6 cột**, cùng breakpoint, cùng card padding `p-3`; chỉ giữ `shadow-e0`/hover `e1`.
- Wizard/onboarding: cùng 3-4 bước, cùng grid; không thêm/bớt field.
- Số đo tự động: `shadow-soft` = 4 (chỉ active segmented); `variant="soft"` = **0**; `rounded-full`
  ngoài nav/badge/swatch = 0; 0 `text-[10px]/[11px]`; 0 `h-screen`.

### 7.2 390 / 768 / 1440 — lý luận static

| Bề mặt | 390 | 768 | 1440 |
|---|---|---|---|
| Nav 5 tab Designer / 6 tab Lab | cuộn **trong** `nav.overflow-x-auto`, track `min-w-full`; không tràn trang | `sm:min-w-0` → track compact, đủ 5/6 tab | như 768 |
| Bảng (ấn phẩm/hàng đợi/máy in/vật liệu/sổ kho/phụ kiện) | cuộn ngang **trong** `DataTable.overflow-auto`; header/cột không tràn trang | như 390 | không cuộn, `max-w-[1400px]` |
| Kanban lab | 1 cột (`grid-cols-1`), không kéo ngang | 2 cột | 3 cột (xl) / 6 cột (2xl, ≥1536) |
| Chat Designer (requests) | **OC-1 đã sửa**: danh sách `h-72` + chat `h-[560px]`, trang cuộn dọc; header wrap | `md:h-[700px]` row: list 320 + chat flex | như md, thêm panel phải 288px |
| Wizard upload (designer) | 1 cột; step chip `max-md:min-h-11`; 3D preview `h-[280px]` | 1 cột form rộng | 12-col: preview 5 / form 7 |
| Onboarding xưởng | 1 cột; step bar chỉ icon (label `hidden sm:block`); swatch/nút xoá ≥44px | 2 cột field | `max-w-5xl`, 1 cột card |
| Payouts/overview | 1 cột, `—` cho số thiếu | 12-col grid | 12-col |

**Focus/label:** 100% control trong scope dùng `Field`+`Input/Select` (có `label htmlFor`) hoặc
`aria-label`; mọi `<button>` thêm mới/cũ đều có `focus-visible:ring-2 ring-ring`; icon-only có
`aria-label`; badge trạng thái không truyền đạt chỉ bằng màu (có chữ).

**QA W6 cần chụp/khẳng định (vì handoff không chạy browser):** (1) 390 `/designer/requests` — chat
không bị cắt, cuộn tới ô nhập được; (2) 390 `/designer/models` — bảng ấn phẩm cuộn trong khung, nút
toggle trạng thái bấm được; (3) 390 `/lab` mở Kanban — 1 cột, không tràn; (4) 390 `/lab` nút nấc 8
bước bấm được (≥44px); (5) 1440 `/designer` + `/lab` — segmented pill + active `shadow-soft`, baseline
không lệch; (6) 768 `/designer/wizard` — 3D + form không vỡ; (7) onboarding 390 — step bar chỉ icon,
không tràn; ảnh success bước 4 (VI-only).

---

## 8. Rủi ro & việc còn lại

1. **Chưa verify browser** (theo cho phép "skip live full check"): 7 mục QA ở §7.2. Nếu QA phát hiện
   lệch, mọi thứ nằm trong 8 file scope — không cần đụng shell.
2. **`shadow-soft` trong console:** đã giới hạn đúng 4 chỗ (active segmented) theo §3.6; nếu review
   thấy quá "nổi", có thể đổi về `shadow-e1` ở 1 dòng/file — nhưng sẽ lệch recipe §3.6 (foundation đã
   chốt).
3. **Màu/contrast:** không tạo màu mới; các chỗ sát ngưỡng còn lại đều ngoài scope. Trong scope:
   0 lift `fg-subtle` trên `surface-muted`.
4. **Copy:** `Kanban` giữ nguyên (xem §4.4) — nếu Lead muốn Việt hoá, sửa 1 chỗ
   `WorkshopSettingsView` (`'Kanban'`) + cập nhật UI-DEFECTS; không ảnh hưởng logic.
5. **`verified_status: Pending — chờ quản trị viên duyệt`** là chuỗi kỹ thuật **cố ý** giữ mã enum có
   chú thích VI (D4/COPY-GLOSSARY §4 D4) — không phải English lẫn; QA đừng đổi thành "Chờ duyệt" trần
   ở đúng badge này (mất ngữ cảnh "trạng thái DB").
6. **`en:` dead branches** trong các file scope (nếu còn) không bị xoá — đúng luật không mass-codemod;
   nợ dọn ở đợt code-cleanup.
7. **Không commit/push** — đúng yêu cầu; Lead/integrator tự gom diff.
8. **UI-005 Group1** phụ thuộc `admin`; nếu admin handoff chưa xong, QA chỉ đóng nửa onboarding, phần
   Group1 giữ owner `admin`.

---

## 9. Bàn giao cho W4/W5/W6

- **review-consistency (W4):** đối chiếu 3 segmented control trong scope với §3.6; xác nhận `0 soft
  card` trong console; `shadow-soft` chỉ ở active state.
- **review-a11y (W4):** focus ring các nút tab/step/stage; tap target 390; contrast các badge map nhãn
  mới; chat 390 (OC-1).
- **integrator (W5):** không có việc bắt buộc từ handoff này. Nếu chốt Việt hoá `Kanban` hoặc đổi
  `shadow-soft`→`e1` cho segmented console thì áp 1 lần cho cả 2 view.
- **qa-verify (W6):** chạy lại `lint/build/contrast/combos/ui-rules/fabricated`; chụp 7 màn ở §7.2;
  xác nhận UI-005/UI-010/UI-022 + OC-1..3; kiểm `verified_status` có chú thích VI.

---

## 10. Tóm tắt 1 dòng

Applied v3 surface (segmented/tabs/badge/table copy, VI-only, `₫`, không soft-card) to 8 files of
Designer/Lab/Onboarding; closed **UI-005 (onboarding half)**, **UI-010**, **UI-022**, D-A terms,
reduced UI-017/UI-014 in scope, fixed mobile chat clipping; gates green; no route/state/density change,
no commit.
