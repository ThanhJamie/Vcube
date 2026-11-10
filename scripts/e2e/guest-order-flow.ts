/**
 * E2E — LUỒNG ĐƠN KHÁCH VÃNG LAI (FL-1) · QA-API-01 harness.
 *
 * Mục tiêu: chứng minh bằng DB THẬT rằng
 *   1. Khách (anon key, KHÔNG tạo auth user) tạo được đơn `orders` (policy `vcube_orders_guest_insert`);
 *   2. Đơn đọc lại được đúng bằng `secure_access_token` (RPC `get_order_by_guest_token`);
 *   3. Khách KHÔNG thể ghi `order_items` / `payment_transactions` (RLS chỉ admin) — đây là lý do
 *      luồng xác nhận thanh toán phải chạy bằng phiên ADMIN (`OrderService.confirmManualPayment`);
 *   4. (tuỳ chọn) với `--admin-session` / `--provision-admin`: ADMIN đăng nhập thật → xác nhận đã
 *      nhận tiền → kiểm `orders.payment_status='paid'` + có `order_items` +
 *      `payment_transactions.status='paid'`.
 *
 * Ba mức kết quả — KHÔNG được gộp:
 *   - `dry-run` (mặc định): chỉ kiểm tra fixture + (nếu có credentials) đọc bảng `products`.
 *     PASS ở đây KHÔNG chứng minh vòng tiền, KHÔNG ghi DB.
 *   - `--live`: ghi DB thật (staging). Đây mới là bằng chứng API/DB.
 *   - Browser smoke (QA-BROWSER-01) là gate RIÊNG, không thay thế được script này.
 *
 * An toàn dữ liệu — FAIL-CLOSED (phòng thủ nhiều lớp):
 * - Mặc định DRY-RUN (không ghi DB).
 * - Ghi thật (`--live`) yêu cầu ĐỒNG THỜI:
 *     · `E2E_TARGET=staging` (sau trim/lowercase). Mọi giá trị khác — kể cả trống/`unknown`/
 *       `production` — đều BLOCKED exit 2.
 *     · `E2E_STAGING_SUPABASE_URL` tồn tại và **khớp** `VITE_SUPABASE_URL` sau khi chuẩn hoá
 *       (trim/lowercase/bỏ `/` cuối). Lệch/thiếu → BLOCKED exit 2. Đây là chốt chống `.env`
 *       production bị dùng nhầm khi chỉ đặt `E2E_TARGET=staging`.
 *     · `E2E_ALLOW_LIVE=1` (cổng xác nhận thêm).
 * - Biến môi trường (`process.env`) THẮNG file `.env`, để `E2E_*`/`VITE_*` do người chạy đặt
 *   không bị `.env` đè. Giới hạn: harness tin `E2E_STAGING_SUPABASE_URL` thực sự là staging —
 *   phải cấp secret staging riêng, không tái sử dụng URL production.
 * - Đơn test có prefix `E2E-`; dọn bằng `--cleanup` (dùng `SUPABASE_SECRET_KEY` **server-only**,
 *   chạy trong Node, KHÔNG bao giờ đưa vào bundle). `--cleanup` xoá đơn của lần chạy này rồi
 *   ĐỌC LẠI để xác nhận đã sạch. `--cleanup-stale` dọn mọi đơn `E2E-%` còn sót + admin tạm
 *   (`e2e-admin-*@vcube.test` cũ hơn 1 giờ) do lần chạy lỗi để lại.
 * - `try/finally`: nếu crash sau khi đã insert đơn hoặc tạo admin tạm, cleanup vẫn chạy.
 * - Không in khoá bí mật ra stdout. Payload in ra đã che `secure_access_token`.
 *
 * Kết quả (`result`) là một trong `PASS` / `PARTIAL` / `FAIL`:
 *   - `FAIL`: có check FAIL/BLOCKED.
 *   - `PARTIAL`: check được YÊU CẦU (--admin-session/--cleanup/--cleanup-stale…) bị SKIP hoặc
 *     không chạy. Không được coi là PASS, exit 1.
 *   - `PASS`: mọi check bắt buộc của mode hiện tại đều PASS. Dry-run không bị đánh giá như live.
 *
 * Output:
 * - Người đọc: các dòng `[PASS|FAIL|SKIP|BLOCKED] tên — chi tiết` + SUMMARY + RESULT.
 * - Máy đọc: `--json` in MỘT object JSON ra stdout; `--report <path>` ghi cùng object ra file
 *   (dùng cho CI artifact / evidence QA-API-01).
 *
 * Chạy:
 *   npm run test:e2e:api                                     # dry-run, không cần credentials (fixture self-check)
 *   npm run test:e2e:api -- --json --report .loop/e2e.json   # dry-run + report máy đọc
 *   E2E_ALLOW_LIVE=1 E2E_TARGET=staging E2E_STAGING_SUPABASE_URL=https://<staging-ref>.supabase.co \
 *     npx tsx scripts/e2e/guest-order-flow.ts --live
 *   E2E_ALLOW_LIVE=1 E2E_TARGET=staging E2E_STAGING_SUPABASE_URL=https://<staging-ref>.supabase.co \
 *     npx tsx scripts/e2e/guest-order-flow.ts --live --cleanup
 *   E2E_ALLOW_LIVE=1 E2E_TARGET=staging E2E_STAGING_SUPABASE_URL=https://<staging-ref>.supabase.co \
 *     E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
 *     npx tsx scripts/e2e/guest-order-flow.ts --live --admin-session --cleanup
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Env = Record<string, string>;
type Status = 'PASS' | 'FAIL' | 'SKIP' | 'BLOCKED';
type Outcome = 'PASS' | 'PARTIAL' | 'FAIL';
type Result = { name: string; status: Status; detail: string };

/** Đọc `.env` thủ công (repo KHÔNG dùng dotenv — không thêm dependency). */
function loadEnv(): Env {
  const out: Env = {};
  try {
    // `E2E_ENV_FILE` cho phép CI trỏ tới file env staging riêng, KHÔNG dùng lẫn `.env` production.
    const file = process.env.E2E_ENV_FILE
      ? resolve(process.cwd(), process.env.E2E_ENV_FILE)
      : new URL('../../.env', import.meta.url);
    const raw = readFileSync(file, 'utf8');
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
  // Thứ tự ưu tiên: biến môi trường THẮNG file `.env`. Nếu ngược lại, một `.env` có sẵn
  // credential thật có thể đè `E2E_*`/`VITE_*` do người chạy cố ý đặt (nguy hiểm cho --live).
  const merged: Env = { ...out, ...(process.env as Env) };
  merged.VITE_SUPABASE_URL ||= merged.NEXT_PUBLIC_SUPABASE_URL || '';
  merged.VITE_SUPABASE_PUBLISHABLE_KEY ||= merged.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return merged;
}

/* ------------------------------------------------------------------ CLI flags */
const rawArgs = process.argv.slice(2);
const hasFlag = (flag: string) => rawArgs.includes(flag);
function option(name: string): string | undefined {
  const inline = rawArgs.find((a) => a.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const at = rawArgs.indexOf(name);
  if (at === -1) return undefined;
  const next = rawArgs[at + 1];
  return next && !next.startsWith('--') ? next : undefined;
}

const LIVE = hasFlag('--live');
const CLEANUP = hasFlag('--cleanup');
const CLEANUP_STALE = hasFlag('--cleanup-stale');
const ADMIN_SESSION = hasFlag('--admin-session');
/** Tạo admin TẠM bằng secret key (Node/server-side), test xác nhận thật rồi xoá — chỉ khi bật cờ. */
const PROVISION_ADMIN = hasFlag('--provision-admin');
const JSON_MODE = hasFlag('--json');
const REPORT_PATH = option('--report');
const HELP = hasFlag('--help') || hasFlag('-h');

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
const STAGING_URL = env.E2E_STAGING_SUPABASE_URL || '';
const TARGET_RAW = env.E2E_TARGET ?? '';
const TARGET = TARGET_RAW.trim().toLowerCase() || 'unknown';
const ALLOW_LIVE = env.E2E_ALLOW_LIVE === '1';
const ADMIN_REQUESTED = ADMIN_SESSION || PROVISION_ADMIN;

/** Chuẩn hoá URL để so khớp: trim, lowercase, bỏ mọi `/` cuối. Không in URL ra log. */
function normalizeUrl(value: string): string {
  return value.trim().toLowerCase().replace(/\/+$/, '');
}

const startedAt = new Date().toISOString();
const results: Result[] = [];
const record = (name: string, status: Status, detail: string) => {
  results.push({ name, status, detail });
  if (!JSON_MODE) console.log(`[${status}] ${name} — ${detail}`);
};

/* ------------------------------------------------------------------ fixture */
// Fixture staging: tổng tiền = 320.000 (hàng) + 30.000 (ship) = 350.000. KHÔNG dùng số bịa
// ngoài mục đích test; mọi bản ghi đều mang prefix `E2E-` để nhận diện và dọn.
const FIXTURE = {
  itemUnitPrice: 320_000,
  shippingFee: 30_000,
  total: 350_000,
  customerEmail: 'e2e-guest@vcube.test',
  customerPhone: '0900000000',
} as const;

function buildPayload() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.floor(Math.random() * 900 + 100);
  const id = `E2E-${stamp}-${suffix}`;
  const orderNumber = `#E2E-${stamp}-${suffix}`;
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
      customer_email: FIXTURE.customerEmail,
      customer_name: 'E2E Guest (test tự động)',
      customer_phone: FIXTURE.customerPhone,
      customer_type: 'guest',
      total_amount: FIXTURE.total,
      shipping_fee: FIXTURE.shippingFee,
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
          price: FIXTURE.itemUnitPrice,
          quantity: 1,
          material: 'PETG',
          color: 'Đen kỹ thuật',
        },
      ],
      shipping_address: {
        fullName: 'E2E Guest (test tự động)',
        phone: FIXTURE.customerPhone,
        email: FIXTURE.customerEmail,
        address: '1 Đường Test',
        city: 'Hà Nội',
        district: 'Quận Test',
        note: 'E2E test order — safe to delete',
      },
      carrier: { name: '', trackingCode: '' },
      payment: {
        method: 'VietQR Chuyển Khoản',
        paidDate: '',
        subtotalPhysical: FIXTURE.itemUnitPrice,
        subtotalDigital: 0,
        shippingFee: FIXTURE.shippingFee,
        discount: 0,
        tax: 0,
        total: FIXTURE.total,
        isPaid: false,
        status: 'awaiting_payment',
      },
    } as Record<string, unknown>,
  };
}

/** Kiểm tra fixture TRƯỚC khi chạm mạng — dry-run vẫn có giá trị. */
function validateFixture(p: ReturnType<typeof buildPayload>): string[] {
  const issues: string[] = [];
  if (!p.id.startsWith('E2E-')) issues.push('id thiếu prefix E2E-');
  if (!p.orderNumber.startsWith('#E2E-')) issues.push('order_number thiếu prefix #E2E-');
  if (!p.token.startsWith('e2e_') || p.token.length < 40) issues.push('token không đủ dài/đúng prefix');
  if (p.row.user_id !== null) issues.push('guest order phải có user_id=null');
  if (Number(p.row.total_amount) !== FIXTURE.total) issues.push('total_amount ≠ fixture');
  if (Number(p.row.shipping_fee) !== FIXTURE.shippingFee) issues.push('shipping_fee ≠ fixture');
  const payment = p.row.payment as Record<string, unknown>;
  if (Number(payment.total) !== FIXTURE.total) issues.push('payment.total ≠ fixture');
  const items = p.row.items as Array<Record<string, unknown>>;
  if (!Array.isArray(items) || items.length !== 1) issues.push('items phải có đúng 1 dòng');
  const cash = FIXTURE.itemUnitPrice + FIXTURE.shippingFee;
  if (cash !== FIXTURE.total) issues.push('fixture: unitPrice + shippingFee ≠ total');
  return issues;
}

function makeAnon(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function makeAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * PostgREST/Postgres trả SQLSTATE `42501` khi RLS từ chối INSERT. Chỉ coi là PASS khi lỗi
 * ĐÚNG là RLS — lỗi kiểu khác (FK, check constraint, mạng…) không chứng minh được RLS.
 */
function isRlsDenied(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42501' || /row-level security|permission denied/i.test(error.message ?? '');
}

function printDryRunPayload(row: Record<string, unknown>) {
  if (JSON_MODE) return;
  console.log('\nPayload sẽ ghi vào `orders` (dry-run, KHÔNG gửi):');
  const redacted = { ...row, secure_access_token: '<redacted>' };
  console.log(JSON.stringify(redacted, null, 2).slice(0, 1200));
}

/* ------------------------------------------------------------------ cleanup state */
// Trạng thái dùng chung để `finally` có thể dọn dù `main` throw giữa đường.
const state = {
  id: '',
  liveStarted: false,
  inserted: false,
  cleanupDone: false,
  staleDone: false,
  provisionedUserId: null as string | null,
  provisionCleanupDone: false,
  secretAdmin: null as SupabaseClient | null,
};

async function cleanupOrder(reason: string): Promise<void> {
  if (state.cleanupDone) return;
  try {
    if (!SECRET_KEY) {
      record('cleanup', 'FAIL', `thiếu SUPABASE_SECRET_KEY — không dọn được đơn test (${reason})`);
      return;
    }
    const admin = makeAdmin();
    const del = await admin.from('orders').delete().eq('id', state.id);
    if (del.error) {
      record('cleanup', 'FAIL', `không xoá được đơn test: ${del.error.message} (${reason})`);
      return;
    }
    const verify = await admin.from('orders').select('id').eq('id', state.id).maybeSingle();
    record(
      'cleanup',
      verify.error ? 'FAIL' : verify.data ? 'FAIL' : 'PASS',
      verify.error
        ? `không đọc lại được để xác nhận: ${verify.error.message} (${reason})`
        : verify.data
          ? `đơn test VẪN CÒN trong DB: ${state.id} (${reason})`
          : `đã xoá đơn test ${state.id} và đọc lại xác nhận sạch (cascade items/payment/files)`
    );
  } catch (err) {
    record('cleanup', 'FAIL', `cleanup đơn ném lỗi: ${(err as Error).message} (${reason})`);
  } finally {
    state.cleanupDone = true;
  }
}

async function cleanupProvisionedAdmin(reason: string): Promise<void> {
  if (state.provisionCleanupDone || !state.provisionedUserId || !state.secretAdmin) return;
  try {
    const delUser = await state.secretAdmin.auth.admin.deleteUser(state.provisionedUserId);
    record(
      'admin.provision_cleanup',
      delUser.error ? 'FAIL' : 'PASS',
      delUser.error ? `không xoá được admin tạm: ${delUser.error.message} (${reason})` : 'đã xoá admin tạm'
    );
  } catch (err) {
    record('admin.provision_cleanup', 'FAIL', `cleanup admin tạm ném lỗi: ${(err as Error).message} (${reason})`);
  } finally {
    state.provisionCleanupDone = true;
  }
}

/**
 * Dọn đơn `E2E-%` còn sót và admin tạm `e2e-admin-*@vcube.test` cũ hơn 1 giờ.
 * Ngưỡng 1 giờ tránh xoá nhầm admin của một lượt chạy song song đang hoạt động.
 */
async function cleanupStale(reason: string): Promise<void> {
  if (state.staleDone) return;
  state.staleDone = true;
  if (!SECRET_KEY) {
    record('cleanup.stale', 'FAIL', `thiếu SUPABASE_SECRET_KEY — không dọn được dữ liệu E2E cũ (${reason})`);
    return;
  }
  const admin = makeAdmin();

  const stale = await admin.from('orders').select('id').like('id', 'E2E-%');
  if (stale.error) {
    record('cleanup.stale', 'FAIL', `không liệt kê được đơn E2E cũ: ${stale.error.message}`);
  } else {
    const ids = (stale.data ?? []).map((r) => (r as { id: string }).id);
    if (ids.length === 0) {
      record('cleanup.stale', 'PASS', 'không còn đơn E2E-% nào');
    } else {
      const del = await admin.from('orders').delete().in('id', ids);
      record('cleanup.stale', del.error ? 'FAIL' : 'PASS', del.error ? `xoá thất bại: ${del.error.message}` : `đã xoá ${ids.length} đơn E2E cũ`);
    }
  }

  // Admin tạm do lần chạy crash để lại (email fixture), chỉ xoá bản ghi cũ hơn 1 giờ.
  const cutoff = Date.now() - 60 * 60 * 1000;
  const staleAdmins: { id: string; email?: string }[] = [];
  let listError: string | null = null;
  try {
    for (let page = 1; page <= 10; page++) {
      const list = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (list.error) {
        listError = list.error.message;
        break;
      }
      const users = list.data.users ?? [];
      for (const u of users) {
        const email = (u.email ?? '').toLowerCase();
        const createdAt = u.created_at ? new Date(u.created_at).getTime() : 0;
        if (
          email.startsWith('e2e-admin-') &&
          email.endsWith('@vcube.test') &&
          u.id !== state.provisionedUserId &&
          createdAt > 0 &&
          createdAt < cutoff
        ) {
          staleAdmins.push({ id: u.id, email });
        }
      }
      if (users.length < 200) break;
    }
  } catch (err) {
    listError = (err as Error).message;
  }

  if (listError) {
    record('cleanup.stale_admin', 'FAIL', `không liệt kê được admin tạm: ${listError}`);
    return;
  }
  if (staleAdmins.length === 0) {
    record('cleanup.stale_admin', 'PASS', 'không còn admin tạm E2E cũ (>1 giờ)');
    return;
  }
  let deleted = 0;
  let failed = 0;
  for (const u of staleAdmins) {
    const del = await admin.auth.admin.deleteUser(u.id);
    if (del.error) failed++;
    else deleted++;
  }
  record(
    'cleanup.stale_admin',
    failed === 0 ? 'PASS' : 'FAIL',
    `admin tạm: đã xoá ${deleted}, lỗi ${failed}${failed ? ` — kiểm tay ${staleAdmins.map((u) => u.email ?? u.id).join(', ')}` : ''}`
  );
}

/** Các check BẮT BUỘC theo mode/cờ đã yêu cầu. */
function requiredChecks(): string[] {
  const required = ['fixture.valid'];
  if (LIVE) {
    required.push('env', 'guard.live', 'guard.staging_url', 'guest.insert', 'guest.read_by_token', 'guest.rls_order_items_blocked', 'guest.rls_payment_blocked');
  }
  if (ADMIN_REQUESTED) required.push('admin.signin', 'admin.confirm');
  if (PROVISION_ADMIN) required.push('admin.provision', 'admin.provision_cleanup');
  if (LIVE && CLEANUP) required.push('cleanup');
  if (CLEANUP_STALE) required.push('cleanup.stale');
  return required;
}

function evaluateOutcome(): Outcome {
  if (results.some((r) => r.status === 'FAIL' || r.status === 'BLOCKED')) return 'FAIL';
  const byName = new Map(results.map((r) => [r.name, r.status]));
  for (const name of requiredChecks()) {
    // `admin.signin` chỉ tồn tại khi thực sự thử đăng nhập; nếu thiếu credential ⇒ PARTIAL.
    if (byName.get(name) !== 'PASS') return 'PARTIAL';
  }
  return 'PASS';
}

async function main() {
  if (HELP) {
    console.log(
      'Flags: --live --cleanup --cleanup-stale --admin-session --provision-admin --json --report <path>\n' +
        'Live yêu cầu E2E_ALLOW_LIVE=1, E2E_TARGET=staging VÀ VITE_SUPABASE_URL khớp E2E_STAGING_SUPABASE_URL.'
    );
    return 0;
  }

  const payload = buildPayload();
  const { id, orderNumber, token, row } = payload;
  state.id = id;

  const fixtureIssues = validateFixture(payload);
  record(
    'fixture.valid',
    fixtureIssues.length === 0 ? 'PASS' : 'FAIL',
    fixtureIssues.length === 0 ? `id=${id} · token=<redacted> · total=${FIXTURE.total}` : fixtureIssues.join('; ')
  );
  if (fixtureIssues.length > 0) return 1;

  if (!JSON_MODE) {
    console.log(`\nE2E guest order: id=${id} number=${orderNumber} mode=${LIVE ? 'LIVE' : 'DRY-RUN'} target=${TARGET}\n`);
  }

  try {
    const missingEnv = !SUPABASE_URL || !ANON_KEY;
    if (missingEnv) {
      record(
        'env',
        LIVE ? 'FAIL' : 'SKIP',
        LIVE
          ? 'thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — không thể --live'
          : 'thiếu credential Supabase — dry-run chỉ kiểm fixture (không gọi mạng)'
      );
      if (LIVE) return 1;
      printDryRunPayload(row);
      record('guest.insert', 'SKIP', 'dry-run — bật --live (kèm E2E_TARGET=staging + E2E_ALLOW_LIVE=1) để ghi đơn thật');
      record('guest.rls_order_items_blocked', 'SKIP', 'dry-run');
      record('guest.rls_payment_blocked', 'SKIP', 'dry-run');
      if (ADMIN_REQUESTED) record('admin.signin', 'SKIP', 'dry-run — không thực hiện đăng nhập admin');
      record('admin.confirm', 'SKIP', 'dry-run');
      record('cleanup', 'SKIP', 'dry-run — không có gì để dọn');
      return 0;
    }
    record('env', 'PASS', 'credentials Supabase hiện diện (không in giá trị)');

    // FAIL-CLOSED: chỉ đúng staging mới được ghi DB. Không có ngoại lệ production.
    if (LIVE && TARGET !== 'staging') {
      record(
        'guard.target',
        'BLOCKED',
        `E2E_TARGET="${TARGET_RAW}" (chuẩn hoá: "${TARGET}") — --live chỉ cho phép E2E_TARGET=staging`
      );
      return 2;
    }
    // URL thật phải khớp URL staging được cấp riêng. Không in URL để tránh lộ cấu hình.
    if (LIVE) {
      if (!STAGING_URL) {
        record('guard.staging_url', 'BLOCKED', 'thiếu E2E_STAGING_SUPABASE_URL — không xác nhận được đích staging');
        return 2;
      }
      if (normalizeUrl(SUPABASE_URL) !== normalizeUrl(STAGING_URL)) {
        record(
          'guard.staging_url',
          'BLOCKED',
          'VITE_SUPABASE_URL không khớp E2E_STAGING_SUPABASE_URL — từ chối --live (không in URL)'
        );
        return 2;
      }
      record('guard.staging_url', 'PASS', 'URL thực khớp E2E_STAGING_SUPABASE_URL');
    }
    if (LIVE && !ALLOW_LIVE) {
      record('guard.live', 'BLOCKED', 'cần E2E_ALLOW_LIVE=1 để ghi DB (chống chạy nhầm production)');
      return 2;
    }
    record('guard.live', LIVE ? 'PASS' : 'SKIP', LIVE ? `đã xác nhận ghi DB (target=${TARGET})` : 'dry-run — không ghi DB');

    const anon = makeAnon();

    // 0) DB reachable? (products là bảng public read). Có env thì lỗi probe là FAIL,
    //    không được SKIP/PASS — tránh "xanh giả" khi staging sai URL/mất mạng.
    const probe = await anon.from('products').select('id').limit(1);
    if (probe.error) {
      record('db.reachable', 'FAIL', `Không kết nối được Supabase (${probe.error.message})`);
      return 1;
    }
    record('db.reachable', 'PASS', `Supabase phản hồi (${(probe.data ?? []).length} product mẫu)`);

    if (!LIVE) {
      printDryRunPayload(row);
      record('guest.insert', 'SKIP', 'dry-run — bật --live để ghi đơn thật');
      record('guest.rls_order_items_blocked', 'SKIP', 'dry-run');
      record('guest.rls_payment_blocked', 'SKIP', 'dry-run');
      if (ADMIN_REQUESTED) record('admin.signin', 'SKIP', 'dry-run — không thực hiện đăng nhập admin');
      record('admin.confirm', 'SKIP', 'dry-run');
      record('cleanup', 'SKIP', 'dry-run — không có gì để dọn');
      return 0;
    }

    state.liveStarted = true;

    // 1) Khách (anon) tạo đơn
    const insert = await anon.from('orders').insert(row);
    if (insert.error) {
      record('guest.insert', 'FAIL', `RLS/DB từ chối: ${insert.error.code ?? ''} ${insert.error.message}`);
      return 1;
    }
    state.inserted = true;
    record('guest.insert', 'PASS', `orders row ghi bằng anon key: ${id}`);

    // 2) Đọc lại đúng đơn bằng token (RPC SECURITY DEFINER)
    const rpc = await anon.rpc('get_order_by_guest_token', { p_order_number: orderNumber, p_token: token });
    if (rpc.error || !Array.isArray(rpc.data) || rpc.data.length === 0) {
      record('guest.read_by_token', 'FAIL', `RPC không trả đơn: ${rpc.error?.message ?? 'rỗng'}`);
    } else {
      const got = rpc.data[0] as Record<string, unknown>;
      const ok =
        got.id === id &&
        Number(got.total_amount) === FIXTURE.total &&
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
      unit_price: FIXTURE.itemUnitPrice,
      line_total: FIXTURE.itemUnitPrice,
    });
    record(
      'guest.rls_order_items_blocked',
      isRlsDenied(itemInsert.error) ? 'PASS' : 'FAIL',
      itemInsert.error
        ? isRlsDenied(itemInsert.error)
          ? `RLS chặn đúng (${itemInsert.error.code ?? ''} ${itemInsert.error.message})`
          : `lỗi KHÔNG phải RLS — không kết luận được: ${itemInsert.error.code ?? ''} ${itemInsert.error.message}`
        : 'NGUY HIỂM: anon ghi được order_items — kiểm lại policy!'
    );

    const txInsert = await anon.from('payment_transactions').insert({
      id: `e2e_tx_${Date.now()}`,
      order_id: id,
      transaction_id: `e2e_${Date.now()}`,
      amount: FIXTURE.total,
      payment_gateway: 'manual',
      payload: {},
      status: 'paid',
    });
    record(
      'guest.rls_payment_blocked',
      isRlsDenied(txInsert.error) ? 'PASS' : 'FAIL',
      txInsert.error
        ? isRlsDenied(txInsert.error)
          ? `RLS chặn đúng (${txInsert.error.code ?? ''} ${txInsert.error.message})`
          : `lỗi KHÔNG phải RLS — không kết luận được: ${txInsert.error.code ?? ''} ${txInsert.error.message}`
        : 'NGUY HIỂM: anon ghi được payment_transactions — kiểm lại policy!'
    );

    // 4) Admin session (nếu có) — xác nhận thanh toán thật qua OrderService
    let adminEmail = env.E2E_ADMIN_EMAIL;
    let adminPassword = env.E2E_ADMIN_PASSWORD;

    if (PROVISION_ADMIN) {
      if (!SECRET_KEY) {
        record('admin.provision', 'FAIL', '--provision-admin cần SUPABASE_SECRET_KEY (server-only) — không có trong .env');
      } else {
        state.secretAdmin = makeAdmin();
        adminEmail = `e2e-admin-${Date.now()}@vcube.test`;
        adminPassword = `E2E-${randomUUID()}`;
        const created = await state.secretAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
        });
        if (created.error || !created.data.user) {
          record('admin.provision', 'FAIL', `không tạo được admin tạm: ${created.error?.message ?? 'không rõ'}`);
          adminEmail = undefined;
        } else {
          state.provisionedUserId = created.data.user.id;
          // Trigger `fn_protect_profile_privileged_columns` chặn UPDATE role (kể cả service role) ⇒
          // tạo profile ADMIN bằng INSERT sau khi xoá profile mặc định do trigger auth tạo.
          await state.secretAdmin.from('user_profiles').delete().eq('id', state.provisionedUserId);
          const promote = await state.secretAdmin.from('user_profiles').insert({
            id: state.provisionedUserId,
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

    if (!ADMIN_REQUESTED) {
      record('admin.confirm', 'SKIP', 'chưa bật --admin-session/--provision-admin (cần phiên admin thật để ghi bảng tiền)');
    } else if (!adminEmail || !adminPassword) {
      record(
        'admin.signin',
        'SKIP',
        'thiếu E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD và không provision được admin tạm'
      );
      record('admin.confirm', 'SKIP', 'không có phiên admin — không xác nhận được thanh toán');
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
            amount: FIXTURE.total,
            method: 'e2e_manual',
            note: 'E2E guest-order-flow',
            actorId: signIn.data.user!.id,
          });
          if (confirm.status === 'confirmed' || confirm.status === 'already_confirmed') {
            const checks: string[] = [];
            const orderRow = await supabase.from('orders').select('payment_status,subtotal_amount,platform_fee_amount').eq('id', id).maybeSingle();
            const items = await supabase.from('order_items').select('id', { count: 'exact' }).eq('order_id', id);
            const txs = await supabase.from('payment_transactions').select('status').eq('order_id', id);
            checks.push(`payment_status=${String((orderRow.data as { payment_status?: string } | null)?.payment_status)}`);
            checks.push(`order_items=${items.data?.length ?? 0}`);
            checks.push(`tx_status=${(txs.data ?? []).map((t) => (t as { status?: string }).status).join(',') || 'none'}`);
            const ok =
              (orderRow.data as { payment_status?: string } | null)?.payment_status === 'paid' &&
              (items.data?.length ?? 0) > 0 &&
              (txs.data ?? []).some((t) => (t as { status?: string }).status === 'paid');
            record('admin.confirm', ok ? 'PASS' : 'FAIL', `${confirm.status}: ${checks.join(' · ')}`);
          } else {
            record('admin.confirm', 'FAIL', `confirm thất bại: ${confirm.error ?? 'không rõ'}`);
          }
          await supabase.auth.signOut();
        }
      }
    }

    // 4b) Xoá admin tạm (nếu có tạo) — luôn chạy ở finally nếu bước này bị bỏ qua do lỗi.
    await cleanupProvisionedAdmin('sau bước admin');

    // 5) Cleanup (tuỳ chọn) — dùng secret key ở Node (server-side), KHÔNG lên bundle.
    if (CLEANUP) {
      await cleanupOrder('--cleanup');
    } else {
      state.cleanupDone = true;
      record('cleanup', 'SKIP', `đơn test còn lại trong DB: ${id} — chạy --cleanup hoặc xoá tay`);
    }

    // 5b) Dọn đơn/admin tạm còn sót từ lần chạy trước (tuỳ chọn, cần secret).
    if (CLEANUP_STALE) {
      await cleanupStale('--cleanup-stale');
    } else if (SECRET_KEY) {
      const admin = makeAdmin();
      const stale = await admin.from('orders').select('id').like('id', 'E2E-%');
      if (!stale.error) {
        const count = (stale.data ?? []).length;
        record('cleanup.stale', count === 0 ? 'PASS' : 'SKIP', count === 0 ? 'không còn đơn E2E-% nào' : `còn ${count} đơn E2E-% (chạy --cleanup-stale để dọn)`);
      }
    }

    return 0;
  } finally {
    // P2-1: dọn dù main throw sau khi insert/tạo admin tạm. Không dọn khi live chưa bắt đầu
    // (guard chặn) để tránh đụng dữ liệu chỉ vì gõ sai biến môi trường.
    if (state.liveStarted) {
      try {
        await cleanupProvisionedAdmin('finally');
      } catch (err) {
        record('admin.provision_cleanup', 'FAIL', `cleanup admin tạm lỗi: ${(err as Error).message}`);
      }
      if (state.inserted && !state.cleanupDone) {
        try {
          await cleanupOrder('finally sau lỗi');
        } catch (err) {
          record('cleanup', 'FAIL', `cleanup đơn lỗi: ${(err as Error).message}`);
        }
      }
      if (CLEANUP_STALE && !state.staleDone) {
        try {
          await cleanupStale('finally sau lỗi');
        } catch (err) {
          record('cleanup.stale', 'FAIL', `cleanup stale lỗi: ${(err as Error).message}`);
        }
      }
    }
  }
}

function buildReport(outcome: Outcome) {
  return {
    harness: 'qa-api-01/guest-order-flow',
    mode: LIVE ? 'live' : 'dry-run',
    live: LIVE,
    target: TARGET,
    targetRaw: TARGET_RAW,
    startedAt,
    finishedAt: new Date().toISOString(),
    result: outcome,
    requested: requiredChecks(),
    summary: {
      total: results.length,
      pass: results.filter((r) => r.status === 'PASS').length,
      fail: results.filter((r) => r.status === 'FAIL').length,
      skip: results.filter((r) => r.status === 'SKIP').length,
      blocked: results.filter((r) => r.status === 'BLOCKED').length,
    },
    results,
  };
}

function finalize(mainCode: number) {
  const outcome = evaluateOutcome();
  const exitCode = outcome === 'PASS' ? 0 : mainCode === 2 ? 2 : 1;
  const report = buildReport(outcome);

  if (REPORT_PATH) {
    try {
      const abs = resolve(process.cwd(), REPORT_PATH);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      if (!JSON_MODE) console.log(`\nReport JSON: ${REPORT_PATH}`);
    } catch (err) {
      console.error(`Không ghi được report ${REPORT_PATH}: ${(err as Error).message}`);
    }
  }
  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `\nSUMMARY ${LIVE ? 'LIVE' : 'DRY-RUN'} target=${TARGET}: ${report.summary.total} check · PASS=${report.summary.pass} · FAIL=${report.summary.fail} · SKIP=${report.summary.skip} · BLOCKED=${report.summary.blocked}`
    );
    console.log(`RESULT: ${outcome}`);
  }
  process.exit(exitCode);
}

main()
  .then((code) => finalize(code))
  .catch((err) => {
    record('harness.crash', 'FAIL', (err as Error)?.message ?? String(err));
    finalize(1);
  });
