'use client';

import { useState } from 'react';

type Source = { title: string; url: string };

interface SourcesBlockProps {
  sources: Source[];
}

function formatSources(sources: Source[]): string {
  // Formato richiesto:
  // 1. titolo
  // 2. link
  // 3. riga vuota
  // (per ogni link)
  return sources
    .map((s) => `${s.title}\n${s.url}\n`)
    .join('\n');
}

export default function SourcesBlock({ sources }: SourcesBlockProps) {
  const [copied, setCopied] = useState(false);

  if (!sources || sources.length === 0) return null;

  const text = formatSources(sources);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
          📚 FONTI
        </p>
        <button
          onClick={handleCopy}
          style={{
            padding: '8px 16px',
            background: copied ? '#10b981' : '#0a66c2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
            fontFamily: 'sans-serif',
          }}
        >
          {copied ? '✓ Copiato!' : '📋 Copia FONTI'}
        </button>
      </div>

      <textarea
        readOnly
        value={text}
        style={{
          width: '100%',
          minHeight: Math.max(120, sources.length * 60),
          padding: 16,
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--bg)',
          color: 'var(--text)',
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 13,
          lineHeight: 1.6,
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}