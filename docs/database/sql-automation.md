<!-- doc-meta: status=active; verified=2026-11-09; owner=lead -->
# Chạy SQL tự động lên Supabase

Mục tiêu: agent/CI chạy được SQL đã được duyệt mà không cần dán tay vào SQL Editor.

## 1. Vì sao cần token riêng

`SUPABASE_SECRET_KEY` (service role) chỉ mở REST/Storage/Realtime — **không chạy được SQL tuỳ ý**.
Để chạy SQL cần một trong hai:

| Cách | Ưu | Nhược |
|---|---|---|
| **Management API** (`SUPABASE_ACCESS_TOKEN`) — khuyến nghị | Không cần psql/CLI, chạy được trên mọi máy | Token thuộc tài khoản Supabase → phải bảo mật, thu hồi được |
| `psql` + `SUPABASE_DB_URL` | Quyền hẹp theo database | Cần cài `psql`; phải giữ mật khẩu DB |

Repo dùng **Management API** qua `scripts/db-query.mjs`.

## 2. Thiết lập một lần

1. Tạo Personal Access Token: <https://supabase.com/dashboard/account/tokens> → **Generate new token**.
2. Thêm vào `.env` (file đã gitignore):
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxx
   ```
3. Kiểm tra:
   ```bash
   npm run db:check
   ```
   Kỳ vọng: `✔ Kết nối Supabase OK — project <ref>`.

> Token không bao giờ được đưa vào `VITE_*`, bundle client, log hay commit. Khi nghi lộ: revoke
> trên dashboard và tạo token mới.

## 3. Chạy SQL

```bash
# Xem trước (dry-run, không gửi request)
node scripts/db-query.mjs --file scripts/sql/2026-11-09-demo-data-cleanup.sql

# Chạy thật
node scripts/db-query.mjs --file scripts/sql/2026-11-09-demo-data-cleanup.sql --apply

# Câu lệnh ngắn
node scripts/db-query.mjs --sql "select count(*) from public.orders" --apply
```

- Mặc định **dry-run**; chỉ chạy khi có `--apply`.
- Lỗi SQL trả nguyên văn message từ Postgres (HTTP 4xx) để sửa.
- Script không in token; `--check` chỉ chạy `select 1`.

## 4. Quy trình duyệt (Code Machine)

1. PO duyệt task: `node scripts/machine-next.mjs --approve <id>`.
2. Agent chạy dry-run → đọc SQL → chạy `--apply` khi đã đúng.
3. Xác minh bằng `npm run po:audit` (dữ liệu thật thay đổi ⇒ điểm data-honesty tăng).
4. Ghi nhận: `node scripts/machine-next.mjs --complete <id>`.

SQL đã chuẩn bị:

| File | Việc | Trạng thái |
|---|---|---|
| `scripts/sql/2026-11-09-demo-data-cleanup.sql` | Ẩn `[MẪU]`, set ảnh bịa `NULL`, tắt banner demo, xoá fixture review | chờ token |
| `scripts/sql/2026-11-09-digital-delivery.sql` | Migration #14: RPC `finalize_digital_delivery`, `get_my_order_files`, `claim_guest_order` + policy storage | chờ token + duyệt |

## 5. Sau khi áp migration #14

Chuyển nội dung `scripts/sql/2026-11-09-digital-delivery.sql` thành
`supabase/migrations/20261025090000_digital_delivery.sql` (đúng chuỗi migration), chạy lại
`npm run check` (gate `lint-rls-migration` sẽ yêu cầu cập nhật allowlist policy), rồi mới nối client
checkout → `order_files` + `/assets` signed URL.

## 6. Supabase MCP (đường chạy SQL thứ hai, dùng tool của agent)

Nguồn: <https://supabase.com/docs/guides/ai-tools/mcp> (bản gốc; link bạn gửi là Google Translate).

### 6.1 MCP server cung cấp gì

Hosted server `https://mcp.supabase.com/mcp` nhóm tool theo feature group:

| Nhóm | Tool chính |
|---|---|
| `database` | `list_tables`, `list_migrations`, `execute_sql`, `apply_migration`, `list_extensions` |
| `debugging` | `query_logs`, `get_advisors` (security/perf) |
| `development` | `generate_typescript_types`, `get_project_url`, `get_publishable_keys` |
| `docs` | `search_docs` |
| khác | edge functions, storage (mặc định tắt), branching, notebooks |

Tham số URL: `project_ref=<ref>` (khoá 1 project, tắt tool account), `read_only=true`,
`features=database,docs`, `skip_elicitations=...`.

### 6.2 Vì sao repo dùng proxy nội bộ

OpenCode V2 remote MCP hỗ trợ header `{env:NAME}`, nhưng **service chạy nền không đọc `.env`
của repo** ⇒ header rỗng và Supabase trả 401 (`Format is Authorization: Bearer [token]`).

`scripts/supabase-mcp-proxy.mjs`:
- bind `127.0.0.1:8788`, chỉ phục vụ `/mcp` (+ `/health`);
- đọc `SUPABASE_ACCESS_TOKEN` từ `.env` **mỗi request** (thêm token không cần restart);
- inject `Authorization: Bearer …` rồi chuyển tiếp Streamable HTTP/SSE tới Supabase;
- không log token, không lưu token trong `opencode.json`.

`opencode.json` trỏ tới proxy:

```jsonc
"supabase": {
  "type": "remote",
  "url": "http://127.0.0.1:8788/mcp?project_ref=vcxarjwzbihvurpkcufa&features=database,docs",
  "oauth": false
}
```

### 6.3 Thiết lập

1. Tạo PAT: <https://supabase.com/dashboard/account/tokens> — đặt tên `vcube-mcp`, scope đúng
   project, cấp quyền cho các tool cần dùng (xem bảng quyền của Supabase).
2. Thêm vào `.env`: `SUPABASE_ACCESS_TOKEN=sbp_…`.
3. Chạy proxy: `npm run mcp:supabase` (hoặc detached như trên).
4. Kiểm tra: `curl -s http://127.0.0.1:8788/health` → `tokenPresent: true`, rồi
   `opencode mcp list` → `✓ supabase connected`.
5. Gọi tool qua agent: `supabase_list_tables`, `supabase_execute_sql`,
   `supabase_apply_migration`, `supabase_generate_typescript_types`.

### 6.4 An toàn

- **Project-scoped** + `features=database,docs` — không dùng tool account/branching.
- Khi chỉ đọc (audit, debug): đổi URL thành `...&read_only=true`.
- PAT thuộc tài khoản Supabase: revoke ngay khi nghi lộ; không đưa vào `VITE_*`/bundle/log.
- Proxy chỉ bind loopback; không mở port ra ngoài.
- Với thao tác ghi: ưu tiên `scripts/sql/*.sql` đã review + `db-query.mjs --apply` (deterministic),
  dùng `execute_sql` cho truy vấn ngắn/đọc.

### 6.5 MCP hay script?

| Việc | Dùng |
|---|---|
| Đọc schema/nhanh, sinh TypeScript types, advisor | **MCP** |
| Chạy file SQL đã duyệt nhiều bước, cần dry-run + log | **`scripts/db-query.mjs`** |
| CI/automation không có MCP client | `db-query.mjs` |
| Debug log/query logs | **MCP** (`query_logs`) |

