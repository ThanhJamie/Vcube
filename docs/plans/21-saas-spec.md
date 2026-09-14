# 21 — Spec redesign: Modern SaaS (hợp đồng thi công)

Đợt 11. Thay thế một phần `docs/plans/12-ui-refactor-spec.md` (xem §1 — 3 điểm ĐẢO quyết định cũ).
Bằng chứng nền: `docs/plans/15-ui-audit.md` (đo bằng Playwright).

---

## 0. Quyết định chủ dự án ở cổng duyệt (đã chốt — không tự đổi)

| # | Câu hỏi | Chốt |
|---|---|---|
| 1 | Phạm vi shell | **Ngôn ngữ SaaS cho MỌI trang** + **shell dashboard (sidebar + topbar) cho khu đã đăng nhập**. Storefront vẫn là trang bán hàng, không thành dashboard |
| 2 | Mức độ | **Làm sâu: tái cấu trúc bố cục từng trang** (không chỉ đổi da) |
| 3 | Thứ tự | **Nền tảng trước**, rồi từng đợt áp dụng từng nhóm trang |
| 4 | Bán kính | **Đổi sang bán kính SaaS** (§1.1) |
| 5 | Viền/fill | **Viền nhạt + fill** (§1.2) |
| 6 | Mật độ | **Mật độ SaaS** — dày vừa (§1.3) |

---

## 1. 🔴 Ba điểm ĐẢO quyết định trước — ghi rõ để không ai tưởng là lỗi

### 1.1 Bán kính: bỏ pill cho nút
| Phần tử | Cũ (Đợt 5-pre) | **Mới (SaaS)** |
|---|---|---|
| Nút, CTA | `rounded-full` (pill) | **`rounded-md` (8px)** |
| Card, panel | `rounded-lg` (20px) | **`rounded-lg` → 12px** |
| Ô nhập, select | `rounded-md` (12px) | **8px** |
| Badge, chip | `rounded-sm` (8px) | **6px** |
| Avatar, chấm trạng thái, pill đếm | `rounded-full` | **giữ `rounded-full`** (đúng hình dạng) |
| Modal, sheet | `rounded-lg` | **14px** (`--radius-modal`) |

⇒ **Thang `--radius-*` trong `src/index.css` phải đổi giá trị**: `sm:6px · md:8px · lg:12px · xl:16px · modal:14px · full:9999px`. Đây là thay đổi **ở tầng token** nên 1.833 chỗ dùng `rounded-*` đổi theo — rẻ nhất.
⚠️ **Hệ quả bắt buộc phải dọn:** đổi `lg` từ 20px → 12px làm **các ô vuông nhỏ và cụm "track + chip con"** đổi hình; và bỏ pill ở `ui/Button.tsx` làm **~30 CTA hand-rolled** (đang `rounded-full` để khớp pill cũ) **lệch** với primitive. Phải rà lại (đợt áp dụng từng trang).

### 1.2 Ranh giới: viền nhạt + fill (không còn "fill thuần")
- **Card/panel**: `border border-line-subtle` **+** `bg-surface`, shadow **`e1` hoặc không**. Phân tách chính là **viền**, fill chỉ phụ.
- **Bảng**: có đường kẻ hàng (`divide-line-subtle`), header dính.
- **Ô nhập/select**: `border-line-control` (giữ — cần ≥3:1 cho WCAG 1.4.11).
- **Vẫn cấm** viền trang trí vô nghĩa quanh mọi khối: chỉ card/panel/bảng/ô nhập mới có viền.

### 1.3 Mật độ SaaS
| Hạng mục | Cũ | **Mới** |
|---|---|---|
| Hàng bảng | thoáng | **40–44px** |
| Padding panel | 20–24px | **16–20px** |
| Icon trong control (nút, ô nhập, tab) | ≥18px | **16px** |
| Icon điều hướng sidebar | 18–20px | **18px** (giữ) |
| Icon trong thẻ KPI / empty state | 20–30px | **giữ 20–30px** (không thu nhỏ) |
| Body text | 15px | **14px** |
| Nhãn phụ / caption | 12px | **12px** (giữ, đây là sàn) |

⚠️ **Sàn 12px vẫn bất khả xâm phạm** (gate `text-[Npx] < 12` = 0). Thu nhỏ icon control **không** được làm vùng bấm < 44×44 ở mobile — dùng padding để bù.

---

## 2. Ngôn ngữ thị giác SaaS — quy tắc cụ thể

1. **Trung tính trước, 1 màu nhấn.** Giữ **teal** làm màu nhấn duy nhất (`--color-primary`). Các màu trạng thái (`positive/warning/danger/info`) **chỉ** dùng cho trạng thái thật, không dùng trang trí. **Giảm** số chỗ dùng `*-tint` xuống: tint chỉ cho badge trạng thái và dải cảnh báo, **không** cho nền thẻ KPI.
2. **Thang chữ có thật** (`--text-xs 12 · sm 13 · base 14 · lg 16 · xl 20 · 2xl 24 · 3xl 30 · 4xl 38`), heading `tracking-tight`, **số liệu dùng `tabular-nums`** (bảng, KPI, tiền, tiến độ).
3. **Nhịp dọc nhất quán**: giữa các section `24px` (`space-y-6`), trong section `16px`, giữa nhãn và giá trị `4px`. **Không** dùng giá trị lẻ tuỳ hứng.
4. **Bóng tối giản**: `e0` cho card trong bảng, `e1` cho card nổi, `e2` cho dropdown/popover, `e3` cho modal. **Không** bóng cho phần tử trong luồng.
5. **Bề rộng nội dung**: khu dashboard `max-w-[1400px]`; trang đọc (chi tiết, hoá đơn) `max-w-3xl`.
6. **Chuyển động**: 120–200ms, `ease-out`; không nảy. Tôn trọng `prefers-reduced-motion`.
7. **Trạng thái bắt buộc cho mọi vùng dữ liệu**: loading (skeleton đúng hình), rỗng (`EmptyState` + CTA), lỗi (nói thật + hành động), có dữ liệu. **Không** dùng spinner toàn trang.
8. **Icon**: lucide qua `ui/Icon` (đã migrate xong). Không emoji làm icon.

---

## 3. Shell cho khu đã đăng nhập (điểm "dashboard" thật sự)

**Một `AppShell` dùng chung cho `/admin`, `/lab`, `/designer`, và khu tài khoản** (`/orders`, `/assets`), gồm:
- **Sidebar trái** (240px, thu gọn 64px được): logo nhỏ, nhóm mục có nhãn nhóm, mục đang chọn có nền `surface-muted` + vạch nhấn trái, badge số chỉ hiện khi >0.
- **Topbar** (56px): breadcrumb, ô tìm kiếm lệnh, nút hành động chính, avatar menu. **Không** lặp lại nav storefront.
- **Vùng nội dung**: `PageHeader` (tiêu đề + mô tả + hành động) rồi các `Section`.
- Storefront (`/`, `/explore`, `/products/:id`, `/quote`, `/cart`, `/checkout`) **giữ topbar storefront**, chỉ mang **ngôn ngữ thị giác** SaaS — không sidebar.

⚠️ **Đây là thay đổi lớn**: `/admin` đã có shell riêng (`AdminSidebar` + `AdminDashboardView`). `/lab` đang được mở (W1a/W1b). `/designer` **chưa có shell**. Nên đợt áp dụng phải làm **từng khu một**, không gộp.

---

## 4. Primitive cần có (trong `src/frontend/ui/`)

| Primitive | Trạng thái | Việc |
|---|---|---|
| `Button` | có | đổi `rounded-full` → **`rounded-md`**; thêm `size="sm"` cho toolbar; giữ 5 biến thể |
| `Card` | có | thêm **viền `line-subtle`** + `shadow-e1`; giữ `padding` prop; thêm `interactive` |
| `StatCard` | có, **1 file dùng** | cập nhật theo mật độ mới + `tabular-nums`; **bỏ tint nền**, dùng nhãn + số + delta |
| `DataTable` | có, **0 file dùng** | hàng **40–44px**, header dính, `divide-line-subtle`, cột số `tabular-nums`, ô rỗng hiện `—`, có slot `empty` |
| `EmptyState` | có, 8 file | giữ; thêm `size="sm"` cho vùng nhỏ |
| `PageHeader` | **THIẾU** | **mới**: `title`, `description`, `actions`, `breadcrumb`, `tabs` |
| `Section` | **THIẾU** | **mới**: `title`, `description`, `actions`, `content`, nhịp dọc chuẩn |
| `Toolbar` | **THIẾU** | **mới**: `search`, `filters`, `viewToggle`, `bulkActions` — một hàng, cao 44px |
| `KeyValue` | **THIẾU** | **mới**: danh sách nhãn/giá trị cho trang chi tiết (hoá đơn, hồ sơ, đơn hàng) |
| `AppShell` (+ `SideNav`, `Topbar`) | **THIẾU** | **mới**: dùng cho §3 |
| `ConfirmDialog` | có, **0 file dùng** | giữ |
| `Sheet`, `Modal`, `Tabs`, `Badge`, `Skeleton`, `Field`, `Input`, `Select`, `Money`, `ProgressBar`, `ToastViewport`, `Icon` | có | rà lại theo token/bán kính mới |

---

## 5. Gate cho mọi đợt redesign (giữ nguyên toàn bộ gate hiện có, **cộng thêm**)

Bắt buộc, RC=0 hết:
```
npm run lint                                        # tsc --noEmit
npx vite build --outDir /tmp/vc-verify-<tên> --emptyOutDir
node scripts/check-contrast.mjs                     # WCAG — ĐÂY LÀ GATE DỄ VỠ NHẤT khi đổi bảng màu/mật độ
node scripts/check-fabricated.mjs                   # 0/116
node scripts/lint-rls-sources.mjs
node scripts/lint-rls-migration.mjs
```
**Grep chứng minh (phải = 0):** palette thô · `bg-white|text-white|border-white|bg-black` · `(text|bg|border)-[#` · `text-[Npx]` với N<12 · emoji cờ · `font-serif`.

**Nghiệm thu thị giác bắt buộc:** Playwright/Edge trên **build tĩnh + `vite preview --host 0.0.0.0` cổng riêng** (Edge gọi **IP WSL**), **retry ≤3**, ảnh **trước/sau** ở **390 / 1024 / 1440**, **light + dark** cho trang đã sửa. Đo bằng số, không bằng cảm giác:
- `scrollWidth === clientWidth` ở 390px (không tràn ngang).
- **0** phần tử chữ nằm trên nền có tương phản < 4.5:1 (quét computed style).
- Bán kính đúng thang mới (quét `borderRadius` thật).
- Mật độ: chiều cao hàng bảng trong khoảng 40–44px.
- **0** `pageerror`.

---

## 6. Thứ tự thi công

**Đợt 11A — nền tảng (chạy ngay, không xung đột agent nào):** `src/index.css` (token) + `src/frontend/ui/**` (primitive cũ + 5 primitive mới) + cập nhật `docs/design/tokens.md` và `docs/plans/12-ui-refactor-spec.md` cho khớp §1.

**Đợt 11B trở đi — áp dụng từng nhóm trang** (chờ 5 agent Đợt 9/10 xong để không tranh file), mỗi nhóm **duyệt riêng** vì chủ dự án chọn "tái cấu trúc bố cục từng trang":
1. Shop shell + `AppShell`/`SideNav`/`Topbar` (khu đã đăng nhập).
2. `/admin` (17 mục) — đã có sidebar, chuyển sang `AppShell` + `PageHeader` + `DataTable`.
3. `/lab` (mới mở) + `/designer`.
4. Storefront: `/`, `/explore`, `/products/:id`.
5. Funnel: `/quote`, `/cart`, `/checkout`, `/order-success`, `/tracking`, `/orders`, `/assets`.
6. Auth: `/auth/login`, `/auth/register`, 404.

---

## 7. Rủi ro đã biết (phải theo dõi)

1. **`check-contrast.mjs` dễ vỡ nhất** — đổi bán kính/mật độ/màu đều có thể làm rớt tương phản. Chạy sau **mỗi** thay đổi token, không chỉ cuối đợt.
2. **1.833 chỗ `rounded-*` đổi theo token** ⇒ phải rà **ô vuông nhỏ** và **cụm track + chip con** (bài học A19: radius lớn biến ô vuông thành hình tròn).
3. **~30 CTA hand-rolled đang `rounded-full`** để khớp pill cũ ⇒ sau khi primitive đổi, chúng **lệch** — phải đưa về `ui/Button`.
4. **450+ chỗ card tự dựng** ⇒ đây là phần lớn công việc; phải làm theo nhóm, có ảnh trước/sau.
5. Đổi `index.css`/`ui/**` **ảnh hưởng mọi trang cùng lúc** ⇒ nếu làm khi agent khác đang chạy Playwright, test của họ có thể lệch hình học. **Phải báo các agent đang chạy.**
