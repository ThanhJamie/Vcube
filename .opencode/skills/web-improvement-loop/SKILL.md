---
name: web-improvement-loop
description: Use when iteratively improving this VCUBE web app with a self-repeating audit→fix→verify cycle. Triggers include "loop improvement", "vòng lặp cải tiến", "tự tối ưu web", "self-improve", "/improve", "/loop", or any request to keep optimizing the frontend without regressions. Drives scripts/loop-audit.mjs as the source of truth and enforces the repo's no-regression gates.
---

# Web Improvement Loop (VCUBE)

Vòng lặp tự cải tiến cho web app: **đo → xếp hạng → sửa nhỏ nhất → đo lại → lặp**, tuyệt đối
không đánh đổi hồi quy lấy tiến bộ.

## Nguồn sự thật duy nhất

```bash
node scripts/loop-audit.mjs            # đầy đủ: lint + 9 gate + build + quét tĩnh
node scripts/loop-audit.mjs --quick    # nhanh: bỏ build (dùng giữa các vòng)
node scripts/loop-audit.mjs --json     # cho agent đọc máy
```

- Ghi `.loop/latest.json` + nối `.loop/history.jsonl` (đã gitignore).
- `score` **càng thấp càng tốt**. Gate fail/lint fail có trọng số áp đảo.
- `improved` = score giảm so với lần chạy trước.
- `backlog[]` đã xếp ưu tiên P0 (gate/lint) → P1 (nợ design-system) → P2 (TODO/console) → P3 (bundle).
- RC=1 nghĩa là có hồi quy (gate fail / vi phạm mới / lint fail).

## Giao thức một iteration

1. **Đo**: chạy `node scripts/loop-audit.mjs` (vòng đầu) hoặc `--quick`. Đọc `backlog`.
2. **Chọn**: lấy mục `P0` cao nhất. Nếu không có P0, lấy `P1` có `impact` lớn nhất
   (thường là file::rule nhiều điểm nhất). **Chỉ một mục mỗi vòng.**
3. **Sao lưu**: trước khi sửa, copy file sẽ đổi vào `.loop/backups/<iteration>/<path>`
   (giữ nguyên cây thư mục) để có thể hoàn nguyên chính xác — KHÔNG dùng
   `git checkout -- <file>` vì cây làm việc còn nhiều thay đổi chưa commit của người khác.
4. **Sửa tối thiểu**: thay đổi nhỏ nhất giải quyết mục đó. Tuân bất biến repo (xem
   "Bất biến"), không refactor lan man, một file một owner.
5. **Kiểm chứng**: chạy lại gate liên quan + `node scripts/loop-audit.mjs --quick`.
   - Nếu `improved !== true` **hoặc** `gatesFailed > 0` **hoặc** `lintPass === false`:
     **hoàn nguyên** file từ `.loop/backups/` và đánh dấu mục là `blocked` (ghi lý do vào
     `.loop/state.json`), rồi chuyển mục kế tiếp. Không cố ép.
6. **Ghi trạng thái**: cập nhật `.loop/state.json`:
   ```json
   { "iteration": 2, "lastItem": "debt:src/.../X.tsx::focus-no-ring",
     "history": [{ "iteration": 2, "item": "...", "scoreBefore": 878, "scoreAfter": 861, "result": "improved" }],
     "blocked": [{ "item": "...", "reason": "..." }] }
   ```
7. **Lặp** mục kế tiếp.

## Điều kiện dừng

Dừng khi bất kỳ điều kiện nào đúng:
- Đạt `maxIterations` (mặc định 3 cho `/loop`, 1 cho `/improve`).
- **2 vòng liên tiếp không cải thiện** score.
- Backlog không còn mục `P0`/`P1`/`P2`.
- Gặp hồi quy không thể hoàn nguyên → escalate cho người dùng.

Báo cáo cuối: số vòng đã chạy, score trước/sau, danh sách mục đã sửa, mục `blocked`,
và các gate đã chạy.

## Bất biến (không được phá)

- Data-honesty: không bịa số/chuỗi; `check-fabricated` phải xanh.
- Token-only, Be Vietnam Pro + JetBrains Mono, lucide + `iconMap`, light-first.
- Không thêm dependency npm, không GSAP, không Next.js pattern.
- RLS là do DB quyết định; không sửa migration trừ khi mục backlog chỉ đúng.
- Không commit/push, không đụng `.env`/secret.
- Không sửa file ngoài phạm vi mục backlog đã chọn.

## Smoke browser (tùy chọn)

Nếu MCP `playwright` đã bật (sau khi restart opencode), hoặc dùng harness ngoài repo:

```bash
LOOP_BROWSER_CMD="node /tmp/opencode/pwtest/test.mjs" node scripts/loop-audit.mjs
```

Khi có kết quả browser, `browser.pass` phải giữ `true`; nếu browser fail, coi như hồi quy
(không phải cải tiến) dù score giảm.

## Ví dụ một vòng tốt

- Backlog P1: `focus-no-ring` ở `DesignerModelsManagerTab.tsx` (11/11).
- Sửa: thêm `focus-visible:ring-2 focus-visible:ring-ring` cho các control thiếu.
- Hạ `budget` trong `scripts/check-ui-rules.mjs` từ 11 → 0.
- Audit lại: `debt` giảm 11, `score` giảm, `gatesFailed=0`, `improved=true`.
