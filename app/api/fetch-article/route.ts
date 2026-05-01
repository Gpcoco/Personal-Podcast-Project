// app/api/fetch-article/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'URL mancante' }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // Rimuovi elementi non utili
    $('script, style, nav, footer, header, aside, iframe, noscript').remove();

    // Estrai testo dal main content, con fallback
    const content =
      $('article').text() ||
      $('main').text() ||
      $('[role="main"]').text() ||
      $('body').text();

    const text = content
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    return NextResponse.json({ text });

  } catch {
    return NextResponse.json({ text: '' }); // fallback silenzioso
  }
}