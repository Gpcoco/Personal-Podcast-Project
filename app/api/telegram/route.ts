// app/api/telegram/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchSingleTweet } from '@/lib/twitter';
import { getContext } from '@/lib/tavily';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function sendMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

function isTweetUrl(text: string): boolean {
  return /https?:\/\/(twitter\.com|x\.com)\/\S+\/status\/\d+/.test(text.trim());
}

function extractTweetId(url: string): string {
  const match = url.match(/\/status\/(\d+)/);
  if (!match) throw new Error('ID tweet non trovato nell\'URL');
  return match[1];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text: string = message.text?.trim() ?? '';

  if (!text) return NextResponse.json({ ok: true });

  if (chatId !== TELEGRAM_CHAT_ID) {
    await sendMessage(chatId, '⛔ Non autorizzato.');
    return NextResponse.json({ ok: true });
  }

  try {
    let tweetText: string;
    let author: string;

    if (isTweetUrl(text)) {
      await sendMessage(chatId, '🔍 Fetching tweet...');
      const tweet = await fetchSingleTweet(extractTweetId(text));
      tweetText = tweet.text;
      author = tweet.author;
    } else {
      if (text.length < 20) {
        await sendMessage(chatId, '⚠️ Testo troppo breve. Invia almeno 20 caratteri.');
        return NextResponse.json({ ok: true });
      }
      tweetText = text;
      author = 'GPCOCO';
    }

    await sendMessage(chatId, '🔎 Ricerca contesto...');
    const { keywords, context } = await getContext(tweetText);

    const { data, error } = await supabase
      .from('twitter_analysis')
      .insert({
        author,
        tweet_text: tweetText,
        keywords,
        tavily_context: context, // { links: string[], snippets: string[] }
        tweet_count: 1,
        analysis: null,
        model_used: null,
        notes: null,
      })
      .select('id')
      .single();

    if (error) throw error;

    await sendMessage(chatId, `✅ Pronto!\n<a href="${BASE_URL}/analysis/${data.id}">Apri analisi</a>`);

  } catch (err) {
    console.error(err);
    await sendMessage(chatId, '❌ Errore durante l\'elaborazione. Riprova.');
  }

  return NextResponse.json({ ok: true });
}