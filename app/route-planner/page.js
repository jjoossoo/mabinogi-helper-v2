import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RoutePlannerView from '@/components/RoutePlannerView'

export const metadata = { title: '경로 계산 — 마비노기 헬퍼' }

export default async function RoutePlannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: characters },
    { data: locations },
    { data: connections },
    { data: dungeons },
    { data: trades },
    { data: tradeProgress },
  ] = await Promise.all([
    supabase.from('characters').select('*').eq('user_id', user.id).order('is_main', { ascending: false }).order('name'),
    supabase.from('locations').select('*').order('sort_order').order('name'),
    supabase.from('location_connections').select('*'),
    supabase.from('dungeons').select('*, location:location_id(id, name, emoji)').order('sort_order').order('name'),
    supabase.from('trades')
      .select('*, give_item:give_item_id(id, name, emoji), location_info:location_id(id, name, emoji), npc_name, scope, reset_type, reset_day, reset_hour, give_amount')
      .not('location_id', 'is', null),
    supabase.from('trade_progress')
      .select('trade_id, character_id, server, completed, completed_at')
      .eq('user_id', user.id),
  ])

  return (
    <RoutePlannerView
      initialCharacters={characters ?? []}
      locations={locations ?? []}
      connections={connections ?? []}
      dungeons={dungeons ?? []}
      trades={trades ?? []}
      tradeProgress={tradeProgress ?? []}
    />
  )
}
