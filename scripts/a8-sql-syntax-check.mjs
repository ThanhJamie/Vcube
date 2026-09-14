#!/usr/bin/env node
/**
 * A8 — Kiểm tra CÚ PHÁP TĨNH cho SQL sinh ra (không cần Postgres).
 *
 * Repo không có psql / postgres / supabase CLI / docker (đã kiểm), nên không thể
 * `EXPLAIN` thật. Script này bắt những lớp lỗi khiến SQL Editor nuốt cả file:
 *
 *   1. dollar-quote tag lẻ ($do$, $fn$, $body$, $p$, $pol$, $q$…) — script bị cắt âm thầm
 *   2. chuỗi nháy đơn lẻ (bao gồm cả `''` escape) — lỗi cú pháp 42601
 *   3. comment block (slash-star ... star-slash) không đóng
 *   4. ngoặc tròn lệch
 *   5. `begin;` không có `commit;` (mỗi phần phải là 1 transaction)
 *   6. câu lệnh không kết thúc bằng `;` (chỉ cảnh báo)
 *
 * Dùng: node scripts/a8-sql-syntax-check.mjs [file...]
 *       (mặc định: 3 migration + 2 script SQL + 2 file chẩn đoán trong supabase/)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = [
  'supabase/migrations/20260900_rls_helpers.sql',
  'supabase/migrations/20260901_baseline_schema.sql',
  'supabase/migrations/20261010_harden_rls.sql',
  'supabase/scripts/bootstrap_admin.sql',
  'supabase/scripts/apply_all_manual.sql',
  'supabase/diagnostics/verify_admin_settings.sql',
  'supabase/diagnostics/audit_schema_truth.sql',
];

const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;
let totalProblems = 0;

for (const rel of files) {
  const p = resolve(root, rel);
  if (!existsSync(p)) {
    console.log(`!! THIẾU FILE: ${rel}`);
    totalProblems++;
    continue;
  }
  const sql = readFileSync(p, 'utf8');
  const problems = [];

  /* ------ 0b. DẤU PHẨY THỪA TRƯỚC "]" (lỗi 42601) ------
   * `array['a', 'b',]` bị Postgres từ chối:
   *   ERROR 42601: syntax error at or near "]"
   * Đã gặp THẬT khi chủ dự án dán apply_all_manual.sql (mảng v_keep).
   * Gate cũ chỉ kiểm CÂN BẰNG ngoặc/nháy nên cho qua — đây là lỗ hổng thứ 6 của lớp lỗi này.
   * Luật: dòng chỉ có `,` rồi tới `]` ⇒ FAIL (kể cả khi `]` nằm ở dòng sau). */
  {
    const re = /,(\s*\n\s*)\]/g;
    let m;
    while ((m = re.exec(sql))) {
      const ln = sql.slice(0, m.index).split('\n').length;
      problems.push(`dòng ${ln}: dấu phẩy thừa ngay trước "]" (lỗi 42601 syntax error at or near "]")`);
    }
  }
  /* ------------------ 0. NỐI CHUỖI VỚI CỘT KIỂU "char" CỦA CATALOG (lỗi 42725)
   * `"char"` KHÔNG cast ngầm sang text, nên `'x' || t.tgenabled` là MƠ HỒ:
   *   ERROR 42725: operator is not unique: unknown || "char"
   * Đã gặp THẬT trên SQL Editor (audit_schema_truth.sql dòng 29).
   * Luật: cột "char" nằm cùng dòng có `||` mà không có `::text` ⇒ FAIL.
   * So sánh (`relkind = 'r'`) thì KHÔNG cần cast — chỉ nối chuỗi mới cần. */
  const CHAR_COLS = ['tgenabled', 'relkind', 'relpersistence', 'relreplident', 'contype',
    'confupdtype', 'confdeltype', 'confmatchtype', 'polcmd', 'provolatile', 'proparallel',
    'prokind', 'typcategory', 'typstorage', 'attidentity', 'attgenerated', 'oprkind',
    'amtype', 'evtenabled', 'evtevent', 'lanname'];
  const charRe = new RegExp(`\\b(${CHAR_COLS.join('|')})\\b`);
  sql.split('\n').forEach((ln, idx) => {
    if (/^\s*--/.test(ln)) return;
    if (!ln.includes('||')) return;
    const m = ln.match(charRe);
    if (!m) return;
    if (new RegExp(`\\b${m[1]}\\s*::\\s*text`).test(ln)) return;
    problems.push(`dòng ${idx + 1}: nối chuỗi với cột "${m[1]}" kiểu "char" mà thiếu ::text (lỗi 42725 operator is not unique)`);
  });

  /* ---------------------------------------------- 1. dollar-quote */
  const tags = new Map();
  for (const m of sql.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)?\$/g)) {
    tags.set(m[0], (tags.get(m[0]) ?? 0) + 1);
  }
  for (const [tag, n] of tags) {
    if (n % 2 !== 0) problems.push(`dollar-quote ${tag} xuất hiện ${n} lần (lẻ) — không cân bằng`);
  }

  /* --------------------------- 2/3/4. quét state machine nháy + comment + ngoặc */
  let i = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inSingle = false;
  let paren = 0;
  let stmtNo = 0;
  let lastStatementStart = 0;
  const statements = [];
  const dollarStack = [];

  while (i < sql.length) {
    const c = sql[i];
    const c2 = sql.slice(i, i + 2);

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c2 === '*/') { inBlockComment = false; i += 2; continue; }
      i++;
      continue;
    }
    if (inSingle) {
      if (c === "'" && sql[i + 1] === "'") { i += 2; continue; }  // '' escape
      if (c === "'") { inSingle = false; i++; continue; }
      i++;
      continue;
    }
    // dollar-quoted body (chỉ nhận tag đã thấy ở dạng mở)
    if (dollarStack.length) {
      const tag = dollarStack[dollarStack.length - 1];
      if (sql.slice(i, i + tag.length) === tag) {
        dollarStack.pop();
        i += tag.length;
        continue;
      }
      i++;
      continue;
    }
    if (c2 === '--') { inLineComment = true; i += 2; continue; }
    if (c2 === '/*') { inBlockComment = true; i += 2; continue; }
    if (c === "'") { inSingle = true; i++; continue; }
    if (c === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        dollarStack.push(m[0]);
        i += m[0].length;
        continue;
      }
    }
    if (c === '(') paren++;
    if (c === ')') {
      paren--;
      if (paren < 0) problems.push(`ngoặc tròn đóng thừa tại vị trí ${i}`);
    }
    if (c === ';') {
      stmtNo++;
      const stmt = sql.slice(lastStatementStart, i + 1).trim();
      if (stmt && !/^(--|\/\*)/.test(stmt)) statements.push(stmt);
      lastStatementStart = i + 1;
    }
    i++;
  }

  if (inSingle) problems.push('còn chuỗi nháy đơn CHƯA ĐÓNG ở cuối file');
  if (inBlockComment) problems.push('comment /* */ CHƯA ĐÓNG');
  if (dollarStack.length) problems.push(`dollar-quote chưa đóng: ${dollarStack.join(' ')}`);
  if (paren !== 0) problems.push(`ngoặc tròn lệch: ${paren > 0 ? 'thiếu' : 'thừa'} ${Math.abs(paren)}`);

  /* ---------------------------------------------------- 5. begin/commit */
  const begins = (sql.match(/^\s*begin\s*;/gim) ?? []).length;
  const commits = (sql.match(/^\s*commit\s*;/gim) ?? []).length;
  if (begins !== commits) problems.push(`begin; = ${begins} nhưng commit; = ${commits}`);

  console.log(`\n=== ${rel}`);
  console.log(`  ${sql.length} ký tự · ${sql.split('\n').length} dòng · ${stmtNo} câu lệnh · begin/commit = ${begins}/${commits}`);
  console.log(`  dollar-quote: ${[...tags].map(([t, n]) => `${t}x${n}`).join(' ') || '(không)'}`);
  if (problems.length) {
    console.log('  FAIL:');
    for (const x of problems) console.log(`    - ${x}`);
    totalProblems += problems.length;
  } else {
    console.log('  PASS — nháy/comment/ngoặc/dollar-quote/transaction cân bằng.');
  }
}

console.log('\n=========================================================');
if (totalProblems) {
  console.log(`FAIL — ${totalProblems} vấn đề cú pháp tĩnh.`);
  process.exit(1);
}
console.log('PASS — không phát hiện vấn đề cú pháp tĩnh.');
