'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';

interface LinkedInEditorProps {
  initialMarkdown: string;  // analisi grezza dal DB (markdown)
  hashtags: string[];       // keywords da appendere come #hashtag
}

// ─── Conversione caratteri ASCII → Unicode bold/italic per LinkedIn ───
// LinkedIn non supporta HTML, ma rende i caratteri Unicode "Mathematical Alphanumeric Symbols"
const toUnicodeBold = (text: string): string => {
  const map: Record<string, string> = {};
  // A-Z → 𝗔-𝗭 (Sans-Serif Bold)
  for (let i = 0; i < 26; i++) {
    map[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1d5d4 + i);
    map[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1d5ee + i);
  }
  // 0-9 → 𝟬-𝟵
  for (let i = 0; i < 10; i++) {
    map[String.fromCharCode(48 + i)] = String.fromCodePoint(0x1d7ec + i);
  }
  return [...text].map(c => map[c] || c).join('');
};

const toUnicodeItalic = (text: string): string => {
  const map: Record<string, string> = {};
  // A-Z → 𝘈-𝘡 (Sans-Serif Italic)
  for (let i = 0; i < 26; i++) {
    map[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1d608 + i);
    map[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1d622 + i);
  }
  return [...text].map(c => map[c] || c).join('');
};

const toUnicodeBoldItalic = (text: string): string => {
  const map: Record<string, string> = {};
  // A-Z → Sans-Serif Bold Italic
  for (let i = 0; i < 26; i++) {
    map[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1d63c + i);
    map[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1d656 + i);
  }
  return [...text].map(c => map[c] || c).join('');
};

// ─── Conversione HTML TipTap → testo LinkedIn-ready ───
function htmlToLinkedInText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild as HTMLElement;

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';

    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const childText = Array.from(el.childNodes).map(walk).join('');

    switch (tag) {
      case 'strong':
      case 'b':
        // bold + italic combinato
        if (el.querySelector('em, i') || el.closest('em, i')) {
          return toUnicodeBoldItalic(childText);
        }
        return toUnicodeBold(childText);
      case 'em':
      case 'i':
        if (el.querySelector('strong, b') || el.closest('strong, b')) {
          return toUnicodeBoldItalic(childText);
        }
        return toUnicodeItalic(childText);
      case 'p':
        return childText + '\n\n';
      case 'br':
        return '\n';
      case 'ul':
        return Array.from(el.children).map(li => `• ${walk(li).trim()}`).join('\n') + '\n\n';
      case 'ol':
        return Array.from(el.children).map((li, i) => `${i + 1}. ${walk(li).trim()}`).join('\n') + '\n\n';
      case 'li':
        return childText;
      case 'h1':
      case 'h2':
      case 'h3':
        return toUnicodeBold(childText) + '\n\n';
      default:
        return childText;
    }
  };

  return walk(root).replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Markdown → HTML iniziale per TipTap ───
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .split(/\n\n+/)
    .map(block => block.startsWith('<') ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// ─── Componente toolbar ───
function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    background: active ? 'var(--accent)' : 'var(--keyword-card-bg)',
    color: active ? '#fff' : 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'sans-serif',
  });

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))}>
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))}>
        <em>I</em>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))}>
        • Lista
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))}>
        1. Lista
      </button>
    </div>
  );
}

// ─── Editor principale ───
export default function LinkedInEditor({ initialMarkdown, hashtags }: LinkedInEditorProps) {
  const [copied, setCopied] = useState(false);

  const hashtagLine = hashtags.length > 0
    ? hashtags.map(h => `#${h.replace(/\s+/g, '')}`).join(' ')
    : '';

  const initialHtml = markdownToHtml(initialMarkdown)
    + (hashtagLine ? `<p></p><p>${hashtagLine}</p>` : '');

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml,
    immediatelyRender: false, // evita SSR hydration mismatch
  });

  const handleCopy = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const text = htmlToLinkedInText(html);
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
          ✍️ Editor post LinkedIn
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
          {copied ? '✓ Copiato!' : '📋 Copia per LinkedIn'}
        </button>
      </div>

      <Toolbar editor={editor} />

      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        background: 'var(--bg)',
        minHeight: 200,
        fontFamily: 'Georgia, serif',
        fontSize: 16,
        lineHeight: 1.7,
      }}>
        <EditorContent editor={editor} />
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '8px 0 0', fontFamily: 'sans-serif' }}>
        💡 Bold e italic verranno convertiti in caratteri Unicode compatibili con LinkedIn.
      </p>

      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 180px;
        }
        .ProseMirror p { margin: 0 0 1em; }
        .ProseMirror p:last-child { margin-bottom: 0; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin: 0 0 1em; }
        .ProseMirror h2 { font-size: 1.3em; margin: 0.5em 0; }
        .ProseMirror h3 { font-size: 1.15em; margin: 0.5em 0; }
      `}</style>
    </div>
  );
}