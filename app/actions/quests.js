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

export async function upsertProgress(characterId, conditionId, value) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }

  const { data: char } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', user.id).single()
  if (!char) return { error: '캐릭터를 찾을 수 없습니다' }

  const { data: existing, error: selectErr } = await supabase
    .from('quest_progress')
    .select('character_id')
    .eq('character_id', characterId)
    .eq('condition_id', conditionId)
    .maybeSingle()

  if (selectErr) return { error: 'select: ' + selectErr.message }

  if (existing) {
    const { error } = await supabase
      .from('quest_progress')
      .update({ value })
      .eq('character_id', characterId)
      .eq('condition_id', conditionId)
    if (error) return { error: 'update: ' + error.message }
  } else {
    const { error } = await supabase
      .from('quest_progress')
      .insert({ character_id: characterId, condition_id: conditionId, value })
    if (error) return { error: 'insert: ' + error.message }
  }
  return { success: true }
}
