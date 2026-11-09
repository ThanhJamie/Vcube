<!-- doc-meta: status=active; verified=2026-11-09; owner=lead -->
# Code Machine — reviewer điều phối agent tự quyết định hướng tối ưu

Bộ máy gồm **1 orchestrator kiêm reviewer** và **3 agent chuyên trách**, chạy vòng lặp có bằng
chứng. Mục tiêu: tăng điểm PO (`docs/po/ACCEPTANCE.md`) mà không hồi quy 19 gate.

## 1. Kiến trúc

```
            ┌──────────────────────────────┐
            │  code-machine (primary)      │
            │  Reviewer + Dispatcher       │
            └──────────────┬───────────────┘
                           │ đọc .loop/po.json + machine-next
        ┌──────────────────┼───────────────────┐
        ▼                  ▼                   ▼
 machine-reviewer   machine-implementer×N   machine-verifier
 (read-only, JSON)  (mỗi agent 1 task,      (gate + po-audit +
                     file độc quyền)         smoke 390/1440)
        │                  │                   │
        └──────────► code + .loop/state ◄──────┘
                           │
                     po-audit (score)
```

| Thành phần | File | Vai trò |
|---|---|---|
| Orchestrator | `.opencode/agent/code-machine.md` | Phân tích, quyết định hướng, giao việc, nghiệm thu |
| Reviewer | `.opencode/agent/machine-reviewer.md` | Root cause + phương án + test plan (chỉ đọc) |
| Implementer | `.opencode/agent/machine-implementer.md` | Sửa đúng file được giao, tsc xanh |
| Verifier | `.opencode/agent/machine-verifier.md` | 19 gate + PO audit + smoke, kết luận pass/regression |
| Bộ não chọn việc | `scripts/machine-next.mjs` | Ánh xạ tiêu chí fail → task; chặn task cần người duyệt |
| Đo PO | `scripts/po-audit.mjs` | 8 nhóm điểm, backlog P0/P1 |
| Lệnh | `.opencode/command/code-machine.md` | `/code-machine N` |

## 2. Cách máy “tự quyết định”

`machine-next.mjs` đọc backlog PO và ánh xạ sang task có **file sở hữu** rõ ràng, theo thứ tự:
P0 trước → nhóm điểm lớn hơn → đang không blocked.

- Task **cần con người** (`requiresApproval`): ghi DB thật, migration/RLS, secret, nội dung thật.
  Máy **không tự làm**; in ra mục “Chờ người duyệt”.
- Task **tự chủ**: SEO/PWA, performance, a11y, docs, reliability, notifications, account security…
- PO duyệt bằng: `node scripts/machine-next.mjs --approve <id>`.
- Máy dừng khi: `score ≥ 85 && p0fail = 0`, hết vòng, hoặc chỉ còn task cần người duyệt.

Trạng thái lưu ở `.loop/machine-state.json` (gitignored): `iteration`, `approvals`, `blocked`,
`history`.

## 3. Quy trình một vòng

```bash
npm run po:audit                      # cập nhật .loop/po.json + history
node scripts/machine-next.mjs --pretty # quyết định task + lý do + file + verify
# orchestrator dispatch:
#   machine-reviewer  → phương án
#   machine-implementer (song song nếu file rời nhau)
#   machine-verifier  → pass/regression
node scripts/machine-next.mjs --complete <id>   # hoặc --block <id> --reason
```

## 4. An toàn & chống hồi quy

- Verifier phải xanh **cả** `tsc`, `npm run check` (19 gate) và score PO không giảm.
- Không đạt → hoàn nguyên từ `.loop/backups/` và đánh dấu `blocked`.
- Không commit/push; Lead commit theo phase.
- Không thêm dependency, không tự áp migration.
- Không để 2 agent sửa cùng file (mỗi task có danh sách file độc quyền).

## 5. Khi provider subagent quá tải

Nếu dispatch trả `[overloaded]`, orchestrator tự chuyển sang chế độ **solo**: tự làm task theo
đúng spec của reviewer, vẫn chạy verifier bằng tay (`npm run check` + `po:audit`), và ghi rõ trong
báo cáo là “agent machine degraded → solo”.

## 6. Trạng thái hiện tại (2026-11-09, sau vòng 5)

- PO score **90,3/100**; 0 gate fail.
- Đã xong: `orderHistory`, `accountPage`, `quoteVault`, `reviewsWrite`, `dispatchWorkshop`,
  `digitalDelivery` (RPC #14 + client), `notifications`, `accountSecurity`.
- P0 còn lại (cần nội dung thật): 18 dòng `[MẪU]` trong `materials` (7), `accessories` (5),
  `printer_fleet` (6).
- Chờ duyệt: `review-photos` (storage policy cho upload ảnh đánh giá).
