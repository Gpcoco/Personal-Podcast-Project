import { NextResponse } from "next/server";
import { fetchListTweets, groupByAuthor } from "@/lib/twitter";
import { analyzeTweets } from "@/lib/claude";
import { saveRawTweets, saveAnalysis } from "@/lib/supabase";
import { sendReport } from "@/lib/email";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const client = new Anthropic();

async function generateWeeklySummary() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Recupera analisi ultimi 7 giorni
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: analyses } = await supabase
    .from("twitter_analysis")
    .select("author, analysis, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (!analyses || analyses.length === 0) {
    console.log("No analyses found for weekly summary");
    return;
  }

  const content = analyses
    .map((a) => `@${a.author} — ${new Date(a.created_at).toLocaleDateString("it-IT")}\n${a.analysis}`)
    .join("\n\n---\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Sei un analista. Hai a disposizione le analisi dei tweet della settimana scorsa.
Produci una sintesi settimanale che identifichi:

🗓️ SINTESI SETTIMANA
[date dal ... al ...]

🔥 TEMI DOMINANTI
I 3-5 temi più ricorrenti tra tutti gli autori monitorati.

👥 AUTORI IN EVIDENZA
Chi ha prodotto i contenuti più rilevanti e perché.

📈 TREND IN CRESCITA
Argomenti che stanno guadagnando attenzione rispetto alle settimane precedenti.

💡 CONSIDERAZIONE FINALE
Un'osservazione sintetica su cosa sta succedendo nel settore questa settimana.

Rispondi in italiano. Sii conciso e diretto.

ANALISI DELLA SETTIMANA:
${content}`,
      },
    ],
  });

  const summary = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");

  const weekStart = since.toISOString().split("T")[0];

  await supabase.from("weekly_summaries").insert({
    content: summary,
    week_start: weekStart,
  });

  console.log("Weekly summary saved!");
}

export async function POST() {
  try {
    const retrievedAt = new Date();

    // 1. Fetch tweets
    console.log("Fetching tweets...");
    const tweets = await fetchListTweets(24);
    if (tweets.length === 0) {
      return NextResponse.json({ message: "No tweets found" }, { status: 200 });
    }

    // 2. Salva tweet grezzi
    await saveRawTweets(tweets);
    console.log(`Saved ${tweets.length} raw tweets`);

    // 3. Raggruppa per autore
    const grouped = groupByAuthor(tweets);
    const authors = Object.keys(grouped);
    console.log(`Authors found: ${authors.join(", ")}`);

    console.log("\n🔍 [3.5/5] Recupero contesto web con Tavily...");

    // 4. Analizza con Claude + salva
    const analyses: { author: string; tweetCount: number; analysis: string }[] = [];

    for (const author of authors) {
      const authorTweets = grouped[author];
      console.log(`Analyzing @${author} (${authorTweets.length} tweets)...`);
      const analysis = await analyzeTweets(author, authorTweets);
      await saveAnalysis(author, authorTweets.length, analysis, retrievedAt);
      analyses.push({ author, tweetCount: authorTweets.length, analysis });
    }

    // 5. Sintesi settimanale ogni lunedì
    if (new Date().getDay() === 1) {
      console.log("Monday — generating weekly summary...");
      await generateWeeklySummary();
    }

    // 6. Invia email
    await sendReport(analyses);
    console.log("Email sent!");

    return NextResponse.json({
      success: true,
      tweets: tweets.length,
      authors: authors.length,
      analyses: analyses.map((a) => ({
        author: a.author,
        tweetCount: a.tweetCount,
      })),
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}