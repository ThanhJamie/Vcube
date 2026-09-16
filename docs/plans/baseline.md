> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# Baseline — số đo trước khi refactor

Đo trên WSL2 (`Ubuntu-24.04`), repo `/home/thanh/projects/Vcube`, bằng toolchain Linux (không dùng Node trên Windows).

| Mục | Giá trị |
|---|---|
| Ngày đo | Trước khi bắt đầu Phase 1 |
| `git rev-parse HEAD` | `541023b` (nhánh hiện tại) |
| Trạng thái git | có thay đổi chưa commit: `package.json`, `package-lock.json`, `tsconfig.json`, `src/backend/services/quoteVerifier.ts`, thêm mới `.gitattributes`, `AGENTS.md`, `scripts/check-contrast.mjs`, `docs/` |
| Node / npm | (ghi khi thi công) |
| Dev server | `http://localhost:3000` → HTTP 200 |

## 1. Gate

| Lệnh | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS** — exit 0, không output |
| `npm run build` (`vite build`) | **PASS** — 187 modules, 2.66s, exit 0 |

## 2. Bundle (`dist/`) — build local, `dist/` không commit (đã trong `.gitignore`)

| Chunk | Thô | Gzip | Ghi chú |
|---|---|---|---|
| `index-*.js` | 717.35 KB | **188.65 KB** | entry |
| `three-vendor-*.js` | 531.66 KB | **133.90 KB** | **đang được `modulepreload`** |
| `supabase-vendor-*.js` | 221.01 KB | 57.80 KB | **đang được `modulepreload`** |
| `Tool3DView-*.js` | 311.01 KB | 89.65 KB | lazy (tốt) |
| `index-*.css` | 148.65 KB | **22.60 KB** | |
| `react-vendor-*.js` | 51.52 KB | 18.21 KB | preload |
| `Group4PricingEnginePanel-*.js` | 113.60 KB | 20.37 KB | lazy |
| `DesignerDashboardView-*.js` | 55.59 KB | 11.97 KB | lazy |
| `AdminDashboardView-*.js` | 38.25 KB | 11.68 KB | lazy |
| `Group1WorkshopsPanel-*.js` | 39.75 KB | 7.99 KB | lazy |
| `Group3CustomersPanel-*.js` | 37.49 KB | 9.27 KB | lazy |
| `Group2DesignersPanel-*.js` | 33.80 KB | 8.45 KB | lazy |
| `Group5ProductionPanel-*.js` | 33.20 KB | 7.81 KB | lazy |
| `AdminStorefrontPanel-*.js` | 25.26 KB | 4.71 KB | lazy |
| `Group0OverviewPanel-*.js` | 22.70 KB | 6.45 KB | lazy |
| `useProductionStore-*.js` | 20.75 KB | 6.36 KB | lazy |
| `AdminSeoPanel-*.js` | 20.75 KB | 5.13 KB | lazy |
| `AdminProductsPanel-*.js` | 18.43 KB | 4.36 KB | lazy |
| `useWorkshopAdminStore-*.js` | 11.92 KB | 3.31 KB | lazy |
| `pricingEngine-*.js` | 7.90 KB | 3.76 KB | lazy |
| `AdminSettingsPanel-*.js` | 5.67 KB | 1.75 KB | lazy |
| `cadParser.worker-*.js` | 3.55 KB | — | worker |

**Critical path (modulepreload + CSS):** 188.65 + 133.90 + 57.80 + 18.21 + 22.60 = **421.16 KB gzip**.
`dist/index.html` preload: `react-vendor`, `supabase-vendor`, `three-vendor`.

## 3. Chất lượng mã (đếm bằng grep)

| Chỉ số | Giá trị | Lệnh |
|---|---|---|
| Hex cứng trong `className` | 5.307 | `grep -rhoE '\[#[0-9a-fA-F]+' src --include='*.tsx' \| wc -l` |
| Hex thô toàn `src` | 5.569 | `grep -rhoE '#[0-9a-fA-F]{6}' src \| wc -l` |
| Utility tuỳ ý `[...]` | 6.645 | `grep -rhoE '\[[^]]+\]' src --include='*.tsx' \| wc -l` |
| `[Npx]` | 1.350 | `grep -rhoE '\[[0-9]+px\]' src --include='*.tsx' \| wc -l` |
| Chữ < 12px | 1.238 | `grep -rhoE 'text-\[[0-9]+px\]\|text-\[1[01]px\]' src --include='*.tsx' \| wc -l` |
| File dùng `dark:` | 0 | `grep -rl 'dark:' src --include='*.tsx' \| wc -l` |
| Khối `@theme` | 0 | `grep -rn '@theme' src/index.css` |
| Material Symbols usage | 696 (69 file) | `grep -rho 'material-symbols-outlined' src --include='*.tsx' \| wc -l` |
| File dùng `lucide-react` | 16 | `grep -rl 'lucide-react' src --include='*.tsx' \| wc -l` |
| Ternary `isVi` | 831 (35 file) | `grep -rho 'isVi' src --include='*.tsx' \| wc -l` |
| Gọi `t()` (i18n) | 18 (2 file) | `grep -rn "t(" src/frontend/components/Header.tsx src/frontend/views/HomeView.tsx \| wc -l` |
| `aria-label` | 21 chỗ / 14 file | `grep -rl 'aria-label' src --include='*.tsx' \| wc -l` |
| `focus-visible` | 2 (cả 2 để xoá dấu focus) | `grep -rl 'focus-visible' src --include='*.tsx' \| wc -l` |
| `prefers-reduced-motion` | 0 | `grep -rl 'prefers-reduced-motion' src \| wc -l` |
| `role="dialog"` / `aria-modal` / `aria-live` | 0 | grep |
| `<img>` có `loading="lazy"` | 1 / 25 ảnh | grep |
| `window.confirm`/`alert` | 9 | grep |
| Dead code | ~13.087 LOC (22%) | audit `04`/`07` |
| Test tự động | 0 (không có script `test`) | `grep test package.json` |

## 4. Tương phản màu (gate: `node scripts/check-contrast.mjs`)

**25/30 cặp PASS.** 5 cặp FAIL có chủ đích (2 cặp là viền trang trí được miễn theo WCAG 1.4.11; 3 cặp là màu chữ **đã bị loại khỏi token**):

| Cặp | Tỷ lệ | Xử lý |
|---|---|---|
| `#94A3B8` / `#FFFFFF` | 2.56 | loại khỏi vai trò chữ → dùng `#64748B` (4.76) |
| `#94A3B8` / `#F8FAFC` | 2.45 | loại |
| `#8590A6` / `#FFFFFF` | 3.21 | chỉ dùng làm viền control |
| `#CBD5E1` / `#F8FAFC` | 1.42 | viền trang trí — chấp nhận |
| `#28374D` / `#0E1520` (dark) | 1.52 | viền trang trí — chấp nhận |

## 5. Cách cập nhật tài liệu này

Sau mỗi phase, chạy lại 3 lệnh (lint, build, check-contrast) + các lệnh đếm ở §3, rồi thêm một cột "Sau Phase N" tương ứng để so sánh. Không sửa số baseline gốc.

---

## 6. Sau khi áp migration RLS (2026-09-12) — đã kiểm chứng

Trước khi sửa: project Supabase **trống hoàn toàn** (0 bảng, 0 bucket) và chuỗi 6 migration cũ **không chạy được** (4 lỗi cứng). Sau khi tái cấu trúc + áp 3 file:

| Kiểm tra | Kết quả |
|---|---|
| Bảng tồn tại | **15/15** kiểm tra mẫu (baseline tạo 21 bảng) |
| Bảng còn hở RLS | **0** |
| anon đọc `orders` / `user_profiles` / `payment_transactions` / `cost_rules` / `material_inventory_logs` | **0 dòng** |
| anon đọc `products` chưa publish | **0 dòng** |
| `site_content` | 1 dòng (seed), đọc được |
| RPC `get_order_by_guest_token` | tồn tại, 0 dòng với token sai |
| Storage buckets | `product-images`, `cad-files` đã tạo |
| `scripts/verify-rls.mjs` | **9 PASS · 0 FAIL · 4 INFO** |
| `scripts/inspect-db.mjs` | 15/15 bảng tồn tại · 0 bảng hở |

### Gate sau thay đổi (đo lại cùng ngày)

| Gate | Kết quả |
|---|---|
| `npm run lint` | PASS |
| `npm run build` | PASS (bundle không đổi so với §1–§2) |
| `node scripts/lint-rls-sources.mjs` | PASS (3 file chuỗi + 6 file legacy, 0 anti-pattern) |
| `node scripts/lint-rls-migration.mjs` | PASS (allowlist 48/48, R8, R9) |
| `node scripts/check-contrast.mjs` | PASS (29/34, 5 non-pass có chủ đích) |
| Quét mojibake toàn repo | 0 file |

### Ghi chú kỹ thuật đã gặp trong quá trình thi công

1. **Khoá Supabase sai định dạng:** app dùng legacy JWT anon key, project đã chuyển sang `sb_publishable_…` → `UNAUTHORIZED_INVALID_API_KEY_TYPE`. Đã sửa trong `.env` + `client.ts` + `vite.config.ts`.
2. **`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` trên VIEW** → lỗi `42809`. Đã thêm guard `pg_class.relkind` + gate R8.
3. **Helper tạm nhúng trong biểu thức policy** → policy vỡ lúc runtime. Đã dựng biểu thức tại thời điểm tạo policy + gate R9.
4. **Mojibake tiếng Việt:** Windows PowerShell 5.1 `Get-Content` đọc file không BOM theo ANSI → hỏng tiếng Việt khi ghi lại. Đã khôi phục từ git/gốc và dùng .NET I/O; quy tắc ghi trong `AGENTS.md`.