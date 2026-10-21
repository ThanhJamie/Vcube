#!/usr/bin/env node
/**
 * check-doc-freshness.mjs — T28: checker độ tươi của marker `doc-meta` (ADVISORY, luôn exit 0).
 *
 * Quét `docs/**\/*.md` (bỏ `docs/archive/` và `docs/plans/`), đọc marker ở DÒNG ĐẦU:
 *   <!-- doc-meta: status=active|snapshot|historical; verified=YYYY-MM-DD; owner=<tên> -->
 *
 * Cảnh báo:
 *   (a) thiếu marker trên dòng đầu;
 *   (b) `status=active` mà `verified` cũ hơn N ngày (mặc định 60);
 *   (c) marker sai/thiếu field, status lạ, ngày sai định dạng, ngày không hợp lệ.
 *
 * Dùng:
 *   node scripts/check-doc-freshness.mjs             # advisory, exit 0
 *   node scripts/check-doc-freshness.mjs --json
 *   node scripts/check-doc-freshness.mjs --days 30
 *   node scripts/check-doc-freshness.mjs --today 2026-12-01   # đo tất định, không bắt buộc
 *
 * RC: 0 luôn luôn (advisory). Script chỉ đọc, KHÔNG sửa tài liệu.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

const DEFAULT_DAYS = 60;
const VALID_STATUS = new Set(['active', 'snapshot', 'historical']);
const DOC_DIR = join(ROOT, 'docs');
const SKIP_DIRS = new Set(['archive', 'plans', 'node_modules', '.git']);

const MARKER_RE = /^<!--\s*doc-meta:\s*(.*?)\s*-->$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseArgs(args) {
  const opts = { json: false, days: DEFAULT_DAYS, today: null, help: false, unknown: [] };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    const next = args[i + 1];
    if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--days' || a.startsWith('--days=')) {
      const raw = a.startsWith('--days=') ? a.slice('--days='.length) : next;
      if (!a.startsWith('--days=')) i += 1;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        console.error(`check-doc-freshness: --days cần số nguyên >= 0 (nhận "${raw}"), dùng mặc định ${DEFAULT_DAYS}.`);
      } else {
        opts.days = n;
      }
    } else if (a === '--today' || a.startsWith('--today=')) {
      const raw = a.startsWith('--today=') ? a.slice('--today='.length) : next;
      if (!a.startsWith('--today=')) i += 1;
      const d = parseDate(raw);
      if (!d) console.error(`check-doc-freshness: --today cần YYYY-MM-DD hợp lệ (nhận "${raw}"), dùng hôm nay.`);
      else opts.today = d;
    } else {
      opts.unknown.push(a);
    }
  }
  return opts;
}

/** Trả {y,m,d,ms} theo UTC nếu YYYY-MM-DD hợp lệ, ngược lại null. */
function parseDate(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(DATE_RE);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return { y, m: mo, d, ms };
}

const todayUtc = (() => {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
})();

const opts = parseArgs(argv);
const REF_MS = opts.today ? opts.today.ms : todayUtc;
const refLabel = new Date(REF_MS).toISOString().slice(0, 10);

function walkMarkdown(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkMarkdown(full, out);
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

const rel = (p) => relative(ROOT, p).split(sep).join('/');

function firstLine(text) {
  return (text.split('\n', 1)[0] || '').replace(/\r$/, '');
}

/**
 * Phân tích marker. Trả:
 *   { kind: 'none' } | { kind: 'malformed', reasons: string[] } | { kind: 'valid', status, verified, owner, ageDays }
 */
function parseMarker(line) {
  if (!line.includes('doc-meta')) return { kind: 'none' };

  const m = line.trim().match(MARKER_RE);
  if (!m) {
    return {
      kind: 'malformed',
      reasons: [line.trim().startsWith('<!--') ? 'comment doc-meta chưa đóng bằng "-->"' : 'marker không nằm ở đầu dòng (phải là comment HTML ở dòng đầu)'],
    };
  }

  const fields = {};
  const duplicates = [];
  for (const part of m[1].split(';')) {
    if (!part.trim()) continue;
    const kv = part.match(/^\s*([A-Za-z_][\w-]*)\s*=\s*(.*?)\s*$/);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    if (fields[key] !== undefined) duplicates.push(key);
    fields[key] = kv[2];
  }

  const reasons = [];
  if (duplicates.length) reasons.push(`field lặp: ${[...new Set(duplicates)].join(', ')}`);

  const status = (fields.status || '').toLowerCase();
  if (!status) reasons.push('thiếu field "status"');
  else if (!VALID_STATUS.has(status)) reasons.push(`status không hợp lệ: "${fields.status}" (chỉ active|snapshot|historical)`);

  const verifiedRaw = fields.verified || '';
  let verified = null;
  if (!verifiedRaw) reasons.push('thiếu field "verified"');
  else {
    verified = parseDate(verifiedRaw);
    if (!verified) reasons.push(`verified sai định dạng/không hợp lệ: "${verifiedRaw}" (cần YYYY-MM-DD)`);
  }

  const owner = (fields.owner || '').trim();
  if (!owner) reasons.push('thiếu field "owner"');

  if (verified && verified.ms > REF_MS) reasons.push(`verified ở tương lai: ${verifiedRaw}`);

  if (reasons.length) return { kind: 'malformed', reasons };

  const ageDays = Math.floor((REF_MS - verified.ms) / DAY_MS);
  return { kind: 'valid', status, verified: verifiedRaw, owner, ageDays };
}

// ---------------------------------------------------------------------------

const result = {
  days: opts.days,
  today: refLabel,
  scanned: 0,
  counts: { missing: 0, malformed: 0, stale: 0, valid: 0, ok: 0 },
  byStatus: { active: 0, snapshot: 0, historical: 0 },
  missing: [],
  malformed: [],
  stale: [],
};

try {
  const docs = walkMarkdown(DOC_DIR).sort();
  result.scanned = docs.length;

  for (const docPath of docs) {
    const name = rel(docPath);
    const line = firstLine(readFileSync(docPath, 'utf8'));
    const marker = parseMarker(line);

    if (marker.kind === 'none') {
      result.counts.missing += 1;
      result.missing.push(name);
      continue;
    }
    if (marker.kind === 'malformed') {
      result.counts.malformed += 1;
      result.malformed.push({ doc: name, raw: line.trim(), reasons: marker.reasons });
      continue;
    }

    result.counts.valid += 1;
    result.byStatus[marker.status] += 1;
    if (marker.status === 'active' && marker.ageDays > opts.days) {
      result.counts.stale += 1;
      result.stale.push({ doc: name, verified: marker.verified, ageDays: marker.ageDays, owner: marker.owner });
    } else {
      result.counts.ok += 1;
    }
  }
} catch (e) {
  console.error(`check-doc-freshness: lỗi khi quét docs (advisory, vẫn exit 0): ${e.message}`);
}

// ---------------------------------------------------------------------------

if (opts.unknown.length) {
  console.error(`check-doc-freshness: bỏ qua cờ lạ: ${opts.unknown.join(', ')}`);
}

if (opts.help) {
  console.log('Dùng: node scripts/check-doc-freshness.mjs [--json] [--days N] [--today YYYY-MM-DD]');
  process.exit(0);
}

if (opts.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`check-doc-freshness: quét ${result.scanned} doc trong docs/ (mốc ${refLabel}, hạn ${opts.days} ngày)`);
  console.log(`  - thiếu marker doc-meta: ${result.counts.missing}`);
  for (const doc of result.missing) console.log(`      ${doc}`);
  console.log(`  - status=active quá ${opts.days} ngày: ${result.counts.stale}`);
  for (const s of result.stale) console.log(`      ${s.doc} (verified ${s.verified}, ${s.ageDays} ngày, owner ${s.owner})`);
  console.log(`  - marker sai định dạng: ${result.counts.malformed}`);
  for (const b of result.malformed) console.log(`      ${b.doc}: ${b.reasons.join('; ')}`);
  console.log(
    `  - marker hợp lệ: ${result.counts.valid} (active ${result.byStatus.active}, snapshot ${result.byStatus.snapshot}, historical ${result.byStatus.historical})`,
  );
  console.log('\n  KẾT QUẢ: advisory — không chặn gate (exit 0).');
}

process.exit(0);
