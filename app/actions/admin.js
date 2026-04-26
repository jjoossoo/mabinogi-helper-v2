'use server'

import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

// ── 카테고리 ──────────────────────────────────────────────
export async function addCategory(name) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { data, error } = await db.from('item_categories').insert({ name }).select().single()
  if (error) return { error: error.message }
  return { category: data }
}

export async function deleteCategory(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('item_categories').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

// ── 아이템 ──────────────────────────────────────────────
export async function addItem(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, category_id, emoji, description, craft_output, materials } = data

  const { data: item, error } = await db
    .from('items')
    .insert({ name, category_id: category_id || null, emoji, description, craft_output: craft_output || null })
    .select().single()
  if (error) return { error: error.message }

  if (craft_output && materials?.length) {
    const { error: re } = await db.from('recipes').insert(
      materials.map(m => ({ item_id: item.id, material_id: m.material_id, amount: m.amount }))
    )
    if (re) return { error: re.message }
  }

  const { data: full, error: fetchError } = await db
    .from('items')
    .select('*, item_categories(id, name), recipes!recipes_item_id_fkey(material_id, amount)')
    .eq('id', item.id).single()

  revalidatePath('/admin')
  if (fetchError) return { error: fetchError.message }
  return { item: full }
}

export async function updateItem(id, data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, category_id, emoji, description, craft_output, materials } = data

  const { error } = await db
    .from('items')
    .update({ name, category_id: category_id || null, emoji, description, craft_output: craft_output || null })
    .eq('id', id)
  if (error) return { error: error.message }

  await db.from('recipes').delete().eq('item_id', id)
  if (craft_output && materials?.length) {
    await db.from('recipes').insert(
      materials.map(m => ({ item_id: id, material_id: m.material_id, amount: m.amount }))
    )
  }

  const { data: full, error: fetchError } = await db
    .from('items')
    .select('*, item_categories(id, name), recipes!recipes_item_id_fkey(material_id, amount)')
    .eq('id', id).single()
  if (fetchError) return { error: fetchError.message }
  return { item: full }
}

export async function deleteItem(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('items').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

// ── 퀘스트 ──────────────────────────────────────────────
const QUEST_SELECT = `
  *,
  quest_conditions(id, name, type, max_value, sort_order),
  quest_rewards(id, item_id, amount, items(name, emoji)),
  quest_sections(
    id, name, sort_order,
    quest_section_missions(
      id, name, sort_order,
      quest_mission_conditions(id, name, type, max_value, sort_order),
      quest_mission_rewards(id, item_id, amount, items(name, emoji))
    )
  )
`.trim()

async function fetchFullQuest(db, id) {
  const { data, error } = await db.from('quests').select(QUEST_SELECT).eq('id', id).single()
  return { data, error }
}

async function insertQuestRelations(db, questId, conditions, rewards) {
  if (conditions?.length) {
    await db.from('quest_conditions').insert(
      conditions.map((c, i) => ({
        quest_id: questId, name: c.name, type: c.type,
        max_value: c.type === 'progress' ? (c.max_value || null) : null, sort_order: i
      }))
    )
  }
  if (rewards?.length) {
    await db.from('quest_rewards').insert(
      rewards.map(r => ({ quest_id: questId, item_id: r.item_id, amount: r.amount }))
    )
  }
}

async function insertQuestSections(db, questId, sections) {
  if (!sections?.length) return
  for (const section of sections) {
    const { data: sec, error: secErr } = await db
      .from('quest_sections')
      .insert({ quest_id: questId, name: section.name, sort_order: section.sort_order })
      .select().single()
    if (secErr) throw new Error(secErr.message)
    for (const mission of (section.missions ?? [])) {
      const { data: mis, error: misErr } = await db
        .from('quest_section_missions')
        .insert({ section_id: sec.id, name: mission.name, sort_order: mission.sort_order })
        .select().single()
      if (misErr) throw new Error(misErr.message)
      if (mission.conditions?.length) {
        const { error: condErr } = await db.from('quest_mission_conditions').insert(
          mission.conditions.map((c, i) => ({
            mission_id: mis.id, name: c.name, type: c.type,
            max_value: c.type === 'progress' ? (c.max_value || null) : null, sort_order: i
          }))
        )
        if (condErr) throw new Error(condErr.message)
      }
      if (mission.rewards?.length) {
        const { error: rewErr } = await db.from('quest_mission_rewards').insert(
          mission.rewards.map(r => ({ mission_id: mis.id, item_id: r.item_id, amount: r.amount }))
        )
        if (rewErr) throw new Error(rewErr.message)
      }
    }
  }
}

export async function addQuest(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, category, sub_category, description, deadline, structure_type, conditions, rewards, sections } = data

  const { data: quest, error } = await db
    .from('quests')
    .insert({ name, category, sub_category: sub_category || '', description, deadline: deadline || null, structure_type: structure_type || 'simple' })
    .select().single()
  if (error) return { error: error.message }

  try {
    if (structure_type === 'hierarchical') {
      await insertQuestSections(db, quest.id, sections)
    } else {
      await insertQuestRelations(db, quest.id, conditions, rewards)
    }
  } catch (e) {
    return { error: e.message }
  }

  const { data: full, error: fetchError } = await fetchFullQuest(db, quest.id)
  if (fetchError) return { error: fetchError.message }
  return { quest: full }
}

export async function updateQuest(id, data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, category, sub_category, description, deadline, structure_type, conditions, rewards, sections } = data

  const { error } = await db
    .from('quests')
    .update({ name, category, sub_category: sub_category || '', description, deadline: deadline || null, structure_type: structure_type || 'simple' })
    .eq('id', id)
  if (error) return { error: error.message }

  await db.from('quest_conditions').delete().eq('quest_id', id)
  await db.from('quest_rewards').delete().eq('quest_id', id)
  await db.from('quest_sections').delete().eq('quest_id', id)

  try {
    if (structure_type === 'hierarchical') {
      await insertQuestSections(db, id, sections)
    } else {
      await insertQuestRelations(db, id, conditions, rewards)
    }
  } catch (e) {
    return { error: e.message }
  }

  const { data: full, error: fetchError } = await fetchFullQuest(db, id)
  if (fetchError) return { error: fetchError.message }
  return { quest: full }
}

export async function deleteQuest(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('quests').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

// ── 회원 ──────────────────────────────────────────────
export async function updateUserRole(userId, role) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('profiles').update({ role }).eq('user_id', userId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteUser(userId) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  return { success: true }
}
