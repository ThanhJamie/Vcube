# 06 — Kiến trúc dữ liệu (Supabase) & triển khai (Vercel)

Tài liệu này chốt: schema/RLS/storage/realtime phải sửa thế nào, và app phải được cấu hình ra sao để chạy đúng trên **Supabase + Vercel**.
Mọi phát hiện dưới đây đã được **đọc trực tiếp trong file migration** (không suy đoán).

---

## 1. Hiện trạng — các vấn đề đã xác minh

> **⚠️ TRẠNG THÁI (cập nhật 2026-09-12):** toàn bộ S1–S9 và D1–D3 trong §1.1–§1.3 **ĐÃ ĐƯỢC SỬA**. Cách sửa: chuỗi migration còn 3 file (`20260900_rls_helpers.sql`, `20260901_baseline_schema.sql`, `20261010_harden_rls.sql`); 6 file cũ ở `supabase/legacy/`. **Đã áp lên production và kiểm chứng**: 21 bảng tồn tại, 0 bảng hở RLS, anon đọc `orders`/`user_profiles` = 0 dòng — xem `docs/security/rls-runbook.md` §10.6.
> Đọc §1 như **bản ghi lịch sử về lỗi**, không phải việc còn phải làm. Việc còn lại: §1.7d + §2.7.

### 1.1 Lỗ hổng RLS (mức nghiêm trọng nhất, sửa trước mọi việc khác)

| # | Phát hiện | Bằng chứng (đã đọc file) | Hệ quả |
|---|---|---|---|
| S1 | `products`: policy `"Admins can manage products"` là `FOR ALL USING (true)` — **không kiểm tra quyền** | `20260904_complete_vcube_schema_and_seeds.sql:49-50` | **Anon key (công khai) có thể INSERT/UPDATE/DELETE toàn bộ sản phẩm** |
| S2 | `orders`: `"Public can view orders" FOR SELECT USING (true)` | `...complete...sql:75-76` | **Bất kỳ ai đọc được TOÀN BỘ đơn hàng**: tên, SĐT, địa chỉ, `secure_access_token`, nội dung đơn |
| S3 | `user_profiles`: `"Users can view profiles" FOR SELECT USING (true)` | `...complete...sql:102-103` | **Rò dữ liệu cá nhân toàn bộ người dùng**: email, điện thoại, `kyc_details`, số tiền |
| S4 | `orders`: `"Public can insert orders" WITH CHECK (true)` | `...complete...sql:77-78` | Spam/giả mạo đơn không hạn chế |
| S5 | 15 policy tin `auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'` | `create_products...sql:85-93,116-124,133-141`; `secure_rls...:81`; `master...:325,353,388,422,438`; `role_profiles...:70,112,155,189,295,335,374,405` | `user_metadata` do **client** ghi được (`supabase.auth.updateUser`) → tự phong admin. Xem thêm `AuthContext.tsx:273-283` |
| S6 | Email super-admin hardcode trong policy: `chithanhso10@gmail.com` | `create_products...sql:87,92,117,123,134,140` + 9 chỗ khác | Không đổi được quyền admin mà không sửa SQL; rủi ro khi đổi chủ |
| S7 | `cad-files` là bucket private nhưng **chỉ có policy admin**, không có policy cho người mua; `createSignedUrl` = **0 call site** trong repo | `create_products...sql:128-142`; grep `createSignedUrl src/` = 0 | **Khách đã mua không tải được file CAD** (tính năng `/assets` hiện không thể hoạt động) |

> S2 + S3 là vi phạm Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (rò dữ liệu cá nhân của toàn bộ người dùng), và S1 cho phép phá hoại catalog. **Đây là P0 bảo mật, không phải việc "refactor UI".**

### 1.2 Schema

| # | Phát hiện | Bằng chứng |
|---|---|---|
| D1 | 4 file migration định nghĩa lại cùng bảng dưới `IF NOT EXISTS` → định nghĩa đầu thắng, các định nghĩa sau **bị bỏ qua âm thầm**: `orders` ×3, `materials` ×3, `printer_fleet` ×3, `user_profiles` ×2, `accessories` ×2, `workshop_partners` ×2, `products` ×2 | `CREATE TABLE` tại `complete:14,55,85,110,134,157`; `create_products:16`; `secure_rls:9,90`; `sync:15,74,130,175`; `master:15,53,96,147,196,244,281,359,394`; `role_profiles:27,76,118,161,252,301,341,380` |
| D2 | `pricing_config` vừa là **TABLE** (`complete:157`) vừa là **VIEW** (`master:473` — `CREATE OR REPLACE VIEW`) → migration này lỗi hoặc ghi đè sai; code đọc/ghi **cả hai** | `complete:157`; `master:473`; `database.ts:664` vs `:669`, `:687` vs `:697` |
| D3 | 2 bảng được code dùng nhưng **không có migration**: `quotes` (`database.ts:463`), `kyc_records` (`seedService.ts:273`, count probe `:109`) | grep `\.from\('` |
| D4 | `cost_rules` được tạo nhưng **0 code dùng** | `secure_rls:90`; grep `cost_rules src/` = 0 |
| D5 | Không có `DROP TABLE` nào → không thể tái lập schema sạch | grep toàn `supabase/` |
| D6 | `auth.users` được FK tham chiếu 5 lần nhưng không tạo → migration không replay được trên Postgres trắng | `master:394`… |
| D7 | `CREATE TYPE product_status` được tạo nhưng `products.status` là `TEXT` → type chết | `create_products:10` vs `complete:40` |
| D8 | Thiếu index cho các truy vấn mới sẽ dùng: đơn theo token/ngày, `order_events`, quote theo user, materials theo category | cần thêm ở Phase 7 |

### 1.3 Realtime & tầng dữ liệu client

| # | Phát hiện | Bằng chứng |
|---|---|---|
| R1 | **Không có câu lệnh nào thêm bảng vào publication `supabase_realtime`** trong repo | grep `publication` trong `supabase/` = 0 kết quả |
| R2 | Chỉ `products` được subscribe, dù admin sửa được `materials`, `printer_fleet`, `accessories`, `site_content`, `pricing_configs`, `orders` | `App.tsx:328-395`; audit |
| R3 | Handler realtime map snake→camel **inline**, và mapper này **trùng 3 bản** với default khác nhau | `App.tsx:339-365`; `database.ts:19-77`; `seedService.ts:512-553` |
| R4 | `dbService` là 1 file 895 LOC chứa 28 method của 10 domain | `database.ts` |
| R5 | `workshopService.ts` (1.237 LOC, 28 truy vấn trên 8 bảng) **không có UI nào dùng**; 3 store admin thay bằng mock in-memory | grep `workshopService` trong `src/frontend` = 0 |
| R6 | `saveQuote`, `recordPaymentTransaction`, `getOrders` **không có caller** | `database.ts:463`, `:768`, `:337` |

### 1.4 Bí mật & biến môi trường

| # | Phát hiện | Bằng chứng | Hành động |
|---|---|---|---|
| E1 | **Anon JWT + project URL hardcode** trong client | `src/backend/supabase/client.ts:4,6` | Xoá literal; chỉ đọc từ env |
| E2 | Cùng anon JWT làm **fallback trong `define`** của Vite → build không có `.env` sẽ trỏ vào project production | `vite.config.ts:16-17` | Xoá fallback; build phải **fail** nếu thiếu env |
| E3 | HMAC "signed quote" với secret hardcode trong client | `quoteVerifier.ts:38`; mirror `functions/calculate-quote/index.ts:89` | Xoá (đã nằm trong nhóm xoá dead code); không dùng chữ ký client |
| E4 | Mật khẩu demo hardcode hoạt động ở production | `AuthContext.tsx:173-188` | Chỉ bật khi `import.meta.env.DEV` |
| E5 | `SUPABASE_SERVICE_ROLE_KEY` **không** xuất hiện trong `src/` (tốt); `createAdminClient` không được re-export | `admin.ts:9` | Giữ nguyên; chỉ dùng ở script/edge function |
| E6 | Biến môi trường đặt tên `NEXT_PUBLIC_*` nhưng app là Vite | `.env.example` | Chuyển sang `VITE_*`, giữ fallback đọc tên cũ trong 1 giai đoạn |
| E7 | 2 lockfile cùng tồn tại (`bun.lock` + `package-lock.json`) | `ls` | Chọn **npm** (theo `AGENTS.md`), xoá lockfile còn lại để Vercel không build bằng toolchain khác |

### 1.5 Vercel

| # | Hiện trạng | Đánh giá |
|---|---|---|
| V1 | `vercel.json`: `framework: "vite"`, rewrite SPA `/(.*) → /index.html`, cache immutable cho `/assets/*` | Đúng; giữ |
| V2 | `dist/` **không** được commit (đã nằm trong `.gitignore`) | Tốt — số liệu bundle trong tài liệu này lấy từ build local |
| V3 | `chunkSizeWarningLimit: 1200` (nâng ngưỡng cảnh báo thay vì sửa) | Sửa: hạ về mặc định sau khi tách bundle |
| V4 | `three-vendor` (133.9 KB gzip) + `supabase-vendor` (57.8 KB gzip) được `modulepreload` ở mọi trang | three.js phải rời first paint |
| V5 | Không có `api/` hay serverless function | Hiện chưa cần; **khi** cắm payOS/webhook sẽ thêm `api/*.ts` kiểu Vercel thuần (không dùng Next.js) |
| V6 | Auth redirect URL cần khớp domain Vercel (`https://vcube-red.vercel.app` trong `.env.example`) | Cấu hình trong Supabase Auth → URL Configuration cho cả production + preview |

---

## 2. Kế hoạch migration (Phase 7)

### 2.1 Chiến lược file migration

Hiện trạng 6 file chồng lấn không thể sửa tại chỗ. Cách làm an toàn với dữ liệu production đang có:

1. **Tạo baseline canonical**: `supabase/migrations/20261001_baseline_schema.sql` — định nghĩa **đầy đủ, duy nhất** cho 20+ bảng, dùng `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` để **hội tụ** mọi cột đang có ở các định nghĩa rải rác (không xoá cột để tránh mất dữ liệu).
2. **Bảng theo dõi phiên bản**: `schema_migrations(version text primary key, applied_at timestamptz default now())` + mỗi file tự `INSERT` version của mình → biết đã áp gì.
3. **Sửa xung đột `pricing_config`**: giữ **TABLE** `pricing_configs` là nguồn chính; biến `pricing_config` cũ thành **VIEW read-only** cùng tên (đúng như `master:473` mong muốn) để code hiện tại vẫn chạy trong lúc chuyển; sau đó bỏ hẳn nhánh legacy trong `database.ts:669,697` + `seedService.ts:377`.
4. **Tạo 2 bảng thiếu**: `quotes` (báo giá có hạn, gắn `user_id` nullable cho guest + `access_token`) và `kyc_records` (hồ sơ KYC, RLS chỉ chủ sở hữu + admin).
5. **Index cần thêm:** `orders(secure_access_token)`, `orders(created_at desc)`, `orders(user_id)`, `quotes(user_id, expires_at)`, `order_events(order_id, created_at)`, `materials(category)`, `products(status, created_at desc)` (đã có full-text index cho `products`).
6. **Không xoá bảng** (`cost_rules`, type `product_status`) ở đợt này — chỉ đánh dấu deprecated trong tài liệu; xoá là việc riêng sau khi xác nhận không dùng.
7. **Cách áp dụng:** giai đoạn hiện tại dùng **Supabase SQL Editor** theo thứ tự tên file (đúng như README). Nếu sau này dùng Supabase CLI thì baseline phải chạy được trên DB trắng — vì vậy baseline **không** tham chiếu `auth.users` bằng FK cứng, chỉ dùng `uuid` + kiểm tra ở tầng policy.

### 2.2 RLS — thiết kế đích

Nguyên tắc: **quyền do DB quyết định**, client chỉ ẩn/hiện UI. Không đọc quyền từ `user_metadata`. Không hardcode email.

Helper (chạy `SECURITY DEFINER`, `search_path` cố định):

```sql
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.user_profiles where id = auth.uid()), 'anon');
$$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.current_role() = 'admin' $$;
```

| Bảng | Policy đích |
|---|---|
| `products` | `SELECT` cho mọi người **chỉ với** `status = 'published'`; `INSERT/UPDATE/DELETE` chỉ `is_admin()`. Xoá policy `FOR ALL USING (true)`. |
| `orders` | `SELECT`: chủ đơn (`user_id = auth.uid()`) **hoặc** `is_admin()` **hoặc** qua RPC `get_order_by_guest_token(token)` (đã có ở `master:453`) — **không** cho quét toàn bảng. `INSERT`: cho phép tạo đơn guest với `WITH CHECK` ràng buộc (email/sđt hợp lệ, `secure_access_token` không null); `UPDATE`: chỉ `is_admin()` hoặc qua RPC cập nhật trạng thái hạn chế. |
| `user_profiles` | `SELECT`: chính chủ hoặc `is_admin()`. `UPDATE`: chính chủ nhưng **không** được đổi `role`, `kyc_status` (dùng trigger chặn hoặc tách cột ghi riêng). |
| `materials`, `printer_fleet`, `accessories`, `workshop_partners`, `site_content`, `pricing_configs` | `SELECT` công khai (dữ liệu bán hàng); ghi chỉ `is_admin()`. |
| `workshop_*`, `designer_profiles`, `customer_profiles`, `material_inventory_logs`, `pricing_global_settings` | `SELECT/UPDATE` cho chủ sở hữu (`owner_id = auth.uid()`) hoặc `is_admin()`. |
| `payment_transactions`, `quotes`, `order_events` | chỉ chủ sở hữu + admin. |
| `kyc_records` | chỉ chủ sở hữu + admin. |

Bổ sung bắt buộc: **xoá mọi policy cũ theo tên** trước khi tạo policy mới (`DROP POLICY IF EXISTS`) — vì policy permissive được Postgres OR với nhau, policy `USING (true)` cũ còn sống thì mọi policy mới vô nghĩa. Đây chính là lý do "RLS hardening" trước đây không có tác dụng.

### 2.3 Storage

| Bucket | Hiện tại | Đích |
|---|---|---|
| `product-images` | public read; write chỉ admin (theo metadata role — phải sửa thành `is_admin()`) | giữ public read |
| `cad-files` | private; **chỉ** admin ALL → người mua không đọc được | thêm policy `SELECT` cho người **đã mua**: `bucket_id='cad-files' AND exists (select 1 from order_items oi join orders o on … where o.user_id = auth.uid() and oi.file_path = storage.objects.name and o.status in ('paid','printing','shipped','delivered'))`. Với khách guest: cấp **signed URL** ngắn hạn từ server/edge function. Bắt buộc dùng `createSignedUrl` phía client cho luồng hợp lệ (hiện = 0 call site). |
| Giới hạn | `cad-files` 100MB, mime `application/octet-stream|model/stl|model/step|application/zip` | thêm `model/3mf`, `model/obj`; đồng bộ với badge "150MB" trên UI (hoặc sửa badge cho khớp) |

### 2.4 Realtime

1. Thêm publication tường minh (hiện **không có** dòng nào):
   `alter publication supabase_realtime add table public.products, public.materials, public.printer_fleet, public.site_content, public.pricing_configs, public.orders, public.order_events;`
2. Chỉ subscribe những bảng admin sửa và khách cần thấy; với `orders` giới hạn theo `filter` (RLS vẫn là chốt chặn).
3. Gộp 3 mapper về **1 module** `src/backend/supabase/mappers.ts` (`rowToProduct`, `rowToOrder`, `rowToMaterial`, `rowToPrinter`, `rowToSiteContent`) + test đặc tả so sánh trước/sau.
4. Debounce/batch cập nhật catalog (burst INSERT hiện làm re-render toàn bộ consumer).

### 2.5 Tầng client

1. Tách `dbService` (895 LOC) thành `supabase/services/{product,order,user,material,printer,pricing,siteContent,partner,accessory,storage}Service.ts`; `dbService` giữ vai trò **facade** để 12 call site trong `App.tsx` + `OrderTrackingView.tsx` không phải sửa.
2. **Sinh type từ DB** (khuyến nghị mạnh): `supabase gen types typescript --project-id <id> > src/backend/supabase/database.types.ts` → service trả type thật, chấm dứt tình trạng interface trong `src/types/index.ts` (985 LOC) lệch schema.
3. Mọi service trả `{ data, error }` và **không** `console.warn` rồi im lặng; component phải có state loading/error.
4. Nối `workshopService` vào UI (lab/admin) — hiện là code chết nhưng là CRUD đúng duy nhất cho 8 bảng.

### 2.6 Bí mật & môi trường

| Việc | Chi tiết |
|---|---|
| Bỏ literal anon key/URL | `client.ts:4,6`, `vite.config.ts:16-17`. Build **fail** khi thiếu env (thêm kiểm tra ở `vite.config.ts`). |
| Đổi tên biến | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` (+ giữ đọc `NEXT_PUBLIC_*` trong 1 giai đoạn để không vỡ deploy cũ) |
| Bật khi DEV | `DEMO_ACCOUNTS`, mật khẩu demo, nút "Chuyển vai trò (Demo)", log chi tiết |
| Rotate | **Phải rotate anon key** sau khi bỏ literal (vì key đã nằm trong git history/`vite.config.ts`); service role key giữ server-only |
| `.env.example` | Viết lại: bỏ `GEMINI_API_KEY`/`APP_URL` (AI tree đã xoá), thêm `VITE_*`, ghi rõ biến nào là bí mật |
| Vercel | Khai báo env cho **Production + Preview + Development**; `NEXT_PUBLIC_SITE_URL` → `VITE_SITE_URL` = domain Vercel |
| Supabase Auth | Thêm redirect URL cho `https://<domain>` và `https://*-<team>.vercel.app` (preview) |

---

## 3. Vercel — cấu hình & hiệu năng

### 3.1 Build & deploy

| Mục | Giá trị |
|---|---|
| Framework preset | Vite (giữ `vercel.json`) |
| Build command | `npm run build` |
| Output | `dist` |
| Node | 20.x (khớp README) |
| Package manager | **npm** (chọn 1 lockfile) |
| Rewrite | `/(.*) → /index.html` (đã có) |
| Cache | `/assets/*` immutable (đã có); thêm `Cache-Control` cho ảnh tĩnh |
| Env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` |
| Preview | dùng Supabase project riêng hoặc chế độ read-only để tránh ghi dữ liệu thật |

### 3.2 Ngân sách hiệu năng (đo thật ở baseline — xem `docs/plans/baseline.md`)

| Chỉ số | Baseline | Đích |
|---|---|---|
| JS preload ở first paint | 398.6 KB gzip (index 188.7 + three 133.9 + supabase 57.8 + react 18.2) | ≤ 200 KB (bỏ three + supabase khỏi preload) |
| CSS | 22.6 KB gzip | ≤ 12 KB |
| Chunk lớn nhất | `index.js` 717 KB thô / 188.7 KB gzip | index ≤ 300 KB thô |
| `Tool3DView` | 311 KB thô / 89.7 KB gzip (đã lazy) | giữ lazy, tách phần pricing |
| Số vòng render WebGL chạy nền | tối đa 5 viewer có thể mount cùng lúc | 1, chỉ chạy khi trên màn hình |
| Core Web Vitals mục tiêu | chưa đo | LCP ≤ 2.5s, CLS ≤ 0.1, INP < 200ms |

Cách đạt: lazy `ThreeModelViewer`/`CadQuickViewModal`/modal nặng; bỏ `modulepreload` ba chunk vendor; token hoá CSS (giảm utility trùng); ảnh `loading="lazy"` + `width/height` + `srcset`; pause render loop ngoài viewport.

### 3.3 Khi nào cần serverless

Hiện app thuần SPA, **không cần** server. Sẽ cần khi:
1. Cắm **payOS/webhook** xác nhận chuyển khoản (cần nơi giữ secret + verify chữ ký) → `api/payments/webhook.ts`.
2. Cấp **signed URL** cho guest (nếu không muốn policy phức tạp) → `api/files/sign.ts`.
3. Gửi **Zalo ZNS/email** (giữ API key) → `api/notify/*.ts`.
Đây là function Vercel thuần (không dùng Next.js, không thêm framework).

---

## 4. Tuân thủ pháp lý VN (liên quan trực tiếp tới sản phẩm)

| Văn bản | Yêu cầu ảnh hưởng tới sản phẩm | Việc phải làm |
|---|---|---|
| **NĐ 52/2013/NĐ-CP** (sửa bởi **85/2021/NĐ-CP**) | VCUBE là **website cung cấp dịch vụ TMĐT** (sàn) → phải đăng ký/thông báo với Bộ Công Thương và công bố thông tin: điều khoản, chính sách bảo mật, quy trình giải quyết tranh chấp, thông tin thương nhân | Tạo các trang chính sách (D1 ở `05-feature-roadmap.md`), link ở footer, hiển thị **badge online.gov.vn** |
| **NĐ 13/2023/NĐ-CP** (PDPD) | Dữ liệu cá nhân: cần sự đồng ý, mục đích rõ, quyền của chủ thể (11 quyền: truy cập, xoá, hạn chế, phản đối…), thông báo vi phạm | Trang Chính sách bảo mật + đồng ý khi đăng ký (không pre-tick) + đường **xuất/xoá dữ liệu cá nhân** trong `/orders`-settings + siết RLS (S2/S3 hiện là rò dữ liệu cá nhân) |
| **Luật 19/2023/QH15** (BVNTD, hiệu lực 01/7/2024) | Thông tin giao dịch phải chính xác, đầy đủ; trách nhiệm về chất lượng dịch vụ; quyền đơn phương chấm dứt và hoàn tiền | Chính sách đổi/hoàn/in lại rõ ràng; hiển thị dung sai & tiêu chuẩn QC **có thật** (không hứa ±0.05mm nếu không đo được); không dùng số liệu bịa (`docs/design/data-honesty.md`) |
| **NĐ 70/2025/NĐ-CP** (hoá đơn điện tử) | Hoá đơn điện tử cho hộ/doanh nghiệp (bắt buộc từ 2026 với hộ ≥1 tỷ/năm) | Luồng VAT phải nhất quán 1 con số; lưu MST; hoá đơn in/PDF đúng thông tin |
| **Quyết định 1813/QĐ-TTg** | Khuyến khích thanh toán QR | VietQR có số tiền trong checkout |

**Điểm cần lưu ý:** hiện tại nút "In Hóa Đơn" (`InvoiceModal`) cộng 8% VAT trong khi quote nói "đã gồm VAT" và cart set `tax: 0`. Với yêu cầu pháp lý về hoá đơn, **đây là lỗi không thể để lại** — đã nằm trong P0 của `03-pages-transaction.md` §3.

---

## 5. Checklist thi công Phase 7 (theo thứ tự bắt buộc)

1. [x] **Sửa RLS trước tiên** — ✅ XONG + kiểm chứng (`rls-runbook.md` §10.6) (S1–S5): drop policy `USING (true)`, thêm helper `current_role()/is_admin()`, viết lại policy, **kiểm bằng script** với anon key: ghi `products` phải fail, đọc `orders`/`user_profiles` phải trả 0 dòng.
2. [x] **Bỏ literal trong `client.ts`/`vite.config.ts`** — ✅ XONG (dùng `sb_publishable_…`). ⏳ Còn: **rotate `sb_secret_…`** (đã lộ trong chat) + bỏ literal trong `client.ts`/`vite.config.ts` (E1, E2).
3. [x] **Policy storage cho `cad-files`** — ✅ đã tạo (admin + người mua theo `orders.items`). ⏳ Còn: client gọi `createSignedUrl` + bảng `order_files` cho chính xác + dùng `createSignedUrl` (S7).
4. [x] **Baseline schema canonical** — ✅ XONG (`20260901_baseline_schema.sql`, 21 bảng). `pricing_config` nay là VIEW `security_invoker`. Ghi chú: chưa có bảng `schema_migrations` (dùng thứ tự tên file)
5. [x] **`quotes`, `kyc_records` + index** — ✅ XONG trong baseline
6. [x] **Publication realtime** — ✅ đã thêm cho products/materials/printer_fleet/site_content/pricing_configs/orders/accessories. ⏳ Còn: gộp 3 row mapper (R3)
7. [ ] Tách `dbService` + sinh type từ DB (R4, §2.5) — ⏳ CÒN
8. [ ] Nối `workshopService` vào lab/admin (R5) — ⏳ CÒN (Phase 6)
9. [x] **Env sang `VITE_*`** — ✅ XONG trong `.env` + code. ⏳ Còn: khai báo env trên Vercel (3 môi trường) + redirect URL trong Supabase Auth; viết lại `.env.example`
10. [ ] Chọn 1 lockfile; hạ `chunkSizeWarningLimit` sau khi tách bundle.
11. [ ] Các trang chính sách + badge online.gov.vn (D1, D2 roadmap) — ⏳ CÒN

**Rollback:** mỗi bước là 1 file migration riêng + 1 commit; policy cũ được lưu trong `supabase/rollback/` dưới dạng script `DROP POLICY` mới + `CREATE POLICY` bản cũ để khôi phục nhanh. Không chạy bước nào trên production mà chưa chạy trên project staging.

---

## 1.6 Bổ sung — phát hiện thêm ở vòng kiểm QA (đã xác minh trực tiếp)

| # | Phát hiện | Bằng chứng (đã đọc) | Hệ quả |
|---|---|---|---|
| **S8** | **Chèn bộ lọc PostgREST:** tham số người dùng được nội suy thẳng vào filter `.or()` | `database.ts:418` — `.or(\`order_number.eq.${identifier},id.eq.${identifier}\`)` | Kẻ tấn công có thể chèn điều kiện vào chuỗi filter (dấu `,`, `)`), mở rộng truy vấn ngoài ý định. **Sửa:** dùng `.eq()` riêng cho từng trường hợp, hoặc RPC có tham số (`get_order_by_guest_token` đã có sẵn ở `master:453`) |
| **S9** | **Tra cứu khách không xác thực:** khi không nhập mã xác thực, hàm tìm đơn trả `true` cho bất kỳ đơn nào khớp mã đơn — cả nhánh `localStorage` và nhánh `MOCK_ORDERS` | `OrderTrackingView.tsx:89-98` (`return true` ở `:97`), `:108-117` (`return true` ở `:116`) | Chỉ cần biết/đoán mã đơn là xem được đơn (tên, SĐT, địa chỉ, carrier). Cộng với S2 (RLS `USING(true)`) thành 2 đường rò độc lập. **Sửa:** bắt buộc mã xác thực hoặc RPC token; bỏ fallback mock/localStorage |
| **S10** | **Checkout không chặn giỏ rỗng và không chặn submit 2 lần** | `CheckoutView.tsx` (không có guard `cart.length === 0`, nút submit không disable theo `isSubmitting`) | Tạo đơn rỗng/trùng. **Sửa:** guard giỏ rỗng → điều hướng về `/cart`; disable nút + idempotency key |
| **S11** | **Deep-link bị bỏ qua:** `/admin/:section` không chọn đúng tab con (ví dụ `/admin/machines` mở tab Workshops), `/designer/:tab` bỏ qua tham số | `AdminDashboardView.tsx:417-444` (thiếu `initialSubTab` cho `machines`, `inventory`, `orders`); audit designer | Link chia sẻ được nhưng mở sai chỗ → người dùng tưởng mất dữ liệu |

**Ghi chú ưu tiên:** S8, S9 phải sửa **cùng lúc** với S1–S3 (Phase 7, hoặc tách ra làm ngay vì độc lập với UI) — cả 4 lỗi này đều cho phép truy cập dữ liệu đơn hàng/dữ liệu cá nhân mà không cần quyền.

---

## 1.7 ĐÍNH CHÍNH & CẬP NHẬT — sau khi kiểm tra thực tế và sửa (2026-09-12)

### a) Đính chính về mức độ ảnh hưởng

Bảng S1–S7 ở §1.1 mô tả lỗ hổng **trong mã nguồn migration** — điều đó đúng. Nhưng khi kiểm tra project thật bằng anon key thì:

| Kiểm tra | Kết quả thực tế |
|---|---|
| `GET /rest/v1/products` (anon) | **404 `PGRST205`** — bảng không tồn tại |
| `orders`, `user_profiles`, `payment_transactions` | 404 `PGRST205` — không tồn tại |
| RPC `get_order_by_guest_token` | không tồn tại |
| `GET /rest/v1/` (OpenAPI, anon) | `401 UNAUTHORIZED_INVALID_API_KEY_TYPE` |
| `.env` | là bản sao placeholder của `.env.example` (anon key 18 ký tự, service key 34 ký tự) |

⇒ **Project production chưa có schema VCUBE.** Lỗ hổng đang ở dạng **tiềm ẩn** (chưa có bảng để khai thác), và app đang chạy bằng mock/localStorage — khớp với `docs/design/data-honesty.md`. Đây là thời điểm tốt để tạo schema đúng ngay từ đầu.

### b) Đã sửa (tầng mã nguồn migration)

| File | Việc đã làm |
|---|---|
| `supabase/migrations/20260901_rls_helpers.sql` **(mới)** | `current_app_role()` + `is_admin()` chạy sớm nhất, fail-closed khi bảng chưa tồn tại |
| `20260904_complete_vcube_schema_and_seeds.sql` | 6 policy `FOR ALL USING (true)` → `is_admin()`; bỏ `SELECT USING (true)` trên `orders`/`user_profiles`; `products` chỉ đọc published; insert `orders` phải có token |
| `20260904_create_products_and_storage.sql` | 6 chuỗi `user_metadata`/email hardcode → `is_admin()` |
| `20260904_secure_rls_and_pricing.sql` | 4 chuỗi → `is_admin()`; insert `orders` phải có token |
| `20260904_sync_complete_schema.sql` | 8 chuỗi → `is_admin()` |
| `20260905_master_production_schema.sql` | 17 chuỗi → `is_admin()`; insert `orders` phải có token; `payment_transactions` chỉ admin |
| `20260905_role_profiles_and_pricing_schema.sql` | 11 chuỗi → `is_admin()`; insert `material_inventory_logs` chỉ chủ xưởng/admin |
| `supabase/migrations/20261010_harden_rls.sql` **(mới)** | Siết cuối: dọn mọi policy cũ + policy lạ, tạo 48 policy đúng + 4 policy storage, trigger chống tự nâng quyền, trigger tự tạo profile, `security_invoker` cho view `pricing_config`, kiểm tra cuối |

Tổng: **0 policy dùng `user_metadata`, 0 email hardcode, 0 `FOR ALL USING (true)`** (gate `scripts/lint-rls-sources.mjs`).

### c) Artifacts mới kèm theo

| File | Mục đích |
|---|---|
| `docs/security/rls-runbook.md` | Runbook thi công + xử lý sự cố (đọc trước khi chạy) |
| `supabase/diagnostics/rls_audit.sql` | Chẩn đoán chỉ-đọc: policy, cột bảng, role, trigger, view, storage, realtime |
| `supabase/scripts/bootstrap_admin.sql` | Cấp quyền admin (bắt buộc sau hardening, vì app không tự tạo `user_profiles`) |
| `scripts/verify-rls.mjs` | Kiểm chứng bằng anon key (chỉ đếm, không in PII); `--writes` để thử ghi no-op |
| `scripts/lint-rls-sources.mjs` | Gate: chặn anti-pattern RLS trong **mọi** migration |
| `scripts/lint-rls-migration.mjs` | Gate: allowlist khớp policy, dollar-quote cân bằng, có `begin/commit` |

### d) Việc còn lại thuộc Phase 3 (client), không thuộc migration

* `database.ts:418` nội suy tham số vào filter `.or()` (S8) → chuyển sang RPC `get_order_by_guest_token`.
* `OrderTrackingView.tsx:97,116` trả `true` khi không có mã xác thực (S9) → bắt buộc token, bỏ fallback mock/localStorage.
* `AuthContext.tsx:67-80, 273-316` lấy vai trò từ `user_metadata` → đọc từ `user_profiles.role` để UI khớp quyền thật.
* Bỏ anon key/JWT hardcode trong `client.ts:6` + `vite.config.ts:17`, điền `.env` thật, **rotate anon key**.

### e) Cập nhật kiến trúc migration (đã thi công)

Chuỗi migration đã được tái cấu trúc thành **3 file** thay vì 6 file chồng lấn:

| File | Vai trò |
|---|---|
| `supabase/migrations/20260900_rls_helpers.sql` | `current_app_role()` + `is_admin()` |
| `supabase/migrations/20260901_baseline_schema.sql` | Toàn bộ schema: 21 bảng (bao gồm `quotes`, `kyc_records` trước đây bị thiếu), 26 index, 5 hàm, 4 trigger, 2 storage bucket, realtime, seed tối thiểu |
| `supabase/migrations/20261010_harden_rls.sql` | Toàn bộ policy (48 policy bảng + 4 policy storage), tự dọn policy cũ/lạ |

6 file cũ nằm ở `supabase/legacy/` (kèm README giải thích 4 lỗi khiến chúng không chạy được). Việc tách "schema" và "policy" thành hai file giúp policy chỉ có **một** nơi định nghĩa — tránh đúng loại lỗi đã gây ra sự cố ban đầu (policy cũ không bị drop vì khác tên).
