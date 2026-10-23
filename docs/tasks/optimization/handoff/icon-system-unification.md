<!-- doc-meta: status=active; verified=2026-10-23; owner=design-foundation -->
# HANDOFF — Icon system unification (một nguồn lucide qua `<Icon>`)

> **Work item:** `task-43` · **Agent:** `design-foundation` · **Ngày:** 2026-10-23
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `a22368c` (sạch) + thay đổi task này (unstaged)
> **Trạng thái:** DONE — icon UI hợp nhất về **một** hệ lucide qua `<Icon>`; emoji-icon = 0; gate mới chặn tái phát.
> **Không commit/push** · Không đổi theme/tokens/layout/IA · Không thêm dependency · Build phụ vào `dist-ssr/`.

---

## 1. Chẩn đoán — xác nhận bằng browser TRƯỚC khi sửa

Dùng dev server + Chromium headless (libs `~/.local/share/opencode-pwlibs`), 26 ảnh × (guest 6 route +
admin 7 route) × 390/1440, fixture REST + **fake admin session** (localStorage `sb-<ref>-auth-token`
+ override `user_profiles` → `role:'admin'`; chi tiết §6). Đếm DOM trước khi sửa:

| Nhóm trang | emoji trong DOM | `svg` lucide | svg KHÔNG lucide | fallback glyph |
|---|---:|---:|---:|---:|
| Guest `/`, `/explore`, `/products/DEMO-P07`, `/quote`, `/cart`, `/checkout` ×2 vp | **0** | 15–170 | 0 | 0 |
| Admin `/admin/designers` ×2 | **9** | 52 | 0 | 0 |
| Admin `/admin/customers` ×2 | **2** | 51 | 0 | 0 |
| Admin `/admin/products` ×2 | **21** | 80 | 0 | 0 |
| Admin `/admin/seo` ×2 | **2** | 57 | 0 | 0 |
| Admin `/admin/workshops`, `/machines`, `/lab/preferences` ×2 | **0** | 54–64 | 0 | 0 |
| **Tổng 26 ảnh** | **68** | — | — | **0** |

**Kết luận chẩn đoán:** đúng như Lead mô tả — guest hero/PDP/Explore **đã 0 emoji** (Star của
Home/Explore/PDP là lucide `<Star>`), nhưng **admin là nơi lệch nặng nhất** (`products` 21 emoji,
`designers` 9 emoji). Nguyên nhân đúng là **4 nguồn icon**:
1. **emoji làm icon** — font emoji HĐH, nét khác hoàn toàn lucide: `✓ ✗ ✖ ✕ ⚠ ⚠️ 🔧 ● ◌ ⏳`
   `👑 🛡️ 🚀 ⚙️ 🏢 👤 ★ ⚡` (34 dòng / 15 file).
2. **import `lucide-react` trực tiếp ngoài `src/frontend/ui/**`** — **17 file** (dashboard shell,
   nav config, onboarding wizard, 10 file workshop/settings, 4 view storefront) ⇒ tự đặt
   size/aria/stroke khác `<Icon>`.
3. `iconMap` thiếu glyph cho các nghĩa cần thay (star, rocket_launch, emoji_events, business,
   shield_check, printer, package, clipboard_list, history, forum, remove).
4. raw `<svg>` chỉ còn **Google logo** (AuthModal/LoginView/RegisterView) — **brand asset, giữ nguyên**.
Không phát hiện nguyên nhân khác (không có icon sai nghĩa/kích thước hỏng ngoài các mục trên);
ngoài lề: trang admin còn 1 icon `size` lẻ **13px** (`/admin/machines`) là pre-existing, không do task này.

---

## 2. Đã làm

### 2.1 Emoji-icon → `<Icon>` (34 dòng / 15 file)

| Emoji cũ | Glyph mới | File |
|---|---|---|
| `👑` | `emoji_events` (Trophy) | `admin/groups/Group2DesignersPanel.tsx` (BADGE_TIERS, filter chip, badge row) |
| `🛡️` | `shield_check` (ShieldCheck) | Group2 |
| `🚀` | `rocket_launch` (Rocket) | Group2 |
| `⚙️` | `settings` (Settings) | Group2 filter |
| `🏢` | `business` (Building2) | `admin/groups/Group3CustomersPanel.tsx` |
| `👤` | `person` (User) | Group3 |
| `✓` | `check` | `AdminProductsPanel` (chip readiness), `AdminSeoPanel` (5 trạng thái), `CheckoutView` (step 01), `ServiceShowcaseSection` (feature bullet), `OrderSuccessView` (stage thanh toán) |
| `✗`/`✖`/`✕` | `close` | AdminSeoPanel ("Thiếu"), `admin/groups/group1/WorkshopsTab.tsx` ("Đình chỉ"), OrderSuccessView (fallback `!`) |
| `⚠`/`⚠️` | `warning` | `AdminProductsPanel` (chip), `admin/pricing/FormulaCoreSections.tsx` (2 callout) |
| `🔧` | *bỏ emoji* (option) | `AdminProductsPanel` (3 block `<Select>`) |
| `★` | `star` (Star) | `CadQuickViewModal` (rating), `Group2DesignersPanel` (rating), `ProductDetailView` (5 sao), `HomeView`/`ExploreView`/`PersonalizeView` (đổi `<Star>` trực tiếp → `<Icon name="star">`) |
| `⏳` | `hourglass_empty` | `WorkshopsTab` ("Chờ duyệt") |
| `●`/`◌` | *bỏ* (option status) | `AdminProductsPanel` |
| `⚡` | *bỏ emoji* — canvas text `LOGO: …` | `personalize/PersonalizeModelViewer3D.tsx` (`ctx.fillText`) |

Quy ước: `<option>`/`<select>`/canvas **chỉ bỏ emoji, giữ text** (option không render component);
JSX/chip/badge thay bằng `<Icon>` trong chính `inline-flex` sẵn có (không đổi layout, giữ nguyên
`gap`/màu/aria; icon trang trí `aria-hidden`, stroke mặc định 2).

### 2.2 Bỏ import `lucide-react` trực tiếp ngoài `ui/**` (17 file)

`components/shell/{DashboardShell,navConfig}` · `components/onboarding/WorkshopOnboardingWizard`
(20 symbol; step array đổi `icon: Component` → `icon: '<glyph>'` + render `<Icon name={item.icon}>`) ·
10 file `components/workshop/settings/*` · `views/{HomeView,ExploreView,ProductDetailView,PersonalizeView}`.
Tất cả giờ chỉ dùng `<Icon>` từ `@frontend/ui`; `ui/**` vẫn import lucide (tầng design-system).

### 2.3 `iconMap` +11 glyph mới (201 → **216**)

`star · rocket_launch · emoji_events · business · shield_check · printer · package · clipboard_list ·
history · forum · remove` — map sang lucide tương ứng; `docs/design/icon-map.md` đã cập nhật bảng
glyph + **§POLICY "icon library only"** + mapping emoji→glyph.

### 2.4 Gate mới chống tái phát

- `scripts/check-icon-library.mjs` (Node builtins, không thêm dep): fail nếu
  (a) import `lucide-react` ngoài `src/frontend/ui/**`;
  (b) emoji ranges `1F300–1FAFF / 2600–27BF / 2B00–2BFF` trong code **ngoài comment**
      (bỏ comment chính xác bằng scanner giữ line/col; ALLOWLIST cố ý rỗng, có cơ chế `stale-allowlist`);
  (c) raw `<svg>` ngoài allowlist brand Google.
  Hỗ trợ `--json` (`{violations:[…]}`) để `run-checks` so baseline.
- Wire `scripts/gate-manifest.json` (+1 gate ⇒ 19 gate) và `docs/tasks/baseline.json`
  (`check-icon-library: rc 0, violations 0`).
- `AGENTS.md`: +1 dòng convention "Icon (một nguồn duy nhất)…".
- (`icon:`/`iconName:` literal tiếp tục được `check-icon-names.mjs` kiểm — gate mới không lặp.)

---

## 3. Bằng chứng AFTER (cùng kịch bản, build/source sau sửa)

| Nhóm | emoji DOM | svg lucide | svg non-lucide | fallback | stroke-width |
|---|---:|---:|---:|---:|---|
| Guest 6 route ×2 vp | **0** | 15–170 | **0** | **0** | chỉ `2` |
| Admin 7 route ×2 vp | **0** | 44–89 | **0** | **0** | chỉ `2` |
| **Tổng 26 ảnh** | **68 → 0** | — | **0** | **0** | `2` |

- Mọi `<svg>` trên 26 ảnh đều có class `lucide` (kể cả icon thay emoji); admin pages tăng số
  svg đúng phần emoji được thay (products 80→89, designers 52→61, customers 51→53, seo 57→59).
- Kích thước dùng đúng thang hiện có: 12/14/16/18/20/22/24/28/40 (ảnh sau) — icon chữ nhỏ dùng
  12–14, icon nút 16, icon nav 18, icon trống 20–24; không phát sinh size lạ từ phần sửa.
- Ảnh: **`/tmp/icon-before/` (26 PNG + metrics.json)** và **`/tmp/icon-after/` (26 PNG + metrics.json)**
  (không commit theo yêu cầu; đường dẫn ổn định để Lead đối chiếu).
- Admin chụp bằng **fake admin session + fixture REST** (Supabase sống nhưng không có account admin);
  các màn đã chụp: `/admin/{designers,customers,products,seo,workshops,machines}` + `/lab/preferences`
  (route tab thật là `preferences`, không phải `/lab/settings`), ×390/1440.

---

## 4. Gate (chạy trên cây sau sửa)

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** (rc=0) |
| `npm run build` (`dist-ssr/iconsys`) | **PASS** — entry 689,99 kB / 186,33 kB gzip (không ghi `dist/`) |
| `npm run test:unit` | **PASS** (71 test) |
| `node scripts/check-icon-names.mjs` | **PASS** — 204 file, **216 glyph** |
| `node scripts/check-icon-library.mjs` | **PASS** — 205 file, 0 lucide ngoài ui, 0 emoji-icon, raw svg chỉ Google |
| `npm run check` (19 gate + baseline) | **PASS** — “KHÔNG TỆ HƠN BASELINE” (17 gate so được; doc-refs advisory 336 = nợ cũ) |

---

## 5. Rủi ro / lưu ý

1. **`<option>` không render được icon** ⇒ chỉ bỏ emoji, giữ text. Nếu muốn icon trong select thì
   phải đổi sang combobox custom (ngoài phạm vi, đổi layout).
2. **Canvas HUD** (`ctx.fillText`) không dùng SVG ⇒ bỏ `⚡`, text còn `LOGO: …` (không đổi nghĩa).
3. **Fake-admin screenshots** dùng fixture: số liệu/khoảng trống trên ảnh admin là **dữ liệu giả
   lập**, chỉ dùng để chứng minh icon; không phải trạng thái production.
4. Gate quét **code + JSX text** nhưng bỏ comment; emoji hợp lệ trong copy sản phẩm (nếu có về sau)
   sẽ cần allowlist có lý do — hiện **không có ngoại lệ nào** trong `src/**`.
5. Raw `<svg>` chỉ cho Google brand; nếu thêm logo khác phải cập nhật `RAW_SVG_ALLOW` trong script
   kèm lý do (và docs §POLICY).
6. Không thêm dependency: vẫn lucide-react 0.546 + `createLucideIcon` cho glyph ghép.
7. `iconMap` 216 glyph: khi thêm glyph mới phải cập nhật `docs/design/icon-map.md` (không gate tự
   kiểm định nghĩa doc) và chạy `check-icon-names`.

---

## 6. Cách tái lập kiểm chứng

```bash
# 1) dev server
npm run dev   # :3000

# 2) fixture REST + fake admin session (script tạm, không commit)
#    - localStorage['sb-<ref>-auth-token'] = session JSON (JWT cấu trúc hợp lệ, exp xa)
#    - Page.addScriptToEvaluateOnNewDocument: mock fetch cho /rest/v1/* (fixtures) + /auth/v1/user
#    - user_profiles?select=role&id=eq.<uid> → object { role: 'admin', ... } (single, KHÔNG mảng)
#    script: /tmp/icon-capture2.mjs  (chạy: ICON_OUT=/tmp/icon-after node /tmp/icon-capture2.mjs)

# 3) đo DOM
#    emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu trên document.body.innerText
#    fallback = svg có class chứa 'circle-question-mark'
#    non-lucide = svg không có class 'lucide'
```

---

## 7. Lead verification độc lập (2026-10-23, sau khi agent bàn giao)

- **Chạy lại harness độc lập** (dev :3000 + `/tmp/icon-capture2.mjs`, ICON_OUT=`/tmp/icon-verify`): **26/26 capture**
  (6 guest + 7 admin/lab route × 390/1440) → **emoji DOM = 0**, **fallback = 0**, **svg non-lucide = 0**,
  `stroke-width` duy nhất = **2**; admin products 89 svg / designers 61 / customers 53 / seo 59 / workshops 56 / machines 64.
- **Negative test gate mới**: tạo tạm `src/__gate_probe.tsx` chứa `⚠` ⇒ `check-icon-library` báo FAIL đúng
  file:line (`[emoji-icon]`) và PASS lại sau khi xoá ⇒ gate không phải "pass rỗng".
- **Chuẩn hoá nốt size lệch thang** (Lead, ngoài phần agent): `13→14` (FleetTab), `15→14` ×3
  (MaterialTechnicalAdvisory), `26→28` (HomeView dropzone), `44→36` (HomeView), `40→36` (ExploreView)
  — sau đó **0 size ngoài thang** (12/14/16/18/20/22/24/28/30/32/36/48).
- **Gate tổng**: `npm run lint` PASS · `npm run build` PASS (689,99 kB / 186,33 kB gzip) · `npm run test:unit` 71/71 PASS ·
  12 gate (gồm `check-icon-library`, `check-icon-names`) "KHÔNG TỆ HƠN BASELINE".
- **Bằng chứng ảnh trong repo** (4 ảnh đại diện 1440, before/after): `handoff/icon-evidence/`
  `{before,after}-admin-{products,designers}-1440.png`.
