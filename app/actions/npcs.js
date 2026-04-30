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

const NPC_SELECT = '*, location:location_id(id, name, emoji, parent_id), npc_sale_items(id, item_id, sort_order, item:item_id(id, name, emoji)), trades(id, give_item:give_item_id(id, name, emoji), give_amount, receive_item:receive_item_id(id, name, emoji), receive_amount, scope, reset_type, reset_day, reset_hour)'

export async function addNpc(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, emoji, location_id } = data
  const { data: npc, error } = await db
    .from('npcs')
    .insert({ name, emoji: emoji || '🏪', location_id: location_id || null })
    .select(NPC_SELECT)
    .single()
  if (error) return { error: error.message }
  return { npc }
}

export async function updateNpc(id, data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, emoji, location_id } = data
  const { data: npc, error } = await db
    .from('npcs')
    .update({ name, emoji: emoji || '🏪', location_id: location_id || null })
    .eq('id', id)
    .select(NPC_SELECT)
    .single()
  if (error) return { error: error.message }
  return { npc }
}

export async function deleteNpc(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('npcs').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function addNpcSaleItem(npcId, itemId) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { data, error } = await db
    .from('npc_sale_items')
    .insert({ npc_id: npcId, item_id: itemId })
    .select('id, item_id, sort_order, item:item_id(id, name, emoji)')
    .single()
  if (error) return { error: error.message }
  return { saleItem: data }
}

export async function removeNpcSaleItem(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('npc_sale_items').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}
