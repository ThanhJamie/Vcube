#!/usr/bin/env node
/**
 * check-error-handling.mjs — T5.1 gate: chặn hồi quy NUỐT LỖI trên `src/**`.
 *
 * Ba luật (giữ bất biến "không nuốt lỗi / không báo thành công giả"):
 *   R1 empty-catch            (CỨNG, limit 0): catch body rỗng/whitespace hoặc CHỈ có comment
 *                             mà comment không có `ignore:`. Ngoại lệ: comment chứa "ignore:"
 *                             (vd "ignore: localStorage quota") được coi là ĐÃ CHÚ THÍCH.
 *   R2 false-success-in-catch (CỨNG, limit 0): trong catch body có `return { success: true … }`
 *                             hoặc `return true` — báo thành công trong khi thực tế đã lỗi.
 *   R3 warn-in-catch          (BUDGET):    `console.warn(` / `console.error(` nằm trong catch body.
 *                             Đếm MỌI lần xuất hiện (mỗi occurrence 1 lần, kể cả catch lồng nhau),
 *                             in số nguyên CHÍNH XÁC, ghim vào `WARN_IN_CATCH_BUDGET`. Chỉ được GIẢM.
 *
 * Cách kiểm (deterministic):
 *   - Quét `catch` rồi khớp `{}` cân bằng, TÔN TRỌNG chuỗi/template/regex/comment
 *     (kỹ thuật giống `check-ui-rules.mjs`, mở rộng thêm regex + template literal).
 *   - Vùng catch là "cửa sổ" theo cặp ngoặc nhọn thật, KHÔNG phải cửa sổ N dòng.
 *   - R2/R3 dùng bản "masked" (comment + chuỗi + regex → khoảng trắng) nên không đếm nhầm
 *     tên hàm trong comment/chuỗi.
 *
 * ALLOWLIST dưới đây là NỢ KỸ THUẬT ĐÃ BIẾT. Mỗi entry ghi `budget` = số điểm còn lại hôm nay;
 * vượt budget = vi phạm MỚI ⇒ FAIL. Với R1/R2 (limit 0) chỉ thêm entry khi có lý do CHÍNH ĐÁNG
 * và ghi rõ `why`; ưu tiên SỬA hơn allowlist. R3 dùng hằng số budget toàn cục (xem dưới).
 *
 * Đo baseline: ERROR_HANDLING_BASELINE=1 node scripts/check-error-handling.mjs
 * Dùng:        node scripts/check-error-handling.mjs [--json]
 * RC=0 PASS · RC=1 FAIL · RC=2 lỗi công cụ.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const AS_JSON = process.argv.includes('--json');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '__snapshots__']);

/**
 * R3 — trần số `console.warn/error` trong catch được phép còn lại (nợ kỹ thuật).
 * 2026-09-22: baseline đo bằng CHÍNH scanner này (cửa sổ `{}` cân bằng) = 54.
 * Sau T5.2 (hợp nhất `WriteResult` ở database/settings/workshop/customDesign) còn 53.
 * Chỉ được GIẢM; mỗi khi dọn bớt thì hạ số này xuống đúng số mới.
 */
const WARN_IN_CATCH_BUDGET = 53;

/**
 * ALLOWLIST nợ cũ theo `file::rule` (giống `check-ui-rules.mjs`). Rỗng mặc định vì R1 (empty-catch)
 * đã được chú thích `ignore:` tại chỗ và R2 hiện 0. Chỉ thêm entry khi buộc phải tha nợ,
 * luôn kèm `budget` + `why`, và hạ về 0 khi dọn xong.
 */
const ALLOWLIST = [
  // { file: 'src/…', rule: 'empty-catch' | 'false-success-in-catch', budget: 1, why: '…' },
];

const RULES = {
  'empty-catch': 'catch rỗng nuốt lỗi — chú thích `ignore: <lý do>` hoặc xử lý lỗi thật',
  'false-success-in-catch': 'catch trả `success: true`/`true` (báo thành công giả) — trả `fail()`/throw',
  'warn-in-catch': '`console.warn/error` trong catch — gom qua `reportError` để không tăng nợ',
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c);
const PUNCT_BEFORE_REGEX = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^',
]);
const KEYWORD_BEFORE_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
  'case', 'do', 'else', 'yield', 'await',
]);

/** Bỏ qua 1 literal chuỗi/template hoặc comment bắt đầu tại `i`; trả index mới, -1 nếu không phải. */
function skipOpaque(text, i) {
  const n = text.length;
  const ch = text[i];
  if (ch === '/' && text[i + 1] === '/') {
    let j = i + 2;
    while (j < n && text[j] !== '\n') j++;
    return j;
  }
  if (ch === '/' && text[i + 1] === '*') {
    let j = i + 2;
    while (j < n && !(text[j] === '*' && text[j + 1] === '/')) j++;
    return Math.min(n, j + 2);
  }
  if (ch === '"' || ch === "'") {
    let j = i + 1;
    while (j < n) {
      if (text[j] === '\\') { j += 2; continue; }
      if (text[j] === ch) { j++; break; }
      if (text[j] === '\n') break;
      j++;
    }
    return j;
  }
  if (ch === '`') {
    let j = i + 1;
    let depth = 0;
    while (j < n) {
      if (text[j] === '\\') { j += 2; continue; }
      if (text[j] === '`' && depth === 0) { j++; break; }
      if (text[j] === '$' && text[j + 1] === '{') { depth++; j += 2; continue; }
      if (text[j] === '}' && depth > 0) { depth--; j++; continue; }
      j++;
    }
    return j;
  }
  return -1;
}

/** Bỏ qua regex literal bắt đầu tại `/`; trả index mới, -1 nếu không đóng trên dòng. */
function skipRegex(text, i) {
  const n = text.length;
  let j = i + 1;
  let inClass = false;
  while (j < n) {
    const c = text[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '\n') return -1;
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '/' && !inClass) return j + 1;
    j++;
  }
  return -1;
}

/** Khớp cặp ngoặc `openCh`…`closeCh` kể từ `openIndex`; trả index của ngoặc đóng, -1 nếu thiếu. */
function findMatching(text, openIndex, openCh, closeCh) {
  const n = text.length;
  let depth = 0;
  let i = openIndex;
  let prev = '';
  while (i < n) {
    const ch = text[i];
    const sk = skipOpaque(text, i);
    if (sk !== -1) { prev = 'x'; i = sk; continue; }
    if (ch === '/' && (prev === '' || PUNCT_BEFORE_REGEX.has(prev) || KEYWORD_BEFORE_REGEX.has(prev))) {
      const rj = skipRegex(text, i);
      if (rj !== -1) { prev = 'x'; i = rj; continue; }
    }
    if (isIdentChar(ch)) {
      let j = i + 1;
      while (j < n && isIdentChar(text[j])) j++;
      prev = text.slice(i, j);
      i = j;
      continue;
    }
    if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
    if (!/\s/.test(ch)) prev = ch;
    i++;
  }
  return -1;
}

/** Bỏ qua whitespace + comment từ `i`. */
function skipTrivia(text, i) {
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '/' && text[i + 1] === '/') { i += 2; while (i < n && text[i] !== '\n') i++; continue; }
    if (ch === '/' && text[i + 1] === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    break;
  }
  return i;
}

/** Parse `catch [(param)] { … }` bắt đầu ngay sau từ khoá `catch`. */
function parseCatch(text, afterCatch) {
  const n = text.length;
  let i = skipTrivia(text, afterCatch);
  let param = '';
  if (text[i] === '(') {
    const close = findMatching(text, i, '(', ')');
    if (close === -1) return null;
    param = text.slice(i + 1, close);
    i = skipTrivia(text, close + 1);
  }
  if (text[i] !== '{') return null;
  const close = findMatching(text, i, '{', '}');
  if (close === -1) return null;
  return { bodyStart: i + 1, bodyEnd: close, body: text.slice(i + 1, close), param };
}

/** Quét toàn file, trả mọi catch block (kể cả catch lồng nhau). */
function scanCatchBlocks(text) {
  const out = [];
  const n = text.length;
  let i = 0;
  let prev = '';
  while (i < n) {
    const ch = text[i];
    const sk = skipOpaque(text, i);
    if (sk !== -1) { prev = 'x'; i = sk; continue; }
    if (ch === '/' && (prev === '' || PUNCT_BEFORE_REGEX.has(prev) || KEYWORD_BEFORE_REGEX.has(prev))) {
      const rj = skipRegex(text, i);
      if (rj !== -1) { prev = 'x'; i = rj; continue; }
    }
    if (isIdentChar(ch)) {
      let j = i + 1;
      while (j < n && isIdentChar(text[j])) j++;
      const word = text.slice(i, j);
      if (word === 'catch' && prev !== '.') {
        const block = parseCatch(text, j);
        if (block) {
          out.push(block);
          i = block.bodyStart; // quét tiếp BÊN TRONG để bắt catch lồng nhau
          prev = '{';
          continue;
        }
      }
      prev = word;
      i = j;
      continue;
    }
    if (!/\s/.test(ch)) prev = ch;
    i++;
  }
  return out;
}

/** Mask code: thay comment/chuỗi/template/regex bằng khoảng trắng (giữ newline) để đếm chính xác. */
function maskCode(text, { strings = true, comments = true, regex = true } = {}) {
  const n = text.length;
  const out = new Array(n);
  let i = 0;
  let prev = '';
  while (i < n) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      let j = i + 2;
      while (j < n && text[j] !== '\n') j++;
      for (let k = i; k < j; k++) out[k] = comments && text[k] !== '\n' ? ' ' : text[k];
      i = j;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(text[j] === '*' && text[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      for (let k = i; k < j; k++) out[k] = comments && text[k] !== '\n' ? ' ' : text[k];
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === ch) { j++; break; }
        if (text[j] === '\n') break;
        j++;
      }
      for (let k = i; k < j; k++) out[k] = strings && text[k] !== '\n' ? ' ' : text[k];
      prev = 'str';
      i = j;
      continue;
    }
    if (ch === '`') {
      let j = i + 1;
      let depth = 0;
      while (j < n) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === '`' && depth === 0) { j++; break; }
        if (text[j] === '$' && text[j + 1] === '{') { depth++; j += 2; continue; }
        if (text[j] === '}' && depth > 0) { depth--; j++; continue; }
        j++;
      }
      for (let k = i; k < j; k++) out[k] = strings && text[k] !== '\n' ? ' ' : text[k];
      prev = 'str';
      i = j;
      continue;
    }
    if (ch === '/' && regex && (prev === '' || PUNCT_BEFORE_REGEX.has(prev) || KEYWORD_BEFORE_REGEX.has(prev))) {
      const rj = skipRegex(text, i);
      if (rj !== -1) {
        for (let k = i; k < rj; k++) out[k] = text[k] !== '\n' ? ' ' : text[k];
        prev = 'regex';
        i = rj;
        continue;
      }
    }
    if (isIdentChar(ch)) {
      let j = i + 1;
      while (j < n && isIdentChar(text[j])) j++;
      for (let k = i; k < j; k++) out[k] = text[k];
      prev = text.slice(i, j);
      i = j;
      continue;
    }
    out[i] = text[i];
    if (!/\s/.test(ch)) prev = ch;
    i++;
  }
  return out.join('');
}

/** Trích nội dung comment trong một đoạn (bỏ qua comment nằm trong chuỗi). */
function extractComments(text) {
  const n = text.length;
  const out = [];
  let i = 0;
  while (i < n) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') { i = skipOpaque(text, i); continue; }
    if (ch === '/' && text[i + 1] === '/') {
      let j = i + 2;
      while (j < n && text[j] !== '\n') j++;
      out.push(text.slice(i + 2, j));
      i = j;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(text[j] === '*' && text[j + 1] === '/')) j++;
      out.push(text.slice(i + 2, Math.min(n, j)));
      i = Math.min(n, j + 2);
      continue;
    }
    i++;
  }
  return out.join(' ');
}

const RETURN_FALSE_SUCCESS_RE = /\breturn\s*(?:true\b|\{[^{}]*\bsuccess\s*:\s*true\b)/;
const WARN_CALL_RE = /\bconsole\s*\.\s*(?:warn|error)\s*\(/g;

const findings = [];
let catchBlockCount = 0;
let annotatedCount = 0;

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  const lineOf = (index) => text.slice(0, index).split('\n').length;

  const blocks = scanCatchBlocks(text);
  catchBlockCount += blocks.length;
  const masked = maskCode(text, { strings: true, comments: true, regex: true });

  for (const b of blocks) {
    // R1 — body chỉ có whitespace/comment (không tính chuỗi) và không có `ignore:`.
    const bodyNoStr = maskCode(b.body, { strings: false, comments: true, regex: true });
    if (bodyNoStr.trim() === '') {
      const annotated = /ignore:/.test(extractComments(b.body));
      if (annotated) annotatedCount++;
      else findings.push({ rule: 'empty-catch', file: rel, line: lineOf(b.bodyStart) });
    }

    // R2 — return success giả trong catch (quét bản masked của body).
    const bodyMasked = masked.slice(b.bodyStart, b.bodyEnd);
    if (RETURN_FALSE_SUCCESS_RE.test(bodyMasked)) {
      const m = RETURN_FALSE_SUCCESS_RE.exec(bodyMasked);
      findings.push({
        rule: 'false-success-in-catch',
        file: rel,
        line: lineOf(b.bodyStart + (m ? m.index : 0)),
      });
    }
  }

  // R3 — mọi console.warn/error nằm trong ít nhất một catch body (đếm 1 lần/occurrence).
  const ranges = blocks.map((b) => [b.bodyStart, b.bodyEnd]);
  let wm;
  WARN_CALL_RE.lastIndex = 0;
  while ((wm = WARN_CALL_RE.exec(masked)) !== null) {
    const idx = wm.index;
    if (ranges.some(([s, e]) => idx >= s && idx < e)) {
      findings.push({
        rule: 'warn-in-catch',
        file: rel,
        line: lineOf(idx),
        detail: wm[0].replace(/\s+/g, ''),
      });
    }
  }
}

// Gom theo file+rule để so allowlist (như check-ui-rules).
const grouped = new Map();
for (const f of findings) {
  const key = `${f.file}::${f.rule}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(f);
}

const baselineMode = process.env.ERROR_HANDLING_BASELINE === '1';
const allowMap = new Map(ALLOWLIST.map((e) => [`${e.file}::${e.rule}`, e]));
const violations = [];
const allowed = [];
let r3Total = 0;

for (const [key, list] of grouped) {
  const rule = key.split('::')[1];
  if (rule === 'warn-in-catch') {
    r3Total += list.length;
    continue; // R3 xét tổng thể bằng budget toàn cục bên dưới
  }
  const entry = baselineMode ? undefined : allowMap.get(key);
  if (entry && list.length <= entry.budget) {
    allowed.push({ key, count: list.length, budget: entry.budget, why: entry.why });
  } else {
    violations.push({ key, count: list.length, budget: entry?.budget, sample: list.slice(0, 5) });
  }
}

const r3Findings = findings.filter((f) => f.rule === 'warn-in-catch');
const r3Over = r3Total > WARN_IN_CATCH_BUDGET;
const byRule = findings.reduce((a, f) => ((a[f.rule] = (a[f.rule] || 0) + 1), a), {});

const result = {
  scanned: walk(SRC).length,
  catchBlocks: catchBlockCount,
  annotatedEmptyCatch: annotatedCount,
  counts: byRule,
  r3: {
    count: r3Total,
    budget: WARN_IN_CATCH_BUDGET,
    over: r3Over,
    findings: r3Findings.map((f) => ({ file: f.file, line: f.line, call: f.detail })),
  },
  allowed,
  violations,
};

if (AS_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`check-error-handling: quét ${result.scanned} file .ts/.tsx, ${catchBlockCount} catch block (${annotatedCount} empty-catch đã chú thích ignore:)`);
  console.log('  vi phạm theo luật: ' + Object.entries(byRule).map(([k, v]) => `${k}=${v}`).join('  '));
  console.log(`  R3 warn-in-catch: ${r3Total} / budget ${WARN_IN_CATCH_BUDGET}`);
  if (allowed.length) {
    console.log(`  allowlist (nợ kỹ thuật): ${allowed.length} mục`);
    for (const a of allowed) console.log(`    ~ ${a.key}  ${a.count}/${a.budget}${a.why ? ` — ${a.why}` : ''}`);
  }

  const hardFail = violations.length > 0;
  if (hardFail || r3Over) {
    console.log('\n  KẾT QUẢ: FAIL\n');
    for (const v of violations) {
      const rule = v.key.split('::')[1];
      console.log(`    ${v.key}  (${v.count}${v.budget != null ? `/${v.budget}` : ''})`);
      if (RULES[rule]) console.log(`        → ${RULES[rule]}`);
      for (const s of v.sample) console.log(`        ${s.file}:${s.line}${s.detail ? ` [${s.detail}]` : ''}`);
    }
    if (r3Over) {
      console.log(`    warn-in-catch  (${r3Total}/${WARN_IN_CATCH_BUDGET}) — vượt trần; chỉ được GIẢM`);
      for (const s of r3Findings.slice(0, 20)) console.log(`        ${s.file}:${s.line} [${s.detail}]`);
      if (r3Findings.length > 20) console.log(`        … còn ${r3Findings.length - 20} chỗ nữa`);
    }
    console.log('\n  Sửa theo luật ở đầu file; nếu là nợ cũ, cập nhật ALLOWLIST/WARN_IN_CATCH_BUDGET.');
  } else {
    console.log('\n  KẾT QUẢ: PASS — R1/R2 = 0, R3 trong trần budget.');
  }
}

process.exit(violations.length || r3Over ? 1 : 0);
