# Prompts — VCUBE

Prompt để tiếp tục công việc UI/UX refactor trên máy khác bằng opencode.
Xem `docs/tasks/UI-REFACTOR-NEXT-STEPS.md` để biết chi tiết việc còn lại.

---

## 1. Prompt tiếp tục refactor UI/UX

Dán nguyên khối dưới đây vào opencode sau khi đã clone/pull `main`:

```
Repo VCUBE (Vite SPA React 19 + TS + Tailwind 4 + Supabase). Tôi vừa clone/pull `main`
(HEAD 631cfac). Đọc theo thứ tự trước khi làm:
1. docs/design/taste-contract.md  (skill nào dùng cho bề mặt nào + override bắt buộc)
2. docs/tasks/UI-REFACTOR-NEXT-STEPS.md  (việc còn lại, file:line, quy ước)
3. docs/design/ui-audit-2026-09.md  (audit + những gì đã xong)

Bước 0 — cài lại skill (global, vì không nằm trong repo):
DISABLE_TELEMETRY=1 npx skills add https://github.com/Leonxlnx/taste-skill \
  --skill "redesign-existing-projects" --skill "design-taste-frontend" \
  --skill "full-output-enforcement" --skill "imagegen-frontend-web" \
  -g -a opencode --copy -y
rồi `npx skills ls -g -a opencode` để xác nhận.

Bước 1 — xác nhận baseline xanh:
npm run lint && npm run build
và chạy các gate: check-fabricated, check-contrast, check-contrast-combos, check-icon-names,
check-unitprice-multiplier, lint-rls-sources, lint-rls-migration, a8-sql-syntax-check.

Bước 2 — làm tiếp theo đúng thứ tự trong UI-REFACTOR-NEXT-STEPS.md §2:
  a) Modal -> <dialog>: AuthModal (shell-only, giữ nguyên body/handler), ChatSupportModal,
     CartDrawer (placement="right"). KHÔNG đụng ModelViewer3D/PersonalizeModelViewer3D/AdminSidebar.
  b) Storefront: content-visibility cho list dài; i18n nốt chuỗi hardcoded ở HomeView/ExploreView.
     Hero fit viewport: hỏi tôi duyệt trước khi đổi layout.
  c) Chuyển createSignedUrl trong AssetLibraryView vào tầng service.
  d) Bỏ ảnh bịa: SEOHead.tsx:15, QuoteSummaryPanel.tsx:252; sửa ObjectTreePanel dùng materials thật.
Mỗi nhóm xong: chạy lại gate, rồi báo tôi (KHÔNG tự commit/push trừ khi tôi yêu cầu).

Bất biến bắt buộc: giữ Be Vietnam Pro + JetBrains Mono, lucide + iconMap
(gate check-icon-names), theme light-first, data-honesty (check-fabricated),
chỉ dùng token trong index.css, KHÔNG thêm dependency, KHÔNG dùng GSAP.
Migrations đã chạy trên DB rồi (idempotent), không cần chạy lại.

Cuối cùng: kiểm thủ công C5 tại 390/768/1440 theo checklist §2.6 của file next-steps
(FAB, /quote, /checkout, /admin, /lab, /designer) và báo kết quả.
```

---

## 2. Prompt chỉ để review/kiểm thử (không sửa code)

```
Repo VCUBE. Chạy npm run lint && npm run build và toàn bộ gate trong AGENTS.md §"Gate bổ sung".
Rồi kiểm thủ công tại 390/768/1440 các luồng: FAB "Trợ lý tự động", /quote (upload + chọn lại
cùng tệp + STEP/IGES + so sánh máy + hoá đơn), /checkout (giỏ rỗng, COD), /admin (Fleet tab,
modal là <dialog>, guard "Chưa lưu"), /lab (onboarding bước 4, "Đánh dấu đã giao"),
/designer (không có số liệu bịa). Báo từng lỗi kèm file:line. KHÔNG sửa code, KHÔNG commit.
```

---

## 3. Ghi chú môi trường khi sang máy mới

- `.env` **không** được commit (chứa credentials thật). Tạo lại theo `.env.example` / `AGENTS.md`:
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`, `SUPABASE_SECRET_KEY`
  (`SUPABASE_SECRET_KEY` là server-only, không đưa vào client).
- Thư mục `.agents/` bị gitignore → skill phải cài lại bằng lệnh ở Bước 0.
- Repo chạy trong WSL2 Ubuntu-24.04 (`npm run dev` → http://localhost:3000).
