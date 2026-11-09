#!/usr/bin/env node
/**
 * po-audit.mjs — chấm điểm PO “world-class” cho VCUBE.
 *
 * Không sửa gì; chỉ đo và ghi `.loop/po.json` + nối `.loop/po-history.jsonl`.
 * Nguồn sự thật: docs/po/ACCEPTANCE.md + docs/po/acceptance.json.
 *
 * Dùng:
 *   node scripts/po-audit.mjs            # chấm đầy đủ (đọc .loop/latest.json cho gate)
 *   node scripts/po-audit.mjs --json     # in JSON
 *   PO_BASE_URL=http://localhost:3000 node scripts/po-audit.mjs
 *
 * RC: 0 = đạt ngưỡng (score ≥85, 0 P0 fail) · 1 = chưa đạt · 2 = lỗi công cụ.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const BS = join(ROOT, '.loop');
const BASE = process.env.PO_BASE_URL || 'http://localhost:3000';
const AS_JSON = process.argv.includes('--json');

const GROUPS = {
  reliability: 20,
  performance: 15,
  dataHonesty: 15,
  journeys: 20,
  seo: 10,
  accessibility: 10,
  ops: 5,
  docs: 5,
};

const checks = [];
const add = (group, id, pass, detail, { p0 = false } = {}) =>
  checks.push({ group, id, pass: Boolean(pass), detail, p0 });

function readEnv() {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnv();

/* ---------------------------------------------------------------- reliability */
let latest = null;
try {
  latest = JSON.parse(readFileSync(join(BS, 'latest.json'), 'utf8'));
} catch {
  latest = null;
}
add('reliability', 'gates-green', latest ? latest.gatesFailed === 0 : false,
  latest ? `${latest.gatesPass} gate pass, ${latest.gatesFailed} fail` : 'chưa có .loop/latest.json (chạy loop-audit)', { p0: true });
add('reliability', 'lint-pass', latest ? latest.lintPass === true : false,
  latest ? `lint ${latest.lintPass ? 'PASS' : 'FAIL'} (${latest.lintErrors || 0} lỗi)` : 'thiếu dữ liệu', { p0: true });

async function routeSmoke() {
  const paths = ['/', '/explore', '/personalize', '/quote', '/cart', '/checkout', '/auth/login', '/auth/register', '/tracking', '/khong-ton-tai'];
  const bad = [];
  for (const p of paths) {
    try {
      const res = await fetch(BASE + p, { signal: AbortSignal.timeout(4000) });
      if (res.status !== 200) bad.push(`${p}:${res.status}`);
    } catch {
      add('reliability', 'routes-http', true, `bỏ qua (dev server không chạy tại ${BASE})`);
      return;
    }
  }
  add('reliability', 'routes-http', bad.length === 0, bad.length ? `lỗi: ${bad.join(', ')}` : `${paths.length}/${paths.length} route HTTP 200`, { p0: true });
}
await routeSmoke();

/* ---------------------------------------------------------------- performance */
function gzipKB(file) {
  try {
    return Math.round(gzipSync(readFileSync(file)).length / 1024);
  } catch {
    return null;
  }
}
let indexGz = null;
let cssGz = null;
try {
  const assets = join(ROOT, 'dist', 'assets');
  if (existsSync(assets)) {
    const files = readdirSync(assets);
    const idx = files.find((f) => /^index-.*\.js$/.test(f));
    const css = files.find((f) => /\.css$/.test(f));
    if (idx) indexGz = gzipKB(join(assets, idx));
    if (css) cssGz = gzipKB(join(assets, css));
  }
} catch { /* ignore */ }
add('performance', 'js-budget', indexGz !== null && indexGz <= 250, indexGz === null ? 'chưa build' : `index ${indexGz}KB gzip (ngân sách 250KB)`);
add('performance', 'css-budget', cssGz !== null && cssGz <= 40, cssGz === null ? 'chưa build' : `css ${cssGz}KB gzip (ngân sách 40KB)`);

let fontKB = 0;
const fontDir = join(ROOT, 'public', 'fonts');
if (existsSync(fontDir)) {
  for (const f of readdirSync(fontDir)) fontKB += statSync(join(fontDir, f)).size / 1024;
}
add('performance', 'font-budget', fontKB > 0 && fontKB < 300, `${Math.round(fontKB)}KB font self-hosted (ngân sách 300KB)`);

let externalFont = false;
for (const p of ['index.html', join('src', 'index.css')]) {
  const fp = join(ROOT, p);
  if (existsSync(fp) && /fonts\.googleapis|fonts\.gstatic/.test(readFileSync(fp, 'utf8'))) externalFont = true;
}
add('performance', 'no-external-font', !externalFont, externalFont ? 'còn tham chiếu Google Fonts' : '0 request font bên thứ ba');

/* ---------------------------------------------------------------- data honesty */
let demoTotal = 0;
let fakeTotal = 0;
try {
  const out = execFileSync('node', [join(ROOT, 'scripts', 'audit-demo-data.mjs'), '--json'], { encoding: 'utf8' });
  const j = JSON.parse(out);
  demoTotal = j.totals?.demo ?? 0;
  fakeTotal = j.totals?.fakeImages ?? 0;
} catch {
  demoTotal = -1;
}
add('dataHonesty', 'no-demo-markers', demoTotal === 0, demoTotal < 0 ? 'không đọc được DB' : `${demoTotal} dòng chứa "[MẪU]"`, { p0: true });
add('dataHonesty', 'no-fabricated-images', fakeTotal === 0, fakeTotal < 0 ? 'không đọc được DB' : `${fakeTotal} dòng ảnh Unsplash/picsum`, { p0: true });

/* ---------------------------------------------------------------- journeys */
let acceptance = { features: {} };
try {
  acceptance = JSON.parse(readFileSync(join(ROOT, 'docs', 'po', 'acceptance.json'), 'utf8'));
} catch { /* ignore */ }
const feats = Object.entries(acceptance.features || {});
if (feats.length === 0) {
  add('journeys', 'core-flows', false, 'thiếu docs/po/acceptance.json');
} else {
  for (const [key, f] of feats) {
    add('journeys', `feature:${key}`, f.done === true, f.label || key);
  }
}

/* ---------------------------------------------------------------- seo */
for (const [id, file] of [['robots', 'robots.txt'], ['sitemap', 'sitemap.xml'], ['manifest', 'manifest.webmanifest']]) {
  add('seo', id, existsSync(join(ROOT, 'public', file)), existsSync(join(ROOT, 'public', file)) ? `public/${file}` : `thiếu public/${file}`);
}
let html = '';
try { html = readFileSync(join(ROOT, 'index.html'), 'utf8'); } catch { /* ignore */ }
add('seo', 'manifest-link', /rel="manifest"/.test(html), /rel="manifest"/.test(html) ? 'index.html có <link rel="manifest">' : 'index.html thiếu manifest');
add('seo', 'og-tags', /og:title/.test(html) && /og:description/.test(html), 'OG mặc định trong index.html');

let seoViews = 0;
try {
  for (const f of readdirSync(join(ROOT, 'src', 'frontend', 'views'))) {
    if (f.endsWith('.tsx') && readFileSync(join(ROOT, 'src', 'frontend', 'views', f), 'utf8').includes('SEOHead')) seoViews++;
  }
} catch { /* ignore */ }
add('seo', 'seohead-coverage', seoViews >= 5, `${seoViews} view dùng SEOHead (mục tiêu ≥5: Home/Explore/PDP/Personalize/Quote)`);

/* ---------------------------------------------------------------- accessibility */
const gateIds = ['check-contrast', 'check-contrast-combos', 'check-ui-rules', 'check-icon-names'];
const gateOk = gateIds.every((g) => latest?.gates?.[g] === true);
add('accessibility', 'a11y-gates', gateOk, gateOk ? 'contrast + ui-rules + icon-label PASS' : 'có gate a11y chưa xanh');

/* ---------------------------------------------------------------- ops/security */
let envIgnored = false;
try {
  execFileSync('git', ['check-ignore', '-q', '.env'], { cwd: ROOT });
  envIgnored = true;
} catch { envIgnored = false; }
add('ops', 'env-ignored', envIgnored, envIgnored ? '.env nằm trong .gitignore' : '.env KHÔNG bị ignore');

let secretInDist = false;
const secret = env.SUPABASE_SECRET_KEY;
if (secret && existsSync(join(ROOT, 'dist'))) {
  try {
    for (const f of readdirSync(join(ROOT, 'dist', 'assets'))) {
      if (f.endsWith('.js') && readFileSync(join(ROOT, 'dist', 'assets', f), 'utf8').includes(secret)) secretInDist = true;
    }
  } catch { /* ignore */ }
}
add('ops', 'no-secret-in-bundle', !secretInDist, secretInDist ? 'SECRET xuất hiện trong dist!' : 'secret không có trong bundle', { p0: true });

/* ---------------------------------------------------------------- docs */
let deadRefs = -1;
try {
  const out = execFileSync('node', [join(ROOT, 'scripts', 'check-doc-refs.mjs'), '--json'], { encoding: 'utf8' });
  const j = JSON.parse(out);
  deadRefs = (j.deadLinks?.length || 0) + (j.deadPaths?.length || 0);
} catch { /* ignore */ }
add('docs', 'doc-refs', deadRefs === 0, deadRefs < 0 ? 'không chạy được checker' : `${deadRefs} tham chiếu chết`);

/* ---------------------------------------------------------------- score */
const byGroup = {};
for (const [g, weight] of Object.entries(GROUPS)) {
  const items = checks.filter((c) => c.group === g);
  const passed = items.filter((c) => c.pass).length;
  byGroup[g] = {
    weight,
    passed,
    total: items.length,
    score: items.length ? Math.round((passed / items.length) * weight * 10) / 10 : 0,
  };
}
const score = Math.round(Object.values(byGroup).reduce((s, g) => s + g.score, 0) * 10) / 10;
const p0fail = checks.filter((c) => c.p0 && !c.pass);
const satisfied = score >= 85 && p0fail.length === 0;
const backlog = checks
  .filter((c) => !c.pass)
  .sort((a, b) => Number(b.p0) - Number(a.p0) || GROUPS[b.group] - GROUPS[a.group]);

const result = { timestamp: new Date().toISOString(), score, satisfied, p0fail: p0fail.length, groups: byGroup, checks, backlog };
mkdirSync(BS, { recursive: true });
writeFileSync(join(BS, 'po.json'), JSON.stringify(result, null, 2));
appendFileSync(join(BS, 'po-history.jsonl'), JSON.stringify({ timestamp: result.timestamp, score, satisfied, p0fail: p0fail.length }) + '\n');

if (AS_JSON) {
  console.log(JSON.stringify(result));
} else {
  console.log(`\n=== PO AUDIT · score ${score}/100 · ${satisfied ? 'SATISFIED' : 'CHƯA ĐẠT'} (P0 fail: ${p0fail.length}) ===\n`);
  for (const [g, v] of Object.entries(byGroup)) {
    const bar = '█'.repeat(Math.round((v.score / v.weight) * 10)).padEnd(10, '░');
    console.log(`${g.padEnd(14)} ${bar} ${v.score}/${v.weight}`);
  }
  if (backlog.length) {
    console.log('\nBacklog (ưu tiên cao trước):');
    for (const c of backlog) console.log(`  [${c.p0 ? 'P0' : 'P1'}] ${c.group}/${c.id} — ${c.detail}`);
  }
  console.log(`\n→ chi tiết: .loop/po.json\n`);
}
process.exit(satisfied ? 0 : 1);
