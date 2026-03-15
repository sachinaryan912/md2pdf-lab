/**
 * Main Entry Point
 * When the package is invoked as a library (e.g. `import md2pdf from 'md2pdf-lab'`),
 * this file re-exports the public API surface.
 *
 * When invoked as a server (`node dist/index.js`), it starts the REST API.
 */
import dotenv from 'dotenv';

// Load environment variables from .env (if present)
dotenv.config();

// Re-export public API for library consumers
export { convertMarkdownToPdf, convertFile, closeBrowser } from './converter/pdfGenerator';
export { parseMarkdown } from './converter/markdownParser';
export { generateHtmlTemplate } from './converter/htmlTemplate';
export type { ConvertOptions, ConvertResult } from './converter/pdfGenerator';
export type { ParseOptions, ParseResult } from './converter/markdownParser';
export type { TemplateOptions, Theme, PageSize } from './converter/htmlTemplate';

// When this file is run directly (not imported), start the HTTP server
if (require.main === module) {
  const { startServer } = require('./api/server');
  const port = parseInt(process.env.PORT ?? '8080', 10);
  startServer(port);
}
