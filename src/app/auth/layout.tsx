import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#f8f9ff] font-sans text-[#0b1c30] min-h-screen flex flex-col justify-center items-center p-4 md:p-8 lg:p-12 relative selection:bg-[#00687a] selection:text-white">
      {/* Background Ambient Subtle Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-70">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#dce9ff]/60 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[#57dffe]/15 rounded-full blur-3xl" />
      </div>

      {/* Main Container */}
      <main className="w-full bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] overflow-hidden transition-all max-w-2xl">
        {children}
      </main>

      {/* Technical Footer Info */}
      <footer className="mt-6 text-center text-xs text-[#45474c] font-mono">
        <span>© 2025 3DHub Vietnam. Bảo mật danh tính IAM phân tán &amp; Xác thực FIDO2 / YubiKey.</span>
      </footer>
    </div>
  )
}

