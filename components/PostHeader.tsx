'use client';

import { useRef, useState } from 'react';

interface PostHeaderProps {
  initialHook: string;
  keywords: string[];
  analysisId: string;
}

// Path immagine di sfondo (deve stare in /public)
const BG_IMAGE = '/bg.jpg';

export default function PostHeader({ initialHook, keywords, analysisId }: PostHeaderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hook, setHook] = useState(initialHook);
  const [regenerating, setRegenerating] = useState(false);

  // Font-size dinamico in base alla lunghezza dell'hook
  const len = hook.length;
  const fontSize = len <= 40 ? 68 : len <= 60 ? 60 : 52;
  const charsPerLine = len <= 40 ? 24 : len <= 60 ? 28 : 32;
  const lineHeight = Math.round(fontSize * 1.18);

  // Wrap manuale del testo
  const wrapText = (text: string, maxChars: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxChars) {
        lines.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines.slice(0, 5);
  };

  const lines = wrapText(hook, charsPerLine);

  // Calcolo posizione: accent bar + testo, centrati verticalmente come blocco
  const totalTextHeight = lines.length * lineHeight;
  const blockTop = (628 - totalTextHeight) / 2;
  const textStartY = blockTop + fontSize * 0.85;

  // Accent bar verticale: stessa altezza del blocco testo
  const barHeight = totalTextHeight - lineHeight * 0.3;
  const barY = blockTop + lineHeight * 0.1;

  const tags = keywords.slice(0, 5);

  // Calcolo posizione tag (centrati orizzontalmente)
  const tagPadding = 24;
  const tagGap = 16;
  const tagFontSize = 22;
  const charWidth = tagFontSize * 0.55;
  const tagWidths = tags.map(t => t.length * charWidth + tagPadding * 2);
  const totalTagsWidth = tagWidths.reduce((a, b) => a + b, 0) + tagGap * (tags.length - 1);
  let tagCursor = (1200 - totalTagsWidth) / 2;

  const handleDownload = async () => {
    if (!svgRef.current) return;

    const bgResponse = await fetch(BG_IMAGE);
    const bgBlob = await bgResponse.blob();
    const bgBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(bgBlob);
    });

    const cloned = svgRef.current.cloneNode(true) as SVGSVGElement;
    const imgEl = cloned.querySelector('image');
    if (imgEl) {
      imgEl.setAttribute('href', bgBase64);
      imgEl.setAttribute('xlink:href', bgBase64);
    }

    const svgString = new XMLSerializer().serializeToString(cloned);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 628;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 1200, 628);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'linkedin-header.png';
        a.click();
        URL.revokeObjectURL(downloadUrl);
      }, 'image/png');
    };
    img.src = url;
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/regenerate-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      });
      if (!res.ok) throw new Error('Rigenerazione fallita');
      const { hook: newHook } = await res.json();
      setHook(newHook);
    } catch (e) {
      console.error(e);
      alert('Errore nella rigenerazione dell\'hook');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 1200 628"
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }}
      >
        <defs>
          <clipPath id="rounded">
            <rect width="1200" height="628" rx="12" />
          </clipPath>
        </defs>

        <g clipPath="url(#rounded)">
          {/* Sfondo immagine */}
          <image
            href={BG_IMAGE}
            x="0"
            y="0"
            width="1200"
            height="628"
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Overlay scuro semi-trasparente */}
          <rect width="1200" height="628" fill="#000000" opacity="0.55" />

          {/* Accent bar verticale gialla a sinistra */}
          <rect x="80" y={barY} width="6" height={barHeight} fill="#f59e0b" />

          {/* Hook — testo allineato a sinistra */}
          <g>
            {lines.map((line, i) => (
              <text
                key={i}
                x="110"
                y={textStartY + i * lineHeight}
                fontFamily="ui-serif, Georgia, serif"
                fontSize={fontSize}
                fill="#ffffff"
                fontWeight="700"
              >
                {line}
              </text>
            ))}
          </g>

          {/* Keywords come pill in basso */}
          <g>
            {tags.map((tag, i) => {
              const w = tagWidths[i];
              const x = tagCursor;
              tagCursor += w + tagGap;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={540}
                    width={w}
                    height={44}
                    rx={22}
                    fill="rgba(0,0,0,0.4)"
                    stroke="#e4e4e7"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x + w / 2}
                    y={569}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    fontSize={tagFontSize}
                    fill="#ffffff"
                    textAnchor="middle"
                    fontWeight="500"
                  >
                    {tag}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          onClick={handleDownload}
          style={{
            padding: '10px 20px',
            background: '#f59e0b',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ↓ Scarica PNG per LinkedIn
        </button>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{
            padding: '10px 20px',
            background: regenerating ? '#9ca3af' : 'transparent',
            color: regenerating ? '#fff' : 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontWeight: 600,
            cursor: regenerating ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          {regenerating ? '⏳ Rigenero...' : '🔄 Rigenera hook'}
        </button>
      </div>
    </div>
  );
}