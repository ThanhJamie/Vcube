> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# Đợt 7 — brief thi công (đọc `agent-brief.md` TRƯỚC, gồm cả §2.1 luật mới)

Luật môi trường/gate/quoting: `docs/plans/agent-brief.md`. File này chỉ nói **việc cụ thể + bằng chứng**.

## 0. Vì sao có Đợt 7

Gate tổng hợp lần 2 của coordinator trên bản merge Đợt 6 (`lint`/`build`/`contrast`/`lint-rls-sources`/`lint-rls-migration` đều **RC=0**): `jargon GROUP n` **25 → 0** · toast chết **1 → 0** · `bootstrapSettings` **0 → 1 call site** · chuỗi bịa nghiêm trọng **35 → 28** · emoji cờ **3 → 2**. Nhưng vẫn còn:

| Hạng mục | Số đo hiện tại | Ghi chú |
|---|---:|---|
| palette thô (`slate-*`…) | **36** | toàn bộ ở `src/stores/` (32) — O1 |
| chuỗi bịa nghiêm trọng | **28** | `LanguageContext.tsx` **16** (O3) · `mockData.ts` 3 (O3) · `AdminStorefrontPanel` 2 (O3) · `AdminSeoPanel`/`AdminProductsPanel`/`OnboardingWizard`/`useProductionStore`/`pricingEngine`/`meshParser`/`workshopService` mỗi file 1 |
| emoji cờ | 2 | `data/mockData.ts:33` · `components/admin/AdminStorefrontPanel.tsx:316` (O3) |
| `font-serif` | **11** | `tokens.md` §4 cấm; A2c đã sửa `--font-serif` thành serif THẬT ⇒ 11 heading này **đang đổi hình** (O5) |
| `htmlFor` trong `admin/**` | **3** / `<input>` **163** | a11y — để **Đợt 7B** (xung đột file với O2/O3) |
| `Math.random()` | 29 (14 file) | 4 chỗ là SKU ghi DB: `AdminProductsPanel.tsx`, `AccessoriesManager.tsx` (O5) |
| nút pill `rounded-full` | còn ~302 `rounded-(lg\|md\|sm)` | để **Đợt 7B** (chạm gần như mọi file) |

**Chủ dự án đã chốt ở cổng duyệt:** duyệt **cả 7 mục** còn lại của Đợt 6; và với `LanguageContext.tsx` chọn **phương án LAI** — *tuyên bố* (dung sai, SLA, chuẩn, chứng nhận, hotline) **đưa vào cấu hình admin, rỗng thì ẩn**; *câu văn quảng cáo có số bịa* ("trong 3 giây", "Mitutoyo") thì **viết lại trung tính**.

---

## O1 — Fixture ở tầng store + badge số máy in bịa (Đợt 6 #2, #3)

**File được giao:** `src/stores/useProductionStore.ts` · `src/stores/useCustomerAdminStore.ts` · `src/stores/useWorkshopAdminStore.ts` · `src/stores/useDesignerAdminStore.ts` · `src/stores/useAdminOverviewStore.ts` (**XOÁ FILE**) · `src/frontend/components/admin/AdminSidebar.tsx`.

**Bằng chứng:**
- `stores/useProductionStore.ts:228 INITIAL_WORKSHOP_NODES`, `:295 INITIAL_PRODUCTION_JOBS` (file 975 dòng) — fixture hiển thị **như dữ liệu thật** trên panel Group1/2/3/5; **32 dòng palette thô** ở đây + `useAdminOverviewStore.ts`.
- `AdminSidebar.tsx:70` badge `` `${printersCount} máy` `` hiện **"8 máy"** trong khi DB `printer_fleet` = **0** ⇒ `printersCount` là prop từ `views/AdminDashboardView.tsx` tính từ **store fixture**. Truy ngược tìm nguồn thật (phải là `printer_fleet` qua `src/backend/supabase/*`, hoặc `—`/ẩn badge khi rỗng).
- `stores/useAdminOverviewStore.ts` — **0 importer** (coordinator grep xác nhận) nhưng chứa **22 số bịa** ⇒ **xoá file**. Trước khi xoá phải tự grep lại `useAdminOverviewStore` toàn `src/` để chắc chắn 0 importer.

**Việc:**
1. Rỗng hoá toàn bộ fixture ở 4 store còn lại: **giữ nguyên tên export + type annotation**, giá trị về `[]`/`null` kèm comment ghi mã finding trong `docs/design/data-honesty.md` (theo đúng cách A10 đã làm với `src/data/mockData.ts`).
2. **Không** đổi API store (tên hàm/selector) — panel đang đọc; nếu panel sẽ vỡ vì rỗng thì **báo lại**, đừng sửa panel (file ngoài phạm vi O1).
3. Palette thô trong 2 file store → token (dùng bảng map `12-ui-refactor-spec.md` §1); file bị xoá thì không cần.
4. `AdminSidebar.tsx`: badge số máy in lấy từ **nguồn thật**; rỗng ⇒ **ẩn badge** (không in "0 máy" nếu chưa từng khai báo — chọn cách trung thực và nói rõ bạn chọn gì).

**Gate:** lint · `npx vite build --outDir /tmp/vc-verify-o1 --emptyOutDir` (xoá sau) · contrast.
**Grep chứng minh:** palette thô trong `src/stores` → **0** · `grep -rn 'useAdminOverviewStore' src` → **0**.
**Playwright red→green:** RED = chụp `/admin` + Group1/2/3/5 **trước** khi sửa, đếm số chuỗi fixture hiển thị như dữ liệu thật (nêu rõ chuỗi nào). GREEN = sau khi sửa, **0** chuỗi đó, mỗi panel hiện empty state/`—`, badge sidebar **không** hiện "8 máy", 0 pageerror. Ảnh `pwtest/o1/`.
**⚠️ Cảnh báo:** đây là thay đổi **làm trống nhiều màn hình** (giống Đợt 4b). Nếu panel nào crash vì mảng rỗng, **báo `file:line`** thay vì tự sửa file ngoài phạm vi.

---

## O2 — Trung thực đầu vào giá (Đợt 6 #4 + rủi ro N2 phát hiện)

**File được giao:** `src/frontend/components/admin/PricingConfigPanel.tsx` · `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`.

**🔴 Ràng buộc số 1: KHÔNG đổi công thức pricing.** Chỉ được bỏ **giá trị mặc định bịa**; công thức, thứ tự tính, hệ số vẫn nguyên. Nếu một tham số trở nên bắt buộc thì phải **chặn lưu + báo lỗi**, không thay bằng số khác.

**Bằng chứng:**
- `PricingConfigPanel.tsx:118,119,120,122,123,125,127,194,…` — `|| 30000000`, `|| 8000`, `|| 2500`, `|| 2850`, `|| 65000`, `|| 12000`, `|| 15000`, `|| 350000`: **số bịa được ghi vào `pricing_configs`** khi admin bấm Lưu ⇒ lan ra **mọi báo giá**. Nút **"Khôi Phục Chuẩn Inkiri"** (`:144-146`) đẩy **22 số fixture**.
- `WorkshopEstimatorBOM.tsx:104-118` (N2 phát hiện, cùng file): `|| 350000`, `|| 30000000`, `|| 8000`, `|| 2500`, `|| 0.18`, `|| 2850`, `|| 65000`, `|| 12000`, `?? 8000`, `|| 15000`, `|| 8`, `totalLaborMins ?? 4/5/8/6/4/3` ⇒ **con số trong báo giá gửi khách vẫn dựa trên input đoán**. N2 đã dọn phần văn bản, chưa được phép đụng phần số.

**Việc:**
1. Bỏ mọi `|| <số>` / `?? <số>` nguỵ trang thành "giá trị mặc định" ở 2 file. Chỗ nào thiếu dữ liệu ⇒ `null` + hiện **"Chưa cấu hình"** + chặn Lưu (dùng `ValidationIssue` của `settingsService` nếu áp dụng được) hoặc **ẩn dòng** trong báo giá gửi khách.
2. Xử lý nút **"Khôi Phục Chuẩn Inkiri"**: giữ chỉ khi nó khôi phục từ **giá trị đã lưu trong DB**; nếu nó đẩy fixture hardcode thì **xoá nút** (đọc code trước, nói rõ bạn chọn gì và vì sao).
3. `pricing_global_settings` (VAT / điện / nhân công) **chưa có UI** — đây là mục THIẾU của `docs/plans/09-admin-settings.md` §7. Thêm khối cấu hình **vào chính `PricingConfigPanel.tsx`** (KHÔNG tạo route/panel mới — `AdminSidebar`/`AdminDashboardView` không thuộc O2, thêm route sẽ xung đột O1). Dùng `getPricingGlobalSettings` + `savePricingGlobalSettings` của `settingsService` (đã có). Nhớ: `vat_percent` đã `drop default` và có CHECK 0–20; rỗng = chưa cấu hình, **không** mặc định 8%.
   ⚠️ `src/frontend/lib/vat.ts` có `VAT_RATE = 0.08` cứng — **file đó không thuộc O2**; chỉ **báo lại** trong mục "còn lại" nếu thấy nó chặn việc đọc VAT từ DB.
4. Ô nhập phải có `<label htmlFor>` khớp `id`.

**Gate:** lint · build outDir riêng · contrast · `node scripts/lint-rls-sources.mjs` (không đổi).
**Grep chứng minh:** trong 2 file, `grep -nE '\|\|\s*[0-9]+|\?\?\s*[0-9]+'` → còn lại **chỉ những chỗ có nguồn** (liệt kê từng dòng còn lại kèm lý do).
**Playwright red→green:** RED = trên bản hiện tại, mở `/admin` → panel giá, bấm Lưu khi ô trống ⇒ chứng minh **số bịa bị ghi vào DB** (đọc lại response POST/PATCH, không suy luận). GREEN = ô trống ⇒ bị chặn + `0` request ghi; có giá trị thật ⇒ ghi đúng. Ảnh `pwtest/o2/`.

---

## O3 — `LanguageContext` theo phương án LAI + storefront/SEO + emoji (chủ dự án đã chốt)

**File được giao:** `src/frontend/context/LanguageContext.tsx` · `src/frontend/components/admin/AdminStorefrontPanel.tsx` · `src/frontend/components/admin/AdminSeoPanel.tsx` · `src/data/mockData.ts`.

**Quyết định chủ dự án (nguyên văn ý):** *tuyên bố → cấu hình admin; câu văn → viết lại trung tính.*

**16 chuỗi bịa trong `LanguageContext.tsx` (đã xác minh dòng):**
`:12-13` `industrialTolerance` "Dung sai chế tạo: ±0.05mm" · `:52-53` `campaign29Desc` "Giảm 20% … miễn phí kiểm định dung sai ±0.05mm … #2/9" · `:78-79` `heroDescription` "…trong 3 giây với dung sai đo kiểm dưới ±0.05mm" · `:102-103` `statToleranceVal` "±0.05 MM (Mitutoyo)" · `:106` `statLeadTimeVal` "GIAO HÀNG 24H" · `:110-111` `statStandardVal` "ISO/ASTM 52900" · `:310` `liveSupportEngineer` "Kỹ Sư VCUBE 24/7" · `:334-335` prose "…theo tiêu chuẩn công nghiệp ISO/ASTM 52900" · `:366-367` `footerIsoCert` "Chứng nhận ISO 9001:2015".

**Phân loại bắt buộc:**
- **Nhóm A — TUYÊN BỐ (đưa vào cấu hình admin, rỗng ⇒ ẨN):** dung sai chế tạo · thời gian giao · tiêu chuẩn/certification · hotline/kênh hỗ trợ. Nguồn: `site_content` (`toleranceSpec`, các trường hero metric) và `app_settings` (`hotline`, `contactEmail`) qua `settingsService` (`settingsAccessors` + `subscribeSettings`, hoặc hook `useSettings` ở `src/frontend/hooks/useSettings.ts` mà N1 vừa tạo — **được phép import**, nhưng **không sửa** file đó). Đã có key i18n mới ở `App.tsx` (`footerToleranceLabel`, `footerQcPolicy`, `supportAssistant`, `footerAbout`) từ A22b — **đọc `App.tsx` để tái dùng, không tạo bản trùng**.
- **Nhóm B — CÂU VĂN CÓ SỐ BỊA (viết lại trung tính, KHÔNG để lại số):** "trong 3 giây" → mô tả không hứa thời gian · "Mitutoyo" → bỏ tên thiết bị cụ thể · "ISO/ASTM 52900" trong câu văn → bỏ tuyên bố chuẩn · chiến dịch "#2/9 giảm 20%" → nếu không có chiến dịch thật thì để **rỗng** và tắt.
- **Nhóm C — phải TẮT, không chỉ sửa chữ:** `campaign29Desc` gắn với chiến dịch không tồn tại ⇒ đặt rỗng + đảm bảo `announcementActive` không bật vì nó.

**Việc khác trong phạm vi:**
- `AdminStorefrontPanel.tsx:316` placeholder `"VD: 🇻🇳 ĐẠI LỄ QUỐC KHÁNH 2/9"` — **bỏ emoji** và bỏ ví dụ về chiến dịch không tồn tại.
- `AdminStorefrontPanel.tsx` + `AdminSeoPanel.tsx` còn 1 chuỗi bịa mỗi file (`grep -nE '0\.05 ?mm|Mitutoyo|ISO/ASTM|GIAO HÀNG 24H|ISO 9001:2015'` để tìm) ⇒ xử lý theo đúng phân loại A/B/C trên. Nếu panel đang cho admin **nhập** các giá trị đó thì nó là **nguồn cấu hình** — kiểm xem nó có ghi được thật không (N1 vừa nối `settingsService`), và **đừng** để placeholder mẫu chứa số bịa.
- `src/data/mockData.ts:33` `POPULAR_TAGS`: `{ id:'2/9', nameVi:'🇻🇳 Đại Lễ 2/9', … isCampaign:true }` — **bỏ emoji**; và nợ #39 nói tag này trỏ **chiến dịch không tồn tại** ⇒ bỏ hẳn entry chiến dịch (nói rõ bạn chọn gì).
- `src/data/mockData.ts` còn 3 chuỗi bịa khác theo grep — tìm và xử lý cùng nguyên tắc.

**Gate:** lint · build outDir riêng · contrast.
**Grep chứng minh:** `grep -rnE '0\.05 ?mm|Mitutoyo|ISO/ASTM|ISO-52900|GIAO HÀNG 24H|ISO 9001:2015|Kỹ Sư VCUBE 24/7|🇻🇳|🇺🇸' <4 file được giao>` → **0**.
**Playwright red→green:** RED = `/` hiện đủ chuỗi nhóm B trên bản cũ (`±0.05 MM`, `GIAO HÀNG 24H`, `ISO/ASTM 52900`, `Kỹ Sư VCUBE 24/7`) **và** `announcementBadge` hiện emoji cờ. GREEN = **0** các chuỗi đó khi DB/cấu hình rỗng; footer/hotline **ẩn** thay vì in `—`; 0 pageerror; `html.dark` hai theme không đổi. Ảnh `pwtest/o3/`.
**Báo cáo thêm:** bảng "trường → nguồn cấu hình mới → hành vi khi rỗng" để chủ dự án biết **nhập ở đâu**.

---

## O4 — Dọn tận gốc `'role_select'` (nợ N3 chuyển lại)

**File được giao:** `src/frontend/stores/useUIStore.ts` · `src/App.tsx` · `src/frontend/components/Header.tsx` · `src/frontend/components/RoleGuard.tsx` · `src/frontend/components/AuthModal.tsx`.

**Bối cảnh (N3 đã làm phần lớn, còn 3 chỗ chặn):** N3 đã xoá nút demo và khối render, nhưng **union type vẫn buộc giữ `'role_select'`** vì:
- `src/frontend/stores/useUIStore.ts:18-19` khai `authModalMode`/`openAuthModal` có `'role_select'`;
  ⚠️ **ĐÍNH CHÍNH (O4 phát hiện):** brief bản đầu ghi sai là `src/stores/useUIStore.ts`; file thật nằm ở `src/frontend/stores/`. `src/stores/` chỉ chứa 4 store admin của O1.
- `src/App.tsx:545` (và `:1247`) truyền giá trị đó;
- `src/frontend/components/Header.tsx:15`.
N3 phải giữ nó ở **type nhập** (nếu thu hẹp sẽ lỗi `TS2322` ở file ngoài phạm vi) và quy về màn đăng nhập trong `initialize`.
Ngoài ra `RoleGuard.tsx` vẫn khai prop `onOpenAuthModal` với JSDoc `DI SẢN` vì `App.tsx:1072,1094,1120,1152` truyền vào 4 route.

**Việc — xoá `'role_select'` ở CẢ 5 file một lượt (đây là lý do 5 file nằm chung một agent):**
1. `useUIStore.ts`: bỏ `'role_select'` khỏi union `authModalMode` + `openAuthModal`.
2. `App.tsx`: bỏ mọi chỗ truyền/khai `'role_select'` (`:545`, `:1247`); bỏ prop `onOpenAuthModal` khỏi 4 route `:1072,1094,1120,1152` **nếu** `RoleGuard` không còn cần.
3. `Header.tsx:15`: bỏ `'role_select'`.
4. `RoleGuard.tsx`: xoá hẳn prop `onOpenAuthModal` (khai báo + JSDoc `DI SẢN`).
5. `AuthModal.tsx`: thu hẹp union `mode`/`initialMode` còn `'signin' | 'signup' | 'account'`; xoá nhánh quy đổi `role_select` trong `initialize` nếu không còn cần.
6. **Xác nhận `tsc` RC=0 sau khi thu hẹp** — đây chính là phép thử cho thấy đã dọn hết.

**Gate:** lint (**RC=0 là bằng chứng chính**) · build outDir riêng · contrast · chạy lại `pw-auth-prod-check.cjs` (bản production) và `pw-n3-roleguard.cjs` ⇒ `pw-n3-roleguard.cjs` phải vẫn **9/9 PASS**; `pw-auth-prod-check.cjs` P4 vẫn FAIL `count=0` **đúng yêu cầu mới** (ghi rõ, không dựng lại màn).
**Grep chứng minh:** `grep -rn "role_select" src` → **0**.

---

## O5 — SKU bịa + `font-serif` + dead code `seedService`

**File được giao:** `src/frontend/components/admin/AdminProductsPanel.tsx` · `src/frontend/components/admin/AccessoriesManager.tsx` · `src/backend/supabase/seedService.ts` · và **chỉ để xoá `font-serif`**: `src/frontend/views/HomeView.tsx` (`:480,668,756,881,933`) · `src/frontend/views/DesignerDashboardView.tsx` (`:1204`) · `src/frontend/components/tool3d/TransformControlsPanel.tsx` (`:30`) · `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx` (`:276`) · `src/frontend/components/tool3d/ValidationReportPanel.tsx` (`:53`) · `src/frontend/components/tool3d/PresetPalettePanel.tsx` (`:187`) · `src/App.tsx` (`:1289`).
`src/App.tsx` cũng thuộc **O4** ⇒ **O5 chỉ được sửa ĐÚNG dòng 1289** (xoá `font-serif`). Ghi rõ trong báo cáo để đối chiếu.

**Việc:**
1. **SKU bịa (Đợt 6 #5):** `AdminProductsPanel.tsx:35,73,107` sinh `VC-####` bằng `Math.random()`; `AccessoriesManager.tsx:27` sinh `ACC-####` ⇒ **mã định danh bịa được ghi vào DB**. Thay bằng: để admin **tự nhập** SKU, hoặc sinh từ **dữ liệu thật** (ví dụ đếm bản ghi hiện có + tiền tố do admin cấu hình), hoặc **để trống** và hiện "chưa có mã" — chọn cách nào cũng được nhưng phải **không bịa** và phải nói rõ đã chọn gì. Kiểm thêm `grep -rn 'Math.random' src/frontend` để chắc không sót chỗ nào khác ghi vào DB.
2. **`font-serif`:** xoá class `font-serif` ở **11 chỗ** trên (giữ `font-bold`/`font-display` sẵn có). Lý do: `docs/design/tokens.md` §4 cấm `font-serif`; A2c đã sửa `--font-serif` thành serif thật nên 11 heading này **đang render khác thiết kế**. Không đổi cấu trúc/chữ.
3. **Dead code:** `seedService.ts:154` còn comment trỏ nút **"Đồng Bộ DB" (`AdminDashboardView.tsx:135`)** — nút đã bị N4 **xoá**, nên comment sai/đã cũ; và `seedAllToSupabase()` (`:166-178`) nay **0 người gọi**. Sửa comment cho đúng sự thật và **xoá hàm dead** (hoặc nếu còn `SeedResult`/`getTableCounts` được dùng ở nơi khác thì giữ phần còn dùng — grep trước, nói rõ).

**Gate:** lint · build outDir riêng · contrast.
**Grep chứng minh:** `grep -rn 'font-serif' src` → **0** · `grep -rn 'Math.random' src/frontend/components/admin` → **0** · `grep -rn 'seedAllToSupabase' src` → **0** (hoặc giải thích nếu còn).
**Playwright:** mở `/admin` → tab Sản phẩm + Phụ kiện, xác nhận form thêm mới **không** tự điền mã `VC-xxxx`/`ACC-xxxx` bịa; 0 pageerror; chụp `pwtest/o5/`.

---

## 6. Ranh giới chung Đợt 7A

- Không ai sửa `src/index.css`, `src/frontend/ui/**`, `src/backend/services/settingsService.ts`, `src/backend/supabase/mappers.ts`, `src/frontend/hooks/useSettings.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `supabase/**`.
- **Không sửa công thức pricing** (`src/utils/pricingEngine.ts` là file **không ai được sửa** — nếu thấy nó chứa chuỗi bịa thì **báo lại**, đừng tự sửa).
- Không `git commit/push/checkout/stash/restore`. Không thêm dependency. Không in secret.
- Mỗi agent dùng `--outDir /tmp/vc-verify-<tên>` riêng và **xoá khi xong**.
- Đang chạy song song: O1 · O2 · O3 · O4 · O5. File không giao nhau **trừ** `src/App.tsx` (O4 sở hữu toàn file, O5 chỉ đụng **dòng 1289**) — O5 phải nói rõ trong báo cáo.
- Lỗi lint/build ở file mình **không** sở hữu = trạng thái tạm của agent khác ⇒ ghi nhận, không sửa.

## 7. Đợt 7B (chạy SAU, khi 7A xong — vì chạm gần như mọi file)

| # | Việc | Vì sao phải tách |
|---|---|---|
| 1 | **a11y nhãn form admin** (Đợt 6 #6): `htmlFor` 3 / `<input>` **163** | chạm mọi panel admin ⇒ xung đột O2/O3 |
| 2 | **Lượt pill toàn repo:** ~**302** chỗ `rounded-(lg\|md\|sm)` trên nút | chạm gần như mọi file `.tsx` |
| 3 | **`src/frontend/lib/vat.ts` `VAT_RATE = 0.08` cứng** ⇒ đọc từ `pricing_global_settings.vatPercent` | phụ thuộc UI mà O2 vừa thêm |
| 4 | **Màn xem `setting_audit`** (`09-admin-settings.md` §6 #4) | cần IA admin (O1 giữ `AdminSidebar`) |
| 5 | **`clipboard.writeText` thiếu `.catch()`** (`WorkshopEstimatorBOM`, "Sao chép báo giá") | nhỏ, gộp vào lượt dọn |
