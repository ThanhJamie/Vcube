# Đợt 8C — nốt dữ liệu bịa mà gate **mở rộng** vừa tìm ra + hệ quả MP-01/07/08

Luật môi trường/gate: `docs/plans/agent-brief.md` (**§2.1 encode-first · §4.1 · §4.2 retry+build tĩnh · §4.3 cấm ghi DB bịa**).

## 0. Gate đã được mở rộng — và chính nó tìm ra đợt này

Gate `scripts/check-fabricated.mjs` trước chỉ biết **một** mã bịa (`0108924881`), nên **bỏ sót** số tài khoản/MST bịa khác. Coordinator đã thêm 2 rule:
- `fake-financial-id` — dãy 9–16 chữ số **trong chuỗi hiển thị** (bỏ qua URL ảnh Unsplash + hash hex + dòng code kiểu `purchasePrice: 115000000`)
- `fake-legal-entity` — tên pháp nhân hardcode (`CÔNG TY CP/TNHH … VCUBE`)

**Kết quả chạy gate mở rộng: 6 vi phạm thật, 0 dương tính giả.**

| File:line | Nội dung | Vì sao nghiêm trọng |
|---|---|---|
| `src/frontend/views/CheckoutView.tsx:463` | `Số tài khoản: ` **`1029384756`** | **Khách đang được hiển thị một số tài khoản ngân hàng bịa ở bước thanh toán** |
| `CheckoutView.tsx:464` | `Chủ tài khoản: ` **`CONG TY CP CONG NGHE VCUBE 3D`** | Tên pháp nhân hardcode |
| `CheckoutView.tsx:515` | `placeholder="0109876543"` | MST bịa gợi ý cho người dùng |
| `src/backend/services/workshopService.ts:285` | `'Techcombank - 19033488291012 - HOANG BACH'` | Số TK bịa + **tên người (PII)** |
| `workshopService.ts:303` | `'MB Bank - 0988112233 - LE MINH TRI'` | Số TK bịa + **PII** |
| `workshopService.ts:316` | `'0101778163'` | MST bịa |

**Nguồn thật đã có sẵn trong DB — dùng nó, đừng bịa:** `app_settings` có đúng các cột cần: `bankAccount`, `bankName`, `legalName`, `taxCode`, `invoiceAddress`, `hotline`. Đọc qua `settingsService.settingsAccessors.appSettings()` + `subscribeSettings()` (agent N2/V1/N3 đã dùng cách này; **không sửa** `settingsService.ts`, **không phụ thuộc** `hooks/useSettings.ts`).
**Rỗng ⇒ ẩn cả khối/dòng, KHÔNG in `—` vào câu như "Số tài khoản: —"** và **không** in số bịa nào.

---

## Q1 — CheckoutView + workshopService: hết định danh tài chính bịa

**File được giao:** `src/frontend/views/CheckoutView.tsx` · `src/backend/services/workshopService.ts`.

**Việc:**
1. `CheckoutView.tsx` khối chuyển khoản (`~:455-470`): `Số tài khoản` / `Ngân hàng` / `Chủ tài khoản` **đọc từ `app_settings`** (`bankAccount`, `bankName`, `legalName`). Giá trị nào rỗng ⇒ **bỏ dòng đó**; cả 3 rỗng ⇒ hiện trạng thái trung thực kiểu *"Chưa cấu hình thông tin chuyển khoản — liên hệ VCUBE"* + CTA tới `/admin` **nếu** người xem là admin.
2. `CheckoutView.tsx:515` `placeholder="0109876543"` ⇒ placeholder **trung tính** (ví dụ `"Nhập mã số thuế"`), không nêu số cụ thể.
3. `workshopService.ts` `:285`, `:303`, `:316`: bỏ/để rỗng định danh bịa và **PII tên người** (`HOANG BACH`, `LE MINH TRI`). Đây là fixture seed — theo đúng cách A10/O1 đã làm: **giữ nguyên tên trường + type**, giá trị về rỗng/`null` + comment ghi mã finding trong `docs/design/data-honesty.md` và ghi rõ nguồn thật (`app_settings`).
4. Grep lại `workshopService.ts` tìm **mọi** số điện thoại/PII còn lại (`:88` `0905.789.101`, `:104` `0912.345.678`, `:321` `phone: '0988.777.666'`) ⇒ cùng nguyên tắc. Báo cáo rõ bạn đã xử lý những dòng nào.

**Gate:** lint · build outDir riêng · contrast · **`node scripts/check-fabricated.mjs` phải = 0 ở 2 file này**.
**Playwright** (build tĩnh + `vite preview` cổng riêng, **retry ≤3**, không seed/ghi DB): mở `/checkout` khi (a) `app_settings` rỗng ⇒ **0** số tài khoản/tên pháp nhân bịa trong DOM, hiện trạng thái trung thực; (b) `page.route()` fixture có `bankAccount/bankName/legalName` ⇒ in **đúng** giá trị fixture. 0 `pageerror`. Ảnh `pwtest/q1/`.

---

## Q2 — Tool3DView MP-01/MP-07/MP-08 + SKU bịa + icon sai trạng thái

**File được giao:** `src/frontend/views/Tool3DView.tsx` · `src/frontend/components/tool3d/ValidationReportPanel.tsx` · `src/frontend/views/DesignerDashboardView.tsx` · `src/frontend/components/admin/AdminProductsPanel.tsx`.

### MP-01 (Critical) — parse lỗi thì **bịa nguyên một mô hình**
`Tool3DView.tsx` ~`:203-256` nhánh `catch`: tạo `recoveryFile: AnalysisFile` với số liệu phôi **85×55×30 · volume 42.5 · triangleCount 14200 · isWatertight: true · sha256Hash literal** và render `new THREE.BoxGeometry(85,30,55)`, kèm toast *"Đã tự động khởi tạo mô hình CAD phôi an toàn"*.
⇒ **Đây là dữ liệu bịa tệ nhất còn lại**: khách tải file lỗi nhưng lại thấy một "mô hình hợp lệ, kín, 14200 tam giác" — tức **hệ thống nói dối về chính tệp của khách**.
**Hướng sửa:** parse lỗi ⇒ hiện **trạng thái lỗi trung thực** (thông báo vì sao không đọc được tệp + hành động: thử lại / đổi định dạng / gửi yêu cầu thẩm định thủ công). **Không** dựng mô hình thay thế, **không** bịa số. Nếu vẫn muốn có placeholder 3D thì nó phải hiển thị **rõ là mô hình minh hoạ**, không kèm bất kỳ số đo nào.

### MP-08 (High) — auto-repair ghi số bịa
`Tool3DView.tsx:483-505`: sau khi "sửa lưới" vẫn gán `isWatertight: true`, `nonManifoldEdges: 0`, `minWallThickness: 1.6`, `printabilityScore: 98`; toast `~:527` khẳng định *"đã sửa xong toàn bộ lỗi Non-manifold và Vector pháp tuyến"*.
⇒ Chỉ được gán giá trị **suy từ số đo thật sau khi sửa**, hoặc ghi `null`/`unknown` + nói rõ "chưa đo lại". **Không** khẳng định đã sửa xong nếu không đo lại.

### MP-07 (High) — `6.8` bịa
`Tool3DView.tsx:156` `overhangPercentage: 6.8` và `:1046` `?? 6.8` ⇒ ảnh `/quote` hiện *"6.8% cần Support"* dù chưa đo.
⇒ Suy từ dữ liệu hình học thật, hoặc `null` ⇒ hiện **"Chưa đo"** (không in `6.8%`).

### Việc nhỏ cùng nhóm
- `DesignerDashboardView.tsx:1448` `SKU: {previewProduct.sku || 'VC-8921'}` ⇒ `|| '—'` (khớp mẫu trung thực đã thống nhất ở `HomeView`, `ProductDetailView`, `PersonalizeView`, `AccessoriesManager`).
- `ValidationReportPanel.tsx:227-229` đang render icon `verified` + `text-positive` **cả khi KHÔNG kín** ⇒ lỗi thị giác nói ngược dữ liệu; sửa để trạng thái "không kín" dùng icon/màu cảnh báo.
- `AdminProductsPanel.tsx`: form **không có ô nhập `features`** ⇒ sản phẩm mới luôn `features: []` và fallback `:84` không tới được. Thêm ô nhập (mỗi dòng một tính năng) — nếu thấy vượt phạm vi thì **báo lại**, đừng để mảng rỗng im lặng.

**KHÔNG sửa** `src/utils/meshParser.ts` (chỉ báo nếu thấy bịa ở đó). **KHÔNG** đụng `ExploreView.tsx` (P3), `App.tsx`/`Header.tsx`/`HomeView.tsx` (P1), `AdminSidebar.tsx`/`AdminDashboardView.tsx`/`groups/**` (P2), `PricingConfigPanel.tsx`/`WorkshopEstimatorBOM.tsx` (O2b), `CheckoutView.tsx`/`workshopService.ts` (Q1), `index.css`, `ui/**`.

**Gate:** lint · build outDir riêng · contrast · `node scripts/check-fabricated.mjs` = 0 ở 4 file của bạn.
**Playwright** (build tĩnh + preview cổng riêng, retry ≤3, không ghi DB; script mẫu `pw-a22a-tool3d.cjs` đã có khung upload STL thật, file mẫu `a22a-cube.stl`):
- `/quote` upload **STL hợp lệ** ⇒ 0 chuỗi `14200`, `85×55×30`, `6.8`, `98`; trạng thái kín hiện **theo số đo thật**.
- `/quote` upload **file rác** (ví dụ `.stl` chứa text) ⇒ **không** hiện mô hình 85×55×30, **không** hiện "14200 tam giác", có thông báo lỗi trung thực; 0 `pageerror`.
- Ảnh `pwtest/q2/` (cả 2 kịch bản).

---

## 9. Ranh giới chung Đợt 8C
- Đang chạy song song: **P1 · P2 · O2b** (từ Đợt 8) + **Q1 · Q2** (đợt này). Tập file không giao nhau.
- Playwright: **build tĩnh + `vite preview` CỔNG RIÊNG**, retry ≤3, **không `pkill` tiến trình agent khác** (dev :3000 và các preview :4181/:4185/:4186 đang phục vụ agent khác), tắt server của mình + xoá outDir khi xong.
- **Cấm ghi dữ liệu bịa lên DB production** (§4.3). Nghiệm thu bằng `page.route()` fixture.
- Không `git commit/push/checkout/stash/restore`; không thêm dependency; không in secret.

## 10. Chờ chủ dự án chốt (không giao ai)
| # | Việc | Vì sao cần chốt |
|---|---|---|
| 1 | `CadQuickViewModal.tsx:293` `product.licenseType \|\| 'Commercial License'` | P4 cố ý **không** sửa: đây là **quyết định nghiệp vụ** về giấy phép mặc định, không có mẫu trung thực sẵn |
| 2 | Màn xem `setting_audit` + chuẩn hoá nhãn khoá camelCase/snake_case | cần IA admin |
| 3 | Widget chat `TRỢ LÝ TỰ ĐỘNG` đè nội dung ở `/explore`, `/admin`, thẻ cuối của lưới | P3 và P2 đều báo; cần chốt vị trí |
| 4 | `designer` chưa publish: `DesignerDashboardView` vẫn `status:'Published'` + ảnh stock (AT-07) | quyết định nghiệp vụ |
