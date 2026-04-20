import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: analyses } = await supabase
    .from('twitter_analysis')
    .select('id, author, tweet_count, analysis, created_at')
    .order('created_at', { ascending: false })

  const { data: weeklySummaries } = await supabase
    .from('weekly_summaries')
    .select('id, content, week_start, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <DashboardClient
      analyses={analyses ?? []}
      weeklySummaries={weeklySummaries ?? []}
    />
  )
}