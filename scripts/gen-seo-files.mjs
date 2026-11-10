#!/usr/bin/env node
/**
 * gen-seo-files.mjs — sinh `public/robots.txt`, `public/sitemap.xml`, `public/manifest.webmanifest`.
 *
 * SEO-01 (2026-11-10): domain production là **input bắt buộc**.
 *   - Không có fallback `http://localhost:3000`. Thiếu domain ⇒ exit 1, **không ghi file nào**.
 *   - Từ chối host dev/placeholder (localhost, 127.0.0.1, *.local, example.com…) ở mode production.
 *   - Muốn xem trước ở máy: `--dev` (bắt buộc ghi ra ngoài `public/`, mặc định `dist/.seo-preview/`).
 *   - Sitemap chỉ chứa route public được index (bỏ `/personalize`, `/order-success`, `/cart`,
 *     `/checkout`, `/tracking`, `/auth`, các trang tài khoản/console) + product `status=published`
 *     (bỏ id demo `DEMO-*` và tên `[MẪU]`).
 *   - `--check`: kiểm tra offline `public/robots.txt` + `public/sitemap.xml` + màu manifest,
 *     cấm host dev/DEMO URL. Không đọc DB, không gọi mạng.
 *
 * Nguồn route: `src/frontend/routes/AppRoutes.tsx`. Nguồn sản phẩm: Supabase
 * (`products` với `status=eq.published`) nếu `.env` có URL + publishable key.
 *
 * Dùng:
 *   node scripts/gen-seo-files.mjs --site https://vcube.vn
 *   VITE_SITE_URL=https://vcube.vn node scripts/gen-seo-files.mjs
 *   node scripts/gen-seo-files.mjs --check                    # CI/offline
 *   node scripts/gen-seo-files.mjs --dev --site http://localhost:3000   # preview, không đụng public/
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = process.cwd();
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
// --check (offline): public/robots.txt + public/sitemap.xml + manifest token

const CANVAS_TOKEN_RE = /--color-canvas:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\b/;

function readCanvasToken() {
  const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
  const m = css.match(CANVAS_TOKEN_RE);
  return m ? m[1].toUpperCase() : null;
}

function runCheck() {
  const errors = [];
  const robotsPath = join(ROOT, 'public', 'robots.txt');
  const sitemapPath = join(ROOT, 'public', 'sitemap.xml');
  const manifestPath = join(ROOT, 'public', 'manifest.webmanifest');

  if (!existsSync(robotsPath)) errors.push('thiếu public/robots.txt');
  if (!existsSync(sitemapPath)) errors.push('thiếu public/sitemap.xml');
  if (!existsSync(manifestPath)) errors.push('thiếu public/manifest.webmanifest');

  let sitemapOrigin = null;

  if (existsSync(robotsPath)) {
    const lines = readFileSync(robotsPath, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (/^\s*#/.test(line)) return;
      if (PLACEHOLDER_HOST_RE.test(line) || /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(line)) {
        errors.push(`robots.txt:${i + 1} chứa host dev/placeholder: ${line.trim()}`);
      }
    });
  }

  if (existsSync(sitemapPath)) {
    const xml = readFileSync(sitemapPath, 'utf8');
    const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
    const allowedStatic = new Set(readStaticPublicRoutes());
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
        const id = decodeURIComponent(path.slice('/products/'.length));
        if (!isIndexableProductId(id)) {
          errors.push(`sitemap.xml: product URL không hợp lệ/demo: ${loc}`);
        }
      } else if (!allowedStatic.has(path)) {
        errors.push(`sitemap.xml: route không được index hoặc không tồn tại: ${loc}`);
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
    if (manifest && canvas) {
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

  console.log('✓ gen-seo-files --check: robots.txt/sitemap.xml/manifest hợp lệ (không localhost, không DEMO-*)');
  return 0;
}

// ---------------------------------------------------------------------------
// CLI

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(
    [
      'Dùng:',
      '  node scripts/gen-seo-files.mjs --site https://<domain>   # ghi public/',
      '  VITE_SITE_URL=https://<domain> node scripts/gen-seo-files.mjs',
      '  node scripts/gen-seo-files.mjs --check                   # CI offline',
      '  node scripts/gen-seo-files.mjs --dev --site http://localhost:3000 --out dist/.seo-preview',
      '',
      'Không có `--site`/`VITE_SITE_URL` production ⇒ exit 1 và KHÔNG ghi file nào.',
    ].join('\n'),
  );
  process.exit(0);
}

if (hasFlag('--check')) {
  process.exit(runCheck());
}

const env = readEnv();
const rawSite =
  argValue('--site') ||
  env.SEO_SITE_URL ||
  env.VITE_SITE_URL ||
  env.NEXT_PUBLIC_SITE_URL ||
  '';

const site = parseSite(rawSite);
const dev = hasFlag('--dev');
const outDir = resolve(ROOT, argValue('--out') || (dev ? 'dist/.seo-preview' : 'public'));
const publicDir = resolve(ROOT, 'public');

if (!site) {
  fail(
    'thiếu domain production. Truyền `--site https://<domain>` hoặc đặt `VITE_SITE_URL`.\n' +
      '  Không ghi file nào. Muốn xem trước ở máy: `--dev --site http://localhost:3000 --out dist/.seo-preview`.',
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
User-agent: *
Allow: /

${NON_INDEXABLE.map((p) => `Disallow: ${p}`).join('\n')}

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
