#!/usr/bin/env node
/**
 * loop-audit.mjs — "giác quan" của vòng lặp cải tiến (Loop Improvement).
 *
 * Đo lường trạng thái chất lượng hiện tại, xếp hạng nợ thành backlog ưu tiên, và so
 * sánh với lần chạy trước (`.loop/history.jsonl`) để biết vòng lặp có tiến bộ không.
 * Chỉ dùng Node built-ins — KHÔNG thêm dependency.
 *
 * Đo gì:
 *   - 9 gate hồi quy (check-ui-rules, fabricated, contrast, icon, unitprice, RLS, SQL…)
 *   - `npm run lint` (tsc) và `npm run build` (kích thước dist)
 *   - Nợ design-system từ `check-ui-rules --json` (allowlist budget + vi phạm mới)
 *   - Quét tĩnh: TODO/FIXME/HACK, console.log, @ts-ignore, `: any`
 *   - (tùy chọn) smoke browser qua biến môi trường LOOP_BROWSER_CMD
 *
 * Điểm `score`: CÀNG THẤP CÀNG TỐT. Gate fail chiếm trọng số áp đảo để không bao giờ
 * đánh đổi hồi quy lấy nợ. `improved` = score giảm so với lần chạy trước.
 *
 * Dùng:
 *   node scripts/loop-audit.mjs                 # đầy đủ (lint + gate + build + tĩnh)
 *   node scripts/loop-audit.mjs --quick         # bỏ build (nhanh, dùng khi lặp liên tục)
 *   node scripts/loop-audit.mjs --json          # chỉ in JSON ra stdout
 *   node scripts/loop-audit.mjs --no-write      # không ghi .loop/
 *   LOOP_BROWSER_CMD="node /tmp/opencode/pwtest/test.mjs" node scripts/loop-audit.mjs
 *
 * RC: 0 = không hồi quy (mọi gate xanh) · 1 = có gate fail/vi phạm mới · 2 = lỗi công cụ.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOOP_DIR = join(ROOT, '.loop');
const AS_JSON = process.argv.includes('--json');
const NO_WRITE = process.argv.includes('--no-write');
const QUICK = process.argv.includes('--quick');

const GATES = [
  'check-ui-rules',
  'check-fabricated',
  'check-contrast',
  'check-contrast-combos',
  'check-icon-names',
  'check-unitprice-multiplier',
  'lint-rls-sources',
  'lint-rls-migration',
  'a8-sql-syntax-check',
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.loop', '__snapshots__']);

function run(cmd, args, { timeout = 240000 } = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 });
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    error: r.error ? String(r.error.message || r.error) : null,
  };
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function dirBytes(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) total += dirBytes(full);
    else total += st.size;
  }
  return total;
}

function parseJsonLoose(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

// ---------- gate results ----------
const gateResults = {};
const gateFailures = [];
for (const gate of GATES) {
  const r = run('node', [join('scripts', `${gate}.mjs`)]);
  gateResults[gate] = r.ok;
  if (!r.ok) gateFailures.push({ gate, output: (r.stdout + r.stderr).split('\n').slice(-8).join('\n') });
}

// ---------- lint + build ----------
const lint = run('npm', ['run', 'lint']);
const lintErrors = lint.ok ? 0 : (lint.stdout + lint.stderr).split('\n').filter((l) => /error TS/.test(l)).length || 1;

let build = { pass: null, distBytes: 0, indexJsBytes: 0 };
if (!QUICK) {
  const b = run('npm', ['run', 'build']);
  let indexJsBytes = 0;
  const m = /dist\/assets\/index-[\w-]+\.js\s+([\d.,]+)\s*kB/.exec(b.stdout);
  if (m) indexJsBytes = Math.round(parseFloat(m[1].replace(/,/g, '')) * 1024);
  build = { pass: b.ok, distBytes: dirBytes(join(ROOT, 'dist')), indexJsBytes };
}

// ---------- design-system debt ----------
const uiRulesRun = run('node', [join('scripts', 'check-ui-rules.mjs'), '--json']);
const uiJson = parseJsonLoose(uiRulesRun.stdout) || { allowed: [], violations: [], counts: {} };
const debt = (uiJson.allowed || []).reduce((s, a) => s + a.count, 0);
const newViolations = (uiJson.violations || []).reduce((s, v) => s + v.count, 0);

// ---------- static scan ----------
const staticCounts = { todo: 0, fixme: 0, consoleLog: 0, tsIgnore: 0, any: 0, eslintDisable: 0 };
const staticFiles = new Map();
for (const file of walkFiles(join(ROOT, 'src'))) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  const bump = (key, re) => {
    const n = (text.match(re) || []).length;
    if (n) { staticCounts[key] += n; staticFiles.set(rel, (staticFiles.get(rel) || 0) + n); }
  };
  bump('todo', /\bTODO\b/g);
  bump('fixme', /\bFIXME\b/g);
  bump('consoleLog', /console\.log\(/g);
  bump('tsIgnore', /@ts-ignore|@ts-expect-error/g);
  bump('any', /:\s*any\b/g);
  bump('eslintDisable', /eslint-disable/g);
}

// ---------- optional browser smoke ----------
let browser = { ran: false, pass: null, note: 'skipped (đặt LOOP_BROWSER_CMD để chạy)' };
if (process.env.LOOP_BROWSER_CMD) {
  const r = run(process.env.LOOP_BROWSER_CMD, [], { timeout: 600000 });
  browser = { ran: true, pass: r.ok, note: r.ok ? 'browser smoke PASS' : (r.stdout + r.stderr).split('\n').slice(-6).join('\n') };
}

// ---------- score ----------
const gatesPass = Object.values(gateResults).filter(Boolean).length;
const gatesFailed = GATES.length - gatesPass;
const lintPass = lint.ok;
const buildOk = QUICK ? true : build.pass;
const distMB = build.distBytes / 1048576;
const score =
  gatesFailed * 10000 +
  (lintPass ? 0 : 5000) +
  (buildOk ? 0 : 3000) +
  newViolations * 1000 +
  debt * 10 +
  staticCounts.todo * 2 +
  staticCounts.fixme * 2 +
  staticCounts.consoleLog * 1 +
  staticCounts.tsIgnore * 3 +
  Math.round(distMB * 5 * 10) / 10;

// ---------- history / improved ----------
let iteration = 1;
let previous = null;
let improved = null;
if (existsSync(LOOP_DIR)) {
  const statePath = join(LOOP_DIR, 'state.json');
  if (existsSync(statePath)) {
    try { iteration = (JSON.parse(readFileSync(statePath, 'utf8')).iteration || 0) + 1; } catch {}
  }
  const histPath = join(LOOP_DIR, 'history.jsonl');
  if (existsSync(histPath)) {
    const lines = readFileSync(histPath, 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length) { try { previous = JSON.parse(lines[lines.length - 1]); } catch {} }
  }
}
if (previous && typeof previous.score === 'number') improved = score < previous.score;

// ---------- backlog ----------
const backlog = [];
for (const f of gateFailures) {
  backlog.push({
    id: `gate:${f.gate}`, priority: 'P0', kind: 'gate',
    title: `Gate ${f.gate} đang FAIL`,
    action: `Sửa nguyên nhân gốc; chạy lại \`node scripts/${f.gate}.mjs\` tới khi xanh.`,
    evidence: f.output,
  });
}
if (!lintPass) {
  backlog.push({ id: 'lint:tsc', priority: 'P0', kind: 'lint', title: 'TypeScript có lỗi', action: 'Sửa lỗi `npm run lint`.', evidence: lint.stdout.slice(0, 800) });
}
if (newViolations > 0) {
  backlog.push({
    id: 'ui-rules:new', priority: 'P0', kind: 'debt',
    title: `${newViolations} vi phạm design-system MỚI/vượt budget`,
    action: 'Sửa theo luật trong scripts/check-ui-rules.mjs (hoặc hạ budget nếu là nợ cũ).',
    evidence: (uiJson.violations || []).slice(0, 8).map((v) => `${v.key} (${v.count}${v.budget != null ? `/${v.budget}` : ''})`).join('\n'),
  });
}
const RULE_FIX = {
  'focus-no-ring': 'Thêm `focus-visible:ring-2 focus-visible:ring-ring` cho control `focus:outline-none`.',
  'unguarded-tolocale': 'Chuyển sang `Money`/`formatNumber` (trả EMPTY_VALUE "—") hoặc thêm guard Number.isFinite.',
  'infinite-animation': 'Thêm `motion-reduce:animate-none` cùng className.',
  'control-border-line': 'Đổi `border-line` → `border-line-control` trên control.',
};
for (const a of (uiJson.allowed || []).slice().sort((x, y) => y.count - x.count)) {
  const rule = a.key.split('::')[1];
  backlog.push({
    id: `debt:${a.key}`, priority: 'P1', kind: 'debt', metric: 'debt',
    title: `Giảm nợ ${rule} ở ${a.key.split('::')[0]} (${a.count}/${a.budget})`,
    action: `${RULE_FIX[rule] || 'Sửa theo luật.'} Mục tiêu: count giảm, đồng thời hạ \`budget\` tương ứng.`,
    impact: `-${a.count}`,
  });
}
const dirtyStatic = [...staticFiles.entries()].filter(([f]) => !f.includes('.d.ts')).sort((x, y) => y[1] - x[1]).slice(0, 10);
if (staticCounts.todo + staticCounts.fixme > 0) {
  backlog.push({ id: 'static:todo', priority: 'P2', kind: 'static', title: `Dọn ${staticCounts.todo} TODO + ${staticCounts.fixme} FIXME`, action: 'Giải quyết hoặc chuyển thành issue; ưu tiên file nhiều nhất.', evidence: dirtyStatic.map(([f, n]) => `${f} (${n})`).join('\n') });
}
if (staticCounts.consoleLog > 0) {
  backlog.push({ id: 'static:console', priority: 'P2', kind: 'static', title: `Bỏ ${staticCounts.consoleLog} console.log trong src`, action: 'Giữ console.warn/error nếu hữu ích; bỏ log debug.', evidence: [...staticFiles.entries()].filter(([f, n]) => n && readFileSync(join(ROOT, f), 'utf8').includes('console.log(')).slice(0, 8).map(([f]) => f).join('\n') });
}
if (!QUICK && build.pass && build.indexJsBytes > 900 * 1024) {
  backlog.push({ id: 'perf:bundle', priority: 'P3', kind: 'perf', title: `Giảm bundle index (${Math.round(build.indexJsBytes / 1024)} kB)`, action: 'Rà import nặng, code-split thêm, tránh kéo three.js vào bundle chính.', impact: `dist=${distMB.toFixed(1)}MB` });
}
backlog.sort((a, b) => a.priority.localeCompare(b.priority));

const metrics = {
  timestamp: new Date().toISOString(),
  iteration,
  score: Math.round(score * 10) / 10,
  improved,
  previousScore: previous?.score ?? null,
  gates: gateResults,
  gatesPass,
  gatesFailed,
  lintPass,
  lintErrors,
  build: { pass: buildOk, distBytes: build.distBytes, indexJsBytes: build.indexJsBytes, distMB: Math.round(distMB * 10) / 10 },
  debt,
  newViolations,
  uiDebtByRule: uiJson.counts || {},
  static: staticCounts,
  browser,
  backlog,
};

// ---------- persist ----------
if (!NO_WRITE) {
  mkdirSync(LOOP_DIR, { recursive: true });
  writeFileSync(join(LOOP_DIR, 'latest.json'), JSON.stringify(metrics, null, 2));
  appendFileSync(join(LOOP_DIR, 'history.jsonl'), JSON.stringify({ iteration, timestamp: metrics.timestamp, score: metrics.score, debt, gatesFailed, improved }) + '\n');
}

// ---------- report ----------
if (AS_JSON) {
  console.log(JSON.stringify(metrics, null, 2));
} else {
  const tick = (b) => (b ? 'PASS' : 'FAIL');
  console.log(`\n=== LOOP AUDIT · iteration ${iteration} ===`);
  const trend = improved === null ? '' : improved ? '  ↓ improved' : score === previous?.score ? '  = no change' : '  ↑ regression';
  console.log(`score=${metrics.score}${trend}${previous ? ` (prev ${previous.score})` : ''}`);
  console.log(`gates ${gatesPass}/${GATES.length}  lint ${tick(lintPass)}  build ${QUICK ? 'skipped' : tick(buildOk)}  dist ${metrics.build.distMB}MB`);
  console.log(`nợ design-system: ${debt}  ·  vi phạm mới: ${newViolations}  ·  static: todo=${staticCounts.todo} fixme=${staticCounts.fixme} console.log=${staticCounts.consoleLog}`);
  console.log(`browser: ${browser.ran ? tick(browser.pass) : 'skipped'}`);
  if (gatesFailed || !lintPass) {
    console.log('\nGATE FAIL:');
    for (const f of gateFailures) console.log(`  ✗ ${f.gate}`);
    if (!lintPass) console.log('  ✗ lint');
  }
  console.log('\nBACKLOG (ưu tiên cao trước):');
  const top = backlog.filter((b) => b.priority !== 'P3').slice(0, 12);
  for (const b of top) console.log(`  [${b.priority}] ${b.title}`);
  if (!top.length) console.log('  (trống — không còn nợ P0/P1/P2)');
  console.log(`\n→ chi tiết: ${NO_WRITE ? '(không ghi)' : '.loop/latest.json'}   ·   VERDICT: ${gatesFailed || newViolations || !lintPass ? 'REGRESSION' : 'PASS'}`);
}

process.exit(gatesFailed || newViolations || !lintPass ? 1 : 0);
