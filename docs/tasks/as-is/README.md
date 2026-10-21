<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# VCUBE — AS-IS Inventory (baseline hiện trạng)

> **Mục đích**: chốt lại **toàn bộ item + workflow đang có trong code** tại một thời điểm, làm
> **baseline so sánh** trước khi nhận bộ UI/UX mới và các change sắp tới. Khi có thay đổi, sửa
> đúng file trong bộ này rồi cập nhật `verified`.
>
> **Nguyên tắc**: mọi số liệu và hành vi ở đây **đọc từ code/SQL**, không chép từ `docs/plans/**`
> (đã archive). Khi tài liệu khác mâu thuẫn với bộ này → **code là sự thật**, ghi lại sai lệch ở
> §"Sai lệch docs ↔ code".

---

## 0. Bộ tài liệu

| File | Nội dung |
|---|---|
| `README.md` (file này) | Snapshot kỹ thuật, cách dùng, bản đồ tài liệu, trạng thái gate |
| [`01-database.md`](./01-database.md) | 32 bảng + 2 view, enum/CHECK, 19 hàm, 9 trigger, ma trận RLS, storage, realtime, seed, bảng chết |
| [`02-backend-state-types.md`](./02-backend-state-types.md) | 8 service + `dbService` + mappers, 6 Zustand store, 2 context, hooks/lib, 53 type, utils/worker |
| [`03-routes-views-components.md`](./03-routes-views-components.md) | 30 route, 16 view, 53 component, 29 UI primitive, theme token |
| [`04-workflows-feature-status.md`](./04-workflows-feature-status.md) | 12 workflow end-to-end + ma trận trạng thái tính năng |
| [`05-debt-and-refactor-targets.md`](./05-debt-and-refactor-targets.md) | Nợ kỹ thuật đo được + mục tiêu refactor + sai lệch docs |

---

## 1. Snapshot kỹ thuật (2026-10-19)

| Hạng mục | Giá trị |
|---|---|
| Nhánh / commit | `main` @ `97cc256` — **working tree bẩn** (13 file sửa + nhiều file mới chưa commit) |
| Tổng source | **64.329 LOC** `.ts/.tsx`, **141 file** |
| File lớn | **42 file > 500 LOC · 19 > 1000 · 6 > 2000** |
| Kiến trúc | Vite 6 SPA (CSR, `vercel.json` framework=vite), không có Next.js runtime |
| Stack | React 19 · TypeScript 5.8 (`strict: false`) · Tailwind 4 · Zustand 5 · react-router-dom 7 · Supabase JS v2 · Three.js 0.185 · `occt-import-js` (WASM) |
| Backend | Supabase PostgreSQL 15 — 32 bảng + 2 view, RLS toàn bộ |
| Gate | `npm run check` = **17 gate** qua `scripts/gate-manifest.json`, đối chiếu `docs/tasks/baseline.json` |
| Trạng thái gate | `npm run lint` ✅ · `npm run build` ✅ · `node scripts/loop-audit.mjs` → **score 8**, 9/9 gate xanh |
| Nợ tĩnh | `any` ×138 · `@ts-ignore` ×2 · `eslint-disable` ×14 · TODO ×1 |

### Working tree chưa commit (cần commit/dọn trước khi refactor)
- Bộ skill mattpocock vendor: `.opencode/skills/**`, `.opencode/commands/**`, `.opencode/mattpocock-skills.json`, `.opencode/MATT-POCOCK-SKILLS.md`, `scripts/sync-mattpocock-skills.mjs`.
- **9 migration mới** chưa có trong `AGENTS.md`/`docs/database/seeds-and-migrations.md`:
  `20261011090000_sec01_designer_payout_hotfix`, `20261011100000_signup_role_designer`,
  `20261011110000_designer_profile_column_guard`, `20261012090000_sec02_open_requests`,
  `20261012100000_check_constraints`, `20261012130000_orders_broadcast`,
  `20261013090000_sec01_payout_table`, `20261013100000_drop_designer_bank_columns`,
  `20261013110000_storage_scheme`.
- Tooling/docs sinh tự động: `scripts/gen-routes-doc.mjs`, `scripts/check-doc-freshness.mjs`,
  `docs/pages/_routes.generated.md`, `docs/database/schema-notes.md`.
- `supabase/scripts/apply_all_manual.sql` (+361 dòng), `src/backend/supabase/database.ts`,
  `src/frontend/stores/useDesignerAdminStore.ts`, `supabase/migrations/20261010_harden_rls.sql`.

---

## 2. Bản đồ thư mục (thực tế)

```
src/
├── main.tsx                     bootstrap: chặn ResizeObserver loop, warmup settings (không await)
├── App.tsx                      2119 LOC — router 30 route, 7 fetch, realtime, FAB, footer, toast
├── index.css                    Tailwind 4 + token (light-only)
├── frontend/
│   ├── views/          16 file — màn cấp trang
│   ├── components/     ~45 file — chia admin/ admin/groups/ tool3d/ designer/ personalize/ onboarding/ auth/ material/ services/ custom/ + shared
│   ├── ui/             29 module — primitive design system (index.ts re-export)
│   ├── context/        AuthContext, LanguageContext
│   ├── stores/         useCartStore, useUIStore
│   ├── hooks/          useInViewport, useSettings
│   ├── lib/            format, vat, productImage, reportError, cn
│   ├── theme/          tokens.ts (đọc CSS var cho WebGL)
│   ├── three/          dispose.ts (giải phóng GPU)
│   ├── data/           mockData.ts (SHIM chết — export * từ src/data)
│   └── types/          index.ts (SHIM chết — export * từ src/types)
├── backend/
│   ├── supabase/       client, database (dbService 30 method), mappers (14 mapper), seedService (chết)
│   ├── services/       asset, catalog(†), customDesign, designer, order, pricing(†), settings, workshop
│   └── lib/            result.ts (WriteResult/ok/fail — hợp đồng ghi duy nhất)
├── stores/             4 store admin/MES (useProduction, useWorkshopAdmin, useDesignerAdmin, useCustomerAdmin)
├── types/index.ts      1136 LOC, 53 export
├── utils/              meshParser (1878), pricingEngine (1054), printEstimate (108), + shim chết frontend/utils
└── workers/            cadParser.worker.ts (OpenCASCADE WASM + STL)

supabase/
├── migrations/         3 file gốc (20260900/01, 20261010) + 9 migration W2 mới
├── functions/          calculate-quote/index.ts (Edge Fn — CHƯA nối client)
├── scripts/            apply_all_manual.sql, bootstrap_admin.sql
├── diagnostics/        audit_schema_truth, rls_audit, verify_admin_settings
├── rollback/           9 file down (khớp 9 migration W2)
└── legacy/             6 migration cũ — KHÔNG chạy

scripts/                23 script gate/generator/tooling (xem §1)
docs/                   README.md (portal) → architecture/ pages/ database/ security/ design/ tasks/ runbooks/
```

(†) = service có **0 importer** ở frontend.

---

## 3. Trạng thái ổn tài liệu (khi nào phải sửa gì)

| Nguồn | Vai trò | Trạng thái |
|---|---|---|
| `docs/README.md` | Portal canonical | Active, nhưng số liệu bảng/policy đã lạc hậu (xem `05-debt`) |
| `docs/architecture/*` | 3 tài liệu kiến trúc | Active; `system-overview.md` mô tả đúng phần lớn, còn thiếu 9 migration W2 |
| `docs/pages/*` | Spec 4 nhóm trang + `_routes.generated.md` | Active; nhiều chỗ nói "chưa có bảng X" là **sai** (bảng có, UI chưa nối) |
| `docs/database/schema.md` | Sinh tay 1082 dòng | **Lạc hậu** — thiếu 9 migration W2; `schema-notes.md` ghi drift |
| `docs/security/*` | rls-policies, rls-runbook, incident | Active; số policy/bucket lệch (88+4 vs ghi 90; 7 vs ghi 6) |
| `docs/design/*` | tokens, icon-map, qa-checklist, data-honesty, taste-contract, ui-audit | Active (ui-audit = snapshot) |
| `docs/tasks/*` | Kế hoạch thi công | Active — xem `DRIFT-REMEDIATION-PLAN` + `DRIFT-TASKS` |
| `docs/tasks/as-is/**` | **Bộ này** | Baseline 2026-10-19 |
| `docs/plans/**` | 39 file refactor cũ | **ĐÃ ARCHIVE** (SUPERSEDED) — chỉ tra cứu lịch sử |

---

## 4. Cách dùng bộ này khi nhận UI/UX mới

1. Nhận brief UI/UX → đối chiếu từng màn với `03-routes-views-components.md` (view nào bị thay, component nào bị thay, primitive nào cần thêm).
2. Đối chiếu tính năng mới với `04-workflows-feature-status.md` §"ma trận trạng thái" để biết màn đó có dữ liệu thật hay đang rỗng/giả.
3. Ghi delta vào `05-debt-and-refactor-targets.md` (mục tiêu refactor) rồi mới lên task.
4. Cập nhật `verified` ở header và ghi 1 dòng vào changelog dưới đây.

### Changelog
| Ngày | Thay đổi | Người |
|---|---|---|
| 2026-10-19 | Khởi tạo bộ as-is baseline (từ 4 subagent đọc code + SQL) | thanh |
