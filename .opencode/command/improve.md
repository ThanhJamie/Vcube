---
description: Chạy MỘT vòng Loop Improvement (audit → sửa mục ưu tiên cao nhất → kiểm chứng).
agent: loop-orchestrator
---

Chạy đúng **một iteration** của Loop Improvement cho VCUBE.

Quy trình:
1. `node scripts/loop-audit.mjs` — đọc `backlog` và `score`.
2. Chọn **một** mục ưu tiên cao nhất (P0 trước, sau đó P1 có impact lớn nhất).
3. Sao lưu file vào `.loop/backups/<iteration>/`, sửa thay đổi nhỏ nhất.
4. `node scripts/loop-audit.mjs --quick` — xác nhận `improved === true`, `gatesFailed === 0`,
   `lintPass === true`. Nếu không, hoàn nguyên từ backup và ghi `blocked`.
5. Cập nhật `.loop/state.json` và báo cáo trước/sau.

Nếu `$ARGUMENTS` nêu một vùng cụ thể (vd "a11y", "bundle", "designer"), ưu tiên mục backlog
khớp vùng đó.

Không commit/push. Báo cáo cuối bằng tiếng Việt: mục đã sửa, scoreBefore → scoreAfter,
kết quả gate, mục blocked (nếu có).
