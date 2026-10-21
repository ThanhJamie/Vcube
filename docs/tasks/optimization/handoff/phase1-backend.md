<!-- doc-meta: status=active; verified=2026-10-21; owner=commerce-auth -->
# HANDOFF — Phase 1 backend dead-code removal (task-18)

> **Trạng thái: DONE.** 7 file thay đổi (4 xoá + 3 sửa): **−552 LOC net** (`553 deletions − 1 insertion`).
> `npm run lint` PASS · `npm run build` PASS · 5 gate offline PASS · grep ký hiệu đã xoá = **0**.
> Không commit. Không sửa file ngoài write scope task-18 (không đụng `workshopService` legacy/`SEED_*`,
> `App.tsx`, frontend UI, migrations, `package.json`).

---

## 1. Files deleted (4 — D01–D04)

| ID | File | LOC | SHA-256 trước khi xoá | Bằng chứng 0 importer |
|---|---|---:|---|---|
| D01 | `src/backend/index.ts` | 8 | `9a69f7a9…a99c0` | grep 0 `from '@backend'` / `from '../backend'` / `backend/index` trong `src/` + `scripts/` |
| D02 | `src/backend/services/catalogService.ts` | 34 | `881e9713…d576` | chỉ được `backend/index.ts:7` re-export (đã xoá cùng cụm) |
| D03 | `src/backend/services/pricingService.ts` | 46 | `792d4111…23c8` | chỉ được `backend/index.ts:6` re-export |
| D04 | `src/backend/supabase/seedService.ts` | 134 | `5266633d…3160` | chỉ được `backend/index.ts:4`; `mappers.ts:377` còn 1 comment lịch sử (giữ nguyên theo `DEAD-CODE.md` §8) |

**Xoá cụm theo đúng thứ tự DEAD-CODE §9:** D02–D04 → D01. Sau khi xoá, `@backend/*` vẫn hoạt động
(vite/tsconfig alias trỏ `src/backend`, mọi import là deep path, không import barrel).

---

## 2. Files edited (3)

| File | Thay đổi | LOC |
|---|---|---:|
| `src/backend/supabase/client.ts` | **D14**: xoá `createBrowserClient()` + `export { createBrowserClient as createClient }`. Giữ **named `supabase`** (dùng bởi 7 service + `AuthContext` + `App`) và **default `supabase`** theo chỉ đạo task. | 43 → **38** (−5) |
| `src/backend/supabase/database.ts` | **D13a–D13f**: xoá 6 method 0 caller `seedInitialProductsIfEmpty` (16), `uploadProductImage` (39), `uploadCadFile` (28), `saveUser` (24), `savePricingConfig` (31), `recordPaymentTransaction` (31). Xoá helper chỉ phục vụ chúng: `CAD_MIME_BY_EXTENSION` + `sanitizeCadFileName()` (~48 dòng gồm docblock). Sửa 1 comment stale trong `saveSiteContent` ("xem savePricingConfig" → "DB là nguồn duy nhất"). **Không** xoá `toIsoTimestampOrNull` (còn dùng bởi `saveOrder`), `mapOrderRow`, `rowTo*`, `ok/fail` (còn dùng). | 1017 → **800** (−217) |
| `src/types/index.ts` | **D12a–D12h**: xoá 8 type chết `QuoteTierType`, `QuoteSnapshot`, `ProductLicensingConfig`, `DispatchAssignment`, `QualityControlRecord`, `AdminTab`, `InkiriCalculationInput`, `InkiriCalculationResult`. Giữ `AdminNavSection` (còn dùng). Không import nào phải sửa vì cả 8 type không có ref ngoài file. | 1136 → **1028** (−108) |

---

## 3. LOC removed — tổng hợp

| Nguồn | LOC |
|---|---:|
| 4 file xoá (D01–D04) | 222 |
| `client.ts` (D14) | 5 |
| `database.ts` (D13a–f + helper) | 217 |
| `types/index.ts` (D12a–h) | 108 |
| **Tổng net** (`git diff --stat`: 553−1) | **552** |

---

## 4. Bằng chứng grep (chạy sau khi sửa, trên working tree hiện tại)

```bash
# 1) Ký hiệu đã xoá còn ref nào trong src/ + scripts/ không
grep -rn "seedInitialProductsIfEmpty\|uploadProductImage\|uploadCadFile\|recordPaymentTransaction\|createBrowserClient\|QuoteTierType\|QuoteSnapshot\|ProductLicensingConfig\|DispatchAssignment\|QualityControlRecord\|AdminTab\|InkiriCalculationInput\|InkiriCalculationResult" src/ scripts/ --include=*.ts --include=*.tsx --include=*.mjs
# ⇒ rc=1 (0 match). Các hit còn lại chỉ nằm trong docs/ (DEAD-CODE/04-refactor/as-is/plans — tài liệu lịch sử, đúng DEAD-CODE §8).
# Lưu ý: `savePricingConfig` vẫn tồn tại ở `src/backend/services/settingsService.ts` (hàm khác, App.tsx đang dùng)

# 2) Import barrel backend (D01) còn không
grep -rnE "from ['\"](\.\./)*backend/src/backend|from ['\"]@backend['\"]|from ['\"]\./backend['\"]|from ['\"]\.\./backend['\"]" src/ scripts/
# ⇒ rc=1 (0 match)

# 3) Không còn method dbService 0-caller
grep -n "seedInitialProductsIfEmpty\|uploadProductImage\|uploadCadFile\|recordPaymentTransaction\|sanitizeCadFileName\|CAD_MIME_BY_EXTENSION" src/backend/supabase/database.ts
# ⇒ rc=1 (0 match)
```

Kiểm thêm: mọi import còn lại của `database.ts` vẫn được dùng (`AppUserProfile`, `InkiriCostFormulaConfig`,
`rowToUserProfile`, `ok/fail/WriteResult`…); không còn import/helper mồ côi.

---

## 5. Gate results (2026-10-21, working tree hiện tại)

| Gate | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS** — 0 lỗi |
| `npm run build` | **PASS** — `✓ built in 5.67s` |
| `node scripts/check-fabricated.mjs` | **PASS** (rc=0) |
| `node scripts/check-ui-rules.mjs` | **PASS** (rc=0) |
| `node scripts/check-contrast.mjs` | **PASS** (rc=0) |
| `node scripts/check-contrast-combos.mjs` | **PASS** (rc=0) |
| `node scripts/check-icon-names.mjs` | **PASS** (rc=0) |
| `npm run check` đầy đủ | **Không chạy** — live gate (`verify-rls`/`inspect-db`) cần Supabase; task chỉ yêu cầu lint+build |

**Ghi chú race với Phase-1 UI (task-19):** lúc ~10:33–10:37 `design-foundation` tạm xoá 3 shim
`src/frontend/{utils/pricingEngine,types/index,data/mockData}.ts`; lint của tôi khi đó báo 2–17 lỗi
`TS2307 Cannot find module` **không liên quan backend**. Sau khi họ rollback (shim sống, D05–D07
deferred), tôi chạy lại: lint/build xanh. Bằng chứng cuối ở §5 được chạy **sau** khi cây ổn định.

---

## 6. Scope / không làm

- **Không** đụng `src/backend/services/workshopService.ts` (`SEED_*` + legacy `getWorkshop*`/`saveWorkshop*`) — deferred theo `DEAD-CODE.md` §8.
- **Không** đụng `App.tsx`, frontend UI/views, `package.json`, `vite.config.ts`, `supabase/**`, migrations, `.env`.
- **Không** xoá DB table/column nào (feature gap — `AUDIT.md` §6).
- `git status` cho `src/backend` + `src/types`: đúng 7 mục (4 D, 3 M), không file lạ.

---

## 7. Risks / follow-up

1. **Default export `supabase` giờ 0 importer** (`import supabase from …` = 0 sau khi D14 xoá alias). Task yêu cầu *giữ* default nên tôi không xoá; đề xuất Phase 2 bỏ nốt default export (hoặc chuyển mọi import sang named).
2. **`DEAD-CODE.md` D05–D07 sai** ("0 importer"): 3 shim `src/frontend/{utils/pricingEngine,types/index,data/mockData}.ts` là bridge đang sống (2 + 11 + 3 importer). `design-foundation` đã defer và rollback; cần sửa lại tài liệu DEAD-CODE để phase sau không xoá nhầm. **Không thuộc task-18** nhưng ảnh hưởng gate chung.
3. **Bundle**: `dist/assets/index-*.js` hiện 892,82 kB (240,15 kB gzip). Chênh lệch so với trước phase bị trộn bởi thay đổi của task-19/20 cùng cây nên **không quy kết** riêng cho task-18; không có regression build.
4. **`mappers.ts:377`** còn comment nhắc `seedService.syncFromSupabase` — cố ý giữ (lịch sử), không phải ref code.
5. `docs/tasks/optimization/AUDIT.md` ghi "`recordPaymentTransaction` 0 caller" vẫn đúng; sau khi xoá, bảng `payment_transactions` chỉ còn là **feature gap** (không drop).
