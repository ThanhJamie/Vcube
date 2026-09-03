import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Hàm cập nhật session an toàn tuyệt đối dành cho Next.js Middleware trên Vercel.
 * Đảm bảo middleware KHÔNG BAO GIỜ bị crash (500: MIDDLEWARE_INVOCATION_FAILED)
 * ngay cả khi thiếu biến môi trường, mất mạng, token lỗi, hoặc domain placeholder.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Nếu chưa cấu hình hoặc URL là placeholder mẫu, cho phép request đi qua an toàn
    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      supabaseUrl.includes('your-project') ||
      supabaseUrl.includes('placeholder') ||
      !supabaseUrl.startsWith('https://')
    ) {
      return supabaseResponse
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    // Gọi getUser() an toàn tuyệt đối bên trong try/catch
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user || null
    } catch (authErr) {
      // Nếu Supabase network timeout hoặc token hết hạn, không làm sập server
      console.warn('Supabase auth.getUser() bypassed in middleware:', authErr)
    }

    const pathname = request.nextUrl.pathname

    // Bảo vệ route Dashboard và Admin
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // Nếu đã đăng nhập, chuyển hướng trang Auth về Dashboard
    const isAuthPage =
      pathname === '/auth/login' ||
      pathname === '/auth/register' ||
      pathname === '/auth/forgot-password'
    if (user && isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Fatal error caught in updateSession middleware:', error)
    return supabaseResponse
  }
}
