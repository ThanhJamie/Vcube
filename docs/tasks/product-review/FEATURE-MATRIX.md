<!-- doc-meta: status=active; verified=2026-10-23; owner=design-foundation -->
# FEATURE MATRIX — cái gì cần, cái gì có thật (code + DB + quan sát)

> **Cột "Hiện có":** ✅ đủ dùng end-to-end · ⚠️ một phần (có UI/service nhưng thiếu dây) ·
> ❌ thiếu (không có UI hoặc không có writer/reader) · 🧪 mock/demo-only.
> **"Mức":** B = bắt buộc để bán thật · Q = quan trọng · N = nice-to-have.
> Mọi dòng có bằng chứng `route` + `file:line`; route line lấy từ
> `src/frontend/routes/AppRoutes.tsx`, DB từ `supabase/migrations/*.sql` (32 bảng/2 view).
> Khảo sát runtime guest: 2026-10-23, DB demo `[MẪU]` (10 sản phẩm, 8 vật liệu, 7 máy in).

## Tổng hợp

| Persona | Số tính năng | ✅ | ⚠️ | ❌ | 🧪 |
|---|---:|---:|---:|---:|---:|
| 1. Khách vãng lai | 14 | 8 | 6 | 0 | 0 |
| 2. Khách hàng | 12 | 2 | 3 | 7 | 0 |
| 3. Nhà thiết kế | 11 | 4 | 5 | 2 | 0 |
| 4. Xưởng in (Lab) | 12 | 8 | 1 | 3 | 0 |
| 5. Quản trị viên | 15 | 10 | 1 | 4 | 0 |
| 6. Điều phối viên (suy diễn) | 8 | 2 | 3 | 3 | 0 |
| **Tổng** | **72** | **34** | **19** | **19** | **0** |

> Đọc nhanh: **34/72 (47%) dùng được trọn vẹn**; nhóm ❌ tập trung đúng vào **vòng giao dịch
> & hậu mãi** (đơn của khách, file số, payout, điều phối, đối soát) — không phải UI.

---

## 1. Khách vãng lai (chưa đăng nhập)

| # | Tính năng cần | Mức | Hiện có | Bằng chứng (route + file:line) | Gap |
|---:|---|---|---|---|---|
| G1 | Trang chủ định vị rõ + hero 3D + CTA báo giá/khám phá | B | ✅ | `/` — `AppRoutes.tsx:133`; `HomeView.tsx:100-187` (4 model hero), `:605` (dropzone→quote) | — |
| G2 | Duyệt catalog: danh mục/tag/vật liệu/giá, sort, grid/table | B | ✅ | `/explore` — `:151`; `ExploreView.tsx:215-226` (state lọc/sort/view), `:316` (chỉ published) | Không lưu filter vào URL ⇒ refresh/Back/chia sẻ link mất trạng thái (`0 setSearchParams`) |
| G3 | Tìm kiếm nhanh theo tên/mã/tag | Q | ⚠️ | Header — `Header.tsx:140-141` → `explore?search=` | Không gợi ý/history; search chỉ là text filter phía client |
| G4 | PDP: 3D, ảnh, thông số/dung sai, giá theo cấu hình | B | ✅ | `/products/:productId` — `:170`; `ProductDetailView.tsx:72` (4 tab), `:854-975` | Ảnh/thumbnail trống ở dữ liệu demo ⇒ card xám (khó tin) |
| G5 | Báo giá file 3D: upload → parse → giá theo vật liệu/máy | B | ✅ | `/quote` — `:214`; `Tool3DView.tsx:13,158`; đã thử upload 20mm cube → **8,0 cm³ / 111.000 đ** | Không có server/Edge quote; giá tính client |
| G6 | Chốt báo giá: lưu mã báo giá / chuyển thành đơn | Q | ⚠️ | `QuoteSummaryPanel.tsx:739` (thêm line cart) | `dbService.saveQuote` (`database.ts:415`) **0 caller**; không email/không mã báo giá |
| G7 | Cá nhân hoá (khắc/logo/màu/gói/số lượng) | Q | ⚠️ | `/personalize` — `:186`; `PersonalizeView.tsx:120-152` | Tuỳ biến chỉ nằm ở line cart; không lưu spec/job server |
| G8 | Giỏ hàng: sửa qty, ship theo ngưỡng, VAT, tổng | B | ✅ | `/cart` — `:230`; `CartView.tsx:41-52`; quan sát: ship 30.000 + VAT 8% + tổng 378.000 | Giỏ chỉ localStorage (không `cart_items` server) |
| G9 | Checkout không cần mật khẩu | B | ✅ | `/checkout` — `:243`; `CheckoutView.tsx:158` (`customerType: guest`), `:478-565` | Đã quan sát form; chưa submit (tránh bẩn DB) |
| G10 | Tra cứu đơn bằng mã + token/SĐT | B | ✅ | `/tracking` — `:277`; `OrderTrackingView.tsx:57-94`; RPC `database.ts:382` | Không realtime; phải nhớ token (đúng bảo mật) |
| G11 | Đăng ký/đăng nhập email | B | ✅ | `/auth/login` `:448`, `/auth/register` `:450`; `RegisterView.tsx:24,106-112` | Google/reset tắt cờ (`AuthModal.tsx:14,22`) |
| G12 | Lưu yêu thích (không cần tài khoản) | N | ⚠️ | `ExploreView.tsx:224,249-256`; `ProductDetailView.tsx:78` | Local state, rời trang mất; không đồng bộ |
| G13 | Hỗ trợ/chat khi đang xem | N | ⚠️ | `ChatSupportModal.tsx:39-45` (auto-reply) | Không tạo ticket/lead; không người thật; không lưu hội thoại |
| G14 | Nhãn dữ liệu demo trung thực | B | ⚠️ | Quan sát `/` 390/1440 | Banner `[MẪU]` lặp 2 lần + CTA "Tag 2/9" (chiến dịch không tồn tại) gây nhiễu |

*14 dòng (≥8 yêu cầu).* ✅ 8 · ⚠️ 6 · ❌ 0.

---

## 2. Khách hàng (role `customer`)

| # | Tính năng cần | Mức | Hiện có | Bằng chứng | Gap |
|---:|---|---|---|---|---|
| C1 | Đăng nhập/phiên/vai trò đọc từ DB | B | ✅ | `AuthContext.resolveDbRole`; role DB `baseline_schema.sql:852` | — |
| C2 | Lịch sử đơn của tôi | **B** | ❌ | `/orders` `:299`; `useOrdersData.ts:44-55` (chỉ `role==='admin'`); `orderService.ts:46` 0 caller | **P0**: luôn hiện "Bạn chưa có đơn hàng nào"; không error state |
| C3 | Chi tiết đơn + tiến độ 8 nấc + QC | B | ⚠️ | `MyOrdersView.tsx:41-48` (filter), `OrderProgress`; `/tracking` | Không realtime; đơn lấy từ state RAM nên F5 mất |
| C4 | Tải file CAD đã mua | **B** | ❌ | `/assets` `:314`; `AssetLibraryView.tsx:50-52`; không writer `order_files`; RLS `digital_assets` chỉ designer/admin `harden_rls.sql:628-641` | **P0**: mua file số không bao giờ nhận được file |
| C5 | Hoá đơn VAT in được | Q | ⚠️ | `InvoiceModal.tsx:72` (`window.print`); VAT từ `CartView.tsx:36` | Hoá đơn sinh từ dữ liệu đơn trên RAM; không lưu/không có số hoá đơn server |
| C6 | Bảo hành / báo lỗi kỹ thuật | Q | ❌ | `MyOrdersView.tsx:89-100` (UI-only), modal `:399+` | `warranty_claims` có bảng nhưng không writer/reader |
| C7 | Mua lại/đặt lại đơn cũ | Q | ❌ | `MyOrdersView.tsx:73` gửi `reorderItems` | Không consumer payload ⇒ `/quote` trắng |
| C8 | Quản lý hồ sơ/địa chỉ/mật khẩu | Q | ❌ | `AuthModal.tsx` account mode chỉ hiển thị; reset tắt cờ `:14` | Không route `/account`; không sửa profile |
| C9 | Đánh giá sản phẩm sau mua | Q | ❌ | PDP chỉ đọc counter `ProductDetailView.tsx:143-147,925-975` | `reviews` không có service ghi → vòng tin cậy hở |
| C10 | Yêu cầu thiết kế riêng (RFQ) + trao đổi | Q | ✅ | `CustomIdeaRequestModal.tsx:116` → `customDesignService.ts:142` (`createRequest`) | Thiếu thông báo có phản hồi (chỉ designer thấy realtime) |
| C11 | Nhận thông báo trạng thái đơn (email/realtime) | Q | ❌ | Không mail service; không channel `orders` (chỉ products/settings/custom_design) | Khách phải tự quay lại tra token |
| C12 | Hỗ trợ khách hàng | N | ⚠️ | `ChatSupportModal.tsx:39-45` auto-reply | Không ticket/handoff |

*12 dòng.* ✅ C1,C10 (2) · ⚠️ C3,C5,C12 (3) · ❌ C2,C4,C6,C7,C8,C9,C11 (7).

---

## 3. Nhà thiết kế (role `designer`)

| # | Tính năng cần | Mức | Hiện có | Bằng chứng | Gap |
|---:|---|---|---|---|---|
| D1 | Tự đăng ký tài khoản designer + chờ duyệt | B | ⚠️ | `RegisterView.tsx:24,106-112`; `designer_profiles.verified_status` | Designer không thấy trạng thái duyệt của chính mình trong dashboard |
| D2 | Tổng quan: yêu cầu/đơn/doanh thu | Q | ⚠️ | `/designer` `:329`; `DesignerOverviewTab.tsx:42-43` (chỉ inquiries) | Không số doanh thu/đơn; ledger không có |
| D3 | Quản lý mẫu: sửa/xoá/trạng thái duyệt | B | ✅ | `/designer/models`; `DesignerModelsManagerTab.tsx` (CRUD → `dbService.saveProduct/deleteProduct`) | — |
| D4 | Đăng mẫu mới: file/ảnh/mô tả/giá in-giá file/giấy phép | B | ✅ | `DesignerUploadWizardTab.tsx:49-127,187`; chờ duyệt `:128-134` | Không có thông báo khi mẫu được duyệt |
| D5 | Nhận/claim yêu cầu CAD + chat | B | ✅ | `DesignerRequestsTab.tsx:98` (claim RPC), `:117` (chat); `customDesignService.ts:118,380` realtime | — |
| D6 | Ví & rút tiền | B | ❌ | `DesignerPayoutsTab.tsx:35` (fixture rỗng), `:84` (nút disabled), `:110` | Không ledger/yêu cầu rút; admin không có màn duyệt |
| D7 | Thông tin nhận tiền (bank/tax) | B | ⚠️ | RPC `get_my_payout_info`/`upsert_my_payout_info` (schema #10); UI ví chưa có form — `useDesignerAdminStore.ts:27-41,119` | UI chưa nối RPC cho chủ hồ sơ |
| D8 | Cấu hình giấy phép & tỷ lệ bản quyền | Q | ⚠️ | License select `DesignerUploadWizardTab.tsx:55,106`; royalty từ settings (admin) | Designer không tự đặt royalty; chỉ admin |
| D9 | Trạng thái KYC/hồ sơ tác giả | Q | ❌ | Không khối nào trong `designer/*` đọc `verified_status` | Phải hỏi admin |
| D10 | Hiện diện trên catalog khi đã duyệt | B | ✅ | `ExploreView.tsx:316` (published); `products` owner | — |
| D11 | Thông báo có yêu cầu/đơn mới | N | ⚠️ | realtime `custom_design_requests` (`customDesignService.ts:380`) | Không toast/âm thanh; đơn bán không realtime |

*11 dòng.* ✅ D3,D4,D5,D10 (4) · ⚠️ D1,D2,D7,D8,D11 (5) · ❌ D6,D9 (2).

---

## 4. Xưởng in (role `lab` / `workshop`)

| # | Tính năng cần | Mức | Hiện có | Bằng chứng | Gap |
|---:|---|---|---|---|---|
| L1 | Onboarding hồ sơ xưởng (năng lực/máy/vật liệu) | B | ✅ | `/lab` `:444`; `LabRoute.tsx:62-71`; `WorkshopOnboardingWizard` | — |
| L2 | Cổng theo trạng thái duyệt | B | ⚠️ | `LabRoute.tsx:41` chỉ chặn `Pending` | `Suspended` vẫn vào MES (`baseline_schema.sql:933`) |
| L3 | Nhận đơn được giao + xem yêu cầu | **B** | ❌ | `workshopService.getMyQueueOrders` (read-only); không writer `assigned_workshop_id` (`CheckoutView.tsx:216-222` không truyền; Group5 không lưu gán) | **P1**: hàng đợi luôn rỗng ⇒ MES vô dụng với đơn thật |
| L4 | Cập nhật tiến độ in 8 nấc | B | ✅ | `WorkshopSettingsView.tsx:204-214,273,318` (`updateMyOrderProgress`) | Không có đơn để cập nhật (phụ thuộc L3) |
| L5 | Quản lý máy in (CRUD + trạng thái) | B | ✅ | `WorkshopSettingsView.tsx:339` | — |
| L6 | Quản lý vật liệu + tồn kho + log nhập/xuất | B | ✅ | `WorkshopSettingsView.tsx:452`; `material_inventory_logs` | — |
| L7 | Quản lý phụ kiện | Q | ✅ | `WorkshopSettingsView.tsx:619` | — |
| L8 | Cấu hình xưởng (lead time, ship, rate riêng) | B | ✅ | `WorkshopSettingsView.tsx:688`; `workshop_commission_terms` | — |
| L9 | Sổ kho/audit & đối soát | Q | ✅ | `/lab/audit_trail` (`tabs.ts`); inventory logs | Chưa có sao kê tài chính/commission |
| L10 | Kanban 4 bước / danh sách hàng đợi | Q | ✅ | `WorkshopSettingsView.tsx:92` | UI có, dữ liệu trống (L3) |
| L11 | Doanh thu/đối soát xưởng | Q | ❌ | Không màn nào; chỉ cấu hình commission | — |
| L12 | Nhận thông báo đơn mới | Q | ❌ | Không channel `orders` (3 channel hiện có) | Phải F5 để thấy |

*12 dòng.* ✅ L1,L4,L5,L6,L7,L8,L9,L10 (8) · ⚠️ L2 (1) · ❌ L3,L11,L12 (3).

---

## 5. Quản trị viên (role `admin`)

| # | Tính năng cần | Mức | Hiện có | Bằng chứng | Gap |
|---:|---|---|---|---|---|
| A1 | Tổng quan vận hành (đơn chờ, tồn thấp, KYC) | B | ✅ | `/admin` `:379`; `Group0OverviewPanel`; `AdminDashboardView.tsx:118-124` | Số đếm, chưa phải "hàng đợi hôm nay" |
| A2 | CRUD sản phẩm/catalog | B | ✅ | `/admin/products`; `AdminProductsPanel` | — |
| A3 | Xưởng/đối tác/năng lực | B | ✅ | `/admin/partners`; `Group1WorkshopsPanel` | — |
| A4 | Đội máy in | Q | ✅ | `/admin/machines`; Group1 | — |
| A5 | Designer/hồ sơ/giấy phép/doanh thu | B | ⚠️ | `/admin/designers`; `Group2DesignersPanel` | Không duyệt payout/ledger |
| A6 | Khách hàng/KYC/NDA/RFQ | B | ✅ | `/admin/users`; `Group3CustomersPanel.tsx:85-119` | — |
| A7 | Cấu hình công thức giá + audit | B | ✅ | `/admin/pricing`; `Group4PricingEnginePanel`; `settingsService` | — |
| A8 | Vật liệu/phụ kiện/kho | B | ✅ | `/admin/materials`,`/inventory`; `WarehouseInventoryPanel` | — |
| A9 | Hàng đợi/kanban 8 nấc (xem) | B | ✅ | `/admin/queue`; `Group5ProductionPanel.tsx:26` | — |
| A10 | Điều phối đơn → xưởng (ghi) | **B** | ❌ | tab `dispatcher` `Group5ProductionPanel.tsx:156` | Không ghi `assigned_workshop_id` ⇒ L3 hỏng |
| A11 | CMS trang chủ + SEO | Q | ✅ | `/admin/storefront`, `/admin/seo`; `AdminStorefrontPanel`, `AdminSeoPanel` | — |
| A12 | Cài đặt hệ thống (VAT/ship/ngưỡng…) | B | ✅ | `/admin/settings`; `settingsService` + `setting_audit` | — |
| A13 | Duyệt payout designer | Q | ❌ | Không panel/bảng yêu cầu rút | Designer bị kẹt ở màn trống |
| A14 | Đối soát thanh toán (COD/VietQR) | B | ❌ | `payment_transactions` 0 writer (0 caller `database.ts`); checkout chỉ ghi `orders.payment_status` | Không sổ giao dịch |
| A15 | Đơn realtime (badge/queue) | Q | ❌ | `useOrdersData.ts:44-55` fetch 1 lần theo role; không channel `orders` | Số liệu cũ |

*15 dòng.* ✅ A1,A2,A3,A4,A6,A7,A8,A9,A11,A12 (10) · ⚠️ A5 (1) · ❌ A10,A13,A14,A15 (4).

---

## 6. Điều phối viên / vận hành nội bộ (SUY DIỄN — không role riêng)

| # | Tính năng cần | Mức | Hiện có | Bằng chứng | Gap |
|---:|---|---|---|---|---|
| O1 | Inbox công việc "hôm nay" (đơn/KYC/chat/bảo hành) | B | ❌ | Không màn/route; rải rác ở admin + lab | Không có nguồn sự thật công việc |
| O2 | Gán đơn → xưởng theo năng lực/SLA | B | ❌ | `Group5ProductionPanel.tsx:26` (tab) | Không write (A10) |
| O3 | Theo dõi SLA/tiến độ, cảnh báo trễ | B | ⚠️ | `/admin/queue`, `/lab/queue` (view) | Không cảnh báo/không realtime |
| O4 | Đối soát COD/VietQR | B | ❌ | Không writer `payment_transactions` | — |
| O5 | Duyệt KYC/NDA/workshop | B | ✅ | `Group3CustomersPanel.tsx:85-119`; `Group1WorkshopsPanel` | Chưa có role/queue chung |
| O6 | CSKH/chat & xử lý bảo hành | Q | ⚠️ | `ChatSupportModal.tsx:39-45` auto-bot; bảo hành UI-only | Không ticket/lịch sử/luồng xử lý |
| O7 | Phân loại RFQ/yêu cầu CAD | Q | ✅ | `Group3CustomersPanel` RFQ tab; designer requests | — |
| O8 | Audit thao tác nhân sự | N | ⚠️ | `setting_audit` cho settings; admin actions khác không audit | — |

*8 dòng.* ✅ O5,O7 (2) · ⚠️ O3,O6,O8 (3) · ❌ O1,O2,O4 (3).

---

## 7. Tính năng đã có bảng DB nhưng **không có UI/writer** (đối chiếu nhanh)

| Bảng (32 bảng) | Có writer/reader trong `src/`? | Hệ quả người dùng |
|---|---|---|
| `order_items` | **0 ref** trong `src/` | Không có dòng hàng để chia xưởng/đối soát |
| `order_files` | 0 writer (chỉ comment TODO) | Không bàn giao file CAD |
| `payment_transactions` | 0 caller | Không đối soát thanh toán |
| `cart_items` | **0 ref** | Giỏ không đồng bộ thiết bị |
| `warranty_claims` | 0 writer | Bảo hành không lưu |
| `reviews` | 0 writer (chỉ đọc counter cột sản phẩm) | Không có đánh giá thật |
| `quotes` | `saveQuote` 0 caller | Báo giá không lưu |
| `kyc_records`/`cost_rules` | 0 ref trực tiếp (KYC đọc/ghi qua `user_profiles`; cost rules qua settings) | Chấp nhận được |
| `designer_payout_info` | RPC có, UI ví chưa nối | Designer không cập nhật được tài khoản nhận tiền |

> Kết luận matrix: **UI/khám phá/3D mạnh; dữ liệu hậu-giao-dịch là lỗ hổng chính.**
