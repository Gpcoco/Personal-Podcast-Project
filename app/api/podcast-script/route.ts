import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'giovanni.prior@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { analysisId, analysis, author } = await request.json()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Sei un producer di podcast. Basandoti su questa analisi di tweet di @${author}, crea una scaletta sintetica per registrare un episodio audio di 5-10 minuti.

ANALISI:
${analysis}

Formato scaletta:

🎙️ TITOLO EPISODIO
[titolo accattivante]

⏱️ STRUTTURA
1. INTRO (1 min) — hook iniziale, di cosa parleremo
2. CONTESTO (2 min) — cosa sta succedendo nel settore
3. PUNTI CHIAVE (4 min) — 2-3 punti principali da sviluppare
4. CONSIDERAZIONE FINALE (1 min) — takeaway per l'ascoltatore
5. OUTRO (30 sec) — call to action

📝 NOTE PER LA REGISTRAZIONE
- Tono consigliato: [formale/conversazionale/tecnico]
- Parole chiave da enfatizzare
- Eventuali citazioni utili

Rispondi in italiano. Sii conciso e pratico.`,
      },
    ],
  })

  const script = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')

  // Salva con service key
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  await adminSupabase.from('podcast_scripts').insert({
    analysis_id: analysisId,
    content: script,
  })

  return NextResponse.json({ script })
}