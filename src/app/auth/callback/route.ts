import { createClient } from '@/src/backend/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Route Handler xử lý Supabase Auth PKCE code exchange.
 * Được gọi khi người dùng:
 * 1. Nhấp link xác thực trong email đăng ký (confirm-email).
 * 2. Nhấp link khôi phục mật khẩu (reset-password).
 * 3. Hoàn tất đăng nhập qua nhà cung cấp OAuth (Google, GitHub).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  // Trường hợp code lỗi hoặc hết hạn
  return NextResponse.redirect(
    `${requestUrl.origin}/auth/login?error=${encodeURIComponent(
      'Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.'
    )}`
  )
}
