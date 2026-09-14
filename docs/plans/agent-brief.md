# Agent brief — môi trường & luật thi công (MỌI subagent đọc trước khi làm)

Áp dụng cho mọi subagent thi công repo VCUBE theo `docs/plans/07-execution-phases.md`.

---

## 1. Môi trường

- Repo nằm trong **WSL2 Ubuntu-24.04**: Linux `/home/thanh/projects/Vcube`, Windows UNC `\\wsl.localhost\Ubuntu-24.04\home\thanh\projects\Vcube`.
- Node 22 / npm 10 **chỉ có trong WSL**. Mọi lệnh:
  `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/thanh/projects/Vcube && <cmd>"`
- **Không bao giờ** dùng node/npm/tsc của Windows (không có `node_modules` bên Windows).

## 2. Ghi file — BẮT BUỘC ĐỌC

Tool `write` và `edit` của harness **KHÔNG hoạt động trên đường dẫn UNC**:
`ENOTSUP: operation not supported on socket` (write) và `GetFileSecurityW EIO` (edit).
Đã kiểm chứng. Đừng thử lại, đừng mất thời gian.

**Cách tạo/thay thế file trong repo (giữ nguyên UTF-8, đã kiểm chứng với tiếng Việt):**

1. Dùng tool `write` ghi ra đường dẫn Windows:
   `C:\Users\chith\AppData\Local\Temp\vcube\payload\<tên-file>`
2. Copy vào repo:
   `wsl -d Ubuntu-24.04 -- bash -lc "cp /mnt/c/Users/chith/AppData/Local/Temp/vcube/payload/<tên-file> /home/thanh/projects/Vcube/<đường-dẫn-trong-repo>"`

**Sửa nhỏ trong file lớn** (đừng rewrite cả file 1000 dòng): viết script `python3` vào payload rồi chạy:

```
wsl -d Ubuntu-24.04 -- bash -lc "cp /mnt/c/Users/chith/AppData/Local/Temp/vcube/payload/patch.py /tmp/patch.py && python3 /tmp/patch.py"
```

`python3` 3.12 có sẵn. Script phải đọc/ghi UTF-8 và `assert` đúng số lần thay thế, ví dụ:

```python
import io
p = '/home/thanh/projects/Vcube/src/App.tsx'
s = io.open(p, encoding='utf-8').read()
old = "orders[0]"
assert s.count(old) == 2, s.count(old)
io.open(p, 'w', encoding='utf-8').write(s.replace(old, "notFound"))
```

**Đọc file:** dùng tool `read` trên đường dẫn UNC (hoạt động tốt).

### 2.1 🔴 LUẬT: encode TRƯỚC, mỞ file SAU (bài học từ sự cố mất `wave-plan.md`)

`open(path, 'wb')` **truncate file ngay khi gọi**, trước khi ghi được byte nào. Nếu `.encode()` nằm trong cùng biểu thức và nó ném lỗi thì file đã mất sạch. Đã xảy ra thật: một script patch làm `docs/plans/wave-plan.md` **644 dòng → 74 dòng** vì escape `\ud83d\udd34` sinh lone surrogate và `UnicodeEncodeError` nổ ở `write()`.

**BẮT BUỘC:**

```python
# ĐÚNG — encode trước, mở file sau
payload = text.encode('utf-8')
with open(p, 'wb') as f:
    f.write(payload)
```

```python
# SAI — có thể xoá trắng file
with open(p, 'wb') as f:
    f.write(text.encode('utf-8'))
```

Thêm nữa:
1. **Không dùng escape `\uXXXX` mọc cho emoji** trong chuỗi Python — `"\ud83d\udd34"` tạo **lone surrogate** không encode được. Dùng `\U0001F534` hoặc dán ký tự thật. (Chỉ bị với **cặp** surrogate; `\u2705` đơn lẻ thì an toàn.)
2. **Sao lưu trước khi patch file lớn không có trong git**: `cp <file> /tmp/<file>.bak-$(date +%s)`. Nhiều tài liệu trong `docs/plans/` **chưa được git track** nên không có đường cứu nào khác.
3. **Luôn `assert s.count(old) == 1`** trước mọi thay thế, và thử cả biến thể **CRLF** lẫn **LF** (repo trộn cả hai).
4. Với file dài mà chỉ cần **thêm** nội dung: dùng `open(p, 'a', encoding='utf-8')` — chế độ append không truncate.
**Không dùng `Get-Content`** — PowerShell 5.1 đọc file không BOM theo ANSI codepage và làm hỏng tiếng Việt.

## 3. Quoting

PowerShell 5.1 phá `$`, backtick, ngoặc kép, ngoặc đơn lồng nhau. Với lệnh nhiều dòng: viết `.sh` vào payload rồi

```
wsl -d Ubuntu-24.04 -- bash -lc "cp /mnt/c/Users/chith/AppData/Local/Temp/vcube/payload/x.sh /tmp/x.sh && bash /tmp/x.sh"
```

Không đặt ký tự ngoài ASCII trong file `.ps1`.

## 4. Gate (bắt buộc — dừng ở lỗi đầu tiên)

```bash
npm run lint     # tsc --noEmit
npm run build    # vite build
```

Nhiều agent chạy song song **tranh nhau `dist/`**. Vì vậy dùng outDir riêng:

```bash
npx vite build --outDir /tmp/vc-verify-<tên-agent> --emptyOutDir
```

và **xoá thư mục đó khi xong** (`rm -rf /tmp/vc-verify-<tên-agent>`).

Gate chuyên biệt: `node scripts/check-contrast.mjs` (theme/token) · `node scripts/lint-rls-sources.mjs` + `node scripts/lint-rls-migration.mjs` (SQL) · `node scripts/verify-rls.mjs` (RLS) · `node scripts/inspect-db.mjs` (DB).

### 4.1 Agent khác đang chạy song song

Các agent trong cùng đợt sở hữu **tập file không giao nhau**, nhưng dùng chung một working tree.
Nếu `lint`/`build` báo lỗi ở file **bạn không sở hữu** → đó là trạng thái tạm thời của agent khác.
Cách xử lý: chỉ sửa lỗi thuộc file bạn sở hữu; lọc output theo đường dẫn file của mình; **không** sửa file người khác, **không** revert, **không** báo động. Ghi lại trong báo cáo nếu còn lỗi lúc kết thúc.

### 4.2 Playwright khi nhiều agent chạy song song — BẮT BUỘC có retry

Nhiều agent dùng chung **một dev server**. Khi agent khác ghi file, **Vite HMR reload trang giữa lúc test của bạn đang chạy** ⇒ state trong RAM mất ⇒ test báo **fail giả**. Đã xảy ra thật với agent V1: `/order-success/<id>` báo “không tìm thấy đơn hàng” chỉ vì một agent khác lưu file.

**BẮT BUỘC:**
1. Mọi kịch bản Playwright phải có **vòng retry (≤ 3 lần)**.
2. Khi một bước fail, **kiểm tra xem có phải do reload giữa chừng không** (so khớp `pageerror`/console, thời điểm file bị ghi) **trước khi** kết luận.
3. Nếu vẫn fail: ghi rõ *“nghi flake do HMR của agent khác”* kèm log. **Không** báo PASS giả, và **không** coi flake là lỗi sản phẩm.
4. Cách tránh hẳn: chạy trên **bản build tĩnh** —
   `npx vite build --outDir /tmp/vc-pw-<tên> --emptyOutDir` rồi
   `npx vite preview --outDir /tmp/vc-pw-<tên> --port <cổng riêng>` (bản preview **không có HMR**).
   Tắt server + xoá outDir khi xong.

### 4.3 Playwright **KHÔNG** được ghi dữ liệu bịa lên DB thật

Agent N1 ở Đợt 6 đã để test GREEN của mình ghi thật vào hàng `app_settings` **trên project production**: `legal_name`, `tax_code` (`0108924881` — chính là mã số thuế **bịa** mà một agent khác vừa gỡ khỏi `InvoiceModal`), `invoice_address`, `hotline`. Kết quả: hoá đơn in mã bịa **như thể đã được cấu hình thật** — tệ hơn bản hardcode cũ vì không ai nhìn ra. Coordinator phải dọn tay + ghi 4 dòng `setting_audit`.

**BẮT BUỘC:**
1. Ưu tiên **chặn request** bằng `page.route()` trả fixture ghi rõ là fixture — đủ để chứng minh mọi nhánh render mà không chạm DB thật.
2. **Không** ghi giá trị bịa (tên công ty, MST, hotline, số tiền…) lên bảng thật.
3. Nếu **buộc phải** ghi thật: dùng nhãn ghi rõ là TEST, và **liệt kê nguyên văn bảng → cột → giá trị** trong báo cáo để coordinator dọn.
4. Nếu thấy cần seed dữ liệu nghiệp vụ (`products`/`materials`/`printer_fleet`/`orders`…): **DỪNG LẠI và báo coordinator**, đừng tự seed.

Một cách hay để nghiệm thu UI mà **không** ghi DB: dựng state **hoàn toàn trong RAM** — agent V1 đã làm vậy để mở `InvoiceModal`: seed `localStorage` giỏ hàng → `/checkout` → `/order-success` → nút “Xem / In hoá đơn” (`CheckoutView.tsx:149` chỉ gọi `onOrderCompleted(newOrder)`, **không có lệnh DB nào**).

---

## 5. Luật thi công (`07-execution-phases.md` §1)

1. **Một file chỉ có MỘT owner tại một thời điểm** — chỉ sửa file trong danh sách ownership được giao. Ngoài danh sách = không đụng.
2. **Không** `git commit` / `git push` / `git checkout` / `git stash` / `git restore`. Kết thúc bằng báo cáo diff + gate để người dùng quyết định.
3. **Không** sửa công thức pricing, **không** sửa schema/RLS, **không** thêm dependency.
4. Giữ split `src/backend` / `src/frontend`; truy cập DB chỉ qua `src/backend/supabase/*`.
5. Thay đổi **nhỏ nhất** đủ đạt mục tiêu. Không refactor ngoài phạm vi, không "dọn tiện tay".
6. **Không** hiển thị số liệu bịa (xem `docs/design/data-honesty.md`).
7. Mỗi bước phải có **bằng chứng** (output gate thật, số đo `grep`, script chạy được).
8. Bị chặn → dừng, báo rõ `file:line` + lý do, không đoán bừa.

## 6. Báo cáo cuối (bắt buộc, tiếng Việt, ngắn gọn)

1. **Đã làm:** nhóm việc → file thêm/sửa/xoá (đường dẫn tương đối, số dòng thay đổi).
2. **Gate:** lint / build (+ gate chuyên biệt) — PASS/FAIL kèm **output thật** (không tóm tắt suông).
3. **KPI liên quan:** số đo trước → sau (kèm lệnh `grep` đã dùng).
4. **Còn lại / rủi ro / cần người dùng chốt.**
5. Nếu có lệch so với kế hoạch: nói rõ lệch gì và vì sao.
