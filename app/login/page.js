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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔</div>
          <h1 className="text-3xl font-bold tracking-wider font-serif" style={{ color: 'var(--gold)' }}>
            마비노기 헬퍼
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--parchment)', opacity: 0.45 }}>에린의 모험을 함께</p>
        </div>

        <div className="panel dots-bg rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: 'var(--gold)', opacity: 0.4 }} />
            <h2 className="font-semibold text-lg tracking-wide font-serif" style={{ color: 'var(--gold-dark)' }}>
              로그인
            </h2>
            <div className="h-px flex-1" style={{ background: 'var(--gold)', opacity: 0.4 }} />
          </div>

          {state?.error && (
            <div className="mb-4 p-3 rounded text-sm" style={{
              background: 'rgba(139,32,32,0.1)',
              border: '1px solid var(--crimson)',
              color: 'var(--crimson-light)',
            }}>
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>
                이메일
              </label>
              <input
                id="email" name="email" type="email" required
                placeholder="example@email.com"
                className="input-field w-full rounded px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--ink)' }}>
                비밀번호
              </label>
              <input
                id="password" name="password" type="password" required
                placeholder="••••••••"
                className="input-field w-full rounded px-3 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-2.5 rounded mt-2"
            >
              {isPending ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1" style={{ background: 'var(--gold-dark)', opacity: 0.3 }} />
            <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.5 }}>또는</span>
            <div className="h-px flex-1" style={{ background: 'var(--gold-dark)', opacity: 0.3 }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 rounded py-2.5 font-medium text-sm transition-opacity hover:opacity-80"
            style={{
              background: 'var(--parchment-dark)',
              border: '1px solid var(--gold-dark)',
              color: 'var(--ink)',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google로 로그인
          </button>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--ink)', opacity: 0.6 }}>
            계정이 없으신가요?{' '}
            <Link href="/signup" className="font-medium hover:underline" style={{ color: 'var(--gold-dark)' }}>
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
