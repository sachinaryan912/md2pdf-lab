/**
 * CLI Entry Point
 * Uses Commander.js to expose:
 *   md2pdf convert <input> [output]   - Convert a Markdown file to PDF
 *   md2pdf watch <input>              - Watch file and auto-regenerate PDF
 *   md2pdf serve                      - Start the REST API server
 *   md2pdf game                       - Play Markdown Dungeon
 */
import { Command, Option } from 'commander';
import path from 'path';
import chokidar from 'chokidar';
import dotenv from 'dotenv';
import { convertFile, closeBrowser } from '../converter/pdfGenerator';
import { startServer } from '../api/server';
import { playMarkdownDungeon } from '../game/markdownDungeon';
import logger from '../utils/logger';

// Load .env if present
dotenv.config();

// ---------------------------------------------------------------------------
// CLI program definition
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name('md2pdf')
  .description('Convert Markdown files to beautiful PDFs')
  .version('1.0.0');

// ── Shared options (reused across sub-commands) ─────────────────────────────

const themeOption = new Option('-t, --theme <theme>', 'PDF visual theme')
  .choices(['light', 'dark', 'github'])
  .default('light');

const pageSizeOption = new Option('-s, --page-size <size>', 'PDF page size')
  .choices(['A4', 'Letter', 'Legal'])
  .default('A4');

// ---------------------------------------------------------------------------
// convert command
// ---------------------------------------------------------------------------

program
  .command('convert <input> [output]')
  .description('Convert a Markdown file to PDF')
  .addOption(themeOption)
  .addOption(pageSizeOption)
  .option('-m, --margin <mm>', 'Page margin in mm', '15')
  .option('--header-footer', 'Display page header and footer', false)
  .option('--no-toc', 'Disable table of contents')
  .option('--no-math', 'Disable MathJax math rendering')
  .option('--no-mermaid', 'Disable Mermaid diagram rendering')
  .action(
    async (
      input: string,
      outputArg: string | undefined,
      opts: {
        theme: 'light' | 'dark' | 'github';
        pageSize: 'A4' | 'Letter' | 'Legal';
        margin: string;
        headerFooter: boolean;
        toc: boolean;
        math: boolean;
        mermaid: boolean;
      }
    ) => {
      const output =
        outputArg ??
        path.join(
          path.dirname(input),
          `${path.basename(input, path.extname(input))}.pdf`
        );

      logger.info(`Converting: ${input} → ${output}`);

      try {
        const result = await convertFile(input, output, {
          theme: opts.theme,
          pageSize: opts.pageSize,
          margin: parseInt(opts.margin, 10),
          displayHeaderFooter: opts.headerFooter,
          toc: opts.toc,
          math: opts.math,
          mermaid: opts.mermaid,
        });

        logger.info(
          `✅ Done! "${result.title}" saved to ${output} (${(result.pdfBuffer.byteLength / 1024).toFixed(1)} KB)`
        );
      } catch (err) {
        logger.error('Conversion failed', { error: (err as Error).message });
        process.exit(1);
      } finally {
        await closeBrowser();
      }
    }
  );

// ---------------------------------------------------------------------------
// watch command
// ---------------------------------------------------------------------------

program
  .command('watch <input>')
  .description('Watch a Markdown file and auto-regenerate PDF on changes')
  .addOption(themeOption)
  .addOption(pageSizeOption)
  .option('-m, --margin <mm>', 'Page margin in mm', '15')
  .option('--output <output>', 'Output PDF path (default: same dir as input)')
  .action(
    async (
      input: string,
      opts: {
        theme: 'light' | 'dark' | 'github';
        pageSize: 'A4' | 'Letter' | 'Legal';
        margin: string;
        output?: string;
      }
    ) => {
      const output =
        opts.output ??
        path.join(
          path.dirname(input),
          `${path.basename(input, path.extname(input))}.pdf`
        );

      logger.info(`👀 Watching: ${input}  →  ${output}`);
      logger.info('  (Press Ctrl+C to stop)');

      // Perform an initial conversion
      const convert = async (): Promise<void> => {
        try {
          await convertFile(input, output, {
            theme: opts.theme,
            pageSize: opts.pageSize,
            margin: parseInt(opts.margin, 10),
          });
          logger.info(`🔄 Regenerated: ${output}`);
        } catch (err) {
          logger.error('Watch conversion failed', { error: (err as Error).message });
        }
      };

      await convert();

      // Watch for changes
      const watcher = chokidar.watch(input, { persistent: true, ignoreInitial: true });
      watcher.on('change', async () => {
        logger.info(`📝 Change detected in ${input}`);
        await convert();
      });

      // Clean up on exit
      process.on('SIGINT', async () => {
        logger.info('\nStopping watcher…');
        await watcher.close();
        await closeBrowser();
        process.exit(0);
      });
    }
  );

// ---------------------------------------------------------------------------
// serve command
// ---------------------------------------------------------------------------

program
  .command('serve')
  .description('Start the md2pdf REST API server')
  .option('-p, --port <port>', 'Port to listen on', '8080')
  .action((opts: { port: string }) => {
    const port = parseInt(opts.port, 10);
    startServer(port);
  });

// ---------------------------------------------------------------------------
// game command
// ---------------------------------------------------------------------------

program
  .command('game')
  .description('Play the Markdown Dungeon adventure game 🎮')
  .action(async () => {
    await playMarkdownDungeon();
  });

// ---------------------------------------------------------------------------
// Parse and run
// ---------------------------------------------------------------------------

program.parse(process.argv);
