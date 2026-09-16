# VCUBE 3.0 Master Documentation Portal

> **Nền Tảng Chế Tạo Số & Chợ Bản Vẽ CAD 3D Công Nghiệp**  
> *Industrial Additive Manufacturing Network & Precision Engineering CAD Marketplace*

---

## 1. System Overview & Vision

**VCUBE** is an enterprise-grade digital manufacturing marketplace that bridges the gap between precision mechanical engineering, parametric 3D CAD design, and industrial additive manufacturing.

Unlike standard e-commerce platforms or casual 3D printing hubs, VCUBE functions as a decentralized digital manufacturing network connecting three critical stakeholders:
1. **Customers & Procurement Teams**: Industrial enterprises, robotics developers, and makers requiring certified 3D printed parts or native mechanical CAD files (STEP, STL, SLDPRT, 3MF).
2. **CAD Designers & Engineers**: Authors publishing intellectual property, defining parametric licensing terms (Standard, Commercial, Exclusive), and receiving on-demand royalties.
3. **Partner Fabrication Workshops**: Regional additive manufacturing facilities running industrial FDM, SLA, and SLS printer fleets under standardized quality metrics and SLA timelines.

---

## 2. Technology Stack & Architecture

VCUBE is architected as a high-performance Single Page Application (Vite SPA) emphasizing client-side geometric processing, WebGL 3D visualization, and real-time database synchronization.

```
+-----------------------------------------------------------------------------+
|                                CLIENT APPLICATION                           |
|  React 19  *  TypeScript 5.8  *  Tailwind CSS 4  *  react-router-dom v7     |
+-----------------------------------------------------------------------------+
|         PRESENTATION LAYER         |            CORE ENGINES LAYER          |
| - Modern SaaS Light Theme          | - Three.js 0.185 (WebGL 3D Viewer)     |
| - Dark Opt-In (user override)      | - WebAssembly CAD Kernel (OpenCASCADE) |
| - Accessible Design Tokens         | - Multi-Dimensional Pricing Engine     |
| - Dual Persona Buying Box          | - Finite State Machine (GPU Loss FSM)  |
+------------------------------------+----------------------------------------+
|                               STATE LAYER                                   |
| - Zustand 5 (Cart Store, UI Store, Workshop Store, Production Store)        |
| - Context Providers (AuthContext, LanguageContext, ThemeProvider)           |
+-----------------------------------------------------------------------------+
|                          DATA & NETWORKING LAYER                            |
| - Supabase JS Client (v2)          | - Supabase Realtime Channels           |
| - Database Services (Typed Mappers)| - Web Workers (cadParser.worker.ts)    |
+------------------------------------+----------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                               BACKEND (SUPABASE)                            |
|  PostgreSQL 15  *  31 Tables + 1 View  *  90 RLS + 6 Storage Policies       |
+-----------------------------------------------------------------------------+
```

### Core Technology Stack
- **Framework & Build**: React 19, Vite 6, TypeScript 5.8.
- **Styling & Tokens**: Tailwind CSS 4 with custom engineering design tokens (`docs/design/tokens.md`).
- **State Management**: Zustand 5 (`useCartStore`, `useUIStore`, `useWorkshopAdminStore`, `useProductionStore`).
- **Routing**: `react-router-dom` v7 with lazy loading (`React.lazy`) and route-level error boundaries (`RouteErrorBoundary`).
- **3D Graphics**: Three.js 0.185, WebGLRenderer, OrbitControls, BufferGeometry memory management.
- **WebAssembly CAD Kernel**: `occt-import-js` (OpenCASCADE) running inside `src/workers/cadParser.worker.ts` for native STEP/IGES B-Rep parsing.
- **Backend & Database**: Supabase PostgreSQL with 31 tables + 1 compatibility view (`pricing_config`), strict Row Level Security (RLS), and database-level role verification (`user_profiles.role`).

---

## 3. Master Documentation Index

The complete documentation system for VCUBE is organized into five modular domains:

### 3.1 Pages & Views Specifications (`docs/pages/`)
Comprehensive specifications covering component props, state machines, user flows, and error handling:
- [**Storefront & Quoting Engine Spec** (`docs/pages/storefront.md`)](./pages/storefront.md):
  * `HomeView.tsx` (`/`): Hero CAD dropzone, 3D Chassis WebGL viewer, 4 core services, catalog grid/table, material comparison matrix, Custom Idea RFQ form.
  * `ExploreView.tsx` (`/explore`): Multi-dimensional filtering, Dual CTA ("Đặt In 3D" vs. "Tải Tệp CAD"), bookmarks, lazy 3D thumbnails via the `useInViewport` hook.
  * `ProductDetailView.tsx` (`/products/:id`): Dual Persona Buying Box, 360° 3D inspector, material & color configurator, `MaterialTechnicalAdvisory` for high-performance polymers.
  * `Tool3DView.tsx` (`/quote`): Instant CAD quoting station, STEP/STL/OBJ/3MF parser, GPU Context Loss FSM, automated mesh repair, STL vs. 3MF comparison, instant B.O.M. breakdown.
  * `PersonalizeView.tsx` (`/personalize`): Part personalization, laser engraving text positioning, scaling factor.
  * `LoginView.tsx` & `RegisterView.tsx`: Supabase authentication, role routing, password strength analyzer.
- [**Customer Checkout & Fulfillment Spec** (`docs/pages/customer-checkout.md`)](./pages/customer-checkout.md):
  * `CartView.tsx` & `CartDrawer.tsx`: Physical parts vs. digital CAD license separation, dynamic shipping fee, free shipping progress threshold, VAT calculation.
  * `CheckoutView.tsx` (`/checkout`): PII privacy protection, VietQR / VNPAY / COD payment flows, corporate VAT invoice form, NDA confidentiality commitment.
  * `OrderSuccessView.tsx` (`/order-success/:id`): Post-purchase confirmation, guest access tokens, e-invoice modal trigger.
  * `OrderTrackingView.tsx` (`/tracking`): Security Definer RPC lookup, 8-step MES production pipeline (`OrderProgress.tsx`), layer print telemetry.
  * `MyOrdersView.tsx` (`/orders`): Order management, CAD download links, reorder workflow, tolerance warranty claim modal (`warrantyModal`).
  * `AssetLibraryView.tsx` (`/assets`): Personal CAD vault, 3D WebGL preview, secure signed download URLs (`cad-files` private bucket, 60s TTL).
  * `InvoiceModal.tsx`: Electronic GTGT VAT invoice complying with Vietnamese tax standards.
- [**ForgeControl Admin Console Spec** (`docs/pages/admin-portal.md`)](./pages/admin-portal.md):
  * `AdminDashboardView.tsx` (`/admin/*`): Dynamic URL section routing, collapsible shell, code-split sub-panels.
  * `Group0OverviewPanel.tsx`: Gross revenue, platform load, machine fleet telemetry.
  * `Group1WorkshopsPanel.tsx`: Regional workshop directory, partner KYC credential verification, platform printer fleet.
  * `Group2DesignersPanel.tsx`: Creator directory, model submissions, 70/30 royalty split calculations, payout review.
  * `Group3CustomersPanel.tsx`: Customer directory, lifetime value (LTV), corporate accounts, B2B NDA contracts.
  * `Group4PricingEnginePanel.tsx` & `PricingConfigPanel.tsx`: Formula parameters, base material rates, machine hourly operational rates, multiplier calibration.
  * `Group5ProductionPanel.tsx`: Real-time MES Kanban board, regional dispatcher (Bắc/Trung/Đông), workshop assignment.
  * CMS & SEO: `AdminProductsPanel.tsx`, `AdminStorefrontPanel.tsx`, `AdminSeoPanel.tsx`, `WarehouseInventoryPanel.tsx` (`/admin/inventory`), and `AccessoriesManager.tsx` (rendered inside `Group4PricingEnginePanel` under the `hardware`/`accessories` tab).
- [**Designer & Workshop Portals Spec** (`docs/pages/designer-workshop-portals.md`)](./pages/designer-workshop-portals.md):
  * `DesignerDashboardView.tsx` (`/designer/:tab`): Modular 5-tab creator studio (`DesignerOverviewTab`, `DesignerModelsManagerTab`, `DesignerUploadWizardTab`, `DesignerRequestsTab`, `DesignerPayoutsTab`).
  * `WorkshopSettingsView.tsx` (`/lab/:tab` & `/workshop/settings`): Subject-scoped MES operations (`queue`, `machines`, `materials`, `accessories`, `audit_trail`, `preferences`).
  * `WorkshopOnboardingWizard.tsx`: 4-step onboarding wizard for newly registered manufacturing partners.

### 3.2 System Architecture & Engineering Engines (`docs/architecture/`)
- [**System Overview & Architecture** (`docs/architecture/system-overview.md`)](./architecture/system-overview.md): Runtime bootstrapping (`index.html` $\rightarrow$ `main.tsx` $\rightarrow$ `App.tsx`), routing topology, ThemeProvider, and Zustand store architecture.
- [**3D CAD Processing Engine & WebGL Pipeline** (`docs/architecture/3d-cad-pipeline.md`)](./architecture/3d-cad-pipeline.md): Three.js 0.185, WebGL context lifecycle, Web Worker geometry parsing, OpenCASCADE WASM integration, and GPU memory disposal.
- [**Multidimensional Pricing Engine** (`docs/architecture/pricing-engine.md`)](./architecture/pricing-engine.md): Complete mathematical formulation of material density, machine depreciation, operator time, failure risk margins, VAT, and dynamic shipping.

### 3.3 Database, Security & Operations
- [**Database Schema Documentation** (`docs/database/schema.md`)](./database/schema.md): Complete documentation of the 31 Supabase tables + 1 compatibility view (`pricing_config`), foreign key constraints, indexes, and custom enums.
- [**Seeds & Migrations Guide** (`docs/database/seeds-and-migrations.md`)](./database/seeds-and-migrations.md): Migration sequence (`20260900`, `20260901`, `20261010`), admin bootstrapping, and seed data execution.
- [**Security & RLS Policies** (`docs/security/rls-policies.md`)](./security/rls-policies.md): Role-based access control, 90 hardened table policies (88 applied on a fresh baseline), 6 storage policies, and privilege escalation guards.
- [**RLS Operations Runbook** (`docs/security/rls-runbook.md`)](./security/rls-runbook.md): Production verification steps, database testing with anon keys, and security troubleshooting.
- [**Developer Setup & Deployment Runbook** (`docs/SETUP_RUNBOOK.md`)](./SETUP_RUNBOOK.md): Step-by-step developer onboarding, WSL2 configuration, automated quality gates, build commands, and production deployment instructions.

### 3.4 Design Specs & Historical Archive
- [**Design Tokens** (`docs/design/tokens.md`)](../design/tokens.md), [**Icon Map**](../design/icon-map.md), [**QA Checklist**](../design/qa-checklist.md), [**Data Honesty Rules**](../design/data-honesty.md), [**Research Brief**](../design/research-brief.md): design-system and honest-data specifications referenced by the architecture and page docs.
- [**Historical Archive** (`docs/archive/README.md`)](./archive/README.md): the superseded `docs/plans/**` refactor plan (39 files, SUPERSEDED banners). Historical reference only — its figures are stale.

---

## 4. Complete Application Route Map

| Path | Primary Component | Lazy Loaded | Role Guard | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `HomeView.tsx` | No | Public | High-conversion engineering showcase & CAD dropzone |
| `/explore` | `ExploreRoute` → `ExploreView.tsx` | No | Public | Searchable CAD catalog with multi-dimensional filtering |
| `/products/:productId` | `ProductDetailRoute` → `ProductDetailView.tsx` | No | Public | Technical PDP with Dual Persona buying box |
| `/personalize`, `/personalize/:productId` | `PersonalizeRoute` → `PersonalizeView.tsx` | No | Public | Laser engraving & part personalization studio |
| `/quote` (alias `/tool-3d`) | `Tool3DView.tsx` | Yes | Public | Instant 3D CAD analysis, repair, and quoting station |
| `/cart` | `CartView.tsx` | No | Public | Shopping cart separating physical parts from digital licenses |
| `/checkout` | `CheckoutView.tsx` | No | Public | Multi-step checkout with VietQR, VNPAY, COD, and VAT |
| `/order-success`, `/order-success/:orderId` | `OrderSuccessRoute` → `OrderSuccessView.tsx` | No | Public | Post-purchase confirmation and guest access tokens |
| `/tracking`, `/tracking/:orderId` | `OrderTrackingRoute` → `OrderTrackingView.tsx` | No | Public | RPC-secured real-time order and 8-stage MES tracking |
| `/orders` (alias `/my-orders`) | `MyOrdersView.tsx` | No | Authenticated (any role) | Order history, CAD downloads, and tolerance warranty claims |
| `/assets` (alias `/library`) | `AssetLibraryView.tsx` | No | Authenticated (any role) | Customer CAD vault with 60s signed download URLs |
| `/designer`, `/designer/:tab` (aliases `/creator`, `/creator/*`) | `DesignerDashboardShell` → `DesignerDashboardView.tsx` | Yes | `designer`, `admin` | Modular creator studio (Overview, Models, Wizard, Requests, Payouts) |
| `/lab`, `/lab/:tab` | `LabRoute` → `WorkshopOnboardingWizard.tsx` (pending) / `WorkshopSettingsView.tsx` (verified) | Yes | `lab`, `workshop`, `admin` | Workshop MES queue, machine fleet, and local rates |
| `/admin`, `/admin/:section` | `AdminDashboardView.tsx` | Yes | `admin` | ForgeControl platform administration and governance |
| `/auth/login` (alias `/login`) | `LoginView.tsx` | No | Public | User authentication and role-based redirect |
| `/auth/register` (alias `/register`)| `RegisterView.tsx` | No | Public | Account registration with password strength meter |
| `*` | `NotFoundView.tsx` | No | Public | Standard 404 handler with fallback navigation |

---

## 5. Data Flow & Service Integration Architecture

The following diagram illustrates how customer CAD requests flow from initial upload to workshop manufacturing dispatch:

```
[Customer Client]
       |
       | 1. Uploads .STEP / .STL file
       v
[src/workers/cadParser.worker.ts] (OpenCASCADE WebAssembly)
       |
       | 2. Computes Volume (cm³), Surface Area (cm²), Mesh Health
       v
[src/utils/pricingEngine.ts]
       |
       | 3. Applies Material Rate + Machine Rate + Failure Margin + VAT
       v
[CheckoutView.tsx]
       |
       | 4. Customer approves quote, checks out with VietQR / VNPAY
       v
[src/backend/services/orderService.ts]
       |
       | 5. Inserts into 'orders' & 'order_items' (Status: 'placed')
       v
[Supabase Database]
       |
       | 6. Realtime Channel triggers notification
       v
[Group5ProductionPanel.tsx / Regional Dispatcher]
       |
       | 7. Assigns order to nearest certified workshop hub
       v
[WorkshopSettingsView.tsx (/lab/queue)]
       |
       | 8. Workshop executes 8-stage MES production (Slicing -> Printing -> QC -> Shipping)
       v
[OrderTrackingView.tsx] (Customer receives live layer & stage updates)
```

---

## 6. Automated Quality Gates

Every code change committed to VCUBE must pass the mandatory automated gates. `AGENTS.md` §"Gate bổ sung" is the authoritative list; the table below mirrors the full local set.

| Gate Script | Execution Command | Purpose & Pass Criteria |
| :--- | :--- | :--- |
| **Typecheck** | `npm run lint` (`tsc --noEmit`) | Verifies strict TypeScript compliance with zero type errors |
| **Build Bundle** | `npm run build` | Verifies Vite production bundling with zero packaging errors |
| **Data Honesty** | `node scripts/check-fabricated.mjs` | Scans string literals & JSX text for fabricated claims (must report 0 violations) |
| **WCAG Contrast** | `node scripts/check-contrast.mjs` | Validates declared color-token contrast pairs (exit 0; some pairs are intentionally exempt) |
| **Contrast Combos** | `node scripts/check-contrast-combos.mjs` | Scans `.tsx` class strings for failing (text, background) combinations |
| **RLS Sources** | `node scripts/lint-rls-sources.mjs` | Audits all migrations for RLS anti-patterns R1–R7 |
| **RLS Migration** | `node scripts/lint-rls-migration.mjs` | Checks harden-migration allowlist consistency + R8/R9 |
| **SQL Syntax** | `node scripts/a8-sql-syntax-check.mjs` | Static syntax check of the 7 SQL files + `char`-column concat guard (error 42725) |
| **Icon Names** | `node scripts/check-icon-names.mjs` | Blocks `<Icon name>` glyphs missing from `iconMap` (silent fallback in production) |
| **Pricing Multiplier** | `node scripts/check-unitprice-multiplier.mjs` | Verifies unit price multiplier is used strictly for deriving cost/g |
| **DB Inspection** | `node scripts/inspect-db.mjs` | Compares row visibility via publishable vs. secret key |
| **RLS Live Check** | `node scripts/verify-rls.mjs [--writes]` | Verifies live RLS behavior with the anon key |

---

## 7. Engineering Glossary of Terms

- **B-Rep (Boundary Representation)**: A method for representing shapes using limits. STEP and IGES files store models as exact mathematical surfaces, unlike polygonal meshes.
- **Mesh / BufferGeometry**: A representation of a 3D shape composed of connected vertices, edges, and triangular faces used for WebGL rendering and 3D printing.
- **Watertight (Manifold)**: A 3D mesh geometry with no holes, self-intersections, or missing boundary edges, ensuring the interior volume is mathematically distinct from the exterior.
- **Slicing**: The computational process of translating a 3D digital model into 2D horizontal layer cross-sections and machine instructions (G-Code).
- **G-Code**: Numerical control programming language used to instruct 3D printers on nozzle paths, extrusion rates, temperatures, and speeds.
- **Infill**: The internal lattice structure printed inside a solid model (e.g. Gyroid, Honeycomb, Grid) to balance strength and weight.
- **FDM (Fused Deposition Modeling)**: Additive manufacturing technique that extrudes thermoplastic filaments (PLA, PETG, ABS, Nylon-CF) through a heated nozzle.
- **SLA (Stereolithography)**: Additive manufacturing process using an ultraviolet (UV) laser or LCD screen to selectively cure liquid photopolymer resin into solid plastic.
- **SLS (Selective Laser Sintering)**: Industrial additive technology that uses a laser to sinter powdered polymer particles (e.g. Nylon PA12) layer by layer into solid mechanical components.
- **PA12-CF**: Polyamide 12 (Nylon) composite reinforced with carbon fiber particles, offering extreme tensile strength, stiffness, and heat deflection resistance.
- **B.O.M. (Bill of Materials)**: Comprehensive breakdown of direct material, machine runtime, labor, and overhead costs required to manufacture a physical part.
- **MES (Manufacturing Execution System)**: Software system that tracks and documents the transformation of raw materials into finished goods in real time across the factory floor.
- **Row Level Security (RLS)**: PostgreSQL security mechanism ensuring queries and mutations are filtered and authorized at the database engine level based on authenticated session claims.
- **Digital CAD License**: Legal right to download, inspect, or manufacture proprietary 3D geometry files under defined intellectual property constraints.
