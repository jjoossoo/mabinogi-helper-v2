'use server'

import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

const CONTENT_SELECT = `
  *,
  content_conditions(id, name, type, max_value, sort_order),
  content_rewards(id, item_id, amount, items(name, emoji))
`.trim()

export async function addContent(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, reset_cycle, sort_order, conditions, rewards } = data

  const { data: content, error } = await db
    .from('contents')
    .insert({ name, reset_cycle, sort_order: sort_order ?? 0 })
    .select('id')
    .single()
  if (error) return { error: error.message }

  if (conditions?.length) {
    const { error: ce } = await db.from('content_conditions').insert(
      conditions.map((c, i) => ({ content_id: content.id, name: c.name, type: c.type, max_value: c.max_value ?? null, sort_order: i }))
    )
    if (ce) return { error: ce.message }
  }

  if (rewards?.length) {
    const { error: re } = await db.from('content_rewards').insert(
      rewards.map(r => ({ content_id: content.id, item_id: r.item_id, amount: r.amount }))
    )
    if (re) return { error: re.message }
  }

  const { data: full, error: fe } = await db.from('contents').select(CONTENT_SELECT).eq('id', content.id).single()
  if (fe) return { error: fe.message }
  return { content: full }
}

export async function updateContent(id, data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, reset_cycle, sort_order, conditions, rewards } = data

  const { error } = await db.from('contents').update({ name, reset_cycle, sort_order: sort_order ?? 0 }).eq('id', id)
  if (error) return { error: error.message }

  // Replace conditions
  await db.from('content_conditions').delete().eq('content_id', id)
  if (conditions?.length) {
    const { error: ce } = await db.from('content_conditions').insert(
      conditions.map((c, i) => ({ content_id: id, name: c.name, type: c.type, max_value: c.max_value ?? null, sort_order: i }))
    )
    if (ce) return { error: ce.message }
  }

  // Replace rewards
  await db.from('content_rewards').delete().eq('content_id', id)
  if (rewards?.length) {
    const { error: re } = await db.from('content_rewards').insert(
      rewards.map(r => ({ content_id: id, item_id: r.item_id, amount: r.amount }))
    )
    if (re) return { error: re.message }
  }

  const { data: full, error: fe } = await db.from('contents').select(CONTENT_SELECT).eq('id', id).single()
  if (fe) return { error: fe.message }
  return { content: full }
}

export async function deleteContent(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('contents').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function addCharacterContent(characterId, contentId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }
  const { error } = await supabase.from('character_contents').insert({ character_id: characterId, content_id: contentId })
  if (error) return { error: error.message }
  return { success: true }
}

export async function removeCharacterContent(characterId, contentId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }
  const { error } = await supabase
    .from('character_contents')
    .delete()
    .eq('character_id', characterId)
    .eq('content_id', contentId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function upsertContentProgress(characterId, conditionId, value) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }

  const { data: char } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', user.id).single()
  if (!char) return { error: '캐릭터를 찾을 수 없습니다' }

  const { data: existing } = await supabase
    .from('content_progress')
    .select('character_id')
    .eq('character_id', characterId)
    .eq('condition_id', conditionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('content_progress')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('character_id', characterId)
      .eq('condition_id', conditionId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('content_progress')
      .insert({ character_id: characterId, condition_id: conditionId, value, updated_at: new Date().toISOString() })
    if (error) return { error: error.message }
  }
  return { success: true }
}
