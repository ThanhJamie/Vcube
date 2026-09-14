# VCUBE Specification: ForgeControl Admin Portal & Management Console

## 1. System Scope & Architectural Hierarchy

The ForgeControl Admin Console (`/admin/*`) serves as the central command hub for platform administrators. It unifies high-level platform telemetry, multi-region workshop dispatch, partner KYC credential auditing, designer royalty settlements, multi-dimensional pricing engine governance, order manufacturing tracking (Kanban MES), CMS storefront management, and technical SEO configuration.

### Route Table & Sub-Panel Architecture

All administrative capabilities reside within `src/frontend/views/AdminDashboardView.tsx`, guarded by `<RoleGuard allowedRoles={['admin']}>`. The view dynamically synchronizes with URL route parameters (`/admin/:section`), ensuring deep-linkability across all functional modules.

| Route Parameter (`:section`) | Primary Sub-Component | Architectural Purpose |
| :--- | :--- | :--- |
| `overview`, `group0-overview` | `Group0OverviewPanel.tsx` | Platform revenue telemetry, active machine load, GMV, growth indices, system health |
| `workshops`, `partners`, `machines` | `Group1WorkshopsPanel.tsx` | Workshop network management, partner KYC verification, printer fleet capabilities |
| `designers` | `Group2DesignersPanel.tsx` | Creator directory, model submissions, royalty split calculations (70/30), payout approval |
| `users`, `customers` | `Group3CustomersPanel.tsx` | Customer CRM, order history, lifetime value (LTV), corporate accounts, B2B NDA contracts |
| `pricing`, `pricing-engine`, `cost-rules` | `Group4PricingEnginePanel.tsx` & `PricingConfigPanel.tsx` | Multi-dimensional cost formula, material rates, machine hourly rates, multiplier calibration |
| `queue`, `orders` | `Group5ProductionPanel.tsx` | Real-time MES Kanban board, regional dispatch (Bắc/Trung/Đông), 8-step stage transitions |
| `products` | `AdminProductsPanel.tsx` | CAD catalog inventory, SKU configuration, pricing overrides, publication status |
| `storefront` | `AdminStorefrontPanel.tsx` | Storefront CMS, hero broadcast banners, featured model curation, Custom Idea RFQs |
| `inventory` | `WarehouseInventoryPanel.tsx` | Raw material stock tracking (filament spools, resin liters), low-stock alerts ($\le 3$ spools) |
| `hardware`, `accessories` | `AccessoriesManager.tsx` | Mechanical hardware inserts, fasteners, bearings, packaging inventory |
| `seo` | `AdminSeoPanel.tsx` | Search engine optimization, OpenGraph meta tags, JSON-LD structured schemas, robots.txt |
| `settings` | `AdminSettingsPanel.tsx` | Global system configurations, VietQR bank account credentials, corporate legal entity info |

---

## 2. Navigation Shell & Component Layout

### 2.1 Responsive Chrome (`AdminSidebar.tsx`)
- Constructed with `@frontend/ui` primitives: `AppShell`, `SideNav` (240px desktop, collapsible to 64px, mobile drawer sheet), and `Topbar` (56px).
- **Navigation Groups**:
  1. *Hệ Thống & Báo Cáo*: Tổng Quan (`overview`), Doanh Thu & Chỉ Số.
  2. *Mạng Lưới Đối Tác*: Xưởng Gia Công (`workshops`), Đối Tác KYC, Đội Máy Toàn Hệ Thống (`machines`), Nhà Thiết Kế (`designers`).
  3. *Khách Hàng & Đơn Hàng*: Khách Hàng (`customers`), Hàng Đợi Sản Xuất (`queue`), Quản Lý Đơn Hàng (`orders`).
  4. *Cấu Hình & Định Giá*: Bảng Giá & Công Thức (`pricing`), Kho Vật Liệu (`inventory`), Phụ Kiện Cơ Khí (`hardware`).
  5. *Nội Dung & Tiếp Thị*: Quản Lý Bản Vẽ (`products`), Giao Diện Storefront (`storefront`), Cấu Hình SEO (`seo`), Thiết Lập Hệ Thống (`settings`).
- **Real-Time Badge Counters**:
  * Active Orders Counter: Reflects all orders currently in manufacturing stages ($1 - 6$).
  * Low Material Stock Badge: Triggers when genuine filament stock $\le 3$ rolls.
  * Low Accessory Stock Badge: Triggers when mechanical insert stock reaches defined reorder thresholds.

---

## 3. Sub-Panels Detailed Specification

### 3.1 Platform Revenue & Telemetry (`Group0OverviewPanel.tsx`)
- **Timeframe Selector**: Dynamically segments analytics by `today` (24h), `week` (7d), `month` (30d, default), or `quarter` (90d).
- **KPI Metrics (Zero Fabricated Figures)**:
  * *Tổng Doanh Thu (Gross Revenue)*: Aggregated from `order.payment.total` over the selected timeframe. Compared with the preceding identical period to compute the exact `growthRatio`.
  * *Đơn Đang Gia Công (Active Manufacturing Orders)*: Count of orders with active MES stage index ($1 \le \text{stage} \le 6$).
  * *Tải Đội Máy (Machine Fleet Utilization)*: Active ratio of printing vs. idle vs. maintenance machines.
  * *Cảnh Báo Tồn Kho (Critical Inventory Alerts)*: Real-time count of materials and fasteners requiring replenishment.
- **Visual Analytics**: Interactive bar charts utilizing CSS design token variables (`var(--color-primary)`, `var(--color-positive)`, `var(--color-warning)`).

### 3.2 Workshop Management & Partner KYC (`Group1WorkshopsPanel.tsx`)
- **Workshop Directory**:
  - Regional segmentation: Miền Bắc (Hanoi Hub), Miền Trung (Da Nang Hub), Miền Đông (Ho Chi Minh City Hub).
  - Status indicators: `Verified` (Đã xác minh), `Pending` (Chờ kiểm định), `Rejected` (Từ chối).
- **Partner KYC Verification Workflow**:
  - Verification modal reviewing: Business registration certificate (Giấy phép kinh doanh), factory physical address, facility photos, declared machine fleet, electrical capacity, dust/moisture control standards.
  - Audit Actions: One-click "Phê Duyệt Xưởng" (updates `verified_status = 'Verified'` in database) or "Từ Chối" with rejection rationale.
  - Hardened RLS enforcement: Enforces database triggers preventing workshops from self-elevating their verification status.
- **Machine Fleet Inspector (`printer_fleet`)**:
  - Reads directly from platform-wide `printer_fleet` table.
  - Tracks individual machines: model name, technology (FDM/SLA/SLS), build envelope ($X \times Y \times Z\text{ mm}$), electrical consumption (kW), acquisition cost, expected lifetime hours, and calculated hourly rate.

### 3.3 Designer Governance & Royalty Calculations (`Group2DesignersPanel.tsx`)
- **Designer Registry**:
  - Profiles linked via `designer_profiles.user_id = user_profiles.id`.
  - Tracks total published models, accumulated sales, and available unpaid royalty balances.
- **Royalty Split Engine**:
  - Automated revenue distribution: Standard 70% to creator / 30% platform infrastructure fee.
- **Withdrawal & Payout Management**:
  - Review queue for designer payout requests.
  - Banking verification: Beneficiary bank, account number, legal account holder name.
  - Approval workflow: Generates payment vouchers and updates payout ledger.
- **Creator Badge Tiers**: `TopCreator` (👑 Top Creator), `VerifiedEngineer` (🛡️ Verified Engineer), `PioneerMaker` (🚀 Pioneer Maker), `Standard` (Tiêu Chuẩn).

### 3.4 Customer Relationship Management (`Group3CustomersPanel.tsx`)
- **Client Directory**:
  - Segmentation: Individual Makers (B2C) vs. Corporate Engineering Accounts (B2B).
  - Metrics: Total orders placed, lifetime spend (LTV), registered enterprise tax IDs.
- **Corporate Non-Disclosure Agreements (NDA)**:
  - Repository of mutual NDAs executed between corporate clients and VCUBE.
  - Tamper-evident timestamping and signed document links.
- **Requests For Quotation (RFQ) Inbox**:
  - Inbound engineering RFQs requiring custom tooling, CNC machining hybrid runs, or mass-production batch pricing.

### 3.5 Multi-Dimensional Pricing Engine (`PricingConfigPanel.tsx`)
This panel provides complete administrative governance over the core mathematical formulas that dictate manufacturing quotes:

```
+-----------------------------------------------------------------------------+
|                     PRICING ENGINE CONFIGURATION HIERARCHY                  |
+-----------------------------------------------------------------------------+
| 1. BASE MATERIAL PRICING (materials table)                                  |
|    - Cost Per Kg (VND)                                                      |
|    - Material Density (g/cm³)                                               |
|    - Unit Price Multiplier (Derives final retail material rate per gram)    |
|    - Stock Rolls & Replenishment Threshold                                  |
+-----------------------------------------------------------------------------+
| 2. MACHINE OPERATIONAL FLEET (printer_fleet table)                          |
|    - Acquisition Cost & Useful Lifetime (Hours)                             |
|    - Power Consumption (kW) & Industrial Electricity Tariffs                |
|    - Calculated Machine Hourly Operational Rate (VND/hr)                    |
+-----------------------------------------------------------------------------+
| 3. MULTI-DIMENSIONAL FORMULA RULES (pricing_global_settings table)          |
|    - Platform / Marketplace Fee Percentage (e.g. 15%)                       |
|    - Failure Risk Margin Percentage                                         |
|    - Pre-print Slicing & Engineering Prep Overhead                          |
|    - Rush Turnaround Multipliers (24h Express vs. Standard)                 |
|    - Value Added Tax (VAT Percentage, e.g. 8%)                              |
+-----------------------------------------------------------------------------+
| 4. COMMERCIAL SALES RULES (site_content table)                              |
|    - Standard Delivery Courier Fee                                          |
|    - Free Shipping Eligibility Threshold                                    |
+-----------------------------------------------------------------------------+
```

### 3.6 Production Kanban & Regional Dispatch (`Group5ProductionPanel.tsx`)
- **Interactive Kanban Board**:
  - Real-time order cards transitioning across the 8 MES stages (`placed` $\rightarrow$ `slicing` $\rightarrow$ `nesting` $\rightarrow$ `heating` $\rightarrow$ `printing` $\rightarrow$ `post_cure` $\rightarrow$ `qc_check` $\rightarrow$ `shipping`).
  - Drag-and-drop or modal status advancement.
  - Live print progress telemetry ($0 - 100\%$ layer completion).
- **Intelligent Regional Dispatcher**:
  - Analyzes customer delivery address via `regionFromAddress`.
  - Automatically matches orders to the nearest qualified workshop hub (Bắc / Trung / Đông) with matching machine capabilities and filament inventory.

### 3.7 Secondary Management Panels
- **Catalog Management (`AdminProductsPanel.tsx`)**: CRUD management of 3D models in the marketplace, SKU generation, pricing overrides, supported materials declaration, and CAD file attachments.
- **Storefront CMS (`AdminStorefrontPanel.tsx`)**: Controls marketing banners, featured models, announcement tickers, and customer submissions from the "Custom Service by Idea" section.
- **Technical SEO (`AdminSeoPanel.tsx`)**: Manages meta titles, open graph preview images, canonical URLs, and structured JSON-LD schemas (`Product`, `Organization`, `Service`).
- **Raw Material Inventory (`WarehouseInventoryPanel.tsx`)**: Central warehouse inventory tracking raw filament spools and resin canisters with automatic low-stock triggers.
- **Hardware Inserts & Accessories (`AccessoriesManager.tsx`)**: Standardized mechanical hardware catalog (threaded brass inserts, DIN912 socket head screws, ball bearings, neodymium magnets).
- **System Settings (`AdminSettingsPanel.tsx`)**: Manages legal entity details, registered corporate address, hotline, and VietQR beneficiary bank accounts stored in `app_settings`.
