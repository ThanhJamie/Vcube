#!/usr/bin/env node
/**
 * check-import-cycles.mjs — phát hiện vòng import trong `src/**`.
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * Vòng import làm thứ tự khởi tạo module không xác định (TDZ / `undefined` lúc chạy), đặc biệt
 * với store Zustand và service singleton. Gate dựng graph từ các câu import TƯƠNG ĐỐI + alias
 * (`@/`, `@frontend/`, `@backend/`) rồi tìm strongly-connected component (Tarjan). Baseline là
 * RÀNG BUỘC CỨNG = 0: bất kỳ vòng nào xuất hiện đều fail. Không có `--update` để "chốt" vòng,
 * vì tha vòng import là tha lỗi runtime khó tái hiện.
 *
 * CHỈ XÉT VÒNG RUNTIME (cố ý):
 *   - bỏ `import type …` / `export type … from` (bị TS xoá khi biên dịch);
 *   - bỏ type query `import('./x').Foo` và `typeof import('./x')` (chỉ tồn tại ở tầng type).
 * Vòng chỉ gồm type không gây lỗi khởi tạo; vòng có import thật mới fail.
 *
 * Import package ngoài (react, zustand…) và specifier không resolve được trong `src/` bị bỏ qua.
 *
 * Dùng:  node scripts/check-import-cycles.mjs [--json]
 * RC: 0 = PASS (0 vòng) · 1 = có vòng import · 2 = lỗi công cụ.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const AS_JSON = process.argv.includes('--json');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-ssr', '.loop', 'coverage']);
const ALIASES = [
  ['@frontend/', 'src/frontend/'],
  ['@backend/', 'src/backend/'],
  ['@/', 'src/'],
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
  else console.error(`check-import-cycles: ${msg}`);
  process.exit(code);
}

/** Bỏ câu import/export type-only (giữ nguyên độ dài để index của match còn đúng). */
function stripTypeOnly(text) {
  return text
    .replace(/\bimport\s+type\s[^;'"]*?from\s*['"][^'"]+['"]/g, (m) => ' '.repeat(m.length))
    .replace(/\bexport\s+type\s[^;'"]*?from\s*['"][^'"]+['"]/g, (m) => ' '.repeat(m.length));
}

/** Bỏ comment nhưng giữ nguyên độ dài + newline (import giả trong comment không thành cạnh). */
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
    if (ch === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
    if (ch === '`') state = 'code';
    out += ch;
    i++;
  }
  return out;
}

/** Specifier có cạnh RUNTIME (đã bỏ type-only + type query). */
function extractSpecs(text) {
  const src = stripTypeOnly(text);
  const specs = new Set();

  // `import … from 'x'` / `export … from 'x'` (type đã bị loại ở trên).
  for (const m of src.matchAll(/\b(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
  // `import 'x'` (side-effect) và `require('x')`.
  for (const m of src.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) specs.add(m[1]);
  for (const m of src.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.add(m[1]);
  // `import('x')` — chỉ tính khi KHÔNG phải type query (`import('./x').Foo`, `typeof import('./x')`).
  for (const m of src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const after = src.slice(m.index + m[0].length);
    if (/^\s*\.\s*(?!then\b|catch\b|finally\b)[A-Za-z_$]/.test(after)) continue;
    if (/typeof\s*$/.test(src.slice(Math.max(0, m.index - 16), m.index))) continue;
    specs.add(m[1]);
  }
  return specs;
}

/** Resolve specifier → file trong src (thử .ts, .tsx, /index.ts, /index.tsx) hoặc null. */
function resolveSpec(fromFile, spec, files) {
  const bare = spec.split('?')[0].split('#')[0];
  if (!bare) return null;
  let target;
  if (bare.startsWith('.')) {
    target = posix.normalize(posix.join(posix.dirname(fromFile), bare));
  } else {
    const alias = ALIASES.find(([a]) => bare.startsWith(a));
    if (!alias) return null; // package ngoài
    target = posix.normalize(alias[1] + bare.slice(alias[0].length));
  }
  if (!target.startsWith('src/')) return null;
  const candidates = [target];
  if (!/\.(ts|tsx)$/.test(target)) {
    candidates.push(`${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`);
  }
  return candidates.find((c) => files.has(c)) ?? null;
}

if (!existsSync(SRC)) die('không tìm thấy thư mục src/ (chạy từ gốc repo).');

const fileList = walk(SRC).map(relPath).sort();
const files = new Set(fileList);
/** graph: file → Set(file) đích. */
const graph = new Map(fileList.map((f) => [f, new Set()]));

for (const file of fileList) {
  const text = stripComments(readFileSync(join(ROOT, file), 'utf8'));
  for (const spec of extractSpecs(text)) {
    const target = resolveSpec(file, spec, files);
    if (target && target !== file) graph.get(file).add(target);
  }
}

let edgeCount = 0;
for (const targets of graph.values()) edgeCount += targets.size;

/* ------------------------------------------------------------------ Tarjan SCC */
let index = 0;
const idx = new Map();
const low = new Map();
const onStack = new Set();
const stack = [];
const sccs = [];

function strongconnect(v) {
  idx.set(v, index);
  low.set(v, index);
  index++;
  stack.push(v);
  onStack.add(v);

  for (const w of graph.get(v) ?? []) {
    if (!idx.has(w)) {
      strongconnect(w);
      low.set(v, Math.min(low.get(v), low.get(w)));
    } else if (onStack.has(w)) {
      low.set(v, Math.min(low.get(v), idx.get(w)));
    }
  }

  if (low.get(v) === idx.get(v)) {
    const scc = [];
    let w;
    do {
      w = stack.pop();
      onStack.delete(w);
      scc.push(w);
    } while (w !== v);
    sccs.push(scc.sort());
  }
}

for (const v of fileList) if (!idx.has(v)) strongconnect(v);

/** Vòng = SCC > 1 node, hoặc self-loop (đã bỏ self-edge khi dựng graph nên chỉ còn SCC > 1). */
const cycles = sccs.filter((scc) => scc.length > 1).sort((a, b) => a[0].localeCompare(b[0]));
const ok = cycles.length === 0;

if (AS_JSON) {
  console.log(
    JSON.stringify(
      { ok, files: fileList.length, edges: edgeCount, cycles, count: cycles.length },
      null,
      2
    )
  );
  process.exit(ok ? 0 : 1);
}

console.log(`check-import-cycles: ${fileList.length} file · ${edgeCount} cạnh import nội bộ`);
if (ok) {
  console.log('PASS — 0 vòng import.');
} else {
  console.log(`FAIL — ${cycles.length} vòng import (nhóm strongly-connected):`);
  for (const scc of cycles) {
    console.log(`  - ${scc.length} file:`);
    for (const f of scc) console.log(`      ${f}`);
  }
  console.log('Cách xử lý: tách phần dùng chung ra module lá (không import ngược), tránh barrel cycle.');
}
process.exit(ok ? 0 : 1);
