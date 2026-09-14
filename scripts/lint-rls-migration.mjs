#!/usr/bin/env node
/**
 * Static linter for supabase/migrations/20261010_harden_rls.sql
 *
 * Catches failure classes that would otherwise only appear when the migration runs
 * against the real database — and that a `begin; ... commit;` rollback would hide:
 *
 *   1. unbalanced dollar-quote tags (silently truncates the script)
 *   2. a policy CREATED on a public table but missing from the step-9 keep list
 *      -> the sweep drops it again right after (silent policy loss)
 *   3. a keep-list entry that is never created (dead allowlist entry)
 *   4. a storage policy created but missing from the storage allowlist
 *   5. references to tables outside the declared target list
 *   6. begin; without commit;
 *
 * Loop-aware: `foreach t in array <list>` / `foreach t in array v_catalog_read` bodies
 * are resolved so `'vcube_' || t || '_suffix'` produces concrete policy names.
 *
 * Usage: node scripts/lint-rls-migration.mjs [path]     Exit 1 on any problem.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(here, '../supabase/migrations/20261010_harden_rls.sql');

const sql = readFileSync(file, 'utf8');
const problems = [];
const notes = [];

const uniq = (a) => [...new Set(a)];

/* ------------------------------------------------------------ 1. dollar quotes */
const counts = new Map();
for (const m of sql.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)?\$/g)) {
  counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
}
for (const [tag, n] of counts) {
  if (n % 2 !== 0) problems.push(`dollar-quote ${tag} xuất hiện ${n} lần (lẻ) — không cân bằng`);
}
notes.push(`dollar-quote: ${[...counts].map(([t, n]) => `${t}x${n}`).join(' ')}`);

/* ------------------------------------------------------------ resolve array variables */
const arrays = new Map();
for (const m of sql.matchAll(/v_([a-z_]+) text\[\] := array\[([\s\S]*?)\];/g)) {
  arrays.set(`v_${m[1]}`, uniq([...m[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1])));
}

/* ------------------------------------------------------------ 2. created policies (loop aware) */
const createdPublic = new Map(); // name -> table
const createdStorage = new Set();

// 2a. literal calls: _vcube_make_policy('table', 'policy', ...)
for (const m of sql.matchAll(/_vcube_make_policy\(\s*'([a-z_]+)'\s*,\s*'([a-z0-9_]+)'/gi)) {
  createdPublic.set(m[2], m[1]);
}

// 2b. loop bodies
for (const m of sql.matchAll(/foreach\s+t\s+in\s+array\s+([A-Za-z_][\w]*|array\[[^\]]*\])\s+loop([\s\S]*?)end loop;/gi)) {
  const src = m[1].trim();
  const body = m[2];
  const tables = src.startsWith('array[')
    ? uniq([...src.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]))
    : (arrays.get(src) ?? []);
  if (!tables.length) {
    problems.push(`không giải được danh sách bảng cho vòng lặp "${src}"`);
    continue;
  }
  const suffixes = uniq([...body.matchAll(/'vcube_'\s*\|\|\s*t\s*\|\|\s*'(_[a-z_]+)'/g)].map((x) => x[1]));
  const touchesPolicies = /_vcube_make_policy|create policy/i.test(body);
  if (!suffixes.length && touchesPolicies) {
    problems.push(`vòng lặp trên "${src}" có tạo policy nhưng không resolve được tên`);
  }
  for (const t of tables) for (const s of suffixes) createdPublic.set(`vcube_${t}${s}`, t);
}

// 2c. static create policy ... on <schema>.<table>
for (const m of sql.matchAll(/create policy\s+([a-z0-9_]+)\s+on\s+(storage\.objects|public\.[a-z_]+)/gi)) {
  const name = m[1];
  const target = m[2].toLowerCase();
  if (target.startsWith('storage')) createdStorage.add(name);
  else createdPublic.set(name, target.split('.')[1]);
}

/* ------------------------------------------------------------ 3. keep lists */
const keepBlock = sql.match(/v_keep text\[\] := array\[([\s\S]*?)\];/);
if (!keepBlock) {
  problems.push('không tìm thấy allowlist v_keep');
} else {
  const keep = new Set([...keepBlock[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]));
  for (const [name, table] of createdPublic) {
    if (!keep.has(name)) {
      problems.push(`policy "${name}" (trên public.${table}) được TẠO nhưng thiếu trong v_keep → bước 9 sẽ xoá nó`);
    }
    if (table && !createdPublic.get(name)) problems.push(`policy "${name}" thiếu bảng`);
  }
  for (const name of keep) {
    if (!createdPublic.has(name)) problems.push(`"${name}" có trong v_keep nhưng không được tạo (allowlist chết)`);
  }
  notes.push(`policy public: tạo ${createdPublic.size}, allowlist ${keep.size}`);
}

const storageKeep = sql.match(/v_ok text\[\] := array\[([\s\S]*?)\];/);
if (storageKeep) {
  const ok = new Set([...storageKeep[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]));
  for (const name of createdStorage) {
    if (!ok.has(name)) problems.push(`policy storage "${name}" được TẠO nhưng thiếu trong v_ok → sẽ bị bước 8.2 xoá`);
  }
  for (const name of ok) {
    if (!createdStorage.has(name)) problems.push(`policy storage "${name}" trong v_ok nhưng không được tạo`);
  }
  notes.push(`policy storage: tạo ${createdStorage.size}, allowlist ${ok.size}`);
} else if (createdStorage.size) {
  problems.push('có policy storage nhưng không tìm thấy allowlist v_ok');
}

/* ------------------------------------------------------------ 4. table references */
const targets = arrays.get('v_tables') ?? [];
const KNOWN = new Set([...targets, 'workshop_profiles', 'workshop_materials', 'orders']);
for (const m of sql.matchAll(/from public\.([a-z_]+)/gi)) {
  if (!KNOWN.has(m[1])) problems.push(`policy tham chiếu bảng ngoài danh sách: public.${m[1]}`);
}
notes.push(`bảng mục tiêu: ${targets.length}`);

/* ------------------------------------------------------------ 5. transaction + RLS enable */
if (!/^\s*begin\s*;/im.test(sql)) problems.push('thiếu begin; — migration không nguyên tử');
if (!/^\s*commit\s*;/im.test(sql)) problems.push('thiếu commit;');
const hasEnableLoop = /alter table public\.%I enable row level security/.test(sql);
const hasEnableStatic = /alter table public\.[a-z_]+ enable row level security/.test(sql);
if (!hasEnableLoop && !hasEnableStatic) problems.push('không thấy lệnh enable row level security nào');

/* ------------------------------------------------------------ R9: helper tạm trong policy */
// Biểu thức policy được lưu vào catalog và chạy ở MỌI truy vấn sau này. Nếu nó gọi
// một hàm tạm bị drop ở cuối migration thì policy sẽ vỡ lúc runtime (đã từng xảy ra
// với public._vcube_has_columns nhúng trong WITH CHECK của vcube_orders_guest_insert).
for (const m of sql.matchAll(/\$p\$([\s\S]*?)\$p\$/g)) {
  if (/_vcube_/.test(m[1])) {
    problems.push('R9 biểu thức policy ($p$…$p$) tham chiếu helper tạm _vcube_* — helper bị drop ở bước 10 ⇒ policy vỡ lúc runtime');
  }
}
/* ------------------------------------------------------------ R8: ALTER TABLE trên view */
// `alter table ... enable row level security` chỉ hợp lệ với bảng. Nếu vòng lặp
// không kiểm tra relkind thì sẽ lỗi 42809 khi danh sách có VIEW (đã từng xảy ra
// với public.pricing_config).
for (const block of sql.matchAll(/do \$do\$([\s\S]*?)\$do\$;/g)) {
  const body = block[1];
  if (/enable row level security/i.test(body) && !/relkind/i.test(body)) {
    problems.push('R8 có vòng lặp "enable row level security" nhưng KHÔNG kiểm tra relkind → sẽ lỗi 42809 nếu gặp view');
  }
  if (/alter table/i.test(body) && /relkind/i.test(body) === false && /foreach/i.test(body)) {
    problems.push('R8 vòng lặp ALTER TABLE động không kiểm tra relkind');
  }
}
/* ------------------------------------------------------------ report */
console.log(`File: ${file}`);
console.log(`Bytes: ${sql.length}, dòng: ${sql.split('\n').length}`);
for (const n of notes) console.log(`  · ${n}`);
if (problems.length) {
  console.log('');
  console.log(`FAIL — ${problems.length} vấn đề:`);
  for (const x of uniq(problems)) console.log(`  - ${x}`);
  process.exit(1);
}
console.log('');
console.log('PASS — không phát hiện vấn đề tĩnh.');



