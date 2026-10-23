<!-- doc-meta: status=active; verified=2026-10-23; owner=pdp-viewer -->
# HANDOFF — Feature ideation & roadmap 12 tháng

> **Work item:** `task-47` · **Agent:** `pdp-viewer` · **Ngày:** 2026-10-23
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `579ef55` · **Read-only `src/**`**
> **Trạng thái: DONE (proposal)** — tài liệu chính: [`docs/tasks/world-class/FEATURE-ROADMAP.md`](../../world-class/FEATURE-ROADMAP.md).
> Không commit; không sửa `src/**`; chỉ ghi 2 file docs.

---

## 1. Deliverables

| File | Nội dung |
|---|---|
| `docs/tasks/world-class/FEATURE-ROADMAP.md` | Cách chấm điểm (I×C/E) + 30 ý tưởng theo 4 persona/platform + top 12 + H1/H2/H3 chi tiết + 3 big bets + kiến trúc/chi phí + roadmap 12 tháng + “không nên làm” + risks/questions + KPI tree + hygiene list |
| Handoff này | Top 12, 3 big bets, khác biệt cạnh tranh lớn nhất, phần chưa chắc, câu hỏi cần chủ dự án chốt |

**Inputs đã đọc:** `docs/tasks/product-review/{README,USER-PERSONAS,FEATURE-MATRIX,UX-ASSESSMENT}.md` (6 persona/72 feature/top 10 pain);
`docs/tasks/world-class/PLAN.md` (FL-0…FL-7; FL-0/1/2a DONE, FL-2b/3/4/5/6/7 còn);
code capabilities tại HEAD `579ef55` (`meshParser` có DFM primitives + STEP/IGES wasm worker; `pricingEngine`;
`integrations/{payment,payout,notification,fileStorage}` adapters; 32 bảng/2 view; 2 storage bucket; 3 realtime channel;
`supabase/functions/calculate-quote` legacy 0 caller; Vercel SPA rewrite, chưa prerender).

---

## 2. Top 12 (tóm tắt — bảng đầy đủ ở roadmap §4)

| # | ID | Tính năng | Horizon | Score | Mức | Phụ thuộc |
|---:|---|---|---|---:|---|---|
| 1 | B2 | Quote Vault (lưu/chia sẻ/chuyển đơn) | H1 | 10,0 | differentiator | FL-1 ✅ |
| 2 | A1 | Ops Inbox & SLA alerts | H1 | 8,0 | nice (nội bộ) | FL-3/4/6 |
| 3 | B1 | Printability Report (DFM score) | H1 | 6,7 | differentiator | parser ✅ |
| 4 | B5 | Verified reviews + ảnh thực tế | H1 | 6,7 | nice (bắt buộc) | FL-6 |
| 5 | D1 | Designer storefront + collection | H2 | 5,3 | differentiator | FL-2a ✅ |
| 6 | B9 | Notification center realtime + PWA | H1 | 5,3 | nice | FL-6 |
| 7 | D2 | License matrix + royalty ledger | H2 | 5,0 | moat | FL-2b/4 |
| 8 | W3 | QC ảnh + chứng nhận + QR verify | H2 | 4,0 | differentiator | FL-3 |
| 9 | B3 | So sánh giá nhiều xưởng | H2 | 3,8 | moat | FL-3/4 + supply |
| 10 | W2 | Capacity calendar + SLA score | H3 | 3,0 | moat | FL-3/4/5 |
| 11 | P5 | B2B procurement (PO/e-invoice/approval) | H3 | 3,0 | moat | FL-5/7 |
| 12 | P3 | Public Quote API + CAD plugin | H3 | 2,4 | moat | FL-7 + Edge |

**Top 5 H1:** ① Quote Vault · ② Ops Inbox & SLA · ③ Printability Report · ④ Verified reviews + ảnh · ⑤ Notification center + PWA.
(Enabler bắt buộc H1, không tính top 12: **P0** analytics events + funnel + feature flags + realtime `orders`.)

---

## 3. 3 BIG BETS

1. **Manufacturing Graph** — “báo giá tức thì → điều phối → giao đúng hẹn” (B3 + W1/W2/W4 + B4):
   moat từ **dữ liệu rate/capacity/on-time của mạng xưởng VN** + hiệu ứng hai phía; global SaaS không có dữ liệu địa phương,
   xưởng địa phương không tự xây software. Điều kiện: ≥15 xưởng verified (rate+capacity) ở 2 hub, ≥60% quote có ≥3 option,
   on-time ≥95%, auto-dispatch admin accept ≥70%.
2. **Rights Rail** — license matrix + royalty ledger + designer storefront + delivery audit (D2 + D1/D3/D7 + B8):
   bán CAD “có giấy phép, trả tiền minh bạch”. Moat = hồ sơ pháp lý/tài chính + thu nhập designer (switching cost),
   compliance audit trail cho doanh nghiệp. Điều kiện: ≥30% digital sales license trả phí, payout đúng 100%,
   payout ≤7 ngày, dispute <1%.
3. **Embedded VCUBE** — Public Quote API + CAD plugin (Fusion/Onshape/SolidWorks) + parametric/programmatic SEO (P3+P4+D4):
   đưa báo giá vào nơi kỹ sư làm việc ⇒ kênh phân phối B2B khó copy. Điều kiện: ≥3 tích hợp live, API GMV ≥15%,
   time-to-first-quote <30s, partner retention ≥80%.

**Khác biệt cạnh tranh lớn nhất (1 câu):** *VCUBE là nơi duy nhất ở VN biến **file CAD thật** thành
**DFM in được + giá & lead-time theo mạng xưởng đã kiểm duyệt + giao file/giấy phép có kiểm soát** trong **một luồng VI** —
không phải “thêm một chợ mẫu 3D”, cũng không phải “thêm một xưởng in”.*

---

## 4. Phần CHƯA CHẮC / giả định cần kiểm chứng

| # | Điều chưa chắc | Cách kiểm chứng |
|---|---|---|
| U1 | Nhu cầu **multi-quote/lead-time guarantee** có đủ lớn ở VN? | Phỏng vấn 10–15 khách B2B + đo % quote hiện tại được gửi ra ngoài (Zalo/email) |
| U2 | Xưởng sẵn sàng công khai rate/capacity? | Pilot 3–5 xưởng, đo tỷ lệ cập nhật capacity/tuần |
| U3 | Designer sẵn sàng bán license thương mại? | Khảo sát 20 designer; thử 2 hạng license ở 1 nhóm |
| U4 | AI copilot (P2) có tạo giá trị hơn chi phí? | Chỉ đánh giá sau H1 metrics; A/B 1 use-case tư vấn vật liệu |
| U5 | SEO SPA có đáng đầu tư prerender? | Đo organic hiện tại; quyết định kiến trúc ở đầu H2 |
| U6 | Team capacity thực tế (2 FE+1 BE+Design+Ops)? | Chốt với chủ dự án — nếu 1 builder thì roadmap giãn 2×, cắt H3 |
| U7 | Chi phí e-invoice/AI/Edge thực tế | Lấy báo giá nhà cung cấp trước khi cam kết H2/H3 |

---

## 5. Câu hỏi cần chủ dự án quyết (chặn mở H1)

1. **Định vị 12 tháng:** ưu tiên B2B engineering (PO/e-invoice/API) hay B2C creator (storefront/bundle/subscription)?
2. **Supply strategy:** tuyển xưởng tay hay mở đăng ký tự khai capacity? (quyết định độ khó BET #1)
3. **Ngân sách:** có sẵn sàng ~$100–500/tháng cho AI/Edge + phí luật sư license/e-invoice trong 6–12 tháng?
4. **North-star:** chọn 1 chính — quote→paid conversion / GMV-take-rate / on-time delivery?
5. **License pháp lý:** dùng license mẫu + tăng dần, hay cần luật sư review ngay H2 (BET #2)?
6. **Nhân sự cam kết:** đúng 2 FE + 1 BE/Data + Design + Ops?

---

## 6. Ràng buộc đã giữ

- **Read-only `src/**`** — không sửa code; không commit.
- Không đề xuất đổi theme/layout tổng thể (theo yêu cầu product-review/UX assessment).
- **H1 không thêm dependency** (chỉ Supabase DB/Storage/Realtime/RPC + Vite hiện có).
- Mọi feature có KPI đo được + dependency FL rõ; AI/3rd-party chỉ H2–H3.
- Không bịa số liệu người dùng/đối thủ; chi phí ghi rõ là **ước lượng cần verify**.

---

## 7. Gate tự kiểm

| Gate | Kết quả |
|---|---|
| Top 12 đủ impact×confidence/effort + H1 4–6/H2 4–6/H3 3–4 | ✅ 5/4/3 |
| Mỗi top feature có vấn đề + persona + KPI + effort + dependency + mức cạnh tranh | ✅ roadmap §4–§7 |
| Có 3 big bets + lý do bền + điều kiện thành công | ✅ roadmap §8 |
| Có kiến trúc/chi phí + rủi ro + dependency FL | ✅ roadmap §9 |
| Có “không nên làm” 3–5 mục | ✅ 7 mục (roadmap §11) |
| Có roadmap 12 tháng dạng bảng | ✅ roadmap §10 |
| Không sửa `src/**`, không commit | ✅ `git status --short src/` rỗng |
