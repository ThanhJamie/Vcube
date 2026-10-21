#!/usr/bin/env node
/**
 * T27 — SINH `docs/pages/_routes.generated.md` từ khối `<Routes>…</Routes>`.
 *
 * NGUỒN SỰ THẬT (cập nhật Phase 4d, 2026-10-21): route table đã tách khỏi `src/App.tsx`
 * sang `src/frontend/routes/AppRoutes.tsx`. Script đọc file MỚI trước, chỉ fallback về
 * `src/App.tsx` nếu file mới chưa có / chưa chứa `<Routes>` (tương thích ngược).
 *
 * Vì sao cần script: bảng route trong docs bị chép tay nên lệch code (IDX-05/IDX-07,
 * DS-02, NEW-04). Script parse và sinh bảng `Path | Component/Element | Guard | Redirect?`.
 *
 * Cách parse (không thêm dependency — chỉ đọc chuỗi):
 *   1. Cắt vùng giữa `<Routes>` và `</Routes>`.
 *   2. Quét từng `<Route …>`; tìm `>` kết thúc thẻ mở bằng bộ đếm ngoặc `{}` + trạng
 *      thái chuỗi (bỏ qua `>` nằm trong `{…}` hoặc trong nháy).
 *   3. Lấy `path` và `element` bằng regex có neo; `element` có thể là JSX inline hoặc
 *      tên hằng JSX (`labRouteElement`) — hằng được phân giải qua bản đồ `const X = (<…>)`.
 *   4. Phân loại: `<Navigate …>` = redirect (đọc `to`/`replace`); ngược lại bóc wrapper
 *      `<ProtectedRoute>` / `<RoleGuard allowedRoles={[…]} …>` để lấy guard + chuỗi
 *      component lồng nhau (`Shell > View`).
 *
 * Đầu ra ỔN ĐỊNH (chạy 2 lần ⇒ byte-identical): thứ tự theo nguồn, mọi truy vấn/đọc
 * đều tất định; header có `routes: N` + `source-sha256` (12 hex) — **không có ngày**.
 *
 * Dùng: node scripts/gen-routes-doc.mjs
 * RC: 0 = OK · 1 = không tìm thấy khối Routes, hoặc parse ra 0 route (không ghi file).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Thứ tự ưu tiên: route table hiện tại (Phase 4d) → file cũ (tương thích ngược). */
const SOURCE_CANDIDATES = ['src/frontend/routes/AppRoutes.tsx', 'src/App.tsx'];
const OUT_FILE = 'docs/pages/_routes.generated.md';

/** Chọn nguồn đầu tiên tồn tại VÀ có khối `<Routes>`; null nếu không có. */
function resolveSource() {
  for (const rel of SOURCE_CANDIDATES) {
    let text;
    try {
      text = readFileSync(resolve(root, rel), 'utf8');
    } catch {
      continue;
    }
    if (text.includes('<Routes>') && text.includes('</Routes>')) {
      return { rel, text };
    }
  }
  return null;
}

const resolved = resolveSource();
if (!resolved) {
  console.error(
    `FAIL: không tìm thấy khối <Routes>…</Routes> trong bất kỳ nguồn nào: ${SOURCE_CANDIDATES.join(', ')}.`,
  );
  process.exit(1);
}
const SRC_FILE = resolved.rel;
const src = resolved.text;

/** Bỏ qua chuỗi `'…'`, `"…"`, `` `…` `` (có `\` escape). Trả về index ký tự nháy đóng. */
function skipString(text, start) {
  const quote = text[start];
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === quote) return i;
    i++;
  }
  return text.length - 1;
}

/**
 * Từ ký tự mở `{`/`(`/`[` tại `openIndex`, trả về index của ký tự đóng cân bằng.
 * Bỏ qua chuỗi và ngoặc lồng nhau. `-1` nếu không cân bằng.
 */
function skipBalanced(text, openIndex, open = '{', close = '}') {
  let depth = 0;
  let i = openIndex;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipString(text, i) + 1;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/** Tìm index `>` kết thúc một thẻ mở JSX bắt đầu tại `start` (đã ở `<`). */
function endOfOpeningTag(text, start) {
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipString(text, i) + 1;
      continue;
    }
    if (ch === '{') {
      const end = skipBalanced(text, i);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (ch === '>') return i;
    i++;
  }
  return -1;
}

/** Giá trị attr dạng chuỗi: `name="x"`, `name='x'`, `name={'x'}`. */
function attrString(text, name) {
  const patterns = [
    new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`),
    new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`),
    new RegExp(`\\b${name}\\s*=\\s*\\{\\s*'([^']*)'\\s*\\}`),
    new RegExp(`\\b${name}\\s*=\\s*\\{\\s*"([^"]*)"\\s*\\}`),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Giá trị attr dạng biểu thức `{…}` (trả nội dung trong ngoặc) hoặc chuỗi. */
function attrExpr(text, name) {
  const m = text.match(new RegExp(`\\b${name}\\s*=\\s*`));
  if (!m) return null;
  const i = m.index + m[0].length;
  const ch = text[i];
  if (ch === '{') {
    const end = skipBalanced(text, i);
    return end === -1 ? null : text.slice(i + 1, end);
  }
  if (ch === '"' || ch === "'") return text.slice(i + 1, skipString(text, i));
  return null;
}

/** Bản đồ `const <tên> = (<JSX…>)` → nội dung JSX (phân giải `element={labRouteElement}`). */
function collectJsxConsts(text) {
  const map = new Map();
  const re = /const\s+([A-Za-z_$][\w$]*)\s*=\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const paren = text.indexOf('(', m.index);
    const end = skipBalanced(text, paren, '(', ')');
    if (end === -1) continue;
    const inner = text.slice(paren + 1, end).trim();
    if (inner.startsWith('<')) map.set(m[1], inner);
    re.lastIndex = end;
  }
  return map;
}

/** Bóc một cặp thẻ `<name …>`/`</name>` (không đụng nội dung bên trong). */
function stripTag(text, name) {
  let out = text;
  for (let guard = 0; guard < 20; guard++) {
    const open = out.indexOf(`<${name}`);
    if (open === -1) break;
    const end = endOfOpeningTag(out, open);
    if (end === -1) break;
    out = out.slice(0, open) + out.slice(end + 1);
    const close = out.indexOf(`</${name}>`);
    if (close !== -1) out = out.slice(0, close) + out.slice(close + name.length + 3);
  }
  return out;
}

/** Guard của route: `—` · `ProtectedRoute (…)` · `RoleGuard: a, b`. */
function parseGuard(element) {
  if (/<ProtectedRoute\b/.test(element)) return 'ProtectedRoute (yêu cầu đăng nhập)';
  if (!/<RoleGuard\b/.test(element)) return '—';
  const block = element.match(/allowedRoles\s*=\s*\{([^}]*)\}/);
  const roles = block
    ? [...block[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] ?? m[2])
    : [];
  return roles.length ? `RoleGuard: ${roles.join(', ')}` : 'RoleGuard';
}

/** Chuỗi component trong element sau khi bóc guard: `DesignerDashboardShell > DesignerDashboardView`. */
function parseComponents(element) {
  const bare = stripTag(stripTag(element, 'ProtectedRoute'), 'RoleGuard');
  const names = [...bare.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
  return [...new Set(names)].join(' > ') || '—';
}

const start = src.indexOf('<Routes>');
const end = src.indexOf('</Routes>');
if (start === -1 || end === -1 || end < start) {
  console.error(`FAIL: không tìm thấy khối <Routes>…</Routes> trong ${SRC_FILE}.`);
  process.exit(1);
}
const region = src.slice(start, end);
const jsxConsts = collectJsxConsts(src);

const routes = [];
const ROUTE_RE = /<Route\b/g;
let match;
while ((match = ROUTE_RE.exec(region)) !== null) {
  const tagStart = match.index;
  const openEnd = endOfOpeningTag(region, tagStart);
  if (openEnd === -1) continue;
  const opening = region.slice(tagStart, openEnd + 1);
  const selfClosing = /\/\s*>$/.test(opening);
  if (!selfClosing) {
    const close = region.indexOf('</Route>', openEnd);
    ROUTE_RE.lastIndex = close === -1 ? openEnd + 1 : close + '</Route>'.length;
  }

  const path = attrString(opening, 'path');
  if (path === null) continue;

  let element = attrExpr(opening, 'element') ?? '';
  const ident = element.trim().match(/^[A-Za-z_$][\w$]*$/);
  if (ident && jsxConsts.has(ident[0])) element = jsxConsts.get(ident[0]);

  const isRedirect = /<Navigate\b/.test(element);
  const to = isRedirect ? attrString(element, 'to') : null;
  const replace = isRedirect && /\breplace\b/.test(element);

  routes.push({
    path,
    component: isRedirect ? 'Navigate' : parseComponents(element),
    guard: isRedirect ? '—' : parseGuard(element),
    redirect: isRedirect ? `→ ${to ?? '?'}${replace ? ' (replace)' : ''}` : '—',
  });
}

console.log(`Đã parse ${routes.length} route từ ${SRC_FILE}.`);
if (routes.length === 0) {
  console.error(`FAIL: parse ra 0 route — không ghi file. Kiểm tra cú pháp <Route …> trong ${SRC_FILE}.`);
  process.exit(1);
}

const hash = createHash('sha256').update(src).digest('hex').slice(0, 12);
const cell = (v) => v.replace(/\|/g, '\\|');

const out = [
  `<!-- AUTO-GENERATED — đừng sửa tay · routes: ${routes.length} · source: ${SRC_FILE} · source-sha256: ${hash} -->`,
  '',
  '# Bảng route (sinh tự động)',
  '',
  `> Sinh bởi \`scripts/gen-routes-doc.mjs\` từ \`${SRC_FILE}\` — **đừng sửa tay**.`,
  `> Sửa route trong \`${SRC_FILE}\` rồi chạy lại: \`node scripts/gen-routes-doc.mjs\`.`,
  `> routes: **${routes.length}** · source: \`${SRC_FILE}\` · source-sha256: \`${hash}\` (output ổn định, không kèm ngày).`,
  '',
  '| Path | Component/Element | Guard | Redirect? |',
  '|---|---|---|---|',
  ...routes.map((r) => `| \`${cell(r.path)}\` | ${cell(r.component)} | ${cell(r.guard)} | ${cell(r.redirect)} |`),
  '',
].join('\n');

writeFileSync(resolve(root, OUT_FILE), out, 'utf8');
console.log(`Đã ghi ${OUT_FILE} — ${routes.length} route, source-sha256 ${hash}.`);
