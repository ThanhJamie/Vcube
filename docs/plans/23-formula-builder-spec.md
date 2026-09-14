# 23 — Đặc tả D3: Trình dựng công thức giá cho admin

> Ngày lập: **2026-09-20**. Trạng thái: **ĐẶC TẢ — chưa thi công**.
> Người lập: coordinator. Người thi công: một agent riêng, **track độc lập**.
> Ràng buộc nền: **không thêm dependency** · không Next.js · không đổi công thức giá hiện hành (đặc tả này **thêm đường mới**, không sửa đường cũ) · không ghi dữ liệu bịa vào DB · mỗi file một chủ sở hữu tại một thời điểm.

---

## §0. Phạm vi và cam kết không chặn việc khác

**Trong phạm vi:** cho phép admin tự dựng **biểu thức** cho các bước tính giá, lưu trong DB, engine đọc động, có versioning + audit trail.

**Ngoài phạm vi (không làm trong đặc tả này):**
- Không đổi bất kỳ hệ số nào của công thức hiện hành.
- Không đổi cách tính VAT (xem §5).
- Không đổi `pricing_global_settings` (điện / nhân công / VAT vẫn ở đó).
- Không làm trình dựng công thức cho xưởng in hay designer; **chỉ admin**.

**Không chặn D1 / D2 / D8 / O1.** Đặc tả này chỉ **thêm** bảng, file và module mới; không sửa file nào mà D1/D2/D8 phải sửa.

> **Lưu ý phối hợp quan trọng (đọc trước khi lên lịch):** D1, D2, D8 và D3 đều là **thay đổi schema** ⇒ đều phải sinh lại `supabase/scripts/apply_all_manual.sql` và chủ dự án đều phải **dán lại** file đó. Vì vậy hãy **gộp mọi thay đổi schema vào CÙNG MỘT lần sinh lại** (xem §7, Bước 2) để chủ dự án chỉ phải dán **một lần** thay vì ba lần. Nếu lịch không cho phép gộp, D3 vẫn chạy được độc lập.

---

## §1. Hiện trạng phải khớp (đã đọc code thật, không phỏng đoán)

### 1.1 Engine giá chạy ở CLIENT
`src/utils/pricingEngine.ts` là hàm thuần, chạy trong trình duyệt:
- `calculateDetailedPricing(input: PricingEngineInput)` (dòng 174) — trả `{ breakdown, quickEstimateRange, tier, manualReviewReasons, volumeDiscount }`.
- Hệ số lấy từ `customPricingConfig || DEFAULT_INKIRI_FORMULA_CONFIG` (dòng 202). `DEFAULT_INKIRI_FORMULA_CONFIG` nằm ở `src/data/mockData.ts`.
- **Hai** tham số toàn hệ thống lấy từ `pricing_global_settings` qua `resolveGlobalRates()` (dòng 91) — dùng `input.globalRates` nếu có, nếu không thì `settingsAccessors.pricingGlobal()`.
- Chưa cấu hình ⇒ ném `PricingUnavailableError` (dòng 56) với `code` thuộc `PricingUnavailableCode` (dòng 49): `no_printer | no_material | no_electricity_rate | no_labor_rate | rates_loading`. `peekSettings() === undefined` ⇒ `rates_loading` (phân biệt "đang tải" với "chưa cấu hình").
- Hàm tách riêng để dùng chung: `computeElectricityCostVnd(powerKW, printHours, rateVndPerKwh)` (dòng 25) = `Math.round(powerKW * printHours * rate)`; `computeLaborCostVnd(totalLaborMinutes, hourlyRateVnd)` (dòng 33) = `Math.round((minutes / 60) * rate)`.
- Các bước tính theo thứ tự (dòng 230-337): 1 đa màu → 2 khối lượng nhựa → 3 giờ in + điện → 4 khấu hao máy + vật tư → 5 nhân công → 6 phụ kiện + IPA + đóng gói → 7 overhead → 8 dự phòng hỏng → 9 giá bán.
- Giá bán (dòng 321-333): `preFee = round(costPrice * (1 + markup))`; `raw = round(preFee / (1 - totalVariableFeeRate))`; `totalVariableFeeRate = platform% + payment% + royalty%`; sau đó **làm tròn theo `cfg.roundingRule`** (`'1000' | '5000' | '10000' | 'none'`, dùng `Math.ceil`).
- Hàm song song khác: `calculateManualInkiriEstimate(input)` (dòng 490) cho "máy tính nhanh" của admin; `generateDeliveryPackages(unitBasePrice, quantity, cfg)` (dòng 576).

### 1.2 Fallback cứng CÒN SÓT trong engine (đặc tả phải xử lý, không được nhân bản)
| Dòng | Fallback |
|---|---|
| 240 | `Math.max(5, …)` — sàn 5 g khối lượng mô hình |
| 245 | `materialCostPerGram … \|\| 850` |
| 249 | `Number(layerHeight) \|\| 0.2` |
| 254 | `currentPrinter.powerKW \|\| 0.18` |
| 258 | `expectedLifetimeHours \|\| 8000` |
| 259 | `acquisitionCost \|\| 35000000` |
| 261 | `consumablesHourlyRate \|\| 2500` |
| 233, 235, 239, 242, 269-274, 280-281, 286, 289, 326, 579-580 | `cfg.X ?? <số>` — hàng chục hệ số |
Đây là một phần của **nợ B3** (`|| <số>` toàn repo = 141). **Đường biểu thức mới KHÔNG được lặp lại các fallback này** (§5).

### 1.3 Tầng settings (`src/backend/services/settingsService.ts`)
Đây là các **điểm nối chính xác** mà agent thi công phải sửa khi thêm một kho mới:
- `SETTINGS_STORES` (dòng 59) — mảng hằng, hiện 4 khoá: `site_content`, `app_settings`, `pricing_global_settings`, `pricing_configs`.
- `SETTINGS_ROW_IDS` (dòng 69) — khoá hàng cho kho 1-hàng. **`pricing_configs` KHÔNG có** (nhiều hàng).
- `JSONB_COLUMN` (dòng 76) và `UPDATED_AT_COLUMN` (dòng 84) — `Record<SettingsStore, …>` ⇒ **thêm khoá vào `SETTINGS_STORES` là TypeScript BẮT BUỘC sửa hai bảng này**, nếu không `tsc` đỏ.
- `loadStore(store)` (dòng 438) — `switch` theo store; thêm `case` mới.
- `applyRowToCache` (dòng 498), `settingsAccessors` (dòng 593), `peekSettings` (dòng 286), `subscribeSettings` (dòng 301), `REALTIME_TABLES` (dòng 314).
- `VALIDATORS` (dòng 174) + `validateSetting` (dòng 227) + `validatePatch` (dòng 234) — **khoá ngoài danh sách được coi là hợp lệ**, nên quên đăng ký validator là **im lặng cho qua**; đây là bẫy phải tránh.
- `writeSettingAudit({store, settingKey, oldValue, newValue, changedBy})` (dòng 640) + `getSettingAudit` (dòng 665) + `auditPatch` (dòng 633).
- `getPricingConfig` / `savePricingConfig` (dòng 588 / 809) đọc-ghi `InkiriCostFormulaConfig` từ `pricing_configs.config`.
- Kiểu `PricingGlobalSettings` (dòng 351): `electricityRateVnd: number | null`, `laborHourlyRateVnd: number | null`, `currency`, `vatPercent: number | null`, `settings`, `updatedAt`. `rowToPricingGlobalSettings` (dòng 377) dùng `numOrNull` — **không có default nghiệp vụ**.
- `VAT_MIN_PERCENT = 0`, `VAT_MAX_PERCENT = 20` (dòng 131-132). Kết quả ghi luôn là `WriteResult<T>` (dòng 101) — **không nuốt lỗi**.

### 1.4 DB
- `pricing_global_settings` (baseline dòng 199): `id text pk default 'global'`, `electricity_rate_vnd numeric`, `labor_hourly_rate_vnd numeric`, `currency`, `vat_percent numeric`, `settings jsonb`, `updated_at`. Có 2 CHECK: `pricing_global_settings_vat_range_chk` (0..20) và `pricing_global_settings_rates_nonneg_chk`.
- `pricing_configs` (dòng 189): `id text pk`, `config_name`, **`formula_version text`**, **`is_active boolean`**, `config jsonb`, `created_at`, `updated_at` — tức **đã có sẵn khái niệm "phiên bản công thức" + "đang hoạt động" nhưng chưa dùng để versioning thật**.
- `cost_rules` (dòng 293): `id text pk`, `rule_name text not null`, `config jsonb`, `updated_by text`, `updated_at`. Policy: chỉ `vcube_cost_rules_admin_all`.
- `setting_audit` (dòng 344): `id uuid pk`, `setting_key`, `store`, `old_value jsonb`, `new_value jsonb`, `changed_by uuid`, `changed_at`. **`store` có CHECK inline CHỈ cho 4 giá trị** `('site_content','app_settings','pricing_global_settings','pricing_configs')`. **Append-only**: chỉ có policy `vcube_setting_audit_admin_read` (select) + `vcube_setting_audit_admin_insert` (insert), **không có UPDATE/DELETE**.
- **`create table if not exists` là NO-OP với bảng đã tồn tại** ⇒ mọi thay đổi cột/ràng buộc cho bảng CŨ phải là `alter table … if not exists` / `drop constraint if exists` + `add constraint`. Đây là bài học đã gây sự cố `ERROR 23502` trên production.
- `pricing_config` là **VIEW** (baseline dòng 390 xoá view; hardening dòng 854 đặt `security_invoker = true`) — **không phải bảng**, đừng nhầm với `pricing_configs`.

### 1.5 RLS (`supabase/migrations/20261010_harden_rls.sql`)
- Helper: `public.is_admin()` (dòng 68, grant cho `anon, authenticated`), `_vcube_make_policy(p_table, p_name, p_cmd, p_roles, p_using, p_check)` (dòng 118, **bắt mọi lỗi rồi chỉ `raise warning`**), `_vcube_has_columns(p_table, p_cols)` (dòng 166).
- **Có BA mảng `v_tables`** phải khai báo bảng mới: dòng **185-192** (bước 3 — drop policy cũ), dòng **262-269** (bước 4 — bật RLS), dòng **1054-1057** (bước 9 — allowlist). **Không phải một mảng.**
- Bước 9 còn có mảng **`v_keep`** (allowlist tên POLICY) — phải thêm **tên policy mới**, không phải tên bảng.
- `v_ok` (dòng 905) là allowlist **policy STORAGE**, **KHÔNG phải** allowlist bảng. Nhét tên bảng vào đây làm `lint-rls-migration.mjs` **FAIL**.
- `v_catalog_read` (dòng 300-304) là vòng lặp tạo `public_read` (`using 'true'`) + `admin_write` cho từng bảng — **bẫy**: thêm bảng công thức vào đây sẽ cho **anon đọc cả bản nháp**. Xem §2.6.
- Bước 5.4a `cost_rules` (dòng 461-464), 5.4b `app_settings`/`setting_audit` (dòng 476-500).
- Tiền lệ **DDL thẳng thay vì `_vcube_make_policy`** cho policy an ninh: 2 policy xưởng in của `orders` (mục 5b) và trigger `fn_protect_order_privileged_columns` (mục 6c) — lý do: helper nuốt lỗi nên policy có thể **không được tạo mà migration vẫn commit**.
- Tiền lệ **trigger chặn sửa cột đặc quyền**: `fn_protect_order_privileged_columns`, `fn_protect_profile_privileged_columns` — dùng kỹ thuật `to_jsonb(new) - <cột cho phép>` so với `to_jsonb(old) - <cột cho phép>` ⇒ **fail-closed** khi bảng thêm cột mới.
- Sinh file gộp: `node scripts/gen-apply-all.mjs` — **không sửa tay**; phải sinh **2 lần** và so `md5` để chứng minh ổn định. Gate: `lint-rls-sources.mjs` (R1-R7), `lint-rls-migration.mjs` (đếm policy khớp allowlist), `a8-sql-syntax-check.mjs` (7 file; **cấm nối chuỗi với cột kiểu `"char"` mà thiếu `::text`** — lỗi 42725).

### 1.6 Bất biến data-honesty liên quan
- **PC-01** (`docs/design/data-honesty.md` dòng 42): giá vốn / biên lợi nhuận **không được lộ ra bề mặt khách**. §7 của cùng tài liệu: "internal costing is admin-only".
- **PC-05** (dòng 46): cấm sàn/`default` ngầm cho **đầu vào chi phí**.
- **PC-08** (dòng 49): cấm số cứng trong khối công thức của modal giá vốn ⇒ chính là động cơ của D3.
- **PC-10** (dòng 51): dải "ước tính nhanh" `0.9 / 1.18` là số bịa ⇒ nếu đưa vào biểu thức thì phải là **biến có tên và có nguồn**, không phải hằng số trong mã.
- VAT: `src/frontend/lib/vat.ts` — `computeVat(taxableAmount, rate: number | null)` trả `VatLine | null`; `rate === null` ⇒ **CHƯA CẤU HÌNH** ⇒ caller **ẩn dòng VAT** (không in `0%`, không in `8%`, không in `—`). `vatRateFromPercent(percent)` trả `null` khi chưa cấu hình; `0` là giá trị **thật** (VAT 0%).

---

## §2. An ninh parser (PHẦN QUAN TRỌNG NHẤT)

### 2.1 Cấm tuyệt đối
Trong mọi file của track D3, **cấm**:
- `eval(...)`, `new Function(...)`, `Function(...)`, `setTimeout("<chuỗi>")`, `setInterval("<chuỗi>")`.
- `vm`, `vm2`, `node:vm`, `child_process`, `worker_threads` — và mọi API chỉ có ở Node (module này chạy ở **client**).
- Dựng chuỗi rồi thực thi: `[...].join('')` + `eval`, template literal rồi `eval`, `document.write`, `innerHTML` chứa biểu thức.
- `with`, `Proxy`/`Reflect` để "đọc biến động", `globalThis[...]`, `this[...]`, `__proto__`, `constructor`, `prototype`.
- Thư viện parser ngoài (vi phạm **không thêm dependency**): không `mathjs`, `expr-eval`, `jsep`, `nearley`, `pegjs`, `ohm-js`…

**Cổng chặn tự động (bắt buộc thêm):** bổ sung rule vào `scripts/check-fabricated.mjs` theo khuôn **PASS 3 (mẫu CODE)** đã có, id `formula-eval-forbidden`, khớp `\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(|child_process|\bvm\.` **chỉ trong** `src/utils/formula*.ts` và `src/frontend/components/admin/**formula**` ⇒ phải bằng **0**.

### 2.2 Ngôn ngữ biểu thức (định nghĩa đóng)
Một công thức là **danh sách có thứ tự các "khe" (slot)**, mỗi khe là một phép gán:

```
<ten_khe> = <bieu_thuc>
```

- **Tên khe** thuộc whitelist cố định (§2.4). Không cho định nghĩa khe mới.
- Một khe chỉ được tham chiếu **các khe đã định nghĩa TRƯỚC nó** (không đệ quy, không tham chiếu xuôi, không tự tham chiếu).
- **Khe bắt buộc** phải có đủ 8: `materialCost`, `electricityCost`, `machineCost`, `laborCost`, `accessoriesCost`, `overheadCost`, `costPrice`, `pricePreRound`. Thiếu bất kỳ khe nào ⇒ **chặn tính giá** (§2.8).
- Giá bán cuối = `pricePreRound` sau đó áp `roundingRule` (`1000 | 5000 | 10000 | none`) **bằng đúng hàm làm tròn hiện có** — `roundingRule` là **trường riêng của phiên bản**, không phải biểu thức.

> Vì sao chọn mô hình "khe" thay vì một biểu thức khổng lồ: (a) mỗi biểu thức nhỏ ⇒ dễ áp giới hạn và dễ test; (b) admin sửa đúng bước mình muốn mà không phải viết lại toàn bộ; (c) lịch sử phiên bản đọc được như một bảng đối chiếu; (d) vẫn cho quyền kiểm soát **toàn bộ** đường tính, không chỉ hệ số.

### 2.3 AST do mình định nghĩa — whitelist ĐÓNG
Parser chỉ được sinh ra **đúng 6 loại node** sau; mọi loại khác là lỗi:

| Loại | Dạng | Ghi chú |
|---|---|---|
| Hằng số | `{ k: 'num', v: number }` | chỉ literal thập phân, hữu hạn |
| Biến | `{ k: 'var', n: string }` | `n` phải nằm trong bảng biến §2.4 |
| Khe | `{ k: 'slot', n: string }` | `n` phải là khe đã định nghĩa trước |
| Hai ngôi | `{ k: 'bin', op: '+' \| '-' \| '*' \| '/' \| '^', l, r }` | 5 toán tử, không hơn |
| Một ngôi | `{ k: 'neg', e }` | chỉ dấu âm |
| Gọi hàm | `{ k: 'call', fn: 'min' \| 'max' \| 'round' \| 'ceil' \| 'floor' \| 'abs' \| 'if', args: [] }` | whitelist §2.5 |

Hàm đánh giá phải `switch` **vét cạn** trên `k` và **có nhánh `default` ném lỗi** — để một node lạ không bao giờ được "bỏ qua im lặng".

### 2.4 Bảng biến (whitelist, đọc từ chính engine hiện tại)
Chỉ những tên dưới đây tồn tại. Tên khác ⇒ **lỗi lúc PARSE**, không phải lỗi lúc chạy.

| Nhóm | Biến |
|---|---|
| Hình học / tệp | `modelGrams`, `supportGrams`, `brimRaftGrams`, `purgeGrams`, `totalFilamentGrams`, `transformedVolume`, `infillDensity`, `layerHeightMm`, `quantity`, `activeExtruders` |
| Nhựa | `materialCostPerGram`, `materialDensity`, `materialPricePerKg` |
| Máy in | `averagePowerKW`, `machineLifetimeHours`, `machineAcquisitionCost` |
| Đơn giá toàn hệ thống | `electricityRatePerKWh`, `laborHourlyRate` |
| Nhân công (phút) | `fileReviewMinutes`, `setupMinutes`, `supportRemovalMinutes`, `postProcessingMinutes`, `qcMinutes`, `packagingMinutes`, `totalLaborMinutes` |
| Chi phí phụ | `fixedPackagingCost`, `multiColorPackagingExtra`, `ipaSolventCost`, `accessoriesAddonCost`, `overheadPerUnit` |
| Tỉ lệ / hệ số | `failureReserveRate`, `targetMarkupPercent`, `platformCommissionPercent`, `paymentGatewayFeePercent`, `designerRoyaltyPercent` |
| Cờ 0/1 (thay cho điều kiện) | `isMultiColor`, `isDifficultMaterial`, `lowPrintability` |
| Số đo nullable | `minWallThicknessMm`, `printabilityScore` |

Quy tắc bắt buộc:
- Tên biến khớp `^[a-z][a-zA-Z0-9_]{0,39}$`, không trùng tên hàm trong §2.5.
- **Số đo nullable**: nếu biểu thức **có dùng** `minWallThicknessMm` hoặc `printabilityScore` mà giá trị là `null`/`NaN` ⇒ **chặn tính giá** (`formula_measure_missing`), **KHÔNG** coi `null` là `0` và **KHÔNG** bỏ qua số hạng. Đây đúng tinh thần R2 đã làm trong engine (`isMeasuredNumber`).
- Cờ `isMultiColor` / `isDifficultMaterial` / `lowPrintability` do engine tính **trước** khi đánh giá biểu thức, và **`lowPrintability` chỉ được bằng `1` khi mọi số đo đứng sau nó là số thật** (không `null`) — chép đúng guard hiện có ở engine dòng 298-303.

### 2.5 Hàm whitelist
`min(a,b,…)`, `max(a,b,…)`, `round(x)`, `ceil(x)`, `floor(x)`, `abs(x)` — và **`if(cond, a, b)`**.
- `min`/`max`: từ 2 đến 8 tham số.
- `round(x)` dùng **đúng ngữ nghĩa `Math.round` của JavaScript** (`.5` làm tròn ra xa 0; `round(-2.5) === -2`). Phải ghi rõ trong tài liệu người dùng admin và trong test.
- `if(cond, a, b)`: `cond` phải là số hữu hạn; `cond !== 0` là đúng. **Đánh giá LƯỢI** (chỉ tính nhánh được chọn) để nhánh không chọn không gây chia 0.
- **Không** có toán tử so sánh, không `and/or/not`, không ternary `? :`, không chuỗi, không mảng, không truy cập thuộc tính.

### 2.6 Thuật toán parse — Pratt parser tự viết
Khuyến nghị **Pratt (top-down operator precedence)**, không dùng shunting-yard:
- Bảng binding power tường minh: `+ -` = 10, `* /` = 20, một ngôi `-` = 30, `^` = 40 **kết hợp phải**.
- Quy ước đã chốt: `-2^2` = `-(2^2)` = **-4**; `2^3^2` = `2^(3^2)` = **512**.
- Parser **đệ quy** ⇒ **bắt buộc** đếm độ sâu và chặn bằng `MAX_DEPTH` (§2.7) ngay khi vào `parseExpr`; vượt ⇒ lỗi, không được để tràn stack.
- Đầu vào được **quét token một lần**; ký tự lạ ⇒ lỗi ngay tại cột đó (thông báo kèm số cột để UI tô đỏ).
- **Grammar KHÔNG có**: dấu `"` `'` `` ` `` `$` `{` `}` `[` `]` `;` `?` `:` `,` (trừ dấu phẩy phân tách tham số hàm) `=` (trừ dấu `=` phân tách khe ở dòng ngoài cùng) và **không có ký hiệu lũy thừa `**`**.

> Hệ quả an ninh cần nêu rõ: vì grammar **không có chuỗi, không có truy cập thuộc tính, không có dấu ngoặc nhọn**, biểu thức không thể tạo ra một đoạn mã thực thi được **kể cả khi** có ai đó sau này lỡ nối nó vào một ngữ cảnh thực thi. Nhưng §2.1 vẫn cấm tuyệt đối — phòng thủ nhiều lớp.

**Kiểm tra ở CẢ HAI ĐẦU (bắt buộc):**
- **Lúc ghi** (admin bấm Lưu/Xuất bản): parse + validate đầy đủ; không hợp lệ ⇒ không ghi DB.
- **Lúc đọc** (engine, mỗi lần tính giá): **parse lại `expression` từ nguồn** rồi mới đánh giá. **KHÔNG** tin AST lưu trong DB để tính giá.
  - Cột `ast` (nếu có) chỉ là **bộ đệm chẩn đoán** cho admin xem diff; **không bao giờ** là nguồn để tính. Nếu `ast` lệch với `expression` ⇒ ghi log và **vẫn dùng `expression`**.

### 2.7 Giới hạn cứng (áp ở CẢ parse-write lẫn runtime)
| Giới hạn | Giá trị | Ghi chú |
|---|---|---|
| `MAX_EXPRESSION_CHARS` | **2.000** ký tự / mỗi khe | tính sau khi `trim` |
| `MAX_TOTAL_CHARS_ALL_SLOTS` | **20.000** | khớp CHECK của bảng |
| `MAX_TOKENS` | **500** / mỗi khe | chặn trước khi parse |
| `MAX_DEPTH` | **16** cấp ngoặc/biểu thức lồng | chặn đệ quy parser |
| `MAX_NODES` | **600** node AST / mỗi khe | chặn sau khi parse |
| `MAX_SLOTS` | **24** | |
| `MAX_VARIABLES_REFERENCED` | **64** | |
| `MAX_FUNC_ARGS` | **8** | |
| `MAX_IDENTIFIER_CHARS` | **40** | |
| `MAX_INT_DIGITS` | **13** | literal |
| `MAX_FRAC_DIGITS` | **6** | literal |
| `MAX_CONSTANT_ABS` | **1e12** | literal |
| `MAX_EXPONENT_ABS` | **64** | số mũ của `^` |
| Ngân sách thời gian parse | **5 ms** / khe (đo trong test), và toàn bộ công thức **≤ 25 ms** | `MAX_TOKENS`/`MAX_NODES` đã chặn trên lý thuyết; đo thời gian chỉ để phát hiện hồi quy |

Vượt bất kỳ giới hạn nào ⇒ lỗi `formula_limits_exceeded` kèm **tên giới hạn** và số đo thực tế.

### 2.8 Chống chia 0, tràn số, NaN
- `a / b`: nếu `b === 0` **hoặc** `Math.abs(b) < 1e-12` ⇒ lỗi `division_by_zero`. **Không** trả `Infinity`.
- `a ^ b`: nếu `b` không hữu hạn, `|b| > MAX_EXPONENT_ABS`, hoặc `a < 0` và `b` không nguyên ⇒ lỗi `invalid_exponent`.
- Sau **MỌI** phép toán: nếu kết quả không hữu hạn (`!Number.isFinite`) hoặc `Number.isNaN` ⇒ lỗi `non_finite_result`, kèm tên khe và toán tử.
- Kết quả trung gian vượt `MAX_CONSTANT_ABS * 1e3` ⇒ lỗi `magnitude_overflow` (chặn trước khi thành `Infinity`).
- `neg`, `abs`, `round`, `ceil`, `floor` giữ nguyên tính hữu hạn (đầu vào đã được kiểm).

### 2.9 Giới hạn miền đầu ra — CHẶN, KHÔNG KẸP
Sau khi có `pricePreRound` (trước làm tròn) và `costPrice`:
- `costPrice <= 0` ⇒ lỗi `formula_cost_nonpositive`.
- `pricePreRound <= 0` ⇒ lỗi `formula_price_nonpositive`.
- `pricePreRound < minUnitPriceVnd` hoặc `> maxUnitPriceVnd` (đọc từ `bounds` của phiên bản, mặc định `1000` … `500000000`) ⇒ lỗi `formula_out_of_bounds` kèm **giá trị tính được** (chỉ hiện trong ngữ cảnh admin).
- Trần tuyệt đối không thể cấu hình vượt: `MAX_ABS_UNIT_PRICE_VND = 1e12`. Nếu `bounds` do admin đặt vượt trần này ⇒ **từ chối lưu**.
- **Nguyên tắc bất di bất dịch: CHẶN, KHÔNG KẸP (block, never clamp).** Nếu kẹp về `min`, người dùng sẽ nhận một mức giá **không** do công thức tạo ra — đó là bịa giá. Chặn thì khách thấy "chưa tính được giá", admin thấy số thật để sửa. Áp đúng tinh thần `PricingUnavailableError`.

### 2.10 Ai được sửa, và khi biểu thức hỏng thì sao
- Ghi: **chỉ `public.is_admin()`**. Không có policy cho owner/xưởng/khách/anon (xem §3.6).
- Đọc: bản `published` cho `anon, authenticated` (engine chạy ở client); **bản `draft` chỉ admin**.
- Mã lỗi mới, thêm vào union `PricingUnavailableCode` trong `src/utils/pricingEngine.ts`:
  `formula_loading` · `formula_invalid` · `formula_limits_exceeded` · `formula_missing_slot` · `formula_eval_error` · `formula_measure_missing` · `formula_out_of_bounds` · `formula_price_nonpositive` · `formula_cost_nonpositive`
- Thông điệp lỗi phải nêu **đích danh** khe/biến/giới hạn còn thiếu và **đường dẫn admin** (`/admin → Cấu hình giá → Công thức`), theo đúng khuôn `resolveGlobalRates()` hiện có.
- **Cấm tuyệt đối** nhánh "thử biểu thức, lỗi thì rơi về hệ số". Xem §5.

---

## §3. Mô hình dữ liệu

### 3.1 Hai bảng MỚI, tách khỏi `pricing_global_settings`
Đặt trong `supabase/migrations/20260901_baseline_schema.sql` (mục bảng mới), **không** nhét vào `pricing_global_settings`:
lý do chủ dự án đã chốt — `pricing_global_settings` là **một hàng** ngữ nghĩa "tham số toàn hệ thống" (điện, nhân công, VAT) và có `id = 'global'`; công thức cần **nhiều phiên bản bất biến + lịch sử**, không thể nhồi vào một `jsonb` của một hàng mà vẫn giữ được audit trail và tính bất biến. Thêm nữa, nhồi vào đó sẽ khiến **mỗi lần sửa công thức là một lần ghi đè**, xoá mất bản cũ — đúng thứ chủ dự án cấm.

Chi tiết DDL đầy đủ ở **§3.2**.

### 3.2 DDL (chép nguyên vào baseline; giữ đúng thứ tự)
```sql
create table if not exists public.pricing_formulas (
    id          uuid primary key default gen_random_uuid(),
    code        text not null unique,
    name        text not null,
    description text not null default '',
    is_active   boolean not null default false,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint pricing_formulas_code_format_chk check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
    constraint pricing_formulas_name_nonempty_chk check (btrim(name) <> '')
);

-- Chỉ ĐÚNG MỘT công thức được bật tại một thời điểm.
create unique index if not exists uq_pricing_formulas_one_active
  on public.pricing_formulas (is_active) where is_active;

create table if not exists public.pricing_formula_versions (
    id                uuid primary key default gen_random_uuid(),
    formula_id        uuid not null references public.pricing_formulas(id) on delete restrict,
    version_no        int  not null,
    status            text not null default 'draft',
    slots             jsonb not null,
    variables         jsonb not null default '[]'::jsonb,
    bounds            jsonb not null default '{}'::jsonb,
    rounding_rule     text not null default '1000',
    parser_version    text not null,
    source_sha256     text not null,
    note              text not null default '',
    created_by        uuid,
    created_at        timestamptz not null default now(),
    published_at      timestamptz,
    published_by      uuid,
    constraint pricing_formula_versions_no_pos_chk   check (version_no > 0),
    constraint pricing_formula_versions_status_chk   check (status in ('draft','published','retired')),
    constraint pricing_formula_versions_round_chk    check (rounding_rule in ('1000','5000','10000','none')),
    constraint pricing_formula_versions_size_chk     check (char_length(slots::text) between 2 and 20000),
    constraint pricing_formula_versions_sha_chk      check (source_sha256 ~ '^[0-9a-f]{64}$'),
    constraint pricing_formula_versions_uniq         unique (formula_id, version_no),
    constraint pricing_formula_versions_pub_cons_chk check (
      (status = 'published' and published_at is not null and published_by is not null)
      or (status <> 'published')
    )
);

-- Mỗi công thức chỉ có TỐI ĐA MỘT phiên bản đang published.
create unique index if not exists uq_pricing_formula_versions_one_published
  on public.pricing_formula_versions (formula_id) where status = 'published';

create index if not exists idx_pricing_formula_versions_formula
  on public.pricing_formula_versions (formula_id, version_no desc);
```

**Cố ý KHÔNG có cột `active_version_id` trên `pricing_formulas`.** Phiên bản đang áp dụng **chính là** hàng có `status = 'published'`, và ràng buộc `uq_pricing_formula_versions_one_published` bảo đảm chỉ có một. Thêm một cột con trỏ nữa là **tạo nguồn sự thật thứ hai** — có thể lệch với `status`, và khi lệch thì không biết tin cái nào. Một nguồn, một sự thật.

`slots` là **nguồn sự thật** (`{ "materialCost": "<biểu thức>", "pricePreRound": "<biểu thức>", ... }`). `variables` chỉ là **danh sách tên biến đã dùng**, phục vụ hiển thị/cảnh báo — **không** dùng để tính. `source_sha256` = SHA-256 của chuỗi `slots` **đã chuẩn hoá** (sắp xếp khoá, `JSON.stringify` không khoảng trắng) để phát hiện sửa tay ngoài app; app **kiểm lại** khi đọc và **chặn** nếu lệch (`formula_invalid`).

### 3.3 Sửa `setting_audit` (bắt buộc)
```sql
-- 'store' hiện là CHECK INLINE nên tên do Postgres tự sinh: setting_audit_store_check.
-- PHẢI xác nhận tên thật trước khi drop (xem ghi chú dưới).
alter table public.setting_audit drop constraint if exists setting_audit_store_check;
alter table public.setting_audit add  constraint setting_audit_store_chk
  check (store in ('site_content','app_settings','pricing_global_settings','pricing_configs','pricing_formulas'));

alter table public.setting_audit add column if not exists reason text;
```
- **Ghi chú bắt buộc kiểm chứng:** ràng buộc cũ được khai **inline, không đặt tên** (baseline dòng 347-348) nên tên thật gần như chắc chắn là `setting_audit_store_check`. Agent thi công **phải kiểm bằng `audit_schema_truth.sql` PHẦN 10** (hoặc `select conname from pg_constraint where conrelid='public.setting_audit'::regclass`) rồi mới khẳng định; nếu tên khác thì dùng `drop constraint` đúng tên đó. Nếu drop trượt, `add constraint` vẫn chạy và **bảng sẽ có HAI ràng buộc `store`** ⇒ mọi ghi công thức bị chặn mà thông báo lỗi rất khó đọc.
- `add column if not exists` là idempotent và an toàn trên bảng đã tồn tại (bài học `create table if not exists` là NO-OP).

### 3.4 Quan hệ với nguồn cũ — quy tắc ưu tiên (chống "hai nguồn sự thật")
Hiện có **hai** nơi đang chứa hệ số: `pricing_configs.config` (qua `getPricingConfig`/`savePricingConfig`) và `DEFAULT_INKIRI_FORMULA_CONFIG`. Đặc tả này **không xoá** chúng. Quy tắc:

| Tình trạng | Đường tính | Ghi chú |
|---|---|---|
| Có công thức `is_active = true` **và** có phiên bản `status='published'` | **Đường BIỂU THỨC** — chỉ đường này | Mọi lỗi ⇒ ném `PricingUnavailableError`, **không** rơi về hệ số |
| Không có công thức active (bảng rỗng / chưa published) | **Đường HỆ SỐ** y như hôm nay | Hành vi không đổi; đây là đường tương thích ngược |
| Có active nhưng **thiếu** phiên bản published (dữ liệu hỏng) | **CHẶN** (`formula_invalid`) | Không im lặng quay về hệ số: admin đã bật công thức thì phải biết nó không chạy |

**Bắt buộc về UI:** khi có công thức active, `/admin → Cấu hình giá` phải hiện **băng-rôn cảnh báo** ở các ô hệ số: *"Công thức đang bật đang điều khiển các bước tính; các ô hệ số bên dưới KHÔNG có tác dụng cho tới khi tắt công thức."* Không có băng-rôn này thì admin sẽ sửa hệ số, không thấy giá đổi, và mất niềm tin vào hệ thống.

### 3.5 RLS — policy chính xác
Dùng **DDL thẳng** (không `_vcube_make_policy`) vì đây là bảng ảnh hưởng giá và helper **nuốt lỗi thành `warning`**:

```sql
-- pricing_formulas: ai cũng đọc được "đang bật công thức nào", chỉ admin ghi
create policy vcube_pricing_formulas_public_read on public.pricing_formulas
  for select to anon, authenticated using (true);

create policy vcube_pricing_formulas_admin_insert on public.pricing_formulas
  for insert to authenticated with check (public.is_admin());

create policy vcube_pricing_formulas_admin_update on public.pricing_formulas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- KHÔNG tạo policy DELETE cho pricing_formulas.

-- pricing_formula_versions: chỉ bản published cho mọi người; admin thấy tất cả
create policy vcube_pricing_formula_versions_published_read on public.pricing_formula_versions
  for select to anon, authenticated using (status = 'published');

create policy vcube_pricing_formula_versions_admin_read on public.pricing_formula_versions
  for select to authenticated using (public.is_admin());

create policy vcube_pricing_formula_versions_admin_insert on public.pricing_formula_versions
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());

create policy vcube_pricing_formula_versions_admin_update on public.pricing_formula_versions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- KHÔNG tạo policy DELETE. Lịch sử không bao giờ bị xoá.
```
Và **bật RLS** cho cả hai bảng (thêm vào mảng `v_tables` ở **bước 4**, dòng 262-269).

**Trigger bảo vệ nội dung phiên bản (fail-closed)** — vì `update` cần thiết cho chuyển `draft → published → retired`, nhưng **nội dung công thức phải bất biến**:
```sql
create or replace function public.fn_protect_formula_version_columns()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare
  v_allowed text[] := array['status','published_at','published_by'];
begin
  if to_jsonb(new) - v_allowed is distinct from to_jsonb(old) - v_allowed then
    raise exception 'VCUBE: nội dung phiên bản công thức là BẤT BIẾN — chỉ được đổi status/published_at/published_by'
      using errcode = 'insufficient_privilege';
  end if;
  if old.status = 'retired' then
    raise exception 'VCUBE: phiên bản đã retired không được đổi trạng thái' using errcode = 'insufficient_privilege';
  end if;
  if old.status = 'published' and new.status not in ('published','retired') then
    raise exception 'VCUBE: published chỉ được chuyển sang retired' using errcode = 'insufficient_privilege';
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'published' and new.published_by is null then
    new.published_by := auth.uid();
  end if;
  return new;
end
$fn$;

do $do$
begin
  if to_regclass('public.pricing_formula_versions') is not null then
    execute 'drop trigger if exists trg_protect_formula_version_columns on public.pricing_formula_versions';
    execute 'create trigger trg_protect_formula_version_columns
               before update on public.pricing_formula_versions
               for each row execute function public.fn_protect_formula_version_columns()';
  end if;
end
$do$;
```
Kỹ thuật `to_jsonb(new) - v_allowed` **fail-closed**: nếu sau này bảng thêm cột mới, cột đó **tự động** thuộc nhóm bất biến — đúng khuôn `fn_protect_order_privileged_columns` đã có.

**Việc migration bắt buộc, không được quên (danh sách kiểm):**
1. Thêm `pricing_formulas` và `pricing_formula_versions` vào **mảng `v_tables` ở bước 3** (dòng 185-192), **bước 4** (dòng 262-269) **và bước 9** (dòng 1054-1057) — **ba mảng, không phải một**.
2. Thêm **7 tên policy** ở §3.5 vào mảng **`v_keep`** (allowlist tên policy, bước 9). **Không** thêm tên bảng vào `v_ok` (đó là allowlist STORAGE — nhét sai làm lint FAIL).
3. **KHÔNG** thêm hai bảng vào `v_catalog_read` (dòng 300-304): vòng lặp đó tạo `using 'true'` cho `anon` ⇒ **lộ bản nháp**.
4. Sinh lại file gộp: `node scripts/gen-apply-all.mjs` — **hai lần**, `md5` phải **y hệt**; **không sửa tay**.
5. Chạy đủ gate: `lint-rls-sources.mjs` · `lint-rls-migration.mjs` (đếm policy khớp allowlist) · `a8-sql-syntax-check.mjs` · `check-fabricated.mjs` · `npm run lint`.
6. Cập nhật số kỳ vọng trong `supabase/diagnostics/audit_schema_truth.sql` PHẦN 6 (hiện `28 · 78 · 5`) và trong `AGENTS.md` — **luôn lấy số từ output `gen-apply-all.mjs`**, không chép tay.
7. Cập nhật `gen-apply-all.mjs` PHẦN 5 để **kiểm luôn** 7 policy mới (đây chính là nợ **D12** — nếu chủ dự án đã duyệt D12(a) thì gộp vào cùng bước này).

### 3.6 Rủi ro rò rỉ đã nhận diện
- Engine chạy ở **client** ⇒ **bản published buộc phải đọc được bởi `anon`**. Hệ quả trung thực phải nói rõ: **biểu thức công thức KHÔNG phải bí mật** — bất kỳ ai mở `/quote` đều tải được nó. Cái được bảo vệ là **quyền GHI** và **tính đúng đắn của giá**, không phải tính bí mật của công thức.
- Vì vậy: **mọi ghi chú nội bộ, lý do sửa, chiến lược biên lợi nhuận phải để ở `setting_audit` (admin-only), KHÔNG để ở cột đọc-công-khai.** Cột `note` trên bảng versions là **chú thích kỹ thuật ngắn, không chứa thông tin kinh doanh nhạy cảm**; nếu chủ dự án muốn ghi chú tự do thì phải chuyển `note` sang bảng admin-only. RLS là mức **DÒNG**, không phải mức CỘT — đây là lý do phải tách bảng thay vì "ẩn một cột".
- **PC-01**: giá vốn/biên lợi nhuận **tuyệt đối không** được render ở bề mặt khách. Bản xem trước của trình dựng công thức chỉ tồn tại dưới `/admin`.

---

## §4. Versioning + audit trail

### 4.1 Mô hình
- **Draft**: admin lưu nháp ⇒ `insert` một hàng `status='draft'`, `version_no = max(version_no)+1` của công thức đó. Nháp **chỉ admin đọc được**.
- **Publish**: hoặc `insert` trực tiếp một hàng `status='published'`, hoặc `update` một hàng `draft` thành `published` (trigger chỉ cho đổi `status`/`published_at`/`published_by`). Cách thứ hai phải **retire** phiên bản published cũ **trong cùng một giao dịch** để không vi phạm `uq_pricing_formula_versions_one_published`.
- **Retire**: `published → retired`. Không quay lại.
- **Bất biến**: nội dung (`slots`, `variables`, `bounds`, `rounding_rule`, `parser_version`, `source_sha256`, `version_no`, `created_*`) **không bao giờ đổi** sau khi ghi — cưỡng chế bằng trigger §3.5, và **không có policy DELETE**.
- **Đồng thời (race)**: hai admin publish cùng lúc sẽ đụng `uq_pricing_formula_versions_one_published` hoặc `uq_pricing_formula_versions_uniq (formula_id, version_no)` ⇒ Postgres trả `23505`. Service **phải** bắt mã này và trả lỗi rõ ràng ("phiên bản đã đổi, tải lại"), **không** retry mù, **không** nuốt lỗi.

### 4.2 Ai / khi nào / vì sao
Mỗi lần lưu nháp hoặc xuất bản, service **bắt buộc** gọi `writeSettingAudit` một lần:
- `store = 'pricing_formulas'` (nhờ CHECK đã mở rộng ở §3.3)
- `setting_key = <code công thức>`
- `old_value = { versionId, versionNo, status, sha256 }` của phiên bản published đang áp dụng (hoặc `null` nếu chưa có)
- `new_value = { versionId, versionNo, status, sha256 }`
- `reason = <lý do admin nhập>` — **bắt buộc với thao tác publish**, tối thiểu **10 ký tự**, tối đa 500; validate ở `VALIDATORS` (§1.3) **và** kiểm lại trước khi ghi.
- `changed_by`, `changed_at` do hàm hiện có tự lấy từ `currentUserId()`.

Vì sao dùng lại `setting_audit` thay vì bảng audit riêng: (a) đã có sẵn, đã **append-only** bằng policy, đã admin-only, đã được UI `/admin` đọc; (b) tạo bảng thứ hai sẽ có **hai lịch sử** cho cùng một câu hỏi "ai đổi gì", đúng loại trùng lặp nguồn sự thật mà đặc tả này đang chống; (c) chỉ cần **mở rộng CHECK + thêm cột `reason`** là đủ. Nếu sau này cần truy vấn nặng theo công thức thì thêm index `(store, setting_key, changed_at desc)`.

**Cấm UPDATE/DELETE lịch sử:** `setting_audit` hiện **không có** policy UPDATE/DELETE (đúng như vậy) — **không được thêm**. `pricing_formula_versions` cũng **không có** policy DELETE. Ghi rõ thành tiêu chí test (§6).

### 4.3 Hiển thị cho admin
`/admin → Cấu hình giá → Công thức` phải hiển thị:
- Tên công thức + `is_active`.
- **"Phiên bản đang áp dụng: v{n} · xuất bản {thời gian} bởi {người} · lý do: {reason}"** — đọc từ phiên bản `published` + hàng audit mới nhất.
- Bảng lịch sử (mới nhất trước): `version_no`, `status`, thời gian, người, `reason`, `sha256` rút gọn 8 ký tự.
- `parser_version`: nếu phiên bản published được tạo bởi parser cũ hơn parser hiện tại ⇒ hiện **cảnh báo** "phiên bản này tạo bằng parser v{old}; nên xem lại" (không tự đổi gì).

### 4.4 Rollback
Rollback = **tạo phiên bản MỚI** có `slots`/`bounds`/`rounding_rule` **sao chép nguyên văn** từ phiên bản cũ, ghi `note` nêu rõ "khôi phục từ v{k}", publish nó, và ghi một hàng audit với `reason` bắt buộc.
- **Không** sửa hàng cũ, **không** xoá hàng nào. Lịch sử vẫn cho thấy: v{k} từng chạy, v{k+1} là bản khôi phục.
- `version_no` luôn tăng đơn điệu, không tái sử dụng số.

---

## §5. Tương thích ngược và bất biến data-honesty

### 5.1 Quy tắc ưu tiên (chép lại từ §3.4, đây là hợp đồng)
1. `pricing_formulas.is_active = true` **và** có phiên bản `published` ⇒ **chỉ** đường biểu thức.
2. Ngược lại ⇒ đường hệ số **y như hôm nay**, không đổi một hành vi nào.
3. Trong đường biểu thức, **mọi lỗi đều CHẶN**. **Cấm** mọi dạng "thử… nếu lỗi thì quay về hệ số".
   Lý do: rơi về hệ số sẽ tạo ra một mức giá **khác** với mức admin đã cấu hình, mà khách vẫn thấy như thật. Đó vừa là sai tài chính vừa là vi phạm data-honesty. Chặn thì hệ thống nói thật là "chưa tính được giá".

### 5.2 Bất biến áp cho toàn bộ đường tính
- Giá trị admin **chưa nhập** ⇒ **không đoán hộ**. Đường biểu thức **thừa hưởng** guard `resolveGlobalRates()` cho `electricityRatePerKwh` / `laborHourlyRate` (vẫn đọc từ `pricing_global_settings`; vẫn `rates_loading` khi cache chưa có).
- **Không** nhân bản các fallback ở §1.2 sang đường biểu thức: mỗi biến được truyền vào bộ đánh giá phải là **số đo/cấu hình thật**, hoặc `null`. Nếu biến là `null` mà biểu thức có dùng ⇒ `formula_measure_missing` (chặn). **Không** `?? 0`, **không** `|| 0.18`.
- Biến `lowPrintability` chỉ bằng `1` khi **mọi** số đo đứng sau là số thật (chép guard engine dòng 298-303).
- Số cứng trong mã (`PLATFORM_FEE_PERCENT`, `PAYMENT_GATEWAY_FEE_PERCENT`, `DESIGNER_ROYALTY_PERCENT`, `FIXED_PACKAGING_BASE`, `FIXED_OVERHEAD_PER_UNIT` — engine dòng 14-18) **không** trở thành hằng số trong biểu thức; chúng phải vào bảng biến như **giá trị cấu hình** (nguồn vẫn là `pricing_configs`/phiên bản công thức), để `PC-08` thực sự được đóng.

### 5.3 VAT — 4 call site và `/quote`
Đặc tả này **không** thay đổi VAT. Ghi rõ để agent thi công không "tiện tay" sửa:
- Nguồn tỉ lệ vẫn là `pricing_global_settings.vat_percent`; `null` ⇒ `computeVat` trả `null` ⇒ **ẩn dòng VAT** và dùng `vatNotConfiguredLabel()`. `0` là giá trị thật.
- **Bốn** call site đang dùng `computeVat`: `/quote` (`QuoteSummaryPanel`) · `/cart` (`CartView`, `CartDrawer`) · `/checkout` (`CheckoutView`) · hoá đơn (`InvoiceModal`). Sau D3 phải **vẫn là bốn**, cùng một tỉ lệ, cùng cách làm tròn `Math.round(base * rate)`, `total = base + amount`.
- VAT áp **sau** `pricePreRound` + làm tròn; **không** đưa VAT vào biểu thức.
- `/quote` phải **chặn** khi công thức hỏng, đúng như hiện đang chặn khi thiếu đơn giá điện/nhân công: **không** render giá, **không** cho thêm vào giỏ, hiện trạng thái rỗng nêu nguyên nhân + hành động.
- Nợ **B5** (bất nhất VAT giữa `/quote` và cart/checkout khi `ship > 0`) là **vấn đề riêng, đang gộp vào đợt redesign**; D3 **không** được làm nó tệ hơn, và **không** tự sửa nó trong track này.

---

## §6. Kế hoạch kiểm thử

### 6.1 Parser — bảng input ⇒ output (test đơn vị, hàm thuần, không cần DB)
| # | Input (một khe) | Kỳ vọng |
|---|---|---|
| P01 | `1+2*3` | `7` |
| P02 | `(1+2)*3` | `9` |
| P03 | `2^3^2` | `512` (kết hợp phải) |
| P04 | `-2^2` | `-4` |
| P05 | `10-2-3` | `5` (kết hợp trái) |
| P06 | `min(3,5,1)` | `1` |
| P07 | `max(3,5,1)` | `5` |
| P08 | `round(2.5)` | `3` |
| P09 | `round(-2.5)` | `-2` (đúng `Math.round` của JS) |
| P10 | `if(isMultiColor, 1.05, 1)` với cờ `1` | `1.05` |
| P11 | `if(isMultiColor, 1/0, 1)` với cờ `0` | `1` — chứng minh `if` **lượi** |
| P12 | `abs(0-7)` | `7` |
| P13 | biến `quantity` = 12 ⇒ `quantity*2` | `24` |
| P14 | khe trước `costPrice` rồi `costPrice*1.35` | dùng đúng giá trị khe trước |

### 6.2 Parser — ca TẤN CÔNG / ca biên (mọi ca phải **bị từ chối**, không được treo, không được thực thi)
| # | Input | Mã lỗi kỳ vọng |
|---|---|---|
| A01 | `1/0` | `division_by_zero` |
| A02 | `1/(2-2)` | `division_by_zero` |
| A03 | `0^-1` | `invalid_exponent` |
| A04 | `2^10000` | `invalid_exponent` (vượt `MAX_EXPONENT_ABS`) |
| A05 | `99999999999999999999` | `limits_exceeded` (`MAX_INT_DIGITS`) |
| A06 | `1e3` | `unexpected_token` (không có ký pháp số mũ) |
| A07 | `foo(1)` | `unknown_function` |
| A08 | `bar` | `unknown_identifier` |
| A09 | `constructor` | `unknown_identifier` |
| A10 | `__proto__` | `unexpected_token` (ký tự `_` đầu) |
| A11 | `this` | `unknown_identifier` |
| A12 | `process.env.SECRET` | `unexpected_token` (`.` cấm) |
| A13 | `globalThis['x']` | `unexpected_token` (`[` cấm) |
| A14 | `` `x` `` | `unexpected_token` (backtick cấm) |
| A15 | `"a"` | `unexpected_token` (nháy cấm) |
| A16 | `${1+1}` | `unexpected_token` (`$` cấm) |
| A17 | `1;2` | `unexpected_token` (`;` cấm) |
| A18 | `(()=>{})()` | `unexpected_token` |
| A19 | `constructor.constructor('return 1')()` | `unexpected_token` |
| A20 | `require('child_process')` | `unknown_identifier` hoặc `unexpected_token` (nháy cấm) |
| A21 | 17 cấp ngoặc lồng | `depth_exceeded` |
| A22 | biểu thức 2.001 ký tự | `length_exceeded` |
| A23 | 501 token | `token_limit` |
| A24 | tham chiếu khe **chưa định nghĩa** | `slot_order_violation` |
| A25 | thiếu khe bắt buộc `pricePreRound` | `formula_missing_slot` |
| A26 | dùng `minWallThicknessMm` khi giá trị `null` | `formula_measure_missing` |
| A27 | `pricePreRound` = `0` | `formula_price_nonpositive` |
| A28 | `pricePreRound` = `500` (< `minUnitPriceVnd`) | `formula_out_of_bounds` |
| A29 | `pricePreRound` = `1e11` (> `maxUnitPriceVnd`) | `formula_out_of_bounds` |
| A30 | `costPrice` = `-1` | `formula_cost_nonpositive` |
| A31 | 100.000 cấp ngoặc (đầu vào lớn) | từ chối **trong < 50 ms**, không tràn stack |
| A32 | `source_sha256` bị sửa tay trong DB | `formula_invalid` (phát hiện lệch) |

**Chứng minh cổng chặn eval:** grep trên mọi file của track D3 phải **bằng 0** cho: `eval(`, `new Function`, `Function(`, `child_process`, `vm.`. Kèm rule tự động `formula-eval-forbidden` trong `check-fabricated.mjs` (§2.1) và **test âm**: cố ý chèn `eval(` vào một file nháp ⇒ gate phải **RC=1**.

### 6.3 RLS (chạy bằng `anon` và bằng phiên thật; **không ghi dữ liệu bịa vào production**)
| # | Vai | Thao tác | Kỳ vọng |
|---|---|---|---|
| R01 | `anon` | `select` `pricing_formula_versions` | chỉ thấy `status='published'`; **0 hàng `draft`** |
| R02 | `anon` | `insert` vào `pricing_formula_versions` | **bị từ chối** |
| R03 | `anon` | `update`/`delete` | **bị từ chối** |
| R04 | khách đã đăng nhập (không admin) | như R01-R03 | **bị từ chối** |
| R05 | vai `lab` / `workshop` | như R01-R03 | **bị từ chối** (không có policy cho vai này) |
| R06 | admin | `select` | thấy **cả** `draft`, `published`, `retired` |
| R07 | admin | `insert` draft + publish | **thành công** |
| R08 | admin | `update` `slots` của một hàng đã published | **bị trigger từ chối** (`insufficient_privilege`) |
| R09 | admin | `delete` một hàng bất kỳ | **bị từ chối** (không có policy DELETE) |
| R10 | admin | `update` `setting_audit`/`delete` | **bị từ chối** (append-only) |
| R11 | admin | publish phiên bản thứ hai khi đã có một `published` | **23505** trên `uq_pricing_formula_versions_one_published`, service trả lỗi rõ ràng |
| R12 | admin | `select` `setting_audit` với `store='pricing_formulas'` | thấy đủ `reason`, `changed_by`, `changed_at` |

### 6.4 Tiêu chí nghiệm thu ĐO ĐƯỢC
1. **Tương đương đường cũ (mạnh nhất):** với **cùng một bộ fixture đầu vào** (tối thiểu 12 ca: 1 tệp thật 20 mm, 1 lưới hở, 1 tệp chưa đo, có/không đa màu, có/không phụ kiện, `quantity` 1/10/50), khi **publish công thức mặc định** (sinh từ chính công thức đang có trong mã) thì `finalSellingPriceRounded` **bằng đúng từng đồng** so với đường hệ số. Sai một đồng ⇒ **không đạt**.
2. **Không rơi về hệ số:** với công thức active cố ý hỏng (ví dụ `1/0`), `calculateDetailedPricing` **ném** `PricingUnavailableError`, và **không** có lần nào trả về giá. Kiểm bằng cách chạy 12 fixture và khẳng định **0** fixture ra giá.
3. **`/quote` chặn thật:** Playwright — với công thức hỏng, `/quote` **không** hiện giá, **không** cho thêm vào giỏ, hiện thông điệp nêu nguyên nhân + đường dẫn admin; **0 pageerror**.
4. **Bất biến lịch sử:** R08, R09, R10 đều bị từ chối.
5. **Rollback đúng:** publish v2, rollback về v1 ⇒ phiên bản đang áp dụng có `sha256` **bằng đúng** `sha256` của v1, và lịch sử có **3** hàng (v1, v2, v3-khôi-phục) — không hàng nào bị sửa.
6. **Gate xanh:** `npm run lint` 0 · `vite build` 0 · `check-contrast` 0 · `check-fabricated` **0 (SACH)** · `a8-sql-syntax-check` 0 · `lint-rls-sources` 0 · `lint-rls-migration` 0 · `gen-apply-all` **md5 ổn định qua 2 lần sinh**.
7. **Parser nhanh:** toàn bộ 31 ca §6.1+§6.2 chạy **< 200 ms** tổng; A31 < 50 ms.
8. **Không lộ giá vốn ra bề mặt khách:** grep `costPrice|calculatedGrossMarginPercent|Giá Vốn` trong `src/frontend/views` (trừ `/admin`) và `src/frontend/components/tool3d/QuoteSummaryPanel.tsx` ⇒ **0** (đóng `PC-01` ở phạm vi D3).

---

## §7. Phạm vi và thứ tự thi công

Mỗi bước **một chủ sở hữu**, xong gate mới sang bước sau. **Bước 1-3 độc lập hoàn toàn với D1/D2/D8/O1.**

| Bước | Việc | File sẽ sửa / tạo | Chặn ai? |
|---|---|---|---|
| **1** | Parser + kiểu AST + bảng giới hạn + **bộ test §6.1/§6.2** | **MỚI** `src/utils/formulaParser.ts`, **MỚI** `src/utils/formulaTypes.ts`, **MỚI** `src/utils/formulaParser.test-cases.ts` | Không chặn ai. Không đụng engine |
| **2** | Schema: 2 bảng + sửa `setting_audit` + trigger + 7 policy + 3 mảng `v_tables` + `v_keep`; **sinh lại `apply_all_manual.sql`** | `supabase/migrations/20260901_baseline_schema.sql`, `supabase/migrations/20261010_harden_rls.sql`, `supabase/scripts/apply_all_manual.sql` (sinh tự động), `scripts/gen-apply-all.mjs` (nếu gộp D12), `supabase/diagnostics/audit_schema_truth.sql` (số kỳ vọng) | **Chỉ chặn O1** (lần dán). Nên gộp D1/D2/D8 vào cùng lần sinh lại |
| **3** | Bộ đánh giá + hợp đồng `resolveFormula()` + mã lỗi mới + **12 fixture tương đương** | `src/utils/formulaEvaluator.ts` (**MỚI**), `src/utils/pricingEngine.ts` (thêm nhánh, **không** đổi đường cũ) | **Chạm `pricingEngine.ts`** — file này R1/đợt pricing đã sở hữu; phải xác nhận không agent nào đang giữ trước khi bắt đầu |
| **4** | Tầng dữ liệu: thêm kho vào `settingsService` + service công thức + audit | `src/backend/services/settingsService.ts`, **MỚI** `src/backend/services/formulaService.ts` | Phụ thuộc Bước 2 (bảng phải có) |
| **5** | UI admin: trình dựng khe + bảng biến + xem trước + diff + lịch sử + rollback + băng-rôn cảnh báo hệ số | `src/frontend/components/admin/PricingConfigPanel.tsx`, **MỚI** `src/frontend/components/admin/FormulaBuilderPanel.tsx` | Phụ thuộc Bước 4. **Chạm `PricingConfigPanel.tsx`** — phải xác nhận chủ sở hữu |
| **6** | Gate + nghiệm thu: rule `formula-eval-forbidden`, RLS matrix, Playwright `/quote` chặn, 12 fixture | `scripts/check-fabricated.mjs`, `pwtest/` (không vào repo) | Cuối cùng |

**Thứ tự bắt buộc:** 1 → (2 song song được) → 3 → 4 → 5 → 6. Bước 1 và 2 **không phụ thuộc nhau**.

**Điều kiện dừng an toàn:** nếu Bước 3 không đạt tiêu chí nghiệm thu **1** (tương đương từng đồng), thì **dừng**, không làm Bước 5, và báo lại — vì đẩy UI lên khi engine chưa tương đương sẽ khiến admin publish một công thức cho ra giá khác mà không ai biết.

---

## §8. Rủi ro đã biết

| # | Rủi ro | Giảm thiểu |
|---|---|---|
| 1 | Công thức **không phải bí mật** (client-side) | Chấp nhận và ghi rõ; bảo vệ quyền GHI + tính đúng; ghi chú kinh doanh để ở `setting_audit` |
| 2 | Client-side ⇒ không thể validate ở server | DB kiểm **cấu trúc** (độ dài, `status`, `version_no`, `sha256` regex, bất biến); app kiểm **ngữ nghĩa**; engine **parse lại** khi đọc. Đây là giới hạn thật, không nên che |
| 3 | Admin publish công thức sai làm hỏng giá toàn hệ thống | 12 fixture tương đương + `bounds` chặn + `reason` bắt buộc + rollback 1 cú bấm + `is_active` để tắt nhanh |
| 4 | Quên một trong **ba** mảng `v_tables` ⇒ bảng không được bật RLS | Danh sách kiểm §3.5; `audit_schema_truth.sql` **PHẦN 9** phát hiện "RLS bật + 0 policy"; PHẦN 10 liệt kê bảng kèm số policy |
| 5 | Nhét tên bảng vào `v_ok` ⇒ lint FAIL | §3.5 mục 2 ghi rõ `v_ok` là allowlist STORAGE |
| 6 | Thêm bảng vào `v_catalog_read` ⇒ lộ draft | §3.5 mục 3 cấm tường minh |
| 7 | Tên ràng buộc CHECK của `setting_audit` | §3.3: phải kiểm tên thật trước khi drop, nếu không sẽ có 2 ràng buộc |
| 8 | Hai nguồn sự thật (hệ số ↔ biểu thức) gây "sửa mà giá không đổi" | Bảng ưu tiên §3.4 + băng-rôn cảnh báo ở UI |
| 9 | `MAX_EXPONENT_ABS`/`bounds` quá rộng cho phép giá vô lý | Trần tuyệt đối `1e12` + từ chối lưu nếu `bounds` vượt trần |

---

## §9. Danh sách kiểm cho agent thi công

- [ ] Không thêm dependency nào (kiểm `package.json` **không đổi**).
- [ ] Không `eval` / `new Function` / `vm` / `child_process` / chuỗi-động-rồi-thực-thi.
- [ ] AST chỉ có **6 loại node** §2.3; `switch` vét cạn + `default` ném lỗi.
- [ ] Tên biến/khe ngoài whitelist ⇒ lỗi **lúc parse**.
- [ ] Đủ **8 khe bắt buộc**; tham chiếu khe chỉ về **trước**.
- [ ] Áp **đủ** 13 giới hạn §2.7 ở **cả** write-time và runtime.
- [ ] Chia 0 / số mũ / non-finite ⇒ lỗi có mã, **không** NaN/Infinity.
- [ ] Sai miền đầu ra ⇒ **chặn**, **không kẹp**.
- [ ] **Không** nhánh rơi về hệ số khi đường biểu thức lỗi.
- [ ] Engine **parse lại** `expression`, **không** tin AST trong DB.
- [ ] Số đo `null` mà biểu thức có dùng ⇒ chặn; **không** `?? 0`.
- [ ] `setting_audit`: mở rộng CHECK + thêm `reason`; **không** thêm policy UPDATE/DELETE.
- [ ] `pricing_formula_versions`: **không** policy DELETE; trigger chặn sửa nội dung.
- [ ] **Ba** mảng `v_tables` + `v_keep` (tên policy) đã cập nhật; **không** đụng `v_ok`; **không** thêm vào `v_catalog_read`.
- [ ] `apply_all_manual.sql` **sinh tự động**, md5 ổn định qua 2 lần sinh, **không** sửa tay.
- [ ] **7 gate** xanh; rule `formula-eval-forbidden` có **test âm** chứng minh bắt được.
- [ ] 12 fixture **tương đương từng đồng**; công thức hỏng ⇒ **0** fixture ra giá.
- [ ] VAT vẫn **4 call site**, vẫn đọc `vat_percent`, `null` ⇒ ẩn dòng.
- [ ] **Không** lộ `costPrice`/biên lợi nhuận ra bề mặt khách (`PC-01`).
