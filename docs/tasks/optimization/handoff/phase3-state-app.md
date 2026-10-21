<!-- doc-meta: status=active; verified=2026-10-21; owner=commerce-auth -->
# HANDOFF — Phase 3a: App.tsx bỏ localStorage cache DB-backed + mock rỗng D11l

> **Trạng thái: DONE.** Chỉ sửa **`src/App.tsx`** (+ file handoff này). Không commit/push.
> `npm run lint` PASS · `npx vite build --outDir dist-ssr/p3a` PASS · **grep cache/mock = 0**.
> Giảm **−63 dòng** (80 xoá / 17 thêm, phần thêm là comment mô tả cơ chế mới).
> Bundle index (đo isolated HEAD vs HEAD+patch): **−1,67 kB raw · −0,32 kB gzip**; CSS không đổi.

---

## 1. Đọc cache localStorage đã bỏ (4 chỗ)

| Key | Vị trí cũ | Trước | Sau |
|---|---|---|---|
| `vcube_products` | `MainApp` – `useState<Product[]>` lazy init | `JSON.parse(localStorage)` → fallback `PRODUCTS` (`[]`) | `useState<Product[]>([])` — DB (`loadProducts` → `dbService.getProducts`) là nguồn duy nhất; `productsLoading`/`productsError` giữ nguyên |
| `vcube_site_content` | `useState<SiteContentConfig>` lazy init | `{...DEFAULT_SITE_CONTENT, ...JSON.parse(cache)}` → fallback `DEFAULT_SITE_CONTENT` | `useState<SiteContentConfig>(DEFAULT_SITE_CONTENT)` — `DEFAULT_SITE_CONTENT` **giữ** (config thật, không phải mock); DB (`getSiteContent`) ghi đè khi có |
| `vcube_materials` | `useState<MaterialProfile[]>` lazy init | `JSON.parse(cache)` → fallback `MATERIALS_CATALOG` (`[]`) | `useState<MaterialProfile[]>([])` — DB (`getMaterials`) ghi đè khi mảng remote khác rỗng (logic effect giữ nguyên) |
| `vcube_printers` | `useState<PrinterProfile[]>` lazy init | `JSON.parse(cache)` → fallback `PRINTER_PROFILES` (`[]`) | `useState<PrinterProfile[]>([])` — DB (`getPrinters`) ghi đè khi mảng remote khác rỗng |

**Hành vi với người dùng mới (cache miss) KHÔNG đổi:** 4 mock constant D11l đều là `[]` nên nhánh
cache-miss cũ trả đúng `[]`/`DEFAULT_SITE_CONTENT` như code mới. Chỉ người có cache cũ (stale) mất
dữ liệu cache — đúng mục tiêu "DB là nguồn sự thật duy nhất" (PLAN Phase 3).

---

## 2. Ghi cache localStorage đã bỏ (8 chỗ + 1 dead write + 1 removeItem)

| Handler / vị trí | Dòng cũ | Đã xoá | Flow giữ nguyên |
|---|---|---|---|
| `loadProducts` – nhánh DB trả rỗng | `localStorage.removeItem('vcube_products')` (+ comment D7) | cả khối `if (remote.length === 0) { … }` | `setProducts(remote)`; `productsError`/revision guard/refetch giữ nguyên |
| `handleUpdatePricingConfig` | `localStorage.setItem('vcube_pricing_config', …)` | **dead write** (0 reader) — xoá cả try/catch | `setPricingConfig` + `savePricingConfigAudited` (service validate/audit/cache realtime) giữ nguyên |
| `handleUpdateMaterials` | `localStorage.setItem('vcube_materials', …)` | try/catch | optimistic `setMaterials` + `saveMaterial`/`deleteMaterial` giữ nguyên |
| `handleUpdatePrinters` | `localStorage.setItem('vcube_printers', …)` | try/catch | optimistic `setPrinters` + `savePrinter`/`deletePrinter` giữ nguyên |
| `handleAddNewProduct` | `setItem('vcube_products')` trong optimistic update **và** trong rollback | 2 dòng | optimistic update + rollback + toast giữ nguyên |
| `handleUpdateProduct` | như trên | 2 dòng | như trên |
| `handleDeleteProduct` | như trên | 2 dòng | như trên |
| `handleUpdateSiteContent` | `localStorage.setItem('vcube_site_content', …)` | try/catch | `setSiteContent` + `dbService.saveSiteContent` (trả kết quả thật) giữ nguyên |

Tổng: **8 lệnh ghi + 1 lệnh xoá + 1 dead write** đã bỏ; không đổi thứ tự optimistic-update →
DB-call → rollback/toast.

---

## 3. D11l — 5 mock constant rỗng: call-site thay bằng literal

| Constant | Call-site cũ trong App | Thay bằng | Còn importer khác? |
|---|---|---|---|
| `PRODUCTS` | `useState` fallback | `[]` | **CÓ** — `scripts/test-catalog-sync.ts:7` ⇒ không xoá được constant |
| `INITIAL_CART_ITEMS` | chỉ import (không dùng trong body) | (bỏ import) | **KHÔNG** ⇒ App là importer duy nhất, Lead có thể xoá constant |
| `DIGITAL_ASSETS` | `useState<DigitalAsset[]>(DIGITAL_ASSETS)` | `[]` | **KHÔNG** ⇒ App là importer duy nhất |
| `MATERIALS_CATALOG` | 2 fallback (`materials`) | `[]` | **CÓ** — `pricingEngine.ts`, `QuoteSummaryPanel`, `CadQuickViewModal`, `HomeView`, `ProductDetailView`, `Tool3DView` |
| `PRINTER_PROFILES` | fallback (`printers`) | `[]` | **CÓ** — `pricingEngine.ts`, `QuoteSummaryPanel`, `Tool3DView` |

Import trong App còn đúng 1 dòng: `import { DEFAULT_SITE_CONTENT } from './data/mockData';`
(`DEFAULT_SITE_CONTENT` là config thật — giữ theo D11 note; `CATEGORIES`/`POPULAR_TAGS` App không dùng).

**Follow-up cho Lead:** `src/data/mockData.ts` vẫn phải giữ `PRODUCTS`, `MATERIALS_CATALOG`,
`PRINTER_PROFILES` (còn importer ngoài App). `INITIAL_CART_ITEMS` + `DIGITAL_ASSETS` **đã 0
importer** toàn repo sau task này → có thể xoá ở phase dọn mockData.

---

## 4. Comment/docblock đã sửa (không còn comment nói dối)

- Header state `MainApp`: `"Core App State with LocalStorage persistence…"` → mô tả mới "DB là nguồn
  duy nhất, khởi tạo rỗng rồi nạp từ Supabase, không còn cache localStorage".
- Docblock `pricingConfig`: bổ sung "(cache đã bỏ ở Phase 3 — DB là nguồn duy nhất)" cho câu lịch sử
  về `DEFAULT_INKIRI_FORMULA_CONFIG`/localStorage.
- `loadProducts`: comment nhánh rỗng đổi thành "DB rỗng + không lỗi ⇒ `[]` là dữ liệu THẬT; không còn
  cache localStorage để xoá/ghi đè"; comment catch `"giữ cache hiện có"` → `"giữ state đã nạp (DB vẫn
  là nguồn duy nhất)"`.
- Comment fetch catalog: `"…rồi xoá cache oan"` → `"…rồi set state rỗng oan"`.
- Header Product Handlers: `"Synced to Supabase DB & LocalStorage Catalog DB with Rollback"` →
  `"DB (Supabase) là nguồn duy nhất, optimistic update + rollback khi lỗi"`.
- Ghi chú ngoài phạm vi: `src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx:111-112`
  vẫn còn comment tham chiếu `App.tsx:642-650` + `vcube_printers` (đã lỗi thời) — **không sửa** vì
  ngoài write scope; đề nghị phase sau dọn.

---

## 5. Bằng chứng grep (task gate)

```bash
# 1) Key cache DB-backed còn trong App.tsx?  → 0
grep -n "vcube_products\|vcube_materials\|vcube_printers\|vcube_site_content\|vcube_pricing_config" src/App.tsx
# rc=1

# 2) Mock D11l còn trong App.tsx?  → 0
grep -n "PRODUCTS\|INITIAL_CART_ITEMS\|DIGITAL_ASSETS\|MATERIALS_CATALOG\|PRINTER_PROFILES" src/App.tsx
# rc=1

# 3) Không còn lệnh localStorage nào trong code App.tsx (chỉ 3 comment mô tả việc đã bỏ)
grep -n "localStorage\." src/App.tsx
# rc=1
```

Key ngoài phạm vi (`vcube_guest_role`, `vcube_active_local_user`, cart/UI state) không nằm trong
App.tsx và **không bị đụng**.

---

## 6. Gates & số đo bundle

| Gate | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS** — 0 lỗi (chạy trên working tree có thay đổi của agent song song) |
| `npx vite build --outDir dist-ssr/p3a --emptyOutDir` | **PASS** — `✓ built in 4.74s`; `dist-ssr/` đã gitignored, **không ghi `dist/`** |
| grep §5 | 3/3 → **0** |
| `git diff --stat src/App.tsx` | 1 file, **+17 / −80** (−63 dòng net) |

**Bundle index — đo isolated** (tạo temp tree từ `git archive 387e86c`, build HEAD rồi copy
`App.tsx` mới vào build lại; cùng máy/cùng vite, CSS giống hệt nên delta quy được cho patch):

| Chỉ số | HEAD (baseline) | HEAD + patch | Delta |
|---|---:|---:|---:|
| `index-*.js` raw | 690.944 B (690,94 kB) | 689.272 B (689,27 kB) | **−1.672 B (−1,67 kB)** |
| `index-*.js` gzip (vite metric) | 185,03 kB | 184,75 kB | **−0,28 kB** |
| `index-*.js` gzip (`gzip -9`) | 183.496 B | 183.174 B | **−322 B** |
| CSS `index-*.css` | 89.454 B / 15.600 B gz | **giống hệt** | 0 |
| **Initial critical gzip** (index + react-vendor + supabase-vendor + css, `gzip -9`) | 274.737 B | 274.415 B | **−322 B (−0,31 kB)** |

> So với baseline "Phase 2 official" trong task (index 691,048 raw / 184,439 gzip; initial critical
> 275,930 gzip): build trong working tree hiện tại ra 689,38 kB / 184,83 kB (index-`CFz5V9cR.js`).
> Chênh lệch với số official **không quy hết cho task-28** vì cây đang có thay đổi chưa commit của
> agent song song (stores move, admin panels, iconMap…). Số isolated ở bảng trên mới là delta thật
> của patch này.

---

## 7. Rủi ro / lưu ý

1. **Mất cache offline (chủ ý).** Trước đây reload khi offline vẫn thấy catalog/site content/
   materials/printers cũ; nay các state khởi tạo rỗng/`DEFAULT_SITE_CONTENT` và chỉ có DB lấp.
   Supabase đang **paused** ⇒ mọi màn hình dữ liệu sẽ ở **empty/fallback state** (đúng hành vi hiện
   tại của người dùng cache-miss, nhưng giờ áp dụng cho cả người từng có cache). Không đổi contract
   dữ liệu, không đổi route/IA.
2. **First load phụ thuộc DB.** `products` có `productsLoading=true` + `productsError` (Home/Explore
   đã có skeleton/error state) nên không nháy "0 bản vẽ". Materials/printers/siteContent: effect chỉ
   ghi đè khi remote khác rỗng (giữ nguyên logic) ⇒ nếu DB rỗng, UI dùng `[]`/default như trước.
3. **Không có migration/cleanup localStorage** cho máy người dùng cũ: key `vcube_products`… vẫn còn
   trong browser nhưng **không còn ai đọc** (dead storage). Có thể thêm 1 lần `removeItem` dọn dẹp ở
   phase sau — không làm bây giờ để tránh thêm code chết.
4. **Stale comment ngoài scope:** `Group1WorkshopsPanel.tsx:111-112` nhắc `App.tsx:642-650` +
   `vcube_printers` (đã bỏ) — chỉ là comment, cần dọn ở phase docs/cleanup.
5. `src/data/mockData.ts` **không bị sửa** (đúng scope). Sau task: `INITIAL_CART_ITEMS` +
   `DIGITAL_ASSETS` = 0 importer toàn repo; 3 constant còn lại vẫn cần vì importer khác.
6. Không thêm dependency; không đổi `main.tsx`, stores, backend, `index.css`, routes.
