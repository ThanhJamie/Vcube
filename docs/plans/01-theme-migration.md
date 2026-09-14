# 01 — Phân tích chuyển đổi UI theme (light-first → dual-theme token)

> Trả lời câu hỏi: **convert UI theme sang như thế nào**, theo thứ tự nào, kiểm chứng ra sao, rủi ro ở đâu.
> Số liệu là số đo thật trên repo (lệnh tái lập ghi kèm). Spec token đầy đủ ở `docs/design/tokens.md`.

---

## 1. Hiện trạng đo được

| Hạng mục | Số đo | Lệnh tái lập |
|---|---|---|
| Hex cứng trong `className` (dạng `[#00687A]`) | **5.307** | `grep -rhoE '\[#[0-9a-fA-F]+' src --include='*.tsx' \| wc -l` |
| Hex thô toàn `src` | **5.569** | `grep -rhoE '#[0-9a-fA-F]{6}' src \| wc -l` |
| Utility tuỳ ý trong ngoặc vuông | **6.645** | `grep -rhoE '\[[^]]+\]' src --include='*.tsx' \| wc -l` |
| `[Npx]` tuỳ ý | **1.350** | `grep -rhoE '\[[0-9]+px\]' src --include='*.tsx' \| wc -l` |
| File dùng `dark:` | **0** | `grep -rl 'dark:' src --include='*.tsx' \| wc -l` |
| Khai báo `@theme` (token Tailwind v4) | **0** | `grep -rn '@theme' src/index.css` |
| `text-[Npx]` với N < 12 | **1.238** (`[10px]` 674, `[11px]` 429, `[9px]` 124) | `grep -rhoE 'text-\[[0-9]+px\]' src --include='*.tsx' \| sort \| uniq -c` |
| Bậc bo góc | 6 (`rounded` 530, `rounded-lg` 491, `rounded-xl` 665, `rounded-2xl` 207, `rounded-full` 259, `rounded-md` 51) + giá trị **không tồn tại** trong Tailwind (`w-88`, `w-18`, `h-13`, `scale-102`) | `grep -rhoE 'rounded(-[a-z0-9]+)?' src --include='*.tsx' \| sort \| uniq -c` |
| Bậc shadow | 7 (`2xs` 130, `xs` 304, `sm` 101, `md` 62, `lg` 29, `xl` 24, `2xl` 47) | như trên với `shadow` |
| Công thức nút "primary" | 3 (`CartView.tsx:444`, `HomeView.tsx:254`, `ProductDetailView.tsx:697`) | đọc 3 chỗ |
| Sắc xám cho vai trò "muted text" | **9** (`#64748B`, `#94A3B8`, `#8590A6`, `#545F73`, `#7D7565`, `#8C857B`, `#A69C8A`, `#BCC7DE`, `#D8E3FB`) | đếm theo hex |
| Bảng màu thứ hai ("editorial") | 6 (`#F7F6F2`, `#1C1C1C`, `#D5CFC5`, `#7D7565`, `#A69C8A`, `#E0DDD5`) trong `ChatSupportModal`, `AssetLibraryView`, header catalog `HomeView` | `grep -rn '#F7F6F2\|#1C1C1C' src --include='*.tsx'` |
| Font nạp từ Google | 4 (`Be Vietnam Pro`, `Inter`, `JetBrains Mono`, `Material Symbols`) | `index.html` |
| Hệ icon | Material Symbols **696 usage / 69 file** vs `lucide-react` **16 file** | `grep -rho 'material-symbols-outlined' src --include='*.tsx' \| wc -l` |
| `src/index.css` | 321 dòng: 3 biến font + 6 biến fluid type + vài helper; **không có** token màu/radius/shadow/z | đọc file |
| `--font-serif` | trỏ `'Be Vietnam Pro', 'Inter', Georgia, serif` → `font-serif` render ra **sans** | `src/index.css:6` |

**Palette thực tế (không được khai báo ở đâu):** teal `#00687A` (hover `#005260`, gradient `#0E7490`), navy `#091426`, canvas `#F8FAFC`, alt `#F8F9FF`, border `#CBD5E1`, hairline `#E2E8F0`/`#F1F5F9`, accent cyan `#57DFFE`, dark surface `#1E293B`.

**Kết luận:** app light-only, không có nguồn sự thật cho màu/typography/spacing. Mọi thay đổi thị giác hiện phải sửa từng chỗ, không thể đổi theme, không kiểm soát được tương phản, và mỗi file mới lại sinh hex mới.

---

## 2. Nguyên tắc: tách "token hoá" khỏi "redesign"

Big-bang rewrite là sai lầm ở đây: 91 file TSX, 5.307 chỗ hex, **0 test tự động** → diff không review được, không rollback được. Chia 5 stage:

| Stage | Tên | Thay đổi thị giác | Cách kiểm chứng |
|---|---|---|---|
| **A** | Token hoá | **0 pixel đổi** | Tập giá trị màu trong CSS build ra phải **giống hệt** trước/sau |
| **B** | Hợp nhất (9 xám→2, 7 shadow→4, 6 radius→4, sàn 12px) | nhỏ, có chủ đích | Review theo file + `node scripts/check-contrast.mjs` |
| **C** | Dual theme (dark cho `/quote`, `/admin`, `/lab`, `/designer`) | lớn nhưng chỉ 4 nhóm route | Contrast gate + screenshot từng route |
| **D** | Primitive + polish (Button/Modal/DataTable/Field…) | trung bình | `docs/design/qa-checklist.md` |
| **E** | Dọn global (bỏ font/icon thừa, CSS chết) | 0 | `grep` usage = 0 |

**Mấu chốt về thứ tự:** làm Stage A trước thì Stage C gần như **miễn phí** — component đã dùng token semantic nên đổi theme chỉ là đổi giá trị biến trong `.dark`. Làm theme trước khi token hoá thì phải sửa tay 91 file **hai lần**.

---

## 3. Stage A — Token hoá không đổi pixel

### 3.1 Token contract (đặt tên theo vai trò, không theo màu)

`--color-primary` chứ không `--color-teal` — để Stage C chỉ cần đổi giá trị.

| Token | Vai trò | Light (giữ nguyên palette hiện tại) |
|---|---|---|
| `--color-canvas` | nền trang | `#F8FAFC` |
| `--color-surface` | card, panel | `#FFFFFF` |
| `--color-surface-muted` | nền phụ (header, dải xen kẽ) | `#F8F9FF` |
| `--color-surface-inverse` | panel "HUD" tối giữa trang light | `#091426` |
| `--color-surface-inverse-raised` | panel tối nổi | `#1E293B` |
| `--color-line` | viền/đường phân cách | `#CBD5E1` |
| `--color-line-subtle` | hairline | `#E2E8F0` |
| `--color-line-control` | viền control (input/select) — cần ≥3:1 | `#8590A6` (**mới**, xem 3.3) |
| `--color-fg` | chữ chính | `#091426` |
| `--color-fg-muted` | chữ phụ | `#545F73` |
| `--color-fg-subtle` | chữ mờ, placeholder, metadata | `#64748B` |
| `--color-primary` / `-hover` / `-fg` | nút & link chính | `#00687A` / `#005260` / `#FFFFFF` |
| `--color-accent` | nhấn kỹ thuật (cyan) | `#57DFFE` |
| `--color-positive` / `-warning` / `-danger` / `-info` | trạng thái | `#15803D` / `#B45309` / `#B91C1C` / `#1D4ED8` |
| `--color-ring` | focus ring | `#00687A` |

### 3.2 Bảng map cho codemod (các màu chiếm ~95% usage)

`scripts/codemod-tokens.mjs` dùng đúng bảng này, khớp literal dài trước, **từ chối** mọi giá trị không có trong bảng (ghi report để xử lý tay):

| Hex hiện tại | Token | Ví dụ trước → sau |
|---|---|---|
| `#00687A` | primary | `text-[#00687A]` → `text-primary`; `bg-[#00687A]` → `bg-primary`; `border-[#00687A]/40` → `border-primary/40` |
| `#005260` | primary-hover | `hover:bg-[#005260]` → `hover:bg-primary-hover` |
| `#57DFFE` | accent | `text-[#57DFFE]` → `text-accent` |
| `#091426` | **fg hoặc surface-inverse** | quyết định theo tiền tố: `text-` → `text-fg`; `bg-` → `bg-surface-inverse`; `border-` → `border-line` |
| `#1E293B` | surface-inverse-raised | `bg-[#1E293B]` → `bg-surface-inverse-raised` |
| `#F8FAFC` | canvas | `bg-[#F8FAFC]` → `bg-canvas` |
| `#F8F9FF` | surface-muted | `bg-[#F8F9FF]` → `bg-surface-muted` |
| `#FFFFFF`/`#fff` | surface | `bg-[#FFFFFF]` → `bg-surface` |
| `#CBD5E1` | line | `border-[#CBD5E1]` → `border-line` |
| `#E2E8F0`, `#F1F5F9` | line-subtle | → `border-line-subtle` |
| `#94A3B8`, `#8590A6` | fg-subtle khi là `text-`/`placeholder-`; line-control khi là `border-` | `placeholder-[#94A3B8]` → `placeholder-fg-subtle` |
| `#64748B` | fg-subtle | `text-[#64748B]` → `text-fg-subtle` |
| `#545F73`, `#7D7565`, `#8C857B`, `#A69C8A` | fg-muted / fg-subtle | gộp ở Stage B |
| `#D97706` | warning-strong (sao đánh giá) | → `text-warning-strong` |
| `#E11D48`, `#B91C1C`, `#DC2626` | danger | → `text-danger` |
| `#16A34A`, `#15803D`, `#059669` | positive | → `text-positive` |
| `#F7F6F2`, `#1C1C1C`, `#D5CFC5`, `#E0DDD5` | bảng editorial → token storefront | xử lý Stage B |
| `#0E7490` | gradient stop | chỉ 1 chỗ (`HomeView.tsx:254`) → xử lý tay |

### 3.3 Sửa lỗi tương phản ngay trong Stage A

Đo thật bằng `node scripts/check-contrast.mjs` (đã thêm vào repo):

| Cặp | Tỷ lệ | Yêu cầu | Kết luận |
|---|---|---|---|
| `#94A3B8` / `#FFFFFF` (placeholder hiện tại) | **2.56** | 4.5 | **FAIL** → thay `#64748B` |
| `#94A3B8` / `#F8FAFC` | **2.45** | 4.5 | **FAIL** → thay `#64748B` |
| `#8590A6` / `#FFFFFF` | 3.21 | 4.5 | FAIL với chữ → **chỉ dùng làm viền control** |
| `#7B8794` / `#FFFFFF` | 3.66 | 4.5 | FAIL với chữ, đạt làm viền |
| `#6B7280` / `#FFFFFF` | 4.83 | 4.5 | PASS (dự phòng) |
| `#64748B` / `#FFFFFF` | **4.76** | 4.5 | PASS ✓ → `fg-subtle` |
| `#64748B` / `#F8FAFC` | **4.55** | 4.5 | PASS ✓ |
| `#545F73` / `#F8FAFC` | **6.15** | 4.5 | PASS ✓ → `fg-muted` |
| `#CBD5E1` / `#F8FAFC` | 1.42 | 3.0 | FAIL — **được phép**: viền trang trí, không phải viền control (WCAG 1.4.11 chỉ áp cho thành phần UI cần nhận diện) |
| `#8590A6` / `#FFFFFF` (viền control) | **3.21** | 3.0 | PASS ✓ → `line-control` |
| `#00687A` / `#F8FAFC` | 6.15 | 4.5 | PASS ✓ |
| `#FFFFFF` trên `#00687A` | 6.44 | 4.5 | PASS ✓ |
| `#57DFFE` / `#091426` | 11.75 | 4.5 | PASS ✓ |

→ **Xoá `#94A3B8` khỏi vai trò chữ** (đang là placeholder ở nhiều form + metadata), thay `#64748B`. Thay đổi nhỏ nhưng bắt buộc để đạt AA.

### 3.4 Codemod: thiết kế & kiểm chứng

`scripts/codemod-tokens.mjs`, chạy theo từng thư mục:

1. `--dry-run` sinh `docs/plans/token-codemod-report.md`: số thay thế theo token + **danh sách hex không map được** kèm `file:line`.
2. Khớp chỉ trong `className`/`class` của TSX; hỗ trợ biến thể (`hover:`, `focus:`, `active:`, `group-hover:`, `placeholder-`, `selection:`) và opacity modifier (`/40`).
3. **Không đụng** hex trong `.ts` — đặc biệt `new THREE.Color(0x...)` và `stencilMatBackRef`/`stencilMatFrontRef`/`capMaterialRef` (`ModelViewer3D.tsx:143-180`). Xem rủi ro 8.2.
4. Sau mỗi thư mục: `npm run lint` + `npm run build`, rồi:

```
node scripts/verify-tokens-unchanged.mjs <dist-css-truoc> <dist-css-sau>
```

Script trích tập `#rrggbb` từ CSS build ra và **fail nếu tập khác nhau** → bằng chứng "0 pixel đổi" mà không cần browser.
5. Commit theo thư mục để revert cục bộ.

---

## 4. Stage B — Hợp nhất (thay đổi có chủ đích)

1. **9 xám → 2:** `fg-muted #545F73` (6.15:1), `fg-subtle #64748B` (4.76:1). Xoá `#94A3B8`, `#8590A6`, `#7D7565`, `#8C857B`, `#A69C8A`, `#BCC7DE`, `#D8E3FB` khỏi vai trò chữ.
2. **Loại bỏ bảng "editorial" thứ hai** (ChatSupportModal vuông góc không `rounded-*`, AssetLibraryView, header catalog HomeView) → token storefront.
3. **Radius 6 → 4:** `sm 6px` (badge nhỏ), `md 8px` (input/button), `lg 12px` (card/panel/viewport 3D), `full`. Sửa giá trị không tồn tại (`w-88`, `w-18`, `h-13`, `scale-102`) — hiện Tailwind **bỏ qua im lặng** nên các class này không có tác dụng; sửa = thêm tác dụng → review từng file.

   > ⚠️ **ĐÍNH CHÍNH (A2e, 2026-09-12) — câu trên SAI với Tailwind v4.** Đã đo trên CSS build thật:
   > `.w-13{width:calc(var(--spacing) * 13)}`, `.w-18`, `.w-88`, `.h-13`, `.h-18`, `.scale-102{--tw-scale-x:102%}`
   > **đều tồn tại** — Tailwind v4 **sinh giá trị số động**, không còn phải khai báo trước như v3.
   > ⇒ Các class này **đang có tác dụng**; đổi chúng sẽ **đổi layout vô cớ**. A2e đã **cố ý không sửa**. Không còn việc nào ở đây.
4. **Shadow 7 → 4 theo vai trò:** `e0` phẳng (card có viền), `e1` nổi nhẹ (dropdown), `e2` overlay (popover/tooltip), `e3` modal. Không dùng shadow làm tín hiệu duy nhất.
5. **Typography sàn 12px.** Scale 6 bậc: `caption 12 / sm 13 / base 14 / heading 18 / title 24 / display (fluid)`. Xoá 1.238 khai báo <12px → chuyển thành 12px và **giảm số nhãn** thay vì thu nhỏ chữ. `tabular-nums` cho mọi cột số (giá, kích thước, khối lượng).
6. **Button 3 → 1 primitive**, 3 biến thể (`primary` solid, `secondary` viền, `ghost`). Bỏ gradient khỏi nút thường. Thêm `focus-visible` ring 2px (hiện `focus-visible` xuất hiện 2 lần và cả 2 lần là **xoá** dấu focus).
7. **Z-index scale:** `sticky 10 / panel 20 / header 30 / drawer 40 / modal 50 / toast 60`. Hiện `z-40` dùng cho cả header, FAB hỗ trợ và sticky bar sản phẩm → chồng nhau trên mobile (FAB phủ nội dung ở `ExploreView`, `OrderSuccessView`, `MyOrdersView`).

---

## 5. Stage C — Dual theme

### 5.1 Cơ chế

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-canvas: #F8FAFC;
  --color-surface: #FFFFFF;
  /* ... toàn bộ token light ở 3.1 */
}

.dark {
  --color-canvas: #080D16;
  --color-surface: #0E1520;
  --color-surface-muted: #131C2A;
  --color-line: #232F42;
  --color-line-control: #4E6490;
  --color-fg: #E8EEF7;
  --color-fg-muted: #9BA9BE;
  --color-fg-subtle: #7A8798;
  --color-primary: #3AB8CE;
  --color-primary-hover: #57DFFE;
  --color-primary-fg: #07272E;
  --color-accent: #57DFFE;
  --color-ring: #57DFFE;
}
```

Vì token là biến CSS, **component viết bằng token tự đúng theme** — không phải viết `dark:` từng class. Chỉ gradient, chart và màu vẽ trong canvas mới cần `dark:` tường minh.

### 5.2 Route nào dark, route nào light

| Nhóm route | Theme | Lý do |
|---|---|---|
| Storefront: `/`, `/explore`, `/products/*`, `/personalize`, `/cart`, `/checkout`, `/order-success*`, `/tracking*`, `/orders`, `/assets`, `/auth/*` | **light** | Thị trường tiêu dùng VN, giữ liên tục nhận diện; trang thương mại sáng đọc tốt hơn |
| `/quote`, `/admin/*`, `/lab/*`, `/designer/*` | **dark** | Phiên dài, dữ liệu dày; viewport WebGL nổi khối tốt hơn trên nền tối |

Cơ chế: `ThemeProvider` set `.dark` trên `<html>` theo route family (`useLocation`), có override qua `localStorage['vcube_theme']` (`light | dark | auto`) — hữu ích cho support và người nhạy sáng.

### 5.3 Giá trị dark đã kiểm tương phản

| Cặp | Tỷ lệ | Yêu cầu | Kết luận |
|---|---|---|---|
| `#E8EEF7` / `#0E1520` | 15.70 | 4.5 | PASS |
| `#9BA9BE` / `#0E1520` | 7.68 | 4.5 | PASS |
| `#7A8798` / `#0E1520` | 5.01 | 4.5 | PASS |
| `#3AB8CE` / `#0E1520` | 7.78 | 4.5 | PASS |
| `#57DFFE` / `#0E1520` | 11.68 | 4.5 | PASS |
| `#07272E` trên `#3AB8CE` | 6.67 | 4.5 | PASS |
| `#4E6490` / `#0E1520` (viền control) | 3.10 | 3.0 | PASS |
| `#28374D` / `#0E1520` (viền trang trí) | 1.52 | 3.0 | FAIL — chấp nhận (trang trí) |
| `#6E7A8A` / `#0E1520` | 4.20 | 4.5 | FAIL → **không dùng cho chữ** |

Luật dark bổ sung: không dùng `#000000`/`#FFFFFF` tuyệt đối; phân cấp surface bằng **viền**, không bằng độ sáng (đo được các surface tối chỉ lệch 1.04–1.25:1 → mắt không phân biệt nếu chỉ dựa luminance).

### 5.4 Xử lý riêng: ~15 panel "HUD tối" giữa trang light

Hiện hardcode `bg-[#091426]` ở ~15 chỗ (`HomeView.tsx:374`, `ProductDetailView.tsx:263`, thanh tổng tiền `QuoteSummaryPanel.tsx:453`…). Stage A biến chúng thành `bg-surface-inverse` + `text-on-inverse`: ở light vẫn là panel tối (đúng ý đồ industrial HUD), ở dark hoà vào surface. Đây là lý do phải tách `surface-inverse` **riêng** khỏi `fg`.

---

## 6. Stage D — Primitive & polish

Chi tiết ở `docs/plans/07-execution-phases.md`. Primitive chặn các phase sau: `Modal` (`<dialog>` + `showModal()` → có top-layer + inert + focus trap của nền tảng), `Sheet` (bottom sheet mobile), `Field` (`htmlFor` + `aria-describedby` + `aria-invalid`), `DataTable` (density 32/40/48, sticky header, sort/filter/pagination/bulk), `ToastViewport` (`role="status"`, giữ severity + undo), `EmptyState`, `Skeleton`, `ProgressBar` (%, bytes, ETA, cancel), `Money`/`formatCurrency`.

---

## 7. Stage E — Dọn global

1. Xoá `<link>` Material Symbols sau khi usage = 0 (dùng `docs/design/icon-map.md`).
2. Xoá `Inter` khỏi `<link>` fonts (sans thật là Be Vietnam Pro; Inter không bao giờ tới).
3. Sửa hoặc xoá `--font-serif` (đang là sans stack → `font-serif` render sans).
4. Chuyển fluid type vào `@theme` (`--text-display`, `--text-title`…), bỏ class `.fluid-*` (hiện chỉ dùng 2 lần).
5. `index.html`: bỏ `class="light"` cứng (ThemeProvider quản), giữ `viewport-fit=cover`, không chặn zoom (`maximum-scale` ≥ 2).
6. CSS chết: `responsive-table-wrapper` **không được dùng** ở storefront (HomeView/ExploreView dùng `overflow-x-auto` thô) → áp dụng lại hoặc xoá.
7. Rà `--font-*` và `font-family` còn sót.

**Definition of done Stage E:** `grep -r 'material-symbols' src` = 0; `grep -r 'font-serif' src` = 0; `grep -c '\[#' src --include='*.tsx'` = 0; `node scripts/check-contrast.mjs` exit 0.

---

## 8. Rủi ro & cách chặn

| # | Rủi ro | Mức | Cách chặn |
|---|---|---|---|
| 8.1 | Codemod map sai (`#091426` là chữ chỗ này, là nền chỗ khác) | Cao | Quyết định theo tiền tố (`bg-`→surface-inverse, `text-`→fg, `border-`→line); report liệt kê case mơ hồ để review tay; verify tập màu CSS không đổi |
| 8.2 | **Màu trong Three.js không nằm trong `className`** (`ModelViewer3D.tsx:143-180`, `0x...`) | Cao | Tạo `src/frontend/theme/tokens.ts` là nguồn duy nhất cho màu dùng trong JS (đọc CSS variable runtime qua `getComputedStyle`), viewer lấy màu qua module này; có test so khớp với CSS |
| 8.3 | Grid/axes/bbox của viewer không đổi theo theme → chói hoặc vô hình trên dark | Trung bình | Grid/bbox lấy màu từ token (`line-subtle`, `accent`); subscribe đổi theme rồi set lại material color |
| 8.4 | ~~Tailwind class không tồn tại đang bị bỏ qua im lặng~~ → **RỦI RO NÀY KHÔNG TỒN TẠI** | — | **ĐÍNH CHÍNH (A2e, 2026-09-12):** Tailwind v4 sinh giá trị số động ⇒ `w-13`/`w-18`/`w-88`/`h-13`/`h-18`/`scale-102` **có thật trong CSS build** (đã đo bằng byte). Không được đổi chúng — làm vậy là **đổi layout vô cớ**. Cách chặn cũ (thay giá trị hợp lệ) **bị huỷ** |
| 8.5 | Tương phản tụt ở nhánh dark | Trung bình | `scripts/check-contrast.mjs` là gate bắt buộc; mở rộng script cho token mới |
| 8.6 | Stage B đổi thị giác 91 file trong 1 commit | Trung bình | Mỗi file 1 commit, gate lint+build; ưu tiên file nhiều hex nhất (`DesignerDashboardView` 404, `PricingConfigPanel` 360, `HomeView` 281) |
| 8.7 | Xoá Material Symbols khi còn usage → icon thành chữ | Trung bình | Chỉ xoá khi `grep -rho 'material-symbols-outlined' src` = 0 |

---

## 9. Thứ tự thực thi

```
Stage A  token hoá, 0 pixel đổi
         scripts/codemod-tokens.mjs + scripts/verify-tokens-unchanged.mjs
         thứ tự thư mục: ui → components → views → admin (lint+build sau mỗi bước)
Stage B  hợp nhất: xám, radius, shadow, type, button, z
Stage C  dual theme + dark cho /quote, /admin, /lab, /designer (+ tokens.ts cho màu trong JS)
Stage D  primitives + chuyển trang sang primitive
Stage E  dọn global + gate cuối
```

Mỗi stage một nhánh commit riêng, revert độc lập. Không stage nào được làm đỏ `npm run lint` / `npm run build`.

---

## 10. Phụ lục — chuyển icon Material Symbols → lucide (số đo thật)

Chi tiết bảng map đầy đủ ở `docs/design/icon-map.md`. Số đo trên source:

| Mục | Giá trị |
|---|---|
| Số điểm render `<span className="material-symbols-outlined">` | **696** trong **69** file `.tsx` |
| Số glyph khác nhau | **213** (không phải vài chục như ước lượng ban đầu) |
| Có tương đương lucide trực tiếp | **208 / 213 (97,7%)** — đã kiểm tên export thật trong `lucide-react@0.546.0` |
| Cần tự viết/ghép | **5**: `add_shopping_cart`, `remove_shopping_cart`, `cloud_sync`, `lock_reset`, `square_foot` |
| Glyph dùng nhiều nhất | `close` (51), `precision_manufacturing` (39), `verified` (25), `view_in_ar` (19), `check_circle` (18) |
| File cần migrate trước | `AuthModal` (35), `HomeView` (35), `Group5ProductionPanel` (34), `PricingConfigPanel` (29), `ExploreView` (29) |

**Ba cái bẫy phải xử lý trong cùng thay đổi:**
1. **Class `text-*` trên icon hiện KHÔNG có tác dụng.** `src/index.css:260` đặt `.material-symbols-outlined { font-size: 24px }` ở tầng không layer, còn utility Tailwind nằm trong `@layer utilities` → rule không layer thắng, nên **mọi icon hiện đang vẽ ở 24px** bất kể class `text-*`. Sau khi chuyển sang `<Icon size={n} />`, kích thước trở thành thật → **phần lớn icon sẽ nhỏ đi**. Phải migrate **từng file** và xem lại màn hình, không làm 1 lần toàn repo.
2. **12 chỗ icon là dữ liệu, không phải JSX:** các field `.icon` dạng chuỗi trong `mockData.ts`, `useProductionStore.ts`, `Header.tsx`, `AdminSidebar.tsx`, `AdminUsersPanel.tsx`, `OrderProgress.tsx`, `AdminDashboardView.tsx`, `DesignerDashboardView.tsx`, `PersonalizeView.tsx`, `Group5ProductionPanel.tsx` → phải đổi thành **tham chiếu component** (không phải string), nếu không sẽ sót.
3. **Bug trạng thái bookmark:** code truyền class `fill-1` nhưng CSS định nghĩa `.material-symbols-outlined.fill` (không phải `fill-1`) → trạng thái "đã lưu" **chưa bao giờ hiển thị**. Khi migrate dùng một `Bookmark` với `fill={isBookmarked ? 'currentColor' : 'none'}`.

**Dọn kèm:** `index.html:11` (link font Material Symbols) và `src/index.css:260-279`; 17 điểm trong `src/app/**` là cây Next chết (xoá ở Phase 1 nên không cần migrate).
