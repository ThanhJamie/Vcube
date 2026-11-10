<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# Group 0 — Ghi dữ liệu đáng tin (data integrity)

> Base: `main` @ `f8c5310` (source `39be1fd` + báo cáo đã sửa theo PO review).
> **Không push/deploy.** Không DB/migration/seed. Không submit đơn.
> Mục tiêu: chặn mất dữ liệu, báo lỗi thật, không báo thành công giả trước khi mở rộng UI.

## 1. Phạm vi

| Item | File chính | Kết quả bắt buộc |
|---|---|---|
| OPS-28 | `WarehouseInventoryPanel.tsx`, `useCatalogData.ts` | Mở kho khi `materials` chưa tải xong không thể phát sinh lệnh xoá; handler không stale |
| OPS-32 | `WarehouseInventoryPanel.tsx`, `useCatalogData.ts` | Ghi kho lỗi ⇒ hiện lỗi + rollback; không toast thành công trước DB |
| OPS-19 | `useCatalogData.ts`, `DesignerDashboardView.tsx` | Insert product lỗi ⇒ wizard không báo thành công, không chuyển tab; rollback product |
| OPS-23 | `customDesignService.ts` | Request DB-backed không còn đọc/ghi localStorage; tài khoản trước không thấy request ở máy |
| OPS-24 | `useSiteSettings.ts`, `AdminStorefrontPanel.tsx`, `AdminSeoPanel.tsx` | Storefront/SEO chỉ ghi field đã sửa; không ghi đè field của panel kia |
| OPS-25 | `useSiteSettings.ts` | Lưu site_content lỗi ⇒ rollback state; panel giữ dirty + báo lỗi |
| OPS-06 | verification only | Build production + mock, mở `/admin/orders` → “Chi tiết & thanh toán”; ghi rõ modal mở hay không |

## 2. Acceptance

- Cold deep-link `/admin/inventory` với `materials=[]` rồi tải xong: không có request `deleteMaterial`.
- Ghi `materials`/`accessories` lỗi: toast lỗi; state trở về trước; không “Đã cập nhật…” giả.
- Designer upload: product insert lỗi ⇒ toast lỗi, phase `error`, không sang tab Models, không success.
- `localStorage['vcube_custom_design_requests']` không còn được tạo/đọc; request cũ không hiện trong board.
- Storefront lưu hero, SEO lưu title ⇒ payload thứ hai không chứa/ghi đè hero cũ.
- Save site_content lỗi ⇒ `siteContent` global trở về trước; panel vẫn dirty.
- Production build modal: kết quả có/không, kèm ảnh; không sửa hàng loạt modal nếu chưa xác nhận production.

## 3. Không làm trong nhóm này

- Không đổi schema/RLS/migration.
- Không xây màn chi tiết đơn/xưởng, portal khách, payment persistence (Nhóm 1–3).
- Không sửa IA/menu admin.
- Không sửa modal conditional nếu production chưa xác nhận.

## 4. Kết quả (2026-11-10)

Nhánh `group0/data-integrity` (base `f8c5310`), **không push**:

| Commit | Nội dung |
|---|---|
| `96cf583` | OPS-28/32/19 phần hook: chặn xoá oan, rollback + toast lỗi, product insert throw |
| `e781182` | OPS-19 wrapper await; OPS-23 bỏ localStorage custom design |
| `b3ca7b0` | OPS-24 patch theo field; OPS-25 rollback site_content |
| `77fb181` | OPS-28 dùng cờ “đã tải xong” thay vì suy từ độ dài (cho phép xoá sạch sau khi tải) |

**Kết quả kiểm chứng:**

| Item | Kết quả |
|---|---|
| OPS-28 | Cold deep-link (materials delay): rows hiện sau ~8s, bấm +1 → POST đúng, **0 DELETE**; 390/1440 |
| OPS-32 | Mock write 500: toast lỗi, state rollback, không toast thành công |
| OPS-19 | Mock insert product 500: vẫn ở wizard, phase error, không success/không đổi tab |
| OPS-23 | Seed cache cũ: board không hiện item cache; app không đọc/ghi key; create fail không tạo key |
| OPS-24 | SEO/Storefront race: body thứ hai giữ hero mới; không overwrite snapshot cũ |
| OPS-25 | Mock save 500: home không giữ giá trị lỗi; panel vẫn dirty + báo lỗi |
| OPS-06 | **Production build** (không StrictMode) + mock: modal chi tiết mở (`dialog[open]=1`); lỗi chỉ dev |

**Gate:** tsc PASS; 203/203 unit; `npm run check` 24/24; browser 0 tràn/0 pageerror.

**Caveats:**
- Site content vẫn gửi **full object** (database.ts yêu cầu); “patch” là semantic — chỉ field sửa được cập nhật, field khác lấy state mới nhất.
- Key localStorage cũ `vcube_custom_design_requests` **không tự xoá** trên máy đã dùng; cần quyết định purge một lần.
- Lỗi insert product còn message generic do `result.ts`; đúng là không báo thành công nhưng chưa hữu ích.
- Không sửa 11 modal conditional khác vì production đã xác nhận mở được.
