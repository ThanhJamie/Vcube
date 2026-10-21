<!-- doc-meta: status=active; verified=2026-10-20; owner=review-consistency -->
# REVIEW R1 — Cross-page consistency (W4) · cây tích hợp W2+W3

> **Snapshot:** `HEAD 97cc256` + working tree **2026-10-20 13:2x** (159 file dirty, chưa commit).
> Review **read-only**: không sửa `.tsx`/`index.css`/docs khác; chỉ ghi file này.
> Nguồn đối chiếu: `PLAN.md` · `DESIGN-LANGUAGE.md` (v3 LOCKED) · `docs/design/tokens.md` ·
> `docs/design/taste-contract.md` · 6 handoff W1–W3 · `UI-DEFECTS.md` · `COPY-GLOSSARY.md`.
>
> **Gate đã chạy lại trên cây này (không chạy `npm run check` full — live Supabase paused):**
> `npx tsc --noEmit` **PASS** · `check-contrast` **0 unexpected fail** · `check-contrast-combos`
> **SẠCH** (99 file, 14 luật, 0 tổ hợp < 4,5; **20 near-miss** `fg-subtle` 4,56 — khớp handoff) ·
> `check-fabricated` **SẠCH** (139 file) · `check-icon-names` **PASS** (224 glyph) ·
> `check-ui-rules` **PASS** (139 file).
>
> **Cách đọc severity:** `B` = chặn QA/tích hợp (phải sửa trước W5) · `M` = vi phạm hợp đồng v3
> nhìn thấy trên nhiều trang · `m` = lệch cục bộ, sửa rẻ · `N` = nit/doc. Severity **không** ánh xạ
> 1-1 sang P0–P3 của `UI-DEFECTS.md`; chỗ nào lệch tôi ghi rõ lý do để không bị coi là lạm phát.

---

## 0. Tóm tắt

| | |
|---|---|
| **Counts** | **B 1 · M 5 · m 8 · N 5** (tổng 19) |
| **Sạch (đã kiểm, không báo)** | token/radius/z-index, card storefront vs console, `₫` (trừ 2 chỗ), EN trong nhánh `en:` chết, modal/sheet recipe, bảng §3.5, 0 hex/`rounded-[…]`/`text-[10-11px]`/`z-[100]`/`h-screen`, 0 link chết, 0 `alert`/`window.confirm` |
| **Rủi ro lớn nhất** | 3 overlay còn bẫy StrictMode (`AuthModal`/`CartDrawer`/`InvoiceModal`) ⇒ ở dev server nút mở không hiện gì (QA W6 sẽ thấy như "nút chết") |
| **Điểm đáng chú ý về quy trình** | `Card` bị đổi **padding `lg` 20→24px** và **viền `line-subtle`→`line`** ở tầng primitive nhưng không ghi trong handoff ⇒ 3 handoff W3 vẫn khẳng định "density không đổi" (đúng về hàng bảng, không đúng về card) |

---

## 1. Blockers (B)

### CC-01 — `B` · 3 overlay còn bẫy StrictMode `return null` trước `<Modal>` (dev: nút mở không làm gì)

`AuthModal`, `CartDrawer`, `InvoiceModal` đều `return null` khi đóng, nên `<Modal>` **chỉ mount lúc
mở**. Ở dev, StrictMode chạy mount → cleanup → mount; cleanup của `ui/Modal.tsx:268` gọi
`dialog.close()`, sự kiện `close` bắn bất đồng bộ vào listener của lần mount thứ hai ⇒ modal tự
đóng ngay. Đây **đúng** lớp lỗi mà `storefront` (W2-NEW-1) và `pdp-viewer` (W2b) đã đo
(`dialogs open = 0`) và đã sửa ở **8 file** khác (3 overlay đổi từ `{open && <Modal/>}` sang luôn-mount,
`CadQuickViewModal`, 4 modal tool3d). Ba file dưới **chưa** sửa và **không** có trong
bất kỳ handoff nào ⇒ QA W6 (chạy dev server) sẽ thấy Đăng nhập / Giỏ hàng / Hoá đơn không mở.

Bằng chứng: `src/frontend/components/AuthModal.tsx:79` `if (!isOpen) return null;` (Modal ở `:231`)
· `CartDrawer.tsx:40` `if (!isOpen) return null;` (Modal ở `:75`) · `InvoiceModal.tsx:65`
`if (!isOpen || !order) return null;` (Modal ở `:89`). Đối chiếu pattern đã sửa:
`CadQuickViewModal.tsx:47-51` (comment ghi rõ bẫy) và cách ly body.

**Fix (integrator):** tách như `CadQuickViewModal` — outer **luôn** render `<Modal open={isOpen}>`,
inner chỉ mount khi có dữ liệu; hoặc dời guard xuống sau `<Modal>` (render `<Modal open={false}>`
rỗng). Không đổi props/hành vi, không đổi call-site trong `App.tsx`.

---

## 2. Findings

| ID | severity | file:line | issue | fix |
|---|---|---|---|---|
| **CC-01** | **B** | `components/AuthModal.tsx:79` · `components/CartDrawer.tsx:40` · `components/InvoiceModal.tsx:65` | `if (!isOpen) return null;` trước `<Modal>` (`AuthModal:231`, `CartDrawer:75`, `InvoiceModal:89`) ⇒ bẫy StrictMode: ở dev modal mount→cleanup→mount, `dialog.close()` (`ui/Modal.tsx:268`) đóng modal vừa mở. 8 file khác đã sửa cùng lớp lỗi (W2-NEW-1/W2b/W3-NEW-1) | Luôn render `<Modal open={isOpen}>`; tách body component giữ guard dữ liệu (pattern `CadQuickViewModal.tsx:47-53`) |
| **CC-02** | **M** | `components/admin/groups/Group2DesignersPanel.tsx:282` `'Doanh Thu & Sales'`, `:316` `'Pioneer Makers'`, `:324` `'Royalties Ghi Nhận'` · `components/admin/groups/Group5ProductionPanel.tsx:908` `% Match` · `components/admin/groups/Group1WorkshopsPanel.tsx:1933-1935` `<option>active/busy/offline</option>` · `components/admin/PricingConfigPanel.tsx:2634,2647` `placeholder="Min"/"Max"` | Console vẫn hiển thị EN cho operator VI: 3 chuỗi nằm **ngay trong nhánh VI** (`isVi ? 'Pioneer Makers' : …`), 1 nhãn `% Match`, 3 option render **enum thô**, 2 placeholder EN. `admin` handoff §4 khẳng định "0 chuỗi EN hiển thị ngoài allowlist trong scope" và `UI-007` ghi **ĐÓNG** ⇒ claim sai | `Tác giả tiên phong`/`Hoa hồng ghi nhận`/`Doanh thu & bán hàng`; `% khớp`; `Chờ nhận / Đang in / Ngoại tuyến` (hoặc `Sẵn sàng/Đang bận/Ngoại tuyến`); `Nhỏ nhất`/`Lớn nhất`. Cập nhật `UI-DEFECTS` (UI-007 = đóng một phần) |
| **CC-03** | **M** | `components/PageSkeleton.tsx:30` `VCUBE-SYSTEM-INITIALIZING`, `:72` `SHADERS & SLICER COMPILED ON-DEMAND`, `:78` `+ ENGINE: THREE_R185`, `:81` `STATUS: LAZY_CHUNKING_ACTIVE` · `components/NotFoundView.tsx:19` `ERROR 404 • ROUTE NOT FOUND` | Chrome foundation còn EN **không nằm trong nhánh chết** — `PageSkeleton` là fallback `Suspense` của **mọi route lazy** (+ `ProtectedRoute`, UI-001) nên khách VI thấy 4 chuỗi EN mỗi lần tải trang; `SLICER` còn ngoài allowlist (D-A: "cắt lớp") | `ĐANG KHỞI TẠO HỆ THỐNG VCUBE` · `ĐANG BIÊN DỊCH SHADER & CẮT LỚP` · `+ BỘ DỰNG: THREE_R185` · `TRẠNG THÁI: ĐANG NẠP MÃ`; `LỖI 404 • KHÔNG TÌM THẤY ĐƯỜNG DẪN` |
| **CC-04** | **M** | `ui/Card.tsx:52` `lg: 'p-6'` (diff: `p-5` → `p-6`) | Đổi **padding `lg` của primitive** 20→24px, không ghi trong handoff W1 §2.1 (chỉ nêu `variant`), trái `docs/design/tokens.md:160` "`Card` map: sm 12 / md 16 / **lg 20**". Ảnh hưởng 31 call-site `padding="lg"`, trong đó **5 card console** (`admin/groups/Group0OverviewPanel.tsx:258,392,441,523,613`) ⇒ câu "density không đổi" của 3 handoff W3 chỉ đúng với DataTable, không đúng với card | Hoặc trả `lg: 'p-5'` (giữ density console), hoặc cập nhật `tokens.md:160` + `DESIGN-LANGUAGE §3.1` và ghi rõ trong handoff/integrator note. **Không** để code ≠ spec |
| **CC-05** | **M** | `ui/Card.tsx:43` `flat: 'border border-line shadow-e0'` (trước: `border-line-subtle`) · `ui/DataTable.tsx:553` `border border-line` · `ui/EmptyState.tsx:64` `border-line-subtle` · **103** surface tự dựng `border border-line-subtle bg-surface*` (vd `admin/groups/Group2DesignersPanel.tsx:307,316,324`, `admin/PricingConfigPanel.tsx:1130,1331,1485`, `admin/AdminStorefrontPanel.tsx:351,378,405`) vs **50** surface dùng `rounded-lg border border-line bg-surface` | **Hai hệ viền card song song**: primitive (Card/DataTable) đã sang `--color-line` `#E7E3D6`, còn 103 khối panel/card tự dựng (admin/tool3d/designer + EmptyState) vẫn `--color-line-subtle` `#F0EDE3` ⇒ trong cùng một trang, card primitive đậm hơn panel tự dựng. Trước W1 cả hai đều `line-subtle`, nên đây là drift **do wave này tạo ra** | Chốt 1 hệ: card/panel = `border-line`, divider = `border-line-subtle` (đúng §3.1). Sweep `border border-line-subtle bg-surface` → `border border-line bg-surface` (103 chỗ) + `EmptyState.tsx:64`; hoặc revert Card/DataTable về `line-subtle` nếu Lead muốn hairline mảnh hơn (phải sửa cả §3.1/§3.5) |
| **CC-06** | **M** | `views/AdminDashboardView.tsx` + `components/admin/**`: **0** `<h1>`, **0** `PageHeader` (header tự dựng, vd `admin/AdminStorefrontPanel.tsx:125-133` `<h2>`, `AdminSeoPanel.tsx:88-96`) — so với `views/DesignerDashboardView.tsx:63` và `views/WorkshopSettingsView.tsx:1458` dùng `PageHeader` (có `h1`) | Console dùng **2 mẫu page-header khác nhau**: `/admin` (panel header tự dựng `rounded-xl`, không `h1`) vs `/designer` + `/lab` (`PageHeader`). `PLAN §4.2` giao v3 "chuẩn hoá `PageHeader`, `Section`, `Toolbar`" và `UI-036` vẫn treo (`Section`/`Toolbar` **0 import**) ⇒ mỗi màn admin không có heading cấp 1, cấu trúc heading khác toàn app | W5: cho mỗi panel admin dùng `PageHeader` (giữ nguyên `badge` eyebrow + action), hoặc tối thiểu render `<h1 className="sr-only">` = tiêu đề section trong `AdminDashboardView`. Quyết định sống/chết cho `Section`/`Toolbar` (UI-036) |
| **CC-07** | m | `components/Header.tsx:227` `className="lg:flex 2xl:hidden size-10 …"` + `:228` `aria-label="Mở menu & tìm kiếm"` (nút search) và `:301-305` nút hamburger `aria-label="Mở menu điều hướng"` | `UI-027` **vẫn mở** (register: DEFER integrator). Nút search **không có `hidden` gốc** — chỉ `lg:flex` ⇒ dưới `lg` nó vẫn render (`display:inline-block`) cạnh hamburger: **2 nút icon mở cùng một drawer**, 2 `aria-label` khác nhau cho cùng một hành động. Desktop vẫn 2 affordance `/quote` khi announcement bật (nav `Báo Giá In 3D` + `Báo giá ngay →`) | Gộp: mobile chỉ 1 nút mở drawer (search nằm trong drawer); desktop 1 CTA quote. Đây là việc W5 đã được giao — không đóng register trước khi sửa |
| **CC-08** | m | `views/AdminDashboardView.tsx:571` `size-7 … rounded-md bg-primary text-primary-fg` vs `src/App.tsx:470` `size-7 … rounded-md bg-brand text-fg shadow-soft` và `components/Header.tsx:174,331`, `ChatSupportModal.tsx:57` `bg-brand text-fg` | **Brand mark 2 phiên bản**: `/admin` = ô đen `bg-primary`, `/lab` + `/designer` + storefront = ô coral `bg-brand`. D3 chỉ cho coral làm brand mark, nhưng không nói mark console phải khác admin — hiện mark đổi màu khi đổi console | Thống nhất 1 mark cho mọi shell: `bg-brand text-fg` (coral) ở `AdminDashboardView.tsx:571`; console dùng `shadow-e0/e1` thay `shadow-soft` nếu giữ luật "console không soft" |
| **CC-09** | m | `components/Header.tsx:159` `onClick={() => onNavigate(isLoggedIn ? 'tool_3d' : 'login')}` (nhãn `:161` `Báo giá ngay →`) | CTA "Báo giá ngay" đá khách **về `/auth/login`** dù `/quote` nằm trong `publicScreens` (`src/App.tsx:1172-1183`) và nav `Báo Giá In 3D` mở được cho khách ⇒ cùng đích, 2 hành vi. Thêm trùng intent với nav khi announcement bật | Cho CTA gọi cùng handler với nav (`'quote'`/`'tool_3d'`); hoặc bỏ CTA trong announcement bar (1 CTA / viewport) |
| **CC-10** | m | `src/App.tsx:2007` footer `max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12` vs `components/Header.tsx:168` `max-w-7xl` · `components/PageSkeleton.tsx:15` `max-w-[1440px]` vs `HomeView.tsx:354,388,679` `max-w-7xl` | **Container 1440 còn sót** từ thời trước v3: header/hero/lưới sản phẩm = 1280, footer + skeleton = 1440 ⇒ gutter header ≠ footer trên **mọi trang storefront** (ở 1440: header bắt đầu ~112px, footer ~48px) và skeleton nhảy layout khi Suspense xong. `UI-038` (P3) vẫn mở, chỉ nêu skeleton; footer chưa ai nhận | Đổi `App.tsx:2007` + `PageSkeleton.tsx:15` → `max-w-7xl` (+ `md:px-6 lg:px-8` cho khớp header) hoặc thêm token `--container-page`. Đóng UI-038 |
| **CC-11** | m | `views/AdminDashboardView.tsx:515-524` `<Input type="search" size="sm" …>` (viền/bo `rounded-md` 12px) · `ui/Topbar.tsx:29,74` `searchShape="pill"` **0 call-site** | Hợp đồng §3.3: "Search = như Input **nhưng `rounded-full`** (search pill — ngoại lệ duy nhất của control)". Storefront search = pill (`Header.tsx:248`), console search = 12px ⇒ cùng chức năng, 2 hình. `Topbar searchShape="pill"` được thiết kế cho W3 nhưng chưa dùng ở đâu | Bọc `Input` search console bằng `shape`/class `rounded-full` (hoặc dùng `Topbar searchShape="pill"` nếu search chuyển lên topbar). Chỉ search, **không** đổi control khác |
| **CC-12** | m | `views/HomeView.tsx:1346` `bg-surface-inverse-raised/80 border border-line-subtle rounded-full … text-accent`, `:1363,1367` `border border-line-subtle`, `:1403` `border-t border-line-subtle/50`, `:1410` `bg-surface-inverse-raised/70 rounded border border-line-subtle` | Trên **band tối** (`bg-surface-inverse` / `-raised`) vẫn dùng token viền **sáng**: `border-line-subtle` `#F0EDE3` → viền sáng chói thay vì hairline tối; trái bảng chuyển đổi §6 "`border-line-subtle` trên nền tối → `border-on-inverse/15`". `:1410` còn dùng `rounded` trần = **4px** (ngoài thang 8/12/20/28) | Thay bằng `border-on-inverse/15` (hoặc `/10`), `:1410` → `rounded-sm` (8px). Rà lại mọi `line-subtle` trong section `text-on-inverse` |
| **CC-13** | m | `ui/Card.tsx:56` `'cursor-pointer transition-all duration-300 ease-out …'` | Card interactive dùng `transition-all duration-300`: (a) `duration-300` **không thuộc thang token** (`instant/fast/base/moderate/slow` = 100/150/200/250/320), (b) §2.4 quy định hover màu `transition-colors duration-200`, (c) `transition-all` animate cả layout | `transition-shadow duration-200` (+ `motion-reduce:transition-none` đã có). Không đổi hiệu ứng hover `shadow-e1/e2` |
| **CC-14** | m | `views/HomeView.tsx:43` (helper `vnd`) dùng ở `:1122,1130,1239,1242` · `components/CadQuickViewModal.tsx:463` | **Ký hiệu tiền không thống nhất giữa 2 trang**: Home nối tay `` `${formatNumber(v)} đ` `` ⇒ thẻ/bảng catalog Home hiện `1.250.000 đ`, còn `ExploreView`/`ProductDetailView`/`CartView` hiện `1.250.000 ₫` (D-B, `Money`/`formatCurrency`). `4` call-site Home + `1` chỗ `đ/g` ở quick-view. Register `UI-039` ghi **ĐÓNG (policy)** và storefront handoff nói đã đổi `₫` ⇒ còn sót. **Giữ mức m** (register gốc P3; không nâng) nhưng là luật cứng D-B | Thay helper `vnd()` bằng `formatCurrency(v, 'vi-VN')`/`<Money>`; `CadQuickViewModal.tsx:463` → `${formatCurrency(...)}/g` hoặc `₫/g` |
| **CC-15** | N | `ui/Modal.tsx:18` "Bán kính panel: `rounded-modal` = **20px**" · `ui/Section.tsx:8` "`space-y-section` = **24px**" · `views/PersonalizeView.tsx:19-20` "token `line-control` (**#8590A6**, 3.21:1)" | Docblock primitive ghi **giá trị token cũ**: `--radius-modal` = 24 (`index.css:117`), `--spacing-section` = 32 (`:166`), `--color-line-control` = `#8A8078` (`:53`). Page agent đọc các comment này sẽ áp sai | Sửa 3 comment cho khớp `src/index.css` (không đổi code) |
| **CC-16** | N | `src/App.tsx:543` `navLabel="Điều hướng studio tác giả"` · `src/App.tsx:2067` `'Quản Trị Hệ Thống'` vs nav `Header.tsx:72` `'Quản trị hệ thống'` · `components/admin/AccessoriesManager.tsx:196` `• NCC:` · `views/HomeView.tsx:851` badge `HOT` | Nit copy: (a) `studio` là EN trong **aria-label** (D-A: Studio → xưởng thiết kế; D0: aria cũng VI); (b) cùng 1 đích, 2 kiểu hoa/thường (D-D chốt `Quản trị hệ thống`); (c) `NCC` viết tắt tuỳ tiện (COPY-GLOSSARY §1.3); (d) `HOT` là nhãn EN trên card catalog | `Điều hướng xưởng thiết kế tác giả`; đồng bộ `Quản trị hệ thống`; `Nhà cung cấp:`; `NỔI BẬT` |
| **CC-17** | N | `src/App.tsx:2057` `{t('myOrdersTracking', 'Theo dõi đơn hàng thời gian thực', …)}` → `handleNavigate('orders')` | Nhãn hứa **theo dõi** nhưng đích là `/orders` (danh sách đơn), không phải `/tracking`; thêm claim "**thời gian thực**" trong khi tracking không realtime (data-honesty, `UI-DEFECTS §6` đã gỡ "Live Telemetry") | `Đơn hàng của tôi` → `/orders`, hoặc giữ nhãn "Theo dõi đơn hàng" → `handleNavigate('tracking')`; bỏ "thời gian thực" |
| **CC-18** | N | `views/ExploreView.tsx:936` `sticky top-20` vs `views/ProductDetailView.tsx:528` `lg:top-24`, `PersonalizeView.tsx:612`, `CartView.tsx:428`, `CheckoutView.tsx:689` `lg:top-24` | Sticky cột phải không cùng offset: Explore bám sát đáy header (80px), PDP/Personalize/Cart/Checkout chừa 16px (96px + header 80) ⇒ khi chuyển trang, khối sticky "nhảy" 16px | Thống nhất `top-24` (hoặc `calc(var(--header-h)+1rem)`) cho cả 5 chỗ; header storefront = `h-20` |
| **CC-19** | N | `ui/index.ts:43,49,50` export `Section`, `Toolbar`, `ToastViewport`; **0 import** trong `src/frontend/**` | `UI-036` (P3) **vẫn mở**: 3 primitive chết, trong đó `PLAN §4.2` lại giao v3 dùng `Section`/`Toolbar`. Hai đường toast (`ToastViewport` chết vs live-region trong `App.tsx:1912`) | Chốt: xoá `ToastViewport` + `Section`/`Toolbar` khỏi `ui/index.ts`, hoặc dùng thật ở page. Ghi quyết định vào `UI-DEFECTS` |

---

## 3. Đối chiếu `UI-DEFECTS.md` (đóng / còn mở) — không nâng cấp, không tô hồng

| ID | Register | Kết quả kiểm trên cây tích hợp | Bằng chứng |
|---|---|---|---|
| UI-001 | P1 đóng | ✅ **Đóng** | `src/App.tsx:99` `if (loading) return <PageSkeleton />;` |
| UI-002 | P1 đóng | ✅ Đóng về code (chưa xác nhận ảnh 390) | `.mobile-nav-panel` trong `src/index.css` có `overflow-y:auto/max-height:100dvh`; panel `Header.tsx:327` |
| UI-003 | P1 đóng | ✅ **Đóng** | `ServiceShowcaseSection.tsx:48,89,130,171` 4 `badgeVi` VI; render `:335,427,565` |
| UI-004 | P1 đóng (storefront) | ✅ **Đóng cho chuỗi render** | 0 `//` + EN trong JSX/attr render; chỉ còn `CanvasErrorBoundary.tsx:56` (`//` giữa 2 vế VI) và các key từ điển **không dùng** (`LanguageContext.tsx:104,187,195,203` — 0 call-site) |
| UI-005 | P1 đóng | ✅ **Đóng** (Pending/Verified hết khỏi chuỗi render) | `WorkshopOnboardingWizard.tsx` + `Group1WorkshopsPanel.tsx:1473-1474` `Chờ duyệt`/`Đã duyệt` (option label). Lưu ý: `Group1:1933-1935` là lỗi **khác** (enum thô) → CC-02 |
| UI-006 | P1 đóng | ✅ **Đóng** | `RoleGuard` E5–E8 + `AuthModal` E1–E4 VI (grep 0 hit `(Admin)`/`(Creator)`/`(Lab Hub)`/`(Customer)`) |
| UI-007 | P1 đóng | ⚠️ **ĐÓNG MỘT PHẦN** — EN còn trong C31–C35 + 3 chỗ khác | CC-02 (6 vị trí) |
| UI-008 | P1 đóng | ✅ **Đóng** | `ProductDetailView.tsx:582` `hidden space-y-2.5 lg:block` cho CTA card, `:1093` bar `lg:hidden` |
| UI-009 | P1 đóng | ✅ **Đóng** | 0 `Risk Score` render (chỉ comment `ValidationReportPanel.tsx:194`), 0 `Automated Slicer` |
| UI-010 | P1 đóng | ✅ **Đóng** | 0 hit `Standard (Cá`/`Commercial (Thương`/`Publish…` trong chuỗi render; map `LICENSE_LABELS`/`PUBLISH_STATUS_LABELS` |
| UI-011 | P1 đóng | ✅ **Đóng** | 0 hit `Profile In & Slicing`/`Unit Verification`/`Engineering Studio`/`CAD Studio`/`>Share<` |
| UI-012 | P2 đóng | ✅ Đóng | `src/App.tsx:1912-1914` `role="status" aria-live="polite" aria-atomic="false"` |
| UI-013 | P2 đóng | ✅ Đóng | `grep "alert("` = 0 |
| UI-014 | P2 giảm + ngoại lệ | ◐ Giữ nguyên trạng thái (ngoại lệ có ghi) | Raw `<button>` còn nhưng đều có `aria-*`/`focus-visible`; không phát hiện control thiếu nhãn ở 2 file commerce |
| UI-015 | P2 giảm + ngoại lệ | ◐ Không kiểm lại toàn bộ (191 control raw toàn repo; `PricingConfigPanel` vẫn 73) | Ngoại lệ đã ghi ở `admin` handoff §7.1; **đề nghị QA W6 xác nhận AST label** thay vì tin handoff |
| UI-016 | P2 đóng | ✅ Đóng | `src/App.tsx:1135` `FAB_HIDDEN_SCREENS = ['product_detail','personalize']`, FAB `:1889` |
| UI-017 | P2 theo dõi | ✅ Đúng số liệu: near-miss 4,56 giảm **34 → 20** | `check-contrast-combos` (output ở §0) |
| UI-018 | P2 mitigated | ◐ Mitigated, vẫn P2 | `.nav-fade-right` có ở `Header.tsx:193` + `src/index.css`; chưa có overflow menu |
| UI-019 | P2 đóng | ✅ **Đóng** | `AuthModal.tsx:236` `bodyClassName="p-0"`, 0 `overflow-y-auto` lồng |
| UI-020 | P2 đóng | ✅ Đóng (2 modal trong register) | 0 `min-w-[720px]`/`min-w-[640px]`; `InvoiceModal` ẩn cột `<sm` (`sm:min-w-[560px]`). `MachineComparisonModal` vẫn cuộn ngang — **ngoại lệ đã ghi** (tool3d §7.4), không tính |
| UI-021 | P2 đóng | ✅ **Đóng** | `Group5ProductionPanel.tsx:564` `md:min-w-[2100px]` (mobile = danh sách dọc) |
| UI-022 | P2 đóng | ✅ **Đóng** | `DesignerPayoutsTab.tsx:113` `Chưa nối bảng quyết toán — chưa có giao dịch.` |
| UI-023 | P2 đóng | ✅ **Đóng** | 0 `z-[100]`; `ModelViewer3D.tsx:1720` `z-modal` |
| UI-024 | P2 đóng | ✅ **Đóng** | `HomeView.tsx:678` `scroll-mt-20` (header `h-20`) |
| UI-025 | P2 giảm | ◐ Giảm (hotline sang trái), gom cụm vẫn cần `App.tsx` | `HomeView` hotline `bottom-6 left-6`; FAB `bottom-6 right-6` — **chưa** gom 1 cụm, owner W5 |
| UI-026 | P2 đóng | ✅ **Đóng** | `Tool3DView.tsx:1236` `grid-cols-1 min-[380px]:grid-cols-3` |
| UI-027 | P2 **open** | ❌ **VẪN MỞ** | CC-07 |
| UI-028 | P2 đóng | ✅ **Đóng** | 0 hit `Draft Fast`/`Ultra Fine`/`Tree Support`/`Auto Grid`/`Không dùng Support` |
| UI-029 | P3 đóng | ✅ Đóng | `Header.tsx:180,337` `Việt Nam`; footer `src/App.tsx:2015` |
| UI-030 | P3 đóng | ✅ Đóng | `src/App.tsx:2042` `Sàn linh kiện 3D`, `:2116` `© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.` (⚠️ handoff W1 ghi "Sàn **bản vẽ kỹ thuật**" — handoff sai, code đúng) |
| UI-031 | P3 đóng | ✅ Đóng trong chuỗi render | 0 `File` render ở VI (chỉ code identifier/comment/nhánh `en:`) |
| UI-032 | P3 policy | ✅ Đóng (D-E: `Email` giữ) | — |
| UI-033 | P3 đóng | ✅ Đóng | `grep "Close CAD inspector"` = 0 |
| UI-034 | P3 đóng | ✅ Đóng | 0 hit `CHRONICLE`/`FAST ESTIMATOR`/`CUSTOM CAD //` |
| UI-035 | P3 đóng | ✅ Đóng | 0 hit `ARDUINO-CASE` |
| UI-036 | P3 **open** | ❌ **VẪN MỞ** | CC-19 |
| UI-037 | P3 đóng (phần) | ✅ `Mật Độ Infill` → `Độ đặc` | 0 hit render |
| UI-038 | P3 **open** | ❌ **VẪN MỞ** | CC-10 |
| UI-039 | P3 đóng (policy) | ⚠️ Policy đóng, **code còn 2 chỗ `đ`** | CC-14 |
| UI-040 | P2 đóng | ✅ **Đóng** | 0 hit `Render Error`; `CanvasErrorBoundary` VI |
| UI-041 | P3 đóng | ✅ Đóng | `Header.tsx:72` `Quản trị hệ thống`, `:67` `Xưởng thiết kế` |

**Kết luận register:** 41 mục → **36 đóng/giảm đúng**, **3 còn mở có chủ** (UI-027, UI-036, UI-038),
**2 đóng chưa trọn** (UI-007 → CC-02, UI-039 → CC-14). Không có mục P0/P1 nào bị "đóng khống" ngoài UI-007.

---

## 4. Verified clean — **đừng báo lại** (chống false positive)

1. **Token:** `src/index.css` `@theme static` khớp tuyệt đối `DESIGN-LANGUAGE §1–§2` (canvas `#F6F7EF`,
   surface `#FFFDF9`, muted `#F5F4EC`, line `#E7E3D6`/`#F0EDE3`/`#8A8078`, fg `#1C1917/#57534E/#746E68`,
   brand `#E8624A`, 4 `tile-*`, radius 8/12/20/28/modal 24/full, `shadow-soft`, `--z-*` 10–60, thang chữ
   12–38, `--spacing-section/block/label`). `@utility z-*` đủ 6 bậc. `tone.ts` đã xoá, 0 `chrome`/tone cũ,
   0 dark theme.
2. **Không hex trong class:** 80 hit hex đều là **dữ liệu** (swatch `colorHex`, palette vật liệu, màu
   material 3D, 4 path SVG Google OAuth bị gate, `ctx.fillStyle` canvas 2D) — đúng ngoại lệ §5.
   0 `rounded-[Npx]`, 0 `text-[10px]/[11px]`, 0 `min-h-screen/h-screen`, 0 `z-[100]`.
3. **Card theo bề mặt:** 12/12 view storefront–transaction–auth **chỉ** dùng `variant="soft"`
   (Home 8/8, Explore 9 soft/8 Card, PDP 6/6, Personalize 7/7, Cart 5/5, Checkout 7/7, Success 2/2,
   Tracking 7/7, MyOrders/Assets/Login/Register 1/1). Console admin/designer/tool3d: **0** `soft`,
   **0** `shadow-soft` trong `components/admin` + `components/tool3d`.
4. **Pill:** `Button shape="pill"` chỉ ở `HomeView.tsx:791,805` (chip danh mục) — đúng "nav/search/chip".
   Không CTA/form nào pill; 0 `rounded-full bg-primary` trên phần tử CTA (các hit là chấm trạng thái/badge).
5. **Coral:** 7 hit `bg-brand`, tất cả là **brand mark** (`Header.tsx:174,331`, `App.tsx:470,1900`,
   `ChatSupportModal.tsx:57`, `ExploreView.tsx:602` chấm eyebrow); **0 `text-brand`**, 0 chữ trắng trên coral.
6. **Shell height:** storefront header `h-20` (80) + nav/search pill; console `Topbar h-14` (56) +
   `SideNav w-60` + `AppShell` content `max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6`. **Không** có thanh
   mobile 112px: mọi shell truyền `topbar={({openNav}) => …}` nên `AppShell` bỏ `mobileTrigger`
   (`AppShell.tsx:97-110`) — chỉ 1 nút mở drawer/nav.
7. **Bảng §3.5:** console đi qua `DataTable` (header `h-10`, cell `h-10.75` + viền = 44px, cột số
   `text-right font-mono tabular-nums`, `thead bg-surface-muted text-xs uppercase text-fg-subtle`).
   2 bảng storefront tự dựng (`HomeView.tsx:1180`, `ExploreView.tsx:1290`) **khớp đúng** recipe đó
   (chỉ đổi wrapper sang card soft) — không phải drift.
8. **Form primitive:** `Input`/`Select` = `h-10 rounded-md border-line-control` +
   `focus:border-primary focus-visible:ring-2`; `Field` = `gap-2`, label `text-sm font-medium`, hint
   `text-xs fg-subtle`, error + `aria-describedby`. Control raw ở storefront đều có `aria-label`/`htmlFor`
   (`PersonalizeView.tsx:709` engraving, `:817` range, `CheckoutView.tsx:495,522,551,634` radio/checkbox
   có `id` + label) — ngoại lệ hợp lệ, không phải UI-014/015.
9. **Điều hướng/active:** Header nav active = `rounded-full bg-surface font-semibold shadow-soft`
   (`Header.tsx:203-205`), drawer active pill trên `bg-canvas`; `SideNav variant="pill"` = `bg-canvas`,
   active `bg-surface shadow-soft`, bỏ vạch dọc; segmented 3 chỗ (Designer/Lab/Kanban + tab PDP) đúng §3.6;
   0 `border-b-2` cho nav (chỉ còn trong `PageHeader.tsx:56` — nhánh `tabs` **0 call-site**).
10. **Link/hành vi chết:** 0 `href="#"`/`to="#"`, 0 `alert(`, 0 `window.confirm`, 0 `{x && <Modal>}`;
    link `/admin/queue`,`/admin/machines` đã sửa về `/lab`,`/lab/machines`; không tạo link `/terms`
    (không có route) — đúng tinh thần "no dead link".
11. **Nhánh EN chết — KHÔNG tính là lỗi:** mọi `isVi ? 'VI' : 'EN'` (1.195 chỗ, PLAN §5.4 cho phép);
    `LanguageContext` key **không có call-site** (`heroPreTitle:104`, `calcUploadFullCTA:181`,
    `sectionTaxonomyPre:187`, `sectionCuratedPre:195`, `sectionWorkflowPre:203`) ⇒ "Taxonomy // Phân Loại",
    "Tải File STL…", "Curated Works…" **không render**; `ServiceShowcaseSection.specsEn`,
    `CustomIdeaRequestModal` "Ingestion & IP Confidentiality Protocol:" (`:242`),
    `CadQuickViewModal:290` "Added … to cart!", `Tool3DView:885` `status: 'Ready'|'Needs Fix'`
    (không component nào đọc `analysis.status`) — tất cả là nhánh/dữ liệu chết.
12. **Ngoại lệ đã duyệt, đừng báo:** tên bảng/cột DB trong copy giải thích admin
    (`pricing_global_settings`, `verified_status`, `workshop_machines.hourly_rate`,
    `customer_profiles.nda_signed`) · slug SERP mô phỏng `› quote › 3d-printing` · tên riêng/hãng
    (`Bambu Lab`, `Formlabs`, `Elegoo`, `Anycubic`, `3MF Consortium`, `Supabase`, `Schema.org`) ·
    `Email` (D-E) · pattern slicer `Gyroid/Grid/Honeycomb` (giá trị gửi pricing engine) ·
    `Kanban` (giữ có ghi chú) · swatch màu lấy từ DB · `PageSkeleton size-16 rounded-lg`
    (A19 cho phép 0,63) · `MachineComparisonModal` cuộn ngang 390 (ngoại lệ tool3d §7.4) ·
    `InternalCostBreakdownModal`/`StlVs3mfComparisonModal` đã chuyển card list <md.

---

## 5. Phương pháp & giới hạn

- **Đọc:** 2 spec + 2 doc design + **6/6 handoff** + register + glossary; đọc code 159 file dirty
  (`git diff` cho `ui/**`, `App.tsx`, `Header.tsx`, DataTable, Card, AppShell) + grep toàn `src/frontend`.
- **Quét tự động:** AST TypeScript (`ts.createSourceFile`) cho JSX text + `aria-label/title/placeholder/
  label` để loại nhánh `isVi` chết (113 candidate; sau khi soi thủ công, phần còn lại nằm ở
  CC-02/CC-03/CC-16); grep cho hex/radius/pill/
  `z-[100]`/modal-mount/`alert`/`href="#"`; đếm `border-line-subtle` (173 full-border, **103** card-ish)
  vs `border-line` (50) để định lượng CC-05.
- **Gate:** chỉ chạy gate offline (`tsc`, contrast, combos, fabricated, icon, ui-rules). **Không** chạy
  `npm run check` full / `verify-rls` / `inspect-db` (Supabase paused) và **không** build để tránh ghi
  `dist/` trong phiên read-only.
- **Không có bằng chứng browser** (máy không có Playwright; ảnh của W2/W3 nằm ở `/tmp`, không đọc lại
  được trong phiên này) ⇒ mọi kết luận là **tĩnh trên code**; các mục cần mắt người (drawer 390, sticky,
  kanban 390) giữ nguyên trạng thái `verify-in-browser` của register, **không** tự đóng.
- **Line number** theo working tree lúc review; mỗi mục kèm chuỗi trích dẫn để tìm lại sau khi W5 sửa.
- **Không sửa** `.tsx`/`index.css`/docs khác; không commit. Chỉ tạo file này.
