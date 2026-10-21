<!-- doc-meta: status=active; verified=2026-10-20; owner=ui-auditor -->
# UI-DEFECTS — Sổ lỗi UI W0 (P0–P3) · snapshot 2026-10-20

> **Snapshot:** `HEAD 97cc256` + working tree lúc **2026-10-20 11:2x** (`design-foundation` W1 đang sửa
> `src/App.tsx`, `Header.tsx`, `src/index.css`; line number có thể lệch — mỗi dòng kèm **chuỗi trích dẫn**
> để tìm lại). Không có defect nào được bịa: mỗi mục có `file:line` đọc trực tiếp từ code.
>
> **Phương pháp:** đọc code tĩnh (`grep`/đọc file), chạy `node scripts/check-contrast.mjs` +
> `node scripts/check-contrast-combos.mjs`. **Không** chạy browser (Supabase paused; W0 read-only) ⇒
> mục nào cần xác nhận thị giác ghi `verify-in-browser`.
>
> **⚠️ Register sống:** trong lúc audit, `design-foundation` (W1) đã đọc register và **đóng 3 mục**
> (UI-002, UI-012, UI-017 — xem cột "Trạng thái" trong bảng). Số dòng đã cập nhật lại theo
> working tree **11:3x**; các mục còn lại vẫn đúng snapshot 11:2x.
>
> **Severity (theo PLAN §6.1):** P0 = chặn dùng/vỡ (tràn 390, modal không cuộn, nút chết, màn trắng) ·
> P1 = sai hệ thống/khó hiểu (English lẫn, CTA trùng, thiếu state) · P2 = lỗi thị giác rõ · P3 = nit.

## 0. Tổng hợp

| Severity | Số lượng | Ghi chú |
|---|---:|---|
| **P0** | **0** xác nhận tĩnh | 2 ứng viên P0 cần browser (xem §5); **không** nâng cấp khi chưa có ảnh |
| **P1** | **11** (1 đã đóng: UI-002) | English hiển thị lẫn VI + 2 lỗi state/CTA |
| **P2** | **18** (2 đã đóng: UI-012, UI-017) | primitive drift, a11y, overlap FAB, contrast sát ngưỡng, scroll lồng, lỗi hiển thị EN |
| **P3** | **12** | nit copy / dead primitive / z-index ngoài thang / ký hiệu tiền tệ / nav label |
| **Tổng** | **41** | **còn mở 38** · P0/P1/P2 còn mở = 26 ⇒ vượt yêu cầu tối thiểu 15 |

**Điều kiện thoát (PLAN §6.2):** 0 P0/P1/P2 trong phạm vi. Sau W1–W6, `qa-verify` phải đóng từng dòng
bằng ảnh 390/768/1440, không chỉ sửa code.

> ✅ **Cập nhật W1c (2026-10-20, `design-foundation`, Lead duyệt D-A…D-F):** đóng **UI-016** (P2),
> **UI-030** (P3), **UI-041** (P3); đóng **nửa RoleGuard của UI-006** (E5–E8; nửa `AuthModal` vẫn
> thuộc W2 commerce-auth). UI-027 **defer integrator**. Xem §7.

---

## 1. P0 — chặn dùng / vỡ

**Không có defect P0 xác nhận bằng đọc code.** Các mục từng bị nghi là P0 đã được kiểm và **không** phải
lỗi hiện tại (xem §6 "Đã kiểm, không phải defect"). Hai ứng viên cần browser xác nhận trước khi nâng P0:

| Ứng viên | Vì sao có thể là P0 | Cách xác nhận |
|---|---|---|
| ~~UI-002 (mobile drawer cắt nội dung)~~ | ~~Có thể chặn Đăng xuất~~ → **đã sửa bởi W1** lúc 11:3x (`src/index.css:446-470`) | Chỉ còn **regression check** 390×667 |
| UI-001 (`ProtectedRoute` màn trắng) | Header/`RoleGuard` có loading, `ProtectedRoute` trả `null` ⇒ trắng toàn màn | Hard-refresh `/orders` khi mạng chậm/Supabase paused; nếu trắng >300ms → nâng **P0** |

---

## 2. P1 — sai hệ thống / khó hiểu

| ID | Severity | file:line | Defect | Owner wave | Acceptance |
|---|---|---|---|---|---|
| **UI-001** | P1 | `src/App.tsx:93-101` (chuỗi `if (loading) return null;`); đối chiếu `src/frontend/components/RoleGuard.tsx:39-44` | `ProtectedRoute` trả **`null`** khi đang khôi phục phiên ⇒ `/orders`, `/assets` trắng màn hình; `RoleGuard` cùng chức năng lại có khối "Đang xác thực phiên đăng nhập…" ⇒ bất đối xứng guard | W1 foundation | `ProtectedRoute` render `PageSkeleton`/loading khối giống RoleGuard; không còn `return null`; ảnh 390 + 1440 |
| **UI-002** | P1 | ~~`Header.tsx:322-327` + `src/index.css:438-458`~~ → **nay** `src/index.css:446-470` (`.mobile-nav-panel` có `max-height:100dvh; overflow-y:auto; overscroll-behavior:contain`; comment ghi rõ `UI-002 (P1)`), `Header.tsx:322-327` (panel id/class) | ~~Drawer mobile không cuộn được ⇒ nút Đăng xuất/Đăng nhập bị cắt trên 390×667~~ **✅ ĐÃ SỬA (W1, 2026-10-20)**: panel cuộn được, giới hạn `100dvh`, không lây scroll nền | W1 foundation | Xác nhận regression: ảnh 390×667 tài khoản admin, cuộn tới nút cuối |
| **UI-003** | P1 | `src/frontend/components/services/ServiceShowcaseSection.tsx:37` (`badgeVi: 'ON-DEMAND MANUFACTURING'`), `:78` (`CONCEPT TO PROTOTYPE`), `:119` (`VERIFIED CAD ASSETS`), `:160` (`TOLERANCE & METROLOGY`) | Badge VI của 4 dịch vụ storefront là **tiếng Anh thuần** (không thuộc allowlist) và render ở VI mode (`:325`,`:413`,`:544`) | W2 storefront | Badge VI tiếng Việt (hoặc nhãn kỹ thuật có chú thích); ảnh Home section dịch vụ 390/1440 |
| **UI-004** | P1 | `HomeView.tsx:361` (`'VCUBE PRECISION ANTHOLOGY // 2026'`), `:655` (`VCUBE CAD CATALOG // INDUSTRIAL ARCHIVE`), `:1305` (`SẴN SÀNG SẢN XUẤT // RAPID FABRICATION`); `MyOrdersView.tsx:138` (`VCUBE MES ARCHIVE // CLIENT FABRICATION RECORDS`); `PersonalizeView.tsx:428` (`VCUBE STUDIO // PERSONALIZATION`); `Tool3DView.tsx:616` + `:939` (`Automated Slicer & Geometry QA // VCUBE Mesh Engine v2.6`); `ServiceShowcaseSection.tsx:253,406,592,610` | Eyebrow VI **cố ý ghép tiếng Anh sau `//`** (Vietnamese + English cùng dòng) — vi phạm "một ngôn ngữ" (PLAN §5.1–5.3) | W2 (storefront/PDP) + W3 (tool3d) | VI-only; nếu giữ dạng `//` thì phần sau `//` là tiếng Việt; quét lại `grep "//"` không còn hit EN |
| **UI-005** | P1 | `onboarding/WorkshopOnboardingWizard.tsx:465` (`chờ Quản trị viên duyệt (Pending)`), `:508` (`Chờ duyệt Pending`), `:575` (`<strong>Pending</strong>`), `:1359` (`Pending (Chờ Admin Duyệt)`), `:1399` (`<strong>Pending</strong>` + `<strong>Verified</strong>`); `admin/groups/Group1WorkshopsPanel.tsx:1473` (`Chờ duyệt (Pending)`), `:1474` (`Đã duyệt (Verified)`) | Trạng thái duyệt xưởng hiển thị tiếng Anh cho người dùng VI (onboarding là màn khách hàng/xưởng, không phải code-only) | W3 ops-consoles | Nhãn VI: "Chờ duyệt"/"Đã duyệt"; giữ `verified_status` chỉ trong code/DB, không render thô |
| **UI-006** | P1 | `components/AuthModal.tsx:200` (`Quản Trị Viên (Admin)`), `:207` (`Tác Giả 3D (Creator)`), `:214` (`Xưởng In MES (Lab Hub)`), `:221` (`Khách Hàng (Customer)`); `components/RoleGuard.tsx:67` (`Quản trị viên (ForgeControl Admin)`), `:69` (`Tác giả thiết kế 3D (Creator)`), `:72` (`Xưởng in / Đối tác sản xuất (3D Print Lab)`), `:74` (`Khách hàng (Customer)`) | Nhãn vai trò hiển thị cho người dùng lẫn tiếng Anh trong ngoặc (`Admin`, `Creator`, `Lab Hub`, `Customer`, `3D Print Lab`) | W3 (RoleGuard) + W2 (AuthModal) | VI-only hoặc tên vai trò kỹ thuật đã chú thích; ảnh màn từ chối role + AuthModal |
| **UI-007** | P1 | `admin/AdminStorefrontPanel.tsx:129` (`LANDING PAGE CMS // STOREFRONT`), `:138` (`Landing Page CMS sửa được những gì?`), `:182` (`Hero & Chỉ Số Đo Kiểm`), `:270` (`Badge Trên Cùng Của Hero`), `:283` (`Headline Line 1`), `:295` (`Headline Highlight`), `:307` (`Hero Subheadline`), `:320` (`Primary CTA Text`), `:332` (`Secondary CTA Text`), `:777` (`Trust Partners Banner Title`); `admin/AdminSeoPanel.tsx:92` (`SEO CONSOLE // SERP & METADATA`), `:94` (`Google Search & Social Media Ready`), `:567` (`VCUBE.VN // PRECISION MANUFACTURING`); `admin/AdminSettingsPanel.tsx:248` (`APP_SETTINGS // PHÁP LÝ`); `admin/AdminProductsPanel.tsx:462,587,735` (`⚠ Thiếu Profile Slicing`), `:599` (`Đang Mở Bán (Published)`); `admin/PricingConfigPanel.tsx:326` (`Review file & Slicing`), `:328` (`Tách Support`), `:344` (`Tỷ lệ Support`); `admin/WorkshopEstimatorBOM.tsx:437` (`Số Lượng Đặt In (Batch)`); `admin/groups/Group5ProductionPanel.tsx:1130` (`Độ Đặc (Infill)`) | Console hiển thị nhiều nhãn tiếng Anh cho operator VI; mật độ dày nên dễ lọt | W3 admin + ops-consoles | Nhãn VI thuần (giữ `Slicer/Infill/Support` nếu được duyệt là thuật ngữ ngành — xem COPY-GLOSSARY §4); ảnh `/admin` + `/admin/storefront-cms` |
| **UI-008** | P1 | `views/ProductDetailView.tsx:716` (`Mua & Tải File CAD Ngay`), `:733` (`Cấu Hình Đặt In 3D Hoàn Thiện`), `:1007-1031` (mobile bar: `CAD` + `Đặt In 3D`) | **CTA trùng intent**: trên 390, buy card (2 CTA mua/tải + cấu hình in) **và** fixed bottom bar (`CAD`, `Đặt In 3D`) cùng hiển thị ⇒ 4 nút mua cùng lúc | W2 pdp-viewer | Một CTA chính / viewport; mobile bar thay thế card CTA (ẩn CTA trong card dưới `lg`) hoặc card thu gọn; ảnh 390 |
| **UI-009** | P1 | `views/Tool3DView.tsx:1863` (`<th>Risk Score</th>`), `:616` + `:939` (`Automated Slicer & Geometry QA // VCUBE Mesh Engine v2.6`); `components/tool3d/StlVs3mfComparisonModal.tsx:49` (`Thông số Slicer & Print Settings`), `:51` (`Lưu cấu hình Infill, Layer, Support`), `:53` (`… Bambu Studio`) | Header cột + HUD + modal so sánh hiển thị tiếng Anh / từ ngoài allowlist (`Risk Score`, `Print Settings`, `Layer`) | W3 tool3d | `Điểm rủi ro`, `Cài đặt in`, `Lớp in`; ảnh `/quote` bảng lịch sử + modal STL vs 3MF |
| **UI-010** | P1 | `components/designer/DesignerModelsManagerTab.tsx:429-431` (`Standard (Cá nhân)`, `Commercial (Thương mại)`, `Exclusive (Độc quyền)`), `:444-446` (`Published (Đã xuất bản)`, `Under Review (Chờ duyệt)`, `Draft (Bản nháp)`); `components/designer/DesignerUploadWizardTab.tsx:406` (`Commercial (Thương Mại)`) | Nhãn giấy phép & trạng thái xuất bản hiển thị tiếng Anh trước tiếng Việt | W3 ops-consoles | VI đứng trước, hoặc chỉ VI ("Thương mại", "Đã xuất bản", "Chờ duyệt", "Bản nháp"); ảnh `/designer/models` |
| **UI-011** | P1 | `views/ProductDetailView.tsx:307` (`<span className="font-mono">Share</span>`), `:524` (`Profile In & Slicing`); `components/tool3d/StlUnitConfirmModal.tsx:47` (`Xác Nhận Đơn Vị Đo STL // Unit Verification`); `components/tool3d/QuoteSummaryPanel.tsx:302` (`VCUBE Engineering Studio`), `:542` (`Tree Support (Dễ bóc)`), `:544` (`Không dùng Support`); `components/tool3d/ModelViewer3D.tsx:1798-1799` (`CAD Studio`) | Nút chia sẻ và nhãn kỹ thuật còn tiếng Anh trong luồng mua/báo giá | W2 pdp-viewer + W3 tool3d | `Chia sẻ`; `Hồ sơ in & cắt lớp`; `Xác nhận đơn vị đo STL` (bỏ `// Unit Verification`); `Studio kỹ thuật VCUBE`; ảnh PDP + `/quote` |

---

## 3. P2 — lỗi thị giác / hệ thống rõ

| ID | Severity | file:line | Defect | Owner wave | Acceptance |
|---|---|---|---|---|---|
| **UI-012** | P2 | ~~`src/App.tsx:1899`~~ → **nay** `src/App.tsx:1902-1906`: `role="status" aria-live="polite" aria-atomic="false"`; đối chiếu `ui/ToastViewport.tsx:3` (vẫn dead, 0 import) | ~~Toast stack không có live-region~~ **✅ ĐÃ SỬA (W1, 2026-10-20)**: container toast có `role=status` + `aria-live=polite` + `aria-atomic=false`; comment ghi rõ lý do mount sẵn vùng live | W1 foundation | QA đọc thử nghiệm screen reader/NVDA: toast success/error được đọc; quyết định xoá/giữ `ToastViewport` (UI-036) |
| **UI-013** | P2 | `views/LoginView.tsx:163` (`onClick={() => alert(...)}`) | Dùng `alert()` native (chặn UI, không style, không a11y nhất quán) cho luồng quên mật khẩu; cũng là đường thoát duy nhất khi không có email | W2 commerce-auth | Thay bằng `InfoTip`/`confirm`/trạng thái inline; 0 `alert(` trong `src/frontend` |
| **UI-014** | P2 | Raw `<button>` nhiều bề mặt: `components/AuthModal.tsx` **14** (`:289,307,322,336,359,373…`), `components/auth/UserAvatarMenu.tsx` **13** (`:118,183,201,219,251…`, 0 `<Button>`), `views/Tool3DView.tsx` **16** (`:243,268,1119,1265,1354,1432…`), `views/ExploreView.tsx` **14**, `views/HomeView.tsx` **9** | Drift primitive: cùng hành vi nhưng raw markup ⇒ thiếu variant/focus/disabled/loading; là gốc của lệch trạng thái ở W2–W3 | W2/W3 theo file + W1 primitive | Bề mặt sửa đổi chuyển sang `Button` khi cùng hành vi; ngoại lệ (toolbar 3D dày đặc) ghi lý do trong handoff |
| **UI-015** | P2 | `admin/PricingConfigPanel.tsx` **73** raw `<input>/<select>` (`:1169,1196,1220,1244,1355…`), `admin/AccessoriesManager.tsx` **25**, `admin/AdminStorefrontPanel.tsx` **10** | Input/select raw thay vì `Field`+`Input`/`Select` ⇒ label/aria/contrast mỗi nơi một kiểu; nguồn rủi ro a11y lớn nhất console | W3 admin | Form sửa đổi dùng `Field`+`Input/Select`; raw còn lại phải có `<label htmlFor>` + aria |
| **UI-016** | P2 | `src/App.tsx:1885` (FAB `fixed bottom-6 right-6 z-drawer`), `views/ProductDetailView.tsx:1007` (bar `fixed bottom-0 … z-sticky`), `src/index.css:174` (`--z-drawer: 40` > `--z-sticky: 10`) | FAB (z 40) nằm **trên** thanh mua cố định (z 10) của PDP/Personalize; logic tự ẩn chỉ chạy sau 400ms/scroll-settle (`App.tsx:996`) ⇒ nhấp nháy/che `Đặt In 3D` ở 390 | W1 foundation | Ẩn FAB trên route có bottom-bar (`product_detail`/`personalize`) hoặc nâng bar lên `z-drawer`; ảnh 390 |
| **UI-017** | P2 | ~~`src/index.css:42` `--color-surface-muted: #F5F5F4`, `:61` `--color-fg-subtle: #746E68`~~ → **nay** `src/index.css:39` `--color-canvas:#F6F7EF`, `:40` `--color-surface:#FFFDF9`, `:42` `--color-surface-muted:#F5F4EC`, `:61` `--color-fg-subtle:#746E68`; ledger tại `src/index.css:30-63` ghi `fg-subtle 4.67/4.95/4.56`; `check-contrast.mjs` 0 unexpected fail; `check-contrast-combos.mjs` 0 vi phạm nhưng **34 chỗ 4,56:1** (sát ngưỡng); cấm `fg-subtle` trên `line-subtle` (4.30)/tint (4.29–4.44) | ~~Token sát ngưỡng, canvas v3 sẽ fail~~ **✅ ĐÃ XỬ LÝ Ở LEDGER (W1, 2026-10-20)**: token v3 đã đo lại ≥4.5:1; còn **theo dõi** 34 vị trí 4,56:1 khi W2/W3 thêm bề mặt | W1 foundation + QA | QA chạy lại 2 script contrast sau mỗi wave: 0 unexpected fail; nếu thêm chỗ `fg-subtle` trên tint/pastel → FAIL; không hạ xuống `fg-subtle` khi chưa đo |
| **UI-018** | P2 | `components/Header.tsx:193` (`[scrollbar-width:none]` trên nav `overflow-x-auto` + `nav-fade-right`), `src/index.css:192` (`.nav-fade-right`); logic auto-scroll chỉ cho item active (`:87-99`) | Ở 1024–1279 (`lg`–`xl`), nav VI dài (`Khám Phá`, `Báo Giá In 3D`, `Đơn Hàng`, `Xưởng in`, `Studio Thiết Kế`, `Quản Trị Admin`) **bị cắt** nhưng thanh cuộn bị ẩn ⇒ không có affordance "còn mục nữa" | W1 foundation | **◐ GIẢM (W1, 2026-10-20):** đã thêm `.nav-fade-right` (gradient mép) — cần `verify-in-browser` 1024 để xác nhận fade đủ rõ; nếu chưa, đổi overflow menu |
| **UI-019** | P2 | `components/AuthModal.tsx:353` (`flex-1 space-y-5 overflow-y-auto p-6`) nằm trong body của `ui/Modal.tsx:346` (`min-h-0 flex-1 overflow-y-auto`) | **Hai lớp `overflow-y-auto` lồng nhau** trong AuthModal ⇒ double scrollbar/scroll bị "nuốt" trên 390; nội dung dài (4 mode auth) | W2 commerce-auth | Chỉ còn 1 vùng cuộn (bỏ overflow ở inner hoặc dùng `bodyClassName` truyền đúng); ảnh 390 |
| **UI-020** | P2 | `components/InvoiceModal.tsx:190-191` (`overflow-x-auto` + `min-w-[720px]`), `components/tool3d/InternalCostBreakdownModal.tsx:222-223` (`min-w-[640px]`) | Bảng rộng cố định trong modal ⇒ trên 390 phải **cuộn ngang trong modal** (nested scroll); cột tiền quan trọng nằm ngoài màn hình | W2 commerce-auth (Invoice) + W3 tool3d | 390: bảng chuyển card/list hoặc sticky cột đầu; ảnh 390 |
| **UI-021** | P2 | `admin/groups/Group5ProductionPanel.tsx:563-564` (`overflow-x-auto` + `min-w-[2100px]`) | Kanban 8 nấc rộng **2100px** trên mobile; điều phối kéo-thả trong vùng cuộn ngang 2 chiều rất khó dùng (density console hợp lệ, nhưng 390 cần lối khác) | W3 admin | 390: danh sách theo stage (không kéo ngang) hoặc cột thu gọn; `verify-in-browser` |
| **UI-022** | P2 | `components/designer/DesignerPayoutsTab.tsx:106-108` (`Dữ liệu mẫu — chưa nối bảng quyết toán thật.`) + `:31` (`PAYOUT_TRANSACTIONS` = `[]` tại `mockData.ts:225`) | Banner **nói "Dữ liệu mẫu"** nhưng bảng **rỗng** (fixture đã bị gỡ) ⇒ tự mâu thuẫn, người dùng tưởng có dữ liệu mẫu | W3 ops-consoles | Đổi thành "Chưa nối bảng quyết toán — chưa có giao dịch"; ảnh `/designer/payouts` |
| **UI-023** | P2 | `components/tool3d/ModelViewer3D.tsx:1712` (`z-[100]` fullscreen), `src/index.css:171-176` (thang `--z-sticky…--z-toast` 10–60) | Fullscreen 3D dùng **z-index ngoài thang token** (100) ⇒ vượt cả `z-toast` (60); trái quy ước §4.7 và dễ chồng lớp khi thêm popover | W3 tool3d | Dùng `z-modal`/token ≥ toast hợp lý (hoặc thêm token `--z-fullscreen`); 0 `z-[100]` |
| **UI-024** | P2 | `views/HomeView.tsx:647` (`scroll-mt-16`) vs `components/Header.tsx:167` (`sticky … h-20` = 80px) | Anchor `#browse-cad-catalog` chỉ chừa **64px** trong khi header **80px** ⇒ tiêu đề section bị che 16px khi cuộn tới | W2 storefront | `scroll-mt-20` (hoặc token `--header-h`); `verify-in-browser` |
| **UI-025** | P2 | `views/HomeView.tsx:1383` (hotline `fixed bottom-24 right-6 z-drawer`), `src/App.tsx:1885` (FAB `fixed bottom-6 right-6 z-drawer`) | Hai nút nổi **cùng góc phải** trên Home desktop: hotline (bottom-24) + FAB (bottom-6); khi hotline dài (số + icon) có thể chồng/che nhau, và tạo 2 lớp CTA nổi cạnh tranh | W1 foundation | Gom về một cụm (hotline trong FAB/menu) hoặc ẩn FAB khi có hotline; ảnh 1440 |
| **UI-026** | P2 | `views/Tool3DView.tsx:1236` (`grid grid-cols-3` cho "Kích thước X/Y/Z" + "Thể tích Net" + "Số Chi Tiết"; giá trị mono `toFixed(1)`) | 390: 3 cột ≈110px với nhãn VI dài + giá trị `123.4 × 56.7 × 89.0 mm` ⇒ chữ bị ép/wrap xấu, có thể tràn ô (không có `min-w-0`/`break-words`) | W3 tool3d | 390: 1 cột hoặc 3 hàng nhãn/giá trị; `verify-in-browser` |
| **UI-027** | P2 | `components/Header.tsx:58` (nav `Báo Giá In 3D`) + `:162` (`Báo giá ngay →`, `hidden sm:inline`); mobile: `:225-230` (nút search mở drawer) + `:303-306` (nút hamburger mở **cùng** drawer) | **Trùng affordance**: desktop có 2 CTA cùng đích `/quote`; mobile có 2 nút icon mở cùng một drawer (search + hamburger) ngay cạnh nhau | W1 foundation | Desktop: 1 CTA quote; mobile: 1 nút mở drawer (gộp search/menu); ảnh 390 + 1440 |
| **UI-028** | P2 | `components/tool3d/QuoteSummaryPanel.tsx:528` (`0.20 mm (Draft Fast)`), `:544` (`Không dùng Support`), `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx:46` (`Support PVA`) | Thuật ngữ in 3D tiếng Anh (`Draft Fast`, `Support`, `Layer`, `Infill`) nằm ngoài allowlist kỹ thuật đã chốt | W3 tool3d + Lead chốt glossary | Hoặc Việt hoá ("Lớp nhanh", "Vật liệu đỡ"), hoặc **bổ sung vào allowlist** trong COPY-GLOSSARY sau khi Lead duyệt |

---

## 4. P3 — nit

| ID | Severity | file:line | Defect | Owner wave | Acceptance |
|---|---|---|---|---|---|
| **UI-029** | P3 | `components/Header.tsx:180`, `:336` (`Vietnam`) | Wordmark hiển thị "Vietnam" tiếng Anh dưới VCUBE (brand mark — có thể giữ, nhưng phải chốt) | W1 foundation | Hoặc giữ như brand lockup (ghi ngoại lệ), hoặc "Việt Nam" |
| **UI-030** | P3 | `src/App.tsx:2032` (`Marketplace linh kiện 3D`), `:2106` (`© 2026 VCUBE Vietnam Industrial Fabrication`) | Footer VI còn "Marketplace" và cụm tiếng Anh trong dòng bản quyền | W1 foundation | Footer VI-only (giữ tên pháp nhân nếu là tên đăng ký chính thức) |
| **UI-031** | P3 | `views/HomeView.tsx:1079` (`File Số (STL/STEP)`), `:1087` (`In Vật Lý (FDM/Resin)`) | "File" vs "Tệp" dùng lẫn toàn app; "File" là từ ngoài glossary | W2 storefront | Thống nhất "Tệp" cho UI VI (trừ tên định dạng) |
| **UI-032** | P3 | `components/AuthModal.tsx:504,722,824` (`Email…`) | "Email" là loanword phổ biến; cần chốt là **cho phép** trong glossary hay đổi "Thư điện tử" | Lead chốt | Ghi vào COPY-GLOSSARY §2 (allowlist mở rộng) hoặc sửa |
| **UI-033** | P3 | `components/CadQuickViewModal.tsx:238` (`aria-label="Close CAD inspector"`), `components/Header.tsx:172` (`aria-label="VCUBE Home"`) | aria-label tiếng Anh cho screen reader VI | W2 + W1 | aria-label VI (`Đóng trình xem CAD nhanh`, `Về trang chủ VCUBE`) |
| **UI-034** | P3 | `admin/AdminStorefrontPanel.tsx:564` (`CHRONICLE // QUY TRÌNH XƯỞNG`), `:695` (`VCUBE FAST ESTIMATOR // LIVE QUOTE`), `:937` (`CUSTOM CAD // THEO Ý TƯỞNG`) | Placeholder admin tiếng Anh (người dùng thấy khi mở form CMS) | W3 admin | Placeholder VI-only; ảnh `/admin/storefront-cms` |
| **UI-035** | P3 | `components/personalize/PersonalizeModelViewer3D.tsx:714` (`{modelType || 'ARDUINO-CASE'}`) | HUD badge fallback hiển thị `ARDUINO-CASE` tiếng Anh khi thiếu modelType | W2 pdp-viewer | Fallback VI (`MÔ HÌNH 3D`) |
| **UI-036** | P3 | `src/frontend/ui/index.ts:43,49,50` export `Section`, `Toolbar`, `ToastViewport`; `Section`/`Toolbar` **0 import**, `ToastViewport` **0 import** | Primitive dead ⇒ nợ dọn; v3 đang có kế hoạch dùng `Section`/`Toolbar` nên phải chốt sống/chết | W1 foundation | Ghi rõ primitive nào v3 dùng; xoá hoặc đưa vào dùng thật; UI-012 đã tự thêm live-region trong `App.tsx`; chốt xoá/giữ `ToastViewport` để tránh 2 primitive toast |
| **UI-037** | P3 | `components/designer/DesignerRequestsTab.tsx:467` (`Mật Độ Infill:`), `components/tool3d/ModelViewer3D.tsx` (`Layer`, `Support`) | Từ ngành (`Infill`, `Layer`, `Support`, `Slicer`) rải rác; chưa có quyết định glossary ⇒ mỗi file một kiểu | Lead chốt + W3 | COPY-GLOSSARY §3 chốt allowlist mở rộng hoặc bản dịch chuẩn |
| **UI-038** | P3 | `components/PageSkeleton.tsx:12` (copy mặc định "Đang tải thư viện xử lý 3D & dữ liệu CAD bồi đắp"), `:15` (`max-w-[1440px]`), dùng chung ở `src/App.tsx:1533` (`React.Suspense fallback`) và `:591` (LabRoute) | **Một skeleton dùng cho mọi surface**: `/quote` (storefront, `max-w-7xl` = 1280) và `/lab` (console) đều nhận skeleton 1440px + copy "thư viện CAD" ⇒ nhảy layout và sai ngữ cảnh khi lazy module đang nạp | W1 foundation | Skeleton theo surface (storefront/console) hoặc nhận `maxWidth`/`title`; ảnh slow-network `/quote` + `/lab` |
| **UI-039** | P3 | `src/frontend/lib/format.ts:124-142` (`formatCurrency` → `1.250.000 ₫`), `src/frontend/ui/Money.tsx:5` (tuyên bố "một quy ước `vi-VN + ₫`") so với nối tay `' đ'`: `admin/WarehouseInventoryPanel.tsx:201,333,334,402,406,562,594`, `admin/AccessoriesManager.tsx:225,239`, `components/tool3d/InternalCostBreakdownModal.tsx:280`, `admin/PricingConfigPanel.tsx:1907-1908`; `docs/tasks/ui-redesign-v3/PLAN.md:122` ghi tiền `đ` | Ký hiệu tiền **không nhất quán** (`₫` qua helper vs ` đ` nối tay) và **xung đột với PLAN §5.5** (`đ`) ⇒ cùng một số tiền hiển thị 2 kiểu | W1 chốt + W3 sửa | DESIGN-LANGUAGE chốt 1 ký hiệu (đề xuất `₫`); mọi chỗ nối tay chuyển sang `Money`/`formatCurrency`; ảnh 2 màn admin có tiền |
| **UI-040** | P2 | `components/CanvasErrorBoundary.tsx:57` (`<span …>Render Error</span>`), `:55` (`VCUBE MESH ENGINE v2.6`) | Khi WebGL/canvas lỗi, HUD hiển thị "Render Error" tiếng Anh cho khách VI (màn lỗi 3D là bề mặt khách thấy khi hỏng) | W1 foundation (boundary) + W2/W3 | "Lỗi kết xuất 3D"; ảnh màn lỗi canvas (`RoomEnvironment`/WebGL fail) |
| **UI-041** | P3 | `components/Header.tsx:67` (`'Studio Thiết Kế'`), `:72` (`'Quản Trị Admin'`), `:180` + `:336` (`Vietnam`) | Nav VI còn `Studio`/`Admin` (PLAN §5.3 nêu đích danh `Admin` là nhãn phải thay) và wordmark "Vietnam"; W1 handoff ghi "Header VI-only" nhưng 3 chuỗi này vẫn English một phần | W1 foundation | `Xưởng thiết kế` / `Quản trị` (hoặc `Quản trị hệ thống`); chốt wordmark; ảnh header 1024 + 390 |

---

## 5. Danh sách `verify-in-browser` (không kết luận nếu chưa có ảnh)

| ID | Cần kiểm | Kỳ vọng |
|---|---|---|
| UI-002 | Drawer mobile admin ở 390×667 (regression) | Nay phải cuộn được; nếu không ⇒ mở lại **P0** |
| UI-001 | Hard-refresh `/orders` khi chậm | Nếu trắng >300ms ⇒ **P0** |
| UI-008 | PDP 390: 4 CTA mua cùng hiển thị? | Đúng ⇒ P1 giữ nguyên |
| UI-016 | PDP 390: FAB có đè `Đặt In 3D` trong 400ms đầu? | Có ⇒ P2 giữ; nếu đè vĩnh viễn ⇒ P1 |
| UI-021 | Kanban 390 kéo-thả | Không dùng được ⇒ P1 |
| UI-024 | Anchor `#browse-cad-catalog` 1440 | Tiêu đề bị che 16px |
| UI-026 | Tool3D 390 stat tiles | Tràn/wrap xấu |

---

## 6. Đã kiểm và **không phải** defect (chống báo sai)

| Vùng | Kết quả kiểm | Bằng chứng |
|---|---|---|
| Tràn ngang 390 toàn cục | **Không tìm thấy** page-level overflow: bảng đều nằm trong `overflow-x-auto`; nav desktop có `overflow-x-auto`; FAB có va chạm tự ẩn | `ExploreView.tsx:1205`, `HomeView.tsx:1137`, `OrderTrackingView.tsx:461`, `MyOrdersView.tsx:166`, `Header.tsx:193` |
| Modal/Sheet cuộn | **Đạt**: body `min-h-0 flex-1 overflow-y-auto`; bottom sheet `max-h-[85dvh]`; backdrop/ESC/focus trap có | `ui/Modal.tsx:120-155,332-348`, `ui/Sheet.tsx`, `Header.tsx:107-150` |
| `<img>` thiếu `alt` | **0** ảnh thiếu alt (mọi `<img>` có `alt` hoặc ẩn có chủ đích) | quét 16 `<img>` trong views/components |
| Input thiếu label | **0** lỗi chắc chắn: mọi input có `id`+`htmlFor`, `aria-label`, hoặc bọc trong `<label>` | quét `input/select/textarea` toàn `src/frontend` |
| Focus ring | **0** phần tử `outline-none` thiếu `focus-visible:ring` (quét 4 dòng ngữ cảnh) | quét toàn `src/frontend` |
| Link chết `href="#"` / `javascript:` | **0** | grep |
| `window.confirm` | **0** (chỉ `alert` ở `LoginView.tsx:163`) | grep |
| Mock/fixture dùng như dữ liệu thật | **Đã dọn**: `PRODUCTS`, `MOCK_ORDERS`, `PAYOUT_TRANSACTIONS`, `DIGITAL_ASSETS`, `SAMPLE_ANALYSIS_FILES`… đều `[]` | `src/data/mockData.ts:60,70,225`, `Tool3DView.tsx:308-318` |
| `Live Telemetry`/`Digital Twin`/`camera xưởng` | **Đã gỡ** | `OrderTrackingView.tsx:263` |

---

## 7. Cập nhật W1c — đóng bổ sung (2026-10-20)

> Chỉ sửa **file foundation** (không sửa page view). Quyết định nguồn: `PLAN.md` §5.0 ·
> `DESIGN-LANGUAGE.md` §4.1 · `COPY-GLOSSARY.md` §2/§4/§5.1.

| ID | Mức | Trạng thái | Cách đóng / ghi chú |
|---|---|---|---|
| **UI-016** | P2 | **ĐÓNG (code)** | **D-F**: `src/App.tsx` thêm `FAB_HIDDEN_SCREENS = ['product_detail', 'personalize']`; FAB không còn render trên PDP/Personalize ⇒ không đè bottom-bar `z-sticky`. Không đổi route/layout bar. QA xác nhận ảnh 390 |
| **UI-030** | P3 | **ĐÓNG** | Footer `src/App.tsx` + `LanguageContext`: `Marketplace linh kiện 3D` → `Sàn linh kiện 3D`; `© 2026 VCUBE Vietnam Industrial Fabrication.` → `© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.`; wordmark footer `Vietnam` → `Việt Nam` |
| **UI-041** | P3 | **ĐÓNG** | **D-D**: `Header.tsx` wordmark `Vietnam` → `Việt Nam` (desktop + drawer), nav fallback `Quản Trị Admin` → `Quản trị hệ thống`, `Studio Thiết Kế` → `Xưởng thiết kế`; dictionary `LanguageContext` đồng bộ. Route/slug không đổi |
| **UI-006** | P1 | **ĐÓNG MỘT NỬA** | **D-A**: `RoleGuard.tsx` E5–E8 → `Quản trị hệ thống` / `Tác giả thiết kế 3D` / `Xưởng in / Đối tác sản xuất` / `Khách hàng`; badge `403 • ACCESS RESTRICTED` → `403 • KHÔNG CÓ QUYỀN TRUY CẬP`; `vai trò {role}` (EN enum) → nhãn VI. **Nửa còn lại** (`AuthModal.tsx` E1–E4) thuộc **W2 commerce-auth** |
| **UI-027** | P2 | **DEFER** | Trùng affordance mobile (search + hamburger) + 2 CTA `/quote` desktop → **integrator (W5)** theo chỉ đạo Lead; W1c không sửa Header |
| **UI-039** | P3 | **ĐÓNG (policy)** | **D-B**: giữ `₫`, không đổi `format.ts`; PLAN §5.5 + COPY-GLOSSARY §5.1 đã sửa theo `₫` |
| **UI-018** | P2 | **MITIGATED** (giữ P2) | `.nav-fade-right` báo "còn mục nữa"; fix đầy đủ (overflow menu) vẫn để W2/integrator |

**Bằng chứng gate W1c:** `npm run lint` PASS · `npm run build` PASS · không commit, không đổi page view.
