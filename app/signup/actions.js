'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function signupAction(prevState, formData) {
  const email = formData.get('email')
  const password = formData.get('password')

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  return { success: '가입 확인 메일을 보냈습니다. 이메일을 확인해 주세요.' }
}
