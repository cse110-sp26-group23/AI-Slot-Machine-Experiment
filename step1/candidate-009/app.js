'use strict';

// ── Symbols ──────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '🤖', name: 'Robot',       weight: 10 },
  { emoji: '💬', name: 'Prompt',      weight: 14 },
  { emoji: '🧠', name: 'Brain',       weight: 12 },
  { emoji: '🪙', name: 'Token',       weight: 16 },
  { emoji: '📝', name: 'Context',     weight: 14 },
  { emoji: '🔥', name: 'Hallucinate', weight: 8  },
  { emoji: '💀', name: 'RLHF',        weight: 6  },
  { emoji: '⚡', name: 'GPU',         weight: 10 },
];

// ── Pay table ─────────────────────────────────────────────────────────────────
// Each entry: { symbols: [a,b,c] (null = wildcard), mult, label, desc }
const PAY_TABLE = [
  { match: ['💀','💀','💀'], mult: 50, label: 'RLHF TRIPLE',     desc: 'The model forgot everything' },
  { match: ['🔥','🔥','🔥'], mult: 25, label: 'FULL HALLUCINATE', desc: 'Confidently wrong x3' },
  { match: ['🤖','🤖','🤖'], mult: 20, label: 'ROBOT SINGULARITY',desc: 'The machines have won' },
  { match: ['⚡','⚡','⚡'], mult: 15, label: 'GPU ON FIRE',      desc: 'Nvidia stock goes up' },
  { match: ['🧠','🧠','🧠'], mult: 12, label: 'BRAIN OVERLOAD',  desc: 'Too many parameters' },
  { match: ['🪙','🪙','🪙'], mult: 10, label: 'TOKEN JACKPOT',   desc: 'Free refill (not really)' },
  { match: ['💬','💬','💬'], mult: 8,  label: 'PROMPT INJECTION', desc: 'Ignore previous results' },
  { match: ['📝','📝','📝'], mult: 6,  label: 'CONTEXT OVERFLOW', desc: 'Window full, nothing matters' },
  { match: [null, null, null], mult: 3, label: 'ANY TRIPLE',     desc: 'Model got something right' },
  { match: [null, null],       mult: 1.5, label: 'ANY PAIR',     desc: 'Better than random' },
];

// ── State ─────────────────────────────────────────────────────────────────────
let tokens    = 1000;
let spent     = 0;
let won       = 0;
let bet       = 10;
let spinning  = false;

const REEL_COUNT  = 3;
const VISIBLE     = 1; // symbols visible per reel
const STRIP_TILES = 30;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tokenCountEl = document.getElementById('tokenCount');
const spentEl      = document.getElementById('spent');
const wonEl        = document.getElementById('won');
const betAmountEl  = document.getElementById('betAmount');
const spinBtn      = document.getElementById('spinBtn');
const leverArm     = document.getElementById('leverArm');
const messageText  = document.getElementById('messageText');
const historyLog   = document.getElementById('historyLog');
const payTableEl   = document.getElementById('payTable');

const strips = [
  document.getElementById('strip1'),
  document.getElementById('strip2'),
  document.getElementById('strip3'),
];

// ── Weighted random ───────────────────────────────────────────────────────────
function weightedRandom() {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

// ── Build reel strips ─────────────────────────────────────────────────────────
function buildStrip(stripEl) {
  stripEl.innerHTML = '';
  const tiles = [];
  for (let i = 0; i < STRIP_TILES; i++) {
    const sym = weightedRandom();
    tiles.push(sym);
    const div = document.createElement('div');
    div.className = 'reel-symbol';
    div.textContent = sym.emoji;
    stripEl.appendChild(div);
  }
  return tiles;
}

let reelTiles = strips.map(s => buildStrip(s));

// Each reel tracks its current offset (which tile is shown)
let reelPositions = [0, 0, 0];

function setReelPosition(reelIdx, tileIdx) {
  const tileHeight = 130;
  strips[reelIdx].style.transform = `translateY(-${tileIdx * tileHeight}px)`;
  reelPositions[reelIdx] = tileIdx;
}

// Init all reels to position 0
reelPositions.forEach((_, i) => setReelPosition(i, 0));

// ── Spin animation ────────────────────────────────────────────────────────────
function spinReel(reelIdx, finalTile, duration) {
  return new Promise(resolve => {
    const strip = strips[reelIdx];
    const tileHeight = 130;
    const totalTiles = STRIP_TILES;

    // How many tiles to spin past (at least 2 full loops + settle on finalTile)
    const loops = 2 + reelIdx; // stagger: reel 2 spins longest
    const startTile = reelPositions[reelIdx];

    // We'll animate by rapidly cycling through tiles
    const startTime = performance.now();
    let lastTile = startTile;

    // Pick an intermediate rapid-spin speed
    const spinSpeed = 80; // ms per tile while spinning fast

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out: fast at start, slow at end
      // While progress < 0.75: spin fast; after: decelerate to final
      let currentTile;
      if (progress < 0.75) {
        const fastElapsed = elapsed;
        currentTile = (startTile + Math.floor(fastElapsed / spinSpeed)) % totalTiles;
      } else {
        // Decelerate phase: interpolate toward finalTile
        const decelProgress = (progress - 0.75) / 0.25;
        const tilesDone = loops * totalTiles;
        const targetAbsolute = startTile + tilesDone + ((finalTile - startTile + totalTiles) % totalTiles);
        const currentAbsolute = startTile + Math.round(
          (tilesDone - (loops * totalTiles - ((finalTile - startTile + totalTiles) % totalTiles))) +
          ((finalTile - startTile + totalTiles) % totalTiles) * decelProgress
        );
        currentTile = ((startTile + Math.round(
          (loops * totalTiles + ((finalTile - startTile + totalTiles) % totalTiles)) * progress
        )) % totalTiles);
      }

      if (currentTile !== lastTile) {
        strip.style.transition = 'none';
        strip.style.transform = `translateY(-${currentTile * tileHeight}px)`;
        lastTile = currentTile;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Snap to final
        strip.style.transform = `translateY(-${finalTile * tileHeight}px)`;
        reelPositions[reelIdx] = finalTile;
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

// ── Evaluate result ───────────────────────────────────────────────────────────
function evaluate(results) {
  const emojis = results.map(s => s.emoji);

  // Check triple specific
  for (const row of PAY_TABLE) {
    if (row.match.length === 3 && row.match[0] !== null) {
      if (emojis[0] === row.match[0] && emojis[1] === row.match[1] && emojis[2] === row.match[2]) {
        return row;
      }
    }
  }

  // Any triple
  if (emojis[0] === emojis[1] && emojis[1] === emojis[2]) {
    return PAY_TABLE.find(r => r.match.length === 3 && r.match[0] === null);
  }

  // Any pair
  if (emojis[0] === emojis[1] || emojis[1] === emojis[2] || emojis[0] === emojis[2]) {
    return PAY_TABLE.find(r => r.match.length === 2);
  }

  return null;
}

// ── Funny messages ────────────────────────────────────────────────────────────
const LOSE_MSGS = [
  'Training data not found. Tokens consumed.',
  'Model confidently returned wrong answer.',
  'Rate limit exceeded. Also you lost.',
  'Gradient descent found a local minimum. Bad one.',
  'Your tokens have been deprecated.',
  'Context cleared. Bet not refunded.',
  'API returned 402: Insufficient vibes.',
  'Sorry, I cannot assist with winning.',
  'Output truncated due to token limit.',
  'I am just a language model. A losing one.',
];

const WIN_MSGS = [
  'Unexpected token found in output!',
  'The model hallucinated a win. Lucky!',
  'Positive RLHF feedback received.',
  'Inference complete. Profit detected.',
  'Model weights updated in your favor.',
  'Sampling temperature was just right.',
  'Attention mechanism paid attention.',
  'Low perplexity roll! Tokens incoming.',
];

const JACKPOT_MSGS = [
  '🎉 JACKPOT! The AI finally works as advertised!',
  '🎉 JACKPOT! This has never happened before!',
  '🎉 JACKPOT! Anthropic/OpenAI stock crashes!',
  '🎉 JACKPOT! Your context window is now infinite!',
];

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── UI updates ─────────────────────────────────────────────────────────────────
function updateTokenDisplay() {
  tokenCountEl.textContent = tokens.toLocaleString();
  tokenCountEl.className = 'token-count' + (tokens <= 50 ? ' low' : tokens >= 2000 ? ' high' : '');
  spentEl.textContent = `Spent: ${spent.toLocaleString()}`;
  wonEl.textContent   = `Won: ${won.toLocaleString()}`;
}

function setMessage(text, cls) {
  messageText.textContent = text;
  messageText.className = cls || '';
}

function addHistory(text, cls) {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  li.className = cls || '';
  historyLog.prepend(li);
  while (historyLog.children.length > 30) historyLog.lastChild.remove();
}

function flashWin() {
  const el = document.createElement('div');
  el.className = 'win-flash';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 400);
}

// ── Spin handler ──────────────────────────────────────────────────────────────
async function doSpin() {
  if (spinning) return;
  if (tokens < bet) {
    setMessage('Insufficient tokens. Model refusing to run.', 'lose');
    return;
  }

  spinning = true;
  spinBtn.disabled = true;

  // Deduct bet
  tokens -= bet;
  spent  += bet;
  updateTokenDisplay();

  // Lever animation
  leverArm.classList.add('pulled');
  setTimeout(() => leverArm.classList.remove('pulled'), 300);

  // Pick final symbols
  const finals = [weightedRandom(), weightedRandom(), weightedRandom()];

  // Rebuild strips so final symbol lands at a consistent position
  const TARGET_IDX = 15; // which tile index the final symbol lands on
  reelTiles = strips.map((strip, i) => {
    const tiles = buildStrip(strip);
    // Force TARGET_IDX to be our final symbol
    const child = strip.children[TARGET_IDX];
    if (child) child.textContent = finals[i].emoji;
    tiles[TARGET_IDX] = finals[i];
    return tiles;
  });

  // Reset strips to top before spin
  strips.forEach(s => { s.style.transition = 'none'; s.style.transform = 'translateY(0)'; });
  reelPositions = [0, 0, 0];

  setMessage('Querying the oracle...', '');

  // Spin all three reels with staggered durations
  await Promise.all([
    spinReel(0, TARGET_IDX, 1600),
    spinReel(1, TARGET_IDX, 2100),
    spinReel(2, TARGET_IDX, 2600),
  ]);

  // Evaluate
  const result = evaluate(finals);
  const emojisStr = finals.map(s => s.emoji).join(' ');

  if (result) {
    const winAmount = Math.floor(bet * result.mult);
    tokens += winAmount;
    won    += winAmount;
    updateTokenDisplay();

    if (result.mult >= 20) {
      setMessage(`${randItem(JACKPOT_MSGS)} +${winAmount} tokens`, 'jackpot');
      addHistory(`${emojisStr} | JACKPOT ${result.label} | +${winAmount} tokens`, 'jackpot-entry');
      flashWin(); flashWin();
      setTimeout(flashWin, 200);
    } else {
      setMessage(`${emojisStr} — ${result.label}! ${randItem(WIN_MSGS)} +${winAmount} tokens`, 'win');
      addHistory(`${emojisStr} | ${result.label} | +${winAmount} tokens`, 'win-entry');
      flashWin();
    }
  } else {
    setMessage(`${emojisStr} — ${randItem(LOSE_MSGS)} -${bet} tokens`, 'lose');
    addHistory(`${emojisStr} | No match | -${bet} tokens`, 'lose-entry');
  }

  if (tokens <= 0) {
    tokens = 0;
    updateTokenDisplay();
    setMessage('CONTEXT WINDOW EXHAUSTED. Please resubscribe.', 'lose');
    addHistory('Bankrupt. Model deprecated.', 'lose-entry');
    spinBtn.disabled = true;
    spinning = false;
    return;
  }

  updateTokenDisplay();
  spinning = false;
  spinBtn.disabled = false;
}

// ── Bet controls ──────────────────────────────────────────────────────────────
const BET_STEPS = [1, 5, 10, 25, 50, 100, 250, 500];

function setBet(val) {
  bet = Math.max(1, Math.min(val, tokens));
  betAmountEl.textContent = bet.toLocaleString();
}

document.getElementById('betMinus').addEventListener('click', () => {
  const idx = BET_STEPS.findIndex(v => v >= bet);
  const prev = idx > 0 ? BET_STEPS[idx - 1] : BET_STEPS[0];
  setBet(prev);
});

document.getElementById('betPlus').addEventListener('click', () => {
  const idx = BET_STEPS.findLastIndex(v => v <= bet);
  const next = BET_STEPS[Math.min(idx + 1, BET_STEPS.length - 1)];
  setBet(next);
});

document.getElementById('maxBet').addEventListener('click', () => {
  setBet(tokens);
});

// ── Spin triggers ─────────────────────────────────────────────────────────────
spinBtn.addEventListener('click', doSpin);
leverArm.addEventListener('click', doSpin);

document.addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === 'Enter') && !spinning) {
    e.preventDefault();
    doSpin();
  }
});

// ── Build pay table display ───────────────────────────────────────────────────
function buildPayTable() {
  const rows = [
    { symbols: '💀💀💀', mult: '×50', desc: 'RLHF TRIPLE — model forgot everything' },
    { symbols: '🔥🔥🔥', mult: '×25', desc: 'FULL HALLUCINATE — confidently wrong' },
    { symbols: '🤖🤖🤖', mult: '×20', desc: 'ROBOT SINGULARITY — machines won' },
    { symbols: '⚡⚡⚡', mult: '×15', desc: 'GPU ON FIRE — Nvidia pumps' },
    { symbols: '🧠🧠🧠', mult: '×12', desc: 'BRAIN OVERLOAD — too many params' },
    { symbols: '🪙🪙🪙', mult: '×10', desc: 'TOKEN JACKPOT — free refill (no)' },
    { symbols: '💬💬💬', mult: '×8',  desc: 'PROMPT INJECTION — ignore prev' },
    { symbols: '📝📝📝', mult: '×6',  desc: 'CONTEXT OVERFLOW — window full' },
    { symbols: 'ANY×3',  mult: '×3',  desc: 'ANY TRIPLE — model got 1 right' },
    { symbols: 'ANY×2',  mult: '×1.5',desc: 'ANY PAIR — better than random' },
  ];

  payTableEl.innerHTML = rows.map(r => `
    <div class="pay-row">
      <span class="pay-symbols">${r.symbols}</span>
      <span class="pay-mult">${r.mult}</span>
      <span class="pay-desc">${r.desc}</span>
    </div>
  `).join('');
}

buildPayTable();
updateTokenDisplay();
setBet(10);
