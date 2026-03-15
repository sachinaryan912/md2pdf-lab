/**
 * PDF Generator
 * Uses Puppeteer to render an HTML string to a PDF buffer.
 * Supports page size, margins, custom header/footer, and themes.
 */
import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger';
import { parseMarkdown, ParseOptions } from './markdownParser';
import { generateHtmlTemplate, Theme, PageSize } from './htmlTemplate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConvertOptions {
  /** Visual theme for the PDF */
  theme?: Theme;
  /** PDF page size */
  pageSize?: PageSize;
  /** Page margin in millimeters (applied to all sides) */
  margin?: number;
  /** Custom header HTML (Puppeteer header template) */
  headerTemplate?: string;
  /** Custom footer HTML (Puppeteer footer template) */
  footerTemplate?: string;
  /** Display header and footer */
  displayHeaderFooter?: boolean;
  /** Enable MathJax math rendering */
  math?: boolean;
  /** Enable Mermaid diagram rendering */
  mermaid?: boolean;
  /** Enable table of contents */
  toc?: boolean;
}

export interface ConvertResult {
  /** PDF as a Buffer */
  pdfBuffer: Buffer;
  /** Extracted document title */
  title: string;
  /** Number of pages (approximation) */
  pageCount?: number;
}

// ---------------------------------------------------------------------------
// Browser singleton
// ---------------------------------------------------------------------------

let browserInstance: Browser | null = null;

/**
 * Return a singleton Puppeteer browser, launching it if needed.
 * Reuse across requests to avoid cold-start cost.
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    logger.info('Launching Puppeteer browser…');
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
    logger.info('Browser launched successfully');
  }
  return browserInstance;
}

/**
 * Gracefully close the browser singleton.
 * Call this when the process exits (e.g., server shutdown).
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    logger.info('Puppeteer browser closed');
  }
}

// ---------------------------------------------------------------------------
// Core conversion logic
// ---------------------------------------------------------------------------

/**
 * Convert a Markdown string to a PDF buffer.
 *
 * @param markdownContent - Raw Markdown text
 * @param options         - Rendering options
 * @returns               - ConvertResult with pdfBuffer and metadata
 */
export async function convertMarkdownToPdf(
  markdownContent: string,
  options: ConvertOptions = {}
): Promise<ConvertResult> {
  const {
    theme = 'light',
    pageSize = 'A4',
    margin = 15,
    displayHeaderFooter = false,
    math = true,
    mermaid = true,
    toc = true,
  } = options;

  logger.debug('Starting Markdown → PDF conversion', { theme, pageSize, margin });

  // Step 1: Parse Markdown → HTML fragment
  const parseOpts: ParseOptions = { toc, math, mermaid };
  const { html, title } = parseMarkdown(markdownContent, parseOpts);

  // Step 2: Wrap in full HTML template
  const fullHtml = generateHtmlTemplate({
    content: html,
    title,
    theme,
    math,
    mermaid,
  });

  // Step 3: Render with Puppeteer
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set content and wait for network (CDN fonts/scripts)
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30_000 });

    // Wait extra 500 ms for MathJax / Mermaid to render
    if (math || mermaid) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Build Puppeteer PDF options
    const marginStr = `${margin}mm`;
    const pdfOptions: PDFOptions = {
      format: pageSize,
      printBackground: true,
      displayHeaderFooter,
      margin: {
        top: marginStr,
        right: marginStr,
        bottom: marginStr,
        left: marginStr,
      },
    };

    if (displayHeaderFooter) {
      pdfOptions.headerTemplate =
        options.headerTemplate ??
        `<div style="font-size:10px;width:100%;text-align:center;color:#888;">${title}</div>`;
      pdfOptions.footerTemplate =
        options.footerTemplate ??
        `<div style="font-size:10px;width:100%;text-align:center;color:#888;">
           Page <span class="pageNumber"></span> of <span class="totalPages"></span>
         </div>`;
    }

    const pdfUint8Array = await page.pdf(pdfOptions);
    const pdfBuffer = Buffer.from(pdfUint8Array);

    logger.info('PDF generated', { title, bytes: pdfBuffer.byteLength });
    return { pdfBuffer, title };
  } finally {
    // Always close page to free memory
    await page.close();
  }
}

/**
 * Convert a Markdown **file** on disk to a PDF file on disk.
 *
 * @param inputPath  - Absolute or relative path to .md file
 * @param outputPath - Path for the output .pdf file
 * @param options    - Rendering options
 */
export async function convertFile(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions = {}
): Promise<ConvertResult> {
  const absInput = path.resolve(inputPath);
  const absOutput = path.resolve(outputPath);

  logger.info('Converting file', { input: absInput, output: absOutput });

  const markdownContent = await fs.readFile(absInput, 'utf-8');
  const result = await convertMarkdownToPdf(markdownContent, options);

  // Ensure output directory exists
  await fs.mkdir(path.dirname(absOutput), { recursive: true });
  await fs.writeFile(absOutput, result.pdfBuffer);

  logger.info('PDF written to disk', { output: absOutput, bytes: result.pdfBuffer.byteLength });
  return result;
}
