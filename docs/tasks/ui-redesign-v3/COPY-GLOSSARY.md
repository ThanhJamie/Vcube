<!-- doc-meta: status=active; verified=2026-10-20; owner=ui-auditor -->
# COPY-GLOSSARY — Một ngôn ngữ (VI) · allowlist thuật ngữ · chuỗi English cần sửa · format

> **Snapshot:** `HEAD 97cc256` + working tree **2026-10-20 11:2x**. Line number có thể lệch do W1 đang
> sửa `Header.tsx`/`App.tsx`/`index.css` — mỗi dòng kèm chuỗi hiện tại để đối chiếu.
> Luật gốc: `docs/tasks/ui-redesign-v3/PLAN.md` §5 (một ngôn ngữ), `docs/design/taste-contract.md` §4.
>
> **Phạm vi:** chỉ sửa **chuỗi hiển thị**. **KHÔNG** mass-codemod 1.195 nhánh `isVi ?` trong đợt này
> (`docs/tasks/ui-redesign-v3/PLAN.md:121`); nhánh `en:` còn chết ghi nợ, dọn ở đợt code-cleanup sau.
>
> ✅ **Lead đã duyệt D-A…D-F (2026-10-20).** W1c (`design-foundation`) đã áp cho **file
> foundation** (Header/App footer/RoleGuard/CanvasErrorBoundary/LanguageContext) — xem
> `PLAN.md` §5.0 và `DESIGN-LANGUAGE.md` §4.1. Các mục A1–A16, A19, A22, B–D, E1–E4 vẫn thuộc
> W2/W3; **UI-027** (trùng affordance mobile) để integrator.

---

## 1. Luật một ngôn ngữ (bắt buộc)

1. **UI hiển thị 100% tiếng Việt.** `LanguageContext` đã khoá `vi` (`LanguageContext.tsx:455,469-477`);
   `toggleLanguage` luôn set `'vi'` ⇒ nhánh `: 'English'` trong `isVi ? … : …` và `t(key, vi, en)` là
   **dead code** — không tính là lỗi copy, nhưng cũng không được dựa vào chúng.
2. Được giữ **thuật ngữ kỹ thuật** trong allowlist §2; ngoài allowlist phải Việt hoá hoặc xin bổ sung.
3. Không viết tắt tuỳ tiện: "KH", "NXB", "SP"… → viết đủ ("khách hàng", "nhà xuất bản", "sản phẩm").
4. Câu đầy đủ, có chủ ngữ; **D-C**: bỏ hẳn English sau `//` trong eyebrow — nếu giữ `//` thì
   phần sau phải **tiếng Việt** (chỉ `VCUBE`/mã kỹ thuật được đứng trước).
5. Chữ hoa: chỉ dùng cho nhãn eyebrow/CTA ngắn, **không** viết hoa cả câu.
6. Nhãn nút phải là **động từ + đích** ("Lưu cấu hình", "Tạo đơn"), không dùng tiếng Anh ("Save").
7. `aria-label`, `title`, `alt`, `placeholder` cũng là chuỗi hiển thị ⇒ áp cùng luật.
8. Ngoại lệ được duyệt (ghi trong PR): **tên riêng/thương hiệu** (`VCUBE`, `Bambu Lab`, `PrusaSlicer`,
   `Bambu Studio`, `SolidWorks`, `Inventor`, `Fusion`, `Vietcombank`…), **mã đơn** (`VCUBE-...`),
   **tên khoá/DB trong màn admin chỉ đọc** (`verified_status`, `app_settings`) — chỉ khi hiển thị như
   giá trị kỹ thuật có chú thích, không dùng làm nhãn chính.

---

## 2. Allowlist thuật ngữ kỹ thuật (theo PLAN §5.2)

**Bắt buộc được giữ:** `CAD, STL, STEP, STP, 3MF, OBJ, WebGL, GPU, API, SKU, KYC, VAT, MES, BOM, PII, RLS, SLA`.

**ĐÃ CHỐT (Lead, 2026-10-20 — D-A/D-E)** — cột "Đề xuất" dưới đây là quyết định cuối:

| Thuật ngữ | Có trong UI | Đề xuất |
|---|---|---|
| `VND` | `format.ts:23`, nhãn tiền tệ | **Giữ** (mã tiền tệ ISO). Ký hiệu tiền hiển thị: **`₫`** (D-B) |
| `FDM`, `SLS`, `SLA` (công nghệ in) | `ServiceShowcaseSection`, `DesignerUploadWizardTab`, `ExploreView` filter | **Giữ** (chuẩn ngành) |
| `PLA, PETG, ABS, TPU, PA-CF, PVA, Resin` | vật liệu khắp nơi | **Giữ** (tên vật liệu, không dịch) |
| `Slicer / Slicing` | `PricingConfigPanel:326,328,344,2157`, `ProductDetailView:524`, `QuoteSummaryPanel` | **Việt hoá "cắt lớp"** (D-A); chỉ giữ `Slicer` khi là tên phần mềm (`PrusaSlicer`, `Bambu Studio`) |
| `Infill` | `DesignerRequestsTab:467`, `Group5ProductionPanel:1130`, `StlVs3mfComparisonModal:51`, `LanguageContext:166` | **Việt hoá "độ đặc"** (D-A) — W1c đã sửa `Độ đặc Infill:` → `Độ đặc:` |
| `Support` (vật liệu đỡ) | `QuoteSummaryPanel:542,544`, `StlVs3mfComparisonModal:46`, `PricingConfigPanel:328,344` | **Việt hoá "vật liệu đỡ"** (D-A) |
| `Layer` (lớp in) | `QuoteSummaryPanel:524-528`, `StlVs3mfComparisonModal:51` | **Việt hoá "lớp in"** (D-A) |
| `Batch` (lô) | `WorkshopEstimatorBOM:437` | **Việt hoá "lô"** (D-A) |
| `Hub` | `RoleGuard:72` (đã sửa), `WorkshopOnboardingWizard:666,672,678`, `AuthModal:214` | **Việt hoá** ("trung tâm"/"đầu mối") trừ tên sản phẩm (D-A) |
| `Studio` | `Header:67` (đã sửa), `PersonalizeView:428`, `QuoteSummaryPanel:302`, `ModelViewer3D:1798-1799` | **Việt hoá** ("xưởng thiết kế"/"không gian thiết kế") (D-A/D-D) |
| `Score` | `Tool3DView:1863` ("Risk Score") | **Việt hoá** ("điểm rủi ro") (D-A) |
| `Watertight` | nhãn kỹ thuật phân tích lưới | **Việt hoá "kín nước"** (đã dùng ở `HomeView:622`) |
| `CMS, SEO, SERP, Metadata, Landing Page, Hero, Headline, CTA, Badge` | admin CMS | **Việt hoá** ("cấu hình trang chủ", "tiêu đề", "nút", "huy hiệu"…) |
| `NDA, RFQ, B2B/B2C, IoT, ESP32, NEMA` | admin/khách hàng, danh mục | **Giữ** (thuật ngữ nghiệp vụ/kỹ thuật phổ biến) |
| `Email, File` | nhiều nơi | **Chốt (D-E):** "Email" **giữ** (loanword chuẩn, ghi allowlist); "File" → **"Tệp"** |

> Quy tắc: nếu một thuật ngữ **không** có trong bảng này và **không** thuộc allowlist bắt buộc ⇒
> mặc định **Việt hoá**. Không tự thêm ngoại lệ trong PR.

---

## 3. Viết hoa & dấu

| Quy tắc | Đúng | Sai |
|---|---|---|
| Nhãn eyebrow ngắn | `HỆ SINH THÁI DỊCH VỤ` | `HỆ SINH THÁI DỊCH VỤ // VCUBE ENGINEERING SERVICES` |
| Nút hành động | `Lưu cấu hình` | `Save Settings` |
| Trạng thái | `Chờ duyệt` / `Đã duyệt` | `Pending` / `Verified` |
| Dấu `//` phân cách | **Không dùng** trong câu VI | `THÔNG SỐ KỸ THUẬT // TECHNICAL SPECIFICATIONS` |
| Số + đơn vị | `0,20 mm` (vi-VN, dấu phẩy) | `0.20 mm` trong câu VI (trừ mã kỹ thuật/định dạng tệp) |

---

## 4. Danh sách chuỗi English **đang hiển thị** cần sửa

> Chỉ liệt kê chuỗi **render ra UI ở VI mode** (nhánh VI hoặc unconditional). Đã loại: nhánh `en:`,
> type union, console log, comment, import, tên biến.
> Cột **Mức** khớp `UI-DEFECTS.md`: P1 = English lẫn rõ; P3 = nit/loanword/thuật ngữ chờ chốt.
>
> ✅ **W1c đã sửa trong file foundation (2026-10-20, không sửa page view):** A17, A18, A20, A21,
> A23, A24, A25, A26, E5–E8; thêm `Độ đặc Infill:` → `Độ đặc:` (`LanguageContext`), brand title
> console `VCUBE Lab` → `Xưởng in VCUBE`, `Designer Studio` → `Xưởng thiết kế`, `MES Hub` → `MES`.
> Các mục còn lại (A1–A16, A19, A22, B–D, E1–E4) thuộc W2/W3.

### A. Storefront & PDP (W2 — `storefront` + `pdp-viewer`)

| # | file:line | Chuỗi hiện tại | Đề xuất VI | Mức |
|---|---|---|---|---:|
| A1 | `components/services/ServiceShowcaseSection.tsx:37` | `ON-DEMAND MANUFACTURING` (badgeVi) | `SẢN XUẤT THEO YÊU CẦU` | P1 |
| A2 | `components/services/ServiceShowcaseSection.tsx:78` | `CONCEPT TO PROTOTYPE` (badgeVi) | `TỪ Ý TƯỞNG ĐẾN MẪU` | P1 |
| A3 | `components/services/ServiceShowcaseSection.tsx:119` | `VERIFIED CAD ASSETS` (badgeVi) | `BẢN VẼ CAD ĐÃ KIỂM DUYỆT` | P1 |
| A4 | `components/services/ServiceShowcaseSection.tsx:160` | `TOLERANCE & METROLOGY` (badgeVi) | `DUNG SAI & ĐO KIỂM` | P1 |
| A5 | `components/services/ServiceShowcaseSection.tsx:253` | `HỆ SINH THÁI DỊCH VỤ // VCUBE ENGINEERING SERVICES` | `HỆ SINH THÁI DỊCH VỤ VCUBE` | P1 |
| A6 | `components/services/ServiceShowcaseSection.tsx:406` | `Mô Phỏng 3D // LIVE 3D MESH` | `MÔ PHỎNG 3D` | P1 |
| A7 | `components/services/ServiceShowcaseSection.tsx:592` | `THÔNG SỐ KỸ THUẬT & CAM KẾT // TECHNICAL SPECIFICATIONS` | `THÔNG SỐ KỸ THUẬT & CAM KẾT` | P1 |
| A8 | `components/services/ServiceShowcaseSection.tsx:610` | `ĐẶC ĐIỂM NỔI BẬT // KEY CAPABILITIES` | `ĐẶC ĐIỂM NỔI BẬT` | P1 |
| A9 | `views/HomeView.tsx:361` | `VCUBE PRECISION ANTHOLOGY // 2026` (fallback hero badge) | `TUYỂN TẬP CHẾ TÁC CHÍNH XÁC VCUBE 2026` | P1 |
| A10 | `views/HomeView.tsx:655` | `VCUBE CAD CATALOG // INDUSTRIAL ARCHIVE` | `KHO BẢN VẼ CAD CÔNG NGHIỆP VCUBE` | P1 |
| A11 | `views/HomeView.tsx:1305` | `SẴN SÀNG SẢN XUẤT // RAPID FABRICATION` | `SẴN SÀNG SẢN XUẤT` | P1 |
| A12 | `views/HomeView.tsx:1079` | `File Số (STL/STEP)` | `Tệp số (STL/STEP)` | P3 |
| A13 | `views/HomeView.tsx:1087` | `In Vật Lý (FDM/Resin)` | `In vật lý (FDM/nhựa lỏng)` | P3 |
| A14 | `views/ProductDetailView.tsx:307` | `Share` | `Chia sẻ` | P1 |
| A15 | `views/ProductDetailView.tsx:524` | `Profile In & Slicing` | `Hồ sơ in & cắt lớp` | P1 |
| A16 | `views/PersonalizeView.tsx:428` | `VCUBE STUDIO // PERSONALIZATION` | `VCUBE STUDIO // CÁ NHÂN HOÁ` (hoặc bỏ `STUDIO` theo §2) | P1 |
| A17 | `components/Header.tsx:180`, `:336` | `Vietnam` (wordmark) | `Việt Nam` — **✅ W1c** | P3 |
| A18 | `components/Header.tsx:172` | `aria-label="VCUBE Home"` | `aria-label="Về trang chủ VCUBE"` — **✅ W1c** | P3 |
| A19 | `components/CadQuickViewModal.tsx:238` | `aria-label="Close CAD inspector"` | `aria-label="Đóng trình xem CAD nhanh"` | P3 |
| A20 | `components/CanvasErrorBoundary.tsx:57` | `Render Error` | `Lỗi kết xuất 3D` — **✅ W1c** | P2 |
| A21 | `components/CanvasErrorBoundary.tsx:55` | `VCUBE MESH ENGINE v2.6` | `BỘ MÁY LƯỚI 3D VCUBE v2.6` — **✅ W1c** | P3 |
| A22 | `components/personalize/PersonalizeModelViewer3D.tsx:714` | `ARDUINO-CASE` (fallback HUD) | `MÔ HÌNH 3D` | P3 |
| A23 | `src/App.tsx:2025` | `Marketplace linh kiện 3D` (footer) | `Sàn linh kiện 3D` — **✅ W1c** | P3 |
| A24 | `src/App.tsx:2106` | `© 2026 VCUBE Vietnam Industrial Fabrication.` | `© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.` — **✅ W1c** | P3 |
| A25 | `components/Header.tsx:72` | `Quản Trị Admin` (nav) | `Quản trị hệ thống` (D-D) — **✅ W1c** | P3 |
| A26 | `components/Header.tsx:67` | `Studio Thiết Kế` (nav) | `Xưởng thiết kế` (D-D) — **✅ W1c** | P3 |

### B. Báo giá / Tool3D (W3 — `tool3d`)

| # | file:line | Chuỗi hiện tại | Đề xuất VI | Mức |
|---|---|---|---|---:|
| B1 | `views/Tool3DView.tsx:616`, `:939` | `Automated Slicer & Geometry QA // VCUBE Mesh Engine v2.6` | `KIỂM TRA HÌNH HỌC & CẮT LỚP TỰ ĐỘNG // VCUBE Mesh Engine v2.6` | P1 |
| B2 | `views/Tool3DView.tsx:1863` | `Risk Score` (th cột bảng lịch sử) | `Điểm rủi ro` | P1 |
| B3 | `components/tool3d/StlUnitConfirmModal.tsx:47` | `Xác Nhận Đơn Vị Đo STL // Unit Verification` | `XÁC NHẬN ĐƠN VỊ ĐO STL` | P1 |
| B4 | `components/tool3d/StlVs3mfComparisonModal.tsx:49` | `Thông số Slicer & Print Settings` | `Thông số cắt lớp & cài đặt in` | P1 |
| B5 | `components/tool3d/StlVs3mfComparisonModal.tsx:51` | `Lưu cấu hình Infill, Layer, Support` | `Lưu cấu hình độ đặc, lớp in, vật liệu đỡ` | P1 |
| B6 | `components/tool3d/StlVs3mfComparisonModal.tsx:46` | `… PETG + Support PVA` | `… PETG + vật liệu đỡ PVA` | P3 |
| B7 | `components/tool3d/QuoteSummaryPanel.tsx:302` | `VCUBE Engineering Studio` | `Xưởng kỹ thuật VCUBE` | P1 |
| B8 | `components/tool3d/QuoteSummaryPanel.tsx:524-528` | `0.08 mm (Ultra Fine)`, `0.12 mm (Fine Detail)`, `0.16 mm (Standard Pro)`, `0.20 mm (Draft Fast)` | `0,08 mm (Siêu mịn)`, `0,12 mm (Chi tiết mịn)`, `0,16 mm (Tiêu chuẩn)`, `0,20 mm (Lớp nhanh)` | P2 |
| B9 | `components/tool3d/QuoteSummaryPanel.tsx:542` | `Tree Support (Dễ bóc)` | `Đỡ dạng cây (dễ bóc)` | P2 |
| B10 | `components/tool3d/QuoteSummaryPanel.tsx:543` | `Auto Grid Standard` | `Đỡ dạng lưới tự động` | P2 |
| B11 | `components/tool3d/QuoteSummaryPanel.tsx:544` | `Không dùng Support` | `Không dùng vật liệu đỡ` | P2 |
| B12 | `components/tool3d/ModelViewer3D.tsx:1798-1799` | `Toàn màn hình CAD Studio` (title + aria) | `Toàn màn hình xem CAD` | P1 |

### C. Console Admin (W3 — `admin`)

| # | file:line | Chuỗi hiện tại | Đề xuất VI | Mức |
|---|---|---|---|---:|
| C1 | `admin/AdminStorefrontPanel.tsx:129` | `LANDING PAGE CMS // STOREFRONT` | `CẤU HÌNH TRANG CHỦ // GIAO DIỆN CỬA HÀNG` | P1 |
| C2 | `admin/AdminStorefrontPanel.tsx:138` | `Landing Page CMS sửa được những gì?` | `Cấu hình trang chủ sửa được những gì?` | P1 |
| C3 | `admin/AdminStorefrontPanel.tsx:182` | `Hero & Chỉ Số Đo Kiểm` | `Khối đầu trang & chỉ số đo kiểm` | P1 |
| C4 | `admin/AdminStorefrontPanel.tsx:270` | `Badge Trên Cùng Của Hero` | `Huy hiệu đầu trang` | P1 |
| C5 | `admin/AdminStorefrontPanel.tsx:283` | `Tiêu Đề Dòng 1 (Headline Line 1)` | `Tiêu đề dòng 1` | P1 |
| C6 | `admin/AdminStorefrontPanel.tsx:295` | `Tiêu Đề Nhấn Mạnh (Headline Highlight - Màu Teal)` | `Tiêu đề nhấn mạnh (màu teal)` | P1 |
| C7 | `admin/AdminStorefrontPanel.tsx:307` | `Đoạn Văn Miêu Tả Phụ (Hero Subheadline)` | `Đoạn mô tả phụ` | P1 |
| C8 | `admin/AdminStorefrontPanel.tsx:320` | `Nút Bấm Chính (Primary CTA Text)` | `Nhãn nút chính` | P1 |
| C9 | `admin/AdminStorefrontPanel.tsx:332` | `Nút Bấm Phụ (Secondary CTA Text)` | `Nhãn nút phụ` | P1 |
| C10 | `admin/AdminStorefrontPanel.tsx:503` | `Huy Hiệu (Badge Chiến Dịch)` | `Huy hiệu chiến dịch` | P3 |
| C11 | `admin/AdminStorefrontPanel.tsx:556` | `Badge Khối Quy Trình` | `Huy hiệu khối quy trình` | P1 |
| C12 | `admin/AdminStorefrontPanel.tsx:687` | `Badge Bộ Tính Giá` | `Huy hiệu bộ tính giá` | P1 |
| C13 | `admin/AdminStorefrontPanel.tsx:777` | `Tiêu Đề Dải Đối Tác (Trust Partners Banner Title)` | `Tiêu đề dải đối tác` | P1 |
| C14 | `admin/AdminStorefrontPanel.tsx:564` | placeholder `CHRONICLE // QUY TRÌNH XƯỞNG` | `QUY TRÌNH XƯỞNG` | P3 |
| C15 | `admin/AdminStorefrontPanel.tsx:695` | placeholder `VCUBE FAST ESTIMATOR // LIVE QUOTE` | `BỘ TÍNH GIÁ NHANH VCUBE // BÁO GIÁ TRỰC TIẾP` | P3 |
| C16 | `admin/AdminStorefrontPanel.tsx:937` | placeholder `CUSTOM CAD // THEO Ý TƯỞNG` | `CAD THEO YÊU CẦU // THEO Ý TƯỞNG` | P3 |
| C17 | `admin/AdminSeoPanel.tsx:92` | `SEO CONSOLE // SERP & METADATA` | `CẤU HÌNH SEO // KẾT QUẢ TÌM KIẾM & METADATA` (chốt `SEO`/`SERP` ở §2) | P1 |
| C18 | `admin/AdminSeoPanel.tsx:94` | `Google Search & Social Media Ready` | `Sẵn sàng cho tìm kiếm Google & mạng xã hội` | P1 |
| C19 | `admin/AdminSeoPanel.tsx:567` | `VCUBE.VN // PRECISION MANUFACTURING` | `VCUBE.VN // CHẾ TÁC CHÍNH XÁC` | P1 |
| C20 | `admin/AdminSettingsPanel.tsx:248` | `APP_SETTINGS // PHÁP LÝ` | `CẤU HÌNH HỆ THỐNG // PHÁP LÝ` | P1 |
| C21 | `admin/AdminProductsPanel.tsx:462,587,735` | `⚠ Thiếu Profile Slicing` | `⚠ Thiếu hồ sơ cắt lớp` | P1 |
| C22 | `admin/AdminProductsPanel.tsx:599` | `Đang Mở Bán (Published)` | `Đang mở bán` | P1 |
| C23 | `admin/PricingConfigPanel.tsx:326` | `Review file & Slicing` | `Duyệt tệp & cắt lớp` | P1 |
| C24 | `admin/PricingConfigPanel.tsx:328` | `Tách Support` | `Tách vật liệu đỡ` | P1 |
| C25 | `admin/PricingConfigPanel.tsx:344` | `Tỷ lệ Support` | `Tỷ lệ vật liệu đỡ` | P1 |
| C26 | `admin/PricingConfigPanel.tsx:2157` | `7. Tham Số Slicing & Tháp Xả` | `7. Tham số cắt lớp & tháp xả` | P1 |
| C27 | `admin/WorkshopEstimatorBOM.tsx:437` | `Số Lượng Đặt In (Batch)` | `Số lượng đặt in (lô)` | P1 |
| C28 | `admin/groups/Group5ProductionPanel.tsx:1130` | `Độ Đặc (Infill)` | `Độ đặc` | P1 |
| C29 | `admin/groups/Group1WorkshopsPanel.tsx:1473` | `Chờ duyệt (Pending)` | `Chờ duyệt` | P1 |
| C30 | `admin/groups/Group1WorkshopsPanel.tsx:1474` | `Đã duyệt (Verified)` | `Đã duyệt` | P1 |
| C31 | `admin/groups/Group2DesignersPanel.tsx:15` | `👑 Top Creator` | `👑 Tác giả hàng đầu` | P1 |
| C32 | `admin/groups/Group2DesignersPanel.tsx:16` | `🛡️ Verified Engineer` | `🛡️ Kỹ sư đã kiểm duyệt` | P1 |
| C33 | `admin/groups/Group2DesignersPanel.tsx:18` | desc `Creator phổ thông` | `Tác giả phổ thông` | P1 |
| C34 | `admin/groups/Group2DesignersPanel.tsx:290` | `Top Creators` (cả 2 nhánh) | `Tác giả hàng đầu` | P1 |
| C35 | `admin/groups/Group2DesignersPanel.tsx:356,521,522` | `👑 Top Creator` / `🛡️ Verified Engineer` (badge) | như C31/C32 | P1 |

### D. Onboarding xưởng + Designer (W3 — `ops-consoles`)

| # | file:line | Chuỗi hiện tại | Đề xuất VI | Mức |
|---|---|---|---|---:|
| D1 | `onboarding/WorkshopOnboardingWizard.tsx:465` | `…duyệt (Pending).` (toast) | `…chờ Quản trị viên duyệt.` | P1 |
| D2 | `onboarding/WorkshopOnboardingWizard.tsx:508` | `Chờ duyệt Pending` | `Chờ duyệt` | P1 |
| D3 | `onboarding/WorkshopOnboardingWizard.tsx:575` | `<strong>Pending</strong> (chờ Quản trị viên duyệt)` | `<strong>Chờ duyệt</strong> (…)` | P1 |
| D4 | `onboarding/WorkshopOnboardingWizard.tsx:1359` | `verified_status: Pending (Chờ Admin Duyệt)` | giữ mã kỹ thuật có chú thích: `verified_status: Pending — Chờ quản trị viên duyệt` | P1 |
| D5 | `onboarding/WorkshopOnboardingWizard.tsx:1399` | `<strong>Pending</strong>` + `<strong>Verified</strong>` | `Chờ duyệt` + `Đã duyệt` | P1 |
| D6 | `onboarding/WorkshopOnboardingWizard.tsx:666,672,678` | `Miền Bắc (Hub Hà Nội)`… | `Miền Bắc (đầu mối Hà Nội)` | P3 |
| D7 | `designer/DesignerModelsManagerTab.tsx:429` | `Standard (Cá nhân)` | `Tiêu chuẩn (cá nhân)` | P1 |
| D8 | `designer/DesignerModelsManagerTab.tsx:430` | `Commercial (Thương mại)` | `Thương mại` | P1 |
| D9 | `designer/DesignerModelsManagerTab.tsx:431` | `Exclusive (Độc quyền)` | `Độc quyền` | P1 |
| D10 | `designer/DesignerModelsManagerTab.tsx:444` | `Published (Đã xuất bản)` | `Đã xuất bản` | P1 |
| D11 | `designer/DesignerModelsManagerTab.tsx:445` | `Under Review (Chờ duyệt)` | `Chờ duyệt` | P1 |
| D12 | `designer/DesignerModelsManagerTab.tsx:446` | `Draft (Bản nháp)` | `Bản nháp` | P1 |
| D13 | `designer/DesignerUploadWizardTab.tsx:406` | `Commercial (Thương Mại)` | `Thương mại` | P1 |
| D14 | `designer/DesignerRequestsTab.tsx:467` | `Mật Độ Infill:` | `Mật độ (độ đặc):` hoặc `Độ đặc:` | P3 |

### E. Vai trò / auth (W2 `commerce-auth` + W3 `RoleGuard`)

| # | file:line | Chuỗi hiện tại | Đề xuất VI | Mức |
|---|---|---|---|---:|
| E1 | `components/AuthModal.tsx:200` | `Quản Trị Viên (Admin)` | `Quản trị viên` | P1 |
| E2 | `components/AuthModal.tsx:207` | `Tác Giả 3D (Creator)` | `Tác giả thiết kế 3D` | P1 |
| E3 | `components/AuthModal.tsx:214` | `Xưởng In MES (Lab Hub)` | `Xưởng in (MES)` | P1 |
| E4 | `components/AuthModal.tsx:221` | `Khách Hàng (Customer)` | `Khách hàng` | P1 |
| E5 | `components/RoleGuard.tsx:67` | `Quản trị viên (ForgeControl Admin)` | `Quản trị hệ thống` — **✅ W1c** | P1 |
| E6 | `components/RoleGuard.tsx:69` | `Tác giả thiết kế 3D (Creator)` | `Tác giả thiết kế 3D` — **✅ W1c** | P1 |
| E7 | `components/RoleGuard.tsx:72` | `Xưởng in / Đối tác sản xuất (3D Print Lab)` | `Xưởng in / Đối tác sản xuất` — **✅ W1c** | P1 |
| E8 | `components/RoleGuard.tsx:74` | `Khách hàng (Customer)` | `Khách hàng` — **✅ W1c** | P1 |

> **Đã sửa (audit + W1c `design-foundation`):** role chip mobile `Header.tsx:414` chuyển sang VI;
> W1c sửa tiếp **E5–E8** (`RoleGuard`), A17/A18 (wordmark + aria), A25/A26 (nav label), A20/A21
> (`CanvasErrorBoundary`), A23/A24 (footer) — **file foundation không còn lỗi copy**.
> Tuy vậy nav label `Quản Trị Admin`/`Studio Thiết Kế` + wordmark `Vietnam` **vẫn còn** (A25/A26/A17)
> — W1 handoff ghi "VI-only" là chưa đúng 100%.

### F. False positive — **không** phải lỗi (đừng sửa)

| Vị trí | Vì sao không tính |
|---|---|
| `views/ExploreView.tsx:1195` (`Load More`), mọi `: 'English'` sau `isVi ?` | Nhánh `en` chết vì language khoá `vi` |
| `src/frontend/context/LanguageContext.tsx` (`en: '...'`) | Từ điển EN không render; nợ dọn sau |
| `DesignerOverviewTab.tsx:46` (`…tại Overview:`) | `console.error` — không hiển thị |
| `AdminProductsPanel.tsx:180`, `DesignerModelsManagerTab.tsx:60,110` (`Published` trong type/state) | Code identifier, không render thô |
| `Group1WorkshopsPanel.tsx:295,390,401,442…` (`'Pending'/'Verified'`) | Giá trị DB/enum; chỉ lỗi khi render **thô** (C29/C30) |
| `WorkshopOnboardingWizard.tsx:66-76` (`Bambu Lab`) | Tên hãng/máy — ngoại lệ tên riêng |
| `models manager` `Under Review` (giá trị) | Enum; label mới là chỗ hiển thị (D11) |

---

## 5. Quy tắc định dạng ngày / tiền / số (một nguồn: `src/frontend/lib/format.ts`)

| Loại | Hàm | Định dạng chuẩn | Ví dụ | Ghi chú |
|---|---|---|---|---|
| Ngày | `formatDate` (`format.ts:158`) | **`dd/MM/yyyy`** (2 chữ số) | `09/12/2026` | `style:'long'` → `9 tháng 12, 2026` chỉ cho câu văn |
| Ngày + giờ | `formatDateTime` (`format.ts:177`) | `dd/MM/yyyy HH:mm`, **24h** | `09/12/2026 14:30` | `hour12` mặc định `false` |
| Tiền | `formatCurrency` (`format.ts:124`) | `vi-VN` + `VND`, **0 thập phân** | `1.250.000 ₫` | Dùng `Money`/`formatCurrency`, **không** tự nối chuỗi |
| Số | `formatNumber` (`format.ts:99`) | `vi-VN`: nghìn `.`, thập phân `,`, tối đa 3 chữ số lẻ | `1.234.567,5` | `notation:'compact'` 1 chữ số lẻ |
| Phần trăm | `formatPercent` (`format.ts:~148`) | `12,5%` (không khoảng trắng) | `12,5%` | `isRatio:true` cho 0..1 |
| Dung lượng | `formatBytes` (`format.ts:200+`) | SI base 1000, 1 thập phân | `1,5 MB` | `0 B` cố định |
| Khối lượng | `formatWeight` | g mặc định, kg 2 thập phân | `124,5 g` / `1,25 kg` | — |
| Thiếu dữ liệu | `EMPTY_VALUE` (`format.ts:14`) | **`—`** | `—` | **Không** render `0`, không đoán |
| Cột số | class Tailwind | `tabular-nums` | — | Bảng/KPI bắt buộc (`tokens.md §4`) |

### 5.1 Ký hiệu tiền — ĐÃ CHỐT: `₫` (D-B, 2026-10-20)

- **Quyết định (Lead):** giữ **`₫`** — đúng output của `formatCurrency`/`Money` (`Intl vi-VN`)
  ⇒ **`1.250.000 ₫`** (`ui/Money.tsx:5`). **KHÔNG** đổi `format.ts` (không ai được sửa helper
  trong wave UI).
- `PLAN.md` §5.5 đã sửa `đ` → **`₫`** cho khớp code; **UI-039 đóng**.
- Các chỗ **nối tay `' đ'`** vẫn còn (W3 dọn theo D-B, dùng `formatCurrency`/`Money`):
  `admin/WarehouseInventoryPanel.tsx:201,333,334,402,406,562,594`,
  `admin/AccessoriesManager.tsx:225,239`,
  `components/tool3d/InternalCostBreakdownModal.tsx:280`,
  `admin/PricingConfigPanel.tsx:1907-1908` (`Làm tròn lên 5,000 đ`).
- Đơn vị kỹ thuật (`VND/kWh`, `mm`, `cm³`, `°C`) là **không đổi** — thuộc allowlist đo lường;
  riêng `đ/g` đổi thành `₫/g` khi chạm file (W3).

### 5.2 Số trong câu VI

- Số thập phân dùng **dấu phẩy**: `0,20 mm` (không `0.20 mm`) — trừ mã định dạng/code (`STL`, `0.16` trong
  giá trị kỹ thuật của slicer khi đứng một mình ở cột mono kỹ thuật, chấp nhận).
- Khoảng số dùng **en-dash**: `24–48 giờ` (không `24h - 48h`).
- Tiền tệ không viết "VNĐ" + "₫" cùng lúc.

---

## 6. Quy trình kiểm copy (QA + page agent)

1. **Chỉ sửa chuỗi hiển thị**, không sửa key i18n, không mass-codemod `isVi`.
2. Grep nhanh trước khi handoff (chạy từ repo root):
   ```bash
   # 1) chữ hoa English trong nhánh VI / unconditional (bỏ en branch bằng mắt)
   grep -rnE ">[[:space:]]*[A-Z][A-Z /&]{4,}[[:space:]]*<" src/frontend --include=*.tsx
   # 2) thuật ngữ ngoài allowlist trong string hiển thị
   grep -rnE "'[^']*(Pending|Verified|Dashboard|Settings|Profile|Commercial|Slicer|Infill|Support|Layer|Batch|Hub|Studio|Score)[^']*'" src/frontend --include=*.tsx
   # 3) aria/title/placeholder tiếng Anh
   grep -rnE "(aria-label|title|placeholder|alt)=\"[A-Za-z][^"]{3,}\"" src/frontend --include=*.tsx
   ```
3. Quy tắc đọc kết quả: nếu chuỗi nằm sau `: '...'` của một `isVi ?` hoặc trong object `en:` ⇒ **bỏ qua**.
4. Definition of done copy: danh sách §4 A–E có ảnh chứng minh; `grep` bước 2 không còn hit VI-mode với
   các từ trong bảng §2 cột "phải Việt hoá".
5. **Không** đổi nhãn nav/route/slug trong đợt này (PLAN D6) — chỉ đổi chữ hiển thị nếu cùng nghĩa.

---

## 7. Nợ ghi nhận (không xử lý W0–W3)

- 1.195 nhánh `isVi ?` + toàn bộ nhánh `en:` chết trong `LanguageContext` ⇒ đợt code-cleanup sau
  (xoá EN dictionary hoặc chuyển sang một nguồn i18n duy nhất).
- `isVi` còn dùng cho cả logic format/locale (`formatCurrency(..., locale)`) — không xoá trong wave UI.
- `SEOHead` (title/description/OG) đã VI; kiểm lại `og:locale = vi_VN` trong QA (PLAN §5.6).
