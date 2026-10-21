<!-- doc-meta: status=active; verified=2026-10-20; owner=review-a11y -->
# REVIEW R2 — Accessibility & Responsive (W2+W3 integrated tree)

> **Snapshot:** working tree 2026-10-20 **14:2x** (`HEAD 97cc256` + W1–W5 uncommitted).
> The tree was being edited while this review ran (integrator W5); findings were re-measured
> after HMR. Re-run the probes below before merging.
> **Scope:** integrated W2+W3 surfaces — storefront/detail/transaction/auth + admin/designer/lab/quote.
> **Read-only:** no `src/**` change, no commit. This file is the only write.
>
> **Method:** static code read **plus browser measurement** on the live dev server
> (`http://localhost:3001`, Chromium 1244 headless). Supabase is paused, so catalog/auth data
> was injected **at the network layer only** (fixtures outside the repo; no file/mock in `src/`).
> Evidence scripts: `/tmp/vcube-a11y-review/*.mjs` (temporary, not committed).
>
> **Severity:** `B` blocks the flow/QA · `M` WCAG-AA/contract violation visible on important
> surfaces · `m` local, cheap fix · `N` note/nit (not counted as a defect).
> **Contrast source of truth:** `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` §1 + the two
> contrast scripts; numbers below were recomputed, not copied by eye.

---

## 0. Counts

| B | M | m | N | total |
|---:|---:|---:|---:|---:|
| **1** | **5** | **7** | **3** | **16** |

**What is clean (measured, do not re-report as missing):**

- **Horizontal overflow = 0** on **22 routes × 390/768/1440**: `documentElement.scrollWidth === innerWidth`
  everywhere (`/`, `/explore`, PDP, Personalize, `/quote`, `/cart`, `/checkout`, `/orders`, `/assets`,
  `/tracking`, auth, 4 admin sections, 3 designer tabs, 2 lab tabs, 404). A 100+ character product
  name/SKU fixture also produced 0 page overflow at all three widths (text wraps; no fixed `min-w` escapes).
- **Sticky offsets** are correct: storefront header **80px**, console topbar **56px**, PDP/Personalize
  purchase card `top: 96px` (header 80 + 16), Explore sidebar `top: 80px`, console sidebar
  `top: 56px` (`sticky top-14`). PDP/Personalize mobile bottom bars (73/77px) end at 748–771px, above
  the footer's last content at 724px; the footer is not covered.
- **Modals/sheets**: `<dialog>` + `showModal()` works (top layer, inert background, native Esc,
  focus return, body-scroll ref-count). Filter sheet, quick-view, cart drawer and header drawer were
  opened at 390/1440: Esc closes, focus returns to the trigger, no page horizontal overflow, inner
  scroll region is single (`min-h-0 flex-1 overflow-y-auto`). The header drawer scrolls at
  390×667 (signed-in: `scrollH 681 > clientH 667`, "Đăng Xuất" reachable).
- **Keyboard / focus**: first **32 tab stops** on **19 routes × 390/1440** show a visible indicator
  **except** the 4 admin StatCards (A11Y-02). No focused element was hidden under the sticky header
  (the only `top < header` hit is the skip link, which uses `z-toast` above the header).
- **Labels**: 0 form controls without `<label for>`/`aria-label`/`aria-labelledby`; 0 icon-only
  buttons with no name at all (one title-only case at <640 is A11Y-10); images have `alt`; `aria-expanded` +
  `aria-controls` present on both mobile menu triggers; cart drawer exposes `aria-label="Giỏ hàng"`.
- **Reduced motion**: `matchMedia('(prefers-reduced-motion: reduce)').matches === true` and
  **0 elements** with a running animation on `/`, `/quote`, `/cart`, `/tracking` (global
  `index.css` kill-switch + `motion-reduce:*`).
- **Contrast ledger**: `node scripts/check-contrast.mjs` → **56/70 pass + 14 expected, 0 unexpected
  fail**; `check-contrast-combos.mjs` → **SẠCH**, 20 documented near-miss 4.56:1 (pass). The one
  shipping violation found is A11Y-03.
- **Tap targets after the W5 fix**: header search/hamburger are now **44×44**; `Button iconOnly`
  is 48; PDP colour swatches measure 44×44. Remaining exceptions are listed in A11Y-05 and N-01.
- **Concurrent fix landed during review**: the CC-01 StrictMode trap on `CartDrawer`/`AuthModal`/
  `InvoiceModal` was repaired at ~13:59 while this review was running. Re-measured after HMR:
  cart drawer `showModal=1`, `dialog[open]=1`, Esc returns focus to the cart trigger. It is **not**
  a finding below; the earlier failure (`showModal=2/close=2/open=0`) was the pre-fix state.

---

## 1. Top blockers (B)

### A11Y-01 — B · 390 (≤639px) · `/explore` → quick-view, digital tab

**Primary purchase CTA is collapsed to 16px high.**

- Measured on the real DOM: `getBoundingClientRect()` = **316 × 16.19px** for
  “THÊM TỆP CAD VÀO GIỎ” (computed `height: 16.1875px`, `flex-grow: 1`, `flex-shrink: 0`).
  The adjacent icon button is 48px; the modal footer container is 85px high.
- Cause: the footer is `flex flex-col sm:flex-row` and the primary Button carries
  `className="flex-1"`; at <`sm` the column flex + constrained content column makes `flex-1`
  consume the free space and the 12px line box wins over `h-12`. At 768 the same button is 48px.
- Impact: the only way to add a digital CAD file from quick-view on mobile is a 16px-tall
  target (below WCAG 2.5.8's 24px minimum and the repo's 44px bar); label is visually squashed.
- Evidence: `/tmp/vcube-a11y-review/quickview-digital-bottom-390.png`,
  `qbtn2.mjs` (390) vs `qbtn768.mjs` (768).
- Fix: `className="w-full sm:flex-1"` on the Button, add `shrink-0` to the footer wrapper, and
  preferably move the footer into the Modal `footer` slot (outside the scroll body) or
  `sm:flex-row` only with `flex-none` primary. Verify 390×667 and 390×844.

**No other B found.** No page-level overflow, no dead focusable control, no trap-less modal,
no missing label on a shipped route.

---

## 2. Findings

| ID | severity | viewport | file:line | issue | fix |
|---|---|---|---|---|---|
| **A11Y-01** | **B** | 390 (≤639) | `src/frontend/components/CadQuickViewModal.tsx:543-553` | Quick-view digital CTA collapses to **316×16px** (`flex-1` in a `flex-col` footer inside the constrained modal body); primary add-to-cart target is below 24px and text is illegible. 48px at 768. Screenshot `quickview-digital-bottom-390.png` | `w-full sm:flex-1`; `shrink-0` on the footer; move footer out of scroll body / use Modal `footer`; verify 390×667 and 844 |
| **A11Y-02** | **M** | 390 / 1440 | `src/frontend/ui/Card.tsx:57-58` + `src/frontend/components/admin/groups/Group0OverviewPanel.tsx:309-378` (`StatCard onClick`) | 4 admin KPI cards are keyboard-focusable (`role=button`, `tabIndex=0`, Enter/Space work) but show **no focus indicator**. After Tab: `getComputedStyle().boxShadow === 'none'`, `outline-style: none`; screenshot `admin-card-focus.png`. Their `focus-visible:ring-2` is not painted on this Card variant (`shadow-e0` wins) — the earlier static review's "verified clean" was class-based, not measured | Add a non-shadow fallback to `INTERACTIVE_BASE`: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`, or use `focus-visible:shadow-[0_0_0_2px_var(--color-ring)]`; re-run the Tab probe |
| **A11Y-03** | **M** | 390 / 768 / 1440 | `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx:695,707` | Selected region tile uses `bg-primary-tint` + `text-fg-subtle` = **4.37:1** at 12px (below 4.5). This exact pair is listed as **remove** in the contrast ledger ("subtle on primary tint — dùng text-fg-muted"), so the checker's "expected non-pass" is shipping on `/lab` | `text-fg-muted` (6.63:1) on the selected tile's description; keep `text-fg` for title |
| **A11Y-04** | **M** | all | `src/frontend/components/ThreeModelViewer.tsx:165` (renderer canvas appended) · `personalize/PersonalizeModelViewer3D.tsx` · `tool3d/ModelViewer3D.tsx` | Every 3D canvas has **no role, no aria-label, no tabindex, no keyboard alternative**; measured `role=null, aria-label=null` on `/`, PDP, Personalize. A screen-reader user gets nothing for the flagship 3D product; orbit is pointer-only | Wrap the canvas in `role="img"` + Vietnamese `aria-label` (model + “dùng phím mũi tên để xoay” if keyboard added), or give it `tabindex=0` + arrow/zoom keys; link the PDP gallery as the described fallback |
| **A11Y-05** | **M** | 390 | `src/frontend/components/tool3d/UnifiedCadToolbar.tsx:81,98,112,125,137` · `src/frontend/views/ProductDetailView.tsx:231` | Remaining sub-44 targets on PDP/Personalize/quick-view: 3D toolbar icon buttons **40×40**, PDP tab pills **31px** high, raw PDP `<select>/<input>` **40px** high. Header/search and colour swatches were fixed to 44 during W5; these were not | `max-md:size-11` on toolbar buttons; `max-md:min-h-11` on tab pills; `max-md:min-h-11` on raw PDP form controls (Input/Select already use `max-md:min-h-12`) |
| **A11Y-06** | **M** | 1440 console / 1024 | `src/frontend/components/admin/AdminStorefrontPanel.tsx:35` · `src/frontend/components/admin/PricingConfigPanel.tsx:1184` (+119 more) · `src/frontend/components/Header.tsx:255,371` | **121 occurrences** of `focus:ring-2 focus:ring-ring/20` on raw inputs/selects. `ring-ring/20` = 20% black over surface = **1.53:1** focus ring (below 3:1). The border also turns black, so focus is still discernible, but the indicator is inconsistent with the 16:1 token ring used by Button/Input | Use `focus-visible:ring-ring` (full opacity) + `ring-offset-1`, or `ring-ring/60` minimum; migrate the 73 PricingConfig controls to `Field`/`Input` in a later pass |
| **A11Y-07** | m | all | `src/frontend/ui/Modal.tsx:303-311` (and `ui/Sheet.tsx` inherits) | `<dialog role="dialog">` is opened with `showModal()` but never gets `aria-modal="true"`. Native top-layer gives modality in Chromium, so risk is low, but `qa-checklist` §Accessibility explicitly requires `role=dialog + aria-modal=true + aria-labelledby` | Add `aria-modal="true"` on the `<dialog>` (one line) and re-run the modal AX check |
| **A11Y-08** | m | 390 / 1440 | `src/frontend/components/Header.tsx:271-278` | Cart button accessible name is only “Giỏ Hàng Kỹ Thuật”; the quantity badge is a visual `<span>` and is **not exposed to AT**. QA checklist requires the count in the name (“Giỏ hàng, 4 sản phẩm”) | `aria-label={cartItemsCount > 0 ? \`Giỏ hàng, ${cartItemsCount} sản phẩm\` : 'Giỏ hàng'}`; keep the visual badge `aria-hidden` |
| **A11Y-09** | m | 390 | `src/frontend/views/CartView.tsx:103-106` | Empty cart branch renders `EmptyState` only — no `<h1>` on `/cart` when the cart is empty (non-empty branch has one at line 153). `/checkout` and admin got their `sr-only` h1 in W5; empty cart is the remaining page without a heading level 1 | Render the page `<h1>` (sr-only or visible) before the EmptyState; keep EmptyState title as `h2` |
| **A11Y-10** | m | 390 (≤639) | `src/frontend/components/CadQuickViewModal.tsx:569-581` | “Tuỳ biến” icon button has its visible label `hidden sm:inline`; at <640px the only name is `title="Khắc tên / Tùy biến tham số"`. Chrome derives a name from `title`, but title-only names are unreliable on touch/AT and the button is 48px icon-only next to the purchase CTA | Add `aria-label="Tuỳ biến 3D & khắc laser"`; keep `title` for the tooltip |
| **A11Y-11** | m | 390 | `src/frontend/components/CadQuickViewModal.tsx:323-332` | Metrology strip is `grid-cols-4` at every width; at 390 each cell is ~77px and “Kích thước” shows **“120 × 8…”** (`truncate`), i.e. the product dimension is unreadable. Long Vietnamese values make it worse | `grid-cols-2 sm:grid-cols-4`; remove `truncate`/allow wrap, or add `title`/`aria-label` with the full value |
| **A11Y-12** | m | 390 | `src/frontend/components/tool3d/MachineComparisonModal.tsx:82-83` | Machine comparison keeps a 6-column `<table class="w-full">` with no card fallback <`md` (unlike `InternalCostBreakdownModal` and `StlVs3mfComparisonModal`, which now switch to cards). At 390 the 6 columns squeeze/scroll inside the modal; handoff tool3d §7.4 documents this as a known exception, but it is the only modal left with two-dimensional scrolling | Reuse the card list pattern below `md`, or set `min-w-[640px]` inside `overflow-x-auto` with a visible scroll affordance and sticky first column |
| **A11Y-13** | m | 390 | `src/frontend/components/Header.tsx:230,310` + `:316-333` | Two adjacent icon buttons (“Mở menu & tìm kiếm” ×2, search icon and hamburger) open the **same** drawer; the drawer panel is conditionally mounted so both `aria-controls="vcube-mobile-nav"` IDREFs dangle when closed. UI-027 is still open (deferred to integrator) | Keep one trigger below `lg` (or make the search button focus the drawer search field and name it “Tìm kiếm”); keep the panel mounted with `hidden` or drop `aria-controls` |
| **A11Y-14** | N | 390 | `src/frontend/ui/InfoTip.tsx` (`size-6` = 24px) · Home tag chips `min-h-6` (24px) · footer text buttons 16px high | These are below the repo's 44px mobile bar but meet WCAG 2.5.8 (24px) or are inline text links (exception). No action required unless the 44px rule is made absolute | Document the exception in the QA matrix; if the bar is absolute, raise InfoTip/chips to 44 in a follow-up |
| **A11Y-15** | N | 1440 console | ~50 raw `<button>` in `components/admin/**` (tab strips/filters; e.g. `AdminStorefrontPanel.tsx:171`, `PricingConfigPanel.tsx:1015`) | Focus is visible but uses the browser's 1px `auto` outline instead of the 2px `--color-ring` token used by `Button`; two focus looks in one console (and UA outline can be low-contrast on `surface-muted`) | Add the shared `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` pair, or migrate tab strips to `Button` |
| **A11Y-16** | N | all | `src/frontend/components/Header.tsx:255,371` | Search inputs are `type="text"` (no `type="search"`, `enterKeyHint`, or `role="search"` on the form), so mobile keyboards say “Go” and the search landmark is unnamed | `type="search"` + `enterKeyHint="search"` + `role="search"` on the wrapping `<form>` |

---

## 3. Evidence — commands actually run

All harnesses live **outside the repo** (`/tmp/vcube-a11y-review`, `/tmp/vcube-probe`,
`/tmp/vcube-fixtures.cjs`); no fixture, mock or screenshot was added to `src/`.

```bash
# dev server already running on :3001 (vite). Chromium 1244 + unpacked libs:
export LD_LIBRARY_PATH=/tmp/debx/root/usr/lib/x86_64-linux-gnu

# 1) overflow / labels / contrast / tap targets — 22 routes × 390,768,1440
node /tmp/vcube-a11y-review/audit1.mjs          # results: audit1.json
# 2) tab order + focus indicator — 19 routes × 390/1440, first 32 stops
node /tmp/vcube-a11y-review/tabscan.mjs         # results: tabscan.json
# 3) modal/sheet: open, Esc, focus return, body lock, internal scroll
node /tmp/vcube-a11y-review/modals.mjs
node /tmp/vcube-a11y-review/trap2.mjs
node /tmp/vcube-a11y-review/cart2.mjs
node /tmp/vcube-a11y-review/drawer-ring.mjs
# 4) sticky offsets / bottom bar vs footer / headings
node /tmp/vcube-a11y-review/sticky-headings.mjs
node /tmp/vcube-a11y-review/console.mjs
node /tmp/vcube-a11y-review/pdp-bottom.mjs
# 5) quick-view CTA collapse (390 vs 768)
node /tmp/vcube-a11y-review/qbtn2.mjs
node /tmp/vcube-a11y-review/qbtn768.mjs
# 6) 4 KPI cards focus (screenshot of the focused element)
node /tmp/vcube-a11y-review/admin-focus-shot.mjs
# 7) long Vietnamese strings / canvas a11y / reduced motion / form labels
node /tmp/vcube-a11y-review/longstr.mjs
node /tmp/vcube-a11y-review/canvas.mjs
node /tmp/vcube-a11y-review/reduce.mjs
node /tmp/vcube-a11y-review/recheck.mjs

# contrast ledger (repo gates)
node scripts/check-contrast.mjs                 # 56/70 + 14 expected, 0 unexpected
node scripts/check-contrast-combos.mjs          # SẠCH; 20 near-miss 4.56:1
node scripts/check-ui-rules.mjs                 # PASS
```

Representative numbers:

| Probe | Result |
|---|---|
| `audit1.mjs` overflow | `scrollWidth === innerWidth` on all 22×3 combinations; no page-level offender |
| `tabscan.mjs` focus | 19×2 routes, 32 stops each: 0 missing indicators except 4 `StatCard` DIVs (`/admin/overview`) |
| `admin-focus-shot.mjs` | focused KPI card: `boxShadow: none`, `outline-style: none`, `--tw-ring-shadow: 0 0 0 2px #1C1917` (not painted) |
| `qbtn2.mjs` | quick-view primary CTA `316 × 16.19px` at 390; `qbtn768.mjs` = `48px` at 768 |
| `sticky-headings.mjs` | PDP sticky `top=96` (header 80); Explore sidebar `top=80`; console sidebar `top=56` (topbar 56) |
| `pdp-bottom.mjs` | PDP bar `top=771 h=73`, last footer content `bottom=724`; Personalize bar `top=767 h=77`, last content `bottom=724` |
| `drawer-ring.mjs` | 390×667 signed-in drawer `scrollH 681 / clientH 667`, “Đăng Xuất” reachable; Esc closes and returns focus |
| `reduce.mjs` | `reduce=true`, animated elements = **0** on `/`, `/quote`, `/cart`, `/tracking` |
| `check-contrast.mjs` | `fg-subtle` on `primary-tint` **4.37** (expected non-pass, “remove”) — used in A11Y-03 |
| Ring math | `ring-ring/20` over `#FFFDF9` = **1.53:1**; full `ring-ring` = **16.21:1**; `fg-muted` on `primary-tint` = **6.63:1** |

---

## 4. Residual risk / not covered

1. **Supabase paused.** Catalog, materials, pricing, printers, orders, invoices and user profiles
   are network fixtures or `[]`; no real row counts, images, long DB strings, RLS result or
   realtime data. Admin/designer/lab were reached with an injected session + intercepted
   `user_profiles.role='admin'` — **RLS was not exercised**. Re-shoot 390/768/1440 after Resume.
2. **Dev-only vs production.** StrictMode is development-only; the CC-01 class of bugs (conditional
   mount of `<Modal>`) was fixed mid-review for CartDrawer/AuthModal/InvoiceModal and re-verified
   only for CartDrawer. Re-run the modal probe against the final tree, and once against `npm run build`.
3. **Concurrent edits.** `Header.tsx` (14:18), `Card.tsx` (14:00), `CartDrawer.tsx` (13:59),
   `CadQuickViewModal.tsx` (14:03) and docs changed while this review ran; the snapshot is
   **14:2x**. Two earlier findings from the static pass were already fixed by W5 and are not
   repeated: header tap width (`min-w-11` now), PageSkeleton live region, admin/checkout `h1`,
   header trigger names.
4. **Browser coverage.** Chromium 1244 headless only; no Firefox/Safari, no iOS safe-area/keyboard,
   no VoiceOver/NVDA. `backdrop-blur` headers, `mask-image` (`nav-fade-right`) and `dvh` with the
   soft keyboard are unverified on real devices.
5. **Modals not opened** (no data/printers): `InvoiceModal`, `AuthModal`, `InternalCostBreakdownModal`,
   `MachineComparisonModal`, `StlVs3mfComparisonModal`, `StlUnitConfirmModal`, admin edit modals.
   They share the `Modal` primitive (checked) and `MachineComparisonModal` is flagged A11Y-12 by
   code + handoff; the rest are code-reviewed only.
6. **Real tables** (admin 7–8 columns, orders/invoices with rows) were not exercised; only empty
   tables. Internal `overflow-x-auto` is present, but column clipping at 390 remains a QA item.
7. **Contrast beyond the ledger.** Token pairs and computed text/backgrounds were measured; text
   over product photos, glass/HUD chips (`bg-surface/90` over dark canvas), focus rings over images
   and `color-mix`/`oklab` values were excluded from the automated pass. The one 4.37 finding was
   confirmed against an opaque `primary-tint` ancestor.
8. **Long strings.** A 110-char product name/SKU + long designer/licence was tested (no page
   overflow, H1 wraps 2–3 lines). Real admin/customer names and SKUs may differ.
9. **Focus trap nuance.** Native `<dialog>` in Chromium puts focus on `<body>` for one Tab step when
   wrapping past the last focusable (reproduced on a minimal `<dialog>`); this is platform
   behaviour, not an app-specific trap hole. The header drawer's custom trap cycles without this.
10. **No live `npm run check`** (Supabase paused). Offline gates: `check-contrast`,
    `check-contrast-combos`, `check-ui-rules` run clean as above; `lint`/`build` were last green
    per the W2/W3 handoffs and were not re-run in this read-only review.
