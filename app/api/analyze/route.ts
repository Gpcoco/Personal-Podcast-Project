import { NextResponse } from "next/server";
import { fetchListTweets, groupByAuthor } from "@/lib/twitter";
import { analyzeTweets } from "@/lib/claude";
import { saveRawTweets, saveAnalysis } from "@/lib/supabase";
import { sendReport } from "@/lib/email";

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

    // 5. Invia email
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