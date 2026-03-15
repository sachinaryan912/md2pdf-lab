/**
 * Express REST API Server
 * Endpoints:
 *   GET  /health       - Liveness probe
 *   POST /convert      - Convert Markdown body → PDF download
 *   GET  /preview      - Render Markdown as styled HTML (browser preview)
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { convertMarkdownToPdf } from '../converter/pdfGenerator';
import { Theme, PageSize } from '../converter/htmlTemplate';
import { parseMarkdown } from '../converter/markdownParser';
import { generateHtmlTemplate } from '../converter/htmlTemplate';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

const ConvertBodySchema = z.object({
  /** Raw Markdown text */
  markdown: z.string().min(1, 'Markdown content is required').max(500_000, 'Content too large'),
  /** Visual theme */
  theme: z.enum(['light', 'dark', 'github']).optional().default('light'),
  /** PDF page size */
  pageSize: z.enum(['A4', 'Letter', 'Legal']).optional().default('A4'),
  /** Page margin in mm */
  margin: z.number().int().min(0).max(50).optional().default(15),
  /** Enable TOC */
  toc: z.boolean().optional().default(true),
  /** Enable math rendering */
  math: z.boolean().optional().default(true),
  /** Enable Mermaid diagrams */
  mermaid: z.boolean().optional().default(true),
  /** Show header/footer */
  displayHeaderFooter: z.boolean().optional().default(false),
  /** Custom filename for download */
  filename: z.string().optional().default('document'),
});

type ConvertBody = z.infer<typeof ConvertBodySchema>;

// ---------------------------------------------------------------------------
// Rate limiter (protect the conversion endpoint)
// ---------------------------------------------------------------------------

const convertLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 conversions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please wait a minute.' },
});

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

export function createApp(): express.Application {
  const app = express();

  // ── Security & parsing middleware ──────────────────────────────────────
  app.use(
    helmet({
      // Allow CDN resources in the HTML we generate
      contentSecurityPolicy: false,
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── HTTP request logging ──────────────────────────────────────────────
  app.use(
    morgan('combined', {
      stream: { write: (message: string) => logger.http(message.trim()) },
    })
  );

  // ── Routes ────────────────────────────────────────────────────────────

  /**
   * GET /health
   * Returns basic service health info.
   */
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'md2pdf-lab',
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  });

  /**
   * POST /convert
   * Accepts JSON body with markdown content, returns a PDF binary stream.
   */
  app.post('/convert', convertLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const parseResult = ConvertBodySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const body: ConvertBody = parseResult.data;
      logger.info('Conversion request received', {
        theme: body.theme,
        pageSize: body.pageSize,
        markdownLength: body.markdown.length,
      });

      // Convert Markdown → PDF
      const { pdfBuffer, title } = await convertMarkdownToPdf(body.markdown, {
        theme: body.theme as Theme,
        pageSize: body.pageSize as PageSize,
        margin: body.margin,
        toc: body.toc,
        math: body.math,
        mermaid: body.mermaid,
        displayHeaderFooter: body.displayHeaderFooter,
      });

      // Sanitize filename
      const safeFilename = (body.filename || title)
        .replace(/[^a-z0-9_\-\s]/gi, '_')
        .replace(/\s+/g, '_')
        .substring(0, 80);

      // Stream PDF back to client
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
        'Content-Length': pdfBuffer.byteLength,
        'X-Document-Title': title,
      });
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /preview
   * Renders Markdown (from ?md= query param) as styled HTML.
   * Useful for browser-based preview without downloading.
   */
  app.get('/preview', (req: Request, res: Response, next: NextFunction) => {
    try {
      const md = req.query['md'] as string | undefined;
      if (!md) {
        res.status(400).json({ error: 'Query param `md` is required' });
        return;
      }
      const theme = (req.query['theme'] as Theme) || 'light';
      const { html, title } = parseMarkdown(decodeURIComponent(md), { toc: true });
      const fullHtml = generateHtmlTemplate({ content: html, title, theme, math: true, mermaid: true });
      res.set('Content-Type', 'text/html');
      res.send(fullHtml);
    } catch (err) {
      next(err);
    }
  });

  // ── Global error handler ──────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Server bootstrap (when run directly)
// ---------------------------------------------------------------------------

export function startServer(port: number = 8080): void {
  const app = createApp();
  const server = app.listen(port, () => {
    logger.info(`🚀 md2pdf-lab API running on http://localhost:${port}`);
    logger.info(`   POST /convert  → Markdown → PDF`);
    logger.info(`   GET  /health   → Health check`);
    logger.info(`   GET  /preview  → Browser HTML preview`);
  });

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down server…');
    const { closeBrowser } = await import('../converter/pdfGenerator');
    await closeBrowser();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
