<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# QA/SEO — Evidence: `seo:check` trong CI (review integration)

> **Trạng thái 2026-11-10 (sau Wave 1.1 + 1.2):** `npm run seo:check` + CI offline step đã là
> **gate thật** (`--check --allow-empty` có hiệu lực trong generator). Với placeholder chưa có
> domain, output `✓ … hợp lệ (0 URL — placeholder, chờ domain production)` và exit 0.

## 1. Thay đổi

| File | Nội dung |
|---|---|
| `package.json` | `"seo:check": "node scripts/gen-seo-files.mjs --check --allow-empty"` |
| `.github/workflows/ci.yml` | Step offline **sau build**: `npm run seo:check` (không secret, không DB, không domain) |
| `scripts/gen-seo-files.mjs` | Wave 1.1 thêm `--check`/`--allow-empty` + so rule robots; Wave 1.2 thêm `Disallow: /assets/$` + case `/assets/` |
| `public/robots.txt` | Rule sinh từ generator (giữ khớp khi `--check`) |
| `docs/handoff/qa-seo-check-evidence.md` | File này |

Không thêm dependency. Không chọn domain production (vẫn là placeholder).

## 2. Hành vi hiện tại

- `scripts/gen-seo-files.mjs` **đã có** `--check`/`--allow-empty` (Wave 1.1 merge):
  - `--check`: so rule `Allow`/`Disallow` của `public/robots.txt` với generator, kiểm XML
    sitemap + manifest, mô phỏng khớp robots trên asset build; fail (exit 1) nếu lệch drift.
  - `--allow-empty`: không fail khi sitemap chưa có `<loc>` (placeholder chưa có domain).
  - `npm run seo:check` **không** ghi file — chỉ đọc/so sánh.
- Với placeholder hiện tại: output `✓ gen-seo-files --check: robots.txt/sitemap.xml/manifest hợp lệ
  (0 URL — placeholder, chờ domain production)`, exit 0.
- CI step là **gate thật** cho drift robots/sitemap/manifest, vẫn offline (không secret/DB/domain).

## 3. Vì sao CI-only, không thêm `scripts/gate-manifest.json`

- `npm run check` phải chạy offline ở mọi máy, không phụ thuộc domain/HTML sinh sẵn. Trong khi
  `seo:check` chỉ có ý nghĩa khi file sinh đã được commit (hiện vẫn là placeholder chưa có domain).
- Thêm vào manifest sẽ phải cập nhật `docs/tasks/baseline.json` có chủ đích; ngoài phạm vi review
  này (chỉ `scripts/e2e`, `package.json`, CI, docs).
- Nếu PO muốn gate trong `check`, thêm:
  ```json
  { "id": "seo-check", "cmd": "npm run seo:check", "offline": true }
  ```
  và cập nhật baseline cùng PR.

## 4. Lệnh & kết quả

| Lệnh | Kết quả |
|---|---|
| `npm run seo:check` | exit 0; `✓ gen-seo-files --check: robots.txt/sitemap.xml/manifest hợp lệ (0 URL — placeholder, chờ domain production)` |
| `npm run seo:gen` | không đổi hợp đồng (vẫn cần domain production, exit 1 nếu thiếu) |

## 5. Không được suy diễn

- `seo:check` xanh **không** chứng minh SEO production đúng (domain thật, sản phẩm published,
  không URL 404). Việc đó thuộc DATA-02/SEO-02 sau khi có domain + dữ liệu.

## 6. Bổ sung 2026-11-10 — `Disallow: /assets` từng chặn asset build

| Trước | Sau |
|---|---|
| `Disallow: /assets` (prefix ⇒ chặn `/assets/index-*.js|css`) | `Allow: /assets/` + `Disallow: /assets$` (chỉ chặn đúng route app) |

- **Bằng chứng:** `dist/index.html` (build thật) nạp `/assets/index-CMz-WlGN.js`,
  `/assets/react-vendor-…js`, `/assets/supabase-vendor-…js`, `/assets/index-Ccjb4e85.css`;
  `dist/assets/` có 49 file; `vercel.json:12-21` cache `/assets/(.*)`. Rule prefix chặn hết
  ⇒ Googlebot không tải được JS/CSS để render SPA.
- **Route app vẫn chặn:** `/assets` là `ProtectedRoute` (`AppRoutes.tsx:322`, `AssetLibraryView`)
  nên vẫn `Disallow: /assets$`. Không có chuyện "crawler không hỗ trợ `$`": RFC 9309 §2.2.3 bắt
  buộc crawler hỗ trợ `$` (cùng `*`, `#`), nên rule neo cuối là cổng chặn chính thức.
- **Gate mới trong `--check`:** (1) so rule `Allow`/`Disallow` của `public/robots.txt` với generator;
  (2) mô phỏng khớp rule (RFC 9309 rút gọn: `*`, `$`, prefix, longest-match, hoà ⇒ Allow) trên mẫu
  asset Vite + asset thật trong `dist/index.html` nếu có; (3) mọi route `NON_INDEXABLE` (kể cả
  `/assets`) phải bị chặn. Negative test: đổi lại `Disallow: /assets` ⇒ `--check` exit 1 với
  7–8 lỗi "robots.txt chặn asset build".
- `npm run seo:check` (placeholder, chưa có domain) vẫn exit 0; chưa chọn domain production.

## 7. Bổ sung 2026-11-10 (Wave 1.2) — đóng `/assets/` (slash cuối)

| Trước | Sau |
|---|---|
| `Allow: /assets/` + `Disallow: /assets$` — `/assets` bị chặn nhưng `/assets/` vẫn crawl được | thêm `Disallow: /assets/$` — chặn đúng URL `/assets/` |

- **Vì sao cần:** `/assets/` là URL khác `/assets`; nó khớp `Allow: /assets/` (prefix) nên trước
  đây vẫn crawlable dù route app `/assets` đã bị `Disallow: /assets$`.
- **Cơ chế khớp:** độ cụ thể = độ dài chuỗi pattern **gồm `$`** — giống tham chiếu
  `google/robotstxt` (`MatchAllow`/`MatchDisallow` trả `pattern.length()`), nên
  `Disallow: /assets/$` (9) thắng `Allow: /assets/` (8) đúng ở `/assets/`; `/assets/index-*.js|css`
  chỉ khớp Allow (8) nên vẫn tải được. `$` bắt buộc hỗ trợ — RFC 9309 §2.2.3.
- **Gate `--check`:** thêm case `/assets/` phải DISALLOW + lỗi riêng khi thiếu
  `Disallow: /assets/$` (negative).
- **Bằng chứng chạy thật (matcher trên `public/robots.txt`):**
  - `/assets` → DISALLOW; `/assets/` → DISALLOW;
  - `/assets/index-x.js`, `/assets/index-Ccjb4e85.css`, `/assets/foo` → ALLOW.
  - Negative bỏ `Disallow: /assets/$`: `/assets/` → ALLOW và `--check` exit 1 với 2 lỗi
    ("robots.txt lệch generator" + `robots.txt thiếu "Disallow: /assets/$" — biến thể /assets/ vẫn crawlable`).
- **`npm run seo:check`:** exit 0 —
  `✓ gen-seo-files --check: robots.txt/sitemap.xml/manifest hợp lệ (0 URL — placeholder, chờ domain production)`.
- Chưa chọn domain production; không đụng sitemap/SEO-02.
