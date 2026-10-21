<!-- doc-meta: status=active; verified=2026-10-21; owner=storefront -->
# HANDOFF — Phase 6a: docs-as-code (số DB thực + routes doc regen)

> **Trạng thái: DONE.** Docs-only: không sửa `src/**`, `supabase/**`, `package.json`; không commit/push.
> Tree lúc đo: HEAD `8a3d4aa` (Phase 1–4) + working tree Phase 5/6 của các agent khác (5a/5b trong
> HEAD; `tests/` + `test:unit` của task-38 đang uncommitted; vài file `src/**` đang được agent
> clean-up sửa — **không phải** thay đổi của phase này).
>
> Gate: `node scripts/gen-routes-doc.mjs` → **30 route**, chạy 2 lần **byte-identical**
> (`source-sha256 f0bd92f499c9`). `run-checks --only doc-refs --only doc-freshness`:
> **doc-freshness 0 vi phạm**; doc-refs advisory 291 → 307 (giải trình §4).

---

## 1. Bảng "claim cũ → số thực → nguồn"

| Hạng mục | Claim cũ (drift) | **Số thực (2026-10-21)** | Nguồn / cách đếm |
|---|---|---:|---|
| Migration | 3 file ("sửa trực tiếp 3 file trên") | **12 file** | `ls supabase/migrations/*.sql \| wc -l` → 12; chuỗi: 3 core (`20260900`, `20260901`, `20261010`) + 9 forward (các file 20261011…20261013, trong đó `20261013100000` H-gated) |
| Bảng | 31 | **32** | 31 `create table` ở `20260901_baseline_schema.sql` + `designer_payout_info` (`20261013090000_sec01_payout_table.sql:31`). Lệnh đếm đầy đủ: xem `docs/database/schema.md` (header) / `AGENTS.md` |
| View | 1 (`pricing_config`) | **2** | `pricing_config` (`20260901…:479`, `security_invoker=true`) + `open_design_requests` (`20261012090000…:39`, `security_invoker=false`) |
| Hàm thường trực | 13 (6 helper + 7 trigger) | **19** | 21 `create function` distinct − 2 helper tạm bị `drop` cuối `20261010_harden_rls.sql:1345-1346` (`_vcube_make_policy`, `_vcube_has_columns`) = 19 = **9 helper/RPC + 10 trigger functions** |
| Định nghĩa trigger | 7 (27 instance) | **9 định nghĩa / ≈29 instance** | 12 câu `create trigger` tĩnh, 9 tên unique; instance = `trg_touch_updated_at` × **21 bảng** (mảng baseline `20260901…:~1528`) + **8** trigger gắn 1 bảng = 29 |
| Policy bảng hiệu lực | 90 (88 áp dụng) | **92** | 62 call `_vcube_make_policy` trên bảng + 22 từ `foreach v_catalog_read` (11 bảng × 2) + 2 từ `foreach ['workshop_machines','workshop_materials']` + 2 policy `orders` tạo trực tiếp + **4** policy `designer_payout_info` (migration #10) = **92**. 2 tên policy `pricing_config` trong `v_keep` (90) **không bao giờ được tạo** vì `pricing_config` là VIEW (`_vcube_make_policy` kiểm `relkind`) |
| Policy storage | 6 | **7** | Allowlist `v_ok` trong `20261010_harden_rls.sql:1120` có 7 tên; `vcube_cad_files_cad_owner_rw` tái tạo ở `20261013110000_storage_scheme.sql` |
| Policy realtime | (không có trong docs) | **1** | `orders_admin_realtime` trên `realtime.messages`, tạo có điều kiện ở `20261012130000_orders_broadcast.sql` — chỉ admin đọc topic `orders:admin` |
| `pricing_config` | "compatibility view" (đúng) | **VIEW**, `security_invoker=true` | `20260901_baseline_schema.sql:479` — docs phải nói rõ là view để giải thích 2 policy bị skip |
| App.tsx | ~2.153 dòng / "root router + realtime" | **343 dòng**, không còn `<Routes>`/realtime | `wc -l src/App.tsx` = 343; route table ở `src/frontend/routes/AppRoutes.tsx` (Phase 4d); realtime ở `src/frontend/hooks/useCatalogData.ts` + `settingsService` |
| Store | thư mục `src/stores` (đã xoá) (4 store) | **thư mục `src/stores` (đã xoá) đã xoá**; **6 store** ở `src/frontend/stores` | `ls -d src/stores` → không tồn tại; `ls src/frontend/stores` → cart, UI, customerAdmin, designerAdmin, production, workshopAdmin |
| i18n | "bilingual dict retained", 1.201 `isVi ?` | **VI-only**: 0 `isVi`, 0 `en:` dictionary | `grep -rl 'isVi' src --include=*.tsx \| wc -l` = 0; `grep -c 'en:' src/frontend/context/LanguageContext.tsx` = 0; API còn `{ t }` |
| Data cache | 4 nguồn, localStorage cache | **0 cache DB-backed** | `grep -rn "vcube_products\|vcube_materials\|vcube_printers\|vcube_site_content" src` = 0 hit |
| workshopService | god-file 2.243 dòng | **façade 128 dòng** trên 14 module `workshop/*` | `wc -l src/backend/services/workshopService.ts` = 128; `ls src/backend/services/workshop` = 14 file |
| Backend services | catalogService, pricingService | **đã xoá** (Phase 1); còn asset/customDesign/designer/order/settings | `ls src/backend/services` |
| Bundle | ~466 kB gzip (baseline Phase 0) | **≈278 kB gzip** (−40%) — Phase 5 | đo 2026-10-21: index 186,24 + react 18,20 + supabase 57,80 + CSS 15,77; `three-vendor` rời initial |
| Unit test | 0 unit test | **71 test** / 5 file (`npm run test:unit`) | thư mục `tests/unit` (5 file: format, mappers, pricingEngine, settingsValidators, vat); `npm run test:unit` → 71 pass. **Lưu ý:** `tests/` + script `test:unit` do **task-38** thêm (uncommitted lúc viết docs) — docs ghi "Phase 6b"; nếu Lead commit docs trước task-38 thì dòng DoD `test:unit` tạm chưa chạy được cho tới khi task-38 land |
| Route docs | sinh từ `src/App.tsx` (script fail sau Phase 4d) | **sinh từ `src/frontend/routes/AppRoutes.tsx`**, 30 route | §3 |

---

## 2. Files changed (chỉ docs + 1 script)

| File | Thay đổi |
|---|---|
| `AGENTS.md` | Viết lại mục Layout (hooks/routes/shell/stores/workshop modules), Conventions (realtime vị trí mới, i18n VI-only, một nguồn data, kích thước module), Definition of done (thêm `npm run test:unit` + docs-as-code + 390/1440), bảng **12 migration**, bảng **số liệu DB thực + cách đếm**, Tài liệu canonical (optimization + UI v3 handoffs), **Trạng thái thi công** Phase 1–5 + Phase 6 in progress, follow-up list hiện tại |
| `docs/README.md` | Số DB 32+2/92+7; light-only (bỏ "Dark Opt-In"/ThemeProvider); state layer → hooks + 6 store frontend; routing/code-splitting (AppRoutes, 9 route lazy, three lazy); link schema/seeds/RLS theo số mới; §3.4 tasks trỏ optimization canonical + UI v3; **cột "Lazy Loaded" §4 cập nhật đúng Phase 5a** + trỏ `_routes.generated.md` |
| `docs/database/schema.md` | Header 32 bảng/2 view/19 hàm/9 trigger/92+7 policy; thêm bảng **`designer_payout_info`** (cột, RLS 4 policy, RPC) + view **`open_design_requests`** (definer + chỉ cột brief); §5 hàm 19 (thêm `claim_design_request`, `get_my_payout_info`, `admin_get_designer_payout`, `upsert_my_payout_info`, `orders_broadcast_status`); §6 thêm `trg_protect_designer_profile_privileged_columns` + `trg_orders_broadcast`, số instance ≈29; §7 storage scheme `cad/<uid>/<uuid>/<file>` + bảng **7 policy** có tên; ghi chú cột bank legacy sẽ drop (H-gated) |
| `docs/database/seeds-and-migrations.md` | Header **12 file** (3 core + 9 forward, 1 H-gated); diagram bước 2/3 số đúng; bảng forward sắp lại theo tên file (#11 drop bank, #12 storage); giải thích bundle 8 file + 1 H-gated; §Phase 3 nói rõ 88 hiệu lực → 92 toàn chuỗi, 7 storage |
| `docs/security/rls-policies.md` | Header **92 policy bảng + 7 storage + 1 realtime**; §4.4–4.6 (designer lockdown, orders broadcast, payout PII); §5.2 scheme `cad/<uid>/…` + policy thứ 5; §6 inventory: 90 tên `v_keep`/88 hiệu lực + delta 4 payout + update 2 policy `custom_design_requests` (bỏ nhánh `designer_id is null`); §6.11 payout 4 policy; §6.12 `realtime.messages` |
| `docs/security/rls-runbook.md` | Ngày verify + lịch sử 21 bảng → hiện tại 32+2; bảng step 2/3 số đúng (88 hiệu lực/7 storage + 92 toàn chuỗi); §10.6 ghi rõ **ảnh chụp lịch sử 2026-09-12** + số hiện tại; §11 sắp lại #11/#12 đúng thứ tự tên file + ghi chú 31→32 bảng |
| `docs/architecture/system-overview.md` | Diagram 32+2; tree: App.tsx shell 343 + `routes/` + `hooks/` + `components/shell/`, `stores/` (src/stores xoá), LanguageContext VI-only, backend services đúng (catalog/pricing đã xoá; `workshop/` 14 module); migrations 12; **realtime section** trỏ `useCatalogData.ts` + `settingsService` |
| `docs/SETUP_RUNBOOK.md` | §inspect-db 32 bảng; schema paragraph 32+2/19 hàm/9 trigger/92+7; migration tree 12 file thay vì 3 |
| `docs/pages/_routes.generated.md` | **Regenerate**: 30 route, source `src/frontend/routes/AppRoutes.tsx`, `source-sha256 f0bd92f499c9`; path/guard/redirect **không đổi** so với bản cũ |
| `scripts/gen-routes-doc.mjs` | `SOURCE_CANDIDATES = ['src/frontend/routes/AppRoutes.tsx', 'src/App.tsx']` — đọc file mới trước, fallback file cũ nếu chưa có `<Routes>`; output/console ghi rõ nguồn; header có thêm `source:`; giữ nguyên thuật toán parse + tính ổn định |
| `docs/tasks/optimization/04-refactor.md` | Banner: audit là ảnh chụp **trước** Phase 4; thêm **§1.0.1 "Trạng thái SAU Phase 4"** — bảng 7 file LOC hiện tại (App 343, Tool3D 1.057, ModelViewer 869, PricingConfig 985, Group1 755, WorkshopSettings 865, workshopService façade 128) + ghi chú `meshParser` chưa tách |
| `docs/tasks/optimization/README.md` | Phase 6 → **IN PROGRESS** (docs + 71 unit test); TL;DR cập nhật sau Phase 1–5 + follow-up hiện tại |
| `docs/tasks/optimization/PLAN.md` | Header Phase 0–5 DONE / Phase 6 IN PROGRESS; Phase 6 đánh dấu; bảng agent 2/3/4/5 ✅ + 6 🔄; §4 kết quả kỳ vọng → số thực (bundle ~278 kB, 0 file >2.000 LOC, 71 test) |

---

## 3. Routes doc — regen & kiểm chứng

```bash
$ node scripts/gen-routes-doc.mjs
Đã parse 30 route từ src/frontend/routes/AppRoutes.tsx.
Đã ghi docs/pages/_routes.generated.md — 30 route, source-sha256 f0bd92f499c9.
$ node scripts/gen-routes-doc.mjs   # lần 2
Đã parse 30 route … source-sha256 f0bd92f499c9
$ sha256sum docs/pages/_routes.generated.md   # 2 lần giống nhau
f88697c7ef8e61…   # idempotent = YES
$ diff <(git show HEAD:docs/pages/_routes.generated.md | grep '^| `') <(grep '^| `' docs/pages/_routes.generated.md)
# (rỗng) ⇒ 30 path/component/guard/redirect KHÔNG đổi
```

- **Vì sao script cũ fail:** `src/App.tsx` sau Phase 4d không còn khối `<Routes>` (chỉ render
  `<AppRoutes …/>`), nên `node scripts/gen-routes-doc.mjs` trả `RC=1`
  ("không tìm thấy khối <Routes>…</Routes> trong src/App.tsx") trước khi sửa.
- **Fallback:** nếu `AppRoutes.tsx` bị xoá/đổi tên, script tự thử `src/App.tsx` (tương thích ngược
  với tree cũ); nếu cả hai không có `<Routes>` ⇒ `RC=1`, không ghi file.
- Số liệu: **30 route** (23 màn + 7 redirect), khớp `ROUTE-MATRIX.md`; hash đổi
  `48f2f15ebd73` (App.tsx cũ) → **`f0bd92f499c9`** (AppRoutes.tsx).

---

## 4. Gate

| Gate | Kết quả |
|---|---|
| `node scripts/gen-routes-doc.mjs` | **PASS** — 30 route, chạy 2 lần byte-identical |
| `node scripts/run-checks.mjs --only doc-refs --only doc-freshness` (before) | doc-refs **291** [advisory] · doc-freshness **0** |
| … (after) | doc-refs **307** [advisory] · doc-freshness **0** · **không tệ hơn baseline** (`rc=0`) |
| `git diff --stat` scope | Chỉ `AGENTS.md`, `docs/**`, `scripts/gen-routes-doc.mjs` (+ handoff này). Không `src/**`, không `supabase/**`, không `package.json` |
| Lint/build | Không chạy — docs-only (đúng task). `src/**` đang bị agent khác sửa song song nên lint/build sẽ phản ánh trạng thái của họ, không phải phase này |

**Giải trình doc-refs 291 → 307 (+16, advisory):** phần lớn **không** do phase này —
`docs/design/icon-map.md` +7 do agent clean-up song song; handoff này +6 (ví dụ path dạng
glob/lịch sử như nhóm migration 20261011…, thư mục đã xoá — cố ý minh hoạ, không phải link sống);
~3 do câu lệnh đếm trong AGENTS/schema (scanner coi token regex là path) và ref cũ trong thư mục
`docs/plans` (archive). **Không có link markdown chết mới** do phase này thêm: mọi link thật
(`docs/tasks/optimization/…`, `src/frontend/routes/…`, `tests/unit`) đều tồn tại.

---

## 5. Cách đếm — lưu ý để không lặp lại drift

1. **Policy sinh động:** `20261010_harden_rls.sql` tạo phần lớn policy trong `DO` block qua
   `_vcube_make_policy` + `foreach` ⇒ `grep -c 'create policy'` chỉ ra **21** câu literal và
   **sai** số hiệu lực. Đúng: đếm **call** (64) + **vòng lặp** (22 + 2) + **create trực tiếp**
   (2 orders + 4 payout) − 2 policy view bị skip = **92**. Xem bảng ở `AGENTS.md`
   §"Số liệu DB thực tế".
2. **Trigger:** `create trigger` xuất hiện 12 lần nhưng chỉ **9 định nghĩa** (3 lần tái tạo
   `trg_create_profile_for_new_user`, 2 lần `trg_protect_profile_…`); **instance** phải cộng
   vòng lặp `trg_touch_updated_at` (21 bảng) ⇒ ≈29.
3. **View `pricing_config`:** là VIEW (`security_invoker=true`) nên 2 policy cùng tên trong
   allowlist không bao giờ được tạo — đừng dùng "90 policy" như số hiệu lực.
4. **`open_design_requests`:** là VIEW **definer** (`security_invoker=false`) — khác
   `pricing_config`; chỉ phơi cột brief, không PII.
5. **Số liệu live:** Supabase paused ⇒ chưa chạy `scripts/verify-rls.mjs`/`inspect-db.mjs`.
   Sau khi Resume phải chạy lại và đối chiếu 92 + 7 + 1; nếu khác, cập nhật docs + ledger.

---

## 6. Docs còn stale — ngoài phạm vi task (đề nghị Lead xử lý)

| Vị trí | Vấn đề | Đề nghị |
|---|---|---|
| thư mục `docs/plans` (39 file) | Số liệu rất cũ (30 bảng/84 policy), có ref tới `src/stores (đã xoá)/`, `src/app/`… | Đã archive; giữ nguyên (historical), không sửa |
| `docs/tasks/DOCS-REVIEW-BACKLOG.md` | Claim cũ 31 bảng/13 hàm/7 trigger/90 policy (đúng thời điểm viết) | Thêm banner "historical — số hiện tại xem AGENTS.md" hoặc hạ `status=historical` |
| `docs/tasks/as-is/*` | Snapshot 2026-10-19 (32+2 đúng nhưng một số chỗ 31 bảng) | Giữ snapshot; nếu tái dùng phải đối chiếu |
| `docs/tasks/DRIFT-TASKS.md` | Nhắc "88 policy hiệu lực" (đúng cho file hardening, thiếu delta 4 payout) | Ghi chú thêm "toàn chuỗi 92" khi có dịp |
| `docs/pages/*.md` | Một số mô tả page/route có thể chưa cập nhật Phase 4–5 (route file, lazy) | Soát ở phase docs sau; route chuẩn là `_routes.generated.md` |
| `docs/04-refactor.md` thân bài | Số LOC/“god file” cũ | **Cố ý** — audit trước tách; đã có banner + §1.0.1 số hiện tại |
| `README.md` gốc repo | Chưa soát trong task này | Kiểm tra ở phase docs nếu cần |

---

## 7. Checklist tự kiểm

- [x] Không sửa `src/**`, `supabase/**`, `package.json`, không commit.
- [x] 12 migration liệt kê đúng tên + vai trò trong AGENTS.
- [x] Số DB ghi số thực (32/2/19/9/92/7) + cách đếm; cảnh báo `grep -c create policy` sai.
- [x] `pricing_config` = VIEW; `open_design_requests` = VIEW definer — ghi rõ.
- [x] RLS docs: 92/7 + 1 realtime; lịch sử 21 bảng được giữ kèm số hiện tại.
- [x] Routes doc regen: 30 route, hash mới, idempotent, path không đổi.
- [x] Optimization README/PLAN + 04-refactor cập nhật trạng thái Phase 4/6 + LOC thực.
- [x] DoD có `npm run test:unit` (ghi rõ nguồn task-38, đang uncommitted lúc viết docs).
- [x] doc-freshness 0; doc-refs advisory không tăng do link chết mới của phase này.
