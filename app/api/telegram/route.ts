import { NextRequest, NextResponse } from 'next/server';
import { fetchSingleTweet } from '@/lib/twitter';
import { getContext } from '@/lib/tavily';
import { analyzeSingleTweet } from '@/lib/claude';
import { saveSingleAnalysis } from '@/lib/supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

function extractTweetId(url: string): string | null {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId: number = message.chat.id;
  const text: string = message.text || '';

  const tweetId = extractTweetId(text);
  if (!tweetId) {
    await sendTelegramMessage(chatId, '❌ URL non valido. Invia un link Twitter/X nel formato:\nhttps://x.com/user/status/123456789');
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, '⏳ Analisi in corso...');

  try {
    const tweet = await fetchSingleTweet(tweetId);
    if (!tweet) throw new Error('Tweet non trovato');

    const { keywords, context } = await getContext(tweet.text);
    const analysis = await analyzeSingleTweet(tweet, context);
    const saved = await saveSingleAnalysis(tweet, analysis, keywords, context);

    const link = `${BASE_URL}/analysis/${saved.id}`;
    await sendTelegramMessage(chatId, `✅ <b>Analisi completata</b>\n\n🔗 <a href="${link}">Leggi l'analisi completa</a>`);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    console.error(err);
    await sendTelegramMessage(chatId, `❌ Errore: ${msg}`);
  }

  return NextResponse.json({ ok: true });
}