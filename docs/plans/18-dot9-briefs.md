> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# Đợt 9 — nối cấu hình vào giá · `meshParser` · chrome còn lại

Luật môi trường/gate: `docs/plans/agent-brief.md` (**§2.1 encode-first · §4.1 · §4.2 retry + build tĩnh · §4.3 cấm ghi DB bịa**).

## 0. Số đo nền — gate tổng hợp lần 4 (2026-09-12 22:52, merge P1+P2+O2b+Q1+Q2)

`lint` **RC=0** · `build` **RC=0** · `check-contrast` **RC=0** · **`check-fabricated` SẠCH 0/116 file** · `lint-rls-sources` **RC=0** · `lint-rls-migration` **RC=0**.
palette thô **0** · white/black **0** · hex trong class **0** · chữ <12px **0** · emoji cờ **0** · `font-serif` **0** · jargon `GROUP n` **0** · `role_select` **0** · `Math.random` trong admin **0** · `htmlFor` **78** / `<input>` **173** · CSS build **107.435 B** · `index.js` **752,7 kB** (gzip 196,5) · `src` LOC **52.495** · `pwtest/` **không còn trong repo** (đã chuyển bằng chứng ra ngoài + thêm `.gitignore`).

**Việc còn lại của giai đoạn này** (đo được, không suy đoán):

| # | Việc | Bằng chứng |
|---|---|---|
| 1 | **VAT + điện/nhân công chưa nối vào giá** | `pricingEngine` đọc `pricingGlobal` = **0**; `VAT_RATE = 0.08` cứng; **0/4** file funnel đọc `pricingGlobal`. Panel admin ghi được nhưng **không ai đọc** ⇒ trang trí. **Chủ dự án đã chốt: nối cả hai.** |
| 2 | 🔴 **`src/utils/meshParser.ts` vẫn bịa và số bịa đó NUÔI GIÁ** | `BoxGeometry(85` ×2 · `B-Rep Solid CAD` ×1 · `isWatertight: true` ×4 · `\|\| 10000` ×1. Q2 đã **đo thật**: upload 1 `.stl` chứa text ⇒ UI hiện **`85.0 × 60.0 × 32.0 mm / 12 Triangles / 163.2 cm³`** ⇒ **thể tích bịa đi thẳng vào báo giá** |
| 3 | Widget chat đè nội dung | `src/App.tsx:1199-1210` (P2 chỉ ra). **Chủ dự án đã chốt: chừa chỗ, không che nút.** |
| 4 | `licenseType` mặc định | `CadQuickViewModal.tsx:293` `\|\| 'Commercial License'`. **Chủ dự án đã chốt: `—` khi chưa khai báo.** |
| 5 | Copy "tự phục hồi" còn sót | `CanvasErrorBoundary.tsx:66` *"Không Gian 3D Đang Tự Động Phục Hồi"* |

---

## R1 — Nối `pricing_global_settings` vào giá + bản xem trước tác động

**File được giao:** `src/frontend/lib/vat.ts` · `src/frontend/views/CheckoutView.tsx` · `src/frontend/views/CartView.tsx` · `src/frontend/components/CartDrawer.tsx` · `src/frontend/components/InvoiceModal.tsx` · `src/utils/pricingEngine.ts` · `src/frontend/components/admin/PricingConfigPanel.tsx`.

**⚠️ Ràng buộc tiền — đọc kỹ trước khi sửa:**
- **KHÔNG đổi công thức pricing**: không đổi hệ số, thứ tự tính, cách làm tròn, đơn vị. **Chỉ đổi NGUỒN của các tham số** (hằng số cứng → `pricing_global_settings`).
- **Rỗng = chưa cấu hình, KHÔNG mặc định.** `vat_percent` NULL ⇒ **không in dòng VAT** (không in 0%, không in 8%, không in `—`). Điện/nhân công NULL ⇒ **không được** im lặng rơi về hằng số bịa; phải chặn bước tính và nói rõ thiếu gì (đọc `src/backend/services/settingsService.ts` để biết API + `ValidationIssue`).
- **🔴 Trạng thái DB thật hiện tại (coordinator đo):** `pricing_global_settings` **vẫn** là `vat_percent=8 · electricity_rate_vnd=2850 · labor_hourly_rate_vnd=65000`. Đây là **giá trị default bịa cũ** mà migration `20260901` được thiết kế để `drop default` + chuẩn hoá về `NULL`, **nhưng chủ dự án CHƯA dán lại `supabase/scripts/apply_all_manual.sql`**. ⇒ Khi viết code, hãy code đúng theo hợp đồng **NULL = chưa cấu hình**; **đừng** coi `8/2850/65000` là giá trị có thẩm quyền, và **đừng** xoá hàng đó (đó là ghi production ⇒ chỉ chủ dự án làm). Ghi rõ phát hiện này trong báo cáo.
- VAT phải **nhất quán toàn funnel** (`/quote` → `/cart` → `/checkout` → hoá đơn): cùng một tỉ lệ, cùng cách làm tròn. Hiện `lib/vat.ts` là "một câu chuyện VAT duy nhất" — giữ vai trò đó, chỉ đổi nguồn tỉ lệ.
- Trong hoá đơn: `InvoiceModal` **đã** đọc `app_settings` cho MST/hotline/pháp nhân (agent N3). Giữ nguyên; chỉ đổi nguồn VAT.

**Việc:**
1. `lib/vat.ts`: bỏ `VAT_RATE = 0.08` làm **mặc định ngầm**. Cho `computeVat`/`vatLabel` nhận tỉ lệ **tường minh**; không có tỉ lệ ⇒ trả về "chưa cấu hình" để caller ẩn dòng VAT. Giữ hàm thuần, dễ test.
2. 4 call site (`CheckoutView`, `CartView`, `CartDrawer`, `InvoiceModal`): đọc `pricing_global_settings.vat_percent` qua `settingsService` (`settingsAccessors` + `subscribeSettings`, và `getPricingGlobalSettings()` nếu cache rỗng — xem cách `InvoiceModal` đang làm với `app_settings`). NULL ⇒ **ẩn dòng VAT** và nói rõ "VAT chưa được cấu hình".
3. `pricingEngine.ts`: `electricity_rate_vnd` + `labor_hourly_rate_vnd` đọc từ cùng bảng; NULL ⇒ **chặn tính giá** với thông báo trung thực (không rơi về `DEFAULT_INKIRI_FORMULA_CONFIG` cho 2 tham số này — ghi chú `settingsService` nói rõ việc chọn thuộc về bên gọi, và đây chính là lúc chọn).
4. **Bản xem trước tác động** trong `PricingConfigPanel`: khi admin sửa VAT/điện/nhân công, hiện **một ví dụ tính thật** (ví dụ 1 chi tiết mẫu cố định: khối lượng + giờ máy + giờ nhân công) với giá trị **đang gõ**, cạnh giá trị **đang lưu**, để thấy chênh lệch trước khi bấm lưu. Không bịa số: ví dụ phải ghi rõ là ví dụ minh hoạ với tham số hiển thị.
5. Ô nhập nào chưa có `<label htmlFor>` thì bổ sung.

**Gate:** lint · build outDir riêng · contrast · `check-fabricated` = 0 ở 7 file.
**Playwright (build tĩnh + `vite preview --host 0.0.0.0` cổng riêng, Edge gọi IP WSL, retry ≤3, KHÔNG ghi DB):**
- **RED** (hoàn nguyên từ backup): `vat_percent` NULL mà funnel vẫn in `VAT (8%)` ⇒ chứng minh hằng số cứng đang quyết định.
- **GREEN**: NULL ⇒ **0 dòng VAT** ở `/cart`, `/checkout`, `/quote` và hoá đơn, kèm câu giải thích; `page.route()` fixture `vat_percent=10` ⇒ in **VAT (10%)** và **số tiền đúng** ở **cả 4 chỗ** (cùng một số).
- `page.route()` fixture điện/nhân công ⇒ giá tính **đúng**; NULL ⇒ **chặn** + thông báo thiếu gì (0 báo giá, không số bịa).
- 0 `pageerror`. Ảnh `pwtest/r1/`.

---

## R2 — `meshParser.ts`: hết số bịa nuôi giá (đây là nguồn bịa lớn cuối cùng)

**File được giao:** `src/utils/meshParser.ts` · `src/types/index.ts`.

**Vì sao đợt này quan trọng nhất:** Q2 đã **đo thật** — upload một `.stl` chứa text, `meshParser` **không ném lỗi** mà thay bằng `new THREE.BoxGeometry(85, 32, 60)` và UI hiện **`85.0 × 60.0 × 32.0 mm / 12 Triangles / 163.2 cm³`**. Thể tích đó **đi thẳng vào báo giá**. Q2 đã chặn ở tầng view (`findFileStructureProblem` trong `Tool3DView`), nhưng **gốc vẫn nằm ở `meshParser.ts`** — và mọi đường khác gọi `meshParser` vẫn dính.

**Việc — theo mã MP mà Q2 liệt kê:**
| Mã | Vấn đề |
|---|---|
| MP-03 | `STLLoader` lỗi ⇒ **thay bằng hộp 85×32×60** thay vì ném lỗi |
| MP-02 | STEP/IGES trả **"B-Rep Solid CAD" 92×72×34 + volume 54.2 + `isWatertight: true`** |
| MP-05 | volume/surface **suy từ bbox** bằng hệ số ×0.45/0.42/0.40/0.30 rồi **đem đi báo giá** |
| MP-06 | per-part `triangleCount \|\| 10000` |
| MP-10 | `invertedNormalsCount = min(12, boundaryEdges)` ⇒ nhãn "Vector Pháp Tuyến Nghịch" thực chất là **số biên hở** |
| MP-12/13 | 3MF/OBJ hardcode `isWatertight: true`, `minWallThickness 1.5/1.8`, filament `\|\| 42.7g`, `'45m'` |
| MP-17 | các hardcode còn lại trong file |

**Nguyên tắc:** parse không được ⇒ **ném lỗi / trả `null` có kiểu**, để tầng trên hiện trạng thái trung thực. Đại lượng **không đo được** ⇒ `null`, **không** suy từ bbox rồi trình bày như số đo; nếu buộc phải ước lượng thì phải **ghi rõ là ước lượng** và **không** dùng nó làm đầu vào giá.
**`src/types/index.ts`:** nới `PrintabilityAnalysis.overhangPercentage` (và các trường tương tự mà R2 làm thành nullable) thành `number | null` để Q2 bỏ được ép kiểu cục bộ trong `Tool3DView` (Q2 đã ghi chú việc này). **Chỉ nới kiểu cho các trường thật sự nullable** — đừng nới tràn lan.

**Gate:** lint (**RC=0 là bằng chứng kiểu đã khớp**) · build outDir riêng · contrast · `check-fabricated` = 0 ở 2 file.
**Grep chứng minh:** `BoxGeometry(85`, `B-Rep Solid CAD`, `isWatertight: true`, `|| 10000`, hệ số `* 0.4x` suy thể tích ⇒ **0** (hoặc liệt kê từng dòng còn lại kèm lý do có nguồn đo thật).
**Playwright (build tĩnh, retry ≤3, không ghi DB; dùng lại khung `pw-q2-tool3d.cjs` + `a22a-cube.stl`):**
- STL thật (khối 20mm) ⇒ số đo **đúng** (20.0×20.0×20.0, 8.0 cm³, 12 tam giác), điểm suy từ số đo.
- **Tệp rác** ⇒ **panic/không có số nào** ở tầng parser (không hộp 85×32×60), view hiện panel lỗi; **`/quote` không tạo báo giá** từ tệp không đọc được.
- STEP/IGES **không có dữ liệu thật** ⇒ **không** hiện 92×72×34 / volume 54.2.
- Lưới hở thật (11 tam giác) ⇒ vẫn "không kín", điểm thấp, **không** tự nhảy lên 98.
- 0 `pageerror`. Ảnh `pwtest/r2/`.
⚠️ **R2 làm thay đổi số đo ⇒ thay đổi giá.** Điều đó là **đúng** (số bịa → số thật), nhưng phải **nêu rõ trong báo cáo** những chỗ giá sẽ đổi và đổi vì sao. KHÔNG đổi công thức.

---

## R3 — Chrome còn lại: widget chat + giấy phép mặc định + copy "tự phục hồi"

**File được giao:** `src/App.tsx` · `src/frontend/components/CadQuickViewModal.tsx` · `src/frontend/components/CanvasErrorBoundary.tsx`.

1. **Widget chat `TRỢ LÝ TỰ ĐỘNG`** (`src/App.tsx:1199-1210`) — chủ dự án chốt: **chừa chỗ, không che nút**. P3 và P2 cùng báo nó che **nút thứ 3 của thẻ cuối** trên `/explore` và đè nội dung `/admin`. Yêu cầu: nút/link ở đáy trang **không bao giờ** bị FAB che ở `390px`, `1024px`, `1440px` trên `/explore`, `/admin`, `/cart`. Cách làm hợp lý: chừa padding-bottom cho vùng nội dung khi FAB hiện (hoặc đặt FAB trong luồng có chỗ riêng). **Kiểm bằng hình học**, không bằng cảm giác: đo `boundingBox` của FAB và của nút cuối, assert **không giao nhau**.
2. `CadQuickViewModal.tsx:293` `product.licenseType || 'Commercial License'` ⇒ **`—`** khi chưa khai báo (khớp mẫu trung thực đã thống nhất ở `HomeView`/`ProductDetailView`/`PersonalizeView`/`DesignerDashboardView`/`AccessoriesManager`). **Không** hứa một loại giấy phép chưa ai khai báo.
3. `CanvasErrorBoundary.tsx:66` bỏ chuỗi *"Không Gian 3D Đang Tự Động Phục Hồi"* ⇒ mô tả đúng việc đang xảy ra (ví dụ "Không dựng được khung 3D — thử tải lại"), không hứa "tự phục hồi" nếu không có cơ chế phục hồi thật.

**Gate:** lint · build outDir riêng · contrast · `check-fabricated` = 0 ở 3 file.
**Playwright (build tĩnh, retry ≤3):** đo `boundingBox` FAB vs nút cuối ở **3 kích thước × 3 route** (`/explore`, `/admin`, `/cart`) ⇒ **0 giao nhau**; `licenseType` rỗng ⇒ hiện `—`; 0 `pageerror`. Ảnh `pwtest/r3/`.

---

## 9. Ranh giới chung Đợt 9
- Đang chạy song song: **R1 · R2 · R3**. Tập file **không giao nhau**.
- **Công thức pricing bất khả xâm phạm** — R1 chỉ đổi **nguồn tham số**, R2 chỉ đổi **số đo**, không ai đổi công thức/hệ số/thứ tự tính.
- **Cấm ghi dữ liệu bịa lên DB production** (§4.3). Nghiệm thu bằng `page.route()` fixture. Hàng `pricing_global_settings` hiện có `8/2850/65000` là **default bịa cũ** — **không** sửa, **không** xoá (chỉ chủ dự án).
- Playwright: **build tĩnh + `vite preview --host 0.0.0.0` CỔNG RIÊNG**, Edge gọi **IP WSL** (`hostname -I`), **retry ≤3**, **kill theo PID cổng của mình** (không `pkill -f`), xoá outDir khi xong. **Không đụng dev :3000.**
- Không `git commit/push/checkout/stash/restore`; không thêm dependency; không in secret; **không để lại artefact trong repo** (`pwtest/` đã vào `.gitignore`, nhưng hãy ghi ảnh ra `C:\Users\chith\AppData\Local\Temp\pwtest\`).

## 10. Chờ chủ dự án (không giao ai)
| # | Việc | Chặn gì |
|---|---|---|
| 1 | 🔴 **Dán lại `supabase/scripts/apply_all_manual.sql`** | `site_content.settings` chưa tồn tại (`42703`) và `pricing_global_settings` còn `8/2850/65000`. Sau khi dán: `node scripts/a8-db-probe.mjs` phải **RC=0**, `node scripts/inspect-db.mjs` **19/19** |
| 2 | Màn xem `setting_audit` + chuẩn hoá nhãn khoá camelCase/snake_case | cần IA admin |
| 3 | `designer` chưa publish vẫn `status:'Published'` + ảnh stock (AT-07) · `displayName` persona bịa (AD-06) | quyết định nghiệp vụ |
| 4 | `AdminProductsPanel` chưa có ô nhập `strength/heatResistance/flexibility/colors/desc/recommendedFor` (nay ghi rỗng thay vì bịa) | có thêm UI hay chấp nhận rỗng |
| 5 | `syncFromSupabase` / `checkSupabaseHealth` 0 caller (dead code) | dọn hay giữ |
