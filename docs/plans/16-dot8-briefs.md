# Đợt 8 — Hiện đại hoá UI/UX (admin theme + landing + catalog) + hoàn tất O2

Luật môi trường/gate/quoting: `docs/plans/agent-brief.md` (**đọc §2.1, §4.1, §4.2, §4.3**). Bằng chứng hiện trạng: `docs/plans/15-ui-audit.md`. File này nói **việc cụ thể**.

## 0. Quyết định chủ dự án ở cổng duyệt (đã chốt, không tự đổi)

1. **Theme admin: GIỮ dark-first + đánh bóng cấu trúc.** Không đổi sang theme sáng. Vấn đề của admin là **cấu trúc** (2 tầng chrome, badge jargon, cắt chữ, tiêu đề trùng, panel rỗng to), không phải màu.
2. **Catalog: seed sản phẩm mẫu có nhãn MẪU** — NHƯNG xem §0.1 bên dưới, cách này đã được thay bằng phương pháp an toàn hơn.
3. **Ngôn ngữ admin: giữ nguyên** theo nút `VIE | ENG`. Không hardcode ngôn ngữ.

### 0.1 Thay đổi phương pháp so với câu trả lời #2 (coordinator quyết, nói rõ lý do)
Chủ dự án chọn "seed sản phẩm mẫu". Coordinator **không ghi dữ liệu mẫu vào DB production** nữa, vì:
- Agent N1 đã từng ghi giá trị test lên `app_settings` production và coordinator phải dọn tay + ghi 4 dòng audit (xem `wave-plan.md`).
- Có cách chứng minh **tốt hơn và không chạm DB**: `page.route()` trả fixture sản phẩm (đúng phương pháp agent N2/V1 đã dùng và đã được kiểm chứng).
⇒ **Mọi agent Đợt 8 dùng `page.route()` trả fixture, KHÔNG seed DB.** Nếu chủ dự án sau này muốn xem bằng mắt với dữ liệu thật, coordinator sẽ xin phép riêng.

## 0.2 Số đo nền (gate coordinator 2026-09-12 21:50)

`lint` **RC=0** · `build` **RC=0** · `contrast` **RC=0** · `lint-rls-sources` **RC=0** · `lint-rls-migration` **RC=0** · palette thô **0** · white/black **0** · hex trong class **0** · chữ <12px **0** · emoji cờ **0** · `font-serif` **0** · jargon `GROUP n` **0** · `role_select` **0** · CSS build **107.037 B** · `index.js` **739,9 kB** · `src` LOC **51.489**.

**Gate của coordinator đã có lỗ hổng và nay đã sửa:** grep cũ dùng `WATERTIGHT` **viết hoa** nên bỏ sót `Watertight`. Grep **không phân biệt hoa/thường** cho ra **54 dòng khớp**. Trong đó phải **phân biệt**:
- **TÊN TRƯỜNG CODE** (`isWatertight: boolean` trong `src/utils/meshParser.ts`, `src/types/index.ts`, `src/views/Tool3DView.tsx:133`) = **hợp lệ**, không phải lời tuyên bố ⇒ **KHÔNG sửa**.
- **CHUỖI HIỂN THỊ CHO NGƯỜI DÙNG** (`'100% Watertight'`, `'Đạt chuẩn Watertight 100%'`) = **tuyên bố bịa** ⇒ **phải sửa**.

---

## O2b — hoàn tất phần O2 bị dừng (agent O2 bị stop giữa chừng)

**File được giao:** `src/frontend/components/admin/PricingConfigPanel.tsx` · `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`.

**Trạng thái đã xác minh (coordinator đo, không phải suy đoán):** `lint` **RC=0** · `grep -cnE '\|\|\s*[0-9]+|\?\?\s*[0-9]+'` trên 2 file = **0** · UI `pricing_global_settings` **đã có** (`savePricingGlobalSettings`, `globalForm.{vatPercent,electricityRateVnd,laborHourlyRateVnd}`, validate tại `:328-353`, input tại `:781`). O2 **làm xong phần chính rồi mới bị dừng**, chỉ thiếu **gate cuối + Playwright + báo cáo**.

**Việc:**
1. **Đọc lại toàn bộ** 2 file để tìm chỗ O2 làm dở dang (nhánh render chưa nối, state khai mà không dùng, import thừa, copy chưa dịch, TODO).
2. **Chạy gate đầy đủ** và dán output thật: `npm run lint` · `npx vite build --outDir /tmp/vc-verify-o2b --emptyOutDir` (xoá sau) · `node scripts/check-contrast.mjs`.
3. **Playwright RED→GREEN (bắt buộc, đây là phần O2 chưa làm):**
   - **RED** phải chứng minh **số bịa bị ghi vào DB** khi ô trống. Dùng **bản build tĩnh + `page.route()` chặn và ghi lại payload** (không cần chạm Supabase). Nếu muốn đo trên DB thật thì **chỉ ĐỌC** `pricing_configs` để đối chiếu.
   - **GREEN**: ô trống ⇒ **bị chặn + 0 request ghi**; nhập giá trị ⇒ ghi đúng; F5 ⇒ giá trị còn.
   - **Cấm ghi giá trị bịa lên DB production** (xem `agent-brief.md` §4.3). Nếu buộc phải ghi: liệt kê **nguyên văn bảng → cột → giá trị** trong báo cáo.
   - Chạy Playwright trên **bản build tĩnh + `vite preview` cổng riêng** để tránh flake HMR (§4.2). Nhớ tắt server + xoá outDir.
4. Kiểm **khối `pricing_global_settings` mới** đúng nghiệp vụ: `vat_percent` rỗng = **chưa cấu hình** (KHÔNG mặc định 8%); có CHECK 0–20; lỗi hiện cạnh ô nhập; mọi ô có `<label htmlFor>` khớp `id`.
5. **Báo cáo** `grep -nE '\|\|\s*[0-9]+|\?\?\s*[0-9]+'` trên 2 file: liệt kê **từng dòng còn lại kèm lý do có nguồn** (hoặc xác nhận 0).

⚠️ **`src/frontend/lib/vat.ts` có `VAT_RATE = 0.08` cứng — KHÔNG thuộc phạm vi O2b**, chỉ báo lại.
⚠️ **KHÔNG đổi công thức pricing.** `src/utils/pricingEngine.ts` là file **không ai được sửa** trong đợt này (trừ P4 được sửa **đúng 1 chuỗi mô tả**, ghi ở mục P4).

---

## P1 — Shell: sửa tràn ngang mobile + tách chrome admin + nhãn treo

**File được giao:** `src/App.tsx` · `src/frontend/components/Header.tsx` · `src/frontend/views/HomeView.tsx`.

**🔴 Lỗi nặng nhất toàn dự án (đo được, `15-ui-audit.md` §1):**

| Route @390px | `scrollWidth` | `clientWidth` | Dư |
|---|---:|---:|---:|
| `/` | 608 | 390 | **+218px** |
| `/explore` | 608 | 390 | **+218px** |

Ảnh `pwtest/ui-audit/b1-landing-390.png`: header **không thu gọn**, nút **"Đăng ký" bị cắt cụt** ở mép phải. Lỗi này tồn tại qua nhiều đợt (A19 ghi +178px, nay 218px).

**Việc:**
1. **Thu gọn header ở mobile**: dưới breakpoint hợp lý (ví dụ `< lg`) đưa nav + ô tìm kiếm + VIE|ENG + nút đăng nhập/đăng ký vào **menu hamburger + drawer**, để `scrollWidth === clientWidth` ở **390px** trên **mọi route**. Đây là **tiêu chí nghiệm thu cứng**, đo bằng Playwright trên **toàn bộ route**: `/`, `/explore`, `/cart`, `/orders`, `/quote`, `/auth/login`, `/admin`.
2. **Sửa ô tìm kiếm bị cắt ở 1440px** (ảnh `a1-landing.png`: placeholder `Tìm linh kiện, tag (vd: 2/9, IoT, Gear)...` cụt mép phải).
3. **Tách chrome admin** (ảnh `c1-admin-overview.png`): hiện thanh điều hướng **storefront** (`Kho Mẫu CAD · Báo Giá In 3D · Đơn Hàng · Studio Thiết Kế [CREATOR] · Quản Trị Admin [FORGE] · ô tìm kiếm`) nằm **TRÊN** khung admin ⇒ **2 tầng chrome**, tốn ~72px. Trên route `/admin*`, **không render thanh storefront**; admin có thanh riêng (đã có sẵn breadcrumb + avatar + nút "Xem Cửa Hàng" trong `AdminDashboardView`). Bỏ luôn chip role jargon `CREATOR`/`FORGE` khỏi nav storefront.
4. **Hai "nhãn treo"** do agent O3 bỏ hotline bịa (O3 đã báo, không tự sửa vì ngoài phạm vi):
   - `src/App.tsx:1362` → `Hotline: • contact@vcube.vn`
   - `src/frontend/views/HomeView.tsx` (~`:1256`) → `Hotline: • Email: contact@vcube.vn`
   Sửa: **lọc bỏ giá trị rỗng** và **ẩn cả khối** khi không còn gì để in. Dùng đúng mẫu:
   ```tsx
   {[siteContent.hotline, siteContent.contactEmail].filter(Boolean).join(' • ')}
   ```
   và bọc `<p>` trong điều kiện có ít nhất một giá trị. **Đừng in `—` vào câu "Hotline: —".**
5. **Landing `/` (ảnh `a1-landing.png`)**: dải **3 thẻ `Chưa cấu hình`** (`Dung Sai Đo Kiểm / Thời Gian Bàn Giao / Tiêu Chuẩn Sản Xuất`) là **một hàng chết** chiếm ngang; và dải `DUNG SAI CAM KẾT · Chưa cấu hình · Nhập ở /admin` nằm lạc lõng. **Giữ tính năng** nhưng xử lý gọn: khi cả 3 rỗng ⇒ **gộp thành một dòng mảnh** hoặc ẩn hàng, không để 3 thẻ trống to; khi có dữ liệu ⇒ hiện đủ 3. Đồng thời **giảm khoảng trắng chết cuối hero** (~110px) và làm nhịp dọc chặt hơn.
6. Có một **đường kẻ teal mảnh chạy hết chiều ngang** ngay dưới header (cả `/` và `/admin`) — tìm nguồn (có thể là thanh tiến trình luôn hiện) và sửa cho đúng ý đồ; nếu là phần tử vô nghĩa thì bỏ.

**Gate:** lint · build outDir riêng · contrast.
**Nghiệm thu cứng (Playwright, bản build tĩnh + preview cổng riêng, retry ≤3):**
- `scrollWidth === clientWidth` (±1px) ở **390px** trên **7 route** liệt kê ở mục 1.
- Trên `/admin`: **không còn** chuỗi `Kho Mẫu CAD`/`Báo Giá In 3D`/`CREATOR`/`FORGE` trong DOM.
- `/` : **0** nhãn treo (`Hotline: •`, `Email: •`, `Hotline: —`).
- 0 `pageerror`; theme sáng ở `/` và tối ở `/admin` không đổi.
- Ảnh trước/sau ở 390px và 1440px ⇒ `pwtest/p1/`.

---

## P2 — Admin: dọn sidebar + sửa tiêu đề trùng + panel rỗng

**File được giao:** `src/frontend/components/admin/AdminSidebar.tsx` · `src/frontend/views/AdminDashboardView.tsx` · `src/frontend/components/admin/groups/**` (chỉ các file nêu tên bên dưới).

**KHÔNG đụng `src/App.tsx`** (P1 sở hữu) và **không** `AdminStorefrontPanel.tsx`/`AdminSeoPanel.tsx`/`PricingConfigPanel.tsx`/`AdminProductsPanel.tsx`/`AccessoriesManager.tsx`.

**Bằng chứng (ảnh `c1-admin-overview.png`, `15-ui-audit.md` §2):**
1. **Badge jargon** — cùng loại `GROUP n` đã dọn ở breadcrumb nhưng còn ở dạng badge: `KPIs` · `Bản Quyền` · `B2B/B2C` · `v3.4 Inkiri` · `BOM` · `MES` · `SERP` · `CREATOR` · `FORGE`. ⇒ **Xoá badge jargon**; giữ nhãn nghiệp vụ thuần.
2. **Badge số `0`** trên `Danh Mục Nhựa & Resin`, `Phụ Kiện, Ốc Cấy & Nam Châm`, `Sản Phẩm & Catalog 3D` ⇒ **ẩn khi rỗng/0** (nhất quán với badge "Đội Máy In 3D" mà O1 vừa sửa: rỗng ⇒ ẩn).
3. **Nhãn bị cắt chữ**: `Khách Hàng & Hồ Sơ K…`, `Công Thức Giá In…`, `Nhà Thiết Kế & Bản …` ⇒ sau khi bỏ badge jargon phải **hết cắt chữ**; nếu vẫn cắt thì cho nhãn xuống 2 dòng hoặc nới bề rộng sidebar.
4. **Tiêu đề trùng**: `Bảng Điều Khiển Trung Tâm` (vùng header) **và** `Tổng Quan Điều Hành Hệ Sinh Thái VCUBE` (tiêu đề panel) ⇒ **một H1 duy nhất** cho mỗi trang; panel dùng heading cấp thấp hơn.
5. **Panel rỗng chiếm ~400px** + **icon trung tâm rất mờ** (nợ từ Đợt 5) ⇒ thu gọn empty state (chiều cao vừa phải), sửa tương phản icon, giữ CTA "Mở cấu hình giá".
6. **Panel thiếu `EmptyState`** (O1 báo, file ngoài phạm vi O1 nên chưa sửa) — nay thuộc P2:
   `groups/Group1WorkshopsPanel.tsx:476` (`filteredWorkshops.map`), `:665` (`filteredMachines.map`) · `groups/Group2DesignersPanel.tsx:280` (`filteredDesigners.map`) · `groups/Group3CustomersPanel.tsx:435` (`filteredCustomers.map`), `:706` (`filteredRfqs.map`).
   ⇒ Dùng primitive `src/frontend/ui/EmptyState` cho **mọi danh sách rỗng**, kèm CTA phù hợp. Tham chiếu cách `Group5ProductionPanel.tsx:361` và `Group0OverviewPanel` đã làm.
   Sửa luôn nit copy: "Không có đơn **nấc** này" → "Không có đơn **ở nấc** này".
7. **Widget chat `TRỢ LÝ TỰ ĐỘNG` đè nội dung** góc dưới–phải trên `/admin` — nếu vị trí được điều khiển trong file thuộc P2 thì sửa; nếu ở file khác thì **báo lại** kèm `file:line`.

**Gate:** lint · build outDir riêng · contrast.
**Playwright (bản build tĩnh, retry ≤3):** `/admin` + **cả 17 mục sidebar** ⇒ **0** chuỗi jargon badge (`KPIs`, `Bản Quyền`, `B2B/B2C`, `v3.4 Inkiri`, `BOM`, `MES`, `SERP`), **0** nhãn bị cắt (`scrollWidth > clientWidth` trên phần tử nhãn), **1** `<h1>`/trang, mỗi danh sách rỗng có `EmptyState`, `html.dark=true`, 0 pageerror. Ảnh `pwtest/p2/`.

---

## P3 — Catalog `/explore`: hết tuyên bố bịa + UX lọc + empty state

**File được giao:** `src/frontend/views/ExploreView.tsx` (**chỉ file này**).

**Bằng chứng (ảnh `a2-catalog.png`, `15-ui-audit.md` §4):**

| Chuỗi đang hiện | Vấn đề | Hướng |
|---|---|---|
| `Hơn 0 bản vẽ… đạt chuẩn Watertight 100%` (`:267`) | Vô nghĩa + **tuyên bố bịa** | Viết lại: đếm thật, **bỏ** tuyên bố kiểm định/watertight |
| `Đạt chuẩn Watertight 100%` (`:636`) | Tuyên bố bịa | Đổi nhãn bộ lọc theo **dữ liệu thật**, hoặc bỏ bộ lọc nếu không có nguồn |
| `✓ Watertight` (`:827`) | Tuyên bố bịa | Bỏ, hoặc chỉ hiện khi **trường dữ liệu thật** của sản phẩm xác nhận |
| `(142) (88) (64) (119) (53) (37)` theo danh mục | **Số bịa** từ fixture `cat.count` (nợ #39); DB `products = 0` | Tính **từ `products` thật**; danh mục 0 ⇒ **ẩn hoặc hiện `(0)`**, không bịa |
| `PLA Tough / PETG / ABS / Resin 8K / TPU / Nylon PA12` | Bộ lọc vật liệu **không tồn tại** (DB `materials = 0`) | Lấy từ **`materials` thật**; rỗng ⇒ ẩn cả nhóm lọc |
| `Tối đa: 600.000 đ` | Ngưỡng cứng | Suy **từ dữ liệu thật**; không có dữ liệu ⇒ ẩn thanh giá |
| `SUPABASE CATALOG SYNC` + "đồng bộ trực tiếp từ cơ sở dữ liệu Supabase" | Lộ chi tiết kỹ thuật cho khách | **Bỏ khối này** |
| nhánh `is29` + `'Xem Sản Phẩm Tag 2/9'` (`:154,316,772,841`) | Chiến dịch **không tồn tại** (O3 đã xoá tag khỏi `POPULAR_TAGS`, còn code chết) | **Xoá toàn bộ code chết `2/9`** |

**UX cần làm:**
1. **Lưới thẻ sản phẩm**: thiết kế thẻ hiện đại (ảnh/khung tỉ lệ cố định, tiêu đề 2 dòng, giá, vật liệu, hover state rõ) + **skeleton** khi đang tải. **Không thể nghiệm thu bằng mắt vì DB có 0 sản phẩm** ⇒ **BẮT BUỘC dùng `page.route()` trả fixture sản phẩm** (không seed DB) để chụp lưới thật trong Playwright.
2. **Empty state hữu ích**: hiện chỉ có "Không tìm thấy bản vẽ phù hợp với tiêu chí lọc" + nút xoá lọc. Thêm đường thoát cho khách mới: CTA **"Báo giá file 3D của bạn"** (`/quote`) vì đó là việc thật làm được khi kho rỗng.
3. **Mobile**: cột lọc hiện chiếm chỗ ⇒ dưới breakpoint phải thành **nút "Bộ lọc" mở drawer/bottom-sheet**; đảm bảo **không tràn ngang** ở 390px (P1 sửa header, P3 lo phần thân trang: chip tag, cột lọc, lưới).
4. **Đếm kết quả** ("Hiển thị X / Y") phải khớp số thẻ thật render.

**Gate:** lint · build outDir riêng · contrast.
**Playwright (bản build tĩnh + preview cổng riêng, retry ≤3):**
- **RED** trên bản hiện tại: `/explore` hiện `Hơn 0`, `Watertight 100%`, và các số `(142)(88)(64)…` ⇒ đếm được.
- **GREEN**: **0** chuỗi `Watertight`/`100%`/`Hơn 0`/`Kiểm định ứng suất`/`ISO` trong DOM; **0** số danh mục khi DB rỗng; `scrollWidth === clientWidth` ở 390px; có ít nhất 1 CTA về `/quote`; 0 pageerror.
- **Với fixture `page.route()`**: chụp lưới ≥6 thẻ + skeleton ⇒ `pwtest/p3/grid-fixture.png`; đếm "Hiển thị 6 / 6" khớp 6 thẻ.
- Báo cáo **trước → sau** ảnh `pwtest/p3/`.

---

## P4 — Dọn nốt tuyên bố bịa mà gate cũ bỏ sót

**File được giao:** `src/frontend/views/Tool3DView.tsx` · `src/frontend/components/tool3d/ValidationReportPanel.tsx` · `src/frontend/components/CadQuickViewModal.tsx` · `src/frontend/components/admin/AdminProductsPanel.tsx` · `src/backend/services/workshopService.ts` · `src/utils/pricingEngine.ts` (**CHỈ 1 chuỗi**, xem mục 5) · `src/data/mockData.ts` (chuỗi `watertight` ở `:205`).

| File:line | Chuỗi bịa | Hướng sửa |
|---|---|---|
| `Tool3DView.tsx:140` | `printabilityScore: parsed.isWatertight ? 94 : 76` | **Điểm số bịa** ⇒ hoặc bỏ trường, hoặc tính từ dữ liệu đo thật; **không** bịa 94/76 |
| `Tool3DView.tsx:490` | `'Đã hoàn tất tự động sửa lỗi lưới Mesh. Mô hình đạt chuẩn Watertight'` | Bỏ tuyên bố "đạt chuẩn"; chỉ nói thao tác đã chạy |
| `Tool3DView.tsx:616` | `'…kiểm định khép kín Watertight & t…'` | Viết lại trung tính |
| `Tool3DView.tsx:985` | `'100% Watertight'` | `isWatertight` là **dữ liệu đo thật** ⇒ **được phép** hiện trạng thái, nhưng **bỏ chữ "100%"** (đổi thành "Kín (watertight)" / "Không kín") |
| `ValidationReportPanel.tsx:229` | `'100% Watertight'` | như trên |
| `CadQuickViewModal.tsx:299` | `100% Watertight` | như trên |
| `AdminProductsPanel.tsx:50` | `features: ['Kiểm định ứng suất Finite Element Analysis (FEA)', …]` | **Tính năng bịa được ghi vào DB** ⇒ xoá khỏi mảng mặc định, để admin tự nhập |
| `workshopService.ts:72` | `contactPhone: '0988.123.456'` | **Hotline bịa trong backend** ⇒ để rỗng/`null` (nguồn thật là `app_settings.hotline`) |
| `mockData.ts:205` | `'…kiểm tra cấu trúc watertight…'` | Viết lại trung tính (giữ mô tả, bỏ tuyên bố chuẩn) |
| `pricingEngine.ts:470` | `'Lựa chọn phổ biến nhất. In độc lập, kiểm định quang học dung sai ±0.05mm.'` | Bỏ mệnh đề `±0.05mm` |

**🔴 `pricingEngine.ts` chỉ được sửa ĐÚNG chuỗi mô tả ở dòng 470. KHÔNG đổi công thức, hệ số, thứ tự tính.** Patch bằng `python3` với `assert count == 1` neo theo **nội dung chuỗi**, không theo số dòng. Ghi rõ trong báo cáo rằng chỉ 1 chuỗi đổi.

**KHÔNG sửa** `src/utils/meshParser.ts` và `src/types/index.ts`: `isWatertight` ở đó là **tên trường TypeScript**, không phải lời tuyên bố.

**Gate:** lint · build outDir riêng · contrast.
**Grep chứng minh (không phân biệt hoa/thường, và phân biệt chuỗi với tên trường):**
`grep -rniE "'[^']*watertight[^']*'|\"[^\"]*watertight[^\"]*\"|100% ?watertight|0\.05 ?mm|0988\.123\.456|FEA|Mitutoyo"` trên các file được giao ⇒ **0 chuỗi hiển thị**; báo cáo riêng số `isWatertight` còn lại (được phép, phải giải thích đó là tên trường).
**Playwright:** `/quote` (dark) — upload 1 STL lập phương thật ⇒ 0 pageerror, **không** hiện `94`/`76`/`100% Watertight`; `/explore` không có chuỗi mới. Ảnh `pwtest/p4/`.

---

## 9. Ranh giới chung Đợt 8

- **Không ai sửa:** `src/index.css` · `src/frontend/ui/**` · `src/backend/services/settingsService.ts` · `src/backend/supabase/mappers.ts` · `src/frontend/hooks/useSettings.ts` · `vite.config.ts` · `tsconfig.json` · `package.json` · `supabase/**` · `src/utils/meshParser.ts`.
- **Công thức pricing bất khả xâm phạm** — chỉ P4 được đổi 1 chuỗi mô tả ở `pricingEngine.ts:470`.
- **Cấm ghi dữ liệu bịa lên DB production** (`agent-brief.md` §4.3). Mọi nghiệm thu dùng `page.route()` fixture.
- Playwright phải có **retry ≤3** và **chạy trên bản build tĩnh + `vite preview` cổng riêng** (§4.2). Tắt server + xoá outDir khi xong. **Không `pkill` tiến trình của agent khác.**
- Không `git commit/push/checkout/stash/restore`. Không thêm dependency. Không in secret.
- Mỗi agent `--outDir /tmp/vc-verify-<tên>` riêng, xoá khi xong.
- Đang chạy song song: **O2b · P1 · P2 · P3 · P4**. Tập file **không giao nhau** (`src/App.tsx` chỉ P1; `ExploreView.tsx` chỉ P3; `Tool3DView.tsx` chỉ P4).
- Lỗi lint/build ở file mình **không** sở hữu = trạng thái tạm của agent khác ⇒ ghi nhận, không sửa, không revert.
