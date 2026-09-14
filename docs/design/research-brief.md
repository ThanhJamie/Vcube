# Research brief — thị trường, tuyến báo giá, design system, a11y

Bản ghi nghiên cứu dùng làm căn cứ cho `docs/plans/05-feature-roadmap.md` và `docs/design/tokens.md`.
**Quy ước:** mọi khẳng định kèm link nguồn; suy luận ghi `ASSUMPTION:`; phần "số liệu cấm dùng" ở §7 liệt kê các con số **không có nguồn gốc** và không được xuất hiện trong tài liệu bán hàng.

---

## 1. Teardown đối thủ (trạng thái 2025–2026)

| Đối thủ | Mô hình | Bài học cho VCUBE |
|---|---|---|
| **Craftcloud** (All3DP) | Aggregator: upload → chọn 3D print/CNC → cấu hình → **báo giá thời gian thực từ nhiều xưởng** → cart | **Không cần đăng nhập để xem giá** (nói rõ trên trang upload); drop zone là đối tượng chính của hero; nêu rõ 500MB + danh sách định dạng **trước khi thả**; 4 thống kê tin cậy (ISO, 190+ xưởng, 8M+ part, 200+ vật liệu); bảo hành 12 tháng (consumer) / 6 tháng (business), đổi/thay hoặc sửa trước. Không thu phí dịch vụ — giá = giá xưởng. ([upload](https://craftcloud3d.com/en/upload), [support 210](https://support.craftcloud3d.com/en/articles/210-how-does-craftcloud-work-and-what-services-are-provided), [T&C](https://craftcloud3d.com/en/p/terms-and-conditions)) |
| **JLC3DP** | Nhà máy tích hợp dọc | **Bắt buộc tài khoản mới xem được báo giá** (đối chứng ngược với Craftcloud); hiện giới hạn kỹ thuật ngay tại chỗ upload (wall > 1.2mm, chi tiết mỏng ≥ 0.8mm, 100MB, ≤10 file); **phụ phí minh bạch** (part phức tạp/rỗng, cạnh dài ≥250mm: từ $8/part, +1–2 ngày); kỹ sư review 4–6 giờ trước khi thanh toán; ISO 9001, PCI DSS; live chat in trên trang báo giá. ([quote](https://jlc3dp.com/3d-printing-quote), [how to order](https://jlc3dp.com/help/article/how-to-place-a-3d-printing-order), [special charges](https://jlc3dp.com/help/article/218-3D-Printing-Special-Charges-Case)) |
| **Protolabs Network** (Hubs) | Mạng lưới 250–300+ xưởng | **98% part tự động báo giá**; giá cuối cùng gồm ship + QC + thông quan; **khoá giá 30 ngày** + chia sẻ/tải báo giá nhiều phiên bản; NDA ký điện tử + **tự động ẩn thông tin trên bản vẽ kỹ thuật**; QC cross-dock Amsterdam/Chicago; "Raise an Issue" trong 90 ngày, xử lý 1–3 ngày làm việc; Team Account + **NET 30 + PO**. ([quote](https://www.hubs.com/help-center/how-to-get-a-quote/), [ordering](https://www.hubs.com/how-ordering-works/), [IP](https://www.hubs.com/ip-protection/), [team](https://www.hubs.com/team-account/)) |
| **Xometry** | Engine báo giá AI | Tab **"Analyze"** = kiểm tra DFM tự động + viewer 3D ngay cạnh báo giá; lead time chọn được (economy/standard/expedited) và **đổi giá tức thì**; công bố tiêu chuẩn gia công **kèm changelog**, tách dung sai prototype vs production; NET 30/PO/Punchout, **không nhận PayPal**; "Forward to Purchaser". ([how it works](https://www.xometry.com/how-xometry-works/), [standards](https://www.xometry.com/manufacturing-standards/)) |
| **Shapeways** (2024–nay) | **Bỏ hẳn mảng tiêu dùng**, chỉ B2B công nghiệp | Marketplace/creator shop cũ **không thể khôi phục** (mất dữ liệu + hạ tầng hỏng); 2/7/2024 phá sản Chapter 7, 1/8/2024 Manuevo BV mua tài sản Shapeways BV, 3/12/2024 relaunch với đồng sáng lập cũ, 18/12/2024 **mua lại Thangs** (cộng đồng chia sẻ file) như bước 2 của kế hoạch; T&C nói rõ "intended for businesses", **không** dành cho cá nhân; **đơn tối thiểu $25**; reprint/refund trong 7 ngày. ([DEVELOP3D](https://develop3d.com/3d-printing/shapeways-3d-printing-service-returns-in-hands-of-original-founders/), [T&C](https://www.shapeways.com/terms-and-conditions), [Thangs](https://www.shapeways.com/presscorner/shapeways-acquires-thangs)) |
| **Sculpteo** (nay thuộc 3D Prod/Platex, **không còn BASF**) | Xưởng + nền tảng | **Mô hình lead time tốt nhất trong nhóm:** Economy (chỉ PA12 SLS/MJF, ~15 ngày, **rẻ hơn tới 30%**, tối thiểu €10/part) / Standard (2–15 ngày) / Express (2 ngày, **đắt hơn tới 50%**); **Batch Control từ 20 đơn vị cùng file giảm tới 80%**; **bắt tài khoản mới xem báo giá**; bảng giá ship công khai; eKomi 4.58/5. ([price & delivery](https://www.sculpteo.com/en/pricing/price-and-delivery/), [3D Prod merger](https://www.tctmagazine.com/3d-prod-and-sculpteo-announce-merger/)) |
| **Treatstock** | Marketplace phân tán | **Hai đường báo giá song song**: instant quote **và** RFQ thủ công tới xưởng đã chọn; "Compare Suppliers", "Buyer Protection"; có nhánh **thuê designer** rồi bán lại file; 6 ngôn ngữ; công cụ cho xưởng (tính giá, quản lý đơn, API). ([how it works](https://www.treatstock.com/site/how-it-works)) |
| **PCBWay 3D** | Cross-sell từ PCB | Trang **quy trình tranh chấp/hoàn tiền** công khai như một trang quy trình; coupon gắn tài khoản; production status là màn hình cấp 1; **không có guest checkout**. ([3D printing](https://www.pcbway.com/rapid-prototyping/3d-printing/)) |
| **RapidDirect** | AI + mạng xưởng | Hero **chứa drop-zone hoạt động** + liệt kê 14 định dạng nhận; **không MOQ**; Teamspace chia sẻ báo giá, duyệt 1 click, **ảnh kiểm tra chất lượng gắn vào đơn**; chat có **annotation trên file**. ([homepage](https://www.rapiddirect.com/), [Teamspace](https://www.rapiddirect.com/our-platform/teamspace/)) |
| **FacFox** | Marketplace TQ | **Giá auto-quote KHÔNG phải giá cuối** (có thể tăng sau review kỹ thuật) — phải nói rõ điều này nếu VCUBE làm tương tự; **viewer 3D không hiển thị model thật** theo T&C → nếu VCUBE render proxy thì **buộc phải công bố**; Buyer Protection cụ thể nhất (30 ngày, 4 hình thức xử lý); NDA tự ký online; đơn tối thiểu $30/vật liệu. ([FAQ](https://facfox.com/docs/faq), [T&C](https://facfox.com/terms/), [Buyer Protection](https://facfox.com/docs/kb/buyer-protection)) |

**Hàm ý chiến lược cho VCUBE**
1. **Không gate báo giá sau đăng nhập** — đây là lựa chọn tốn kém nhất (18% lý do bỏ giỏ là bị buộc tạo tài khoản; trải nghiệm không gate chuyển đổi 7–9% so với 3–5% khi gate).
2. **Sao chép mô hình lead time của Sculpteo** (3 mức + delta giá + batch discount) — rõ ràng và dễ hiểu nhất.
3. **Đưa DFM lên ngang tầm báo giá** (tab Analyze của Xometry + kiểm tra ngay khi upload của JLC3DP).
4. **Bán cho B2B bằng bàn giao có kiểm soát**: báo giá tải được/chia sẻ được, Zalo để chốt, hoá đơn đúng.

---

## 2. Thị trường Việt Nam

### 2.1 Đối thủ thật (một số tên trong tài liệu tham khảo cũ **không tồn tại**: `mko3d.com`, `hatu3d.com` là NXDOMAIN; `3dlab.vn` lỗi delegation)

| Đơn vị | Mô hình & điểm đáng học |
|---|---|
| **GN3D Studio** (TP.HCM) | Gần VCUBE nhất: upload STL/OBJ/3MF → **auto-quote bằng PrusaSlicer trong ~30 giây**; **VietQR tự động + đối soát giao dịch** ("không cần chụp màn hình gửi nhân viên"); **đẩy trạng thái qua Zalo ZNS/SMS** (bắt đầu in → hoàn thành → đóng gói → vận chuyển); **công bố công thức giá** `(khối lượng nhựa × đơn giá) + (giờ in × 8.000đ)` và bảng giá PLA 900đ/g, PETG 1.000đ/g, ABS/PETG-HF 1.600đ/g, TPU 1.800đ/g; dung sai ±0.1mm, layer 0.08–0.28mm, bàn 400×400×400; **NDA + tự sửa mesh + tự xoá file sau 7 ngày**; VI/EN/ZH + ~25 landing theo quận. ([gn3dstudio.com](https://gn3dstudio.com/bang-gia-in-3d)) |
| **DIGMAN** (Hà Nội) | Incumbent B2B: 100+ máy chạy 24/7, FDM/SLA/SLS/DLP/MJF + SLM kim loại, part lớn tới 1500×1000×1200mm; **báo giá chỉ qua Zalo/Facebook/Email/hotline trong 30 phút, không self-serve**; quy trình bước 3 là "**Chốt in. Ký hợp đồng & cam kết bảo mật**"; mời khách tới xưởng; 2.000+ khách doanh nghiệp. ([digman.vn](https://digman.vn/dich-vu-in-3d-theo-yeu-cau/)) |
| **Good Gearz** (TP.HCM, Bambu Lab) | Công bố giá theo gram (1.200đ/g PLA/PETG; 1.800–2.800đ/g chịu lực; 3.000–5.000đ/g chi tiết cao); báo giá qua Zalo 30 phút; **quy tắc đặt cọc công bố**: ≥500.000đ đặt 50%, dưới thì 100%, **không hoàn tiền sau khi in xong**; có badge **online.gov.vn**; bán cả trên Shopee. ([goodgearz.com](https://goodgearz.com/bang-gia-in-3d/)) |
| **3DMaker**, Vinnotek, 3D Vạn Lộc, 3DCubix, 3DCoreTech… | Cùng mô hình: báo giá qua chat, SLA/FDM, ít tự phục vụ. ([3dmaker.vn](https://www.3dmaker.vn/pages/dich-vu-in-3d-theo-yeu-cau-hcm)) |
| **Inkiri** | Công cụ tính giá phía xưởng (có phí sàn) + generator name-tag — nguồn gốc công thức "Inkiri" mà VCUBE đang dùng. ([inkiri.vn](https://inkiri.vn/3d-calc-cost/)) |
| **Shopee** | Kênh volume, **chat-first**: mọi listing ghi "KHÔNG ĐẶT HÀNG KHI CHƯA NHẮN TIN"; giá 550–1.200đ/g; khách mua "voucher dịch vụ in 3D" bằng đúng giá đã thoả thuận. |

**Kết luận:** **không có marketplace file CAD in 3D nào ở VN**; file 3D giao dịch chủ yếu trong group Facebook. VCUBE đang làm việc chưa ai làm — nhưng khách quen chốt qua chat, nên luồng self-serve phải **kèm đường bàn giao Zalo**.

### 2.2 Thanh toán

- **VietQR (NAPAS)**: mã do merchant trình bày, chuẩn EMVCo + chuẩn QR cơ sở của NHNN; danh sách thành viên gồm MoMo, ZaloPay, Payoo, VNPAY, Ngân Lượng… → **một QR, không phải tích hợp từng ví**. ([napas.com.vn](https://www.napas.com.vn/dich-vu-thanh-toan-bang-ma-qr))
- **VietQR.io / payOS**: API công khai, nhúng 1 dòng ảnh QR; **payOS xác nhận chuyển khoản qua bank Open API → đơn tự động settle, khách không phải gửi ảnh chụp**. Tra cứu MST để tự điền thông tin hoá đơn. ([vietqr.io](https://vietqr.io/), [payos.vn](https://payos.vn/thu-ho/))
- **Quy mô & thói quen:** 2024 có 17,7 tỷ giao dịch không tiền mặt (+56% lượng, +32% giá trị, ≈26× GDP); ~200 triệu tài khoản thanh toán cá nhân. **Nhưng 77,5% người mua online vẫn chọn COD** vì thói quen và **sợ bị lừa**; nghiên cứu khác ghi COD >80% kèm tỉ lệ trả hàng 15–20%. → **COD phải là lựa chọn hạng nhất**, và niềm tin phải được xây bằng chứng cứ pháp lý. ([VietnamNet](https://vietnamnet.vn/gia-tri-thanh-toan-khong-dung-tien-mat-nam-2024-gap-26-lan-gdp-2425387.html), [VietnamBiz](https://vietnambiz.vn/nghich-ly-tmdt-viet-nam-775-nguoi-tieu-dung-van-chon-thanh-toan-bang-tien-mat-khi-nhan-hang-2025615192910833.htm))
- BNPL rẻ và nhanh: MoMo "Ví Trả Sau" mở trong 3 phút, 33.000đ/tháng; ZaloPay thanh toán được **ngay trong luồng chat Zalo**. `ASSUMPTION:` tỉ lệ thẻ tín dụng nội địa thấp — coi card là đường phụ.

### 2.3 Vận chuyển (rủi ro biên lợi nhuận)

- **GHTK**: Express <20kg, tối đa 100cm/cạnh; nội thành HN/HCM 22.000–30.000đ/3kg; liên miền 30.000–40.000đ/0.5kg rồi +2.500–10.000đ mỗi 0.5kg. **Điểm chí tử: hệ số thể tích chia 6000 cho Express nhưng chia 4000 cho hàng cồng kềnh** — sản phẩm in 3D nhẹ nhưng cồng kềnh nên **bị tính lại theo thể tích**. Hàng cồng kềnh BBS 20–300kg: 90.000–520.000đ. COD thu hộ miễn phí nhưng **đối soát 5.500đ/giao dịch, thanh toán 1–3 lần/tuần**. ([ghtk.vn](https://ghtk.vn/bang-gia-dich-vu-ghtk/))
- **GHN**: từ 15.500đ/đơn, 34 tỉnh; giao trong ngày do **Ahamove**. **J&T**: 34 tỉnh, 1.900 bưu cục, hỗ trợ qua Zalo OA.
- **Hàm ý:** phải **kiểm tra thể tích (bounding box) ngay khi báo giá** và hiển thị ước tính phí ship theo thể tích; nếu không, đơn hàng cồng kềnh sẽ ăn hết biên lợi nhuận.

### 2.4 Dấu hiệu niềm tin thực sự có tác dụng ở VN

1. Badge **"Đã thông báo Bộ Công Thương"** (online.gov.vn) — Good Gearz, GHTK, GHN, J&T đều hiển thị. ([mẫu](http://online.gov.vn/Website/chi-tiet-129619))
2. **Bảng giá theo gram công bố công khai** (GN3D, Good Gearz).
3. **Số Zalo là CTA chính** thay vì nút thanh toán.
4. **Địa chỉ xưởng thật + mời tới thăm + hồ sơ năng lực tải được** (DIGMAN).
5. **Hợp đồng + cam kết bảo mật** trước khi in; NDA tự động.
6. **Quy tắc đặt cọc công bố**, không thương lượng từng đơn.
7. Ảnh xưởng thật, gallery dự án.

`ASSUMPTION:` với B2B, **hoá đơn VAT điện tử là điều kiện mua** — nên thu MST ngay ở bước thanh toán (đúng lý do VietQR.io có API tra cứu MST).

### 2.5 B2B

940.078 doanh nghiệp đang hoạt động (31/12/2024), **~98% là SME**; SME chiếm 51% việc làm và >40% GDP. Nhưng **B2B trong ngành này không tự checkout — họ báo giá qua chat/email**. → Luồng thực tế nên là: **self-serve instant quote → bàn giao Zalo để xác nhận và đặt cọc**; hợp đồng/NET terms để sau.

---

## 3. Tuyến báo giá tốt nhất (tổng hợp)

### 3.1 Funnel 6 bước

| # | Bước | Người dùng thấy | Hoãn lại |
|---|---|---|---|
| 0 | Hero | toggle quy trình + drop zone + ràng buộc định dạng/dung lượng + 3 trust chip + "không cần tài khoản" | mọi thứ khác |
| 1 | Đang phân tích | tiến trình xác định (%, dung lượng, ETA) + nút huỷ; **không** dùng skeleton cho thao tác upload/compute | — |
| 2 | Giá tức thì | 1 con số + kích thước bao + thể tích + khối lượng + lead time + bậc số lượng + "vì sao giá này"; ghi rõ nếu cần kỹ sư xác nhận | hoàn thiện, hoá đơn, tài khoản |
| 3 | Cấu hình | vật liệu → màu → hoàn thiện → số lượng hiện mặc định | infill, layer, supports, dung sai, ren, kiểm tra, chứng nhận → gom vào **1** mục "Cài đặt nâng cao" |
| 4 | Giỏ/thanh toán | 7–8 field, guest checkout, VietQR/COD/chuyển khoản, quy tắc đặt cọc, MST, phí ship theo thể tích | tạo tài khoản (để sau khi đặt xong) |
| 5 | Sau báo giá | tải PDF · email · "Gửi cho người duyệt" · bàn giao Zalo | NET terms, PO, hợp đồng |

### 3.2 Anatomy widget báo giá ở hero
1. Toggle quy trình ở trên cùng (3D print / CNC / laser).
2. **Drop zone là đối tượng tương tác chính**, không phải nút CTA; luôn có đường click chọn file (drag-and-drop một mình không đủ và dễ lỗi).
3. **Nêu ràng buộc trước khi thả** (dung lượng, định dạng, số file) — không để phát hiện sau khi lỗi.
4. **Đúng 3 trust chip**.
5. **Câu cam kết bảo mật/NDA ngay trong widget**.
6. **Đường thứ hai cho người không có file**: yêu cầu báo giá thủ công + Zalo.
7. **Không** gate đăng nhập, không CAPTCHA trước khi thấy giá.
8. Nút chính nói rõ payoff ("Nhận giá tức thì"), không phải "Upload".

### 3.3 Progressive disclosure
- Tối đa **2 tầng** tiết lộ; quá 2 tầng người dùng lạc.
- Thứ dùng thường xuyên phải ở tầng 1 (vật liệu, số lượng, màu, cấu thành giá).
- Nhãn của mục mở rộng phải nêu nội dung ("Cài đặt in nâng cao: infill, layer, supports, dung sai"), không chỉ "Nâng cao".
- Tuỳ chọn làm đổi giá/lead time rõ rệt phải có chip delta giá ở tầng 1.
- Trạng thái nâng cao phải được lưu vào báo giá (cũng là yêu cầu WCAG 3.3.7 — không bắt nhập lại).

### 3.4 10 luật UX có bằng chứng
1. **Xem giá trước đăng nhập** (18% bỏ giỏ vì bị buộc tạo tài khoản).
2. **Hiện tổng tiền gồm ship/thuế trước khi vào checkout** (40% lý do bỏ giỏ là chi phí phát sinh; 21% vì không thấy tổng tiền).
3. **Checkout 7–8 field**, guest checkout mặc định.
4. **Ngân sách phản hồi:** <1s không hiện gì; 1–10s spinner theo module hoặc skeleton đúng layout; >10s phải có % và nút huỷ. Với tương tác 3D, 0.1s là ngưỡng "cảm giác điều khiển trực tiếp".
5. **Không dùng skeleton cho upload/compute** — dùng progress bar/wizard.
6. **DFM tự động + kỹ sư xác nhận trước khi tính tiền**.
7. **Lead time theo ngày, không chỉ theo nhãn tốc độ** (nhãn bắt người dùng tự tính).
8. **Giải thích được giá** (công thức + breakdown từng dòng).
9. **Nêu phụ phí tại thời điểm báo giá**, không phải lúc xuất hoá đơn.
10. **Chỉ số 3D có tác dụng chuyển đổi** (Shopify công bố +94% conversion khi thêm nội dung 3D; case Gunner Kennels +3% cart, +40% order, −5% return) — nhưng là số liệu nhà cung cấp/nền tảng, không phải nghiên cứu độc lập.

**Chỉ số tải trang (đo được, độc lập):** nghiên cứu Deloitte/Google trên 37 thương hiệu, 30M+ phiên, đo theo giờ trong 30 ngày: cải thiện **0.1s** làm tăng **+8.4%** conversion bán lẻ, **+9.2%** chi tiêu, PDP→add-to-cart **+9.1%**. Google/SOASTA: từ 1s → 10s, xác suất thoát trên mobile tăng **123%**. ([web.dev](https://web.dev/case-studies/milliseconds-make-millions))

**Ngưỡng UI:** chữ ≥4.5:1, chữ lớn/đồ hoạ ≥3:1, viền control & focus ring ≥3:1; vùng bấm 44×44 (Apple) / 48×48 (Material) — **xây ở 48×48 với khoảng cách ≥8px** để thoả cả ba chuẩn.
**Kiểm thử form:** validate **khi blur** nhanh hơn 7–10s so với validate khi đang gõ; form theo guideline đạt **78% submit một lần** so với 42%; **34% người bắt đầu form không hoàn thành**; sửa mất dữ liệu khi bấm Back có thể tăng conversion **tới 10%**.

---

## 4. Bộ tham chiếu UI & pattern chuyển hoá

| Sản phẩm | Pattern lấy được |
|---|---|
| Linear | Nền gần trung tính + **một accent chỉ dùng cho fill/CTA**, không trang trí |
| Vercel/Geist | **Type class theo vai trò** (heading/label/copy/button) + **thang màu đánh số** + bảng dữ liệu có luật rõ + ⌘K |
| Stripe | Hero nêu kết quả + đường "chưa biết bắt đầu từ đâu" |
| Raycast | **Bàn phím làm ảnh hero** thay vì screenshot; nêu thông số hiệu năng cụ thể |
| Superhuman | Palette ⌘K là surface chính; **công thức dark theme** (5 sắc xám, surface gần hơn thì sáng hơn, không dùng #000/#FFF, chữ trắng 90%) |
| Resend | Hero tối + khối code; **docs là một surface sản phẩm** |
| Figma | Token là đối tượng hạng nhất, có **mode** cho light/dark |
| Palantir Foundry | IA cấp tài liệu: cây chức năng bên trái + TOC bên phải |
| nTop / Onshape / Protolabs | Bán **quy trình** chứ không bán đăng ký; bảng so sánh process (vật liệu / kích thước tối đa / chi tiết nhỏ nhất / dung sai) chính là nội dung |
| Retool / Carbon / Grafana | **Density là trục token**, không phải quyết định từng màn; màu theo scheme có tên; filter chia sẻ được qua URL |
| Sentry | **Saved views** + dấu "đã sửa" cho bộ lọc |
| Spline / Onlook | Chrome của editor 3D: rail trái (đối tượng/tài nguyên) + tab stage + **một inspector theo ngữ cảnh** |

**12 nguyên tắc thiết kế có thể trích dẫn**
1. Cặp token semantic (`background`/`foreground`, `card`, `muted`, `border`, `ring`) để đổi theme không phải viết lại component.
2. Thang màu 12 bậc với quy ước cố định (1–2 nền, 3–5 nền component, 6–8 viền/focus, 9–10 solid, 11–12 chữ).
3. Ngưỡng tương phản: 4.5:1 chữ thường; 3:1 chữ lớn và mọi thông tin nhận diện control/trạng thái/focus ring.
4. Focus là **trạng thái được thiết kế** — hiện rõ, không giới hạn thời gian, không bị chrome che.
5. Vùng bấm cho ngón tay: 24×24 là sàn AA, 44×44 là AAA, xây ở **48×48 + ≥8px khoảng cách**.
6. Density là trục token (32/40/48px hàng).
7. Hai bộ type cho hai việc (productive 14px vs expressive 16px) + **tabular-nums cho mọi số**.
8. Radius suy từ 1 giá trị gốc.
9. Elevation là **vật liệu có tên**, phải kiểm lại ở dark (shadow yếu hơn) và không dùng shadow làm tín hiệu duy nhất.
10. Motion 200–300ms, `ease-out` khi vào, spring cho thay đổi không gian, **không bao giờ bắt đầu từ scale(0)**.
11. Tôn trọng `prefers-reduced-motion` (thay chuyển động bằng opacity); mọi chuyển động tự chạy >5s phải có nút dừng.
12. **Canvas WebGL là một hình ảnh với screen reader**: phải có tên truy cập + mô tả dài, và **proxy DOM button 1-1 cho từng vùng tương tác**.

---

## 5. Baseline a11y & mobile cho app WebGL

**Rủi ro WCAG 2.2 AA đặc thù WebGL**

| Tiêu chí | Yêu cầu | Cách app CAD vi phạm |
|---|---|---|
| 1.1.1 Non-text Content (A) | Có text alternative tương đương | `<canvas>` không phơi đối tượng đã vẽ |
| 1.3.1 Info and Relationships (A) | Cấu trúc xác định được bằng máy | Trạng thái cấu hình, dòng giá, bảng admin là div + pixel |
| 1.4.3 Contrast (AA) | 4.5:1 chữ thường, 3:1 chữ lớn | Nhãn vẽ bằng GL trên nền mờ |
| 1.4.4 Resize Text (AA) | Phóng được 200% | `user-scalable=no` (axe: Critical) |
| 1.4.10 Reflow (AA) | Không cuộn 2 chiều ở 320px | Ngoại lệ chỉ áp cho phần canvas, **không** cho giá/vật liệu/cart |
| 1.4.11 Non-text Contrast (AA) | 3:1 cho control và trạng thái | Viền bbox, gizmo, thumb slider, chỉ báo vật liệu đang chọn |
| 1.4.13 Content on Hover (AA) | Dismissible, hoverable, persistent | Tooltip mesh biến mất khi rời chuột |
| 2.1.1 Keyboard (A) | Mọi chức năng dùng được bằng bàn phím | Xoay/pan/zoom chỉ bằng chuột |
| 2.2.2 Pause, Stop, Hide (A) | Chuyển động tự chạy >5s cần nút dừng | Auto-rotate; pause chỉ khi đang focus **không** tính |
| 2.4.7 / 2.4.11 | Focus hiện rõ, không bị che | Toolbar chỉ trong canvas; sticky bar che control |
| 2.5.1 Pointer Gestures (A) | Cử chỉ đa điểm cần thay thế 1 điểm | Pinch zoom mà không có nút +/− |
| 2.5.7 Dragging Movements (AA) | Mọi thao tác kéo phải có cách không-kéo | Kéo để xoay/pan; **tiêu chí này áp dụng cả khi canvas tự chặn cuộn trang** |
| 2.5.8 Target Size (AA) | 24×24 | Swatch màu, thumbnail, hành động trong hàng bảng |
| 3.3.7 Redundant Entry (A) | Không bắt nhập lại | Upload lại sau bước lỗi, nhập lại địa chỉ |
| 4.1.3 Status Messages (AA) | Thông báo trạng thái xác định được bằng máy | Cập nhật giá bất đồng bộ không có `role="status"` |

**Kỹ thuật canvas**
- Spec yêu cầu **fallback nội dung** tương đương chức năng; remedy chính thức là **ánh xạ 1-1 vùng tương tác sang phần tử focus được** → đặt `<button>` DOM thật đè lên canvas.
- `addHitRegion()` **đã bị xoá khỏi spec**; `drawFocusIfNeeded()` vẫn còn.
- Cho canvas `role="img"` + tên truy cập (tên part, kích thước, thể tích, bounding box) + `aria-describedby` mô tả dài.
- `webglcontextlost` **phải gọi `preventDefault()`**, nếu không context không được đánh dấu khôi phục được; khi restore **phải tạo lại toàn bộ texture/buffer** và có fallback DOM.
- `aria-live="polite"` cho giá cập nhật; `role="status"` cho thông báo không cần focus; không dùng `role="alert"` + `aria-live` cùng lúc (VoiceOver iOS đọc 2 lần).

**Mobile**
- Meta viewport: `width=device-width, initial-scale=1, viewport-fit=cover`, **không** chặn zoom (`maximum-scale` ≥ 2).
- Safe area: `padding-*: max(12px, env(safe-area-inset-*))` cho sticky bar và toolbar dưới.
- Bottom sheet cho chọn vật liệu/thông số trên mobile; dialog blocking chỉ cho hành động không thể hoàn tác.
- **3D gesture:** đặt `touch-action: pan-y pinch-zoom` trên stage (không bao giờ `none`), `overscroll-behavior: contain`; **không** dựa vào `preventDefault()` trên `touchmove` (trình duyệt đã đặt passive mặc định và bỏ qua lời gọi).
- `navigator.virtualKeyboard.overlaysContent` + `env(keyboard-inset-height)` để CTA không bị bàn phím che.

---

## 6. Tham chiếu pháp lý VN (chi tiết thi công ở `docs/plans/06-supabase-vercel.md` §4)
- **NĐ 52/2013/NĐ-CP** (sửa bởi **85/2021/NĐ-CP**): nghĩa vụ của website cung cấp dịch vụ TMĐT (sàn) — đăng ký/thông báo, công bố điều khoản, chính sách bảo mật, quy trình giải quyết tranh chấp.
- **NĐ 13/2023/NĐ-CP** (PDPD): sự đồng ý, mục đích, 11 quyền của chủ thể dữ liệu, thông báo vi phạm.
- **Luật 19/2023/QH15** (BVNTD, hiệu lực 01/7/2024): thông tin giao dịch phải chính xác/đầy đủ; trách nhiệm về chất lượng.
- **NĐ 70/2025/NĐ-CP**: hoá đơn điện tử.
- **QĐ 1813/QĐ-TTg**: khuyến khích thanh toán QR.

---

## 7. Danh sách số liệu CẤM dùng (không có nguồn gốc)

| Số liệu thường được trích | Vấn đề |
|---|---|
| "Mỗi field tăng thêm làm mất ~8% conversion" | Không có nghiên cứu gốc; bản gần nhất quy cho một nghiên cứu giấu tên (4,1%/field). Cùng với phát hiện của Zuko rằng **số lượng input không phải yếu tố quyết định** → không dùng cả hai. |
| "53% người dùng bỏ trang sau 3 giây" | Sai nguồn: con số 53% thật là "53% trang nặng hơn 2MB". |
| "24% / 26% / 34% bỏ giỏ vì bị buộc tạo tài khoản" | Các bản 24/26/34% là truyền miệng; con số có nguồn là **18%**. |
| "5.2 bước / 11.8 field là trung bình checkout" | Bản cũ (2021); bản hiện tại 5.1 bước / 11.3 field, và **số bước ít quan trọng hơn số field**. |
| "Multi-step form tăng X% conversion" (86%, ~300%…) | Không có nghiên cứu primary; các bản đều là vendor hoặc second-hand. Không đưa vào design doc. |
| "Video tăng 80% conversion", "$12M từ một field" (Expedia), "$300M button" (UIE) | Không kiểm chứng được / là claim nhà cung cấp. |
| Số liệu bỏ dở riêng cho upload file | **Không tồn tại** nghiên cứu; đừng bịa. |

---

## 8. Nguồn (đã dùng)

**Đối thủ:** [Craftcloud upload](https://craftcloud3d.com/en/upload) · [Craftcloud support 210](https://support.craftcloud3d.com/en/articles/210-how-does-craftcloud-work-and-what-services-are-provided) · [Craftcloud T&C](https://craftcloud3d.com/en/p/terms-and-conditions) · [JLC3DP quote](https://jlc3dp.com/3d-printing-quote) · [JLC3DP how to order](https://jlc3dp.com/help/article/how-to-place-a-3d-printing-order) · [JLC3DP special charges](https://jlc3dp.com/help/article/218-3D-Printing-Special-Charges-Case) · [Protolabs quote](https://www.hubs.com/help-center/how-to-get-a-quote/) · [Protolabs ordering](https://www.hubs.com/how-ordering-works/) · [Protolabs IP](https://www.hubs.com/ip-protection/) · [Protolabs team](https://www.hubs.com/team-account/) · [Xometry](https://www.xometry.com/how-xometry-works/) · [Xometry standards](https://www.xometry.com/manufacturing-standards/) · [Shapeways T&C](https://www.shapeways.com/terms-and-conditions) · [DEVELOP3D Shapeways](https://develop3d.com/3d-printing/shapeways-3d-printing-service-returns-in-hands-of-original-founders/) · [Sculpteo price & delivery](https://www.sculpteo.com/en/pricing/price-and-delivery/) · [3D Prod + Sculpteo](https://www.tctmagazine.com/3d-prod-and-sculpteo-announce-merger/) · [Treatstock](https://www.treatstock.com/site/how-it-works) · [PCBWay](https://www.pcbway.com/rapid-prototyping/3d-printing/) · [RapidDirect](https://www.rapiddirect.com/) · [RapidDirect Teamspace](https://www.rapiddirect.com/our-platform/teamspace/) · [FacFox FAQ](https://facfox.com/docs/faq) · [FacFox Buyer Protection](https://facfox.com/docs/kb/buyer-protection)

**Việt Nam:** [GN3D bảng giá](https://gn3dstudio.com/bang-gia-in-3d) · [DIGMAN](https://digman.vn/dich-vu-in-3d-theo-yeu-cau/) · [Good Gearz](https://goodgearz.com/bang-gia-in-3d/) · [3DMaker](https://www.3dmaker.vn/pages/dich-vu-in-3d-theo-yeu-cau-hcm) · [Inkiri](https://inkiri.vn/3d-calc-cost/) · [online.gov.vn mẫu](http://online.gov.vn/Website/chi-tiet-129619) · [NAPAS VietQR](https://www.napas.com.vn/dich-vu-thanh-toan-bang-ma-qr) · [VietQR.io](https://vietqr.io/) · [payOS](https://payos.vn/thu-ho/) · [VietnamNet 26× GDP](https://vietnamnet.vn/gia-tri-thanh-toan-khong-dung-tien-mat-nam-2024-gap-26-lan-gdp-2425387.html) · [VietnamBiz COD 77,5%](https://vietnambiz.vn/nghich-ly-tmdt-viet-nam-775-nguoi-tieu-dung-van-chon-thanh-toan-bang-tien-mat-khi-nhan-hang-2025615192910833.htm) · [GHTK bảng giá](https://ghtk.vn/bang-gia-dich-vu-ghtk/) · [GHN](https://ghn.vn/pages/bang-gia-moi-sieu-tiet-kiem) · [Ahamove](https://ahamove.com/) · [J&T](https://jtexpress.vn/vi) · [NĐ 52/2013](https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=167457) · [NĐ 85/2021](https://vanban.chinhphu.vn/default.aspx?docid=204191&pageid=27160) · [NĐ 13/2023](https://vanban.chinhphu.vn/?pageid=27160&docid=207759) · [Luật 19/2023/QH15](https://vanban.chinhphu.vn/?pageid=27160&docid=208363) · [NĐ 70/2025](https://mva.vn/huong-dan-ap-dung-nghi-dinh-70-2025-nd-cp-ve-hoa-don-dien-tu/) · [SME 98%](https://baodautu.vn/chiem-gan-98-tong-so-doanh-nghiep-doanh-nghiep-nho-va-vua-dang-o-dau-trong-nen-kinh-te-d249574.html)

**UX/funnel:** [Baymard cart abandonment](https://baymard.com/lists/cart-abandonment-rate) · [Baymard checkout fields](https://baymard.com/blog/checkout-flow-average-form-fields) · [Baymard shipping cost](https://baymard.com/blog/show-shipping-costs-on-product-pages) · [Baymard delivery date](https://baymard.com/blog/shipping-speed-vs-delivery-date) · [Baymard inline validation (A List Apart)](https://alistapart.com/article/inline-validation-in-web-forms/) · [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/) · [NN/g skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) · [NN/g progress indicators](https://www.nngroup.com/articles/progress-indicators/) · [NN/g drag-and-drop](https://www.nngroup.com/articles/drag-drop/) · [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) · [NN/g error messages](https://www.nngroup.com/articles/error-message-guidelines/) · [Zuko form benchmark](https://www.zuko.io/blog/8-surprising-insights-from-zukos-benchmarking-data) · [web.dev milliseconds](https://web.dev/case-studies/milliseconds-make-millions) · [Uppy drag-drop](https://uppy.io/docs/drag-drop/) · [Shopify 3D](https://changelog.shopify.com/posts/shop-adds-3d-and-augmented-reality-ar-previews)

**Design system & a11y:** [Geist colors](https://vercel.com/geist/colors) · [Geist typography](https://vercel.com/geist/typography) · [Geist materials](https://vercel.com/geist/materials) · [Radix scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) · [shadcn theming](https://ui.shadcn.com/docs/theming) · [Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/) · [Carbon data table](https://carbondesignsystem.com/components/data-table/style/) · [Superhuman dark themes](https://blog.superhuman.com/how-to-design-delightful-dark-themes/) · [Emil Kowalski — animations](https://emilkowal.ski/ui/great-animations) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [2.5.7 Dragging](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) · [1.4.11 Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) · [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) · [MDN canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas) · [Khronos WEBGL_lose_context](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/) · [MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) · [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/)

**Lưu ý về nguồn:** một số trang không truy cập được trong môi trường nghiên cứu (Apple HIG, m3.material.io, Autodesk, Markforged trả 403; Stripe press/blog là JS shell). Các số liệu liên quan được lấy từ nguồn thay thế và ghi rõ. Shapeways/Sculpteo **không** nên trích từ trang About của chính họ (đã lỗi thời) — dùng nguồn báo chí ở trên.
