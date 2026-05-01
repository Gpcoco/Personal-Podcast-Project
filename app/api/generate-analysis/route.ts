// app/api/generate-synthesis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { contributionIds } = await req.json();

  if (!contributionIds?.length) {
    return NextResponse.json({ error: 'Nessun contributo selezionato' }, { status: 400 });
  }

  try {
    const { data: contributions, error } = await supabase
      .from('contributions')
      .select('id, text, keywords')
      .in('id', contributionIds);

    if (error || !contributions?.length) throw new Error('Contributi non trovati');

    const allKeywords = [...new Set(contributions.flatMap(c => c.keywords ?? []))];
    const contributionsText = contributions
      .map((c, i) => `${i + 1}. ${c.text}`)
      .join('\n\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Sintetizza i seguenti contributi in un testo coerente di circa 500 parole. 
Tono professionale e divulgativo, adatto a una knowledge base personale.
Non elencare i punti — scrivi in prosa fluida.
Non fare riferimento ai "contributi" o alle "fonti" — scrivi come se fosse un'analisi originale.

CONTRIBUTI:
${contributionsText}`,
      }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const { data: saved, error: saveError } = await supabase
      .from('syntheses')
      .insert({ contribution_ids: contributionIds, keywords: allKeywords, text })
      .select('id')
      .single();

    if (saveError || !saved) throw new Error('Errore salvataggio sintesi');

    return NextResponse.json({ id: saved.id, text, keywords: allKeywords });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore generazione sintesi' }, { status: 500 });
  }
}