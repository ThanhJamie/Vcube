<!-- doc-meta: status=proposal; verified=2026-11-09; owner=po -->
# Plan phát triển theo vai trò — VCUBE (2026-11-09)

> **Plan thực thi:** [`docs/po/IMPLEMENTATION-PLAN-2026-11.md`](./IMPLEMENTATION-PLAN-2026-11.md) —
> task spec, phase, gate và self-review. Tài liệu dưới đây giữ vai trò **phân tích hiện trạng**.

> Phân tích hiện trạng + lộ trình tính năng cho **Khách hàng · Designer · Xưởng in · Admin**.
> Nguyên tắc: chỉ làm tính năng có **người dùng thật + dữ liệu thật + đo được**; ưu tiên đóng
> vòng giao dịch (đặt → trả tiền → nhận hàng → hậu mãi) trước khi mở rộng.

## 0. Snapshot (sau các vòng P0/P1/P2 + 5 PR)

| Hạng mục | Trạng thái |
|---|---|
| PO score | 90,3/100 (P0 còn: 18 dòng `[MẪU]` cấu hình nội bộ) |
| Gate | 23/23 OK · 140 unit test |
| Đã khép | lịch sử đơn, giao file số (RPC + client), review text, quote vault, phân bổ xưởng, thông báo realtime, trang tài khoản, atomic order RPC (flag off) |
| Chưa khép | thanh toán thật, refund, bảo hành, hoá đơn bền, payout designer/xưởng, SLA, audit log, ảnh review |

## 1. Khách hàng (role `customer`)

**Jobs-to-be-done:** tìm đúng bản vẽ → biết giá & thời gian → mua/đặt in → nhận file hoặc hàng → theo dõi → khiếu nại/đánh giá → mua lại.

| Năng lực | Hiện tại | Thiếu / cần làm |
|---|---|---|
| Khám phá & tìm kiếm | ✅ catalog, filter URL, PDP 3D | Gợi ý search, lưu tìm kiếm; dữ liệu thật để có hàng |
| Báo giá 3D | ✅ upload/parse/giá, lưu quote | Quote chia sẻ link, gửi email báo giá |
| Mua & thanh toán | ⚠️ checkout + chuyển khoản thủ công | **Gateway (VNPay/MoMo)**, trạng thái thanh toán realtime |
| Nhận file số | ✅ RPC delivery + `/assets` | Guest cần claim (đã có UI), download limit/watermark (chính sách) |
| Đơn & theo dõi | ✅ `/orders`, tracking, realtime | Huỷ đơn, đổi địa chỉ trước khi in, ETA chính xác |
| Hoá đơn | ⚠️ in từ dữ liệu RAM | **Lưu invoice + số hoá đơn server** (bảng/PDF) |
| Bảo hành | ❌ UI-only | **Writer `warranty_claims` + trạng thái xử lý + ảnh lỗi** |
| Đánh giá | ✅ text (duyệt) | **Ảnh thực tế + hiển thị trên PDP** |
| Tài khoản | ✅ profile/địa chỉ/đổi mật khẩu | Sổ địa chỉ nhiều địa chỉ; xoá tài khoản (GDPR-ish) |
| Hỗ trợ | ⚠️ chat auto-reply | Ticket thật (tạo từ chat, gắn đơn) |
| Thông báo | ✅ realtime in-app | Email khi đổi trạng thái (opt-in) |

**Ưu tiên:** payment gateway → invoice bền → bảo hành → ảnh review → email notification.

## 2. Designer (role `designer`)

**Jobs:** đăng bán bản vẽ → được duyệt → bán → xem doanh thu → nhận tiền → trả lời yêu cầu CAD.

| Năng lực | Hiện tại | Thiếu / cần làm |
|---|---|---|
| Upload & cấu hình sản phẩm | ✅ wizard + `digital_assets` + draft | Validate file/giấy phép; preview trước khi gửi duyệt |
| Quản lý ấn phẩm | ✅ models tab | Trạng thái duyệt lý do từ chối; nhân bản sản phẩm |
| Yêu cầu CAD | ✅ nhận/claim request | Chat thật, deadline/SLA, báo giá công việc |
| Doanh thu | ⚠️ overview (số liệu hạn chế) | **Báo cáo bán hàng theo tháng, top sản phẩm** |
| Payout | ❌ tab dùng fixture `PAYOUT_TRANSACTIONS` | **Nối RPC `upsert_my_payout_info` + ledger thật** (không fake) |
| Giấy phép & royalty | ❌ | Ma trận license (personal/commercial), royalty ledger |
| Storefront | ❌ | Trang designer công khai (sản phẩm + giới thiệu) |
| Thông báo | ⚠️ chung | Thông báo đơn bán/duyệt/tiền về |

**Ưu tiên:** payout thật (bỏ fixture) → báo cáo doanh thu → license/royalty → storefront.

## 3. Xưởng in (`lab` / `workshop`)

**Jobs:** nhận việc → xác nhận → in → cập nhật tiến độ/QC → giao → đối soát công nợ.

| Năng lực | Hiện tại | Thiếu / cần làm |
|---|---|---|
| Hàng đợi | ✅ đọc đơn được giao + cập nhật tiến độ | Nhận/từ chối việc, deadline/SLA, ưu tiên |
| Máy in | ✅ CRUD + trạng thái | Lịch máy, bảo trì, capacity calendar |
| Vật liệu & kho | ✅ CRUD + log kho | Trừ kho tự động khi hoàn thành; cảnh báo tồn |
| Tiến độ & QC | ⚠️ stage/progress | **QC checklist + ảnh**, ghi chú lỗi, reprint |
| Bảo hành | ❌ | Nhận claim từ khách, xử lý, chi phí |
| Công nợ/commission | ⚠️ snapshot trong order_items | **Bảng settlement theo kỳ, trạng thái trả tiền** |
| Thông báo | ⚠️ realtime đơn | Cảnh báo SLA trễ, việc mới |
| Báo cáo | ❌ | Sản lượng, tỷ lệ lỗi, thu nhập |

**Ưu tiên:** SLA/accept → QC + ảnh → settlement kỳ → cảnh báo tồn/SLA.

## 4. Admin

**Jobs:** điều hành catalog/đơn/xưởng/designer/khách, giá, nội dung, an toàn, đối soát.

| Năng lực | Hiện tại | Thiếu / cần làm |
|---|---|---|
| Đơn & điều phối | ✅ kanban, phân bổ xưởng | Hoàn tiền, huỷ đơn, ghi chú nội bộ, SLA |
| Sản phẩm | ✅ duyệt/publish, CRUD | Moderation queue, lý do từ chối, bulk |
| Giá & catalog | ✅ materials/printers/accessories (đủ trường) | **Nhập hàng loạt qua UI** (script đã có), version giá |
| Xưởng & designer | ✅ hồ sơ, KYC | Duyệt payout, settlement, đánh giá đối tác |
| Khách hàng | ✅ danh sách/KYC | Ticket, refund, xoá dữ liệu |
| Nội dung/SEO | ✅ storefront/SEO | Lịch publish, A/B, tracking |
| An toàn | ✅ RLS/gate | **Audit log UI** (ai đổi gì), feature flags, rate limit |
| Báo cáo | ⚠️ overview cơ bản | Doanh thu theo kênh/vai trò, cohort, tỷ lệ lỗi |
| Hỗ trợ | ❌ | Inbox ticket (chat → ticket) |

**Ưu tiên:** audit log + feature flags → refund/huỷ đơn → payout settlement → báo cáo → inbox.

## 5. Nền tảng dùng chung (chặn mọi role)

| Nền tảng | Trạng thái | Việc cần |
|---|---|---|
| Thanh toán | thủ công | Adapter gateway + webhook + idempotency (RPC đã có `confirm_payment_atomic`) |
| Sổ tiền | `payment_transactions` có writer | Đối soát, refund, payout ledger |
| Thông báo | realtime in-app | Email/transactional + tuỳ chọn |
| Audit | chưa có UI | Bảng `audit_log` (hoặc dùng `setting_audit`) + viewer |
| Tệp | Storage + signed URL | Policy review-photos, watermark/download limit |
| Tìm kiếm | client-side | Server search khi catalog > vài trăm |
| Quan sát | console.* | structured log + correlation id |
| Kiểm thử | 140 unit | e2e 3 luồng tiền + CI |

## 6. Lộ trình

### Phase A — “Bán được thật” (0–3 tuần)
1. **Dữ liệu thật** (P0): import materials/printers/accessories + ít nhất 5 sản phẩm thật + ảnh thật.
2. **Payout designer thật**: nối RPC `upsert_my_payout_info`, bỏ fixture `PAYOUT_TRANSACTIONS`, ledger từ `order_items`.
3. **Hoá đơn bền**: lưu invoice + số hoá đơn khi đơn `paid`.
4. **Bảo hành**: writer `warranty_claims` + trạng thái + ảnh lỗi.
5. **Ảnh review**: storage policy `reviews/<uid>/…` + upload/display.
6. **Bật `VITE_ATOMIC_ORDER`** sau e2e 3 luồng.

**Acceptance:** khách mua file → nhận file; hoá đơn reload không mất; warranty tạo được; review có ảnh; payout designer hiển thị số thật.

### Phase B — “Vận hành trơn” (3–8 tuần)
7. **Payment gateway** (VNPay/MoMo) + webhook → `confirm_payment_atomic`.
8. **Refund/huỷ đơn** (admin + trạng thái khách).
9. **SLA xưởng**: accept/decline, deadline, cảnh báo trễ; lịch máy.
10. **QC + ảnh** trong lab; tự trừ kho khi completed.
11. **Admin audit log + feature flags**.
12. **Báo cáo doanh thu** theo role/kênh + export CSV.

### Phase C — “Mở rộng” (2–4 tháng)
13. **Designer storefront + license matrix + royalty ledger**.
14. **Subscription/quote API** cho B2B; webhook đối tác.
15. **Email notification + PWA offline**.
16. **Search server-side + gợi ý** khi catalog lớn.

## 7. Ưu tiên (impact × effort)

| # | Việc | Role | Impact | Effort | Làm khi |
|---|---|---|---|---|---|
| 1 | Dữ liệu thật | tất cả | ★★★★★ | S | Ngay |
| 2 | Payout designer thật | designer | ★★★★★ | M | Phase A |
| 3 | Hoá đơn bền | customer/admin | ★★★★ | S | Phase A |
| 4 | Bảo hành writer | customer/lab | ★★★★ | M | Phase A |
| 5 | Ảnh review | customer | ★★★★ | M | Phase A |
| 6 | Gateway thanh toán | customer/admin | ★★★★★ | L | Phase B |
| 7 | SLA + accept việc | workshop | ★★★★ | M | Phase B |
| 8 | Audit log + flags | admin | ★★★★ | M | Phase B |
| 9 | Storefront designer | designer | ★★★ | L | Phase C |

## 8. Không làm (giữ đơn giản)
- Không app mobile riêng; PWA là đủ.
- Không đa ngôn ngữ (D0 VI-only).
- Không recommendation engine/AI pricing khi chưa có dữ liệu.
- Không microservice/queue riêng; RPC + Edge khi cần.
- Không CRM/helpdesk đầy đủ; ticket tối giản gắn đơn.

## 9. KPI theo role
- **Customer:** quote→order %, checkout completion, % đơn giao file thành công, review rate, repeat 30d.
- **Designer:** upload→publish (ngày), doanh thu/tháng, payout accuracy, thời gian phản hồi request.
- **Workshop:** on-time %, queue SLA, lệch vật tư, settlement accuracy.
- **Admin:** order cycle time, refund rate, data completeness, MTTR sự cố.

## 10. 5 việc tiếp theo (đề xuất)
1. Import dữ liệu thật (template đã sẵn) → PO 97,8.
2. Nối payout designer (RPC) + ledger.
3. Lưu invoice + số hoá đơn.
4. Warranty writer + UI trạng thái.
5. Review photos (storage policy + UI) → 100.
