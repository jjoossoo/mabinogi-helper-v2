import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 서버 컴포넌트/Server Action/Route Handler용 Supabase 클라이언트
// Next.js 16에서 cookies()는 async 함수임
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // 서버 컴포넌트에서는 쿠키 쓰기가 불가 — Server Action/Route Handler에서만 동작
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 무시: Server Component 렌더링 중 호출된 경우
          }
        },
      },
    }
  )
}
