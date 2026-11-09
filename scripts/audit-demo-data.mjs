#!/usr/bin/env node
/**
 * audit-demo-data.mjs — READ-ONLY audit dữ liệu demo (`[MẪU]`) + ảnh bịa trong Supabase.
 *
 * Không ghi DB, không in khoá. Chỉ đọc `.env` (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).
 *
 * Dùng:  node scripts/audit-demo-data.mjs
 * RC:    0 = audit xong · 2 = thiếu cấu hình
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function readEnv() {
  const path = join(ROOT, '.env');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const env = readEnv();
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY trong .env');
  process.exit(2);
}

const AS_JSON = process.argv.includes('--json');

const TABLES = [
  'products',
  'materials',
  'accessories',
  'printer_fleet',
  'site_content',
  'app_settings',
  'reviews',
  'digital_assets',
  'workshop_profiles',
];

const FABRICATED = ['images.unsplash.com', 'picsum.photos'];
const MARKER = '[MẪU]';

function hasMarker(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.includes(MARKER);
  if (Array.isArray(value)) return value.some(hasMarker);
  if (typeof value === 'object') return Object.values(value).some(hasMarker);
  return false;
}

function hasFabricatedImage(value) {
  if (value == null) return false;
  if (typeof value === 'string') return FABRICATED.some((f) => value.includes(f));
  if (Array.isArray(value)) return value.some(hasFabricatedImage);
  if (typeof value === 'object') return Object.values(value).some(hasFabricatedImage);
  return false;
}

async function fetchTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, error: (await res.text()).slice(0, 160) };
  }
  return { ok: true, rows: await res.json() };
}

const report = [];
for (const table of TABLES) {
  const r = await fetchTable(table);
  if (!r.ok) {
    report.push({ table, readable: false, status: r.status, note: r.error });
    continue;
  }
  const rows = r.rows;
  const demo = rows.filter((row) => hasMarker(row));
  const fake = rows.filter((row) => hasFabricatedImage(row));
  report.push({
    table,
    readable: true,
    total: rows.length,
    demo: demo.length,
    fakeImages: fake.length,
    samples: demo.slice(0, 3).map((row) => row.id ?? row.name ?? row.sku ?? '?'),
  });
}

const pad = (s, n) => String(s).padEnd(n);

const totals = report.reduce(
  (acc, r) => {
    if (!r.readable) return acc;
    acc.rows += r.total;
    acc.demo += r.demo;
    acc.fakeImages += r.fakeImages;
    return acc;
  },
  { rows: 0, demo: 0, fakeImages: 0 },
);

if (AS_JSON) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), tables: report, totals }));
} else {
  console.log('\n=== AUDIT DỮ LIỆU DEMO (READ-ONLY) ===\n');
  console.log(pad('table', 20) + pad('total', 8) + pad('[MẪU]', 8) + pad('ảnh bịa', 10) + 'ví dụ id');
  console.log('-'.repeat(78));
  for (const r of report) {
    if (!r.readable) {
      console.log(pad(r.table, 20) + `KHÔNG ĐỌC ĐƯỢC (HTTP ${r.status})`);
      continue;
    }
    console.log(
      pad(r.table, 20) + pad(r.total, 8) + pad(r.demo, 8) + pad(r.fakeImages, 10) + (r.samples.join(', ') || '—'),
    );
  }
  console.log('');
}
