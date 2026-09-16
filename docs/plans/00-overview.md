> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# VCUBE — Kế hoạch Refactor UI/UX & Tính năng (tổng quan)

Bộ tài liệu này là kết quả phân tích toàn bộ source VCUBE (React 19 + Vite 6 + TS + Tailwind v4 + Supabase, deploy Vercel) và chốt kế hoạch tối ưu lại UI/UX + tính năng.
**Trạng thái:** đã duyệt và **đang thi công**. `npm run lint` + `npm run build` PASS.

### Cập nhật mới nhất (đọc trước khi làm bất cứ gì)

| Hạng mục | Trạng thái |
|---|---|
| Khoá Supabase (`sb_publishable_…`) | ✅ đã cấu hình trong `.env`; `client.ts`/`vite.config.ts` không còn hardcode |
| Chuỗi migration | ✅ tái cấu trúc còn **3 file** (helpers → baseline schema → hardening); 6 file cũ ở `supabase/legacy/` |
| Baseline schema | ✅ 21 bảng, 26 index, 5 hàm, 4 trigger, 2 storage bucket, realtime |
| **RLS** | ✅ **đã áp và kiểm chứng**: 0 bảng hở, anon đọc `orders`/`user_profiles` = 0 dòng, `verify-rls` 9 PASS · 0 FAIL |
| Vai trò UI | ✅ lấy từ `public.user_profiles.role` (không còn `user_metadata`/suy từ email) |
| Dữ liệu thật | ⏳ bảng còn rỗng — cần `bootstrap_admin.sql` + seed qua `/admin` ("Đồng Bộ DB") |
| Rotate secret key | ⏳ chưa làm (khoá đã xuất hiện trong chat) |
| Google OAuth | ⏳ đang **tắt** trong project → nút Google sẽ lỗi; `AuthContext` còn nhánh tạo user giả |
| Phase 1–8 còn lại | ⏳ chưa bắt đầu (xem `07-execution-phases.md`) |

Runbook vận hành DB: `docs/security/rls-runbook.md`.

---

## 1. Đọc gì trước

| Tài liệu | Nội dung | Dành cho |
|---|---|---|
| `00-overview.md` | Tài liệu này: quyết định, chiến lược, bản đồ phase, KPI | Tất cả |
| `01-theme-migration.md` | **Convert UI theme thế nào**: 5 stage, codemod, dual theme, số tương phản thật | Design + frontend |
| `02-pages-public.md` | Tính năng & tối ưu từng trang công khai (`/`, `/explore`, `/products`, `/personalize`) | Product + frontend |
| `03-pages-transaction.md` | Tính năng & tối ưu nhóm giao dịch (`/quote`, cart, checkout, tracking, orders, assets) | Product + frontend |
| `04-pages-account-admin.md` | Auth, designer, admin (16 section), lab, 404, shell toàn cục | Product + frontend |
| `05-feature-roadmap.md` | Roadmap tính năng mới & nâng cấp, 3 đợt, kèm bằng chứng | Product + chủ dự án |
| `06-supabase-vercel.md` | Schema/RLS/storage/realtime + cấu hình Vercel + tuân thủ pháp lý VN | Backend + DevOps |
| `07-execution-phases.md` | Chia việc subagent, gate, rollback, Definition of Done | Điều phối |
| `../design/tokens.md` | Spec token đầy đủ (màu/typography/radius/elevation/z/motion) | Design + frontend |
| `../design/icon-map.md` | Map Material Symbols → lucide để migrate icon | Frontend |
| `../design/qa-checklist.md` | Checklist kiểm thử thủ công mọi trang + luồng | QA |
| `../design/data-honesty.md` | Danh sách dữ liệu đang bịa và cách thay thế trung thực | Product + frontend |
| `baseline.md` | Số đo trước khi sửa | Tất cả |

---

## 2. Quyết định đã chốt

| Quyết định | Lựa chọn | Ghi chú |
|---|---|---|
| Hướng thị giác | **Dual-theme token, giữ brand teal** | Storefront light-first (giữ nhận diện, hợp thị trường tiêu dùng VN); `/quote`, `/admin`, `/lab`, `/designer` dark-first. Accent cyan `#57DFFE` dùng cho thông số kỹ thuật |
| Dữ liệu giả lập | **Làm cho trung thực** | Không bịa model khi parse lỗi, không telemetry giả, không camera giả, không số liệu mesh giả, không hiện đơn của người khác |
| Vai trò `lab` | **Route dashboard thật** | Dùng lại `WorkshopSettingsView` + `WorkshopOnboardingWizard` (2.935 LOC đã viết nhưng chưa route) |
| Thanh toán | **Giữ sample** | Không tích hợp PSP; chỉ sửa tính trung thực (`isPaid`, trạng thái chờ thanh toán, VietQR có số tiền, quy tắc đặt cọc) và dựng sẵn abstraction để sau này cắm payOS |
| Font / icon | Giữ **Be Vietnam Pro** + JetBrains Mono; chuẩn hoá icon về **lucide-react**, bỏ Material Symbols | Không đổi sang Geist khi chưa xác minh subset tiếng Việt |
| Test | Không thêm dependency; dùng script `npx tsx` + checklist thủ công | Repo hiện có **0 test tự động** |
| **Ngôn ngữ thị giác** | **Hiện đại hoá theo tham chiếu ngành 3D** (bổ sung 2026-09-12) | Chi tiết: `11-layout-references.md` (§6 = ảnh NEXORA) + `10-modernization-plan.md` §3. Chốt: **radius card 20px · control 12px · chip 8px · panel lớn 28px · nút = pill 9999px**; **phân tách card bằng FILL thay vì viền**; **một màu CTA chỉ dùng cho hành động**; **nhịp section bằng ĐỔI SURFACE** (sáng ↔ `surface-inverse` ↔ tint `accent`); icon outline ≥18px, **không emoji làm icon**; body 15px. **Không** bắt chước số liệu social proof / logo wall / testimonial bịa (luật `data-honesty.md`); **giữ teal/navy**, không dùng tím+chanh |
| **Kiểm soát cấu hình** | **Mọi số liệu/thông tin điều chỉnh được từ `/admin`** (bổ sung 2026-09-12) | Chi tiết + inventory: `09-admin-settings.md`. Bao gồm **cả hệ số công thức giá** (kèm "xem trước ảnh hưởng lên báo giá" + version + **audit log**). Mã số thuế **để trống chờ admin nhập** — không hardcode. Bảo hành: làm bảng `warranty_claims` + tab admin. **Thứ tự bắt buộc: A8 (schema + service) TRƯỚC A6 (UI)** |

---

## 3. Vấn đề lớn nhất (tóm tắt có bằng chứng)

1. **Bảo mật dữ liệu — ✅ ĐÃ SỬA:** trước đây RLS cho phép anon ghi `products` và đọc toàn bộ `orders`/`user_profiles` (48 chỗ dùng `user_metadata`, 43 chỗ email hardcode, 28 chỗ `USING (true)`). Nay: policy dùng `public.is_admin()` đọc từ `user_profiles.role`; **đã kiểm chứng trên production** (anon = 0 dòng). Chi tiết + bằng chứng: `docs/security/rls-runbook.md` §10.6; thiết kế: `06-supabase-vercel.md` §1.7.
2. **Niềm tin (P0):** parse lỗi tạo model giả + toast thành công; STEP/IGES không được parse nhưng báo watertight; sha256/score/overhang là hằng số; auto-fix là no-op báo đã sửa; tracking hiện telemetry giả; URL đơn sai hiện đơn người khác; CTA camera không tồn tại. → `03-pages-transaction.md` §1.3, `../design/data-honesty.md`.
3. **Tiền (P0):** giảm giá theo số lượng hiển thị nhưng không được trừ; mã giảm giá mất khi sang checkout; VAT kể 3 câu chuyện khác nhau (`đã gồm VAT` vs `tax: 0` vs cộng 8%); phí ship có 3 giá trị hardcode; `isPaid` tự đặt true cho mọi đơn không-COD.
4. **UI không có hệ thống:** **5.307** hex cứng trong `className`, **1.238** khai báo chữ <12px, **0** token Tailwind, **0** file dùng `dark:`, 2 hệ icon, 9 sắc xám cho 1 vai trò, 3 công thức nút chính. → `01-theme-migration.md`.
5. **Chết code & trùng lặp:** **~13.087 LOC (22%)** là dead code; 15 bảng admin tự viết có **0/39** sort, phân trang, chọn nhiều; 30 modal tự viết không có dialog semantics; 3 tầng dữ liệu admin là mock không persist; `workshopService` (1.237 LOC CRUD thật) không được dùng. → `04`, `07`.
6. **Hiệu năng:** three.js (133.9 KB gzip) nằm trong first paint; critical path ≈421 KB gzip; viewer 1.885 LOC re-render mỗi 500ms; rò VRAM mỗi lần upload; 5 vòng render WebGL có thể chạy nền cùng lúc. → `03` §1.2.

---

## 4. Chiến lược

**Tách "làm cho đúng" khỏi "làm cho đẹp":** sửa các lỗi P0 (bảo mật, dữ liệu trung thực, tiền) và dựng design system **trước**, rồi mới đổi giao diện. Lý do: token hoá trước thì đổi theme gần như miễn phí; làm ngược lại phải sửa 91 file hai lần.

**Thứ tự 10 phase:** xem `07-execution-phases.md` §4.

```
0 docs+baseline  →  1 xoá dead code  →  2 design system (blocking)
                 →  3 sửa funnel (song song 2)  →  4 storefront UI  ∥  5 quote tool
                 →  6 admin + lab  →  7 DB & security  →  8 perf/bundle  →  9 nghiệm thu
```

**Gate bắt buộc ở mọi bước:** `npm run lint` → `npm run build`. Thêm gate riêng: `node scripts/check-contrast.mjs` (theme), script đặc tả pricing/parse (logic), script RLS smoke (Phase 7).

---

## 5. KPI theo dõi

**Kỹ thuật**

| Chỉ số | Baseline | Đích |
|---|---|---|
| Critical path gzip | ≈421 KB | ≤ 250 KB |
| CSS gzip | 22.6 KB | ≤ 12 KB |
| Hex cứng trong `className` | 5.307 | 0 |
| Chữ < 12px | 1.238 | 0 |
| Dead code | ~13.087 LOC | 0 |
| Bảng admin có sort/phân trang/bulk | 0/39 | ≥ 90% qua `DataTable` |

**Sản phẩm**

| Chỉ số | Đích |
|---|---|
| Số bước upload → thấy giá (khách vãng lai) | ≤ 2 hành động, không cần đăng nhập |
| Field ở checkout | 7–8 |
| Số chỗ hứa sai/không tồn tại | 0 |
| Trạng thái lỗi/trống/đang tải | 100% màn hình có đủ |
| Tính năng mới ưu tiên (đợt 1) | 12 mục Must ở `05-feature-roadmap.md` §6 |

---

## 6. Cách dùng bộ tài liệu này

1. **Duyệt** nội dung `01`–`06` (phân tích) và thứ tự ở `07` (thi công).
2. Khi thi công, mỗi phase đọc đúng tài liệu tương ứng và **chỉ sửa file trong danh sách ownership**.
3. Sau mỗi phase: cập nhật `baseline.md` (thêm cột "sau"), cập nhật `../design/qa-checklist.md` nếu phát sinh luồng mới.
4. Nếu một quyết định thay đổi (ví dụ bật dark theme cho storefront), cập nhật `00` §2 trước khi code.
5. **Không** dùng các số liệu đã bị loại trong tài liệu bán hàng/design doc: "mỗi field mất 8% conversion", "53% bỏ sau 3 giây", "24–34% bỏ giỏ vì bắt tạo tài khoản", "5.2 bước / 11.8 field", mọi con số "multi-step form tăng X%". Danh sách đầy đủ ở `../design/research-brief.md`.

---

## 7. Rủi ro tổng thể

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| ~~RLS rò dữ liệu cá nhân~~ | **Đã xử lý** | Đã siết + kiểm chứng (`docs/security/rls-runbook.md` §10.6). Rủi ro còn lại: client vẫn còn 2 đường rò (`database.ts:418` chèn filter, `OrderTrackingView` không bắt buộc token) → Phase 3 |
| Secret key đã lộ trong chat | Cao | Rotate `sb_secret_…` trong Dashboard → Settings → API Keys |
| Không có test tự động, refactor lớn | Cao | Script đặc tả + checklist; mỗi phase revert độc lập |
| Đổi theme làm lệch thị giác ngoài ý muốn | Trung bình | Stage A chứng minh tập màu CSS không đổi |
| Xoá dead code mất CRUD thật | Trung bình | Port partner/KYC trước khi xoá |
| Migration làm mất dữ liệu | Trung bình | `ADD COLUMN IF NOT EXISTS`, không `DROP`, sao lưu trước, chạy staging |
| Phase 5 (tool 3D) là phase lớn nhất | Trung bình | Chia 5a→5e, mỗi nhóm commit riêng, gate sau mỗi nhóm |

---

## 8. Phụ lục — số liệu bổ sung (từ 2 tài liệu chuyên đề)

| Mục | Giá trị | Nguồn |
|---|---|---|
| Phát hiện dữ liệu bịa | **69** (Critical 17 · High 28 · Medium 24) | `../design/data-honesty.md` |
| Icon cần migrate | **696 điểm / 69 file / 213 glyph**; 208 có tương đương lucide, 5 phải tự viết | `../design/icon-map.md` |
| Dòng kiểm thử thủ công | **503** dòng + 8 luồng end-to-end (61 bước) | `../design/qa-checklist.md` |
| Cặp màu kiểm tương phản | 34 cặp: 29 PASS, **5 non-pass có chủ đích** (2 viền trang trí được miễn, 3 màu chữ đã loại) | `scripts/check-contrast.mjs` |
| Bẫy khi migrate icon | class `text-*` trên icon **hiện không có tác dụng** (CSS không layer thắng `@layer utilities`) → icon sẽ nhỏ đi sau migrate | `../design/icon-map.md` |

