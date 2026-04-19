import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function formatAnalysis(text: string) {
  const html = text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

export default async function AnalysisPage({ params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('twitter_analysis')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) notFound();

  return (
    <div style={{ fontFamily: 'Georgia, serif', maxWidth: 720, margin: '40px auto', padding: '0 24px', color: '#222' }}>
      
      <div style={{ borderLeft: '4px solid #1da1f2', paddingLeft: 16, marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>🔍 Analisi Tweet</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
          @{data.author} · {new Date(data.retrieved_at).toLocaleDateString('it-IT')}
        </p>
      </div>

      <div
        style={{ lineHeight: 1.8, fontSize: 16 }}
        dangerouslySetInnerHTML={{ __html: formatAnalysis(data.analysis) }}
      />

      <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid #eee', fontSize: 12, color: '#aaa' }}>
        Twitter Analytics · {new Date(data.created_at).toLocaleString('it-IT')}
      </div>

    </div>
  );
}