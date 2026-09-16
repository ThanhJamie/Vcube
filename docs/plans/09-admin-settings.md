> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 09 — Kiểm soát cấu hình từ `/admin` (inventory + thiết kế)

> Trả lời yêu cầu review của chủ dự án: **"tất cả số liệu hay thông tin đều có thể điều chỉnh trong admin"**.
> Tài liệu này là **inventory có bằng chứng `file:line`** + thiết kế đề xuất. Chưa thi công — cần chủ dự án duyệt.
> Số liệu đo trên working tree ngày 2026-09-12, sau Đợt 1.

---

## 0. Kết luận ngắn

**Schema DB đã được thiết kế sẵn cho đúng yêu cầu này — nhưng app chưa hề đọc nó.**

| Kho cấu hình trong DB | Nội dung | Trạng thái thật |
|---|---|---|
| `site_content` (1 hàng, JSONB) | nội dung storefront + SEO + **phí ship** + ngưỡng free-ship + hotline + email + địa chỉ + dung sai | ✅ **đã nối và đã sửa được trong `/admin`** |
| `pricing_global_settings` | `electricity_rate_vnd` 2850, `labor_hourly_rate_vnd` 65000, `vat_percent` 8, `currency` | ⚠️ **CRUD có thật** (`workshopService.ts:1079-1133`) nhưng **pricing engine KHÔNG đọc** |
| `pricing_configs` (JSONB công thức) | markup, phí nền tảng, royalty, dự phòng lỗi, khấu hao, chiết khấu theo SL… | ⚠️ bảng tồn tại + RLS, **client không dùng**; app đọc hằng số TS |
| `cost_rules` (JSONB) | rule giá vốn | ⚠️ tồn tại + RLS, **0 usage trong `src/`** |

**Nguồn sự thật thật của giá hiện nay là một hằng số TypeScript:** `DEFAULT_INKIRI_FORMULA_CONFIG` tại `src/data/mockData.ts:906` — **hơn 40 con số nghiệp vụ** (markup 35%, phí nền tảng 8%, phí cổng thanh toán 2,5%, royalty thiết kế 5%, dự phòng lỗi 8%, overhead 15.000, đóng gói 12.000, cồn IPA 8.000, khấu hao 4.375/giờ, nhân công 65.000/giờ, điện 2.850/kWh, 5 bậc chiết khấu theo số lượng…). Đổi giá trị phải **sửa code và deploy lại**.

---

## 1. Phát hiện nghiêm trọng — hai mã số thuế khác nhau trong cùng một app

| Nơi | Giá trị | File |
|---|---|---|
| Hoá đơn in cho khách | `0108924881` | `src/frontend/components/InvoiceModal.tsx:86` (hardcode) |
| "Cài Đặt Hệ Thống" trong `/admin` | `0318924011` | `src/frontend/components/admin/AdminSettingsPanel.tsx:15` (hardcode, chỉ `useState`) |

Và `AdminSettingsPanel` **là form giả**: `workshopName`, `workshopAddress`, `taxCode`, `autoInvoice`, `telemetryLogging` đều là `useState`, `handleSave()` chỉ gọi `onShowToast('Đã lưu cấu hình cài đặt xưởng in!')` — **không ghi gì vào DB**. Đây là vi phạm trực tiếp `docs/design/data-honesty.md`: admin tưởng đã lưu, thực tế không.

---

## 2. Inventory — cái gì đang điều chỉnh được, cái gì không

### 2.1 ✅ Đã điều chỉnh được trong `/admin`
`AdminStorefrontPanel.tsx` sửa trực tiếp `site_content`: announcement (text/badge/CTA), hero (badge/headline/subheadline/2 CTA/3 metric), workflow 3 bước, estimator (badge/title/subtitle/2 benefit/CTA), trust partners list, `toleranceSpec`, **`standardShippingFee`** (`:638`), **`freeShippingThreshold`** (`:628`), hotline, email, 2 địa chỉ, SEO (title/description/keywords/ogImage/canonical/robots/structuredData). Cộng `AdminProductsPanel`, `AdminSeoPanel`, `Group1WorkshopsPanel` (đối tác), `Group3CustomersPanel` (KYC), `PricingConfigPanel` (formula — xem 2.3).

### 2.2 ❌ Hardcode, phải chuyển thành setting

| Giá trị | Hiện ở đâu | Ghi chú |
|---|---|---|
| **Mã số thuế** | `InvoiceModal.tsx:86` = `0108924881`; `AdminSettingsPanel.tsx:15` = `0318924011` | **mâu thuẫn** — phải còn đúng 1 nguồn |
| **Hotline trên hoá đơn** | `InvoiceModal.tsx:86` hardcode `1900 6833` | `site_content.hotline` đã có → chỉ cần đọc |
| **Tỉ lệ VAT** | `src/frontend/lib/vat.ts` `VAT_RATE` | DB đã có `pricing_global_settings.vat_percent = 8` |
| **Phí nền tảng** | `src/utils/pricingEngine.ts:6` `PLATFORM_FEE_PERCENT = 0.08` | trùng với config `platformCommissionPercent` |
| **Nhân công chuẩn bị** | `DesignerDashboardView.tsx:168` `laborPrep = 30000` | hằng số trong view |
| **Giá vốn vật liệu** | `meshParser.ts:470` (550k/350k/300k), `:578` (300k) | nên lấy từ `materials` / `cost_rules` |
| **Giá/kg mặc định của xưởng** | `WorkshopSettingsView.tsx:117,172,184,398`, `WorkshopOnboardingWizard.tsx:199,305,1024` = 250.000 | thuộc cấu hình xưởng (đã có store) |
| **Tên/địa chỉ/mã số thuế pháp nhân** | `AdminSettingsPanel.tsx:14-17` | form giả, chưa lưu |
| **Điều khoản bảo hành, cam kết giao hàng** | chuỗi trong `MyOrdersView`, `ProductDetailView` | nên là setting để không hứa sai |
| **Chính sách đặt cọc / COD / chuyển khoản** | `CheckoutView` + `DEFAULT_SALES_RULES` | một phần đã có trong `site_content` |

### 2.3 ⚠️ Có UI nhưng chưa phải nguồn sự thật
`PricingConfigPanel.tsx` (1.543 LOC) + `Group4PricingEnginePanel` cho sửa `InkiriCostFormulaConfig`, nhưng giá trị khởi tạo vẫn từ `DEFAULT_INKIRI_FORMULA_CONFIG` trong `mockData.ts` và **không chắc ghi vào `pricing_configs`**. Cần xác minh + nối vào `pricing_configs`/`pricing_global_settings` (`workshopService.ts:1079` đã có hàm CRUD thật để dùng lại).

---

## 3. Thiết kế đề xuất

### 3.1 Bốn kho, phân theo mức rủi ro (không gộp thành một form khổng lồ)

| Kho | Ai sửa | Có audit? | Ghi chú |
|---|---|---|---|
| `site_content` | marketing/admin | không bắt buộc | nội dung hiển thị — đã chạy |
| **`app_settings` (mới)** | admin | **có** | pháp lý & định danh: mã số thuế, tên pháp nhân, địa chỉ xuất hoá đơn, hotline, email, số tài khoản, điều khoản bảo hành, chính sách đặt cọc |
| `pricing_global_settings` | admin/kế toán | **có** | VAT %, điện, nhân công, currency |
| `pricing_configs` + `cost_rules` | admin/kỹ thuật | **có + version + preview** | công thức giá; đổi là đổi tiền của mọi báo giá ⇒ cần "xem trước ảnh hưởng" trước khi lưu |

### 3.2 Nguyên tắc bắt buộc

1. **Không bịa giá trị mặc định khi chưa cấu hình.** Nếu setting rỗng → hiển thị "Chưa cấu hình" / ẩn dòng đó, **không** rơi về một con số đoán. (Đây là cách trung thực hoá các tuyên bố như "±0.05mm", "GIAO HÀNG 24H", "ISO/ASTM 52900", danh sách trust partner — hiện là **chuỗi bịa**, và cho admin sửa chính là cách sửa đúng.)
2. **Một nguồn duy nhất.** Xoá hết literal trùng; mọi nơi đọc qua một accessor (ví dụ `useSettings()` / `settingsService`).
3. **Audit log**: `setting_audit(setting_key, old_value, new_value, changed_by, changed_at)` — với giá cả và pháp lý là bắt buộc.
4. **Validate ở server**, không chỉ ở client (VAT 0–20%, phí ship ≥ 0, mã số thuế đúng định dạng 10 hoặc 10-3 chữ số, email/hotline hợp lệ).
5. **Cache + realtime**: settings đọc 1 lần khi boot + subscribe realtime (repo đã có pattern ở `App.tsx`), tránh mỗi component gọi DB.

---

## 4. `warranty_claims` là gì (giải thích yêu cầu #3)

Hiện tại form "Yêu cầu bảo hành" trong `MyOrdersView` **không gửi đi đâu cả** — sau Đợt 1 nó đã được sửa để nói thật rằng chưa nối backend. Để nó hoạt động cần một bảng lưu yêu cầu:

```sql
create table public.warranty_claims (
  id           uuid primary key default gen_random_uuid(),
  order_id     text not null references public.orders(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  reason       text not null,          -- 'nứt' | 'sai kích thước' | 'lỗi bề mặt' | 'khác'
  description  text not null default '',
  photo_paths  text[] not null default '{}',   -- storage bucket
  status       text not null default 'submitted',  -- submitted|reviewing|approved|rejected|resolved
  resolution   text not null default '',
  handled_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

- **Khách** tạo claim cho **đơn của chính mình** (RLS: `user_id = auth.uid()`); khách vãng lai dùng token đơn.
- **Admin/lab** đọc tất cả + đổi `status`/`resolution` (RLS qua `public.is_admin()`).
- **Admin UI**: một tab "Bảo hành" trong nhóm đơn hàng — danh sách + đổi trạng thái + ghi chú xử lý.
- **Ba lựa chọn**: (a) làm đầy đủ như trên; (b) **bỏ hẳn form bảo hành** để không hứa gì; (c) giữ form + gửi email/hotline (không cần bảng, nhưng phải nói rõ kênh tiếp nhận thật).

---

## 5. Phân kỳ đề xuất (không phá thứ tự phase đã duyệt)

| Việc | Phase | Agent |
|---|---|---|
| Migration `app_settings` + `setting_audit` (+ `warranty_claims` nếu chọn (a)); RLS; seed rỗng | 7 | **A8** |
| Nối pricing engine đọc `pricing_global_settings` + `pricing_configs` (thay `DEFAULT_INKIRI_FORMULA_CONFIG` làm *fallback* khi DB rỗng — **không** xoá hằng số, chỉ hạ cấp nó) | 7 | **A8** (+ A5 review công thức) |
| `settingsService` + `useSettings()` + accessor; `VAT_RATE` đọc từ DB | 7 | **A8** |
| `AdminSettingsPanel` **thật** (bỏ form giả), form pháp lý + bảo hành + audit viewer | 6 | **A6** |
| Xoá mọi literal trùng: mã số thuế, hotline trên hoá đơn, `PLATFORM_FEE_PERCENT`, `laborPrep`, giá vốn trong `meshParser` | 4/5/6 | **A4/A5/A6** |
| Tab "Bảo hành" cho admin | 6 | **A6** |

**Thứ tự bắt buộc:** A8 (schema + service) **trước**, A6 (UI) **sau** — không làm UI trước khi có chỗ lưu, nếu không lại sinh ra form giả thứ hai.

---

## 6. Quyết định đã chốt (chủ dự án, 2026-09-12)

| # | Câu hỏi | **Quyết định** | Hệ quả thi công |
|---|---|---|---|
| 1 | Mã số thuế nào đúng (`0108924881` vs `0318924011`)? | **Để trống, admin tự nhập sau** | Xoá **cả hai** literal. Thêm ô nhập trong `/admin`. **Chưa cấu hình ⇒ KHÔNG hiển thị mã nào** trên hoá đơn (không rơi về giá trị đoán). Chỉ còn MỘT nguồn |
| 2 | "Tất cả số liệu" có gồm hệ số công thức giá? | **CÓ — cho sửa cả hệ số công thức giá** | Nối `pricing_configs` + `pricing_global_settings` vào pricing engine (hạ `DEFAULT_INKIRI_FORMULA_CONFIG` xuống thành *fallback khi DB rỗng*, không xoá). Admin UI **bắt buộc** có: **xem trước ảnh hưởng lên báo giá mẫu** + **version** + **audit log** + validate server-side. Rủi ro cao nhất trong 4 kho ⇒ phải review riêng |
| 3 | Bảo hành? | **Làm bảng `warranty_claims` + tab admin** | Migration bảng + RLS (khách tạo cho đơn của mình; admin/lab đọc & đổi trạng thái) + tab "Bảo hành" trong nhóm đơn hàng + hiển thị tiến độ cho khách |
| 4 | Audit log cho giá/pháp lý? | **CÓ** | Bảng `setting_audit(setting_key, old_value, new_value, changed_by, changed_at)` + policy chỉ admin đọc; UI xem lịch sử trong `/admin` |
| 5 | Đợt 3 (migrate icon)? | **CHẠY** | A2c: 610 điểm Material Symbols → lucide |

### Nguyên tắc đã chốt kèm theo
- **Setting rỗng ⇒ hiển thị "chưa cấu hình", tuyệt đối không rơi về con số đoán.** Đây đồng thời là cách trung thực hoá các tuyên bố đang bịa ("±0.05mm", "GIAO HÀNG 24H", "ISO/ASTM 52900", danh sách trust partner).
- **Một nguồn duy nhất**: xoá mọi literal trùng; mọi nơi đọc qua `settingsService`/`useSettings()`.
- **Validate ở server**, không chỉ client.
- **Cache + realtime**: đọc 1 lần khi boot + subscribe realtime (pattern đã có ở `App.tsx`), không để mỗi component gọi DB.

### Phân kỳ (không phá thứ tự phase đã duyệt)
| Việc | Phase | Agent |
|---|---|---|
| Migration `app_settings` + `setting_audit` + `warranty_claims`; RLS; seed rỗng | 7 | **A8** |
| Nối pricing engine ↔ `pricing_global_settings` + `pricing_configs`; version + audit | 7 | **A8** (+ A5 review công thức) |
| `settingsService` + `useSettings()`; `VAT_RATE` đọc từ DB | 7 | **A8** |
| `AdminSettingsPanel` **thật** (bỏ form giả) + form pháp lý + tab Bảo hành + audit viewer + preview ảnh hưởng giá | 6 | **A6** |
| Xoá literal trùng: mã số thuế, hotline hoá đơn, `PLATFORM_FEE_PERCENT`, `laborPrep`, giá vốn `meshParser` | 4/5/6 | **A4/A5/A6** |

**Thứ tự bắt buộc: A8 TRƯỚC A6.** Không làm UI trước khi có chỗ lưu — nếu không sẽ đẻ ra form giả thứ hai như `AdminSettingsPanel` hiện tại.

---

## 7. Ma trận độ phủ cấu hình `/admin` (audit thật 2026-09-12, sau Đợt 3)

Cách kiểm: grep panel admin + trace prop → hàm ghi → bảng DB trong `App.tsx`. Không suy luận.

| Giá trị / bảng | UI trong `/admin`? | Ghi được vào DB? | Kết luận |
|---|---|---|---|
| `products` | ✅ `AdminProductsPanel` | ✅ `dbService.saveProduct` (`App.tsx:760,781`) | ĐẠT |
| `materials` | ✅ `PricingConfigPanel` sub-tab `materials` | ✅ `saveMaterial` (`App.tsx:502`) | ĐẠT, **nhưng xem #7** |
| `printer_fleet` | ✅ `PricingConfigPanel` sub-tab `printers` | ✅ `savePrinter` (`App.tsx:515`) | ĐẠT, **nhưng xem #7** |
| `accessories` | ✅ `AccessoriesManager` | ✅ `onUpdateAccessories` | ĐẠT |
| `site_content` (hero/SEO/**phí ship**/hotline/**email liên hệ**) | ✅ `AdminStorefrontPanel` + `AdminSeoPanel` | ✅ `saveSiteContent` (`App.tsx:841`) | ĐẠT (sau khi sửa Lỗi 1 ở §9) |
| `pricing_configs` (markup, phí nền tảng, royalty, dự phòng lỗi, bậc chiết khấu) | ✅ `PricingConfigPanel` tab `formula` | ✅ `savePricingConfig` (`App.tsx:487` → `database.ts:604`) | ĐẠT |
| `workshop_partners` | ✅ `Group1WorkshopsPanel` (A1 port) | ✅ `saveWorkshopPartner` | ĐẠT |
| `user_profiles` / `kyc_records` | ⚠️ `Group3CustomersPanel` (duyệt/từ chối KYC) | ⚠️ `updateUserKyc` — **chưa có UI đổi `role`** | THIẾU một phần |
| **`app_settings`** (mã số thuế, pháp nhân, bảo hành, đặt cọc) | ❌ `AdminSettingsPanel` là **FORM GIẢ** | ❌ `handleSave` chỉ hiện toast | **THIẾU** → A6 |
| **`pricing_global_settings`** (VAT %, điện, nhân công) | ❌ không có | ❌ | **THIẾU** → A6 |
| **`cost_rules`** | ❌ panel đã xoá ở Phase 1 | ❌ | **THIẾU** → A6 |
| **`warranty_claims`** | ❌ | ❌ chưa có call site | **THIẾU** → A6 |
| **`order_files`** | ❌ | ❌ chưa có call site | **THIẾU** → A6 (mục 19 DoD) |
| `workshop_profiles` / máy móc xưởng | ⚠️ `WorkshopSettingsView` — **chưa route** | ⚠️ | THIẾU → A7 (route `/lab`) |

### Lỗ hổng thật phải sửa (đưa vào phạm vi A6)

| # | Lỗ hổng | Bằng chứng | Mức |
|---|---|---|---|
| 1 | `AdminSettingsPanel` là **form giả**: `workshopName`/`taxCode`/`autoInvoice`/`telemetryLogging` là `useState`, `handleSave` chỉ `onShowToast('Đã lưu…')` | `AdminSettingsPanel.tsx:15-22` | 🔴 admin tưởng đã lưu |
| 2 | **Hai mã số thuế mâu thuẫn**: hoá đơn in `0108924881`, admin hiện `0318924011` | `InvoiceModal.tsx:87` vs `AdminSettingsPanel.tsx:17` | 🔴 |
| 3 | **Phí ship nhập ở admin bị mất**: `saveSiteContent` không có cột `site_content.settings` để giữ `standardShippingFee`/`freeShippingThreshold`/`toleranceSpec` | đã thêm ở migration nhưng **cột chưa tồn tại trên DB** (xem §9) | 🔴 |
| 4 | `materials`/`printers` ghi Supabase bằng `.catch(console.warn)` ⇒ **admin thấy "đã lưu" dù sync lỗi**; đồng thời ghi `localStorage` shadow trước | `App.tsx:493-520` | 🟠 |
| 5 | `cost_rules` mất UI khi Phase 1 xoá `AdminCostRulesPanel` (bảng vẫn tồn tại + RLS) | `git status` = `D AdminCostRulesPanel.tsx` | 🟠 |
| 6 | Giá vốn vật liệu hardcode trong parser | `meshParser.ts:470` (550k/350k/300k), `:578` (300k) | 🟠 |
| 7 | Mặc định xưởng hardcode trong view | `WorkshopSettingsView.tsx:54,55,117,172,184,306,398,521,522` (2850/65000/250000/25.000.000) | 🟠 |
| 8 | `resetPasswordForEmail` phụ thuộc email của Supabase nhưng chưa xác nhận SMTP đã bật | `AuthContext.tsx:433` | 🟡 xem §8 |

### Ghi chú quan trọng: panel admin A1 xoá **không phải** lỗ hổng
`AdminMaterialsPanel` và `AdminMachinesPanel` bị xoá ở Phase 1 **là đúng** — chúng là **bản trùng** của sub-tab `materials`/`printers` trong `PricingConfigPanel` (prop `onUpdateMaterials`/`onUpdatePrinters`, section `materials`/`hardware` ở `AdminDashboardView.tsx:419-425`). Đã kiểm chứng đường ghi thật tới DB. **Không cần dựng lại 2 panel đó.**

---

## 8. Audit email (theo yêu cầu chủ dự án 2026-09-12)

### 8.1 Email được dùng vào 5 việc — phân loại theo khả năng bỏ

| # | Việc | Bằng chứng | Có bỏ được ngay? |
|---|---|---|---|
| 1 | **Danh tính đăng nhập** (email + mật khẩu) | `AuthContext.tsx:210` `signInWithPassword`, `:254` `signUp`, `:318` `signInWithOAuth('google')` | ❌ **KHÔNG.** Đây là **phương thức đăng nhập duy nhất đang chạy** (Google provider đang tắt). Bỏ email ⇒ phải thay bằng OAuth/phone ⇒ việc của sau |
| 2 | **Gửi email đặt lại mật khẩu** | `AuthContext.tsx:433` `resetPasswordForEmail`; UI: `LoginView.tsx:124`, `AuthModal.tsx` mode `forgot_password` | ⚠️ **Có thể để sau.** Repo **không có** dịch vụ gửi mail nào; hàm này dùng email **built-in của Supabase Auth**. Nếu Dashboard chưa cấu hình SMTP ⇒ bấm nút **không có mail nào được gửi**. Nên hoặc bật SMTP, hoặc ẩn nút + nói thật |
| 3 | **Email liên hệ hiển thị** (`contact@vcube.vn`) | `HomeView.tsx:1232` đọc `site_content.contactEmail`; mock ở `mockData.ts:1596,1613` | ✅ **Đã cấu hình được ở admin.** Bản mock đang bị A10 xoá |
| 4 | **Email trong dữ liệu** (hồ sơ xưởng do người dùng nhập) | `WorkshopSettingsView.tsx:58,520,532`, `WorkshopOnboardingWizard.tsx:158,361` | ✅ Giữ — là dữ liệu thật do người dùng nhập, không phải tính năng |
| 5 | **Email admin bootstrap** (cấp quyền admin) | `supabase/scripts/bootstrap_admin.sql:19`, `apply_all_manual.sql` | ✅ **Không bắt buộc về kỹ thuật.** Chỉ là cách chọn tài khoản; có thể thay bằng sửa `public.user_profiles.role` trực tiếp trong Table Editor Dashboard |

### 8.2 Kết luận

- **Không có "tính năng email" nào trong repo để bỏ.** Không SMTP, không Resend/Mailgun/nodemailer, và Edge Function duy nhất là `calculate-quote` (không gửi mail). ⇒ "Tính năng thêm sau" đúng: hiện **chưa có gì**.
- **Email không thể bỏ khỏi đăng nhập** ở thời điểm này — nó là *danh tính tài khoản*, không phải tiện ích. Muốn bỏ phải bật Google OAuth (hoặc thêm phone OTP) trước, rồi mới cho phép đăng ký không email.
- **Việc duy nhất phụ thuộc email gửi đi là "Quên mật khẩu?"** → **CHỐT (2026-09-12): chủ dự án chọn (b) TẠM ẨN.**
  - Thực hiện: `export const ENABLE_PASSWORD_RESET = false;` trong `src/frontend/components/AuthModal.tsx`; ẩn nút "Quên mật khẩu?" ở `AuthModal.tsx` (~dòng 535-538) và `src/frontend/views/LoginView.tsx` (~dòng 124) theo cờ đó.
  - **KHÔNG xoá** `resetPasswordForEmail` trong `AuthContext.tsx:433` — bật lại = cấu hình SMTP trong Dashboard (Authentication → Email) rồi đổi cờ thành `true`.
  - Không thay bằng lời hứa "sắp có" — chỉ ẩn.
  - Giao cho **A2e** (đang sở hữu 2 file `.tsx` này ở Stage B).
- **Email hardcode trong policy = 0.** `chithanhso10@gmail.com` chỉ còn trong **comment** (`20260900_rls_helpers.sql:8`, `supabase/diagnostics/rls_audit.sql:42-53` — chính là script *phát hiện* anti-pattern này) và header file gộp. Không có email hardcode nào đang hoạt động.
- **Đừng đưa email thật vào repo**: giữ `CHANGE_ME@example.com` trong `bootstrap_admin.sql`/`apply_all_manual.sql`; nhập email thật chỉ trong SQL Editor.

---

## 9. Việc phải làm lại sau khi áp migration (lỗi phát hiện khi áp lên DB đã có schema)

Vì project **đã có schema từ trước**, `create table if not exists` là **NO-OP** với bảng đã tồn tại ⇒ mọi thay đổi viết *bên trong* định nghĩa `create table` của **bảng cũ** không được áp:

| Lỗi | Bằng chứng thật sau khi áp | Cần |
|---|---|---|
| `site_content.settings` **không tồn tại** | `select settings from site_content` → `column does not exist` | `alter table … add column if not exists` |
| `pricing_global_settings` vẫn `2850/65000/8` | hàng seed `updated_at=06:08` (trước lúc áp 07:41); `drop default` + 2 CHECK không có tác dụng | `alter table … drop default` + `drop constraint if exists` / `add constraint` + chuẩn hoá 3 giá trị về `NULL` |

**Trạng thái:** đã giao lại A8 sửa + rà soát toàn file + sinh lại `apply_all_manual.sql`. Migration **idempotent** nên chạy lại toàn bộ là an toàn.
