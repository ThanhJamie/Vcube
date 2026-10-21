<!-- doc-meta: status=active; verified=2026-10-21; owner=lead -->
# 02 — Dead-code audit (re-verify tại HEAD `9c5d99c`)

> **Phạm vi:** audit read-only. Không sửa `src/`, không commit. Chỉ ghi file này.
> **Nguồn gốc:** `/tmp/vcube-deadscan3.out` (10:06 2026-10-21) + danh sách ứng viên trong task.
> **Kết luận ngắn:** scan gốc được tạo **trước** commit Phase 1 (`6e3247d`, 10:47) nên **6/7 nhóm ứng viên đã
> được xoá**. Tại HEAD chỉ còn **12 export chết + 1 thư mục rỗng = ~110 LOC code** (cộng artifact local
> không track). Không có file unreachable nào còn lại; `src/workers/cadParser.worker.ts` là **false positive**
> của mọi scan tĩnh (nạp bằng `new Worker(new URL(...))`).

> **CẬP NHẬT TRIỂN KHAI (2026-10-21, sau audit):** nhóm **safe** đã được xoá — **R01–R04** (4 type mồ côi,
> −44 LOC), **R07** `lastLoadedAt`, **R10** `DEMO_ROLE_SWITCHER_ENABLED`, **R11** `CardFooter`, **R12**
> `getBodyScrollLockCount`; thư mục rỗng `src/frontend/services/` đã xoá; `dist-ssr/` dọn. Tổng **−59 LOC**.
> **R05/R06/R08/R09 giữ lại có chủ ý** (R05/R06 là API logout/audit chưa nối UI — ưu tiên *wire* ở Phase 7;
> R08/R09 là JSDoc giữ tri thức schema/data-honesty, nếu xoá phải chuyển ghi chú sang
> `docs/database/schema-notes.md` trước). Bảng dưới là **ảnh chụp lúc audit**, giữ nguyên làm bằng chứng.

---

## 1. Phương pháp & bằng chứng

| Bước | Cách làm | Kết quả |
|---|---|---|
| Mốc | `git log -1` → `9c5d99c` (2026-10-21 14:37), `git status --porcelain` = 0 dòng | cây sạch, không có thay đổi dở |
| Scan mới | import graph 205 file `src/**/*.{ts,tsx}` từ entry `src/main.tsx` (resolve `@/`, `@frontend/`, `@backend/`, relative, `index.ts`) | **204/205 reachable**; 1 file "unreachable" là worker (FP) |
| Dead export | quét `export` (const / function / class / interface / type / enum) toàn `src/` + `scripts/` + `tests/`; đếm occurrence **sau khi bỏ comment** (vì comment hay nhắc tên symbol), tách "dùng nội bộ" vs "dùng ngoài" | 12 export có **0 tham chiếu code** ngoài khai báo |
| Call-site | `grep -rnw` từng symbol trên `src/ scripts/ tests/ index.html vite.config.ts` | xác nhận 0 ref cho cả 12 |
| Lịch sử | `git show 6e3247d`, `git show 9c5d99c`, `git log --diff-filter=D` | biết mục nào đã xoá, xoá ở commit nào |
| Gate | `npm run lint` (`tsc --noEmit`) | **PASS**, 0 lỗi — dùng làm baseline cho "safe-delete" |

**Vì sao scan gốc sai thời điểm:** file `/tmp/vcube-deadscan3.out` ghi 10:06, liệt kê 4 file backend mà
Phase 1 xoá lúc 10:47 (`6e3247d`), và 3 shim `src/frontend/*` mà Phase 6c xoá lúc 14:37 (`9c5d99c`).
Mọi dòng "UNREACHABLE / DEAD" trong scan đó phải đối chiếu lại với HEAD — đã làm ở §2.

---

## 2. Bảng A — ứng viên trong task: trạng thái tại HEAD

| ID | file:line | symbol | LOC | evidence | safe-delete? | dependency | recommended phase |
|---|---|---|---:|---|---|---|---|
| V01 | `src/backend/index.ts` (đã xoá) | barrel 3 service | 8 | 0 importer; `git show --stat 6e3247d` xoá file | yes (đã xoá) | — | 1 — DONE |
| V02 | `src/backend/services/catalogService.ts` (đã xoá) | `catalogService` | 34 | 0 importer; chỉ được V01 re-export | yes (đã xoá) | V01 | 1 — DONE |
| V03 | `src/backend/services/pricingService.ts` (đã xoá) | `pricingService` | 46 | 0 importer; chỉ được V01 re-export | yes (đã xoá) | V01 | 1 — DONE |
| V04 | `src/backend/supabase/seedService.ts` (đã xoá) | `seedService` / `syncFromSupabase` | 134 | 0 importer; chỉ còn 1 comment ở `src/backend/supabase/mappers.ts:7` | yes (đã xoá) | — | 1 — DONE |
| V05 | `src/frontend/data/mockData.ts` (đã xoá) | shim `export *` 1 dòng | 1 | **Không phải dead code**: 3 importer thật (`views/{Home,Explore,Tool3D}View.tsx`); xoá sau codemod 53 dòng import/46 file ở `9c5d99c` | yes (đã xoá, sau codemod) | codemod alias `@/data/mockData` | 6c — DONE |
| V06 | `src/frontend/types/index.ts` (đã xoá) | shim `export *` 1 dòng | 1 | **Không phải dead code**: 11 importer (`components/{AuthModal,Header,InvoiceModal,RoleGuard}.tsx` + 7 view) | yes (đã xoá, sau codemod) | codemod alias `@/types` | 6c — DONE |
| V07 | `src/frontend/utils/pricingEngine.ts` (đã xoá) | shim `export *` 1 dòng | 1 | **Không phải dead code**: 2 importer (`admin/WorkshopEstimatorBOM.tsx`, `tool3d/QuoteSummaryPanel.tsx`) | yes (đã xoá, sau codemod) | codemod alias `@/utils/pricingEngine` | 6c — DONE |
| V08 | `src/frontend/ui/Section.tsx` (đã xoá) | `Section` | 117 | 0 importer ngoài `ui/index.ts`; xoá 3 dòng re-export | yes (đã xoá) | — | 1 — DONE |
| V09 | `src/frontend/ui/Toolbar.tsx` (đã xoá) | `Toolbar` | 87 | 0 importer ngoài barrel | yes (đã xoá) | — | 1 — DONE |
| V10 | `src/frontend/ui/ToastViewport.tsx` (đã xoá) | `ToastViewport` | 297 | 0 importer; toast thật nằm ở `AppOverlays`/`useUIStore` | yes (đã xoá) | — | 1 — DONE |
| V11 | `src/data/mockData.ts` (dòng cũ) | 6 mock constant: `CUSTOM_REQUESTS`, `MODERATION_PRODUCTS`, `DESIGNER_APPLICATIONS`, `DISPUTES_LIST`, `DMCA_REPORTS`, `MOCK_FINANCIAL_SPLITS` | 6 | `git show 6e3247d -- src/data/mockData.ts` xoá đúng 6 khai báo `= []` (347→311 dòng ở Phase 1; nay 270) | yes (đã xoá) | V12 (type đi kèm) | 1 — DONE |
| V12 | `src/types/index.ts` (dòng cũ) | 8 type: `QuoteTierType`, `QuoteSnapshot`, `ProductLicensingConfig`, `DispatchAssignment`, `QualityControlRecord`, `AdminTab`, `InkiriCalculationInput`, `InkiriCalculationResult` | 108 | `git show 6e3247d -- src/types/index.ts` −108 dòng; `grep` tại HEAD = 0 hit | yes (đã xoá) | — | 1 — DONE |
| V13 | `src/backend/supabase/database.ts` (dòng cũ) | 6 method `dbService`: `seedInitialProductsIfEmpty`, `uploadProductImage`, `uploadCadFile`, `saveUser`, `savePricingConfig`, `recordPaymentTransaction` | 217 (1017→800, kèm helper CAD) | `git show 6e3247d -- src/backend/supabase/database.ts` xoá đúng 6 method; HEAD 800 dòng, `grep` 6 tên = 0 hit | yes (đã xoá) | — | 1 — DONE |
| V14 | `test-pricing.ts` (đã xoá) | script test cũ | 358 | import 2 module không tồn tại; xoá `6e3247d`; thay bằng `tests/unit/*.test.ts` (71 test) | yes (đã xoá) | V12/V13 | 1/6b — DONE |
| V15 | `firebase-applet-config.json`, `firestore.rules`, `metadata.json`, `assets/.aistudio`, `bun.lock` (đã xoá) | artifact/rule cũ | 12 + 53 + 6 + 1 + 970 dòng | `git ls-files` = 0; xoá `6e3247d`; chỉ còn `package-lock.json` (110 KB, tracked) | yes (đã xoá) | — | 1 — DONE |
| V16 | `package.json` (dòng cũ) | `dotenv`, `autoprefixer` | 2 dep | `grep` = 0 trong `package.json` + lock; xoá `6e3247d` (−72 dòng lock) | yes (đã xoá) | — | 1 — DONE |

**Tổng đã xoá ở Phase 1 (theo commit):** −552 LOC backend · −~700 LOC UI · −357 LOC test · −132 KB lock/artifact · −2 dependency.

---

## 3. Bảng B — dead code **còn lại** tại HEAD (actionable)

| ID | file:line | symbol | LOC | evidence | safe-delete? | dependency | recommended phase |
|---|---|---|---:|---|---|---|---|
| R01 | `src/types/index.ts:655` | `ModerationProductItem` | 15 | 0 ref code; chỉ còn khai báo sau khi `MODERATION_PRODUCTS` bị xoá ở `6e3247d` | **yes** | — | 1b |
| R02 | `src/types/index.ts:671` | `DesignerApplication` | 12 | 0 ref; mồ côi sau khi `DESIGNER_APPLICATIONS` bị xoá | **yes** | — | 1b |
| R03 | `src/types/index.ts:684` | `DisputeRecord` | 9 | 0 ref; mồ côi sau khi `DISPUTES_LIST` bị xoá | **yes** | — | 1b |
| R04 | `src/types/index.ts:694` | `DMCAReport` | 8 | 0 ref; mồ côi sau khi `DMCA_REPORTS` bị xoá | **yes** | — | 1b |
| R05 | `src/backend/services/settingsService.ts:302` | `clearSettingsCache()` | 5 | 0 call site (kể cả test). JSDoc nói "dùng khi đăng xuất" nhưng `AuthContext` không gọi | **careful** | nếu Phase 7 cần reset cache lúc logout thì nên *wire*, không xoá | 7 |
| R06 | `src/backend/services/settingsService.ts:788` | `getSettingAudit()` | 12 | 0 call site; UI lịch sử audit chưa tồn tại; bảng `setting_audit` + `writeSettingAudit` vẫn dùng thật | **careful** | feature stub — xoá được nhưng mất đường đọc audit đã có RLS | 7 |
| R07 | `src/backend/services/settingsService.ts:1019` | `lastLoadedAt()` | 3 | 0 call site | **yes** | — | 1b |
| R08 | `src/backend/services/settingsService.ts:1026` | `SETTINGS_SCHEMA_NOTES` | 25 | 0 ref; xoá kéo theo `UPDATED_AT_COLUMN` (:90) + `SITE_CONTENT_COLUMNS` (:409) — cả hai chỉ được dùng bởi object này | **careful** | giá trị tài liệu schema; nếu xoá phải chuyển ghi chú sang `docs/database/schema-notes.md` | 1b/6 |
| R09 | `src/backend/supabase/mappers.ts:389` | `rowToOrderForSync()` | 10 | 0 call site; là bản cũ cho `seedService.syncFromSupabase` (đã xoá). JSDoc chứa ghi chú quan trọng về `date`/`estimatedDelivery` bịa default | **careful** | chuyển JSDoc (:368–388) sang `docs/database/schema-notes.md` trước khi xoá | 1b |
| R10 | `src/frontend/context/AuthContext.tsx:78` | `DEMO_ROLE_SWITCHER_ENABLED` | 1 | 0 ref; UI demo switcher không còn. `IS_DEV` vẫn dùng thật ở :373/:408 nên **không** xoá `IS_DEV` | **yes** | giữ `IS_DEV` | 1b |
| R11 | `src/frontend/ui/Card.tsx:158` | `CardFooter` | 7 | 0 ref (chỉ `CardHeader/CardTitle/CardDescription/CardContent` được dùng) | **yes** | `CardSectionProps` vẫn dùng bởi 4 component còn lại | 1b |
| R12 | `src/frontend/ui/Modal.tsx:65` | `getBodyScrollLockCount()` | 3 | 0 ref (helper "cho test thủ công", không test nào gọi) | **yes** | `bodyLockCount` vẫn dùng bởi acquire/release | 1b |
| R13 | `src/frontend/services/` | thư mục rỗng | 0 | `find src -type d -empty` → đúng 1 kết quả; **không được git track** (git không track dir rỗng) | **yes** | — | hygiene (local) |
| R14 | `.playwright-mcp/` | artifact Playwright MCP | 0 (3.9 MB) | untracked + đã nằm trong `.gitignore:73`; ảnh/log cũ 2026-09-22 | **yes** (local) | không ảnh hưởng repo | hygiene (local) |
| R15 | `dist/`, `dist-ssr/` | build artifact | 0 (11 MB + 131 MB) | untracked + gitignore `.gitignore:8-9`; `dist-ssr` là tàn dư build SSR cũ | **yes** (local) | build lại bằng `npm run build` | hygiene (local) |

### 3.1 Vì sao `safe-delete` = careful ở R05/R06/R08/R09

- **R05/R06**: không phải code rác thuần tuý — là API đã viết cho logout và màn audit nhưng **chưa nối UI**.
  Xoá bây giờ là hợp lý về dead-code, nhưng nếu Phase 7 làm logout/audit thì phải viết lại. Ưu tiên *wire*
  hơn là xoá; nếu vẫn xoá, ghi lại quyết định trong `DEAD-CODE.md`.
- **R08/R09**: JSDoc đang giữ tri thức không có ở nơi khác (cột `updated_at`/`site_content`; cảnh báo
  `date`/`estimatedDelivery` là default bịa). Xoá code phải kèm chuyển ghi chú, nếu không sẽ mất context
  data-honesty.

---

## 4. False positives (đã kiểm tra, **không** đưa vào bảng xoá)

| # | Ứng viên | Vì sao không phải dead code |
|---|---|---|
| FP01 | `src/workers/cadParser.worker.ts` (487 dòng) | Mọi scan import tĩnh báo unreachable, nhưng được nạp động: `new Worker(new URL('../workers/cadParser.worker.ts', import.meta.url), { type: 'module' })` tại `src/utils/meshParser.ts:1377`. `CadWorkerRequest/Response` dùng nội bộ worker. **Không xoá.** |
| FP02 | 3 shim `src/frontend/{data/mockData,types,utils/pricingEngine}.ts` | Không bao giờ dead: 3 / 11 / 2 importer thật. Đã xoá chỉ *sau* codemod import (`9c5d99c`). Nếu xoá trước codemod sẽ `TS2307` (đã thử ở Phase 1 và rollback). |
| FP03 | `src/frontend/ui/index.ts` (48 dòng, 110 import site) | Barrel sống: 25 module (gồm `cn`) đều có export được dùng qua barrel (Badge 186, Button 844, Card 181, Icon 811, Skeleton 57, EmptyState 97, …). Không còn re-export chết sau khi bỏ `Section/Toolbar/ToastViewport`. |
| FP04 | `tests/unit/` | **Không rỗng**: 5 file, 71 test (`format`, `mappers`, `pricingEngine`, `settingsValidators`, `vat`), là gate `test-unit` trong `scripts/gate-manifest.json:6`. `tests/adversarial` không tồn tại (không có gì để xoá). |
| FP05 | 6 `dbService` method trong task | Đã xoá ở `6e3247d`; file `dbService.ts` chưa từng tồn tại ở HEAD — object `dbService` nằm trong `src/backend/supabase/database.ts`. **24/24 method còn lại đều có call site** (kiểm bằng `dbService.<method>` + destructuring). |
| FP06 | `dotenv`, `autoprefixer` | Đã bị xoá khỏi `package.json`/lock ở `6e3247d`; `grep` = 0. |
| FP07 | `canvas-confetti` | Sống: `src/frontend/views/CheckoutView.tsx:3` + gọi ở :225 (đã tách khỏi entry ở Phase 5). |
| FP08 | `jszip` | Sống: `src/utils/meshParser.ts` (6 tham chiếu, parser 3MF). |
| FP09 | `DEFAULT_INKIRI_FORMULA_CONFIG` (`src/data/mockData.ts:173`) | Chỉ xuất hiện trong comment ở `src/`, nhưng **có importer thật**: `tests/unit/pricingEngine.test.ts:22,90`. Không xoá. |
| FP10 | `SAMPLE_ANALYSIS_FILES`, `MATERIALS_CATALOG`, `PRODUCTS`, `PRINTER_PROFILES`, `PAYOUT_TRANSACTIONS` | Đều là mảng rỗng "có chủ ý" (data-honesty) nhưng **vẫn được import** để khởi tạo state/fallback: `Tool3DView.tsx:5`, `pricingEngine.ts:2`, `QuoteSummaryPanel.tsx:4`, `DesignerPayoutsTab.tsx:3`. Chỉ nên inline `[]` nếu chấp nhận mất comment giải thích — không khuyến nghị. |
| FP11 | `scripts/test-catalog-sync.ts` (155 dòng) | Là gate thật (`gate-manifest.json:18`), chạy offline với mock DB; có import `PRODUCTS` (= `[]`) nên các assert đếm sản phẩm là **vacuous** (0 = 0), nhưng script vẫn test 2 fixture cứng + logic filter. Không xoá; nếu muốn thì thay assert theo fixture cứng. |
| FP12 | `extract3MFBuildMaps` (`src/utils/meshParser.ts:881`) | Scanner bỏ comment thô báo 1 occurrence; thực tế dùng ở `meshParser.ts:986` (`await extract3MFBuildMaps(zip)`). Không xoá. |
| FP13 | `src/types/index.ts` "exported-only types" khác | Không có: 12 export chết ở §3 là toàn bộ. Các `*Props`/`*Options` còn lại được dùng **nội bộ file** — chỉ là export dư (over-export), không phải dead code; dọn riêng sẽ là refactor API, không nằm trong audit này. |

---

## 5. Tổng hợp

| Hạng mục | LOC code | Ghi chú |
|---|---:|---|
| Dead type mồ côi (R01–R04) | **44** | xoá được ngay, 0 dependency |
| Dead export service/mapper (R05–R09) | **55** | trong đó 25 là cascade R08; 4 mục "careful" cần quyết định |
| Dead export UI/context (R10–R12) | **11** | xoá ngay |
| **Tổng code xoá được** | **110 LOC** | + ~45 dòng comment/JSDoc nếu dọn kèm |
| Thư mục rỗng (R13) | 0 | `rmdir src/frontend/services` |
| Artifact local (R14–R15) | 0 | **145.9 MB** đĩa (3.9 + 11 + 131), không nằm trong git |
| **Dead code đã xoá trước đó (Phase 1/6c)** | **~1.500 LOC** | −552 backend, −~700 UI, −357 test; thêm 970 dòng `bun.lock` (không phải code) |

**Thứ tự đề xuất (1 thay đổi nhỏ, gate sau mỗi bước):**
1. **R01–R04 + R10–R12** (55 LOC, 0 dependency) → `npm run lint`.
2. **R07 + R08** (28 LOC) — R08 kèm chuyển ghi chú schema; nếu giữ `SETTINGS_SCHEMA_NOTES` thì bỏ R08.
3. **R09** — chuyển JSDoc sang `docs/database/schema-notes.md` rồi xoá.
4. **R05/R06** — quyết định *wire* (khuyến nghị) hoặc xoá + ghi lại trong `DEAD-CODE.md`.
5. **R13–R15** — chỉ dọn local, không commit.

**Vệ sinh kèm (không phải dead code):** 2 comment còn nhắc đường dẫn đã xoá —
`src/backend/supabase/mappers.ts:7` (nhắc `seedService.ts:512-553`) và
`scripts/check-unitprice-multiplier.mjs:31` (nhắc shim `src/frontend/utils/pricingEngine.ts`).
Sửa comment khi làm R09/R01 để tài liệu không trỏ vào file không tồn tại.

**Không xoá:** toàn bộ FP01–FP13, `CATEGORIES`, `POPULAR_TAGS`, `INKIRI_REFERENCE_VALUES`,
`DEFAULT_SITE_CONTENT`, `DEFAULT_INKIRI_FORMULA_CONFIG`, `src/backend/lib/result.ts`, `AssetService`.

---

## 6. Gate & rollback

```bash
npm run lint         # tsc --noEmit — PASS tại HEAD 9c5d99c
npm run build        # xác nhận bundle không đổi bất thường
npm run test:unit    # 71 test (unit) — không được giảm số test
npm run check        # offline gate; live gate có thể skip nếu Supabase paused (ghi rõ)
```

- Mỗi cụm xoá chạy **lint + test:unit**; nếu `build` đổi > 1 KB gzip ngoài dự kiến → nghi ngờ xoá nhầm.
- Không xoá DB/schema, không sửa migration.
- Rollback: `git checkout -- <file>` (chưa commit) hoặc revert commit của phase.

---

## 7. Phụ lục — lệnh tái lập

```bash
# 1) mốc
git log -1 --format='%h %ci %s'          # 9c5d99c 2026-10-21 14:37
git status --porcelain                   # rỗng

# 2) tồn tại / vắng mặt của ứng viên
for f in src/backend/index.ts src/backend/services/catalogService.ts \
         src/backend/services/pricingService.ts src/backend/supabase/seedService.ts \
         src/frontend/data/mockData.ts src/frontend/types/index.ts \
         src/frontend/utils/pricingEngine.ts test-pricing.ts bun.lock \
         firebase-applet-config.json firestore.rules metadata.json; do
  [ -e "$f" ] && echo "EXISTS $f" || echo "GONE   $f"
done

# 3) 12 export chết (0 hit ngoài file khai báo)
for s in ModerationProductItem DesignerApplication DisputeRecord DMCAReport \
         clearSettingsCache getSettingAudit lastLoadedAt SETTINGS_SCHEMA_NOTES \
         rowToOrderForSync DEMO_ROLE_SWITCHER_ENABLED CardFooter getBodyScrollLockCount; do
  echo "== $s"; grep -rn "\b$s\b" src scripts tests | grep -v '^\S*:[0-9]*: *[/*]'
done

# 4) worker là false positive
grep -n "new Worker" src/utils/meshParser.ts

# 5) artifact local
du -sh .playwright-mcp dist dist-ssr
```

---

### Liên kết

- Lịch sử đầy đủ + quyết định từng mục: [`DEAD-CODE.md`](./DEAD-CODE.md) (canonical cho Phase 1).
- Bằng chứng thi công: [`handoff/phase1-backend.md`](./handoff/phase1-backend.md),
  [`handoff/phase1-ui.md`](./handoff/phase1-ui.md), [`handoff/phase1-repo.md`](./handoff/phase1-repo.md),
  [`handoff/phase6-verify.md`](./handoff/phase6-verify.md).
- Trạng thái phase: [`README.md`](./README.md), [`PLAN.md`](./PLAN.md).
