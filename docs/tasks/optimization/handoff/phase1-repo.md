<!-- doc-meta: status=active; verified=2026-10-21; owner=ui-auditor -->
# HANDOFF — Phase 1 (repo hygiene): stale tests/config/deps/lock

> **Work item:** `task-20` · **Agent:** `ui-auditor` · **Ngày:** 2026-10-21
> **Trạng thái:** DONE. Không commit/push. Không sửa `src/**`, `scripts/**`, `supabase/**`, `.env`.
> **Snapshot:** `HEAD aaff7c4` (không đổi trong phiên); cây làm việc **sau khi task-18/task-19 hoàn tất**
> (gates chạy lại lần cuối lúc 10:4x — xem §4).
> Đọc kèm: `docs/tasks/optimization/DEAD-CODE.md` (D19–D24, D26–D28), `AUDIT.md`.

---

## 1. Đã xoá

### 1.1 Test / config / artifact chết (D19–D24)

| ID | File / thư mục | Kích thước trước xoá | sha256 (16 ký tự) | Bằng chứng 0-ref trước khi xoá |
|---|---|---:|---|---|
| D19 | `test-pricing.ts` | 18.554 B (357 LOC) | `da68c194610525ee` | import `./src/backend/services/pricingEngineService` + `./src/backend/services/quoteVerifier` — **cả hai file không tồn tại** (`ls` → No such file); 0 script/npm task gọi |
| D20 | `tests/unit/`, `tests/adversarial/` | 0 file | — | `find tests -type f` = **0**; chỉ là thư mục rỗng |
| D21 | `firebase-applet-config.json` | 560 B | `4d908bb9b2964e14` | 0 import; Firebase không còn trong `package.json` |
| D22 | `firestore.rules` | 1.453 B | `dca3e363bbb9219a` | 0 import |
| D23 | `metadata.json` | 239 B | `7d634552df94e76f` | scaffold AI Studio; 0 import |
| D24 | `assets/.aistudio/.gitignore` | 2 B | `cdbcae15105d6b78` | 0 ref; sau khi xoá `.aistudio`, `assets/` rỗng ⇒ xoá luôn thư mục cha (không còn file tracked) |
| D26 | `bun.lock` | 112.685 B (112 KB) | `86c8eb2c6701e51a` | repo dùng npm/`package-lock.json`; xem §2.3 |

**Tổng xoá:** 6 file tracked + 2 thư mục rỗng + 1 lockfile (≈132 KB, 357 LOC test chết).

### 1.2 Dependency chết (D27–D28)

| ID | Package | Vị trí | Bằng chứng 0-use | Hành động |
|---|---|---|---|---|
| D27 | `dotenv` | `dependencies` | `grep -rn "dotenv" --include={ts,tsx,mjs,js,json,cjs}` (bỏ `node_modules`) = **chỉ** `package.json` + `package-lock.json`; 0 import trong `src/`, `scripts/`, `vite.config.ts`, `vite.config.*`; app dùng `import.meta.env` | xoá khỏi `dependencies` |
| D28 | `autoprefixer` | `devDependencies` | `grep` tương tự = **chỉ** `package.json` + `package-lock.json`; **không có** `postcss.config.*`, `tailwind.config.*`, `.postcssrc*`; Tailwind 4 dùng `@tailwindcss/vite` | xoá khỏi `devDependencies` |

---

## 2. Đã sửa (2 file, không có thay đổi source)

### 2.1 `package.json` (diff: **−2 dòng**, 0 dòng thêm)

```diff
   "dependencies": {
     ...
     "canvas-confetti": "^1.9.4",
-    "dotenv": "^17.2.3",
     "jszip": "^3.10.1",
   "devDependencies": {
     ...
     "@types/three": "^0.185.4",
-    "autoprefixer": "^10.4.21",
     "esbuild": "^0.25.0",
```

Kết quả: `dependencies` 14 → 13, `devDependencies` 11 → 10. JSON parse OK.

### 2.2 `package-lock.json` — prune tối thiểu (72 dòng xoá, **0 dòng thêm**)

- Xoá root entries: `packages[""].dependencies.dotenv`, `packages[""].devDependencies.autoprefixer`.
- Xoá entry riêng: `node_modules/dotenv`, `node_modules/autoprefixer`.
- Xoá 2 entry transitive **chỉ** autoprefixer dùng (đã kiểm tra 0 ref ở mọi field `dependencies`/
  `devDependencies`/`peerDependencies`/`optionalDependencies`): `node_modules/fraction.js`,
  `node_modules/postcss-value-parser`.
- **Không** đụng package khác. Đã kiểm: 4 tên trên có `refs=[]` và `own_entry=False` sau prune.
- **Vì sao prune tay:** `npm install --package-lock-only` (npm 11) rewrite thêm 41 dòng không liên quan
  (re-resolve optional bundle `@tailwindcss/oxide-wasm32-wasi` + bỏ `"peer": true`) ⇒ đã restore lock gốc
  từ backup và chỉ prune đúng phần liên quan để diff review sạch.

**Bằng chứng lock ⇄ package.json đồng bộ:**

```text
$ npm ci --dry-run --ignore-scripts --no-audit --no-fund
removed 4 packages in 357ms
remove postcss-value-parser 4.2.0
remove fraction.js 5.3.4
remove dotenv 17.4.2
remove autoprefixer 10.5.4
EXIT=0
```

### 2.3 `bun.lock` — đã xoá, npm là lockfile duy nhất

- Repo có `package-lock.json` (112.643 B) + toàn bộ script dùng npm; không có `.github/` CI, không yarn/pnpm lock.
- `scripts/dev/new-worktree.sh:118-125` **ưu tiên `package-lock.json` trước**, `bun.lock` chỉ là nhánh
  fallback ⇒ sau khi xoá, script tự đi nhánh `npm ci`; **không cần sửa script** (và script ngoài scope task này).
- `README.md:10` còn câu “theo lockfile có trong repo (`package-lock.json` → `npm`, `bun.lock` → `bun`)”
  ⇒ **stale**, đề nghị docs owner cập nhật (xem §6).

---

## 3. Không đụng (đúng ràng buộc)

| Mục | Trạng thái |
|---|---|
| `.playwright-mcp/` | **giữ nguyên** (3.9 MB, gitignored; không commit) |
| `.env` | **giữ nguyên** (không đọc/ghi nội dung) |
| `src/**`, `scripts/**`, `supabase/**` | **0 chỉnh sửa** bởi task này |
| `node_modules/` | không xoá thủ công; còn bản cũ `dotenv`/`autoprefixer` cục bộ (untracked) tới lần `npm ci` kế tiếp |
| `tests/` (thư mục cha) | giữ lại **rỗng** (local, git không track) để đợt “thay test thật” (optimization PLAN) đặt test vào |

---

## 4. Gates (chạy lại lần cuối trên cây đã ổn định — sau khi task-18/task-19 DONE)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (exit 0, `tsc --noEmit`) |
| Build | `npm run build` | **PASS** (exit 0, `✓ built in 5.74s`) |
| Offline checks | `node scripts/run-checks.mjs --only check-...` (7 gate, xem dưới) | **PASS** — 7/7 `[ OK ]`, `KẾT QUẢ: KHÔNG TỆ HƠN BASELINE` |

Ghi chú: `--only` của `run-checks.mjs` so khớp **ID chính xác**, không nhận glob `check-*`, nên đã liệt kê đủ 7 gate:

```bash
node scripts/run-checks.mjs \
  --only check-contrast-combos --only check-contrast \
  --only check-error-handling --only check-fabricated \
  --only check-icon-names --only check-ui-rules \
  --only check-unitprice-multiplier
# [ OK ] ×7 · KẾT QUẢ: KHÔNG TỆ HƠN BASELINE
```

**Lưu ý lịch sử chạy:** lần chạy đầu (10:33) `npm run lint` **fail** vì `task-19` đang xoá shim
`src/frontend/{types,data,utils}` trong lúc call-site chưa cập nhật (trạng thái trung gian của agent khác,
không phải thay đổi của task-20). Sau khi task-19 hoàn tất (shim được giữ làm re-export bridge, `git diff` =
unchanged vs HEAD), lint/build/checks đều **xanh**. Không có lỗi nào do thay đổi package/deps của task-20.

---

## 5. `git status` — đối chiếu phạm vi

**Thay đổi thuộc task-20 (8 mục + handoff):**

```text
 D assets/.aistudio/.gitignore
 D bun.lock
 D firebase-applet-config.json
 D firestore.rules
 D metadata.json
 D test-pricing.ts
 M package.json
 M package-lock.json
?? docs/tasks/optimization/handoff/phase1-repo.md   (file này)
```

**Thay đổi khác trong cây** (thuộc `task-18` backend + `task-19` UI, không phải task-20 — ghi để Lead đối chiếu):
`D src/backend/{index.ts,services/catalogService.ts,services/pricingService.ts,supabase/seedService.ts}`,
`M src/backend/supabase/{client.ts,database.ts}`, `M src/types/index.ts`, `M src/data/mockData.ts`,
`D src/frontend/ui/{Section,Toolbar,ToastViewport}.tsx`, `M src/frontend/ui/{iconMap.ts,index.ts}`,
`M docs/design/icon-map.md`, `M docs/tasks/optimization/04-refactor.md`, `?? docs/tasks/optimization/03-resources.md`,
`?? docs/tasks/optimization/handoff/phase1-{ui,backend}.md`.

**Xác nhận:** 0 file `src/**` bị task-20 sửa; `HEAD` vẫn `aaff7c4` (không commit/push).

---

## 6. Rủi ro / follow-up

| # | Mức | Vấn đề | Đề xuất |
|---|---|---|---|
| 1 | Thấp | `README.md:10` còn nhắc `bun.lock` ⇒ stale sau khi xoá | docs owner sửa thành “npm/`package-lock.json` (duy nhất)” |
| 2 | Thấp | `node_modules/` cục bộ còn `dotenv`/`autoprefixer` tới lần `npm ci` sau | chạy `npm ci` (hoặc `npm prune`) ở máy dev/CI; không ảnh hưởng repo |
| 3 | Thấp | Môi trường ngoài từng dùng `bun install` phải chuyển npm | `scripts/dev/new-worktree.sh` đã tự fallback `npm ci`; ghi vào release note |
| 4 | Thấp | `package-lock` prune tay (không phải npm re-resolve) | đã validate `npm ci --dry-run` exit 0; nên chạy `npm ci` thật trong CI/lần build sạch |
| 5 | — | `tests/` hiện rỗng (chưa có test thật) | thuộc scope “thay `test-pricing.ts` bằng test thật” của optimization PLAN, không phải Phase 1 |

**Không có blocker.** Không xoá gì ngoài danh sách D19–D24/D26–D28; không đụng `.playwright-mcp`/`.env`.
