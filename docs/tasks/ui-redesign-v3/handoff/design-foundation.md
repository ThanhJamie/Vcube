<!-- doc-meta: status=active; verified=2026-10-20; owner=design-foundation -->
# HANDOFF — W1 Foundation (design-foundation) · v3 "Soft Studio"

> **Trạng thái: DONE — W2 có thể bắt đầu.** Toàn bộ gate offline xanh; chưa chụp browser
> (Supabase paused, QA sẽ xác nhận ảnh 390/768/1440 ở W6). Không commit/push.
> Đọc kèm: `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` (hợp đồng v3) và
> `docs/tasks/ui-redesign-v3/TOKEN-PREVIEW.md` (bảng token + recipe copy-paste).

---

## 1. Việc đã làm (đúng scope W1)

| # | Deliverable | Kết quả |
|---|---|---|
| 1 | Token v3 trong `src/index.css` | canvas/surface/muted/line mới, `--color-brand`, 4 `--color-tile-*`, radius 20/28/24, `--shadow-soft` |
| 2 | Primitive variants opt-in | `Card variant`, `Button shape`, `SideNav variant`, `Topbar searchShape` — mặc định cũ **không đổi** |
| 3 | Storefront chrome v3 | `Header.tsx`: 80px, brand mark coral, nav/search pill, VI-only |
| 4 | Shell/toast/FAB/footer | `App.tsx`: SideNav pill cho Lab/Designer, toast live-region, FAB dot brand, footer viền đúng trên nền tối |
| 5 | Language lock | `LanguageContext`: khoá `vi`, `t()` bỏ qua `fallbackEn`, không đường đổi ngôn ngữ |
| 6 | Contrast ledger | 2 script cập nhật theo v3 + luật mới (brand/tile/canvas), 0 unexpected fail |
| 7 | Docs | `DESIGN-LANGUAGE.md` (v3), `TOKEN-PREVIEW.md` (MỚI), `docs/design/tokens.md`, `taste-contract.md` |
| 8 | Defect register | Đóng UI-002 (P1), UI-012 (P2); giảm UI-018 (P2); ghi rõ các mục W1 còn mở |

**Không** sửa page view nào (Home/Explore/PDP/Personalize/Cart/Checkout/Tool3D/admin/designer/lab).
**Không** đụng `src/backend/**`, `src/stores/**`, `src/utils/**`, `src/workers/**`,
`supabase/**`, `package.json`, `vite.config.ts`, `.env`. **Không** thêm dependency/font/dark theme.
**Không** đổi route/slug/nhãn nav.

---

## 2. Files changed

### 2.1 Code (11 file)

| File | Thay đổi |
|---|---|
| `src/index.css` | Token v3 (§3); `.mobile-nav-panel` thêm `overflow-y:auto/overscroll-behavior/max-height:100dvh` (**UI-002**); thêm `.nav-fade-right` (**UI-018** mitigation) |
| `src/frontend/ui/Card.tsx` | `variant?: 'flat' \| 'soft'` (default `flat`); soft = `border-0 shadow-soft`, interactive hover `shadow-e2`; logic/a11y giữ nguyên |
| `src/frontend/ui/Button.tsx` | `shape?: 'rounded' \| 'pill'` (default `rounded`); tách `rounded-md` khỏi BASE sang `SHAPE` |
| `src/frontend/ui/SideNav.tsx` | `variant?: 'tint' \| 'pill'` (default `tint`); pill = nền `bg-canvas`, active `bg-surface shadow-soft`, bỏ vạch dọc; radius item theo variant |
| `src/frontend/ui/Topbar.tsx` | `searchShape?: 'default' \| 'pill'`; pill áp `[&_input]:rounded-full`, **không** đổi chiều cao 56px/hành vi |
| `src/frontend/ui/EmptyState.tsx` | Ô icon `size-12 rounded-lg → rounded-md` (bẫy A19 khi radius-lg = 20px) |
| `src/frontend/components/Header.tsx` | Chrome storefront v3: brand mark coral, nav pill active, search pill, drawer pill + VI-only (bỏ 10 nhánh EN + nhãn role `Admin/Creator/MES Hub/Customer` → VI) |
| `src/frontend/components/NotFoundView.tsx` | Icon tile `size-14 rounded-lg → rounded-md` (A19) |
| `src/frontend/components/RoleGuard.tsx` | Icon tile `size-12 rounded-lg → rounded-md` (A19) |
| `src/frontend/components/CanvasErrorBoundary.tsx` | Icon tile 48px `rounded-lg → rounded-md` (A19) |
| `src/App.tsx` | Chỉ shell/toast/FAB/footer: `SideNav variant="pill"` cho Lab/Designer, brand mark coral, toast `shadow-soft` + `role="status" aria-live="polite"` (**UI-012**), FAB dot `bg-brand`, footer border `border-on-inverse/*` + nhãn VI |
| `src/frontend/context/LanguageContext.tsx` | D0 lock: `t()` chỉ VI (bỏ nhánh `fallbackEn`), `configuredClaims` bỏ nhánh EN, `configuredClaims(_language,…)` |

### 2.2 Gate scripts (2 file)

| File | Thay đổi |
|---|---|
| `scripts/check-contrast.mjs` | Bảng 70 cặp theo v3 (56 pass + 14 expected non-pass): thêm brand coral (4 cặp), tile pastel (12 cặp), cập nhật mọi số canvas/surface/muted/line |
| `scripts/check-contrast-combos.mjs` | `TOKENS` cập nhật (canvas/surface/muted/line/brand/tile); 6 luật cũ cập nhật tỉ lệ; **+8 luật mới** (canvas, surface, 4 tile, fg-on-brand, brand-as-text); `TEXT_COLOR_RE` thêm `brand` |

### 2.3 Docs (5 file)

`docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` (MỚI — hợp đồng v3 đầy đủ) ·
`docs/tasks/ui-redesign-v3/TOKEN-PREVIEW.md` (MỚI — token table + contrast evidence + snapshot
recipe) · `docs/design/tokens.md` (spec token v3) · `docs/design/taste-contract.md` (override
skill ⇄ v3) · file này.

---

## 3. Token v3 (bảng chốt — nguồn: `src/index.css`)

| Token | v2 | **v3** | Đo |
|---|---|---|---|
| `--color-canvas` | `#FAFAF9` | **`#F6F7EF`** | fg 16.21 · muted 7.07 · subtle **4.67** |
| `--color-surface` | `#FFFFFF` | **`#FFFDF9`** | fg 17.21 · muted 7.51 · subtle 4.95 |
| `--color-surface-raised` | `#FFFFFF` | **`#FFFDF9`** | như surface |
| `--color-surface-muted` | `#F5F5F4` | **`#F5F4EC`** | fg 15.85 · muted 6.92 · subtle **4.56** |
| `--color-line` | `#E7E5E4` | **`#E7E3D6`** | 1.19 canvas (trang trí) |
| `--color-line-subtle` | `#F0EFEB` | **`#F0EDE3`** | — |
| `--color-line-control` | `#8A8078` | `#8A8078` (giữ) | **3.80** surface · 3.58 canvas · 3.50 muted |
| `--color-fg` | `#1C1917` | giữ | 16.21 |
| `--color-fg-muted` | `#57534E` | giữ | 7.07 |
| `--color-fg-subtle` | `#746E68` | giữ | 4.67 / 4.95 / 4.56 |
| `--color-brand` | — | **`#E8624A`** (MỚI) | `fg` trên coral **5.23**; coral trên surface 3.29 (chỉ đồ hoạ) |
| `--color-primary` | `#1C1917` | giữ (D3) | 16.21 |
| `--radius-lg` | 16px | **20px** | card/bảng/3D |
| `--radius-xl` | 24px | **28px** | panel/band |
| `--radius-modal` | 20px | **24px** | modal/sheet |
| `--radius-md` | 12px | **12px** (giữ) | control/CTA |
| `--shadow-soft` | — | **MỚI** `0 1px 2px rgb(92 74 51/.05), 0 10px 24px -14px rgb(92 74 51/.18)` | storefront card/nav pill/toast/FAB |
| `--color-tile-mint/lilac/rose/amber` | — | **`#E7F1E4` / `#EFEBF8` / `#FCEBE5` / `#FAF0DA`** | fg 14.91–15.44 · muted 6.51–6.74 · subtle **fail** 4.29–4.44 |

Không đổi: font (Be Vietnam Pro/JetBrains Mono), thang chữ 12–38, spacing 32/16/4,
z-index 10–60, 5 tint trạng thái, `--color-surface-inverse` + `accent` (HUD 3D/footer).

---

## 4. Variant đã thêm (API — mặc định giữ nguyên 100%)

| Primitive | Prop | Default | Giá trị | Ai dùng |
|---|---|---|---|---|
| `Card` | `variant` | `flat` (viền hairline + `shadow-e0`) | `soft` (borderless + `shadow-soft`) | **W2** storefront/transaction; PDP/Explore |
| `Button` | `shape` | `rounded` (`rounded-md` 12px) | `pill` (`rounded-full`) | **chỉ** nav/search/chip |
| `SideNav` | `variant` | `tint` (tint + vạch dọc) | `pill` (nền canvas, active pill trắng + shadow) | **W3** console; đã bật cho Lab/Designer trong `App.tsx` |
| `Topbar` | `searchShape` | `default` | `pill` (áp `[&_input]:rounded-full`) | **W3** console có search |

**Quy tắc:** page agent **chọn** variant theo bề mặt, **không sửa primitive**, **không đổi
default**. Console giữ `flat`; storefront mới dùng `soft`.

---

## 5. Gate results (chạy trên working tree hiện tại, 2026-10-20)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (tsc --noEmit, 0 lỗi) |
| Build | `npm run build` | **PASS** (`✓ built in ~5.9s`, 0 warning chặn) |
| Contrast token | `node scripts/check-contrast.mjs` | **56/70 pass · 14 expected non-pass · 0 unexpected fail** |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **SẠCH** — 99 file `.tsx`, 14 luật, 0 tổ hợp < 4.5, 0 `token-drift` |
| UI rules | `node scripts/check-ui-rules.mjs` | PASS — 139 file, 0 vi phạm mới |
| Icon names | `node scripts/check-icon-names.mjs` | PASS — 138 file, 224 glyph |
| Fabricated | `node scripts/check-fabricated.mjs` | SẠCH — 139 file |
| Doc freshness / refs | `node scripts/check-doc-*.mjs` | advisory: 0 cảnh báo mới từ file v3 (2 marker sai định dạng là nợ cũ của `ui-redesign/handoff/C5,C6.md`) |

**Xác minh utility mới có trong CSS build** (chống "token chết"):
`dist/assets/index-*.css` chứa `.bg-brand`, `.shadow-soft`, `.bg-tile-mint/lilac/rose/amber`,
`.nav-fade-right`, `.[&_input]:rounded-full input`, `.border-on-inverse*`,
`--radius-lg:20px`, `--color-brand:#e8624a`, `--color-surface-muted:#f5f4ec`.

> Chưa chạy `npm run check` đầy đủ (live gate Supabase có thể treo/DNS) — theo đúng cho phép
> của task; offline gates ở trên đã bao phủ phần UI.

---

## 6. Defect register — W1 đã đóng / còn mở

### 6.1 Đã đóng (trong `docs/tasks/ui-redesign-v3/UI-DEFECTS.md`)

| ID | Mức | Việc đã làm |
|---|---|---|
| **UI-002** | P1 | `.mobile-nav-panel`: `max-height:100dvh; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch` ⇒ drawer cuộn được, nút "Đăng xuất/Đăng nhập" tới được ở 390×667. **Cần QA xác nhận ảnh 390** |
| **UI-012** | P2 | Toast container có `role="status"` + `aria-live="polite"` + `aria-atomic="false"` (live region thường trực) |
| **UI-001** | P1 | `ProtectedRoute` (`src/App.tsx`) khi `loading` nay trả `<PageSkeleton />` thay vì `null` ⇒ không còn màn trắng khi khôi phục phiên (xem §6.3) |
| **UI-018** | P2 | Giảm nhẹ: nav storefront thêm `.nav-fade-right` (mask 22px mép phải) báo "còn mục nữa" khi overflow. **Chưa** thay bằng overflow menu — xem §6.2 |

### 6.2 Còn mở — W1 thấy nhưng KHÔNG sửa vì ngoài quyền "chỉ styling / không đổi logic"

| ID | Mức | Lý do không sửa | Đề xuất cho Lead |
|---|---|---|---|
| **UI-016** | P2 | FAB (z-drawer 40) đè bottom-bar PDP/Personalize (z-sticky 10) — cần sửa ở `ProductDetailView.tsx` (**file của W2**) hoặc logic ẩn FAB theo route (App.tsx logic) | W2 pdp-viewer: ẩn FAB/bottom-bar theo route, hoặc nâng bar lên `z-drawer`. Ghi `SHELL-REQUEST` nếu cần App.tsx |
| **UI-025** | P2 | Hotline nổi + FAB cùng góc phải — nằm ở `HomeView.tsx` (**file W2**) | W2 storefront gom về 1 cụm |
| **UI-027** | P2 | Trùng affordance: desktop 2 CTA `/quote`; mobile 2 nút icon mở cùng drawer (search + hamburger). Sửa = quyết định IA/mobile header (Product decision) | Lead chốt: giữ 1 nút mở drawer ở mobile? Nếu chốt, W1/integrator sửa Header ~10 phút |
| **UI-017** | P2 | 34 chỗ `text-fg-subtle` trên `bg-surface-muted` = **4.56** (ĐẠT AA nhưng sát). Đây là **near-miss** mà script liệt kê mọi hit đang đạt — không phải fail; sửa 34 chỗ thuộc W2/W3 | W2/W3 đổi `text-fg-subtle → text-fg-muted` ở file mình khi có dịp; **không** hạ canvas/surface nữa |

### 6.3 UI-001 — ĐÃ ĐÓNG (W1b, 2026-10-20)

Lead duyệt bản sửa tối thiểu. Chỉ 2 thay đổi, không commit:

- `src/App.tsx` → `ProtectedRoute`: nhánh `if (loading) return null;` đổi thành
  `if (loading) return <PageSkeleton />;` (`PageSkeleton` đã được import sẵn ở đầu file).
  Toàn bộ logic khác giữ nguyên: khi hết loading vẫn rẽ `!isLoggedIn → <Navigate to="/auth/login" replace />`,
  còn lại render `children`. Không đổi route/guard/role nào.
- Handoff này: thêm dòng UI-001 vào §6.1 + mục 6.3.

Kết quả: protected route (`/orders`, `/assets`) hiện skeleton trong lúc khôi phục phiên
thay vì màn trắng; không còn trạng thái "trắng >300ms" khi mạng chậm/Supabase paused.
Gate: `npm run lint` PASS, `npm run build` PASS. `UI-027` (trùng affordance mobile) vẫn để
integrator xử lý theo chỉ đạo của Lead — KHÔNG sửa ở W1b.

---

## 7. Rủi ro & điểm cần canh

1. **Biên tương phản mỏng (quan trọng nhất):**
   - `fg-subtle` trên canvas = **4.67**; trên surface-muted = **4.56**;
     `fg-subtle` trên `bg-primary/5` = **4.50** (composite trên `#FFFDF9`);
     `warning` trên canvas = **4.66**.
   - ⇒ **Không** làm canvas/surface tối hơn. Mọi thay đổi palette phải chạy lại 2 script;
     ledger đã khóa bằng luật `fg-subtle-on-canvas` / `-surface` / `primary/5`.
2. **`--radius-lg` 16 → 20 làm bẫy A19 nặng hơn:** ô vuông 20–60px dùng `rounded-lg` sẽ gần
   tròn. W1 đã sửa `EmptyState`, `NotFoundView`, `RoleGuard`, `CanvasErrorBoundary`.
   W2/W3 **phải** kiểm các `size-10/12/14 rounded-lg` khi restyle.
3. **Coral là dao hai lưỡi:** chỉ `bg-brand` + `text-fg` (5.23). `text-brand` trên nền sáng
   và `text-white` trên coral đều **fail** — đã có 2 luật chặn trong combos gate.
4. **Pill tràn lan:** gate không chặn pill (không phải contrast). Review W4 cần soi:
   CTA/form phải `rounded-md`; chỉ nav/search/chip được `rounded-full`.
5. **`shadow-soft` ở console:** nếu W3 dùng tràn lan sẽ mất density/hairline. Contract:
   console dùng `e0/e1` + `border-line`.
6. **Header blur + alpha:** header `bg-canvas/90` đè lên nội dung cuộn ⇒ chữ `fg-subtle` trên
   nền hiệu dụng có thể thấp hơn 4.67 ở nội dung sáng/tối. W1 đã đổi sublabel "Vietnam"
   sang `text-fg-muted`; W2 giữ nguyên tắc "không `fg-subtle` trong header".
7. **`.nav-fade-right`** dùng `mask-image` — có `-webkit-` prefix; nếu QA thấy nav mất chữ ở
   safari cũ, fallback là bỏ class (không ảnh hưởng logic).
8. **Chưa verify browser:** chưa chạy dev server/chụp ảnh (Supabase paused; task cho phép
   offline gate). QA W6 cần xác nhận: header 80px, nav pill, search pill, drawer cuộn 390,
   footer tối, Lab/Designer `SideNav` pill, FAB không đè hotline.
9. **VI-only:** đã sửa trong `Header.tsx` + `LanguageContext`; **còn nhiều chuỗi EN ở page
   files** (auditor UI-003…UI-011) — thuộc W2/W3, không mass-codemod ở W1.

---

## 8. W2 có thể bắt đầu? — **CÓ**

Điều kiện tiên quyết đã đủ: token/primitives/shell ổn định, lint+build+contrast xanh,
contract v3 + token preview có mặt.

**W2 (storefront / pdp-viewer / commerce-auth) được phép:**
- Dùng `<Card variant="soft">` cho bề mặt storefront/transaction.
- Dùng `--color-tile-*` (`bg-tile-mint`…) cho category tile; chữ `text-fg`/`text-fg-muted`.
- Dùng `Button shape="pill"` **chỉ** cho chip/nav; CTA giữ mặc định.
- Header đã xong chrome — **không** sửa `Header.tsx`/`App.tsx` nếu không có `SHELL-REQUEST`.
- Copy: VI-only; giữ thuật ngữ kỹ thuật; format `dd/MM/yyyy`, tiền **`₫`** (D-B), số `vi-VN`.

**W2 KHÔNG được:**
- Sửa `src/index.css`, `src/frontend/ui/**`, `Header.tsx`, `App.tsx`,
  `LanguageContext.tsx`, 2 script contrast (file của W1/integrator).
- Đổi default variant của primitive; đổi route/slug/nhãn nav; thêm dependency/font/dark theme.
- Dùng `text-fg-subtle` trên tile/tint/line-subtle; coral làm CTA/chữ.

**Lệnh gate tối thiểu trước khi W2 handoff:**
```bash
npm run lint && npm run build
node scripts/check-contrast.mjs && node scripts/check-contrast-combos.mjs
node scripts/check-ui-rules.mjs
```

---

## 9. W1c — Copy decisions D-A…D-F (Lead duyệt 2026-10-20)

> Work item: `task-14`. Chỉ sửa **file foundation** + docs; **0 page view**. Không commit.

### 9.1 Code đã sửa (5 file)

| File | Thay đổi |
|---|---|
| `src/frontend/components/Header.tsx` | **D-D**: wordmark `Vietnam` → `Việt Nam` (desktop + drawer); `aria-label="VCUBE Home"` → `Về trang chủ VCUBE` (A18); nav fallback `Quản Trị Admin` → `Quản trị hệ thống`, `Studio Thiết Kế` → `Xưởng thiết kế` (A25/A26) |
| `src/frontend/context/LanguageContext.tsx` | `navAdmin`/`navDesignerStudio`/`roleAdmin`/`roleDesigner` VI-only; **D-A**: `Độ đặc Infill:` → `Độ đặc:`; **UI-030**: `footerMarketplace` → `Sàn bản vẽ kỹ thuật`, `footerRights` → `© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.` |
| `src/frontend/components/RoleGuard.tsx` | **UI-006 (E5–E8)** labels VI (bỏ `(ForgeControl Admin)`, `(Creator)`, `(3D Print Lab)`, `(Customer)`); badge `403 • ACCESS RESTRICTED` → `403 • KHÔNG CÓ QUYỀN TRUY CẬP`; `vai trò {role}` (EN enum) → nhãn VI |
| `src/frontend/components/CanvasErrorBoundary.tsx` | **A20/A21**: `Render Error` → `Lỗi kết xuất 3D`; `VCUBE MESH ENGINE v2.6` → `BỘ MÁY LƯỚI 3D VCUBE v2.6`; nút `Kích Hoạt Lại Engine 3D` → `Kích hoạt lại khung 3D` |
| `src/App.tsx` | **D-F/UI-016**: thêm `FAB_HIDDEN_SCREENS = ['product_detail', 'personalize']`, FAB không render trên 2 route có bottom-bar (không đổi route); **UI-030**: footer `Vietnam` → `Việt Nam`, `Marketplace linh kiện 3D` → `Sàn linh kiện 3D`, copyright VI; **D-A/D-D**: shell brand title `VCUBE Lab` → `Xưởng in VCUBE`, `Designer Studio` → `Xưởng thiết kế`, `featureName` `(MES Hub)` → `(MES)` |

### 9.2 Docs đã cập nhật

| File | Nội dung |
|---|---|
| `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` | §4 allowlist (`Email`, `VND`, vật liệu, tên phần mềm; `File`→`Tệp`), format tiền **`₫`**; **§4.1 mới**: bảng quyết định D-A…D-F (luật bắt buộc W2–W6); §3.7 FAB rule (`FAB_HIDDEN_SCREENS`); §7 checklist + §8 evidence W1c |
| `docs/tasks/ui-redesign-v3/COPY-GLOSSARY.md` | Banner decisions; §2 allowlist → "ĐÃ CHỐT" (D-A: Slicer/Infill/Support/Layer/Batch/Hub/Studio/Score/Watertight Việt hoá; D-E: Email giữ, File→Tệp); §4 W1c đã sửa 12 mục (A17/A18/A20/A21/A23/A24/A25/A26 + E5–E8); §5.1 `₫` chốt; §1 D-C eyebrow |
| `docs/tasks/ui-redesign-v3/PLAN.md` | §5.0 mới: bảng duyệt D-A…D-F; §5.2 allowlist mở rộng (Email, VND, vật liệu, FDM/SLS/SLA, tên phần mềm); §5.3 nhãn EN cấm + nav label đích; §5.5 tiền **`₫`**; header `APPROVED`; §12 ghi D0–D7 + D-A…D-F đã chốt |
| `docs/tasks/ui-redesign-v3/UI-DEFECTS.md` | §0 cập nhật W1c; **§7 mới**: UI-016/UI-030/UI-041/UI-039 đóng, UI-006 đóng nửa (RoleGuard; AuthModal → W2), UI-018 mitigated, UI-027 defer integrator |

### 9.3 Gate

`npm run lint` **PASS** · `npm run build` **PASS** (`✓ built in 5.94s`) · không commit · không đổi
page view · `format.ts` **không đổi** (D-B) · contrast ledger/`src/index.css` **không đổi** (D-A…D-F
không thêm màu mới).

### 9.4 Còn lại cho W2/W3/integrator

- **W2**: D-A Việt hoá + D-C eyebrow trong `HomeView`/`Explore`/PDP/`Personalize`/`ServiceShowcaseSection`
  (COPY-GLOSSARY A1–A16, A19, A22, B–D, E1–E4) — **không sửa** file foundation; E1–E4 (`AuthModal`) W2.
- **W3**: D-A/D-C/D-B trong console (`PricingConfigPanel`, `QuoteSummaryPanel`, `Tool3DView`,
  admin panels, designer/onboarding), gồm dọn các chỗ nối tay `' đ'` → `Money`/`formatCurrency`.
- **Integrator (W5)**: **UI-027** (gộp affordance search/hamburger mobile + 1 CTA `/quote` desktop);
  UI-018 full fix (overflow menu) nếu cần.
- **QA (W6)**: xác nhận FAB không xuất hiện trên `/products/:id` + `/personalize` (390), wordmark
  `Việt Nam`, nav `Quản trị hệ thống`/`Xưởng thiết kế`, RoleGuard VI, footer VI.
