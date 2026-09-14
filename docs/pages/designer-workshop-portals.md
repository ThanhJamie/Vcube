# VCUBE Specification: Designer Studio & Workshop MES Portals

## 1. System Scope & Portals Overview

This document specifies the professional operational portals for VCUBE's two core supply-side partners:
1. **Designer Studio (`/designer/*`)**: Creator workspace empowering 3D CAD designers to publish models, configure parametric licensing terms, inspect sales telemetry, and manage bespoke customer requests in real-time.
2. **VCUBE Lab & Workshop MES (`/lab/*` & `/workshop/settings`)**: Manufacturing Execution System (MES) designed for partner fabrication facilities to manage active print queues across the 8-step production lifecycle, configure printer fleets, manage local material stocks, and audit inventory consumption.

### Access Guards & Routing Table

| Route | Primary View | Access Guard | Chrome Layer | Sub-Tabs / Modules |
| :--- | :--- | :--- | :--- | :--- |
| `/designer` / `/designer/:tab` | `DesignerDashboardView.tsx` | Role: `designer`, `admin` | `DesignerDashboardShell` | `overview`, `models`, `wizard`, `requests`, `payouts` |
| `/lab` / `/lab/:tab` | `WorkshopSettingsView.tsx` | Role: `lab`, `workshop`, `admin` | `LabDashboardShell` | `queue`, `machines`, `materials`, `accessories`, `audit_trail`, `preferences` |
| `/lab` (Unverified / Pending) | `WorkshopOnboardingWizard.tsx` | Role: `lab`, `workshop` | `LabDashboardShell` | 4-step wizard: Facility info, Machine fleet declaration, Material rates, KYC credentials |

---

## 2. Designer Studio (`/designer/:tab`)

### 2.1 Architecture & Modular Design
Prior to the R6 optimization, `DesignerDashboardView.tsx` existed as a monolithic component exceeding 1,500 lines. It has been modularized into a lightweight routing shell (< 140 lines) delegating to 5 dedicated components inside `src/frontend/components/designer/`:

```
src/frontend/views/DesignerDashboardView.tsx (Routing Shell)
   ├── src/frontend/components/designer/DesignerOverviewTab.tsx
   ├── src/frontend/components/designer/DesignerModelsManagerTab.tsx
   ├── src/frontend/components/designer/DesignerUploadWizardTab.tsx
   ├── src/frontend/components/designer/DesignerRequestsTab.tsx
   └── src/frontend/components/designer/DesignerPayoutsTab.tsx
```

The active tab is driven directly by the URL parameter `/designer/:tab`, supporting direct bookmarking and navigation history.

### 2.2 Tab 1: Creator Overview (`DesignerOverviewTab.tsx`)
- **Key Performance Indicators (KPIs)**:
  * Gross Model Sales (Tổng Doanh Thu Bản Vẽ): Aggregated sales across digital licenses and designer physical royalties.
  * Total Downloads: Lifetime CAD model downloads.
  * Active Publication Count: Approved and listed 3D models.
  * Available Payout Balance: Unwithdrawn royalty earnings.
- **Top Performing Models Leaderboard**: Ranks creator's models by revenue, view count, and print conversions.
- **Quick Links**: Direct shortcuts to launch the Upload Wizard or inspect incoming custom design requests.

### 2.3 Tab 2: Publications Catalog (`DesignerModelsManagerTab.tsx`)
- **Catalog Management**: Tabular and card management of the designer's 3D models.
- **Publication Statuses**:
  * `Published`: Live on the storefront, available for purchase.
  * `Pending`: Submitted to platform administrators, undergoing automated watertight checks and manual DFM review.
  * `Draft`: Incomplete model profile saved locally by the creator.
  * `Archived`: De-listed from active search results.
- **Metadata Editor**: Edit title, engineering description, category, tags, digital CAD license fee, and reference physical print price.

### 2.4 Tab 3: Publishing Wizard (`DesignerUploadWizardTab.tsx`)
A structured 3-step publishing flow:
1. **Step 1: CAD Upload & Mesh Extraction**:
   - Accepts `.stl`, `.step`, `.obj`, `.3mf`.
   - Automatic client-side extraction of vertex count, triangle density, and bounding box dimensions ($X \times Y \times Z\text{ mm}$).
   - Generates interactive 3D WebGL preview via `ThreeModelViewer.tsx`.
2. **Step 2: Engineering Metadata & Categorization**:
   - Technical title, functional description, mechanical tags (e.g. `#gear`, `#snap-fit`, `#robotics`).
   - Category assignment (`mechanical`, `robotics`, `iot`, `fixtures`, `art_decor`).
3. **Step 3: Pricing Strategy & Licensing Terms**:
   - Digital CAD License Price (`priceDigital`): Pricing for purchasing the raw geometry files.
   - Reference Physical Fabrication Price (`pricePhysical`): Recommended retail price for on-demand 3D printing.
   - Sample Cost Estimator: Optional helper calculating temporary fabrication cost estimates based on declared weight ($g$) and machine hours.
   - Licensing Selection:
     * `Standard`: Personal use, non-commercial reproduction.
     * `Commercial`: Allows the buyer to manufacture and sell physical iterations.
     * `Exclusive`: Full intellectual property transfer.

### 2.5 Tab 4: Custom CAD Requests & Realtime Messaging (`DesignerRequestsTab.tsx`)
Connected directly to Supabase `custom_design_requests` and `custom_design_messages`:
- **Real-Time Subscription**: Listens for PostgreSQL changes on `custom_design_requests` via Supabase Realtime channels.
- **Client Project Brief**: View customer contact details, project title, required service type, target materials, budget, and deadlines submitted via `CustomIdeaRequestModal.tsx`.
- **Integrated Chat Interface**: Real-time messaging thread between customer and designer, supporting technical clarification, revision requests, and photo uploads.
- **Status Pipeline**: Transitions requests through `pending` $\rightarrow$ `quoted` $\rightarrow$ `in_progress` $\rightarrow$ `completed` / `declined`.
- **In-Chat Quotation Generator**: Allows the designer to submit a binding quotation for customer acceptance.

### 2.6 Tab 5: Royalty Payouts & Banking (`DesignerPayoutsTab.tsx`)
- **Royalty Ledger**: Itemized ledger detailing every digital license purchase and physical royalty commission.
- **Available Balance vs. Pending Clearance**: Tracks earned funds currently clearing escrow.
- **Withdrawal Requisition**: Form allowing creators to request cash transfers to verified Vietnamese commercial bank accounts.
- **Bank Account Setup**: Banking partner (Vietcombank, MB Bank, Techcombank, etc.), account number, and legal account holder name.

---

## 3. Workshop MES Portal (`/lab/:tab` & `/workshop/settings`)

### 3.1 Architectural Principles & Data Isolation
The Workshop portal enforces strict data privacy invariants (per `docs/plans/20-dot10-briefs.md` W1b):
1. **Subject-Scoped Data Access**: All queries are strictly scoped to the authenticated workshop's partner ID:
   $$\text{orders.assigned_workshop_id} = \text{workshop_profiles.partner_id}$$
   A workshop operator cannot view or modify jobs assigned to competing partner facilities.
2. **Zero Fabricated Fallbacks**: If the workshop queue or machine fleet is empty, the interface displays an authentic empty state rather than populating mock data.
3. **Shared Pipeline Nomenclature**: Uses the exact same 8 MES stage labels (`MES_PIPELINE_STAGES`) that customers see in `OrderTrackingView.tsx`.

### 3.2 Tab Breakdown

#### A. Job Queue (`/lab/queue`)
- Real-time queue of all active manufacturing jobs dispatched by the central admin router.
- **Stage Progression Control**:
  - Operators advance jobs through the 8 stages (`placed` $\rightarrow$ `slicing` $\rightarrow$ `nesting` $\rightarrow$ `heating` $\rightarrow$ `printing` $\rightarrow$ `post_cure` $\rightarrow$ `qc_check` $\rightarrow$ `shipping`).
  - Active layer progress reporting ($0 - 100\%$) during the `printing` stage.
- **Carrier Tracking Integration**: When advancing to `shipping`, the operator inputs the courier name (VCUBE Express, Viettel Post, GHTK) and package tracking code.

#### B. Machine Fleet Configuration (`/lab/machines`)
- Management of local 3D printers and additive manufacturing systems:
  * Machine Name & Model (e.g. *Bambu Lab X1-Carbon*, *Elegoo Saturn 4 Ultra*, *Creality K1 Max*).
  * Printing Technology (FDM, SLA, SLS).
  * Operational Status: `Free` (Rảnh), `Busy` (Đang in), `Maintenance` (Bảo trì).
  * Build Volume Envelope: $X \times Y \times Z\text{ mm}$.
  * Nozzle Diameter: $0.2\text{ mm}, 0.4\text{ mm}, 0.6\text{ mm}, 0.8\text{ mm}$.
  * Hourly Operational Rate: Base hourly machine time cost.

#### C. Local Material Inventory & Rates (`/lab/materials`)
- Local material configuration:
  * Material Type: PLA, PETG, ABS, PA12-CF, TPU 95A, Standard Resin, High-Temp Resin.
  * Local Cost per Kilogram (VND/kg).
  * Retail Price per Gram (VND/g).
  * In-stock Spool Count (Cuộn tồn kho) with low-stock replenishment warnings.

#### D. Fasteners & Mechanical Accessories (`/lab/accessories`)
- Local inventory of mechanical hardware:
  * Brass heat-set threaded inserts (M2, M3, M4, M5).
  * DIN 912 stainless steel socket head cap screws.
  * Neodymium disc magnets.
  * Sealed ball bearings (608-2RS, 624ZZ).

#### E. Inventory Audit Trail (`/lab/audit_trail`)
- Tamper-evident ledger recording all raw material movements:
  * Spool Check-In: Inbound batch receipt, manufacturer, batch number, weight.
  * Job Consumption: Grams consumed per completed order, accounting for purge tower and support waste.
  * Discard / Scrap: Defective spools or failed prints logged with justification.

#### F. Workshop Profile & Preferences (`/lab/preferences`)
- Workshop legal profile, registered address, and dispatch hub region:
  * Miền Bắc (Hub Hà Nội & lân cận)
  * Miền Trung (Hub Đà Nẵng & lân cận)
  * Miền Đông (Hub TP.HCM & lân cận)
- Maximum Daily Capacity: Maximum printable volume ($\text{cm}^3$) and concurrent jobs.
- Direct contact phone number and payout bank account credentials.

---

## 4. Workshop Onboarding Wizard (`WorkshopOnboardingWizard.tsx`)

When an unverified workshop partner signs in or has a profile with `verified_status = 'Pending'`, `/lab` renders the Onboarding Wizard:
1. **Step 1: Facility Profile**: Workshop legal name, address, geographical hub region, facility square footage, and climate control standards (filament drying, dust filtration).
2. **Step 2: Machine Fleet Declaration**: Rapid declaration of 3D printers using pre-configured industry presets (Bambu Lab X1-C, P1S, Creality K1 Max, Elegoo Saturn, Formlabs Form 3) or custom machine inputs.
3. **Step 3: Material Capabilities**: Declaration of supported materials, stock availability, and special processing equipment (hardened steel nozzles, high-temperature heated beds).
4. **Step 4: Verification Documentation & Submission**: Upload of business licenses and workshop facility photos. Upon submission, the profile enters the Admin verification queue (`Group1WorkshopsPanel.tsx`), while still allowing the partner to inspect their dashboard in pending mode.
