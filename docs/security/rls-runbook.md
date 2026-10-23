<!-- doc-meta: status=active; verified=2026-10-21; owner=thanh -->
# Runbook — Sửa lỗ hổng RLS của VCUBE

Tài liệu này là hướng dẫn thi công và khắc phục sự cố cho việc siết Row Level Security.
**Trạng thái (2026-10-21):** baseline + hardening **đã áp và kiểm chứng trên production ngày 2026-09-12** (§10.6; lúc đó baseline có **21 bảng** — nay **32 bảng + 2 view**). Các migration W2 (SEC-01, SEC-02, T20, T22b, T25, T35, T58) đã soạn trong `supabase/migrations/` — nhật ký áp ở **§11**; file #11 `20261013100000` là **cổng H, CHƯA ÁP**. Việc còn lại: rotate `sb_secret_…`, seed dữ liệu mẫu, khai env trên Vercel.

---

## 1. Vấn đề là gì (nguyên nhân gốc — lịch sử trước khi siết)

Các migration đầu tiên tạo policy kiểu "admin" **không kiểm tra quyền**:

```sql
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (true);
CREATE POLICY "Public can view orders"     ON public.orders   FOR SELECT USING (true);
CREATE POLICY "Users can view profiles"    ON public.user_profiles FOR SELECT USING (true);
```

Các migration sau ("hardening") chỉ `DROP POLICY IF EXISTS` **theo tên của chính nó**, nên các policy `USING (true)` ở trên **vẫn còn sống**. Postgres **OR** các policy permissive với nhau ⇒ policy cũ vô hiệu hoá mọi policy siết chặt hơn.

Thêm hai đường leo quyền nữa:
* Policy cũ tin vai trò khai trong **metadata tài khoản** — vốn do **client** ghi được (`supabase.auth.updateUser`), nên bất kỳ ai cũng tự phong admin.
* `... OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'` — email admin hardcode trong 43 chỗ, không thể thu hồi quyền mà không sửa SQL.

**Hệ quả nếu để nguyên:** anon key (công khai trong bundle) đọc được toàn bộ `orders` (tên/SĐT/địa chỉ/`secure_access_token`) và toàn bộ `user_profiles` (email, điện thoại, `kyc_details`), đồng thời ghi/xoá được `products`, `materials`, `printer_fleet`, `pricing_config` và chèn được `payment_transactions` — vi phạm Nghị định 13/2023/NĐ-CP về dữ liệu cá nhân.

### 1.1 Phát hiện quan trọng khi kiểm tra thực tế (2026-09-12 — lịch sử)

> **Trạng thái hiện tại (2026-09-24):** project đã có schema, đã áp migration và kiểm chứng — xem §10.6 và §11. Bảng dưới đây giữ nguyên làm mốc lịch sử, **không** còn mô tả trạng thái hiện tại.

Kiểm tra trực tiếp project `vcxarjwzbihvurpkcufa` bằng anon key:

| Kiểm tra | Kết quả |
|---|---|
| `GET /rest/v1/products` | **404 `PGRST205`** — "Could not find the table 'public.products' in the schema cache" |
| `orders`, `user_profiles`, `payment_transactions` | 404 `PGRST205` — **không tồn tại** |
| RPC `get_order_by_guest_token` | không tồn tại |
| `GET /rest/v1/` (OpenAPI) | `401 UNAUTHORIZED_INVALID_API_KEY_TYPE` |
| `.env` | đang là bản sao placeholder của `.env.example` |

⇒ **Tại thời điểm đó (2026-09-12), project production chưa có bảng nào của VCUBE.** Vì vậy:
1. Lỗ hổng đang ở dạng **tiềm ẩn trong file migration**, chưa bị khai thác (vì chưa có bảng/dữ liệu).
2. App khi đó chạy bằng **dữ liệu mock/localStorage**, không phải Supabase — khớp với phát hiện trong `docs/design/data-honesty.md`.
3. Vì chưa có dữ liệu, đây là **thời điểm tốt nhất** để tạo schema đúng ngay từ đầu thay vì vá dữ liệu sống.

---

## 2. Đã sửa những gì

### 2.1 Sửa trong migration gốc (để một lần apply mới cũng không tạo ra lỗ hổng)

| File | Thay đổi |
|---|---|
| `20260900_rls_helpers.sql` **(mới)** | Tạo `public.current_app_role()` và `public.is_admin()` **chạy sớm nhất**. Viết bằng plpgsql + bắt `undefined_table` nên chạy được cả khi `user_profiles` chưa tồn tại (fail-closed: trả `'anon'`). |
| `20260904_complete_vcube_schema_and_seeds.sql` | 6 policy `FOR ALL USING (true)` → `TO authenticated USING (public.is_admin()) WITH CHECK (…)`; `orders` bỏ `SELECT USING (true)`; `user_profiles` bỏ `SELECT USING (true)`; `products` chỉ đọc `status IN ('published','Published')`; insert `orders` phải có `secure_access_token` ≥ 12 ký tự. |
| `20260904_create_products_and_storage.sql` | 6 chuỗi kiểm tra metadata do client gửi / email hardcode → `public.is_admin()`. |
| `20260904_secure_rls_and_pricing.sql` | 4 chuỗi → `is_admin()`; insert `orders` phải có token. |
| `20260904_sync_complete_schema.sql` | 8 chuỗi → `is_admin()`. |
| `20260905_master_production_schema.sql` | 17 chuỗi → `is_admin()`; insert `orders` phải có token; `payment_transactions` chuyển từ "ai cũng insert được" → **chỉ admin** (webhook thật dùng `service_role`, role này bỏ qua RLS). |
| `20260905_role_profiles_and_pricing_schema.sql` | 11 chuỗi → `is_admin()`; insert `material_inventory_logs` từ `WITH CHECK (true)` → chỉ chủ xưởng hoặc admin. |

Kết quả quét: **0 policy tin metadata do client ghi, 0 email hardcode, 0 `FOR ALL USING (true)`** (xem §5 gate).

### 2.2 File siết cuối cùng (mọi môi trường, chạy sau tất cả)

`supabase/migrations/20261010_harden_rls.sql` — idempotent, thích ứng schema không thống nhất:

1. Tạo/chuẩn hoá 4 helper: `current_app_role()`, `is_admin()`, `is_admin_or_lab()` (admin hoặc lab)
   và `current_workshop_partner_id()` (partner_id của xưởng đang đăng nhập; `limit 1` vì `workshop_profiles.user_id` không unique).
2. `DROP` toàn bộ 73 tên policy cũ từng tồn tại trong repo.
3. **Quét sạch policy lạ** trên 32 relation mục tiêu của file (31 bảng baseline + view `pricing_config`; bảng thứ 32 `designer_payout_info` do migration sau tạo) không nằm trong allowlist (kể cả policy tạo tay trong Dashboard).
4. Tạo **88 policy bảng hiệu lực** (allowlist `v_keep` 90 tên, 2 tên `pricing_config` bị skip vì là view) + **7 policy storage** (`v_ok`). Toàn chuỗi 12 migration: **92 policy bảng** (thêm 4 cho `designer_payout_info`) + 7 storage + 1 `realtime.messages`. **Cập nhật 2026-10-23 (#13):** +4 policy `products` designer ⇒ **96 policy bảng**, và storage policy `cad_owner_rw` (#12) đã áp ⇒ **8 storage**.
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
| Storage `cad-files` | **không** | người mua: đọc file nằm trong đơn của mình; **chủ file tự quản** theo `cad/<auth.uid()>/<uuid>/…` (T25) và **designer tự quản file số** theo `digital/<auth.uid()>/…` | toàn quyền |

---

## 3. Các bước thi công

### Bước 1 — Xem trạng thái hiện tại (chỉ đọc)
Chạy `supabase/diagnostics/rls_audit.sql` trong Supabase SQL Editor. Mục C của kết quả liệt kê mọi policy còn hở.

### Bước 2 — Áp migration

Chuỗi lõi **3 file** (6 file cũ đã chuyển sang `supabase/legacy/`, xem README ở đó):

| Thứ tự | File | Vai trò |
|---|---|---|
| 1 | `supabase/migrations/20260900_rls_helpers.sql` | `current_app_role()` + `is_admin()` (fail-closed khi chưa có bảng profile) |
| 2 | `supabase/migrations/20260901_baseline_schema.sql` | **Toàn bộ schema baseline**: **31 bảng** + 1 view (`pricing_config`), **49 index** (48 + 1 unique index một phần cho KYC; 2 GIN), **7 hàm**, **5 định nghĩa trigger** / **25 instance** (tự sinh profile, chống nâng quyền profile, đồng bộ kho, touch `updated_at` trên 21 bảng, giữ `products.reviews_count`/`rating` theo đánh giá), 2 storage bucket, realtime, seed tối thiểu. Có bật RLS trên mọi bảng (deny-all cho tới khi có policy). *Cộng dồn 12 migration: 32 bảng + 2 view, 19 hàm, 9 định nghĩa trigger / ≈29 instance.* |
| 3 | `supabase/migrations/20261010_harden_rls.sql` | **Toàn bộ policy**: dọn policy cũ + policy lạ (kể cả tạo tay trong Dashboard), tạo **88 policy bảng hiệu lực** từ allowlist `v_keep` **90 tên** (2 policy `pricing_config` bị bỏ qua vì `pricing_config` là **VIEW**) + **7 policy storage** (`v_ok`) trên **32 relation mục tiêu** (31 bảng baseline + view `pricing_config`), 2 trigger mới chống sửa cột đặc quyền (`orders` + `workshop_profiles`) + tái tạo 2 trigger profile, `security_invoker` cho view `pricing_config`, kiểm tra cuối. *Toàn chuỗi 12 file: 92 policy bảng hiệu lực (thêm 4 policy `designer_payout_info`).* |

Sau 3 file lõi, áp tiếp các **migration W2** (`20261011*`/`20261012*`/`20261013*`) theo đúng thứ tự tên file:

| Thứ tự | File | Vai trò |
|---|---|---|
| 4 | `20261011090000_sec01_designer_payout_hotfix.sql` | SEC-01 (T0A-3): revoke `SELECT` bảng `designer_profiles`, grant cột an toàn + 2 RPC payout |
| 5 | `20261011100000_signup_role_designer.sql` | T58: tự đăng ký designer qua guard đóng (không cấp admin) |
| 6 | `20261011110000_designer_profile_column_guard.sql` | SEC-02: trigger chặn designer tự sửa cột đặc quyền |
| 7 | `20261012090000_sec02_open_requests.sql` | SEC-02 (T21): view `open_design_requests` + RPC `claim_design_request` |
| 8 | `20261012100000_check_constraints.sql` | T22b: CHECK enum-like (`NOT VALID` → dọn → `VALIDATE`) |
| 9 | `20261012130000_orders_broadcast.sql` | T35-mig: `realtime.send` topic riêng tư `orders:admin` (payload `{id,status}`) |
| 10 | `20261013090000_sec01_payout_table.sql` | SEC-01 / T20 phase 1: bảng `designer_payout_info` + RPC `upsert_my_payout_info` |
| 11 | `20261013110000_storage_scheme.sql` | T25 (D3): policy `cad/<uid>/…` cho bucket `cad-files` |
| — | `20261013100000_drop_designer_bank_columns.sql` | SEC-01 / T20 phase 2 — **cổng H, KHÔNG nằm trong bản gộp**: chỉ áp sau khi phase 1 + client deploy + verify (xem §11) |

* **Project trống**: chạy **3 file lõi theo thứ tự trên**, rồi các migration W2 (4→11).
* **Project đã có schema cũ**: chạy **file 3** để siết lại (nó tự dọn policy cũ và policy lạ), rồi các migration W2.
* **Project đã áp W2**: chỉ còn `20261013100000` chờ cổng H — ghi kết quả vào §11.
* Bản gộp `supabase/scripts/apply_all_manual.sql` (do `node scripts/gen-apply-all.mjs` sinh) hiện gồm 3 file lõi + các migration W2/W2b (`20261011*`–`20261013*`, **trừ** file drop H-gated) + `bootstrap_admin.sql`; `20261013100000_drop_designer_bank_columns.sql` **không** được gom — áp riêng theo §1.4 của `docs/tasks/DRIFT-TASKS.md` sau cổng H.

Chạy trên **staging trước** nếu có. Nếu Supabase SQL Editor báo lỗi ở file 2, gửi nguyên văn thông báo lỗi — không sửa tay giữa chừng.

### Bước 3 — Cấp quyền admin (BẮT BUỘC, nếu không sẽ không ai quản trị được)
Mở `supabase/scripts/bootstrap_admin.sql`, **sửa `v_email`** thành email đăng nhập thật của bạn, rồi chạy. Script sẽ tạo/ cập nhật dòng `user_profiles` với `id = auth.uid()` và `role = 'admin'`.

> Lưu ý: nút "Chuyển vai trò" trong app (`AuthContext.switchDemoRole`) chỉ ghi metadata ở môi trường DEV và **không cấp quyền DB** — quyền thật do `public.user_profiles.role` quyết định. Đây là điều mong muốn.

### Bước 4 — Kiểm chứng
```bash
wsl -d Ubuntu-24.04 --cd "$(git rev-parse --show-toplevel)" -- bash -lc "node scripts/verify-rls.mjs"
# thêm phép thử ghi (no-op update, không phá dữ liệu):
wsl -d Ubuntu-24.04 --cd "$(git rev-parse --show-toplevel)" -- bash -lc "node scripts/verify-rls.mjs --writes"
```
Kỳ vọng: **`anon đọc orders` = PASS 0 dòng**, `anon đọc user_profiles` = PASS 0 dòng, `anon ghi products` = PASS, và các bảng app cần (products published, materials…) > 0 dòng. Thoát code 0.

### Bước 5 — Kiểm tra app
1. Đăng nhập bằng tài khoản đã bootstrap → mở `/admin`, sửa 1 sản phẩm, F5 để xác nhận đã lưu.
2. Ở cửa sổ ẩn danh (khách): xem `/`, `/explore`, thêm vào giỏ, checkout (guest insert phải thành công), tra cứu đơn bằng mã + token.
3. Xác nhận khách **không** xem được `/orders` của người khác và không tải được `cad-files`.

### Bước 6 — Phía client (ĐÃ XONG 2026-09-24)
Client đọc vai trò thật từ DB: `AuthContext.resolveDbRole()` đối chiếu `public.user_profiles.role` ngay khi có phiên — không còn suy vai trò từ email hay metadata do client gửi. Nhánh "âm thầm tạo user Google giả" khi OAuth lỗi đã bị xoá; `signInWithGoogle()` ném lỗi cho UI. Bộ chuyển vai trò DEV (`switchDemoRole`) chỉ còn là "góc nhìn" giao diện, không cấp quyền DB. Việc còn lại: **bật Google OAuth** trong Supabase (project đang `google: false`) hoặc ẩn nút Google.

---

## 4. Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Vào `/admin` nhưng mọi thao tác lưu đều lỗi | Tài khoản chưa có `user_profiles.role='admin'` | Chạy lại `bootstrap_admin.sql`; kiểm bằng `select id,email,role from public.user_profiles;` |
| Không tạo được đơn ở checkout | Policy `*_guest_insert` yêu cầu `secure_access_token` ≥ 12 ký tự và `items` không null | Kiểm tra payload `dbService.saveOrder` (trong `src/backend/supabase/database.ts`) có gửi `secure_access_token` không |
| Xưởng không sửa được máy/vật liệu của mình | `workshop_profiles.user_id` chưa trỏ tới `auth.uid()` | `update public.workshop_profiles set user_id = '<auth-uid>' where id = '<workshop-id>';` |
| Người mua không tải được file CAD | Đường chính xác `vcube_cad_files_order_files_read` cần dòng tương ứng trong `order_files(order_id, storage_path)`; đường dự phòng `vcube_cad_files_buyer_read` cần `orders.items` chứa tên object | Kiểm tra `order_files.storage_path` khớp `storage.objects.name` và `orders.user_id` của người mua; nếu thiếu bảng `order_files` thì đường heuristic theo `orders.items` là tạm thời |
| Nghi ngờ policy bị xoá nhầm | Bước 9 dọn mọi policy ngoài allowlist | Chạy `rls_audit.sql` mục B/A; nếu thiếu, chạy lại `20261010_harden_rls.sql` (idempotent) |
| Cần tạm mở lại để cứu dữ liệu | — | **Không** mở `USING (true)`. Dùng `service_role` key trong script server-side (bỏ qua RLS) rồi siết lại |
| Muốn rollback toàn bộ | — | `git revert` commit SQL là đủ: file hardening chỉ tạo policy, không sửa dữ liệu. Trạng thái cũ (có lỗ hổng) chỉ nên khôi phục trên môi trường test |

---

## 5. Gate kiểm tra (chạy trong CI/trước khi commit)

```bash
# 1. Không anti-pattern RLS trong bất kỳ migration nào (73 tên policy cũ nằm trong danh sách drop của file hardening)
wsl -d Ubuntu-24.04 --cd "$(git rev-parse --show-toplevel)" -- bash -lc "node scripts/lint-rls-sources.mjs"

# 2. File hardening tự nhất quán (allowlist khớp policy tạo ra, dollar-quote cân bằng…)
wsl -d Ubuntu-24.04 --cd "$(git rev-parse --show-toplevel)" -- bash -lc "node scripts/lint-rls-migration.mjs"

# 3. Kiểm chứng thực tế bằng anon key (cần project đã có schema)
wsl -d Ubuntu-24.04 --cd "$(git rev-parse --show-toplevel)" -- bash -lc "node scripts/verify-rls.mjs --writes"

# 4. Gate TS/build như thường lệ
wsl -d Ubuntu-24.04 --cd "$(git rev-parse --show-toplevel)" -- bash -lc "npm run lint && npm run build"
```

---

## 6. Giới hạn đã biết (minh bạch)

1. **Đã kiểm chứng trên Postgres thật.** 3 file lõi đã được áp trên production ngày 2026-09-12 (§10.6). Ghi chú lịch sử: trước đó môi trường WSL không có `psql`/`postgres`/`docker` nên migration chỉ được kiểm bằng linter tĩnh + `begin;…commit;` + `rls_audit.sql`. Từ sau 2026-09-12, mọi thay đổi phải theo §1.4 của `docs/tasks/DRIFT-TASKS.md` (backup → SQL Editor → post-check → ghi log §11).
2. **`verify-rls.mjs` cần schema tồn tại.** Với project trống (chưa áp migration) script báo `SKIP` kèm cảnh báo, không kết luận sai.
3. **`head:true` không dùng được để kiểm chứng** — PostgREST trả `204 + count:null + error:null` cho bảng không tồn tại, tức là "thành công rỗng". Script đã chuyển sang `select(...).limit(1)` và coi `count === null` là `UNKNOWN` (exit 1).
4. **Guest checkout vẫn cho anon INSERT `orders`** (bắt buộc để đặt hàng không cần tài khoản). Đã siết bằng yêu cầu token + items, nhưng cách đúng là tạo đơn qua **Edge Function** để ép `status` và chống spam/rate-limit.
5. **`cad-files` cho người mua**: đường CHÍNH XÁC là bảng `order_files` (policy `vcube_cad_files_order_files_read`). Vẫn còn policy dự phòng `vcube_cad_files_buyer_read` dùng heuristic trên `orders.items` cho các đơn mua trước khi bảng `order_files` tồn tại — heuristic này có thể khớp nhầm tên object, nên đường `order_files` mới là nguồn sự thật.
6. **Kiểm tra storage trong script là best-effort** (chưa có object nên chỉ xác nhận không liệt kê được).
7. **Client đã đọc vai trò từ DB** (2026-09-24): `AuthContext.resolveDbRole()` là nguồn cho UI; metadata tài khoản chỉ còn là tiện ích DEV, không cấp quyền.
8. **Chưa rotate secret key.** Không còn URL/JWT nào hardcode: `src/backend/supabase/client.ts` đọc `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` do Vite `define` từ `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`, và `vite.config.ts` **throw** nếu khoá bắt đầu bằng `sb_secret_`. Việc còn lại là rotate khoá `sb_secret_…` (đã từng lộ trong chat) trên Supabase Dashboard.

---

## 9. CẬP NHẬT — chẩn đoán bằng đúng khoá của project (2026-09-12 — lịch sử)

> **Lịch sử (2026-09-12).** Các kết luận dưới đây đúng ở thời điểm đó; trạng thái hiện tại xem §10.6 + §11.

Sau khi nhận được khoá mới (`sb_publishable_…` / `sb_secret_…`) và cập nhật `.env`, đã kiểm tra lại toàn bộ:

| Hạng mục | Kết quả (2026-09-12) | Ý nghĩa |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://vcxarjwzbihvurpkcufa.supabase.co` | **đúng project**, ref khớp JWT cũ |
| Auth `/auth/v1/settings` | **HTTP 200**, `anonymous_users: false` | Auth hoạt động |
| Auth provider Google | **`google: false`** | Google OAuth chưa bật ⇒ nút "Đăng nhập Google" báo lỗi thân thiện. Nhánh **âm thầm tạo user giả** khi OAuth lỗi **đã bị xoá** khỏi `AuthContext.signInWithGoogle()` (2026-09-24) |
| Storage `/storage/v1/bucket` (secret key) | **`[]`** | **Chưa có bucket nào** — `product-images` và `cad-files` chưa tồn tại |
| REST OpenAPI (secret key) | **0 bảng** | Schema `public` trống |
| 15 bảng kiểm tra bằng publishable + secret | **0/15 tồn tại** | Xác nhận: chưa áp migration nào |
| RPC `get_order_by_guest_token` | không tồn tại (`PGRST202`) | `master_production_schema` chưa chạy |

### 9.1 Vì sao KHÔNG thể "chạy 8 file migration theo thứ tự"

Chuỗi migration hiện tại **không chạy được** trên project trống — có 4 lỗi cứng, mỗi lỗi đều làm abort cả transaction:

| # | Lỗi | Bằng chứng |
|---|---|---|
| 1 | `orders` thiếu cột `user_id` nhưng file sau tạo index/policy trên cột đó | Khai báo `orders` trong `20260904_complete_vcube_schema_and_seeds.sql` **không có** `user_id`; còn `20260904_secure_rls_and_pricing.sql` lại `CREATE INDEX … ON public.orders(user_id)` → `42703` |
| 2 | `secure_rls` yêu cầu các cột NOT NULL không tồn tại | Các câu `ALTER COLUMN … SET NOT NULL` cho `user_id`, `customer_email`, `customer_name`, `total_amount`, `secure_access_token` trong `20260904_secure_rls_and_pricing.sql` |
| 3 | `user_profiles.id` là **TEXT** ở file đầu, file sau giả định **UUID** | `20260904_complete_vcube_schema_and_seeds.sql` khai `id TEXT PRIMARY KEY`; `20260905_master_production_schema.sql` khai `id UUID …` (no-op vì `IF NOT EXISTS`) rồi dùng `auth.uid() = id` (uuid = text) → `42883` |
| 4 | `pricing_config` vừa là **TABLE** vừa bị tạo thành **VIEW** | `20260904_complete_vcube_schema_and_seeds.sql` `CREATE TABLE pricing_config`; `20260905_master_production_schema.sql` `CREATE OR REPLACE VIEW public.pricing_config` → lỗi |

⇒ Với project trống, cách đúng là **một baseline schema hợp nhất** (1 file) tạo đủ bảng với cột chuẩn + RLS đã siết sẵn, thay vì 8 file chồng lấn.

### 9.2 Đã sửa cấu hình khoá (xong)

| File | Trước | Sau |
|---|---|---|
| `.env` (gitignored) | placeholder của `.env.example` | URL + `VITE_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY` (server-only) + JWKS |
| `src/backend/supabase/client.ts` | hardcode URL + **JWT anon cũ** (project đã từ chối: `UNAUTHORIZED_INVALID_API_KEY_TYPE`) | đọc từ env; không hardcode; log lỗi rõ khi thiếu; dùng client "chưa cấu hình" thay vì throw |
| `vite.config.ts` (khối `define`) | fallback URL + JWT anon cũ | lấy từ `VITE_*` → `NEXT_PUBLIC_*`; **throw** nếu ai đó truyền `sb_secret_…` vào client |

Kiểm chứng sau build: `sb_publishable_…` có trong `dist/assets` (2 file), giá trị secret **không** có trong bundle (chuỗi `sb_secret` xuất hiện chỉ vì thư viện `supabase-js` tự nhận diện định dạng khoá).

### 9.3 Việc bắt buộc còn lại

1. **Tạo schema** (baseline hợp nhất — xem §9.1). → **đã xong 2026-09-12** (§10.6).
2. **Bật Google OAuth** trong Supabase → Authentication → Providers, hoặc **ẩn nút Google** khỏi UI. (Nhánh tạo user giả trong `AuthContext` đã bị xoá 2026-09-24.)
3. **Tạo 2 storage bucket** (`product-images` public, `cad-files` private) — **đã xong 2026-09-12**; policy nằm trong `20261010_harden_rls.sql` §8.
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

### 10.3 Trạng thái database tại thời điểm đó (lịch sử — xem §10.6)

Mỗi file là một transaction riêng, nên khi file 3 lỗi thì **file 1 và 2 đã commit**:

| Bước | Trạng thái |
|---|---|
| `20260900_rls_helpers.sql` | ✅ đã áp |
| `20260901_baseline_schema.sql` | ✅ đã áp — 21 bảng, index, hàm, trigger, 2 bucket đã tồn tại. **Cập nhật:** file baseline tạo **31 bảng** (Đợt 10 thêm `reviews`, `digital_assets`, `cart_items`; đợt cuối thêm `custom_design_requests`) + 1 view; **toàn chuỗi 12 migration hiện tạo 32 bảng + 2 view** |
| `20261010_harden_rls.sql` | ❌ rollback — **chưa có policy nào** (đã chạy lại thành công, xem §10.6) |

Vì baseline bật RLS trên mọi bảng mà chưa có policy, database khi đó ở trạng thái **deny-all** (an toàn: không ai đọc/ghi được gì qua API). App hiển thị dữ liệu mock cho tới khi file 3 chạy xong.

### 10.4 Việc đã làm tiếp (lịch sử — hoàn tất theo §10.6)

Chạy **chỉ file 3** (`20261010_harden_rls.sql`) — file này idempotent, chạy lại nhiều lần không sao:

```bash
# kiểm tra nhanh trước khi chạy: các bảng đã tồn tại chưa
wsl -d Ubuntu-24.04 --cd "$(git rev-parse --show-toplevel)" -- bash -lc "node scripts/inspect-db.mjs"
```

Sau khi chạy xong file 3 → chạy `bootstrap_admin.sql` → `node scripts/verify-rls.mjs --writes`.

### 10.5 Gate đã bổ sung từ sự cố này

| Gate | Chặn được |
|---|---|
| `lint-rls-migration.mjs` **R8** | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` trên view (lỗi 42809) |
| `lint-rls-migration.mjs` **R9** | helper tạm bị nhúng vào biểu thức policy ⇒ policy vỡ lúc runtime |
| `lint-rls-sources.mjs` **R1–R7** | policy tin metadata do client ghi (R1), email hardcode (R2), `FOR ALL USING (true)` (R3), `USING (true)` trên bảng PII (R4), `WITH CHECK (true)` trên bảng ghi (R5), dollar-quote lệch (R6), thiếu/đặt sai thứ tự file helper (R7) |

### 10.6 KẾT QUẢ SAU KHI CHẠY ĐỦ 3 FILE — đã kiểm chứng (2026-09-12)

> **Số liệu dưới đây là ảnh chụp lịch sử tại 2026-09-12** (baseline khi đó 21 bảng, 6 storage policy). Trạng thái hiện tại (2026-10-21, sau 12 migration): **32 bảng + 2 view**, **92 policy bảng hiệu lực + 7 storage (+1 `realtime.messages`)**, 19 hàm, 9 định nghĩa trigger / ≈29 instance — xem `AGENTS.md` §"Số liệu DB thực tế" và `docs/security/rls-policies.md`. Live verify phải chạy lại sau khi Supabase Resume.

| Kiểm tra | Kết quả |
|---|---|
| Bảng tồn tại | **15/15** kiểm tra mẫu **tại thời điểm 2026-09-12** (baseline khi đó 21 bảng) — **số hiện tại: 32 bảng + 2 view** sau 12 migration (2026-10-21); cần chạy lại `scripts/verify-rls.mjs` sau khi Supabase Resume |
| Bảng còn hở RLS | **0** |
| `anon` đọc `orders` / `user_profiles` / `payment_transactions` / `cost_rules` / `material_inventory_logs` | **0 dòng** ✅ |
| `anon` đọc `products` chưa publish | **0 dòng** ✅ |
| `anon` đọc `products` published / `materials` / `printer_fleet` / `pricing_configs` | 0 dòng (bảng rỗng — chưa seed, không phải lỗi RLS) |
| `site_content` | 1 dòng, đọc được (đúng thiết kế) |
| RPC `get_order_by_guest_token` | tồn tại, trả 0 dòng với token sai ✅ |
| Storage buckets `product-images`, `cad-files` | đã tạo ✅ (7 storage policy hiện tại; 6 lúc kiểm chứng 2026-09-12) |
| `scripts/verify-rls.mjs` | **9 PASS · 0 FAIL · 4 INFO** ✅ |

⇒ **Lỗ hổng đã được đóng và có bằng chứng.** Bước còn lại là cấp quyền admin, seed dữ liệu, và siết nốt phía client.

---

## 11. Nhật ký áp migration lên production

> **Quy trình bắt buộc** (§1.4 của `docs/tasks/DRIFT-TASKS.md`): backup bảng bị ảnh hưởng → dán `begin; … commit;` vào SQL Editor → chạy post-check → ghi một dòng vào bảng dưới đây. Điền `<ngày>` **sau khi** H áp thật và post-check đạt; **không** đánh dấu "đã áp" trước.
> Sự cố SEC-01: xem `docs/security/incident-2026-09-SEC01.md`. Bản gộp thao tác nhanh: `docs/runbooks/hotfix-2026-09-24.sql` (3 migration hotfix) và `docs/runbooks/w2b-2026-09-24.sql` (T20 phase 1 + T25).

| # | Migration | Task / Issue | Ngày áp | Post-check | Rollback | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | `20260900_rls_helpers.sql` | baseline | 2026-09-12 | §10.6 | — | lần áp đầu |
| 2 | `20260901_baseline_schema.sql` | baseline | 2026-09-12 | §10.6 | — | file này tạo 31 bảng + 1 view (đo lúc áp: 21 bảng); toàn chuỗi 12 file hiện là 32 bảng + 2 view |
| 3 | `20261010_harden_rls.sql` | hardening | 2026-09-12 | §10.6 — 0 bảng hở RLS | `git revert` commit SQL | idempotent; **FREEZE** áp lại tới khi T23 xong (§1.4-5 DRIFT-TASKS) |
| 4 | `20261011090000_sec01_designer_payout_hotfix.sql` | SEC-01 / T0A-3 | `<ngày>` | `has_column_privilege` 3 cột + `curl` anon | `supabase/rollback/20261011090000_down.sql` | T0A-4: deploy client trước; đóng phơi nhiễm — `incident-2026-09-SEC01.md` |
| 5 | `20261011100000_signup_role_designer.sql` | T58 | `<ngày>` | — | `supabase/rollback/20261011100000_down.sql` | guard đóng: chỉ `'designer'` được ánh xạ |
| 6 | `20261011110000_designer_profile_column_guard.sql` | SEC-02 | `<ngày>` | thử `update … royalty_percent` → `42501` | `supabase/rollback/20261011110000_down.sql` | trigger chặn designer tự nâng quyền |
| 7 | `20261012090000_sec02_open_requests.sql` | SEC-02 / T21 | `<ngày>` | view `open_design_requests` + RPC `claim_design_request` | `supabase/rollback/20261012090000_down.sql` | RPC nguyên tử, chống nhận trùng |
| 8 | `20261012100000_check_constraints.sql` | T22b / DB-03, DB-04 | `<ngày>` | `pg_constraint.convalidated = true` sau `VALIDATE` | `supabase/rollback/20261012100000_down.sql` | `NOT VALID` → audit → dọn → `VALIDATE` |
| 9 | `20261012130000_orders_broadcast.sql` | T35-mig | `<ngày>` | có `realtime.send` + policy `realtime.messages` | `supabase/rollback/20261012130000_down.sql` | payload chỉ `{id,status}` — không lộ token |
| 10 | `20261013090000_sec01_payout_table.sql` | SEC-01 / T20 phase 1 | `<ngày>` | 2 RPC đọc đúng từ `designer_payout_info` | `supabase/rollback/20261013090000_down.sql` | chép dữ liệu, **chưa** drop cột |
| 11 | `20261013100000_drop_designer_bank_columns.sql` | SEC-01 / T20 phase 2 | `<ngày>` — **cổng H, CHƯA ÁP** | grep `src` + `scripts` không còn reader/writer 3 cột; phase 1 đã áp | `supabase/rollback/20261013100000_down.sql` | chỉ sau khi client deploy + verify — xem `incident-2026-09-SEC01.md` |
| 12 | `20261013110000_storage_scheme.sql` | T25 / D3 | `<ngày>` | policy `vcube_cad_files_cad_owner_rw` + thử đọc chéo | `supabase/rollback/20261013110000_down.sql` | scheme `cad/<uid>/<uuid>/<file>`; object cũ cần backfill (T40) |

Sau mỗi lần áp, chạy `node scripts/verify-rls.mjs --writes` (kỳ vọng `anon` đọc `orders`/`user_profiles` = 0 dòng), `node scripts/inspect-db.mjs`, rồi ghi kết quả vào dòng tương ứng.

> **2026-10-23:** migration #12 `20261013110000_storage_scheme.sql` (storage policy `cad/<uid>/…`) và #13 `20261024090000_designer_publish.sql` (products designer publish) **đã áp production** qua SQL Editor; post-check + probe RLS PASS. Số hiện tại: 96 policy bảng + 8 storage.
