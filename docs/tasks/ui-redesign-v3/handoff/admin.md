<!-- doc-meta: status=active; verified=2026-10-20; owner=admin -->
# HANDOFF — W3 Admin console v3 "Soft Studio" (`admin` · task-6)

> **Trạng thái: DONE (surface-only).** Gate offline xanh; chưa chụp browser (Supabase paused —
> QA W6 xác nhận ảnh 390/768/1440). **Không commit**, không thêm dependency, không đổi route/slug/IA.
> Đọc kèm: `DESIGN-LANGUAGE.md` (v3) · `handoff/design-foundation.md` (W1) · `UI-DEFECTS.md` ·
> `COPY-GLOSSARY.md` (D-A…D-F).

---

## 1. Phạm vi & nguyên tắc

- Chỉ sửa **bề mặt** trong scope: `views/AdminDashboardView.tsx` + `components/admin/**` (9 file) +
  `components/admin/groups/**` (5/6 file; `Group4PricingEnginePanel.tsx` không cần sửa — đã VI,
  không có UI token lệch).
- **Giữ density/layout/IA**: không đổi padding dọc, chiều cao bảng, thứ tự section, nav, route,
  nhãn nav (D6). Không "airy hoá" console, không dùng `Card variant="soft"`/`shadow-soft` cho console.
- Không đụng `src/index.css`, `src/frontend/ui/**`, `src/App.tsx`, `src/backend/**`, `src/stores/**`,
  `src/utils/**`, `supabase/**`, `package.json`. Không xoá/đảo thay đổi đang dirty của wave trước.

---

## 2. Files changed (15 file code)

| File | Thay đổi chính |
|---|---|
| `views/AdminDashboardView.tsx` | Shell: `SideNav variant="pill"` + sidebar nền `bg-canvas`; breadcrumb/section title VI; avatar `AD`→`QT` |
| `components/admin/AdminSidebar.tsx` | 6 nhãn nav VI: `Đội Máy In 3D`, `Đơn Hàng & Điều Phối Trạm In`, `Sản Phẩm & Danh Mục 3D`, `Cấu Hình Trang Chủ`, `Quản Trị SEO & Thẻ Mô Tả`, `Cài Đặt Xưởng & Hệ Thống` |
| `components/admin/AdminStorefrontPanel.tsx` | UI-007 C1–C16: Landing Page CMS/Hero/Headline/Badge/Section/Banner/Storefront → VI; placeholder CMS VI; toast VI |
| `components/admin/AdminSeoPanel.tsx` | UI-007 C17–C19: `CẤU HÌNH SEO // KẾT QUẢ TÌM KIẾM & THẺ MÔ TẢ`; Meta/OG/Canonical/SERP/Robots/Sitemap labels VI; `VCUBE Việt Nam` |
| `components/admin/AdminSettingsPanel.tsx` | UI-007 C20: `CẤU HÌNH HỆ THỐNG // PHÁP LÝ`; `Hotline`→`Đường dây nóng` (label + hint + error) |
| `components/admin/AdminProductsPanel.tsx` | UI-007 C21–C22: `Thiếu Profile Slicing`→`Thiếu hồ sơ cắt lớp`; `Cần Review CAD`→`Cần duyệt CAD`; `Đang Mở Bán (Published)`→`Đang mở bán`; `File`→`Tệp`; `Catalog`→`Danh mục`; `Readiness` bỏ |
| `components/admin/PricingConfigPanel.tsx` | UI-007 C23–C26 + D-A: Duyệt tệp & cắt lớp / Tách–tỷ lệ vật liệu đỡ / Tham số cắt lớp / lô; Deburring→ba via; Brim/Raft, Purge, Nozzle, Markup→hệ số lãi, Engine→bộ tính giá; D-B hand-join `đ`→`₫` (10 chỗ) |
| `components/admin/AccessoriesManager.tsx` | `' đ'`→`' ₫'` (2); bảng `accessories`→`phụ kiện`; **UI-015**: search + category filter → `Field`+`Input`/`Select` |
| `components/admin/WarehouseInventoryPanel.tsx` | `' đ'`→`' ₫'` (7 chỗ); **UI-015**: search → `Field`+`Input` |
| `components/admin/WorkshopEstimatorBOM.tsx` | UI-007 C27 + D-A: `(Batch)`→`(lô)`; Workshop Estimator/Add-on Hardware/Nozzle/Markup VI; quote-copy `Hotline`→`Đường dây nóng` |
| `components/admin/groups/Group0OverviewPanel.tsx` | `catalog`→`danh mục` trong empty state (V3 copy; panel còn lại đã đạt) |
| `components/admin/groups/Group1WorkshopsPanel.tsx` | UI-005/UI-007 C29–C30: `Chờ duyệt (Pending)`/`Đã duyệt (Verified)`→VI; `(Workshops Hub)`/`(Fleet)`/`(Idle)`/`(Printing)` bỏ EN; filter status render nhãn VI; `Hotline:`→`Đường dây nóng:`; partner status VI |
| `components/admin/groups/Group2DesignersPanel.tsx` | UI-007 C31–C35: Top Creator→Tác giả hàng đầu; Verified Engineer→Kỹ sư đã kiểm duyệt; Creator→Tác giả; Designer→Nhà thiết kế; Royalty→Hoa hồng; Badge Tier/Min/Max VI; `verifiedStatus` render qua helper VI (không render enum thô) |
| `components/admin/groups/Group3CustomersPanel.tsx` | `Cấp quyền Designer`→`Cấp quyền nhà thiết kế`; `CAD File (NDA Standard)`→`Tệp CAD (Chuẩn NDA)`; role/KYC/account status render qua helper VI (không render enum thô) |
| `components/admin/groups/Group5ProductionPanel.tsx` | UI-021: kanban <`md` thành **danh sách nấc dọc** (desktop giữ nguyên 8 cột 2100px); `Fleet`/`Hubs`/`Geo-Dispatch`/`Infill`→VI; `[Infill]`→`Độ Đặc`; stage role display-normalize (store ngoài scope — xem §8) |

Không sửa: `Group4PricingEnginePanel.tsx` (đã VI, không token lệch), `AdminSeoPanel`/`AdminSettingsPanel`
control (đã `Field`), `src/index.css`, `src/frontend/ui/**`, `src/App.tsx`.

---

## 3. v3 surface đã áp (đúng contract §3)

| Hạng mục | Kết quả |
|---|---|
| Shell (D2) | `AppShell` + `Topbar` 56px có sẵn; **`SideNav variant="pill"`** (active `bg-surface` + `shadow-soft`, bỏ vạch dọc), sidebar nền `bg-canvas` — cùng đường đã bật cho Lab/Designer ở W1 |
| Radius | Không thêm `rounded-[Npx]`/hex/`text-[Npx]` (grep = 0). `rounded-lg` = card 20px, `rounded-xl` = panel 28px, control `rounded-md` 12px, modal dùng `rounded-modal` của primitive |
| Card | Console giữ **flat** (mặc định primitive); `shadow-soft` trong admin = **0 chỗ** (giữ hairline + e0/e1) |
| DataTable | 4 panel dùng `DataTable` (Products, Warehouse, Group1, Group2/3); density primitive giữ `h-10` header / `h-11` row (≈44–45px) |
| Form | `Field` 174 lần trong scope; các form chính (Storefront/SEO/Settings/Products/Group1/Group2) đã field-hoá. Bổ sung 3 control filter qua `Field`+`Input/Select` (AccessoriesManager, Warehouse) |
| Badge/EmptyState/Skeleton | Dùng primitive: Badge 135, EmptyState 33, Skeleton 11 (không dựng badge/empty/skeleton raw mới) |
| Tables cuộn ngang | `DataTable` có `overflow-x-auto`; 2 bảng raw trong PricingConfig nằm trong `overflow-x-auto` sẵn; kanban mobile đổi sang cột dọc |
| Modal/Sheet | 14 `<Modal>` + 5 `<ConfirmDialog>` (top-layer, focus trap, body `overflow-y-auto`) — không có overlay `fixed inset-0` tự dựng trong scope |

---

## 4. Copy — đóng UI-007 (P1) trong scope

Đã Việt hoá đúng danh sách C1–C35 của `COPY-GLOSSARY.md` + D-A/D-B/D-C/D-E. Kiểm chứng bằng grep
(chạy trong `src/frontend/components/admin` + `views/AdminDashboardView.tsx`):

```bash
# các chuỗi EN đã đóng — kỳ vọng 0 hit ở nhánh VI
grep -rn "Landing Page CMS" ...      # chỉ còn trong nhánh EN chết
grep -rn "Thiếu Profile Slicing" ... # 0
grep -rn "Chờ duyệt (Pending)" ...   # 0
grep -rn "Tách Support" ...          # 0
grep -rn "Độ Đặc (Infill)" ...       # 0
grep -rn "(Batch)" ...               # 0
grep -rn "Verified Engineer" ...     # 0 (label) — enum 'VerifiedEngineer' chỉ còn trong code/giá trị
```

- **D-A** (thuật ngữ): cắt lớp / độ đặc / vật liệu đỡ / lớp in / lô / trung tâm–đầu mối / xưởng thiết kế /
  điểm rủi ro — đã áp trong scope; giữ tên phần mềm (`Bambu Studio`) & acronym allowlist.
- **D-B** (`₫`): 0 chỗ nối tay `' đ'` còn trong scope (Warehouse 7, Accessories 2, PricingConfig 10 → `' ₫'`).
  Nhãn đơn vị ô nhập `(VNĐ)`, `VNĐ/kWh`, `₫/g` giữ như **mã tiền tệ/đơn vị** — không dòng nào in "VNĐ" + "₫" cùng lúc.
- **D-C** (`//`): eyebrow admin đều VI sau `//` (`CẤU HÌNH TRANG CHỦ // GIAO DIỆN CỬA HÀNG`,
  `CẤU HÌNH SEO // KẾT QUẢ TÌM KIẾM & THẺ MÔ TẢ`, `CẤU HÌNH HỆ THỐNG // PHÁP LÝ`).
- **D-E**: `Email` giữ (allowlist); `File`→`Tệp` trong scope.
- Nhánh `isVi ? VI : EN` (dead code vì language khoá `vi`) **không mass-codemod** theo PLAN §5.4 —
  chúng không render; nợ dọn ở đợt code-cleanup.
- Giữ có chủ đích (ghi rõ ngoại lệ): `SEO`, `SERP`, `Schema.org`, `JSON-LD`, `MES`, `KYC`, `NDA`, `RFQ`,
  `BOM`, `SKU`, `AMS`, `Kanban` (tên phương pháp), `Supabase`/`app_settings`/`printer_fleet`… (tên bảng
  chỉ đọc trong màn admin), slug mô phỏng SERP `/quote › 3d-printing`.

---

## 5. Defect register — đóng/ghi nhận trong scope

> Register do `ui-auditor` giữ; 3 agent W3 cùng đóng nên tôi **không sửa trực tiếp** `UI-DEFECTS.md`
> để tránh chồng write-scope — Lead/QA cập nhật theo bảng dưới.

| ID | Mức | Trạng thái trong scope admin | Ghi chú |
|---|---|---|---|
| **UI-007** | P1 | **ĐÓNG (admin)** | Toàn bộ C1–C35 đã VI; 0 hit chuỗi cũ ở nhánh VI. QA chụp `/admin`, `/admin/storefront`, `/admin/seo` |
| **UI-005** | P1 | **ĐÓNG phần admin** | `Group1WorkshopsPanel`: `Chờ duyệt (Pending)`/`Đã duyệt (Verified)` → VI; render enum thô đã map nhãn |
| **UI-021** | P2 | **ĐÓNG (code)** | <`md` (390/768): kanban thành **danh sách nấc dọc** `flex-col`, không `min-w-[2100px]`, không kéo ngang; ≥`md` giữ nguyên 8 cột. QA ảnh 390 |
| **UI-015** | P2 | **ĐÓNG MỘT PHẦN + ngoại lệ** | 3 control filter chuyển `Field`+`Input/Select`; raw còn lại **đều có `<label htmlFor>`/`aria-label` + focus ring** (AST check 0 control thiếu nhãn) — chi tiết §7 |
| **UI-014** | P2 | **NGOẠI LỆ có lý do** | Raw `<button>` còn lại là **segmented tab/filter, thẻ kanban, switch** (không phải action chuẩn); action chuẩn đã dùng `Button`. Chi tiết §7 |
| **UI-034** | P3 | **ĐÓNG** | Placeholder CMS: `QUY TRÌNH XƯỞNG`, `BỘ TÍNH GIÁ NHANH VCUBE // BÁO GIÁ TRỰC TIẾP`, `CAD THEO YÊU CẦU // THEO Ý TƯỞNG` |
| **UI-039** | P3 | **ĐÓNG phần admin** | 0 hand-join `' đ'`; tiền dùng `₫` (helper/format) trong Warehouse/Accessories/PricingConfig |
| **UI-040** | P2 | ngoài scope | `CanvasErrorBoundary` đã đóng ở W1c |
| **UI-020** | P2 | ngoài scope | `InvoiceModal` (commerce) + `InternalCostBreakdownModal` (tool3d) — không thuộc admin |
| **UI-017** | P2 | theo dõi | Không thêm `text-fg-subtle` trên tint/pastel/line-subtle; `check-contrast-combos` sạch |
| **UI-010** | P1 | ngoài scope | Designer panels thuộc `ops-consoles` |
| **UI-018/UI-027** | P2 | ngoài scope | Header — W2/integrator |

---

## 6. Bằng chứng density (không hồi quy)

Không đổi bất kỳ class khoảng cách/typography/density nào; diff chỉ gồm **chuỗi copy, variant SideNav,
responsive kanban <md, và 3 control filter**. Đo trên working tree:

| Chỉ số | Giá trị | Kỳ vọng |
|---|---|---|
| DataTable header / row | `h-10` (40px) / `h-11` → 44–45px (viền 1px) | giữ density §3.5 |
| `text-[10px]` / `text-[11px]` | **0** | sàn 12px |
| `shadow-soft` trong admin | **0** | console giữ hairline/e0–e1 |
| `rounded-[Npx]` / hex trong `.tsx` | **0** (ngoài `colorHex` là dữ liệu DB) | token-only |
| `tabular-nums` | **192** chỗ | số liệu bảng/KPI |
| `min-h-screen`/`h-screen` | **0** (dùng `dvh` trong primitive) | không tràn |
| KPI grid | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` giữ nguyên | không re-compose |
| Modal | 14 `Modal` + 5 `ConfirmDialog` (body scroll của primitive) | modal/sheet cuộn |

---

## 7. Ngoại lệ đã cân nhắc (ghi rõ để review W4/QA không tính là bỏ sót)

1. **`PricingConfigPanel.tsx` — 73 raw `<input>/<select>`**: giữ nguyên theo đúng chỉ đạo ("không refactor
   toàn bộ nếu rủi ro"). Mọi control có `<label htmlFor>` (hoặc `sr-only` label), `aria-invalid` +
   `aria-describedby` + `FieldError` inline, focus ring; AST check **0 control thiếu nhãn**. Chuyển toàn bộ
   sang `Field` sẽ đổi cấu trúc grid 2 cột + `mb-1.5` hiện tại (rủi ro layout/density) mà không thêm a11y.
2. **`AccessoriesManager.tsx` (18 control trong 2 modal) / `WorkshopEstimatorBOM.tsx` (8) / các panel khác**:
   cùng lý do — đã label + focus ring, form ổn định; giữ raw để không đổi density.
3. **UI-014 raw `<button>`** (tổng ~52): segmented tab/filter (`aria-pressed`), thẻ kanban, switch bật/tắt,
   chip xoá — không map 1-1 sang `Button` variant (sẽ đổi kích thước/density). Action chuẩn đã dùng `Button`.
4. **`Group5ProductionPanel` stage role**: `useProductionStore.KANBAN_STAGES[*].role` (ngoài scope) còn
   `'Sale Hub'`, `'Kỹ sư Slicing CAM'`, `'Kỹ thuật viên Farm'`. Đã **normalize hiển thị** trong panel
   (`.replace(...)`) để UI VI; **nợ integrator**: sửa gốc tại `src/stores/useProductionStore.ts`.
5. **`Group2DesignersPanel` badgeTier lạ**: tier không nằm trong 4 tier chuẩn vẫn render raw giá trị DB
   (fallback có chủ đích — không bịa nhãn cho giá trị chưa biết).
6. **Nhánh EN chết** (`isVi ? … : …`) còn trong code theo PLAN §5.4 (không mass-codemod); không render.
7. **Nhãn đơn vị `(VNĐ)`** giữ ở label ô nhập (mã tiền tệ), không phải số tiền format — không trộn `VNĐ` + `₫`.

---

## 8. Responsive 390/768/1440 — kiểm tĩnh

| Điểm | Kết quả |
|---|---|
| 390 — page overflow | `AppShell` main `min-w-0` + `px-4`; không còn `min-w-[2100px]` áp ở mobile (chỉ `md:`); skeleton kanban `flex-col` <md; bảng qua `DataTable`/`overflow-x-auto`; tab strips `overflow-x-auto` |
| 390 — sidebar | `AppShell` dùng `Sheet` drawer (<`lg`) + `SideNav` pill; `Html` scroll đã có từ W1 (UI-002) |
| 768 | KPI grid `sm:grid-cols-3`, filter bars `md:flex-row` (không đổi); kanban còn cột dọc (<`md`? 768 = `md` → kanban ngang cuộn trong khung, không tràn page) |
| 1440 | `max-w-[1400px]` + px-8; breadcrumb `truncate`; Topbar action wrap-safe |
| Focus/labels | AST check toàn scope: **0** control thiếu label/id/aria-label; `check-ui-rules` PASS (0 focus-no-ring) |
| `verify-in-browser` (QA W6) | `/admin/queue` 390 (kanban dọc), `/admin/warehouse` 390 (filter mới), `/admin/storefront` + `/admin/seo` (copy), `/admin/products` (select status), `/admin/designers` 390, `/admin/partners` 390 |

---

## 9. Gate (offline, 2026-10-20 — working tree hiện tại, không commit)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (tsc --noEmit, 0 lỗi) |
| Build | `npm run build` | **PASS** (`✓ built in 5.67s`) |
| Contrast token | `node scripts/check-contrast.mjs` | **56/70 pass · 14 expected non-pass · 0 unexpected fail** |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **rc=0** — 99 file `.tsx`, 14 luật, 0 tổ hợp fail; near-miss 4.56:1 còn ở file ngoài scope (UI-017 theo dõi) |
| UI rules | `node scripts/check-ui-rules.mjs` | **PASS** — 139 file, 0 vi phạm mới |
| Fabricated | `node scripts/check-fabricated.mjs` | **SẠCH** — 139 file, 0 tuyên bố bịa |
| Icon names | `node scripts/check-icon-names.mjs` | **PASS** — 138 file, 224 glyph |
| Scan VI (AST) | script tạm (dead EN branch bị loại) | 0 chuỗi EN hiển thị ngoài allowlist trong scope (chỉ còn enum/DB value/code identifier) |

> `npm run check` full (live Supabase) **không chạy** theo đúng cho phép của task (live gate có thể treo/DNS).

---

## 10. Rủi ro & việc còn lại

1. **Chưa có ảnh browser** (Supabase paused): QA W6 cần xác nhận danh sách `verify-in-browser` §8 —
   đặc biệt kanban 390 (UI-021) và SideNav pill ở drawer mobile.
2. **`SideNav variant="pill"`** đổi nhận diện nav admin (pill trắng + `bg-canvas`); nếu Lead muốn giữ
   tint v2 thì chỉ cần bỏ 1 prop + trả `bg-canvas`→`bg-surface` ở `AdminDashboardView`.
3. **Store kanban role** còn EN gốc (§7.4) — integrator xử lý `useProductionStore`.
4. **UI-015 nợ kỹ thuật** ở PricingConfig/Accessories/BOM (raw nhưng đã label) — nếu muốn 100% `Field`,
   cần task riêng vì đổi cấu trúc form lớn.
5. **Register** (`UI-DEFECTS.md`) chưa cập nhật trực tiếp — Lead/QA đối chiếu bảng §5.
6. Không commit/push; các thay đổi nằm trong working tree cùng phần dirty của các wave trước.

---

## 11. SHELL-REQUEST

**Không có.** Toàn bộ shell dùng primitive sẵn có (`AppShell`/`SideNav variant="pill"`/`Topbar`);
không cần sửa `src/App.tsx`, `Header.tsx`, `src/index.css`, `src/frontend/ui/**`.
