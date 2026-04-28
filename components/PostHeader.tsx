'use client';

import { useRef } from 'react';

interface PostHeaderProps {
  hook: string;        // prima frase del post LinkedIn
  keywords: string[];  // max 5 keywords (Haiku)
  author?: string;     // opzionale, es. "@elonmusk"
}

export default function PostHeader({ hook, keywords, author }: PostHeaderProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Tronca hook se troppo lungo (max ~140 char per stare nel layout)
  const displayHook = hook.length > 140 ? hook.slice(0, 137) + '…' : hook;

  // Wrap manuale del testo: ~32 char per riga a font-size 56
  const wrapText = (text: string, maxChars = 32): string[] => {
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
    return lines.slice(0, 5); // max 5 righe
  };

  const lines = wrapText(displayHook);
  const tags = keywords.slice(0, 5);

  // Calcolo posizione tag (centrati orizzontalmente)
  const tagPadding = 24;
  const tagGap = 16;
  const tagFontSize = 22;
  const charWidth = tagFontSize * 0.55; // stima
  const tagWidths = tags.map(t => t.length * charWidth + tagPadding * 2);
  const totalTagsWidth = tagWidths.reduce((a, b) => a + b, 0) + tagGap * (tags.length - 1);
  let tagCursor = (1200 - totalTagsWidth) / 2;

  const handleDownload = async () => {
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
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

  return (
    <div style={{ width: '100%' }}>
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 628"
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }}
      >
        {/* Sfondo */}
        <rect width="1200" height="628" fill="#0a0a0a" />

        {/* Accent bar verticale */}
        <rect x="80" y="80" width="6" height="80" fill="#f59e0b" />

        {/* Author opzionale */}
        {author && (
          <text
            x="110"
            y="130"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="22"
            fill="#a1a1aa"
            fontWeight="500"
          >
            {author}
          </text>
        )}

        {/* Hook — testo principale */}
        <g>
          {lines.map((line, i) => (
            <text
              key={i}
              x="80"
              y={220 + i * 70}
              fontFamily="ui-serif, Georgia, serif"
              fontSize="56"
              fill="#fafafa"
              fontWeight="600"
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
                  fill="none"
                  stroke="#3f3f46"
                  strokeWidth="1.5"
                />
                <text
                  x={x + w / 2}
                  y={569}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontSize={tagFontSize}
                  fill="#d4d4d8"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {tag}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <button
        onClick={handleDownload}
        style={{
          marginTop: 12,
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
    </div>
  );
}