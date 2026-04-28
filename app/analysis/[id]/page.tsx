import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import PostHeader from '@/components/Postheader';

type TavilySource = { title: string; url: string };

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

// CSS con variabili tema-aware (light di default, dark via prefers-color-scheme)
const themeCss = `
  :root {
    --bg: #ffffff;
    --text: #1a1a1a;
    --text-muted: #555555;
    --text-subtle: #888888;
    --text-faint: #aaaaaa;
    --border: #eeeeee;
    --accent: #1da1f2;
    --keyword-bg: #e8f4fd;
    --keyword-text: #1da1f2;
    --keyword-card-bg: #f8f9fa;
    --sources-bg: #f0f7ff;
    --sources-border: #d6e9ff;
    --context-bg: #fffbf0;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1a1a;
      --text: #e8e8e8;
      --text-muted: #b8b8b8;
      --text-subtle: #888888;
      --text-faint: #666666;
      --border: #2e2e2e;
      --accent: #4ab3f4;
      --keyword-bg: #1e3a52;
      --keyword-text: #7cc4f5;
      --keyword-card-bg: #242424;
      --sources-bg: #1a2a3a;
      --sources-border: #2a4a6a;
      --context-bg: #2a2620;
    }
  }
  body { background: var(--bg); margin: 0; }
`;

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('twitter_analysis')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) notFound();

  const sources: TavilySource[] = Array.isArray(data.tavily_sources) ? data.tavily_sources : [];

  // Prima frase non vuota del post = hook per l'header
  const hook: string = data.analysis
    .split('\n')
    .map((l: string) => l.trim())
    .find((l: string) => l.length > 0)
    ?.replace(/\*\*/g, '') // rimuove eventuali bold markdown
    ?? '';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />

      <div style={{ fontFamily: 'Georgia, serif', maxWidth: 720, margin: '40px auto', padding: '0 24px', color: 'var(--text)' }}>

        <div style={{ borderLeft: '4px solid var(--accent)', paddingLeft: 16, marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--text)' }}>🔍 Analisi Tweet</h1>
          <p style={{ margin: 0, color: 'var(--text-subtle)', fontSize: 14 }}>
            @{data.author} · {new Date(data.retrieved_at).toLocaleDateString('it-IT')}
          </p>
        </div>

        {/* Header scaricabile per LinkedIn */}
        {hook && data.keywords && data.keywords.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <PostHeader
              hook={hook}
              keywords={data.keywords}
              author={`@${data.author}`}
            />
          </div>
        )}

        {/* Post LinkedIn */}
        <div
          style={{ lineHeight: 1.8, fontSize: 16, color: 'var(--text)' }}
          dangerouslySetInnerHTML={{ __html: formatAnalysis(data.analysis) }}
        />

        {/* Keywords / Hashtag */}
        {data.keywords && data.keywords.length > 0 && (
          <div style={{ marginTop: 32, padding: 16, background: 'var(--keyword-card-bg)', borderRadius: 8 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
              🏷️ Keywords estratte
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.keywords.map((kw: string) => (
                <span key={kw} style={{
                  background: 'var(--keyword-bg)',
                  color: 'var(--keyword-text)',
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

        {/* Fonti per i commenti LinkedIn */}
        {sources.length > 0 && (
          <div style={{ marginTop: 24, padding: 16, background: 'var(--sources-bg)', borderRadius: 8, border: '1px solid var(--sources-border)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
              🔗 Fonti per i commenti LinkedIn
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontFamily: 'sans-serif' }}>
              {sources.map((s, i) => (
                <li key={i} style={{ marginBottom: i === sources.length - 1 ? 0 : 12 }}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                  >
                    {s.title}
                  </a>
                  <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2, wordBreak: 'break-all' }}>
                    {s.url}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contesto Tavily */}
        {data.tavily_context && data.tavily_context !== 'Contesto non disponibile.' && (
          <div style={{ marginTop: 24, padding: 16, background: 'var(--context-bg)', borderRadius: 8 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
              📰 Contesto web
            </p>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)', fontFamily: 'sans-serif', whiteSpace: 'pre-line' }}>
              {data.tavily_context}
            </div>
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-faint)', fontFamily: 'sans-serif' }}>
          Twitter Analytics · {new Date(data.created_at).toLocaleString('it-IT')}
        </div>

      </div>
    </>
  );
}