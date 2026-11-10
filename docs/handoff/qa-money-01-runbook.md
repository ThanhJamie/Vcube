<!-- doc-meta: status=blocked; verified=2026-11-10; owner=lead -->
# QA-MONEY-01 — Staging transactional runbook

**Trạng thái: BLOCKED — chưa có staging project/credential.**

## 0. Bằng chứng hiện tại

| Kiểm tra | Kết quả |
|---|---|
| `.env` có `E2E_STAGING_*` | **Không** |
| Process env có `E2E_STAGING_*` | **Không** |
| Supabase projects khả dụng (Management API, read-only) | **Chỉ 1 project: `VcubeV2` — production, ACTIVE_HEALTHY** |
| `npm run test:e2e:api` dry-run | **PASS** (3 PASS, 6 SKIP, 0 FAIL) |
| `--live` thiếu target/URL staging | **BLOCKED exit 2** (fail-closed) |
| QA-MONEY-01 | **NOT RUN** |

> Không chạy `--live` với `.env` production. Script đã chặn nếu `E2E_TARGET !== 'staging'` hoặc URL không khớp `E2E_STAGING_SUPABASE_URL`.

---

## 1. Điều kiện bắt buộc trước khi chạy

- [ ] Một **Supabase project staging riêng**, không trùng `VITE_SUPABASE_URL` production.
- [ ] Đã áp migrations/RLS trên staging (chuỗi `supabase/migrations/*.sql`).
- [ ] Có admin staging (`E2E_STAGING_ADMIN_EMAIL` / `_PASSWORD`) với `user_profiles.role='admin'`.
- [ ] Có fixture product/pricing/material/printer tối thiểu để tạo order; hoặc chấp nhận order guest với item snapshot.
- [ ] PO/Ops **duyệt ghi DB staging** và **xoá record `E2E-`** sau test.
- [ ] Không cấp secret production vào biến `E2E_STAGING_*`.

---

## 2. Env cần cấp

Tạo file staging riêng (không commit), ví dụ `/tmp/opencode/e2e-staging.env`:

```dotenv
E2E_TARGET=staging
E2E_ALLOW_LIVE=1
E2E_STAGING_SUPABASE_URL=https://<staging-ref>.supabase.co
E2E_STAGING_PUBLISHABLE_KEY=sb_publishable_<staging>
E2E_STAGING_SECRET_KEY=sb_secret_<staging>        # server-only, không in log
E2E_STAGING_ADMIN_EMAIL=<admin-staging>
E2E_STAGING_ADMIN_PASSWORD=<password>
E2E_ENV_FILE=/tmp/opencode/e2e-staging.env
```

Chạy từ repo root; script ưu tiên process env, không dùng `.env` production cho `E2E_*`.

---

## 3. Lệnh chạy

```bash
# 1) Dry-run fixture (không ghi DB)
npm run test:e2e:api -- --json --report /tmp/opencode/qa-money-dry.json

# 2) Live staging có admin confirm + cleanup
set -a; source /tmp/opencode/e2e-staging.env; set +a
npm run test:e2e:api -- --live --admin-session --cleanup \
  --json --report /tmp/opencode/qa-money-live.json

# 3) Nếu lần trước bị gián đoạn, dọn stale (chỉ staging)
set -a; source /tmp/opencode/e2e-staging.env; set +a
npm run test:e2e:api -- --live --cleanup-stale
```

**Không chạy** nếu `E2E_STAGING_SUPABASE_URL` trùng `VITE_SUPABASE_URL`; script guard sẽ BLOCKED, nhưng vẫn phải kiểm bằng mắt.

---

## 4. Luồng QA-MONEY-01

1. Guest tạo order (`E2E-...`) + token.
2. Admin staging đăng nhập → xác nhận đã nhận tiền (manual).
3. Assert DB:
   - `orders.payment_status = 'paid'`
   - `order_items` có dòng tiền
   - `payment_transactions.status = 'paid'`
4. Admin dispatch order → `assigned_workshop_id`.
5. Lab staging cập nhật stage/status.
6. Guest tracking bằng code + token trả đúng trạng thái.
7. Cleanup:
   - xoá order `E2E-` + cascade items/payment/files
   - xoá admin tạm nếu script tạo
   - đọc lại xác nhận 0 row.

---

## 5. Acceptance

- [ ] `result=PASS` (không phải `PARTIAL`), exit 0.
- [ ] Report JSON có đủ `guest.insert`, `admin.confirm`, `cleanup` **PASS** (không SKIP/BLOCKED).
- [ ] DB staging có `orders`, `order_items`, `payment_transactions` đúng; sau cleanup **0** row `E2E-%`.
- [ ] Tracking guest trả đúng order vừa tạo.
- [ ] Không có record nào trên production.
- [ ] Không leak secret/token trong log/report.

---

## 6. Test không đạt nếu

- Chỉ dry-run PASS.
- Chỉ API trả 200 mà không assert DB.
- `admin.confirm = SKIP` hoặc `admin.signin = BLOCKED`.
- Cleanup chưa chạy/không xác nhận.
- Dùng production làm staging hoặc secret production trong biến staging.

---

## 7. Owner / phối hợp

| Việc | Owner |
|---|---|
| Tạo/chọn staging project, áp migration | Ops/DB owner |
| Cấp `E2E_STAGING_*` + admin staging | PO/Ops |
| Duyệt ghi/xoá fixture `E2E-` trên staging | PO |
| Chạy runbook + lưu report | QA/Lead |
| Xác nhận cleanup | QA/Lead |

---

## 8. Sau khi pass

- Đánh dấu **QA-MONEY-01 DONE** với report path + DB counts.
- Mở **DATA-02** (publish catalog thật) sau UI-01 + QA-MONEY-01.
- SEO-02 sau domain + published catalog.
- Không đánh dấu Phase 0 DONE nếu staging chưa pass.
