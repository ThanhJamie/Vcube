# VCUBE Specification: Designer Studio & Workshop MES Portals

## 1. System Scope & Portals Overview

This document specifies the professional operational portals for VCUBE's two core supply-side partners:
1. **Designer Studio (`/designer/*`)**: Creator workspace empowering 3D CAD designers to publish models, configure parametric licensing terms, inspect sales telemetry, and manage bespoke customer requests in real-time.
2. **VCUBE Lab & Workshop MES (`/lab` & `/lab/:tab`)**: Manufacturing Execution System (MES) designed for partner fabrication facilities to manage active print queues across the 8-step production lifecycle, configure printer fleets, manage local material stocks, and audit inventory consumption.

### Access Guards & Routing Table

| Route | Primary View | Access Guard | Chrome Layer | Sub-Tabs / Modules |
| :--- | :--- | :--- | :--- | :--- |
| `/designer` / `/designer/:tab` | `DesignerDashboardView.tsx` | Role: `designer`, `admin` | `DesignerDashboardShell` | `overview`, `models`, `wizard`, `requests`, `payouts` |
| `/lab` / `/lab/:tab` | `WorkshopSettingsView.tsx` | Role: `lab`, `workshop`, `admin` | `LabDashboardShell` | `queue`, `machines`, `materials`, `accessories`, `audit_trail`, `preferences` |
| `/lab` (Unverified / Pending) | `WorkshopOnboardingWizard.tsx` | Role: `lab`, `workshop` | `LabDashboardShell` | 4-step wizard: Facility info, Machine fleet, Material inventory, Pending review |

---

## 2. Designer Studio (`/designer/:tab`)

### 2.1 Architecture & Modular Design
Prior to the R6 optimization, `DesignerDashboardView.tsx` existed as a monolithic component exceeding 1,500 lines. It has been modularized into a lightweight routing shell (144 lines) delegating to 5 dedicated components inside `src/frontend/components/designer/`:

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
- **Key Performance Indicators (KPIs)** — four cards, all rendering `—` when no genuine source exists:
  * Doanh Thu & Hoa Hồng Khả Dụng (`availableBalance`): the parent shell currently passes no balance, so this card renders the "Chưa có nguồn số dư khả dụng" state.
  * Lượt Tải File Số STL / STEP: sum of `salesCount` across the designer's models.
  * Đơn In 3D Vật Lý Đã Xuất: sum of `printsCount` across the designer's models.
  * Độ Tin Cậy QC & In Thành Công: always `—` (no QC data is wired to the account yet).
- **Recent Custom Requests Panel**: Lists the 5 most recent `custom_design_requests` for the designer (via `customDesignService.getRequests` + realtime `subscribe`), with a "Xem Toàn Bộ Hộp Thư" shortcut to the Requests tab.
- **Quick Links**: A "Tải Lên Ấn Phẩm Mới Ngay" card and header actions launch the Upload Wizard.

### 2.3 Tab 2: Publications Catalog (`DesignerModelsManagerTab.tsx`)
- **Catalog Management**: Tabular and card management of the designer's 3D models.
- **Publication Statuses** (`Published`, `Under Review`, `Draft`):
  * `Published`: Live on the storefront, available for purchase.
  * `Under Review`: Submitted for moderation (the wizard publishes with this status, not straight to `Published`).
  * `Draft`: Delisted / incomplete model profile.
- **Metadata Editor**: Edit name, SKU, description, category, tags, license (`Standard` / `Commercial` / `Exclusive`), publication status, digital CAD fee, and reference physical print price.

### 2.4 Tab 3: Publishing Wizard (`DesignerUploadWizardTab.tsx`)
A structured 3-step publishing flow (stepper labels: "1. TẢI FILE 3D", "2. XEM 3D & THÔNG SỐ", "3. ĐỊNH GIÁ & XUẤT BẢN"):
1. **Step 1: CAD Upload**:
   - Accepts `.stl`, `.step`, `.stp`, `.3mf`, `.obj` (UI states max 150 MB).
   - Mesh metrics shown in step 2 (mesh volume, dimensions, manifold status) currently render `—`; the wizard does **not** perform client-side mesh extraction yet.
   - Generates an interactive WebGL preview via `ThreeModelViewer.tsx` (illustrative geometry, not the uploaded file).
2. **Step 2: Engineering Metadata & Categorization**:
   - Technical title, functional description, tags (free-form).
   - Category assignment (`mechanical`, `iot`, `robotics`, `art`, `tools`).
3. **Step 3: Pricing Strategy & Licensing Terms**:
   - Digital CAD License Price (`priceDigital`): pricing for the raw geometry files.
   - Reference Physical Fabrication Price (`pricePhysical`): recommended retail price for on-demand 3D printing.
   - Licensing Selection (wizard offers two options):
     * `Standard`: personal use only.
     * `Commercial`: allows the buyer to manufacture and sell physical iterations.
     * (`Exclusive` exists in the Models Manager edit dropdown but not in the wizard.)
   - Publishing writes the product with `status: 'Under Review'`; the royalty note reads the configured `designerRoyaltyPercent` or shows `—` when unset. There is no sample cost estimator.

### 2.5 Tab 4: Custom CAD Requests & Realtime Messaging (`DesignerRequestsTab.tsx`)
Connected to Supabase `custom_design_requests` (messages are stored in a JSON `messages` column on that table; there is no separate `custom_design_messages` table):
- **Real-Time Subscription**: Listens for PostgreSQL changes on `custom_design_requests` via `customDesignService.subscribe()` (Supabase Realtime channel).
- **Client Project Brief**: View project title, budget, deadline, target material, infill, and nozzle specs submitted via `CustomIdeaRequestModal.tsx`.
- **Integrated Chat Interface**: Text messaging thread between customer and designer for technical clarification and revision requests. Attachments already present in the data are displayed, but there is no file/photo upload control in the chat.
- **Status Pipeline**: Transitions requests through `pending` $\rightarrow$ `quoted` $\rightarrow$ `in_progress` $\rightarrow$ `completed` / `declined` (UI status value is `Quoted`).
- **In-Chat Quotation Generator**: Allows the designer to submit a quotation amount for customer acceptance.

### 2.6 Tab 5: Royalty Payouts (`DesignerPayoutsTab.tsx`)
- **Available Balance**: A single card showing `availableBalance` (or `—` when no source is wired).
- **Withdrawal**: The "Yêu Cầu Rút Tiền Về Ngân Hàng" button is permanently disabled — settlement is not connected to any payment system, and the tab says so.
- **Linked Accounts**: An empty state only; there is no bank-account setup form (no payout table/service exists in the DB yet).
- **Payout History**: A read-only table fed by the static `PAYOUT_TRANSACTIONS` fixture in `mockData`; it is not a live royalty ledger. There is no "pending clearance" tracking.

---

## 3. Workshop MES Portal (`/lab` & `/lab/:tab`)

### 3.1 Architectural Principles & Data Isolation
The Workshop portal enforces strict data privacy invariants (originally specified in the now-archived `docs/plans/20-dot10-briefs.md` W1b — see `docs/archive/README.md`):
1. **Subject-Scoped Data Access**: All queries are strictly scoped to the authenticated workshop's partner ID:
   $$\text{orders.assigned_workshop_id} = \text{workshop_profiles.partner_id}$$
   A workshop operator cannot view or modify jobs assigned to competing partner facilities.
2. **Zero Fabricated Fallbacks**: If the workshop queue or machine fleet is empty, the interface displays an authentic empty state rather than populating mock data.
3. **Shared Pipeline Nomenclature**: Uses the exact same 8 MES stage labels (`MES_PIPELINE_STAGES`) that customers see in `OrderTrackingView.tsx`.

### 3.2 Tab Breakdown

#### A. Job Queue (`/lab/queue`)
- Queue of manufacturing jobs dispatched to the authenticated workshop (`orders.assigned_workshop_id = partner_id`). Two views: a filterable/paginated list (`DataTable`) and a 4-column Kanban board (Đơn mới · Chuẩn bị file/Gắn máy · Đang in · Hậu kỳ & Đóng gói).
- **Stage Progression Control**:
  - Operators advance jobs through the 8 stages (`placed` $\rightarrow$ `slicing` $\rightarrow$ `nesting` $\rightarrow$ `heating` $\rightarrow$ `printing` $\rightarrow$ `post_cure` $\rightarrow$ `qc_check` $\rightarrow$ `shipping`) via numbered buttons, plus quick "Nhận việc" (stage 2) and "Xác nhận hoàn thành" (stage 8) actions.
  - Manual layer progress entry ($0 - 100\%$) is available for the current stage; advancing to stage index $\ge 5$ forces layer progress to 100%.
- **Delivery Confirmation**: At the final stage the operator can "Đánh dấu đã giao", which sets `status = 'completed'` and triggers the workshop's material stock deduction. There is no courier-name / tracking-code input in this view.

#### B. Machine Fleet Configuration (`/lab/machines`)
- Management of the workshop's own printers in `workshop_machines` (`workshop_id = profile.id`):
  * Machine Name (optional preset suggestion from the VCUBE fleet catalog).
  * Printing Technology: `FDM`, `SLA`, `SLS`, `PolyJet`.
  * Operational Status: `Free` (Rảnh), `Busy` (Đang in), `Maintenance` (Bảo trì), `Offline` (Tắt).
  * Build Volume Envelope: $X \times Y \times Z\text{ mm}$ (blank = not declared).
  * Hourly Operational Rate (VND/hour; blank = not declared — no default is applied).
  * There is no nozzle-diameter field.

#### C. Local Material Inventory & Rates (`/lab/materials`)
- Local material configuration in `workshop_materials`:
  * Material Type: `PLA`, `PETG`, `ABS`, `ASA`, `TPU`, `Nylon`, `Resin`, `Khác`.
  * Name, colour, local cost per kilogram (VND/kg; blank = not declared).
  * Stock in grams (`currentStockGrams`; blank = never recorded, distinct from `0 g`) with a low-stock threshold (grams) and `LowStock` / `OutOfStock` badges.
  * There is no retail price-per-gram field.

#### D. Fasteners & Mechanical Accessories (`/lab/accessories`)
- Free-form inventory of the workshop's own hardware in `workshop_accessories` (`workshop_id = profile.id`). Each record has: name, SKU, unit, quantity, and optional cost price / selling price. There are no preset hardware categories — operators type any item (e.g. heat-set inserts, screws, magnets).

#### E. Inventory Audit Trail (`/lab/audit_trail`)
- Read-only ledger of material movements (`material_inventory_logs`) scoped to the workshop's materials. Each row records: timestamp, action (`Import` / `Export` / `Adjustment`), material, grams, price-per-kg at the time, batch code, supplier, note, and the real `createdBy` session identity.
- Job consumption is written automatically when an order is marked delivered (stock deduction); there is no separate purge-tower/support-waste or "discard/scrap" action type.

#### F. Workshop Profile & Preferences (`/lab/preferences`)
- Workshop legal profile and dispatch region (Bắc / Trung / Nam):
  * Miền Bắc (Hub Hà Nội & lân cận)
  * Miền Trung (Hub Đà Nẵng & lân cận)
  * Miền Nam (Hub TP.HCM & lân cận)
  * (Legacy value "Đông" is still displayed if present on the profile, with a prompt to switch to "Nam".)
- Contact phone and technical email.
- Per-workshop rate overrides: electricity (VND/kWh) and labour (VND/hour). Blank = not configured; the system does not substitute a default. There is no maximum-daily-capacity or payout-bank field here.

---

## 4. Workshop Onboarding Wizard (`WorkshopOnboardingWizard.tsx`)

When an unverified workshop partner signs in, or has a profile with `verified_status = 'Pending'`, `/lab` renders the Onboarding Wizard:
1. **Step 1: Facility Profile**: Workshop legal name, contact phone, technical email, detailed address, hub region (Bắc / Trung / Nam), and optional electricity rate (VND/kWh; blank = not declared).
2. **Step 2: Machine Fleet Declaration**: Declare printers using pre-configured presets (Bambu Lab X1-Carbon Combo, P1S Combo, Creality K1 Max, Elegoo Saturn 4 Ultra 12K, Anycubic Kobra 2 Plus, Formlabs Form 4 SLA) or custom inputs. Each machine captures name, technology (`FDM` / `SLA` / `SLS`), build volume (X × Y × Z mm), and hourly rate.
3. **Step 3: Material Inventory**: Declare spools with name, material type (`PLA`, `PETG`, `ABS`, `TPU`, `PC`, `Resin`), colour, cost per kg, initial stock (grams), and low-stock threshold (grams).
4. **Step 4: Pending Review**: On submission the wizard writes through `WorkshopService` (reusing the existing row id on resubmission) and shows a `verified_status: Pending` summary. There is **no** document/photo upload step; the partner can open the dashboard immediately in pending mode.

Submitted profiles are then reviewed by admins in `Group1WorkshopsPanel.tsx`.
