import Link from 'next/link'
import { Noto_Serif_KR, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import AuthButton from '@/components/AuthButton'

const notoSerif = Noto_Serif_KR({
  variable: '--noto-serif',
  weight: ['400', '600', '700'],
  preload: false,
})

const notoSans = Noto_Sans_KR({
  variable: '--noto-sans',
  weight: ['400', '500', '700'],
  preload: false,
})

export const metadata = {
  title: '마비노기 헬퍼',
  description: '마비노기 게임 정보 조회 및 관리',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${notoSerif.variable} ${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="relative flex-shrink-0" style={{ backgroundColor: 'var(--deep)' }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3.5">
            <Link
              href="/"
              className="font-bold tracking-wider hover:opacity-80 transition-opacity text-lg font-serif"
              style={{ color: 'var(--gold)' }}
            >
              ⚔ 마비노기 숙제 도우미
            </Link>
            <AuthButton />
          </div>
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '2px',
              background: 'linear-gradient(to right, transparent 0%, var(--gold) 30%, var(--gold-light) 50%, var(--gold) 70%, transparent 100%)',
            }}
          />
        </header>
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
      </body>
    </html>
  )
}
