#!/usr/bin/env node
/**
 * Quét TOÀN BỘ supabase/migrations/*.sql (chuỗi chạy) + supabase/scripts/*.sql (script
 * vận hành: bootstrap_admin, apply_all_manual) + supabase/legacy/*.sql (tham chiếu) để
 * chặn các anti-pattern RLS đã gây ra lỗ hổng của VCUBE. Đây là gate thay cho việc chạy
 * thật trên database.
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
 *   R8 policy designer của custom_design_requests còn nhánh `designer_id is null`
 *      (mở PII/chợ việc cho MỌI authenticated — lỗ hổng SEC-02)
 *   R9 grant SELECT mức BẢNG (không kèm danh sách cột) trên designer_profiles cho anon/
 *      public — mở lại đúng lỗ hổng SEC-01 (3 cột bank_*, tax_id)
 *
 * Cảnh báo (advisory, KHÔNG chặn build):
 *   W1 view với `security_invoker = false` (definer view) — phải kiểm chỉ phơi cột an toàn
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
const SCRIPTS_DIR = resolve(root, 'supabase/scripts');    // script vận hành (bootstrap, file gộp)

const files = readdirSync(CHAIN_DIR).filter((f) => f.endsWith('.sql')).sort();
const legacyFiles = existsSync(LEGACY_DIR)
  ? readdirSync(LEGACY_DIR).filter((f) => f.endsWith('.sql')).sort()
  : [];
const scriptFiles = existsSync(SCRIPTS_DIR)
  ? readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith('.sql')).sort()
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
const warnings = [];
const stats = [];

/* R8 — biểu thức policy còn nhánh `designer_id is null` (SEC-02). Quét cả policy tạo
 * bằng `create policy` lẫn lời gọi `perform public._vcube_make_policy(...)` (harden 5.4l
 * tạo policy bằng helper). Chỉ soi câu lệnh POLICY, KHÔNG soi view/RPC vốn hợp lệ dùng
 * `designer_id is null` để chọn hàng chưa gán. */
const DESIGNER_NULL_RE = /designer_id\s+is\s+null/i;
const isPolicyStatement = (s) =>
  /^create\s+policy/i.test(s) || /^perform\s+public\._vcube_make_policy/i.test(s);
function findDesignerNullPolicies(sql) {
  const names = [];
  for (const raw of sql.split(';')) {
    const s = raw.trim();
    if (!isPolicyStatement(s) || !DESIGNER_NULL_RE.test(s)) continue;
    const name = s.match(/create\s+policy\s+"?([^"\n]+)"?/i)?.[1]?.trim()
      ?? s.match(/'[a-z0-9_]+'\s*,\s*'(vcube_[a-z0-9_]+)'/i)?.[1]
      ?? '(không rõ)';
    names.push(name);
  }
  return names;
}

/* W1 — view definer (`security_invoker = false`) là lựa chọn có ý thức (vd SEC-02) nhưng
 * bỏ qua RLS; liệt kê để thay đổi tương lai không đi kèm mà không ai thấy. */
function findDefinerViews(sql) {
  const names = [];
  const re = /create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?([a-z_][a-z0-9_]*)[\s\S]{0,200}?security_invoker\s*=\s*false/gi;
  let m;
  while ((m = re.exec(sql))) names.push(m[1]);
  return names;
}

/* R9 — grant SELECT mức BẢNG (KHÔNG kèm danh sách cột) trên designer_profiles cho anon/public.
 * Hotfix SEC-01 (20261011090000) phải dùng grant theo CỘT:
 *     grant select (id, display_name, …) on public.designer_profiles to anon, authenticated;
 * Nếu ai đó quay lại `grant select on public.designer_profiles to anon` thì 3 cột
 * bank_name/bank_account/tax_id lại lộ. Quét cả câu lệnh trực tiếp lẫn chuỗi trong
 * `execute '...'`. Danh sách cột bị loại khỏi `privs` (regex không cho `(`/`)`) nên grant
 * theo cột KHÔNG khớp. Chỉ chặn role `anon`/`public`: grant mức bảng cho `authenticated`
 * là hiện trạng TRƯỚC hotfix trong baseline_schema nên không thể coi là hồi quy ở đây. */
const DESIGNER_GRANT_RE = /\bgrant\s+([^;'"()]*?)\s+on\s+(?:"?public"?\s*\.\s*)?"?designer_profiles"?\s+to\s+([^;'"]+)/gi;
function findDesignerAnonGrants(sql) {
  const out = [];
  let m;
  DESIGNER_GRANT_RE.lastIndex = 0;
  while ((m = DESIGNER_GRANT_RE.exec(sql))) {
    const privs = m[1].toLowerCase();
    if (!/\bselect\b/.test(privs) && !/\ball\b/.test(privs)) continue;
    const roles = m[2].toLowerCase().split(/[,\s]+/).map((x) => x.replace(/"/g, '')).filter(Boolean);
    if (!roles.some((r) => r === 'anon' || r === 'public')) continue;
    out.push({ privs: m[1].trim(), roles: m[2].trim() });
  }
  return out;
}

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

  for (const n of findDesignerNullPolicies(code)) {
    violations.push(`${file}: R8 policy "${n}" còn nhánh "designer_id is null" — mở PII của custom_design_requests`);
  }
  for (const n of findDefinerViews(code)) {
    warnings.push(`${file}: W1 view "${n}" là DEFINER (security_invoker = false) — xác nhận chỉ phơi cột không nhạy cảm`);
  }
  for (const g of findDesignerAnonGrants(code)) {
    violations.push(`${file}: R9 grant SELECT mức bảng trên designer_profiles cho ${g.roles} — phải kèm danh sách cột (SEC-01)`);
  }
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
  for (const n of findDesignerNullPolicies(code)) {
    violations.push(`legacy/${file}: R8 policy "${n}" còn nhánh "designer_id is null"`);
  }
}

// Quét thêm supabase/scripts/*.sql (bootstrap_admin, apply_all_manual…) — cùng bộ luật
// R1–R6. Đây là các script người dùng dán trực tiếp vào SQL Editor nên cũng phải sạch
// anti-pattern (SEC-03/SEC-06). File gộp nhúng nguyên văn migration nên kết quả PHẢI
// trùng chuỗi migration — nếu lệch tức generator đã bỏ sót/nhào nội dung.
const scriptStats = [];
for (const file of scriptFiles) {
  const label = `scripts/${file}`;
  const code = stripComments(readFileSync(join(SCRIPTS_DIR, file), 'utf8'));

  // R6 — dollar quote balance
  const counts = new Map();
  for (const m of code.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)?\$/g)) {
    counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  }
  for (const [tag, n] of counts) {
    if (n % 2 !== 0) violations.push(`${label}: R6 dollar-quote ${tag} lẻ (${n})`);
  }

  // R2 — email hardcode
  if (/chithanhso10@gmail\.com/.test(code)) {
    violations.push(`${label}: R2 còn email admin hardcode`);
  }

  let policyCount = 0;
  for (const st of code.split(';')) {
    const s = st.trim();
    if (!/^create policy/i.test(s)) continue;
    policyCount++;
    const name = s.match(/create policy\s+"?([^"\n]+)"?/i)?.[1]?.trim() ?? '(không rõ)';
    const onTable = s.match(/\bon\s+(?:public\.|storage\.)?([a-z_]+)/i)?.[1] ?? '';
    if (/user_metadata/.test(s)) {
      violations.push(`${label}: R1 policy "${name}" dùng user_metadata`);
    }
    if (/\bfor all\b/i.test(s) && /using\s*\(\s*true\s*\)/i.test(s)) {
      violations.push(`${label}: R3 policy "${name}" trên ${onTable} là FOR ALL USING (true)`);
    }
    if (/using\s*\(\s*true\s*\)/i.test(s) && PII_TABLES.includes(onTable)) {
      violations.push(`${label}: R4 policy "${name}" mở USING (true) trên bảng PII ${onTable}`);
    }
    if (/with check\s*\(\s*true\s*\)/i.test(s) && WRITE_TABLES.includes(onTable)) {
      violations.push(`${label}: R5 policy "${name}" WITH CHECK (true) trên ${onTable}`);
    }
    if (/\bfor select\b/i.test(s) && /using\s*\(\s*true\s*\)/i.test(s) && onTable === 'products' && !/status/i.test(s)) {
      violations.push(`${label}: R4 policy "${name}" cho products đọc mọi status`);
    }
  }

  // R7 — script là đơn vị độc lập (không có "file chạy trước" như chuỗi migration):
  // dùng public.is_admin() thì phải tự định nghĩa helper trong cùng file.
  const usesHelper = /public\.is_admin\(\)/.test(code);
  if (usesHelper && !/create\s+(or\s+replace\s+)?function\s+public\.is_admin/i.test(code)) {
    violations.push(`${label}: R7 dùng public.is_admin() nhưng không định nghĩa helper`);
  }

  for (const g of findDesignerAnonGrants(code)) {
    violations.push(`${label}: R9 grant SELECT mức bảng trên designer_profiles cho ${g.roles} — phải kèm danh sách cột (SEC-01)`);
  }

  scriptStats.push({ file: label, policies: policyCount, usesHelper });

  for (const n of findDesignerNullPolicies(code)) {
    violations.push(`${label}: R8 policy "${n}" còn nhánh "designer_id is null" — mở PII của custom_design_requests`);
  }
  for (const n of findDefinerViews(code)) {
    warnings.push(`${label}: W1 view "${n}" là DEFINER (security_invoker = false) — xác nhận chỉ phơi cột không nhạy cảm`);
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

console.log(`Quét ${files.length} file trong supabase/migrations/ (chuỗi chạy) + ${legacyFiles.length} file trong supabase/legacy/ (tham chiếu) + ${scriptFiles.length} file trong supabase/scripts/ (vận hành)`);
console.log('');
console.log('FILE'.padEnd(52) + 'POLICY'.padEnd(10) + 'is_admin()');
console.log('-'.repeat(74));
for (const s of stats) {
  console.log(s.file.padEnd(52) + String(s.policies).padEnd(10) + (s.usesHelper ? 'có' : '-'));
}
for (const s of scriptStats) {
  console.log(s.file.padEnd(52) + String(s.policies).padEnd(10) + (s.usesHelper ? 'có' : '-'));
}
console.log('-'.repeat(74));

if (warnings.length) {
  console.log('');
  console.log(`CẢNH BÁO (advisory, không chặn build) — ${warnings.length}:`);
  for (const w of warnings) console.log(`  - ${w}`);
}

if (violations.length) {
  console.log('');
  console.log(`FAIL — ${violations.length} vi phạm:`);
  for (const v of violations) console.log(`  - ${v}`);
  process.exit(1);
}
console.log('');
console.log('PASS — không còn anti-pattern RLS trong migration.');

