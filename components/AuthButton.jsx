import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AuthButton() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  async function logoutAction() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-sm truncate max-w-48">{user.email}</span>
      {isAdmin && (
        <Link
          href="/admin"
          className="text-sm text-slate-400 hover:text-amber-400 border border-slate-700 hover:border-amber-800/60 px-3 py-1 rounded transition-colors"
        >
          🔧 관리자
        </Link>
      )}
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-sm text-amber-400 hover:text-amber-300 border border-amber-800/60 hover:border-amber-600/60 px-3 py-1 rounded transition-colors"
        >
          로그아웃
        </button>
      </form>
    </div>
  )
}
