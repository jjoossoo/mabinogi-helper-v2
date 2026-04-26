'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction } from './actions'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupAction, { error: null, success: null })

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛡</div>
          <h1 className="text-3xl font-bold tracking-wider font-serif" style={{ color: 'var(--gold)' }}>
            마비노기 헬퍼
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--parchment)', opacity: 0.45 }}>에린의 모험을 함께</p>
        </div>

        <div className="panel dots-bg rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: 'var(--gold)', opacity: 0.4 }} />
            <h2 className="font-semibold text-lg tracking-wide font-serif" style={{ color: 'var(--gold-dark)' }}>
              회원가입
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

          {state?.success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📜</div>
              <p className="font-medium" style={{ color: 'var(--gold-dark)' }}>{state.success}</p>
              <Link
                href="/login"
                className="inline-block mt-4 text-sm hover:underline"
                style={{ color: 'var(--ink)', opacity: 0.6 }}
              >
                로그인 페이지로 돌아가기
              </Link>
            </div>
          ) : (
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
                  minLength={6}
                  placeholder="6자 이상"
                  className="input-field w-full rounded px-3 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full py-2.5 rounded mt-2"
              >
                {isPending ? '가입 중...' : '회원가입'}
              </button>
            </form>
          )}

          {!state?.success && (
            <p className="text-center text-sm mt-6" style={{ color: 'var(--ink)', opacity: 0.6 }}>
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--gold-dark)' }}>
                로그인
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
