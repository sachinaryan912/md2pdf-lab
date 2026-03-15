/**
 * Tests: HTML Template Generator
 */
import { generateHtmlTemplate } from '../src/converter/htmlTemplate';

describe('generateHtmlTemplate', () => {
  const baseOpts = {
    content: '<h1>Test</h1><p>Hello world</p>',
    title: 'Test Document',
  };

  it('should return a complete HTML document', () => {
    const html = generateHtmlTemplate(baseOpts);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
  });

  it('should include the document title in <title>', () => {
    const html = generateHtmlTemplate(baseOpts);
    expect(html).toContain('<title>Test Document</title>');
  });

  it('should include content in the body', () => {
    const html = generateHtmlTemplate(baseOpts);
    expect(html).toContain('<h1>Test</h1>');
    expect(html).toContain('<p>Hello world</p>');
  });

  it('should apply light theme variables by default', () => {
    const html = generateHtmlTemplate(baseOpts);
    expect(html).toContain('--bg: #ffffff');
    expect(html).toContain('--text: #1f2328');
  });

  it('should apply dark theme variables when theme=dark', () => {
    const html = generateHtmlTemplate({ ...baseOpts, theme: 'dark' });
    expect(html).toContain('--bg: #0d1117');
    expect(html).toContain('--text: #e6edf3');
  });

  it('should apply github theme variables when theme=github', () => {
    const html = generateHtmlTemplate({ ...baseOpts, theme: 'github' });
    expect(html).toContain('--text: #24292f');
  });

  it('should include dark highlight.js stylesheet for dark theme', () => {
    const html = generateHtmlTemplate({ ...baseOpts, theme: 'dark' });
    expect(html).toContain('github-dark.min.css');
  });

  it('should include light highlight.js stylesheet for light theme', () => {
    const html = generateHtmlTemplate({ ...baseOpts, theme: 'light' });
    expect(html).toContain('github.min.css');
  });

  it('should include MathJax script when math is enabled (default)', () => {
    const html = generateHtmlTemplate({ ...baseOpts, math: true });
    expect(html).toContain('mathjax@3');
    expect(html).toContain('MathJax');
  });

  it('should NOT include MathJax script when math is false', () => {
    const html = generateHtmlTemplate({ ...baseOpts, math: false });
    expect(html).not.toContain('mathjax');
  });

  it('should include Mermaid script when mermaid is enabled (default)', () => {
    const html = generateHtmlTemplate({ ...baseOpts, mermaid: true });
    expect(html).toContain('mermaid');
    expect(html).toContain('mermaid.initialize');
  });

  it('should NOT include Mermaid script when mermaid is false', () => {
    const html = generateHtmlTemplate({ ...baseOpts, mermaid: false });
    // mermaid JS script should not be present
    expect(html).not.toContain('mermaid.initialize');
  });

  it('should escape HTML special chars in title', () => {
    const html = generateHtmlTemplate({ ...baseOpts, title: '<script>alert("xss")</script>' });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should use dark mermaid theme for dark PDF theme', () => {
    const html = generateHtmlTemplate({ ...baseOpts, theme: 'dark', mermaid: true });
    expect(html).toContain("theme: 'dark'");
  });

  it('should use default mermaid theme for light PDF theme', () => {
    const html = generateHtmlTemplate({ ...baseOpts, theme: 'light', mermaid: true });
    expect(html).toContain("theme: 'default'");
  });
});
