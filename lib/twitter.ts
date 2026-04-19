const TWITTERAPI_BASE = "https://api.twitterapi.io/twitter";
const LIST_ID = process.env.TWITTER_LIST_ID!;
const API_KEY = process.env.TWITTERAPI_KEY!;

export interface Tweet {
  id: string;
  text: string;
  author: {
    userName: string;
    name: string;
  };
  createdAt: string;
  likeCount: number;
  viewCount: number;
  isReply: boolean;
}

export async function fetchListTweets(hoursBack = 24): Promise<Tweet[]> {
  const allTweets: Tweet[] = [];
  let cursor: string | null = null;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  while (true) {
    const url = new URL(`${TWITTERAPI_BASE}/list/tweets`);
    url.searchParams.set("listId", LIST_ID);
    url.searchParams.set("count", "20");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": API_KEY },
    });

    if (!res.ok) throw new Error(`TwitterAPI error: ${res.status}`);

    const data = await res.json();
    const tweets: Tweet[] = data.tweets ?? [];

    let stop = false;
    for (const tweet of tweets) {
      const tweetDate = new Date(tweet.createdAt);
      if (tweetDate < since) {
        stop = true;
        break;
      }
      allTweets.push(tweet);
    }

    if (stop || !data.has_next_page) break;
    cursor = data.next_cursor;
  }

  return allTweets.filter((t) => !t.isReply);
}

export function groupByAuthor(tweets: Tweet[]): Record<string, Tweet[]> {
  return tweets.reduce((acc, tweet) => {
    const key = tweet.author.userName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tweet);
    return acc;
  }, {} as Record<string, Tweet[]>);
}

export async function fetchSingleTweet(tweetId: string) {
  const res = await fetch(
    `https://api.twitterapi.io/twitter/tweet/advanced_search?queryType=Latest&query=conversation_id:${tweetId}`,
    {
      headers: { 'X-API-Key': process.env.TWITTERAPI_KEY! },
    }
  );

  if (!res.ok) throw new Error(`twitterapi.io error: ${res.status}`);
await res.json();
  // Prova prima con endpoint diretto
  const res2 = await fetch(
    `https://api.twitterapi.io/twitter/tweets?tweet_ids=${tweetId}`,
    {
      headers: { 'X-API-Key': process.env.TWITTERAPI_KEY! },
    }
  );

  if (!res2.ok) throw new Error(`twitterapi.io error: ${res2.status}`);
  const data2 = await res2.json();

  const t = data2?.tweets?.[0];
  if (!t) throw new Error('Tweet non trovato');

  return {
    id: t.id,
    author: t.author?.userName ?? t.author?.name ?? 'unknown',
    text: t.text,
    created_at: t.createdAt,
    like_count: t.likeCount ?? 0,
    view_count: t.viewCount ?? 0,
    is_reply: !!t.inReplyToId,
  };
}