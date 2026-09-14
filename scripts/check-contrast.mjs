#!/usr/bin/env node
/**
 * WCAG 2.x contrast checker for VCUBE design tokens.
 *
 * Usage:
 *   node scripts/check-contrast.mjs            # human-readable table
 *   node scripts/check-contrast.mjs --json     # machine-readable output
 *
 * CỔNG BỔ SUNG (bịt lỗ hổng "xanh giả"): scripts/check-contrast-combos.mjs soi thẳng class trong .tsx
 * — sửa `className` quay lại tổ hợp đã fail thì cổng kia đỏ, vì bảng dưới đây chỉ là KHAI BÁO.
 *
 * Exit code 1 only when an UNEXPECTED pair fails. Pairs marked expectedFail are
 * documented in docs/design/tokens.md and docs/plans/01-theme-migration.md:
 *   - "decor"      : viền/đường trang trí — WCAG 1.4.11 miễn (không phải viền control)
 *   - "graphics"   : token chỉ dùng cho đồ hoạ/chữ lớn (sao đánh giá, >= 18px)
 *   - "remove"     : màu đã bị loại khỏi vai trò chữ, giữ lại để chứng minh lý do loại
 * They are reported as EXPECTED so this script can be used as a CI gate.
 *
 * Ratios: body text >= 4.5 (1.4.3 AA); large text >= 3.0; UI/non-text >= 3.0 (1.4.11 AA).
 *
 * Phạm vi: toàn bộ token LIGHT (01-theme-migration.md §3.1/§3.3) và token DARK (§5.1/§5.3).
 */

const PAIRS = [
  // label, fg, bg, required, kind, expectedFail, note
  ['LIGHT body text', '#091426', '#F8FAFC', 4.5, 'text', false, ''],
  ['LIGHT body on card', '#091426', '#FFFFFF', 4.5, 'text', false, ''],
  ['LIGHT muted text', '#545F73', '#F8FAFC', 4.5, 'text', false, 'token fg-muted'],
  ['LIGHT muted on card', '#545F73', '#FFFFFF', 4.5, 'text', false, ''],
  ['LIGHT subtle text', '#64748B', '#FFFFFF', 4.5, 'text', false, 'token fg-subtle'],
  ['LIGHT subtle on canvas', '#64748B', '#F8FAFC', 4.5, 'text', false, 'token fg-subtle'],
  ['LIGHT placeholder (current)', '#94A3B8', '#FFFFFF', 4.5, 'text', true, 'remove: replace by #64748B'],
  ['LIGHT placeholder on canvas (current)', '#94A3B8', '#F8FAFC', 4.5, 'text', true, 'remove: replace by #64748B'],
  ['LIGHT control border', '#8590A6', '#FFFFFF', 3.0, 'ui', false, 'token line-control'],
  ['LIGHT control border on canvas', '#8590A6', '#F8FAFC', 3.0, 'ui', false, ''],
  ['LIGHT decorative border', '#CBD5E1', '#F8FAFC', 3.0, 'ui', true, 'decor: exempt by 1.4.11'],
  ['LIGHT primary text', '#00687A', '#F8FAFC', 4.5, 'text', false, 'token primary'],
  ['LIGHT primary on card', '#00687A', '#FFFFFF', 4.5, 'text', false, ''],
  ['LIGHT white on primary', '#FFFFFF', '#00687A', 4.5, 'text', false, 'token primary-fg'],
  ['LIGHT white on primary hover', '#FFFFFF', '#005260', 4.5, 'text', false, ''],
  ['LIGHT danger text', '#B91C1C', '#FFFFFF', 4.5, 'text', false, ''],
  ['LIGHT warning text', '#B45309', '#FFFFFF', 4.5, 'text', false, ''],
  ['LIGHT success text', '#15803D', '#FFFFFF', 4.5, 'text', false, ''],
  ['LIGHT focus ring on canvas', '#00687A', '#F8FAFC', 3.0, 'ui', false, 'token ring'],
  ['LIGHT accent on dark panel', '#57DFFE', '#091426', 4.5, 'text', false, 'token accent'],
  // --- A22c: bảng màu biểu đồ admin (12-ui-refactor-spec §2.6) ---
  ['LIGHT chart primary segment', '#00687A', '#FFFFFF', 3.0, 'ui', false, 'token primary — phân đoạn biểu đồ'],
  ['LIGHT chart info segment', '#1D4ED8', '#FFFFFF', 3.0, 'ui', false, 'token info'],
  ['LIGHT chart positive segment', '#15803D', '#FFFFFF', 3.0, 'ui', false, 'token positive'],
  ['LIGHT chart warning segment', '#B45309', '#FFFFFF', 3.0, 'ui', false, 'token warning'],
  ['LIGHT chart adjacent primary|positive', '#15803D', '#00687A', 3.0, 'ui', true, 'hai phân đoạn kề nhau < 3:1 — bù bằng nhãn chữ + chú thích (§2.6)'],
  ['DARK body text', '#E8EEF7', '#080D16', 4.5, 'text', false, ''],
  ['DARK body on card', '#E8EEF7', '#0E1520', 4.5, 'text', false, ''],
  ['DARK muted text', '#9BA9BE', '#0E1520', 4.5, 'text', false, 'token fg-muted'],
  ['DARK muted on canvas', '#9BA9BE', '#080D16', 4.5, 'text', false, ''],
  ['DARK subtle text', '#7A8798', '#0E1520', 4.5, 'text', false, 'token fg-subtle'],
  ['DARK primary text', '#3AB8CE', '#0E1520', 4.5, 'text', false, 'token primary'],
  ['DARK primary on canvas', '#3AB8CE', '#080D16', 4.5, 'text', false, ''],
  ['DARK fg on primary fill', '#07272E', '#3AB8CE', 4.5, 'text', false, 'token primary-fg'],
  ['DARK accent text', '#57DFFE', '#0E1520', 4.5, 'text', false, ''],
  ['DARK control border', '#4E6490', '#0E1520', 3.0, 'ui', false, 'token line-control'],
  ['DARK control border on canvas', '#4E6490', '#080D16', 3.0, 'ui', false, ''],
  ['DARK decorative border', '#28374D', '#0E1520', 3.0, 'ui', true, 'decor: exempt by 1.4.11'],
  ['DARK focus ring on card', '#57DFFE', '#0E1520', 3.0, 'ui', false, 'token ring'],
  ['DARK rejected text tone', '#6E7A8A', '#0E1520', 4.5, 'text', true, 'remove: do not use for text'],
  // --- A22c: bảng màu biểu đồ admin (12-ui-refactor-spec §2.6) ---
  ['DARK chart primary segment', '#3AB8CE', '#0E1520', 3.0, 'ui', false, 'token primary — phân đoạn biểu đồ'],
  ['DARK chart info segment', '#60A5FA', '#0E1520', 3.0, 'ui', false, 'token info'],
  ['DARK chart positive segment', '#4ADE80', '#0E1520', 3.0, 'ui', false, 'token positive'],
  ['DARK chart warning segment', '#FBBF24', '#0E1520', 3.0, 'ui', false, 'token warning'],
  ['DARK chart adjacent primary|positive', '#4ADE80', '#3AB8CE', 3.0, 'ui', true, 'hai phân đoạn kề nhau < 3:1 — bù bằng nhãn chữ + chú thích (§2.6)'],

  // --- A2a bổ sung: token LIGHT còn thiếu so với 01-theme-migration.md §3.1 ---
  ['LIGHT fg on surface-muted', '#091426', '#F8F9FF', 4.5, 'text', false, 'token fg on header strip'],
  ['LIGHT muted on surface-muted', '#545F73', '#F8F9FF', 4.5, 'text', false, 'token fg-muted'],
  ['LIGHT subtle on surface-muted', '#64748B', '#F8F9FF', 4.5, 'text', false, 'token fg-subtle'],
  ['LIGHT primary on surface-muted', '#00687A', '#F8F9FF', 4.5, 'text', false, 'token primary'],
  ['LIGHT on-inverse on panel', '#FFFFFF', '#091426', 4.5, 'text', false, 'token on-inverse / surface-inverse'],
  ['LIGHT accent on inverse-raised', '#57DFFE', '#1E293B', 4.5, 'text', false, 'token accent on surface-inverse-raised'],
  ['LIGHT success on canvas', '#15803D', '#F8FAFC', 4.5, 'text', false, 'token positive'],
  ['LIGHT warning on canvas', '#B45309', '#F8FAFC', 4.5, 'text', false, 'token warning'],
  ['LIGHT danger on canvas', '#B91C1C', '#F8FAFC', 4.5, 'text', false, 'token danger'],
  ['LIGHT info on card', '#1D4ED8', '#FFFFFF', 4.5, 'text', false, 'token info'],
  ['LIGHT rating graphic', '#D97706', '#FFFFFF', 3.0, 'ui', false, 'token warning-strong — sao/icon >=18px'],
  ['LIGHT rating as small text', '#D97706', '#FFFFFF', 4.5, 'text', true, 'graphics only: never for text < 18px'],
  ['LIGHT control border on muted', '#8590A6', '#F8F9FF', 3.0, 'ui', false, 'token line-control'],
  ['LIGHT focus ring on card', '#00687A', '#FFFFFF', 3.0, 'ui', false, 'token ring'],
  ['LIGHT hairline on card', '#E2E8F0', '#FFFFFF', 3.0, 'ui', true, 'decor: exempt by 1.4.11'],
  ['LIGHT separator on card', '#CBD5E1', '#FFFFFF', 3.0, 'ui', true, 'decor: exempt by 1.4.11'],

  // --- A2a bổ sung: token DARK so với 01-theme-migration.md §5.1/§5.3 ---
  ['DARK fg on surface-muted', '#E8EEF7', '#131C2A', 4.5, 'text', false, 'token fg on raised surface'],
  ['DARK fg on surface-raised', '#E8EEF7', '#1A2434', 4.5, 'text', false, 'token fg on popover surface'],
  ['DARK muted on surface-muted', '#9BA9BE', '#131C2A', 4.5, 'text', false, 'token fg-muted'],
  ['DARK subtle on canvas', '#7A8798', '#080D16', 4.5, 'text', false, 'token fg-subtle'],
  ['DARK subtle on surface-muted', '#7A8798', '#131C2A', 4.5, 'text', false, 'token fg-subtle'],
  ['DARK primary on surface-muted', '#3AB8CE', '#131C2A', 4.5, 'text', false, 'token primary'],
  ['DARK fg on primary hover fill', '#07272E', '#57DFFE', 4.5, 'text', false, 'token primary-fg on primary-hover'],
  ['DARK accent on card', '#57DFFE', '#0E1520', 4.5, 'text', false, 'token accent'],
  ['DARK on-inverse on panel', '#E8EEF7', '#131C2A', 4.5, 'text', false, 'token on-inverse (HUD hoà vào surface, §5.4)'],
  ['DARK success on card', '#4ADE80', '#0E1520', 4.5, 'text', false, 'token positive'],
  ['DARK warning on card', '#FBBF24', '#0E1520', 4.5, 'text', false, 'token warning'],
  ['DARK danger on card', '#F87171', '#0E1520', 4.5, 'text', false, 'token danger'],

  // --- A12 bo sung: bien the `danger` cua `Button` (nut pha huy, no #33) ---
  // `text-primary-fg` doi theo theme: light #FFFFFF tren #B91C1C, dark #07272E tren #F87171.
  ['LIGHT fg on danger fill', '#FFFFFF', '#B91C1C', 4.5, 'text', false, 'A12 Button variant=danger'],
  ['DARK fg on danger fill', '#07272E', '#F87171', 4.5, 'text', false, 'A12 Button variant=danger'],
  // hover:opacity-90 -> nut duoc composite 90% len surface cua theme tuong ung.
  ['LIGHT fg on danger fill hover', '#FFFFFF', '#C03333', 4.5, 'text', false, 'A12 danger hover:opacity-90 — bg composite 90% tren #FFFFFF'],
  ['DARK fg on danger fill hover', '#08252D', '#E16869', 4.5, 'text', false, 'A12 danger hover:opacity-90 — fg+bg composite 90% tren #0E1520'],
  // danger-ghost: hover:border-danger + hover:bg-surface-muted (khong dung alpha).
  ['LIGHT danger-ghost on surface-muted', '#B91C1C', '#F8F9FF', 4.5, 'text', false, 'A12 Button variant=danger-ghost hover'],
  ['DARK danger-ghost on surface-muted', '#F87171', '#131C2A', 4.5, 'text', false, 'A12 Button variant=danger-ghost hover'],
  ['DARK info on card', '#60A5FA', '#0E1520', 4.5, 'text', false, 'token info'],
  ['DARK rating graphic', '#FBBF24', '#0E1520', 3.0, 'ui', false, 'token warning-strong'],
  ['DARK focus ring on canvas', '#57DFFE', '#080D16', 3.0, 'ui', false, 'token ring'],
  ['DARK focus ring on muted', '#57DFFE', '#131C2A', 3.0, 'ui', false, 'token ring'],
  ['DARK separator on card', '#232F42', '#0E1520', 3.0, 'ui', true, 'decor: exempt by 1.4.11'],
  ['DARK hairline on card', '#1B2434', '#0E1520', 3.0, 'ui', true, 'decor: exempt by 1.4.11'],

  // --- A1-funnel bổ sung: 3 cặp FAIL THẬT trên DOM `/` (docs/plans/29-a1-funnel-audit.md §4.2 #1,#2,#3) ---
  // Đã sửa ở `src/frontend/components/MaterialComparisonMatrix.tsx`; đây là các cặp ĐANG DÙNG sau khi sửa.
  ['LIGHT muted on hairline', '#545F73', '#E2E8F0', 4.5, 'text', false, 'MaterialComparisonMatrix.tsx:157+171 — tab chưa chọn; fg-subtle cũ = 3.86 (fail) -> fg-muted = 5.22'],
  ['DARK muted on hairline', '#9BA9BE', '#1B2434', 4.5, 'text', false, 'MaterialComparisonMatrix.tsx:157+171 (dark) — fg-subtle cũ = 4.26 (fail) -> fg-muted = 6.53'],
  ['LIGHT muted on selected row', '#545F73', '#F2F7F8', 4.5, 'text', false, 'MaterialComparisonMatrix.tsx:204 + chữ :215/:224/:245/:253 — #F2F7F8 = bg-primary/5 composite 5% trên #FFFFFF; fg-subtle cũ = 4.40 (fail) -> fg-muted = 5.96'],
  ['DARK muted on selected row', '#9BA9BE', '#101D29', 4.5, 'text', false, 'MaterialComparisonMatrix.tsx:204 (dark) — #101D29 = bg-primary/5 composite 5% trên #0E1520'],
  ['LIGHT warning text on muted', '#B45309', '#F8F9FF', 4.5, 'text', false, 'cặp tổng quát vẫn hợp lệ; badge HDT ở MaterialComparisonMatrix.tsx ĐÃ quay lại bg-warning-tint sau D-1'],
  ['DARK warning text on muted', '#FBBF24', '#131C2A', 4.5, 'text', false, 'cặp tổng quát (dark)'],
  // --- D-1 (docs/plans/33-wave-log.md): `--color-warning-tint` #FBF0E4 -> #FEF6EC ---
  // Bản ghi `remove: 4.47` cũ ('không dùng text-warning trên bg-warning-tint') nay SAI: cặp đó ĐẠT
  // và ĐANG DÙNG (badge HDT ở MaterialComparisonMatrix.tsx) -> ghi lại thành cặp PASS được cưỡng chế.
  ['LIGHT warning text on warning tint', '#B45309', '#FEF6EC', 4.5, 'text', false, 'D-1 — 4.69:1 (trước là 4.47 = FAIL); badge HDT MaterialComparisonMatrix.tsx'],
  ['DARK warning text on warning tint', '#FBBF24', '#2A2114', 4.5, 'text', false, 'D-1 — dark KHÔNG đổi: 9.49:1'],
  // Làm nhạt nền KHÔNG cứu được `fg-subtle` (nhẹ hơn `warning`): 4.23 -> 4.44, vẫn FAIL.
  ['LIGHT subtle text on warning tint', '#64748B', '#FEF6EC', 4.5, 'text', true, 'remove: 4.44 — dùng text-fg-muted trên bg-warning-tint (luật fg-subtle-on-warning-tint của check-contrast-combos.mjs)'],
  // --- D-1b (cùng loại D-1, được duyệt trong wave này): `--color-positive-tint` #E7F3EC -> #F0F9F3 ---
  // `#15803D` trên #E7F3EC = 4.40 (FAIL, ~55 chỗ `bg-positive-tint text-positive`) -> 4.67 (ĐẠT).
  ['LIGHT positive text on positive tint', '#15803D', '#F0F9F3', 4.5, 'text', false, 'D-1b — 4.67:1 (trước là 4.40 = FAIL); sửa ở token nên ~55 chỗ cùng đạt'],
  ['DARK positive text on positive tint', '#4ADE80', '#10241A', 4.5, 'text', false, 'D-1b — dark KHÔNG đổi: 9.35:1'],
  // Cùng lý do: làm nhạt nền không cứu `fg-subtle`: 4.18 -> 4.43 (light), 4.46 (dark), vẫn FAIL.
  ['LIGHT subtle text on positive tint', '#64748B', '#F0F9F3', 4.5, 'text', true, 'remove: 4.43 — dùng text-fg-muted trên bg-positive-tint'],
  ['DARK subtle text on positive tint', '#7A8798', '#10241A', 4.5, 'text', true, 'remove: 4.46 — dùng text-fg-muted trên bg-positive-tint (dark)'],
  // Các cặp ĐÃ BỊ LOẠI khỏi vai trò chữ — giữ lại để chứng minh lý do loại (như #94A3B8 / #6E7A8A ở trên).
  // Đo trên DOM thật (5 route × 3 bề rộng × 2 theme): 12 text node fail ở light + 4 ở dark, TẤT CẢ từ 3 cặp dưới.
  ['LIGHT subtle text on hairline', '#64748B', '#E2E8F0', 4.5, 'text', true, 'remove: 3.86 — không dùng fg-subtle trên nền line-subtle (dải tab)'],
  ['DARK subtle text on hairline', '#7A8798', '#1B2434', 4.5, 'text', true, 'remove: 4.26 — không dùng fg-subtle trên nền line-subtle (dải tab)'],
  ['LIGHT subtle on selected row', '#64748B', '#F2F7F8', 4.5, 'text', true, 'remove: 4.40 — không dùng fg-subtle trên hàng bg-primary/5'],
];

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function checkPairs(pairs = PAIRS) {
  return pairs.map(([label, fg, bg, required, kind, expectedFail, note]) => {
    const ratio = contrastRatio(fg, bg);
    const pass = ratio >= required;
    return {
      label,
      fg,
      bg,
      kind,
      required,
      ratio: Math.round(ratio * 100) / 100,
      pass,
      expectedFail: Boolean(expectedFail),
      status: pass ? 'PASS' : expectedFail ? 'EXPECTED' : 'FAIL',
      note: note || '',
    };
  });
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('check-contrast.mjs');

if (isMain) {
  const results = checkPairs();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log(pad('PAIR', 36) + pad('FG', 9) + pad('BG', 9) + pad('RATIO', 8) + pad('MIN', 6) + 'RESULT');
    console.log('-'.repeat(80));
    for (const r of results) {
      console.log(
        pad(r.label, 36) +
          pad(r.fg, 9) +
          pad(r.bg, 9) +
          pad(r.ratio.toFixed(2), 8) +
          pad(r.required.toFixed(1), 6) +
          r.status
      );
    }
    const pass = results.filter((r) => r.pass).length;
    const expected = results.filter((r) => !r.pass && r.expectedFail);
    const failed = results.filter((r) => !r.pass && !r.expectedFail);
    console.log('-'.repeat(80));
    console.log(pass + '/' + results.length + ' pass, ' + expected.length + ' expected non-pass, ' + failed.length + ' unexpected fail');
    if (expected.length) {
      console.log('');
      console.log('Expected non-pass (documented in docs/design/tokens.md):');
      for (const r of expected) {
        console.log('  - ' + r.label + ' (' + r.ratio.toFixed(2) + '): ' + r.note);
      }
    }
    if (failed.length) {
      console.log('');
      console.log('UNEXPECTED failures:');
      for (const r of failed) {
        console.log('  - ' + r.label + ': ' + r.ratio.toFixed(2) + ' < ' + r.required + ' (' + r.fg + ' on ' + r.bg + ')');
      }
    }
  }
  const unexpected = checkPairs().filter((r) => !r.pass && !r.expectedFail);
  process.exit(unexpected.length ? 1 : 0);
}
