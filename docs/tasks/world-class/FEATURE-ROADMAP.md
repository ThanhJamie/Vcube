<!-- doc-meta: status=proposal; verified=2026-10-23; owner=lead -->
# FEATURE ROADMAP 12 THÁNG — VCUBE (2026 Q4 → 2027 Q3)

> **Trạng thái: ĐỀ XUẤT chờ chủ dự án chốt.** Tác giả: `pdp-viewer` (task-47), read-only `src/**`, không commit.
> **Căn cứ:** `docs/tasks/product-review/*` (6 persona · 72 tính năng · top 10 pain), `docs/tasks/world-class/PLAN.md`
> (full-flow FL-0…FL-7; FL-0/1/2a DONE), và quét năng lực code tại HEAD `579ef55`
> (`meshParser`, `pricingEngine`, `integrations/*`, DB 32 bảng, Storage 2 bucket, realtime 3 kênh, Edge function legacy).
>
> **Nguyên tắc:** H1 **không thêm dependency**; AI/3rd-party để H2–H3; không đổi theme/layout; UI VI-only;
> data-honesty (không số bịa). Top 12 **không thay** full-flow FL-2b→FL-6 — đó là điều kiện tiên quyết.

---

## 0. TL;DR (đọc 60 giây)

- **VCUBE đang mạnh ở lớp “chứng minh năng lực”** (3D + báo giá CAD thật + console 4 role) và yếu ở lớp
  “vận hành thương mại” (đơn/file/payout/dispatch — đang được FL-2b→FL-6 nối). Roadmap này **không vá gap**;
  nó thêm tính năng tạo giá trị mới **sau khi full-flow khép kín**.
- **Khác biệt cạnh tranh lớn nhất nên theo đuổi:** **“từ file CAD thật → DFM in được + giá & lead-time theo
  mạng xưởng Việt Nam đã kiểm duyệt + giao file/giấy phép có kiểm soát”** trong **một luồng tiếng Việt**.
  Đối thủ quốc tế (Craftcloud/Hubs/Protolabs) mạnh về network nhưng không có mạng xưởng VN/VI; xưởng VN
  mạnh về quan hệ nhưng không có software. VCUBE có thể đứng giữa.
- **Top 5 H1 (0–8 tuần):** ① Quote Vault (lưu/chia sẻ/chuyển đơn) · ② Ops Inbox & SLA alerts · ③ Printability
  Report (DFM score) · ④ Verified reviews + ảnh thực tế · ⑤ Notification center realtime + PWA.
- **3 big bets:** **Manufacturing Graph** (quote→dispatch network + SLA) · **Rights Rail** (license matrix +
  royalty ledger + designer storefront) · **Embedded VCUBE** (public quote API + CAD plugins + parametric SEO).
- H1 dùng 100% stack hiện có (Supabase DB/Storage/Realtime + Vite + Three.js). H2 bắt đầu dùng Supabase Edge
  Functions cho fan-out quote/dispatch/AI proxy; H3 mới cần 3rd-party (e-invoice, webhook, CAD plugin store).

---

## 1. Cách chấm điểm & giả định

### 1.1 Thang điểm

| Biến | 1 | 3 | 5 |
|---|---|---|---|
| **Impact** | chỉ làm hài lòng ngách nhỏ | tăng rõ một persona | thay đổi cấu trúc cạnh tranh / doanh thu |
| **Confidence** | giả thuyết, chưa bằng chứng | có tín hiệu user/code | có bằng chứng trực tiếp (review/khảo sát/dữ liệu) |
| **Effort** | S ≤ 2 tuần | M 3–5 tuần | L 6–10 tuần; **XL > 10 tuần** = 5 |
| **Score** | — | — | `impact × confidence / effort` (effort S=2, M=3, L=4, XL=5) |

**Horizon:** H1 = 0–8 tuần (sau full-flow) · H2 = 2–6 tháng · H3 = 6–12 tháng.
**Team giả định:** 2 FE + 1 BE/Data + 1 Design + 0.5 Ops/QA. Nếu chỉ 1 builder ⇒ nhân đôi thời gian, giữ thứ tự.

### 1.2 Thang khác biệt cạnh tranh

| Mức | Nghĩa | Ví dụ |
|---|---|---|
| **commodity** | đối thủ đều có, không tạo lợi thế; thiếu thì mất điểm | thanh toán, email xác nhận, wishlist |
| **nice** | tốt hơn một chút, dễ sao chép | filter URL, ảnh sản phẩm, review cơ bản |
| **differentiator** | khách thấy rõ khác biệt, khó copy trong 6–12 tháng | DFM score, designer storefront, QC certificate |
| **moat** | lợi thế **tích luỹ dữ liệu/quan hệ** — copy cần network + thời gian | dispatch graph + SLA data, license/royalty rail, CAD plugin distribution |

### 1.3 Giả định & ràng buộc

- Full-flow FL-2b→FL-6 **xong trước H1**; roadmap này không tính công FL.
- UI/theme đã duyệt — mọi tính năng dùng primitive/token hiện có; **không** restyle.
- H1: **không thêm npm dependency**, không cần server riêng; dùng Supabase (DB/Storage/Realtime/RPC) + Vite.
- H2–H3: Supabase Edge Functions (Deno) là serverless layer; chỉ thêm 3rd-party khi có hợp đồng/chi phí rõ.
- Mọi KPI đều phải **đo được** bằng event/sự kiện (cần enabler A0 bên dưới).

---

## 2. Năng lực đã có — đòn bẩy cho tính năng mới

| Năng lực | Bằng chứng code | Dùng cho feature |
|---|---|---|
| Parse **STL/3MF/OBJ/STEP/STP/IGES**; thể tích, diện tích, tam giác | `src/utils/meshParser.ts` (`parse3DFile`, occt wasm worker) | DFM, quote, parametric |
| **DFM primitives đã có**: non-manifold, boundary edges, inverted normals, **min wall thickness (ray-cast)**, overhang %, watertight | `meshParser.ts:156-230`, `analyzeMeshDefects` | ① Printability Report (H1) — chỉ cần chuẩn hoá thành điểm + gợi ý |
| Ước lượng **gram/giờ in**, throughput, per-plate | `src/utils/printEstimate.ts` | Quote/lead-time, capacity planning |
| **Pricing engine** đa tầng (điện/nhân công/vật tư/máy/lãi/3 bên), delivery packages | `src/utils/pricingEngine.ts` | Multi-quote, license/royalty, B2B |
| **Adapters** `PaymentProvider`/`PayoutProvider`/`NotificationProvider`/`FileStorage` | `src/backend/integrations/*` | FL-7 + H2/H3 integrations |
| **DB 32 bảng + 2 view** đã có sẵn nhiều bảng “chưa nối”: `quotes`, `reviews`, `order_files`, `payment_transactions`, `warranty_claims`, `designer_payout_info`, `workshop_commission_terms`, `cart_items`… | `supabase/migrations/*.sql` | H1 không cần migration mới cho phần lớn |
| **Storage** bucket `cad-files` (private) + `product-images` (public), signed URL | migration #2/#12; `fileStorage.ts` | review ảnh, QC ảnh, license delivery, storefront |
| **Realtime** 3 kênh: `products`, `settings`, `custom_design_requests` | `useCatalogData.ts:157`, `settingsService.ts:336`, `customDesignService.ts:380` | thêm channel `orders`/`notifications` (H1) |
| **Supabase Edge Functions** (Deno) đã có hạ tầng; hiện 1 function legacy `calculate-quote` (154 dòng, **0 caller**) | `supabase/functions/calculate-quote/index.ts` | H2 fan-out quote, AI proxy, scheduled SLA/dispatch |
| Vercel static + SPA rewrites (chưa prerender) | `vercel.json` | SEO/SSG là **quyết định kiến trúc** cho H2 |
| 30 route, 16 view, 4 console role, VI-only | `AppRoutes.tsx`; `docs/pages/_routes.generated.md` | bề mặt để gắn feature mới |

---

## 3. Brainstorm 30 tính năng mới (4 persona + platform)

> Cột **Effort**: S/M/L/XL. **Mức**: commodity/nice/**differentiator**/**moat**. Đây là *danh sách thô*;
> top 12 nằm ở §4. ID dùng xuyên suốt tài liệu.

### 3.1 Người mua (guest + customer)

| ID | Tính năng | Vấn đề người dùng | Giá trị | KPI | Effort | Phụ thuộc | Mức |
|---|---|---|---|---|---|---|---|
| B1 | **Printability Report**: điểm DFM + lỗi (thành mỏng, hở lưới, overhang) + gợi ý hướng in | “Tôi không biết file có in được không, sửa thế nào” | Tin trước khi trả tiền; giảm đơn lỗi | % upload có report; DFM pass rate; quote→cart | M | parser (có) | **differentiator** |
| B2 | **Quote Vault**: lưu báo giá, mã QR/link chia sẻ, hạn dùng, version, chuyển thành đơn | “Báo giá xong không lưu được, gửi sếp không được” | Biến quote thành lead/đơn; B2B | % quote lưu; share→order; tái sử dụng | S–M | quotes table (có) | **differentiator** |
| B3 | **So sánh giá nhiều xưởng** (3–5 option: giá/lead-time/vật liệu) | “Không biết giá này đắt hay rẻ” | Chọn theo ngân sách/thời gian; tin cậy | % quote ≥3 option; price spread; convert | L | FL-3/4 + rate xưởng | **moat** |
| B4 | **Lead-time guarantee** khi checkout (slot theo capacity xưởng) | “Bao giờ có hàng? trễ thì sao?” | Cam kết ngày + đền bù nhẹ | on-time ≥95%; % chọn cam kết | L | FL-3 + capacity | **differentiator** |
| B5 | **Verified reviews + ảnh thực tế + tag “đúng mô tả/dung sai”** | “Đánh giá 4.4 nhưng không có nội dung” | Vòng tin cậy; giảm rủi ro | review/đơn hoàn tất; #photo review; PDP convert | M | `reviews` (có) + FL-6 | **nice** (bắt buộc) |
| B6 | **Hậu mãi 1-click**: bảo hành/claim + return + timeline xử lý | “Hàng lỗi không biết báo ai” | Giảm CSKH thủ công; tăng tin | claim rate; time-to-resolve | M | FL-6 + warranty table | **differentiator** (B2B) |
| B7 | **Wishlist/collection đồng bộ + “mua lại”** | Bookmark mất khi rời trang; mua lại khó | Retention, repeat | repeat purchase 90d | S | `saved_designs` migration | **commodity** |
| B8 | **Theo dõi đơn nâng cao**: timeline realtime + QC ảnh + ETA + link chia sẻ | “Phải F5 mới biết tiến độ” | Giảm lo lắng, giảm hỏi CSKH | tracking revisit; CSKH/đơn | M | FL-3/6 + QC | **differentiator** |
| B9 | **PWA + notification center** (in-app + web push opt-in) | “Không biết đơn tới đâu nếu không mở web” | Re-engagement | install; notification open; revisit | M | notifications table | **nice** |
| B10 | **Trang tài khoản/địa chỉ/hoá đơn điện tử** | Không sửa được profile, hoá đơn mất khi F5 | Table stakes B2C | profile completion; invoice download | S–M | FL-5/6 | **commodity** |
| B11 | **Chat có người thật + AI first-line + ticket** | Chat auto-reply vô dụng | Chuyển đổi, CSKH | first-response; ticket→order | M | Edge + AI (H2) | **nice** |
| B12 | **Minh bạch vật liệu/lead-time/PDP matrix** | Không rõ chọn vật liệu nào | Giảm do dự | PDP→cart | S | pricing (có) | **nice** |

### 3.2 Xưởng in (lab/workshop)

| ID | Tính năng | Vấn đề | Giá trị | KPI | Effort | Phụ thuộc | Mức |
|---|---|---|---|---|---|---|---|
| W1 | **Auto-dispatch theo năng lực/vật liệu/khu vực/tải** (admin duyệt) | Hàng đợi rỗng/điều phối tay | Xưởng có việc; giảm thời gian gán | dispatch time; % auto chấp nhận | L | FL-3 | **moat** |
| W2 | **Capacity calendar** (máy/vật liệu theo ngày, slot đặt) | Không biết xưởng còn tải | Cam kết lead-time; tối ưu tải | utilization; on-time | L | W1 + FL-3 | **moat** |
| W3 | **QC ảnh + chứng nhận dung sai + QR verify** | Không có bằng chứng chất lượng | Tin cậy B2B; giảm claim | % đơn có QC; claim rate | M | storage + FL-3 | **differentiator** |
| W4 | **SLA score & badge** (on-time, defect, response) | Thuê xưởng không có cơ sở | Chọn xưởng minh bạch | SLA score coverage | M | W1/W3 dữ liệu | **moat** |
| W5 | **Workshop analytics** (tải máy, biên lợi nhuận, đơn trễ) | Không biết hiệu quả | Giữ xưởng | weekly active xưởng | M | FL-4 | **nice** |
| W6 | **Sao kê payout/ledger xưởng** | Không biết được trả bao nhiêu | Tin tưởng để nhận việc | payout dispute | S–M | FL-4 | **commodity** |
| W7 | **Đồng bộ tồn kho → khả năng nhận đơn** | Nhận đơn thiếu vật liệu | Giảm huỷ đơn | cancel do thiếu vật liệu | M | inventory (có) | **nice** |
| W8 | **Xưởng nhận việc thầu phụ** (chia job) | Quá tải/thiếu máy | Mở rộng capacity | % job chia | L | W1/W2 | **differentiator** |

### 3.3 Designer

| ID | Tính năng | Vấn đề | Giá trị | KPI | Effort | Phụ thuộc | Mức |
|---|---|---|---|---|---|---|---|
| D1 | **Storefront công khai** (`/d/:handle`): profile, mẫu, collection, follow | Mẫu chìm trong catalog chung | Thương hiệu + traffic riêng | profile→sale; follow | M–L | FL-2a + SEO | **differentiator** |
| D2 | **License matrix** (cá nhân/thương mại/mở rộng, seat, print limit) + **royalty ledger tự động** | Không ai dám bán file nghiêm túc | Thu nhập định kỳ; bảo vệ IP | % digital sales dùng license; payout accuracy | L | FL-2b/4 | **moat** |
| D3 | **Bundle/collection theo tháng** (mua gói nhiều mẫu) | Không có lý do mua nhiều | Tăng AOV | bundle attach rate | M | D1/D2 | **differentiator** |
| D4 | **Parametric variants** (designer khai tham số; buyer chọn; giá tự tính) | Mỗi biến thể phải upload riêng | SKU vô hạn; khác biệt | #variants; convert | L | parser/pricing | **differentiator** |
| D5 | **Designer analytics** (view→fav→sale, giá gợi ý) | Không biết mẫu nào bán được | Tăng doanh thu | conversion uplift | M | events (A0) | **nice** |
| D6 | **KYC/approved badge + portfolio verify** | Buyer không tin designer mới | Tin cậy | verified designer % | S | FL-6 | **nice** |
| D7 | **Watermark preview + download audit** | Lo lộ file trước khi mua | Bảo vệ IP | watermark coverage | M | storage/Edge | **differentiator** |
| D8 | **Creator contest/referral** | Thiếu động lực giới thiệu | Growth | referral GMV | S–M | growth | **commodity** |

### 3.4 Admin / Ops (điều phối viên suy diễn)

| ID | Tính năng | Vấn đề | Giá trị | KPI | Effort | Phụ thuộc | Mức |
|---|---|---|---|---|---|---|---|
| A1 | **Ops Inbox “hôm nay cần làm gì”** + SLA alerts (đơn mới, KYC, payout, claim, chat) | 22 section rải rác; dễ bỏ sót | 1 màn hình điều hành | time-to-first-action; overdue | S–M | FL-3/4/6 | **nice** (nội bộ) |
| A2 | **Đối soát tài chính** (payment_transactions ↔ orders ↔ payout) | Không có sổ giao dịch | Chống thất thoát | reconciliation diff = 0 | M | FL-5 | **commodity** |
| A3 | **Audit trail hành động admin** | Không biết ai làm gì | Compliance | audit coverage | S | `setting_audit` mở rộng | **commodity** |
| A4 | **Feature flags + thử nghiệm giá/UX** | Đổi gì cũng ảnh hưởng toàn bộ | Tối ưu có kiểm soát | experiment velocity | S | config table | **nice** |
| A5 | **Fraud/abuse check** (trùng đơn, file độc, chargeback flag) | Rủi ro vận hành | Giảm tổn thất | fraud loss | L | payments | **nice** |
| A6 | **Support ticket center** (chat → ticket → assign) | Chat không lưu | CSKH có trách nhiệm | ticket resolution | M | B11 | **nice** |

### 3.5 Platform / Growth / AI

| ID | Tính năng | Vấn đề | Giá trị | KPI | Effort | Phụ thuộc | Mức |
|---|---|---|---|---|---|---|---|
| P0 | **Analytics events + funnel dashboard + feature flags** (enabler) | Không đo được KPI, không biết feature nào hiệu quả | Ra quyết định bằng dữ liệu | event coverage; KPI dashboard | S–M | DB + admin (có) | **commodity** (bắt buộc) |
| P1 | **Semantic search + gợi ý** (mẫu/vật liệu theo mô tả) | Search text thô | Tăng tìm thấy | search→PDP; zero-result | M | embeddings/AI (H2) | **nice** |
| P2 | **AI CAD Copilot**: giải thích DFM, tư vấn vật liệu/giá, soạn RFQ | Khách không biết chọn gì | Giảm ma sát; khác biệt | assist→quote; CSKH giảm | L | Edge proxy + AI (H2) | **differentiator** |
| P3 | **Public Quote API + CAD plugin** (Fusion/Onshape/SolidWorks, webhook) | Kỹ sư phải rời CAD để báo giá | Distribution B2B | API GMV; plugin installs | XL | Edge + API keys (H3) | **moat** |
| P4 | **Programmatic SEO** (trang mẫu theo ứng dụng/vật liệu/ngành; prerender) | SPA khó SEO | Traffic dài hạn | organic→PDP; indexed pages | L | prerender/SSG (H2) | **differentiator** |
| P5 | **B2B procurement** (team account, PO, approval, e-invoice, RFQ) | Doanh nghiệp cần PO/hoá đơn | Switching cost | PO GMV; team seats | XL | FL-5/7 + e-invoice | **moat** |
| P6 | **Referral/affiliate + creator program** | Growth | CAC giảm | referral share | S–M | P0 | **commodity** |
| P7 | **Email/Zalo/SMS notification** (FL-7) | Không có kênh ngoài | Re-engagement | delivery/open | M | provider | **commodity** |
| P8 | **Warranty/returns portal cho buyer** (gộp B6) | — | — | — | — | — | — |

> **Ghi chú:** 30 dòng là *không gian ý tưởng*, không phải cam kết. Các dòng trùng (B6/P8, B9/P7, B10) sẽ gộp khi lên backlog.

---

## 4. Top 12 — xếp hạng `impact × confidence / effort`

| # | ID | Tính năng (ngắn) | Horizon | I | C | Effort | **Score** | Mức cạnh tranh | Vì sao người dùng cần (không chỉ “nice”) | Phụ thuộc FL |
|---:|---|---|---|---:|---:|---|---:|---|---|---|
| 1 | B2 | **Quote Vault** (lưu/chia sẻ/chuyển đơn) | **H1** | 4 | 5 | S–M (2) | **10,0** | differentiator | Khách B2B cần gửi sếp/đối tác duyệt; quote hiện “dùng một lần rồi mất”, không thành lead | FL-1 ✅ |
| 2 | A1 | **Ops Inbox & SLA alerts** | **H1** | 4 | 4 | S–M (2) | **8,0** | nice (nội bộ) | Vận hành đang phải nhớ 22 section; bỏ sót đơn/KYC/payout = mất tiền & mất khách | FL-3/4/6 |
| 3 | B1 | **Printability Report (DFM score)** | **H1** | 5 | 4 | M (3) | **6,7** | **differentiator** | “File của tôi có in được không?” là câu hỏi đầu tiên; báo trước lỗi giảm đơn huỷ/hoàn tiền | parser ✅ |
| 4 | B5 | **Verified reviews + ảnh thực tế** | **H1** | 5 | 4 | M (3) | **6,7** | nice (bắt buộc) | Rating hiện không có nội dung ⇒ không ai tin; review thật là đòn bẩy chuyển đổi rẻ nhất | FL-6 |
| 5 | D1 | **Designer storefront + collection** | H2 | 4 | 4 | M (3) | **5,3** | **differentiator** | Designer cần “cửa hàng” để xây thương hiệu; catalog chung không tạo được traffic riêng | FL-2a ✅ |
| 6 | B9 | **Notification center realtime + PWA** | **H1** | 4 | 4 | M (3) | **5,3** | nice | Khách không biết đơn tới đâu nếu không quay lại web; PWA giữ chân trên mobile | FL-6 |
| 7 | D2 | **License matrix + royalty ledger** | H2 | 5 | 4 | L (4) | **5,0** | **moat** | Designer chỉ dám bán file khi biết bán được quyền gì, được trả bao nhiêu, khi nào | FL-2b/4 |
| 8 | W3 | **QC ảnh + chứng nhận + QR verify** | H2 | 4 | 3 | M (3) | **4,0** | **differentiator** | B2B mua lô cần bằng chứng chất lượng; claim/hoàn tiền giảm khi có ảnh đo kiểm | FL-3 |
| 9 | B3 | **So sánh giá nhiều xưởng** | H2 | 5 | 3 | L (4) | **3,8** | **moat** | “Giá này đắt hay rẻ?” — chỉ trả lời được khi có network rate/lead-time thật | FL-3/4 |
| 10 | W2 | **Capacity calendar + SLA score** (nền của auto-dispatch) | H3 | 5 | 3 | XL (5) | **3,0** | **moat** | Cam kết ngày giao chỉ đáng tin khi biết tải xưởng; SLA score tạo áp lực chất lượng | FL-3/4/5 |
| 11 | P5 | **B2B procurement** (team/PO/e-invoice/approval) | H3 | 5 | 3 | XL (5) | **3,0** | **moat** | Doanh nghiệp không mua được nếu thiếu PO/hoá đơn/quy trình duyệt; giữ chân cực cao | FL-5/7 |
| 12 | P3 | **Public Quote API + CAD plugin** | H3 | 4 | 3 | XL (5) | **2,4** | **moat** | Kỹ sư đang làm việc trong CAD; báo giá ngay trong Fusion/Onshape = kênh phân phối mới | FL-7 + Edge |

**Đọc bảng:** 5 H1 = #1,2,3,4,6 (đã đủ 4–6 mục); H2 = #5,7,8,9; H3 = #10,11,12.
Các feature **commodity/nice** bị loại khỏi top 12 (B7, B10, W5, W6, D5, D6, A2, A3, P0/P1/P4/P6) vẫn cần làm nhưng nằm trong
full-flow/backlog thường, không phải “đầu tư khác biệt hoá”. **P0 (analytics/feature flags) là enabler bắt buộc H1**
nhưng không tính vào top 12 vì không phải tính năng người dùng.

---

## 5. H1 chi tiết — 5 tính năng “must-add” (0–8 tuần sau full-flow)

### H1-1 · Quote Vault (B2) — `S–M`, score 10,0
- **Vấn đề:** `/quote` tính giá xong chỉ có “thêm vào giỏ”; `quotes` table + `saveQuote` có nhưng **0 caller** ⇒
  không có mã báo giá, không gửi được cho ai, refresh là mất.
- **MVP:** lưu quote (snapshot input + giá + vật liệu/máy/layer + hạn 7–30 ngày) → trang `/quotes/:token`
  chia sẻ được (read-only) + nút “Chuyển thành đơn” (đi qua checkout hiện có). Không cần đăng nhập: token
  khó đoán + hạn dùng (giống order token hiện có).
- **KPI:** % lượt quote được lưu; quote-share → order; thời gian từ quote→đơn; số quote tái sử dụng.
- **Kiến trúc:** `quotes` (đã có) + cột `share_token/expires_at/status`; RLS: owner + anon-by-token RPC
  `get_quote_by_token` (security definer, giới hạn field); không storage, không Edge, không AI.
- **Rủi ro:** lộ giá cho đối thủ qua link chia sẻ → token hết hạn/revoke; giá phải snapshot **bất biến** (không
  tính lại theo config mới).

### H1-2 · Ops Inbox & SLA alerts (A1) — `S–M`, score 8,0
- **Vấn đề:** admin có 22 section/16 nhóm nav, không có “hôm nay cần làm gì”; ops bỏ sót đơn/KYC/payout/claim.
- **MVP:** 1 route `/admin/inbox` (hoặc block đầu dashboard) gom 5 hàng đợi: đơn chờ xác nhận tiền, đơn chờ gán
  xưởng, KYC chờ duyệt, payout chờ duyệt, claim/chat mới; badge + SLA (quá 24h/48h tô đỏ) + deep-link.
- **KPI:** time-to-first-action trên đơn mới; số task quá hạn; % đơn được gán < 2h.
- **Kiến trúc:** query/view SQL từ bảng có sẵn; realtime channel admin (mở rộng channel `orders` dạng chỉ-admin);
  không cần bảng mới (tuỳ chọn `ops_tasks` materialized view).
- **Phụ thuộc:** FL-3 (dispatch write), FL-4 (payout), FL-6 (claims). Trước FL-3 vẫn làm được 3 hàng đợi đầu.

### H1-3 · Printability Report / DFM score (B1) — `M`, score 6,7
- **Vấn đề:** khách upload file nhưng không biết có in được; lỗi lưới/thành mỏng/overhang phát hiện muộn ⇒ huỷ đơn.
- **MVP:** sau `parse3DFile` (đã có `analyzeMeshDefects`), chuẩn hoá thành **điểm 0–100** + 3–6 cảnh báo có
  ngưỡng minh bạch (thành mỏng < ngưỡng theo vật liệu, non-manifold > 0, boundary edges, overhang > x%) + gợi ý
  hướng in/vật liệu. Hiện trong `/quote` + lưu kèm quote (B2) + nhãn “Cần xưởng xác nhận” cho phần chưa chắc.
- **KPI:** % upload có report; DFM pass rate; quote→cart/quote→order của nhóm có report vs không (A/B);
  giảm % đơn bị trả lại do lỗi in.
- **Kiến trúc:** 100% client (worker hiện có), không AI, không dependency; rule/threshold đọc từ `pricing_configs`/
  hằng số có nguồn, **không bịa số đo** (giữ `null` khi không đo được — đúng data-honesty hiện có).
- **Rủi ro:** heuristic wall-thickness/overhang là **ước lượng** (đã ghi rõ trong `meshParser.ts`) ⇒ phải hiển thị
  “ước lượng, xưởng xác nhận”; file lớn >60k tam giác ⇒ trả “chưa phân tích được”, không chặn upload.

### H1-4 · Verified reviews + ảnh thực tế (B5) — `M`, score 6,7
- **Vấn đề:** PDP hiện “4.4 (5 đánh giá)” nhưng tab đánh giá rỗng; `reviews` có bảng/trigger nhưng **không writer**
  ⇒ vòng tin cậy hở, không ai tin điểm.
- **MVP:** sau đơn `completed` → form đánh giá 1–5 + nhận xét + tối đa 3 ảnh (bucket `review-photos`), tag
  “đúng mô tả / dung sai / đóng gói”; hiển thị list + ảnh ở PDP; chỉ review từ **đơn thật** (verified buyer),
  trigger `fn_sync_product_review_stats` đã có tự cập nhật rating.
- **KPI:** review/đơn hoàn tất; % review có ảnh; PDP conversion uplift; #sản phẩm có ≥3 review.
- **Kiến trúc:** `reviews` + `review_media` (hoặc cột JSON mảng path) + storage bucket private/public-thumb;
  RLS: người mua sở hữu đơn; admin moderate; không AI.
- **Rủi ro:** spam/ảnh xấu → kiểm duyệt + rate limit; ảnh chứa PII → bucket private + signed URL; không cho sửa
  rating của đơn khác.

### H1-5 · Notification center realtime + PWA (B9) — `M`, score 5,3
- **Vấn đề:** chỉ có 3 realtime channel (products/settings/custom_design); đơn không realtime; khách phải F5/tra token.
- **MVP:** bảng `notifications` (user, type, payload, read_at) + realtime channel theo user; chuông + panel trong
  Header; PWA manifest + service worker (cache shell, offline fallback) — **không thêm dependency**; web push
  để H2 (cần VAPID/Edge).
- **KPI:** % user có notification đọc; tracking revisit; PWA install; thời gian quay lại sau khi có thông báo.
- **Kiến trúc:** DB + realtime + header UI; `notificationProvider.send` hiện chỉ log → nối ghi bảng.
- **Rủi ro:** realtime RLS phải chặt (chỉ chủ); iOS PWA push hạn chế; không spam (digest/opt-in).

---

## 6. H2 chi tiết — 4 tính năng khác biệt hoá (2–6 tháng)

### H2-1 · Designer storefront + collection/bundle (D1) — `M`, score 5,3
- **MVP:** `/d/:handle` (profile, mẫu published, collection, follow), SEO cơ bản; designer sửa profile/collection
  trong dashboard; bundle mua nhiều mẫu giảm giá (dùng pricing package hiện có).
- **KPI:** profile→sale; follow; bundle attach rate; organic traffic/designer.
- **Kiến trúc:** bảng `designer_storefronts`/`collections`/`follows`; storage ảnh; **quyết định SEO**: SPA hiện
  không prerender — cần SSG/edge prerender (H2) hoặc chấp nhận SEO hạn chế ở MVP.
- **Phụ thuộc:** FL-2a ✅, FL-4 (hiển thị doanh thu), P0 analytics.

### H2-2 · License matrix + royalty ledger (D2) — `L`, score 5,0 → **big bet #2**
- **MVP:** 3 hạng license (cá nhân/thương mại/mở rộng) × seat/print limit; license text + hash; mỗi đơn digital
  ghi `license_grant` bất biến; ledger royalty từ `order_items`; designer thấy “đã bán quyền gì, bao nhiêu, khi nào”;
  admin duyệt payout; download audit.
- **KPI:** % digital sales dùng license trả phí; royalty payout accuracy 100%; payout cycle ≤7 ngày; dispute <1%.
- **Kiến trúc:** bảng `licenses`, `license_grants`, `payout_ledger`; RLS chặt; Edge ký/verify license + signed URL
  ngắn hạn; không AI.
- **Phụ thuộc:** FL-2b (order_files/signed URL), FL-4 (payout). **Cần luật sư review** điều khoản license VN.

### H2-3 · QC ảnh + chứng nhận + QR verify (W3) — `M`, score 4,0
- **MVP:** lab upload 1–5 ảnh QC + nhập dung sai đo được (không bịa) + xuất “chứng nhận đơn” có QR trỏ trang
  verify công khai; buyer thấy trong `/orders`; admin thấy trong order detail.
- **KPI:** % đơn có QC; claim rate; thời gian xử lý claim; # lượt verify QR.
- **Kiến trúc:** bucket `qc-photos` (private, signed), bảng `qc_reports`; PDF/HTML chứng nhận client-side + QR
  (không cần lib mới; nếu cần PDF chuẩn → H3). Verify RPC công khai theo `qc_token`.

### H2-4 · So sánh giá nhiều xưởng (B3) — `L`, score 3,8 → **big bet #1**
- **MVP:** từ 1 file, trả 3–5 option (xưởng, vật liệu, giá, lead-time) dựa trên `workshop_commission_terms`,
  máy/vật liệu xưởng, capacity; admin duyệt/điều chỉnh; buyer chọn → checkout gắn `assigned_workshop_id`.
- **KPI:** % quote có ≥3 option; price spread; quote→order; dispatch time; on-time.
- **Kiến trúc:** Edge Function fan-out (tính theo rate xưởng, **không lộ cost breakdown** ra client); bảng
  `workshop_rate_cards`/`workshop_capacity`; cache 5–10 phút; **cần ≥8–10 xưởng có rate/capacity thật**.
- **Phụ thuộc:** FL-3 (dispatch write), FL-4 (commission), dữ liệu xưởng. **Không làm trước khi có supply.**

---

## 7. H3 chi tiết — 3 tính năng moat (6–12 tháng)

### H3-1 · Capacity OS + SLA score (W2/W4) — `XL`, score 3,0 → **big bet #1**
Capacity calendar theo máy/vật liệu, auto-routing (admin approve), SLA score công khai, cảnh báo trễ, cam kết
lead-time (B4). **Điều kiện:** ≥15 xưởng thật ở 2 thành phố; dữ liệu on-time tích luỹ ≥3 tháng. **KPI:** utilization,
on-time ≥95%, auto-dispatch acceptance ≥70%, tỷ lệ đơn trễ <3%.

### H3-2 · B2B procurement suite (P5) — `XL`, score 3,0 → **big bet #3 (một phần)**
Team account + phân quyền, PO/approval workflow, hoá đơn điện tử (đối tác MISA/VNPT/Viettel), RFQ nhiều dòng,
báo cáo chi tiêu. **Điều kiện:** FL-5 finance + FL-7 e-invoice; ≥3 khách doanh nghiệp pilot. **KPI:** PO GMV,
team seats, % hoá đơn hợp lệ, ARR B2B.

### H3-3 · Public Quote API + CAD plugin (P3) — `XL`, score 2,4 → **big bet #3**
API key + rate limit + webhook; plugin Fusion/Onshape/SolidWorks “báo giá ngay trong CAD”; docs/developer portal;
parametric SEO catalog (P4) để kéo traffic. **Điều kiện:** API ổn định + auth an toàn; 1 đối tác CAD/plugin store.
**KPI:** API-originated GMV ≥15%; # integration; time-to-first-quote <30s; partner retention.

---

## 8. 3 BIG BETS (đầu tư để tạo moat, không phải “nice to have”)

### BET #1 — **Manufacturing Graph** (B3 + W1/W2/W4 + B4): “báo giá tức thì → điều phối → giao đúng hẹn”
- **Thesis:** giá trị không nằm ở “tính giá”, mà ở **mạng xưởng đã kiểm duyệt + dữ liệu capacity/on-time** để trả lời
  “in ở đâu, bao nhiêu, bao giờ xong, có đền nếu trễ”. Đây là thứ global SaaS không có ở VN và xưởng VN không tự xây.
- **Vì sao bền (moat):** dữ liệu độc quyền (rate card, capacity, defect/on-time theo xưởng/máy/vật liệu) tích luỹ
  theo thời gian; hiệu ứng hai phía (nhiều xưởng → giá/lead-time tốt → nhiều đơn → nhiều xưởng); switching cost vận hành.
- **Điều kiện thành công:** ≥15 xưởng verified có rate + capacity ở 2 hub; ≥60% quote trả ≥3 option; on-time ≥95%;
  admin chấp nhận auto-dispatch ≥70%; take-rate 8–12% giữ được biên.
- **Rủi ro:** supply chậm (phải tuyển xưởng tay), xưởng giữ giá riêng/không cập nhật capacity → cần SLA hợp đồng +
  cập nhật tự động từ MES; không tự động hoá 100% khi chưa đủ dữ liệu (admin duyệt trước).

### BET #2 — **Rights Rail** (D2 + D1/D3/D7 + B8): “mua/bán CAD có giấy phép, trả tiền minh bạch”
- **Thesis:** marketplace CAD thật thất bại vì (a) không ai dám bán license thương mại, (b) không ai tin sẽ được trả.
  Giải cả hai = hạ tầng quyền + royalty tự động + storefront cho designer.
- **Vì sao bền (moat):** dữ liệu license/royalty là **hồ sơ pháp lý + tài chính** không copy được; designer có
  thu nhập/ledger thì rời bỏ đắt; doanh nghiệp cần audit trail license (compliance) → switching cost cao.
- **Điều kiện thành công:** ≥30% digital sales chọn license thương mại/mở rộng; payout accuracy 100%; payout ≤7 ngày;
  dispute <1%; ≥50 designer có storefront active.
- **Rủi ro:** điều khoản license VN cần luật sư; vi phạm bản quyền vẫn xảy ra → watermark/audit/ takedown; payout
  cần KYC/payout provider (FL-7) khi scale.

### BET #3 — **Embedded VCUBE** (P3 + P4 + D4): “báo giá/in ngay trong công cụ kỹ sư đang dùng”
- **Thesis:** kỹ sư không rời Fusion/Onshape để báo giá; nhúng API/plugin + parametric catalog biến VCUBE thành
  hạ tầng chứ không chỉ website. Đây là kênh phân phối B2B khó copy.
- **Vì sao bền (moat):** tích hợp sâu + dữ liệu demand/supply + thói quen workflow; đối thủ muốn copy phải làm lại
  tích hợp + thuyết phục từng đối tác; API-originated demand nuôi Manufacturing Graph.
- **Điều kiện thành công:** ≥3 tích hợp live (1 CAD plugin + 2 partner/webhook); API GMV ≥15%; time-to-first-quote
  <30s; ≥80% partner retention; docs/uptime đạt cam kết.
- **Rủi ro:** app-store duyệt lâu (Autodesk), bảo mật API (key/rate limit/abuse), hỗ trợ đa phiên bản CAD; cần
  đội DevRel/API sau H3.

---

## 9. Kiến trúc & chi phí sơ bộ

### 9.1 Theo top feature

| Feature | DB | Storage | Edge/RPC | AI/3rd-party | Chi phí ước tính/tháng (pilot) | Rủi ro chính | FL dependency |
|---|---|---|---|---|---|---|---|
| B2 Quote Vault | `quotes` + cột token/TTL/status; RPC token | — (tuỳ chọn PDF) | RPC `get_quote_by_token` | — | ~0 (trong Supabase Pro) | link lộ giá; giá snapshot | FL-1 ✅ |
| A1 Ops Inbox | view/query + badge; optional `ops_tasks` | — | — | — | ~0 | query nặng; realtime scale | FL-3/4/6 |
| B1 DFM Report | lưu report JSONB trong quote (tuỳ chọn) | — | — | — | ~0 | heuristic sai → disclaimer rõ | parser ✅ |
| B5 Reviews | `reviews` + media; trigger (có) | `review-photos` bucket | signed URL | — | ≤ $1–5 (vài GB) | spam/PII; moderation | FL-6 |
| B9 Notifications/PWA | `notifications` | — | — | web push (H2) | ~0 | RLS realtime; iOS push | FL-6 |
| D1 Storefront | `designer_storefronts`, `collections`, `follows` | ảnh | prerender (quyết định) | — | ~0–10 | SEO SPA; nội dung | FL-2a ✅ |
| D2 License/Royalty | `licenses`, `license_grants`, `payout_ledger` | signed CDN | Edge verify/license | luật sư; payout provider (FL-7) | fringe; phí payout theo GD | pháp lý; gian lận | FL-2b/4 |
| W3 QC/Cert | `qc_reports` | `qc-photos` | RPC verify QR | — | ≤ $5 | ảnh giả; cert tin cậy | FL-3 |
| B3 Multi-quote | `workshop_rate_cards`, `workshop_capacity` | — | **Edge fan-out** | — | $5–20 (invocations) | cost data lộ; độ chính xác | FL-3/4 |
| W2 Capacity OS/SLA | capacity, `sla_events`, dispatch | — | **Edge cron** routing | — | $10–40 | fairness; ops adoption | FL-3/4/5 |
| P5 B2B procurement | `b2b_accounts`, `team_members`, `purchase_orders`, `approvals` | e-invoice PDF | Edge webhook | **e-invoice** (MISA/VNPT/Viettel) | phí theo hoá đơn + dev | pháp lý/kế toán | FL-5/7 |
| P3 API/Plugins | `api_keys`, `usage`, `webhooks` | — | Edge API gateway + rate limit | CAD app store | $20–100 | bảo mật/abuse | FL-7 |

> **Chi phí hạ tầng:** Supabase Pro (~$25/tháng) + storage/egress theo dùng; Edge invocation rẻ ở quy mô pilot.
> **AI (H2 P2):** nếu dùng Gemini/Claude qua Edge proxy: ước **$50–300/tháng** ở 1–2k phiên tư vấn; phải có
> rate limit + cache + “không train trên dữ liệu CAD khách” trong hợp đồng. **Số tiền là ước lượng để lập ngân sách,
> cần verify báo giá hiện hành trước khi ký.**
> **Không thêm dependency H1.** H2–H3 thêm: Edge Functions (đã có hạ tầng), web-push (tự viết SW, không package),
> e-invoice provider, CAD plugin SDK (repo riêng), có thể Sentry/analytics SaaS (cần duyệt).

### 9.2 Enabler bắt buộc H1 (không tính top 12)

| ID | Enabler | Vì sao bắt buộc | Effort |
|---|---|---|---|
| P0a | **Analytics events + funnel** (bảng `analytics_events`: quote_start, quote_saved, upload, dfm_result, add_to_cart, checkout...) | Không có event thì không đo được KPI của bất kỳ feature nào | S–M |
| P0b | **Feature flags** (bảng `feature_flags` + admin) | Bật/tắt thử nghiệm không cần deploy | S |
| P0c | **Realtime channel `orders` + notification** (RLS theo user) | Nền cho H1-5 và Ops Inbox | S–M |

---

## 10. Roadmap 12 tháng (bảng tổng)

> Mốc tháng tính từ lúc **full-flow FL-2b→FL-6 xong**. Owner roles: **FE** frontend, **BE/Data** backend+DB+Edge,
> **Design** UI/UX, **Ops** vận hành/network, **Growth** SEO/partner.

| Tháng | Horizon | Feature / mốc | Persona | Owner | KPI mục tiêu | Phụ thuộc |
|---:|---|---|---|---|---|---|
| 1 | H1 | P0a Analytics + P0b flags + P0c realtime orders | Platform | BE/Data + FE | 100% event chính; cờ chạy | FL-6 |
| 1–2 | H1 | **B2 Quote Vault** (+ DFM report lưu kèm) | Buyer | FE + BE/Data | 50% quote được lưu; share→order ≥10% | FL-1 |
| 2 | H1 | **B1 Printability Report** (điểm + cảnh báo + gợi ý) | Buyer | FE + Data | 90% upload có report; giảm đơn lỗi 20% | parser |
| 2–3 | H1 | **A1 Ops Inbox & SLA alerts** | Admin/Ops | FE + BE | đơn mới xử lý <2h; quá hạn <5% | FL-3/4 |
| 3 | H1 | **B5 Verified reviews + ảnh** | Buyer | FE + BE/Data | 25% đơn có review; 40% có ảnh | FL-6 |
| 3–4 | H1 | **B9 Notification center + PWA** | Buyer | FE | 30% tracking revisit; PWA install | FL-6 |
| 4–5 | H2 | **D1 Designer storefront + collection** (beta 20 designer) | Designer | FE + Design + Growth | 20 storefront; profile→sale ≥3% | FL-2a, P0 |
| 5–6 | H2 | **D2 License matrix + royalty ledger** (pilot 10 designer) | Designer | BE/Data + FE + Legal | 30% digital sales license trả phí; payout đúng 100% | FL-2b/4 |
| 6–7 | H2 | **W3 QC ảnh + chứng nhận QR** (pilot 5 xưởng) | Workshop/Buyer | FE + Ops | 80% đơn pilot có QC; claim −30% | FL-3 |
| 7–8 | H2→H3 | **B3 Multi-quote** (pilot ≥8 xưởng) → **W1/W2 auto-dispatch + capacity** | Buyer/Workshop | BE/Data + Ops | ≥3 option/quote; on-time ≥90% | FL-3/4 + supply |
| 9–10 | H3 | **W2/W4 Capacity OS + SLA score** production; **B4 lead-time guarantee** | Workshop/Buyer | BE/Data + Ops | on-time ≥95%; auto accept ≥70% | dữ liệu 3 tháng |
| 10–11 | H3 | **P5 B2B procurement pilot** (3 doanh nghiệp; PO/approval; e-invoice) | Admin/B2B | BE/Data + FE + Partner | 3 pilot; PO GMV ≥10% | FL-5/7 |
| 11–12 | H3 | **P3 API + CAD plugin MVP** (1 plugin + webhook) + **P4 parametric SEO** | Platform/Designer | FE/BE + Growth | API GMV ≥5%; organic ↑; 1 integration | FL-7 + API |
| 12 | — | Đo lại toàn bộ north-star, quyết định Year 2 (AI copilot P2, subscription D3, fraud A5) | Platform | Lead + Ops | review OKR | — |

---

## 11. “KHÔNG nên làm” (tránh scope creep)

| # | Không làm | Vì sao |
|---|---|---|
| 1 | **Tự xây payment gateway/escrow/ví điện tử** | Cần giấy phép tài chính, đối soát, chống rửa tiền; đã có adapter + FL-7 đối tác. Tự làm = đốt 6–12 tháng không tạo moat. |
| 2 | **Tự viết CAD kernel / AI sinh mesh 3D / marketplace asset khổng lồ** | `occt-import-js` + parser hiện đủ cho DFM/quote; generative mesh chất lượng thấp, rủi ro bản quyền, chi phí lớn. |
| 3 | **Mạng xã hội/feed/chat cộng đồng tổng quát** | Chi phí moderation + không tạo moat giao dịch; chỉ làm chat gắn đơn/RFQ. |
| 4 | **Native mobile app (iOS/Android) ngay** | PWA + responsive 390 đã đủ cho 12 tháng đầu; 2 codebase = gấp đôi chi phí, chậm roadmap lõi. |
| 5 | **Tự nuôi xưởng in/warehouse/đội giao hàng** | Mô hình marketplace = network; sở hữu tài sản nặng làm mất lợi thế tốc độ và tăng rủi ro tài chính. (Khác: thuê 1 xưởng đối tác làm “reference lab”.) |
| 6 | **Đa quốc gia/đa ngôn ngữ sớm** | VI-only + mạng xưởng VN là lợi thế gần; mở rộng khi take-rate/on-time đã ổn định trong nước. |
| 7 | **AI chatbot tổng quát / tự động trả lời mọi thứ** | Hallucination trong báo giá/kỹ thuật = rủi ro pháp lý; chỉ dùng AI hẹp (giải thích DFM, gợi ý vật liệu) có kiểm soát + disclaimer. |

---

## 12. Rủi ro & câu hỏi cần chủ dự án chốt

### 12.1 Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Supply xưởng không đủ để multi-quote/dispatch | **Cao** | Tuyển tay 8–15 xưởng trước khi build B3/W1; hợp đồng rate/capacity; “reference lab” |
| License/royalty sai pháp lý | **Cao** | Luật sư review license; ledger bất biến; audit; payout qua provider khi scale |
| AI/3rd-party lệch chi phí hoặc lộ dữ liệu CAD | Trung bình | Edge proxy + rate limit + hợp đồng no-train; chỉ bật sau H2; feature flag |
| SEO SPA không prerender | Trung bình | Quyết định SSG/edge ở H2; MVP chấp nhận SEO hạn chế |
| Ops không dùng inbox/auto-dispatch | Trung bình | Thiết kế cùng ops; đo adoption; giữ admin duyệt tay |
| Feature nhiều nhưng KPI không đo được | Cao | P0 analytics bắt buộc **trước** H1; mỗi feature có event + dashboard |
| Team nhỏ (1 builder) | Trung bình | Giữ đúng thứ tự H1; cắt H3 nếu trễ; H2 làm 1 big bet |

### 12.2 Câu hỏi cần chốt (trước khi mở H1)

1. **Định vị 12 tháng:** B2B engineering (PO/e-invoice/API) hay B2C creator (storefront/bundle/subscription)?
   Cả hai đều đúng về dài hạn nhưng H2–H3 nên dồn nguồn lực cho một hướng.
2. **Supply strategy:** VCUBE tự tuyển xưởng hay mở “xưởng tự đăng ký + tự khai capacity”? (ảnh hưởng B3/W1).
3. **Ngân sách AI/3rd-party:** có sẵn sàng chi ~$100–500/tháng + luật sư license/e-invoice trong 6–12 tháng?
4. **North-star:** `quote→paid conversion` hay `GMV/take-rate` hay `on-time-delivery`? (chọn 1 chính + 2 phụ).
5. **Dữ liệu license:** có chấp nhận rủi ro pháp lý ban đầu bằng license “mẫu” + lớn dần, hay cần luật sư ngay H2?
6. **Nhân sự:** 2 FE + 1 BE/Data + Design + Ops có đúng cam kết? Nếu không, cắt H3/ưu tiên BET #2.

---

## 13. North-star & KPI tree (đo sau P0)

**North-star đề xuất:** **số đơn “quote → paid” hoàn tất đúng hạn** (đại diện cả cầu, cung và chất lượng).
- **Cầu:** quote saved, quote→order, PDP→cart, repeat 90d.
- **Cung:** xưởng active/tuần, capacity cập nhật, on-time, defect rate.
- **Tin cậy:** review coverage, claim rate, license compliance, SLA score.
- **Kinh tế:** GMV, take-rate, AOV, CAC/referral, payout cycle.
- **Chất lượng:** pageerror/overflow (đã có), time-to-first-quote, DFM pass rate.

---

## 14. Việc “hygiene” từ product-review (không nằm top 12, phải xong trong full-flow)

| Ưu tiên | Việc | Nguồn |
|---:|---|---|
| FL-2b | `/assets` đọc `order_files` + signed URL + license/download limit | Product review P0 #2 |
| FL-3 | Admin dispatcher **ghi** `assigned_workshop_id`; lab queue thật | P0 #5 |
| FL-3/6 | `/orders` nạp đơn khách + error state; order-success bền | P0 #1/#4 |
| FL-5/6 | `payment_transactions` + đối soát; review write; account/profile; warranty | Top 10 |
| — | Ảnh sản phẩm thật, filter vào URL, bookmark server-side, bỏ banner demo lặp/CTA chết | Top 10 P2 |
| — | `test:unit` wire vào gate-manifest (từ Phase 6 verify) | phase6-verify §10-c |

---

*Hết đề xuất. Bản này là **proposal**, chưa phải cam kết; mọi con số chi phí/thời gian là ước lượng cần xác minh
với báo giá/ngân sách thực tế. Không file `src/**` nào bị sửa; không commit.*
