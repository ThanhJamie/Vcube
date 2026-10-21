<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# REVIEW — Giao thức review chéo & handoff

> Dùng cho reviewer R1/R2 và integrator. Mọi subagent thi công cũng phải đọc §5
> (mẫu handoff) vì họ phải nộp đúng định dạng.

---

## 1. Nguyên tắc

1. **Review theo hợp đồng, không theo sở thích.** Mọi nhận xét phải trỏ về một mục trong
   `DESIGN-LANGUAGE.md` (§ số) hoặc `AGENTS.md`.
2. **Không sửa code khi review.** Reviewer chỉ ghi danh sách; integrator sửa.
3. **Chấm theo mức**, không chấm điểm cảm tính:

| Mức | Nghĩa | Bắt buộc sửa |
|---|---|---|
| **B — Blocker** | Sai hợp đồng / vỡ build / mất logic / fail gate | Có, trước khi merge |
| **M — Major** | Lệch recipe rõ ràng, a11y fail, mobile vỡ | Có, trong wave |
| **m — minor** | Lệch nhỏ về spacing/typography | Có, gộp cuối wave |
| **N — Nit** | Gợi ý, không bắt buộc | Không |

4. **Không "làm đẹp thêm".** Nếu code đã đúng hợp đồng, reviewer không được đề xuất phong cách
   mới — mọi đề xuất phải nằm trong `DESIGN-LANGUAGE.md`.

---

## 2. R1 — Consistency rubric (10 điểm)

Chấm từng file đã đổi. Mỗi mục fail = 1 lỗi ghi vào danh sách.

| # | Kiểm | Cách kiểm | Mức nếu fail |
|---|---|---|---|
| 1 | Không còn `chrome` | `grep -n "chrome" <file>` | B |
| 2 | Không hex/rgb mới trong `.tsx` | `grep -nE "#[0-9A-Fa-f]{3,8}\|rgb\(" <file>` (trừ swatch) | B |
| 3 | Đúng recipe card/panel | mọi card có `rounded-lg border border-line bg-surface` | M |
| 4 | Đúng recipe button | không còn `rounded-full` trên CTA; `h-10`; `text-sm` | M |
| 5 | Đúng recipe input | `h-10 rounded-md border-line-control bg-surface` | M |
| 6 | Đúng recipe badge | tint + chữ đặc + `rounded-full` + dot | m |
| 7 | Đúng recipe table | header `bg-surface-muted`, row `h-11`, `divide-line-subtle` | M |
| 8 | Typography | 1 tiêu đề `text-2xl font-bold tracking-tight`; micro-label `text-xs uppercase tracking-wider` | m |
| 9 | Spacing | section `space-y-8`/`gap-8`; panel `p-6 sm:p-8`; không `py-40` trong console | m |
| 10 | Không gradient/glass thừa | chỉ header/HUD/modal được `backdrop-blur` | m |

**Ngoại lệ hợp lệ**: màu swatch từ DB; `@media print`; canvas 3D render bên trong.

---

## 3. R2 — A11y & Responsive rubric

| # | Kiểm | Ngưỡng | Mức |
|---|---|---|---|
| 1 | Focus visible | mọi control có `focus-visible:ring-2 ring-ring` | B |
| 2 | Tap target mobile | ≥ 44×44 (icon-only ≥ 44, lý tưởng 48) | B |
| 3 | Contrast text | ≥ 4.5:1 thường, ≥ 3:1 chữ lớn | B |
| 4 | Contrast viền control | ≥ 3:1 | B |
| 5 | Không truyền đạt trạng thái chỉ bằng màu | có icon/chữ/dot + label | M |
| 6 | `aria-label` icon-only | 100% | B |
| 7 | `label for` + `aria-describedby` | 100% field | M |
| 8 | 390px không tràn ngang | `document.documentElement.scrollWidth <= 390` | B |
| 9 | 768/1440 không vỡ layout | mắt thường / screenshot | M |
| 10 | Reduced motion | không animation vô hạn thiếu `motion-reduce` | M |
| 11 | Bàn phím | Tab tới mọi control; Esc đóng modal/sheet | B |
| 12 | Heading order | 1 `h1`/trang, không nhảy cấp | m |

---

## 4. Quy trình review

```
1. Orchestrator gửi: danh sách workstream + danh sách file + handoff.
2. R1 và R2 chạy SONG SONG, độc lập, không thấy kết quả của nhau.
3. Mỗi reviewer ghi docs/tasks/ui-redesign/review/<wave>-<R>.md
   theo mẫu §5.
4. Integrator đọc cả 2, gộp theo (file, dòng, mức), sửa theo thứ tự
   B → M → m. Bỏ qua N trừ khi sửa < 2 phút.
5. Integrator ghi docs/tasks/ui-redesign/review/<wave>-INTEGRATION.md:
   mục nào đã sửa / bỏ / hoãn + lý do.
6. Orchestrator chạy lại gate. Nếu pass → wave tiếp theo.
```

**Review chéo giữa subagent thi công** (bắt buộc, nhẹ): mỗi subagent sau khi xong phải review
**1 file** của subagent khác cùng wave (orchestrator gán cặp), ghi 3 dòng vào handoff:
`đã đọc <file>`, `phát hiện <n> lỗi`, `mức nặng nhất <B/M/m/N>`. Đây là "review chéo" cấp thấp,
không thay R1/R2.

---

## 5. Mẫu handoff (subagent nộp)

Tạo `docs/tasks/ui-redesign/handoff/<ID>.md`:

```markdown
# Handoff — <ID> (<tên workstream>)

## 1. Phạm vi
- File đã sửa: <danh sách>
- File KHÔNG sửa (xác nhận): src/index.css, src/frontend/ui/**, src/App.tsx

## 2. Đã làm
| File | Thay đổi chính | Pattern cũ → mới |
|---|---|---|
| `views/X.tsx` | card + table + badge | `rounded-xl` → `rounded-lg`; raw `<table>` → `DataTable` |

## 3. Kiểm chứng
- `npx tsc --noEmit`: PASS / FAIL (chi tiết)
- `npm run build`: PASS / FAIL
- 390 / 768 / 1440: <cách kiểm + kết quả>
- 4 state: loading / empty / error / success → có/không

## 4. Chỗ cần reviewer quyết
- <file:line> — <vấn đề> — <2 phương án>

## 5. Review chéo
- Đã đọc: <file của agent khác>
- Phát hiện: <n> lỗi
- Mức nặng nhất: <B/M/m/N>

## 6. Rủi ro còn lại
- <mô tả>
```

---

## 6. Mẫu output reviewer

Tạo `docs/tasks/ui-redesign/review/<wave>-<R>.md`:

```markdown
# Review <R1|R2> — Wave <n>

## Tổng
- File đã chấm: <n>
- Blocker: <n> · Major: <n> · minor: <n> · Nit: <n>

## Danh sách
| # | Mức | File:line | Vấn đề | Căn cứ (DESIGN-LANGUAGE §) | Cách sửa |
|---|---|---|---|---|---|
| 1 | B | `views/X.tsx:120` | còn `bg-chrome` | §1.5 | đổi `bg-surface` |

## Điểm tốt (giữ nguyên)
- <...>

## Đề xuất cập nhật hợp đồng
- <chỉ khi DESIGN-LANGUAGE thiếu; orchestrator quyết>
```

---

## 7. Checklist theo bề mặt (reviewer dùng nhanh)

### Storefront (`/`, `/explore`, `/products/:id`, `/personalize`)
- [ ] Hero dùng `rounded-xl` band + nền `surface`/`surface-muted`, không gradient màu.
- [ ] Card sản phẩm: `rounded-lg`, viền, hover `shadow-e1`.
- [ ] Swatch: viền `line`, selected `ring-2 ring-primary`.
- [ ] Filter: sidebar/sheet dùng `rounded-lg`, không sticky lỗi.
- [ ] Grid: 1/2/3 cột; 390 không tràn.

### Transaction (`/cart`, `/checkout`, `/orders`, `/tracking`, `/assets`)
- [ ] Tổng tiền `font-mono tabular-nums`, căn phải.
- [ ] Không CTA trùng intent.
- [ ] Empty state có lý do + 1 hành động.
- [ ] Form: label + lỗi inline + `aria-invalid`.

### Console (`/admin`, `/lab`, `/designer`, `/quote`)
- [ ] Sidebar sáng, active `primary-tint` + thanh dọc.
- [ ] Topbar `h-14`, `sticky`, `backdrop-blur-md`.
- [ ] DataTable đúng §3.5; empty ngoài bảng.
- [ ] KPI card `rounded-lg border` + số `font-mono`.
- [ ] Không `py-40`, không hero landing.

### 3D
- [ ] Viewport `rounded-lg border`, HUD chip `font-mono`.
- [ ] Toolbar `bg-surface/95 shadow-e2`, active `bg-primary`.
- [ ] Không 2 control chồng `z`; `top-14` chỉ 1 hàng.
- [ ] Canvas không bị CSS filter/backdrop làm mờ.

### Auth
- [ ] Card trung tâm `rounded-xl`, không nền tối.
- [ ] Mật khẩu có toggle + `aria-label`.
- [ ] Không `alert()` (dùng toast/inline).
