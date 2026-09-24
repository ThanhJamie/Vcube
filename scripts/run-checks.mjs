#!/usr/bin/env node
/**
 * run-checks.mjs — T05: chạy mọi gate trong `scripts/gate-manifest.json` rồi so với baseline.
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * Trước T05 không có một cổng thống nhất: mỗi lần phải nhớ chạy tay từng `check-*.mjs`,
 * `lint-rls-*.mjs`, `a8-sql-syntax-check.mjs`, test tích hợp... và không ai biết "kết quả
 * hiện tại đã TỆ HƠN lúc đầu chưa". File này chạy hết manifest và chỉ đỏ khi RC hoặc số vi
 * phạm TĂNG so với `docs/tasks/baseline.json`.
 *
 * Cách dùng:
 *   node scripts/run-checks.mjs                       # chạy hết; tự dùng baseline nếu có
 *   node scripts/run-checks.mjs --baseline            # đường dẫn mặc định docs/tasks/baseline.json
 *   node scripts/run-checks.mjs --baseline path.json  # baseline khác
 *   node scripts/run-checks.mjs --no-baseline         # không so baseline; đỏ nếu gate thường thất bại
 *   node scripts/run-checks.mjs --only check-contrast # chỉ chạy 1 (hoặc nhiều) gate
 *   node scripts/run-checks.mjs --list-unregistered   # in script check- va lint- chua co trong manifest
 *   node scripts/run-checks.mjs --self-test           # kiểm tra manifest có phủ hết gate không
 *   node scripts/run-checks.mjs --allow-unregistered  # hạ unregistered xuống cảnh báo (mặc định: FAIL)
 *   node scripts/run-checks.mjs --json                # kết quả máy đọc
 *
 * RC: 0 = không tệ hơn baseline · 1 = có gate tệ hơn, script chưa đăng ký, hoặc thất bại khi
 *     không so baseline · 2 = lỗi công cụ (manifest hỏng, id không tồn tại…).
 *
 * BẢO ĐẢM PHỦ MANIFEST (chống false-PASS):
 *   Mọi `scripts/check-*.mjs` và `scripts/lint-*.mjs` PHẢI có trong gate-manifest.json.
 *   Script chưa đăng ký làm `run-checks` thoát != 0 (dùng --allow-unregistered để hạ xuống
 *   cảnh báo, ví dụ khi đang phát triển). Xoá một gate khỏi manifest cũng vì thế mà lộ ra.
 *   `--self-test` xác nhận manifest còn liệt kê `lint` và `build` và không bỏ sót script nào.
 *
 * `advisory:true`   → không bao giờ làm đỏ (ví dụ check-doc-refs).
 * `optional:true`   → bỏ qua im lặng nếu file script chưa tồn tại (slot chờ task sau tạo).
 * `live:true`       → cần mạng/env Supabase; baseline RC có thể khác 0 (so, không ép 0).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'scripts/gate-manifest.json');
const DEFAULT_BASELINE = join(ROOT, 'docs/tasks/baseline.json');
const SCRIPT_RE = /(?:^|[\s"'=])((?:scripts|supabase)\/[\w./-]+\.(?:mjs|js|ts|cjs))/g;
const UNREGISTERED_RE = /^(?:check-|lint-).*\.mjs$/;

/* ------------------------------------------------------------------ argv */
const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const NO_BASELINE = argv.includes('--no-baseline');
const LIST_UNREG = argv.includes('--list-unregistered');
const SELF_TEST = argv.includes('--self-test');
const ALLOW_UNREGISTERED = argv.includes('--allow-unregistered');
const BASELINE_FLAG_AT = argv.indexOf('--baseline');
const HAS_BASELINE_FLAG = BASELINE_FLAG_AT !== -1;
const onlyIds = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--only') {
    if (!argv[i + 1] || argv[i + 1].startsWith('-')) die('--only cần một id gate.');
    onlyIds.push(argv[i + 1]);
    i++;
  } else if (argv[i].startsWith('--only=')) {
    onlyIds.push(argv[i].slice('--only='.length));
  }
}

function die(msg, code = 2) {
  console.error(`run-checks: ${msg}`);
  process.exit(code);
}

/* ------------------------------------------------------------------ manifest */
if (!existsSync(MANIFEST)) die(`thiếu ${MANIFEST}`);
let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch (err) {
  die(`manifest JSON không hợp lệ — ${err.message}`);
}
const gates = Array.isArray(manifest.gates) ? manifest.gates : [];
if (!gates.length) die('manifest không có gate nào.');

/* ------------------------------------------------------------------ list-unregistered */
function unregistered() {
  const registered = new Set();
  for (const g of gates) {
    for (const m of String(g.cmd ?? '').matchAll(SCRIPT_RE)) registered.add(m[1]);
  }
  const dir = join(ROOT, 'scripts');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => UNREGISTERED_RE.test(f))
    .map((f) => `scripts/${f}`)
    .filter((p) => !registered.has(p))
    .sort();
}

/* ------------------------------------------------------------------ self-test */
if (SELF_TEST) {
  const problems = [];
  const ids = new Set(gates.map((g) => g.id));
  for (const required of ['lint', 'build']) {
    if (!ids.has(required)) problems.push(`manifest thiếu gate bắt buộc: ${required}`);
  }
  for (const p of unregistered()) problems.push(`script chưa đăng ký trong manifest: ${p}`);
  if (AS_JSON) {
    console.log(JSON.stringify({ ok: problems.length === 0, problems }, null, 2));
  } else if (problems.length) {
    console.log('run-checks self-test: manifest KHÔNG đầy đủ:');
    for (const p of problems) console.log(`  - ${p}`);
  } else {
    console.log('run-checks self-test: manifest phủ hết gate (lint, build + mọi script check-*/lint-*).');
  }
  process.exit(problems.length ? 1 : 0);
}

if (LIST_UNREG) {
  const missing = unregistered();
  if (AS_JSON) {
    console.log(JSON.stringify({ unregistered: missing }, null, 2));
  } else if (missing.length) {
    console.log(`run-checks: ${missing.length} script chưa có trong manifest:`);
    for (const p of missing) console.log(`  - ${p}`);
  } else {
    console.log('run-checks: mọi script check-*/lint-* đều đã có trong manifest.');
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ chọn gate */
const selected = onlyIds.length ? gates.filter((g) => onlyIds.includes(g.id)) : gates;
if (onlyIds.length && selected.length !== onlyIds.length) {
  const known = new Set(gates.map((g) => g.id));
  const unknown = onlyIds.filter((id) => !known.has(id));
  die(`--only không khớp gate nào: ${unknown.join(', ')}`);
}

/* ------------------------------------------------------------------ chạy gate */
function gateFileMissing(g) {
  const paths = [...String(g.cmd ?? '').matchAll(SCRIPT_RE)].map((m) => m[1]);
  if (!paths.length) return false;
  return paths.some((p) => !existsSync(join(ROOT, p)));
}

function tryJson(text) {
  const t = text.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    /* stdout có thể lẫn log trước JSON — thử cắt từ ký tự mở đầu tiên */
  }
  const start = t.search(/[[{]/);
  if (start === -1) return null;
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

function countFromJson(json) {
  if (json == null) return null;
  if (Array.isArray(json)) {
    // check-contrast --json: mảng cặp {pass, expectedFail}
    return json.filter((r) => r && r.pass === false && r.expectedFail !== true).length;
  }
  if (typeof json === 'object') {
    if (typeof json.count === 'number') return json.count; // contrast-combos, fabricated
    if (Array.isArray(json.violations)) {
      let n = json.violations.length; // ui-rules, error-handling
      if (json.r3 && json.r3.over) n += 1;
      return n;
    }
    if (json.summary && typeof json.summary.fail === 'number') return json.summary.fail; // verify-rls
    if (typeof json.fail === 'number') return json.fail;
  }
  return null;
}

/** Đếm vi phạm best-effort. null = không suy ra được (bỏ qua so số lượng, chỉ so RC). */
function extractViolations(id, stdout, stderr, rc) {
  const fromJson = countFromJson(tryJson(stdout));
  if (fromJson !== null) return fromJson;

  const text = `${stdout}\n${stderr}`;
  if (id === 'doc-refs' || id === 'check-doc-refs') {
    const links = text.match(/link markdown chết:\s*(\d+)/i);
    const paths = text.match(/path backtick không tồn tại:\s*(\d+)/i);
    if (links || paths) return Number(links?.[1] ?? 0) + Number(paths?.[1] ?? 0);
  }
  const patterns = [
    /Tổng:\s*(\d+)\s*điểm/i, // check-icon-names
    /FAIL\s*[—-]\s*(\d+)\s*vấn đề/i, // a8, lint-rls-migration, unitprice
    /FAIL\s*[—-]\s*(\d+)\s*vi phạm/i, // lint-rls-sources
    /(\d+)\s*bang dang ho RLS/i, // inspect-db
    /(\d+)\s*tuyen bo bia/i, // check-fabricated (text mode)
    /(\d+)\s*to hop class VI PHAM/i, // check-contrast-combos (text mode)
    /(\d+)\s*unexpected fail/i, // check-contrast (text mode)
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  if (id === 'lint') {
    const m = text.match(/error TS\d+/g);
    if (m) return m.length;
  }
  if (rc === 0) return 0;
  return null;
}

const results = [];
for (const g of selected) {
  if (g.optional && gateFileMissing(g)) {
    results.push({ id: g.id, cmd: g.cmd, rc: null, violations: null, skipped: true, advisory: !!g.advisory });
    continue;
  }
  const started = Date.now();
  const proc = spawnSync(g.cmd, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
    env: process.env,
  });
  const rc = proc.status === null ? 127 : proc.status;
  const stdout = proc.stdout ?? '';
  const stderr = proc.stderr ?? '';
  results.push({
    id: g.id,
    cmd: g.cmd,
    rc,
    violations: extractViolations(g.id, stdout, stderr, rc),
    skipped: false,
    advisory: !!g.advisory,
    live: !!g.live,
    ms: Date.now() - started,
  });
}

/* ------------------------------------------------------------------ baseline */
function loadBaseline() {
  if (NO_BASELINE) return null;
  const path = HAS_BASELINE_FLAG
    ? (argv[BASELINE_FLAG_AT + 1] && !argv[BASELINE_FLAG_AT + 1].startsWith('-')
        ? resolve(ROOT, argv[BASELINE_FLAG_AT + 1])
        : DEFAULT_BASELINE)
    : DEFAULT_BASELINE;
  if (!existsSync(path)) {
    if (HAS_BASELINE_FLAG) die(`baseline không tồn tại: ${path}`);
    return null;
  }
  try {
    return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (err) {
    die(`baseline JSON không hợp lệ — ${err.message}`);
  }
}
const baseline = loadBaseline();
const baselineGates = baseline?.data?.gates ?? {};

function baselineFor(id) {
  return baselineGates[id] ?? baselineGates[`check-${id}`] ?? baselineGates[id.replace(/^check-/, '')] ?? null;
}

const regressions = [];
for (const r of results) {
  if (r.skipped || r.advisory) continue;
  const b = baselineFor(r.id);
  if (!baseline) {
    if (r.rc !== 0) regressions.push({ ...r, reason: `RC=${r.rc} (không có baseline)` });
    continue;
  }
  if (!b) {
    if (r.rc !== 0) regressions.push({ ...r, reason: `RC=${r.rc} (gate mới, chưa có trong baseline)` });
    continue;
  }
  if (r.rc > b.rc) {
    regressions.push({ ...r, reason: `RC ${b.rc} → ${r.rc}` });
  } else if (
    r.rc === b.rc &&
    typeof r.violations === 'number' &&
    typeof b.violations === 'number' &&
    r.violations > b.violations
  ) {
    regressions.push({ ...r, reason: `vi phạm ${b.violations} → ${r.violations}` });
  }
}

const unreg = unregistered();
const unregisteredFailure = unreg.length > 0 && !ALLOW_UNREGISTERED;
const ok = regressions.length === 0 && !unregisteredFailure;

/* ------------------------------------------------------------------ báo cáo */
if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        baseline: baseline ? baseline.path : null,
        results,
        regressions: regressions.map((r) => ({ id: r.id, reason: r.reason, rc: r.rc, violations: r.violations })),
        unregistered: unreg,
        allowUnregistered: ALLOW_UNREGISTERED,
        ok,
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}

console.log(`run-checks: ${results.length} gate${baseline ? ` · baseline ${baseline.path.replace(ROOT + '/', '')}` : ' · (không so baseline)'}`);
console.log('-'.repeat(72));
for (const r of results) {
  const tag = r.skipped ? 'SKIP' : r.rc === 0 ? ' OK ' : 'FAIL';
  const v = r.violations === null ? '—' : String(r.violations);
  const advis = r.advisory ? ' [advisory]' : '';
  const sk = r.skipped ? ' (file chưa tồn tại)' : '';
  console.log(`  [${tag}] ${r.id.padEnd(28)} rc=${r.skipped ? '—' : r.rc}  vi pham=${v}${advis}${sk}`);
}
console.log('-'.repeat(72));

if (baseline) {
  const compared = results.filter((r) => !r.skipped && !r.advisory && baselineFor(r.id)).length;
  if (regressions.length) {
    console.log(`KẾT QUẢ: TỆ HƠN BASELINE — ${regressions.length} gate hồi quy:`);
    for (const r of regressions) console.log(`  - ${r.id}: ${r.reason}`);
  } else {
    console.log(`KẾT QUẢ: KHÔNG TỆ HƠN BASELINE (${compared} gate so được; gate live/advisory không ép RC=0).`);
  }
} else if (regressions.length) {
  console.log(`KẾT QUẢ: ${regressions.length} gate thất bại (không có baseline):`);
  for (const r of regressions) console.log(`  - ${r.id}: ${r.reason}`);
} else {
  console.log('KẾT QUẢ: mọi gate thường đều xanh (không có baseline).');
}

if (unreg.length) {
  const label = ALLOW_UNREGISTERED ? 'CẢNH BÁO' : 'LỖI';
  const log = ALLOW_UNREGISTERED ? console.warn : console.error;
  log('');
  log(`${label}: ${unreg.length} script check-*/lint-* chưa đăng ký trong gate-manifest.json:`);
  for (const p of unreg) log(`  - ${p}  (thêm vào manifest hoặc chạy --list-unregistered)`);
  if (!ALLOW_UNREGISTERED) {
    log('      Gate chưa đăng ký bị coi là THẤT BẠI để chống false-PASS; dùng --allow-unregistered để hạ xuống cảnh báo.');
  }
}

process.exit(ok ? 0 : 1);
