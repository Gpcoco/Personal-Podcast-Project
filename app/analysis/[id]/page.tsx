import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

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

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('twitter_analysis')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) notFound();

  return (
    <div style={{ fontFamily: 'Georgia, serif', maxWidth: 720, margin: '40px auto', padding: '0 24px', color: '#1a1a1a' }}>

      <div style={{ borderLeft: '4px solid #1da1f2', paddingLeft: 16, marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>🔍 Analisi Tweet</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
          @{data.author} · {new Date(data.retrieved_at).toLocaleDateString('it-IT')}
        </p>
      </div>

      {/* Post LinkedIn */}
      <div
        style={{ lineHeight: 1.8, fontSize: 16 }}
        dangerouslySetInnerHTML={{ __html: formatAnalysis(data.analysis) }}
      />

      {/* Keywords / Hashtag */}
      {data.keywords && data.keywords.length > 0 && (
        <div style={{ marginTop: 32, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#555', fontFamily: 'sans-serif' }}>
            🏷️ Keywords estratte
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.keywords.map((kw: string) => (
              <span key={kw} style={{
                background: '#e8f4fd',
                color: '#1da1f2',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 13,
                fontFamily: 'sans-serif',
              }}>
                #{kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contesto Tavily */}
      {data.tavily_context && data.tavily_context !== 'Contesto non disponibile.' && (
        <div style={{ marginTop: 24, padding: 16, background: '#fffbf0', borderRadius: 8 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#555', fontFamily: 'sans-serif' }}>
            📰 Contesto web
          </p>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: '#555', fontFamily: 'sans-serif', whiteSpace: 'pre-line' }}>
            {data.tavily_context}
          </div>
        </div>
      )}

      <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid #eee', fontSize: 12, color: '#aaa', fontFamily: 'sans-serif' }}>
        Twitter Analytics · {new Date(data.created_at).toLocaleString('it-IT')}
      </div>

    </div>
  );
}