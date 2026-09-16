> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# A1 — Rà soát READ-ONLY: 5 màn storefront/quote/personalize

**Repo:** VCUBE (`/home/thanh/projects/Vcube`, WSL2 Ubuntu-24.04). **Không sửa file nào trong repo.**
**Ngày đo:** phiên hiện tại. **Bundle đo:** `vite build` → `/tmp/vcube-a1/dist` (ngoài repo), `vite preview` cổng **4371**, Chrome headless CDP cổng **9341**.
**Dữ liệu đo:** DB production qua REST (chỉ GET): 12 sản phẩm (11 `published` + P12 `draft`), 8 vật liệu, 7 máy in (`printer_fleet`), `pricing_global_settings` = 2850/65000/VAT 8/phí sàn 8/phí cố định 5000.

---

## 0. Cách tái lập (để coordinator chạy lại)

```bash
# 0.1 build tĩnh ra NGOÀI repo + preview cổng riêng
npx vite build --outDir /tmp/vcube-a1/dist --emptyOutDir
npx vite preview --outDir /tmp/vcube-a1/dist --port 4371 --strictPort --host 0.0.0.0

# 0.2 RC tương phản token + chống bịa
node scripts/check-contrast.mjs          # RC=0 — 72/84 PASS, 12 EXPECTED, 0 unexpected fail
node scripts/check-fabricated.mjs        # RC=0 — "SACH — 0 tuyen bo bia"

# 0.3 đếm (tất cả đều là grep thô, KHÔNG regex tự chế cho chữ có dấu)
grep -c rounded-full <file>
grep -n  rounded-full <file>
grep -c '<Card' <file>; grep -c '<Button' <file>; grep -c '<InfoTip' <file>
grep -n frontend/ui <file>
grep -o '<button' <file> | wc -l
grep -cE 'bg-surface.*rounded-(lg|xl|2xl|md)|rounded-(lg|xl|2xl|md).*bg-surface' <file>   # card tự dựng (heuristic)
grep -cP '[\x{1F000}-\x{1FAFF}]' <file>                                                  # emoji astral
grep -noP '[\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]' <file>                          # dingbat BMP
grep -nE '\?\?[[:space:]]*-?[0-9]|\|\|[[:space:]]*-?[0-9]' <file>                        # fallback số
```

**Giới hạn của phép đo — phải đọc trước khi tin số:**
1. **Dụng cụ v1 đã SAI và đã bị thay.** Bản đo đầu parse màu bằng regex `[\d.]+` nên đọc `oklab(0.99 … / 0.7)` thành RGB → báo **192 + 192 "fail" giả**. Bản v2 chuẩn hoá màu qua `<canvas>.fillStyle` + `getImageData` (hiểu `oklab`/`color()`/alpha) và **composite nền theo từng lớp**. Self-test bắt buộc trước khi tin: `oklab trắng/70 trên #091426` (≈9.3:1) **không** bị báo fail; `#94A3B8 trên #FFF` bị báo fail 2.56; `trắng 55% trên #00687A` bị báo fail 3.07. **Số trong mục 5 là số của bản v2.**
2. Đếm DOM **bao gồm chrome dùng chung** (Header/Topbar/Footer) — mỗi trang góp ~12 `rounded-full` (VIE/ENG, Đăng nhập, Đăng ký…). Vì vậy **bảng (1) dùng số đếm theo FILE nguồn**, còn số DOM chỉ ở mục 5 như dữ liệu đối chiếu.
3. `/quote` bình thường **chỉ render 26–35 text node** (empty state). Muốn thấy UI thật phải upload tệp ⇒ xem mục 3.4/P0.
4. `dist` build ở `/tmp`, profile Chrome ở `/tmp` — **không file nào trong repo bị tạo/sửa**.

---

## 1. Token / primitive (đếm theo FILE nguồn)

### 1a. `rounded-full` — tách 2 loại

| File | dòng | `rounded-full` (tổng) | **Nút/CTA/pill điều khiển hand-rolled** | **avatar · chấm · thanh trượt · spinner · pill-đếm** | dòng cụ thể (CTA) |
|---|---|---|---|---|---|
| `src/frontend/views/HomeView.tsx` | 1363 | 12 | **0** | 12 (blob blur ×3, chấm ×4, thanh dọc ×2, pill-đếm ×2, avatar tròn ×1) | — |
| `src/frontend/views/ExploreView.tsx` | 1279 | 4 | **0** | 4 (blob blur ×3, chấm ×1) | — |
| `src/frontend/views/ProductDetailView.tsx` | 945 | 4 (1 là comment) | **0** | 3 (chấm ×2, ô màu tròn ×1) | — |
| `src/frontend/views/Tool3DView.tsx` | 1802 | **15** | **11** | 4 (spinner ×2, chấm ×1, track range ×1) | 905, 932, 1041, 1232, 1300, 1482, 1491, 1508, 1517, 1526, 1757 |
| `src/frontend/views/PersonalizeView.tsx` | 1073 | 2 | **0** | 2 (chấm ×1, ô màu tròn ×1) | — |
| `tool3d/QuoteSummaryPanel.tsx` | 631 | 4 | **3** | 1 (0) | 247, 258, 585, 594 |
| `tool3d/ModelViewer3D.tsx` | 1899 | 2 | 0 | 2 (chấm, track range) | — |
| `tool3d/ObjectTreePanel.tsx` | 266 | 4 | 0 | 4 (ô màu, nút icon tròn) | — |
| `tool3d/PresetPalettePanel.tsx` | 387 | 2 | 0 | 2 (ô màu, badge đếm) | — |
| `tool3d/ValidationReportPanel.tsx` | 362 | 1 | 0 | 1 (spinner) | — |
| `personalize/PersonalizeModelViewer3D.tsx` | 764 | 1 | 0 | 1 (chấm) | — |
| `tool3d/{InternalCost,MachineComparison,StlUnitConfirm,StlVs3mfComparison,TransformControls,UnifiedCadToolbar}.tsx` | 1226 | 0 | 0 | 0 | — |

**Tổng: 14 pill CTA hand-rolled** (11 ở `Tool3DView.tsx` + 3 ở `QuoteSummaryPanel.tsx`), tất cả đều **lệch spec** `docs/plans/21-saas-spec.md` §1.1 (“nút KHÔNG còn pill”, `Button` = `rounded-md`). Toàn bộ 4 màn storefront: **0**.

Lệnh: `grep -n rounded-full src/frontend/views/Tool3DView.tsx src/frontend/components/tool3d/*.tsx`

### 1b. Emoji hiển thị

| File | emoji astral (`U+1F000–1FAFF`) | dingbat BMP | ghi chú |
|---|---|---|---|
| `HomeView.tsx` | 0 | 0 (2 ký tự `★` chỉ nằm trong **comment**) | — |
| `ExploreView.tsx` | 0 | 0 (`★` trong comment) | — |
| `ProductDetailView.tsx` | 0 | 0 | — |
| `Tool3DView.tsx` | 0 | 0 | — |
| `PersonalizeView.tsx` | 0 | 0 (`★` trong comment) | — |
| **`personalize/PersonalizeModelViewer3D.tsx:315`** | **1** | 0 | `ctx.fillText(\`⚡ LOGO: …\`)` — emoji **vẽ vào canvas texture**, hiển thị thật |
| `tool3d/*.tsx` (11 file) | 0 | 0 | — |
| *ngoài 5 view nhưng render trên `/`:* `components/MaterialComparisonMatrix.tsx:370,377` | 0 | **2** (`✓`, `⚠`) | dùng glyph làm nhãn mục “Ứng Dụng Tối Ưu” / “Giới Hạn Kỹ Thuật” |

DOM xác nhận: `/` có đúng 2 glyph (`✓`,`⚠`); 4 route còn lại = **0**.

### 1c. Card tự dựng vs `<Card>` / `<Button>` / `<InfoTip>`

| File | `<Card>` | `<Button>` | `<InfoTip>` | `<button>` thô | dòng khớp heuristic “card tự dựng” |
|---|---|---|---|---|---|
| `views/HomeView.tsx` | 12 | 21 | 2 | 5 | 3 |
| `views/ExploreView.tsx` | 6 | 28 | 6 | 9 | 3 |
| `views/ProductDetailView.tsx` | 12 | 14 | 1 | 8 | 7 |
| **`views/Tool3DView.tsx`** | **0** | **2** | 1 | **17** | **14** |
| `views/PersonalizeView.tsx` | 3 | 12 | 6 | 6 | 3 |
| `tool3d/QuoteSummaryPanel.tsx` | 0 | 0 | 0 | 7 | 3 |
| `tool3d/ModelViewer3D.tsx` | 0 | 0 | 0 | 13 | 9 |
| `tool3d/TransformControlsPanel.tsx` | 0 | 0 | 0 | 12 | 2 |
| `tool3d/ValidationReportPanel.tsx` | 0 | 0 | 0 | 8 | 2 |
| `tool3d/UnifiedCadToolbar.tsx` | 0 | 0 | 0 | 6 | 1 |
| `tool3d/PresetPalettePanel.tsx` | 0 | 0 | 0 | 4 | 4 |
| `tool3d/MachineComparisonModal.tsx` | 0 | 0 | 0 | 3 | 3 |
| `tool3d/InternalCostBreakdownModal.tsx` | 0 | 0 | 0 | 3 | 2 |
| `tool3d/StlVs3mfComparisonModal.tsx` | 0 | 0 | 0 | 2 | 2 |
| `tool3d/StlUnitConfirmModal.tsx` | 0 | 0 | 0 | 2 | 3 |
| `tool3d/ObjectTreePanel.tsx` | 0 | 0 | 0 | 2 | 1 |
| `personalize/PersonalizeModelViewer3D.tsx` | 0 | 0 | 0 | 0 | 2 |

Heuristic “card tự dựng” = `grep -cE 'bg-surface.*rounded-(lg|xl|2xl|md)|rounded-(lg|xl|2xl|md).*bg-surface'` (đếm **dòng**, gồm cả panel lồng nhau ⇒ là **cận trên**). Card chuẩn = `rounded-lg border border-line-subtle bg-surface shadow-e0` (`src/frontend/ui/Card.tsx:45`).
**`Tool3DView` + toàn bộ `components/tool3d/**`: 0 `<Card>`, 0 `<Button>`, 0 `<InfoTip>`** — chỉ dùng `Icon`. Ví dụ nguyên văn: `Tool3DView.tsx:1074` và `:1157` là 2 “card” tự dựng `bg-surface … rounded-lg shadow-e1` (**thiếu `border-line-subtle`**, dùng `shadow-e1` trong khi spec §2.4 cấm bóng cho phần tử trong luồng).

### 1d. File CHƯA import `@frontend/ui`

**Không có.** Cả 5 view + 12 file con đều import `@frontend/ui` (`grep -n frontend/ui <file>`), nhưng 11/12 file con **chỉ import mỗi `Icon`**.

---

## 2. Thẩm mĩ

| # | Vấn đề | `file:line` | Bằng chứng |
|---|---|---|---|
| A1 | `/quote` (dark-first) **không dùng một primitive nào**: 17 `<button>` thô, 0 `<Card>`, 0 `<Button>`, 14 khối “card” tự dựng | `views/Tool3DView.tsx` (toàn file) | bảng 1c |
| A2 | **Nền tối dùng cho cả SECTION storefront**: banner, section CTA giữa trang, section cuối | `HomeView.tsx:296`, `:1020`, `:1302` | `bg-surface-inverse py-20/24` — 3 dải tối lớn trên trang light-first; đảo theme ⇒ 3 dải này thành **sáng** giữa trang tối (đúng ngữ nghĩa “inverse” nhưng làm nhịp sáng/tối nhấp nhô) |
| A3 | **Thang chữ vượt hệ thống**: `text-5xl`(48px)/`text-6xl`(60px) không có trong thang token (`--text-4xl 38` là max, `src/index.css`) | `HomeView.tsx:340` (`text-3xl sm:text-5xl lg:text-6xl font-black`), `:1286` (`text-5xl`) | DOM `fontSizes` tại 1440 = `["60px","48px","38px",…]` |
| A4 | Trạng thái rỗng **đã tốt** ở 3 chỗ (1 dòng chính + 1 câu nguyên nhân + 1 CTA) | `HomeView.tsx:730-752`, `QuoteSummaryPanel.tsx:138-166`, `/quote` empty state (DOM 26 text node) | ảnh chữ thô: `text-_quote.txt:15-19` |
| A5 | Chữ dài **nên** giữ nguyên (không nhét InfoTip) vì là cảnh báo trung thực: 2 text node > 140 ký tự trên toàn bộ 5 màn | `PersonalizeView` (disclaimer proxy, 1 node), `HomeView` (mô tả kho CAD, 1 node) | DOM buckets: `/` long=1, `/personalize` long=1, **veryLong=0** ở mọi route |
| A6 | `Card` bị ghi đè nền qua `className` — `cn()` **không merge** xung đột Tailwind, thắng/thua do thứ tự CSS | `HomeView.tsx:488`, `ProductDetailView.tsx:328` | `Card` BASE có `bg-surface`, className truyền `bg-surface-inverse` |
| A7 | Phân cấp thị giác chỗ báo giá `/products/:id`: **tiêu đề khối và giá cùng cỡ** (đều `text-lg`/`text-base`) | `ProductDetailView.tsx:664-666` vs `:625-627` | giá file số `text-base`, tổng đặt in `text-lg`; CTA chính `:822` bị chôn dưới 4 khối cấu hình |
| A8 | `bg-primary/5` làm nền dòng được chọn → chữ phụ tụt xuống 4.40:1 | `tool3d/... ` (thực tế ngoài 5 view): `components/MaterialComparisonMatrix.tsx:204`, chữ `:215,:224,:245` | xem mục 5 |

---

## 3. Trung thực dữ liệu

### 3.1 — P0: **`/quote` trắng trang khi khách upload tệp CAD** (đo trên DOM thật)

Upload `cube20.stl` (20×20×20 mm) vào `/quote` bằng `DOM.setFileInputFiles` → **`#root` rỗng, `innerText` = 0 ký tự**, React unmount toàn bộ cây.

```
EXC PricingUnavailableError: Chưa cấu hình 3 thông số giá nên KHÔNG tính giá (hệ thống không dùng số mẫu):
  bedDimensions.x — Khổ bàn in theo trục X (mm) của máy [MẪU] Máy chưa khai báo buồng in [DEMO-PR06] ·
  bedDimensions.y — … · bedDimensions.z — …
    at ot.throwIfAny (pricingEngine-*.js)
    at pn (pricingEngine-*.js:1:7625)
    at Array.map (<anonymous>)
    at Mn (pricingEngine-*.js:1:13386)          <-- comparePrintersForModel
    at Kr (Tool3DView-*.js)                      <-- render Tool3DView
```

**Nguyên nhân chính xác:**

| Vai trò | `file:line` |
|---|---|
| Gọi engine **KHÔNG bọc try/catch** (ngay trong thân render) | `src/frontend/components/tool3d/QuoteSummaryPanel.tsx:183` (`comparePrintersForModel`) |
| Cùng file, gọi **cũng không bọc** | `QuoteSummaryPanel.tsx:174` (`generateDeliveryPackages`) |
| Ngược lại, chỗ này **có** bọc (nên đã hiện empty state đúng) | `QuoteSummaryPanel.tsx:114-132` (`calculateDetailedPricing`) |
| Dữ liệu thật gây nổ: `DEMO-PR06` có `bed_dimensions = null` (cố ý, tên máy “Máy chưa khai báo buồng in”) | DB `printer_fleet` (GET, không in khoá) |
| Không có ErrorBoundary quanh route `/quote` | `src/App.tsx` (nhánh `path="/quote"` ~`:1435`) |

Ảnh hưởng: **màn chủ lực chết trắng với dữ liệu production hiện có**, cho **mọi** tệp upload. Đây là lỗi nặng nhất tìm được.
*Số hiển thị vs số engine:* **không so được** trên `/quote` vì không có gì được render — nhưng đúng tinh thần data-honesty: engine **từ chối tính** thay vì bịa (tốt), chỉ có UI không bắt lỗi (hỏng).

### 3.2 — Hiện `0 đ` như một cái giá (dữ liệu thật, 3 màn)

DB có nhiều dòng **giá = 0 nghĩa là “không bán kênh đó”**, không phải “miễn phí”:
`DEMO-P01` physical 250000 / digital **0**; `DEMO-P03` physical **0** / digital 150000; `DEMO-P04` physical **0**; `DEMO-P06` physical **0**; `DEMO-P08` physical 690000 / digital **0**; `DEMO-P02` digital **0**…

Chỗ hỏng — helper coi `0` là số hợp lệ:

| `file:line` | Nội dung |
|---|---|
| **`views/HomeView.tsx:29-30`** | `const vnd = (v) => isNum(v) ? \`${…} đ\` : EMPTY_VALUE` — `isNum(0) === true` |
| **`views/ProductDetailView.tsx:25-26`** | y hệt |
| `views/HomeView.tsx:878, 886, 974, 977` | gọi `vnd(product.priceDigital/pricePhysical)` |
| `views/ProductDetailView.tsx:626, 665, 822, 901, 904, 922` | `vnd(digitalPrice)`, `vnd(orderTotal)`, `CAD: {vnd(rel.priceDigital)}` |

**DOM thô (đo được, không suy luận)** — `/tmp/vcube-a1/text-_products_DEMO-P01.txt`:

```
47: BẢN QUYỀN TẢI FILE CAD GỐC
48: 0 đ                                    <-- giá file CAD = 0 đ (P01 không bán file số)
```
`text-_products_DEMO-P03.txt`:
```
68: ĐẶT GIA CÔNG IN 3D (0 đ)              <-- NÚT ĐẶT HÀNG ghi 0 đ (P03 không bán bản in)
79: CAD: 0 đ    83: CAD: 0 đ               <-- thẻ "in cùng" ghi 0 đ
```
`text-_.txt` (trang chủ): `90: 0 đ`, `107: 0 đ`, `126`, `143`, `160`, `180`, `213`, `230` — **8 dòng “0 đ”** dưới nhãn “FILE SỐ (STL/CAD)” / “BẢN IN VẬT LÝ”.

**Đối chứng ngược (cùng dữ liệu, code ĐÚNG):** `ExploreView` cho kết quả trung thực vì `formatVnd` lọc `> 0`:
```
views/ExploreView.tsx:51   Number.isFinite(value) && value > 0 ? `${value.toLocaleString(locale)} đ` : EMPTY_VALUE
views/ExploreView.tsx:231  .filter((v) => Number.isFinite(v) && v > 0)
```
DOM `/explore` dòng 109-112: `FILE SỐ 150.000 đ` / `BẢN IN VẬT LÝ —` cho đúng P03. ⇒ **HomeView + ProductDetailView lệch chuẩn so với ExploreView**, không phải “quy ước chung”.

### 3.3 — NaN / undefined / NULL

- **Không có** `NaN`, `undefined`, `Infinity`, `[object Object]`, `null đ` trong DOM của cả 5 route (script quét `document.body.innerText`).
- Đánh giá NULL xử lý đúng: `P01/P02/P12 rating = null`, `P04 rating 4.2 nhưng reviews_count = 0` ⇒ cả 3 màn đều in **“Chưa có đánh giá”** (`HomeView.tsx:33-34 hasRating`, `ExploreView.tsx:57-72 ratingOf`, `ProductDetailView.tsx:114-118`). DOM xác nhận.
- Fallback số còn sót (`grep -nE '\?\?[[:space:]]*-?[0-9]|\|\|[[:space:]]*-?[0-9]'`): `ExploreView.tsx:214,323,324,376` (đếm/sắp xếp — vô hại), `ProductDetailView.tsx:76,87` (`discountPercent || 0`, `engravingFee ?? 0` — chỉ dùng khi khách đã yêu cầu khắc, và `:85` chặn khi phí chưa cấu hình), `ModelViewer3D.tsx` (hình học 3D, không hiển thị tiền).
- **Giá trị đo được vs DB (khớp 100%)** — `/personalize` (nguồn `materials` thật):
  PLA `300 đ/g • 270.000 đ/kg • 1.75 g/cm³` ↔ DB `price_per_gram 300 / cost_per_kg 270000 / density 1.75` ✓; PETG 360/320000/1.27 ✓; TPU 700/620000/1.21 ✓; Resin 1500/1400000/1.1 ✓; PA-CF 1900/1850000/1.06 ✓; ABS `— • —` ↔ DB null ✓; PC `— • 950.000 đ/kg` ↔ DB `price_per_gram null, cost_per_kg 950000` ✓.
- `/` hiện `Chưa cấu hình · Nhập ở /admin` cho dải KPI và `—` cho bộ tính nhanh (thiếu `pricing_configs`) — đúng luật, không mượn số.

### 3.4 — Chỗ ĐỌC KHÔNG TỪ DB (đọc fixture/hằng số)

| `file:line` | Nguồn | Đánh giá |
|---|---|---|
| `views/HomeView.tsx:4` | `CATEGORIES, POPULAR_TAGS` từ `src/data/mockData.ts` | **Danh mục + tag trang chủ hard-code**, không có bảng DB tương ứng ⇒ lọc theo `CATEGORIES` (`:663`, `:1219`) và `POPULAR_TAGS` (`:690`) là dữ liệu tĩnh |
| `views/ExploreView.tsx:4` | `CATEGORIES, POPULAR_TAGS` | như trên (`:638` dùng cho chip lọc) |
| `views/HomeView.tsx:38,49` · `ProductDetailView.tsx:34,44` | `materials = MATERIALS_CATALOG` (= `[]`) | không phải nguồn dữ liệu (đã rỗng hoá) nhưng vẫn là **default prop**; nếu `materials` prop rỗng thì rơi về `[]` ⇒ an toàn, song để lại đường rơi về fixture |
| `views/Tool3DView.tsx:5` · `tool3d/QuoteSummaryPanel.tsx:4` | `PRINTER_PROFILES`, `MATERIALS_CATALOG`, `SAMPLE_ANALYSIS_FILES` (= `[]`) | default prop rỗng; `SAMPLE_ANALYSIS_FILES.length > 0 &&` đã guard (`Tool3DView.tsx:1031`) |
| `tool3d/QuoteSummaryPanel.tsx:61-62`, `Tool3DView.tsx:297-298` | `printers = PRINTER_PROFILES`, `materials = MATERIALS_CATALOG` | **default rỗng** ⇒ nếu App không truyền prop, panel rơi vào empty state (đã có), không bịa |
| `personalize/PersonalizeModelViewer3D.tsx:714` | `{modelType \|\| 'ARDUINO-CASE'}` | **nhãn model bịa** khi `modelType` rỗng (đã có disclaimer proxy ngay trên, nhưng vẫn là chuỗi bịa) |
| `personalize/PersonalizeModelViewer3D.tsx:315` | `⚡` vẽ vào canvas | chi tiết thẩm mĩ, không phải dữ liệu |

- **`localStorage`: 0 lần** trong toàn bộ 17 file thuộc vùng rà soát. Toàn bộ dữ liệu sản phẩm/vật liệu/máy in đi qua `src/backend/supabase/*` (đã kiểm chứng: DOM `/explore` hiện `11 bản vẽ`, `Hiển thị 11 / 11` ↔ DB `content-range 0-11/12` với P12 `draft`).

---

## 4. Tương phản

### 4.1 RC token — `node scripts/check-contrast.mjs` → **RC = 0**
`72/84 PASS · 12 EXPECTED (đã ghi trong docs/design/tokens.md) · 0 unexpected fail`.
⚠️ **Lỗ hổng của gate**: 3 cặp **thật sự fail trên DOM** không nằm trong bộ test token (xem 4.2 #1,#2,#3) — gate đang thiếu cặp `fg-subtle × line-subtle`, `fg-subtle × primary/5`, `warning × warning-tint`.

### 4.2 DOM thật — 5 route × {390, 1024, 1440} × {light, dark} = 30 tổ hợp
Số **text node fail < 4.5:1** (đã loại large-text ≥24px hoặc ≥18.66px bold; công cụ v2 đã self-test):

| route | 390 light | 1024 light | 1440 light | 390 dark | 1024 dark | 1440 dark |
|---|---|---|---|---|---|---|
| `/` | **12** | **12** | **12** | **4** | **4** | **4** |
| `/explore` | 0 | 0 | 0 | 0 | 0 | 0 |
| `/products/DEMO-P01` | 0 | 0 | 0 | 0 | 0 | 0 |
| `/quote` | 0 | 0 | 0 | 0 | 0 | 0 |
| `/personalize` | 0 | 0 | 0 | 0 | 0 | 0 |

Tổng text node quét: `/` = 512, `/explore` = 328, `/products` = 118, `/quote` = 35, `/personalize` = 230 (ở 1024/1440).
`largeExempt`: `/` = 6–7; các route khác 0–1. `unparsed = 0`, `gradient = 0` ở mọi tổ hợp.

**Danh sách fail (kèm nguồn) — tất cả nằm ở `/`:**

| # | Tỉ lệ | Màu (đo) | Cỡ/nặng | Nguồn `file:line` | Văn bản |
|---|---|---|---|---|---|
| 1 | **3.86** light / **4.26** dark | `#64748B` (`text-fg-subtle`) trên `#E2E8F0` (`bg-line-subtle`) | 12px/700 | **`src/frontend/components/MaterialComparisonMatrix.tsx:157`** (nền) + **`:168-171`** (nhánh `: 'text-fg-subtle hover:text-fg'`) | “Tiêu Chuẩn”, “Kỹ Thuật”, “Resin Siêu Nét”, “Cao Cấp CF” (tab chưa chọn) |
| 2 | **4.40** light | `#64748B` trên `#F2F7F8` (= `bg-primary/5` trên trắng) | 12px/500 | **`MaterialComparisonMatrix.tsx:204`** (`bg-primary/5`) + chữ `:215`, `:224`, `:245` | “FDM Standard”, “/10”, tên danh mục |
| 3 | **4.47** light | `#B45309` (`text-warning`) trên `#FBF0E4` (`bg-warning-tint`) | 12px/700 | **`MaterialComparisonMatrix.tsx:230-238`** (nhánh `bg-warning-tint text-warning`) | “80°C”, “75°C” |
| 4 | (trùng #1, dark) | | | | |

Không truy được `file:line` bằng DOM — ánh xạ trên đây làm bằng **đối chiếu chuỗi className trong `path` của phần tử** (`div.bg-surface.rounded-lg.p-6 > div.flex.flex-col.md:flex-row > div.flex.items-center.gap-1.5 > button.px-3.py-1.5.rounded-sm`) với grep `px-3 py-1.5` + `bg-line-subtle` trong `src/`. Văn bản DOM thô trùng khớp chuỗi trong file.

**Không đo được bằng DOM:** `/quote` và các panel con của nó (`ModelViewer3D`, `ValidationReportPanel`, `TransformControlsPanel`, `PresetPalettePanel`, `ObjectTreePanel`, `InternalCostBreakdownModal`, `MachineComparisonModal`, `StlVs3mfComparisonModal`) — vì upload tệp làm trắng trang (P0, mục 3.1). **Đây là vùng tương phản CHƯA kiểm chứng**; muốn đo phải sửa P0 trước.

---

## 5. Việc cần sửa — xếp theo mức ảnh hưởng “trông đẹp & đáng tin”

| Ưu tiên | Việc | `file:line` |
|---|---|---|
| **P0** | Bọc `try/catch` (hoặc một error boundary quanh route `/quote`) cho `comparePrintersForModel` và `generateDeliveryPackages`; hiện `pricingUnavailableReason` như nhánh `calculateDetailedPricing` đã làm | `components/tool3d/QuoteSummaryPanel.tsx:183` (+`:174`); thêm `ErrorBoundary` ở `src/App.tsx` nhánh `/quote` |
| **P0** | Đổi `isNum(v)` → `isNum(v) && v > 0` cho helper tiền, hoặc tách `vnd()` “không bán” khỏi “0 đ” | `views/HomeView.tsx:29-30`, `views/ProductDetailView.tsx:25-26` |
| **P1** | 3 cặp màu fail < 4.5:1 (3.86 / 4.40 / 4.47) | `components/MaterialComparisonMatrix.tsx:157,168-171,204,215,224,230-238,245` |
| **P1** | Bổ sung 3 cặp trên vào gate token để không tái phát | `scripts/check-contrast.mjs` (hiện 0 unexpected fail nhưng thiếu cặp) |
| **P2** | Đưa `/quote` + `components/tool3d/**` về primitive: thay 14 pill CTA hand-rolled và 2 “card” tự dựng (thiếu `border-line-subtle`, dùng `shadow-e1`) | `views/Tool3DView.tsx:905,932,1041,1074,1157,1232,1300,1482,1491,1508,1517,1526,1757`; `tool3d/QuoteSummaryPanel.tsx:247,258,585,594` |
| **P2** | 5 màn dùng `<select>`/`<input>` thô **không có `htmlFor`** (0 lần trong cả 5 file) và 17 `<button>` ở `/quote` không có `aria-label` nào | `Tool3DView.tsx:1179` (select không có tên), `:0 aria-label` toàn file |
| **P2** | Thang chữ vượt token (48/60px) | `HomeView.tsx:340,1286` |
| **P3** | `bg-surface-inverse` cho 3 section storefront gây nhịp tối/sáng nhấp nhô khi đảo theme | `HomeView.tsx:296,1020,1302` |
| **P3** | Nhãn model bịa khi thiếu `modelType` | `personalize/PersonalizeModelViewer3D.tsx:714` |
| **P3** | Danh mục/tag hard-code, không có bảng DB | `HomeView.tsx:4,663,690,1219`; `ExploreView.tsx:4,638` |
| **P4** | Nhãn dưới thanh trượt giá hiện `0 đ` (sàn slider) dù không sản phẩm nào 0 đ | `ExploreView.tsx:454` |

---

## 6. Nếu chỉ được làm 3–5 việc

1. **P0 — `/quote` trắng trang khi upload tệp.** `QuoteSummaryPanel.tsx:183` (+`:174`) bọc `try/catch` + error boundary ở route. Không có việc nào đáng làm trước việc này: màn báo giá là lý do tồn tại của sản phẩm và nó chết với **mọi** tệp, trên dữ liệu production hiện có.
2. **P0 — bỏ “0 đ” giả.** `HomeView.tsx:29-30` + `ProductDetailView.tsx:25-26`: `isNum(v) && v > 0`. Sửa 2 dòng, xoá 8+ dòng “0 đ” ở trang chủ và nút **“ĐẶT GIA CÔNG IN 3D (0 đ)”** ở `/products/DEMO-P03`.
3. **P1 — 3 cặp màu fail ở `/`** (`MaterialComparisonMatrix.tsx`): 12 text node fail ở **mọi** kích thước, cả light (3.86/4.40/4.47) — đây là màn duy nhất còn fail, sửa xong là 5/5 route sạch.
4. **P1 — thêm 3 cặp đó vào `scripts/check-contrast.mjs`** để gate không còn “xanh giả”.
5. **P2 — `/quote` về primitive**: 14 pill CTA + 2 card tự dựng lệch spec (§1.1 bỏ pill; §2.4 cấm `shadow-e1` cho phần tử trong luồng) là chênh lệch thẩm mĩ lớn nhất còn lại giữa `/quote` và 4 màn storefront đã chuẩn hoá.

---

## 7. Lỗi do CHÍNH TÔI gây ra

1. **Rò khoá bí mật ra transcript (nghiêm trọng nhất).** Một lệnh `curl` của tôi bị bash báo lỗi cú pháp và **in nguyên dòng lệnh — bao gồm `SUPABASE_SECRET_KEY` (`sb_secret_…`) — ra stderr**. Tôi đã đổi sang pattern `grep … | xargs -I KEY curl -H 'apikey: KEY'` để khoá không còn nằm trong argv của bash, nhưng **khoá đã lộ một lần trong phiên này**. Đề nghị: coi như đã lộ và **rotate** (AGENTS.md vốn đã ghi “rotate `sb_secret_…` (đã lộ trong chat)” — nay thêm một lần nữa). Không in lại giá trị khoá ở bất kỳ đâu trong báo cáo này.
2. **Sai số đo lần 1 (đã tự phát hiện và sửa).** Công cụ đo tương phản v1 parse `oklab(...)` bằng regex số ⇒ báo **192 + 192 fail giả** (ví dụ `trắng/70 trên #091426`, thực tế ≈9.3:1). Tôi đã nghi dụng cụ, viết self-test, thay bằng chuẩn hoá màu qua canvas + composite nền theo lớp, rồi mới dùng số. **Mọi số ở mục 4 là của bản v2 đã self-test.**
3. **Ghi 6 file tạm NGOÀI repo** (không file nào trong repo bị chạm): 6 script đo ở `C:\Users\chith\AppData\Local\Temp\vcube\` (`a1-measure.mjs`, `a1-measure2.mjs`, `a1-report-dom.mjs`, `a1-report2.mjs`, `a1-honesty.mjs`, `a1-domstats.mjs`, `a1-upload.mjs`, `a1-selftest.mjs`, `cube20.stl`) và `/tmp/vcube-a1/**`. Ngoài phạm vi “đúng 1 file báo cáo” mà đề bài cho phép; tôi đã cố tình đặt **ngoài repo** và sẽ dọn (xem mục 8).
4. **Build/serve tạm**: `vite build --outDir /tmp/vcube-a1/dist` và `vite preview --port 4371` (PID riêng), Chrome headless PID riêng cổng 9341 — **không dùng `pkill`/`killall`**, không đụng cổng 3000 hay profile Chrome của agent khác (`/tmp/a3-chrome-profile`, cổng 9333).
5. **Không hoàn thành 1 phần yêu cầu:** (a) đo tương phản DOM cho **UI thật của `/quote` và 8 panel con** — bất khả thi vì lỗi P0 làm trắng trang; (b) `check-unitprice-multiplier.mjs`, `lint-rls-*`, `lint`/`build` gate không chạy (ngoài phạm vi 5 màn).

---

## 8. Dọn dẹp (đã thực hiện sau khi ghi báo cáo)

- Kill **đúng PID** của `vite preview` (lấy từ `ss -ltnp | grep :4371`) và Chrome của tôi (`ss -ltnp | grep :9341`); **không** `pkill`/`killall`.
- `rm -rf /tmp/vcube-a1` (gồm `dist`, profile Chrome, log, các file `.txt` DOM).
- Xoá 6 script tạm trong `C:\Users\chith\AppData\Local\Temp\vcube\`.

## 9. Artifact trung gian đã dùng (trước khi xoá)

- `/tmp/vcube-a1/dom-contrast-v2.json` — 30 bản ghi đo tương phản (theme × width × route × từng text node fail).
- `/tmp/vcube-a1/text-{_,_explore,_products_DEMO-P01,_products_DEMO-P03,_quote,_personalize}.txt` — `document.body.innerText` thô của 6 lần render (đây là “DOM thô” dùng để kết luận ở mục 3.2; ví dụ nguyên văn đã chép vào báo cáo).
