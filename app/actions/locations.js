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

const CONN_SELECT = '*, location_a:location_a_id(id, name, emoji), location_b:location_b_id(id, name, emoji)'
const DUNGEON_SELECT = '*, location:location_id(id, name, emoji)'

export async function addLocation(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, description, region, emoji, sort_order } = data
  const { data: location, error } = await db
    .from('locations')
    .insert({ name, description: description ?? '', region: region ?? '', emoji: emoji || '📍', sort_order: sort_order ?? 0 })
    .select().single()
  if (error) return { error: error.message }
  return { location }
}

export async function updateLocation(id, data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, description, region, emoji, sort_order } = data
  const { data: location, error } = await db
    .from('locations')
    .update({ name, description: description ?? '', region: region ?? '', emoji: emoji || '📍', sort_order: sort_order ?? 0 })
    .eq('id', id).select().single()
  if (error) return { error: error.message }
  return { location }
}

export async function deleteLocation(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('locations').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function addConnection(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { location_a_id, location_b_id, travel_time } = data
  const { data: connection, error } = await db
    .from('location_connections')
    .insert({ location_a_id, location_b_id, travel_time: Number(travel_time) || 1 })
    .select(CONN_SELECT).single()
  if (error) return { error: error.message }
  return { connection }
}

export async function updateConnection(id, travel_time) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { data: connection, error } = await db
    .from('location_connections')
    .update({ travel_time: Number(travel_time) || 1 })
    .eq('id', id).select(CONN_SELECT).single()
  if (error) return { error: error.message }
  return { connection }
}

export async function deleteConnection(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('location_connections').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function addDungeon(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, emoji, location_id, dungeon_type, description, sort_order } = data
  const { data: dungeon, error } = await db
    .from('dungeons')
    .insert({ name, emoji: emoji || '🏰', location_id: location_id || null, dungeon_type: dungeon_type ?? 'dungeon', description: description ?? '', sort_order: sort_order ?? 0 })
    .select(DUNGEON_SELECT).single()
  if (error) return { error: error.message }
  return { dungeon }
}

export async function updateDungeon(id, data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { name, emoji, location_id, dungeon_type, description, sort_order } = data
  const { data: dungeon, error } = await db
    .from('dungeons')
    .update({ name, emoji: emoji || '🏰', location_id: location_id || null, dungeon_type: dungeon_type ?? 'dungeon', description: description ?? '', sort_order: sort_order ?? 0 })
    .eq('id', id).select(DUNGEON_SELECT).single()
  if (error) return { error: error.message }
  return { dungeon }
}

export async function deleteDungeon(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('dungeons').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}
