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
 * documented in docs/tasks/ui-redesign/DESIGN-LANGUAGE.md:
 *   - "decor"      : viền/đường trang trí — WCAG 1.4.11 miễn (không phải viền control)
 *   - "graphics"   : token chỉ dùng cho đồ hoạ/chữ lớn (sao đánh giá, >= 18px)
 *   - "remove"     : màu đã bị loại khỏi vai trò chữ, giữ lại để chứng minh lý do loại
 * They are reported as EXPECTED so this script can be used as a CI gate.
 *
 * Ratios: body text >= 4.5 (1.4.3 AA); large text >= 3.0; UI/non-text >= 3.0 (1.4.11 AA).
 *
 * Phạm vi: toàn bộ token LIGHT của palette v3 "Soft Studio"
 * (docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md). Tier CHROME tối đã bị xoá nên không
 * còn cặp CHROME nào; app light-only nên không còn cặp DARK.
 *
 * v3 (2026-10-20) đổi canvas -> #F6F7EF, surface -> #FFFDF9, surface-muted -> #F5F3EA,
 * line -> #E7E3D6, line-subtle -> #F0EDE3; thêm brand coral #E8624A (CHỈ brand mark) và
 * 4 tile pastel. Mọi con số dưới đây đo lại trên palette mới.
 */

const PAIRS = [
  // label, fg, bg, required, kind, expectedFail, note
  // --- v3 Soft Studio: chữ trên bề mặt ---
  ['LIGHT body text', '#1C1917', '#F6F7EF', 4.5, 'text', false, 'token fg on canvas (16.21)'],
  ['LIGHT body on card', '#1C1917', '#FFFDF9', 4.5, 'text', false, 'token fg on surface (17.21)'],
  ['LIGHT fg on surface-muted', '#1C1917', '#F5F4EC', 4.5, 'text', false, '15.85'],
  ['LIGHT muted text', '#57534E', '#F6F7EF', 4.5, 'text', false, 'token fg-muted (7.07)'],
  ['LIGHT muted on card', '#57534E', '#FFFDF9', 4.5, 'text', false, '7.51'],
  ['LIGHT muted on surface-muted', '#57534E', '#F5F4EC', 4.5, 'text', false, '6.92'],
  ['LIGHT subtle text', '#746E68', '#FFFDF9', 4.5, 'text', false, 'token fg-subtle (4.95)'],
  ['LIGHT subtle on canvas', '#746E68', '#F6F7EF', 4.5, 'text', false, 'token fg-subtle (4.67)'],
  ['LIGHT subtle on surface-muted', '#746E68', '#F5F4EC', 4.5, 'text', false, 'token fg-subtle trên muted (4.56)'],

  // --- Viền & focus ---
  ['LIGHT control border', '#8A8078', '#FFFDF9', 3.0, 'ui', false, 'token line-control (3.80)'],
  ['LIGHT control border on canvas', '#8A8078', '#F6F7EF', 3.0, 'ui', false, 'token line-control (3.58)'],
  ['LIGHT control border on muted', '#8A8078', '#F5F4EC', 3.0, 'ui', false, 'token line-control (3.50)'],
  ['LIGHT decorative border', '#E7E3D6', '#F6F7EF', 3.0, 'ui', true, 'decor: exempt by 1.4.11 (1.19)'],
  ['LIGHT hairline on card', '#F0EDE3', '#FFFDF9', 3.0, 'ui', true, 'decor: exempt by 1.4.11 (1.15)'],
  ['LIGHT separator on card', '#E7E3D6', '#FFFDF9', 3.0, 'ui', true, 'decor: exempt by 1.4.11 (1.26)'],
  ['LIGHT focus ring on canvas', '#1C1917', '#F6F7EF', 3.0, 'ui', false, 'token ring (16.21)'],
  ['LIGHT focus ring on card', '#1C1917', '#FFFDF9', 3.0, 'ui', false, 'token ring (17.21)'],

  // --- Primary (đen đá — D-1/D3) ---
  ['LIGHT primary text', '#1C1917', '#F6F7EF', 4.5, 'text', false, 'token primary on canvas (16.21)'],
  ['LIGHT primary on card', '#1C1917', '#FFFDF9', 4.5, 'text', false, 'token primary (17.21)'],
  ['LIGHT primary on surface-muted', '#1C1917', '#F5F4EC', 4.5, 'text', false, 'token primary (15.85)'],
  ['LIGHT primary-fg on primary', '#FFFFFF', '#1C1917', 4.5, 'text', false, 'token primary-fg (17.49)'],
  ['LIGHT primary-fg on primary hover', '#FFFFFF', '#292524', 4.5, 'text', false, 'hover (15.17)'],

  // --- Trạng thái ---
  ['LIGHT danger text', '#BE123C', '#FFFDF9', 4.5, 'text', false, 'token danger (6.19)'],
  ['LIGHT danger on canvas', '#BE123C', '#F6F7EF', 4.5, 'text', false, 'token danger (5.83)'],
  ['LIGHT warning text', '#B45309', '#FFFDF9', 4.5, 'text', false, 'token warning (4.94)'],
  ['LIGHT warning on canvas', '#B45309', '#F6F7EF', 4.5, 'text', false, 'token warning (4.66)'],
  ['LIGHT success text', '#047857', '#FFFDF9', 4.5, 'text', false, 'token positive (5.40)'],
  ['LIGHT success on canvas', '#047857', '#F6F7EF', 4.5, 'text', false, 'token positive (5.08)'],
  ['LIGHT info on card', '#00687A', '#FFFDF9', 4.5, 'text', false, 'token info — teal giữ cho info (6.34)'],
  ['LIGHT rating graphic', '#D97706', '#FFFDF9', 3.0, 'ui', false, 'token warning-strong — sao/icon >=18px (3.14)'],
  ['LIGHT rating as small text', '#D97706', '#FFFDF9', 4.5, 'text', true, 'graphics only: never for text < 18px'],

  // --- Tint: nền tint + chữ đặc (DESIGN-LANGUAGE-v3 §1.3) ---
  ['LIGHT primary on primary tint', '#1C1917', '#F0EFEB', 4.5, 'text', false, '15.20'],
  ['LIGHT positive on positive tint', '#047857', '#ECFDF5', 4.5, 'text', false, '5.21'],
  ['LIGHT warning on warning tint', '#B45309', '#FFFBEB', 4.5, 'text', false, '4.84'],
  ['LIGHT danger on danger tint', '#BE123C', '#FFF1F2', 4.5, 'text', false, '5.72'],
  ['LIGHT info on info tint', '#00687A', '#E6F0F2', 4.5, 'text', false, '5.55'],
  ['LIGHT subtle on positive tint', '#746E68', '#ECFDF5', 4.5, 'text', false, '4.78 — ĐẠT, dùng được'],
  ['LIGHT subtle on warning tint', '#746E68', '#FFFBEB', 4.5, 'text', false, '4.85 — ĐẠT, dùng được'],
  ['LIGHT subtle on danger tint', '#746E68', '#FFF1F2', 4.5, 'text', false, '4.58 — ĐẠT, dùng được'],
  ['LIGHT subtle on primary tint', '#746E68', '#F0EFEB', 4.5, 'text', true, 'remove: 4.37 — dùng text-fg-muted'],
  ['LIGHT subtle on info tint', '#746E68', '#E6F0F2', 4.5, 'text', true, 'remove: 4.34 — dùng text-fg-muted'],
  ['LIGHT subtle on line-subtle', '#746E68', '#F0EDE3', 4.5, 'text', true, 'remove: 4.30 — không dùng fg-subtle trên nền line-subtle'],

  // --- Surface-muted / hairline ---
  ['LIGHT muted on hairline', '#57534E', '#F0EDE3', 4.5, 'text', false, 'tab chưa chọn — fg-muted (6.51)'],
  ['LIGHT warning text on muted', '#B45309', '#F5F4EC', 4.5, 'text', false, 'badge HDT — 4.55 (sát ngưỡng, không hạ bg nữa)'],

  // --- Brand coral (D3: CHỈ brand mark, không CTA/không chữ trên nền sáng) ---
  ['LIGHT fg on brand mark', '#1C1917', '#E8624A', 4.5, 'text', false, 'chữ V trên ô logo coral (5.23)'],
  ['LIGHT brand as text on surface', '#E8624A', '#FFFDF9', 4.5, 'text', true, 'remove: 3.29 — coral chỉ đồ hoạ/brand mark, không làm chữ'],
  ['LIGHT brand as text on canvas', '#E8624A', '#F6F7EF', 4.5, 'text', true, 'remove: 3.10 — coral chỉ đồ hoạ/brand mark, không làm chữ'],
  ['LIGHT white on brand mark', '#FFFFFF', '#E8624A', 4.5, 'text', true, 'remove: 3.35 — không bao giờ dùng chữ trắng trên coral'],

  // --- Tile pastel (v3): nền trang trí category tile ---
  ['LIGHT fg on tile mint', '#1C1917', '#E7F1E4', 4.5, 'text', false, '15.07'],
  ['LIGHT fg on tile lilac', '#1C1917', '#EFEBF8', 4.5, 'text', false, '14.91'],
  ['LIGHT fg on tile rose', '#1C1917', '#FCEBE5', 4.5, 'text', false, '15.12'],
  ['LIGHT fg on tile amber', '#1C1917', '#FAF0DA', 4.5, 'text', false, '15.44'],
  ['LIGHT muted on tile mint', '#57534E', '#E7F1E4', 4.5, 'text', false, '6.58'],
  ['LIGHT muted on tile lilac', '#57534E', '#EFEBF8', 4.5, 'text', false, '6.51'],
  ['LIGHT muted on tile rose', '#57534E', '#FCEBE5', 4.5, 'text', false, '6.60'],
  ['LIGHT muted on tile amber', '#57534E', '#FAF0DA', 4.5, 'text', false, '6.74'],
  ['LIGHT subtle on tile mint', '#746E68', '#E7F1E4', 4.5, 'text', true, 'remove: 4.34 — trên pastel luôn dùng fg/fg-muted'],
  ['LIGHT subtle on tile lilac', '#746E68', '#EFEBF8', 4.5, 'text', true, 'remove: 4.29 — trên pastel luôn dùng fg/fg-muted'],
  ['LIGHT subtle on tile rose', '#746E68', '#FCEBE5', 4.5, 'text', true, 'remove: 4.35 — trên pastel luôn dùng fg/fg-muted'],
  ['LIGHT subtle on tile amber', '#746E68', '#FAF0DA', 4.5, 'text', true, 'remove: 4.44 — trên pastel luôn dùng fg/fg-muted'],

  // --- Inverse panel (panel tối giữa trang sáng, giữ nguyên v3) ---
  ['LIGHT on-inverse on panel', '#FAFAF9', '#1C1917', 4.5, 'text', false, 'token on-inverse / surface-inverse (16.74)'],
  ['LIGHT accent on inverse panel', '#57DFFE', '#1C1917', 4.5, 'text', false, 'token accent (11.15)'],
  ['LIGHT accent on inverse-raised', '#57DFFE', '#292524', 4.5, 'text', false, 'token accent (9.67)'],

  // --- Button danger ---
  ['LIGHT fg on danger fill', '#FFFFFF', '#BE123C', 4.5, 'text', false, 'Button variant=danger (6.29)'],
  ['LIGHT danger-ghost on surface-muted', '#BE123C', '#F5F4EC', 4.5, 'text', false, 'Button variant=danger-ghost hover (5.70)'],

  // --- Biểu đồ admin ---
  ['LIGHT chart primary segment', '#1C1917', '#FFFDF9', 3.0, 'ui', false, 'token primary — phân đoạn biểu đồ'],
  ['LIGHT chart info segment', '#00687A', '#FFFDF9', 3.0, 'ui', false, 'token info (6.34)'],
  ['LIGHT chart positive segment', '#047857', '#FFFDF9', 3.0, 'ui', false, 'token positive (5.40)'],
  ['LIGHT chart warning segment', '#B45309', '#FFFDF9', 3.0, 'ui', false, 'token warning (4.94)'],
  ['LIGHT chart adjacent primary|positive', '#1C1917', '#047857', 3.0, 'ui', false, 'đen đá vs emerald — 3.19'],
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
      console.log('Expected non-pass (documented in DESIGN-LANGUAGE §1.4):');
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
