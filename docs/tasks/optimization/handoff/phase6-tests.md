<!-- doc-meta: status=active; verified=2026-10-21; owner=admin -->
# HANDOFF — Phase 6b: bộ unit test thật (`node:test` + `tsx`)

> **Work item:** `task-38` · **Agent:** `admin` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `8a3d4aa` (Phase 1–4 đã push)
> **Không commit/push. Không thêm dependency.** Không sửa `src/**`.
> Phạm vi đã chạm: `tests/unit/**` (5 file mới) + `package.json` (1 script) + file handoff này.
>
> ## ✅ VERDICT: **DONE** — 5 file test / **71 test case** / **277 assert** · `npm run test:unit` PASS toàn bộ
> (71 pass, 0 fail, ~441ms) · `npm run lint` PASS · không đổi gate/`npm run check`.

---

## 1. File test & số case

| File | Module được test | Test case | Assert | Trọng tâm khoá lại |
|---|---|---:|---:|---|
| `tests/unit/format.test.ts` | `src/frontend/lib/format.ts` | 10 | 42 | số/tiền `vi-VN` (`.` nghìn, `,` thập phân), `EMPTY_VALUE='—'` cho `null/NaN/''`, ngày `dd/MM/yyyy`, `formatDateTime` 24h, bytes SI/binary, weight g→kg |
| `tests/unit/vat.test.ts` | `src/frontend/lib/vat.ts` | 8 | 23 | `vatRateFromPercent` (8→0.08, `null`/NaN→null), `computeVat`: `null`⇒null (ẩn dòng VAT), `0`⇒0 (VAT 0% thật), `Math.round`, chặn âm, nhãn + câu "chưa cấu hình" |
| `tests/unit/mappers.test.ts` | `src/backend/supabase/mappers.ts` | 22 | 95 | product/material/printer/accessory/order/user/site_content/workshop_partner/app_settings/custom_design_request; luật **null ≠ 0**, KYC không bao giờ mặc định `verified`, cờ chỉ `=== true`, `''`/khoảng trắng ⇒ `null`, round-trip `appSettingsToRow` |
| `tests/unit/pricingEngine.test.ts` | `src/utils/pricingEngine.ts` | 19 | 64 | `computeElectricityCostVnd`/`computeLaborCostVnd`, `calculateManualInkiriEstimate` (đủ tầng chi phí + lãi + ceil 1.000đ + sàn tuổi thọ 100h), `generateDeliveryPackages` (3 gói, ±%, ceil), **guard `PricingUnavailableError`** (`no_formula_config`, `no_printer`, `no_material`, `no_electricity_rate`, `missing_params` nêu tên cột, `profit_mode_margin_unsupported`), happy-path `calculateDetailedPricing` + chia 3 bên |
| `tests/unit/settingsValidators.test.ts` | validator thuần trong `src/backend/services/settingsService.ts` | 12 | 53 | trống = "chưa cấu hình" hợp lệ, MST VN, VAT 0–20, phí nền tảng 0–30, ship/điện/nhân công ≥0, email/hotline/bank, `validateSetting`/`validatePatch` |
| **Tổng** | — | **71** | **277** | 24 suite (`describe`) |

Yêu cầu tối thiểu ≥4 file / ≥25 assert ⇒ **vượt** (5 file / 277 assert).
Test dùng đúng API yêu cầu: `import { describe, test } from 'node:test'` + `import assert from 'node:assert/strict'`.
Mỗi test có tên VI rõ nghĩa + comment ngắn "vì sao quan trọng" (data-honesty / pricing correctness).

---

## 2. Script & cách chạy

`package.json` (chỉ thêm 1 dòng, giữ nguyên các script khác):

```diff
     "check": "node scripts/run-checks.mjs",
+    "test:unit": "tsx --test tests/unit/*.test.ts",
     "skills:sync": "node scripts/sync-mattpocock-skills.mjs"
```

Chạy:

```bash
cd /home/thanh/home/thanh/project/Vcube
npm run test:unit
```

Output (lần chạy chính thức, RC=0):

```text
> react-example@0.0.0 test:unit
> tsx --test tests/unit/*.test.ts

▶ format — số & tiền theo vi-VN
  ✔ hằng số locale/mặc định khớp quy ước dự án (0.802785ms)
  ...
ℹ tests 71
ℹ suites 24
ℹ pass 71
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 441.202568
```

- `tsx --test` hoạt động trên `tsx@4.21` + Node `v24.12` của môi trường (không cần fallback
  `node --import tsx --test`).
- **Cảnh báo không phải lỗi:** log `[vcube] Supabase CHƯA được cấu hình …` xuất hiện 2 lần —
  đó là `console.error` có chủ đích trong `src/backend/supabase/client.ts` khi import
  `settingsService` mà thiếu env; unit test không gọi mạng. Không ảnh hưởng PASS/FAIL.
  (Nếu muốn im: set `NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY` khi chạy — chưa làm để giữ script đúng
  dạng chuẩn `tsx --test …`.)

---

## 3. Lint / typecheck

| Gate | Kết quả | Ghi chú |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS (RC=0)** | tests/** **ngoài** `tsconfig.json` include (`src/**/*`, `vite.config.ts`) ⇒ lint không quét test. Không sửa tsconfig (ngoài write scope) |
| Typecheck bổ sung cho tests | **PASS (RC=0)** | Chạy `tsc --noEmit` với tsconfig tạm `include: ["src/**/*","tests/unit/**/*"]`; **0 lỗi**, file tạm đã xoá. Test không dùng `any`, không `as` bừa; fixture gõ đủ type (`PrinterProfile`, `MaterialProfile`, `AnalysisFile`, `InkiriCostFormulaConfig`) |
| `npm run check` / `scripts/gate-manifest.json` | **KHÔNG đổi** | Thêm gate sẽ cần sửa `docs/tasks/baseline.json` (ngoài write scope) + xác nhận format violation-count ⇒ để follow-up §6 |

---

## 4. Hành vi đã khoá (các quyết định quan trọng)

1. **Data-honesty số liệu:** `format*` trả `—` cho `null/undefined/NaN/''`; mapper giữ `null`
   cho cột nullable (`density`, `costPerKg`, `bedDimensions`, `powerKW`, …) và giữ `0` nếu DB
   ghi 0 — đúng luật "null hay 0" trong `mappers.ts`.
2. **KYC không bao giờ mặc định verified:** `rowToUserProfile({})` ⇒ `unverified`;
   `pending_review` ⇒ `pending` (AT-05).
3. **Pricing không bịa số:** mọi trường hợp thiếu tham số đều ném `PricingUnavailableError`
   đúng `code`; đặc biệt `marketplace_fee_percent` NULL ⇒ `missing_params` có tên cột, chứ
   không rơi về 0%/8% (Đợt Q #4).
4. **VAT:** `null` (chưa cấu hình) ≠ `0` (VAT 0%); dòng VAT ẩn khi `null`, không in `0%`.
5. **Làm tròn tiền:** `computeVat` làm tròn về đồng; gói giao hàng ceil bội số 1.000đ; bộ ước
   lượng thủ công ceil 1.000đ + `grossMarginPercent` 1 chữ số thập phân.
6. **Chia 3 bên:** tổng `gateway + royalty + workshop + platform === gross` (test bất biến).

**Quan sát nhỏ (không sửa `src/**` theo yêu cầu, chỉ báo Lead):**

- `formatDateTime` với `Intl vi-VN` in **giờ trước ngày** (`"14:30 09/12/2026"`), trong khi
  comment đầu `format.ts` ghi ví dụ `"09/12/2026 14:30"` — **sai tài liệu**, không sai hành vi.
  Test đang khoá hành vi thật. Nên sửa comment trong đợt docs.
- `rowToSiteContent` luôn set cả nhóm khoá SEO (giá trị `undefined` khi `defaults` không khai
  khoá đó) ⇒ `deepEqual` với defaults cần so từng khoá; không bịa giá trị, chỉ là key
  `undefined` xuất hiện. Test đã ghi nhận đúng hành vi này.
- `rowToAccessory.isActive` dùng `d.in_stock ?? d.is_active ?? false` (trả nguyên giá trị DB)
  trong khi các cờ khác dùng `=== true`; với cột boolean hiện tại không sai, nhưng nếu DB trả
  `'false'`/`1` thì type sẽ lệch — **quan sát**, chưa phải bug trong phạm vi test.

---

## 5. Giới hạn (đúng phạm vi task)

- **Unit thuần**: không DOM/React component, không hook, không Supabase thật, không mock mạng.
  Vì vậy các luồng `QuoteSummaryPanel`/`PricingConfigPanel`/`CheckoutView` render chưa được test.
- `comparePrintersForModel` **chưa test happy-path**: nó gọi `calculateDetailedPricing` mà không
  truyền `globalRates` (đọc cache settings) ⇒ trong môi trường unit sẽ chặn bởi guard
  `rates_loading`. Muốn test cần reset/seed cache settings (integration).
- Các hàm cần `Date.now()` (`rowToOrderForSync` default date, `escrowReleaseDate`) chỉ assert
  định dạng/parse được, không assert giá trị tuyệt đối.
- Test không bao phủ UI copy/aria — thuộc phạm vi review/QA.

---

## 6. Follow-up đề xuất

1. **Wiring CI/gate:** thêm `{ "id": "test-unit", "cmd": "npm run test:unit" }` vào
   `scripts/gate-manifest.json` + entry baseline tương ứng trong `docs/tasks/baseline.json`
   (cần quyền sửa baseline — ngoài write scope task này). Sau đó `npm run check` sẽ chạy test.
2. **Lint test:** thêm `tsconfig.test.json` (hoặc mở rộng include) để `npm run lint` typecheck
   luôn `tests/**`; hiện đã xác minh sạch bằng tsconfig tạm.
3. **Integration test (Phase 6 khác):** Supabase resume + fixtures/seed → test `database.ts`,
   `settingsService.bootstrapSettings`, realtime mapper, `comparePrintersForModel` happy-path.
   Cần môi trường/DB, không làm được khi Supabase paused.
4. **DOM/component test:** nếu muốn, cần quyết định thêm devDeps (jsdom + testing-library) —
   trái ràng buộc "không thêm dependency" của đợt này ⇒ xin Lead duyệt riêng.
5. Sửa comment `formatDateTime` cho khớp hành vi Intl `vi-VN` (giờ trước ngày).

---

## 7. Lệnh tái lập

```bash
cd /home/thanh/home/thanh/project/Vcube

# 1) chạy unit test (RC=0, 71 pass)
npm run test:unit

# 2) lint repo
npm run lint

# 3) typecheck tests (tuỳ chọn, file tạm — xoá sau)
cat > tsconfig.tests-check.json <<'JSON'
{ "extends": "./tsconfig.json",
  "include": ["src/**/*", "tests/unit/**/*"],
  "exclude": ["node_modules", "dist", "dist-ssr"] }
JSON
npx tsc --noEmit -p tsconfig.tests-check.json && rm tsconfig.tests-check.json

# 4) xem thay đổi của task
git status --short -- tests/ package.json
git diff -- package.json
```
