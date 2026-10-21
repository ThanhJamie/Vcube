<!-- doc-meta: status=active; verified=2026-09-24; owner=thanh -->
# VCUBE — Task board thực thi (v4)

> **Ngày:** 2026-09-24 · **Thay thế v3** · **Phụ thuộc:** `DRIFT-REMEDIATION-PLAN.md` (nguyên nhân A–F) + `DOCS-ISSUES.md` (ID).
> **Trạng thái:** sẵn sàng dispatch; **chưa thực thi**. W0 chốt quyết định §2 trước khi giao task nào khác.
> **Nguyên tắc vàng:** *code chốt hành vi trước, docs viết sau* (W5). Việc chạm production do **người** thực hiện, subagent chỉ soạn.
> **Ký hiệu executor:** `SA` = subagent · `H` = người (bạn) · `O` = orchestrator.
> **Xác minh:** các claim code trong board đã được rà ngày 2026-09-24 — xem **Phụ lục B**.

---

## 0. Changelog v3 → v4 (kết quả rà soát lần 3)

| # | Lỗi trong v3 | Sửa trong v4 |
|---|---|---|
| 1 | **T31 bị mất định nghĩa** (T15/T16/T17 và coverage vẫn phụ thuộc T31) | Định nghĩa lại T31 ở W5, trước T14–T17 |
| 2 | **T30 ↔ T05 phụ thuộc vòng** (T05 nhúng T30, T30 phụ thuộc T05) | Manifest do T05 tạo sẵn slot `optional/advisory`; T30 chỉ tạo script |
| 3 | **T35-mig sai kỹ thuật**: `realtime.broadcast_changes` gửi cả `new`/`old` (lộ `secure_access_token`, PII) | Dùng `realtime.send(payload, event, topic, private=true)` + policy trên `realtime.messages` chỉ cho admin |
| 4 | **T22 (SEC-04) làm gãy báo giá**: `pricingEngine.ts` chạy client, cần `cost_per_kg`/`hourly_cost` cho guest | Tách: T22a audit (read-only, W1) + T54 sửa thật **sau T45**; D14 |
| 5 | **T02 làm hỏng build Vercel/CI** nếu env đang là `NEXT_PUBLIC_*` hoặc CI không có env | T02 phụ thuộc T0C, chấp nhận cả 2 tên, có cờ `VCUBE_ALLOW_MOCK_BUILD=1` |
| 6 | **T0A**: OWNED không gồm file `src`; thứ tự deploy sai; bỏ sót `.update().select()`/`upsert`; apply lại `harden`/`apply_all_manual` có thể hoàn tác hotfix; chưa audit cột nhạy cảm bảng catalog khác | Tách T0A-1…T0A-4, audit cột nhạy cảm mọi bảng catalog, thứ tự *deploy client → apply migration*, freeze apply lại harden |
| 5b | (tiếp) `revoke`/`grant` + client cũ đang cache | Ghi rõ cửa sổ lỗi thoáng qua, cách giảm |
| 7 | **T0B tự mâu thuẫn** ("làm trước T0A" nhưng ghi vào runbook "sau T0A"); dùng secret key prod | Chạy trong **SQL Editor** (không cần copy key); ghi vào file sự cố riêng `incident-2026-09-SEC01.md` |
| 8 | **T20.0 "red test" vô nghĩa** cho SEC-01 (T0A đã đóng lỗ hổng nên test không thể đỏ) | SEC-01 = *regression test (xanh từ đầu)*; test đỏ chỉ dành cho "bảng bank tách riêng" và SEC-02 |
| 9 | Không phân biệt việc **người** làm (prod, dashboard) và subagent | Thêm trường `Executor`; §1.4 *Prod apply protocol* |
| 10 | Worktree copy `.env` **prod** vào mọi worktree (subagent có secret key prod) | `.env.worktree` (local/staging) + guard chặn URL prod |
| 11 | `npm ci` fail nếu repo chỉ có `bun.lock` | Script chọn `npm ci`/`bun install --frozen-lockfile` theo lockfile có thật |
| 12 | Frontmatter YAML làm **README.md/AGENTS.md hiển thị xấu** trên GitHub | Dùng marker HTML comment `<!-- doc-meta: … -->` |
| 13 | T18 (5 file, ~30 issue) và T19 (7 file) vượt "≤ 1 phiên" | T18a/b/c; T19 rút gọn; T19 thiếu DB-08/09 |
| 14 | Coverage sai: NEW-01→T11 (thực ra `rls-policies.md`→T13), NEW-30→T05/T19 (thực ra `system-overview.md`→T47), NEW-28 nằm ở T18, SEC-06 phần header không có chủ, IDX-13 thiếu T01, NEW-14 thiếu T08 | Sửa; coverage máy đọc được ở Phụ lục A |
| 15 | T32 "từng component" vi phạm ownership; xung đột `OrderTrackingView.tsx` với T34 | T32a/b/c/d với OWNED tường minh; T32d sau T34b |
| 16 | T34 thiếu `CheckoutView.tsx` (nơi mint token `sec_`), thiếu `Referrer-Policy`, token có thể bị lộ qua URL/Referer | T34a/b/c; `history.replaceState` xoá token; `vercel.json` header; token 128-bit CSPRNG (D15) |
| 17 | T26 sinh file mới cạnh `schema.md` → `schema.md` vẫn stale | **`schema.md` chính là file sinh ra**; văn xuôi thủ công chuyển sang `schema-notes.md` (T11 chạy trước T26) |
| 18 | Tên migration `20261011_*` nhiều file → **trùng version** với Supabase CLI | Timestamp 14 số `20261011HHMMSS_*` |
| 19 | Acceptance grep dễ sai (`motion` khớp `prefers-reduced-motion`, T07a chỉ kiểm 1 chuỗi) | Regex chính xác, kiểm nhiều mẫu |
| 20 | "Không tệ hơn baseline" nhưng baseline không lưu ở đâu | `docs/tasks/baseline.json` + `run-checks.mjs --baseline` |
| 21 | Backlog dev còn hở: `order_items`/`cart_items`/`digital_assets`, Google OAuth/reset, UI dispatcher, growth | Thêm T51/T52/T53; growth ghi "ngoài phạm vi" |
| 22 | `check-doc-refs` báo nhiễu ở doc snapshot/historical | Bỏ qua doc `snapshot|historical` trừ `--strict` |
| 23 | Số liệu tổng trong `DOCS-ISSUES.md` không nhất quán (78+17+35=130 nhưng cộng dòng ra khác; NEW chỉ tới 30) | Board quản lý theo **ID**, không theo tổng: 102 hàng backlog − 3 đóng + 30 NEW = **129 ID cần chủ** |
| 24 | T20 vẫn gán P0 dù T0A đã đóng lỗ hổng; bước drop cột không có cổng người | T20 = P1 (defense-in-depth); bước drop cột có **cổng H** |
| 25 | T39 ghi OWNED "docs liên quan" (mơ hồ) | OWNED tường minh; docs do T47/T08/T19 |
| 26 | Docs README/AGENTS không có ai thêm link tới file sinh ra (`schema.md`, `_routes.generated.md`, `feature-status.md`…) | T55 |
| 27 | Migration `20261010_harden_rls.sql` có ngày **sau** hôm nay (2026-09-24); repo apply bằng SQL Editor | Ghi chú §1.4; không dùng `supabase db push` lên prod |

---

## 1. Nguyên tắc & protocol

### 1.1 Ownership & concurrency
1. 1 task = 1 mục tiêu, ≤ 1 phiên. **1 file = 1 chủ trong cùng wave.**
2. `DOCS-ISSUES.md`: **chỉ O** cập nhật sau merge (task chỉ ghi vào báo cáo; O cũng sửa lại bảng tổng cho khớp).
3. `docs/tasks/DRIFT-REMEDIATION-PLAN.md`: chỉ **T0D** ghi.
4. Không chạy song song hai task cùng chạm `supabase/migrations/*`, `package.json`, `src/App.tsx`.
5. Khi OWNED ghi *basename* (không có thư mục), bước 0 của task là `git ls-files | grep <basename>` để xác định path duy nhất rồi mới sửa; nếu ra ≥ 2 kết quả → dừng và hỏi O.
6. `docs/README.md`, `AGENTS.md`: sau W1 chỉ **T55** được sửa thêm (thêm link).

### 1.2 Worktree & an toàn secret
- Mỗi task: `scripts/dev/new-worktree.sh <ID>` → `git worktree add ../vcube-<ID> -b task/<ID>`; merge tuần tự vào nhánh tích hợp.
- **Không copy `.env` prod vào worktree.** Script copy `.env.worktree` (giá trị local/staging) thành `.env`; script **abort** nếu:
  `.env.worktree` thiếu, hoặc `VITE_SUPABASE_URL` chứa `$VCUBE_PROD_REF`.
- Cài deps: có `package-lock.json` → `npm ci`; có `bun.lock` → `bun install --frozen-lockfile`; không có → dừng và báo.
- Subagent **không bao giờ** có secret key prod.

### 1.3 Môi trường thử
- W2 cần `supabase start` (Docker). Không có Docker → project staging (**dữ liệu giả**, cấm copy dữ liệu prod).
- Test RLS chỉ dùng dữ liệu giả.

### 1.4 Prod apply protocol (mọi thay đổi DB/ops)
1. SA chỉ soạn: migration mới `supabase/migrations/20261011HHMMSS_<tên>.sql` (14 chữ số → không trùng version) **và** file rollback `supabase/rollback/<cùng timestamp>_down.sql` (ngoài `migrations/`).
2. SA test trên local/staging, chạy `npm run check`.
3. **H** áp lên prod: backup bảng bị ảnh hưởng (`create table _bak_<bảng>_<ngày> as select * from …`), dán vào SQL Editor trong `begin; … commit;`, chạy post-check, ghi log vào `docs/security/rls-runbook.md` (do T10 gom).
4. **Không dùng `supabase db push` lên prod** trừ khi `supabase migration list` xác nhận lịch sử đã đồng bộ (repo hiện apply bằng SQL Editor + `apply_all_manual.sql`).
5. **FREEZE:** cấm chạy lại `apply_all_manual.sql` hoặc `20261010_harden_rls.sql` trên prod từ T0A-4 cho tới khi T23 xong (chúng có thể `grant select` lại toàn bảng và hoàn tác hotfix).
6. Ghi chú: `20261010_harden_rls.sql` mang ngày sau ngày hiện tại (2026-09-24). Migration mới đặt tên `20261011…` để luôn đứng sau nó; đổi tên file cũ là việc riêng, **không** thuộc board này.

### 1.5 Gate & baseline
- Gate = `npm run check` (T05) + `npm run lint` + `npm run build`.
- Baseline lưu ở `docs/tasks/baseline.json` (T00). `run-checks.mjs --baseline` chỉ đỏ khi **tệ hơn** baseline (RC hoặc số vi phạm tăng).

### 1.6 Commit
- Được commit cục bộ trong worktree/branch. **Cấm push, cấm tạo PR.** Rollback code = bỏ branch/worktree; rollback DB = chạy file `_down.sql`.

### 1.7 DoD cho mọi doc bị sửa
- Dòng đầu file: `<!-- doc-meta: status=active|snapshot|historical; verified=<YYYY-MM-DD>; owner=<tên> -->` (dùng HTML comment, **không** dùng YAML frontmatter để README/AGENTS không hiển thị lỗi trên GitHub).
- Thay `file:line` bằng tên symbol (trừ doc `snapshot`, giữ kèm cảnh báo).
- Không viết số liệu chép tay (đếm policy/hàm/gate/route) khi đã có nguồn sinh; chỉ ghi "chạy `npm run check`".

### Template giao task

```
TASK <ID> — <tiêu đề>
Nguyên nhân: A|B|C|D|E|F   Mức: P0|P1|P2   Effort: S|M|L   Executor: SA|H|O
Issues: <ID chính xác>
Depends on: <ID hoặc ->
OWNED (chỉ được sửa): <files>
Steps: <1..n>
Acceptance (lệnh đo được): <...>
Rollback: <cách>
```

---

## 2. Quyết định phải chốt ở W0 (T0D ghi "CHỐT <ngày>")

| ID | Quyết định | Mặc định | Task ảnh hưởng |
|---|---|---|---|
| D1 | Trình quản lý gói | **npm** (`packageManager`), xoá `bun.lock` | T00/T38 |
| D2 | SEC-07 (ma trận quyền Designer/Workshop) | **Docs theo migration** (code là sự thật); thêm policy ở W6 (T49) nếu muốn | T13 |
| D3 | Storage scheme | **CHỐT (2026-09-24): `cad/<uid\|guest_session>/<uuid>/<file>`** — T25a xác nhận không có upload nào đang active (`uploadCadFile` dead code); `orders/<order_id>/…` bất khả thi vì upload xảy ra trước khi có order; gắn `order_files` khi tạo đơn (T40) | T25/T40 |
| D4 | Pipeline custom-design (PAGE-11) | **Rút docs còn bước `quoted`**; UI đầy đủ ở W6 (T50) | T17 |
| D5 | Hàm chia doanh thu (ARCH-01/02) | **Giữ hàm; doc mô tả đúng code + "chưa nối (0 caller)"** | T48 |
| D6 | Realtime `orders` | **Có**, qua `realtime.send` private channel `orders:admin` chỉ `{id,status}` | T35-mig/T35 |
| D7 | Generator schema | **psql** vào DB local/staging (Docker) | T26 |
| D8 | SEC-01 refactor | Prod có dữ liệu ⇒ forward migration: copy → đổi code → (cổng H) → drop cột | T20 |
| D9 | i18n | **VI-only** (đã chốt) | T07a |
| D10 | Môi trường thử | `supabase start`; fallback staging | W2 |
| D11 | CHECK/enum | `NOT VALID` → audit dữ liệu → `VALIDATE` | T22b |
| D12 | Rotate key | **Inventory → tạo mới → cập nhật → thu hồi cũ** | T0C |
| D13 | `taste-contract.md` §4 dựa trên `motion` không tồn tại | **Viết lại theo CSS/Tailwind** (không thêm dependency) | T18c |
| D14 | SEC-04 (cột COGS công khai) | **Tạm chấp nhận (P2), ghi "known exposure" trong doc**; sửa ở T54 sau T45 | T22a/T54/T13 |
| D15 | Token đơn guest | Giữ định dạng `sec_<hex>`, sinh bằng CSPRNG ≥ 128 bit phía client (T34a); sinh phía server là T56 (tuỳ chọn) | T34a/T56 |

---

## 3. Bản đồ wave

| Wave | Nội dung | Tính chất | Điều kiện vào |
|---|---|---|---|
| **W0** | Baseline, triage sự cố, hotfix P0, ops, chốt quyết định | có bước **H** | — |
| **W1** | Quick win không phụ thuộc code (script, env, docs bền vững) | song song theo file | T00 |
| **W2** | RLS forward migration | **serial**, một worktree | T03, T05, T0A-4, D3/D8/D10 chốt |
| **W3** | Generator + docs số liệu DB/RLS | sau W2 | W2 |
| **W4** | Code đổi hành vi (capabilities, order history, realtime, dọn di sản) | serial theo `App.tsx`/`package.json` | W1 (T05), T0C |
| **W5** | Docs hành vi viết **một lần** | song song theo file | W3, W4 |
| **W6** | Backlog phát triển | theo task | như từng task |

> W1 và W2 chạy song song được vì OWNED không giao nhau; W2 chỉ cần T03 và T05 xong.

Thứ tự bắt buộc trong W2:
`T20.0 → T20 → T21 → T22b → T24 → T25a → T25 → T35-mig → T23`

---

## 4. W0

### T00 — Baseline + hạ tầng worktree
- B · P2 · S · SA · Depends: —
- **OWNED:** `scripts/dev/new-worktree.sh` (mới), `.env.worktree.example` (mới), `docs/tasks/baseline.json` (mới)
- **Steps:** (1) viết script theo §1.2; (2) chạy `npm run lint`, `npm run build`, mọi `scripts/check-*.mjs`, `scripts/lint-rls-*.mjs`, `scripts/a8-sql-syntax-check.mjs`, `npx tsx scripts/test-catalog-sync.ts`; (3) ghi RC + số vi phạm từng gate vào `baseline.json`.
- **Acceptance:** `scripts/dev/new-worktree.sh T00-smoke` tạo được worktree chạy `npm run build`; script thoát ≠ 0 khi `.env.worktree` chứa `$VCUBE_PROD_REF`; `baseline.json` có mọi gate.
- **Rollback:** `git worktree remove`, xoá 3 file.

### T0B — Triage sự cố SEC-01 trên **prod (chỉ đọc)** — làm ngay, song song T0A-1
- A · **P0** · S · **H** · Depends: —
- **OWNED:** `docs/security/incident-2026-09-SEC01.md` (mới; **không** ghi dữ liệu cá nhân, chỉ số đếm)
- **Steps** (SQL Editor, vai trò postgres — không cần copy secret key):
  ```sql
  -- 1. Có dữ liệu nhạy cảm thật không?
  select count(*)                                        as total,
         count(*) filter (where bank_name    is not null) as has_bank_name,
         count(*) filter (where bank_account is not null) as has_bank_account,
         count(*) filter (where tax_id       is not null) as has_tax_id
  from public.designer_profiles;

  -- 2. Ai đang được phép đọc?
  select grantee, privilege_type from information_schema.role_table_grants
   where table_schema='public' and table_name='designer_profiles'
     and grantee in ('anon','authenticated');
  select policyname, roles, cmd, qual from pg_policies
   where schemaname='public' and tablename='designer_profiles';
  ```
  3. **Cửa sổ phơi nhiễm:** `git log -S"bank_account" --oneline -- supabase/migrations` + ngày apply (runbook ghi 2026-09-12) → ngày bắt đầu; ngày kết thúc = ngày T0A-4.
  4. **Log truy cập:** Supabase Dashboard → Logs → API/Edge logs, lọc path `designer_profiles`; tìm request có `select=*` hoặc `bank_`/`tax_id`, không phải từ app của bạn. **Export ngay** (thời hạn lưu log phụ thuộc gói, có thể chỉ vài ngày).
- **Acceptance:** file sự cố có kết luận "có/không có dữ liệu thật đã ở trạng thái đọc được" + cửa sổ thời gian + kết quả log.
- **Nếu có dữ liệu thật:** thông báo designer bị ảnh hưởng, yêu cầu họ đổi thông tin nhận tiền/theo dõi giao dịch bất thường, và **xác minh nghĩa vụ thông báo theo quy định bảo vệ dữ liệu cá nhân của Việt Nam** (thường có mốc khoảng 72 giờ kể từ khi phát hiện — cần hỏi luật sư, người soạn tài liệu này không phải luật sư).

### T0A-1 — Audit query & cột nhạy cảm (chỉ đọc, không sửa file)
- A · **P0** · S · SA · Depends: —
- **OWNED:** — (báo cáo ra `/tmp/t0a1-report.md`)
- **Steps:**
  1. `grep -rnE "designer_profiles" src` → phân loại: (a) `select('*')`, (b) embed `designer:designer_profiles(*)`/`designer_profiles(*)`, (c) đọc/ghi `bank_name|bank_account|tax_id`, (d) `.update()/.upsert()/.insert()` **có** `.select()` hoặc `returning` (sẽ cần SELECT cột trả về → gãy 42501).
  2. Liệt kê view/hàm `security invoker` phụ thuộc `designer_profiles` (`select * from pg_depend …` hoặc grep migrations).
  3. Danh sách cột an toàn: đọc `20260901_baseline_schema.sql` khối `designer_profiles` (dòng 885–902), **không đoán**. Cột đã xác minh: `id, user_id, display_name, bio, portfolio_url, avatar_url, royalty_percent, verified_status, rating, total_sales, created_at, updated_at` (3 cột nhạy cảm: `bank_name, bank_account, tax_id`). Khoá chủ sở hữu là **`user_id`** (→ `auth.users`), không phải `id`.
  4. **Audit mọi bảng trong `v_catalog_read`** (SEC-01 là mẫu lỗi lặp):
     ```sql
     select table_name, column_name from information_schema.columns
      where table_schema='public'
        and table_name in (<danh sách bảng lấy từ v_catalog_read trong 20261010_harden_rls.sql>)
        and column_name ~* '(bank|tax|account|email|phone|address|cccd|cmnd|id_number|secret|token|password)'
      order by 1,2;
     ```
- **Acceptance:** báo cáo có 4 danh sách (query cần sửa + file, cột an toàn, phụ thuộc DB, cột nhạy cảm ở bảng catalog khác). Nếu phát hiện bảng khác lộ PII → báo H ngay, mở thêm T0A-x tương tự.

### T0A-2 — Sửa query `src` trước khi revoke
- A · **P0** · M · SA · Depends: T0A-1
- **OWNED:** đúng các file mà báo cáo T0A-1 mục (a)–(d) liệt kê (O xác nhận danh sách trước khi giao)
- **Steps:** đổi `select('*')`/embed `(*)` sang **liệt kê cột an toàn**; nơi cần đọc bank/tax → gọi RPC `get_my_payout_info()` / `admin_get_designer_payout(id)` (soạn ở T0A-3); bỏ `.select()` sau `.update()/.upsert()` khi không cần dữ liệu trả về (hoặc chỉ chọn cột an toàn).
- **Acceptance:** `grep -rnE "designer_profiles\(\*\)|from\('designer_profiles'\)\.select\('\*'\)" src` = 0; `npm run lint` + `npm run build` không tệ hơn baseline.
- **Rollback:** bỏ branch.

### T0A-3 — Soạn migration hotfix + rollback
- A · **P0** · M · SA · Depends: T0A-1 (song song T0A-2)
- **OWNED:** `supabase/migrations/20261011090000_sec01_designer_payout_hotfix.sql` (mới), `supabase/rollback/20261011090000_down.sql` (mới)
- **Steps:**
  ```sql
  begin;
  revoke select on public.designer_profiles from anon, authenticated;
  grant  select (<CỘT_AN_TOÀN_TỪ_T0A-1>) on public.designer_profiles to anon, authenticated;
  -- UPDATE/INSERT giữ nguyên (chưa đụng); designer vẫn ghi được bank_* trực tiếp cho tới T20.

  create or replace function public.get_my_payout_info()
  returns table(bank_name text, bank_account text, tax_id text)
  language sql stable security definer set search_path = public, pg_temp as $$
    select p.bank_name, p.bank_account, p.tax_id
    from public.designer_profiles p
    where p.user_id = (select auth.uid())
  $$;
  revoke all on function public.get_my_payout_info() from public, anon;
  grant execute on function public.get_my_payout_info() to authenticated;

  create or replace function public.admin_get_designer_payout(p_designer_id uuid)
  returns table(bank_name text, bank_account text, tax_id text)
  language plpgsql stable security definer set search_path = public, pg_temp as $$
  begin
    if public.current_app_role() <> 'admin' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return query select p.bank_name, p.bank_account, p.tax_id
                 from public.designer_profiles p where p.id = p_designer_id;
  end $$;
  revoke all on function public.admin_get_designer_payout(uuid) from public, anon;
  grant execute on function public.admin_get_designer_payout(uuid) to authenticated;
  commit;
  ```
  `_down.sql`: `grant select on public.designer_profiles to anon, authenticated;` + drop 2 hàm.
  **Chạy `node scripts/lint-rls-*.mjs` trên migration mới trước khi giao H**; nếu lint chặn `grant … to anon` → ghi ngoại lệ có lý do vào chính lint (không tắt lint).
- **Acceptance (chạy trên local/staging):**
  ```sql
  select has_column_privilege('anon','public.designer_profiles','bank_account','select');          -- false
  select has_column_privilege('authenticated','public.designer_profiles','bank_account','select'); -- false
  select has_column_privilege('anon','public.designer_profiles','<một_cột_an_toàn>','select');     -- true
  ```
  và `curl "$URL/rest/v1/designer_profiles?select=bank_account" -H "apikey: $ANON"` → lỗi quyền; `?select=<cột an toàn>` → 200.
- **Rollback:** file `_down.sql`.

### T0A-4 — Triển khai hotfix (theo thứ tự) — **người**
- A · **P0** · S · **H** · Depends: T0B, T0A-2, T0A-3
- **Steps:**
  1. Merge T0A-2 → **deploy client lên Vercel trước** (client mới không còn `select('*')`).
  2. Backup: `create table _bak_designer_profiles_20260924 as select * from public.designer_profiles;`
  3. Áp migration T0A-3 trong SQL Editor (`begin … commit`), chạy post-check của T0A-3 với `anon key` thật.
  4. Mở app: storefront, trang designer, admin, đăng ký designer → không có lỗi 42501.
  5. Bật **FREEZE** (§1.4-5).
- **Lưu ý:** người dùng đang giữ bundle JS cũ sẽ gặp lỗi thoáng qua tới khi tải lại trang — chấp nhận, hoặc thực hiện ngoài giờ cao điểm.
- **Acceptance:** anon không đọc được 3 cột; app hoạt động; incident file cập nhật "đã đóng ngày <..>".
- **Rollback:** chạy `_down.sql` (chỉ khi app hỏng nặng; lỗ hổng sẽ mở lại → ưu tiên sửa tiến).

### T0C — Ops: inventory key → tạo mới → cập nhật → thu hồi
- E · **P1** · S · **H** · Depends: —
- **OWNED:** `docs/SETUP_RUNBOOK.md` (chỉ phần env/secrets)
- **Steps:**
  1. Kiểm `SETUP_RUNBOOK.md` (dòng ≈172–201). **Đã xác minh:** các JWT ở đây là **placeholder** (`…example_publishable_key`, `…example_secret_key`, `…example_anon_key`) — không phải khoá dùng được; nhưng **project ref thật** `vcxarjwzbihvurpkcufa` đang bị nhúng → **thay bằng `<project-ref>`**.
  2. **Inventory mọi nơi dùng key:** Vercel env, Edge Function secrets, `.env` local, scripts CI, docs.
  3. Tạo key mới → cập nhật **tất cả** consumer → verify → **mới** thu hồi key cũ. (Áp dụng cho `SUPABASE_SECRET_KEY` đã lộ trong chat.)
  4. Ghi lại **tên biến Vercel đang dùng** (`VITE_*` hay `NEXT_PUBLIC_*`). Nếu đang là `NEXT_PUBLIC_*` → đặt thêm `VITE_*` **trước** T02/T39.
- **Acceptance:** không còn secret/JWT thật trong docs; có bảng "nơi dùng key" và xác nhận sau rotate; ghi rõ tên env Vercel.

### T0D — Chốt quyết định §2
- — · P1 · S · O · Depends: T00, T0A-1
- **OWNED:** `docs/tasks/DRIFT-REMEDIATION-PLAN.md`
- **Acceptance:** D1–D15 đều có dòng "CHỐT (ngày)" (D3 có thể ghi "chờ T25a").

---

## 5. W1 — Quick win (không phụ thuộc code)

### T01 — `.env.example` đủ khoá
- B · **P1** · S · SA · Issues: NEW-24, IDX-13 (dòng `.env.example`), IDX-15
- **OWNED:** `.env.example`
- **Steps:** thêm `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`, `SUPABASE_SECRET_KEY` (server-only, có cảnh báo); giữ `NEXT_PUBLIC_*` dưới nhãn *legacy alias — sẽ gỡ ở T39*; `APP_URL` nếu còn dùng; domain ví dụ ghi rõ "ví dụ".
- **Acceptance:** `grep -cE '^(VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SITE_URL|SUPABASE_SECRET_KEY)=' .env.example` = `4`; `grep -c "vcube-red.vercel.app" .env.example` = `0` hoặc dòng có nhãn "ví dụ".

### T02 — Env fail-fast **lúc build**
- B/D · **P1** · S · SA · Issues: NEW-13 · Depends: T01, **T0C**
- **OWNED:** `vite.config.ts`, `src/backend/supabase/client.ts`
- **Steps:** trong `vite.config.ts`, khi `mode==='production'` mà thiếu **cả** `VITE_SUPABASE_*` **lẫn** `NEXT_PUBLIC_SUPABASE_*` → `throw` với tên khoá thiếu + trỏ `.env.example`. Chấp nhận cả hai tên tới khi T39. Cờ `VCUBE_ALLOW_MOCK_BUILD=1` cho phép build gate/CI không có env. Dev chỉ `console.error` + fallback mock. **Không** throw runtime (tránh trang trắng) — hiện `vite.config.ts` mới chỉ cảnh báo, nên đây là thay đổi thật.
- **Acceptance:** `npm run build` không env → đỏ, thông báo nêu tên khoá; `VCUBE_ALLOW_MOCK_BUILD=1 npm run build` xanh; build với `NEXT_PUBLIC_*` cũ vẫn xanh.

### T03 — Sửa `verify-rls.mjs`
- A/B · P2 · S · SA · Issues: SEC-05
- **OWNED:** `scripts/verify-rls.mjs`
- **Steps:** destructure `status` từ `countRows` trước khi dùng trong `expectZero`; null count ⇒ `UNKNOWN` + exit 1.
- **Acceptance:** `node scripts/verify-rls.mjs` không `ReferenceError`; chạy với count null trả exit 1.

### T04 — `inspect-db.mjs`
- A/B · P2 · S · SA · Issues: SEC-06 (phần script)
- **OWNED:** `scripts/inspect-db.mjs`
- **Steps:** thêm `custom_design_requests`. **Không** sửa tay `apply_all_manual.sql` (file sinh; phần header do T24).
- **Acceptance:** danh sách `TABLES` **bằng** tập tên trong các câu `create table` của baseline (script đối chiếu, không hardcode số 31).

### T05 — `npm run check` + manifest + so baseline
- B · **P1** · S · SA · Issues: IDX-04, IDX-14, DS-05, NEW-15, NEW-30 (phần script)
- **OWNED:** `scripts/run-checks.mjs` (mới), `scripts/gate-manifest.json` (mới), `package.json` (**chủ duy nhất ở W1**)
- **Steps:** manifest liệt kê tường minh mọi gate (`a8-sql-syntax-check.mjs`, `test-catalog-sync.ts`, mọi `check-*`, mọi `lint-rls-*`) và **sẵn slot** `{"id":"doc-refs","cmd":"node scripts/check-doc-refs.mjs --warn","advisory":true,"optional":true}` (bỏ qua nếu file chưa có → hết vòng phụ thuộc với T30); `--baseline docs/tasks/baseline.json` chỉ đỏ khi tệ hơn; `--list-unregistered` in file khớp `check-*`/`lint-*` chưa có trong manifest.
- **Acceptance:** `npm run check` chạy hết manifest; `--baseline` xanh ở trạng thái hiện tại; thêm file `scripts/check-x.mjs` rỗng → `--list-unregistered` nêu tên nó.

### T06 — Comment `src` sai schema
- C · P2 · S · SA · Issues: NEW-29
- **OWNED:** `src/frontend/views/AssetLibraryView.tsx`, `src/frontend/views/MyOrdersView.tsx`
- **Steps:** hai comment hiện nói "không có bảng `order_files`" (AssetLibraryView, khối ≈ dòng 19–25) và "chưa có bảng `warranty_claims`" (MyOrdersView, ≈ dòng 88–96) — cả hai bảng **có** trong baseline. Sửa thành "bảng có, chưa nối".
- **Acceptance:** `grep -cE "không có bảng|chưa có bảng" <2 file>` = `0`; `npm run lint`, `node scripts/check-fabricated.mjs` không tệ hơn baseline.

### T07a — VI-only (P0 docs)
- F · **P0** · S · SA · Issues: DS-01
- **OWNED:** `docs/design/qa-checklist.md`
- **Steps:** xoá mọi bước "Flip to EN", mục "Both languages VI/EN", U9/i18n → ghi chú "ứng dụng chỉ có VI".
- **Acceptance:** `grep -cE "Flip to EN|Both languages|VI/EN" docs/design/qa-checklist.md` = `0`.

### T07b — Drift còn lại của `qa-checklist.md`
- B · P1 · S · SA · Issues: DS-02, DS-07, DS-08, DS-09, DS-10, DS-20, LNK-05, NEW-25 · Depends: T07a
- **OWNED:** `docs/design/qa-checklist.md`
- **Steps:** `/lab` đã routed và không còn "(planned)"; thay `App.tsx:<số>` bằng symbol; `DesignerDashboardView` có `useParams`; bỏ `AdminOrdersPanel` (đã xoá); sửa baseline "fabricates a model"/"hardcoded SHA-256" đã fix; "zero automated tests" → nêu `scripts/test-catalog-sync.ts`; `prefers-reduced-motion` **đã có** (global `@media` ở `src/index.css:507-511` + `motion-reduce:animate-none`).
- **Acceptance:** `grep -cE "AdminOrdersPanel|zero .*prefers-reduced-motion|\(planned\)" docs/design/qa-checklist.md` = `0`; `grep -cE "App\.tsx:[0-9]+" docs/design/qa-checklist.md` = `0`.

### T08 — `AGENTS.md` + `README.md`
- B/E · **P1** · S · SA · Issues: IDX-01, IDX-02, IDX-04, IDX-08, IDX-10, IDX-14, IDX-17, NEW-14, NEW-15, NEW-16 (phần `AGENTS.md:18`)
- **OWNED:** `AGENTS.md`, `README.md`
- **Steps:** bỏ đường dẫn tuyệt đối (dùng `$(git rev-parse --show-toplevel)`); bỏ `motion` khỏi stack; sửa claim tsconfig exclude cây Next và tham chiếu `src/backend/supabase/server.ts`; thêm `docs/tasks/` vào doc map; thay danh sách gate bằng "chạy `npm run check`"; thêm caveat "88 policy hiệu lực" (2 policy `pricing_config` bị bỏ); nói lockfile theo D1 (trung tính nếu D1 chưa chốt). Không dùng YAML frontmatter (marker HTML comment).
- **Acceptance:** `grep -c "/home/thanh" AGENTS.md README.md` = `0`; `grep -nE '(^|[ \x60,(])motion([ \x60,)]|$)' AGENTS.md` = rỗng; `grep -c "docs/tasks" AGENTS.md` ≥ `1`; `grep -c "server.ts" AGENTS.md` = `0`.

### T09 — `docs/README.md`
- B · **P1** · S · SA · Issues: IDX-03, IDX-04, IDX-05, IDX-07, IDX-09, IDX-14, NEW-15, LNK-01, LNK-02 · Depends: T05
- **OWNED:** `docs/README.md`
- **Steps:** `../design/*` → `./design/*`; bỏ `/workshop/settings`; route param `:productId`/`:orderId`; thêm `taste-contract.md` + `ui-audit-2026-09.md` vào §3.4; bảng gate → "chạy `npm run check`".
- **Acceptance:** `grep -c '\.\./design/' docs/README.md` = `0`; `grep -c "/workshop/settings" docs/README.md` = `0`; `grep -cE "/products/:id\b|/order-success/:id\b" docs/README.md` = `0`.

### T18a — `tokens.md` + `icon-map.md`
- B · P1/P2 · M · SA · Issues: DS-05, DS-06, DS-11, DS-12, DS-13, DS-14, DS-15, DS-16, DS-19, NEW-16 (icon-map), NEW-17, NEW-18, NEW-19, NEW-20 · Depends: T05
- **OWNED:** `docs/design/tokens.md`, `docs/design/icon-map.md`
- **Steps:** §10 gate list → `npm run check`; DS-06: sửa doc cho khớp thực tế (13 `backdrop-blur`/8 file, chưa có `prefers-contrast`/`forced-colors`) và ghi vào backlog UI (không sửa code ở đây); `.font-mono` (`src/index.css:291`) chỉ set family; thêm token `--color-surface-raised` (`src/index.css:44`), `--color-on-inverse` (`:48`); số liệu "83 lần/31 file", "~1648 rounded" → bỏ số tuyệt đối hoặc ghi "snapshot <ngày>"; `360` trùng; `strokeWidth` mặc định 2 (`Icon.tsx:42`); `text-xs` = 12px (`src/index.css:126`); câu icon-map tự mâu thuẫn (`Storefront`); bỏ link `src/app/**`, tsconfig "line 46"; ghi "rule sửa cả 2 nơi **không** được gate enforce" (DS-19).
- **Acceptance:** `grep -cE "\.\./|src/app/" docs/design/icon-map.md docs/design/tokens.md` = `0`; `grep -c "line 46" docs/design/icon-map.md` = `0`.

### T18b — `data-honesty.md` + `ui-audit-2026-09.md`
- B · P2 · M · SA · Issues: DS-04, DS-17, DS-18, DS-21, LNK-04, NEW-16, NEW-21, NEW-22
- **OWNED:** `docs/design/data-honesty.md`, `docs/design/ui-audit-2026-09.md`
- **Steps:** đánh dấu `status=snapshot` + cột trạng thái cho hàng PC-01/MP-01 đã fix; §Demo proposal/§Verification ghi rõ "đề xuất, module `demoMode.ts`/`VITE_VCUBE_DEMO_MODE` chưa tồn tại"; sửa link chết (`modelAnalysisService.ts`, `route.ts`, `InstantQuoteWidget.tsx`, `quoteVerifier.ts`, `useAdminOverviewStore.ts`, `AdminOverviewPanel.tsx`, `AdminUsersPanel.tsx`, `DesignerSettingsView.tsx`, `src/backend/supabase/admin.ts`, `docs/plans/00–07`) bằng nhãn "đã xoá/historical"; "24 overlay" → 13/8 file; `#94A3B8` ở `PersonalizeView.tsx` nay là comment.
- **Acceptance:** `node scripts/check-doc-refs.mjs --warn` (nếu đã có T30) không còn link chết trong 2 file này; nếu chưa: `grep -c "demoMode" docs/design/data-honesty.md` chỉ trong ngữ cảnh "đề xuất".

### T18c — `taste-contract.md`
- B · P1 · S · SA · Issues: DS-03, NEW-23 · Depends: D13
- **OWNED:** `docs/design/taste-contract.md`
- **Steps:** viết lại §4 theo CSS/Tailwind (không phụ thuộc `motion`); `status` chuyển đúng thực tế.
- **Acceptance:** `grep -ciE "motion.*(đã cài|installed)|import .*from .motion" docs/design/taste-contract.md` = `0`.

### T19 — Portal & docs phụ
- B · P2 · M · SA · Issues: DB-08, DB-09, IDX-11, IDX-12 (placeholder), IDX-13, IDX-14 (SETUP), IDX-15, IDX-16, NEW-15 (SETUP), NEW-16 (tasks + seeds), NEW-28 · Depends: T0C, T05
- **OWNED:** `docs/SETUP_RUNBOOK.md` (phần còn lại), `docs/archive/README.md`, `docs/tasks/README.md`, `docs/tasks/DOCS-REVIEW-BACKLOG.md`, `docs/tasks/UI-CHROME-REFACTOR-PLAN.md`, `docs/database/seeds-and-migrations.md`
- **Steps:** placeholder hoá project ref/JWT; sửa "mock fixtures" (catalog `= []`); thêm `APP_URL` vào template `.env`; bỏ số "7 SQL files" (dùng `npm run check`); banner archive thêm `docs/design/` + `docs/tasks/`; `ThemeProvider.tsx` không tồn tại; `src/data/mockData` → `mockData.ts`; thêm `default_workshop_commission_percent` vào danh sách cột NULL; đánh dấu `seedService.syncFromSupabase()` **unwired** (0 call site); ghi `isVi ?` ≈ 1186.
- **Acceptance:** `grep -cE "eyJ[A-Za-z0-9_-]{20,}" docs/SETUP_RUNBOOK.md` = `0`; `grep -c "syncFromSupabase" docs/database/seeds-and-migrations.md` ≥ `1` kèm nhãn "unwired"; `grep -c "docs/design" docs/archive/README.md` ≥ `1`.

### T22a — Audit cột COGS (chỉ đọc)
- A · P2 · S · SA · Issues: SEC-04 (phần audit)
- **OWNED:** — (báo cáo `/tmp/t22a-report.md`)
- **Steps:** grep `cost_per_kg|acquisition_cost|hourly_cost|cost_price|price_per_kg` trong `src`; phân loại **cần cho guest tính giá** (client `pricingEngine.ts`, `printEstimate.ts`) và **chỉ admin**.
- **Acceptance:** báo cáo là đầu vào cho T54; không sửa code.

### T30 — Checker tham chiếu docs (advisory)
- B · P2 · M · SA · Issues: LNK-*, NEW-16, IDX-14 · Depends: T05
- **OWNED:** `scripts/check-doc-refs.mjs` (mới), `docs/tasks/coverage.json` (mới, khởi tạo từ **Phụ lục A**)
- **Steps:** mặc định `--warn` (không đỏ): (a) link markdown chết; (b) path `src/…`/`scripts/…`/`docs/…` được nhắc mà không tồn tại; **bỏ qua doc `status=snapshot|historical` trừ `--strict`**; (c) `--coverage`: rút ID từ `DOCS-ISSUES.md` bằng hai mẫu `^\| (SEC|DB|PAGE|ARCH|IDX|LNK|DS)-[0-9]+ \|` (bảng §1) và `^- \*\*NEW-[0-9]+` (§2), đối chiếu `coverage.json`; ID chưa có chủ ⇒ báo. Không tự sửa.
- **Acceptance:** `node scripts/check-doc-refs.mjs --coverage` in `129 ID cần chủ, 0 chưa có chủ` (3 ID CLOSED không tính).

---

## 6. W2 — RLS (serial, forward migration)

> Một worktree/branch. Migration mới đặt `supabase/migrations/20261011HHMMSS_*.sql` (timestamp tăng dần) + `supabase/rollback/*_down.sql`. **Không** sửa `20260901`/`20261010` trừ chỗ ghi rõ.

### T20.0 — Test trước khi sửa
- A · P1 · M · SA · Issues: SEC-01, SEC-02, SEC-05 · Depends: T03, T0A-4, D10
- **OWNED:** `scripts/verify-rls.mjs` hoặc `supabase/tests/*.sql` (chọn một; ghi vào báo cáo)
- **Steps:** dữ liệu **giả**. Viết:
  - **Xanh ngay (regression SEC-01):** anon/authenticated **không** đọc được `bank_name/bank_account/tax_id`; `select=*` trên `designer_profiles` bị từ chối.
  - **Đỏ (mục tiêu T20):** `designer_profiles` **không còn cột** `bank_*`; `designer_payout_info` chặn anon và user không phải chủ.
  - **Đỏ (mục tiêu T21):** authenticated không phải designer được giao **không** đọc được `client_name`/`messages`/`reference_files` của `custom_design_requests` chưa nhận.
- **Acceptance:** mỗi test có nhãn `EXPECT-GREEN`/`EXPECT-RED` và kết quả chạy đúng nhãn.

### T20 — SEC-01: tách `designer_payout_info` (defense-in-depth)
- A · **P1** · M · SA (+ **cổng H**) · Issues: SEC-01 · Depends: T20.0, D8
- **OWNED:** migration `…_sec01_payout_table.sql` (+ `_down`), các file `src` đang đọc/ghi 3 cột bank (danh sách từ T0A-1 mục (c)), `20261010_harden_rls.sql` (chỉ gỡ khỏi allowlist nếu còn tham chiếu)
- **Steps:** (1) tạo `designer_payout_info(designer_id pk → designer_profiles, bank_name, bank_account, tax_id)` + RLS owner/admin; copy dữ liệu; trỏ lại 2 RPC của T0A-3 vào bảng mới; sửa code ghi/đọc; deploy; **(2) cổng H:** xác nhận không còn tham chiếu → migration sau `alter table … drop column bank_name, bank_account, tax_id`.
- **Acceptance:** test `EXPECT-RED` của SEC-01 chuyển xanh; `npm run check` không tệ hơn baseline.
- **Rollback:** `_down.sql` copy ngược + re-grant.

### T21 — SEC-02: view + RPC nhận việc
- A · **P1** · M · SA · Issues: SEC-02 · Depends: T20
- **OWNED:** migration `…_sec02_open_requests.sql` (+ `_down`), `customDesignService.ts`, `DesignerRequestsTab.tsx` (basename; §1.1-5)
- **Steps:** view `open_design_requests` chỉ có cột không nhạy cảm; RPC `claim_design_request(id)` `security definer` (`update … where id=p_id and designer_id is null returning`, dựa `auth.uid()`); bỏ nhánh `designer_id is null` khỏi policy; đổi service/tab dùng view + RPC. **Lưu ý:** view không hỗ trợ `postgres_changes` → kênh `public:custom_design_requests` không còn cấp cập nhật "pool chưa nhận" cho designer; dùng polling ngắn hoặc nhận thông báo qua `realtime.send` (ghi vào báo cáo, không tự mở rộng phạm vi).
- **Acceptance:** test `EXPECT-RED` của SEC-02 chuyển xanh; hai designer gọi `claim_design_request` cùng lúc → đúng một thành công.

### T22b — CHECK/enum (D11)
- A · P2 · M · SA · Issues: DB-03, DB-04, NEW-02 · Depends: T21
- **OWNED:** migration `…_check_constraints.sql` (+ `_down`)
- **Steps:** audit tập giá trị thật **trước** (`select distinct payment_status, count(*) from public.orders group by 1`, tương tự `kyc_records.status`, `orders.status`, `status_stage_index`) và đối chiếu `types/index.ts`; tập cho phép = **hợp** của dữ liệu và code (`awaiting_payment|paid|cod|cancelled|unpaid` + giá trị đã có); `alter table … add constraint … check (…) not valid;` → dọn → `validate constraint`.
- **Acceptance:** ràng buộc có `convalidated = true` trên local; giá trị lạ bị từ chối; báo cáo liệt kê chênh lệch code↔DB cho T11.

### T24 — SEC-03 + SEC-06: bootstrap không hardcode + generator
- A · **P1** · S · SA · Issues: SEC-03, SEC-06 (header) · Depends: T22b
- **OWNED:** `supabase/scripts/bootstrap_admin.sql`, `scripts/gen-apply-all.mjs`, `scripts/lint-rls-sources.mjs`, `supabase/scripts/apply_all_manual.sql` (chỉ regenerate)
- **Steps:** dùng khối chạy được trong SQL Editor:
  ```sql
  do $$
  declare v_email text := 'CHANGE_ME@example.com';
  begin
    if v_email = 'CHANGE_ME@example.com' then
      raise exception 'Sửa v_email trước khi chạy';
    end if;
    -- ... logic promote admin hiện có ...
  end $$;
  ```
  Generator giữ placeholder, đếm bảng/view **từ nguồn** để viết header; kiểm tra generator **có gom** các migration `20261011…` (nếu không → sửa); `lint-rls-sources.mjs` quét thêm `supabase/scripts/`; regenerate.
- **Acceptance:** `grep -c "chithanhso10" supabase/scripts/*.sql` = `0`; `node scripts/lint-rls-sources.mjs` xanh; `grep -c "20261011" supabase/scripts/apply_all_manual.sql` ≥ số migration mới.

### T25a — Kiểm thời điểm upload (chốt D3)
- A · P2 · S · SA · Issues: SEC-10, NEW-03 · Depends: T24
- **OWNED:** — (báo cáo)
- **Steps:** xác minh `src/backend/supabase/database.ts` upload (≈ dòng 288, `cad/${fileName}`) diễn ra **trước hay sau** khi có order (giỏ/báo giá?), và liệt kê object cũ dưới `cad/`.
- **Acceptance:** kết luận để H chốt D3.

### T25 — Storage scheme + policy (D3)
- A · P2 · S · SA · Issues: SEC-10, NEW-03 · Depends: T25a, D3
- **OWNED:** `src/backend/supabase/database.ts`, migration `…_storage_scheme.sql` (+ `_down`)
- **Steps:** nếu upload xảy ra trước order → `cad/<uid|guest_session>/<uuid>/<file>`, gắn `order_files` khi tạo đơn (khớp T40); policy theo prefix; object cũ dưới `cad/`: policy đọc tạm hoặc migrate.
- **Acceptance:** test storage xanh (owner đọc được, người khác không).

### T35-mig — Realtime `orders` qua `realtime.send` (D6)
- A · P2 · S · SA · Issues: ARCH-03 · Depends: T25
- **OWNED:** migration `…_orders_broadcast.sql` (+ `_down`)
- **Steps:** xác minh hàm có sẵn: `select proname from pg_proc where pronamespace='realtime'::regnamespace and proname='send';`. Sau đó:
  ```sql
  create or replace function public.orders_broadcast_status() returns trigger
  language plpgsql security definer set search_path = public, realtime, pg_temp as $$
  begin
    if tg_op = 'INSERT' or new.status is distinct from old.status then
      perform realtime.send(jsonb_build_object('id', new.id, 'status', new.status),
                            'order_status', 'orders:admin', true);
    end if;
    return new;
  end $$;
  create trigger trg_orders_broadcast after insert or update of status on public.orders
    for each row execute function public.orders_broadcast_status();

  create policy orders_admin_realtime on realtime.messages for select to authenticated
    using (realtime.topic() = 'orders:admin' and public.current_app_role() = 'admin');
  ```
  Payload chỉ `{id,status}` — **không** dùng `realtime.broadcast_changes` (nó gửi cả `new`/`old`).
- **Acceptance:** admin đăng ký `channel('orders:admin',{config:{private:true}})` nhận sự kiện; user thường **không** nhận; payload không chứa `secure_access_token`.

### T23 — Green test + lint guard chống hồi quy
- A · **P1** · M · SA · Issues: SEC-05 · Depends: T35-mig
- **OWNED:** `scripts/verify-rls.mjs`; file `scripts/lint-rls-*.mjs` hiện có dùng để quét migration (tra bằng `ls scripts/lint-rls-*.mjs`, ghi tên vào báo cáo)
- **Steps:** mọi test `EXPECT-RED` → xanh; thêm lint: fail nếu migration có `grant select on public.designer_profiles` (không có danh sách cột) hoặc `grant select … to anon` trên bảng có cột trong danh sách nhạy cảm (đọc từ 1 file cấu hình); không false-pass khi count null.
- **Acceptance:** cố ý thêm dòng `grant select on public.designer_profiles to anon;` vào migration thử → lint đỏ; bỏ dòng → xanh. Sau đó O gỡ **FREEZE** (§1.4-5).

---

## 7. W3 — Generator + docs số liệu (sau W2)

### T11 — `schema-notes.md` (chạy trước T26)
- B · P2 · S · SA · Issues: DB-01, DB-03, DB-04, DB-10, NEW-02 · Depends: W2
- **OWNED:** `docs/database/schema-notes.md` (mới)
- **Steps:** chuyển phần văn xuôi/ngữ nghĩa từ `schema.md` cũ sang đây: `total_spent/total_orders` bị chặn bằng `42501` (không "silently reset"); `payment_status` lệch 3 chiều với `types/index.ts` và CHECK mới (T22b); `kyc_records.status`; `orders.status`/`status_stage_index`; ERD là *logical, not FK* (`workshop_partners→orders`, `app_settings→setting_audit`, 4 cột không phải FK).
- **Acceptance:** `grep -c "42501" docs/database/schema-notes.md` ≥ `1`; `grep -c "silently" docs/database/schema-notes.md` = `0`.

### T26 — Generator schema → **chính `docs/database/schema.md`**
- B · **P1** · L · SA · Issues: DB-05, DB-06, DB-07, ARCH-09/10/11 (số liệu) · Depends: T11, D7
- **OWNED:** `scripts/gen-schema-doc.mjs` (mới), `docs/database/schema.md`
- **Steps:** `psql "$DATABASE_URL" -At -F'|'` từ DB local; truy vấn `information_schema` + `pg_policies` + `pg_indexes` + `pg_proc` (có **language**) + `pg_trigger` + CHECK; mọi truy vấn `ORDER BY` cố định; header `AUTO-GENERATED — đừng sửa tay — migrations-hash: <sha256 các file migration đã sort>` (**không có ngày**); trỏ tới `schema-notes.md`.
- **Acceptance:** chạy 2 lần → `diff` rỗng; số policy trong file = `select count(*) from pg_policies where schemaname='public'`; `grep -c "plpgsql" docs/database/schema.md` chỉ ở hàm thật sự `plpgsql`.

### T27 — Generator routes
- B · P2 · M · SA · Issues: IDX-05, IDX-07, DS-02, NEW-04
- **OWNED:** `scripts/gen-routes-doc.mjs` (mới), `docs/pages/_routes.generated.md`
- **Steps:** parse `<Route path=… element=…>` + redirect + guard từ `App.tsx`; in số route không parse được; **thoát ≠ 0 nếu parse ra 0 route**.
- **Acceptance:** chạy 2 lần → diff rỗng; bảng có `/products/:productId`, không có `/workshop/settings`.

### T10 — `rls-runbook.md`
- B/D · **P1** · S · SA · Issues: DB-11, DB-12, DB-13 · Depends: W2
- **OWNED:** `docs/security/rls-runbook.md`
- **Steps:** client hiện tại đọc role từ DB (không `user_metadata`, không tạo user Google giả); đánh dấu probe lịch sử bằng ngày; bỏ `file:line`; đường dẫn `wsl --cd` đúng; gom log apply prod của §1.4-3 và link `incident-2026-09-SEC01.md`.
- **Acceptance:** `grep -cE "user_metadata|chưa có schema|chưa chạy Postgres" docs/security/rls-runbook.md` = `0` (hoặc trong khối có nhãn "lịch sử").

### T13 — `rls-policies.md`
- A/B · **P1** · M · SA · Issues: SEC-07, SEC-08, SEC-09, SEC-10, NEW-01, NEW-03, SEC-04 (ghi known exposure) · Depends: W2, D2, D14
- **OWNED:** `docs/security/rls-policies.md`
- **Steps:** ma trận Designer/Workshop theo migration thật; `cad-files` scoped bucket; `setting_audit` chỉ SELECT+INSERT; `pricing_configs USING (true)`; `current_app_role()` là `language sql` không handler; scheme storage theo D3; mục "Known exposure: cột COGS công khai (D14)".
- **Acceptance:** `grep -cE "Admin full control across all buckets|plpgsql.*current_app_role" docs/security/rls-policies.md` = `0`.

### T28 — Script freshness checker
- B · P2 · S · SA · Issues: DS-04, DS-18, DS-21
- **OWNED:** `scripts/check-doc-freshness.mjs` (mới)
- **Steps:** đọc marker `doc-meta`; cảnh báo doc `active` có `verified` quá 60 ngày; doc thiếu marker → cảnh báo (advisory, đăng ký vào manifest bởi O sau merge — T05 đã sở hữu manifest ở W1, nên đây là thay đổi tuần tự của O).
- **Acceptance:** chạy trên repo in danh sách doc thiếu marker; exit 0 (advisory).

---

## 8. W4 — Code đổi hành vi

### T32a — `src/config/capabilities.ts` + `<ComingSoon />`
- D · **P1** · S · SA · Issues: PAGE-05, PAGE-09, PAGE-12, PAGE-13, PAGE-14, NEW-08 (nền tảng)
- **OWNED:** `src/config/capabilities.ts` (mới), `src/frontend/ui/ComingSoon.tsx` (mới — UI primitives nằm ở `src/frontend/ui/`, đã xác minh; export qua `src/frontend/ui/index.ts`)
- **Steps:** `export const CAPABILITIES = { dispatcher:false, carrierTracking:false, autoMeshScan:false, payouts:false, … } as const`; type an toàn; mặc định `false` cho mọi thứ chưa có backend thật; `<ComingSoon feature="…" />`.
- **Acceptance:** `npm run lint`, `npm run build` không tệ hơn baseline; mọi key có chú thích lý do.

### T32b — Designer UI trung thực
- D · **P1** · M · SA · Issues: PAGE-05, PAGE-12, PAGE-19, NEW-08 · Depends: T32a
- **OWNED:** `DesignerPayoutsTab.tsx`, `DesignerUploadWizardTab.tsx` (basename; `src/frontend/components/designer/`)
- **Steps:** Payout History khi `!payouts` hiển thị `ComingSoon` thay vì bảng luôn rỗng (`PAYOUT_TRANSACTIONS` mặc định `[]`); bỏ chữ "tự động quét lưới/kiểm tra kín nước" (≈ dòng 189–191) và hardcode `PETG/Nylon-CF` (≈ dòng 278–280) khi `!autoMeshScan`; royalty note cho digital hiển thị đúng (PAGE-19).
- **Acceptance:** `grep -ciE "tự động quét lưới|kín nước|Nylon-CF" DesignerUploadWizardTab.tsx` = `0`.

### T32c — Admin UI trung thực
- D · P2 · M · SA · Issues: PAGE-09, PAGE-13 · Depends: T32a
- **OWNED:** `Group1WorkshopsPanel.tsx`, `Group5ProductionPanel.tsx` (basename; `src/frontend/components/admin/groups/`)
- **Steps:** dispatcher khi `!dispatcher` ghi rõ "chưa có workshop để gán" (hiện `INITIAL_WORKSHOP_NODES = []`); KPI `—` có nhãn "chưa có dữ liệu" (hiện là chủ ý cho trường nullable — giữ, chỉ thêm nhãn); thêm material ghi rõ "chỉ lưu tạm trong phiên" hoặc ẩn khi chưa persist. Đồng thời sửa comment sai ở `Group5ProductionPanel.tsx` (≈ dòng 775) nói "chưa có đường ghi `orders.assigned_workshop_id`" — thực tế `dbService.saveOrder` **có** nhận `assignedWorkshopId`.
- **Acceptance:** không còn nút tạo hiệu ứng "đã lưu" khi chỉ đổi state cục bộ.

### T34a — Đơn hàng: dịch vụ + token
- C/D · **P1** · M · SA · Issues: PAGE-04, PAGE-18 · Depends: —, D15
- **OWNED:** `src/backend/services/orderService.ts`, `CheckoutView.tsx` (nơi mint `sec_`, **dòng 155**), `src/backend/supabase/database.ts` (chỉ phần fallback `token_`, **dòng 328**)
- **Steps:** thêm hàm tải lịch sử đơn cho **mọi** user đăng nhập (không chỉ admin; hiện `App.tsx:912` chặn `role !== 'admin'`); token đơn = `sec_` + hex từ `crypto.getRandomValues(new Uint8Array(16+))` (≥ 128 bit), bỏ `Math.random`/`Date.now` (`CheckoutView.tsx:155` đang dùng cả hai) và fallback `token_` ở `database.ts:328`; hàm lấy đơn theo token dùng RPC `get_order_by_guest_token` sẵn có.
- **Acceptance:** `grep -cE "Math\.random" CheckoutView.tsx database.ts` không còn ở đường sinh token; test đơn vị/`node -e` sinh 1000 token không trùng.

### T34b — Đơn hàng: view
- C/D · **P1** · M · SA · Issues: PAGE-04, PAGE-18 · Depends: T34a
- **OWNED:** `MyOrdersView.tsx`, `OrderTrackingView.tsx`, `OrderSuccessView.tsx`
- **Steps:** `/order-success/:orderId` và `/tracking/:orderId` **bắt buộc** `?t=<token>` (orderId chỉ để hiển thị; quyền truy cập do token); sau khi tải xong `history.replaceState` xoá `t` khỏi URL; khi thiếu/sai token → màn "không tìm thấy" (không lộ tồn tại đơn); MyOrders hiển thị lịch sử thật cho user đăng nhập.
- **Acceptance:** mở `/tracking/<id đơn của người khác>` không có/khác token → không thấy dữ liệu; reload trang thành công giữ đơn (còn token) hoặc yêu cầu đăng nhập.

### T34c — Đơn hàng: route + header
- C/D · **P1** · S · SA · Issues: PAGE-04, PAGE-18 · Depends: T34b
- **OWNED:** `src/App.tsx`, `vercel.json` (đã tồn tại), `index.html`
- **Steps:** nối hàm mới của T34a vào App; header `Referrer-Policy: no-referrer` cho `/order-success/*`, `/tracking/*` (hiện **chưa có** trong `vercel.json`/`index.html`; fallback `<meta name="referrer" content="no-referrer">`) để token không rò qua Referer.
- **Acceptance:** `curl -sI <url>/tracking/x | grep -i referrer-policy` = `no-referrer` (hoặc meta có trong `index.html`); `npm run build` xanh.

### T32d — Carrier tracking trung thực
- D · P2 · S · SA · Issues: PAGE-14 · Depends: T34b, T32a
- **OWNED:** `OrderTrackingView.tsx` (chỉ sau T34b)
- **Steps:** khối "carrier integration" ẩn/`ComingSoon` khi `!carrierTracking`.

### T33 — Mở rộng `check-fabricated.mjs` theo capability
- D · P2 · M · SA · Issues: PAGE-12, PAGE-14, NEW-08 · Depends: T32b, T32c, T32d
- **OWNED:** `scripts/check-fabricated.mjs`
- **Steps:** chuỗi marketing chứa "tự động"/"real-time"/"carrier" phải nằm dưới điều kiện capability đang bật; **bắt đầu ở mức cảnh báo** để tránh false-positive làm đỏ gate.
- **Acceptance:** không tệ hơn baseline; thêm chuỗi vi phạm thử → cảnh báo.

### T35 — Realtime `orders` trong app
- D · P2 · M · SA · Issues: ARCH-03 · Depends: T35-mig, T34c
- **OWNED:** `src/App.tsx`
- **Steps:** admin đăng ký `supabase.channel('orders:admin',{config:{private:true}}).on('broadcast',{event:'order_status'},…)`; gọi `supabase.realtime.setAuth()` sau đăng nhập; cập nhật trạng thái trong danh sách; huỷ đăng ký khi đăng xuất.
- **Acceptance:** đổi trạng thái 1 đơn ở tab khác → admin thấy cập nhật không cần reload; user thường không có kênh.

### T38 — Lockfile + `packageManager` (D1)
- E · P2 · S · SA · Issues: NEW-26, NEW-27 · Depends: D1
- **OWNED:** `package.json`, `package-lock.json`, `bun.lock`
- **Steps:** thêm `"packageManager"`; xoá `bun.lock` nếu D1=npm; xoá `vite` trùng ở `dependencies` (đã xác minh `vite` khai ở **cả** `dependencies` và `devDependencies`); `npm install` cập nhật lock.
- **Acceptance:** `node -e "const p=require('./package.json');process.exit(p.dependencies?.vite&&p.devDependencies?.vite?1:0)"` = 0; `grep -c "motion" package-lock.json` = `0` (nếu lock có).

### T39 — Gỡ `NEXT_PUBLIC_*` + cây Next
- E · P2 · M · SA · Issues: NEW-13, IDX-08 · Depends: T38, **T0C**
- **OWNED:** `vite.config.ts`, `src/backend/supabase/client.ts`, `tsconfig.json`, `.env.example`
- **Steps:** chỉ tiến hành khi H xác nhận Vercel đã dùng `VITE_*`; `vite.config.ts` đọc thẳng `env.VITE_*` (bỏ nhánh `|| env.NEXT_PUBLIC_*` ở dòng 16–18); `client.ts` đọc `import.meta.env.VITE_*`; tsconfig bỏ exclude cây Next (nếu có); `.env.example` bỏ phần legacy alias.
- **Acceptance:** `grep -rc "NEXT_PUBLIC" vite.config.ts src/backend/supabase/client.ts .env.example` = `0`; `npm run build` xanh với env chỉ có `VITE_*`.

---

## 9. W5 — Docs hành vi (viết một lần, sau W3 + W4)

> Mỗi task 1 file. Mọi doc theo §1.7.

### T31 — Ma trận trạng thái tính năng
- C · **P1** · M · SA · Issues: PAGE-01, PAGE-02, PAGE-03, DB-09 · Depends: W3, T34c
- **OWNED:** `docs/architecture/feature-status.md` (mới)
- **Steps:** bảng Schema | Service | UI | Prod-ready cho `order_items`, `warranty_claims`, `order_files`, `reviews`, `digital_assets`, `cart_items`, `/orders`, payouts; Schema đọc từ `schema.md` (sinh), Service/UI từ grep `from('<bảng>')` trong `src`. Sau mỗi task W6, **O** cập nhật dòng tương ứng.
- **Acceptance:** mỗi dòng đủ 4 cột; không còn câu "không có bảng X" ở bất kỳ docs nào (`grep -rnE "no \`?(order_items|warranty_claims|order_files)\`? table" docs` = 0).

### T14 — `docs/pages/storefront.md`
- C/D · P2 · S · SA · Issues: NEW-04, NEW-05, PAGE-15 · Depends: T31
- **Acceptance:** `grep -c "/products/:id\b" docs/pages/storefront.md` = `0`; nêu tab Reviews render vô điều kiện, nội dung gated.

### T15 — `docs/pages/customer-checkout.md`
- C/D · **P1** · M · SA · Issues: PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-14, PAGE-15, PAGE-18 · Depends: T31, T34c, T32d
- **Steps:** dùng ma trận T31; mô tả `/tracking` & `/order-success` theo token (T34); carrier tuỳ capability.

### T16 — `docs/pages/admin-portal.md`
- C/D · P2 · S · SA · Issues: PAGE-07, PAGE-08, PAGE-09, PAGE-10, PAGE-13, PAGE-16, PAGE-17, NEW-06, NEW-07 · Depends: T31, T32c
- **Steps:** LTV/`total_spent`/`total_orders` có; cột payout có trên `orders`/`order_items` (thiếu bảng request); write path `assigned_workshop_id` tồn tại (thiếu caller UI); hai định nghĩa "8 nấc" (`KANBAN_STAGES` vs `MES_PIPELINE_STAGES`); 3 bộ từ vựng status sản phẩm; không có control "pricing overrides".

### T17 — `docs/pages/designer-workshop-portals.md`
- C/D · P2 · S · SA · Issues: PAGE-05, PAGE-06, PAGE-11, PAGE-12, PAGE-16, PAGE-19, NEW-08 · Depends: T31, T32b, D4
- **Steps:** pipeline chỉ ghi `quoted` (D4), `updateStatus` 0 caller; brief chỉ submit material; Payout History theo capability.

### T47 — `docs/architecture/system-overview.md`
- B/D · **P1** · M · SA · Issues: ARCH-04, ARCH-09, ARCH-10, ARCH-11, ARCH-13, ARCH-14, ARCH-15, ARCH-16, NEW-09, NEW-11, NEW-12, NEW-13, NEW-14, NEW-30 · Depends: T26, T35, T39
- **Steps:** realtime: `products`, `custom_design_requests`, và `orders` qua broadcast private (D6); trigger hardening + trigger broadcast (con số lấy từ `schema.md` sinh); caveat 88 policy; "Shared Buffers" là main↔worker; `cad-files` private scoped; thêm `unhandledrejection` (`src/main.tsx:28`); RPC guest token + idempotency `payment_transactions`; locale VI-only; client đọc `VITE_*` (theo T39); thêm mapper `rowToOrderForSync`, `rowToCustomDesignRequest`; gate list → `npm run check`; bỏ claim tsconfig Next.
- **Acceptance:** `grep -cE "\(.vi. \| .en.\)|NEXT_PUBLIC|exclude.*src/app" docs/architecture/system-overview.md` = `0`.

### T48 — `pricing-engine.md` + `3d-cad-pipeline.md`
- B/D · **P1** · M · SA · Issues: ARCH-01, ARCH-02, ARCH-05, ARCH-06, ARCH-07, ARCH-08, ARCH-12, NEW-10 · Depends: D5
- **OWNED:** `docs/architecture/pricing-engine.md`, `docs/architecture/3d-cad-pipeline.md`
- **Steps:** §3.5 mô tả đúng `compute3SidedOrderFinancialSplit` (`src/utils/pricingEngine.ts:974`, platform là phần dư, digital 90% gross, workshop = cost + 80% rush + 100% personalization) + "chưa nối (0 caller)"; sửa diagram royalty; thống nhất basis fee (`RawSellingPrice` vs `FinalSellingPriceRounded`); nêu constants hardcode (`0.22/0.78`, `V×3.8`, `(extruders-1)*85`, thin-wall 0.8, timeout 30s); density/power ghi "minh hoạ, catalog rỗng"; doc `generateDeliveryPackages`, `comparePrintersForModel`, `calculateManualInkiriEstimate`; CTA `CadQuickViewModal` đúng chữ hiện có.

### T55 — Link file sinh ra vào README/AGENTS
- B · P2 · S · SA · Depends: T26, T27, T31, T11, T30
- **OWNED:** `docs/README.md`, `AGENTS.md`
- **Steps:** thêm link `docs/database/schema.md` (sinh), `schema-notes.md`, `docs/pages/_routes.generated.md`, `docs/architecture/feature-status.md`, `docs/tasks/coverage.json`.
- **Acceptance:** `node scripts/check-doc-refs.mjs --warn` không báo link chết mới.

---

## 10. W6 — Backlog phát triển

| Task | Nội dung | Effort | Executor | Depends |
|---|---|---|---|---|
| T40 | Writer `order_files` → mở khoá tải CAD bằng signed URL (theo scheme T25) | M | SA | W2 |
| T41 | Payout ledger + API quyết toán (kèm bảng request payout) | M | SA | W2, T20 |
| T42 | Persist `warranty_claims` | M | SA | W2 |
| T43 | Writer/reader `reviews` gắn đơn hoàn tất | M | SA | T34c |
| T44 | Seed dữ liệu thật qua `scripts/seed-sample-data.mjs` | M | SA | W2 |
| T45 | Nối Edge Fn `calculate-quote` với client (cần deploy + secret; **H** khai env) | M | SA+H | — |
| T46 | UI-chrome backlog (DataTable Tier-3, tách hook `App.tsx`, thêm `prefers-contrast` fallback cho glass) | L | SA | **T35** (cùng `App.tsx`) |
| T49 | (Tuỳ chọn) Thêm policy Designer/Workshop cho orders/order_files nếu D2 đổi | M | SA | W2 |
| T50 | (Tuỳ chọn) UI chuyển trạng thái custom-design đầy đủ nếu D4 đổi | M | SA | W2 |
| T51 | Code cho `order_items`, `cart_items`, `digital_assets` (bảng/policy có, 0 truy vấn) | L | SA | W2 |
| T52 | Google OAuth + password reset (bật cờ `AuthModal.tsx:14,22`) | M | SA+H | W2 |
| T53 | UI dispatcher gán `assigned_workshop_id` (write path đã có) | M | SA | T32c, T44 |
| T54 | SEC-04: tách cột COGS/tồn kho khỏi `v_catalog_read` (view an toàn hoặc `*_private`) | M | SA | **T45**, T22a, D14 |
| T56 | (Tuỳ chọn) Sinh token đơn phía server (default DB) thay client | M | SA | T34c |

**Ngoài phạm vi board (không dispatch):** Growth A2–A8/D1–D5, formula builder, payment PSP, MES telemetry — chưa có code, cần thiết kế riêng.

Sau mỗi task W6: **O** cập nhật dòng tương ứng trong `feature-status.md` và `DOCS-ISSUES.md`.

---

## 11. Chỉ mục task & khoá ownership

| ID | Wave | Executor | OWNED chính | Depends |
|---|---|---|---|---|
| T00 | W0 | SA | `scripts/dev/new-worktree.sh`, `baseline.json` | — |
| T0B | W0 | H | `incident-2026-09-SEC01.md` | — |
| T0A-1 | W0 | SA | — | — |
| T0A-2 | W0 | SA | file `src` từ T0A-1 | T0A-1 |
| T0A-3 | W0 | SA | migration + rollback `20261011090000` | T0A-1 |
| T0A-4 | W0 | H | — (prod) | T0B, T0A-2, T0A-3 |
| T0C | W0 | H | `SETUP_RUNBOOK.md` (env) | — |
| T0D | W0 | O | `DRIFT-REMEDIATION-PLAN.md` | T00, T0A-1 |
| T01 | W1 | SA | `.env.example` | — |
| T02 | W1 | SA | `vite.config.ts`, `client.ts` | T01, T0C |
| T03 | W1 | SA | `verify-rls.mjs` | — |
| T04 | W1 | SA | `inspect-db.mjs` | — |
| T05 | W1 | SA | `run-checks.mjs`, `gate-manifest.json`, `package.json` | T00 |
| T06 | W1 | SA | `AssetLibraryView`, `MyOrdersView` | — |
| T07a | W1 | SA | `qa-checklist.md` | — |
| T07b | W1 | SA | `qa-checklist.md` | T07a |
| T08 | W1 | SA | `AGENTS.md`, `README.md` | — |
| T09 | W1 | SA | `docs/README.md` | T05 |
| T18a | W1 | SA | `tokens.md`, `icon-map.md` | T05 |
| T18b | W1 | SA | `data-honesty.md`, `ui-audit-2026-09.md` | — |
| T18c | W1 | SA | `taste-contract.md` | D13 |
| T19 | W1 | SA | SETUP, archive/tasks README, backlog, UI-CHROME plan, seeds doc | T0C, T05 |
| T22a | W1 | SA | — | — |
| T30 | W1 | SA | `check-doc-refs.mjs`, `coverage.json` | T05 |
| T20.0 | W2 | SA | `verify-rls.mjs` / `supabase/tests` | T03, T0A-4 |
| T20 | W2 | SA+H | migration + `src` bank | T20.0 |
| T21 | W2 | SA | migration + `customDesignService`, `DesignerRequestsTab` | T20 |
| T22b | W2 | SA | migration | T21 |
| T24 | W2 | SA | `bootstrap_admin.sql`, `gen-apply-all.mjs`, `lint-rls-sources.mjs` | T22b |
| T25a | W2 | SA | — | T24 |
| T25 | W2 | SA | `database.ts`, migration | T25a, D3 |
| T35-mig | W2 | SA | migration | T25 |
| T23 | W2 | SA | `verify-rls.mjs`, lint-rls migration | T35-mig |
| T11 | W3 | SA | `schema-notes.md` | W2 |
| T26 | W3 | SA | `gen-schema-doc.mjs`, `schema.md` | T11 |
| T27 | W3 | SA | `gen-routes-doc.mjs`, `_routes.generated.md` | — |
| T10 | W3 | SA | `rls-runbook.md` | W2 |
| T13 | W3 | SA | `rls-policies.md` | W2, D2, D14 |
| T28 | W3 | SA | `check-doc-freshness.mjs` | — |
| T32a | W4 | SA | `capabilities.ts`, `ui/ComingSoon.tsx` | — |
| T32b | W4 | SA | `DesignerPayoutsTab`, `DesignerUploadWizardTab` | T32a |
| T32c | W4 | SA | `Group1WorkshopsPanel`, `Group5ProductionPanel` | T32a |
| T34a | W4 | SA | `orderService.ts`, `CheckoutView.tsx`, `database.ts` (token) | D15 |
| T34b | W4 | SA | `MyOrdersView`, `OrderTrackingView`, `OrderSuccessView` | T34a |
| T34c | W4 | SA | `App.tsx`, `vercel.json`, `index.html` | T34b |
| T32d | W4 | SA | `OrderTrackingView.tsx` | T34b, T32a |
| T33 | W4 | SA | `check-fabricated.mjs` | T32b–d |
| T35 | W4 | SA | `App.tsx` | T35-mig, T34c |
| T38 | W4 | SA | `package.json`, lockfiles | D1 |
| T39 | W4 | SA | `vite.config.ts`, `client.ts`, `tsconfig.json`, `.env.example` | T38, T0C |
| T31 | W5 | SA | `feature-status.md` | W3, T34c |
| T14–T17 | W5 | SA | 1 file/page doc | T31 (+ xem từng task) |
| T47 | W5 | SA | `system-overview.md` | T26, T35, T39 |
| T48 | W5 | SA | `pricing-engine.md`, `3d-cad-pipeline.md` | D5 |
| T55 | W5 | SA | `docs/README.md`, `AGENTS.md` | T26, T27, T31, T11, T30 |

Kiểm tra ownership tự động (T30 mở rộng, tuỳ chọn): với mỗi wave, không file nào xuất hiện ở OWNED của hai task không phụ thuộc nhau.

---

## 12. Định nghĩa "Done"

1. `git diff --name-only` chỉ gồm file `OWNED` (trừ file sinh ra bởi lệnh nêu rõ trong task).
2. Gate: code → `npm run lint` + `npm run build` + `npm run check --baseline`; docs → `node scripts/check-doc-refs.mjs --warn` không thêm cảnh báo mới; DB → test W2 xanh trên local/staging.
3. Doc bị sửa có marker `doc-meta` và không còn `file:line` (§1.7).
4. Báo cáo: file sửa, tóm tắt diff, kết quả gate, điểm chưa xác minh. **Không** sửa `DOCS-ISSUES.md`.
5. Commit cục bộ được phép; **cấm push**. Mọi bước chạm prod do **H** thực hiện theo §1.4.

---

## Phụ lục A — Coverage (nguồn cho `docs/tasks/coverage.json`)

> Định dạng: `ID: task[,task…]`. `CLOSED-*` = không cần chủ. 132 dòng = 102 hàng backlog + 30 NEW; 129 ID cần chủ (trừ DB-02, ARCH-17, IDX-06).
> Nếu `DOCS-ISSUES.md` thêm ID mới, `check-doc-refs --coverage` sẽ báo thiếu.

```
SEC-01: T0B,T0A-1,T0A-2,T0A-3,T0A-4,T20
SEC-02: T21
SEC-03: T24
SEC-04: T22a,T54
SEC-05: T03,T23
SEC-06: T04,T24
SEC-07: T13
SEC-08: T13
SEC-09: T13
SEC-10: T25a,T25,T13
DB-01: T11
DB-02: CLOSED-FP
DB-03: T11,T22b
DB-04: T11,T22b
DB-05: T26
DB-06: T26
DB-07: T26
DB-08: T19
DB-09: T19,T31
DB-10: T11
DB-11: T10
DB-12: T10
DB-13: T10
PAGE-01: T15,T31
PAGE-02: T15,T31
PAGE-03: T15,T31
PAGE-04: T34a,T34b,T34c,T15
PAGE-05: T32b,T17
PAGE-06: T17
PAGE-07: T16
PAGE-08: T16
PAGE-09: T32c,T16
PAGE-10: T16
PAGE-11: T17
PAGE-12: T32b,T17
PAGE-13: T32c,T16
PAGE-14: T32d,T15
PAGE-15: T14,T15
PAGE-16: T16,T17
PAGE-17: T16
PAGE-18: T34a,T34b,T34c,T15
PAGE-19: T32b,T17
ARCH-01: T48
ARCH-02: T48
ARCH-03: T35-mig,T35,T47
ARCH-04: T47
ARCH-05: T48
ARCH-06: T48
ARCH-07: T48
ARCH-08: T48
ARCH-09: T47
ARCH-10: T47
ARCH-11: T47
ARCH-12: T48
ARCH-13: T47
ARCH-14: T47
ARCH-15: T47
ARCH-16: T47
ARCH-17: CLOSED-FP
IDX-01: T08
IDX-02: T08
IDX-03: T09
IDX-04: T08,T09
IDX-05: T09,T27
IDX-06: CLOSED-DONE
IDX-07: T09,T27
IDX-08: T08,T39
IDX-09: T09
IDX-10: T08
IDX-11: T19
IDX-12: T0C,T19
IDX-13: T01,T19
IDX-14: T05,T08,T09,T19
IDX-15: T01,T19
IDX-16: T19
IDX-17: T08
LNK-01: T09
LNK-02: T09
LNK-03: T19
LNK-04: T18b
LNK-05: T07b
DS-01: T07a
DS-02: T07b
DS-03: T18c
DS-04: T18b
DS-05: T18a,T05
DS-06: T18a
DS-07: T07b
DS-08: T07b
DS-09: T07b
DS-10: T07b
DS-11: T18a
DS-12: T18a
DS-13: T18a
DS-14: T18a
DS-15: T18a
DS-16: T18a
DS-17: T18b
DS-18: T18b
DS-19: T18a
DS-20: T07b
DS-21: T18b
NEW-01: T13
NEW-02: T11,T22b
NEW-03: T25a,T25,T13
NEW-04: T14,T27
NEW-05: T14
NEW-06: T16
NEW-07: T16
NEW-08: T32b,T17
NEW-09: T47
NEW-10: T48
NEW-11: T47
NEW-12: T47
NEW-13: T47,T39,T02
NEW-14: T08,T47
NEW-15: T05,T08,T09,T19
NEW-16: T08,T18a,T18b,T19
NEW-17: T18a
NEW-18: T18a
NEW-19: T18a
NEW-20: T18a
NEW-21: T18b
NEW-22: T18b
NEW-23: T18c
NEW-24: T01
NEW-25: T07b
NEW-26: T38
NEW-27: T38
NEW-28: T19
NEW-29: T06
NEW-30: T05,T47
```

---

## Phụ lục B — Xác minh code (2026-09-24)

Các claim kỹ thuật trong board đã được rà trực tiếp. Kết quả:

| Claim | Trạng thái | Bằng chứng |
|---|---|---|
| Token `sec_` mint phía client, dùng `Date.now`+`Math.random` | ✅ đúng | `src/frontend/views/CheckoutView.tsx:155` |
| Fallback token `token_` + upload `cad/${fileName}` | ✅ đúng | `src/backend/supabase/database.ts:328`, `:288` |
| `designer_profiles` có `bank_name/bank_account/tax_id`; khoá chủ là `user_id` | ✅ đúng | `20260901_baseline_schema.sql:885-902` |
| `/orders` chỉ load cho admin | ✅ đúng | `src/App.tsx:912` (`if (role !== 'admin') return`) |
| `vite` khai trùng dep/devDep; chưa có script `check` | ✅ đúng | `package.json` |
| `vite.config.ts` đọc cả `VITE_*`/`NEXT_PUBLIC_*`, chỉ throw khi `sb_secret_`, **chưa** throw thiếu env | ✅ đúng | `vite.config.ts:16-27` |
| `.env.example` chỉ có `NEXT_PUBLIC_*`, có `vcube-red.vercel.app` | ✅ đúng | `.env.example:15,18,25` |
| SETUP: JWT là placeholder `…example_*` nhưng **project ref thật** bị nhúng | ⚠️ đính chính | `docs/SETUP_RUNBOOK.md:172-201` (chỉ cần placeholder hoá ref) |
| UI primitives ở `src/frontend/ui/`; chưa có `ComingSoon.tsx` | ✅ đúng | `ls src/frontend/ui` |
| `PAYOUT_TRANSACTIONS = []`; `INITIAL_WORKSHOP_NODES = []` | ✅ đúng | `src/data/mockData.ts:225`; `src/frontend/stores/useProductionStore.ts:278` |
| Comment `src` sai "không có bảng" | ✅ đúng | `AssetLibraryView.tsx:19-25`; `MyOrdersView.tsx:88-96` |
| `motion` không có trong `package.json`; icon `strokeWidth` mặc định 2 | ✅ đúng | `package.json`; `src/frontend/ui/Icon.tsx:42` |
| `prefers-reduced-motion` đã có toàn cục | ✅ đúng | `src/index.css:507-511` |
| `vercel.json`/`index.html` chưa có Referrer-Policy | ✅ đúng | grep 0 kết quả |
| `compute3SidedOrderFinancialSplit` export tại dòng 974, 0 caller | ✅ đúng | `src/utils/pricingEngine.ts:974` |
| `public:custom_design_requests` chỉ mở ở service, không ở `App.tsx` | ✅ đúng | `customDesignService.ts:306`; `App.tsx:820` |
| `docs/plans` = 39 file; migrations = 3 file | ✅ đúng | `ls` |
| `realtime.send(...)` + policy `realtime.messages` | ⚠️ cần xác minh trên project | phụ thuộc phiên bản `realtime`; T35-mig có bước kiểm tra `pg_proc` trước khi tạo |

> Phụ lục này là nguồn cho `<!-- doc-meta: verified=… -->`. Khi một claim code thay đổi, cập nhật lại ngày.

---

## Phụ lục C — Nhật ký thực thi (Wave 0 SA + Wave 1, 2026-09-24)

**Đã thực thi + review chéo** (`O` ghi log; chưa commit/push):

| Task | Kết quả | Review chéo |
|---|---|---|
| T00 | `scripts/dev/new-worktree.sh`, `.env.worktree.example`, `docs/tasks/baseline.json` (15 gate) | PASS-WITH-NITS |
| T01 | `.env.example` đủ 4 khoá | PASS |
| T03 | `verify-rls.mjs` fix `status` (cả `expectZero` + `expectPositive`) | PASS |
| T04 | `inspect-db.mjs` thêm `custom_design_requests` + `designer_profiles: sensitive=true` | PASS |
| T05 | `npm run check` + `gate-manifest.json` (16 gate) + `.gitignore` | PASS-WITH-NITS |
| T06 | Comment `AssetLibraryView`/`MyOrdersView` (bảng có, chưa nối) | PASS |
| T07a/T07b | `qa-checklist.md` VI-only + hết drift | PASS / PASS-WITH-NITS |
| T08 | `AGENTS.md` + `README.md` (path/motion/tsconfig/doc-map/gate) | PASS-WITH-NITS |
| T09 | `docs/README.md` (link/route/gate) | FAIL → PASS sau T05 |
| T18a/T18b/T18c | `tokens`, `icon-map`, `data-honesty`, `ui-audit`, `taste-contract` | PASS-WITH-NITS / PASS |
| T19 | SETUP + archive/tasks README + backlog + UI-CHROME + seeds doc | PASS-WITH-NITS |
| T30 | `scripts/check-doc-refs.mjs` + `docs/tasks/coverage.json` (132 ID, 129 chủ) | PASS |

**Hậu kiểm đã sửa ngay:** T00 guard prod (chặn thêm `NEXT_PUBLIC_SUPABASE_URL` + secret); T05 `run-checks` coi script gate chưa đăng ký là **lỗi** (thêm `--allow-unregistered`); `.env.worktree.example` để trống secret; bỏ project ref thật khỏi `DOCS-REVIEW-BACKLOG.md`; icon-map `360`; data-honesty PC-01.

**Kết quả audit W0 (nguồn cho T0A-2):**
- **File `src` phải sửa trước revoke:** `src/frontend/stores/useDesignerAdminStore.ts` (`.select('*')` + đọc `bank_name/bank_account/tax_id` + `.update(...).select('id')`) và `src/backend/services/workshopService.ts` (`.select('*')`). Không có embed `designer_profiles(*)`.
- **Cột an toàn** (baseline `885–902`): `id, user_id, display_name, bio, portfolio_url, avatar_url, royalty_percent, verified_status, rating, total_sales, created_at, updated_at`. **Khoá chủ = `user_id`**.
- **PII phát hiện thêm (mở task):**
  - **T0A-5 (mới, P1)** — `workshop_partners` (`address/contact_person/phone/email`) nằm trong `v_catalog_read` ⇒ anon đọc được. Sửa như SEC-01.
  - **T0A-6 (mới, P2)** — `workshop_profiles` verified `contact_phone/contact_email/address` đọc công khai; cân nhắc chỉ hiển thị cần thiết.
- **T23** cần thêm kiểm tra `designer_profiles` vào `verify-rls.mjs` (hiện không probe bảng này).
- **T30** sẽ báo `docs/plans/**` noise (không có doc-meta) — cân nhắc skip theo path ở vòng sau.

**Đang chặn (cần `H`):** T0B (triage prod), T0A-4 (deploy+apply hotfix), T0C (rotate/inventory key). **W2 chưa thể bắt đầu** cho tới khi T0A-4 xong. Quyết định D2/D3/D5/D6/D7/D8/D10/D14/D15 chưa "CHỐT".

**Đề xuất vòng kế:** (1) `H` chạy T0B → T0A-2 → T0A-4; (2) song song O chốt D2/D3/D5/D6/D7/D14; (3) mở W2 serial (T20.0 → …) sau T0A-4.

### C.1 Điều tra "không thấy designer" + `.env` (2026-09-24)

- **Nguyên nhân gốc:** không có code path nào (a) set `user_profiles.role='designer'`, hay (b) tạo row `designer_profiles`. Trigger signup hardcode `customer` (`20260901_baseline_schema.sql:1429`); không có UI promote; `WorkshopService.saveDesignerProfile()` là dead code (upsert cột legacy không tồn tại). 2 row `designer_profiles` hiện tại là **seed `[MẪU]`**; account `creator.lethang@vcube.vn` resolve `customer` (từ `user_profiles.role`) ⇒ `/designer` (`RoleGuard ['designer','admin']`) bị chặn.
- **`.env` local hỏng khoá:** không có `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_SITE_URL`/`SUPABASE_SECRET_KEY`; `SUPABASE_SERVICE_ROLE_KEY` **byte-identical với anon key** (role=`anon`) ⇒ mọi script server (`verify-rls`, `inspect-db`, `seed-sample-data`) chạy sai quyền (`auth.admin.listUsers()` → 403; cột "SECRET" trong `inspect-db` vô nghĩa). Việc này củng cố T0C + T01.
- **Đã implement ngay:**
  - **T57 (DONE 2026-09-24)** — Admin "Cấp quyền Designer": `src/backend/services/designerService.ts` (`promoteUserToDesigner` cập nhật `user_profiles.role` + tạo/cập nhật `designer_profiles` theo cột baseline) + nút trong `Group3CustomersPanel.tsx` (ConfirmDialog + toast + reload). `lint`/`build` PASS, không tệ hơn baseline.
  - **Runbook** `docs/runbooks/designer-onboarding.md` (đường admin, SQL fallback, kiểm chứng, cảnh báo trigger bảo vệ cột).
- **Task mới còn mở:**
  - **T58 (P2, quyết định sản phẩm)** — cho phép tự đăng ký vai trò Designer (đổi trigger) hoặc onboarding wizard như xưởng; chưa làm.
- **Hành động `H`:** bổ sung `.env` (`VITE_*` + `SUPABASE_SECRET_KEY` thật, sửa nhãn `SUPABASE_SERVICE_ROLE_KEY`); sau đó (sau hotfix T0A-4) đăng nhập admin → Group3 → "Cấp quyền Designer", hoặc dùng SQL trong runbook. Vẫn ưu tiên **T0A-4 hotfix P0** trước.

### C.2 Designer lifecycle hoàn chỉnh + incident (2026-09-24)

- **T57 DONE** — Admin "Cấp quyền Designer" (`designerService.promoteUserToDesigner` + nút Group3).
- **T58 DONE (draft)** — Tự đăng ký chọn "Khách hàng / Nhà thiết kế": sửa `AuthContext.signUp` + `RegisterView`/`AuthModal`; migration `20261011100000_signup_role_designer.sql` (+ `_down`) cho trigger đọc `raw_user_meta_data->>'role'`, **chỉ map `designer`/`customer`, không bao giờ `admin`**; tạo `designer_profiles` với `verified_status='Pending'`. Security review: **PASS-WITH-NITS**.
- **T58b DONE (draft)** — Vá N2: `20261011110000_designer_profile_column_guard.sql` (+ `_down`) thêm trigger chặn owner sửa cột đặc quyền (`royalty_percent`, `verified_status`, `rating`, `total_sales`, `id`, `user_id`…), chỉ cho sửa `display_name/bio/portfolio_url/avatar_url/bank_*`.
- **Incident** `docs/security/incident-2026-09-SEC01.md` đã tạo (không chứa PII thật).
- **Tooling:** `scripts/a8-sql-syntax-check.mjs` nay tự quét mọi `supabase/migrations/*.sql` + `supabase/rollback/*.sql`.
- **Migration nháp chờ `H` áp (đúng thứ tự timestamp):** `20261011090000` (SEC-01) → `20261011100000` (signup role) → `20261011110000` (column guard). `scripts/gen-apply-all.mjs` (T24) phải thêm 3 file trước khi regenerate `apply_all_manual.sql`.
- **`.env` (P1, `H`):** thiếu `VITE_*` + `SUPABASE_SECRET_KEY`; `SUPABASE_SERVICE_ROLE_KEY` hiện là anon ⇒ script server chạy sai quyền.
- **Gate:** `npm run check --baseline` RC=0; `a8` RC=0; không tệ hơn baseline.

### C.3 W2 batch 1 (2026-09-24)

- **T21 DONE (draft)** — SEC-02: view `open_design_requests` (chỉ cột an toàn) + RPC `claim_design_request(p_id text)` atomic + gỡ nhánh `designer_id is null` khỏi policy designer; `customDesignService.ts` + `DesignerRequestsTab.tsx` dùng view/RPC. Lưu ý realtime pool chưa nhận (view không hỗ trợ `postgres_changes`).
- **T22b DONE (draft)** — phát hiện `orders.status` + `status_stage_index` **đã có CHECK** từ baseline; migration chỉ thêm `orders_payment_status_chk` + `kyc_records_status_chk` (NOT VALID → audit → VALIDATE).
- **T24 DONE** — `bootstrap_admin.sql` bỏ email hardcode (sentinel `CHANGE_ME@example.com`); `lint-rls-sources` quét thêm `supabase/scripts/`; generator + `apply_all_manual.sql` regenerate.
- **T35-mig DONE (draft)** — broadcast `orders:admin` chỉ `{id,status}` (không `broadcast_changes`); cần **preflight** `realtime.send` trên project.
- **T25a DONE** — verdict D3 ở trên.
- **T23 DONE** — `verify-rls.mjs` thêm 9 probe SEC-01/02 (hiện `29 PASS · 0 FAIL · 1 SKIP`; SKIP view chưa áp); lint **R9** chặn `grant select on designer_profiles to anon` không kèm cột.
- **Vá durability (review finding)** — gỡ `designer_id is null` khỏi **source** `20261010_harden_rls.sql` (chỉ ảnh hưởng rebuild tương lai, không đổi prod); lint **R8** chặn `designer_id is null` trong policy + **W1** cảnh báo definer view; generator gồm 3 migration W2 mới.
- **Bundle áp:** `docs/runbooks/w2-2026-09-24.sql` (SEC-02 → CHECK → broadcast; a8 PASS).
- **Review chéo:** 4 hạng mục PASS-WITH-NITS; durability là finding chính (đã vá).
- **Remaining W2:** **T20** (tách `designer_payout_info` — cần cập nhật `seed-sample-data.mjs` + cổng H trước khi drop cột) và **T25** (storage scheme `cad/<uid|guest>/<uuid>/…` + hardening `uploadCadFile`).
- **Thứ tự áp cho `H`:** áp `20261012090000` (SEC-02) → **deploy client T21 ngay** (view phải tồn tại) → áp `20261012100000`, `20261012130000` (preflight realtime) → chạy `verify-rls.mjs` + probe.

### C.4 W2b (T20/T25) + W3 khởi động (2026-09-24)

- **T20 DONE (draft 2 pha)** — pha 1 `20261013090000_sec01_payout_table.sql`: bảng `designer_payout_info` + RLS owner/admin, backfill, RPC `get_my_payout_info`/`admin_get_designer_payout` trỏ bảng mới, thêm `upsert_my_payout_info`; đã siết `revoke all … from public, anon, authenticated` → `grant select,insert,update` (không DELETE). Code: seed ghi bảng mới; store bỏ đọc cột bank, thêm `loadPayoutInfo()` (chưa wire UI). Pha 2 `20261013100000_drop_designer_bank_columns.sql` **H-gated**, chưa áp.
- **T25 DONE (draft)** — policy `vcube_cad_files_cad_owner_rw` cho `cad/<uid>/…` + chặn `..`/segment rỗng; harden `uploadCadFile` (basename, allowlist ext, uuid, contentType, cần ownerId). Guest path hoãn (cần service-role/signed upload).
- **Review chéo T20/T25: PASS-WITH-NITS** → đã vá: revoke authenticated, probe `designer_payout_info` (SKIP tới khi áp), traversal guard.
- **Durability**: `harden` thêm `vcube_cad_files_cad_owner_rw` vào `v_ok` + section 8.3; generator gồm 2 migration W2b (KHÔNG gồm file drop); regenerate `apply_all_manual.sql`.
- **Manifest**: đăng ký `doc-freshness` (advisory) → `npm run check` nay **17 gate, RC=0**.
- **W3 đã xong (không phụ thuộc DB):** **T27** (`gen-routes-doc.mjs` → `_routes.generated.md`, 30 route, byte-stable), **T10** (runbook: bỏ `user_metadata`, date-stamp, §11 nhật ký áp migration), **T12** (seeds doc: chain mới + unwired), **T11** (`schema-notes.md`), **T28** (`check-doc-freshness.mjs`).
- **W3 còn lại:** **T26** (sinh `schema.md` — chạy sau khi áp W2b để phản ánh đúng DB) và **T13** (rls-policies.md — sau khi áp W2b).
- **Bundle áp W2b:** `docs/runbooks/w2b-2026-09-24.sql` (payout pha 1 + storage; **không** gồm drop cột). Thứ tự: áp bundle → deploy client → verify → (sau) áp `20261013100000` drop cột.
