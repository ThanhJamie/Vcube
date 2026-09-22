# Prompts — VCUBE

Prompt để tiếp tục công việc UI/UX refactor bằng opencode.
**Nguồn sự thật cho đợt refactor chrome:** `docs/tasks/UI-CHROME-REFACTOR-PLAN.md` (W1–W6, T#).

---

## 1. Prompt thi công refactor chrome (subagent)

```
Repo VCUBE (Vite SPA React 19 + TS + Tailwind 4 + Supabase). Đọc theo thứ tự trước khi làm:
1. docs/tasks/UI-CHROME-REFACTOR-PLAN.md   (kế hoạch thi công, W1–W6, bất biến, gate)
2. docs/design/taste-contract.md           (skill nào dùng cho bề mặt nào + override bắt buộc)
3. docs/design/tokens.md                   (token; mục Chrome sẽ thêm ở W1)

Bước 0 — cài lại skill (global, không nằm trong repo):
DISABLE_TELEMETRY=1 npx skills add https://github.com/Leonxlnx/taste-skill \
  --skill "redesign-existing-projects" --skill "design-taste-frontend" \
  --skill "full-output-enforcement" --skill "imagegen-frontend-web" \
  -g -a opencode --copy -y
rồi `npx skills ls -g -a opencode` để xác nhận.

Bước 1 — xác nhận baseline xanh:
npm run lint && npm run build
node scripts/check-contrast.mjs && node scripts/check-contrast-combos.mjs
node scripts/check-icon-names.mjs && node scripts/check-fabricated.mjs
node scripts/check-ui-rules.mjs && node scripts/check-unitprice-multiplier.mjs

Bước 2 — làm tuần tự theo W1 → W5 trong UI-CHROME-REFACTOR-PLAN.md. Dừng ở mỗi gate để báo cáo.

Bất biến: giữ Be Vietnam Pro + JetBrains Mono, lucide + iconMap, light-only (xoá dark),
data-honesty, chỉ dùng token, KHÔNG thêm dependency, KHÔNG dùng GSAP.
Migrations đã chạy trên DB (idempotent), không cần chạy lại.
Mỗi nhóm xong: chạy lại gate rồi báo tôi (KHÔNG tự commit/push trừ khi tôi yêu cầu).
```

---

## 2. Prompt chỉ để review/kiểm thử (không sửa code)

```
Repo VCUBE. Chạy npm run lint && npm run build và toàn bộ gate trong AGENTS.md §"Gate bổ sung"
(bao gồm check-error-handling sau W5). Rồi kiểm thủ công tại 390/768/1440 các luồng:
/admin (topbar sáng full-width, sidebar tối, active cam, drawer mobile tối),
/lab và /designer (như trên), storefront (không đổi), /quote (upload + STEP/IGES + so sánh máy),
/checkout (giỏ rỗng, COD), /admin (Fleet tab, modal <dialog>, guard "Chưa lưu").
Báo từng lỗi kèm file:line. KHÔNG sửa code, KHÔNG commit.
```

---

## 3. Ghi chú môi trường

- `.env` **không** commit (credentials thật). Tạo theo `.env.example` / `AGENTS.md`:
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`, `SUPABASE_SECRET_KEY`
  (`SUPABASE_SECRET_KEY` server-only).
- Thư mục `.agents/` bị gitignore → skill phải cài lại bằng Bước 0.
- Repo chạy trong WSL2 Ubuntu-24.04 (`npm run dev` → http://localhost:3000).
- Shell mặc định của harness là PowerShell; thao tác file tiếng Việt dùng .NET I/O UTF-8 (xem `AGENTS.md`).
