# Runbook — Sửa lỗ hổng RLS của VCUBE

Tài liệu này là hướng dẫn thi công và khắc phục sự cố cho việc siết Row Level Security.
**Trạng thái: đã sửa xong ở tầng mã nguồn migration; cần bạn chạy trên Supabase.**

---

## 1. Vấn đề là gì (nguyên nhân gốc)

Các migration đầu tiên tạo policy kiểu "admin" **không kiểm tra quyền**:

```sql
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (true);
CREATE POLICY "Public can view orders"     ON public.orders   FOR SELECT USING (true);
CREATE POLICY "Users can view profiles"    ON public.user_profiles FOR SELECT USING (true);
```

Các migration sau ("hardening") chỉ `DROP POLICY IF EXISTS` **theo tên của chính nó**, nên các policy `USING (true)` ở trên **vẫn còn sống**. Postgres **OR** các policy permissive với nhau ⇒ policy cũ vô hiệu hoá mọi policy siết chặt hơn.

Thêm hai đường leo quyền nữa:
* `(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'` — `user_metadata` do **client** ghi được (`supabase.auth.updateUser`), nên bất kỳ ai cũng tự phong admin.
* `... OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'` — email admin hardcode trong 43 chỗ, không thể thu hồi quyền mà không sửa SQL.

**Hệ quả nếu để nguyên:** anon key (công khai trong bundle) đọc được toàn bộ `orders` (tên/SĐT/địa chỉ/`secure_access_token`) và toàn bộ `user_profiles` (email, điện thoại, `kyc_details`), đồng thời ghi/xoá được `products`, `materials`, `printer_fleet`, `pricing_config` và chèn được `payment_transactions` — vi phạm Nghị định 13/2023/NĐ-CP về dữ liệu cá nhân.

### 1.1 Phát hiện quan trọng khi kiểm tra thực tế (2026-09-12)

Kiểm tra trực tiếp project `vcxarjwzbihvurpkcufa` bằng anon key:

| Kiểm tra | Kết quả |
|---|---|
| `GET /rest/v1/products` | **404 `PGRST205`** — "Could not find the table 'public.products' in the schema cache" |
| `orders`, `user_profiles`, `payment_transactions` | 404 `PGRST205` — **không tồn tại** |
| RPC `get_order_by_guest_token` | không tồn tại |
| `GET /rest/v1/` (OpenAPI) | `401 UNAUTHORIZED_INVALID_API_KEY_TYPE` |
| `.env` | đang là bản sao placeholder của `.env.example` |

⇒ **Project production hiện chưa có schema VCUBE nào.** Vì vậy:
1. Lỗ hổng đang ở dạng **tiềm ẩn trong file migration**, chưa bị khai thác (vì chưa có bảng/dữ liệu).
2. App hiện chạy bằng **dữ liệu mock/localStorage**, không phải Supabase — khớp với phát hiện trong `docs/design/data-honesty.md`.
3. Vì chưa có dữ liệu, đây là **thời điểm tốt nhất** để tạo schema đúng ngay từ đầu thay vì vá dữ liệu sống.

---

## 2. Đã sửa những gì

### 2.1 Sửa trong migration gốc (để một lần apply mới cũng không tạo ra lỗ hổng)

| File | Thay đổi |
|---|---|
| `20260901_rls_helpers.sql` **(mới)** | Tạo `public.current_app_role()` và `public.is_admin()` **chạy sớm nhất**. Viết bằng plpgsql + bắt `undefined_table` nên chạy được cả khi `user_profiles` chưa tồn tại (fail-closed: trả `'anon'`). |
| `20260904_complete_vcube_schema_and_seeds.sql` | 6 policy `FOR ALL USING (true)` → `TO authenticated USING (public.is_admin()) WITH CHECK (…)`; `orders` bỏ `SELECT USING (true)`; `user_profiles` bỏ `SELECT USING (true)`; `products` chỉ đọc `status IN ('published','Published')`; insert `orders` phải có `secure_access_token` ≥ 12 ký tự. |
| `20260904_create_products_and_storage.sql` | 6 chuỗi `user_metadata`/email → `public.is_admin()`. |
| `20260904_secure_rls_and_pricing.sql` | 4 chuỗi → `is_admin()`; insert `orders` phải có token. |
| `20260904_sync_complete_schema.sql` | 8 chuỗi → `is_admin()`. |
| `20260905_master_production_schema.sql` | 17 chuỗi → `is_admin()`; insert `orders` phải có token; `payment_transactions` chuyển từ "ai cũng insert được" → **chỉ admin** (webhook thật dùng `service_role`, role này bỏ qua RLS). |
| `20260905_role_profiles_and_pricing_schema.sql` | 11 chuỗi → `is_admin()`; insert `material_inventory_logs` từ `WITH CHECK (true)` → chỉ chủ xưởng hoặc admin. |

Kết quả quét: **0 policy dùng `user_metadata`, 0 email hardcode, 0 `FOR ALL USING (true)`** (xem §5 gate).

### 2.2 File siết cuối cùng (mọi môi trường, chạy sau tất cả)

`supabase/migrations/20261010_harden_rls.sql` — idempotent, thích ứng schema không thống nhất:

1. Tạo/chuẩn hoá 4 helper: `current_app_role()`, `is_admin()`, `is_admin_or_lab()` (admin hoặc lab)
   và `current_workshop_partner_id()` (partner_id của xưởng đang đăng nhập; `limit 1` vì `workshop_profiles.user_id` không unique).
2. `DROP` toàn bộ 73 tên policy cũ từng tồn tại trong repo.
3. **Quét sạch policy lạ** trên 31 bảng mục tiêu không nằm trong allowlist (kể cả policy tạo tay trong Dashboard).
4. Tạo 84 policy đúng + 6 policy storage.
5. Trigger `trg_protect_profile_privileged_columns` — chặn người dùng tự đổi `role`/`kyc_status`/`account_status`/`total_*` của chính mình.
6. Trigger `trg_create_profile_for_new_user` — tự tạo `user_profiles` (role `customer`) khi có user mới, vì client hiện **không** tạo dòng này.
7. Trigger `trg_protect_order_privileged_columns` — xưởng in được giao đơn **chỉ** được đổi `status`/`status_stage_index`/`layer_progress`/`updated_at` (RLS không giới hạn được cột; đổi cột khác ⇒ `42501`).
8. Trigger `trg_protect_workshop_profile_privileged_columns` — chủ xưởng **không** tự đổi `partner_id`/`verified_status` của hồ sơ mình (cùng lớp leo thang: `current_workshop_partner_id()` đọc chính `partner_id` để cấp quyền trên `orders`). Admin đi qua; secret key/SQL Editor (`auth.uid()` NULL) cũng đi qua.
9. View `pricing_config`: bật `security_invoker = true` nếu nó là VIEW (view mặc định bỏ qua RLS).
10. Kiểm tra cuối: cảnh báo nếu còn policy permissive trên bảng nhạy cảm.
11. Toàn bộ nằm trong `begin; … commit;` ⇒ lỗi thì rollback nguyên vẹn, không để trạng thái nửa vời.

> ⚠️ Các số ở trên là **số thật** sau Đợt 10 (W2 · W2b · W5) và Đợt 25 (doanh thu 3 bên). `node scripts/gen-apply-all.mjs` tự đếm lại
> (số bảng + allowlist policy) và in ra khi sinh file gộp ⇒ đừng chép tay số cũ vào đây.

### 2.3 Ma trận quyền sau khi siết

| Bảng | anon (khách) | authenticated | admin |
|---|---|---|---|
| `products` | đọc **chỉ published** | đọc published | toàn quyền |
| `orders` | **không đọc**; chỉ INSERT kèm token | đọc **đơn của mình** (`user_id`/`customer_email`); **xưởng được giao đơn** đọc + cập nhật tiến độ (`status`/`status_stage_index`/`layer_progress`; cột khác bị trigger chặn `42501`) | toàn quyền |
| `user_profiles` | **không** | đọc/sửa **của mình** (không đổi được role) | toàn quyền |
| `materials`, `printer_fleet`, `accessories`, `workshop_partners`, `site_content`, `pricing_configs`, `workshop_*`, `designer_profiles`, `pricing_global_settings` | đọc | đọc; chủ xưởng sửa tài sản của mình | toàn quyền |
| `payment_transactions` | **không** | **không** (chỉ admin; webhook dùng service_role) | toàn quyền |
| `cost_rules` | **không** | **không** | toàn quyền |
| `material_inventory_logs` | **không** | chủ xưởng (đọc/ghi) | toàn quyền |
| `quotes` | **không** | chủ sở hữu: **đọc / nộp mới / sửa** báo giá của mình (`user_id`); **KHÔNG xoá** (D5b: giữ lịch sử để đối soát) | toàn quyền |
| `kyc_records` | **không** | **chỉ đọc + nộp mới** hồ sơ của mình; **không** UPDATE/DELETE ⇒ không tự duyệt / tự sửa kết quả duyệt | toàn quyền |
| `reviews` | đọc **chỉ `published`** | đọc bản của mình; chèn khi `author_id = auth.uid()` và `status = 'pending'`; sửa/xoá khi còn `pending` | toàn quyền |
| `digital_assets` | **không** (không policy nào cho anon ⇒ không lộ `storage_path`) | designer sở hữu: toàn quyền trên file của mình | toàn quyền |
| `cart_items` | **không** | chỉ chủ sở hữu (`user_id`) | chỉ đọc |
| `order_items` | **không** | **chỉ chủ đơn đọc** dòng tiền của đơn mình; không INSERT/UPDATE/DELETE. Xưởng in **không** đọc (RLS mức dòng ⇒ sẽ lộ luôn `platform_fee_amount`) | toàn quyền |
| `workshop_commission_terms` | **KHÔNG** | **KHÔNG** (chỉ admin) | toàn quyền — bảng RIÊNG cho **chiết khấu đàm phán từng đối tác**; cố ý KHÔNG nằm trong catalog công khai (khác `workshop_partners`, bảng đó đọc công khai nên để % ở đó là phơi bí mật kinh doanh) |
| Storage `product-images` | đọc | đọc | ghi (upsert cần SELECT+INSERT+UPDATE → `FOR ALL`) |
| Storage `cad-files` | **không** | người mua: đọc file nằm trong đơn của mình; **designer: tự quản file số của mình** theo `digital/<auth.uid()>/…` | toàn quyền |

---

## 3. Các bước thi công

### Bước 1 — Xem trạng thái hiện tại (chỉ đọc)
Chạy `supabase/diagnostics/rls_audit.sql` trong Supabase SQL Editor. Mục C của kết quả liệt kê mọi policy còn hở.

### Bước 2 — Áp migration

Chuỗi migration hiện tại **chỉ còn 3 file** (6 file cũ đã chuyển sang `supabase/legacy/`, xem README ở đó):

| Thứ tự | File | Vai trò |
|---|---|---|
| 1 | `supabase/migrations/20260900_rls_helpers.sql` | `current_app_role()` + `is_admin()` (fail-closed khi chưa có bảng profile) |
| 2 | `supabase/migrations/20260901_baseline_schema.sql` | **Toàn bộ schema**: **30 bảng**, **45 index** (+1 unique index một phần cho KYC), **7 hàm**, **5 trigger** (tự sinh profile, chống nâng quyền profile, đồng bộ kho, touch `updated_at`, giữ `products.reviews_count`/`rating` theo đánh giá), 2 storage bucket, realtime, seed tối thiểu. Có bật RLS trên mọi bảng (deny-all cho tới khi có policy). |
| 3 | `supabase/migrations/20261010_harden_rls.sql` | **Toàn bộ policy**: dọn policy cũ + policy lạ (kể cả tạo tay trong Dashboard), tạo **84 policy** đúng + **6 policy storage** trên **31 bảng mục tiêu**, 2 trigger chống sửa cột đặc quyền (`orders` + `workshop_profiles`), `security_invoker` cho view `pricing_config`, kiểm tra cuối |

* **Project trống (đúng hiện tại)**: chạy **cả 3 file theo thứ tự trên**. Mỗi file là một transaction độc lập — lỗi thì rollback sạch, không để trạng thái nửa vời.
* **Project đã có schema cũ**: chạy **chỉ file 3** để siết lại (nó tự dọn policy cũ và policy lạ).

Chạy trên **staging trước** nếu có. Nếu Supabase SQL Editor báo lỗi ở file 2, gửi nguyên văn thông báo lỗi — không sửa tay giữa chừng.

### Bước 3 — Cấp quyền admin (BẮT BUỘC, nếu không sẽ không ai quản trị được)
Mở `supabase/scripts/bootstrap_admin.sql`, **sửa `v_email`** thành email đăng nhập thật của bạn, rồi chạy. Script sẽ tạo/ cập nhật dòng `user_profiles` với `id = auth.uid()` và `role = 'admin'`.

> Lưu ý: nút "Chuyển vai trò" trong app (`AuthContext.switchDemoRole`) chỉ ghi vào `user_metadata` — sau khi siết, nó **không còn cấp quyền DB**. Đây là điều mong muốn.

### Bước 4 — Kiểm chứng
```bash
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "node scripts/verify-rls.mjs"
# thêm phép thử ghi (no-op update, không phá dữ liệu):
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "node scripts/verify-rls.mjs --writes"
```
Kỳ vọng: **`anon đọc orders` = PASS 0 dòng**, `anon đọc user_profiles` = PASS 0 dòng, `anon ghi products` = PASS, và các bảng app cần (products published, materials…) > 0 dòng. Thoát code 0.

### Bước 5 — Kiểm tra app
1. Đăng nhập bằng tài khoản đã bootstrap → mở `/admin`, sửa 1 sản phẩm, F5 để xác nhận đã lưu.
2. Ở cửa sổ ẩn danh (khách): xem `/`, `/explore`, thêm vào giỏ, checkout (guest insert phải thành công), tra cứu đơn bằng mã + token.
3. Xác nhận khách **không** xem được `/orders` của người khác và không tải được `cad-files`.

### Bước 6 — Sửa phía client (thuộc Phase 3 của kế hoạch)
Hiện client vẫn lấy vai trò từ `user_metadata` khi dựng profile (`AuthContext.tsx:67-80`, `:273-316`). Sau khi DB là nguồn quyền, cần đổi client đọc `user_profiles.role` để UI khớp với quyền thật — nếu không, UI sẽ hiện nút admin nhưng thao tác ghi sẽ bị DB từ chối.

---

## 4. Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Vào `/admin` nhưng mọi thao tác lưu đều lỗi | Tài khoản chưa có `user_profiles.role='admin'` | Chạy lại `bootstrap_admin.sql`; kiểm bằng `select id,email,role from public.user_profiles;` |
| Không tạo được đơn ở checkout | Policy `*_guest_insert` yêu cầu `secure_access_token` ≥ 12 ký tự và `items` không null | Kiểm tra payload `dbService.saveOrder` (`database.ts:248-271`) có gửi `secure_access_token` không |
| Xưởng không sửa được máy/vật liệu của mình | `workshop_profiles.user_id` chưa trỏ tới `auth.uid()` | `update public.workshop_profiles set user_id = '<auth-uid>' where id = '<workshop-id>';` |
| Người mua không tải được file CAD | Policy `vcube_cad_files_buyer_read` dựa trên `orders.items` chứa tên object | Bảng `orders.items` phải lưu đường dẫn object trong bucket; giải pháp bền vững là bảng `order_files(order_id, object_name)` |
| Nghi ngờ policy bị xoá nhầm | Bước 9 dọn mọi policy ngoài allowlist | Chạy `rls_audit.sql` mục B/A; nếu thiếu, chạy lại `20261010_harden_rls.sql` (idempotent) |
| Cần tạm mở lại để cứu dữ liệu | — | **Không** mở `USING (true)`. Dùng `service_role` key trong script server-side (bỏ qua RLS) rồi siết lại |
| Muốn rollback toàn bộ | — | `git revert` commit SQL là đủ: file hardening chỉ tạo policy, không sửa dữ liệu. Trạng thái cũ (có lỗ hổng) chỉ nên khôi phục trên môi trường test |

---

## 5. Gate kiểm tra (chạy trong CI/trước khi commit)

```bash
# 1. Không anti-pattern RLS trong bất kỳ migration nào (73 tên policy cũ nằm trong danh sách drop của file hardening)
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "node scripts/lint-rls-sources.mjs"

# 2. File hardening tự nhất quán (allowlist khớp policy tạo ra, dollar-quote cân bằng…)
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "node scripts/lint-rls-migration.mjs"

# 3. Kiểm chứng thực tế bằng anon key (cần project đã có schema)
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "node scripts/verify-rls.mjs --writes"

# 4. Gate TS/build như thường lệ
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "npm run lint && npm run build"
```

---

## 6. Giới hạn đã biết (minh bạch)

1. **Chưa chạy được trên Postgres thật.** Môi trường WSL không có `psql`/`postgres`/`docker` và `sudo` cần mật khẩu, nên migration chưa được thực thi thật. Bù lại: 2 linter tĩnh + `begin;…commit;` (lỗi ⇒ rollback) + `rls_audit.sql` để kiểm ngay sau khi chạy.
2. **`verify-rls.mjs` cần schema tồn tại.** Với project hiện tại (chưa có bảng) script báo `SKIP` kèm cảnh báo, không kết luận sai.
3. **`head:true` không dùng được để kiểm chứng** — PostgREST trả `204 + count:null + error:null` cho bảng không tồn tại, tức là "thành công rỗng". Script đã chuyển sang `select(...).limit(1)` và coi `count === null` là `UNKNOWN` (exit 1).
4. **Guest checkout vẫn cho anon INSERT `orders`** (bắt buộc để đặt hàng không cần tài khoản). Đã siết bằng yêu cầu token + items, nhưng cách đúng là tạo đơn qua **Edge Function** để ép `status` và chống spam/rate-limit.
5. **`cad-files` cho người mua dùng heuristic** trên `orders.items`. Cần bảng `order_files` để chính xác.
6. **Kiểm tra storage trong script là best-effort** (chưa có object nên chỉ xác nhận không liệt kê được).
7. **Chưa sửa client** (Phase 3): UI vẫn đọc vai trò từ `user_metadata`; DB mới là nguồn quyền.
8. **Chưa rotate anon key.** Anon JWT vẫn hardcode trong `src/backend/supabase/client.ts:6` và `vite.config.ts:17`, và `.env` còn placeholder. Cần: điền `.env` thật → bỏ literal trong code → rotate key trên Supabase.

---

## 9. CẬP NHẬT — chẩn đoán bằng đúng khoá của project (2026-09-12)

Sau khi nhận được khoá mới (`sb_publishable_…` / `sb_secret_…`) và cập nhật `.env`, đã kiểm tra lại toàn bộ:

| Hạng mục | Kết quả | Ý nghĩa |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://vcxarjwzbihvurpkcufa.supabase.co` | **đúng project**, ref khớp JWT cũ |
| Auth `/auth/v1/settings` | **HTTP 200**, `anonymous_users: false` | Auth hoạt động |
| Auth provider Google | **`google: false`** | **Google OAuth CHƯA bật** → nút "Đăng nhập Google" trong app sẽ luôn lỗi (và `AuthContext.tsx:252-264` hiện đang **âm thầm tạo user giả** khi OAuth lỗi — xem `docs/design/data-honesty.md`) |
| Storage `/storage/v1/bucket` (secret key) | **`[]`** | **Chưa có bucket nào** — `product-images` và `cad-files` chưa tồn tại |
| REST OpenAPI (secret key) | **0 bảng** | Schema `public` trống |
| 15 bảng kiểm tra bằng publishable + secret | **0/15 tồn tại** | Xác nhận: chưa áp migration nào |
| RPC `get_order_by_guest_token` | không tồn tại (`PGRST202`) | `master_production_schema` chưa chạy |

### 9.1 Vì sao KHÔNG thể "chạy 8 file migration theo thứ tự"

Chuỗi migration hiện tại **không chạy được** trên project trống — có 4 lỗi cứng, mỗi lỗi đều làm abort cả transaction:

| # | Lỗi | Bằng chứng |
|---|---|---|
| 1 | `orders` thiếu cột `user_id` nhưng file sau tạo index/policy trên cột đó | `20260904_complete_…sql:55-72` tạo `orders` **không có** `user_id`; `20260904_secure_rls_and_pricing.sql:36` `CREATE INDEX … ON public.orders(user_id)` → `42703` |
| 2 | `secure_rls` yêu cầu các cột NOT NULL không tồn tại | `20260904_secure_rls_and_pricing.sql:14,15,17,19,29` (`user_id`, `customer_email`, `customer_name`, `total_amount`, `secure_access_token NOT NULL`) |
| 3 | `user_profiles.id` là **TEXT** ở file đầu, file sau giả định **UUID** | `complete…:86` `id TEXT PRIMARY KEY`; `master…:394` `id UUID …` (no-op vì `IF NOT EXISTS`) → `master…:420` `auth.uid() = id` là `uuid = text` → `42883` |
| 4 | `pricing_config` vừa là **TABLE** vừa bị tạo thành **VIEW** | `complete…:157` `CREATE TABLE pricing_config`; `master…:473` `CREATE OR REPLACE VIEW public.pricing_config` → lỗi |

⇒ Với project trống, cách đúng là **một baseline schema hợp nhất** (1 file) tạo đủ bảng với cột chuẩn + RLS đã siết sẵn, thay vì 8 file chồng lấn.

### 9.2 Đã sửa cấu hình khoá (xong)

| File | Trước | Sau |
|---|---|---|
| `.env` (gitignored) | placeholder của `.env.example` | URL + `VITE_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY` (server-only) + JWKS |
| `src/backend/supabase/client.ts` | hardcode URL + **JWT anon cũ** (project đã từ chối: `UNAUTHORIZED_INVALID_API_KEY_TYPE`) | đọc từ env; không hardcode; log lỗi rõ khi thiếu; dùng client "chưa cấu hình" thay vì throw |
| `vite.config.ts:16-17` | fallback URL + JWT anon cũ | lấy từ `VITE_*` → `NEXT_PUBLIC_*`; **throw** nếu ai đó truyền `sb_secret_…` vào client |

Kiểm chứng sau build: `sb_publishable_…` có trong `dist/assets` (2 file), giá trị secret **không** có trong bundle (chuỗi `sb_secret` xuất hiện chỉ vì thư viện `supabase-js` tự nhận diện định dạng khoá).

### 9.3 Việc bắt buộc còn lại

1. **Tạo schema** (baseline hợp nhất — xem §9.1).
2. **Bật Google OAuth** trong Supabase → Authentication → Providers, hoặc **bỏ nút Google** khỏi UI và xoá nhánh tạo user giả trong `AuthContext`.
3. **Tạo 2 storage bucket** (`product-images` public, `cad-files` private) — kèm policy trong `20261010_harden_rls.sql` §8.
4. **Rotate secret key** — khoá này đã xuất hiện trong chat; nên tạo khoá mới trong Dashboard → Settings → API Keys sau khi mọi thứ chạy ổn.
5. Cấu hình env trên **Vercel** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`) — nếu thiếu, bản deploy sẽ chạy mock và log lỗi cấu hình.


---

## 10. Nhật ký thi công trên project thật

### 10.1 Lần chạy 1 — lỗi 42809 tại file 3

```
ERROR: 42809: ALTER action ENABLE ROW SECURITY cannot be performed on relation "pricing_config"
DETAIL: This operation is not supported for views.
CONTEXT: SQL statement "alter table public.pricing_config enable row level security"
```

**Nguyên nhân:** `20260901_baseline_schema.sql` tạo `pricing_config` là **VIEW** (tương thích code cũ, `security_invoker = true`), nhưng vòng lặp bật RLS trong `20261010_harden_rls.sql` chỉ kiểm tra `to_regclass(...) is not null` — hàm này trả về **cả view** — nên đã gọi `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` lên view → lỗi.

**Đã sửa (3 lớp):**
1. Vòng lặp bật RLS trong **cả hai** file giờ kiểm tra `pg_class.relkind in ('r','p')` và bỏ qua relation không phải bảng (kèm `RAISE NOTICE`).
2. Hàm `_vcube_make_policy` cũng được thêm guard `relkind` — không thể tạo policy lên view.
3. Thêm **gate R8** trong `scripts/lint-rls-migration.mjs`: bất kỳ vòng lặp `enable row level security` nào thiếu kiểm tra `relkind` sẽ bị chặn (đã tự kiểm chứng gate bắt được file cố tình vi phạm).

### 10.2 Lỗi thứ hai phát hiện khi rà lại (chưa kịp xảy ra)

Policy `vcube_orders_guest_insert` có nhúng `public._vcube_has_columns(...)` **trong biểu thức `WITH CHECK`**. Biểu thức policy được lưu vào catalog và chạy ở **mọi** truy vấn sau này, nhưng hàm tạm `_vcube_*` bị `DROP` ở bước 10 của chính file đó ⇒ policy sẽ vỡ lúc runtime với `function public._vcube_has_columns(text, text[]) does not exist`, tức **mọi lượt guest checkout đều lỗi**.

**Đã sửa:** biểu thức được dựng sẵn bằng PL/pgSQL **tại thời điểm tạo policy** (`v_guest_check`), không còn lời gọi hàm tạm nào trong policy. Thêm **gate R9** để chặn vĩnh viễn lớp lỗi này (đã tự kiểm chứng).

### 10.3 Trạng thái database hiện tại

Mỗi file là một transaction riêng, nên khi file 3 lỗi thì **file 1 và 2 đã commit**:

| Bước | Trạng thái |
|---|---|
| `20260900_rls_helpers.sql` | ✅ đã áp |
| `20260901_baseline_schema.sql` | ✅ đã áp — 21 bảng, index, hàm, trigger, 2 bucket đã tồn tại. **Cập nhật:** baseline hiện tại tạo **30 bảng** (Đợt 10 thêm `reviews`, `digital_assets`, `cart_items`) |
| `20261010_harden_rls.sql` | ❌ rollback — **chưa có policy nào** |

Vì baseline bật RLS trên mọi bảng mà chưa có policy, database đang ở trạng thái **deny-all** (an toàn: không ai đọc/ghi được gì qua API). App sẽ hiển thị dữ liệu mock cho tới khi file 3 chạy xong.

### 10.4 Việc cần làm tiếp

Chạy **chỉ file 3** (`20261010_harden_rls.sql`) — file này idempotent, chạy lại nhiều lần không sao:

```bash
# kiểm tra nhanh trước khi chạy: các bảng đã tồn tại chưa
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "node scripts/inspect-db.mjs"
```

Sau khi chạy xong file 3 → chạy `bootstrap_admin.sql` → `node scripts/verify-rls.mjs --writes`.

### 10.5 Gate đã bổ sung từ sự cố này

| Gate | Chặn được |
|---|---|
| `lint-rls-migration.mjs` **R8** | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` trên view (lỗi 42809) |
| `lint-rls-migration.mjs` **R9** | helper tạm bị nhúng vào biểu thức policy ⇒ policy vỡ lúc runtime |
| `lint-rls-sources.mjs` **R1–R7** | `user_metadata`, email hardcode, `FOR ALL USING (true)`, `WITH CHECK (true)`, dollar-quote lệch, thiếu helper |

### 10.6 KẾT QUẢ SAU KHI CHẠY ĐỦ 3 FILE — đã kiểm chứng (2026-09-12)

| Kiểm tra | Kết quả |
|---|---|
| Bảng tồn tại | **15/15** (kiểm tra mẫu lúc đó; baseline **hiện tại** tạo **30 bảng**) |
| Bảng còn hở RLS | **0** |
| `anon` đọc `orders` / `user_profiles` / `payment_transactions` / `cost_rules` / `material_inventory_logs` | **0 dòng** ✅ |
| `anon` đọc `products` chưa publish | **0 dòng** ✅ |
| `anon` đọc `products` published / `materials` / `printer_fleet` / `pricing_configs` | 0 dòng (bảng rỗng — chưa seed, không phải lỗi RLS) |
| `site_content` | 1 dòng, đọc được (đúng thiết kế) |
| RPC `get_order_by_guest_token` | tồn tại, trả 0 dòng với token sai ✅ |
| Storage buckets `product-images`, `cad-files` | đã tạo ✅ |
| `scripts/verify-rls.mjs` | **9 PASS · 0 FAIL · 4 INFO** ✅ |

⇒ **Lỗ hổng đã được đóng và có bằng chứng.** Bước còn lại là cấp quyền admin, seed dữ liệu, và siết nốt phía client.
