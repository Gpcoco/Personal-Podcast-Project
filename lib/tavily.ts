import { tavily } from "@tavily/core";
import Anthropic from "@anthropic-ai/sdk";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
const anthropic = new Anthropic();

export type TavilySource = {
  title: string;
  url: string;
};

async function extractKeywords(tweetText: string): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Estrai 5 keyword di ricerca da questo tweet per trovare articoli di contesto rilevanti. 
Rispondi SOLO con le keyword separate da spazio, niente altro.

Tweet: ${tweetText}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") return [];
  return block.text.trim().split(/\s+/).slice(0, 5);
}

export async function getContext(
  tweetText: string
): Promise<{
  keywords: string[];
  context: string;
  sources: TavilySource[];
}> {
  try {
    const keywords = await extractKeywords(tweetText);
    const query = keywords.join(" ");
    console.log(`   🔑 Keywords: ${query}`);

    const response = await client.search(query, {
      searchDepth: "basic",
      maxResults: 3,
    });

    if (!response.results || response.results.length === 0) {
      return {
        keywords,
        context: "Nessun contesto trovato.",
        sources: [],
      };
    }

    const context = response.results
      .map((r) => `• ${r.title}\n  ${r.content?.slice(0, 200)}`)
      .join("\n\n");

    const sources: TavilySource[] = response.results
      .filter((r) => r.url && r.title)
      .map((r) => ({
        title: r.title,
        url: r.url,
      }));

    return { keywords, context, sources };
  } catch (error) {
    console.warn("Tavily error:", error);
    return {
      keywords: [],
      context: "Contesto non disponibile.",
      sources: [],
    };
  }
}