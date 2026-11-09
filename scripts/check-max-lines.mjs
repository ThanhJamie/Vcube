#!/usr/bin/env node
/**
 * check-max-lines.mjs — cổng "không phình file" cho `src/**`.
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * AGENTS.md chốt file ≤ ~800 dòng sau Phase 4, nhưng hiện còn 22 file vượt ngưỡng. Không thể
 * bắt mọi file về ≤800 ngay (phải tách module lớn), nên gate này giữ CI xanh bằng cách:
 *   - file MỚI (không có trong baseline) mà > 800 dòng  → FAIL (chặn nợ mới);
 *   - file ĐÃ CÓ trong baseline mà TĂNG quá 20 dòng so với baseline → FAIL (chặn phình thêm);
 *   - file baseline giảm/đổi tên/xoá → không sao (nợ đã trả bớt).
 *
 * Baseline `scripts/guard-baseline.json` lưu số dòng ĐO THẬT của từng file > 800 tại thời điểm
 * chốt. Chỉ cập nhật bằng `--update` sau khi đã tách nhỏ (ratchet xuống, không nới lên).
 *
 * Dùng:  node scripts/check-max-lines.mjs [--json] [--update]
 * RC: 0 = PASS · 1 = vi phạm · 2 = lỗi công cụ.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const BASELINE_PATH = join(ROOT, 'scripts', 'guard-baseline.json');
const AS_JSON = process.argv.includes('--json');
const UPDATE = process.argv.includes('--update');
const THRESHOLD = 800;
const GROWTH_ALLOWANCE = 20;
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

/** Số dòng "biên tập" (đếm newline như `wc -l` nhưng tôn trọng dòng cuối không có \n). */
function countLines(text) {
  if (!text) return 0;
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

function relPath(abs) {
  return relative(ROOT, abs).split(sep).join('/');
}

function die(msg, code = 2) {
  if (AS_JSON) console.log(JSON.stringify({ ok: false, error: msg }, null, 2));
  else console.error(`check-max-lines: ${msg}`);
  process.exit(code);
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    die(`thiếu baseline ${relPath(BASELINE_PATH)} — chạy: node scripts/check-max-lines.mjs --update`);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (err) {
    die(`baseline JSON không hợp lệ — ${err.message}`);
  }
  const files = data?.maxLines?.files;
  if (!files || typeof files !== 'object') {
    die('baseline thiếu `maxLines.files` — chạy: node scripts/check-max-lines.mjs --update');
  }
  return { data, files };
}

if (!existsSync(SRC)) die('không tìm thấy thư mục src/ (chạy từ gốc repo).');

const all = walk(SRC)
  .map((abs) => ({ path: relPath(abs), lines: countLines(readFileSync(abs, 'utf8')) }))
  .sort((a, b) => a.path.localeCompare(b.path));

const overThreshold = all.filter((f) => f.lines > THRESHOLD);

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
  data.maxLines = {
    threshold: THRESHOLD,
    growthAllowance: GROWTH_ALLOWANCE,
    updatedAt: new Date().toISOString().slice(0, 10),
    files: Object.fromEntries(overThreshold.map((f) => [f.path, f.lines])),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(
    `check-max-lines: đã chốt baseline ${overThreshold.length} file > ${THRESHOLD} dòng → ${relPath(BASELINE_PATH)}`
  );
  process.exit(0);
}

/* ------------------------------------------------------------------ kiểm tra */
const { files: baselineFiles } = readBaseline();
const violations = [];

for (const f of overThreshold) {
  const base = baselineFiles[f.path];
  if (typeof base !== 'number') {
    violations.push({ file: f.path, lines: f.lines, baseline: null, reason: `file mới > ${THRESHOLD} dòng` });
  } else if (f.lines - base > GROWTH_ALLOWANCE) {
    violations.push({
      file: f.path,
      lines: f.lines,
      baseline: base,
      reason: `tăng ${f.lines - base} dòng (trần +${GROWTH_ALLOWANCE})`,
    });
  }
}

const ok = violations.length === 0;

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        ok,
        threshold: THRESHOLD,
        growthAllowance: GROWTH_ALLOWANCE,
        scanned: all.length,
        overThreshold: overThreshold.length,
        violations,
        count: violations.length,
      },
      null,
      2
    )
  );
  process.exit(ok ? 0 : 1);
}

console.log(
  `check-max-lines: quét ${all.length} file · >${THRESHOLD} dòng: ${overThreshold.length} (baseline ${
    Object.keys(baselineFiles).length
  })`
);
if (ok) {
  console.log(`PASS — không file mới vượt ${THRESHOLD} dòng, không file baseline tăng quá ${GROWTH_ALLOWANCE} dòng.`);
} else {
  console.log(`FAIL — ${violations.length} vi phạm:`);
  for (const v of violations) console.log(`  - ${v.file}: ${v.lines} dòng (${v.reason})`);
  console.log('Cách xử lý: tách module cho file mới/phình ra; chỉ dùng --update khi đã thu nhỏ thật.');
}
process.exit(ok ? 0 : 1);
