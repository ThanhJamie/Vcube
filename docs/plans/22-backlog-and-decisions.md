> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 22 — Danh sách tổng hợp: việc cần chốt + toàn bộ tồn đọng (bản cập nhật)

Bản gốc lập 2026-09-20, cập nhật trạng thái quyết định 2026-09-13 sau buổi review. Số liệu đo (lint/build/contrast/bundle/dòng code…) giữ nguyên theo bản gốc — chưa đo lại.

Trạng thái gate lúc lập bản gốc: lint 0 · build 0 · check-contrast 0 · check-fabricated 0 (SACH) · a8-sql-syntax-check 0 · lint-rls-sources 0 · lint-rls-migration 0 · verify-rls 9 PASS/0 FAIL. Bundle: index.js 802,00 kB (gzip 208,15) · CSS 109,32 kB (gzip 17,22) · src 56.436 dòng.

Mã: D=cần anh chốt · B=lỗi đang sống · U=nợ UI/thẩm mĩ · T=nợ kỹ thuật · O=việc anh phải làm tay.

---

## TRẠNG THÁI QUYẾT ĐỊNH (cập nhật sau review)

### Đã chốt chính thức
| # | Quyết định | Chi tiết |
|---|---|---|
| D3 | Trình dựng công thức tự do cho admin | Đổi kiến trúc: lưu biểu thức trong DB + engine đọc động. **Cần spec bảo mật riêng trước khi thi công**: (1) parser biểu thức an toàn — không eval trực tiếp, (2) bảng lưu công thức riêng — không nhét vào `pricing_global_settings`, (3) versioning + audit trail mỗi lần admin sửa (ảnh hưởng giá bán thật). Track riêng, chạy song song, không chặn D1/D2/D8/O1 |
| D7 | Google OAuth tạm gác | Chưa bật OAuth. Ẩn/disable nút Google ngay (không xoá code) để tránh bấm vào lỗi. Bổ sung OAuth thật khi cần |
| D9 | Bỏ nút "Tách Shells" ngay | Disable/ẩn nút + xoá `simulateSplitShells`. Đóng luôn B9 (trạng thái disabled sai vị trí file). Connected-components thật (a) để làm sau nếu tính năng còn cần |

### Đề xuất — CHỜ ANH XÁC NHẬN (chưa chốt)
| # | Việc | Đề xuất | Vì sao |
|---|---|---|---|
| D1 | `products.license_type` thiếu | (a) thêm cột `license_type text nullable` vào `products` | 1 nguồn sự thật, không phụ thuộc `digital_assets` (chưa có trên production) |
| D2 | Wizard hỏi 3 trường không có cột | (A) bỏ 3 trường khỏi wizard | `hourly_rate` đã đủ tính chi phí; `printer_fleet` đã là catalog chuẩn cho specs |
| D4 | `orders.status`/`status_stage_index` không kiểm giá trị | (a) CHECK constraint | Đơn giản hơn trigger, đủ dùng vì 8 nấc là danh sách tĩnh |
| D5 | `vcube_quotes_owner_all` cho phép chủ xoá báo giá | (b) bỏ DELETE khỏi policy | Giữ lịch sử cho đối soát/audit |
| D6 | KYC chưa chặn nhiều bản đang chờ | (b) ràng buộc DB (partial unique index) | Service-side check (a) có race condition — 2 request đồng thời đều lọt |
| D8 | Số liệu mặc định bịa còn trong baseline | (a) xoá hết default bịa | Đúng bất biến đã tuyên bố "không hiển thị số liệu bịa" |
| D10 | 93 emoji trong src | (a) thay hết, kể cả admin | Tránh 2 ngôn ngữ thị giác khác nhau trong cùng hệ thống |
| D11 | FAB che nút khi hiện | (a) giữ guard | Đánh đổi (b) tạo thêm 6 lỗi vị trí đã biết trước, lợi ích chưa rõ |
| D12 | Generator không kiểm 2 policy mới + trigger mới | (a) mở rộng generator | Đúng bài học T3: gate mới phải tự chứng minh bằng test âm |

**Nếu đồng ý áp hết bảng trên** → D1/D2/D8 đổi schema ⇒ sinh lại `apply_all_manual.sql` một lần; D4/D5/D6/D12 là các thay đổi migration/policy đi kèm cùng lần dán; D10/D11 không ảnh hưởng schema, làm độc lập ở đợt redesign.

---

## THỨ TỰ THỰC THI ĐỀ XUẤT

1. **Ngay, không phụ thuộc gì:** sửa B1 (policy INSERT `workshop_profiles`) — đang chặn onboarding xưởng thật. Áp D7 (ẩn nút Google) và D9 (bỏ nút Tách Shells).
2. **Anh xác nhận** bảng đề xuất D1/D2/D4/D5/D6/D8/D10/D11/D12 ở trên.
3. Sau khi chốt D1/D2/D8 (đổi schema) → sinh lại `apply_all_manual.sql`, gộp luôn D4/D5/D6/D12.
4. Anh dán O1 → chuẩn bị và nhập O2 (giá điện VND/kWh + giá nhân công VND/giờ) → chạy O3 (`audit_schema_truth.sql`), kỳ vọng PHẦN 9 in "RLS bật / 0 policy = 0".
5. Rotate secret đã lộ (O4), khai báo env Vercel (O5), seed dữ liệu qua "Đồng Bộ DB" (O7).
6. Nghiệm thu luồng xưởng thật (O6/B14) — phụ thuộc B1 đã sửa ở bước 1.
7. **Song song, không chặn các bước trên:** viết spec cho D3 (trình dựng công thức tự do) trước khi thi công.
8. Đợt UI/thẩm mĩ riêng (U1–U12) sau khi schema ổn định.

---

## PHẦN 2 — LỖI ĐANG SỐNG (chưa sửa)

| # | Mức | Lỗi | Bằng chứng |
|---|---|---|---|
| B1 | 🔴 P0 | `workshop_profiles` không có policy INSERT ⇒ tài khoản xưởng thật không tự tạo hồ sơ được, onboarding chặn ở tầng DB | `20261010_harden_rls.sql:396-410` chỉ có public_read/owner_read/owner_update/admin_all — grep `workshop_profiles_owner_insert` = 0 |
| B2 | 🔴 P0 | Giấy phép sản phẩm không lưu được: `products.license_type` thiếu (D1) và `dbService.saveProduct` không ghi trường này | grep `license_type` trong `database.ts` = 0; `products` trên production 27 cột, không có cột này |
| B3 | 🟠 P1 | 141 chỗ fallback `\|\| <số>` trong src — số bịa hiển thị khi thiếu dữ liệu | grep 141 lần trong src, gồm `\|\| 2850`, `\|\| 65000`, `\|\| 25000000`, `\|\| 0.18` trong `workshopService.ts` |
| B4 | 🟠 P1 | 40 lỗi tương phản ở file trang (có sẵn, không phải lỗi mới) | text-fg-subtle/bg-surface-inverse 3.87 · opacity-75/bg-line-subtle 1.17 · text-fg-subtle/bg-line-subtle 3.86/4.26 · text-warning/bg-warning-tint 4.47 · /quote 1.09 |
| B5 | 🟠 P1 | Bất nhất VAT: /quote tính trên giá gói, /cart→/checkout→hoá đơn tính trên hàng+ship−giảm | Đã gộp vào đợt redesign |
| B6 | 🟡 P2 | `UserRole` thiếu `'workshop'` | `src/types/index.ts:719` |
| B7 | 🟡 P2 | `UserAvatarMenu` đưa vai lab vào `/admin/...` ⇒ 403 | 5 chỗ trong `UserAvatarMenu.tsx` |
| B8 | 🟡 P2 | `/lab/:tab` không chọn tab (`WorkshopSettingsView` chưa nhận `initialTab`) | grep `initialTab` = 0 |
| B9 | 🟡 P2 | *(đóng cùng D9)* — nút Tách Shells không thật sự bị vô hiệu | disabled nằm sai file |
| B10 | 🟡 P2 | Hàm di sản trong `workshopService.ts` (2.237 dòng) còn nguyên — đọc/ghi cột không tồn tại, fallback bịa, id='default' cũ | 0 caller sau W1a ⇒ nên xoá hẳn |
| B11 | 🟡 P2 | `cad-files` chưa có policy cho designer | Cần chốt quy ước đường dẫn `digital/<auth.uid()>/…` |
| B12 | 🟡 P2 | Dependency có thể không dùng: `@google/genai`, `@supabase/ssr`, `canvas-confetti`, `jszip`, `motion`, `autoprefixer` | Chưa kiểm import thật — nên chốt trước đợt tối ưu bundle U10/U11 |
| B13 | 🟡 P2 | `docs/plans/07-execution-phases.md` Phase 3: 4 lỗi client chưa xử lý | Tồn đọng cũ |
| B14 | 🟡 P2 | Chưa nghiệm thu luồng xưởng thật end-to-end | Phụ thuộc B1 |

---

## PHẦN 3 — NỢ UI / THẨM MĨ (số đo thật, phạm vi đợt redesign)

| # | Việc | Số đo |
|---|---|---|
| U1 | `rounded-full` cần tách avatar/chấm/pill giữ nguyên vs nút/CTA đổi sang `ui/Button` | 393 chỗ |
| U2 | Lệch thang chữ sau khi D1 (11A) đặt body 14px | text-sm 210 (14→13px) · text-base 103 (16→14px) |
| U3 | >450 khối card tự dựng ở 29 trang/panel | PricingConfigPanel 79 · DesignerDashboardView 37 · Group1 34 · Group3 32 · HomeView 23 · Group2 22 · ExploreView 20 · AdminSeoPanel 18 |
| U4 | `border-line` tự dựng | 937 chỗ |
| U5 | 93 emoji (⚠46 · ️43 · ✓9 · ★9 · ✕5 · 🔧5 · nhiều chấm trạng thái nên đổi sang icon lucide/chấm CSS) | tập trung `mockData.ts` 36, Group2DesignersPanel 12, AdminProductsPanel 12, Group3CustomersPanel 10 |
| U6 | Nút hand-rolled `h-9/h-10/h-12` ngoài thang SaaS | 69 chỗ |
| U7 | Primitive có sẵn chưa dùng: StatCard 1, DataTable 0, ConfirmDialog 0 | 59 file đang import `@frontend/ui` |
| U8 | Không có favicon ⇒ 404 mỗi lần tải | — |
| U9 | Google Fonts render-blocking, không preload | 2 family × 10 weight |
| U10 | three-vendor modulepreload trên mọi trang (133 kB gzip) dù landing không dùng 3D | bỏ được ⇒ critical path 422→289 kB; bỏ thêm supabase-vendor ⇒ 231 kB |
| U11 | index.js 802 kB (chỉ 3 view lazy), CSS 109,32 kB (mục tiêu ≤60 kB) | — |
| U12 | `chunkSizeWarningLimit: 1200` đang che cảnh báo | — |

---

## PHẦN 4 — NỢ KỸ THUẬT / GATE

| # | Việc | Ghi chú |
|---|---|---|
| T1 | Ngữ nghĩa trigger trên Postgres thật chưa từng chạy thật — máy này không có psql/docker | Khuyến nghị: dùng 1 Supabase project staging riêng để chạy `apply_all_manual.sql` thật trước khi dán production, thay vì chỉ dựa gate tĩnh + audit sau |
| T2 | `gen-apply-all.mjs` PHẦN 5 không kiểm policy/trigger mới | Xem D12 |
| T3 | 5 bài học phạm vi gate (mỗi lần "gate báo 0 nhưng vẫn có lỗi") | Nguyên tắc: mỗi gate phải ghi rõ phạm vi, gate mới phải có test âm |
| T4 | 1 TODO/FIXME còn trong src | — |
| T5 | `next.config.ts.bak` đã xoá nhưng chưa commit | Dọn kho |
| T6 | ✅ Đã đóng: AGENTS.md, rls-runbook.md, audit_schema_truth.sql | — |

---

## PHẦN 5 — VIỆC ANH PHẢI LÀM TAY

| # | Việc | Chi tiết |
|---|---|---|
| O1 | 🔴 Dán `supabase/scripts/apply_all_manual.sql` | Chờ xác nhận bảng đề xuất D1/D2/D4/D5/D6/D8/D12 (đổi schema) trước khi sinh file lần cuối |
| O2 | 🔴 Chuẩn bị TRƯỚC 2 con số: đơn giá điện (VND/kWh), đơn giá nhân công (VND/giờ) | Sau khi dán, `pricing_global_settings` về NULL ⇒ /quote chặn tính giá tới khi nhập |
| O3 | Chạy `audit_schema_truth.sql` sau khi dán | Tiêu chí: PHẦN 9 "RLS bật/0 policy = 0" |
| O4 | 🔴 Rotate `sb_secret_…` đã lộ trong chat | Bảo mật |
| O5 | Khai báo env trên Vercel | Deploy |
| O6 | Nghiệm thu luồng xưởng thật (đã có `workshop.mes@vcube.vn`) | Phụ thuộc B1 |
| O7 | Seed dữ liệu thật qua /admin → "Đồng Bộ DB" | Hiện products/materials/printer_fleet/accessories/orders đều 0 hàng |

---

## PHẦN 6 — ĐÃ XONG (đã kiểm chứng độc lập)

| Đợt | Nội dung | Bằng chứng |
|---|---|---|
| 11A (D1) | Tầng nền tảng Modern SaaS: bán kính 6/8/12/16/14/9999, body 14px, 7 primitive mới | Token mới tạo 0 lỗi tương phản mới trên trang thật |
| W2/W5 | 2 policy xưởng in cho orders + trigger chặn xưởng sửa cột đặc quyền + 5 policy quotes/kyc_records | 78 policy, kiểu dữ liệu đã kiểm |
| W1a | /lab + /lab/:tab + RoleGuard + FAB tự ẩn + fix wizard | Phân quyền 5/5 PASS, wizard RED→GREEN |
| W1b | 16 hàm di sản ngừng báo thành công khi ghi thất bại | `success: true` kèm error = 0 |
| R4 | Nhánh null ở tầng view, bỏ số cứng modal giá vốn, license_type mapper | Playwright GREEN |
| P3 | Bỏ 3 chỗ bịa giấy phép `\|\| 'Commercial'` | check-fabricated RC=1→0 |
| Gate | PASS 3 + luật "char" + audit PHẦN 9+10 | Mỗi gate chứng minh bằng test âm |

**2 lỗi nặng phát hiện nhờ kiểm chứng, không phải agent tự báo:**
1. `quotes`/`kyc_records`: RLS bật nhưng 0 policy ⇒ deny-all — đã vá (5 policy).
2. `saveWorkshopProfile` sinh id `ws_<timestamp>` trong khi `workshop_profiles.id` là uuid ⇒ hồ sơ xưởng chưa từng tạo được — đã sửa.
