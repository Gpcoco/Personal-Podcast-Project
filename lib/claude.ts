import Anthropic from "@anthropic-ai/sdk";
import { Tweet } from "./twitter";
import { getContext } from "./tavily";

const client = new Anthropic();

export async function analyzeTweets(
  author: string,
  tweets: Tweet[]
): Promise<string> {
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
   CONTESTO WEB: ${context}`
    )
    .join("\n\n---\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analizza i seguenti ${tweets.length} tweet di @${author} delle ultime 24 ore.
Usa il contesto web per arricchire l'analisi.

Per ciascuno:

---
🐦 TWEET
"[testo]" — 📅 [data]

📌 RILEVANZA
- Impatto: Alto / Medio / Basso — perché
- Chi riguarda: [settori/professioni]
- Urgenza: [quanto è attuale]

💡 SPUNTI
- Contesto: cosa c'è dietro (termini complessi spiegati inline)
- Connessioni: trend o eventi correlati
- Domanda aperta: una questione che il tweet solleva
---

Concludi con:

📊 RIEPILOGO @${author}
- Tema dominante: [tema]
- Sentiment: positivo / neutro / negativo — una riga
- Da monitorare: [cosa osservare nelle prossime 24h]

Rispondi in italiano. Sii conciso.

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
  const prompt = `Sei un analista che spiega contenuti tech a un pubblico curioso ma non specializzato.

🐦 TWEET di @${tweet.author} (${new Date(tweet.created_at).toLocaleDateString('it-IT')})
"${tweet.text}"
❤️ ${tweet.like_count} like | 👁️ ${tweet.view_count} visualizzazioni

📰 CONTESTO WEB:
${context}

Analizza con questo formato:

📖 DI COSA PARLA
2-3 frasi che spiegano il messaggio principale. Se ci sono termini tecnici complessi, spiegali brevemente inline (es. "RAG — tecnica che combina recupero documenti e generazione AI").

📌 RILEVANZA
- Impatto: Alto / Medio / Basso — perché
- Chi riguarda: [settori o professioni coinvolte]
- Urgenza: [quanto è attuale]

💡 APPROFONDIMENTO
- Contesto: cosa c'è dietro per capire davvero
- Connessioni: trend o tecnologie correlate
- Domanda aperta: una questione che il tweet solleva

⚠️ PUNTI DI ATTENZIONE
Affermazioni discutibili o aspetti da verificare. Se non ce ne sono, scrivi "Nessuno rilevante."

Rispondi in italiano. Sii preciso e conciso.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');
}