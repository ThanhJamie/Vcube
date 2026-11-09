#!/usr/bin/env node
/**
 * db-query.mjs — chạy SQL lên Supabase qua Management API (không cần psql/CLI).
 *
 * Cần: SUPABASE_ACCESS_TOKEN trong `.env` (Personal Access Token, KHÔNG phải service key).
 *   Tạo tại https://supabase.com/dashboard/account/tokens
 *   Project ref lấy từ VITE_SUPABASE_URL.
 *
 * Dùng:
 *   node scripts/db-query.mjs --check
 *   node scripts/db-query.mjs --sql "select count(*) from public.orders"
 *   node scripts/db-query.mjs --file scripts/sql/x.sql --apply
 *
 * An toàn:
 *   - Không có `--apply` ⇒ chỉ in SQL (dry-run), KHÔNG gửi request.
 *   - `--check` chỉ chạy `select 1` và không in token.
 *   - Không log token; lỗi 401/403 in hướng dẫn tạo token.
 *
 * RC: 0 OK · 2 thiếu cấu hình · 3 lỗi API/SQL.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

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
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
const token = env.SUPABASE_ACCESS_TOKEN || '';
const ref = (url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '';

const isCheck = argv.includes('--check');
const apply = argv.includes('--apply');
const file = arg('--file');
const sqlArg = arg('--sql');

let sql = sqlArg || '';
if (file) {
  const p = join(ROOT, file);
  if (!existsSync(p)) {
    console.error(`Không tìm thấy file SQL: ${file}`);
    process.exit(2);
  }
  sql = readFileSync(p, 'utf8');
}

if (!sql && !isCheck) {
  console.error('Thiếu --sql hoặc --file. Ví dụ: node scripts/db-query.mjs --check');
  process.exit(2);
}

function missingSetup(reason) {
  console.error(`\n✖ ${reason}\n`);
  console.error('Thiết lập một lần:');
  console.error('  1) Tạo Personal Access Token: https://supabase.com/dashboard/account/tokens');
  console.error('  2) Thêm vào .env (KHÔNG commit):');
  console.error('       SUPABASE_ACCESS_TOKEN=sbp_…');
  console.error('  3) Kiểm tra: npm run db:check');
  console.error('\nToken này chỉ dùng server-side để chạy SQL; không đưa vào bundle/client.\n');
  process.exit(2);
}

if (!ref) missingSetup('Thiếu VITE_SUPABASE_URL hợp lệ trong .env (không suy ra được project ref).');
if (!token) missingSetup('Thiếu SUPABASE_ACCESS_TOKEN trong .env.');

const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function runQuery(query) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(120000),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

if (isCheck) {
  const r = await runQuery('select 1 as ok, current_database() as db, current_user as usr');
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      missingSetup(`Token bị từ chối (HTTP ${r.status}). Token sai/hết hạn hoặc không đủ quyền.`);
    }
    console.error(`✖ Kiểm tra thất bại (HTTP ${r.status}):`, JSON.stringify(r.body).slice(0, 400));
    process.exit(3);
  }
  console.log(`✔ Kết nối Supabase OK — project ${ref}`);
  console.log(JSON.stringify(r.body));
  process.exit(0);
}

if (!apply) {
  console.log('DRY-RUN — chưa gửi SQL. Thêm --apply để chạy thật.\n');
  console.log(sql);
  process.exit(0);
}

const started = Date.now();
const r = await runQuery(sql);
const ms = Date.now() - started;

if (!r.ok) {
  console.error(`✖ SQL thất bại (HTTP ${r.status}) sau ${ms}ms:`);
  console.error(typeof r.body === 'string' ? r.body : JSON.stringify(r.body, null, 2));
  process.exit(3);
}

console.log(`✔ SQL OK (${ms}ms)`);
if (Array.isArray(r.body) && r.body.length) {
  console.log(JSON.stringify(r.body.slice(0, 50), null, 2));
} else if (r.body) {
  console.log(JSON.stringify(r.body).slice(0, 800));
}
