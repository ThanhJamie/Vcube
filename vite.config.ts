import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Cấu hình Supabase cho CLIENT. Chỉ dùng khoá publishable (an toàn để lộ ra bundle).
  // KHÔNG bao giờ đưa SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY vào `define` —
  // khoá đó bỏ qua toàn bộ RLS.
  const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const siteUrl = env.VITE_SITE_URL || env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      '[vcube] Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY trong .env — app sẽ chạy bằng dữ liệu mock/localStorage.'
    );
  }
  if (supabaseKey.startsWith('sb_secret_')) {
    throw new Error(
      '[vcube] Cấu hình sai: khoá secret (sb_secret_…) không được dùng cho client. Dùng sb_publishable_…'
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'process.env.NEXT_PUBLIC_SITE_URL': JSON.stringify(siteUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@frontend': path.resolve(__dirname, './src/frontend'),
        '@backend': path.resolve(__dirname, './src/backend'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            'three-vendor': ['three'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
