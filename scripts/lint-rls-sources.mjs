#!/usr/bin/env node
/**
 * Quét TOÀN BỘ supabase/migrations/*.sql để chặn các anti-pattern RLS đã gây ra
 * lỗ hổng của VCUBE. Đây là gate thay cho việc chạy thật trên database.
 *
 * Vi phạm bị chặn:
 *   R1 policy dùng user_metadata trong biểu thức quyền (client tự ghi được)
 *   R2 email admin hardcode trong migration
 *   R3 policy FOR ALL ... USING (true)  (ai cũng ghi được)
 *   R4 policy bất kỳ ... USING (true) trên orders / user_profiles (rò PII)
 *   R5 WITH CHECK (true) trên bảng ghi công khai (orders, payment_transactions,
 *      material_inventory_logs, kyc_records)
 *   R6 dollar-quote không cân bằng (script bị cắt âm thầm)
 *   R7 dùng public.is_admin() nhưng thiếu file helper chạy trước
 *
 * Usage: node scripts/lint-rls-sources.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const CHAIN_DIR = resolve(root, 'supabase/migrations');   // chuỗi sẽ chạy
const LEGACY_DIR = resolve(root, 'supabase/legacy');      // chỉ tham chiếu

const files = readdirSync(CHAIN_DIR).filter((f) => f.endsWith('.sql')).sort();
const legacyFiles = existsSync(LEGACY_DIR)
  ? readdirSync(LEGACY_DIR).filter((f) => f.endsWith('.sql')).sort()
  : [];

const WRITE_TABLES = ['orders', 'payment_transactions', 'material_inventory_logs', 'kyc_records'];
const PII_TABLES = ['orders', 'user_profiles'];

function stripComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((l) => !/^\s*--/.test(l))
    .map((l) => l.replace(/\s--\s.*$/, ''))
    .join('\n');
}

const violations = [];
const stats = [];

for (const file of files) {
  const raw = readFileSync(join(CHAIN_DIR, file), 'utf8');
  const code = stripComments(raw);

  // R6 — dollar quote balance
  const counts = new Map();
  for (const m of code.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)?\$/g)) {
    counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  }
  for (const [tag, n] of counts) {
    if (n % 2 !== 0) violations.push(`${file}: R6 dollar-quote ${tag} lẻ (${n})`);
  }

  // R2 — email hardcode
  if (/chithanhso10@gmail\.com/.test(code)) {
    violations.push(`${file}: R2 còn email admin hardcode`);
  }

  const statements = code.split(';');
  let policyCount = 0;

  for (const st of statements) {
    const s = st.trim();
    if (!/^create policy/i.test(s)) continue;
    policyCount++;

    const name = s.match(/create policy\s+"?([^"\n]+)"?/i)?.[1]?.trim() ?? '(không rõ)';
    const onTable = s.match(/\bon\s+(?:public\.|storage\.)?([a-z_]+)/i)?.[1] ?? '';
    const isAll = /\bfor all\b/i.test(s);
    const isSelect = /\bfor select\b/i.test(s);
    const usingTrue = /using\s*\(\s*true\s*\)/i.test(s);
    const checkTrue = /with check\s*\(\s*true\s*\)/i.test(s);

    if (/user_metadata/.test(s)) {
      violations.push(`${file}: R1 policy "${name}" dùng user_metadata`);
    }
    if (isAll && usingTrue) {
      violations.push(`${file}: R3 policy "${name}" trên ${onTable} là FOR ALL USING (true)`);
    }
    if (usingTrue && PII_TABLES.includes(onTable)) {
      violations.push(`${file}: R4 policy "${name}" mở USING (true) trên bảng PII ${onTable}`);
    }
    if (checkTrue && WRITE_TABLES.includes(onTable)) {
      violations.push(`${file}: R5 policy "${name}" có WITH CHECK (true) trên ${onTable}`);
    }
    if (isSelect && usingTrue && onTable === 'products' && !/status/i.test(s)) {
      violations.push(`${file}: R4 policy "${name}" cho products đọc mọi status`);
    }
  }

  const usesHelper = /public\.is_admin\(\)/.test(code);
  stats.push({ file, policies: policyCount, usesHelper });
}

// Quét thêm thư mục legacy (không chạy, nhưng vẫn phải sạch anti-pattern)
for (const file of legacyFiles) {
  const code = stripComments(readFileSync(join(LEGACY_DIR, file), 'utf8'));
  if (/chithanhso10@gmail\.com/.test(code)) violations.push(`legacy/${file}: R2 còn email admin hardcode`);
  for (const st of code.split(';')) {
    const s = st.trim();
    if (!/^create policy/i.test(s)) continue;
    const name = s.match(/create policy\s+"?([^"\n]+)"?/i)?.[1]?.trim() ?? '(không rõ)';
    const onTable = s.match(/\bon\s+(?:public\.|storage\.)?([a-z_]+)/i)?.[1] ?? '';
    if (/user_metadata/.test(s)) violations.push(`legacy/${file}: R1 policy "${name}" dùng user_metadata`);
    if (/\bfor all\b/i.test(s) && /using\s*\(\s*true\s*\)/i.test(s)) violations.push(`legacy/${file}: R3 policy "${name}" FOR ALL USING (true) trên ${onTable}`);
    if (/with check\s*\(\s*true\s*\)/i.test(s) && WRITE_TABLES.includes(onTable)) violations.push(`legacy/${file}: R5 policy "${name}" WITH CHECK (true) trên ${onTable}`);
  }
}

// R7 — helper phải tồn tại và chạy trước mọi file dùng nó
const helperIdx = files.findIndex((f) => /rls_helpers/.test(f));
if (helperIdx === -1) {
  violations.push('R7 thiếu file supabase/migrations/*_rls_helpers.sql');
} else {
  for (let i = 0; i < files.length; i++) {
    if (stats[i].usesHelper && i < helperIdx) {
      violations.push(`R7 ${files[i]} dùng public.is_admin() nhưng chạy TRƯỚC file helper`);
    }
  }
}

console.log(`Quét ${files.length} file trong supabase/migrations/ (chuỗi chạy) + ${legacyFiles.length} file trong supabase/legacy/ (tham chiếu)`);
console.log('');
console.log('FILE'.padEnd(52) + 'POLICY'.padEnd(10) + 'is_admin()');
console.log('-'.repeat(74));
for (const s of stats) {
  console.log(s.file.padEnd(52) + String(s.policies).padEnd(10) + (s.usesHelper ? 'có' : '-'));
}
console.log('-'.repeat(74));

if (violations.length) {
  console.log('');
  console.log(`FAIL — ${violations.length} vi phạm:`);
  for (const v of violations) console.log(`  - ${v}`);
  process.exit(1);
}
console.log('');
console.log('PASS — không còn anti-pattern RLS trong migration.');

