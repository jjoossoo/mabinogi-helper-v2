import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthButton from "@/components/AuthButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "마비노기 헬퍼",
  description: "마비노기 게임 정보 조회 및 관리",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-900">
        <header className="bg-slate-800 border-b border-amber-900/40 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="text-amber-400 font-bold tracking-wider hover:opacity-80 transition-opacity"
              style={{ fontFamily: 'serif' }}
            >
              ⚔️ 마비노기 숙제 도우미
            </Link>

            <AuthButton />
          </div>
        </header>
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
      </body>
    </html>
  );
}
