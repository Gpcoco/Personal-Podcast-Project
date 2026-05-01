// app/analysis/[id]/page.tsx
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import AnalysisClient from './AnalysisClient';

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('twitter_analysis')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) notFound();

  const tavilyContext = data.tavily_context as {
    links: string[];
    snippets: string[];
  } | null;

  return (
    <AnalysisClient
      id={data.id}
      author={data.author}
      tweetText={data.tweet_text ?? ''}
      analysis={data.analysis ?? null}
      keywords={data.keywords ?? []}
      headerHook={data.header_hook ?? ''}
      modelUsed={data.model_used ?? null}
      notes={data.notes ?? ''}
      tavilyLinks={tavilyContext?.links ?? []}
      tavilySnippets={tavilyContext?.snippets ?? []}
      createdAt={data.created_at}
    />
  );
}