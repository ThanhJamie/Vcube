# Archive — Historical Documentation

> **Status:** HISTORICAL / SUPERSEDED (archived September 2026)
> **Canonical source of truth:** [`docs/README.md`](../README.md) → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`.

This archive records the previous documentation generations so decisions and
rationale remain traceable. **Do not treat any figure or instruction in these
files as current.** In particular, the tables/buckets/policies counts, bundle
sizes, and execution-phase statuses predate the current code.

Kept in place (not physically moved) because ~36 source files still reference
these paths in comments and the files cross-link each other. Each file carries a
SUPERSEDED banner at the top.

## Where the current docs live

| Topic | Current document |
|---|---|
| Portal / index | `docs/README.md` |
| Runtime & routes | `docs/architecture/system-overview.md` |
| 3D CAD pipeline | `docs/architecture/3d-cad-pipeline.md` |
| Pricing engine | `docs/architecture/pricing-engine.md` |
| Page specs | `docs/pages/storefront.md`, `customer-checkout.md`, `admin-portal.md`, `designer-workshop-portals.md` |
| Database | `docs/database/schema.md`, `seeds-and-migrations.md` |
| Security / RLS | `docs/security/rls-policies.md`, `rls-runbook.md` |
| Developer setup | `docs/SETUP_RUNBOOK.md` |
| Design tokens & honesty rules | `docs/design/tokens.md`, `icon-map.md`, `qa-checklist.md`, `data-honesty.md`, `research-brief.md` |

## `docs/plans/` (prior refactor plan, 39 files)

Planning and audit documents produced during the earlier UI/UX refactor effort.
Useful for historical rationale only.

- `00-overview.md` … `07-execution-phases.md` — original refactor plan and phases
- `09`–`28` — per-area specs, audits, UI/UX upgrade plan, formula builder spec
- `29`–`32` — funnel / money-flow / admin / design-system audits
- `33-wave-log.md`, `wave-plan.md`, `agent-brief.md`, `baseline.md` — wave execution logs and measured baseline
- `a19-radius-report.md`, `stage-b-a2e-report.md`, `token-codemod-report.md` — one-off migration reports

> The agreed direction (user decision, 2026-09): the new English "VCUBE 3.0"
> document set is canonical; the `docs/plans/` set is archived and carries
> SUPERSEDED banners.
