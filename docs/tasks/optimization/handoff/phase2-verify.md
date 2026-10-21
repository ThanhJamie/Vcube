<!-- doc-meta: status=active; verified=2026-10-21; owner=ui-auditor -->
# HANDOFF — Phase 2c: independent verification (một ngôn ngữ / dead-branch removal)

> **Work item:** `task-26` · **Verifier:** `ui-auditor` (độc lập với 2a/2b) · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `1daf364` (Phase 5 đã commit) + **unstaged Phase 2**
> **Phạm vi:** read-only `src/**`; chỉ ghi file này; **không commit/push**.
> **Build official:** `rm -rf dist && npm run build` — `dist/` hiện là build official Phase 2 (giữ lại cho Lead; gitignored).
> Baseline Phase 5 được dựng lại độc lập từ `HEAD` trong `/tmp` (`git archive` + symlink `node_modules`/`.env`).
> **Preview :4174 đã tắt sau smoke.** `dist-ssr/` không có (không dùng).
>
> ## ✅ VERDICT: **GO**
>
> 1. **Dead branch đã sạch**: `isVi`/`language === 'vi'`/`setLanguage|toggleLanguage|vcube_language`/`fallbackEn`/
>    3-arg `t()` = **0**; `en:` trong LanguageContext = **0**; API còn `{ t }` (3 call-site).
> 2. **1.428 conditional đã xoá — xác nhận độc lập bằng TypeScript AST** (không tin grep/claim):
>    1.493 identifier `isVi` ở HEAD = **1.428 conditionals + 28 definitions + 37 value-uses** — khớp chính xác.
> 3. **Behavior-preserving đã chứng minh**: cả 28 định nghĩa đều `const isVi = language === 'vi'`; `language`
>    không có đường nào khác `'vi'` ở HEAD (state init `'vi'`, `setLanguage` ép `'vi'`, `toggleLanguage` → `'vi'`,
>    không đọc localStorage) ⇒ chọn nhánh true là **tương đương runtime**. VI text **không đổi**:
>    **letter-stream 37/37 file giống tuyệt đối** (string + JSXText + template fragments, thứ tự tài liệu).
> 4. **Gates**: `lint` PASS · `build` PASS · **10/10 offline gates** `KHÔNG TỆ HƠN BASELINE`.
> 5. **Bundle**: initial critical **285.807 → 275.930 B gzip (−9.877 B, −3,46%)**; entry 194.316 → **184.439**
>    (−9.877, −5,08%); toàn bộ assets gzip −21.743 B. Không có tăng bất thường (>5%).
> 6. **VI-only smoke**: **50 route-check** (2 lượt × 390/1440) — **0 pageerror, 0 tràn ngang**, **0 hit** danh sách
>    từ EN bắt buộc của task; tiền `₫` + phân cách nghìn `.` + ghi chú VAT tiếng Việt; **0** `$`/`USD`.
>    Còn **EN kỹ thuật/tên riêng P3** (liệt kê §7) — **không** phải hồi quy Phase 2.

---

## 1. Grep gates (dead branch gone)

| # | Kiểm tra | Lệnh | Kết quả | Kỳ vọng |
|---|---|---|---:|---|
| G1 | `isVi` | `grep -rEn "\bisVi\b" src/` | **0** | 0 |
| G2 | `language === 'vi'` / `"vi"` | `grep -rEn "language === 'vi'" src/` | **0** | 0 |
| G3 | API đổi ngôn ngữ | `grep -rEn "setLanguage\|toggleLanguage\|vcube_language" src/` | **0** | 0 |
| G4 | `en:` trong dictionary | `grep -c "en:" src/frontend/context/LanguageContext.tsx` | **0** | 0 |
| G5 | `fallbackEn` | `grep -rEn "fallbackEn" src/` | **0** | 0 |
| G6 | `t()` 3 đối số | regex + **AST** (CallExpression callee `t`, args ≥ 3) | **0** | 0 |
| G7 | `language` / `Language` (API) | `grep -rEn "\blanguage\b" src/` · `\bLanguage\b` | **0** / **0** | 0 |
| G8 | `useLanguage()` call-site | grep AST | **3** — đều `const { t } = useLanguage()` | 3 |
| G9 | Import `useLanguage` | AST trên 37 file diff | **30 → 3 (−27)** | 27 bỏ |
| G10 | Binding `language` khỏi destructure | AST | **30** (28 declaration bỏ hẳn + 2 `{language,t}→{t}` ở App/Header) | 28+ |

> Lưu ý false positive khi grep `'en:'` toàn `src`: 112 hit còn lại là các tiền tố như `children:` — **không** phải
> entry i18n; đo đúng phải grep trong `LanguageContext.tsx` (G4 = 0).

---

## 2. Independent AST audit (không dựa vào lời builder)

Script ngoài repo: `/tmp/p2c/ast-audit.cjs`, `/tmp/p2c/details.cjs`, `/tmp/p2c/dict.cjs`, `/tmp/p2c/vi-stream.cjs`
(TypeScript compiler API parse `git show HEAD:<file>` vs file hiện tại, 37 file diff).

### 2.1 Số lượng & bản chất `isVi` ở HEAD

| Chỉ số | Kết quả | Đối chiếu claim builder |
|---|---:|---|
| Tổng identifier `isVi` (HEAD) | **1.493** | — |
| `ConditionalExpression` với condition `isVi` | **1.428** | ✅ khớp “1.428” |
| Định nghĩa `const isVi = language === 'vi'` | **28** | ✅ khớp 28 |
| Định nghĩa khác chuẩn (nguy hiểm) | **0** | ✅ — mọi `isVi` đều là phép so sánh `language === 'vi'` |
| `isVi` dùng như **value** (không phải condition/def) | **37** | ✅ khớp 37 → 1.428+28+37 = 1.493 |
| Nested conditional `isVi` trong `isVi` | **0** | ✅ |
| Ternary trong `as`/`satisfies` | **0** | ✅ |
| Ternary nhúng template string | **4** | ⚠️ có — đã kiểm từng ca (an toàn) |
| False-branch là JSX | **0** | ✅ |
| False-branch chứa call/assignment | **2** | ⚠️ có — call thuần, không bao giờ chạy runtime |

**Kiểu false-branch (1.428):** StringLiteral **1.298**, TemplateExpression **94**, PropertyAccessExpression **19**,
ArrayLiteralExpression **10**, ParenthesizedExpression **3**, FirstTemplateToken **1**, BinaryExpression **3**.

**4 template-embedded (HEAD):**
`Group0OverviewPanel.tsx:346` (`isVi ? 'Doanh thu' : 'Revenue'` trong `${…}`),
`Group1WorkshopsPanel.tsx:760` (`'Đã duyệt' : 'Verified'`), `:802` (`'công suất' : 'load'`),
`Group3CustomersPanel.tsx:788` (`'đơn hàng' : 'orders'`) — codemod thay bằng literal VI, an toàn.

**2 false-branch có call (HEAD):** `CadQuickViewModal.tsx:571` (`isVi ? … : vnd(...)`) và `HomeView.tsx:1280`
(`… : formatNumber(...)`) — cả hai là **pure function**, và false branch **không bao giờ được chọn** vì
`isVi` luôn true ⇒ không có side-effect nào bị mất/đổi.

### 2.2 Chứng minh behavior-preserving

`git show HEAD:src/frontend/context/LanguageContext.tsx`:
`const [language, setLanguageState] = useState<Language>('vi')` (dòng 459);
`setLanguage(_lang) { setLanguageState('vi'); localStorage.setItem('vcube_language','vi'); }` (472-477);
`toggleLanguage = () => setLanguage('vi')` (481); **không** có chỗ đọc `localStorage`/URL/query để đổi ngôn ngữ
(comment D0 ở 457-458 + grep HEAD xác nhận 0 call-site ngoài file). Kết luận: `language ≡ 'vi'` tại mọi thời điểm
⇒ `isVi ≡ true` ⇒ thay `isVi ? A : B` bằng `A` là **tương đương runtime**, không phải “đoán”.

**`t()` semantics tương đương:** HEAD `item[language] ?? item.vi` với `language='vi'` ⇒ `item.vi`; bản hiện tại
`item && typeof item.vi === 'string' ? item.vi : (fallbackVi ?? key)`. `''` vẫn trả `''` (cả hai đều không
fallback khi rỗng) ⇒ giữ đúng luật “ẩn có chủ ý”; thứ tự claim → dictionary → fallbackVi → key không đổi.

**DICTIONARY so sánh AST HEAD ⇄ hiện tại:** **85 keys → 85 keys**, 85 entry có `en` → **0**, **0 key thiếu/thừa**,
**0 khác biệt giá trị `vi`** (byte-for-byte). `configuredClaims(siteContent, appSettings)` — bỏ tham số `language`.

**Render-equivalence độc lập (mạnh hơn diff hunk):** với 37 file, trích toàn bộ text VI (StringLiteral +
NoSubstitutionTemplateLiteral + JSXText + TemplateHead/Middle/Tail), chuẩn hoá whitespace, ghép theo thứ tự tài liệu,
rồi so **stream chữ cái Unicode** HEAD vs hiện tại → **0 file khác biệt**. Tức là không có chữ Việt nào bị đổi,
thêm, bớt hay đảo thứ tự (các merge do unwrap JSX chỉ đổi segmentation, không đổi nội dung).

**JSX unwrap (pass 2):** HEAD có **550** conditional trả string trong JSX child + **321** trong JSX attribute
= 871 ca; đo hiện tại: JSXText chứa VI **+494** node, attribute raw string **+305** ⇒ **≈799 ca unwrap**
(builder công bố 800; lệch ±1 do 2 text node kề nhau merge). 89 `{'…'}` còn lại ≈ 84 ca kept có lý do (65 chứa `&`,
19 có whitespace biên) + 4 template + 1 khác — hợp lý và an toàn (đã chứng minh bằng letter-stream).

**LanguageContext:** 521 → **412 dòng** (đếm `split`), 15.378 → **11.396** ký tự.

---

## 3. Diff audit — 37 file, 945 hunk, 0 hunk không giải thích được

`git diff HEAD -- src` → **37 files, +1.516 / −2.256**. Phân loại hunk bằng script (`/tmp/p2c/diff-classify.py`) —
một hunk có thể mang nhiều tag:

| Tag | Số hunk | Nội dung |
|---|---:|---|
| `isVi-ternary/value` | **869** | xoá/chọn nhánh VI của conditional hoặc sửa value-use |
| `i18n-plumbing` | **45** | xoá `const isVi`, binding `language`, import/useLanguage |
| `core-LanguageContext` | **21** | xoá `language` state/API/`en:`/`Language` |
| `t-arg-removal` (2b-followup) | **12** | bỏ đối số EN thứ 3 của `t()` (App/Header/ChatSupport) |
| `vat-callsite` | **9** | `vatNotConfiguredLabel(true)`/`vatTotalNote(isVi, …)` → bỏ tham số |
| `vat-signature` | **2** | đổi chữ ký `vat.ts` |
| `comment-only` | **2** | comment `HorizontalScrollFilter`/`ExploreView` viết lại có chủ đích |
| **Giải thích tay** | **1** | `RegisterView.tsx` hunk đuôi ternary: `) : ( 'I agree…' )` bị xoá cùng nhánh EN (nhánh `{isVi ? (` ở hunk khác) — render đã chứng minh bằng letter-stream |
| **Không giải thích được** | **0** | ✅ |

**Kiểm tra “không đổi logic khác / không reprint”:** không hunk nào chạm route/IA/props/behavior; 2 file duy nhất
không có marker i18n trong HEAD là `InvoiceModal.tsx` + `QuoteSummaryPanel.tsx` — đúng 2 call-site `vat.ts` mà 2a
đã khai báo. Không file lạ ngoài phạm vi.

### 3.1 37 value-use đã sửa tay — kiểm từng nhóm

| Nhóm | File/site | Kết luận |
|---|---|---|
| Chữ ký `vat.ts` | `vatNotConfiguredLabel()`, `vatTotalNote(rate)` | Đúng: bỏ param, giữ nguyên câu VI; call-site CartDrawer/CartView/CheckoutView/InvoiceModal/QuoteSummaryPanel cập nhật đồng bộ (không còn arg). |
| `buildAdminNavGroups` | `AdminSidebar.tsx` (bỏ param) + `AdminDashboardView.tsx:289` gọi `(counts)` | Đúng, không còn arg. |
| `validate(form, isVi)` | `AdminSettingsPanel.tsx` bỏ param; `useMemo(validate(form), [form])` | Đúng; validation messages chọn nhánh VI, không đổi rulevalidate. |
| `getMaterialAdvisory(name, isVi)` + prop `isVi` | `MaterialTechnicalAdvisory.tsx` bỏ param; `ProductDetailView.tsx:727` không còn prop | Đúng; dữ liệu advisory giữ nguyên, chỉ chọn VI. |
| `useMemo` dep-array `[isVi]` (18 chỗ / 11 file) | bỏ dep | An toàn: `isVi` là hằng runtime ⇒ dependency không bao giờ đổi; memo vẫn đúng. |
| Prop/call-arg khác | `ProductDetailView` prop `isVi={isVi}`, `MaterialTechnicalAdvisory` | Đã bỏ cả 2 đầu. |

**Không có call-site nào ở HEAD truyền literal `false`** (grep `vatNotConfiguredLabel(false)`, `vatTotalNote(false`,
`getMaterialAdvisory(...,false)`, `isVi={false}` = 0) ⇒ mọi nhánh “false” đều không thể chạy ở runtime.

---

## 4. Gates (official build)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (exit 0) |
| Build | `rm -rf dist && npm run build` | **PASS** — `✓ built in 4.76s`, entry `index-BZir70ko.js` |
| Offline gates (10) | `node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast --only check-error-handling --only check-fabricated --only check-icon-names --only check-ui-rules --only check-unitprice-multiplier --only a8-sql-syntax-check --only lint-rls-migration --only lint-rls-sources` | **PASS** — 10/10 `[ OK ]`, `KẾT QUẢ: KHÔNG TỆ HƠN BASELINE` |

---

## 5. Bundle delta (Node `zlib.gzipSync(level 9)` — cùng method với baseline Phase 5 285.807)

| Chỉ số | BEFORE (HEAD `1daf364`) | AFTER (Phase 2) | Δ | % |
|---|---:|---:|---:|---:|
| `index-*.js` raw | 714.080 | **691.048** | **−23.032** | −3,23% |
| `index-*.js` gzip z9 | 194.316 | **184.439** | **−9.877** | −5,08% |
| `react-vendor` (preload) | 51.499 / 18.190 | 51.499 / 18.190 | 0 | 0 |
| `supabase-vendor` (preload) | 221.007 / 57.646 | 221.007 / 57.646 | 0 | 0 |
| `index-*.css` | 89.454 / 15.655 (hash `G97cpGoT`) | 89.454 / 15.655 (cùng hash) | 0 | 0 |
| **Initial critical (raw)** | **1.076.040** | **1.053.008** | **−23.032** | −2,14% |
| **Initial critical (gzip z9)** | **285.807** | **275.930** | **−9.877** | **−3,46%** |
| Toàn bộ `dist/assets` raw | 2.843.653 | 2.790.637 | −53.016 | −1,86% |
| Toàn bộ `dist/assets` gzip | 760.612 | 738.869 | −21.743 | −2,86% |

- **Không có tăng bất thường** (>5% threshold): initial **giảm 3,46%**, assets **giảm 2,86%** — đúng kỳ vọng
  (xoá chữ EN + ternary + nhánh chết; phần lớn saving nằm trong **các chunk lazy**, không phải entry).
- 68 asset entry đổi (34 chunk hash cũ bị thay + 34 mới) — mọi chunk có EN bị xoá đều nhỏ đi. Ví dụ lớn:
  `Group1WorkshopsPanel` 54.663→49.355 raw (−5.308), `Group3CustomersPanel` 37.472→33.530 (−3.942),
  `Group2DesignersPanel` 27.829→24.999 (−2.830), `Group0OverviewPanel` 16.457→13.838 (−2.619),
  `CheckoutView` 34.385→33.327 (−1.058), `AdminStorefrontPanel` 31.966→30.127 (−1.839).
- **EN string đã bỏ (đo từ AST HEAD):** 1.428 false-branch = **42.724 B** text EN + 85 `en:` dictionary = **1.855 B**
  + 25 đối số `t()` = **566 B** ⇒ **≈45.145 B chữ EN nguồn** (chưa kể dấu nháy/ternary/`en:` key); nén gzip
  thu về −9.877 B initial + −11.866 B ở các chunk lazy.

---

## 6. VI-only UI smoke (prod preview + fixture network-layer)

Môi trường: `vite preview --outDir dist --port 4174`; Chromium headless 1244 + SwiftShader (local PW libs);
Supabase paused ⇒ fixture `/tmp/vcube-fixtures.cjs` (REST products/materials/pricing; auth 400).
**Lượt 1** (giỏ trống): 12 route × 390/1440 = **24 check** — `/`, `/explore`, `/products/p1`, `/personalize`, `/quote`,
`/cart`, `/checkout`, `/tracking`, `/orders`, `/assets`, `/auth/login`, `/auth/register`.
**Lượt 2** (giỏ có 2 item, inject `vcube_cart_store`): 13 route × 2 = **26 check** (+ `/order-success`) để kiểm tiền/VAT.

| Kết quả tổng | Lượt 1 | Lượt 2 |
|---|---:|---:|
| route-check | 24 | 26 |
| **pageerror** | **0** | **0** |
| tràn ngang | **0** | **0** |
| hit danh sách EN bắt buộc của task (`Add to cart…Settings`) | **0** | **0** |
| `$` / `USD` visible | 0 | 0 |
| `/orders`, `/assets` | redirect `/auth/login` (guard còn chạy) | như trên |

**Format VI (lượt 2, giỏ populated):**
- Tiền: `.000 ₫` với phân cách nghìn `.` — mẫu thực đo: `170.000 ₫`, `500.000 ₫`, `1.850.000 ₫`, `670.000 ₫`;
  **0** `$`, **0** `USD`, **0** số kiểu `1,234`.
- VAT: hiển thị đúng câu VI — `VAT chưa được cấu hình — đơn chưa được cộng thuế (/admin → Cấu hình giá → Thuế VAT)`
  ở `/cart`; `/checkout` có `VAT*` + `(VAT chưa được cấu hình)`.
- Ngày: **không có ngày nào hiển thị** trên 13 route smoke (không có order/phiên thật) ⇒ **chưa quan sát được
  ngày trong browser**; kiểm tĩnh `src/frontend/lib/format.ts`: `formatDate` = `dd/MM/yyyy` (2 chữ số), `formatDateTime`
  = `dd/MM/yyyy HH:mm` 24h, locale `vi-VN`; **invoice** không mở được (cần auth/order) → gap, ghi §8.

---

## 7. EN còn hiển thị (char-string) — mức độ & đánh giá

**0 hit** cho danh sách từ EN bắt buộc của task. Các chuỗi EN còn lại là **thuật ngữ kỹ thuật/tên riêng/thương hiệu**
hoặc copy P3 (không phải hồi quy Phase 2; VI text đã được chứng minh không đổi):

| # | Chuỗi hiển thị | file:line | Đánh giá |
|---|---|---|---|
| R1 | `Tư Vấn & Custom Theo Ý Tưởng` (CTA Home) | `src/frontend/views/HomeView.tsx:1377` | **P3** — “Custom” là từ EN trong câu VI; nên đổi “Tư vấn & tạo mẫu theo ý tưởng” |
| R2 | `Bánh Răng Truyền Động (Module 2.5)` | `src/frontend/views/HomeView.tsx:117` | P3 — “Module 2.5” là thông số kỹ thuật (giữ được) |
| R3 | `Drone` (tab model hero) | `src/frontend/views/HomeView.tsx:126` | P3 — tên loại mô hình, chấp nhận được |
| R4 | `#Khớp gài Snap-Fit`, `#Parametric & Decor` (tag lọc) | `src/data/mockData.ts:33,35` | P3 — taxonomy kỹ thuật; nếu muốn VI-only tuyệt đối thì đổi “Khớp gài”, “Mô hình tham số & trang trí” |
| R5 | `JetBrains Mono`, `Inter`, `Roboto Mono` (font) | `src/frontend/views/PersonalizeView.tsx:799-801` | P3 — tên phông chữ, **phải** giữ |
| R6 | `Cổng VNPAY QR` | `src/frontend/views/CheckoutView.tsx:194,527` | P3 — tên cổng thanh toán, giữ |
| R7 | `WebGL`, `WebGL 2.0` | HUD 3D (`ThreeModelViewer`, `ModelViewer3D`) | P3 — thuật ngữ kỹ thuật, nên bổ sung allowlist |
| R8 | `Resin` (vật liệu) | nhiều nơi (vd `ServiceShowcaseSection`, `WorkshopSettingsView:2292`, `HomeView:153`) | P3 — tên vật liệu/ngành, allowlist |
| R9 | `tag`, `Gear`, `Snap-Fit` trong placeholder tìm kiếm | `src/frontend/context/LanguageContext.tsx:66` (`searchPlaceholder`) | **P3** — dictionary value còn EN; placeholder hiển thị thật |
| R10 | `Email` | footer/auth | ✅ nằm trong allowlist task |
| R11 | `SKU`, `VAT`, `FDM`, `SLS`, `PETG`, `PA-CF`, `STEP`, `CAD`, `3D`, `IoT`… | khắp nơi | ✅ allowlist kỹ thuật |

**Kết luận §7:** không còn nhãn UI tiếng Anh thuộc danh sách bắt buộc; residual chỉ là P3 kỹ thuật/tên riêng +
2 điểm copy P3 (R1, R9). Không phát hiện P1/P2 nào do Phase 2 gây ra.

---

## 8. Rủi ro & follow-up (không chặn GO)

| # | Mức | Vấn đề | Đề xuất |
|---|---|---|---|
| 1 | P3 | **67/85 key dictionary không còn được tham chiếu** (`grep t('key')`); ~2.610 ký tự source chết (VI + key) còn trong bundle entry | Dọn ở phase i18n cleanup: giữ 18 key đang dùng (nav*, footer*, searchPlaceholder, cartTitle, myOrdersTracking, switchAccount, signOut, liveSupportAria, footerRights, footerCadSecurity…), xoá phần còn lại |
| 2 | P3 | Residual EN R1/R9 (Custom, tag/Gear/Snap-Fit) | Sửa copy 2 chỗ; các mục R2–R8 ghi vào allowlist COPY-GLOSSARY |
| 3 | P3 | EN trong các field chết `nameEn/badgeEn/ctaLabelEn` của ServiceShowcase (không render nhưng còn source) | Xoá cùng phase dọn data chết |
| 4 | — | **Smoke chưa phủ** `/admin`, `/designer`, `/lab` (RoleGuard + Supabase auth paused) | QA khi Supabase resume; static grep hiện tại không còn nhãn EN UI-007 (chỉ comment) |
| 5 | — | **Date/invoice format chưa quan sát browser** (không có order/auth) | QA sau resume; static proof `format.ts` đạt `dd/MM/yyyy` + 24h + `vi-VN` |
| 6 | — | Bundle gain nhỏ (−3,46% initial gzip) là **kỳ vọng** (xoá nhánh chết + EN; vendor chi phối) | Không cần hành động; giá trị chính là code sạch + bỏ bẫy đổi ngôn ngữ |
| 7 | — | `dist/` official giữ nguyên cho Lead; baseline Phase 5 dựng lại trong `/tmp` | — |

---

## 9. Trạng thái cây & dọn dẹp

- `dist/` (11 MB) = **build official Phase 2**, giữ lại (gitignored) — entry `index-BZir70ko.js` 691.048 B.
- Preview `:4174` — **đã tắt** (PID 33993, HTTP 000 xác nhận).
- `git status` trước/sau verify **không đổi**: 37 file `src` modified + 2 handoff Phase 2 (untracked) + file handoff này.
- **Không commit/push**; `HEAD` vẫn `1daf364`. Không sửa `src/**`.

### Phụ lục — lệnh tái lập nhanh

```bash
# greps
grep -rEn "\bisVi\b|language === 'vi'|setLanguage|toggleLanguage|vcube_language|fallbackEn" src/ | wc -l   # 0
grep -c "en:" src/frontend/context/LanguageContext.tsx                                                    # 0

# build official + đo
rm -rf dist && npm run build
node -e '…' # đo Node z9 4 file trong dist/index.html (xem /tmp/p2c/measure.cjs)

# gates
node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast --only check-error-handling \
  --only check-fabricated --only check-icon-names --only check-ui-rules --only check-unitprice-multiplier \
  --only a8-sql-syntax-check --only lint-rls-migration --only lint-rls-sources   # 10/10 OK

# smoke (fixture + Chromium headless)
./node_modules/.bin/vite preview --port 4174 --strictPort   # nền
LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu node /tmp/p2c/smoke2.cjs
```

Script ngoài repo (không commit): `/tmp/p2c/{ast-audit,details,dict,counts,vi-stream,en-bytes,measure,unwrap,unwrap2}.cjs`,
`/tmp/p2c/{diff-classify.py,smoke.cjs,smoke2.cjs}`; dữ liệu đo `/tmp/p2c/*.json`.
