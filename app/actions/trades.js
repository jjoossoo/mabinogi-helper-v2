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

const TRADE_SELECT = '*, give_item:give_item_id(id, name, emoji), receive_item:receive_item_id(id, name, emoji), location_info:location_id(id, name, emoji)'

export async function addTrade(data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { npc_name, location, location_id, give_item_id, give_amount, receive_item_id, receive_amount, scope, reset_type, reset_day, reset_hour } = data
  const { data: trade, error } = await db
    .from('trades')
    .insert({ npc_name, location: location ?? '', location_id: location_id || null, give_item_id, give_amount, receive_item_id, receive_amount, scope, reset_type: reset_type ?? 'none', reset_day: reset_day ?? null, reset_hour: reset_hour ?? 6 })
    .select(TRADE_SELECT)
    .single()
  if (error) return { error: error.message }
  return { trade }
}

export async function updateTrade(id, data) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { npc_name, location, location_id, give_item_id, give_amount, receive_item_id, receive_amount, scope, reset_type, reset_day, reset_hour } = data
  const { data: trade, error } = await db
    .from('trades')
    .update({ npc_name, location: location ?? '', location_id: location_id || null, give_item_id, give_amount, receive_item_id, receive_amount, scope, reset_type: reset_type ?? 'none', reset_day: reset_day ?? null, reset_hour: reset_hour ?? 6 })
    .eq('id', id)
    .select(TRADE_SELECT)
    .single()
  if (error) return { error: error.message }
  return { trade }
}

export async function deleteTrade(id) {
  if (!await requireAdmin()) return { error: '권한 없음' }
  const db = createAdminClient()
  const { error } = await db.from('trades').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function removeTradeProgress({ trade_id, character_id, server }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }

  let query = supabase.from('trade_progress').delete().eq('user_id', user.id).eq('trade_id', trade_id)
  if (character_id) {
    query = query.eq('character_id', character_id)
  } else {
    query = query.is('character_id', null).eq('server', server)
  }
  const { error } = await query
  if (error) return { error: error.message }
  return { success: true }
}

export async function upsertTradeProgress({ trade_id, character_id, server, completed }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }

  const completed_at = completed ? new Date().toISOString() : null

  // Partial unique index 때문에 upsert onConflict 대신 select-then-update-or-insert
  if (character_id) {
    const { data: existing } = await supabase
      .from('trade_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('character_id', character_id)
      .eq('trade_id', trade_id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('trade_progress')
        .update({ completed, completed_at })
        .eq('id', existing.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase
        .from('trade_progress')
        .insert({ user_id: user.id, character_id, server: null, trade_id, completed, completed_at })
      if (error) return { error: error.message }
    }
  } else {
    // server scope
    const { data: existing } = await supabase
      .from('trade_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('server', server)
      .eq('trade_id', trade_id)
      .is('character_id', null)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('trade_progress')
        .update({ completed, completed_at })
        .eq('id', existing.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase
        .from('trade_progress')
        .insert({ user_id: user.id, character_id: null, server, trade_id, completed, completed_at })
      if (error) return { error: error.message }
    }
  }

  return { success: true }
}
