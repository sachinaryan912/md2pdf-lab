/**
 * HTML Template Generator
 * Returns a complete, self-contained HTML document wrapping rendered markdown,
 * styled with either "light", "dark", or "github" themes.
 * Embeds Highlight.js styles, MathJax, and Mermaid from CDN.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'github';
export type PageSize = 'A4' | 'Letter' | 'Legal';

export interface TemplateOptions {
  /** Rendered HTML content (inner body) */
  content: string;
  /** Document title shown in <title> tag */
  title: string;
  /** Visual theme */
  theme?: Theme;
  /** Whether to inject MathJax CDN */
  math?: boolean;
  /** Whether to inject Mermaid CDN */
  mermaid?: boolean;
  /** Custom header text for PDF header */
  headerText?: string;
  /** Custom footer text for PDF footer */
  footerText?: string;
}

// ---------------------------------------------------------------------------
// Theme CSS
// ---------------------------------------------------------------------------

const LIGHT_THEME_CSS = `
  :root {
    --bg: #ffffff;
    --surface: #f6f8fa;
    --border: #d0d7de;
    --text: #1f2328;
    --text-muted: #656d76;
    --link: #0969da;
    --code-bg: #f6f8fa;
    --code-border: #d0d7de;
    --blockquote-border: #d0d7de;
    --blockquote-text: #656d76;
    --table-border: #d0d7de;
    --table-header-bg: #f6f8fa;
    --table-alt-bg: #f6f8fa;
    --toc-bg: #f6f8fa;
    --toc-border: #d0d7de;
    --hr-color: #d0d7de;
  }
`;

const DARK_THEME_CSS = `
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --border: #30363d;
    --text: #e6edf3;
    --text-muted: #8b949e;
    --link: #58a6ff;
    --code-bg: #161b22;
    --code-border: #30363d;
    --blockquote-border: #3d444d;
    --blockquote-text: #9198a1;
    --table-border: #3d444d;
    --table-header-bg: #161b22;
    --table-alt-bg: #161b22;
    --toc-bg: #161b22;
    --toc-border: #30363d;
    --hr-color: #21262d;
  }
`;

const GITHUB_THEME_CSS = `
  :root {
    --bg: #ffffff;
    --surface: #f6f8fa;
    --border: #d8dee4;
    --text: #24292f;
    --text-muted: #57606a;
    --link: #0969da;
    --code-bg: rgba(175,184,193,0.2);
    --code-border: transparent;
    --blockquote-border: #d0d7de;
    --blockquote-text: #57606a;
    --table-border: #d8dee4;
    --table-header-bg: #f6f8fa;
    --table-alt-bg: #f6f8fa;
    --toc-bg: #f6f8fa;
    --toc-border: #d8dee4;
    --hr-color: #d8dee4;
  }
`;

const THEME_MAP: Record<Theme, string> = {
  light: LIGHT_THEME_CSS,
  dark: DARK_THEME_CSS,
  github: GITHUB_THEME_CSS,
};

// ---------------------------------------------------------------------------
// Shared base CSS
// ---------------------------------------------------------------------------

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: var(--text);
    background: var(--bg);
    padding: 40px 60px;
    max-width: 960px;
    margin: 0 auto;
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text);
  }
  h1 { font-size: 2rem; border-bottom: 2px solid var(--border); padding-bottom: 0.4rem; }
  h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
  h3 { font-size: 1.25rem; }
  h4 { font-size: 1rem; }
  h5 { font-size: 0.875rem; }
  h6 { font-size: 0.85rem; color: var(--text-muted); }

  /* Anchor links on headings */
  .header-anchor { opacity: 0.4; text-decoration: none; margin-left: 0.25rem; }
  h1:hover .header-anchor,
  h2:hover .header-anchor,
  h3:hover .header-anchor { opacity: 1; }

  /* Paragraphs */
  p { margin-bottom: 1rem; }

  /* Links */
  a { color: var(--link); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* Lists */
  ul, ol { padding-left: 2rem; margin-bottom: 1rem; }
  li { margin-bottom: 0.25rem; }
  li > ul, li > ol { margin-top: 0.25rem; margin-bottom: 0; }

  /* Inline code */
  code {
    background: var(--code-bg);
    border: 1px solid var(--code-border);
    border-radius: 4px;
    padding: 0.15em 0.4em;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.875em;
  }

  /* Code blocks */
  pre {
    background: var(--code-bg);
    border: 1px solid var(--code-border);
    border-radius: 8px;
    padding: 1.25rem;
    overflow-x: auto;
    margin-bottom: 1rem;
  }
  pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.875em;
    line-height: 1.6;
  }
  pre.hljs { padding: 1.25rem; }

  /* Blockquote */
  blockquote {
    border-left: 4px solid var(--blockquote-border);
    padding: 0.5rem 1rem;
    color: var(--blockquote-text);
    margin: 0 0 1rem;
    background: var(--surface);
    border-radius: 0 4px 4px 0;
  }
  blockquote p:last-child { margin-bottom: 0; }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1rem;
    overflow: auto;
    display: block;
  }
  thead { background: var(--table-header-bg); }
  th, td {
    border: 1px solid var(--table-border);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  th { font-weight: 600; }
  tr:nth-child(even) { background: var(--table-alt-bg); }

  /* Images */
  img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 1rem auto; }

  /* Horizontal rule */
  hr { border: none; border-top: 2px solid var(--hr-color); margin: 2rem 0; }

  /* Table of Contents */
  .table-of-contents {
    background: var(--toc-bg);
    border: 1px solid var(--toc-border);
    border-radius: 8px;
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    display: inline-block;
    min-width: 220px;
  }
  .table-of-contents::before {
    content: "📋 Table of Contents";
    font-weight: 700;
    font-size: 0.95rem;
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text);
  }
  .table-of-contents ul { margin-bottom: 0; }
  .table-of-contents a { color: var(--link); font-size: 0.9rem; }

  /* Math blocks */
  .math-block { margin: 1rem 0; text-align: center; font-size: 1.1rem; }
  .math-inline { font-size: 1em; }

  /* Mermaid diagrams */
  .mermaid { text-align: center; margin: 1.5rem 0; }

  /* Task list items (GFM) */
  .task-list-item { list-style: none; }
  .task-list-item input { margin-right: 0.5rem; }

  /* Print / PDF margins reset */
  @media print {
    body { padding: 0; max-width: 100%; }
  }
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a complete HTML document string suitable for Puppeteer PDF rendering.
 *
 * @param opts - Template options
 * @returns    - Full HTML string
 */
export function generateHtmlTemplate(opts: TemplateOptions): string {
  const theme = opts.theme ?? 'light';
  const themeVars = THEME_MAP[theme] ?? LIGHT_THEME_CSS;

  // Highlight.js theme from CDN
  const hljsTheme =
    theme === 'dark'
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github-dark.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github.min.css';

  // MathJax CDN (only when needed)
  const mathJaxScript = opts.math !== false
    ? `<script>
        window.MathJax = {
          tex: { inlineMath: [['\\\\(', '\\\\)']], displayMath: [['\\\\[', '\\\\]']] },
          startup: { typeset: true }
        };
      </script>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>`
    : '';

  // Mermaid CDN (only when needed)
  const mermaidScript = opts.mermaid !== false
    ? `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
       <script>mermaid.initialize({ startOnLoad: true, theme: '${theme === 'dark' ? 'dark' : 'default'}' });</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>

  <!-- Highlight.js theme -->
  <link rel="stylesheet" href="${hljsTheme}" />

  <style>
    /* ---- Theme variables ---- */
    ${themeVars}

    /* ---- Base styles ---- */
    ${BASE_CSS}
  </style>

  <!-- Math (MathJax) -->
  ${mathJaxScript}
</head>
<body>
  ${opts.content}

  <!-- Mermaid diagram renderer -->
  ${mermaidScript}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape HTML special characters in string */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
