'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Analysis = {
  id: string
  author: string
  tweet_count: number
  analysis: string
  created_at: string
}

type WeeklySummary = {
  id: string
  content: string
  week_start: string
  created_at: string
}

export default function DashboardClient({
  analyses,
  weeklySummaries,
}: {
  analyses: Analysis[]
  weeklySummaries: WeeklySummary[]
}) {
  const [search, setSearch] = useState('')
  const [podcastScripts, setPodcastScripts] = useState<Record<string, string>>({})
  const [loadingPodcast, setLoadingPodcast] = useState<Record<string, boolean>>({})
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({})
  const [expandedPodcast, setExpandedPodcast] = useState<Record<string, boolean>>({})
  const [expandedWeekly, setExpandedWeekly] = useState<Record<string, boolean>>({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const filtered = analyses.filter(
    (a) =>
      a.author.toLowerCase().includes(search.toLowerCase()) ||
      a.analysis.toLowerCase().includes(search.toLowerCase())
  )

  const handlePodcast = async (analysis: Analysis) => {
    if (podcastScripts[analysis.id]) {
      setExpandedPodcast((p) => ({ ...p, [analysis.id]: !p[analysis.id] }))
      return
    }
    setLoadingPodcast((p) => ({ ...p, [analysis.id]: true }))
    try {
      const res = await fetch('/api/podcast-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: analysis.id, analysis: analysis.analysis, author: analysis.author }),
      })
      const { script } = await res.json()
      setPodcastScripts((p) => ({ ...p, [analysis.id]: script }))
      setExpandedPodcast((p) => ({ ...p, [analysis.id]: true }))
    } finally {
      setLoadingPodcast((p) => ({ ...p, [analysis.id]: false }))
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Twitter Analytics</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Esci
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-10">

        {/* Weekly Summaries */}
        {weeklySummaries.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-purple-400">Sintesi Settimanali</h2>
            <div className="flex flex-col gap-3">
              {weeklySummaries.map((w) => (
                <div key={w.id} className="bg-gray-900 rounded-xl p-4">
                  <button
                    className="w-full text-left flex items-center justify-between"
                    onClick={() => setExpandedWeekly((p) => ({ ...p, [w.id]: !p[w.id] }))}
                  >
                    <span className="text-sm font-medium text-purple-300">
                      Settimana del {new Date(w.week_start).toLocaleDateString('it-IT')}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {expandedWeekly[w.id] ? '▲ chiudi' : '▼ espandi'}
                    </span>
                  </button>
                  {expandedWeekly[w.id] && (
                    <pre className="mt-3 text-sm text-gray-300 whitespace-pre-wrap font-sans">
                      {w.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search */}
        <section>
          <input
            type="text"
            placeholder="Cerca per autore o contenuto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
        </section>

        {/* Analyses */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-blue-400">
            Analisi ({filtered.length})
          </h2>
          {filtered.map((a) => (
            <div key={a.id} className="bg-gray-900 rounded-xl p-5 flex flex-col gap-3">
              {/* Meta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-blue-300">@{a.author}</span>
                  <span className="text-xs text-gray-500">{a.tweet_count} tweet</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(a.created_at).toLocaleDateString('it-IT')}
                </span>
              </div>

              {/* Analysis toggle */}
              <button
                className="text-left text-sm text-gray-400 hover:text-gray-200 transition"
                onClick={() => setExpandedAnalysis((p) => ({ ...p, [a.id]: !p[a.id] }))}
              >
                {expandedAnalysis[a.id] ? '▲ Nascondi analisi' : '▼ Mostra analisi'}
              </button>
              {expandedAnalysis[a.id] && (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans border-t border-gray-800 pt-3">
                  {a.analysis}
                </pre>
              )}

              {/* Podcast button */}
              <div className="border-t border-gray-800 pt-3">
                <button
                  onClick={() => handlePodcast(a)}
                  disabled={loadingPodcast[a.id]}
                  className="text-sm bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-4 py-2 rounded-lg transition font-medium"
                >
                  {loadingPodcast[a.id] ? 'Generando...' : '🎙️ Scaletta podcast'}
                </button>
                {podcastScripts[a.id] && expandedPodcast[a.id] && (
                  <pre className="mt-3 text-sm text-gray-300 whitespace-pre-wrap font-sans">
                    {podcastScripts[a.id]}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}