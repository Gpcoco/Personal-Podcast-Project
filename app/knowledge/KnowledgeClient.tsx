// app/knowledge/KnowledgeClient.tsx
'use client';

import { useState } from 'react';

type Contribution = {
  id: string;
  analysis_id: string | null;
  text: string;
  keywords: string[];
  source_type: string;
  created_at: string;
};

type Synthesis = {
  id: string;
  contribution_ids: string[];
  keywords: string[];
  text: string;
  created_at: string;
};

interface Props {
  contributions: Contribution[];
  syntheses: Synthesis[];
  allKeywords: string[];
}

const themeCss = `
  :root {
    --bg: #ffffff; --text: #1a1a1a; --text-muted: #555555;
    --text-subtle: #888888; --text-faint: #aaaaaa; --border: #eeeeee;
    --accent: #1da1f2; --keyword-bg: #e8f4fd; --keyword-text: #1da1f2;
    --keyword-card-bg: #f8f9fa; --selected-bg: #e8f4fd; --selected-border: #1da1f2;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1a1a; --text: #e8e8e8; --text-muted: #b8b8b8;
      --text-subtle: #888888; --text-faint: #666666; --border: #2e2e2e;
      --accent: #4ab3f4; --keyword-bg: #1e3a52; --keyword-text: #7cc4f5;
      --keyword-card-bg: #242424; --selected-bg: #1e3a52; --selected-border: #4ab3f4;
    }
  }
  body { background: var(--bg); margin: 0; }
`;

export default function KnowledgeClient({ contributions, syntheses, allKeywords }: Props) {
  const [activeTab, setActiveTab] = useState<'contributions' | 'syntheses'>('contributions');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [latestSynthesis, setLatestSynthesis] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
    setSelectedIds([]);
  };

  const filteredContributions = selectedKeywords.length === 0
    ? contributions
    : contributions.filter(c =>
        selectedKeywords.every(kw => c.keywords?.includes(kw))
      );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredContributions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContributions.map(c => c.id));
    }
  };

  const handleGenerateSynthesis = async () => {
    if (selectedIds.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributionIds: selectedIds }),
      });
      if (!res.ok) throw new Error('Errore generazione');
      const { text } = await res.json();
      setLatestSynthesis(text);
      setActiveTab('syntheses');
    } catch (e) {
      console.error(e);
      alert('Errore durante la generazione della sintesi.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <div style={{ fontFamily: 'Georgia, serif', maxWidth: 720, margin: '40px auto', padding: '0 24px', color: 'var(--text)' }}>

        {/* Header */}
        <div style={{ borderLeft: '4px solid var(--accent)', paddingLeft: 16, marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>🧠 Knowledge Base</h1>
          <p style={{ margin: 0, color: 'var(--text-subtle)', fontSize: 14, fontFamily: 'sans-serif' }}>
            {contributions.length} contributi · {syntheses.length} sintesi
          </p>
        </div>

        {/* Filtro keywords */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
            🏷️ Filtra per keyword
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allKeywords.map(kw => (
              <button
                key={kw}
                onClick={() => toggleKeyword(kw)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 13,
                  fontFamily: 'sans-serif', cursor: 'pointer',
                  background: selectedKeywords.includes(kw) ? 'var(--accent)' : 'var(--keyword-bg)',
                  color: selectedKeywords.includes(kw) ? '#fff' : 'var(--keyword-text)',
                  border: 'none', fontWeight: selectedKeywords.includes(kw) ? 700 : 400,
                }}
              >
                #{kw}
              </button>
            ))}
            {selectedKeywords.length > 0 && (
              <button
                onClick={() => setSelectedKeywords([])}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 13,
                  fontFamily: 'sans-serif', cursor: 'pointer',
                  background: 'transparent', color: 'var(--text-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
          {(['contributions', 'syntheses'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 24px', background: 'transparent', border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-subtle)',
                fontWeight: activeTab === tab ? 700 : 400,
                fontSize: 15, cursor: 'pointer', marginBottom: -2,
                fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {tab === 'contributions' ? `📝 Contributi (${filteredContributions.length})` : `✨ Sintesi (${syntheses.length})`}
            </button>
          ))}
        </div>

        {/* ── TAB CONTRIBUTI ── */}
        {activeTab === 'contributions' && (
          <div>
            {filteredContributions.length === 0 ? (
              <p style={{ color: 'var(--text-subtle)', fontFamily: 'sans-serif' }}>Nessun contributo trovato.</p>
            ) : (
              <>
                {/* Azioni selezione */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <button
                    onClick={handleSelectAll}
                    style={{
                      padding: '6px 14px', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: 6,
                      color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: 13, fontFamily: 'sans-serif',
                    }}
                  >
                    {selectedIds.length === filteredContributions.length ? '☐ Deseleziona tutti' : '☑ Seleziona tutti'}
                  </button>

                  {selectedIds.length > 0 && (
                    <button
                      onClick={handleGenerateSynthesis}
                      disabled={generating}
                      style={{
                        padding: '8px 20px',
                        background: generating ? '#9ca3af' : 'var(--accent)',
                        color: '#fff', border: 'none', borderRadius: 8,
                        fontWeight: 700, fontSize: 14, cursor: generating ? 'not-allowed' : 'pointer',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      {generating ? '⏳ Generazione...' : `✨ Sintetizza (${selectedIds.length})`}
                    </button>
                  )}
                </div>

                {/* Lista contributi */}
                {filteredContributions.map(c => (
                  <div
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    style={{
                      marginBottom: 12, padding: 16,
                      border: `1px solid ${selectedIds.includes(c.id) ? 'var(--selected-border)' : 'var(--border)'}`,
                      borderRadius: 8, cursor: 'pointer',
                      background: selectedIds.includes(c.id) ? 'var(--selected-bg)' : 'var(--bg)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, flex: 1 }}>{c.text}</p>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>
                        {selectedIds.includes(c.id) ? '✅' : '⬜'}
                      </span>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      {c.keywords?.map(kw => (
                        <span key={kw} style={{
                          background: 'var(--keyword-bg)', color: 'var(--keyword-text)',
                          padding: '2px 8px', borderRadius: 20, fontSize: 12, fontFamily: 'sans-serif',
                        }}>
                          #{kw}
                        </span>
                      ))}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'sans-serif' }}>
                        {new Date(c.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── TAB SINTESI ── */}
        {activeTab === 'syntheses' && (
          <div>
            {latestSynthesis && (
              <div style={{ marginBottom: 24, padding: 20, border: `2px solid var(--accent)`, borderRadius: 10, background: 'var(--selected-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'sans-serif' }}>
                    ✨ Nuova sintesi
                  </p>
                  <button
                    onClick={() => handleCopy(latestSynthesis)}
                    style={{
                      padding: '6px 14px', background: copied ? '#10b981' : 'var(--accent)',
                      color: '#fff', border: 'none', borderRadius: 6,
                      cursor: 'pointer', fontSize: 13, fontFamily: 'sans-serif', fontWeight: 600,
                    }}
                  >
                    {copied ? '✓ Copiato!' : '📋 Copia'}
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{latestSynthesis}</p>
              </div>
            )}

            {syntheses.length === 0 && !latestSynthesis ? (
              <p style={{ color: 'var(--text-subtle)', fontFamily: 'sans-serif' }}>Nessuna sintesi ancora.</p>
            ) : (
              syntheses.map(s => (
                <div key={s.id} style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {s.keywords?.slice(0, 5).map(kw => (
                        <span key={kw} style={{
                          background: 'var(--keyword-bg)', color: 'var(--keyword-text)',
                          padding: '2px 8px', borderRadius: 20, fontSize: 12, fontFamily: 'sans-serif',
                        }}>
                          #{kw}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'sans-serif', flexShrink: 0 }}>
                      {new Date(s.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                    {s.text}
                  </p>
                  <button
                    onClick={() => handleCopy(s.text)}
                    style={{
                      marginTop: 12, padding: '6px 14px', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: 6,
                      color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: 13, fontFamily: 'sans-serif',
                    }}
                  >
                    📋 Copia
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-faint)', fontFamily: 'sans-serif' }}>
          Twitter Analytics · Knowledge Base
        </div>
      </div>
    </>
  );
}