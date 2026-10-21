<!-- doc-meta: status=active; verified=2026-10-19; owner=integrator-I3 -->
# Integration I3 — Admin consistency & Quote/Designer

Phạm vi: 8 file được giao. UI-only; không sửa `src/frontend/ui/**`, backend, store, CSS, script.

## Mục đã sửa

| Mã | File:line (hiện tại) | Cách sửa |
|---|---|---|
| R1 #4 | `AdminStorefrontPanel.tsx:125,258,471,544,675,765,894` | 7 panel lớn: `rounded-lg … border-line-subtle … p-6 sm:p-8` → `rounded-xl border border-line bg-surface p-6 sm:p-8`; divider trong panel vẫn `border-line-subtle`. |
| R1 #4 | `AdminSeoPanel.tsx:88,432,532` | 3 panel lớn cùng recipe `rounded-xl border border-line`. |
| R1 #4 | `AdminSettingsPanel.tsx:244` | Panel lớn cùng recipe `rounded-xl border border-line`. |
| R1 #4 | `PricingConfigPanel.tsx:899` | Panel lớn cùng recipe `rounded-xl border border-line`. |
| R1 #21 | `AdminProductsPanel.tsx:264` | Chip tối trong cột sản phẩm (nhãn `prod.badge`) → `rounded-sm border border-line bg-primary-tint text-fg`, bỏ `bg-surface-inverse text-on-inverse`. |
| R1 #22 | `DesignerUploadWizardTab.tsx:232` | Chip danh mục/file → `rounded-sm border border-line bg-primary-tint text-fg`, bỏ chip tối. |
| R1 #23 | `PricingConfigPanel.tsx:1945-1950,1954-2015` | Bảng "Mốc chiết khấu": `th` → `h-10 px-4`; `tbody` bỏ `divide-y`; `tr` → `h-11 border-t border-line-subtle`; `td` bỏ `py-3`, giữ `px-4`. Đồng bộ bảng preview `:1284`. |
| R1 #10 | `QuoteSummaryPanel.tsx:628` | Badge "Phổ Biến" → `<Badge variant="technical" size="sm">`, bỏ nền `bg-primary` + `rounded-full`. |
| R1 #11 | `QuoteSummaryPanel.tsx:681-692` | Nút `bg-warning text-white` → `<Button variant="secondary" fullWidth>`; giữ nghĩa cảnh báo bằng callout `warning-tint` + dot `bg-warning` trong nhãn. |
| R1 #11/#35 | `QuoteSummaryPanel.tsx:55-57,399,661,676` | Viền badge/callout trạng thái `/30`–`/40` → `/20` (positive/primary/warning). |
| R1 #13 | `DesignerPayoutsTab.tsx:106-109` | Thêm banner data-honesty trên danh sách: `rounded-md border border-warning/20 bg-warning-tint p-3 text-sm text-warning` + chuỗi `isVi ? … : …`. Không xoá mock, không nối DB, giữ nút rút tiền disabled. |
| R2 #19 / R2 #7 | `AdminStorefrontPanel.tsx:171-250` (6 tab) | Thêm `aria-pressed={activeTab === '…'}` và `max-md:min-h-11`; `type="button"` đã có sẵn. Không đổi handler/state. |
| R2 #19 / R2 #7 | `AdminSeoPanel.tsx:133-186` (4 tab) | Thêm `aria-pressed` + `max-md:min-h-11`; `type="button"` đã có sẵn. Không đổi handler/state. |
| R2 #25 | `PricingConfigPanel.tsx:1183-1189,1209-1214,1233-1238,1258-1262` | 4 hint `p` có `id="pricing-global-*-hint"`; input thêm `aria-describedby` (ghép id lỗi khi có). Không đổi cấu trúc field. |

Tổng: 9 mục review (R1 #4/#10/#11/#13/#21/#22/#23 + R2 #19/#25), 12 panel lớn.

## Mục bỏ qua / không cần sửa

| Mục | Lý do |
|---|---|
| R1 #24 (`InvoiceModal`) | Ngoài phạm vi I3 — I1 phụ trách. |
| R2 #19 `PricingConfigPanel` | 6 tab đã đúng từ trước: `type="button"`, `role="tab"`, `aria-selected`, `aria-controls`, `max-md:min-h-11`. Thêm `aria-pressed` sẽ trộn hai mô hình ARIA. |
| R2 #25 phần còn lại | Chỉ gắn cho 4 hint được review nêu trực tiếp. Các hint khác nằm trong 69 field inline; đổi toàn bộ là refactor ngoài phạm vi. Hai hint `cfg-profit-mode-help` và `prn-throughput-help` đã có id + `aria-describedby` từ trước. |
| R1 #21 nhãn "SKU" | Dòng 264 thực tế là chip `prod.badge` (review gọi là SKU); cột SKU `:276` chỉ là text, không có chip tối. Đã sửa đúng chip tối duy nhất. |
| R2 #7 các tab admin khác | Chỉ 3 panel được giao; không sửa `Group5ProductionPanel` hay `ProductDetailView`. |

## Gate

- `npx tsc --noEmit`: PASS (exit 0).
- `npm run build`: PASS (Vite 6.4.3, 1875 modules, build 4.97s).
- `node scripts/check-contrast.mjs`: PASS — 47/55 pass, 8 expected non-pass, 0 unexpected fail.
- `node scripts/check-contrast-combos.mjs`: PASS — 99 file, 0 vi phạm.
- `grep -c chrome` 8 file: 0/0/0/0/0/0/0/0.
- `wc -l PricingConfigPanel.tsx`: 3079 (trong 2925–3233).
