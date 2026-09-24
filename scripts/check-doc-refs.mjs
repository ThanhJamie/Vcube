#!/usr/bin/env node
/**
 * check-doc-refs.mjs — T30: checker tham chiếu tài liệu (ADVISORY, mặc định không đỏ).
 *
 * Ba kiểm tra:
 *   (a) link markdown chết        — `[text](path)` trỏ tới file không tồn tại.
 *   (b) path trong backtick chết  — token dạng `src/…`, `scripts/…`, `docs/…` không tồn tại.
 *   (c) --coverage                — ID trong `docs/tasks/DOCS-ISSUES.md` đối chiếu
 *                                   `docs/tasks/coverage.json`; ID không có chủ ⇒ báo.
 *
 * Bỏ qua doc có DÒNG ĐẦU là marker `<!-- doc-meta: … status=snapshot|historical … -->`,
 * trừ khi `--strict`.
 *
 * Dùng:
 *   node scripts/check-doc-refs.mjs            # = --warn, exit 0
 *   node scripts/check-doc-refs.mjs --warn     # exit 0
 *   node scripts/check-doc-refs.mjs --strict   # không bỏ qua snapshot/historical; exit 1 nếu có cảnh báo
 *   node scripts/check-doc-refs.mjs --coverage # chỉ chạy coverage, exit 0
 *   node scripts/check-doc-refs.mjs --coverage --warn   # cả coverage lẫn quét link/path
 *   node scripts/check-doc-refs.mjs --json
 *
 * RC: 0 = advisory (mặc định) · 1 = có cảnh báo ở `--strict` · 2 = lỗi công cụ.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const COVERAGE = argv.includes('--coverage');
const AS_JSON = argv.includes('--json');
const DO_SCAN = !COVERAGE || argv.includes('--warn') || STRICT;

const DOC_ISSUES = join(ROOT, 'docs/tasks/DOCS-ISSUES.md');
const COVERAGE_JSON = join(ROOT, 'docs/tasks/coverage.json');

// Bề mặt tài liệu: docs/**/*.md + README.md/AGENTS.md ở gốc repo.
const DOC_DIRS = ['docs'];
const DOC_FILES = ['README.md', 'AGENTS.md'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.loop', '.opencode', '.agents']);

const DEAD_LINK = [];
const DEAD_PATH = [];
const SKIPPED = [];

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

function collectDocs() {
  const docs = [];
  for (const d of DOC_DIRS) docs.push(...walkMarkdown(join(ROOT, d)));
  for (const f of DOC_FILES) {
    const full = join(ROOT, f);
    if (existsSync(full)) docs.push(full);
  }
  return docs;
}

const rel = (p) => relative(ROOT, p).split(sep).join('/');

/** Dòng đầu có marker doc-meta với status snapshot/historical? */
function isSkippedDoc(text) {
  const first = text.split('\n', 1)[0] || '';
  const m = first.match(/<!--\s*doc-meta:([^>]*?)-->/);
  if (!m) return null;
  const s = m[1].match(/\bstatus\s*=\s*([A-Za-z_-]+)/);
  if (!s) return null;
  const status = s[1].toLowerCase();
  return status === 'snapshot' || status === 'historical' ? status : null;
}

/** Thay fenced code block bằng khoảng trắng (giữ newline ⇒ số dòng không đổi). */
function stripFenced(text) {
  const lines = text.split('\n');
  let inFence = false;
  let marker = '';
  const out = lines.map((line) => {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (!inFence && m) {
      inFence = true;
      marker = m[1][0];
      return ' '.repeat(line.length);
    }
    if (inFence) {
      if (m && m[1][0] === marker) {
        inFence = false;
        marker = '';
      }
      return ' '.repeat(line.length);
    }
    return line;
  });
  return out.join('\n');
}

/** Thay HTML comment bằng khoảng trắng (giữ newline). */
function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const LINK_RE = /!?\[([^\]]*)\]\(([^)]*)\)/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const PATH_TOKEN_RE = /(?:src|scripts|docs)\/[A-Za-z0-9._\-/]+/g;

function cleanLinkTarget(raw) {
  let target = raw.trim();
  if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1).trim();
  // bỏ title: `path "title"` / `path 'title'`
  target = target.split(/\s+/)[0] || '';
  target = target.split('#')[0];
  try {
    target = decodeURIComponent(target);
  } catch {
    /* giữ nguyên nếu decode lỗi */
  }
  return target;
}

function linkExists(docPath, target) {
  if (!target) return true;
  if (target.includes('{') || target.includes('}') || target.includes('<') || target.includes('>')) return true;
  const base = dirname(docPath);
  const candidates = [];
  if (target.startsWith('/')) {
    // đường dẫn kiểu route của SPA (`/orders`) — chỉ kiểm tra như path gốc repo, không báo nếu không có.
    candidates.push(resolve(ROOT, `.${target}`));
    return candidates.some((c) => existsSync(c)) || true;
  }
  candidates.push(resolve(base, target));
  candidates.push(resolve(ROOT, target));
  return candidates.some((c) => existsSync(c));
}

function checkLinks(docPath, text) {
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    const raw = m[2];
    const target = cleanLinkTarget(raw);
    if (!target) continue;
    if (target.startsWith('#')) continue;
    if (EXTERNAL_RE.test(target)) continue;
    if (linkExists(docPath, target)) continue;
    DEAD_LINK.push({ doc: rel(docPath), line: lineOf(text, m.index), target });
  }
}

function checkBacktickPaths(docPath, text) {
  let code;
  INLINE_CODE_RE.lastIndex = 0;
  while ((code = INLINE_CODE_RE.exec(text)) !== null) {
    const content = code[1];
    let tok;
    PATH_TOKEN_RE.lastIndex = 0;
    while ((tok = PATH_TOKEN_RE.exec(content)) !== null) {
      let token = tok[0].replace(/[.]+$/, '');
      if (!token || token === 'src/' || token === 'scripts/' || token === 'docs/') continue;
      if (token.includes('...') || token.includes('…')) continue;
      if (!existsSync(join(ROOT, token))) {
        DEAD_PATH.push({ doc: rel(docPath), line: lineOf(text, code.index), target: token });
      }
    }
  }
}

function runScan() {
  const docs = collectDocs();
  for (const docPath of docs) {
    const original = readFileSync(docPath, 'utf8');
    const status = isSkippedDoc(original);
    if (status && !STRICT) {
      SKIPPED.push({ doc: rel(docPath), status });
      continue;
    }
    const text = stripHtmlComments(stripFenced(original));
    checkLinks(docPath, text);
    checkBacktickPaths(docPath, text);
  }
  return docs.length;
}

function runCoverage() {
  if (!existsSync(DOC_ISSUES)) {
    console.error(`check-doc-refs: thiếu ${rel(DOC_ISSUES)}`);
    return null;
  }
  if (!existsSync(COVERAGE_JSON)) {
    console.error(`check-doc-refs: thiếu ${rel(COVERAGE_JSON)}`);
    return null;
  }
  let coverage;
  try {
    coverage = JSON.parse(readFileSync(COVERAGE_JSON, 'utf8'));
  } catch (e) {
    console.error(`check-doc-refs: coverage.json không parse được: ${e.message}`);
    return null;
  }

  const TABLE_RE = /^\| (SEC|DB|PAGE|ARCH|IDX|LNK|DS)-[0-9]+ \|/;
  const BULLET_RE = /^- \*\*NEW-[0-9]+/;
  const ids = [];
  const seen = new Set();
  for (const line of readFileSync(DOC_ISSUES, 'utf8').split('\n')) {
    let id = null;
    if (TABLE_RE.test(line)) {
      const m = line.match(/((?:SEC|DB|PAGE|ARCH|IDX|LNK|DS)-[0-9]+)/);
      id = m && m[1];
    } else if (BULLET_RE.test(line)) {
      const m = line.match(/(NEW-[0-9]+)/);
      id = m && m[1];
    }
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  const isClosed = (v) => typeof v === 'string' && /^CLOSED/.test(v.trim());
  const needingOwner = ids.filter((id) => !isClosed(coverage[id]));
  const unowned = needingOwner.filter((id) => {
    const v = coverage[id];
    return !v || !String(v).trim();
  });
  const orphans = Object.keys(coverage).filter((id) => !seen.has(id));
  const closed = ids.filter((id) => isClosed(coverage[id]));

  return { ids, needingOwner, unowned, orphans, closed };
}

// ---------------------------------------------------------------------------

const result = { scan: null, coverage: null };

if (DO_SCAN) {
  const total = runScan();
  result.scan = { docs: total, skipped: SKIPPED, deadLinks: DEAD_LINK, deadPaths: DEAD_PATH };
}

if (COVERAGE) {
  const cov = runCoverage();
  if (!cov) process.exit(2);
  result.coverage = cov;
}

if (AS_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  if (result.scan) {
    console.log(
      `check-doc-refs: quét ${result.scan.docs} doc (bỏ qua ${SKIPPED.length} snapshot/historical)`,
    );
    console.log(`  (a) link markdown chết: ${DEAD_LINK.length}`);
    for (const d of DEAD_LINK.slice(0, 50)) console.log(`      ${d.doc}:${d.line} -> ${d.target}`);
    if (DEAD_LINK.length > 50) console.log(`      … còn ${DEAD_LINK.length - 50} link nữa`);
    console.log(`  (b) path backtick không tồn tại: ${DEAD_PATH.length}`);
    for (const d of DEAD_PATH.slice(0, 50)) console.log(`      ${d.doc}:${d.line} -> ${d.target}`);
    if (DEAD_PATH.length > 50) console.log(`      … còn ${DEAD_PATH.length - 50} path nữa`);
  }
  if (result.coverage) {
    const c = result.coverage;
    console.log(
      `check-doc-refs --coverage: ${c.ids.length} ID đọc từ DOCS-ISSUES.md, ` +
        `${c.needingOwner.length} ID cần chủ, ${c.unowned.length} chưa có chủ`,
    );
    if (c.closed.length) console.log(`  CLOSED (bỏ qua): ${c.closed.join(', ')}`);
    for (const id of c.unowned) console.log(`      chưa có chủ: ${id}`);
    if (c.orphans.length) console.log(`  có trong coverage.json nhưng không có trong DOCS-ISSUES.md: ${c.orphans.join(', ')}`);
  }
  if (STRICT && (DEAD_LINK.length || DEAD_PATH.length || (result.coverage && result.coverage.unowned.length))) {
    console.log('\n  KẾT QUẢ (--strict): có cảnh báo.');
  } else if (result.scan) {
    console.log('\n  KẾT QUẢ: advisory — không chặn gate (dùng --strict để lấy RC=1).');
  }
}

if (STRICT) {
  const hasWarn =
    DEAD_LINK.length > 0 ||
    DEAD_PATH.length > 0 ||
    (result.coverage && result.coverage.unowned.length > 0);
  process.exit(hasWarn ? 1 : 0);
}
process.exit(0);
