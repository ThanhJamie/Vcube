<!-- doc-meta: status=active; verified=2026-10-21; owner=thanh -->
# 04 — Refactor & Clean-code Audit (read-only)

> **Phạm vi:** audit **cấu trúc code** + cơ hội clean-code. **Không sửa `src/`, không commit, không chạy build.**
> File duy nhất được ghi: `docs/tasks/optimization/04-refactor.md`.
> Toàn bộ số đo lấy trên cây làm việc ngày **2026-10-21**. Cây đó sau khi đo đã được commit thành `4d4a5d1` + `aaff7c4` (HEAD hiện tại); **LOC và nội dung 8 god file không đổi sau commit** — số liệu vẫn đúng.
> Mọi lệnh tái lập nằm ở **§9 Phụ lục đo lường**.

## TL;DR (đọc 60 giây)

| # | Kết luận | Bằng chứng |
|---|---|---|
| 1 | 8 file god chiếm **18.079 LOC = 27,5%** toàn `src` (65.772 LOC · 139 file). | §1 bảng tổng |
| 2 | **Tách file KHÔNG tự giảm LOC** — nó giảm *kích thước file*. Δ ròng chỉ đến từ dead code, trùng lặp và i18n. Ước tính Δ ròng toàn bộ kế hoạch: **≈ −3.100 LOC (−4,7%)**. | §1.9, §7 |
| 3 | `App.tsx` là **service thứ 4**: vừa router, vừa store settings (localStorage), vừa mutation layer cho product/material/printer/accessory/siteContent. | §2.1–§2.2 |
| 4 | Cùng một dữ liệu có **4 nguồn sự thật** (DB → `dbService`, cache `settingsService`, state `App.tsx`, `localStorage`). `useSiteContent()` và `App.siteContent` có thể lệch nhau sau khi admin lưu. | §2.2, §2.6 |
| 5 | **1.201 ternary `isVi ?` là dead branch**: `language` bị hardcode `'vi'` tại `LanguageContext.tsx:459`, `setLanguage` ép `'vi'` (`:472-474`), `toggleLanguage` là no-op (`:481`). Không có đường nào render nhánh EN. | §3.1 |
| 6 | Xoá được **≈ 250–350 dòng** từ i18n (KHÔNG phải 1.201 — 1.201 là *số điểm sửa*, không phải số dòng xoá). | §3.2 |
| 7 | **≈ 2.223 LOC code chết tại thời điểm đo** (phần lớn đã được Phase 1 xoá) đã xác minh 0 importer/caller — **1.140** trong `workshopService` (26 method = 684 dòng, 7 bộ `SEED_*` = 382, helper localStorage = 42) và **1.083** ngoài (4 service/barrel, 3 shim, 3 UI primitive, `test-pricing.ts`). | §4, §7 P1 |
| 8 | **0 unit test** trong repo; `tests/unit` + `tests/adversarial` rỗng; `test-pricing.ts` (357 dòng) **không chạy được** (import 2 module đã xoá). | §5.1 |
| 9 | `docs/tasks/baseline.json` đo tại `4a7eea5` (2026-09-24); HEAD hiện là `aaff7c4` ⇒ gate `npm run check` đang so với baseline **4 commit cũ**. | §5.3 |
| 10 | Docs drift có số: **31 bảng / 1 view** (≥ 8 chỗ trong `docs/**` + `AGENTS.md`) vs thực tế **32 bảng / 2 view**; `AGENTS.md` liệt kê **3** migration, thực tế **12**. | §6.1 |

**Top 10 refactor ROI** → **§8**. **Kế hoạch theo pha + gate** → **§7** (map sang `PLAN.md` ở **§7.0**, kèm 2 điểm cần lead chốt).

> ⚠️ **3 điểm file này sửa lại so với tài liệu cùng bộ:** (1) `DEAD-CODE.md` §8 hoãn `workshopService` vì "admin panel còn dùng" — **sai**, xem §4.4; (2) `PLAN.md` ước i18n "500–1.200 LOC" là *số dòng chạm*, số dòng **xoá được** là 250–350 (§3.2); (3) `PLAN.md` xếp i18n Phase 2, audit này khuyến nghị làm **sau cùng** (§7.0).

---

## 0. Phương pháp & quan hệ với tài liệu đã có

### 0.1 Cách đo

- LOC: `find src -name '*.ts' -o -name '*.tsx' | xargs wc -l` (65.772 · 139 file).
- "God file": file ≥ 1.800 LOC **và** có ≥ 2 trách nhiệm tách rời được (không chỉ dài).
- Dead code: tính **0 reference** sau khi **strip comment** (grep thường đếm cả comment ⇒ dương tính giả; xem `getDesignerProfiles` chỉ xuất hiện trong comment ở `src/stores/useDesignerAdminStore.ts:7`).
- Không dùng heuristic "file dài = xấu". Mỗi đề xuất tách phải có **seam theo dòng** + **đích đến cụ thể**.

### 0.2 Vị trí trong bộ `docs/tasks/optimization/`

Bộ này có một **lead** giữ `README.md` + `PLAN.md` (kế hoạch cấp phase, `status=draft`) + `DEAD-CODE.md` (danh sách chết, ID `D01`–`D30`) + `AUDIT.md`. File `04` này là **work breakdown chi tiết cho phần refactor code** — không thay `PLAN.md`:

| File | Sở hữu | File này dùng thế nào |
|---|---|---|
| `PLAN.md` | thứ tự phase, ownership, gate mức cao | §7.0 map P0–P8 ↔ Phase 0–7 + nêu 2 điểm khác |
| `DEAD-CODE.md` | ID + bằng chứng từng mục chết | §4.1 map ID, chỉ bổ sung phần audit này xác minh |
| `AUDIT.md` | snapshot, page/feature matrix | §2.2 (4 pattern DB) là phần sâu hơn của nó |
| `03-resources.md` / `RESOURCES.md` | bundle/asset | **không trùng** — file này không đo bundle |
| `04-refactor.md` (đây) | seam god-file, Δ LOC, codemod risk, test/doc plan | — |

### 0.3 Quan hệ với `docs/tasks/as-is/05-debt-and-refactor-targets.md`

Tài liệu đó (2026-10-19) đã có §1 số đo nợ và §5 "khung refactor đề xuất (chờ chốt)". File này **kế thừa khung đó** và bổ sung: seam theo dòng, Δ LOC, rủi ro codemod, gate kiểm chứng. Số liệu lệch nhẹ vì code đã tăng:

| Chỉ số | as-is/05 (10-19) | 04 (10-21) | Ghi chú |
|---|---|---|---|
| `WorkshopSettingsView` | 2.493 | **2.574** | +81 |
| `App.tsx` | 2.119 | **2.152** | +33 |
| `ModelViewer3D` | 2.072 | **2.116** | +44 |
| `isVi ?` | 1.193 | **1.201** | +8 |
| `: any` | 138 | **139** | +1 |

> ⚠️ **Xung đột cần chốt:** as-is/05 §6 **D-D** ghi "plan ở `docs/tasks/REFACTOR-PLAN.md`". Thực tế bộ `docs/tasks/optimization/` đã thay thế vai trò đó. Đề nghị: sửa D-D trỏ về `docs/tasks/optimization/README.md` + `PLAN.md`, và hạ as-is/05 §5 xuống `status=historical` — **không để hai kế hoạch song song** (đúng luật "Không tạo kế hoạch song song chồng lấn" của chính as-is/05).

### 0.4 Nguyên tắc đề xuất

1. **Không thêm dependency** (as-is D-A). Codemod i18n dùng `typescript` đã có trong `devDependencies` (AST, không cần `ts-morph`).
2. **Không đổi hành vi** trong pha tách file. Mọi thay đổi hành vi phải là pha riêng, có test trước.
3. **Seam theo chiều dữ liệu**, không theo chiều JSX: mỗi file mới sở hữu 1 nguồn dữ liệu + 1 vùng render.
4. Thứ tự ưu tiên: **xoá > hợp nhất > tách** (xoá rẻ nhất và không tạo file mới phải bảo trì).

---

## 1. God files — trách nhiệm, seam, LOC kỳ vọng

### 1.0 Bảng tổng

| File | LOC | % src | Trách nhiệm (đếm được) | Sau tách: file gốc | Δ ròng toàn cây |
|---|---:|---:|---|---:|---:|
| `src/App.tsx` | 2.152 | 3,3% | 6 (router, shell, catalog state, settings state, order/mutation, chrome) | ~165 | **−140** |
| `src/frontend/components/admin/PricingConfigPanel.tsx` | 3.079 | 4,7% | 7 (6 sub-tab + validation state ×4) | ~200 | **−270** |
| `src/frontend/views/WorkshopSettingsView.tsx` | 2.574 | 3,9% | 9 (6 tab + data loading ×7 + form CRUD ×6) | ~210 | **−150** |
| `src/backend/services/workshopService.ts` | 2.243 | 3,4% | 5 (fixture, legacy CRUD, self-service CRUD, catalog read, mapper) | 4 file, lớn nhất ~590 | **−1.000** |
| `src/frontend/components/tool3d/ModelViewer3D.tsx` | 2.116 | 3,2% | 6 (scene, loader, stencil, controls, caliper, chrome) | ~190 | **+30** |
| `src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx` | 2.081 | 3,2% | 6 (4 tab + 3 modal + stats) | ~160 | **−130** |
| `src/frontend/views/Tool3DView.tsx` | 1.956 | 3,0% | 5 (upload/parse, config, viewer, quote, modals) | ~230 | **−60** |
| `src/utils/meshParser.ts` | 1.878 | 2,9% | 5 (geometry math, defect, 3MF, worker CAD, dispatch) | 5 file, không container | **0** |
| **Tổng** | **18.079** | **27,5%** | | **~1.715** | **−1.720** |

**Đọc bảng này đúng cách:** cột "Δ ròng" là chênh lệch *tổng LOC sau khi tách*. Nó âm chủ yếu nhờ **xoá trùng lặp trong file** (product handler, issue-map, tab-bar), không nhờ tách. Ba dòng `+30`, `0` cho thấy tách thuần tuý thường **tăng** 2–5% do import/boilerplate. Giá trị thật của việc tách là **file ≤ 800 dòng, hàm ≤ 80 dòng, 1 lý do để sửa** — không phải LOC.

---

### 1.1 `src/App.tsx` — 2.152 LOC

**Trách nhiệm hiện tại**

| # | Vùng | Dòng | LOC | Nội dung |
|---|---|---|---:|---|
| A0 | import + `React.lazy` | 1–92 | 92 | 26 import, 5 lazy view |
| A1 | Route wrapper + shell | 93–625 | 533 | `ProtectedRoute`(93), `ExploreRoute`(108), `ProductDetailRoute`(144), `PersonalizeRoute`(231), `resolveOrderById`(272), `OrderSuccessRoute`(277), `OrderTrackingRoute`(298), `OrderNotFoundView`(319), nav defs(370–409), `DashboardShell`(410), `LabDashboardShell`(515), `DesignerDashboardShell`(533), `LabRoute`(559) |
| A2 | `MainApp` state | 626–757 | 132 | 13 `useState` (products 633, productsLoading 643, productsError 645, orders 686, assets 687, siteContent 688, materials 698, printers 708, accessories 721, pricingConfig 734, marketplaceFeePercent 741, activeOrder 1099, invoiceOrder 1100, isFabHidden 1103) + 8 `useRef` (647–660) |
| A3 | effect | 758–1.044 | 287 | settings subscribe(758), `loadProducts`(768), auth-key guard(807), catalog load(813), realtime products(822–879), admin orders(917), FAB scroll(944) |
| A4 | derived | 1.045–1.098 | 54 | `effectivePricingConfig` — bù `platformCommissionPercent` từ cache |
| A5 | nav adapter | 1.099–1.264 | 166 | `getCurrentScreenFromPath`(1.138), `handleNavigate(screen, payload: any)`(1.160) |
| A6 | business handler | 1.265–1.549 | 285 | product CRUD (1.389/1.411/1.433), order status, materials/printers/accessories (1.054/1.072/1.088), siteContent (1.475), pricing (1.010) |
| A7 | route table | 1.550–1.876 | 327 | 32 `<Route>` (30 path duy nhất) + 8 `<Navigate>` + 5 `<RoleGuard>` |
| A8 | chrome JSX | 1.877–2.138 | 262 | header/footer/toast/FAB/chat |
| A9 | `App()` | 2.139–2.152 | 14 | provider stack |

**Smell đo được**

1. **Route block copy-paste 2 lần:** `/admin` (1.800) và `/admin/:section` (1.831) chứa **cùng 30 dòng JSX**, `AdminDashboardView` nhận **18 prop** (đếm: `products`…`onShowToast`). `/designer` (1.750) và `/designer/:tab` (1.773) lặp cùng lỗi. Chỉ `/lab` dùng biến `labRouteElement` (1.500) — tức **pattern đúng đã có**, chỉ áp dụng 1/3 nơi. → −60 LOC và xoá nguy cơ 2 route lệch guard.
2. **3 handler product là bản sao:** `handleAddNewProduct`(1.389), `handleUpdateProduct`(1.411), `handleDeleteProduct`(1.433) — mỗi cái ~22 dòng cùng khuôn `optimistic → localStorage.setItem → dbService → rollback → toast`; 6 lần `localStorage.setItem('vcube_products', …)` trong 3 hàm. → 1 hook `useOptimisticCollection` (~28 dòng) thay 90 dòng, −50.
3. **`onNavigate(screen: string, payload?: any)`** (1.160): chuỗi tự do + `any`; song song tồn tại `getCurrentScreenFromPath` (1.138) map path→screen **hai chiều ngược nhau**, cùng một bảng route thứ ba. → route config 1 nguồn (`{path, screen, element}`), bỏ 2 hàm, −25.
4. **`assets` state** (687) khởi tạo `DIGITAL_ASSETS` fixture rồi chỉ được `setAssets` ở 1 chỗ (order-success, 1.373) — state này không thuộc App.

**Seam tách**

| Đích | Lấy từ | LOC | Loại |
|---|---|---|---|
| `src/frontend/routes/AppRoutes.tsx` | A7 + A9 | ~285 | JSX thuần, không state |
| `src/frontend/routes/guards/ProtectedRoute.tsx` | 93–107 | ~20 | |
| `src/frontend/routes/wrappers/{Explore,ProductDetail,Personalize,OrderSuccess,OrderTracking,OrderNotFound}Route.tsx` | 108–369 | ~250 | 6 file, mỗi file ≤ 90 |
| `src/frontend/shell/{DashboardShell,LabDashboardShell,DesignerDashboardShell,LabRoute}.tsx` | 370–625 | ~270 | |
| `src/frontend/hooks/useCatalog.ts` | 633–645, 768–810, 822–879 | ~240 | products + realtime + mutation |
| `src/frontend/hooks/useSiteSettings.ts` | 688–757, 758–766, 1.045–1.098 | ~130 | **phụ thuộc §2** |
| `src/frontend/hooks/useAdminOrders.ts` | 686, 917–928 | ~45 | |
| `src/frontend/hooks/useAppNavigation.ts` | 1.099–1.264 | ~140 | |
| `src/frontend/shell/AppChrome.tsx` | 1.877–2.138 | ~270 | |

**Kỳ vọng:** `App.tsx` **2.152 → ~165** (provider + `<AppRoutes/>` + chrome). Tổng cây ≈ 2.010 (**−140**).

**Rủi ro: TRUNG BÌNH–CAO.** Đây là file bị sửa nhiều nhất; mọi nhánh refactor khác chạm nó (settings §2, i18n §3, store §2.3). Bắt buộc tách **sau** khi §2 xong và **có test mappers** (§5.4) để bắt hồi quy map row→domain.

---

### 1.2 `PricingConfigPanel.tsx` — 3.079 LOC

**Trách nhiệm**

| # | Vùng | Dòng | LOC |
|---|---|---|---:|
| B0 | import + helper (`isConfiguredNumber`, `PREVIEW_*`, `formatPreview*`, `FieldError`) | 1–111 | 111 |
| B1 | state/effect/handler toàn panel | 112–865 | 754 |
| B2 | header + sub-tab bar | 866–1.119 | 254 |
| B3 | **formula** = global card (1.129–1.271) + preview (1.272–1.324) + §1 điện (1.325–1.483) + §2 nhân công (1.484–1.660) + §3 rủi ro/lợi nhuận (1.661–1.916) + §4 chiết khấu (1.917–2.033) + §5 phí addon (2.034–2.088) + §6 giao hàng (2.089–2.149) + §7 cắt lớp (2.150–2.272) | 1.120–2.272 | **1.153** |
| B4 | materials | 2.273–2.383 | 111 |
| B5 | printers | 2.384–2.497 | 114 |
| B6 | accessories (wrapper `AccessoriesManager`) | 2.498–2.508 | 11 |
| B7 | inventory (wrapper `WarehouseInventoryPanel`) | 2.509–2.521 | 13 |
| B8 | estimator (`WorkshopEstimatorBOM`) | 2.522–3.078 | 557 |

**Smell đo được**

1. **4 máy trạng thái validation song song:** `formulaIssues`(136), `globalIssues`(196), `materialIssues`(242), `printerIssues`(269) — cùng khuôn `setX(prev => …delete key)`, `setX(issues)`, `setX({})` xuất hiện ở 397,407,423,473,500,515,518,614,628,666,672,703,712,720,735,751,800,807,836,846,854,1180. → 1 hook `useFieldIssues<T>()` (−50).
2. **CRUD material vs printer là bản sao:** `handleSaveNewMaterial`(663) / `handleSaveEditMaterial`(707) so với `handleSaveNewPrinter`(797) / `handleSaveEditPrinter`(840) — 4 hàm, cùng validate→`onUpdateX`→toast→đóng modal. → `useCatalogCrud` generic (−40).
3. **Header chứa 6 nút sub-tab lặp class** (1.019–1.119, 100 dòng) — cùng chuỗi class với 5 file khác (§1.6 smell 1).
4. **Panel vừa là form, vừa là router tab, vừa là nơi validate nghiệp vụ** (`validateSetting` 466, VAT 1.180). Logic nghiệp vụ giá nằm trong component ⇒ không test được.

**Seam tách**

| Đích | Lấy từ | LOC |
|---|---|---|
| `admin/pricing/PricingConfigPanel.tsx` (container) | B0+B2+tab switch | ~200 |
| `pricing/FormulaGlobalCard.tsx` | 1.129–1.271 | ~150 |
| `pricing/FormulaPreviewCard.tsx` | 1.272–1.324 | ~60 |
| `pricing/sections/ElectricitySection.tsx` | 1.325–1.483 | ~165 |
| `pricing/sections/LaborSection.tsx` | 1.484–1.660 | ~185 |
| `pricing/sections/RiskProfitSection.tsx` | 1.661–1.916 | ~265 |
| `pricing/sections/VolumeDiscountSection.tsx` | 1.917–2.033 | ~125 |
| `pricing/sections/AddonDeliverySection.tsx` | 2.034–2.149 | ~125 |
| `pricing/sections/SlicingSection.tsx` | 2.150–2.272 | ~130 |
| `pricing/MaterialsPricingPanel.tsx` | B1 materials + B4 | ~230 |
| `pricing/PrintersPricingPanel.tsx` | B1 printers + B5 | ~235 |
| `pricing/useFormulaForm.ts` / `useGlobalForm.ts` / `useCatalogCrud.ts` | B1 | ~600 |

**Kỳ vọng:** container **3.079 → ~200**; 7 file section ≤ 265; Δ ròng **−270**.
**Rủi ro: CAO** — đụng tiền. `PricingConfigPanel` là màn duy nhất ghi `pricing_configs` + `pricing_global_settings`; sai một field là lệch giá. **Bắt buộc:** golden test cho `calculateDetailedPricing` trước khi tách (§5.4 T-2).

---

### 1.3 `WorkshopSettingsView.tsx` — 2.574 LOC

**Trách nhiệm**

| # | Vùng | Dòng | LOC |
|---|---|---|---:|
| C0 | import + const (`MACHINE_STATUS_*`, `QUEUE_KANBAN_COLUMNS`, `LAB_TAB_*`, `parseRateInput`, `REGION_OPTIONS`) | 1–148 | 148 |
| C1 | state + loader + handler | 149–1.455 | **1.307** |
| C2 | render shell + tab bar | 1.456–1.696 | 241 |
| C3 | queue tab | 1.697–1.863 | 167 |
| C4 | machines tab | 1.864–1.911 | 48 |
| C5 | materials tab | 1.912–1.988 | 77 |
| C6 | accessories tab | 1.989–2.035 | 47 |
| C7 | audit_trail tab | 2.036–2.097 | 62 |
| C8 | preferences tab (form + preview) | 2.098–2.571 | **474** |

**Smell đo được**

1. **66 `useState`** (đếm `grep -c useState`): 7 tài nguyên × 3 state (`data`/`error`/`loading`) = 21, cộng ~45 state form/draft. 6 `useCallback` loader (213, 234, 247, 256, 268, …) có cùng khuôn `try → setData → catch → setError → finally setLoading`. → `useLabResource()` generic (−45).
2. **6 form handler cùng khuôn** `handleSaveMachine`(484) / `handleSaveMaterial`(582) / `handleSaveLog`(668) / `handleSaveAcc`(743) / `handleSavePreferences`(817) + `handleSaveLayerProgress`(409): validate → service → reload → toast. → `useLabForm` (−80).
3. **`MES_PIPELINE_STAGES` import từ component** (`../components/OrderProgress`, dòng 40) — view phụ thuộc component để lấy hằng nghiệp vụ.
4. Trách nhiệm "queue MES" và "cấu hình xưởng" là **hai sản phẩm khác nhau** bị nhét vào một view qua `activeTab`.

**Seam tách**

| Đích | Lấy từ | LOC |
|---|---|---|
| `lab/WorkshopSettingsView.tsx` (shell) | C0+C2 | ~210 |
| `lab/tabs/QueueTab.tsx` | C3 + `applyStage`(311) + `handleAcceptJob`(356)…`handleSaveLayerProgress`(409) | ~330 |
| `lab/tabs/MachinesTab.tsx` | C4 + 484–581 | ~250 |
| `lab/tabs/MaterialsTab.tsx` | C5 + 582–667 | ~310 |
| `lab/tabs/AccessoriesTab.tsx` | C6 + 743–816 | ~235 |
| `lab/tabs/AuditTrailTab.tsx` | C7 | ~70 |
| `lab/tabs/PreferencesTab.tsx` | C8 + 817–900 | ~500 |
| `lab/hooks/{useLabResource,useLabForm}.ts` | C1 | ~500 |

**Kỳ vọng:** **2.574 → ~210**; Δ ròng **−150**. **Rủi ro: TRUNG BÌNH** (không đụng tiền; nhưng queue ghi `orders.status_stage_index` — sai là sai MES, cần smoke browser ở `/lab/queue`).

---

### 1.4 `workshopService.ts` — 2.243 LOC

**Trách nhiệm**

| # | Vùng | Dòng | LOC | Ghi chú |
|---|---|---|---:|---|
| D0 | import + `STORAGE_KEYS` + `readFromStorage`/`writeToStorage` + `inMemoryCache` | 1–58 | 58 | localStorage helper (nay là nợ) |
| D1 | **7 bộ fixture `SEED_*`** | 60–441 | **382** | workshop/machine/material/log/designer/customer/accessory |
| D2 | "legacy admin CRUD" (getWorkshopProfiles 459 → deleteWorkshopAccessory 1.196) | 446–1.223 | **778** | trả `readFromStorage(..., SEED_*)` khi bảng rỗng **hoặc lỗi** |
| D3 | self-service `My*` (workshop owner) | 1.223–1.794 | 572 | có 3 trạng thái lỗi thật |
| D4 | catalog read (`getPrinterFleetCatalog` 1.794, `getMaterialsCatalog` 1.803) | 1.794–1.814 | 21 | |
| D5 | private mapper `mapMy*` ×6 + `computeStockStatus` + `toNumberOrNull` | 1.815–1.949 | 135 | **trùng nhiệm vụ `mappers.ts`** |
| D6 | exported types/labels (`My*`, `MY_ORDER_STATUS_*`, `MY_MACHINE_*`) + `export const workshopService = WorkshopService` (2.243) | 1.950–2.243 | 294 | |

**Smell đo được**

1. **60 method (52 public + 8 private), 26 method không còn caller thật.** Sau khi strip comment: **24 public method 0 reference (621 LOC)**. Xoá 24 method đó làm **cascade** thêm 2 method chỉ còn được gọi bởi chúng: `getDesignerProfiles`(914, 37 dòng) và `getCustomerProfiles`(1.026, 26 dòng) ⇒ **26 method / 684 LOC**. `getWorkshopProfiles`(459, 35 dòng) **phải giữ** vì `getWorkshopProfileByUserId`(499, đang dùng) gọi nó — nhưng phải **viết lại** (xem smell 2).
2. **D2 gần như dead**, chỉ 2 method còn sống: `getWorkshopProfileByUserId`(499) + `saveWorkshopProfile`(504) — dùng bởi `App.tsx:575` (`LabRoute` gate) và `WorkshopOnboardingWizard.tsx:355,369`. **Cả 2 vẫn mang pattern sai:** chúng đi qua `getWorkshopProfiles` → `readFromStorage(..., SEED_WORKSHOP_PROFILES)` khi bảng **rỗng hoặc lỗi** (490 và 23 chỗ khác: 526, 563, 605, 624, 653, 671, 714, 733, 763, 793, 833, 852, 856, 948, 984, 1012, 1049, 1081, 1105, 1156, 1176, 1197), và `saveWorkshopProfile` ghi localStorage **trước** DB (526–528). Seed có `verifiedStatus: 'Verified'` (72) ⇒ nếu một seed khớp `user_id` thì `/lab` mở bằng hồ sơ bịa; hiện seed không có `userId` nên **chưa xảy ra**, nhưng đây là bẫy. ⇒ P1 phải **viết lại 2 method này** trên `getMyWorkshopProfile` (đọc bảng thật, 3 trạng thái lỗi) chứ không chỉ xoá D2. Đây cũng chính là lý do 3 store ở `src/stores` phải viết lại (`useDesignerAdminStore.ts:6-15`, `useCustomerAdminStore.ts:5-18`).
3. **Hai tên cho một class:** `export const workshopService = WorkshopService` (2.243) ⇒ 27 call-site chia làm 2 kiểu (`WorkshopService.` 9, `workshopService.` 18) — grep nào cũng thiếu một nửa.
4. **5 private mapper (1.815–1.949)** map `workshop_machines`/`workshop_materials`/… mà `mappers.ts` (672 LOC) đã có trách nhiệm tương ứng cho bảng khác — cùng một luật "row→domain" nằm 2 nơi.
5. `33` chỗ `: any` — nhiều nhất repo.

**Seam tách**

| Đích | Lấy từ | LOC |
|---|---|---|
| `services/workshop/workshopSelfService.ts` | D3 + D4 (giữ nguyên thân hàm) | ~590 |
| `services/workshop/myMappers.ts` | D5 | ~135 |
| `services/workshop/types.ts` | D6 | ~294 |
| `services/onboardingWorkshop.ts` | `getWorkshopProfileByUserId` + `saveWorkshopProfile` | ~80 |
| **XOÁ** | D1 + D2 (dead) + helper localStorage (17–58) + alias `workshopService` | **−1.140** |

**Kỳ vọng:** 1 file 2.243 → 4 file (~1.100 tổng, file lớn nhất ~590); **Δ ròng −1.000** (sau khi trừ boilerplate + re-export). **Rủi ro: THẤP sau khi xác minh 0 caller** — đây là mục ROI cao nhất của toàn bộ audit (§8 #2).
**Gate riêng:** trước khi xoá, chạy lại phép đếm ở §9-A và `grep` trên `scripts/` (hiện 0 usage).

---

### 1.5 `ModelViewer3D.tsx` — 2.116 LOC

**Trách nhiệm**

| # | Vùng | Dòng | LOC |
|---|---|---|---:|
| E0 | type + helper (`formatSeconds`, `plateMetaText`) | 1–84 | 84 |
| E1 | state + 27 `useRef` (scene/renderer/camera/stencil/clip/fps/…) | 85–239 | 155 |
| E2 | **effect dựng scene + toàn bộ input handler** (chuột 548/558/612, wheel 641, touch 670/686/724, context-lost 740/751, fps 804, render loop 809/839/847, visibility 866) | 401–901 | **501** |
| E3 | effect mesh + stencil (`registerMeshWithStencil` 952, part material 922) | 912–1.265 | **354** |
| E4 | effect transform/clip/bed-overflow | 1.270–1.347 | 78 |
| E5 | effect material/visibility | 1.352–1.399 | 48 |
| E6 | effect slice plane | 1.404–1.421 | 18 |
| E7 | JSX chrome (toolbar, legend, FPS, overlays) | 1.701–2.115 | 415 |

**Smell**

1. **Một effect 501 dòng** chứa 11 handler + render loop + WebGL context-loss FSM. Không thể review, không thể test, và mọi thay đổi handler buộc phải đọc lại toàn bộ 500 dòng.
2. **18 `useState` + 27 `useRef`** — state UI (wireframe, fullscreen, caliper) ở cùng chỗ với tài nguyên GPU. Không có ranh giới vòng đời (mount/unmount/contextEpoch).
3. **Context-loss recovery** (148, 740–760) đúng nhưng trộn trong effect ⇒ khó chứng minh idempotent.
4. 415 dòng JSX chứa logic hiển thị FPS/legend — có thể chuyển ra component con không cần ref.

**Seam tách**

| Đích | Lấy từ | LOC |
|---|---|---|
| `three/useThreeScene.ts` | E2 phần renderer/camera/loop/context-loss (401–540, 740–901) | ~380 |
| `three/useSceneInput.ts` | 540–739 (mouse/wheel/touch) | ~200 |
| `three/useMeshStencil.ts` | E3 | ~360 |
| `three/useClipPlane.ts` | E4+E6 | ~95 |
| `tool3d/ModelViewerChrome.tsx` | E7 | ~420 |
| `tool3d/ModelViewer3D.tsx` (container) | E0+E1 | ~190 |

**Kỳ vọng:** **2.116 → ~190**; Δ ròng **+30** (hook cần thêm type cho ref). **Rủi ro: TRUNG BÌNH** — Three.js sống trong effect; tách sai thứ tự dependency là mất render. Gate: ảnh chụp canvas trước/sau cho 3 trạng thái (mesh, stencil, slice) + fps không giảm > 10%.

---

### 1.6 `Group1WorkshopsPanel.tsx` — 2.081 LOC

**Trách nhiệm**

| # | Vùng | Dòng | LOC |
|---|---|---|---:|
| F0 | import + state (16 `useState`) + 4 loader/handler | 1–125 | 125 |
| F1 | handler (fleet/partner/workshop/machine/material) | 126–690 | 565 |
| F2 | tab bar 4 nút + summary | 691–820 | 130 |
| F3 | workshops tab | 821–1.083 | 263 |
| F4 | fleet tab | 1.086–1.340 | 255 |
| F5 | materials tab | 1.343–1.428 | 86 |
| F6 | 3 `<Modal>` (workshop/machine/material) — **nằm ngoài tab switch** | 1.432–1.803 | **372** |
| F7 | partners tab | 1.806–2.076 | 271 |

**Smell**

1. **Tab-bar lặp class y nguyên 4 lần** (696–734): chuỗi `bg-surface text-fg font-semibold shadow-e1` xuất hiện **29 lần trong 6 file** (`Group1/2/3/5`, `TransformControlsPanel`, `ValidationReportPanel`). → primitive `<TabBar>` (−50 ở file này, −~120 toàn repo).
2. **3 modal 372 dòng** cùng khuôn (Field + validate + submit + reset) — ứng viên `FormModal` dùng chung với `PricingConfigPanel`/`WorkshopSettingsView`.
3. F1 (565 dòng handler) nằm **trước** JSX và trộn 4 domain (fleet, partner, workshop, machine) — không đọc được theo chiều tab.
4. Gọi `dbService` trực tiếp 4 lần (130, 154, 191, 232) — vi phạm quy ước `AGENTS.md` "never inline in components".

**Seam tách**

| Đích | Lấy từ | LOC |
|---|---|---|
| `groups/workshops/Group1WorkshopsPanel.tsx` (shell) | F0+F2 | ~160 |
| `groups/workshops/WorkshopsTab.tsx` | F3 + 375–445 | ~350 |
| `groups/workshops/FleetTab.tsx` | F4 + 126–187 | ~340 |
| `groups/workshops/MaterialsTab.tsx` | F5 + 487–530 | ~170 |
| `groups/workshops/PartnersTab.tsx` | F7 + 188–374 | ~380 |
| `groups/workshops/modals/*.tsx` | F6 | ~380 |

**Kỳ vọng:** **2.081 → ~160**; Δ ròng **−130**. **Rủi ro: THẤP–TRUNG BÌNH** (admin CRUD, có `useWorkshopAdminStore` làm nguồn dữ liệu ổn định để test).

---

### 1.7 `Tool3DView.tsx` — 1.956 LOC

**Trách nhiệm**

| # | Vùng | Dòng | LOC |
|---|---|---|---:|
| G0 | import + helper đo lường (`measuredText`, `bedOf`, `bedText`, `bedVolume`, `derivePrintabilityScore`) | 1–311 | **311** |
| G1 | 28 `useState` (files/selectedFile/plate/print params/camera/transform/modals…) | 312–577 | 266 |
| G2 | effect parse/analyze (chạy `parse3DFile` + `analyzeMeshDefects`) | 578–929 | **352** |
| G3 | JSX (upload, left config 3 tab, viewer, quote sidebar, modals) | 930–1.956 | **1.027** |

**Smell**

1. **Helper đo lường nằm trong view** (dòng 20–311): `measuredText`/`bedOf`/`bedText`/`bedVolume`/`derivePrintabilityScore` là logic thuần, dùng lại được, nhưng bị export ngầm trong file 2k dòng ⇒ không test được. 311 dòng đầu **không liên quan React**.
2. **Parse effect 352 dòng** gộp: đọc file, chọn parser, repair, analyze, set 10 state, bắt lỗi 3 loại. Đây là "application service" đội lốt `useEffect`.
3. **1.027 dòng JSX** cho 5 khối UI — không có component con nào được đặt tên.
4. 28 `useState` không nhóm theo vòng đời (file vs print params vs camera vs modal).

**Seam tách**

| Đích | Lấy từ | LOC |
|---|---|---|
| `lib/meshMetrics.ts` | G0 (trừ `derivePrintabilityScore` → `utils/meshParser` hoặc `lib/printability.ts`) | ~250 |
| `tool3d/useCadWorkspace.ts` | G1+G2 | ~560 |
| `tool3d/UploadPanel.tsx` | 930–1.040 (≈) | ~120 |
| `tool3d/ConfigPanel.tsx` (3 tab basic/analysis/color) | ~1.041–1.400 | ~380 |
| `tool3d/ViewerStage.tsx` | ~1.401–1.700 | ~280 |
| `views/Tool3DView.tsx` (container) | | ~230 |

**Kỳ vọng:** **1.956 → ~230**; Δ ròng **−60**. **Rủi ro: TRUNG BÌNH** (luồng parse là trái tim báo giá; cần test `parse3DFile` với fixture .stl/.3mf trước).

---

### 1.8 `meshParser.ts` — 1.878 LOC

**Trách nhiệm**

| # | Vùng | Dòng | LOC | Ghi chú |
|---|---|---|---:|---|
| H0 | `MeshParseError`, `ParsedMeshResult` | 1–80 | 80 | |
| H1 | `calculateVolume`(82), `calculateSurfaceArea`(118) | 82–155 | 74 | **toán học thuần** |
| H2 | `analyzeMeshDefects`(314), `aggregateDefects`(488), `measureMinimumWallThickness`(204) | 156–539 | 384 | thuần (trừ raycast) |
| H3 | repair | 540–564 | 25 | |
| H4 | XML local-name helper + `extract3MFMetadata`(619) + `extract3MFBuildMaps`(881) | 565–945 | 381 | |
| H5 | `parse3MFNative`(946) | 946–1.366 | 421 | |
| H6 | `parseCadWithWorker`(1.372) | 1.367–1.438 | 72 | |
| H7 | `measureGroupThickness`/`measureTriangularMesh`/`measureGroup` | 1.439–1.656 | 218 | |
| H8 | `read3MFMetadataFromZip` | 1.657–1.688 | 32 | |
| H9 | `parse3DFile` dispatch (3MF/STL/OBJ/STEP) | 1.689–1.878 | 190 | |

**Smell**

1. 9 trách nhiệm, 1 file; **mọi thay đổi một định dạng phải rebuild/regress cả 4 định dạng**.
2. `parse3DFile` (1.689) là dispatcher tốt, nhưng 3 nhánh loader (1.693, 1.739, 1.798) nằm inline 190 dòng.
3. Không có test: 1.878 dòng parse mà 0 fixture test.

**Seam tách (thuần move — rủi ro thấp nhất repo)**

| Đích | Lấy từ |
|---|---|
| `utils/mesh/geometryMath.ts` | H1 |
| `utils/mesh/defectAnalysis.ts` | H2 + H3 |
| `utils/mesh/threeMf.ts` | H4 + H5 + H8 |
| `utils/mesh/measure.ts` | H7 |
| `utils/mesh/parse3DFile.ts` | H6 + H9 |
| `utils/meshParser.ts` | re-export (giữ API cũ, 0 call-site đổi) |

**Kỳ vọng:** Δ ròng **0**; mỗi file ≤ 700. **Rủi ro: THẤP** vì không React, không state, đã có 1 consumer (`Tool3DView.tsx:15`) và API re-export giữ nguyên. **Đây nên là file đầu tiên được tách** — vừa lấy niềm tin, vừa tạo chỗ đặt test (§5.4 T-4).

---

### 1.9 Tổng kết LOC kỳ vọng

| Hạng mục | LOC |
|---|---:|
| 8 god file hiện tại | 18.079 |
| Sau tách (8 container + ~30 file mới) | ~16.359 (−1.720) |
| Xoá code chết ngoài god file (§4) | −1.083 |
| i18n EN branch + dictionary (§3) | −250…−350 |
| **Δ ròng ước tính** | **≈ −3.100 (−4,7% của 65.772)** |

> Đừng bán kế hoạch này bằng LOC. Bán bằng 3 con số: **file lớn nhất 3.079 → ~700** sau cùng; **số file > 1.000 dòng: 20 → 4**; **số file có test: 0 → 12**.

---

## 2. Ranh giới state & dữ liệu

### 2.1 `App.tsx` đang sở hữu gì

13 `useState` + 8 `useRef` (626–757, 1.099–1.103) và **10 lần ghi `localStorage`** (1.013, 1.060, 1.076, 1.395, 1.404, 1.417, 1.426, 1.439, 1.448, 1.478) + 1 `removeItem` (788). Nó không chỉ là router — nó là:

| Vai trò | Bằng chứng |
|---|---|
| Router + guard + shell | 1.550–1.876 |
| **Catalog store** (products + 3 mutation + realtime + rollback) | 633, 768–810, 822–879, 1.389–1.452 |
| **Settings store** (siteContent/materials/printers/accessories/pricingConfig + localStorage) | 688–757, 882–912, 1.010–1.098, 1.475–1.486 |
| **Order store** (admin orders + activeOrder + invoiceOrder) | 686, 917–928, 1.099–1.100 |
| **View-model** (`effectivePricingConfig`) | 1.045–1.058 |
| **Navigation adapter** 2 chiều | 1.138, 1.160 |
| **Chrome** | 1.877–2.138 |

### 2.2 Bảng "một thực thể — mấy nguồn sự thật"

| Thực thể | Nguồn 1 (DB) | Nguồn 2 (cache/service) | Nguồn 3 (React state) | Nguồn 4 (localStorage) | Hệ quả |
|---|---|---|---|---|---|
| `products` | `dbService.getProducts` 203 | — | `App.products` 633 | `vcube_products` 635/1.395 | 4 nguồn; rollback ghi tay 6 chỗ |
| `pricing_configs` | `dbService.getPricingConfig` 698 ← **App dùng** (`App.tsx:884`) | `settingsService` cache `pricing_configs` (`:258`, `:710`) ← **admin dùng** (`savePricingConfigAudited`) | `App.pricingConfig` 734 | `vcube_pricing_config` 1.013 | **đọc 2 đường, ghi 2 đường** |
| `site_content` | `dbService.getSiteContent` 754 ← App (`:888`) | `settingsService` cache + `useSiteContent()` ← `LanguageContext.tsx:468`, `AdminSettingsPanel` | `App.siteContent` 688 | `vcube_site_content` 690/1.478 | **storefront đọc App, admin đọc cache ⇒ có thể lệch sau khi lưu** |
| `pricing_global_settings` | `settingsService` cache | `pricingConfig.platformCommissionPercent` (bù ở 1.045–1.058) | `App.marketplaceFeePercent` 741 | — | **2 field cùng vai trò phí nền tảng** |
| `materials` | `dbService.getMaterials` 614 | — | `App.materials` 698 | `vcube_materials` 700/1.060 | App vừa đọc vừa ghi DB |
| `printer_fleet` | `dbService.getPrinters` 655 | `workshopService.getPrinterFleetCatalog` 1.794 | `App.printers` 708 + `Group1.fleetCatalog` | `vcube_printers` 710/1.076 | **3 nguồn đọc** |
| `orders` | `dbService.getOrders` 496 | — | `App.orders` 686 + `useProductionStore` | — | admin list gọi trực tiếp `dbService.getOrders` (`Group5ProductionPanel.tsx:184`) |
| `workshop_*` | `workshopService` self-service | — | 3 store `src/stores` + state tại panel | `vcube_db_*` (workshopService D2) | **D2 là nguồn thứ 2 nằm trong localStorage** |

**Kết luận:** có **4 pattern truy cập DB song song** (đúng như as-is/05 R1):
1. `services/*` (settingsService, orderService, designerService, customDesignService) — pattern tốt, có audit/validate/cache.
2. `dbService` inline trong component (11 call-site: `Group1WorkshopsPanel` 130/154/191/232, `Group2DesignersPanel` 87, `Group3CustomersPanel` 122/163, `Group5ProductionPanel` 184/251, `OrderTrackingView` 102, `useProductionStore` 202).
3. `App.tsx` làm service (mutation + rollback + localStorage).
4. Business logic export từ `database.ts` (`computeShippingFee` 33, `DEFAULT_SALES_RULES` 24 — 3 view import: `CartDrawer.tsx:5`, `CartView.tsx:5`, `CheckoutView.tsx:8`).

### 2.3 Store: 2 thư mục, 2 quy ước, không barrel

| Store | LOC | Thư mục | Dữ liệu | Persist |
|---|---:|---|---|---|
| `useCartStore` | 82 | `src/frontend/stores` | cart + discount + promo | **zustand `persist`** (`vcube_cart_store`) |
| `useUIStore` | 98 | `src/frontend/stores` | drawer/modal/chat/toast | — |
| `useWorkshopAdminStore` | 355 | `src/stores` | workshop_profiles (đọc/ghi bảng) | — |
| `useDesignerAdminStore` | 293 | `src/stores` | designer_profiles + RPC payout | — |
| `useCustomerAdminStore` | 210 | `src/stores` | customer_profiles | — |
| `useProductionStore` | 417 | `src/stores` | kanban stage + **gọi `dbService.updateOrderStatus`** | — |

**Vấn đề**
1. **Hai thư mục cùng tên "stores", không có `index.ts`** ⇒ import sâu 4 cấp (`Group1WorkshopsPanel.tsx:2`: `'../../../../stores/useWorkshopAdminStore'`) và **2 quy ước khác nhau** (frontend/stores = UI global + persist; src/stores = repository per-table). Người mới không biết đặt store mới ở đâu.
2. **`useUIStore.toasts` là bản sao của `toastQueue`** (`useUIStore.ts:26` vs `:25`), cập nhật song song ở `:76`, `:87` nhưng **reset chỉ một phía** ở `:95` (`toastQueue` filter, `toasts` filter riêng) — dễ lệch; `ToastViewport.tsx` (297 dòng) là consumer duy nhất của `toasts` và **có 0 importer**.
3. **Store vừa chứa state, vừa gọi DB** (`useProductionStore.ts:202`, `useWorkshopAdminStore`, `useDesignerAdminStore` gọi `supabase` trực tiếp) ⇒ không test được nếu không mock Supabase; đồng thời **bỏ qua `services/*`** (không audit, không validate).
4. `useCartStore` là **store duy nhất persist đúng cách** — 17 key localStorage còn lại không đi qua store nào (§9-C).

### 2.4 `dbService` vs `settingsService` vs `orderService`

| Chức năng | `database.ts` | `services/*` | Trùng? |
|---|---|---|---|
| đọc `pricing_configs` | `getPricingConfig` 698 | `settingsService.getPricingConfig` 710 | **CÓ** — khác shape (`throw` vs `null`) |
| ghi `pricing_configs` | `savePricingConfig` 723 | `savePricingConfig` 934 (+audit+cache) | **CÓ** — `dbService` version **0 caller** |
| đọc `site_content` | `getSiteContent` 754 | `settingsService.getSiteContent` 697 | **CÓ** |
| ghi `site_content` | `saveSiteContent` 766 | `saveSiteContent` 888 (+audit+cache) | **CÓ** — App dùng bản `dbService` (1.484) ⇒ **mất audit** |
| đọc `orders` | `getOrders` 496 | `OrderService.getOrdersByCustomer` 43 | **CÓ** (mỏng) |
| ghi `orders` | `saveOrder` 375 | `OrderService.createOrder` 29 | **CÓ** (wrapper) |
| đổi stage | `updateOrderStatus` 458 | `OrderService.updateOrderStatus` 47 | **CÓ** |
| đọc `user_profiles` | `getUsers` 559 | — | — |
| ghi `user_profiles` | `saveUser` 574 | — | — |
| phí ship | `computeShippingFee` 33 | — | **business logic trong adapter** |

**7 hàm ghi settings cho 4 bảng** (6 cửa + 1 dispatcher): `database.savePricingConfig`(723), `database.saveSiteContent`(766), `settingsService.saveAppSettings`(809), `savePricingGlobalSettings`(842), `saveSiteContent`(888), `savePricingConfig`(934), `saveSettingsPatch`(1002 — gọi lại 4 hàm trên). Chỉ 4 hàm `settingsService` có **audit + cache + realtime + validate**; `database.*` không có ⇒ lựa chọn cửa ghi = lựa chọn *có/không audit*.

### 2.5 Mappers

- `src/backend/supabase/mappers.ts` (672) là pattern **tốt nhất repo**: 16 hàm `rowTo*` + `appSettingsToRow`, **chỉ import type** ⇒ pure, test được ngay (§5.4).
- **Nhưng:** `AppSettings` (interface) lại định nghĩa **trong** `mappers.ts:537` ⇒ `LanguageContext.tsx:4` và `useSettings.ts:25` phải `import type { AppSettings } from '@backend/supabase/mappers'` — domain type nằm trong tầng hạ tầng.
- **Trùng lặp ngoài mappers:** `workshopService` 5 private mapper (1.815–1.949) ✚ `settingsService.rowToPricingGlobalSettings`(395) ✚ `rowToAudit`(736) ✚ `database.readSiteContentExtras`(88) **so với** `settingsService.siteContentExtras`(508) — hai bản cùng logic 33 dòng (xem diff: `database.ts:88-118` vs `settingsService.ts:508-536`).

### 2.6 `settingsService` cache

- Thiết kế đúng: `cache` + `loadedAt` + `listeners` + **1 channel realtime** cho cả app (`settingsService.ts:265-320`), phân biệt `undefined` = chưa đọc vs `null` = chưa cấu hình.
- **Vấn đề không nằm ở cache, mà ở chỗ có 2 đường đọc:** `useSettings.ts` (cache) và `App.tsx` (`dbService`, 882–912). `App` không subscribe cache cho `siteContent`/`materials`/`printers`/`accessories`, chỉ subscribe cho `marketplaceFeePercent` (758). ⇒ **Admin lưu site content → cache đổi → storefront vẫn dùng state cũ của App tới khi reload.**
- `clearSettingsCache()` (302) được export nhưng **0 caller** — đăng xuất không xoá cache settings.

### 2.7 Kế hoạch hợp nhất (P2 + P3)

**Mục tiêu:** *mỗi thực thể có đúng 1 đường đọc + 1 đường ghi; localStorage chỉ còn cho cart.*

| Bước | Việc | LOC |
|---|---|---|
| S1 | Thêm `src/backend/services/{catalogService,siteContentService}.ts` **thật** (thay stub trả `[]`): bọc `dbService` + trả `WriteResult`. Chuyển `computeShippingFee` + `DEFAULT_SALES_RULES` từ `database.ts` sang `services/shippingService.ts`. | +180 / −80 |
| S2 | `App.tsx` bỏ hẳn 4 state settings + 4 ghi localStorage (pricing/materials/printers/siteContent); đọc qua `useSettings()`/`useCatalog()`; realtime giữ 1 chỗ trong hook. **Xoá `dbService.getPricingConfig`/`savePricingConfig`/`getSiteContent`/`saveSiteContent`.** | **−200** |
| S3 | `effectivePricingConfig` → `usePricingView()` (1 hook) đọc `settingsAccessors.pricingGlobal()`; xoá phép bù `platformCommissionPercent` bằng cách chốt **1 field** cho phí nền tảng (cần quyết định nghiệp vụ, xem §7 D-3). | −25 |
| S4 | Gom store về `src/stores/` (+ `index.ts` barrel): `cart/`, `ui/`, `admin/{workshop,designer,customer,production}`. Bỏ `useUIStore.toasts` + xoá `ToastViewport.tsx`. | −300 |
| S5 | Đưa 11 call-site `dbService` inline trong component về service tương ứng (S1). | −60 |
| S6 | `PricingGlobalSettings` **một định nghĩa** (`settingsService.ts:362`); xoá bản `src/types/index.ts:1058` + field chết `InkiriCalculationInput.globalSettings` (`types:1116`, 0 reference trong `pricingEngine.ts`). `AppSettings` chuyển về `src/types`. | −45 |
| S7 | `siteContentExtras` **một bản**; 5 mapper `workshopService` chuyển vào `mappers.ts`. | −90 |

**Rủi ro: CAO** (chạm mọi màn). **Bắt buộc làm trước `App.tsx` (§1.1)** và **sau khi có test mappers** (§5.4).

---

## 3. Bilingual dead code

### 3.1 Bằng chứng: `language === 'en'` là trạng thái **không thể tới**

| Bằng chứng | Dòng |
|---|---|
| State khởi tạo cứng `'vi'` | `src/frontend/context/LanguageContext.tsx:459` |
| `setLanguage` bỏ tham số, luôn `setLanguageState('vi')` | `:472-474` |
| `toggleLanguage` = `setLanguage('vi')` (no-op) | `:481` |
| Comment chính chủ: "UI **tiếng Việt duy nhất**… KHÔNG tồn tại đường nào đưa `language` về `'en'`" | `:7-10` |
| `t()` bỏ qua `_fallbackEn`, không nhánh EN | `:490-505` |
| Không đọc `localStorage`/URL để đổi ngôn ngữ | `:456-459` |

⇒ Mọi `isVi ? A : B` trả **A**; **B là dead code** ở 1.201 điểm.

### 3.2 Số đo & LOC thực sự xoá được

| Hạng mục | Số đo | LOC xoá được |
|---|---|---:|
| Ternary `isVi ?` | **1.201** trong **32 file** | 1.201 là *điểm sửa*, **không** phải dòng xoá |
| — nhánh EN inline (`: '...'`) | **62.003 ký tự** (≈ 1,4% tổng `src`) | ~120–180 dòng khi dòng không còn wrap |
| — ternary nhiều dòng (mở đầu bằng `isVi ?`) | 10 | ~20 |
| `const isVi = language === 'vi';` | 28 file | 28 |
| `DICTIONARY` 85 khoá × `{vi, en}` | `:36-414` (378 dòng) | **85** (bỏ `en:`) |
| `language === 'vi'` (46) + `configuredClaims(language, …)` | `:463-466`, `:414-445` | ~15 |
| `labelEn`/`shortEn` trong `KANBAN_STAGES` (`useProductionStore.ts:27-…`) + `labelEn` khác | 98 ký hiệu; **chỉ 4 consumer, tất cả nằm trong nhánh EN chết** (`Group5ProductionPanel.tsx:276/283/290`, `Group0OverviewPanel.tsx:249`) | ~20 |
| **Tổng** | | **≈ 250–350 dòng** + 62 KB chuỗi chết |

Phân bố nặng nhất: `Group1WorkshopsPanel` 162, `ExploreView` 113, `Group3CustomersPanel` 105, `HomeView` 91, `AdminDashboardView` 65, `Group2DesignersPanel` 63, `AdminProductsPanel` 56.

### 3.3 Rủi ro codemod

| Rủi ro | Mức | Kiểm soát |
|---|---|---|
| Codemod regex làm hỏng chuỗi chứa `:` / `?` / `'` (tiếng Việt có dấu `?`) | **CAO** | Dùng **AST** (`typescript` đã có trong devDeps): `ts.createSourceFile` + `ts.forEachChild`, chỉ xử lý `ConditionalExpression` có `condition` là identifier `isVi` |
| Ternary lồng nhau (`a ? b : isVi ? c : d`) | **CAO** | AST thay đúng node; không dùng regex |
| `isVi` dùng trong **JSX text/attribute** (`{isVi ? 'x' : 'y'}`) | TRUNG BÌNH | AST `JsxExpression`; giữ `{A}` thay vì string trần để không đổi whitespace |
| `isVi` được truyền làm **tham số** (`AdminSettingsPanel.tsx:80` `validate(form, isVi)`) | TRUNG BÌNH | Xoá tham số theo từng file, không máy móc |
| `isVi` dùng trong template literal nhiều dòng | TRUNG BÌNH | AST `TemplateExpression` |
| Xoá `useLanguage()` khi file không còn dùng `language`/`t` | THẤP | `tsc --noUnusedLocals` bắt được (hiện `strict:false`, không bật) |
| Mất chuỗi EN khi sau này mở i18n | **CÓ CHỦ Ý** | Quyết định D-1 (§7): 1 ngôn ngữ. EN nằm trong git history + `DICTIONARY` giữ `vi` |
| Diff lớn 1 lần (32 file) → review không nổi | **CAO** | Chia 3 đợt: (a) 10 file nhỏ, (b) admin groups, (c) storefront. Mỗi đợt ≤ 400 dòng diff |

**Cấm:** codemod toàn repo trong 1 commit. as-is/05 R5 đã chốt "bỏ dần khi động file, **không codemod hàng loạt**" — file này **giữ nguyên kết luận đó**, chỉ bổ sung: nếu làm thì phải AST + chia đợt.

**Chiến lược 2 bước (rẻ, an toàn, làm được ngay):**
1. **Bước A (28 dòng, rủi ro ~0):** `const isVi = language === 'vi'` → `const isVi = true`. Không đổi hành vi (vì luôn `true`), nhưng **biến nhánh chết thành hiển nhiên** và cho phép `tsc`/reviewer thấy ngay.
2. **Bước B (theo file):** AST transform `isVi ? A : B` → `A`; xoá `isVi`; bỏ `useLanguage` nếu không còn dùng.

### 3.4 Mục tiêu "một ngôn ngữ"

| Hạng mục | Quyết định đề xuất |
|---|---|
| Ngôn ngữ UI | **Tiếng Việt duy nhất** (đúng `LanguageContext.tsx:7` + quyết định A7/D0 đã thi hành) |
| `Language` type | Giữ `'vi' / 'en'` **1 pha** để không phá API, sau đó thu về `'vi'` |
| `t()` | Giữ (đã dùng 25 chỗ + đọc claim admin), bỏ tham số thứ 3 `_fallbackEn` |
| `DICTIONARY` | Bỏ `en:`; giữ `vi` (một số khoá `vi:''` là **có chủ ý** — nhóm C, đừng "sửa" thành chữ) |
| Chuỗi EN | Không thay bằng tiếng Việt máy dịch. Chuỗi EN chết thì **xoá**; chuỗi EN là *nhãn kỹ thuật* (FDM, SLA, STL) thì giữ |
| Gate chống tái phát | thêm `scripts/check-single-language.mjs` (đếm `isVi ?`, `language === 'en'`, `en:` trong DICTIONARY) vào `gate-manifest.json` với ngưỡng giảm dần |

---

## 4. Tầng service: dead & duplicate

### 4.1 Dead — 0 importer (đã xác minh, comment-stripped)

> **Quan hệ với [`DEAD-CODE.md`](./DEAD-CODE.md):** file đó là **danh sách chuẩn** (ID `D01`–`D30`). Mục này **không lặp lại** `D11`–`D13` (mock constant, 8 type chết, 6 `dbService` method 0 caller) và `D21`–`D28` (config/artifact/dependency) — đã có bằng chứng ở đó. Dưới đây là phần **xác minh độc lập** (có ID đối chiếu) + phần **DEAD-CODE bỏ sót**.

| ID | File / khối | LOC | Bằng chứng 0 reference | Ghi chú |
|---|---|---:|---|---|
| D01 | `src/backend/index.ts` (barrel) | 8 | **0 file** import `@backend` / `../backend` | barrel chết ⇒ D02–D04 chết theo |
| D02 | `src/backend/services/catalogService.ts` | 34 | chỉ được `backend/index.ts:7` export | 4 method, **tất cả `return []`** — "service" không có dữ liệu |
| D03 | `src/backend/services/pricingService.ts` | 46 | chỉ `backend/index.ts:6` | `getMaterials`/`getPrinters` trả `[]`; `getFormulaConfig` trả hằng mẫu mà chính comment (`:16-19`) nói "KHÔNG được dùng làm fallback" |
| D04 | `src/backend/supabase/seedService.ts` | 134 | chỉ `backend/index.ts:4`; `syncFromSupabase` 0 caller | `mappers.ts:377` còn comment tham chiếu |
| D05 | `src/frontend/data/mockData.ts` | 1 | 0 importer | shim `export *` |
| D06 | `src/frontend/types/index.ts` | 1 | 0 importer | shim `export *` |
| D07 | `src/frontend/utils/pricingEngine.ts` | 1 | 0 importer | shim `export *` |
| D08 | `src/frontend/ui/Section.tsx` | 117 | 0 import | |
| D09 | `src/frontend/ui/Toolbar.tsx` | 87 | 0 import | |
| D10 | `src/frontend/ui/ToastViewport.tsx` | 297 | 0 render; `useUIStore.toasts` chỉ phục vụ nó | xoá cùng `toasts` |
| D19 | `test-pricing.ts` (root) | 357 | **không chạy được**: import `./src/backend/services/pricingEngineService` + `./src/backend/services/quoteVerifier` — cả hai **không tồn tại** (`ERR_MODULE_NOT_FOUND` đã tái hiện) | ngoài `tsconfig include` nên `npm run lint` không bắt |
| — | `src/frontend/services/` (thư mục) | 0 | **rỗng** | xoá (DEAD-CODE không liệt kê) |
| **#** | **`workshopService` D1+D2 + helper localStorage** | **1.140** | xem §1.4 — **DEAD-CODE §8 đang hoãn mục này với lý do "admin panel còn dùng"; lý do đó SAI** | 26 method (684) + 7 bộ `SEED_*` (382) + helper (42) + comment/header (~31); **2 method onboarding phải viết lại, không xoá** |
| | **Tổng phần xác minh ở đây** | **≈ 2.223** | | = **1.083** (`D01`–`D10`+`D19`, khớp tuyệt đối với DEAD-CODE) + **1.140** (`workshopService`) |
| | **Tổng toàn bộ dead (gộp DEAD-CODE)** | **≈ 2.700–2.800** | | thêm `D11` ~120–160, `D12` ~100–150, `D13` ~168, `D21`–`D28` (config/lock/dep) |

> ✅ **Trạng thái thi công (cập nhật cuối ngày 2026-10-21):** `D01`–`D10` + `D19` **đã được xoá** trên working tree bởi Phase 1 (cùng `bun.lock`, `firebase*`, `metadata.json`, `firestore.rules`). `test-pricing.ts` cũng đã xoá; `src/frontend/services/` (thư mục rỗng) **vẫn còn**. **Còn nguyên:** `workshopService` (2.243 dòng, chưa chạm), 1.201 `isVi`, toàn bộ §2/§5/§6. ⇒ các mục §4.1 ở trên nên đọc là **bằng chứng của audit**, không phải việc còn phải làm — trừ dòng `#` (`workshopService`) và `src/frontend/services/`.

### 4.2 Trùng lặp

| Cặp trùng | Vị trí A | Vị trí B | Xử lý |
|---|---|---|---|
| `computeShippingFee` + `DEFAULT_SALES_RULES` trong **DB adapter** | `database.ts:24,33` | dùng bởi 3 view | → `services/shippingService.ts` |
| `getPricingConfig` / `savePricingConfig` | `database.ts:698,723` | `settingsService.ts:710,934` | xoá bản `database` (bản `save` có **0 caller**) |
| `getSiteContent` / `saveSiteContent` | `database.ts:754,766` | `settingsService.ts:697,888` | xoá bản `database`; App chuyển sang `settingsService` |
| `readSiteContentExtras` | `database.ts:88-118` (31 dòng) | `settingsService.ts:508-536` (29 dòng) | gộp 1 bản trong `settingsService` |
| `rowToPricingGlobalSettings` | `settingsService.ts:395` | (không có ở `mappers.ts`) | chuyển vào `mappers.ts` để cùng chỗ |
| 5 mapper `workshopService` | `workshopService.ts:1.815-1.949` | `mappers.ts` | gộp |
| `OrderService` bọc `dbService` | `orderService.ts:29-58` | `database.ts:375/458/496` | giữ `OrderService`, cho `dbService` private |
| `getUsers` gọi từ 3 panel | `Group2:87`, `Group3:122`, `Group5:184` (`dbService`) | — | đưa vào `services/userService.ts` |
| **Validation hotline** | `App.tsx:1.493` (regex tự viết) | `settingsService.ts:163` `isValidHotline` | dùng hàm chung; App không được validate lại |
| Validators bị **khoá trong module có side-effect** | `settingsService.ts:120-236` (7 hàm) | module `import { supabase }` ⇒ test phải mock | tách `backend/lib/validation.ts` (pure) |
| `MY_*_LABELS` / `KANBAN_STAGES.labelVi` | `workshopService.ts:2.190+`, `useProductionStore.ts:27+` | 2 bảng nhãn cho cùng 8 stage | 1 nguồn `domain/orderStages.ts` |
| **2 tên cho 1 class** | `WorkshopService` | `export const workshopService = WorkshopService` (`:2.243`) | 1 tên |

### 4.3 Type duplication

| Type | Định nghĩa 1 | Định nghĩa 2 | Vấn đề |
|---|---|---|---|
| `PricingGlobalSettings` | `src/types/index.ts:1058` (14 field: `electricityRateVndKwh`, `profitMode`, `enableAccessoriesPricing`…) | `backend/services/settingsService.ts:362` (8 field nullable đúng cột DB) | **shape KHÔNG tương thích**. Bản `types` chỉ còn dùng ở `InkiriCalculationInput.globalSettings` (`types:1116`) — mà field đó **engine không đọc** (`grep globalSettings src/utils/pricingEngine.ts` = 0) ⇒ dead |
| `AppSettings` | `backend/supabase/mappers.ts:537` | — | domain type trong tầng mapper |
| `WorkshopProfile`/`Machine`/`Material`/`Designer`/`Customer`/`Accessory` | `src/types/index.ts:956-1.087` | — | OK (một chỗ) |
| `language` type + `Language` | `LanguageContext.tsx:11` | — | OK |
| `WriteResult` / `ValidationIssue` | `backend/lib/result.ts:1` | re-export ở `settingsService.ts:60` | **OK — pattern tốt**, nên nhân rộng |

### 4.4 Kết luận §4

- **Xoá** (không cần thay thế): 4 service/barrel + 3 shim + 1 thư mục rỗng + 3 UI primitive + `test-pricing.ts` ≈ **1.083 dòng**.
- **Xoá** trong `workshopService`: **1.140 dòng** (D1+D2+helper), giữ 3 thứ đang chạy được (self-service, catalog read, onboarding) — trong đó **2 method onboarding phải viết lại**, không chỉ giữ nguyên.
- **Hợp nhất**: 7 hàm ghi settings (6 cửa + dispatcher) → 4; 2 đường đọc `pricing`/`siteContent` → 1; 2 bản `siteContentExtras` → 1; 2 shape `PricingGlobalSettings` → 1.
- **Sửa `DEAD-CODE.md` §8:** mục "`workshopService` `SEED_*` + legacy `getWorkshop*`/`saveWorkshop*` — *vẫn được admin panel dùng*" là **không đúng**. Bằng chứng: 3 panel admin dùng `use*AdminStore` (`Group1WorkshopsPanel.tsx:2`, `Group2DesignersPanel.tsx:2`, `Group3CustomersPanel.tsx:2`) và **không** gọi `WorkshopService.getWorkshop*` (grep 0 hit, đã strip comment); 2 method còn sống chỉ phục vụ `LabRoute` (`App.tsx:575`) + onboarding (`WorkshopOnboardingWizard.tsx:355,369`). ⇒ có thể xoá **1.140 dòng** sớm hơn 1 phase, với điều kiện viết lại 2 method đó (§1.4).

---

## 5. Test & observability

### 5.1 Hiện trạng

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| `tests/unit/` | **rỗng** (0 file) | `ls -la tests/unit` |
| `tests/adversarial/` | **rỗng** (0 file) | `ls -la tests/adversarial` |
| Test runner | **không có** (`vitest`/`jest` không nằm trong `package.json`) | devDeps |
| `test-pricing.ts` (root) | **hỏng**, không chạy *(đã bị Phase 1 xoá trong ngày — vẫn cần test thật thay thế)* | import 2 module đã xoá; `ERR_MODULE_NOT_FOUND` |
| `scripts/test-catalog-sync.ts` (6.413 B) | chạy được **nếu có env + mạng** | gate `test-catalog-sync` |
| Số gate trong `gate-manifest.json` | **17** (2 `live`, 2 `advisory+optional`) | `scripts/gate-manifest.json` |
| Gate **unit test** | **0** | manifest |
| `tsconfig.include` | `src/**/*`, `vite.config.ts` | ⇒ `scripts/**` + `test-pricing.ts` **không được typecheck** |
| `strict` | **false** + 139 `: any` + 63 `as any` | `tsconfig.json:31` |

### 5.2 Gate hiện có KHÔNG thay được unit test

`check-fabricated`, `check-ui-rules`, `check-error-handling`, `check-contrast*`, `check-icon-names`, `lint-rls-*`, `a8-sql-syntax-check` đều là **heuristic tĩnh trên text/regex**. Chúng bắt được "số bịa trong UI", "class Tailwind sai", "catch nuốt lỗi" — **không** bắt được "mapper đổi key" hay "pricing lệch 1 hằng số". Đó chính là 2 loại lỗi mà refactor §2/§1 sẽ tạo ra.

### 5.3 Baseline của gate đã cũ

- `docs/tasks/baseline.json` ghi `date: 2026-09-24`, "chạy trên main @ **4a7eea5**".
- HEAD hiện tại: **`aaff7c4`** — **4 commit sau** baseline (`a59ef03`, `97cc256`, `4d4a5d1`, `aaff7c4`).
- Hệ quả: `verify-rls` baseline `rc:1` / `inspect-db` baseline `rc:1` là **số của quá khứ**; một hồi quy mới sẽ bị "baseline đã đỏ" che mất.
- **Việc cần làm ở P0:** `npm run check -- --update-baseline` (hoặc cơ chế tương đương của `run-checks.mjs`) sau khi commit cây hiện tại, **trước** khi bắt đầu refactor.

### 5.4 Test đề xuất — theo thứ tự "rẻ & chặn rủi ro"

| ID | Đối tượng | File test | Vì sao rẻ | Bắt được lỗi gì |
|---|---|---|---|---|
| **T-1** | `mappers.ts` — 16 `rowTo*` + `appSettingsToRow` | `tests/unit/mappers.test.ts` | **pure**, chỉ import type; không cần mock | refactor §2/§3 làm đổi key/`null`→`0`; chính là nguồn "số bịa" cũ |
| **T-2** | `pricingEngine.calculateDetailedPricing` | `tests/unit/pricing.test.ts` | cần **golden fixture** (input JSON + expected) — chụp trước khi tách §1.2 | lệch giá sau khi tách `PricingConfigPanel`; thiếu tham số phải `PricingUnavailableError` |
| **T-3** | validators `isValidTaxCode/Email/Hotline/BankAccount/VatPercent/MarketplaceFeePercent/ShippingFee` | `tests/unit/validation.test.ts` | cần **tách khỏi `settingsService`** (module có `supabase` import) | App.tsx:1.493 từng viết lại `isValidHotline`; regex lệch |
| **T-4** | `meshParser.parse3DFile` + `calculateVolume`/`analyzeMeshDefects` | `tests/unit/meshParser.test.ts` + fixture `.stl/.3mf` nhỏ | tách §1.8 trước, rồi test ngay | mất định dạng khi tách; `null` (chưa đo) bị coi là `0` |
| **T-5** | `computeShippingFee` + `DEFAULT_SALES_RULES` | `tests/unit/shipping.test.ts` | pure (sau khi chuyển sang `services/`) | vận chuyển miễn phí/ngưỡng sai |
| **T-6** | `vat.ts` (`computeVat`, `vatRateFromPercent`) + `format.ts` | `tests/unit/vat.test.ts`, `format.test.ts` | pure, 0 import ngoài type | làm tròn VAT/tiền |
| **T-7** | `settingsService` cache semantics (`undefined` vs `null`, `clearSettingsCache`) | `tests/unit/settingsCache.test.ts` | mock `supabase.from` (1 module) | "chưa đọc" bị hiểu là "chưa cấu hình" |

**Hạ tầng tối thiểu (không thêm dependency):** dùng `node:test` + `node:assert` có sẵn trong Node 20+, chạy qua `tsx` (đã có):
`"test": "tsx --test tests/unit/*.test.ts"` → thêm 1 gate `unit` vào `gate-manifest.json`.
Nếu chủ dự án chấp nhận **1 devDependency** thì `vitest` cho DX tốt hơn (watch, coverage) — đây là quyết định D-2 ở §7.

### 5.5 Observability

| Chỉ số | Hiện tại | Nhận xét |
|---|---:|---|
| `console.warn` | **81** | 53 trong `catch` (theo `baseline.json`) |
| `console.error` | **18** | |
| `catch` block | **182** | |
| `catch` rỗng / có comment | **7 + 1** | 1 chỗ `catch {}` hoàn toàn im lặng |
| `reportError()` call-site | **3** | `frontend/lib/reportError.ts` (34 dòng) tồn tại đúng thiết kế nhưng gần như không dùng |
| Error boundary | **3** (`RouteErrorBoundary`, `CanvasErrorBoundary`, `PanelErrorBoundary`) | pattern tốt, phủ đủ 3 tầng |
| Toast lỗi tự dismiss | **không** (`useUIStore.ts:50`) | đúng (lỗi phải ở lại) |
| Log tập trung / sink | **không có** | `reportError` chỉ `console.error`, không có nơi nhận |

**Đề xuất (rẻ):** thay `console.warn` trong `catch` bằng `reportError('<context>', e)` **theo từng file khi đụng file đó** (không codemod); hạ trần `check-error-handling` từ 53 xuống theo từng pha. Thêm `opts.toast` chỉ ở nơi người dùng cần biết.

---

## 6. Docs drift & kế hoạch tài liệu chuẩn

### 6.1 Sai lệch có số (đã kiểm bằng SQL/grep)

| Tuyên bố | Nơi ghi | Sự thật (2026-10-21) |
|---|---|---|
| "31 bảng + 1 view" | `AGENTS.md:61`, `AGENTS.md:101`, `docs/README.md:47,58`, `docs/SETUP_RUNBOOK.md:396,532`, `docs/database/seeds-and-migrations.md:37,122`, `docs/security/rls-runbook.md:119,291,319,341`, `docs/tasks/DOCS-REVIEW-BACKLOG.md:286` (**≥ 8 chỗ**) | **32 bảng** (`designer_payout_info` thêm bởi `supabase/migrations/20261013090000_sec01_payout_table.sql:31`) + **2 view** (`pricing_config` `20260901…:479`, `open_design_requests` `20261012090000…:39`) |
| Chuỗi migration **3 file** | `AGENTS.md:59-63` | **12 file** trong `supabase/migrations/` (9 file sau `20261010` không có trong bảng) |
| "7 hàm + 5 định nghĩa trigger (25 instance)" / "13 hàm, 7 định nghĩa (27 instance)" | `AGENTS.md:61` | baseline có **7 `create function`** + **3 `create trigger`**; cộng dồn 12 file: **26 `create function`**, trigger tạo động trong `DO` block ⇒ **không đếm được bằng grep**, phải đếm trên DB |
| "90 policy + 6 storage" | `docs/README.md:47`, `docs/security/rls-policies.md:5` | harden tạo policy **động trong `DO` block** — số 90/88/92 chỉ tin được từ `scripts/verify-rls.mjs`, không từ grep |
| `docs/database/schema.md` (64 KB, viết tay) | — | **thiếu hẳn** `designer_payout_info` (0 hit) và `open_design_requests` (0 hit) |
| "Dark Opt-In (user override)", "ThemeProvider" | `docs/README.md:31,37` | `src/frontend/theme/` chỉ có `tokens.ts`; **không có `ThemeProvider`**; thiết kế là **light-only** (`docs/design/taste-contract.md`) |
| Route table sinh tự động | `docs/pages/_routes.generated.md:1` | **cũ**: `source-sha256: 48f2f15ebd73` vs `sha256(src/App.tsx) = 8dd75d3d0aa5` |
| "39 plan cũ đã archive" | `AGENTS.md` §Tài liệu | đúng: **39** file trong `docs/plans/` đều có banner SUPERSEDED; **nhưng vẫn nằm nguyên chỗ** và **31 reference trong 29 file `src/`** (`docs/archive/README.md` ghi 34) |
| `doc-meta` | — | `check-doc-freshness.mjs`: **77** file quét, **20 thiếu marker**, **2 malformed**, 0 stale |

### 6.2 Nguyên nhân gốc của drift

1. **Số liệu schema/docs chép tay** từ SQL sang Markdown ⇒ mỗi migration mới làm sai 8+ chỗ cùng lúc.
2. **Gate phát hiện drift là advisory**: `check-doc-refs` (151 dead path) + `check-doc-freshness` đều `advisory:true, optional:true` ⇒ **không chặn ai**.
3. **Generator đã có nhưng không chạy**: `scripts/gen-routes-doc.mjs` sinh đúng, nhưng không nằm trong `gate-manifest.json` ⇒ hash lệch đã tồn tại mà không ai biết.
4. **Kế hoạch cũ để nguyên vị trí**: 39 file `docs/plans/**` vẫn là "nguồn" trong mắt người mới; 29 file source trỏ vào đó bằng **số dòng** (đã mục — xem `settingsService.ts:40-44` trỏ `workshopService.ts:1081-1116` nay là code khác).

### 6.3 Kế hoạch tài liệu chuẩn (canonical)

**Nguyên tắc:** *số liệu sinh ra, không chép tay; kế hoạch cũ chỉ đọc, không trỏ tới.*

| Tầng | File | Cơ chế |
|---|---|---|
| Portal | `docs/README.md` | **bỏ mọi con số** (31 bảng, 90 policy, dark theme) → trỏ `_facts.generated.md` |
| Sự thật sinh tự động | **`docs/database/_schema.generated.md`** (mới) | `scripts/gen-schema-doc.mjs` parse `supabase/migrations/*.sql` (bảng/cột/index/function/trigger/view) — như `gen-routes-doc.mjs` |
| | `docs/pages/_routes.generated.md` (đã có) | thêm vào gate (không advisory) |
| | **`docs/_facts.generated.md`** (mới) | 1 khối "số hiện tại": bảng/view/index/policy/route/LOC/test — mọi doc khác **link** tới đây thay vì chép |
| Kiến trúc | `docs/architecture/{system-overview,3d-cad-pipeline,pricing-engine}.md` | giữ; thêm **`data-flow.md`** mô tả 4 pattern truy cập DB (§2.2) và đường đọc/ghi chuẩn |
| Database | `docs/database/{schema,_schema.generated,seeds-and-migrations,schema-notes}.md` | `schema.md` → **banner "xem bản generated"** |
| Security | `docs/security/{rls-policies,rls-runbook}.md` | số policy **chỉ** lấy từ `verify-rls.mjs` output |
| Tasks | `docs/tasks/optimization/0N-*.md` (bộ mới) | kế hoạch đang hiệu lực; `docs/tasks/as-is/**` = baseline đo |
| Archive | `docs/archive/README.md` + `docs/plans/**` | **giữ nguyên vị trí** (đã có lý do kỹ thuật) nhưng: (a) thêm `docs/plans/README.md` nói rõ "không phải nguồn"; (b) **cấm trỏ bằng số dòng** vào `docs/plans` trong code mới (gate `lint-doc-refs` mở rộng sang `src/**`) |

**Gate mới (P8)**
- `gen-schema-doc --check` (hash nguồn như routes) → chặn nếu `_schema.generated.md` lệch.
- `check-doc-facts`: mọi câu "N bảng"/"N view"/"N policy" trong `docs/**` phải khớp `_facts.generated.md` → nếu sai, fail.
- `check-doc-refs` chuyển `--strict`; `check-doc-freshness` thêm `--strict` cho file `status=active`.
- Việc **bắt buộc** trước khi bật strict: xử lý 20 marker thiếu + 151 dead path (danh sách có trong output `--json`).

---

## 7. Kế hoạch refactor theo pha

### 7.0 Quan hệ với [`PLAN.md`](./PLAN.md) — tránh hai kế hoạch song song

`PLAN.md` (owner `lead`, status `draft`) là **kế hoạch cấp phase**. Mục §7 này là **work breakdown + gate chi tiết** cho các phase đụng code refactor, không phải kế hoạch cạnh tranh.

| PLAN.md | Nội dung | Tương ứng ở đây | Ghi chú |
|---|---|---|---|
| Phase 0 | Checkpoint & baseline | **P0** | Đã xong phần commit (`4d4a5d1`, `aaff7c4`); còn refresh `baseline.json` |
| Phase 1 | Xoá dead code `D01`–`D13`, `D19`–`D28` | **P1** | §4.1 map ID; **cộng thêm** `workshopService` (1.140) mà PLAN hoãn sang Phase 3 |
| Phase 2 | Một ngôn ngữ | **P6** | Khác thứ tự (xem dưới) |
| Phase 3 | Hợp nhất data/state | **P2 + P3** | §2.7 là work breakdown S1–S7 |
| Phase 4 | Tách god-file | **P5a–P5f** | §1.1–§1.8 là seam theo dòng |
| Phase 5 | Bundle & dependency | — | Ngoài phạm vi file này; xem `RESOURCES.md` / `03-resources.md` |
| Phase 6 | Docs-as-code & test | **P7 + P8** | §5.4 (test) + §6.3 (docs) |
| Phase 7 | Feature/data wiring | — | Ngoài phạm vi (feature, không phải refactor) |

**Hai điểm KHÁC `PLAN.md` — cần lead chốt:**

1. **Thứ tự i18n.** `PLAN.md` để Phase 2 (ngay sau dead code) và ước "**~500–1.200 LOC**". Audit này khuyến nghị **làm sau cùng (P6)** và ước **250–350 LOC**:
   - *Vì sao sau:* i18n chạm **32 file**, trùng gần hết với file mà P2/P4/P5 sẽ sửa (`Group1WorkshopsPanel` 162, `AdminDashboardPanel`…). Làm trước = **merge conflict 2 lần** trên cùng dòng.
   - *Vì sao 250–350 chứ không 500–1.200:* `PLAN.md` đếm **số dòng bị chạm**; audit này đếm **số dòng biến mất** (bỏ nhánh EN của ternary **không xoá dòng**, chỉ rút ngắn; chỉ 85 dòng `en:` + 28 dòng `isVi` + ~10 ternary nhiều dòng là mất hẳn). Hai cách đếm khác nhau, **không phải mâu thuẫn số liệu** — nhưng đừng dùng con số 1.200 để cam kết giảm LOC.
   - Nếu lead vẫn muốn Phase 2 sớm: làm **bước A** của §3.3 (`isVi = true`, 28 dòng, rủi ro ~0) ngay, và hoãn AST transform.
2. **`workshopService` (1.140 dòng).** `PLAN.md` Phase 1 ghi "**Không** xoá `SEED_*`/legacy WorkshopService ở phase này"; `DEAD-CODE.md` §8 hoãn với lý do "admin panel còn dùng". Audit này xác định lý do đó **sai** (§4.4) ⇒ đề nghị gộp vào **P1** (hoặc Phase 1b) kèm viết lại 2 method onboarding. Đây là mục ROI #2 và là **bẫy data-honesty** (seed `verifiedStatus: 'Verified'`).

**Trả lời câu hỏi chốt của `PLAN.md` §6:** Q1 → đã có commit baseline (`aaff7c4`), làm tiếp trên branch mới. Q2 → đồng ý xoá `bun.lock`/`firebase*`/`test-pricing.ts` (nhưng `test-pricing.ts` nên **viết lại** thành test thật thay vì xoá trắng — §5.4). Q3 → **đồng ý bỏ**, kèm 2 điều kiện ở §1.4. Q4 → **dead code trước, i18n sau, bundle xen kẽ sau P4** (lý do ở trên).

### 7.1 Bảng pha

| Pha | Nội dung | File trọng tâm | Phụ thuộc | Rủi ro | Δ LOC | Gate |
|---|---|---|---|---:|---:|---|
| **P0** | Chốt baseline: ~~commit/dọn working tree~~ (**đã xong** — `4d4a5d1`, `aaff7c4`); **refresh `docs/tasks/baseline.json` trên HEAD mới**; chốt 4 quyết định D-1…D-4; thêm script đếm §9 vào `scripts/` (không vào gate) | `docs/tasks/baseline.json`, `scripts/` | — | THẤP | 0 | `npm run check` xanh trên HEAD thật |
| **P1** | **Xoá code chết** (§4.1) + viết lại 2 method onboarding của `workshopService` trên `getMyWorkshopProfile` + `useUIStore.toasts` + `frontend/services/` rỗng + `test-pricing.ts` | 11 file xoá + 2 file sửa | P0 | **THẤP** | **−1.083** (ngoài workshopService) | `lint`, `build`, `check`; `grep` 0 ref; smoke `/lab` (chưa có hồ sơ ⇒ onboarding) |
| **P2** | **Hợp nhất tầng dữ liệu** (§2.7 S1–S7) | `database.ts`, `services/*`, `App.tsx`, `stores/*` | P1 + **T-1** | **CAO** | −420 | `lint`, `check`, browser 3 breakpoint ở `/`, `/admin`, `/lab`, `/checkout` |
| **P3** | **Store consolidation** (gom `src/stores/`, barrel, bỏ store gọi DB trực tiếp) | 6 store | P2 | TRUNG BÌNH | −240 | `lint`, browser admin 4 group |
| **P4** | **Giải phẫu `App.tsx`** (§1.1) | `App.tsx` + ~18 file mới | **P2, P3** + T-1 | **CAO** | −140 | route table sinh lại (`gen-routes-doc`), browser toàn bộ 30 route (spot 10) |
| **P5a** | **`meshParser` split** (§1.8) + T-4 | `utils/meshParser.ts` | P1 | **THẤP** | 0 | T-4 xanh; parse 3 fixture |
| **P5b** | **`PricingConfigPanel` split** (§1.2) + T-2 golden | ~14 file mới | P2 + **T-2** | **CAO** | −270 | T-2 xanh; browser `/admin` → tab giá (7 section) |
| **P5c** | `Group1` split + `<TabBar>` primitive (§1.6) | ~8 file | P3 | TRUNG BÌNH | −130 | browser 4 tab; `check-ui-rules` |
| **P5d** | `WorkshopSettingsView` split (§1.3) | ~9 file | P2, P3 | TRUNG BÌNH | −150 | browser `/lab/queue` + 5 tab |
| **P5e** | `ModelViewer3D` split (§1.5) | 6 file | P5a | TRUNG BÌNH | +30 | fps không giảm > 10%; stencil/context-loss FSM |
| **P5f** | `Tool3DView` split (§1.7) + `lib/meshMetrics` | 6 file | P5a, P5b | TRUNG BÌNH | −60 | parse+quote end-to-end |
| **P6** | **i18n một ngôn ngữ** (§3.4) | 32 file + `LanguageContext` | sau P5 (đỡ diff chồng) | TRUNG BÌNH | **−300** | `tsc`; `check-single-language` mới; browser chuỗi hiển thị |
| **P7** | **Test** (T-1…T-7) + gate `unit` | `tests/unit/**` | song song P1→P3 | THẤP | +600 (test) | `npm run test` xanh; coverage mappers ≥ 90% |
| **P8** | **Docs-as-code** (§6.3): `gen-schema-doc`, `_facts.generated.md`, strict 2 gate, xử lý 20 marker + 151 link | `docs/**`, `scripts/**` | P1 (số liệu đã ổn) | THẤP | 0 | `check-doc-facts` xanh; `check-doc-refs --strict` = 0 |

**Thứ tự thực thi:** P0 → P1 → P7(T-1,T-3) ‖ → P2 → P3 → P4 → P5a → P5b → P5c → P5d → P5e → P5f → P6 → P8.

### 7.2 Quyết định phải chốt trước khi bắt đầu

| # | Câu hỏi | Mặc định nếu không duyệt | Ảnh hưởng |
|---|---|---|---|
| **D-1** | UI một ngôn ngữ = **chỉ tiếng Việt**? | **Đúng** — đã thi hành ở code (`LanguageContext.tsx:7-10`), chỉ còn xoá dead branch | P6 |
| **D-2** | Cho phép **1 devDependency** test (`vitest`)? | **Không** — dùng `node:test` + `tsx` | P7 |
| **D-3** | Phí nền tảng: chốt **một** field (`pricing_configs.platformCommissionPercent` hay `pricing_global_settings.marketplace_fee_percent`)? | Giữ phép bù hiện tại (`App.tsx:1.045-1.058`) và **không** xoá | P2-S3 (nếu chốt được: −25 + hết 1 lớp lệch số) |
| **D-4** | Xoá `docs/plans/**` (39 file) hay giữ + thêm README cảnh báo? | **Giữ** (đã có lý do: 31 ref trong `src/`) + thêm `docs/plans/README.md` | P8 |

### 7.3 Gate kiểm chứng (định nghĩa chính xác)

**Mỗi pha phải qua 5 cổng, theo thứ tự:**

```bash
# 1. Kiểu (không emit, không ghi file)
npm run lint

# 2. Build thật (bắt lỗi resolve alias / lazy chunk)
npm run build

# 3. Toàn bộ gate hiện có (17 gate, so với baseline)
npm run check

# 4. Gate riêng của pha (số đo §9 — phải KHÔNG tăng)
#    P1: dead-ref = 0 · P2: localStorage-key ≤ 1 (cart) · P3: store-dir = 1
#    P4: App.tsx LOC ≤ 400 · P5x: file lớn nhất ≤ 800 · P6: isVi = 0

# 5. Browser 3 breakpoint (390/768/1440) tại route bị ảnh hưởng
npm run dev   # + Playwright MCP, không chấp nhận "chỉ lint xanh"
```

**Điều kiện dừng (rollback):** nếu `npm run lint` hoặc `npm run build` đỏ **quá 30 phút** không tìm ra nguyên nhân → revert pha đó (`git checkout -- <files>`), ghi lại vào file này, không cố sửa forward trong lúc refactor.

**Định nghĩa "xong" của từng pha:** không chỉ gate xanh, mà **số đo §9 tương ứng đã đổi đúng chiều** và được ghi lại vào bảng §7.1 (cột "Δ thực tế" — thêm khi thi công).

### 7.4 Rủi ro tổng thể & giảm thiểu

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Working tree dirty lúc đo (~98 file sửa/xoá) ⇒ diff refactor trộn với thay đổi dở | **ĐÃ GIẢM** | Không review được, không revert được | **Đã xử lý một phần**: cây được commit ở `4d4a5d1` + `aaff7c4`. Phần còn lại của P0 = refresh `baseline.json` + chốt D-1…D-4 |
| P2 (settings) làm storefront hiện số cũ/số sai | TRUNG BÌNH | Sai tiền | T-2 golden pricing chạy **trước** P2; so sánh 5 con số trên `/` và `/checkout` trước/sau |
| Tách `App.tsx` làm mất route (32 `<Route>` + 8 `<Navigate>`) | TRUNG BÌNH | 404 | `gen-routes-doc` trước/sau phải ra **cùng 30 route** (diff = 0) |
| Tách `ModelViewer3D` làm rò WebGL/context | TRUNG BÌNH | Trắng canvas | Đo `renderer.info.memory` + fps trước/sau; `CanvasErrorBoundary` phải vẫn bắt được |
| Codemod i18n làm hỏng tiếng Việt | TRUNG BÌNH | Chuỗi mojibake | AST + `git diff --word-diff` review từng file; cấm `sed`/regex |
| Xoá code "chết" mà thực ra được gọi động | **THẤP** | Runtime error | Chỉ xoá sau khi §9-A trả 0 **và** `npm run build` xanh (Vite resolve tĩnh toàn bộ) |
| Baseline gate cũ che hồi quy | **CAO** | Gate xanh giả | P0 refresh baseline |

---

## 8. Top 10 refactor ROI cao nhất

> ROI = (LOC/độ phức tạp giảm) ÷ (rủi ro × công sức). Đã sắp theo thứ tự **nên làm**.

| # | Refactor | Lợi ích đo được | LOC | Rủi ro | Pha | Phụ thuộc |
|---|---|---|---:|---|---|---|
| **1** | **Xoá code chết đã xác minh**: `catalogService`(34) + `pricingService`(46) + `seedService`(134) + `backend/index.ts`(8) + 3 shim(3) + `ToastViewport`(297) + `Section`(117) + `Toolbar`(87) + `test-pricing.ts`(357) + thư mục rỗng `frontend/services/` | 11 file biến mất; `grep` sạch; không còn "service" trả `[]` làm người đọc hiểu sai kiến trúc | **−1.083** | **THẤP** (0 ref, build xác nhận) | P1 | P0 |
| **2** | **Cắt `workshopService`**: xoá 24 method dead + 2 method cascade-dead + toàn bộ D2 legacy localStorage/`SEED_*`, **viết lại 2 method onboarding** | Bỏ 1.140 dòng; **xoá luôn nguồn "dữ liệu bịa"** khiến 3 store phải viết lại; file 2.243 → 4 file, lớn nhất ~590 | **−1.000** | **THẤP** | P1 | P0 |
| **3** | **Một nguồn sự thật cho settings** (§2.7): xoá state `App.tsx` + 4 ghi localStorage + 4 hàm `dbService` trùng; mọi đọc qua `useSettings()` | Hết lớp bug "admin lưu → storefront cũ"; mọi ghi có audit; 7 hàm ghi → 4 | **−420** | **CAO** | P2 | P1, T-1, T-2 |
| **4** | **Giải phẫu `App.tsx`** 2.152 → ~165 (5 hook + routes + shells + chrome) | File bị sửa nhiều nhất không còn là nút cổ chai merge; route table 1 nguồn; bỏ `onNavigate(any)` | **−140** | **CAO** | P4 | P2, P3 |
| **5** | **Test T-1 + T-3 + gate `unit`**: mappers (pure) + validators (sau khi tách) | Lưới an toàn cho #3/#4/#6; là điều kiện *không thể thiếu* để refactor tiếp | +~250 test | **THẤP** | P7 | P1 |
| **6** | **Tách `meshParser`** (1.878 → 5 file + re-export) rồi T-4 | Rủi ro thấp nhất repo, tạo chỗ đặt test parse; 4 định dạng độc lập | 0 (thuần move) | **THẤP** | P5a | P1 |
| **7** | **Tách `PricingConfigPanel`** 3.079 → container 200 + 7 section + 3 hook | Màn tiền tệ trở nên review được; gộp 4 máy validation + 2 cặp CRUD trùng | **−270** | **CAO** | P5b | P2, T-2 |
| **8** | **`Group1` + primitive `<TabBar>`/`FormModal>`** | 29 bản sao class tab-bar trong 6 file → 1; 3 modal 372 dòng dùng chung với 2 panel khác | **−130** (−~250 toàn repo) | TRUNG BÌNH | P5c | P3 |
| **9** | **Xoá nhánh EN + `DICTIONARY.en`** (28 dòng `isVi = true` trước, AST theo file sau) | 1.201 điểm mơ hồ → 0; −62 KB chuỗi chết; hết nguy cơ "sửa nhầm nhánh chết" | **−250…−350** | TRUNG BÌNH | P6 | sau P5 |
| **10** | **Docs-as-code**: `gen-schema-doc.mjs` + `_facts.generated.md` + 2 gate strict | 8+ chỗ sai "31 bảng" biến mất vĩnh viễn; hash route/doc tự bắt drift | 0 | **THẤP** | P8 | P1 |

**Ngoài top 10 nhưng đáng làm ngay sau:** tách `WorkshopSettingsView` (§1.3, −150) và `ModelViewer3D` (§1.5, +30) — ROI thấp hơn vì rủi ro UI cao, nhưng nên gộp vào cùng P5 để tránh 2 lần đụng file.

**Ba việc KHÔNG nên làm:**
1. **Bật `strict: true` ngay** — 139 `: any` + 63 `as any` sẽ tạo hàng trăm lỗi, che mất refactor thật. Làm sau P5, từng thư mục (`services/` trước).
2. **Codemod i18n toàn repo 1 commit** — diff 32 file không review được; đã bị as-is/05 R5 loại.
3. **Tách `App.tsx` khi chưa xong §2** — sẽ phải sửa lại 2 lần (hook settings sẽ bị viết lại).

---

## 9. Phụ lục — lệnh đo lường (tái lập)

```bash
# A. Dead code: 0 reference, đã strip comment (KHÔNG dùng grep thô — đếm cả comment)
python3 - <<'PY'
import re,pathlib
root=pathlib.Path('src')
files=[p for p in root.rglob('*') if p.suffix in ('.ts','.tsx')]
strip=lambda t: re.sub(r'//[^\n]*','',re.sub(r'/\*.*?\*/','',t,flags=re.S))
texts={p:strip(p.read_text()) for p in files}
target='src/backend/services/workshopService.ts'
src=texts[pathlib.Path(target)]
lines=src.split('\n')
starts=[(i,re.match(r'^  (static|private static) (async )?([A-Za-z0-9_]+)\(',l).group(3))
        for i,l in enumerate(lines,1)
        if re.match(r'^  (static|private static) (async )?([A-Za-z0-9_]+)\(',l)]
starts.append((len(lines)+1,'__end__'))
dead=0
for idx,(ln,name) in enumerate(starts[:-1]):
    loc=starts[idx+1][0]-ln
    refs=len(re.findall(r'\b(?:this|WorkshopService|workshopService)\.'+name+r'\b',src))
    ext=sum(len(re.findall(r'\b(?:WorkshopService|workshopService)\.'+name+r'\b|\.'+name+r'\b',t))
            for p,t in texts.items() if str(p)!=target)
    if refs==0 and ext==0:
        dead+=loc; print(f'DEAD L{ln} {loc:>4} {name}')
print('dead LOC =',dead)
PY

# B. LOC & god file
find src -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | head -12

# C. localStorage: key nào, mấy nguồn
grep -rho "localStorage\.\(getItem\|setItem\|removeItem\)('[^']*'" src | sed "s/.*('//" | sort | uniq -c | sort -rn

# D. i18n
grep -rc "isVi ?" src --include=*.tsx --include=*.ts | grep -v ':0' | sort -t: -k2 -rn | head
grep -rhoP "isVi \?[^:]*: '[^']*'" src --include=*.tsx | wc -c        # ký tự EN chết
grep -c "^\s*en:" src/frontend/context/LanguageContext.tsx              # 85
grep -rn "setLanguageState\|toggleLanguage =" src/frontend/context/LanguageContext.tsx

# E. Type-safety
grep -rno ": any\b" src | wc -l ; grep -rno "as any" src | wc -l
grep -n '"strict"' tsconfig.json

# F. Schema thật vs docs
ls supabase/migrations/ | wc -l
grep -c "^create table if not exists" supabase/migrations/20260901_baseline_schema.sql        # 31
grep -rh "^create table" supabase/migrations/*.sql | wc -l                                   # 32
grep -rh "^create \(or replace \)\?view" supabase/migrations/*.sql                           # 2
grep -rno "31 bảng\|31 Table\|31 tables" docs AGENTS.md | wc -l                              # ≥ 8 chỗ sai

# G. Docs tươi?
node scripts/check-doc-freshness.mjs --json
sha256sum src/App.tsx | cut -c1-12    # so với source-sha256 trong docs/pages/_routes.generated.md
grep -rn "docs/plans" src | wc -l

# H. Test
ls tests/unit tests/adversarial ; ls test-pricing.ts
npx tsx test-pricing.ts 2>&1 | head -3        # ERR_MODULE_NOT_FOUND (dự kiến)
python3 -c "import json;print(json.load(open('scripts/gate-manifest.json'))['gates'].__len__())"
```

---

## 10. Ghi chú cuối

- **Không có thay đổi nào vào `src/`, `supabase/`, `scripts/`, `package.json`.** File này là artifact duy nhất được tạo.
- Mọi con số trong tài liệu đều **đo lại được** bằng §9; nếu lệch sau này, **số của script thắng**.
- Các phát hiện đụng **tiền** (`PricingConfigPanel`, `effectivePricingConfig`, `computeShippingFee`) được đánh dấu **CAO** ở §7.4 và cần T-2 trước khi chạm.
- Khi bắt đầu thi công: **cập nhật bảng §7.1 bằng cột "Δ thực tế"** và ghi ngày, để tài liệu này không trôi thành một "plan cũ" thứ 40.
