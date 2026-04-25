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

  const { data: full } = await db
    .from('items')
    .select('*, item_categories(id, name), recipes(material_id, amount)')
    .eq('id', item.id).single()
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

  const { data: full } = await db
    .from('items')
    .select('*, item_categories(id, name), recipes(material_id, amount)')
    .eq('id', id).single()
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

async function fetchFullQuest(db, id) {
  const { data } = await db
    .from('quests')
    .select('*, quest_conditions(id, name, type, max_value, sort_order), quest_rewards(id, item_id, amount, items(name, emoji))')
    .eq('id', id).single()
  return data
}

export async function addQuest(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, category, sub_category, description, conditions, rewards } = data

  const { data: quest, error } = await db
    .from('quests')
    .insert({ name, category, sub_category: sub_category || '', description })
    .select().single()
  if (error) return { error: error.message }

  await insertQuestRelations(db, quest.id, conditions, rewards)
  return { quest: await fetchFullQuest(db, quest.id) }
}

export async function updateQuest(id, data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, category, sub_category, description, conditions, rewards } = data

  const { error } = await db
    .from('quests')
    .update({ name, category, sub_category: sub_category || '', description })
    .eq('id', id)
  if (error) return { error: error.message }

  await db.from('quest_conditions').delete().eq('quest_id', id)
  await db.from('quest_rewards').delete().eq('quest_id', id)
  await insertQuestRelations(db, id, conditions, rewards)
  return { quest: await fetchFullQuest(db, id) }
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
