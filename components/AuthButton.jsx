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
      <span className="text-sm truncate max-w-48" style={{ color: 'var(--parchment)', opacity: 0.55 }}>
        {user.email}
      </span>
      {isAdmin && (
        <Link
          href="/admin"
          className="btn-ghost-sm px-3 py-1 rounded text-xs"
        >
          🔧 관리자
        </Link>
      )}
      <form action={logoutAction}>
        <button
          type="submit"
          className="btn-danger text-xs px-3 py-1 rounded"
        >
          로그아웃
        </button>
      </form>
    </div>
  )
}
