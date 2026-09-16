#!/usr/bin/env node
/**
 * check-icon-names.mjs — chặn glyph KHÔNG có trong `iconMap` (nguyên nhân gốc của "icon lỗi").
 *
 * VÌ SAO: `Icon.name` là `string`, và khi thiếu glyph thì `Icon.tsx` render `FALLBACK_ICON` +
 * chỉ `console.warn` ở DEV ⇒ production im lặng, lỗi chỉ hiện ra khi nhìn màn hình. Đã có
 * thật: `flight`, `grid_3x3`, `lightbulb` chưa từng được map nên render dấu "?".
 *
 * Cách kiểm:
 *  1. Đọc khoá của `export const iconMap` trong `src/frontend/ui/iconMap.ts`.
 *  2. Quét mọi `<Icon ... name=...>` (chuỗi tĩnh hoặc nhánh ternary chuỗi) trong `src/**`.
 *  3. Quét field dữ liệu dạng `icon:` / `iconName:` / `glyph:` gán chuỗi.
 *  4. Bất kỳ tên nào không có trong iconMap ⇒ FAIL (exit 1), in file:line.
 *
 * Bỏ qua chính `iconMap.ts`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const ICON_MAP_PATH = join(ROOT, 'src/frontend/ui/iconMap.ts');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function readIconKeys() {
  const src = readFileSync(ICON_MAP_PATH, 'utf8');
  const keys = new Set();
  const mapStart = src.indexOf('export const iconMap');
  if (mapStart === -1) {
    console.error('check-icon-names: không tìm thấy `export const iconMap` trong iconMap.ts');
    process.exit(2);
  }
  const body = src.slice(mapStart);
  // Khoá có thể viết dạng `'glyph_name': Component,` hoặc `glyph_name: ComposedIcon,`.
  const quoted = /^\s*'([a-z0-9_]+)'\s*:/gm;
  const bare = /^\s*([a-z][a-z0-9_]*)\s*:\s*[A-Z]\w*/gm;
  let m;
  while ((m = quoted.exec(body)) !== null) keys.add(m[1]);
  while ((m = bare.exec(body)) !== null) keys.add(m[1]);
  return keys;
}

const keys = readIconKeys();
const files = walk(join(ROOT, 'src')).filter((f) => f !== ICON_MAP_PATH);

const ICON_TAG_RE = /<Icon\b[^>]*?>/gs;
const NAME_ATTR_RE = /name=(\{[^}]*\}|"[^"]*"|'[^']*')/g;
const STRING_LITERAL_RE = /['"]([a-z][a-z0-9_]*)['"]/g;
const DATA_FIELD_RE = /(?:icon|iconName|glyph)\s*[:=]\s*['"]([a-z][a-z0-9_]*)['"]/g;

/** Bỏ qua literal là VẾ SO SÁNH (`=== 'x'`, `!== 'x'`) — không phải tên glyph. */
function isComparisonOperand(text, start, end) {
  const before = text.slice(Math.max(0, start - 6), start);
  const after = text.slice(end, end + 6);
  return /[=!]==?\s*$/.test(before) || /^\s*[=!]==?/.test(after);
}

const violations = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');

  const lineOf = (index) => text.slice(0, index).split('\n').length;

  // 1. <Icon name=...>
  let tag;
  while ((tag = ICON_TAG_RE.exec(text)) !== null) {
    const tagText = tag[0];
    let attr;
    NAME_ATTR_RE.lastIndex = 0;
    while ((attr = NAME_ATTR_RE.exec(tagText)) !== null) {
      const value = attr[1];
      let str;
      STRING_LITERAL_RE.lastIndex = 0;
      while ((str = STRING_LITERAL_RE.exec(value)) !== null) {
        const name = str[1];
        if (isComparisonOperand(value, str.index, str.index + str[0].length)) continue;
        if (!keys.has(name)) {
          violations.push({ file, line: lineOf(tag.index), name });
        }
      }
    }
  }

  // 2. Field dữ liệu icon:/iconName:/glyph:
  let field;
  DATA_FIELD_RE.lastIndex = 0;
  while ((field = DATA_FIELD_RE.exec(text)) !== null) {
    const name = field[1];
    if (!keys.has(name)) {
      violations.push({ file, line: lineOf(field.index), name });
    }
  }
}

if (violations.length > 0) {
  console.error('check-icon-names: FAIL — glyph không có trong iconMap (sẽ render FALLBACK_ICON):\n');
  for (const v of violations) {
    console.error(`  ${relative(ROOT, v.file).split(sep).join('/')}:${v.line}  name="${v.name}"`);
  }
  console.error(`\nTổng: ${violations.length} điểm. Thêm glyph vào src/frontend/ui/iconMap.ts (và docs/design/icon-map.md).`);
  process.exit(1);
}

console.log(`check-icon-names: PASS — ${files.length} file, mọi glyph đều có trong iconMap (${keys.size} glyph).`);
