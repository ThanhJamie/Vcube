<!-- doc-meta: status=active; verified=2026-09-24; owner=thanh -->
# OWNER ACTIONS — Hướng dẫn thao tác (2026-09-24)

> Dành cho chủ dự án (`H`). Subagent **không** được push, **không** chạm prod. Làm theo đúng thứ tự.
> Ưu tiên: **Bước D (SEC-01 hotfix)** là P0 — dữ liệu ngân hàng/MST của 1 designer đang bị anon đọc được.

---

## 0. Bối cảnh & thứ tự bắt buộc

Đang có 3 migration **nháp** (chưa áp), phải áp **đúng thứ tự tên file**:

1. `supabase/migrations/20261011090000_sec01_designer_payout_hotfix.sql`
2. `supabase/migrations/20261011100000_signup_role_designer.sql`
3. `supabase/migrations/20261011110000_designer_profile_column_guard.sql`

Thứ tự tổng: **A (khoá/env) → B (deploy client) → C (backup) → D (áp migration) → E (post-check) → F (tạo/kiểm designer) → G (thông báo/pháp lý)**.

> ⚠️ **KHÔNG** chạy `supabase/scripts/apply_all_manual.sql` hay `20261010_harden_rls.sql` lại trên prod cho tới khi xong E — chúng có thể `grant select` toàn bảng và **hoàn tác hotfix**. (`apply_all_manual.sql` cũng chưa chứa 3 migration mới.)

---

## A. Khoá & môi trường

### A1. Lấy khoá Supabase
Supabase Dashboard → **Project Settings → API**:
- **Project URL** → dạng `https://<project-ref>.supabase.co`
- **Publishable key** → `sb_publishable_…` (an toàn để lộ, RLS là cổng chặn)
- **Secret key** → `sb_secret_…` (**server-only**, bỏ qua mọi RLS — không bao giờ đưa vào Vercel client/`define`)

> Khoá secret cũ **đã lộ trong chat** ⇒ hãy **rotate** (tạo key mới) rồi dùng key mới.

### A2. Sửa `.env` local
Mở `.env`, thêm (thay `<...>` bằng giá trị thật):
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SITE_URL=http://localhost:3000
# SERVER ONLY — không commit, không đưa vào define của Vite
SUPABASE_SECRET_KEY=sb_secret_...
```
- `SUPABASE_SERVICE_ROLE_KEY` trong `.env` hiện **đang là anon key** (dán nhãn sai). Sửa thành service_role thật **hoặc** xoá.
- Kiểm nhanh: `node scripts/inspect-db.mjs` — cột “SECRET” phải cho ra số thật (không còn giống cột anon).

### A3. Khai env trên Vercel (client)
Vercel → Project → **Settings → Environment Variables**, thêm cho **Production + Preview**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SITE_URL` = domain thật (vd `https://<domain-cua-ban>`)

**Không** đặt `SUPABASE_SECRET_KEY` trong env client của Vercel (chỉ dùng nếu có Edge Function gọi server-side).

---

## B. Commit & deploy client (làm TRƯỚC khi áp hotfix)

Lý do: hotfix thu hồi `SELECT` toàn bảng; bundle cũ còn `select('*')` sẽ lỗi 42501 cho tới khi tải lại trang.

```bash
git status
git diff --stat
# kiểm tra không có secret bị stage:
git diff --cached --name-only | grep -E "\.env$|secret" || echo "OK no secret staged"
git add -A
git commit -m "fix(security): SEC-01 designer_profiles hotfix client + designer lifecycle + docs/tooling"
git push
```
- Nếu deploy bằng Vercel Git integration: chờ build xong.
- Nếu bạn kiểm tra local trước: `npm run build` phải xanh.
- Xác nhận app prod tải được (không lỗi bảng/đăng nhập).

---

## C. Backup dữ liệu (SQL Editor)

Supabase → **SQL Editor** → New query → dán:
```sql
create table if not exists _bak_designer_profiles_20260924
  as select * from public.designer_profiles;
select count(*) from _bak_designer_profiles_20260924;   -- kỳ vọng: 2
```

---

## D. Áp 3 migration (SQL Editor, đúng thứ tự)

Với **từng file**: mở file trong repo → copy toàn bộ nội dung → dán vào SQL Editor → **Run**. Sau mỗi file, chạy câu kiểm tương ứng.

### D1. `20261011090000_sec01_designer_payout_hotfix.sql` (P0)
- Việc: `revoke select` toàn bảng; `grant select` **chỉ cột an toàn**; tạo RPC `get_my_payout_info()` / `admin_get_designer_payout(uuid)`.
- Sau khi Run, kiểm:
```sql
select has_column_privilege('anon','public.designer_profiles','bank_account','select');          -- false
select has_column_privilege('authenticated','public.designer_profiles','bank_account','select'); -- false
select has_column_privilege('anon','public.designer_profiles','display_name','select');          -- true
select proname from pg_proc where proname in ('get_my_payout_info','admin_get_designer_payout');
```
- Thử REST (thay `<ref>` + `<anon-key>`):
```bash
curl -s "https://<ref>.supabase.co/rest/v1/designer_profiles?select=bank_account" -H "apikey: <anon-key>" ; echo
# kỳ vọng: lỗi quyền (401/403), KHÔNG trả dữ liệu
```

### D2. `20261011100000_signup_role_designer.sql`
- Việc: trigger đăng ký đọc `raw_user_meta_data->>'role'`, chỉ map `designer`/`customer` (không bao giờ `admin`), tạo `designer_profiles` Pending khi chọn designer.
- Kiểm:
```sql
select prosrc ilike '%raw_user_meta_data%role%' as reads_meta
from pg_proc where proname = 'fn_create_profile_for_new_user';
```

### D3. `20261011110000_designer_profile_column_guard.sql`
- Việc: chặn owner tự sửa cột đặc quyền (`royalty_percent`, `verified_status`, `rating`, `total_sales`, `id`, `user_id`…).
- Kiểm:
```sql
select tgname from pg_trigger
where tgrelid = 'public.designer_profiles'::regclass
  and tgname = 'trg_protect_designer_profile_privileged_columns';
```

---

## E. Post-check & FREEZE

1. Mở app prod: trang chủ, `/designer`, `/admin`, đăng ký thử → **không** có lỗi `42501` / `permission denied`.
2. Kiểm migration đã ghi:
```sql
select count(*) from public.designer_profiles;   -- vẫn 2
```
3. Bật **FREEZE** (ghi nhớ nội bộ): từ giờ tới khi xong W2, **không** chạy lại `20261010_harden_rls.sql` / `apply_all_manual.sql`.

Nếu bước nào lỗi: chạy file rollback tương ứng trong `supabase/rollback/<timestamp>_down.sql` rồi báo lại.

---

## F. Tạo / kiểm designer

**Cách 1 — Admin promote (không cần migration nào thêm):**
1. Đảm bảo account của bạn có `user_profiles.role='admin'` (nếu chưa: `supabase/scripts/bootstrap_admin.sql`).
2. Vào `/admin` → **Group3 (Khách hàng)** → nút **“Cấp quyền Designer”** cho account mong muốn.
3. Người đó mở `/designer` được.

**Cách 2 — Tự đăng ký (sau khi đã áp D2):**
- Trang đăng ký → chọn **“Nhà thiết kế”** → vào `/designer` (hồ sơ `verified_status='Pending'`).

**Kiểm chống leo quyền (sau D3):** đăng nhập là designer, thử:
```sql
update public.designer_profiles set royalty_percent = 100 where user_id = auth.uid();
-- kỳ vọng: lỗi 42501 (bị chặn)
```

---

## G. Thông báo & pháp lý

- Liên hệ designer bị ảnh hưởng (`c***@vcube.vn`) để đổi thông tin nhận tiền / theo dõi giao dịch bất thường.
- Xác minh nghĩa vụ báo cáo vi phạm dữ liệu cá nhân theo quy định Việt Nam (thường có mốc ~72 giờ; **không phải tư vấn pháp lý** — hỏi luật sư).
- Cập nhật `docs/security/incident-2026-09-SEC01.md` (`<APPLY_DATE>`, `<EXPORT_REF>`, timeline).

---

## H. Dọn dẹp & theo dõi

- Xoá bảng backup sau khi ổn định: `drop table _bak_designer_profiles_20260924;`
- Sau khi hoàn tất, báo để mở **W2** (các migration RLS còn lại: tách `designer_payout_info`, view `open_design_requests` + RPC claim, CHECK/enum, storage scheme, broadcast realtime).
- Trạng thái gate hiện tại: `npm run check -- --baseline docs/tasks/baseline.json` → RC=0.

---

## Troubleshooting nhanh

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| Áp D1 xong app lỗi 42501 | Bundle cũ đang cache còn `select('*')` | Hard reload; xác nhận B đã deploy |
| `has_column_privilege('anon',…,bank_account)` vẫn `true` | Chạy lại `harden`/`apply_all_manual` sau hotfix | Chạy lại D1, bật FREEZE |
| `/designer` vẫn chặn sau promote | `user_profiles.role` chưa phải `designer` | Kiểm `select role from user_profiles where email=…`; trigger bảo vệ cột có thể chặn nếu không phải admin |
| `node scripts/inspect-db.mjs` cột SECRET giống anon | `SUPABASE_SECRET_KEY` chưa thật | Làm lại A1–A2 |
| `apply_all_manual.sql` thiếu migration mới | generator chưa cập nhật (T24) | Không dùng file này; áp thủ công D1–D3 |
