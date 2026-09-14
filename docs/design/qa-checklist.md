# VCUBE — Manual QA Checklist (post-refactor phase gate)

**Purpose.** The repo has **zero automated tests** (`npm run lint` is `tsc --noEmit`, there is no test runner). This file is the manual gate that must be walked after **every** UI/UX + feature refactor phase. A human or a browser-automation agent executes it and attaches results using the template in [`## Reporting`](#reporting).

**Route source of truth:** `src/App.tsx` (route table at L813–1124, navigation adapter at L507–641). If a route is added, removed or renamed there, this file must be updated in the same change.

**How to use it**

1. Work `## Setup` → `## Global shell` → `## Per-page checks` → `## Critical flow walkthroughs` → `## Accessibility spot checks` → `## Performance spot checks`.
2. Every checkbox row has a **How to verify** (a concrete action a person can perform) and an **Expected** (what must be observable). When **Expected** contains `(baseline: …)`, that is the *current* pre-refactor behaviour — a known deviation to confirm as fixed, not a target to preserve.
3. Per-page tables end with a row `U1–U11` that points at the master universal matrix. All eleven universal dimensions must be exercised on **every** route.
4. Record every console error/warning verbatim. A refactor phase does not pass with an un-triaged console error on any route.

---

## Setup

### 1. Run the app

The repo lives in WSL2 `Ubuntu-24.04`. Never build with the Windows toolchain.

```bash
# inside WSL, from /home/thanh/projects/Vcube
cp .env.example .env        # first time only
npm install                 # first time only
npm run dev                 # vite --port=3000 --host=0.0.0.0
```

Open **http://localhost:3000**.

| Check | How to verify | Expected |
| --- | --- | --- |
| Dev server reachable | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` from WSL | `200` |
| Supabase env present | Confirm `.env` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (values are inlined by `vite.config.ts`, which also has hardcoded fallbacks) | App boots, catalog loads or falls back to mock data without a fatal error |
| Migration applied | Supabase SQL editor: `products` table + `product-images` / `cad-files` buckets exist (`supabase/migrations/20260904_create_products_and_storage.sql`) | `/explore` shows DB rows; realtime channel subscribes without errors |
| Baseline storage reset | DevTools → Application → Local Storage → clear all `vcube_*` keys, then hard reload | Clean first-run state (default catalog, VI language, empty cart) |
| Detached server (optional) | `setsid nohup npm run dev >/tmp/vcube-dev.log 2>&1 </dev/null &` | Server survives the launching command returning |

### 2. Device widths to emulate

Emulate each width in DevTools device mode (do **not** just resize the window) and run the per-page checks at all five. **390 is the blocking width** — every page must be free of horizontal page scroll there.

| Width | Emulates | What to focus on |
| --- | --- | --- |
| **390 × 844** | iPhone 14/15 | Horizontal overflow, tap targets, hidden-vs-visible controls, mobile nav drawer, sticky bottom bars |
| **768 × 1024** | iPad Air portrait | The `md:` breakpoint: desktop nav appears at 768, hamburger must disappear |
| **1024 × 768** | Small laptop | 3-column admin tables, quote workspace split view |
| **1440 × 900** | Standard desktop | `max-w-[1440px]` container, footer 4-column grid |
| **1920 × 1080** | Large desktop | No stretched/empty gutters; 3D canvas does not upscale blurrily |

Responsive breakpoints actually used in code: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Fixed container: `max-w-[1440px]` (`src/App.tsx`).

### 3. Both languages (VI / EN)

- The switcher is in the header, in zone 3 (`src/frontend/components/Header.tsx` L129–160): `🇻🇳 VIE` / `🇺🇸 ENG`, wrapped in `role="group" aria-label="Language selector"`. It also exists inside the mobile drawer (L258–288).
- Preference persists in `localStorage['vcube_language']`; default is `vi` (`src/frontend/context/LanguageContext.tsx` L381–389).
- There are **two** string systems: the `DICTIONARY` in `LanguageContext.tsx` (via `t('key', fallbackVi, fallbackEn)`) and inline `isVi ? '…' : '…'` ternaries. Hardcoded-only Vietnamese strings are the single largest i18n defect class in this repo.
- **Rule for QA:** for every route, flip VI→EN and confirm *zero* Vietnamese text remains visible, and that no English string appears while in VI. Language must survive a reload and a route change.

| Check | How to verify | Expected |
| --- | --- | --- |
| Toggle flips immediately | On `/`, click `ENG` | All header/nav/footer strings flip with no reload |
| Persistence | Reload the page | EN is still active |
| Deep-route persistence | Switch to EN, then navigate `/products/<id>` → `/quote` → `/cart` | EN everywhere |
| No mixed copy | On each page, scan for Vietnamese while in EN | Zero VI strings (baseline: `/quote`, `/personalize`, `/tracking`, `/orders`, `/assets`, `/order-success`, the invoice and checkout forms, the Chat FAB modal, `OrderProgress` and `PageSkeleton` are Vietnamese-only) |
| Currency not localized | In EN mode read any price | Expected: `1,250,000 ₫` or `1,250,000 VND`. Baseline: `toLocaleString('vi-VN') + ' đ'` in nearly every view, `₫` in `InvoiceModal` — inconsistent |
| Decimals in EN | Home simulator "print duration" value | Expected EN-friendly `2.4 h`. Baseline: `(grams/35 + 0.8).toFixed(1)` → `2.4`, never localized |
| Dates | Any `dd/mm/yyyy` (quote validity, review date) | Expected locale-correct date in EN. Baseline: hardcoded / `'vi-VN'` |

### 4. Both themes (once the dark theme for `/quote`, `/admin`, `/lab` lands)

**Baseline today: there is no dark theme at all.** `src/index.css` contains no `.dark` selector, no `prefers-color-scheme` block and no `color-scheme` declaration; views hardcode surface colours (`bg-[#F8FAFC]`, `bg-white`, `text-[#091426]`, `border-[#CBD5E1]`). Treat every row below as a post-dark-theme gate.

| Check | How to verify | Expected |
| --- | --- | --- |
| Toggle exists and is reachable | Header → theme control; also check keyboard reachability | Light/dark/system control present, reachable by Tab, with an accessible name |
| Persistence | Set dark, reload, navigate across routes | Stays dark; no flash of light theme on first paint |
| System preference | Set OS to dark, no stored override | App follows OS (`prefers-color-scheme`) |
| No Flash Of Wrong Theme | Throttle to Slow 3G, hard reload in dark | Background never flashes white before hydration |
| `/quote` dark | `/quote` in dark: slicer card, workspace tabs, validation panel, quote summary, all 4 modals | No white surface, no unreadable text, table borders visible |
| `/admin` dark | `/admin/overview` → each of the 22 valid sections | Chart/table contrast holds; badges and status pills remain distinguishable |
| `/lab` dark | Once routed | Same bar as `/admin` |
| Canvas surrounds | 3D viewport frame in dark | Canvas backdrop, HUD text and overlays stay legible; no hardcoded `bg-[#091426]` clash |
| Contrast after theming | Re-run the contrast spot checks in `## Accessibility spot checks` in both themes | WCAG AA: ≥4.5:1 body, ≥3:1 large text and UI borders |

---

## Global shell

Sources: `src/App.tsx` (header wiring, FAB, toasts, footer), `src/frontend/components/Header.tsx`, `src/frontend/components/CartDrawer.tsx`, `src/frontend/components/NotFoundView.tsx`, `src/frontend/components/ScrollToTop.tsx`, `src/frontend/components/ChatSupportModal.tsx`, `src/frontend/components/auth/UserAvatarMenu.tsx`, `src/frontend/stores/useUIStore.ts`.

| Check | How to verify | Expected |
| --- | --- | --- |
| Desktop nav renders | 1440px on `/` | Nav shows `Marketplace`/`Khám Phá`, `3D Quoting`/`Báo Giá In 3D`; when signed in adds `Orders`; designer/admin add `Designer Studio` `CREATOR` badge; admin adds `Admin Console` `FORGE` badge (`Header.tsx` L36–54) |
| Active-route highlight | Click each nav item | Exactly one item shows the `#00687A` underline/colour; uses `currentScreen` from `getCurrentScreenFromPath()` (`App.tsx` L486–504) — verify `/tool-3d` highlights `3D Quoting`, `/my-orders` highlights `Orders`, `/library` highlights assets |
| Hamburger only below `md` | At 390 and 768 | Visible at 390; **not** rendered at ≥768 (the `md:hidden` toggle). No duplicate nav at 768 |
| Hamburger accessible name | Inspect the toggle button (`Header.tsx` L225–231) | Has an accessible name. Baseline: `aria-label="Mở menu điều hướng"` is **hardcoded Vietnamese in both languages** |
| **Hamburger `aria-expanded`** | Inspect the toggle while the drawer is closed and open | Expected: `aria-expanded="false"` → `"true"`, plus `aria-controls` pointing at the drawer's id. **Baseline: neither attribute exists anywhere in the codebase** (grep for `aria-expanded`/`aria-controls` in `src/frontend` returns zero hits) — blocking a11y gap |
| Mobile drawer opens/closes | 390px: open via hamburger, close via the ✕, via the backdrop, then via a nav item | Drawer closes in all four ways; body scroll is locked while open; the page behind is not scrollable |
| Mobile drawer contents | 390px, signed out then signed in | Signed out: language block + nav + Sign In/Sign Up. Signed in: user card, role badge, 4-button demo role switcher, Account, Sign Out (`Header.tsx` L310–416) |
| Drawer Escape | Open the drawer, press `Esc` | Expected: `Esc` closes it. Baseline: backdrop click and ✕ work, but there is **no** Escape handler |
| Announcement bar | Force it on: `/admin/storefront` → toggle announcement, or set `vcube_site_content` with `announcementActive: true, announcementText: "…"` | Dark bar above the header on every route; CTA `Báo giá ngay →` / `Get Quote →` routes to `/quote` when signed in, `/auth/login` when signed out |
| Announcement bar responsive | 390px with a long announcement text | Text truncates (`truncate`) instead of wrapping/pushing the header; the CTA is intentionally hidden below `sm` — confirm the bar still communicates enough to act |
| Language switcher | See `## Setup` §3 | Flips, persists, never causes a layout shift or route change |
| Header search (desktop) | At ≥1024 type `gear` and press Enter | Navigates to `/explore?search=gear`; results filtered. Empty input + Enter does nothing (no navigation, no toast) |
| Header search width | At 1024 and 1440 | Input is `w-44` at 1024 and `w-60` at ≥1280; it must not squeeze the nav or overflow the header |
| Header search (mobile) | At 390 | Search field is hidden (`hidden lg:block`) — confirm the mobile route to search is discoverable (drawer or the `/explore` search box) |
| Cart badge count | Add a qty-3 physical item plus a digital item | Badge shows `4` (sum of quantities, `Header.tsx` L33); badge is absent at 0 |
| Cart badge a11y | Inspect the cart button at 0 and at >0 | Button has an accessible name (baseline: `aria-label` = `VCUBE Cart`/`Giỏ hàng VCUBE`); the count must be exposed to AT (expected: the name includes the count, e.g. "Cart, 4 items"; baseline: the badge `<span>` is silent) |
| Cart drawer opens | Click the header cart icon | Drawer slides in from the right, body scroll locked, backdrop dimmed |
| Cart drawer closes | `Esc`; backdrop click; ✕ button | All three close it (`CartDrawer.tsx` L26–46, backdrop `onClick`). ✕ has `aria-label="Đóng giỏ hàng"` (baseline: hardcoded VI) |
| Cart drawer dialog semantics | Inspect the drawer container | Expected: `role="dialog"` + `aria-modal="true"` + an accessible title, focus moved into the drawer and trapped, focus returned to the trigger on close. Baseline: **none of these** exist |
| Cart drawer contents | With physical + digital + engraved items | Line items show name, material chip, colour chip + hex dot, `Khắc: "text"` chip, per-type badge (`IN 3D` / `CAD`); quantity stepper only for `physical`; digital shows `Bản quyền kỹ thuật số` |
| Free-ship progress | Add physical items below and above 300,000 ₫ | Below: `Thêm {n} đ để FreeShip` + percentage bar; at/above: `Đã đạt Miễn Phí Vận Chuyển!` at 100% |
| Drawer totals | Compare drawer totals with `/cart` | Subtotal, shipping (`30.000 đ` or `MIỄN PHÍ`) and total agree. Baseline risk: `CartDrawer` hardcodes the 300,000/30,000 thresholds while `CheckoutView` reads `siteContent.freeShippingThreshold`/`standardShippingFee` — after an admin changes those, the three surfaces can disagree |
| Drawer CTAs | Click `Proceed to Checkout` then `View Full Cart Details` | First → `/checkout`; second → `/cart`; both close the drawer first |
| Avatar menu (signed in) | Click the avatar | Popover opens with role-conditional items (customer / designer / lab / admin sets, `UserAvatarMenu.tsx`) |
| Avatar menu a11y | Inspect the trigger and popover | Expected: `aria-haspopup`, `aria-expanded`, `role="menu"`/`menuitem`, outside-click close, Escape close, focus return. Baseline: the trigger has an `aria-label` only; the popover is a plain `<div>`; it closes on `mouseleave` after 220 ms and on item click — **no outside-click, no Escape** |
| Avatar menu → routes | Click each item | `/orders`, `/quote`, `/personalize`, `/designer`, `/admin/overview`, `/admin/users`, `/admin/pricing-setup`, `/admin/queue`, `/admin/machines` resolve and highlight the correct nav item |
| Demo role switcher | Header avatar or mobile drawer → switch to `Admin` | Role badge and admin-only nav appear; a toast confirms the switch (baseline: the confirmation string is Vietnamese-only) |
| Support FAB | Any route, bottom-right | `VCUBE Engineer 24/7` pill visible; has an accessible name (`liveSupportAria`); label text is hidden below `sm` but the button stays square and tappable |
| Support FAB → chat | Click it | Chat panel opens. Verify it can be closed by `Esc` and by clicking the backdrop, and that it exposes `role="dialog"`/`aria-modal`. Baseline: the close ✕ has `aria-label="Đóng trò chuyện"` but there is **no** Escape handler and **no** backdrop click-to-close |
| Chat is honest | Send a message in the chat | Reply arrives after ~1 s. Confirm the UI does not imply a real human/backend is answering (it is a hardcoded `setTimeout` string, `ChatSupportModal.tsx` L31–40) |
| Chat i18n | Switch to EN and open the chat | Expected: EN copy. Baseline: 100% Vietnamese (header, quick-reply chips, input placeholder `Nhập câu hỏi kỹ thuật...`, `Gửi`) |
| Footer links | Scroll to the footer on `/` | All four `Dịch Vụ & Mua Hàng` / `Customer Store` links resolve: `/explore`, `/quote`, `/cart`, `/orders` |
| Footer admin column | Signed in as admin vs customer | The admin-only `Administration` column appears only for `role === 'admin'` (`App.tsx` L1272) |
| Footer dynamic content | Change contact info in `/admin/storefront` | `hanoiWorkshopAddress`, `hcmWorkshopAddress`, `hotline`, `contactEmail` update in the footer |
| Footer responsive | 390 → 768 → 1440 | 1 → 2 → 4 columns; no overflow from the long address strings |
| Toast appears | Remove a cart line | Toast slides in bottom-left within ~200 ms |
| Toast severity colours | Trigger each severity: error (admin save failure / Supabase error), warning (`Đã lưu cục bộ nhưng lỗi đồng bộ Supabase.`), success (admin product save), info (cart item removed) | Four visually distinct variants per `App.tsx` L1146–1154: error `#1C0A0A`/red border + `error` icon; warning `#1C1608`/amber + `warning`; success `#091426`/emerald + `check_circle`; info `#091426`/cyan + `info`. Colour must not be the only differentiator (icon + text differ) |
| Toast undo | Remove a physical cart line, click the undo action | Item is restored to the cart with its original quantity/specs (`App.tsx` L656–664). Verify undo is offered **only** where an undo exists |
| Toast undo label i18n | Same, in EN mode | Expected: `Undo`. Baseline: **hardcoded `Hoàn tác`** in `App.tsx` L1174 and as the store default (`useUIStore.ts` L47) — a real VI leak in EN mode |
| Toast close button | Inspect the ✕ on any toast | Has an accessible name. Baseline: `aria-label="Đóng thông báo"` hardcoded VI |
| **Toast screen-reader announcement** | With a screen reader (VoiceOver/NVDA) active, trigger a toast | Expected: announced politely as a status message (`role="status"` / `aria-live="polite"`; `assertive` for errors), and not repeated on every re-render. **Baseline: the toast container has no `role` and no `aria-live`** (zero `aria-live` in the whole frontend) — blocking |
| Toast lifecycle | Trigger 3 toasts quickly, then 6 | All appear stacked; only 5 are retained (queue is `slice(-4)` + new); each auto-dismisses after exactly 4000 ms; manual close works |
| Toast does not block | Toast visible over the support FAB / footer | Toasts are click-through except for their own controls (`pointer-events-none` wrapper) |
| **Scroll on route change** | Scroll to the footer, then click a nav link | Expected: the new route opens at scroll top (`ScrollToTop.tsx` watches `pathname` + `search`), and the jump is *instant* when the user prefers reduced motion. Baseline: `behavior: 'smooth'` is hardcoded in `ScrollToTop.tsx` L11 **and** again in `handleNavigate` (`App.tsx` L508) — a double smooth-scroll that ignores `prefers-reduced-motion` |
| Scroll on query-only change | On `/explore` with a filter, change `?category=` | Scroll resets to top (because `search` is in the dependency array) — confirm this is still desired and does not fight in-page scrolling |
| Deep-link cold load | Paste `/products/<id>`, `/quote`, `/admin/overview` into a new tab | Each route renders on first paint with header, footer and correct nav highlight |
| **404** | Visit `/this-route-does-not-exist`, `/quote/xyz`, `/admin/overview/extra` | Expected: `NotFoundView` — `ERROR 404 • ROUTE NOT FOUND`, `Page Not Found`, `Return Home` → `/`, `Marketplace` → `/explore` (`src/frontend/components/NotFoundView.tsx`) |
| 404 for nested paths | `/orders/abc`, `/assets/x`, `/designer/a/b` | Fall through to `*` → 404 (they match no route pattern) |
| 404 for unknown section | `/admin/not-a-section` | Expected: 404 or a normalised URL. Baseline: `/admin/:section` matches, `AdminDashboardView` silently falls back to `overview` while the URL still reads `/admin/not-a-section` (`AdminDashboardView.tsx` L123–125) — URL and content disagree |
| 404 styling parity | 404 at 390 and 1920 | Card centred, no overflow, buttons stack at 390 (`flex-col sm:flex-row`) |
| Legacy redirects | Visit `/tool-3d`, `/my-orders`, `/library`, `/login`, `/register`, `/creator`, `/creator/anything` | All redirect `replace` to `/quote`, `/orders`, `/assets`, `/auth/login`, `/auth/register`, `/designer` (`App.tsx` L898, 985, 1000, 1047–1048, 1118, 1120). Confirm Back does not bounce into the redirect |
| Suspense fallback | Throttle to Slow 3G and open `/quote` (lazy), `/admin`, `/designer` | `PageSkeleton` shows `VCUBE-SYSTEM-INITIALIZING` with a pulsing viewport placeholder; it must not cause a layout shift when the real view replaces it. Baseline: skeleton copy is Vietnamese-only (`PageSkeleton.tsx` L9–10) |
| Scroll-to-top affordance | Long page (`/explore`), scroll down | Confirm whether a back-to-top control is expected; the FAB stack (support bottom-right, toasts bottom-left) must not overlap it at any of the five widths |

---

## Per-page checks

### Universal dimensions (master matrix)

Run **U1–U11** on every route below. Each per-page table ends with a row that references this matrix; record the page-specific result there.

| ID | Check | How to verify | Expected |
| --- | --- | --- | --- |
| **U1** | First paint / loading state | Throttle Slow 3G, reload the route cold | Header + skeleton render immediately; no blank white screen, no unstyled flash. Lazy routes (`/quote`, `/admin`, `/designer`) show `PageSkeleton` |
| **U2** | Empty state | Remove the data that page needs — clear `vcube_products`, empty the cart, sign in as a user with no orders/assets, filter to zero results | A real empty state with an explanation and a next action. Baseline gaps: `AssetLibraryView` renders **nothing** when filtered results are empty; `CheckoutView` has **no** empty-cart guard (renders a full form and an enabled submit for a 0 ₫ order) |
| **U3** | Error state | Block the network (DevTools Offline) or break the Supabase URL, then reload | A human-readable error/retry surface. Baseline: almost every view has **no** error state (`dbService` failures are `console.warn` only); only `Tool3DView`'s canvas has `CanvasErrorBoundary` |
| **U4** | Keyboard-only path | Unplug the mouse. `Tab`/`Shift+Tab`/`Enter`/`Space`/arrows only | Every control is reachable and operable in visual order; no focus-trap orphan; nothing reachable only by hover. Baseline blockers: hover-only card overlays (`opacity-0 group-hover`) on `/` and `/explore`; password-visibility toggles use `tabIndex={-1}` on `/auth/login` and `/auth/register`; the Home hero dropzone is a non-focusable `<div>` |
| **U5** | Screen-reader name of icon buttons | Use the accessibility tree (DevTools → Accessibility, or a screen reader) on every icon-only button | Each has a meaningful accessible name. Baseline: icon-only buttons overwhelmingly rely on `title` (not a reliable name) or have nothing — e.g. cart qty `-`/`+`, table `3d_rotation`, `tune`, bookmark, colour swatches, `InternalCostBreakdownModal` ✕, `MyOrdersView` warranty-modal ✕, Explore filter-chip ✕, login/register password toggles |
| **U6** | Tap target ≥48 px at 390 | DevTools device mode 390px; measure each interactive element (Computed → box) | Every tappable control ≥48×48 px (or has ≥48 px of un-tappable spacing). Note: the repo's own token is `--touch-target-min: 44px` with `.touch-target-btn` applied only below 768 px (`index.css` L16, L194–202) — so 44 px is the *current* bar and **48 px is the refactor bar**. Flag every 44 px control |
| **U7** | No horizontal overflow at 390 | At 390px, `document.documentElement.scrollWidth <= 390`, and visually scroll to the right edge | No page-level horizontal scrollbar. Usual suspects: the `HorizontalScrollFilter` pill rows, the 7-column tech tables, `.responsive-table-wrapper` (`min-width: 600px`), admin 7–8-column tables, the Group5 kanban board, and `InvoiceModal`'s 6-column table (no `overflow-x-auto` inside an `overflow-hidden` wrapper) |
| **U8** | No layout shift | Reload with a DevTools Performance recording (or watch the CLS badge) | CLS ≈ 0. Images have reserved space; fonts do not reflow the header; lazy views match the skeleton's height |
| **U9** | Correct VI and EN strings | Flip the header switcher on this route | Zero leakage in either direction. Watch for hardcoded VI (the whole `/personalize` page, `OrderProgress`, `/tracking`, invoice, checkout form, `CanvasErrorBoundary`, `PageSkeleton`) and hardcoded EN (`aria-label="Clear search"`, `Share`, `aria-label="Close CAD inspector"`) |
| **U10** | Price / currency formatting | Read every monetary value on the page | Consistent symbol, grouping and decimals; no `NaN`, `undefined`, `Infinity` or `0 đ` for a selection. Baseline: `toLocaleString('vi-VN') + ' đ'` vs `₫` mix; prices are recomputed independently in `CartView`, `CheckoutView`, `CartDrawer`, `InvoiceModal` and `OrderSuccessView` — cross-check them against each other |
| **U11** | Console errors | Open the DevTools Console (preserve log), navigate to and interact with the page | Zero errors. Warnings must be explainable. Known-benign noise to ignore: `ResizeObserver loop …` (suppressed in `src/main.tsx` L7–43). Everything else is a defect |

---

### `/` → `src/frontend/views/HomeView.tsx`

| Check | How to verify | Expected |
| --- | --- | --- |
| Hero + announcement | Load `/` | Hero headline from `siteContent`; announcement callout with its CTA scrolling to `#browse-cad-catalog` |
| Hero CTA "instant quote" | Click `Báo Giá File 3D Tức Thì` / `Instant 3D File Quote` | Navigates to `/quote` |
| Hero CTA "browse" | Click `Khám Phá Kho Mẫu CAD` / `Browse CAD Catalog` | Smooth-scrolls to the catalog section (no route change) |
| Hero CAD dropzone | Drag an `.stl` over the hero, then drop it | Drop state (`Thả tệp CAD vào đây để phân tích tức thì!`) appears on `dragenter`/`dragover`, clears on `dragleave`, and the file navigates to `/quote` with `state.uploadedFile` |
| Hero dropzone by click | Click the dropzone | File picker opens with `accept=".stl,.3mf,.step,.stp,.obj"` |
| Hero dropzone keyboard | `Tab` to the dropzone, press `Enter`/`Space` | Expected: the picker opens. Baseline: it is a `<div>` with `onClick` — **not focusable** (U4 blocker) |
| Dropzone i18n | EN mode | Expected: EN drop copy. Baseline: hardcoded VI |
| Hero 3D switcher | Click `Bánh Răng` / `Khung Drone` / `Vỏ Hộp IoT` (Gear/Drone/IoT Case) | Model swaps in the WebGL canvas with no console error; previous geometry is disposed. Baseline: buttons are hardcoded VI |
| Hero 3D interaction | Drag on the canvas; scroll-wheel over it | Rotates and zooms; the page does not scroll while the cursor is over the canvas (`wheel` + `preventDefault`) — verify this is not hostile on touch |
| Catalog search | Type `gear` in the catalog search | List filters live; the clear button (title `Xóa tìm kiếm`) restores the full list |
| Category pills | Scroll the category row; click a pill | Row scrolls via the chevrons and via touch; the selected category filters the grid; the pill row scrolls horizontally **without** overflowing the page (U7) |
| Tag pills | Click `#2/9` (HOT badge) and a second tag | Product list filters to that tag; `Bỏ lọc tag` / `Clear tag` clears it |
| View-mode toggle | Click the grid icon, then the list icon | Grid ⇄ technical spec table. Both icon buttons need accessible names — baseline: `title` only |
| Product card → detail | Click a card image or title | `/products/<id>` |
| Card hover 3D overlay | Hover a card, click `Soi 3D 360°` | `CadQuickViewModal` opens with the 3D inspector. Verify it also works on touch/keyboard (baseline: hover-only overlay) |
| Quick-buy digital | Click `Mua File CAD` / `Buy CAD File` | Digital item added to the cart, drawer opens, toast confirms |
| Physical order path | Click `Đặt In` / `Order` | `/products/<id>` |
| Customizer shortcut | On a customizable product click the `tune` button | Expected: `/personalize/<id>`. Baseline bug: `handleSelectProductAction` ignores its target-screen argument and always navigates to `product_detail` |
| Empty state | Search a nonsense string | `Không tìm thấy linh kiện CAD phù hợp` / `No CAD parts match your criteria` + a reset button that clears all filters |
| Calculator | Change material, part size, infill slider (15–100, step 5) | Weight / duration / price update live, are internally consistent, and format correctly in both languages |
| Calculator CTA | Click `Tải File STL Lên Để Báo Giá Chi Tiết →` | `/quote` |
| Material comparison matrix | Click each of the 5 category tabs; click a row; click `Báo Giá` | Filtering and row highlight work; `Báo Giá` goes to `/quote?material=<id>` and the quote applies that material with a confirming toast |
| Taxonomy cards | Click a category card | Sets the catalog filter and scrolls to the catalog |
| Fabricated counts | Compare `Xem toàn bộ kho bản vẽ (N+)` and the hero badges with the real catalog size | Expected: real counts. Baseline: the badge uses `products.length * 20` — a fabricated number that must not ship |
| Catalog parity with `/explore` | Compare the product sets | Expected: the same catalog. Baseline: `/explore` hides non-`published` items for non-admins and hides `pricePhysical > 600000`, while `/` does not — the same tag yields different counts |
| `U1–U11` universal | Run the master matrix on `/` | All pass; record page-specific failures (U4 hover-only dropzone/overlays, U5 icon buttons, U7 pill rows + 7-column table, U9 hardcoded VI) |

### `/explore` → `src/frontend/views/ExploreView.tsx` (wrapped by `ExploreRoute`, `src/App.tsx` L78–106)

| Check | How to verify | Expected |
| --- | --- | --- |
| Query-param seeding | Open `/explore?category=X&search=gear&tag=2/9` cold | All three filters apply on first paint and are reflected in the sidebar/tray |
| Search | Type in the search box | Live filtering; the clear button works (needs a name — baseline `aria-label="Clear search"` is English-only) |
| Category sidebar | Click each category; check counts | Counts are live (`categoryCounts`) and match the filtered results |
| Price filter | Click each preset, then drag the range (50,000–600,000, step 25,000) | Results narrow correctly; the `600k+ đ` tick must mean "> 600,000" and be reachable — baseline: `priceMax` max is also 600,000, so the tick is misleading |
| Material filter | Click each material button | Filters by material; expected: the list comes from the shared material catalog, not a hardcoded local array |
| Checkbox filters | Toggle `Hỗ trợ khắc tên & tùy biến`, then `Đạt chuẩn Watertight 100%` | Both actually change the result set. Baseline bug: `onlyWatertight` is a no-op (its filter branch returns nothing) and it never appears in the active-filters tray |
| Sort select | Try all five options | Order changes accordingly and matches the label |
| Active-filters tray | Apply a search + category + tag + material + price | One removable chip per active filter; each ✕ removes exactly that filter; `Xóa toàn bộ bộ lọc` clears everything. Each ✕ needs an accessible name (baseline: none) |
| Mobile filter toggle | At 390px click `Bộ Lọc Nâng Cao (N)` | Sidebar opens with the correct active-filter count; `Đặt lại` resets |
| Tag chips | Click a card's `#tag` chip | Adds/removes that tag filter |
| Bookmark | Click the bookmark on two cards, then reload | Expected: persists. Baseline: local `useState` seeded with `['prod-arduino-case']`, lost on remount |
| Card → detail / personalize | Click a card, then its `tune` button | `/products/<id>` and `/personalize/<id>` respectively |
| Quick view modal | Open `Soi 3D 360°`, then close via ✕, backdrop and `Esc` | All three close; body scroll restores; colour swatches and qty ± work. Verify dialog semantics (baseline: none) and that qty ± have names (baseline: none) |
| Load more | Click `Xem thêm (N bản vẽ CAD)` | +12 items, count updates, no duplicate keys in the console |
| Empty state | Apply mutually exclusive filters | `Không tìm thấy bản vẽ phù hợp với tiêu chí lọc` / `No CAD models match your criteria` + reset |
| Table view | Switch to the list view at 390px | The table scrolls inside its wrapper; the page itself does not overflow (U7); table headers are localized (baseline: hardcoded VI) |
| `U1–U11` | Master matrix | Record failures (U2/U3 no loading-error state, U4 tray ✕ + hover overlay, U9 large untranslated blocks) |

### `/products/:productId` → `src/frontend/views/ProductDetailView.tsx` (wrapped by `ProductDetailRoute`, `src/App.tsx` L108–159)

| Check | How to verify | Expected |
| --- | --- | --- |
| Valid id | Open `/products/<real-id>` | Full detail page; breadcrumb `VCUBE 3D` → `Catalog` → product |
| Cold-load race | Open a deep link in a new tab on Slow 3G | Spinner + `Đang tải thông số kỹ thuật mô hình 3D...` while `products` is empty, then the product. Never a permanent spinner and never a false "not found" |
| **Unknown id** | Open `/products/does-not-exist` once products have loaded | `Không tìm thấy bản vẽ CAD này` / "CAD file not found" + `Quay lại Kho Bản Vẽ` → `/explore`. This is the reference implementation of a not-found state in this repo — copy it to `/tracking` and `/personalize` |
| Bookmark | Click `Lưu`/`Saved` | Toggles with a toast. Verify persistence across reload (expected); baseline is view-local |
| Share | Click `Share` | Link copied, toast confirms. Baseline: the visible label is hardcoded EN and has no VI variant |
| 3D ⇄ Gallery | Toggle `3D Interactive Canvas` / `Gallery (N)` | Both render; the gallery index and the `Ảnh {i+1} / {n}` overlay are correct |
| Empty gallery | A product with `images: []` | Expect a placeholder, not an undefined `<img src>` and not `Gallery (0)` with an empty frame |
| Wireframe | Toggle `Mesh Wireframe`, then use the viewer's own wireframe button | Both stay in sync (baseline: two independent states that can desync) |
| Tab bar | Click all four tabs (`Tổng quan & Kết cấu`, `Specs & Tolerances`, `Kiểm định (N)`, `Slicing Profiles`) | Content switches; no overflow at 390 (the strip is scrollable but uses a non-existent `scrollbar-none` class — expect visible native scrollbars) |
| Material buttons | Click each supported material | Selection updates the price and the 3D tint; `aria-pressed` (or equivalent) marks the selection (baseline: none) |
| Colour swatches | Click each colour; try a disabled swatch | Available colours apply; out-of-stock swatches are disabled with a visible reason (`{name} (Hết hàng)`); each has an accessible name |
| Resolution select | Change `0.12 / 0.16 / 0.20 mm` | Price recalculates. The select must have a real `<label htmlFor>` (baseline: the label is not associated) |
| Quantity | Press `−` at 1, then `+` many times | Never goes below 1; expected an upper bound. Baseline: `+` is unbounded |
| Engraving | Type in the engraving field (max 25) | Field appears only for `isCustomizable`; the fee is added and shown; the limit behaves |
| Add to cart (physical) | Click `ĐẶT GIA CÔNG IN 3D (n đ)` | Button disables while adding, then the drawer opens with the fully specified line (material, colour, resolution, dimensions, custom text). Rapid double-click must not create two lines (baseline: no debounce) |
| Buy digital | Click `Mua & Tải File CAD Ngay` | Digital line added with the correct price/licence; rapid double-click must not duplicate |
| Customizer CTA | Click `TÙY BIẾN 3D & KHẮC LASER RIÊNG` | `/personalize/<id>` with the product preselected |
| Mobile sticky bar | 390px, scroll to the bottom | Sticky bar with `CAD` and `Đặt In 3D`/`Order Print`; both act; it must not cover the footer or the support FAB |
| Related products | Click a related card, then `Xem tất cả` | Related card → `/products/<id>`; `Xem tất cả` → `/explore`. Baseline: related cards are `<div>`s, not keyboard-focusable (U4) |
| 3D touch | At 390px, try to rotate the model by dragging, and try to scroll the page starting on the canvas | Expected: touch orbit works and the page can still scroll past the canvas. Baseline: the viewer sets `touchAction='none'` but has **no touch handlers** — mobile cannot rotate and the page cannot scroll over the canvas. Blocking |
| WebGL failure | Force a WebGL context failure (or disable WebGL) and reload | A graceful fallback. Baseline: no try/catch or error boundary around `ThreeModelViewer` — a throw in `useEffect` blanks the page |
| `U1–U11` | Master matrix | Record failures (U5 many `title`-only buttons, U9 hardcoded VI in EN mode, U10 price vs SEO JSON-LD mismatch) |

### `/personalize` (no id) → `src/frontend/views/PersonalizeView.tsx` (wrapped by `PersonalizeRoute`, `src/App.tsx` L161–182)

| Check | How to verify | Expected |
| --- | --- | --- |
| Default product | Open `/personalize` | Expected: a clear default selection or a product picker. Baseline: silently uses `products[0]`, with a hardcoded inline mock product as the final fallback |
| Breadcrumb/back | Click `arrow_back` and `Catalog` | Both return to `/explore` |
| Material presets | Click all four (`PETG Technical Pro x1.15`, `PLA Tough Standard x1.0`, `Tough Resin 8K x1.45`, `ABS Industrial Grade x1.3`) | Price changes by the multiplier **shown on the card**. Baseline bug: the applied multiplier comes from a separate `materialsList` lookup, so the card can display one number and charge another |
| Colour swatches | Click all five | Selection updates the price and the 3D tint; each swatch needs an accessible name |
| Engraving text | Type, clear, and exceed the limit (max 24) | Counter `{n} / 24 ký tự` is accurate; the warning box appears when the text is too long for the chosen font size; clearing the text removes the engraving fee. Baseline: the default `PROTOTYPE-01` means the fee is never 0 on first load |
| Finish selector | Click each of the three (`Đùn Nổi 3D +1.2mm`, `Khắc Laser Carbon Đen`, `Khoét Âm -0.8mm`) | The 3D preview reflects the finish; price/lead-time copy stays consistent |
| Align + font selects | Change `Vị Trí Căn Lề` and `Phông Chữ Kỹ Thuật` | The 3D texture repositions/refonts. Both selects need associated `<label>`s (baseline: none) |
| Font-size range | Drag 6 → 24 mm | 3D text scales; the overflow warning fires when too large |
| Explode slider | Drag the page slider, then the identical slider inside the 3D viewer | Both move in lockstep in both directions and show the same `+{n}mm`. Baseline: two independent controls that can desync |
| Explode presets | Click `Đóng 0mm`, `Mở 50% 20mm`, `Mở Hết 40mm` | Slider and model snap to those values |
| Logo upload (click) | Click the dashed upload label and pick a `.png` | Expected: the logo is displayed/embedded in the preview. Baseline: upload is a **stub** — no `FileReader`, no validation, only the filename is drawn as text |
| Logo upload (drag) | Drag a file onto the upload area | Expected: it accepts drops. Baseline: drag & drop is advertised in the copy but no `onDrop` handler exists |
| Logo validation | Upload a 20 MB file and a `.zip` | Expected: rejected with a clear reason (the copy promises `.SVG/.DXF/.PNG` under 10 MB) |
| Logo fee | After upload, then `✕ Xóa file` | +80,000 ₫ applied and removed correctly; the fee line disappears on removal |
| Batch quantity | Click x1 x2 x5 x10 x20 x50 | Unit price and total stay consistent with the advertised volume tiers (`5+ -8% • 10+ -15% • 20+ -22%`). Verify against the admin-configured tiers — baseline hardcodes them here while `ProductDetailView` reads `activeConfig.volumeDiscounts` |
| Delivery tier | Click `Tiết Kiệm 5-7 ngày −10%`, `Tiêu Chuẩn`, `Hỏa Tốc 24H +30%` | Price multiplier and the exit-factory/lead-time copy change together |
| Add to cart / Order now | Click `Thêm Vào Giỏ Hàng`, then `Đặt In Ngay` | Add → drawer opens, stay on the page. Order now → `/cart` (the toast may announce navigation first; the navigation must still happen) |
| Mobile bar | 390px | Sticky bar: icon-only add-to-cart (needs a name) + `Đặt In Ngay`; no overlap with the support FAB; tap targets ≥48 px |
| `U1–U11` | Master matrix | Record failures (U3 no error state, U6 `grid-cols-6` qty buttons at 390, U9 the whole page is Vietnamese-only, U5 no names on swatches/icon buttons) |

### `/personalize/:productId` → same view (invalid ids are **not** handled)

| Check | How to verify | Expected |
| --- | --- | --- |
| Valid id | `/personalize/<id>` for a customizable product | That product is configured from the start; SKU/name/badge match |
| **Invalid id** | `/personalize/garbage-id` | Expected: a not-found state (mirror `ProductDetailRoute`). Baseline bug: `App.tsx` L170 falls back to `products[0]` and then to an inline mock — the user silently configures the **wrong product**, and the "Add to cart" line carries that wrong product's name and price. Blocking |
| Non-customizable product | `/personalize/<id-of-a-non-customizable-product>` | Either a clear "not customizable" message or a sensible default; never a silent substitution |
| Deep-link + Back | Open `/personalize/<id>`, configure, press browser Back | Returns to the previous route; no crash and no console error |
| Id ↔ payload mismatch | Open `/personalize/<idA>` and confirm the cart line name/SKU | The cart payload must reference `idA`, not `products[0]` |
| `U1–U11` | Master matrix | Same as `/personalize` |

### `/quote` → `src/frontend/views/Tool3DView.tsx` (legacy `/tool-3d` → `Navigate to="/quote" replace`, `src/App.tsx` L898)

| Check | How to verify | Expected |
| --- | --- | --- |
| Legacy redirect | Visit `/tool-3d` | Lands on `/quote`; the URL is replaced (Back does not re-trigger the redirect); nav highlights `3D Quoting` |
| First paint | Cold load `/quote` on Slow 3G | `PageSkeleton` (lazy route) then the workspace; no blank canvas |
| File upload (picker) | Click `Chọn File Từ Máy Tính` and pick an `.stl` | Analysis spinner `Đang giải mã Mesh 3D, bóc tách cấu trúc tam giác và tính toán thể tích…`, then the model with dimensions/volume/triangles |
| File upload (drag) | Drop a file on the outer dropzone, then on the canvas itself | Both targets accept the drop; the drop overlay appears and clears |
| Accepted formats | Try `.stl`, `.3mf`, `.step`, `.stp`, `.obj`, `.iges` | Each either parses correctly or reports honestly which formats are unsupported. Baseline: **STEP/STP/IGES are never parsed** — every one silently yields the same parametric proxy solid (`{92,72,34}`, name `…[B-Rep Solid CAD]`) and reports success |
| Size-limit honesty | Read the badge `(Tối đa 150MB)`, then upload a 200 MB file | Expected: rejected with a clear message. Baseline: the 150 MB cap is display text only — no size validation exists |
| **Corrupt file (critical)** | Create a text file named `broken.stl` (garbage bytes) and upload it | Expected: an honest parse error — "could not read this file", no price, no model, no success toast. **Baseline: it fabricates a model.** `Tool3DView.tsx` L314–371 catches the failure, logs `generating fail-safe CAD model`, then builds a hardcoded recovery file (85×55×30 mm, 42.5 cm³, 14,200 triangles, `isWatertight: true`, `printabilityScore: 92`, fake SHA-256) and toasts `Đã tự động khởi tạo mô hình CAD phôi an toàn cho <file>`. Separately `meshParser.ts` swallows `STLLoader` errors and substitutes `BoxGeometry(85, 32, 60)` with a **success** toast, `Watertight 100%` and score 94 |
| Fabricated hashes | Inspect the reported SHA-256 after any upload | Expected: the real file hash, or no hash. Baseline: a hardcoded constant `c7d8e9f0…` is reported for every file, including the fabricated recovery model |
| Empty state | Remove/replace the seeded sample files | Expected: a real "no file loaded, upload one" state. Baseline: files are seeded from `SAMPLE_ANALYSIS_FILES` with no removal path, so the empty state is unreachable and a shorter mock array would crash on mount |
| Workspace tabs | Click `1. Cấu Trúc Part`, `2. Bảng Màu 3MF`, `3. Tỷ Lệ & Tọa Độ`, `4. Chi Tiết QA` | Each panel renders; the active tab is distinguishable; state survives tab switching |
| Object tree | Toggle part visibility, change a per-part colour, set `Đầu đùn: Tool T1–T4`, change `Bàn:` and per-part material | The canvas updates; selections are labelled; icon-only controls have accessible names (baseline: `title` only) |
| Transforms | Scale 20–300% + presets, rotate ±90°, position sliders | Model transforms live; `Đặt Lại`, `Áp Sát Bàn In`, `Căn Giữa Bàn` restore sane values; sliders have associated labels (baseline: none) |
| **Printer switch (critical)** | Load a model, change `Máy In Gia Công` to a machine with a different bed, then click `Đổi Sang Máy Khổ Lớn (420mm)` | Expected: the model **stays visible** and the bed/price update. Baseline risk: the bed change re-runs `ModelViewer3D`'s init effect whose cleanup calls `disposeHierarchy(scene)` (detaching the model group) while the geometry-build effect does not re-run — the model can vanish. Verify explicitly in the browser |
| Printer list source | Compare the `Máy In Gia Công` options with `vcube_printers` / the `printers` prop | Expected: the list reflects admin-managed printers. Baseline: `currentPrinter` is resolved from the static `PRINTER_PROFILES` import (`Tool3DView.tsx` L91), so admin edits and DB-only printers are ignored and an unknown id silently falls back to `PRINTER_PROFILES[0]` |
| Unit switch | Toggle `Đơn vị hiển thị: Millimet (mm) | Inches (in)` | Expected: a confirm step (the dedicated `StlUnitConfirmModal` exists for exactly this) before a ×25.4 rescale. Baseline: it resizes instantly, reprices, and trips the red `KÍCH THƯỚC VƯỢT KHỔ BÀN IN` banner with no confirmation. `setIsStlUnitModalOpen` is only ever called with `false`, so the modal is unreachable dead code |
| Bed-fit banner | Scale the model past the bed size | Banner appears with the correct numbers; scaling back clears it |
| Slicer controls | `Độ Đặc Ruột` 10–100 step 5 + `Gyroid/Grid/Honeycomb`; `Độ Dày Lớp In` 0.08/0.12/0.16/0.20; `Cấu Hình Chân Đỡ`; `Số lượng sản xuất` x1…x20 | Every change updates the price and the canvas layer preview; **the same controls appear twice** (left slicer card and right summary) and must stay in sync in both directions |
| Slice-bar honesty | Change the layer height, then read the canvas slice chip | Expected: the chip reflects the selected height. Baseline: it hardcodes `0.16mm Layer` |
| Validation report | Click `Tự Động Sửa Lưới Mesh`; then `Hiện Vùng Lỗi`/`Tắt Vùng Lỗi`; then `So Sánh: Chuẩn | Trước Sửa | Sau Sửa`; then the `Level 3/2/1` toggles | Each control works and the reported numbers correspond to reality. Known baseline risk: the repair action asserts `printabilityScore: 98`, `isWatertight: true`, `minWallThickness: 1.6`, `nonManifoldEdges: 0` regardless of whether a repair actually happened, and the panel fakes a 600 ms spinner |
| Quote summary | Read `1. Ước Tính Hình Học Sơ Bộ` and the three `2. Báo Giá Chính Xác` package radios | Range and per-package unit/total prices are arithmetically consistent with the chosen quantity and material; the dark total bar matches the selected package; the validity date is correct and locale-formatted |
| Manual-review tier | Configure an order large/complex enough to return tier `manual_review` | Amber block + `Gửi Yêu Cầu Thẩm Định Kỹ Thuật`; the CTA does something observable |
| Add to cart | Click `Thêm Đơn Gia Công Vào Giỏ Hàng` | Item added, cart drawer opens, stays on `/quote` |
| Order now | Click `Đặt In Ngay (Chuyển Đến Thanh Toán)` | Item added **and** `/checkout` opens. The cart line price must equal the price shown in the summary |
| Canvas toolbar | ISO/TOP/FRONT/SIDE, `360`, grid, `PERSP`/`ORTHO`, reset view, `Co Vừa Bàn`, caliper `Xóa điểm`, camera (downloads `VCube_3D_Thumbnail_<ts>.png`), fullscreen `Thoát (ESC)` | Every control works; fullscreen exits via the button **and** `Esc`; the downloaded thumbnail is a real PNG of the current view; each icon button has an accessible name (baseline: `title` only — U5) |
| Canvas error boundary | Force a WebGL failure | `CanvasErrorBoundary` renders `Không Gian 3D Đang Tự Động Phục Hồi` + `Kích Hoạt Lại Engine 3D`, and the retry button recovers. Baseline: the boundary only wraps this viewport, its copy is Vietnamese-only, and the raw JS error message is printed to the user |
| Modals | Open all four (`So Sánh STL vs 3MF`, `Giá Vốn Xưởng` / internal cost, `So Sánh Máy`, the unit modal) | Backdrop-click close (`e.target === e.currentTarget`), ✕ close, footer close and `Esc` all work; body scroll locks. Expected `role="dialog"`/`aria-modal`/focus trap/focus return — baseline: none. `InternalCostBreakdownModal`'s ✕ has neither `title` nor `aria-label` |
| Modal animations | Open any modal | Expected: an entrance animation. Baseline: `animate-in fade-in zoom-in-95` are **inert** (`tailwindcss-animate` is not a dependency and no matching keyframes exist) — the modal pops |
| Sample files | Click the `Mẫu Thử Benchmark` buttons | Each loads a sample and shows its history row |
| Analysis history | Click `Phân Tích` / `Đang Xem` rows | Switching history entries restores the previous analysis. Baseline: the table header claims `S3 Direct Upload Cache` but **nothing is uploaded or persisted** — `/quote` writes no localStorage |
| Duplicate parse (StrictMode) | Drop a file via the Home hero dropzone (which passes it through `location.state.uploadedFile`) | Expected: one history row. Baseline risk: the effect at `Tool3DView.tsx` L375–390 has no dedupe and `src/main.tsx` enables `StrictMode`, so the file is parsed twice → duplicate rows |
| `U1–U11` | Master matrix | Record failures (U2 empty state unreachable, U3 only the canvas has an error surface, U5 `title`-only toolbar, U7 tables on mobile, U10 price consistency with the cart) |

### `/cart` → `src/frontend/views/CartView.tsx`

| Check | How to verify | Expected |
| --- | --- | --- |
| Empty state | Sign out of a filled cart / clear storage, then open `/cart` | `Giỏ hàng của bạn đang trống` / `Your cart is empty` + body copy + `Khám Phá Bản Vẽ CAD` → `/explore` and `Báo Giá Mesh STL` → `/quote` |
| Line items | With physical + digital + engraved items | Correct thumbnail (with a broken-image fallback), material/colour chips, `Khắc: "…"` chip, per-type badge, unit and line totals |
| Quantity stepper | Press `−` and `+` on a physical line; press `−` at qty 1 | Quantities and totals update instantly; at qty 1 the `−` removes the line (verify this is intentional and discoverable, and that the undo toast is offered) |
| Stepper a11y | Inspect `−` and `+` | Accessible names (e.g. "Decrease quantity") and the current quantity exposed as a spinbutton/text. Baseline: both are bare `-`/`+` text buttons and the quantity is a static `<span>` (U5) |
| Delete line | Click the delete icon | Line removed immediately with an undo toast. The icon needs an accessible name (baseline: `title` only) |
| Undo | Click the toast undo action | Line restored with its original specs and quantity |
| Promo codes | Apply `VCUBE10` (−10%), then `TECH3D` (flat −20,000 ₫) | Discount line appears and the total decreases by exactly that amount |
| Invalid promo | Apply `NOPE` | `Mã ưu đãi không hợp lệ. Vui lòng kiểm tra lại.` / `Invalid promo code. Please check again.` and the previous discount must be **cleared** (baseline: an invalid code after a valid one keeps the old discount while showing an error — misleading) |
| Empty promo | Click `Áp dụng` with an empty field | Expected: a validation message. Baseline: returns silently |
| **Promo → checkout (critical)** | Apply `VCUBE10` on `/cart`, then click `TIẾN HÀNH THANH TOÁN` | Expected: the discount is visible on `/checkout` and reduces the total. **Baseline: it is always lost** — `appliedDiscount` lives in `CartView`'s local `useState`, `onNavigate('checkout')` passes no payload, and `App.handleNavigate` only calls `setAppliedDiscount` when `payload.appliedDiscount !== undefined` (`App.tsx` L585). The store field is unreachable in practice, and the discount also resets on any cart unmount |
| Shipping threshold | Cross the 300,000 ₫ physical subtotal in both directions | Shipping goes `30.000 đ` → `MIỄN PHÍ` with a visual free-ship cue, and the total is consistent with `/checkout` |
| Threshold consistency | Change the free-ship threshold in `/admin/storefront`, then compare `/cart`, the drawer and `/checkout` | All three agree. Baseline: `CartView` and `CartDrawer` hardcode 300,000/30,000 while `CheckoutView` reads `siteContent` |
| Totals math | Recompute subtotal + shipping − discount by hand | Exact match; no rounding drift; no negative total (`Math.max(0, …)`) |
| Continue shopping | Click `Tiếp tục chọn bản vẽ` / `Continue Shopping` | `/explore` |
| Checkout CTA | Click `TIẾN HÀNH THANH TOÁN` | `/checkout` |
| Guest checkout allowed | Signed out, complete the path | Must reach `/checkout` without a forced login redirect (this is a documented refactor goal: authenticate only at the final order step) |
| Cart persistence | Reload and reopen `/cart` | Cart restored from `localStorage['vcube_cart_store']` (zustand persist) with prices and quantities intact |
| Cart cleared after order | Complete an order, then return to `/cart` | Cart is empty and the promo is reset |
| Cart not cleared on logout | Fill the cart, sign out | Expected: a documented decision — either keep or clear. Baseline: it survives logout (may be a shared-machine privacy issue) |
| `U1–U11` | Master matrix | Record failures (U5 stepper/delete names, U7 line layouts at 390, U10 promo math) |

### `/checkout` → `src/frontend/views/CheckoutView.tsx`

| Check | How to verify | Expected |
| --- | --- | --- |
| **Empty cart** | Clear the cart, then open `/checkout` directly | Expected: redirect to `/cart` or a blocking empty state with an enabled-submit guard. Baseline: it renders the full form, `Đơn Hàng (0 mục)`, free shipping, a 0 ₫ total **and an enabled submit** — a 0 ₫ order can be created. Blocking |
| Required fields | Submit with `Họ và tên người nhận`, `Số điện thoại`, `Email`, `Quận/Huyện`, `Địa chỉ chi tiết` cleared | Submission is blocked with a clear, localized, inline message for **each** field, `aria-invalid` set, and focus moved to the first invalid field. Baseline: browser-native bubbles only, no inline text, no `aria-invalid` |
| Email validation | Enter `not-an-email` | Blocked with a message. Also confirm the profile-prefilled demo defaults (`engineer@techlab.vn`, `0912 345 678`, a Hòa Lạc address, an M3-thread note) cannot be mistaken for the user's own data |
| Phone validation | Enter letters and a too-short number | Blocked with a message |
| City select | Confirm `Tỉnh / Thành phố *` cannot be submitted empty | The select carries the required semantics (baseline: it has **no** `required` attribute, only a value that happens to exist) |
| Payment method | Try each of `VietQR Ngân Hàng`, `Cổng VNPAY QR`, `Thanh Toán COD` | The selected method is visually distinct and submitted; COD is disabled when the cart has no physical items and explains why (`Chỉ áp dụng hàng in 3D`) |
| Payment keyboard | Tab through the radio group and change selection with the arrow keys | Standard radio-group behaviour; the selected method is announced |
| VAT invoice | Tick `Yêu cầu xuất hóa đơn điện tử VAT (8%)` | The three company fields appear. Clearing them and submitting must be **blocked** — baseline bug: all three are labelled `*` but none is `required`, so an empty company/tax id submits; only name + tax id reach `shippingAddress.note` and the registered address is discarded |
| VAT math | Compare the VAT line with the order summary and the invoice | Expected: one consistent VAT figure. Baseline: `order.payment.tax = 0` while labels claim "VAT included", and `InvoiceModal` then adds 8% on top — the success page and the invoice can disagree |
| Order summary | Compare the sidebar list and totals with `/cart`, the drawer and the summary bar | Identical subtotal, shipping, discount and total — including the promo (see the `/cart` critical row) |
| Re-quote honesty | Change a cart price via admin (or use a stale tab), then reload `/checkout` | Expected: prices are re-validated before the order is created. Baseline: cart line prices are client-trusted; `pricingEngineService`/`quoteVerifier` are not called at checkout |
| Submit (loading) | Click submit | Button disables and reads `ĐANG KHỞI TẠO ĐƠN HÀNG...` with a spinner for ~900 ms, then success |
| **Double submit** | During the 900 ms window, press `Enter` in a text field, then click submit again | Expected: exactly one order. Baseline bug: `isProcessing` disables the button but is not checked at the top of `handleCompleteOrder`, and `Enter` in any input re-fires `onSubmit` → duplicate orders and duplicate digital assets |
| Error state | Go offline and submit | Expected: an error message with a retry and no order created. Baseline: no error path at all — the order is built client-side in a `setTimeout` with no API call |
| Network honesty | Watch the Network tab during submit | Document what checkout actually does (baseline: no network request; the order exists only in React state). If the refactor adds a real order endpoint, re-verify idempotency and the failure path |
| Order created | After submit | Confetti, cart cleared, digital items added to `/assets`, and `/order-success/<orderId>` |
| `U1–U11` | Master matrix | Record failures (U2 no empty guard, U3 no error path, U5 no labels on `-`/`+`, U9 mostly Vietnamese-only form, U10 cross-surface total mismatch) |

### `/order-success` → `src/frontend/views/OrderSuccessView.tsx` (wrapped by `OrderSuccessRoute`, `src/App.tsx` L184–200)

| Check | How to verify | Expected |
| --- | --- | --- |
| Fresh order | Complete a checkout | Success page for the order just placed: order number, items, totals, payment method, next-step timeline |
| Bare route (no id) | Open `/order-success` with no order in state | Expected: a sensible empty/redirect state. Baseline: `order = orders.find(id) || activeOrder || orders[0]` — with no id it shows an arbitrary order from state, and with an empty `orders` array it **crashes** on `order.items` |
| Unknown id | Open `/order-success/garbage` | Expected: not-found for an order that does not belong to this session. Baseline: silently shows `activeOrder` or `orders[0]` |
| Refresh | Press F5 on `/order-success/<id>` | Expected: the order still resolves. Baseline: orders live only in React state (`MOCK_ORDERS` + in-memory), so a refresh loses the order and can render the wrong one |
| Copy tracking info | Click the copy control | Value copied with a visible `Sao chép` → `Đã chép` confirmation |
| Track order | Click `THEO DÕI CAMERA XƯỞNG IN 3D` (physical orders only) | `/tracking/<orderId>` for the same order |
| Asset library CTA | Click `Mở Kho Tệp CAD` | `/assets`, and purchased digital items are present |
| Invoice | Click `Xuất Hóa Đơn VAT (PDF)` | `InvoiceModal` opens with the correct order; the printed output does not clip (baseline: a 6-column table with no `overflow-x-auto` inside an `overflow-hidden` wrapper) |
| Invoice math | Compare the invoice subtotal/VAT/total with the success page | Expected: identical. Baseline: the invoice recomputes from `subtotalPhysical || total`, drops the digital subtotal, the discount and shipping, and adds 8% VAT; it also prints `✓ ĐÃ THANH TOÁN` even for an unpaid COD order and a hardcoded SHA-256 string |
| Print | Click `In Hóa Đơn` | A clean one-page print with no UI chrome (baseline: `window.print()` with no print CSS) |
| i18n | Flip to EN | Expected: EN. Baseline: this view is Vietnamese-only |
| `U1–U11` | Master matrix | Record failures (U2/U3 no empty/error state, U9 Vietnamese-only, U10 invoice vs page totals) |

### `/order-success/:orderId` → same view

| Check | How to verify | Expected |
| --- | --- | --- |
| Valid id from this session | Open the id produced by a completed checkout | Correct order |
| Id from another session/user | Open another person's order id while signed out | Expected: not-found, never a foreign order's PII. Baseline: falls back to `activeOrder`/`orders[0]` — an information leak |
| Malformed id | `/order-success/%%%` | Renders a not-found state, no crash, no console error |
| Id casing/whitespace | `/order-success/ ORD-2026-8801` | Normalized or not-found; never a crash |
| `U1–U11` | Master matrix | As above |

### `/tracking` → `src/frontend/views/OrderTrackingView.tsx` (wrapped by `OrderTrackingRoute`, `src/App.tsx` L202–220) — **public route**

| Check | How to verify | Expected |
| --- | --- | --- |
| Default view | Open `/tracking` while signed out | Expected: the guest lookup portal, not somebody's order. Baseline: `currentOrder` initialises to `activeOrder`/`MOCK_ORDERS[0]` and renders a full order (recipient name, phone, address, payment line, carrier code) before any lookup |
| Guest lookup form | Click `Tra Cứu Mã Khác`; enter a valid order number + phone/PIN; submit | Order found and displayed; the form collapses; errors are localized |
| Lookup by order number alone | Clear the PIN/phone field and submit only the order number | Expected: refused — an order number alone must not unlock an order. Baseline: `handleGuestLookup` returns `true` when the credential is empty (`OrderTrackingView.tsx` L97, L116), so any stored/mock order is viewable with its number only. Blocking privacy defect |
| Customer isolation | In a fresh profile, submit an order number belonging to a seeded demo order | Expected: not found unless the credential matches. Baseline: it succeeds |
| Error state | Submit `#NOPE-000` with a PIN | `Không tìm thấy đơn hàng với thông tin này. Vui lòng kiểm tra mã đơn hoặc token / số điện thoại.` in a rose box |
| Sample link | Click `#VCUBE-8924-A (Đang in)` | Fields prefilled and the lookup succeeds |
| Magic-link params | Open `/tracking?code=VCUBE-8924-A`, then `?order=…`, then `?token=…` | `code`/`order` resolve or open the prefilled guest portal. Document that `?token=` is **not** implemented despite the code comment |
| Order header | With a resolved order | Order number, status badge, guest/registered badge, and a back control with an accessible name (`Quay lại danh sách đơn hàng`) |
| 8-stage progress | Read all eight stage cards | Labels match the MES pipeline (received → slicing → nesting → heating → printing → post-cure → QC → shipping); the current stage is visually distinct; completed stages show a check |
| Progress a11y | Inspect the progress region with a screen reader | Expected: exposed as a progress indicator with a value and an accessible name, and the current stage readable without hovering. Baseline: zero ARIA anywhere in `OrderProgress` — no `role="progressbar"`, no `aria-valuenow`, and the compact variant's stage names exist only in a **hover-only** tooltip |
| Progress correctness | Compare with the admin `8-Stage MES Kanban` value for the same order | Identical stage index and layer percentage. Baseline: `currentOrder.layerProgress || 64` and `timeRemaining || '04h 12m'` mean fabricated values are shown whenever the real ones are absent |
| Cancelled order | Set an order's status to `cancelled` in admin, then open tracking | Red `ĐƠN HÀNG ĐÃ HỦY…` banner instead of the progress grid |
| Live telemetry honesty | Read the machine/temperature/layer cards | Expected: real data or an explicit "no live data" state. Baseline: `Máy In Khí Động Học #08`, `220°C/60°C/250 mm/s`, `Lớp cắt: 384 / 600`, `84.5g`, `±0.05mm`, `ISO 9001`, `Live Telemetry` are hardcoded for every order, including orders that do not exist |
| Support + invoice | Click `Kỹ Sư Trực Ca` and `Hóa Đơn PDF` | Chat opens; the invoice modal opens for the currently displayed order |
| Warranty report | Click `Báo cáo sai số lắp ghép (Kích hoạt bảo hành) →` | Expected: a real submission with confirmation. Baseline: sets local state only — no backend, and it reports success unconditionally |
| Reduced motion | With `prefers-reduced-motion: reduce`, open a printing order | Expected: no pulsing/spinning. Baseline: `animate-pulse`/`animate-ping` run unguarded, and the referenced `animate-spin-slow` class is **defined nowhere**, so those machine icons never actually spin |
| i18n | Flip to EN | Expected: EN. Baseline: this view never calls `useLanguage()` — it is Vietnamese-only |
| 390px overflow | At 390px, check the telemetry strip and the stage grid | No page overflow; the `lg:w-96` strip stacks cleanly |
| `U1–U11` | Master matrix | Record failures (U3 no loading/error for the async lookup, U5/U6, U7 strip at ~360, U9 Vietnamese-only) |

### `/tracking/:orderId` → same view — **highest-risk route in the app**

| Check | How to verify | Expected |
| --- | --- | --- |
| **Bad id (critical)** | Open `/tracking/this-does-not-exist` in a fresh incognito window, signed out | Expected: an explicit not-found state with a route to the lookup form — and **never** another order. **Baseline: it renders a full order.** `OrderTrackingRoute` resolves `orders.find(o => o.id === orderId) || activeOrder || orders[0]` (`App.tsx` L210), `activeOrder` is seeded with `MOCK_ORDERS[0]`, and the view itself falls back to `initialOrder || MOCK_ORDERS[0]` (`OrderTrackingView.tsx` L23). The rendered order exposes recipient name, phone, address, a VNPAY payment line and a carrier tracking code. Blocking |
| Foreign id | Open another customer's real order id while signed out | Not-found. No PII leak of any field |
| Truncated / mixed-case id | `/tracking/ord-892`, `/tracking/ORD-8924` | Not-found or a normalized match — never a silent fallback to a different order |
| Injection-shaped id | `/tracking/' OR 1=1--` | Not-found, no console error. Related baseline risk: the guest lookup interpolates the identifier **unescaped** into a PostgREST `.or()` filter (`database.ts` `getOrderByToken`) — malformed filters or filter injection. Escaping/parameterization must be verified in the same phase |
| Not-found UI quality | Compare the not-found state with `/products/<bad-id>` | Same pattern: an explanatory card + a route back to `/orders` and to the lookup form |
| Correct id | `/tracking/<own order id>` | Correct order, correct stage |
| Refresh | F5 on `/tracking/<id>` | Expected: still the same order (deep link works). Baseline: with no session state the unknown-id fallback can show `MOCK_ORDERS[0]` |
| Stale tab | Open tracking, change the order's stage in admin in another tab | Expected: realtime or an explicit refresh. Baseline: stages come from app state with no realtime subscription for orders |
| `U1–U11` | Master matrix | As per `/tracking` |

### `/orders` → `src/frontend/views/MyOrdersView.tsx` (wrapped in `ProtectedRoute`; `/my-orders` → `/orders`)

| Check | How to verify | Expected |
| --- | --- | --- |
| Auth guard | Open `/orders` signed out | Redirect to `/auth/login` (baseline: `ProtectedRoute` uses `<Navigate replace>`, and the intended destination is **lost** — see critical flow (h)) |
| Redirect alias | Visit `/my-orders` | Lands on `/orders`; nav highlights `Orders` |
| List | Signed in with orders | Cards for each order with status, items, progress and totals |
| Filter tabs | Click all seven (`Tất cả đơn`, `Chờ thanh toán`, `Đang in 3D`, `Hậu kỳ & QC`, `Đang vận chuyển`, `Đã hoàn thành`, `Đã hủy`) | Counts on each tab match the filtered cards; the tab row is keyboard reachable and each tab reports its selected state (`aria-selected`/tab semantics) |
| Tab row at 390 | 390px | Horizontally scrollable without page overflow; add an affordance/scroll buttons so it is discoverable |
| Search | Search by order number, by item name, by carrier tracking code | Matches all three; the input has an accessible name (baseline: none) |
| Empty state | Filter to a combination with no results | `Không tìm thấy đơn hàng nào phù hợp` + guidance + `Tạo Báo Giá In 3D Mới` → `/quote` |
| Truly empty | New signed-in user with no orders | An onboarding empty state, not a bare filtered-empty message |
| Progress compact | Read the per-card 8-bar progress | Correct stage; the `Nấc n/8` label and layer % are accurate. Stage names must be available without hover (baseline: hover-only tooltip) |
| Track | Click `Tiến Độ MES` | `/tracking/<id>` for **that** order (the only in-app path that passes a real id) |
| Invoice | Click `Hóa Đơn` | Invoice modal for that order |
| Warranty | Click `Bảo Hành ±0.05mm`, fill the modal (`Phân loại sự cố`, measured deviation, description), submit | Expected: a real claim reference and a durable record. Baseline: purely client-side, always "success", auto-closes after 2.2 s, and the claim id is composed locally as `QC-CLAIM-{orderNumber}` |
| Warranty modal a11y | Inspect the modal | `role="dialog"`/`aria-modal`, focus trap, `Esc` close, focus return; the close ✕ needs a name (baseline: **neither** `aria-label` nor `title`) |
| Reorder | Click `In Lại` | Shows `Đang Chuyển...` then `/quote` with the previous items. Verify the 1.2 s timer is cleaned up on unmount and that double-clicking cannot fire twice |
| Many orders | Seed 30+ orders | Expected: acceptable responsiveness (pagination or virtualization). Baseline: everything renders at once |
| i18n | Flip to EN | Expected: EN. Baseline: Vietnamese-only |
| `U1–U11` | Master matrix | Record failures (U3 no error state, U5 tabs/search/warranty ✕, U7 tab row, U9 Vietnamese-only) |

### `/assets` → `src/frontend/views/AssetLibraryView.tsx` (wrapped in `ProtectedRoute`; `/library` → `/assets`)

| Check | How to verify | Expected |
| --- | --- | --- |
| Auth guard | Open `/assets` signed out | Redirect to `/auth/login`, and after signing in the user lands back on `/assets` (see critical flow (h)) |
| Redirect alias | Visit `/library` | Lands on `/assets` |
| Purchased files | Buy a digital product, then open `/assets` | The purchase appears with name, designer, verified badge, format, version, licence, purchase date, size, download count |
| Search | Search by file name and by designer | Filters correctly; the placeholder says "by name" but the matcher also uses designer — align copy or behaviour |
| Format filter | Click `Tất cả định dạng`, `STL`, `3MF`, `STEP` | Filters accordingly; the active chip is distinguishable |
| **Empty state** | Filter to a format with no files, then use an account with zero assets | Expected: an empty state with an explanation and a route to `/explore`. **Baseline: nothing at all is rendered** — a blank page under the filter row. Blocking for U2 |
| Preview | Click `Xem 3D` | Preview modal with the 3D model; closes via ✕ (has `aria-label="Đóng xem trước"`), the footer `Đóng`, `Esc` and backdrop click; body scroll locks; expected `role="dialog"` + focus trap (baseline: none) |
| Preview teardown | Open and close the preview 5 times | One WebGL context at a time; no context-loss or leak warnings in the console |
| Download | Click `Tải Về Ngay` and `Tải Tập Tin {format}` | Expected: a real file download (signed URL or blob), a real increment of the download counter, and the licence terms shown/accepted. **Baseline: a toast only** — no file URL, no blob, the counter never increments, and the licence field is never rendered |
| Entitlement | Sign in as a user who did not buy a `Personal`-licence asset | Expected: blocked or clearly gated. Baseline: `ProtectedRoute` is the only gate — any signed-in user can "download" every asset |
| Ownership claim | Read the header copy `Tất cả các file 3D … đã sở hữu bản quyền` | The claim must be true of the rendered data, or the copy must change |
| Update badge | Find an asset with `hasUpdate` | Expected: a changelog or an update action behind `Update v2`. Baseline: badge only |
| Go to quote | Click `Báo Giá Gia Công` | `/quote` |
| i18n | Flip to EN | Expected: EN (baseline: Vietnamese-only) |
| `U1–U11` | Master matrix | Record failures (U2 no empty state, U3 no error state, U9 Vietnamese-only, U10 download counter) |

### `/designer` → `src/frontend/views/DesignerDashboardView.tsx` (RoleGuard `designer` | `admin`)

| Check | How to verify | Expected |
| --- | --- | --- |
| Signed out | Open `/designer` signed out | `/auth/login`. Baseline: `RoleGuard` returns `<Navigate to="/auth/login" replace>` with **no** `redirectTo`, so after signing in the user does not come back to `/designer` |
| Wrong role (customer) | Open `/designer` as a customer | The 403 card: `403 • ACCESS RESTRICTED`, `Yêu cầu quyền truy cập …`, the current account/role line, the allowed-roles list, `Chuyển Vai Trò (Demo)` (opens the role picker) and `Về Trang Chủ` → `/` |
| Designer and admin | Open as `designer`, then as `admin` | Both are admitted |
| Tabs | Click all five: `Tổng Quan & Doanh Thu`, `Quản Lý Ấn Phẩm & Giá (N)`, `Đăng Tải & Cấu Hình Mới`, `Yêu Cầu CAD & Chat (N)`, `Quyết Toán Tiền Mặt` | Each panel renders; the counts in the labels are accurate; the active tab is marked |
| Tab keyboard | Tab through the tab strip and activate with `Enter`/`Space`; move with arrows | Expected: tablist semantics with `aria-selected`. Baseline: plain `<button>`s with a colour-only active state |
| Overview | Read the overview panel and follow its deep links (which call `setActiveTab('requests')` / `('wizard')`) | Links switch to the right tab |
| **Hardcoded KPIs (blocking)** | Read the four overview KPI cards | Expected: real figures derived from orders/products. Baseline: `1.842`, `529`, `99.2%`, `★ 99.2% đạt chuẩn` are hardcoded strings — they never change with data |
| Create a product | `Đăng Tải & Cấu Hình Mới`: stepper `1 TẢI FILE 3D` → `2 XEM 3D & THÔNG SỐ` → `3 ĐỊNH GIÁ & XUẤT BẢN`; add a file, identity fields, tags, licence radio, prices | Each step works. Verify the stepper never starts mid-flow (baseline: the initial step state is **2**, and steps 2 and 3 render the same form), that the tag input adds on `Enter` and removes on `✕`, and that `Tự động tính theo BOM Inkiri` fills plausible numbers |
| Publish | Click `XUẤT BẢN VÀO CATALOG` | Expected: a real save with success/error feedback. Baseline: an 800 ms `setTimeout` fake submit; verify whether a product is actually created in state/DB and that a failure surfaces |
| Validation | Submit the wizard with required fields missing | Blocked with clear, localized, inline messages and focus moved to the first invalid field |
| Edit product | `Quản Lý Ấn Phẩm & Giá`: edit name/SKU/category/licence/status/prices; check the 90%/10% previews | Saved with a success toast; the storefront reflects it. Baseline: the save always toasts success even if the `onUpdateProduct` callback is missing |
| Status casing clash | Set a status here (`Published`/`Draft`/`Under Review`) and compare with the same product in `/admin/products` (`published`/`draft`/`archived`) | Expected: one canonical set of values. Baseline: the two surfaces write different casings to the same field, so the designer's status filter can miss admin-set rows |
| Delete product | Delete a product | `window.confirm` first, then the product disappears everywhere |
| View 3D | Click `Xem 3D` on a row | Viewer modal opens; `Esc`/✕ close it; one WebGL context at a time |
| Requests | Open `Yêu Cầu CAD & Chat`, select a conversation, send a message, click `Gửi Báo Giá CAD` | Thread renders and replies; the quote writes a fixed `650000` and sets status `Quoted`. Verify this is intentional and that it persists (baseline: mock arrays, nothing persisted) |
| Payouts | `Quyết Toán Tiền Mặt`: read the balance, click `Yêu Cầu Rút Tiền Về Ngân Hàng`, enter an amount, `Xác Nhận Rút` | Expected: a pending request that survives a reload. Baseline: the transaction is instantly `COMPLETED`, the balance is reduced in local state only, and **a reload restores the old balance**; `Number(amount) || 10000000` silently substitutes a default for an invalid amount |
| "Mine" filter | Use the `mine` author filter as different designers | Correct filtering. Baseline: it string-matches designer names containing `'bạn'|'thắng'|'alexei'` — brittle and wrong for real data |
| 390px | 390px: tab strip, 7-column models table, 5-column payouts table, the requests 3-column layout, the `max-w-2xl` modals | Tables scroll inside `.responsive-table-wrapper`; the requests layout must degrade to a single column (baseline: ~700 px tall 3-column layout, with the Project Brief only behind an info toggle); modals must fit |
| `U1–U11` | Master matrix | Record failures (U5 icon-only controls, U7 wide tables, U9 mixed VI/EN copy, U10 hardcoded KPIs; U3 no error state for save/publish failures) |

### `/designer/:tab` → same view

| Check | How to verify | Expected |
| --- | --- | --- |
| **Tab param respected (blocking)** | Open `/designer/payouts` and `/designer/models` | Expected: the matching tab is active on first paint, and the URL stays in sync when the tab changes. **Baseline: the `:tab` segment is ignored** — `DesignerDashboardView` never calls `useParams`, so `/designer/payouts` renders the **overview** tab while the URL claims otherwise, and clicking tabs never updates the URL |
| Unknown tab | `/designer/not-a-tab` | Falls back to overview **and** normalizes the URL, or shows a not-found. Baseline: falls back silently with a misleading URL |
| Deep link + refresh | Open `/designer/wizard` directly, then F5 | Lands on the wizard both times |
| Guard interaction | Open `/designer/payouts` as a customer | The 403 card (not an empty tab) |
| `U1–U11` | Master matrix | As per `/designer` |

### `/admin` → `src/frontend/views/AdminDashboardView.tsx` (RoleGuard `admin`)

| Check | How to verify | Expected |
| --- | --- | --- |
| Signed out | Open `/admin` signed out | `/auth/login` (and, once fixed, return here after login) |
| Non-admin | Open `/admin` as designer/customer | The 403 card; `Chuyển Vai Trò (Demo)` opens the role picker |
| Weak-role honesty | Note that demo logins can grant admin client-side (`DEMO_ACCOUNTS` in `AuthContext`; `vcube_active_local_user` rehydrates without a Supabase session) | QA must verify this against a **production build** with real Supabase auth: client-trusted RBAC must not be the only gate for admin data |
| **Valid section slugs** | Open each of the 22 valid `:section` values directly | All valid: `overview`, `group0-overview`, `workshops`, `partners`, `machines`, `designers`, `users`, `customers`, `pricing`, `pricing-engine`, `pricing-setup`, `cost-rules`, `materials`, `hardware`, `quote-calc`, `queue`, `orders`, `inventory`, `products`, `storefront`, `seo`, `settings` (`AdminDashboardView.tsx` L113–121) |
| Sidebar completeness | Compare the 16 sidebar entries with the 22 valid slugs | Expected: every valid section is reachable from the UI. Baseline: `group0-overview`, `workshops`, `customers`, `pricing-engine`, `pricing-setup`, `cost-rules` are **URL-only** with no sidebar entry — reachable only by typing the URL |
| Default section | Open `/admin` | `overview` panel + breadcrumb `GROUP 0: TỔNG QUAN ĐIỀU HÀNH` / `Bảng Điều Khiển Trung Tâm` |
| Sidebar navigation | Click every sidebar entry (`overview`, `partners`, `machines`, `designers`, `users`, `pricing`, `materials`, `hardware`, `quote-calc`, `queue`, `orders`, `inventory`, `products`, `storefront`, `seo`, `settings`) | Each renders its panel and updates the URL to `/admin/<section>`. Sidebar labels (VI): `Tổng Quan Điều Hành`, `Mạng Lưới Xưởng In MES`, `Đội Máy In 3D (Fleet)`, `Nhà Thiết Kế & Bản Quyền`, `Khách Hàng & Hồ Sơ KYC`, `Công Thức Giá Inkiri v3.4`, `Danh Mục Nhựa & Resin`, `Phụ Kiện, Ốc Cấy & Nam Châm`, `Báo Giá Dự Toán BOM`, `Hàng Đợi & Kanban 8 Nấc`, `Đơn Hàng & Điều Phối Hub`, `Kho Vật Liệu & Vị Trí Kệ`, `Sản Phẩm & Catalog 3D`, `Landing Page & CMS`, `Quản Trị SEO & Metadata`, `Cài Đặt Xưởng & Cloud` |
| Sidebar search | Type an unmatched query in the admin nav search | Expected: a clear "no sections match" message, not a silently empty list. Baseline: filtering can empty the list with no explanation |
| Sidebar collapse | Collapse the sidebar, then reload | Expected: the collapse state persists. Baseline: it is local state and resets on reload |
| **Sub-route → tab desync (blocking)** | Open `/admin/machines`, `/admin/orders`, `/admin/inventory`, `/admin/users` and read the breadcrumb against the visible tab | Expected: the breadcrumb and the visible panel/tab agree. Baseline: `workshops|partners|machines` all mount Group1 with the internal tab forced to `workshops` (so `/admin/machines` shows the **Workshops** tab under a "3D Printer Fleet" breadcrumb); `queue|orders|inventory` all mount Group5 with the tab forced to `kanban` (so `/admin/orders` and `/admin/inventory` show the **Kanban**); `users|customers` both show the `customers` tab |
| **Group4 sub-tab stickiness** | Open `/admin/materials`, then navigate to `/admin/hardware` | Expected: the sub-tab follows the section. Baseline: `pricing|pricing-engine|pricing-setup|cost-rules|materials|hardware|quote-calc` share one `PricingConfigPanel` instance, so `initialSubTab` is ignored after the first mount and the panel stays on the previous sub-tab. A full reload **does** honour the deep link — record both behaviours |
| Pricing sub-tabs | In Group4 click all six: `1. Công Thức Tính Giá`, `2. Nhựa In & Resin`, `3. Đội Máy In`, `4. Phụ Kiện & Đóng Gói`, `5. Kho & Vị Trí Kệ`, `6. Dự Toán BOM Kỹ Thuật` | Each renders; changes persist across sub-tab switches |
| **Unsaved-form warning** | Edit a value in `storefront`, `settings` or any Group1–5 form, then switch sections without saving | Expected: a dirty-state warning or preserved edits. Baseline: the section change unmounts the panel and **every unsaved draft is lost silently** — only a `isSaved` label hints at state |
| Overview panel | `/admin/overview`: switch timeframe `today` / `week` / `month` / `quarter`; read KPIs, cost-pillar bars, alerts | Figures change with the timeframe. **Baseline bug:** only a today-vs-else branch exists, so week/quarter reuse the month figure. Dismissing an alert works; the queue/machines shortcuts navigate |
| Workshops (Group1) | `/admin/workshops` or `/admin/partners`: search + region/status filters; `Thêm Xưởng In Mới` (name/address/phone/email); approve/suspend a hub | Create/edit works; approve/suspend takes effect. **Baseline: approve and suspend have no confirmation** |
| Printer fleet | `/admin/machines`: toggle `Free`/`Busy`, toggle `Maintenance`, add a machine | Toggles persist. **Baseline: no confirmation on any status toggle** |
| Materials stock | `/admin/materials`: press `−500g` / `+1000g` inline | Stock changes and the low-stock badge updates. **Baseline: no confirmation, and no lower-bound guard at 0** |
| Designers (Group2) | `/admin/designers`: tier/status filters; edit tier + royalty cap; withdrawal approve/transfer/reject with a tx ref; analytics | Each works and persists. **Baseline: withdrawal approve/transfer/reject have no confirmation** — a money action with no guard |
| Users (Group3) | `/admin/users`: role tabs (all/customer/designer/lab/admin), KYC/status filters, lock/unlock, role change, KYC approve/reject, `Đồng Bộ DB` | Each works. **Baseline: NDA approve and RFQ quote have no confirmation; `Đồng Bộ DB` (`seedService.seedAllToSupabase`) rewrites all `vcube_*` localStorage keys *and* Supabase — treat it as destructive and confirm the intent before running it in QA** |
| Pricing formula | In `1. Công Thức Tính Giá`: add/remove volume-discount tiers, run the BOM simulator (weight/hours/qty/markup), press `Reset` | Tier add/remove (`✕` has `title="Xóa mốc"`) works; the simulator's output matches the formula; `Reset` asks `window.confirm` (`Khôi phục công thức tính giá về thông số chuẩn ban đầu của Inkiri?`) |
| Materials/printers CRUD | In sub-tabs 2 and 3: add, edit, delete | Delete asks `window.confirm` (`Xóa vật liệu "<name>"?` / `Xóa máy in "<name>"?`); a min-1 guard toasts instead of deleting the last item; saving shows `Lưu Vật Liệu` / `Lưu Máy In` and `Đã Lưu Cấu Hình` |
| Quote → effect | Change a pricing coefficient, reload `/quote`, re-run a quote | The price changes by the expected amount (this is the end-to-end check that admin pricing is wired to the quote engine) |
| Queue/Orders/Inventory (Group5) | `/admin/queue`: advance and regress a card through the 8 stages, `Xác Nhận Điều Phối Đơn Này`, open the job drawer and save notes, `Reset` mock data, search + region filter | Stage moves persist and are reflected on `/tracking/<id>`/`/orders`; the job notes save (`Lưu Ghi Chú`). **Baseline: advance/regress/dispatch/reset have no confirmation despite `Xác Nhận Xong & Chuyển Nấc` wording** |
| Products panel | `/admin/products`: search + category + readiness filters (`ready_to_print` / `missing_profile` / `cad_review_needed`), inline status select, `Edit`, `Thêm Sản Phẩm Mới`, delete | Filters work; status changes persist with a toast; edit saves; delete asks `Bạn có chắc chắn muốn xóa sản phẩm "<name>"?`. Baseline: `prod.pricePhysical.toLocaleString()` is unguarded — a malformed stored row would crash the table |
| Product delete rollback | Delete while offline | Error toast + the product is restored (`App.tsx` L739–758) |
| Storefront CMS | `/admin/storefront`: tabs `hero` / `announcement` / `workflow` / `estimator` / `facilities`; change announcement text+active, hero copy, shipping fee, free-ship threshold, addresses, hotline, email; `Lưu Thay Đổi Ngay` | Each change is visible on `/` (announcement bar, hero, footer) and on `/cart` + `/checkout` (fees). Confirm the Cart/Drawer/Checkout threshold divergence described above is resolved |
| SEO panel | `/admin/seo`: tabs `meta` / `serp` / `social` / `schema`, desktop+mobile preview, robots-index toggle, `Lưu Cấu Hình SEO` | Saves with `Đã Lưu SEO`; the corresponding public page's meta output reflects it (inspect the DOM — this is an SPA) |
| Settings panel | `/admin/settings`: 3 text inputs + 2 checkboxes + `Lưu Cài Đặt` | Save confirms with a toast. **Baseline: nothing is persisted** — the toast is the only effect; verify this is fixed |
| Cloud sync | Any admin section → the cloud-sync action | Progress state (`isCloudSyncing`) is visible; the result toast reports counts or errors; the button re-enables in a `finally` block |
| Toast type loss | Trigger a success and an error toast from admin | Expected: correct severity colours. Baseline: `AdminDashboardView`'s `onShowToast` is typed `(message: string) => void` and **drops the type**, so admin errors render as generic info toasts |
| Empty data | Point Supabase at an empty project / clear `vcube_*` | Panels render zero-states, not `NaN`, `undefined` or blank charts. Baseline: several figures are hardcoded (`1.842`, `529`, `99.2%`, `Lead time avg: 24h`) and divisions are guarded (`>0 ? … : 0`, `/ (n || 1)`), so verify which numbers are real |
| Status casing clash | Set a product's status here (`published`/`draft`/`archived`) and inspect it in `/designer` | Expected: one canonical set of values. Baseline: the designer writes `Published`/`Draft`/`Under Review` to the same field, so the two surfaces disagree |
| Dead panels (cleanup) | Confirm which panel components are actually mounted | Baseline orphans never imported anywhere in `src`: `AdminOrdersPanel`, `AdminProductionQueuePanel`, `AdminMachinesPanel`, `AdminMaterialsPanel`, `AdminPartnersPanel`, `AdminUsersPanel`, `AdminCostRulesPanel`, `AdminOverviewPanel` — they still contain `window.confirm` calls. Deleting them is a safe refactor win, but do not lose the confirmations when merging behaviour into the `groups/*` panels |
| Destructive-action audit | Every delete/toggle/save in admin | Consistent confirmation + undo/rollback. Baseline: `window.confirm` exists only for product delete, material delete, printer delete, formula reset and accessory delete; everything else (workshop approve/suspend, machine status, inline stock ±, withdrawals, NDA/RFQ, kanban advance/regress/dispatch/reset, publish toggles, storefront/SEO/settings saves) is unconfirmed |
| localStorage blast radius | Before running any admin destructive action, note the keys a QA run mutates | `vcube_products`, `vcube_orders`, `vcube_materials`, `vcube_printers`, `vcube_pricing_config`, `vcube_accessories`, `vcube_workshop_partners`, `vcube_site_content`, `vcube_app_users`, `vcube_last_cloud_sync`, `vcube_cart_store`, `vcube_language`, `vcube_active_local_user`, `vcube_guest_role`. `Đồng Bộ DB` overwrites all of them plus Supabase — snapshot first |
| 390px | 390px across every admin section | The sidebar becomes a fixed drawer with a mobile toggle + backdrop; 7–8 column tables (`AdminOrdersPanel`, `AdminProductsPanel`, `WarehouseInventoryPanel`, `AccessoriesManager`) scroll inside their wrappers; the Group5 kanban is a wide horizontal board; the page itself must not overflow (U7) |
| `U1–U11` | Master matrix | Record failures (U1 lazy `Suspense` skeleton, U5 `title`-only row actions, U7 wide tables, U9 mixed VI/EN) |

### `/admin/:section` → same view

| Check | How to verify | Expected |
| --- | --- | --- |
| Deep link per section | Open `/admin/queue`, `/admin/inventory`, `/admin/settings` directly | Correct panel + breadcrumb on first paint |
| URL ↔ state sync | Switch sections with the sidebar, then use browser Back/Forward | Expected: the panel follows the URL both ways. Baseline: `handleSelectSection` navigates and an effect syncs on `routeSection`, but an invalid section leaves URL and content divergent |
| **Unknown section** | `/admin/xyz` | Expected: 404 or a URL normalisation to `/admin/overview`. Baseline: `initialSec` falls back to `overview` (rendering `Group0OverviewPanel`), the sidebar highlights overview, and the URL still reads `/admin/xyz` — URL and content disagree (`AdminDashboardView.tsx` L123–125) |
| Case sensitivity | `/admin/Overview`, `/admin/QUEUE` | Falls back to overview consistently (no half-matched panel) |
| Guard + deep link | `/admin/inventory` as a non-admin | The 403 card, and the URL is not silently replaced by the overview panel |
| Refresh | F5 on `/admin/pricing` | Same section after reload (this is the case where the Group4 deep link **does** work) |
| `U1–U11` | Master matrix | As per `/admin` |

### `/auth/login` → `src/frontend/views/LoginView.tsx` (`/login` → redirect)

| Check | How to verify | Expected |
| --- | --- | --- |
| Redirect alias | Visit `/login` | Lands on `/auth/login` |
| Renders | Open `/auth/login` | Email/ID field, password field, remember-me, `Quên mật khẩu?`, submit, Google button, and a link to register |
| Empty submit | Submit with both fields empty | `Vui lòng nhập đầy đủ email và mật khẩu.` / `Please enter your email and password.` in the alert box; focus moves to the first invalid field |
| Email field type | Inspect the email input | Expected: `type="email"` (or documented as an account-id field) with `autocomplete="username"`. Baseline: `type="text"` with **no** `autocomplete`, so password managers and mobile email keyboards do not engage |
| Password toggle | Click the show/hide eye | Toggles visibility. Expected: keyboard reachable and named. Baseline: `tabIndex={-1}` **and** no `aria-label`/`title` — unreachable and unnamed (U4 + U5) |
| Autocomplete | Inspect the password input | Expected: `autocomplete="current-password"` (baseline: absent) |
| Remember me | Toggle the checkbox, submit, reload | Expected: it does something. Baseline: `useState(true)` is never read — a dead control that must be implemented or removed |
| Forgot password | Click `Quên mật khẩu?` | Expected: a real reset flow. Baseline: an `alert()` only (the `AuthModal` has a real `sendPasswordReset`, so the two surfaces disagree) |
| Invalid credentials | Submit a wrong password | A clear, localized error. Expected: a generic message that does not leak whether the account exists. Baseline: the raw provider `err.message` is surfaced |
| Provider error mapping | Trigger the failure path | Baseline defect: the error mapper tests **Firebase** codes (`auth/user-not-found`, `auth/wrong-password`, …) while the provider is Supabase, so all those branches are dead |
| Demo fallback | Use a fabricated email with a network failure | Expected: no login. Baseline risk: `AuthContext.signInWithEmail` falls back to `DEMO_ACCOUNTS` (`admin.forge@vcube.vn`, `creator.lethang@`, `mes.hoalac@`, `khachhang@`) with password `123456` or `Password123!@` on provider error — a demo bypass that grants a local admin profile. Verify this cannot happen in a production build |
| Google sign-in | Click `Đăng nhập với Google` | Loading feedback beyond "disabled" (baseline: none), then a real OAuth round trip. Baseline risk: `signInWithGoogle` never rejects — it swallows the error and fabricates `engineer.google@vcube.vn`, so a failed OAuth silently "signs in" a fake user |
| Success | Sign in with a valid account | Redirect to the intended destination, or `/` |
| **Login redirect (critical)** | See critical flow (h) | A protected destination must survive the login round trip via `?redirectTo=` |
| Register link | Click the register link | `/auth/register` |
| i18n | Flip to EN | Expected: EN including error and helper text (baseline: mixed) |
| `U1–U11` | Master matrix | Record failures (U4/U5 password toggle, U3 raw provider errors, U6 the eye button) |

### `/auth/register` → `src/frontend/views/RegisterView.tsx` (`/register` → redirect)

| Check | How to verify | Expected |
| --- | --- | --- |
| Redirect alias | Visit `/register` | Lands on `/auth/register` |
| Role selection | Click `Khách hàng`, `Thiết kế CAD`, `Xưởng in 3D` | The chosen role is visually marked and submitted; the created account has that role |
| Required fields | Submit with name/email/password empty | Clear localized messages; focus moves to the first invalid field. Baseline: `fullName` is only HTML-`required`, never JS-validated, and an empty value falls back to `email.split('@')[0]` |
| Password rules | Try a 5-character password | `Mật khẩu phải có ít nhất 6 ký tự.` / `Password must be at least 6 characters.` |
| Confirm mismatch | Enter two different passwords | `Mật khẩu xác nhận không khớp.` / `Passwords do not match.` plus inline red text; submit disabled |
| Strength meter | Type weak → medium → strong passwords | `YẾU` / `TRUNG BÌNH` / `MẠNH` with 1/2/3 bars. Expected: exposed to AT as text, not colour-only bars (baseline: colour-only divs, no ARIA) |
| Password toggle | Click the show/hide eyes | Expected: named and keyboard reachable. Baseline: `tabIndex={-1}`, no name — same defect as login |
| Terms | Untick the terms checkbox and submit | `Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.` / `Please accept terms of service.` |
| Terms links | Click `Điều khoản dịch vụ` and `Chính sách bảo mật` | Expected: real, focusable links to real documents. Baseline: styled `<span>`s with no `href` — not focusable |
| Pre-consent | Load the form and check the box state | Expected: unchecked by default (explicit consent). Baseline: pre-checked (`useState(true)`) |
| Duplicate email | Register an existing email | A clear, localized error |
| Success | Register successfully | Success banner `Tài khoản đã được tạo thành công! Đang chuyển hướng!`, then a redirect. Verify the target and that a double-submit cannot create two accounts |
| Google signup | Click the Google button | Real flow; the chosen role is respected (baseline: hardcoded `customer` in login, and the signup path skips the success banner and `onNavigate`) |
| Redirect param | Open `/auth/register?redirectTo=/assets` | Expected: honoured. Baseline: the register view ignores `redirectTo` entirely and always goes to `/` |
| `U1–U11` | Master matrix | Record failures (U4/U5 password toggles, U9 mixed copy) |

### `/lab` (planned — MES Hub workspace) → **not yet routed**

`/lab` does not exist in `src/App.tsx`; today it falls through to `*` → `NotFoundView`. The `lab` role exists (`UserAvatarMenu.tsx` links a lab user to `/admin/queue` and `/admin/machines`, the mobile drawer labels it `MES Hub`, and `Header.tsx` has a `lab` role badge), so the role currently has **no home route**.

| Check | How to verify | Expected (once `/lab` lands) |
| --- | --- | --- |
| Route exists | Visit `/lab` | The MES Hub workspace renders — no longer a 404 |
| Role guard | `/lab` as `lab`, `admin`, then `customer`/signed out | `lab` and `admin` admitted; others get the 403 card; signed out → `/auth/login` **with** a working return redirect |
| Lab avatar menu | Sign in as `lab`, open the avatar menu | Its items point at `/lab` (or `/lab/:section`), not into `/admin` |
| Nav entry | Header/mobile drawer as `lab` | A `MES Hub` nav item appears, is highlighted on `/lab`, and is absent for other roles |
| Sub-sections | Every `/lab/:section` if the route is parameterised | Deep links resolve, URL ↔ panel state stays in sync, and an unknown section does not silently render another panel (mirror the `/admin/:section` checks) |
| Dark theme | `/lab` in dark mode | Full coverage — this route is one of the three that must ship the dark theme (see Setup §4) |
| Realtime | Change an order stage in `/admin/queue` in another tab | The lab view updates (or has an explicit refresh) — it shows the same 8-stage MES pipeline as `OrderProgress` |
| Queue operations | Advance/assign a job from `/lab` | The change is reflected on `/tracking/<id>` and `/orders` for the customer, and the stage labels match `MES_PIPELINE_STAGES` |
| Destructive guards | Complete/reject/assign actions | Confirmations on anything irreversible (the admin equivalents currently lack them) |
| Mobile | 390px | A dense kanban/queue must not overflow the page; tap targets ≥48 px; assume touch + gloves on a shop floor |
| `U1–U11` | Master matrix | All eleven, with `U1`/`U3` especially important for a data-dense realtime screen |

### `*` (404) → `src/frontend/components/NotFoundView.tsx`

| Check | How to verify | Expected |
| --- | --- | --- |
| Renders | Visit `/nope` | `ERROR 404 • ROUTE NOT FOUND`, `Page Not Found`, explanatory copy, `Return Home` and `Marketplace` buttons |
| Both buttons | Click `Return Home`, then re-enter `/nope` and click `Marketplace` | `/` and `/explore` respectively |
| Nested paths | `/orders/abc`, `/products/a/b`, `/admin/x/y` | All reach 404 (they match no route) |
| Not for known routes | `/quote`, `/cart`, `/auth/login` | Never 404 |
| Header/footer present | Inspect the 404 | Full shell present; nav highlight does not falsely mark a section (`getCurrentScreenFromPath` returns `home` for unknown paths — verify this is intended) |
| i18n | Flip to EN | Both languages render (this view **is** bilingual — a good reference for the others) |
| Responsive | 390 / 768 / 1440 / 1920 | Centred card, buttons stack at 390, no overflow |
| Consequence check | For every route in `src/App.tsx`, load it directly and confirm it does **not** render the 404 | A silent fall-through here is how route regressions hide |
| `U1–U11` | Master matrix | Record failures |

---

## Critical flow walkthroughs

Execute these end-to-end, in order, in a **fresh browser profile** (or after clearing all `vcube_*` localStorage keys). Sign out before each flow unless the flow says otherwise. Record the exact click path you actually used and any deviation.

### (a) Guest instant quote → order → tracking

1. Fresh profile, signed **out**. Open `/`.
2. Drag a valid `.stl` onto the hero dropzone. *(Alt path: click the hero CTA `Báo Giá File 3D Tức Thì` and use the `/quote` dropzone.)*
3. Land on `/quote`. Confirm the analysis spinner, then a model with dimensions/volume/triangle count.
4. Configure: choose `Máy In Gia Công`, `Vật Liệu Kỹ Thuật`, infill, layer height, supports, and `Số lượng sản xuất` = 2.
5. Read `1. Ước Tính Hình Học Sơ Bộ`, then pick a `2. Báo Giá Chính Xác` package.
6. Click `Thêm Đơn Gia Công Vào Giỏ Hàng` → the cart drawer opens; note the line price.
7. Click `View Full Cart Details` → `/cart`; confirm the line price equals the quote price.
8. Click `TIẾN HÀNH THANH TOÁN` → `/checkout`. Confirm **no login wall**.
9. Fill every required field; pick `VietQR Ngân Hàng`; submit.
10. `/order-success/<id>`: confirm the order number, items, total and payment method.
11. Click `THEO DÕI CAMERA XƯỞNG IN 3D` → `/tracking/<id>`.
12. Copy the tracking token/order number, sign out, open `/tracking`, and look the order up with the number **plus** the phone/PIN.
13. **Pass conditions:** every price identical across `/quote` → drawer → `/cart` → `/checkout` → success; the tracking lookup returns *that* order only; no console errors; nothing asks for a password before the final step.

### (b) Promo code survives cart → checkout

1. Add a physical item and a digital item. Open `/cart`.
2. Apply `VCUBE10`; note the discount amount and the new total. *(Repeat once with `TECH3D` = flat −20,000 ₫.)*
3. Apply `NOPE` and confirm the error message — and that the valid discount is not left applied while an error shows.
4. Re-apply `VCUBE10`. Click `TIẾN HÀNH THANH TOÁN`.
5. **Pass conditions:** the discount line is present on `/checkout`, the total equals `/cart`'s total, and the created order's stored discount/VAT figures match. **This flow currently FAILS** — the promo is always dropped (see the `/cart` table). Also test the drawer path: apply a promo via `/cart`, then use the header cart drawer's checkout button — the promo must survive that path too.

### (c) Bad `/tracking/xxx` must never show another customer's order

1. Signed out, in a profile with no session state, open `/tracking/does-not-exist-123`.
2. **Pass conditions:** an explicit not-found state (with a route back to the lookup form and to `/orders`), **no** recipient name/phone/address, **no** payment line, **no** carrier code, no console error.
3. Repeat with `/tracking/ORD-2026-8801` truncated to `/tracking/ORD-892`, with a mixed-case id, and with an id belonging to a different account.
4. Repeat while signed in as a customer for an order that is not theirs.
5. Repeat the guest lookup form with an order number and an **empty** PIN/phone, and again with injection-shaped input (`' OR 1=1--`).
6. **Pass conditions:** all of the above are refused. Then, as a control, confirm a correct id **plus** the right credential still resolves the order.

### (d) A deliberately corrupt file must produce an honest error

1. Create `broken.stl` containing plain text (e.g. `this is not a mesh`), and `broken.3mf` containing random bytes.
2. Upload each on `/quote` (also try the Home hero dropzone).
3. Also upload a valid `.step`/`.stp` and note what is reported.
4. **Pass conditions:** an explicit parse error naming the file; no model in the viewport; no price and no add-to-cart; no success toast; no invented dimensions/volume/triangle count/hash. The offer is to retry or to contact support — nothing is fabricated.
5. Then confirm the reported SHA-256 (if shown) matches the real file hash.
6. **This flow currently FAILS hard.** The catch block fabricates a `[Phục hồi]` model (85×55×30 mm, 42.5 cm³, 14,200 triangles, `isWatertight: true`, score 92, fake SHA-256) and toasts `Đã tự động khởi tạo mô hình CAD phôi an toàn cho <file>`; `meshParser` separately substitutes a `BoxGeometry(85, 32, 60)` for an unparseable STL and reports `Watertight 100%` / score 94; and every `.step/.stp/.iges` silently becomes the same proxy solid. A customer can be quoted a price for a model that does not exist. Treat as a release blocker.

### (e) Changing the printer inside `/quote` must not lose the model

1. On `/quote`, upload a valid model and confirm it is visible.
2. Note the current stage/viewport state.
3. Change `Máy In Gia Công` to a machine with a **different** bed size.
4. Click `Đổi Sang Máy Khổ Lớn (420mm)`.
5. Change the printer back to the original.
6. **Pass conditions:** the model stays visible after every switch, the bed grid resizes, prices update, the selection sticks, and the `CẢNH BÁO: KÍCH THƯỚC VƯỢT KHỔ BÀN IN` banner appears/disappears correctly. **High-risk baseline:** the bed dimension is a dependency of the viewer's init effect whose cleanup detaches the model group while the geometry-build effect does not re-run — the model can silently vanish. Verify in the browser and check the console for WebGL/context warnings.
7. Also confirm the printer list reflects admin-managed printers (baseline: it is resolved from the static `PRINTER_PROFILES` constant, so an admin-added machine is ignored and an unknown id falls back to the first profile).

### (f) Upload a file, navigate away, come back (draft persistence)

1. On `/quote`, upload a model, set a material, infill, layer height, supports, quantity 5, and scale it to 150%.
2. Note the exact configuration and the displayed price.
3. Navigate to `/explore`, then to `/cart`, then use browser Back to return to `/quote`.
4. **Pass conditions:** the same file is still loaded with the same configuration and the same price — or, if drafts are intentionally not persisted, the user is warned before losing work.
5. **Baseline: this FAILS.** `/quote` writes nothing to localStorage; files/transform/slicer/quantity are component state, so the view resets to `SAMPLE_ANALYSIS_FILES[0]`. Confirm the failure, then re-run once draft persistence is implemented.
6. Repeat with a full page reload (F5) and with a hard navigation (pasting the URL into a new tab).
7. Also verify the related StrictMode hazard: drop a file via the Home hero dropzone (which passes it through `location.state.uploadedFile`) and confirm exactly **one** analysis/history row (baseline risk: double parse → duplicate rows).

### (g) Design-file purchase path on `/products/:id`

1. Open `/explore`, search for a product that has both a physical price and a digital price.
2. Click into `/products/<id>`.
3. Inspect the 3D canvas: rotate, zoom, use the ISO/TOP/FRONT/SIDE presets, the wireframe toggle, `Co Vừa Bàn`/auto-fit, fullscreen (exit with `Esc`), and the camera/thumbnail download.
4. Switch to `Gallery (N)`, step through the images, and switch back.
5. Click through the four tabs (overview, specs, verification, slicing profiles).
6. Click `Mua & Tải File CAD Ngay` (`Buy CAD License`). **Pass conditions:** exactly one cart line is added even if you double-click; the line records the digital price, licence type and file formats; the drawer opens.
7. Go to `/checkout` and complete the order.
8. **Pass conditions on `/order-success`:** the digital file is listed, and `Mở Kho Tệp CAD` → `/assets` contains it with its licence, version and purchase date (baseline: the licence is never rendered in the library).
9. On `/assets`, attempt the download. **Pass conditions:** a real file downloads, the download counter increments, the licence terms are shown, and a user who did not purchase the asset cannot download it.
10. Cross-check the digital price in the cart against `product.priceDigital` and against the page's displayed price (baseline: `ProductDetailView` mixes `isVi ? 'vi-VN' : 'en-US'` with hardcoded `'vi-VN'`).

### (h) Login redirect preserves the intended destination

1. Signed out, open a protected route directly: `/orders`, then `/assets`, then `/designer`, then `/admin/overview`.
2. **Pass conditions:** each redirects to `/auth/login` **with the intended destination encoded** (e.g. `?redirectTo=/assets` or router state), and after a successful login the user lands on that destination — not on `/`.
3. Repeat using the **modal** login path: from `/checkout` trigger the auth modal, sign in, and confirm the user continues the checkout rather than being dropped on `/`.
4. Repeat with Google sign-in (baseline: `redirectTo: window.location.origin`, so `?redirectTo` never survives the OAuth round trip).
5. Repeat with the wrong-role case: as a customer, open `/admin/overview`, click `Chuyển Vai Trò (Demo)`, switch to admin, and confirm the user ends up in the admin console.
6. Register a brand-new account from a protected-route redirect and confirm the destination survives (baseline: `RegisterView` ignores `redirectTo` entirely).
7. **Baseline:** `RoleGuard` passes no `redirectTo` at all, so the `/designer` and `/admin` destinations are always lost, and `LoginView` mixes `onNavigate(screen)` with `navigate(path)` for the same parameter — the email and Google paths behave differently. All four protected routes must behave identically after the fix.

---

## Accessibility spot checks

| Check | How to verify | Expected |
| --- | --- | --- |
| Header tab order | On `/`, press `Tab` repeatedly from the address bar | Order: brand → desktop nav items left-to-right → language group → search → cart → account/sign-in → hamburger (mobile only). No skipped or trapped region; the sticky header does not hide the focused element |
| Language group | Tab into the switcher | Both buttons reachable; the active one is announced as pressed/selected (baseline: `role="group"` + `aria-label` exist, but the active state is colour-only) |
| Header focus ring | Tab through the header | Every control shows a visible focus indicator with ≥3:1 contrast against its background. Baseline: `focus-visible:outline-none` is used on the brand, cart and search without a replacement ring in some cases — audit each |
| One modal tab order | Open the cart drawer, then the auth modal, then the quote's `Giá Vốn Xưởng` modal | Focus moves into the modal on open, cycles within it, and the background is inert to Tab |
| **Focus trap** | Open each modal and press `Tab` 15+ times | Focus never escapes to the page behind. **Baseline: no modal in the app traps focus** (`AuthModal`, `CartDrawer`, `ChatSupportModal`, `CadQuickViewModal`, the four `tool3d` portals, the warranty modal and the asset preview all fail this) |
| Escape to close | Press `Esc` in each modal/drawer | All close and return focus to the element that opened them. Baseline: the `tool3d` portals and `CartDrawer` do handle `Esc`; `AuthModal`, `ChatSupportModal`, `AssetLibraryView`'s preview and `MyOrdersView`'s warranty modal do **not** |
| Backdrop click | Click the dimmed backdrop of each overlay | Closes it. Baseline: most do; `ChatSupportModal`'s backdrop does **not** |
| Dialog semantics | Inspect every overlay | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (or `aria-label`). Baseline: **zero occurrences** of `role="dialog"`, `aria-modal`, `aria-expanded`, `aria-controls` or `aria-live` in the entire frontend — a systemic refactor item |
| Focus restoration | Close a modal opened by a button deep in a page | Focus returns to that trigger (baseline: focus is lost to `<body>`) |
| **Canvas alternative text** | Run a screen reader on `/`, `/products/:id`, `/quote`, `/personalize`, `/assets` preview | Each WebGL canvas has an accessible name/description (e.g. `role="img"` + `aria-label="Interactive 3D view of <model>, use arrow keys to rotate"`), plus a documented keyboard alternative for rotate/zoom. Baseline: **no canvas anywhere has an accessible name** (zero `role="img"`/canvas `aria-label`s) and orbit is mouse/touch-only — the 3D product is invisible and unusable to AT/keyboard users |
| Canvas keyboard path | Tab to a canvas, then try arrows/`+`/`-` | Either it is operable, or it is explicitly removed from the tab order with a described fallback (e.g. a linked image gallery). The gallery mode on `/products/:id` is the natural fallback |
| **`prefers-reduced-motion`** | Set OS/browser to reduce motion, then visit `/`, `/quote`, `/tracking`, and open a modal | Expected: no smooth route scrolling, no `animate-pulse`/`animate-ping` that pulses indefinitely, no modal zoom, no auto-rotating 3D, and the route change jumps instantly. Baseline: **zero `prefers-reduced-motion` handling in the repo** — `ScrollToTop` smooth-scrolls, `OrderProgress` pulses, the hero/quote canvases auto-rotate. (Note: the modals' `animate-in`/`zoom-in-95` classes are inert today because `tailwindcss-animate` is not installed — once animations are wired up, this check becomes live) |
| Reduced motion, long-running | With reduce-motion on, leave `/tracking` open for 30 s | No continuously moving indicator draws attention |
| Body-text contrast | DevTools contrast checker at 1440 and 390, light **and** dark: `#091426` on `#F8FAFC`/white, `#545F73` and `#64748B` on white, footer `#8590A6` on `#091426` | ≥4.5:1 for body text, ≥3:1 for large text (≥18.66 px bold or ≥24 px). Flag anything below |
| **Muted-text contrast** | Check the specific muted tokens: `#8590A6` (footer links, hints), `#94A3B8`, `#75777D` (search icon/labels), `text-slate-400`, `text-slate-500`, and the quote's `text-[#64748B]` | ≥4.5:1 where it is real content; ≥3:1 only for genuinely decorative text. These tokens are the most likely failures — measure each rather than eyeballing |
| UI-component contrast | Borders (`#CBD5E1`, `#545F73`), the progress-bar track, focus rings, the cart badge, the disabled COD radio, "out of stock" swatches | ≥3:1 against adjacent colours; every state is distinguishable without relying on colour alone (add icon/text) |
| Status-colour independence | Toasts, order status pills, the placeholder/error states, the stock badge | Each carries a text or icon cue in addition to colour |
| Placeholder contrast | Check every placeholder (`Nhập mã VCUBE10…`, search boxes, VAT placeholders) | Placeholders meet ≥4.5:1 or are supplemented by a persistent visible label. Baseline: most inputs have **no** `<label>`, relying on placeholders alone (also a WCAG 3.3.2 failure) |
| Form labels | Inspect `/checkout`, `/auth/*`, `/personalize`, `/quote` transforms | Every input, select and textarea has a programmatically associated `<label>` (or `aria-label`). Baseline: many use a sibling `<p>`/`<span>` with no `htmlFor`/`id` |
| Error announcement | Submit an invalid form | Errors are announced and tied to their fields (`aria-describedby` + `aria-invalid`) and focus moves to the first invalid field |
| Icon-button audit | Accessibility-tree pass over the header, drawer, `/quote` toolbar, cart steppers, filter chips, modal ✕s | Every icon-only control has an accessible name and is ≥48 px (U6). `title` alone is not sufficient. Baseline: the overwhelming majority use `title` only or nothing |
| Live regions | Trigger a toast, an order-status change and a cart update with a screen reader | Each is announced once, politely (or assertively for errors). Baseline: no live regions exist |
| Language attribute | Inspect `<html lang>` | Matches the active language (`vi`/`en`) and updates when the switcher is used |
| Zoom / reflow | Browser zoom 200% at 1280 and 400% at 390 | No loss of content or function; no two-dimensional scrolling for a single column of text |
| Touch-target audit | 390px: measure the hamburger, cart, avatar, qty steppers, filter chips, tab strips, modal ✕s, footer links | ≥48×48 px (see the 44 px baseline note in the universal matrix) |
| Skip link / landmarks | Load any page, press `Tab` once | Expected: a skip-to-content link and `<header>`/`<nav>`/`<main>`/`<footer>` landmarks with the main region focusable. Baseline: `<main>` exists in `App.tsx` but there is **no** skip link — verify landmarks are present and labelled |
| Heading order | Run an outline check on `/`, `/products/:id`, `/quote`, `/admin/overview` | One `<h1>` per page, no skipped levels. Baseline risk: views set their own headings, and the header brand is a `<button>` rather than an `<h1>` |

---

## Performance spot checks

Record the raw numbers, not just a pass/fail. Run each measurement three times (cold cache, then warm) and record the median. Use Lighthouse (DevTools → Lighthouse, Mobile preset) **and** a DevTools Performance recording where INP is involved.

| Check | How to verify | Expected / record |
| --- | --- | --- |
| **LCP** on `/` | Lighthouse mobile + Performance panel; also throttle to Slow 4G / 4× CPU | Record the LCP element (expected: the hero headline or hero image). Target < 2.5 s; investigate anything > 2.5 s. The hero renders a WebGL canvas — check whether it or a hero image is the LCP element |
| **CLS** on `/` | Lighthouse + Performance (Layout Shifts track) | Target < 0.1, ideally ~0. Record every shift source. Suspects: font swap, the announcement bar appearing after `siteContent` loads, the 3D canvas mounting at `h-[280px] sm:h-[320px]`, product cards before images resolve, and the lazy-route skeleton → real-view swap |
| **INP** on `/` | Record a Performance trace, then interact: click a category pill, type in the search box, click `Mua File CAD` | Target < 200 ms. Watch for main-thread blocking from product filtering over the full catalog, the 3D auto-rotate rAF loop, and the calculator's live recompute |
| **Total JS transferred on `/`** | DevTools → Network → filter JS, disable cache, hard reload | Record total transfer and total uncompressed size, plus the number of JS requests. Confirm `react-vendor` and `supabase-vendor` load, and that the lazy chunks for `/quote`, `/admin`, `/designer` are **not** requested |
| **three.js not in the first-paint bundle (blocking)** | On `/`: Network → search the requests for `three`; then Sources → Coverage / the bundle graph | **Expected: NO `three-vendor` chunk is requested and `three` is absent from the initially-loaded JS.** `vite.config.ts` defines `manualChunks: { 'three-vendor': ['three'] }` and `Tool3DView`/`AdminDashboardView`/`DesignerDashboardView` are `React.lazy`. Then verify the chunk **does** load when you first visit `/quote`, and is cached afterwards. Baseline violation risk: `HomeView` renders a WebGL hero and imports `ThreeModelViewer`, and `/products/:id` + `/personalize` import their viewers directly — so `three` very likely lands in the initial graph via `HomeView`. Measure it; if it fails, the hero viewer must be lazy/`IntersectionObserver`-gated. **Report the actual chunk list either way** |
| Same check on other routes | `/explore`, `/products/:id` | `/explore` should not need `three`; `/products/:id` necessarily loads it — record when it arrives and whether it blocks first paint |
| Lazy-route chunk check | First visit to `/quote`, `/admin`, `/designer` | Each fetches its own chunk plus `three-vendor`; confirm `PageSkeleton` covers the fetch and that a second visit is served from cache |
| Image weight | Network → Img filter on `/` and `/explore` | Sizes are reasonable; images are not full-resolution originals scaled down in CSS; `loading="lazy"` is used below the fold |
| WebGL cost | Performance panel on `/quote` with a loaded model, and on the `/` hero | Record GPU/frame time and whether rendering is demand-driven. `PersonalizeModelViewer3D` uses on-demand `requestRender` (good); the hero and `ThreeModelViewer` use a continuous auto-rotate rAF (watch idle CPU). Reduced motion must stop the loop |
| Memory / context leaks | Navigate `/` → `/products/:id` → `/quote` → back, five times; watch the Memory panel and the console for `Too many active WebGL contexts` | Contexts are released (`disposeHierarchy` / `WEBGL_lose_context`); no unbounded growth in detached nodes or listeners |
| Bundle budget | Compare the build output (`npm run build`) totals per phase | No regression phase-over-phase; record the numbers here so each phase has a comparable baseline |

---

## Reporting

Copy this block per refactor phase. Attach the evidence and commit it alongside the phase.

### Phase record

| Field | Value |
| --- | --- |
| Refactor phase | e.g. `Phase 1 — Unlock guest experience (agent_01 TASK 1.1–1.5)` |
| Commit / branch | |
| Tester | |
| Date | |
| Environment | WSL2 Ubuntu-24.04 · `npm run dev` · http://localhost:3000 · browser + version |
| Widths covered | 390 / 768 / 1024 / 1440 / 1920 |
| Languages covered | VI ☐ EN ☐ |
| Themes covered | Light ☐ Dark ☐ (dark only once `/quote`, `/admin`, `/lab` ship it) |

### Results table

| ID / Route | Check (short) | Result | Evidence (screenshot file, console output, trace) | Notes / follow-up issue |
| --- | --- | --- | --- | --- |
| G-01 | Header nav + active highlight | PASS / FAIL / BLOCKED | `qa/phase1/header-desktop-1440.png` | |
| G-07 | Hamburger `aria-expanded` | FAIL | `qa/phase1/hamburger-a11y.png` + DOM snippet | No `aria-expanded` on the toggle |
| `/quote` | Printer switch keeps the model | | `qa/phase1/quote-printer-switch.webm` + console | |
| Flow (c) | Bad tracking id | FAIL | `qa/phase1/tracking-bad-id.png` | Renders order `ORD-2026-8801` — blocker |
| U11 | Console clean | | pasted console output | |

**Result values:** `PASS` · `FAIL` · `BLOCKED` (cannot be executed — state why) · `N/A` (with a reason).

### Phase gate rules

| Rule | Detail |
| --- | --- |
| Every route visited | All routes in `src/App.tsx` plus `*`, at all five widths, in at least one language |
| Every row answered | No blank results. `BLOCKED` requires a stated reason |
| Console gate | Zero unexplained console errors on every route |
| Critical flows | All eight in `## Critical flow walkthroughs` executed; any FAIL is a release blocker |
| Evidence gate | Every FAIL has a screenshot or pasted console output named as `qa/<phase>/<route>-<check>.png` |
| Blocker list | A separate section at the top of the phase record listing every `FAIL` on a blocking item (bad tracking id, corrupt-file fabrication, hamburger a11y, empty/error states, promo loss) with an owner and a target phase |
| Regression note | Diff the results table against the previous phase and list newly FAILing rows |
