#!/usr/bin/env node
/**
 * supabase-mcp-proxy.mjs — cầu nối HTTP để OpenCode nói chuyện với Supabase MCP
 * mà KHÔNG cần export token vào môi trường của OpenCode service.
 *
 * Vì sao cần proxy:
 *   - OpenCode V2 remote MCP hỗ trợ header `{env:NAME}`, nhưng service chạy nền không đọc `.env`
 *     của repo ⇒ header thành rỗng (401 "Format is Authorization: Bearer [token]").
 *   - Proxy này đọc `.env` (đã gitignore), inject `Authorization: Bearer <PAT>` rồi chuyển tiếp
 *     nguyên văn (Streamable HTTP, gồm cả SSE) tới `https://mcp.supabase.com/mcp`.
 *
 * Bảo mật:
 *   - Chỉ bind 127.0.0.1; chỉ nhận path `/mcp` (và `/health`).
 *   - Không log token; lỗi trả JSON ngắn.
 *   - Token chỉ nằm trong `.env` (không vào bundle, không vào `opencode.json`).
 *
 * Dùng:
 *   node scripts/supabase-mcp-proxy.mjs          # foreground
 *   setsid nohup node scripts/supabase-mcp-proxy.mjs >/tmp/opencode/supabase-mcp-proxy.log 2>&1 &
 *
 * Env tuỳ chọn: SUPABASE_MCP_PROXY_PORT (mặc định 8788).
 */

import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.SUPABASE_MCP_PROXY_PORT || 8788);
const UPSTREAM = 'https://mcp.supabase.com/mcp';

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
const startupToken = env.SUPABASE_ACCESS_TOKEN || '';

/** Đọc lại `.env` mỗi request (file nhỏ) để thêm token không cần restart proxy. */
function currentToken() {
  try {
    return readEnv().SUPABASE_ACCESS_TOKEN || startupToken;
  } catch {
    return startupToken;
  }
}

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'authorization',
  'content-length',
  'content-encoding',
]);

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 4 * 1024 * 1024) {
        reject(new Error('Body > 4MB'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  if (url.startsWith('/health')) {
    return json(res, 200, { ok: true, tokenPresent: Boolean(currentToken()), upstream: UPSTREAM, port: PORT });
  }
  if (!url.startsWith('/mcp')) {
    return json(res, 404, { message: 'Chỉ hỗ trợ /mcp' });
  }
  const token = currentToken();
  if (!token) {
    return json(res, 401, {
      message: 'Thiếu SUPABASE_ACCESS_TOKEN trong .env — xem docs/database/sql-automation.md',
      tokenPresent: false,
    });
  }

  const qs = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  const target = `${UPSTREAM}${qs}`;
  const method = req.method || 'GET';

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(k.toLowerCase()) && typeof v === 'string') headers[k] = v;
  }
  headers.authorization = `Bearer ${token}`;

  let body;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await readBody(req);
    } catch (err) {
      return json(res, 413, { message: err instanceof Error ? err.message : 'Body quá lớn' });
    }
  }

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      // SSE (GET) không đặt timeout; POST có trần 180s để tránh treo process.
      signal: method === 'GET' ? undefined : AbortSignal.timeout(180000),
    });

    const outHeaders = {};
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) outHeaders[key] = value;
    });
    res.writeHead(upstream.status, outHeaders);

    if (upstream.body) {
      for await (const chunk of upstream.body) {
        res.write(chunk);
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      json(res, 502, { message: 'Không kết nối được Supabase MCP', detail: err instanceof Error ? err.message : String(err) });
    } else {
      res.end();
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[supabase-mcp-proxy] http://127.0.0.1:${PORT}/mcp -> ${UPSTREAM}`);
  console.log(`[supabase-mcp-proxy] token: ${startupToken ? 'present (.env)' : 'MISSING — thêm SUPABASE_ACCESS_TOKEN vào .env'}`);
});
