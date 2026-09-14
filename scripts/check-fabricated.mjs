#!/usr/bin/env node
/**
 * check-fabricated.mjs — cổng chặn TUYÊN BỐ BỊA trong chuỗi hiển thị cho người dùng.
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * Cổng cũ của coordinator grep `WATERTIGHT` **viết hoa** trên cả dòng nên:
 *   1. BỎ SÓT `'100% Watertight'` (chữ thường)                 -> lỗi âm thầm
 *   2. Nếu grep không phân biệt hoa/thường thì BÁO NHẦM
 *      `isWatertight: boolean;` (tên trường TypeScript)         -> nhiễu
 *
 * Cách làm đúng: chỉ kiểm tra **NỘI DUNG CHUỖI** (string literal), không kiểm tra cả dòng,
 * và phân biệt:
 *   - TÊN TRƯỜNG CODE      `isWatertight: boolean;` / `parsed.isWatertight`  -> KHÔNG khớp
 *   - THUẬT NGỮ TRUNG TÍNH `'Lưới (watertight): —'`                          -> KHÔNG khớp
 *   - LỜI TUYÊN BỐ         `'100% Watertight'`, `'Đạt chuẩn Watertight'`     -> KHỚP
 *
 * Dùng:  node scripts/check-fabricated.mjs [--json]
 * RC=0 => sạch. RC=1 => còn tuyên bố bịa. RC=2 => lỗi công cụ.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const AS_JSON = process.argv.includes('--json');

/**
 * Mẫu tuyên bố bịa. So khớp trên NỘI DUNG CHUỖI (không phân biệt hoa/thường).
 * `allow` = ngoại lệ hợp lệ (thuật ngữ trung tính).
 */
const CLAIMS = [
  {
    // CHỈ khớp khi "watertight" đi kèm một LỜI HỨA. "watertight" trần là thuật ngữ kỹ thuật hợp lệ
    // (ví dụ `'Lưới (watertight): —'` là nhãn trung thực nêu trạng thái).
    id: 'watertight-claim',
    re: /(?:100\s*%|đạt\s*chu[ẩa]n|certified|verified|tuy[ệe]t\s*đ[ốo]i|ho[àa]n\s*h[ảa]o)[^.\n]{0,40}watertight|watertight[^.\n]{0,40}(?:100\s*%|đạt\s*chu[ẩa]n|certified|verified|tuy[ệe]t\s*đ[ốo]i|ho[àa]n\s*h[ảo]o)/i,
    allow: /^l[ưu][ớo]i\s*\(watertight\)|^mesh\s*\(watertight\)/i,
    why: 'hứa "watertight 100%/đạt chuẩn" — chỉ được nêu TRẠNG THÁI đo thật, không hứa',
  },
  { id: 'tolerance-005', re: /(?:±|\+|-)?\s*0[.,]05\s*mm/i,
    why: 'dung sai cụ thể không có nguồn — phải do admin cấu hình' },
  { id: 'metrology-brand', re: /mitutoyo/i, why: 'nêu tên thiết bị đo cụ thể không có nguồn' },
  { id: 'iso-standard', re: /iso\s*\/?\s*astm|iso[-\s]?52900/i,
    why: 'tuyên bố tuân thủ tiêu chuẩn không có chứng nhận' },
  { id: 'iso-9001', re: /iso\s*9001/i, why: 'tuyên bố chứng nhận không có chứng nhận' },
  { id: 'leadtime-24h', re: /giao\s*h[àa]ng\s*24\s*h/i, why: 'cam kết SLA không có nguồn' },
  { id: 'fake-engineer', re: /k[ỹy]\s*s[ưu]\s*vcube\s*24\s*\/?\s*7|k[ỹy]\s*s[ưu]\s*ho[àa]ng\s*long/i,
    why: 'nhân sự/kênh hỗ trợ bịa' },
  { id: 'fake-warranty', re: /đ[ổo]i\s*m[ớoi]\s*100\s*%/i, why: 'cam kết bảo hành bịa' },
  // Hotline bịa: cả dạng có dấu chấm và dạng có khoảng trắng
  { id: 'fake-phone-0988', re: /0988[.\s]?123[.\s]?456/, why: 'hotline bịa (0988.123.456)' },
  { id: 'fake-phone-1900', re: /1900\s*6833/, why: 'hotline bịa (1900 6833)' },
  { id: 'fake-taxcode', re: /0108924881/, why: 'mã số thuế bịa' },
  { id: 'fake-seconds', re: /\b\d+\s*gi[âa]y\b|\b\d+\s*seconds?\b/i,
    why: 'hứa thời gian xử lý cụ thể không có nguồn' },
  { id: 'fake-quotes-count', re: /h[ơo]n\s*\d+\s*b[ảa]n\s*v[ẽe]/i,
    why: 'số lượng lớn hơn thực tế ("Hơn 0 bản vẽ")' },
  { id: 'fake-features', re: /ki[ểe]m\s*đ[ịi]nh\s*[ứu]ng\s*su[ấa]t|finite\s*element\s*analysis|\bFEA\b/,
    why: 'tính năng kiểm định bịa' },
  { id: 'fake-cert', re: /ch[ứu]ng\s*nh[ậa]n\s*iso|iso\s*certified/i, why: 'chứng nhận bịa' },
  {
    // Định danh tài chính/pháp lý bịa: số tài khoản, MST, mã số thuế...
    // Bỏ qua URL (Unsplash id hay chứa dãy số) và hash hex — xem `isUrlOrHash`.
    id: 'fake-financial-id',
    re: /\b\d{9,16}\b/,
    skipIfUrlOrHash: true,
    noPass2IfAssigned: true,
    why: 'dãy số 9–16 chữ số nghi là số tài khoản / MST bịa — nguồn thật là app_settings',
  },
  {
    id: 'fake-legal-entity',
    re: /c[ôo]ng\s*ty\s*(?:c[ổo]\s*ph[ầa]n|cp|tnhh)[^.\n]{0,40}vcube/i,
    why: 'tên pháp nhân bịa/hardcode — nguồn thật là app_settings.legalName',
  },
];

/**
 * Mẫu CODE — quét trên DÒNG ĐÃ BỎ COMMENT nhưng GIỮ NGUYÊN code (khác CLAIMS ở trên,
 * vốn chỉ soi phần TRONG dấu nháy).
 *
 * VÌ SAO CẦN TÁCH RIÊNG: idiom "đoán hộ khi thiếu dữ liệu" —
 *     licenseType: product.licenseType || Commercial
 * — có dấu nháy nên tưởng là bị CLAIMS bắt, nhưng CLAIMS chỉ so khớp NỘI DUNG CHUỖI,
 * mà chuỗi Commercial trần thì không khớp rule nào ⇒ CẢ 3 CHỖ trong repo lọt qua gate
 * và gate vẫn báo SACH. Đã gặp thật: HomeView / ExploreView / CadQuickViewModal.
 */
const CODE_CLAIMS = [
  {
    id: 'fake-license-fallback',
    // CHỈ khớp khi giá trị dự phòng là giấy phép bịa (Commercial...), để không báo nhầm
    // một fallback HỢP LỆ giữa hai nguồn thật (product.licenseType || digital.licenseType).
    re: /license[A-Za-z]*\s*[:=][^,;}\n]{0,80}?\|\|\s*['"][^'"]{0,40}commercial/i,
    why: "đoán hộ giấy phép khi người bán CHƯA khai (|| Commercial) — phải để trống hoặc dấu gạch",
  },
];

/** URL ảnh, hash hex, hoặc dữ liệu kỹ thuật khác: không tính là định danh bịa. */
function isUrlOrHash(text) {
  return /https?:\/\//i.test(text) || /unsplash|images\.|\.(png|jpe?g|webp|svg|gif)\b/i.test(text) || /\b[0-9a-f]{32,}\b/i.test(text);
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '__snapshots__']);
const SKIP_FILES = new Set(['check-fabricated.mjs']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e) && !SKIP_FILES.has(e)) out.push(p);
  }
  return out;
}

function stringLiterals(line) {
  const out = [];
  for (const q of ["'", '"', '`']) {
    const esc = q === '`' ? '`' : `\\${q}`;
    const re = new RegExp(`${esc}((?:\\\\.|(?!${esc})[^\\\\\\n])*)${esc}`, 'g');
    let m;
    while ((m = re.exec(line))) out.push({ quote: q, text: m[1], col: m.index + 1 });
  }
  return out;
}

/** Bỏ comment dòng + comment khối + comment JSX `{/* ... *\/}` (kể cả trong cùng dòng). */
function stripComments(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' ')) // JSX comment
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))     // block comment
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));          // line comment
}

/** Thay mọi string literal bằng khoảng trắng (giữ nguyên độ dài + số dòng). */
function blankStrings(line) {
  let out = line;
  for (const lit of stringLiterals(line)) {
    const rendered = line.slice(lit.col - 1);
    void rendered;
  }
  // làm lại bằng regex thay thế tại chỗ
  for (const q of ["'", '"', '`']) {
    const esc = q === '`' ? '`' : `\\${q}`;
    out = out.replace(new RegExp(`${esc}(?:\\\\.|(?!${esc})[^\\\\\\n])*${esc}`, 'g'), (m) => ' '.repeat(m.length));
  }
  return out;
}

/**
 * Che các ĐỊNH DANH chứa "watertight" (isWatertight, watertightLocal…) để không báo nhầm
 * tên trường/biến. Từ TRẦN đúng 10 ký tự ("Watertight") là chữ trong text JSX -> GIỮ LẠI.
 */
function blankIdentifiers(line) {
  return line.replace(/[A-Za-z_$][\w$]*watertight[\w$]*/gi, (m) =>
    m.toLowerCase() === 'watertight' ? m : ' '.repeat(m.length),
  );
}

const findings = [];
let scanned = 0;
for (const file of walk(SRC)) {
  scanned++;
  const src = readFileSync(file, 'utf8');
  const clean = stripComments(src).split(/\r?\n/);   // cùng số dòng -> ánh xạ 1:1
  clean.forEach((line, i) => {
    // PASS 1 — nội dung CHUỖI có dấu nháy
    for (const lit of stringLiterals(line)) {
      for (const c of CLAIMS) {
        if (!c.re.test(lit.text)) continue;
        if (c.allow && c.allow.test(lit.text.trim())) continue;
        if (c.skipIfUrlOrHash && isUrlOrHash(lit.text)) continue;
        findings.push({
          file: relative(ROOT, file), line: i + 1, column: lit.col, rule: c.id, why: c.why,
          text: lit.text.length > 130 ? lit.text.slice(0, 130) + '…' : lit.text,
        });
      }
    }
    // PASS 2 — text JSX TRẦN (không có dấu nháy, ví dụ `<span>100% Watertight</span>`).
    // Che chuỗi + định danh trước, rồi mới kiểm để không báo nhầm code.
    const bare = blankIdentifiers(blankStrings(line));
    if (bare.trim() && !/\b(import|export|from|type|interface)\b/.test(bare)) {
      for (const c of CLAIMS) {
        const hit = c.re.exec(bare);
        if (!hit) continue;
        if (c.skipIfUrlOrHash && isUrlOrHash(hit[0])) continue;
        if (c.noPass2IfAssigned) {
          const before = bare.slice(0, hit.index).replace(/\s+$/, '');
          if (/[:=]$/.test(before)) continue;   // dong la CODE (object literal / gan bien), khong phai chu hien thi
        }
        // NGOẠI LỆ phải áp lên CHÍNH ĐOẠN KHỚP, không được bỏ qua cả rule
        // (bỏ qua cả rule sẽ vô hiệu hoá nó ở lượt này — đúng lỗi đã gặp với `CadQuickViewModal`).
        if (c.allow && c.allow.test(hit[0].trim())) continue;
        findings.push({
          file: relative(ROOT, file), line: i + 1, column: hit.index + 1, rule: c.id + ':jsx-text',
          why: c.why,
          text: line.trim().slice(0, 130),
        });
      }
    }
    // PASS 3 — mẫu CODE (fallback bịa), KHÔNG phải nội dung chuỗi. Xem CODE_CLAIMS.
    for (const c of CODE_CLAIMS) {
      const hit = c.re.exec(line);
      if (!hit) continue;
      findings.push({
        file: relative(ROOT, file), line: i + 1, column: hit.index + 1,
        rule: c.id, why: c.why, text: hit[0].trim().slice(0, 130),
      });
    }
  });
}

const byRule = findings.reduce((a, f) => ((a[f.rule] = (a[f.rule] || 0) + 1), a), {});

if (AS_JSON) {
  console.log(JSON.stringify({ scannedFiles: scanned, count: findings.length, byRule, findings }, null, 2));
} else {
  console.log(`check-fabricated: quet ${scanned} file .ts/.tsx`);
  if (!findings.length) {
    console.log('  KET QUA: SACH — 0 tuyen bo bia trong chuoi hien thi.');
  } else {
    console.log(`  KET QUA: ${findings.length} tuyen bo bia trong chuoi hien thi`);
    console.log('  theo loai: ' + Object.entries(byRule).map(([k, v]) => `${k}=${v}`).join('  '));
    console.log();
    for (const f of findings) {
      console.log(`  ${f.file}:${f.line}:${f.column}  [${f.rule}]`);
      console.log(`      "${f.text}"`);
      console.log(`      -> ${f.why}`);
    }
  }
}
process.exit(findings.length ? 1 : 0);
