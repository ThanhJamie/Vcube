<!-- doc-meta: status=active; verified=2026-10-21; owner=thanh -->
# AGENTS.md — VCUBE

Marketplace for 3D printing and precise CAD files: WebGL 3D viewer, material configurator, Supabase realtime catalog.

## Running (the repo lives in WSL2 Ubuntu-24.04)

The project is developed inside WSL2 (Ubuntu-24.04) and is also reachable from Windows via `\\wsl.localhost\...`. Never build with the Windows toolchain. Run all commands from the repo root:

- Dev: `npm run dev` -> http://localhost:3000
- Typecheck: `npm run lint`
- Build: `npm run build`
- Unit test: `npm run test:unit` (`tsx --test tests/unit/*.test.ts`; Phase 6b — 71 test cho `format`, `mappers`, `pricingEngine`, `settingsValidators`, `vat`)
- Gate tổng (offline + live, so baseline): `npm run check`
- Integration test (cần Supabase sống): `npx tsx scripts/test-catalog-sync.ts`

From Windows, prefix with `wsl -d Ubuntu-24.04 --cd "$(git rev-parse --show-toplevel)" -- bash -lc "<command>"` (resolve the repo root inside WSL; never hardcode an absolute path).

To keep a dev server alive after the command returns, detach it: `setsid nohup npm run dev >/tmp/vcube-dev.log 2>&1 </dev/null &` (details in the `wsl-project-bridge` skill).

## Stack

React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, Zustand 5, react-router-dom 7, Supabase, Three.js 0.185, lucide-react. This is a Vite SPA (`vercel.json` framework=vite): there is no Next.js runtime. The `next` dependency was removed and the dead Next tree (`src/app/**`, `middleware.ts`) has been deleted; `tsconfig.json` only excludes `node_modules` and `dist`. Do not add Next.js patterns.

UI: **light-only** (v3 "Soft Studio", `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md`); không có ThemeProvider/dark theme; font Be Vietnam Pro + JetBrains Mono; ngôn ngữ hiển thị **chỉ tiếng Việt**.

## Layout

- `src/App.tsx` — provider stack + shell chrome (FAB/toast/footer/overlays), **343 dòng** (Phase 4 tách từ 2.153). **Route table KHÔNG còn ở đây.**
- `src/frontend/routes/` — `AppRoutes.tsx` (toàn bộ `<Routes>`: 30 path + 7 redirect) + `routeWrappers.tsx` (`ProtectedRoute`, `ExploreRoute`, `ProductDetailRoute`, `PersonalizeRoute`, `OrderSuccessRoute`, `OrderTrackingRoute`).
- `src/frontend/hooks/` — data + realtime: `useCatalogData`, `useSiteSettings`, `useOrdersData`, `useAppNavigation`, `useInViewport`, `useSettings`.
- `src/frontend/components/shell/` — `AppOverlays`, `DashboardShell`, `DesignerDashboardShell`, `LabDashboardShell`, `LabRoute`, `navConfig`, `screens`.
- `src/frontend/views` / `components` / `context` / `ui` (29 primitive) / `stores` / `lib` / `types` / `theme` — UI; **`src/stores` đã xoá ở Phase 3** (store chỉ còn ở `src/frontend/stores`).
- `src/frontend/stores` — 6 store Zustand: `useCartStore`, `useUIStore`, `useCustomerAdminStore`, `useDesignerAdminStore`, `useProductionStore`, `useWorkshopAdminStore`.
- `src/backend/supabase` — client, database service, mappers, seed service.
- `src/backend/services` — pricingService, orderService, catalogService, customDesignService, settingsService; `workshopService.ts` là **façade 128 dòng** (Phase 4) trên 14 module `workshop/{profiles,machines,materials,accessories,inventory,queue,customers,designers,catalogs,seed,shared,storage,constants,types}.ts`.
- `src/data` (seed/default content), `src/types`, `src/utils`, `supabase/migrations` (**13 file**), `scripts`, `tests/unit`.

## Conventions

- Keep the backend/frontend split; database access goes through `src/backend/supabase/*` services, never inline in components.
- RLS on every table; the secret/service-role key is server-only; never expose or commit secrets.
- **Realtime subscriptions** live in `src/frontend/hooks/useCatalogData.ts` + services (`customDesignService`, `settingsService`) — KHÔNG đặt lại trong `App.tsx`.
- **Một ngôn ngữ (D0):** UI tiếng Việt duy nhất. Dùng `const { t } = useLanguage()`; **không** thêm `isVi ? … : …`, nhánh EN hay `en:` dictionary (Phase 2 đã xoá 1.428 nhánh / 85 entry).
- **Một nguồn dữ liệu:** server là nguồn duy nhất; **không** cache DB-backed trong `localStorage` (`vcube_products`, `vcube_materials`, `vcube_printers`, `vcube_site_content` — đã xoá Phase 3). Chỉ giữ state UI/cart.
- **Kích thước module:** sau Phase 4, giữ file ≤ ~800 dòng; seam tách theo **chiều dữ liệu** (1 nguồn dữ liệu + 1 vùng render), không theo chiều JSX.
- **Sản phẩm & publish (FL-2a, 2026-10-23):** designer chỉ tạo/sửa sản phẩm CỦA MÌNH ở trạng thái chưa xuất bản
  (`draft`/`under review`/`pending`) qua `dbService.insertProduct`; **admin là bên publish** (`saveProduct` upsert + policy admin-all).
  Dùng helper `src/frontend/lib/productStatus.ts` cho nhãn/filter (DB lưu status lowercase). Không tự thêm policy publish cho designer.
- **Icon (một nguồn duy nhất):** mọi icon UI render qua `<Icon name="…" size={…} />` (`src/frontend/ui/Icon.tsx` + `iconMap.ts`); **cấm** `from 'lucide-react'` ngoài `src/frontend/ui/**` và **cấm emoji làm icon** (trừ comment; `<option>`/canvas thì bỏ emoji, giữ text). Gate: `node scripts/check-icon-library.mjs` (+ `check-icon-names`). Raw `<svg>` chỉ cho brand Google logo. Xem `docs/design/icon-map.md` §POLICY.
- Match existing patterns; make the smallest change; no unrelated refactors.
- **Engineering skills (mattpocock)**: bộ 27 skill đã vendor ở `.opencode/skills/`, gọi bằng `/grill-me`, `/to-spec`, `/tdd`… hoặc `@<id>`; chạy `/setup-matt-pocock-skills` một lần cho repo này. Chi tiết + cách cập nhật (`npm run skills:sync`): `.opencode/MATT-POCOCK-SKILLS.md`.
- **UI/UX skills**: khi refactor giao diện, đọc `docs/design/taste-contract.md` TRƯỚC. Nó chốt skill nào dùng cho bề mặt nào và override nào bắt buộc (giữ Be Vietnam Pro + lucide/iconMap, data-honesty, light-first, không thêm dep). Skill cài ở `~/.agents/skills/` (`redesign-existing-projects`, `design-taste-frontend`, `full-output-enforcement`, `imagegen-frontend-web`).

## Definition of done

1. `npm run lint` — PASS (0 lỗi TypeScript).
2. `npm run build` — PASS.
3. `npm run test:unit` — PASS (Phase 6b).
4. `npm run check` — không hồi quy baseline (offline gate). Live gate (`verify-rls`/`inspect-db`) có thể bỏ khi Supabase paused/DNS, nhưng phải ghi rõ trong báo cáo.
5. Verify flow đã đổi trên browser tại http://localhost:3000 (viewport 390 + 1440; 0 tràn ngang, 0 `pageerror`).
6. **Docs-as-code:** đổi route ⇒ chạy `node scripts/gen-routes-doc.mjs`; đổi schema/RLS ⇒ cập nhật `docs/database/*` + `docs/security/rls-*` theo số đo thực (xem bảng dưới).
7. Report rõ từng gate + file đã sửa; **không commit/push** (Lead commit theo phase).

## Environment and database

`.env` is **gitignored** and already holds real credentials. Required keys:

| Biến | Vai trò |
|---|---|
| `VITE_SUPABASE_URL` | URL project |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) | khoá client — an toàn để lộ, RLS là cổng chặn |
| `VITE_SITE_URL` | domain dùng cho auth redirect |
| `SUPABASE_SECRET_KEY` (`sb_secret_…`) | **SERVER ONLY** — bỏ qua toàn bộ RLS. Không bao giờ đưa vào `define` của Vite |
| `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SITE_URL` | **tên cũ (legacy)** — `vite.config.ts`/`client.ts` vẫn đọc làm fallback; khai báo `VITE_*` là đủ |

### Migrations — 13 file, chạy theo thứ tự tên file

| # | File | Vai trò |
|---:|---|---|
| 1 | `20260900_rls_helpers.sql` | `current_app_role()` + `is_admin()` (+ grants) |
| 2 | `20260901_baseline_schema.sql` | toàn bộ schema: **31 bảng**, **1 view** (`pricing_config`, `security_invoker=true`), 49 index, **7 hàm**, **5 định nghĩa trigger** (touch `updated_at` gắn 21 bảng…), 2 storage bucket, realtime, seed 3 bản ghi cấu hình |
| 3 | `20261010_harden_rls.sql` | **88 policy bảng hiệu lực** (allowlist `v_keep` 90 tên, trong đó 2 policy `pricing_config` bị bỏ qua vì là **VIEW**) + **7 policy storage** (allowlist `v_ok`; `cad_owner_rw` thêm ở #12); helper tạm `_vcube_*` bị drop cuối file; trigger chống sửa cột đặc quyền (`orders`, `workshop_profiles`), tái tạo trigger profile; `security_invoker` cho view |
| 4 | `20261011090000_sec01_designer_payout_hotfix.sql` | SEC-01: thu hồi SELECT bảng `designer_profiles`, grant theo cột an toàn + 2 RPC `get_my_payout_info`/`admin_get_designer_payout` |
| 5 | `20261011100000_signup_role_designer.sql` | đăng ký chỉ được map role `designer`; tái tạo `trg_create_profile_for_new_user` |
| 6 | `20261011110000_designer_profile_column_guard.sql` | trigger chặn designer tự nâng `royalty_percent`/cột đặc quyền (`42501`) |
| 7 | `20261012090000_sec02_open_requests.sql` | **view** `open_design_requests` + RPC nguyên tử `claim_design_request`; thay 2 policy designer trên `custom_design_requests` |
| 8 | `20261012100000_check_constraints.sql` | CHECK constraints (`orders.payment_status`, …) — `NOT VALID`, chờ audit + `VALIDATE` |
| 9 | `20261012130000_orders_broadcast.sql` | trigger `trg_orders_broadcast` + `orders_broadcast_status()` (payload chỉ `{id,status}`) + policy `realtime.messages` chỉ admin |
| 10 | `20261013090000_sec01_payout_table.sql` | **bảng 32:** `designer_payout_info` (1-1 designer, RLS owner+admin, 4 policy) + RPC `upsert_my_payout_info`; chép dữ liệu từ cột cũ |
| 11 | `20261013100000_drop_designer_bank_columns.sql` | SEC-01 phase 2 — **cổng H, CHƯA ÁP**: drop 3 cột bank/tax khỏi `designer_profiles` |
| 12 | `20261013110000_storage_scheme.sql` | scheme `cad/<uid>/<uuid>/<file>` — tái tạo policy `vcube_cad_files_cad_owner_rw` (chống path `..`, đủ ≥3 cấp). **ĐÃ ÁP production 2026-10-23** (trước đó là DRAFT) |
| 13 | `20261024090000_designer_publish.sql` | **ĐÃ ÁP 2026-10-23**: `products.designer_id` + index + **4 policy** cho designer tự đăng/sửa/xoá sản phẩm CỦA MÌNH ở trạng thái chưa xuất bản (`under review`/`pending`/`draft`); designer KHÔNG tự publish — admin publish; bản pending không lộ public |

`supabase/legacy/` chứa 6 migration cũ — **không chạy** (xem README ở đó). Không tạo file migration mới chồng lấn: sửa trực tiếp chuỗi 13 file trên.

### Số liệu DB thực tế (đếm từ migration — 2026-10-21)

| Hạng mục | Số thực | Cách đếm / nguồn |
|---|---:|---|
| Migration | **13** | `ls supabase/migrations/*.sql \| wc -l` |
| Bảng | **32** | `20260901_baseline_schema.sql` 31 + `designer_payout_info` (#10). Đếm: `grep -rhoiE 'create table (if not exists )?(public\.)?[a-z0-9_]+' supabase/migrations/*.sql \| sed -E 's/.*[. ]([a-z0-9_]+)$/\1/' \| sort -u \| grep -vx if \| wc -l` |
| View | **2** | `pricing_config` (`security_invoker=true` — compatibility view trên `pricing_configs`) + `open_design_requests` (`security_invoker=false`; chỉ designer/admin, cột brief không nhạy cảm) |
| Hàm thường trực | **19** | 21 `create function` − 2 helper tạm bị `drop` cuối `20261010_harden_rls.sql` (`_vcube_make_policy`, `_vcube_has_columns`). 9 helper/RPC (`current_app_role`, `is_admin`, `is_admin_or_lab`, `current_workshop_partner_id`, `get_order_by_guest_token`, `claim_design_request`, `admin_get_designer_payout`, `get_my_payout_info`, `upsert_my_payout_info`) + 10 hàm trigger (`fn_*` + `orders_broadcast_status`) |
| Định nghĩa trigger | **9** | 12 câu `create trigger` tĩnh (3 lần tái tạo `trg_create_profile_for_new_user`, 2 lần `trg_protect_profile_…`); **29 instance** runtime = `trg_touch_updated_at` × 21 bảng (vòng lặp baseline) + 8 trigger gắn 1 bảng |
| Policy bảng hiệu lực | **96** | 62 call `_vcube_make_policy` trên bảng + 22 từ vòng lặp `v_catalog_read` (11 bảng × 2) + 2 từ vòng lặp `workshop_machines/workshop_materials` + 2 policy `orders` tạo trực tiếp (#3) + 4 policy `designer_payout_info` (#10) + 4 policy `products` designer (#13). 2 tên policy `pricing_config` trong `v_keep` **không bao giờ được tạo** vì `pricing_config` là view (`_vcube_make_policy` kiểm `relkind`) |
| Policy storage | **8** | `v_ok` trong `20261010_harden_rls.sql` + `vcube_cad_files_cad_owner_rw` (#12, **đã áp 2026-10-23**) ⇒ 7+1 |
| Policy realtime | **1** | `orders_admin_realtime` trên `realtime.messages` (#9) — chỉ admin đọc topic `orders:admin`; có thể SKIP nếu Realtime Authorization chưa bật |

> Đừng dùng `grep -c 'create policy'` để kết luận: policy bảng được sinh **động** trong `DO` block (`_vcube_make_policy` + `foreach`) nên grep thô chỉ thấy 21 câu literal. Dùng bảng breakdown ở trên hoặc `node scripts/verify-rls.mjs` khi DB sống.

**Quyền là do DB quyết định:** vai trò đọc từ `public.user_profiles.role`. Không dùng `user_metadata`, không hardcode email, không `FOR ALL USING (true)`. Cấp quyền admin bằng `supabase/scripts/bootstrap_admin.sql`.

### Gate bổ sung (ngoài lint/build)

Chạy toàn bộ gate (RLS lint, contrast, fabricated, icon, UI rules, error handling, SQL syntax, test tích hợp…) bằng một lệnh:

```bash
npm run check
```

`npm run check` chạy mọi checker qua `scripts/gate-manifest.json` và so với baseline. Chi tiết vận hành & khắc phục sự cố: `docs/security/rls-runbook.md`.

## Loop Improvement (tự lặp tối ưu web)

Vòng lặp tự cải tiến: **audit → chọn 1 mục nợ ưu tiên → sửa nhỏ nhất → đo lại → lặp**.

- Đo/backlog (nguồn sự thật): `node scripts/loop-audit.mjs` (`--quick` bỏ build, `--json` cho máy;
  ghi `.loop/latest.json` + `.loop/history.jsonl`, đã gitignore). `score` càng thấp càng tốt;
  RC=1 = có hồi quy.
- Chạy trong opencode: `/improve` (một vòng) và `/loop <N> [vùng]` (N vòng, mặc định 3) — dùng
  agent `loop-orchestrator` + skill `web-improvement-loop` (ở `.opencode/`).
- Ràng buộc: mỗi vòng một mục, sao lưu file vào `.loop/backups/` trước khi sửa, hoàn nguyên nếu
  score không giảm hoặc gate/lint fail; không commit/push; không thêm dependency.
- Smoke browser tùy chọn: `LOOP_BROWSER_CMD="node /tmp/opencode/pwtest/test.mjs" node scripts/loop-audit.mjs`.

## Tài liệu — nguồn chuẩn

Điểm vào: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/tasks/`, `docs/SETUP_RUNBOOK.md`.

- **Sinh tự động (đừng sửa tay):** `docs/pages/_routes.generated.md` — 30 route, sinh từ `src/frontend/routes/AppRoutes.tsx` bằng `node scripts/gen-routes-doc.mjs` (có `source-sha256`).
- Runtime & routes: `docs/architecture/system-overview.md`; 3D pipeline: `docs/architecture/3d-cad-pipeline.md`; giá: `docs/architecture/pricing-engine.md`.
- DB: `docs/database/schema.md` (cấu trúc), `schema-notes.md` (bất biến hành vi & drift code↔DB), `seeds-and-migrations.md`.
- Spec thiết kế & luật trung thực: `docs/design/tokens.md`, `icon-map.md`, `qa-checklist.md`, `data-honesty.md`, `research-brief.md`, `taste-contract.md`.
- **Đợt tối ưu 2026-10 (canonical):** `docs/tasks/optimization/README.md` + `PLAN.md` (phase/status) · `AUDIT.md` + `01-pages-features.md` (as-is) · `03-resources.md`/`RESOURCES.md` (bundle) · `04-refactor.md` (cấu trúc) · `DEAD-CODE.md` · `handoff/` (bằng chứng từng phase).
- **UI v3 "Soft Studio":** `docs/tasks/ui-redesign-v3/PLAN.md`, `DESIGN-LANGUAGE.md`, `handoff/**`, `QA-REPORT.md`.
- Bộ kế hoạch refactor cũ `docs/plans/**` **đã archive** (39 file mang banner SUPERSEDED) — chỉ tra cứu lịch sử, số liệu lạc hậu. Xem `docs/archive/README.md`.

## Trạng thái thi công (cập nhật 2026-10-21, sau Phase 1–5)

- **Phase 1 — Dead code: DONE** — −552 LOC backend, −~700 LOC UI, −357 LOC test chết, −132 KB lock/artifact, −2 dependency; gate xanh.
- **Phase 5 — Bundle: DONE** — `index` 892,82 kB → **~714 kB raw / 194–186 kB gzip**; `three-vendor` **rời initial** (chỉ tải khi 3D viewer mount); 9 route lazy; `canvas-confetti` rời entry. Initial JS+CSS gzip **~464 → ~278 kB (−40%)** (đo 2026-10-21: index 186,24 + react 18,20 + supabase 57,80 + CSS 15,77; ba số đầu theo lần build sạch gần nhất — đo lại bằng `npx vite build` + gzip từng chunk).
- **Phase 2 — i18n: DONE** — xoá **1.428** nhánh `isVi`/34 file, 85 entry `en:`; API còn `{ t }`; UI VI-only, 0 `isVi` trong `src`.
- **Phase 3 — Data/state: DONE** — 0 cache `localStorage` DB-backed; store gom về `src/frontend/stores` (6 store); App.tsx 2.153 → 1.100 dòng; hooks/routes/shell tách.
- **Phase 4 — God-file: DONE** — 7 file tách thành 65 module: App **343**, Tool3DView **1.057**, ModelViewer3D **869**, PricingConfigPanel **985**, Group1WorkshopsPanel **755**, WorkshopSettingsView **865**, `workshopService` façade **128**; parity 98,76–100%; QA **GO-WITH-RISKS** (`handoff/phase4-verify.md`).
- **FL full-flow (2026-10-23):** FL-1 order flow (snapshot tiền + order_items + payment thủ công + admin detail + invoice DB) ✅; FL-2a designer upload + publish (Supabase Storage + `digital_assets` + `products.designer_id`) ✅ verified thật. FL-2b/FL-3 tiếp.
- **Phase 6 — Docs-as-code & test: DONE 2026-10-21** — docs-as-code (task này) + unit test `tests/unit/*.test.ts` (**71 test**, `npm run test:unit`) (task 6b).
- **RLS:** 32 bảng + 2 view, **96 policy bảng hiệu lực** + **8 storage** (+1 `realtime.messages`); **0 bảng hở RLS**; anon đọc `orders`/`user_profiles` = 0 dòng. Lần kiểm chứng production đầu tiên (2026-09-12) đo trên **21 bảng** — số hiện tại là 32; lịch sử ghi ở `docs/security/rls-runbook.md` §10.3/§10.6.
- **Khoá Supabase: đã sửa** — `client.ts`/`vite.config.ts` không hardcode; app dùng `sb_publishable_…`.
- **Vai trò UI: đã lấy từ DB** (`AuthContext.resolveDbRole`), không suy từ email; ghi `user_metadata` chỉ còn ở DEV.
- **Còn tồn / follow-up:** (1) rotate `sb_secret_…` (đã lộ trong chat); (2) bật Google OAuth hoặc bỏ nút Google + nhánh tạo user giả; (3) seed dữ liệu mẫu bằng `node scripts/seed-sample-data.mjs`; (4) khai báo env trên Vercel; (5) D05–D07 (dead-code hoãn, xem `DEAD-CODE.md` §1); (6) bundle: `supabase-vendor` vẫn eager ~57,8 kB gzip, Home tải `three` sau first paint, 4 modal luôn-mount ~40 kB raw (xem `03-resources.md` backlog); (7) live RLS/data verify sau khi Supabase Resume; (8) phase 7 feature/data wiring (plan riêng).

## Lưu ý công cụ (quan trọng)

Shell mặc định của harness là **Windows PowerShell 5.1**. `Get-Content` đọc file **không có BOM** theo ANSI codepage và sẽ **làm hỏng tiếng Việt** (mojibake) khi ghi lại. Với mọi file có ký tự ngoài ASCII, dùng .NET I/O:

```powershell
[System.IO.File]::ReadAllText($p, (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
```

Ngoài ra công cụ `write`/`edit` của DSH **không ghi được** qua đường dẫn UNC `\\wsl.localhost\...` (`ENOTSUP`); hãy ghi ra đường dẫn Windows thật rồi copy vào WSL, hoặc dùng pwsh với .NET I/O.
