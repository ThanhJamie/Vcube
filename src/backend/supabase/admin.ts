import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client với quyền Service Role.
 * CẢNH BÁO: CHỈ ĐƯỢC DÙNG TRÊN SERVER (Server Actions, Route Handlers, Background Jobs).
 * KHÔNG BAO GIỜ import hoặc sử dụng file này trong Client Component ('use client')!
 * Service Role Key có quyền bỏ qua mọi chính sách Row Level Security (RLS).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trên server.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
