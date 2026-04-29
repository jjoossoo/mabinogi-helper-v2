import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import LocationMapEditor from '@/components/LocationMapEditor'

export const metadata = { title: '지도 에디터 — 마비노기 헬퍼' }

export default async function LocationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const db = createAdminClient()
  const [{ data: locations }, { data: connections }] = await Promise.all([
    db.from('locations').select('*').order('sort_order').order('name'),
    db.from('location_connections')
      .select('*, location_a:location_a_id(id, name, emoji), location_b:location_b_id(id, name, emoji)'),
  ])

  return (
    <LocationMapEditor
      initialLocations={locations ?? []}
      initialConnections={connections ?? []}
    />
  )
}
