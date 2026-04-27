'use server'

import { createClient } from '@/lib/supabase-server'

export async function addCharacterQuest(characterId, questId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }
  const { error } = await supabase
    .from('character_quests')
    .insert({ character_id: characterId, quest_id: questId })
  if (error) return { error: error.message }
  return { success: true }
}

export async function removeCharacterQuest(characterId, questId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }
  const { error } = await supabase
    .from('character_quests')
    .delete()
    .eq('character_id', characterId)
    .eq('quest_id', questId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function upsertProgress({ characterId, server, conditionId, value, completedAt }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }

  const isServerScope = !characterId && !!server

  if (characterId) {
    const { data: char } = await supabase
      .from('characters').select('id').eq('id', characterId).eq('user_id', user.id).single()
    if (!char) return { error: '캐릭터를 찾을 수 없습니다' }
  }

  let query = supabase.from('quest_progress').select('id').eq('condition_id', conditionId)
  if (isServerScope) {
    query = query.is('character_id', null).eq('server', server)
  } else {
    query = query.eq('character_id', characterId)
  }

  const { data: existing, error: selectErr } = await query.maybeSingle()
  if (selectErr) return { error: 'select: ' + selectErr.message }

  if (existing) {
    const { error } = await supabase
      .from('quest_progress')
      .update({ value, completed_at: completedAt ?? null })
      .eq('id', existing.id)
    if (error) return { error: 'update: ' + error.message }
  } else {
    const payload = {
      user_id: user.id,
      condition_id: conditionId,
      value,
      completed_at: completedAt ?? null,
    }
    if (isServerScope) {
      payload.character_id = null
      payload.server = server
    } else {
      payload.character_id = characterId
    }
    const { error } = await supabase.from('quest_progress').insert(payload)
    if (error) return { error: 'insert: ' + error.message }
  }
  return { success: true }
}
