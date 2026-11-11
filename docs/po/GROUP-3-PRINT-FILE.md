<!-- doc-meta: status=active; verified=2026-11-11; owner=lead -->
# Group 3 — Tệp in & điều kiện bắt đầu sản xuất (mock/source)

> Base: `main` @ `43f8a91`. **Không push/deploy, không migration/DB, không submit.**
> Mục tiêu: xưởng nhận việc để kiểm tra hồ sơ, nhưng **không bắt đầu in** nếu thiếu tệp.

## 1. Đã làm

| Thay đổi | Ghi chú |
|---|---|
| `MyQueueItem.printFile` (`{path,name}`) + mapping từ `orders.items` jsonb | Không migration; đơn cũ thiếu ⇒ null |
| `PrintJobDetail` hiện “đã có tham chiếu tệp” hoặc “chưa đủ cho tất cả dòng hàng” | Không dựng link tải khi chưa có signed URL/quyền |
| `productionRules.canStartPrinting(items)` | Yêu cầu **mọi** dòng có `printFile.path` |
| Lab queue: tách **Nhận việc** (kiểm tra hồ sơ) khỏi **bắt đầu sản xuất** | Nút nấc 3+ bị khoá nếu thiếu tệp; `applyStage` guard tầng 2 |
| Admin/khách không đổi | Admin chưa có file gate; xem mục mở |

## 2. Đã kiểm mock

- Đơn stage 2 có `printFile` → nút nấc 4 (“Gia nhiệt máy”/bắt đầu in) **enabled**; detail hiện `model.stl`.
- Đơn stage 2 **không** có `printFile` → nút nấc 4 **disabled** + title “Chưa đủ tệp in…”; detail báo `0/1` dòng có tệp.
- “Nhận việc” vẫn được ở nấc 0/1 (COD/đã trả) dù thiếu tệp — đúng nghĩa nhận để kiểm tra.
- 1440/390: 0 tràn, 0 pageerror.
- Gate: tsc PASS; 203/203; `npm run check` 24/24.

## 3. Còn mở (cần quyết định trước khi dùng đơn thật)

1. **Upload/quyền tệp:** chưa có nơi lưu file thật cho đơn custom quote; chưa có policy cho xưởng được gán đọc/tải. Cần chọn:
   - upload file lúc tạo đơn vào bucket private + policy theo `assigned_workshop_id` (cần migration Storage/RLS); hoặc
   - chỉ cho sản phẩm catalog có URL công khai; custom quote báo “chưa hỗ trợ”.
2. **Signed URL:** chưa có endpoint/Edge Function cấp URL theo quyền xưởng; UI chỉ hiện tham chiếu.
3. **Nhãn trạng thái:** chưa chốt canonical; hiện guard dùng index, nhãn khách/lab/admin vẫn khác.
4. **VietQR/COD:** giả định VietQR trả trước, COD in trước — cần PO xác nhận trước đơn thật.
5. **Trừ kho idempotent:** chưa có cột/ledger unique; gọi lại `completed` có thể trừ lần 2. Cần `orders.inventory_deducted_at`/bảng deduction hoặc RPC atomic (migration chưa áp).
6. **RLS PII:** chưa kiểm runtime xưởng chỉ đọc SĐT/địa chỉ đơn được gán; UI filter chưa đủ.
7. **Admin file gate:** chưa áp `canStartPrinting` trong Kanban admin.

## 4. Ghi chú

- Không có mật khẩu trong tài liệu này.
- Mọi kết quả là mock/source; chưa có giao dịch DB thật.
