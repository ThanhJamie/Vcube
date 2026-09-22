# docs/tasks — Kế hoạch thi công (task area)

Thư mục này chứa các **kế hoạch thi công đang hiệu lực**. Nguồn sự thật cho tài liệu kiến trúc/spec
vẫn là `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`,
`docs/design/`, `docs/SETUP_RUNBOOK.md`.

## Đang hiệu lực

| File | Nội dung | Trạng thái |
|---|---|---|
| [`UI-CHROME-REFACTOR-PLAN.md`](./UI-CHROME-REFACTOR-PLAN.md) | Refactor chrome console (sidebar tối + topbar sáng), token additive, xoá dark theme, gate chống nuốt lỗi. **Kế hoạch cho subagent** (W1–W6, T#). | READY |

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
