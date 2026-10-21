<!-- doc-meta: status=draft; verified=2026-10-21; owner=lead -->
# PLAN — Clean-code & resource optimization (2026-10-21)

> **Mục tiêu:** giảm code chết/lặp, hội tụ một nguồn sự thật cho data/state, giảm bundle & RAM,
> làm docs khớp code — **không đổi hành vi nghiệp vụ, không đụng DB/schema** trong đợt này.
> **Nguồn:** `AUDIT.md` + `DEAD-CODE.md` + `docs/tasks/ui-redesign-v3/QA-REPORT.md`.
> **Trạng thái:** DRAFT FOR REVIEW — chưa thi công.

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

### Phase 0 — Checkpoint & baseline (0.5 ngày)
- Commit/tag working tree hiện tại thành **baseline UI v3** (hoặc tạo worktree/branch `chore/clean-code`).
- Lưu backup `.loop/backups/` (đã có bản trước v3; tạo bản mới).
- Chốt baseline: `npm run lint`, `npm run build`, `npm run check` offline, bundle sizes từ `dist/`.
- **Gate:** baseline xanh; có commit/tag để revert.

### Phase 1 — Xoá dead code an toàn (2–3 ngày) — **ROI cao nhất**
Theo `DEAD-CODE.md` cụm A→E:
1. Xoá 4 backend file chết (D01–D04) + 3 shim (D05–D07); sửa `src/frontend/ui/index.ts`.
2. Xoá 3 primitive chết (D08–D10); bỏ export.
3. Xoá mock constant rỗng (D11) sau khi thay call-site bằng `[]`.
4. Xoá 8 type chết (D12).
5. Xoá 6 `dbService` method 0 caller (D13).
6. Xoá `test-pricing.ts`, `tests` rỗng, firebase/metadata/assets, `bun.lock` (D19–D26).
7. Bỏ `dotenv`/`autoprefixer` khỏi package (D27–D28).
- **Không** xoá `SEED_*`/legacy WorkshopService ở phase này.
- **Ước tính:** ~1.500–1.600 LOC + 357 LOC test + 112KB lock + 3.9MB artifact local.
- **Gate:** lint/build/10 gate; `rg` 0 hit các symbol đã xoá; bundle không tăng.

### Phase 2 — Một ngôn ngữ, xoá nhánh i18n chết (3–4 ngày)
- Codemod 1.201 `isVi ? 'VI' : 'EN'` → chỉ giữ VI; 46 `language ===` → bỏ.
- Xoá `DICTIONARY` `en:` (85 entries), `Language` type, `setLanguage`/`toggleLanguage` nếu không còn caller; giữ API `useLanguage` nếu cần `t()` cho claims.
- Xoá `configuredClaims` en fallback; giữ claims đọc từ settings.
- Giữ nguyên technical acronyms/allowlist; copy review theo `COPY-GLOSSARY.md`.
- Làm theo file, không codemod toàn repo một lần; 2 batch: storefront/transaction, console.
- **Ước tính:** ~500–1.200 LOC + 85 dictionary entries; giảm dead branch, dễ đọc.
- **Gate:** lint/build; grep visible EN = 0 ngoài allowlist; smoke 12 route; không đổi text VI.

### Phase 3 — Hợp nhất data/state (3–5 ngày)
- Bỏ localStorage cache DB-backed trong `App.tsx` (`vcube_products`, `vcube_materials`, `vcube_printers`, `vcube_site_content`); server là nguồn duy nhất; giữ cache UI/cart nếu cần.
- Gom 2 thư mục store (`src/frontend/stores` + `src/stores`) về `src/stores` hoặc `src/frontend/stores`; bỏ store trùng/không dùng (`useProductionStore` nếu chỉ demo).
- Tách `App.tsx` state theo domain: catalog/settings/orders/cart-shell; route table ra `src/frontend/routes/`.
- Chuyển `dbService` inline call ở panel về service; bỏ `computeShippingFee` khỏi `database.ts` nếu service đã có.
- **Gate:** lint/build; browser 390/1440; không đổi data contract.

### Phase 4 — Tách god-file (4–6 ngày)
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

### Phase 5 — Bundle & dependency (2–3 ngày)
1. Lazy `ThreeModelViewer` ở Home/PDP (Suspense + skeleton) → three-vendor rời initial (~-134KB gzip).
2. Lazy 8 route không critical (Cart, Checkout, Orders, Tracking, Assets, Login, Register, Personalize) → tách index chunk.
3. `canvas-confetti` dynamic import trong handler (bỏ khỏi initial).
4. Prune 18 iconMap glyph không dùng (verify dynamic data trước); xem xét tách iconMap theo nhóm.
5. Bỏ dep chết Phase 1; đo lại `dist` và ghi baseline.
- **Ước tính:** initial JS gzip **~466KB → ~300–330KB (-30–35%)**; LCP cải thiện.
- **Gate:** build size table trước/sau; browser 390/1440; 3D lazy load đúng.

### Phase 6 — Docs-as-code & test (2–3 ngày)
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
| 1 | `deadcode-cleaner` | 4 service chết, 3 shim, 3 primitive, mock/type/dbService, config | 1 agent; chạy cụm A→E |
| 2 | `i18n-cleaner` | `frontend/context/LanguageContext`, 32 file có `isVi` | sau Phase 1; 2 batch |
| 3 | `state-refactor` | `App.tsx`, stores, services | sau Phase 2; cần review |
| 4 | `godfile-a` / `godfile-b` | PricingConfig/WorkshopSettings; ModelViewer/Group1/Tool3D | 2 agent, file rời |
| 5 | `bundle-optimizer` | `App.tsx`, routes, ThreeModelViewer, vite.config | sau Phase 3/4 |
| 6 | `docs-qa` | AGENTS/docs/schema/tests | song song cuối |
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
| Initial JS gzip | ~466KB | **~300–330KB** (-30–35%) |
| File >2.000 LOC | 6 | 3–4 (sau Phase 4) |
| Docs lệch số | nhiều | 0 ở docs canonical |
| Test thật | 0 unit | mappers/pricing/validators/format |

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

## 6. Việc cần chốt

1. **Phase 0:** commit/tag baseline hay làm trên worktree riêng?
2. Có chấp nhận xoá `bun.lock`/`firebase*`/`test-pricing.ts` không?
3. Có chấp nhận bỏ legacy `WorkshopService` seed/fallback (data-honesty) trong Phase 3 không?
4. Ưu tiên Phase 1 (dead code) + Phase 5 (bundle) trước, hay Phase 2 (i18n) trước?
