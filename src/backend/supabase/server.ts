import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client dành cho Server Components, Server Actions & Route Handlers trong Next.js 15 App Router.
 * Chú ý: Trong Next.js 15, cookies() là async nên phải sử dụng 'await cookies()'.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Trường hợp Server Component gọi setAll, cookie sẽ được đồng bộ qua middleware.
          }
        },
      },
    }
  )
}
