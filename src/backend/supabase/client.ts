import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcxarjwzbihvurpkcufa.supabase.co';
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeGFyand6YmlodnVycGtjdWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTgzNTcsImV4cCI6MjEwMzk3NDM1N30.t-uhe5zcg6NpRRb8GdbMMEmP-fKFp8qv8SF5ZvLtao0';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id')
);

// Initialize client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function createBrowserClient(): SupabaseClient {
  return supabase;
}

export { createBrowserClient as createClient };
export default supabase;
