<!-- doc-meta: status=active; verified=2026-10-21; owner=design-foundation -->
# HANDOFF — Phase 2b: LanguageContext core + residual `language` (App/Header)

> **Work item:** `task-25` · **Agent:** `design-foundation` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `1daf364` + Phase-2a changes (34 file, unstaged).
> **Trạng thái:** DONE — gates xanh, không commit/push (`Lead` commit theo phase).
> **Không sửa:** 34 file của task-24, `src/index.css`, `package.json`, `vite.config.ts`, `dist/`; không thêm dependency.
> **Build vào `dist-ssr/p2b/`** (đã gitignore), **không ghi `dist/`**.

---

## 1. API trước → sau (`src/frontend/context/LanguageContext.tsx`)

| Hạng mục | TRƯỚC 2b | SAU 2b |
|---|---|---|
| `export type Language` | `'vi' \| 'en'` (public) | **XOÁ** (0 external ref) |
| Context value | `{ language, setLanguage, toggleLanguage, t }` | **`{ t }`** |
| `language` | `useState<Language>('vi')`, luôn `'vi'` | **XOÁ** (không còn state) |
| `setLanguage(lang)` | ép `'vi'` + ghi `localStorage['vcube_language']` | **XOÁ** (0 call-site ngoài file) |
| `toggleLanguage()` | no-op gọi `setLanguage` | **XOÁ** (0 call-site) |
| `DICTIONARY` entry | `{ vi: string; en: string }` ×85 | **`{ vi: string }` ×85** (85 `en` đã xoá) |
| `t(key, fallbackVi?, fallbackEn?)` | đọc `item[language] ?? item.vi`; ignore `fallbackEn` | đọc thẳng **`item.vi`**; `fallbackEn` vẫn trong chữ ký nhưng **bỏ qua** (xem §6 risk 1) |
| `configuredClaims(language, site, app)` | tham số `language` (không dùng) | **`configuredClaims(site, app)`** |
| Props/provider | `() => { const [language, setLanguageState] = useState…; …localStorage… }` | **stateless**: chỉ `useSiteContent/useAppSettings` + `useMemo(claims)` + `t` |
| Import react | `React, { createContext, useContext, useState, useEffect, useMemo, ReactNode }` | **`React, { createContext, useContext, useMemo }`** |
| `useLanguage()` | 3 call-site (`App`, `Header`, `ChatSupportModal`) | **3 call-site** (chỉ còn `{ t }`) |

**Ngữ nghĩa `t()` giữ nguyên:** claim admin (Nhóm A, kể cả `''`) → `item.vi` → `fallbackVi` → tên khoá.
`''` trong từ điển vẫn là **"ẩn có chủ ý"** (không fallback tên khoá) — đúng yêu cầu A1.
Đã verify độc lập: parse AST của bản trước/sau ⇒ **85/85 key, 0 chuỗi `vi` thay đổi** (byte-for-byte), `en` = 0.

---

## 2. Xoá gì / bao nhiêu

| File | Dòng | Ký tự (utf8 chars) | Nội dung |
|---|---:|---:|---|
| `src/frontend/context/LanguageContext.tsx` | 520 → **416** (**−104**) | 15.379 → **11.747** (**−3.632**) | 85 `en:`; state ngôn ngữ + 2 API đổi ngôn ngữ + localStorage; `Language`; tham số `language` của `configuredClaims`; import `useState`/`useEffect`/`ReactNode` |
| `src/App.tsx` | 2.153 (không đổi) | 88.019 → **86.977** (**−1.042**) | 18 ternary → VI literal; bỏ `language` khỏi `useLanguage()`; 3 JSX literal unwrap (quy ước 2a) |
| `src/frontend/components/Header.tsx` | 480 (không đổi) | 23.179 → **23.159** (**−20**) | bỏ `language` khỏi destructure + dep-array `:91` |
| **Tổng** | **−104 dòng** | **−4.694 chars** | |

Không file nào khác bị sửa trong phase này.

---

## 3. App.tsx — 18 ternary `language === 'vi'` → nguyên văn nhánh VI

Phương pháp: **TypeScript compiler API, text-range replacement trên source gốc** (không reprint/format lại
file; giữ nguyên byte của mọi đoạn khác). Regex condition = `Identifier(language) === StringLiteral('vi')`;
`newText = src.slice(whenTrue.getStart, whenTrue.getEnd())`. Đã assert **đúng 18** node, tất cả `whenTrue`
là `StringLiteral` → áp theo thứ tự position giảm dần.

| # | Dòng | Ngữ cảnh | Nhánh VI (giữ nguyên văn) |
|---:|---:|---|---|
| 1 | 1194 | `showToast(...)` admin guard | `'Chỉ Quản Trị Viên (Admin) mới có quyền truy cập trang quản trị'` |
| 2 | 1204 | `showToast(...)` lab guard | `'Chỉ tài khoản Xưởng in (Lab) hoặc Quản trị viên mới vào được Bảng điều khiển xưởng in'` |
| 3 | 1334 | `addToast({message})` | `'Đã xóa sản phẩm khỏi giỏ hàng'` |
| 4 | 1377 | `toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')` | `new Date().toLocaleDateString('vi-VN')` |
| 5 | 1406 | `showToast` | `'Không thể lưu vào Supabase. Đã hoàn tác.'` |
| 6 | 1408 | `showToast` | `'Đã thêm sản phẩm thành công!'` |
| 7 | 1428 | `showToast` | `'Lỗi cập nhật trên Supabase. Đã hoàn tác.'` |
| 8 | 1430 | `showToast` | `'Đã cập nhật sản phẩm thành công!'` |
| 9 | 1450 | `showToast` | `'Lỗi xóa trên Supabase. Đã hoàn tác.'` |
| 10 | 1452 | `showToast` | `'Đã xóa sản phẩm thành công!'` |
| 11 | 1755 | `featureName={…}` | `featureName={'Xưởng thiết kế & Quản lý ấn phẩm'}` (giữ `{}` vì có `&` — quy ước 2a) |
| 12 | 1778 | `featureName={…}` | như #11 |
| 13 | 1805 | `featureName={…}` | `featureName="ForgeControl Quản Trị Hệ Thống"` (unwrap — không có `&`) |
| 14 | 1836 | `featureName={…}` | như #13 |
| 15 | 2032 | JSX child `<span>{…}</span>` | `Tiêu chuẩn chế tạo công nghiệp` (unwrap) |
| 16 | 2080 | JSX child trong `<button>` | `{'Quản lý sản phẩm & giá'}` (giữ `{}` vì có `&`) |
| 17 | 2085 | JSX child | `{'Hàng đợi & tiến độ gia công'}` |
| 18 | 2090 | JSX child | `{'Cấu hình phí ship & thông báo'}` |

Sau đó: `const { language, t } = useLanguage();` → **`const { t } = useLanguage();`**.
Quy ước 2a pass-2 được áp cho 3 chỗ an toàn (không `&`, không khoảng trắng biên): #13/#14 attribute,
#15 child; 5 chỗ còn `{'…'}` đúng lý do 2a (chứa `&` → raw JSX sẽ thành entity).

### Header.tsx (dep-array)

```diff
- const { language, t } = useLanguage();
+ const { t } = useLanguage();
...
- }, [currentScreen, language, isLoggedIn, role]);
+ }, [currentScreen, isLoggedIn, role]);
```

`language` luôn `'vi'` nên bỏ khỏi dep-array **không đổi hành vi** scroll-into-view của nav.

---

## 4. Gates (final, 2026-10-21)

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** (`tsc --noEmit`, rc=0) |
| Build (riêng, không ghi `dist/`) | **PASS** — `npx vite build --outDir dist-ssr/p2b --emptyOutDir` ⇒ `✓ built in 4.64s`, entry `index-3oSs2xBc.js` |
| `grep -rn "\bisVi\b" src/` | **0** |
| `grep -rn "language === 'vi'" src/` | **0** |
| `grep -rn "setLanguage\|toggleLanguage\|vcube_language" src/` | **0** |
| `grep -c "en:" src/frontend/context/LanguageContext.tsx` | **0** (dictionary `^\s*en: ` = 0; literal count cũng 0) |
| `grep -rn "\blanguage\b" src/` | **0** (API không còn — không cần báo ngoại lệ) |
| `grep -rn "\bLanguage\b" src/` | **0** |
| `useLanguage()` call-site | **3** (`App.tsx` `{t}`, `Header.tsx` `{t}`, `ChatSupportModal.tsx` `{t}`) |
| Offline gates bổ sung | `check-ui-rules` PASS · `check-fabricated` SẠCH · `check-contrast` rc=0 · `check-contrast-combos` rc=0 |
| `dist-ssr/` | đã gitignore (`git check-ignore` xác nhận); **`dist/` không bị ghi** |

---

## 5. Bundle delta (gzip = Node `zlib.gzipSync(level 9)`; "initial critical" = mọi `<script type=module src>` + `<link rel=modulepreload>` + `<link rel=stylesheet>` trong `dist-ssr/p2b/index.html`)

| Chỉ số | BEFORE (Phase 2a — Lead) | AFTER (2b) | Δ |
|---|---:|---:|---:|
| `index-*.js` raw | 695.054 | **691.691** | **−3.363 (−0,48%)** |
| `index-*.js` gzip z9 | 186.225 | **184.756** | **−1.469 (−0,79%)** |
| Initial critical raw | — (không đổi vendor/CSS) | **1.053.651** | — |
| Initial critical gzip z9 | 277.716 | **276.247** | **−1.469 (−0,53%)** |
| `index-*.css` | 89.454 / 15.655 · `index-G97cpGoT.css` | **y hệt, cùng hash** | **0** |
| Vite-reported index gzip | 186,23 kB | **185,43 kB** | −0,8 kB |
| CLI cross-check `gzip -9 -n` | 185.201 (2a handoff) | **183.868** | −1.333 |

**Vì sao delta nhỏ:** 85 câu EN chỉ là chuỗi ngắn (~3,6 K ký tự source) và gzip nén text rất tốt; giá trị
thật của phase là **xoá API/state/nhánh chết + hết side-effect localStorage**, không phải bundle.

---

## 6. Rủi ro & việc còn lại

1. **`t()` vẫn còn 25 call-site truyền 3 đối số** (14 `App.tsx`, 9 `Header.tsx`, 2 `ChatSupportModal.tsx`)
   → **giữ** tham số `_fallbackEn` (nếu xoá sẽ lỗi TS2554 ở 25 chỗ, 2 chỗ nằm ngoài write-scope).
   Giá trị thứ 3 (chuỗi EN) **vẫn nằm trong bundle** dù bị bỏ qua. **Đề xuất phase kế:** bỏ đối số thứ 3
   ở 23 chỗ trong file foundation + 2 chỗ `ChatSupportModal` (W2) rồi xoá hẳn tham số khỏi `t()`.
2. **`configuredClaims` đổi chữ ký** (bỏ tham số `language`): đã grep **0 importer ngoài file**; nếu file
   khác import sau này phải cập nhật.
3. **Không đổi render**: `language` luôn `'vi'` từ trước; `t()` vẫn trả đúng 85 chuỗi VI (verify AST),
   CSS hash y hệt ⇒ không có thay đổi style/UI. Build/lint xanh.
4. **Không sửa 34 file task-24**; không revert; chỉ 3 file trong write-scope bị chạm.
5. Đo bundle so với baseline Lead công bố (Phase 2a); cây hiện tại = HEAD 1daf364 + 2a + 3 file 2b
   (không có thay đổi nguồn nào khác của agent khác trong lúc đo).
6. Không commit/push; `dist-ssr/p2b` là artifact build local (gitignored).

---

## 7. Lệnh tái lập

```bash
# gates
npm run lint
npx vite build --outDir dist-ssr/p2b --emptyOutDir

# greps gate
grep -rn "\bisVi\b" src/ | wc -l                          # 0
grep -rn "language === 'vi'" src/ | wc -l                 # 0
grep -rn "setLanguage\|toggleLanguage\|vcube_language" src/ | wc -l   # 0
grep -c "en:" src/frontend/context/LanguageContext.tsx    # 0
grep -rn "\blanguage\b" src/ | wc -l                      # 0

# đo bundle (z9 + initial critical)
node /tmp/measure-p2b.mjs   # script tạm ngoài repo; logic: zlib.gzipSync(level 9) cho entry + mọi ref trong index.html
```

---

## 8. 2b-followup — xoá 25 đối số EN chết của `t()` (task-27, 2026-10-21)

> Work item: `task-27` · cùng agent · **chỉ sửa 4 file** · không commit. Build `dist-ssr/p2b2/`.

### 8.1 Call-site đã sửa — 25/25

Phương pháp: **TS compiler API text-range** — với mỗi `CallExpression` callee `t` có 3 đối số,
xoá đúng đoạn từ `arguments[1].getEnd()` tới `arguments[2].getEnd()` (tức `, '<EN>'`), không
đụng key/nhánh VI/format của file. Guard: cả arg2+arg3 phải là string literal (25/25 ✓),
reparse `parseDiagnostics = 0`, sau khi sửa mỗi file còn **0** call 3 đối số.

| File | Số call-site | Ghi chú |
|---|---:|---|
| `src/App.tsx` | **14** | dòng 1899, 1904, 2023, 2027, 2040, 2045, 2050, 2055, 2060, 2070, 2100, 2119, 2121, 2123 |
| `src/frontend/components/Header.tsx` | **9** | dòng 57, 58, 59, 62, 67, 72, 151, 440, 451 |
| `src/frontend/components/ChatSupportModal.tsx` | **2** | dòng 52, 62 |
| **Tổng** | **25** | khớp AST scan trước đó |

Ví dụ: `t('navExplore', 'Khám Phá', 'Marketplace')` → **`t('navExplore', 'Khám Phá')`**;
`t('footerRights', '© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.', '…All rights reserved.')`
→ `t('footerRights', '© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.')`. Key + nguyên văn VI giữ nguyên.

### 8.2 Chữ ký `t()` cuối

```ts
// interface LanguageContextType
t: (key: keyof typeof DICTIONARY | string, fallbackVi?: string) => string;
// implementation
const t = (key: string, fallbackVi?: string): string => { … }
```

- Đã bỏ **`_fallbackEn`** khỏi interface + implementation + docblock; top docblock của file cũng
  cập nhật còn `t(key, fallbackVi?)`.
- Giữ nguyên: `fallbackVi`, semantics `''` = ẩn có chủ ý (không fallback tên khoá), thứ tự
  claim admin → `item.vi` → `fallbackVi` → key.
- `grep -rn "fallbackEn" src/` = **0**.

### 8.3 Gates (final)

| Gate | Kết quả |
|---|---|
| `grep -rnE "t\('[^']*', *'[^']*'," src/` | **0** |
| `grep -rn "fallbackEn" src/` | **0** |
| `npm run lint` | **PASS** (rc=0) |
| Build `npx vite build --outDir dist-ssr/p2b2 --emptyOutDir` | **PASS** (`✓ built in 4.61s`, entry `index-BZir70ko.js`) |
| CSS | `index-G97cpGoT.css` **không đổi hash** |
| `dist/` | không ghi |

### 8.4 Bundle delta (zlib level 9, cùng phương pháp §5)

| Chỉ số | 2b | 2b-followup | Δ |
|---|---:|---:|---:|
| `index-*.js` raw | 691.691 | **691.048** | **−643 (−0,093%)** |
| `index-*.js` gzip z9 | 184.756 | **184.439** | **−317 (−0,17%)** |
| Initial critical gzip z9 | 276.247 | **275.930** | **−317 (−0,115%)** |
| CSS gzip z9 | 15.655 | 15.655 | 0 |
| CLI cross-check `gzip -9 -n` | 183.868 | **183.561** | −307 |

### 8.5 Source churn

| File | chars trước → sau |
|---|---:|
| `src/App.tsx` | 86.977 → **86.503** (−474) |
| `src/frontend/components/Header.tsx` | 23.159 → **23.014** (−145) |
| `src/frontend/components/ChatSupportModal.tsx` | 5.447 → **5.399** (−48) |
| `src/frontend/context/LanguageContext.tsx` | 11.747 → **11.397** (−350) |
| **Tổng** | **−1.017 chars** |

> Sau bước này, **toàn bộ** chuỗi tiếng Anh trong lớp i18n của foundation đã hết: không còn
> `en:` trong dictionary, không còn đối số EN ở call-site, không còn tham số `fallbackEn`.
> `grep -rn "fallbackEn\|language === 'vi'\|isVi\|setLanguage\|vcube_language" src/` = 0.
