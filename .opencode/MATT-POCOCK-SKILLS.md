# Bộ skill mattpocock/skills (vendor)

Bộ **"Skills For Real Engineers"** của Matt Pocock — <https://github.com/mattpocock/skills> —
đã được vendor vào `.opencode/` của repo này để dùng với OpenCode (đã kiểm chứng trên opencode
v2.0.32 và model `deepseek-v4.1-flash`).

| Thứ | Ở đâu | Ghi chú |
|---|---|---|
| 27 skill | `.opencode/skills/<id>/` | nguyên trạng upstream (gồm cả `agents/openai.yaml`, script phụ trợ) |
| 16 slash command | `.opencode/commands/<id>.md` | sinh tự động cho skill loại *user-invoked* |
| Manifest | `.opencode/mattpocock-skills.json` | commit đã vendor + danh sách file script này sở hữu |
| Nguồn | `https://github.com/mattpocock/skills` @ `49dd158d` (2026-10-09) | commit ghi trong manifest, không phải file này |

License MIT (xem LICENSE của repo nguồn). Không sửa trực tiếp file trong `.opencode/skills/`:
lần `npm run skills:sync` sau sẽ ghi đè.

## Dùng hằng ngày

- **User-invoked** (16 skill): model không tự gọi được, bạn gõ `/<id>` trong TUI (hoặc `@<id>`
  trong prompt). Ví dụ `/grill-me`, `/to-spec`, `/implement`.
- **Model-invoked** (11 skill): agent tự nạp khi hợp việc; bạn vẫn gọi tay được bằng `/<id>` hoặc `@<id>`.
  Ví dụ `tdd`, `code-review`, `diagnosing-bugs`, `grilling`, `research`.
- **Việc cần làm một lần cho mỗi repo**: `/setup-matt-pocock-skills` (hỏi issue tracker, nhãn triage,
  chỗ ghi doc — sẽ thêm mục `## Agent skills` vào `AGENTS.md`). Các skill `to-spec`, `to-tickets`,
  `triage`, `implement-spec` cần bước này trước.

| Nhóm | User-invoked | Model-invoked |
|---|---|---|
| engineering (20) | `ask-matt`, `grill-with-docs`, `implement`, `implement-spec`, `improve-codebase-architecture`, `retro`, `setup-matt-pocock-skills`, `to-spec`, `to-tickets`, `triage`, `wayfinder` | `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `pr`, `prototype`, `research`, `tdd`, `wizard`, `writing-for-agents` |
| productivity (7) | `grill-me`, `handoff`, `teach`, `to-questionnaire`, `wait-what` | `grilling`, `writing-for-agents`¹ |

¹ `writing-for-agents` nằm ở bucket productivity và là model-invoked.

## Cập nhật từ upstream

```bash
npm run skills:sync                    # đồng bộ từ nhánh mặc định của upstream
npm run skills:sync -- --ref <git-ref> # ghim branch/tag/commit
npm run skills:sync -- --check         # chỉ so sánh, RC=1 nếu bản vendor lệch nguồn
npm run skills:sync -- --dry-run       # in kế hoạch, không ghi
```

Script `scripts/sync-mattpocock-skills.mjs` chỉ ghi/xoá phần nó sở hữu (theo manifest), nên
`.opencode/skills/web-improvement-loop` và `.opencode/command/{improve,loop}.md` viết tay không bị đụng.
Sau khi sync: xem `git diff .opencode/` rồi chạy `npm run lint` + `npm run build`.

## Vì sao tương thích OpenCode (chứ không cần bản riêng cho Claude Code)

- `SKILL.md` + frontmatter `name`/`description` là chuẩn chung; OpenCode tự dò `.opencode/skills`.
- `disable-model-invocation: true` của Claude Code được OpenCode hiểu tương đương
  `metadata.opencode/autoinvoke: false`: skill bị ẩn khỏi danh sách của model nhưng **vẫn nạp được
  bằng `skill` tool khi gọi đúng id** — đó là cơ chế 16 slash command dựa vào.
- Skill gọi nhau bằng câu "Call the Skill tool with …" → khớp `skill` tool của OpenCode (nhận `{ id }`).
- Chỗ nói "sub-agent/background agent" → `subagent` tool của OpenCode (`explore`, `general`);
  `implement-spec` nói "worktree + branch" → khớp bộ `worktree_*` của OpenCode.
- Các trường chỉ dành cho harness khác (`argument-hint`, `agents/openai.yaml`, `metadata.credits`)
  bị OpenCode bỏ qua, giữ nguyên để không lệch upstream.
- Không skill nào hardcode model hay tool riêng của Claude Code, nên chạy được với `deepseek-v4.1-flash`.

## Lưu ý khi chạy bằng `deepseek-v4.1-flash`

Đã kiểm chứng trực tiếp: model gọi đúng `skill` tool theo id (kể cả 16 skill bị ẩn), và 11 skill
model-invoked tự hiện trong danh sách của agent. Vài skill nặng hơn phần còn lại vì chúng điều phối
nhiều subagent song song — `implement-spec`, `code-review`, `improve-codebase-architecture`,
`wayfinder`. Chúng vẫn chạy, nhưng tốn token/thời gian hơn hẳn và dễ lệch nếu bước trước chưa rõ;
nên dùng khi bạn thực sự cần chia việc, còn việc thường ngày thì `tdd`, `diagnosing-bugs`, `grilling`,
`grill-me`, `to-spec`, `handoff` là đủ.
