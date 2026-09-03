import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './src/backend/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (error) {
    console.error('Root middleware execution exception caught:', error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả các đường dẫn request ngoại trừ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - các file ảnh, video tĩnh (svg, png, jpg, jpeg, gif, webp, stl, step)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|stl|step|3mf)$).*)',
  ],
}
