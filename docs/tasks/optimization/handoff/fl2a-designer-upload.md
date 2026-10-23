<!-- doc-meta: status=active; verified=2026-10-23; owner=design-foundation -->
# HANDOFF — FL-2a: designer upload file CAD thật lên Supabase Storage + `digital_assets`

> **Work item:** `task-45` · **Agent:** `design-foundation` · **Ngày:** 2026-10-23
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `14e8526` (sạch) + thay đổi task này (unstaged)
> **Trạng thái:** DONE (phần code + test + gate). **Upload Storage chưa được verify round-trip bằng tài khoản designer thật** — lý do ở §5.
> **Không commit/push** · Không migration · Không thêm dependency · Không đụng checkout/order · Không đổi theme/layout.

---

## 1. Vấn đề trước FL-2a

`storage.from(...).upload` = **0 chỗ** trong repo. Wizard đăng bán chỉ nhận tên/dung lượng tệp vào state, không giữ `File`, không upload, không ghi `digital_assets` ⇒ designer "gửi duyệt" nhưng **không có file nào trên Storage**; chuỗi giao file số (FL-2b) không thể chạy. Bucket + policy + bảng đã sẵn từ migration trước, nên FL-2a chỉ cần nối dây, **không tạo migration**.

---

## 2. Kiến trúc

```
DesignerUploadWizardTab (UI)
  ├─ validate (fileStorage.validateCadFile)             ← đuôi + size, không tin MIME
  ├─ parse 1 lần (utils/meshParser.parse3DFile)          ← tam giác/thể tích/kích thước/watertight
  ├─ checksum SHA-256 (fileStorage.computeSha256Hex)     ← WebCrypto, không dep
  ├─ upload → getCadFileStorage().upload(path, file)     ← adapter (FL-7 thay provider)
  │     path = cad/<auth.uid()>/<uuid>/<sanitized>
  ├─ tạo product (onAddNewProduct — luồng cũ)
  └─ AssetService.createDigitalAsset({ product, designer, storage_path, format, size, checksum, license, download_limit:null })
        ├─ lỗi insert ⇒ compensation: fileStorage.remove(path) + toast lỗi
        └─ thiếu session user ⇒ chặn trước upload, không tạo row rác
```

### File mới: `src/backend/integrations/fileStorage.ts`

| Thành phần | Hợp đồng |
|---|---|
| `interface FileStorage` | `upload(path, file, opts?) → {path,sizeBytes,contentType}` · `createSignedUrl(path, ttl) → url` · `remove(path)` — mọi lỗi **ném Error** (không có "thành công giả") |
| `class SupabaseFileStorage` | Dùng `supabase.storage.from(CAD_BUCKET)`, `upsert:false`; nhận `StorageClientLike` inject được để unit-test không cần mạng; `remove` best-effort (chỉ warn, không che lỗi gốc) |
| `buildCadStoragePath(uid, name, uuid?)` | `cad/<uid>/<uuid>/<sanitized>`; **ném lỗi** nếu uid không hợp lệ hoặc uuid sai; mặc định UUID v4 |
| `sanitizeFileName` | basename-only, bỏ dấu tiếng Việt (NFD + `đ/Đ`), whitelist `[a-z0-9._-]`, chặn `..`, bỏ control char, ≤120 ký tự giữ đuôi |
| `validateCadFile` | allowlist `stl/step/stp/3mf/obj/zip`, size > 0, ≤ **150 MB** (khớp `file_size_limit` bucket) |
| `computeSha256Hex` | WebCrypto SHA-256; `null` nếu môi trường thiếu SubtleCrypto (không bịa hash) |
| `formatCadFileSize` | B/KB/MB — sửa lỗi "0.00 MB" với tệp nhỏ |
| `getCadFileStorage()` | singleton adapter mặc định; `setCadFileStorage()` cho test/khác |
| TODO | `TODO(FL-7)` thay provider/CDN giữ nguyên interface + path scheme |

### `AssetService.createDigitalAsset` (thêm mới)

- Validate: productId/designerId/storagePath không rỗng, `downloadLimit` null hoặc ≥0.
- Insert đúng cột: `product_id, designer_id, storage_path, file_format, file_size_bytes, checksum, license_type, download_limit (null = ∞), watermark_required (true)`.
- `.select('id, product_id, storage_path').single()` → trả record; lỗi DB **ném Error**.

### Wizard (`DesignerUploadWizardTab`)

- Giữ `File` thật; validate ngay khi chọn (lỗi hiện dưới dropzone, không chuyển bước).
- Parse lưới **một lần** (STL/3MF/OBJ/STEP/STP; ZIP bỏ qua), hiện **số đo thật**: thể tích cm³, kích thước mm, số tam giác, watertight; parser fail ⇒ "—" + cảnh báo, **không bịa** (bỏ luôn "KHUYẾN NGHỊ VẬT LIỆU: PETG / Nylon-CF" cũ vì không có nguồn).
- Checksum SHA-256 hiển thị rút gọn; nhãn "Kho riêng tư cad-files · chỉ bạn và quản trị đọc được".
- Submit: chặn nếu thiếu tệp / thiếu session; upload (nút "ĐANG TẢI TỆP LÊN KHO…") → tạo product ("ĐANG LƯU HỒ SƠ FILE…") → insert asset → toast nêu **rõ** file đã ở kho riêng tư + chờ duyệt.
- Lỗi bất kỳ ⇒ xoá object vừa upload (compensation) + toast lỗi thật, không tạo product/asset giả.

---

## 3. Path scheme & khớp policy Storage

`cad/<auth.uid()>/<uuid>/<file>` — đúng `vcube_cad_files_cad_owner_rw` (`20261013110000_storage_scheme.sql`):

- `(storage.foldername(name))[1] = 'cad'`, `[2] = auth.uid()::text`, `array_length(...) >= 3`.
- UID lấy từ `useAuth().user.id` (Supabase Auth), **không** lấy từ form/email; `buildCadStoragePath` chặn `..`, `/`, `\`, khoảng trắng.
- **Không** ghi `products.cad_file_url` — file private không được biến thành URL công khai; xem docs note §4.

---

## 4. Docs đã cập nhật

`docs/database/schema-notes.md` §5b — bảng so sánh:

| Cột | Bản chất | Ai đọc | Ghi bởi |
|---|---|---|---|
| `products.cad_file_url` | URL công khai kiểu cũ (metadata) | mọi người đọc products | seed/legacy |
| `digital_assets.storage_path` | object private `cad-files`, scheme `cad/<uid>/<uuid>/<file>` | designer-owner + admin; khách qua signed URL (FL-2b) | FL-2a upload + `createDigitalAsset` |

Nguyên tắc: **không trộn**; upload mới không set `cad_file_url`; không ghi đè dữ liệu cũ; `product_id` không FK.

---

## 5. Bằng chứng verify

### 5.1 Unit test — **94 PASS** (thêm 23 test mới, `tests/unit/fileStorage.test.ts`)

- Validate: đủ 6 đuôi, hoa/Win path, `.exe`, rỗng, quá 150MB, biên đúng 150MB, thiếu tên; format/content-type; formatCadFileSize.
- Sanitize: traversal `../../etc/passwd.stl` → `passwd.stl`; Windows path; tiếng Việt có dấu → ASCII; control char; tên dài 120; không bao giờ rỗng.
- Path: đúng 4 cấp + uid/uuid/file, UUID v4 mặc định, từ chối uid traversal/rỗng, uuid sai, tên vô nghĩa; `isValidOwnerId`.
- Adapter mock: upload đúng bucket `cad-files` + path + contentType/upsert; upload lỗi → `Error` tiếng Việt; signed URL lỗi → `Error`; remove best-effort không ném.
- SHA-256("abc") đúng chuỗi NIST.

### 5.2 Browser smoke (fake designer session, dev :3001) — `/designer/wizard`, ảnh `/tmp/fl2a-*.png`

| Bước | Kết quả |
|---|---|
| Chọn tệp `.exe` | **Bị chặn tại UI**: `Định dạng ".exe" không được hỗ trợ. Chỉ nhận: STL, STEP, STP, 3MF, OBJ, ZIP.` |
| Chọn STL thật (cube 20 mm, 2 047 byte) | Parse thật: **8.00 cm³ · 20.0 × 20.0 × 20.0 mm · Kín (watertight) · STL · 12 tam giác**; SHA-256 `ce1ed1b5b4ea…`; size hiện **2.0 KB** (không còn 0.00 MB) |
| Submit | Có request `POST /storage/v1/object/cad-files/cad/designer-test-1/<uuid>/fl2a-cube.stl` — **đúng scheme**; token giả bị Supabase từ chối (`Failed to base64url decode the signature`) ⇒ toast **trung thực**: "Không xuất bản được: Không tải được tệp lên kho lưu trữ: …"; sau đó có `DELETE /storage/v1/object/cad-files` (**compensation chạy**), **không** tạo product/asset; 0 pageerror |
| Ảnh | `/tmp/fl2a-before-upload.png`, `/tmp/fl2a-after-parse.png`, `/tmp/fl2a-after-submit.png` (không commit) |

### 5.3 **Chưa verify round-trip upload→signed URL→download trên bucket thật**

- Repo/DB **không có tài khoản designer thật** trong phiên làm việc (không có credentials; tạo account production ngoài phạm vi).
- Upload yêu cầu JWT hợp lệ vì policy `auth.uid()` + Storage 401 với token giả ⇒ smoke chỉ chứng minh **path + error handling + compensation**, không chứng minh object tồn tại.
- **Cách verify khi có account** (1 lệnh, không commit): đăng nhập designer → `/designer/wizard` → chọn STL → submit; kiểm tra:
  1. Storage object `cad/<uid>/<uuid>/<file>` (dashboard/Storage API bằng chính user);
  2. `digital_assets` row (designer-owner RLS đọc được);
  3. `AssetService.createSignedUrl(storage_path)` mở được, so `size`/SHA-256 với file gốc.
- Mock client test đã phủ logic adapter (upload/signedUrl/remove + lỗi), không thay được round-trip thật.

---

## 6. Gate (đo trên cây sau sửa)

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** (rc=0) |
| `npm run build` (`dist-ssr/fl2a`) | **PASS** — index 690,07 kB / 186,38 kB gzip; three-vendor tách riêng |
| `npm run test:unit` | **PASS** — 94 test (23 mới) |
| `npm run check` (19 gate + baseline) | **PASS — “KHÔNG TỆ HƠN BASELINE”** (đã sửa 1 vi phạm `toLocaleString` mới phát sinh bằng `formatNumber`) |

---

## 7. Risks / phần còn thiếu

1. **Không transaction product + asset** (client 2 request): product đã tạo nhưng asset insert lỗi ⇒ compensation xoá file, **product vẫn còn** (không có delete trong phạm vi); ngược lại nếu product save thất bại sau khi asset insert thành công ⇒ **asset mồ côi**. FL-7 thay bằng RPC server-side.
2. `onAddNewProduct` ở `DesignerDashboardView` là wrapper **fire-and-forget** (switch tab ngay, không trả Promise) ⇒ wizard không xác nhận được DB đã ghi product; đã ghi chú trong code. Muốn chắc: FL-7 hoặc đổi wrapper trả Promise (ngoài write-scope task này).
3. **Không có progress %** upload: Supabase JS dùng fetch không phát progress; UI hiện stage text ("ĐANG TẢI TỆP…"/"ĐANG LƯU HỒ SƠ…"). Muốn % cần XHR/tus (dep mới — cấm).
4. Validate size/đuôi ở **client**; bucket limit 150MB + policy là lớp chặn cuối; kiểm tra MIME/magic bytes thật nên làm FL-7 (hiện tin đuôi tên tệp).
5. Checksum là client tính (tin được trong luồng designer); server-side nên xác minh lại ở FL-7.
6. ZIP được lưu nhưng **không parse** (nhiều tệp) — UI nói rõ "thông số hình học để trống" nếu parser không đọc.
7. `digital_assets` chưa có UI đọc (designer xem file đã upload) — thuộc FL-2b/khác; hiện chỉ insert.
8. Sản phẩm mới status `Under Review` + products public-read chỉ `published` ⇒ designer không thấy qua catalog ngay; đúng luồng duyệt hiện có.

---

## 8. Files thay đổi

| File | Loại |
|---|---|
| `src/backend/integrations/fileStorage.ts` | **mới** — adapter + validate/sanitize/path/checksum |
| `src/backend/services/assetService.ts` | + `createDigitalAsset` + types payload |
| `src/frontend/components/designer/DesignerUploadWizardTab.tsx` | upload thật, parse, tiến trình/lỗi, insert asset, compensation |
| `tests/unit/fileStorage.test.ts` | **mới** — 23 test |
| `docs/database/schema-notes.md` | + §5b phân biệt `cad_file_url` vs `storage_path` |
| `docs/tasks/optimization/handoff/fl2a-designer-upload.md` | handoff này |

Không sửa: checkout/order, migration, App/useCatalogData/hooks, theme/tokens.
