#!/usr/bin/env node
/**
 * codemod-tokens.mjs — Stage A: token hoá hex cứng trong `className` (0 pixel đổi).
 *
 * Nguồn sự thật:
 *   - docs/plans/01-theme-migration.md §3.1 (token contract), §3.2 (BẢNG MAP), §3.3 (sửa tương phản), §3.4 (thiết kế)
 *   - src/index.css khối `@theme static` + `.dark` (chỉ map sang token CÓ THẬT ở đây)
 *   - docs/design/tokens.md §1–§3
 *
 * Usage:
 *   node scripts/codemod-tokens.mjs --dry-run                      # quét src, sinh report
 *   node scripts/codemod-tokens.mjs --dry-run --dir src/frontend/views
 *   node scripts/codemod-tokens.mjs --dir src/frontend/components --exclude src/frontend/components/admin --apply
 *   node scripts/codemod-tokens.mjs --dry-run --report /tmp/x.md   # đổi đường dẫn report
 *
 * Luật (bắt buộc):
 *   1. Chỉ khớp trong class string của `className` / `class` ở file `.tsx` / `.jsx`:
 *      `className="…"`, `className='…'`, `className={"…"}`, `className={'…'}`, `className={`…`}`
 *      và mọi string literal bên trong `className={biểu thức}` (ternary, `cn(...)`, …).
 *      KHÔNG đụng `style={{…}}`, KHÔNG đụng biến/chuỗi rời, KHÔNG đụng file `.ts`
 *      (đặc biệt `new THREE.Color(0x…)` trong ModelViewer3D.tsx — màu trong JS là Stage C).
 *   2. Chỉ map hex có trong bảng §3.2 (theo VAI TRÒ của tiền tố). Mọi thứ khác bị TỪ CHỐI
 *      và ghi report kèm `file:line` — không đoán.
 *   3. Hỗ trợ biến thể (`hover:`, `focus:`, `focus-visible:`, `active:`, `group-hover:`, `disabled:`,
 *      `selection:`, `sm:`…) và hậu tố opacity (`/40`, `/[0.4]`).
 *   4. Idempotent: chạy lần hai không đổi gì.
 *   5. Luôn bỏ qua `src/frontend/ui/**` (thư viện primitive của agent A2b) và `src/frontend/theme/**`.
 */

import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

/* =====================================================================
   BẢNG MAP — §3.2. Khoá = hex đã chuẩn hoá 6 ký tự.
   Giá trị = token theo VAI TRÒ của tiền tố:
     text  : text-*, placeholder-*, fill-*, stroke-*, caret-*, accent-*, decoration-*
     surface: bg-*, from-*, via-*, to-*, shadow-*
     border : border(-x/y/t/r/b/l/s/e)-*, divide-*, ring-*, ring-offset-*, outline-*
     any    : mọi vai trò (giá trị token TRÙNG KHÍT hex -> 0 pixel đổi)
   ===================================================================== */
const TOKEN_MAP = {
  // --- Nhóm trùng khít giá trị token: 0 pixel đổi ---
  '#00687a': { any: 'primary' },
  '#005260': { any: 'primary-hover' },
  '#57dffe': { any: 'accent' },
  '#f8fafc': { any: 'canvas' },
  '#f8f9ff': { any: 'surface-muted' },
  '#cbd5e1': { any: 'line' },
  '#e2e8f0': { any: 'line-subtle' },
  '#64748b': { any: 'fg-subtle' },
  '#545f73': { any: 'fg-muted' },
  '#d97706': { any: 'warning-strong' },
  // Trạng thái (§3.2). Đo trên repo: các hex này KHÔNG xuất hiện trong className —
  // giữ trong bảng cho đủ hợp đồng, không sinh thay thế nào.
  '#15803d': { any: 'positive' },
  '#16a34a': { any: 'positive' },
  '#059669': { any: 'positive' },
  '#b91c1c': { any: 'danger' },
  '#dc2626': { any: 'danger' },
  '#e11d48': { any: 'danger' },
  '#1d4ed8': { any: 'info' },

  // --- Nhóm quyết định theo tiền tố (§3.2, rủi ro 8.1) ---
  '#091426': { text: 'fg', surface: 'surface-inverse', border: 'line' },
  '#1e293b': { surface: 'surface-inverse-raised' },
  // #FFFFFF: bg -> surface. text -> CHỈ khi cùng className có nền tối (xem resolveToken).
  '#ffffff': { surface: 'surface' },

  // --- §3.3: sửa lỗi tương phản bắt buộc (màu chữ đã bị loại) ---
  // #94A3B8 (2.56:1 FAIL) và #8590A6 (3.21:1 FAIL với chữ) -> fg-subtle #64748B khi là chữ,
  // line-control #8590A6 khi là viền control.
  '#94a3b8': { text: 'fg-subtle', border: 'line-control' },
  '#8590a6': { text: 'fg-subtle', border: 'line-control' },
  // Xám đã bị loại khỏi vai trò chữ (docs/design/tokens.md §2) — chỉ map khi ngữ cảnh là CHỮ.
  '#bcc7de': { text: 'fg-subtle' },
  '#d8e3fb': { text: 'fg-subtle' },
  // §3.2 gộp #E2E8F0 + #F1F5F9 -> line-subtle
  '#f1f5f9': { any: 'line-subtle' },
};

/* =====================================================================
   STAGE B (agent A2e) — BẢNG MAP HỢP NHẤT MÀU (đổi thị giác CÓ CHỦ ĐÍCH)
   Nguồn: docs/plans/01-theme-migration.md §4.1–§4.3 + docs/design/tokens.md §2.
   Bật bằng cờ `--stage-b`; mặc định TẮT nên hành vi Stage A không đổi.
   Giá trị token được phép kèm hậu tố opacity (`primary/10`): resolveToken ghép
   `prefix + '-' + token + opacity`, nên `bg-` + `primary/10` -> `bg-primary/10`.
   CHỈ khai báo hex có >= 1 consumer trong className (đã đối chiếu report §B.3).
   ===================================================================== */
const STAGE_B_MAP = {
  /* --- Nhóm 1: 9 sắc xám -> 2 (fg-muted #545F73 6.15:1 | fg-subtle #64748B 4.76:1) --- */
  '#7d7565': { text: 'fg-muted' },
  '#5a554c': { text: 'fg-muted' },
  '#5f6368': { text: 'fg-muted' },
  '#4d5156': { text: 'fg-muted' },
  '#204060': { text: 'fg-muted' },
  '#d5cfc5': { text: 'fg-muted' },
  '#8c857b': { text: 'fg-subtle' },
  '#75777d': { text: 'fg-subtle' },
  '#334155': { text: 'fg-muted', border: 'surface-inverse-raised', surface: 'surface-inverse-raised' },
  '#475569': { text: 'fg-muted' },

  /* --- Nhóm 2: slate đậm -> fg / nền tối --- */
  '#0f172a': { text: 'fg', surface: 'surface-inverse' },
  '#0b1c30': { text: 'fg', surface: 'surface-inverse' },
  '#202124': { text: 'fg' },
  '#1c1c1c': { text: 'fg', surface: 'surface-inverse', border: 'surface-inverse' },
  '#333333': { surface: 'surface-inverse-raised' },

  /* --- Nhóm 3: xoá bảng "editorial" thứ hai -> token storefront --- */
  '#f7f6f2': { surface: 'surface-muted' },
  '#faf9f5': { surface: 'surface-muted' },
  '#eae8e0': { surface: 'line-subtle' },
  '#e0ddd5': { surface: 'line-subtle' },

  /* --- Nhóm 4: viền --- */
  '#c5c6cd': { border: 'line', surface: 'line-subtle' },
  '#1e293b': { text: 'fg', border: 'surface-inverse-raised' },

  /* --- Nhóm 5: nền nhấn nhẹ (xanh nhạt) -> primary/<opacity> --- */
  '#e5eeff': { surface: 'primary/10', border: 'line-subtle' },
  '#eff4ff': { surface: 'primary/10' },
  '#dce9ff': { surface: 'primary/10' },
  '#d0e2ff': { surface: 'primary/20' },
  '#d3e4fe': { surface: 'primary/10' },
  '#d8e3fb': { surface: 'primary/10' },

  /* --- Nhóm 6: nền xám rất nhạt --- */
  '#f4f6f9': { surface: 'surface-muted' },
  '#fafafa': { surface: 'surface-muted' },
  '#fafbfd': { surface: 'canvas' },
  '#f8f9fa': { surface: 'canvas' },

  /* --- Nhóm 7: teal biến thể -> primary-hover / accent --- */
  '#005463': { surface: 'primary-hover' },
  '#00515f': { surface: 'primary-hover' },
  '#004e5c': { surface: 'primary-hover', text: 'primary' },
  '#004e5b': { surface: 'primary-hover' },
  '#00879e': { surface: 'primary-hover' },
  '#085f75': { surface: 'primary-hover' },
  '#0e7490': { surface: 'primary-hover' },
  '#00a8c6': { text: 'accent' },

  /* --- Nhóm 8: navy tối -> surface-inverse(-raised) --- */
  '#070f1e': { surface: 'surface-inverse' },
  '#060d1a': { surface: 'surface-inverse' },
  '#111111': { surface: 'surface-inverse' },
  '#11233b': { surface: 'surface-inverse-raised' },
  '#131f33': { surface: 'surface-inverse-raised' },
  '#132238': { surface: 'surface-inverse-raised' },
  '#1c2c45': { surface: 'surface-inverse-raised' },
  '#0f1d32': { surface: 'surface-inverse-raised' },

  /* --- Nhóm 9: trạng thái --- */
  '#990000': { text: 'danger', surface: 'danger' },
  '#ba1a1a': { text: 'danger', surface: 'danger' },
  '#166534': { text: 'positive' },
  '#dcfce7': { surface: 'positive/10' },
  '#bbf7d0': { border: 'positive/30' },
  '#10b981': { border: 'positive' },
  '#ffedd5': { surface: 'warning/10' },
  '#fed7aa': { border: 'warning/30' },
  '#9a3412': { text: 'warning' },
  '#fff8e6': { surface: 'warning/10' },
  '#fffdf0': { surface: 'warning/10' },
  '#664d03': { text: 'warning' },
  '#7a5b00': { text: 'warning' },
  '#ea580c': { text: 'warning-strong' },
  '#c59b27': { text: 'warning-strong' },
  '#ffd700': { surface: 'warning-strong', text: 'warning-strong' },
  '#1c0a0a': { surface: 'danger' },
  '#ef4444': { border: 'danger' },
  '#fca5a5': { text: 'primary-fg' },
  '#1c1608': { surface: 'warning' },
  '#f59e0b': { border: 'warning' },
  '#fde68a': { text: 'primary-fg' },
  '#1e40af': { text: 'info' },
  '#1a0dab': { text: 'info' },
  '#004b87': { text: 'info' },
  '#0284c7': { surface: 'info' },
  '#0369a1': { surface: 'info' },
  '#eff6ff': { surface: 'info/10' },
  '#bfdbfe': { border: 'info/30' },
  '#f0f7ff': { surface: 'info/10' },
  '#b8d5ff': { border: 'info/30' },
};

/** Tiền tố utility nhận màu -> vai trò. Ngoài bảng này = từ chối (không đoán). */
const PREFIX_ROLE = {
  bg: 'surface',
  from: 'surface',
  via: 'surface',
  to: 'surface',
  shadow: 'surface',
  text: 'text',
  placeholder: 'text',
  fill: 'text',
  stroke: 'text',
  caret: 'text',
  accent: 'text',
  decoration: 'text',
  border: 'border',
  'border-x': 'border',
  'border-y': 'border',
  'border-t': 'border',
  'border-r': 'border',
  'border-b': 'border',
  'border-l': 'border',
  'border-s': 'border',
  'border-e': 'border',
  divide: 'border',
  ring: 'border',
  'ring-offset': 'border',
  outline: 'border',
};

/** Giá trị LIGHT của token (src/index.css `@theme static`) — để phát hiện lệch màu. */
const TOKEN_LIGHT = {
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  'surface-raised': '#FFFFFF',
  'surface-muted': '#F8F9FF',
  'surface-inverse': '#091426',
  'surface-inverse-raised': '#1E293B',
  'on-inverse': '#FFFFFF',
  line: '#CBD5E1',
  'line-subtle': '#E2E8F0',
  'line-control': '#8590A6',
  fg: '#091426',
  'fg-muted': '#545F73',
  'fg-subtle': '#64748B',
  primary: '#00687A',
  'primary-hover': '#005260',
  'primary-fg': '#FFFFFF',
  accent: '#57DFFE',
  positive: '#15803D',
  warning: '#B45309',
  'warning-strong': '#D97706',
  danger: '#B91C1C',
  info: '#1D4ED8',
  ring: '#00687A',
};

/** Gợi ý xử lý tay cho các hex KHÔNG map được (report §2). */
const MANUAL_NOTE = {
  '#f7f6f2': 'Bảng "editorial" (§3.2) — Stage B: chọn token storefront',
  '#faf9f5': 'Bảng "editorial" (§3.2) — Stage B',
  '#eae8e0': 'Bảng "editorial" (§3.2) — Stage B',
  '#e0ddd5': 'Bảng "editorial" (§3.2) — Stage B',
  '#d5cfc5': 'Bảng "editorial" (§3.2) — Stage B',
  '#1c1c1c': 'Bảng "editorial" (§3.2) — Stage B (mực đen ấm)',
  '#7d7565': 'Bảng "editorial" (§3.2) — Stage B (fg-muted?)',
  '#a69c8a': 'Bảng "editorial" (§3.2) — Stage B (fg-subtle?)',
  '#8c857b': 'Xám nâu editorial — Stage B',
  '#5a554c': 'Xám nâu editorial — Stage B',
  '#0e7490': '§3.2: gradient stop, 1 chỗ ở HomeView — xử lý tay (Stage B)',
  '#1e293b': 'Đã có token surface-inverse-raised cho bg-/from-/to-; text-/border- cần người chốt (Stage B)',
  '#c5c6cd': 'Xám trung tính "viền" (261 chỗ) — Stage B: line hoặc line-control',
  '#334155': 'Slate-700 — Stage B: fg hoặc fg-muted',
  '#475569': 'Slate-600 — Stage B: fg-muted',
  '#0f172a': 'Slate-900 — Stage B: fg',
  '#0b1c30': 'Navy tối — Stage B',
  '#0f1d32': 'Navy tối — Stage B',
  '#75777d': 'Xám trung tính — Stage B: fg-subtle',
  '#5f6368': 'Xám Google-ish — Stage B: fg-muted',
  '#202124': 'Xám Google-ish — Stage B: fg',
  '#4d5156': 'Xám Google-ish — Stage B: fg-muted',
  '#1a0dab': 'Xanh link Google — Stage B: info',
  '#005463': 'Biến thể teal tối — Stage B: primary-hover?',
  '#00515f': 'Biến thể teal tối — Stage B: primary-hover?',
  '#004e5c': 'Biến thể teal tối — Stage B: primary-hover?',
  '#00879e': 'Biến thể teal sáng — Stage B',
  '#00a8c6': 'Biến thể cyan — Stage B: accent',
  '#4cd7f6': 'Biến thể cyan — Stage B: accent',
  '#085f75': 'Biến thể teal — Stage B',
  '#001f26': 'Navy rất tối — Stage B: fg',
  '#204060': 'Navy trung tính — Stage B: fg-muted',
  '#004b87': 'Xanh dương — Stage B: info',
  '#060d1a': 'Navy gần đen — Stage B: surface-inverse',
  '#070f1e': 'Navy gần đen — Stage B: surface-inverse',
  '#111111': 'Đen tuyệt đối — Stage B (tokens.md §1: không dùng #000)',
  '#131f33': 'Navy tối — Stage B: surface-inverse',
  '#132238': 'Navy tối — Stage B: surface-inverse',
  '#1c2c45': 'Navy tối — Stage B: surface-inverse-raised',
  '#11233b': 'Navy tối (gradient) — Stage B',
  '#990000': 'Đỏ đậm — Stage B: danger',
  '#664d03': 'Vàng nâu (warning text) — Stage B: warning',
  '#166534': 'Xanh lá đậm — Stage B: positive',
  '#ffd700': 'Vàng kim (sao) — Stage B: warning-strong',
  '#10b981': 'Emerald (viền) — Stage B: positive',
  '#ef4444': 'Red-500 (viền) — Stage B: danger',
  '#f59e0b': 'Amber-500 (viền) — Stage B: warning-strong',
  '#dcfce7': 'Nền xanh nhạt — Stage B',
  '#bbf7d0': 'Viền xanh nhạt — Stage B',
  '#fca5a5': 'Đỏ nhạt (chữ trên nền tối) — Stage B: danger',
  '#fde68a': 'Vàng nhạt (chữ trên nền tối) — Stage B: warning',
  '#fed7aa': 'Cam nhạt (viền) — Stage B',
  '#ffedd5': 'Cam rất nhạt (nền) — Stage B',
  '#fff8e6': 'Vàng rất nhạt (nền) — Stage B',
  '#fffdf0': 'Vàng rất nhạt (nền) — Stage B',
  '#7a5b00': 'Vàng nâu đậm — Stage B',
  '#9a3412': 'Cam nâu đậm — Stage B',
  '#ea580c': 'Cam đậm — Stage B: warning-strong',
  '#1e40af': 'Blue-800 — Stage B: info',
  '#c59b27': 'Vàng kim tối — Stage B: warning-strong',
  '#0284c7': 'Sky-600 (gradient) — Stage B: info',
  '#0369a1': 'Sky-700 (gradient) — Stage B: info',
  '#d8e3fb': 'Xám xanh đã loại khỏi chữ — chỉ map khi là CHỮ; bg- cần người chốt (Stage B)',
  '#bcc7de': 'Xám xanh đã loại khỏi chữ — Stage B',
  '#eff4ff': 'Nền xanh rất nhạt — Stage B: surface-muted?',
  '#e5eeff': 'Nền/viền xanh nhạt — Stage B',
  '#dce9ff': 'Nền xanh nhạt — Stage B',
  '#d0e2ff': 'Nền xanh nhạt — Stage B',
  '#d3e4fe': 'Nền xanh nhạt — Stage B',
  '#b8d5ff': 'Viền xanh nhạt — Stage B',
  '#bfdbfe': 'Viền xanh nhạt — Stage B',
  '#eff6ff': 'Nền xanh rất nhạt — Stage B',
  '#f0f7ff': 'Nền xanh rất nhạt — Stage B',
  '#f4f6f9': 'Nền xám rất nhạt — Stage B',
  '#fafafa': 'Nền trắng ngà — Stage B: surface',
  '#f8f9fa': 'Nền xám nhạt — Stage B: canvas',
  '#fafbfd': 'Nền xám nhạt — Stage B: canvas',
  '#333333': 'Xám đậm — Stage B',
  '#1c0a0a': 'Nền đỏ rất tối (toast) — Stage B: danger nền',
  '#1c1608': 'Nền vàng rất tối (toast) — Stage B: warning nền',
};

/* ===================================================================== */

const ATTR_START_RE = /\b(?:className|class)\s*=\s*(?=["'{])/g;
const HEX_RE = /\[(#[0-9a-fA-F]{3,8})\]/g;
const PREFIX_CHAR = /[A-Za-z0-9-]/;
const OPACITY_RE = /^\/(\[[^\]]+\]|[0-9]*\.?[0-9]+)/;
/** Bỏ qua string literal là toán hạng so sánh (`x === 'text-[#091426]'`, `case '…'`). */
const CMP_BEFORE_RE = /(?:===|!==|==|!=|case)\s*$/;
/** Dấu hiệu "cùng className này có nền tối" — dùng cho luật text-[#FFFFFF]. */
const DARK_BG_HINT =
  /(?:bg-(?:black|surface-inverse|surface-inverse-raised|primary|primary-hover)\b|bg-\[#(?:0[0-9a-f]{2}|1[0-9a-f]{2})[0-9a-f]{3}\]|bg-\[#(?:0[0-9a-f]{2}|1[0-9a-f]{2})[0-9a-f]{3}\]\/)/;

/** Luôn bỏ qua (ownership agent khác / ngoài phạm vi Stage A). */
const HARD_SKIP = ['src/frontend/ui', 'src/frontend/theme'];

function normalizeHex(raw) {
  let h = raw.replace('#', '').toLowerCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return '#' + h;
}

function toPosix(p) {
  return p.split('\\').join('/');
}

function relFromRoot(abs) {
  return toPosix(relative(REPO_ROOT, abs));
}

function parseArgs(argv) {
  const opts = {
    dirs: [],
    excludes: [...HARD_SKIP],
    apply: false,
    report: 'docs/plans/token-codemod-report.md',
    json: false,
    stageB: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dir') opts.dirs.push(argv[++i]);
    else if (a === '--exclude') opts.excludes.push(argv[++i]);
    else if (a === '--apply') opts.apply = true;
    else if (a === '--dry-run') opts.apply = false;
    else if (a === '--report') opts.report = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--stage-b') opts.stageB = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/codemod-tokens.mjs [--dry-run|--apply] [--dir <path>]... [--exclude <path>]... [--report <file>]');
      process.exit(0);
    } else {
      console.error('Tham số không hiểu: ' + a);
      process.exit(2);
    }
  }
  if (opts.dirs.length === 0) opts.dirs.push('src');
  // Stage B: trộn bảng hợp nhất màu vào bảng Stage A (giữ nguyên vai trò Stage A,
  // bổ sung/ghi đè theo từng vai trò của hex).
  if (opts.stageB) {
    for (const [hex, entry] of Object.entries(STAGE_B_MAP)) {
      TOKEN_MAP[hex] = Object.assign({}, TOKEN_MAP[hex] || {}, entry);
    }
  }
  return opts;
}

function isExcluded(absPath, excludes) {
  const rel = relFromRoot(absPath);
  return excludes.some((ex) => {
    const e = toPosix(ex).replace(/\/+$/, '');
    return rel === e || rel.startsWith(e + '/');
  });
}

function collectFiles(targets, excludes) {
  const out = [];
  const visit = (abs) => {
    if (isExcluded(abs, excludes)) return;
    const st = statSync(abs);
    if (st.isDirectory()) {
      for (const entry of readdirSync(abs).sort()) visit(join(abs, entry));
      return;
    }
    if (/\.(tsx|jsx)$/.test(abs)) out.push(abs);
  };
  for (const t of targets) {
    const abs = resolve(REPO_ROOT, t);
    try {
      statSync(abs);
    } catch {
      console.error('Không tìm thấy: ' + t);
      process.exit(2);
    }
    visit(abs);
  }
  return out.sort();
}

/**
 * Ký hiệu an toàn cho report: Tailwind v4 quét CẢ file .md trong repo, nên nếu report
 * chứa chuỗi dạng `bg-[#00687A]` thì Tailwind sẽ sinh utility chết vào CSS.
 * Vì vậy mọi ví dụ "trước" được in dưới dạng `bg-(#00687A)` — không phải candidate hợp lệ.
 */
function maskClassShape(s) {
  return String(s).replace(/\[(#[0-9a-fA-F]{3,8})\]/g, '($1)');
}

/** Có nằm trong vùng `${…}` của template literal hay không (đếm ngoặc, bỏ qua chuỗi). */
function insideInterpolation(value, offset) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < offset; i += 1) {
    const c = value[i];
    if (quote) {
      if (c === '\\') i += 1;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '$' && value[i + 1] === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') depth = Math.max(0, depth - 1);
  }
  return depth > 0;
}

function lineAt(content, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) if (content.charCodeAt(i) === 10) line += 1;
  return line;
}

/**
 * Quyết định token cho một cặp (hex, prefix).
 * @returns {{token?: string, reason?: string}}
 */
function resolveToken(hexNorm, prefix, value) {
  const role = PREFIX_ROLE[prefix];
  if (!role) return { reason: 'tiền tố "' + prefix + '" ngoài whitelist màu' };
  const entry = TOKEN_MAP[hexNorm];
  if (!entry) return { reason: 'hex không có trong bảng map §3.2' };
  if (entry.any) return { token: entry.any };
  const token = entry[role];
  if (token) return { token };
  if (hexNorm === '#ffffff' && role === 'text') {
    if (DARK_BG_HINT.test(value)) return { token: 'on-inverse' };
    return { reason: 'chữ #FFFFFF nhưng không thấy nền tối trong cùng className — cần người xác minh' };
  }
  return { reason: 'hex có trong map nhưng KHÔNG có vai trò cho tiền tố "' + prefix + '"' };
}

/** i trỏ vào ký tự quote; trả về index NGAY SAU quote đóng (bỏ qua escape + `${…}`). */
function skipStringLiteral(s, i) {
  const q = s[i];
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === '\\') {
      j += 2;
      continue;
    }
    if (q === '`' && c === '$' && s[j + 1] === '{') {
      const close = findMatchingBrace(s, j + 1);
      if (close < 0) return s.length;
      j = close + 1;
      continue;
    }
    if (c === q) return j + 1;
    j += 1;
  }
  return s.length;
}

/** openIdx trỏ vào '{'; trả về index của '}' khớp (bỏ qua ngoặc trong chuỗi). */
function findMatchingBrace(s, openIdx) {
  let depth = 0;
  let j = openIdx;
  while (j < s.length) {
    const c = s[j];
    if (c === '"' || c === "'" || c === '`') {
      j = skipStringLiteral(s, j);
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return j;
    }
    j += 1;
  }
  return -1;
}

/**
 * Các vùng chứa class string: `className="…"`, `className={'…'}`, `className={`…`}`
 * và MỌI string literal bên trong `className={biểu thức}` (ternary, `cn(...)`, …).
 */
function collectClassRegions(content) {
  const regions = [];
  for (const m of content.matchAll(ATTR_START_RE)) {
    const i = m.index + m[0].length;
    const q = content[i];
    if (q === '"' || q === "'") {
      const end = skipStringLiteral(content, i);
      regions.push({ start: i + 1, end: end - 1, container: 'attr' });
      continue;
    }
    const close = findMatchingBrace(content, i);
    if (close < 0) continue;
    let j = i + 1;
    while (j < close) {
      const c = content[j];
      if (c === '"' || c === "'" || c === '`') {
        const end = skipStringLiteral(content, j);
        const before = content.slice(Math.max(0, j - 12), j);
        if (!CMP_BEFORE_RE.test(before)) regions.push({ start: j + 1, end: end - 1, container: 'expr' });
        j = end;
        continue;
      }
      j += 1;
    }
  }
  return regions;
}

function scanFile(abs, content) {
  const edits = [];
  const rejects = [];
  const file = relFromRoot(abs);
  for (const region of collectClassRegions(content)) {
    const value = content.slice(region.start, region.end);
    if (!value.includes('[#')) continue;
    const valueStart = region.start;
    for (const hm of value.matchAll(HEX_RE)) {
      const hexRaw = hm[1];
      const hs = hm.index;
      const he = hs + hm[0].length;
      const line = lineAt(content, valueStart + hs);
      if (hs === 0 || value[hs - 1] !== '-') {
        rejects.push({ file, line, hexRaw, prefix: '(không có)', raw: hexRaw, reason: 'không phải utility dạng `prefix-(#hex)`' });
        continue;
      }
      let k = hs - 2;
      while (k >= 0 && PREFIX_CHAR.test(value[k])) k -= 1;
      const prefixStart = k + 1;
      const prefix = value.slice(prefixStart, hs - 1);
      const opMatch = OPACITY_RE.exec(value.slice(he));
      const opacity = opMatch ? opMatch[0] : '';
      const end = he + opacity.length;
      const hexNorm = normalizeHex(hexRaw);
      const { token, reason } = resolveToken(hexNorm, prefix, value);
      if (!token) {
        rejects.push({ file, line, hexRaw, prefix, raw: value.slice(prefixStart, end), reason });
        continue;
      }
      edits.push({
        file,
        line,
        start: valueStart + prefixStart,
        end: valueStart + end,
        from: value.slice(prefixStart, end),
        to: prefix + '-' + token + opacity,
        hexRaw,
        hexNorm,
        prefix,
        token,
        opacity,
        inInterp: region.container === 'expr' && insideInterpolation(value, hs),
      });
    }
  }
  return { edits, rejects };
}

/* ------------------------------ report ------------------------------ */

function suggestFor(hexNorm) {
  return MANUAL_NOTE[hexNorm] || 'Không có trong bảng map §3.2 — Stage B: chọn token theo vai trò';
}

function buildReport(ctx) {
  const { command, apply, dirs, excludes, scanned, edits, rejects, changedFiles } = ctx;
  const L = [];
  const byToken = new Map();
  for (const e of edits) {
    if (!byToken.has(e.token)) byToken.set(e.token, { count: 0, prefixes: new Map(), examples: [] });
    const t = byToken.get(e.token);
    t.count += 1;
    t.prefixes.set(e.prefix, (t.prefixes.get(e.prefix) || 0) + 1);
    if (t.examples.length < 3) t.examples.push(maskClassShape(e.from) + ' → ' + e.to + '  (' + e.file + ':' + e.line + ')');
  }
  const rejectsByHex = new Map();
  for (const r of rejects) {
    const hx = normalizeHex(r.hexRaw);
    if (!rejectsByHex.has(hx)) rejectsByHex.set(hx, { count: 0, prefixes: new Map(), files: new Map() });
    const rec = rejectsByHex.get(hx);
    rec.count += 1;
    rec.prefixes.set(r.prefix, (rec.prefixes.get(r.prefix) || 0) + 1);
    if (!rec.files.has(r.file)) rec.files.set(r.file, []);
    rec.files.get(r.file).push(r.line);
  }
  const deviations = new Map();
  for (const e of edits) {
    const target = TOKEN_LIGHT[e.token];
    if (!target) continue;
    if (normalizeHex(target) === e.hexNorm) continue;
    const key = e.hexNorm + ' → ' + e.token;
    if (!deviations.has(key)) deviations.set(key, { count: 0, from: e.hexNorm, to: e.token, target: normalizeHex(target), token: e.token, files: new Map() });
    const d = deviations.get(key);
    d.count += 1;
    if (!d.files.has(e.file)) d.files.set(e.file, []);
    d.files.get(e.file).push(e.line);
  }
  const interp = edits.filter((e) => e.inInterp);
  const tokenValues = new Set(Object.values(TOKEN_LIGHT).map(normalizeHex));
  const willVanish = [...new Set(edits.map((e) => e.hexNorm))].filter((h) => !tokenValues.has(h)).sort();

  L.push('# Báo cáo codemod token — Stage A (`docs/plans/01-theme-migration.md` §3.2–§3.4)');
  L.push('');
  L.push('> Sinh tự động bởi `scripts/codemod-tokens.mjs`. **Không sửa tay.**');
  L.push('');
  L.push('- Lệnh: `' + command + '`');
  L.push('- Chế độ: **' + (apply ? 'APPLY (đã ghi file)' : 'DRY-RUN (không ghi file)') + '**');
  L.push('- Phạm vi (`--dir`): ' + dirs.map((d) => '`' + d + '`').join(', '));
  L.push('- Loại trừ: ' + excludes.map((d) => '`' + d + '`').join(', '));
  L.push('- File `.tsx`/`.jsx` đã quét: **' + scanned + '**');
  L.push('- Utility dạng `prefix-[#hex][/opacity]` tìm thấy trong `className`/`class`: **' + (edits.length + rejects.length) + '**');
  L.push('- Sẽ thay thế' + (apply ? ' / đã thay thế' : '') + ': **' + edits.length + '**');
  L.push('- Từ chối (không map được, cần xử lý tay): **' + rejects.length + '**');
  L.push('- File bị sửa: **' + changedFiles + '**');
  L.push('');
  L.push('> **Quy ước ký hiệu:** ví dụ "trước" in dạng `bg-(#00687A)` — tương đương lớp gốc `bg-[#00687A]`.');
  L.push('> Lý do: Tailwind v4 quét cả file `.md` trong repo, nếu report chứa nguyên văn lớp hex thì');
  L.push('> Tailwind sẽ sinh utility CHẾT vào CSS build. Ký hiệu `(#…)` không phải candidate hợp lệ.');
  L.push('');
  L.push('---');
  L.push('');
  L.push('## 1. Token → số chỗ thay thế');
  L.push('');
  L.push('| Token | Số chỗ | Tiền tố | Ví dụ |');
  L.push('|---|---:|---|---|');
  for (const [token, t] of [...byToken.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const prefixes = [...t.prefixes.entries()].sort((a, b) => b[1] - a[1]).map(([p, c]) => '`' + p + '-`(' + c + ')').join(', ');
    L.push('| `' + token + '` | ' + t.count + ' | ' + prefixes + ' | ' + t.examples.map((x) => '`' + x + '`').join('<br>') + ' |');
  }
  L.push('');
  L.push('## 2. Màu KHÔNG map được — phải xử lý tay');
  L.push('');
  L.push('Không đoán. Mọi hex dưới đây nằm ngoài bảng §3.2 (hoặc có trong bảng nhưng tiền tố không ứng với vai trò nào).');
  L.push('');
  L.push('### 2.1 Tổng hợp theo hex');
  L.push('');
  L.push('| Hex | Số chỗ | Tiền tố | Số file | Gợi ý |');
  L.push('|---|---:|---|---:|---|');
  for (const [hx, rec] of [...rejectsByHex.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const prefixes = [...rec.prefixes.entries()].sort((a, b) => b[1] - a[1]).map(([p, c]) => p + '(' + c + ')').join(', ');
    L.push('| `' + hx + '` | ' + rec.count + ' | ' + prefixes + ' | ' + rec.files.size + ' | ' + suggestFor(hx) + ' |');
  }
  L.push('');
  L.push('### 2.2 Chi tiết `file:line`');
  L.push('');
  for (const [hx, rec] of [...rejectsByHex.entries()].sort((a, b) => b[1].count - a[1].count)) {
    L.push('#### `' + hx + '` — ' + rec.count + ' chỗ · ' + suggestFor(hx));
    L.push('');
    for (const [f, lines] of [...rec.files.entries()].sort()) {
      const uniq = [...new Set(lines)].sort((a, b) => a - b);
      L.push('- `' + f + '`:' + uniq.join(', '));
    }
    L.push('');
  }
  L.push('## 3. Ngoại lệ CÓ CHỦ ĐÍCH (đổi giá trị màu so với hex gốc)');
  L.push('');
  L.push('Stage A yêu cầu "0 pixel đổi"; các dòng dưới đây là ngoại lệ do chính bảng map §3.2 và luật tương phản §3.3 quy định.');
  L.push('');
  if (deviations.size === 0) {
    L.push('_Không có._');
  } else {
    L.push('| Hex gốc | → Token | Giá trị token (light) | Số chỗ | File |');
    L.push('|---|---|---|---:|---|');
    for (const [, d] of [...deviations.entries()].sort((a, b) => b[1].count - a[1].count)) {
      const files = [...d.files.entries()].map(([f, lines]) => '`' + f + '`:' + [...new Set(lines)].sort((a, b) => a - b).join(', ')).join('<br>');
      L.push('| `' + d.from + '` | `' + d.to + '` | `' + d.target + '` | ' + d.count + ' | ' + files + ' |');
    }
  }
  L.push('');
  L.push('**Hệ quả lên tập màu của CSS build** (`scripts/verify-tokens-unchanged.mjs`): các hex sau sẽ BIẾN MẤT khỏi CSS');
  L.push('vì không còn consumer nào và không phải giá trị của token nào:');
  L.push('');
  L.push(willVanish.length ? willVanish.map((h) => '`' + h + '`').join(', ') : '_không có_');
  L.push('');
  if (interp.length) {
    L.push('### 3.1 Thay thế nằm trong nội suy `${…}` của template literal — đã rà bằng mắt');
    L.push('');
    for (const e of interp.slice(0, 80)) L.push('- `' + e.file + ':' + e.line + '` — `' + maskClassShape(e.from) + '` → `' + e.to + '`');
    if (interp.length > 80) L.push('- … và ' + (interp.length - 80) + ' chỗ nữa');
    L.push('');
  }
  L.push('## 4. Từ chối theo lý do');
  L.push('');
  const reasons = new Map();
  for (const r of rejects) reasons.set(r.reason, (reasons.get(r.reason) || 0) + 1);
  L.push('| Lý do | Số chỗ |');
  L.push('|---|---:|');
  for (const [reason, c] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) L.push('| ' + reason + ' | ' + c + ' |');
  L.push('');
  L.push('## 5. Phạm vi & bất biến');
  L.push('');
  L.push('- Chỉ khớp trong class string của `className`/`class`: `className="…"`, `className=\'…\'`, `className={"…"}`, `className={\'…\'}`, ``className={`…`}`` và string literal trong `className={biểu thức}`.');
  L.push('- Không đụng `.ts` (màu trong JS/Three.js là Stage C), không đụng `style={{…}}`, không đụng utility phi màu.');
  L.push('- Loại trừ cứng: `src/frontend/ui/**` (thư viện primitive của A2b) và `src/frontend/theme/**`.');
  L.push('- Idempotent: chạy lần hai không còn gì để đổi cho các cặp đã map.');
  L.push('');
  return L.join('\n');
}

/* ------------------------------ main ------------------------------ */

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const command = 'node scripts/codemod-tokens.mjs ' + process.argv.slice(2).join(' ');
  const files = collectFiles(opts.dirs, opts.excludes);

  // Quét MỘT lần trên trạng thái hiện tại: report luôn phản ánh "trước khi áp".
  const allEdits = [];
  const allRejects = [];
  const perFileEdits = new Map();
  let changedFiles = 0;

  for (const abs of files) {
    const content = readFileSync(abs, 'utf8');
    const { edits, rejects } = scanFile(abs, content);
    allEdits.push(...edits);
    allRejects.push(...rejects);
    if (edits.length) perFileEdits.set(abs, edits.length);
    if (opts.apply && edits.length) {
      const sorted = [...edits].sort((a, b) => b.start - a.start);
      let out = content;
      let prevStart = Infinity;
      let skipped = 0;
      for (const e of sorted) {
        if (e.end > prevStart) {
          console.error('BỎ QUA (chồng lấn) ' + e.file + ':' + e.line + ' ' + e.from);
          skipped += 1;
          continue;
        }
        out = out.slice(0, e.start) + e.to + out.slice(e.end);
        prevStart = e.start;
      }
      if (skipped === 0 && out !== content) {
        writeFileSync(abs, out, 'utf8');
        changedFiles += 1;
      }
    }
  }

  const report = buildReport({
    command,
    apply: opts.apply,
    dirs: opts.dirs,
    excludes: opts.excludes,
    scanned: files.length,
    edits: allEdits,
    rejects: allRejects,
    changedFiles,
  });

  const reportPath = resolve(REPO_ROOT, opts.report);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, 'utf8');

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          mode: opts.apply ? 'apply' : 'dry-run',
          dirs: opts.dirs,
          excludes: opts.excludes,
          scanned: files.length,
          replacements: allEdits.length,
          rejects: allRejects.length,
          changedFiles,
          filesChanged: [...perFileEdits.keys()].map(relFromRoot),
          report: relFromRoot(reportPath),
        },
        null,
        2,
      ),
    );
  } else {
    console.log('MODE        ' + (opts.apply ? 'APPLY' : 'DRY-RUN'));
    console.log('DIRS        ' + opts.dirs.join(', '));
    console.log('EXCLUDES    ' + opts.excludes.join(', '));
    console.log('SCANNED     ' + files.length + ' file .tsx/.jsx');
    console.log('REPLACE     ' + allEdits.length + (opts.apply ? ' (đã ghi ' + changedFiles + ' file)' : ' (chưa ghi)'));
    console.log('REJECT      ' + allRejects.length + ' (không map được — xem report)');
  console.log('STAGE_B     ' + (opts.stageB ? 'BẬT (bảng hợp nhất màu §4)' : 'tắt (chỉ Stage A)'));
    console.log('REPORT      ' + relFromRoot(reportPath));
    const byToken = new Map();
    for (const e of allEdits) byToken.set(e.token, (byToken.get(e.token) || 0) + 1);
    for (const [t, c] of [...byToken.entries()].sort((a, b) => b[1] - a[1])) console.log('   ' + String(c).padStart(5) + '  ' + t);
  }
}

main();
