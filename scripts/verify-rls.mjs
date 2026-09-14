#!/usr/bin/env node
/**
 * VCUBE — kiểm chứng RLS bằng anon key (đúng như một khách vãng lai).
 *
 * Mục đích: chứng minh bằng thực nghiệm rằng anon KHÔNG đọc/ghi được dữ liệu
 * không thuộc quyền. Chạy TRƯỚC khi hardening để thấy lỗ hổng, chạy SAU để xác nhận.
 *
 * Nguyên tắc an toàn của script:
 *   - chỉ ĐẾM, không bao giờ in nội dung bản ghi (tránh lộ PII vào log/terminal)
 *   - mặc định chỉ đọc; các phép thử ghi phải bật bằng --writes và là no-op
 *     (UPDATE cột về chính giá trị cũ), không tạo/xoá dữ liệu
 *
 * Dùng:
 *   node scripts/verify-rls.mjs            # kiểm tra đọc
 *   node scripts/verify-rls.mjs --writes   # thêm phép thử ghi (không phá dữ liệu)
 *   node scripts/verify-rls.mjs --json
 * Thoát code 1 nếu có bất kỳ FAIL.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/* ------------------------------------------------------------------ cấu hình */
function parseEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, '');
    out[m[1]] = v;
  }
  return out;
}

function looksLikePlaceholder(v) {
  if (!v) return true;
  return /your-|MY_|example\.com|CHANGE_ME/i.test(v) || v.length < 40;
}

function fromClientTs() {
  // Fallback: URL + anon key đang hardcode trong client (chính là một phần của vấn đề,
  // nhưng cũng là giá trị duy nhất chạy được khi .env còn placeholder).
  const src = readFileSync(resolve(root, 'src/backend/supabase/client.ts'), 'utf8');
  const url = src.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
  const key = src.match(/eyJ[A-Za-z0-9_.-]{40,}/)?.[0];
  return { url, key };
}

const env = parseEnv(resolve(root, '.env'));
let url = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
// Tên khoá THẬT của project là VITE_SUPABASE_PUBLISHABLE_KEY (sb_publishable_…); giữ các tên
// cũ để tương thích ngược.
let key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || env.VITE_SUPABASE_ANON_KEY;
let source = '.env';

if (looksLikePlaceholder(url) || looksLikePlaceholder(key)) {
  const fallback = fromClientTs();
  if (fallback.url && fallback.key) {
    url = fallback.url;
    key = fallback.key;
    source = 'src/backend/supabase/client.ts (hardcode)';
  }
}

if (!url || !key) {
  console.error('Không tìm được Supabase URL / anon key. Điền .env rồi chạy lại.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Khoá secret (server-only) để phân biệt "bảng RỖNG" với "bảng KHÔNG TỒN TẠI": cả hai đều cho
// anon 0 dòng, nên nếu CHỈ dò anon thì script báo "đạt" một cách vô nghĩa. KHÔNG in khoá ra.
const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseSecret = secretKey
  ? createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const projectRef = url.replace(/^https:\/\//, '').split('.')[0];

/* ------------------------------------------------------------------ tiện ích */
const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
}
const nf = (n) => (typeof n === 'number' ? n.toLocaleString('vi-VN') : String(n));

// LƯU Ý: KHÔNG dùng { head: true } để kiểm tra — với bảng không tồn tại/không có quyền,
// PostgREST trả HTTP 204 kèm count=null và error=null, tức là "thành công rỗng" và sẽ
// tạo ra PASS giả. Dùng select có limit để lỗi (404/401) nổi lên thành error thật.
async function countRows(table, build) {
  let q = supabase.from(table).select('id', { count: 'exact' }).limit(1);
  if (build) q = build(q);
  const { count, error, status } = await q;
  return { count, error, status };
}

/** Đếm dòng bằng MỘT client bất kỳ (anon hoặc secret). Dùng `select('*')` nên không phụ
 *  thuộc tên cột khoá — có bảng khoá là `partner_id` chứ không phải `id`. */
async function countRowsOn(client, table, build) {
  let q = client.from(table).select('*', { count: 'exact' }).limit(1);
  if (build) q = build(q);
  const { count, error, status } = await q;
  return { count, error, status };
}

/**
 * Dò một bảng bằng HAI khoá: `secret` (bỏ qua RLS) để chứng minh bảng CÓ THẬT, và `anon`
 * (chịu RLS) để khẳng định khách KHÔNG đọc được. Nhờ vậy "0 dòng" KHÔNG bị nhầm với "bảng
 * chưa được tạo" (PGRST205) — đúng lớp lỗi "RLS bật nhưng 0 policy" (deny-all) từng làm hỏng
 * việc lưu báo giá mà chỉ dò anon thì không phát hiện được.
 */
async function expectZeroTwoKey(label, table, build, hint) {
  let sDetail = 'không có khoá secret để đối chiếu';
  if (supabaseSecret) {
    const s = await countRowsOn(supabaseSecret, table, build);
    if (skipIfMissing(label, s.error)) return;   // bảng chưa tồn tại (chưa áp migration)
    if (s.error) {
      record(label, 'UNKNOWN', `khoá secret không đọc được: ${s.error.code || ''} ${s.error.message}`.trim());
      return;
    }
    sDetail = `secret ${nf(s.count)} dòng (bảng có thật)`;
  }
  const a = await countRowsOn(supabase, table, build);
  if (skipIfMissing(label, a.error)) return;
  if (a.error) {
    record(label, 'PASS', `bị chặn: ${a.error.code || ''} — ${sDetail}`.trim());
    return;
  }
  if (a.count === null || a.count === undefined) {
    record(label, 'UNKNOWN', `không xác định được số dòng — ${sDetail}`);
  } else if (a.count === 0) {
    record(label, 'PASS', `0 dòng — ${sDetail}`);
  } else {
    record(label, 'FAIL', `anon đọc được ${nf(a.count)} dòng — ${sDetail} — ${hint}`);
  }
}

function skipIfMissing(label, error) {
  if (!error) return false;
  if (/does not exist|Could not find the table|PGRST205|42P01/i.test(error.message)) {
    record(label, 'SKIP', `bảng không tồn tại (${error.code || 'n/a'})`);
    return true;
  }
  return false;
}

async function expectZero(label, table, build, hint) {
  const { count, error } = await countRows(table, build);
  if (skipIfMissing(label, error)) return;
  if (error) {
    // Lỗi quyền cũng là kết quả an toàn
    record(label, 'PASS', `bị chặn: ${error.code || ''} ${error.message}`.trim());
    return;
  }
  if (count === null || count === undefined) {
    record(label, 'UNKNOWN', `không xác định được số dòng (HTTP ${status}) — coi như CHƯA kiểm chứng`);
  } else if (count === 0) {
    record(label, 'PASS', '0 dòng');
  } else {
    record(label, 'FAIL', `${nf(count)} dòng đọc được — ${hint}`);
  }
}

async function expectPositive(label, table, build) {
  const { count, error } = await countRows(table, build);
  if (skipIfMissing(label, error)) return;
  if (error) {
    record(label, 'FAIL', `không đọc được: ${error.message}`);
    return;
  }
  if (count === null || count === undefined) {
    record(label, 'UNKNOWN', `không xác định được số dòng (HTTP ${status})`);
  } else if (count > 0) {
    record(label, 'PASS', `${nf(count)} dòng (app cần dữ liệu này)`);
  } else {
    record(label, 'INFO', '0 dòng — kiểm tra lại seed/dữ liệu, không phải lỗi RLS');
  }
}

/* ------------------------------------------------------------------ 1. ĐỌC: phải bị chặn */
await expectZero('anon đọc orders', 'orders', null, 'rò dữ liệu đơn hàng (tên/SĐT/địa chỉ/token)');
await expectZero('anon đọc user_profiles', 'user_profiles', null, 'rò dữ liệu cá nhân (email/SĐT/KYC)');
await expectZero('anon đọc payment_transactions', 'payment_transactions', null, 'rò giao dịch thanh toán');
await expectZero('anon đọc material_inventory_logs', 'material_inventory_logs', null, 'rò log kho nội bộ');
await expectZero('anon đọc cost_rules', 'cost_rules', null, 'rò cấu hình giá vốn');
await expectZero(
  'anon đọc products chưa publish',
  'products',
  (q) => q.not('status', 'in', '("published","Published")'),
  'sản phẩm nháp/bị khoá vẫn công khai'
);

/* ------------------------------------------------------------------ 2. ĐỌC: app cần được phép */
await expectPositive('anon đọc products đã publish', 'products', (q) =>
  q.in('status', ['published', 'Published'])
);
await expectPositive('anon đọc materials', 'materials', null);
await expectPositive('anon đọc printer_fleet', 'printer_fleet', null);
await expectPositive('anon đọc pricing_configs', 'pricing_configs', null);

/* ------------------------------------------------------------------ 3. RPC tra cứu đơn */
try {
  const { data, error } = await supabase.rpc('get_order_by_guest_token', {
    p_order_number: '__rls_probe_nonexistent__',
    p_token: '__wrong_token__',
  });
  if (error) {
    if (/does not exist|PGRST202/i.test(error.message)) record('RPC tra cứu đơn (token sai)', 'SKIP', 'hàm chưa tồn tại');
    else record('RPC tra cứu đơn (token sai)', 'PASS', `bị chặn: ${error.message}`);
  } else if (!data || data.length === 0) {
    record('RPC tra cứu đơn (token sai)', 'PASS', '0 dòng');
  } else {
    record('RPC tra cứu đơn (token sai)', 'FAIL', `trả ${data.length} dòng với token sai`);
  }
} catch (e) {
  record('RPC tra cứu đơn (token sai)', 'INFO', String(e?.message ?? e));
}

/* ------------------------------------------------------------------ 4. Storage */
for (const [bucket, expectBlocked] of [
  ['cad-files', true],
  ['product-images', false],
]) {
  const label = `storage: liệt kê ${bucket}`;
  try {
    const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
    if (error) {
      record(label, expectBlocked ? 'PASS' : 'INFO', `bị chặn: ${error.message}`);
    } else if (!data || data.length === 0) {
      record(label, 'PASS', '0 file');
    } else {
      record(label, expectBlocked ? 'FAIL' : 'INFO', `${data.length} file liệt kê được`);
    }
  } catch (e) {
    record(label, 'INFO', String(e?.message ?? e));
  }
}

/* ------------------------------------------------------------------ 5. GHI (tuỳ chọn, no-op) */
/* --------------------- 1b. ĐỌC: bảng của Đợt 10/Đợt 25 — anon PHẢI bị chặn
 * Mỗi bảng dò bằng HAI khoá (secret chứng minh bảng có thật, anon chứng minh bị chặn), nên
 * lớp lỗi "RLS bật nhưng 0 policy" (deny-all) KHÔNG còn lọt. Đây là phép kiểm CHỐNG TÁI DIỄN
 * RÒ RỈ — cần tồn tại vĩnh viễn trong repo.
 */
await expectZeroTwoKey('anon đọc order_items', 'order_items', null,
  'lộ dòng tiền của đơn (platform_fee_amount / payout)');
await expectZeroTwoKey('anon đọc workshop_commission_terms', 'workshop_commission_terms', null,
  'LỘ CHIẾT KHẤU ĐÀM PHÁN riêng của từng đối tác — bảng chỉ admin');
await expectZeroTwoKey('anon đọc quotes', 'quotes', null, 'lộ báo giá của khách');
await expectZeroTwoKey('anon đọc kyc_records', 'kyc_records', null, 'lộ PII hồ sơ KYC');
await expectZeroTwoKey('anon đọc cart_items', 'cart_items', null, 'lộ giỏ hàng của khách');
await expectZeroTwoKey('anon đọc digital_assets', 'digital_assets', null,
  'lộ storage_path — đường lấy file số');
await expectZeroTwoKey('anon đọc reviews chưa published', 'reviews',
  (q) => q.neq('status', 'published'), 'anon đọc được đánh giá pending/hidden');
await expectZeroTwoKey('anon đọc workshop_profiles Pending', 'workshop_profiles',
  (q) => q.eq('verified_status', 'Pending'), 'lộ hồ sơ xưởng chưa được duyệt');
if (process.argv.includes('--writes')) {
  const { data: sample, error: readErr } = await supabase
    .from('products')
    .select('id, updated_at')
    .limit(1);

  if (readErr || !sample?.length) {
    record('anon ghi products (no-op update)', 'SKIP', 'không lấy được 1 id để thử');
  } else {
    const row = sample[0];
    const { data, error } = await supabase
      .from('products')
      .update({ updated_at: row.updated_at })   // ghi lại đúng giá trị cũ
      .eq('id', row.id)
      .select('id');

    if (error) record('anon ghi products (no-op update)', 'PASS', `bị chặn: ${error.message}`);
    else if (!data || data.length === 0) record('anon ghi products (no-op update)', 'PASS', '0 dòng cập nhật được');
    else record('anon ghi products (no-op update)', 'FAIL', `cập nhật được ${data.length} dòng — anon có quyền ghi`);
  }
}

/* ------------------------------------------------------------------ báo cáo */
// Preflight: xác nhận project trả lời và schema đã tồn tại.
try {
  const { error: pfErr } = await supabase.from('products').select('id').limit(1);
  if (pfErr && /PGRST205|does not exist|Could not find the table/i.test(pfErr.message)) {
    console.log('!! CẢNH BÁO: project này CHƯA có schema VCUBE (không tìm thấy public.products).');
    console.log('   Kết quả bên dưới chỉ có nghĩa sau khi đã áp migration tạo schema.');
    console.log('');
  }
} catch (e) {
  console.log(`!! Không kết nối được Supabase: ${e?.message ?? e}`);
  console.log('');
}

const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL');
const skip = results.filter((r) => r.status === 'SKIP').length;
const info = results.filter((r) => r.status === 'INFO').length;
const unknown = results.filter((r) => r.status === 'UNKNOWN').length;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ projectRef, source, results, summary: { pass, fail: fail.length, skip, info, unknown } }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`VCUBE RLS verification — project ${projectRef}`);
  console.log(`Nguồn thông tin kết nối: ${source}`);
  console.log(`Chế độ ghi: ${process.argv.includes('--writes') ? 'CÓ (no-op update)' : 'không (chỉ đọc)'}`);
  console.log('-'.repeat(96));
  console.log(pad('KIỂM TRA', 40) + pad('KẾT QUẢ', 10) + 'CHI TIẾT');
  console.log('-'.repeat(96));
  for (const r of results) {
    const mark = r.status;
    console.log(pad(r.name, 40) + pad(mark, 10) + r.detail);
  }
  console.log('-'.repeat(96));
  console.log(`${pass} PASS · ${fail.length} FAIL · ${skip} SKIP · ${info} INFO`);
  if (fail.length) {
    console.log('');
    console.log('VI PHẠM:');
    for (const f of fail) console.log(`  - ${f.name}: ${f.detail}`);
    console.log('');
    console.log('Khắc phục: chạy supabase/migrations/20261010_harden_rls.sql trong Supabase SQL Editor,');
    console.log('sau đó supabase/scripts/bootstrap_admin.sql, rồi chạy lại script này.');
  }
}

process.exit(fail.length || unknown ? 1 : 0);


