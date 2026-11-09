#!/usr/bin/env node
/**
 * gen-seo-files.mjs — sinh `public/robots.txt`, `public/sitemap.xml`, `public/manifest.webmanifest`.
 *
 * Nguồn route: `src/frontend/routes/AppRoutes.tsx`. Nếu `.env` có Supabase, thêm URL sản phẩm
 * đã publish từ bảng `products` (chỉ id — không bịa slug).
 *
 * Dùng:  node scripts/gen-seo-files.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

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
const site = (env.VITE_SITE_URL || env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

const routesSrc = readFileSync(join(ROOT, 'src/frontend/routes/AppRoutes.tsx'), 'utf8');
const allPaths = [...routesSrc.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

const PRIVATE = ['/admin', '/designer', '/lab', '/orders', '/assets', '/checkout', '/cart', '/tracking', '/auth'];
const isPrivate = (p) => PRIVATE.some((x) => p === x || p.startsWith(x + '/'));
const staticPublic = allPaths.filter(
  (p) => p !== '*' && !p.includes(':') && !isPrivate(p) && !['/my-orders', '/library', '/creator', '/creator/*', '/login', '/register', '/tool-3d'].includes(p),
);

let productIds = [];
try {
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/products?select=id&status=eq.published&limit=200`, {
      headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      productIds = (await res.json()).map((r) => r.id).filter(Boolean);
    }
  }
} catch {
  // SEO không được chặn build vì DB pause
}

const urls = [
  ...new Set([...staticPublic, ...productIds.map((id) => `/products/${id}`)]),
].sort();

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
${PRIVATE.map((p) => `Disallow: ${p}`).join('\n')}

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
  background_color: '#F8FAFC',
  theme_color: '#F8FAFC',
  categories: ['business', 'productivity', 'shopping'],
  icons: [
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
  ],
};

writeFileSync(join(ROOT, 'public', 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(join(ROOT, 'public', 'robots.txt'), robots, 'utf8');
writeFileSync(join(ROOT, 'public', 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`SEO files: ${urls.length} URL (${productIds.length} sản phẩm), site=${site}`);
