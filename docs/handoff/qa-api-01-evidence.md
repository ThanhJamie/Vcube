<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# QA-API-01 — Evidence: API/DB harness (dry-run + staging)

> **Trạng thái 2026-11-10:** `dry-run PASS` · `staging: NOT RUN` · **KHÔNG** đạt QA-MONEY-01.
> Lý do staging: worktree không có credential staging (xem §5).

## 1. Hành vi trước/sau

| Trước | Sau |
|---|---|
| `scripts/e2e/guest-order-flow.ts` chỉ chạy tay, không có npm script/CI | `npm run test:e2e:api` (dry-run mặc định) + self-test trong CI offline; dry-run chạy được **không cần credentials** |
| Dry-run thiếu `.env` → `env FAIL` + exit 1 | Dry-run thiếu `.env` → `env SKIP`, vẫn kiểm fixture, exit 0 (không gọi mạng) |
| `--live` có thể ghi DB ngay | **Fail-closed:** `--live` chỉ chạy khi `E2E_TARGET=staging` (trim/lowercase) **và** `E2E_ALLOW_LIVE=1`; mọi target khác (trống/`unknown`/`production`) → BLOCKED exit 2. Không có bypass production |
| Không có output máy đọc | `--json` (stdout) + `--report <path>` (file JSON cho CI artifact) |
| RLS test coi mọi lỗi là "đã chặn" | Chỉ `SQLSTATE 42501` / `row-level security` mới là PASS; lỗi khác là FAIL (không kết luận được) |
| Cleanup xoá nhưng không kiểm | Cleanup đọc lại `orders` để xác nhận đã sạch; `--cleanup-stale` dọn đơn `E2E-%` + admin tạm cũ |
| Payload in ra có thể lộ token | `secure_access_token` bị che (`<redacted>`); không in khoá |
| Requested step bị SKIP vẫn báo PASS | `result` có thêm `PARTIAL`; `--admin-session`/`--cleanup`/`--cleanup-stale` bị SKIP/BLOCKED ⇒ exit 1, không PASS |
| Probe lỗi khi có env bị SKIP/PASS | Có env mà `db.reachable` lỗi ⇒ **FAIL** ở mọi mode (dry-run lẫn live) |
| Crash giữa chừng bỏ rơi dữ liệu | `main()` bọc `try/finally`: dọn đơn/admin tạm dù throw sau insert/tạo admin |

## 2. File thay đổi

| File | Nội dung |
|---|---|
| `scripts/e2e/guest-order-flow.ts` | Fail-closed target, `PARTIAL` outcome, `try/finally` cleanup, probe chặt, `--cleanup-stale` dọn admin tạm, `--json`/`--report`, `E2E_ENV_FILE`, redact token |
| `package.json` | `test:e2e:api` → `tsx scripts/e2e/guest-order-flow.ts` |
| `.github/workflows/ci.yml` | Offline: self-test fixture. Live: guard `E2E_STAGING_SUPABASE_URL ≠ VITE_SUPABASE_URL`, dry-run read-only, live-write opt-in, artifact JSON |
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
| Dọn | `--cleanup` xoá đúng đơn của lượt chạy + đọc lại xác nhận; `--cleanup-stale` dọn mọi `E2E-%` + admin tạm `e2e-admin-*@vcube.test` cũ hơn 1 giờ |

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
| `E2E_TARGET=staging` | **bắt buộc để `--live`**; chỉ đúng chuỗi `staging` (sau trim/lowercase). Giá trị khác → BLOCKED |
| `E2E_ALLOW_LIVE=1` | bắt buộc thêm để `--live` ghi DB |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | phiên admin thật cho bước confirm (nếu `--admin-session`) |

Không còn biến `E2E_ALLOW_PRODUCTION`: harness **không** hỗ trợ ghi production.

## 5. Kết quả chạy trong worktree (2026-11-10)

Môi trường: worktree `wave1/qa`, **không có `.env`**, không có credential staging.

| Lệnh | Kết quả | Exit |
|---|---|---:|
| `npx tsc --noEmit` | PASS (0 lỗi) | 0 |
| `npm run test:e2e:api` | `fixture.valid PASS`; `env SKIP`; 6 SKIP; **RESULT=PASS** (dry-run) | 0 |
| `npm run test:e2e:api -- --json --report …` | JSON hợp lệ, `result=PASS`, `mode=dry-run`, ghi file OK | 0 |
| `npm run test:e2e:api -- --admin-session` (không credential) | `admin.signin/confirm SKIP` ⇒ **RESULT=PARTIAL** | 1 |
| `--live` target trống/`unknown` | `guard.target BLOCKED` ⇒ RESULT=FAIL | 2 |
| `--live` target `PRODUCTION` (kể cả allow live) | `guard.target BLOCKED` ⇒ RESULT=FAIL | 2 |
| `--live` target `staging` thiếu `E2E_ALLOW_LIVE` | `guard.live BLOCKED` ⇒ RESULT=FAIL | 2 |
| `--live` staging + allow + credential sai | `db.reachable FAIL` ⇒ RESULT=FAIL | 1 |
| dry-run có env nhưng DB không kết nối | `db.reachable FAIL` (không còn SKIP) ⇒ RESULT=FAIL | 1 |
| `--live` thiếu credential | `env FAIL` | 1 |
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
- **Live job:**
  1. Dò secret `E2E_STAGING_*`.
  2. **Guard URL:** chuẩn hoá (trim/lowercase/bỏ `/` cuối) và so
     `E2E_STAGING_SUPABASE_URL` với `VITE_SUPABASE_URL`; trùng hoặc thiếu URL production →
     `::error::` + RC 1, **không** chạy dry-run/live-write.
  3. Dry-run read-only chỉ với env staging.
  4. Live-write chỉ khi guard URL pass **và** repo variable `E2E_LIVE_WRITE=true`; dùng
     `E2E_ENV_FILE` staging riêng để không ghi nhầm production. `--admin-session` chỉ thêm khi
     có `E2E_STAGING_ADMIN_*`; thiếu admin thì live guest/RLS vẫn PASS, không bị `PARTIAL` oan.
  5. Report JSON upload làm artifact `qa-api-01-report`.
- Thêm secret staging không làm đỏ job offline.

### Vì sao KHÔNG thêm `test:e2e:api` vào `scripts/gate-manifest.json`

- `npm run check` hiện là offline gate thuần (không cần Supabase). Harness đã có self-test
  fixture trong CI offline ở trên, nên không cần chạy lặp trong `check`.
- Đưa vào manifest dễ khiến người chạy `npm run check` tưởng gate đã “live”; trong khi live
  phải là bước riêng có secret staging + guard URL.
- Phạm vi review này chỉ cho sửa `scripts/e2e`, `package.json`, CI, docs; `scripts/gate-manifest.json`
  nằm ngoài phạm vi. Nếu PO muốn, thêm 1 gate `test-e2e-api` với `cmd: npm run test:e2e:api`
  (rc=0, offline) là thay đổi 1 dòng — không chặn gì.

## 8. Ba mức — không được gộp

| Bằng chứng | Đã có? |
|---|---|
| Unit/lint | ✅ (verifier chạy riêng) |
| Harness dry-run | ✅ PASS (mục §5) |
| Browser smoke | ✅ public/mock; console BLOCKED (xem `qa-browser-01-evidence.md`) |
| Staging API/DB live | ❌ NOT RUN |
| QA-MONEY-01 (transaction + dispatch + tracking) | ❌ **KHÔNG ĐẠT** |

## 9. Đối chiếu review (2026-11-10)

| Mã | Trạng thái | Bằng chứng |
|---|---|---|
| P1-1 fail-closed target | ✅ | Chỉ `TARGET === 'staging'`; unknown/production → `guard.target BLOCKED`, exit 2 |
| P1-2 CI staging vs production | ✅ | Step `Guard staging URL khác production`, RC 1 nếu trùng/thiếu URL production |
| P1-3 report PASS dù SKIP/BLOCKED | ✅ | `result=PASS/PARTIAL/FAIL`; requested step thiếu PASS ⇒ PARTIAL exit 1; guard ⇒ exit 2 |
| P2-1 try/finally + stale admin | ✅ | `finally` dọn admin tạm + đơn đã insert; `--cleanup-stale` xoá admin `e2e-admin-*@vcube.test` cũ >1 giờ |
| P2-2 probe lỗi | ✅ | Có env mà probe lỗi ⇒ `db.reachable FAIL` (cả dry-run/live) |
| P3-5 gate-manifest | ✅ (có lý do) | Không thêm; xem §7 “Vì sao KHÔNG thêm…” |
| P2-3/P2-4 evidence | ✅ | Mục §5 + `qa-browser-01-evidence.md` ghi rõ môi trường/độ tái lập và giới hạn public/mock |
