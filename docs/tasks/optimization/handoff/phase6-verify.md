<!-- doc-meta: status=active; verified=2026-10-21; owner=pdp-viewer -->
# HANDOFF — Phase 6d: independent verification (docs-as-code · unit tests · cleanup shims/i18n/icon · final bundle)

> **Work item:** `task-40` · **Agent:** `pdp-viewer` (independent verifier) · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `8a3d4aa` (Phase 1–4 pushed) + working tree Phase 6 chưa commit.
> **Read-only `src/**`; không commit/push.** Chỉ ghi file handoff này. Không thêm dependency, không sửa `supabase/**`.
>
> ## ⚖️ VERDICT: **GO-WITH-RISKS**
>
> Toàn bộ gate cứng **XANH** (lint/build/test:unit/10 offline gates/smoke 24 check/DB recount/routes idempotent/
> shim+i18n+icon sạch). Được phép commit Phase 6. **3 việc docs nên sửa trước/ngay sau commit** (§10):
> (a) 2 canonical docs còn nhắc shim đã xoá; (b) `DEAD-CODE.md`/`04-refactor.md`/`optimization/README` vẫn ghi
> D05–D07 “HOÃN” dù đã xoá ở 6c; (c) `test:unit` chưa wire vào `gate-manifest` nên `npm run check` không chạy test.

---

## 0. Tóm tắt bằng chứng

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Unit test | **71 test / 24 suite / 277 assert PASS** (0 fail, ~443ms) | §1 |
| Test có ý nghĩa | 5/5 file import module thật; spot-check khớp code | §1.2 |
| Shim D05–D07 | **53/53 dòng rewrite resolve đúng shim**; 0 importer còn lại; không sửa nhầm `../../types` thật | §2 |
| i18n | **85→28 key**; 57 key xoá **0 tham chiếu**; 18 used + 10 `''` giữ; 1 chuỗi VI đổi có chủ ý | §3 |
| Icon | **205 glyph** (HEAD 206); `cloud_sync` 0 ref; gate PASS; docs khớp | §4 |
| Docs routes | 30 route, `source-sha256 f0bd92f499c9` khớp file thật; **2 lần chạy byte-identical** | §5.1 |
| DB numbers | Tự đếm: **12 migration / 32 bảng / 2 view / 19 hàm / 9 trigger defs (~29 instance) / 92 policy / 7 storage / 1 realtime** — khớp AGENTS+schema+RLS docs | §5.2 |
| Gates | lint PASS · `rm -rf dist && npm run build` PASS · test:unit PASS · 10 offline gates **KHÔNG TỆ HƠN BASELINE** · doc-freshness **0** · doc-refs advisory **307** | §6 |
| Bundle | Initial critical gzip **278.448 → 277.066 (−1.382 B, −0.50%)**; index **186.957 → 185.575**; **39 chunk**; lazy set đủ; three async | §7 |
| Smoke | **12 route × 390/1440 = 24 check: 0 pageerror, 0 console error, 0 tràn ngang, 0 màn trắng**; canvas Home/PDP mount; add-to-cart toast; guard redirect đúng | §8 |
| Scope/circular | 67 file diff đúng 3 task + 4 untracked (tests + 3 handoff); package.json chỉ 1 script; 0 supabase; **0 circular import**; 0 file >2.000 dòng | §9 |

---

## 1. Unit tests (`tests/unit/*.test.ts` ×5)

### 1.1 Chạy thật

```text
$ npm run test:unit          # = tsx --test tests/unit/*.test.ts
ℹ tests 71 · suites 24 · pass 71 · fail 0 · cancelled 0 · skipped 0
ℹ duration_ms 442.7          (RC=0)
```

Đếm độc lập trên source test (không tin output):

| File | Module thật được import | test | describe | assert |
|---|---|---:|---:|---:|
| `tests/unit/format.test.ts` | `../../src/frontend/lib/format` | 10 | 1 | 42 |
| `tests/unit/vat.test.ts` | `../../src/frontend/lib/vat` | 8 | 3 | 23 |
| `tests/unit/mappers.test.ts` | `../../src/backend/supabase/mappers` + `src/data/mockData` | 22 | 9 | 95 |
| `tests/unit/pricingEngine.test.ts` | `../../src/utils/pricingEngine` + `src/data/mockData` + `src/types` | 19 | 6 | 64 |
| `tests/unit/settingsValidators.test.ts` | `../../src/backend/services/settingsService` | 12 | 5 | 53 |
| **Tổng** | — | **71** | **24** | **277** |

- Mọi file dùng `import { describe, test } from 'node:test'` + `assert from 'node:assert/strict'`; **không** mock/mạng/DB,
  **không** assert trivial (`assert.ok(true)`), **không** fixture bịa: dữ liệu test dựng từ type thật (`Product`,
  `MaterialProfile`, `PrinterProfile`, `InkiriCostFormulaConfig`).
- `tests/**` **ngoài `tsconfig.json`** (`include: ["src/**/*","vite.config.ts"]`) ⇒ `npm run lint` **không**
  typecheck test; điều này đúng như handoff 6b ghi, nhưng là follow-up (thêm `tsconfig.test.json`).
- `scripts/gate-manifest.json` + `docs/tasks/baseline.json`: **không đổi** (`git status` 0) ⇒ `npm run check`
  hiện **chưa** chạy `test:unit` (xem §10-c).

### 1.2 Spot-check test ⇄ code thật (2 chỗ then chốt)

1. **VAT `null` ≠ `0`** — `src/frontend/lib/vat.ts:76-88`: `computeVat(taxable, rate)` trả `null` khi
   `rate === null || !Number.isFinite(rate)`, else `{rate, taxableAmount: max(0,round), amount: round(base*rate), total}`.
   Test `vat.test.ts:37-46` khẳng định `computeVat(1_000_000, null) === null`, `rate=0` ⇒ `{amount:0,total:1_000_000}`
   (deepEqual). **Khớp hành vi**, đúng luật data-honesty “chưa cấu hình ≠ VAT 0%”.
2. **`PricingUnavailableError` codes** — `src/utils/pricingEngine.ts:145-152` class giữ `name/code/message`; các guard ném
   `no_printer`, `no_material`, `no_electricity_rate`, `missing_params`… Test `pricingEngine.test.ts:115-131` dùng helper
   `expectCode` bắt `instanceof` + `assert.equal(error.code, code)` và `assert.fail` nếu không ném; có case
   `missing_params` liệt kê tên cột. **Khớp code**, không test đồ chơi.
3. Ghi nhận của builder 6b (không phải bug): `formatDateTime` với `Intl vi-VN` in giờ trước ngày, comment cũ ghi
   ngược — test đang khoá **hành vi thật**; nên sửa comment (follow-up docs).

---

## 2. Shim D05–D07 — xoá 3 file + rewrite 53 dòng/46 file

### 2.1 Trạng thái

```text
$ git status --short | grep '^ D'
 D src/frontend/data/mockData.ts
 D src/frontend/types/index.ts
 D src/frontend/utils/pricingEngine.ts
$ grep -rn "frontend/data/mockData\|frontend/types\|frontend/utils/pricingEngine" src/ | wc -l
0
```

Alias canonical (khớp `tsconfig.paths`: `@/* → ./src/*`):

| Alias | File thật | Số dòng import |
|---|---|---:|
| `@/types` | `src/types/index.ts` | 55 (53 rewrite + 2 sẵn có) |
| `@/data/mockData` | `src/data/mockData.ts` | 6 |
| `@/utils/pricingEngine` | `src/utils/pricingEngine.ts` | 2 |
| **Tổng rewrite** | — | **53 dòng / 46 file** |

### 2.2 Kiểm “không sửa nhầm” (resolve theo đường dẫn thật, không theo chuỗi)

Script verifier độc lập (Python, `/tmp/p6-rewrites.json`):
- Trích **tất cả dòng import bị xoá** trong 46 file từ `git diff -U0`; resolve tương đối từ vị trí file
  (`.ts/.tsx/index.ts`) ⇒ **53/53 dòng resolve đúng một trong 3 shim** (0 mis-rewrite).
- Quét toàn bộ `src/**`: **0 importer còn trỏ shim**.
- **90 import tương đối vẫn trỏ module THẬT** và **không bị sửa**, ví dụ:
  `src/App.tsx './types' → src/types/index.ts`; `src/utils/pricingEngine.ts '../types' → src/types/index.ts`;
  `src/backend/services/workshop/*.ts '../../../types' → src/types/index.ts`;
  `src/frontend/hooks/* '../../types' → src/types/index.ts` (đúng cảnh báo “đừng sửa `../../types` trỏ src/types thật”).
- 5 file vừa rewrite vừa **giữ** import tương đối thật trong cùng file (đúng): `PricingConfigPanel.tsx`
  (`../../../utils/pricingEngine → src/utils/pricingEngine.ts`), `group1/{MaterialsTab,PartnersTab}.tsx`
  (`./types → group1/types.ts`), …
- **Mẫu 8 file (2 Phase-4-new + 6 cũ) resolve đúng target canonical:**
  `group1/MaterialsTab.tsx`, `group1/PartnersTab.tsx` (tạo ở commit Phase 4 `8a3d4aa`), `AuthModal.tsx`, `Header.tsx`,
  `InvoiceModal.tsx`, `RoleGuard.tsx`, `admin/AccessoriesManager.tsx`, `admin/AdminProductsPanel.tsx` →
  `src/types/index.ts` (+ `src/data/mockData.ts` cho AdminProductsPanel).
- `tsc --noEmit` PASS + build PASS ⇒ resolve alias đúng (điều kiện đủ để xoá shim).

> Đếm thêm: **14** trong 46 file rewrite là file **mới sinh ở Phase 4** (kiểm `git show --diff-filter=A 8a3d4aa`),
> khớp giải trình “audit cũ ghi ~16 importer nhưng Phase 4 sinh thêm file”.

---

## 3. i18n cleanup (`LanguageContext`)

Parse độc lập DICTIONARY hiện tại vs `git show HEAD:src/frontend/context/LanguageContext.tsx`:

| Chỉ số | Trước (HEAD) | Sau (working tree) | Kết luận |
|---|---:|---:|---|
| Key trong `DICTIONARY` | **85** | **28** | đúng claim |
| Key bị xoá | — | **57** (tất cả non-empty) | — |
| Key xoá còn tham chiếu (`t('k')`/`DICTIONARY.k`/`DICTIONARY['k']`) | — | **0** | ✅ không xoá nhầm |
| Key giữ có tham chiếu | — | **18/18** | đúng danh sách handoff 6c |
| Key giữ `vi: ''` (intentional) | — | **10** | đúng danh sách Nhóm A/C |
| Chuỗi VI của key giữ bị đổi | — | **1** (`searchPlaceholder`, cố ý sửa EN) | chấp nhận |

- Quét `t(...)` **động**: chỉ 1 call-site `t(key)` nội bộ trong `LanguageContext.tsx` (không phải consumer) ⇒
  không có key dùng động ngoài tầm scanner.
- **Quan sát pre-existing (không phải regression Phase 6):** 7 literal `t('key')` trỏ key **không có trong
  dictionary cả trước lẫn sau** — `supportAssistant` (ChatSupportModal ×2, AppOverlays), `navPrintLab` (Header),
  `footerAbout`, `footerToleranceLabel`, `footerQcPolicy`. Tất cả đều truyền `fallbackVi` VI nên hiển thị đúng;
  nên dọn bằng cách thêm key hoặc bỏ key khỏi call (follow-up).
- EN copy: `HomeView.tsx` CTA `'Tư Vấn & Custom Theo Ý Tưởng'` → **`'Tư Vấn & Tuỳ Biến Theo Ý Tưởng'`**;
  `searchPlaceholder` `'Tìm linh kiện, tag (vd: IoT, Gear, Snap-Fit)...'` → **`'Tìm linh kiện, thẻ (vd: IoT, bánh răng, Snap-Fit)…'`**;
  allowlist `IoT/Snap-Fit/Parametric` đã ghi vào `COPY-GLOSSARY.md` §2.
  **Residual (pre-existing, hidden by default):** `HomeView.tsx:376` fallback `'Xem Sản Phẩm Tag 2/9'` (chỉ render khi
  `announcementActive=true`; DB default false) + dead data fields `labelEn/titleEn/descEn` (không render) — follow-up copy.

---

## 4. Icon — prune `cloud_sync`

| Kiểm | Kết quả |
|---|---|
| `iconMap` glyph (đếm độc lập object literal) | **205** (HEAD **206**; removed đúng `cloud_sync`, added 0) |
| `grep -rn "cloud_sync\|CloudSync" src/ tests/ scripts/` (trừ định nghĩa) | **0** |
| `node scripts/check-icon-names.mjs` | **PASS — 204 file, 205 glyph** |
| `docs/design/icon-map.md` | ghi **205 glyph**, note “PRUNE Phase 6” — khớp |

---

## 5. Docs-as-code

### 5.1 Routes doc (sinh tự động)

```text
$ sha256sum docs/pages/_routes.generated.md (trước)   f88697c7ef8e61c5…
$ node scripts/gen-routes-doc.mjs                     # → 30 route, source-sha256 f0bd92f499c9
$ sha256sum …                                         f88697c7ef8e61c5…   # y hệt trước khi chạy
$ node scripts/gen-routes-doc.mjs                     # lần 2
$ sha256sum …                                         f88697c7ef8e61c5…   # BYTE-IDENTICAL
$ sha256(src/frontend/routes/AppRoutes.tsx)[:12]      f0bd92f499c9        # khớp header
$ grep -c '^| \`' docs/pages/_routes.generated.md     30
```
Script đọc `SOURCE_CANDIDATES = ['src/frontend/routes/AppRoutes.tsx', 'src/App.tsx']` (fallback tương thích ngược);
không có `<Routes>` ở cả 2 nguồn ⇒ RC=1, không ghi file. Header không kèm ngày ⇒ idempotent.

### 5.2 Tự đếm lại DB từ `supabase/migrations/*.sql` (12 file)

| Hạng mục | Tự đếm | Cách đếm | Docs claim | Khớp? |
|---|---:|---|---:|---|
| Migration | **12** | `ls supabase/migrations/*.sql \| wc -l` | 12 | ✅ |
| Bảng | **32** | anchored `^create table if not exists public.X (`: baseline **31** + `designer_payout_info` **1** | 32 | ✅ |
| View | **2** | `create [or replace] view`: `pricing_config` (`security_invoker=true`) + `open_design_requests` | 2 | ✅ |
| Hàm thường trực | **19** | 29 occurrence / **21 distinct** `create [or replace] function` − 2 `drop function` (`_vcube_make_policy`, `_vcube_has_columns`) | 19 | ✅ |
| Định nghĩa trigger | **9** | 12 câu `create trigger` / **9 tên unique** | 9 | ✅ |
| Instance trigger | **≈29** | loop `trg_touch_updated_at` × **21 bảng** (đếm mảng baseline) + 8 trigger gắn 1 bảng | ≈29 | ✅ |
| Policy bảng hiệu lực | **92** | 67 `perform _vcube_make_policy` − 3 call-site trong loop = **64 direct** − **2** bị skip vì `pricing_config` là view (`relkind='r'` guard) = **62** + loop `v_catalog_read` 11 bảng×2 = **22** + loop 2 bảng = **2** + 2 policy `orders` trực tiếp + 4 policy `designer_payout_info` = **92** | 92 | ✅ |
| Policy storage | **7** | allowlist `v_ok` = 7 tên (đếm mảng); `cad_owner_rw` tái tạo ở #12 | 7 | ✅ |
| Policy realtime | **1** | `do` block tạo `orders_admin_realtime` trên `realtime.messages` (conditional, chỉ admin) | 1 | ✅ |
| Allowlist `v_keep` | **90 tên** | đếm mảng | 90 (2 policy view bị skip → 88 từ #3, +4 payout = 92) | ✅ |

AGENTS.md, `docs/database/schema.md` header, `docs/security/rls-policies.md` header **khớp toàn bộ** số trên.

### 5.3 Doc gates

| Gate | Kết quả |
|---|---|
| `doc-freshness` | **0 vi phạm** (`run-checks`: OK) |
| `doc-refs` | **307** [advisory] — HEAD baseline cùng checker: **271** ⇒ +36; builder đo “before” trên tree đang sửa = **291** ⇒ +16. Chi tiết phân loại dưới |

Phân loại 32 cặp `(doc, dead-ref)` mới so HEAD:
- **Canonical/live docs (nên sửa):** `docs/SETUP_RUNBOOK.md:436`, `docs/architecture/pricing-engine.md:13`
  vẫn gọi `src/frontend/utils/pricingEngine.ts` là “re-export” (đã xoá 6c) — 2 ref;
  `docs/tasks/optimization/README.md` nhắc `src/stores` (đã xoá) — token lịch sử, 1 ref.
- **Trạng thái lỗi thời (nên sửa):** `DEAD-CODE.md` D05–D07 còn “⛔ HOÃN”, `04-refactor.md` D05–D07 còn “shim”,
  `optimization/README` còn “Hoãn có lý do: D05–D07” — dù Phase 6c đã xoá.
- **Historical/snapshot (chấp nhận advisory):** `docs/tasks/as-is/*` (6), `DEAD-CODE.md`/`03-resources.md`/
  `04-refactor.md` thân bài (7), `handoff/phase1-ui.md` (4), `handoff/phase6-*.md` (8), `AGENTS.md` (3 – trong đó
  1 “dead link” `[a-z0-9_]+` là **false positive** của regex trong command đếm, 1 token `docs/security/rls-` bị cắt, 1 `src/stores`).

⇒ Không có **link markdown chết thật** mới; toàn bộ là path-token advisory/historical (đúng bản chất advisory).
Risk ghi ở §10-a/b.

---

## 6. Gates tổng

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (RC=0) |
| Build official | `rm -rf dist && npm run build` | **PASS** (`✓ built in 4.94s`, 39 chunk JS) |
| Unit test | `npm run test:unit` | **PASS** 71/71 (RC=0) |
| 10 offline gates | `node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast --only check-error-handling --only check-fabricated --only check-icon-names --only check-ui-rules --only check-unitprice-multiplier --only a8-sql-syntax-check --only lint-rls-migration --only lint-rls-sources` | **PASS** — `KHÔNG TỆ HƠN BASELINE (10 gate so được)`; mỗi gate `rc=0 vi pham=0` |
| Doc advisory | `--only doc-refs --only doc-freshness` | doc-freshness **0** · doc-refs **307** [advisory] · RC=0 |

Live gates (`verify-rls`, `inspect-db`, integration `test-catalog-sync`) **không chạy** — Supabase paused/unreachable
(đúng phạm vi; ghi ở §11).

---

## 7. Bundle final (official `dist/`, Node `zlib.gzipSync(level 9)`)

| Resource | Phase-4 baseline raw / gzip⁹ | Final raw / gzip⁹ | Δ gzip⁹ |
|---|---:|---:|---:|
| `index-*.js` | 692.525 / **186.957** | 689.178 / **185.575** | **−1.382 (−0,74%)** |
| `react-vendor-*.js` | 51.499 / 18.190 | 51.499 / 18.190 | 0 |
| `supabase-vendor-*.js` | 221.007 / 57.646 | 221.007 / 57.646 | 0 |
| `index-*.css` | 89.454 / 15.655 | 89.454 / 15.655 | 0 |
| **INITIAL CRITICAL** | 1.054.485 / **278.448** | 1.051.138 / **277.066** | **−1.382 (−0,50%)** |

- **Hành trình tổng:** Phase-1 baseline **464.251** gzip → final **277.066** gzip = **−187.185 B (−40,32%)**.
- **39 chunk JS** (đếm `dist/assets/*.js`), khớp claim. Lazy set đủ: 9 route (`CartView`, `CheckoutView`,
  `OrderSuccessView`, `OrderTrackingView`, `MyOrdersView`, `AssetLibraryView`, `LoginView`, `RegisterView`,
  `PersonalizeView`) + 5 console (`Tool3DView`, `AdminDashboardView`, `DesignerDashboardView`,
  `WorkshopSettingsView`, `WorkshopOnboardingWizard`) + `ThreeModelViewer-*.js` đều có chunk riêng.
- **`three-vendor` async:** KHÔNG có trong `dist/index.html`; index không static-import (`from"./three-vendor`=0);
  chỉ 3 chunk lazy import nó: `ThreeModelViewer-*`, `PersonalizeView-*`, `Tool3DView-*`. `three-vendor` 531.663 B /
  **133.438** gzip⁹ (tải khi viewer mount).
- `canvas-confetti`: chỉ nằm trong `CheckoutView-*.js` (lazy), **0** trong index/preload — xác nhận Phase 5.
- Ghi chú: build log Vite in `index gzip 186.24 kB` (mức nén khác) — bảng trên dùng z9 đúng baseline Phase 4.

---

## 8. Smoke — prod preview `:4177` + fixture network-layer

12 route × 2 viewport (390×844, 1440×900) = **24 check**; fixture chỉ tiêm ở network layer (Supabase unreachable):
`/`, `/explore`, `/products/p1`, `/personalize/p1`, `/cart`, `/checkout`, `/orders`, `/tracking`, `/auth/login`,
`/quote`, `/admin`, `/lab/settings`.

| Chỉ số tổng | Kết quả |
|---|---|
| `pageerror` | **0/24** |
| `console.error` | **0/24** |
| Tràn ngang trang (`scrollWidth > innerWidth`) | **0/24** |
| Màn trắng (root text < 300 ký tự) | **0/24** (min 641 ký tự) |
| Nav error / timeout | 0 |
| Phần tử rộng hơn viewport nhưng nằm trong scroller (`overflow-x-auto`, `scrollWidth` trang không đổi) | 106 phần tử — toàn bộ là item trong nav/filter pill & tablist (đúng thiết kế; không gây scroll trang) |

- **Canvas mount:** Home `481×360`, PDP `664×480`, Personalize `334×380` (390) / `664×480` (1440) — 3D render,
  không “white box”.
- **Add-to-cart toast:** PDP 1440 bấm “Đặt in 3D” → live-region `role=status` chứa
  `Đã thêm 1x "Vỏ hộp IoT Công nghiệp" vào đơn hàng!`; cart badge tăng (ảnh `/tmp/p6-smoke-home-1440.png`).
- **Guard/redirect (anonymous):** `/orders` → `/auth/login`; `/admin` → `/auth/login`; `/lab/settings` →
  `/auth/login` — đúng `ProtectedRoute`/`RoleGuard` (cả 390 & 1440); nêu rõ: chưa test role admin/lab đã đăng nhập
  (Supabase paused, không có phiên thật).
- **`/quote`:** render `h1 "Xưởng phân tích & báo giá 3D"` (lazy route + Suspense OK).
- Ảnh: `/tmp/p6-smoke-home-1440.png`, `/tmp/p6-smoke-pdp-1440.png`, `/tmp/p6-smoke-pdp-390.png`.
  Script: `/tmp/p6-smoke.cjs` (+ fixture `/tmp/vcube-fixtures.cjs`).

---

## 9. Scope / regression / circular

- **Diff:** `67 file changed, +486 / −397` = **64 M + 3 D**; untracked **4** = `tests/` + 3 handoff Phase 6.
  Phân loại độc lập: **13** file docs+script của 6a · **46** file import rewrite của 6c (trong đó `HomeView.tsx`
  rewrite import **+** 1 dòng CTA của 6c) · **4** file 6c khác (`LanguageContext`, `iconMap`,
  `docs/design/icon-map.md`, `docs/tasks/ui-redesign-v3/COPY-GLOSSARY.md`) · **1** file 6b (`package.json`) ·
  **3** shim `D` — **64 M + 3 D**, không có file lạc scope.
- **`package.json`:** chỉ +1 dòng `"test:unit": "tsx --test tests/unit/*.test.ts"`; **`package-lock.json` không đổi**,
  không dependency mới.
- **`supabase/**`:** 0 thay đổi. **`scripts/gate-manifest.json` + `docs/tasks/baseline.json`:** 0 thay đổi.
- **Circular imports:** detector DFS/Tarjan độc lập (`/tmp/p6-cycles.mjs`, static import/export, resolve alias):
  current **0 cycle / 205 file**; HEAD baseline **0 cycle / 208 file** ⇒ **0 circular mới**.
- **Kích thước file:** **0 file >2.000 dòng**. Còn **20 file >800** (follow-up, xem §11).
- **LOC claims Phase 4 trong docs khớp thật:** App **343**, Tool3DView **1057**, ModelViewer3D **869**,
  PricingConfigPanel **985**, Group1WorkshopsPanel **755**, WorkshopSettingsView **865**, workshopService **128**.

---

## 10. Risks & follow-up (không chặn commit)

| # | Mức | Vấn đề | Đề nghị |
|---|---|---|---|
| a | **Thấp (docs)** | 2 canonical docs còn nhắc shim đã xoá: `docs/SETUP_RUNBOOK.md:436`, `docs/architecture/pricing-engine.md:13` (“re-exported via `src/frontend/utils/pricingEngine.ts`”) | Sửa thành “shim đã xoá ở Phase 6c; dùng trực tiếp `src/utils/pricingEngine.ts`” (2 dòng) trước/sau commit |
| b | **Thấp (docs)** | `DEAD-CODE.md` D05–D07 “⛔ HOÃN”, `04-refactor.md` D05–D07 “shim”, `optimization/README` “Hoãn có lý do: D05–D07” — trái thực tế đã xoá ở 6c | Cập nhật D05–D07 = ✅ DONE Phase 6c (3 chỗ) |
| c | **Thấp (gate)** | `test:unit` chưa trong `scripts/gate-manifest.json` ⇒ `npm run check` không chạy unit test; `tests/**` ngoài tsconfig nên lint không typecheck test | Thêm gate `test-unit` (+ entry baseline) và `tsconfig.test.json` (follow-up 6b đã đề xuất) |
| d | Trung bình | Supabase paused ⇒ chưa chạy live `verify-rls`/`inspect-db`/integration (`test-catalog-sync`), chưa test role admin/lab đã đăng nhập | Chạy lại khi Resume; đối chiếu 92+7+1 và smoke role thật |
| e | Thấp | Coverage test thuần unit (không DOM/component/Supabase thật) | Integration/component test riêng (cần môi trường/quyết định thêm devDep) |
| f | Thấp | 20 file >800 dòng (chưa >2.000): `meshParser 1.878`, `WorkshopOnboardingWizard 1.448`, `Explore 1.436`, `Home 1.433`, `Group5 1.237`, `Group3 1.207`, `Personalize 1.160`, `PDP 1.102`, `AdminStorefront 1.092`, `Tool3D 1.057`, `pricingEngine 1.054`, `settingsService 1.030`, `types/index 1.028`, `PricingConfig 985`, `AuthModal 913`, `ModelViewer3D 869`, `WorkshopSettings 865`, `DataTable 854`, `AccessoriesManager 815`, `CheckoutView 801` | Tách tiếp ở phase sau (seam theo chiều dữ liệu) |
| g | Thấp | `dbService.*` inline còn **42 call-site** (14 `useCatalogData`, 5 `Group1`, 4 `useSiteSettings`, …) — nợ service-layer từ trước | Theo follow-up Phase 3/4 |
| h | Thấp | Dead/ít dùng store: `useProductionStore` 2 file, `useCustomerAdminStore` 1, `useDesignerAdminStore` 1, `useWorkshopAdminStore` 2 — chưa xác nhận “dead”, chỉ ít dùng | Review riêng trước khi xoá |
| i | Rất thấp | 7 literal `t('key')` trỏ key không có trong dictionary (pre-existing, đều có `fallbackVi` VI) + `Tag 2/9` fallback ẩn + dead `nameEn/titleEn/descEn` data | Dọn copy đợt sau |

---

## 11. Docs status recommendation (cho Lead)

- `docs/tasks/optimization/PLAN.md` đang ghi **“Phase 6 IN PROGRESS”** và `README.md` mới ghi Phase 6b/unit test —
  **phù hợp trạng thái trước commit**. Sau khi bạn commit Phase 6: cập nhật **Phase 6 = ✅ DONE (2026-10-21)**
  (docs-as-code + 71 unit test + cleanup shims/i18n/icon), thêm bullet follow-up §10 a–d vào mục “Còn tồn”.
- Khuyến nghị commit kèm 3 sửa docs nhỏ (a/b) để `doc-refs` không còn dead-path ở canonical docs; (c) để phase sau.
- **Không commit gì từ phía mình**; preview `:4177` đã tắt sau khi đo; worktree tạm `/tmp/p6-base` đã xoá.

---

## 12. Lệnh tái lập (rút gọn)

```bash
cd /home/thanh/home/thanh/project/Vcube
npm run lint
rm -rf dist && npm run build
npm run test:unit
node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast --only check-error-handling \
  --only check-fabricated --only check-icon-names --only check-ui-rules --only check-unitprice-multiplier \
  --only a8-sql-syntax-check --only lint-rls-migration --only lint-rls-sources
node scripts/run-checks.mjs --only doc-refs --only doc-freshness
node scripts/gen-routes-doc.mjs && node scripts/gen-routes-doc.mjs   # byte-identical
# DB recount: xem §5.2 (python/grep trên supabase/migrations/*.sql)
# smoke: npx vite preview --outDir dist --port 4177 --strictPort  + /tmp/p6-smoke.cjs
```
