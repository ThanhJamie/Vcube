# UI/UX Refactor — Next Steps (resume on another machine)

> **Status**: PAUSED intentionally. All Critical/High **bug** items are done and committed.
> Remaining items below are refactors/design tasks, not bugs.
> **Branch**: `main` · **HEAD at pause**: `3b29fcc` (this file may be committed just after).
> **Paused by user request** — resume from "3. Remaining tasks".

---

## 0. How to resume (read this first)

1. Read `docs/design/taste-contract.md` — it locks which skill applies to which surface and the
   hard repo overrides (keep Be Vietnam Pro + lucide/iconMap, data-honesty, light-first, no new deps).
2. Read `docs/design/ui-audit-2026-09.md` — full audit + what is already done.
3. Run the gates to confirm a clean baseline:
   ```bash
   npm run lint && npm run build
   node scripts/check-fabricated.mjs
   node scripts/check-contrast.mjs
   node scripts/check-contrast-combos.mjs
   node scripts/check-icon-names.mjs
   node scripts/check-unitprice-multiplier.mjs
   node scripts/lint-rls-sources.mjs
   node scripts/lint-rls-migration.mjs
   node scripts/a8-sql-syntax-check.mjs
   ```
4. **Migrations** `supabase/migrations/20260901_baseline_schema.sql` and `20261010_harden_rls.sql`
   were already applied by the user to the live DB (36 `site_content` columns, nullable
   `workshop_materials.current_stock_grams`, scoped `custom_design_requests` policies).
   They are idempotent — re-run only if the DB was reset.

## 0.1 Skills (must reinstall on a new machine — they live in `~/.agents/skills/`)

```bash
DISABLE_TELEMETRY=1 npx skills add https://github.com/Leonxlnx/taste-skill \
  --skill "redesign-existing-projects" \
  --skill "design-taste-frontend" \
  --skill "full-output-enforcement" \
  --skill "imagegen-frontend-web" \
  -g -a opencode --copy -y
npx skills ls -g -a opencode   # verify
```
Source pinned: `github.com/Leonxlnx/taste-skill` @ `ccbc1563`.

---

## 1. Completed (do not redo)

See `docs/design/ui-audit-2026-09.md` §0 for the detailed list. Summary by area:
- **Phase 1**: FAB perf rewrite, `ModelViewer3D` on-demand loop, `/quote` (input value reset,
  `isAnalyzing` try/finally, money guards + `PanelErrorBoundary`, file picker, STL unit modal),
  icon glyphs + `check-icon-names.mjs` gate.
- **C1**: `h-dvh`, sub-12px → `text-xs`, hardcoded hex/token cleanup, reduced-motion (CSS + JS).
- **C2**: storefront data-honesty (removed fabricated material matrix / slicing profile /
  service guarantees / hero telemetry), i18n, keyboard a11y, dropped duplicate CTA.
  - The whole **Material Comparison Matrix section** was removed on request (HomeView + deleted
    `MaterialComparisonMatrix.tsx`).
- **C3**: transaction correctness (empty-cart guard, confetti after DB, `formatCurrency`,
  VAT loading, COD persistence, CartDrawer width/Unsplash/tap targets, guest asset CTA).
- **C4**: admin write-path (accessories/materials/printers persist+delete), formula via audited
  service, nav `machines` tab, admin loads orders, `unit_price_multiplier` label, estimator null
  guards, region enum; **site_content migration**; honest saves + ConfirmDialog + no fabricated
  images + nullable stock; **Designer** fabricated data removed + **RLS scope** for
  `custom_design_requests`; Lab onboarding step 4; Lab stats dedupe; Lab "delivered" action;
  HomeView catalog skeleton.
- **DataTable adoption** (data-list tables): `AdminProductsPanel`, `AccessoriesManager`,
  `WarehouseInventoryPanel` (×2), `Group1WorkshopsPanel` (materials + partners),
  `Group2DesignersPanel` (analytics), `Group3CustomersPanel` (customers + KYC),
  `DesignerModelsManagerTab`, `DesignerPayoutsTab`.
- **Modal → `<dialog>`**: `CadQuickViewModal`, `StlUnitConfirmModal`, `InvoiceModal`,
  `StlVs3mfComparisonModal`, `MachineComparisonModal`, `InternalCostBreakdownModal`,
  `MyOrdersView` (warranty), `AssetLibraryView` (preview), `AdminProductsPanel` (edit + new),
  `AccessoriesManager` (new + edit), `DesignerModelsManagerTab` (edit + preview),
  `Group1WorkshopsPanel` (×4), `PricingConfigPanel` (material + printer), `Group2DesignersPanel`,
  `Group3CustomersPanel` (×2), `Group5ProductionPanel`.
- **Unsaved-changes guards**: `AdminStorefrontPanel`, `AdminSeoPanel` (`beforeunload` + "Chưa lưu"
  indicator).

---

## 2. Remaining tasks

Patterns to reuse:
- **Modal migration**: `src/frontend/ui/Modal.tsx` (API: `open`, `onClose`, `title`, `description`,
  `size`, `placement`, `footer`, `showCloseButton`, `bodyClassName`). Reference migrated file:
  `src/frontend/components/admin/AccessoriesManager.tsx`. `Modal` already provides `<dialog>`,
  focus trap, ESC, backdrop and body scroll-lock.
- **DataTable**: `src/frontend/ui/DataTable.tsx`; reference: `AdminProductsPanel.tsx`.

### 2.1 Modal → `<dialog>` (remaining)
`grep -rn "fixed inset-0" src/frontend` to locate. Remaining real candidates:
- `src/frontend/components/AuthModal.tsx` (**2 overlays**) — multi-mode auth dialog. A previous
  attempt was reverted (it restructured header/footer too aggressively). Do a **shell-only**
  migration: keep the exact body/header content and handlers, replace only the
  overlay+panel+backdrop with `<Modal>`.
- `src/frontend/components/ChatSupportModal.tsx` (**1**) — right-side drawer; consider
  `<Modal placement="right">`.
- `src/frontend/components/CartDrawer.tsx` (**2**) — drawer; consider `<Modal placement="right">`
  (keep cart logic).

**Intentionally NOT migrated** (leave as-is): `ModelViewer3D.tsx`,
`PersonalizeModelViewer3D.tsx` (fullscreen WebGL viewers), `AdminSidebar.tsx` (mobile backdrop),
`HomeView.tsx`/`ExploreView.tsx` (`fixed inset-0` is a full-width background layer, not a modal).

### 2.2 Storefront polish
- **HomeView hero fit viewport** (design decision — get user sign-off before changing):
  the hero stacks badge + h1 + subhead + 2 CTAs + CAD dropzone on the left and a ~360–460px 3D
  chassis on the right. Consider moving the dropzone below the fold, capping the 3D chassis height
  and reducing hero paddings so headline + primary CTA are visible without scrolling.
- **`content-visibility: auto`** for long lists (Explore grid, Home catalog) to cut render cost.
  Add a utility in `src/index.css` and apply to the card wrapper; verify no scrollbar jump at 390px.
- **i18n leftovers**: a few hardcoded Vietnamese strings in `HomeView.tsx` / `ExploreView.tsx`
  (table headers were localized; some labels may remain). Convert with `isVi ? … : …`.

### 2.3 Storage access convention (small)
- `src/frontend/views/AssetLibraryView.tsx` calls `supabase.storage.createSignedUrl` inline;
  `AGENTS.md` wants storage access via a backend service. Move it to a service (e.g.
  `catalogService`/new asset service).

### 2.4 Lab (product decision)
- MES pipeline is 8 stages and ends at "Xuất xưởng giao" (`shipping`). A "Đánh dấu đã giao"
  action now sets `status='completed'`. If you want a 9th "delivered" stage, note the DB CHECK
  `status_stage_index between 0 and 7` (`20260901_baseline_schema.sql`) must be relaxed first.
- `WorkshopSettingsView.tsx` machine/material/accessory deletes should use `ConfirmDialog`
  (currently quick actions; some still lack confirmation).

### 2.5 Data-honesty / backend follow-ups (from audit, not UI)
- `admin.ts` in `src/backend/supabase` is dead code that reads `NEXT_PUBLIC_*`; delete or document.
- `docs/tasks/README.md:5` still points at archived `docs/plans/00–07`.
- `@supabase/ssr` and `@google/genai` are dependencies with zero imports.
- `Tool3DView` / `ObjectTreePanel` still has a hardcoded material list (search `AVAILABLE_MATERIALS`
  in `src/frontend/components/tool3d/ObjectTreePanel.tsx`) — source from the DB `materials`.
- **Fabricated images still present (data-honesty)**: `src/frontend/components/SEOHead.tsx:15`
  default OG image is an Unsplash URL, and
  `src/frontend/components/tool3d/QuoteSummaryPanel.tsx:252` sets an Unsplash stock photo as the
  cart item image. Replace with real assets or an honest empty state.
  (`AdminProductsPanel.tsx:74-75` is a **blacklist** of legacy Unsplash URLs — keep it.)

### 2.6 C5 — browser verification (REQUIRED, cannot be automated here)
No Playwright MCP in the original environment. Verify at **390 / 768 / 1440** px:
- FAB ("Trợ lý tự động"): hides on scroll down, shows on scroll up, no jank, not stuck hidden.
- `/quote`: upload model, re-select the same file, select STEP/IGES, open machine comparison
  (cost column hidden for non-admin), Invoice modal, STL unit modal.
- `/checkout`: empty cart guard; COD order then check invoice/tracking show COD consistently.
- `/admin`: `/admin/machines` opens Fleet tab; products/accessories/KYC create+edit modals are
  `<dialog>` with ESC + focus trap; storefront/SEO panels show "Chưa lưu" and warn on unload.
- `/lab`: onboarding step 4 renders; "Đánh dấu đã giao" sets completed; tables have loading/retry.
- `/designer`: no fabricated numbers (dash/empty when no data).

---

## 3. Conventions & gates (do not regress)

- Keep: **Be Vietnam Pro + JetBrains Mono**, **lucide + iconMap** (gate `check-icon-names.mjs`),
  **light-first theme** (`DARK_ROUTE_PREFIXES = []`), **data-honesty** (`check-fabricated.mjs`),
  token-only styling (`docs/design/tokens.md`).
- No new dependencies without approval. Use `motion` (already installed), not GSAP.
- Definition of done: `npm run lint` + `npm run build` PASS, plus all gates in §0.3.
- Do not commit unless the user asks.

## 4. Commit map (context)

`git log --oneline` since the docs consolidation (`9d839ef`) contains the full history
(~30+ commits) grouped by area: Phase 1, C1, C2a/b, C3, C4a–f, DataTable, modal migrations.
The most recent commits at pause are the modal/DataTable migrations and the removal of the
Material Comparison Matrix section.
