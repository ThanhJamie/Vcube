import React from 'react'
import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'VCUBE Vietnam - Nền Tảng In 3D Kỹ Thuật Theo Yêu Cầu',
  description: 'Dịch vụ in 3D công nghiệp FDM/SLA, bóc tách báo giá tự động trong 3s, giao hàng hỏa tốc toàn quốc.',
  openGraph: {
    title: 'VCUBE Vietnam - 3D Printing & Engineering Platform',
    description: 'Nền tảng in 3D theo yêu cầu tại Việt Nam - Next.js 15 App Router & Supabase.',
    url: 'https://vcube-red.vercel.app',
    siteName: 'VCUBE Vietnam',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-[#070D18] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
