import { createClient } from '@/lib/supabase-server'
import MainView from '@/components/MainView'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
    .order('is_main', { ascending: false })
    .order('created_at', { ascending: true })

  return <MainView initialCharacters={characters ?? []} />
}
