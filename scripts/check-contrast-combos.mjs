#!/usr/bin/env node
/**
 * check-contrast-combos.mjs — cổng chặn TỔ HỢP CLASS phản tương phản trong mã nguồn (D-2).
 *
 * VÌ SAO CÓ FILE NÀY (bịt lỗ hổng "xanh giả")
 * ------------------------------------------
 * `scripts/check-contrast.mjs` là cổng KHAI BÁO: nó so một bảng hằng số với chính danh sách
 * mong đợi của nó. Nó bắt được REGRESSION Ở TẦNG TOKEN (`src/index.css`) nhưng **vẫn exit 0**
 * nếu ai đó sửa `className` trong một file `.tsx` quay lại tổ hợp đã fail — vì bảng hằng số
 * không hề đọc mã nguồn. Cổng này đọc mã nguồn: soi từng chuỗi class (string literal + phần
 * text tĩnh của template literal) và FAIL nếu trong CÙNG MỘT class list có cả cặp (chữ, nền)
 * đã đo là fail.
 *
 * SỔ SÁCH TỪNG LUẬT (đo bằng số học WCAG 2.x trên gamma sRGB — xem `ratioOf`/`compositeOver`)
 * ------------------------------------------------------------------------------------------
 * App light-only: mọi luật chỉ còn một con số light.
 * Palette v3 "Soft Studio" (docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md):
 * `canvas` #F6F7EF · `surface` #FFFDF9 · `surface-muted` #F5F4EC · `line-subtle` #F0EDE3
 * · `fg-subtle` #746E68 · `primary` #1C1917 (đen đá) · coral `brand` #E8624A (chỉ mark).
 *
 * Luật 1 — `text-fg-subtle` trên `bg-line-subtle` (#F0EDE3, v3):
 *            light = 4.30:1   -> < 4.5 ⇒ VI PHẠM
 *          Lý do: `fg-subtle` là màu metadata 12px; trên nền hairline nó tụt dưới sàn.
 *          Cách sửa: dùng `text-fg-muted` (6.51).
 * Luật 2 — `text-fg-subtle` trên `bg-primary/5` (nền = primary composite 5% trên surface
 *          mới #FFFDF9; composite trong KHÔNG GIAN GAMMA sRGB, KHÔNG phải linear-light):
 *            light #F4F2EE = 4.50:1  -> >= 4.5 ⇒ ĐẠT SÁT NGƯỠNG (giữ luật để chặn drift)
 * Luật 3 — `text-fg-subtle` trên `bg-warning-tint` (#FFFBEB): 4.85:1 ⇒ ĐẠT
 * Luật 4 — `text-fg-subtle` trên `bg-surface-muted` (#F5F4EC, v3): 4.56:1 ⇒ ĐẠT sát ngưỡng
 * Luật 5 — `text-fg-subtle` trên `bg-positive-tint` (#ECFDF5): 4.78:1 ⇒ ĐẠT
 * Luật 6 — `text-positive` trên `bg-positive-tint`: 5.21:1 ⇒ ĐẠT (`muteHits`: giữ để phần
 *          SỔ SÁCH chặn token bị làm đậm lại — `token-drift` / `rule-ratio-drift`).
 * Luật 7 — `text-fg-subtle` trên `bg-canvas` (#F6F7EF): 4.67:1 ⇒ ĐẠT. Chặn việc kéo canvas
 *          tối hơn (PLAN v3 §4.1: không tối hơn #F1F5E8).
 * Luật 8 — `text-fg-subtle` trên `bg-surface` (#FFFDF9): 4.95:1 ⇒ ĐẠT.
 * Luật 9 — `text-fg-subtle` trên 4 `bg-tile-*` pastel: 4.29–4.44 ⇒ VI PHẠM. Trên tile
 *          pastel luôn dùng `text-fg` (14.9–15.4) hoặc `text-fg-muted` (6.5–6.7).
 * Luật 10 — `text-fg` trên `bg-brand` (coral): 5.23 ⇒ ĐẠT (chữ V trên ô logo).
 * Luật 11 — `text-brand` làm CHỮ trên `bg-surface`: 3.29 ⇒ VI PHẠM. Coral chỉ brand mark
 *          (đồ hoạ), không bao giờ làm màu chữ (D3).
 *
 * CÁCH SO KHỚP (cố ý chặt, tránh báo nhầm)
 * ---------------------------------------
 *  - Chỉ soi NỘI DUNG CHUỖI; bỏ hẳn comment (dòng, khối, `{* *}` JSX) — nhờ vậy comment kiểu
 *    "KHÔNG dùng A trên B" không bị tính là vi phạm. `${...}` trong template literal được
 *    quét như CODE riêng (chuỗi bên trong vẫn được soi).
 *  - Modifier (`hover:`, `focus:`, `disabled:`…) được tôn trọng: `hover:bg-line-subtle`
 *    + `text-fg-subtle` + `hover:text-fg` KHÔNG bị báo, vì ở trạng thái hover chữ đã đổi màu.
 *    Chỉ báo khi `text-fg-subtle` là màu chữ HIỆU DỤNG ở trạng thái mà nền đó bật.
 *  - Alpha (`bg-warning-tint/50`, `text-fg-subtle/70`) được composite trên surface light
 *    rồi mới tính tỉ lệ — nên `bg-warning-tint/50` (4.62) ĐẠT trong khi `bg-warning-tint`
 *    đặc (4.44) FAIL.
 *  - Đối chiếu `TOKENS`/`RULES.ratios` với `src/index.css`: token đổi giá trị mà sổ sách chưa
 *    cập nhật ⇒ FAIL (`token-drift` / `rule-ratio-drift`) để cổng không "xanh giả" lần nữa.
 *
 * Dùng:  node scripts/check-contrast-combos.mjs [--json]
 * RC=0 => sạch. RC=1 => có tổ hợp vi phạm (< 4.5) hoặc sổ sách lệch token. RC=2 => lỗi công cụ.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const CSS_FILE = join(ROOT, 'src', 'index.css');
const AS_JSON = process.argv.includes('--json');
const MIN_TEXT = 4.5;

/* ---------------------------------------------------------------------------
   Số học WCAG 2.x — gamma sRGB (giống hệt `scripts/check-contrast.mjs`).
   --------------------------------------------------------------------------- */
const srgbToLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const hexToRgb = (hex) => {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('');

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
};

const ratioOf = (fg, bg) => {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/**
 * Composite alpha trong KHÔNG GIAN GAMMA sRGB (trộn thẳng kênh 0–255).
 * ĐÂY LÀ ĐIỂM TỪNG CHO KẾT QUẢ SAI: composite trong linear-light cho `#64748B` trên
 * `bg-primary/5` = 4.56 (PASS giả), còn sRGB gamma cho 4.40 = FAIL thật.
 */
const compositeOver = (hex, alphaPercent, baseHex) => {
  const a = Math.max(0, Math.min(1, alphaPercent / 100));
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(baseHex);
  return rgbToHex([a * r1 + (1 - a) * r2, a * g1 + (1 - a) * g2, a * b1 + (1 - a) * b2]);
};

/* ---------------------------------------------------------------------------
   Token — PHẢI khớp `src/index.css` (đối chiếu tự động ở phần sổ sách bên dưới).
   --------------------------------------------------------------------------- */
const TOKENS = {
  light: {
    'fg-subtle': '#746E68',
    fg: '#1C1917',
    'line-subtle': '#F0EDE3',
    'surface-muted': '#F5F4EC',
    surface: '#FFFDF9',
    canvas: '#F6F7EF',
    'warning-tint': '#FFFBEB',
    'positive-tint': '#ECFDF5',
    primary: '#1C1917',
    positive: '#047857',
    brand: '#E8624A',
    'tile-mint': '#E7F1E4',
    'tile-lilac': '#EFEBF8',
    'tile-rose': '#FCEBE5',
    'tile-amber': '#FAF0DA',
  },
};

/** LUẬT. `ratios` = số đã đo; script tự tính lại và FAIL nếu lệch quá 0.01. */
const RULES = [
  {
    id: 'fg-subtle-on-line-subtle',
    fg: 'text-fg-subtle',
    bg: 'bg-line-subtle',
    fgToken: 'fg-subtle',
    bgToken: 'line-subtle',
    ratios: { light: 4.30 },
    remedy: 'dùng `text-fg-muted` (6.51) cho chữ trên dải hairline',
  },
  {
    id: 'fg-subtle-on-primary-5',
    fg: 'text-fg-subtle',
    bg: 'bg-primary/5',
    fgToken: 'fg-subtle',
    bgToken: 'primary',
    bgAlpha: 5,
    ratios: { light: 4.50 },
    remedy: 'đạt sát ngưỡng (4.50) — vẫn ưu tiên `text-fg-muted` nếu sửa vùng này',
  },
  {
    id: 'fg-subtle-on-warning-tint',
    fg: 'text-fg-subtle',
    bg: 'bg-warning-tint',
    fgToken: 'fg-subtle',
    bgToken: 'warning-tint',
    ratios: { light: 4.85 },
    remedy: 'đạt (4.85) — giữ token warning-tint >= #FFFBEB',
  },
  {
    id: 'fg-subtle-on-surface-muted',
    fg: 'text-fg-subtle',
    bg: 'bg-surface-muted',
    fgToken: 'fg-subtle',
    bgToken: 'surface-muted',
    ratios: { light: 4.56 },
    remedy: 'đạt sát ngưỡng (4.56) — không làm surface-muted tối hơn #F5F4EC',
  },
  {
    id: 'fg-subtle-on-positive-tint',
    fg: 'text-fg-subtle',
    bg: 'bg-positive-tint',
    fgToken: 'fg-subtle',
    bgToken: 'positive-tint',
    ratios: { light: 4.78 },
    remedy: 'đạt (4.78) — giữ token positive-tint <= #ECFDF5',
  },
  {
    id: 'positive-on-positive-tint',
    fg: 'text-positive',
    bg: 'bg-positive-tint',
    fgToken: 'positive',
    bgToken: 'positive-tint',
    ratios: { light: 5.21 },
    // ĐÃ SỬA Ở TẦNG TOKEN: #15803D/#F0F9F3 (4.67) -> #047857/#ECFDF5 (5.21).
    // `muteHits`: mọi chỗ đang dùng nay đều ĐẠT -> không in từng chỗ; luật vẫn giữ để phần
    // SỔ SÁCH chặn token bị làm đậm lại (`token-drift` / `rule-ratio-drift`).
    muteHits: true,
    remedy: 'token `--color-positive-tint` phải giữ >= 4.5:1 với `--color-positive`',
  },
  {
    id: 'fg-subtle-on-canvas',
    fg: 'text-fg-subtle',
    bg: 'bg-canvas',
    fgToken: 'fg-subtle',
    bgToken: 'canvas',
    ratios: { light: 4.67 },
    // Chỉ giữ để SỔ SÁCH chặn canvas bị kéo tối hơn (PLAN v3 §4.1).
    muteHits: true,
    remedy: 'đạt (4.67) — canvas không được tối hơn #F6F7EF',
  },
  {
    id: 'fg-subtle-on-surface',
    fg: 'text-fg-subtle',
    bg: 'bg-surface',
    fgToken: 'fg-subtle',
    bgToken: 'surface',
    ratios: { light: 4.95 },
    muteHits: true,
    remedy: 'đạt (4.95) — surface không được tối hơn #FFFDF9',
  },
  {
    id: 'fg-subtle-on-tile-mint',
    fg: 'text-fg-subtle',
    bg: 'bg-tile-mint',
    fgToken: 'fg-subtle',
    bgToken: 'tile-mint',
    ratios: { light: 4.34 },
    remedy: 'dùng `text-fg` (15.07) hoặc `text-fg-muted` (6.58) trên tile pastel',
  },
  {
    id: 'fg-subtle-on-tile-lilac',
    fg: 'text-fg-subtle',
    bg: 'bg-tile-lilac',
    fgToken: 'fg-subtle',
    bgToken: 'tile-lilac',
    ratios: { light: 4.29 },
    remedy: 'dùng `text-fg` (14.91) hoặc `text-fg-muted` (6.51) trên tile pastel',
  },
  {
    id: 'fg-subtle-on-tile-rose',
    fg: 'text-fg-subtle',
    bg: 'bg-tile-rose',
    fgToken: 'fg-subtle',
    bgToken: 'tile-rose',
    ratios: { light: 4.35 },
    remedy: 'dùng `text-fg` (15.12) hoặc `text-fg-muted` (6.60) trên tile pastel',
  },
  {
    id: 'fg-subtle-on-tile-amber',
    fg: 'text-fg-subtle',
    bg: 'bg-tile-amber',
    fgToken: 'fg-subtle',
    bgToken: 'tile-amber',
    ratios: { light: 4.44 },
    remedy: 'dùng `text-fg` (15.44) hoặc `text-fg-muted` (6.74) trên tile pastel',
  },
  {
    id: 'fg-on-brand',
    fg: 'text-fg',
    bg: 'bg-brand',
    fgToken: 'fg',
    bgToken: 'brand',
    ratios: { light: 5.23 },
    // Chữ V trên ô logo coral: ĐẠT. Chỉ giữ để chặn đổi coral quá sáng/tối.
    muteHits: true,
    remedy: 'chữ trên brand mark phải là `text-fg` (5.23), KHÔNG dùng trắng (3.35)',
  },
  {
    id: 'brand-as-text-on-surface',
    fg: 'text-brand',
    bg: 'bg-surface',
    fgToken: 'brand',
    bgToken: 'surface',
    ratios: { light: 3.29 },
    remedy: 'coral chỉ dùng cho brand mark (nền/đồ hoạ) — không bao giờ làm màu chữ (D3)',
  },
];

const TEXT_COLOR_RE = /^text-(?:fg|fg-muted|fg-subtle|on-inverse|primary|primary-fg|primary-hover|accent|brand|positive|warning|warning-strong|danger|info|canvas|surface)(?:\/\d{1,3})?$/;
/* Token class PHẢI cho phép `:` (modifier `hover:` / `disabled:` / `md:hover:`) — nếu chặn `:`
   thì mọi class có modifier bị lọc bỏ và cổng trở thành MÙ với `hover:bg-line-subtle`. */
const CLASS_TOKEN_RE = /^[A-Za-z0-9_@[\]().,%#/:-]+$/;

/* ---------------------------------------------------------------------------
   Trích string literal + phần text tĩnh của template literal (bỏ comment, xử lý `${...}`).
   --------------------------------------------------------------------------- */
function extractLiterals(src) {
  const out = [];
  const n = src.length;
  const lineStarts = [0];
  for (let k = 0; k < n; k++) if (src[k] === '\n') lineStarts.push(k + 1);
  const lineOf = (idx) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  /** Quét CODE từ i; khi inExpr, trả về chỉ số NGAY SAU `}` ở mức 0. */
  function scanCode(i, inExpr) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === '/' && d === '/') {
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (c === '/' && d === '*') {
        i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
      if (c === "'" || c === '"') {
        const q = c;
        const start = i + 1;
        i++;
        let buf = '';
        while (i < n && src[i] !== q) {
          if (src[i] === '\\') {
            buf += src[i + 1] ?? '';
            i += 2;
          } else {
            buf += src[i];
            i++;
          }
        }
        i++;
        out.push({ text: buf, index: start, line: lineOf(start) });
        continue;
      }
      if (c === '`') {
        i++;
        let segStart = i;
        let buf = '';
        while (i < n && src[i] !== '`') {
          if (src[i] === '\\') {
            buf += src[i + 1] ?? '';
            i += 2;
            continue;
          }
          if (src[i] === '$' && src[i + 1] === '{') {
            out.push({ text: buf, index: segStart, line: lineOf(segStart) });
            i = scanCode(i + 2, true);
            segStart = i;
            buf = '';
            continue;
          }
          buf += src[i];
          i++;
        }
        out.push({ text: buf, index: segStart, line: lineOf(segStart) });
        i++;
        continue;
      }
      if (inExpr && c === '{') {
        depth++;
        i++;
        continue;
      }
      if (inExpr && c === '}') {
        if (depth === 0) return i + 1;
        depth--;
        i++;
        continue;
      }
      i++;
    }
    return i;
  }

  scanCode(0, false);
  return out;
}

/* ---------------------------------------------------------------------------
   So khớp luật trên một class list.
   --------------------------------------------------------------------------- */
function parseClass(token) {
  const idx = token.lastIndexOf(':');
  const variant = idx >= 0 ? token.slice(0, idx) : '';
  let base = idx >= 0 ? token.slice(idx + 1) : token;
  let alpha = 100;
  const slash = base.lastIndexOf('/');
  if (slash >= 0 && /^\d{1,3}$/.test(base.slice(slash + 1))) {
    alpha = Number(base.slice(slash + 1));
    base = base.slice(0, slash);
  }
  return { variant, base, alpha };
}

function classesOf(literalText) {
  const list = [];
  let offset = 0;
  for (const raw of literalText.split(/\s+/)) {
    if (!raw) continue;
    const pos = literalText.indexOf(raw, offset);
    offset = pos + raw.length;
    if (!CLASS_TOKEN_RE.test(raw)) continue; // mảnh code (`${`, dấu câu…) — bỏ
    list.push({ raw, index: pos, ...parseClass(raw) });
  }
  return list;
}

/** Tỉ lệ hiệu dụng của cặp (fg, bg) trong một theme, có xét alpha của cả hai. */
function ratioIn(rule, theme, fgHit, bgHit) {
  const bgSolid = TOKENS[theme][rule.bgToken];
  const bgHex = bgHit.alpha >= 100 ? bgSolid : compositeOver(bgSolid, bgHit.alpha, TOKENS[theme].surface);
  const fgSolid = TOKENS[theme][rule.fgToken];
  const fgHex = fgHit.alpha >= 100 ? fgSolid : compositeOver(fgSolid, fgHit.alpha, bgHex);
  return ratioOf(fgHex, bgHex);
}

function matchLiteral(rule, literalText) {
  const classes = classesOf(literalText);
  const fgHits = classes.filter((c) => c.base === rule.fg);
  if (!fgHits.length) return [];
  // Nhận MỌI alpha cho nền (`bg-primary/5`, `bg-primary/10`, `bg-primary` trần…): tỉ lệ được
  // tính lại theo alpha thật của từng chỗ, không suy diễn. `rule.bgAlpha` chỉ là alpha dùng
  // để ĐO con số ghi trong sổ sách.
  const bgHits = classes.filter((c) => c.base === rule.bg);
  if (!bgHits.length) return [];

  const textByVariant = new Map();
  for (const c of classes) {
    if (!TEXT_COLOR_RE.test(c.base)) continue;
    const set = textByVariant.get(c.variant) || new Set();
    set.add(c.base);
    textByVariant.set(c.variant, set);
  }
  const hasOtherTextColor = (variant) => {
    const set = textByVariant.get(variant);
    if (!set) return false;
    for (const t of set) if (t !== rule.fg) return true; // màu chữ khác ở CÙNG trạng thái
    return false;
  };

  const hits = [];
  for (const fg of fgHits) {
    for (const bg of bgHits) {
      const sameState =
        bg.variant === '' ||
        fg.variant === bg.variant ||
        fg.variant.startsWith(bg.variant + ':') ||
        bg.variant.startsWith(fg.variant + ':');
      if (!sameState) continue;
      if (bg.variant !== '' && hasOtherTextColor(bg.variant)) continue; // nền đổi thì chữ đổi theo
      if (fg.variant !== '' && fg.variant !== bg.variant && hasOtherTextColor(fg.variant)) continue;

      const themes = ['light'];
      let worst = Infinity;
      let worstTheme = themes[0];
      for (const theme of themes) {
        const r = ratioIn(rule, theme, fg, bg);
        if (r < worst) {
          worst = r;
          worstTheme = theme;
        }
      }
      hits.push({ ratio: worst, theme: worstTheme, index: Math.min(fg.index, bg.index) });
    }
  }
  return hits;
}

/* ---------------------------------------------------------------------------
   Quét .tsx
   --------------------------------------------------------------------------- */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const findings = [];
const nearMissFindings = [];
let scanned = 0;

for (const file of walk(SRC)) {
  scanned++;
  const src = readFileSync(file, 'utf8');
  for (const lit of extractLiterals(src)) {
    if (!lit.text.trim()) continue;
    for (const rule of RULES) {
      if (rule.muteHits) continue; // cặp đã ĐẠT sau khi sửa token: chỉ giữ phần sổ sách
      for (const hit of matchLiteral(rule, lit.text)) {
        const before = lit.text.slice(0, hit.index);
        const record = {
          file: relative(ROOT, file),
          line: lit.line + (before.match(/\n/g) || []).length,
          column: hit.index - (before.lastIndexOf('\n') + 1) + 1,
          rule: rule.id,
          ratio: Math.round(hit.ratio * 100) / 100,
          theme: hit.theme,
          min: MIN_TEXT,
          text: lit.text.replace(/\s+/g, ' ').trim().slice(0, 130),
          why: `chữ \`${rule.fg}\` trên nền \`${rule.bg}\` = ${rule.ratios.light}:1 (light)`,
          remedy: rule.remedy,
          nearMiss: Math.round(hit.ratio * 100) / 100 >= MIN_TEXT,
        };
        // Phân loại theo TỈ LỆ ĐO ĐƯỢC, không theo tên luật: biến thể alpha có thể ĐẠT
        // (`bg-warning-tint/50` = 4.62) dù nền đặc fail (`bg-warning-tint` = 4.44).
        (record.nearMiss ? nearMissFindings : findings).push(record);
      }
    }
  }
}

/* ---------------------------------------------------------------------------
   Sổ sách: token trong `src/index.css` còn khớp với số đo đã ghi không?
   --------------------------------------------------------------------------- */
const bookkeeping = [];
const pushBookkeeping = (rule, text, why, remedy) =>
  bookkeeping.push({ file: 'src/index.css', line: 0, column: 0, rule, ratio: 0, text, why, remedy });

try {
  const css = readFileSync(CSS_FILE, 'utf8');
  for (const [name, expected] of Object.entries(TOKENS.light)) {
    const m = css.match(new RegExp('--color-' + name + '\\s*:\\s*(#[0-9A-Fa-f]{3,8})'));
    if (!m) {
      pushBookkeeping('token-drift', `--color-${name} (light)`, `không đọc được --color-${name} trong src/index.css — cập nhật TOKENS`, 'đọc lại src/index.css rồi cập nhật TOKENS + RULES');
      continue;
    }
    if (m[1].toUpperCase() !== expected.toUpperCase()) {
      pushBookkeeping('token-drift', `--color-${name} (light) = ${m[1]}, script ghi ${expected}`, 'token đã đổi nhưng sổ sách của cổng chưa cập nhật → cổng có thể "xanh giả"', 'đo lại tỉ lệ rồi cập nhật TOKENS + RULES.ratios');
    }
  }
  for (const rule of RULES) {
    const bgHex = rule.bgAlpha === undefined
      ? TOKENS.light[rule.bgToken]
      : compositeOver(TOKENS.light[rule.bgToken], rule.bgAlpha, TOKENS.light.surface);
    const measured = Math.round(ratioOf(TOKENS.light[rule.fgToken], bgHex) * 100) / 100;
    if (Math.abs(measured - rule.ratios.light) > 0.01) {
      pushBookkeeping('rule-ratio-drift', `${rule.id} (light): thật ${measured}, sổ sách ${rule.ratios.light}`, 'token đổi giá trị nên tỉ lệ thật khác số đã ghi — luật phải được soát lại', 'cập nhật RULES[].ratios sau khi đo lại');
    }
  }
} catch (err) {
  pushBookkeeping('tool-error', String(err && err.message), 'không đọc được src/index.css', '');
}

const failures = findings.concat(bookkeeping);
const byRule = failures.reduce((a, f) => ((a[f.rule] = (a[f.rule] || 0) + 1), a), {});

if (AS_JSON) {
  console.log(JSON.stringify({ scannedFiles: scanned, count: failures.length, nearMissCount: nearMissFindings.length, checkedRules: RULES.length, byRule, findings: failures, nearMissFindings }, null, 2));
} else {
  console.log(`check-contrast-combos: quet ${scanned} file .tsx, ${RULES.length} luat`);
  if (!failures.length) {
    console.log(`  KET QUA: SACH — 0 to hop class vi pham nguong ${MIN_TEXT}:1.`);
  } else {
    console.log(`  KET QUA: ${failures.length} to hop class VI PHAM nguong ${MIN_TEXT}:1`);
    console.log('  theo luat: ' + Object.entries(byRule).map(([k, v]) => `${k}=${v}`).join('  '));
    console.log();
    for (const f of failures) {
      const head = f.ratio ? `${f.ratio.toFixed(2)}:1 < ${MIN_TEXT}` : f.rule;
      console.log(`  ${f.file}:${f.line}:${f.column}  [${f.rule}]  ${head}`);
      console.log(`      "${f.text}"`);
      console.log(`      -> ${f.why}`);
      if (f.remedy) console.log(`      -> ${f.remedy}`);
    }
  }
  if (nearMissFindings.length) {
    console.log('');
    console.log(`Dat nhung sat nguong (>= ${MIN_TEXT}:1, KHONG tinh vao RC — chi de don dep): ${nearMissFindings.length} cho`);
    for (const f of nearMissFindings) {
      console.log(`  ${f.file}:${f.line}:${f.column}  [${f.rule}]  ${f.ratio.toFixed(2)}:1`);
    }
  }
}

process.exit(failures.length ? 1 : 0);
