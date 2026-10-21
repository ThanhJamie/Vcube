<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# PROGRESS — UI Redesign "Warm Studio"

> Cập nhật sau **mỗi** wave. Nguồn sự thật về tiến độ. Không xoá lịch sử.

---

## 1. Trạng thái wave

| Wave | Workstream | Trạng thái | Gate | Ghi chú |
|---|---|---|---|---|
| 0 | F0 tokens | 🟢 done | lint ✅ build ✅ | `src/index.css` + 2 contrast gate ledger |
| 0 | F1 primitives | 🟢 done | lint ✅ build ✅ | `src/frontend/ui/**`; `tone`/`chrome` đã gỡ |
| 0 | F2 App shell | 🟢 done | lint ✅ build ✅ | `src/App.tsx` toast/FAB; bỏ `tone="chrome"` |
| 0 | F3 storefront chrome | 🟢 done | lint ✅ build ✅ | gộp vào C5 (Header/NotFound/skeleton) |
| 1 | S1 storefront-core | 🟢 done | lint ✅ build ✅ | Home + Explore |
| 1 | S2 product-detail | 🟢 done | lint ✅ build ✅ | PDP + Personalize + material/services |
| 1 | S3 transaction | 🟢 done | lint ✅ build ✅ | Cart + Checkout + CartDrawer + Invoice |
| 1 | S4 order-flow | 🟢 done | lint ✅ build ✅ | Orders/Tracking/Assets/Progress |
| 1 | S5 auth-shared | 🟢 done | lint ✅ build ✅ | Auth + AuthModal + UserAvatarMenu |
| 2 | C1 admin-panels | 🟢 done | lint ✅ build ✅ | 6 file |
| 2 | C2 admin-groups | 🟢 done | lint ✅ build ✅ | 6 file; chạy lại bằng C2-FINISH sau cancel |
| 2 | C3 quote-3d | 🟢 done | lint ✅ build ✅ | Tool3D + 11 panel |
| 2 | C4 consoles-rest | 🟢 done | lint ✅ build ✅ | Designer + Lab + wizard |
| 2 | C5 shared chrome | 🟢 done | lint ✅ build ✅ | Header + modal chung + boundary |
| 2 | C6 admin CRUD/pricing | 🟢 done | lint ✅ build ✅ | Accessories/Warehouse/Estimator/Pricing |
| 3 | R1 consistency | 🟢 done | — | 0 B · 15 M · 22 m · 3 N |
| 3 | R2 a11y/responsive | 🟢 done | — | 10 B · 14 M · 4 m · 2 N |
| 3 | Integrator I1 | 🟡 running | — | a11y tool3d + invoice + groups |
| 3 | Integrator I2 | 🟢 done | tsc ✅ build ✅ | storefront/App/Header/auth — 22 mục |
| 3 | Integrator I3 | 🟢 done | tsc ✅ build ✅ | admin consistency + quote/designer |
| 4 | Verify | 🟢 done | 16/17 | — | Browser 42 tổ hợp: 0 tràn ngang; chỉ `verify-rls` đỏ vì DNS |

Ký hiệu: ⬜ todo · 🟡 đang làm · 🟢 xong · 🔴 fail/hoàn nguyên.

---

## 2. Baseline trước khi bắt đầu (2026-10-19)

| Gate | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | PASS |
| `npm run build` | PASS |
| `npm run check` | 9/9 gate xanh |
| `node scripts/loop-audit.mjs` | score **8** |
| LOC | 64 329 / 141 file `.ts,.tsx` |
| File > 1000 LOC | 19 |
| `isVi ?` | 1 193 |
| raw `<button>` | 429 (vs 214 `<Button>`) |
| raw input/select | 341 (vs 89 primitive) |
| `any` | 138 |
| `strict` | `false` |

### 2.1 Kết quả sau đợt (before → after, đo trên `src`)

| Chỉ số | HEAD | Sau redesign | Ghi chú |
|---|---:|---:|---|
| `<button` raw | 429 | **268** | phần còn lại chủ yếu là segmented/kanban (chủ ý) |
| `<Button>` primitive | 218 | **378** | +160 call site |
| `<input>` raw | 289 | **149** | |
| `<select>` raw | 52 | **27** | |
| `<Input>` primitive | 33 | **173** | |
| `<Select>` primitive | 14 | **40** | |
| `<Field>` | 107 | **265** | |
| `<table` raw | 11 | 12 | +1 bảng trong modal |
| `<DataTable>` | 35 | **36** | |
| `chrome` | 134 | **0** | tier tối đã xoá |
| `text-[10px]/[11px]` | 0 | **0** | |
| `min-h-screen/h-screen` | 0 | **0** | |
| `: any` | 138 | **138** | không đổi |
| `as any` | 62 | **62** | không đổi |
| `isVi ?` | 1193 | **1218** | +25: chủ yếu `label=`/`placeholder=`/`aria-label=` mới (a11y), không đổi copy cũ |

- **Diff**: 97 file, +7 942 / −7 283 dòng.
- **Browser**: 14 route × 390/768/1440 = 42 tổ hợp, **0 tràn ngang**.

---

## 3. Decision log

| Ngày | ID | Quyết định | Lý do | Ảnh hưởng |
|---|---|---|---|---|
| 2026-10-19 | D-1 | `primary = #1C1917` | Theo AURA; user chốt | Toàn app |
| 2026-10-19 | D-2 | Teal giữ cho `info` | Nhận diện + trạng thái đang xử lý | `--color-info`, `info-tint` |
| 2026-10-19 | D-3 | Bỏ chrome tối | AURA không có; đồng bộ | 11 file |
| 2026-10-19 | D-4 | No-dep | AGENTS.md | Không motion lib |
| 2026-10-19 | D-5 | UI-only | Giảm rủi ro song song | Không backend |
| 2026-10-19 | D-6 | Giữ thang chữ | Tránh reflow toàn app | Typography |
| 2026-10-19 | D-7 | Không gom i18n | Tránh xung đột 1193 chuỗi | Chuỗi giữ nguyên |
| 2026-10-19 | D-8 | Data honesty | Bất biến repo | Không mock mới |

### Quyết định phát sinh (ghi khi gặp)

| Ngày | Wave | Vấn đề | Quyết định | Người quyết |
|---|---|---|---|---|
| 2026-10-19 | 3 | Sheet cạnh trượt bị `rounded-none` (thứ tự CSS) | `placement=right` → `rounded-l-modal`; `left` → `rounded-r-modal`; fullscreen giữ `rounded-none` | orchestrator |
| 2026-10-19 | 3 | Header storefront `h-20` vs topbar console `h-14` | Chốt **h-20 cho storefront**, `h-14` cho console; ghi vào §3.10 | orchestrator |
| 2026-10-19 | 3 | `EmptyState` bị dùng 2 nút | Chốt **1 nút trong `action` + 1 link chữ phụ** dưới description | orchestrator |
| 2026-10-19 | 3 | `DesignerPayoutsTab` render mock như thật | Không xoá/nối DB; thêm banner **"Dữ liệu mẫu — chưa nối bảng quyết toán thật."** | orchestrator |

---

## 4. Gate log

| Ngày | Wave | `lint` | `build` | `check` | `loop-audit` | Ghi chú |
|---|---|---|---|---|---|---|
| 2026-10-19 | baseline | ✅ | ✅ | ✅ 9/9 | 8 | trước redesign |
| 2026-10-19 | 0 — F0 | ✅ | ✅ | ⚠️ 16/17 | — | `verify-rls` timeout mạng (live gate), không liên quan diff CSS |
| 2026-10-19 | 1 — S1..S5 | ✅ | ✅ | — | — | `isVi ?` = 1193 (khôi phục CTA bị bỏ ở CartView) |
| 2026-10-19 | 2 — C1..C6 | ✅ | ✅ | ⚠️ 16/17 | — | chỉ `verify-rls` đỏ vì `fetch failed` (live) |
| 2026-10-19 | 3 — review | ✅ | ✅ | ✅ static | — | 16/17 gate; R1 0B/15M; R2 10B/14M |
| 2026-10-19 | 3 — integrator | ✅ | ✅ | — | — | I1/I2/I3 xong; 3 file handoff + 3 integration log |
| 2026-10-19 | 4 — verify | ✅ | ✅ | ✅ 16/17 | 57.8 (full) | `verify-rls` đỏ vì DNS; browser 42 tổ hợp 0 overflow |

> **Đọc score cho đúng**: `score = gatesFailed×10000 + … + round(distMB×5×10)/10`.
> Lần chạy `--quick` bỏ build nên `distMB = 0` ⇒ score ≈ 8. Lần chạy **full** luôn ≈ 58
> (lần full gần nhất trước đợt này: **58.4**). Vì vậy 57.8 là **cải thiện**, không phải hồi quy;
> chênh lệch chỉ do so sánh full với quick.

---

## 5. Hoàn nguyên

Nếu một workstream fail gate:

```bash
# chỉ hoàn nguyên file của workstream đó
git checkout -- <danh sách file trong PLAN.md §4>
```

Ghi vào §3 (quyết định phát sinh) lý do + hướng chạy lại.

---

## 6. Ghi chú mở

- **Browser verification đã chạy** (Playwright headless, `/tmp/opencode/ui-smoke.mjs`, ngoài repo):
  14 route × 390/768/1440 = **42 tổ hợp, 0 tràn ngang**, 0 icon-only thiếu label,
  0 field thiếu label sau khi vá 4 hidden file input. Ảnh: `/tmp/opencode/ui-smoke/shots/`.
- **Console error duy nhất do môi trường**: `ERR_NAME_NOT_RESOLVED` tới
  `vcxarjwzbihvurpkcufa.supabase.co` (DNS sandbox hỏng — `getent hosts` cũng fail).
  `verify-rls` đỏ vì cùng lý do, **không phải hồi quy code**.
- **Cảnh báo React `key` trên `/auth/register` là có sẵn từ HEAD** (đã kiểm bằng worktree
  baseline `3101`): không phải do đợt redesign. Ghi nợ, không sửa trong đợt UI.
- **Segmented/kanban dùng raw `<button>` là chủ ý** (giữ recipe §3.6/§3.7); không phải bỏ sót.
- **2 rủi ro dữ liệu đã biết** (không sửa trong đợt UI): `DesignerPayoutsTab` mock đã được
  dán nhãn "Dữ liệu mẫu"; `LoginView` còn `alert()` trong nhánh chết (`ENABLE_PASSWORD_RESET=false`).
- **`docs/database/schema.md` lệch** so với DB thật — không thuộc đợt này.
