# 07 — Kế hoạch thi công theo phase (phân việc subagent, gate, rollback)

Đây là tài liệu điều phối. Nội dung phân tích nằm ở `01`–`06`; tài liệu này chốt **ai làm gì, theo thứ tự nào, kiểm bằng gì**.

---

## 1. Nguyên tắc bắt buộc

1. **Một người viết cho mỗi file trong mỗi phase.** Các file dùng chung `src/App.tsx`, `src/index.css`, `src/types/index.ts`, `src/frontend/ui/**` chỉ có **một** owner tại một thời điểm; phase khác phải chờ.
2. **Refactor tách khỏi feature.** Xoá dead code không trộn với đổi UI. Mỗi phase = 1 nhánh commit, revert độc lập.
3. **Gate sau mỗi bước:** `npm run lint` → `npm run build`. Dừng ở lỗi đầu tiên, không đi tiếp.
   Gate theo loại việc: SQL/policy → `node scripts/lint-rls-sources.mjs` + `node scripts/lint-rls-migration.mjs`; theme/token → `node scripts/check-contrast.mjs`; sau thay đổi RLS → `node scripts/verify-rls.mjs --writes`; kiểm DB → `node scripts/inspect-db.mjs`.
4. **Không tự `git commit`/`git push`.** Kết thúc mỗi phase, báo cáo diff + kết quả gate để người dùng quyết định.
5. **Không sửa công thức pricing / schema trong bước dọn dẹp.** Việc DB nằm riêng (Phase 7 — RLS đã xong), mỗi file migration là 1 transaction độc lập, không tạo file chồng lấn (xem `AGENTS.md`).
6. **Giữ split `src/backend` / `src/frontend`**; truy cập DB chỉ qua `src/backend/supabase/*`.
7. **Mỗi phase phải chứng minh hành vi:** dùng script trong `scripts/` hoặc checklist `docs/design/qa-checklist.md`. Không có bằng chứng = chưa xong.
8. **Không thêm dependency** trừ khi được duyệt riêng (ví dụ Vitest). Test hành vi bằng `npx tsx` như `scripts/test-catalog-sync.ts`.

---

## 2. Phân việc subagent

| Agent | Vai trò | Sở hữu file | Phase |
|---|---|---|---|
| **A0 — Docs, Baseline & Verifier** | Viết/chốt tài liệu, đo baseline, viết script đặc tả, nghiệm thu độc lập (không implement) | `docs/**`, `scripts/*` | 0, 9 |
| **A1 — Deletion & Hygiene** | Xoá dead code, port CRUD cần giữ, sửa barrel/alias/tsconfig | `src/app/**`, `src/ai/**`, shims, `tsconfig.json`, `src/backend/index.ts` | 1 |
| **A2 — Design System (blocking)** | Token `@theme`, theme switch, primitives, contrast gate, i18n foundation | `src/index.css`, `index.html`, `src/frontend/ui/**`, `src/frontend/lib/format.ts`, `src/frontend/theme/tokens.ts` | 2 |
| **A3 — Funnel Correctness** | Sửa bug logic cart/checkout/orders/auth (chạy song song A2 được, logic-only) | `CartView`, `CartDrawer`, `CheckoutView`, `OrderSuccessView`, `OrderTrackingView`, `MyOrdersView`, `AssetLibraryView`, `LoginView`, `RegisterView`, `AuthModal`, `RoleGuard`, `AuthContext`, `App.tsx` | 3 |
| **A4 — Storefront UI** | Home/Explore/ProductDetail/Personalize + Instant Quote Widget | `HomeView`, `ExploreView`, `ProductDetailView`, `PersonalizeView`, `Header`, `MaterialComparisonMatrix`, `CadQuickViewModal`, `SEOHead`, `HorizontalScrollFilter`, footer | 4 |
| **A5 — Quote Tool & 3D Engine** | `/quote` toàn bộ: lifecycle, hiệu năng, minh bạch, giá, mobile | `Tool3DView`, `ModelViewer3D`, `tool3d/*`, `personalize/PersonalizeModelViewer3D`, `ThreeModelViewer`, `utils/meshParser.ts`, `workers/cadParser.worker.ts`, `utils/pricingEngine.ts`, `QuoteSummaryPanel` | 5 |
| **A6 — Admin Shell & Data UI** | IA, primitives admin, DataTable, thay alert, loading/error, tiền tệ | `src/frontend/components/admin/**`, `AdminDashboardView`, `DesignerDashboardView` | 6 |
| **A7 — Lab & Data Wiring** | Route `/lab`, tách 2 view lớn, nối mock store → `workshopService` | `WorkshopSettingsView`, `WorkshopOnboardingWizard`, `src/stores/**`, `src/backend/services/workshopService.ts` | 6 (song song A6, file không trùng) |
| **A8 — Data & Security** | Migration: schema/RLS/storage/realtime; bỏ secret client | `supabase/**`, `database.ts`, `seedService.ts`, `backend/supabase/mappers.ts` (mới), `vite.config.ts` | 7 |
| **A9 — Perf & Bundle** | Code-split, lazy modals, ảnh, gỡ suppression | `App.tsx` (lazy route), `vite.config.ts`, `main.tsx`, sweep `<img>` | 8 |

**Ràng buộc song song**
- A1 chạy ngay, độc lập.
- A3 chạy song song A2 (khác file; A3 chỉ sửa logic, không đụng `index.css`/`ui/**`).
- A4 **và** A5 không chạy cùng lúc phần `QuoteSummaryPanel`/`MaterialComparisonMatrix`: A5 sở hữu `QuoteSummaryPanel`; A4 chỉ đọc qua props.
- A6 và A7 chạy song song (file không trùng); cả hai chờ A2 xong.
- A8 chạy sau A3 (vì A3 đổi `AuthContext`/`CheckoutView` liên quan tới role & payment state) và có thể song song A4/A5/A6.
- A9 chạy **sau cùng** vì nó chạm `App.tsx` và toàn bộ `<img>`.

---

## 3. Baseline hiện tại (đo ngày chốt tài liệu)

| Gate | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS**, exit 0 |
| `npm run build` (`vite build`) | **PASS**, 187 modules, 2.66s |
| Dev server | `http://localhost:3000` → HTTP 200 |

Bundle (đo từ `dist/`, không commit — `.gitignore` đã loại):

| Chunk | Thô | Gzip |
|---|---|---|
| `index.js` | 717.35 KB | **188.65 KB** |
| `three-vendor.js` | 531.66 KB | **133.90 KB** |
| `supabase-vendor.js` | 221.01 KB | 57.80 KB |
| `Tool3DView.js` (lazy) | 311.01 KB | 89.65 KB |
| CSS | 148.65 KB | **22.60 KB** |
| `react-vendor.js` | 51.52 KB | 18.21 KB |
| `Group4PricingEnginePanel.js` | 113.60 KB | 20.37 KB |
| **Critical path** (`index` + `three` + `supabase` + `react` + CSS) | — | **≈421 KB gzip** |

Chi tiết + số liệu sửa được ở `docs/plans/baseline.md`.

---

## 4. Các phase

### Phase 0 — Tài liệu, baseline, lưới an toàn — **A0** — ✅ ĐÃ XONG
- **Deliverable:** `docs/plans/00..07`, `docs/design/{tokens,icon-map,qa-checklist,data-honesty}.md`, `docs/plans/baseline.md`, `scripts/check-contrast.mjs`.
- **Gate:** 5 tài liệu chính tồn tại; `node scripts/check-contrast.mjs` chạy được.
- **Xong khi:** người dùng duyệt nội dung và thứ tự phase.

### Phase 1 — Xoá dead code & hygiene — **A1**
Quy mô: **~13.087 LOC** (22% repo). Thứ tự bắt buộc:
1. **Port trước khi xoá:** `dbService.getWorkshopPartners/saveWorkshopPartner` từ `AdminPartnersPanel.tsx:50,84,104,140` → `Group1WorkshopsPanel`; KYC approve/reject từ `AdminUsersPanel` → `Group3CustomersPanel`.
2. Xoá `src/app/**` (2.338), `src/backend/supabase/{server,middleware}.ts` (114), `src/ai/**` + `hooks/useAI.ts` (360), `src/frontend/index.ts`, 5 shim 1-dòng, 6 shim `src/frontend/stores/*` (**kèm 5 repoint**: `Group0OverviewPanel:2,3`, `Group5ProductionPanel:8`, `App.tsx:59,60`).
3. Xoá chain pricing chết (1.750 LOC): `InstantQuoteWidget`, `usePricingEngineStore`, `pricingEngineService`, `quoteVerifier` → xoá luôn HMAC secret trong client.
4. Xoá 8 admin panel chết (3.969) sau bước 1.
5. Xoá 3 view chết: `CustomerSettingsView`, `DesignerSettingsView`, `DesignerRegisterView`. **Giữ** `WorkshopSettingsView` + `WorkshopOnboardingWizard` cho Phase 6.
6. **Barrel leak:** `AdminDashboardView.tsx:14` → import trực tiếp `../../backend/supabase/seedService`; bỏ 3 re-export chết khỏi `src/backend/index.ts`. Kỳ vọng: hết warning `crypto`, −1.900 LOC khỏi graph browser.
7. `tsconfig.json`: xoá 4 entry `exclude` vô nghĩa + entry `middleware.ts` không tồn tại (chỉ xoá **sau** khi xoá file); bỏ alias `@/*` trùng nghĩa; xoá `next.config.ts.bak`.
8. Gộp 2 bản `disposeHierarchy` → `src/frontend/three/dispose.ts`.
9. **Gate:** lint + build; `grep` xác nhận 0 import trỏ file đã xoá; so `dist` trước/sau.
- **Rollback:** mỗi nhóm xoá là 1 commit.

### Phase 2 — Design system (BLOCKING) — **A2**
- Token `@theme` + `.dark` (giá trị đã kiểm tương phản ở `docs/design/tokens.md`).
- `ThemeProvider` set `.dark` theo route family; `<html lang>` theo ngôn ngữ; `index.html` bỏ `class="light"`, giữ `viewport-fit=cover`.
- Primitives: `Button`, `Field`, `Input`, `Select`, `Modal` (`<dialog>` + `showModal`), `ConfirmDialog`, `Sheet`, `Badge`, `Card`, `StatCard`, `DataTable`, `ToastViewport` (`role="status"`), `EmptyState`, `Skeleton`, `ProgressBar`, `Money`.
- `src/frontend/theme/tokens.ts` cho màu dùng trong JS (viewer) — đọc từ CSS variable.
- `scripts/check-contrast.mjs` là gate bắt buộc.
- **Gate:** lint + build + contrast exit 0; render 3 route ở 390/768/1440.
- **Rollback:** A2 là phase nền; nếu phải revert thì revert cả nhánh vì các phase sau phụ thuộc primitive.

### Phase 3 — Sửa đúng đắn funnel — **A3** — 🟡 ĐANG LÀM (đã xong phần auth/role)

**ĐÃ XONG (2026-09-12):**
- ✅ `AuthContext`: vai trò UI lấy từ `public.user_profiles.role` qua `resolveDbRole()`/`applyDbRole()`; bỏ suy vai trò từ email; ghi `user_metadata` chỉ còn ở DEV (`IS_DEV`). Trước đây DB có thể cấp admin mà UI vẫn hiện customer → không vào được `/admin`.
- ✅ Khoá Supabase: `client.ts` + `vite.config.ts` không còn hardcode; dùng `sb_publishable_…`; throw nếu ai truyền `sb_secret_…` vào client.

**CÒN LẠI (4 việc, không cần DB, ưu tiên cao nhất của phase này):**
1. `database.ts:418` — nội suy tham số người dùng vào filter `.or()` (rủi ro chèn filter) → chuyển sang RPC `get_order_by_guest_token` (RPC **đã tồn tại** sau migration).
2. `OrderTrackingView.tsx:97,116` — trả `true` khi không nhập mã xác thực → bắt buộc token, bỏ fallback mock/localStorage (đây là đường rò PII thứ hai, độc lập với RLS).
3. `App.tsx:191,210` — fallback `|| orders[0]` → state "không tìm thấy đơn".
4. Google login: project **đang tắt Google OAuth** → hoặc bật provider, hoặc bỏ nút Google và xoá nhánh tạo user giả (`AuthContext.tsx:252-264`).

**CÒN LẠI (theo `03`/`04`):** cart giữ `appliedDiscount` trong store (P0), bỏ prefill PII + `isPaid` tự động + VAT nhất quán ở checkout (P0), bỏ CTA camera + telemetry giả (P0), đọc đơn thật + tải file CAD bằng signed URL (P0), offer not-found, watertight filter, i18n.
- **Gate:** lint + build + `verify-rls.mjs --writes` + đi hết luồng guest (explore → product → cart → checkout → success → tracking) và xác nhận mã giảm giá khớp.
- **Rollback:** theo nhóm bug.

### Phase 4 — Storefront UI — **A4**
Instant Quote Widget; bỏ catalog inline; 1 CTA; filter state lên URL; phân trang thật; 2 CTA ở product; lazy three.js; ảnh lazy/sized; i18n theo key; `HorizontalScrollFilter` fix.
- **Gate:** lint + build; 390px không tràn ngang; tap ≥48px; three.js không còn ở first paint; không còn hex cứng trong file đã sửa.

### Phase 5 — Quote Tool & 3D Engine — **A5** (lớn nhất)
Theo `03-pages-transaction.md` §1.6 nhóm A→E: lifecycle viewer, hiệu năng, minh bạch dữ liệu, layout desktop/mobile, giá & lead time, draft persistence, undo/redo.
- **Gate:** lint + build; đổi máy in không mất model; parse lỗi ra lỗi thật; giá khớp engine; script đặc tả parse/pricing phản ánh hành vi mới; VRAM không tăng sau 5 lần upload (kiểm bằng `renderer.info` trong console).
- **Rollback:** theo nhóm (A/B/C/D/E).

### Phase 6 — Admin & Lab — **A6 ∥ A7**
IA (bỏ 5 alias, deep-link sub-tab), primitives, `DataTable`, loading/empty/error, severity toast, tiền tệ 1 helper, validation, gom CRUD trùng, route `/lab` + tách 2 file + nối `workshopService`.
- **Gate:** lint + build; CRUD workshop/machine/material tồn tại qua refresh; mọi panel có 4 state; `/lab` chỉ role lab/admin vào được.
- **Rollback:** theo panel.

### Phase 7 — Data & Security — **A8** — 🟢 PHẦN LỚN ĐÃ XONG

**ĐÃ XONG và ĐÃ KIỂM CHỨNG trên production (2026-09-12):**
- ✅ Chuỗi migration tái cấu trúc: `20260900_rls_helpers.sql` → `20260901_baseline_schema.sql` (21 bảng, 26 index, 5 hàm, 4 trigger, 2 bucket, realtime, seed) → `20261010_harden_rls.sql` (48 policy bảng + 4 policy storage). 6 file cũ chuyển sang `supabase/legacy/`.
- ✅ RLS siết: 0 bảng hở; anon đọc `orders`/`user_profiles`/`payment_transactions`/`cost_rules` = **0 dòng**; `get_order_by_guest_token` hoạt động; storage bucket đã tạo. Bằng chứng: `docs/security/rls-runbook.md` §10.6.
- ✅ 48 chỗ `user_metadata` + 43 chỗ email hardcode + 28 chỗ `USING (true)` đã bị loại; quyền đọc từ `user_profiles.role`.
- ✅ Bí mật client: bỏ URL/JWT hardcode trong `client.ts` + `vite.config.ts`; HMAC secret nằm trong dead chain (xoá ở Phase 1).
- ✅ `quotes` + `kyc_records` đã được tạo trong baseline.

**CÒN LẠI:**
1. **Rotate `sb_secret_…`** (đã lộ trong chat) — Dashboard → Settings → API Keys.
2. Bật **Google OAuth** hoặc bỏ nút Google (project đang `google: false`).
3. **Seed dữ liệu**: `/admin` → "Đồng Bộ DB" (hoặc để app tự seed khi admin đăng nhập rồi reload).
4. Khai báo env trên **Vercel**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`.
5. Tách `dbService` (895 LOC) thành các service + gộp 3 row mapper (`06` §2.5).
6. `cad-files` cho người mua: hiện dùng heuristic `orders.items`; nên thêm bảng `order_files` và dùng `createSignedUrl` (client hiện chưa gọi).
7. Guest checkout vẫn cho anon INSERT `orders` (đã siết bằng yêu cầu token) — nên chuyển sang Edge Function để ép `status` + chống spam.

- **Gate:** `node scripts/verify-rls.mjs --writes` (0 FAIL) + `node scripts/inspect-db.mjs` + `npx tsx scripts/test-catalog-sync.ts` + build với env mới.
- **Rollback:** mỗi file migration là 1 transaction độc lập; policy cũ nằm ở `supabase/legacy/`.

### Phase 8 — Performance & bundle — **A9**
Lazy `ThreeModelViewer`/modals; bỏ `modulepreload` vendor; `canvas-confetti` dynamic; giảm CSS; sweep ảnh; gỡ ResizeObserver suppression; bỏ `motion` nếu vẫn không dùng.
- **Gate:** critical path ≤ 200 KB gzip; CSS ≤ 12 KB; không tăng số chunk lazy quá mức; LCP không tệ hơn baseline.

### Phase 9 — Nghiệm thu độc lập — **A0**
- Chạy lại toàn bộ gate; lập bảng baseline ↔ sau.
- Chạy script đặc tả: mọi lệch ngoài dự kiến = regression.
- Kiểm UI theo `docs/design/qa-checklist.md` (nếu có Playwright MCP thì tự động hoá).
- Kiểm bảo mật: `grep` anon key/HMAC trong `dist/`; console sạch; không warning `crypto`.

---

## 5. Definition of Done toàn dự án

| # | Tiêu chí | Baseline | Đích |
|---|---|---|---|
| 1 | `npm run lint` | PASS | PASS (không hồi quy) |
| 2 | `npm run build` | PASS | PASS, không warning `crypto` |
| 3 | Critical path gzip | ≈421 KB | ≤ 250 KB |
| 4 | Hex cứng trong `className` | 5.307 | 0 |
| 5 | `text-[Npx]` N<12 | 1.238 | 0 |
| 6 | `dark:` file | 0 | theme hoạt động trên 4 nhóm route |
| 7 | `window.confirm/alert` | 9 | 0 (dùng `ConfirmDialog`) |
| 8 | Icon button thiếu tên truy cập | ≈247 | 0 trong file đã refactor |
| 9 | Modal có `role="dialog"`/focus trap | 0 | mọi modal qua primitive |
| 10 | Panel admin có loading/empty/error | ~0 error | 100% panel có 4 state |
| 11 | Bảng admin có sort/phân trang/bulk | 0/39 | ≥ 90% bảng qua `DataTable` |
| 12 | Parse lỗi | tạo model giả + toast thành công | lỗi thật + retry |
| 13 | Mã giảm giá ở checkout | mất | giữ đúng |
| 14 | `/tracking/<id sai>` | hiện đơn người khác | "không tìm thấy" |
| 15 | Đổi máy in trong `/quote` | mất model | giữ model |
| 16 | Giảm giá số lượng | không trừ | trừ đúng (có test) |
| 17 | Anon ghi được `products` | **có** | không |
| 18 | Anon đọc được `orders`/`user_profiles` | **có** | không |
| 19 | Tải file CAD sau khi mua | không được | được (signed URL) |
| 20 | Dead code | ~13.087 LOC | 0 |

---

## 6. Rủi ro điều phối

| Rủi ro | Cách chặn |
|---|---|
| Hai subagent sửa cùng file | Bảng ownership §2 + "file dùng chung chỉ 1 owner/phase"; review import trước khi bắt đầu phase |
| Phase 7 (RLS) làm vỡ app đang chạy | Chạy staging trước; policy mới luôn kèm script kiểm anon; rollback SQL sẵn |
| Token hoá làm lệch thị giác | Stage A chứng minh bằng tập màu CSS không đổi (`verify-tokens-unchanged`) |
| Đổi theme làm hỏng màu trong canvas 3D | `src/frontend/theme/tokens.ts` là nguồn duy nhất cho màu JS |
| Xoá dead code làm mất CRUD thật (partner/KYC) | Bước port bắt buộc trước khi xoá |
| Không có test tự động | Script đặc tả `npx tsx` cho logic + checklist thủ công cho UI |
| Mất dữ liệu khi migration | Baseline dùng `ADD COLUMN IF NOT EXISTS`, không `DROP`; sao lưu trước khi chạy |

---

## 7. Phụ lục — phạm vi migrate icon (thuộc Phase 2)

- Khối lượng: **696 điểm / 69 file / 213 glyph**; 208 glyph có tương đương lucide, 5 phải tự viết (chi tiết `docs/design/icon-map.md`).
- **Cảnh báo kỹ thuật:** class `text-*` trên icon hiện **không có tác dụng** vì `src/index.css:260` (không layer) thắng `@layer utilities` → mọi icon đang vẽ ở 24px. Sau khi migrate kích thước thành thật, icon sẽ nhỏ đi → **migrate từng file, kiểm màn hình sau mỗi file**, không làm toàn repo một lần.
- **Không được bỏ sót:** 12 danh sách icon dạng chuỗi (`.icon` trong mockData/store/Header/AdminSidebar/OrderProgress/…) phải đổi sang tham chiếu component.
- Dọn cùng lúc: `index.html:11` (link Material Symbols) + `src/index.css:260-279`; bỏ qua 17 điểm trong `src/app/**` (đã xoá ở Phase 1).
- **Gate cho phần này:** `grep -r 'material-symbols' src` = 0 **và** `grep -r '<link' index.html` không còn Material Symbols, sau đó kiểm 5 màn hình nhiều icon nhất (`AuthModal`, `HomeView`, `Group5ProductionPanel`, `PricingConfigPanel`, `ExploreView`).

## 8. Phụ lục — danh sách kiểm dữ liệu trung thực (Phase 3 & 5)

`docs/design/data-honesty.md` có **69 phát hiện** (17 Critical / 28 High / 24 Medium) kèm cách thay thế cụ thể, 8 thiết kế trạng thái UI, đề xuất demo mode (`VITE_VCUBE_DEMO_MODE` + badge), 6 khối grep và 12 luồng kiểm thủ công. Dùng tài liệu đó như **checklist nghiệm thu** cho Phase 3 và Phase 5b — không cần đọc lại source.
