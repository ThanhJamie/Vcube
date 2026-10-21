<!-- doc-meta: status=active; verified=2026-10-21; owner=lead -->
# DEAD CODE — danh sách có thể loại bỏ (VCUBE 2026-10-21)

> **Điều kiện:** mỗi mục đã đối chiếu import graph + grep toàn `src/`, `scripts/`, `tests/`.
> Không xoá DB/schema trong đợt này. Mọi mục `SAFE` phải xoá theo cụm + chạy `lint/build/check`.
> **Tổng ước tính:** ~1.500 LOC code + 357 LOC test chết + 112 KB lockfile + 3.9 MB artifact local.

---

## 1. File không còn đường import (unreachable)

| ID | File | LOC | Bằng chứng | Xoá an toàn? |
|---|---|---:|---|---|
| D01 | `src/backend/index.ts` | 8 | 0 importer; barrel export 3 service chết | ✅ cùng D02–D04 |
| D02 | `src/backend/services/catalogService.ts` | 34 | 0 importer; mọi method trả `[]` | ✅ |
| D03 | `src/backend/services/pricingService.ts` | 46 | 0 importer; chỉ dùng bởi D01 | ✅ |
| D04 | `src/backend/supabase/seedService.ts` | 134 | 0 importer; chỉ còn comment trong `mappers.ts` | ✅ |
| D05 | `src/frontend/data/mockData.ts` | 1 | shim `export *`; 0 importer | ✅ |
| D06 | `src/frontend/types/index.ts` | 1 | shim `export *`; 0 importer | ✅ |
| D07 | `src/frontend/utils/pricingEngine.ts` | 1 | shim `export *`; 0 importer | ✅ |

**Cách xoá cụm:** xoá D02–D04 → D01; xoá D05–D07 + 3 dòng re-export tương ứng trong
`src/frontend/ui/index.ts` (barrel đang kéo mock/types vào graph UI). Sau đó `rg` lại.

---

## 2. UI primitive chết

| ID | File | LOC | Bằng chứng | Xoá an toàn? |
|---|---|---:|---|---|
| D08 | `src/frontend/ui/Section.tsx` | 117 | 0 importer ngoài `ui/index.ts` | ✅ |
| D09 | `src/frontend/ui/Toolbar.tsx` | 87 | 0 importer ngoài `ui/index.ts` | ✅ |
| D10 | `src/frontend/ui/ToastViewport.tsx` | 297 | 0 importer; toast thật nằm ở `App.tsx` | ✅ |

Xoá 3 file + 3 dòng `export *` trong `src/frontend/ui/index.ts`. Giữ `ProgressBar` (1 use) và
`KeyValue` (1 use).

---

## 3. Mock constants rỗng trong `src/data/mockData.ts`

| ID | Constant | Dùng ngoài file | Xử lý |
|---|---|---|---|
| D11a | `CUSTOM_REQUESTS` | 0 | xoá |
| D11b | `MODERATION_PRODUCTS` | 0 | xoá |
| D11c | `DESIGNER_APPLICATIONS` | 0 | xoá |
| D11d | `DISPUTES_LIST` | 0 | xoá |
| D11e | `DMCA_REPORTS` | 0 | xoá |
| D11f | `MOCK_FINANCIAL_SPLITS` | 0 | xoá |
| D11g | `ACCESSORIES_CATALOG` | chỉ comment | xoá |
| D11h | `MOCK_ORDERS` | chỉ comment | xoá |
| D11i | `DEFAULT_ACCESSORIES` | chỉ comment | xoá |
| D11j | `WORKSHOP_PARTNERS` | chỉ comment | xoá |
| D11k | `MOCK_APP_USERS` | chỉ comment | xoá |
| D11l | `PRODUCTS`, `INITIAL_CART_ITEMS`, `DIGITAL_ASSETS`, `MATERIALS_CATALOG`, `PRINTER_PROFILES` | `App.tsx`/`HomeView`/`pricingEngine` khởi tạo state/fallback bằng mảng rỗng | thay `[]` tại call-site rồi xoá constant |
| D11m | `PAYOUT_TRANSACTIONS` | `DesignerPayoutsTab` | thay `[]`/empty state rồi xoá |
| — | `DEFAULT_SITE_CONTENT`, `CATEGORIES`, `POPULAR_TAGS`, `INKIRI_REFERENCE_VALUES`, `DEFAULT_INKIRI_FORMULA_CONFIG` | **còn dùng thật** | giữ |

Ước tính xoá **~120–160 LOC** comment + constant rỗng.

---

## 4. Type/interface chết trong `src/types/index.ts`

| ID | Type | Ref ngoài file | Ghi chú |
|---|---|---|---|
| D12a | `QuoteTierType` | 0 | quote flow chưa dùng |
| D12b | `QuoteSnapshot` | 0 | |
| D12c | `ProductLicensingConfig` | 0 | |
| D12d | `DispatchAssignment` | 0 | dispatcher chưa có write path |
| D12e | `QualityControlRecord` | 0 | |
| D12f | `AdminTab` (= alias `AdminNavSection`) | 0 | |
| D12g | `InkiriCalculationInput` | 0 | |
| D12h | `InkiriCalculationResult` | 0 | |

Ước tính **~100–150 LOC**. Giữ các type còn được dùng bởi mappers/stores/views; kiểm tra
`grep` trước khi xoá.

---

## 5. `dbService` method 0 caller

| ID | Method | Dòng | LOC ước | Ghi chú |
|---|---|---|---:|---|
| D13a | `seedInitialProductsIfEmpty` | 292–307 | 16 | data-honesty đã bỏ seed |
| D13b | `uploadProductImage` | 308–346 | 39 | 0 UI upload ảnh |
| D13c | `uploadCadFile` | 347–374 | 28 | 0 caller; đã đổi chữ ký ownerId |
| D13d | `saveUser` | 574–597 | 24 | admin KYC dùng method khác |
| D13e | `savePricingConfig` | 723–753 | 31 | settingsService thay thế |
| D13f | `recordPaymentTransaction` | 864–894 | 31 | payment chưa nối |

Tổng **~168 LOC** + import/type đi kèm. Xoá sau khi grep 0 call-site (đã kiểm tra).

---

## 6. Export/utility chết hoặc chỉ nên private

| ID | Symbol | File | Ghi chú |
|---|---|---|---|
| D14 | `createBrowserClient` alias + `export { createBrowserClient as createClient }` | `backend/supabase/client.ts` | 0 external; giữ default `supabase` |
| D15 | `iconMap` keys không có literal reference | `frontend/ui/iconMap.ts` | 18 key: `arrow_upward, call_split, celebration, event, hexagon, home_repair_service, hourglass_top, location_on, navigate_next, pending_actions, price_check, production_quantity_limits, rocket_launch, route, science, security, shield_person, warehouse` — verify dynamic data trước khi xoá |
| D16 | `Section`, `Toolbar`, `ToastViewport` barrel exports | `frontend/ui/index.ts` | xoá cùng D08–D10 |
| D17 | `DICTIONARY` toàn bộ `en:` entries | `frontend/context/LanguageContext.tsx` | 85 entries; xoá cùng i18n codemod |
| D18 | settingsService export-only functions (`isValidMarketplaceFeePercent`, `isValidVatPercent`, `isValidShippingFee`, `validatePatch`, `snapshotOf`, `clearSettingsCache`, `rowToPricingGlobalSettings`, `writeSettingAudit`, `getSettingAudit`, `saveSettingsPatch`, `lastLoadedAt`, `SETTINGS_STORAGE*`…) | `backend/services/settingsService.ts` | có thể chỉ dùng nội bộ; **unexport**/giữ, không xoá mù |

---

## 7. Test / config / artifact chết

| ID | Mục | Kích thước | Bằng chứng | Hành động |
|---|---|---:|---|---|
| D19 | `test-pricing.ts` | 357 LOC | import `./src/backend/services/pricingEngineService` và `quoteVerifier` **không tồn tại**; 0 script gọi | xoá hoặc viết lại thành test thật |
| D20 | `tests/unit`, `tests/adversarial` | 0 file | thư mục rỗng | xoá hoặc thêm test |
| D21 | `firebase-applet-config.json` | 560 B | 0 import; Firebase không còn trong `package.json` | xoá |
| D22 | `firestore.rules` | 1.4 KB | 0 import | xoá |
| D23 | `metadata.json` | 239 B | AI Studio scaffold, 0 import | xoá |
| D24 | `assets/.aistudio/.gitignore` | 0 file thực | 0 ref | xoá |
| D25 | `.playwright-mcp/` | **3.9 MB** | gitignored, ảnh/log cũ | dọn local (không commit) |
| D26 | `bun.lock` | 112 KB | repo dùng npm/package-lock; README nói “theo lockfile” | chọn npm, xoá `bun.lock` hoặc document |
| D27 | `dotenv` | dependency | 0 source/script import | bỏ khỏi `dependencies` |
| D28 | `autoprefixer` | devDependency | không có `postcss.config`; Tailwind 4 Vite plugin | bỏ khỏi `devDependencies` |
| D29 | `docs/plans/**` | 39 file | SUPERSEDED | chuyển archive/không dùng làm nguồn |
| D30 | `docs/tasks/ui-redesign/**` | v2 | đã bị v3 thay | archive |

---

## 8. Không xoá ngay (data/feature risk)

| Mục | Vì sao |
|---|---|
| `src/backend/services/workshopService.ts` `SEED_*` + legacy `getWorkshop*`/`saveWorkshop*` | vẫn được admin panel dùng; seed là fixture thật (data-honesty risk) — chỉ xoá **sau** khi admin chuyển sang `getMy*`/DB-only. Ước tính ~390 LOC seed + ~1.000 LOC legacy method |
| `src/data/mockData.ts` `DEFAULT_SITE_CONTENT`, `CATEGORIES`, `POPULAR_TAGS`, `INKIRI_REFERENCE_VALUES`, `DEFAULT_INKIRI_FORMULA_CONFIG` | còn dùng thật (fallback/cấu hình) |
| `src/backend/supabase/seedService.ts` (D04) | xoá file nhưng giữ comment/history docs |
| DB tables/columns không có client | feature gap, **không drop** — xem `AUDIT.md` §6 |
| `.opencode/skills/**` | tooling, không thuộc app; giữ nếu còn dùng |

---

## 9. Thứ tự xoá an toàn

1. **Cụm A** D01–D07 (backend service chết + shim) → sửa `ui/index.ts` → lint/build.
2. **Cụm B** D08–D10 (primitive chết) + D15/D16 (icon/barrel) → lint/build.
3. **Cụm C** D11/D12 (mock/type) → thay call-site → typecheck.
4. **Cụm D** D13 (dbService) → grep 0 caller → lint/build.
5. **Cụm E** D19–D29 (test/config/lock/docs) → repo sạch, không ảnh hưởng runtime.
6. **Cụm F** D17–D18 (i18n/settings public surface) sau khi codemod một ngôn ngữ.

**Gate mỗi cụm:** `npm run lint` PASS · `npm run build` PASS · 10 gate offline PASS · `git diff`
không có thay đổi ngoài danh sách.
