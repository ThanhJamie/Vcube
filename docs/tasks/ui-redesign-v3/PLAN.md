<!-- doc-meta: status=active; verified=2026-10-20; owner=thanh -->
# PLAN — UI/UX v3 "Soft Studio" (UI-first · một ngôn ngữ · không lỗi tồn đọng)

> **Trạng thái: APPROVED (2026-10-20) — đang thi công W1–W6.**
> Mọi agent phải đọc file này + `DESIGN-LANGUAGE.md` (v3) trước khi sửa bất kỳ `.tsx` nào.
> Mục tiêu giai đoạn này là **chỉnh UI trước**, tuyệt đối không thêm feature/data/backend.

---

## 0. Tóm tắt điều hành

- **Hướng tối ưu:** không clone Prestiva; áp dụng bản **"Soft Studio v3"** lên hệ token/primitive hiện có, giữ IA và route hiện tại.
- **Ưu tiên:** PDP (`/products/:id`) là trang "flagship" để chứng minh ngôn ngữ mới; sau đó Explore → Home → transaction/auth → console.
- **Một ngôn ngữ:** **tiếng Việt** là ngôn ngữ UI duy nhất. Thuật ngữ kỹ thuật (CAD, STL, STEP, 3MF, WebGL, SKU, KYC, VAT, MES, API…) được giữ nguyên; mọi câu nhãn/hướng dẫn/trạng thái phải là tiếng Việt.
- **Không lỗi tồn đọng:** có **UI defect register** P0–P3; điều kiện thoát là **0 P0/P1/P2 trong phạm vi**, P3 phải được ghi nhận + chủ sở hữu.
- **Không đụng backend/data/feature:** không sửa `src/backend/**`, `supabase/**`, `src/utils/**`, `src/workers/**`, pricing/mesh logic. UI dùng dữ liệu/empty-state hiện có.
- **Điều kiện tiên quyết:** commit/tag đợt "Warm Studio" v2 đang dở trước; mở branch `feat/ui-soft-studio-v3`; feature freeze đến hết QA.

---

## 1. Quyết định nền (cần chốt)

| ID | Quyết định | Đề xuất | Vì sao |
|---|---|---|---|
| D0 | Ngôn ngữ UI | **Tiếng Việt duy nhất** | Repo đã khoá `language='vi'`; tránh bilingual nửa vời |
| D1 | Hướng thị giác | **Soft Studio adaptation**, không clone Prestiva | Giữ chất công nghiệp, tránh "event app cosplay" |
| D2 | Shell/IA | **Hybrid**: storefront giữ top nav; console dùng sidebar | Giữ SEO/route/nav hiện tại, giảm rủi ro |
| D3 | Accent | **CTA đen giữ nguyên + coral chỉ cho brand mark** | Không phá D-1 cũ; coral làm CTA sẽ fail contrast |
| D4 | Dependency | **No-dep** | Không thêm animation/UI/font package |
| D5 | Phạm vi | **UI-only**, feature/data freeze | Đúng yêu cầu "UI trước, data sau" |
| D6 | IA/route | **Không đổi route, slug, nav label** trừ khi được duyệt | Tránh phá SEO/muscle memory |
| D7 | 3D viewport | **Giữ nền tối graphite** làm điểm nhấn; chỉ soften frame | Đổi sang nền sáng cần re-light, rủi ro cao |

> Nếu bạn muốn **English-only** hoặc **full sidebar toàn app**, đổi D0/D2 trước khi bắt đầu; mọi task bên dưới giả định D0=VI, D2=hybrid.

---

## 2. Phạm vi & không phạm vi

### Trong phạm vi
- Token/palette/radius/shadow/typography ở tầng trình bày.
- 29 primitive trong `src/frontend/ui/**` + shell/header.
- 16 view + 53 component UI (trừ logic/backend).
- Copy tiếng Việt, trạng thái loading/empty/error/success, responsive 390/768/1440.
- UI defect register + QA matrix + screenshot evidence.

### Ngoài phạm vi (tuyệt đối)
- `src/backend/**`, `supabase/**`, migrations, RLS.
- `src/stores/**`, `src/utils/**`, `src/workers/**`, pricing/mesh parser.
- Thêm/xoá feature, route, field DB, realtime, payment.
- Thêm dependency/font/animation library.
- Fake data/ảnh/số liệu để "cho đẹp".

---

## 3. Phương án & lựa chọn

| Phương án | Nội dung | Effort | Rủi ro | Kết luận |
|---|---|---:|---:|---|
| **A (chọn)** | Soft Studio v3: token/primitive + PDP/Explore/Home recompose; console surface-only; hybrid shell | 3–4 tuần | Trung bình | **Tối ưu nhất** |
| B | Clone Prestiva: sidebar toàn app, airy toàn bộ, serif editorial | 5–7 tuần | Cao | Không nên; phá density console/SEO |
| C | Token-only reskin: đổi màu/radius, không sửa layout | 1–1.5 tuần | Thấp | Nhanh nhưng không đạt "đồng bộ/trực quan" |

**Chọn A.** Lý do: tận dụng 60–70% nền v2 đã có; giữ IA; chỉ recompose các bề mặt có lợi; console giữ density.

---

## 4. Design contract v3 — delta so với v2

> File chi tiết sẽ là `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` (foundation agent tạo). Dưới đây là chốt hướng.

### 4.1 Token
| Nhóm | v2 hiện tại | v3 đề xuất |
|---|---|---|
| Canvas | `#FAFAF9` | `#F6F7EF` (sage/cream rất nhạt) hoặc giữ `#FAFAF9`; **không tối hơn** `#F1F5E8` |
| Surface | `#FFFFFF` | `#FFFDF9` (trắng ngà) |
| Ink | `#1C1917` | giữ |
| Muted | `#57534E` | giữ |
| Subtle | `#746E68` | giữ; không dùng trên pastel |
| Brand | chưa có | `--color-brand: #E8624A` **chỉ** logo/mark/badge; không làm CTA |
| Pastel | chưa có | mint/lilac/rose/amber cho category tile; dùng `text-fg`/`text-fg-muted` |
| Radius | card 16 / panel 24 / control 12 | card 20 / panel 28 / modal 24; **control giữ 12**; pill chỉ nav/search/chip |
| Shadow | e0–e3 rất nhẹ | thêm `--shadow-soft` ấm cho storefront card; console giữ hairline |
| Font | Be Vietnam Pro + JetBrains Mono | giữ; wordmark serif chỉ qua **SVG/Georgia**, không tải font mới |

**Contrast đã đo nhanh (phải đưa vào ledger):**
- Coral `#E8624A` trên trắng ≈ **3.0:1** → không dùng làm chữ nhỏ; chữ trên coral dùng ink ≈ 5.7:1.
- Pastel tile: `text-fg` 12.7–13.9:1; `text-fg-muted` 5.6–6.1:1; **không dùng `text-fg-subtle`** (3.7–4.0:1).
- Canvas sage `#F6F7EF`: `fg-subtle` 4.67:1; nếu tối hơn `#F1F5E8` chỉ còn 4.55:1.

### 4.2 Primitive variants (opt-in, không phá API cũ)
- `Card`: thêm `variant="soft"` (borderless + shadow) cho storefront; mặc định giữ `flat`.
- `Button`: giữ `rounded-md`; thêm `shape="pill"` **chỉ** cho nav/search/chip; CTA vẫn 12px.
- `SideNav`: thêm `variant="pill"` (active trắng + shadow) cho console; mặc định giữ tint + thanh dọc.
- `Topbar`: search pill; giữ chiều cao 56px.
- `Badge`, `Field`, `Input`, `Select`, `DataTable`, `EmptyState`, `StatCard`: chỉ token/radius, không đổi hành vi.
- `PageHeader`, `Section`, `Toolbar`: chuẩn hoá nhịp dọc/thứ bậc.

### 4.3 Page templates
| Template | Dùng cho | Quy tắc |
|---|---|---|
| Storefront | Home, Explore | `max-w-7xl`, header 72–80, section 48–64, card grid 1/2/3 |
| Detail | PDP, Personalize | 7/5 split, right sticky 360–380, 3D frame 420–480 |
| Transaction | Cart, Checkout | dense form, card 16–20, không airy quá |
| Console | Admin, Lab, Designer | AppShell + SideNav 240, `max-w-[1400px]`, DataTable/Form |
| Auth | Login, Register | card trung tâm `max-w-md`, 1 CTA |
| Reading | Invoice, success | `max-w-3xl` |

### 4.4 3D rules
- Giữ viewport nền tối `#091426` làm "cửa sổ kỹ thuật"; frame ngoài dùng surface kem + shadow.
- Không đổi `scene.background`, ánh sáng, material trong wave UI này.
- Nếu muốn viewport sáng: tạo spike riêng, re-light + đo lại độ tương phản model; chỉ merge sau khi duyệt.

---

## 5. Một ngôn ngữ — luật copy

### 5.0 Quyết định copy đã duyệt — D-A…D-F (Lead, 2026-10-20)

> Chi tiết triển khai: `DESIGN-LANGUAGE.md` §4.1 · danh sách chuỗi: `COPY-GLOSSARY.md` §4.
> Trạng thái: **APPROVED + đã áp cho file foundation (W1c)**.

| ID | Chốt |
|---|---|
| **D-A** | **Việt hoá** thuật ngữ in 3D: Slicer/Slicing→"cắt lớp", Infill→"độ đặc", Support→"vật liệu đỡ", Layer→"lớp in", Batch→"lô", Hub→"trung tâm/đầu mối", Studio→"xưởng thiết kế/không gian thiết kế", Score→"điểm", Watertight→"kín nước". **GIỮ** tên phần mềm (`PrusaSlicer`, `Bambu Studio`), tên vật liệu, acronym allowlist. |
| **D-B** | **Giữ ký hiệu `₫`** (code hiện tại qua `formatCurrency`/`Money`); **KHÔNG** đổi `format.ts`. §5.5 dưới đây đã sửa theo `₫`. |
| **D-C** | **Bỏ hẳn English sau `//`** trong eyebrow; nếu giữ `//` thì phần sau phải **tiếng Việt**. |
| **D-D** | Wordmark **`Việt Nam`**; nav label **`Quản trị hệ thống`** (thay `Quản Trị Admin`) và **`Xưởng thiết kế`** (thay `Studio Thiết Kế`) — **không đổi route/slug**. |
| **D-E** | **`Email`** giữ như loanword trong allowlist; `File` → `Tệp`. |
| **D-F** | **Ẩn FAB** (nút Trợ lý tự động) trên route `product_detail` và `personalize` vì 2 màn này có bottom-bar cố định (UI-016). Không đổi route/layout bottom-bar. |

1. **UI tiếng Việt**, câu đầy đủ, không viết tắt tuỳ tiện.
2. Được giữ thuật ngữ (allowlist): `CAD, STL, STEP, STP, 3MF, OBJ, WebGL, GPU, API, SKU, KYC,
   VAT, MES, BOM, PII, RLS, SLA` + **`Email`** (D-E) + `VND` + tên vật liệu
   (`PLA, PETG, ABS, TPU, PA-CF, PVA, Resin`) + công nghệ in (`FDM, SLS, SLA`) + tên phần mềm
   (`PrusaSlicer`, `Bambu Studio`, `SolidWorks`, `Fusion`). Ngoài allowlist ⇒ Việt hoá (D-A).
3. Không dùng các nhãn tiếng Anh đang lẫn: `Pending`, `Verified`, `Live`, `Admin`, `Lab`,
   `Dashboard`, `Settings`, `Profile`, `Commercial`, `Creator`, `Customer`, `Hub`, `Studio`,
   `Score`… → thay bằng tiếng Việt hoặc nhãn kỹ thuật có chú thích. Nhãn nav đích:
   `Quản trị hệ thống`, `Xưởng thiết kế` (D-D, không đổi route).
4. `LanguageContext` đã khoá `vi`; **không mass-codemod 1.195 `isVi ?`** trong đợt này. Chỉ sửa chuỗi **hiển thị**; nhánh `en` còn chết thì ghi nợ, dọn ở đợt code cleanup sau.
5. Format: ngày `dd/MM/yyyy`, tiền **`₫`** (D-B; qua `formatCurrency`/`Money`, không đổi
   `format.ts`), số `vi-VN`, `tabular-nums` cho bảng/KPI.
6. `SEOHead`: title/description/OG locale `vi_VN`; không trộn English.
7. Copy deck + glossary: `docs/tasks/ui-redesign-v3/COPY-GLOSSARY.md` (auditor tạo).

---

## 6. UI defect register & điều kiện thoát

### 6.1 Severity
| Mức | Nghĩa | Ví dụ |
|---|---|---|
| P0 | Chặn dùng / vỡ | tràn ngang 390, modal không cuộn, nút chết, màn trắng |
| P1 | Sai hệ thống / khó hiểu | lệch header/card/control, English lẫn, CTA trùng, thiếu state |
| P2 | Lỗi thị giác rõ | spacing/lệch baseline, badge sai, icon sai cỡ |
| P3 | Nit | micro-alignment, copy nhỏ |

### 6.2 Exit criteria
- 0 P0/P1/P2 **trong phạm vi**; P3 có owner + ticket.
- 30 route × 390/768/1440: 0 tràn ngang, 0 control thiếu label/focus, 0 English ngoài allowlist.
- 4 state (loading/empty/error/success) cho các trang có dữ liệu.
- `npm run lint`, `npm run build`, `npm run check` không hồi quy.
- Screenshot evidence + QA report.

### 6.3 Defect register
`docs/tasks/ui-redesign-v3/UI-DEFECTS.md`, format `UI-001 | P1 | file:line | mô tả | owner | status`.
Auditor tạo; page agent đóng; QA xác minh lại.

---

## 7. Agent ownership (write scopes)

> Nguyên tắc: **một file chỉ một owner tại một thời điểm**; foundation là read-only với page agent.
> Tất cả agent chạy `npm run lint` + `npm run build` trước khi handoff.

| Agent | Wave | Write scope (files/globs) | Nhiệm vụ chính | Depends |
|---|---|---|---|---|
| `ui-auditor` | W0 | `docs/tasks/ui-redesign-v3/**` only | Route matrix 30 route; UI defect register; copy/English inventory; screenshot baseline | — |
| `design-foundation` | W1 | `src/index.css`, `src/frontend/ui/**`, `src/frontend/components/Header.tsx`, `src/frontend/components/{NotFoundView,RouteErrorBoundary,PageSkeleton,CanvasErrorBoundary,SEOHead,ScrollToTop,RoleGuard}.tsx`, `src/App.tsx` (shell/toast/FAB/footer only), `src/frontend/context/LanguageContext.tsx`, `scripts/check-contrast*.mjs`, `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md`, `docs/design/tokens.md`, `docs/design/taste-contract.md` | Token v3; primitive variants; shell; language lock; contrast ledger; design spike 2 trang (worktree tạm, không merge markup) | `ui-auditor` |
| `storefront` | W2 | `views/HomeView.tsx`, `views/ExploreView.tsx`, `components/HorizontalScrollFilter.tsx`, `components/services/ServiceShowcaseSection.tsx`, `components/custom/CustomIdeaRequestModal.tsx`, `components/ChatSupportModal.tsx` | Home/Explore v3; card/category/hero; states; copy | `design-foundation` |
| `pdp-viewer` | W2 | `views/ProductDetailView.tsx`, `views/PersonalizeView.tsx`, `components/personalize/PersonalizeModelViewer3D.tsx`, `components/ThreeModelViewer.tsx`, `components/CadQuickViewModal.tsx`, `components/material/MaterialTechnicalAdvisory.tsx` | PDP/Personalize v3; 3D frame; sticky buy card; responsive | `design-foundation` |
| `commerce-auth` | W2 | `views/{CartView,CheckoutView,OrderSuccessView,OrderTrackingView,MyOrdersView,AssetLibraryView,LoginView,RegisterView}.tsx`, `components/{CartDrawer,InvoiceModal,OrderProgress,AuthModal}.tsx`, `components/auth/UserAvatarMenu.tsx` | Transaction + auth v3; form/label/contrast; states; copy | `design-foundation` |
| `admin` | W3 | `views/AdminDashboardView.tsx`, `components/admin/**` (trừ `groups/` có thể tách), `components/admin/groups/**` | Surface-only: token/radius/shadow/table/form; **không đổi density/layout** | `design-foundation` |
| `ops-consoles` | W3 | `views/DesignerDashboardView.tsx`, `components/designer/**`, `views/WorkshopSettingsView.tsx`, `components/onboarding/WorkshopOnboardingWizard.tsx` | Designer/Lab/Onboarding surface-only; nav/table/kanban | `design-foundation` |
| `tool3d` | W3 | `views/Tool3DView.tsx`, `components/tool3d/**` | Surface-only; HUD/toolbar/frame; **không đổi control/layout/density** | `design-foundation` |
| `review-consistency` | W4 | `docs/tasks/ui-redesign-v3/review/**` only | R1: token/recipe/page consistency; handoff diff | W2+W3 |
| `review-a11y` | W4 | `docs/tasks/ui-redesign-v3/review/**` only | R2: focus/label/contrast/390-768-1440/reduced motion | W2+W3 |
| `integrator` | W5 | Any file **theo quyết định của Lead** | Sửa cross-page issues từ 2 review; không thêm feature | W4 |
| `qa-verify` | W6 | `docs/tasks/ui-redesign-v3/QA-REPORT.md` only | Chạy matrix + gates + language audit; xác minh defect register | W5 |

**Ghi chú tối ưu:**
- Nếu `admin` quá tải (>5 ngày), tách `admin-panels` (AdminDashboard + 9 panel) và `admin-groups` (6 group) — hai write scope rời nhau. Không chạy quá **4 agent build cùng lúc**.
- **`src/App.tsx` là file của foundation.** Page agent không tự sửa App.tsx; nếu cần đổi shell/footer/route wrapper, ghi `SHELL-REQUEST` trong handoff để integrator áp.
- **Design spike chạy trong worktree tạm** (hoặc bản copy ngoài `src/`), chỉ merge token/quyết định + screenshot; không merge markup spike để tránh chồng write scope với `storefront`/`pdp-viewer`.
- `docs/tasks/ui-redesign-v3/PLAN.md` do Lead giữ; agent không sửa plan, chỉ ghi handoff/review/QA report.

---

## 8. Wave plan

| Wave | Thời lượng | Agent chạy | Gate |
|---|---:|---|---|
| W0 — Audit & chốt | 1–2 ngày | `ui-auditor` + Lead | Plan/decision sign-off; defect register; copy glossary |
| W1 — Foundation | 3–4 ngày | `design-foundation` | Token/primitive/shell; spike 2 trang; `lint/build/check`; contrast ledger |
| W2 — Storefront/Detail/Commerce | 4–5 ngày | `storefront`, `pdp-viewer`, `commerce-auth` (3 song song) | Handoff từng agent; 390/768/1440; defect P0/P1 giảm |
| W3 — Consoles | 5–6 ngày | `admin`, `ops-consoles`, `tool3d` (3 song song) | Surface-only; density không đổi; handoff |
| W4 — Review | 1–2 ngày | `review-consistency`, `review-a11y` (2 song song) | Review files; 0 blocker |
| W5 — Integrate | 2–3 ngày | `integrator` | Cross-page consistency; final diff; gates |
| W6 — QA | 2–3 ngày | `qa-verify` | 30×3 matrix; 0 P0/P1/P2; QA report |

**Tổng:** ~3–4 tuần lịch (1 dev equivalent ~20–28 ngày; chạy agent song song rút ngắn nhưng review là bottleneck).

---

## 9. Gate & bằng chứng

| Gate | Cách chạy | Điều kiện |
|---|---|---|
| Typecheck | `npm run lint` | 0 lỗi mới |
| Build | `npm run build` | PASS |
| Repo check | `npm run check` | không hồi quy baseline; live gate có thể bị DNS/Supabase pause |
| Contrast | `node scripts/check-contrast.mjs`, `check-contrast-combos.mjs` | cập nhật ledger token v3; 0 unexpected fail |
| Data honesty | `node scripts/check-fabricated.mjs` | 0 tuyên bố bịa |
| UI rules | `node scripts/check-ui-rules.mjs` | 0 vi phạm mới |
| Screenshot matrix | Chromium headless (có sẵn browser cache) | 30 route × 390/768/1440; 0 overflow |
| Language audit | grep + copy glossary + QA mắt | 0 English ngoài allowlist |
| State audit | screenshot loading/empty/error/success | đủ 4 state ở trang dữ liệu |

> Supabase đang paused: QA dùng empty/fallback state, **không** chặn UI; sau khi Resume mới kiểm dữ liệu thật ở đợt data.

---

## 10. Rủi ro & cách chặn

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| Trộn với diff v2 96 file | Cao | Commit/tag v2 trước; branch riêng; feature freeze |
| Agent sửa trùng file | Cao | Write scope rời; tối đa 4 agent; foundation read-only |
| Admin/Tool3D bị "airy hoá" | Cao | Surface-only; review rubric density |
| Contrast pastel/coral fail | Trung bình | Token ledger + spike; chỉ dùng màu đã đo |
| 3D sáng làm hỏng model | Trung bình | Giữ nền tối; spike riêng nếu muốn sáng |
| Language nửa VI/nửa EN | Trung bình | Copy glossary; QA grep; sửa chuỗi hiển thị, không mass codemod |
| SEO/route bị đổi | Cao | D6: không đổi route/slug/nav label |
| Supabase pause | Trung bình | UI-first, empty states; Resume trước QA data |
| Scope creep feature/data | Cao | Mọi PR chỉ UI; backend/utils ngoài quyền |

---

## 11. Tự review & tối ưu (vì sao plan này khác bản nháp)

1. **Giảm song song:** bản nháp 8–9 agent cùng lúc → dễ conflict như đợt v2 (C2 từng bị cancel). Bản cuối: **tối đa 3–4 agent build/wave**.
2. **Audit trước foundation:** tránh restyle một layout đang lỗi; defect register định hướng sửa.
3. **Design spike 2 trang trước khi đụng 96 file:** PDP + Explore là nơi thể hiện rõ nhất; nếu fail contrast/3D thì dừng sớm.
4. **Primitive variant opt-in** thay vì đổi global: `Card soft`, `SideNav pill`, `Button pill` chỉ dùng đúng bề mặt; console không bị ảnh hưởng.
5. **Không mass-codemod i18n:** UI đã khoá `vi`; chỉ sửa chuỗi hiển thị. Dọn 1.195 `isVi ?` để đợt code cleanup sau.
6. **Giữ 3D nền tối:** tránh re-light toàn bộ model trong wave UI; đây là điểm nhấn hợp lý, không phải lỗi.
7. **Admin/Tool3D surface-only:** bảo toàn density 7; không biến dashboard thành landing page.
8. **Tách reviewer/integrator/QA:** tránh "tự chấm bài"; QA xác minh độc lập defect register.
9. **Exit criteria đo được:** 30×3 route, 0 P0/P1/P2, language allowlist, 4 state, gates.
10. **Feature freeze:** UI xong mới làm data/feature; đúng yêu cầu "UI trước, data sau".

---

## 12. Việc cần bạn chốt

> ✅ **Đã chốt (2026-10-20):** D0=VI, D1=Soft Studio (phương án A), D2=hybrid shell,
> D3=CTA đen + coral brand-only, D4=no-dep, D5=UI-only, D6=không đổi IA/route,
> D7=3D nền tối; và **D-A…D-F đã duyệt** (§5.0). Mục dưới giữ để tra cứu lịch sử.

1. **D0:** UI tiếng Việt duy nhất (mặc định) hay English-only?
2. **D1:** chọn phương án **A** (khuyến nghị) hay B/C?
3. **D2:** hybrid shell (khuyến nghị) hay full sidebar toàn app?
4. **D3:** giữ CTA đen + coral brand-only (khuyến nghị) hay đổi CTA coral?
5. **Thứ tự ưu tiên:** PDP → Explore → Home → transaction/auth → console (khuyến nghị) hay Home trước?

Sau khi bạn chốt, mình sẽ:
- tạo shared task board với write scopes/dependencies;
- spawn `ui-auditor` + `design-foundation` trước (W0–W1);
- chỉ sau khi design spike được duyệt mới mở W2.
