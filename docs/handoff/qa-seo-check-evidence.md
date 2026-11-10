<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# QA/SEO — Evidence: `seo:check` trong CI (review integration)

> **Trạng thái 2026-11-10:** đã thêm `npm run seo:check` + CI offline step · **chạy được với
> placeholder hiện tại (exit 0)** · **phụ thuộc worker E** để `--check --allow-empty` có hiệu lực
> thật (hiện generator trong worktree này chưa đọc cờ đó).

## 1. Thay đổi

| File | Nội dung |
|---|---|
| `package.json` | `"seo:check": "node scripts/gen-seo-files.mjs --check --allow-empty"` |
| `.github/workflows/ci.yml` | Step offline **sau build**: `npm run seo:check` (không secret, không DB, không domain) |
| `docs/handoff/qa-seo-check-evidence.md` | File này |

Không thêm dependency. Không sửa `scripts/gen-seo-files.mjs` (worker E sở hữu).

## 2. Hành vi hiện tại & dependency

- **Trong worktree này**, `scripts/gen-seo-files.mjs` chưa có nhánh `--check`/`--allow-empty`.
  Vì vậy `npm run seo:check` hiện **regenerate** (giống `seo:gen`) rồi exit 0 — chưa phải
  so-sánh drift. Đã chạy thử: output `SEO files: 7 URL (0 sản phẩm), site=http://localhost:3000`,
  exit 0. File `public/sitemap.xml` bị ghi lại nên đã `git checkout --` để không commit ngoài scope.
- **Khi E merge** `--check --allow-empty`:
  - `--check`: so file đã sinh với file đang có, fail nếu lệch.
  - `--allow-empty`: không fail khi chưa có domain/sản phẩm thật (placeholder).
  - CI step trở thành gate thật, vẫn offline.
- Nếu E chưa merge, CI step vẫn xanh (regenerate) — **không** chặn PR, nhưng cũng chưa bắt drift.
  Đây là dependency cần phối hợp, không phải gate đã hoàn tất.

## 3. Vì sao CI-only, không thêm `scripts/gate-manifest.json`

- `npm run check` phải chạy offline ở mọi máy, không phụ thuộc domain/HTML sinh sẵn. Trong khi
  `seo:check` chỉ có ý nghĩa khi generator hỗ trợ `--check` (E) và file sinh đã được commit.
- Thêm vào manifest sẽ phải cập nhật `docs/tasks/baseline.json` có chủ đích; ngoài phạm vi review
  này (chỉ `scripts/e2e`, `package.json`, CI, docs).
- Nếu PO muốn gate trong `check`, thêm sau khi E merge:
  ```json
  { "id": "seo-check", "cmd": "npm run seo:check", "offline": true }
  ```
  và cập nhật baseline cùng PR.

## 4. Lệnh & kết quả

| Lệnh | Kết quả |
|---|---|
| `npm run seo:check` | exit 0; `SEO files: 7 URL (0 sản phẩm), site=http://localhost:3000` (hiện regenerate) |
| `npm run seo:gen` | không đổi hợp đồng |

## 5. Không được suy diễn

- `seo:check` xanh **không** chứng minh SEO production đúng (domain thật, sản phẩm published,
  không URL 404). Việc đó thuộc DATA-02/SEO-02 sau khi có domain + dữ liệu.
