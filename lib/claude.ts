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
  const prompt = `Sei un esperto analista che aiuta a comprendere contenuti tecnici e complessi.
Analizza questo tweet in profondità, spiegando ogni concetto tecnico o termine specifico in modo chiaro.

🐦 TWEET di @${tweet.author} (${new Date(tweet.created_at).toLocaleDateString('it-IT')})
"${tweet.text}"
❤️ ${tweet.like_count} like | 👁️ ${tweet.view_count} visualizzazioni

📰 CONTESTO WEB:
${context}

Fornisci un'analisi dettagliata con questo formato:

📖 DI COSA PARLA
Spiega in 2-3 frasi semplici il messaggio principale del tweet, come se lo spiegassi a qualcuno che non conosce il settore.

🔬 TERMINI E CONCETTI CHIAVE
Per ogni termine tecnico o concetto specifico presente nel tweet, spiega:
- Cosa significa
- Perché è importante in questo contesto
- Un esempio concreto se utile

📌 RILEVANZA
- Impatto: Alto / Medio / Basso — perché
- Chi riguarda: [settori, professioni, persone coinvolte]
- Urgenza: [quanto è attuale e perché]

💡 APPROFONDIMENTO
- Cosa c'è dietro: il contesto più ampio che serve per capire davvero
- Connessioni: come si collega a trend, eventi o tecnologie correlate
- Domanda aperta: una questione che questo tweet solleva ma non risponde

⚠️ PUNTI DI ATTENZIONE
Segnala eventuali affermazioni discutibili, semplificazioni eccessive o aspetti che meritano verifica.

Rispondi in italiano. Sii preciso ma accessibile.`;

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