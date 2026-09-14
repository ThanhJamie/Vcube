# VCUBE Specification: Storefront & Public Engineering Pages

## 1. System Scope & Architecture Overview

The Storefront & Public Engineering views of VCUBE represent the primary customer touchpoints for industrial 3D printing and digital CAD model acquisition. Designed as a high-precision Modern Engineering SaaS application, these interfaces combine WebGL 3D visualization, instant parametric quoting, multi-dimensional search, and dual-persona commercial flows (Digital CAD License vs. Physical On-Demand Fabrication).

### Route Table & Component Hierarchy

| Path | Primary Component | Lazy Loaded | Access Guard | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `HomeView.tsx` | No | Public | Hero CAD Dropzone, Interactive 3D Chassis, Service Showcase, Catalog, Material Matrix, Custom Idea Form |
| `/explore` | `ExploreView.tsx` | No | Public | Multi-dimensional faceted filter, Dual CTA Quick-Buy, Tech Table vs. Grid View, Bookmarks |
| `/products/:productId` | `ProductDetailView.tsx` | No | Public | Dual-Persona Buying Box, 360° 3D Inspector, Material Configurator, Material Technical Advisory |
| `/quote` (alias `/tool-3d`) | `Tool3DView.tsx` | Yes (`React.lazy`) | Public | Instant WebAssembly CAD parser, 3D Mesh Repair, Slicing Analysis, B.O.M. Cost Calculator |
| `/personalize` | `PersonalizeView.tsx` | No | Public | 3D Text Laser Engraving, Dimensional Resizing, Live 3D Surface Inspection |
| `/auth/login` (alias `/login`) | `LoginView.tsx` | No | Public | Email/Password Auth, Google OAuth, Role-based Redirection |
| `/auth/register` (alias `/register`) | `RegisterView.tsx` | No | Public | Account Registration, Password Strength Meter, Email Verification Notice |

---

## 2. `HomeView.tsx` (`/`) — Landing & Technical Showcase Hub

### 2.1 Purpose & Architectural Role
`HomeView.tsx` serves as the high-conversion industrial landing page. It immediately establishes VCUBE's engineering credibility through interactive 3D WebGL models, instant CAD upload mechanisms, live material specifications, and verified tolerance commitments.

### 2.2 Component Props Interface
```typescript
interface HomeViewProps {
  products: Product[];
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
- `selectedCategory: string`: Category filter slug (`'all'`, `'mechanical'`, `'robotics'`, `'iot'`, `'fixtures'`, etc.).
- `selectedTag: string`: Filter tag selection (`'all'`, `'2/9'`, `'mechanical'`, `'iot'`, `'robotics'`, `'snap-fit'`).
- `catalogViewMode: 'grid' | 'tech-table'`: Toggles visual product cards vs. high-density engineering data table.
- `heroModel: 'gear' | 'drone' | 'box' | 'arch'`: Selects the active 3D model in the Hero WebGL chassis.
- `isDraggingFile: boolean`: Visual drag-over feedback for the CAD file dropzone.
- `quickViewProduct: Product | null`: Manages the active product inspected in `CadQuickViewModal`.
- `isQuickViewOpen: boolean`: Controls visibility of the 3D inspect modal.
- `isCustomIdeaModalOpen: boolean`: Controls visibility of the `CustomIdeaRequestModal`.

### 2.4 Detailed Section Breakdown

#### A. Broadcast Bar & Operational Highlights
A sleek top banner (`bg-surface-inverse text-on-inverse`) displaying certified manufacturing metrics:
- ISO-standard tolerances ($\pm 0.10\text{ mm}$ reference)
- Multi-technology capacity: Industrial FDM, SLA Resin, SLS
- Fast nationwide delivery across Vietnam (Hanoi, Da Nang, Ho Chi Minh City hubs)

#### B. Hero CAD Dropzone & Interactive 3D Chassis
- **Dropzone Station**: Supports drag-and-drop or file browsing for CAD files (`.stl`, `.step`, `.stp`, `.iges`, `.obj`, `.3mf`). Dragging a file highlights the container with an active accent border. Dropping a file immediately passes the `File` object to `/quote` via `onNavigate('quote', { uploadedFile: file })`.
- **3D Chassis WebGL Viewer**: Powered by `ThreeModelViewer.tsx` (Three.js 0.185). Features an interactive 4-button selector:
  1. *Mechanical Spur Gear (`gear`)*: Module 2.5, $95\times 95\times 22\text{ mm}$, PA12-CF / Nylon.
  2. *Drone Arm (`drone`)*: Carbon-fiber reinforced frame, $160\times 42\times 18\text{ mm}$, PLA-CF.
  3. *IoT Enclosure (`box`)*: IP65 water-resistant electronics housing, $115\times 80\times 38\text{ mm}$, PETG.
  4. *FEM Arch Truss (`arch`)*: Topology-optimized load-bearing bracket, $130\times 65\times 50\text{ mm}$, High-Temp Resin.
- **Controls & Actions**: Full 360° rotation via OrbitControls, zoom, and a direct CTA "Báo Giá Mẫu Này" which loads the selected model geometry directly into the Quoting Tool.

#### C. Engineering Services Showcase (`ServiceShowcaseSection.tsx`)
A dedicated section detailing VCUBE's 4 core service capabilities:
1. **Gia Công In 3D Công Nghiệp Tức Thì (`rapid_print`)**: Automated slicing, volume calculations, FDM/SLA/SLS fabrication.
2. **Thiết Kế CAD 3D & Hiện Thực Ý Tưởng (`custom_idea`)**: Conversion of 2D drafts, hand sketches, or broken parts into parametric STEP/STL files with full NDA protection.
3. **Kho Bản Vẽ CAD Cơ Khí Tuyển Chọn (`cad_catalog`)**: Pre-validated, watertight 3D models with commercial licensing.
4. **Tư Vấn Tối Ưu Hóa DFM & Đo Kiểm QC (`qc_advisory`)**: Design for Additive Manufacturing analysis, coordinate measuring machine (CMM) verification.

#### D. Industrial CAD Catalog Hub (`#browse-cad-catalog`)
- **Filter Command Strip**: Search bar with clear button, horizontal scroll category filter chips with live item counts, quick engineering tag pills.
- **Visual Card Grid**:
  - Image frame with 4:3 aspect ratio and hover overlay triggering instant 360° 3D inspection (`CadQuickViewModal`).
  - Strict Data Honesty compliance: print time and ratings only render when genuine non-null data exists; otherwise display `—` or "Chưa có đánh giá".
  - Dual Pricing Bar: "File Số (STL/STEP)" vs. "In Vật Lý (FDM/Resin)".
  - Dual CTA: "Mua File CAD" (1-click add to cart via `handleQuickAddDigital`) and "Đặt In" (navigates to physical configurator).
  - Customizable items expose a dedicated `tune` button routing to `/personalize`.
- **Technical Table View**: Tabular presentation providing part thumbnail, name, designer, SKU, category, bounding box dimensions, print time, digital license price, physical print price, and 3D preview trigger.

#### E. Technical Material Comparison Matrix (`MaterialComparisonMatrix.tsx`)
A comprehensive engineering table comparing physical and thermal properties across all catalog materials:
- Materials covered: PLA Tough, PETG Engineering, ABS Industrial, PA12-CF (Nylon Carbon Fiber), TPU 95A Flexible, Standard UV Resin, High-Temp Engineering Resin.
- Comparison metrics: Tensile Strength (MPa), Heat Deflection Temperature ($^\circ\text{C}$ displayed inside centered, non-overflowing badge pills), Impact Resistance, Elongation at Break, Technology (FDM/Resin/SLS), Recommended Applications.

#### F. Custom Service by Idea Section & `CustomIdeaRequestModal.tsx`
Provides an accessible entryway for customers who do not possess CAD files:
- Three-stage visual workflow: Phác thảo ý tưởng $\rightarrow$ Dựng mô hình 3D tham số $\rightarrow$ In mẫu thử nghiệm & Bàn giao.
- Form modal capturing: Client name, phone/Zalo, email, company, project title, service type (`custom_cad`, `reverse_engineering`, `dfm_optimization`), detailed requirements, target material, budget range, and turnaround deadline.
- Database Integration: Direct asynchronous write to Supabase `custom_design_requests` table via `customDesignService.createRequest()`.

#### G. Conversion Band & Footer
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
- `hydrationWindowOpen: boolean`: Short 1200ms hydration timer preventing premature empty-state flashes before Supabase data resolves.

### 3.4 Multi-Dimensional Filtering Logic
1. **Keyword Search**: Performs case-insensitive matching across `name`, `designer`, `sku`, and `tags`.
2. **Category Selection**: Exact match with category ID (`mechanical`, `iot`, `robotics`, `fixtures`, `art_decor`, `accessories`).
3. **Tag Filtering**: Matches specialized engineering tags (including national celebratory tag `#2/9`, `#mechanical`, `#iot`, `#snap-fit`).
4. **Material Matching**: Filters against `supportedMaterials` array.
5. **Physical Price Range**:
   - `under100`: $< 100,000\text{ VND}$
   - `100to250`: $100,000 - 250,000\text{ VND}$
   - `250to500`: $250,000 - 500,000\text{ VND}$
   - `above500`: $> 500,000\text{ VND}$
   - Custom range slider derived from actual minimum and maximum prices in the catalog.
6. **Sorting Strategy**: Stable sort preserving items without ratings/sales numbers at the bottom when sorting by those dimensions.

### 3.5 Quick-Buy Dual CTA & Workflow
Each product card in `ExploreView` features two independent, high-visibility actions:
- **"Tải File CAD" (Buy Digital License)**:
  - Validates `product.priceDigital > 0`.
  - Instantly constructs a digital `CartItem` (`type: 'digital'`, `licenseType: product.licenseType || 'Standard Commercial'`).
  - Calls `useCartStore.getState().addToCart(item)` and triggers an interactive toast with an "Undo" action.
  - User remains in the catalog without being forced through a full PDP navigation.
- **"Đặt In 3D" (Order Physical Fabrication)**:
  - Validates `product.pricePhysical > 0`.
  - Opens `CadQuickViewModal` with `initialOrderType='physical'`, allowing the customer to select material, layer height, and quantity directly in an overlay.
  - Alternatively navigates directly into the PDP physical configuration tab.
- **Customization Pill (`tune`)**: For items with `isCustomizable: true`, routes to `/personalize/:productId`.
- **Quick 3D Inspection Icon (`3d_rotation`)**: Opens the WebGL viewer modal for rapid mesh inspection.

### 3.6 Performance & VRAM Optimization
To prevent WebGL context exhaustion and GPU memory leaks when browsing hundreds of 3D cards:
- Canvas elements wrap Three.js rendering inside an `IntersectionObserver` threshold ($\pm 100\text{px}$).
- When a product card leaves the viewport, the render loop is halted (`cancelAnimationFrame`), textures are unbound, and geometries are disposed via `disposeHierarchy()`.

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
| - Dimensions: 120 x 85 x 42 mm     | | - Resolution: 0.12 - 0.28 mm    | |
| - Volume / Weight / Infill         | | - Custom Engraving Input        | |
| - Material Compatibility           | | - Quantity & Volume Discounts   | |
|                                    | | [MaterialTechnicalAdvisory]     | |
| [Detailed Description & DFAM]      | | [Đặt Hàng Gia Công In 3D CTA]   | |
+------------------------------------+------------------------------------+
```

#### Persona 1: Digital CAD Asset License
- Targeted at CAD designers, mechanical engineers, and makers with their own 3D printers.
- Displays native CAD file format (`STEP`, `STL`, `SLDPRT`, `3MF`).
- Clear license declaration: `Commercial License`, `Personal Use Only`, or explicit unassigned notice.
- Fixed digital price (`priceDigital`).
- "Mua & Tải File CAD Ngay" adds the digital asset to cart with 0 shipping fee.

#### Persona 2: Physical 3D Print Configurator
- Targeted at procurement teams, prototyping labs, and clients needing finished mechanical parts.
- **Material Selection**: Dynamic options populated from `product.supportedMaterials` and verified against `materialsList`.
- **Material Technical Advisory (`MaterialTechnicalAdvisory.tsx`)**:
  - Automatically activates when high-temperature, abrasive, or composite materials are selected:
    * `PA12-CF` / `Nylon-CF`: Requires hardened steel nozzle ($\ge 0.4\text{ mm}$), active chamber $\ge 60^\circ\text{C}$, drying at $80^\circ\text{C}$ for 6 hours.
    * `PEEK`: Extreme chemical resistance, chamber temperature $\ge 90^\circ\text{C}$, nozzle $\ge 400^\circ\text{C}$.
    * `PC` (Polycarbonate): High impact strength, requires enclosed chamber to prevent layer delamination.
    * `TPU 95A`: Flexible elastomeric filament, requires direct-drive extruder and low print speed ($\le 30\text{ mm/s}$).
    * `Resin Kỹ Thuật` (High-Temp / Tough Resin): Post-curing ultrasonic alcohol bath and UV chamber curing.
  - Explains technical cost variance (imported raw material, machine depreciation, pre-heating overhead).
  - Specifies recommended tolerance limits ($\pm 0.10\text{ mm}$).
- **Color Finishes**: Selectable swatches with availability checks.
- **Layer Height Resolution**:
  * $0.12\text{ mm}$ — Fine Mechanical Detail
  * $0.16\text{ mm}$ — Engineering Standard (Default)
  * $0.20\text{ mm}$ — Rapid Functional Prototyping
  * $0.28\text{ mm}$ — Rough Draft / Fixtures
- **Custom Laser Engraving**: Text input field with character limit. Integrates `customEngravingFee` from pricing configuration.
- **Quantity & Volume Discount Tiering**:
  * 1 - 4 units: Standard unit price
  * 5 - 9 units: 5% volume discount
  * 10 - 19 units: 10% volume discount
  * 20+ units: 15% volume discount

### 4.4 3D WebGL 360° Inspector Features
- Toggle between WebGL 3D canvas and high-resolution photo gallery.
- OrbitControls supporting continuous rotation, pitch, pan, and smooth zoom.
- Wireframe inspection mode for analyzing triangle distribution and polygon density.
- Reset camera perspective button.

---

## 5. `Tool3DView.tsx` (`/quote`) — Instant CAD Quoting & Slicing Station

### 5.1 Purpose & Architectural Role
`Tool3DView.tsx` is VCUBE's automated manufacturing engine. Users upload custom CAD models to receive instant geometric validation, printability scoring, mesh defect repair, printer compatibility checks, and a transparent Bill of Materials (B.O.M.) cost breakdown.

### 5.2 Supported CAD Formats & Web Worker Parsing

| Format Extension | Parsing Engine | Execution Environment | Capabilities |
| :--- | :--- | :--- | :--- |
| `.stl` (Binary & ASCII) | `STLLoader` / Custom Buffer Reader | `meshParser.ts` (Worker & Main) | Triangles, vertices, bounding box, volume calculation |
| `.step`, `.stp` | OpenCASCADE WASM (`occt-import-js`) | `cadParser.worker.ts` (Web Worker) | B-Rep boundary representation conversion to `BufferGeometry`, exact analytic volume |
| `.iges`, `.igs` | OpenCASCADE WASM (`occt-import-js`) | `cadParser.worker.ts` (Web Worker) | Mechanical surfaces, curves, wireframe tessellation |
| `.obj` | `OBJLoader` | Worker & Main | Mesh groups, materials, surface area |
| `.3mf` | `ThreeMFLoader` | Main Thread | Multi-material, color metadata, unit scaling |

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
- **Automated Mesh Repair**: Client-side geometry healing via `autoRepairGeometry()` to merge coincident vertices and recalculate face normals.

### 5.5 Modals & Sub-Panels
- `StlVs3mfComparisonModal.tsx`: Visual education contrasting STL (uncolored, unit-ambiguous, prone to manifold holes) with 3MF (XML-compressed, multi-part native, embedded units).
- `StlUnitConfirmModal.tsx`: Prevents scale discrepancies by prompting the user to confirm whether coordinate values represent millimeters, centimeters, or inches.
- `ObjectTreePanel.tsx`: Displays hierarchical mesh components for multi-part assemblies.
- `TransformControlsPanel.tsx`: Scale factor ($10\% - 500\%$), axial rotation ($X, Y, Z$), and bed alignment.
- `ValidationReportPanel.tsx`: Detailed breakdown of mesh health and detected defects.
- `QuoteSummaryPanel.tsx` & `InternalCostBreakdownModal.tsx`: B.O.M. pricing summary:
  $$\text{Total Price} = (\text{Material Cost} + \text{Machine Time Cost} + \text{Post-Processing}) \times (1 + \text{Platform Fee \%})$$

---

## 6. `PersonalizeView.tsx` (`/personalize`) — Laser Engraving & Customization

### 6.1 Purpose & Architectural Role
`PersonalizeView.tsx` provides an interactive customization studio allowing clients to engrave serial numbers, company logos, or custom text onto physical 3D models before manufacturing.

### 6.2 Capabilities & Parameters
- **Live 3D Preview (`PersonalizeModelViewer3D`)**: Renders custom text geometry onto the 3D model surface in real time.
- **Text & Font Settings**: Text string input (e.g. `PROTOTYPE-01`), font styles (Monospace Tech, Clean Sans-Serif, Stencil), character depth ($0.5\text{ mm} - 2.0\text{ mm}$), and font size.
- **Color & Finish Selection**: Aligns with available material swatches.
- **Dimensional Rescaling**: Uniform scaling slider ($80\% - 150\%$) with live dimension readouts ($X \times Y \times Z\text{ mm}$).
- **Pricing Integration**: Computes list price + custom engraving fee + scale multiplier into the final physical cart item.

---

## 7. `LoginView.tsx` & `RegisterView.tsx` — Authentication & Roles

### 7.1 Architecture & Security Rules
Authentication is handled via Supabase Auth client (`src/backend/supabase/client.ts`). In accordance with project security policies:
- User roles are resolved strictly from `public.user_profiles.role` via `AuthContext.resolveDbRole()`.
- Client-side code does NOT infer administrative or workshop privileges from user emails or client metadata.
- Supported roles: `admin`, `workshop` (MES lab), `designer` (creator studio), `customer`.

### 7.2 Features
- **Email & Password Authentication**: Standard login and registration flows with sanitized inputs and comprehensive error feedback.
- **Google OAuth Integration**: Controlled via `ENABLE_GOOGLE_OAUTH` configuration flag.
- **Password Strength Analyzer**: Real-time evaluation of password complexity (length, numbers, special characters) with visual color-coded meter (YẾU / TRUNG BÌNH / MẠNH).
- **Session Restoration**: Handles deep links seamlessly through URL `redirectTo` parameters without prematurely dropping authenticated sessions during page reloads.
