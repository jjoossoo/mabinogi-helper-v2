'use server'

import { createClient } from '@/lib/supabase-server'

export async function addCharacter(data) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '로그인이 필요합니다' }

  const { data: character, error } = await supabase
    .from('characters')
    .insert({
      user_id: user.id,
      name: data.name,
      class: data.class,
      server: data.server,
      level: data.level ?? 0,
      memo: data.memo || '',
      is_main: data.is_main || false,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { character }
}

export async function deleteCharacter(id) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
