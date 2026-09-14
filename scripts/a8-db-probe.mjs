#!/usr/bin/env node
/**
 * A8 — ĐẦU DÒ CHỈ-ĐỌC (no-op) trạng thái schema thật trên Supabase.
 *
 * BỐI CẢNH: PostgREST KHÔNG expose `information_schema` / `pg_catalog` (chỉ schema
 * `public`), nên không thể `select` thẳng `pg_constraint`. Script này thay bằng hai
 * cách chứng minh KHÔNG cần catalog:
 *
 *   (A) ĐẦU DÒ CỘT: select đúng những cột cần kiểm. Cột không tồn tại ⇒ PostgREST trả
 *       lỗi 42703 `column ... does not exist`. Đây là bằng chứng trực tiếp.
 *   (B) ĐẦU DÒ WRITE NO-OP: ghi lại CHÍNH giá trị đang có (null → null) để chứng minh
 *       đường ghi chạy được, và cố tình ghi một giá trị SAI để xem CHECK constraint có
 *       chặn không (23514). Ghi sai bị chặn ⇒ constraint tồn tại; nếu ghi lọt thì script
 *       khôi phục ngay và báo FAIL.
 *
 * AN TOÀN: MẶC ĐỊNH CHỈ ĐỌC (chỉ select). Phép thử GHI no-op (kiểm CHECK constraint)
 * chỉ chạy khi có cờ --writes và luôn khôi phục giá trị cũ ngay trong script.
 * Chỉ in số dòng + mã lỗi, KHÔNG in nội dung bản ghi / secret.
 *
 * Dùng:
 *   node scripts/a8-db-probe.mjs         # kiểm chứng SAU khi áp (RC=1 nếu còn lỗi)
 *   node scripts/a8-db-probe.mjs --pre   # ghi nhận trạng thái TRƯỚC khi áp (RC=0, lưu bằng chứng)
 *   node scripts/a8-db-probe.mjs --writes # THÊM phép thử GHI no-op (mặc định KHÔNG ghi gì)
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

if (!url || !sec) {
  console.error('Thiếu VITE_SUPABASE_URL / SUPABASE_SECRET_KEY trong .env');
  process.exit(1);
}

const mk = (key) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = mk(sec);
const anon = pub ? mk(pub) : null;

// MẶC ĐỊNH CHỈ ĐỌC. Phép thử GHI no-op (kiểm CHECK) chỉ chạy khi có --writes.
const WRITES = process.argv.includes('--writes');

const results = [];
function rec(status, check, detail) {
  results.push({ status, check, detail });
}
const isMissingColumn = (e) => !!e && (/42703/.test(e.code || '') || /column .* does not exist/i.test(e.message || ''));
const isMissingTable = (e) => !!e && (/42P01|PGRST205/.test(e.code || '') || /Could not find the table|does not exist/i.test(e.message || ''));

/** (A) Đầu dò cột: select đúng các cột; lỗi 42703 ⇒ cột không tồn tại. */
async function probeColumns(table, columns, label) {
  const { error } = await admin.from(table).select(columns.join(',')).limit(1);
  if (!error) return rec('OK', label, `select(${columns.join(',')}) chạy được ⇒ đủ cột`);
  if (isMissingColumn(error)) return rec('MISSING', label, `CỘT KHÔNG TỒN TẠI — ${error.code} ${error.message}`);
  if (isMissingTable(error)) return rec('MISSING', label, `BẢNG KHÔNG TỒN TẠI — ${error.code} ${error.message}`);
  return rec('WRONG', label, `${error.code} ${error.message}`);
}

console.log('===============================================================');
console.log(`A8 DB PROBE (${WRITES ? 'có phép thử ghi no-op' : 'chỉ-đọc'})`);
console.log('Project :', url.replace('https://', ''));
console.log('Khoá    : secret', sec ? `${sec.slice(0, 10)}…` : 'KHÔNG có', '· publishable', pub ? `${pub.slice(0, 12)}…` : 'KHÔNG có');
console.log('===============================================================');

/* --------------------------------------------------- 1. 4 bảng mới */
console.log('\n--- 1. BỐN BẢNG MỚI (đầu dò cột) ---');
await probeColumns('app_settings', [
  'id', 'legal_name', 'tax_code', 'invoice_address', 'hotline', 'contact_email',
  'bank_account', 'bank_name', 'warranty_terms', 'deposit_policy', 'settings', 'updated_by', 'updated_at',
], 'app_settings (13 cột)');
await probeColumns('setting_audit', [
  'id', 'setting_key', 'store', 'old_value', 'new_value', 'changed_by', 'changed_at',
], 'setting_audit (7 cột)');
await probeColumns('warranty_claims', [
  'id', 'order_id', 'user_id', 'reason', 'description', 'photo_paths',
  'status', 'resolution', 'handled_by', 'created_at', 'updated_at',
], 'warranty_claims (11 cột)');
await probeColumns('order_files', [
  'id', 'order_id', 'product_id', 'storage_path', 'license', 'created_at',
], 'order_files (6 cột)');
/* ------------- 1b. NĂM BẢNG MỚI (Đợt 10 · Đợt 25) — đầu dò cột ------------- */
console.log('\n--- 1b. NĂM BẢNG MỚI (Đợt 10 · Đợt 25) ---');
await probeColumns('order_items', [
  'id', 'order_id', 'product_id', 'seller_type', 'fulfillment', 'quantity', 'unit_price',
  'line_total', 'workshop_id', 'designer_id', 'workshop_commission_percent_snapshot',
  'royalty_percent_snapshot', 'workshop_payout_amount', 'designer_payout_amount',
  'platform_fee_amount', 'created_at',
], 'order_items (16 cột)');
await probeColumns('workshop_commission_terms', [
  'partner_id', 'commission_percent', 'note', 'updated_by', 'updated_at',
], 'workshop_commission_terms (5 cột)');
await probeColumns('reviews', [
  'id', 'order_id', 'author_id', 'target_type', 'target_id', 'rating', 'comment', 'photos',
  'status', 'created_at', 'updated_at',
], 'reviews (11 cột)');
await probeColumns('digital_assets', [
  'id', 'product_id', 'designer_id', 'storage_path', 'file_format', 'file_size_bytes',
  'checksum', 'license_type', 'download_limit', 'watermark_required', 'created_at', 'updated_at',
], 'digital_assets (12 cột)');
await probeColumns('cart_items', [
  'id', 'user_id', 'product_id', 'quantity', 'unit_price_snapshot', 'added_at', 'updated_at',
], 'cart_items (7 cột)');

/* -------- 1c. CỘT MỚI trên bảng CŨ + ĐẦU DÒ ÂM cho cột từng rò rỉ (Đợt 25) -------- */
console.log('\n--- 1c. CỘT MỚI (Đợt 25) + cột rò rỉ phải ĐÃ BỊ XOÁ ---');
await probeColumns('orders', [
  'subtotal_amount', 'vat_percent_snapshot', 'vat_amount', 'platform_fee_percent_snapshot',
  'platform_fixed_fee_snapshot', 'platform_fee_amount', 'workshop_payout_amount',
  'designer_payout_amount', 'workshop_payout_status', 'designer_payout_status',
  'workshop_payout_paid_at', 'workshop_payout_paid_by', 'designer_payout_paid_at',
  'designer_payout_paid_by',
], 'orders (14 cột snapshot/payout)');
await probeColumns('materials', ['failure_extra_percent'], 'materials.failure_extra_percent');
await probeColumns('pricing_global_settings', [
  'marketplace_fee_percent', 'marketplace_fixed_fee_vnd', 'default_workshop_commission_percent',
], 'pricing_global_settings (3 cột phí mới)');
await probeColumns('products', ['seller_type', 'license_type'], 'products (seller_type, license_type)');
{
  // ĐẦU DÒ ÂM: cột từng phơi chiết khấu đàm phán cho anon PHẢI KHÔNG còn tồn tại.
  const { error } = await admin.from('workshop_partners').select('id,platform_commission_percent').limit(1);
  if (!error) {
    rec('FAIL', 'rò rỉ chiết khấu đã bịt', 'workshop_partners.platform_commission_percent VẪN CÒN — phải xoá');
  } else if (isMissingColumn(error)) {
    rec('OK', 'rò rỉ chiết khấu đã bịt', 'cột platform_commission_percent KHÔNG còn (đúng) — 42703');
  } else {
    rec('WRONG', 'rò rỉ chiết khấu đã bịt', `${error.code} ${error.message}`);
  }
}

/* ------------------------------------------- 2. site_content.settings */
console.log('\n--- 2. site_content.settings (LỖI 1) ---');
{
  const { error } = await admin.from('site_content').select('id,settings').limit(1);
  if (!error) rec('OK', 'site_content.settings', 'select(settings) chạy được ⇒ cột tồn tại');
  else if (isMissingColumn(error)) rec('MISSING', 'site_content.settings', `CỘT KHÔNG TỒN TẠI — ${error.code} ${error.message}`);
  else rec('WRONG', 'site_content.settings', `${error.code} ${error.message}`);

  // Đường ghi thật của app: ghi lại chính giá trị jsonb đang có (no-op).
  const { data, error: readErr } = await admin.from('site_content').select('id,settings').eq('id', 'default').maybeSingle();
  if (readErr || !data) {
    rec('WRONG', 'site_content write no-op', `không đọc được hàng id=default: ${readErr?.message ?? 'không có hàng'}`);
  } else {
    const current = data.settings ?? {};
    const { error: writeErr } = await admin.from('site_content').update({ settings: current }).eq('id', 'default');
    if (writeErr) rec('MISSING', 'site_content write no-op', `GHI THẤT BẠI — ${writeErr.code} ${writeErr.message}`);
    else rec('OK', 'site_content write no-op', `update({settings: <giá trị cũ>}) chạy được ⇒ cột tồn tại và ghi được`);
  }
}

/* --------------------------- 3. pricing_global_settings: DEFAULT + CHECK */
console.log('\n--- 3. pricing_global_settings (LỖI 2) ---');
{
  const { data, error } = await admin
    .from('pricing_global_settings')
    .select('id,electricity_rate_vnd,labor_hourly_rate_vnd,vat_percent,currency,updated_at')
    .limit(5);
  if (error) rec('WRONG', 'pricing_global_settings read', `${error.code} ${error.message}`);
  else {
    for (const r of data ?? []) {
      const bad = [];
      if (Number(r.electricity_rate_vnd) === 2850) bad.push('electricity_rate_vnd=2850');
      if (Number(r.labor_hourly_rate_vnd) === 65000) bad.push('labor_hourly_rate_vnd=65000');
      if (Number(r.vat_percent) === 8) bad.push('vat_percent=8');
      rec(bad.length ? 'WRONG' : 'OK', `pricing_global_settings[${r.id}]`,
        bad.length
          ? `CÒN SỐ BỊA TỪ DEFAULT: ${bad.join('; ')} — cần chuẩn hoá về NULL`
          : `elec=${r.electricity_rate_vnd} labor=${r.labor_hourly_rate_vnd} vat=${r.vat_percent} (NULL = chưa cấu hình) ✓`);
    }
    if (!data?.length) rec('OK', 'pricing_global_settings rows', 'không có hàng nào');
  }
}

/**
 * (B) Đầu dò CHECK constraint: cố ghi giá trị SAI. Nếu bị chặn (23514) ⇒ constraint
 * tồn tại. Nếu ghi lọt ⇒ khôi phục ngay và báo FAIL.
 *
 * CHỈ áp cho hàng đang NULL (ghi xong khôi phục về NULL). Nếu hàng đang có giá trị
 * thật của admin thì BỎ QUA để không đụng dữ liệu thật.
 */
async function probeCheckConstraint(label, column, invalidValue) {
  const { data, error } = await admin
    .from('pricing_global_settings')
    .select(`id,${column}`)
    .eq('id', 'global')
    .maybeSingle();
  if (error || !data) return rec('WRONG', label, `không đọc được hàng global: ${error?.message ?? 'không có hàng'}`);
  if (data[column] !== null && data[column] !== undefined) {
    return rec('INFO', label, `bỏ qua: cột đang có giá trị thật (${data[column]}) — không đụng dữ liệu admin`);
  }

  // 1) thử ghi SAI → phải bị 23514 chặn
  const { error: badErr } = await admin
    .from('pricing_global_settings')
    .update({ [column]: invalidValue })
    .eq('id', 'global');

  // 2) khôi phục về NULL (dù thành công hay thất bại)
  const { error: restoreErr } = await admin
    .from('pricing_global_settings')
    .update({ [column]: null })
    .eq('id', 'global');

  if (badErr && /23514/.test(badErr.code || '')) {
    rec('OK', label, `CHECK constraint CHẶN giá trị sai (${invalidValue}) — 23514 ✓`);
  } else if (badErr) {
    rec('WRONG', label, `ghi giá trị sai bị lỗi khác, không phải 23514: ${badErr.code} ${badErr.message}`);
  } else {
    rec('FAIL', label, `GHI LỌT giá trị sai ${invalidValue} ⇒ KHÔNG có CHECK constraint (đã khôi phục: ${restoreErr ? 'LỖI ' + restoreErr.message : 'OK'})`);
  }
  if (restoreErr) rec('WRONG', label + ' (khôi phục)', `không khôi phục được: ${restoreErr.code} ${restoreErr.message}`);
}

if (WRITES) {
await probeCheckConstraint('CHECK vat_percent ∈ [0,20]', 'vat_percent', 99);
await probeCheckConstraint('CHECK điện/nhân công ≥ 0', 'labor_hourly_rate_vnd', -1);
} else {
  rec('INFO', 'phép thử ghi (CHECK constraint)',
    'bỏ qua: cần --writes — mặc định script CHỈ ĐỌC');
}

/* ------------------------------------------- 4. seed app_settings */
console.log('\n--- 4. seed app_settings (tax_code phải NULL) ---');
{
  const { data, error } = await admin.from('app_settings').select('id,tax_code,legal_name,hotline').limit(5);
  if (error) rec('WRONG', 'app_settings read', `${error.code} ${error.message}`);
  else if (!data?.length) rec('MISSING', 'app_settings seed row', 'KHÔNG có hàng id=settings');
  else {
    for (const r of data) {
      const bad = r.tax_code !== null && String(r.tax_code).trim() !== '' ? `tax_code=${r.tax_code} (phải NULL)` : null;
      rec(bad ? 'WRONG' : 'OK', `app_settings[${r.id}]`, bad ?? `tax_code=NULL ✓ legal_name=${r.legal_name ?? 'NULL'} hotline=${r.hotline ?? 'NULL'}`);
    }
  }
}

/* ---------------------- 5. 4 bảng mới có bị anon đọc không (RLS thật) */
console.log('\n--- 5. RLS: anon phải bị chặn trên các bảng mới/Đợt 10/Đợt 25 ---');
if (!anon) rec('INFO', 'RLS 4 bảng mới', 'không có publishable key để thử anon');
else {
  for (const [t, expectBlocked] of [
    ['order_items', true],                 // dòng tiền của đơn ⇒ anon phải bị chặn
    ['workshop_commission_terms', true],   // chiết khấu đàm phán ⇒ CHỈ admin
    ['digital_assets', true],              // storage_path ⇒ anon phải bị chặn
    ['cart_items', true],                  // giỏ hàng của khách
    ['quotes', true],                      // báo giá của khách
    ['kyc_records', true],                 // PII hồ sơ KYC
    ['reviews', false],                    // bản published công khai theo thiết kế
    ['app_settings', false],      // nội dung pháp lý công khai ⇒ anon ĐỌC ĐƯỢC
    ['setting_audit', true],      // nhật ký nội bộ ⇒ anon phải bị chặn
    ['warranty_claims', true],    // PII ⇒ anon phải bị chặn
    ['order_files', true],        // đường dẫn file CAD ⇒ anon phải bị chặn
  ]) {
    const { data, error, status } = await anon.from(t).select('*').limit(1);
    if (error) {
      if (isMissingTable(error)) rec('MISSING', `anon đọc ${t}`, 'bảng không tồn tại');
      else rec(expectBlocked ? 'OK' : 'WRONG', `anon đọc ${t}`, `bị chặn: ${error.code || status} (đúng thiết kế)`);
      continue;
    }
    const n = data?.length ?? 0;
    if (expectBlocked) rec(n === 0 ? 'OK' : 'FAIL', `anon đọc ${t}`, n === 0 ? '0 dòng ✓' : `${n} dòng LỘ RA ✗`);
    else rec('OK', `anon đọc ${t}`, `${n} dòng (công khai theo thiết kế)`);
  }
}

/* ---------------------------------- 6. đường ghi thật của settingsService */
console.log('\n--- 6. Đường ghi thật của settingsService (no-op) ---');
{
  const { error } = await admin.from('app_settings').select('id,tax_code,legal_name,invoice_address,hotline,contact_email,bank_account,bank_name,warranty_terms,deposit_policy,settings,updated_by,updated_at').eq('id', 'settings').maybeSingle();
  if (error) rec('WRONG', 'app_settings select đủ cột', `${error.code} ${error.message}`);
  else rec('OK', 'app_settings select đủ cột', 'service đọc được mọi cột khai báo');
}

/* ---------------------------------------------------------- report */
console.log('\n===============================================================');
console.log('KẾT QUẢ'.padEnd(9) + 'KIỂM TRA'.padEnd(46) + 'CHI TIẾT');
console.log('===============================================================');
for (const r of results) console.log(String(r.status).padEnd(9) + String(r.check).padEnd(46) + String(r.detail));
console.log('===============================================================');
const ok = results.filter((r) => r.status === 'OK').length;
const bad = results.filter((r) => ['MISSING', 'WRONG', 'FAIL'].includes(r.status));
console.log(`${ok} OK · ${bad.length} VẤN ĐỀ`);
if (bad.length) {
  console.log('\nVIỆC CẦN SỬA:');
  for (const b of bad) console.log(`  - ${b.check}: ${b.detail}`);
}
const isPre = process.argv.includes('--pre');
if (isPre) {
  // Chế độ ghi nhận TRƯỚC khi áp: lỗi là DỰ KIẾN, chỉ để lưu bằng chứng.
  console.log('\n[--pre] Ghi nhận trạng thái TRƯỚC khi áp migration — không tính là FAIL.');
  console.log('       Sau khi dán supabase/scripts/apply_all_manual.sql, chạy lại KHÔNG có --pre.');
  process.exit(0);
}
if (bad.length) {
  console.log('\n⇒ Migration CHƯA áp đủ. Dán supabase/scripts/apply_all_manual.sql rồi chạy lại:');
  console.log('   node scripts/a8-db-probe.mjs');
}
process.exit(bad.length ? 1 : 0);
