#!/usr/bin/env node
/**
 * check-ui-rules.mjs — B1 gate: chặn hồi quy design-system trên `src/**`.
 *
 * Bốn luật (giữ đúng bất biến token-only / data-honesty / prefers-reduced-motion):
 *   R1 control-border-line : `border-line` (viền trang trí, 1.42:1) gắn lên
 *                            <input>/<select>/<textarea> → phải là `border-line-control` (≥3:1).
 *   R2 unguarded-tolocale  : `toLocaleString(` không có guard NaN/validity gần đó
 *                            → dùng `Money`/`formatNumber` (trả EMPTY_VALUE '—').
 *   R3 focus-no-ring       : `focus:outline-none` (hoặc focus-visible) mà KHÔNG kèm
 *                            ring trong cùng className → người dùng bàn phím mất focus ring.
 *   R4 infinite-animation  : `animate-spin|ping|pulse|bounce` mà không có
 *                            `motion-reduce:animate-none` trong cùng className.
 *
 * Cách kiểm (heuristic, cố tình bảo thủ để CI xanh được NGAY):
 *   - Quét tag control bằng scanner tôn trọng `{}` / dấu nháy (không dừng ở `=>`).
 *   - Rule R3/R4 quét MỌI giá trị `className=` trong file (kể cả ternary/template).
 *   - Rule R2 xét theo DÒNG: nếu dòng chứa guard (Number.isFinite, ??, ?., EMPTY_VALUE,
 *     !== null, typeof…) thì bỏ qua.
 *
 * ALLOWLIST dưới đây là NỢ KỸ THUẬT ĐÃ BIẾT, mỗi entry ghi `budget` = số điểm còn lại
 * hôm nay. Vượt budget = vi phạm MỚI ⇒ FAIL. Cách này giữ CI xanh trong khi vẫn chặn
 * hồi quy (thêm control/animate mới vào file cũ sẽ tăng count và fail).
 * Ưu tiên SỬA hơn allowlist: hạ budget mỗi lần dọn bớt.
 *
 * Dùng: node scripts/check-ui-rules.mjs [--json]
 * RC=0 PASS · RC=1 FAIL · RC=2 lỗi công cụ.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const AS_JSON = process.argv.includes('--json');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '__snapshots__']);

/**
 * `budget` = trần số vi phạm được phép còn lại (nợ kỹ thuật). Vượt trần ⇒ FAIL.
 * 2026-09-18: đã dọn sạch 63 điểm nợ (`focus-no-ring` 35 + `unguarded-tolocale` 28)
 * nên allowlist rỗng — mọi vi phạm MỚI sẽ fail ngay. Nếu buộc phải tha nợ cũ, thêm entry
 * kèm `budget` + `why`, và hạ lại về 0 khi dọn xong.
 */
const ALLOWLIST = [];

const RULES = {
  'control-border-line': 'viền control dùng `border-line` (1.42:1) — đổi sang `border-line-control`',
  'unguarded-tolocale': '`toLocaleString(` thiếu guard NaN — dùng Money/formatNumber (EMPTY_VALUE "—")',
  'focus-no-ring': '`focus:outline-none` thiếu ring focus — thêm `focus-visible:ring-2 focus-visible:ring-ring`',
  'infinite-animation': 'animation vô hạn thiếu `motion-reduce:animate-none`',
};

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

/** Đọc tag bắt đầu tại `start` (text[start] === '<'), tôn trọng {} và chuỗi nháy. */
function scanTag(text, start) {
  let i = start + 1;
  let depth = 0;
  let quote = null;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return { tag: text.slice(start, i + 1), end: i + 1 };
  }
  return { tag: text.slice(start), end: text.length };
}

/** Lấy mọi string literal trong một biểu thức className (ternary/template/…). */
function stringsIn(expr) {
  const out = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      let val = '';
      i++;
      while (i < expr.length && expr[i] !== ch) {
        if (expr[i] === '\\') { val += expr[i + 1] ?? ''; i += 2; }
        else { val += expr[i]; i++; }
      }
      i++;
      out.push(val);
    } else i++;
  }
  return out;
}

/** Trả về mảng class (đã gộp mọi literal) cho từng `className=` trong `text`. */
function classNameValues(text) {
  const values = [];
  const re = /className\s*=\s*/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    let i = m.index + m[0].length;
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      let val = '';
      i++;
      while (i < text.length && text[i] !== ch) { val += text[i]; i++; }
      values.push({ index: m.index, value: val });
    } else if (ch === '{') {
      let depth = 0, j = i, quote = null;
      for (; j < text.length; j++) {
        const c = text[j];
        if (quote) { if (c === '\\') j++; else if (c === quote) quote = null; continue; }
        if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
      }
      values.push({ index: m.index, value: stringsIn(text.slice(i + 1, j - 1)).join(' ') });
    }
  }
  return values;
}

const BORDER_LINE_RE = /(?:^|[\s"'`])border-line(?![-_A-Za-z0-9])/;
const ANIM_RE = /\banimate-(spin|ping|pulse|bounce)\b/;
const GUARD_RE = /Number\.is(?:Finite|Integer|NaN)\b|\bisFinite\(|\bEMPTY_VALUE\b|\?\?|\?\.|\btypeof\b|!==\s*null|!=\s*null|!==\s*undefined/;

const findings = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  const lineOf = (index) => text.slice(0, index).split('\n').length;

  // R1 — control tags dùng border-line.
  const tagRe = /<(input|select|textarea)\b/g;
  let m;
  while ((m = tagRe.exec(text)) !== null) {
    const { tag } = scanTag(text, m.index);
    for (const cls of classNameValues(tag)) {
      if (BORDER_LINE_RE.test(cls.value)) {
        findings.push({ rule: 'control-border-line', file: rel, line: lineOf(m.index) });
        break;
      }
    }
    tagRe.lastIndex = m.index + 1;
  }

  const lines = text.split('\n');

  // R2 — toLocaleString thiếu guard trên cùng dòng.
  lines.forEach((line, i) => {
    if (!line.includes('toLocaleString(')) return;
    if (/^\s*(?:\*|\/\/)/.test(line)) return; // comment
    if (GUARD_RE.test(line)) return;
    findings.push({ rule: 'unguarded-tolocale', file: rel, line: i + 1 });
  });

  // R3/R4 — theo từng className.
  for (const cls of classNameValues(text)) {
    const v = cls.value;
    if (/focus(?:-visible)?:outline-none/.test(v) && !/\bring(?:-|\b)|ring-\[/.test(v)) {
      findings.push({ rule: 'focus-no-ring', file: rel, line: lineOf(cls.index) });
    }
    if (ANIM_RE.test(v) && !/motion-reduce:animate-none(?![-\w])/.test(v)) {
      const name = ANIM_RE.exec(v)?.[1];
      findings.push({ rule: 'infinite-animation', file: rel, line: lineOf(cls.index), detail: name });
    }
  }
}

// Gộp theo file+rule, so với allowlist budget.
const grouped = new Map();
for (const f of findings) {
  const key = `${f.file}::${f.rule}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(f);
}

const allowMap = new Map(ALLOWLIST.map((e) => [`${e.file}::${e.rule}`, e]));
// `UI_RULES_BASELINE=1` bỏ qua allowlist để in TOÀN BỘ vi phạm — dùng khi đo lại budget.
const baselineMode = process.env.UI_RULES_BASELINE === '1';
const violations = [];
const allowed = [];

for (const [key, list] of grouped) {
  const entry = baselineMode ? undefined : allowMap.get(key);
  if (entry && list.length <= entry.budget) {
    allowed.push({ key, count: list.length, budget: entry.budget, why: entry.why });
  } else if (entry) {
    violations.push({ key, count: list.length, budget: entry.budget, sample: list.slice(0, 5) });
  } else {
    violations.push({ key, count: list.length, sample: list.slice(0, 5) });
  }
}

const byRule = findings.reduce((a, f) => ((a[f.rule] = (a[f.rule] || 0) + 1), a), {});

if (AS_JSON) {
  console.log(JSON.stringify({ scanned: walk(SRC).length, counts: byRule, allowed, violations }, null, 2));
} else {
  console.log(`check-ui-rules: quét ${walk(SRC).length} file .ts/.tsx`);
  console.log('  vi phạm theo luật: ' + Object.entries(byRule).map(([k, v]) => `${k}=${v}`).join('  '));
  if (allowed.length) {
    const debt = allowed.reduce((s, a) => s + a.count, 0);
    console.log(`  allowlist (nợ kỹ thuật): ${allowed.length} mục, ${debt} điểm`);
    for (const a of allowed) console.log(`    ~ ${a.key}  ${a.count}/${a.budget}`);
  }
  if (violations.length) {
    console.log(`\n  KẾT QUẢ: FAIL — ${violations.length} nhóm vi phạm MỚI/vượt trần:\n`);
    for (const v of violations) {
      const rule = v.key.split('::')[1];
      console.log(`    ${v.key}  (${v.count}${v.budget != null ? `/${v.budget}` : ''})`);
      if (RULES[rule]) console.log(`        → ${RULES[rule]}`);
      for (const s of v.sample) console.log(`        ${s.file}:${s.line}${s.detail ? ` [${s.detail}]` : ''}`);
    }
    console.log('\n  Sửa theo luật ở đầu file; nếu là nợ cũ, thêm entry có budget vào ALLOWLIST.');
  } else {
    console.log('\n  KẾT QUẢ: PASS — không có vi phạm mới ngoài allowlist.');
  }
}

process.exit(violations.length ? 1 : 0);
