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
 * Luật 1 — `text-fg-subtle` (light #64748B · dark #7A8798) trên `bg-line-subtle`
 *          (light #E2E8F0 · dark #1B2434):
 *            light = 3.86:1  ·  dark = 4.26:1   -> CẢ HAI < 4.5 ⇒ VI PHẠM
 *          Lý do: `fg-subtle` là màu metadata 12px; trên nền hairline nó tụt dưới sàn 4.5.
 *          Cách sửa: dùng `text-fg-muted` (5.22 light / 6.53 dark).
 * Luật 2 — `text-fg-subtle` trên `bg-primary/5` (nền = primary composite 5% trên surface;
 *          composite trong KHÔNG GIAN GAMMA sRGB, KHÔNG phải linear-light — linear-light cho
 *          4.56 = PASS GIẢ):
 *            light #F2F7F8 = 4.40:1  ·  dark #101D29 = 4.67:1  -> light < 4.5 ⇒ VI PHẠM
 * Luật 3 — `text-fg-subtle` trên `bg-warning-tint` (light #FEF6EC sau D-1 · dark #2A2114):
 *            light = 4.44:1  ·  dark = 4.33:1   -> CẢ HAI < 4.5 ⇒ VI PHẠM
 *          Lưu ý: D-1 chỉ làm nhạt `--color-warning-tint` cho `text-warning` (#B45309 → 4.69).
 *          `fg-subtle` (#64748B) NHẸ HƠN `warning`, nên làm nhạt nền chỉ kéo nó từ 4.23 lên
 *          4.44 — vẫn fail. Đây là lý do luật này tồn tại độc lập với D-1.
 * Luật 4 — `text-fg-subtle` trên `bg-surface-muted` (light #F8F9FF · dark #131C2A):
 *            light = 4.53:1  ·  dark = 4.68:1   -> CẢ HAI >= 4.5 ⇒ **KHÔNG PHẢI VI PHẠM**
 *          Vẫn khai báo (in ra ở mức "ĐẠT NHƯNG SÁT NGƯỠNG", kèm file:line) vì biên chỉ 0.03:
 *          ép nó thành lỗi là SAI SỐ HỌC (4.53 >= 4.5) và sẽ báo nhầm ~20 chỗ đang đạt chuẩn.
 * Luật 5 — `text-fg-subtle` trên `bg-positive-tint` (light #F0F9F3 sau D-1b · dark #10241A):
 *            light = 4.43:1  ·  dark = 4.46:1   -> CẢ HAI < 4.5 ⇒ VI PHẠM (0 chỗ đang dùng)
 * Luật 6 — `text-positive` trên `bg-positive-tint`: **ĐÃ SỬA Ở TẦNG TOKEN (D-1b)**
 *            light #15803D trên #E7F3EC = 4.40 (FAIL) -> #F0F9F3 = 4.67 (ĐẠT)
 *            dark  #4ADE80 trên #10241A = 9.35 (ĐẠT, token dark không đổi)
 *          Luật này KHÔNG in từng chỗ (`muteHits`): ~55 chỗ `bg-positive-tint text-positive` nay
 *          đều ĐẠT, in ra chỉ là nhiễu. Giữ luật để phần SỔ SÁCH còn hiệu lực: `--color-positive-tint`
 *          mà bị làm đậm lại ⇒ `token-drift` đỏ ngay.
 *
 * CÁCH SO KHỚP (cố ý chặt, tránh báo nhầm)
 * ---------------------------------------
 *  - Chỉ soi NỘI DUNG CHUỖI; bỏ hẳn comment (dòng, khối, `{* *}` JSX) — nhờ vậy comment kiểu
 *    "KHÔNG dùng A trên B" không bị tính là vi phạm. `${...}` trong template literal được
 *    quét như CODE riêng (chuỗi bên trong vẫn được soi).
 *  - Modifier (`hover:`, `focus:`, `disabled:`, `dark:`…) được tôn trọng: `hover:bg-line-subtle`
 *    + `text-fg-subtle` + `hover:text-fg` KHÔNG bị báo, vì ở trạng thái hover chữ đã đổi màu.
 *    Chỉ báo khi `text-fg-subtle` là màu chữ HIỆU DỤNG ở trạng thái mà nền đó bật.
 *  - Alpha (`bg-warning-tint/50`, `text-fg-subtle/70`) được composite trên surface của từng
 *    theme rồi mới tính tỉ lệ; theme xấu nhất quyết định — nên `bg-warning-tint/50` (4.62) ĐẠT
 *    trong khi `bg-warning-tint` đặc (4.44) FAIL.
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
    'fg-subtle': '#64748B',
    'line-subtle': '#E2E8F0',
    'surface-muted': '#F8F9FF',
    'warning-tint': '#FEF6EC',
    'positive-tint': '#F0F9F3',
    primary: '#00687A',
    positive: '#15803D',
    surface: '#FFFFFF',
  },
  dark: {
    'fg-subtle': '#7A8798',
    'line-subtle': '#1B2434',
    'surface-muted': '#131C2A',
    'warning-tint': '#2A2114',
    'positive-tint': '#10241A',
    primary: '#3AB8CE',
    positive: '#4ADE80',
    surface: '#0E1520',
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
    ratios: { light: 3.86, dark: 4.26 },
    remedy: 'dùng `text-fg-muted` (5.22 light / 6.53 dark) cho chữ trên dải hairline',
  },
  {
    id: 'fg-subtle-on-primary-5',
    fg: 'text-fg-subtle',
    bg: 'bg-primary/5',
    fgToken: 'fg-subtle',
    bgToken: 'primary',
    bgAlpha: 5,
    ratios: { light: 4.4, dark: 4.67 },
    remedy: 'dùng `text-fg-muted` (5.96 light) trên hàng `bg-primary/5`',
  },
  {
    id: 'fg-subtle-on-warning-tint',
    fg: 'text-fg-subtle',
    bg: 'bg-warning-tint',
    fgToken: 'fg-subtle',
    bgToken: 'warning-tint',
    ratios: { light: 4.44, dark: 4.33 },
    remedy: 'dùng `text-fg-muted`, hoặc đổi nền sang `bg-surface-muted` + `text-warning`',
  },
  {
    id: 'fg-subtle-on-surface-muted',
    fg: 'text-fg-subtle',
    bg: 'bg-surface-muted',
    fgToken: 'fg-subtle',
    bgToken: 'surface-muted',
    ratios: { light: 4.53, dark: 4.68 },
    // 4.53/4.68 >= 4.5 ⇒ mọi chỗ dùng luật này in ở mức SÁT NGƯỠNG (không tính RC).
    remedy: 'đạt chuẩn nhưng biên chỉ 0.03 — cân nhắc `text-fg-muted` khi sửa vùng này',
  },
  {
    id: 'fg-subtle-on-positive-tint',
    fg: 'text-fg-subtle',
    bg: 'bg-positive-tint',
    fgToken: 'fg-subtle',
    bgToken: 'positive-tint',
    ratios: { light: 4.43, dark: 4.46 },
    remedy: 'dùng `text-fg-muted` trên nền `bg-positive-tint`',
  },
  {
    id: 'positive-on-positive-tint',
    fg: 'text-positive',
    bg: 'bg-positive-tint',
    fgToken: 'positive',
    bgToken: 'positive-tint',
    ratios: { light: 4.67, dark: 9.35 },
    // ĐÃ SỬA Ở TẦNG TOKEN (D-1b): #E7F3EC (4.40 FAIL) -> #F0F9F3 (4.67 ĐẠT).
    // `muteHits`: ~55 chỗ đang dùng nay đều ĐẠT -> không in từng chỗ; luật vẫn giữ để phần
    // SỔ SÁCH chặn token bị làm đậm lại (`token-drift` / `rule-ratio-drift`).
    muteHits: true,
    remedy: 'token `--color-positive-tint` phải giữ >= 4.5:1 với `--color-positive`',
  },
];

const TEXT_COLOR_RE = /^text-(?:fg|fg-muted|fg-subtle|on-inverse|primary|primary-fg|primary-hover|accent|positive|warning|warning-strong|danger|info|canvas|surface)(?:\/\d{1,3})?$/;
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

      const variants = `${fg.variant} ${bg.variant}`;
      const themes = variants.includes('dark') ? ['dark'] : variants.includes('light') ? ['light'] : ['light', 'dark'];
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
          why: `chữ \`${rule.fg}\` trên nền \`${rule.bg}\` = ${rule.ratios.light} light / ${rule.ratios.dark} dark (theme xấu nhất: ${hit.theme})`,
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
  const darkAt = css.indexOf('.dark {');
  const lightPart = darkAt >= 0 ? css.slice(0, darkAt) : css;
  const darkPart = darkAt >= 0 ? css.slice(darkAt) : '';
  for (const theme of ['light', 'dark']) {
    const part = theme === 'light' ? lightPart : darkPart;
    for (const [name, expected] of Object.entries(TOKENS[theme])) {
      const m = part.match(new RegExp('--color-' + name + '\\s*:\\s*(#[0-9A-Fa-f]{3,8})'));
      if (!m) {
        pushBookkeeping('token-drift', `--color-${name} (${theme})`, `không đọc được --color-${name} trong khối ${theme} của src/index.css — cập nhật TOKENS`, 'đọc lại src/index.css rồi cập nhật TOKENS + RULES');
        continue;
      }
      if (m[1].toUpperCase() !== expected.toUpperCase()) {
        pushBookkeeping('token-drift', `--color-${name} (${theme}) = ${m[1]}, script ghi ${expected}`, 'token đã đổi nhưng sổ sách của cổng chưa cập nhật → cổng có thể "xanh giả"', 'đo lại tỉ lệ rồi cập nhật TOKENS + RULES.ratios');
      }
    }
  }
  for (const rule of RULES) {
    for (const theme of ['light', 'dark']) {
      const bgHex = rule.bgAlpha === undefined
        ? TOKENS[theme][rule.bgToken]
        : compositeOver(TOKENS[theme][rule.bgToken], rule.bgAlpha, TOKENS[theme].surface);
      const measured = Math.round(ratioOf(TOKENS[theme][rule.fgToken], bgHex) * 100) / 100;
      if (Math.abs(measured - rule.ratios[theme]) > 0.01) {
        pushBookkeeping('rule-ratio-drift', `${rule.id} (${theme}): thật ${measured}, sổ sách ${rule.ratios[theme]}`, 'token đổi giá trị nên tỉ lệ thật khác số đã ghi — luật phải được soát lại', 'cập nhật RULES[].ratios sau khi đo lại');
      }
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
