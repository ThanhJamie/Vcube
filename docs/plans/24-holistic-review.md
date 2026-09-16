> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 24 — Review tổng thể: quay về cốt lõi

> Lập 2026-09-21. Tài liệu này **thay thế** cách làm việc theo danh sách 51 mục ở `22-backlog-and-decisions.md`.
> Lý do: danh sách đó đúng về chi tiết nhưng **sai về thứ tự ưu tiên** — nó khiến anh phải giải 51 việc nhỏ trong khi cốt lõi sản phẩm còn một khoảng trống lớn chưa ai gọi tên.
> Toàn bộ số liệu dưới đây **đo lại trên cây hiện tại**, không chép từ trí nhớ.

---

## §1. Cốt lõi sản phẩm — nói lại bằng một câu

**VCUBE là chợ 3 bên cho in 3D: khách cần in/tìm file · designer bán sản phẩm số · xưởng in nhận việc in — và nền tảng của anh đứng giữa ăn phí ở cả 3 đầu, đồng thời tự bán sản phẩm của mình.**

Vòng lặp giá trị phải chạy được trọn vẹn:

```
Khách  →  tìm file / tải file lên  →  báo giá  →  đặt in  →  nhận hàng
Designer  →  đăng bán file         →  có người mua        →  nhận tiền bản quyền
Xưởng in  →  khai năng lực          →  nhận đơn           →  báo tiến độ  →  nhận tiền công
Nền tảng  →  ăn phí 3 đầu  +  tự bán sản phẩm của mình    →  đối soát được
```

Câu hỏi để phán mọi việc từ nay: **việc này có làm vòng lặp trên chạy được, hoặc làm nó đẹp/mượt hơn không?** Nếu không → hoãn.

---

## §2. Bản đồ: cái gì có thật, cái gì trống

| Hạng mục | Trạng thái đo được |
|---|---|
| Hạ tầng dữ liệu (schema + RLS) | **28 bảng · 79 policy · 5 storage policy**; `verify-rls` **9 PASS / 0 FAIL**; anon không đọc được `orders`, hồ sơ `Pending` **0 dòng** |
| Mã nguồn | gate **XANH toàn bộ**: `lint` 0 · `build` 0 · `check-contrast` 0 · `check-fabricated` 0 (SACH) · `a8-sql-syntax-check` 0 · `lint-rls-sources` 0 · `lint-rls-migration` 0 |
| **Dữ liệu trong DB** | 🔴 **TRỐNG**: `products` · `materials` · `printer_fleet` · `accessories` · `orders` = **0 hàng**. Chỉ có 4 `user_profiles`, 1 `site_content`, 1 hàng giá cấu hình, 1 hồ sơ xưởng (`ws-test-01`, Verified) |
| Đường khách | có: storefront → `/quote` → cart → checkout → order tracking → invoice (cấu trúc đủ) |
| Đường designer | có `/designer` (dashboard, đăng bán, royalty) — **chưa có shell/điều hướng SaaS** |
| Đường xưởng | `/lab` vừa mở (W1a): phân quyền 5/5 PASS, wizard RED→GREEN, hàng đợi việc đọc DB thật |
| **Tầng nền UI Modern SaaS** | D1 **đã xong**: token mới (bán kính 6/8/12/16/14/9999, body 14px) + **7 primitive mới 991 dòng** (`AppShell`, `SideNav`, `Topbar`, `PageHeader`, `Section`, `Toolbar`, `KeyValue`) — **nhưng chưa áp vào trang nào** |
| **Migration trên production** | 🔴 **CHƯA DÁN**. `apply_all_manual.sql` hiện **2810 dòng**, md5 `aaf5cfa83ff4204f22f29dd16b6ba535`. Trên production vẫn thiếu `reviews`/`digital_assets`/`cart_items` (PGRST205) |
| **Mô hình doanh thu** | 🔴 **Xem §3 — đây là khoảng trống lớn nhất** |

---

## §3. 🔴 KHOẢNG TRỐNG LỚN NHẤT: mô hình doanh thu 3 bên chưa tồn tại

Anh nói ở ý (2): *"admin vừa nhận được lợi phí từ 3 bên vừa có thể bán các sản phẩm"*. Tôi đã đọc schema và đây là sự thật:

### 3.1 Những gì ĐANG có
| Nơi | Trường | Ý nghĩa |
|---|---|---|
| `pricing_global_settings` | `marketplace_fee_percent` (mặc định 8%), `marketplace_fixed_fee_vnd` (5000) | **một** khoản phí sàn duy nhất |
| `designer_profiles` | `royalty_percent` (mặc định 10%) | bản quyền cho designer — theo **từng** designer |
| `payment_transactions` | `amount`, `status`, `payment_gateway` | số tiền **tổng**, không chia |
| `cost_rules` · `pricing_configs` | `config jsonb` | thùng rỗng linh hoạt, **chưa dùng** cho phí |
| `PricingConfigPanel` (client) | `platformCommissionPercent`, `designerRoyaltyPercent` | nằm trong **`InkiriCostFormulaConfig` trên client** |

### 3.2 Bốn lỗ hổng cụ thể
1. **Thiếu phí phía XƯỞNG IN.** Có phí sàn + bản quyền designer = **2 đầu**, không phải 3. Không có chỗ cấu hình "nền tảng ăn bao nhiêu % trên đơn in".
2. **`orders` KHÔNG có cột chia tiền.** Chỉ có `total_amount`, `shipping_fee`, `payment_status`, `assigned_workshop_id`. ⇒ **không thể biết một đơn đã trả bao nhiêu cho xưởng, bao nhiêu cho designer, nền tảng giữ bao nhiêu.** Không có báo cáo payout, không đối soát được. Với chợ 3 bên thì đây là **chức năng lõi**, không phải tính năng phụ.
3. **Không phân biệt "sản phẩm của nền tảng" và "sản phẩm của designer".** `products` không có trường loại người bán ⇒ đội anh bán hàng của mình thì **không tách được doanh thu** để hạch toán.
4. **HAI NGUỒN SỰ THẬT cho tiền.** Phí nền tảng nằm ở **cả** DB (`pricing_global_settings.marketplace_fee_percent`) **lẫn** client (`InkiriCostFormulaConfig.platformCommissionPercent`). Hai chỗ có thể lệch nhau và khi lệch thì không biết tin chỗ nào — đúng loại lỗi anh đang muốn tránh.

### 3.3 Vì sao điều này quan trọng hơn 40 lỗi tương phản
40 lỗi tương phản làm web **kém đẹp**. Khoảng trống 3 bên làm web **không kiếm được tiền** và **không mở rộng được** — mà đây lại chính là mô hình kinh doanh anh vừa mô tả. Nên nó phải nằm trong đợt làm tới, không phải để sau cùng.

---

## §4. Ưu tiên lại theo đúng 5 điều anh nói

### TẦNG 1 — BÂY GIỜ (làm vòng lặp chạy được trên free tier)
| # | Việc | Vì sao thuộc tầng này |
|---|---|---|
| 1 | **Dán `apply_all_manual.sql`** (2810 dòng, md5 `aaf5cfa8…`) | Không dán thì mọi thứ khác vô nghĩa: 3 bảng còn thiếu, `quotes` chưa lưu được, onboarding xưởng chưa tạo được hồ sơ |
| 2 | Nhập **giá điện + giá nhân công** trong `/admin` ngay sau khi dán | Nếu không, `/quote` **chặn tính giá** ⇒ không báo giá được ⇒ chợ đứng |
| 3 | **Seed dữ liệu thật** (vài sản phẩm, vật liệu, máy in, phụ kiện) | DB đang 0 hàng ⇒ mọi trang chỉ hiện trạng thái rỗng ⇒ **không thể đánh giá "đẹp" được** |
| 4 | **Đợt 11B nhóm 1**: áp `AppShell`/`SideNav`/`Topbar` cho khu đã đăng nhập | Anh đã duyệt. Đây là "UI trước" đúng ý (4): primitive đã dựng sẵn, chỉ cần áp |
| 5 | **Bịt nốt 3 chỗ làm trải nghiệm gãy**: nút Google (D7 — kịch bản sửa **đã viết xong**, chưa chạy), nút "Tách Shells" (**đã xong**), 403 khi vai lab bấm vào `/admin` (B7) | Đều là chỗ người dùng **bấm vào là lỗi** — hại giữ chân khách trực tiếp |
| 6 | **Dọn 40 lỗi tương phản + 93 emoji + 393 pill** | Đây là "Đẹp" theo ý (3), đo được, không cần bàn thêm |

### TẦNG 2 — SAU KHI VÒNG LẶP CHẠY (vẫn trong tầm nhìn)
| # | Việc | Ghi chú |
|---|---|---|
| 7 | **Mô hình doanh thu 3 bên** (§3): thêm cột chia tiền vào `orders`, phí theo từng bên, phân biệt sản phẩm nền tảng vs designer, và **gộp phí về MỘT nguồn sự thật** | Cần một đặc tả ngắn trước khi làm — nhưng đây là việc lõi |
| 8 | Nối `/lab` với `workshop_machines` thật + `initialTab` cho `/lab/:tab` (B8) | Hoàn thiện đường xưởng |
| 9 | `products.license_type` + `saveProduct` ghi giấy phép (B2) | Giấy phép là điều kiện để bán file số |
| 10 | Nghiệm thu thật luồng xưởng end-to-end (B14) | Máy móc đã sẵn, cần tài khoản thật |

### TẦNG 3 — HOÃN HẲN ở phase này (nói rõ để anh yên tâm bỏ qua)
| Việc | Vì sao hoãn |
|---|---|
| **D3 — trình dựng công thức tự do** | Đặc tả **đã xong** (`23-formula-builder-spec.md`, 600 dòng) và đã tính cả an ninh. Nhưng nó là **thay đổi kiến trúc lớn** (bảng mới + parser + versioning). Chỉ nên làm **sau** khi §3 (chia tiền) được thiết kế, vì hai việc này chạm cùng chỗ |
| D4 (CHECK `orders.status`) · D5 (bỏ DELETE quotes) · D6 (ràng buộc KYC) · D12 (mở rộng generator) | Vi chỉnh an toàn dữ liệu — **không** cải thiện vòng lặp, không nhìn thấy được. Gộp vào lần dán sau |
| D10 thay **toàn bộ** emoji · U10/U11/U12 tối ưu bundle | Sau khi UI ổn định (ý 4: UI trước, tối ưu sau) |
| B12 kiểm 6 dependency nghi không dùng · T5 dọn kho | Việc dọn nhà, làm lúc rảnh |
| **T1 lập Supabase project staging** | 🔴 **KHÔNG hoãn** — nhưng nó là **việc của anh**, và tôi vẫn khuyến nghị làm **trước lần dán**, vì 79 policy + 4 trigger mà dán mù vào production thì rủi ro thật |

---

## §5. Đường ngắn nhất tới bản demo 3 bên, trên free tier

Vercel free + Supabase free chịu được: static SPA + PostgREST + Auth. **Không** cần server riêng, **không** cần PSP thật (thanh toán đang giữ dạng mẫu — đã chốt), **không** cần SMTP trả phí (nên "Quên mật khẩu" tiếp tục tắt — đã chốt).

1. Dán migration → 2. Nhập 2 con số giá → 3. Seed vài sản phẩm/vật liệu/máy → 4. Áp `AppShell` cho `/lab` + `/designer` → 5. Cấp 1 tài khoản xưởng thật và chạy trọn: khách đặt in → xưởng nhận đơn → báo tiến độ → khách thấy tiến độ → 6. Dọn tương phản/emoji/pill ở 3 trang chính (`/`, `/explore`, `/products/:id`).

Sau bước 5, anh có **một vòng lặp 3 bên chạy thật để trình diễn và để bán**. Đó là thứ đáng làm hơn 45 mục còn lại.

---

## §6. Ba việc cần anh chốt (chỉ 3)

**C1.** Anh **đồng ý thứ tự** ở §4 không: *(1) dán + nhập giá + seed → (2) UI `AppShell` → (3) dọn đẹp → rồi mới tới mô hình doanh thu 3 bên*? Hay anh muốn **mô hình 3 bên làm ngay** vì nó là lõi kinh doanh?

**C2.** Anh có **lập Supabase project staging** không (miễn phí, tạo trong 5 phút)? Nếu **có**, tôi sẽ đưa toàn bộ `apply_all_manual.sql` + `audit_schema_truth.sql` để anh chạy ở đó trước — đó là cách duy nhất kiểm chứng thật 79 policy + 4 trigger, và tránh dán mù vào production.

**C3.** Về **"Đẹp"**: anh muốn tôi ưu tiên **3 trang khách nhìn thấy nhiều nhất** (`/`, `/explore`, `/products/:id`) cho thật đẹp trước, hay làm **đều toàn bộ** ở mức khá? Tôi nghiêng về 3 trang trước — vì giữ chân khách nằm ở đó, còn `/admin` là nơi đội anh dùng nên "đủ tốt" là được.

---

## §7. Trạng thái kỹ thuật lúc dừng (để anh biết không có gì hỏng)

- **Gate XANH toàn bộ**: `lint` 0 · `build` 0 (`index.js` 802 kB · gzip 208 · CSS 109 kB) · `check-contrast` 0 · `check-fabricated` 0 (SACH) · `a8-sql-syntax-check` 0 (7 file) · `lint-rls-sources` 0 · `lint-rls-migration` 0 · `verify-rls` 9 PASS/0 FAIL.
- **Không agent nào đang chạy**, không có tiến trình nền nào. Không có file nào bị sửa dở.
- **Đã vá trong đợt vừa rồi** (đều đã kiểm chứng độc lập): `quotes`/`kyc_records` hết deny-all (5 policy) · xưởng tự tạo được hồ sơ (B1) · chặn xưởng tự đổi `partner_id`/`verified_status` (trigger 5 nhánh) · 16 hàm ngừng báo thành công khi ghi thất bại · bỏ nút "Tách Shells" giả · bỏ 3 chỗ bịa giấy phép · điểm khả in không còn bịa `60/100`.
- **Còn 1 việc đã viết xong kịch bản nhưng CHƯA chạy**: ẩn nút Google (D7) — kịch bản tại `C:\Users\chith\AppData\Local\Temp\vcube\payload\do-d7.mjs`, chỉ cần 1 lệnh. Tôi **giữ nguyên, không chạy**, theo yêu cầu dừng của anh.
