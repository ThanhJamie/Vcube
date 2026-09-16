> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 12 — Spec refactor UI toàn bộ (hợp đồng cho agent)

> Chủ dự án: *"refactor all theo ui mới"*. Tài liệu này là **hợp đồng** để nhiều agent sửa **song song** mà ra kết quả **nhất quán**.
> Nền tảng: `10-modernization-plan.md` (§3 design language, §11 bằng chứng `/admin`) + `11-layout-references.md` (§2 Craftcloud/Shapeways, §6 NEXORA) + `docs/design/tokens.md`.
> **Đây là nguồn sự thật duy nhất khi refactor. Không tự nghĩ ra quy tắc mới.**

> 🔴 **CẬP NHẬT 2026-09-20 — Đợt 11 redesign "Modern SaaS".** Ba mục **§2.1, §2.2, §2.5** dưới đây
> (cùng câu "Body 15px" ở §2.7 và luật "dùng TINT" ở §1.3) **ĐÃ BỊ THAY THẾ** bởi
> `docs/plans/21-saas-spec.md` §1/§2. Lý do: chủ dự án chốt ngôn ngữ thị giác SaaS — viền nhạt +
> fill, bán kính nhỏ, nút **không còn pill**, mật độ dày vừa, body 14px. Ba mục đó được viết lại
> ngay tại chỗ (giữ số mục để tham chiếu cũ không gãy). Phần còn lại của tài liệu (map palette §1,
> xoá nội dung bịa §3, gate §4) **vẫn hiệu lực**.
> Nguồn sự thật token: `docs/design/tokens.md`; cài đặt: `src/index.css`.

---

## 1. Bảng map palette thô → token (BẮT BUỘC dùng đúng bảng này)

### 1.1 Xám `slate` (1.502 chỗ)
| Lớp cũ | Token mới | Lý do |
|---|---|---|
| `text-slate-900` `text-slate-800` | `text-fg` | chữ chính |
| `text-slate-700` `text-slate-600` | `text-fg-muted` | chữ phụ |
| `text-slate-500` | `text-fg-subtle` | `#64748B` — **chính là `fg-subtle`** |
| `text-slate-400` `text-slate-300` | `text-fg-subtle` | `#94A3B8` đã bị loại vì fail AA — **không dùng làm chữ nhạt hơn nữa** |
| `bg-slate-50` | `bg-canvas` | `#F8FAFC` — chính là `canvas` |
| `bg-slate-100` | `bg-surface-muted` | nền phụ |
| `bg-slate-200` | `bg-line-subtle` | |
| `bg-slate-300` | `bg-line` | |
| `bg-slate-800` `bg-slate-900` | `bg-surface-inverse` | panel tối |
| `border-slate-100` `border-slate-200` `divide-slate-*` | `border-line-subtle` | hairline |
| `border-slate-300` | `border-line` | |

### 1.2 Trắng/đen thô (1.630 chỗ)
| Lớp cũ | Token mới | Ghi chú |
|---|---|---|
| `bg-white` trên nền trang | `bg-surface` | **card/panel phải thấy đúng trong dark** |
| `bg-white` là **ô chứa ảnh/icon** | `bg-surface-muted` | theo NEXORA: ô xám nhạt, **không viền** |
| `text-white` trên nền `primary` | `text-primary-fg` | |
| `text-white` trên nền tối/inverse | `text-on-inverse` | |
| `border-white` | `border-line` | |
| `bg-black/60` `bg-black/40` | `bg-surface-inverse/70` | lớp phủ |
| `border-black/10` `border-white/10` | `border-line` | |

### 1.3 Trạng thái (1.315 chỗ) — **dùng TINT, không dùng nền đặc**

> ⚠️ **Thu hẹp phạm vi 2026-09-20** (`21-saas-spec.md` §2.1): tint **chỉ** cho **badge trạng thái**
> và **dải cảnh báo/callout**. **KHÔNG** dùng tint làm nền **thẻ KPI** (`StatCard` đã bỏ nền tint —
> chỉ còn nhãn + số + delta). Bảng map dưới đây vẫn dùng để chuyển `bg-<màu>-50/100` → tint.
| Lớp cũ | Token mới |
|---|---|
| `text-emerald-*` `text-green-*` | `text-positive` |
| `bg-emerald-50/100` `bg-green-50` | `bg-positive-tint` |
| `border-emerald-200` | `border-positive/30` |
| `text-amber-*` `text-yellow-*` `text-orange-*` | `text-warning` |
| `bg-amber-50/100` | `bg-warning-tint` |
| `border-amber-200` | `border-warning/30` |
| `text-rose-*` `text-red-*` | `text-danger` |
| `bg-rose-50/100` `bg-red-50` | `bg-danger-tint` |
| `border-rose-*` | `border-danger/30` |
| `text-blue-*` `text-sky-*` `text-indigo-*` | `text-info` |
| `bg-blue-50` `bg-sky-50` | `bg-info-tint` |
| `text-teal-*` `text-cyan-*` | `text-primary` |
| `bg-teal-50` `bg-cyan-50` | `bg-primary-tint` |
| `border-teal-*` `border-cyan-*` | `border-primary/30` |
| `text-purple-*` `text-violet-*` `text-fuchsia-*` `text-pink-*` | `text-info` (biểu đồ: xem §2.6) |

**Cấm:** bất kỳ `bg-<màu>-500/600/700` đặc dùng làm nền thẻ trạng thái. Nền đặc chỉ dùng cho **CTA** (`bg-primary`, `bg-danger`).

---

## 2. Luật design language (áp ngay trong cùng lượt sửa)

### 2.1 Phân tách bằng **VIỀN NHẠT + FILL** (ĐẢO so với bản cũ) — *cập nhật 2026-09-20*
> Bản cũ nói "bỏ `border`, phân tách bằng fill". **Nay ngược lại** (`21-saas-spec.md` §1.2):
> **viền nhạt là tín hiệu phân tách chính**, fill chỉ phụ.
- Card/panel: **`border border-line-subtle`** + `bg-surface`, shadow `e0` (trong luồng) hoặc `e1`
  (nổi). KHÔNG còn `bg-surface` trần không viền cho card.
- Ô chứa ảnh/icon: `bg-surface-muted`, **không viền** (giữ như cũ).
- Bảng dữ liệu: có **đường kẻ hàng** `divide-line-subtle`, header **dính**.
- Ô nhập/select: **`border-line-control`** (giữ — cần ≥3:1 cho WCAG 1.4.11).
- **Vẫn cấm** viền trang trí vô nghĩa quanh mọi khối: chỉ card/panel/bảng/ô nhập mới có viền.
- **Không** để `bg-white` + `border-slate-200` cùng lúc (đây vẫn là lỗi palette thô, không phải
  viền token).

### 2.2 Radius — thang SaaS, **nút KHÔNG còn pill** (ĐẢO so với bản cũ) — *cập nhật 2026-09-20*
> Bản cũ chốt "`rounded-full` cho **mọi nút/CTA/chip**". **Nay bãi bỏ luật pill.**
> Thang token trong `src/index.css` (`21-saas-spec.md` §1.1):
`--radius-sm` **6px** (badge, chip, ô ≤24px) · `--radius-md` **8px** (**nút/CTA**, input, select,
toolbar, ô 25–40px) · `--radius-lg` **12px** (card, panel, bảng, viewport 3D) · `--radius-xl`
**16px** (band toàn chiều rộng) · `--radius-modal` **14px** (modal, sheet) · `--radius-full`
**chỉ** avatar / chấm trạng thái / pill đếm / thanh tiến độ.
**Kiểm:** không phần tử nào có bán kính ≥ nửa cạnh ngắn, trừ `rounded-full` cố ý.
⚠️ Hệ quả phải dọn ở các đợt áp dụng: **~30 CTA hand-rolled đang `rounded-full`** để khớp pill cũ
⇒ nay **lệch** với `ui/Button` (8px). Đưa về `ui/Button` hoặc đổi sang `rounded-md`.
(Thang 8/12/20/28 của bản 2026-09-12 đã bị thay thế.)

### 2.3 Nhịp section bằng ĐỔI SURFACE
Mỗi trang: các section lớn **luân phiên chất nền** — `canvas` → `surface` → `surface-inverse` (khối khác biệt) → `canvas` → `primary-tint` (dải số liệu) → `surface-inverse` (CTA cuối). Khoảng cách section **80–100px** (desktop), 48–64px (mobile).

### 2.4 Một màu CTA duy nhất
`bg-primary` **chỉ** cho hành động chính. Link/viền/badge/nền **không** dùng `primary` làm màu nhấn tràn lan — dùng `fg`/`line`/`accent`. Mỗi viewport **1 CTA chính** (pill), còn lại là `ghost`/`secondary`.

### 2.5 Icon — **16px trong control** (ĐẢO so với bản cũ) — *cập nhật 2026-09-20*
> Bản cũ: "tối thiểu **18px** cho icon tương tác, **cấm 14px** trong control". Nay tách theo vai trò
> (`21-saas-spec.md` §1.3):
- Icon **trong control** (nút, ô nhập, tab, toolbar) = **16px** (`size-4`).
- Icon **điều hướng sidebar** = **18px** (giữ).
- Icon trong **thẻ KPI / empty state** = **20–30px** (giữ, **không** thu nhỏ).
- ⚠️ Thu nhỏ icon control **không** được làm vùng bấm < **44×44** ở mobile — bù bằng padding
  (`Button` đã tự lo: `max-md:min-h-12`, icon-only `min-h-11 min-w-11`).
- Sàn chữ 12px vẫn bất khả xâm phạm. Icon trang trí giữ `aria-hidden` (mặc định của `Icon`).
  **Cấm emoji làm icon** — thay bằng lucide (ví dụ cờ 🇻🇳/🇺🇸 ở Header → chữ `VIE | ENG`).

### 2.6 Biểu đồ
Bảng màu biểu đồ theo token: `--color-primary` · `--color-info` · `--color-positive` · `--color-warning` · `--color-accent` — **cấm** `#2563EB/#16A34A/#9333EA/#EA580C`. Luôn có nhãn/chú thích; không truyền đạt chỉ bằng màu.

### 2.7 Typography
Sàn 12px. Heading **không** dùng `fg-subtle`/`fg-muted` (lỗi đang thấy ở `/admin`: tiêu đề xám nhạt trên nền trắng). Heading = `text-fg`; mô tả = `text-fg-muted`; metadata = `text-fg-subtle`. Body **14px** — *cập nhật 2026-09-20* (`21-saas-spec.md` §1.3: body 15px → **14px**; `text-base`
đã được khai là 14px trong `src/index.css`). Dùng `text-sm`/`text-base` theo bậc, **không** viết
`text-[15px]`. Thang đầy đủ: `xs 12 · sm 13 · base 14 · lg 16 · xl 20 · 2xl 24 · 3xl 30 · 4xl 38`
(`docs/design/tokens.md` §4).

---

## 3. Xoá nội dung bịa & sai sự thật (luật `docs/design/data-honesty.md`)

| # | Phải xoá/sửa | Ở đâu |
|---|---|---|
| 1 | **Số liệu bịa trên dashboard** (`FLEET UTILIZATION 67.3% +5.4%`, `IN PIPELINE 6`, `98.4% SLA`, `DOANH THU 284.600.000đ +24.8%`, `3 vật tư dưới định mức`, `Mạng Lưới 3 Hub`, khối `62.612.000đ/108.148.000đ/51.228.000đ`, cảnh báo `Nhựa Resin 8K còn 2.1kg`) | `src/frontend/components/admin/groups/Group0OverviewPanel.tsx` và các panel admin khác |
| 2 | Fallback chuỗi bịa trong `.tsx`: `\|\| '±0.05 MM'`, `\|\| 'GIAO HÀNG 24H'`, `\|\| 'ISO/ASTM 52900'`, `\|\| '...Mitutoyo...'`, `\|\| ['BK ROBOTICS LAB', ..., 'ISO 9001:2015 CERTIFIED', ...]` | `HomeView.tsx:178,355,364,373,450,1208,1221` |
| 3 | `63 KỸ SƯ VCUBE 24/7`, `ISO-52900`, `3s Báo Giá`, `Mitutoyo` | Header/HomeView/CartDrawer/Personalize |
| 4 | Nhãn jargon nội bộ `GROUP 0..5`, `Group 0–5` trong ô tìm kiếm | `AdminSidebar.tsx`, `AdminDashboardView.tsx` |
| 5 | Nút `Đồng Bộ DB` (A10 đã bỏ cơ chế nạp fixture ⇒ không còn gì để đồng bộ) | `AdminDashboardView.tsx` |

**Luật thay thế:** giá trị rỗng ⇒ hiện **"Chưa cấu hình"** / `EmptyState` + CTA trỏ đúng nơi nhập (`/admin`). **Tuyệt đối không** rơi về con số/chuỗi đoán.

---

## 4. Gate bắt buộc sau mỗi nhóm (dừng ở lỗi đầu tiên)

```bash
npm run lint                                    # RC=0
npx vite build --outDir /tmp/vc-verify-<agent> --emptyOutDir   # RC=0 (CÓ agent khác chạy song song)
node scripts/check-contrast.mjs                 # RC=0
```
Và **grep chứng minh**:
```bash
grep -rhoE '\b(text|bg|border|from|to|via|ring|divide|placeholder)-(slate|gray|zinc|neutral|stone|rose|red|emerald|amber|blue|sky|violet|purple|green|yellow|orange|cyan|teal|indigo|pink)-[0-9]{2,3}\b' <thư-mục-của-bạn> | wc -l   # → 0
grep -rhoE '\b(bg-white|text-white|border-white|bg-black)\b' <thư-mục-của-bạn> | wc -l   # → 0
grep -rnE "(text|bg|border)-\[#" <thư-mục-của-bạn> | wc -l   # → 0
```
Playwright (Edge, thư mục `C:\Users\chith\AppData\Local\Temp\pwtest`): script phải chứng minh **trước/sau** (red → green), **0 pageerror**, và **không còn phần tử nền sáng trên route tối**.

---

## 5. Phân vùng ownership (KHÔNG chồng lấn)

| Agent | Thư mục | palette thô | white/black |
|---|---|---:|---:|
| **A21** | `src/frontend/context/AuthContext.tsx` (dọn nốt) + `src/frontend/lib/format.ts` + `Header.tsx` + `AuthModal.tsx` + `components/auth/UserAvatarMenu.tsx` + `views/LoginView.tsx` + `views/RegisterView.tsx` | – | – |
| **A22a** | `src/frontend/components/**` **trừ** `admin/**`, `ui/**`, `Header.tsx`, `AuthModal.tsx`, `auth/UserAvatarMenu.tsx` (3 file của A21) | 2.187 | 675 |
| **A22b** | `src/frontend/views/**` + `src/App.tsx` | 629 | 385 |
| **A22c** | `src/frontend/components/admin/**` (gồm `groups/`) | 2.623 | 470 |
| **Không ai** | `src/frontend/ui/**` (primitive đã sạch) · `src/index.css` · `src/backend/**` · `src/data/**` · `supabase/**` · `vite.config.ts` · `tsconfig.json` · `package.json` | – | – |

**Thứ tự đợt:** A21 (nhỏ, độc lập) chạy **song song** A22a/b/c vì file không trùng.
