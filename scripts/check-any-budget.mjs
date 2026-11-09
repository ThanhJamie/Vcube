#!/usr/bin/env node
/**
 * check-any-budget.mjs — ngân sách `any` cho `src/**` (chống nợ type mới).
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * `tsconfig.json` đang `strict: false`, nên `any` không bị compiler chặn. Gate này đếm số DÒNG
 * chứa `: any` hoặc `as any` trong mọi file .ts/.tsx dưới `src/` và so với baseline
 * `scripts/guard-baseline.json`. Đây là ratchet: chỉ được giảm hoặc giữ nguyên, KHÔNG được tăng.
 * `--update` chốt lại khi đã dọn bớt (không dùng để nới trần).
 *
 * Đếm theo DÒNG (mỗi dòng khớp tối đa 1) để ổn định với grep và baseline hiện tại = 170.
 *
 * Dùng:  node scripts/check-any-budget.mjs [--json] [--update]
 * RC: 0 = PASS · 1 = vượt ngân sách · 2 = lỗi công cụ.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const BASELINE_PATH = join(ROOT, 'scripts', 'guard-baseline.json');
const AS_JSON = process.argv.includes('--json');
const UPDATE = process.argv.includes('--update');
const PATTERN = /:\s*any\b|as any/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-ssr', '.loop', 'coverage']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function relPath(abs) {
  return relative(ROOT, abs).split(sep).join('/');
}

function die(msg, code = 2) {
  if (AS_JSON) console.log(JSON.stringify({ ok: false, error: msg }, null, 2));
  else console.error(`check-any-budget: ${msg}`);
  process.exit(code);
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    die(`thiếu baseline ${relPath(BASELINE_PATH)} — chạy: node scripts/check-any-budget.mjs --update`);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (err) {
    die(`baseline JSON không hợp lệ — ${err.message}`);
  }
  return data;
}

if (!existsSync(SRC)) die('không tìm thấy thư mục src/ (chạy từ gốc repo).');

const perFile = {};
let total = 0;
for (const abs of walk(SRC)) {
  const path = relPath(abs);
  const text = readFileSync(abs, 'utf8');
  let n = 0;
  for (const line of text.split('\n')) if (PATTERN.test(line)) n++;
  if (n > 0) {
    perFile[path] = n;
    total += n;
  }
}

/* ------------------------------------------------------------------ --update */
if (UPDATE) {
  let data = { version: 1 };
  if (existsSync(BASELINE_PATH)) {
    try {
      data = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
    } catch (err) {
      die(`baseline JSON không hợp lệ — ${err.message}`);
    }
  }
  data.anyBudget = {
    pattern: ': any | as any',
    countedBy: 'line',
    updatedAt: new Date().toISOString().slice(0, 10),
    count: total,
    byFile: perFile,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`check-any-budget: đã chốt baseline ${total} dòng chứa any → ${relPath(BASELINE_PATH)}`);
  process.exit(0);
}

/* ------------------------------------------------------------------ kiểm tra */
const data = readBaseline();
const budget = data?.anyBudget?.count;
if (typeof budget !== 'number') {
  die('baseline thiếu `anyBudget.count` — chạy: node scripts/check-any-budget.mjs --update');
}

const over = total - budget;
const ok = over <= 0;
const growth = Object.entries(perFile)
  .filter(([file, n]) => (data?.anyBudget?.byFile?.[file] ?? 0) < n)
  .sort((a, b) => b[1] - a[1])
  .map(([file, n]) => ({ file, now: n, baseline: data?.anyBudget?.byFile?.[file] ?? 0 }));

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        ok,
        budget,
        count: total,
        over: Math.max(over, 0),
        growth,
        violations: growth,
      },
      null,
      2
    )
  );
  process.exit(ok ? 0 : 1);
}

console.log(`check-any-budget: ${total} dòng chứa any · ngân sách ${budget}`);
if (ok) {
  console.log(`PASS — còn ${Math.max(budget - total, 0)} dòng dư so với baseline (chỉ được giảm).`);
} else {
  console.log(`FAIL — vượt ngân sách ${over} dòng. File tăng nhiều nhất:`);
  for (const g of growth.slice(0, 15)) console.log(`  - ${g.file}: ${g.baseline} → ${g.now}`);
  console.log('Cách xử lý: bỏ `any` mới (dùng type thật/unknown) hoặc gói qua helper có type.');
}
process.exit(ok ? 0 : 1);
