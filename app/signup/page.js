'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction } from './actions'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupAction, { error: null, success: null })

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-amber-400 text-5xl mb-2">🛡️</div>
          <h1 className="text-3xl font-bold text-amber-400 tracking-wider" style={{ fontFamily: 'serif' }}>
            마비노기 헬퍼
          </h1>
          <p className="text-slate-400 mt-1 text-sm">에린의 모험을 함께</p>
        </div>

        <div className="bg-slate-800 border border-amber-900/50 rounded-lg p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 bg-amber-900/50" />
            <h2 className="text-amber-300 font-semibold text-lg tracking-wide">회원가입</h2>
            <div className="h-px flex-1 bg-amber-900/50" />
          </div>

          {state?.error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-400 text-sm">
              {state.error}
            </div>
          )}

          {state?.success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📜</div>
              <p className="text-amber-300 font-medium">{state.success}</p>
              <Link
                href="/login"
                className="inline-block mt-4 text-slate-400 hover:text-slate-300 text-sm transition-colors"
              >
                로그인 페이지로 돌아가기
              </Link>
            </div>
          ) : (
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
                  minLength={6}
                  placeholder="6자 이상"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded transition-colors mt-2"
              >
                {isPending ? '가입 중...' : '회원가입'}
              </button>
            </form>
          )}

          {!state?.success && (
            <p className="text-center text-slate-500 text-sm mt-6">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
                로그인
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
