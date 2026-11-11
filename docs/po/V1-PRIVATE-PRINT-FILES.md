<!-- doc-meta: status=active; verified=2026-11-11; owner=lead -->
# V1 — Tệp in private cho đơn (contract + draft policy)

> **Chưa áp migration.** Draft SQL: `docs/security/print-files-storage-policy.draft.sql`.
> Base `main` @ `f5af78d`. Không push/deploy, không ghi DB/Storage.

## 1. Quyết định đã chốt

- Tệp in nằm trong **bucket private**, không dùng public URL.
- Đơn lưu **tham chiếu ổn định** (`path`, `name`, `sizeBytes`, `contentType`, `checksum`) trong `orders.items[].printFile`; **không lưu signed URL**.
- Xưởng chỉ được cấp URL tải ngắn hạn khi **đang được gán** cho đơn.
- Thiếu tệp ⇒ được “Nhận việc để kiểm hồ sơ”, **không được bắt đầu sản xuất**.
- Việc kiểm “đủ tệp” phải dùng cùng một hàm/guard ở lab, admin Kanban và tầng ghi trạng thái.

## 2. Đề xuất kỹ thuật

| Hạng mục | Đề xuất |
|---|---|
| Bucket | **Mới `print-files` (private)** thay vì trộn vào `cad-files`; MIME STL/STEP/STP/3MF/OBJ/zip; giới hạn dung lượng theo gói |
| Path | `print/<owner_uid>/<draft_id>/<uuid>.<ext>`; `draft_id` sinh ở client khi chọn tệp, giữ nguyên trong cart/order |
| Upload | Khi khách chọn file ở Quote: upload private trước khi add-to-cart; lưu ref vào `AnalysisFile`/`CartItem`; add-to-cart chỉ khi upload thành công |
| Khách guest | **V1a:** yêu cầu đăng nhập để upload tệp in (policy cần `auth.uid()`); catalog không cần file vẫn guest checkout. **V1b:** guest upload qua signed upload URL/Edge Function — cần quyết định backend riêng |
| Tải cho xưởng | Workshop gọi `createSignedUrl(path, 300)`; policy kiểm `orders.assigned_workshop_id = current_workshop_partner_id()` theo `draft_id` trong path/order item. TTL ngắn (5 phút) |
| Kiểm tồn tại | Trước khi cho bắt đầu in: `storage.list`/`createSignedUrl` phải trả object; lỗi ⇒ khóa start + hiện “tệp không tồn tại/không có quyền” |
| Cleanup | Owner xoá được path của mình trước khi đơn hoàn tất; đơn cancelled/abandoned có job dọn object theo tuổi; không xoá file đang có đơn active |
| Resumable | Tệp >6MB hoặc mạng yếu cần TUS/resumable; Supabase khuyến nghị resumable cho >6MB. Thêm dependency/TUS client cần PO duyệt — chưa làm ở V1a |
| Admin | Admin được `select` bucket để kiểm/hỗ trợ; cùng `canStartPrinting` với lab |
| Lưu ý | Path string **không phải bằng chứng** object tồn tại; signed URL không được lưu DB/log/ảnh |

### 2.1 Nguồn tệp cho đơn catalog (bổ sung sau review v3.1)

Đơn catalog guest **không** có upload của khách. Mỗi dòng cần in phải có **nguồn tệp tin cậy**:

```
PrintFileRef = {
  source: 'custom_upload' | 'catalog_product';
  path?: string;          // chỉ với custom_upload / bản copy private
  productId?: string;     // catalog_product
  name, sizeBytes, contentType, checksum;
  verifiedAt?: string;    // chỉ set sau khi object tồn tại + role được phép
}
```

- Catalog: server/service resolve từ `productId` → file nguồn (public URL hoặc bản copy private). Client **không** tự khai path/verified.
- Nếu catalog chưa có file nguồn hoặc chưa xác minh quyền tải → item ở trạng thái `missing/unverified`, được “Nhận việc kiểm hồ sơ”, **không** bắt đầu in.
- Guest catalog checkout vẫn được; không bắt đăng nhập chỉ vì thiếu upload khách.
- **Hiện trạng code (Group 3):** `canStartPrinting` chỉ kiểm `printFile.path` cho mọi item. Catalog item chỉ có `productId` ⇒ **sẽ khóa toàn bộ đơn catalog**. Đây là gap phải sửa trước khi dùng gate với đơn thật; không nới gate thành “có productId là cho qua”.

## 3. Access matrix (draft)

| Vai trò | Insert | Select (tạo signed URL) | Delete |
|---|---|---|---|
| Customer/owner | `print/<uid>/...` | `print/<uid>/...` | `print/<uid>/...` trước/không còn đơn active |
| Workshop được gán | — | path thuộc đơn `assigned_workshop_id = current_workshop_partner_id()` | — |
| Admin | — | toàn bộ bucket | toàn bộ bucket |
| Anon/guest | — (V1a chưa hỗ trợ) | — | — |
| Workshop khác | — | — | — |

## 4. Acceptance V1

- [ ] Khách authenticated chọn STL → upload private thành công → cart item có `printFile`; upload lỗi không add cart, lỗi rõ.
- [ ] Checkout lưu đúng ref vào `orders.items[].printFile`; reload vẫn còn ref.
- [ ] Xưởng được gán tạo signed URL ngắn hạn mở đúng file; xưởng khác 403/không có object.
- [ ] File bị xoá/không tồn tại → lab/admin thấy “thiếu tệp”, không bắt đầu sản xuất.
- [ ] Catalog guest: checkout không bắt login; item catalog có nguồn tệp tin cậy **hoặc** bị chặn start với lý do “chưa xác minh tệp catalog”; không cho qua chỉ vì `productId`.
- [ ] Lab + admin dùng cùng `canStartPrinting`; không có đường UI nào bỏ qua.
- [ ] Không lưu signed URL vào DB/log/ảnh; token không lộ.
- [ ] Upload >6MB có thông báo giới hạn/resumable (nếu chưa làm TUS, phải nói rõ chưa hỗ trợ).

## 5. Chưa làm / cần owner

- Chưa áp draft SQL; cần review bucket limit/MIME/path/policy.
- Chưa chọn guest upload backend.
- Chưa thêm TUS dependency.
- Chưa kiểm object thật/RLS live; cần môi trường kiểm soát.
- Chưa nối `printFile` từ Quote → Cart → Order → lab/admin (code V1a tiếp theo).
