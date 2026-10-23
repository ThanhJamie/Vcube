<!-- doc-meta: status=active; verified=2026-10-23; owner=admin -->
# HANDOFF — Architecture & clean-code plan (`task-48`)

> **Deliverable:** `docs/tasks/world-class/CODE-ARCHITECTURE.md` (plan đầy đủ) + file này.
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `579ef55` · **Ngày:** 2026-10-23
> **Chế độ:** plan-only — **không sửa `src/**`**, không commit/push, không thêm dependency.
> Số liệu trong plan **đo thật** trên HEAD (lệnh tái lập ở `CODE-ARCHITECTURE.md` §11); effort là ước lượng.

---

## 1. Tóm tắt

Plan hạ nợ kiến trúc **theo ROI để mở rộng feature**, không phải dọn code thuần tuý. Định hướng:
**feature-sliced** (9 domain) + **shared** + **backend/{domain,repositories,integrations,rpc}** + **server boundary bằng Postgres RPC**
cho các flow tiền, kèm **CI + guardrails** chặn tái phát. Lộ trình **CA-0..CA-5 ≈36 dev-day** (~7 tuần 1 dev,
~4 tuần 2 dev), chạy ≤20% capacity song song feature, 2 cửa sổ freeze 1 tuần.

---

## 2. 5 nợ kiến trúc nghiêm trọng nhất

| # | Nợ | Bằng chứng | Vì sao nghiêm trọng |
|---|---|---|---|
| 1 | **Không có server boundary cho flow tiền** — xác nhận thanh toán/tạo đơn là client-side nhiều bước + compensation | `orderService.ts:259` (“client-side, KHÔNG atomic — server-side atomic là FL-7”); ghi 4 bảng `:394/419/462/492`; compensation `:421-422/464-466/511-514`; `createOrder` id ngẫu nhiên `:56`; `database.ts:248` chỉ insert 1 bảng | FL-4/5/6/7 đều phải viết compensation mới; 1 lỗi mạng = đơn “mồ côi”; đối soát/refund không có điểm commit tin cậy |
| 2 | **Không CI + không luật phụ thuộc** | `.github/workflows` không tồn tại; 19 gate trong `gate-manifest.json` chạy tay; không ESLint/import-boundary/max-lines/any-budget | Nợ tái tạo ngay khi thêm feature; refactor không lưới an toàn; review bằng mắt |
| 3 | **UI gọi thẳng DB/backend** | **41** `dbService.*` trong frontend / 12 file; **20** file frontend import `backend/supabase`; **31** file import `backend/services`; `AuthContext` 10 call `supabase.*` | Khó test (phải mock DB), khó đổi nguồn (RPC/cache), UI biết schema; bug loop `f5d3a1d` là hệ quả trực tiếp |
| 4 | **Type god-file + hợp đồng phân tán** | `types/index.ts` **988 dòng / 41 export**; `orderRecords.ts` tách ad-hoc (chính comment ghi vì xung đột workstream); **142 `: any` + 60 `as any`** (top `database.ts` 24) | Thêm field/tiền phải sửa file chung ⇒ conflict; DB↔domain↔UI không single-source; `any` xoá lợi ích TS ở đúng chỗ tiền |
| 5 | **God-file + test pyramid lệch** | **21 file >800** (meshParser **1.878**, Explore/Home ~1.43k, OnboardingWizard 1.425, Group5 1.259, Group3 1.214); views **11.754** dòng; `ui/DataTable` 854; test: **105 unit / 0 component / 1 e2e ngoài CI** | Feature chạm Home/parser/admin phải sửa file khổng lồ; review/merge conflict; hành vi tiền/parser không được bảo vệ đủ |

**Bằng chứng “feature đắt”:** FL-1 (`579ef55`) chạm **18 file / +3.211 dòng** ở 7 tầng; FL-2a (`c6d28f0`) chỉ **6 file / +1.050** — vì đã đi qua adapter `fileStorage`/`assetService`. Mục tiêu plan: mọi domain có seam như FL-2a.

**Snapshot khác (đo):** 212 file / 68.817 LOC; import cycle **0** (giữ 0); UI barrel 112 import / 0 deep; 6 Zustand store / 1.455 dòng (2 store gọi DB trực tiếp); 98 `console.*`, `reportError` **1** consumer; realtime **3** nơi; bundle initial **284.376 B gzip**; lint **9,32 s**, build **5,85 s**, 10 offline gate **1,82 s**, unit **0,75 s**; coverage module được test **65,06% line / 80,83% branch**; Edge `calculate-quote` 154 dòng **0 client invoke**.

---

## 3. Cấu trúc đích (1 đoạn)

`src/app` (bootstrap/router/shell) → `src/features/<domain>/{ui,model,api,lib}` cho 10 domain (catalog, product-detail, personalize, quote, checkout, orders, designer, workshop, admin, account) → `src/shared/{ui,lib,types,config,telemetry,three}` → `src/backend/{domain,repositories,integrations,rpc}` (không React). **Luật:** feature chỉ phụ thuộc `shared`/`backend` (cấm feature↔feature trừ contract trong `shared/types`); **UI không được import Supabase/dbService** (chỉ feature `api` → repository/adapter); mọi flow ghi nhiều bảng đi qua **RPC Postgres atomic** (Edge chỉ cho webhook/secret ở FL-7); state: server-state = query-hook 1 owner/entity, client-state = Zustand theo feature, realtime = 1 registry; type: `shared/types` primitives (≤300 dòng) + `features/*/model/types` + `backend/repositories/*Rows`, no-new-`any`; migrations + tests + CI + ADR (`docs/adr/`) là một phần của definition-of-done.

---

## 4. Lộ trình CA-0..CA-5 (tóm tắt; chi tiết + DoD/risks ở doc chính §4)

| Bước | Nội dung | Effort | Metric chính before→after |
|---|---|---:|---|
| **CA-0** | CI skeleton + 4 guard script (import-boundary/max-lines/any-budget/no-supabase-in-UI) + baseline grandfather + ADR khung | **3 d** | CI 0→1; gate 19→23; nợ mới =0; PR ≤3 phút |
| **CA-1** | Tách `types/index.ts` (988/41) → `shared/types` + `features/*/model/types` + `*Rows`; contract/mappers test | **5 d** | types god →≤300 dòng/≤20 export; `: any` 142→≤110 |
| **CA-2** | Pilot feature folders: **orders/checkout**, **designer**, **workshop** (strangler, re-export tạm) | **7 d** | UI→supabase 20→≤8; dbService frontend 41→≤15; view god ≤600 |
| **CA-3** | **Server boundary RPC**: `create_order_atomic`, `confirm_payment_atomic`, `OrderGateway` + flag/shadow/cutover; xoá compensation | **6 d** | multi-write client 1→0; compensation 3→0; e2e atomic 0→2; write 4→1 RPC |
| **CA-4** | Dọn god-file còn lại (meshParser, Home/Explore, OnboardingWizard, Group3/5, DataTable) + inline dbService → 0 | **9 d** | file >800 21→≤5; max 1.878→≤800 (mục tiêu 600); dbService frontend →0 |
| **CA-5** | Hardening: telemetry, env/config single source, realtime registry, ADR đầy đủ, xoá dead Edge, coverage gate | **6 d** | console 98→≤20; env 2→1; realtime 3→1; coverage ≥75% |

Tổng **≈36 dev-day**; dependencies: CA-0 → CA-1 → CA-2 (3 nhánh song song) → CA-3/CA-4 → CA-5.

---

## 5. 5 việc làm ngay (2 tuần đầu)

1. **CI offline** (`.github/workflows/ci.yml`: lint → unit+coverage artifact → 10 offline gate → build-size budget) — ~0,5 ngày.
2. **4 guard script + baseline** (`check-import-boundaries`, `check-max-lines`, `check-any-budget`, `check-no-supabase-in-ui`; grandfather có `why/owner/expiry`) + khai báo `gate-manifest.json` — ~1,5 ngày.
3. **Chốt ADR-001..005 + freeze** `types/index.ts`/`dbService` cho feature mới — ~0,5 ngày.
4. **Tách types pilot orders/quote** (`shared/types` + `features/{orders,quote}/model/types`; cập nhật mapper tests) — ~2–3 ngày.
5. **Thiết kế + viết RPC atomic** `create_order_atomic`/`confirm_payment_atomic` + adapter `OrderGateway` sau feature flag (chưa cutover khi chưa có shadow evidence) — ~2–3 ngày.

---

## 6. Quyết định cần Lead chốt (để không chặn CA-0/CA-3)

| # | Quyết định | Đề xuất |
|---|---|---|
| Q1 | Cho phép **migration mới** cho RPC atomic (thay vì sửa 12 file cũ)? | Có — file mới theo thứ tự tên, hoặc sửa `check_constraints` nếu muốn giữ 12 file |
| Q2 | Bật **GitHub Actions** + secrets cho e2e nightly? | Có — dùng project Supabase test riêng nếu có; rotate secrets |
| Q3 | Thêm **devDeps** component test (`@testing-library/react`+`jsdom`) ở CA-2? | Chưa cần: CDP smoke no-dep trước; quyết định ở ADR-008 |
| Q4 | **Grandfather nợ cũ** (21 file >800, 20 UI→supabase, 142 any) có thời hạn? | Có — expiry 3 sprint; gate không cho tăng |
| Q5 | 2 **feature-freeze windows** (CA-3 migration, CA-4 meshParser)? | Có — 1 tuần mỗi cửa sổ, thông báo trước 1 tuần |
| Q6 | Edge `calculate-quote` (154 dòng, 0 client invoke)? | **Xoá** nếu giá vẫn client; nối khi làm server-side pricing (ADR-003) |

---

## 7. Risks & giới hạn của plan

| # | Rủi ro | Giảm thiểu |
|---|---|---|
| 1 | Migration/refactor ảnh hưởng production | Strangler + feature flag + shadow/cutover staging→prod; rollback plan trong DoD CA-3; e2e live trước cutover |
| 2 | Conflict khi nhiều workstream chạm file chung (`types/index.ts`, `database.ts`) | Freeze ngắn + chuyển theo feature; re-export tạm; merge window; baseline gate theo diff |
| 3 | Baseline gate bị “vá” tuỳ tiện | Mỗi entry baseline có `why/owner/expiry`; review 2 tuần/lần; budget chỉ giảm |
| 4 | Effort ước lượng có thể lệch | Timebox từng item; >1,5× ⇒ dừng/tách; đo lại sau CA-0/CA-2 và cập nhật plan |
| 5 | RPC `SECURITY DEFINER` sai = lỗ hổng | Review SQL + test RLS theo role (anon/owner/admin/lab/designer); dùng `auth.uid()`/`current_app_role()`; không nhận amount từ client (RPC tự tính/đọc snapshot) |
| 6 | Thêm devDeps làm chậm | Mặc định no-dep (node:test/tsx/CDP); ADR-008 quyết định từng dependency |
| 7 | Số đo coverage hiện tại chỉ trên module được test (không phải toàn repo) | CA-0 thiết lập coverage baseline đầy đủ (import all modules + e2e) trước khi đặt ngưỡng cứng |
| 8 | Kế hoạch dựa trên HEAD `579ef55`; nếu FL-2b..FL-6 merge trước thì số đo thay đổi | Chạy lại §11 commands ở CA-0; cập nhật baseline (không đổi định hướng) |

**Ghi chú read-only:** không sửa file `src/**`; chỉ tạo 2 file docs. Build đo dùng `dist-ssr/arch-baseline` (gitignored, đã đo xong; có thể `rm -rf dist-ssr/arch-baseline` nếu không cần). Các thay đổi khác trong working tree (nếu có) không phải của task này.

---

## 8. Đọc nhanh

- Plan đầy đủ: [`docs/tasks/world-class/CODE-ARCHITECTURE.md`](../../world-class/CODE-ARCHITECTURE.md)
- Bối cảnh sản phẩm: [`docs/tasks/world-class/PLAN.md`](../../world-class/PLAN.md)
- Gate hiện tại: `scripts/gate-manifest.json` · `npm run check`
- Bằng chứng FL-1: `docs/tasks/optimization/handoff/fl1-order-flow.md`
