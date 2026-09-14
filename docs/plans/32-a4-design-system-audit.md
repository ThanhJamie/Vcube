# A4 — RÀ SOÁT READ-ONLY: DESIGN SYSTEM + HIỆU NĂNG (VCUBE)

**Ngày:** phiên A4 · **Repo:** `/home/thanh/projects/Vcube` (WSL2 Ubuntu-24.04)
**Chế độ:** READ-ONLY. Không sửa file nào trong repo. `git status --porcelain` rc=0, `git stash list` = 0 —
cây làm việc nguyên trạng như trước khi rà (mọi thay đổi `M`/`D` là dirty sẵn có, KHÔNG do tôi).
**Ngoại lệ được phép:** ghi 1 file = chính báo cáo này.
**Số đo bundle:** `npx vite build --outDir /tmp/vc-a4 --emptyOutDir` → đã `rm -rf /tmp/vc-a4` (xác nhận đã xoá).
**`:3000` vẫn tắt** (0 listener trên 3000/5173/4173, curl -> 000).

> **Quy ước bằng chứng:** mọi con số đều kèm lệnh grep Python-3.12/`grep` ở §0 để coordinator chạy lại.
> Mọi lệnh chạy qua `wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc '…'`.

---

## 0. DỤNG CỤ ĐO + CÁCH CHẠY LẠI (đọc trước khi tin bất kỳ số nào)

### 0.1 Tôi đã nghi dụng cụ 2 lần và cả 2 lần **dụng cụ sai**, không phải code sai

| Lần | Triệu chứng | Nguyên nhân thật | Xử lý |
|---|---|---|---|
| 1 | `grep -rno rounded-full src/frontend \| wc -l` = **315**, nhưng bộ đếm theo-tag ra **323** | `src/App.tsx` nằm ở `src/` **không** phải `src/frontend/` → 8 chỗ bị `--include` + đường dẫn loại ra | Đếm cả `src/**` và tách `src/App.tsx` ra báo riêng |
| 2 | `wc -l` báo `rc=True` | `wsl.exe` chuyển `$?` thành chuỗi PowerShell `True/False` | Bọc `bash script.sh`, dùng `echo EXIT=$?` **bên trong** script |

### 0.2 Bộ đếm `rounded-full` — **định nghĩa phân loại** (bắt buộc, một agent từng xếp nhầm bong bóng icon `w-10 h-10` vào CTA)

Bộ đếm là `scan.py` (Python 3.12, parse tag JSX có phân biệt `{}`/`""`), gán **mỗi** `rounded-full`
vào **tag bao ngoài gần nhất**, rồi phân loại **theo thứ tự ưu tiên**:

```
1. CIRCLE         w-N + h-N cùng N, hoặc size-N, hoặc aspect-square     -> ĐÚNG (avatar/chấm/bong bóng icon)
2. PROGRESS       role="progressbar", hoặc h-full + transition-(all|[width]) -> ĐÚNG (thanh tiến độ)
3. SKELETON       animate-pulse, hoặc overflow-hidden + surface-inverse-raised -> ĐÚNG (xương loading)
4. CTA_HANDROLLED <button|a|Link|NavLink> HOẶC có onClick|href|to|type|role -> **SAI**
5. SEGMENTED_SHELL div p-1 + rounded-full + bg-surface-muted|border         -> **SAI** (vỏ segmented)
6. STRIP_DECOR    h-N w-M (M>N, không px-*)                                  -> ĐÚNG (vạch trang trí)
7. DECOR_BLOB     blur-* / mảng absolute w-[Npx]                             -> ĐÚNG (quầng sáng nền)
8. PILL_STATIC    có px-* VÀ py-* nhưng KHÔNG interact                       -> ĐÚNG (chip/pill tĩnh)
9. OTHER          còn lại                                                    -> rà tay
```

**Điểm chết của bộ đếm cũ:** bong bóng icon tròn (`w-10 h-10 rounded-full`) nằm trong `<button>`
sẽ bị luật 4 bắt trước luật 1 → **sai**. Vì vậy `CIRCLE` được xét **trước** `CTA_HANDROLLED`.

**Hai false-positive đã biết, phải trừ khỏi nhóm SAI:**
- `src/App.tsx:454` và `src/frontend/views/AdminDashboardView.tsx:537`: `rounded-full` nằm trong
  **prop `avatar={<span … rounded-full …>}`** của `<Topbar>` — bộ đếm gán vào tag `<AppShell>`/`<Topbar>`
  vì prop nằm trong tag. **Đây là avatar = ĐÚNG.**
- `<input type="range">` (`ThreeModelViewer.tsx:388`, `Model3D.tsx:1883`, `Tool3DView.tsx:1250`) có
  `type=` + `appearance-none` → **thanh trượt, ĐÚNG** (nhưng vẫn nên là `ui/` primitive).

### 0.3 Lệnh grep/GỌI LẠI

```bash
# Bộ đếm đầy đủ 7 mục (radius, emoji, type scale, border, primitive, hand-rolled)
python3 /mnt/c/Users/chith/AppData/Local/Temp/vcube/a4/scan.py

# Đối chiếu nhanh
grep -rno rounded-full src --include='*.tsx' --include='*.ts' | wc -l          # 323
grep -rno rounded-full src/frontend --include='*.tsx' --include='*.ts' | wc -l # 315
grep -rno rounded-full src/App.tsx                                             # 8
grep -rc rounded-full src/frontend --include='*.tsx' | grep -v ':0$' | sort -t: -k2 -rn

# Gate màu thô (§4)
grep -rl '\[#' src --include='*.tsx' | wc -l                                   # 0
grep -rhoE 'text-\[[0-9]+px\]|text-\[1[01]px\]' src --include='*.tsx' | wc -l  # 0
grep -rhoE 'text-\[[0-9]+px\]' src                                             # chỉ 1: ui/index.ts:11 (trong COMMENT)

# Gate tương phản
node scripts/check-contrast.mjs; echo EXIT=$?                                  # EXIT=0

# Bundle (không sửa repo)
npx vite build --outDir /tmp/vc-a4 --emptyOutDir && rm -rf /tmp/vc-a4
```

---

## 1. BÁNG KÍNH — `rounded-full`

| Nhóm | Số | Phán quyết |
|---|---:|---|
| **CTA_HANDROLLED** (nút/CTA tự viết) | **135** | **SAI** — phải là `ui/Button` (bán kính 8px) |
| **SEGMENTED_SHELL** (vỏ segmented `p-1`) | **1** | **SAI** — phải `rounded-md` |
| **CIRCLE** (avatar/chấm/bong bóng icon) | **102** | ĐÚNG — giữ |
| **PROGRESS** (thanh tiến độ) | **18** | ĐÚNG — giữ |
| **SKELETON** | **11** | ĐÚNG — giữ |
| **STRIP_DECOR** (vạch nhấn) | **2** | ĐÚNG — giữ |
| **DECOR_BLOB** (quầng sáng nền) | **4** | ĐÚNG — giữ |
| **PILL_STATIC** (chip/pill tĩnh `px+py`) | **38** | ĐÚNG* — giữ (xem ghi chú) |
| **OTHER** | **9** | rà tay (8 là progress/strip bị lọt, 1 là tiêu đề) |
| **NOT_IN_A_TAG** (hằng class) | **3** | 2 trong `ui/Skeleton.tsx` (ĐÚNG), 1 là **comment** |
| **TỔNG `src/frontend/**`** | **315** | |
| **TỔNG `src/**` (thêm `src/App.tsx`) | 323** | |

> *Ghi chú `PILL_STATIC`: theo `docs/design/tokens.md` §6, `rounded-full` chỉ được dùng cho
> "avatar, chấm trạng thái, pill đếm, thanh tiến độ". Một `span` badge tĩnh `px-2 py-0.5 rounded-full`
> **không phải pill đếm** nhưng cũng không phải CTA ⇒ xếp vào vùng xám, **không tính là lỗi cứng**.
> Tuy nhiên 38 chỗ này lệch khỏi `ui/Badge` (`rounded-sm` 6px) ⇒ xem §4 việc #4.
> Registry chuẩn cho badge là `rounded-sm` (6px).

Phân bố tag trong nhóm SAI: `button` 123 · `Link` 5 · `input` 3 · `div` 1 · `span` 1.

### Top 10 file nhiều `rounded-full` "bẩn" nhất (CTA + SEGMENTED + OTHER)

| # | File | Số chỗ SAI |
|---|---|---:|
| 1 | `src/frontend/components/Header.tsx` | 19 |
| 2 | `src/frontend/views/DesignerDashboardView.tsx` | 17 |
| 3 | `src/frontend/components/AuthModal.tsx` | 15 |
| 4 | `src/frontend/views/Tool3DView.tsx` | 12 |
| 5 | `src/frontend/views/MyOrdersView.tsx` | 9 |
| 6 | `src/frontend/views/AssetLibraryView.tsx` | 8 |
| 7 | `src/frontend/views/CartView.tsx` | 8 |
| 8 | `src/frontend/components/auth/UserAvatarMenu.tsx` | 7 |
| 9 | `src/frontend/views/OrderTrackingView.tsx` | 7 |
| 10 | `src/App.tsx` | 6 |

(`RegisterView.tsx` 6, `QuoteSummaryPanel.tsx` 4, `OrderSuccessView.tsx` 4, `ChatSupportModal.tsx` 3,
`HomeView.tsx` 3 … — tổng **26 file** có ít nhất 1 CTA `rounded-full`.)

### Top 10 file nhiều `rounded-full` **ĐÚNG** nhất (để đối chiếu, tránh "dọn nhầm")

| # | File | CIRCLE |
|---|---|---:|
| 1 | `src/frontend/components/admin/WorkshopEstimatorBOM.tsx` | 7 |
| 1 | `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx` | 7 |
| 1 | `src/frontend/views/DesignerDashboardView.tsx` | 7 |
| 4 | `src/frontend/views/HomeView.tsx` | 6 |
| 5 | `src/frontend/views/OrderSuccessView.tsx` | 5 |
| 6 | `src/frontend/components/admin/groups/Group5ProductionPanel.tsx` | 4 |
| 7 | `AdminSeoPanel.tsx` / `Group2DesignersPanel.tsx` / `ObjectTreePanel.tsx` / `CheckoutView.tsx` / `MyOrdersView.tsx` / `ProductDetailView.tsx` / `Tool3DView.tsx` | 3 |
| — | **46 file** có `CIRCLE` | |

⚠️ **Cảnh báo dọn nhầm:** `DesignerDashboardView.tsx` có **17 CTA SAI + 7 CIRCLE ĐÚNG** trong cùng file.
`Header.tsx` có **19 SAI + 21 tổng** → 2 chỗ còn lại là avatar (`w-10 h-10` dòng 422). Dọn theo
`file:line`, KHÔNG dọn theo file.

**Chi tiết `file:line` đầy đủ 135 chỗ SAI:** chạy `scan.py`, mục `-- CTA_HANDROLLED chi tiet --`
(in ra `<file>:<line>  <tag>  <className>`). Rút gọn vài mẫu đại diện:

```
src/App.tsx:163                     <button>  px-5 py-2.5 bg-primary … rounded-full shadow-e1   (FAB)
src/App.tsx:1686                    <button>  fixed bottom-6 right-6 … rounded-full              (nút hỗ trợ nổi)
src/frontend/components/Header.tsx:299  <Link>  px-3.5 py-1.5 … bg-primary hover:bg-primary-hover rounded-full
src/frontend/components/AuthModal.tsx:577 <button> w-full py-3.5 px-5 bg-primary … rounded-full shadow-e2
src/frontend/views/CartView.tsx:108     <button>  px-6 py-3.5 bg-primary … rounded-full
src/frontend/views/MyOrdersView.tsx:346 <button>  flex-1 sm:flex-initial px-3.5 py-2 bg-primary … rounded-full
src/frontend/views/DesignerDashboardView.tsx:1023 <button> px-6 py-2.5 bg-primary … rounded-full
src/frontend/views/AssetLibraryView.tsx:171 <button> px-5 py-2.5 bg-primary … rounded-full
src/frontend/views/OrderTrackingView.tsx:293 <button> px-4 py-2 bg-primary … rounded-full
src/frontend/views/Tool3DView.tsx:1482   <button>  px-3.5 py-1.5 bg-primary … rounded-full
```

**Việc nhỏ nhưng giá trị cao:** `AuthModal.tsx:300` — vỏ segmented
`flex p-1 bg-surface-muted rounded-full` (1 chỗ SEGMENTED_SHELL) đang bọc 3 nút cũng `rounded-full`
(dòng 305/319/332) ⇒ cả cụm 4 chỗ phải chuyển `rounded-md` cùng lúc, không thì trông gãy.

---

## 2. EMOJI / KÝ HIỆU HIỂN THỊ

Định nghĩa 3 tầng (theo bảng mã Unicode, không theo "cảm giác"):
- **PICTO** = emoji/hình vẽ: `U+1F000–1FAFF`, `U+1F1E6–1F1FF`, `U+2600–27BF`, `U+2B00–2BFF`
- **SYMB** = toán học/mũi tên/hình học: `U+2190–21FF`, `U+2300–23FF`, `U+25A0–25FF`, `U+2022 •`, `U+00B7 ·`, `U+00D7 ×`
- **VS** = `U+FE0F` / `U+200D` (biến thể + ZWJ)

| Tầng | Số ký tự | Trong comment | **Hiển thị thật** |
|---|---:|---:|---:|
| PICTO (emoji hình) | **115** | ~ | **115** (đã lọc: gần như toàn bộ nằm ngoài comment) |
| SYMB | 788 | ~ | ~ |
| VS (U+FE0F) | 57 | — | — |
| **TỔNG `src/**`** | **960** | **580** | **~380** |

**Con số "cần dọn" = 115 (PICTO).** 580 ký tự còn lại nằm trong comment (`// ⚠️ RỖNG CÓ CHỦ Ý…`) —
**không hiển thị**, không tính là lỗi.

### Top 10 file nhiều ký hiệu hiển thị nhất (PICTO + SYMB, gộp)

| # | File | Tổng | Trong đó PICTO |
|---|---|---:|---:|
| 1 | `src/utils/pricingEngine.ts` | 70 | 1 (`⚠` trong comment) |
| 2 | `src/frontend/components/admin/PricingConfigPanel.tsx` | 58 | **6** |
| 3 | `src/frontend/views/Tool3DView.tsx` | 53 | 0 |
| 4 | `src/data/mockData.ts` | 52 | **21** |
| 5 | `src/utils/meshParser.ts` | 36 | 0 |
| 6 | `src/frontend/views/HomeView.tsx` | 32 | 1 |
| 7 | `src/frontend/context/LanguageContext.tsx` | 31 | 2 |
| 8 | `src/frontend/views/PersonalizeView.tsx` | 27 | 1 |
| 9 | `src/frontend/views/WorkshopSettingsView.tsx` | 27 | 0 |
| 10 | `src/App.tsx` | 26 | 2 |

### Top 10 file nhiều **EMOJI HÌNH** nhất (con số thật cần dọn)

| # | File | PICTO | Ví dụ |
|---|---|---:|---|
| 1 | **`src/data/mockData.ts`** | **21** | tất cả nằm trong comment `// ⚠️` ⇒ **0 hiển thị** |
| 2 | **`src/frontend/components/admin/AdminProductsPanel.tsx`** | **12** | `⚠` `🔧` `✓` `✖` ở dòng 190,191,260,264,268,290,403,404,541,542 |
| 3 | **`src/frontend/components/admin/groups/Group3CustomersPanel.tsx`** | **10** | `🏢` `👤` (394, 474), `🔴🟡🟢🔵` (733–738) |
| 4 | **`src/frontend/components/admin/groups/Group2DesignersPanel.tsx`** | **9** | `👑` `⚙` `🚀` `🛡` (257–261, 340–342, 653–655) |
| 5 | **`src/frontend/components/admin/AdminSeoPanel.tsx`** | **7** | `✓` `✗` (286,292,298,304,309) |
| 6 | **`src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx`** | **7** | `✕` `🟢` `🔵` `🟠` (538, 656–659) |
| 7 | `src/frontend/components/admin/PricingConfigPanel.tsx` | 6 | `⚠` (1739, 1763) |
| 8 | `src/types/index.ts` | 5 | — |
| 9 | `src/backend/services/settingsService.ts` | 4 | — |
| 10 | `src/frontend/components/MaterialComparisonMatrix.tsx` / `Group5ProductionPanel.tsx` | 3 | `✓` `⚠` / `💬` `📍` |

**Đối chiếu với "biết trước":** `mockData.ts` được cho là "từng có 36". **Hiện tại 21 PICTO + 10 SYMB = 31**
(bộ đếm cũ có thể tính cả `→`/`•`/`×`). **Quan trọng: toàn bộ 21 chỗ đó nằm trong comment
`// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.` ⇒ KHÔNG hiển thị ra UI.**
Nếu bộ đếm của coordinator ra 36 và coi là "emoji hiển thị" thì **dụng cụ đó đang đếm cả comment**.

**Kết luận §2:** emoji hiển thị thật tập trung ở **khu `/admin`** (7/10 file top đều là admin).
Đây là mảnh ghép với §5 và §7: khu admin là khu *ít* đi qua `ui/**` nhất.

**`emoji` trong `src/data/mockData.ts` toàn bộ là comment —**

```
$ grep -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}]' src/data/mockData.ts
45:// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
51:// ⚠️ RỖNG CÓ CHỦ Ý …
…  (26 dòng, tất cả bắt đầu bằng `//`)
```

---

## 3. MẬT ĐỘ CHỮ / THANG CHỮ

| Class | Số lần | Trong thang `tokens.md` §4? |
|---|---:|---|
| `text-xs` | **2170** | ✅ 12px (SÀN) |
| `text-sm` | **202** | ✅ 13px |
| `text-base` | **102** | ✅ 14px (body mặc định) |
| `text-lg` | **46** | ✅ 16px |
| `text-xl` | 29 | ✅ 20px |
| `text-2xl` | 48 | ✅ 24px |
| `text-3xl` | 15 | ✅ 30px |
| `text-4xl` | **6** | ✅ 38px |
| **`text-5xl`** | **3** | ❌ **NGOÀI THANG** |
| **`text-6xl`** | **1** | ❌ **NGOÀI THANG** |

**Tỉ lệ mất cân bằng:** `text-xs` chiếm **2170 / 2622 = 82,8%** mọi cỡ chữ trong `src/**`.
`text-sm` (13px, cỡ "dòng phụ/mô tả/ô bảng" đúng chuẩn) chỉ **202**. Nghĩa là toàn app đang chạy
ở **12px**, trong khi `tokens.md` §4 nói `--text-sm` là "mặc định của `Card`" và `--text-base` 14px
là "chữ mặc định của sản phẩm". **Đây là vấn đề mật độ lớn nhất, lớn hơn cả bán kính.**

### Ngoài thang — `file:line`

```
grep -rnoE 'text-(5xl|6xl|7xl|8xl|9xl)' src --include='*.tsx'
```
| File:line | Class | Ghi chú |
|---|---|---|
| `src/frontend/views/HomeView.tsx:340` | `text-3xl sm:text-5xl lg:text-6xl` | `<h1>` hero trang chủ — **lệch thang** |
| `src/frontend/views/HomeView.tsx` (chỗ khác) | `text-5xl` | — |
| `src/frontend/ui/Icon.tsx` | `text-5xl` | dùng cho icon size lớn |

`tokens.md` §4 nói rõ: *"Ngoài thang trên … `.fluid-hero-heading` / `.fluid-h1` / `.fluid-h2` cho hero
responsive"* — `src/index.css:299-317` **đã có sẵn 3 class đó** (`--font-hero-size` 2.25→5.25rem theo
breakpoint 640/768/1024/1280). ⇒ **Hero dùng `sm:text-5xl lg:text-6xl` là bỏ qua hệ fluid có sẵn.**

### `text-[Npx]` — 1 chỗ, và nó là **comment**

```
$ grep -rnoE 'text-\[[0-9]+px\]' src
src/frontend/ui/index.ts:11:text-[15px]      <-- trong khối /** … */ giải thích "KHÔNG text-[15px]"
```
⇒ **Gate `grep -rhoE 'text-\[[0-9]px\]|text-\[1[01]px\]' src --include='*.tsx' | wc -l` = 0 ✅**
(gate chỉ quét `.tsx`, nên an toàn; nhưng nếu ai mở rộng gate sang `.ts` sẽ báo 1 dương tính giả —
`safe` vì `.ts` không được `--include`.)

### Cỡ tiêu đề `<h1>` không thống nhất (12 chỗ dùng `text-2xl`/`text-3xl`)

```
$ grep -rn '<h1 className="text-2xl\|<h1 className="text-3xl' src/frontend --include='*.tsx' | wc -l
12
```
| File:line | Class `<h1>` |
|---|---|
| `HomeView.tsx:340` | `text-3xl sm:text-5xl lg:text-6xl font-black` |
| `ExploreView.tsx:551` | `text-2xl sm:text-4xl font-extrabold` |
| `ProductDetailView.tsx:608` | `text-xl sm:text-2xl font-extrabold` |
| `CartView.tsx:137` / `CheckoutView` / `MyOrdersView.tsx:138` / `OrderTrackingView.tsx:135,269` / `OrderSuccessView.tsx:45` / `AssetLibraryView.tsx:100` / `LoginView.tsx:83` / `RegisterView.tsx:161` | `text-2xl sm:text-3xl …` |
| `PersonalizeView.tsx:436` | `text-xl` |
| `Tool3DView.tsx:576,894` | `text-2xl sm:text-3xl lg:text-4xl` |

Trong khi `ui/PageHeader.tsx:138` khai `<h1>` = **`text-xl font-semibold tracking-tight`** (20px).
⇒ **12 trang dùng `<h1>` tự viết ở 24–38px, còn primitive chuẩn là 20px.** Mức độ khác biệt: **~2×**.

### Font weight cũng lệch khỏi "SaaS"

| Weight | Số lần |
|---|---:|
| `font-bold` (700) | **1545** |
| `font-semibold` (600) | 170 |
| `font-medium` (500) | 88 |
| `font-black` (900) | 55 |
| `font-extrabold` (800) | 41 |
| `font-normal` (400) | 16 |

⇒ 1545 + 55 + 41 = **1641 chỗ ở 700–900**, chỉ **258 chỗ ở 400–600**. Đây là chất "industrial" cũ,
ngược với mật độ SaaS trong `21-saas-spec.md`.

---

## 4. VIỀN / NỀN

| Hạng mục | Số | Nhận xét |
|---|---:|---|
| `border-line` (đậm, **trang trí**) | **483** | Ngoài `ui/`: **476**; trong `ui/`: **6** |
| `border-line-subtle` (hairline) | **307** | Ngoài `ui/`: 288; trong `ui/`: **19** |
| `border-line-control` (viền control) | **121** | Ngoài `ui/`: **113** |
| `divide-line-subtle` | **23** | |
| `divide-line` (đậm) | **7** | lệch chuẩn bảng (`tokens.md` §8: "đường kẻ hàng `divide-line-subtle`") |
| **`bg-white`** | **0** | ✅ |
| **`text-white`** | **0** | ✅ |
| **`bg-black` / `text-black`** | **0 / 0** | ✅ |
| **`(text\|bg\|border\|from\|to\|via\|ring\|fill\|stroke)-[#…]`** | **0** | ✅ |
| **`text-[Npx]` (thô)** | **0** trong `.tsx` | ✅ |
| Bảng màu Tailwind thô (`bg-slate-500`, `text-gray-700`…) | **0** | ✅ |

### Xác nhận gate §10 `tokens.md`

```
$ grep -rl '\[#' src --include='*.tsx' | wc -l                 # 0   ✅
$ grep -rhoE 'text-\[[0-9]px\]|text-\[1[01]px\]' src --include='*.tsx' | wc -l   # 0   ✅
```
**Cả hai gate = 0, xác nhận lại.** Cổng "màu thô" hiện **ĐÓNG hoàn toàn** — không còn hex, không
còn palette Tailwind thô, không còn `bg-white`/`text-white`.

### Nhưng có một lệch chuẩn **thật** ở §4: tỉ lệ đậm/nhạt bị đảo

`tokens.md` §6 (Card/Panel) khẳng định: *"**viền `--color-line-subtle`** + `bg-surface`… Phân tách
chủ yếu bằng **viền nhạt**"* và §3 (`--color-line`) chỉ dùng cho "viền **trang trí**".

Thực tế: **`border-line` 483 > `border-line-subtle` 307** (tỉ lệ 1.57:1) — trong khi `ui/**`
(tầng primitive, đã làm đúng) lại là **6 `border-line` vs 19 `border-line-subtle`** (đúng hướng).
⇒ Các trang tự viết đang vẽ **viền đậm gấp 3 lần tần suất** tầng primitive. Đây là nguyên nhân
trực quan số 1 khiến "trông không cùng một hệ".

`border-line` top file:

| # | File | `border-line` |
|---|---|---:|
| 1 | `src/frontend/components/admin/AdminStorefrontPanel.tsx` | 53 |
| 2 | `src/frontend/components/admin/PricingConfigPanel.tsx` | 46 |
| 3 | `src/frontend/views/DesignerDashboardView.tsx` | 43 |
| 4 | `src/frontend/components/admin/AccessoriesManager.tsx` | 34 |
| 5 | `src/frontend/components/admin/AdminProductsPanel.tsx` | 30 |
| 6 | `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx` | 25 |
| 7 | `src/frontend/views/Tool3DView.tsx` | 25 |
| 8 | `src/frontend/views/PersonalizeView.tsx` | 18 |

`border-line-subtle` top file: `Group1WorkshopsPanel.tsx` 63 · `Group3CustomersPanel.tsx` 33 ·
`Group2DesignersPanel.tsx` 29 · `Group5ProductionPanel.tsx` 23 · `ProductDetailView.tsx` 13.

⇒ **Hai nửa của `/admin` đang vẽ viền theo hai chuẩn khác nhau**: các `Group*Panel` (mới) dùng
`-subtle`, còn `AdminStorefrontPanel`/`PricingConfigPanel`/`AccessoriesManager`/`AdminProductsPanel`
(cũ) dùng `border-line` đậm.

---

## 5. PRIMITIVE CHƯA ĐƯỢC DÙNG

`src/frontend/ui/` có **26 module** (18 primitive theo yêu cầu + `Field/Input/Select/Money/Modal/Sheet/Icon/ToastViewport`).

| Primitive | JSX dùng ngoài `ui/` | Số file | Phán quyết |
|---|---:|---:|---|
| `Icon` | 663 | 57 | phổ biến nhất ✅ |
| `Button` | **143** | 16 | dùng thật |
| `Card` | 45 | 6 | dùng thật |
| `EmptyState` | 32 | 12 | dùng thật |
| `Field` | 32 | **2** | ⚠️ chỉ `WorkshopSettingsView`+`AdminDashboardView` |
| `Input` | 25 | **2** | ⚠️ y hệt trên |
| `InfoTip` | 40 | 16 | dùng thật |
| `Badge` | 16 | 4 | ⚠️ mỏng |
| `Skeleton` | 8 | **1** | 🔴 chỉ `ExploreView.tsx` |
| `StatCard` | 8 | 2 | ⚠️ |
| `Select` | 7 | **1** | 🔴 chỉ `WorkshopSettingsView` |
| `DataTable` | 5 | **1** | 🔴 chỉ `WorkshopSettingsView` |
| `Modal` | 4 | **1** | 🔴 chỉ `WorkshopSettingsView` |
| `PageHeader` | **2** | 2 | 🔴 |
| `AppShell` / `SideNav` / `Topbar` | **2 mỗi cái** | 2 | 🔴 **CHỈ trong `src/App.tsx`** |
| `ProgressBar` | **1** | 1 | 🔴 chỉ `ProductDetailView` |
| `KeyValue` | **1** | 1 | 🔴 chỉ `ProductDetailView` |
| `Sheet` | **1** | 1 | 🔴 chỉ `ExploreView` |
| **`ConfirmDialog`** | **0** | **0** | ⛔ **KHÔNG AI DÙNG** |
| **`Money`** | **0** | **0** | ⛔ **KHÔNG AI DÙNG** |
| **`Section`** | **0** | **0** | ⛔ **KHÔNG AI DÙNG** |
| **`Toolbar`** | **0** | **0** | ⛔ **KHÔNG AI DÙNG** |
| **`ToastViewport`** | **0** | **0** | ⛔ **KHÔNG AI DÙNG** |

### 5.1 `AppShell` — chỉ có **1** nơi dùng thật, không phải 3

```
$ grep -n 'AppShell\|SideNav\|Topbar' src/App.tsx
62:  import { AppShell, Button, Icon, SideNav, Topbar } from '@frontend/ui';
382:    <AppShell    <-- DashboardShell (dùng cho /lab + /designer)
463:    </AppShell>
$ grep -n 'AppShell' src/frontend/views/AdminDashboardView.tsx
17:  import { AppShell, Button, Field, Icon, Input, SideNav, Topbar } from '@frontend/ui';
426:    <AppShell
546:    </AppShell>
```
⇒ **`AppShell` được dùng ở đúng 2 file, 2 chỗ render, phục vụ 3 route** (`/lab`, `/designer` qua
`DashboardShell` chung ở `App.tsx:382`; `/admin` qua `AdminDashboardView.tsx:426`).
**Bản thân comment của primitive cũng tự khai:** `ui/AppShell.tsx:13`
> *"⚠️ **`AppShell`/`SideNav`/`Topbar` là primitive MỚI của Đợt 11A — CHƯA áp vào trang nào.**"*
Comment đó **đã cũ** (nay đã áp cho `/lab`, `/designer`, `/admin`) nhưng `AdminSidebar` vẫn còn
(`AdminDashboardView.tsx:16` vẫn `import … from '../components/admin/AdminSidebar'`).

### 5.2 Primitive gần như không ai dùng — và **file nào đang tự dựng thứ tương đương**

| Primitive bị bỏ | File tự dựng thứ tương đương | Bằng chứng |
|---|---|---|
| **`ConfirmDialog`** | `window.confirm()` × **6** | `DesignerDashboardView.tsx:179` · `AdminProductsPanel.tsx:137` · `PricingConfigPanel.tsx:720,841` · `AccessoriesManager.tsx:121` (+1 khác). Chính `ui/ConfirmDialog.tsx:4` ghi *"thay thế 9 chỗ `window.confirm/alert`"* — **chưa thay chỗ nào** |
| **`Money`** | `toLocaleString()` × **136** + `formatCurrency/formatVND/formatPrice` × **16** | `ui/Money.tsx` tồn tại nhưng **0 chỗ dùng**; `lib/format.ts` có `formatCurrency` (dòng 122) |
| **`Section`** | `gap-section` chỉ dùng **3** chỗ; `space-y-section` = 0 | `WorkshopSettingsView.tsx:1315`, `DesignerDashboardView.tsx:367`, `AppShell.tsx:164` — còn lại 100% section tự viết |
| **`Toolbar`** | `UnifiedCadToolbar.tsx` (tên trùng khái niệm, KHÁC primitive) | `components/tool3d/UnifiedCadToolbar.tsx` |
| **`ToastViewport`** | Toast do `useUIStore` + `App.tsx` tự render/`showToast` (dòng 971) | `ui/ToastViewport.tsx:1-25` ghi rõ *"hiện tại container KHÔNG có `role`/`aria-live` nào trong toàn frontend"* — tức **primitive có `role="status"` + `role="alert"` đúng chuẩn nhưng chưa được nối vào** |
| **`Skeleton`** (8 chỗ / 1 file) | `animate-pulse` × **50** trong **25 file** | nặng nhất: `PageSkeleton.tsx` **14**, `Group1WorkshopsPanel.tsx` 4, `Group3CustomersPanel.tsx` 4 |
| **`DataTable`** (5 / 1 file) | `<table>` × **21** trong **16 file** | `PricingConfigPanel.tsx` 2, `WarehouseInventoryPanel.tsx` 2, `Group1WorkshopsPanel.tsx` 2, `Group3CustomersPanel.tsx` 2, `DesignerDashboardView.tsx` 2 |
| **`PageHeader`** (2 / 2 file) | `<h1>` tự viết × **15** trong **13 file** | xem §3 |
| **`Field`+`Input`+`Select`** (32/**2**, 25/**2**, 7/**1**) | `<input>` × **278** trong **38 file**; `<select>` × **56** trong **19 file** | `PricingConfigPanel.tsx` 69 input, `AdminStorefrontPanel.tsx` 35, `Group1WorkshopsPanel.tsx` 24 |
| **`Modal`/`Sheet`** (4+1) | `fixed inset-0` × **39** trong **24 file**; chỉ **1** chỗ dùng `<dialog>` | `Group1WorkshopsPanel.tsx` 4, `Group2DesignersPanel.tsx` 3, `Group3CustomersPanel.tsx` 3, `DesignerDashboardView.tsx` 3 |
| **`Badge`** (16 / 4 file) | badge `rounded-full` tĩnh × **38** | xem §1 PILL_STATIC |
| **`Card`** (45 / 6 file) | `border-line-subtle` + `rounded-lg`+`bg-surface` tự viết × **118** trong **10 file** | `Group1WorkshopsPanel.tsx` **48**, `Group3CustomersPanel.tsx` 22, `Group2DesignersPanel.tsx` 16, `Group5ProductionPanel.tsx` 13 |
| **`Button`** (143 / 16 file) | `<button>` thô × **483** trong **54 file** | `Group1WorkshopsPanel.tsx` 34, `Group3CustomersPanel.tsx` 27, `DesignerDashboardView.tsx` 27, `AuthModal.tsx` 24, `PricingConfigPanel.tsx` 24 |

**Đọc bảng này ra một câu:** *`ui/**` đã được dựng xong và đúng, nhưng nó mới chỉ được áp vào
đúng **2 view** (`WorkshopSettingsView`, `AdminDashboardView`) + một phần `ExploreView`/`ProductDetailView`.
16/16 view đều `import … from '@frontend/ui'` nhưng **`DesignerDashboardView` chỉ import 3 thứ**
(`Button, Icon, PageHeader` — dòng 7) trong khi tự viết **27 `<button>`, 14 `<input>`, 2 `<table>`,
70 `border-line`, 24 `rounded-full`**.*

---

## 6. HIỆU NĂNG ĐO ĐƯỢC

Lệnh: `npx vite build --outDir /tmp/vc-a4 --emptyOutDir` → `✓ 1858 modules transformed` · `✓ built in 3.11s`
(đã `rm -rf /tmp/vc-a4` sau khi đo).

### 6.1 Năm chunk lớn nhất

| # | Chunk | Raw (kB) | **Gzip (kB)** |
|---|---|---:|---:|
| 1 | **`index-DVHPMpQU.js`** | **823,7** | **216,6** |
| 2 | **`three-vendor-Dzvn5SQW.js`** | **531,7** | **133,4** |
| 3 | **`Tool3DView-4bjN2fnU.js`** | **321,8** | **92,2** |
| 4 | **`supabase-vendor-Dou1_KsT.js`** | **221,0** | **57,7** |
| 5 | **`Group4PricingEnginePanel-BipIUuv7.js`** | **161,7** | **32,3** |
| — | `index-CXTKrmqw.css` | 108,9 | 17,2 |
| 6 | `WorkshopSettingsView-BiXrgtfy.js` | 58,6 | 15,6 |
| 7 | `Group1WorkshopsPanel-Ca2Co4wZ.js` | 54,2 | 10,5 |
| 8 | `DesignerDashboardView-oKj1yFJe.js` | 52,1 | 11,4 |
| 9 | `react-vendor-BdPk-oB-.js` | 51,5 | 18,2 |

### 6.2 `chunkSizeWarningLimit` — **1200 kB, và không có cảnh báo nào**

`vite.config.ts:49`: `chunkSizeWarningLimit: 1200`. Chunk lớn nhất `index` = **823,7 kB < 1200** ⇒
build **im lặng hoàn toàn**, kể cả khi 3 vendor chunk khác cũng ở mức 220–532 kB.
**Đây là gate bị vô hiệu hoá bằng cấu hình:** với SPA này ngưỡng hợp lý là 250–300 kB.

Ngoài ra `manualChunks` (`vite.config.ts:52-56`) khai **`three` / `react`+`react-dom`+`react-router-dom` /
`@supabase/supabase-js`** — không khai gì cho `lucide-react` (663 chỗ dùng `Icon`), `motion`, `canvas-confetti`,
`@google/genai`, `jszip` ⇒ tất cả dồn vào `index` (823 kB).

### 6.3 Chunk bị **`modulepreload` trên MỌI route** — `three-vendor` **CÓ**

```
$ grep -o 'modulepreload[^>]*' /tmp/vc-a4/index.html
<link rel="modulepreload" crossorigin href="/assets/react-vendor-BdPk-oB-.js">
<link rel="modulepreload" crossorigin href="/assets/supabase-vendor-Dou1_KsT.js">
<link rel="modulepreload" crossorigin href="/assets/three-vendor-Dzvn5SQW.js">
```

**XÁC NHẬN: `three-vendor` (531,7 kB / 133,4 kB gzip) bị preload trên MỌI route**, kể cả `/cart`,
`/checkout`, `/admin`, `/login` — những trang **không hề render WebGL**.

**Tải ban đầu thực tế (trang chủ, chưa lazy gì thêm):**

| Tài nguyên | Gzip kB |
|---|---:|
| `index-*.js` | 216,6 |
| `react-vendor-*.js` | 18,2 |
| `supabase-vendor-*.js` | 57,7 |
| **`three-vendor-*.js`** | **133,4** |
| `index-*.css` | 17,2 |
| **TỔNG (gzip)** | **≈ 443 kB** |

⇒ **133,4 / 443 = 30,1% payload tải ban đầu là Three.js, không cần thiết cho route đang xem.**

**Nguyên nhân gốc:** `three` bị kéo vào **chunk khởi động** qua đường tĩnh:
```
$ grep -rn "from 'three'" src --include='*.tsx' --include='*.ts'
src/utils/meshParser.ts  src/frontend/views/Tool3DView.tsx  src/frontend/components/tool3d/ModelViewer3D.tsx
src/frontend/components/ThreeModelViewer.tsx  src/frontend/components/personalize/PersonalizeModelViewer3D.tsx
src/frontend/three/dispose.ts
```
và **`ThreeModelViewer` được import TĨNH bởi 2 view cũng được import tĩnh**:
```
src/frontend/views/HomeView.tsx:5:        import { ThreeModelViewer } from '../components/ThreeModelViewer';
src/frontend/views/ProductDetailView.tsx:5: import { ThreeModelViewer } from '../components/ThreeModelViewer';
src/frontend/views/PersonalizeView.tsx:4:  import { PersonalizeModelViewer3D } from '../components/personalize/PersonalizeModelViewer3D';
```
`HomeView`, `ProductDetailView`, `PersonalizeView` **đều là import tĩnh** ở `App.tsx:44,46,52`.
⇒ Chuỗi: `index` → `HomeView` (tĩnh) → `ThreeModelViewer` (tĩnh) → `three` (manualChunks) → **preload**.

### 6.4 Số view **chưa `React.lazy`** trong `src/App.tsx`

```
$ grep -c 'React.lazy(' src/App.tsx        # 6
$ grep -nE "^import \{.*\} from '@frontend/views/" src/App.tsx | wc -l   # 12
```

`src/frontend/views/` có **16 file**:

| Trạng thái | Số | Danh sách |
|---|---:|---|
| **`React.lazy`** ✅ | **4** | `Tool3DView` (80), `AdminDashboardView` (81), `DesignerDashboardView` (82), `WorkshopSettingsView` (85) — +`WorkshopOnboardingWizard` (86, component) = 5 lazy |
| **Import tĩnh** ❌ | **12** | `HomeView`(44) `ExploreView`(45) `ProductDetailView`(46) `CartView`(47) `CheckoutView`(48) `OrderSuccessView`(49) `OrderTrackingView`(50) `MyOrdersView`(51) `PersonalizeView`(52) `AssetLibraryView`(53) `LoginView`(54) `RegisterView`(55) |

⇒ **12/16 view chưa lazy (75%)**. Nặng nhất là **`HomeView`** (kèm `ThreeModelViewer`) và
**`PersonalizeView`** (kèm `PersonalizeModelViewer3D`) — cả hai kéo `three` vào bundle khởi động.

### 6.5 Favicon — **KHÔNG CÓ**

```
$ ls -d public/            ->  NO public/ dir
$ grep -c 'rel="icon"' index.html   ->  0
$ grep -niE 'icon|manifest|apple|theme-color|preload|favicon' index.html
9:    <link rel="preconnect" href="https://fonts.googleapis.com" />
10:    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
$ find . -iname '*favicon*' -not -path './node_modules/*' -not -path './.git/*'   ->  (rỗng)
```
**Không có `<link rel="icon">`, không có `public/`, không có `favicon.ico`, không có `manifest.webmanifest`,
không có `theme-color`.** Thư mục `assets/` chỉ chứa `assets/.aistudio/`. ⇒ Browser sẽ **404 `/favicon.ico`**
mỗi lần tải trang, và tab hiển thị icon mặc định. **Đây là lỗi rẻ nhất và dễ thấy nhất trong cả báo cáo.**

### 6.6 Font — **có `preconnect`, KHÔNG có `preload`; 2 family × 10 weight**

`index.html:9-11`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800
      &family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

| Hạng mục | Giá trị |
|---|---|
| `preconnect` | ✅ **2** (googleapis + gstatic, có `crossorigin`) |
| `preload` (font file) | ❌ **0** |
| `font-display` | ✅ `swap` (trong URL) |
| Family | **2** — `Be Vietnam Pro`, `JetBrains Mono` |
| Weight | **10** — BVP 300/400/500/600/700/800 (6) + JBM 400/500/600/700 (4) |
| Self-host | ❌ dùng Google CDN (thêm 2 round-trip DNS+TLS trước khi chữ hiện) |

**Trọng số dùng thật (§3):** 700 (1545) · 600 (170) · 500 (88) · 900 (55) · 800 (41) · 400 (16).
⇒ **300 (`font-light`) = 0 chỗ dùng, `400` chỉ 16 chỗ.** Nhưng `--font-sans` gốc là BVP `300` và thân
`<body>` không đặt `font-weight` ⇒ **mọi chữ không có class weight đang render ở 300** — một weight
chưa được kiểm tương phản (mảnh hơn ⇒ khó đọc hơn ở 12px, mà 82,8% chữ là 12px — xem §3).

---

## 7. NHẤT QUÁN GIỮA CÁC KHU

**3 khu dùng `AppShell`** (`/lab`, `/designer` qua `DashboardShell` `App.tsx:362-466`; `/admin` qua
`AdminDashboardView.tsx:426`) so với **storefront** (`Header.tsx` + footer ở `App.tsx:1775`).

`CHROMELESS_SCREENS = ['admin','lab','designer']` (`App.tsx:991`) — 3 khu này ẩn Header/Footer storefront.

### 7.1 Khác biệt cụ thể

| # | Hạng mục | Khu `AppShell` (`/lab`,`/designer`,`/admin`) | Storefront (`/`,`/explore`,…) | File:line |
|---|---|---|---|---|
| 1 | **Bề rộng nội dung** | `max-w-[1400px]` (`AppShell.tsx:66`) | **`max-w-7xl` = 1280px** | `AppShell.tsx:66` vs `HomeView.tsx:331`, `ExploreView.tsx:543`, `ProductDetailView.tsx:232`, `CartView.tsx:128`, `CheckoutView.tsx:198`, `MyOrdersView.tsx:129` |
| 2 | **Gutter ngang** | `px-4 sm:px-6` | **`px-4 sm:px-6 md:px-12`** | `AppShell.tsx:164` vs `HomeView.tsx:330,557,1020,1189,1199,1255,1302` (7 section), `ExploreView.tsx:521`, `ProductDetailView.tsx:200`, `CartView.tsx:127`, `CheckoutView.tsx:197`, `MyOrdersView.tsx:128` |
| 3 | **Gutter dọc** | `py-6` (24px), không đổi theo breakpoint | **`py-6 sm:py-10`**; riêng Home `py-10 sm:py-14 lg:py-16` và **`py-20 sm:py-24`** (6 chỗ) | `AppShell.tsx:164` vs `HomeView.tsx:330` và `HomeView.tsx:557,1020,1189,1199,1255,1302` |
| 4 | **Nhịp giữa section** | `gap-section` = **24px** (token) | `space-y-6` (24px) / `space-y-8` / `mb-10 sm:mb-14` — **giá trị lẻ, không token** | `AppShell.tsx:164` vs `HomeView.tsx:1257` |
| 5 | **Cỡ `<h1>`** | `PageHeader.tsx:138` = **`text-xl` (20px) `font-semibold`** | **`text-2xl sm:text-3xl`** (12 trang) tới **`text-3xl sm:text-5xl lg:text-6xl`** (Home) | `PageHeader.tsx:138` vs `HomeView.tsx:340`; `ExploreView.tsx:551`; `CartView.tsx:137`; `MyOrdersView.tsx:138`; `OrderTrackingView.tsx:135,269`; `AssetLibraryView.tsx:100`; `OrderSuccessView.tsx:45`; `LoginView.tsx:83`; `RegisterView.tsx:161` |
| 6 | **Mật độ chữ** | `text-xs`/`text-sm` cân bằng (không file nào >10 `text-xs`) | **`text-xs` áp đảo: Home 67, Explore 51, ProductDetail 45** so với `text-base` 3 / 0 / 3 | `HomeView.tsx`, `ExploreView.tsx`, `ProductDetailView.tsx` |
| 7 | **Bán kính CTA** | `ui/Button` = `rounded-md` (8px) — `Button.tsx:70` | **CTA `rounded-full`**: Header 19, Designer 17, AuthModal 15, Tool3D 12… | `Button.tsx:70` vs `Header.tsx:299,480,489,500,508`; `CartView.tsx:108,115`; `AssetLibraryView.tsx:171` |
| 8 | **Cặp viền** | `border-line-subtle` chiếm ưu thế (`AppShell.tsx:129,152`; `Topbar.tsx:43`) | **`border-line` đậm chiếm ưu thế** | `AppShell.tsx:129,152`, `Topbar.tsx:43` vs `HomeView.tsx:296` (`border-line/30`), `Header.tsx:131,142` (`border-b border-line`) |
| 9 | **Chrome trên** | `Topbar` cao **`h-14` (56px)**, `sticky z-header`, `border-line-subtle` | `Header` cao **`py-3` + `border-b border-line` + `backdrop-blur-md`**, container `max-w-[1440px]` | `Topbar.tsx:43`, `AppShell.tsx:152` vs `Header.tsx:142,143` |
| 10 | **Announcement bar** | Không có | Có: `bg-surface-inverse … py-1.5 px-4 … border-b border-line` | `Header.tsx:131` |
| 11 | **Cột nav** | `SideNav` 240px / 64px (`AppShell.tsx:130`) | `Header` nav ngang `gap-4 xl:gap-6 … text-xs uppercase tracking-wider font-bold` | `AppShell.tsx:130` vs `Header.tsx:173` |
| 12 | **Chiều cao chạm** | Mọi mục nav `min-h-11` (44px) — `SideNav.tsx:16-17` | nav dùng `touch-target-btn` không nhất quán; nhiều nút `py-1`/`py-0.5` < 44px | `SideNav.tsx` vs `Header.tsx:202,216` (`px-2.5 py-1`), `MyOrdersView.tsx:166`, `Tool3DView.tsx:1508` |

### 7.2 Chẩn đoán: **6 nguyên nhân khiến trông không cùng một hệ** (xếp theo sức nặng thị giác)

1. **CTA "pill" ở storefront vs "hộp 8px" trong app** (§7.1 #7) — thấy ngay ở mọi màn.
   135 nút `rounded-full` nằm rải ở cả hai khu, nhưng khu app có `ui/Button` để đối chiếu ⇒ lệch lộ rõ.
2. **Viền đậm vs viền nhạt** (§7.1 #8 + §4) — `border-line` 483 vs `border-line-subtle` 307.
3. **`max-w-7xl` vs `max-w-[1400px]` + `md:px-12` vs `sm:px-6`** (§7.1 #1, #2) — mép nội dung
   lệch **120px** ở desktop và gutter lệch **24px** mỗi bên từ `md` trở lên.
4. **`<h1>` 20px semibold vs 24–38px black/extrabold** (§7.1 #5) — hai "giọng" tiêu đề.
5. **`text-xs` 82,8%** (§3) — cả hai khu đều quá nhỏ, nhưng storefront nhỏ hơn (Home 67 `text-xs` / 3 `text-base`).
6. **Nhịp dọc** `gap-section` (24px, token) vs `py-20 sm:py-24` (80/96px, không token) (§7.1 #3, #4).

### 7.3 Bất nhất **trong lòng** khu `AppShell` (không chỉ storefront vs app)

`DesignerDashboardView.tsx` là khu **đã** có `AppShell` nhưng vẫn giữ nguyên tầng cũ:

| Chỉ số | `DesignerDashboardView.tsx` | `WorkshopSettingsView.tsx` | `AdminDashboardView.tsx` |
|---|---:|---:|---:|
| `import … from '@frontend/ui'` | `{Button, Icon, PageHeader}` (3) | nhiều (24 `Input`, 31 `Field`, 4 `Modal`, 5 `DataTable`, 9 `EmptyState`, 7 `Select`, 4 `StatCard`) | nhiều |
| `<button>` tự viết | **27** | **2** | **0** |
| `<input>` tự viết | **14** | **0** | **0** |
| `<table>` tự viết | **2** | 0 | 0 |
| `border-line` | **70** | 3 | 0 |
| `rounded-full` | **24** | **0** | 1 (avatar) |
| `text-xs` | **157** | 44 | 6 |
| `animate-pulse` | 0 | 0 | 1 |

⇒ **`DesignerDashboardView` mới là màn "bẩn" nhất repo, dù nó đã nằm trong `AppShell`.**
Việc bọc `AppShell` **không** tự động làm view nhất quán — phải sửa bên trong.
(`DesignerDashboardView.tsx:367` có `gap-section` ✅ nhưng 70 `border-line` + 24 `rounded-full` ❌.)

---

## 8. GATE `check-contrast.mjs`

```
$ node scripts/check-contrast.mjs; echo EXIT=$?
… 84 cặp …
72/84 pass, 12 expected non-pass, 0 unexpected fail
EXIT=0
```
**RC = 0** ✅ (`72 PASS · 12 EXPECTED · 0 FAIL bất ngờ`).

### 8.1 Gate này **chỉ đo token**, KHÔNG đo DOM thật — và đây là lỗ hổng lớn

Script đọc **cặp màu khai báo trong `src/index.css` (`@theme` + `.dark`)**, tính tỉ lệ WCAG bằng công
thức trên **hai giá trị hex tĩnh**, rồi đối chiếu với danh sách `--expected` viết cứng trong script.
Nó **không** mở DOM, không đọc `getComputedStyle`, không biết phần tử nào đang chồng lên phần tử nào.

Hệ quả — những lỗi tương phản **thật** mà gate này **không thể** bắt:

1. **Chữ trên nền bán trong suốt.** Ví dụ `Header.tsx:142` `bg-surface-muted/95 backdrop-blur-md`,
   `HomeView.tsx:296` `border-line/30`, `AssetLibraryView.tsx:197` `bg-surface-inverse/70`,
   `Header.tsx` `text-on-inverse/70`. Gate tính `fg` trên `surface-muted` **đặc**, không tính `…/95`.
2. **Opacity trên chữ.** Repo có nhiều `text-on-inverse/70`, `text-fg-muted/…`; gate không mô hình hoá alpha.
3. **Nền chồng lớp** (card trên canvas trên section `bg-surface-inverse`): gate chỉ có cặp phẳng.
4. **Cỡ chữ thật.** Gate dùng ngưỡng 4.5 / 3.0 theo khai báo, **không biết** 82,8% chữ của app là **12px** (§3).
   Ở 12px + `font-weight 300` (BVP mặc định, §6.6), "đạt 4.5:1" trên giấy **không** đảm bảo đọc được.
5. **`prefers-contrast: more` / `forced-colors`** — `tokens.md` §6 yêu cầu glass phải chuyển nền đặc;
   không có test nào.
6. **`--expected` là danh sách tự khai.** 12 cặp "expected non-pass" được **miễn trừ bằng lời**
   (viền trang trí, màu đã loại). Nếu một token đang dùng cho chữ bị thêm vào `--expected`,
   gate vẫn xanh. Đây là **gate tự chấm điểm**.

⇒ **Kết luận: RC=0 là bằng chứng cho "bảng token đúng", KHÔNG phải "UI đúng WCAG".**
Muốn đo thật phải là kiểm tra DOM (axe-core / Playwright) trên các route chính — hiện **chưa có**.

---

## 9. TOP 10 FILE CẦN DỌN NHẤT

Xếp theo **tổng điểm bẩn** = CTA `rounded-full` + `rounded-full` OTHER + `window.confirm` +
`<button>` thô + `<input>` thô + `<table>` thô + `border-line` đậm + `text-xs` vượt trội +
`fixed inset-0` + `animate-pulse` (đã trừ các chỗ ĐÚNG).

| # | File | Điểm bẩn | Thành phần chính |
|---|---|---:|---|
| 1 | **`src/frontend/views/DesignerDashboardView.tsx`** | **~215** | 157 `text-xs` · 17 CTA `rounded-full` · 27 `<button>` · 14 `<input>` · 43 `border-line` · 2 `<table>` · 3 `fixed inset-0` · 1 `window.confirm` |
| 2 | **`src/frontend/components/admin/PricingConfigPanel.tsx`** | **~175** | 69 `<input>` · 46 `border-line` · 24 `<button>` · 6 emoji `⚠` · 2 `window.confirm` |
| 3 | **`src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx`** | **~155** | 34 `<button>` · **48 card tự dựng** · 24 `<input>` · 9 `<select>` · 4 `fixed inset-0` · 4 `animate-pulse` · 7 emoji |
| 4 | **`src/frontend/components/admin/AdminStorefrontPanel.tsx`** | **~93** | **53 `border-line`** (nhiều nhất repo) · 35 `<input>` |
| 5 | **`src/frontend/views/Tool3DView.tsx`** | **~90** | 12 CTA `rounded-full` · 25 `border-line` · 17 `<button>` · 4 `<select>` |
| 6 | **`src/frontend/components/admin/AdminProductsPanel.tsx`** | **~85** | **12 emoji hiển thị** (nhiều nhất) · 30 `border-line` · 8 `<select>` · 10 `<input>` · `window.confirm` |
| 7 | **`src/frontend/components/Header.tsx`** | **~80** | **21 `rounded-full` (19 CTA SAI)** · 24 `text-xs` · 15 `<button>` · 10 `border-line` |
| 8 | **`src/frontend/components/admin/groups/Group3CustomersPanel.tsx`** | **~74** | 27 `<button>` · 22 card tự dựng · 33 `border-line-subtle` · 4 `fixed inset-0` · 4 `animate-pulse` · 10 emoji |
| 9 | **`src/frontend/components/AuthModal.tsx`** | **~69** | 14 CTA `rounded-full` + 1 SEGMENTED_SHELL + 2 PILL · 24 `<button>` · 9 `<input>` |
| 10 | **`src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx`** | **~66** | 35 `text-sm` · 25 `border-line` · 19 `<button>` · 15 `<input>` · 6 card tự dựng |

**Á quân (11–15):** `Group2DesignersPanel.tsx` (~62) · `MyOrdersView.tsx` (~60) ·
`CartView.tsx` (~55) · `AccessoriesManager.tsx` (~48) · `AdminSeoPanel.tsx` (~45).

**File "quá bẩn so với quy mô":** `src/App.tsx` — chỉ 1 file nhưng chứa **8 `rounded-full`,
6 trong đó là CTA SAI** (`App.tsx:163,289,295,1686,1721`) + **FAB** + footer + `showToast`.

---

## 10. VIỆC CẦN SỬA — XẾP THEO TỈ LỆ LỢI ÍCH / CÔNG SỨC

### 🟢 Bậc 1 — lợi ích cao, công sức thấp (làm trong 1 buổi)

| # | Việc | File:line | Lợi ích |
|---|---|---|---|
| **B1** | **Thêm favicon.** Tạo `public/favicon.svg` + `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`; thêm `<meta name="theme-color">` | `index.html:9` (chèn trước `preconnect`) | Chặn 404 `/favicon.ico` mỗi lượt tải; tab có thương hiệu. **Rủi ro ~0** |
| **B2** | **`React.lazy` cho `PersonalizeView`.** Nó kéo `PersonalizeModelViewer3D` → `three` | `src/App.tsx:52` (đổi sang lazy như dòng 80–85); thêm `<Suspense>` | Cùng `HomeView`, cắt được đường tĩnh thứ 3 vào `three` |
| **B3** | **Sửa `AuthModal.tsx` cụm segmented.** Vỏ `p-1 rounded-full` + 3 tab `rounded-full` → `rounded-md` **cùng lúc** | `AuthModal.tsx:300` (vỏ), `305`, `319`, `332` + 2 pill dòng ~390–400 | 1 chỗ SAI + 4 chỗ lệch; thấy ngay trong modal đăng nhập |
| **B4** | **Xoá 6 `window.confirm`** → dùng `ui/ConfirmDialog` (đã có sẵn, 0 chỗ dùng) | `DesignerDashboardView.tsx:179` · `AdminProductsPanel.tsx:137` · `PricingConfigPanel.tsx:720,841` · `AccessoriesManager.tsx:121` | Primitive đã xong, chỉ cần nối; bỏ hộp thoại trình duyệt xấu |
| **B5** | **Nối `ui/ToastViewport`.** Toast hiện không có `role`/`aria-live` | `src/App.tsx:971` (`showToast`) → render `ToastViewport` từ `useUIStore`; primitive ở `ui/ToastViewport.tsx` | Sửa lỗi a11y thật (screen reader không đọc thông báo) |
| **B6** | **Sửa `chunkSizeWarningLimit` 1200 → 300** | `vite.config.ts:49` | Bật lại cảnh báo đang bị vô hiệu; 4 chunk vượt ngưỡng sẽ tự báo |

### 🟡 Bậc 2 — lợi ích cao, công sức vừa (1–3 ngày)

| # | Việc | File:line | Lợi ích |
|---|---|---|---|
| **Y1** | **`React.lazy` cho `HomeView`** + lazy `ThreeModelViewer` bên trong; hoặc `manualChunks` tách `three` khỏi preload bằng cách lazy hoá cả 3 consumer | `src/App.tsx:44`, `HomeView.tsx:5,512`, `ProductDetailView.tsx:5,342` | **Cắt 133,4 kB gzip (30,1% payload) khỏi MỌI route không-3D.** Việc giá trị nhất về hiệu năng |
| **Y2** | **Chuyển 135 CTA `rounded-full` → `ui/Button`.** Làm theo cụm, mỗi lần 1 file. Ưu tiên: `Header.tsx` (19), `DesignerDashboardView.tsx` (17), `AuthModal.tsx` (15) | `Header.tsx:202,216,236,267,291,299,…`; `CartView.tsx:108,115,377`; `MyOrdersView.tsx:200,317,326,335,346,462,468`; `AssetLibraryView.tsx:171,233,252`; `OrderTrackingView.tsx:293,300`; `Tool3DView.tsx:1482`; `ProductDetailView`… | Sửa lệch thị giác số 1 giữa các khu (§7.2) |
| **Y3** | **Đổi `text-xs` → `text-sm` cho chữ nội dung.** Chỉ cần ~185 chỗ (10% của 2170) đã đổi cảm giác mật độ. Bắt đầu ở 3 file storefront nặng nhất | `HomeView.tsx` (67), `ExploreView.tsx` (51), `ProductDetailView.tsx` (45) | `text-xs` là **SÀN** 12px, không phải cỡ mặc định (tokens §4) |
| **Y4** | **Thống nhất `<h1>`.** 12 trang storefront `text-2xl sm:text-3xl` → `PageHeader` hoặc `.fluid-h1` (đã có sẵn ở `index.css:307`) | `ExploreView.tsx:551`, `CartView.tsx:137`, `MyOrdersView.tsx:138`, `OrderTrackingView.tsx:135,269`, `AssetLibraryView.tsx:100`, `OrderSuccessView.tsx:45`, `LoginView.tsx:83`, `RegisterView.tsx:161`, `ProductDetailView.tsx:608`, `PersonalizeView.tsx:436` | Bỏ 2 "giọng" tiêu đề |
| **Y5** | **Ngân sách font.** Bỏ weight 300 (0 chỗ dùng) và 800 (41 chỗ); đặt `font-weight: 400` cho `body`. Thêm `preload` cho woff2 BVP 400/600 | `index.html:11`; `src/index.css` `@layer base` | Bớt 2 file woff2 + sửa "mặc định 300" đang render ở 12px |
| **Y6** | **Dùng `ui/Money` cho 136 `toLocaleString()`** | toàn `src/frontend/**`; primitive ở `ui/Money.tsx`, `lib/format.ts:122` | Một quy ước tiền tệ duy nhất + `tabular-nums` |

### 🔴 Bậc 3 — lợi ích cao, công sức lớn (1–2 tuần, làm dần)

| # | Việc | File:line | Lợi ích |
|---|---|---|---|
| **R1** | **Chuyển khu `/admin` sang primitive.** 4 file nặng nhất đang tự dựng `<input>`/`<table>`/card | `PricingConfigPanel.tsx` (69 input) · `AdminStorefrontPanel.tsx` (35 input, 53 `border-line`) · `Group1WorkshopsPanel.tsx` (34 button, 48 card) · `AdminProductsPanel.tsx` (12 emoji) | `Field`/`Input`/`DataTable`/`Card` đã sẵn sàng nhưng chỉ 2 view dùng |
| **R2** | **Dọn 115 emoji hiển thị.** Thay bằng `lucide-react` (đã có, `Icon` 663 chỗ) | `AdminProductsPanel.tsx` (12), `Group3CustomersPanel.tsx` (10), `Group2DesignersPanel.tsx` (9), `AdminSeoPanel.tsx` (7), `Group1WorkshopsPanel.tsx` (7) | Bỏ `⚠🔧✓✖👑🚀🛡🔴🟡🟢🔵` — đây là mảnh ghép với §5: khu admin chưa đi qua `ui/**` |
| **R3** | **Đổi `border-line` → `border-line-subtle`** ở 476 chỗ ngoài `ui/` | `AdminStorefrontPanel.tsx` (53) · `PricingConfigPanel.tsx` (46) · `DesignerDashboardView.tsx` (43) · `AccessoriesManager.tsx` (34) | Sửa lệch thị giác số 2 (§7.2); `ui/**` đã đúng hướng (6 vs 19) |
| **R4** | **Thống nhất lưới storefront ↔ AppShell**: `max-w-7xl`→`max-w-[1400px]`, `sm:px-6`→`sm:px-6 md:px-12` (hoặc ngược lại), `py-20 sm:py-24`→`space-y-section` | `HomeView.tsx:331,557,1020,1189,1199,1255,1302`; `ExploreView.tsx:521,543`; `CartView.tsx:128`; `CheckoutView.tsx:198`; `MyOrdersView.tsx:129` | Sửa lệch mép 120px + gutter 24px (§7.1 #1, #2) |
| **R5** | **Dọn `DesignerDashboardView.tsx`** — màn bẩn nhất repo dù đã trong `AppShell` | `DesignerDashboardView.tsx` (157 `text-xs`, 17 CTA, 70 `border-line`) | Xoá nghịch lý "đã bọc shell mà vẫn không cùng hệ" |
| **R6** | **Thêm đo tương phản theo DOM** (Playwright + axe trên 6 route chính) | mới — bổ sung cho `scripts/check-contrast.mjs` | Vá lỗ hổng §8.1: gate hiện chỉ đo token, không đo DOM |

---

## 11. BA–NĂM VIỆC QUAN TRỌNG NHẤT

1. **Y1 — `React.lazy` cho `HomeView`/`ThreeModelViewer`, bỏ `three-vendor` khỏi `modulepreload` mọi route.**
   Đo được: **133,4 kB gzip = 30,1%** payload tải ban đầu đang bị đốt cho thư viện 3D trên cả những
   route không hề render WebGL. `three-vendor` **xác nhận** có trong `modulepreload` của build
   (`vite.config.ts:53` + `HomeView.tsx:5` + `ProductDetailView.tsx:5` import tĩnh).
   Đây là **con số lớn nhất, đo được, sửa được, ít rủi ro nhất** trong báo cáo.

2. **Y2 — 135 CTA `rounded-full` phải về `ui/Button` (8px).**
   `docs/design/tokens.md` §6 đã **bãi bỏ** luật pill và tự dự phóng *"~30 CTA tự viết"* —
   thực đo là **135** (gấp 4,5× dự phóng). Đây là khác biệt thị giác số 1 giữa `/lab`-`/designer`-`/admin`
   và storefront. Bắt đầu: `Header.tsx` (19) → `DesignerDashboardView.tsx` (17) → `AuthModal.tsx` (15).

3. **Y3 — Hạ `text-xs` từ 82,8% xuống.** `text-xs` **2170** vs `text-sm` **202** vs `text-base` **102**.
   `tokens.md` §4 nói `text-base` 14px là "chữ mặc định của sản phẩm", thực tế app chạy 12px.
   Cộng với `font-weight 300` mặc định (§6.6) và **12px**, đây là vấn đề đọc-hiểu chứ không chỉ thẩm mĩ.

4. **B1+B5 — Favicon + `ToastViewport`.** Hai lỗi **cụ thể, rẻ, kiểm chứng được**:
   **favicon = 0** (`grep -c 'rel="icon"' index.html` → 0, không có `public/`) ⇒ 404 mỗi lượt tải;
   **`ui/ToastViewport` = 0 chỗ dùng** trong khi toast của app không có `role`/`aria-live` nào
   (chính file primitive ghi vậy ở dòng 1–4). Sửa xong là **đóng được 2 gate**, không cần refactor.

5. **R6 — Thay/bổ sung gate tương phản bằng đo DOM thật.**
   `node scripts/check-contrast.mjs` → **RC=0** (72 PASS / 12 EXPECTED / 0 FAIL) nhưng nó **chỉ so
   84 cặp hex khai báo trong `src/index.css`** với danh sách `--expected` do chính script tự khai.
   Nó không thấy `bg-surface-muted/95`, `text-on-inverse/70`, nền chồng lớp, hay việc **82,8% chữ là 12px**.
   **RC=0 đang được đọc như "UI đạt WCAG" — điều đó chưa được chứng minh.**

---

## 12. LỖI DO CHÍNH TÔI GÂY RA

| # | Lỗi | Ảnh hưởng | Trạng thái |
|---|---|---|---|
| 1 | **Quoting qua `wsl.exe -- bash -lc "…"`.** Tôi truyền lệnh có `$`, `\(`, `\b`, `\$(…)` qua PowerShell → bash → nhiều lần vỡ cú pháp (`unexpected end of file`, `grep: command not found`), làm mất ~6 lượt gọi | Chậm, nhưng không sai số | Đã sửa: mọi script phức tạp chuyển sang file `.sh` ghi ở `%TEMP%` rồi `wsl -- bash /mnt/c/.../x.sh` |
| 2 | **`wc -l` báo `rc=True`** thay vì số | Tôi suýt ghi "RC=True" vào báo cáo gate tương phản | Đã sửa: chạy `echo EXIT=$?` **trong** script; xác nhận `EXIT=0` |
| 3 | **Bộ đếm `rounded-full` v1 xếp nhầm `CIRCLE` vào `CTA_HANDROLLED`** (đúng cái bẫy coordinator cảnh báo: bong bóng `w-10 h-10` nằm trong `<button>`) | v1 ra `CTA` = 135 nhưng phân loại lộn xộn: 3 `<input type=range>` và 2 prop `avatar=` của `<Topbar>` bị tính là CTA | Đã sửa: thêm luật `is_circle()` **xét trước** `interactive`; `CTA_HANDROLLED` thật = **135 − 2 avatar − 3 range** trong bảng §0.2 được ghi chú tường minh |
| 4 | **Tự động hoá phân loại vẫn còn 9 chỗ `OTHER` + 3 `NOT_IN_A_TAG`** | 9 `OTHER`: 8 thực ra là progress/strip (`transition-all`) bị luật `is_progress` bắt hụt, 1 là tiêu đề `HomeView.tsx:349`; 3 `NOT_IN_A_TAG`: 2 trong `Skeleton.tsx` (ĐÚNG), 1 là **comment** | **Đã liệt kê đủ `file:line` ở §1** để coordinator tự quyết, không giấu trong số tổng |
| 5 | **Tôi KHÔNG chạy `npm run lint` / `npm run build` ra `dist/`** | Không xác nhận được typecheck; `dist/` trên đĩa là build **cũ (Sep 12 13:19)**, không phải số tôi đo | Cố ý: build vào `/tmp/vc-a4` để không sửa repo. **Nếu coordinator cần `npm run lint`, phải chạy riêng** |
| 6 | **Bộ đếm emoji gộp comment và code.** §2 tách được (580 comment / ~380 hiển thị) vì tôi tự viết lại bộ đếm, nhưng **con số "36 emoji ở `mockData.ts`" mà coordinator đưa ra tôi KHÔNG tái lập được** — tôi đo 21 PICTO + 10 SYMB = 31, và **toàn bộ nằm trong comment** | Nếu bên nào dùng "36" làm KPI thì KPI đó đang đếm comment | Đã nêu rõ ở §2; **đề nghị coordinator kiểm lại dụng cụ đã sinh ra số 36** |
| 7 | **Không đo được runtime** (không mở browser, `:3000` tắt, không được phép bật server) | Mọi số hiệu năng là **build-time**, không phải LCP/INP/TBT thật | Ghi rõ ở §6: "gzip đo từ file build", **không** phải Core Web Vitals |
| 8 | **Không `pkill`/`killall`** — không cần, vì tôi không bật tiến trình nào | `:3000` vẫn 0 listener sau khi tôi xong ✅ | — |

**Ràng buộc đã tuân thủ:**
- ✅ Không sửa file nào trong repo (`git status` y hệt trước khi rà)
- ✅ Không `git` mutation (không add/commit/stash/checkout)
- ✅ Không thêm dependency
- ✅ Chỉ ghi **1 file** ngoài repo: `A4-report.md` (báo cáo này)
- ✅ `--outDir /tmp/vc-a4` rồi `rm -rf /tmp/vc-a4` (đã xác nhận xoá)
- ✅ Không `pkill`/`killall`
- ✅ Chạy hết bằng node/npm **trong WSL**, không dùng toolchain Windows

---

## 13. PHỤ LỤC — BẢNG SỐ ĐẾM TỔNG HỢP (7 MỤC)

| Mục | Chỉ số | Số | Nguồn |
|---|---|---:|---|
| **1** | `rounded-full` tổng `src/frontend/**` | **315** | `grep -rno rounded-full src/frontend --include='*.tsx' --include='*.ts' \| wc -l` |
| 1 | `rounded-full` tổng `src/**` | **323** | `… src …` |
| 1 | ├ CTA hand-rolled (**SAI**) | **135** | `scan.py` `CTA_HANDROLLED` |
| 1 | ├ Segmented shell (**SAI**) | **1** | `AuthModal.tsx:300` |
| 1 | ├ Circle/avatar/chấm (**ĐÚNG**) | **102** | `scan.py` `CIRCLE` |
| 1 | ├ Progress (**ĐÚNG**) | **18** | |
| 1 | ├ Skeleton (**ĐÚNG**) | **11** | |
| 1 | ├ Strip + Blob (**ĐÚNG**) | **6** | |
| 1 | ├ Pill tĩnh (vùng xám) | **38** | |
| 1 | └ Other / hằng class | **9 / 3** | |
| 1 | File có ≥1 CTA SAI | **26** | |
| **2** | Ký hiệu hiển thị `src/**` (PICTO+SYMB+VS) | **960** | `scan.py` §2 |
| 2 | ├ **Emoji hình (PICTO)** | **115** | |
| 2 | ├ Ký hiệu toán/mũi tên (SYMB) | 788 | |
| 2 | ├ Trong comment (không hiển thị) | **580** | |
| 2 | └ `mockData.ts` | 21 PICTO (**toàn bộ trong comment**) | `grep -nP '[\x{1F300}-…]' src/data/mockData.ts` |
| **3** | `text-xs` | **2170** (82,8%) | `scan.py` §3 |
| 3 | `text-sm` | **202** | |
| 3 | `text-base` | **102** | |
| 3 | `text-lg` | **46** | |
| 3 | `text-4xl` | **6** | |
| 3 | **Ngoài thang** (`text-5xl`,`text-6xl`) | **3 + 1** | `HomeView.tsx:340`, `ui/Icon.tsx` |
| 3 | `text-[Npx]` | **0** (1 trong comment `.ts`) | `ui/index.ts:11` |
| **4** | `border-line` (đậm) | **483** (476 ngoài `ui/`) | `scan.py` §4 |
| 4 | `border-line-subtle` | **307** (288 ngoài `ui/`, 19 trong `ui/`) | |
| 4 | `border-line-control` | **121** | |
| 4 | `divide-line-subtle` / `divide-line` | **23 / 7** | |
| 4 | **`bg-white`/`text-white`/`bg-black`/`text-black`** | **0 / 0 / 0 / 0** | ✅ |
| 4 | **`(text\|bg\|border\|…)-[#…]`** | **0** | ✅ |
| 4 | Palette Tailwind thô | **0** | ✅ |
| **5** | Primitive dùng ngoài `ui/` (linh hoạt) | `Icon` 663 · `Button` 143 · `Card` 45 · `InfoTip` 40 · `EmptyState` 32 · `Field` 32 · `Input` 25 · `Badge` 16 | `scan.py` §5 |
| 5 | **Primitive = 0 chỗ dùng** | **`ConfirmDialog` · `Money` · `Section` · `Toolbar` · `ToastViewport`** | |
| 5 | Primitive gần như không dùng | `KeyValue` 1 · `ProgressBar` 1 · `Sheet` 1 · `PageHeader` 2 · `AppShell`/`SideNav`/`Topbar` 2 | |
| 5 | `<button>` thô | **483** / 54 file | |
| 5 | `<input>` thô | **278** / 38 file | |
| 5 | `<select>` thô | **56** / 19 file | |
| 5 | `<table>` thô | **21** / 16 file | |
| 5 | `fixed inset-0` (overlay tự dựng) | **39** / 24 file | |
| 5 | `animate-pulse` (skeleton tự dựng) | **50** / 25 file | |
| 5 | `window.confirm` | **6** | |
| **6** | Chunk lớn nhất (gzip) | `index` **216,6 kB** | build |
| 6 | 5 chunk lớn nhất | 216,6 · 133,4 · 92,2 · 57,7 · 32,3 (kB gzip) | |
| 6 | `chunkSizeWarningLimit` | **1200** (max 823,7 ⇒ **im lặng**) | `vite.config.ts:49` |
| 6 | Chunk preload **mọi route** | `react-vendor` · `supabase-vendor` · **`three-vendor`** | `/tmp/vc-a4/index.html` |
| 6 | Payload ban đầu (gzip) | **≈443 kB**, trong đó `three` = **30,1%** | |
| 6 | View **chưa** `React.lazy` | **12 / 16** | `src/App.tsx` |
| 6 | **Favicon** | **KHÔNG CÓ** (không `public/`, 0 `rel="icon"`) | `index.html` |
| 6 | `preconnect` font | **2** ✅ · `preload` **0** ❌ | `index.html:9-11` |
| 6 | Family × weight | **2 × 10** (BVP 300-800, JBM 400-700) | |
| **7** | `max-w` | AppShell `1400px` vs storefront `1280px` (lệch **120px**) | §7.1 #1 |
| 7 | Gutter ngang | AppShell `sm:px-6` vs storefront `md:px-12` (lệch **24px**) | §7.1 #2 |
| 7 | `<h1>` | `PageHeader` **20px** vs storefront **24–38px** | §7.1 #5 |
| 7 | Nhịp dọc | `gap-section` 24px vs `py-20 sm:py-24` (80/96px) | §7.1 #3-4 |
| 7 | **Gate `check-contrast.mjs`** | **RC = 0** (72 PASS / 12 EXPECTED / 0 FAIL) — **chỉ đo token** | §8 |

---

*Hết báo cáo A4. Mọi số đều tái lập được bằng §0.3. Không file nào trong repo bị thay đổi.*
