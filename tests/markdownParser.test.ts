/**
 * Tests: Markdown Parser
 */
import { parseMarkdown } from '../src/converter/markdownParser';

describe('parseMarkdown', () => {
  it('should extract the first H1 as title', () => {
    const md = '# Hello World\n\nSome text.';
    const { title } = parseMarkdown(md);
    expect(title).toBe('Hello World');
  });

  it('should return "Untitled" when no H1 is present', () => {
    const md = '## Sub heading\n\nNo h1 here.';
    const { title } = parseMarkdown(md);
    expect(title).toBe('Untitled');
  });

  it('should convert markdown headings to HTML', () => {
    const md = '# Heading 1\n## Heading 2\n### Heading 3';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<h3');
  });

  it('should render bold and italic text', () => {
    const md = '**bold** and *italic*';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('should render inline code', () => {
    const md = 'Use `const` keyword.';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<code>const</code>');
  });

  it('should render fenced code blocks with highlight.js', () => {
    const md = '```javascript\nconst x = 1;\n```';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<pre class="hljs">');
    expect(html).toContain('language-javascript');
  });

  it('should render fenced code block without lang using auto-detect', () => {
    const md = '```\nconst x = 1;\n```';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<pre class="hljs">');
  });

  it('should render markdown tables', () => {
    const md = '| Name | Age |\n|------|-----|\n| Alice | 30 |';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>Alice</td>');
  });

  it('should render unordered lists', () => {
    const md = '- Item 1\n- Item 2\n- Item 3';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Item 1</li>');
  });

  it('should render ordered lists', () => {
    const md = '1. First\n2. Second\n3. Third';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>First</li>');
  });

  it('should render blockquotes', () => {
    const md = '> This is a quote';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<blockquote>');
    expect(html).toContain('This is a quote');
  });

  it('should render horizontal rules', () => {
    const md = 'Above\n\n---\n\nBelow';
    const { html } = parseMarkdown(md);
    expect(html).toContain('<hr>');
  });

  it('should convert URLs to links when linkify is on', () => {
    const md = 'Visit https://example.com for more.';
    const { html } = parseMarkdown(md);
    expect(html).toContain('href="https://example.com"');
  });

  it('should wrap display math blocks for MathJax', () => {
    const md = '$$E = mc^2$$';
    const { html } = parseMarkdown(md, { math: true });
    expect(html).toContain('math-block');
    expect(html).toContain('E = mc^2'); // formula content preserved
  });

  it('should wrap inline math for MathJax', () => {
    const md = 'Inline: $x^2 + y^2 = r^2$';
    const { html } = parseMarkdown(md, { math: true });
    // The math-inline class wrapper must be present
    expect(html).toContain('math-inline');
    // The formula content is preserved inside the span
    expect(html).toContain('x^2 + y^2 = r^2');
  });

  it('should convert mermaid code blocks to div.mermaid', () => {
    const md = '```mermaid\ngraph LR\n  A --> B\n```';
    const { html } = parseMarkdown(md, { mermaid: true });
    expect(html).toContain('<div class="mermaid">');
  });

  it('should inject TOC when [[toc]] marker is present', () => {
    const md = '[[toc]]\n\n# Section 1\n\n## Sub-section\n\n# Section 2';
    const { html } = parseMarkdown(md, { toc: true });
    expect(html).toContain('table-of-contents');
  });

  it('should add anchor links to headings', () => {
    const md = '# My Heading';
    const { html } = parseMarkdown(md);
    expect(html).toContain('id="my-heading"');
  });
});
