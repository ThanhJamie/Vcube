#!/usr/bin/env node
/**
 * machine-next.mjs — "bộ não" chọn việc của Code Machine.
 *
 * Đọc:  .loop/po.json (po-audit), .loop/latest.json (loop-audit), .loop/machine-state.json
 * Ghi:  .loop/machine-state.json (khi dùng --approve/--block/--complete)
 *
 * Không sửa code. Chỉ quyết định: làm gì tiếp, ai làm, verify bằng gì, có cần người duyệt không.
 *
 * Dùng:
 *   node scripts/machine-next.mjs                 # in quyết định (JSON)
 *   node scripts/machine-next.mjs --pretty        # in cho người đọc
 *   node scripts/machine-next.mjs --approve <id>  # PO duyệt task cần người
 *   node scripts/machine-next.mjs --block <id> --reason "..."
 *   node scripts/machine-next.mjs --complete <id>
 *   node scripts/machine-next.mjs --reset
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LOOP = join(ROOT, '.loop');
const STATE_PATH = join(LOOP, 'machine-state.json');
const PO_PATH = join(LOOP, 'po.json');
const AUDIT_PATH = join(LOOP, 'latest.json');

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const state = readJson(STATE_PATH, { iteration: 0, approvals: [], blocked: {}, history: [] });
const po = readJson(PO_PATH, null);
const loop = readJson(AUDIT_PATH, null);

/** Tên biến môi trường đang có trong `.env` (không đọc giá trị). */
function readEnvKeys() {
  try {
    const raw = readFileSync(join(ROOT, '.env'), 'utf8');
    return new Set(
      raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => l.slice(0, l.indexOf('=')).trim()),
    );
  } catch {
    return new Set();
  }
}
const envKeys = readEnvKeys();

if (!po) {
  console.error('Chưa có .loop/po.json — chạy `npm run po:audit` trước.');
  process.exit(2);
}

/* --------------------------------------------------------------- task catalog */

/**
 * Mỗi entry ánh xạ một tiêu chí PO thất bại → một task có chủ sở hữu file rõ ràng.
 * `requiresApproval` = việc không thể tự quyết (ghi DB thật, migration, secret).
 */
const CATALOG = [
  {
    match: (c) => c.group === 'dataHonesty',
    id: 'demo-data-cleanup',
    title: 'Dọn dữ liệu [MẪU] + ảnh bịa (DB thật)',
    owners: ['docs/tasks/demo-data-cleanup.md', 'scripts/audit-demo-data.mjs'],
    verify: ['npm run po:audit'],
    requiresApproval: 'Cần PO duyệt ghi DB (UPDATE/ẩn dòng demo).',
    requiresEnv: 'SUPABASE_ACCESS_TOKEN',
    direction: 'Chạy kế hoạch trong docs/tasks/demo-data-cleanup.md; ưu tiên ẩn (status=draft) trước, không xoá.',
  },
  {
    match: (c) => c.id === 'feature:digitalDelivery',
    id: 'digital-delivery',
    title: 'Giao file CAD sau khi mua (order_files + signed URL)',
    owners: ['docs/database/digital-delivery.md', 'src/frontend/views/CheckoutView.tsx', 'src/frontend/views/AssetLibraryView.tsx'],
    verify: ['npm run check', 'npm run po:audit'],
    requiresApproval: 'Cần duyệt migration #14 (RPC SECURITY DEFINER + storage policy).',
    requiresEnv: 'SUPABASE_ACCESS_TOKEN',
    direction: 'Duyệt SQL trong docs/database/digital-delivery.md (PA1), rồi nối client theo đúng luồng đã mô tả.',
  },
  {
    match: (c) => c.id === 'feature:notifications',
    id: 'notifications',
    title: 'Trung tâm thông báo realtime + PWA offline',
    owners: ['src/frontend/components/shell/AppOverlays.tsx', 'src/frontend/hooks/useOrdersData.ts'],
    verify: ['npm run check', 'npm run po:audit'],
    direction: 'Dựa trên orders/status hiện có; không thêm bảng mới nếu chưa cần. Ưu tiên realtime orders + badge.',
  },
  {
    match: (c) => c.id === 'feature:reviewPhotos',
    id: 'review-photos',
    title: 'Ảnh thực tế trong đánh giá',
    owners: ['src/backend/services/reviewService.ts', 'src/frontend/views/ProductDetailView.tsx'],
    verify: ['npm run check', 'npm run po:audit'],
    requiresApproval: 'Cần kiểm tra/duyệt storage policy cho upload ảnh review.',
    direction: 'Kiểm tra policy bucket product-images trước; nếu chưa cho phép, đề xuất SQL thay vì mở quyền mù.',
  },
  {
    match: (c) => c.id === 'feature:accountSecurity',
    id: 'account-security',
    title: 'Đổi mật khẩu + địa chỉ giao hàng trong /account',
    owners: ['src/frontend/views/AccountView.tsx'],
    verify: ['npm run check', 'npm run po:audit'],
    direction: 'Dùng supabase.auth.updateUser cho mật khẩu; địa chỉ cần bảng/cột — nếu thiếu thì đề xuất migration thay vì nhét localStorage.',
  },
  {
    match: (c) => c.group === 'seo',
    id: 'seo',
    title: 'SEO/PWA (robots, sitemap, manifest, SEOHead)',
    owners: ['public/robots.txt', 'public/sitemap.xml', 'public/manifest.webmanifest', 'index.html', 'src/frontend/components/SEOHead.tsx'],
    verify: ['npm run seo:gen', 'npm run po:audit'],
    direction: 'Sinh lại file SEO; bổ sung canonical/noindex cho route private; không bịa OG image.',
  },
  {
    match: (c) => c.group === 'performance',
    id: 'performance',
    title: 'Ngân sách hiệu năng (JS/CSS/font/CLS)',
    owners: ['vite.config.ts', 'src/index.css', 'index.html', 'src/frontend/views/ExploreView.tsx'],
    verify: ['npm run build', 'npm run po:audit'],
    direction: 'Đo trước–sau; chỉ sửa đúng ngân sách vượt; không đổi thiết kế.',
  },
  {
    match: (c) => c.group === 'reliability',
    id: 'reliability',
    title: 'Ổn định runtime (gate/route/pageerror)',
    owners: ['src/frontend/routes/AppRoutes.tsx', 'scripts/run-checks.mjs'],
    verify: ['npm run check'],
    direction: 'Tái hiện lỗi bằng gate/route smoke trước khi sửa; không nới gate.',
  },
  {
    match: (c) => c.group === 'accessibility',
    id: 'a11y',
    title: 'Accessibility (contrast, focus, aria)',
    owners: ['src/frontend/ui/**', 'src/frontend/views/**'],
    verify: ['npm run check'],
    direction: 'Sửa theo đúng checker báo; không thêm allowlist khi chưa có lý do.',
  },
  {
    match: (c) => c.group === 'ops',
    id: 'ops',
    title: 'Vận hành/An toàn (RLS, secret, env)',
    owners: ['supabase/migrations/**', '.gitignore'],
    verify: ['npm run check'],
    requiresApproval: 'Thay đổi RLS/migration cần người duyệt.',
    direction: 'Chỉ đề xuất SQL/policy; không tự áp migration.',
  },
  {
    match: (c) => c.group === 'docs',
    id: 'docs',
    title: 'Tài liệu (dead refs, freshness)',
    owners: ['docs/**', 'scripts/check-doc-refs.mjs'],
    verify: ['node scripts/check-doc-refs.mjs --warn'],
    direction: 'Chỉ sửa path thật; archive plans thì bỏ qua.',
  },
];

/* ------------------------------------------------------------------ decision */

const approvals = new Set(state.approvals || []);
const blocked = state.blocked || {};
const completedTasks = new Set((state.history || []).map((h) => h.task));

const failing = (po.backlog || []).filter((c) => !c.pass);
const decisions = [];
const seen = new Set();
const covered = new Set();
const skippedCompleted = new Set();

for (const check of failing) {
  const task = CATALOG.find((t) => t.match(check));
  if (!task) continue;
  covered.add(`${check.group}/${check.id}`);
  if (seen.has(task.id)) continue;
  // Task đã hoàn tất trong một vòng trước: không chọn lại (tránh vòng lặp vô hạn).
  if (completedTasks.has(task.id)) { skippedCompleted.add(`${check.group}/${check.id}`); continue; }
  seen.add(task.id);
  const needsApproval = Boolean(task.requiresApproval) && !approvals.has(task.id);
  const isBlocked = Boolean(blocked[task.id]) && !approvals.has(task.id);
  const missingEnv = Boolean(task.requiresEnv) && !envKeys.has(task.requiresEnv);
  decisions.push({
    ...task,
    triggeredBy: `${check.group}/${check.id}`,
    priority: check.p0 ? 'P0' : 'P1',
    status: missingEnv
      ? 'needs-setup'
      : needsApproval || isBlocked
        ? 'needs-approval'
        : 'ready',
    reason: missingEnv
      ? `Thiếu ${task.requiresEnv} trong .env — xem docs/database/sql-automation.md`
      : needsApproval
        ? task.requiresApproval
        : isBlocked
          ? blocked[task.id]
          : null,
  });
}

const ready = decisions.filter((d) => d.status === 'ready');
const waiting = decisions.filter((d) => d.status !== 'ready');
const unmapped = failing
  .filter((c) => !covered.has(`${c.group}/${c.id}`) || skippedCompleted.has(`${c.group}/${c.id}`))
  .map((c) => ({ group: c.group, id: c.id, detail: c.detail, p0: Boolean(c.p0) }));

const result = {
  timestamp: new Date().toISOString(),
  iteration: state.iteration || 0,
  poScore: po.score,
  satisfied: po.satisfied,
  p0fail: po.p0fail,
  gates: loop ? { pass: loop.gatesFailed === 0, lint: loop.lintPass } : null,
  decision: ready[0] || null,
  queue: ready.slice(1),
  waiting,
  unmapped,
  stop:
    po.satisfied
      ? 'satisfied'
      : ready.length === 0
        ? waiting.some((w) => w.status === 'needs-setup')
          ? 'blocked-on-setup'
          : 'blocked-on-human'
        : null,
};

/* --------------------------------------------------------------- state writes */

function saveState() {
  mkdirSync(LOOP, { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

const approveId = arg('--approve');
const blockId = arg('--block');
const completeId = arg('--complete');

if (approveId) {
  state.approvals = Array.from(new Set([...(state.approvals || []), approveId]));
  delete state.blocked?.[approveId];
  saveState();
  console.log(`approved: ${approveId}`);
  process.exit(0);
}
if (blockId) {
  state.blocked = { ...(state.blocked || {}), [blockId]: arg('--reason') || 'blocked' };
  saveState();
  console.log(`blocked: ${blockId}`);
  process.exit(0);
}
if (completeId) {
  state.iteration = (state.iteration || 0) + 1;
  state.history = [
    ...(state.history || []),
    { iteration: state.iteration, task: completeId, at: new Date().toISOString(), poScore: po.score },
  ];
  saveState();
  console.log(`completed: ${completeId} (iteration ${state.iteration})`);
  process.exit(0);
}
if (argv.includes('--reset')) {
  writeFileSync(STATE_PATH, JSON.stringify({ iteration: 0, approvals: [], blocked: {}, history: [] }, null, 2) + '\n');
  console.log('machine-state reset');
  process.exit(0);
}

if (argv.includes('--pretty')) {
  console.log(`\n=== CODE MACHINE · vòng ${result.iteration + 1} ===`);
  console.log(`PO score: ${result.poScore}/100 · satisfied=${result.satisfied} · P0 fail=${result.p0fail}`);
  if (result.gates) console.log(`Gate: ${result.gates.pass ? 'PASS' : 'FAIL'} · lint: ${result.gates.lint ? 'PASS' : 'FAIL'}`);
  if (result.decision) {
    console.log(`\n▶ LÀM: [${result.decision.priority}] ${result.decision.title}  (id: ${result.decision.id})`);
    console.log(`  vì: ${result.decision.triggeredBy}`);
    console.log(`  hướng: ${result.decision.direction}`);
    console.log(`  file: ${result.decision.owners.join(', ')}`);
    console.log(`  verify: ${result.decision.verify.join(' · ')}`);
  }
  if (result.queue.length) {
    console.log(`\nHàng đợi: ${result.queue.map((t) => t.id).join(', ')}`);
  }
  if (result.waiting.length) {
    console.log('\nChờ người duyệt:');
    for (const t of result.waiting) console.log(`  ⏸ ${t.id} — ${t.reason}`);
  }
  if (result.unmapped.length) {
    console.log('\nKhông có task tự động (cần nội dung/quyết định của người):');
    for (const c of result.unmapped) console.log(`  ! ${c.group}/${c.id} — ${c.detail}`);
  }
  if (result.stop) console.log(`\nDừng: ${result.stop}`);
  console.log(`\n→ chi tiết: .loop/machine-state.json\n`);
} else {
  console.log(JSON.stringify(result));
}

process.exit(0);
