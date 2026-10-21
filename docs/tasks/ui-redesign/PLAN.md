<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# PLAN — Redesign toàn bộ UI/UX VCUBE theo "Warm Studio" (AURA)

> **Mục tiêu**: đổi tầng trình bày của **toàn bộ 16 view + ~60 component** sang ngôn ngữ
> AURA (ấm, tối giản, bo lớn, CTA đen đá), đồng bộ storefront ↔ transaction ↔ 3 console,
> **không** đổi logic, dữ liệu, schema hay backend.
>
> **Nguồn thị giác**: `DESIGN-LANGUAGE.md` (LOCKED).
> **Cách review**: `REVIEW.md`.
> **Tiến độ + nhật ký quyết định**: `PROGRESS.md`.

---

## 1. Quyết định đã chốt (không bàn lại)

| # | Chủ đề | Quyết định | Ngày |
|---|---|---|---|
| D-1 | Palette | `primary = #1C1917` (đen đá); nền `#FAFAF9`; viền `#E7E5E4` | 2026-10-19 |
| D-2 | Teal | Giữ `#00687A` **chỉ** cho `--color-info` + `info-tint` (trạng thái đang xử lý) | 2026-10-19 |
| D-3 | Console | Bỏ tier chrome tối + cam; `/admin`, `/lab`, `/designer` dùng shell sáng | 2026-10-19 |
| D-4 | Dependency | **No-dep**. Không thêm thư viện UI/animation. CSS + Tailwind + lucide | 2026-10-19 |
| D-5 | Phạm vi | **UI-only**. Không đụng backend, Supabase, store, pricing, mesh parser | 2026-10-19 |
| D-6 | Typography | Giữ Be Vietnam Pro + thang chữ hiện tại (12→38). "Hiện đại" đến từ spacing/radius | 2026-10-19 |
| D-7 | i18n | **Không** gom `isVi ?`. Chuỗi giữ nguyên từng ký tự | 2026-10-19 |
| D-8 | Data honesty | Mọi số liệu/ảnh giữ nguyên nguồn; không thêm nội dung mẫu | 2026-10-19 |

---

## 2. Bất biến thi công (mọi subagent)

1. **Presentation-only.** Không sửa: `src/backend/**`, `src/stores/**`, `src/utils/**`,
   `src/workers/**`, `supabase/**`, `src/frontend/context/**`, `scripts/**`.
2. **Không đổi hành vi.** Props, state, event handler, service call, điều kiện render,
   chuỗi hiển thị (`isVi ? 'A' : 'B'`) giữ nguyên. Chỉ đổi `className` + bọc primitive.
3. **Không thêm dependency.** Không `motion`, không Radix, không GSAP.
4. **Token-only.** Không hex mới trong `.tsx` (swatch dữ liệu là ngoại lệ).
5. **Không xoá primitive đang dùng.** `Card`, `Badge`, `Button`, `Field`, `Input`, `Select`,
   `Modal`, `Sheet`, `DataTable`, `EmptyState`, `StatCard`, `PageHeader` là hợp đồng chung.
6. **Không sửa file ngoài quyền sở hữu** (xem §4). Nếu bắt buộc → dừng, báo orchestrator.
7. **Không commit/push.**

---

## 3. Kiến trúc 4 wave

```
Wave 0  FOUNDATION (serial, 1 agent)
        tokens → primitives → shell → App.tsx chrome
        ↓  khoá DESIGN-LANGUAGE, không ai được sửa ui/* sau đây
Wave 1  PARALLEL A (4 agent)          Wave 2  PARALLEL B (4 agent)
        S1 storefront                         C1 admin panels
        S2 transaction                        C2 admin groups
        S3 auth + shared                      C3 3D/quote
        S4 designer + lab                     C4 personalization + catalog detail
        ↓                                     ↓
Wave 3  CROSS-REVIEW (2 reviewer + 1 integrator)
Wave 4  VERIFY (gates + browser 390/768/1440 + fix)
```

**Vì sao Wave 0 phải serial**: 8 subagent cùng sửa `ui/Button.tsx` hoặc `src/index.css` sẽ
conflict tuyệt đối. Wave 0 là "design system lock" — sau đó primitives là **read-only**.

**Vì sao Wave 1/2 tách**: mỗi wave 4 agent, tổng 8 luồng. Nhiều hơn 4 agent song song trong
cùng wave làm chi phí review và rủi ro merge tăng nhanh, trong khi mỗi view đã 500–2500 dòng.

---

## 4. Workstream & quyền sở hữu file

### Wave 0 — Foundation

| ID | Agent | File được sửa | Deliverable |
|---|---|---|---|
| **F0** | foundation | `src/index.css` | Token mới §1–§2 DESIGN-LANGUAGE; range slider; scrollbar 6px; `::selection`; xoá `--color-chrome*` |
| **F1** | foundation | `src/frontend/ui/*` (29 file) | Restyle toàn bộ primitive; xoá `tone.ts` + prop `tone`/`chrome` |
| **F2** | foundation | `src/App.tsx` | Toast + FAB + skip-link + `CHROMELESS_SCREENS` giữ nguyên logic, đổi style; bỏ `tone="chrome"` |
| **F3** | foundation | `src/frontend/components/Header.tsx`, `CartDrawer.tsx`, `PageSkeleton.tsx`, `NotFoundView.tsx`, `RouteErrorBoundary.tsx`, `PanelErrorBoundary` (ui) | Chrome storefront dùng token mới |

> F0–F3 do **một** agent làm tuần tự để tránh lệch pha. Thời lượng dự kiến: 1 lượt lớn.

### Wave 1 — Storefront & transaction

| ID | Agent | File được sửa | LOC |
|---|---|---|---|
| **S1** | storefront-core | `views/HomeView.tsx`, `views/ExploreView.tsx` | 2 764 |
| **S2** | product-detail | `views/ProductDetailView.tsx`, `views/PersonalizeView.tsx`, `components/personalize/PersonalizeModelViewer3D.tsx`, `components/material/MaterialTechnicalAdvisory.tsx`, `components/services/ServiceShowcaseSection.tsx` | 3 219 |
| **S3** | transaction | `views/CartView.tsx`, `views/CheckoutView.tsx`, `components/CartDrawer.tsx`, `components/InvoiceModal.tsx` | 1 700 |
| **S4** | order-flow | `views/OrderSuccessView.tsx`, `views/OrderTrackingView.tsx`, `views/MyOrdersView.tsx`, `views/AssetLibraryView.tsx`, `components/OrderProgress.tsx` | 2 130 |

### Wave 2 — Consoles & 3D

| ID | Agent | File được sửa | LOC |
|---|---|---|---|
| **C1** | admin-panels | `views/AdminDashboardView.tsx`, `components/admin/AdminSidebar.tsx`, `AdminProductsPanel`, `AdminStorefrontPanel`, `AdminSeoPanel`, `AdminSettingsPanel`, `AccessoriesManager`, `WarehouseInventoryPanel`, `WorkshopEstimatorBOM`, `PricingConfigPanel` | ~8 800 |
| **C2** | admin-groups | `components/admin/groups/*` (6 file) | 6 250 |
| **C3** | quote-3d | `views/Tool3DView.tsx`, `components/tool3d/*` (11 file) | 6 780 |
| **C4** | consoles-rest | `views/DesignerDashboardView.tsx`, `components/designer/*` (5), `views/WorkshopSettingsView.tsx`, `components/onboarding/WorkshopOnboardingWizard.tsx` | 6 932 |

### Wave 1b — Auth & shared (chạy song song Wave 2)

| ID | Agent | File được sửa | LOC |
|---|---|---|---|
| **S5** | auth-shared | `views/LoginView.tsx`, `views/RegisterView.tsx`, `components/AuthModal.tsx`, `components/auth/UserAvatarMenu.tsx`, `components/CadQuickViewModal.tsx`, `components/ChatSupportModal.tsx`, `components/custom/CustomIdeaRequestModal.tsx`, `components/HorizontalScrollFilter.tsx`, `components/ThreeModelViewer.tsx`, `components/RoleGuard.tsx`, `components/SEOHead.tsx`, `components/ScrollToTop.tsx`, `components/CanvasErrorBoundary.tsx` | ~3 200 |

> Tổng 9 luồng. Chạy **2 đợt**: `{S1,S2,S3,S4,S5}` rồi `{C1,C2,C3,C4}` — mỗi đợt 4–5 agent.

### File cấm chạm (orchestrator giữ)

`src/index.css`, `src/frontend/ui/**`, `src/App.tsx`, `package.json`, `vite.config.ts`,
`src/backend/**`, `src/stores/**`, `src/types/**`, `src/utils/**`, `src/workers/**`,
`supabase/**`, `scripts/**`, `docs/tasks/ui-redesign/{DESIGN-LANGUAGE,PLAN,REVIEW,PROGRESS}.md`.

---

## 5. Giao thức handoff

Mỗi subagent nhận đúng prompt sau (điền ID + file):

```
Bạn là subagent <ID> trong đợt redesign VCUBE "Warm Studio".

ĐỌC THEO THỨ TỰ:
1. docs/tasks/ui-redesign/DESIGN-LANGUAGE.md   (hợp đồng thị giác — LOCKED)
2. docs/tasks/ui-redesign/PLAN.md §2, §4, §7   (bất biến + quyền sở hữu + DoD)
3. docs/tasks/ui-redesign/REVIEW.md            (rubric sẽ chấm bạn)
4. docs/design/data-honesty.md, docs/design/icon-map.md

FILE BẠN ĐƯỢC SỬA (chỉ những file này):
<danh sách>

VIỆC:
- Restyle các file trên theo DESIGN-LANGUAGE §3 (dùng recipe nguyên văn).
- Bọc raw markup vào primitive khi làm được mà không đổi hành vi.
- Giữ NGUYÊN mọi logic/props/state/chuỗi isVi.

KHÔNG:
- Không sửa src/index.css, src/frontend/ui/**, src/App.tsx.
- Không thêm dependency, không hex mới, không đổi backend/store.
- Không refactor ngoài phạm vi thị giác.

BÀN GIAO (bắt buộc):
- Ghi docs/tasks/ui-redesign/handoff/<ID>.md theo mẫu trong REVIEW.md §5.
- Chạy `npx tsc --noEmit` và báo kết quả.
- Liệt kê file: dòng đã đổi, class pattern đã thay, chỗ cần reviewer quyết.
```

---

## 6. Cross-review (Wave 3)

Hai reviewer độc lập, **không** sửa code:

| Reviewer | Chấm | Output |
|---|---|---|
| **R1 — Consistency** | 9 handoff + diff; đối chiếu DESIGN-LANGUAGE §3 | Danh sách lệch (file:line, mức, cách sửa) |
| **R2 — A11y & Responsive** | focus ring, tap target, contrast, 390/768/1440, reduced-motion | Danh sách lỗi + mức |

Sau đó **integrator** (1 agent) sửa các mục R1/R2 chấm, theo thứ tự: chặn build → sai token →
lệch recipe → a11y → polish.

**Luật quyết định** (khi reviewer bất đồng):

1. `DESIGN-LANGUAGE.md` thắng mọi ý kiến cá nhân.
2. `AGENTS.md` + `docs/design/taste-contract.md` thắng `DESIGN-LANGUAGE.md`.
3. Data-honesty thắng thẩm mỹ.
4. Nếu vẫn mơ hồ: orchestrator quyết và ghi vào `PROGRESS.md` §Decision log.

---

## 7. Definition of Done

Một workstream chỉ được coi là xong khi:

- [ ] `npx tsc --noEmit` pass (không lỗi mới).
- [ ] `npm run build` pass.
- [ ] `npm run check` không hồi quy so với baseline (`docs/tasks/baseline.json`).
- [ ] 0 chuỗi `chrome` trong file đã sửa.
- [ ] 0 hex mới trong `.tsx`.
- [ ] 0 `text-[10px]` / `text-[11px]`.
- [ ] 0 `min-h-screen` / `h-screen` mới.
- [ ] Mỗi màn đủ 4 state (loading/empty/error/success) — nếu màn đã có.
- [ ] Kiểm 390 / 768 / 1440 (screenshot hoặc mô tả trong handoff).
- [ ] Handoff `docs/tasks/ui-redesign/handoff/<ID>.md` đã ghi.

**Gate toàn đợt** (Wave 4): `npm run lint` · `npm run build` · `npm run check` ·
`node scripts/loop-audit.mjs` (score ≤ 8, không hồi quy).

---

## 8. Rủi ro & cách chặn

| Rủi ro | Xác suất | Chặn |
|---|---|---|
| Subagent sửa lan sang logic | Cao | Prompt cấm rõ; reviewer diff theo `git diff -U0` chỉ thấy class |
| `ui/*` bị sửa sau Wave 0 | Cao | Reviewer R1 grep `ui/` trong diff; cấm tuyệt đối |
| Radius lớn làm ô vuông thành tròn (A19) | Trung bình | Checklist §2.1; rà `w-7`…`w-12` |
| Contrast fail khi đổi tint | Trung bình | `npm run check` có `check-contrast*` |
| Bỏ `tone="chrome"` sót call site | Thấp | `tsc` bắt buộc pass |
| Mất data-honesty do "làm đẹp" | Trung bình | `check-fabricated` + reviewer đọc `data-honesty.md` |
| File 3000 dòng bị subagent cắt bớt | Cao | Prompt: **không xoá block**, chỉ đổi class; reviewer so số dòng ±10% |

---

## 9. Thứ tự thực thi

1. **Wave 0** — foundation (1 agent). Verify bằng `npm run lint && npm run build`.
2. **Wave 1** — S1, S2, S3, S4, S5 song song.
3. **Wave 1 review nhanh** — R1 quét 5 handoff (chỉ consistency).
4. **Wave 2** — C1, C2, C3, C4 song song.
5. **Wave 3** — R1 + R2 toàn bộ; integrator sửa.
6. **Wave 4** — gate + browser + báo cáo.

> Nếu một workstream fail gate: hoàn nguyên các file của workstream đó (`git checkout -- <files>`),
> ghi lý do vào `PROGRESS.md`, chạy lại với prompt hẹp hơn. Không để fail lan sang wave sau.
