// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic();

async function getPrompt(name: string): Promise<string> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase
    .from("prompts")
    .select("content")
    .eq("name", name)
    .single();

  if (error || !data) throw new Error(`Prompt "${name}" not found in DB`);
  return data.content;
}

type TweetInput = {
  id: string;
  author: string;
  text: string;
  created_at: string;
  like_count: number;
  view_count: number;
  is_reply?: boolean;
};

export async function analyzeSingleTweet(
  tweet: TweetInput,
  context: string
): Promise<string> {
  const promptTemplate = await getPrompt("single_tweet_analysis");

  const isManual = tweet.author === 'GPRIOR';

  const prompt = isManual
    ? `${promptTemplate}

✍️ TESTO di ${tweet.author} (${new Date(tweet.created_at).toLocaleDateString("it-IT")})
"${tweet.text}"

📰 CONTESTO WEB:
${context}`
    : `${promptTemplate}

🐦 TWEET di @${tweet.author} (${new Date(tweet.created_at).toLocaleDateString("it-IT")})
"${tweet.text}"
❤️ ${tweet.like_count} like | 👁️ ${tweet.view_count} visualizzazioni

📰 CONTESTO WEB:
${context}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}

/**
 * Genera un hook breve e paradossale per l'header visivo del post LinkedIn.
 * Vincolo: max 80 caratteri, tono paradossale/contro-intuitivo per generare curiosità.
 * Usa Haiku per costo minimo.
 */
export async function generateHeaderHook(
  tweetText: string,
  analysis: string
): Promise<string> {
  const prompt = `Genera UN solo hook visivo per un'immagine header di un post LinkedIn.

REGOLE FERREE:
- Massimo 80 caratteri (conta gli spazi)
- Tono PARADOSSALE o contro-intuitivo: un'affermazione che sembra una contraddizione, un capovolgimento di senso, una domanda che spiazza
- Deve incuriosire, non spiegare
- Niente hashtag, niente emoji, niente virgolette
- In italiano
- Una sola frase, secca

ESEMPI di stile paradossale:
- "Più l'AI diventa intelligente, meno serviranno gli ingegneri."
- "La privacy è morta. Il prossimo unicorno la venderà a peso d'oro."
- "Abbiamo automatizzato tutto tranne le decisioni che contano."

CONTENUTO DA SINTETIZZARE:
Tweet: "${tweetText}"

Analisi: ${analysis.slice(0, 1500)}

Rispondi SOLO con l'hook, niente altro. Niente preamboli, niente spiegazioni.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim()
    .replace(/^["']|["']$/g, "");

  if (raw.length <= 80) return raw;
  const truncated = raw.slice(0, 80);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 50 ? truncated.slice(0, lastSpace) : truncated).replace(/[,;:]$/, "") + "…";
}
