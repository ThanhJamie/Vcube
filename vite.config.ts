import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcxarjwzbihvurpkcufa.supabase.co'),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeGFyand6YmlodnVycGtjdWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTgzNTcsImV4cCI6MjEwMzk3NDM1N30.t-uhe5zcg6NpRRb8GdbMMEmP-fKFp8qv8SF5ZvLtao0'),
      'process.env.NEXT_PUBLIC_SITE_URL': JSON.stringify(env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@frontend': path.resolve(__dirname, './src/frontend'),
        '@backend': path.resolve(__dirname, './src/backend'),
        '@ai': path.resolve(__dirname, './src/ai'),
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
