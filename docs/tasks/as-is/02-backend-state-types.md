<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# AS-IS 02 — Backend service · State · Types

## 1. Service backend (`src/backend/services/`)

| File | Vai trò | Export chính | Importer FE |
|---|---|---|---|
| `assetService.ts` | Signed URL bucket `cad-files` (TTL 60s) | `CAD_BUCKET`, `SIGNED_URL_TTL_SECONDS`, `AssetService.createSignedUrl` | `AssetLibraryView` |
| `catalogService.ts` | Facade catalog tĩnh — **mọi method trả `[]`** | `CatalogService.getProducts/getProductById/getDigitalAssets/getAccessories` | **0** (chỉ `backend/index.ts`) |
| `customDesignService.ts` | Yêu cầu CAD + chat + quote | `getRequests`, `getRequestBoard`, `claimRequest`, `appendMessage`, `sendQuote`, `subscribe` | `DesignerOverviewTab`, `DesignerRequestsTab`, `CustomIdeaRequestModal` |
| `designerService.ts` | Nâng user → designer | `promoteUserToDesigner` | `Group3CustomersPanel` |
| `orderService.ts` | Vòng đời đơn | `OrderService.createOrder`, `getOrdersByCustomer`, `updateOrderStatus` | `CheckoutView` |
| `pricingService.ts` | Facade pricing tĩnh — **0 importer** | `PricingService.calculateQuote/getMaterials/getPrinters/getFormulaConfig` | **0** |
| `settingsService.ts` | **1030 LOC** — nạp/validate/cache/realtime/audit settings | `bootstrapSettings`, `subscribeSettings`, `settingsAccessors`, `saveAppSettings/savePricingGlobalSettings/saveSiteContent/savePricingConfig/saveSettingsPatch`, `writeSettingAudit`, `getSettingAudit`, validators | 12 file (App, main, useSettings, Checkout, InvoiceModal, Designer tabs, AdminSettingsPanel, Group1, PricingConfigPanel, WorkshopEstimatorBOM, pricingEngine) |
| `workshopService.ts` | **2243 LOC** — CRUD xưởng/designer/customer/máy/vật liệu/phụ kiện + **SEED fixture + localStorage fallback** | `WorkshopService` (≈55 method static), `workshopService` singleton, nhiều `SEED_*` | `App.tsx`, `WorkshopOnboardingWizard`, `WorkshopSettingsView` |

**WorkshopService — nhóm method**: `checkSupabaseHealth` · profile (`getWorkshopProfiles/ById/ByUserId`, `save/delete`) · machines (`get/save/updateMachineStatus/delete`) · materials (`get/save/updateMaterialStock/delete`) · inventory logs (`get/add`) · designer profiles (CRUD) · customer profiles (CRUD) · accessories (CRUD) · **nhóm "my"** (`getMyWorkshopProfile/saveMyWorkshopProfile`, `getMyMachines/saveMyMachine/setMyMachineStatus/deleteMyMachine`, `getMyMaterials/saveMyMaterial/deleteMyMaterial`, `getMyInventoryLogs/addMyInventoryLog`, `getMyAccessories/saveMyAccessory/deleteMyAccessory`, `getMyQueueOrders`, `updateMyOrderProgress`, `deductMaterialsForCompletedOrder`) · catalog (`getPrinterFleetCatalog`, `getMaterialsCatalog`).

> ⚠️ Nhóm `getWorkshop*/saveWorkshop*` (không "My") còn **fallback `SEED_*`/localStorage** → rủi ro data-honesty khi admin panel gọi. Nhóm `getMy*` thì sạch (chỉ DB + `auth.uid()`).

---

## 2. `dbService` (`src/backend/supabase/database.ts`, 1017 LOC)

**Helper top-level** (export khỏi tầng DB nhưng bị UI dùng trực tiếp):
| Symbol | Caller |
|---|---|
| `DEFAULT_SALES_RULES` | `CheckoutView`, `CartView`, `CartDrawer` |
| `computeShippingFee(...)` | `CheckoutView`, `CartView`, `CartDrawer` |
| `CAD_MIME_BY_EXTENSION`, `sanitizeCadFileName` | nội bộ (upload) |

**Method** (30):
`getProducts` · `saveProduct` · `deleteProduct` · `seedInitialProductsIfEmpty` · `uploadProductImage` · `uploadCadFile`(†) · `saveOrder` · `updateOrderStatus` · `getOrders` · `getOrderByToken`(RPC) · `saveQuote` · `getUsers` · `saveUser` · `updateUserKyc` · `getMaterials` · `saveMaterial` · `getPrinters` · `savePrinter` · `getPricingConfig` · `savePricingConfig` · `getSiteContent` · `saveSiteContent` · `recordPaymentTransaction`(†) · `getWorkshopPartners` · `saveWorkshopPartner` · `getAccessories` · `saveAccessory` · `deleteAccessory` · `deleteMaterial` · `deletePrinter`

(†) = 0 caller.

**Gọi inline từ component (vi phạm AGENTS.md "DB qua service")**:
| File | Call |
|---|---|
| `Group1WorkshopsPanel` | `getPrinters`, `savePrinter`, `getWorkshopPartners`, `saveWorkshopPartner` |
| `Group3CustomersPanel` | `getUsers`, `updateUserKyc` |
| `Group2DesignersPanel` | `getUsers` |
| `Group5ProductionPanel` | `getOrders`, `updateOrderStatus` |
| `OrderTrackingView` | `getOrderByToken` |
| `AdminProductsPanel` | **import `dbService` nhưng không dùng** (dead import) |
| `App.tsx` | 7 fetch + toàn bộ write handler + realtime |

---

## 3. Mappers (`src/backend/supabase/mappers.ts`, 672 LOC)

`rowToProduct` · `rowToMaterial` · `rowToPrinter` · `rowToAccessory` · `rowToOrder` · `rowToOrderForSync` · `rowToUserProfile` · `rowToSiteContent` · `rowToWorkshopPartner` · `rowToAppSettings` · `appSettingsToRow` · `rowToCustomDesignRequest` + `SupabaseRow`, `EMPTY_PRODUCT_SPECS`.
Nguyên tắc: snake_case → camelCase, **trường thiếu để `null`/`—`, không bịa default**.

---

## 4. Zustand store

| Store | Đường dẫn | Persist | Nội dung | Consumer |
|---|---|---|---|---|
| `useCartStore` | `frontend/stores/` | ✅ `vcube_cart_store` | items, `appliedDiscount`, `appliedPromoCode`; `addToCart/updateQuantity/removeItem/clearCart/setAppliedDiscount/mergeGuestCart` | App, CartDrawer, CartView, CheckoutView, ExploreView |
| `useUIStore` | `frontend/stores/` | ❌ | drawer/auth/chat flags, toast queue (**`toasts` trùng `toastQueue`**) | App, ToastViewport?, reportError |
| `useProductionStore` | `stores/` | ❌ (đã gỡ legacy) | `KANBAN_STAGES` (8 stage), `regionFromAddress`, `ProductionJob`, telemetry nodes, filter UI state | Group5ProductionPanel |
| `useWorkshopAdminStore` | `stores/` | ❌ | filter + draft + selector `getMachineTotalRunningCostPerHour`, `getLowStockMaterials` | Group1WorkshopsPanel |
| `useDesignerAdminStore` | `stores/` | ❌ | filter, `loadDesigners`, `updateDesigner`, `loadPayoutInfo`(RPC), `getDesignerStats` | Group2DesignersPanel |
| `useCustomerAdminStore` | `stores/` | ❌ | filter, `loadCustomers`, `setNdaSigned`, `getCustomerStats` | Group3CustomersPanel |

> Hai thư mục store (`src/stores` vs `src/frontend/stores`) là **bất nhất layout**, không trùng lặp chức năng.

---

## 5. Context

| Context | LOC | Giá trị/method | Ghi chú |
|---|---|---|---|
| `AuthContext` | 494 | `user`, `profile`, `role`, `isLoggedIn`, `loading`; `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `switchDemoRole`(DEV), `updateUserProfile`, `sendPasswordReset`, `logout` | `role` resolve từ `user_profiles.role` (`resolveDbRole`, fail-closed → `customer`) |
| `LanguageContext` | 510 | `DICTIONARY`, `configuredClaims()`, `t(key, vi, en)`, `language` (force `'vi'`) | VI-only; `configuredClaims` đọc `site_content`/`app_settings` (Group A factual claims) |

---

## 6. Hook / lib

| File | Export | Mục đích |
|---|---|---|
| `hooks/useInViewport.ts` | `useInViewport<T>(...)` | IntersectionObserver (lazy 3D) |
| `hooks/useSettings.ts` | `useAppSettings`, `usePricingGlobalSettings`, `useSiteContent` | subscribe cache settingsService |
| `lib/format.ts` | `EMPTY_VALUE='—'`, `formatNumber/Currency/Percent/Date/DateTime/Bytes/Weight` | format hiển thị (không bịa) |
| `lib/vat.ts` | `vatRateFromPercent`, `computeVat`, `vatLabel`, `vatNotConfiguredLabel`, `vatTotalNote` | VAT từ `pricing_global_settings` |
| `lib/productImage.ts` | `isFabricatedImage`, `realProductImageUrl`, `FABRICATED_PLACEHOLDER_IMAGE_URLS` | chặn ảnh bịa |
| `lib/reportError.ts` | `reportError(ctx, err, opts?)` | **báo lỗi trung tâm — chỉ 1 caller** |
| `lib/cn.ts` | `cn(...)` | ghép className (không dep) |
| `backend/lib/result.ts` | `WriteResult<T,E>`, `ok`, `fail`, `failWith`, `ValidationIssue` | **hợp đồng kết quả ghi duy nhất** |

---

## 7. Types (`src/types/index.ts`, 1136 LOC, 53 export)

| Miền | Type |
|---|---|
| Product/catalog | `Product`, `ProductStatus`, `CartItem`, `DigitalAsset`, `ModelPart`, `AnalysisFile`, `AccessoryItem` |
| Order/payment | `Order`, `OrderPaymentStatus`, `VatLine`, `OrderFinancialSplit`, `PayoutTransaction`, `DisputeRecord`, `QuoteSnapshot` |
| Pricing/slicing | `FilamentPaletteItem`, `PlateInfo`, `SlicerPresetInfo`, `MaterialProfile`, `VolumeDiscountTier`, `InkiriCostFormulaConfig`, `PrinterProfile`, `QuoteTierType`, `DetailedCostBreakdown`, `DeliveryPackageOption`, `MachineComparisonItem`, `InkiriCalculationInput`, `InkiriCalculationResult`, `PricingGlobalSettings` |
| Printability | `ValidationIssue`, `PrintabilityAnalysis`, `TransformState`, `MeasurementResult` |
| Users/roles | `UserRole` (**thiếu `'workshop'`**), `AppUserProfile` |
| Custom design | `CustomDesignMessage`, `CustomDesignRequest`, `ModerationProductItem`, `DesignerApplication`, `DMCAReport`, `ProductLicensingConfig` |
| Site/admin | `SiteContentConfig`, `AdminNavSection`, `AdminTab` |
| Workshop | `WorkshopPartner`, `WorkshopProfile`, `WorkshopMachine`, `WorkshopMaterial`, `MaterialInventoryLog`, `DesignerProfile`, `CustomerProfile`, `WorkshopAccessory` |
| Ops | `DispatchAssignment`, `QualityControlRecord` |

Data-honesty: nhiều field khai `| null` (provenance/nguồn) — mapper để null khi thiếu.

**Shim chết**: `src/frontend/types/index.ts`, `src/frontend/data/mockData.ts`, `src/frontend/utils/pricingEngine.ts` — chỉ `export *`, **0 importer**.

---

## 8. Utils / worker

| File | LOC | Export chính |
|---|---|---|
| `utils/pricingEngine.ts` | 1054 | `computeElectricityCostVnd`, `computeLaborCostVnd`, `PricingUnavailableError`(+code), `calculateDetailedPricing`, `calculateManualInkiriEstimate`, `generateDeliveryPackages`, `comparePrintersForModel`, `compute3SidedOrderFinancialSplit`(†0 caller) |
| `utils/printEstimate.ts` | 108 | `resolveFilamentUsage` + provenance `GramsSource`/`TimeSource` |
| `utils/meshParser.ts` | 1878 | `parse3DFile`, `analyzeMeshDefects`, `aggregateDefects`, `createRepairedMesh`, `autoRepairGeometry`, `calculateVolume/SurfaceArea`, `MeshParseError`; spawn worker (timeout 30s) |
| `workers/cadParser.worker.ts` | 487 | Protocol `CadWorkerRequest/Response` — OpenCASCADE WASM (STEP/IGES) + STL |

**Pipeline giá** (`calculateDetailedPricing`): extruder/multicolor → gram vật liệu → giờ in → điện → khấu hao máy + vật tư → nhân công → phụ kiện/đóng gói/IPA → overhead → dự phòng lỗi → base/costPrice → markup + reverse fee → làm tròn → chiết khấu số lượng → tier thẩm định tay.
