---
description: Chạy N vòng Loop Improvement liên tiếp (mặc định 3) cho tới khi hết nợ hoặc ngừng tiến bộ.
agent: loop-orchestrator
---

Chạy vòng lặp cải tiến liên tiếp. `$ARGUMENTS` là số vòng tối đa (mặc định **3**); có thể kèm
vùng ưu tiên, ví dụ: `3 a11y` hoặc `5 bundle`.

Mỗi vòng, thực hiện đúng giao thức của skill `web-improvement-loop`:
1. `node scripts/loop-audit.mjs` (vòng đầu) rồi `--quick` cho các vòng sau.
2. Chọn một mục backlog (P0 → P1 impact lớn → P2), sao lưu file.
3. Sửa tối thiểu, audit lại; chỉ giữ thay đổi nếu `improved === true` và không gate/lint fail,
   ngược lại hoàn nguyên + đánh dấu `blocked`.
4. Cập nhật `.loop/state.json`.

Dừng khi: đạt số vòng, **2 vòng liên tiếp không cải thiện**, hết mục P0/P1/P2, hoặc gặp hồi quy
không thể hoàn nguyên (escalate).

Không commit/push. Báo cáo tổng hợp cuối: số vòng chạy, score trước/sau, danh sách mục đã sửa
kèm `file:line`, mục blocked + lý do, và trạng thái gate.
