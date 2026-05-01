// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { TavilyContext } from "./tavily";

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

export type AnalysisOptions = {
  model?: "claude-sonnet-4-5" | "claude-opus-4-5";
  maxTokens?: number;
  notes?: string;
};

function buildContextString(context: TavilyContext): string {
  return context.snippets
    .map((s, i) => `• Fonte ${i + 1}: ${s}`)
    .join("\n\n");
}

export async function analyzeSingleTweet(
  tweet: TweetInput,
  context: TavilyContext,
  options: AnalysisOptions = {}
): Promise<string> {
  const promptTemplate = await getPrompt("single_tweet_analysis");
  const { model = "claude-sonnet-4-5", maxTokens = 1024, notes } = options;
  const isManual = tweet.author === "GPRIOR";
  const contextString = buildContextString(context);

  const notesSection = notes ? `\n📝 NOTE AGGIUNTIVE:\n${notes}` : "";

  const prompt = isManual
    ? `${promptTemplate}

✍️ TESTO di ${tweet.author} (${new Date(tweet.created_at).toLocaleDateString("it-IT")})
"${tweet.text}"
${notesSection}

📰 CONTESTO WEB:
${contextString}`
    : `${promptTemplate}

🐦 TWEET di @${tweet.author} (${new Date(tweet.created_at).toLocaleDateString("it-IT")})
"${tweet.text}"
❤️ ${tweet.like_count} like | 👁️ ${tweet.view_count} visualizzazioni
${notesSection}

📰 CONTESTO WEB:
${contextString}`;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}

export async function generateContribution(
  tweetText: string,
  analysis: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Scrivi un contributo di 2-3 frasi che sintetizza il valore informativo di questo contenuto per una knowledge base personale. Deve essere autonomo, denso di significato, senza riferimenti a "questo tweet" o "questo testo".

Contenuto: "${tweetText}"
Analisi: ${analysis.slice(0, 800)}

Rispondi SOLO con le 2-3 frasi, niente altro.`,
      },
    ],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();
}

export async function generateHeaderHook(
  tweetText: string,
  analysis: string
): Promise<string> {
  const prompt = `Genera UN solo hook visivo per un'immagine header di un post LinkedIn.

REGOLE FERREE:
- Massimo 80 caratteri (conta gli spazi)
- Tono PARADOSSALE o contro-intuitivo
- Deve incuriosire, non spiegare
- Niente hashtag, niente emoji, niente virgolette
- In italiano
- Una sola frase, secca

ESEMPI:
- "Più l'AI diventa intelligente, meno serviranno gli ingegneri."
- "La privacy è morta. Il prossimo unicorno la venderà a peso d'oro."

Tweet: "${tweetText}"
Analisi: ${analysis.slice(0, 1500)}

Rispondi SOLO con l'hook.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
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