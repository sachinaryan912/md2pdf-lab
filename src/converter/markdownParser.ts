/**
 * Markdown Parser
 * Converts Markdown text to styled HTML using markdown-it.
 * Supports: syntax highlighting, table of contents, anchored headings,
 *           tables, images, math (MathJax), and Mermaid diagrams.
 */
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import anchor from 'markdown-it-anchor';
import toc from 'markdown-it-toc-done-right';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParseOptions {
  /** Enable table-of-contents injection (requires [[toc]] marker in md) */
  toc?: boolean;
  /** Enable Mermaid diagram rendering */
  mermaid?: boolean;
  /** Enable MathJax math rendering */
  math?: boolean;
}

export interface ParseResult {
  /** Full rendered HTML (no <html> wrapper) */
  html: string;
  /** Plain-text title extracted from first H1, if any */
  title: string;
}

// ---------------------------------------------------------------------------
// markdown-it configuration
// ---------------------------------------------------------------------------

/**
 * Create and configure a markdown-it instance with syntax highlighting.
 */
function createMdInstance(options: ParseOptions): MarkdownIt {
  const md = new MarkdownIt({
    html: true, // Allow embedded HTML
    linkify: true, // Auto-convert URLs to links
    typographer: true, // Smart quotes, dashes …
    breaks: false,
    highlight(str: string, lang: string): string {
      // Mermaid: always emit the language class so postprocessMermaid() can detect it
      if (lang === 'mermaid') {
        return `<pre class="hljs"><code class="language-mermaid">${str}</code></pre>`;
      }
      // Use highlight.js when language is recognized
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
          return `<pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>`;
        } catch {
          // fall through to default
        }
      }
      // Auto-detect language as fallback
      const auto = hljs.highlightAuto(str).value;
      return `<pre class="hljs"><code>${auto}</code></pre>`;
    },
  });

  // Anchored headings (needed for TOC links)
  md.use(anchor, {
    permalink: anchor.permalink.headerLink(),
    slugify: (s: string) =>
      s
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, ''),
  });

  // Table of contents — [[toc]] marker
  if (options.toc !== false) {
    md.use(toc, {
      placeholder: '\\[\\[toc\\]\\]',
      listType: 'ul',
      containerClass: 'table-of-contents',
      level: [1, 2, 3],
    });
  }

  return md;
}

// ---------------------------------------------------------------------------
// Math block support (simple regex replacement for MathJax)
// ---------------------------------------------------------------------------

/**
 * Pre-process raw markdown to wrap math blocks in MathJax-friendly tags.
 * Supports:
 *   - Display math: $$...$$
 *   - Inline math:  $...$
 */
function preprocessMath(md: string): string {
  // Display math (block)
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula: string) => {
    return `<div class="math-block">\\[${formula.trim()}\\]</div>`;
  });
  // Inline math
  md = md.replace(/\$([^$\n]+?)\$/g, (_match, formula: string) => {
    return `<span class="math-inline">\\(${formula.trim()}\\)</span>`;
  });
  return md;
}

// ---------------------------------------------------------------------------
// Mermaid block support
// ---------------------------------------------------------------------------

/**
 * Post-process rendered HTML to convert <code class="language-mermaid">
 * into <div class="mermaid"> which the Mermaid library can parse.
 */
function postprocessMermaid(html: string): string {
  return html.replace(
    /<pre class="hljs"><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, code: string) => {
      // Decode HTML entities so Mermaid gets clean source
      const decoded = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return `<div class="mermaid">${decoded}</div>`;
    }
  );
}

// ---------------------------------------------------------------------------
// Title extraction
// ---------------------------------------------------------------------------

/**
 * Extract the text of the first H1 heading from raw markdown.
 */
function extractTitle(raw: string): string {
  const match = raw.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse markdown content into HTML.
 *
 * @param markdownContent - Raw markdown string
 * @param options         - Feature flags (toc, math, mermaid)
 * @returns               - { html, title }
 */
export function parseMarkdown(markdownContent: string, options: ParseOptions = {}): ParseResult {
  const title = extractTitle(markdownContent);

  // Optionally pre-process math
  let content = options.math !== false ? preprocessMath(markdownContent) : markdownContent;

  const md = createMdInstance(options);
  let html = md.render(content);

  // Optionally post-process Mermaid
  if (options.mermaid !== false) {
    html = postprocessMermaid(html);
  }

  return { html, title };
}
