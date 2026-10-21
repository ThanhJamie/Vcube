<!-- doc-meta: status=active; verified=2026-10-21; owner=lead -->
# Optimization — Audit & Plan (VCUBE 2026-10-21)

> Bộ tài liệu **AS-IS mới** + plan clean-code/tối ưu resource. Thay cho số liệu cũ trong
> `docs/plans/**` (đã archive) và bổ sung sau đợt UI v3 (đã commit `4d4a5d1`).

| File | Nội dung |
|---|---|
| [`AUDIT.md`](./AUDIT.md) | Snapshot, kiến trúc, 23 page, feature matrix, nợ clean-code, docs drift |
| [`01-pages-features.md`](./01-pages-features.md) | Audit 30 route/23 màn: feature matrix, gap P0/P1 (orders, digital fulfilment…) |
| [`03-resources.md`](./03-resources.md) | Audit resource sâu: bundle theo module/source-map, asset, runtime, backlog giảm tải |
| [`04-refactor.md`](./04-refactor.md) | Audit cấu trúc: 8 god-file, i18n dead branch, data/state, work breakdown refactor |
| [`DEAD-CODE.md`](./DEAD-CODE.md) | Danh sách file/function/constant/type/dependency có thể xoá (kèm LOC, bằng chứng, độ an toàn) |
| [`RESOURCES.md`](./RESOURCES.md) | Bản tóm tắt bundle/asset/dependency/runtime, hành động giảm initial ~30–35% gzip |
| [`PLAN.md`](./PLAN.md) | Plan 7 phase, agent ownership, gate, impact, risk — **nguồn chuẩn để thi công** |
| [`handoff/`](./handoff/) | Handoff từng agent/phase: bằng chứng, diff, gate, rủi ro |

## Trạng thái thi công

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 0 | Checkpoint & baseline | **✅ DONE** — commit `4d4a5d1` + `aaff7c4`, baseline lint/build xanh, initial gzip ~466KB |
| 1 | Dead code an toàn | **✅ DONE** — −552 LOC backend, −~700 LOC UI, −357 LOC test chết, −132 KB lock/artifact, −2 dep; lint/build/7 gate xanh |
| 5 | Bundle & dependency | **✅ DONE** — initial critical gzip **464.251 → 285.807 (−38,44%)**; three-vendor rời initial (async); 9 route lazy; `confetti` rời entry; lint/build/10 gate xanh; QA verdict **GO** (`handoff/phase5-bundle.md`) |
| 2 | Một ngôn ngữ (i18n) | ⬅️ **KẾ TIẾP** |
| 3 | Hợp nhất data/state | ⏳ |
| 4 | Tách god-file | ⏳ |
| 6 | Docs-as-code & test | ⏳ |
| 7 | Feature/data wiring | ⏳ (plan riêng) |

**Thứ tự thi công đã chốt:** Phase 0 → 1 → **5** → 2 → 3 → 4 → 6 (Phase 7 sau cùng).
**Quy ước:** agent không commit; Lead commit/push từng phase; tối đa 3–4 builder song song với write scope rời.

## TL;DR

- Repo baseline: **139 file / 65.772 LOC / 30 route (23 màn + 7 redirect)**; UI v3 đã xong, P0/P1 = 0.
- Nợ lớn nhất còn lại: **1.201 nhánh `isVi` chết (chỉ xoá được ~250–350 LOC)**, **~1.140 LOC
  `workshopService` legacy/`SEED_*`** (cần rewrite 2 method onboarding trước), 7 god-file >1.900 LOC,
  data/state phân mảnh (4 nguồn sự thật), **initial bundle ~466KB gzip** (Three.js 133KB eager).
- Phase 1 đã xoá: 4 backend service/barrel + 3 primitive chết + 6 `dbService` method + 8 type +
  6 mock constant + 18 glyph icon + `test-pricing.ts`/Firebase/metadata/`bun.lock` + `dotenv`/`autoprefixer`.
  **Hoãn có lý do:** D05–D07 (đính chính: 16 importer sống — xem `DEAD-CODE.md` §1).
- Không xoá DB/schema; Supabase đang paused nên live RLS/data phải kiểm sau Resume.
