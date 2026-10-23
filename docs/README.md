<!-- doc-meta: status=active; verified=2026-10-21; owner=thanh -->
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
| - Light-only UI (v3 "Soft Studio") | - Three.js 0.185 (WebGL 3D Viewer)     |
| - VI-only copy, accessible tokens  | - WebAssembly CAD Kernel (OpenCASCADE) |
| - 29 UI primitives (opt-in variants)| - Multi-Dimensional Pricing Engine     |
| - Dual Persona Buying Box          | - Finite State Machine (GPU Loss FSM)  |
+------------------------------------+----------------------------------------+
|                               STATE LAYER                                   |
| - Zustand 5 (src/frontend/stores: cart, UI, customer-admin, designer-admin,  |
|   production, workshop-admin) — src/stores đã xoá (Phase 3)                  |
| - Data hooks (useCatalogData/useSiteSettings/useOrdersData) + AuthContext    |
+-----------------------------------------------------------------------------+
|                          DATA & NETWORKING LAYER                            |
| - Supabase JS Client (v2)          | - Supabase Realtime Channels           |
| - Database Services (Typed Mappers)| - Web Workers (cadParser.worker.ts)    |
+------------------------------------+----------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                               BACKEND (SUPABASE)                            |
|  PostgreSQL 15  *  32 Tables + 2 Views  *  92 RLS + 7 Storage Policies      |
+-----------------------------------------------------------------------------+
```

### Core Technology Stack
- **Framework & Build**: React 19, Vite 6, TypeScript 5.8.
- **Styling & Tokens**: Tailwind CSS 4 with custom engineering design tokens (`docs/design/tokens.md`).
- **State Management**: Zustand 5 — 6 store ở `src/frontend/stores` (`useCartStore`, `useUIStore`, `useCustomerAdminStore`, `useDesignerAdminStore`, `useProductionStore`, `useWorkshopAdminStore`); data/realtime tách sang `src/frontend/hooks/` (Phase 3).
- **Routing**: `react-router-dom` v7 with lazy loading (`React.lazy`) and route-level error boundaries (`RouteErrorBoundary`).
- **3D Graphics**: Three.js 0.185, WebGLRenderer, OrbitControls, BufferGeometry memory management.
- **WebAssembly CAD Kernel**: `occt-import-js` (OpenCASCADE) running inside `src/workers/cadParser.worker.ts` for native STEP/IGES B-Rep parsing.
- **Backend & Database**: Supabase PostgreSQL with **32 tables + 2 views** (`pricing_config` — compatibility view, `security_invoker=true`; `open_design_requests` — designer/admin market view, `security_invoker=false`), strict Row Level Security (RLS: **92 table policies + 7 storage policies**, +1 `realtime.messages`), and database-level role verification (`user_profiles.role`).
- **Routing & code-splitting**: route table ở `src/frontend/routes/AppRoutes.tsx` (Phase 4d; `App.tsx` còn 343 dòng shell); 9 route không critical + 5 console route `React.lazy` trong **một** `React.Suspense`; `three-vendor` (531 kB) chỉ tải khi 3D viewer mount.

---

## 3. Master Documentation Index

The complete documentation system for VCUBE is organized into five modular domains:

### 3.1 Pages & Views Specifications (`docs/pages/`)
Comprehensive specifications covering component props, state machines, user flows, and error handling:
- [**Storefront & Quoting Engine Spec** (`docs/pages/storefront.md`)](./pages/storefront.md):
  * `HomeView.tsx` (`/`): Hero CAD dropzone, 3D Chassis WebGL viewer, 4 core services, paginated catalog grid/table, Custom Idea RFQ form.
  * `ExploreView.tsx` (`/explore`): Multi-dimensional filtering, "Quick 3D Inspect" modal + PDP quick-add CTA, bookmarks, lazy 3D thumbnails via the `useInViewport` hook.
  * `ProductDetailView.tsx` (`/products/:productId`): Dual Persona Buying Box, 360° 3D inspector, material & color configurator, `MaterialTechnicalAdvisory` for high-performance polymers.
  * `Tool3DView.tsx` (`/quote`): Instant CAD quoting station, STEP/STL/OBJ/3MF parser, GPU Context Loss FSM, automated mesh repair, STL vs. 3MF comparison, instant B.O.M. breakdown.
  * `PersonalizeView.tsx` (`/personalize`): Part personalization, laser engraving text positioning, scaling factor.
  * `LoginView.tsx` & `RegisterView.tsx`: Supabase authentication, role routing, password strength analyzer.
- [**Customer Checkout & Fulfillment Spec** (`docs/pages/customer-checkout.md`)](./pages/customer-checkout.md):
  * `CartView.tsx` & `CartDrawer.tsx`: Physical parts vs. digital CAD license separation, dynamic shipping fee, free shipping progress threshold, VAT calculation.
  * `CheckoutView.tsx` (`/checkout`): PII privacy protection, VietQR / VNPAY / COD payment methods (VNPAY is recorded as method only, no gateway redirect), corporate VAT invoice form, terms-acknowledgment line.
  * `OrderSuccessView.tsx` (`/order-success/:orderId`): Post-purchase confirmation, guest access tokens, e-invoice modal trigger.
  * `OrderTrackingView.tsx` (`/tracking`): Security Definer RPC lookup, 8-step MES production pipeline (`OrderProgress.tsx`), layer print telemetry.
  * `MyOrdersView.tsx` (`/orders`): Order management, reorder workflow (`/quote` + `reorderItems`), tolerance warranty claim modal (`warrantyModal`, not yet persisted).
  * `AssetLibraryView.tsx` (`/assets`): Personal CAD vault with illustrative preview; secure signed download URLs (`cad-files` private bucket, 60s TTL) require `order_files` rows, which are not yet written.
  * `InvoiceModal.tsx`: In-app VAT (GTGT) invoice document with print stylesheet; not tax-authority signed/e-invoiced.
- [**ForgeControl Admin Console Spec** (`docs/pages/admin-portal.md`)](./pages/admin-portal.md):
  * `AdminDashboardView.tsx` (`/admin/*`): Dynamic URL section routing, collapsible shell, code-split sub-panels.
  * `Group0OverviewPanel.tsx`: Gross revenue, platform load, machine fleet telemetry.
  * `Group1WorkshopsPanel.tsx`: Regional workshop directory, workshop status/KYC state, platform printer fleet.
  * `Group2DesignersPanel.tsx`: Creator directory, model submissions, per-designer `royaltyPercent` (default 10), badge tiers.
  * `Group3CustomersPanel.tsx`: Customer directory, KYC tab, corporate accounts, `customer_profiles.nda_signed` status.
  * `Group4PricingEnginePanel.tsx` & `PricingConfigPanel.tsx`: Formula parameters, base material rates, machine hourly operational rates, `unit_price_multiplier` derivation factor.
  * `Group5ProductionPanel.tsx`: Real-time MES Kanban board, regional dispatcher (Bắc/Trung/Nam), workshop assignment.
  * CMS & SEO: `AdminProductsPanel.tsx`, `AdminStorefrontPanel.tsx`, `AdminSeoPanel.tsx`, `WarehouseInventoryPanel.tsx` (`/admin/inventory`), and `AccessoriesManager.tsx` (rendered inside `Group4PricingEnginePanel` under the `accessories` sub-tab).
- [**Designer & Workshop Portals Spec** (`docs/pages/designer-workshop-portals.md`)](./pages/designer-workshop-portals.md):
  * `DesignerDashboardView.tsx` (`/designer/:tab`): Modular 5-tab creator studio (`DesignerOverviewTab`, `DesignerModelsManagerTab`, `DesignerUploadWizardTab`, `DesignerRequestsTab`, `DesignerPayoutsTab`).
  * `WorkshopSettingsView.tsx` (`/lab/:tab`): Subject-scoped MES operations (`queue`, `machines`, `materials`, `accessories`, `audit_trail`, `preferences`).
  * `WorkshopOnboardingWizard.tsx`: 4-step onboarding wizard for newly registered manufacturing partners.

### 3.2 System Architecture & Engineering Engines (`docs/architecture/`)
- [**System Overview & Architecture** (`docs/architecture/system-overview.md`)](./architecture/system-overview.md): Runtime bootstrapping (`index.html` $\rightarrow$ `main.tsx` $\rightarrow$ `App.tsx` shell 343 dòng $\rightarrow$ `src/frontend/routes/AppRoutes.tsx`), routing topology, data hooks, and Zustand store architecture.
- [**3D CAD Processing Engine & WebGL Pipeline** (`docs/architecture/3d-cad-pipeline.md`)](./architecture/3d-cad-pipeline.md): Three.js 0.185, WebGL context lifecycle, Web Worker geometry parsing, OpenCASCADE WASM integration, and GPU memory disposal.
- [**Multidimensional Pricing Engine** (`docs/architecture/pricing-engine.md`)](./architecture/pricing-engine.md): Complete mathematical formulation of material density, machine depreciation, operator time, failure risk margins, VAT, and dynamic shipping.

### 3.3 Database, Security & Operations
- [**Database Schema Documentation** (`docs/database/schema.md`)](./database/schema.md): Complete documentation of the **32 Supabase tables + 2 views**, foreign key constraints, indexes, RLS helpers, and custom enums.
- [**Seeds & Migrations Guide** (`docs/database/seeds-and-migrations.md`)](./database/seeds-and-migrations.md): Migration sequence (**12 files**: `20260900` … `20261013`), admin bootstrapping, and seed data execution.
- [**Security & RLS Policies** (`docs/security/rls-policies.md`)](./security/rls-policies.md): Role-based access control, **92 effective table policies** (2 `pricing_config` view policies skipped by design), **7 storage policies** (+1 `realtime.messages`), and privilege escalation guards.
- [**RLS Operations Runbook** (`docs/security/rls-runbook.md`)](./security/rls-runbook.md): Production verification steps, database testing with anon keys, and security troubleshooting.
- [**Developer Setup & Deployment Runbook** (`docs/SETUP_RUNBOOK.md`)](./SETUP_RUNBOOK.md): Step-by-step developer onboarding, WSL2 configuration, automated quality gates, build commands, and production deployment instructions.

### 3.4 Design Specs & Historical Archive
- [**Design Tokens** (`docs/design/tokens.md`)](./design/tokens.md), [**Icon Map**](./design/icon-map.md), [**QA Checklist**](./design/qa-checklist.md), [**Data Honesty Rules**](./design/data-honesty.md), [**Research Brief**](./design/research-brief.md), [**Taste Contract** (`docs/design/taste-contract.md`)](./design/taste-contract.md), [**UI Audit 2026-09** (`docs/design/ui-audit-2026-09.md`)](./design/ui-audit-2026-09.md): design-system and honest-data specifications referenced by the architecture and page docs.
- [**Task Area** (`docs/tasks/README.md`)](./tasks/README.md): in-force construction plans.
  - **Đợt tối ưu 2026-10 (canonical):** [**Optimization README** (`docs/tasks/optimization/README.md`)](./tasks/optimization/README.md) + [**PLAN** (`docs/tasks/optimization/PLAN.md`)](./tasks/optimization/PLAN.md) (phase/status/gate) · [**AUDIT** (`docs/tasks/optimization/AUDIT.md`)](./tasks/optimization/AUDIT.md) · [**04-refactor** (`docs/tasks/optimization/04-refactor.md`)](./tasks/optimization/04-refactor.md) · [**DEAD-CODE** (`docs/tasks/optimization/DEAD-CODE.md`)](./tasks/optimization/DEAD-CODE.md) · [**handoff/**](./tasks/optimization/handoff/) (bằng chứng từng phase).
  - **UI v3 "Soft Studio":** [**PLAN** (`docs/tasks/ui-redesign-v3/PLAN.md`)](./tasks/ui-redesign-v3/PLAN.md), [**DESIGN-LANGUAGE** (`docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md`)](./tasks/ui-redesign-v3/DESIGN-LANGUAGE.md), [**QA-REPORT** (`docs/tasks/ui-redesign-v3/QA-REPORT.md`)](./tasks/ui-redesign-v3/QA-REPORT.md) + [**handoff/**](./tasks/ui-redesign-v3/handoff/).
  - **Product review theo persona (2026-10-23):** [**README** (`docs/tasks/product-review/README.md`)](./tasks/product-review/README.md) · [**USER-PERSONAS**](./tasks/product-review/USER-PERSONAS.md) · [**FEATURE-MATRIX**](./tasks/product-review/FEATURE-MATRIX.md) · [**UX-ASSESSMENT**](./tasks/product-review/UX-ASSESSMENT.md) · `screens/` (33 ảnh 390/1440) — phát hiện 3 sợi dây dữ liệu còn thiếu: đơn của khách · giao file số · giao việc cho xưởng.
  - Drift cũ: [**Drift Remediation Plan** (`docs/tasks/DRIFT-REMEDIATION-PLAN.md`)](./tasks/DRIFT-REMEDIATION-PLAN.md) + [**Drift Task Board** (`docs/tasks/DRIFT-TASKS.md`)](./tasks/DRIFT-TASKS.md); [**Docs Issues Register** (`docs/tasks/DOCS-ISSUES.md`)](./tasks/DOCS-ISSUES.md) và [**Docs Review Backlog** (`docs/tasks/DOCS-REVIEW-BACKLOG.md`)](./tasks/DOCS-REVIEW-BACKLOG.md) (số liệu có thể cũ hơn bộ optimization).
- [**Historical Archive** (`docs/archive/README.md`)](./archive/README.md): the superseded `docs/plans/**` refactor plan (39 files, SUPERSEDED banners). Historical reference only — its figures are stale.

---

## 4. Complete Application Route Map

> Nguồn sự thật: `src/frontend/routes/AppRoutes.tsx` (Phase 4d). Bảng đầy đủ + hash sinh tự động:
> [`docs/pages/_routes.generated.md`](./pages/_routes.generated.md) — **30 route**, chạy
> `node scripts/gen-routes-doc.mjs` sau khi đổi route. Cột "Lazy" theo Phase 5a.

| Path | Primary Component | Lazy Loaded | Role Guard | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `HomeView.tsx` | No | Public | High-conversion engineering showcase & CAD dropzone |
| `/explore` | `ExploreRoute` → `ExploreView.tsx` | No | Public | Searchable CAD catalog with multi-dimensional filtering |
| `/products/:productId` | `ProductDetailRoute` → `ProductDetailView.tsx` | No | Public | Technical PDP with Dual Persona buying box |
| `/personalize`, `/personalize/:productId` | `PersonalizeRoute` → `PersonalizeView.tsx` | Yes | Public | Laser engraving & part personalization studio |
| `/quote` (alias `/tool-3d`) | `Tool3DView.tsx` | Yes | Public | Instant 3D CAD analysis, repair, and quoting station |
| `/cart` | `CartView.tsx` | Yes | Public | Shopping cart separating physical parts from digital licenses |
| `/checkout` | `CheckoutView.tsx` | Yes | Public | Multi-step checkout with VietQR, VNPAY, COD, and VAT |
| `/order-success`, `/order-success/:orderId` | `OrderSuccessRoute` → `OrderSuccessView.tsx` | Yes | Public | Post-purchase confirmation and guest access tokens |
| `/tracking`, `/tracking/:orderId` | `OrderTrackingRoute` → `OrderTrackingView.tsx` | Yes | Public | RPC-secured real-time order and 8-stage MES tracking |
| `/orders` (alias `/my-orders`) | `MyOrdersView.tsx` | Yes | Authenticated (any role) | Order history, CAD downloads, and tolerance warranty claims |
| `/assets` (alias `/library`) | `AssetLibraryView.tsx` | Yes | Authenticated (any role) | Customer CAD vault with 60s signed download URLs |
| `/designer`, `/designer/:tab` (aliases `/creator`, `/creator/*`) | `DesignerDashboardShell` → `DesignerDashboardView.tsx` | Yes | `designer`, `admin` | Modular creator studio (Overview, Models, Wizard, Requests, Payouts) |
| `/lab`, `/lab/:tab` | `LabRoute` → `WorkshopOnboardingWizard.tsx` (pending) / `WorkshopSettingsView.tsx` (verified) | Yes | `lab`, `workshop`, `admin` | Workshop MES queue, machine fleet, and local rates |
| `/admin`, `/admin/:section` | `AdminDashboardView.tsx` | Yes | `admin` | ForgeControl platform administration and governance |
| `/auth/login` (alias `/login`) | `LoginView.tsx` | Yes | Public | User authentication and role-based redirect |
| `/auth/register` (alias `/register`)| `RegisterView.tsx` | Yes | Public | Account registration with password strength meter |
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

Every code change committed to VCUBE must pass the mandatory automated gates. Run the aggregated gate runner instead of invoking scripts by hand:

```bash
npm run check
```

It executes the full manifest (typecheck, build, RLS linters, SQL syntax, data-honesty, contrast, icon, UI-rule and pricing checks, DB inspection, live RLS) and is the single source of truth. `AGENTS.md` §"Gate bổ sung" remains the authoritative human-readable description; do not hand-maintain a gate inventory here.

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
