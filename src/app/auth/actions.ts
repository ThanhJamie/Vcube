'use server'

import { createClient } from '@/src/backend/supabase/server'
import { redirect } from 'next/navigation'

export interface AuthActionResult {
  error?: string
  success?: boolean
  message?: string
}

/**
 * Server Action xử lý Đăng nhập Email & Mật khẩu
 */
export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = (formData.get('redirectTo') as string) || '/dashboard'

  if (!email || !password) {
    return { error: 'Vui lòng nhập đầy đủ email và mật khẩu.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect(redirectTo)
}

/**
 * Server Action xử lý Đăng ký tài khoản VCUBE
 */
export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string) || (email ? email.split('@')[0] : 'User')
  const accountType = (formData.get('role') as string) || (formData.get('accountType') as string) || 'customer'

  if (!email || !password) {
    return { error: 'Vui lòng nhập email và mật khẩu.' }
  }

  if (password.length < 6) {
    return { error: 'Mật khẩu phải có ít nhất 6 ký tự.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const emailRedirectTo = `${siteUrl}/auth/callback`

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        account_type: accountType,
      },
      emailRedirectTo,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Chuyển sang trang thông báo kiểm tra email xác nhận
  redirect('/auth/confirm-email?email=' + encodeURIComponent(email))
}

/**
 * Server Action xử lý Yêu cầu khôi phục mật khẩu (Quên mật khẩu)
 */
export async function forgotPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Vui lòng cung cấp địa chỉ email tài khoản.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/reset-password`

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    message: 'Link khôi phục mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
  }
}

/**
 * Server Action xử lý Cập nhật mật khẩu mới
 */
export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Mật khẩu xác nhận không khớp.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard?status=password_updated')
}

/**
 * Server Action Đăng xuất
 */
export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
