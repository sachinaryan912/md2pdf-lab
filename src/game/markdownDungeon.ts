/**
 * Markdown Dungeon – A tiny terminal adventure game
 *
 * You are trapped in a dungeon made of broken Markdown.
 * Fix each room's Markdown challenge to escape!
 *
 * Uses Inquirer.js v8 for interactive prompts.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const inquirer = require('inquirer') as typeof import('inquirer');
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Room {
  id: number;
  title: string;
  description: string;
  /** The broken Markdown the user must fix */
  broken: string;
  /** All accepted correct answers (trimmed & compared) */
  solutions: string[];
  /** Hint shown after a wrong answer */
  hint: string;
  /** Lore / flavor text after solving */
  victoryMsg: string;
}

// ---------------------------------------------------------------------------
// Dungeon rooms
// ---------------------------------------------------------------------------

const ROOMS: Room[] = [
  {
    id: 1,
    title: '🏰 Room 1: The Broken Heading',
    description:
      'A crumbling door stands before you. The inscription above it is wrong — a heading without a space!',
    broken: '#Title of the Dungeon',
    solutions: ['# Title of the Dungeon'],
    hint: 'In Markdown, headings need a space after the `#` character.',
    victoryMsg: '✅ The door swings open! The heading gleams correctly.',
  },
  {
    id: 2,
    title: '🗝️ Room 2: The Unordered List Trap',
    description: 'A chest is locked by a cursed list. Two items are wrong — fix them all!',
    broken: '* Sword\n*Shield\n* Potion',
    solutions: ['* Sword\n* Shield\n* Potion', '- Sword\n- Shield\n- Potion'],
    hint: 'Every list item (`*` or `-`) needs a space before its text.',
    victoryMsg: '✅ The chest bursts open! Gold coins spill out.',
  },
  {
    id: 3,
    title: '📜 Room 3: The Fenced Code Block',
    description:
      'A wizard left a spell but forgot the code fence syntax. Fix it to cast the spell!',
    broken: '```\nconst spell = "fireball";\n```',
    solutions: [
      '```js\nconst spell = "fireball";\n```',
      '```javascript\nconst spell = "fireball";\n```',
    ],
    hint: 'Code fences should specify a language like ```js or ```javascript.',
    victoryMsg: '✅ Fireball cast! The wall crumbles before you.',
  },
  {
    id: 4,
    title: '⚔️ Room 4: The Broken Link',
    description: 'The map shows a secret passage, but the hyperlink is broken!',
    broken: '[Secret Passage]()',
    solutions: [
      '[Secret Passage](#secret-passage)',
      '[Secret Passage](https://example.com/secret)',
    ],
    hint: 'A Markdown link needs a non-empty URL inside the parentheses `()`.',
    victoryMsg: '✅ The passage appears! You step through the shimmering portal.',
  },
  {
    id: 5,
    title: '🐉 Room 5: The Dragon Boss',
    description:
      'The dragon speaks only in bold! Fix the broken bold text to send it back to sleep.',
    broken: '**Wake up brave hero!*',
    solutions: ['**Wake up brave hero!**', '__Wake up brave hero!__'],
    hint: 'Bold text uses **two** asterisks (or underscores) on BOTH sides.',
    victoryMsg: '✅ The dragon yawns and curls back to sleep. You WIN! 🎉',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
};

function print(text: string): void {
  // eslint-disable-next-line no-console
  console.log(text);
}

function banner(): void {
  print(`
${C.magenta}${C.bold}╔══════════════════════════════════════════════════════════╗
║            ⚔️  MARKDOWN DUNGEON  ⚔️                       ║
║      A dungeon crawl through broken Markdown!            ║
╚══════════════════════════════════════════════════════════╝${C.reset}
`);
}

function normalizeAnswer(s: string): string {
  return s.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function checkAnswer(userAnswer: string, room: Room): boolean {
  const normalized = normalizeAnswer(userAnswer);
  return room.solutions.some((sol) => normalizeAnswer(sol) === normalized);
}

// ---------------------------------------------------------------------------
// Main game loop
// ---------------------------------------------------------------------------

export async function playMarkdownDungeon(): Promise<void> {
  banner();

  const { playerName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'playerName',
      message: `${C.cyan}What is your name, adventurer?${C.reset}`,
      validate: (v: unknown) => (typeof v === 'string' && v.trim().length > 0) || 'Please enter your name',
    },
  ]);

  print(
    `\n${C.bold}Welcome, ${C.yellow}${String(playerName)}${C.reset}${C.bold}! ` +
      `You must fix the broken Markdown to escape each room.${C.reset}\n`
  );
  print(`${C.dim}Tip: Type the corrected Markdown carefully.${C.reset}\n`);

  let score = 0;

  for (const room of ROOMS) {
    print(`\n${C.cyan}${C.bold}${room.title}${C.reset}`);
    print(`${room.description}\n`);
    print(`${C.yellow}BROKEN MARKDOWN:${C.reset}`);
    print(`${C.dim}────────────────────────────────────${C.reset}`);
    print(room.broken);
    print(`${C.dim}────────────────────────────────────${C.reset}\n`);

    let solved = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!solved && attempts < maxAttempts) {
      const { answer } = await inquirer.prompt([
        {
          type: 'input',
          name: 'answer',
          message: `${C.green}Your fix (Room ${room.id}):${C.reset}`,
          default: room.broken,
        },
      ]);

      attempts++;

      if (checkAnswer(String(answer), room)) {
        solved = true;
        score++;
        print(`\n${C.green}${room.victoryMsg}${C.reset}\n`);
      } else {
        const remaining = maxAttempts - attempts;
        if (remaining > 0) {
          print(`\n${C.red}❌ Not quite! Hint: ${room.hint}${C.reset}`);
          print(`${C.dim}Attempts remaining: ${remaining}${C.reset}\n`);
        } else {
          print(
            `\n${C.red}❌ Out of attempts! A correct answer was:\n` +
              `${C.dim}${room.solutions[0]}${C.reset}\n`
          );
        }
      }
    }
  }

  // ── Final score ─────────────────────────────────────────────────────────
  print(`\n${C.magenta}${C.bold}═══════════════════════════════════════${C.reset}`);
  print(`${C.bold}🏆 Game Over, ${String(playerName)}!${C.reset}`);
  print(`   Score: ${C.yellow}${score}${C.reset} / ${ROOMS.length}`);

  if (score === ROOMS.length) {
    print(`\n${C.green}🎉 PERFECT SCORE! You are a true Markdown master!${C.reset}`);
  } else if (score >= Math.ceil(ROOMS.length / 2)) {
    print(`\n${C.cyan}👍 Good job! Keep practising your Markdown skills.${C.reset}`);
  } else {
    print(`\n${C.red}💪 Keep at it — Markdown mastery takes practice!${C.reset}`);
  }
  print(`${C.magenta}${C.bold}═══════════════════════════════════════${C.reset}\n`);

  logger.debug('Game completed', { player: playerName, score, total: ROOMS.length });
}
