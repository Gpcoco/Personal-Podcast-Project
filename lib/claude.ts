import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic();

async function getPrompt(name: string): Promise<string> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase
    .from("prompts")
    .select("content")
    .eq("name", name)
    .single();

  if (error || !data) throw new Error(`Prompt "${name}" not found in DB`);
  return data.content;
}

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
  const promptTemplate = await getPrompt("single_tweet_analysis");

  const prompt = `${promptTemplate}

🐦 TWEET di @${tweet.author} (${new Date(tweet.created_at).toLocaleDateString("it-IT")})
"${tweet.text}"
❤️ ${tweet.like_count} like | 👁️ ${tweet.view_count} visualizzazioni

📰 CONTESTO WEB:
${context}`;

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