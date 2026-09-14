#!/usr/bin/env node
/**
 * Bằng chứng "0 pixel đổi" cho Stage A (docs/plans/01-theme-migration.md §3.4):
 * trích tập giá trị màu `#rgb` / `#rrggbb` từ HAI file CSS (bản build trước và sau)
 * rồi so sánh tập hợp.
 *
 * Usage:
 *   node scripts/verify-tokens-unchanged.mjs <before.css> <after.css> [--allow-added] [--json]
 *
 * Exit code:
 *   0  tập màu không đổi, HOẶC chỉ THÊM màu mới khi có --allow-added
 *   1  có màu bị MẤT (mọi trường hợp), hoặc có màu mới mà không cho phép
 *
 * Vì sao: token hoá Stage A chỉ được đổi CÁCH VIẾT (`#F8FAFC` -> `var(--color-canvas)`),
 * tuyệt đối không được làm mất giá trị màu nào. Thêm token dark mới là thay đổi có
 * chủ đích -> chạy `--allow-added` và đọc kỹ danh sách ADDED in ra.
 *
 * Ví dụ:
 *   node scripts/verify-tokens-unchanged.mjs /tmp/css-truoc.css /tmp/css-sau.css --allow-added
 */

import { readFileSync } from 'node:fs';

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;

/** Chuẩn hoá `#abc` -> `#aabbcc`; bỏ qua mã 4/8 ký tự (có alpha) vì app không dùng. */
function normalizeHex(raw) {
  const hex = raw.replace('#', '').toLowerCase();
  if (hex.length === 3) {
    return '#' + hex.split('').map((c) => c + c).join('');
  }
  if (hex.length === 6) return '#' + hex;
  return null;
}

/** @returns {Set<string>} tập màu đã chuẩn hoá trong nội dung CSS */
export function extractColorSet(css) {
  const set = new Set();
  const matches = String(css).match(HEX_PATTERN) || [];
  for (const match of matches) {
    const normalized = normalizeHex(match);
    if (normalized) set.add(normalized);
  }
  return set;
}

/** @returns {{ added: string[], removed: string[], before: number, after: number }} */
export function diffColorSets(beforeSet, afterSet) {
  const added = [...afterSet].filter((c) => !beforeSet.has(c)).sort();
  const removed = [...beforeSet].filter((c) => !afterSet.has(c)).sort();
  return { added, removed, before: beforeSet.size, after: afterSet.size };
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('verify-tokens-unchanged.mjs');

if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const allowAdded = args.includes('--allow-added');
  const files = args.filter((a) => !a.startsWith('--'));

  if (files.length !== 2) {
    console.error('Usage: node scripts/verify-tokens-unchanged.mjs <before.css> <after.css> [--allow-added] [--json]');
    process.exit(2);
  }

  let beforeCss;
  let afterCss;
  try {
    beforeCss = readFileSync(files[0], 'utf8');
    afterCss = readFileSync(files[1], 'utf8');
  } catch (error) {
    console.error('Không đọc được file CSS: ' + (error && error.message ? error.message : String(error)));
    process.exit(2);
  }

  const beforeSet = extractColorSet(beforeCss);
  const afterSet = extractColorSet(afterCss);
  const { added, removed } = diffColorSets(beforeSet, afterSet);

  const missing = removed.length > 0;
  const unexpectedAdded = added.length > 0 && !allowAdded;
  const ok = !missing && !unexpectedAdded;

  if (json) {
    console.log(
      JSON.stringify(
        {
          before: { file: files[0], colors: beforeSet.size },
          after: { file: files[1], colors: afterSet.size },
          added,
          removed,
          allowAdded,
          ok,
        },
        null,
        2,
      ),
    );
  } else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log(pad('BEFORE', 8) + files[0] + '  (' + beforeSet.size + ' màu)');
    console.log(pad('AFTER', 8) + files[1] + '  (' + afterSet.size + ' màu)');
    console.log(pad('MODE', 8) + (allowAdded ? '--allow-added (cho phép thêm token mới)' : 'strict (tập màu phải giống hệt)'));
    console.log('-'.repeat(80));
    console.log('ADDED   (' + added.length + ')');
    for (const color of added.slice(0, 60)) console.log('  + ' + color);
    if (added.length > 60) console.log('  ... và ' + (added.length - 60) + ' màu nữa');
    console.log('REMOVED (' + removed.length + ')');
    for (const color of removed.slice(0, 60)) console.log('  - ' + color);
    if (removed.length > 60) console.log('  ... và ' + (removed.length - 60) + ' màu nữa');
    console.log('-'.repeat(80));
    if (missing) {
      console.log('FAIL: ' + removed.length + ' màu bị MẤT so với bản trước — token hoá làm đổi pixel.');
    } else if (unexpectedAdded) {
      console.log('FAIL: có ' + added.length + ' màu mới (chạy lại với --allow-added nếu là token dark cố ý thêm).');
    } else {
      console.log('OK: không màu nào bị mất' + (added.length ? ' (chỉ thêm ' + added.length + ' màu token mới)' : '') + '.');
    }
  }

  process.exit(ok ? 0 : 1);
}
