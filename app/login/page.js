'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from './actions'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, { error: null })

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* 헤더 장식 */}
        <div className="text-center mb-8">
          <div className="text-amber-400 text-5xl mb-2">⚔️</div>
          <h1 className="text-3xl font-bold text-amber-400 tracking-wider" style={{ fontFamily: 'serif' }}>
            마비노기 헬퍼
          </h1>
          <p className="text-slate-400 mt-1 text-sm">에린의 모험을 함께</p>
        </div>

        {/* 카드 */}
        <div className="bg-slate-800 border border-amber-900/50 rounded-lg p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 bg-amber-900/50" />
            <h2 className="text-amber-300 font-semibold text-lg tracking-wide">로그인</h2>
            <div className="h-px flex-1 bg-amber-900/50" />
          </div>

          {state?.error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-400 text-sm">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-slate-300 text-sm mb-1.5">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="example@email.com"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-slate-300 text-sm mb-1.5">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded transition-colors mt-2"
            >
              {isPending ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-slate-500 text-xs">또는</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-medium py-2.5 rounded transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google로 로그인
          </button>

          <p className="text-center text-slate-500 text-sm mt-6">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-amber-400 hover:text-amber-300 transition-colors">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
