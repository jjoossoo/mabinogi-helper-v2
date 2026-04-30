import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import AdminView from '@/components/admin/AdminView'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const admin = createAdminClient()

  const [
    { data: categories },
    { data: items },
    { data: quests },
    { data: profiles },
    { data: trades },
    { data: npcs },
    { data: contentsData },
    { data: locations },
    { data: connections },
    { data: dungeons },
  ] = await Promise.all([
    admin.from('item_categories').select('*').order('name'),
    admin.from('items')
      .select('*, item_categories(id, name), recipes!recipes_item_id_fkey(material_id, amount), location:location_id(id, name, emoji)')
      .order('name'),
    admin.from('quests')
      .select('*, quest_conditions(id, name, type, max_value, sort_order), quest_rewards(id, item_id, amount, items(name, emoji)), quest_sections(id, name, sort_order, quest_section_missions(id, name, sort_order, quest_mission_conditions(id, name, type, max_value, sort_order), quest_mission_rewards(id, item_id, amount, items(name, emoji))))')
      .order('name'),
    admin.from('profiles').select('user_id, role, created_at'),
    admin.from('trades')
      .select('*, give_item:give_item_id(id, name, emoji), receive_item:receive_item_id(id, name, emoji), location_info:location_id(id, name, emoji), npc:npc_id(id, name, emoji)')
      .order('npc_name'),
    admin.from('npcs')
      .select('*, location:location_id(id, name, emoji, parent_id), npc_sale_items(id, item_id, sort_order, item:item_id(id, name, emoji)), trades(id, give_item:give_item_id(id, name, emoji), give_amount, receive_item:receive_item_id(id, name, emoji), receive_amount, scope, reset_type, reset_day, reset_hour)')
      .order('name'),
    admin.from('contents')
      .select('*, content_conditions(id, name, type, max_value, sort_order), content_rewards(id, item_id, amount, items(name, emoji))')
      .order('sort_order').order('name'),
    admin.from('locations').select('*').order('sort_order').order('name'),
    admin.from('location_connections').select('*, location_a:location_a_id(id, name, emoji), location_b:location_b_id(id, name, emoji)'),
    admin.from('dungeons').select('*, location:location_id(id, name, emoji)').order('sort_order').order('name'),
  ])
  const { data: { users } } = await admin.auth.admin.listUsers()
  const roleMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]))
  const members = (users ?? []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    role: roleMap[u.id]?.role ?? 'user',
  }))

  return (
    <AdminView
      initialCategories={categories ?? []}
      initialItems={items ?? []}
      initialQuests={quests ?? []}
      initialMembers={members}
      initialTrades={trades ?? []}
      initialNpcs={npcs ?? []}
      initialContents={contentsData ?? []}
      initialLocations={locations ?? []}
      initialConnections={connections ?? []}
      initialDungeons={dungeons ?? []}
    />
  )
}
