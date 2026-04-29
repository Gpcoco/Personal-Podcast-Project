// app/api/telegram/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchSingleTweet } from '@/lib/twitter';
import { analyzeSingleTweet } from '@/lib/claude';
import { getContext } from '@/lib/tavily';
import { saveSingleAnalysis } from '@/lib/supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text: string = message.text?.trim() ?? '';

  if (!text) return NextResponse.json({ ok: true });

  // Sicurezza: ignora messaggi da chat non autorizzate
  if (chatId !== TELEGRAM_CHAT_ID) {
    await sendMessage(chatId, '⛔ Non autorizzato.');
    return NextResponse.json({ ok: true });
  }

  try {
    if (isTweetUrl(text)) {
      // ── FLUSSO TWEET ──────────────────────────────────────────
      await sendMessage(chatId, '🔍 Fetching tweet...');
      const tweet = await fetchSingleTweet(text);

      await sendMessage(chatId, '🧠 Analisi in corso...');
      const { keywords, context } = await getContext(tweet.text);
      const analysis = await analyzeSingleTweet(tweet.text, context);
      const id = await saveSingleAnalysis(tweet, analysis, keywords, context);

      await sendMessage(chatId, `✅ Analisi pronta:\n${BASE_URL}/analysis/${id}`);
    } else {
      // ── FLUSSO TESTO LIBERO ───────────────────────────────────
      if (text.length < 20) {
        await sendMessage(chatId, '⚠️ Testo troppo breve. Invia almeno 20 caratteri.');
        return NextResponse.json({ ok: true });
      }

      await sendMessage(chatId, '🧠 Analisi testo in corso...');
      const { keywords, context } = await getContext(text);
      const analysis = await analyzeSingleTweet(text, context);

      // Fake tweet object con author GPRIOR
      const fakeTweet = {
        id: `manual_${Date.now()}`,
        author: 'GPRIOR',
        text,
        created_at: new Date().toISOString(),
        like_count: 0,
        view_count: 0,
        is_reply: false,
      };

      const id = await saveSingleAnalysis(fakeTweet, analysis, keywords, context);
      await sendMessage(chatId, `✅ Analisi pronta:\n${BASE_URL}/analysis/${id}`);
    }
  } catch (err) {
    console.error(err);
    await sendMessage(chatId, '❌ Errore durante l\'analisi. Riprova.');
  }

  return NextResponse.json({ ok: true });
}
