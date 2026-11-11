<!-- doc-meta: status=active; verified=2026-11-11; owner=lead -->
# Master Plan v3.1 — trạng thái reconcile tại `ef2de05`

> Không phải bằng chứng runtime. Trạng thái lấy từ source/commit và báo cáo agent; chưa kiểm DB/Storage thật.

## 1. Mốc

- `main` local `ef2de05`, ahead `origin/main` **91**. **Không push/deploy.**
- V1 contract/draft đã có; **chưa áp migration/policy**, chưa upload object.
- Tài khoản 7/7 đã rotate; admin login/logout test PASS; **owner chưa nhận file**, session đo được 0/0 nhưng không suy nguyên nhân.

## 2. Trạng thái vòng

| Vòng | Trạng thái | Ghi chú |
|---|---|---|
| V0 — quyền/lưu | **PARTIAL** | Auth rotate + admin test; owner handoff BLOCKED; A-01 cross-session chưa làm; S-05/03 blocked |
| V1 — tệp tới xưởng | **IN_REVIEW** | Contract + draft policy; upload/tải object chưa code/áp; gate chỉ path string |
| V2 — trạng thái/kho | **PARTIAL/INTEGRATED_CODE** | Guard index + UUID kho đã có; canonical label, COD, ledger idempotent chưa chốt |
| V3–V5 | **TODO/BLOCKED** | Chờ V1/V2; chưa mở |

## 3. Task card trọng tâm hiện tại

**V1-W02 — Private print file lifecycle**

- Current source: `docs/po/V1-PRIVATE-PRINT-FILES.md`, `docs/security/print-files-storage-policy.draft.sql`, `productionRules.ts`, `workshop/queue.ts`/`shared.ts`, `PrintJobDetail.tsx`.
- User story: khách authenticated chọn STL → upload private → order giữ ref → xưởng được gán tải signed URL → lab/admin chỉ bắt đầu in khi object hợp lệ; guest catalog vẫn checkout.
- Data contract: `printFile {source,path|productId,name,sizeBytes,contentType,checksum,verifiedAt}`; path `print/<uid>/<draft>/<uuid>`; signed URL 300s; không lưu URL.
- **Gap mới:** `canStartPrinting` hiện yêu cầu `printFile.path` cho **mọi** item; catalog chỉ có `productId` ⇒ sẽ khóa toàn bộ đơn catalog. Không nới gate thành “có productId là qua”; phải resolve nguồn catalog tin cậy hoặc chặn với lý do.
- Acceptance: xem §4 V1 doc; phần runtime cần object/role thật.

## 4. Quyết định chờ owner

1. Bucket `print-files` riêng hay dùng `cad-files`; path.
2. Guest upload: V1a login-only hay V1b signed upload.
3. TUS/resumable >6MB + giới hạn 500MB.
4. Quyền xoá owner sau khi gắn đơn active.
5. COD được in trước thu tiền (chưa chốt).
6. Credential handoff vào vault; xác nhận rồi xoá file tạm.

## 5. Việc độc lập có thể làm trong lúc chờ

- Login-before-upload UX mock (không ghi DB).
- Lab queue mobile card 390/768.
- Designer requests mobile quote input / empty/error.
- Storefront 6-tab preview, admin menu search/breadcrumb (nếu chưa làm).
- Không tuyên bố upload/thanh toán đã chạy khi policy/credential chưa có.
