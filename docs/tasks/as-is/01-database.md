<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# AS-IS 01 — Tầng dữ liệu (Supabase PostgreSQL)

> Đọc trực tiếp từ `supabase/migrations/**` + `supabase/functions/**`. `docs/database/schema.md`
> là **bản sinh tay đã lạc hậu** (thiếu 9 migration W2) — dùng file này làm chuẩn tạm.

## 0. Tổng quan

| Hạng mục | Số lượng |
|---|---|
| Bảng `public` | **32** (31 trong baseline + `designer_payout_info`) |
| View | **2** (`pricing_config`, `open_design_requests`) |
| Hàm thường trực | **19** = 10 hàm gọi được (helper/RPC) + 9 hàm trigger |
| Định nghĩa trigger | **9** · ~**29** instance |
| Policy bảng | **92** hiệu lực (allowlist 90, 2 `pricing_config` bị bỏ qua vì là view, + 4 của `designer_payout_info`) |
| Policy storage | **7** |
| Bucket | **2** (`product-images` public, `cad-files` private) |
| Bảng publish Realtime | **11** |

Chuỗi migration (theo thứ tự tên file):

| File | Vai trò |
|---|---|
| `20260900_rls_helpers.sql` | `current_app_role()`, `is_admin()` |
| `20260901_baseline_schema.sql` | Toàn bộ schema: 31 bảng + 1 view, enum/CHECK, 49 index, 7 hàm + 5 định nghĩa trigger, 2 bucket, realtime, seed 3 bản ghi config |
| `20261010_harden_rls.sql` | Policy bảng + storage, trigger chống leo quyền |
| `20261011090000_sec01_designer_payout_hotfix.sql` | Thu hồi cột nhạy cảm `designer_profiles` khỏi đọc anon (SEC-01 pha 1) |
| `20261011100000_signup_role_designer.sql` | Trigger đăng ký: chỉ `designer` → designer, còn lại customer |
| `20261011110000_designer_profile_column_guard.sql` | Chặn owner sửa cột đặc quyền `designer_profiles` |
| `20261012090000_sec02_open_requests.sql` | View `open_design_requests` + RPC `claim_design_request` (SEC-02) |
| `20261012100000_check_constraints.sql` | CHECK `orders.payment_status`, `kyc_records.status` (NOT VALID) |
| `20261012130000_orders_broadcast.sql` | Trigger `orders_broadcast_status` + policy topic `orders:admin` |
| `20261013090000_sec01_payout_table.sql` | Bảng `designer_payout_info` + 3 RPC payout |
| `20261013100000_drop_designer_bank_columns.sql` | Xoá 3 cột bank/tax khỏi `designer_profiles` (**H-gated, chưa áp prod**) |
| `20261013110000_storage_scheme.sql` | Policy `cad-files` scheme `cad/<uid>/<uuid>/<file>` |

---

## 1. Bảng theo miền

### 1a. Catalog / commerce
| Bảng | Mục đích | Cột chính | Migration |
|---|---|---|---|
| `products` | Sản phẩm catalog (vật lý + CAD số) | PK `id text`; `status`, `seller_type`, `license_type`, `price_physical/digital`, `rating`/`reviews_count` (trigger) | baseline |
| `materials` | Danh mục vật liệu nền + tham số giá | PK `id text`; `cost_per_kg`, `unit_price_multiplier`, `failure_extra_percent` | baseline |
| `printer_fleet` | Catalog máy in + chi phí vận hành | PK `id text`; `acquisition_cost`, `expected_lifetime_hours`, `throughput_grams_per_hour` | baseline |
| `accessories` | Phụ kiện bán/kèm | PK `id text`; `cost_price`, `price`, `stock_quantity` | baseline |
| `workshop_partners` | Mạng lưới xưởng đối tác (điều phối) | PK `id text`; `region`, `capacity_status`, `active_jobs_count` | baseline |
| `digital_assets` | File số của designer (bucket private) | PK `id uuid`; FK `designer_id→auth.users`; `storage_path`, `product_id` (không FK), `license_type` nullable | baseline §5b |
| `cart_items` | Giỏ hàng lưu theo tài khoản | PK `id uuid`; FK `user_id`; unique `(user_id, product_id)` | baseline §5b |
| `reviews` | Đánh giá gắn đơn (product/designer/workshop) | PK `id uuid`; FK `order_id`, `author_id`; unique `(order_id,author_id,target_type,target_id)` | baseline §5b |
| `order_items` | **1 dòng = 1 phần chia doanh thu** | PK `id uuid`; FK `order_id`; `workshop_id`/`designer_id` (không FK); `seller_type`, `fulfillment`, `quantity` | baseline §5c |

### 1b. Đơn hàng / thanh toán / giao vận
| Bảng | Mục đích | Cột chính |
|---|---|---|
| `orders` | Đơn tổng (guest checkout, 8 stage MES, snapshot payout) | PK `id text`; FK `user_id` set null; unique `order_number`; `secure_access_token`; `assigned_workshop_id` (không FK); 14 cột snapshot/payout |
| `order_files` | Map file CAD ↔ đơn (buyer tải) | PK `id uuid`; FK `order_id`; `storage_path`, `license` |
| `quotes` | Báo giá hình học tức thời | PK `id text`; FK `user_id`, `order_id` (set null) |
| `payment_transactions` | Ledger cổng thanh toán/webhook | PK `id text`; FK `order_id`; unique `transaction_id` |
| `warranty_claims` | Ticket bảo hành/đổi trả | PK `id uuid`; FK `order_id`, `user_id`; `status` CHECK |

### 1c. Định danh / RBAC
| Bảng | Mục đích | Ghi chú |
|---|---|---|
| `user_profiles` | Định danh chính + **role do DB quyết định** | PK `id uuid` FK `auth.users`; `role`, `kyc_status`, `account_status` CHECK |
| `kyc_records` | Hồ sơ KYC | PK `id text`; unique một-pending |
| `designer_profiles` | Hồ sơ designer | PK `id uuid`; `royalty_percent`, `verified_status`; bank/tax **sẽ xoá** (H-gated) |
| `customer_profiles` | Meta B2B / NDA | PK `id uuid`; `nda_signed` |
| `designer_payout_info` | PII payout tách khỏi `designer_profiles` (1-1) | PK `designer_id` FK; `bank_name/account/tax_id` |

### 1d. Xưởng / MES
| Bảng | Mục đích |
|---|---|
| `workshop_profiles` | Hồ sơ chủ xưởng; `partner_id` (không FK, trigger bảo vệ), `verified_status` |
| `workshop_machines` | Máy in theo xưởng |
| `workshop_materials` | Tồn filament theo xưởng |
| `material_inventory_logs` | Sổ kho (Import/Export/Adjustment) — trigger tự cập nhật tồn |
| `workshop_accessories` | Tồn phụ kiện theo xưởng |

### 1e. Designer / studio
| Bảng | Mục đích |
|---|---|
| `custom_design_requests` | Đơn CAD theo yêu cầu + hội thoại (`messages`/`reference_files` jsonb) |

### 1f. Nội dung / settings / giá / audit
| Bảng | Mục đích |
|---|---|
| `site_content` | CMS singleton (hero/workflow/SEO) — PK `'default'` |
| `app_settings` | Pháp lý/branding/banking singleton — PK `'settings'`, có regex CHECK |
| `setting_audit` | Log audit cấu hình (append-only) |
| `pricing_configs` | Định nghĩa công thức giá (jsonb) |
| `pricing_global_settings` | Rate vĩ mô singleton (VAT/điện/nhân công/phí nền tảng) — **nullable** |
| `cost_rules` | Rule margin nội bộ B2B |
| `pricing_config` **(view)** | View tương thích ngược trên `pricing_configs` (`security_invoker=true`) |
| `open_design_requests` **(view)** | Pool yêu cầu chưa nhận, chỉ cột không nhạy cảm, lọc role designer/admin |
| `workshop_commission_terms` | Hoa hồng đàm phán theo partner (admin-only) |

---

## 2. Enum / CHECK

| Ràng buộc | Bảng.cột | Giá trị |
|---|---|---|
| role | `user_profiles.role` | customer, designer, workshop, lab, admin |
| kyc_status | `user_profiles.kyc_status` | verified, pending, pending_review, rejected, unverified |
| account_status | `user_profiles.account_status` | active, suspended |
| verified_status | `workshop_profiles.verified_status` | Pending, Verified, Suspended |
| status | `warranty_claims.status` | submitted, reviewing, approved, rejected, resolved |
| action | `material_inventory_logs.action` | Import, Export, Adjustment |
| store | `setting_audit.store` | site_content, app_settings, pricing_global_settings, pricing_configs, order_payouts |
| target_type | `reviews.target_type` | designer, workshop, product |
| rating | `reviews.rating` | 1..5 |
| status | `reviews.status` | published, hidden, pending |
| seller_type | `products.seller_type` / `order_items.seller_type` | platform, designer |
| fulfillment | `order_items.fulfillment` | print, digital |
| status | `custom_design_requests.status` | pending, quoted, in_progress, completed, declined |
| payout status | `orders.workshop_payout_status` / `designer_payout_status` | unpaid, paid, partial |
| stage index | `orders.status_stage_index` | 0..7 |
| status | `orders.status` | pending_payment, processing, printing, post_processing, packaging, shipping, completed, cancelled |
| **payment_status** | `orders.payment_status` | awaiting_payment, paid, cod, cancelled, unpaid — **CHECK NOT VALID** (`20261012100000`) |
| **kyc status** | `kyc_records.status` | pending, pending_review, verified, rejected, unverified — **CHECK NOT VALID** |

Regex CHECK: `app_settings.tax_code` (`^[0-9]{10}(-[0-9]{3})?$`), `bank_account` (chữ số), `contact_email`.
Range CHECK: `royalty_percent` 0..100 · `failure_extra_percent` 0..30 · `commission_percent` 0..30 · VAT 0..20 · marketplace fee 0..30.

---

## 3. Hàm / RPC

### 3a. Hàm gọi được
| Hàm | Signature | SECURITY DEFINER | Mục đích |
|---|---|---|---|
| `current_app_role()` | `→ text` | ✅ | Role thật từ `user_profiles.role`; fail-closed `'anon'` |
| `is_admin()` | `→ boolean` | ✅ | `current_app_role()='admin'` |
| `is_admin_or_lab()` | `→ boolean` | ✅ | role ∈ (admin, lab) |
| `current_workshop_partner_id()` | `→ text` | ✅ | `partner_id` của người gọi |
| `get_order_by_guest_token(order_number, token)` | `→ setof orders` | ✅ | Tra đơn guest (token ≥12) — grant anon+authenticated |
| `fn_recompute_product_review_stats(product_id)` | `→ void` | ✅ | Tính lại rating/count sản phẩm |
| `get_my_payout_info()` | `→ table(bank_name, bank_account, tax_id)` | ✅ | Payout PII của chính mình |
| `admin_get_designer_payout(designer_id)` | `→ table(...)` | ✅ | Admin đọc payout (ngược lại 42501) |
| `upsert_my_payout_info(name, account, tax_id)` | `→ void` | ✅ | Chủ tự upsert payout (không nhận `designer_id`) |
| `claim_design_request(id)` | `→ text` | ✅ | Designer nhận yêu cầu **atomic** (NULL nếu đã bị nhận) |

### 3b. Hàm trigger
| Hàm | Bảng | Mục đích |
|---|---|---|
| `fn_create_profile_for_new_user` | `auth.users` AFTER INSERT | Tạo `user_profiles`; chỉ `designer`→designer (guard kín), còn lại customer; tạo `designer_profiles` Pending |
| `fn_protect_profile_privileged_columns` | `user_profiles` BEFORE UPDATE | Chặn non-admin đổi role/kyc/status/total_* |
| `fn_sync_material_on_inventory_log` | `material_inventory_logs` AFTER INSERT | Cập nhật tồn theo Import/Export |
| `fn_touch_updated_at` | 21 bảng BEFORE UPDATE | Set `updated_at=now()` |
| `fn_sync_product_review_stats` | `reviews` AFTER I/U/D | Tính lại stats sản phẩm |
| `fn_protect_order_privileged_columns` | `orders` BEFORE UPDATE | Xưởng chỉ được đổi status/stage/layer_progress/updated_at |
| `fn_protect_workshop_profile_privileged_columns` | `workshop_profiles` BEFORE UPDATE | Owner không đổi `partner_id`/`verified_status` |
| `fn_protect_designer_profile_privileged_columns` | `designer_profiles` BEFORE UPDATE | Owner chỉ đổi display_name/bio/portfolio/avatar |
| `orders_broadcast_status` | `orders` AFTER I/U | `realtime.send({id,status},'order_status','orders:admin',true)` (tránh lộ PII) |

## 4. Trigger

| Trigger | Bảng | Thời điểm | Hàm |
|---|---|---|---|
| `trg_create_profile_for_new_user` | `auth.users` | AFTER INSERT | `fn_create_profile_for_new_user` |
| `trg_protect_profile_privileged_columns` | `user_profiles` | BEFORE UPDATE | `fn_protect_profile_privileged_columns` |
| `trg_sync_material_on_inventory_log` | `material_inventory_logs` | AFTER INSERT | `fn_sync_material_on_inventory_log` |
| `trg_touch_updated_at` | **21 bảng** | BEFORE UPDATE | `fn_touch_updated_at` |
| `trg_sync_product_review_stats` | `reviews` | AFTER I/U/D | `fn_sync_product_review_stats` |
| `trg_protect_order_privileged_columns` | `orders` | BEFORE UPDATE | `fn_protect_order_privileged_columns` |
| `trg_protect_workshop_profile_privileged_columns` | `workshop_profiles` | BEFORE UPDATE | `fn_protect_workshop_profile_privileged_columns` |
| `trg_protect_designer_profile_privileged_columns` | `designer_profiles` | BEFORE UPDATE | `fn_protect_designer_profile_privileged_columns` |
| `trg_orders_broadcast` | `orders` | AFTER INSERT / UPDATE OF `status` | `orders_broadcast_status` |

21 bảng có `trg_touch_updated_at`: products, materials, printer_fleet, accessories, workshop_partners, site_content, pricing_configs, orders, user_profiles, designer_profiles, customer_profiles, workshop_profiles, workshop_machines, workshop_materials, workshop_accessories, app_settings, warranty_claims, reviews, digital_assets, cart_items, workshop_commission_terms.

---

## 5. Ma trận RLS (quyền hiệu lực)

| Bảng | anon | authenticated (chủ) | designer | workshop | admin |
|---|---|---|---|---|---|
| `orders` | **INSERT only** (guest, token ≥12) — **không SELECT** | SELECT đơn của mình | — | SELECT + UPDATE tiến độ khi `assigned_workshop_id=current_workshop_partner_id()` (cột bị trigger giới hạn) | ALL |
| `user_profiles` | — | SELECT/UPDATE row mình (cột đặc quyền bị chặn) | như trên | như trên | ALL |
| `workshop_profiles` | SELECT chỉ `Verified` | SELECT verified; owner read/update | — | owner (partner_id/verified_status bị khoá) | ALL |
| `designer_profiles` | SELECT cột an toàn | owner ALL (guard) | owner ALL | — | public_read + admin_write + admin_all |
| `designer_payout_info` | **thu hồi tất cả** | owner (không DELETE) | owner | — | ALL (không DELETE) |
| `customer_profiles` | — | owner ALL | — | — | ALL |
| `kyc_records` | — | SELECT mình; INSERT (`status='pending'`) | — | — | ALL |
| `payment_transactions` | — | — | — | — | ALL (webhook dùng service_role) |
| `order_items` | **thu hồi** | SELECT dòng thuộc đơn mình | — | — | ALL |
| `order_files` | — | SELECT khi thuộc đơn mình | — | — | admin/lab insert/update; admin DELETE |
| `digital_assets` | **thu hồi** | **KHÔNG có policy** | owner ALL | — | ALL |
| `cart_items` | **thu hồi** | owner ALL | owner | owner | SELECT only |
| `reviews` | SELECT `published` | author read/ghi khi `pending` | — | — | ALL |
| `warranty_claims` | — | SELECT/INSERT mình (không UPDATE) | — | — | admin/lab SELECT/UPDATE |
| `quotes` | — | owner SELECT/INSERT/UPDATE | owner | owner | ALL |
| `custom_design_requests` | — | customer mình | chỉ khi `designer_id=uid`; pool qua view + RPC | — | ALL |
| `workshop_commission_terms` | thu hồi | — | — | — | ALL |
| `setting_audit` | — | — | — | — | SELECT/INSERT (append-only) |
| catalog (`products`,`materials`,`printer_fleet`,`accessories`,`workshop_partners`,`site_content`,`pricing_configs`,`pricing_global_settings`, `workshop_*`) | SELECT (`products` chỉ published) | SELECT | SELECT | SELECT | write |

### Storage
| Bucket | Public | Giới hạn | Policy |
|---|---|---|---|
| `product-images` | ✅ | 10 MB, ảnh | public read; admin write |
| `cad-files` | ❌ | 150 MB (STL/STEP/3MF/OBJ/zip) | admin all; buyer read qua `order_files`; fallback heuristic theo tên file (đơn cũ); `digital/<uid>/…` owner rw; `cad/<uid>/<uuid>/<file>` owner rw |

> Tổng **7 policy storage** (docs đang ghi 6 — thiếu policy `cad_owner_rw` từ T25).

---

## 6. Realtime

**Bảng publish** (11): `products`, `materials`, `printer_fleet`, `site_content`, `pricing_configs`, `orders`, `accessories`, `app_settings`, `pricing_global_settings`, `order_files`, `custom_design_requests`.

**Kênh phía client** (grep `src/`):
| Kênh | File | Ghi chú |
|---|---|---|
| `public:products` | `App.tsx` | `postgres_changes` |
| `vcube:settings` | `settingsService.ts` | 4 store settings |
| `public:custom_design_requests` | `customDesignService.ts` | sau SEC-02 chỉ còn hàng đã gán designer |
| `orders:admin` (broadcast) | **chưa có client subscribe** | server đã có trigger `orders_broadcast_status` + policy `orders_admin_realtime` |

---

## 7. Seed

- **Baseline**: chỉ 3 hàng singleton — `site_content('default')`, `pricing_global_settings('global')` (rate NULL), `app_settings('settings')`. **Không** seed product/material/printer/formula.
- **`scripts/seed-sample-data.mjs`** (dry-run mặc định, `--apply` ghi, `--remove` xoá, mọi hàng gắn `[MẪU]`): products 12 · materials 7 · printer_fleet 6 · accessories 5 · workshop_partners 1 · workshop_commission_terms 2 · orders 4 · order_items · designer_profiles 2 · designer_payout_info 2 · customer_profiles 2 · kyc_records 1 · digital_assets 3 · cart_items 2 · reviews 4 · workshop_machines 3 · workshop_materials 3 · quotes 1.

---

## 8. Bảng "có schema nhưng KHÔNG có code client"

Các bảng dưới đây tồn tại + có RLS nhưng **không** đường `src/` nào đọc/ghi:

| Bảng | Bằng chứng |
|---|---|
| `order_items` | 0 `from('order_items')` — mô hình chia 3 bên không được ghi |
| `order_files` | TODO trong `AssetLibraryView.tsx` — chưa nối luồng ghi/đọc |
| `digital_assets` | chỉ comment trong `App.tsx` — khách không có policy đọc |
| `cart_items` | 0 `from('cart_items')` — giỏ chỉ ở localStorage |
| `warranty_claims` | chỉ comment trong `MyOrdersView.tsx` |
| `reviews` | 0 `from('reviews')` — PDP chỉ đọc counter của `products` |
| `kyc_records` | `updateUserKyc()` ghi `user_profiles.kyc_status`, **không** ghi bảng này |
| `cost_rules` | 0 tham chiếu |
| `workshop_commission_terms` | chỉ seed/comment — admin UI chưa nối |
| `designer_payout_info` | chỉ truy cập **gián tiếp** qua RPC (`admin_get_designer_payout`); `upsert_my_payout_info` chưa có caller |

Code chết liên quan: `seedService.syncFromSupabase()` (0 caller), `dbService.uploadCadFile()` (đã chết theo comment `20261013110000`), `dbService.recordPaymentTransaction()` (0 caller).
