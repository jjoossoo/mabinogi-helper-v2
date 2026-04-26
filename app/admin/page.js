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
    { data: categories, error: catErr },
    { data: items, error: itemsErr },
    { data: quests, error: questsErr },
    { data: profiles, error: profilesErr },
    { data: trades },
    { data: contentsData },
  ] = await Promise.all([
    admin.from('item_categories').select('*').order('name'),
    admin.from('items')
      .select('*, item_categories(id, name), recipes!recipes_item_id_fkey(material_id, amount)')
      .order('name'),
    admin.from('quests')
      .select('*, quest_conditions(id, name, type, max_value, sort_order), quest_rewards(id, item_id, amount, items(name, emoji)), quest_sections(id, name, sort_order, quest_section_missions(id, name, sort_order, quest_mission_conditions(id, name, type, max_value, sort_order), quest_mission_rewards(id, item_id, amount, items(name, emoji))))')
      .order('name'),
    admin.from('profiles').select('user_id, role, created_at'),
    admin.from('trades')
      .select('*, give_item:give_item_id(id, name, emoji), receive_item:receive_item_id(id, name, emoji)')
      .order('npc_name'),
    admin.from('contents')
      .select('*, content_conditions(id, name, type, max_value, sort_order), content_rewards(id, item_id, amount, items(name, emoji))')
      .order('sort_order').order('name'),
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
      initialContents={contentsData ?? []}
    />
  )
}
