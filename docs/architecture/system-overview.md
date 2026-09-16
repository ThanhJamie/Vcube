# VCUBE 3.0 System Architecture & Platform Overview

> **Target Version**: VCUBE Platform Release 3.0  
> **Classification**: Production Core Architecture Specification  
> **Author**: Worker M1 — Architecture & CAD Engine Specialist  
> **Date**: September 2026  
> **Status**: APPROVED / ACTIVE

---

## 1. Executive Summary & Platform Philosophy

**VCUBE** is a specialized digital manufacturing marketplace and engineering CAD distribution platform. It unifies rapid on-demand 3D printing (FDM, SLA, SLS, SLM, MJF), instant WebGL 3D model inspection, parametric material configuration, and a Supabase-backed realtime manufacturing execution system (MES).

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   |                         REACT 19 SPA (Vite 6 Bundler)                         |   |
|   |  - Storefront Portal (Light-first)       - Quoting & Tool3D Cockpit (Light)   |   |
|   |  - Customer Order Tracking (Light)       - Admin ForgeControl Console (Light) |   |
|   |  - Designer CAD Studio (Light)          - Workshop Print Lab / MES Hub (Light)|   |
|   +---------------------------------------+---------------------------------------+   |
|                                           |                                           |
|       +-----------------------------------+-----------------------------------+       |
|       |                                                                       |       |
|       v                                                                       v       |
|  +------------------------------------+             +-----------------------------+   |
|  |       LOCAL APPLICATION STATE      |             |     WEBGL 3D CAD ENGINE     |   |
|  |  - Zustand Stores (Cart, UI, MES)  |             |  - Three.js 0.185 Scene     |   |
|  |  - React Context (Auth, Language)  |             |  - Web Worker CAD Parser    |   |
|  |  - ThemeProvider (Route Family)    |             |  - OpenCASCADE WASM Kernel  |   |
|  +-----------------+------------------+             +--------------+--------------+   |
|                    |                                               |                  |
+--------------------|-----------------------------------------------|------------------+
                     | HTTPS / WSS                                   | Shared Buffers
                     v                                               v
+---------------------------------------------------------------------------------------+
|                                  SUPABASE CLOUD INFRASTRUCTURE                        |
|                                                                                       |
|   +--------------------------+  +--------------------------+  +-------------------+   |
|   |     POSTGRESQL 15 DB     |  |      SUPABASE AUTH       |  | STORAGE BUCKETS   |   |
|   |  - 31 Tables + 1 View    |  |  - JWT & Session Engine  |  |  - product-images |   |
|   |  - 90 Hardened RLS Rules |  |  - Role Resolution via   |  |  - cad-files      |   |
|   |  - Realtime CDC PubSub   |  |    `public.user_profiles`|  |    (Authenticated)|   |
|   +--------------------------+  +--------------------------+  +-------------------+   |
+---------------------------------------------------------------------------------------+
```

### Core Architecture Invariants

1. **Vite SPA (No Next.js Runtime)**:
   The application is strictly a Client-Side Rendered (CSR) Single-Page Application managed by Vite 6. There is no Node.js/Next.js server runtime during runtime (`vercel.json` framework configuration: `vite`). Dead Next.js trees (`src/app/**`, `middleware.ts`, `server.ts`) are intentionally removed or excluded in `tsconfig.json`.
2. **Data Honesty Invariant (`docs/design/data-honesty.md`)**:
   Under no circumstances may client-side components fabricate metrics, tolerance numbers, manufacturing lead times, certifications, or coupon discounts. If a parameter is unconfigured or a geometry measurement fails, the system renders a transparent empty or unmeasured state (`null` / informative notice) rather than displaying simulated data.
3. **Database-Driven Role-Based Access Control (RBAC)**:
   Permissions are solely governed by PostgreSQL Row-Level Security (RLS) policies and `public.user_profiles.role`. Client heuristics (such as parsing email strings or spoofing `user_metadata`) are prohibited.
4. **Clean Backend/Frontend Boundary**:
   Frontend presentation components never invoke inline SQL or unmediated database queries. All data retrieval flows through services in `src/backend/supabase/` and `src/backend/services/`.

---

## 2. Codebase Structure & Layout

The project follows a modular directory layout segregating frontend UI, backend clients, analytical services, Web Workers, and database migrations:

```
/home/thanh/home/thanh/project/Vcube/
├── index.html                           # Single entry HTML with fonts and theme tokens
├── package.json                         # Dependencies (React 19, Three 0.185, Vite 6, Tailwind 4)
├── vite.config.ts                       # Vite build configuration & environment defines
├── tsconfig.json                        # Strict TypeScript 5.8 settings
├── src/
│   ├── main.tsx                         # Bootstrap entry point, error guards, settings warmup
│   ├── App.tsx                          # Root router, shell layout, global realtime subscriptions
│   ├── index.css                        # Tailwind CSS 4 theme variables and design tokens
│   │
│   ├── frontend/                        # Presentation & User Experience Layer
│   │   ├── components/                  # Reusable UI widgets & domain components
│   │   │   ├── Header.tsx               # Primary storefront navigation & role switcher
│   │   │   ├── CartDrawer.tsx           # Slide-out interactive shopping drawer
│   │   │   ├── AuthModal.tsx            # Multi-mode authentication dialog
│   │   │   ├── RoleGuard.tsx            # Route guard for RBAC protected views
│   │   │   ├── ThreeModelViewer.tsx     # Three.js 3D thumbnail & interactive preview
│   │   │   ├── CadQuickViewModal.tsx    # Instant CAD inspection & quick-buy modal
│   │   │   ├── RouteErrorBoundary.tsx   # Granular error boundary for route recovery
│   │   │   ├── admin/                   # Admin ForgeControl management panels
│   │   │   ├── designer/                # Modular 3D Creator Studio tabs
│   │   │   ├── onboarding/              # Workshop verification & onboarding wizards
│   │   │   ├── personalize/             # Parametric CAD customizer components
│   │   │   └── tool3d/                  # Industrial 3D inspection & slicing cockpit
│   │   │       ├── ModelViewer3D.tsx    # Full-featured 3D viewer (FSM, stencils, clipping)
│   │   │       ├── QuoteSummaryPanel.tsx# Detailed B.O.M breakdown & quotation viewer
│   │   │       └── UnifiedCadToolbar.tsx# 3D viewport manipulation toolbar
│   │   ├── context/                     # Shared React Contexts
│   │   │   ├── AuthContext.tsx          # Supabase Auth session & DB role resolver
│   │   │   └── LanguageContext.tsx      # Bilingual dictionary & dynamic admin claims
│   │   ├── hooks/                       # Custom React hooks (useInViewport, useSettings)
│   │   ├── stores/                      # Frontend Zustand stores (useCartStore, useUIStore)
│   │   ├── theme/                       # Design tokens & ThemeProvider implementation
│   │   │   ├── tokens.ts                # JavaScript color token reader & observer
│   │   │   └── ThemeProvider.tsx        # Theme coordinator (light-first default, dark opt-in)
│   │   ├── ui/                          # Design system atomic primitives (AppShell, Button, Icon)
│   │   └── views/                       # Top-level page views (Home, Explore, PDP, Cart, Admin)
│   │
│   ├── backend/                         # Data Access & Remote Services Layer
│   │   ├── supabase/
│   │   │   ├── client.ts                # Initialized Supabase browser client
│   │   │   ├── database.ts              # Database abstraction service (dbService)
│   │   │   ├── mappers.ts               # Row-to-Entity transformation mappers
│   │   │   └── seedService.ts           # Development seed synchronization
│   │   └── services/
│   │       ├── catalogService.ts        # Product catalog operations
│   │       ├── customDesignService.ts   # Custom CAD requests & quotes operations
│   │       ├── orderService.ts          # Order creation, status updates, tracking
│   │       ├── pricingService.ts        # Wrapper for core pricing engine calculations
│   │       ├── settingsService.ts       # Global settings cache & audit logger
│   │       └── workshopService.ts       # MES, machine fleet & workshop management
│   │
│   ├── stores/                          # Backend & Operations Zustand stores
│   │   ├── useProductionStore.ts        # Workshop manufacturing queue state
│   │   ├── useWorkshopAdminStore.ts     # Workshop admin and KYC profile state
│   │   ├── useDesignerAdminStore.ts     # Designer publishing and payout state
│   │   └── useCustomerAdminStore.ts     # Customer profile and NDA state
│   │
│   ├── utils/                           # Computational & Mathematical Utilities
│   │   ├── meshParser.ts                # Multi-format 3D geometry reader & defect checker
│   │   └── pricingEngine.ts             # Deterministic B.O.M pricing calculation engine
│   │
│   ├── workers/                         # Off-Thread Web Workers
│   │   └── cadParser.worker.ts          # WebAssembly CAD kernel (STEP/IGES) & binary STL worker
│   │
│   └── types/                           # Global TypeScript Interface Declarations
│       └── index.ts                     # Core domain contracts (Product, Order, Profile, etc.)
│
├── supabase/
│   ├── migrations/                      # Active Sequential PostgreSQL Migrations
│   │   ├── 20260900_rls_helpers.sql     # Database helper functions (`current_app_role`, `is_admin`)
│   │   ├── 20260901_baseline_schema.sql # 31 Tables + 1 view, enums, 49 indexes, 5 triggers, 2 buckets
│   │   └── 20261010_harden_rls.sql      # 90 table policies + 6 storage policies
│   └── scripts/                         # Database admin bootstrap scripts
│
├── scripts/                             # Quality Gate & Static Analysis Scripts
│   ├── check-unitprice-multiplier.mjs   # Enforces correct semantics of unit price derivation
│   ├── check-contrast.mjs               # WCAG contrast validation on theme tokens
│   ├── check-fabricated.mjs            # Detects fraudulent claims in UI strings
│   ├── lint-rls-sources.mjs             # Enforces RLS migration guidelines (R1-R7)
│   ├── lint-rls-migration.mjs           # Verifies allowlist and consistency in hardening SQL
│   └── verify-rls.mjs                   # Remote verification of RLS permissions using anon key
│
└── docs/                                # Technical & Architectural Documentation
    ├── architecture/                    # System overview, 3D pipeline, pricing engine
    ├── design/                          # Design tokens, icon maps, QA checklists (canonical specs)
    ├── plans/                           # ARCHIVED refactor plan (SUPERSEDED banners) — see archive/README.md
    ├── archive/                         # Historical-documentation index
    └── security/                        # RLS runbook and operational security guidelines
```

---

## 3. Application Lifecycle & Bootstrap Flow

The bootstrap pipeline starts from a lightweight HTML shell, initializes global error interceptors, fetches configuration asynchronously without blocking page rendering, and establishes the React component hierarchy:

```
+------------------+
|    index.html    |  Load viewport, CSS resets, preconnect Google Fonts, create #root
+--------+---------+
         |
         v
+------------------+  1. Suppress benign ResizeObserver loop notifications
|   src/main.tsx   |  2. Dispatch non-blocking bootstrapSettings() (cache hydration)
+--------+---------+  3. Mount React 19 createRoot into #root inside <StrictMode>
         |
         v
+------------------+
|   <BrowserRouter>|  Initialize HTML5 History API Routing Context (react-router-dom v7)
+--------+---------+
         |
         v
+------------------+  Resolve stored override (default 'light'); route does not change it;
| <RouteThemeSync> |  apply/remove 'dark' class on <html> documentElement
+--------+---------+
         |
         v
+------------------+  Listen to Supabase Auth state (getSession, onAuthStateChange);
|  <AuthProvider>  |  Resolve DB role via public.user_profiles.role (fail-closed)
+--------+---------+
         |
         v
+------------------+  Load active locale ('vi' | 'en'); inject dynamic claims
| <LanguageProvider>| from site_content / app_settings (empty-state safe)
+--------+---------+
         |
         v
+------------------+
|  <ScrollToTop>   |  Reset window scroll position on location.pathname change
+--------+---------+
         |
         v
+------------------+
|    <MainApp>     |  Mount Header, CartDrawer, AuthModal, RouteErrorBoundary,
+--------+---------+  Routes, and Storefront Footer
```

### Key Initialization Phases

1. **ResizeObserver Loop Error Suppression (`src/main.tsx`)**:
   High-frequency WebGL canvas resizing and layout adjustments can trigger benign browser warnings (`ResizeObserver loop completed with undelivered notifications`). `main.tsx` registers targeted event listeners (`window.addEventListener('error')` and `window.onerror`) to stop propagation of harmless ResizeObserver notices without muting critical application errors.
2. **Non-Blocking Settings Hydration (`bootstrapSettings()`)**:
   `main.tsx` triggers `bootstrapSettings()` asynchronously. This populates in-memory caches for four database tables:
   - `site_content` (Hero metrics, announcements, shipping fees, tolerance claims)
   - `app_settings` (Support hotline, contact emails, maintenance flags)
   - `pricing_global_settings` (VAT rate, electricity cost/kWh, labor rate/hour, marketplace commission)
   - `pricing_configs` (B.O.M formulas, slicing parameters, markup rates)
   Crucially, `bootstrapSettings()` is **not awaited at the top level**. The React application renders immediately, displaying skeletal placeholders until cache resolution finishes.
3. **Provider Tree Composition (`src/App.tsx`)**:
   `RouteThemeSync` encapsulates `ThemeProvider` inside `<BrowserRouter>` so that route changes detected by `useLocation().pathname` immediately synchronize theme styles without monkey-patching `window.history`.

---

## 4. Routing Architecture & Route Map

VCUBE 3.0 uses `react-router-dom` v7 for client-side navigation. Routes are categorized into five distinct tiers: Public Storefront, Public Transactional, Protected Customer, Role-Guarded Operating Consoles, and System Fallbacks.

### Route Inventory & Access Matrix

| Route Path | View / Component | Access Level | Theme | Role Constraints |
|---|---|---|---|---|
| `/` | `HomeView` | Public | Light | None |
| `/explore` | `ExploreRoute` -> `ExploreView` | Public | Light | None |
| `/products/:productId`| `ProductDetailRoute` -> `ProductDetailView` | Public | Light | None |
| `/personalize` | `PersonalizeRoute` -> `PersonalizeView` | Public | Light | None |
| `/personalize/:productId`| `PersonalizeRoute` -> `PersonalizeView` | Public | Light | None |
| `/quote` | `Tool3DView` (Code-split lazy) | Public | Light | None |
| `/cart` | `CartView` | Public | Light | None |
| `/checkout` | `CheckoutView` | Public | Light | None |
| `/order-success` | `OrderSuccessRoute` -> `OrderSuccessView` | Public | Light | None |
| `/order-success/:orderId`| `OrderSuccessRoute` -> `OrderSuccessView` | Public | Light | None |
| `/tracking` | `OrderTrackingRoute` -> `OrderTrackingView` | Public | Light | None |
| `/tracking/:orderId` | `OrderTrackingRoute` -> `OrderTrackingView` | Public | Light | None |
| `/orders` | `MyOrdersView` | Protected | Light | Authenticated (any role) |
| `/assets` | `AssetLibraryView` | Protected | Light | Authenticated (any role) |
| `/designer` | `DesignerDashboardShell` -> `DesignerDashboardView` (Code-split) | Role-Guarded | Light | `designer`, `admin` |
| `/designer/:tab` | `DesignerDashboardShell` -> `DesignerDashboardView` (Code-split) | Role-Guarded | Light | `designer`, `admin` |
| `/admin` | `AdminDashboardView` (Code-split) | Role-Guarded | Light | `admin` |
| `/admin/:section` | `AdminDashboardView` (Code-split) | Role-Guarded | Light | `admin` |
| `/lab` | `LabRoute` -> `WorkshopOnboardingWizard` / `WorkshopSettingsView` (Code-split) | Role-Guarded | Light | `lab`, `workshop`, `admin`|
| `/lab/:tab` | `LabRoute` -> `WorkshopOnboardingWizard` / `WorkshopSettingsView` (Code-split) | Role-Guarded | Light | `lab`, `workshop`, `admin`|
| `/auth/login` | `LoginView` | Public | Light | None |
| `/auth/register` | `RegisterView` | Public | Light | None |
| `*` | `NotFoundView` | Public | Light | Catch-all 404 |

### Legacy Route Redirects
For backwards compatibility with external links and prior releases, the router transparently redirects legacy endpoints:
- `/tool-3d` $\rightarrow$ `/quote`
- `/my-orders` $\rightarrow$ `/orders`
- `/library` $\rightarrow$ `/assets`
- `/creator`, `/creator/*` $\rightarrow$ `/designer`
- `/login` $\rightarrow$ `/auth/login`
- `/register` $\rightarrow$ `/auth/register`

### Route Protection Mechanics

#### 1. `<ProtectedRoute>`
Guards authenticated-only accounts (`/orders`, `/assets`). It checks `isLoggedIn` only — there is **no** role restriction, so any signed-in user (customer, designer, lab, admin) may open them.
```tsx
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return null; // Wait for Supabase session restoration to prevent deep-link redirect loops
  if (!isLoggedIn) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
};
```

#### 2. `<RoleGuard>`
Guards high-privilege technical consoles (`/admin`, `/designer`, `/lab`).
- Compares the resolved `userProfile.role` against the route's `allowedRoles` array.
- If unauthenticated, redirects to `/auth/login?redirectTo=<encoded current path+search>` (it does not render an inline auth prompt).
- If authenticated but holding an insufficient role (e.g., a `customer` trying to view `/admin`), renders an authorization refusal view explaining the missing permission and offering navigation back to the storefront.

#### 3. `<RouteErrorBoundary>`
Wraps `<Routes>` inside `<BrowserRouter>`. Using `resetKey={location.pathname}`, any uncaught rendering error or WebGL failure in a child view resets automatically when the user navigates away, preventing a single broken component from bricking the entire application.

---

## 5. Theme System & Styling Engine

VCUBE implements a light-first theme system using **Tailwind CSS 4** and semantic design tokens defined in `src/index.css` and `src/frontend/theme/tokens.ts`. A dark palette exists as an explicit user opt-in, not as a route family.

### Light-First Theme Model
1. **Light canvas everywhere (default)**:
   All routes — storefront (`/`, `/explore`, `/products/:productId`, `/cart`, `/checkout`) **and** the technical consoles (`/quote`, `/admin`, `/lab`, `/designer`) — default to light canvas backgrounds (`#F8FAFC`) with high-contrast dark typography (`#091426`).
2. **Dark opt-in (user override)**:
   The deep dark canvas (`#080D16`) is selected only when the user explicitly sets `localStorage['vcube_theme'] = 'dark'` via the theme control. It is never selected by route.

### Theme Resolution Logic

`DARK_ROUTE_PREFIXES` is intentionally empty (`src/frontend/theme/ThemeProvider.tsx:27`), so `isDarkRoute()` always returns `false` and route no longer influences the theme:

$$\text{ActiveTheme} = \begin{cases} 
\text{'dark'}, & \text{if } \text{localStorage['vcube\_theme']} = \text{'dark'} \\
\text{'light'}, & \text{otherwise (default, route-independent)}
\end{cases}$$

```tsx
// src/frontend/theme/ThemeProvider.tsx
export const DARK_ROUTE_PREFIXES: readonly string[] = [] as const;

export function resolveThemeMode(
  mode: ThemeMode | string | null | undefined, 
  pathname?: string | null
): ResolvedTheme {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return isDarkRoute(pathname) ? 'dark' : 'light';
}
```

### Dynamic Three.js Styling Bridge

CSS classes cannot be applied directly inside a WebGL canvas. When Three.js draws helper grids, bounding boxes, coordinate axes, and material highlights, it retrieves color values programmatically through `tokens.ts`:

- `readColorToken(name: string)`: Reads computed CSS variables (`getComputedStyle(document.documentElement).getPropertyValue('--color-' + name)`) with fallback to constant tables.
- `readColorNumber(name: string)`: Converts `#rrggbb` or `rgb()` tokens into integer hex numbers (`0xRRGGBB`) ready for `new THREE.Color(...)`.
- `subscribeTheme(callback: (isDark: boolean) => void)`: Uses a DOM `MutationObserver` on `document.documentElement` (`class` attribute) to notify Three.js renderers when the user toggles dark mode, instantly rebuilding scene materials without reloading the page.

---

## 6. State Management Architecture

State in VCUBE 3.0 is partitioned into three distinct tiers: Global Client Stores (Zustand), Operating Subsystem Stores (Zustand), and Foundational Contexts (React Context).

```
+---------------------------------------------------------------------------------+
|                             APPLICATION STATE MAP                               |
+---------------------------------------------------------------------------------+
|  ZUSTAND CLIENT STORES (Persistent / Client Cache)                             |
|  - useCartStore      : Cart line items, unified appliedDiscount, localStorage   |
|  - useUIStore        : Cart drawer open/close, Auth modal, toast notifications  |
+---------------------------------------------------------------------------------+
|  ZUSTAND OPERATIONS STORES (MES / Admin Cockpit)                                |
|  - useProductionStore    : Workshop job queue, machine status, print execution  |
|  - useWorkshopAdminStore : Workshop fleet, KYC documents, payout accounts       |
|  - useDesignerAdminStore : Model publishing, CAD metadata, royalties balance    |
|  - useCustomerAdminStore : Enterprise B2B profiles, NDAs, billing records       |
+---------------------------------------------------------------------------------+
|  REACT CONTEXTS (Core Session & Localization)                                   |
|  - AuthContext       : Supabase Auth session, resolveDbRole (fail-closed)       |
|  - LanguageContext   : Bilingual dictionary, dynamic admin claims resolution    |
|  - ThemeContext      : Light-first theme + dark opt-in coordination             |
+---------------------------------------------------------------------------------+
```

### 1. `useCartStore` (`src/frontend/stores/useCartStore.ts`)
- Manages items added to cart (both physical printed parts and digital CAD asset licenses).
- Holds `appliedDiscount` and `appliedPromoCode` as the **single source of truth** shared between the cart page, cart drawer, and checkout summary.
- Uses Zustand `persist` middleware with the storage key `vcube_cart_store`.

### 2. `useUIStore` (`src/frontend/stores/useUIStore.ts`)
- Coordinates global modals: `isCartDrawerOpen`, `isAuthModalOpen`, `isChatOpen`.
- Manages the toast notification queue (`toasts`).
- **Data Honesty Rule on Toasts**: Standard info/success toasts auto-dismiss after 4000ms. Error toasts (`type === 'error'`) **never auto-dismiss**; they persist until the user explicitly acknowledges and closes them.

### 3. `AuthContext` & Database-Backed Role Resolution (`src/frontend/context/AuthContext.tsx`)
- Interfaces with `@supabase/supabase-js`.
- Maintains active `session`, `user`, `profile`, and `role`.
- **Fail-Closed Role Resolution (`resolveDbRole`)**:
  Client-provided metadata and email usernames are untrusted. Upon authentication, `AuthContext` queries `public.user_profiles.role` using the user's UUID. If the record does not exist or the network request fails, the role strictly defaults to `customer`. Elevated roles (`admin`, `designer`, `lab`) are only granted when verified by the database:

```typescript
async function resolveDbRole(userId: string): Promise<UserRole | null> {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data?.role) return null;
    return data.role as UserRole;
  } catch {
    return null;
  }
}
```

### 4. `LanguageContext` (`src/frontend/context/LanguageContext.tsx`)
- Supports Vietnamese (`vi`) and English (`en`).
- **Hybrid Data Honesty Implementation**:
  - **Group A (Factual Claims)**: Manufacturing tolerance, lead times, standard certifications, support hotline. These are never hardcoded; they are read dynamically from `site_content` and `app_settings`. If unconfigured, they return empty strings (`''`) prompting components to hide the field cleanly.
  - **Group B (Marketing Text)**: Neutral, truthful descriptions without fabricated metrics.
  - **Group C (Non-existent campaigns)**: Empty by default to avoid phantom promotions.

---

## 7. Backend / Frontend Communication Layer

Communication between the frontend SPA and the Supabase backend is handled through dedicated services and realtime Change Data Capture (CDC) subscriptions.

```
+---------------------------------------------------------------------------------+
|                      BACKEND / FRONTEND COMMUNICATION FLOW                      |
+---------------------------------------------------------------------------------+
|                                                                                 |
|   Frontend Components / Views                                                   |
|       |                                                                         |
|       v                                                                         |
|   Service Layer                                                                 |
|   ├── dbService           -> Product catalog, site content, orders, reviews     |
|   ├── orderService        -> Order placement, checkout, tracking updates        |
|   ├── settingsService     -> In-memory cached settings & admin audit logs       |
|   ├── workshopService     -> Workshop fleet, machine allocations, KYC verification|
|   └── customDesignService -> Custom CAD RFQ submissions, quotes, chat           |
|       |                                                                         |
|       v                                                                         |
|   Data Transformation (mappers.ts)                                              |
|   - rowToProduct, rowToOrder, rowToWorkshop, rowToPrinter, etc.                 |
|   - Sanitizes snake_case DB columns into typed camelCase domain entities         |
|   - Nullable fields preserved (no synthetic values or fake defaults)            |
|       |                                                                         |
|       v                                                                         |
|   Supabase Client (src/backend/supabase/client.ts)                              |
|   - Uses VITE_SUPABASE_PUBLISHABLE_KEY (Safe for browser delivery)              |
|   - Never exposes SUPABASE_SECRET_KEY                                           |
|   - Evaluates PostgreSQL Row-Level Security (RLS) on every query                |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

### Realtime Multi-User Subscriptions (`src/App.tsx`)

To ensure catalogs, orders, and configuration remain synchronized across multiple clients and admin sessions, `App.tsx` establishes WebSocket subscriptions over Supabase Realtime channels:

```typescript
// Realtime Channel for Catalog Synchronization
const channel = supabase
  .channel('public:products')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'products' },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        setProducts((prev) => [rowToProduct(payload.new), ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
        );
      } else if (payload.eventType === 'DELETE') {
        setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
      }
    }
  )
  .subscribe();
```

Similarly, system-wide pricing modifications and announcements update via `subscribeSettings()`, ensuring that any changes made by administrators in ForgeControl immediately propagate to all connected customer tabs.
