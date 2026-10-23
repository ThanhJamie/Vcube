/**
 * E2E — LUỒNG ĐƠN KHÁCH VÃNG LAI (FL-1).
 *
 * Mục tiêu: chứng minh bằng DB THẬT rằng
 *   1. Khách (anon key, KHÔNG tạo auth user) tạo được đơn `orders` (policy `vcube_orders_guest_insert`);
 *   2. Đơn đọc lại được đúng bằng `secure_access_token` (RPC `get_order_by_guest_token`);
 *   3. Khách KHÔNG thể ghi `order_items` / `payment_transactions` (RLS chỉ admin) — đây là lý do
 *      luồng xác nhận thanh toán phải chạy bằng phiên ADMIN (`OrderService.confirmManualPayment`);
 *   4. (tuỳ chọn) với `--admin-session`: ADMIN đăng nhập thật → xác nhận đã nhận tiền → kiểm
 *      `orders.payment_status='paid'` + có `order_items` + `payment_transactions.status='paid'`.
 *
 * An toàn dữ liệu:
 * - Mặc định DRY-RUN (không ghi DB). Ghi thật phải bật `--live`.
 * - Đơn test có prefix `E2E-`; dọn bằng `--cleanup` (dùng `SUPABASE_SECRET_KEY` **server-only**,
 *   chạy trong Node, KHÔNG bao giờ đưa vào bundle) hoặc xoá tay trong Supabase Studio.
 * - Không in khoá bí mật ra stdout.
 *
 * Chạy:
 *   npx tsx scripts/e2e/guest-order-flow.ts                 # dry-run (in payload + kế hoạch)
 *   npx tsx scripts/e2e/guest-order-flow.ts --live          # ghi đơn guest thật + verify RPC/RLS
 *   npx tsx scripts/e2e/guest-order-flow.ts --live --cleanup
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npx tsx scripts/e2e/guest-order-flow.ts --live --admin-session --cleanup
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Env = Record<string, string>;

/** Đọc `.env` thủ công (repo KHÔNG dùng dotenv — không thêm dependency). */
function loadEnv(): Env {
  const out: Env = {};
  try {
    const raw = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const idx = t.indexOf('=');
      const k = t.slice(0, idx).trim();
      let v = t.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[k] = v;
    }
  } catch {
    /* .env không có ⇒ dùng biến môi trường đang có */
  }
  const merged: Env = { ...process.env as Env, ...out };
  merged.VITE_SUPABASE_URL ||= merged.NEXT_PUBLIC_SUPABASE_URL || '';
  merged.VITE_SUPABASE_PUBLISHABLE_KEY ||= merged.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return merged;
}

const args = new Set(process.argv.slice(2));
const LIVE = args.has('--live');
const CLEANUP = args.has('--cleanup');
const ADMIN_SESSION = args.has('--admin-session');
/** Tạo admin TẠM bằng secret key (Node/server-side), test xác nhận thật rồi xoá — chỉ khi bật cờ. */
const PROVISION_ADMIN = args.has('--provision-admin');
const HELP = args.has('--help') || args.has('-h');

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';

const results: { name: string; status: 'PASS' | 'FAIL' | 'SKIP' | 'BLOCKED'; detail: string }[] = [];
const record = (name: string, status: 'PASS' | 'FAIL' | 'SKIP' | 'BLOCKED', detail: string) => {
  results.push({ name, status, detail });
  console.log(`[${status}] ${name} — ${detail}`);
};

function buildPayload() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const id = `E2E-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
  const orderNumber = `#E2E-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
  // CÙNG một token cho payload + biến dùng khi tra cứu (nếu lệch ⇒ RPC không khớp).
  const token = `e2e_${randomUUID()}`;
  return {
    id,
    orderNumber,
    token,
    row: {
      id,
      order_number: orderNumber,
      user_id: null, // guest: RLS bắt buộc null hoặc = auth.uid()
      date: now.toISOString(),
      estimated_delivery: '',
      status: 'pending_payment',
      status_stage_index: 0,
      layer_progress: 0,
      customer_email: 'e2e-guest@vcube.test',
      customer_name: 'E2E Guest (test tự động)',
      customer_phone: '0900000000',
      customer_type: 'guest',
      total_amount: 350000,
      shipping_fee: 30000,
      payment_method: 'VietQR Chuyển Khoản',
      payment_status: 'awaiting_payment',
      secure_access_token: token,
      items: [
        {
          id: 'E2E-P1',
          name: 'E2E — chi tiết in thử',
          designer: 'E2E Designer',
          type: 'physical',
          image: '',
          price: 320000,
          quantity: 1,
          material: 'PETG',
          color: 'Đen kỹ thuật',
        },
      ],
      shipping_address: {
        fullName: 'E2E Guest (test tự động)',
        phone: '0900000000',
        email: 'e2e-guest@vcube.test',
        address: '1 Đường Test',
        city: 'Hà Nội',
        district: 'Quận Test',
        note: 'E2E test order — safe to delete',
      },
      carrier: { name: '', trackingCode: '' },
      payment: {
        method: 'VietQR Chuyển Khoản',
        paidDate: '',
        subtotalPhysical: 320000,
        subtotalDigital: 0,
        shippingFee: 30000,
        discount: 0,
        tax: 0,
        total: 350000,
        isPaid: false,
        status: 'awaiting_payment',
      },
    } as Record<string, unknown>,
  };
}

function makeAnon(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  if (HELP) {
    console.log('Xem docstring đầu file. Flags: --live --cleanup --admin-session');
    return 0;
  }
  if (!SUPABASE_URL || !ANON_KEY) {
    record('env', 'FAIL', 'Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY trong .env');
    return 1;
  }

  const { id, orderNumber, token, row } = buildPayload();
  console.log(`\nE2E guest order: id=${id} number=${orderNumber} mode=${LIVE ? 'LIVE' : 'DRY-RUN'}\n`);

  const anon = makeAnon();

  // 0) DB reachable? (products là bảng public read)
  const probe = await anon.from('products').select('id').limit(1);
  if (probe.error) {
    record('db.reachable', 'SKIP', `Không kết nối được Supabase (${probe.error.message})`);
    return 0;
  }
  record('db.reachable', 'PASS', `Supabase phản hồi (${(probe.data ?? []).length} product mẫu)`);

  if (!LIVE) {
    console.log('\nPayload sẽ ghi vào `orders` (dry-run, KHÔNG gửi):');
    console.log(JSON.stringify({ ...row, secure_access_token: '<redacted>' }, null, 2).slice(0, 1200));
    record('guest.insert', 'SKIP', 'dry-run — bật --live để ghi đơn thật');
    record('guest.rls_write_blocked', 'SKIP', 'dry-run');
    record('admin.confirm', 'SKIP', 'dry-run');
    return 0;
  }

  // 1) Khách (anon) tạo đơn
  const insert = await anon.from('orders').insert(row);
  if (insert.error) {
    record('guest.insert', 'FAIL', `RLS/DB từ chối: ${insert.error.code ?? ''} ${insert.error.message}`);
    return 1;
  }
  record('guest.insert', 'PASS', `orders row ghi bằng anon key: ${id}`);

  // 2) Đọc lại đúng đơn bằng token (RPC SECURITY DEFINER)
  const rpc = await anon.rpc('get_order_by_guest_token', { p_order_number: orderNumber, p_token: token });
  if (rpc.error || !Array.isArray(rpc.data) || rpc.data.length === 0) {
    record('guest.read_by_token', 'FAIL', `RPC không trả đơn: ${rpc.error?.message ?? 'rỗng'}`);
  } else {
    const got = rpc.data[0] as Record<string, unknown>;
    const ok =
      got.id === id &&
      Number(got.total_amount) === 350000 &&
      got.payment_status === 'awaiting_payment' &&
      Array.isArray(got.items) &&
      (got.items as unknown[]).length === 1;
    record(
      'guest.read_by_token',
      ok ? 'PASS' : 'FAIL',
      ok
        ? `đọc đúng đơn qua token: total=${got.total_amount} status=${got.payment_status} items=1`
        : `dữ liệu không khớp: ${JSON.stringify({ id: got.id, total: got.total_amount, status: got.payment_status })}`
    );
  }

  // 3) RLS: khách KHÔNG được ghi order_items / payment_transactions
  const itemInsert = await anon.from('order_items').insert({
    order_id: id,
    product_id: 'E2E-P1',
    seller_type: 'platform',
    fulfillment: 'print',
    quantity: 1,
    unit_price: 320000,
    line_total: 320000,
  });
  record(
    'guest.rls_order_items_blocked',
    itemInsert.error ? 'PASS' : 'FAIL',
    itemInsert.error
      ? `RLS chặn đúng (${itemInsert.error.code ?? ''} ${itemInsert.error.message})`
      : 'NGUY HIỂM: anon ghi được order_items — kiểm lại policy!'
  );

  const txInsert = await anon.from('payment_transactions').insert({
    id: `e2e_tx_${Date.now()}`,
    order_id: id,
    transaction_id: `e2e_${Date.now()}`,
    amount: 350000,
    payment_gateway: 'manual',
    payload: {},
    status: 'paid',
  });
  record(
    'guest.rls_payment_blocked',
    txInsert.error ? 'PASS' : 'FAIL',
    txInsert.error
      ? `RLS chặn đúng (${txInsert.error.code ?? ''} ${txInsert.error.message})`
      : 'NGUY HIỂM: anon ghi được payment_transactions — kiểm lại policy!'
  );

  // 4) Admin session (nếu có) — xác nhận thanh toán thật qua OrderService
  let adminEmail = env.E2E_ADMIN_EMAIL;
  let adminPassword = env.E2E_ADMIN_PASSWORD;
  let provisionedUserId: string | null = null;
  let secretAdmin: SupabaseClient | null = null;

  if (PROVISION_ADMIN) {
    if (!SECRET_KEY) {
      record('admin.confirm', 'SKIP', '--provision-admin cần SUPABASE_SECRET_KEY (server-only) — không có trong .env');
    } else {
      secretAdmin = createClient(SUPABASE_URL, SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      adminEmail = `e2e-admin-${Date.now()}@vcube.test`;
      adminPassword = `E2E-${randomUUID()}`;
      const created = await secretAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });
      if (created.error || !created.data.user) {
        record('admin.provision', 'FAIL', `không tạo được admin tạm: ${created.error?.message ?? 'không rõ'}`);
        adminEmail = undefined;
      } else {
        provisionedUserId = created.data.user.id;
        // Trigger `fn_protect_profile_privileged_columns` chặn UPDATE role (kể cả service role) ⇒
        // tạo profile ADMIN bằng INSERT sau khi xoá profile mặc định do trigger auth tạo.
        await secretAdmin.from('user_profiles').delete().eq('id', provisionedUserId);
        const promote = await secretAdmin.from('user_profiles').insert({
          id: provisionedUserId,
          email: adminEmail,
          display_name: 'E2E Admin tạm',
          role: 'admin',
        });
        record(
          'admin.provision',
          promote.error ? 'FAIL' : 'PASS',
          promote.error ? `không tạo được profile admin: ${promote.error.message}` : 'đã tạo admin TẠM (sẽ xoá ở bước cleanup)'
        );
        if (promote.error) adminEmail = undefined;
      }
    }
  }

  if (!ADMIN_SESSION && !PROVISION_ADMIN) {
    record('admin.confirm', 'SKIP', 'chưa bật --admin-session/--provision-admin (cần phiên admin thật để ghi bảng tiền)');
  } else if (!adminEmail || !adminPassword) {
    record(
      'admin.confirm',
      'SKIP',
      'thiếu E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD và không provision được admin tạm'
    );
  } else {
    // Ép client app (đọc process.env lúc import) dùng đúng Supabase của .env.
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
    const { supabase } = await import('../../src/backend/supabase/client');
    const { OrderService } = await import('../../src/backend/services/orderService');
    const signIn = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (signIn.error) {
      record('admin.signin', 'FAIL', signIn.error.message);
    } else {
      const profile = await supabase.from('user_profiles').select('role').eq('id', signIn.data.user!.id).maybeSingle();
      const role = (profile.data as { role?: string } | null)?.role;
      if (role !== 'admin') {
        record('admin.signin', 'BLOCKED', `tài khoản không phải admin (role=${role ?? 'không đọc được'})`);
      } else {
        record('admin.signin', 'PASS', 'đăng nhập admin thật');
        const confirm = await OrderService.confirmManualPayment(id, {
          amount: 350000,
          method: 'e2e_manual',
          note: 'E2E guest-order-flow',
          actorId: signIn.data.user!.id,
        });
        if (confirm.status === 'confirmed' || confirm.status === 'already_confirmed') {
          const checks: string[] = [];
          const orderRow = await supabase.from('orders').select('payment_status,subtotal_amount,platform_fee_amount').eq('id', id).maybeSingle();
          const items = await supabase.from('order_items').select('id', { count: 'exact' }).eq('order_id', id);
          const txs = await supabase.from('payment_transactions').select('status').eq('order_id', id);
          checks.push(`payment_status=${String((orderRow.data as any)?.payment_status)}`);
          checks.push(`order_items=${items.data?.length ?? 0}`);
          checks.push(`tx_status=${(txs.data ?? []).map((t: any) => t.status).join(',') || 'none'}`);
          const ok =
            (orderRow.data as any)?.payment_status === 'paid' &&
            (items.data?.length ?? 0) > 0 &&
            (txs.data ?? []).some((t: any) => t.status === 'paid');
          record('admin.confirm', ok ? 'PASS' : 'FAIL', `${confirm.status}: ${checks.join(' · ')}`);
        } else {
          record('admin.confirm', 'FAIL', `confirm thất bại: ${confirm.error ?? 'không rõ'}`);
        }
        await supabase.auth.signOut();
      }
    }
  }

  // 4b) Xoá admin tạm (nếu có tạo) — luôn chạy, kể cả khi các bước trước lỗi.
  if (provisionedUserId && secretAdmin) {
    const delUser = await secretAdmin.auth.admin.deleteUser(provisionedUserId);
    record(
      'admin.provision_cleanup',
      delUser.error ? 'FAIL' : 'PASS',
      delUser.error ? `không xoá được admin tạm: ${delUser.error.message}` : 'đã xoá admin tạm'
    );
  }

  // 5) Cleanup (tuỳ chọn) — dùng secret key ở Node (server-side), KHÔNG lên bundle.
  if (CLEANUP) {
    if (!SECRET_KEY) {
      record('cleanup', 'SKIP', 'thiếu SUPABASE_SECRET_KEY — xoá tay đơn test trong Supabase Studio');
    } else {
      const admin = createClient(SUPABASE_URL, SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const del = await admin.from('orders').delete().eq('id', id);
      record(
        'cleanup',
        del.error ? 'FAIL' : 'PASS',
        del.error ? `không xoá được đơn test: ${del.error.message}` : `đã xoá đơn test ${id} (cascade items/payment/files)`
      );
    }
  } else {
    record('cleanup', 'SKIP', `đơn test còn lại trong DB: ${id} — chạy --cleanup hoặc xoá tay`);
  }

  return 0;
}

main()
  .then((code) => {
    const fails = results.filter((r) => r.status === 'FAIL').length;
    console.log(`\nSUMMARY ${LIVE ? 'LIVE' : 'DRY-RUN'}: ${results.length} check · PASS=${results.filter((r) => r.status === 'PASS').length} · FAIL=${fails} · SKIP=${results.filter((r) => r.status === 'SKIP').length} · BLOCKED=${results.filter((r) => r.status === 'BLOCKED').length}`);
    process.exit(fails > 0 ? 1 : code);
  })
  .catch((err) => {
    console.error('CRASH', err);
    process.exit(1);
  });
