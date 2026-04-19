import { NextRequest, NextResponse } from 'next/server';
import { fetchSingleTweet } from '@/lib/twitter';
import { getContext } from '@/lib/tavily';
import { analyzeSingleTweet } from '@/lib/claude';
import { saveSingleAnalysis } from '@/lib/supabase';
import { sendSingleTweetEmail } from '@/lib/email';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export async function POST(req: NextRequest) {
  const { tweetId, chatId } = await req.json();
  if (!tweetId) return NextResponse.json({ error: 'missing tweetId' }, { status: 400 });

  try {
    // 1. Fetch tweet
    const tweet = await fetchSingleTweet(tweetId);
    if (!tweet) throw new Error('Tweet non trovato');

    // 2. Keywords + web context
    const keywords = await extractKeywords(tweet.text);
    const context = await fetchWebContext(keywords);

    // 3. Analisi Sonnet
    const analysis = await analyzeSingleTweet(tweet, context);

    // 4. Salva su Supabase
    await saveSingleAnalysis(tweet, analysis);

    // 5. Email
    await sendSingleTweetEmail(tweet, analysis);

    // 6. Risposta Telegram
    if (chatId) {
      const preview = analysis.slice(0, 800) + (analysis.length > 800 ? '\n\n[...] 📧 Report completo via email.' : '');
      await sendTelegramMessage(chatId, `✅ <b>Analisi completata</b>\n\n${preview}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    if (chatId) {
      await sendTelegramMessage(chatId, `❌ Errore: ${err.message}`);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}