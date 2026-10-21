<!-- doc-meta: status=active; verified=2026-10-20; owner=ui-auditor -->
# AUDIT-SUMMARY — W0 UI audit (Soft Studio v3)

> **Snapshot:** `HEAD 97cc256` + working tree **2026-10-20 11:2x**.
> **Phạm vi:** read-only (`docs/tasks/ui-redesign-v3/**` only) — **0 file `src/**` bị sửa**.
> **Đầu ra:** `ROUTE-MATRIX.md`, `UI-DEFECTS.md`, `COPY-GLOSSARY.md`, `AUDIT-SUMMARY.md`.
> **Giới hạn:** Supabase paused ⇒ **không** chụp browser, không xác nhận được state dữ liệu thật;
> các mục cần ảnh ghi `verify-in-browser`. Trong lúc audit, `design-foundation` sửa song song
> `src/App.tsx`/`Header.tsx`/`index.css` và **đã đóng 3 defect ngay trong phiên** (UI-002, UI-012,
> UI-017 tại 11:3x) ⇒ line number trong register đã cập nhật lại; mỗi mục kèm chuỗi trích dẫn.

---

## 1. TL;DR

- **Hệ route ổn định:** 30 route = **23 màn thật + 7 redirect**; đúng 5 module lazy; guard 2 tầng
  (`ProtectedRoute` + `RoleGuard`) — không có route mồ côi, không có link chết.
- **Nền v2 đã dọn rất nhiều nợ data-honesty:** fixture `PRODUCTS`/`MOCK_ORDERS`/`PAYOUT_TRANSACTIONS`/
  `SAMPLE_ANALYSIS_FILES` đều **rỗng**; "Live Telemetry"/"Digital Twin" đã gỡ; `format.ts` là một nguồn
  format duy nhất. Audit **không** phát hiện lại các defect cũ → đừng "sửa" lại.
- **Vấn đề lớn nhất của v3 không phải layout mà là (a) copy VI-only chưa sạch** và
  **(b) vài điểm a11y/overlap nhỏ nhưng ảnh hưởng toàn hệ**. Không có P0 xác nhận tĩnh.
- **Đếm defect:** **P0 = 0** (1 ứng viên cần browser) · **P1 = 11** (1 đã đóng) · **P2 = 18** (2 đã đóng)
  · **P3 = 11** → **40**; **còn mở 37**, P0/P1/P2 còn mở = **26** ≥ yêu cầu 15.
- **Điểm chặn W1 (foundation):** phải chốt **ký hiệu tiền `₫` vs `đ`** và **allowlist mở rộng**
  (Slicer/Infill/Support/Layer/Batch/Hub/Studio/Score). **Ledger contrast đã xong trong phiên**: token v3
  (`#F6F7EF/#FFFDF9/#F5F4EC`) đo lại `fg-subtle 4.56–4.95`, `check-contrast` 0 unexpected fail,
  `check-contrast-combos` 0 vi phạm — còn **34 vị trí 4,56:1** phải giữ nguyên không hạ thêm.

---

## 2. Đếm theo mức

| Mức | Số | Nội dung chính |
|---|---:|---|
| P0 | 0 xác nhận | 1 ứng viên còn lại: `ProtectedRoute` trắng (UI-001); ứng viên drawer (UI-002) đã được W1 sửa |
| **P1** | **11** (đóng 1: UI-002) | 6 nhóm English hiển thị lẫn VI (storefront, eyebrow, onboarding, role, admin, tool3d, designer) · CTA trùng PDP · 2 lỗi state guard |
| **P2** | **18** (đóng 2: UI-012, UI-017) | primitive drift (`<button>`/`<input>` raw) · FAB đè bottom-bar · scroll lồng · nested table scroll · z-index ngoài thang · anchor offset · duplicate affordance header · EN hiển thị |
| **P3** | **12** | nit copy (Vietnam/Marketplace/File/nav label), aria EN, placeholder admin EN, dead primitive, `z-[100]`, ký hiệu tiền `₫` vs `đ` |
| **Tổng** | **41** | **còn mở 38** |

**Bằng chứng đã chạy:** `node scripts/check-contrast.mjs` → **0 unexpected fail** (ledger v3 liệt kê 12 expected
non-pass: coral không làm chữ, `fg-subtle` trên tint/pastel bị cấm); `node scripts/check-contrast-combos.mjs`
→ **0 vi phạm**, **34 chỗ sát ngưỡng 4,56:1**.

---

## 3. Top 10 ưu tiên (thứ tự đề xuất)

| # | ID | Mức | Vấn đề | Bằng chứng | Owner |
|---|---|---|---|---:|---|
| 1 | **UI-001** | P1 (→P0?) | `ProtectedRoute` trả `null` khi khôi phục phiên ⇒ `/orders`, `/assets` **trắng màn** | `App.tsx:93-101` vs `RoleGuard.tsx:39-44` | W1 foundation |
| 2 | **UI-003/004** | P1 | Storefront VI còn **badge + eyebrow tiếng Anh** (4 badge dịch vụ, 10 eyebrow `// ENGLISH`) | `ServiceShowcaseSection.tsx:37,78,119,160,253,406,592,610`; `HomeView.tsx:361,655,1305`; `MyOrdersView.tsx:138`; `PersonalizeView.tsx:428` | W2 storefront |
| 3 | **UI-005/006** | P1 | Trạng thái duyệt + nhãn vai trò hiển thị `Pending/Verified/Admin/Creator/Lab Hub/Customer` | `WorkshopOnboardingWizard.tsx:465…1399`; `Group1WorkshopsPanel.tsx:1473-1474`; `AuthModal.tsx:200-221`; `RoleGuard.tsx:67-74` | W3 ops + W2 auth |
| 4 | **UI-007** | P1 | Console admin dày nhãn tiếng Anh (`Landing Page CMS`, `Hero`, `Headline`, `Badge`, `Profile Slicing`, `Slicing`, `Support`, `Infill`, `Batch`) | `AdminStorefrontPanel.tsx:129…777`; `AdminSeoPanel.tsx:92-94,567`; `AdminSettingsPanel.tsx:248`; `AdminProductsPanel.tsx:462,587,599,735`; `PricingConfigPanel.tsx:326,328,344,2157` | W3 admin |
| 5 | **UI-008** | P1 | PDP 390 hiển thị **4 CTA mua cùng lúc** (2 trong card + 2 ở bottom bar) | `ProductDetailView.tsx:716,733,1007-1031` | W2 pdp-viewer |
| 6 | **UI-016** | P2 (→P1?) | FAB `z-drawer` (40) đè bottom-bar PDP `z-sticky` (10), chỉ tự ẩn sau 400ms | `App.tsx:1885`; `ProductDetailView.tsx:1007`; `src/index.css:174`; `App.tsx:996` | W1 foundation |
| 7 | **UI-039** | P3 (chặn W1) | Ký hiệu tiền **`₫` vs ` đ`** không nhất quán và **xung đột PLAN §5.5** | `format.ts:124-142`; `Money.tsx:5`; `WarehouseInventoryPanel.tsx:201,333…`; `docs/tasks/ui-redesign-v3/PLAN.md:122` | Lead chốt + W1/W3 |
| 8 | **UI-009/011** | P1 | Tool3D + PDP còn English kỹ thuật (`Risk Score`, `Print Settings`, `Unit Verification`, `Share`, `Engineering Studio`) | `Tool3DView.tsx:1863,616,939`; `StlVs3mfComparisonModal.tsx:49,51`; `StlUnitConfirmModal.tsx:47`; `QuoteSummaryPanel.tsx:302,542,544`; `ProductDetailView.tsx:307,524` | W3 tool3d + W2 pdp |
| 9 | **UI-014/015** | P2 | **Primitive drift**: 429 `<button>` raw / 341 `<input/select>` raw (PricingConfigPanel 73, AuthModal 14, UserAvatarMenu 13) | xem `UI-DEFECTS.md` §3 | W2/W3 (chỉ bề mặt sửa) |
| 10 | **UI-020/021/023** | P2 | Scroll lồng: bảng invoice 720px trong modal 390, kanban 2100px, `z-[100]` ngoài thang z | `InvoiceModal.tsx:191`; `InternalCostBreakdownModal.tsx:223`; `Group5ProductionPanel.tsx:564`; `ModelViewer3D.tsx:1712` | W2/W3 |

**Đã đóng/giảm ngay trong phiên (W1 foundation, 11:3x):** ✅ UI-002 (drawer mobile cuộn được — `index.css:446-470`),
✅ UI-012 (toast có `role=status` + `aria-live=polite` — `App.tsx:1902-1906`), ✅ UI-017 (ledger contrast v3 đo lại
≥4.5:1), ◐ UI-018 (thêm `.nav-fade-right` — cần verify 1024). Ba mục đóng chuyển sang **regression check** ở W6.

**Lưu ý với W1:** handoff ghi "Header VI-only" nhưng nav vẫn còn `Quản Trị Admin` / `Studio Thiết Kế` và
wordmark `Vietnam` (UI-041/A25/A26) — cần đóng nốt hoặc ghi ngoại lệ brand được duyệt.

**Việc W1 còn lại có thể đóng ngay trong 1 buổi (ít rủi ro, tác động rộng):** UI-001 (dùng `PageSkeleton`),
UI-040 (`Render Error`), UI-018 (affordance nav `lg–xl`), UI-027 (gộp affordance header), UI-025 (2 nút nổi
cùng góc), UI-038 (PageSkeleton theo surface), UI-039 (chốt ký hiệu tiền). Đều là **thêm/sửa nhỏ**, không đổi layout.

---

## 4. Top 5 rủi ro (và cách chặn)

| # | Rủi ro | Mức | Cách chặn |
|---|---|---|---|
| 1 | **Snapshot trôi do sửa song song:** W1 đã sửa `App.tsx`/`Header.tsx`/`index.css` trong lúc audit (đóng UI-002/012/017, đổi token v3) ⇒ line number/ledger trong register lệch nếu không cập nhật | Cao | Mỗi defect có **chuỗi trích dẫn**; QA đối chiếu theo chuỗi; cập nhật line khi đóng defect (đã làm 1 lần lúc 11:3x) |
| 2 | **Copy VI-ONLY tái phát khi W2/W3 viết màn mới** (đặc biệt panel admin mới + label form) | Cao | `COPY-GLOSSARY.md §6` grep checklist trước handoff; QA grep bước 2; glossary §2 chốt allowlist |
| 3 | **Token v3 làm rơi contrast ở bề mặt mới:** ledger hiện đạt (`fg-subtle 4.56–4.95`, 0 unexpected fail) nhưng 34 chỗ chỉ 4,56:1 và coral/brand bị cấm làm chữ (3.10–3.35) | Trung bình | QA chạy lại `check-contrast`/`-combos` sau **mỗi** wave; cấm `fg-subtle` trên `line-subtle` (4.30)/tint/pastel; không dùng coral làm chữ nhỏ |
| 4 | **Primitive drift** (429 `<button>` raw vs 214 `<Button>`; 341 `<input/select>` raw vs 89 primitive; `PricingConfigPanel` 73 raw input) ⇒ mỗi màn sửa một kiểu, không đạt "hệ thống" | Trung bình–Cao | Chỉ chuyển primitive **trên bề mặt đang sửa** (không refactor toàn repo); ghi ngoại lệ trong handoff; review-consistency kiểm lại |
| 5 | **Supabase paused ⇒ không kiểm được data-state thật**: dễ "sửa cho đẹp" trên empty state rồi sai khi có dữ liệu; guard/auth UI chưa verify được | Trung bình | QA chụp 4 state bằng fixture tạm **trong môi trường test**, không commit; W6 chạy lại khi Resume; mọi kết luận thiếu ảnh ghi `verify-in-browser` |

---

## 5. Đã kiểm và **không** phải defect (chống báo sai)

Các điểm thường bị audit nhầm nhưng hiện **đạt**:

1. **Không có page-level overflow 390** trong code tĩnh: bảng đều có `overflow-x-auto`, nav desktop có
   `overflow-x-auto`, 3D fullscreen khoá `body overflow` (`PersonalizeModelViewer3D.tsx:172-175`,
   `ModelViewer3D.tsx:335-338`) ⇒ `w-screen` không tràn.
2. **Modal/Sheet cuộn tốt:** `<dialog>` + `showModal()`, body `min-h-0 flex-1 overflow-y-auto`,
   bottom sheet `max-h-[85dvh]`, ESC/backdrop/focus-trap có (`ui/Modal.tsx:115-155,332-348`,
   `ui/Sheet.tsx`).
3. **Không có `<img>` thiếu `alt`**, không có input thiếu label chắc chắn, không có phần tử
   `outline-none` thiếu `focus-visible:ring` (đã quét toàn `src/frontend`).
4. **Không có link chết** (`href="#"`/`javascript:` = 0); toàn bộ `to="/..."` khớp 30 route.
5. **Mock/fixture đã bị rỗng hoá** (`mockData.ts:60,70,225`); `SAMPLE_ANALYSIS_FILES[0]` có guard
   (`Tool3DView.tsx:308-318`).
6. **`/personalize/:productId` sai id ⇒ `NotFoundView`** (không còn fallback `products[0]` cho id sai —
   chỉ `/personalize` không id mới lấy sản phẩm đầu, có chủ đích).
7. **Role chip mobile ở `Header.tsx:414` đã là VI** (W1 vừa sửa) — không báo trùng.
8. **`Reorder`/`Download`** ở AssetLibrary/MyOrders có state loading riêng, không phải nút chết.

---

## 6. Quyết định cần Lead chốt (trước W1)

| # | Quyết định | Ảnh hưởng | Đề xuất |
|---|---|---|---|
| D-A | **Allowlist mở rộng** cho thuật ngữ in 3D: `Slicer, Infill, Support, Layer, Batch, Hub, Studio, Score, Watertight` | 20+ defect P1/P2/P3 đóng hay mở | Chốt: **Việt hoá** các từ này; chỉ giữ tên phần mềm (`PrusaSlicer`, `Bambu Studio`) |
| D-B | **Ký hiệu tiền:** `₫` (code hiện tại) hay `đ` (PLAN §5.5) | UI-039 + mọi bảng tiền | Giữ **`₫`** và sửa PLAN/tokens cho khớp; hoặc đổi helper sang `đ` (1 chỗ) |
| D-C | **Eyebrow `//`**: bỏ hẳn tiếng Anh sau `//` hay giữ như "kỹ thuật trang trí" có kiểm soát | UI-004 (10 vị trí) | Bỏ English; nếu muốn giữ nhịp thiết kế dùng `//` + **tiếng Việt** |
| D-D | **`Vietnam` dưới wordmark** (`Header.tsx:180,336`) | Nhận diện thương hiệu | Giữ như brand lockup (ghi ngoại lệ COPY-GLOSSARY) hoặc `Việt Nam` |
| D-E | **`Email`** (loanword) giữ hay đổi | Auth/Checkout | Giữ (đã phổ biến trong VI) — ghi vào allowlist |
| D-F | **FAB trên PDP/Personalize**: ẩn FAB hay nâng bottom-bar lên `z-drawer` | UI-016 | Ẩn FAB trên 2 route có bottom-bar (ít rủi ro hơn) |

---

## 7. Handoff W0 → W1 (foundation)

1. Đọc `UI-DEFECTS.md` §2–§4; **đóng trước** các mục còn mở có owner `W1 foundation`:
   UI-001, UI-016, UI-018(verify), UI-024, UI-025, UI-027, UI-036, UI-038, UI-039(chốt ký hiệu tiền), UI-041(nav label).
   *(UI-002, UI-012, UI-017 đã đóng trong phiên — chỉ cần regression check.)*
2. Chốt D-A…D-F ở §6 và ghi vào `DESIGN-LANGUAGE.md` + `COPY-GLOSSARY.md` (cập nhật bảng §2).
3. **Giữ nguyên ledger contrast v3 đã đo** (`fg-subtle 4.56–4.95`, 0 unexpected fail); không hạ thêm
   `fg-subtle` trên tint/pastel/`line-subtle`; mỗi wave chạy lại 2 script contrast.
4. Không sửa layout/IA/route (PLAN D6); không thêm dependency (D4).
5. Khi handoff: ghi rõ defect ID nào đã đóng + ảnh 390/768/1440 cho từng mục.

## 8. Handoff W1 → W2/W3 (page agents)

- **Storefront/PDP/Commerce:** đóng UI-003, UI-004 (storefront phần), UI-008, UI-011 (PDP), UI-015 (nếu đụng form),
  UI-019, UI-020 (invoice), dùng `COPY-GLOSSARY §4 A/B/E`.
- **Admin/Ops/Tool3D:** đóng UI-005, UI-006, UI-007, UI-009, UI-010, UI-011 (tool3d), UI-014/015 (chỉ bề mặt sửa),
  UI-020, UI-021, UI-022, UI-023, UI-026, UI-028, UI-034, UI-035, UI-037 dùng `COPY-GLOSSARY §4 B/C/D`.
- **QA (W6):** chạy lại `ROUTE-MATRIX §5` đủ 90 ảnh + 7 mục `verify-in-browser` của `UI-DEFECTS §5`;
  xác nhận 0 P0/P1/P2 trước khi tuyên bố exit criteria.
