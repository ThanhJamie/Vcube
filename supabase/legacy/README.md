# supabase/legacy — MIGRATION CŨ, KHÔNG CHẠY

6 file trong thư mục này là chuỗi migration ban đầu. **Đã bị thay thế** và **không được chạy** trên bất kỳ môi trường nào.

## Vì sao bị loại

Chuỗi cũ không chạy được trên database trống — 4 lỗi cứng, mỗi lỗi làm abort cả transaction:

| # | Lỗi | Bằng chứng |
|---|---|---|
| 1 | `orders` thiếu cột `user_id` nhưng file sau tạo index/policy trên cột đó | `20260904_complete_…sql:55-72` vs `20260904_secure_rls_and_pricing.sql:36` (lỗi `42703`) |
| 2 | `secure_rls` yêu cầu các cột NOT NULL không tồn tại | `20260904_secure_rls_and_pricing.sql:14,15,17,19,29` |
| 3 | `user_profiles.id` là TEXT ở file đầu, file sau giả định UUID | `20260904_complete_…sql:86` vs `20260905_master_…sql:394,420` (lỗi `42883`) |
| 4 | `pricing_config` vừa là TABLE vừa bị tạo thành VIEW | `20260904_complete_…sql:157` vs `20260905_master_…sql:473` |

Ngoài ra chuỗi cũ tạo ra lỗ hổng RLS: `FOR ALL USING (true)`, quyền admin đọc từ `user_metadata` (client tự sửa được) và email admin hardcode trong 43 chỗ.

## Trạng thái hiện tại của các file này

Các anti-pattern RLS **đã được vá** (xem `docs/security/rls-runbook.md` §2.1) để nếu ai đó lỡ chạy thì cũng không tạo ra lỗ hổng. Nhưng chúng vẫn không chạy được vì 4 lỗi schema ở trên.

## Dùng gì thay thế

| File | Vai trò |
|---|---|
| `../migrations/20260900_rls_helpers.sql` | `current_app_role()` + `is_admin()`, chạy sớm nhất |
| `../migrations/20260901_baseline_schema.sql` | **Toàn bộ schema** (21 bảng + index + hàm + trigger + bucket + seed) |
| `../migrations/20261010_harden_rls.sql` | **Toàn bộ policy** (dọn policy cũ/lạ + tạo policy đúng) |

Giữ thư mục này chỉ để tham chiếu lịch sử (đối chiếu cột, seed cũ).
