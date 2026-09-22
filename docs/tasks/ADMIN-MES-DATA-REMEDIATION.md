# Runbook — Khắc phục Audit Admin & Partner MES

> Nguồn: audit 20 ảnh giao diện (2026-09). **Nguyên tắc**: repo hiển thị TRUNG THỰC trạng thái
> "chưa cấu hình" — phần lớn mục audit là **dữ liệu nghiệp vụ chủ dự án cần nhập**, KHÔNG phải bug.
> Tuyệt đối **không bịa** MST/SKU/geo/tồn kho/tham số (vi phạm `check-fabricated` + data-honesty).

## A. Việc CODE đã xử lý trong đợt này

| # | Việc | Trạng thái |
|---|---|---|
| A1 | **Tự động trừ kho khi đơn hoàn thành**: `WorkshopService.updateMyOrderProgress` gọi `deductMaterialsForCompletedOrder` khi `status='completed'`. Chỉ trừ item khai `weightGrams > 0` và khớp tên vật liệu xưởng (so khớp chứa, vd `"PLA ([MẪU] Prusa MK4)"` khớp `"PLA"`); trừ `weight × quantity`; ghi phiếu `Export` vào Sổ kho; item thiếu khối lượng ⇒ bỏ qua (không bịa). Toast ở `/lab` báo số đã trừ / bỏ qua. | DONE |
| A2 | **Nguồn khối lượng**: `QuoteSummaryPanel` truyền `breakdown.totalFilamentGrams` vào `CartItem.weightGrams`; `CheckoutView` ghi vào `order.items[].weightGrams`; `saveOrder` lưu nguyên mảng jsonb. ⇒ Đơn tạo từ `/quote` tự có khối lượng để trừ kho. | DONE |

> **Kiểm chứng**: thêm báo giá vào giỏ tại `/quote` → `vcube_cart_store` có `"weightGrams":12`. Vật liệu trong đơn lưu dạng `"PLA ([MẪU] Prusa MK4)"`, khớp vật liệu xưởng tên `PLA` bằng so khớp chứa.


## B. Việc DỮ LIỆU — nhập tại màn admin tương ứng

Ưu tiên theo lộ trình 4 bước. Mỗi dòng: mục audit → màn → trường cần nhập.

### Bước 1 — Mạng lưới trạm in (mở khoá điều phối)
| Mục audit | Màn | Nhập gì |
|---|---|---|
| 0 Hubs, đơn "Chưa điều phối trạm xưởng" (mục 8, 17, 18, 19) | Admin → **Xưởng in & Thiết bị** (`/admin/partners` / `/admin/workshops`) | Tạo ≥1 **trạm/hub**: tên, địa chỉ, khu vực, `partner_id`; gán `user_id` chủ xưởng |
| Máy in chưa gắn trạm sở hữu (mục 3, 9) | Admin → **Đội máy in** (`/admin/machines`) | Gắn `assigned_workshop_id` cho từng máy |
| Geo-Dispatcher không nhận dạng (mục 5) | Admin → hồ sơ xưởng / `/lab/preferences` | Nhập **địa chỉ + khu vực (tỉnh/geo)** cho xưởng |
| Nút điều phối bị gỡ khi 0 Hub (mục 18) | — | Hệ quả của B1: có Hub ⇒ nút điều phối hoạt động trở lại |

### Bước 2 — Chuẩn hoá kho & catalog
| Mục audit | Màn | Nhập gì |
|---|---|---|
| ABS Demo / PC Demo thiếu giờ + tồn (mục 13, 15) | Admin → **Định giá → Nhựa & Resin** (`/admin/materials`) | Số giờ/khấu hao, `stock`, ngưỡng cảnh báo |
| Phụ kiện hết/sắp hết: Ốc cấy M3 (12), Túi zip (8) (mục 14) | Admin → **Phụ kiện** (`/admin/accessories`) | Nhập thêm tồn (vd +100, +50) — hoặc tại `/lab/accessories` |
| Catalog 11 sản phẩm chưa có SKU (mục 10, 20) | Admin → **Sản phẩm & Catalog** (`/admin/products`) | Nhập **Mã SKU** từng sản phẩm (cột "Mã SKU") |

> SKU cố ý KHÔNG tự sinh (`AdminProductsPanel.tsx:31`) — admin tự nhập để tránh mã giả.

### Bước 3 — Động cơ giá & BOM
| Mục audit | Màn | Nhập gì |
|---|---|---|
| "CHƯA ĐỦ CẤU HÌNH ĐỂ TÍNH GIÁ – 6 thông số" (mục 12, 16) | Admin → **Định giá Inkiri** (`/admin/pricing`) + Estimator | Đơn giá **điện**, **lương KTV/giờ**, **phí nền tảng %**; tại Estimator: chọn **máy + nhựa mặc định**, nhập **khối lượng (g)**, **thời gian in (giờ)**, **số lượng** |

### Bước 4 — Pháp lý, CMS, SEO
| Mục audit | Màn | Nhập gì |
|---|---|---|
| Pháp lý trống (mục 20) | Admin → **Cài đặt** (`/admin/settings`) | Tên pháp nhân, **MST**, địa chỉ xuất hoá đơn, hotline, email, điều khoản bảo hành |
| SEO thiếu OG/Canonical/Schema (mục 20) | Admin → **SEO & Metadata** (`/admin/seo`) | URL ảnh OG, Canonical URL, bật Schema.org |
| Dashboard hiện `[MẪU]` (mục 7) | — | Là dữ liệu demo đang seed. Nhập dữ liệu thật (B1–B4) rồi xoá seed: `/admin` → "Đồng Bộ DB", hoặc `scripts/seed-sample-data.mjs --remove` |

## C. Mục audit KHÔNG phải bug (đã kiểm chứng)
- **"Nút đồng bộ trạng thái còn trống"** (mục 1): thực ra là **chip trạng thái** "Đồng Bộ Thời Gian Thực" (`WarehouseInventoryPanel.tsx:462`) — không phải nút bấm.
- **Trạng thái "Chưa điều phối / Chưa khai tồn / Chưa có SKU"**: thông điệp trung thực, đúng thiết kế.
- **Estimator báo thiếu cấu hình**: chặn tính giá khi thiếu tham số — đúng luật pricing engine.

## D. Còn tồn (cần quyết định sau)
- **`layerProgress` treo** (mục 2): phụ thuộc máy in thật báo tiến độ; hiện chỉ xưởng nhập tay.
- **Biểu đồ hiệu suất máy + chi phí hao mòn đầu phun/điện** (mục 1, 6): cần trường dữ liệu mới trong DB + màn nhập.
