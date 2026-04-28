'use client';

import { useRef } from 'react';

interface PostHeaderProps {
  hook: string;        // hook paradossale generato da Haiku (max ~80 char)
  keywords: string[];  // max 5 keywords (Haiku)
  author?: string;     // opzionale, es. "@elonmusk"
}

// Path immagine di sfondo (deve stare in /public)
const BG_IMAGE = '/bg.jpg';

export default function PostHeader({ hook, keywords, author }: PostHeaderProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Sceglie font-size in base alla lunghezza dell'hook
  // hook breve = font grosso (più impatto), hook lungo = font ridotto
  const len = hook.length;
  const fontSize = len <= 40 ? 76 : len <= 60 ? 64 : 54;
  const charsPerLine = len <= 40 ? 22 : len <= 60 ? 26 : 30;
  const lineHeight = Math.round(fontSize * 1.15);

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
    return lines.slice(0, 4);
  };

  const lines = wrapText(hook, charsPerLine);

  // Centratura verticale del blocco testo
  const totalTextHeight = lines.length * lineHeight;
  const textStartY = (628 - totalTextHeight) / 2 + fontSize * 0.75;

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

    // Embed dell'immagine come base64 nel SVG (così il canvas non si "tainta")
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

          {/* Hook — testo principale centrato verticalmente */}
          <g textAnchor="middle">
            {lines.map((line, i) => (
              <text
                key={i}
                x="600"
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