<!-- doc-meta: status=active; verified=2026-10-23; owner=admin -->
# BUGFIX — Admin "Xưởng in & Thiết bị" UI nhảy liên tục (vòng lặp effect/handler identity)

> **Work item:** `task-41` · **Agent:** `admin` · **Ngày:** 2026-10-23
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `b78c24a` (sạch, đã push)
> **Không commit/push** · Không đổi theme/tokens/CSS/layout/IA · Không thêm dependency.
>
> ## ✅ VERDICT: **ĐÃ SỬA ROOT CAUSE** — hết vòng lặp fetch/ghi DB.
> Đo bằng Chromium headless + CDP trên **cùng một kịch bản** (build HEAD vs build sau sửa, session admin giả,
> Supabase REST intercept):
> **10s idle: 7.090 request REST + 16.206 DOM mutation → 0 request + 0 mutation**;
> `printer_fleet` có **1.418 lượt GHI DB/10s → 0**. Trang render bình thường (~0,47s), 0 pageerror.

---

## 1. Root cause (chuỗi vòng lặp)

Bug là **vòng lặp tự duy trì** giữa handler identity ở tầng App/hook và effect fetch ở panel:

| # | File:line (HEAD `b78c24a`) | Vai trò trong vòng lặp |
|---|---|---|
| 1 | `src/frontend/hooks/useCatalogData.ts:228` `const handleUpdatePrinters = (newPrinters) => {...}` | **Hàm thường ⇒ identity mới sau MỖI render** của `useCatalogData`. Cùng lỗi ở `handleUpdateMaterials:215`, `handleUpdateAccessories:239`, `handleAddNewProduct:251`, `handleUpdateProduct/DeleteProduct` |
| 2 | `src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx:111-125` `loadFleet = useCallback(..., [onUpdatePrinters])` | `onUpdatePrinters` nằm trong dep ⇒ mỗi identity mới tạo `loadFleet` mới |
| 3 | `…/Group1WorkshopsPanel.tsx:117` `onUpdatePrinters?.(rows)` **bên trong loadFleet** | Lần load ĐẦU cũng gọi về App: `handleUpdatePrinters(rows)` → `setPrinters(rows)` + **ghi từng máy xuống DB** (`savePrinter`/`deletePrinter`) |
| 4 | `…/Group1WorkshopsPanel.tsx:127-135` `useEffect(…, [loadFleet, loadWorkshops])` | `loadFleet` đổi identity ⇒ effect chạy lại ⇒ fetch lại ⇒ (3) ⇒ App re-render ⇒ (1) ⇒ lặp vô hạn |
| 5 | `src/App.tsx:44` `const showToast = (msg, type) => …` | Hàm thường ⇒ identity mới mỗi render; `loadPartners` deps `[onShowToast]` (`Group1:181`) + effect `[loadPartners]` (`:183`) ⇒ **fetch partners lặp song song** |
| 6 | `src/frontend/components/admin/groups/Group3CustomersPanel.tsx:116-132` `loadKycRows = useCallback(…, [onShowToast])` + effect `[loadKycRows]` | **Cùng lớp lỗi**: mỗi lần App re-render lại fetch lại hồ sơ KYC (đã sửa) |

Chu kỳ: **effect → `setIsFleetLoading(true)` → GET `printer_fleet` → `onUpdatePrinters(rows)` → `setPrinters` (mảng mới) → App re-render → handler mới → `loadFleet` mới → effect → …**
Mỗi vòng còn kéo theo `loadWorkshops()` + `loadPartners()` + `getPricingGlobalSettings()` (cache) ⇒ UI đổi trạng thái loading/empty liên tục = "nhảy", và **ghi DB lặp vô ích**.

Hệ quả phụ (nghiêm trọng hơn UI): mỗi vòng `handleUpdatePrinters` gọi `dbService.savePrinter` cho **toàn bộ** máy + `deletePrinter` cho phần "bị xoá" ⇒ đo được **1.418 lượt ghi DB / 10 giây**.

---

## 2. Sửa gì (4 file, +116/−68 dòng)

### 2.1 `src/frontend/hooks/useCatalogData.ts` — handler identity ổn định (nguồn)
- Thêm `productsRef/materialsRef/printersRef/accessoriesRef/showToastRef` + 1 effect sync state mới nhất vào ref.
- `handleUpdateMaterials/Printers/Accessories` + 3 handler product → **`useCallback([], ...)`**, đọc state mới nhất qua ref (vẫn tính đúng phần "đã bị xoá" như cũ; rollback vẫn dùng snapshot trước đó).
- Không đổi API trả về (`CatalogData`), không đổi logic ghi DB.

### 2.2 `src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx` — effect chỉ chạy 1 lần
- `onUpdatePrinters`/`onShowToast` giữ trong **ref** (2 effect sync ref) ⇒ callback không còn là dep.
- Tách `fetchFleetRows = useCallback([], …)` (trả rows/null) + `loadFleet = useCallback([fetchFleetRows])` → **`Promise<void>` như cũ** (không đổi props của `FleetTab`).
- **Bỏ `onUpdatePrinters?.(rows)` ở lần load đầu**; chỉ đồng bộ App **sau khi GHI thành công** (`persistPrinter`): `savePrinter` → `fetchFleetRows()` → `onUpdatePrintersRef.current?.(rows)`.
- `loadPartners` → `useCallback([])` + toast ref; `persistPartner` → `useCallback([])` + functional `setPartners` (bỏ closure stale); `handleTogglePartnerStatus` `useCallback`.
- Dọn: bỏ docblock stale (hàm mapping đã chuyển sang `group1Shared.ts`), bỏ prop `onNavigateSection` khỏi destructure (không dùng; **interface giữ nguyên**), `partnerColumns` deps đúng `[handleTogglePartnerStatus]` (trước đó `[]` giữ closure cũ ⇒ còn có thể nhân đôi dòng đối tác khi toggle — cùng lớp lỗi stale closure).

### 2.3 `src/App.tsx` — `showToast` identity ổn định
- `useCallback(…, [addToast])` (addToast là Zustand action ổn định).

### 2.4 `src/frontend/components/admin/groups/Group3CustomersPanel.tsx` — cùng lớp lỗi
- `onShowToastRef` + `loadKycRows = useCallback([])` ⇒ không refetch KYC mỗi lần App re-render.

**Giữ nguyên nghiệp vụ:** vẫn đọc DB thật; vẫn 3 trạng thái loading/empty/error (`fleetPrinters=null`, `isFleetLoading`, `fleetError`); vẫn refresh sau lưu/xoá; App state vẫn đồng bộ sau thao tác ghi; không đổi copy/JSX/class/token.

---

## 3. Đo trước / sau (cùng kịch bản, cùng máy)

### 3.1 Phương pháp
- **BEFORE**: `git worktree add --detach /tmp/vcube-fix-before b78c24a` (symlink `node_modules` + `.env`) → build `dist-ssr/fix-before`.
- **AFTER**: working tree sau sửa → build `dist-ssr/fix-after` (`npx vite build --outDir dist-ssr/fix-after --emptyOutDir`; **không ghi `dist/`**).
- Serve bằng `vite preview` riêng (port 4401/4402); Chromium headless shell (`~/.cache/ms-playwright/chromium_headless_shell-1244`, libs `~/.local/share/opencode-pwlibs`).
- **Session admin giả**: inject `localStorage['sb-vcxarjwzbihvurpkcufa-auth-token']` (key suy từ `VITE_SUPABASE_URL` trong `.env` — không in khoá) + CDP `Fetch` intercept:
  - `/rest/v1/user_profiles*` → `{role:'admin'}`; `/rest/v1/printer_fleet*` → 2 máy; `/rest/v1/workshop_profiles*` → 2 xưởng;
  - `/rest/v1/workshop_partners*` → 1 đối tác; settings/site_content/pricing_configs → fixtures; các bảng khác → `[]`.
  ⇒ Admin render thật (RoleGuard pass) mà **không cần DB thật/credential**.
- Probe (CDP `Page.addScriptToEvaluateOnNewDocument`): MutationObserver toàn `body` + `setInterval(100ms)` ghi `scrollHeight`/số `.animate-spin`; đếm request theo `Network.requestWillBeSent` (tách GET/OPTIONS/WRITE).
- Đo **2 cửa sổ**: `mount` (từ navigate → render xong) và **idle 10s** sau render (reset counter rồi đo) cho 3 route `/admin/workshops`, `/admin/machines`, `/admin/partners`.

### 3.2 Kết quả

| Route / cửa sổ | BEFORE (HEAD) | AFTER (đã sửa) | Kỳ vọng |
|---|---|---|---|
| `/admin/workshops` — idle 10s | **7.090** REST · `printer_fleet` GET **709** + **WRITE 1.418** · `workshop_profiles` GET 709 · `workshop_partners` GET 709 | **0** REST | 1–2 lần/10s ⇒ PASS (0 sau mount) |
| `/admin/machines` — idle 10s | **6.471** REST · fleet GET 647 + WRITE 1.294 · workshops 647 · partners 647 | **0** REST | PASS |
| `/admin/partners` — idle 10s | **5.782** REST · fleet GET 578 + WRITE 1.156 · workshops 579 · partners 579 | **0** REST | PASS |
| DOM mutations idle 10s (`/admin/workshops`) | **16.206** | **0** | ổn định PASS |
| `scrollHeight` idle 10s | 1.087 (distinct **1**) | 1.087 (distinct 1) | không nhảy |
| mount window: REST / `printer_fleet` | 54 request; fleet GET **3** + **WRITE 2** | 44 request; fleet GET **2**, **WRITE 0** | 2 GET = App + Group1 (2 tầng sở hữu dữ liệu), 0 write |
| `workshop_profiles` / `workshop_partners` khi mount | GET 2 / GET 2 | GET **1** / GET **1** | PASS |
| render admin (RoleGuard pass → có dữ liệu) | 479 ms | 470 ms | không hồi quy |
| console errors / pageerror | 0 / 0 | 0 / 0 | PASS |
| **Bấm đổi trạng thái máy** (`/admin/machines`, click “Đặt Bận/Đặt Rảnh” ở bản AFTER) | — | 3s sau click: fleet **GET 1 + WRITE 3**, mutations **16**, rồi idle 0 request/0 mutation | refresh-sau-ghi vẫn chạy, không tạo loop mới |
| Trước/sau tại idle (route machines/partners) | xem bảng trên | 0 request/0 mutation | PASS |

Screenshot (full-page, 1440×900, headless):
`/tmp/flicker-before2-workshops-render.png`, `/tmp/flicker-before2-workshops-idle-end.png`,
`/tmp/flicker-after2-workshops-render.png`, `/tmp/flicker-after2-machines-render.png`, `/tmp/flicker-after2-partners-render.png`.
(Không commit ảnh — chỉ trong `/tmp`.)

> Ghi chú: `scrollHeight` **giữ nguyên** ở cả 2 bản vì khung KPI/bảng cùng kích thước; cái "nhảy" người dùng thấy là
> **nội dung bị thay liên tục** (skeleton/chữ "ĐANG TẢI"/dữ liệu bị đặt lại) — đo bằng **DOM mutations** (16.206 → 0)
> và network (7.090 → 0). Trước sửa, idle 10s có ~63 chu kỳ fetch/giây.

---

## 4. Rà cùng lớp lỗi các màn admin khác

| Khu vực | Pattern kiểm tra | Kết luận |
|---|---|---|
| **Group1** (workshops/machines/materials/partners) | prop callback trong `useCallback`/`useEffect` deps | **BUG — đã sửa** (fleet + partners) |
| **Group3** (customers/KYC) | `loadKycRows` dep `[onShowToast]` + effect `[loadKycRows]` | **Cùng lớp — đã sửa** (ref) |
| Group0 Overview | `useMemo` theo state props; không fetch effect | An toàn |
| Group2 Designers | effect `[loadDesigners]` (Zustand action ổn định) | An toàn |
| Group4 Pricing wrapper | không state/effect | An toàn |
| Group5 Production | `loadOrders = useCallback([])` + effect 1 lần; handler props chỉ dùng trong click | An toàn |
| PricingConfigPanel (6 tab) | effect `[]` / `[initialSubTab]`; handler nội bộ | An toàn |
| Products / Warehouse / Accessories / Estimator / Storefront CMS / SEO / Settings | data qua props; effect chỉ theo dữ liệu (`[siteContent,isSaved]`, `[data,dirty]`) không chứa prop callback | An toàn |
| `AdminDashboardView` | không effect; chỉ compose | An toàn |
| `useSiteSettings` handlers | chưa memoize nhưng **không nằm trong dep của effect nào** (grep) | Không gây loop; follow-up memoize cho nhất quán |

---

## 5. Gate (đã chạy trên working tree sau sửa)

| Gate | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS (RC=0)** |
| `npm run build` (isolated) | **PASS** — `npx vite build --outDir dist-ssr/fix-after --emptyOutDir` ✓ (5,12s); `dist/` **không bị ghi/đổi** |
| `npm run test:unit` | **PASS** — 71 test / 0 fail |
| 10 offline gates (`run-checks --only …` theo task) | **KHÔNG TỆ HƠN BASELINE** — 10/10 OK: contrast-combos, contrast, error-handling, fabricated, icon-names, ui-rules, unitprice-multiplier, a8-sql-syntax, lint-rls-migration, lint-rls-sources (tất cả `vi pham=0`) |

Git status (chỉ 4 file sửa + handoff):
`M src/App.tsx` · `M src/frontend/hooks/useCatalogData.ts` · `M src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx` · `M src/frontend/components/admin/groups/Group3CustomersPanel.tsx`.
(Repo có `?? docs/tasks/product-review/` — **không phải** thay đổi của task này.)

---

## 6. Risks & follow-up

| # | Mức | Nội dung | Đề xuất |
|---|---|---|---|
| 1 | Thấp | **Bỏ đồng bộ App ở lần load đầu** của Group1: App vẫn tự nạp `printers` riêng trong `useCatalogData` (mount), Group1 luôn đọc DB trực tiếp; sau MỌI thao tác ghi vẫn đồng bộ App qua `onUpdatePrintersRef`. Nếu lần nạp của App lỗi còn Group1 thành công, state `printers` của App có thể cũ cho tới lần ghi kế tiếp (trước đây được "vá" bởi chính vòng lặp lỗi). | Chấp nhận; nếu cần có thể thêm đồng bộ 1 lần sau fetch thành công đầu tiên (so sánh id/nội dung để không tạo vòng) |
| 2 | Thấp | Mount vẫn có **2 GET `printer_fleet`** (App + Group1) — 2 bề mặt cùng đọc bảng thật, không phải loop. | Giữ (data-honesty: Group1 cần phân biệt rỗng/lỗi); có thể gộp nguồn ở phase sau |
| 3 | Thấp | Đo bằng **fixtures ở network layer** + session giả (Supabase REST intercept) để render admin; không phải dữ liệu production. | QA smoke trên Supabase thật khi có credential; số liệu "0 request/0 mutation sau mount" không phụ thuộc DB |
| 4 | Thấp | `onNavigateSection` bị bỏ khỏi destructure (prop không dùng) nhưng **giữ trong interface** để không đổi public API của panel. | Có thể xoá prop ở phase dọn API nếu không call-site nào dùng |
| 5 | Rất thấp | Pattern "prop callback trong deps" không có gate tự động (repo chưa có ESLint `react-hooks/exhaustive-deps`). | Follow-up: thêm lint rule/check script để chặn tái diễn |
| 6 | Rất thấp | `dist-ssr/fix-before` + `dist-ssr/fix-after` (~11 MB mỗi bản, gitignored) còn trên đĩa để verifier đối chiếu. | `rm -rf dist-ssr/fix-before dist-ssr/fix-after` sau khi verify |

**Ghi chú sau khi sửa (không phải loop, hành vi cũ giữ nguyên):** sau một lần GHI máy, `handleUpdatePrinters` (đồng bộ App state) vẫn upsert lại toàn bộ rows ⇒ 1 click = 1 write của thao tác + 2 write đồng bộ (2 máy trong fixture) + 1 GET refresh. Đây là logic data-layer sẵn có, nay chỉ xảy ra **một lần cho mỗi thao tác người dùng** (trước đây lặp ~1.418 lần/10s). Muốn tối ưu tiếp: `handleUpdatePrinters` chỉ upsert rows thay đổi / bỏ đồng bộ App khi Group1 đã là nguồn hiển thị.

**Follow-up khác:** cân nhắc realtime cho `printer_fleet` (hiện chỉ fetch khi mount + sau ghi); memoize `useSiteSettings` handlers cho nhất quán; dọn `printers` prop truyền thừa vào Group1 khi refactor call-site.

---

## 7. Tái lập nhanh

```bash
cd /home/thanh/home/thanh/project/Vcube

# BEFORE: build từ HEAD sạch (không đụng dist/)
rm -rf /tmp/vcube-fix-before && git worktree add --detach /tmp/vcube-fix-before HEAD
cd /tmp/vcube-fix-before && ln -sfn /home/thanh/home/thanh/project/Vcube/node_modules node_modules \
  && ln -sfn /home/thanh/home/thanh/project/Vcube/.env .env \
  && /home/thanh/home/thanh/project/Vcube/node_modules/.bin/vite build \
       --outDir /home/thanh/home/thanh/project/Vcube/dist-ssr/fix-before --emptyOutDir

# AFTER: build working tree hiện tại
cd /home/thanh/home/thanh/project/Vcube
npx vite build --outDir dist-ssr/fix-after --emptyOutDir

# Serve tách cổng rồi chạy probe CDP (script /tmp/flicker-probe2.mjs — session giả + REST intercept):
npx vite preview --outDir dist-ssr/fix-before --port 4401 --strictPort &
npx vite preview --outDir dist-ssr/fix-after  --port 4402 --strictPort &
node /tmp/flicker-probe2.mjs http://127.0.0.1:4401 /admin/workshops before 10000
node /tmp/flicker-probe2.mjs http://127.0.0.1:4402 /admin/workshops after  10000

# gates
npm run lint && npm run test:unit
node scripts/run-checks.mjs --only check-contrast-combos --only check-contrast \
  --only check-error-handling --only check-fabricated --only check-icon-names \
  --only check-ui-rules --only check-unitprice-multiplier --only a8-sql-syntax-check \
  --only lint-rls-migration --only lint-rls-sources
```
