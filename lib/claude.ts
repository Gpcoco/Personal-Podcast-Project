import Anthropic from "@anthropic-ai/sdk";
import { Tweet } from "./twitter";
import { getContext } from "./tavily";

const client = new Anthropic();

export async function analyzeTweets(
  author: string,
  tweets: Tweet[]
): Promise<string> {
  // Recupera contesto per ogni tweet
  const tweetsWithContext = await Promise.all(
    tweets.map(async (t) => {
      const context = await getContext(t.text);
      return { tweet: t, context };
    })
  );

  const tweetText = tweetsWithContext
    .map(
      ({ tweet: t, context }, i) =>
        `${i + 1}. [${t.createdAt}] ${t.text}
   (likes: ${t.likeCount}, views: ${t.viewCount})
   CONTESTO WEB:
   ${context}`
    )
    .join("\n\n---\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analizza i seguenti ${tweets.length} tweet di @${author} delle ultime 24 ore.
Hai a disposizione contesto web aggiornato per ciascuno — usalo per arricchire l'analisi.

Per ciascuno, usa esattamente questo formato:

---
🐦 TWEET
"[testo del tweet]"
📅 [data e ora]

📌 RILEVANZA
- Impatto: Alto / Medio / Basso
- Pubblico: [chi riguarda]
- Urgenza: [quanto è attuale]

💡 SPUNTI
- Domanda aperta: [una domanda che solleva]
- Connessioni: [temi collegati, usa il contesto web]
- Angolo critico: [prospettiva controintuitiva]
---

Concludi con:

📊 RIEPILOGO @${author}
- Tema dominante: [tema]
- Sentiment: [positivo/neutro/negativo] — [una riga di spiegazione]
- Da monitorare: [cosa osservare nelle prossime 24h]

Rispondi in italiano, conciso.

TWEET CON CONTESTO:
${tweetText}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

export async function analyzeSingleTweet(
  tweet: { id: string; author: string; text: string; created_at: string; like_count: number; view_count: number },
  context: string
): Promise<string> {
  const prompt = `Analizza questo tweet con il contesto web fornito.

🐦 TWEET di @${tweet.author} (${new Date(tweet.created_at).toLocaleDateString('it-IT')})
"${tweet.text}"
❤️ ${tweet.like_count} like | 👁️ ${tweet.view_count} visualizzazioni

📰 CONTESTO WEB:
${context}

Fornisci:
- 📌 RILEVANZA: impatto, pubblico di riferimento, urgenza
- 💡 SPUNTI: domanda aperta, connessioni con trend, angolo critico
- 🔍 CONTESTO: cosa aggiunge il contesto web alla comprensione del tweet`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');
}