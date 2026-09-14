import { createClient, SupabaseClient } from '@supabase/supabase-js';

// KHÔNG hardcode URL/khoá tại đây. Giá trị được Vite inject từ .env
// (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) qua `define` trong vite.config.ts.
// Khoá publishable là khoá công khai (đi kèm RLS); khoá secret chỉ dùng server-side.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('your-anon-key')
);

if (!isSupabaseConfigured) {
  // Không throw: app có đường lui sang dữ liệu mock/localStorage. Nhưng phải ồn ào.
  console.error(
    '[vcube] Supabase CHƯA được cấu hình (thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
      'App đang chạy bằng dữ liệu mock. Xem .env.example và docs/security/rls-runbook.md.'
  );
}

// Khi chưa cấu hình, dùng URL giả để không ném lỗi lúc import; mọi truy vấn sẽ
// thất bại và rơi vào nhánh fallback mock của từng service.
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'http://localhost:54321',
  isSupabaseConfigured ? supabaseAnonKey : 'unconfigured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function createBrowserClient(): SupabaseClient {
  return supabase;
}

export { createBrowserClient as createClient };
export default supabase;
