> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 04 — Phân tích & tối ưu: xác thực, dashboard, admin, lab, shell

Phạm vi: `/auth/login` · `/auth/register` · `/designer*` · `/admin*` · `/lab*` (mới) · `*` (404) · shell toàn cục
Mức: **P0** = sai/đáng tin cậy hoặc mất tiền · **P1** = chặn chuyển đổi · **P2** = chất lượng UX · **P3** = polish.

---

## 1. `/auth/login`, `/auth/register`, `AuthModal`

### 1.1 Tính năng hiện có
1. Đăng nhập email/mật khẩu qua Supabase + Google OAuth.
2. Đăng ký với chọn vai trò (4 vai trò: customer / designer / lab / admin) dạng card.
3. Quên mật khẩu (chỉ trong `AuthModal`; trang `/auth/login` dùng `alert`).
4. `DEMO_ACCOUNTS` + mật khẩu demo dùng chung.
5. `rememberMe`, hiện/ẩn mật khẩu.
6. `AuthModal` có 5 chế độ, là nơi xử lý phần lớn luồng auth (995 LOC).

### 1.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Leo thang quyền ở client:** bất kỳ người dùng đã đăng nhập có thể set `role: 'admin'` vào localStorage + `supabase.auth.updateUser` metadata — đúng field mà 15 policy RLS tin tưởng | `AuthContext.tsx:273-283` | **P0** |
| 2 | **Suy vai trò từ email:** email chứa chuỗi `admin` được cấp quyền admin | `AuthContext.tsx:72-73` | **P0** |
| 3 | Mật khẩu demo hardcode (`123456`, `Password123!@`) hoạt động ở production | `AuthContext.tsx:173-188` | **P0** |
| 4 | Google OAuth lỗi → **âm thầm** inject profile giả `engineer.google@vcube.vn` | `AuthContext.tsx:252-264` | **P0** |
| 5 | `isLoggedIn` có thể thoả từ localStorage trước khi Supabase trả lời; `MainApp` không gate theo `loading` → route admin có thể qua cửa bằng cache | `AuthContext.tsx:376-378`; `App.tsx:226` | P1 |
| 6 | Role lấy từ context client, `RoleGuard` chỉ kiểm tra mảng `allowedRoles` ở client — không có kiểm tra phía server/section | `RoleGuard.tsx:22-32` | P1 |
| 7 | Trang login dùng `alert()` cho quên mật khẩu trong khi `AuthModal` đã có luồng thật | `LoginView.tsx:120` vs `AuthModal.tsx:127-145` | P2 |
| 8 | Email field là `type="text"`; nút hiện mật khẩu bị `tabIndex={-1}` (không tới được bằng bàn phím) | `LoginView.tsx:103-104,140`; `RegisterView.tsx:294` | P2 |
| 9 | **Điều khoản được pre-tick sẵn** → bước đồng ý chỉ mang tính hình thức | `RegisterView.tsx:22,348-352` | P1 |
| 10 | `rememberMe` không được dùng ở đâu trong `AuthContext` | `LoginView.tsx:20`; `AuthModal.tsx:38` | P3 |
| 11 | `AuthModal` không có Escape, không `role="dialog"`, không khoá scroll, không focus trap | `AuthModal.tsx:232-241` | P1 |
| 12 | 574 ký tự tiếng Việt trong `AuthModal` không qua i18n; toast thành công hardcode tiếng Việt bất kể ngôn ngữ | `AuthModal.tsx:68` | P2 |
| 13 | `RoleGuard` 403 có nút "Chuyển Vai Trò (Demo)" ngay trên màn 403 | `RoleGuard.tsx:80-86` | P2 (gỡ ở production) |

### 1.3 Kế hoạch tối ưu
1. **Vai trò lấy từ DB, không từ client:** đọc `user_profiles.role` (RLS chặn user tự sửa); xoá đường `updateUser` metadata; xoá suy luận từ email; `RoleGuard` chỉ là lớp UX (ẩn/hiện), **quyền thật do RLS quyết định**.
2. **Backdoor demo chỉ ở DEV:** bọc toàn bộ `DEMO_ACCOUNTS` + mật khẩu demo trong `if (import.meta.env.DEV)`; production không có đường tắt. Bỏ inject profile Google giả — lỗi OAuth phải hiển thị lỗi.
3. Gate `isLoggedIn` theo `loading`: chỉ render UI phụ thuộc quyền sau khi auth resolve xong.
4. Một component auth dùng chung cho `/auth/login`, `/auth/register` và `AuthModal` (hiện 3 nơi lặp logic + 3 hành vi khác nhau): `AuthForm` với 5 variant, dùng `Field` primitive, `type="email"`, `autocomplete="email"`/`"current-password"`, nút hiện mật khẩu nằm trong tab order và có `aria-label`.
5. Điều khoản **không pre-tick**; thêm link tới Chính sách bảo mật/Điều khoản (nghĩa vụ của sàn TMĐT theo Nghị định 52/2013 & 85/2021 — xem `docs/plans/06-supabase-vercel.md` §7).
6. Modal auth qua `Modal` primitive (`<dialog>` + focus trap + Escape + scroll lock).
7. i18n toàn bộ 2 trang + `AuthModal`.
8. (Roadmap) Thêm đăng nhập bằng **SĐT/OTP Zalo** — phù hợp thói quen thị trường VN hơn email/mật khẩu.

---

## 2. `/designer`, `/designer/:tab` — DesignerDashboardView (1.543 LOC)

### 2.1 Tính năng hiện có
1. Bảng model của designer (search + filter + sửa + publish + preview).
2. Yêu cầu thiết kế riêng (custom requests).
3. Payout / rút tiền.
4. Máy tính royalty.
5. Analytics (KPI).
6. 39 `useState` trong một component; 3 modal (edit / publish / preview, trong đó preview có viewer 3D 320px).
7. Mount `ThreeModelViewer` + `PersonalizeModelViewer3D` ở một số tab.

### 2.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **File nhiều hex nhất repo:** 404 hex + 487 utility tuỳ ý = 891 | đo | P2 |
| 2 | **Royalty hardcode `*0.9` / `*0.1` ở 6 chỗ**, bỏ qua `DESIGNER_ROYALTY_PERCENT` từ config → payout tính sai nếu admin đổi tỉ lệ | `DesignerDashboardView.tsx:607,614,984,1002,1380,1398` | **P0** |
| 3 | Trọng lượng/thời gian máy hardcode `125g` / `3.5h` hiển thị như số liệu thật | `:163,171` | **P0** |
| 4 | "Đang gửi…" giả bằng `setTimeout(800ms)` | `:180-230`, `:46` | P1 |
| 5 | Không có `loading`/`error`/`empty` cho các bảng (chỉ có 2 empty state) | audit §B4 | P1 |
| 6 | Bảng model **thứ hai** song song `AdminProductsPanel` (cùng entity product, hai vocabulary trạng thái thứ ba) | `:561-672` vs `AdminProductsPanel.tsx:196-303`, `:545` | P1 |
| 7 | Không sort, không phân trang | audit §B3 | P1 |
| 8 | Modal không `role="dialog"`, 2 modal thiếu max-height; viewer 320px trong modal | `:1281,1436,1495` | P2 |
| 9 | Dữ liệu lấy từ store mock không persist, không Supabase → sửa xong mất khi refresh | `useDesignerAdminStore.ts:225` | **P0** |

### 2.3 Kế hoạch tối ưu
1. **Royalty & mọi tỉ lệ tính từ `pricing_configs`/`designer_profiles`** — 1 hàm `computeRoyaltySplit()` dùng chung cho payout, KPI, invoice.
2. Tách file: `designer/{ModelsTable,DesignRequestsPanel,PayoutsPanel,RoyaltyCalculator,ProductEditModal,ProductPreviewModal}.tsx` + shared `DataTable`.
3. Nối vào Supabase (`designer_profiles` + `workshopService`) với `loading`/`error`; thêm empty state.
4. Dùng chung 1 bảng product với admin (cùng cột, cùng status enum) — chỉ khác scope dữ liệu.
5. Publish flow thật: validation (tiêu đề, giá, file, license) → trạng thái `draft/review/published` → thông báo kết quả.
6. Modal qua primitive; preview 3D lazy.

---

## 3. `/admin`, `/admin/:section` — AdminDashboardView (496) + 16 section

### 3.1 Tính năng hiện có (IA thực tế)
Sidebar 16 mục / 8 nhóm; `validSections` 22 id; breadcrumb; sidebar search; 6 panel nhóm:

| Nhóm | Section | Panel |
|---|---|---|
| GROUP0 | `overview` | `Group0OverviewPanel` |
| GROUP1 | `partners`, `machines` | `Group1WorkshopsPanel` |
| GROUP2 | `designers` | `Group2DesignersPanel` |
| GROUP3 | `users` | `Group3CustomersPanel` |
| GROUP4 | `pricing`, `materials`, `hardware`, `quote-calc` | `Group4PricingEnginePanel` → `PricingConfigPanel` (6 sub-tab) |
| GROUP5 | `queue`, `orders`, `inventory` | `Group5ProductionPanel` |
| STOREFRONT | `products`, `storefront`, `seo`, `settings` | 4 panel riêng |
Ngoài ra: "Đồng Bộ DB" (seed lên Supabase), nút collapse sidebar, mobile drawer (đã làm tốt).

### 3.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **5 alias section nói dối:** `workshops`≡`partners`, `customers`≡`users`, và `pricing|pricing-engine|pricing-setup|cost-rules` đều mở form Inkiri → `/admin/cost-rules` **không** hiện cost rules | `AdminDashboardView.tsx:417-433` | P1 |
| 2 | 2 sub-tab của `PricingConfigPanel` (`printers`, `inventory`) **không deep-link được** vì type chỉ khai 4 giá trị | `Group4PricingEnginePanel.tsx:11` vs `PricingConfigPanel.tsx:326-396` | P1 |
| 3 | **`AdminSettingsPanel` không lưu gì** — `handleSave` chỉ toast | `AdminSettingsPanel.tsx:20-22` | P1 |
| 4 | **Tầng dữ liệu admin là mock:** 3 store không `persist`, không Supabase; các store còn lại chỉ localStorage; **0 store có `loading`/`error`** → sửa xong mất khi refresh, không thể hiển thị lỗi | `useWorkshopAdminStore.ts:408`, `useDesignerAdminStore.ts:225`, `useCustomerAdminStore.ts:280` | **P0** |
| 5 | `workshopService.ts` (1.237 LOC, 28 truy vấn Supabase trên 8 bảng) **không có UI nào dùng** → CRUD thật bị bỏ qua | grep `workshopService` trong `src/frontend` = 0 | **P0** |
| 6 | **8 admin panel chết (3.969 LOC)**, trong đó `AdminPartnersPanel` và `AdminUsersPanel` giữ **CRUD Supabase duy nhất** cho partner/KYC | audit §A3.4 | P1 |
| 7 | 15 bảng tự viết: sort **0/39**, phân trang **0/39**, chọn nhiều **0/39**, xoá nhiều **0/39** | audit §B3 | P1 |
| 8 | 30 modal shell tự viết: không `role="dialog"`, không `aria-*`, 14 modal thiếu `overflow-y-auto` → form dài bị cắt trên điện thoại nằm ngang | audit §B2b, §B6d | P1 |
| 9 | **Mất severity của toast:** `useUIStore.showToast(message, type, undoAction)` nhưng mọi panel khai `(message: string) => void` → mọi lỗi hiện như `info`; đây là lý do "không panel nào có error state" | `useUIStore.ts:27` vs `AdminDashboardView.tsx:84` | P1 |
| 10 | Lỗi chỉ `console.warn` ở nhiều panel, có chỗ vẫn hiện toast thành công sau khi lỗi | `WorkshopOnboardingWizard.tsx:373`→`:388`; `DesignerSettingsView.tsx:133-138` | P1 |
| 11 | **121 literal tiền hardcode** + 4 idiom định dạng tiền (kể cả `.toLocaleString()` trần), không có helper chung; cùng một phí ship có 2 giá trị ở 2 panel | audit §B2f, §A11.2 | P1 |
| 12 | Validate thiếu: nhận **giá âm** ở mọi form giá; `expectedLifetimeHours` không min → **chia 0** ở khấu hao; không kiểm trùng SKU; không dirty-state guard | audit §B5.2 | P1 |
| 13 | CRUD trùng: material **5 writer**, printer **4 writer** với **3 enum `technology` khác nhau**, accessory 2, product 2 | audit §B2e | P1 |
| 14 | KPI literal hiển thị như số liệu sống (Group0, AdminOverviewPanel, AdminPartnersPanel…) | audit §B2c | P1 |
| 15 | "Đồng Bộ DB" seed fixture vào Supabase production, chỉ chặn bằng `disabled` | `AdminDashboardView.tsx:131-147,332-344` | **P0** |
| 16 | Không có permission theo section (chỉ truyền callback) | `App.tsx:1060-1079` | P1 |
| 17 | `AdminProductsPanel` viết status 2 vocabulary khác nhau (row select vs form), designer dùng vocabulary thứ ba | `AdminProductsPanel.tsx:261-279` vs `:397-405`; `DesignerDashboardView.tsx:545` | P1 |
| 18 | Bảng cuộn ngang: `hidden md:table-cell` = 0 → bảng 8 cột vẫn đủ 8 cột trên màn 360px | audit §B6a | P2 |

### 3.3 Kế hoạch tối ưu

**IA & điều hướng**
1. Mỗi id ↔ **1 panel**; xoá 5 alias; `/admin/cost-rules` phải mở panel cost rules thật (hoặc xoá section khỏi `validSections`).
2. Deep-link được mọi sub-tab (mở rộng type `initialSubTab`, hoặc dùng query `?tab=`).
3. Gate theo permission ở **cả** client (UX) và RLS (thật); thêm section-level permission cho các mục nguy hiểm (pricing, users, seed).

**Dữ liệu**
4. Thay 3 store mock bằng service thật (`workshopService` + `dbService`) với slice `loading`/`error`; hoặc giữ store nhưng thêm `persist` + adapter gọi service. Mọi mutation phải: optimistic → gọi API → rollback + toast lỗi nếu fail.
5. Sửa `onShowToast` thành `(message, type?, undoAction?, undoLabel?)` ở mọi panel → severity và undo hoạt động.
6. "Đồng Bộ DB": đổi thành **chỉ DEV** hoặc yêu cầu xác nhận 2 bước + ghi log; mặc định ẩn ở production.
7. Nối `AdminPartnersPanel`/`AdminUsersPanel` (partner CRUD + KYC) vào panel nhóm tương ứng **trước khi xoá** 2 file chết.

**UI**
8. 4 primitive admin: `DataTable` (sort/filter/pagination/bulk/CSV/sticky header/density), `StatCard`, `Modal`, `ConfirmDialog`; migrate 15 bảng + 30 modal + ~10 cụm KPI → xoá ~3.700 LOC trùng.
9. Mỗi panel đủ 4 state: loading (skeleton hàng), empty (ngoài bảng), error (nêu lỗi + retry), success (toast có severity).
10. Bảng trên mobile: ẩn cột phụ bằng `hidden md:table-cell`, cột đầu sticky, hoặc chuyển sang card list dưới 768px.
11. Money: 1 helper `formatCurrency(value, locale)`; 1 module `pricingDefaults` dùng chung `PricingConfigPanel` + `WorkshopEstimatorBOM` (hiện trùng y hệt 2 khối mặc định).
12. Validation: `min`/`max`/`step` cho mọi field số, chặn giá âm, chặn chia 0, kiểm trùng SKU/tên, cảnh báo khi rời form có thay đổi chưa lưu.
13. Gom CRUD trùng: 1 nơi sửa material, 1 nơi sửa printer (1 enum `technology` duy nhất lấy từ DB), 1 nơi sửa accessory; các panel khác chỉ đọc + deep-link.
14. KPI: mọi ô số phải đến từ truy vấn; nếu chưa có dữ liệu hiển thị `—` (không hiện số cứng).

**Kết quả mong đợi:** không panel nào chỉ có state thành công; sửa dữ liệu tồn tại qua refresh; mọi bảng có search/sort/pagination/bulk; mọi modal có dialog semantics; không còn 121 literal tiền; không còn panel chết.

---

## 4. `/lab` — vai trò xưởng in (route **mới**, dùng lại 2 file đã có)

### 4.1 Hiện trạng
- Role `lab` tồn tại trong `types/index.ts:668`, xuất hiện trong `DEMO_ACCOUNTS`, role switcher, form đăng ký, mock users — nhưng **không có route nào** và không nằm trong `allowedRoles` nào.
- Hai file đã viết nhưng chưa route: `WorkshopSettingsView.tsx` (1.586 LOC) và `WorkshopOnboardingWizard.tsx` (1.349 LOC).

### 4.2 Kế hoạch
1. Route: `/lab` (dashboard), `/lab/settings`, `/lab/onboarding`; `allowedRoles: ['lab','admin']`; thêm mục nav cho role lab.
2. Tách 2 file lớn: `workshopSettings/{WorkshopProfileForm,MachineFleetTable,MaterialTable,InventoryLogTable,RestockModal}.tsx`; `onboarding/steps/{Step1Profile,Step2Machines,Step3Materials,Step4Review}.tsx` + `presets.ts`.
3. Bổ sung validation còn thiếu hoàn toàn: không có `required` nào trong 2 file dù UI có ~20 dấu `*`; wizard step-2 có gate vô nghĩa (`machines.length === 0` luôn sai vì đã có máy mặc định); step-1 chỉ validate `workshopName`.
4. Nối dữ liệu: `workshop_profiles`, `workshop_machines`, `workshop_materials`, `material_inventory_logs`, `workshop_accessories`, `pricing_global_settings` (đều đã có migration + service). Bỏ ghi `localStorage` trực tiếp trong view (đang có 2 file cùng ghi key `vcube_workshop_*`).
5. Dashboard xưởng: máy in + trạng thái, tồn kho vật liệu, hàng đợi đơn được gán, nút nhận/từ chối đơn (có lý do), log thao tác.
6. Ảnh hưởng tới storefront: xưởng cập nhật năng lực → lead time hiển thị cho khách phải phản ánh (một phần của mục realtime ở `06-supabase-vercel.md`).

---

## 5. `*` — NotFoundView

**Hiện có:** 404 song ngữ (một trong số ít file i18n đúng), CTA về trang chủ.
**Tối ưu:** thêm ô tìm kiếm sản phẩm + 4 link phổ biến; đảm bảo dùng token; ghi log 404 (tuỳ chọn, để phát hiện link hỏng sau refactor).

---

## 6. Shell toàn cục

| Thành phần | Hiện có | Vấn đề | Tối ưu |
|---|---|---|---|
| `Header` (422) | nav desktop, drawer mobile, lang switcher, search, cart badge, avatar menu, announcement bar | `aria-expanded` thiếu ở hamburger và avatar menu; nhãn mobile menu hardcode tiếng Việt; `focus-visible` chỉ để **xoá** dấu focus; search chỉ đổi trang chứ không tìm thật | thêm `aria-expanded`/`aria-controls`; i18n; focus ring 2px; search gọi `/explore?q=` và có gợi ý |
| `AppFooter` (`App.tsx:1221-1322`) | link, hotline, địa chỉ 3 miền | link `/tracking` đẩy khách vào tường đăng nhập; nội dung hardcode | đưa vào `publicScreens`; nội dung từ `site_content`; i18n |
| `CartDrawer` | drawer giỏ hàng | logic trùng với CartView (guard số lượng, tiền tệ khác nhau); Escape có, focus trap không | dùng chung `CartLineItem` + `Modal`/`Sheet` primitive |
| `AuthModal` (995) | 5 chế độ auth | xem §1.2 | tách file + `Modal` primitive + i18n |
| `ChatSupportModal` | chat giả lập: persona "Kỹ sư Hoàng Long", chào "Chào kỹ sư Minh!" (tên người dùng chưa từng nhập), trả lời theo 3 nhánh keyword sau 1s | gây hiểu nhầm là người thật; không Escape, không đóng khi click ngoài; palette editorial | đổi thành trợ lý ảo **có nhãn rõ** (không giả danh kỹ sư) hoặc thay bằng deep link Zalo/Messenger; thêm Escape + click ngoài + `role="dialog"` |
| `InvoiceModal` | in hoá đơn | `window.print()` + print CSS ẩn `header/footer/button` nhưng modal không có `.no-print`; cộng VAT 8% khác engine | sửa print stylesheet, thống nhất VAT từ config, thêm xuất PDF |
| Toast | 1 queue, có undo | **không có `aria-live`**; `duration` khai báo nhưng bị bỏ qua (luôn 4s); `toasts` slice ghi trùng nhưng không dùng; vị trí `bottom-6 left-6` va chạm FAB `bottom-6 right-6` trên máy nhỏ | thêm `role="status"` + `aria-live="polite"`; tôn trọng `duration`; dọn slice chết; dời toast lên trên FAB hoặc ẩn FAB khi có toast |
| `ScrollToTop` | cuộn lên đầu khi đổi route | chạy `smooth` trùng với `handleNavigate` → jank, tranh chấp với sticky | 1 nơi duy nhất, `behavior: 'auto'` (hoặc `instant`) |
| `SEOHead` | meta + JSON-LD | ghi `document.head` mỗi render, JSON-LD tạo mới mỗi render | memo theo dữ liệu; thêm `og:image`, canonical, hreflang vi/en |
| `CanvasErrorBoundary` | bọc canvas trong `/quote` | chỉ có 1 chỗ dùng; không xử lý `webglcontextlost` | mở rộng cho mọi nơi có canvas + fallback DOM |
| Providers | `BrowserRouter > AuthProvider > LanguageProvider` | value là object literal mới mỗi render → re-render toàn bộ consumer; `t` tạo mới mỗi render | memo value + `useCallback`; tách `LanguageProvider` để đổi ngôn ngữ không re-render vùng không phụ thuộc |
| `main.tsx` | StrictMode | nuốt lỗi `ResizeObserver loop` bằng capture handler + patch `window.onerror` → **che bug layout thật** | sửa vòng lặp ResizeObserver thật rồi gỡ suppression |

---

## 7. Bảng ưu tiên nhóm tài khoản & admin

| Ưu tiên | Việc | Trang | Effort |
|---|---|---|---|
| P0 | Bỏ leo thang quyền client + suy role từ email + backdoor demo ở prod | auth | S |
| P0 | Vai trò đọc từ DB; RLS là nguồn quyền thật | auth + DB | M |
| P0 | Royalty/giá vốn tính từ config (bỏ `*0.9`/`*0.1` ×6 và `125g/3.5h`) | `/designer` | S |
| P0 | Nối tầng dữ liệu admin vào Supabase (hết mock, có loading/error) | `/admin`, `/lab`, `/designer` | L |
| P0 | Chặn "Đồng Bộ DB" ở production / xác nhận 2 bước | `/admin` | S |
| P1 | Sửa 5 alias section + deep-link sub-tab | `/admin` | S |
| P1 | Sửa `AdminSettingsPanel` để lưu thật | `/admin` | S |
| P1 | `onShowToast` có severity + undo; mọi panel có loading/empty/error | `/admin` | L |
| P1 | `DataTable` + `Modal` + `ConfirmDialog` + `StatCard`, migrate 15 bảng/30 modal | `/admin` | L |
| P1 | Route `/lab` + tách 2 file + validation | `/lab` | L |
| P1 | 1 helper tiền tệ + `pricingDefaults` dùng chung | admin | M |
| P1 | Gỡ pre-tick điều khoản; sửa email type; modal auth đúng chuẩn | auth | S |
| P1 | Modal primitive + focus trap + Escape + scroll lock (dùng chung mọi modal) | shell | M |
| P2 | Toast có `aria-live`; dời vị trí khỏi FAB | shell | S |
| P2 | Chat: nhãn trợ lý ảo (không giả danh người) hoặc Zalo | shell | S |
| P2 | `SEOHead` memo + hreflang; print stylesheet hoá đơn | shell | S |
| P2 | Memo context value; gỡ ResizeObserver suppression | shell | S |
| P3 | 404 có search + link phổ biến | 404 | S |

---

## 8. Bổ sung từ vòng kiểm QA

**Deep-link sai tab con:** `/admin/machines`, `/admin/inventory`, `/admin/orders` render đúng panel nhóm nhưng **không chọn đúng tab con** (thiếu `initialSubTab` tương ứng trong `AdminDashboardView.tsx:417-444`); `/designer/:tab` cũng bỏ qua tham số. Hệ quả: link chia sẻ/nút trong breadcrumb mở sai ngữ cảnh, người dùng tưởng dữ liệu biến mất.
**Sửa:** map đầy đủ `section → panel + subTab`; đọc `:tab` ở designer để chọn tab; thêm test thủ công trong `qa-checklist.md` cho từng slug.

---

## 9. Trạng thái auth sau khi sửa RLS (cập nhật 2026-09-12)

Đối chiếu §1.2 với thực tế hiện tại:

| Vấn đề ở §1.2 | Trạng thái |
|---|---|
| #1 leo thang quyền client (set `role:'admin'` vào metadata) | ✅ Đã vô hiệu ở tầng DB — policy không còn đọc `user_metadata`; ghi metadata cũng bị giới hạn vào DEV |
| #2 suy vai trò từ email (`includes('admin')`) | ✅ Đã xoá khỏi `AuthContext.createProfileFromSupabaseUser` |
| #3 mật khẩu demo hardcode | ⏳ CÒN (`DEMO_ACCOUNTS`) — cần bọc `if (IS_DEV)` |
| #4 Google OAuth lỗi → tạo user giả `engineer.google@vcube.vn` | ⏳ CÒN. **Project đang tắt Google OAuth** (`google: false`) nên nút Google sẽ luôn lỗi → hoặc bật provider, hoặc bỏ nút + xoá nhánh tạo user giả |
| #5 `isLoggedIn` thoả từ localStorage trước khi auth resolve | ⏳ CÒN |
| #6 role lấy từ context client | ✅ Đã lấy từ `public.user_profiles.role` (`AuthContext.resolveDbRole`/`applyDbRole`) — nhưng vẫn là lớp UX; **RLS mới là cổng chặn thật** |
| #7 login dùng `alert()`, email `type="text"`, `tabIndex={-1}` | ⏳ CÒN |
| #9 điều khoản pre-tick | ⏳ CÒN |
| #11 `AuthModal` thiếu dialog semantics | ⏳ CÒN (Phase 2 primitive) |

**Bắt buộc trước khi dùng `/admin`:** chạy `supabase/scripts/bootstrap_admin.sql` với email của bạn. Không chạy thì `is_admin()` luôn false ⇒ không ai ghi được dữ liệu (đúng thiết kế fail-closed).