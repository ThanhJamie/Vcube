<!-- doc-meta: status=active; verified=2026-10-21; owner=ops-consoles -->
# HANDOFF — Phase 6c: cleanup (D05–D07 shims, dead i18n keys, EN copy, icon dư)

> **Work item:** `task-39` · **Agent:** `ops-consoles` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `8a3d4aa` (Phase 1–4 pushed) + unstaged Phase-6c changes.
> **Không commit/push.** Không thêm dependency; không đổi hành vi; không sửa file ngoài danh sách ở §6.
> **Script/verify:** `/tmp/p6c/shim-imports.mjs`, `/tmp/p6c/dead-keys.mjs`, `/tmp/p6c/del-keys.mjs` (ngoài repo, không commit).

## ✅ VERDICT: **DONE** — 3 shim xoá (53 import dòng → alias), 57 key chết xoá, 2 copy EN sửa, 1 icon prune, gates xanh.

| # | Hạng mục | Trước | Sau | Bằng chứng |
|---|---|---|---:|---|
| 1 | D05–D07 shims | 3 file `export *` | **3 file xoá** | `grep` shim path = **0**; resolver = 0 importer; `tsc`/build PASS |
| 1b | Import rewrite | 53 dòng ở **46 file** | alias `@/…` | 55 file dùng alias (63 dòng: 55 `@/types`, 6 `@/data/mockData`, 2 `@/utils/pricingEngine`) |
| 2 | Dictionary keys | 85 key | **28 key** (18 used + 10 empty intentional) | scanner: dead = 10, **dead non-empty = 0** |
| 3 | EN copy | 2 chuỗi hiển thị | VI | grep chuỗi mới + `HomeView:1377`, `LanguageContext:64` |
| 3b | `nameEn` taxonomy | có field trong `CATEGORIES`/`POPULAR_TAGS` | **dead field — chỉ báo cáo** | 0 chỗ render `.nameEn` của taxonomy (chỉ accessory model) |
| 4 | Icon dư | 206 glyph | **205 glyph** | `cloud_sync` 0 refs; `check-icon-names` PASS 205 |
| 5 | Stale comments/paths | — | không có gì để sửa | grep `src/stores\|vcube_products\|…\|isVi` = **0** |

---

## 1. D05–D07 — xoá 3 shim `export *`

**Trước:** `src/frontend/data/mockData.ts`, `src/frontend/types/index.ts`, `src/frontend/utils/pricingEngine.ts`
là shim 1 dòng (`export * from '../../xxx'`) — nguồn: `DEAD-CODE.md` §1.

**Sau:** xoá cả 3; 53 dòng import ở **46 file** đổi sang canonical alias (`@` = `src/`):

| Canonical | File nguồn thật | Import dòng |
|---|---|---:|
| `@/types` | `src/types/index.ts` | **55** (53 rewrite + 2 sẵn có) |
| `@/data/mockData` | `src/data/mockData.ts` | **6** |
| `@/utils/pricingEngine` | `src/utils/pricingEngine.ts` | **2** |

**Cách làm (an toàn, không đoán theo chuỗi):** script resolve **đường dẫn tương đối thực tế** của từng
import (`path.resolve` + thử `.ts/.tsx/index`) rồi so với 3 shim ⇒ **chỉ** rewrite khi trỏ đúng shim.
Vì vậy các import như `src/frontend/hooks/*` dùng `'../../types'` (trỏ `src/types` thật) **không bị sửa**.

**Lưu ý số liệu (audit cũ ≠ hiện tại):** brief ghi "~16 importer"; thực tế **46 file / 53 dòng** vì
Phase 4 (tách god-file) sinh thêm 30 file import shim `types`. Đã rewrite **toàn bộ** để đủ điều kiện
xoá shim — đây là hệ quả bắt buộc của item 1, danh sách file nằm ngoài write-scope liệt kê ban đầu
(đã báo Lead trong report).

**Bằng chứng:**
- `grep -rn "frontend/data/mockData\|frontend/types\|frontend/utils/pricingEngine" src/` → **0**
- resolver script sau rewrite (trước khi xoá) → **0 importer**; sau xoá 3 file: `git status` = `D` ×3.
- `npm run lint` (tsc `--noEmit`) **PASS**; build **PASS** ⇒ alias `@/…` resolve đúng.

Lỗi giữa chừng (đã xử lý): lần chạy codemod đầu tiên ghi đè body do **trùng key object `text`**; đã
`git checkout -- src/` khôi phục 49 file rồi sửa script (`replacement`), chạy lại sạch (lần 2 không
còn file lỗi; `tsc` PASS — không có diff rác còn lại).

---

## 2. Dictionary — xoá 57 key chết (giữ 10 key `''` intentional)

Scanner AST + literal `t('key')`/`t("key")` + `DICTIONARY.member`/`DICTIONARY['member']` trên `src/**`,
`tests/**`, `scripts/**`. Không có call `t(identifier)` động ngoài `t(key)` nội bộ `LanguageContext`.

| Số liệu | Trước | Sau |
|---|---:|---:|
| Key trong `DICTIONARY` | **85** | **28** |
| Key đang được tham chiếu | 18 | 18 (giữ) |
| Key chết **có chuỗi non-empty** | **57** | **0** (đã xoá) |
| Key chết **có `vi: ''`** (intentional Group A/C) | 10 | **10** (giữ theo yêu cầu) |

- 57 key xoá: toàn bộ nhóm hero/section/calc/filter/sort/role/footer… không còn call-site
  (danh sách đầy đủ ở `/tmp/p6c/dead-keys.json`).
- 18 key giữ: `navExplore, navLab3D, navOrders, navAdmin, searchPlaceholder, navDesignerStudio,
  myOrdersTracking, switchAccount, signOut, liveSupportAria, cartTitle, footerServices,
  footerInstantQuote, footerMarketplace, footerCreators, footerLocationTitle, footerRights,
  footerCadSecurity` (dùng ở `Header.tsx` / `shell/AppOverlays.tsx`).
- 10 key `''` giữ vì là marker chính sách **Nhóm A/C** intentional: `industrialTolerance`,
  `campaign29Badge/Headline/Desc`, `explore29TagBtn`, `statToleranceVal`, `statLeadTimeVal`,
  `statStandardVal`, `liveSupportEngineer`, `footerIsoCert`.
- **Không đổi chuỗi VI** của key giữ; scanner sau khi xoá: `keys=28, referenced=18, dead non-empty=0`.

---

## 3. Copy EN còn hiển thị (P3)

| Vị trí | Trước | Sau |
|---|---|---|
| `views/HomeView.tsx:1377` (CTA modal ý tưởng) | `'Tư Vấn & Custom Theo Ý Tưởng'` | **`'Tư Vấn & Tuỳ Biến Theo Ý Tưởng'`** |
| `context/LanguageContext.tsx:64` `searchPlaceholder` | `'Tìm linh kiện, tag (vd: IoT, Gear, Snap-Fit)...'` | **`'Tìm linh kiện, thẻ (vd: IoT, bánh răng, Snap-Fit)…'`** |

- **`nameEn` taxonomy = dead field (chỉ báo, không xoá type):** `CATEGORIES`/`POPULAR_TAGS` (trong
  `src/data/mockData.ts`) render ở `HomeView:793/821`, `ExploreView`, `AdminProductsPanel` — nơi render
  chỉ dùng `id/name/nameVi/icon`, **không chỗ nào đọc `.nameEn` của taxonomy**. `nameEn` còn được dùng
  cho **accessory model** (`AccessoriesManager:57/85/140`, `mappers.ts:293`, `types:332`) nên **không
  xoá type**; ghi follow-up `nameEn/badgeEn/ctaLabelEn type cleanup` (out of scope).
- **Allowlist docs:** thêm dòng `IoT`, `Snap-Fit`, `Parametric` → **giữ** (thuật ngữ kỹ thuật) trong
  `docs/tasks/ui-redesign-v3/COPY-GLOSSARY.md` §2. KHÔNG đổi chuỗi VI của key khác.

---

## 4. Icon dư — prune `cloud_sync` (206 → 205)

- Grep **literal** `cloud_sync` + **dynamic** `icon:`/`iconName:` + `<Icon name=…>` trong `src/`, `scripts/`,
  `tests/`: **0 reference** (chỉ còn definition/comment/doc).
- Xoá: component ghép `CloudSync` + entry `cloud_sync: CloudSync` + comment + sửa header "5 glyph ghép" → 4
  trong `src/frontend/ui/iconMap.ts`.
- `node scripts/check-icon-names.mjs` → **PASS — 204 file, mọi glyph có trong iconMap (205 glyph)**;
  `grep cloud_sync|CloudSync src/ scripts/ tests/` = **0**.
- Docs: `docs/design/icon-map.md` cập nhật **206 → 205 glyph**, thêm note **PRUNE Phase 6**, ghi rõ 2 dòng
  `cloud_sync` trong bảng mapping/“Icons needing a decision” chỉ còn giá trị lịch sử (cùng quy ước Phase 1).

---

## 5. Stale comments/paths — **không có gì để sửa**

`grep -rn "src/stores|vcube_products|vcube_materials|vcube_printers|vcube_site_content|isVi" src/ --include=*.ts --include=*.tsx`
→ **0** (đã được dọn ở Phase 1–4). Item no-op, không có thay đổi.

---

## 6. Gates & đo

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (0 lỗi) |
| Build | `npx vite build --outDir dist-ssr/p6c --emptyOutDir` | **PASS** (`✓ built in 5.31s`) — không ghi `dist/` |
| UI rules | `node scripts/check-ui-rules.mjs` | **rc=0** |
| Fabricated | `node scripts/check-fabricated.mjs` | **rc=0** |
| Contrast token | `node scripts/check-contrast.mjs` | **56/70 + 14 expected, 0 unexpected fail** |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **rc=0** |
| Icon names | `node scripts/check-icon-names.mjs` | **PASS — 205 glyph** |
| Error handling | `node scripts/check-error-handling.mjs` | **rc=0** |
| `git diff --check` | — | PASS |

### Bundle (Node `zlib.gzipSync(level 9)`, initial critical = index + preload + css)

Baseline **tái tạo đúng số Phase-4 official** (692.525 raw / 186.957 gzip z9; initial critical **278.448**)
bằng worktree sạch tại HEAD `8a3d4aa`:

| Resource | BEFORE raw | BEFORE gzip z9 | AFTER raw | AFTER gzip z9 | Δ gzip |
|---|---:|---:|---:|---:|---:|
| `index-*.js` | 692.525 | **186.957** | 689.178 | **185.575** | **−1.382 (−0,74%)** |
| `react-vendor-*.js` | 51.499 | 18.190 | 51.499 | 18.190 | 0 |
| `supabase-vendor-*.js` | 221.007 | 57.646 | 221.007 | 57.646 | 0 |
| `index-*.css` | 89.454 | 15.655 | 89.454 | 15.655 | 0 |
| **INITIAL CRITICAL** | **1.054.485** | **278.448** | **1.051.138** | **277.066** | **−1.382 (−0,50%)** |

Index raw: **−3.347 B (−0,48%)**; gzip −1.382 B. Delta chủ yếu từ 3 shim + 57 key chết bị xoá khỏi entry chunk.

---

## 7. Scope / file đã sửa

| Nhóm | Số file |
|---|---:|
| Shim xoá (`git status: D`) | **3** |
| Importer rewrite (`M`) | **46** (53 dòng import) |
| `LanguageContext.tsx` (57 key + searchPlaceholder) | 1 |
| `views/HomeView.tsx` (CTA) | 1 |
| `ui/iconMap.ts` (prune 1 glyph) | 1 |
| Docs (`docs/design/icon-map.md`, `COPY-GLOSSARY.md`) | 2 |
| Handoff này | 1 |

**Tổng src:** 51 file thay đổi (48 M + 3 D) + 2 docs. `git diff --stat` (nhóm này): **53 files, +124 / −244**.
`tests/` (untracked) và các file docs khác đang sửa là của agent Phase-6 khác, **không phải task-39**.
Không đụng `dbService`, `App.tsx`, `package.json`, `vite.config.ts`, `src/index.css`.

---

## 8. Rủi ro & follow-up

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| 46 importer file ngoài write-scope liệt kê | — | **bắt buộc** để xoá shim; resolve theo path thật, `tsc`+build chứng minh; đã báo Lead |
| Xoá 57 key dictionary ảnh hưởng consumer ngoài `src/` | Thấp | scanner quét cả `src/tests/scripts`; 18 key còn dùng vẫn đủ; build PASS |
| Key `''` chết được giữ (10) | Thấp | đúng yêu cầu "giữ `''` intentional"; nếu Lead muốn dọn nốt thì xoá 10 dòng + note Group A/C |
| `nameEn` taxonomy dead field | Thấp | chỉ báo cáo, không xoá type (lan sang accessory model); follow-up riêng |
| `cloud_sync` prune | Rất thấp | 0 refs; `check-icon-names` PASS 205; docs cập nhật theo |
| Docs overlap với task-37 (`storefront`) | Thấp | tôi chỉ sửa `docs/design/icon-map.md` + `COPY-GLOSSARY.md`; task-37 sửa AGENTS/README/schema/RLS/routes — không trùng file |

**Follow-up ngoài scope (giữ nguyên):** 19 call `dbService.*` inline trong hooks → service layer;
review dead-store `useProductionStore`/`useCustomerAdminStore`; `nameEn/badgeEn/ctaLabelEn` type cleanup;
dedupe `computeShippingFee`; duplicated `payload?: any`.

---

## 9. Tái lập

```bash
node /tmp/p6c/shim-imports.mjs            # dry-run: liệt kê importer shim theo path thật
node /tmp/p6c/shim-imports.mjs --write    # rewrite 53 dòng -> @/…
rm src/frontend/data/mockData.ts src/frontend/types/index.ts src/frontend/utils/pricingEngine.ts
node /tmp/p6c/dead-keys.mjs               # in dead keys (JSON -> /tmp/p6c/dead-keys.json)
node /tmp/p6c/del-keys.mjs                # xoá 57 key non-empty chết
npm run lint
npx vite build --outDir dist-ssr/p6c --emptyOutDir
# baseline (tuỳ chọn): git worktree add --detach /tmp/p6c/basewt HEAD && … vite build --outDir dist-ssr/base
```
