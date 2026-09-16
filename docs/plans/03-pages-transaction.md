> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 03 — Phân tích & tối ưu: nhóm trang giao dịch (báo giá → đặt hàng → theo dõi)

Phạm vi: `/quote` · `/cart` · `/checkout` · `/order-success*` · `/tracking*` · `/orders` · `/assets`
Mức: **P0** = sai/đáng tin cậy hoặc mất tiền · **P1** = chặn chuyển đổi · **P2** = chất lượng UX · **P3** = polish.

---

## 1. `/quote` — Tool3DView (1.218 LOC) + ModelViewer3D (1.885 LOC) — **sản phẩm cốt lõi**

### 1.1 Tính năng hiện có

| Nhóm | Tính năng | Vị trí |
|---|---|---|
| Nhận file | dropzone trong trang + dropzone thứ hai **trong canvas** + input file + nhận file qua route state | `Tool3DView.tsx:479-485`, `:530-539`, `ModelViewer3D.tsx:1560-1566`, `Tool3DView.tsx:386-389` |
| Phân tích | router theo định dạng: 3MF native (main thread), STL >2MB qua Web Worker, STL nhỏ/OBJ main thread, STEP/IGES không parse | `meshParser.ts:1082`, `:632-988`, `:1180`, `:999`, `:1346-1386` |
| Cắt lớp | máy in, vật liệu, mật độ infill + 3 pattern, layer height, supports, số lượng | `Tool3DView.tsx:660-804` **và lặp lại** `QuoteSummaryPanel.tsx:218-347` |
| Kiểm tra mesh | điểm printability, 3 check (watertight/non-manifold/wall), auto-fix, phủ defect, compare mode, 4 tab (object tree / preset màu / transform / validation) | `Tool3DView.tsx:807-1077` |
| Viewport | 11 nút toolbar (góc nhìn, ortho/persp, wireframe, bbox, đo khoảng cách, slice, fullscreen, chụp ảnh), plate dock, thanh slice, tooltip hover | `ModelViewer3D.tsx:1589-1882` |
| Báo giá | 3 gói Economy/Standard/Express, banner giảm giá theo số lượng, so sánh máy in, breakdown giá vốn nội bộ | `QuoteSummaryPanel.tsx` |
| Lịch sử | bảng file đã upload (in-memory) | `Tool3DView.tsx:1113-1187` |
| Khác | chip mẫu để thử nhanh, modal STL vs 3MF, modal xác nhận đơn vị (dead) | `:547-568`, `:1192`, `:1198` |

### 1.2 Vấn đề — Kiến trúc & hiệu năng

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Đổi máy in làm model biến mất.** Effect khởi tạo scene phụ thuộc `bedDimensions` và cleanup dispose toàn bộ scene+renderer; effect build model **không** phụ thuộc bed → group mới rỗng, context WebGL bị dựng lại cho một thay đổi chỉ nên là uniform | `ModelViewer3D.tsx:791` vs `:1152`, cleanup `:788-789` | P0 |
| 2 | Effect build model đọc `parts`, `selectedPartId`, `showDefects`, `compareMode`, `wireframe`, `activePlateIndex` nhưng chỉ phụ thuộc `parts.length` → stale closure, `partMeshMapRef` trỏ vào mesh đã dispose | `:1152`, `:137`, `:901` | P0 |
| 3 | **Rò VRAM mỗi lần upload:** `disposeHierarchy` bỏ qua mọi thứ có `userData.isSharedGeometry`, mà mesh STL upload được gắn đúng cờ đó → teardown không bao giờ giải phóng; mảng `files` giữ mãi | `:41-43`, `:899`, `:788`; `Tool3DView.tsx:37,286` | P0 |
| 4 | **`setFps` trong rAF loop** → re-render component 1.885 dòng mỗi 500ms mãi mãi; kèm việc `useRef(new THREE.Material(...))` cấp phát 3 material + Vector3 + Map + Plane **mỗi render** | `:744-749`, `:133-180` | P0 |
| 5 | `preserveDrawingBuffer: true` trả giá mỗi frame chỉ để phục vụ 1 nút chụp ảnh | `:385` | P1 |
| 6 | Không có điều khiển vòng render: rAF chạy mãi, chỉ chặn khi `document.hidden`; không pause khi canvas ngoài viewport (guard `isIntersectingRef` ở viewer kia là code chết vì không có IntersectionObserver nào trong repo) | `:735-765`, `PersonalizeModelViewer3D.tsx:114` | P1 |
| 7 | Stencil capping tạo **2 mesh phụ cho mỗi part** (3× draw call) + mặt cắt 2000×2000 | `:849-863`, `:939-953`, `:466` | P2 |
| 8 | `Box3.setFromObject` + `updateMatrixWorld` mỗi tick slider transform | `:1206`, `:1178` | P2 |
| 9 | Parse main-thread cho 3MF (`JSZip` + `DOMParser` + vòng lặp theo vertex) và OBJ; `analyzeMeshDefects`, `mergeVertices`, `calculateVolume` đều sync | `meshParser.ts:633-741`, `:1275-1328` | P1 |
| 10 | React ↔ Three trùng lặp 9 chỗ (transform, 2 scale semantics khác nhau, prop + local state copy, ref ghi trong render, `activeAngle` không cập nhật khi orbit tự do, 2 camera với 3 chỗ gán `activeCameraRef`) | liệt kê đầy đủ trong audit; `:1162-1170`, `:184-187`, `:104`, `:379/795/1368` | P1 |
| 11 | WebGL context loss không hồi phục: handler chỉ `console.info` khi restore, không dựng lại renderer/tài nguyên; canvas chết im lặng | `:683-696` | P1 |
| 12 | `Tool3DView` import `three` trực tiếp **và** qua `ModelViewer3D`, kéo cả loader STL/OBJ/3MF + `BufferGeometryUtils` + `jszip` vào chunk 311 KB | `Tool3DView.tsx:3` | P2 |

### 1.3 Vấn đề — Minh bạch dữ liệu (theo quyết định "làm cho trung thực")

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 13 | **Parse lỗi tạo model giả rồi báo thành công:** dims 85×55×30, volume 42.5, 14.200 tam giác, `isWatertight: true`, score 92, `BoxGeometry(85,30,55)`, tên `[Phục hồi]`, toast xanh "đã tự động khởi tạo mô hình CAD phôi an toàn" | `Tool3DView.tsx:314-371`, `meshParser.ts:1195-1196` | **P0** |
| 14 | **STEP/IGES không hề được parse** nhưng trả box "B-Rep proxy" với `isWatertight: true` và UI gắn badge "STEP" | `meshParser.ts:1346-1386`, `Tool3DView.tsx:586` | **P0** |
| 15 | Mesh lớn luôn "100% Watertight": phân tích defect bị bỏ qua trên 60k tam giác → counter = 0 → `isWatertight` true | `meshParser.ts:192`, `:232` | **P0** |
| 16 | `sha256Hash` là literal hiển thị như mã băm thật | `Tool3DView.tsx:279`, `:360` | **P0** |
| 17 | `printabilityScore: 94`, `overhangPercentage: 6.8` là hằng số (trong khi parser **có** tính overhang thật rồi vứt đi) | `:261`, `:272`; `meshParser.ts:145-181` | **P0** |
| 18 | "Auto-fix" chỉ clone geometry + `computeVertexNormals` nhưng set `nonManifoldEdges:0`, `invertedNormals:0`, `minWallThickness:1.6`, score 98 và toast "đã sửa xong toàn bộ lỗi" | `Tool3DView.tsx:180-199,225`; `meshParser.ts:247-251` | **P0** |
| 19 | "Tách Shells" bịa tỉ lệ 58/42 tam giác và 60/40 thể tích, chỉ dùng `parts[0]`, rồi đổi định dạng file thành '3MF' | `Tool3DView.tsx:160-174`; `meshParser.ts:260-292` | **P0** |
| 20 | `minWallThickness` hardcode trong parser; `invertedNormals = min(12, boundaryEdges)` không phải phép tính; ngưỡng DfAM (0.8mm, 45°) là hằng số | `meshParser.ts:134,237,965,1157,1328,1384`, `:236`; `Tool3DView.tsx:862,874,888` | P1 |
| 21 | **Modal giá vốn nội bộ mở cho mọi khách:** giá vốn, markup, margin, công thức ngược và **form override giá của operator** — không có gate quyền | `QuoteSummaryPanel.tsx:168-176`; `InternalCostBreakdownModal.tsx:124-126,272-318` | **P0** |
| 22 | "Áp sát bàn in" chỉ zero `rotationX/Z` nhưng toast nói đã đặt đáy phẳng; panel QA hiện "hướng đặt phôi đề xuất bởi AI Slicer" là chuỗi tĩnh | `Tool3DView.tsx:1053-1056`; `ValidationReportPanel.tsx:187` | P1 |
| 23 | Yêu cầu "thẩm định thủ công" chỉ `setTimeout(1000)` rồi báo đã gửi | `QuoteSummaryPanel.tsx:134-141` | P1 |
| 24 | Bảng lịch sử ghi "S3 Direct Upload Cache" nhưng upload hoàn toàn cục bộ; `uploadCadFile` không có call site | `Tool3DView.tsx:1119`; `database.ts:205` | P2 |

### 1.4 Vấn đề — Giá & báo giá

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 25 | **Giảm giá theo số lượng hiển thị nhưng KHÔNG được trừ:** `effectiveUnitPrice` dùng giá gốc, gói được dựng từ giá gốc, tổng tiền cũng vậy → banner "Tiết kiệm −X đ" là sai | `QuoteSummaryPanel.tsx:90`, `:93`, `:465`; `pricingEngine.ts:189` chỉ được dùng ở nhánh dead | **P0** |
| 26 | Bậc giảm giá không với tới được: chip số lượng dừng ở 20 nhưng copy quảng cáo "50+ cái (−30%)"; `quantity >= 50` lại bắt buộc review thủ công | `Tool3DView.tsx:788`; `QuoteSummaryPanel.tsx:200,331`; `pricingEngine.ts:262-263` | P1 |
| 27 | `comparePrintersForModel` chạy lại `calculateDetailedPricing` cho **mỗi** máy in, và cả 3 phép tính (pricing/packages/compare) chạy **mỗi render**, không memo → kéo slider infill là tính lại toàn bộ | `QuoteSummaryPanel.tsx:72-108`; `pricingEngine.ts:461-475` | P1 |
| 28 | Hai mô hình lead time mâu thuẫn trong cùng panel: gói dùng offset ngày cố định, bảng so sánh máy dùng `now + ceil(giờ×SL) + 24h` → 2 ngày hoàn thành khác nhau cho cùng một đơn | `pricingEngine.ts:398/403/408` vs `:482` | P1 |
| 29 | "Ước tính sơ bộ" được suy ra từ chính giá chính xác (×0.9 … ×1.18) → không mang thông tin gì | `pricingEngine.ts:247-248`; `QuoteSummaryPanel.tsx:205-215` | P2 |
| 30 | Không có dòng VAT; ticket ghi "Đã gồm VAT" nhưng engine không có field thuế, `CheckoutView` set `tax: 0`, `InvoiceModal` lại cộng 8% | `QuoteSummaryPanel.tsx:460`; `types/index.ts:366-425`; `CheckoutView.tsx:116`; `InvoiceModal.tsx:18-19` | **P0** |
| 31 | Đơn vị mm/inch nằm sâu 3 lớp, đổi đơn vị nhân thể tích ×25.4³ = **16.387×** và đẩy thẳng vào giá, không cảnh báo, không xác nhận; modal xác nhận đơn vị là **code chết** (cờ chỉ được set `false`) | `TransformControlsPanel.tsx:241-264`; `Tool3DView.tsx:95,101`; `:79,1203,1208,1212` | **P0** |
| 32 | Khách không thấy được cấu thành giá (nhựa g × đ/g, giờ máy, nhân công, hậu kỳ, đóng gói, dự phòng lỗi) — tất cả nằm trong modal nội bộ | `InternalCostBreakdownModal.tsx:69-106` | P1 |
| 33 | Giỏ hàng không re-quote được: `CartItem` chỉ giữ price + chuỗi hiển thị tự do, không có volume/infill/layer/printer → checkout không thể kiểm tra lại giá | `types/index.ts:44-70`; `QuoteSummaryPanel.tsx:126-130` | P1 |
| 34 | OOB (vượt bàn in) tính theo `transformedDimensions` còn pricing tính theo `file.dimensions` → scale lên không đổi mức rủi ro/review | `Tool3DView.tsx:104-107` vs `pricingEngine.ts:253,485` | P2 |
| 35 | CTA "Đổi sang máy khổ lớn" hardcode `anycubic-kobra-max`; máy in resolve từ `PRINTER_PROFILES` (mock) dù `printers` là prop → chọn máy khác trên dropdown nhưng tính OOB bằng mock | `Tool3DView.tsx:467`, `:91`; `QuoteSummaryPanel.tsx:513` | P1 |

### 1.5 Vấn đề — UX desktop & mobile

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 36 | **Cụm điều khiển cắt lớp bị render 2 lần** (panel trái và panel giá phải) — cùng state, hai chỗ sửa | `Tool3DView.tsx:673-803` vs `QuoteSummaryPanel.tsx:218-347` | P1 |
| 37 | 390px: giá nằm **sau** toàn bộ cột trái (~2.100–2.700px cuộn), `lg:sticky` vô tác dụng, không có sticky price | `:571`, `:1081` | P1 |
| 38 | Toolbar 11 nút `max-w-[95%] overflow-x-auto`: ở 390px các nút phải (caliper, chụp ảnh) bị cuộn khuất, **không có affordance cuộn**, nút chỉ có `title` | `ModelViewer3D.tsx:1640`, `:1617-1742` | P1 |
| 39 | **Va chạm chrome trong canvas:** toolbar `top-12 sm:top-14` vs banner OOB `top-14 left-3 right-3` vs caliper `top-14 right-3` — cùng `top-14`, cùng `z-20`; banner nằm sau trong DOM nên **phủ lên toolbar đúng lúc model không vừa bàn in** (lúc cần nút "Co vừa bàn") | `:1640`, `:1794`, `:1821` | P1 |
| 40 | Dock plate `bottom-16 left-3` và tooltip hover `bottom-16 left-3` **trùng toạ độ** | `:1748`, `:1852` | P2 |
| 41 | Thanh slice: badge "0.16mm Layer" **hardcode**, bỏ qua layer height đã chọn; range input chỉ còn ~120-140px ở 390px | `:1878-1880`, `:1858-1882` | P2 |
| 42 | Bảng lịch sử: `.responsive-table-wrapper` ép `min-width:600px` trong hộp 358px → cuộn ngang | `index.css:183-186`, `Tool3DView.tsx:1142` | P2 |
| 43 | **Transform panel sai nhãn:** hiện "Tọa Độ Y (mm)" nhưng bind `positionZ`; `positionY` không có control và viewer cũng không áp dụng; rotation Y/Z chỉ có ±90° (chỉ X có slider); `scaleX/Y/Z` không tới được dù viewer có dùng | `TransformControlsPanel.tsx:204-213`, `:135-178`; `ModelViewer3D.tsx:1176-1177` | P1 |
| 44 | Không nhập số: chỉ slider (scale 20-300% step 5, position ±100mm cứng không suy từ bed có thể 420mm), không đơn vị, không validate | `TransformControlsPanel.tsx:90-98,191-215` | P1 |
| 45 | Không có undo/redo dù `useUIStore.showToast` **đã hỗ trợ** `undoAction` — nhưng prop của tool khai báo `(message: string)` nên mất tính năng | `useUIStore.ts:47`; `Tool3DView.tsx:23` | P1 |
| 46 | Sửa part chỉ ghi vào `selectedFile`, không ghi vào mảng `files`; bấm lại cùng dòng trong lịch sử **âm thầm revert** sửa part và reset transform | `:110-115`, `:392-411` | P1 |
| 47 | Không có draft persistence: đổi route là mất file + transform + tham số; reload về `SAMPLE_ANALYSIS_FILES[0]` | `:38` | P1 |
| 48 | Modal xếp chồng không phối hợp: tool3d dùng `z-[9999]`, `CadQuickViewModal` dùng `z-50`; mỗi modal tự ghi `document.body.style.overflow` và một chỗ restore về `''` → mở khoá scroll của modal ngoài | `StlUnitConfirmModal.tsx:45`; `CadQuickViewModal.tsx:66,126` | P2 |
| 49 | A11y: canvas không focus được, tab workspace không có `role="tab"`/`aria-selected`, range không có `aria-label`, swatch màu là button rỗng | `ModelViewer3D.tsx:1586`; `Tool3DView.tsx:955-1001` | P1 |
| 50 | Dropzone thứ hai nằm trong canvas trùng chức năng với dropzone trong trang | `ModelViewer3D.tsx:1560-1566` | P3 |

### 1.6 Kế hoạch tối ưu `/quote`

**A. Kiến trúc (làm trước, mỗi mục là thay đổi nhỏ, kiểm chứng được)**
1. Effect khởi tạo scene → **mount-only**; thêm effect riêng cập nhật build volume/grid khi `bedDimensions` đổi; sửa dependency list của effect build model (`parts`, `selectedPartId`, `activePlateIndex`, `showDefects`, `compareMode`).
2. Bỏ `userData.isSharedGeometry` khỏi đường teardown cho mesh upload; giới hạn `files` (ví dụ 5 file gần nhất) và gọi `geometry.dispose()` khi evict.
3. `setFps` → ghi vào DOM ref (không state); `useRef(new THREE.Material(...))` → lazy initializer; `setHoveredPartName` ra khỏi đường mousemove (dùng ref + class CSS).
4. Render theo nhu cầu: `preserveDrawingBuffer:false`, `requestRender()` cho mọi thay đổi, rAF chỉ chạy khi cần (auto-rotate/đang kéo); `IntersectionObserver` pause khi off-screen; `document.hidden` giữ nguyên.
5. Gộp 3 viewer thành 1 (`ModelViewer3D`) + profile cấu hình; `disposeHierarchy` về 1 module dùng chung.
6. WebGL context loss: `preventDefault()` + dựng lại renderer/scene khi restore + fallback DOM (poster + "tải STL") + thông báo cho người dùng; mở rộng ErrorBoundary cho `CadQuickViewModal`, `AssetLibraryView`, `PersonalizeView`.
7. Parse: đưa 3MF/OBJ qua worker; thêm **progress + cancel** (đổi protocol worker sang message tiến trình) + `AbortController` + retry; 12s watchdog phải **báo** thay vì fallback im lặng.

**B. Minh bạch (thay thế toàn bộ danh sách §1.3)**
- Parse lỗi → panel lỗi nêu lý do parser + nút "thử file khác"; **không** tạo model, **không** báo giá.
- STEP/IGES → nếu hiển thị proxy thì ghi rõ "Đây là mô hình đại diện, không phải hình học thật của bạn" + cho nhập kích thước thủ công; bỏ badge gây hiểu là đã đọc file.
- Xoá mọi số liệu bịa (sha256, score 94/76, overhang 6.8, tỉ lệ tách shell, `minWallThickness` hardcode, `invertedNormals = min(12,…)`): tính thật hoặc bỏ hẳn khỏi UI.
- Auto-fix: chỉ báo những gì thực sự làm được (clone + tính lại normals) và nói rõ giới hạn; hoặc bỏ nút cho tới khi có repair thật.
- Mesh lớn: chạy defect analysis ở worker (không bỏ qua) hoặc hiển thị "chưa phân tích được" thay vì "100% watertight".
- Modal giá vốn nội bộ: gate theo role (`admin`, `lab`); khách không thấy giá vốn/margin/form override.
- "Thẩm định thủ công": hoặc gọi API thật (lưu `quote_reviews`), hoặc bỏ.
- Bỏ nhãn "S3 Direct Upload Cache" nếu chưa upload thật.

**C. UX desktop**
- **Một** cụm điều khiển cắt lớp (giữ ở rail phải cạnh giá, xoá cụm trùng ở panel trái) → người dùng thấy giá và tham số thay đổi cùng lúc.
- Rail phải: giá sticky + breakdown "vì sao giá này" + chọn gói + lead time theo **ngày hoàn thành cụ thể** + delta giá theo % + dòng VAT + đơn vị mm cạnh giá.
- Thêm "thêm N cái → −X%" (upsell bậc tiếp theo) ngay dưới chip số lượng.
- Transform panel: sửa nhãn Y/Z, thêm nhập số + đơn vị, range position suy từ `bedDimensions`, thêm slider rotation Y/Z, hoặc bỏ `positionY`/`scaleX/Y/Z` nếu không dùng.
- Undo/redo cho transform + tham số (dùng `undoAction` sẵn có).
- Chọn 1 dropzone duy nhất; bỏ dropzone trong canvas.

**D. UX mobile (390px)**
- **Sticky price bar** dưới cùng (giá + nút "Xem báo giá") — mirror pattern đã có ở `PersonalizeView.tsx:810`; dùng `env(safe-area-inset-bottom)`.
- Đảo thứ tự: viewport → tham số chính → **giá** → panel QA → lịch sử (dưới `lg`).
- Sửa va chạm chrome: gom toolbar + preset vào **1 segmented control** duy nhất ở đáy canvas; banner OOB chuyển thành banner trong luồng (không nổi); caliper overlay chỉ hiện khi chế độ đo bật; dock plate và tooltip khác góc.
- Toolbar: cuộn ngang có affordance (chevron + gradient mép) **hoặc** thu gọn 4 nút chính + menu "⋯"; mọi nút có `aria-label`.
- Thanh slice: hiện layer height thật; cho range nhiều chỗ hơn (bỏ badge hardcode).
- Lịch sử: card list trên mobile thay vì bảng 600px.

**E. Giá & báo giá**
- **Trừ đúng giảm giá số lượng** (`volumeDiscount.discountedUnitPrice`); test bằng script đặc tả.
- Chip số lượng tới 100; bậc lấy từ `pricing_configs` (một nguồn).
- Memoize 3 phép tính; chỉ tính so sánh máy khi người dùng mở modal.
- Thống nhất 1 mô hình lead time (ưu tiên mô hình có capacity: `now + ceil(giờ×SL) + buffer`), hiển thị dạng **ngày**, kèm delta giá theo gói.
- Thêm field `tax`/`vatRate` vào quote payload; hiện dòng VAT tách bạch ở mọi nơi (quote, cart, checkout, invoice) cùng một con số.
- `CartItem` mang đủ cấu hình để cart/checkout re-quote.
- Đơn vị: chip "mm" cạnh giá; đổi sang inch phải có confirm nêu rõ ảnh hưởng giá (khôi phục `StlUnitConfirmModal` cho đúng mục đích).

**Kết quả mong đợi:** đổi máy in không mất model; parse lỗi có lỗi thật; không còn số liệu bịa nào hiển thị cho khách; giá khớp engine ở mọi bước; mobile nhìn thấy giá mà không phải cuộn hết trang; chrome trong canvas không chồng; FPS ổn định và không re-render 2Hz; VRAM không tăng sau nhiều lần upload.

---

## 2. `/cart` — CartView (467 LOC) + CartDrawer

### 2.1 Tính năng hiện có
1. Hai nhóm: file CAD số và đơn in vật lý.
2. Tăng/giảm số lượng, xoá dòng (có toast hoàn tác).
3. Promo code (`TECH3D`, `VCUBE10`, `VN3DHUB`) — logic nằm trong view.
4. Thanh tiến độ freeship (ngưỡng 300.000đ).
5. Nhãn "BƯỚC 01/03".
6. Drawer trượt song song, mở được từ mọi header.

### 2.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Mã giảm giá bị mất khi sang checkout:** cart giữ discount bằng `useState` cục bộ, không gọi store; điều hướng không kèm payload; App chỉ copy khi có payload; checkout đọc store = 0 → tổng tiền **tăng lại** ở bước cuối | `CartView.tsx:24,48,53,443`; `App.tsx:585-587`; `CheckoutView.tsx:18` | **P0** |
| 2 | Nút "−" ở số lượng 1 **xoá luôn dòng hàng** (drawer có guard, page thì không) | `CartView.tsx:284` vs `CartDrawer.tsx:227`; `App.tsx:649-652` | P1 |
| 3 | **Phí ship có 3 giá trị hardcode khác nhau**: 25.000 (`AdminStorefrontPanel`), 30.000 (`CheckoutView`), 30.000 inline (`CartDrawer`) | `AdminStorefrontPanel.tsx:638`; `CheckoutView.tsx:49`; `CartDrawer.tsx:281` | **P0** |
| 4 | Ngưỡng freeship hardcode ở nhiều nơi (300.000) | `CartView.tsx:34`, `CheckoutView.tsx:50`, `AdminStorefrontPanel.tsx:628` | P1 |
| 5 | Promo code hardcode trong view (không cấu hình được, không hết hạn, không giới hạn lượt) | `CartView.tsx:43-57` | P1 |
| 6 | Không re-quote: item không mang cấu hình nên không kiểm tra được giá còn đúng | `types/index.ts:44-70` | P1 |
| 7 | Item và logic dòng hàng **viết hai lần** (page + drawer) → lệch hành vi (guard số lượng, định dạng tiền, undo) | `CartView.tsx:270-330` vs `CartDrawer.tsx:200-260` | P2 |
| 8 | Nhãn undo hardcode tiếng Việt bất kể ngôn ngữ | `App.tsx:1174` | P2 |
| 9 | Không kiểm tra tồn kho/khả năng sản xuất trước khi checkout | — | P2 |

### 2.3 Kế hoạch tối ưu
1. `appliedDiscount` **chỉ** sống trong `useCartStore` (đã có API `setAppliedDiscount`); cart/drawer/checkout đều đọc store → hết bug mất giảm giá. Persist store (đã có `persist`) để F5 không mất.
2. Một component `CartLineItem` dùng chung cho page và drawer; guard số lượng ở một chỗ (`Math.max(1, qty-1)`).
3. **Module luật bán hàng** `src/frontend/lib/salesRules.ts` (hoặc đọc từ `site_content`/`pricing_configs`): phí ship mặc định, ngưỡng freeship, danh sách promo, thời hạn, đơn tối thiểu. Xoá mọi literal trong view/panel.
4. Hiển thị breakdown từng dòng: đơn giá × SL, phí khắc, ship, giảm giá, **VAT**, tổng — cùng con số với `/quote` và `/checkout`.
5. Re-quote khi mở cart: nếu giá thay đổi → banner "Giá đã cập nhật, xem chi tiết".
6. Kiểm tra khả năng đáp ứng (lead time, số lượng tối thiểu) trước nút thanh toán.
7. i18n cho mọi chuỗi gồm nhãn undo; empty state phân biệt "giỏ trống" và "chưa đăng nhập".

---

## 3. `/checkout` — CheckoutView (589 LOC)

### 3.1 Tính năng hiện có
1. Tracker 3 bước.
2. Guest checkout + sinh `secure_access_token` để tra cứu sau.
3. Form giao hàng (tên, SĐT, email, địa chỉ, ghi chú).
4. 3 phương thức: VietQR / VNPAY / COD.
5. Khối VAT e-invoice (công ty, MST).
6. Order summary + phí ship + giảm giá.
7. Hoàn tất: `setTimeout(900ms)` + confetti + tạo order object giả.

### 3.2 Vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **`isPaid: paymentMethod !== 'cod'`** → mọi đơn không-COD được đánh dấu **đã thanh toán** dù không có giao dịch nào | `CheckoutView.tsx:118` | **P0** |
| 2 | **Prefill PII của người lạ** làm giá trị mặc định cho khách vãng lai (tên, SĐT, email, địa chỉ, ghi chú kỹ thuật) | `:27-33` | **P0** |
| 3 | **VAT không nhất quán:** quote nói "đã gồm VAT", engine không có field thuế, checkout set `tax: 0`, invoice cộng 8% | `:116`; `QuoteSummaryPanel.tsx:460`; `InvoiceModal.tsx:18-19` | **P0** |
| 4 | Không có validate inline: chỉ `required` native, không `aria-invalid`, không `aria-describedby`; label có dấu `*` nhưng field VAT không `required` | `:238-331`, `:458-479` | P1 |
| 5 | SĐT không validate nhưng được nội suy thẳng vào cú pháp chuyển khoản → mã tham chiếu sai | `:253-259`, `:435` | P1 |
| 6 | `type="text"` cho email (không bàn phím email, không kiểm tra định dạng) | `LoginView.tsx:103`, `AuthModal.tsx:519` | P2 |
| 7 | COD "bị vô hiệu" chỉ bằng opacity + cursor; radio vẫn tới được bằng bàn phím | `:398` | P2 |
| 8 | Payment "thành công" sau 900ms bất kể phương thức; không có trạng thái "chờ thanh toán", không có hướng dẫn số tiền/đối soát | `:54-126` | **P0** |
| 9 | Số tiền VietQR không kèm amount; không có quy tắc đặt cọc (thị trường VN: ≥500k đặt 50%) | `:344-360` | P1 |
| 10 | Không có trust/guarantee trên trang (dung sai, in lại, NDA) dù research cho thấy đây là yếu tố niềm tin chính ở VN | — | P1 |
| 11 | Mất dữ liệu khi Back/refresh (funnel state không persist) | — | P1 |

### 3.3 Kế hoạch tối ưu

**Form (theo bằng chứng đã research):** mục tiêu **7–8 field**; đánh dấu **cả** field bắt buộc và không bắt buộc; **giải thích vì sao cần SĐT** ("để xác nhận đơn và giao hàng"); validate **khi blur** (nhanh hơn 7–10s so với validate khi đang gõ); lỗi **cụ thể theo field** kèm `aria-invalid` + `aria-describedby`; address autocomplete nhưng vẫn hiển thị field thường; `autocomplete` + `inputmode` đúng; không pre-tick đồng ý điều khoản. Số liệu nền: form theo guideline đạt **78% submit một lần** so với 42%; **34%** người bắt đầu form không hoàn thành.

**Thanh toán (giữ sample theo quyết định, nhưng trung thực):**
- Trạng thái đơn mới: `paymentStatus: 'awaiting_payment' | 'paid' | 'cod' | 'cancelled'`; bỏ `isPaid` tự động.
- VietQR: sinh ảnh QR **có số tiền** (`img.vietqr.io` style), nội dung chuyển khoản = mã đơn (không phải SĐT), kèm nút "Tôi đã chuyển khoản" (đánh dấu chờ xác nhận) và ghi rõ "đơn sẽ được xác nhận sau khi nhận được tiền".
- COD: hiển thị rõ điều kiện + phí (nếu có), bỏ kiểu "disable bằng opacity".
- Quy tắc đặt cọc: hiển thị theo ngưỡng cấu hình (mặc định ≥500.000đ đặt 50%).
- Nhãn **"Thanh toán mô phỏng"** ở môi trường demo để không gây hiểu nhầm là đã thanh toán.
- Thiết kế sẵn `paymentProvider` interface để sau này cắm payOS/webhook mà không phải viết lại checkout.

**VAT:** thêm `tax`/`vatRate` vào payload; hiển thị 1 dòng VAT ở quote → cart → checkout → invoice với **cùng một con số** lấy từ config. Field MST dùng được API tra cứu MST (tuỳ chọn, roadmap).

**Khác:** trust badges (dung sai ISO 2768, in lại nếu lỗi kỹ thuật, NDA bảo mật CAD); persist draft đơn hàng (localStorage) để Back/refresh không mất; bỏ `alert()`, dùng toast + `role="alert"` cho lỗi; order summary hiện lead time theo ngày và phí ship duy nhất từ `salesRules`.

---

## 4. `/order-success` + `/order-success/:orderId` — OrderSuccessView

**Hiện có:** xác nhận, mã đơn, các bước tiếp theo, CTA theo dõi, CTA "Kho tệp CAD", CTA camera xưởng, in hoá đơn.
**Vấn đề:**

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **CTA "THEO DÕI CAMERA XƯỞNG IN 3D"** — không tồn tại camera nào trong repo | `OrderSuccessView.tsx:151` | **P0** (hứa sai) |
| 2 | URL đơn sai vẫn render đơn khác (fallback `orders[0]`/`activeOrder`/`MOCK_ORDERS[0]`) | `App.tsx:191,210`; `OrderTrackingView.tsx:23` | **P0** |
| 3 | CTA "Mở Kho Tệp CAD" đẩy khách vãng lai vào tường đăng nhập không giải thích ('assets' không nằm trong `publicScreens`) | `App.tsx:519-536`; `OrderSuccessView.tsx:134` | P1 |
| 4 | Không i18n; tiền tệ luôn `vi-VN` | `:39`, `:189` | P2 |

**Tối ưu:** bỏ CTA camera; thay bằng "bước tiếp theo" trung thực (trạng thái thanh toán → xếp hàng sản xuất → dự kiến hoàn thành); nút theo dõi + nút **gửi Zalo**; nút "Thêm vào lịch" (ICS); nếu chưa đăng nhập thì giải thích rõ vì sao cần tài khoản + cho tra cứu bằng mã; i18n + định dạng theo ngôn ngữ.

---

## 5. `/tracking` + `/tracking/:orderId` — OrderTrackingView (453 LOC)

**Hiện có:** timeline 8 bước (`OrderProgress`), "digital twin" 3D, panel telemetry máy in, cổng tra cứu cho khách, ETA.
**Vấn đề:**

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Telemetry giả:** "Đầu đùn 220°C • Bàn nhiệt 60°C • Tốc độ 250 mm/s" và "Lớp cắt 384/600" là hằng số | `OrderTrackingView.tsx:297-299`, `:306` | **P0** |
| 2 | Đơn không tồn tại vẫn hiển thị đơn mẫu (kèm tên/địa chỉ/carrier giả) | `:23`; `App.tsx:210` | **P0** |
| 3 | Timeline 8 bước là cấu trúc tĩnh, không có event thật từ sản xuất | `OrderProgress.tsx:13-21` | P1 |
| 4 | Mount thêm 1 vòng render WebGL (digital twin) không pause khi off-screen | `:340`; `ThreeModelViewer.tsx:280-287` | P2 |
| 5 | Không i18n (kể cả thông báo lỗi tra cứu) | `:124,157,269` | P2 |

**Tối ưu:** dựng **`order_events`** (migration mới) và timeline đọc từ đó; chỉ hiển thị dữ liệu máy khi đơn đã gán máy in thật (`workshop_machines`), nếu không hiển thị trạng thái trung tính; bỏ digital twin hoặc lazy-load; tra cứu bằng token + thông báo rõ khi sai; thêm đăng ký nhận cập nhật qua **Zalo ZNS/SMS** (roadmap) — kèm nút "Bật thông báo".

---

## 6. `/orders` — MyOrdersView (471 LOC)

**Hiện có:** danh sách đơn, 7 tab lọc theo trạng thái, chi tiết đơn, modal bảo hành/khiếu nại, hoá đơn.
**Vấn đề:**

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Dữ liệu đơn là fixture:** `App.tsx` seed `useState(MOCK_ORDERS)` và **không bao giờ gọi** `dbService.getOrders` (hàm này cũng không có `limit`) | `App.tsx:263`; `database.ts:337` | **P0** |
| 2 | Hoàn toàn không i18n (0 `t()`, 0 ternary): tiêu đề, 7 tab, toàn bộ modal | `MyOrdersView.tsx:132`, `:37-45`, `:361-462` | P1 |
| 3 | Modal bảo hành không Escape, không `role="dialog"`, không khoá scroll | `:354-356` | P2 |
| 4 | Không phân trang (đơn thật sẽ dài), không tìm kiếm/lọc theo ngày | — | P2 |
| 5 | Không có "đặt lại" (re-order) hay tải file CAD đã mua | — | P1 |

**Tối ưu:** đọc đơn thật từ `dbService.getOrders` (thêm `limit`/`range`, order theo `created_at`), phân trang; i18n; modal qua primitive; thêm **Đặt lại đơn** (clone cấu hình vào giỏ) và **Tải file** (signed URL) — hai tính năng tăng giá trị vòng đời cao nhất; phân biệt rõ "đang sản xuất / đã giao / đã huỷ".

---

## 7. `/assets` — AssetLibraryView

**Hiện có:** thư viện file đã mua, chip lọc, xem trước, tải về.
**Vấn đề:**

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Không tải được file:** bucket `cad-files` là private, policy chỉ admin, và `createSignedUrl` **không có call site nào** trong repo | `create_products:128`; `database.ts:211`; audit grep `createSignedUrl` = 0 | **P0** |
| 2 | Không có empty state: `filteredAssets.map()` render thẳng, tìm không ra thì trang trắng | `AssetLibraryView.tsx:86-144` | P1 |
| 3 | Palette "editorial" phá brand (nền `#F7F6F2`, chữ `#1C1C1C`) | `:36-184` | P2 |
| 4 | Không hiển thị nội dung license (thương mại/cá nhân), hạn, số lượt tải | — | P1 |
| 5 | Mount thêm 1 viewer WebGL | `:165` | P2 |

**Tối ưu:** implement **signed URL download** (Supabase Storage) + hiển thị license/điều khoản theo từng file + empty state + token hoá + sắp xếp/tìm kiếm + tải nhiều file (zip) nếu cần; lazy viewer.

---

## 8. Bảng ưu tiên nhóm giao dịch

| Ưu tiên | Việc | Trang | Effort |
|---|---|---|---|
| P0 | Trừ đúng giảm giá số lượng | `/quote`, cart | S |
| P0 | Ẩn modal giá vốn/override khỏi khách | `/quote` | S |
| P0 | Parse lỗi → lỗi thật (bỏ model giả + toast thành công) | `/quote` | M |
| P0 | Bỏ số liệu mesh bịa (sha256, score, overhang, auto-fix, split shell, watertight bypass) | `/quote` | M |
| P0 | Đổi máy in không mất model + sửa deps effect build | `/quote` | M |
| P0 | Sửa rò VRAM + `setFps` trong rAF | `/quote` | M |
| P0 | Giữ mã giảm giá qua checkout | `/cart`, `/checkout` | S |
| P0 | Bỏ prefill PII; bỏ `isPaid` tự động; thống nhất VAT | `/checkout` | M |
| P0 | Bỏ CTA camera; xử lý đơn không tồn tại; bỏ telemetry giả | `/order-success`, `/tracking` | M |
| P0 | Đọc đơn thật + tải file CAD bằng signed URL | `/orders`, `/assets` | M |
| P1 | Sticky price bar + sửa va chạm chrome + gộp cụm điều khiển | `/quote` | L |
| P1 | Progress/cancel/retry cho parse; 3MF/OBJ qua worker | `/quote` | L |
| P1 | Transform panel đúng (Y/Z, nhập số, đơn vị, range theo bed) + undo/redo | `/quote` | M |
| P1 | Draft persistence cho cấu hình & form checkout | `/quote`, `/checkout` | M |
| P1 | Breakdown giá + lead time theo ngày + upsell bậc số lượng | `/quote` | M |
| P1 | Một nguồn luật bán hàng (ship/freeship/promo) | `/cart` | S |
| P1 | i18n cho orders/tracking/success | nhiều | M |
| P2 | Hợp nhất `CartLineItem`; card list thay bảng trên mobile | `/cart` | M |
| P2 | Vá WebGL context loss + ErrorBoundary mở rộng | cả nhóm | M |

---

## 9. Bổ sung từ vòng kiểm QA (đã xác minh)

**`/tracking` (làm rõ thêm §5):**
- Tra cứu khách hiện **không bắt buộc mã xác thực**: nhánh `localStorage` và nhánh `MOCK_ORDERS` trả `true` cho bất kỳ đơn nào khớp mã (`OrderTrackingView.tsx:97`, `:116`) → chỉ cần mã đơn là xem được PII của người khác. Phải bắt buộc mã xác thực (hoặc RPC token) và bỏ 2 fallback mock/localStorage.
- Truy vấn DB cho tra cứu khách **nội suy tham số vào filter `.or()`** (`database.ts:418`) → rủi ro chèn filter; chuyển sang RPC `get_order_by_guest_token` (đã có sẵn).

**`/checkout` (thêm vào §3.2):** không có guard giỏ rỗng, nút submit không chống gửi 2 lần (`S10` ở `06-supabase-vercel.md` §1.6).

**Deep-link (thêm vào `04-pages-account-admin.md` §3.2):** `/admin/machines`, `/admin/inventory`, `/admin/orders` mở đúng panel nhưng **sai tab con**; `/designer/:tab` bỏ qua tham số → link chia sẻ mở sai ngữ cảnh.

**`/assets`:** nút tải file hiện chỉ là toast (chưa có tải thật) — khớp với phát hiện S7 (bucket private, không có `createSignedUrl`). Tải thật là điều kiện để trang này có nghĩa.

---

## 10. Bổ sung từ `docs/design/data-honesty.md` (69 phát hiện: 17 Critical · 28 High · 24 Medium)

Ba phát hiện **chưa có trong các mục trên** và cần xử lý ở Phase 3:

| # | Phát hiện | Bằng chứng | Mức |
|---|---|---|---|
| 1 | **Mọi người dùng đã đăng nhập đều thấy PII của một khách hàng mẫu trong `/orders`:** `App.tsx` seed `orders` từ `MOCK_ORDERS` và **không bao giờ gọi** `dbService.getOrders()` | `App.tsx:263`; `database.ts:337` (0 caller) | **P0** |
| 2 | **Hoá đơn luôn tự nhận "đã thanh toán":** `InvoiceModal` tự cộng VAT 8%, luôn in "✓ ĐÃ THANH TOÁN", in một "chữ ký số" SHA-256 hardcode và mã số thuế công ty hardcode | `InvoiceModal.tsx:17-19,82-84,150` | **P0** (chứng từ sai) |
| 3 | **Form bảo hành prefill một số đo bịa** (`+0.12mm`) trong khi `OrderProgress` mặc định 64% tiến độ | `MyOrdersView.tsx:78`; audit | P1 |

**Đề xuất "demo mode" của tài liệu đó (nên áp dụng):** một cờ duy nhất `VITE_VCUBE_DEMO_MODE` (đọc qua `src/config/demoMode.ts`) + **badge hiển thị thường trực** trên 11 surface dùng dữ liệu mẫu, thay vì để fixture trà trộn với dữ liệu thật. Việc này cho phép giữ nội dung demo cho sales mà không lừa người dùng.
