<!-- doc-meta: status=active; verified=2026-11-11; owner=lead -->
# Group 2 — Xưởng In (mock UI + source rules)

> Base: `main` @ `955d177` (sau Nhóm 0/1). **Không push/deploy.** Không migration/DB, không submit đơn.
> Mục tiêu: phiếu việc xưởng có dữ liệu in; chỉ cho hành động hợp lệ theo loại thanh toán; trạm/kho không tạo dữ liệu ma.

## 1. Giả định tạm (PO chưa chốt cuối)

- **COD:** được phép bắt đầu sản xuất trước khi thu tiền.
- **VietQR/chuyển khoản:** phải `payment_status = paid` trước khi nhận/print.
- **Trạng thái:** chỉ tiến một nấc; không lùi từ `shipping/completed/cancelled`; `completed` là terminal riêng.
- **Nấc canonical:** 0 chờ thanh toán/tiếp nhận, 1 chuẩn bị CAD, 2 cắt lớp/xếp bàn, 3 đang in, 4 hậu kỳ, 5 QC, 6 đóng gói, 7 đang giao. Khách/lab có thể dùng nhãn khác cho cùng nấc; **hành động/guard dùng index canonical**.
- **Phiếu việc:** dùng snapshot `orders.items` jsonb; thiếu trường/file phải hiện “Chưa có”, không bịa. Không thêm migration.

## 2. Ba luồng

| Luồng | Item | File chính | Kết quả |
|---|---|---|---|
| A — Phiếu việc | OPS-02/41 | types, Checkout snapshot, `workshop/queue.ts`+`shared.ts`, `QueueTab`, new `PrintJobDetail` | Xưởng xem được item, màu, kích thước, resolution/infill/layer, weight, ghi chú, khách; thiếu file hiện rõ |
| B — Trạng thái/hành động | OPS-03/08/09/10 | `productionRules.ts`, `QueueTab`/`WorkshopSettingsView`, `Group5ProductionPanel`, `useProductionStore` | VietQR chưa trả không nhận/advance; COD được; không lùi từ giao/xong; confirm done đúng nghĩa |
| C — Trạm/kho | OPS-11/12 | `workshop/inventory.ts`, `workshop/profiles.ts`, `Group5` select | Trừ kho đúng workshop UUID; không fallback seed trạm; không ghi DB vào localStorage |

**Sau Nhóm 2:** OPS-13/14 (QC/notes bền, realtime) chỉ làm sau khi PO chốt cột/bảng và quy tắc lưu.

## 3. Acceptance

- [ ] `/lab/queue` có nút chi tiết; detail hiện item/quantity/material/color/dimensions/resolution/weight/note/customer; trường thiếu = “Chưa có”, không bịa.
- [ ] VietQR `awaiting_payment`: không nhận việc/không advance; COD: được nhận.
- [ ] Không lùi nấc từ `shipping/completed/cancelled`; “Xác nhận hoàn thành” chỉ khi đúng điều kiện; “Đánh dấu đã giao” chỉ stage 7 + shipping.
- [ ] Admin Kanban “Tiếp/Lùi” áp cùng rule; KPI không đổi nghĩa.
- [ ] Trừ kho dùng đúng `workshop_profiles.id`; skip có lý do; không seed trạm; không localStorage DB-backed.
- [ ] tsc/unit/check PASS; 390/768/1440 0 tràn/0 pageerror.
- [ ] Báo cáo tách: browser mock / source / DB thật chưa kiểm chứng.
