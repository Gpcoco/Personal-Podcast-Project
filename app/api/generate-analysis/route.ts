// app/api/generate-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analyzeSingleTweet, generateHeaderHook, generateContribution } from '@/lib/claude';
import { updateAnalysis, saveContribution, supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { analysisId, tweetText, author, context, notes, model, maxTokens, sources } = await req.json();

  if (!analysisId || !tweetText) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  try {
    // Leggi keywords da DB
    const { data: record, error } = await supabase
      .from('twitter_analysis')
      .select('keywords')
      .eq('id', analysisId)
      .single();

    if (error || !record) throw new Error('Record non trovato');
    const keywords: string[] = record.keywords ?? [];

    const fakeTweet = {
      id: analysisId,
      author,
      text: tweetText,
      created_at: new Date().toISOString(),
      like_count: 0,
      view_count: 0,
      is_reply: false,
    };

    const analysis = await analyzeSingleTweet(
      fakeTweet,
      { links: sources ?? [], snippets: [context] },
      { model, maxTokens, notes }
    );

    const [hook, contribution] = await Promise.all([
      generateHeaderHook(tweetText, analysis),
      generateContribution(tweetText, analysis),
    ]);

    await Promise.all([
      updateAnalysis(analysisId, analysis, model, notes ?? null, hook),
      saveContribution(analysisId, contribution, keywords),
    ]);

    return NextResponse.json({ analysis, hook });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore generazione' }, { status: 500 });
  }
}