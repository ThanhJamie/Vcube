<!-- doc-meta: status=active; verified=2026-09-24; owner=thanh -->
# Taste Contract — UI/UX skill usage for VCUBE

> **Mục đích**: ràng buộc cách áp các "taste skill" vào VCUBE để cải thiện UI/UX mà **không phá bất biến repo** (data-honesty, token, icon, RLS, không thêm dependency).
> **Trạng thái**: ACTIVE — §4 đã đối chiếu `package.json` + `src` ngày 2026-09-24.
> **Nguồn skill**: `github.com/Leonxlnx/taste-skill` @ `ccbc1563` (MIT).

---

## 1. Skill đã cài (global, `~/.agents/skills/`)

| Skill (install name) | Folder | Vai trò trong VCUBE |
|---|---|---|
| `redesign-existing-projects` | `redesign-skill` | Audit-first + fix layout/spacing/hierarchy/states cho **toàn app** |
| `design-taste-frontend` | `taste-skill` (v2) | Anti-slop cho **storefront** (Home/Explore/PDP/Personalize) |
| `full-output-enforcement` | `output-skill` | Chống output nửa vời |
| `imagegen-frontend-web` | `imagegen-frontend-web` | Tạo **ảnh tham chiếu nội bộ**; KHÔNG ship vào `src/` |

Cập nhật: `DISABLE_TELEMETRY=1 npx skills update -g -a opencode -y`.

---

## 2. Design Read (chốt sẵn, không để agent tự đoán)

- **Page kind**: marketplace công nghiệp (storefront thương mại + console vận hành).
- **Audience**: kỹ sư cơ khí, đội thu mua, xưởng in (VN) — ưu tiên **tin cậy + chính xác**, không phải "artsy".
- **Design language**: light-first SaaS công nghiệp; accent teal giữ nhận diện; dữ liệu kỹ thuật dùng font mono, `tabular-nums`.
- **Không** theo: AI-purple gradient, dark-mesh hero, 3-card feature row, glassmorphism tràn lan, serif editorial.

## 3. Dials theo bề mặt

| Bề mặt | VARIANCE | MOTION | DENSITY | Ghi chú |
|---|---:|---:|---:|---|
| Storefront (`/`, `/explore`, `/products/:id`, `/personalize`) | 5 | 4 | 4 | Sạch, tin cậy; không artsy |
| Transaction (`/cart`, `/checkout`, `/tracking`, `/orders`, `/assets`) | 4 | 3 | 4 | Tối thiểu distraction |
| Consoles (`/quote`, `/admin`, `/lab`, `/designer`) | 3 | 2 | 7 | **Dashboard** — dùng token + `DataTable` repo, không landing rules |

## 4. Override bắt buộc (skill ⇄ repo)

Skill `design-taste-frontend` / `redesign-existing-projects` / `minimalist-ui` có nhiều luật mặc định **không dùng** cho VCUBE:

| Skill yêu cầu | VCUBE giữ | Nguồn ràng buộc |
|---|---|---|
| Đổi font sang Geist/Outfit/Satoshi; cấm "Inter" | **Be Vietnam Pro** (subset tiếng Việt) + JetBrains Mono | `src/index.css` `--font-sans/--font-mono` |
| Đổi icon sang Phosphor/Heroicons; cấm lucide | **lucide + `iconMap`** | `scripts/check-icon-names.mjs`, `docs/design/icon-map.md` |
| Bịa nội dung/ảnh/picsum/"fake-precise numbers"/testimonial giả | **Cấm** | `scripts/check-fabricated.mjs`, `docs/design/data-honesty.md` |
| Bắt buộc dual light/dark | **light-only vĩnh viễn** (dark theme đã xoá hẳn) | `AGENTS.md`, `docs/tasks/UI-CHROME-REFACTOR-PLAN.md` §2 |
| Cấm `window.addEventListener('scroll')` | FAB dùng scroll listener **throttle rAF** + IntersectionObserver; đo overlap khi ngừng cuộn | `src/App.tsx` FAB effect |
| GSAP cho scroll/pin | **CSS/Tailwind transition + `@keyframes`** (không thêm dependency; không GSAP) | `src/index.css`, `package.json` |
| Aesthetic warm-monochrome/serif của `minimalist-ui`, double-bezel của `high-end-visual-design` | **KHÔNG cài 2 skill này** | mục 1 |

**Motion thực tế trong repo** — không có thư viện animation nào (`package.json` không có `motion`/`framer-motion`/`gsap`). Chuyển động làm hoàn toàn bằng CSS/Tailwind:
- Class Tailwind `transition-*` + `duration-*`/`ease-*`, dùng token `--transition-duration-*` khai báo ở `src/index.css`.
- `@keyframes` nội bộ trong `src/index.css` (ví dụ `pulse-subtle`) và utility `animate-in`/`fade-in`.
- Mọi animation vô hạn / transition phải kèm `motion-reduce:animate-none` / `motion-reduce:transition-none`; `src/index.css` có thêm `@media (prefers-reduced-motion: reduce)` tắt toàn cục.

## 5. Áp dụng theo bề mặt

1. **Luôn bắt đầu bằng `redesign-existing-projects`**: Scan → Diagnose → Fix, theo thứ tự `fix priority` của skill (font/màu → hover/active → layout/spacing → component generic → loading/empty/error → typography polish). Nhưng "font/màu" đã bị override ở §4.
2. **Storefront**: thêm `design-taste-frontend` với dials §3; tuân các hard-rule áp dụng được (hero fit viewport, `min-h-[100dvh]` thay `h-screen`, không CTA trùng intent, eyebrow restraint, mỗi section một layout family, mobile collapse tường minh).
3. **Console**: chỉ `redesign-existing-projects` + token repo. Không hero/landing rules, không "macro-whitespace py-40" cho dashboard.
4. **Ảnh**: `imagegen-frontend-web` chỉ tạo ảnh tham chiếu; mọi ảnh đưa vào `src/` phải là asset thật có nguồn.

## 6. Gate (không được hồi quy)

`npm run check` (gộp mọi `check-*`, `lint-rls-*`, `a8-sql-syntax-check`, `test-catalog-sync`) · `npm run lint` · `npm run build`.

Mọi thay đổi UI phải kiểm ở 390 / 768 / 1440 và tôn trọng `prefers-reduced-motion`.
