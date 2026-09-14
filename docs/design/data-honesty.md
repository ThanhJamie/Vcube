# VCUBE data-honesty inventory

## Decision

1. The app must never present an invented value as a measurement: every number shown to a user is either computed from the user's own input/file, read from a real backend/device, or not shown at all.
2. Anything unknown must render as unknown (`—`) or carry an explicit `estimated` / `sample` / `proxy` label attached to the value itself, not only to a surrounding page.
3. A proxy geometry may be displayed only when the UI states it is a proxy; a proxy may never be priced, QC-certified, hashed, signed, or passed off as a parsed CAD solid.

---

## Findings

One row per instance, verified by reading the source. Severity key — **Critical**: a customer can be charged/quoted on an invented number, or sees another person's data. **High**: a trust or quality claim shown to a customer is false. **Medium**: an internal/admin surface shows invented numbers. Each group is sorted by severity.

### Mesh parsing & DFM

| # | ID | file:line | what is fabricated | where the user sees it | severity | honest replacement |
|---|---|---|---|---|---|---|
| 1 | MP-01 | `src/frontend/views/Tool3DView.tsx:319-370` | On parse failure a "recovery" `AnalysisFile` is invented: dimensions 85.0×55.0×30.0, volume 42.5 cm³, surfaceArea 168.0, triangleCount 14200, isWatertight true, minWallThickness 1.5, score 92, overhang 5.0, a hardcoded sha256, plus `customGeometry: new THREE.BoxGeometry(85, 30, 55)`; the toast announces a safe recovered CAD model | `/quote` after any failed upload; the invented volume is fed to `calculateDetailedPricing`, so the customer can add it to the cart at a real price | Critical | Parse failure = no file row. Show the parse-failure panel, set `status: 'parse_failed'`, metrics `null`, and block quoting (route to manual review). |
| 2 | MP-02 | `src/utils/meshParser.ts:1345-1387` | STEP/STP/IGES are never parsed, yet a merged `BoxGeometry` + `CylinderGeometry` "B-Rep Solid CAD" proxy is returned with dimensions 92.0×72.0×34.0, volume 54.2, surfaceArea 215.0, minWallThickness 2.4, isWatertight true | `/quote` upload of a real `.step` file: shows a B-Rep solid, a full DFM report and a price; tagged `STEP // Đã quét Mesh 3D` at `Tool3DView.tsx:274` | Critical | Return `unsupportedFormat` plus a proxy-labelled tessellation preview. Metrics `—`, `isProxy: true`, quoting disabled until a real tessellation/validator runs. |
| 3 | MP-03 | `src/utils/meshParser.ts:1194-1203, 1210-1214, 1234-1240, 1251-1262` | STL parse failure or degenerate geometry silently substitutes `new THREE.BoxGeometry(85, 32, 60)`, dimensions 85/60/32, volume = bbox × 0.42, surfaceArea from the bbox formula, triangleCount `\|\| 12000` | `/quote` STL upload where the file is corrupt or misnamed; the toast at `Tool3DView.tsx:313` reports the invented triangle count as engine output | Critical | Throw a typed parse error; show the failure panel; never substitute a box for a user file that will be priced. |
| 4 | MP-04 | `src/frontend/views/Tool3DView.tsx:261-262`; consumed by `src/utils/pricingEngine.ts:132` | Printability score is a constant (`isWatertight ? 94 : 76`) and `level` is derived from it; the score then changes the failure-reserve rate (+6%) inside the quote | `/quote` DFM badge `94/100 Score`; the price varies with an invented score | Critical | Compute the score from real checks, or return `null` and render `— / Chưa đủ dữ liệu để tính điểm`; an unknown score must not alter price. |
| 5 | MP-05 | `src/utils/meshParser.ts:1030-1036, 1052-1053` | The worker path substitutes dimensions 85.0/60.0/32.0, volume 25.0 cm³ and surfaceArea 120.0 cm² whenever the worker returns zeros | `/quote` for STL files > 2 MB: dimensions, volume and price built on those numbers | Critical | Treat zeroed worker output as a parse failure; no metrics, no quote. |
| 6 | MP-06 | `src/utils/meshParser.ts:910-911, 1141-1142, 1234-1240, 1312-1313` | Volume and surface area are estimated from the bounding box (×0.45, ×0.42, ×0.40, ×0.30) when the real mesh integral is missing, and the estimate becomes the pricing volume | `/quote` volume and price readout for 3MF, OBJ and fallback STL | Critical | Mark the value `estimated (bbox)`, exclude it from auto-quoting, and require a slicer volume before an order is created. |
| 7 | MP-07 | `src/frontend/views/Tool3DView.tsx:272, 885` | `overhangPercentage: 6.8` is a literal, and the report falls back to `?? 6.8` when the field is absent | `/quote` Overhang Angle tile `6.8% cần Support` | High | Use the computed `analyzeMeshDefects` value or `—`; never default to a safe-looking number. |
| 8 | MP-08 | `src/frontend/views/Tool3DView.tsx:177-226`; `src/utils/meshParser.ts:247-255` | "Tự Động Sửa Lưới Mesh" clones the geometry and calls `computeVertexNormals()`, then asserts `isWatertight: true`, `nonManifoldEdges: 0`, `invertedNormals: 0`, `minWallThickness: 1.6`, score 98, and toasts that all non-manifold errors and flipped normals were fixed | `/quote` after clicking auto-repair | High | Re-run the real defect analysis afterwards and report the measured before/after; if only normals are recomputed, label the action "recompute normals only". |
| 9 | MP-09 | `src/utils/meshParser.ts:260-292`; `src/frontend/views/Tool3DView.tsx:160-173` | "Split shells" is `simulateSplitShells`: two parts with triangle counts ×0.58 / ×0.42 and volumes ×0.6 / ×0.4, named `[Vỏ Thân Chính 01]` / `[Lõi Cơ Khí 02]`; the UI reports a successful split and switches the format tag to 3MF | `/quote` part list and plate view | High | Run connected-component analysis on the index buffer; if none exists, disable the action instead of inventing a split. |
| 10 | MP-10 | `src/utils/meshParser.ts:236`; displayed at `src/frontend/components/tool3d/ValidationReportPanel.tsx:261` | `invertedNormalsCount = boundaryEdges > 0 ? Math.min(12, boundaryEdges) : 0` counts every open boundary as an inverted normal and caps the count at 12 | `/quote` Level-2 report `Vector Pháp Tuyến Nghịch (Inverted): N faces` | High | Count inverted normals from face winding versus outward orientation; report open boundaries as their own metric. |
| 11 | MP-11 | `src/frontend/views/Tool3DView.tsx:279, 360`; `src/frontend/components/tool3d/ValidationReportPanel.tsx:290`; `src/data/mockData.ts:1051, 1219, 1274` | A fixed 64-hex literal is displayed as the file's hash; the report fallback `e3b0c442…b7852b855` is the SHA-256 of the empty string, and no hashing code exists in the repo | `/quote` Level-1 `Mã băm SHA-256`; the sample benchmark files | High | Compute the digest over the uploaded bytes (`crypto.subtle.digest`) or render `—`. |
| 12 | MP-12 | `src/utils/meshParser.ts:962-965, 1154-1157, 1325-1328` | The native 3MF, ThreeMFLoader-fallback and OBJ paths hardcode `isWatertight: true`, `nonManifoldEdges: 0`, `invertedNormals: 0` and `minWallThickness: 1.6/1.8/1.5` without ever running `analyzeMeshDefects` | `/quote` Watertight / wall-thickness tiles show a green `100% Watertight` | High | Run `analyzeMeshDefects` on the parsed group, or report `not analysed`. |
| 13 | MP-13 | `src/utils/meshParser.ts:608-609, 618-619, 937-940` | Filament defaults `\|\| 42.7` g / `\|\| 14.1` m, plate `predictionFormatted \|\| '45m'` and plate filament `volume × 1.24` are produced when the 3MF carries no slicer data, then displayed as slicer preset output | `/quote` Slicer preset panel (grams, print time) | High | Render `—` / "không có dữ liệu slicer trong file" and stop labelling derived guesses as Bambu Studio / OrcaSlicer preset data. |
| 14 | MP-14 | `src/utils/meshParser.ts:406, 428, 470, 556, 578-589` | `costPerKg` is invented from name substrings (`type.includes('CF') ? 550000 : type.includes('PETG') ? 350000 : 300000`; fallback palette 300000/350000) and presented as the material purchase price | Admin cost breakdown for a 3MF upload (`InternalCostBreakdownModal` material row) | Medium | Look the price up in the materials table by id; if the filament is unknown, show `—` and require the operator to map it. |
| 15 | MP-15 | `src/frontend/components/tool3d/ValidationReportPanel.tsx:187`; value from `src/frontend/views/Tool3DView.tsx:270` | `recommendedOrientation` is a constant string presented as "Hướng đặt phôi in đề xuất bởi AI Slicer" | `/quote` Level-3 tab | Medium | Drop the AI attribution; compute a real orientation or label it "gợi ý mặc định". |
| 16 | MP-16 | `src/frontend/views/Tool3DView.tsx:274, 355-361` | Tags `STEP // Đã quét Mesh 3D` and `Tự Động Phục Hồi An Toàn`, plus `isUnitConfirmed: true` on the fabricated proxy, assert a scan and a unit confirmation that never happened | `/quote` file tag and unit badge | Medium | Tag proxies `PROXY — chưa phân tích`; never preset unit confirmation. |
| 17 | MP-17 | `src/utils/meshParser.ts:1132-1133, 1304, 1312` | Per-part `triangleCount \|\| 10000` / `\|\| 38000` / `\|\| 16000` and per-part `volumeCm3` from bbox × 0.3 are invented and listed per component | `/quote` part list and plate breakdown | Medium | Compute per-part counts from each child geometry; unknown parts render `—`. |
| 18 | MP-18 | `src/ai/services/modelAnalysisService.ts:16, 76, 99, 104` | Heuristic score starts at 92 and is clamped to `Math.max(50, Math.min(98, …))`; `supportSavingsPercent: 25` and the summary sentence are fixed, while warnings claim detected defects. Currently reachable only through the excluded `src/app/api/ai/analyze/route.ts` | Would surface wherever the AI report is wired in | Medium | Return the raw heuristic labelled `heuristic` with no clamp, or delete the service until a real analyser exists. |

### Pricing & cost

| # | ID | file:line | what is fabricated | where the user sees it | severity | honest replacement |
|---|---|---|---|---|---|---|
| 1 | PC-01 | `src/frontend/components/tool3d/QuoteSummaryPanel.tsx:168-176`; `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx:118-176` | A customer-facing "Giá Vốn Xưởng" button opens the internal costing modal (cost price, gross margin, batch profit, full cost table) with no role check, while the modal is labelled "Chỉ Dành Cho Kỹ Sư & Quản Đốc" | `/quote` quote panel, for any signed-out visitor | Critical | Remove the entry point from the customer surface; expose it only under `/admin/**` behind server-verified role authorization. |
| 2 | PC-02 | `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx:48-67, 272-325`; `src/frontend/components/tool3d/QuoteSummaryPanel.tsx:500-503` | The price-override form claims a mandatory audit trail ("Bắt buộc theo quy định Audit Log nội bộ") but only calls a client callback that rewrites the displayed price and raises a success toast; nothing is persisted or authorized | `/quote` — a visitor can lower the unit price of the order they are about to place | Critical | Server-side override endpoint with role check, reason, actor and timestamp persisted; the client renders only the server-returned price. |
| 3 | PC-03 | `src/frontend/views/CheckoutView.tsx:34, 118, 425-437`; `src/backend/supabase/database.ts:264` | Choosing VietQR/VNPAY sets `isPaid: true` and stores `payment_status: 'paid'` with no gateway call; the transfer box advertises "Tự động duyệt" against a hardcoded account (Vietcombank 1029384756) | `/checkout`, `/order-success`, invoices, and every admin revenue figure | Critical | Create orders as `awaiting_payment`; only a verified gateway webhook or an operator confirmation may set `paid`. |
| 4 | PC-04 | `src/frontend/components/InvoiceModal.tsx:17-19, 35, 72, 82-84, 150` | The invoice invents VAT 8% on top of the order total, always stamps "✓ ĐÃ THANH TOÁN", prints a hardcoded SHA-256 "digital signature" with "e-Invoice Validated", and a hardcoded company tax code 0108924881 | Invoice modal opened from customer orders and admin order rows | Critical | Print only recorded amounts; VAT only when configured and collected; the payment badge reads `order.payment.isPaid`; no signature unless a real signing service produced it. |
| 5 | PC-05 | `src/utils/pricingEngine.ts:82, 87, 92, 132` | Quote inputs are invented as defaults: `Math.max(5, …)` grams floor, `materialCostPerGram` fallback 850 đ, print hours `volume × 3.8 / (layer × 100)`, and a failure reserve keyed to the fabricated printability score | `/quote` price, cart, checkout total | High | Require a real slice or preset, or mark the whole quote `estimate` and list its inputs; never silently floor or default a cost input. |
| 6 | PC-06 | `src/frontend/components/tool3d/InstantQuoteWidget.tsx:150-160` | `baseUnitPrice = calculationResult ? … : 150000` — a literal price is displayed as the quote when no calculation exists; the discount tiers here (25/15/10/5%) are duplicated and diverge from `pricingConfig.volumeDiscounts` | Instant quote widget price and total | High | Render `—` / "Chưa đủ thông số" and read discount tiers from the pricing config. |
| 7 | PC-07 | `src/backend/services/quoteVerifier.ts:35-38, 110-139, 222-237`; `src/frontend/components/tool3d/InstantQuoteWidget.tsx:25-31, 163-214` | A "signed" quote is built from a mock `AnalysisFile` with hardcoded triangleCount 25000, surfaceArea 100, minWallThickness 1.2, score 95, overhang 5 and isWatertight true; `quoteId` and `nonce` use `Math.random()`, and the HMAC secret falls back to a literal bundled into the client | Quote token/QR presented as tamper-proof | High | Sign only verified payloads; keep the secret server-side; label quotes `unverified estimate` until a verified quote service signs them. |
| 8 | PC-08 | `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx:92, 250-267` | The formula block hardcodes `× 1.35`, `1 − 0.155`, "15.5% Tổng", "Platform 8% + Cổng TT 2.5% + Royalty 5%" and the 65,000 đ/h labour rate instead of reading the active config | Internal cost modal formula text | Medium | Render every number from the active `InkiriCostFormulaConfig`. |
| 9 | PC-09 | `src/frontend/views/DesignerDashboardView.tsx:162-171` | "Auto estimate price" invents 125 g of PETG, 3.5 machine-hours, 35,000 đ/h and 30,000 đ labour, writes the result into the sell-price field, and toasts that it came from the "định mức Inkiri" | `/designer` product form | Medium | Ask for real weight and print time (or run the pricing engine) before filling the price; label the value as a placeholder. |
| 10 | PC-10 | `src/utils/pricingEngine.ts:247-249` | The "quick estimate range" multiplies the price by an invented 0.9 / 1.18 band | `/quote` "1. Ước Tính Hình Học Sơ Bộ" | Medium | Label it `ước tính ±…%`, derive the band from configured tolerances, and state that it is not a quote. |

### Orders & tracking

| # | ID | file:line | what is fabricated | where the user sees it | severity | honest replacement |
|---|---|---|---|---|---|---|
| 1 | OT-01 | `src/App.tsx:191, 210` | `orders.find(o => o.id === orderId) \|\| activeOrder \|\| orders[0]` — an unknown or mistyped `/tracking/:orderId` or `/order-success/:orderId` renders whichever order happens to be first | `/tracking/anything`, `/order-success/anything` | Critical | Resolve the id strictly; on miss render the not-found tracking state and never fall back to another order. |
| 2 | OT-02 | `src/frontend/views/OrderTrackingView.tsx:23, 35-45, 86-117` | Default state is `MOCK_ORDERS[0]`; the `?code=` handler and guest lookup resolve against `MOCK_ORDERS` and `localStorage`, and a lookup with an order number but no token or phone returns the order (lines 108-117) | `/tracking` guest portal — exposes name, phone, address and invoice of a fixture order to any visitor | Critical | Require the order token or phone match on every lookup; delete the fixture fallback; render `not_found` otherwise. |
| 3 | OT-03 | `src/App.tsx:263`; `src/data/mockData.ts:736-746` | `orders` is initialised from `MOCK_ORDERS` and never fetched from Supabase (only appended at `:667` and `:761`), so the fixture order of "Nguyễn Văn Minh" (phone 0987 654 321, FPT Tower address) is shown as the signed-in user's own order | `/orders` (protected), `/tracking`, admin order tables, admin revenue tile | Critical | Fetch orders for the authenticated user only; empty state when there are none; remove `MOCK_ORDERS` from the runtime path. |
| 4 | OT-04 | `src/frontend/views/OrderTrackingView.tsx:143-145, 286-321` | Hardcoded live telemetry: the "Live Telemetry // VCUBE MES Hub" badge, machine "#08 VCUBE Precision X1", "Đầu đùn 220°C", "Bàn nhiệt 60°C", "Tốc độ 250 mm/s", "Lớp cắt: 384 / 600" and remaining "04h 12m" | `/tracking` telemetry strip on every order | High | Show only fields the MES actually reported; otherwise render `—` with "Chưa có dữ liệu từ máy in" and drop the Live badge. |
| 5 | OT-05 | `src/frontend/views/OrderTrackingView.tsx:327-350` | `<ThreeModelViewer modelType="box" />` labelled "Mô Phỏng Lớp In 3D (Digital Twin Preview)", with "Layer Height: 0.16mm", "Trọng lượng ước tính: 84.5g" and "Dung sai cam kết: ±0.05mm" | `/tracking` viewer panel | High | Remove the digital-twin panel, or render a labelled `preview` only when a real sliced model exists. |
| 6 | OT-06 | `src/frontend/views/OrderTrackingView.tsx:271-274, 353-376` | Badge "Xưởng Vận Hành ISO 9001", the tolerance certificate narrative (laser scan or Mitutoyo caliper ±0.05mm, free reprint within 48h) and a warranty button that only flips local state before printing "✓ Hồ sơ khiếu nại đã gửi tới kỹ sư ca trực" | `/tracking` QC guarantee banner | High | Show the certificate only when the order has a recorded inspection result; create a real ticket and display its id, otherwise "Chưa đo kiểm". |
| 7 | OT-07 | `src/frontend/components/OrderProgress.tsx:19, 88, 128`; `src/frontend/views/MyOrdersView.tsx:246, 251, 257` | Stage 7 asserts "Dung sai ±0.05mm"; `layerProgress` defaults to 64; a completed order unconditionally claims "Đã vượt qua kiểm định QC ±0.05mm" | `/orders` pipeline cards | High | Report QC as "Chưa kiểm định" unless an inspection record exists; render `—` for a missing layer progress. |
| 8 | OT-08 | `src/frontend/views/OrderSuccessView.tsx:81-117` | The 4-step pipeline asserts "1. Thanh toán — Đã xác nhận", "2. Kỹ sư đang duyệt" and "4. Dung sai ±0.05mm" for an order created 900 ms earlier in the browser | `/order-success` immediately after "payment" | High | Drive the stepper from persisted order state; stage 1 stays `awaiting_payment` until the payment is verified. |
| 9 | OT-09 | `src/frontend/views/OrderSuccessView.tsx:145-153`; `src/frontend/components/auth/UserAvatarMenu.tsx:231-235` | CTA "THEO DÕI CAMERA XƯỞNG IN 3D" although no camera feed exists; the avatar menu advertises "Đang in lớp 42%" and "Live camera tracking" for any signed-in user | `/order-success`, header account menu | High | Remove the camera CTA or label it as unavailable; show the user's real order status or nothing. |
| 10 | OT-10 | `src/frontend/views/MyOrdersView.tsx:73-97, 380-386, 415-427` | The warranty form pre-fills `measuredDeviation: '+0.12mm'` — a measurement the customer never took — and submitting only sets local state, then shows a fabricated receipt "QC-CLAIM-{orderNumber}" with a two-hour response promise | `/orders` warranty modal | High | Leave the field empty and required; create a real claim record and show its server id, or state that submission is not yet wired. |
| 11 | OT-11 | `src/frontend/views/CheckoutView.tsx:74, 78, 105-108`; `src/frontend/views/OrderTrackingView.tsx:318, 435-436` | At checkout the browser invents the carrier "VCUBE Logistics Express", the tracking code `VCUBE-{random}`, the ETA "24h - 48h" and `timeRemaining: '04h 30m'` (the report falls back to "04h 12m") | `/order-success`, `/tracking` carrier card, `/orders` | High | Show "Chưa có mã vận đơn" / "Chưa xác định" until the carrier returns data. |
| 12 | OT-12 | `src/frontend/views/OrderTrackingView.tsx:248-260` | The "Mã mẫu thử nghiệm: #VCUBE-8924-A (Đang in)" shortcut loads the fixture order into the guest portal | `/tracking` guest search card | Medium | Remove the sample shortcut in production, or gate it behind demo mode with a sample label. |
| 13 | OT-13 | `src/backend/supabase/database.ts:349-375` | When a stored order lacks carrier or payment data the mapper invents a `'VTP' + Math.random()` tracking code, the method "Chuyển khoản QR Techcombank", `paidDate: now`, total 30000 and `isPaid: true` | Any order read from the DB with missing columns; downstream tracking and admin revenue | Medium | Map missing fields to `null` and render `—`; never default `isPaid` to true. |

### Catalog & inventory

| # | ID | file:line | what is fabricated | where the user sees it | severity | honest replacement |
|---|---|---|---|---|---|---|
| 1 | CI-01 | `src/data/mockData.ts:355-668`; `src/backend/supabase/database.ts:71-75`; `src/App.tsx:231-239`; `src/backend/supabase/seedService.ts:150-193` | The `PRODUCTS` fixtures (prices, badges, `salesCount`, `printsCount`, `reviewsCount`) are the catalog whenever Supabase is unconfigured, unreachable or empty, and can be pushed into Supabase by the seeding path, after which they are indistinguishable from real listings | `/`, `/explore`, `/products/:id` for every visitor | Critical | Empty state plus a `sample data` badge when the source is fixtures; never seed fixtures into the production project. |
| 2 | CI-02 | `src/frontend/views/ExploreView.tsx:844`; `src/frontend/views/ProductDetailView.tsx:288, 547`; `src/frontend/components/CadQuickViewModal.tsx:191, 209, 213` | Every catalog card asserts "✓ Watertight"; the detail page asserts "✓ Watertight Mesh 100%" and "kiểm định Watertight"; the quick view asserts "✓ WATERTIGHT 100%", "±0.05 MM" and a fallback dimension `'80x80x40mm'` — for products that were never analysed | `/explore` grid, `/products/:id`, CAD quick view | High | Show mesh and tolerance attributes only when a real analysis record exists; otherwise `—`. |
| 3 | CI-03 | `src/frontend/views/ProductDetailView.tsx:380, 451-456, 520`; `src/frontend/components/CadQuickViewModal.tsx:234`; `src/frontend/views/HomeView.tsx:746` | Ratings (4.95), review counts (64, 128) and "Kiểm định (64)" come from fixture fields and are presented as verified customer reviews and lab tests | Marketplace cards, product detail page, quick view | High | No reviews or tests until real rows exist; render "Chưa có đánh giá". |
| 4 | CI-04 | `src/App.tsx:170` | `/personalize/:productId` falls back to `products[0]` for an unknown id, so a different model than the URL names is configured and priced | `/personalize/<bad-id>` | High | Not-found state; never personalize a product other than the one the URL names. |
| 5 | CI-05 | `src/data/mockData.ts:43-171, 1623-1804`; `src/stores/useProductionStore.ts:239-290`; `src/frontend/components/admin/WarehouseInventoryPanel.tsx:24-35` | Material spool counts (38/24/16/…), accessory stock (450/180/1250/…), machine `progressPercent` (74/42/88/62/30) and the derived inventory-value totals are fixture constants rendered as current stock and fleet utilisation | `/admin/inventory`, `/admin/materials`, `/admin/machines`, admin KPI tiles | Medium | Load stock from the inventory table; render `—` when no count has ever been recorded, which is different from zero. |
| 6 | CI-06 | `src/data/mockData.ts:760-793` | `DIGITAL_ASSETS` with `downloadsCount`, `fileSize`, purchase dates and licences are shown as the user's purchased CAD library | `/assets` for any signed-in user | Medium | Load the user's entitlements from the database; empty state otherwise. |
| 7 | CI-07 | `src/data/mockData.ts:1806-1861` | `WORKSHOP_PARTNERS` with `inStockMaterials` including "PEEK High Temp" and "PA-CF Carbon Fiber", plus capacity and SLA ratings, are shown as verified partner capability | Admin partner and workshop panels, dispatch suggestions | Medium | Store capabilities per workshop in the database and display only recorded values. |
| 8 | CI-08 | `src/backend/supabase/seedService.ts:195-270, 464-504`; `src/data/mockData.ts:1863-2140` | The "Đồng Bộ DB" action upserts fixture orders, fixture user profiles carrying KYC document numbers and bank accounts, and financial splits into the live Supabase project | Admin "Sync DB" button; afterwards the sample rows are indistinguishable from real customers in every admin table | High | Restrict seeding to a non-production project, tag seeded rows (`is_sample: true`), and exclude them from all aggregates and customer-facing reads. |

### Admin dashboards & KPIs

| # | ID | file:line | what is fabricated | where the user sees it | severity | honest replacement |
|---|---|---|---|---|---|---|
| 1 | AD-01 | `src/stores/useAdminOverviewStore.ts:168-186`; `src/frontend/components/admin/groups/Group0OverviewPanel.tsx:46-64, 80-81, 151, 191, 211, 221` | A literal KPI set (fleet utilisation 78.5%, 52 printers, 35 active, 14 idle, 3 maintenance, 18 orders, revenue 18,450,000 / 284,600,000, target 350,000,000, growth +24.8%, on-time 98.4%, QC 99.1%, slicing 18.5 min) with `isTelemetryLive: true`; the panel falls back to these values whenever the real arrays are empty | `/admin` and `/admin/group0-overview` "Four Real-Time KPI Cards", including the "+5.4%" trend chip | Medium | Compute from real rows; when a source is unavailable render `—` and force `isTelemetryLive: false` so no pulsing "Đang Trực Tuyến" badge is shown. |
| 2 | AD-02 | `src/stores/useAdminOverviewStore.ts:63-112, 188-197` | Cost pillars 62,612,000 / 108,148,000 / 51,228,000 / 62,612,000 đ with weights 22/38/18/22 % are constants presented as the period's cost structure; `setTimeframe` multiplies a literal `baseRev` to "simulate" the other periods | `/admin/group0-overview` Inkiri cost chart | Medium | Aggregate real cost records per period; if none exist, show an empty chart. |
| 3 | AD-03 | `src/stores/useAdminOverviewStore.ts:114-162` | Four operational alerts carry named hubs, kilogram quantities and "10 phút trước" / "1 giờ trước" timestamps; they are static and dismissable but never derived from data | `/admin/group0-overview` alert list | Medium | Generate alerts from live thresholds and store real timestamps. |
| 4 | AD-04 | `src/frontend/components/admin/AdminOverviewPanel.tsx:168, 213` | "Ổn Định 100%" is displayed when the alert count is zero (absence of data read as perfect health), and the footer claims "98.4% CSAT" from a literal | `/admin` KPI card and footer | Medium | Show "Chưa có cảnh báo" and remove the CSAT literal until survey data exists. |
| 5 | AD-05 | `src/stores/useProductionStore.ts:239-333` | Workshop and machine rows carry fixture telemetry: status `Busy`, progress 74/42/88/62/30 %, `bedTempC: 70`, `nozzleTempC: 245`, `currentLayer 480 / totalLayers 705`, `remainingTimeStr: '1h 12m'`, and an operator note claiming "đang chạy tốc độ 250mm/s" | `/admin/queue`, `/admin/machines`, `/admin/group5-production` presented as the live farm | Medium | Ingest from the MES; until then mark jobs `unassigned` and hide device telemetry. |
| 6 | AD-06 | `src/stores/useDesignerAdminStore.ts:80-167` | Designer records with `totalRoyaltiesEarned: 114200000`, `pendingRoyaltyPayout`, `monthlyRevenueVnd`, `totalSalesCount`, `payoutBankInfo` and `badgeTier: 'VerifiedEngineer'` are seeded as real partner records | `/admin/designers` payouts, royalties and badge tiers | Medium | Compute royalties from order splits; render `—` for designers with no settled orders. |
| 7 | AD-07 | `src/frontend/components/admin/AdminUsersPanel.tsx:12-168, 309-324`; `src/backend/supabase/database.ts:484` | KYC rows default to `'verified'` (`d.kyc_status \|\| 'verified'`), the panel ships verified/pending/rejected fixture users, and approve/reject only mutates local state | `/admin/users` KYC queue | Medium | Default new KYC to `unverified`, load real applications, and persist decisions server-side with an actor. |
| 8 | AD-08 | `src/data/mockData.ts:1422-1538, 2144-2190` | `PAYOUT_TRANSACTIONS`, `CUSTOM_REQUESTS`, `MODERATION_PRODUCTS`, `DESIGNER_APPLICATIONS`, `DISPUTES_LIST`, `DMCA_REPORTS` and `MOCK_FINANCIAL_SPLITS` are fixture records rendered as the settlement and dispute queue | `/admin` payouts, `/designer` requests and disputes | Medium | Query the respective tables and show empty states. |
| 9 | AD-09 | `src/stores/useProductionStore.ts:687, 711, 734` | Advancing a Kanban stage computes `layerProgress` from the stage ratio (`(stageIndex + 1) / stages`) and writes it into the same field the UI calls printing progress | `/admin/queue`, plus any customer surface reading `layerProgress` | Medium | Keep stage index and layer progress as separate fields; only a slicer or printer may write layer progress. |
| 10 | AD-10 | `src/frontend/components/admin/AdminOverviewPanel.tsx:27-37, 98-101`; `src/frontend/components/admin/groups/Group2DesignersPanel.tsx:336` | Admin revenue and partner sales figures are sums over fixture orders and designers, labelled as the platform's totals | `/admin` revenue tiles, designer sales counters | Medium | Aggregate only real persisted rows and label the data source and period. |

### Auth & trust

| # | ID | file:line | what is fabricated | where the user sees it | severity | honest replacement |
|---|---|---|---|---|---|---|
| 1 | AT-01 | `src/frontend/context/AuthContext.tsx:273-316`; `src/frontend/components/Header.tsx:350-371`; `src/frontend/components/auth/UserAvatarMenu.tsx:48`; `src/frontend/components/AuthModal.tsx:167` | `switchDemoRole` lets any visitor set their own role — including `admin` — and stamps `kycStatus: 'verified'`, writing both into `localStorage`; `RoleGuard` and `ProtectedRoute` (`src/App.tsx:70-76`) are client-side only | Header mobile "Role Perspective (Demo)" switcher, avatar menu, auth modal | Critical | Remove the role switcher from production builds; derive the role from the server session claim; gate `/admin` and `/designer` on the server. |
| 2 | AT-02 | `src/frontend/context/AuthContext.tsx:28-58, 162-190` | `DEMO_ACCOUNTS` plus the hardcoded passwords `'123456'` and `'Password123!@'` grant `designer`, `lab` and `admin` profiles whenever Supabase sign-in returns an error | Login modal, which also lists the demo accounts (`AuthModal.tsx:882`) | Critical | Delete the credential fallback; in demo mode seed real accounts in a sandbox project instead. |
| 3 | AT-03 | `src/frontend/context/AuthContext.tsx:239-271` | When Google OAuth fails, the app fabricates and signs in `engineer.google@vcube.vn` — "Kỹ Sư Google (Verified)", company "Google Tech Partner" | Login modal "Continue with Google" | Critical | Surface the OAuth error; never synthesise an identity. |
| 4 | AT-04 | `src/frontend/context/AuthContext.tsx:100-134, 318-330` | Session, role and `kycStatus` are restored from the `vcube_active_local_user` localStorage blob whenever no Supabase session exists, so identity and privileges come from client-controlled storage | Any page after a previous local login | High | Trust only the server session; clear local identity on sign-out and on any mismatch. |
| 5 | AT-05 | `src/backend/supabase/database.ts:484, 495`; `src/frontend/components/admin/AdminUsersPanel.tsx:168`; `src/data/mockData.ts:1863-2140` | KYC status defaults to `verified`, `getUsers` falls back to `MOCK_APP_USERS` (which carry KYC document numbers and bank accounts), and those fixtures appear in the admin user list as verified customers | `/admin/users` | High | Default KYC to `unverified`; never fall back to fixtures inside an authenticated admin surface. |
| 6 | AT-06 | `src/frontend/context/LanguageContext.tsx:12, 78-79, 366-367`; `src/frontend/views/HomeView.tsx:171, 348, 443, 1196`; `src/data/mockData.ts:1556, 1587, 1592` | "ISO 9001:2015 CERTIFIED", "Chứng nhận ISO 9001:2015", "±0.05mm (Mitutoyo Calibrated)", "báo giá tức thì trong 3 giây" and the claim that every part is laser-scanned or measured with a Mitutoyo caliper assert held certifications, calibrated instruments and a verified tolerance with no underlying process | Home hero and trust strip, footer, SEO metadata | High | Remove unheld certifications; restate tolerances as commitments ("mục tiêu dung sai", "quy trình đo kiểm theo thoả thuận"). |
| 7 | AT-07 | `src/frontend/views/DesignerDashboardView.tsx:188-189, 216-220` | A product published by a designer is created with `isPro: true`, `isVerified: true`, `rating: 5.0` and fixed specs (`45 x 45 x 120 mm`, `124.5g`, print time `3h 15m`) | Marketplace card and detail page for the new listing | High | Publish as `pending_review` with no rating, no verified badge and no specs until they are measured. |
| 8 | AT-08 | `src/frontend/views/DesignerSettingsView.tsx:157, 266` | Badge copy promises a "99.8%" print-success reliability figure, and the profile shows `profile.totalSalesCount \|\| 148`, inventing a sales count for a designer with no data | `/designer` settings and profile | High | State the criteria for each badge; render `—` when no orders exist. |
| 9 | AT-09 | `src/frontend/components/ChatSupportModal.tsx:30-41, 56-57` | A scripted bot is presented as "Kỹ sư Hoàng Long (VCUBE Lab) — Kỹ sư trực xưởng • Hotline 24/7" and answers with specific machine facts ("chạy 120mm/s", "lớp 384/600", "hoàn thiện 14:30", "±0.03mm") | Support chat opened from `/tracking`, `/orders` and the header | High | Label it "Trợ lý tự động"; answer only from real order data or escalate to a human with an explicit queue notice. |
| 10 | AT-10 | `src/backend/services/quoteVerifier.ts:35-38`; `src/frontend/components/tool3d/InstantQuoteWidget.tsx:25-31` | The quote HMAC key falls back to the literal `vcube_inkiri_hmac_secret_2026_industrial_fab` inside client code, so any "tamper-proof signed quote" can be forged | Quote token and QR shown to the customer and re-verified in the quote panel | Medium | Keep the key server-side; have the server issue and verify signatures; mark client-produced tokens as unsigned. |

---

## Recommended UI states

Concrete copy and behaviour for every replacement above. Vietnamese copy follows the app's existing customer-facing language.

### 1. Parse-failure panel (`/quote`) — replaces MP-01, MP-03, MP-05

Behaviour: on any parser error no `AnalysisFile` is added; `files` stays unchanged and `selectedFile` keeps its previous value. No `BoxGeometry`, no metrics, no price, no QC affordance, and never a SUCCESS toast.

```
⚠ Không phân tích được tệp
Tệp: {fileName} ({fileSize})
Lý do: {error.message} — ví dụ "Không đọc được cấu trúc STL nhị phân".
Hệ thống KHÔNG tạo dữ liệu thay thế cho tệp này.
[ Thử lại ]  [ Chọn tệp khác ]  [ Gửi kỹ sư báo giá thủ công ]
```

### 2. Proxy-geometry disclosure (`/quote`) — replaces MP-02, MP-06, MP-16

A ribbon across the viewport plus a repeated notice in the report header, and `isProxy: true` on the file record.

```
PROXY — Đây là hình học mô phỏng, không phải bản thể CAD của bạn.
Kích thước / thể tích / khối lượng / dung sai: — (chưa đo được)
Định dạng STEP/IGES chưa được hỗ trợ phân tích tự động.
[ Yêu cầu báo giá thủ công ]
```

Rules: proxy files cannot reach `onAddToCart`; the format tag reads `PROXY — chưa phân tích`; no SHA-256, no unit-confirmed badge, no "AI Slicer" orientation text.

### 3. Unknown-metric display — replaces every `??` / `||` fallback in the inventory

One shared primitive (e.g. `MetricValue`) so unknown values look identical everywhere:

```
unknown:    —                title="Chưa có dữ liệu đo"
estimated:  <value>  [ước tính]
measured:   <value>  [đã đo]  + source + timestamp
```

Never `?? 6.8`, `|| 64`, `|| '04h 12m'`, `|| '+0.12mm'`, `|| 148`, `|| 38000`. A zero coming from a real source renders `0`; an absent value renders `—`. Any "Live" / "Real-time" / "Trực tuyến" chip is removed whenever its backing source is unavailable.

### 4. Sample-data banner for fixtures — replaces CI-01, CI-05, CI-06, AD-01

A persistent, non-dismissible strip on any surface whose data came from fixtures, plus a per-row `MẪU` chip so a screenshot of a single card cannot pass as real.

```
DỮ LIỆU MẪU — Nội dung trên trang này không phải dữ liệu thật của VCUBE.
Giá, tồn kho, lượt bán và đánh giá là ví dụ minh hoạ.
```

Ratings, review counts and `salesCount` render `—` when the source is fixtures; they are never rendered as live counts.

### 5. "Awaiting payment" order state — replaces PC-03, PC-04, OT-08

Order state machine: `created → awaiting_payment → paid → in_production → …` (plus `cancelled`, `refunded`).

```
Trạng thái: CHỜ THANH TOÁN
Chúng tôi chưa nhận được thanh toán cho đơn {orderNumber}.
Số tiền: {total} ₫  •  Phương thức: {method}
Nội dung chuyển khoản: VCUBE {orderNumber}
Xưởng chỉ bắt đầu in sau khi thanh toán được xác nhận (thường 1–5 phút).
[ Tôi đã chuyển khoản — kiểm tra lại ]
```

Rules: VietQR/VNPAY never set `isPaid`; the success page step 1 reads "Đang chờ thanh toán" or "Đã xác nhận" from stored state; no carrier or tracking code before the carrier returns one; no VAT line and no payment stamp on the invoice unless recorded.

### 6. Not-found tracking state — replaces OT-01, OT-02

```
Không tìm thấy đơn hàng
Chúng tôi không có đơn hàng nào khớp với "{code}".
Vui lòng kiểm tra lại mã đơn, hoặc dùng token / số điện thoại đã dùng khi đặt hàng.
[ Nhập lại ]  [ Liên hệ hỗ trợ ]
```

Rules: never fall back to `activeOrder` or `orders[0]`; a lookup with only an order number is refused with "Cần thêm số điện thoại hoặc mã token để bảo vệ thông tin đơn hàng"; the `?code=` path resolves through the same token-verified check.

### 7. Internal costing is admin-only — replaces PC-01, PC-02

Remove "Giá Vốn Xưởng" from `QuoteSummaryPanel`. Inside `/admin/**` render the same content as:

```
BÁO CÁO NỘI BỘ — Giá vốn, biên lợi nhuận và ghi đè giá chỉ hiển thị cho vai trò Quản trị.
Mọi ghi đè được lưu máy chủ: người thực hiện, thời điểm, lý do, giá cũ → giá mới.
```

The override submits to the server and the client renders the returned, persisted price. A caller without the role receives no such button and no such fields in the response payload.

### 8. Telemetry and digital-twin absence — replaces OT-04, OT-05, AD-01, AD-05

```
Chưa có dữ liệu từ máy in
Đầu đùn: —   •   Bàn nhiệt: —   •   Tốc độ: —   •   Lớp: —
Trạng thái này cập nhật khi xưởng kết nối MES.
```

The `Live Telemetry` badge renders only while a heartbeat newer than 60 s exists; otherwise the chip reads "Không có tín hiệu". No 3D "digital twin" box, no `384 / 600`, no `84.5g` and no `0.16mm` layer height unless produced by a slice of the actual file.

---

## Demo mode proposal

Goal: keep convincing sample content for sales demos without lying.

**Single app-level flag.** `VITE_VCUBE_DEMO_MODE` (Vite client env), read only through one module — `src/config/demoMode.ts`, exporting `isDemoMode`, `demoLabel` and `sampleTag()` — with an optional hosted-demo override row `site_content.demo_mode`. Default `false`. Build-time guard: when `import.meta.env.PROD && import.meta.env.VITE_VCUBE_DEMO_MODE === 'true'`, log a loud startup warning and keep the persistent badge on screen. No other `NODE_ENV`-style checks and no scattered `if (demo)` branches outside that module.

**Persistent visible badge.** When `isDemoMode` is true, render a fixed, non-dismissible banner on every route (above the header, `role="status"`, excluded from print):

```
DEMO MODE — Dữ liệu mẫu, không phải đơn hàng / tồn kho thật của VCUBE.
```

Plus a `MẪU` chip on every sample-backed card, KPI tile, chart row and table row, and a `sample` watermark on printed invoices and quotes. When the flag is off, every fixture path is unreachable: no `MOCK_*`, no `SAMPLE_*`, no `PRODUCTS` fallback.

**Surfaces the flag must cover (each one either real or explicitly sample):**

1. Marketplace catalog, categories, badges and prices — `/`, `/explore`, `/products/:id`, CAD quick view.
2. Ratings, review counts, `salesCount`, `printsCount`.
3. Inventory: material spools, accessory stock, warehouse value totals — `/admin/inventory`, `/admin/materials`.
4. Machine fleet and MES production queue (status, progress, device telemetry, operator notes) — `/admin/queue`, `/admin/machines`, `/admin/group5-production`.
5. All Group 0 KPIs, cost pillars, operational alerts and CSAT — `/admin`, `/admin/group0-overview`.
6. Designer records, royalties, payouts, badge tiers and KYC status — `/admin/designers`, `/admin/users`.
7. Orders, tracking, order history, invoices and warranty claims — `/orders`, `/tracking`, `/order-success`, the invoice modal.
8. `/quote` benchmark samples (`SAMPLE_ANALYSIS_FILES`) plus every DFM metric, hash, printability score and slicer preset derived from them.
9. Partner and workshop network capability, including `inStockMaterials`.
10. Support chat, hero metrics, trust logos and certification claims.
11. The demo role switcher (`switchDemoRole`) and the demo credential fallback — permitted only while `isDemoMode` is true, with the badge making the impersonation explicit.

---

## Verification

### A. Static proof — grep patterns that must return no production hits

Run from the repo root after the refactor. Every command below must produce no match outside `src/config/demoMode.ts`, a `*.test.*` file, or a `demo/` fixture directory that is unreachable while the flag is off.

```bash
# 1. Fabricated mesh values and the recovery file
grep -rn "14200\|85x55x30\|85, 55, 30\|42\.5\|new THREE.BoxGeometry(85" src/
grep -rn "isWatertight: true" src/utils src/frontend
grep -rn "printabilityScore: \(9[0-9]\|7[0-9]\)\|overhangPercentage: 6\.8\|?? 6\.8" src/
grep -rn "Math.min(12, boundaryEdges)\|simulateSplitShells\|createRepairedMesh" src/
grep -rn "B-Rep\|Đã quét Mesh 3D\|Tự Động Phục Hồi" src/
grep -rn "isUnitConfirmed: true" src/

# 2. Hashes, secrets and signatures that are literals
grep -rniE "[0-9a-f]{64}" src/
grep -rn "vcube_inkiri_hmac_secret\|VITE_QUOTE_SECRET" src/

# 3. Hardcoded telemetry, QC and certification claims
grep -rn "220°C\|60°C\|250 mm/s\|384 / 600\|04h 12m\|84\.5g\|0\.16mm" src/
grep -rn "ISO 9001\|Mitutoyo\|±0\.05\|0\.05mm" src/   # each remaining hit must be a stated commitment, not a performed certificate
grep -rn "CAMERA XƯỞNG\|Live camera\|Live Telemetry\|Đang in lớp 42" src/

# 4. Fixtures used as live data
grep -rn "MOCK_\|SAMPLE_ANALYSIS_FILES" src/
grep -rn "orders\[0\]\|products\[0\]\|MOCK_ORDERS\[0\]" src/App.tsx src/frontend
grep -rn "|| '04h 12m'\|?? 64\|layerProgress || 64\|totalSalesCount || 148\||| '+0.12mm'" src/

# 5. Admin and KPI literals
grep -rn "284600000\|18450000\|350000000\|98\.4\|99\.1\|78\.5" src/
grep -rn "isTelemetryLive: true" src/stores

# 6. Cost/margin exposure and client-side privilege
grep -rn "InternalCostBreakdownModal\|Giá Vốn Xưởng\|costPrice\|calculatedGrossMarginPercent" src/frontend/views src/frontend/components/tool3d
grep -rn "switchDemoRole\|DEMO_ACCOUNTS\|Password123\|kycStatus: 'verified'" src/
grep -rn "isPaid: true\|isPaid: paymentMethod" src/
```

Assert by construction as well, not only by grep: the pricing entry point must reject a file whose `status !== 'parsed'` or whose metrics are `null`; `onAddToCart` must reject a file with `isProxy === true`; the invoice must render `isPaid` from state rather than a literal.

### B. UI walkthroughs

1. **Parse failure**: upload a text file renamed `broken.stl`, then a truncated `.stl`, then a `.3mf` with a corrupt zip. Expect the failure panel each time, no new file row, no price, no success toast, and nothing added to the cart; the console shows a thrown, typed parse error.
2. **STEP/IGES**: upload a genuine `.step`. Expect the proxy disclosure, every metric `—`, quoting disabled, an explicit "yêu cầu báo giá thủ công" path, and no SHA-256 or B-Rep claim.
3. **Real STL**: upload a known watertight STL (a 20 mm cube). Expect a computed volume near 8 cm³ from the mesh integral rather than a bbox estimate, dimensions matching the file, and a deliberately holed STL reporting open boundaries instead of "100% Watertight".
4. **Auto-repair**: on the holed STL click "Tự Động Sửa Lưới Mesh". Expect the defect counts to be re-measured and either unchanged or truthfully reduced, with no watertight claim while boundaries remain.
5. **Split shells**: click split on a single-shell file. Expect the action to be unavailable, or to report only genuinely disconnected components whose per-part triangle counts sum to the total.
6. **Pricing and authorization**: as a signed-out visitor open `/quote` and confirm no "Giá Vốn Xưởng" control exists and no cost or margin field appears in the network payload. As a customer role, request `/admin` directly and expect a server-side refusal rather than a client redirect. Confirm no role switcher exists in a production build.
7. **Costing as admin**: as an authorized operator apply a price override and verify the new price is returned by the server, persisted with actor, reason and timestamp, and reflected in the customer view without a client-only success message.
8. **Payment**: place a VietQR order. Expect "CHỜ THANH TOÁN" on `/order-success` and `/tracking`, no "ĐÃ THANH TOÁN" stamp on the invoice, no VAT line unless configured, no carrier or tracking code, and admin revenue excluding the unpaid order. Mark the order paid out of band and confirm state, invoice and revenue change together.
9. **Tracking isolation**: as user A place an order, then sign in as user B and open `/orders` — A's order must not appear. Open `/tracking/<A's id>` while signed out and expect the not-found state. Open `/tracking/does-not-exist` and `/order-success/does-not-exist` and expect not-found, never another order. In the guest portal, submit an order number without a token or phone and expect a refusal.
10. **Fixtures**: with `VITE_VCUBE_DEMO_MODE` unset, load `/`, `/explore`, `/products/:id`, `/assets`, `/admin`, `/admin/inventory`, `/orders` and `/tracking`, and confirm no sample data renders at all (empty states instead). Then set the flag, rebuild, and confirm the demo banner plus per-item `MẪU` chips appear on all eleven surfaces listed in the Demo mode section.
11. **Telemetry**: open `/tracking` with no MES heartbeat. Expect "Chưa có dữ liệu từ máy in", `—` for every device metric, no `Live Telemetry` badge, no 3D twin box and no `384 / 600`.
12. **Claims sweep**: open the home page, the footer, `/products/:id`, the `/tracking` QC banner and the support chat. Expect no ISO 9001 certificate, no Mitutoyo or laser-scan claim presented as performed, no "quoted in 3 seconds" guarantee, no auto-reply speaking as a named engineer, and every tolerance statement phrased as a commitment that names its measurement method.
