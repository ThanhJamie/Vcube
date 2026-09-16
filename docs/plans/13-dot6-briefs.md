> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# Đợt 6 — brief thi công (đọc `agent-brief.md` TRƯỚC)

Mọi luật môi trường/gate/quoting nằm ở `docs/plans/agent-brief.md`. File này chỉ nói **việc cụ thể + bằng chứng**.

## 0. Vì sao có Đợt 6

Gate tổng hợp của coordinator trên bản merge Đợt 5 (lint/build/contrast/RLS đều RC=0) **phát hiện các vi phạm còn sót** mà báo cáo từng agent không thấy, vì mỗi agent chỉ grep trong file mình sở hữu và dùng mẫu grep hẹp hơn. Số đo trên **toàn `src/`**:

| Vi phạm | Số dòng | Nơi |
|---|---:|---|
| palette thô | 32 | `stores/useProductionStore.ts` (24), `stores/useAdminOverviewStore.ts` (8) |
| jargon `GROUP n` | **25** | `views/AdminDashboardView.tsx` |
| chuỗi bịa nghiêm trọng | **35** | `context/LanguageContext.tsx` (16), `components/admin/WorkshopEstimatorBOM.tsx` (3), 13 file khác |
| emoji cờ | 3 | `data/mockData.ts:33`, `views/HomeView.tsx:213`, `components/admin/AdminStorefrontPanel.tsx:316` |
| `Math.random()` | 29 | 14 file (3 ở `AdminProductsPanel`, 1 ở `AccessoriesManager` là SKU ghi vào DB) |

**Phát hiện cấu trúc quan trọng nhất:** `settingsService.bootstrapSettings()` có **0 người gọi** ⇒ cache cấu hình chưa bao giờ được nạp; và `AdminSettingsPanel.tsx` (152 dòng) là **form chết** — `handleSave` chỉ hiện toast *"Chưa có nơi lưu cấu hình: cần nối bảng app_settings trước"*. Nghĩa là yêu cầu của chủ dự án *"mọi số liệu/thông tin đều chỉnh được trong admin"* **chưa có đường thực thi**. N1 vá đúng chỗ này.

---

## N1 — Nối tầng cấu hình admin end-to-end

**File được giao (chỉ những file này):**
- `src/main.tsx`
- `src/frontend/hooks/useSettings.ts` (**file mới**, được tạo)
- `src/frontend/components/admin/AdminSettingsPanel.tsx`

**Không đụng:** `src/backend/**` (kể cả `services/settingsService.ts` — chỉ **gọi**, không sửa), `src/index.css`, `src/frontend/ui/**`, mọi panel admin khác, `views/**`, `App.tsx`, config, `package.json`.

**Việc:**
1. `main.tsx`: gọi `bootstrapSettings()` **một lần** lúc khởi động, **không chặn render**, không `await` ở top-level. Lỗi ⇒ `console.error` trung thực (không `catch {}` im lặng, không bịa dữ liệu).
2. Tạo `src/frontend/hooks/useSettings.ts`: đọc từ cache qua `settingsAccessors` (`appSettings()`, `pricingGlobal()`, `siteContent()`, `pricingConfig()`) + đăng ký `subscribeSettings()` để re-render khi có thay đổi; trả về `{ data, loading, error }` **trung thực** (`data === null` = chưa cấu hình, KHÔNG fallback về số mặc định). Export `useAppSettings`, `usePricingGlobalSettings`, `useSiteContent`. Gọi `getStore('app_settings')` lần đầu nếu cache rỗng.
3. `AdminSettingsPanel.tsx`: viết lại để **nạp thật + lưu thật**:
   - Nạp `app_settings` (các cột đã có sẵn trong `mappers.ts:401`): `legalName`, `taxCode`, `invoiceAddress`, `hotline`, `contactEmail`, `bankAccount`, `bankName`, `warrantyTerms`, `depositPolicy`.
   - Lưu qua `settingsService` (hàm save tương ứng — đọc file để dùng đúng API; nếu chỉ có `saveSiteContent`/`savePricingGlobalSettings` thì dùng hàm generic sẵn có, **đừng tự viết `.from('app_settings')` trong component**).
   - Dùng validator đã có: `isValidTaxCode`, `isValidHotline`, `isValidEmail`, `isValidBankAccount` ⇒ hiện lỗi **cạnh ô nhập**, chặn lưu khi sai.
   - `taxCode` rỗng ⇒ hiện rõ "chưa khai báo" và **không** lưu chuỗi rỗng (service đã quy `''` → `null`).
   - Xoá toast *"Chưa có nơi lưu cấu hình"*. Xoá 2 toggle `autoInvoice`/`telemetryLogging` **nếu** chúng không có cột lưu — không được để công tắc giả.
   - Ô nhập phải có `<label htmlFor>` khớp `id` (a11y; hiện `admin/**` có `htmlFor` = 1 / `<input>` = 167).

**Gate:** `npm run lint` · `npx vite build --outDir /tmp/vc-verify-n1 --emptyOutDir` (xoá sau) · `node scripts/check-contrast.mjs`.
**Playwright red→green (bắt buộc):** RED = bấm "Lưu Cài Đặt" ở bản hiện tại ⇒ chỉ có toast, **0 request ghi DB** (chứng minh bằng network log). GREEN = nhập hotline + MST ⇒ lưu ⇒ **F5 ⇒ giá trị vẫn còn** (đọc lại từ DB, không phải `localStorage`). Ảnh + log vào `pwtest/n1/`.
**Báo cáo thêm:** `grep -c 'bootstrapSettings'` trước/sau (0 → 1+).

---

## N2 — Báo giá XUẤT CHO KHÁCH: bỏ hotline / bảo hành / dung sai bịa (Đợt 6 #1 — chủ dự án đã duyệt vá ngay)

**File được giao:** `src/frontend/components/admin/WorkshopEstimatorBOM.tsx` (**chỉ file này**).

**Bằng chứng (đọc trước khi sửa, dòng có thể lệch):**
- `:158` `• Loại Nhựa: ${selectedMaterial?.name || 'PLA Tough'} (${selectedMaterial?.brand})` — tên nhựa bịa
- `:159` `• Máy In Sản Xuất: ${selectedPrinter?.name || 'Bambu Lab X1C'}` — tên máy bịa
- `:164` `(Đã bao gồm: … nhân công QC dung sai ±0.05mm, phụ kiện & bao bì)` — claim kỹ thuật bịa
- `:167` `• Bảo hành: Đổi mới 100% nếu cong vênh hoặc sai lệch kích thước kỹ thuật.` — cam kết bịa
- `:170` `📞 Kỹ sư tư vấn VCUBE: ${pricingConfig ? 'Hotline: 0988.123.456' : '0988.123.456'}` — hotline bịa **và** ternary hai nhánh giống nhau (logic chết)

**Đây là văn bản khách hàng nhận qua Zalo/Email** (`navigator.clipboard.writeText`), không phải UI nội bộ ⇒ mọi câu trong đó phải có nguồn.

**Việc — nguyên tắc: KHÔNG hiển thị gì khi chưa cấu hình (không in "Chưa cấu hình" vào tài liệu gửi khách, cũng không bịa).**
1. Nguồn dữ liệu: `import { settingsAccessors, subscribeSettings } from '../../../backend/services/settingsService'` — đọc `appSettings()` (các cột `hotline`, `contactEmail`, `warrantyTerms`, `legalName`). **Không phụ thuộc** hook `useSettings.ts` của N1 (agent khác đang tạo song song) và **không sửa** `settingsService.ts`. Dùng `subscribeSettings` để cập nhật khi admin lưu.
2. Hotline: chỉ in dòng liên hệ khi có `hotline` **hoặc** `contactEmail` thật; nếu cả hai rỗng ⇒ **bỏ hẳn dòng đó**. Xoá `0988.123.456` và ternary chết. Bỏ emoji 📞 (luật: cấm emoji làm icon).
3. Bảo hành: chỉ in khi `warrantyTerms` có giá trị; ngược lại **bỏ dòng bảo hành**. Xoá câu "Đổi mới 100%…".
4. Dung sai: xoá claim `±0.05mm` khỏi dòng "Đã bao gồm". Nếu muốn giữ thông tin đo kiểm, lấy từ cấu hình (ví dụ `site_content`/`app_settings.settings`) và **bỏ khi rỗng**.
5. `PLA Tough` / `Bambu Lab X1C`: khi chưa chọn vật liệu/máy ⇒ in `—` (hoặc bỏ dòng), **không** in tên hãng bịa. `(${selectedMaterial?.brand})` khi brand rỗng ⇒ bỏ cặp ngoặc, đừng in `(undefined)`.
6. Thời gian hoàn thành `2 - 3 ngày làm việc` (`:166`): nếu không có nguồn cấu hình, đổi thành nội dung không hứa hẹn SLA (ví dụ "Thời gian hoàn thành: theo xác nhận khi chốt đơn") — **không** để nguyên một cam kết không có cơ sở.
7. Rà **toàn bộ** template chuỗi đó (không chỉ 5 dòng trên) để chắc không còn số/tên/cam kết nào không có nguồn.

**Gate:** lint · build outDir riêng · contrast.
**Playwright red→green:** RED = gọi hàm copy ở bản cũ (**không** dùng clipboard thật — stub `navigator.clipboard.writeText` bằng `page.addInitScript` để bắt chuỗi) ⇒ chuỗi chứa `0988.123.456`, `Đổi mới 100%`, `±0.05mm`. GREEN = chuỗi sau khi sửa **không** chứa 3 chuỗi đó và không chứa `undefined`/`null`. Lưu chuỗi bắt được vào `pwtest/n2/quote-before.txt` và `quote-after.txt`.
**Báo cáo:** dán nguyên văn chuỗi báo giá trước → sau (đã che số điện thoại nếu là thật).

---

## N3 — RoleGuard: bỏ công cụ demo + xoá nhánh `role_select` (chủ dự án đã duyệt)

**Bối cảnh:** A21 đã ẩn công cụ đổi vai trò ở mọi nơi khác, nhưng `RoleGuard.tsx` vẫn hiện nút **"Chuyển Vai Trò (Demo)"** ở **bản production** và gọi `onOpenAuthModal('role_select')`. Chủ dự án chốt: **bỏ hẳn nút + xoá nhánh `role_select`**.

**File được giao:** `src/frontend/components/RoleGuard.tsx` · `src/frontend/components/AuthModal.tsx`.
(Ghi chú ownership: `AuthModal.tsx` nguyên thuộc A21, nhưng **A21 đã xong và không còn chạy** ⇒ bạn là owner duy nhất của cả hai file lúc này. Không sửa gì khác trong `AuthModal.tsx` ngoài nhánh `role_select`.)

**Việc:**
1. `RoleGuard.tsx`: xoá nút "Chuyển Vai Trò (Demo)" + `<Icon name="swap_horiz">` + lời gọi `onOpenAuthModal('role_select')`; xoá prop `onOpenAuthModal` **nếu** không còn chỗ dùng (kiểm bằng grep, cả nơi truyền prop). Nút "Về Trang Chủ" giữ lại và là CTA duy nhất ⇒ đổi sang `rounded-full` và `bg-primary text-primary-fg` (luật §2.2 + §2.4 một CTA).
2. `AuthModal.tsx`: xoá nhánh `role_select` (khối `{!DEMO_ROLE_SWITCHER_ENABLED ? (…thông báo…) : (…)}` quanh `:838`) và bỏ `'role_select'` khỏi union type của prop `mode` + khỏi `initialize`. Sau khi xoá, `DEMO_ROLE_SWITCHER_ENABLED` phải **vẫn còn** được dùng ở chỗ khác trong file (`:897` logout) — nếu không còn chỗ dùng thì bỏ import để `tsc` sạch.
3. **Ràng buộc gate:** gate A20 (`pw-auth-prod-check.cjs`) từng khẳng định phải thấy câu "chỉ chạy ở môi trường phát triển" ở màn `role_select`. Sau khi xoá nhánh, **chạy lại gate đó** và báo rõ mục nào đổi kết quả; nếu P5/P6 fail **vì đã xoá màn đó**, ghi rõ là *fail do yêu cầu mới thay thế yêu cầu cũ* — **không** tự ý dựng lại màn để làm gate xanh.

### N3b — Nội dung bịa trong các file bạn đã sở hữu ở Đợt 5 (đã xác minh)

| File | Dòng | Vấn đề | Hướng sửa |
|---|---|---|---|
| `components/CadQuickViewModal.tsx` | ~190 | `✓ WATERTIGHT 100%` | bỏ chip, hoặc chỉ hiện khi có dữ liệu kiểm lưới thật |
| | ~208 | `±0.05 MM` cứng | `—` khi chưa cấu hình |
| | ~212 | `product.specs?.dimensions \|\| '80x80x40mm'` | `'—'` |
| `components/OrderProgress.tsx` | 20 | `desc: 'Dung sai ±0.05mm'` | "Theo thoả thuận" / bỏ |
| `components/ChatSupportModal.tsx` | 30–57 | bot tự xưng **"Kỹ sư Hoàng Long (VCUBE Lab)"**, "Hotline 24/7", bịa tiến độ "lớp 384/600", "14:30", "±0.03mm", "PETG chịu nhiệt 75°C", "PLA 35%", "120mm/s" | đổi thành **"Trợ lý tự động"** (dùng key `supportAssistant` A22b đã thêm), **bỏ mọi số bịa**; trả lời dạng "VCUBE sẽ kiểm tra và phản hồi" — không hứa SLA, không nêu thông số kỹ thuật không có nguồn |
| `components/InvoiceModal.tsx` | 87 | `MST 0108924881` + `Hotline 1900 6833` **cứng** | lấy từ `app_settings.taxCode` / `.hotline` / `.legalName` / `.invoiceAddress` (đọc qua `settingsAccessors` của `settingsService`); rỗng ⇒ in `—` hoặc bỏ dòng, **không** in mã giả |
| | ~84 | `CÔNG TY CỔ PHẦN … VCUBE VIỆT NAM`, địa chỉ Hoà Lạc cứng | như trên |
| `components/tool3d/QuoteSummaryPanel.tsx` | — | còn `±0.05` / nút lộ **giá vốn xưởng** cho khách | bỏ claim dung sai; **không** render nút giá vốn cho vai trò khách |
| `components/MaterialComparisonMatrix.tsx` | 146 | `Ma Trận Vật Liệu Chế Tác ISO/ASTM` | bỏ `ISO/ASTM` |
| `components/PageSkeleton.tsx` | 11 | `…theo chuẩn ISO/ASTM 52900` | bỏ claim chuẩn |
| `components/CanvasErrorBoundary.tsx` | 59 | `ISO/ASTM 52900` | bỏ |

**Không được**: đổi công thức pricing, đổi schema, thêm dependency, sửa file ngoài bảng trên (ngoài `RoleGuard`/`AuthModal` của N3).
**Gate:** lint · build outDir riêng · contrast · grep các file trên cho `0988\.123\.456|0\.05 ?mm|ISO/ASTM|0108924881|1900 6833|Hoàng Long|WATERTIGHT` = 0.
**Gate bổ sung:** chạy lại `pw-a22a-tool3d.cjs` (4 trạng thái route tối) ⇒ vẫn GREEN, 0 nền sáng chứa chữ, 0 pageerror (chứng minh không hồi quy thị giác).

---

## N4 — Hoàn nốt Đợt 5: jargon `GROUP n` + emoji ở `views/`

**File được giao:** `src/frontend/views/AdminDashboardView.tsx` · `src/frontend/views/HomeView.tsx`.

**Việc:**
1. `AdminDashboardView.tsx` có **25 dòng** jargon `GROUP n` (bản đồ breadcrumb từ `:168`). `AdminSidebar.tsx` (A22c đã sửa) dùng nhãn mới — **dùng đúng 6 nhãn này**, giữ nguyên `isVi` hai nhánh:
   `Tổng quan` / `Overview` · `Xưởng in & Thiết bị` / `Workshops & Fleet` · `Nhà thiết kế` / `Designers` · `Khách hàng` / `Customers` · `Danh mục & Định giá` / `Catalog & Pricing` · `Vận hành sản xuất` / `Production Operations`.
   Sửa cả comment `:167` `// Breadcrumb mapping grouped cleanly by GROUP 0 to GROUP 5`. **Không** đổi `id`/route (deep-link phải an toàn) — chỉ đổi chuỗi hiển thị.
2. `AdminDashboardView.tsx:339`: nút `Đồng Bộ DB` / `Sync DB` — đổi nhãn sang việc người dùng hiểu được (ví dụ `Nạp cấu hình` / `Load settings`) **chỉ khi** hành vi thật sự khớp; nếu hàm đằng sau vẫn là seed/đồng bộ dữ liệu mẫu thì giữ nhãn trung thực với hành vi (đọc code trước, đừng đổi nhãn cho đẹp).
3. `HomeView.tsx:213`: `activeContent.announcementBadge || '🇻🇳 ĐẠI LỄ QUỐC KHÁNH 2/9'` — **bỏ emoji** khỏi fallback (luật §2.5: cấm emoji làm icon). Nếu badge rỗng, ưu tiên **ẩn badge** thay vì bịa tên chiến dịch; `data/mockData.ts:33` (có emoji cờ) **không thuộc file bạn** — chỉ ghi nhận vào mục "còn lại".

**Gate:** lint · build outDir riêng · contrast.
**Grep chứng minh:** `grep -rnwE 'GROUP 0|GROUP 1|GROUP 2|GROUP 3|GROUP 4|GROUP 5' src/frontend/views/AdminDashboardView.tsx | wc -l` → **0**; `grep -rn '🇻🇳\|🇺🇸' src/frontend/views/HomeView.tsx | wc -l` → **0**.
**Playwright:** `/admin` — xác nhận 0 chuỗi `GROUP` trong DOM ở **cả** 16 mục sidebar (đổi `section` rồi đọc breadcrumb), 0 pageerror, `html.dark=true`; chụp `pwtest/n4/admin-breadcrumb.png`.

---

## 7. Ranh giới chung của Đợt 6

- Không ai sửa `src/index.css`, `src/frontend/ui/**`, `src/backend/**` (trừ việc **gọi** `settingsService`), `src/stores/**`, `src/data/**`, `supabase/**`, `vite.config.ts`, `tsconfig.json`, `package.json`.
- Không `git commit/push/checkout/stash/restore`. Không thêm dependency. Không in secret.
- Mỗi agent dùng `--outDir /tmp/vc-verify-<tên>` riêng và **xoá khi xong**.
- Đang chạy song song: N1 · N2 · N3 · N4. File không giao nhau. Lỗi lint/build ở file mình **không** sở hữu = trạng thái tạm của agent khác ⇒ ghi nhận, không sửa.
