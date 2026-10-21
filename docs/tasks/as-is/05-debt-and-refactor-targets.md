<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# AS-IS 05 — Nợ kỹ thuật · Mục tiêu refactor · Sai lệch docs

## 1. Số đo nợ kỹ thuật (đọc từ code)

| Chỉ số | Giá trị | Nguồn |
|---|---|---|
| Tổng LOC | 64.329 · 141 file | `find src` |
| File >500 / >1000 / >2000 LOC | **42 / 19 / 6** | `wc -l` |
| `any` | 138 | loop-audit |
| `@ts-ignore` | 2 | loop-audit |
| `eslint-disable` | 14 | loop-audit |
| `strict` trong tsconfig | **false** | `tsconfig.json` |
| `isVi ?` (ternary i18n) | **1193** | grep |
| Gọi `t()` | 30 | grep |
| Raw `<button>` vs `<Button>` | **429 vs 214** | grep |
| Raw `<input>+<select>` vs `<Field>+<Input>+<Select>` | **341 vs 89** | grep |
| `console.warn` / `console.error` | 81 / 18 | grep |
| `catch` tổng / `catch {` nuốt lỗi | 178 / 27 | grep |
| `reportError()` caller | **1** | grep |
| Import alias vs đường dẫn tương đối sâu | 134 vs 123 | grep |
| `useState(` | 0 (không có state lib ngoài) | — |

## 2. Bảy nguyên nhân gốc (đo được, không phải ý kiến)

| # | Vấn đề | Bằng chứng | Hệ quả |
|---|---|---|---|
| **R1** | **Tầng dữ liệu phân mảnh** — 4 pattern song song (service / `dbService` inline / `App.tsx` làm service / business logic export từ `database.ts`) | `catalogService`+`pricingService` 0 importer; 5 panel gọi `dbService` inline; `computeShippingFee` ở `database.ts` dùng bởi 3 view | Không test được; đổi DB phải sửa UI |
| **R2** | **God components** | `PricingConfigPanel` 3079 · `WorkshopSettingsView` 2493 · `workshopService` 2243 · `App.tsx` 2119 · `Group1WorkshopsPanel` 2079 · `ModelViewer3D` 2072 | Không review/nâng cấp an toàn |
| **R3** | **`App.tsx` monolith + prop drilling** | 2119 LOC · 32 `<Route>` · `AdminDashboardView` 18 prop · `onNavigate(any)` khắp nơi · route block copy-paste 2 lần | Mọi refactor đụng 1 file → xung đột |
| **R4** | **State/type phân mảnh + dead code** | 6 store ở 2 thư mục; `useUIStore.toasts` trùng `toastQueue`; 3 shim chết; dead import `dbService`; `ToastViewport`/`Section`/`Toolbar` dead | Rối, dễ regress |
| **R5** | **i18n ternary tràn lan** | 1193 `isVi ?` vs 30 `t()`; nặng nhất `Group1WorkshopsPanel` 156 | Chuỗi rải rác |
| **R6** | **Error handling không tập trung** | 99 điểm log tay vs 1 `reportError`; 27 `catch{}` nuốt lỗi | Nuốt lỗi, khó debug |
| **R7** | **UI primitive adoption thấp** | 429 vs 214 button; 341 vs 89 input/select; `PricingConfigPanel`/`AuthModal` 0 `<Button>` | Lệch a11y/theme |
| **R8** | **`three` trong eager graph** | `ThreeModelViewer` import tĩnh ở Home/PDP/AssetLibrary; lazy chỉ 5 module | Bundle đầu phình |
| **R9** | **Docs drift** | `schema.md` thiếu 9 migration; `docs/README` ghi 90 policy/6 storage; `docs/pages` nói "không có bảng X" | Docs nhiễm |

## 3. Sai lệch docs ↔ code (đã xác minh bằng SQL/code)

| Doc nói | Sự thật |
|---|---|
| `docs/README.md` "31 bảng + 1 view, 90 policy, 6 storage policy" | **32 bảng + 2 view; 92 policy bảng hiệu lực (88 + 4); 7 policy storage** |
| `docs/README.md` "13 hàm, 7 định nghĩa trigger/27 instance" | **19 hàm (10 callable + 9 trigger); 9 định nghĩa/~29 instance** |
| `docs/database/schema.md` | **Thiếu 9 migration W2** (designer_payout_info, open_design_requests, check constraints, broadcast, storage scheme…) |
| `docs/pages/customer-checkout.md` "không có bảng `order_items`/`warranty_claims`/`order_files`" | **Cả 3 bảng CÓ** (baseline) — vấn đề là **chưa nối UI/service**, không phải thiếu bảng |
| `schema.md` `orders.payment_status` = unpaid/pending/paid/failed/refunded | Thật: awaiting_payment, paid, cod, cancelled, unpaid |
| `schema.md` `kyc_records.status` có `approved` | Thật: pending, pending_review, verified, rejected, unverified |
| `docs/README.md` route `/workshop/settings` | Không tồn tại — thật là `/lab/:tab` |
| `docs/architecture/system-overview.md` mô tả store/route | Đúng phần lớn; thiếu 9 migration + policy `orders:admin` |
| `AGENTS.md` §Env "NEXT_PUBLIC_* giữ để code chạy" | Vẫn còn alias legacy (T39 chưa làm) |
| `docs/design/ui-audit-2026-09.md` | Đã đánh dấu `snapshot` — nhiều số liệu/file:line đã trôi |

## 4. Dead code / tài sản mồ côi (dọn được)

| Hạng mục | Trạng thái |
|---|---|
| `catalogService.ts` | 0 importer, mọi method trả `[]` |
| `pricingService.ts` | 0 importer (nhưng có logic thật bọc `pricingEngine`) |
| `seedService.ts` + `syncFromSupabase()` | 0 caller |
| `src/frontend/types/index.ts`, `src/frontend/data/mockData.ts`, `src/frontend/utils/pricingEngine.ts` | 3 shim `export *`, 0 importer |
| `AdminProductsPanel` import `dbService` | dead import |
| `ui/ToastViewport.tsx` (+`useUIStoreToasts`) | 0 consumer (App tự render toast) |
| `ui/Section.tsx`, `ui/Toolbar.tsx` | 0 import / 0 render |
| `ui/CardFooter`, `ui/CardDescription` | 0 dùng |
| `dbService.uploadCadFile`, `dbService.recordPaymentTransaction` | 0 caller |
| `compute3SidedOrderFinancialSplit` | 0 caller |
| `useUIStore.toasts` | trùng `toastQueue` |
| `mockData.PAYOUT_TRANSACTIONS` | được `DesignerPayoutsTab` render như dữ liệu thật (rủi ro honesty) |
| `LoginView.tsx:123` `alert()` | residue |
| `.loop/` | đã gitignore, chỉ để đo |

---

## 5. Khung refactor đề xuất (chờ chốt — chưa thi hành)

> Nguyên tắc: **không thêm dependency khi chưa duyệt** · mỗi phase 1 worktree/PR · mỗi bước
> `npm run lint && npm run build && npm run check` phải xanh · **không đổi hành vi** · kiểm browser
> 390/768/1440 · giữ data-honesty + token + icon + light-only.

| Phase | Nội dung | Trọng tâm file | Kết quả |
|---|---|---|---|
| **0. Ổn định** | Commit/dọn working tree; chốt 4 quyết định (dependency? chạm DB? scope? nơi ghi plan); baseline `npm run check`; ghi "Sai lệch docs" thành task | tree hiện tại | Điểm xuất phát sạch |
| **1. Hợp nhất tầng dữ liệu (R1)** | 1 cửa duy nhất `src/backend/services/*`; `dbService` còn adapter row↔domain; xoá service/shim chết; chuyển `computeShippingFee` sang service; đưa 5 call-site `dbService` inline về service; dời realtime `products` ra service | `database.ts`, `services/*`, 5 panel | 1 cửa vào DB, test được |
| **2. Giải phẫu `App.tsx` (R3)** | Tách hook `useCatalogSync`, `useRealtimeProducts`, `useFabVisibility`, `useLocalPersistence`; tách route table + wrapper ra `src/frontend/routes/`; thay prop-drilling bằng context/hook; bỏ `onNavigate(any)` → `useNavigate` + builder route typed | `App.tsx` 2119 → **< 400** | Hết nút cổ chai |
| **3. State & types (R4)** | Gom 6 store về 1 thư mục; bỏ `toasts` trùng; đưa 5 key `localStorage` của App vào persist/cache; tách `types/index.ts` theo domain (giữ re-export); bật `strict` tăng dần | `stores/`, `types/` | Nhất quán |
| **4. God components (R2) + primitive (R7)** | Tách `PricingConfigPanel`→6 panel, `WorkshopSettingsView`→6 tab + data hook, `Group1WorkshopsPanel`→4 tab, `ModelViewer3D`→engine hook + overlay; migrate raw `button/input/select` → primitive; DataTable Tier-3; modal còn lại → `<dialog>` (`UserAvatarMenu`, `AuthModal`); `Header` drawer → `Sheet` | 5 file >2000 + admin | Review/nâng cấp được |
| **5. i18n (R5) + error (R6)** | Bỏ dần `isVi ?` khi động file (per D9, **không codemod hàng loạt**); thay `console.*` bằng `reportError`; siết gate `check-error-handling` | toàn `src` | Chuỗi/lỗi nhất quán |
| **6. Bundle & perf (R8)** | Lazy `ThreeModelViewer` trong Home/PDP/AssetLibrary; `content-visibility` list dài; rà `manualChunks` | 3 view + `vite.config.ts` | Cắt bundle đầu |
| **7. Feature gaps (W6/T40–T56)** | `order_files`→ tải CAD; payout ledger; persist warranty; `order_items` writer; `reviews` writer/reader; dispatcher assignment; capabilities (`ComingSoon`); Edge Fn quote | DB + service + UI | Tính năng thật |
| **8. Docs-as-code (R9)** | Sinh `schema.md` (T26), `rls-policies.md` (T13); chạy nốt W4/W5; bật `check-doc-freshness` thành gate thật | `docs/**`, `scripts/**` | Docs tự đúng |

**Thứ tự khuyến nghị**: 0 → 1 → 2 → 3 → 4 → 6 → 5 → 7 → 8. (Phase 1 + 2 gỡ nút cổ chai trước; Phase 3 chèn sau khi `App.tsx` đã tách.)

**Quan hệ với board cũ**: Phase 7 ≈ `DRIFT-TASKS` W6 (T40–T56) + T51; Phase 8 = W3/W4/W5 còn lại (T26, T13, T32a–d, T33, T34a–c, T35, T38, T39, T31, T47, T48, T55). **Không tạo kế hoạch song song chồng lấn.**

---

## 6. Quyết định cần chốt trước khi lên task chi tiết

| # | Câu hỏi | Mặc định nếu không duyệt |
|---|---|---|
| D-A | Có được thêm dependency (TanStack Query / zod-env / data-router)? | **Không** — hook tự viết + script Node no-dep |
| D-B | Refactor có được chạm migration/SQL? | **Chỉ frontend + service**; thay đổi DB để lại cho W6/T54 |
| D-C | Scope ưu tiên đợt tới? | **Toàn bộ 8 phase** theo thứ tự khuyến nghị |
| D-D | Ghi plan ở đâu? | **`docs/tasks/REFACTOR-PLAN.md`** + task board nhỏ theo phase |

> Khi UI/UX mới về, cập nhật `03-routes-views-components.md` (màn/component nào đổi) và
> `04-workflows-feature-status.md` (feature nào thêm/bỏ) trước, rồi mới chỉnh §5 ở file này.
