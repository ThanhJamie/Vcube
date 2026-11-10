#!/usr/bin/env node
/**
 * gen-seo-files.mjs — sinh `public/robots.txt`, `public/sitemap.xml`, `public/manifest.webmanifest`.
 *
 * SEO-01 (2026-11-10): domain production là **input bắt buộc**.
 *   - Không có fallback `http://localhost:3000`. Thiếu domain ⇒ exit 1, **không ghi file nào**.
 *   - Nguồn domain theo thứ tự: `--site` > `process.env.SEO_SITE_URL` > `process.env.VITE_SITE_URL`
 *     > `.env` `SEO_SITE_URL` > `.env` `VITE_SITE_URL`. Không có biến nào ⇒ fail.
 *   - Từ chối host dev/placeholder (localhost, 127.0.0.1, *.local, example.com…) ở mode production;
 *     production phải là `https://`.
 *   - Muốn xem trước ở máy: `--dev` (bắt buộc ghi ra ngoài `public/`, mặc định `dist/.seo-preview/`).
 *   - Sitemap chỉ chứa route public được index (bỏ `/personalize`, `/order-success`, `/cart`,
 *     `/checkout`, `/tracking`, `/auth`, các trang tài khoản/console) + product `status=published`
 *     (bỏ id demo `DEMO-*` và tên `[MẪU]`).
 *   - `--check`: kiểm tra offline `public/robots.txt` + `public/sitemap.xml` + màu manifest.
 *     Parse XML well-formed, cấm host dev/DEMO URL, bắt robots khai báo `Sitemap` cùng origin.
 *     `--allow-empty` chỉ dùng cho placeholder repo/CI khi chưa có domain production.
 *   - `--check` cũng so rule `Allow`/`Disallow` của robots với generator (chống sửa tay lệch)
 *     và mô phỏng khớp rule để chắc crawler tải được asset build (`/assets/*.js|css`).
 *   - `/assets` là HAI thứ trên cùng origin: route app (thư viện CAD số, cần chặn index) và
 *     thư mục build Vite (crawler phải tải để render). Vì vậy generator phát
 *     `Allow: /assets/` + `Disallow: /assets$`, KHÔNG dùng prefix `Disallow: /assets`.
 *
 * Nguồn route: `src/frontend/routes/AppRoutes.tsx`. Nguồn sản phẩm: Supabase
 * (`products` với `status=eq.published`) nếu `.env` có URL + publishable key.
 *
 * Dùng:
 *   node scripts/gen-seo-files.mjs --site https://vcube.vn
 *   VITE_SITE_URL=https://vcube.vn node scripts/gen-seo-files.mjs
 *   node scripts/gen-seo-files.mjs --check --allow-empty      # CI/offline khi chưa có domain
 *   node scripts/gen-seo-files.mjs --check                    # production: cần sitemap có URL
 *   node scripts/gen-seo-files.mjs --dev --site http://localhost:3000   # preview, không đụng public/
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ROOT theo vị trí script (`scripts/..`) — không phụ thuộc cwd khi CI gọi từ thư mục khác.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);

function hasFlag(name) {
  return argv.includes(name);
}

function argValue(name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : null;
}

function fail(message) {
  console.error(`\n✖ gen-seo-files: ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Domain

const PLACEHOLDER_HOST_RE = /(^|\.)(example\.(com|org|net)|invalid|test)$/i;

function isDevHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.local') ||
    h.endsWith('.localhost')
  );
}

/** Trả về origin chuẩn (https://host[:port]) hoặc null nếu không phải URL http(s) hợp lệ. */
function parseSite(raw) {
  if (!raw) return null;
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;
  return url.origin;
}

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

// ---------------------------------------------------------------------------
// Route / product sources (dùng chung cho generate + check)

/** Route public được index — nguồn duy nhất: AppRoutes.tsx. */
function readStaticPublicRoutes() {
  const routesSrc = readFileSync(join(ROOT, 'src/frontend/routes/AppRoutes.tsx'), 'utf8');
  // Alias redirect (`<Route … element={<Navigate … />}`) không phải URL canonical.
  const redirectPaths = new Set();
  for (const line of routesSrc.split('\n')) {
    if (!line.includes('Navigate')) continue;
    const m = line.match(/path="([^"]+)"/);
    if (m) redirectPaths.add(m[1]);
  }
  const allPaths = [...routesSrc.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
  return allPaths.filter(
    (p) =>
      p !== '*' &&
      !p.includes('*') &&
      !p.includes(':') &&
      !isNonIndexable(p) &&
      !redirectPaths.has(p),
  );
}

/** Route KHÔNG đưa vào sitemap và chặn trong robots.txt (không phải nội dung index). */
const NON_INDEXABLE = [
  '/admin',
  '/designer',
  '/lab',
  '/orders',
  '/assets',
  '/account',
  '/checkout',
  '/cart',
  '/tracking',
  '/auth',
  '/personalize',
  '/order-success',
];

function isNonIndexable(path) {
  return NON_INDEXABLE.some((x) => path === x || path.startsWith(x + '/'));
}

/** Product id an toàn để đưa vào URL công khai — không bịa, không nhận id demo. */
function isIndexableProductId(id) {
  if (typeof id !== 'string') return false;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return false;
  if (/^DEMO[-_]/i.test(id)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// XML well-formed (tối thiểu, không thêm dependency)

const NAME_RE = /^[A-Za-z_][\w.-]*(?::[\w.-]+)?$/;
const ATTR_RE = /^([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')\s*/;
const ENTITY_RE = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/;

/** Thuộc tính: `name="value"` hoặc `name='value'`, value không chứa `<`. */
function attributesWellFormed(rest) {
  let remaining = (rest || '').trim();
  while (remaining) {
    const m = remaining.match(ATTR_RE);
    if (!m) return false;
    const value = m[2] !== undefined ? m[2] : m[3];
    if (value.includes('<')) return false;
    remaining = remaining.slice(m[0].length).trim();
  }
  return true;
}

/**
 * Kiểm tra XML well-formed tối thiểu: 1 root, thẻ cân bằng, comment không chứa `--`,
 * text ngoài root bị cấm, entity `&` hợp lệ. Đủ cho sitemap; KHÔNG phải XML parser đầy đủ.
 * @returns {{ ok: boolean, error: string | null }}
 */
function checkXmlWellFormed(xml) {
  let i = xml.charCodeAt(0) === 0xfeff ? 1 : 0;
  const n = xml.length;
  const stack = [];
  let sawRoot = false;
  let rootClosed = false;

  const err = (msg) => ({ ok: false, error: `${msg} (vị trí ${i})` });

  while (i < n) {
    if (xml.startsWith('<!--', i)) {
      const end = xml.indexOf('-->', i + 4);
      if (end < 0) return err('comment không đóng');
      if (xml.slice(i + 4, end).includes('--')) return err('comment chứa "--" (XML cấm)');
      i = end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', i)) {
      const end = xml.indexOf(']]>', i + 9);
      if (end < 0) return err('CDATA không đóng');
      if (!stack.length) return err('CDATA ngoài root');
      i = end + 3;
      continue;
    }
    if (xml.startsWith('<?', i)) {
      const end = xml.indexOf('?>', i + 2);
      if (end < 0) return err('processing instruction không đóng');
      i = end + 2;
      continue;
    }
    if (xml.startsWith('<!DOCTYPE', i)) {
      const end = xml.indexOf('>', i);
      if (end < 0) return err('DOCTYPE không đóng');
      if (sawRoot) return err('DOCTYPE sau root');
      i = end + 1;
      continue;
    }
    if (xml[i] === '<') {
      const end = xml.indexOf('>', i + 1);
      if (end < 0) return err('thẻ không đóng');
      const raw = xml.slice(i + 1, end).trim();
      if (!raw) return err('thẻ rỗng <>');
      if (raw.startsWith('/')) {
        const name = raw.slice(1).trim();
        if (!stack.length) return err(`thẻ đóng </${name}> không có mở`);
        const open = stack.pop();
        if (open !== name) return err(`đóng </${name}> không khớp <${open}>`);
        if (!stack.length) rootClosed = true;
      } else {
        const selfClosing = raw.endsWith('/');
        const body = selfClosing ? raw.slice(0, -1).trim() : raw;
        const name = body.split(/[\s/]/)[0];
        if (!NAME_RE.test(name)) return err(`tên thẻ không hợp lệ: ${name || '(rỗng)'}`);
        if (!attributesWellFormed(body.slice(name.length))) {
          return err(`thuộc tính không hợp lệ trong <${name}>`);
        }
        if (!stack.length) {
          if (sawRoot) return err('có nhiều root element');
          sawRoot = true;
          if (selfClosing) rootClosed = true;
        }
        if (!selfClosing) stack.push(name);
      }
      i = end + 1;
      continue;
    }
    // text node
    const nextLt = xml.indexOf('<', i);
    const text = xml.slice(i, nextLt < 0 ? n : nextLt);
    if (text.trim()) {
      if (!stack.length) return err('text ngoài root element');
      if (text.replace(ENTITY_RE, '').includes('&')) return err('entity "&" không hợp lệ');
    }
    i = nextLt < 0 ? n : nextLt;
  }

  if (!sawRoot) return { ok: false, error: 'không có root element' };
  if (rootClosed === false && stack.length) {
    return { ok: false, error: `thẻ <${stack[stack.length - 1]}> chưa đóng` };
  }
  if (stack.length) return { ok: false, error: `thẻ <${stack[stack.length - 1]}> chưa đóng` };
  return { ok: true, error: null };
}

// ---------------------------------------------------------------------------
// --check (offline): public/robots.txt + public/sitemap.xml + manifest token

const CANVAS_TOKEN_RE = /--color-canvas:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\b/;

function readCanvasToken() {
  try {
    const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
    const m = css.match(CANVAS_TOKEN_RE);
    return m ? m[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

/** robots: lấy các giá trị `Sitemap:` (bỏ comment). */
function readRobotsSitemaps(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && /^sitemap\s*:/i.test(l))
    .map((l) => l.replace(/^sitemap\s*:\s*/i, '').trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// robots rule: nguồn duy nhất cho generate + --check

/**
 * Rule robots cho `User-agent: *`.
 *
 * `/assets` là hai thứ khác nhau trên cùng origin:
 *   1. route app `/assets` (thư viện CAD số, `ProtectedRoute`) → không muốn index;
 *   2. thư mục build Vite `/assets/` (`index-<hash>.js|css`, chunk vendor… — 49 file trong
 *      `dist/assets`) → crawler PHẢI tải được để render SPA; `vercel.json` còn cache `/assets/(.*)`.
 *
 * Rule `Disallow: /assets` không có `$` là khớp **tiền tố** ⇒ chặn luôn JS/CSS. Vì vậy:
 *   - `Allow: /assets/` (khớp dài hơn ⇒ thắng theo RFC 9309) giữ asset cho mọi crawler,
 *     kể cả crawler không hỗ trợ `$`;
 *   - `Disallow: /assets$` chỉ chặn đúng URL route `/assets`.
 */
const ASSET_ROUTE = '/assets';

function buildRobotsRules() {
  const lines = ['User-agent: *', 'Allow: /'];
  for (const p of NON_INDEXABLE) {
    if (p === ASSET_ROUTE) {
      lines.push(`Allow: ${ASSET_ROUTE}/`, `Disallow: ${ASSET_ROUTE}$`);
    } else {
      lines.push(`Disallow: ${p}`);
    }
  }
  return lines;
}

/** Tách rule `allow`/`disallow` + dòng directive của group `User-agent: *` (bỏ comment, Sitemap). */
function parseRobotsRules(text) {
  const rules = [];
  const directives = [];
  let agents = [];
  let inAgentBlock = true;
  let applies = false;

  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === 'user-agent') {
      if (!inAgentBlock) {
        agents = [];
        inAgentBlock = true;
      }
      agents.push(value.toLowerCase());
      applies = agents.includes('*');
      continue;
    }
    if (key !== 'allow' && key !== 'disallow') continue; // sitemap/crawl-delay: ngoài phạm vi khớp
    inAgentBlock = false;
    if (!applies) continue;
    directives.push(`${key}: ${value}`);
    if (key === 'disallow' && !value) continue; // "Disallow:" rỗng = không chặn gì
    rules.push({ type: key, pattern: value });
  }
  return { rules, directives };
}

/** `$` = neo cuối; `*` = wildcard; không có `$` = khớp tiền tố (RFC 9309, rút gọn). */
function robotsPatternMatches(pattern, pathname) {
  if (!pattern) return false;
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  if (!body) return false;
  const rx =
    '^' +
    body
      .split('*')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*') +
    (anchored ? '$' : '');
  return new RegExp(rx).test(pathname);
}

/** Path (bỏ query/hash) có được crawl không: rule khớp dài nhất thắng, hoà ⇒ Allow thắng. */
function robotsAllows(pathname, rules) {
  const path = pathname.split('#')[0].split('?')[0];
  let best = null;
  for (const rule of rules) {
    if (!robotsPatternMatches(rule.pattern, path)) continue;
    const weight = rule.pattern.replace(/\$$/, '').length;
    if (!best || weight > best.weight || (weight === best.weight && rule.type === 'allow')) {
      best = { weight, type: rule.type };
    }
  }
  return !best || best.type === 'allow';
}

/** Mẫu URL asset Vite (hash lấy từ build gần nhất trong repo — không cần build lại). */
const BUILD_ASSET_SAMPLES = [
  '/assets/index-CMz-WlGN.js',
  '/assets/index-Ccjb4e85.css',
  '/assets/react-vendor-BFTP0yF9.js',
  '/assets/supabase-vendor-gHjsosjr.js',
  '/assets/three-vendor-CTPGR6fN.js',
  '/assets/cadParser.worker-wcZ8WCcY.js',
  '/assets/ThreeModelViewer-CzL3UBVm.js',
];

/** URL asset thật trong `dist/index.html` nếu có build sẵn (không bắt buộc — CI offline bỏ qua). */
function readBuiltAssetUrls() {
  const p = join(ROOT, 'dist', 'index.html');
  if (!existsSync(p)) return [];
  const html = readFileSync(p, 'utf8');
  return [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))];
}

function checkRobotsPolicy(text, errors) {
  const { rules, directives } = parseRobotsRules(text);

  // 1) Rule phải đúng như generator (file có header "sinh bởi" — sửa tay lệch là lỗi).
  const expected = buildRobotsRules()
    .filter((l) => !/^user-agent\s*:/i.test(l))
    .map((l) => l.toLowerCase());
  if (directives.length !== expected.length || directives.some((d, i) => d !== expected[i])) {
    errors.push(
      'robots.txt lệch generator (`Allow`/`Disallow`) — sinh lại bằng scripts/gen-seo-files.mjs; ' +
        `mong đợi: ${expected.join(' | ')}`,
    );
  }

  // 2) Asset build phải crawl được (negative test: quay lại prefix `Disallow: /assets` ⇒ fail).
  for (const u of [...new Set([...BUILD_ASSET_SAMPLES, ...readBuiltAssetUrls()])]) {
    if (!robotsAllows(u, rules)) {
      errors.push(
        `robots.txt chặn asset build: ${u} — dùng "Allow: /assets/" + "Disallow: /assets$", ` +
          'không dùng prefix "Disallow: /assets"',
      );
    }
  }

  // 3) Route app nội bộ vẫn phải bị chặn (kể cả `/assets` — chỉ chặn đúng URL đó).
  for (const p of NON_INDEXABLE) {
    if (!robotsAllows(p, rules)) continue;
    errors.push(`robots.txt không chặn route nội bộ ${p}`);
  }
}

function runCheck({ allowEmpty }) {
  const errors = [];
  const robotsPath = join(ROOT, 'public', 'robots.txt');
  const sitemapPath = join(ROOT, 'public', 'sitemap.xml');
  const manifestPath = join(ROOT, 'public', 'manifest.webmanifest');

  if (!existsSync(robotsPath)) errors.push('thiếu public/robots.txt');
  if (!existsSync(sitemapPath)) errors.push('thiếu public/sitemap.xml');
  if (!existsSync(manifestPath)) errors.push('thiếu public/manifest.webmanifest');

  let robotsText = '';
  let sitemapOrigin = null;
  let locCount = 0;

  if (existsSync(robotsPath)) {
    robotsText = readFileSync(robotsPath, 'utf8');
    robotsText.split('\n').forEach((line, i) => {
      if (/^\s*#/.test(line)) return;
      if (PLACEHOLDER_HOST_RE.test(line) || /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(line)) {
        errors.push(`robots.txt:${i + 1} chứa host dev/placeholder: ${line.trim()}`);
      }
    });
    // Rule asset/route: crawler phải tải được `/assets/*.js|css`, route app vẫn bị chặn.
    checkRobotsPolicy(robotsText, errors);
  }

  if (existsSync(sitemapPath)) {
    const xml = readFileSync(sitemapPath, 'utf8');

    const wf = checkXmlWellFormed(xml);
    if (!wf.ok) errors.push(`sitemap.xml không well-formed: ${wf.error}`);

    const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
    locCount = locs.length;
    const allowedStatic = new Set(readStaticPublicRoutes());

    if (locs.length === 0) {
      if (!allowEmpty) {
        errors.push(
          'sitemap.xml không có <loc> nào — placeholder chỉ hợp lệ với --allow-empty; ' +
            'production cần domain thật (`--site https://<domain>`).',
        );
      }
    }

    for (const loc of locs) {
      let url;
      try {
        url = new URL(loc);
      } catch {
        errors.push(`sitemap.xml: <loc> không phải URL tuyệt đối: ${loc}`);
        continue;
      }
      if (url.protocol !== 'https:') {
        errors.push(`sitemap.xml: <loc> phải là https: ${loc}`);
      }
      if (isDevHost(url.hostname) || PLACEHOLDER_HOST_RE.test(url.hostname)) {
        errors.push(`sitemap.xml: <loc> trỏ host dev/placeholder: ${loc}`);
      }
      if (sitemapOrigin === null) sitemapOrigin = url.origin;
      else if (url.origin !== sitemapOrigin) {
        errors.push(`sitemap.xml: nhiều origin khác nhau (${sitemapOrigin} vs ${url.origin})`);
      }
      const path = url.pathname.replace(/\/$/, '') || '/';
      if (path.startsWith('/products/')) {
        let id;
        try {
          id = decodeURIComponent(path.slice('/products/'.length));
        } catch {
          errors.push(`sitemap.xml: product id không decode được: ${loc}`);
          continue;
        }
        if (!isIndexableProductId(id)) {
          errors.push(`sitemap.xml: product URL không hợp lệ/demo: ${loc}`);
        }
      } else if (!allowedStatic.has(path)) {
        errors.push(`sitemap.xml: route không được index hoặc không tồn tại: ${loc}`);
      }
    }

    // Có URL ⇒ robots phải trỏ tới đúng sitemap cùng origin.
    if (locs.length > 0 && sitemapOrigin) {
      const expected = `${sitemapOrigin}/sitemap.xml`;
      const declared = readRobotsSitemaps(robotsText);
      const matched = declared.some((value) => {
        try {
          const u = new URL(value);
          return u.origin === sitemapOrigin && u.pathname.replace(/\/$/, '') === '/sitemap.xml';
        } catch {
          return false;
        }
      });
      if (!matched) {
        errors.push(`robots.txt thiếu "Sitemap: ${expected}" khớp với sitemap.xml`);
      }
    }
  }

  if (existsSync(manifestPath)) {
    let manifest = null;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      errors.push(`manifest.webmanifest không parse được: ${e.message}`);
    }
    const canvas = readCanvasToken();
    if (!canvas) {
      errors.push('không đọc được token --color-canvas từ src/index.css — không thể xác nhận màu manifest');
    } else if (manifest) {
      for (const key of ['background_color', 'theme_color']) {
        const value = String(manifest[key] || '').toUpperCase();
        if (value !== canvas) {
          errors.push(`manifest.webmanifest: ${key}=${manifest[key]} lệch token canvas ${canvas}`);
        }
      }
    }
  }

  if (errors.length) {
    console.error(`✖ gen-seo-files --check: ${errors.length} lỗi`);
    for (const e of errors) console.error(`  - ${e}`);
    return 1;
  }

  console.log(
    `✓ gen-seo-files --check: robots.txt/sitemap.xml/manifest hợp lệ ` +
      `(${locCount} URL${locCount === 0 ? ' — placeholder, chờ domain production' : ''})`,
  );
  return 0;
}

// ---------------------------------------------------------------------------
// CLI

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(
    [
      'Dùng:',
      '  node scripts/gen-seo-files.mjs --site https://<domain>   # ghi public/',
      '  SEO_SITE_URL=https://<domain> node scripts/gen-seo-files.mjs',
      '  VITE_SITE_URL=https://<domain> node scripts/gen-seo-files.mjs',
      '  node scripts/gen-seo-files.mjs --check --allow-empty     # CI offline khi chưa có domain',
      '  node scripts/gen-seo-files.mjs --check                   # production: sitemap phải có URL',
      '  node scripts/gen-seo-files.mjs --dev --site http://localhost:3000 --out dist/.seo-preview',
      '',
      'Thứ tự domain: --site > process.env.SEO_SITE_URL > process.env.VITE_SITE_URL',
      '               > .env SEO_SITE_URL > .env VITE_SITE_URL.',
      'Không có domain production ⇒ exit 1 và KHÔNG ghi file nào.',
    ].join('\n'),
  );
  process.exit(0);
}

if (hasFlag('--check')) {
  process.exit(runCheck({ allowEmpty: hasFlag('--allow-empty') }));
}

const env = readEnv();
const rawSite =
  argValue('--site') ||
  process.env.SEO_SITE_URL ||
  process.env.VITE_SITE_URL ||
  env.SEO_SITE_URL ||
  env.VITE_SITE_URL ||
  '';

const site = parseSite(rawSite);
const dev = hasFlag('--dev');
const outDir = resolve(ROOT, argValue('--out') || (dev ? 'dist/.seo-preview' : 'public'));
const publicDir = resolve(ROOT, 'public');

if (!site) {
  fail(
    'thiếu domain production. Truyền `--site https://<domain>`, đặt `SEO_SITE_URL`/`VITE_SITE_URL`\n' +
      '  trong môi trường hoặc trong `.env`. Không ghi file nào.\n' +
      '  Xem trước ở máy: `--dev --site http://localhost:3000 --out dist/.seo-preview`.',
  );
}

if (isDevHost(new URL(site).hostname) || PLACEHOLDER_HOST_RE.test(new URL(site).hostname)) {
  if (!dev) {
    fail(
      `domain "${site}" là host dev/placeholder — không được dùng cho production.\n` +
        '  Dùng `--dev --out dist/.seo-preview` nếu chỉ muốn xem trước (không ghi vào public/).',
    );
  }
  if (outDir === publicDir) {
    fail('mode `--dev` không được ghi vào public/. Dùng `--out dist/.seo-preview` (hoặc bỏ `--out`).');
  }
}

if (!dev && new URL(site).protocol !== 'https:') {
  fail(`domain production phải là https:// (nhận "${site}"). Sitemap https là yêu cầu của --check.`);
}

// ---------------------------------------------------------------------------
// Route list

const staticPublic = readStaticPublicRoutes();

// Products: chỉ published, bỏ id demo/tên [MẪU]. Không bịa id.
let productIds = [];
try {
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    const res = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/products?select=id,name&status=eq.published&limit=200`,
      {
        headers: {
          apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (res.ok) {
      productIds = (await res.json())
        .filter((r) => r && isIndexableProductId(r.id))
        .filter((r) => !String(r.name || '').includes('[MẪU]'))
        .map((r) => r.id);
    } else {
      console.warn(`! gen-seo-files: không đọc được products (HTTP ${res.status}) — bỏ qua product URL.`);
    }
  }
} catch {
  // SEO không được chặn build vì DB pause.
  console.warn('! gen-seo-files: không đọc được products (DB/mạng) — bỏ qua product URL.');
}

const urls = [...new Set([...staticPublic, ...productIds.map((id) => `/products/${id}`)])].sort();

// ---------------------------------------------------------------------------
// Output

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${site}${u}</loc>
    <changefreq>${u === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${u === '/' ? '1.0' : u.startsWith('/products/') ? '0.8' : '0.7'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

const robots = `# VCUBE — sinh bởi scripts/gen-seo-files.mjs
${buildRobotsRules().join('\n')}

Sitemap: ${site}/sitemap.xml
`;

const manifest = {
  name: 'VCUBE — In 3D công nghiệp & CAD chính xác',
  short_name: 'VCUBE',
  description: 'Marketplace in 3D và báo giá CAD chính xác cho cơ khí, vỏ hộp IoT và khuôn mẫu.',
  lang: 'vi',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#F6F7EF',
  theme_color: '#F6F7EF',
  categories: ['business', 'productivity', 'shopping'],
  icons: [
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
  ],
};

mkdirSync(outDir, { recursive: true });
mkdirSync(dirname(join(outDir, 'sitemap.xml')), { recursive: true });

writeFileSync(join(outDir, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(join(outDir, 'robots.txt'), robots, 'utf8');
writeFileSync(join(outDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(
  `SEO files → ${outDir.replace(ROOT + '/', '')}/: ${urls.length} URL (${productIds.length} sản phẩm), site=${site}${dev ? ' [DEV]' : ''}`,
);
