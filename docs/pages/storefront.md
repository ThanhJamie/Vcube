# VCUBE Specification: Storefront & Public Engineering Pages

## 1. System Scope & Architecture Overview

The Storefront & Public Engineering views of VCUBE represent the primary customer touchpoints for industrial 3D printing and digital CAD model acquisition. Designed as a high-precision Modern Engineering SaaS application, these interfaces combine WebGL 3D visualization, instant parametric quoting, multi-dimensional search, and dual-persona commercial flows (Digital CAD License vs. Physical On-Demand Fabrication).

### Route Table & Component Hierarchy

| Path | Primary Component | Lazy Loaded | Access Guard | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `HomeView.tsx` | No | Public | Hero CAD Dropzone, Interactive 3D Chassis, Service Showcase, Catalog, Custom Idea Form |
| `/explore` | `ExploreView.tsx` | No | Public | Multi-dimensional faceted filter, Quick 3D Inspect, Tech Table vs. Grid View, Bookmarks |
| `/products/:productId` | `ProductDetailView.tsx` | No | Public | Dual-Persona Buying Box, 360° 3D Inspector, Material Configurator, Material Technical Advisory |
| `/quote` (alias `/tool-3d`) | `Tool3DView.tsx` | Yes (`React.lazy`) | Public | Instant WebAssembly CAD parser, 3D Mesh Repair, Slicing Analysis, B.O.M. Cost Calculator |
| `/personalize` (alias `/personalize/:productId`) | `PersonalizeView.tsx` | No | Public | 3D Text Laser Engraving, Vector Logo Upload, Exploded-View Inspection |
| `/auth/login` (alias `/login`) | `LoginView.tsx` | No | Public | Email/Password Auth, Google OAuth (flag-gated, currently off), Role-based Redirection |
| `/auth/register` (alias `/register`) | `RegisterView.tsx` | No | Public | Account Registration, Password Strength Meter, Email Verification Notice |

---

## 2. `HomeView.tsx` (`/`) — Landing & Technical Showcase Hub

### 2.1 Purpose & Architectural Role
`HomeView.tsx` serves as the high-conversion industrial landing page. It immediately establishes VCUBE's engineering credibility through interactive 3D WebGL models, instant CAD upload mechanisms, live material specifications, and verified tolerance commitments.

### 2.2 Component Props Interface
```typescript
interface HomeViewProps {
  products: Product[];
  productsLoading?: boolean;
  productsError?: boolean;
  onRetryProducts?: () => void;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  siteContent?: SiteContentConfig;
  onAddToCart?: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onSelectProduct: (product: Product) => void;
  onShowToast?: (msg: string) => void;
}
```

### 2.3 Internal State Architecture
- `cadSearch: string`: Real-time keyword filter across model names, designer profiles, SKUs, and engineering tags.
- `selectedCategory: string`: Category filter slug (`'all'`, `'mechanical'`, `'iot'`, `'architecture'`, `'tabletop'`, `'tools'`, `'materials'`).
- `selectedTag: string`: Filter tag selection (`'all'`, `'mechanical'`, `'iot'`, `'robotics'`, `'snap-fit'`, `'resin-8k'`, `'decor'`, `'bán-chạy'`; a `2/9` campaign tag also has dedicated handling).
- `catalogViewMode: 'grid' | 'tech-table'`: Toggles visual product cards vs. high-density engineering data table.
- `catalogLimit: number`: Pagination counter for the catalog grid/table (defaults to `CATALOG_PAGE_SIZE = 6`; "Xem thêm" loads +6).
- `heroModel: 'gear' | 'drone' | 'box' | 'arch'`: Selects the active 3D model in the Hero WebGL chassis.
- `isDraggingFile: boolean`: Visual drag-over feedback for the CAD file dropzone.
- `quickViewProduct: Product | null`: Manages the active product inspected in `CadQuickViewModal`.
- `isQuickViewOpen: boolean`: Controls visibility of the 3D inspect modal.
- `isCustomIdeaModalOpen: boolean`: Controls visibility of the `CustomIdeaRequestModal`.

### 2.4 Detailed Section Breakdown

#### A. Broadcast Bar & Operational Highlights
A top campaign banner (`bg-surface-inverse text-on-inverse`) rendered only when `siteContent.announcementActive` is true. All copy comes from admin-managed `SiteContentConfig` fields (`announcementBadge`, `announcementText`, `announcementActionText`, `announcementActionTag`); nothing is hardcoded. The CTA scrolls to `#browse-cad-catalog` and, when `announcementActionTag` is set, applies that tag filter. The badge is hidden entirely when empty (no fabricated campaign names).

#### B. Hero CAD Dropzone & Interactive 3D Chassis
- **Dropzone Station**: Supports drag-and-drop or file browsing for CAD files (`.stl`, `.3mf`, `.step`, `.stp`, `.obj`). Dragging a file highlights the container with an active accent border. Dropping a file immediately passes the `File` object to `/quote` via `onNavigate('quote', { uploadedFile: file })`.
- **3D Chassis WebGL Viewer**: Powered by `ThreeModelViewer.tsx` (Three.js 0.185). Features an interactive 4-button selector:
  1. *Mechanical Spur Gear (`gear`)*: Module 2.5, $95\times 95\times 22\text{ mm}$, PA12-CF / Nylon.
  2. *Drone Arm (`drone`)*: Carbon-fiber reinforced frame, $160\times 42\times 18\text{ mm}$, Carbon Fiber PLA.
  3. *IoT Case (`box`)*: IP65 water-resistant electronics housing, $115\times 80\times 38\text{ mm}$, PETG Chịu Lực.
  4. *FEM Arch Truss (`arch`)*: Topology-optimized load-bearing bracket, $130\times 65\times 50\text{ mm}$, Resin High-Temp.
- **Controls & Actions**: Full 360° rotation via OrbitControls, zoom, and auto-rotate. The HUD labels the model as a category-based illustrative model (not a real product) and the footer shows the "Drag to rotate 360° • Scroll to zoom" hint. There is no CTA that loads the chassis model into the Quoting Tool.

#### C. Engineering Services Showcase (`ServiceShowcaseSection.tsx`)
A dedicated section detailing VCUBE's 4 core service capabilities:
1. **Gia Công In 3D Công Nghiệp Tức Thì (`rapid_print`)**: Automated slicing, volume calculations, FDM/SLA/SLS fabrication.
2. **Thiết Kế CAD 3D & Hiện Thực Ý Tưởng (`custom_idea`)**: Conversion of 2D drafts, hand sketches, or broken parts into parametric STEP/STL files with full NDA protection.
3. **Kho Bản Vẽ Kỹ Thuật Đạt Chuẩn (`cad_catalog`)**: Mesh integrity checked per file, instant licensed STL & STEP downloads.
4. **Đo Kiểm Dung Sai & Tư Vấn Kỹ Thuật (`qc_advisory`)**: Dimensional tolerance inspection with digital calipers and 3D optical scanning, plus high-temperature material advisory (ABS, PA-CF, PEEK).

#### D. Industrial CAD Catalog Hub (`#browse-cad-catalog`)
- **Filter Command Strip**: Search bar with clear button, horizontal scroll category filter chips with live item counts, quick engineering tag pills.
- **Visual Card Grid** (paginated, 6 cards per page; "Xem thêm" loads +6):
  - Image frame with 4:3 aspect ratio and hover overlay triggering instant 360° 3D inspection (`CadQuickViewModal`).
  - Strict Data Honesty compliance: print time and ratings only render when genuine non-null data exists; otherwise display `—` or "Chưa có đánh giá".
  - Dual Pricing Bar: "File Số (STL/STEP)" vs. "In Vật Lý (FDM/Resin)".
  - Dual CTA: "Mua File CAD" (1-click add to cart via `handleQuickAddDigital`, disabled with a "Không bán file số" label when `priceDigital <= 0`) and "Đặt In" (navigates to the product detail page).
  - Customizable items expose a dedicated `tune` button routing to `/personalize/:productId`.
- **Technical Table View**: Tabular presentation providing part thumbnail, name, designer, SKU, category, bounding box dimensions, print time, digital price, physical price, and actions (3D preview + quick CAD add).

#### E. Custom Service by Idea Section & `CustomIdeaRequestModal.tsx`
Provides an accessible entryway for customers who do not possess CAD files:
- Three-stage visual workflow: Phác thảo ý tưởng $\rightarrow$ Dựng mô hình 3D tham số $\rightarrow$ In mẫu thử nghiệm & Bàn giao.
- Form modal capturing: Client name, phone/Zalo, email, company (optional), project title, application category (`jigs`, `iot`, `mechanical`, `robotics`, `architecture`, `custom_cad`), detailed requirements, target material (`pla-petg`, `abs-pc`, `pa12-cf`, `tough-resin`, `tpu-95a`, `consult`), budget range, and turnaround deadline.
- Database Integration: Direct asynchronous write to Supabase `custom_design_requests` table via `customDesignService.createRequest()` (falls back to a local store when Supabase is not configured).

#### F. Conversion Band & Footer
- High-contrast glowing card with ambient radial gradients highlighting on-demand manufacturing capabilities.
- Complete footer navigation, legal notices, registered company details, and workshop partner contact points.

---

## 3. `ExploreView.tsx` (`/explore`) — Multi-Dimensional Engineering Catalog

### 3.1 Purpose & Architectural Role
`ExploreView.tsx` is the primary catalog navigation center for procurement engineers, makers, and product designers. It allows multi-dimensional faceted searching across categories, materials, price bands, formats, and tags.

### 3.2 Component Props Interface
```typescript
interface ExploreViewProps {
  products: Product[];
  productsLoading?: boolean;
  productsError?: boolean;
  onRetry?: () => void;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  initialCategory?: string;
  initialSearch?: string;
  initialTag?: string;
  onAddToCart?: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onSelectProduct: (product: Product) => void;
  onShowToast?: (msg: string) => void;
}
```

### 3.3 State Management & URL Synchronization
- URL Search Parameters (`?category=...&search=...&tag=...`) are parsed on mount and updated via `useSearchParams`.
- `selectedCategory: string`, `searchQuery: string`, `selectedTag: string`, `selectedMaterial: string`.
- `pricePreset: 'all' | 'under100' | '100to250' | '250to500' | 'above500'`.
- `priceMax: number | null`: Dynamically computed upper price limit derived from genuine catalog items.
- `onlyCustomizable: boolean`: Toggles display of models supporting laser engraving and dimensional scaling.
- `sortBy: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'popular'`.
- `bookmarkedIds: string[]`: Client-side bookmarked model IDs.
- `mobileFilterOpen: boolean`: Controls bottom-sheet drawer for mobile viewport filters.
- `viewMode: 'grid' | 'tech-table'`: Controls display layout.
- `visibleCount: number`: Manages incremental pagination (defaults to 12 items, loads +12 per step).
- `quickViewProduct` / `quickViewInitialOrderType` / `isQuickViewOpen`: Control the `CadQuickViewModal` overlay (digital vs. physical).

### 3.4 Multi-Dimensional Filtering Logic
1. **Keyword Search**: Performs case-insensitive matching across `name`, `designer`, `sku`, `tags`, and `supportedMaterials`.
2. **Category Selection**: Exact match with category ID (`mechanical`, `iot`, `architecture`, `tabletop`, `tools`, `materials`).
3. **Tag Filtering**: Matches specialized engineering tags (`#mechanical`, `#iot`, `#robotics`, `#snap-fit`, `#resin-8k`, `#decor`, `#bán-chạy`, plus a `2/9` campaign tag).
4. **Material Matching**: Filters against `supportedMaterials` array.
5. **Physical Price Range**:
   - `under100`: $< 100,000\text{ VND}$
   - `100to250`: $100,000 - 250,000\text{ VND}$
   - `250to500`: $250,000 - 500,000\text{ VND}$
   - `above500`: $> 500,000\text{ VND}$
   - Custom range slider derived from actual minimum and maximum prices in the catalog.
6. **Sorting Strategy**: Stable sort preserving items without ratings/sales numbers at the bottom when sorting by those dimensions.

### 3.5 Quick-Buy CTA & Workflow
Each grid product card in `ExploreView` features:
- **"Xem & Tải File" (primary)**: Navigates to the product detail page (`onSelectProduct` + `onNavigate('product_detail', { product })`).
- **"Đặt In 3D" (icon-only secondary)**: Validates `product.pricePhysical > 0`, then opens `CadQuickViewModal` with `initialOrderType='physical'`. Inside the overlay the customer selects material, colour swatches, and quantity (there is no layer-height selector); the price is the product list price with no material surcharge.
- **3D Quick-Inspect overlay**: Hover (or always on touch devices) reveals a button that opens the WebGL viewer modal for rapid mesh inspection.
- **Bookmark toggle**: Client-side favourites list (`bookmarkedIds`), with a toast on change.
- **`tune` Customize button** lives inside `CadQuickViewModal` (shown when `product.isCustomizable`) and routes to `/personalize/:productId`.

The technical table view additionally exposes a 1-click **"Tải CAD"** digital add-to-cart via `handleQuickAddDigital` (validates `product.priceDigital > 0`; `licenseType`/`fileFormat` are passed through as declared, never defaulted) and an **"Đặt In 3D"** action. Quick 3D inspection (`3d_rotation`) is available in both views.

### 3.6 Performance & VRAM Optimization
`ExploreView` catalog cards render static images only; WebGL canvases are confined to `ThreeModelViewer.tsx`, which `CadQuickViewModal` mounts on demand. To prevent WebGL context exhaustion and GPU memory leaks:
- `ThreeModelViewer` gates rendering behind `useInViewport(wrapperRef, { rootMargin: '100px', threshold: 0 })`.
- When the viewer leaves the viewport it halts the loop (`cancelAnimationFrame`), calls `disposeHierarchy(scene)` and `renderer.dispose()`, then tears down the context.

---

## 4. `ProductDetailView.tsx` (`/products/:id`) — Technical Inspector & Configurator

### 4.1 Purpose & Architectural Role
The Product Detail Page (PDP) provides deep technical verification of a single CAD model. It implements a Dual Persona Buying Box catering to two distinct engineering needs: downloading raw 3D CAD geometry or ordering fabricated physical prototypes.

### 4.2 Component Props Interface
```typescript
interface ProductDetailViewProps {
  product: Product;
  allProducts?: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}
```

### 4.3 Dual Persona Buying Box Architecture

```
+-------------------------------------------------------------------------+
|                       PRODUCT DETAIL VIEW (PDP)                         |
+------------------------------------+------------------------------------+
|         LEFT: 3D INSPECTION        |        RIGHT: BUYING MATRIX        |
|                                    |                                    |
| [3D View / Gallery Switcher]       | [Product Header, SKU, Designer]    |
| +--------------------------------+ | +--------------------------------+ |
| |                                | | | PERSONA 1: DIGITAL CAD LICENSE | |
| |   Three.js 360° Inspector      | | | - STEP, STL, Native CAD formats| |
| |   - OrbitControls              | | | - License: Commercial / Non-Com| |
| |   - Wireframe toggle           | | | [Mua & Tải File CAD Ngay CTA]  | |
| |   - Grid / Axis helpers        | | +--------------------------------+ |
| |                                | | +--------------------------------+ |
| +--------------------------------+ | | PERSONA 2: PHYSICAL FABRICATION| |
|                                    | | - Material: PLA, PETG, PA-CF... | |
| [Technical Specs Table]            | | - Color Swatches                | |
| - Dimensions: 120 x 85 x 42 mm     | | - Resolution: 0.12 - 0.20 mm    | |
| - Volume / Weight / Infill         | | - Custom Engraving Input        | |
| - Material Compatibility           | | - Quantity & Volume Discounts   | |
|                                    | | [MaterialTechnicalAdvisory]     | |
| [Detailed Description & DFAM]      | | [Đặt Hàng Gia Công In 3D CTA]   | |
+------------------------------------+------------------------------------+
```

#### Persona 1: Digital CAD Asset License
- Targeted at CAD designers, mechanical engineers, and makers with their own 3D printers.
- Displays the declared native CAD file format (`product.cadFormat`, e.g. `STEP`, `STL`, `3MF`; renders `—` when the seller has not declared one).
- License declaration reads `product.licenseType` verbatim; when unset it shows `— (người bán chưa khai báo)` — never a guessed "Commercial License".
- Fixed digital price (`priceDigital`); the CTA is disabled and explained when `priceDigital <= 0`.
- "Mua & Tải File CAD Ngay" adds the digital asset to cart (no shipping fee).

#### Persona 2: Physical 3D Print Configurator
- Targeted at procurement teams, prototyping labs, and clients needing finished mechanical parts.
- **Material Selection**: Dynamic options populated from `product.supportedMaterials` and verified against `materialsList`.
- **Material Technical Advisory (`MaterialTechnicalAdvisory.tsx`)**:
  - Automatically activates when high-temperature, abrasive, or composite materials are selected:
    * `PA-CF` / `PA12` / `Nylon-CF`: Active enclosed heated chamber $\ge 60^\circ\text{C}$, hardened steel nozzle, continuous dry box (< 10% RH), pre-drying 6–8 hours at $80^\circ\text{C}$.
    * `PEEK` / `PEKK`: Extruder $\ge 400^\circ\text{C}$, heated chamber $\ge 90^\circ\text{C}$, bed $\ge 130^\circ\text{C}$, post-process annealing.
    * `PC` (Polycarbonate): Enclosed heated chamber $\ge 60^\circ\text{C}$, extruder $260$–$290^\circ\text{C}$, bed $\ge 100^\circ\text{C}$, pre-drying 6–8h at $75^\circ\text{C}$.
    * `TPU 95A`: Flexible elastomeric filament, requires direct-drive extruder and controlled extrusion speed ($25$–$45\text{ mm/s}$).
    * `Resin Kỹ Thuật` (SLA/DLP photopolymer): Ultrasonic IPA wash and multi-wavelength UV curing chamber.
  - Explains technical cost variance (imported raw material, machine depreciation, pre-heating overhead).
  - Specifies recommended tolerance limits ($\pm 0.10\text{ mm}$).
- **Color Finishes**: Selectable swatches with availability checks.
- **Layer Height Resolution** (3 options):
  * $0.12\text{ mm}$ — Chính xác vi mô / dung sai ngặt
  * $0.16\text{ mm}$ — Tiêu chuẩn kỹ thuật (default)
  * $0.20\text{ mm}$ — In nhanh tiết kiệm
- **Custom Laser Engraving** (only for `isCustomizable` products): Text input with `maxLength={25}`. The fee comes from `pricingConfig.customEngravingFee`; when it is not configured the UI shows `—` and blocks ordering engraving with an explicit message.
- **Quantity & Volume Discount Tiering**: Discounts are read from `pricingConfig.volumeDiscounts` (no hardcoded 5/10/15% ladder). When the tier is active the header shows the configured percentage and label; otherwise no discount is applied.

### 4.4 3D WebGL 360° Inspector Features
- Toggle between WebGL 3D canvas and high-resolution photo gallery.
- OrbitControls supporting continuous rotation, pitch, pan, and smooth zoom.
- Wireframe inspection mode for analyzing triangle distribution and polygon density.
- Reset camera perspective button (`UnifiedCadToolbar` inside `ThreeModelViewer`).
- Four detail tabs below the viewer: Overview & Features, Specs & Tolerances, Reviews (only when a real rating and review count exist), and Slicing Profiles (product-level parameters only).

---

## 5. `Tool3DView.tsx` (`/quote`) — Instant CAD Quoting & Slicing Station

### 5.1 Purpose & Architectural Role
`Tool3DView.tsx` is VCUBE's automated manufacturing engine. Users upload custom CAD models to receive instant geometric validation, printability scoring, mesh defect repair, printer compatibility checks, and a transparent Bill of Materials (B.O.M.) cost breakdown.

### 5.2 Supported CAD Formats & Web Worker Parsing

| Format Extension | Parsing Engine | Execution Environment | Capabilities |
| :--- | :--- | :--- | :--- |
| `.stl` (Binary & ASCII) | `STLLoader` (small) / OpenCASCADE WASM `occt-import-js` (large) | `meshParser.ts` main thread; `cadParser.worker.ts` Web Worker for > 2 MB | Triangles, vertices, bounding box, volume calculation |
| `.step`, `.stp` | OpenCASCADE WASM (`occt-import-js`) | `cadParser.worker.ts` (Web Worker) | B-Rep boundary representation conversion to `BufferGeometry`, exact analytic volume |
| `.iges`, `.igs` | OpenCASCADE WASM (`occt-import-js`) | `cadParser.worker.ts` (Web Worker) | Mechanical surfaces, curves, wireframe tessellation |
| `.obj` | `OBJLoader` | Main thread (`meshParser.ts`) | Mesh groups, materials, surface area |
| `.3mf` | Native 3MF parser (`JSZip` + XML DOM), not `ThreeMFLoader` | Main thread (`meshParser.ts`) | Multi-part assemblies, slicer presets, filament palettes, unit scaling |

### 5.3 WebGL Context Loss Finite State Machine (FSM)
To guarantee stability across mobile GPUs, heavy background tabs, or driver restarts, `ModelViewer3D.tsx` implements a 3-state FSM:

```
                  +--------------------------------+
                  |         STATE 1: ACTIVE        |
                  | (Rendering loop running at 60fps)|
                  +---------------+----------------+
                                  |
               Event: 'webglcontextlost' (preventDefault())
                                  |
                                  v
                  +---------------+----------------+
                  |     STATE 2: CONTEXT_LOST      |
                  | - cancelAnimationFrame()       |
                  | - Display recovery overlay     |
                  +---------------+----------------+
                                  |
             Event: 'webglcontextrestored'
                                  |
                                  v
                  +---------------+----------------+
                  |      STATE 3: RECOVERING       |
                  | - Re-instantiate WebGLRenderer |
                  | - Rebuild Scene, Camera, Lights|
                  | - Re-upload BufferGeometry     |
                  | - Restart animation loop       |
                  +---------------+----------------+
                                  |
                                  v
                         (Transition to ACTIVE)
```

### 5.4 Mesh Validation & Printability Analysis
The engine evaluates 4 real geometric metrics without fabricated fallbacks:
1. **Watertight Integrity**: Confirms closed manifold topology (no naked boundaries or holes).
2. **Non-Manifold Edges**: Identifies edges shared by more than 2 triangles.
3. **Inverted Normal Vectors**: Detects faces oriented inward causing slicing errors.
4. **Minimum Wall Thickness**: Identifies thin features below $0.8\text{ mm}$ that risk print failure.
- **Printability Score**: Dynamically calculated on a scale of $0 - 100$:
  $$\text{Score} = 100 - (\text{not watertight ? } 25 : 0) - \min(30, \text{nonManifold} \times 5) - \min(20, \text{invertedNormals} \times 5) - (\text{thinWall ? } 15 : 0)$$
  If no measurements can be computed, the system displays `Chưa chấm điểm` rather than an arbitrary default.
- **Automated Mesh Repair**: Client-side `autoRepairGeometry()` clones the geometry and recomputes vertex normals. It does **not** weld/merge coincident vertices, so a mesh that was not watertight stays open; the UI re-measures and reports that explicitly rather than claiming a fix.

### 5.5 Modals & Sub-Panels
- `StlVs3mfComparisonModal.tsx`: Visual education contrasting STL (uncolored, unit-ambiguous, prone to manifold holes) with 3MF (XML-compressed, multi-part native, embedded units).
- `StlUnitConfirmModal.tsx`: Prevents scale discrepancies by prompting the user to confirm whether the STL coordinates are millimetres or inches (offering a ×25.4 conversion).
- `ObjectTreePanel.tsx`: Displays hierarchical mesh components for multi-part assemblies.
- `TransformControlsPanel.tsx`: Three tabs — scale (uniform slider $20\%$–$300\%$, presets $50$/$75$/$100$/$125$/$150$/$200\%$), axial rotation ($X, Y, Z$, $0$–$360^\circ$), and bed positioning (translate $X/Y$ within $-100$ to $+100$).
- `ValidationReportPanel.tsx`: Detailed breakdown of mesh health and detected defects.
- `PresetPalettePanel.tsx`: Slicer/filament palette and plate metadata extracted from the uploaded 3MF (empty when the file carries none).
- `UnifiedCadToolbar.tsx`: Orientation presets, wireframe toggle, reset view, and fullscreen.
- `QuoteSummaryPanel.tsx`: B.O.M. quote summary, quantity presets, and entry points to `MachineComparisonModal.tsx` and `InternalCostBreakdownModal.tsx`. The internal breakdown is computed by `pricingEngine` (material, machine time, labour minutes, failure reserve, markup, and platform fee) rather than a single flat formula.

---

## 6. `PersonalizeView.tsx` (`/personalize`) — Laser Engraving & Customization

### 6.1 Purpose & Architectural Role
`PersonalizeView.tsx` provides an interactive customization studio allowing clients to engrave serial numbers, company logos, or custom text onto physical 3D models before manufacturing.

### 6.2 Capabilities & Parameters
- **Live 3D Preview (`PersonalizeModelViewer3D`)**: Renders custom text geometry onto the 3D model surface in real time.
- **Text & Font Settings**: Text input capped at 24 characters; font choices `JetBrains Mono`, `Inter`, `Roboto Mono`; font size slider $6$–$24\text{ mm}$; engraving depth modes `laser` / `embossed` / `recessed`; alignment `center` / `top-left` / `bottom-right`.
- **Vector Logo Upload**: Optional `.svg` / `.dxf` / `.png` upload with a `customLogoUploadFee` (shows `—` and blocks the fee line when not configured).
- **Colour & Finish Selection**: Populated from the product's declared `colors` and the real `materials` list.
- **Exploded View**: A lid-explode slider (view-only, does not change the printed part).
- **Quantity & Package Tiers**: Quantity presets and `economy` / `standard` / `express` package tiers driven by `economyDiscountPercent` and `expressRushSurchargePercent`.
- **Pricing Integration**: `price_physical + engraving fee + logo fee`, with volume discounts read from `pricingConfig.volumeDiscounts` and the package multiplier. When a required pricing parameter is missing the total renders `—` and the order CTA is locked (no fabricated fallbacks).

---

## 7. `LoginView.tsx` & `RegisterView.tsx` — Authentication & Roles

### 7.1 Architecture & Security Rules
Authentication is handled via Supabase Auth client (`src/backend/supabase/client.ts`). In accordance with project security policies:
- User roles are resolved strictly from `public.user_profiles.role` via `AuthContext.resolveDbRole()`.
- Client-side code does NOT infer administrative or workshop privileges from user emails or client metadata.
- Supported roles: `admin`, `lab` / `workshop` (MES lab), `designer` (creator studio), `customer`.

### 7.2 Features
- **Email & Password Authentication**: Standard login and registration flows with sanitized inputs and comprehensive error feedback. Registration always creates a `customer` role server-side; creator/lab roles are granted later from the DB.
- **Google OAuth Integration**: Gated by the `ENABLE_GOOGLE_OAUTH` flag in `AuthModal.tsx` — currently `false`, so the Google button is not rendered.
- **Password Reset**: Gated by `ENABLE_PASSWORD_RESET` — currently `false`; login shows a static "contact support" hint instead of a reset flow.
- **Password Strength Analyzer**: Real-time evaluation of password complexity (length, numbers, special characters) with visual color-coded meter (YẾU / TRUNG BÌNH / MẠNH).
- **Session Restoration**: Handles deep links seamlessly through URL `redirectTo` parameters without prematurely dropping authenticated sessions during page reloads.
