import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function analyzeSingleTweet(
  tweet: {
    id: string;
    author: string;
    text: string;
    created_at: string;
    like_count: number;
    view_count: number;
  },
  context: string
): Promise<string> {
  const prompt = `Sei un esperto di tecnologia e innovazione che scrive post LinkedIn autorevoli ma accessibili.

🐦 TWEET di @${tweet.author} (${new Date(tweet.created_at).toLocaleDateString("it-IT")})
"${tweet.text}"
❤️ ${tweet.like_count} like | 👁️ ${tweet.view_count} visualizzazioni

📰 CONTESTO WEB:
${context}

Scrivi un post LinkedIn in italiano seguendo questa struttura — senza titoli o etichette visibili, testo fluido:

1. HOOK (1 riga): una frase che cattura l'attenzione sul fatto o dato tecnico principale.

2. ANALISI TECNICA (3-5 righe): spiega cosa sta succedendo con precisione. Termini tecnici ammessi ma spiegati inline. Tono professionale e autorevole.

3. IMPATTO CONCRETO (2-3 righe): chi è coinvolto, in quali settori, perché conta adesso. Ancora tono autorevole ma già più accessibile.

4. RIFLESSIONE FINALE (2-3 righe): tono personale e divulgativo. Cosa significa tutto questo per le persone comuni — lavoratori, consumatori, cittadini. Chiudi con una domanda aperta o un'osservazione che invita a riflettere.

Niente hashtag. Niente emoji eccessive. Lunghezza totale: 150-220 parole.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}