> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# Đợt 10 — Sản phẩm: mở cổng xưởng in · đánh giá/uy tín · bảng còn thiếu

Luật môi trường/gate: `docs/plans/agent-brief.md` (**§2.1 encode-first · §4.1 · §4.2 retry + build tĩnh + IP WSL + kill theo PID · §4.3 cấm ghi DB bịa**).
Audit nền: `docs/plans/19-product-audit.md`.

## 0. Quyết định chủ dự án ở cổng duyệt
1. **P0 — mở cổng xưởng in + hàng đợi việc: LÀM NGAY.**
2. **P1 — đánh giá/uy tín trước** (bảo hành và thông báo để đợt sau).
3. **Thanh toán: giữ dạng sample**, không tích hợp PSP (giữ nguyên bất biến trong `AGENTS.md`).
4. **Bán file số (digital assets): NẰM TRONG PHẠM VI.**

## 0.1 Bằng chứng nền (đo được)
- Vai `lab` **tồn tại** (`src/types/index.ts:711` `UserRole = 'customer'|'designer'|'admin'|'lab'`), có nhãn UI (`RoleGuard.tsx:53`, `Header.tsx:431` badge **"MES Hub"**), **nhưng KHÔNG có route**. Chỉ có `/designer` (`['designer','admin']`) và `/admin` (`['admin']`).
- **`src/frontend/views/WorkshopSettingsView.tsx` (1.588 dòng, file lớn thứ 2 dự án) HOÀN TOÀN MỒ CÔI** — grep toàn repo chỉ thấy tự tham chiếu. **`WorkshopOnboardingWizard.tsx` cũng 0 người gọi.**
- **Schema ĐÃ SẴN SÀNG, không cần đổi:** `orders` có `status`, `status_stage_index` (8 nấc), `layer_progress`, **`assigned_workshop_id`**, `assigned_printer_id`; `workshop_profiles` có `user_id` (→ auth user), `partner_id`, `verified_status` (Pending/Verified/Suspended), `electricity_rate_override`, `labor_rate_override`; `workshop_partners` có `capacity_status`, `active_jobs_count`, `completed_jobs_count`, `current_queue_length`; `user_profiles.role` CHECK cho phép cả `'workshop'` **và** `'lab'`.
- **Bảng CHƯA có (cần migration):** `reviews` (404) · `digital_assets` (404) · `cart_items` (404). (`products.reviews_count` có cột nhưng **không có bảng đánh giá** ⇒ mọi nơi phải hiện "Chưa có đánh giá".)

---

## W1a — Mở cổng: route `/lab` + quyền + nav + onboarding

**File được giao:** `src/App.tsx` · `src/frontend/components/Header.tsx` · `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx` · `src/frontend/components/RoleGuard.tsx`.

**Việc:**
1. **Route mới `/lab`** (+ `/lab/:tab`) dùng `React.lazy` (nhất quán với 3 view đang lazy), bọc `RoleGuard allowedRoles={['lab','workshop','admin']}`.
   ⚠️ **Chấp nhận CẢ `'lab'` và `'workshop'`**: DB CHECK cho phép cả hai, type `UserRole` chỉ có `'lab'`. Nếu bạn cần nới `UserRole`, **`src/types/index.ts` KHÔNG thuộc bạn** (R2 vừa sửa xong) ⇒ báo lại `file:line` thay vì tự sửa.
2. **Điều hướng theo vai** (`Header.tsx`): vai `lab` phải thấy mục **"Xưởng in"** trỏ `/lab` (thay vì chỉ thấy nav của khách). Giữ nguyên nút VIE|ENG, không hardcode ngôn ngữ, dùng `t(...)` như hiện có.
3. **`WorkshopOnboardingWizard`**: hiện **0 người gọi**. Nối vào `/lab` — nếu `workshop_profiles` của user chưa có hàng (hoặc `verified_status='Pending'`) thì hiện wizard; xong thì vào bảng điều khiển. Đọc `src/backend/services/workshopService.ts` để biết API sẵn có (**W1b đang sửa file đó — chỉ ĐỌC, đừng sửa**); nếu thiếu hàm thì **báo lại**.
4. **Xoá chuỗi quảng cáo sai nếu có**: trong 3 file của bạn, không được hứa tính năng chưa tồn tại.
5. `RoleGuard`: nhãn vai `lab` đã có ("Xưởng in / Đối tác sản xuất (3D Print Lab)") — giữ. Nếu bạn chạm `fallbackScreen` (prop chết đã ghi nợ) thì dọn luôn.

**Gate:** lint · `npx vite build --outDir /tmp/vc-verify-w1a --emptyOutDir` · contrast · `node scripts/check-fabricated.mjs` = 0 ở 4 file.
**Playwright (build tĩnh + `vite preview --port 4197 --strictPort --host 0.0.0.0`, Edge gọi **IP WSL** `hostname -I`, retry ≤3, kill theo PID):**
- Đăng nhập tài khoản **designer** (`creator.lethang@vcube.vn` / `123456`) ⇒ vào `/lab` phải bị **chặn 403** (không có quyền).
- Đăng nhập **admin** ⇒ `/lab` **vào được** (admin xem được mọi khu).
- **Guest** ⇒ `/lab` bị chặn, có đường về.
- Trong DOM của `/lab`, **không** còn chuỗi `1.588 dòng vô chủ` kiểu "sắp ra mắt" — phải là UI thật.
- 0 `pageerror`. Ảnh `pwtest/w1a/`.
⚠️ **Không có tài khoản `lab` thật trong hệ thống** (`user_profiles` chỉ có 3 hàng: 2 admin + 1 designer). ⇒ Chứng minh nhánh `lab` bằng **`page.route()` fixture** trả `user_profiles.role='lab'` (đúng phương pháp đã dùng ở các đợt trước), **KHÔNG** tạo tài khoản thật và **KHÔNG** ghi DB.

---

## W1b — Bảng điều khiển xưởng: dữ liệu **của chính mình** + hàng đợi việc

**File được giao:** `src/frontend/views/WorkshopSettingsView.tsx` · `src/backend/services/workshopService.ts`.

**Việc:**
1. **Phạm vi theo chủ thể.** Hiện view này không biết "tôi là xưởng nào". Phải lấy `workshop_profiles` của user đang đăng nhập (`user_id`) → `partner_id`, rồi **chỉ hiện dữ liệu của chính xưởng đó** (máy in, vật liệu, tồn kho, đơn được giao). **Không** hiện số liệu của xưởng khác, **không** hiện số liệu toàn hệ thống.
2. **Hàng đợi việc** (phần cốt lõi của P0): danh sách `orders` có `assigned_workshop_id = <partner_id của tôi>`, hiển thị đơn + hạn + mặt hàng, và cho xưởng **cập nhật tiến độ**:
   - Dùng đúng 8 nấc mà khách đã thấy trong `OrderProgress` (`placed → slicing → nesting → heating → printing → post_cure → qc_check → shipping` — **đọc file đó để lấy đúng id/nhãn**, đừng tự đặt tên mới).
   - Ghi `orders.status_stage_index` (+ `status`, `layer_progress` nếu có ô nhập). **Không** ghi vào `orders` các cột ngoài phạm vi.
   - Có hành động **nhận việc** và **xác nhận hoàn thành**; mỗi lần đổi trạng thái hiện toast trung thực (không hứa gì thêm).
3. **Khai báo năng lực**: máy in / vật liệu / tồn kho của chính xưởng — dùng bảng đã có (`printer_fleet`, `materials`, `workshop_machines`, `workshop_materials`, `material_inventory_logs`, `workshop_accessories`). Nếu một mục **chưa có API** trong `workshopService.ts` thì **viết hàm mới ở đó** (file thuộc bạn) — theo đúng pattern hiện có, qua `src/backend/supabase/*`, **không** truy cập DB inline từ component.
4. **Rate riêng của xưởng**: `workshop_profiles.electricity_rate_override` / `labor_rate_override` đã có cột ⇒ cho xưởng khai; **rỗng = chưa cấu hình** (không mặc định số bịa). ⚠️ **KHÔNG đọc/ghi `pricing_global_settings`** — file đó thuộc R1; nếu thấy cần thì **báo lại**.
5. **Empty state** cho mọi danh sách rỗng bằng primitive `src/frontend/ui/EmptyState` (bảng điều khiển xưởng mới sẽ rỗng vì DB đang trống ⇒ đây là trạng thái **mặc định** phải đẹp và có CTA chỉ việc làm tiếp theo).
6. Giữ dark-first + token hiện có. Không tạo ngôn ngữ thị giác mới; dùng `StatCard`/`DataTable`/`EmptyState`/`Button` trong `src/frontend/ui`.

**Gate:** lint · build outDir riêng · contrast · `check-fabricated` = 0 ở 2 file.
**Playwright (build tĩnh, cổng riêng, retry ≤3, **KHÔNG ghi DB thật**):**
- `page.route()` fixture: `workshop_profiles` của tôi + 3 `orders` được giao + 2 đơn của xưởng khác ⇒ `/lab` **chỉ hiện 3 đơn của tôi**, **không** hiện 2 đơn kia (**đây là phép thử quan trọng nhất** — sai là rò dữ liệu giữa các xưởng).
- Cập nhật tiến độ: bấm nấc ⇒ request PATCH đúng `orders.id` + `status_stage_index`, và **payload không chứa cột lạ** (in payload ra báo cáo).
- DB trống ⇒ mọi danh sách có `EmptyState`, 0 số bịa, 0 `pageerror`.
- 0 request ghi thật ra ngoài fixture (đếm và in ra).
- Ảnh + log ⇒ `pwtest/w1b/`.
⚠️ **Nếu buộc phải ghi DB thật để chứng minh, DỪNG LẠI và báo coordinator** — luật §4.3.

---

## W2 — Migration: `reviews` + `digital_assets` + `cart_items` (+ RLS + sinh lại `apply_all_manual.sql`)

**File được giao:** `supabase/migrations/20260901_baseline_schema.sql` · `supabase/migrations/20261010_harden_rls.sql` · `supabase/scripts/apply_all_manual.sql` (**sinh lại, KHÔNG sửa tay**).

**🔴 LUẬT MIGRATION (bắt buộc):**
- **Chỉ sửa 3 file migration hiện có. KHÔNG tạo file migration mới.** Sửa **trực tiếp** 2 file trên.
- `supabase/scripts/apply_all_manual.sql` **KHÔNG được sửa tay** — sinh lại bằng `node scripts/gen-apply-all.mjs` (script tự `assert` 4 file gốc nằm nguyên văn).
- Mọi thay đổi phải **idempotent** (`create table if not exists`, `alter table … add column if not exists`, `drop constraint if exists` trước `add constraint`).
- **KHÔNG `DROP` dữ liệu.** Không đổi cột/dữ liệu của bảng hiện có trừ khi thật cần — nếu cần thì phải guarded như A8 đã làm (`20260903` vụ `pricing_global_settings`).
- **KHÔNG xoá dữ liệu production.** Không chạy gì lên DB.

**Bảng cần thêm (theo đúng chuẩn hiện có của file: `text`/`uuid` pk, `created_at/updated_at`, index, trigger `updated_at`, bật RLS, policy ở file hardening):**

1. **`reviews`** — đánh giá 2 chiều. Tối thiểu: `id`, `order_id` (→ `orders`), `author_id` (→ `auth.users`), `target_type` CHECK (`'designer'|'workshop'|'product'`), `target_id` (text), `rating` (int, CHECK 1–5), `comment` (text default ''), `photos` (text[] default '{}'), `status` CHECK (`'published'|'hidden'|'pending'` default `'pending'`), `created_at`, `updated_at`.
   - Ràng buộc: **một đánh giá cho một (order, author, target)** — unique index.
   - Khi `status='published'` thì cập nhật `products.reviews_count`/rating **qua trigger hoặc ghi chú rõ là việc của tầng service** (chọn 1, nói rõ).
2. **`digital_assets`** — file số của designer. Tối thiểu: `id`, `product_id` (text), `designer_id` (uuid → auth.users), `storage_path` (text, bucket nào — đọc các bucket đã khai trong `20260901` để dùng đúng), `file_format`, `file_size_bytes`, `checksum` (text), `license_type` (text **nullable** — rỗng = chưa khai), `download_limit` (int nullable), `watermark_required` (bool default true), `created_at`, `updated_at`.
3. **`cart_items`** — giỏ bền. Tối thiểu: `id`, `user_id` (uuid), `product_id` (text), `quantity` (int ≥1), `unit_price_snapshot` (numeric nullable), `added_at`, `updated_at`. Unique `(user_id, product_id)`.

**RLS (file `20261010_harden_rls.sql`):** theo đúng khuôn `is_admin_or_lab()` / `is_admin()` hiện có, **không** `FOR ALL USING (true)`:
- `reviews`: **ai cũng đọc được** bản `published`; tác giả đọc bản của mình; tác giả **chèn** được (chỉ khi `author_id = auth.uid()`); **sửa/xoá** bản của mình khi còn `pending`; admin full.
- `digital_assets`: **designer chỉ thấy file của mình**; **khách KHÔNG được đọc `storage_path`** (đây là điểm sống còn — chống lấy file); admin full. Nếu cần khách tải thì phải qua `createSignedUrl` ở tầng service (ghi chú rõ).
- `cart_items`: chỉ chủ sở hữu (`user_id = auth.uid()`), admin đọc.
- **Bật RLS cho cả 3 bảng** và **thêm vào allowlist** của `lint-rls-migration.mjs` nếu script yêu cầu (đọc script trước).

**Gate (bắt buộc, dán output thật):**
```
node scripts/lint-rls-sources.mjs      # RC=0
node scripts/lint-rls-migration.mjs    # RC=0
node scripts/a8-sql-syntax-check.mjs   # RC=0
node scripts/gen-apply-all.mjs         # sinh lại apply_all_manual.sql
node scripts/a8-db-probe.mjs           # ĐỌC trạng thái — ghi rõ RC (RC=1 là dự kiến vì migration CHƯA được dán)
npm run lint && npx vite build --outDir /tmp/vc-verify-w2 --emptyOutDir
```
Báo cáo: số dòng `apply_all_manual.sql` trước/sau; danh sách bảng + policy mới; **việc chủ dự án phải làm** (dán lại `apply_all_manual.sql` + chạy `supabase/diagnostics/verify_admin_settings.sql`).

---

## R4 — Nhánh `null` ở tầng view + MP-09 (bàn giao từ R2)

**File được giao:** `src/frontend/views/Tool3DView.tsx` · `src/frontend/components/tool3d/ValidationReportPanel.tsx` · `src/frontend/components/tool3d/PresetPalettePanel.tsx` · **`src/frontend/views/ProductDetailView.tsx`** · **`src/backend/supabase/mappers.ts`** (chỉ để map `license_type`).
**KHÔNG thuộc R4:** `CartView.tsx:222` (fallback `'Commercial License'`) — file của **R1**; đã báo R1.

**Vì sao:** R2 vừa đổi `meshParser.ts` để số đo **không đo được ⇒ `null`** (khác `0`). Tầng view chưa biết trạng thái thứ ba nên sẽ hiện chữ sai. R2 bàn giao cụ thể:

| # | `file:line` | Vấn đề | Hướng sửa |
|---|---|---|---|
| 1 | `Tool3DView.tsx:386` | thiếu 1 dòng map `boundaryEdges: parsed.boundaryEdges,` ⇒ **số biên hở đo được không tới UI**; chữ ở `:1253-1257` ("bộ đọc chưa tách riêng số biên") nay **lỗi thời** | thêm map + sửa chữ |
| 2 | `Tool3DView.tsx:1233,1248` | `isWatertight` có thể `null` ⇒ hiện "Không kín" **sai** | trạng thái thứ ba: **"Chưa phân tích"** |
| 3 | `Tool3DView.tsx:1263,1272,1275` | `minWallThickness` `null` ⇒ in **"Min: null mm"** + nhãn "Cảnh báo quá mỏng" **sai** | `null` ⇒ `—` / "Chưa đo được", **không** kết luận |
| 4 | `ValidationReportPanel.tsx:238-241,262,270,274` | `isWatertight`/`invertedNormals`/`minWallThickness`/`nonManifoldEdges` `null` ⇒ hiện "Không kín"/**"null faces"**/"null mm" | nhánh `null` riêng |
| 5 | `Tool3DView.tsx:537,869,885` | dropzone vẫn **quảng cáo STEP/IGES là định dạng hỗ trợ** trong khi parser nay từ chối thẳng (`MeshParseError('unsupported_format')`) ⇒ **hứa sai** | sửa copy: STEP/IGES cần bản tessellation hoặc báo giá thủ công |
| 6 | `meshParser.ts:561-585` (`simulateSplitShells`) + `Tool3DView.tsx:653-667` | "Tách Khối Connected Shells" vẫn **bịa 2 chi tiết** (×0.58/×0.42) và **có thể đổi giá** khi bấm — MP-09 | `meshParser.ts` **KHÔNG thuộc bạn** ⇒ **vô hiệu hoá nút ở tầng view** (disabled + lý do trung thực) hoặc **báo lại** nếu bạn cho rằng phải sửa parser |
| 7 | `ProductDetailView.tsx:104` | hardcode `licenseType: 'Commercial License (Được phép sản xuất)'` khi **thêm vào giỏ** — **mạnh hơn fallback hiển thị: nó KHẬNG ĐỊNH có giấy phép**. | `null`/để trống — **không** khẳng định loại giấy phép chưa ai khai |
| 8 | `src/backend/supabase/mappers.ts:114-153` (`rowToProduct`) | **không map cột `license_type`** ⇒ **mọi** sản phẩm đọc từ DB có `licenseType = undefined`; trước đây fallback `'Commercial License'` bắn cho **100%** sản phẩm thật. Tức tính năng giấy phép hỏng từ đầu-cuối. | **map cột `license_type`** vào `licenseType` (nullable, rỗng ⇒ `null`) |
| 7 | `PresetPalettePanel.tsx:72-77,93-98,313,327,331` | còn `density: 1.24`, `costPerKg: 350000`, `vendor:'Bambu Lab AMS'`, `usedGrams = volumeCm3×1.24`, `'~15.0 g'`, `'~4.8 m'` khi tệp **không có** dữ liệu slicer ⇒ **số bịa** | theo `data-honesty.md`: bỏ suy diễn, để trống/`—` khi tệp không cung cấp |

**Ràng buộc:** `pricingEngine.ts` **KHÔNG thuộc bạn** (R1 đang sửa, và đã được giao sửa guard `null < 0.8`). Nếu bạn kết luận cần guard ở đó, **báo `file:line`**.
**Gate:** lint · build outDir riêng · contrast · `check-fabricated` = 0 ở 3 file.
**Playwright (build tĩnh, cổng riêng, retry ≤3, không ghi DB; tái dùng `pw-r2-tool3d.cjs` + `a22a-cube.stl`):**
- Tệp **>60.000 tam giác** (R2 ghi parser trả `null`) ⇒ **0** chuỗi `null mm` / `null faces` / "Không kín" sai; có **"Chưa phân tích"** ở đúng chỗ.
- STL 20 mm thật ⇒ số đo đúng, **có** dòng biên hở (chứng minh `boundaryEdges` đã tới UI).
- Dropzone **không** còn hứa STEP/IGES.
- Nút "Tách Khối" **không** tạo 2 chi tiết với số bịa.
- 0 `pageerror`. Ảnh `pwtest/r4/`.

---

## 9. Ranh giới chung Đợt 10
- Đang chạy song song: **W1a · W1b · W2 · R4** (+ **R1** và **R3** còn từ Đợt 9). **Tập file không giao nhau.**
- **`src/types/index.ts` KHÔNG thuộc ai** trong đợt này (R2 vừa sửa xong) ⇒ nếu cần nới type, **báo `file:line`**, đừng tự sửa.
- **`src/utils/pricingEngine.ts` chỉ R1.** **Không đổi công thức pricing.**
- **Cấm ghi dữ liệu bịa lên DB production** (§4.3). Nghiệm thu bằng `page.route()` fixture. **W2 tuyệt đối không chạy migration lên DB.**
- Playwright: build tĩnh + `vite preview --host 0.0.0.0` **cổng riêng** (W1a 4197 · W1b 4198 · R4 4199), Edge gọi **IP WSL**, **retry ≤3**, **kill theo PID cổng của mình** (không `pkill -f`), xoá outDir. **Không đụng dev :3000.**
- Không `git commit/push/checkout/stash/restore`; không thêm dependency; **không để artefact trong repo** (ảnh ghi ra `C:\Users\chith\AppData\Local\Temp\pwtest\`).

## 10. Chờ chủ dự án
| # | Việc | Chặn gì |
|---|---|---|
| 1 | 🔴 **Dán lại `supabase/scripts/apply_all_manual.sql`** | `site_content.settings` chưa tồn tại (`42703`); `pricing_global_settings` còn `8/2850/65000`. **W2 sẽ làm file này dài thêm ⇒ nên dán SAU khi W2 xong.** |
| 2 | Tạo 1 tài khoản `lab`/`workshop` thật để nghiệm thu cổng xưởng | chưa có; W1a/W1b chứng minh bằng fixture |
| 3 | Bảo hành (nối `warranty_claims`) · thông báo · messaging | đợt sau |
| 4 | `designer` chưa publish vẫn `status:'Published'` (AT-07) · persona bịa (AD-06) | quyết định nghiệp vụ |
