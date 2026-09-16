> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# Báo cáo Stage B — Agent A2e (hợp nhất token, thay đổi thị giác có chủ đích)

> Đợt 4, phần còn lại của Phase 2. Đề bài: `docs/plans/01-theme-migration.md` §4 (7 mục) + KPI DoD #5.
> Baseline (đo trước khi sửa): `hex trong className="…"` **706** · `text-[Npx]` N<12 **1.065** ·
> 83 hex khác nhau còn lại trong class string (830 chỗ) · radius 6 bậc + `rounded-none` · shadow 7 bậc · z-index 5 giá trị.
> Gate cuối: `npm run lint` RC=0 · `vite build` RC=0 · `check-contrast` RC=0 · `verify-tokens-unchanged` **ADDED 0 / REMOVED 79** (có chủ đích, bảng ở §3.3).

---

## 1. Tóm tắt theo mức ưu tiên

| P | Việc | Trạng thái | Số chỗ | File |
|---|---|---|---|---|
| **P1** | Sàn chữ 12px (`text-[8/9/10/11px]` → `text-xs`) | ✅ xong | **1.068** | 58 |
| **P2** | Hợp nhất màu 83 hex → token (codemod `--stage-b` + sửa tay) | ✅ xong | **850** | 48 |
| **P3** | Radius 6→4 · shadow 7→4 · z-index theo vai trò | ✅ xong | radius **1.192** · shadow **609** · z **82** | 60 |
| **P4** | Button 3→1 primitive · 8 control icon-only · `icon-map.md` | ⚠️ một phần (xem §5) | 8 nút + 7 nút | 7 |
| **P5** | (chủ dự án giao thêm) Tạm ẩn "Quên mật khẩu?" | ✅ xong | 3 điểm vào | 2 |
| | **Tổng file `.tsx` bị sửa** | | | **62** |

Tổng thay thế tự động qua codemod: **819** (step1 288 · step2 217 · step3 305 · step4 9) + sửa tay.
`0` thay đổi ở `src/frontend/ui/**`, `src/backend/**`, `supabase/**`, `vite.config.ts`, và **mọi file `.ts`**.

---

## 2. P1 — Sàn chữ 12px (KPI DoD #5)

`text-[Npx]` → bậc thang chính thức của Tailwind v4 (KHÔNG khai báo `--text-*` trong `@theme`, vì
việc đó sẽ ghi đè mặc định `text-sm`/`text-base` của toàn app — xem ghi chú ở `src/index.css`):

| Cũ | Mới | Số chỗ |
|---|---|---:|
| `text-[8px]` | `text-xs` (12px) | 11 |
| `text-[9px]` | `text-xs` | 116 |
| `text-[10px]` | `text-xs` | 585 |
| `text-[11px]` | `text-xs` | 353 |
| `text-[13px]` | `text-sm` (14px) | 2 |
| `text-[26px]` | `text-2xl` (24px) | 1 |
| | **Tổng** | **1.068** |

**Chứng minh:** `grep -rEo 'text-\[([0-9]|1[01])px\]' src --include='*.tsx' | wc -l` → **0**.

**Lệch so với `01` §4.5 (có lý do):** đề bài gợi ý "giảm số nhãn thay vì thu nhỏ chữ" cho các cụm có
nhãn phụ. Việc **xoá/gộp nhãn là đổi cấu trúc JSX**, mà ràng buộc #2 của đợt này cấm ("Không đổi logic,
không đổi cấu trúc JSX ngoài phần style"). Nên tôi chỉ nâng cỡ chữ và **báo lại danh sách cụm rủi ro**
để A0 quyết định gộp nhãn (§6). KPI thì đã đạt 0.

---

## 3. P2 — Hợp nhất màu

### 3.1 Cách làm

Mở rộng `scripts/codemod-tokens.mjs` bằng một bảng map **riêng, tách biệt, bật bằng cờ `--stage-b`**
(`STAGE_B_MAP`) — mặc định TẮT nên hành vi Stage A không đổi; bảng Stage A giữ nguyên. Bảng Stage B cho
phép token kèm hậu tố opacity (`primary/10`) vì `resolveToken` ghép `prefix + '-' + token + opacity`.

Chạy theo đúng thứ tự thư mục của `01` §9, gate `lint` + `build` sau **mỗi** bước:
`components` (trừ `admin`) 288 chỗ → `views` 217 → `components/admin` 305 → `App.tsx` 9. Reject 0.

Sau codemod, **sửa tay** 3 nhóm mà codemod không được phép đụng (§B.4 của A2d, 18 chuỗi class trong
biến/data object) + 3 chỗ có hậu tố opacity đè lên token đã mang opacity:

- `RegisterView.tsx:38–60` — `labelClass`/`bar1..3` trong object trả về của `getPasswordStrength`.
- `UserAvatarMenu.tsx:83–118` — bảng theme theo vai trò (`bgGradient`/`badgeClass`/`avatarBg`).
- `MyOrdersView.tsx:109–110` — `bg`/`dot` của nhãn trạng thái đơn.
- `DesignerDashboardView.tsx:394,495,738` · `CartDrawer.tsx:127` — hậu tố `/70`, `/40`, `/60` (nếu để
  codemod map sẽ sinh class 2 tầng vô hiệu, ví dụ `bg-primary/10/70`).
- Cặp vàng-kim/đỏ-đậm ở badge "HOT" (`ExploreView.tsx:334,787`, `HomeView.tsx:633,702`): map thẳng
  sang token sẽ ra `#D97706` trên `#B91C1C` = **2,05:1 (FAIL)** → đổi sang cặp đạt AA
  (`bg-warning-strong` + `text-surface-inverse` = 6,26:1 ; `bg-danger` + `text-primary-fg` = 5,90:1).

**Chứng minh:** `grep -rho 'className="[^"]*"' src --include='*.tsx' | grep -o '#[0-9a-fA-F]\{3,8\}' | wc -l` → **0**;
`grep -rhoE '\[#[0-9a-fA-F]{3,8}\]' src --include='*.tsx'` → **0**; `… src --include='*.ts'` → **0**.

### 3.2 Bảng màu đã gộp (83 hex khác nhau, 850 dòng màu)

Nguồn dữ liệu: dump toàn bộ điểm hex **trước** Stage B (`/tmp/a2e-remaining.txt`, 850 dòng) đối chiếu
bảng `STAGE_B_MAP`. Cột "Token đích" theo **vai trò của tiền tố** (`text-` → chữ, `bg-`/`from-`/`via-`/`to-` →
surface, `border-`/`divide-`/`ring-` → viền).

| Hex cũ | Số chỗ | Tiền tố → vai trò | Token đích |
|---|---:|---|---|
| `#c5c6cd` | 258 | `border-` | `line` |
| `#1c1c1c` | 74 | `text-` | `fg` |
| `#7d7565` | 52 | `text-` | `fg-muted` |
| `#475569` | 37 | `text-` | `fg-muted` |
| `#1e293b` | 34 | `text-` | `fg` |
| `#5a554c` | 28 | `text-` | `fg-muted` |
| `#334155` | 27 | `text-` | `fg-muted` |
| `#f7f6f2` | 25 | `bg-` | `surface-muted` |
| `#0f172a` | 20 | `text-` | `fg` |
| `#005463` | 17 | `bg-` | `primary-hover` |
| `#1e293b` | 17 | `border-` | `surface-inverse-raised` |
| `#334155` | 17 | `border-` | `surface-inverse-raised` |
| `#eff4ff` | 17 | `bg-` | `primary/10` |
| `#dce9ff` | 10 | `bg-` | `primary/10` |
| `#004e5c` | 9 | `bg-` | `primary-hover` |
| `#0b1c30` | 9 | `text-` | `fg` |
| `#1c1c1c` | 9 | `bg-` | `surface-inverse` |
| `#e5eeff` | 9 | `divide-` | `line-subtle` |
| `#faf9f5` | 9 | `bg-` | `surface-muted` |
| `#eae8e0` | 8 | `bg-` | `line-subtle` |
| `#00515f` | 7 | `bg-` | `primary-hover` |
| `#0e7490` | 7 | `to-` | `primary-hover` |
| `#e5eeff` | 7 | `bg-` | `primary/10` |
| `#75777d` | 6 | `text-` | `fg-subtle` |
| `#990000` | 6 | `text-` | `danger` |
| `#085f75` | 5 | `to-` | `primary-hover` |
| `#e5eeff` | 5 | `border-` | `line-subtle` |
| `#091426` | 4 | `to-` | `surface-inverse` |
| `#0b1c30` | 4 | `bg-` | `surface-inverse` |
| `#5f6368` | 4 | `text-` | `fg-muted` |
| `#664d03` | 4 | `text-` | `warning` |
| `#990000` | 4 | `bg-` | `danger` |
| `#f4f6f9` | 4 | `bg-` | `surface-muted` |
| `#0f1d32` | 3 | `bg-` | `surface-inverse-raised` |
| `#166534` | 3 | `text-` | `positive` |
| `#1a0dab` | 3 | `text-` | `info` |
| `#333333` | 3 | `bg-` | `surface-inverse-raised` |
| `#334155` | 3 | `bg-` | `surface-inverse-raised` |
| `#c59b27` | 3 | `text-` | `warning-strong` |
| `#d8e3fb` | 3 | `bg-` | `primary/10` |
| `#00687a` | 2 | `text-` | `primary` |
| `#0284c7` | 2 | `to-` | `info` |
| `#0369a1` | 2 | `to-` | `info` |
| `#0f172a` | 2 | `bg-` | `surface-inverse` |
| `#1c1c1c` | 2 | `border-` | `surface-inverse` |
| `#1c2c45` | 2 | `bg-` | `surface-inverse-raised` |
| `#1e40af` | 2 | `text-` | `info` |
| `#202124` | 2 | `text-` | `fg` |
| `#4d5156` | 2 | `text-` | `fg-muted` |
| `#8c857b` | 2 | `text-` | `fg-subtle` |
| `#c5c6cd` | 2 | `bg-` | `line-subtle` |
| `#dcfce7` | 2 | `bg-` | `positive/10` |
| `#ffd700` | 2 | `bg-` | `warning-strong` |
| `#ffd700` | 2 | `text-` | `warning-strong` |
| `#fff8e6` | 2 | `bg-` | `warning/10` |
| `#001f26` | 1 | `text-` | ``(xử lý tay — data object)`` |
| `#004b87` | 1 | `text-` | `info` |
| `#004e5b` | 1 | `from-` | `primary-hover` |
| `#004e5c` | 1 | `text-` | `primary` |
| `#00687a` | 1 | `bg-` | `primary` |
| `#00879e` | 1 | `bg-` | `primary-hover` |
| `#00a8c6` | 1 | `text-` | `accent` |
| `#0284c7` | 1 | `via-` | `info` |
| `#060d1a` | 1 | `bg-` | `surface-inverse` |
| `#070f1e` | 1 | `bg-` | `surface-inverse` |
| `#10b981` | 1 | `border-` | `positive` |
| `#111111` | 1 | `bg-` | `surface-inverse` |
| `#11233b` | 1 | `via-` | `surface-inverse-raised` |
| `#131f33` | 1 | `bg-` | `surface-inverse-raised` |
| `#132238` | 1 | `bg-` | `surface-inverse-raised` |
| `#1c0a0a` | 1 | `bg-` | `danger` |
| `#1c1608` | 1 | `bg-` | `warning` |
| `#204060` | 1 | `text-` | `fg-muted` |
| `#4cd7f6` | 1 | `bg-` | ``(xử lý tay — data object)`` |
| `#57dffe` | 1 | `bg-` | `accent` |
| `#7a5b00` | 1 | `text-` | `warning` |
| `#8c857b` | 1 | `placeholder-` | `fg-subtle` |
| `#9a3412` | 1 | `text-` | `warning` |
| `#b8d5ff` | 1 | `border-` | `info/30` |
| `#ba1a1a` | 1 | `text-` | `danger` |
| `#ba1a1a` | 1 | `bg-` | `danger` |
| `#bbf7d0` | 1 | `border-` | `positive/30` |
| `#bfdbfe` | 1 | `border-` | `info/30` |
| `#c5c6cd` | 1 | `divide-` | `line` |
| `#d0e2ff` | 1 | `bg-` | `primary/20` |
| `#d3e4fe` | 1 | `bg-` | `primary/10` |
| `#d5cfc5` | 1 | `text-` | `fg-muted` |
| `#e0ddd5` | 1 | `bg-` | `line-subtle` |
| `#ea580c` | 1 | `text-` | `warning-strong` |
| `#ef4444` | 1 | `border-` | `danger` |
| `#eff6ff` | 1 | `bg-` | `info/10` |
| `#f0f7ff` | 1 | `bg-` | `info/10` |
| `#f59e0b` | 1 | `border-` | `warning` |
| `#f8f9fa` | 1 | `bg-` | `canvas` |
| `#fafafa` | 1 | `bg-` | `surface-muted` |
| `#fafbfd` | 1 | `bg-` | `canvas` |
| `#fca5a5` | 1 | `text-` | `primary-fg` |
| `#fde68a` | 1 | `text-` | `primary-fg` |
| `#fed7aa` | 1 | `border-` | `warning/30` |
| `#ffedd5` | 1 | `bg-` | `warning/10` |
| `#fffdf0` | 1 | `bg-` | `warning/10` |

### 3.3 Bảng màu bị MẤT khỏi CSS build (79) — kèm lý do

`node scripts/verify-tokens-unchanged.mjs /tmp/vc-css-before.css /tmp/vc-css-after.css`
→ **ADDED 0** (không sinh màu mới), **REMOVED 79**. Đây là Stage B nên mất màu là **có chủ đích**;
danh sách dưới đây là toàn bộ 79 màu, nhóm theo lý do.

| Nhóm lý do | Hex bị mất | Token thay thế |
|---|---|---|
| Xám bị **loại khỏi vai trò chữ** → `fg-muted` (#545F73, 6,15:1) | `#7d7565`, `#5a554c`, `#5f6368`, `#4d5156`, `#204060`, `#d5cfc5`, `#475569`, `#334155` | `text-` → `fg-muted` |
| Xám bị loại → `fg-subtle` (#64748B, 4,76:1) | `#8c857b`, `#75777d` | `text-`/`placeholder-` → `fg-subtle` |
| Mực/navy đậm → `fg` (chữ) · `surface-inverse` (nền tối) | `#0f172a`, `#0b1c30`, `#202124`, `#1c1c1c`, `#333333`, `#070f1e`, `#060d1a`, `#111111` | `text-` → `fg` ; `bg-` → `surface-inverse` |
| Navy nổi / **viền của panel tối** → `surface-inverse-raised` (#1E293B, 0 pixel đổi ở light) | `#11233b`, `#131f33`, `#132238`, `#1c2c45`, `#0f1d32` | `bg-`/`via-`/`border-` → `surface-inverse-raised` |
| **Bảng "editorial" thứ hai** + nền xám rất nhạt → token storefront | `#f7f6f2`, `#faf9f5`, `#eae8e0`, `#e0ddd5`, `#f4f6f9`, `#fafafa`, `#fafbfd`, `#f8f9fa` | `bg-` → `surface-muted` / `line-subtle` / `canvas` |
| Viền xám trung tính → `line` (#CBD5E1) | `#c5c6cd` | `border-` 259 + `divide-` 1 → `line` ; `bg-` 2 → `line-subtle` |
| Nền nhấn xanh nhạt → `primary/<opacity>` | `#e5eeff`, `#eff4ff`, `#dce9ff`, `#d0e2ff`, `#d3e4fe`, `#d8e3fb` | `bg-` → `primary/10` (`#D0E2FF` → `primary/20`) ; `divide-`/`border-` → `line-subtle` |
| Teal biến thể → `primary-hover` (46 chỗ) / `accent` | `#005463`, `#00515f`, `#004e5c`, `#004e5b`, `#00879e`, `#085f75`, `#0e7490`, `#00a8c6`, `#4cd7f6` | hover/gradient stop → `primary-hover` ; `#00A8C6` → `accent` ; `#4CD7F6` → `accent/80` (tay) |
| Trạng thái đỏ → `danger` (#B91C1C, 6,47:1) + `primary-fg` | `#990000`, `#ba1a1a`, `#1c0a0a`, `#ef4444`, `#fca5a5` | `text-`/`bg-` → `danger` ; `text-` → `primary-fg` ; `border-` → `danger/40` |
| Trạng thái vàng/cam → `warning` (#B45309) / `warning-strong` (#D97706) | `#664d03`, `#7a5b00`, `#ea580c`, `#c59b27`, `#ffd700`, `#1c1608`, `#f59e0b`, `#fde68a`, `#ffedd5`, `#fed7aa`, `#fff8e6`, `#fffdf0`, `#9a3412` | `text-` → `warning`/`warning-strong` ; `bg-` nền nhạt → `warning/10` ; `border-` → `warning/30`/`warning` |
| Trạng thái xanh lá → `positive` (#15803D) | `#166534`, `#dcfce7`, `#bbf7d0`, `#10b981` | `text-` → `positive` ; `bg-` → `positive/10` ; `border-` → `positive/30`/`positive/40` |
| Nhấn xanh dương → `info` (#1D4ED8) | `#eff6ff`, `#f0f7ff`, `#bfdbfe`, `#b8d5ff`, `#0284c7`, `#0369a1`, `#1e40af`, `#1a0dab`, `#004b87` | `bg-` → `info/10`/`info` ; `border-` → `info/30` ; `text-`/gradient → `info` |
| Navy gần đen → `surface-inverse`; chữ trên nền `accent` → `surface-inverse` | `#001f26` | `text-` → `surface-inverse` (light 12,6:1 · dark 9,5:1 trên `#57DFFE`) |

**3 màu KHÔNG được đưa vào bảng trên vì vẫn còn trong CSS build:** `#00687a`/`#57dffe`/`#ffffff`
(vẫn là giá trị của token `primary`/`accent`/`surface`), cùng các giá trị dark theme của A2a.

### 3.4 Quyết định A2d để lại — đã chốt

| Hex | Số chỗ | Quyết định | Lý do |
|---|---:|---|---|
| `text-[#1E293B]` | 34 | `text-fg` | Cả 34 chỗ nằm trong `components/admin/AdminStorefrontPanel.tsx`, là `<label>` trên nền sáng (`bg-surface`/`bg-surface-muted`) → vai trò chữ chính. |
| `border-[#1E293B]` | 17 | `border-surface-inverse-raised` | **Lệch nhẹ so với đề bài** (đề bài gợi ý `border-line`). Cả 17 chỗ đều là viền **của panel tối** (`bg-surface-inverse` ở `App.tsx` footer, `AdminSidebar`, `AuthModal` header, `PageSkeleton`, viewport 3D…). `border-line` (`#CBD5E1`) trên `#091426` là một đường sáng gần trắng — sai rõ rệt. `surface-inverse-raised` cho **0 pixel đổi ở light** (`#1E293B` = đúng giá trị gốc) và đúng ở dark (`#1A2434` trên `#131C2A`). |
| `bg-[#D8E3FB]` | 3 | `bg-primary/10` | **Lệch nhẹ**: đề bài gợi ý `surface-muted`, nhưng 3 chỗ này là nền **avatar** cần phân biệt với nền card trắng → `primary/10` giữ được tín hiệu "có nhấn" ở cả 2 theme. |
| `#BCC7DE` | 0 còn lại | (Stage A đã map) | — |
| `#C5C6CD` 261 (viền) | 259 `border-line`, 2 `bg-line-subtle` | theo đề bài | 1 chỗ `divide-` → `divide-line`. |
| gradient `#0E7490` (7) | 7 | `primary-hover` | 3 điểm là **nút** (`HomeView.tsx:215/255`), nơi gradient đã được gỡ hẳn ở P4; 4 điểm còn lại là gradient 2 điểm cùng tông (`from-primary to-primary-hover`) — xử lý tay, đã ghi. |

---

## 4. P3 — Radius / Shadow / Z-index

### 4.1 Radius: 6 bậc → 4 (sm 6px · md 8px · lg 12px · full)

Quan trọng: `@theme static` của A2a **đã** đặt `--radius-sm: 6px / --radius-md: 8px / --radius-lg: 12px`,
nên `rounded-sm/md/lg` đã đúng spec; việc phải làm là quy các bậc thừa về 4 bậc đó.

| Cũ | Mới | Giá trị thật | Số chỗ |
|---|---|---|---:|
| `rounded-xs` | `rounded-sm` | 2px → 6px | 2 |
| bare `rounded` | `rounded-sm` | 4px → 6px | 495 |
| `rounded-xl` | `rounded-lg` | 12px → 12px (**0 đổi**) | 525 |
| `rounded-2xl` | `rounded-lg` | 16px → 12px | 171 |
| `rounded-3xl` | `rounded-lg` | 24px → 12px | 2 |
| `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-full` | giữ | — | — |
| `rounded-none` | giữ (4 chỗ, ngoại lệ có chủ đích) | 0 | 4 |

**Vì sao bare `rounded` (495 chỗ) → `rounded-sm` (6px) chứ không phải `rounded-md` (8px)?** Đo phân bố
ngữ cảnh: 109 chỗ là control (nút/input), 33 chỗ là card (`p-5`/`p-6`), **349 chỗ là badge/chip nhãn nhỏ**
— vai trò dominant là badge/chip, mà `tokens.md` §6 gán `sm 6px` cho badge/chip/tag. Đây là **thay đổi
nhỏ nhất** đủ đạt "4 bậc" và tránh làm 495 control dày lên. 33 card dùng bare `rounded` nay là 6px thay vì
12px (`tokens.md` §6 muốn card = `lg`) — **cần A0 review**, xem §6.

### 4.2 Shadow: 7 bậc → 4 theo vai trò

| Cũ | Mới | Ghi chú | Số chỗ |
|---|---|---|---:|
| `shadow-2xs` | `shadow-e0` (= `none`) | mất bóng gần như vô hình (`0 1px rgb(0 0 0 / .05)`) | 121 |
| `shadow-xs`, `shadow-sm`, bare `shadow` | `shadow-e1` | "nổi nhẹ / dropdown nhỏ" | 361 |
| `shadow-md`, `shadow-lg` | `shadow-e2` | "overlay/popover" | 71 |
| `shadow-xl`, `shadow-2xl` | `shadow-e3` | "modal" | 58 |
| `shadow-inner` | `shadow-e0` | `inset` không có trong thang 4 bậc | 9 |
| `shadow-none`, `shadow-e0..e3` | giữ | — | — |

**Cố ý KHÔNG đụng** các utility **màu bóng** (`--tw-shadow-color`), chúng không phải bậc elevation:
`shadow-primary/25` (2), `shadow-cyan-500/20`+`shadow-cyan-900/30|50` (3), `shadow-purple-500/20`,
`shadow-emerald-500/20`, `shadow-amber-500/20` (mỗi thứ 1).

### 4.3 Z-index: theo vai trò + sửa va chạm

Đã dùng utility token có sẵn `z-sticky|panel|header|drawer|modal|toast` (A2a khai báo trong `index.css`).
Ánh xạ **0 pixel đổi** cho phần lớn: `z-10`→`z-sticky` (25) · `z-20`→`z-panel` (15) · `z-30`→`z-header` (1)
· `z-50`→`z-modal` (34). **10 chỗ đổi giá trị thật** — đây là phần sửa va chạm:

| File:dòng | Trước | Sau | Vì sao |
|---|---|---|---|
| `Header.tsx:85` | `z-40` | `z-header` (30) | header phải **dưới** drawer |
| `CartDrawer.tsx:93` | `z-50` | `z-drawer` (40) | cart drawer là drawer, không phải modal |
| `AdminSidebar.tsx:215` | `z-50` | `z-drawer` (40) | mobile nav drawer |
| `AdminSidebar.tsx:209` | `z-40` | `z-drawer` (40) | scrim của drawer (đứng sau panel theo DOM) |
| `AdminSidebar.tsx:340` | `z-50` | `z-panel` (20) | tooltip là popover, không phải modal |
| `ProductDetailView.tsx:782` | `z-40` | `z-sticky` (10) | sticky bar sản phẩm — **trước đây che/đè FAB** |
| `PersonalizeView.tsx:805` | `z-40` | `z-sticky` (10) | như trên |
| `App.tsx:1182` | `z-40` | `z-drawer` (40) | FAB hỗ trợ = drawer theo `tokens.md` §6 |
| `App.tsx:1193` | `z-50` | `z-toast` (60) | toast phải trên modal |
| `WorkshopSettingsView.tsx:557` | `z-20` | `z-header` (30) | sticky page header |

Kết quả: `header 30 < drawer 40 < modal 50 < toast 60`, sticky bar 10 — **FAB (40) không còn chồng
sticky bar (10)**, drawer/cart luôn phủ header. Còn **6 giá trị ngoài thang**: `z-[9999]` (4) và
`z-[100]` (2) trong `tool3d/*Modal.tsx` + `ModelViewer3D.tsx` — xem §5 (cố ý không đụng).

### 4.4 "Utility không tồn tại" — KIỂM CHỨNG: TIỀN ĐỀ CỦA `01` §4.3 SAI VỚI TAILWIND v4

`01-theme-migration.md` §4.3 và rủi ro 8.4 nói `w-88`, `w-18`, `h-13`, `scale-102` "không tồn tại, Tailwind
bỏ qua im lặng". **Đo trên CSS build thật thì ngược lại** — Tailwind v4 sinh giá trị spacing/scale động:

```
.w-18{width:calc(var(--spacing) * 18)}          .md\:w-88{width:calc(var(--spacing) * 88)}
.h-13{height:calc(var(--spacing) * 13)}         .scale-102{--tw-scale-x:102%;…}
.h-18{height:calc(var(--spacing) * 18)}         .w-13{width:calc(var(--spacing) * 13)}
```

⇒ **Không sửa** các class này (sửa = đổi thị giác vô cớ). Vấn đề "8.4" chỉ đúng với Tailwind v3.
Đã rà thêm bằng regex cho các họ `w-/h-/mt-/gap-/scale-/max-w-` và không tìm thấy utility nào thực sự
không tồn tại (các match `max-w-2`, `max-w-3` trước đây là **dương tính giả** của regex khớp tiền tố
`max-w-2xl`).

---

## 5. P4 — Primitive & control (làm một phần)

### Đã làm

1. **Button 3 công thức → 1 primitive** (`@frontend/ui/Button`), **bỏ gradient khỏi nút thường** — 7 nút:

| File | Trước | Sau |
|---|---|---|
| `HomeView.tsx` (announcement CTA) | `<button>` + gradient `from-primary to-primary-hover` | `<Button size="sm">` |
| `HomeView.tsx` (hero CTA, đề bài ghi dòng 254) | `<button>` + gradient + `shadow-primary/25` | `<Button size="lg">` |
| `HomeView.tsx` (estimator CTA) | `<button>` + gradient | `<Button size="lg" fullWidth>` |
| `CartView.tsx` (checkout, đề bài ghi dòng 444) | `<button>` + `bg-primary … py-4` | `<Button size="lg" fullWidth className="font-mono">` |
| `ProductDetailView.tsx:690` | `<button>` + `bg-surface-inverse hover:bg-primary` (công thức thứ 4) | `<Button size="lg" fullWidth className="font-mono">` |
| `ProductDetailView.tsx:703` (đề bài ghi 697) | `<button>` + gradient `from-teal-700 to-primary` + `border-accent/30` | `<Button size="lg" fullWidth className="font-mono">` |
| `WorkshopOnboardingWizard.tsx:1240` | `<button>` + gradient `from-primary to-info` | `<Button size="md" loading={isSubmitting}>` |

   `className` giữ lại chỉ `font-mono`/`hover:text-rose-600` (khác nhóm với class nền của `Button`, không
   xung đột vì `cn()` **không merge** class Tailwind — đã kiểm: `.text-fg` được sinh **sau** `.text-danger`
   trong CSS nên mọi override màu chữ qua `className` sẽ **thua**, vì vậy tôi không cố override).

2. **8 control icon-only tệ nhất → `<Button iconOnly aria-label=…>`** (vùng bấm ≥44×44 do primitive ép):
   - `ExploreView.tsx` **6 nút "bỏ lọc"** trong chip (`357/366/375/384/395/404` — đề bài ghi "7", thực tế
     có **6** chip) → `<Button iconOnly size="sm" variant="ghost" className="-m-2 hover:text-rose-600">`.
     Trước: icon 14px **không padding** ⇒ vùng bấm ~14×14. `-m-2` để bù 8px mỗi bên, **hạn chế** việc chip
     cao thêm (xem §6 — vẫn cao thêm ~12px).
   - `DesignerDashboardView.tsx:654` nút xoá → `<Button iconOnly size="sm" variant="ghost" aria-label="Xoá ấn phẩm">`.
     Trước: ~25×31 (icon 14px, `px-2 py-1.5`).

3. **`docs/design/icon-map.md`**: đối chiếu tự động bảng trong doc với `src/frontend/ui/iconMap.ts` →
   thiếu **4 glyph** (`cleaning_services` → `SprayCan`, `folder_off` → `FolderX`, `link_off` → `Unlink`,
   `thermostat` → `Thermometer`) → **đã bổ sung** 4 dòng + ghi chú ở Summary. `help` → `CircleQuestionMark`
   **đã đúng sẵn** trong doc (lucide 0.546 không export `CircleHelp`), không phải sửa.
   Sau khi sửa: `thiếu = []`; "thừa" 5 glyph (`add_shopping_cart`, `cloud_sync`, `lock_reset`,
   `remove_shopping_cart`, `square_foot`) là **đúng thiết kế** — 5 glyph ghép bằng `createLucideIcon`
   nên không có dòng `'name': Component` trong `iconMap.ts`; chúng nằm ở mục "Icons needing a decision".

### Chưa làm (và vì sao)

- **~81 control icon-only còn lại** trong số 89 mà A2c phát hiện: mỗi chỗ cần **viết `aria-label` mới từ
  ngữ cảnh** và **kiểm layout bằng mắt**; đổi hàng loạt `<button>` → `<Button iconOnly>` ép `min-h-11/12`
  nên có thể phá các cụm chip/thanh công cụ dày (chính đề bài cảnh báo "nếu vỡ layout thì báo lại, đừng
  cưỡng"). Không có browser trong phiên này để xác minh ⇒ **dừng ở ranh giới an toàn** và báo lại.
- **6 giá trị `z-[…]`** (`z-[9999]` ×4, `z-[100]` ×2) trong `tool3d/*Modal.tsx` + `ModelViewer3D.tsx`:
  đây là modal **lồng trong stacking context của viewport 3D**, hạ về `z-modal` (50) sẽ tạo **hoà z** với
  lớp phủ `z-50`/`z-modal` kế cận (lớp sau trong DOM thắng) ⇒ có thể làm lớp loading bị che. Cần kiểm bằng
  mắt trước khi đổi ⇒ **giữ nguyên, ghi lại**.

---

## 6. P5 — Tạm ẩn "Quên mật khẩu?" (chủ dự án giao thêm)

Cờ `ENABLE_PASSWORD_RESET = false` đặt ở `src/frontend/components/AuthModal.tsx:14` (export được, cạnh
các import) và được dùng ở **cả 3 điểm vào**:

| File:dòng | Đã ẩn gì |
|---|---|
| `AuthModal.tsx:543` | nút "Quên mật khẩu?" trong form đăng nhập |
| `AuthModal.tsx:833` | JSX của mode `forgot_password` (form gửi email) |
| `AuthModal.tsx:970` | nút "Quay lại màn hình đăng nhập" của mode đó |
| `LoginView.tsx:120` | nút "Quên mật khẩu?" ở trang đăng nhập (import cờ từ `../components/AuthModal`) |

**Không xoá** `resetPasswordForEmail` trong `AuthContext.tsx:433`, `sendPasswordReset` và
`handleForgotPasswordSubmit` — bật lại chỉ cần đổi cờ thành `true`.

**Bằng chứng không còn đường vào nào khác** (`grep -rn` trên `src/frontend`):

```
setMode('forgot_password')   -> chỉ 1 chỗ: AuthModal.tsx:546  (nằm TRONG khối {ENABLE_PASSWORD_RESET && …})
mode === 'forgot_password'   -> chỉ 2 chỗ: AuthModal.tsx:833, 970 (đều có ENABLE_PASSWORD_RESET && phía trước)
sendPasswordReset            -> AuthContext.tsx (định nghĩa + export), AuthModal.tsx:148 (chỉ gọi từ form đã ẩn)
initialMode                  -> chỉ nhận 'signin'|'signup'|'role_select'|'account' (không thể là forgot_password)
```

⇒ **0 đường vào còn hở.**

**Một phát hiện cần A0 biết:** nút "Quên mật khẩu?" ở `LoginView.tsx` **chưa bao giờ** gọi
`resetPasswordForEmail` — nó chỉ `alert("… liên hệ quản trị viên …")`. Tức ở trang này nút **không phải**
lời hứa sai về email; nó là một gợi ý liên hệ hỗ trợ. Nay theo quyết định thì nó bị ẩn cùng cờ, nên
người dùng quên mật khẩu ở trang `/auth/login` sẽ **không còn gợi ý nào**. Nếu muốn giữ kênh hỗ trợ, đề
xuất thay bằng một dòng chữ tĩnh "Quên mật khẩu? Liên hệ hỗ trợ" (không phải nút) — tôi **không tự làm**
vì đề bài ghi rõ "chỉ ẩn".

---

## 7. Gate (output thật)

```
### 1) npm run lint

> react-example@0.0.0 lint
> tsc --noEmit

RC=0

### 2) npx vite build --outDir /tmp/vc-verify-a2e --emptyOutDir
vite v6.4.3 building for production...
transforming...
✓ 1847 modules transformed.
rendering chunks...
computing gzip size...
../../../../tmp/vc-verify-a2e/index.html                                     1.44 kB │ gzip:   0.77 kB
../../../../tmp/vc-verify-a2e/assets/cadParser.worker-WN_MdiLe.js            3.55 kB
../../../../tmp/vc-verify-a2e/assets/index-DH27Ghn0.css                    140.77 kB │ gzip:  21.50 kB
../../../../tmp/vc-verify-a2e/assets/AdminSettingsPanel-Ck_o-wLw.js          5.40 kB │ gzip:   1.70 kB
../../../../tmp/vc-verify-a2e/assets/pricingEngine-CrBTzPC3.js               7.90 kB │ gzip:   3.76 kB
../../../../tmp/vc-verify-a2e/assets/useWorkshopAdminStore-4j5Uly8l.js      11.92 kB │ gzip:   3.31 kB
../../../../tmp/vc-verify-a2e/assets/AdminProductsPanel-CseDrNMJ.js         17.91 kB │ gzip:   4.34 kB
../../../../tmp/vc-verify-a2e/assets/AdminSeoPanel-C3f7_76D.js              19.69 kB │ gzip:   5.04 kB
../../../../tmp/vc-verify-a2e/assets/useProductionStore-BxbdpZW-.js         20.75 kB │ gzip:   6.36 kB
../../../../tmp/vc-verify-a2e/assets/Group0OverviewPanel-CxJG700-.js        21.90 kB │ gzip:   6.39 kB
../../../../tmp/vc-verify-a2e/assets/AdminStorefrontPanel-BbfnaR2V.js       24.12 kB │ gzip:   4.63 kB
../../../../tmp/vc-verify-a2e/assets/AdminDashboardView-BHbUY4xk.js         24.42 kB │ gzip:   7.59 kB
../../../../tmp/vc-verify-a2e/assets/Group5ProductionPanel-rYR5q0DZ.js      31.60 kB │ gzip:   7.73 kB
../../../../tmp/vc-verify-a2e/assets/Group2DesignersPanel-04OnIrOP.js       33.36 kB │ gzip:   8.41 kB
../../../../tmp/vc-verify-a2e/assets/Group3CustomersPanel-CZBerhEK.js       47.30 kB │ gzip:  11.16 kB
../../../../tmp/vc-verify-a2e/assets/react-vendor-BdPk-oB-.js               51.52 kB │ gzip:  18.21 kB
../../../../tmp/vc-verify-a2e/assets/Group1WorkshopsPanel-D3SWLkZ0.js       52.26 kB │ gzip:  10.14 kB
../../../../tmp/vc-verify-a2e/assets/DesignerDashboardView-BiMfn9W4.js      53.55 kB │ gzip:  11.75 kB
../../../../tmp/vc-verify-a2e/assets/Group4PricingEnginePanel-Dg8RKyQg.js  109.62 kB │ gzip:  20.14 kB
../../../../tmp/vc-verify-a2e/assets/supabase-vendor-Dou1_KsT.js           221.01 kB │ gzip:  57.80 kB
../../../../tmp/vc-verify-a2e/assets/Tool3DView-7jVosNMF.js                306.23 kB │ gzip:  88.94 kB
../../../../tmp/vc-verify-a2e/assets/three-vendor-Dzvn5SQW.js              531.66 kB │ gzip: 133.90 kB
../../../../tmp/vc-verify-a2e/assets/index-CTmL4l54.js                     744.34 kB │ gzip: 193.37 kB
✓ built in 3.18s
RC=0
CSS build ra : /tmp/vc-verify-a2e/assets/index-DH27Ghn0.css
CSS bytes TRUOC: 146239
CSS bytes SAU  : 140769

### 3) node scripts/check-contrast.mjs
PAIR                                FG       BG       RATIO   MIN   RESULT
--------------------------------------------------------------------------------
LIGHT body text                     #091426  #F8FAFC  17.61   4.5   PASS
LIGHT body on card                  #091426  #FFFFFF  18.43   4.5   PASS
LIGHT muted text                    #545F73  #F8FAFC  6.15    4.5   PASS
LIGHT muted on card                 #545F73  #FFFFFF  6.44    4.5   PASS
LIGHT subtle text                   #64748B  #FFFFFF  4.76    4.5   PASS
LIGHT subtle on canvas              #64748B  #F8FAFC  4.55    4.5   PASS
LIGHT placeholder (current)         #94A3B8  #FFFFFF  2.56    4.5   EXPECTED
LIGHT placeholder on canvas (current)#94A3B8  #F8FAFC  2.45    4.5   EXPECTED
LIGHT control border                #8590A6  #FFFFFF  3.21    3.0   PASS
LIGHT control border on canvas      #8590A6  #F8FAFC  3.07    3.0   PASS
LIGHT decorative border             #CBD5E1  #F8FAFC  1.42    3.0   EXPECTED
LIGHT primary text                  #00687A  #F8FAFC  6.15    4.5   PASS
LIGHT primary on card               #00687A  #FFFFFF  6.44    4.5   PASS
LIGHT white on primary              #FFFFFF  #00687A  6.44    4.5   PASS
LIGHT white on primary hover        #FFFFFF  #005260  8.84    4.5   PASS
LIGHT danger text                   #B91C1C  #FFFFFF  6.47    4.5   PASS
LIGHT warning text                  #B45309  #FFFFFF  5.02    4.5   PASS
LIGHT success text                  #15803D  #FFFFFF  5.02    4.5   PASS
LIGHT focus ring on canvas          #00687A  #F8FAFC  6.15    3.0   PASS
LIGHT accent on dark panel          #57DFFE  #091426  11.75   4.5   PASS
DARK body text                      #E8EEF7  #080D16  16.68   4.5   PASS
DARK body on card                   #E8EEF7  #0E1520  15.70   4.5   PASS
DARK muted text                     #9BA9BE  #0E1520  7.68    4.5   PASS
DARK muted on canvas                #9BA9BE  #080D16  8.16    4.5   PASS
DARK subtle text                    #7A8798  #0E1520  5.01    4.5   PASS
DARK primary text                   #3AB8CE  #0E1520  7.78    4.5   PASS
DARK primary on canvas              #3AB8CE  #080D16  8.27    4.5   PASS
DARK fg on primary fill             #07272E  #3AB8CE  6.67    4.5   PASS
DARK accent text                    #57DFFE  #0E1520  11.68   4.5   PASS
DARK control border                 #4E6490  #0E1520  3.10    3.0   PASS
DARK control border on canvas       #4E6490  #080D16  3.29    3.0   PASS
DARK decorative border              #28374D  #0E1520  1.52    3.0   EXPECTED
DARK focus ring on card             #57DFFE  #0E1520  11.68   3.0   PASS
DARK rejected text tone             #6E7A8A  #0E1520  4.20    4.5   EXPECTED
LIGHT fg on surface-muted           #091426  #F8F9FF  17.54   4.5   PASS
LIGHT muted on surface-muted        #545F73  #F8F9FF  6.13    4.5   PASS
LIGHT subtle on surface-muted       #64748B  #F8F9FF  4.53    4.5   PASS
LIGHT primary on surface-muted      #00687A  #F8F9FF  6.13    4.5   PASS
LIGHT on-inverse on panel           #FFFFFF  #091426  18.43   4.5   PASS
LIGHT accent on inverse-raised      #57DFFE  #1E293B  9.33    4.5   PASS
LIGHT success on canvas             #15803D  #F8FAFC  4.79    4.5   PASS
LIGHT warning on canvas             #B45309  #F8FAFC  4.80    4.5   PASS
LIGHT danger on canvas              #B91C1C  #F8FAFC  6.18    4.5   PASS
LIGHT info on card                  #1D4ED8  #FFFFFF  6.70    4.5   PASS
LIGHT rating graphic                #D97706  #FFFFFF  3.19    3.0   PASS
LIGHT rating as small text          #D97706  #FFFFFF  3.19    4.5   EXPECTED
LIGHT control border on muted       #8590A6  #F8F9FF  3.06    3.0   PASS
LIGHT focus ring on card            #00687A  #FFFFFF  6.44    3.0   PASS
LIGHT hairline on card              #E2E8F0  #FFFFFF  1.23    3.0   EXPECTED
LIGHT separator on card             #CBD5E1  #FFFFFF  1.48    3.0   EXPECTED
DARK fg on surface-muted            #E8EEF7  #131C2A  14.67   4.5   PASS
DARK fg on surface-raised           #E8EEF7  #1A2434  13.38   4.5   PASS
DARK muted on surface-muted         #9BA9BE  #131C2A  7.18    4.5   PASS
DARK subtle on canvas               #7A8798  #080D16  5.32    4.5   PASS
DARK subtle on surface-muted        #7A8798  #131C2A  4.68    4.5   PASS
DARK primary on surface-muted       #3AB8CE  #131C2A  7.27    4.5   PASS
DARK fg on primary hover fill       #07272E  #57DFFE  10.00   4.5   PASS
DARK accent on card                 #57DFFE  #0E1520  11.68   4.5   PASS
DARK on-inverse on panel            #E8EEF7  #131C2A  14.67   4.5   PASS
DARK success on card                #4ADE80  #0E1520  10.51   4.5   PASS
DARK warning on card                #FBBF24  #0E1520  10.97   4.5   PASS
DARK danger on card                 #F87171  #0E1520  6.62    4.5   PASS
DARK info on card                   #60A5FA  #0E1520  7.20    4.5   PASS
DARK rating graphic                 #FBBF24  #0E1520  10.97   3.0   PASS
DARK focus ring on canvas           #57DFFE  #080D16  12.41   3.0   PASS
DARK focus ring on muted            #57DFFE  #131C2A  10.91   3.0   PASS
DARK separator on card              #232F42  #0E1520  1.36    3.0   EXPECTED
DARK hairline on card               #1B2434  #0E1520  1.18    3.0   EXPECTED
--------------------------------------------------------------------------------
58/68 pass, 10 expected non-pass, 0 unexpected fail

Expected non-pass (documented in docs/design/tokens.md):
  - LIGHT placeholder (current) (2.56): remove: replace by #64748B
  - LIGHT placeholder on canvas (current) (2.45): remove: replace by #64748B
  - LIGHT decorative border (1.42): decor: exempt by 1.4.11
  - DARK decorative border (1.52): decor: exempt by 1.4.11
  - DARK rejected text tone (4.20): remove: do not use for text
  - LIGHT rating as small text (3.19): graphics only: never for text < 18px
  - LIGHT hairline on card (1.23): decor: exempt by 1.4.11
  - LIGHT separator on card (1.48): decor: exempt by 1.4.11
  - DARK separator on card (1.36): decor: exempt by 1.4.11
  - DARK hairline on card (1.18): decor: exempt by 1.4.11
RC=0

### 4) node scripts/verify-tokens-unchanged.mjs <before> <after>
BEFORE  /tmp/vc-css-before.css  (115 màu)
AFTER   /tmp/vc-css-after.css  (36 màu)
MODE    strict (tập màu phải giống hệt)
--------------------------------------------------------------------------------
ADDED   (0)
REMOVED (79)
  - #001f26
  - #004b87
  - #004e5b
  - #004e5c
  - #00515f
  - #005463
  - #00879e
  - #00a8c6
  - #0284c7
  - #0369a1
  - #060d1a
  - #070f1e
  - #085f75
  - #0b1c30
  - #0e7490
  - #0f172a
  - #0f1d32
  - #10b981
  - #111111
  - #11233b
  - #131f33
  - #132238
  - #166534
  - #1a0dab
  - #1c0a0a
  - #1c1608
  - #1c1c1c
  - #1c2c45
  - #1e40af
  - #202124
  - #204060
  - #333333
  - #334155
  - #475569
  - #4cd7f6
  - #4d5156
  - #5a554c
  - #5f6368
  - #664d03
  - #75777d
  - #7a5b00
  - #7d7565
  - #8c857b
  - #990000
  - #9a3412
  - #b8d5ff
  - #ba1a1a
  - #bbf7d0
  - #bfdbfe
  - #c59b27
  - #c5c6cd
  - #d0e2ff
  - #d3e4fe
  - #d5cfc5
  - #d8e3fb
  - #dce9ff
  - #dcfce7
  - #e0ddd5
  - #e5eeff
  - #ea580c
  ... và 19 màu nữa
--------------------------------------------------------------------------------
FAIL: 79 màu bị MẤT so với bản trước — token hoá làm đổi pixel.
RC=1

### KPI
text-[Npx] N<12              : 0
hex trong className="..."   : 0
hex dang [#hex] trong .tsx  : 0
hex dang [#hex] trong .ts   : 0
thang radius (ngoai ui/)    : 
   1059 rounded-lg
    497 rounded-sm
    216 rounded-full
     54 rounded-md
      4 rounded-none
      3 rounded
      1 rounded-t
      1 rounded-b
thang shadow:
    349 shadow-e1
    132 shadow-e0
     66 shadow-e2
     59 shadow-e3
      9 shadow
      3 shadow-cyan
      2 shadow-none
      1 shadow-purple
      1 shadow-primary
      1 shadow-emerald
      1 shadow-amber
thang z:
     31 z-modal
     26 z-sticky
     15 z-panel
      4 z-drawer
      4 z-[9999]
      3 z-header
      2 z-toast
      2 z-[100]
      1 z-index
```

**Bằng chứng byte CSS:** trước **146.239** byte → sau **140.769** byte (**−5.470 byte, −3,7 %**), do xoá
được nhiều utility màu chết (79 giá trị màu + các class `text-[..]`/`rounded-*`/`shadow-*` trùng lặp bị gộp).
`ADDED 0` ⇒ Stage B **không sinh màu mới** nào.

> **Kiểm chứng phụ (bảo vệ KPI):** `docs/` được loại khỏi tập source của Tailwind
> (`@source not "../docs"` — A2c). Đã build lại **sau khi** thêm chính file báo cáo này:
> CSS **140.769 → 140.769 byte, ADDED 0 / REMOVED 0** ⇒ các ví dụ lớp hex nguyên văn trong
> báo cáo **không** sinh utility chết vào CSS build.

> **Ghi chú về trạng thái chung của working tree (agent-brief §4.1):** trong lúc đo gate, có **một lần**
> `npm run lint` trả **RC=2** với 12 lỗi `TS2300 Duplicate identifier` ở **`src/backend/supabase/seedService.ts`**
> (file của **A10**, đang sửa dở) và **0 lỗi** ở mọi file thuộc A2e. Chạy lại sau đó: `npx tsc --noEmit`
> **RC=0, 0 lỗi toàn repo** — đúng như dự kiến, đó là trạng thái tạm của agent khác, không phải lỗi của Stage B.

> `verify-tokens-unchanged` **RC=1 là đúng dự kiến** cho Stage B (script được thiết kế cho Stage A "0 pixel
> đổi"); nó là công cụ để **liệt kê chính xác** màu bị mất — bảng ở §3.3. Gate `lint`/`build`/`contrast`
> đều **RC=0**, và `check-contrast` = 58/68 pass + 10 EXPECTED (đúng bằng baseline của A2a) + **0 unexpected fail**.

---

## 8. KPI trước → sau

| KPI | Lệnh đo | Trước | Sau |
|---|---|---:|---:|
| Hex trong `className="…"` | `grep -rho 'className="[^"]*"' src --include='*.tsx' \| grep -o '#[0-9a-fA-F]\{3,8\}' \| wc -l` | 706 | **0** |
| Hex dạng `[#hex]` trong `.tsx` | `grep -rhoE '\[#[0-9a-fA-F]{3,8}\]' src --include='*.tsx' \| wc -l` | 850 | **0** |
| Hex dạng `[#hex]` trong `.ts` | `grep -rhoE '\[#[0-9a-fA-F]{3,8}\]' src --include='*.ts' \| wc -l` | 0 | **0** |
| `text-[Npx]` với N < 12 | `grep -rEo 'text-\[([0-9]\|1[01])px\]' src --include='*.tsx' \| wc -l` | 1.065 | **0** |
| `text-[Npx]` mọi cỡ | như trên, không lọc | 1.068 | **0** |
| Số bậc radius dùng | `grep -rhoP '(?<![\w-])rounded(-[a-z0-9]+)?'` | 6 bậc + `none` + 2 directional | **4 bậc** (`sm` 497 · `md` 54 · `lg` 1.059 · `full` 216) + `none` 4 |
| Số bậc shadow (elevation) | `grep -rhoE 'shadow-[a-z0-9]+'` | 7 bậc + `none` | **4 bậc** (`e0` 132 · `e1` 349 · `e2` 66 · `e3` 59) + `none` 2 |
| Giá trị z-index | `grep -rhoP '(?<![\w-])z-[a-z0-9\[\]]+'` | 5 giá trị số (`10/20/30/40/50`) | **6 token vai trò** + 6 giá trị tuỳ ý (cố ý, §5) |
| Nút gradient còn lại | `grep -rnE 'bg-gradient-to-[a-z]+' src --include='*.tsx'` | 26 (19 trong đó là panel/nền, 7 là nút) | **19 nền/panel** — 7 nút đã gỡ gradient |
| Màu khác nhau trong CSS build | `verify-tokens-unchanged` | 115 | **36** |

**Ghi chú về số đo "3 `rounded`" ở KPI `ui/`:** 5 match radius còn lại (`rounded`, `rounded-t`,
`rounded-b`) nằm trong `src/frontend/ui/**` (A2b — **ngoài phạm vi**, script không ghi vào đó); trong đó
`rounded` là **tên biến** `ROUNDED[rounded]` trong `Skeleton.tsx`, không phải class.
Tương tự 9 match `shadow` trần là **member access của Three.js** (`dirLight.shadow.mapSize`,
`light.shadowMap`) — không phải class (xem thêm: chính 2 chỗ `dirLight1.shadow-e1.mapSize` do regex của
tôi tạo ra đã được **phát hiện qua `lint` và sửa lại**, ghi ở §9).

---

## 9. Ảnh hưởng thị giác cần A0 review (theo mức)

### Mức CAO — layout/độ tương phản đổi rõ

1. **Sàn chữ 12px (1.068 chỗ, 58 file).** Mọi nhãn 8–11px nay là 12px (+9 % đến +50 % cỡ chữ). Chỗ rủi ro
   nhất là các **cụm nhãn 9–10px nằm trong card/panel hẹp** và **bảng admin dày**:
   `PricingConfigPanel.tsx` (nhiều nhãn `text-[10px]` cạnh `<input>`), `ValidationReportPanel.tsx`
   (13 nhãn 9px trong lưới 2–3 cột), `InternalCostBreakdownModal.tsx`, `PresetPalettePanel.tsx`,
   `ObjectTreePanel.tsx`, `TransformControlsPanel.tsx`, `DesignerDashboardView.tsx`, `HomeView.tsx`
   (nhãn `SIZE/FORMAT`), `ChatSupportModal.tsx`. Có thể tràn dòng/xuống hàng. **Đây là nơi `01` §4.5 muốn
   "giảm số nhãn thay vì tăng chữ"** — tôi không làm vì cấm đổi cấu trúc JSX (§2).
2. **Bỏ bóng `shadow-2xs` (121 chỗ) + `shadow-inner` (9 chỗ)** → các card/panel đó nay **phẳng hoàn toàn**,
   chỉ còn viền `border-line`. Đúng spec (`e0` = phẳng + viền) nhưng nhìn khác rõ ở danh sách/bảng admin.
3. **bare `rounded` 4px → 6px (495 chỗ)**, và **33 card dùng bare `rounded` nay là 6px** thay vì 12px
   (`tokens.md` §6 muốn card = `lg 12px`). Cần A0 xác nhận: chấp nhận 6px, hay tách riêng 33 chỗ đó sang
   `rounded-lg`.
4. **Chip "bỏ lọc" ở `ExploreView` cao thêm ~12px** (nút × nay có vùng bấm 44×44 với `-m-2`). Vùng chạm
   đạt chuẩn nhưng hàng chip cao hơn ~26px → ~36–40px.
5. **`bg-[#1C1C1C]` → `bg-surface-inverse`** (9 chỗ: header/thead/nút tối của `ChatSupportModal`,
   `InternalCostBreakdownModal`, `StlVs3mfComparisonModal`, `DesignerDashboardView`): "mực đen ấm" →
   navy `#091426`. Đây là **xoá bảng màu "editorial" thứ hai** theo đúng §4.2.
6. **Toast lỗi/cảnh báo (`App.tsx:1199/1201`)** đổi từ nền đỏ/vàng **rất tối** (`#1C0A0A`/`#1C1608`) sang
   `bg-danger`/`bg-warning` **đầy** với chữ `text-primary-fg`. Lý do: `#FCA5A5` trên nền tối không có token
   tương ứng và `text-danger` trên `surface-inverse` chỉ 1,56:1. Nay 5,90:1 / 5,02:1 nhưng **trông "kêu" hơn**.
7. **Nền "xanh nhạt" → `primary/10` (hơn 60 chỗ)**: `#E5EEFF`/`#EFF4FF`/`#DCE9FF`/`#D8E3FB`… đổi từ
   **xanh dương nhạt** sang **teal nhạt**. Ảnh hưởng rõ ở `thead` bảng, hàng đang chọn
   (`DesignerDashboardView.tsx:1047`), và các panel "info" (`AuthModal.tsx:865`, `RoleGuard.tsx:69`).
8. **Nút gradient → nút solid 7 chỗ** (§5.1): mất hiệu ứng chuyển sắc teal→cyan / teal→sky, và
   `shadow-primary/25` (bóng ám màu thương hiệu) biến mất. Chiều cao cũng đổi theo `Button`
   (`size="sm"` = 36px > `py-1.5`; `max-md:min-h-12` = 48px trên mobile).

### Mức TRUNG BÌNH — có đổi nhưng đúng spec

9. **Header `z-40` → `z-30`** và **sticky bar sản phẩm `z-40` → `z-10`**: sửa đúng va chạm FAB/drawer/header,
   nhưng nếu có element nào đang ngồi giữa 10 và 40 trong DOM, thứ tự chồng lớp sẽ khác trước.
10. **Cart drawer `z-50` → `z-40`** (dưới modal 50 — đúng, nhưng khác trước).
11. **Vùng chạm nút xoá `DesignerDashboardView:654`**: mất viền/hover **màu rose** (primitive `ghost` đặt
    `text-fg`/`border-transparent`, và `cn()` không merge nên tôi **không** override được). Nay chỉ còn
    `hover:text-rose-600`. Tín hiệu "hành động phá huỷ" yếu đi — cần A0 xác nhận.
12. **`#C5C6CD` → `#CBD5E1` (259 viền)** và **`#334155`/`#1E293B` → `#1E293B` cho viền panel tối**.
13. **`rounded-2xl` 16px → 12px (171 chỗ)**, `rounded-3xl` 24px → 12px.
14. **`shadow-xs/sm/…` đổi cường độ** (e1/e2/e3) và `shadow-xl/2xl` **mạnh lên** thành `e3`
    (`0 16px 48px rgb(9 20 38 / .24)`) — modal sẽ có bóng đậm hơn trước.

### Mức THẤP — gần như không thấy

15. `rounded-xl` → `rounded-lg` (**0 pixel đổi**, 525 chỗ), `z-10/20/30/50` → token cùng giá trị (75 chỗ),
    `#0E7490`/`#005463`/`#00515F`/`#4CD7F6`… → `primary-hover` (46 chỗ, chênh 1–8 đơn vị RGB).

---

## 10. Việc còn lại / lệch kế hoạch

### Còn lại (có lý do)

1. **~81/89 control icon-only < 44×44** — cần viết `aria-label` theo ngữ cảnh + kiểm layout bằng mắt.
2. **6 giá trị `z-[9999]`/`z-[100]`** — rủi ro hoà z của modal lồng trong viewport 3D.
3. **116 hex thô còn lại trong `.tsx` nhưng NGOÀI `className`** — nằm ngoài phạm vi P2 (KPI chỉ tính
   `className`). Phân loại:
   - **Màu sản phẩm/dữ liệu** (`colorHex: '#00687a'`, `hex: '#64748b'`, `#1E1E1E`, `#DC2626`,
     `#F8FAFC`… ở `PersonalizeView`, `ObjectTreePanel`, `DesignerDashboardView`, `WorkshopSettingsView`,
     `Tool3DView`, `CartView:279`): đây là **dữ liệu màu vật liệu**, không phải style — sửa được nhưng
     thuộc Stage C/`theme/tokens.ts`.
   - **Màu vẽ trong JS/3D** (`HomeView.tsx:415` `color={heroModel === 'gear' ? '#00687a' : …}`,
     `ProductDetailView.tsx:38`, `#2A2A2A` placeholder): **Stage C** (ràng buộc #4).
   - **`fill="#4285F4"`/`#34A853`/`#FBBC05`/`#EA4335`** (logo Google, 8 chỗ): **màu thương hiệu bên thứ ba**,
     phải hardcode.
   - **`radial-gradient(... #57DFFE ...)`** ở `PageSkeleton.tsx:45`, `UserAvatarMenu.tsx:160` — chấm lưới
     trang trí trong `style={{}}`.
4. **`docs/design/tokens.md`/`01` chưa cập nhật**: §4.3/8.4 của `01` vẫn nói `w-88`/`h-13`/`scale-102` là
   utility không tồn tại (§4.4 ở trên chứng minh ngược lại). Tôi **không sửa doc plan của A0** — báo để A0 chốt.
5. **Chưa khai báo `--text-*`/`--radius-*` mới trong `@theme`**: cố ý (§2). `src/index.css` chỉ được
   sửa ở chỗ **không** cần thiết… thực tế **tôi không sửa `src/index.css` dòng nào** — mọi token cần dùng
   đã có sẵn từ A2a.

### Lệch so với `01` §4

| # | `01` §4 nói | Đã làm | Lý do |
|---|---|---|---|
| 1 | 9 xám → 2 | ✅ đúng | — |
| 2 | Xoá bảng "editorial" thứ hai | ✅ đúng (25+9+8+1+1 chỗ + 85 chỗ `#1C1C1C`) | — |
| 3 | Radius 6 → 4; sửa utility không tồn tại | ✅ radius 4 bậc; **utility không tồn tại: KHÔNG sửa** | Tiền đề sai với Tailwind v4 (§4.4) |
| 4 | Shadow 7 → 4 | ✅ đúng | — |
| 5 | Sàn 12px + "giảm số nhãn" | ✅ sàn 12px; **không giảm nhãn** | Cấm đổi cấu trúc JSX (ràng buộc #2); đã báo danh sách cụm rủi ro (§9.1) |
| 6 | Button 3 → 1, bỏ gradient; `focus-visible` ring | ✅ 7 nút + bỏ gradient; ring do `Button` lo (A2b) | — |
| 7 | Z-index scale + sửa va chạm | ✅ 10 chỗ đổi giá trị thật; 6 `z-[…]` giữ nguyên | Rủi ro hoà z modal lồng (§5) |
| — | `border-[#1E293B]` → `border-line` (đề bài A0) | → `border-surface-inverse-raised` | Viền **của panel tối**, `border-line` sẽ là đường gần trắng (§3.4) |
| — | `bg-[#D8E3FB]` → `surface-muted` (đề bài A0) | → `primary/10` | Avatar cần tách khỏi nền card trắng (§3.4) |

### Sự cố trong lúc thi công (đã tự phát hiện + sửa)

Regex shadow của tôi khớp cả **member access JS**: `dirLight1.shadow.mapSize` bị đổi thành
`dirLight1.shadow-e1.mapSize` ở `PersonalizeModelViewer3D.tsx:510-511`. `npm run lint` bắt được ngay
(TS1005), đã sửa lại và **thêm bước kiểm `grep -rnoE '\.(shadow|rounded|z)-'`** để chắc chắn không còn
chỗ nào khác (kết quả: 0). Tương tự 2 lỗi `onClick={{…}}` và 1 lỗi `type` trùng ở
`WorkshopOnboardingWizard` — đều bị `tsc` bắt và đã sửa. **Gate cuối đã xanh sau khi sửa.**

### Không chạm (đúng ràng buộc)

`src/frontend/ui/**` (A2b) · `src/backend/**` + `supabase/**` + `vite.config.ts` (A8) ·
`src/data/mockData.ts` + `src/types/index.ts` (A10) · **mọi file `.ts`** · `package.json`/`tsconfig.json` ·
không commit/push/checkout/stash/restore.
Codemod Stage B ghi report ra `/tmp/a2e-stageb-report-step{1..4}.md` — **không ghi đè**
`docs/plans/token-codemod-report.md` của A2d.
