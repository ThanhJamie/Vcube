<!-- doc-meta: status=active; verified=2026-09-24; owner=thanh -->
# Sự cố SEC-01 — `designer_profiles` bị đọc công khai (lộ PII nhận tiền)

> Tài liệu sự cố nội bộ. **Không** chứa PII thật; mọi email/tên người đã được che.
> Các mốc chưa xác định để dạng placeholder (`<...>`), điền khi có dữ liệu thật.

## 1. Tóm tắt

Bảng `designer_profiles` bị **đọc công khai qua anon key** (khoá này nằm trong bundle
client nên ai cũng lấy được). Policy gốc cho phép `anon` và `authenticated` `SELECT`
toàn bộ cột với `USING (true)`, nên 3 cột nhận tiền (`bank_name`, `bank_account`,
`tax_id`) bị phơi ra qua REST API. Đã kiểm chứng **2 hàng có dữ liệu nhạy cảm**, trong
đó **1 hàng gắn với tài khoản thật**. Chưa có bằng chứng truy cập bất thường trong cửa
sổ log hiện tại, nhưng **không thể loại trừ** truy cập lịch sử do log lưu ngắn.

- **Mã:** SEC-01
- **Mức độ:** P0 (rò rỉ PII tài chính có thể đọc bằng anon key)
- **Trạng thái:** đang khắc phục (hotfix T0A-3/T0A-4 đã soạn; đóng khi `<APPLY_DATE>`)

## 2. Nguyên nhân gốc

1. **Policy công khai quá rộng.** `designer_profiles` nằm trong danh sách catalog công
   khai nên nhận policy `vcube_designer_profiles_public_read` cho `{anon, authenticated}`
   với `SELECT USING (true)`:
   - Khai báo tập bảng: `supabase/migrations/20261010_harden_rls.sql:309`
   - Vòng lặp tạo policy: `supabase/migrations/20261010_harden_rls.sql:407-413`
2. **Grant nền cũng mở.** Baseline cấp `SELECT` bảng cho `anon, authenticated`:
   `supabase/migrations/20260901_baseline_schema.sql:1330-1332`.
3. **Cột nhạy cảm nằm chung bảng.** 3 cột nhận tiền bị đọc lẫn với dữ liệu catalog
   công khai: `bank_name`, `bank_account`, `tax_id`
   (`supabase/migrations/20260901_baseline_schema.sql:892-894`).
4. **Client đọc thừa.** Các truy vấn phía client dùng `select('*')`/embed `(*)`, nên
   không thể thu hẹp cột nếu chỉ sửa tầng policy.

## 3. Phạm vi ảnh hưởng

| Hạng mục | Số lượng / ghi chú |
|---|---|
| Bảng | `designer_profiles` (1 bảng) |
| Cột nhạy cảm lộ | `bank_name`, `bank_account`, `tax_id` |
| Hàng có dữ liệu nhạy cảm | **2 / toàn bảng** |
| Hàng gắn tài khoản thật | **1** — designer che: `c***@vcube.vn` |
| Hàng fixture seed | **1** — `[MẪU]`, `user_id IS NULL` (không gắn người thật) |
| Vai trò đọc được | `anon`, `authenticated` (bất kỳ ai có anon key) |

## 4. Cửa sổ phơi nhiễm

- **Bắt đầu:** ngày áp schema/migration lên production — runbook ghi **~2026-09-12**
  (xem `docs/security/rls-runbook.md` §10.6 và `docs/plans/baseline.md` §6).
- **Kết thúc:** khi hotfix **T0A-4** được áp lên production — `<APPLY_DATE>`
  (kế hoạch backup tại `docs/tasks/DRIFT-TASKS.md` dùng nhãn `20260924`).
- **Kết luận:** dữ liệu thật (hàng `c***@vcube.vn`) **đã ở trạng thái đọc được** trong
  cửa sổ trên. Không thể khẳng định "chưa từng bị đọc".

## 5. Rà soát log truy cập

- Trong cửa sổ log hiện tại: **không thấy** request tới `/rest/v1/designer_profiles`.
- **Hạn chế:** thời hạn lưu log của Supabase ngắn (tuỳ gói, có thể chỉ vài ngày) ⇒
  **không thể loại trừ** truy cập lịch sử ngoài cửa sổ log.
- **Bằng chứng xuất log:** `<EXPORT_REF>` (đường dẫn/ID file export kèm ngày xuất).
- **Việc cần làm:** export log `/rest/v1/designer_profiles` **ngay** (lọc `select=*`
  hoặc các tham số `bank_`/`tax_id`) trước khi log bị xoay vòng.

## 6. Khắc phục

| Mục | Nội dung | Trạng thái |
|---|---|---|
| **T0A-2** (client) | Bỏ `select('*')`/embed `(*)`; chỉ chọn cột an toàn; chỗ cần bank/tax gọi RPC | đã soạn, deploy trước hotfix |
| **T0A-3** (migration) | `revoke select on designer_profiles` khỏi `anon, authenticated`; `grant select (<cột an toàn>)`; thêm RPC `get_my_payout_info()`, `admin_get_designer_payout(uuid)` | `supabase/migrations/20261011090000_sec01_designer_payout_hotfix.sql` |
| **T0A-4** (triển khai) | Deploy client mới → backup bảng → áp migration trong SQL Editor → post-check bằng anon key thật | chờ người thực hiện, `<APPLY_DATE>` |
| Rollback | `supabase/rollback/20261011090000_down.sql` (chỉ dùng khi app hỏng nặng; mở lại lỗ hổng) | đã soạn |

**Kiểm chứng sau hotfix (bắt buộc):**

```sql
select has_column_privilege('anon','public.designer_profiles','bank_account','select');          -- false
select has_column_privilege('authenticated','public.designer_profiles','bank_account','select'); -- false
select has_column_privilege('anon','public.designer_profiles','display_name','select');          -- true
```

và `curl "$URL/rest/v1/designer_profiles?select=bank_account" -H "apikey: $ANON"` phải lỗi
quyền, còn `?select=display_name` phải trả 200.

## 7. Việc tiếp theo (follow-up)

- [ ] **Thông báo designer bị ảnh hưởng** (`c***@vcube.vn`): yêu cầu theo dõi/đổi thông tin
      nhận tiền và cảnh giác giao dịch bất thường.
- [ ] **Xác minh nghĩa vụ thông báo vi phạm dữ liệu cá nhân của Việt Nam** (mốc thường
      được nhắc ~**72 giờ** kể từ khi phát hiện) — **cần luật sư xác nhận; tài liệu này
      không phải tư vấn pháp lý.**
- [ ] **T20** — tách bảng lưu cột nhạy cảm (bank/tax) khỏi dữ liệu catalog công khai.
- [ ] **T23** — thêm test hồi quy RLS để SEC-01 không tái diễn.
- [ ] **T0A-5** — rà soát PII trên `workshop_partners` (cùng mẫu lỗi "catalog công khai").
- [ ] Điền `<APPLY_DATE>` và `<EXPORT_REF>`, cập nhật trạng thái sự cố sang **đã đóng**.

## 8. Dòng thời gian

| Mốc | Ngày | Ghi chú |
|---|---|---|
| Schema/migration áp lên production (bắt đầu phơi nhiễm) | ~2026-09-12 | runbook ghi; cần xác nhận ngày chính xác |
| Phát hiện SEC-01 | `<DETECTED_DATE>` | audit RLS |
| Export log truy cập | `<LOG_EXPORT_DATE>` | `<EXPORT_REF>` |
| T0A-2 deploy client | `<CLIENT_DEPLOY_DATE>` | bỏ `select('*')` |
| T0A-4 áp hotfix (kết thúc phơi nhiễm) | `<APPLY_DATE>` | migration T0A-3 |
| Thông báo designer bị ảnh hưởng | `<NOTIFY_DATE>` | `c***@vcube.vn` |
| Đóng sự cố | `<CLOSED_DATE>` | sau khi post-check đạt |

## 9. Tham chiếu

- `supabase/migrations/20261011090000_sec01_designer_payout_hotfix.sql` — hotfix T0A-3.
- `supabase/migrations/20260901_baseline_schema.sql:892-894,1330-1332` — cột nhạy cảm + grant.
- `supabase/migrations/20261010_harden_rls.sql:309,407-413` — policy công khai.
- `docs/tasks/DRIFT-TASKS.md` — T0A-1…T0A-5, T20, T23 (kế hoạch khắc phục).
- `docs/security/rls-runbook.md` — bối cảnh RLS và ngày áp migration.
