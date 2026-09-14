# A3 — Rà soát READ-ONLY toàn bộ `/admin` (VCUBE)

**Ngày:** 2026-09-13 · **Chế độ:** chỉ đọc, không sửa file nào trong repo, không git mutation, không thêm dependency.
**Repo:** `/home/thanh/projects/Vcube` (WSL2 Ubuntu-24.04), commit làm việc không đổi.
**Người thực hiện:** agent A3 (subagent read-only).

## 0. Cách đo (để coordinator chạy lại được) — ĐỌC TRƯỚC KHI TIN SỐ

Mọi con số dưới đây đến từ **3 dụng cụ**, tất cả đều **nằm NGOÀI repo**:

| Dụng cụ | Đường dẫn | Cách chạy |
|---|---|---|
| Đếm tĩnh bằng AST TypeScript thật | `C:\Users\chith\AppData\Local\Temp\vcube-a3-tools\a3-audit.cjs` | `wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "export NODE_PATH=/home/thanh/projects/Vcube/node_modules && node /mnt/c/Users/chith/AppData/Local/Temp/vcube-a3-tools/a3-audit.cjs <files...>"` |
| Đo DOM runtime qua CDP (Chromium headless, **không cài gì**) | `...\vcube-a3-tools\a3-dom.cjs` | xem §2.3 (build tĩnh → `vite preview` cổng 4188 → chrome `--remote-debugging-port=9333`) |
| Bảng tổng hợp / in bằng chứng thô | `a3-summary.cjs`, `a3-detail.cjs`, `a3-dom-table.cjs`, `a3-samples.cjs` | `node .../a3-summary.cjs /tmp/a3-audit-a.json /tmp/a3-audit-b.json` |

Định nghĩa chỉ số (để không "khớp/không khớp" bằng regex tự chế):
- **textChars** = ký tự của (a) `JsxText` (đã gộp khoảng trắng) + (b) mọi string literal/n template literal **nằm trong cây JSX** mà attribute gần nhất **không** thuộc danh sách phi-văn-bản (`className,id,key,icon,variant,size,type,name,value,href,to,src,role,aria-*…`). Đây là **ước lượng cận trên của chữ hiển thị** trong file, gồm cả nhánh `isVi ? … : …`.
- **panelChars** = `main[aria-label].innerText` đo **trên DOM thật** sau khi đăng nhập admin (chỉ nội dung panel, **không** gồm sidebar/topbar). Đây là số "chữ thật đang hiện".
- **long node** = text node trong `<main>` có ≥ 80 ký tự.

Giới hạn đã biết: file build dùng cho đo DOM là bản build tại thời điểm rà soát; cổng 3000 đang tắt nên tôi tự build + preview cổng riêng (đã kill, xem §7).

---

## 1. Bảng "mục admin × nguồn dữ liệu THẬT"

**Cách đếm "17 mục":** `/admin` có **16 mục trong menu** (`buildAdminNavGroups`, `src/frontend/components/admin/AdminSidebar.tsx:55-207`) và **22 id route hợp lệ** (`AdminDashboardView.tsx:116-124`, do 6 alias: `group0-overview`, `workshops`, `pricing-engine`, `pricing-setup`, `cost-rules`, `customers`). 16 mục menu → **11 component panel** thật sự render. Tôi báo cáo theo **16 mục menu**; nếu "17" của anh là file trong danh sách giao việc thì đó là 16 file component + 1 view (không phải mục menu) — tôi không độn thêm một mục để "đủ 17".

Lệnh liệt kê mục menu:

```bash
grep -n "id: '" src/frontend/components/admin/AdminSidebar.tsx      # 16 dòng id
grep -n "validSections" -A 12 src/frontend/views/AdminDashboardView.tsx
```

| # | Mục menu (route id) | Panel render | Nguồn dữ liệu THẬT | Ghi DB? |
|---|---|---|---|---|
| 1 | `overview` / `group0-overview` | `Group0OverviewPanel` | **DB qua props**: App nạp `dbService.getProducts/getMaterials/getPrinters/getAccessories` (`App.tsx:701,795-814`) → truyền xuống props. Đo runtime: “1 đang in / 7 máy”, “14,3%” = từ `printer_fleet` | chỉ đọc |
| 2 | `partners` | `Group1WorkshopsPanel` tab Đối tác | **DB `workshop_partners`**: `dbService.getWorkshopPartners()` (`Group1…:62`), `saveWorkshopPartner()` (`:103`) | ✅ |
| 3 | `machines` | `Group1WorkshopsPanel` tab Đội máy | **in-memory**: `useWorkshopAdminStore` — `INITIAL_MACHINES = []` (`src/stores/useWorkshopAdminStore.ts:73`), không persist, không DB. Props `printers`/`onUpdatePrinters` **được khai báo nhưng không dùng** (`Group1…:9-10`; `grep -n printers` chỉ ra 4 dòng, 2 dòng là khai báo) | ❌ (máy thêm vào mất khi reload) |
| 4 | `designers` | `Group2DesignersPanel` | **in-memory**: `useDesignerAdminStore` — `INITIAL_DESIGNERS = []`, `INITIAL_WITHDRAWALS = []` (`src/stores/useDesignerAdminStore.ts:76,81`). Runtime: “TỔNG DESIGNERS 0” | ❌ |
| 5 | `users` | `Group3CustomersPanel` | **hỗn hợp**: KYC từ **DB** (`dbService.getUsers()` `Group3…:98`, `updateUserKyc()` `:139`) + danh sách khách/RFQ từ **in-memory** (`useCustomerAdminStore`, `INITIAL_CUSTOMERS=[]`/`INITIAL_RFQS=[]` `:96,101`). Runtime: “Hồ Sơ KYC **1**” cạnh “TỔNG KHÁCH HÀNG **0**” | KYC ✅ / khách–RFQ ❌ |
| 6 | `pricing` (+3 alias) | `PricingConfigPanel` | **DB**: `pricing_configs` (đọc `dbService.getPricingConfig()` `App.tsx:795`, ghi `savePricingConfig` `App.tsx:902`) + `pricing_global_settings` (ghi `savePricingGlobalSettings` `PricingConfigPanel.tsx:485`) | ✅ |
| 7 | `materials` | `PricingConfigPanel` sub-tab Nhựa & Resin | **DB `materials`** qua props; ghi `onUpdateMaterials` → `dbService.saveMaterial` (`App.tsx:938-940`) | ✅ (chỉ upsert, **không có delete**) |
| 8 | `hardware` | `AccessoriesManager` | **đọc DB** (`dbService.getAccessories()` `App.tsx:814`) nhưng **ghi vào React state**: `onUpdateAccessories={setAccessories}` (`App.tsx:1622,1653`) ⇒ `dbService.saveAccessory` (`src/backend/supabase/database.ts:725`) **0 caller** | ❌ (sửa phụ kiện mất khi reload) |
| 9 | `quote-calc` | `WorkshopEstimatorBOM` | props (`materials/printers/pricingConfig`) + cache `settingsService` (`WorkshopEstimatorBOM.tsx:67-76`); bản chất là máy tính ⇒ in-memory | n/a |
| 10 | `queue` | `Group5ProductionPanel` (luôn tab Kanban) | **localStorage**: `useProductionStore` persist `'vcube_production_store_v1'` (`src/stores/useProductionStore.ts:281,616`), seed `INITIAL_PRODUCTION_JOBS = []` (`:238`), `INITIAL_WORKSHOP_NODES = []` (`:232`). Prop `orders` **khai báo mà không dùng** (`Group5…:14,23`) | ❌ |
| 11 | `orders` | **cùng panel 10** | như trên. Runtime: `panelChars` 3 mục 10/11/12 **đều = 765** và chuỗi text giống hệt nhau | ❌ |
| 12 | `inventory` | **cùng panel 10** (⚠️ **không phải** WarehouseInventoryPanel) | như trên. Panel kho thật nằm ở `PricingConfigPanel` sub-tab `'inventory'` (`PricingConfigPanel.tsx:2409`) | ❌ |
| 13 | `products` | `AdminProductsPanel` | **DB `products`** qua props + ghi `saveProduct/deleteProduct` (`App.tsx:1231,1252,1273`); `CATEGORIES` từ hằng số `mockData.ts:21` (chỉ là taxonomy) | ✅ |
| 14 | `storefront` | `AdminStorefrontPanel` | **DB `site_content`** (`App.tsx:799` đọc, `1312` ghi) — nhưng state khởi tạo từ hằng số `DEFAULT_SITE_CONTENT` (`src/data/mockData.ts:247`) | ✅ |
| 15 | `seo` | `AdminSeoPanel` | như #14 (cùng `siteContent`) | ✅ |
| 16 | `settings` | `AdminSettingsPanel` | **DB `app_settings`** qua `useAppSettings` → `settingsService` (`src/frontend/hooks/useSettings.ts:93`); ghi `saveAppSettings` (`AdminSettingsPanel.tsx:221`). Runtime nhãn: “Nguồn dữ liệu: Supabase · bảng app_settings” | ✅ |

**Hiển thị/điều khiển dữ liệu giả (kết luận rõ):**
1. `machines` (Đội máy) — in-memory rỗng, DB `printer_fleet` có 7 dòng → runtime in “TỔNG MÁY IN **0**”.
2. `designers` — in-memory rỗng ⇒ cả panel 0 bản ghi, mọi “cập nhật hoa hồng/duyệt payout” chỉ nằm trong RAM.
3. `queue/orders/inventory` — dữ liệu từ localStorage, không liên kết `orders` trong DB.
4. phần danh sách khách + RFQ trong `users` — in-memory.
5. `hardware` — đọc DB nhưng ghi state (mất khi reload).
6. Hằng số mockData còn dùng làm **giá trị khởi tạo**: `DEFAULT_SITE_CONTENT` (`mockData.ts:247`), `INKIRI_REFERENCE_VALUES` (`mockData.ts:96`, có nhãn cảnh báo), `CATEGORIES` (`:21`). **Tin tốt:** các fixture danh mục lớn đã rỗng hoá: `PRODUCTS=[]` (`:60`), `MATERIALS_CATALOG=[]` (`:49`), `PRINTER_PROFILES=[]` (`:80`), `ACCESSORIES_CATALOG=[]` (`:54`), `MOCK_ORDERS=[]` (`:70`), `WORKSHOP_PARTNERS=[]` (`:334`), `MOCK_APP_USERS=[]` (`:340`).

---

## 2. Chrome: runtime `/admin` có **1** tầng nav/aside hay 2?

### 2.1 Kết luận
**1 tầng chrome điều hướng** (đúng như anh đã xác nhận). Bằng chứng DOM thô: **`aside` = 1 và visible = 1**; **`nav` = 2 nhưng visible = 1** — bản thứ hai là **bản sao trong `<dialog>` drawer mobile đang ĐÓNG** (`dialogsOpen = 0`), do thiết kế `AppShell` cố ý render `sidebar` hai lần (`src/frontend/ui/AppShell.tsx:18,127-146`). `AdminSidebar` (component có `<aside>` ở `AdminSidebar.tsx:288`) **không được render**: bundle build không chứa chuỗi JSX riêng của nó.

### 2.2 Bằng chứng runtime (16/16 mục giống nhau)
```
section       panelCh  ...  asideVis/tot  navAside  navDlg  navOther  mainTot
overview         1021        1/1            1        1        0        2
partners          502        1/1            1        1        0        2
machines          502        1/1            1        1        0        2
designers         497        1/1            1        1        0        2
users             511        1/1            1        1        0        2
pricing          6067        1/1            1        1        0        2
materials        2439        1/1            1        1        0        2
hardware         1612        1/1            1        1        0        2
quote-calc       3062        1/1            1        1        0        2
queue             765        1/1            1        1        0        2
orders            765        1/1            1        1        0        2
inventory         765        1/1            1        1        0        2
products         1878        1/1            1        1        0        2
storefront        817        1/1            1        1        0        2
seo               897        1/1            1        1        0        2
settings          594        1/1            1        1        0        2
(console errors while measuring: 0)
```
DOM thô (viewport 1440×900), lấy nguyên văn từ `document.querySelectorAll('aside')[0].outerHTML`:
```
<aside class="sticky top-0 hidden h-dvh shrink-0 border-r border-line-subtle bg-surface lg:flex lg:flex-col lg:w-60"><div class="flex h-full min-h-0 f…
```
`navAria` = `["Điều hướng quản trị","Điều hướng quản trị"]`, `navInsideAside=1`, `navInsideDialog=1`, `navOutsideAsideDialog=0`.

### 2.3 Lệnh tái lập (đã chạy thật)
```bash
# 1) build ra outDir NGOÀI repo (không đụng dist/ của repo)
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "npx vite build --outDir /tmp/vcube-a3-dist --emptyOutDir"
# 2) preview cổng riêng
wsl -d Ubuntu-24.04 -- bash -lc "setsid nohup npx --prefix /home/thanh/projects/Vcube vite preview --outDir /tmp/vcube-a3-dist --port 4188 --strictPort > /tmp/vcube-preview.log 2>&1 < /dev/null &"
# 3) chromium headless có sẵn trong ~/.cache/ms-playwright + libs đã bóc sẵn ở /tmp/vc-libs
wsl -d Ubuntu-24.04 -- bash -lc 'export LD_LIBRARY_PATH=/tmp/vc-libs/usr/lib/x86_64-linux-gnu; setsid nohup /home/thanh/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9333 --user-data-dir=/tmp/a3-chrome-profile about:blank > /tmp/a3-chrome.log 2>&1 < /dev/null &'
# 4) đăng nhập + đo (mật khẩu truyền qua env, KHÔNG in ra)
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "A3_PW=*** node /mnt/c/Users/chith/AppData/Local/Temp/vcube-a3-tools/a3-dom.cjs overview partners machines designers users pricing materials hardware quote-calc queue orders inventory products storefront seo settings"
```
Bằng chứng bundle (AdminSidebar không được render ⇒ không thể có chrome thứ 2):
```bash
wsl -d Ubuntu-24.04 -- bash -lc "cd /tmp/vcube-a3-dist/assets && grep -c 'Tìm nhanh theo tên mục\|Mở rộng thanh điều hướng\|Xem Cửa Hàng' AdminDashboardView-DU3fBi0G.js"   # 0
```

### 2.4 Hai vấn đề chrome **còn thật** (không phải 2 nav, nhưng là chrome lẫn)
| Vấn đề | file:line | Bằng chứng đo |
|---|---|---|
| **`<main>` lồng nhau**: App bọc `<main className="flex-1">` quanh toàn bộ route, AppShell lại render `<main aria-label="Nội dung chính">` bên trong | `src/App.tsx:1358` + `src/frontend/ui/AppShell.tsx:160` | `mainHtml` runtime: `{aria:null, cls:"flex-1", 1435×967, nestedMainInside:1}` và `{aria:"Nội dung chính", 1195×911, nestedMainInside:0}`; `mainTot=2` trên **cả 16 mục** ⇒ 2 landmark `main` (vi phạm "một main/trang"), và `<main>` ngoài bao luôn cả sidebar |
| **FAB “Trợ lý tự động” của storefront hiện trong `/admin`**: nút `rounded-full` cố định góc dưới phải, có cả logic `controlUnderFab` để né control của admin | `src/App.tsx:1681-1696` (không nằm trong `CHROMELESS_SCREENS`, `App.tsx:987`) | mỗi mục đều có `roundedFullBtnA` chứa `BUTTON.fixed bottom-6 right-6 z-drawer px-4 py-3 bg-surface-inverse … rounded-full` |

---

## 3. Mật độ chữ & số chỗ đã/cần dùng `InfoTip`

### 3.1 Bảng (đo tĩnh bằng AST + đo runtime bằng DOM)
| Panel (file) | textChars (tĩnh, cận trên) | **panelChars (runtime, DOM thật)** | InfoTip (tĩnh) | **InfoTip (runtime, đang render)** | text node ≥80 ký tự (runtime) | text ≥80 (tĩnh) |
|---|---|---|---|---|---|---|
| `PricingConfigPanel.tsx` (mục pricing) | 11.249 | **6.067** | 4 | 2 | **7** | 19 |
| `PricingConfigPanel` sub-tab quote-calc | (trong file trên) | **3.062** | — | 1 | 2 | — |
| `PricingConfigPanel` sub-tab materials | “ | **2.439** | — | 1 | 0 | — |
| `AccessoriesManager.tsx` (hardware) | 1.882 | **1.612** | 1 | 2 | 0 | 2 |
| `AdminProductsPanel.tsx` (products) | 1.461 | **1.878** | **0** | **0** | 0 | 1 |
| `AdminStorefrontPanel.tsx` (storefront) | 4.365 | **817** | 3 | 3 | 1 | 8 |
| `AdminSeoPanel.tsx` (seo) | 2.898 | **897** | 3 | 2 | 2 | 7 |
| `AdminSettingsPanel.tsx` (settings) | 1.491 | **594** | 1 | 1 | 0 | 2 |
| `Group0OverviewPanel.tsx` (overview) | 3.235 | **1.021** | 6 | 5 | 1 | 12 |
| `Group1WorkshopsPanel.tsx` (partners/machines) | 5.198 | **502** | 1 | 1 | 0 | 3 |
| `Group2DesignersPanel.tsx` (designers) | 3.693 | **497** | 1 | 1 | 0 | 3 |
| `Group3CustomersPanel.tsx` (users) | 4.777 | **511** | 1 | 1 | 0 | 4 |
| `Group5ProductionPanel.tsx` (queue/orders/inventory) | 3.087 | **765** | 2 | 2 | 0 | 4 |
| `WarehouseInventoryPanel.tsx` (pricing→inventory) | 1.279 | (không route riêng) | 1 | — | — | 1 |
| `WorkshopEstimatorBOM.tsx` (quote-calc) | 1.433 | “ | **0** | — | — | 2 |
| `AdminDashboardView.tsx` (khung) | 689 | — | **0** | 0 | 0 | 0 |
| **TỔNG** | **47.094** | **22.694** (16 mục) | **24** | 26 | **13** | **68** |

Lệnh tái lập:
```bash
# tĩnh
wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "export NODE_PATH=/home/thanh/projects/Vcube/node_modules && node /mnt/c/Users/chith/AppData/Local/Temp/vcube-a3-tools/a3-summary.cjs /tmp/a3-audit-a.json /tmp/a3-audit-b.json"
# runtime (panelChars + long nodes + emoji)
wsl -d Ubuntu-24.04 -- bash -lc 'node /mnt/c/Users/chith/AppData/Local/Temp/vcube-a3-tools/a3-dom-table.cjs'
grep -rn "InfoTip" src/frontend/components/admin src/frontend/views/AdminDashboardView.tsx | wc -l   # 59 dòng (gồm import + mọi lần dùng)
grep -rln "InfoTip" src/frontend | wc -l   # 18 file toàn repo
grep -rln "InfoTip" src/frontend/components/admin   # 11 file admin (đã kiểm: AccessoriesManager, AdminSeo, AdminSettings, AdminStorefront, PricingConfig, WarehouseInventory, Group0,1,2,3,5)
```

### 3.2 File **chưa** dùng `InfoTip` (cần bổ sung trước)
`grep -rln InfoTip` **không** trả về: `AdminDashboardView.tsx`, `AdminProductsPanel.tsx`, `WorkshopEstimatorBOM.tsx`, `AdminSidebar.tsx` (chết). Trong đó `AdminProductsPanel` là panel **đậm chữ thứ 5** ở runtime (1.878 ký tự) mà **0 InfoTip**.

### 3.3 Danh sách chỗ còn chữ dài **nên chuyển** (đo trên DOM thật, kèm file:line tĩnh)
Runtime (13 chỗ, đây là "mặt tiền" đang hiện):
| file:line | len | nội dung (rút gọn) |
|---|---|---|
| `PricingConfigPanel.tsx:1227` | 245 | “* Kho này là cấu hình CHUNG (VAT · điện · nhân công)…” |
| `PricingConfigPanel.tsx:1735` | 137 | “Vượt MỘT trong hai ngưỡng ⇒ báo giá kèm lý do…” |
| `PricingConfigPanel.tsx:1413` | 118 | “Nguồn thật là `pricing_global_settings.labor_hourly_rate_vnd`…” |
| `PricingConfigPanel.tsx:1229` | 116 | “để trống ⇒ mọi màn hình ẩn dòng VAT…” |
| `PricingConfigPanel.tsx:1259` | 89 | “Nguồn thật là `pricing_global_settings.electricity_rate_vnd`…” |
| `PricingConfigPanel.tsx:931` | 90 | “cần anh quyết định — Inkiri không có ngưỡng cảnh báo…” |
| `PricingConfigPanel.tsx:~1500` | 88 | “Chỉ dùng cho bộ ước lượng nhanh ở trang chủ (HomeView)…” |
| `WorkshopEstimatorBOM.tsx` (quote-calc, 175) | 175 | “Dành riêng cho Quản lý & Kỹ thuật viên: Bóc tách cấu trúc giá thành 8 tầng…” |
| `WorkshopEstimatorBOM.tsx` (98) | 98 | “Hệ thống KHÔNG tự điền giá trị đoán…” |
| `AdminSeoPanel.tsx:286` | 139 | “Tùy chỉnh thẻ Meta, xem trước kết quả tìm kiếm Google (SERP Simulator)…” |
| `AdminStorefrontPanel.tsx:38` | 94 | “Chỉnh sửa các câu thông điệp chủ đạo, nút hành động và 3 thẻ thông số…” |
| `Group0OverviewPanel.tsx:~470` | 100 | “Chưa có bản ghi chi phí (khấu hao, điện, nhân công, vật tư)…” |
| `AdminSeoPanel.tsx:~150` | 88 | (textarea) meta description đang có sẵn — **KHÔNG** chuyển, là ô nhập |

⇒ **12 chỗ nên chuyển ngay** (bỏ 1 textarea SEO), tập trung **7 chỗ ở `PricingConfigPanel`**. Backlog đầy đủ (kể cả modal, chưa render mặc định) = **68 chỗ** theo `a3-summary.cjs` (Pricing 19 · Group0 12 · Storefront 8 · Seo 7 · Group3/Group5 4 · Group1/Group2 3 · Accessories/Settings/Estimator 2 · Products/Warehouse 1).

---

## 4. Nhất quán thị giác — số đếm mỗi panel (mốc trước→sau)

Nguồn: AST (`className` của mọi element) + DOM runtime. Lệnh: `a3-summary.cjs` (tĩnh) & `a3-dom-table.cjs` (runtime).

| Panel | `rounded-full` (tĩnh, mọi element) | `rounded-full` trên `button/a` (runtime) | CTA/`button` dùng rounded-full | card tự dựng (bg-surface+rounded+p-*+shadow) | `h-9/h-10/h-12` hand-rolled | emoji hiển thị (tĩnh→runtime) | màu/nền sai token |
|---|---|---|---|---|---|---|---|
| overview `Group0OverviewPanel` | 2 | 6 | **chỉ FAB App** (1) | 0 | 0 | 0 → 0 | 0 |
| partners/machines `Group1WorkshopsPanel` | 4 | 2 | FAB | **15** | 0 | 7 → 0 | 0 |
| designers `Group2DesignersPanel` | 5 | 2 | FAB | **14** | 1 | **9 → 3** (👑⚙️🚀) | 0 |
| users `Group3CustomersPanel` | 6 | 2 | FAB | **16** | 0 | **10 → 2** (🏢👤) | 0 |
| pricing `PricingConfigPanel` | 1 | 3 | FAB | **13** | 0 | 6 → 2 (⚠️, có cả `⇒`) | 0 |
| materials (cùng file) | — | 2 | FAB | — | 0 | 0 | 0 |
| hardware `AccessoriesManager` | 0 | 3 | FAB | 3 | 1 (`w-10 h-10` ảnh) | 0 | 0 |
| quote-calc `WorkshopEstimatorBOM` | **7** (toàn dot trạng thái) | 2 | FAB | 6 | 0 | 0 | 0 |
| queue/orders/inventory `Group5ProductionPanel` | **12** | 3 | FAB | 3 | 2 (`w-9 h-9`, `w-10 h-10`) | 3 → 0 | 0 |
| products `AdminProductsPanel` | 0 | **1** | FAB | 3 | 0 | **13 → 17** (⚠🔧✓✖) | 0 |
| storefront `AdminStorefrontPanel` | 1 | 4 | FAB | 6 | 0 | 3 → 0 | 0 |
| seo `AdminSeoPanel` | 2 | 3 | FAB | **12** | 0 | 7 → 0 (✓✗ là glyph) | 0 |
| settings `AdminSettingsPanel` | 0 | 2 | FAB | 3 | 0 | 0 | 0 |
| warehouse `WarehouseInventoryPanel` | 2 | 3 | FAB | 4 | 0 | 0 | 0 |
| khung `AdminDashboardView` | 1 (avatar “AD”) | — | — | 1 (skeleton) | 0 | 0 | 0 |

Đọc bảng:
- **`rounded-full` trên CTA thật: chỉ 1 nguồn** — FAB “Trợ lý tự động” ở `App.tsx:1686` (hiện trên cả 16 mục admin). Còn lại `rounded-full` là **badge / avatar / dot trạng thái / thanh progress** (chấp nhận được về mặt token, nhưng nếu quy chuẩn là "badge dùng `rounded-sm`" thì cần thống nhất: nhiều nhất là `Group5ProductionPanel` 12 chỗ và `WorkshopEstimatorBOM` 7 dot).
- **Card tự dựng là vấn đề lớn nhất về nhất quán**: 4 panel `Group1/2/3 + Seo` có **12–16** card tự dựng/panel (tổng 57), trong khi `overview` = 0 (đã dùng primitive). Đây là mốc "trước": nếu chuyển sang `Card`/`Section` của `@frontend/ui` thì kỳ vọng 0.
- **`h-9/h-10/h-12` hand-rolled rất ít** (5 chỗ toàn repo admin): `AccessoriesManager.tsx:287`, `AdminSidebar.tsx:296` (file chết), `Group2DesignersPanel.tsx:597`, `Group5ProductionPanel.tsx:524,865`. Đây là 3 chỗ sống cần sửa.
- **Emoji hiển thị**: `AdminProductsPanel` **17 node** (⚠ Thiếu Profile Slicing / 🔧 Cần Review CAD / ✖ Archived — `AdminProductsPanel.tsx:190,191,260,264,268,290,403,404,541,542`), `Group2DesignersPanel` 3 (👑 ⚙️ 🚀 — `:257,259,261`), `Group3CustomersPanel` 2 (🏢 👤 — `:394,474`), `PricingConfigPanel` 2 (⚠️ — `:1739,1763`). Lưu ý glyph `✓ ✗` ở `AdminSeoPanel.tsx:286-309` và `⇒` cũng bị bộ đếm emoji bắt — nên thay bằng `Icon` (lucide) theo `docs/design/icon-map.md`.
- **Màu/nền sai token: 0** — `grep -rnE "bg-white|text-black|bg-(gray|slate|zinc)-[0-9]|bg-\[#|text-\[#" src/frontend/components/admin` → **No matches**; cũng 0 lớp arbitrary hex trong `className` theo AST. (Điểm sáng.)

---

## 5. Chức năng: mục **không ghi được DB** (kèm bảng đáng lẽ phải dùng)

| # | Mục | Hiện trạng | file:line | Bảng/hàm ĐÁNG LẼ phải dùng |
|---|---|---|---|---|
| 5.1 | **queue / orders** (Kanban 8 nấc + điều phối) | Toàn bộ job đọc/ghi `localStorage: vcube_production_store_v1`; `orders` prop bị bỏ qua; **không** có lệnh ghi nào tới DB | `src/stores/useProductionStore.ts:281,616,238`; `Group5ProductionPanel.tsx:14,23` (prop không dùng); `Group5ProductionPanel.tsx:110` gọi `onUpdateOrderStatus` → `App.tsx:1285-1303` **chỉ `setOrders`** | `orders` qua **`dbService.updateOrderStatus()`** (`src/backend/supabase/database.ts:297`, hiện **0 caller**) hoặc `orderService.updateOrderStatus` (`src/backend/services/orderService.ts:21`, **không file frontend nào import**). Job/timeline nên suy từ `orders` + `order_files` |
| 5.2 | **machines** (Đội máy in / Fleet) | Máy đọc từ store in-memory rỗng; props `printers`/`onUpdatePrinters` không dùng; DB `printer_fleet` có 7 dòng nhưng UI hiện “TỔNG MÁY IN 0” | `Group1WorkshopsPanel.tsx:9-10,25-46`; `src/stores/useWorkshopAdminStore.ts:73` | `printer_fleet` qua **`dbService.savePrinter`** (`database.ts:503`, hiện chỉ được gọi từ `App.tsx:952`) và `dbService.getPrinters` (`:494`); hoặc `workshopService.getMyMachines/saveMyMachine` (`workshopService.ts:1299-1396`) |
| 5.3 | **designers** (Nhà thiết kế & bản quyền) | 100% in-memory: hồ sơ, duyệt hoa hồng, payout đều mất khi reload; `INITIAL_DESIGNERS/WITHDRAWALS = []` | `src/stores/useDesignerAdminStore.ts:76,81,83`; `Group2DesignersPanel.tsx:21-35,81-123` | `designer_profiles` — đã có sẵn `workshopService.getDesignerProfiles()` (`workshopService.ts:915`), `upsertDesignerProfile` (`:980`), `deleteDesignerProfile` (`:1007`); tiền payout nên vào `payment_transactions` (`20260901_baseline_schema.sql:766`) |
| 5.4 | **users** phần khách hàng + RFQ | Chỉ KYC ghi DB; danh sách khách & báo giá lô lớn nằm in-memory | `Group3CustomersPanel.tsx:98,139` (DB) vs `:2-3` store; `src/stores/useCustomerAdminStore.ts:96,101` | `customer_profiles` — `workshopService.getCustomerProfiles()` (`workshopService.ts:1020`), `upsert` (`:1077`), `delete` (`:1100`); RFQ → `quotes` (`baseline:747`) |
| 5.5 | **hardware** (Phụ kiện, ốc cấy & nam châm) | Đọc DB nhưng mọi thêm/sửa/xoá đi vào `setAccessories` | `AdminDashboardView.tsx:372` (`onUpdateAccessories={...}` trong props Group4) → `App.tsx:1622` (route `/admin`) và `App.tsx:1653` (route `/admin/:section`), cả hai đều là `setAccessories` (setter trần) | `accessories` qua **`dbService.saveAccessory`** (`database.ts:725`, **0 caller**) |
| 5.6 | **inventory** (Kho vật liệu & vị trí kệ) | Route `inventory` **không mở panel kho** (mở Kanban). Panel kho nằm trong nhóm pricing; sửa tồn kho vật liệu ghi DB (upsert) ✅ nhưng sửa tồn **phụ kiện** chỉ vào state | `AdminDashboardView.tsx:379-388` (route) vs `PricingConfigPanel.tsx:2409` (panel thật); `WarehouseInventoryPanel.tsx:66-89` | tồn kho nên ghi `material_inventory_logs` (audit nhập/xuất — `workshopService.ts:891,1478`) + `workshop_materials`/`workshop_accessories`; hiện `onUpdateMaterials` chỉ **upsert toàn mảng** `materials` (`App.tsx:938`) và **không có nhật ký kho** |
| 5.7 | Xoá vật liệu / máy in | `handleUpdateMaterials/Printers` chỉ `saveMaterial/savePrinter` cho từng phần tử ⇒ **xoá trong UI không xoá dưới DB** (không có `deleteMaterial`) | `App.tsx:930-954`; `database.ts` (không có hàm delete cho materials/printer_fleet) | thêm đường delete tương ứng bảng `materials` / `printer_fleet` |

Lệnh tái lập phần này:
```bash
grep -rn "dbService\." src/frontend/components/admin src/frontend/views/AdminDashboardView.tsx
# → chỉ 4 dòng: Group1:62, Group1:103, Group3:98, Group3:139
grep -rn "saveAccessory\|saveMaterial\|savePrinter\|saveWorkshopPartner\|saveAppSettings" src/ --include=*.ts --include=*.tsx
grep -rn "updateOrderStatus\|orderService" src/ --include=*.ts --include=*.tsx
# → updateOrderStatus chỉ có trong database.ts:297 + orderService.ts:21,33; KHÔNG có caller ở frontend
grep -rn "onUpdateAccessories" src/App.tsx            # 1622,1653 = setAccessories (setter trần)
grep -rn "printers" src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx   # chỉ 9,10 (khai báo) + 2 nhãn text
```

---

## 6. Chỗ **bịa số** trong admin (`?? <số>` / `|| <số>` / số cứng như dữ liệu thật)

Lệnh: AST bắt mọi `BinaryExpression` có `??`/`||` với RHS là NumericLiteral: `a3-audit.cjs` (trường `fabricatedFallback`) → `node a3-detail.cjs /tmp/a3-audit-a.json /tmp/a3-audit-b.json`.

**Nhóm A — ghi thẳng số bịa vào dữ liệu (nghiêm trọng):**
| file:line | biểu thức | hệ quả |
|---|---|---|
| `AdminProductsPanel.tsx:83` | `Number(newProductForm.pricePhysical) \|\| 150000` | Admin bỏ trống giá ⇒ sản phẩm được **tạo thật trong `products` với giá 150.000đ** |
| `AdminProductsPanel.tsx:84` | `Number(newProductForm.priceDigital) \|\| 45000` | tương tự, 45.000đ |
| `AdminStorefrontPanel.tsx:661` | `value={localContent.freeShippingThreshold \|\| 300000}` | DB chưa có ngưỡng ⇒ ô **hiển thị 300.000** như đã cấu hình; sửa ô khác rồi Lưu ⇒ 300.000 bị ghi thật vào `site_content`. Nhập 0 cũng bị đổi thành 300000 |
| `AdminStorefrontPanel.tsx:671` | `value={localContent.standardShippingFee \|\| 25000}` | như trên, 25.000đ |
| `AdminProductsPanel.tsx:89-99` | `specs \|\| {dimensions:'80 x 80 x 40 mm', weight:'60g',…}`, `supportedMaterials \|\| ['PLA Tough','PETG']`, `colors \|\| [{name:'Đen Kỹ Thuật',hex:'#1C1C1C'}]`, `tags \|\| ['cơ khí','linh kiện']`, `badge \|\| 'MỚI'`, `name \|\| 'Linh Kiện Mới'`, `designer \|\| 'VCUBE Engineering'`, `images \|\| [ảnh unsplash]` | Tạo sản phẩm với **thông số/ảnh/nhãn bịa** khi admin không nhập — đúng loại "dữ liệu bịa" mà `scripts/check-fabricated.mjs` nhắm tới |

**Nhóm B — số bịa dùng cho ĐẾM/BADGE (sai âm thầm):**
| file:line | biểu thức | hệ quả |
|---|---|---|
| `AdminDashboardView.tsx:147` | `m.stockRollsCount ?? 10` | Vật liệu chưa khai tồn ⇒ bị coi là **10 cuộn** ⇒ không bao giờ vào `lowMaterialsCount` ⇒ **badge “Kho … sắp hết” bị ẩn sai**. Bản `AdminSidebar` cũ đã bỏ kiểu này (xem ghi chú `AdminSidebar.tsx:230`) |

**Nhóm C — số bịa hiển thị như số đo (mức trung bình):**
| file:line | biểu thức | hệ quả |
|---|---|---|
| `WarehouseInventoryPanel.tsx:288-289` | `const count = mat.stockRollsCount \|\| 0; const isLow = count <= 3;` | Chưa khai tồn ⇒ hiện **“0”** và gắn cờ **sắp hết** — trái với chính doc-comment `:6-13` (“thiếu số ⇒ `—`, KHÔNG bịa 0”). `a3-detail` ghi 10 chỗ `\|\| 0` trong file (dòng 42,45,49,51,52,56,69,284,288) |
| `Group2DesignersPanel.tsx:374,612` | `d.totalRoyaltiesEarned \|\| 0`, `d.monthlyRevenueVnd \|\| 0` | hiện **0 ₫** cho dữ liệu chưa có (in-memory nên luôn 0) |
| `Group3CustomersPanel.tsx:36,37,212` | `u.totalOrders \|\| 0`, `u.totalSpent \|\| 0`, `rfq.quotedPriceVnd ?? rfq.budgetEstimateVnd ?? 0` | hiện 0 thay vì `—` |
| `Group0OverviewPanel.tsx:81` | `row.order.payment?.total ?? 0` | doanh thu cộng 0 cho đơn thiếu payment |
| `WarehouseInventoryPanel.tsx:45` | `(cost ?? 0) * (m.stockRollsCount \|\| 0)` | tổng giá trị kho bị **thiếu** mà không luôn nói rõ (file có cờ `materialValueIncomplete` ở `:49` — nên dùng cờ đó cho mọi chỗ) |

**Số mẫu NHƯNG có nhãn (không tính là vi phạm, ghi để khỏi tranh cãi):** `PricingConfigPanel.tsx:215-219` điền sẵn bộ số Inkiri khi `pricing_global_settings` trống, **kèm băng-rôn bắt buộc** “Đang dùng giá trị mẫu theo Inkiri — chưa được xem xét cho VCUBE” (`:893-938`) + InfoTip nêu nguồn/ngày (`INKIRI_REFERENCE_VALUES`, `mockData.ts:96`) và viền nét đứt (`:1073`). **Không ghi DB cho tới khi bấm Lưu.**
**Dữ liệu chết (không hiển thị nên không phải bịa):** `KANBAN_STAGES[*].avgDuration` (‘15 phút’, ‘3h - 12h’…) và `.role` trong `useProductionStore.ts:28-133` — `grep -n avgDuration src/frontend/components/admin` → **0 dòng** ⇒ không render.

---

## 7. Việc cần sửa, xếp theo mức ảnh hưởng

| Ưu tiên | Việc | file:line | Vì sao |
|---|---|---|---|
| **P0** | `queue/orders/inventory` phải đọc `orders` từ DB và ghi trạng thái bằng `dbService.updateOrderStatus` (thay vì store localStorage) | `App.tsx:1285`, `Group5ProductionPanel.tsx:14,23`, `src/stores/useProductionStore.ts:281,616` | 3 mục menu đang là **cùng một màn trống**; mọi thao tác Kanban mất khi reload |
| **P0** | Route `inventory` phải mở `WarehouseInventoryPanel` (hoặc dạy `Group5` nhận `section`) | `AdminDashboardView.tsx:379-388`, `PricingConfigPanel.tsx:2409` | Mục “Kho Vật Liệu & Vị Trí Kệ” hiện mở nhầm Kanban; nút “Kho” ở Tổng quan (`Group0OverviewPanel.tsx:387,474`) cũng đi nhầm |
| **P0** | Nối `onUpdateAccessories` vào DB (`saveAccessory`) | `App.tsx:1622,1653`; `database.ts:725` | Sửa phụ kiện mất khi reload; hàm ghi đã có sẵn |
| **P0** | Bỏ số bịa khi tạo sản phẩm / cấu hình vận chuyển | `AdminProductsPanel.tsx:83,84,89-99`; `AdminStorefrontPanel.tsx:661,671` | Đang ghi giá/phí/thông số bịa vào DB thật |
| **P1** | Đội máy in đọc `printer_fleet` (dùng `printers` prop hoặc `workshopService`) | `Group1WorkshopsPanel.tsx:9-10,25-46`, `useWorkshopAdminStore.ts:73` | DB có 7 máy, UI hiện 0 |
| **P1** | Panel Nhà thiết kế đọc/ghi `designer_profiles` | `useDesignerAdminStore.ts:76,81`, `Group2DesignersPanel.tsx:21-35` | cả panel đang là RAM |
| **P1** | Danh sách khách + RFQ đọc `customer_profiles`/`quotes` | `useCustomerAdminStore.ts:96,101`, `Group3CustomersPanel.tsx:2-3` | Runtime “TỔNG KHÁCH HÀNG 0” dù có KYC thật |
| **P1** | Chuyển 12 đoạn chữ ≥80 ký tự vào `InfoTip` (7 chỗ ở Pricing) | `PricingConfigPanel.tsx:1227,1229,1259,1413,1735` + `WorkshopEstimatorBOM`, `AdminSeoPanel.tsx:286`, `AdminStorefrontPanel.tsx:38`, `Group0OverviewPanel` | `pricing` đang 6.067 ký tự/2 InfoTip |
| **P1** | Bỏ `<main>` lồng nhau ở `App.tsx:1358` (dùng `<div>`) hoặc cho `AppShell` không render `<main>` | `App.tsx:1358`, `AppShell.tsx:160` | 2 landmark `main` trên mọi trang admin |
| **P2** | Ẩn FAB “Trợ lý tự động” trong `CHROMELESS_SCREENS` | `App.tsx:1681-1696`, `App.tsx:987` | Chrome storefront lẫn vào admin, đè control |
| **P2** | `WarehouseInventoryPanel` hiện `—` thay `0` khi chưa khai tồn | `WarehouseInventoryPanel.tsx:288-289` (+`:42,45,49,…`) | Trái doc-comment của chính file |
| **P2** | Thay emoji bằng `Icon`: products 17 node, designers 3, users 2, pricing 2 | `AdminProductsPanel.tsx:190,191,260,264,268,290,403,404`; `Group2DesignersPanel.tsx:257,259,261`; `Group3CustomersPanel.tsx:394,474`; `PricingConfigPanel.tsx:1739,1763` | `docs/design/icon-map.md` |
| **P2** | Gộp card tự dựng về primitive `Card/Section`: 57 card ở Group1/2/3 + Seo (12–16 mỗi panel) | `Group1…:286-1537`, `Group2…:129-801`, `Group3…:252-1192`, `AdminSeoPanel…:60-522` | Lệch nhịp với `overview` (0 card tự dựng) |
| **P3** | `h-9/h-10/h-12` hand-rolled còn 3 chỗ sống | `AccessoriesManager.tsx:287`, `Group2DesignersPanel.tsx:597`, `Group5ProductionPanel.tsx:524,865` | Nhất quán kích thước |
| **P3** | Thêm `deleteMaterial`/`deletePrinter` để xoá UI đi tới DB | `App.tsx:930-954` | Upsert-only |
| **P3** | Bỏ/sửa badge `m.stockRollsCount ?? 10` | `AdminDashboardView.tsx:147` | Badge low-stock sai |
| **P3** | Xoá `AdminSidebar.tsx` (component chết) hoặc tách `buildAdminNavGroups` sang file riêng | `AdminSidebar.tsx:209-452` | 452 dòng, chỉ dùng 2 export dữ liệu; đang gây hiểu nhầm "2 sidebar" |

---

## 8. Ba–năm việc QUAN TRỌNG NHẤT

1. **`queue`/`orders`/`inventory` là ba lối vào cùng một màn Kanban rỗng, dữ liệu chỉ nằm trong `localStorage`** — đã đo: `panelChars` 765 giống hệt nhau, text giống hệt; `orders` prop bị bỏ; `dbService.updateOrderStatus` (`database.ts:297`) có sẵn nhưng **0 caller**. Sửa việc này gỡ luôn cả "3 mục menu trùng" và "Kanban không ghi DB".
2. **Ba panel đang chạy trên dữ liệu RAM/không DB: Đội máy in (0 máy trong khi DB có 7), Nhà thiết kế (0 bản ghi), Khách hàng–RFQ (0 bản ghi)** — trong khi service/DB đã sẵn (`printer_fleet`, `designer_profiles`, `customer_profiles`).
3. **Ghi DB đang hụt ở phụ kiện (`saveAccessory` 0 caller) và ở xoá vật liệu/máy** ⇒ thao tác admin trông như thành công nhưng mất khi tải lại.
4. **Số bịa đi thẳng vào dữ liệu thật**: giá mặc định 150.000/45.000 khi tạo sản phẩm, phí ship 300.000/25.000 hiển thị như đã cấu hình, tồn kho chưa khai hiện "0" + cờ sắp hết.
5. **Chrome đã đúng 1 tầng nav** (aside 1/1, nav visible 1/2; bản thứ hai nằm trong `<dialog>` đóng) — nhưng còn **2 landmark `<main>` lồng nhau** (`App.tsx:1358` + `AppShell.tsx:160`) và **FAB storefront** hiện trong admin (`App.tsx:1686`).

---

## 9. Lỗi do chính tôi gây ra trong quá trình rà soát

1. **Đếm sai ở phiên bản đầu của dụng cụ tĩnh**: bản `a3-audit.cjs` v1 chỉ tính string literal khi tên attribute nằm trong danh sách "chữ", nên **bỏ sót toàn bộ nhánh `{isVi ? '…' : '…'}`** ⇒ ra `TOTAL 18.776` ký tự. Đã viết lại (v2: mọi literal nằm trong cây JSX, trừ attribute phi-văn-bản) ⇒ `47.094`. Mọi số trong báo cáo này là **v2**. Đã in bảng thô cả hai lần để so.
2. **Đo DOM sai ở lần chạy đầu**: `document.querySelector('main')` trả về `<main className="flex-1">` của `App.tsx:1358` (bao cả sidebar) nên `panelChars` bị **cộng cả chữ của nav** (overview 1688 thay vì 1021). Đã sửa sang `main[aria-label]` và chạy lại 16/16 mục; số trong báo cáo là lần chạy thứ hai (`/tmp/a3-dom.json`).
3. **Tôi đã ghi file ra ngoài repo** (được phép): báo cáo này + **6 script dụng cụ** ở `C:\Users\chith\AppData\Local\Temp\vcube-a3-tools\` (`a3-audit.cjs`, `a3-summary.cjs`, `a3-detail.cjs`, `a3-dom.cjs`, `a3-dom-table.cjs`, `a3-samples.cjs`) và **build tĩnh** ở `/tmp/vcube-a3-dist` (không dùng `dist/` của repo — `dist/` không bị chạm, vẫn là bản 12/09 13:19) + profile Chromium `/tmp/a3-chrome-profile`.
   ⚠️ **Đính chính một câu tôi đã viết sai ở bản nháp**: tôi từng định viết "thư mục `payload` chỉ có 1 file". Kiểm lại bằng glob: `C:\Users\chith\AppData\Local\Temp\vcube\payload\` là **thư mục dùng chung của nhiều phiên trước, có 1.514 đường dẫn** (`glob` báo "Showing 100 of 1514 paths"). Việc đúng mà tôi đã làm: **chỉ THÊM đúng 1 file** `A3-report.md` vào đó, không sửa/xoá file nào của phiên khác.
4. **Quá trình đo có tạo tiến trình**: `vite preview` cổng 4188 và Chromium headless (cổng gỡ lỗi 9333) — **đã kill đúng PID** (không dùng `pkill`/`killall`) và xoá `/tmp/vcube-a3-dist`, profile `/tmp/a3-chrome-profile`; `:3000` không bị chạm (không có tiến trình nào listen lúc bắt đầu).
5. **Đăng nhập admin**: dùng `chithanhso10@gmail.com` + mật khẩu qua **biến môi trường** `A3_PW`, gọi `POST /auth/v1/token` bằng khoá **publishable** rồi ghi session vào `localStorage` của Chromium; **không in URL/khoá/token/mật khẩu** ra log (script chỉ trả `{ok, hasAccessToken, userIdTail}`). Không thực hiện bất kỳ lệnh ghi DB nào; mọi truy vấn DB là **đọc** (script không gọi endpoint ghi nào).
6. **Hai chỗ tôi KHÔNG đo được / không kết luận**:
   - Không kiểm chứng được con số "**17 mục**" của anh: menu có **16 mục** và **22 route id**; tôi báo cáo 16 và nói rõ cách đếm, không tự thêm mục thứ 17.
   - `WarehouseInventoryPanel` và `WorkshopEstimatorBOM` **không có route riêng** nên không có `panelChars` runtime; số của chúng là đo tĩnh (đã ghi rõ trong bảng §3.1).
7. **Lỗi công cụ (không phải lỗi repo)**: nhiều lần ghép lệnh `pwsh → wsl → bash` bị PowerShell phá dấu nháy (đã bỏ các lệnh đó và chuyển sang dùng `grep`/`read` của harness hoặc script file); Chromium trong `~/.cache/ms-playwright` thiếu `libnspr4/libnss3/libasound` nhưng **libs đã có sẵn** ở `/tmp/vc-libs` (do phiên trước bóc ra) nên tôi chỉ cần `LD_LIBRARY_PATH`, **không cài thêm gì**.
