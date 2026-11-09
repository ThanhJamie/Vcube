---
description: Chạy Code Machine N vòng tự động (đo PO → chọn hướng → reviewer → implementer song song → verifier → ghi trạng thái).
agent: code-machine
---

Chạy **Code Machine** cho VCUBE, tối đa `$ARGUMENTS` vòng (mặc định 3).

Mỗi vòng:
1. `npm run po:audit` (nếu `.loop/po.json` cũ hơn 1 giờ) rồi `node scripts/machine-next.mjs --pretty`.
2. Nếu `stop` khác null → dừng và báo cáo.
3. Dispatch `machine-reviewer` cho task `decision` (bỏ qua nếu task chỉ 1 file rõ ràng).
4. Dispatch một hoặc nhiều `machine-implementer` cho các task `ready` có file KHÔNG giao nhau
   (tối đa 3 agent song song). Mỗi agent chỉ được sửa file trong danh sách của task đó.
5. Dispatch `machine-verifier` để chạy `npm run check` + `npm run po:audit` (+ smoke 390/1440 nếu có
   Playwright MCP).
6. Pass → `node scripts/machine-next.mjs --complete <id>`.
   Fail → hoàn nguyên từ `.loop/backups/` và `--block <id> --reason "..."`.
7. Task có `requiresApproval` trong `waiting` → in ra cho người dùng; **không tự làm**, kể cả khi
   người dùng chỉ nói "tiếp tục".

Không commit/push, không thêm dependency, không tự áp migration, không đụng `.env`.
Báo cáo cuối (tiếng Việt): score trước/sau, task xong, task chờ duyệt, task blocked, file đã sửa,
gate đã chạy.
