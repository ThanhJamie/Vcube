# VCUBE Specification: ForgeControl Admin Portal & Management Console

## 1. System Scope & Architectural Hierarchy

The ForgeControl Admin Console (`/admin/*`) serves as the central command hub for platform administrators. It unifies high-level platform telemetry, multi-region workshop/fleet management, customer & KYC review, designer royalty-cap configuration, multi-dimensional pricing engine governance, order manufacturing tracking (Kanban MES), CMS storefront management, and technical SEO configuration.

### Route Table & Sub-Panel Architecture

All administrative capabilities reside within `src/frontend/views/AdminDashboardView.tsx`, guarded by `<RoleGuard allowedRoles={['admin']}>`. The view dynamically synchronizes with URL route parameters (`/admin/:section`), ensuring deep-linkability across all functional modules.

| Route Parameter (`:section`) | Primary Sub-Component | Architectural Purpose |
| :--- | :--- | :--- |
| `overview`, `group0-overview` | `Group0OverviewPanel.tsx` | Platform revenue telemetry, active machine load, growth ratio, system health |
| `workshops`, `partners`, `machines` | `Group1WorkshopsPanel.tsx` | Workshop network (`workshop_profiles`), workshop partners (`workshop_partners`), printer fleet capabilities |
| `designers` | `Group2DesignersPanel.tsx` | Creator directory (`designer_profiles`), royalty cap configuration, payout/analytics tabs |
| `users`, `customers` | `Group3CustomersPanel.tsx` | Customer CRM (`customer_profiles`), corporate accounts, NDA status, KYC review (`user_profiles`) |
| `pricing`, `pricing-engine`, `pricing-setup`, `cost-rules` | `Group4PricingEnginePanel.tsx` → `PricingConfigPanel.tsx` (sub-tab `formula`) | Multi-dimensional cost formula, global VAT/electricity/labour/marketplace fee, material rates, machine hourly rates, rush multiplier |
| `materials` | `Group4PricingEnginePanel.tsx` → `PricingConfigPanel.tsx` (sub-tab `materials`) | Filament/resin catalog |
| `hardware` | `Group4PricingEnginePanel.tsx` → `PricingConfigPanel.tsx` (sub-tab `accessories`) → `AccessoriesManager.tsx` | Hardware inserts, fasteners, packaging inventory |
| `quote-calc` | `Group4PricingEnginePanel.tsx` → `PricingConfigPanel.tsx` (sub-tab `estimator`) | BOM quote calculator |
| `queue`, `orders` | `Group5ProductionPanel.tsx` | Real-time MES Kanban board, regional dispatch (Bắc/Trung/Nam), 8-stage transitions |
| `inventory` | `WarehouseInventoryPanel.tsx` | Raw material stock tracking (filament spools, resin), low-stock alerts (≤ 3 spools) |
| `products` | `AdminProductsPanel.tsx` | CAD catalog inventory, SKU configuration, pricing overrides, publication status |
| `storefront` | `AdminStorefrontPanel.tsx` | Storefront CMS, hero broadcast banners, workflow/estimator/facilities/custom-idea content |
| `seo` | `AdminSeoPanel.tsx` | Search engine optimization, OpenGraph meta tags, editable JSON-LD, robots toggle |
| `settings` | `AdminSettingsPanel.tsx` | Legal entity, tax code, invoice address, hotline, bank account, warranty/deposit policies |

Note: `accessories` is **not** a valid `:section` (it falls back to `overview`); the accessories manager is reached through `hardware`. Any unknown `:section` falls back to `overview`.

---

## 2. Navigation Shell & Component Layout

### 2.1 Responsive Chrome (`AdminDashboardView.tsx`)
- The chrome is assembled inside `AdminDashboardView` from `@frontend/ui` primitives: `AppShell`, `SideNav` (240px desktop, collapsible to 64px, mobile drawer sheet), and `Topbar` (56px). `AdminSidebar.tsx` no longer renders a shell — it only exports `buildAdminNavGroups()` and the `AdminNavSection`/`AdminNavGroup` types that feed the `SideNav`.
- The sidebar includes a "Tìm mục điều hướng" search box; `Topbar` shows a breadcrumb (`VCUBE / <group> / <title>`) and a "Báo giá BOM" shortcut.
- **Navigation Groups** (from `buildAdminNavGroups`):
  1. *Tổng quan*: Tổng Quan Điều Hành (`overview`).
  2. *Xưởng in & Thiết bị*: Mạng Lưới Xưởng In MES (`partners`), Đội Máy In 3D (Fleet) (`machines`).
  3. *Nhà thiết kế*: Nhà Thiết Kế & Bản Quyền (`designers`).
  4. *Khách hàng*: Khách Hàng & Hồ Sơ KYC (`users`).
  5. *Danh mục & Định giá*: Công Thức Giá Inkiri v3.4 (`pricing`), Danh Mục Nhựa & Resin (`materials`), Phụ Kiện, Ốc Cấy & Nam Châm (`hardware`), Báo Giá Dự Toán BOM (`quote-calc`).
  6. *Vận hành sản xuất*: Hàng Đợi & Kanban 8 Nấc (`queue`), Đơn Hàng & Điều Phối Hub (`orders`), Kho Vật Liệu & Vị Trí Kệ (`inventory`).
  7. *CỬA HÀNG & HỆ THỐNG*: Sản Phẩm & Catalog 3D (`products`), Landing Page & CMS (`storefront`), Quản Trị SEO & Metadata (`seo`), Cài Đặt Xưởng & Cloud (`settings`).
- **Real-Time Badge Counters**:
  * Active Orders Counter (`queue`): orders whose `status` is neither `completed` nor `cancelled`.
  * Orders Counter (`orders`): total loaded orders.
  * Low Material Stock Badge (`inventory`): materials with a declared `stockRollsCount <= 3`, plus accessories with a declared `lowStockThreshold` and `stockCount <= lowStockThreshold`.
  * Fleet Badge (`machines`): number of declared printers (`printers.length`).

---

## 3. Sub-Panels Detailed Specification

### 3.1 Platform Revenue & Telemetry (`Group0OverviewPanel.tsx`)
- **Timeframe Selector**: Dynamically segments analytics by `today` (1d), `week` (7d), `month` (30d, default), or `quarter` (90d).
- **KPI StatCards (Zero Fabricated Figures)**:
  * *Doanh Thu (Revenue)*: Sum of `order.payment.total` over the selected timeframe (orders with a parseable date). Compared with the preceding identical window to compute `growthRatio`.
  * *Đơn Đang Chế Tác (Orders in production)*: Count of orders whose `statusStageIndex` is between 1 and 6.
  * *Tỷ Lệ Sử Dụng Đội Máy (Fleet utilisation)*: `printingPrinters / totalPrinters` (— when no printer is declared).
  * *Cảnh Báo Tồn Kho (Inventory alerts)*: Materials with `inStock === false` or `stockRollsCount === 0`, plus accessories below their threshold (— when no inventory data is loaded).
- **Visual Analytics**: A token-coloured fleet distribution bar (`var(--color-primary)`, `var(--color-positive)`, `var(--color-warning)`) with a labelled legend, an operational alerts list, and loaded-catalog counts. It is a static stacked bar, not an interactive charting library.

### 3.2 Workshop Management & Fleet (`Group1WorkshopsPanel.tsx`)
Four tabs: `workshops` (default), `fleet`, `materials`, `partners` (selected from the `:section` value).
- **Workshop Directory (`workshop_profiles`)**:
  - Regional segmentation: Miền Bắc, Miền Trung, Miền Nam.
  - Status indicators: `Verified` (Đã duyệt), `Pending` (Chờ duyệt), `Suspended` (Đình chỉ).
- **Verification Workflow**:
  - Actions write `workshop_profiles.verified_status` directly: "Phê Duyệt Xưởng Này" (→ `Verified`), "Đình Chỉ" (→ `Suspended`), "Khôi Phục Hoạt Động" (→ `Verified`). There is no document-review modal (no business-licence/facility-photo/electrical-capacity fields) and no rejection-rationale field. Customer KYC (documents on `user_profiles`) lives in Group 3, not here.
  - Hardened RLS enforcement: database triggers prevent workshops from self-elevating their verification status.
- **Workshop Partners (`workshop_partners`)**: A separate CRUD table (name, region `hanoi`/`danang`/`hcm`, status `active`/`busy`/`offline`, address, contact) rendered as a `DataTable` with an add/edit modal.
- **Machine Fleet Inspector (`printer_fleet`)**:
  - Reads directly from the platform-wide `printer_fleet` table (no `workshop_id` column — it is a global fleet, not per-workshop).
  - Tracks individual machines: model name, brand, technology (FDM/SLA/SLS), build envelope, power (kW), acquisition cost, expected lifetime hours, and hourly rate. Unmeasured numeric fields are stored as `NULL` and render `—` (never a made-up default).

### 3.3 Designer Governance & Royalty Calculations (`Group2DesignersPanel.tsx`)
Three tabs: `designers`, `withdrawals`, `analytics`.
- **Designer Registry (`designer_profiles`)**:
  - Identity (email/phone) is joined from `user_profiles` via `designer_profiles.user_id`; unmatched rows render `—`.
  - Columns include `royaltyPercent` (royalty cap), `total_sales`, `rating`, `verified_status`, and (only when the column exists) `badge_tier`. There is no per-model submission list here.
- **Royalty Configuration**: Each designer has a configurable royalty cap (`royaltyPercent`), defaulting to 10 for the edit slider. There is **no automated 70/30 split engine** — the panel writes the per-profile percentage only.
- **Withdrawal & Payout Management**: The `withdrawals` tab exists, but there is **no payout data source** (no payout table/ledger), so pending payouts render `—` and no payment vouchers are generated.
- **Creator Badge Tiers**: `TopCreator` (👑 Top Creator), `VerifiedEngineer` (🛡️ Verified Engineer), `PioneerMaker` (🚀 Pioneer Maker), `Standard` (Tiêu Chuẩn). Tier filters/assignment are disabled unless `designer_profiles` actually has a `badge_tier` column.

### 3.4 Customer Relationship Management (`Group3CustomersPanel.tsx`)
Tabs: B2B/B2C customers, NDA agreements, batch RFQ, and KYC review.
- **Client Directory (`customer_profiles`)**:
  - Segmentation: B2C individuals vs. B2B corporate accounts, inferred from the presence of a company name or tax ID (`isB2b`).
  - Columns: name/company, type, tax ID, NDA signed date and status. There is **no lifetime-spend (LTV) or order-count column** in this panel.
- **Corporate Non-Disclosure Agreements (NDA)**:
  - NDA status is read/written directly to `customer_profiles.nda_signed` (and `nda_signed_at`); there is no "pending" state and no document links. A modal shows the NDA profile; admins mark signed or revoke.
- **Requests For Quotation (RFQ) Inbox**:
  - The RFQ tab has **no data source** — `quotes` is a single-file quote table (no project name, batch quantity, deadline, or RFQ status) and the service layer only inserts quotes. The tab shows an honest empty state, not a substitute list.
- **KYC Review (`user_profiles`)**: Approve/reject the KYC status stored on `user_profiles`; rejection writes the status back to the DB.

### 3.5 Multi-Dimensional Pricing Engine (`PricingConfigPanel.tsx`)
`Group4PricingEnginePanel` wraps `PricingConfigPanel`, which has six sub-tabs: `formula`, `materials`, `printers`, `accessories` (renders `AccessoriesManager`), `inventory`, `estimator`. The admin route maps `materials`/`hardware`/`quote-calc` to the materials/accessories/estimator sub-tabs; all other pricing routes open the `formula` sub-tab.

```
+-----------------------------------------------------------------------------+
|                     PRICING ENGINE CONFIGURATION HIERARCHY                  |
+-----------------------------------------------------------------------------+
| 0. GLOBAL SETTINGS (pricing_global_settings table)                          |
|    - VAT percentage (empty = not configured, NEVER defaults to 8%)          |
|    - Electricity rate (VND/kWh) and labour hourly rate (VND/h)              |
|    - Platform / Marketplace fee percentage (marketplace_fee_percent)        |
+-----------------------------------------------------------------------------+
| 1. BASE MATERIAL PRICING (materials table)                                  |
|    - Cost Per Kg (VND) / price per gram                                     |
|    - Material density (g/cm³)                                               |
|    - Unit price derivation multiplier (đ/g; a derivation factor, NOT a      |
|      retail-price multiplier)                                               |
|    - Stock rolls & replenishment threshold                                  |
+-----------------------------------------------------------------------------+
| 2. MACHINE OPERATIONAL FLEET (printer_fleet table)                          |
|    - Acquisition cost & useful lifetime (hours)                             |
|    - Power consumption (kW) × electricity rate (sub-tab 0)                  |
|    - Machine hourly operational rate (VND/h)                                |
+-----------------------------------------------------------------------------+
| 3. FORMULA RULES (Inkiri cost formula)                                      |
|    - Base failure-reserve percentage (baseFailureReservePercent)            |
|    - Review file & slicing labour minutes (fileReviewLaborMinutes)          |
|    - Express rush surcharge percentage (expressRushSurchargePercent)        |
+-----------------------------------------------------------------------------+
| 4. COMMERCIAL SALES RULES (site_content table)                              |
|    - Standard delivery courier fee                                          |
|    - Free shipping eligibility threshold                                    |
+-----------------------------------------------------------------------------+
```

The `unit_price_multiplier` field is a derivation factor for the material unit rate; it is **not** a selling-price multiplier (see `scripts/check-unitprice-multiplier.mjs`). The platform fee has a single source (`marketplace_fee_percent` in sub-tab 0); the formula sub-tab's legacy commission field is disabled.

### 3.6 Production Kanban & Regional Dispatch (`Group5ProductionPanel.tsx`)
Tabs: `kanban`, `dispatcher`, `fleet`. The `queue` route opens `kanban`; the `orders` route opens `dispatcher`.
- **Kanban Board (REAL orders)**:
  - Each card is a real `orders` row; stage moves write to Supabase (`dbService.updateOrderStatus`) and the order list is reloaded from the DB afterwards.
  - The eight columns come from `KANBAN_STAGES` (`useProductionStore.ts`): `pending_payment` → `cad_prep` → `slicing` → `printing` → `post_processing` → `qc_inspection` → `packaging` → `delivering`. This is **not** the customer-facing `MES_PIPELINE_STAGES` list used by `OrderProgress.tsx`.
  - Stage advancement is via advance/regress/set-stage actions (no drag-and-drop). Print progress is shown only when `orders.layer_progress` is reported; otherwise `—`.
- **Regional Dispatcher**:
  - Infers a region from the shipping address via `regionFromAddress` (`Bắc` / `Trung` / `Nam`, or `Chưa rõ` when no known province matches).
  - Computes a suggested workshop/printer match (`calculateGeoDispatchRecommendation`) from declared workshops. Because there is no write path for `orders.assigned_workshop_id`, the "confirm dispatch" buttons were removed rather than reporting a success that stores nothing.

### 3.7 Secondary Management Panels
- **Catalog Management (`AdminProductsPanel.tsx`)**: CRUD for marketplace 3D models. Fields: name, SKU (manually entered — no auto-generation; empty renders "Chưa có mã"), `pricePhysical`, `priceDigital`, status (`published`/`draft`), and a single image URL. There is no supported-materials declaration or CAD-file attachment field in this panel.
- **Storefront CMS (`AdminStorefrontPanel.tsx`)**: Six tabs — Hero & quality metrics, announcement banner, 3-step workshop workflow, quick estimator, partners & facilities, and the Custom 3D Service block. It does not curate "featured models"; content is stored on `site_content`.
- **Technical SEO (`AdminSeoPanel.tsx`)**: Manages meta title/description, OpenGraph image, canonical URL, a robots-index toggle, sitemap note, and a free-text JSON-LD field (no prebuilt `Product`/`Organization`/`Service` schemas — empty means not configured).
- **Raw Material Inventory (`WarehouseInventoryPanel.tsx`)**: Tracks filament/resin stock and accessories in one table with type filters. Material low-stock threshold is `stockRollsCount <= 3`; accessories use their own `lowStockThreshold`. Undeclared quantities are excluded from totals and flagged as incomplete.
- **Hardware & Accessories (`AccessoriesManager.tsx`)**: Accessory catalog (categories: keychain, fastener/inserts, hardware, magnet, bearing, packaging, other) with manual SKU, cost/selling price, stock, low-stock threshold, warehouse location, and active toggle. It is generic — no brass-insert/DIN912-specific schema.
- **System Settings (`AdminSettingsPanel.tsx`)**: Reads/writes nine `app_settings` columns: legal name, tax code, invoice address, hotline, contact email, bank account, bank name, warranty terms, and deposit policy. Empty fields are stored as `NULL` ("chưa cấu hình") and never defaulted.
