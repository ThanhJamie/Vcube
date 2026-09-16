> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 26 — Trạng thái hiện tại: một chỗ duy nhất để nhìn

> Cập nhật 2026-09-21. Anh không cần đọc `22` (danh sách 51 mục) nữa. Đây là nơi duy nhất cần xem.
> Chi tiết nền: `24` (review tổng thể) · `27` (thông số giá) · `25`+`25b` (doanh thu 3 bên) · `23` (đặc tả công thức — đã hoãn).

---

## A. ✅ SCHEMA ĐÃ CHỐT — DÁN ĐƯỢC NGAY

```
supabase/scripts/apply_all_manual.sql
3524 dòng · md5 a662adcb087c06452761ebcffae8add5
```
Tôi đã **tự kiểm chứng** (không chỉ đọc báo cáo agent): md5 sinh 2 lần y hệt · `30 bảng · 84 policy bảng · 6 policy storage` · 6 gate RC=0 · toàn bộ thay đổi đã vào file gộp.
> **Bản này thêm 1 luật cho `orders` INSERT:** `user_id` phải là `null` (guest checkout, khách vãng lai) hoặc đúng `auth.uid()` — vá lỗ an ninh đã chứng minh thật: insert bằng anon mang `user_id` của **người khác** trả **HTTP 201**.

**Làm theo đúng thứ tự này:**
1. **TRƯỚC KHI DÁN — chuẩn bị sẵn các con số** trong `/admin → Cấu hình giá` (xem §D).
2. **Dán** file trên vào SQL Editor.
3. Chạy `supabase/diagnostics/verify_admin_settings.sql`, rồi **đọc PHẦN 5 ở đáy file**. Kỳ vọng: `so_bang_public = 30` · `so_policy_bang = 84` · **`so_policy_storage = 6`** · các dòng **5.14 → 5.22 đều `OK`**.
4. Bootstrap admin → tạo tài khoản xưởng thật → nghiệm thu: `/lab` **lưu được hồ sơ** (trước đây lỗi 42501) · **lưu thử 1 báo giá** (trước đây chết vì deny-all) · **lưu 1 hồ sơ KYC**.
5. Seed vài sản phẩm/vật liệu/máy in để có dữ liệu mà đánh giá giao diện.

> **Đề nghị giữ nguyên: dán vào 1 Supabase project staging trước** (miễn phí, 5 phút). Lần dán gồm 84 policy + 7 trigger + 41 lệnh gỡ default + FK/CHECK mới, mà máy tôi **không có Postgres** nên mới chỉ soi **tĩnh**. Đây là rủi ro thật duy nhất còn lại.

---

## B. Hai luồng đang chạy (chỉ sửa `src/**` — KHÔNG đổi schema, nên không phải chờ)

| Luồng | Nội dung | Tiến độ đo được |
|---|---|---|
| **Giá** | Bỏ 30 fallback cứng · 5 hằng số trong mã · **mọi luật theo `id`** · 7 ô mới trong `/admin` · xoá nguồn ghi legacy · nối `marketplace_fee_percent` | fallback cứng = **0** ✅ · wizard đã bỏ 3 trường máy in ✅ · đang sửa `mappers.ts` + lỗi `.toLocaleString()` trên null |
| **UI** | `AppShell`/`SideNav`/`Topbar` cho `/lab`+`/designer` · chịu NULL ở 41 cột · wizard dùng lại hàng `Pending` | `AppShell` đã nối ở `App.tsx` ✅ · wizard bỏ 3 trường ✅ |

Gate lúc này: `lint` 0 · `build` 0 · 5 gate tĩnh 0 · `check-fabricated` SACH · schema md5 **không đổi**.

---

## C. Quyết định tôi đã chốt thay anh (anh giao quyền)

**Doanh thu 3 bên:** thêm bảng **`order_items`** (vì giỏ hàng **đã** trộn hàng in + file số) · phí nền tảng tính trên **giá TRƯỚC thuế, không gồm ship** (`payout_xưởng = subtotal − phí + ship`) · **tách 2 trạng thái payout** (xưởng/designer) + audit.

**Bảo mật (2 rò rỉ tôi tự tìm/kiểm chứng):**
- `quotes` + `kyc_records` **RLS bật nhưng 0 policy** ⇒ deny-all ⇒ **lưu báo giá chưa từng chạy được**. Đã vá 5 policy.
- `workshop_profiles` **thiếu policy INSERT** ⇒ xưởng thật **không tạo được hồ sơ**; và `owner_update` không giới hạn cột ⇒ **tự gán `partner_id` của xưởng khác để đọc đơn của họ**. Đã vá policy + trigger 5 nhánh.
- `workshop_partners` là bảng **đọc công khai** ⇒ để `% chiết khấu đàm phán` ở đó là **phơi bí mật kinh doanh**. Đã **chuyển sang bảng riêng** `workshop_commission_terms` (**chỉ admin**).
- **`cad-files` thiếu policy cho designer** ⇒ **không bán được file số**. Đã thêm theo quy ước `digital/<auth.uid()>/…`.

**Khác:** `products.license_type` thêm cột · bỏ 3 trường máy in khỏi wizard (DB không có cột) · gỡ **41 default bịa** (mọi sản phẩm mới từng được **5 sao** dù 0 đánh giá) · CHECK cho `orders.status` (8 giá trị thật) · `quotes` bỏ DELETE · KYC 1-hồ-sơ-chờ · mở rộng generator **kèm test âm** · ẩn nút Google (D7) · bỏ nút "Tách Shells" giả (D9) · **một nguồn duy nhất** cho phí nền tảng (cột DB, bỏ bản sao phía client).

**Tôi cố ý KHÔNG làm:** công thức **Margin** (bất biến dự án: không đổi công thức giá, chỉ đổi **nguồn** thông số) — option bị vô hiệu và **chặn kèm lý do rõ ràng**, không phải làm giả.

---

## D. Việc anh phải làm

**Nhập thông số giá trong `/admin → Cấu hình giá`** (bảng đầy đủ 34 thông số: `docs/plans/27-pricing-parameters.md` §2). Nguyên tắc mới: **thiếu thông số ⇒ CHẶN tính giá và NÊU ĐÍCH DANH tên thông số thiếu**, tuyệt đối không dùng số mẫu của Inkiri.
⇒ Anh **không cần điền hết 34 ô ngay**: cứ lưu vài số, `/quote` sẽ **báo đúng còn thiếu cái nào** — điền dần tới khi ra giá. Anh chắc chắn cần ít nhất: **điện (đ/kWh)** · **lương giờ (đ)** · **markup %** · **phí nền tảng %** · **bản quyền %** · **dự phòng in hỏng %** · và 3 thông số mới (`noSupportRemovalMinutes`, 2 ngưỡng đơn lớn).

Việc còn lại: **seed dữ liệu** · **rotate `sb_secret_…`** (đã lộ trong chat) · **env Vercel** · **nghiệm thu luồng xưởng thật**.

---

## E. Đã hoãn (anh yên tâm bỏ qua — tôi sẽ tự nhắc khi tới lúc)

| Việc | Vì sao hoãn |
|---|---|
| **D3 — trình dựng công thức tự do** | Đặc tả **đã xong** (`23`, 600 dòng, có cả phần an ninh parser). Nhưng nó **chạm cùng chỗ** với mô hình chia tiền ⇒ làm sau, nếu không phải sửa hai lần |
| Dọn 40 lỗi tương phản · 393 pill · 210 `text-sm` · 93 emoji | Phải **sau** khi `AppShell` áp xong, nếu không dọn rồi lại sửa |
| Tối ưu bundle (`three-vendor` 133 kB, favicon 404, font) | Đúng ý anh: **UI trước, tối ưu sau** |
| `profitMode='margin'` · `reviews.moderated_*` · dọn dependency | Không phục vụ vòng lặp lõi ở phase này |
| **3 script kiểm chứng chưa dò bảng mới** | Đã giao làm (chỉ `scripts/**`, không cần dán lại) |

---

## F. Không có gì đang hỏng

Không agent nào bị kẹt · không file nào sửa dở · gate **xanh toàn bộ**: `lint` 0 · `build` 0 · `check-contrast` 0 · `check-fabricated` **SACH** · `a8-sql-syntax-check` 0 (7 file) · `lint-rls-sources` 0 · `lint-rls-migration` 0 · `verify-rls` 9 PASS/0 FAIL.

Đã vá và **kiểm chứng độc lập**: `quotes`/`kyc` hết deny-all · xưởng tự tạo được hồ sơ · chặn tự đổi `partner_id`/`verified_status` · 16 hàm ngừng báo thành công khi ghi thất bại · bỏ nút "Tách Shells" giả · bỏ 3 chỗ bịa giấy phép · điểm khả in hết bịa `60/100` · **30 fallback số bịa trong engine = 0**.

---

## G. Giá trị cấu hình GỐC của chủ dự án (ghi lại để không phụ thuộc `/tmp`)

Ngày 2026-09-21, script `scripts/seed-sample-data.mjs` (`--apply`) **đã đè** một giá trị thật:

| Cột | GỐC (chủ dự án đặt) | Bị đè thành (số Inkiri) |
|---|---|---|
| `pricing_global_settings.electricity_rate_vnd` | **4000** | 2850 |

`--remove` khôi phục về **4000**. Bản backup ban đầu nằm ở `/tmp/vcube-seed-backup.json` — **`/tmp` mất khi restart WSL**, nên đã chuyển sang `supabase/backups/` (gitignored). Dòng này là bản ghi **bền** để không mất con số 4000.

**Bài học:** script seed **không nên ghi đè hàng cấu hình một-hàng** của chủ dự án. Nếu cần `/quote` tính được, phải **hỏi trước** hoặc chỉ điền khi cột đang **NULL**.

---

## H. 🔴 Phát hiện: một phần admin chạy trên `localStorage`, không phải DB

Khi seed dữ liệu mẫu để test UI, lộ ra rằng nhiều bảng **đã có dữ liệu nhưng UI không đọc**:

| Bảng đã seed | Vì sao UI không thấy |
|---|---|
| `cart_items` | **Giỏ hàng là `localStorage`** |
| `order_items` | UI chưa đọc bảng này |
| `digital_assets` | Thư viện dựng **in-memory** |
| `reviews` | UI chỉ đọc `products.rating`/`reviews_count` |
| `kyc_records` | Hàng đợi KYC đọc `user_profiles.kyc_status`, không đọc bảng này |

Và: **Kanban 8 nấc ở `/admin` là `localStorage`**, không ăn DB ⇒ seed `orders` không làm nó có việc. Bề mặt đơn **có DB** là `/lab` (3 đơn).

⇒ Nghĩa là **một phần admin đang hiển thị/điều khiển dữ liệu giả trong trình duyệt**. Đây là việc thật phải xử lý. Đang lập **bảng kiểm kê** (màn hình nào → nguồn dữ liệu thật: DB bảng nào / localStorage key nào / in-memory / `mockData.ts`) trước khi chia việc, vì sửa giỏ hàng là **thay đổi tính năng** cần kế hoạch riêng.
