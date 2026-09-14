#!/usr/bin/env node
/**
 * check-unitprice-multiplier.mjs — GATE chặn TÁI DIỄN lỗi TIỀN:
 * `unit_price_multiplier` KHÔNG được dùng như HỆ SỐ NHÂN GIÁ BÁN ở bất kỳ view/component nào.
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * `ProductDetailView.tsx:94` và `CadQuickViewModal.tsx:78` từng tính:
 *     physicalPrice * (material?.unitPriceMultiplier || 1)
 * ⇒ giá KHÁCH NHÌN THẤY bị nhân 270–1850 lần. Đo trên DOM (build tĩnh + preview):
 *     /products/DEMO-P01  giá niêm yết 250.000 đ  ->  67.500.000 đ (DEMO-M01, hệ số 270)
 *                                                   ->  80.000.000 đ (DEMO-M02, hệ số 320)
 *     /products/DEMO-P05  giá niêm yết 1.250.000 đ -> 337.500.000 / 400.000.000 / 775.000.000 đ
 * Sau khi bỏ phép nhân: view hiện đúng giá niêm yết + một dòng nói rõ "chưa gồm chênh lệch
 * vật liệu". Đây là lỗi mức nghiêm trọng nhất (thu tiền sai trên giá khách thấy) nên phải có
 * gate để không ai vô tình đưa phép nhân trở lại.
 *
 * NGỮ NGHĨA THẬT (nguồn duy nhất) — `src/utils/pricingEngine.ts:70-88`
 *     resolveMaterialCostPerGram():
 *       pricePerGram, nếu bỏ trống ⇒ Math.round(costPerKg / 1000 * unitPriceMultiplier)
 *   ⇒ `unit_price_multiplier` là hệ số SUY ĐƠN GIÁ NHỰA đ/g, KHÔNG phải hệ số nhân giá bán.
 *   Muốn phản ánh chênh lệch vật liệu vào giá bán thì phải lấy đơn giá nhựa thật NHÂN SỐ GRAM,
 *   đúng cách engine làm — không được nhân thẳng vào giá niêm yết.
 *
 * Dùng:  node scripts/check-unitprice-multiplier.mjs [root]
 *        (root mặc định = thư mục hiện tại; tiện cho test âm trên bản sao trong /tmp)
 * RC=0 = sạch. RC=1 = còn phép nhân sai (in kèm file:line). RC=2 = lỗi công cụ.
 *
 * MIỄN TRỪ — nơi DUY NHẤT được phép chạm tới trường này:
 *   - src/utils/pricingEngine.ts            (định nghĩa ngữ nghĩa, dùng để SUY đơn giá)
 *   - src/frontend/utils/pricingEngine.ts   (re-export của file trên)
 *   - src/frontend/components/admin/**      (form admin sửa cột `materials`)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] || process.cwd();
const SRC = join(ROOT, 'src');

const ALLOW = [
  /^src\/utils\/pricingEngine\.ts$/,
  /^src\/frontend\/utils\/pricingEngine\.ts$/,
  /^src\/frontend\/components\/admin\//,
];

/** `X * ... unitPriceMultiplier` hoặc `unitPriceMultiplier ... * X` (chạy trên dòng ĐÃ bỏ comment). */
const MUL = /(?:\*\s*[\w.?()[\]:\s]{0,40}unit_?price_?multiplier)|(?:unit_?price_?multiplier\w*\s*[\w.?()[\]]{0,20}\s*\*)/i;

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

/**
 * Bỏ comment dòng/khối JSX + `//` + `/* *\/` để KHÔNG báo nhầm chú thích.
 * Cần thiết thật: chính 2 view đã sửa và `PersonalizeView` đều có chú thích nhắc tên trường
 * (`* unit_price_multiplier KHÔNG được nhân vào giá bán...`) — quét thô sẽ báo nhầm.
 */
function stripComments(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

let files;
try {
  files = walk(SRC);
} catch (err) {
  console.error(`check-unitprice-multiplier: KHÔNG đọc được ${SRC} — ${err.message}`);
  process.exit(2);
}

const findings = [];
let scanned = 0;
for (const file of files) {
  const rel = relative(ROOT, file);
  scanned++;
  if (ALLOW.some((re) => re.test(rel))) continue;
  const lines = stripComments(readFileSync(file, 'utf8')).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (MUL.test(line)) findings.push({ file: rel, line: i + 1, text: line.trim().slice(0, 140) });
  });
}

console.log(`check-unitprice-multiplier: quét ${scanned} file .ts/.tsx (root=${ROOT})`);
if (!findings.length) {
  console.log('  PASS — không nơi nào nhân giá bán với unit_price_multiplier.');
} else {
  console.log(`  FAIL — ${findings.length} vấn đề (giá bán × unit_price_multiplier):`);
  for (const f of findings) {
    console.log(`  ${f.file}:${f.line}`);
    console.log(`      ${f.text}`);
  }
  console.log();
  console.log('  -> `unit_price_multiplier` là hệ số SUY ĐƠN GIÁ đ/g (`pricingEngine.ts:70-88`),');
  console.log('     KHÔNG phải hệ số nhân giá bán. Chênh lệch vật liệu (nếu muốn cộng) phải lấy từ');
  console.log('     đơn giá nhựa thật × số gram; nếu view không có số gram thì nói rõ "chưa gồm');
  console.log('     chênh lệch vật liệu" thay vì nhân một hệ số đoán.');
}
process.exit(findings.length ? 1 : 0);
