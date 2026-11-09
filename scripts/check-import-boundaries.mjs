#!/usr/bin/env node
/**
 * check-import-boundaries.mjs — chặn frontend import thẳng tầng backend.
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * AGENTS.md: "database access goes through services, never inline in components". Hiện đã có
 * 22 file `src/frontend/**` import `backend/supabase` và 33 file import `backend/services`
 * (đo bằng chính script này — đếm câu import thật, KHÔNG đếm tên path trong comment).
 * Không thể sửa hết ngay, nên gate giữ danh sách nợ trong `scripts/guard-baseline.json`:
 *   - file frontend ĐÃ có trong baseline  → tiếp tục được phép (nợ cũ);
 *   - file frontend MỚI import backend    → FAIL (chặn nợ mới);
 *   - rule = `backend/supabase` hoặc `backend/services`, xét theo đích đã resolve
 *     (alias `@backend/…`, `@/…`, `@frontend/…` và đường dẫn tương đối).
 *
 * `--update` ghi lại danh sách hiện tại (chỉ dùng khi đã trả bớt nợ, không dùng để nới).
 * Bỏ qua file test (`*.test.*`, `*.spec.*`, thư mục `__tests__`/`tests`).
 *
 * Dùng:  node scripts/check-import-boundaries.mjs [--json] [--update]
 * RC: 0 = PASS · 1 = có file mới vi phạm · 2 = lỗi công cụ.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const FRONTEND = join(SRC, 'frontend');
const BASELINE_PATH = join(ROOT, 'scripts', 'guard-baseline.json');
const AS_JSON = process.argv.includes('--json');
const UPDATE = process.argv.includes('--update');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-ssr', '.loop', 'coverage']);
const RULES = [
  { id: 'backend/supabase', prefix: 'src/backend/supabase/' },
  { id: 'backend/services', prefix: 'src/backend/services/' },
];
const ALIASES = [
  ['@frontend/', 'src/frontend/'],
  ['@backend/', 'src/backend/'],
  ['@/', 'src/'],
];
const SPEC_RES = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

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
  else console.error(`check-import-boundaries: ${msg}`);
  process.exit(code);
}

function isTestFile(path) {
  return /\.(test|spec)\.(ts|tsx)$/.test(path) || /(^|\/)(__tests__|tests)\//.test(path);
}

/**
 * Bỏ comment (`//`, `/* … *\/`) nhưng GIỮ độ dài + newline, để import giả trong comment
 * không bị tính là import thật. Tôn trọng chuỗi '…' "…" `…` để `//` trong URL không bị cắt.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  let state = 'code';
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (state === 'code') {
      if (ch === '/' && next === '/') { state = 'line'; out += '  '; i += 2; continue; }
      if (ch === '/' && next === '*') { state = 'block'; out += '  '; i += 2; continue; }
      if (ch === "'") state = 'single';
      else if (ch === '"') state = 'double';
      else if (ch === '`') state = 'template';
      out += ch;
      i++;
      continue;
    }
    if (state === 'line') {
      if (ch === '\n') { state = 'code'; out += '\n'; } else out += ' ';
      i++;
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') { state = 'code'; out += '  '; i += 2; continue; }
      out += ch === '\n' ? '\n' : ' ';
      i++;
      continue;
    }
    if (state === 'single' || state === 'double') {
      const q = state === 'single' ? "'" : '"';
      if (ch === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
      if (ch === q) state = 'code';
      out += ch;
      i++;
      continue;
    }
    // template
    if (ch === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
    if (ch === '`') state = 'code';
    out += ch;
    i++;
  }
  return out;
}

function extractSpecs(text) {
  const specs = new Set();
  for (const re of SPEC_RES) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) specs.add(m[1]);
  }
  return specs;
}

/** Resolve specifier (relative/alias) → đường dẫn repo tính từ gốc, hoặc null nếu là package. */
function resolveSpec(fromFile, spec) {
  const bare = spec.split('?')[0].split('#')[0];
  if (!bare) return null;
  let target;
  if (bare.startsWith('.')) {
    target = posix.normalize(posix.join(posix.dirname(fromFile), bare));
  } else {
    const alias = ALIASES.find(([a]) => bare.startsWith(a));
    if (!alias) return null; // package ngoài (react, zustand…)
    target = posix.normalize(alias[1] + bare.slice(alias[0].length));
  }
  return target.startsWith('src/') ? target : null;
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    die(`thiếu baseline ${relPath(BASELINE_PATH)} — chạy: node scripts/check-import-boundaries.mjs --update`);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (err) {
    die(`baseline JSON không hợp lệ — ${err.message}`);
  }
  return data;
}

if (!existsSync(FRONTEND)) die('không tìm thấy src/frontend/ (chạy từ gốc repo).');

/** ruleId → { file → [specifier…] } cho các file frontend hiện vi phạm. */
const current = Object.fromEntries(RULES.map((r) => [r.id, {}]));
for (const abs of walk(FRONTEND)) {
  const path = relPath(abs);
  if (isTestFile(path)) continue;
  const specs = extractSpecs(stripComments(readFileSync(abs, 'utf8')));
  for (const spec of specs) {
    const target = resolveSpec(path, spec);
    if (!target) continue;
    const rule = RULES.find((r) => target.startsWith(r.prefix));
    if (!rule) continue;
    (current[rule.id][path] ??= []).push(spec);
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
  data.importBoundaries = {
    updatedAt: new Date().toISOString().slice(0, 10),
    note: 'Nợ cũ: src/frontend/** được phép import 2 tầng backend dưới đây. File KHÔNG có trong danh sách mà import → gate FAIL.',
    rules: Object.fromEntries(
      RULES.map((r) => [r.id, Object.keys(current[r.id]).sort()])
    ),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const counts = RULES.map((r) => `${r.id}=${Object.keys(current[r.id]).length}`).join(', ');
  console.log(`check-import-boundaries: đã chốt baseline (${counts}) → ${relPath(BASELINE_PATH)}`);
  process.exit(0);
}

/* ------------------------------------------------------------------ kiểm tra */
const data = readBaseline();
const baselineRules = data?.importBoundaries?.rules;
if (!baselineRules || typeof baselineRules !== 'object') {
  die('baseline thiếu `importBoundaries.rules` — chạy: node scripts/check-import-boundaries.mjs --update');
}

const violations = [];
for (const rule of RULES) {
  const allowed = new Set(baselineRules[rule.id] ?? []);
  for (const [file, specs] of Object.entries(current[rule.id])) {
    if (allowed.has(file)) continue;
    for (const spec of specs.sort()) violations.push({ file, rule: rule.id, specifier: spec });
  }
}
violations.sort((a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule));

const ok = violations.length === 0;
const totalFiles = RULES.reduce((n, r) => n + Object.keys(current[r.id]).length, 0);

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        ok,
        rules: Object.fromEntries(RULES.map((r) => [r.id, Object.keys(current[r.id]).length])),
        currentFiles: totalFiles,
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
  `check-import-boundaries: ${RULES.map((r) => `${r.id}=${Object.keys(current[r.id]).length}`).join(' · ')} file frontend`
);
if (ok) {
  console.log('PASS — không có file frontend MỚI import thẳng backend/supabase hoặc backend/services.');
} else {
  console.log(`FAIL — ${violations.length} import mới vi phạm ranh giới tầng:`);
  for (const v of violations) console.log(`  - ${v.file} → ${v.specifier}  [${v.rule}]`);
  console.log('Cách xử lý: đưa truy cập DB vào service rồi import service qua hook/route wrapper.');
}
process.exit(ok ? 0 : 1);
