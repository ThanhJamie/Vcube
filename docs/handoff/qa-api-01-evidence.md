<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# QA-API-01 — Evidence: API/DB harness (dry-run + staging)

> **Trạng thái 2026-11-10:** `dry-run PASS` · `staging: NOT RUN` · **KHÔNG** đạt QA-MONEY-01.
> Lý do staging: worktree không có credential staging (xem §5).

## 1. Hành vi trước/sau

| Trước | Sau |
|---|---|
| `scripts/e2e/guest-order-flow.ts` chỉ chạy tay, không có npm script/CI | `npm run test:e2e:api` (dry-run mặc định) + self-test trong CI offline; dry-run chạy được **không cần credentials** |
| Dry-run thiếu `.env` → `env FAIL` + exit 1 | Dry-run thiếu `.env` → `env SKIP`, vẫn kiểm fixture, exit 0 (không gọi mạng) |
| `--live` có thể ghi DB ngay | `--live` yêu cầu `E2E_ALLOW_LIVE=1`; `E2E_TARGET=production` cần thêm `E2E_ALLOW_PRODUCTION=1` |
| Không có output máy đọc | `--json` (stdout) + `--report <path>` (file JSON cho CI artifact) |
| RLS test coi mọi lỗi là "đã chặn" | Chỉ `SQLSTATE 42501` / `row-level security` mới là PASS; lỗi khác là FAIL (không kết luận được) |
| Cleanup xoá nhưng không kiểm | Cleanup đọc lại `orders` để xác nhận đã sạch; `--cleanup-stale` dọn đơn `E2E-%` còn sót |
| Payload in ra có thể lộ token | `secure_access_token` bị che (`<redacted>`); không in khoá |

## 2. File thay đổi

| File | Nội dung |
|---|---|
| `scripts/e2e/guest-order-flow.ts` | Thêm `--json`, `--report`, guard live, fixture validation, RLS assertion chặt, cleanup verify, `--cleanup-stale`, `E2E_ENV_FILE`, redact token |
| `package.json` | `test:e2e:api` → `tsx scripts/e2e/guest-order-flow.ts` |
| `.github/workflows/ci.yml` | Offline: self-test fixture. Live: dry-run read-only + live-write opt-in bằng secret staging riêng + artifact JSON |
| `docs/design/browser-smoke-qa.md` | QA-BROWSER-01 (task song song) |
| `docs/handoff/qa-api-01-evidence.md` | File này |

## 3. Fixture staging (do script tạo)

| Trường | Giá trị / quy tắc |
|---|---|
| `orders.id` | `E2E-<YYYYMMDDHHMMSS>-<3 số>` (prefix `E2E-`) |
| `orders.order_number` | `#E2E-<…>` |
| `secure_access_token` | `e2e_<uuid>` — cùng token dùng cho payload và RPC tra cứu; **che khi in** |
| `user_id` | `null` (guest thật, không tạo auth user) |
| `total_amount` | 350.000 = 320.000 (hàng) + 30.000 (ship) |
| `items` | 1 dòng `physical` (`E2E-P1`) |
| `payment_status` | `awaiting_payment` |
| Kênh ghi | anon key (guest insert); admin session riêng cho bước confirm tiền |
| Dọn | `--cleanup` xoá đúng đơn của lượt chạy + đọc lại xác nhận; `--cleanup-stale` dọn mọi `E2E-%` |

Không dùng số liệu/ảnh/tên thật. Email `e2e-guest@vcube.test`, điện thoại `0900000000` chỉ là
fixture test.

## 4. Lệnh chạy

```bash
# 1) Dry-run offline: chỉ kiểm fixture, KHÔNG gọi mạng, KHÔNG cần .env
npm run test:e2e:api

# 2) Dry-run có output máy đọc
npm run test:e2e:api -- --json --report /tmp/e2e-api.json

# 3) LIVE trên staging (chỉ khi có credential staging)
E2E_ALLOW_LIVE=1 E2E_TARGET=staging \
  npx tsx scripts/e2e/guest-order-flow.ts --live --cleanup --json --report /tmp/e2e-api-live.json

# 4) LIVE + admin confirm tiền (QA-MONEY-01 dùng về sau, KHÔNG phải acceptance của item này)
E2E_ALLOW_LIVE=1 E2E_TARGET=staging \
  E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
  npx tsx scripts/e2e/guest-order-flow.ts --live --admin-session --cleanup
```

Biến môi trường:

| Biến | Ý nghĩa |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | client anon (bắt buộc cho live) |
| `SUPABASE_SECRET_KEY` | **server-only**, chỉ dùng cho cleanup/provision admin |
| `E2E_ENV_FILE` | trỏ file env staging riêng (CI), tránh lẫn `.env` production |
| `E2E_ALLOW_LIVE=1` | bắt buộc để `--live` ghi DB |
| `E2E_TARGET` | nhãn `staging` / `production` / `unknown` (chỉ để báo cáo/guard) |
| `E2E_ALLOW_PRODUCTION=1` | ngoại lệ có chủ đích nếu thật sự chạy production |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | phiên admin thật cho bước confirm |

## 5. Kết quả chạy trong worktree (2026-11-10)

Môi trường: worktree `wave1/qa`, **không có `.env`**, không có credential staging.

| Lệnh | Kết quả | Exit |
|---|---|---:|
| `npx tsc --noEmit` | PASS (0 lỗi) | 0 |
| `npm run test:e2e:api` | `fixture.valid PASS`; `env SKIP`; 6 SKIP; **PASS dry-run** | 0 |
| `npm run test:e2e:api -- --json --report …` | JSON hợp lệ, `result=PASS`, ghi file OK | 0 |
| `--live` không có `E2E_ALLOW_LIVE` | `guard.live BLOCKED` | 2 |
| `--live` có guard nhưng thiếu credential | `env FAIL` (đúng kỳ vọng) | 1 |
| **Staging live/cleanup** | **NOT RUN — thiếu credential** | — |

> Dry-run PASS chỉ chứng minh harness/fixture đúng. **Không** chứng minh guest insert, token RPC,
> RLS hay vòng tiền.

## 6. Thiếu gì để chạy staging (blocker)

Cần PO/Ops cấp **staging project riêng** (không dùng production):

| Secret / fixture | Trạng thái |
|---|---|
| `E2E_STAGING_SUPABASE_URL` | ❌ chưa có |
| `E2E_STAGING_PUBLISHABLE_KEY` (`sb_publishable_…`) | ❌ chưa có |
| `E2E_STAGING_SECRET_KEY` (`sb_secret_…`, server-only) | ❌ chưa có |
| `E2E_STAGING_ADMIN_EMAIL` / `_PASSWORD` (admin thật trên staging) | ❌ chưa có (chỉ cần cho QA-MONEY-01) |
| Xác nhận migration đã áp trên staging | ❌ chưa xác nhận |
| Cho phép ghi DB staging + cleanup `E2E-` | ❌ chưa duyệt tường minh |

Nếu chỉ có URL/key mà không có secret key: chạy được `--live` guest insert nhưng **không cleanup
được** → không nên chạy (ràng buộc dữ liệu sạch).

## 7. CI

- **Offline job:** thêm step `npm run test:e2e:api` — chỉ fixture, không mạng, không cần secret.
- **Live job:** dry-run read-only khi có secret; **live-write chỉ khi** có secret
  `E2E_STAGING_*` **và** repo variable `E2E_LIVE_WRITE=true`; dùng `E2E_ENV_FILE` staging riêng
  để không ghi nhầm production. Report JSON được upload làm artifact `qa-api-01-report`.
- Thêm secret staging không làm đỏ job offline.

## 8. Ba mức — không được gộp

| Bằng chứng | Đã có? |
|---|---|
| Unit/lint | ✅ (verifier chạy riêng) |
| Harness dry-run | ✅ PASS (mục §5) |
| Browser smoke | ✅ public/mock; console BLOCKED (xem `qa-browser-01-evidence.md`) |
| Staging API/DB live | ❌ NOT RUN |
| QA-MONEY-01 (transaction + dispatch + tracking) | ❌ **KHÔNG ĐẠT** |
