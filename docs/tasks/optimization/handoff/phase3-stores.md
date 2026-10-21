<!-- doc-meta: status=active; verified=2026-10-21; owner=admin -->
# HANDOFF — Phase 3b: gom `src/stores` → `src/frontend/stores` (import alias)

> **Work item:** `task-29` · **Agent:** `admin` · **Ngày:** 2026-10-21
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `387e86c` (Phase 1/5/2 đã push)
> **Không commit/push.** **KHÔNG sửa `src/App.tsx`** (agent song song) — App.tsx vốn đã dùng
> `@frontend/stores/*` nên không cần đổi. Không thêm dependency, không đổi route/API/logic store.
>
> ## ✅ VERDICT: **DONE** — 0 import cũ, lint/build PASS, 4 store rename 100% similarity.
> `src/frontend/stores/` là **canonical duy nhất**; `src/stores/` đã không còn tồn tại.

---

## 1. Tóm tắt định lượng

| Hạng mục | Số lượng |
|---|---:|
| Store **move** (rename 100%) | **4** file |
| File **import/comment sửa** | **10** file (4 admin group panels + 3 views + `CartDrawer` + `QuoteSummaryPanel` + `iconMap` comment) |
| Dòng source thay đổi | **14** dòng (`git diff -M --stat`: 13 file content + 1 comment; cộng 4 rename) |
| Import alias `@frontend/stores/*` toàn `src/` | **12** (11 importer + 1 comment-path) |
| Hit còn lại của đường dẫn cũ trong `src/` | **0** |
| Store bị xoá | **0** (kể cả `useProductionStore` — để Phase 4/6 review) |
| API/state/logic store thay đổi | **0** |

---

## 2. Bảng move (`git mv`, similarity 100%)

| # | Old path | New path | Nội dung |
|---|---|---|---|
| 1 | `src/stores/useCustomerAdminStore.ts` | `src/frontend/stores/useCustomerAdminStore.ts` | chỉ đổi depth import (1 dòng) |
| 2 | `src/stores/useDesignerAdminStore.ts` | `src/frontend/stores/useDesignerAdminStore.ts` | chỉ đổi depth import (1 dòng) |
| 3 | `src/stores/useProductionStore.ts` | `src/frontend/stores/useProductionStore.ts` | **pure rename**, không có import tương đối |
| 4 | `src/stores/useWorkshopAdminStore.ts` | `src/frontend/stores/useWorkshopAdminStore.ts` | chỉ đổi depth import (2 dòng) |

`git diff --cached -M --summary`:

```text
rename src/{ => frontend}/stores/useCustomerAdminStore.ts (100%)
rename src/{ => frontend}/stores/useDesignerAdminStore.ts (100%)
rename src/{ => frontend}/stores/useProductionStore.ts (100%)
rename src/{ => frontend}/stores/useWorkshopAdminStore.ts (100%)
```

### 2.1 Import tương đối **bên trong** store đã move (chỉ depth, không đổi target)

| File | Trước | Sau |
|---|---|---|
| `useCustomerAdminStore.ts` | `from '../backend/supabase/client'` | `from '../../backend/supabase/client'` |
| `useDesignerAdminStore.ts` | `from '../backend/supabase/client'` | `from '../../backend/supabase/client'` |
| `useWorkshopAdminStore.ts` | `from '../backend/supabase/client'` | `from '../../backend/supabase/client'` |
| `useWorkshopAdminStore.ts` | `from '../types'` | `from '../../types'` |
| `useProductionStore.ts` | *(không có import tương đối — chỉ `zustand`)* | — |

---

## 3. Importer → alias ổn định (`@frontend/stores/*`)

| # | File | Trước | Sau |
|---|---|---|---|
| 1 | `components/admin/groups/Group1WorkshopsPanel.tsx` | `'../../../../stores/useWorkshopAdminStore'` | `'@frontend/stores/useWorkshopAdminStore'` |
| 2 | `components/admin/groups/Group2DesignersPanel.tsx` | `'../../../../stores/useDesignerAdminStore'` | `'@frontend/stores/useDesignerAdminStore'` |
| 3 | `components/admin/groups/Group3CustomersPanel.tsx` | `'../../../../stores/useCustomerAdminStore'` | `'@frontend/stores/useCustomerAdminStore'` |
| 4 | `components/admin/groups/Group5ProductionPanel.tsx` | `} from '../../../../stores/useProductionStore';` | `} from '@frontend/stores/useProductionStore';` |
| 5 | `components/CartDrawer.tsx` | `'../stores/useCartStore'` | `'@frontend/stores/useCartStore'` |
| 6 | `components/tool3d/QuoteSummaryPanel.tsx` | `'../../stores/useUIStore'` | `'@frontend/stores/useUIStore'` |
| 7 | `views/CartView.tsx` | `'../stores/useCartStore'` | `'@frontend/stores/useCartStore'` |
| 8 | `views/CheckoutView.tsx` | `'../stores/useCartStore'` | `'@frontend/stores/useCartStore'` |
| 9 | `views/ExploreView.tsx` | `'../stores/useCartStore'` | `'@frontend/stores/useCartStore'` |

**Đã đúng alias từ trước, KHÔNG sửa:** `src/App.tsx:53-54` (`@frontend/stores/useCartStore`,
`useUIStore` — theo yêu cầu không đụng file của agent song song) và
`src/frontend/lib/reportError.ts:16` (`@frontend/stores/useUIStore`).

### 3.1 Một chỉnh sửa **comment-only** (ngoài danh sách importer, cần cho gate grep = 0)

`src/frontend/ui/iconMap.ts:8` có doc-comment cũ trỏ `src/stores/useProductionStore.ts`.
Đã đổi thành mô tả không chứa path cũ:

```diff
- *   vậy được: các object trong `src/data/mockData.ts` và `src/stores/useProductionStore.ts`
+ *   vậy được: các object trong `src/data/mockData.ts` và store sản xuất (`useProductionStore`)
```

Lý do: gate literal `grep -rn "src/stores\|…" src/` = 0; đây **không phải import**, không đổi
hành vi/type — chỉ là path reference đã stale sau khi move. Nếu Lead muốn giữ path đầy đủ thì
có thể viết `src/frontend/stores/useProductionStore.ts`, nhưng khi đó gate
`grep "stores/use" | grep -v "@frontend/stores"` sẽ còn 1 hit (comment).

---

## 4. Gate & bằng chứng

| Gate | Lệnh | Kết quả |
|---|---|---|
| Thư mục cũ | `ls src/stores` | `No such file or directory` ✓ |
| Không còn path cũ | `grep -rn "src/stores\|\.\./\.\./\.\./\.\./stores/\|\.\./\.\./stores/" src/ --include=*.ts --include=*.tsx` | **0 hit** (rc=1) ✓ |
| Không còn import tương đối | `grep -rn "stores/use" src/ --include=*.ts --include=*.tsx \| grep -v "@frontend/stores"` | **0 hit** (rc=1) ✓ |
| Alias hợp lệ | `grep -rn "@frontend/stores/" src/ --include=*.ts --include=*.tsx` | **12 hit** (11 importer + 1 comment-path), tất cả resolve đúng |
| Typecheck | `npm run lint` | **PASS** (`tsc --noEmit`, 0 lỗi) |
| Build (isolated) | `npx vite build --outDir dist-ssr/p3b --emptyOutDir` | **PASS** — `✓ built in 4.69s`, ghi vào `dist-ssr/p3b/` (**không ghi `dist/`**) |
| `dist/` không bị đụng | `git status --short \| grep dist` | 0 thay đổi; `dist/` giữ nguyên build chính thức trước đó |
| Git status | `git status --short` | **4 rename** (`R`/`RM`, similarity 100%) + **10 file ` M`** (9 importer + 1 comment) — xem §5 |

Build output chính (tham chiếu): `index-BZir70ko.js 691.05 kB gzip 185.11 kB`,
`three-vendor 531.66 kB`, `Tool3DView 351.50 kB`, `Group4PricingEnginePanel 163.26 kB`.
Build PASS chứng minh alias `@frontend` resolve đúng trong cả tsc lẫn Vite (không chỉ tsc paths).

---

## 5. Trạng thái git (không commit)

```text
 M src/frontend/components/CartDrawer.tsx
 M src/frontend/components/admin/groups/Group1WorkshopsPanel.tsx
 M src/frontend/components/admin/groups/Group2DesignersPanel.tsx
 M src/frontend/components/admin/groups/Group3CustomersPanel.tsx
 M src/frontend/components/admin/groups/Group5ProductionPanel.tsx
 M src/frontend/components/tool3d/QuoteSummaryPanel.tsx
RM src/stores/useCustomerAdminStore.ts -> src/frontend/stores/useCustomerAdminStore.ts
RM src/stores/useDesignerAdminStore.ts -> src/frontend/stores/useDesignerAdminStore.ts
R  src/stores/useProductionStore.ts -> src/frontend/stores/useProductionStore.ts
RM src/stores/useWorkshopAdminStore.ts -> src/frontend/stores/useWorkshopAdminStore.ts
 M src/frontend/ui/iconMap.ts
 M src/frontend/views/CartView.tsx
 M src/frontend/views/CheckoutView.tsx
 M src/frontend/views/ExploreView.tsx
```

- 4 rename đang ở **staged** (do `git mv`); 10 chỉnh sửa import/comment ở **unstaged**.
  Đây là trạng thái lai bình thường của `git mv` + edit — **không commit**, khi Lead/integrator
  commit thì `git add -A` sẽ gộp đúng thành 4 rename + sửa import-line.
- Không thay đổi file nào ngoài danh sách trên; không có file mới trong repo (`dist-ssr/` gitignored).
- **Lưu ý:** khi kiểm `git status` lúc bàn giao còn thấy ` M src/App.tsx` — đó là thay đổi của
  **agent song song** (task này **không** sửa App.tsx theo đúng yêu cầu). Diff của Phase 3b chỉ gồm
  14 mục ở trên + file handoff này.

---

## 6. Rủi ro & việc còn lại

| # | Mức | Nội dung | Đề xuất |
|---|---|---|---|
| 1 | Thấp | **Docs còn nhắc path cũ** `src/stores`: `docs/design/icon-map.md:380`, `docs/design/data-honesty.md` (nhiều dòng AD-xx là **bằng chứng audit lịch sử**), `docs/plans/**` (archive). Không phải import, ngoài write-scope task này. | Docs/integrator pass riêng (Phase 3 docs hoặc Phase 6). Không ảnh hưởng build/runtime |
| 2 | Thấp | Trạng thái git lai staged/unstaged (§5) | Người commit dùng `git add -A`; không `git reset` mù sẽ mất detect rename |
| 3 | Thấp | `dist-ssr/p3b/` (≈11 MB, gitignored) còn trên đĩa để QA/verifier đối chiếu | Có thể `rm -rf dist-ssr/p3b` nếu không cần; không ảnh hưởng git |
| 4 | Rất thấp | Không có barrel `src/frontend/stores/index.ts` — importer vẫn trỏ từng file | Giữ nguyên (không thêm API/abstraction trong task move thuần) |
| 5 | Rất thấp | `useCartStore` có `persist` — key localStorage không phụ thuộc đường dẫn file | Không cần migration; đã build+typecheck xác nhận |
| 6 | Rất thấp | `useProductionStore` vẫn còn dù hiện ít/không dùng (dead-store review Phase 4/6) | Không xoá theo đúng yêu cầu task |
| 7 | — | **Không đụng `src/App.tsx`** (agent song song); App.tsx đã alias đúng | Không có xung đột write-scope |

---

## 7. Lệnh tái lập / kiểm tra nhanh

```bash
cd /home/thanh/home/thanh/project/Vcube

# 1) cấu trúc canonical + không còn thư mục cũ
ls src/frontend/stores   # 6 file: useCart/useCustomerAdmin/useDesignerAdmin/useProduction/useUI/useWorkshopAdmin
ls src/stores            # No such file or directory

# 2) 0 import/path cũ
grep -rn "src/stores\|\.\./\.\./\.\./\.\./stores/\|\.\./\.\./stores/" src/ --include=*.ts --include=*.tsx   # rc=1
grep -rn "stores/use" src/ --include=*.ts --include=*.tsx | grep -v "@frontend/stores"                          # 0 dòng

# 3) mọi import store đều alias
grep -rn "@frontend/stores/" src/ --include=*.ts --include=*.tsx

# 4) gate build
npm run lint
npx vite build --outDir dist-ssr/p3b --emptyOutDir

# 5) trạng thái
git status --short
git diff --cached -M --summary
```
