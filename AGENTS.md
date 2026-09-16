# AGENTS.md — VCUBE

Marketplace for 3D printing and precise CAD files: WebGL 3D viewer, material configurator, Supabase realtime catalog.

## Running (the repo lives in WSL2 Ubuntu-24.04)

This repo is `/home/thanh/projects/Vcube` inside WSL and `\\wsl.localhost\Ubuntu-24.04\home\thanh\projects\Vcube` from Windows. Never build with the Windows toolchain.

- Dev: `wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "npm run dev"` -> http://localhost:3000
- Typecheck: `wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "npm run lint"`
- Build: `wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "npm run build"`
- Integration test: `wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "npx tsx scripts/test-catalog-sync.ts"`

To keep a dev server alive after the command returns, detach it: `setsid nohup npm run dev >/tmp/vcube-dev.log 2>&1 </dev/null &` (details in the `wsl-project-bridge` skill).

## Stack

React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, Zustand 5, react-router-dom 7, Supabase, Three.js 0.185, motion, lucide-react. This is a Vite SPA (`vercel.json` framework=vite): there is no Next.js runtime. The `next` dependency was removed and the dead `src/app/**` Next tree plus `src/backend/supabase/server.ts` and `middleware.ts` are excluded in `tsconfig.json`. Do not add Next.js patterns.

## Layout

- `src/backend/supabase` — client, database service, mappers, seed service
- `src/backend/services` — pricingService, orderService, catalogService, customDesignService, settingsService, workshopService
- `src/frontend/components` / `context` / `views` — UI
- `src/types`, `src/App.tsx` (routing + realtime subscriptions)
- `supabase/migrations`, `scripts`

## Conventions

- Keep the backend/frontend split; database access goes through `src/backend/supabase/*` services, never inline in components.
- RLS on every table; the secret/service-role key is server-only; never expose or commit secrets.
- Realtime subscriptions live in `App.tsx`.
- Match existing patterns; make the smallest change; no unrelated refactors.

## Definition of done

`npm run lint` and `npm run build` must pass. Verify the changed flow in the browser at http://localhost:3000 (use the Playwright MCP), then report each gate's result.

## Environment and database

`.env` is **gitignored** and already holds real credentials. Required keys:

| Biến | Vai trò |
|---|---|
| `VITE_SUPABASE_URL` | URL project |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) | khoá client — an toàn để lộ, RLS là cổng chặn |
| `VITE_SITE_URL` | domain dùng cho auth redirect |
| `SUPABASE_SECRET_KEY` (`sb_secret_…`) | **SERVER ONLY** — bỏ qua toàn bộ RLS. Không bao giờ đưa vào `define` của Vite |
| `NEXT_PUBLIC_SUPABASE_*` | tên cũ, giữ để code hiện tại chạy trong lúc chuyển đổi |

Chuỗi migration (chạy theo thứ tự tên file trong `supabase/migrations/`):

| File | Vai trò |
|---|---|
| `20260900_rls_helpers.sql` | `current_app_role()` + `is_admin()` |
| `20260901_baseline_schema.sql` | toàn bộ schema: 31 bảng + 1 view (`pricing_config`), 49 index (48 + 1 unique index một phần cho KYC; 2 GIN), 7 hàm, 5 trigger (25 instance), 2 storage bucket, realtime, seed |
| `20261010_harden_rls.sql` | toàn bộ policy (**90 policy bảng** + 6 policy storage trên 32 bảng mục tiêu — 88 policy bảng áp dụng thực tế vì 2 policy `pricing_config` bị bỏ qua khi `pricing_config` là view) + 4 trigger: tái tạo 2 trigger profile, chống xưởng sửa cột đặc quyền của `orders`, chống chủ xưởng tự đổi `partner_id`/`verified_status` |

`supabase/legacy/` chứa 6 migration cũ — **không chạy** (xem README ở đó). Không tạo file migration mới chồng lấn; sửa trực tiếp 3 file trên.

**Quyền là do DB quyết định:** vai trò đọc từ `public.user_profiles.role`. Không dùng `user_metadata`, không hardcode email, không `FOR ALL USING (true)`. Cấp quyền admin bằng `supabase/scripts/bootstrap_admin.sql`.

### Gate bổ sung (ngoài lint/build)

```bash
node scripts/lint-rls-sources.mjs    # chặn anti-pattern RLS trong mọi migration (R1-R7)
node scripts/lint-rls-migration.mjs  # tính nhất quán file hardening (allowlist, R8, R9)
node scripts/check-contrast.mjs      # tương phản WCAG của token
node scripts/check-fabricated.mjs     # chặn TUYÊN BỐ BỊA trong chuỗi hiển thị (chỉ quét string literal + text JSX)
node scripts/check-unitprice-multiplier.mjs # chặn dùng `unit_price_multiplier` như HỆ SỐ NHÂN GIÁ BÁN (nó là hệ số SUY ĐƠN GIÁ đ/g — pricingEngine.ts:70-88)
node scripts/inspect-db.mjs          # trạng thái bảng: publishable vs secret
node scripts/verify-rls.mjs          # kiểm chứng RLS bằng anon key (--writes để thử ghi no-op)
node scripts/a8-sql-syntax-check.mjs # cú pháp tĩnh 7 file SQL + chặn nối chuỗi với cột "char" (lỗi 42725)
```

Chi tiết vận hành & khắc phục sự cố: `docs/security/rls-runbook.md`.

## Tài liệu — nguồn chuẩn

Điểm vào (canonical): `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`.
- Runtime & routes: `docs/architecture/system-overview.md`; 3D pipeline: `docs/architecture/3d-cad-pipeline.md`; giá: `docs/architecture/pricing-engine.md`.
- Spec thiết kế & luật trung thực: `docs/design/tokens.md`, `icon-map.md`, `qa-checklist.md`, `data-honesty.md`, `research-brief.md`.

Bộ kế hoạch refactor cũ `docs/plans/**` **đã archive** (39 file mang banner SUPERSEDED) — chỉ tra cứu lịch sử, số liệu lạc hậu. Xem `docs/archive/README.md`.

## Trạng thái thi công (cập nhật gần nhất)

- **RLS: ĐÃ XONG và đã kiểm chứng trên production** — baseline hiện tạo **31 bảng** + 1 view; lần kiểm chứng đầu (21 bảng) vẫn ghi trong `docs/security/rls-runbook.md` §10.6 kèm ghi chú số hiện tại. 0 bảng hở RLS, anon đọc `orders`/`user_profiles` = 0 dòng.
- **Khoá Supabase: đã sửa** — `client.ts`/`vite.config.ts` không còn hardcode; app dùng `sb_publishable_…`.
- **Vai trò UI: đã lấy từ DB** (`AuthContext.resolveDbRole`), không còn suy từ email; ghi `user_metadata` chỉ còn ở DEV.
- **Còn tồn:** (1) rotate `sb_secret_…` (đã lộ trong chat); (2) bật Google OAuth (project đang tắt) hoặc bỏ nút Google + nhánh tạo user giả; (3) seed dữ liệu qua `/admin` -> "Đồng Bộ DB"; (4) khai báo env trên Vercel; (5) 4 lỗi client ở `docs/plans/07-execution-phases.md` Phase 3 (tài liệu đã archive); (6) Phase 1/2/4/5/6/8 theo kế hoạch cũ chưa bắt đầu.

## Lưu ý công cụ (quan trọng)

Shell mặc định của harness là **Windows PowerShell 5.1**. `Get-Content` đọc file **không có BOM** theo ANSI codepage và sẽ **làm hỏng tiếng Việt** (mojibake) khi ghi lại. Với mọi file có ký tự ngoài ASCII, dùng .NET I/O:

```powershell
[System.IO.File]::ReadAllText($p, (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
```

Ngoài ra công cụ `write`/`edit` của DSH **không ghi được** qua đường dẫn UNC `\\wsl.localhost\...` (`ENOTSUP`); hãy ghi ra đường dẫn Windows thật rồi copy vào WSL, hoặc dùng pwsh với .NET I/O.