import { tavily } from "@tavily/core";
import Anthropic from "@anthropic-ai/sdk";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
const anthropic = new Anthropic();

async function extractKeywords(tweetText: string): Promise<string> {
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
  if (block.type !== "text") return tweetText.slice(0, 380);
  return block.text.trim().slice(0, 380);
}

export async function getContext(tweetText: string): Promise<string> {
  try {
    const query = await extractKeywords(tweetText);
    console.log(`   🔑 Keywords: ${query}`);

    const response = await client.search(query, {
      searchDepth: "basic",
      maxResults: 3,
    });

    if (!response.results || response.results.length === 0) {
      return "Nessun contesto trovato.";
    }

    return response.results
      .map((r) => `• ${r.title}\n  ${r.content?.slice(0, 200)}`)
      .join("\n\n");
  } catch (error) {
    console.warn("Tavily error:", error);
    return "Contesto non disponibile.";
  }
}