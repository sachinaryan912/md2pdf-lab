/* ═══════════════════════════════════════════════════════════
   md2pdf-lab — Frontend App Logic
═══════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────
const state = {
  theme: 'light',       // PDF theme
  pageSize: 'A4',
  uiTheme: 'dark',      // UI dark/light
};

// ──────────────────────────────────────────────────────────
// MARKED SETUP
// ──────────────────────────────────────────────────────────
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

// ──────────────────────────────────────────────────────────
// TAB NAVIGATION
// ──────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`).classList.add('active');
}

// ──────────────────────────────────────────────────────────
// UI THEME TOGGLE (dark ↔ light)
// ──────────────────────────────────────────────────────────
function toggleTheme() {
  state.uiTheme = state.uiTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.uiTheme === 'light' ? 'light' : '');
  document.getElementById('theme-toggle').textContent = state.uiTheme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('ui-theme', state.uiTheme);
}

function initTheme() {
  const saved = localStorage.getItem('ui-theme') || 'dark';
  state.uiTheme = saved;
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('theme-toggle').textContent = '☀️';
  }
}

// ──────────────────────────────────────────────────────────
// PDF OPTIONS
// ──────────────────────────────────────────────────────────
function setOption(key, btn) {
  state[key] = btn.dataset.value;
  const parent = btn.closest('.segmented');
  parent.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ──────────────────────────────────────────────────────────
// LIVE PREVIEW
// ──────────────────────────────────────────────────────────
let previewDebounce;
function updatePreview() {
  clearTimeout(previewDebounce);
  previewDebounce = setTimeout(() => {
    const md = document.getElementById('md-editor').value;
    const preview = document.getElementById('preview-content');
    const empty = document.getElementById('preview-empty');
    const charCount = document.getElementById('char-count');
    const wordCount = document.getElementById('word-count');

    // Stats
    charCount.textContent = md.length.toLocaleString() + ' chars';
    const words = md.trim() ? md.trim().split(/\s+/).length : 0;
    wordCount.textContent = words.toLocaleString() + ' words';

    if (!md.trim()) {
      preview.style.display = 'none';
      empty.style.display = 'flex';
      return;
    }
    preview.style.display = 'block';
    empty.style.display = 'none';

    try {
      preview.innerHTML = marked.parse(md);
      // Re-run hljs on newly injected code blocks
      preview.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    } catch (e) {
      preview.innerHTML = `<p style="color:var(--red)">Parse error: ${e.message}</p>`;
    }
  }, 120);
}

// ──────────────────────────────────────────────────────────
// EDITOR HELPERS
// ──────────────────────────────────────────────────────────
function loadSample() {
  const sample = `# md2pdf-lab Sample Document

[[toc]]

---

## Introduction

Welcome to **md2pdf-lab** — the fastest way to convert *Markdown* to beautiful PDFs!

> 💡 Try editing this document and clicking **Download PDF**.

---

## Features

| Feature        | Status  |
|----------------|---------|
| Light Theme    | ✅       |
| Dark Theme     | ✅       |
| Tables         | ✅       |
| Code Blocks    | ✅       |
| Math (MathJax) | ✅       |

---

## Code Example

\`\`\`typescript
async function convertToPdf(markdown: string): Promise<Buffer> {
  const { pdfBuffer } = await convertMarkdownToPdf(markdown, {
    theme: 'dark',
    pageSize: 'A4',
  });
  return pdfBuffer;
}
\`\`\`

---

## Math

Einstein's formula: $E = mc^2$

$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

---

## Lists

1. Install dependencies: \`npm install\`
2. Build: \`npm run build\`
3. Convert: \`md2pdf convert README.md\`

- Nested item
  - Sub-item
  - Another sub-item
`;
  document.getElementById('md-editor').value = sample;
  updatePreview();
  showToast('Sample loaded!', 'success');
}

function clearEditor() {
  if (!document.getElementById('md-editor').value) return;
  document.getElementById('md-editor').value = '';
  updatePreview();
}

function openFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('md-editor').value = e.target.result;
    updatePreview();
    showToast(`Opened: ${file.name}`, 'success');
  };
  reader.readAsText(file);
  event.target.value = '';
}

function openFullPreview() {
  const md = document.getElementById('md-editor').value;
  if (!md.trim()) { showToast('Nothing to preview', 'error'); return; }
  const encoded = encodeURIComponent(md);
  const theme = state.theme;
  window.open(`/preview?md=${encoded}&theme=${theme}`, '_blank');
}

// ──────────────────────────────────────────────────────────
// PDF CONVERSION
// ──────────────────────────────────────────────────────────
async function convertToPdf() {
  const md = document.getElementById('md-editor').value;
  if (!md.trim()) { showToast('Please write some Markdown first', 'error'); return; }

  const btn = document.getElementById('convert-btn');
  const txt = document.getElementById('convert-text');
  const spin = document.getElementById('convert-spinner');

  btn.disabled = true;
  txt.textContent = 'Generating…';
  spin.classList.remove('hidden');

  try {
    const body = {
      markdown: md,
      theme: state.theme,
      pageSize: state.pageSize,
      margin: parseInt(document.getElementById('margin-input').value),
      toc: document.getElementById('opt-toc').checked,
      math: document.getElementById('opt-math').checked,
      displayHeaderFooter: document.getElementById('opt-hf').checked,
    };

    const res = await fetch('/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Extract filename from header or generate from first h1
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="(.+?)"/);
    a.download = match ? match[1] : 'document.pdf';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ PDF downloaded!', 'success');
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    txt.textContent = '⬇ Download PDF';
    spin.classList.add('hidden');
  }
}

// ──────────────────────────────────────────────────────────
// TOAST NOTIFICATION
// ──────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast${type ? ' ' + type : ''}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.add('hidden'), 3200);
}

// ──────────────────────────────────────────────────────────
// PANE RESIZE (drag divider)
// ──────────────────────────────────────────────────────────
function initResizer() {
  const divider = document.getElementById('divider');
  const layout = document.getElementById('editor-layout');
  if (!divider || !layout) return;

  let dragging = false;
  divider.addEventListener('mousedown', () => { dragging = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = layout.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    if (pct < 20 || pct > 80) return;
    const panes = layout.querySelectorAll('.pane');
    panes[0].style.flex = `0 0 ${pct}%`;
    panes[1].style.flex = `0 0 ${100 - pct}%`;
  });
  document.addEventListener('mouseup', () => { dragging = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; });
}

// ──────────────────────────────────────────────────────────
// API TAB — Try it live
// ──────────────────────────────────────────────────────────
async function tryHealth() {
  const el = document.getElementById('health-result');
  el.classList.remove('hidden');
  el.textContent = 'Loading…';
  try {
    const res = await fetch('/health');
    const data = await res.json();
    el.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    el.textContent = `Error: ${e.message}`;
    el.style.color = 'var(--red)';
  }
}

function openPreviewDemo() {
  const demo = '# Hello from md2pdf-lab!\n\nThis is a **live HTML preview** rendered on the server.\n\n## Features\n- Syntax highlighting\n- Tables\n- Math: $E = mc^2$';
  window.open(`/preview?md=${encodeURIComponent(demo)}&theme=dark`, '_blank');
}

// ──────────────────────────────────────────────────────────
// MARKDOWN DUNGEON GAME
// ──────────────────────────────────────────────────────────
const ROOMS = [
  {
    id: 1,
    title: '🏰 The Broken Heading',
    desc: 'A crumbling door stands before you. The inscription is wrong — a heading without a space!',
    broken: '#Title of the Dungeon',
    solutions: ['# Title of the Dungeon'],
    hint: 'In Markdown, headings need a space after the # character.',
    victory: '✅ The door swings open! The heading gleams correctly.',
  },
  {
    id: 2,
    title: '🗝️ The Unordered List Trap',
    desc: 'A chest is locked by a cursed list. One item is wrong — fix it!',
    broken: '* Sword\n*Shield\n* Potion',
    solutions: ['* Sword\n* Shield\n* Potion', '- Sword\n- Shield\n- Potion'],
    hint: 'Every list item (* or -) needs a space before its text.',
    victory: '✅ The chest bursts open! Gold coins spill out.',
  },
  {
    id: 3,
    title: '📜 The Fenced Code Block',
    desc: 'A wizard left a spell but forgot the language in the code fence!',
    broken: '```\nconst spell = "fireball";\n```',
    solutions: ['```js\nconst spell = "fireball";\n```', '```javascript\nconst spell = "fireball";\n```'],
    hint: 'Code fences should specify a language: ```js or ```javascript.',
    victory: '✅ Fireball cast! The wall crumbles before you.',
  },
  {
    id: 4,
    title: '⚔️ The Broken Link',
    desc: 'The map shows a secret passage, but the hyperlink is empty!',
    broken: '[Secret Passage]()',
    solutions: ['[Secret Passage](#secret-passage)', '[Secret Passage](https://example.com/secret)'],
    hint: 'A Markdown link needs a non-empty URL inside the parentheses ().',
    victory: '✅ The passage appears! You step through the shimmering portal.',
  },
  {
    id: 5,
    title: '🐉 The Dragon Boss',
    desc: 'The dragon speaks only in bold! Fix the broken bold text to send it to sleep.',
    broken: '**Wake up brave hero!*',
    solutions: ['**Wake up brave hero!**', '__Wake up brave hero!__'],
    hint: 'Bold text uses **two** asterisks on BOTH sides.',
    victory: '✅ The dragon yawns and falls asleep. You WIN! 🎉',
  },
];

const game = {
  playerName: '',
  currentRoom: 0,
  score: 0,
  attempts: 0,
  maxAttempts: 3,
  results: [],   // true/false per room
  hintUsed: false,
};

function startGame() {
  const name = document.getElementById('game-player-name').value.trim();
  if (!name) { document.getElementById('game-player-name').focus(); return; }
  game.playerName = name;
  game.currentRoom = 0;
  game.score = 0;
  game.results = [];
  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-total').textContent = ROOMS.length;

  document.getElementById('game-start').classList.add('hidden');
  document.getElementById('game-end').classList.add('hidden');
  document.getElementById('game-room').classList.remove('hidden');

  loadRoom(0);
}

function loadRoom(idx) {
  const room = ROOMS[idx];
  game.attempts = 0;
  game.hintUsed = false;

  document.getElementById('room-badge').textContent = `Room ${room.id} / ${ROOMS.length}`;
  document.getElementById('room-title').textContent = room.title;
  document.getElementById('room-desc').textContent = room.desc;
  document.getElementById('broken-code').textContent = room.broken;
  document.getElementById('answer-input').value = '';
  document.getElementById('answer-input').focus();
  document.getElementById('attempts-left').textContent = `${game.maxAttempts} attempts left`;
  document.getElementById('hint-box').classList.add('hidden');
  document.getElementById('room-feedback').classList.add('hidden');

  // Progress bar
  const pct = (idx / ROOMS.length) * 100;
  document.getElementById('game-progress').style.width = pct + '%';
}

function normalizeAnswer(s) {
  return s.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function submitAnswer() {
  const room = ROOMS[game.currentRoom];
  const answer = document.getElementById('answer-input').value;
  const normalized = normalizeAnswer(answer);
  const correct = room.solutions.some(sol => normalizeAnswer(sol) === normalized);
  game.attempts++;

  const feedback = document.getElementById('room-feedback');
  feedback.classList.remove('hidden', 'correct', 'wrong');

  if (correct) {
    game.score++;
    game.results.push(true);
    document.getElementById('game-score').textContent = game.score;
    feedback.classList.add('correct');
    feedback.textContent = room.victory;

    setTimeout(() => {
      if (game.currentRoom + 1 < ROOMS.length) {
        game.currentRoom++;
        loadRoom(game.currentRoom);
      } else {
        showEndScreen();
      }
    }, 1800);
  } else {
    const remaining = game.maxAttempts - game.attempts;
    feedback.classList.add('wrong');
    if (remaining > 0) {
      feedback.textContent = `❌ Not quite! ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`;
      document.getElementById('attempts-left').textContent = `${remaining} attempts left`;
    } else {
      game.results.push(false);
      feedback.textContent = `❌ Out of attempts. Correct answer: ${room.solutions[0]}`;
      setTimeout(() => {
        if (game.currentRoom + 1 < ROOMS.length) {
          game.currentRoom++;
          loadRoom(game.currentRoom);
        } else {
          showEndScreen();
        }
      }, 2500);
    }
  }
}

function showHint() {
  const room = ROOMS[game.currentRoom];
  const hintBox = document.getElementById('hint-box');
  hintBox.textContent = `💡 ${room.hint}`;
  hintBox.classList.remove('hidden');
}

function showEndScreen() {
  document.getElementById('game-room').classList.add('hidden');
  document.getElementById('game-end').classList.remove('hidden');
  document.getElementById('game-progress').style.width = '100%';

  const score = game.score;
  const total = ROOMS.length;
  document.getElementById('final-score-num').textContent = score;

  let emoji, title, sub;
  if (score === total) {
    emoji = '🏆'; title = `Perfect Score, ${game.playerName}!`; sub = 'You are a true Markdown master!';
  } else if (score >= Math.ceil(total / 2)) {
    emoji = '⚔️'; title = `Well done, ${game.playerName}!`; sub = 'Keep practising your Markdown fu.';
  } else {
    emoji = '💀'; title = `Better luck next time, ${game.playerName}`; sub = 'The dungeon defeated you this time...';
  }
  document.getElementById('end-emoji').textContent = emoji;
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-sub').textContent = sub;

  const breakdown = document.getElementById('score-breakdown');
  breakdown.innerHTML = game.results.map((pass, i) =>
    `<div class="score-dot ${pass ? 'pass' : 'fail'}" title="Room ${i + 1}: ${pass ? '✓' : '✗'}">${pass ? '✅' : '❌'}</div>`
  ).join('');
}

function resetGame() {
  document.getElementById('game-end').classList.add('hidden');
  document.getElementById('game-start').classList.remove('hidden');
  document.getElementById('game-player-name').value = '';
  document.getElementById('game-progress').style.width = '0%';
  document.getElementById('game-score').textContent = '0';
}

// Allow Enter key to submit in game
document.addEventListener('keydown', e => {
  const gameRoom = document.getElementById('game-room');
  if (!gameRoom.classList.contains('hidden') && e.key === 'Enter' && e.ctrlKey) {
    submitAnswer();
  }
});

// ──────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initResizer();
  updatePreview(); // in case there's pre-loaded content
});
