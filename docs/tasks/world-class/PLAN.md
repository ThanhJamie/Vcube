<!-- doc-meta: status=active; verified=2026-10-23; owner=lead -->
# WORLD-CLASS PLAN — VCUBE theo 4 nhóm đối tượng

> **Câu hỏi của chủ dự án:** sản phẩm hiện chưa đạt "world-class" cho 4 nhóm (người mua · xưởng in ·
> designer · admin). Cần **plan chỉnh sửa** rõ ràng, có thứ tự, đo được.
>
> **Nguyên tắc:** không restyle lại theme (đã được duyệt); plan này là **nối dữ liệu – quy trình – tiền**
> để 4 bên cùng "xong việc". Nền DB đã có sẵn mô hình 3 bên (xem §1.3) nên phần lớn là **wiring + UI + vận hành**,
> không phải thiết kế lại schema.

---

## 1. Chẩn đoán: vì sao chưa world-class

### 1.1 Hai lớp sản phẩm
| Lớp | Điểm hiện tại | World-class cần |
|---|---:|---|
| Trải nghiệm (catalog, 3D, quote, UI) | 4,5/5 | Giữ nguyên, chỉ polish |
| Vận hành giao dịch (order→tiền→giao hàng) | 2/5 | 4,5/5 |

### 1.2 Chuỗi giá trị đang đứt ở đâu
```
Người mua ──checkout──> orders (items JSON + total)        ✅
   ├─ order_items / snapshot tiền                          ❌ chưa ghi
   ├─ payment_transactions (đối soát)                      ❌ chưa ghi
   ├─ order_files (giao file số)                           ❌ chưa ghi
   └─ assigned_workshop_id (điều phối)                     ❌ luôn null
Admin  ──đọc orders, đổi stage──>                          ✅ nhưng không gán xưởng, không có P&L
Xưởng  ──queue theo assigned_workshop_id──>                ❌ luôn rỗng
Designer ──payout tab──> hằng số rỗng                      ❌
Người mua ──/orders──> chỉ admin được nạp                  ❌
```

### 1.3 Nền đã có sẵn trong DB (quan trọng: đừng thiết kế lại)
| Bảng/cột | Trạng thái | Dùng cho |
|---|---|---|
| `order_items` (+ `workshop_commission_percent_snapshot`, `royalty_percent_snapshot`, `workshop_payout_amount`, `designer_payout_amount`, `platform_fee_amount`) | schema có, **0 writer** | COGS, chia 3 bên, royalty |
| `orders` §3b (`subtotal_amount`, `vat_*`, `platform_fee_*`, `workshop_payout_*`, `designer_payout_*`, status/paid_at/by) | schema có, **0 writer** | P&L cấp đơn, công nợ |
| `payment_transactions` | schema có, 0 writer | đối soát tiền vào |
| `order_files` + storage bucket | schema có, 0 writer | giao file số |
| `digital_assets` + RLS owner | schema có, RLS chặn khách | thư viện file đã mua |
| `reviews` | schema có, 0 writer | rating thật |
| `workshop_commission_terms` | schema có, 0 usage | chiết khấu riêng xưởng |
| `designer_payout_info` + RPC | schema + RPC có, chưa có UI | KYC/payout designer |

---

## 2. Benchmark world-class theo từng nhóm

### 2.1 Người mua (benchmark: Xometry/Protolabs cho quote, Craftcloud cho filament, Shopee/Tiki cho checkout VN)
| Năng lực tối thiểu | Hiện tại | Gap | P |
|---|---|---|---|
| Báo giá tức thì từ file, minh bạch breakdown | ✅ `/quote` chạy thật | Chưa lưu báo giá / chưa gửi email | P1 |
| Thanh toán thật (VNPay/MoMo/VietQR + webhook) | ⚠️ chọn phương thức, không có hướng dẫn/đối soát | Chưa có gateway & `payment_transactions` | **P0** |
| Thấy lại đơn + timeline trạng thái | ❌ `/orders` chỉ load cho admin | Sửa query + timeline | **P0** |
| Nhận file đã mua ngay + tải lại nhiều lần + license | ❌ không có file | `order_files` + signed URL + `/assets` | **P0** |
| Hoá đơn/ VAT, tra cứu guest bằng token | ⚠️ hoá đơn RAM, tracking guest có token | Invoice bền + PDF | P1 |
| Đánh giá đã mua (verified) + hiển thị | ❌ 0 writer `reviews` | Review loop | P1 |
| Tài khoản, địa chỉ, huỷ/hoàn tiền | ❌ thiếu | Account + refund policy | P2 |
| Thông báo (email/Zalo/SMS) | ❌ | Notification service | P1 |

### 2.2 Xưởng in (benchmark: Hubs network, Craftcloud production partner)
| Năng lực tối thiểu | Hiện tại | Gap | P |
|---|---|---|---|
| Onboarding + xác minh năng lực/giấy tờ/SLA | ⚠️ wizard ghi hồ sơ | Thiếu bước xác minh, capacity, SLA | P1 |
| Nhận đơn: queue có spec + file + deadline | ❌ queue rỗng | Admin gán `assigned_workshop_id` + detail | **P0** |
| Cập nhật tiến độ + ảnh QC | ⚠️ stage update có | Thiếu ảnh QC, ghi chú, ETA | P1 |
| Nhận/từ chối đơn, nhận thông báo | ❌ | Accept/reject + notify | P1 |
| Sao kê công nợ + payout + invoice | ❌ 0 usage payout columns | Ledger + settlement | **P0** |
| Điểm hiệu suất ảnh hưởng phân đơn | ❌ | On-time/defect metrics | P2 |

### 2.3 Designer (benchmark: MyMiniFactory/Cults3D cho seller, Fiverr cho custom request)
| Năng lực tối thiểu | Hiện tại | Gap | P |
|---|---|---|---|
| Upload có validation (mesh, thumbnail, version) | ⚠️ upload wizard | Thiếu validate sâu/versioning | P1 |
| Giá + license matrix (cá nhân/thương mại) | ⚠️ có field license/giá | Chưa enforce khi tải | P1 |
| Duyệt mẫu có SLA + thông báo trạng thái | ⚠️ admin panel duyệt | Thiếu SLA + notify cho designer | P1 |
| Doanh thu realtime/analytics (views, conversion) | ⚠️ overview request realtime | Thiếu doanh thu thật | P1 |
| Royalty ledger + yêu cầu rút + payout | ❌ tab mock | Nối `order_items` + payout RPC | **P0** |
| IP/DMCA + review 2 chiều | ❌ (bảng DMCA từng có, đã gỡ mock) | Cần flow DMCA | P2 |

### 2.4 Admin (benchmark: Shopify Admin + Stripe dashboard + ERP-lite)
| Năng lực tối thiểu | Hiện tại | Gap | P |
|---|---|---|---|
| Order console 360° (items, files, payment, dispatch, timeline, note) | ⚠️ kanban stage | Chi tiết đơn + gán xưởng + payment status | **P0** |
| Pricing studio có mục tiêu margin + mô phỏng + version/approve | ✅ engine rất mạnh; margin mode chặn có chủ ý | Thêm margin-target mode, lịch sử version | P1 |
| P&L: revenue − COGS − fees − payouts = margin | ❌ chỉ revenue | Snapshot tiền vào đơn + dashboard | **P0** |
| Đối soát thanh toán & công nợ 2 chiều | ❌ | `payment_transactions` + payout runs | **P0** |
| Duyệt KYC / duyệt mẫu / moderation queue + SLA | ⚠️ có panel | SLA, thông báo, bulk | P1 |
| RBAC + audit log UI | ⚠️ audit ghi DB, chưa có màn | Màn audit + phân quyền | P1 |
| Refund/dispute/coupon | ❌ | Cần quyết định nghiệp vụ trước | P2 |
| Báo cáo VAT/tháng, export | ❌ | Report + CSV/PDF | P1 |

---

## 3. Workstream (8 nhánh việc, có phụ thuộc)

| ID | Workstream | Nội dung | Phụ thuộc |
|---|---|---|---|
| **W1** | Transaction & Payment core | Checkout ghi `order_items` + snapshot tiền trên `orders`; `payment_transactions`; hướng dẫn chuyển khoản cấu hình được; webhook/đối soát thủ công; invoice bền | — |
| **W2** | Order visibility & tracking | `/orders` cho customer; timeline trạng thái; chi tiết đơn; guest token; thông báo | W1 |
| **W3** | Digital fulfilment | `order_files` + storage + signed URL; RLS owner; `/assets` tải + license + download limit | W1 |
| **W4** | Dispatch & Workshop ops | Admin gán xưởng; auto-match theo năng lực/vị trí; queue xưởng + spec/file; accept/reject; QC ảnh; ETA | W1 |
| **W5** | Payouts & settlement | Ledger từ `order_items`; công nợ designer/xưởng; yêu cầu rút; duyệt & đánh dấu paid; sao kê | W1, W4 |
| **W6** | Admin finance & reporting | Dashboard: revenue, COGS, gross margin, platform take-rate, payables; VAT tháng; export; đối soát | W1, W5 |
| **W7** | Trust & growth | Review verified; notification email/Zalo; support ticket; account center; coupon/refund (sau quyết định) | W2 |
| **W8** | Quality & observability | E2E test cho luồng tiền; error monitoring; seed/demo reset; backup; performance budget | nền tảng, chạy song song |

---

## 4. Phase plan (thứ tự thi công)

| Phase | Sprint | Nội dung | Kết quả "world-class" kiểm được |
|---|---|---|---|
| **WC-0** | 3–5 ngày | Chốt quyết định nghiệp vụ (§6); e2e harness + seed/demo; chốt payment gateway; chốt chính sách refund/commission | Có ADR + môi trường test ổn định |
| **WC-1** | 1–2 tuần | **W1** Transaction & Payment core | Một đơn thật có dòng hàng, snapshot tiền, payment record; admin xem được |
| **WC-2** | 1 tuần | **W2 + W3** | Khách thấy đơn + nhận file ngay + tải lại; invoice bền |
| **WC-3** | 1–2 tuần | **W4** | Admin gán đơn → xưởng thấy queue + spec/file → cập nhật tiến độ |
| **WC-4** | 1 tuần | **W5** | Designer & xưởng thấy công nợ, yêu cầu rút, admin duyệt paid |
| **WC-5** | 1–2 tuần | **W6** | Admin có dashboard lãi/lỗ + VAT + đối soát khớp |
| **WC-6** | 1 tuần | **W7** | Review verified, thông báo, ticket, account |
| **WC-7** | liên tục | **W8** + polish: margin-target pricing, RBAC/audit UI, coupon/refund, DMCA | Gate world-class §7 đạt |

**Tổng ước tính: 7–10 tuần với 2–3 agent song song** (không tính thời gian chờ quyết định nghiệp vụ & xác minh payment gateway thật).

---

## 5. World-class acceptance gates (không đạt thì chưa gọi là world-class)

1. **Người mua:** đặt đơn thật → trả tiền theo hướng dẫn → **tự tải được file** trong `/assets` ngay → thấy đơn + trạng thái trong `/orders` → nhận hoá đơn → để lại review đã mua; hỗ trợ hoàn tiền theo chính sách.
2. **Xưởng:** đăng ký → được duyệt → **nhận đơn có spec + file + deadline** → cập nhật tiến độ/QC → cuối kỳ thấy **sao kê đúng đến đồng** và được đánh dấu đã trả.
3. **Designer:** upload → được duyệt trong SLA → bán được → **ledger royalty đúng từng đơn** → yêu cầu rút → trạng thái paid; thấy analytics bán.
4. **Admin:** mở một đơn thấy đủ items/payment/files/dispatch/timeline; **doanh thu − COGS − phí − payout = lãi** khớp sổ; đối soát tháng không lệch; audit thấy ai đổi giá/duyệt gì.
5. **Kỹ thuật:** e2e test cho 4 luồng trên chạy trong CI; không mất dữ liệu khi F5; RLS vẫn 0 bảng hở; 0 lỗi console trên 4 luồng.

---

## 6. Quyết định chủ dự án cần chốt trước WC-1

| # | Quyết định | Ảnh hưởng |
|---|---|---|
| D1 | Payment gateway: **VietQR thủ công** (nhanh) vs **VNPay/MoMo** (cần merchant) vs Stripe (quốc tế) | W1, W6 |
| D2 | Có thu tiền online thật ngay hay chỉ ghi nhận chuyển khoản + admin xác nhận | W1 |
| D3 | Chính sách refund/huỷ đơn (trước in / sau in / file số) | W1, W7 |
| D4 | Điều phối: **admin gán tay** vs auto-match theo năng lực/vị trí | W4 |
| D5 | Hoa hồng: % nền tảng + % xưởng + % designer (đã có công thức DB) — chốt số & ngoại lệ xưởng | W1, W5 |
| D6 | Kênh thông báo: email / Zalo OA / SMS | W2, W7 |
| D7 | Yêu cầu KYC/tax & hoá đơn điện tử | W5, W6 |
| D8 | License mặc định cho file CAD + giới hạn tải | W3 |

---

## 7. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Ghi tiền sai/không khớp sổ | Cao | Snapshot bất biến; chỉ admin sửa tiền (RLS đã chặn); test đối soát từng đồng |
| Giao file sai người (rò rỉ bản quyền) | Cao | Signed URL ngắn hạn + RLS owner + audit download |
| Payment webhook giả/mất | Cao | Verify signature + idempotency key + đối soát thủ công |
| Queue xưởng tranh chấp đơn | Trung | Transaction gán đơn 1-lần, version/OCC |
| Payout sai tỉ lệ | Cao | Tính từ snapshot lúc đặt hàng, không tính lại theo cấu hình mới |
| Scope creep (coupon/refund/DMCA) | Trung | Đưa vào WC-7 sau khi 4 luồng lõi thông |

---

## 8. Việc làm ngay (WC-0 + backlog WC-1)

**WC-0 (tuần này):**
1. Chủ dự án trả lời D1–D8 (mục 6).
2. Tạo e2e harness: seed 1 khách + 1 xưởng + 1 designer + 1 admin; script đặt đơn giả lập; reset DB demo.
3. Chốt “định nghĩa hoàn thành” cho từng luồng (mục 5).

**WC-1 backlog (sprint kế tiếp, 2 agent song song):**
- [ ] Checkout: tính & ghi `orders.subtotal/vat/platform_fee/workshop_payout/designer_payout` + `order_items` (1 dòng/item, snapshot %).
- [ ] Checkout: insert `payment_transactions` (status pending) + UI hướng dẫn chuyển khoản (đọc từ `pricing_global_settings`/`app_settings`).
- [ ] Admin: màn **chi tiết đơn** (items, tiền, payment, timeline, note) + xác nhận thanh toán.
- [ ] Admin: cấu hình thông tin chuyển khoản + chính sách refund (nếu D3 chốt).
- [ ] Invoice bền (đọc từ DB theo order id/token) + test e2e “đặt đơn → ghi đủ 3 bảng”.

**Definition of done WC-1:** đặt 1 đơn thật → DB có `orders` snapshot đầy đủ + `order_items` + `payment_transactions`; admin mở đơn thấy khớp; test e2e xanh trong CI.
