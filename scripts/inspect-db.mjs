#!/usr/bin/env node
/**
 * VCUBE — kiểm tra trạng thái database Supabase.
 *
 * Với mỗi bảng, so sánh số dòng đọc được bằng:
 *   - publishable key (đúng như trình duyệt/khách vãng lai, CHỊU RLS)
 *   - secret key      (bỏ qua RLS — số dòng thật)
 * Nhờ đó biết ngay: bảng có tồn tại không, và RLS có đang chặn không.
 *
 * An toàn: chỉ đếm, KHÔNG in nội dung bản ghi.
 * Dùng: node scripts/inspect-db.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = parseEnv(resolve(root, '.env'));
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const pub = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sec = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !pub) {
  console.error('Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY trong .env');
  process.exit(1);
}

const client = (key) =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const pubSb = client(pub);
const secSb = sec ? client(sec) : null;

async function probe(sb, table) {
  if (!sb) return { state: 'n/a' };
  const { count, error, status } = await sb.from(table).select('*', { count: 'exact' }).limit(1);
  if (error) {
    const missing = /PGRST205|does not exist|Could not find the table/i.test(error.message);
    return { state: missing ? 'missing' : 'error', status, code: error.code, message: error.message };
  }
  return { state: 'ok', status, count };
}

const TABLES = [
  { name: 'products', sensitive: false },
  { name: 'orders', sensitive: true },
  { name: 'user_profiles', sensitive: true },
  { name: 'payment_transactions', sensitive: true },
  { name: 'cost_rules', sensitive: true },
  { name: 'material_inventory_logs', sensitive: true },
  { name: 'materials', sensitive: false },
  { name: 'printer_fleet', sensitive: false },
  { name: 'pricing_configs', sensitive: false },
  { name: 'pricing_config', sensitive: false },
  { name: 'site_content', sensitive: false },
  { name: 'accessories', sensitive: false },
  { name: 'workshop_partners', sensitive: false },
  { name: 'workshop_profiles', sensitive: false },
  { name: 'designer_profiles', sensitive: false },
  // Yeu cau "moi thu chinh duoc trong admin" (docs/plans/09-admin-settings.md).
  // `setting_audit` va `warranty_claims` la du lieu noi bo/PII ⇒ sensitive: true
  // (publishable phai bi RLS chan, secret phai doc duoc).
  { name: 'app_settings', sensitive: false },
  { name: 'setting_audit', sensitive: true },
  { name: 'warranty_claims', sensitive: true },
  { name: 'order_files', sensitive: false },
  // --- Đợt 10 / Đợt 25 + các bảng trước đây bị BỎ SÓT khỏi danh sách đối chiếu ---
  // (Bỏ sót ⇒ script in "N/N bảng tồn tại" mà không hề nhìn tới bảng mới ⇒ "đạt" vô nghĩa.)
  { name: 'quotes', sensitive: true },
  { name: 'kyc_records', sensitive: true },
  { name: 'order_items', sensitive: true },
  { name: 'workshop_commission_terms', sensitive: true },
  { name: 'reviews', sensitive: false },   // bản `published` CÔNG KHAI theo thiết kế; phép kiểm
                                           // chặt hơn (pending/hidden) nằm ở verify-rls.mjs
  { name: 'digital_assets', sensitive: true },
  { name: 'cart_items', sensitive: true },
  { name: 'pricing_global_settings', sensitive: false },
  { name: 'customer_profiles', sensitive: true },
  { name: 'workshop_machines', sensitive: false },
  { name: 'workshop_materials', sensitive: false },
  { name: 'workshop_accessories', sensitive: false },
];

console.log(`Project: ${url.replace('https://', '')}`);
console.log(`Khoá publishable: ${pub.slice(0, 22)}… (${pub.length} ký tự)`);
console.log(`Khoá secret: ${sec ? `${sec.slice(0, 12)}… (có)` : 'KHÔNG có trong .env'}`);
console.log('-'.repeat(100));
console.log('BẢNG'.padEnd(26) + 'PUBLISHABLE'.padEnd(26) + 'SECRET (bỏ RLS)'.padEnd(24) + 'KẾT LUẬN');
console.log('-'.repeat(100));

/* Số bảng của SCHEMA được SUY RA ĐỘNG từ file migration — bài học T3: đừng hardcode con số để
 * rồi trôi. `TABLES` ở trên chỉ là DANH SÁCH ĐỐI CHIẾU (có cả view `pricing_config`), KHÔNG
 * phải toàn bộ schema; in rõ cả hai để không ai đọc nhầm "N/N" là "schema đã đủ". */
function schemaTableNames() {
  try {
    const sql = readFileSync(resolve(root, 'supabase/migrations/20260901_baseline_schema.sql'), 'utf8');
    const found = new Set();
    for (const m of sql.matchAll(/create table if not exists public\.([a-z_]+)/g)) found.add(m[1]);
    return [...found].sort();
  } catch {
    return null;
  }
}
const SCHEMA_TABLES = schemaTableNames();
let missing = 0;
let leaks = 0;

for (const t of TABLES) {
  const a = await probe(pubSb, t.name);
  const b = await probe(secSb, t.name);

  let colA;
  if (a.state === 'missing') { colA = 'không tồn tại'; missing++; }
  else if (a.state === 'error') colA = `lỗi ${a.code ?? a.status}`;
  else colA = `${a.count} dòng`;

  let colB;
  if (!secSb) colB = '—';
  else if (b.state === 'missing') colB = 'không tồn tại';
  else if (b.state === 'error') colB = `lỗi ${b.code ?? b.status}`;
  else colB = `${b.count} dòng`;

  let verdict = '';
  if (t.sensitive && a.state === 'ok' && b.state === 'ok') {
    if (a.count === 0 && (b.count ?? 0) > 0) verdict = 'RLS chặn đúng ✓';
    else if ((a.count ?? 0) > 0 && (b.count ?? 0) > 0 && a.count === b.count) { verdict = 'HỞ — đọc được toàn bộ ✗'; leaks++; }
    else if ((a.count ?? 0) > 0) verdict = 'có dòng lộ ra ✗';
    else verdict = '(cả hai đều 0 dòng)';
  } else if (a.state === 'ok' && (a.count ?? 0) > 0) {
    verdict = 'đọc được (đúng thiết kế)';
  } else if (a.state === 'ok') {
    verdict = 'bảng rỗng';
  } else if (a.state === 'missing') {
    verdict = 'schema chưa có bảng này';
  } else {
    verdict = a.message ?? '';
  }

  console.log(
    t.name.padEnd(26) + colA.padEnd(26) + colB.padEnd(24) + verdict
  );
}

console.log('-'.repeat(100));
console.log(`${TABLES.length - missing}/${TABLES.length} muc trong DANH SACH DOI CHIEU ton tai · ${leaks} bang dang ho RLS`);
if (SCHEMA_TABLES) {
  const probed = new Set(TABLES.map((x) => x.name));
  const notProbed = SCHEMA_TABLES.filter((x) => !probed.has(x));
  console.log(`Schema khai bao ${SCHEMA_TABLES.length} bang (suy DONG tu 20260901_baseline_schema.sql) — danh sach doi chieu phu ${TABLES.length} muc.`);
  console.log(notProbed.length
    ? `Chua doi chieu: ${notProbed.join(', ')}`
    : 'Moi bang khai bao trong schema deu nam trong danh sach doi chieu.');
}

// RPC tra cứu đơn
try {
  const { data, error } = await pubSb.rpc('get_order_by_guest_token', {
    p_order_number: '__probe__', p_token: '__probe__',
  });
  console.log(`RPC get_order_by_guest_token: ${error ? `KHÔNG có (${error.code ?? error.message.slice(0, 60)})` : `có, trả ${data?.length ?? 0} dòng với token sai`}`);
} catch (e) {
  console.log(`RPC get_order_by_guest_token: lỗi ${String(e?.message ?? e).slice(0, 80)}`);
}

if (missing > 0) {
  console.log('');
  console.log('Kết luận: schema VCUBE chưa được áp lên project này.');
  console.log('→ Chạy các file trong supabase/migrations/ theo thứ tự tên file (xem docs/security/rls-runbook.md).');
}
process.exit(leaks ? 1 : 0);
