<!-- doc-meta: status=active; verified=2026-10-21; owner=lead -->
# Optimization — Audit & Plan (VCUBE 2026-10-21)

> Bộ tài liệu **AS-IS mới** + plan clean-code/tối ưu resource. Thay cho số liệu cũ trong
> `docs/plans/**` (đã archive) và bổ sung sau đợt UI v3 đang nằm trong working tree.

| File | Nội dung |
|---|---|
| [`AUDIT.md`](./AUDIT.md) | Snapshot, kiến trúc, 23 page, feature matrix, nợ clean-code, docs drift |
| [`DEAD-CODE.md`](./DEAD-CODE.md) | Danh sách file/function/constant/type/dependency có thể xoá (kèm LOC, bằng chứng, độ an toàn) |
| [`RESOURCES.md`](./RESOURCES.md) | Bundle/asset/dependency/runtime, hành động giảm initial ~30–35% gzip |
| [`PLAN.md`](./PLAN.md) | Plan 7 phase, agent ownership, gate, impact, risk |

## TL;DR

- Repo: **139 file / 65.772 LOC / 30 route (23 màn + 7 redirect)**; UI v3 đã xong, P0/P1 = 0.
- Nợ lớn nhất: **dead code ~1.500 LOC**, **1.201 nhánh `isVi` chết**, 6 god-file >2.000 LOC,
  data/state phân mảnh, **initial bundle ~466KB gzip** (Three.js 133KB eager).
- Dead code an toàn: 4 service chết + 3 shim + 3 primitive + 6 `dbService` method + 8 type +
  12 mock constant; `test-pricing.ts`/Firebase/metadata/lock trùng.
- Plan ưu tiên: **Phase 1 dead code → Phase 2 một ngôn ngữ → Phase 3 data/state → Phase 4 tách god-file
  → Phase 5 bundle → Phase 6 docs/test → Phase 7 feature/data wiring**.
- Không xoá DB/schema; Supabase đang paused nên live RLS/data phải kiểm sau Resume.
