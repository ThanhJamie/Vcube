> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 02 — Phân tích & tối ưu: nhóm trang công khai (khám phá & cấu hình)

Phạm vi: `/` · `/explore` · `/products/:productId` · `/personalize` · `/personalize/:productId`
Mức ưu tiên: **P0** = sai/đáng tin cậy hoặc mất tiền · **P1** = chặn chuyển đổi · **P2** = chất lượng UX · **P3** = polish.

---

## 1. `/` — HomeView (`src/frontend/views/HomeView.tsx`, 1.251 LOC)

### 1.1 Tính năng hiện có
1. Hero 3D showcase (`ThreeModelViewer`, mount ở `HomeView.tsx:411`) + CTA tới `/quote` (`:253`).
2. Dropzone nhận file CAD trong hero (`:273-307`, `:290-317`) → chuyển thẳng sang tool.
3. Simulator giá tại chỗ, tính bằng công thức rút gọn từ `pricingConfig` (`:117-126`).
4. Dải taxonomy 6 cột (`CATEGORIES`) + chip tag phổ biến.
5. Catalog inline với 2 chế độ xem (grid / bảng kỹ thuật) + bộ lọc riêng (search, category, tag, badge) (`:457-943`).
6. `MaterialComparisonMatrix` (so sánh vật liệu) mount ở `:1084`.
7. Section quy trình 3 bước + dải trust ("Trusted by", `:169-`).
8. Nút "Đồng bộ" mở `CadQuickViewModal` (mount ở `:1241`).
9. Trust badges kỹ thuật: 100% Watertight, STEP/STL/3MF, ±0.05mm QC, Commercial Ready (`:479-496`).

### 1.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Catalog inline là bản sao thứ hai của `/explore`**, có state lọc riêng (`selectedCategory`, `selectedTag`, `cadSearch`, `catalogViewMode`) → hai nguồn sự thật cho cùng một danh mục, sửa một bên không ảnh hưởng bên kia | `:457-943` vs `ExploreView.tsx:115-231` | P2 |
| 2 | **5 CTA trùng đích `/quote`** trên một trang | `:253`, `:296`, `:315`, `:935`, `:1069` | P1 |
| 3 | Dropzone — điểm khác biệt lớn nhất — bị chôn sau hero 3D; hướng dẫn kéo-thả chỉ nằm trong `title` (tooltip) | `:306` | P1 |
| 4 | Ràng buộc file (định dạng/dung lượng) không hiện trước khi thả; badge "Tối đa 150MB" không được enforce ở đâu | `:524` | P1 |
| 5 | `handleProtectedAction` chỉ là hàm rỗng mang tên gây hiểu nhầm là có gate | `:128-131` | P3 |
| 6 | State `pricingMode` được khai báo, **không bao giờ đọc/ghi** | `:49` | P3 |
| 7 | Simulator dùng trọng lượng phôi hardcode `35/85/190` g (`:118`) → giá tham khảo không khớp engine thật | `:118-126` | P1 |
| 8 | `MaterialComparisonMatrix` có bảng spec hardcode riêng (`MaterialComparisonMatrix.tsx:30-100`) và **so khớp category tiếng Anh trên UI tiếng Việt** (`:125`) | `MaterialComparisonMatrix.tsx:30-100,125` | P2 |
| 9 | Anchor `#browse-cad-catalog` dùng `scroll-mt-16` (64px) trong khi header + announcement bar thực tế cao ~90-100px → tiêu đề section bị che | `:457` vs `Header.tsx:72-84` | P2 |
| 10 | Malicious hex/arbitrary: 281 hex + 353 utility tuỳ ý chỉ trong file này | đo bằng script mục §1 `01-theme-migration.md` | P2 |
| 11 | `INITIAL_CART_ITEMS` được import nhưng không dùng | `App.tsx:25` | P3 |
| 12 | `HorizontalScrollFilter` re-attach `MutationObserver` **mỗi lần parent render** (effect phụ thuộc `[children]`), và HomeView mount 3 instance | `HorizontalScrollFilter.tsx:29-45`, `HomeView.tsx:565,613` | P2 |
| 13 | `ThreeModelViewer` + `CadQuickViewModal` static import → **three.js nằm trong first paint** (133.9 KB gzip) | `HomeView.tsx:4-5` | P1 |
| 14 | Ảnh catalog eager toàn bộ (chỉ 1 chỗ trong repo có `loading="lazy"`), không `width/height` → CLS | `HomeView.tsx:693-697` | P1 |
| 15 | Ảnh hero/section thiếu `alt` có nghĩa (một số dùng alt chung) | audit a11y | P2 |

### 1.3 Kế hoạch tối ưu

**Bố cục mới (từ trên xuống):**
1. **Announcement bar** (từ `site_content`, có toggle) → **Header**.
2. **Hero 2 cột**: trái = value proposition (1 câu, đọc được trong 10 giây) + 2 nút (Nhận giá tức thì / Xem kho bản vẽ) + 3 trust chip; phải = **Instant Quote Widget** (không phải ảnh 3D trang trí).
3. **Instant Quote Widget** (xem §1.4) — điểm tương tác đầu tiên, nằm trong màn hình đầu.
4. **Bảng giá tham khảo** (thay simulator): 3-4 dòng "PLA từ X đ/g, PETG từ Y đ/g…" lấy từ bảng giá công khai trong `pricing_configs`, có link tới công cụ báo giá. Không tự tính bằng công thức rút gọn.
5. **Vật liệu nổi bật** (`MaterialComparisonMatrix`) — dữ liệu từ Supabase `materials`, không hardcode.
6. **Sản phẩm nổi bật**: rail 8 item (không phải catalog đầy đủ) + nút "Xem toàn bộ kho" → `/explore`.
7. **Quy trình 3 bước** + **cam kết chất lượng** (dung sai ISO 2768, in lại nếu lỗi, NDA bảo mật) — copy có kiểm chứng.
8. **CTA cuối** → `/quote`, **Footer**.
→ Section catalog inline (`:457-943`) **bị xoá**, dùng chung component `ProductCard`/`CatalogGrid` với `/explore`.

**Instant Quote Widget (theo anatomy đã research):**
- Toggle quy trình (In 3D / CNC / Laser) ở trên cùng.
- Drop zone là đối tượng chính: viền nét đứt, copy "Kéo thả file vào đây **hoặc** chọn từ máy", danh sách định dạng chấp nhận + dung lượng tối đa **hiện trước khi thả**.
- Sau khi chọn file: hiện tên file, dung lượng, nút xoá; validate ngay (định dạng, dung lượng, số file) và **báo lỗi cụ thể** — không im lặng.
- Trạng thái phân tích: progress bar có %, dung lượng đã xử lý, ETA, nút huỷ (không dùng skeleton cho thao tác upload/compute).
- Kết quả: giá, kích thước bao `W×D×H mm`, thể tích, khối lượng, vật liệu gợi ý, lead time, và 2 nút: "In ngay" (→ checkout với cấu hình đã chọn) / "Chỉnh sửa chi tiết" (→ `/quote`).
- Ghi rõ "giá cuối cùng được kỹ sư xác nhận trong X giờ" nếu có bước review.
- Đường thứ hai cho người không có file: "Chưa có file? Nhận báo giá thủ công" + nút **Zalo** (thói quen thị trường VN).
- Cam kết bảo mật ngay trong widget: "File được mã hoá, NDA, tự động xoá sau 7 ngày".

**Kỹ thuật:** lazy `ThreeModelViewer` + `CadQuickViewModal` (chỉ tải khi vào viewport); ảnh `loading="lazy" decoding="async"` + `width/height` + `srcset`; token hoá toàn bộ; `scroll-mt` tính theo chiều cao header thật (dùng biến CSS `--header-h`); sửa `HorizontalScrollFilter` để không phụ thuộc `[children]`; i18n theo key.

**Kết quả mong đợi:** 1 CTA duy nhất dẫn `/quote` (ngoài nav); drop zone nằm trong màn hình đầu ở 390px; three.js không còn trong first paint; 0 hex cứng trong file; LCP không tệ hơn baseline; không còn catalog trùng.

---

## 2. `/explore` — ExploreView (`src/frontend/views/ExploreView.tsx`, 1.046 LOC)

### 2.1 Tính năng hiện có
1. 12 chiều lọc: category, engineering tag, material, price preset, price slider (`priceMax`), customizable, watertight, search, sort, admin view, load-more.
2. 3 chế độ xem (grid / tech-table / `compact` khai báo nhưng không có toggle).
3. Sort: price-asc, price-desc, rating, popular.
4. Bookmark sản phẩm (state cục bộ).
5. "Tải thêm" 12 item một lần.
6. Mở `CadQuickViewModal` (mount ở `:1034`).
7. Chip filter cuộn ngang (`HorizontalScrollFilter` ở `:313`).
8. Empty state khi không có kết quả (`:727-746`).

### 2.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Filter "Watertight" là no-op**: thân `if` rỗng, không `return false`; vẫn tính vào `hasActiveFilters` | `ExploreView.tsx:203-206`, `:231` | P0 (lừa người dùng) |
| 2 | **Danh sách vật liệu để lọc hardcode 6 chuỗi**, không lấy từ Supabase `materials` → lọc theo vật liệu có thể không khớp dữ liệu thật | `ExploreView.tsx:218` | P0 |
| 3 | Trạng thái lọc không nằm trên URL → không share/back được, F5 mất hết | `:115-231` | P1 |
| 4 | `priceMax` mặc định 600.000đ cứng; preset `above500` lọc `pricePhysical < 500000` (đơn vị VND nhưng tên preset là "500") | `:195-197` | P1 |
| 5 | `sortBy` nhánh mặc định `return 0` → thứ tự "featured" thực chất là thứ tự mảng | `:209-217` | P2 |
| 6 | Bookmark: seed sẵn `['prod-arduino-case']` giả, không persist, và gọi `onShowToast` **bên trong** state updater (double-fire dưới StrictMode) | `:49`, `:71-81` | P2 |
| 7 | `viewMode` type có `'compact'` nhưng không có toggle → nhánh chết | `:51` | P3 |
| 8 | "Tải thêm" không có tổng số/`hasMore` rõ ràng, không có skeleton khi đang tải | `:931` | P2 |
| 9 | Không có loading/error khi catalog remote chưa về (products khởi tạo từ mock/localStorage rồi thay bằng Supabase) | `App.tsx:231-325` | P1 |
| 10 | Bảng tech-table tự viết, khác với bảng của HomeView; cả hai bypass `.responsive-table-wrapper` (600px min-width) | `:951`, `HomeView.tsx:851`, `index.css:176-192` | P2 |
| 11 | Ảnh eager (1 chỗ có lazy) | `:781` | P1 |
| 12 | 204 hex + 247 utility tuỳ ý | đo | P2 |

### 2.3 Kế hoạch tối ưu

1. **URL là nguồn sự thật của bộ lọc:** `?q=&cat=&tag=&material=&min=&max=&sort=&page=`; dùng `useSearchParams`; mọi thay đổi filter ghi vào URL (thay thế, không push) → share/back/F5 hoạt động; có nút "Xoá bộ lọc".
2. **Watertight:** implement đúng (dựa trên field thật từ DB, ví dụ `is_watertight` hoặc `features`) hoặc **xoá** checkbox + badge. Không để control không có tác dụng.
3. **Vật liệu lấy từ `materials`** (Supabase) — cùng nguồn với bộ lọc trong `/quote`.
4. **Phân trang thật** (`range()` của Supabase) + skeleton 12 card; hiện "1–24 / 168".
5. **Lọc/sắp xếp phía server** cho search text (dùng index full-text đã có trong migration `products`) để không kéo cả catalog về client.
6. **Bookmark persist** vào store + `localStorage`, bỏ seed giả, đưa `onShowToast` ra khỏi updater.
7. **`ProductCard` dùng chung** cho Home rail, Explore grid/table, related products.
8. Mobile: filter vào **bottom sheet** (thay vì panel đẩy layout), sticky bar hiện số kết quả + nút "Bộ lọc (3)".
9. Ảnh: lazy + `width/height` + `srcset`; ô ảnh có tỉ lệ cố định để không CLS.
10. Empty state phân biệt 2 trường hợp: "chưa có sản phẩm nào" và "không có kết quả cho bộ lọc này" (kèm gợi ý xoá filter).

**Kết quả mong đợi:** mọi control lọc đều có tác dụng thật; URL chia sẻ được; filter vật liệu khớp DB; có loading/empty/error; 390px dùng filter qua sheet.

---

## 3. `/products/:productId` — ProductDetailView (`src/frontend/views/ProductDetailView.tsx`, 815 LOC)

### 3.1 Tính năng hiện có
1. **Hai đường mua độc lập trên một màn:** (a) license file CAD số với `priceDigital` (`:533-557`); (b) cấu hình in vật lý (vật liệu, màu, layer height, khắc laser, số lượng có bậc giảm giá) (`:560-711`).
2. Gallery 4 ảnh + thumbnail (`:306-318`).
3. 4 tab spec: overview / specs / reviews / slicing.
4. Thẻ `batchProgress` (in ghép chung lô).
5. Sản phẩm liên quan (`:770`).
6. Sticky bar mobile 2 nút CAD / Đặt In 3D (`:785-812`).
7. Viewer 3D (`ThreeModelViewer` ở `:277`) + nút wireframe/save/share (`:183`, `:199`).
8. `SEOHead` với JSON-LD (`:125-142`).

### 3.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **5 cách mua trên 1 trang** gây tê liệt lựa chọn | `:555`, `:700`, `:709`, `:797`, `:806` | P1 |
| 2 | **Spinner vô hạn** khi không tìm thấy sản phẩm và `products.length === 0` — không timeout, không lỗi, không retry | `App.tsx:119-128` | P0 (dead-end) |
| 3 | Giá tính trong view bằng hằng số hardcode | `:56` (`?? 50000`), `PersonalizeView.tsx:79-80,551,570,748` | P0 (giá không khớp engine) |
| 4 | Bậc giảm giá số lượng khai báo lại lần thứ ba (22/15/8) khác engine và khác widget đã xoá | `PersonalizeView.tsx:85` | P0 |
| 5 | Đánh giá/reviews là dữ liệu mẫu nhưng trình bày như thật | tab reviews | P0 (theo quyết định "trung thực" → phải ghi nhãn mẫu hoặc bỏ) |
| 6 | Sản phẩm liên quan lấy từ `mockData` thay vì truy vấn theo category/tag | import `PRODUCTS` | P1 |
| 7 | Sticky bar mobile `lg:hidden fixed bottom-0` phủ nội dung cuối trang; xung đột với FAB hỗ trợ (`z-40` cùng cấp) | `:785` vs `App.tsx:1131` | P1 |
| 8 | Nút icon chỉ có `title`, không `aria-label`; alt thumbnail là `Thumb ${idx}` | `:183`, `:199`, `:316` | P2 |
| 9 | `ThreeModelViewer` static import (three.js vào first paint) + ảnh gallery eager | `:4`, `:306-318` | P1 |
| 10 | Không hiện lead time/khả năng đáp ứng/tồn kho trên trang (chỉ trong `/quote`) | — | P2 |
| 11 | `SEOHead` ghi `document.head` mỗi render, JSON-LD object literal tạo mới mỗi render | `SEOHead.tsx:20-68` | P2 |

### 3.3 Kế hoạch tối ưu

1. **Hai CTA duy nhất, rõ thứ bậc:** primary "Đặt in 3D" (mở configurator), secondary "Mua file CAD" (license). Bỏ "Tùy biến 3D & khắc laser riêng" như CTA thứ ba — gộp vào configurator (khắc laser là một tuỳ chọn bên trong). Sticky bar mobile **chỉ mirror** 2 nút này.
2. **Configurator dùng chung** với `/quote` (`MaterialPicker`, `QuantityTiers`, `EngravingOptions` là component dùng lại, không viết lại).
3. **Giá chỉ đến từ `pricingEngine`.** Xoá mọi phép tính giá trong view; phí khắc laser/logo lấy từ `pricing_configs`.
4. **Bậc giảm giá lấy từ `pricing_configs.volume_discount_tiers`** — 1 nguồn cho cả product page, `/quote`, cart.
5. **Trạng thái không tìm thấy:** "Không tìm thấy sản phẩm này" + nút về `/explore` + ô search; timeout cho fetch catalog + retry.
6. **Reviews:** nếu chưa có hệ thống review thật → bỏ tab hoặc hiển thị "Chưa có đánh giá" (không hiện review mẫu).
7. **Sản phẩm liên quan:** truy vấn theo `category`/`tags` từ Supabase, tối đa 4.
8. **Lead time & khả năng đáp ứng** hiện trên trang (từ `printer_fleet`/queue), thay vì chỉ trong tool.
9. **Kỹ thuật:** lazy viewer; ảnh lazy + sized; `aria-label` cho nút icon; alt theo tên sản phẩm + chỉ số; `SEOHead` chỉ chạy khi dữ liệu đổi (memo theo `product.id`).

**Kết quả mong đợi:** 2 CTA; không spinner vô hạn; giá khớp engine và khớp cart/quote; không có review giả; sticky bar không phủ nội dung.

---

## 4. `/personalize` + `/personalize/:productId` — PersonalizeView (837 LOC)

### 4.1 Tính năng hiện có
1. Khắc chữ: nội dung, font, độ sâu, vị trí.
2. Upload logo (dùng cho khắc/khắc nổi).
3. Slider "lid explode" (tách nắp) để xem chi tiết bên trong.
4. Tile dung sai (tolerance) hiển thị.
5. Viewer riêng `PersonalizeModelViewer3D` (791 LOC, implementation thứ ba của viewer).
6. Price summary + sticky bar mobile (`:810`).

### 4.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Viewer thứ ba** với logic trùng: `disposeHierarchy` copy nguyên (`PersonalizeModelViewer3D.tsx:25`), preset camera riêng (`:244`), builder geometry riêng (`:354`) | `ModelViewer3D.tsx:38` vs `PersonalizeModelViewer3D.tsx:25` | P2 |
| 2 | Không có touch orbit (chỉ mouse) ở 2 viewer phụ, nhưng lại đặt `touch-action: 'none'` → canvas "nuốt" thao tác cuộn trang trên mobile | `PersonalizeModelViewer3D.tsx:606-610`, `ThreeModelViewer.tsx:272-276` | P1 |
| 3 | Preset góc nhìn `hidden sm:flex` → mất trên mobile | `UnifiedCadToolbar.tsx:40` | P2 |
| 4 | Phí khắc/logo hardcode nhiều nơi | `:79`, `:80`, `:551`, `:570`, `:748` | P0 |
| 5 | Bậc giảm giá khai báo riêng (22/15/8) | `:85` | P0 |
| 6 | Canvas cao `h-[480px] sm:h-[560px] lg:h-[620px]` cộng sticky bar trên điện thoại thấp → gần hết viewport | `:256` | P1 |
| 7 | 133 hex cứng | đo | P2 |
| 8 | State cấu hình không persist (đổi route/refresh mất hết) | — | P1 |

### 4.3 Kế hoạch tối ưu

1. **Một viewer duy nhất** (`ModelViewer3D`) + các "profile" cấu hình (tool quote / preview sản phẩm / personalize). Xoá `PersonalizeModelViewer3D` và `ThreeModelViewer` sau khi hợp nhất (hoặc biến thành wrapper mỏng gọi viewer chung chỉ với `autoRotate` + `frameloop:'demand'`). Lợi ích: 1 chỗ sửa disposal, 1 chỗ sửa touch, 1 chỗ sửa theme màu canvas.
2. **Touch thật** cho viewer: 1 ngón = xoay, 2 ngón = pan, pinch = zoom; `touch-action: pan-y pinch-zoom` (không bao giờ `none`) + `overscroll-behavior: contain` để không phá cuộn trang.
3. **Chiều cao canvas theo viewport:** `min(52vh, 420px)` trên mobile thay vì 480px cứng; sticky bar dùng `env(safe-area-inset-bottom)`.
4. **Phí & bậc giảm từ config**; xoá toàn bộ số hardcode trong view.
5. **Persist cấu hình** (draft) vào store + `localStorage`; nút "Lưu cấu hình" và "Tải lại cấu hình đã lưu" (cũng là yêu cầu WCAG 3.3.7 — không bắt nhập lại).
6. Preset góc nhìn hiện trên mọi breakpoint (segmented control thu gọn trên mobile).
7. Token hoá + i18n.

**Kết quả mong đợi:** chỉ còn 1 implementation viewer trong repo; mobile xoay/zoom được bằng tay; giá personalize khớp engine; cấu hình không mất khi refresh.

---

## 5. Bảng ưu tiên nhóm trang công khai

| Ưu tiên | Việc | Trang | Effort |
|---|---|---|---|
| P0 | Sửa filter Watertight (implement hoặc xoá) | `/explore` | S |
| P0 | Vật liệu lọc lấy từ Supabase thay hardcode | `/explore` | S |
| P0 | Xoá mọi phép tính giá trong view; dùng `pricingEngine` + config | `/products`, `/personalize` | M |
| P0 | Bỏ/hãn nhãn dữ liệu reviews mẫu | `/products` | S |
| P0 | Xử lý trạng thái "không tìm thấy sản phẩm" (hết spinner vô hạn) | `/products` | S |
| P1 | Hero = Instant Quote Widget; bỏ catalog inline; 1 CTA | `/` | L |
| P1 | Filter state lên URL + phân trang + loading/error | `/explore` | M |
| P1 | 2 CTA + sticky bar không phủ nội dung | `/products` | S |
| P1 | Lazy three.js; ảnh lazy + sized toàn nhóm | cả nhóm | M |
| P1 | Touch orbit + `touch-action` đúng cho viewer | `/personalize`, preview | M |
| P1 | Draft persistence cho cấu hình | `/personalize` | M |
| P2 | Hợp nhất 3 viewer thành 1 | cả nhóm | L |
| P2 | `ProductCard` + `CatalogGrid` dùng chung | `/`, `/explore` | M |
| P2 | Sửa `HorizontalScrollFilter` re-attach | `/`, `/explore` | S |
| P2 | Bảng spec vật liệu từ DB, sửa so khớp category | `/`, matrix | M |
| P3 | Xoá state chết (`pricingMode`, `viewMode: compact`), `INITIAL_CART_ITEMS` | `/`, `/explore` | S |
