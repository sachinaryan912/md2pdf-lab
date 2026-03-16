/**
 * Tests: REST API
 * Uses supertest to make HTTP requests without starting a real server.
 */
import supertest from 'supertest';
import { createApp } from '../src/api/server';

// Create a fresh app instance (no real server port needed for supertest)
const app = createApp();
const request = supertest(app);

describe('GET /health', () => {
  it('should return 200 with status ok', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok sachin');
    expect(res.body.service).toBe('md2pdf-lab');
    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.uptime).toBe('number');
  });
});

describe('POST /convert', () => {
  // Skip PDF generation tests in CI unless Puppeteer is available
  const itIfNotCI = process.env.CI ? it.skip : it;

  itIfNotCI(
    'should convert markdown to PDF and return binary',
    async () => {
      const res = await request
        .post('/convert')
        .send({ markdown: '# Hello\n\nThis is a test.' })
        .set('Accept', 'application/pdf');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      // PDF files start with %PDF
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    },
    30_000 // 30s timeout for Puppeteer
  );

  it('should return 400 when markdown is missing', async () => {
    const res = await request.post('/convert').send({}).set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
    expect(res.body.details).toBeDefined();
  });

  it('should return 400 when markdown is an empty string', async () => {
    const res = await request
      .post('/convert')
      .send({ markdown: '' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  it('should return 400 when theme is invalid', async () => {
    const res = await request
      .post('/convert')
      .send({ markdown: '# Test', theme: 'neon' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  it('should return 400 when pageSize is invalid', async () => {
    const res = await request
      .post('/convert')
      .send({ markdown: '# Test', pageSize: 'A5' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  it('should accept valid optional fields without error in validation', async () => {
    // We only test that Zod validation passes — not actual PDF generation (skipped in CI)
    // A real conversion would return 200; here we just skip if Puppeteer unavailable
    const res = await request
      .post('/convert')
      .send({
        markdown: '# Test\n\nHello world',
        theme: 'dark',
        pageSize: 'Letter',
        margin: 20,
        toc: false,
        math: false,
        mermaid: false,
        displayHeaderFooter: true,
        filename: 'my-doc',
      })
      .set('Content-Type', 'application/json');

    // Either succeeds with PDF or fails with Puppeteer error (500) — not a 400
    expect([200, 500]).toContain(res.status);
    if (res.status === 400) {
      fail('Unexpected 400 — Zod validation should have passed');
    }
  });
});

describe('GET /preview', () => {
  it('should return HTML when md query param is provided', async () => {
    const encoded = encodeURIComponent('# Hello\n\nWorld');
    const res = await request.get(`/preview?md=${encoded}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('<!DOCTYPE html>');
    expect(res.text).toContain('<h1');
  });

  it('should return 400 when md query param is missing', async () => {
    const res = await request.get('/preview');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('md');
  });

  it('should apply dark theme when theme=dark is specified', async () => {
    const encoded = encodeURIComponent('# Dark Test');
    const res = await request.get(`/preview?md=${encoded}&theme=dark`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('--bg: #0d1117'); // dark theme variable
  });
});

describe('Unknown routes', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request.get('/unknown-route');
    expect(res.status).toBe(404);
  });
});
