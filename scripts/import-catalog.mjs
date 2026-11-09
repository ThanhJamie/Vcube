#!/usr/bin/env node
/**
 * import-catalog.mjs — nhập catalog THẬT (materials / printer_fleet / accessories) từ JSON.
 *
 * Nguồn: `scripts/catalog/{materials,printer_fleet,accessories}.json` (template sinh từ DB).
 * Mỗi file là mảng object; `_`-prefixed keys bị bỏ qua; `id` là khoá upsert.
 *
 * Dùng:
 *   node scripts/import-catalog.mjs            # dry-run: validate + in tóm tắt
 *   node scripts/import-catalog.mjs --apply    # upsert thật (service key, server-side)
 *
 * An toàn:
 *   - Từ chối mọi `name` còn chứa `[MẪU]` hoặc rỗng.
 *   - Không in secret; chỉ in URL project + số dòng.
 *   - Không xoá dòng nào (chỉ upsert).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TABLES = ['materials', 'printer_fleet', 'accessories'];
const APPLY = process.argv.includes('--apply');

function readEnv() {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Thiếu VITE_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env');
  process.exit(2);
}

function load(table) {
  const p = join(ROOT, 'scripts', 'catalog', `${table}.json`);
  if (!existsSync(p)) {
    console.error(`Không thấy ${p} — chạy bước tạo template trước.`);
    process.exit(2);
  }
  const rows = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(rows)) throw new Error(`${table}.json phải là mảng`);
  return rows
    .map((r) => {
      const o = {};
      for (const [k, v] of Object.entries(r)) {
        if (k.startsWith('_') || k === 'created_at' || k === 'updated_at') continue;
        o[k] = v;
      }
      return o;
    })
    .filter((r) => Object.keys(r).length > 0);
}

const problems = [];
const payload = {};
for (const table of TABLES) {
  const rows = load(table);
  payload[table] = rows;
  rows.forEach((r, i) => {
    if (!r.id) problems.push(`${table}[${i}]: thiếu id`);
    if (!r.name || !String(r.name).trim()) problems.push(`${table}[${i}] (${r.id}): thiếu name`);
    else if (String(r.name).includes('[MẪU]')) problems.push(`${table}[${i}] (${r.id}): name còn [MẪU]`);
    else if (/demo/i.test(String(r.name))) problems.push(`${table}[${i}] (${r.id}): name còn chữ "demo"`);
  });
}

console.log(`Project: ${url}`);
for (const table of TABLES) {
  const rows = payload[table];
  const stillDemo = rows.filter((r) => String(r.name || '').includes('[MẪU]')).length;
  console.log(`- ${table}: ${rows.length} dòng${stillDemo ? ` (${stillDemo} còn [MẪU])` : ''}`);
}

if (problems.length) {
  console.error('\n✖ Không hợp lệ:');
  for (const p of problems.slice(0, 30)) console.error('  - ' + p);
  if (problems.length > 30) console.error(`  … và ${problems.length - 30} lỗi nữa`);
  process.exit(3);
}

if (!APPLY) {
  console.log('\nDRY-RUN — chưa ghi DB. Điền giá trị thật vào scripts/catalog/*.json rồi thêm --apply.');
  process.exit(0);
}

async function upsert(table, rows) {
  const res = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${table}: HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  const body = await res.json().catch(() => []);
  return Array.isArray(body) ? body.length : rows.length;
}

for (const table of TABLES) {
  try {
    const n = await upsert(table, payload[table]);
    console.log(`✔ ${table}: upsert ${n} dòng`);
  } catch (err) {
    console.error(`✖ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(4);
  }
}

console.log('\nXong. Chạy `npm run po:audit` để xác nhận dataHonesty.');
