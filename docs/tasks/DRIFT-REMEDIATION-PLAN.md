# VCUBE — Kế hoạch xử lý drift tài liệu theo nguyên nhân gốc

> **Ngày:** 2026-09-23
> **Trạng thái:** **CHỐT KẾ HOẠCH — chưa thi hành code** (theo quyết định 2026-09-23).
> **Quyết định đã chốt:** (F) **VI-only chính thức**; (A–E) giữ nguyên thứ tự ưu tiên trong §1–§5.
> **Bối cảnh:** `docs/tasks/DOCS-ISSUES.md` ghi **125 mục còn mở** (78 CONFIRMED · 17 PARTIAL · 30 NEW).
> Sửa từng mục thì vòng review sau lại sinh 100+ mục mới. Kế hoạch này gộp theo **nguyên nhân gốc**
> để mỗi lần sửa loại luôn cả lớp lỗi, thay vì từng mục.
> **Nguồn vấn đề:** `DOCS-ISSUES.md` (ID ổn định) · `DOCS-REVIEW-BACKLOG.md` (bằng chứng dài).

---

## 0. Chẩn đoán: 125 mục ≈ 6 nguyên nhân gốc

| # | Nguyên nhân gốc | Ví dụ (ID) | Tính chất | Nhóm xử lý |
|---|---|---|---|---|
| **A** | RLS "mở rộng rồi mới thu hẹp": dùng `USING (true)` trên bảng gốc, phụ thuộc việc "nhớ đừng select cột nhạy cảm" | SEC-01, 02, 04, 07 | **Lỗi thật, ảnh hưởng dữ liệu** | §1 |
| **B** | Docs chép tay số liệu từ code: số dòng, số lượng, tên route, danh sách gate, file:line | DS-13/14, IDX-06/07/14, ARCH-11, **mọi `file:line`** | Drift lặp lại vô hạn | §2 |
| **C** | Nhầm "có trong schema" với "đã nối vào UI" | PAGE-01/02/03/10, DB-09, NEW-29 | Docs nói "không có bảng", thật ra bảng có nhưng chưa nối | §3 |
| **D** | UI hứa nhiều hơn khả năng thật | PAGE-04/05/12/14, NEW-08 | Lỗi trung thực sản phẩm | §4 |
| **E** | Di sản migration: Next.js → Vite (`bun.lock` còn `motion`, `NEXT_PUBLIC_*`, `/workshop/settings`, tsconfig Next) | IDX-02/08, DS-03, NEW-13/26/27 | Dọn dẹp | §5 |
| **F** | Quyết định sản phẩm chưa chốt: VI-only hay VI/EN | DS-01, NEW-11/28 | **Cần quyết định, không phải sửa lỗi** | §6 |

> Lưu ý: chính `DOCS-ISSUES.md` bản đầu cũng bị nguyên nhân B (bảng tổng ghi 78 nhưng cộng ra 83;
> "đã kiểm" 97 vs 102; NEW ghi 35 nhưng chỉ có 30; NEW-29 vs NEW-24). Đã sửa. Đây là minh chứng:
> **số liệu chép tay sẽ lệch** — nên phần §2 phải chuyển sang sinh tự động.

---

## 1. Nguyên nhân A — Bảo mật RLS (làm trước tiên: đây là lỗi thật duy nhất ở mức P0)

### A1. SEC-01 — `designer_profiles` lộ `bank_account`/`tax_id` cho anon
Tách dữ liệu nhạy cảm sang bảng riêng thay vì dựa vào "nhớ không select cột đó". Bảng tách an toàn hơn
column-level `GRANT` vì một migration sau không thể vô tình mở lại.

```sql
create table public.designer_payout_info (
  designer_id uuid primary key references public.designer_profiles(id) on delete cascade,
  bank_name   text,
  bank_account text,
  tax_id      text
);
-- migrate dữ liệu từ designer_profiles, rồi DROP 3 cột khỏi designer_profiles
alter table public.designer_payout_info enable row level security;
create policy designer_payout_info_owner_admin on public.designer_payout_info
  for all using (
    designer_id::text = (select auth.uid())::text
    or public.current_app_role() = 'admin'
  );
-- bỏ designer_profiles khỏi v_catalog_read trong 20261010_harden_rls.sql
```

### A2. SEC-02 — policy designer `custom_design_requests` khớp `designer_id is null`
Mô hình "pool yêu cầu chưa có người nhận" **không** nên là policy trên bảng gốc (mọi authenticated khớp):
- Tạo view `open_design_requests` chỉ gồm cột **không nhạy cảm** (không có `client_name`/`messages`/`reference_files`).
- Nhận việc qua RPC `claim_design_request(id)` — `security definer`, `update … where designer_id is null`
  để chống hai designer nhận cùng lúc (atomic claim).

### A3. SEC-04 — catalog public lộ COGS/tồn kho
Đưa `cost_per_kg`, `acquisition_cost`, `hourly_cost`, `cost_price`, `price_per_kg`… vào bảng `*_private`
hoặc tạo view public chỉ chứa cột an toàn; bỏ các cột cost khỏi `v_catalog_read`.

### A4. SEC-07 — ma trận RLS hứa quyền Designer/Workshop mà migration không cài
Quyết định: **hoặc** bổ sung policy cho orders/order_items/order_files/storage, **hoặc** sửa ma trận doc
cho khớp. Nếu là ý định sản phẩm → thêm policy (kèm test); nếu không → sửa doc.

### A5. Chống tái phát (giải quyết luôn SEC-05, DB-03/04, NEW-02, SEC-03, SEC-10, NEW-03)
- **pgTAP** (`supabase test db`) chạy trong CI: mỗi bảng có test "anon thấy gì / user A thấy gì của user B".
  Thay `verify-rls.mjs` (đang có bug biến `status` chưa định nghĩa — SEC-05). → cần thêm dependency dev.
- **CHECK/enum** cho `payment_status`, `kyc_records.status`, `orders.status`, `status_stage_index`, payout status.
- **`bootstrap_admin.sql`**: truyền email qua biến psql `-v admin_email=...`, không hardcode (SEC-03);
  mở rộng `lint-rls-sources.mjs` quét cả `supabase/scripts/`.
- **Scheme upload**: chốt `orders/<order_id>/...` rồi **sửa code** (`database.ts:288` đang `cad/<file>`)
  và thêm policy, không sửa docs.

---

## 2. Nguyên nhân B — Docs "sinh từ code", không chép tay

Đây là nguyên nhân sinh ra phần lớn lỗi lặp lại. Chuyển sang docs-as-code:

| Lớp | Cách sinh | Loại bỏ |
|---|---|---|
| **Schema** | Sinh `schema.md` từ Postgres: `supabase gen types` + script đọc `information_schema` + `pg_policies` | DB-03/04/05/06/07/08, ARCH-09/10/11, IDX-06, NEW-01/02 |
| **Route** | Sinh bảng route từ `App.tsx` (hoặc chuyển sang data-router với route là object đọc được bằng script) | IDX-05/07, DS-02, NEW-04 |
| **Env** | Định nghĩa schema env (ví dụ `zod` + `@t3-oss/env`) → app **fail-fast** khi thiếu khoá; sinh `.env.example` từ schema | NEW-24, NEW-13, IDX-15 |
| **Gate** | Một lệnh `npm run check` tự tìm `scripts/check-*.mjs` + `scripts/lint-rls-*.mjs`; CI chạy đúng lệnh đó; docs chỉ ghi `npm run check` | IDX-04/14, DS-05, NEW-30 |
| **Tham chiếu code** | Bỏ `file:line`, dùng **tên symbol** (`saveOrder`, `KANBAN_STAGES`) hoặc permalink theo commit | DS-07, mọi `file:line` trong toàn bộ docs |
| **Link/Dep** | `lychee` cho link chết; `knip` cho dependency/file thừa (`vite` trùng, `motion` ma trong `bun.lock`); gate grep tên module/route/env được nhắc trong docs mà không tồn tại | LNK-*, NEW-16, NEW-27 |
| **Frontmatter** | Mỗi doc có `status: active \| snapshot \| historical`, `verified: <date>`, `owner`; CI cảnh báo doc `active` quá 60 ngày chưa verify | DS-04/18/21, LNK-04 |

> **Cảnh báo dependency:** `pgTAP`, `zod/@t3-oss/env`, `lychee`, `knip`, `TanStack Query` đều là **thành phần mới**.
> Repo đang có quy ước "không thêm dependency" (AGENTS §Loop). Cần **phê duyệt** trước khi thêm; nếu không,
> phương án thay thế không-dep: script Node tự đọc `information_schema`/`App.tsx`, `npm run check` bằng `node`.

### B1. Việc P1 gấp nhất về trải nghiệm dev: `.env.example` (NEW-24)
Hiện `README.md:28` hướng dẫn `cp .env.example .env`, nhưng template **thiếu toàn bộ** khoá `VITE_*` /
`SUPABASE_SECRET_KEY` ⇒ dev mới đi thẳng vào chế độ mock mà không báo lỗi. Sửa template + thêm kiểm tra
fail-fast là việc rẻ, tác động ngay.

---

## 3. Nguyên nhân C — Ma trận trạng thái tính năng thay cho câu "không có bảng X"

Thay câu "không có bảng `order_items`" (sai) / "có bảng `order_items`" (dễ hiểu nhầm) bằng một bảng theo tầng:

| Tính năng | Schema | Service | UI | Prod-ready |
|---|---|---|---|---|
| `order_items` | ✅ | ❌ | ❌ | ❌ |
| `warranty_claims` | ✅ | ❌ | local state | ❌ |
| `order_files` | ✅ | ❌ | TODO | ❌ |
| `reviews` | ✅ | ❌ | — | ❌ |
| `digital_assets` | ✅ | ❌ | heuristic | ❌ |
| `/orders` (lịch sử) | ✅ | ⚠️ chỉ admin | ⚠️ rỗng cho user | ❌ |

Một bảng này thay cho PAGE-01/02/03/10, DB-09, NEW-29 và phần lớn backlog §4.
Có thể sinh gần tự động: schema từ DB, service/UI từ `grep`.

---

## 4. Nguyên nhân D — UI trung thực: capability registry + sửa hành vi

### D1. `src/config/capabilities.ts`
Khai báo tính năng nào đang thật; UI hiển thị `<ComingSoon />`/ẩn khi cờ tắt. Google OAuth và password reset
đã dùng cách này (`ENABLE_GOOGLE_OAUTH=false`) — mở rộng ra toàn app (dispatcher, carrier tracking, auto-scan…).

### D2. Mở rộng `check-fabricated.mjs`
Chuỗi marketing chứa "tự động", "real-time", "carrier" phải đi kèm một capability đang bật.

### D3. Sửa lỗi hành vi người dùng gặp (không chỉ sửa chữ)
- **PAGE-04/18**: dùng TanStack Query load lịch sử đơn cho user đăng nhập; `/order-success/:orderId`,
  `/tracking/:orderId` lấy dữ liệu theo URL (RPC guest token đã có) thay vì in-memory ⇒ reload không mất đơn.
- **ARCH-03**: khi đã có Query, dùng Supabase Realtime `invalidateQueries` cho `orders` thay vì tự quản channel.
- **PAGE-11**: pipeline chỉ ghi được `quoted` ⇒ hoặc nối `updateStatus` vào UI, hoặc rút pipeline còn đúng
  các bước đã hỗ trợ.
- **ARCH-01/02**: hàm chia doanh thu 0 caller + docs mô tả sai ⇒ chọn một nguồn sự thật (viết lại doc từ code,
  hoặc xoá hàm chết).

---

## 5. Nguyên nhân E — Dọn di sản Next.js/Vite

- Xoá/regenerate `bun.lock` **hoặc** khai `packageManager` trong `package.json` để chỉ còn một trình quản lý gói.
- Xoá `vite` khai trùng ở `dependencies` + `devDependencies` (NEW-27).
- Xoá `NEXT_PUBLIC_*`, exclude cây Next trong tsconfig, và mọi link `src/app/**` trong docs.
- Sau bước này DS-03, NEW-23, NEW-26, NEW-27, IDX-02/08 tự hết.

---

## 6. Nguyên nhân F — Quyết định đa ngôn ngữ

> **✅ ĐÃ CHỐT (2026-09-23): VI-only chính thức.** Không làm song ngữ trong 1–2 quý tới.

Hệ quả khi thi hành (chưa code ở vòng này):
- Xoá toàn bộ bước EN ("Flip to EN") khỏi `docs/design/qa-checklist.md` — DS-01.
- Sửa `system-overview.md` bỏ "locale ('vi' | 'en')" — NEW-11.
- Bỏ **dần** (không sửa tay hàng loạt) ~1186 nhánh `isVi ?` khi động vào file — NEW-28. Chưa cần codemod.
- `LanguageContext` giữ nguyên cơ chế force `'vi'`; cập nhật doc mô tả đúng là VI-only.

Phương án "song ngữ thật" (Lingui/react-i18next + codemod) **bị loại**, không cần thêm dependency i18n.

---

## 7. Lộ trình gợi ý

| Đợt | Việc | Kết quả | Phụ thuộc |
|---|---|---|---|
| **1 (vài ngày)** | SEC-01, SEC-02, `.env.example` + env fail-fast (ưu tiên phương án script no-dep), áp quyết định VI-only (DS-01/NEW-11) | Hết rủi ro dữ liệu; dev mới chạy được ngay | VI-only **đã chốt**; còn chờ duyệt nếu muốn dùng dep env (mặc định: no-dep) |
| **2 (1–2 tuần)** | pgTAP + CHECK/enum, `npm run check`, lychee/knip, dọn `bun.lock`/`vite`/Next, frontmatter status | Chặn drift tái phát | Cần duyệt: pgTAP/lychee/knip |
| **3 (2–3 tuần)** | Sinh schema/route docs, ma trận tính năng, capability registry, TanStack Query cho orders | Docs tự đúng, UI trung thực | Cần duyệt: TanStack Query; duyệt data-router (nếu chọn) |
| **4** | Backlog phát triển: `order_files`, payout ledger, warranty, reviews | Tính năng thật | Dữ liệu/hub thật |

> Sau đợt 3, phần lớn 125 mục biến mất vì docs được sinh từ nguồn thật; phần còn lại là sửa văn bản thủ công
> vài chục mục.

---

## 8. Ghi chú quan trọng trước khi thực thi

**Đã chốt:** (F) VI-only chính thức.

**Còn chờ phê duyệt (mặc định = phương án no-dep nếu không duyệt):**
- `zod`/`@t3-oss/env` cho env fail-fast (đợt 1) → mặc định dùng script Node no-dep.
- `pgTAP`, `lychee`, `knip` (đợt 2) → mặc định dùng script Node/grep nội bộ.
- `TanStack Query` (đợt 3) → mặc định giữ fetch hiện tại + sửa tối thiểu.
- `data-router` (đợt 3, tùy chọn) → mặc định sinh bảng route bằng script đọc `App.tsx`.

1. **Không thêm dependency khi chưa được duyệt** (quy ước repo). Mọi phương án dùng thư viện mới ở §2/§4
   phải có phương án thay thế no-dep hoặc chờ phê duyệt.
2. **A (RLS) chạm production**: sửa `supabase/migrations/20261010_harden_rls.sql` (hoặc thêm migration mới
   theo quy ước repo — hiện repo yêu cầu *sửa trực tiếp 3 file*, cân nhắc trước khi tạo file mới).
   Cần chạy `scripts/lint-rls-*.mjs` + `verify-rls.mjs` + pgTAP trước khi áp.
3. **`src` comment cũng sai schema** (NEW-29) — sửa kèm đợt C để tránh nguồn sai mới.
4. Mỗi đợt phải qua gate: `npm run lint`, `npm run build`, toàn bộ `scripts/check-*.mjs` / `lint-rls-*.mjs`.

---

## 9. Mapping nguyên nhân ↔ ID (để lọc `DOCS-ISSUES.md`)

- **A:** SEC-01, SEC-02, SEC-04, SEC-07, SEC-05, SEC-03, SEC-08, SEC-09, SEC-10, NEW-01, NEW-02, NEW-03.
- **B:** DS-05, DS-07, DS-11..16, IDX-04/06/07/14, ARCH-06/07/11, NEW-04, NEW-14/15/16/18/19/30, mọi `file:line`.
- **C:** PAGE-01/02/03/10, DB-09, NEW-29.
- **D:** PAGE-04/05/06/07/08/09/11/12/13/14/17/18/19, ARCH-01/02/03, NEW-05/06/07/08.
- **E:** IDX-02/08, DS-03, NEW-13/23/26/27, IDX-17.
- **F:** DS-01, NEW-11/28.
