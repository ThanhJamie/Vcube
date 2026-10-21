<!-- doc-meta: status=active; verified=2026-10-21; owner=lead -->
# PLAN — Clean-code & resource optimization (2026-10-21)

> **Mục tiêu:** giảm code chết/lặp, hội tụ một nguồn sự thật cho data/state, giảm bundle & RAM,
> làm docs khớp code — **không đổi hành vi nghiệp vụ, không đụng DB/schema** trong đợt này.
> **Nguồn:** `AUDIT.md` + `DEAD-CODE.md` + `docs/tasks/ui-redesign-v3/QA-REPORT.md`.
> **Trạng thái:** **ĐANG THI CÔNG** — Phase 0–5 **DONE**; **Phase 6 IN PROGRESS** (docs-as-code + unit test). Thứ tự thi công đã chốt:
> **Phase 0 → 1 → 5 → 2 → 3 → 4 → 6** (user decision; audit `04-refactor.md` §7.0 khuyến nghị i18n làm muộn
> vì cùng chạm 32 file với phase khác — xem ghi chú ở Phase 2).

---

## 0. Nguyên tắc

1. **Một phase = một branch/commit**; trước phase 0 tạo checkpoint cho working tree hiện tại.
2. **Không xoá DB/cột/bảng**; feature gap xử lý ở plan riêng sau khi UI ổn định.
3. Mỗi lần xoá: grep 0 importer + `lint/build` + 10 gate offline + smoke 3 route.
4. Không thêm dependency; không đổi route/slug/nav/IA.
5. Ưu tiên **dead code trước**, **i18n sau**, **refactor god-file sau** — tránh conflict.
6. Không trộn phase clean-code với feature/data wiring.

---

## 1. Kế hoạch phase

### Phase 0 — Checkpoint & baseline (0.5 ngày) — ✅ DONE 2026-10-21
- Commit/tag working tree hiện tại thành **baseline UI v3** (hoặc tạo worktree/branch `chore/clean-code`).
- Lưu backup `.loop/backups/` (đã có bản trước v3; tạo bản mới).
- Chốt baseline: `npm run lint`, `npm run build`, `npm run check` offline, bundle sizes từ `dist/`.
- **Gate:** baseline xanh; có commit/tag để revert.
- **Kết quả:** `4d4a5d1` (UI v3 + W2b security/docs) + `aaff7c4` (audit docs) đã push lên `main`; baseline
  lint/build xanh; initial gzip **~466KB** (index 241 + three 133 + supabase 58 + react 18 + CSS 16).

### Phase 1 — Xoá dead code an toàn — ✅ DONE 2026-10-21
Theo `DEAD-CODE.md` cụm A→E (3 agent song song, write scope rời):
1. Xoá 4 backend file chết (D01–D04); **D05–D07 hoãn** (đính chính: 16 importer sống — xem `DEAD-CODE.md` §1).
2. Xoá 3 primitive chết (D08–D10) + 3 export barrel; bỏ export.
3. Xoá mock constant rỗng D11a–D11f; **D11g–D11m → Phase 3** (cần sửa call-site `App.tsx`).
4. Xoá 8 type chết (D12).
5. Xoá 6 `dbService` method 0 caller (D13) + helper chỉ chúng dùng.
6. Xoá `test-pricing.ts`, `tests` rỗng, firebase/metadata/assets, `bun.lock` (D19–D24, D26).
7. Bỏ `dotenv`/`autoprefixer` khỏi package (D27–D28); prune `package-lock.json` −72 dòng.
8. Prune 18 glyph `iconMap` không tham chiếu (D15, 224→206) + 12 lucide import.
- **Không** xoá `SEED_*`/legacy WorkshopService ở phase này.
- **Kết quả đo được:** **−552 LOC** backend · **−~700 LOC** UI · **−357 LOC** test chết · **−132 KB**
  lock/artifact · **−2 dependency**. `lint` PASS · `build` PASS · 7/7 gate offline PASS (không tệ hơn baseline);
  `check-icon-names` PASS 206 glyph. Handoff: `handoff/phase1-{backend,ui,repo}.md`.
- **Gate (đã đạt):** lint/build/10 gate; `rg` 0 hit các symbol đã xoá; bundle không tăng.

### Phase 2 — Một ngôn ngữ, xoá nhánh i18n chết — ✅ DONE 2026-10-21 (QA verdict **GO**)
- ✅ Codemod **1.428** `ConditionalExpression` chết `isVi ? VI : EN` (grep cùng dòng chỉ 1.201; AST mới đúng)
  trên **34 file**, dùng TS compiler API text-range (không reprint) + unwrap 800 JSX literal có guard
  render-equivalence; xoá 28 `const isVi`, 28 binding `language`, 27 import `useLanguage`, 37 value-use sửa tay.
  Diff: **37 file, +1.516/−2.256** (builder báo 34 file trước pass 2b; verifier chốt 37).
- ✅ `LanguageContext` **521→412 dòng**: xoá **85 `en:`**, API còn `{ t }`; bỏ `language` state,
  `setLanguage`, `toggleLanguage`, `Language` type, `localStorage['vcube_language']` (dead write),
  `configuredClaims(language)`; bỏ `_fallbackEn` + 25 đối số EN chết của `t()`.
- ✅ `App.tsx`: 18 ternary `language === 'vi'` → nhánh VI; `Header` bỏ `language` khỏi dep-array.
- **Kết quả đo (official):** initial critical gzip **285.807 → 275.930 (−9.877, −3,46%)**;
  entry **714.080/194.316 → 691.048/184.439** (gzip −5,08%); **45.145 B EN** bỏ khỏi source.
- **Bằng chứng:** `handoff/phase2-{i18n-codemod,i18n-core,verify}.md` — AST-verified 1.493 identifier `isVi`
  ở HEAD = 1.428 conditionals + 28 defs + 37 value-uses; letter-stream VI text **giống tuyệt đối** 37/37 file;
  85/85 dictionary key VI không đổi; **50 route-check** (390/1440) 0 pageerror/0 overflow; VI-only smoke 0 hit
  danh sách EN; tiền `.000 ₫`, **0** `$`/`USD`; 10/10 offline gate PASS.
- **Follow-up (không chặn):** 67/85 dictionary key không còn tham chiếu (~2.610 ký tự) → dọn Phase 6;
  copy P3: `Custom` (Home CTA, `HomeView.tsx:1377`), placeholder `tag/Gear/Snap-Fit` (`LanguageContext.tsx:66`),
  taxonomy `Snap-Fit/Parametric & Decor` (`mockData.ts:33,35`); field chết `nameEn/badgeEn/ctaLabelEn`
  (ServiceShowcase); smoke `/admin`,`/designer`,`/lab` khi Supabase Resume.
- **Gate (đã đạt):** lint/build; grep visible EN = 0 ngoài allowlist; smoke 12 route; không đổi text VI.

### Phase 3 — Hợp nhất data/state — ✅ DONE 2026-10-21 (QA verdict **GO**)
- ✅ Bỏ toàn bộ cache localStorage DB-backed trong `App.tsx` (`vcube_products`, `vcube_materials`,
  `vcube_printers`, `vcube_site_content` — 4 read + 10 write + dead `vcube_pricing_config`); DB là nguồn duy nhất.
  Thay 5 mock rỗng D11l bằng `[]`; xoá 7 hằng rỗng mồ côi khỏi `src/data/mockData.ts` (311→270 LOC).
- ✅ Gom 2 thư mục store về **`src/frontend/stores`**: `git mv` 4 file admin/MES store, 13 importer → `@frontend/stores/*`,
  `src/stores` bị xoá; nội dung store byte-identical (chỉ sửa depth `../`→`../../`).
- ✅ Tách `App.tsx` **2.153 → 1.100 dòng**: `src/frontend/routes/routeWrappers.tsx`,
  `src/frontend/components/shell/{navConfig,3 shell,LabRoute,index}.tsx`, `src/frontend/hooks/{useCatalogData,useSiteSettings,useOrdersData}.ts`
  (10 file / 1.207 dòng). JSX return **byte-identical** (sha256), `<Routes>` byte-identical 30 path,
  effect deps multiset khớp (9→10, +1 `[]` do tách bootstrap 5 call → 2+3), realtime channel/subscribe/removeChannel 1/1,
  0 circular import trên 143 file.
- **Chưa làm trong phase này (chuyển Phase 4/6):** route table `<Routes>` + `handleNavigate` vẫn ở App;
  19 call `dbService.*` inline trong hooks chưa về service layer; `activeOrder` trả thừa; `useProductionStore` chưa đánh giá dead.
- **Kết quả đo:** initial critical gzip 275.930 → **277.322 (+0,50%)** — refactor thuần, 0 chunk mới (chênh lệch
  do chuyển code giữa chunk; không phải hồi quy).
- **Bằng chứng:** `handoff/phase3-{state-app,stores,app-split,verify}.md`: 24 route-check 390/1440 0 pageerror/0 overflow/
  0 white screen, 0 cache key; add-to-cart toast/store/cart OK; DB-down vẫn empty state; 10/10 offline gate PASS.
- **Gate (đã đạt):** lint/build; browser 390/1440; không đổi data contract.

### Phase 4 — Tách god-file — ✅ DONE 2026-10-21 (QA verdict **GO-WITH-RISKS**)
> **Kết quả:** 7 god-file đã tách thành **65 file mới / 12.222 dòng**, parity độc lập **98,76–100%**;
> lint/build/10 gate PASS; bundle +0,406% (refactor-neutral); smoke 24 route-check 0 pageerror/0 overflow.
> LOC: App **1.100→343**, Tool3DView 1.956→1.057, ModelViewer3D 2.116→869, PricingConfigPanel 3.079→985,
> Group1 2.012→755, WorkshopSettingsView 2.574→865, workshopService 2.243→**128 façade** (14 module backend).
> Giữ nguyên public API + hành vi: `<Routes>`/`handleNavigate` sha256 identical, 38/38 export + 52/52 static
> method service identical, 0 importer phải sửa, 0 circular import (143f→208f), copy VI 1.320/1.321 dòng verbatim.
> **Rủi ro còn lại:** `/admin` + `/lab/settings` runtime chưa mount được vì RoleGuard/no session (parity static);
> +2 chỗ `payload?: any` trùng type (net `: any` +1) → dọn Phase 6; 13 file còn >800 dòng (meshParser 1.878,
> OnboardingWizard 1.448, Explore 1.436, Home 1.433…) → follow-up ngoài scope 7 god-file ban đầu.
> **Bằng chứng:** `handoff/phase4-{tool3d,admin,workshop,app,verify}.md`.
| File | LOC | Cách tách |
|---|---:|---|
| `PricingConfigPanel.tsx` | 3.079 | 6 sub-panel + hook form/validation; giữ UI |
| `WorkshopSettingsView.tsx` | 2.574 | 6 tab + data hooks; tách modal editor |
| `workshopService.ts` | 2.243 | legacy CRUD / my-* / inventory / queue thành module |
| `ModelViewer3D.tsx` | 2.116 | engine hook + overlay + toolbar + panel |
| `Group1WorkshopsPanel.tsx` | 2.081 | 4 tab/region; tách table/form |
| `Tool3DView.tsx` | 1.956 | parser/pricing/viewer/quote hooks |
| `App.tsx` | 2.152 | sau Phase 3, mục tiêu <500 |
- **Gate:** mỗi file tách xong build + browser key flow; không đổi behavior.

### Phase 5 — Bundle & dependency — ✅ DONE 2026-10-21 (QA verdict **GO**)
1. ✅ Lazy `ThreeModelViewer` qua wrapper `LazyThreeModelViewer` (Suspense + fallback no-CLS) → three-vendor rời initial.
2. ✅ Lazy 9 route không critical (Cart, Checkout, OrderSuccess, OrderTracking, MyOrders, Assets, Login, Register, Personalize) → 9 chunk riêng.
3. ✅ `canvas-confetti` rời entry (chỉ còn trong chunk `CheckoutView`).
4. ✅ Prune 18 iconMap glyph (làm ở Phase 1, 224→206, `check-icon-names` PASS).
5. ✅ Bỏ `dotenv`/`autoprefixer`/`bun.lock` (Phase 1).
- **Kết quả đo (official, build HEAD `6e3247d` + Phase 5, gzip Node z9):**
  initial critical **464.251 → 285.807 B gzip (−178.444, −38,44%)**; raw **1.786.443 → 1.076.040 (−39,77%)**;
  entry `index` **892.820/239.321 → 714.080/194.316 (−18,8% gzip)**; `three-vendor` 133.439 gzip **rời preload**.
  Target ≤330K **PASS** (dư ~44K).
- **Bằng chứng:** `handoff/phase5-{routes,three,bundle}.md` — index.html chỉ preload react+supabase; index chunk
  0 static import three; 3 chunk static-import three đều lazy; 28 route-check × 390/1440: 0 pageerror, 0 overflow;
  3D canvas render Home/PDP; fallback box = viewer box (no CLS); 10/10 offline gate PASS.
- **Follow-up Phase 6+ (không chặn):** `supabase-vendor` vẫn eager 57,6K gzip; Home vẫn tải three **sau** first paint
  (poster B1); 4 modal luôn mount ~40K raw; `manualChunks` tách react-dom/client; jszip/3MF lazy (backlog §5 `03-resources.md`).
- **Gate (đã đạt):** build size table trước/sau; browser 390/1440; 3D lazy load đúng.

### Phase 6 — Docs-as-code & test — ✅ DONE 2026-10-21 (QA verdict **GO-WITH-RISKS**)
- ✅ **Docs khớp code:** AGENTS.md + `docs/{README,SETUP_RUNBOOK,architecture/system-overview,database/schema,database/seeds-and-migrations,security/rls-policies,security/rls-runbook}` cập nhật số thực đo từ 12 migration: **32 bảng / 2 view / 19 hàm / 9 định nghĩa trigger (~29 instance) / 92 policy bảng / 7 storage / +1 realtime**; layout mới (hooks/routes/shell, `src/frontend/stores`, workshop 14 module, App 343 dòng); DoD có `test:unit` + docs-as-code.
- ✅ **Sinh tự động:** `scripts/gen-routes-doc.mjs` đọc `src/frontend/routes/AppRoutes.tsx`; `docs/pages/_routes.generated.md` = **30 route**, `source-sha256 f0bd92f499c9`, 2 lần chạy byte-identical.
- ✅ **Test thật (thay `test-pricing.ts` chết):** `tests/unit/*.test.ts` ×5 (format, vat, mappers, pricingEngine, settingsValidators) = **71 test / 24 suite / 277 assert**; script `npm run test:unit` (`tsx --test`), đã wire vào `scripts/gate-manifest.json` + `docs/tasks/baseline.json` (gate `test-unit`).
- ✅ **Cleanup follow-up:** D05–D07 shims **đã xoá** sau codemod **53 dòng import / 46 file** về alias `@/types`, `@/data/mockData`, `@/utils/pricingEngine`; `LanguageContext` DICTIONARY **85→28 key** (57 key chết 0 tham chiếu); EN copy còn sót (HomeView CTA, searchPlaceholder) → VI; icon **206→205** (`cloud_sync` 0 ref).
- **Kết quả đo:** initial critical gzip **278.448 → 277.066 (−1.382, −0,50%)**; index **692.525/186.957 → 689.178/185.575**;
  **hành trình tổng Phase 1→6: 464.251 → 277.066 gzip (−187.185, −40,32%)**. 39 chunk, lazy set đủ, `three-vendor` async.
- **Bằng chứng:** `handoff/phase6-{docs,tests,cleanup,verify}.md` — tests 71/71 PASS; DB tự đếm khớp docs;
  smoke 24 route-check 0 pageerror/0 overflow/0 màn trắng; 10 offline gate PASS; doc-freshness 0.
- **Follow-up (không chặn, cho đợt sau):** live RLS/inspect-db + integration test khi Supabase Resume;
  `tests/**` ngoài tsconfig (cân nhắc tsconfig.test.json); 42 call `dbService.*` inline → service layer;
  dead-store review; 20 file >800 dòng; `supabase-vendor` eager; Phase 7 feature/data wiring. — 🔄 IN PROGRESS 2026-10-21
- Cập nhật `AGENTS.md` (12 migration, 32 bảng/2 view, 19 hàm/9 trigger, 92/7 policy).
- Sửa `docs/README.md`, `docs/database/schema.md`, `docs/security/rls-*` theo số mới; regenerate `docs/pages/_routes.generated.md`.
- Archive `docs/plans/**` + `docs/tasks/ui-redesign/**` v2; canonical docs: `docs/tasks/optimization/AUDIT.md`, `PLAN.md`, `docs/database/schema-notes.md`.
- Thay `test-pricing.ts` chết bằng test thật: `mappers`, `pricingEngine` (pure), validators, `format`; thêm script `npm run test:unit` (no new dep, dùng `node:test`/tsx).
- **Gate:** `check-doc-freshness`, `check-doc-refs` không xấu hơn baseline; test unit pass.

### Phase 7 — Feature/data wiring (riêng, sau cùng)
- `order_items`, `order_files` + `digital_assets`, `assigned_workshop_id`, `warranty_claims`, `reviews`, payout ledger, payment, orders realtime.
- **Không** nằm trong “clean code”; cần spec/DB/RLS riêng.

---

## 2. Phân việc agent (nếu chạy song song)

| Phase | Agent | Write scope | Ghi chú |
|---|---|---|---|
| 1 ✅ | `commerce-auth` (backend) · `design-foundation` (UI) · `ui-auditor` (repo) | backend 4 file + `database.ts`/`client.ts`/`types`; `ui/**`, `mockData`; `package*.json`, config/lock/test | 3 agent song song, scope rời — **DONE** |
| 5 ✅ | `bundle-optimizer` | `App.tsx`, route table, `ThreeModelViewer`, `vite.config.ts` | **DONE** — `handoff/phase5-{routes,three,bundle}.md` |
| 2 ✅ | `i18n-cleaner` | `frontend/context/LanguageContext`, 32 file có `isVi` | **DONE** — `handoff/phase2-verify.md` |
| 3 ✅ | `state-refactor` | `App.tsx`, stores, services, `mockData` D11g–D11m | **DONE** — `handoff/phase3-verify.md` |
| 4 ✅ | `godfile-a` / `godfile-b` | PricingConfig/WorkshopSettings; ModelViewer/Group1/Tool3D | **DONE** — `handoff/phase4-verify.md` |
| 6 🔄 | `docs-qa` | AGENTS/docs/schema/routes-doc/tests | **IN PROGRESS** — task-37 (docs) + task-38 (unit test, 71 test) |
| — | `reviewer` | read-only | mỗi phase 2 review |

**Nguyên tắc:** tối đa 3–4 agent build; file chồng nhau phải tuần tự; mỗi agent ghi handoff.

---

## 3. Gate & đo lường

| Gate | Cách | Ngưỡng |
|---|---|---|
| Typecheck | `npm run lint` | 0 lỗi |
| Build | `npm run build` | PASS |
| Offline gates | `node scripts/run-checks.mjs --only ...` | không hồi quy baseline |
| Dead imports | `rg` symbol/file đã xoá | 0 hit |
| Bundle | `ls -lh dist/assets`, gzip | initial gzip giảm ≥25% |
| UI smoke | 390/768/1440 các route chính | 0 overflow/pageerror |
| Language | grep visible EN ngoài allowlist | 0 |
| Docs | doc-refs/freshness | không xấu hơn baseline |

---

## 4. Kết quả kỳ vọng

| Hạng mục | Trước | Sau (ước tính) |
|---|---:|---:|
| Source LOC | 65.772 | **~62.500–63.500** (-3–5%) |
| Dead files | 4 service + 3 shim + 3 primitive | 0 |
| Dead dbService methods | 6 | 0 |
| `isVi ?` | 1.201 | 0 |
| `DICTIONARY en` | 85 | 0 |
| Initial JS gzip | ~466KB | **~278KB** (-40%) — Phase 5 đo: index 186,24 + react 18,20 + supabase 57,80 + CSS 15,77 |
| File >2.000 LOC | 6 | **0** sau Phase 4 (lớn nhất `Tool3DView` 1.057) |
| Docs lệch số | nhiều | **0 ở docs canonical** sau Phase 6a (AGENTS/docs/README/schema/RLS/routes doc) |
| Test thật | 0 unit | **71 test** (format, mappers, pricingEngine, settingsValidators, vat) — Phase 6b |

> Số LOC/bundle là ước tính; **đo lại sau từng phase** và ghi vào `QA-REPORT`/`AUDIT` cập nhật.

---

## 5. Rủi ro & cách chặn

| Rủi ro | Mức | Chặn |
|---|---|---|
| Xoá nhầm file còn import động/DB string | Cao | grep + TypeScript + build; review từng cụm |
| i18n codemod làm đổi copy/format | Trung bình | codemod theo file, diff text, browser smoke |
| Bỏ localStorage cache làm mất dữ liệu UI | Trung bình | chỉ bỏ cache DB-backed; giữ cart/UI; test offline |
| Tách god-file đổi hành vi | Cao | 1 file/lần, browser flow, review |
| Lazy 3D làm chậm first paint | Trung bình | skeleton + `loading` state; đo LCP |
| Docs/DB paused | Trung bình | chỉ sửa docs theo SQL; live verify sau Resume |
| Trộn feature/data vào clean-code | Cao | feature freeze; Phase 7 riêng |

---

## 6. Việc cần chốt — ✅ ĐÃ CHỐT

1. **Phase 0:** commit/tag baseline hay worktree riêng? → **commit trên `main`** (`4d4a5d1` + `aaff7c4`);
   mỗi phase commit riêng, **không** force-push.
2. Xoá `bun.lock`/`firebase*`/`test-pricing.ts`? → **CÓ** (Phase 1, đã push cùng phase).
3. Bỏ legacy `WorkshopService` seed/fallback trong Phase 3? → **hoãn**, tách quyết định riêng; phải rewrite
   2 method onboarding còn dùng trước (audit `04-refactor.md` §4.4, ~1.140 LOC).
4. Ưu tiên Phase 5 hay Phase 2 trước? → **Phase 5 trước**, rồi Phase 2 (user decision 2026-10-21).
5. **Quản lý agent:** tối đa 3–4 builder song song, write scope rời; Lead commit sau mỗi phase;
   agent **không** commit/push.
