// app/knowledge/page.tsx
import { supabase } from '@/lib/supabase';
import KnowledgeClient from './KnowledgeClient';

export default async function KnowledgePage() {
  const { data: contributions } = await supabase
    .from('contributions')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: syntheses } = await supabase
    .from('syntheses')
    .select('*')
    .order('created_at', { ascending: false });

  const allKeywords = [...new Set(
    (contributions ?? []).flatMap(c => c.keywords ?? [])
  )].sort();

  return (
    <KnowledgeClient
      contributions={contributions ?? []}
      syntheses={syntheses ?? []}
      allKeywords={allKeywords}
    />
  );
}