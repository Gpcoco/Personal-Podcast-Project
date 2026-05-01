// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { Tweet } from "./twitter";

export const supabase = createClient(
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

export async function getLatestAnalyses(limit = 20) {
  const { data, error } = await supabase
    .from("twitter_analysis")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Supabase getLatestAnalyses: ${error.message}`);
  return data;
}

// Chiamata dalla pagina /analysis/[id] dopo che l'utente preme Genera
export async function updateAnalysis(
  id: string,
  analysis: string,
  modelUsed: string,
  notes: string | null,
  headerHook: string
): Promise<void> {
  const { error } = await supabase
    .from("twitter_analysis")
    .update({ analysis, model_used: modelUsed, notes, header_hook: headerHook })
    .eq("id", id);
  if (error) throw new Error(`Supabase updateAnalysis: ${error.message}`);
}

export async function saveContribution(
  analysisId: string,
  text: string,
  keywords: string[]
): Promise<void> {
  const { error } = await supabase
    .from("contributions")
    .insert({ analysis_id: analysisId, text, keywords, source_type: "tweet" });
  if (error) throw new Error(`Supabase saveContribution: ${error.message}`);
}

export async function getContributions(keywords?: string[]) {
  let query = supabase
    .from("contributions")
    .select("*")
    .order("created_at", { ascending: false });

  if (keywords && keywords.length > 0) {
    query = query.overlaps("keywords", keywords);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Supabase getContributions: ${error.message}`);
  return data;
}