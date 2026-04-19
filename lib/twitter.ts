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