import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateHeaderHook } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const { analysisId } = await req.json();
    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId mancante' }, { status: 400 });
    }

    // Recupera author + analisi
    const { data: analysisRow, error: fetchErr } = await supabase
      .from('twitter_analysis')
      .select('author, analysis')
      .eq('id', analysisId)
      .single();

    if (fetchErr || !analysisRow) {
      return NextResponse.json({ error: 'Analisi non trovata' }, { status: 404 });
    }

    // Recupera tweet originale più recente di quell'author (best-effort)
    const { data: rawTweet } = await supabase
      .from('raw_tweets')
      .select('text')
      .eq('author', analysisRow.author)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    const tweetText = rawTweet?.text || '';

    // Genera nuovo hook
    const newHook = await generateHeaderHook(tweetText, analysisRow.analysis);

    // Salva nel DB
    const { error: updateErr } = await supabase
      .from('twitter_analysis')
      .update({ header_hook: newHook })
      .eq('id', analysisId);

    if (updateErr) {
      return NextResponse.json({ error: 'Errore aggiornamento DB' }, { status: 500 });
    }

    return NextResponse.json({ hook: newHook });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    console.error(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}