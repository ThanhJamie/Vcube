> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 15 — Audit UI/UX hiện trạng (đo bằng Playwright/Edge, 2026-09-12)

Mục đích: có **bằng chứng đo được** trước khi sửa theme admin + UI/UX landing/catalog. Mọi con số dưới đây lấy từ `pwtest/ui-audit/` (script `pw-ui-audit.cjs` + `pw-ui-audit2.cjs`) và ảnh chụp thật, không phải phỏng đoán.

---

## 1. 🔴 Tràn ngang trên mobile — lỗi nặng nhất, mọi route

| Route | `scrollWidth` | `clientWidth` | Dư |
|---|---:|---:|---:|
| `/` @390px | 608 | 390 | **+218px** |
| `/explore` @390px | 608 | 390 | **+218px** |

**Tại sao:** header **không thu gọn** ở 390px. Ảnh `b1-landing-390.png` cho thấy `VCUBE VIETNAM | VIE | ENG | 🛒 | Đă…` — nút **"Đăng ký" bị cắt cụt** ở mép phải và cả trang bị đẩy rộng ra. Đây là lỗi *trước = sau* qua nhiều đợt (A19 từng ghi `+178px`), nay đo lại là **218px**.

---

## 2. Admin: hai "khung" chồng lên nhau

Ảnh `c1-admin-overview.png` (1440×900, `html.dark=true`, `bodyBg=rgb(8,13,22)` — **theme tối đang chạy đúng**):

- **Thanh điều hướng storefront vẫn nằm TRÊN khung admin**: `Kho Mẫu CAD · Báo Giá In 3D · Đơn Hàng · Studio Thiết Kế [CREATOR] · Quản Trị Admin [FORGE] · VIE|ENG · ô tìm kiếm · AD`. ⇒ Ứng dụng admin đang có **2 tầng chrome**, tốn ~72px chiều cao và gây rối định hướng.
- **Nhãn sidebar bị cắt chữ** vì badge chiếm chỗ: `Khách Hàng & Hồ Sơ K…`, `Công Thức Giá In…`, `Nhà Thiết Kế & Bản …`.
- **Badge jargon** (cùng loại `GROUP n` đã dọn ở breadcrumb nhưng còn ở dạng badge): `KPIs` · `Bản Quyền` · `B2B/B2C` · `v3.4 Inkiri` · `BOM` · `MES` · `SERP` · `CREATOR` · `FORGE`.
- **Badge số `0`** trên `Danh Mục Nhựa & Resin` và `Phụ Kiện, Ốc Cấy & Nam Châm` — đúng (dữ liệu thật) nhưng là **nhiễu thị giác**.
- **Tiêu đề trùng**: tiêu đề khối `Bảng Điều Khiển Trung Tâm` (vùng header) **và** `Tổng Quan Điều Hành Hệ Sinh Thái VCUBE` (tiêu đề panel) — hai H1/H2 tranh nhau.
- **Panel rỗng chiếm ~400px** với icon trung tâm **rất mờ** (nợ đã ghi từ Đợt 5): "Chưa có dữ liệu cơ cấu chi phí" + nút "Mở cấu hình giá".
- Widget chat `TRỢ LÝ TỰ ĐỘNG` **đè lên** nội dung ở góc dưới–phải, trên **cả** admin lẫn storefront.
- Có một **đường kẻ teal mảnh chạy hết chiều ngang** ngay dưới thanh header (cả `/` lẫn `/admin`) — cần xác định nguồn (có thể là thanh tiến trình luôn hiện).

Toàn bộ 17 mục sidebar hiện tại (đo từ DOM):
```
 1. Tổng Quan Điều Hành [KPIs]        10. Hàng Đợi & Kanban 8 Nấc [MES]
 2. Mạng Lưới Xưởng In MES            11. Đơn Hàng & Điều Phối Hub
 3. Đội Máy In 3D (Fleet)             12. Kho Vật Liệu & Vị Trí Kệ
 4. Nhà Thiết Kế & Bản Quyền [Bản Quyền]  13. Sản Phẩm & Catalog 3D [0]
 5. Khách Hàng & Hồ Sơ KYC [B2B/B2C]  14. Landing Page & CMS
 6. Công Thức Giá Inkiri v3.4 [v3.4 Inkiri]  15. Quản Trị SEO & Metadata [SERP]
 7. Danh Mục Nhựa & Resin [0]         16. Cài Đặt Xưởng & Cloud
 8. Phụ Kiện, Ốc Cấy & Nam Châm [0]   17. Xem Cửa Hàng
 9. Báo Giá Dự Toán BOM [BOM]
```

---

## 3. Landing `/` — điểm yếu thị giác

Ảnh `a1-landing.png` (1440×900, light, `bodyBg=rgb(248,250,252)`):

- Hero nhìn **ổn và hiện đại**: heading 3 dòng rất lớn, nhấn teal, panel 3D tối bên phải, CTA pill.
- ❌ **Dải 3 thẻ số liệu trống**: `Dung Sai Đo Kiểm / Thời Gian Bàn Giao / Tiêu Chuẩn Sản Xuất` đều `Chưa cấu hình` ⇒ **một hàng 3 thẻ chết** chiếm chiều ngang dưới hero. Trung thực nhưng **UX kém**: nên gộp thành một dòng gọn hoặc ẩn khi chưa cấu hình.
- ❌ Dải `DUNG SAI CAM KẾT · Chưa cấu hình · Nhập ở /admin` nằm rời rạc ngay dưới panel 3D, trông như phần tử lạc.
- ❌ **Khoảng trắng lớn** cuối hero (nội dung hết ~y=790, panel trống tới y=900).
- ❌ Ô tìm kiếm trên header **bị cắt** ở 1440px (`Tìm linh kiện, tag (vd: 2/9, IoT, Gear)...` cụt mép phải).
- Ở 390px: hero dồn thành 1 cột, CTA xếp dọc (tốt), nhưng 3 thẻ `Chưa cấu hình` **xếp dọc chiếm gần 1 màn hình**.

---

## 4. Catalog `/explore` — dữ liệu bịa VẪN HIỆN, và gate cũ bỏ sót

Ảnh `a2-catalog.png` (1440×900, light). Bố cục: hero + dải chip tag + cột lọc trái + khu kết quả. Bố cục hợp lý; **nội dung thì sai**:

| Chuỗi đang hiện | Vấn đề |
|---|---|
| `Hơn 0 bản vẽ cơ khí chính xác được kiểm định ứng suất, đạt chuẩn Watertight 100%…` | Vừa **vô nghĩa** ("Hơn 0") vừa là **tuyên bố kỹ thuật bịa** |
| `Đạt chuẩn Watertight 100%` (mục checkbox lọc) | Tuyên bố bịa |
| `Hiển thị 0 / 0 bản vẽ cơ khí **đạt chuẩn**` | Ngụ ý có tiêu chuẩn kiểm định |
| `(142) (88) (64) (119) (53) (37)` — số lượng theo danh mục | **Số bịa từ fixture `cat.count`** (nợ #39). DB `products = 0` ⇒ phải là 0 hoặc ẩn |
| Chip `🇻🇳 Đại Lễ 2/9` + badge `HOT` | **Emoji cờ** + chiến dịch **không tồn tại** (O3 đang xử lý) |
| Bộ lọc `PLA Tough / PETG / ABS / Resin 8K / TPU / Nylon PA12` | DB `materials = 0` ⇒ lọc theo vật liệu **không tồn tại** |
| `Tối đa: 600.000 đ` (khoảng giá) | Ngưỡng cứng, không suy từ dữ liệu |
| `SUPABASE CATALOG SYNC` + "được đồng bộ trực tiếp từ cơ sở dữ liệu Supabase" | Khối giải thích kỹ thuật lộ ra cho khách |

**🔴 Gate của coordinator đã bỏ sót `Watertight`** vì tôi grep **viết hoa** `WATERTIGHT`. Xác minh lại bằng grep **không phân biệt hoa/thường** mới thấy. ⇒ Phải sửa chính bộ gate, không chỉ sửa code.

**Catalog hiện có 0 sản phẩm** (`cards: 0`, `imgs: 0`, `products = 0` trong DB). Nghĩa là:
- Không thể đánh giá/thiết kế **lưới thẻ sản phẩm** bằng mắt nếu không có dữ liệu.
- Chỉ đánh giá được **empty state + bố cục + bộ lọc**.

---

## 5. Việc cần chốt trước khi thi công

1. **Hướng theme admin**: giữ dark-first và *đánh bóng* (bỏ chrome storefront trùng, dọn badge, sửa cắt chữ, sửa panel rỗng) — hay đổi hướng thị giác khác?
2. **Dữ liệu để thiết kế catalog**: hiện `products = 0`. Muốn thấy lưới thẻ thật thì phải có sản phẩm — seed vài bản ghi **ghi rõ là mẫu**, hay chờ chủ dự án nhập sản phẩm thật?
3. **Ngôn ngữ admin**: chủ dự án dán nhãn tiếng Anh (`Production Operations` / `Warehouse Inventory & Bins`) ⇒ cần biết admin nên mặc định **VN** hay **EN**.
