<!-- doc-meta: status=active; verified=2026-10-20; owner=integrator-w5 -->
# W5 — INTEGRATION / FIX LOG (VCUBE UI v3)

> **Snapshot:** `HEAD 97cc256` + working tree **2026-10-20 14:xx** (cây đã dirty từ W1–W3, chưa commit).
> **Nguồn:** `review/consistency.md` (R1, required) · `PLAN.md` · `DESIGN-LANGUAGE.md` (LOCKED) ·
> `UI-DEFECTS.md` · `docs/design/tokens.md` · `docs/design/taste-contract.md` · handoff W1–W3 (đối chiếu).
> **`review/a11y-responsive.md` KHÔNG tồn tại** trong cây này ⇒ **a11y review vẫn PENDING**;
> các điểm a11y dưới đây chỉ là kiểm **tĩnh** trên code, không thay thế R2.
>
> **Không commit.** Không sửa `src/backend/**`, `src/stores/**`, `src/utils/**`, `src/workers/**`,
> `supabase/**`, `package.json`, `vite.config.*`, `.env`. Không thêm dependency, không đổi route/IA,
> không thêm feature/data.

---

## 0. Tóm tắt

| Nhóm | Kết quả |
|---|---|
| **B** | **1/1 FIXED** — CC-01 (3 overlay StrictMode) |
| **M** | **5/5 FIXED** — CC-02, CC-03, CC-04, CC-05, CC-06 |
| **m** | **8/8 FIXED** — CC-07 … CC-14 |
| **N** | 0/5 — CC-15 … CC-19 **DEFER** (ngoài phạm vi W5, xem §3) |
| **a11y** | `a11y-responsive.md` **không có** ⇒ R2 pending. Đã kiểm tĩnh: focus ring + keyboard shim của card interactive **đã có sẵn**, không phải sửa; xem §6. |
| **Gate** | `lint` PASS · `build` PASS · contrast **0 unexpected fail** · combos **SẠCH** · ui-rules **PASS** · fabricated **SẠCH** · icons **PASS** |
| **Điểm cần Lead biết** | CC-04 chọn **revert 20px**; CC-05 chốt **1 hệ viền `line-subtle`** cho card/panel; CC-07/09 **bỏ CTA quote trong announcement bar**; CC-08 admin brand mark **coral** |

---

## 1. FIXED — B / M

| ID | Sev | File:line (sau sửa) | Trước | Sau |
|---|---|---|---|---|
| **CC-01** | **B** | `components/AuthModal.tsx:232-246` · `components/CartDrawer.tsx:78-88` · `components/InvoiceModal.tsx:46-136` (+ body `:139-...`) | `return null` (hoặc `if (!isOpen \|\| !order) return null`) **trước** `<Modal>` ⇒ `<Modal>` chỉ mount lúc mở; StrictMode cleanup gọi `dialog.close()` → sự kiện `close` bất đồng bộ → `onClose()` → modal tự đóng ở dev | **`<Modal open={isOpen}>` LUÔN mount**; nội dung nằm sau guard (`{isOpen && …}`) — `InvoiceModal` tách `InvoiceModalBody` (chỉ dựng khi có `order`) đúng pattern `CadQuickViewModal.tsx:47-53`. Props/hành vi/call-site `App.tsx` **không đổi** |
| **CC-02** | M | `admin/groups/Group2DesignersPanel.tsx:282,316,324` · `Group5ProductionPanel.tsx:908` · `Group1WorkshopsPanel.tsx:1933-1935` · `admin/PricingConfigPanel.tsx:2628,2634,2647` | `Doanh Thu & Sales` · `Pioneer Makers` · `Royalties Ghi Nhận` · `% Match` · option render enum thô `active/busy/offline` · placeholder `Min`/`Max` (kèm label `Min/Max`) | `Doanh thu & bán hàng` · `Tác giả tiên phong` · `Hoa hồng ghi nhận` · `% khớp` · `Sẵn sàng`/`Đang bận`/`Ngoại tuyến` (**value giữ nguyên** `active/busy/offline`) · `Nhỏ nhất`/`Lớn nhất` + label `Nhiệt Độ Đầu Đùn Nhỏ Nhất / Lớn Nhất (°C)` |
| **CC-03** | M | `components/PageSkeleton.tsx:31,73,79,82` · `components/NotFoundView.tsx:20` | 4 chuỗi EN trong chrome lazy-route (`VCUBE-SYSTEM-INITIALIZING`, `SHADERS & SLICER COMPILED ON-DEMAND`, `+ ENGINE: THREE_R185`, `STATUS: LAZY_CHUNKING_ACTIVE`) + `ERROR 404 • ROUTE NOT FOUND` | `HỆ THỐNG VCUBE ĐANG KHỞI TẠO` · `ĐANG BIÊN DỊCH SHADER & CẮT LỚP` · `+ BỘ DỰNG: THREE_R185` · `TRẠNG THÁI: ĐANG NẠP MÃ` · `LỖI 404 • KHÔNG TÌM THẤY ĐƯỜNG DẪN` (D-A: `slicer` → “cắt lớp”) |
| **CC-04** | M | `ui/Card.tsx:54` | `lg: 'p-6'` (**24px**) — drift do W1, trái `tokens.md:160` (`lg 20`) và làm 5 card console dày lên | **Revert `lg: 'p-5'` (20px)**; `docs/design/tokens.md` map `sm 12 / md 16 / lg 20` **giữ nguyên đúng** ⇒ 31 call-site `padding="lg"` về density cũ. (Không chọn phương án sửa docs vì sẽ làm 24px thành chuẩn cho toàn console.) |
| **CC-05** | M | `ui/Card.tsx:45` · `ui/DataTable.tsx:554,775` · docs `DESIGN-LANGUAGE §1.1/§3.1/§3.5` + `docs/design/tokens.md` §1 + §Card | 2 hệ viền: primitive `border-line` (`#E7E3D6`) vs **103** panel/card tự dựng `border-line-subtle` (`#F0EDE3`) ⇒ trong cùng trang card primitive đậm hơn panel | **Chốt 1 hệ (minimal blast radius):** card/panel/bảng mặc định = **`border-line-subtle`** (Card flat + 2 wrapper DataTable), **`line`** giữ cho **panel mạnh**: band, modal, popover, toolbar, hover card flat. Không sweep 103 file. Docs đã cập nhật theo. |
| **CC-06** | M | `views/AdminDashboardView.tsx:319-327` | `/admin` **0 `<h1>`**, 0 `PageHeader` (mọi panel tự dựng `<h2>`) ⇒ cấu trúc heading khác toàn app | Thêm **một `<h1 className="sr-only">`** = `currentMeta.title` của section đang mở (URL là nguồn sự thật) ⇒ **1 h1/trang**, có heading cấp 1 cho screen reader, **không đổi layout/density** console |

---

## 2. FIXED — m (CC-07 … CC-14)

| ID | File | Cách sửa | Ghi chú |
|---|---|---|---|
| **CC-07** | `components/Header.tsx:224-233` (+ announcement `:155-166`) | Nút search drawer thêm **`hidden` gốc** → `hidden lg:flex 2xl:hidden`: dưới `lg` **chỉ còn hamburger** (1 nút mở 1 drawer); dải `lg–2xl` dùng nút search/menu. **Desktop:** CTA `Báo giá ngay →` **bỏ khỏi announcement bar** ⇒ 1 CTA quote/viewport (nav `Báo Giá In 3D`) | UI-027 đóng ở mức code; mobile **không** thêm tap-target <44px (CTA cũ 20px cao nên không chuyển xuống mobile) |
| **CC-08** | `views/AdminDashboardView.tsx:585-588` | Brand mark console `bg-primary text-primary-fg` → **`bg-brand text-fg shadow-e0`** = coral như Header/`/lab`/`/designer` (D3: chữ trên coral phải `text-fg` 5.23; console không dùng `shadow-soft`) | Không đổi avatar `QT` (`bg-primary` là chip người dùng, không phải brand mark) |
| **CC-09** | `components/Header.tsx` (announcement) | CTA guest→`/auth/login` được **gỡ cùng CC-07**; `/quote` vẫn public qua nav `tool_3d` (nav hiển thị cho cả khách) | Không còn đường nào đá khách về login khi muốn báo giá |
| **CC-10** | `src/App.tsx:2007-2009` · `components/PageSkeleton.tsx:15` | Footer `max-w-[1440px] px-4 sm:px-6 md:px-12` → **`max-w-7xl px-4 sm:px-6 lg:px-8`** (khớp header); skeleton `max-w-[1440px]` → **`max-w-7xl`** | UI-038 đóng **một phần** (container); copy skeleton theo surface vẫn deferred |
| **CC-11** | `views/AdminDashboardView.tsx:526-536` | Search sidebar console thêm **`className="rounded-full"`** (search pill §3.3); `Input` merge className sau base nên `rounded-full` thắng `rounded-md` | Chỉ search; không đổi control khác. Ghi rõ trong §3.3 DESIGN-LANGUAGE |
| **CC-12** | `views/HomeView.tsx:1348,1365,1369,1373,1396,1404,1412` | Band tối: `border-line-subtle` → **`border-on-inverse/15`**; `border-t border-line-subtle/50` → `border-on-inverse/15`; `rounded` (4px) → **`rounded-sm` (8px)**; `border-line/20` (ghost CTA) → `border-on-inverse/15` | Đúng bảng chuyển đổi §6: light border token không dùng trên nền tối |
| **CC-13** | `ui/Card.tsx:58` | `transition-all duration-300 ease-out` → **`transition-shadow duration-200 ease-out`** (`motion-reduce:transition-none` giữ) | Đúng §2.4 (token duration 200, không animate layout); đã ghi vào §2.4 |
| **CC-14** | `views/HomeView.tsx:37-48` · `components/CadQuickViewModal.tsx:463` | Helper `vnd()` Home `… đ` → **`… ₫`** (4 call-site: `:1124,1132,1241,1244`) + `CadQuickViewModal` `đ/g` → **`₫/g`** (D-B) | Mức **m** giữ nguyên (register gốc P3), nhưng là luật cứng D-B. Chỉ 2 chỗ trong phạm vi review; `đ/g` còn ở console (`Tool3DView`, `WarehouseInventoryPanel`) **không** thuộc phạm vi CC-14 ⇒ xem §3 |

---

## 3. DEFERRED (không sửa trong W5)

| ID | Sev | Vì sao defer | Đề xuất owner |
|---|---|---|---|
| **CC-15** (N) | N | Docblock primitive ghi giá trị token cũ (`Modal` “20px”, `Section` “24px”, `PersonalizeView` `#8590A6`) — chỉ là comment, **không render**, sửa cùng đợt cleanup docblock để không trộn với diff hành vi | W6/cleanup |
| **CC-16** (N) | N | Nit copy: aria-label `studio`, `Quản Trị Hệ Thống` hoa/thường, `• NCC:`, badge `HOT` — thuộc file `App.tsx`/`HomeView`/`AccessoriesManager` ngoài 6 mục W5; rủi ro thấp nhưng không phải lỗi B/M | W6 |
| **CC-17** (N) | N | Nhãn “Theo dõi đơn hàng thời gian thực” → `/orders` (sai đích + claim realtime) — cần Lead chốt đích `/orders` hay `/tracking` | Lead + W6 |
| **CC-18** (N) | N | Sticky offset `top-20` (Explore) vs `lg:top-24` (PDP/Cart/Checkout/Personalize) — sửa 5 file storefront, ngoài phạm vi review fix; lệch 16px chỉ thấy khi chuyển trang | W6 |
| **CC-19** (N, = **UI-036**) | N | Primitive chết `Section`/`Toolbar`/`ToastViewport` — cần quyết định sống/chết của Lead (W3 handoff đã nêu); xoá/giữ primitive là quyết định kiến trúc, không phải review fix | Lead |
| Khác | — | `đ/g` ở console (`Tool3DView.tsx:1325,1339`, `WarehouseInventoryPanel.tsx:208`) **không** nằm trong CC-14 (review chỉ nêu Home + CadQuickView). Nếu Lead muốn D-B tuyệt đối: sweep 3 chỗ, rủi ro thấp | W6 |
| Khác | — | `review/a11y-responsive.md` chưa có ⇒ **R2 chưa chạy**: focus/label/contrast 390-768-1440/reduced motion chưa được review độc lập | review-a11y |

---

## 4. Files changed (W5)

**Source (16)** — chỉ các dòng liên quan finding, không refactor:

| File | Finding |
|---|---|
| `src/frontend/components/AuthModal.tsx` | CC-01 |
| `src/frontend/components/CartDrawer.tsx` | CC-01 |
| `src/frontend/components/InvoiceModal.tsx` | CC-01 (tách `InvoiceModalBody`) |
| `src/frontend/components/admin/groups/Group2DesignersPanel.tsx` | CC-02 |
| `src/frontend/components/admin/groups/Group5ProductionPanel.tsx` | CC-02 |
| `src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx` | CC-02 |
| `src/frontend/components/admin/PricingConfigPanel.tsx` | CC-02 |
| `src/frontend/components/PageSkeleton.tsx` | CC-03 + CC-10 |
| `src/frontend/components/NotFoundView.tsx` | CC-03 |
| `src/frontend/components/Header.tsx` | CC-07 + CC-09 |
| `src/frontend/components/CadQuickViewModal.tsx` | CC-14 |
| `src/frontend/ui/Card.tsx` | CC-04 + CC-05 + CC-13 |
| `src/frontend/ui/DataTable.tsx` | CC-05 (2 wrapper) |
| `src/frontend/views/AdminDashboardView.tsx` | CC-06 + CC-08 + CC-11 |
| `src/frontend/views/HomeView.tsx` | CC-12 + CC-14 |
| `src/App.tsx` | CC-10 (footer container — file của foundation, sửa đúng SHELL scope của integrator) |

**Docs (3):**

| File | Thay đổi |
|---|---|
| `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` | §1.1 vai trò `line`/`line-subtle`; §2.4 thêm luật `Card interactive: transition-shadow duration-200`; §3.1 Card flat = `border-line-subtle`; §3.3 search pill áp cho search console; §3.5 wrapper DataTable = `border-line-subtle` |
| `docs/design/tokens.md` | §1 vai trò 2 token viền; §Card/Panel (`flat` = `--color-line-subtle`, hover đậm lên `--color-line`). Map padding `lg 20` **không đổi** (đã đúng sau CC-04) |
| `docs/tasks/ui-redesign-v3/review/integration.md` | File này |

---

## 5. Gates (chạy trên cây sau khi sửa)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** — `tsc --noEmit`, 0 lỗi |
| Build | `npm run build` | **PASS** — `✓ built in 5.78s`, exit 0 |
| Contrast token | `node scripts/check-contrast.mjs` | **56/70 pass, 14 expected non-pass, 0 unexpected fail** (không đổi baseline) |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **SẠCH** — 99 file `.tsx`, 14 luật, **0 tổ hợp < 4.5:1**; near-miss `fg-subtle` **20** (không đổi) |
| UI rules | `node scripts/check-ui-rules.mjs` | **PASS** — 139 file, 0 vi phạm mới ngoài allowlist |
| Data honesty | `node scripts/check-fabricated.mjs` | **SẠCH** — 139 file, 0 tuyên bố bịa |
| Icon names | `node scripts/check-icon-names.mjs` | **PASS** — 138 file, 224 glyph |
| Error handling | `node scripts/check-error-handling.mjs` | **PASS** — R1/R2 = 0, `warn-in-catch` 53/53 (trong budget, không đổi) |
| Unit-price multiplier | `node scripts/check-unitprice-multiplier.mjs` | **PASS** — 139 file, không nơi nào nhân sai |
| Doc refs (advisory) | `node scripts/check-doc-refs.mjs --warn` | advisory — 105 path cũ trong `docs/plans/**` (đã archive), **không do W5** |
| Live check (`npm run check` full / browser) | — | **SKIP theo chỉ đạo** (Supabase paused; máy không có Playwright) |

---

## 6. a11y — kiểm tĩnh (R2 vẫn pending)

1. **Card interactive (admin overview / StatCard):** `StatCard` truyền `interactive={Boolean(onClick)}` → `Card` thêm
   `cursor-pointer` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`ui/Card.tsx:58`) và
   keyboard shim `role="button"` + `tabIndex=0` + `Enter`/`Space` (`Card.tsx:74-93`). Các thẻ KPI, cảnh báo, CTA
   trong `Group0OverviewPanel` đều là `StatCard`/`Button` ⇒ **đã có focus ring + keyboard**, không thiếu
   `focus-visible`. Không sửa primitive (tránh đổi visual toàn app ngoài finding).
2. **Heading:** mỗi màn admin còn đúng 1 `h1` (sr-only, CC-06); panel giữ `h2`/`h3` ⇒ thứ bậc heading liền mạch.
3. **aria-label:** nút search drawer đổi thành `Mở tìm kiếm & menu` (khớp hành vi thật: mở drawer có cả hai).
4. **Contrast:** mọi thay đổi màu đều dùng token đã đo (`border-on-inverse/15`, `bg-brand + text-fg` 5.23,
   `rounded` không ảnh hưởng contrast); combos 0 vi phạm.
5. **PENDING (cần R2):** focus trap/ESC trong `InvoiceModal` sau khi tách body, thứ tự focus khi mở 3 overlay,
   390/768/1440 re-flow của admin h1 (sr-only nên không ảnh hưởng), `prefers-reduced-motion` toàn cục.

---

## 7. Đề nghị cập nhật register (QA W6)

| ID | Trạng thái đề nghị | Căn cứ |
|---|---|---|
| **UI-007** | **Đóng một phần** (còn 0 chuỗi EN trong 6 vị trí CC-02; các chuỗi UI-007 khác đã đóng ở W3) | CC-02 |
| **UI-027** | **Đóng (code)** — mobile 1 nút drawer, desktop 1 CTA quote; cần ảnh 390 + 1440 để QA xác nhận | CC-07 |
| **UI-038** | **Đóng một phần** — container skeleton = `max-w-7xl` khớp header; “skeleton theo surface/copy ngữ cảnh” vẫn mở | CC-10 |
| **UI-039** | **Đóng (code)** — Home + CadQuickView dùng `₫`; console `đ/g` còn lại ghi ở §3 | CC-14 |
| **UI-036** | **Vẫn mở** — `Section`/`Toolbar`/`ToastViewport` chết, chờ Lead chốt | CC-19 |
| **UI-017 / near-miss** | Không đổi — 20 chỗ 4.56:1 như trước | combos |

> Không sửa trực tiếp `UI-DEFECTS.md` (owner `ui-auditor`, QA W6 xác minh độc lập).

---

## 8. Rủi ro còn lại

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| Fix CC-01 mới được xác nhận **tĩnh** (build/typecheck); chưa có bằng chứng browser “dialogs open = 1” ở dev StrictMode | Trung bình | W6 mở dev server, bấm Đăng nhập / Giỏ hàng / Hoá đơn trên 390 + 1440; nếu vẫn 0 dialog thì kiểm lại `Modal` effect (`open` prop đổi sau mount) |
| **R2 a11y chưa có** — không có file review thứ hai | Trung bình | Chạy `review-a11y` trước QA, đối chiếu §6 |
| CC-04 revert 20px + CC-05 `line-subtle`: console quay về hairline mảnh hơn W3 một chút | Thấp | Ảnh 1440 `/admin` so baseline W0; đây là trạng thái **trước W1**, không phải style mới |
| Bỏ CTA trong announcement bar: CMS copy có thể đang kỳ vọng có link | Thấp | Kiểm `site_content.announcementText` ở `/admin/storefront-cms`; nếu cần CTA thì thêm lại **trong nav** (không thêm CTA thứ hai) |
| Header dải `lg–2xl` chỉ còn nút “tìm kiếm & menu” (không còn 2 nút) | Thấp | Ảnh 1024/1280: nút mở drawer có search thật, `aria-expanded`/`aria-controls` đã có |
| Docs W1–W3 handoff vẫn ghi “density không đổi” và Card `border-line` | Thấp | Handoff là bản ghi lịch sử, **không sửa**; nguồn chuẩn hiện tại là `DESIGN-LANGUAGE.md` + `tokens.md` (đã cập nhật) |
| Build ghi `dist/` (không commit) | Thấp | `dist/` đã gitignore |

---

## 9. Không đụng / không đổi

- Không sửa backend/stores/utils/workers/supabase/`package.json`/`vite.config`/`.env`.
- Không đổi route, slug, nhãn nav, IA; không thêm feature/dữ liệu/dependency.
- Không sweep 103 file `border-line-subtle`; không mass-codemod i18n (nhánh `en:` chết vẫn để nợ theo PLAN §5.4).
- **Không commit.**

---

## 10. W5b — sửa a11y R2 (`review/a11y-responsive.md`)

> **Snapshot:** cây sau W5 + W5b, 2026-10-20. `review/a11y-responsive.md` **đã tồn tại**
> (R2 của `review-a11y`, `HEAD 97cc256` + working tree) ⇒ mục §3 “R2 pending” và §6
> “PENDING” ở trên **đã lỗi thời**; nguồn sự thật cho a11y từ đây là R2 + mục này.
> Phạm vi W5b **chỉ 5 file** (4 source + 1 doc), không route/feature/dependency, không commit.

### 10.1 FIXED

| ID | Sev | File:line (sau sửa) | Trước | Sau |
|---|---|---|---|---|
| **A11Y-01** | **M** | `views/CheckoutView.tsx:259` (nhánh giỏ trống) · `:284` (nhánh chính) | `/checkout` là view **duy nhất** không có `h1`; outline bắt đầu ở `h2` (“1. Thông Tin Nhận Hàng…”, “2. Phương Thức Thanh Toán”, “Đơn Hàng”) | Thêm **một `h1` cấp trang** `<h1 className="sr-only">Thanh Toán</h1>` **cho mỗi nhánh render** (2 nhánh `return` loại trừ nhau ⇒ **DOM luôn có đúng 1 `h1`**, không trùng). Đặt **ngoài** container `space-y-*` để `sr-only` (absolute) không đổi layout/density. 3 tiêu đề mục **giữ `h2`** (`:386`, `:483`, `:697`). *Chọn `sr-only` thay vì `PageHeader` visible:* thêm tiêu đề visible sẽ đẩy fold trên 390×667 mà W5b không có gate browser ⇒ theo đúng tiền lệ CC-06 (admin `h1` sr-only) và gợi ý “no layout change” của R2. |
| **A11Y-02** | **M** | `src/index.css:424-434` · `components/Header.tsx:230,310` (2 nút mở drawer) · `:382` (nav row drawer) · `:371` (search drawer) | `.touch-target-btn` chỉ đặt `min-height` ⇒ hamburger **40×44**; drawer nav row `py-2.5` ≈ **40px** cao; drawer search `h-10` = **40px** | `index.css`: thêm `min-width: var(--touch-target-min)` (44px) trong `@media (max-width: 767px)` ⇒ **mọi** `.touch-target-btn` đạt 44×44 ở <768. `Header`: 2 nút icon thêm `min-w-11`; nav row thêm `max-md:min-h-11`; search drawer `h-11 md:h-10`. **Desktop giữ nguyên:** media query chỉ <768, nav row/search chỉ đổi dưới `md` (drawer vẫn mở được ở dải `lg–2xl` nhưng row/search giữ 40px như cũ); nút search-drawer `lg–2xl` tăng **4px bề rộng** (40→44) — chấp nhận vì đây là control cảm ứng và `min-w` không đổi chiều cao/nhịp. |
| **A11Y-03** | **M** | `components/PageSkeleton.tsx:13-23` | Root không có `role=`, `aria-live`, `aria-busy` ⇒ mọi lazy route im lặng khi nạp chunk | Root: `role="status"` + `aria-live="polite"` + `aria-busy="true"` + nhãn VI `sr-only` “Đang tải trang, vui lòng chờ…”. **Không thêm `aria-label`** để tránh hai tên cho cùng vùng (nhãn đã là text `sr-only`, đúng yêu cầu). Không đổi skeleton/visual. |
| **A11Y-04** | m | `components/Header.tsx:233,311` (2 trigger) · `:333` (dialog) | Dải `lg–2xl`: “Mở tìm kiếm & menu”; mobile: “Mở menu điều hướng”; dialog: “Menu điều hướng” | **Một tên cho cùng điều khiển ở mọi breakpoint:** cả 2 trigger = `Mở menu & tìm kiếm`; dialog = `Menu & tìm kiếm` (danh từ, không lặp động từ “Mở” của trigger). |
| **A11Y-05** | m | `components/Header.tsx:237,313` | `aria-controls="vcube-mobile-nav"` luôn khai báo, nhưng panel chỉ mount khi mở ⇒ IDREF gãy lúc đóng | `aria-controls={mobileMenuOpen ? 'vcube-mobile-nav' : undefined}` trên **cả 2** trigger ⇒ chỉ tồn tại IDREF khi đích có thật; lúc đóng dùng `aria-expanded=false`. Panel vẫn mount theo điều kiện (không đổi focus trap/scroll lock/StrictMode). |
| **A11Y-06** | m | `ui/StatCard.tsx:44-51,80,107-119` | `StatCard` interactive thành `role="button"` với tên truy cập = ghép label + value + delta + hint (dài, không gợi đích) | Thêm prop optional **`actionLabel?: string`**; khi có `onClick`, `StatCard` truyền `aria-label` = `actionLabel` nếu được cấp, ngược lại chuỗi “Xem chi tiết <label>”, qua `Card` (`...rest` đã forward). Không đổi visual/markup hiển thị; thẻ tĩnh không có `onClick` **không** bị đặt `aria-label`. Call-site cũ không phải sửa. |

### 10.2 DEFERRED (giữ nguyên, QA verify)

| ID | Sev | Vì sao chưa sửa trong W5b | Cách xác minh |
|---|---|---|---|
| **A11Y-07** | m | Sweep focus raw `<button>` trong `components/admin/**` (~50 nút, ~43 thiếu `focus-visible`) là thay đổi diện rộng ngoài 5 file W5b; hiện **không** có `outline-none` nào thiếu replacement ⇒ vẫn thấy focus (UA outline) | QA 1440 console: tab qua tab-strip `AdminStorefrontPanel` / `PricingConfigPanel`, xác nhận indicator đủ thấy trên `surface-muted` |
| **A11Y-08** | m | Quy ước dùng `fg-subtle` (4.56:1) cho hint 12px là **usage rule**, sửa 20 near-miss site nằm ngoài 5 file; baseline combos giữ 20 | QA/`check-contrast-combos`: xác nhận không tăng near-miss; V6 compositing trên `backdrop-blur` |
| **A11Y-09** | m | Sheet `max-h-[85dvh]` + bàn phím mobile: cần browser thật, không kết luận được tĩnh | **verify-in-browser** 390×667, V1: mở sheet có input, bàn phím bật, footer close còn với tới |
| A11Y-10..13 (N) | N | Ngoài phạm vi W5b (docblock token, tab-strip label, `type=search`, guard-rail `accent`) | W6/cleanup |

### 10.3 Gates (chạy trên cây sau W5b)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** — `tsc --noEmit`, 0 lỗi |
| Build | `npm run build` | **PASS** — `✓ built in 5.32s`, exit 0 |
| Contrast token | `node scripts/check-contrast.mjs` | **56/70 pass, 14 expected non-pass, 0 unexpected fail** (không đổi baseline) |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **SẠCH** — 99 file `.tsx`, 14 luật, **0 tổ hợp < 4.5:1**; near-miss `fg-subtle` **20** (không đổi, đúng A11Y-08 deferred) |
| UI rules | `node scripts/check-ui-rules.mjs` | **PASS** — 139 file, 0 vi phạm mới ngoài allowlist |

### 10.4 Files changed (W5b)

| File | Finding |
|---|---|
| `src/frontend/views/CheckoutView.tsx` | A11Y-01 |
| `src/index.css` | A11Y-02 (`min-width` cho `.touch-target-btn`) |
| `src/frontend/components/Header.tsx` | A11Y-02 + A11Y-04 + A11Y-05 |
| `src/frontend/components/PageSkeleton.tsx` | A11Y-03 |
| `src/frontend/ui/StatCard.tsx` | A11Y-06 (`actionLabel` optional) |
| `docs/tasks/ui-redesign-v3/review/integration.md` | mục 10 (file này) |

> Không sửa backend/stores/utils/workers/supabase/`package.json`/`vite.config`/`.env`;
> không đổi route/slug/nav/IA; không thêm dependency; **không commit**.

### 10.5 Rủi ro còn lại (W5b)

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| `sr-only h1` ở `/checkout` là lựa chọn **không đổi layout**; nếu Lead muốn tiêu đề visible thì đó là thay đổi thiết kế (PageHeader) cần ảnh 390/1440 | Thấp | Chốt với Lead; nếu đổi sang visible, giữ đúng 1 `h1` và bỏ bản `sr-only` tương ứng |
| `role=status` + `aria-busy="true"` trên skeleton: một số AT hoãn thông báo khi `busy` còn `true` (region unmount trước khi thành `false`) | Thấp | **verify-in-browser** V-series: bật SR, điều hướng route lazy, nghe thông báo tải; nếu câm ⇒ chuyển `aria-busy` sang `<main>` của `App.tsx` (ngoài phạm vi W5b) |
| `min-w-11` trên trigger `lg–2xl` làm nút search-drawer rộng thêm 4px (40→44) | Rất thấp | Ảnh 1280 nếu cần; không đổi chiều cao/nhịp |
| A11Y-07/08/09 vẫn mở | Trung bình | QA W6 sweep + browser verify như §10.2 |

---

## 11. W5c — Browser-verified R2 fixes (2026-10-20 15:0x)

> Nguồn: `review/a11y-responsive.md` (browser-measured, B1/M5). W5c sửa trực tiếp sau W5b.

| ID | Sev | Kết quả | Bằng chứng |
|---|---|---|---|
| A11Y-01 | **B** | **FIXED** | `CadQuickViewModal` footer `w-full sm:flex-1` + `shrink-0`; browser đo lại: CTA **316×48px** ở 390 (trước 316×16), footer 117px, label đọc được. Script `/tmp/vcube-a11y-review/qbtn2.mjs` |
| A11Y-02 | M | **FIXED** | `Card` interactive thêm `focus-visible:outline-2 outline-offset-2 outline-ring`; browser đo admin StatCard: `outline: rgb(28,25,23) solid 2px` (trước `none`). Script `admin-focus-shot.mjs` |
| A11Y-03 | M | **FIXED** | Onboarding selected tile: `text-fg-subtle` → `text-fg-muted` (6.63:1 thay 4.37:1) |
| A11Y-04 | M | **FIXED (ARIA)** | 3 viewer canvas có `role="img"` + `aria-label` VI; không đổi scene/lights/geometry. Keyboard-orbit đầy đủ vẫn là follow-up (ghi risk) |
| A11Y-05 | M | **FIXED** | 3D toolbar `max-md:size-11`; PDP tab `max-md:min-h-11`; raw PDP controls `max-md:min-h-11` |
| A11Y-06 | M | **FIXED 100%** | W5c sửa 106/121; Lead hoàn tất 15 chỗ còn lại trong 8 file (`CustomIdeaRequestModal`, `DesignerUploadWizardTab`, `DesignerModelsManagerTab`, `MyOrdersView`, `HomeView`, `ExploreView`, `PersonalizeView`, `CheckoutView`). `grep focus:ring-ring/20` = **0** |
| A11Y-07..11 | m | FIXED (an toàn) | `aria-modal="true"`; cart aria-label có số lượng; CartView empty có h1; quick-view “Tuỳ biến” aria-label; metrology `grid-cols-2 sm:grid-cols-4` + bỏ truncate |
| A11Y-12 | m | **DEFER** | MachineComparisonModal bảng 6 cột 390: giữ exception có ghi chú; QA/browser xác nhận |
| A11Y-13 | m | **DEFER** | UI-027 duplicate trigger đã đóng code (search hidden <lg); aria-controls dangling đã sửa W5b; hành vi còn lại là product decision |
| A11Y-14..16 | N | **DEFER** | InfoTip 24px / tag chip; admin raw-button focus look; search `type=search` — cleanup |

### Gates sau W5c + codemod

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** (tsc 0 lỗi) |
| `npm run build` | **PASS** (✓ 5.52s) |
| `check-contrast` | 56/70 + 14 expected, **0 unexpected** |
| `check-contrast-combos` | **SẠCH** (0 vi phạm; 20 near-miss) |
| `check-ui-rules` | **PASS** |
| `check-fabricated` | **SẠCH** |
| `check-icon-names` | **PASS** |
| `check-error-handling` | **PASS** |
| 10 gate offline còn lại | **PASS** |

### Rủi ro còn lại

- Chưa có QA browser đầy đủ trên **catalog thật** (Supabase paused); ảnh hiện tại dùng fixture network-layer.
- `A11Y-04` mới ở mức ARIA; chưa có keyboard orbit/zoom đầy đủ cho 3D.
- `A11Y-12` MachineComparisonModal 390 vẫn cuộn ngang trong modal (exception).
- `A11Y-14..16` + `CC-15..19` là nit/cleanup, không chặn UI.

---

## 12. W5c — nhật ký kiểm chứng & số liệu chính xác (bổ sung)

> §11 được một owner W5c **song song** ghi trong lúc session này đang đo browser trên cùng cây.
> Mục này là bản ghi của session đã sửa + verify, kèm **đính chính số đếm A11Y-06**; **không sửa §11**.
> Snapshot: W5 + W5b + W5c, **2026-10-20 ~15:00**; không commit.

### 12.1 Đính chính A11Y-06

- Cây có **121 dòng** khớp `ring-ring/20`; trong đó **116** là **focus ring** (`focus:ring-2 focus:ring-ring/20`)
  và **5** là **selected-state** (`ring-2 ring-ring/20`, không có prefix `focus:` — không phải focus indicator).
- Session này thay **105 occurrence focus** trong **11 file**: 8 file `admin/**` + `Header.tsx` +
  `CadQuickViewModal.tsx` + `ProductDetailView.tsx` (100 + 2 + 1 + 2).
- **11 occurrence focus còn lại** (8 file `views/**`, `components/designer/**`, `components/custom/**`) được
  owner khác đóng đồng thời lúc **14:54:42** (mtime); session này **không** sửa 8 file đó. Vì vậy **không**
  phải “15 chỗ” — 5 dòng còn lại của 121 là selected-state, **giữ nguyên có chủ ý**
  (`Group2DesignersPanel.tsx:736`, `HomeView.tsx:619`, `CheckoutView.tsx:495,522,551`).
- Snapshot: `grep -rn 'focus:.*ring-ring/20' src` = **0**; `grep -rn 'ring-ring/20' src` = **5** (selected-state).

### 12.2 FIXED (session này)

| ID (R2) | Sev | File:line (sau sửa) | Sửa | Verify browser |
|---|---|---|---|---|
| A11Y-01 | **B** | `CadQuickViewModal.tsx:543-562` | CTA `w-full sm:flex-1`; footer `shrink-0`; giữ `h-12` | **316×48** ở 390×667 + 390×844 (trước 316×16.19); 48px ở 640/768/1440; footer 117/61px; `scrollWidth=390` |
| A11Y-02 | M | `ui/Card.tsx:57-63` | `focus-visible:outline-2 outline-offset-2 outline-ring` + giữ ring; bỏ `outline-none` (v4 đặt `--tw-outline-style:none`) | Tab StatCard: `outline: rgb(28,25,23) solid 2px`, offset 2px @1440 & 390; `boxShadow:none`; card tĩnh không đổi |
| A11Y-03 | M | `WorkshopOnboardingWizard.tsx:707-710` | Ô đang chọn `text-fg-muted` (ô thường giữ `fg-subtle`) | `/lab` 390: `#57534E` trên `#F0EFEB` = **6.63:1** @12px |
| A11Y-04 | M | `ThreeModelViewer.tsx:424-433` · `PersonalizeModelViewer3D.tsx:711-719` · `tool3d/ModelViewer3D.tsx:1767-1773` | `role="img"` + nhãn VI trên **container canvas** (không trên wrapper vì còn toolbar/slider); không đổi scene/lights/geometry | `/products/p1`, quick-view, `/personalize/p1`, `/quote` (upload STL) đều `role=img` + nhãn |
| A11Y-05 | M | `UnifiedCadToolbar.tsx:81,98,112,125,137` · `ProductDetailView.tsx:230-233,799,826` · `tool3d/ModelViewer3D.tsx:1842,1856,1870,1885,1899` | `max-md:size-11` (5 nút toolbar); `max-md:min-h-11` (tab pill + 2 raw control); **thêm** `shrink-0` cho toolbar riêng của `ModelViewer3D` (bị flex bóp 18×44 ở 390) | 390: toolbar 44×44, tab 44, select/input 44; 640: toolbar 44; **768/1440: 40 / 31 / 40 — desktop không đổi**; `/quote` toolbar 44×44 @390, 40×40 @1440 |
| A11Y-06 | M | 8 file `admin/**` + `Header.tsx` + `CadQuickViewModal.tsx` + `ProductDetailView.tsx` | Codemod 105 × `focus:ring-2 focus:ring-ring/20` → `focus:ring-ring`; không đổi offset/layout | Toàn cây focus `/20` = 0 (§12.1); 5 selected-state giữ nguyên |
| A11Y-07 | m | `ui/Modal.tsx:303-311` | `aria-modal="true"` trên `<dialog>` (Sheet kế thừa) | `dialog[open]` có `aria-modal=true`; Esc/focus-return/body-lock không đổi |
| A11Y-08 | m | `Header.tsx:271-277` | `aria-label` “Giỏ hàng, N sản phẩm”; badge `aria-hidden` | Empty = “Giỏ hàng”; sau thêm 1 tệp = “Giỏ hàng, 1 sản phẩm”; badge ẩn |
| A11Y-09 | m | `CartView.tsx:104-110` | `<h1 class="sr-only">Giỏ Hàng</h1>` trước EmptyState | `/cart` rỗng: đúng 1 `h1` |
| A11Y-10 | m | `CadQuickViewModal.tsx:586-591` | `aria-label="Tuỳ biến 3D & khắc laser"`; giữ `title` | 390: `aria-label` hiện đúng |
| A11Y-11 | m | `CadQuickViewModal.tsx:323-333` | `grid-cols-2 sm:grid-cols-4`; bỏ `truncate`, `break-words` | 390: grid `158px 158px`; đọc trọn “120 × 85 × 45 mm” |

### 12.3 DEFERRED / ghi nhận

| ID (R2) | Trạng thái | Ghi chú |
|---|---|---|
| A11Y-12 | **DEFER** | `MachineComparisonModal` bảng 6 cột 390 chưa có card fallback — cần browser + quyết định thiết kế |
| A11Y-13 | **ĐÃ ĐÓNG SAU QA-02** | W5b/CC-07 chưa đủ vì `.touch-target-btn{display:inline-flex}` ngoài layer thắng `hidden` <768px (QA-02). Đã bỏ `display` khỏi rule; `probe-header.mjs` xác nhận 390/768/1024/1440 đúng 1 trigger |
| A11Y-14 | **DEFER** | `InfoTip` 24px, tag chip 24px, footer text button — đạt WCAG 2.5.8 hoặc là inline link |
| A11Y-15 | **DEFER** | ~50 raw `<button>` admin vẫn UA outline 1px; ngoài codemod input/select |
| A11Y-16 | **DEFER** | Header search chưa `type="search"`/`enterKeyHint`/`role="search"` — nit |
| A11Y-01 (residual) | **GHI NHẬN** | Footer quick-view **không** được đưa ra ngoài vùng scroll: CTA phụ thuộc state mua hàng trong `CadQuickViewBody`; lift state là task riêng. Đã đo target 48px |
| A11Y-04 (residual) | **GHI NHẬN** | ARIA-only: orbit vẫn pointer-only; không thêm `tabIndex` để tránh control focus được mà không có affordance bàn phím đầy đủ |
| residual 390 | **GHI NHẬN** | Quick-view `<select>` vật liệu `h-9` = 36px và swatch màu 24px **không có trong R2**; giữ nguyên để không mở rộng phạm vi |

### 12.4 Gates (session này, chạy trên cây sau W5c)

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** — `tsc --noEmit`, 0 lỗi |
| `npm run build` | **PASS** — `✓ built in 5.70s`, exit 0 |
| `node scripts/check-contrast.mjs` | **56/70 pass, 14 expected non-pass, 0 unexpected fail** |
| `node scripts/check-contrast-combos.mjs` | **SẠCH** — 99 file, 14 luật, 0 tổ hợp < 4.5:1; near-miss `fg-subtle` **20** (không đổi) |
| `node scripts/check-ui-rules.mjs` | **PASS** — 139 file, 0 vi phạm mới ngoài allowlist |

**Browser evidence** (Chromium 1244 headless, dev `:3001`, fixture network-layer — không thêm file/mock vào `src/`; script tạm `/tmp/w5c-*.mjs`, ảnh `/tmp/w5c-*.png`): quick-view 390×667/844 + 640/768/1440; PDP 390/1440; `/quote` sau upload STL 390/1440; admin `/admin/overview` 390/1440; `/lab` onboarding 390; `/cart` rỗng 390. Số đo chính ở §12.2.

### 12.5 Files changed (session này)

`CadQuickViewModal.tsx` · `ui/Card.tsx` · `onboarding/WorkshopOnboardingWizard.tsx` ·
`ThreeModelViewer.tsx` · `personalize/PersonalizeModelViewer3D.tsx` · `tool3d/ModelViewer3D.tsx` ·
`tool3d/UnifiedCadToolbar.tsx` · `views/ProductDetailView.tsx` · `Header.tsx` · `views/CartView.tsx` ·
`ui/Modal.tsx` · 8 file `admin/**` (`AccessoriesManager`, `AdminProductsPanel`, `AdminSeoPanel`,
`AdminSettingsPanel`, `AdminStorefrontPanel`, `PricingConfigPanel`, `WorkshopEstimatorBOM`,
`groups/Group5ProductionPanel`) · `docs/tasks/ui-redesign-v3/review/integration.md`.

> Không sửa backend/stores/utils/workers/supabase/`package.json`/`vite.config`/`.env`; không đổi
> route/slug/nav/IA; không thêm dependency/feature/data; **không commit**.

### 12.6 Rủi ro còn lại

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| A11Y-06: 11 focus ring ngoài whitelist do owner khác sửa đồng thời; nếu diff đó bị revert, ring `/20` quay lại 8 file | Thấp | `grep -rn 'focus:.*ring-ring/20' src` trước merge = 0 |
| Outline fallback phụ thuộc Tailwind v4 (`outline-2` lấy style solid từ `--tw-outline-style`); đổi Tailwind/preflight có thể mất | Thấp | QA tab 4 StatCard `/admin/overview` 1440, kỳ vọng outline 2px màu ring |
| `role="img"` canvas chưa test NVDA/VoiceOver thật; orbit pointer-only | Thấp | Verify-in-browser V-series với SR; nếu cần thao tác → arrow-key + `tabIndex` task riêng |
| Quick-view footer vẫn trong vùng scroll | Thấp | Ảnh 390×667: CTA 48px reachable; nếu cần pinned → lift state lên `Modal.footer` |
| `shrink-0` toolbar `/quote` làm container cuộn ngang thay vì bóp nút dưới 768 | Rất thấp | Ảnh 390 `/quote` sau upload: 5 nút 44×44 + nhóm preset vẫn hiện |
| A11Y-12/14/15/16 vẫn mở | Thấp | QA W6 + owner riêng |
