import { createClient } from "@supabase/supabase-js";
import { Tweet } from "./twitter";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function saveRawTweets(tweets: Tweet[]): Promise<void> {
  const rows = tweets.map((t) => ({
    tweet_id: t.id,
    author: t.author.userName,
    text: t.text,
    created_at_twitter: new Date(t.createdAt).toISOString(),
    like_count: t.likeCount,
    view_count: t.viewCount,
    is_reply: t.isReply,
  }));

  const { error } = await supabase
    .from("raw_tweets")
    .upsert(rows, { onConflict: "tweet_id" });

  if (error) throw new Error(`Supabase saveRawTweets: ${error.message}`);
}

export async function saveAnalysis(
  author: string,
  tweetCount: number,
  analysis: string,
  retrievedAt: Date
): Promise<void> {
  const { error } = await supabase.from("twitter_analysis").insert({
    author,
    tweet_count: tweetCount,
    analysis,
    retrieved_at: retrievedAt.toISOString(),
  });

  if (error) throw new Error(`Supabase saveAnalysis: ${error.message}`);
}

export async function getLatestAnalyses(limit = 20) {
  const { data, error } = await supabase
    .from("twitter_analysis")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Supabase getLatestAnalyses: ${error.message}`);
  return data;
}

export async function saveSingleAnalysis(
  tweet: { id: string; author: string; text: string; created_at: string; like_count: number; view_count: number; is_reply: boolean },
  analysis: string
) {
  // Salva raw tweet
  await supabase.from('raw_tweets').upsert({
    tweet_id: tweet.id,
    author: tweet.author,
    text: tweet.text,
    created_at_twitter: tweet.created_at,
    like_count: tweet.like_count,
    view_count: tweet.view_count,
    is_reply: tweet.is_reply,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'tweet_id' });

  // Salva analisi
  await supabase.from('twitter_analysis').insert({
    author: tweet.author,
    tweet_count: 1,
    analysis,
    retrieved_at: new Date().toISOString(),
  });
}