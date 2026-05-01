// app/analysis/[id]/AnalysisClient.tsx
'use client';

import { useState, useEffect } from 'react';
import PostHeader from '@/components/PostHeader';
import LinkedInEditor from '@/components/LinkedInEditor';
import SourcesBlock from '@/components/SourcesBlock';

interface Props {
  id: string;
  author: string;
  tweetText: string;
  analysis: string | null;
  keywords: string[];
  headerHook: string;
  modelUsed: string | null;
  notes: string;
  tavilyLinks: string[];
  tavilySnippets: string[];
  createdAt: string;
}

const themeCss = `
  :root {
    --bg: #ffffff; --text: #1a1a1a; --text-muted: #555555;
    --text-subtle: #888888; --text-faint: #aaaaaa; --border: #eeeeee;
    --accent: #1da1f2; --keyword-bg: #e8f4fd; --keyword-text: #1da1f2;
    --keyword-card-bg: #f8f9fa; --sources-bg: #f0f7ff;
    --sources-border: #d6e9ff; --tab-active: #1da1f2; --tab-bg: #f8f9fa;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1a1a; --text: #e8e8e8; --text-muted: #b8b8b8;
      --text-subtle: #888888; --text-faint: #666666; --border: #2e2e2e;
      --accent: #4ab3f4; --keyword-bg: #1e3a52; --keyword-text: #7cc4f5;
      --keyword-card-bg: #242424; --sources-bg: #1a2a3a;
      --sources-border: #2a4a6a; --tab-active: #4ab3f4; --tab-bg: #242424;
    }
  }
  body { background: var(--bg); margin: 0; }
`;

type ArticleState = 'loading' | 'done' | 'failed';

export default function AnalysisClient({
  id, author, tweetText, analysis: initialAnalysis,
  keywords, headerHook: initialHook, modelUsed,
  notes: initialNotes, tavilyLinks, tavilySnippets, createdAt,
}: Props) {
  const [activeTab, setActiveTab] = useState<'input' | 'result'>(
    initialAnalysis ? 'result' : 'input'
  );

  // ── Stato tab INPUT ──
  const [articleTexts, setArticleTexts] = useState<Record<number, string>>({});
  const [articleStates, setArticleStates] = useState<Record<number, ArticleState>>({});
  const [manualUrls, setManualUrls] = useState<string[]>(['']);
  const [manualTexts, setManualTexts] = useState<Record<number, string>>({});
  const [manualStates, setManualStates] = useState<Record<number, ArticleState>>({});
  const [notes, setNotes] = useState(initialNotes);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [model, setModel] = useState<'claude-sonnet-4-5' | 'claude-opus-4-5'>(
    (modelUsed as 'claude-sonnet-4-5' | 'claude-opus-4-5') ?? 'claude-sonnet-4-5'
  );
  const [generating, setGenerating] = useState(false);

  // ── Stato tab RESULT ──
  const [analysis, setAnalysis] = useState<string | null>(initialAnalysis);
  const [hook, setHook] = useState(initialHook);

  // ── Fetch articoli Tavily al mount ──
  useEffect(() => {
    tavilyLinks.forEach((url, i) => {
      setArticleStates(prev => ({ ...prev, [i]: 'loading' }));
      fetch('/api/fetch-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
        .then(r => r.json())
        .then(({ text }) => {
          setArticleTexts(prev => ({ ...prev, [i]: text }));
          setArticleStates(prev => ({ ...prev, [i]: text ? 'done' : 'failed' }));
        })
        .catch(() => setArticleStates(prev => ({ ...prev, [i]: 'failed' })));
    });
  }, []);

  // ── Fetch URL manuali onBlur ──
  const handleManualUrlBlur = (i: number, url: string) => {
    if (!url.startsWith('http')) return;
    setManualStates(prev => ({ ...prev, [i]: 'loading' }));
    fetch('/api/fetch-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then(r => r.json())
      .then(({ text }) => {
        setManualTexts(prev => ({ ...prev, [i]: text }));
        setManualStates(prev => ({ ...prev, [i]: text ? 'done' : 'failed' }));
      })
      .catch(() => setManualStates(prev => ({ ...prev, [i]: 'failed' })));
  };

  // ── Genera analisi ──
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const fullContext = [
        ...tavilySnippets.map((s, i) => articleTexts[i] || s),
        ...Object.values(manualTexts).filter(Boolean),
      ].join('\n\n---\n\n');

      const allSources = [
        ...tavilyLinks,
        ...manualUrls.filter(u => u.startsWith('http')),
      ];

      const res = await fetch('/api/generate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: id,
          tweetText,
          author,
          context: fullContext,
          notes,
          model,
          maxTokens,
          sources: allSources,
        }),
      });

      if (!res.ok) throw new Error('Errore generazione');
      const { analysis: newAnalysis, hook: newHook } = await res.json();
      setAnalysis(newAnalysis);
      setHook(newHook);
      setActiveTab('result');
    } catch (e) {
      console.error(e);
      alert('Errore durante la generazione. Riprova.');
    } finally {
      setGenerating(false);
    }
  };

  const sources = tavilyLinks.map((url, i) => ({
    title: tavilySnippets[i]?.split('\n')[0] ?? url,
    url,
  }));

  // ── Render ──
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <div style={{ fontFamily: 'Georgia, serif', maxWidth: 720, margin: '40px auto', padding: '0 24px', color: 'var(--text)' }}>

        {/* Header */}
        <div style={{ borderLeft: '4px solid var(--accent)', paddingLeft: 16, marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--text)' }}>🔍 Analisi</h1>
          <p style={{ margin: 0, color: 'var(--text-subtle)', fontSize: 14 }}>
            @{author} · {new Date(createdAt).toLocaleDateString('it-IT')}
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '2px solid var(--border)' }}>
          {(['input', 'result'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 24px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--tab-active)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--tab-active)' : 'var(--text-subtle)',
                fontWeight: activeTab === tab ? 700 : 400,
                fontSize: 15,
                cursor: 'pointer',
                marginBottom: -2,
                fontFamily: 'sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {tab === 'input' ? '📥 Input' : '📤 Result'}
            </button>
          ))}
        </div>

        {/* ── TAB INPUT ── */}
        {activeTab === 'input' && (
          <div>
            {/* Testo tweet */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
                🐦 Testo originale
              </p>
              <div style={{ padding: 16, background: 'var(--keyword-card-bg)', borderRadius: 8, fontSize: 15, lineHeight: 1.7 }}>
                {tweetText}
              </div>
            </div>

            {/* Keywords */}
            {keywords.length > 0 && (
              <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {keywords.map(kw => (
                  <span key={kw} style={{
                    background: 'var(--keyword-bg)', color: 'var(--keyword-text)',
                    padding: '4px 10px', borderRadius: 20, fontSize: 13, fontFamily: 'sans-serif',
                  }}>
                    #{kw}
                  </span>
                ))}
              </div>
            )}

            {/* Articoli Tavily */}
            {tavilyLinks.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
                  📰 Fonti Tavily
                </p>
                {tavilyLinks.map((url, i) => (
                  <div key={i} style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'sans-serif', wordBreak: 'break-all' }}>
                      {url}
                    </a>
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)', fontFamily: 'sans-serif', lineHeight: 1.6 }}>
                      {articleStates[i] === 'loading' && <span style={{ color: 'var(--text-faint)' }}>⏳ Caricamento...</span>}
                      {articleStates[i] === 'failed' && <span style={{ color: 'var(--text-faint)' }}>⚠️ Fallback snippet: {tavilySnippets[i]?.slice(0, 300)}</span>}
                      {articleStates[i] === 'done' && articleTexts[i]?.slice(0, 400)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* URL manuali */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
                🔗 Aggiungi fonti manuali
              </p>
              {manualUrls.map((url, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <input
                    type="url"
                    value={url}
                    onChange={e => {
                      const updated = [...manualUrls];
                      updated[i] = e.target.value;
                      setManualUrls(updated);
                    }}
                    onBlur={e => handleManualUrlBlur(i, e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                      borderRadius: 8, background: 'var(--bg)', color: 'var(--text)',
                      fontFamily: 'sans-serif', fontSize: 14, boxSizing: 'border-box',
                    }}
                  />
                  {manualStates[i] === 'loading' && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)', fontFamily: 'sans-serif' }}>⏳ Caricamento...</p>}
                  {manualStates[i] === 'done' && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#10b981', fontFamily: 'sans-serif' }}>✓ Testo estratto</p>}
                  {manualStates[i] === 'failed' && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444', fontFamily: 'sans-serif' }}>⚠️ Fetch fallito — URL ignorato</p>}
                </div>
              ))}
              <button
                onClick={() => setManualUrls(prev => [...prev, ''])}
                style={{
                  marginTop: 8, padding: '6px 12px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'sans-serif',
                }}
              >
                + Aggiungi URL
              </button>
            </div>

            {/* Note */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
                📝 Note
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Aggiungi contesto, angolazioni, istruzioni specifiche..."
                rows={4}
                style={{
                  width: '100%', padding: 12, border: '1px solid var(--border)',
                  borderRadius: 8, background: 'var(--bg)', color: 'var(--text)',
                  fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.6,
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Slider max_tokens */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
                📏 Lunghezza output: <span style={{ color: 'var(--accent)' }}>{maxTokens} token</span>
              </p>
              <input
                type="range" min={256} max={4096} step={128}
                value={maxTokens}
                onChange={e => setMaxTokens(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'sans-serif', marginTop: 4 }}>
                <span>256 (breve)</span><span>4096 (lungo)</span>
              </div>
            </div>

            {/* Selettore modello */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
                🤖 Modello
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['claude-sonnet-4-5', 'claude-opus-4-5'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    style={{
                      padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8,
                      background: model === m ? 'var(--accent)' : 'var(--keyword-card-bg)',
                      color: model === m ? '#fff' : 'var(--text)',
                      fontWeight: model === m ? 700 : 400,
                      cursor: 'pointer', fontSize: 13, fontFamily: 'sans-serif',
                    }}
                  >
                    {m === 'claude-sonnet-4-5' ? '⚡ Sonnet' : '🧠 Opus'}
                  </button>
                ))}
              </div>
            </div>

            {/* Pulsante Genera */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                width: '100%', padding: '14px 0',
                background: generating ? '#9ca3af' : 'var(--accent)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 16, cursor: generating ? 'not-allowed' : 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              {generating ? '⏳ Generazione in corso...' : '✨ Genera'}
            </button>
          </div>
        )}

        {/* ── TAB RESULT ── */}
        {activeTab === 'result' && (
          <div>
            {!analysis ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-subtle)', fontFamily: 'sans-serif' }}>
                <p style={{ fontSize: 18 }}>Nessuna analisi ancora.</p>
                <button
                  onClick={() => setActiveTab('input')}
                  style={{
                    marginTop: 16, padding: '10px 24px', background: 'var(--accent)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    cursor: 'pointer', fontWeight: 600, fontFamily: 'sans-serif',
                  }}
                >
                  ← Vai a Input
                </button>
              </div>
            ) : (
              <>
                {hook && keywords.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <PostHeader initialHook={hook} keywords={keywords} analysisId={id} />
                  </div>
                )}
                <LinkedInEditor initialMarkdown={analysis} hashtags={keywords} />
                <SourcesBlock sources={sources} />
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-faint)', fontFamily: 'sans-serif' }}>
          Twitter Analytics · {new Date(createdAt).toLocaleString('it-IT')}
        </div>
      </div>
    </>
  );
}