> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 11 — Layout tham chiếu & layout mới cho VCUBE

> Trả lời yêu cầu: *"tìm một layout ecommerce liên quan tới 3D để thay đổi"*.
> Nguồn: **fetch trực tiếp 2 site thật** (2026-09-12) + cơ sở dữ liệu UI/UX offline của skill `ui-ux-pro-max`.
> Đây là **đề xuất layout** để duyệt — chưa thi công. Nối tiếp `10-modernization-plan.md` Track B.

---

## 1. Hai nguồn tham chiếu (đã fetch thật, không phải suy đoán)

### A. Craftcloud (All3DP) — https://craftcloud3d.com — **loại "dịch vụ in theo yêu cầu"**
Chuẩn mực cho **trang chủ chuyển đổi** + **luồng báo giá tức thì**. Cấu trúc trang chủ theo đúng thứ tự:

| # | Khối | Nội dung thật |
|---|---|---|
| 1 | **Header** | logo · `Services` `Why` `Materials` `Help` · **`Upload 3D Models` (CTA chính, nổi bật)** · chọn vị trí · `My Models` · `My Cart (0)` · `Sign In` |
| 2 | **Hero** | "Advanced Manufacturing, Made Easy" + H1 dịch vụ + 1 câu phụ + **2 CTA** (`Get instant quotes` chính / `Try it out` phụ) + **3 vi-witness**: "Compare quotes in seconds" · "Ships in 24-48h" · "Your parts, our responsibility" |
| 3 | **Stats band** | 8M+ Parts · 140.000+ Businesses · 200+ Materials · 31 Technologies · 95 Countries |
| 4 | **Logo wall** | NASA · SpaceX · Microsoft · Nvidia · Ford · F1 · Saint-Gobain + Trustpilot |
| 5 | **How it works — 3 bước** | 1) Upload model (35+ định dạng, bảo mật) → 2) Chọn material/finish/color (100+ vật liệu) → 3) Chọn offer tốt nhất từ 150+ đối tác, giao hàng |
| 6 | **Why us** | 4–8 gạch đầu dòng khác biệt + ảnh lớn |
| 7 | **Narrative + CTA** | "Your Partner for Professional Custom Made Parts" + `Talk to our team` |
| 8 | **Explore services** | **4 card dịch vụ có ảnh** (3D Printing · CNC · Casting & Molding · Sheet Metal), mỗi card có mô tả + link nội bộ sâu |
| 9 | **Accessibility narrative** | "Professional Manufacturing for Everyone" + CTA |
| 10 | **Network/global** | mô tả mạng lưới + `Meet our Partners` |
| 11 | **Testimonials** | 6 testimonial (ảnh + tên + chức danh + công ty) |
| 12 | **Logo grid trường đại học** | 75+ (6 logo + ảnh gộp) |
| 13 | **Newsletter** | 1 ô email + `Subscribe` |
| 14 | **Footer lớn** | services · products · company · social · legal (nhiều cột) |

### B. Shapeways — https://www.shapeways.com — **loại "marketplace + dịch vụ B2B"**
Chuẩn mực cho **IA điều hướng theo chuyên môn**. Mega-menu 4 nhóm:

| Nhóm | Cấu trúc |
|---|---|
| **Manufacturing** | *Processes* (SLS, MJF, SAF, SLA, Material Jetting, FDM, Lost Wax, CNC) + *Capabilities* (Quality Checks, Quality Program, First Article Inspection, Spray Painting, Vapor Smoothing, Custom Design, Assembly, Whitelabel Shipping) |
| **Materials** | **Nhóm THEO CÔNG NGHỆ** → 30+ vật liệu (CNC: nhôm/POM-C/inox · FDM: ABS/ASA/PC/PET/PETG/PPA-CF/PPS-CF/TPU/Ultem · Lost Wax: đồng/vàng/bạc/bạch kim · MJF: PA12/PA12GB/PA12 full-color · SAF: PA11/PP · SLS: PA12/PA12-CF/TPE · SLA: Somos…) |
| **Industries** | Medical · Consumer · Robotics · Architecture · Aerospace · Gaming · Drones · Jewelry |
| **About** | About (Who we are, Press, Contact, Sustainability, Help) + Resources (3D Printing, Rapid Prototyping, Case Studies, API, Newsletter) |

Tài khoản: `My Models` · `My Products/View Shop/Shop Sales` · `Quotes` · `Orders` · cart có badge số · empty cart nói thật *"You haven't added any 3D printed products yet."*

### C. Cơ sở dữ liệu UI/UX offline (`ui-ux-pro-max`)
Truy vấn `--design-system` cho "3D printing service marketplace ecommerce technical industrial quoting" trả về:
- **Pattern: "Feature-Rich Showcase"** — phân cấp tính năng rõ, **1 thông điệp/card**, CTA lặp lại; section: Hero (value prop) → Feature grid 4–6 → Use cases → Social proof → CTA. **CTA: hero (sticky) + sau features + cuối trang.** ✅ Dùng được.
- **Key effects:** section lớn (gap 48px+), hover đổi màu rõ, scroll-snap, chữ lớn 32px+, transition 200–300ms. ✅ Dùng được.
- **Anti-pattern cần tránh:** *"Flat design without depth"* và *"Text-heavy pages"*. ✅ Rất đúng với hiện trạng VCUBE (mọi thứ là `bg-white` + viền xám = phẳng, và trang chủ nhiều chữ).
- **⚠️ Bảng màu trả về KHÔNG phù hợp:** DB đề xuất xanh lá `#059669` + cam `#EA580C` + font Rubik/Nunito Sans (hồ sơ "ecommerce tiêu dùng"). VCUBE là **thương hiệu teal công nghiệp**, đã khoá trong `00` §2 và `docs/design/tokens.md`. ⇒ **Giữ teal/navy hiện có + `Be Vietnam Pro`** (font này còn bắt buộc vì dấu tiếng Việt). Chỉ mượn **pattern + effects + anti-pattern + checklist**, không mượn màu/font.
- **Checklist bắt buộc:** không emoji làm icon (dùng SVG/lucide) · `cursor-pointer` mọi phần tử bấm được · hover 150–300ms · tương phản ≥4.5:1 · focus thấy được · `prefers-reduced-motion` · responsive 375/768/1024/1440.
  → **Vi phạm hiện tại:** header dùng **emoji cờ** 🇻🇳/🇺🇸 làm icon chọn ngôn ngữ; body 14px (nên 15–16); tràn ngang ở 390px (đã chứng minh).

---

## 2. Chọn gì cho VCUBE — lai 2 mô hình

VCUBE có **cả hai** loại: **dịch vụ in theo file** (`/quote`) **và marketplace bản vẽ CAD** (`/explore`, `/products`). Vậy:

| Lấy từ | Áp vào VCUBE |
|---|---|
| Craftcloud (header) | **CTA "Tải file 3D" nổi bật trên header** — hiện VCUBE đặt "Báo Giá In 3D" là 1 tab ngang hàng, dễ bị bỏ qua. Đây là thay đổi quan trọng nhất về chuyển đổi |
| Craftcloud (hero) | Hero = value prop + **2 CTA** + dải vi-witness 3 mục |
| Craftcloud (3 bước) | Khối "Cách hoạt động" 3 bước **có ảnh** — thay cho khối `workflowStep*` hiện tại (chỉ chữ) |
| Craftcloud (service cards) | 4 card dịch vụ **có ảnh** → VCUBE: FDM · SLA/Resin · SLS/MJF · CAD/CAM |
| Shapeways (mega-menu) | IA theo chuyên môn: **Vật liệu nhóm THEO CÔNG NGHỆ** + **Ngành** (Y tế, Robot, Kiến trúc, Hàng không, Drone, Gaming, Trang sức, Tiêu dùng) |
| Shapeways (account) | `Mô hình của tôi` · `Báo giá` · `Đơn hàng` · `Cửa hàng` trong menu tài khoản (VCUBE đã có `/orders`, `/assets` — cần gom vào 1 menu) |
| DB UI/UX | Pattern "Feature-Rich Showcase", nhịp section 48–80px, hover rõ, chống "flat without depth" |

### ⛔ KHÔNG bắt chước (vì luật trung thực dữ liệu của chính dự án)
- **Dải stats** (8M+ parts / 140.000+ businesses) và **logo wall** (NASA, SpaceX, Ford…) — VCUBE **không có** số liệu này. `docs/design/data-honesty.md` cấm bịa. ⇒ Khối social proof phải **lấy từ `site_content` và TỰ ẨN khi rỗng**, và chỉ hiện đối tác **có thật trong bảng `workshop_partners`**.
- **Testimonials** giả — chỉ hiện khi admin nhập thật.
- **"Ships in 24-48h"** kiểu cam kết — VCUBE sẽ hiện **lead time tính từ engine**, không hứa cố định.

---

## 3. Wireframe layout mới (đề xuất)

### 3.1 Header (mọi trang) — đổi lớn nhất
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ VCUBE  [Vật liệu ▾] [Ngành ▾] [Kho mẫu CAD] [Bảng giá]   🔍 tìm…   [⬆ Tải file 3D]│
│                                                       VIE|ENG  ♡  🛒2  [Avatar▾]│
└──────────────────────────────────────────────────────────────────────────────┘
```
- `Vật liệu ▾` = mega-menu **theo công nghệ** (như Shapeways).
- **`[⬆ Tải file 3D]` là CTA nổi bật** (filled, màu primary) — không còn tab ngang hàng.
- Bỏ **emoji cờ** → dùng chữ `VIE | ENG` hoặc icon lucide (checklist).
- Breakpoint 390: nav gom vào **bottom sheet**; **không tràn ngang** (đang lỗi).

### 3.2 Trang chủ `/` — theo Craftcloud, bỏ "flat + text-heavy"
```
1  HERO (60–70vh)           H1 value prop · 1 câu phụ · [Báo giá ngay] [Khám phá kho CAD]
                            + 3 vi-witness (Báo giá tức thì · Vật liệu thật · Theo dõi đơn)
2  DẢI SỐ LIỆU THẬT         chỉ hiện số có thật từ DB (số vật liệu/máy in/đối tác); rỗng ⇒ ẩn
3  CÁCH HOẠT ĐỘNG (3 bước)  1 Tải file → 2 Chọn vật liệu/infill → 3 Đặt & theo dõi
                            mỗi bước có ẢNH/MINH HOẠ minh hoạ (thay khối chữ hiện tại)
4  4 CARD DỊCH VỤ           FDM · SLA/Resin · SLS/MJF · CAD/CAM — card CÓ ẢNH, 1 thông điệp/card
5  VẬT LIỆU NỔI BẬT         lưới card vật liệu (ảnh + tên + khoảng giá **từ bảng materials**)
6  KHO MẪU CAD              lưới sản phẩm (ảnh + giá + tác giả) — từ bảng products
7  ĐỐI TÁC / SOCIAL PROOF    chỉ từ `workshop_partners`; rỗng ⇒ **ẩn cả khối**
8  CTA CUỐI                 "Tải file đầu tiên của bạn" + nút
9  FOOTER nhiều cột         Dịch vụ · Vật liệu · Tài nguyên · Công ty · Liên hệ (+ hotline thật)
```
Bỏ hẳn: khối "panel HUD tối" giữa trang sáng hiện tại, các vi-witness bịa (`±0.05 MM`, `GIAO HÀNG 24H`, `ISO/ASTM 52900`).

### 3.3 Danh mục `/explore` — marketplace thật
```
┌ Bộ lọc dọc (sticky)          ┐┌ Thanh công cụ: [sắp xếp ▾] [dạng lưới|bảng]  1–24 / N ┐
│ Công nghệ (checkbox)         ││ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐            │
│ Vật liệu (nhóm theo CN)      ││ │ card  │ │ card  │ │ card  │ │ card  │  + phân trang │
│ Khoảng giá (2 đầu)           ││ └───────┘ └───────┘ └───────┘ └───────┘            │
│ Ngành · Đánh giá · Tác giả   ││                                                     │
└──────────────────────────────┘└─────────────────────────────────────────────────────┘
```
- **Trạng thái rỗng thật** ("Chưa có sản phẩm nào — admin nhập ở /admin") — hiện `/explore` **thiếu**.
- Filter state lên **URL** (đang thiếu) để chia sẻ/back được.

### 3.4 Trang sản phẩm `/products/:id`
```
┌ Ảnh/3D viewer lớn (60%)            ┐┌ Tên · tác giả · giá **thật** · đánh giá        ┐
│  + thumbnail + nút xoay/zoom       ││ [Mua bản vẽ] [In theo yêu cầu]  ← 2 CTA rõ      │
└────────────────────────────────────┘│ Thông số (bảng) · Vật liệu hỗ trợ · Giấy phép   │
                                      │ Tabs: Mô tả · Thông số · Bình luận             │
                                      └────────────────────────────────────────────────┘
```
- 2 nhánh **rõ ràng**: mua file (bản quyền) vs đặt in (dịch vụ) — hiện đang lẫn.

### 3.5 Trang báo giá `/quote` (dark) — **cốt lõi, phải tốt nhất**
```
┌ Upload (kéo–thả) — 1 dropzone DUY NHẤT (bỏ dropzone thứ 2 trong canvas) ──────────────┐
└───────────────────────────────────────────────────────────────────────────────────────┘
┌ VIEWPORT 3D (glass chrome)              ┐┌ RAIL PHẢI **STICKY** = "vì sao giá này"  ┐
│  trái-trên: tên part + W×D×H mm         ││  Giá chốt · breakdown (nhựa g×đ/g, giờ máy,│
│  phải-trên: Iso|Front|Top (segmented)   ││  nhân công, hậu kỳ, đóng gói, dự phòng)   │
│  trái-dưới: đơn vị + scale              ││  Tham số cắt lớp (MỘT cụm, không lặp)     │
│  phải-dưới: zoom ± · fit · reset        ││  Chọn gói · lead time = **ngày cụ thể**   │
└─────────────────────────────────────────┘│  Dòng VAT + đơn vị mm cạnh giá            │
                                           │  [Thêm vào giỏ]                          │
                                           └──────────────────────────────────────────┘
```
- 390px: giá **lên trên** (sticky bottom bar), không nằm sau 2.100px cuộn.
- **1 cụm tham số duy nhất** (hiện render 2 lần ở panel trái và panel phải).
- Mọi số đều **thật** hoặc hiện "chưa cấu hình" (A11 đã làm phần rỗng).

### 3.6 Hướng dẫn vật liệu `/materials` — **trang còn thiếu, nên thêm**
Theo Shapeways: vật liệu **nhóm theo công nghệ**, mỗi vật liệu có: ảnh mẫu in · độ bền · nhiệt độ · ứng dụng · giá tham chiếu (**từ DB**) · nút "In với vật liệu này" (deep-link sang `/quote` đã chọn sẵn).

### 3.7 `/admin` (dark) — từ 15 panel rời rạc → **app shell 5 nhóm**
```
┌ SIDEBAR (cố định)      ┐┌ TOPBAR: breadcrumb · [tìm] · thông báo · health chip ┐
│ ▸ Tổng quan            ││ ┌ HEALTH CARD: sản phẩm / vật liệu / máy in / đơn   ┐│
│ ▸ Vận hành             ││ │  cái nào = 0 ⇒ cảnh báo + nút "Nhập ngay"          ││
│   Đơn · Hàng đợi · Kho ││ └───────────────────────────────────────────────────┘│
│ ▸ Danh mục & Giá       ││ ┌ DataTable (density 36/44, sort + lọc + phân trang  ┐│
│   Sản phẩm · Vật liệu  ││ │  + chọn nhiều + bulk action)                       ││
│   Máy in · Công thức   ││ │  loading = skeleton · empty = EmptyState + CTA     ││
│ ▸ Khách & Đối tác      ││ │  error = nguyên nhân + retry                        ││
│ ▸ Cấu hình             ││ └───────────────────────────────────────────────────┘│
└────────────────────────┘└─────────────────────────────────────────────────────┘
```
Mọi thao tác sửa qua `Modal`/`Sheet` primitive; xoá qua `ConfirmDialog`; **100% input có `<label>`** (hiện 1/167).

---

## 4. Việc "thay đổi" cụ thể so với hiện tại

| # | Hiện tại | Thay bằng | Vì sao |
|---|---|---|---|
| 1 | CTA tải file là **tab ngang hàng** trong nav | **Nút filled trên header**, cạnh giỏ hàng | Craftcloud đặt CTA này ở header; giảm 1 bước vào luồng tiền |
| 2 | Trang chủ: hero + **panel HUD tối** + metrics giữa trang sáng, nhiều chữ | Hero → 3 bước có ảnh → 4 card dịch vụ có ảnh → lưới thật → CTA | Đúng pattern "Feature-Rich Showcase", tránh "text-heavy" + "flat" |
| 3 | Nav phẳng 2 tab | **Mega-menu Vật liệu theo công nghệ + Ngành** | Shapeways: người dùng tìm theo công nghệ/ngành, không theo tên vật liệu |
| 4 | Không có trang vật liệu | **`/materials`** + deep-link sang `/quote` | Trang SEO + chuyển đổi lớn nhất của ngành |
| 5 | `/quote`: 2 cụm tham số, giá nằm sau 2.100px ở mobile, dropzone ×2 | 1 cụm · rail phải sticky · 1 dropzone | Đây là trang tạo doanh thu |
| 6 | `/explore`: không có empty state, filter không lên URL | Empty thật + filter trong URL + phân trang | Chia sẻ/back được; tránh màn hình trống vô nghĩa |
| 7 | `/admin`: 15 panel, 10 `<table>` tự viết, 1 `htmlFor`/167 input | App shell 5 nhóm + `DataTable` + `Modal` + `Form` có nhãn | Vùng tệ nhất; cũng là nơi admin nhập mọi dữ liệu |
| 8 | Social proof: chuỗi bịa | Từ `site_content`/`workshop_partners`, **rỗng ⇒ ẩn** | Luật trung thực dữ liệu |
| 9 | Emoji cờ 🇻🇳🇺🇸 làm icon | Chữ `VIE | ENG` hoặc icon lucide | Checklist: không emoji làm icon |
| 10 | Body 14px, icon 14px | Body 15px, icon ≥18px | DB checklist + ảnh chụp cho thấy icon 14px thành "vệt đen" |

---

## 5. Việc cần chốt trước khi thi công

1. **Duyệt layout ở §3** (đặc biệt: mega-menu Vật liệu theo công nghệ, CTA tải file trên header, thêm trang `/materials`).
2. **Duyệt việc lai 2 mô hình** — VCUBE vẫn là *vừa dịch vụ in vừa marketplace*, hay muốn tách rõ 2 nhánh (một storefront bán file, một cổng dịch vụ in)?
3. **Xác nhận không bắt chước stats/logo/testimonial bịa** (§2 ⛔) — đúng luật dự án.
4. **Thứ tự thi công** theo `10-modernization-plan.md`: Track A (theme) → E (test) → B (layout này) → C (liên kết) → D (perf).

---

## 6. Nguồn tham chiếu C — ảnh UI "NEXORA" (chủ dự án gửi 2026-09-12)

Ảnh landing page thương mại điện tử thiết bị công nghệ. Dưới đây là **spec rút ra được** (số là **ước lượng đọc từ ảnh**, không phải đo pixel) + **cái nào áp được cho VCUBE**.

### 6.1 Cấu trúc 8 khối (thứ tự)

| # | Khối | Đặc điểm |
|---|---|---|
| 1 | **Header nổi** | logo trái · nav giữa (4 mục, chữ thường) · **1 pill button "Shop Now" + badge tròn mũi tên** phải. Không có thanh nền — header bay trên hero |
| 2 | **Rail icon dọc bên trái** | capsule trắng nổi, 5 icon (nhà · lưới · hộp · tai nghe · tài khoản). **Pattern rất đặc trưng**, hiếm site dùng |
| 3 | **Hero 2 cột lệch** | trái 45%: eyebrow có icon + H1 **3 dòng** (dòng giữa gradient tím) + subcopy 3 dòng + **1 CTA pill màu chanh có badge tròn đen**. Phải 55%: collage sản phẩm trên **đĩa gradient tím nhạt** + hoạ tiết chấm bi, sản phẩm nổi có bóng mềm |
| 4 | **Dải "BUILT FOR THE FUTURE"** | **panel navy bo góc lớn**, 4 cột: icon outline (màu chanh) + tiêu đề đậm + 2 dòng mô tả. Đây là khối "khác biệt" |
| 5 | **"EXPLORE OUR TOP PICKS"** | tiêu đề trái (2 dòng + gạch nhấn) + **carousel ngang** 4 card. Card = **ô xám nhạt bo góc chứa ảnh** + tên + giá + **nút tròn chanh mũi tên** góc phải-dưới. Có nút prev/next tròn (next = tròn đen đặc) |
| 6 | **Dải số liệu** | **panel tím** bo góc, 4 mục: icon + số lớn + nhãn |
| 7 | **Testimonial + CTA** | nền navy, chia 2: trái ảnh người đeo VR tràn viền (duotone tím) · phải: dấu ngoặc kép lớn + câu quote + tên/chức danh + **card "glass" viền 1px sáng** chứa CTA chanh |
| 8 | (dưới, bị cắt) | chưa thấy footer |

### 6.2 Ngôn ngữ thị giác (ước lượng)

| Khía cạnh | Giá trị đọc được | Ghi chú |
|---|---|---|
| **Nền** | trắng ngả tím rất nhạt (`~#F7F5FF`) | không dùng trắng tuyệt đối |
| **Surface tối** | navy đậm (`~#12102E` / `~#1A1740`) | dùng cho **2 khối band** |
| **Accent phụ** | gradient tím→lavender (`~#7C5CFF` → `~#B9A8FF`) | chỉ ở chữ H1 + đĩa hero + dải số liệu |
| **CTA duy nhất** | chanh (`~#D8F63C`) | **chỉ dùng cho hành động** — không dùng cho nền/trang trí |
| **Icon** | outline, stroke ~1,75–2px; navy trên nền sáng, chanh trên nền tối | **không có emoji** |
| **Radius** | pill (nút) · **card 20–24px** · **panel lớn 28–32px** · badge tròn 9999 | bo rất lớn, nhất quán |
| **Card** | **ô xám nhạt, KHÔNG viền** | phân tách bằng **fill**, không bằng border |
| **Độ sâu** | bóng mềm bán kính lớn; sản phẩm nổi; hoạ tiết chấm bi làm accent | |
| **Chữ** | H1 ~56–64px weight 800, tracking chặt; eyebrow 11px uppercase giãn chữ; body ~15–16px; giá đậm | phân cấp rất rõ |
| **Nhịp** | gap giữa section ~80–100px; mỗi section một "chất nền" khác nhau (sáng → navy → sáng → tím → navy) | tạo nhịp bằng **đổi surface**, không bằng đường kẻ |
| **Nhãn nút** | luôn UPPERCASE + badge tròn mũi tên bên trong | 1 công thức nút duy nhất |

### 6.3 Bảy kỹ thuật đáng học — và nó sửa đúng vấn đề nào của VCUBE

| # | Kỹ thuật | Sửa vấn đề đo được của VCUBE |
|---|---|---|
| 1 | **Phân tách card bằng FILL, không bằng viền** | VCUBE: **1.502** class `border-slate-*` + `bg-white` khắp nơi → *"Flat design without depth"* |
| 2 | **Một màu CTA duy nhất, không dùng cho gì khác** | VCUBE dùng teal cho CTA **và** cho link/viền/nền/badge → CTA không nổi |
| 3 | **Nhịp section bằng cách ĐỔI SURFACE** (sáng ↔ navy ↔ tím) | VCUBE gần như chỉ có 1 nền sáng + vài panel tối hardcode |
| 4 | **Radius lớn và nhất quán** (card 20–24, panel 28–32) | VCUBE đang **6px** (chủ dự án đã chốt giữ); đây là điểm khác biệt thị giác lớn nhất |
| 5 | **Icon outline đồng nhất, không emoji** | VCUBE header còn **emoji cờ** 🇻🇳🇺🇸; icon 14px thành "vệt đen" |
| 6 | **1 công thức nút duy nhất** (pill + badge tròn) | VCUBE có 3 công thức nút khác nhau + 7 nút gradient (Stage B vừa bỏ gradient) |
| 7 | **Khối "khác biệt" là panel tối 4 cột, không phải đoạn văn** | VCUBE đang có khối `workflowStep*` **chỉ chữ** (anti-pattern "text-heavy") |

### 6.4 Bốn điểm **KHÔNG** copy được cho VCUBE

| # | Điểm | Lý do |
|---|---|---|
| 1 | **Số liệu social proof**: "2.5M+ Happy Customers", "98% Satisfaction Rate", "120+ Premium Products" | Vi phạm `docs/design/data-honesty.md`. VCUBE chỉ hiện số **đếm được từ DB**, rỗng ⇒ **ẩn khối** |
| 2 | **Chữ gradient** cho H1 (`EMPOWERS`) | Tụt tương phản, không kiểm được bằng `check-contrast`; `tokens.md` §1 cấm truyền đạt bằng màu |
| 3 | **Chữ xám nhạt trên nền sáng** (subcopy hero, mô tả trong band navy) | Ước lượng dưới 4.5:1 — đúng lỗi `#94A3B8` mà dự án đã loại |
| 4 | **Tím + chanh làm bản sắc** | Đây là ngôn ngữ "gadget tiêu dùng"; VCUBE là **cơ khí chính xác B2B**, đã khoá teal/navy trong `00` §2 |

### 6.5 Áp vào VCUBE — điều chỉnh so với `10-modernization-plan.md` §3

| Hạng mục | `10` §3 đã đề xuất | **Cập nhật theo ảnh này** |
|---|---|---|
| Radius card | 16px | **20px** (panel lớn 28px) |
| Radius control | 10px | **12px**; nút = pill 9999 |
| Nút | 3 biến thể | **1 công thức: pill + badge tròn mũi tên**, biến thể chỉ đổi màu |
| Card | `surface` + viền `line` | **bỏ viền**, dùng `surface-muted` làm ô chứa ảnh; viền chỉ khi cần phân tách thật |
| Nhịp section | 64–80px | **80–100px**, và **đổi surface** giữa các section (sáng → `surface-inverse` → sáng → `accent-tint` → `surface-inverse`) |
| CTA | "1 màu nhấn" | **Siết: màu CTA chỉ dùng cho hành động**; link/viền/badge dùng `fg`/`line`/`accent` |
| Hero | 2 CTA | **1 CTA chính (pill lớn) + 1 link phụ** — đúng công thức ảnh |
| Khối khác biệt | feature grid | **panel `surface-inverse` 4 cột**, icon outline màu `accent` |
| Số liệu | dải stats thật | giữ, nhưng **panel `accent`-tint** để tạo nhịp, và **ẩn khi rỗng** |

### 6.6 Pattern riêng của ảnh có thể dùng cho `/quote`
**Rail icon dọc bên trái** (capsule nổi) → dùng làm **dock công cụ** cho viewport 3D: thay vì 11 nút toolbar ngang hiện đang bị cuộn khuất ở 390px, chuyển thành **dock dọc 48px** cố định bên trái, có tooltip + `aria-label`, mở rộng khi cần. Giải đúng vấn đề `03` §1.5 mục 38 (toolbar 11 nút `overflow-x-auto` không có affordance cuộn).
