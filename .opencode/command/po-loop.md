---
description: Chạy bộ máy PO tự động tới khi đạt ngưỡng world-class (score ≥85, 0 P0 fail).
agent: loop-orchestrator
---

Chạy vòng lặp PO cho VCUBE theo `docs/po/ACCEPTANCE.md`.

Quy trình mỗi vòng:
1. `node scripts/po-audit.mjs` — đọc `score`, `p0fail`, `backlog` (ghi `.loop/po.json`).
2. Nếu `satisfied === true` → dừng, báo cáo.
3. Chọn **một** mục đầu backlog (P0 trước). Nếu mục cần quyết định của con người
   (dữ liệu DB thật, rotate secret, nội dung marketing) → ghi `blocked` vào
   `.loop/po-state.json` và chuyển mục kế tiếp.
4. Sao lưu file vào `.loop/backups/po-<iteration>/`, sửa thay đổi nhỏ nhất.
5. `npm run check` + `node scripts/po-audit.mjs` — nếu score không tăng hoặc gate fail →
   hoàn nguyên từ backup, đánh dấu `blocked`.
6. Lặp, tối đa `$ARGUMENTS` vòng (mặc định 3).

Quy tắc:
- Không commit/push, không thêm dependency, không đụng `.env`/secret.
- Giữ data-honesty: không thay ảnh bịa bằng ảnh bịa khác.
- Chỉ sửa file thuộc mục đang xử lý.
- Báo cáo cuối (tiếng Việt): score trước/sau, mục đã sửa, mục blocked + lý do,
  danh sách gate đã chạy.
