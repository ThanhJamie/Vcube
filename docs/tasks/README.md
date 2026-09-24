<!-- doc-meta: status=active; verified=2026-09-24; owner=thanh -->
# docs/tasks — Kế hoạch thi công (task area)

Thư mục này chứa các **kế hoạch thi công đang hiệu lực**. Nguồn sự thật cho tài liệu kiến trúc/spec
vẫn là `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`,
`docs/design/`, `docs/SETUP_RUNBOOK.md`.

## Đang hiệu lực

| File | Nội dung | Trạng thái |
|---|---|---|
| [`UI-CHROME-REFACTOR-PLAN.md`](./UI-CHROME-REFACTOR-PLAN.md) | Refactor chrome console (sidebar tối + topbar sáng), token additive, xoá dark theme, gate chống nuốt lỗi. **Kế hoạch cho subagent** (W1–W6, T#). | **EXECUTED (2026-09-22, commit `4a7eea5`)** — doc `status=snapshot`: W1–W5 xong, W7–W11 xong; **W6 backlog** (DataTable Tier-3, `<select>`/`<input>` → `Field`, i18n, tách hook `App.tsx`…) còn lại |
| [`ADMIN-MES-DATA-REMEDIATION.md`](./ADMIN-MES-DATA-REMEDIATION.md) | Runbook khắc phục audit 20 ảnh Admin & MES: map từng mục → màn admin/trường cần nhập; tách rõ việc CODE đã sửa vs DỮ LIỆU cần nhập. | ACTIVE |
| [`DOCS-REVIEW-BACKLOG.md`](./DOCS-REVIEW-BACKLOG.md) | Kết quả review độc lập 6 subagent (2026-09-23): lỗi docs còn tồn, link gãy, tuyên bố chưa kiểm chứng, và backlog phát triển (security/data/core/UI/growth). | ACTIVE |
| [`DOCS-ISSUES.md`](./DOCS-ISSUES.md) | Sổ đăng ký trạng thái **đã xác minh lại** (vòng 2, 2026-09-23): 125 mục còn mở (78 CONFIRMED · 17 PARTIAL + 30 vấn đề MỚI). Nguồn ưu tiên để xử lý. | ACTIVE |
| [`DRIFT-REMEDIATION-PLAN.md`](./DRIFT-REMEDIATION-PLAN.md) | Gộp 125 mục về **6 nguyên nhân gốc** (A RLS · B docs-chép-tay · C schema≠UI · D UI-hứa-quá · E di-sản · F chưa-chốt-VI/EN) + lộ trình 4 đợt. **Đọc trước khi sửa từng mục.** | ACTIVE |
| [`DRIFT-TASKS.md`](./DRIFT-TASKS.md) | **Task board thực thi (v4)**: template + task nhỏ theo wave (W0 hotfix P0 → W1 quick win → W2 RLS serial → W3 generator → W4 code → W5 docs hành vi → W6 backlog); có Executor `SA/H/O`, prod-apply protocol, worktree an toàn secret, `coverage.json` (129 ID), broadcast realtime tránh PII, Phụ lục B xác minh code. | ACTIVE |

## Lịch sử (không còn là nguồn sự thật)

Các tài liệu dưới đây đã bị **thay thế** và đã được gỡ khỏi repo (git history còn lưu):

- `agent_01..agent_05_*.md` — kế hoạch cũ chia 5 subagent (UI/UX, Admin, Supabase, 3D CAD, Orchestrator);
  mô tả mong muốn, không kèm số đo.
- `UI-UX-DEV-PLAN.md` — đã IMPLEMENTED + VERIFIED (2026-09).
- `DESIGN-SYSTEM-DEBT-CLEANUP.md` — đã DONE (debt design-system về 0).
- `UI-REFACTOR-NEXT-STEPS.md` — các việc còn lại đã được gộp vào **W6 backlog** của
  `UI-CHROME-REFACTOR-PLAN.md`; các việc đã xong ghi ở `docs/design/ui-audit-2026-09.md`.

## Nguồn đo & gate

- Đo/backlog: `node scripts/loop-audit.mjs` (`.loop/latest.json`).
- Audit UI/UX: `docs/design/ui-audit-2026-09.md`.
- Gate bắt buộc: xem `AGENTS.md` §"Gate bổ sung" và `docs/design/taste-contract.md` §6.
