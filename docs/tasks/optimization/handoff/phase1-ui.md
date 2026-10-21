<!-- doc-meta: status=active; verified=2026-10-21; owner=design-foundation -->
# HANDOFF — Phase 1 (UI group): dead-code removal

> **Work item:** `task-19` · **Agent:** `design-foundation` · **Ngày:** 2026-10-21
> **Trạng thái:** DONE (một phần D05–D07 **defer** vì precondition grep của audit không đúng —
> xem §3). Không commit/push. Không sửa `App.tsx`, views, backend, `package.json`.
> Đọc kèm: `docs/tasks/optimization/DEAD-CODE.md`, `AUDIT.md` §5.

---

## 1. Đã xoá / sửa

### 1.1 Primitive chết (D08/D09/D10 + D16)

| File | LOC xoá | Bằng chứng trước khi xoá |
|---|---:|---|
| `src/frontend/ui/Section.tsx` | 117 | 0 importer (grep import line + JSX + barrel); chỉ `ui/index.ts` re-export |
| `src/frontend/ui/Toolbar.tsx` | 87 | 0 importer |
| `src/frontend/ui/ToastViewport.tsx` | 297 | 0 importer; chỉ còn 1 comment tham chiếu trong `stores/useUIStore.ts:40` |
| **Tổng** | **501** | |

- `src/frontend/ui/index.ts`: xoá 3 dòng `export * from './Section' | './Toolbar' | './ToastViewport'`
  (28 → 25 export dòng). 26 primitive còn lại.
- Grep sau xoá: `\b(Section|Toolbar|ToastViewport)\b` dạng import/JSX/barrel trong `src/`
  = **0** (chỉ còn chữ "Section" trong comment/hero-section — không phải symbol).

### 1.2 iconMap — prune 18 glyph 0-reference (D15)

`src/frontend/ui/iconMap.ts`: xoá **18 key** + **12 lucide import** đi kèm (516 → 486 LOC; 224 → **206 glyph**):

```
arrow_upward, call_split, celebration, event, hexagon, home_repair_service, hourglass_top,
location_on, navigate_next, pending_actions, price_check, production_quantity_limits,
rocket_launch, route, science, security, shield_person, warehouse
```

Bằng chứng (0 reference cho **từng** glyph, trước khi xoá):
- grep literal có quote (`'glyph'` / `"glyph"` / `` `glyph` ``) trên `src/`, `supabase/`, `scripts/`, `tests/`, `index.html` → **0** mỗi glyph.
- `scripts/check-icon-names.mjs` (soi `<Icon name=…>`, ternary chuỗi, field `icon:`/`iconName:`/`glyph:`) → PASS sau prune: **206 glyph**, 131 file.
- Dynamic data-check: mọi field `.icon`/`.iconName` render qua `<Icon name={…}>` đều là literal trong `src/` (Header navItems, Home categories, OrderProgress stages, QuoteSummaryPanel styles, ServiceShowcaseSection…). Không có nguồn DB/JSON nào chứa 18 tên trên (`supabase/**` grep = 0).
- 12 lucide import bị bỏ vì không còn consumer: `ArrowUp, BadgeDollarSign, Calendar, ClipboardList, FlaskConical, Hammer, Hexagon, PackageX, PartyPopper, Rocket, Route, Split`. 6 import còn dùng bởi glyph khác giữ nguyên: `Hourglass, MapPin, ChevronRight, ShieldCheck, ShieldUser, Warehouse`.
- Đồng bộ doc: `docs/design/icon-map.md` cập nhật **224 → 206 glyph** + note PRUNE 2026-10-21 (bảng mapping cũ giữ lịch sử để tra cứu).

### 1.3 Mock constants (D11a–D11f)

`src/data/mockData.ts` (347 → 311 dòng): xoá **6 constant + comment rationale + 6 type import**:

| Constant | Ref ngoài file |
|---|---|
| `CUSTOM_REQUESTS` | 0 |
| `MODERATION_PRODUCTS` | 0 |
| `DESIGNER_APPLICATIONS` | 0 |
| `DISPUTES_LIST` | 0 |
| `DMCA_REPORTS` | 0 |
| `MOCK_FINANCIAL_SPLITS` | 0 |

- Bỏ 6 type import không còn dùng: `CustomDesignRequest, ModerationProductItem, DesignerApplication, DisputeRecord, DMCAReport, OrderFinancialSplit`.
- **Giữ nguyên** mọi constant còn import thật: `DEFAULT_SITE_CONTENT`, `CATEGORIES`, `POPULAR_TAGS`, `MATERIALS_CATALOG`, `PRINTER_PROFILES`, `PRODUCTS`, `INKIRI_REFERENCE_VALUES`, `DEFAULT_INKIRI_FORMULA_CONFIG`, `PAYLOAD_TRANSACTIONS` (`DesignerPayoutsTab`), `SAMPLE_ANALYSIS_FILES`, `DEFAULT_ACCESSORIES`, `WORKSHOP_PARTNERS`, `MOCK_APP_USERS`… (đúng chỉ đạo "leave imported empty constants").

---

## 2. Gate (sau khi hoàn tất, 2026-10-21)

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** (tsc --noEmit, rc=0) |
| `npm run build` | **PASS** (rc=0, `✓ built in 6.39s`; index 892.82K / 240.15K gzip — giảm nhẹ) |
| `node scripts/check-icon-names.mjs` | **PASS** — 131 file, **206 glyph** |
| `check-ui-rules` | PASS |
| `check-fabricated` | SẠCH (0 tuyên bố bịa) |
| `check-contrast` / `check-contrast-combos` | rc=0 (không đổi ledger) |
| `check-error-handling` | PASS (R1/R2=0, R3 trong budget) |

**Grep bằng chứng sau xoá:** primitive refs = **0** · 18 glyph literal = **0** · 6 mock constant = **0**.
**Không staged/commit.** `git status` của nhóm này chỉ còn: 3 file `D` primitive + `M ui/index.ts`,
`M iconMap.ts`, `M src/data/mockData.ts`, `M docs/design/icon-map.md`.

---

## 3. DEVIATION quan trọng — D05/D06/D07 **KHÔNG xoá được** (audit ghi sai)

`DEAD-CODE.md` §1 ghi 3 shim "0 importer ⇒ xoá an toàn". **Sai**: chúng là cầu nối tương đối
đang được dùng thật (grep `0 importer` của audit nhiều khả năng chỉ tìm alias `@frontend/*`,
không tính import tương đối `../types`).

| Shim | Importer thật | Ví dụ |
|---|---:|---|
| `src/frontend/utils/pricingEngine.ts` | **2** | `components/admin/WorkshopEstimatorBOM.tsx:3`, `components/tool3d/QuoteSummaryPanel.tsx:9` (`'../../utils/pricingEngine'` từ depth-3 = `src/frontend/utils/`, **không phải** `src/utils/`) |
| `src/frontend/types/index.ts` | **11** | `components/{AuthModal,Header,InvoiceModal,RoleGuard}.tsx`, `views/{AdminDashboard,AssetLibrary,DesignerDashboard,Explore,Home,MyOrders,OrderTracking,Tool3D}View.tsx` (`'../types'`) |
| `src/frontend/data/mockData.ts` | **3** | `views/{Home,Explore,Tool3D}View.tsx` (`'../data/mockData'`) |

Xử lý trong task này:
1. Đã thử xoá → `lint/build` đỏ đúng như cảnh báo của `commerce-auth` (2 lỗi
   `TS2307 ../../utils/pricingEngine`).
2. **Rollback cả 3 shim** bằng `git checkout --` (byte-identical HEAD, hiện diện đầy đủ);
   xác nhận lại `lint`/`build` rc=0. `commerce-auth` đã được báo.
3. **Không xoá** vì muốn xoá phải sửa 16 import trong `views/**` + `components/**` —
   ngoài write-scope của W1 và đang bị W2 giữ (task-3/4/5).

**Đề xuất (phase sau, cần Lead điều phối):** codemod 16 import trỏ thẳng `../../types` /
`../../data/mockData` / `../../utils/pricingEngine` (hoặc alias `@/*` → `src/*`) **rồi** xoá 3 shim
+ 0 re-export trong `ui/index.ts` (hiện `ui/index.ts` **không** có re-export nào của shim —
`DEAD-CODE.md` D05–D07 ghi "3 dòng re-export tương ứng" là không đúng với code hiện tại).
Ước tính: 16 dòng import + 3 file xoá, rủi ro thấp nhưng phải làm cùng lúc.

**Cần sửa tài liệu:** `DEAD-CODE.md` §1 (D05–D07 → `⏸ defer, 16 importer`) và §9 thứ tự xoá
(cụm A không còn D05–D07). W1 không sửa `DEAD-CODE.md`/`PLAN.md` của phase này để tránh
chồng write-scope với các agent phase khác.

---

## 4. Rủi ro / lưu ý

1. **Transient breakage:** trong khoảng ~2 phút khi thử xoá shim, `lint` toàn repo đỏ
   (`TS2307`). Đã rollback; hiện xanh. Bất kỳ agent nào lint trong cửa sổ đó cần chạy lại.
2. **`iconMap` prune không được gate tự kiểm so với doc** — đã tự cập nhật `docs/design/icon-map.md`
   (224→206 + note). Nếu ai thêm glyph sau này phải sửa cả hai nơi (đúng luật file đó).
3. **`src/frontend/{data,types,utils}` dirs được giữ** (chứa shim còn sống). Đừng xoá theo
   `DEAD-CODE` cho tới khi codemod §3 xong.
4. **Không có thay đổi runtime/hành vi**: chỉ xoá symbol 0-reference + export chết; build size
   giảm nhẹ; contrast/UI rules không đổi.
5. **Docs tham chiếu file đã xoá:** `DEAD-CODE.md` còn liệt kê `Section/Toolbar/ToastViewport`
   → `check-doc-refs` advisory có thể báo path chết cho tới khi phase docs cập nhật; không chặn gate.

---

## 5. File đã chạm (đúng scope task-19)

```
D  src/frontend/ui/Section.tsx
D  src/frontend/ui/Toolbar.tsx
D  src/frontend/ui/ToastViewport.tsx
M  src/frontend/ui/index.ts          (-3 export, 28→25)
M  src/frontend/ui/iconMap.ts        (-18 key, -12 import; 224→206 glyph)
M  src/data/mockData.ts              (-6 constant, -6 import; 347→311 dòng)
M  docs/design/icon-map.md           (đồng bộ 224→206 + note prune)
+  docs/tasks/optimization/handoff/phase1-ui.md (file này)
```

Không sửa: `src/App.tsx`, `src/frontend/views/**`, `src/backend/**`, `package.json`,
`vite.config.ts`, `supabase/**`, `src/frontend/{data,types,utils}/**` (shim giữ nguyên).
