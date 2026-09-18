# Design-System Debt Cleanup — Kế hoạch thi công

> **Trạng thái**: ✅ DONE — đã thi công & kiểm chứng (2026-09-18). Xem §8.
> **Mục tiêu**: đưa `debt` design-system về **0** (hiện 63 điểm) trước khi làm tiếp các đợt refactor UI khác.
> **Nguồn đo**: `node scripts/loop-audit.mjs` (`.loop/latest.json`, iteration 2) + `scripts/check-ui-rules.mjs`.
> **Bất biến**: Be Vietnam Pro + JetBrains Mono, lucide + `iconMap`, light-first, data-honesty
> (`check-fabricated`), token-only, không thêm dependency, không GSAP.

---

## 0. Chốt với chủ dự án

| Quyết định | Giá trị |
|---|---|
| Phạm vi đợt này | Dọn **sạch 63 điểm** nợ design-system (2 luật) trước |
| Định dạng tiền | `formatCurrency` (`₫`) — một nguồn `src/frontend/lib/format.ts` |
| Commit | **Không** tự commit/push trừ khi chủ dự án yêu cầu |

---

## 1. Review hiện trạng

- `main` @ `e84a4c9`, cây làm việc sạch; có **2 commit local chưa push**: `5f85155`, `e84a4c9`.
- Loop audit gần nhất: `score = 638` (giảm từ 818.4), `gatesPass = 9/9`, lint PASS, build PASS,
  `newViolations = 0`.
- Nợ còn lại đúng **2 luật**: `focus-no-ring = 35`, `unguarded-tolocale = 28`.
  `control-border-line` và `infinite-animation` đã về 0.
- Phần refactor UI còn lại (modal/`<dialog>`, storefront polish, storage service, data-honesty,
  dep chết, C5) vẫn nằm ở `docs/tasks/UI-REFACTOR-NEXT-STEPS.md` §2 — **đợt sau**.

---

## 2. P1 — `unguarded-tolocale` (28 điểm)

**Nguyên tắc**: thay `toLocaleString` bằng helper đã guard NaN trong `src/frontend/lib/format.ts`
(`EMPTY_VALUE = '—'`). Tiền dùng `formatCurrency`; số đếm dùng `formatNumber`; khối lượng dùng
`formatWeight`; bảng có thể dùng `<Money>`.

| File | Dòng | Xử lý |
|---|---:|---|
| `src/frontend/components/admin/WorkshopEstimatorBOM.tsx` | 20 | helper `money()` → `formatCurrency` |
| `src/frontend/components/designer/DesignerModelsManagerTab.tsx` | 568, 574 | tiền → `formatCurrency` (hoặc `<Money>`) |
| `src/frontend/components/designer/DesignerOverviewTab.tsx` | 71, 86, 99 | 71 tiền → `formatCurrency`; 86/99 đếm → `formatNumber` |
| `src/frontend/components/designer/DesignerPayoutsTab.tsx` | 36, 58 | tiền → `formatCurrency` / `<Money>` |
| `src/frontend/components/designer/DesignerRequestsTab.tsx` | 152, 295 | tiền trong toast/quote → `formatCurrency` |
| `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx` | 939, 998, 1219, 1243, 1254 | 939/998/1243 tiền → `formatCurrency`; 1219/1254 gram → `formatWeight`/`formatNumber` |
| `src/frontend/components/tool3d/ObjectTreePanel.tsx` | 305 | đếm tam giác → `formatNumber` |
| `src/frontend/components/tool3d/QuoteSummaryPanel.tsx` | 426 | khoảng tiền → `formatCurrency` |
| `src/frontend/components/tool3d/ValidationReportPanel.tsx` | 302 | đếm tam giác → `formatNumber` |
| `src/frontend/views/ExploreView.tsx` | 460, 478, 479, 729 | khoảng giá → `formatCurrency` |
| `src/frontend/views/PersonalizeView.tsx` | 948, 950 | `đ/g`, `đ/kg` → `formatCurrency(...)}/g` |
| `src/frontend/views/Tool3DView.tsx` | 544, 1140, 1795 | đếm tam giác → `formatNumber` |
| `src/utils/pricingEngine.ts` | 694 | guard inline `Number.isFinite(...) ? … : '—'` (**không** import frontend lib vào `utils`) |

**Lưu ý**
- Các helper nội bộ như `isNum` / `isTriNum` / `isConfiguredNumber` vẫn bị gate gắn cờ vì regex không
  nhận diện — nên thay hẳn bằng helper `format`.
- Giữ đúng nhánh thiếu dữ liệu: `null`/`NaN` ⇒ `—`, tuyệt đối không bịa `0`.
- `formatCurrency` trả `₫` (khác ` đ` hiện tại) — đây là chủ đích đã chốt để đồng nhất một nguồn.

---

## 3. P2 — `focus-no-ring` (35 điểm)

**Nguyên tắc**: thêm `focus-visible:ring-2 focus-visible:ring-ring` vào control đang có
`focus:outline-none` (giữ `focus:border-primary` nếu đang có).

| File | Dòng |
|---|---:|
| `src/frontend/components/CadQuickViewModal.tsx` | 386 |
| `src/frontend/components/ChatSupportModal.tsx` | 113 |
| `src/frontend/components/Header.tsx` | 251, 358 |
| `src/frontend/components/designer/DesignerRequestsTab.tsx` | 246, 320 |
| `src/frontend/components/designer/DesignerUploadWizardTab.tsx` | 304, 315, 334, 444, 465 |
| `src/frontend/components/tool3d/QuoteSummaryPanel.tsx` | 445, 463, 519, 536 |
| `src/frontend/views/AssetLibraryView.tsx` | 105 |
| `src/frontend/views/ExploreView.tsx` | 609, 840 |
| `src/frontend/views/HomeView.tsx` | 665 |
| `src/frontend/views/MyOrdersView.tsx` | 408, 426, 440 |
| `src/frontend/views/OrderTrackingView.tsx` | 182, 197, 340, 354 |
| `src/frontend/views/PersonalizeView.tsx` | 588, 653, 669 |
| `src/frontend/views/ProductDetailView.tsx` | 825, 848 |
| `src/frontend/views/Tool3DView.tsx` | 1228, 1252, 1309, 1330 |

---

## 4. P3 — Dọn allowlist

Trong `scripts/check-ui-rules.mjs`, xoá toàn bộ entry `focus-no-ring` và `unguarded-tolocale`
khi count của chúng đã về 0 (allowlist rỗng). Đây là bước biến "nợ được tha" thành "hết nợ" thật.

---

## 5. P4 — Verify (Definition of Done)

```bash
node scripts/check-ui-rules.mjs        # kỳ vọng: focus-no-ring=0 unguarded-tolocale=0, allowlist rỗng → PASS
npm run lint
npm run build
node scripts/check-fabricated.mjs
node scripts/check-contrast.mjs
node scripts/check-contrast-combos.mjs
node scripts/check-icon-names.mjs
node scripts/check-unitprice-multiplier.mjs
node scripts/lint-rls-sources.mjs
node scripts/lint-rls-migration.mjs
node scripts/a8-sql-syntax-check.mjs
node scripts/loop-audit.mjs --quick    # kỳ vọng: debt=0 · score ≈ 8 · improved=true · gatesFailed=0
```

- **Browser spot-check** (Playwright MCP): Tab qua vài control ở `/quote`, `/designer`, `/admin`
  thấy focus ring; các màn designer/admin hiện `—` thay vì `NaN đ`.
- **Không hồi quy**: mọi gate xanh, `newViolations = 0`.

---

## 6. Rủi ro & rollback

| Rủi ro | Giảm thiểu |
|---|---|
| Đổi `đ` → `₫` lệch thị giác | Đã chốt chủ đích; kiểm nhanh vài màn trước khi báo xong |
| Import frontend lib vào `utils` (layering) | `pricingEngine.ts` chỉ dùng guard inline |
| Sửa lan sang logic tính giá | Chỉ đổi chuỗi hiển thị / className; không đổi nhánh tính toán |
| Hạ budget khi count chưa về 0 | Chạy `check-ui-rules` sau từng nhóm file |

**Rollback**: hoàn nguyên các file đã sửa (git), không đụng migration/DB.

---

## 7. Đợt sau (không thuộc phạm vi file này)

Theo `docs/tasks/UI-REFACTOR-NEXT-STEPS.md` §2:
1. Modal còn lại → `<dialog>`: `AuthModal` (shell-only), `ChatSupportModal`, `CartDrawer`
   (`placement="right"`).
2. Storefront: `content-visibility` cho list dài; i18n nốt Home/Explore; **hero fit viewport
   cần chủ dự án duyệt trước**.
3. `AssetLibraryView` → tách `createSignedUrl` vào backend service.
4. Lab: dùng `ConfirmDialog` cho thao tác xoá.
5. Data-honesty: bỏ ảnh Unsplash bịa (`SEOHead.tsx:15`, `QuoteSummaryPanel.tsx:252`);
   `ObjectTreePanel` đọc `materials` thật từ DB.
6. Dọn dep chết `@supabase/ssr`, `@google/genai` (cần duyệt).
7. C5 verify 390/768/1440.

---

## 8. Kết quả thi công (2026-09-18)

Chia 3 subagent song song theo bề mặt (mỗi file một owner), sau đó orchestrator dọn allowlist + verify.

| Hạng mục | Trước | Sau |
|---|---:|---:|
| `focus-no-ring` | 35 | **0** |
| `unguarded-tolocale` | 28 | **0** |
| Allowlist trong `check-ui-rules.mjs` | 28 entry | **rỗng** |
| `loop-audit` score | 638 | **58.4** (chỉ còn `ts-ignore`/TODO/dist) |
| `debt` | 63 | **0** |
| `newViolations` | 0 | 0 |

**Nhóm thi công**
- Subagent A (storefront): `ExploreView`, `HomeView`, `ProductDetailView`, `PersonalizeView`, `AssetLibraryView`, `Header`.
- Subagent B (transaction/quote): `MyOrdersView`, `OrderTrackingView`, `Tool3DView`, `QuoteSummaryPanel`, `ObjectTreePanel`, `ValidationReportPanel`, `CadQuickViewModal`, `ChatSupportModal`.
- Subagent C (designer/onboarding/utils): `DesignerRequestsTab`, `DesignerUploadWizardTab`, `DesignerModelsManagerTab`, `DesignerOverviewTab`, `DesignerPayoutsTab`, `WorkshopOnboardingWizard`, `WorkshopEstimatorBOM`, `pricingEngine`.

**Gate đã chạy**
- `check-ui-rules` PASS (baseline: counts rỗng) · 8 gate còn lại PASS.
- `npm run lint` PASS · `npm run build` PASS.
- `node scripts/loop-audit.mjs` → `gates 9/9`, `lint PASS`, `build PASS`, `debt 0`, `newViolations 0`, `improved=true`.

**Đã commit**: `10788b5` (`refactor(ui): clear design-system debt (focus rings + guarded formatting)`).

---

## 9. Kiểm thử toàn bộ luồng web (2026-09-18)

Chạy Playwright (Chromium bundled) headless với `LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu`,
script `/tmp/opencode/pwtest/all-flows.mjs` (ngoài repo). **183/183 PASS.**

Phạm vi:
- **Route sweep** 9 route công khai + PDP tại 390/768/1440: HTTP 200, không tràn ngang, có nội dung,
  không có `NaN`/`Invalid Date`/`undefined`, console sạch.
- **Guard** `/admin /designer /orders /assets /lab` → chuyển `/auth/login` khi chưa đăng nhập.
- **Tương tác**: search + sort `/explore`; focus ring trên search (box-shadow thật).
- **Giỏ/checkout**: giỏ rỗng có empty-state thật; `/checkout` không tạo đơn khi giỏ rỗng.
- **Tracking**: tra mã sai → không crash/NaN.
- **PDP**: thêm vào giỏ → `/cart` render.
- **Auth**: login sai bị từ chối + hiện lỗi; login admin thật OK.
- **Console đã đăng nhập**: `/admin`, `/designer`, `/lab`, `/orders`, `/assets` render, console sạch.
- **FAB** hiện trên mobile 390.

**Phát hiện (không chặn, dev-only)**: React cảnh báo `unique "key" prop` từ **lucide-react v0.546.0** —
`node_modules/lucide-react/dist/esm/Icon.js` render `iconNode.map(...)` không gắn `key` (forwardRef ẩn danh
→ owner `ForwardRef`). Xác định bằng DevTools-hook fiber walk. Chỉ xuất hiện ở dev, bị strip ở production;
không ảnh hưởng runtime. Cách sửa triệt để (nếu muốn): nâng `lucide-react` lên bản mới hơn — **cần duyệt
vì là thay đổi dependency**.

**MCP Playwright**: Chrome hệ thống không có (`/opt/google/chrome/chrome`) và `/opt` không ghi được.
Đã cập nhật `~/.config/opencode/opencode.jsonc` trỏ MCP sang Chromium bundled:
`--executable-path ~/.cache/ms-playwright/chromium-1244/chrome-linux64/chrome` + giữ `LD_LIBRARY_PATH`.
**Cần khởi động lại opencode** để MCP nạp config mới.

Dev server đang chạy tại `http://localhost:3000`.

