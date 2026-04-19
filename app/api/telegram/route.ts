import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

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
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/analyze-single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweetId, chatId }),
    });

    if (!res.ok) throw new Error(`analyze-single failed: ${res.status}`);
  } catch (err) {
    console.error(err);
    await sendTelegramMessage(chatId, '❌ Errore durante l\'analisi. Riprova più tardi.');
  }

  return NextResponse.json({ ok: true });
}