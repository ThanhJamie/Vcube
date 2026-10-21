<!-- doc-meta: status=active; verified=2026-10-19; owner=integrator-I2 -->
# Integration I2 — Storefront / App / Header / Auth

Phạm vi: 11 file được giao. Không sửa `src/index.css`, `src/frontend/ui/**`, backend/store/types/scripts.
Không đổi props/state/service/chuỗi `isVi ?`; chỉ thêm a11y (aria, Esc, click-outside) theo danh sách review.

## Đã xử lý

| Mục | File:line | Cách sửa |
|---|---|---|
| R1 #5 | `views/ExploreView.tsx:865` | Bỏ `bg-primary-tint` (class chết) khỏi `Card`; thay `ring-2 ring-primary`, giữ `border-primary/30` + toàn bộ nội dung/CTA |
| R1 #6 | `App.tsx:217-221`, `:330-338`, `:340-346` | 3 CTA thô `rounded-full` → `<Button variant="primary\|secondary" size="lg">`; giữ nguyên onClick + chuỗi |
| R1 #7 | `components/Header.tsx:300-313` | Xác nhận `.mobile-nav-backdrop/.mobile-nav-panel` đã token hoá ở Wave 0 (`z-drawer`, `bg-surface`, `shadow-e3`, `rgb(28 25 23/.4)`); bỏ 3 `!important` không còn cần (`bg-fg/40!`, `bg-surface!`, `shadow-e3!`) |
| R1 #8 | `components/Header.tsx:153` | Xác nhận đúng §3.10: `h-20`, `bg-canvas/90 backdrop-blur-md`, `z-header`; không đổi |
| R1 #9 | `views/ProductDetailView.tsx:317-352` | Segmented 3D/Gallery về §3.6: track `bg-surface-muted p-1`; item active `bg-surface text-fg shadow-e1 font-semibold`; bỏ `variant="primary"`, giữ `aria-pressed` |
| R1 #14 | `views/HomeView.tsx:602-606`, `:970`; `views/ExploreView.tsx:1019`, `:1044` | Bỏ `group-hover:scale-105/110` + `transition-transform`/`scale-110` trên ảnh/icon; giữ đổi màu và `hover:shadow-e1` |
| R1 #16 | `views/CartView.tsx:106-137` | EmptyState còn **1 nút** trong `action` ("Khám Phá Bản Vẽ CAD"); "Báo Giá Mesh STL" thành link chữ dưới description, giữ `onNavigate('tool_3d')` |
| R1 #17 | `views/ExploreView.tsx:934-1011` | EmptyState chỉ còn 1 CTA trong `action`; CTA phụ ("Báo giá…"/"Xóa bộ lọc") + `InfoTip` chuyển thành link/chú thích dưới description |
| R1 #19 | `views/HomeView.tsx:919` | "Reset All Filters" thêm `variant="secondary"` |
| R1 #20 | `components/Header.tsx:186-193` | Xác nhận §3.10: active = chữ `text-fg font-semibold` + gạch chân 2px `border-primary`; thêm `aria-current` (xem R2 #18) |
| R1 #30 | `views/ProductDetailView.tsx:1007`; `views/PersonalizeView.tsx:1055` | Sticky bar mobile bỏ `backdrop-blur-md`, giữ `bg-surface/95` |
| R1 #32 | `views/ExploreView.tsx:1206`, `:1274-1289`; `views/HomeView.tsx:1185-1191` | Cell bảng `text-xs` → `text-sm` (header vẫn `text-xs`); giữ `font-mono`, căn phải, `tabular-nums` |
| R1 #34 | `views/CartView.tsx:106`, `:144` | Bỏ `min-h-dvh` ở wrapper empty + wrapper chính; giữ `py-16 sm:py-24` / `py-6 sm:py-10` |
| R2 #13 | `views/ProductDetailView.tsx:833-841`, `:851-859` | Thêm `id="pdp-layer-height"` + `htmlFor`; `id="pdp-engraving"` + `htmlFor` |
| R2 #14 | `views/HomeView.tsx:697` | Ô tìm kiếm CAD thêm `aria-label` theo ngôn ngữ |
| R2 #18 | `components/Header.tsx:187`, `:359` | `aria-current={isActive ? 'page' : undefined}` cho nav desktop + mobile |
| R2 #20 | `components/Header.tsx:298-313` | **Giữ** `div role="dialog"` (được phép) — đã có focus trap (`:92-122`), Esc (`:80-87`), backdrop (`:300-303`), `useBodyScrollLock`, trả focus; CSS đã token hoá |
| R2 #21 | `components/auth/UserAvatarMenu.tsx:46-57`, `:127-128`, `:139-141` | Thêm `useEffect` Esc + `pointerdown` ngoài `containerRef`; Esc trả focus về `triggerRef`; `aria-expanded`, `aria-haspopup="dialog"`, `aria-controls`, panel `role="dialog"` có tên |
| R2 #22 | `components/CartDrawer.tsx:76-84` | Xác nhận `placement="right"` đã cho `rounded-l-modal` ở `ui/Modal`; call site không truyền `rounded-none`, không sửa |
| R2 #23 | `components/CartDrawer.tsx:229`, `:240` | `aria-label` đầy đủ `Giảm/Tăng số lượng ${item.name}` (kèm bản EN) |
| R2 #26 | `components/CartDrawer.tsx:182` | Heading sản phẩm `h4` → `h3` (giữ `h2` ở drawer header) |
| R2 #29 | `components/Header.tsx:214-216` | Nút search icon-only đổi label "Mở menu & tìm kiếm" + `aria-expanded` + `aria-controls="vcube-mobile-nav"` |

Tổng: **22 mục review** — 18 mục sửa code, 4 mục xác nhận đã đúng/được phép giữ (R1 #8, #20; R2 #20, #22).

## Bỏ qua / không sửa

| Mục | Lý do |
|---|---|
| R2 #20 → chuyển hẳn sang `<Sheet>` | Brief cho phép giữ `div role="dialog"` khi đã có focus trap/Esc/backdrop và token hoá. Đã kiểm đủ 4 điều kiện; chuyển Sheet là rewrite cấu trúc lớn, rủi ro focus/scroll-lock cao hơn lợi ích |
| R1 #7 CSS `.mobile-nav-*` | `src/index.css` ngoài quyền sở hữu; Wave 0 đã token hoá. Chỉ dọn `!important` ở call site |
| R2 #26 `AuthModal` `h4` | File không thuộc 11 file được giao |
| R1 #34 các view còn lại (`MyOrders`, `Personalize`, `ProductDetail`, `Explore`, `Home`) | Brief chỉ chỉ định bỏ `min-h-dvh` ở `CartView`; các view khác để nguyên tránh mất chiều cao shell ngoài phạm vi |
| R1 #29 các `text-primary` khác trong `PersonalizeView` (`:505`, `:684`, `:712`, `:756`, `:881`, `:971`) | Chỉ các dòng 295/305/427/493 được giao; phần còn lại là icon/nhấn mạnh, không đổi |
| R2 #7 tab 34px, R2 #1 raw button thiếu ring ngoài 11 file | Ngoài danh sách review của I2 |

## Gate

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | **PASS** — exit 0 |
| `npm run build` | **PASS** — exit 0, `✓ built in 10.02s` |
| `node scripts/check-contrast.mjs` | **PASS** — exit 0; `47/55 pass, 8 expected non-pass, 0 unexpected fail` |
| `node scripts/check-contrast-combos.mjs` | **PASS** — exit 0; quét 99 file, `0 tổ hợp class vi phạm` (34 cảnh báo sát ngưỡng 4.61:1, không tính RC) |
| `grep -c "chrome"` 11 file | **PASS** — 0/0/0/0/0/0/0/0/0/0/0 |
| Lệch số dòng so với trước khi sửa | Lớn nhất `UserAvatarMenu +20 dòng (4.85%)`, `ExploreView +16 (1.17%)`, `ProductDetailView +14 (1.37%)`; còn lại ≤4 dòng |

## Rủi ro

1. **Link phụ nằm trong `description` của `EmptyState`**: `EmptyState` render description trong `<p>`, nên link chữ là `<button>` (phrasing content) bọc trong `<span className="block">`. Hợp lệ HTML nhưng là giải pháp vì `ui/EmptyState` read-only; nếu primitive sau này đổi sang `<div>` thì nên tách slot `descriptionAction`.
2. **Drawer mobile vẫn là `div role="dialog"`**: giữ theo ngoại lệ được duyệt; không có top-layer/inert native. Focus trap/Esc/backdrop là thủ công, cần browser xác nhận lại ở 390 (đặc biệt toast `z-toast` so với `z-drawer`).
3. **`UserAvatarMenu` là non-modal `role="dialog"`**: Esc trả focus, click ngoài không cướp focus; panel không tự nhận focus khi mở bằng chuột (mở bằng hover). Cần smoke bàn phím: Tab vào panel, Esc đóng, click ngoài đóng, `aria-expanded` cập nhật.
