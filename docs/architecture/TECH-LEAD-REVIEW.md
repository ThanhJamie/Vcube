<!-- doc-meta: status=proposal; verified=2026-11-09; owner=lead -->
# Tech Lead Review — hiện trạng & phương án update (2026-11-09)

> Vai: Tech Lead chịu trách nhiệm dài hạn. Mục tiêu: **giữ sản phẩm chạy được, mở rộng được,
> và không đánh đổi tốc độ feature bằng nợ không kiểm soát**. Tài liệu này là **đánh giá + kế
> hoạch**, chưa sửa code.

## 0. Làm rõ yêu cầu trước khi quyết

Chưa có các số này thì mọi kiến trúc chỉ là phỏng đoán. Cần chốt:

| Câu hỏi | Ảnh hưởng quyết định | Giả định tạm thời để lập kế hoạch |
|---|---|---|
| Quy mô 12 tháng: đơn/ngày, SKU, số xưởng, số designer? | Server boundary, cache, realtime | < 200 đơn/ngày, < 1.000 SKU |
| Team hiện tại & 6 tháng tới? | Mức độ refactor, CI | 1–2 dev |
| Doanh thu chính: file số, in 3D, hay B2B? | Ưu tiên luồng tiền/giao file | Cả hai, file số là khác biệt |
| Có yêu cầu SEO/organic không? | SPA vs prerender/SSR | Chưa cấp thiết; PWA/SEO tĩnh trước |
| Thanh toán thật khi nào (VNPay/MoMo/Stripe)? | Thiết kế RPC/idempotency | Còn thủ công 1–2 quý |
| Có app mobile / offline? | PWA + service worker | Chưa; PWA là đủ |
| SLA/uptime & hỗ trợ? | Observability, alerting | Giờ hành chính |

**Phản biện quan trọng:** nếu 12 tháng vẫn < 200 đơn/ngày và 1–2 dev, **không** cần microservice,
SSR, event bus, hay feature-folder toàn repo. Cần đúng 3 thứ: **biên dữ liệu tiền tệ**, **CI**,
và **một nguồn sự thật cho mỗi aggregate**.

## 1. Review hiện trạng (số đo 2026-11-09)

| Chỉ số | Hiện tại | Nhận xét |
|---|---:|---|
| `src/` LOC | **71.715** | Vừa; nhưng phân bố lệch về UI |
| File > 800 dòng | **22** (>600: **37**) | God-file vẫn là nợ chính |
| `: any` / `as any` | **170** | Nên đặt budget, không rewrite |
| `dbService.*` trong frontend | **44 call / 23 file** | UI chạm DB trực tiếp |
| Frontend import `backend/services` | **35 file** | Nhiều lối vào backend |
| `types/index.ts` | **990 dòng** | Trộn 12+ domain |
| Realtime `.channel()` | **4 nơi** | Chưa có registry |
| `console.*` | **107** | Thiếu telemetry thống nhất |
| Unit test | **123** | Không có component/e2e trong CI |
| CI | **0** | 19 gate chạy tay |
| Migration / bảng | **13 / 32** | Ổn định, có RLS |
| Bundle initial (gzip) | ~**283 KB** (index 193 + react 18 + supabase 56 + CSS 16) | Trong ngân sách |
| Dependency cycles | **0** | Điểm mạnh, cần giữ |
| **File chưa commit** | **125** | 🔴 Rủi ro quy trình lớn nhất hiện tại |

**Điểm mạnh thật:** 0 import cycle; UI primitive tập trung (`Icon/Button` là god node nhưng đúng
vai trò); RLS phủ 32 bảng; 19 gate tự động có baseline; graphify + PO audit cho phép đo liên tục.

## 2. Quyết định yếu & rủi ro khi mở rộng

| # | Vấn đề | Bằng chứng | Rủi ro khi scale | Mức |
|---|---|---|---|---|
| 1 | **Luồng tiền nhiều bước ở client** (order → items → payment → files) | `CheckoutView`, `orderService`, `database.saveOrder` | Đơn mồ côi, lệch tiền, không rollback; thêm gateway/refund càng nguy hiểm | 🔴 |
| 2 | **Không có CI**, 125 file chưa commit | `.github/workflows` không có | Regression lọt; conflict; mất dấu thay đổi | 🔴 |
| 3 | **UI gọi DB trực tiếp** | 44 call/23 file | Không test được; đổi schema phải sửa nhiều view | 🟠 |
| 4 | **Trùng nguồn dữ liệu khách hàng** | `customerProfileService` (mới) vs `workshop/customers.ts` (ghi cột **không tồn tại** + localStorage) | Ghi thất bại âm thầm, dữ liệu phân mảnh | 🔴 |
| 5 | **Thiếu unique index** `customer_profiles.user_id` | schema | 2 tab lưu lần đầu → 2 dòng | 🟠 |
| 6 | **Types khổng lồ** | `types/index.ts` 990 dòng | Merge conflict, khó suy luận contract | 🟠 |
| 7 | **God-file UI** | Explore 1.549, PDP 1.438, Home 1.403, Checkout 1.022… | Blast radius mỗi feature; review khó | 🟠 |
| 8 | **Realtime ad hoc** | 4 channel rời rạc | Subscribe trùng, rò rỉ, khó debug | 🟡 |
| 9 | **Digital delivery guest** | RPC chỉ `authenticated`; chưa nối `claim_guest_order` | Khách vãng lai mua file → không nhận được | 🟠 |
| 10 | **Dữ liệu demo nội bộ** | 18 dòng `[MẪU]` (materials/printer/accessories) | Ảnh hưởng báo giá, giảm tin cậy | 🟠 |
| 11 | **Không e2e trong CI** | chỉ 123 unit | Luồng tiền/giao file không được khoá | 🟠 |
| 12 | **Thiếu telemetry** | 107 console, `reportError` 1 consumer | Sự cố production không truy vết | 🟡 |

## 3. Quyết định kỹ thuật (đề xuất)

| ID | Quyết định | Vì sao | Đánh đổi |
|---|---|---|---|
| **AD-01** | Giữ **Vite SPA + Supabase**, chưa lên Next/SSR | Team nhỏ, chi phí thấp, hiện đủ nhanh | SEO/organic kém hơn; nếu SEO thành kênh chính → prerender sau |
| **AD-02** | Mọi luồng ghi nhiều bảng đi qua **Postgres RPC atomic** (`create_order_atomic`, `confirm_payment_atomic`) | Transaction thật, bỏ compensation client, idempotent | Phải viết/review SQL + test RLS; cần feature flag |
| **AD-03** | **Một interface dữ liệu / aggregate** (`OrderGateway`, `CatalogRepository`, `WorkshopRepository`) | Test bằng fake; đổi nguồn không sửa UI | Tốn 1 lớp mỏng; phải kỷ luật không gọi tắt |
| **AD-04** | UI **không** gọi `dbService`/Supabase trực tiếp; chỉ qua hook/domain API | Giảm coupling, test được | Migration dần 44 call; gate baseline chặn phát sinh |
| **AD-05** | **Không** tái cấu trúc toàn bộ sang `features/` ngay; chỉ tách khi sửa domain đó | Tránh big-bang 35k LOC, tránh conflict | Cấu trúc chưa đẹp trong ngắn hạn |
| **AD-06** | Types tách theo domain **kèm re-export** từ `types/index` | Không phá import hiện có | Barrel còn đó đến khi hết import cũ |
| **AD-07** | **Realtime registry** một chỗ (subscribe/unsubscribe theo table) | Tránh trùng kênh, dễ test | Thêm 1 module nhỏ |
| **AD-08** | **CI bắt buộc** cho offline gate + 3 e2e tiền | Chặn regression | Cần thời gian chạy CI (~3 phút) |
| **AD-09** | **Budget** thay vì “0 any / 0 file lớn” | Cải thiện liên tục, không chặn feature | Nợ giảm chậm nhưng bền |
| **AD-10** | PWA/offline **hoãn**; chỉ manifest + cache assets khi có nhu cầu | Rủi ro cache bản cũ | Mất điểm “offline” ngắn hạn |

## 4. Kiến trúc đề xuất (seam & deep module)

```
┌ UI: views / components / ui primitives ──────────────────────────────┐
│  chỉ đọc props + gọi hook; KHÔNG import backend/supabase             │
└───────────────▲──────────────────────────────────────────────────────┘
                │
┌ feature hooks / query hooks ─────────────────────────────────────────┐
│ useCatalog, useOrders(+realtime), useWorkshop, useAccount…           │
└───────────────▲──────────────────────────────────────────────────────┘
                │  interface nhỏ, ổn định
┌ domain services (deep modules) ──────────────────────────────────────┐
│ OrderGateway · CatalogRepository · WorkshopRepository · DeliverySvc   │
│ (return Result/throw lỗi thật; không side-effect ẩn)                  │
└───────┬───────────────────┬──────────────────────┬───────────────────┘
        │                   │                      │
  RPC adapter         Supabase repo          integrations
  (money flows)       (rows ↔ domain)        (storage/payment/notify)
        │                   │                      │
└───────▼───────────────────▼──────────────────────▼───────────────────┘
   Postgres (RLS)        Storage buckets        Realtime registry (1 chỗ)
```

**Deep module mẫu cần dựng:**

```ts
// Một interface cho toàn bộ luồng đặt hàng — caller/test chỉ cần biết 4 hàm.
export interface OrderGateway {
  create(input: CreateOrderInput): Promise<{ orderId: string; accessToken?: string }>;
  confirmPayment(orderId: string, ref: string): Promise<void>;
  finalizeDelivery(orderId: string): Promise<OrderFile[]>;
  listMyOrders(): Promise<Order[]>;
}
```
Adapter `RpcOrderGateway` (một RPC/luồng), fake `InMemoryOrderGateway` cho test.

## 5. Plan (ưu tiên đơn giản, làm theo bước)

| Phase | Việc | Effort | Điều kiện xong |
|---|---|---|---|
| **P0 — Ổn định quy trình** | Commit theo batch 125 file hiện tại (Lead); bật CI offline (lint/unit/build/check); 4 guard script với baseline (max-lines, any-budget, no-new-db-in-UI, import-cycle) | 2–3 ngày | CI xanh trên PR; baseline chặn nợ mới |
| **P1 — Toàn vẹn dữ liệu** | Migration `unique(customer_profiles.user_id)`; xoá/deprecate `workshop/customers.ts`; nối `claim_guest_order` cho khách mua file; điền nội dung thật 18 dòng demo | 2–3 ngày | 0 dòng `[MẪU]`; 1 nguồn customer profile |
| **P2 — Biên tiền tệ** | RPC `create_order_atomic`, `confirm_payment_atomic` (idempotency); `OrderGateway` + adapter + feature flag; 3 e2e (guest order, confirm, delivery) | 5–7 ngày | 1 RPC/luồng; 0 đơn mồ côi; e2e xanh |
| **P3 — Seam dữ liệu** | Hook cho catalog/orders/workshop; chuyển dần 44 `dbService` call; tách types orders/catalog (re-export); realtime registry | 5–7 ngày | UI mới không import Supabase; 0 cycle |
| **P4 — God-file (theo lần chạm)** | Golden test `meshParser` trước khi tách; tách Explore/Home/PDP/Checkout theo **chiều dữ liệu**; admin Group3/5 theo tab | 1–2 tuần (rải) | File chạm ≤800 (mục tiêu ≤600); parity |
| **P5 — Hardening** | Telemetry thống nhất + correlation id cho luồng tiền; budget performance; quyết định SEO/prerender | 3–5 ngày | Sự cố truy vết được; ngân sách giữ |

**Không làm (để giữ đơn giản):** không chuyển toàn repo sang feature-folder; không thêm react-query/
SWR; không SSR/Next; không microservice; không rewrite parser; không săn `any = 0`.

## 6. Giải pháp ngay (5 PR đầu)

1. **PR-1 CI + guardrails** — `.github/workflows/ci.yml` + 4 script + baseline. Không sửa code sản phẩm.
2. **PR-2 Dữ liệu** — migration unique index; xoá `workshop/customers.ts`; SQL nội dung thật; wire claim guest.
3. **PR-3 OrderGateway + RPC** — migration RPC + adapter + feature flag; Checkout dùng gateway.
4. **PR-4 Realtime registry + hooks** — gom 4 channel; `useOrders` là consumer duy nhất.
5. **PR-5 Parser golden tests** — khoá số đo trước khi tách `meshParser`.

Mỗi PR: ≤ 1 domain, có test/verify, không trộn feature mới.

## 7. Rủi ro nếu không làm

- Thêm thanh toán thật/hoàn tiền sẽ **nhân đôi** nhánh compensation client → sai tiền.
- Mỗi feature mới chạm thêm 5–10 file UI→DB → không thể test, đổi schema gãy dây chuyền.
- 125 file chưa commit + không CI = một lần revert/merge sai là mất nhiều ngày.
