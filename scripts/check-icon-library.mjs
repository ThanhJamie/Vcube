#!/usr/bin/env node
/**
 * check-icon-library.mjs — cổng "MỘT nguồn icon" của VCUBE.
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * Trước gate này, UI trộn 4 nguồn icon: (1) lucide qua `<Icon>`, (2) lucide import TRỰC TIẾP
 * trong feature (kích thước/stroke do component tự đặt), (3) emoji làm icon (font emoji của
 * HĐH — nét khác hoàn toàn lucide), (4) raw `<svg>` (chỉ còn Google logo brand — được phép).
 * Người dùng báo "icon không đồng bộ"; gate này chặn tái phát.
 *
 * LUẬT (policy — docs/design/icon-map.md):
 *   A. `from 'lucide-react'` CHỈ được phép trong `src/frontend/ui/**` (tầng design-system).
 *      Feature/view/component phải dùng `<Icon name="…" />`.
 *   B. CẤM emoji làm icon trong code (ranges 1F300–1FAFF, 2600–27BF, 2B00–2BFF) — trừ COMMENT.
 *      `<option>`/`<select>`/canvas: bỏ emoji, chỉ giữ text (không thêm icon vào option).
 *   C. `<svg>` raw chỉ được là brand asset đã duyệt (Google logo ở AuthModal/Login/Register).
 *
 * ALLOWLIST: cố ý RỖNG. Nếu buộc phải tha, thêm entry kèm `why` + ngày + người duyệt; entry
 * hết hạn phải xoá (gate fail nếu allowlist trỏ tới file không còn vi phạm). Xem `verifyAllowlist`.
 *
 * Dùng:  node scripts/check-icon-library.mjs [--json]
 * RC: 0 = PASS · 1 = vi phạm · 2 = lỗi công cụ.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const UI_DIR = join(SRC, 'frontend', 'ui') + sep;
const AS_JSON = process.argv.includes('--json');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-ssr', '.loop']);

/** File được phép import lucide trực tiếp: toàn bộ tầng design-system `src/frontend/ui/**`. */
const LUCIDE_ALLOW = (file) => file.startsWith(UI_DIR);

/**
 * SVG raw được phép: brand asset Google (không phải icon UI).
 * Khớp theo `file:line` + lý do; xem docs/design/icon-map.md.
 */
const RAW_SVG_ALLOW = [
  { file: 'src/frontend/components/AuthModal.tsx', why: 'Google logo — brand asset của nhà cung cấp OAuth' },
  { file: 'src/frontend/views/LoginView.tsx', why: 'Google logo — brand asset của nhà cung cấp OAuth' },
  { file: 'src/frontend/views/RegisterView.tsx', why: 'Google logo — brand asset của nhà cung cấp OAuth' },
];

/** Allowlist emoji-icon: cố ý rỗng. `{ file, emoji, why }`. */
const EMOJI_ALLOW = [];

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;

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

/**
 * Bỏ COMMENT khỏi source, giữ nguyên độ dài dòng (thay bằng khoảng trắng) để line/col còn đúng.
 * Chỉ bỏ `//…` và `/* … *\/`; KHÔNG bỏ chuỗi/JSX text (emoji trong đó vẫn là vi phạm).
 * Xử lý đủ '…' "…" `…` (template, có `\` escape) để `//` trong URL không bị coi là comment.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let state = 'code';
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (state === 'code') {
      if (ch === '/' && next === '/') { state = 'line'; out += '  '; i += 2; continue; }
      if (ch === '/' && next === '*') { state = 'block'; out += '  '; i += 2; continue; }
      if (ch === "'") { state = 'single'; out += ch; i++; continue; }
      if (ch === '"') { state = 'double'; out += ch; i++; continue; }
      if (ch === '`') { state = 'template'; out += ch; i++; continue; }
      out += ch; i++; continue;
    }
    if (state === 'line') {
      if (ch === '\n') { state = 'code'; out += '\n'; } else out += ' ';
      i++; continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') { state = 'code'; out += '  '; i += 2; continue; }
      out += ch === '\n' ? '\n' : ' ';
      i++; continue;
    }
    // string/template: giữ nguyên, chỉ xử lý escape
    if (ch === '\\') { out += ch + (next ?? ''); i += 2; continue; }
    if ((state === 'single' && ch === "'") || (state === 'double' && ch === '"') || (state === 'template' && ch === '`')) {
      state = 'code';
    }
    out += ch; i++;
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const rel = (p) => relative(ROOT, p).split(sep).join('/');

function verifyAllowlist(files) {
  const touched = new Set(files.map(rel));
  const stale = [];
  for (const a of EMOJI_ALLOW) if (!touched.has(a.file)) stale.push(a);
  for (const a of RAW_SVG_ALLOW) if (!touched.has(a.file)) stale.push(a);
  return stale;
}

const files = walk(SRC);
const violations = [];

for (const file of files) {
  const relPath = rel(file);
  const src = readFileSync(file, 'utf8');

  // ---------- A. lucide import ngoài design-system ----------
  if (!LUCIDE_ALLOW(file)) {
    const re = /from\s+['"]lucide-react['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      violations.push({
        rule: 'lucide-outside-ui',
        file: relPath,
        line: lineOf(src, m.index),
        text: "import từ 'lucide-react'",
        why: 'Feature/view phải dùng <Icon name="…" /> (lucide chỉ được import trong src/frontend/ui/**)',
      });
    }
  }

  // ---------- C. raw <svg> ngoài allowlist brand (bỏ comment để không bắt chữ trong doc) ----------
  const codeNoComments = stripComments(src);
  const svgIdx = codeNoComments.indexOf('<svg');
  if (svgIdx >= 0 && !RAW_SVG_ALLOW.some((a) => a.file === relPath)) {
    violations.push({
      rule: 'raw-svg',
      file: relPath,
      line: lineOf(codeNoComments, svgIdx),
      text: '<svg>',
      why: 'Chỉ Google logo (brand) được phép; icon UI phải qua <Icon>',
    });
  }

  // ---------- B. emoji làm icon (ngoài comment) ----------
  const code = codeNoComments;
  EMOJI_RE.lastIndex = 0;
  let em;
  while ((em = EMOJI_RE.exec(code)) !== null) {
    const emoji = em[0];
    if (EMOJI_ALLOW.some((a) => a.file === relPath && a.emoji === emoji)) continue;
    violations.push({
      rule: 'emoji-icon',
      file: relPath,
      line: lineOf(code, em.index),
      text: emoji,
      why: 'Emoji render bằng font hệ điều hành ⇒ lệch nét lucide. Thay bằng <Icon>; với <option>/canvas thì bỏ emoji giữ text.',
    });
  }
}

for (const stale of verifyAllowlist(files)) {
  violations.push({
    rule: 'stale-allowlist',
    file: stale.file,
    line: 0,
    text: stale.emoji ?? '<svg>',
    why: 'Allowlist không còn hiệu lực (file không còn vi phạm) — xoá entry',
  });
}

if (AS_JSON) {
  console.log(JSON.stringify({
    gate: 'check-icon-library',
    scanned: files.length,
    rules: ['lucide-outside-ui', 'emoji-icon', 'raw-svg', 'stale-allowlist'],
    violations,
  }, null, 2));
} else if (violations.length === 0) {
  console.log(`check-icon-library: PASS — ${files.length} file .ts/.tsx: 0 lucide ngoài src/frontend/ui, 0 emoji-icon, raw <svg> chỉ còn brand Google.`);
} else {
  console.error(`check-icon-library: FAIL — ${violations.length} vi phạm trên ${files.length} file:`);
  for (const v of violations) {
    console.error(`  ${v.file}${v.line ? ':' + v.line : ''}  [${v.rule}]  "${v.text}"`);
    console.error(`      -> ${v.why}`);
  }
}

process.exit(violations.length === 0 ? 0 : 1);
