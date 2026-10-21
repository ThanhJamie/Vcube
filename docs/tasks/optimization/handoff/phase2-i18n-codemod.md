<!-- doc-meta: status=active; verified=2026-10-21; owner=ops-consoles -->
# HANDOFF — Phase 2a: codemod xoá nhánh `isVi` chết (32 file)

> **Work item:** `task-24` · **Agent:** `ops-consoles` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `1daf364` (Phase 1 + Phase 5 đã push)
> + **unstaged Phase-2a changes** (34 file). **Không commit/push.**
> **Không sửa:** `src/frontend/context/LanguageContext.tsx` (task-25), `docs/**` (trừ file này),
> `package.json`, `vite.config.ts`, `src/index.css`; không thêm dependency.
> **Script codemod:** `/tmp/codemod-isvi.mjs` (pass 1) + `/tmp/p2a/unwrap-jsx.mjs` (pass 2, yêu cầu bổ sung
> của Lead sau review) — đều ngoài repo, **không commit**; cách tái tạo ở §2/§2b.

## ✅ VERDICT: **DONE — behavior-preserving, gates xanh**

1. **1.428** `ConditionalExpression` có condition `isVi` đã bị xoá (thay bằng **nguyên văn** nhánh VI);
   **32 file** target + **2 file call-site** của `vat.ts` (bắt buộc để đổi chữ ký) = **34 file**.
2. **`grep -rn "isVi" src/` → 0 ngoài `LanguageContext.tsx`** (còn đúng **1 comment** trong file task-25).
3. **28** khai báo `const isVi = language === 'vi';` đã xoá; **28** binding `language` khỏi
   `const { language } = useLanguage()`; **27** import `useLanguage` đã bỏ (App.tsx giữ vì `MainApp` còn `t`).
4. **37** chỗ `isVi` dùng như **giá trị** (dep array / call arg / param / prop) được xử lý tay — **0 ca bỏ dở**.
5. `npm run lint` **PASS** · `npm run build` **PASS** (Vite 6.4.3, `dist-ssr/p2a`, hash cuối `index-DJyez11c.js`).
6. **Pass 2 (Lead review bổ sung):** unwrap **800** JSX literal `{'…'}`/`attr={'…'}` (496 child + 304 attribute)
   → `git diff -U0 | grep -c "^+.*{'"` **853 → 78**; `grep -c "^+.*={'"` **301 → 16**; **84** ca giữ nguyên có
   lý do (65 chứa `&`, 19 có khoảng trắng đầu/cuối). Render-equivalence đã verify độc lập: **34 file, 0 diff**.
7. Bundle entry: **714.080 → 695.054 B raw (−19.026, −2,66%)**; **194.316 → 186.225 B gzip z9 (−8.091, −4,16%)**.
   Initial critical: **285.807 → 277.716 B gzip (−8.091, −2,83%)**.
8. Số **1.201** trong brief là số dòng `grep "isVi ?"` (chỉ bắt ternary **một dòng**); số **thật**
   là **1.428** conditional (xem §3.1 giải thích chênh lệch).

---

## 1. Phạm vi & số liệu tổng

| Chỉ số | Giá trị |
|---|---:|
| File có `isVi` (trừ LanguageContext) | **32** |
| File diff thực tế | **34** (32 target + `InvoiceModal.tsx` + `QuoteSummaryPanel.tsx` — call-site của `vat.ts`) |
| Ternary `isVi` đã xoá (AST `ConditionalExpression`) | **1.428** |
| Trong đó: cùng dòng `isVi ? …` (khớp grep) | 1.198 |
| Trong đó: điều kiện xuống dòng (`isVi`⏎`?`) — grep 1 dòng không bắt | **230** |
| `const isVi = language === 'vi';` đã xoá | **28** (28 file; 4 file còn lại dùng `isVi` như param/prop) |
| Binding `language` bỏ khỏi destructure `useLanguage()` | **28** |
| Import/destructure `useLanguage` bỏ hẳn | **27** |
| Chỗ `isVi` dùng như **giá trị** (không phải condition) — sửa tay | **37** (18 dep-array/array-literal ở 11 file, 10 call-arg, 5 param, 1 property signature, 1 binding element, 1 JSX prop, 1 JSX expression cùng prop) |
| `isVi` còn lại sau codemod | **0** ngoài `LanguageContext.tsx` |
| **Pass 2:** JSX literal unwrap (`{'x'}` → `x`, `attr={'x'}` → `attr="x"`) | **800** (496 child + 304 attribute) |
| **Pass 2:** ca giữ nguyên vì không an toàn tuyệt đối | **84** (65 chứa `&`/entity + 19 leading/trailing whitespace) |
| `git diff -U0 \| grep -c "^+.*{'"` | **853 → 78** (còn lại toàn ca không an toàn) |
| `git diff -U0 \| grep -c "^+.*={'"` | **301 → 16** |
| `git diff --stat` cuối | **34 file, +1.442 / −2.073** |
| Comment nhắc `isVi` đã viết lại | **2** (`HorizontalScrollFilter.tsx`, `ExploreView.tsx`) |

---

## 2. Script & thuật toán (`/tmp/codemod-isvi.mjs`, không commit)

```
node /tmp/codemod-isvi.mjs            # dry-run: in totals + leftover value-uses + anomalies, KHÔNG ghi
node /tmp/codemod-isvi.mjs --write    # áp vào src/**
CODEMOD_ROOT=/tmp/p2a/base node /tmp/codemod-isvi.mjs --out /tmp/p2a/expected   # replay trên baseline HEAD (verify)
```

**Nguyên tắc: text-range replacement trên source gốc — KHÔNG reprint/format lại file.**

1. Parse từng `src/**/*.{ts,tsx}` (trừ `LanguageContext.tsx`) bằng TypeScript compiler API
   (dùng `createRequire(repo/package.json)` để resolve dep `typescript` có sẵn; script ở `/tmp`).
2. Với mỗi `ConditionalExpression` có `condition` là **identifier `isVi`** (kể cả `(isVi)` — 0 ca):
   - `newText = whenTrue.getText(sf)` — **đúng source text nhánh VI**, giữ nguyên chữ/dấu câu/khoảng trắng.
   - Guard: nếu conditional là **body của arrow function** và `whenTrue` là object literal → bọc `( … )`
     (không ca nào xảy ra; guard vẫn có).
3. Xoá statement `const isVi = language === 'vi';` nếu initializer khớp **chính xác** dạng đó; nếu khác → ghi
   anomaly, **không sửa**. (0 anomaly.)
4. Áp replacement theo **position giảm dần**; có kiểm tra overlap (0 overlap).
5. Reparse; nếu `language` không còn tham chiếu **trong scope của component chứa destructure**
   (scope-aware: tìm enclosing function-like, bỏ qua chính binding) → bỏ `language` khỏi
   `const { language } = useLanguage()`; pattern rỗng → xoá declaration (kèm dòng/indent).
6. Nếu `useLanguage` không còn reference nào → bỏ specifier khỏi named import
   (giữ specifier khác, ví dụ `LanguageProvider` ở `App.tsx`); import còn 1 specifier → xoá cả dòng import.
7. Reparse kiểm syntax (`parseDiagnostics` = 0 mọi file) + in danh sách `isVi` còn lại (chỉ value-use)
   và comment nhắc `isVi`.
8. **Replay determinism:** chạy lại codemod trên `git show HEAD:<file>` (worktree tạm) → **cùng totals**
   (1.428 / 28 / 28 / 27 / 37) ⇒ script deterministic, chỉ phụ thuộc AST gốc.

**Kiểm chứng "diff tối thiểu" tự động:** so `kết quả-replay-trên-HEAD` với cây hiện tại →
**38 hunk**: 36 hunk là đúng codemod (chỉ dòng chứa `isVi` bị đổi); 1 hunk là call-site `vat.ts`
(`vatNotConfiguredLabel(true)` → `()`); 1 hunk là comment `ExploreView` viết lại có chủ đích.
**0 hunk không giải thích được** ⇒ không có thay đổi ngoài phạm vi.

### 2b. Pass 2 — unwrap JSX literal (yêu cầu bổ sung của Lead sau review diff)

Script: `/tmp/p2a/unwrap-jsx.mjs` (`node /tmp/p2a/unwrap-jsx.mjs [--write] <file…>`), chỉ chạy trên **34 file
đang diff**. Hai pattern duy nhất, text-range replacement, **không sửa nội dung chuỗi**:

| Pattern | Điều kiện an toàn | Kết quả |
|---|---|---:|
| `JsxExpression` **child**: `{'text'}` → `text` | text (đã decode) không chứa `{ } < > &`; `text === text.trim()`; không newline/control char; không comment trong ngoặc; **và render string của parent TRƯỚC/SAU phải TRÙNG TUYỆT ĐỐI** (mô phỏng chuẩn hoá whitespace JSX của Babel: bỏ dòng trống, gộp newline thành 1 space) | **496** unwrap |
| `JsxAttribute` initializer: `attr={'text'}` → `attr="text"` | text không chứa `" & < > { }`; không newline/control; `text === text.trim()`; không comment trong ngoặc | **304** unwrap |
| Giữ nguyên (báo cáo) | chứa `&`/entity (**65**) — raw JSX sẽ hiểu thành entity; leading/trailing whitespace (**19**) — raw text sẽ mất/đổi khoảng trắng. Trong 84 ca: **74** nằm trên dòng thêm mới, **10** là `{'…'}` có sẵn từ trước (dòng context, không đụng) | **84** giữ |

**Vì sao cần render-check cho child (không chỉ kiểm ký tự):** hai expression string nằm trên 2 dòng
(`{'A'}`⏎`{'B'}`) render **`AB`**, nhưng sau khi unwrap thành text cùng khối sẽ render **`A B`** (JSX
gộp newline thành space) ⇒ đổi hiển thị. Guard render-equivalence bắt được các ca này. Các ca **attribute**
không có ngữ nghĩa whitespace nên chỉ cần kiểm ký tự.

**Verify pass 2:**
- **Độc lập:** parse bản `pass1-only` (replay từ HEAD) và bản hiện tại, render **mọi** `JsxElement/JsxFragment`
  bằng cùng chuẩn hoá whitespace ⇒ **34 file, 0 khác biệt render**, số element khớp 100%.
- **Idempotent:** chạy lại pass 2 (dry-run) trên cây hiện tại ⇒ **0 unwrap mới**, đúng 84 ca kept.
- `npm run lint` + build lại PASS sau pass 2 (§6). Không có file ngoài 34 file bị chạm.

---

## 3. Bảng trước/sau theo file (32 file có `isVi`)

| File | `isVi` trước | Ternary bỏ | Xoá decl `isVi` | Bỏ `language` | Bỏ import `useLanguage` | `isVi` sau |
|---|---:|---:|:--:|:--:|:--:|---:|
| `frontend/components/admin/groups/Group1WorkshopsPanel.tsx` | 202 | 197 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/groups/Group3CustomersPanel.tsx` | 139 | 135 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/ExploreView.tsx` | 130 | 128 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/HomeView.tsx` | 103 | 102 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/groups/Group2DesignersPanel.tsx` | 85 | 82 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/groups/Group0OverviewPanel.tsx` | 70 | 68 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/AdminDashboardView.tsx` | 67 | 65 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/AdminProductsPanel.tsx` | 60 | 58 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/ProductDetailView.tsx` | 56 | 53 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/groups/Group5ProductionPanel.tsx` | 55 | 53 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/AdminStorefrontPanel.tsx` | 45 | 44 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/custom/CustomIdeaRequestModal.tsx` | 44 | 43 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/auth/UserAvatarMenu.tsx` | 39 | 38 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/AdminSettingsPanel.tsx` | 39 | 35 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/CartView.tsx` | 36 | 32 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/RegisterView.tsx` | 34 | 33 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/material/MaterialTechnicalAdvisory.tsx` * | 34 | 30 | — | — | — | 0 |
| `frontend/components/services/ServiceShowcaseSection.tsx` | 32 | 31 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/WarehouseInventoryPanel.tsx` | 27 | 24 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/CadQuickViewModal.tsx` | 24 | 23 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/AdminSidebar.tsx` * | 24 | 23 | — | — | — | 0 |
| `frontend/components/CartDrawer.tsx` | 22 | 19 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/CheckoutView.tsx` | 22 | 19 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/AccessoriesManager.tsx` | 21 | 19 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/designer/DesignerModelsManagerTab.tsx` | 20 | 18 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/OrderSuccessView.tsx` | 17 | 16 | ✓ | ✓ | ✓ | 0 |
| `frontend/components/admin/AdminSeoPanel.tsx` | 16 | 15 | ✓ | ✓ | ✓ | 0 |
| `frontend/views/LoginView.tsx` | 16 | 15 | ✓ | ✓ | ✓ | 0 |
| `App.tsx` | 5 | 4 | ✓ | ✓ | giữ (MainApp còn `t`) | 0 |
| `frontend/components/NotFoundView.tsx` | 5 | 4 | ✓ | ✓ | ✓ | 0 |
| `frontend/lib/vat.ts` * | 5 | 2 | — | — | — | 0 |
| `frontend/components/HorizontalScrollFilter.tsx` * | 1 | 0 | — | — | — | 0 |
| **TỔNG** | **1.495** | **1.428** | **28** | **28** | **27** | **0** |

`*` = file chỉ có `isVi` dạng **param/prop/comment** (không có declaration) — xem §4.
(`isVi` "trước" đếm cả comment/type; 2 file `InvoiceModal`/`QuoteSummaryPanel` không có `isVi`, chỉ đổi call-site `vat.ts`.)

### 3.1 Vì sao 1.428 ≠ 1.201 (số trong brief)

| Nguồn | Số | Giải thích |
|---|---:|---|
| `git grep -o "isVi ?"` trên HEAD | 1.201 | chỉ bắt ternary **cùng dòng** |
| — trong đó comment nhắc `isVi ?` | 3 | `LanguageContext.tsx:8` (task-25) + `HorizontalScrollFilter:13` + `ExploreView:26` |
| ⇒ ternary cùng dòng thật | **1.198** | khớp AST |
| Ternary có điều kiện **xuống dòng** (`isVi`⏎`?`) — grep 1 dòng không bắt | **230** | ví dụ `CadQuickViewModal:288`, `CartDrawer:148`, `AdminProductsPanel:127` |
| **Tổng conditional AST đã xoá** | **1.428** | con số thực thi của codemod |

---

## 4. Ca biên — 37 chỗ `isVi` dùng như giá trị (sửa tay, đã xong)

Codemod **không tự sửa** value-use (theo đúng brief: báo danh sách, không đoán). Sau codemod đã xử lý tay:

| # | File | Chỗ dùng | Cách sửa |
|---|---|---|---|
| 1 | `lib/vat.ts` | `vatNotConfiguredLabel(isVi: boolean)`, `vatTotalNote(isVi, rate)` | bỏ param; hàm trả câu VI (nhánh EN đã bị codemod xoá) |
| 2 | `components/CartDrawer.tsx` | `vatNotConfiguredLabel(isVi)`, `vatTotalNote(isVi, vatRate)` | bỏ arg |
| 3 | `views/CartView.tsx` | như trên + dep array `[clearAppliedDiscount, isVi]` | bỏ arg + bỏ dep |
| 4 | `views/CheckoutView.tsx` | như trên | bỏ arg |
| 5 | `components/tool3d/QuoteSummaryPanel.tsx` | `vatNotConfiguredLabel(true)` | `vatNotConfiguredLabel()` (file **ngoài danh sách 32**, call-site bắt buộc) |
| 6 | `components/InvoiceModal.tsx` | `vatNotConfiguredLabel(true)` | `vatNotConfiguredLabel()` (như trên) |
| 7 | `components/admin/AdminSidebar.tsx` | `buildAdminNavGroups(isVi: boolean, counts)` | bỏ param |
| 8 | `views/AdminDashboardView.tsx` | `buildAdminNavGroups(isVi, counts)` | bỏ arg |
| 9 | `components/admin/AdminSettingsPanel.tsx` | `validate(form, isVi)` + `useMemo(..., [form, isVi])` | bỏ param + arg + dep |
| 10 | `components/material/MaterialTechnicalAdvisory.tsx` | prop `isVi: boolean` (interface + destructure) + `getMaterialAdvisory(materialName, isVi)` | bỏ prop + param; component tự VI |
| 11 | `views/ProductDetailView.tsx` | `<MaterialTechnicalAdvisory … isVi={isVi} />` | bỏ attribute |
| 12 | 11 file admin/designer (xem bảng) | **18 phần tử `isVi`** trong dep array / array literal | bỏ phần tử, giữ các dep khác; `[isVi]` → `[]` |
| 13 | `HorizontalScrollFilter.tsx`, `ExploreView.tsx` | comment mô tả nhánh `isVi ? … : …` | viết lại (không còn nhánh chết) |

Không còn ca nào bị bỏ dở / không xử lý an toàn. Không có `!isVi` (0) và `language === 'en'` (0) như brief.

---

## 5. Kiểm chứng behavior-preserving

1. **Tiền đề:** `LanguageContext` VI-only — `language` init `'vi'`, `setLanguage` ép `'vi'`, không đọc
   localStorage/URL ⇒ `isVi` luôn `true`; nhánh `else` là dead code **không thể chạy**.
2. **Cơ chế thay thế:** mỗi node conditional được thay bằng **đúng source text `whenTrue`** (không scope
   hoá lại, không đổi chuỗi, không đổi expression khác) ⇒ giá trị tại runtime của `isVi === true`
   **y hệt**; chỉ bỏ nhánh không bao giờ thực thi.
3. **Ngữ cảnh AST của 1.428 node** (đã kiểm để loại rủi ro precedence/statement):

| Parent kind | Số | Đánh giá |
|---|---:|---|
| `JsxExpression` (`{isVi ? … : …}`) | 925 | an toàn |
| `PropertyAssignment` (giá trị object) | 191 | an toàn |
| `ParenthesizedExpression` | 134 | giữ nguyên cặp ngoặc nguồn |
| `CallExpression` (argument) | 77 | an toàn |
| `ConditionalExpression` (nhánh của ternary khác) | 76 | an toàn (tham chiếu node con, không lồng trong node bị xoá) |
| `BinaryExpression` (**assignment** `x = isVi ? …`, không phải toán tử) | 12 | an toàn |
| `VariableDeclaration` | 7 | an toàn |
| `TemplateSpan` | 4 | an toàn |
| `ReturnStatement` | 2 | an toàn |
| `ExpressionStatement` + object literal (rủi ro block-vs-object) | **0** | không có |
| Arrow body + object literal | **0** | guard vẫn bật |

4. **Replay determinism** (§2.8) + **diff-vs-replay** (§2 "0 hunk không giải thích được").
5. `npm run lint` (tsc `--noEmit`) PASS — không còn tham chiếu `isVi`/`language` mồ côi;
   `validate`/`vat*`/`buildAdminNavGroups`/`getMaterialAdvisory` được cập nhật đồng bộ chữ ký + call-site.

---

## 6. Gates & build

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (0 lỗi) |
| Build | `npx vite build --outDir dist-ssr/p2a --emptyOutDir` | **PASS** (`✓ built in 4.77s`, `index-DsgZnjiX.js`) |
| `isVi` ngoài LanguageContext | `grep -rn "isVi" src/ \| grep -v LanguageContext` | **0 dòng** |
| `isVi` trong LanguageContext | `grep -c isVi src/frontend/context/LanguageContext.tsx` | **1** (comment; task-25 sở hữu) |
| `language === 'vi'` còn lại | `grep -rn "language === 'vi'" src/` | **18** (toàn bộ ở `App.tsx` — follow-up §8.1) |
| **Pass 2** — `{'…'}` còn trong dòng thêm | `git diff -U0 \| grep -c "^+.*{'"` | **853 → 78** = **74** dòng kept không an toàn + **4** dòng `${'…'}` trong template literal (ngoài 2 pattern, giữ nguyên) |
| **Pass 2** — `={'…'}` còn trong dòng thêm | `git diff -U0 \| grep -c "^+.*={'"` | **301 → 16** |
| **Pass 2** — tổng `{'` toàn `src/` | `grep -rno "{'" src/ \| wc -l` | **903 → 121** (84 kept + 10 file ngoài scope + số còn lại không thuộc 2 pattern) |
| **Pass 2** — render-equivalence | script `/tmp/p2a/verify-jsx-render.mjs` | **34 file, 0 diff render** |
| **Pass 2** — idempotent | `node /tmp/p2a/unwrap-jsx.mjs <34 file>` (dry-run) | **0 unwrap mới, 84 kept** |
| UI rules | `node scripts/check-ui-rules.mjs` | **PASS** (139→133 file sau Phase 1, 0 vi phạm mới) |
| Fabricated | `node scripts/check-fabricated.mjs` | **SẠCH** (133 file) |
| Contrast token | `node scripts/check-contrast.mjs` | **0 unexpected fail** (56/70 + 14 expected) |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **rc=0** (chỉ còn near-miss 4.56:1 đã biết, không tăng) |
| Icon names | `node scripts/check-icon-names.mjs` | **PASS** (132 file, 206 glyph) |
| Error handling | `node scripts/check-error-handling.mjs` | **PASS** (R1/R2=0, R3 trong budget) |
| Unit-price multiplier | `node scripts/check-unitprice-multiplier.mjs` | **PASS** |
| `git diff --check` | — | **PASS** (không whitespace error) |

> `npm run check` đầy đủ (có live gate Supabase) **không chạy** — ngoài phạm vi gate của task-24
> (Phase 2a chỉ yêu cầu lint/build + grep); các checker offline liên quan đã chạy ở trên.

---

## 7. Bundle — before → after (cùng phương pháp baseline Lead)

**Phương pháp:** build HEAD sạch trong worktree tạm (`git worktree add /tmp/p2a/basewt HEAD`, symlink
`node_modules`/`.env`) → so với build working tree hiện tại; gzip = **Node `zlib.gzipSync(level 9)`**,
initial critical = mọi `<script type=module src>` + `<link rel=modulepreload>` + `<link rel=stylesheet>`
trong `index.html`.

| Resource | BEFORE raw | BEFORE gzip z9 | AFTER raw | AFTER gzip z9 | Δ gzip |
|---|---:|---:|---:|---:|---:|
| `index-*.js` (entry) | 714.080 | **194.316** | 695.054 | **186.225** | **−8.091 (−4,16%)** |
| `react-vendor-*.js` | 51.499 | 18.190 | 51.499 | 18.190 | 0 |
| `supabase-vendor-*.js` | 221.007 | 57.646 | 221.007 | 57.646 | 0 |
| `index-*.css` | 89.454 | 15.655 | 89.454 | 15.655 | 0 |
| **TỔNG INITIAL CRITICAL** | **1.076.040** | **285.807** | **1.057.014** | **277.716** | **−8.091 (−2,83%)** |

- **Baseline khớp tuyệt đối** số Lead đã công bố: index **194.316 B gzip / 714.080 raw**, initial critical
  **285.807** ⇒ phương pháp đo tái tạo đúng, delta tin cậy.
- Delta raw entry: **−19.026 B (−2,66%)**. Cross-check `gzip -9 -n` (CLI): 193.231 → 185.201 (−8.030).
- Pass 2 hầu như không đổi byte (bundle: −81 B raw / −40 B gzip so với mới-pass-1 — `{`/`}` nén rất tốt);
  giá trị chính của pass 2 là **diff dễ đọc** theo review của Lead, không phải bundle.
- **CSS không đổi hash** (`index-G97cpGoT.css`) ⇒ các class Tailwind trong nhánh EN đều vẫn xuất hiện ở
  nhánh VI/nơi khác; không có thêm win CSS (không phải lỗi).
- Build dir: `dist-ssr/p2a/` (gitignored, **không ghi `dist/`**); worktree tạm đã `git worktree remove`.
- `git status --porcelain`: **34 dòng ` M`** (source) + **1 file untracked** = handoff này (`?? docs/tasks/…`,
  deliverable của task — Lead commit theo phase).

---

## 8. Rủi ro & follow-up

### 8.1 Follow-up (ngoài phạm vi task-24 — đề xuất Phase 2b/ task-25)

1. **`App.tsx` còn 18 ternary `language === 'vi' ? 'VI' : 'EN'`** (cùng bản chất dead-branch, không phải
   `isVi`) + `const { language, t } = useLanguage();` — nên gom vào một codemod tương tự
   (`language === 'vi'` → nhánh true). Hiện `language` vẫn được dùng nên **không** xoá destructure.
2. **`Header.tsx`**: `const { language, t } = useLanguage();` và dep `[currentScreen, language, …]`
   (file không có `isVi`) — dọn cùng đợt 2b sau khi hết ternary `language ===`.
3. **`LanguageContext.tsx`** (task-25): còn 1 comment nhắc `isVi`, dictionary `en:`, nhánh `t(key, vi, en)`
   — đúng phạm vi task-25 (agent khác chạy sau).
4. **`t()` fallbackEn** tại vài file không có `isVi` (vd `ChatSupportModal` dùng `const { t }`) — thuộc
   phạm vi dọn i18n chung (task-25/2b), không phải codemod này.
5. **Cosmetic (không bắt buộc):** replacement giữ nguyên `{'…'}`/`title={'…'}` (thừa ngoặc nhọn) để diff
   tối thiểu; nếu muốn gọn, một lượt prettier/eslint-fix riêng sẽ xử lý — **không** làm ở Phase 2a để
   tránh diff khổng lồ.

### 8.2 Rủi ro đã đánh giá

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Đổi format/lẫn code khác khi codemod | Thấp | Text-range, không reprint; verify replay + diff-vs-replay (0 hunk lạ) |
| Mất copy VI (đổi chữ/dấu) | Thấp | replacement = `whenTrue.getText()` nguyên văn; spot-check 5 file lớn (`Group1`, `Explore`, `Home`, `Cart`, `AdminProducts`) — dòng thêm đều là VI gốc |
| Xoá nhầm nhánh có side-effect | Thấp | `isVi` luôn true ⇒ else-branch dead; không có logic nào khác bị đụng |
| `language`/`useLanguage` còn mồ côi | Thấp | scope-aware cleanup + `tsc` PASS; `grep language === 'vi'` chỉ còn App (có chủ đích) |
| Sửa sai chữ ký `vat.ts`/`buildAdminNavGroups`/`validate` | Thấp | cập nhật đủ **6** call-site + tsc PASS |
| Không smoke browser | Trung bình | codemod behavior-preserving + tsc/build; khuyến nghị QA smoke 390/1440 các màn admin/designer/cart/checkout/PDP khi chạy QA Phase 2 |
| Pass 2 đổi whitespace render JSX | Thấp | Guard render-equivalence mô phỏng chuẩn hoá whitespace JSX + verify độc lập 34 file 0 diff; 84 ca không chắc được **giữ nguyên**, không đoán |
| Pass 2 unwrap nhầm chuỗi cần entity (`&`) | Không xảy ra | 65 ca chứa `&` được giữ nguyên ngoặc; không tự escape `&amp;` |
| Xung đột với task-25 (`LanguageContext`) | Thấp | task-24 **không** chạm file đó; task-25 chạy sau, API context không đổi ở 2a (chỉ bỏ consumer) |

---

## 9. Tái lập

```bash
# 1) dry-run (an toàn, không ghi)
node /tmp/codemod-isvi.mjs

# 2) áp codemod
node /tmp/codemod-isvi.mjs --write

# 2b) pass 2: unwrap JSX literal (chỉ 2 pattern an toàn, có render-equivalence guard)
node /tmp/p2a/unwrap-jsx.mjs --write $(git diff --name-only)
node /tmp/p2a/verify-jsx-render.mjs                 # 34 file, 0 diff render

# 3) kiểm
grep -rn "isVi" src/ | grep -v LanguageContext      # → rỗng
git diff -U0 | grep -c "^+.*{'"                     # → 78 (còn lại là 84 ca kept)
npm run lint && npx vite build --outDir dist-ssr/p2a --emptyOutDir

# 4) đo bundle baseline (HEAD) nếu cần tái tạo số BEFORE
git worktree add --detach /tmp/p2a/basewt HEAD
ln -s "$PWD/node_modules" /tmp/p2a/basewt/node_modules
(cd /tmp/p2a/basewt && npx vite build --outDir dist-ssr/base --emptyOutDir)
# gzip z9 + initial critical: xem §7 (Node zlib.gzipSync level 9)
git worktree remove /tmp/p2a/basewt --force
```

**Trạng thái cuối:** 34 file modified (unstaged), 0 file untracked, 0 commit/push; `dist-ssr/p2a` là
build kiểm chứng (gitignored, có thể xoá); script codemod chỉ ở `/tmp` (không vào repo).
