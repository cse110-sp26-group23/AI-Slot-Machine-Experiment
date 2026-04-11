'use strict';

// ── Symbols ──────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '🧠', name: 'AGI',           weight: 1  },
  { emoji: '⚡', name: 'GPU',           weight: 3  },
  { emoji: '💰', name: 'VC Bag',        weight: 4  },
  { emoji: '🔥', name: 'Hot Take',      weight: 5  },
  { emoji: '📜', name: 'Training Data', weight: 6  },
  { emoji: '🤖', name: 'Robot',         weight: 7  },
  { emoji: '😵', name: 'Hallucination', weight: 9  },
  { emoji: '🐛', name: 'Bug',           weight: 10 },
  { emoji: '💸', name: 'Token Burn',    weight: 12 },
  { emoji: '📉', name: 'Valuation',     weight: 12 },
  { emoji: '🌡️', name: 'Heatmap',      weight: 11 },
  { emoji: '🦙', name: 'Llama',         weight: 8  },
];

// Build weighted pool
const POOL = [];
SYMBOLS.forEach(s => { for (let i = 0; i < s.weight; i++) POOL.push(s); });

// ── Payout table (multipliers for 3-of-a-kind) ────────────────────────────
const PAYOUTS = {
  '🧠': 100, '⚡': 50, '💰': 25, '🔥': 20,
  '📜': 15,  '🤖': 12, '😵': 8,  '🐛': 5,
  '💸': 3,   '📉': 3,  '🌡️': 4,  '🦙': 6,
};

// ── Quips ─────────────────────────────────────────────────────────────────
const WIN_QUIPS = [
  "Congratulations! Your tokens were definitely not hallucinated.",
  "You won! The model is 95% confident this is real money.",
  "Token acquired. Context window expanding...",
  "Winner! The AI predicted this outcome with 0.3% confidence.",
  "Tokens dispensed. Please cite your sources.",
  "You beat the machine! (It let you win to avoid liability.)",
  "Profit! We'll add this to the training data.",
  "Nice spin! Tokens transferred at 0.00001 tokens/second.",
];

const LOSE_QUIPS = [
  "Sorry, your tokens have been deprecated.",
  "Loss detected. Running post-mortem on your financial decisions.",
  "No match. The model confidently predicted you'd lose.",
  "Tokens burned for compute. At least it's warm.",
  "RLHF says: humans prefer losing. Duly noted.",
  "Your tokens have been vectorized into embeddings.",
  "404: Winning Not Found. Have you tried hallucinating harder?",
  "Loss is just winning with extra steps. (It's not.)",
  "Your tokens left to pursue better alignment elsewhere.",
  "Deprecated. Just like your startup idea.",
  "No match. The attention mechanism wasn't paying attention.",
  "Tokens evaporated. This is called 'regularization'.",
];

const JACKPOT_QUIPS = [
  "🧠🧠🧠 AGI ACHIEVED! (For the 47th time this year.)",
  "THREE BRAINS! We're calling it AGI in our press release.",
  "JACKPOT! You've won enough tokens to train a 7B model. Almost.",
];

const BROKE_QUIPS = [
  "Bankrupt. Just like your LLM startup.",
  "Out of tokens. The irony is palpable.",
  "Insufficient tokens. Have you considered a Series A?",
];

// ── State ─────────────────────────────────────────────────────────────────
let tokens    = 1000;
let bet       = 10;
let spinning  = false;

const MAX_BET  = 100;
const MIN_BET  = 5;
const BET_STEP = 5;
const REEL_COUNT = 3;
const VISIBLE_SYMBOLS = 1; // center line
const STRIP_LENGTH = 30;   // symbols in each virtual reel strip

// ── DOM refs ──────────────────────────────────────────────────────────────
const tokenCountEl = document.getElementById('tokenCount');
const betAmountEl  = document.getElementById('betAmount');
const lastWinEl    = document.getElementById('lastWin');
const spinBtn      = document.getElementById('spinBtn');
const spinCostEl   = document.getElementById('spinCost');
const maxBetBtn    = document.getElementById('maxBet');
const betDownBtn   = document.getElementById('betDown');
const betUpBtn     = document.getElementById('betUp');
const messageBox   = document.getElementById('messageBox');
const messageText  = document.getElementById('messageText');
const tracks       = [
  document.getElementById('track0'),
  document.getElementById('track1'),
  document.getElementById('track2'),
];

// ── Build reel strips ─────────────────────────────────────────────────────
function randomSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

function buildStrip(trackEl) {
  trackEl.innerHTML = '';
  const strip = [];
  for (let i = 0; i < STRIP_LENGTH; i++) {
    const s = randomSymbol();
    strip.push(s);
    const div = document.createElement('div');
    div.className = 'symbol';
    div.textContent = s.emoji;
    trackEl.appendChild(div);
  }
  return strip;
}

// strips[reel] = array of symbol objects
const strips = tracks.map(t => buildStrip(t));

// Current top index for each reel (which symbol is showing)
const currentIndex = [0, 0, 0];

function showSymbol(reelIdx, symIdx) {
  const idx = ((symIdx % STRIP_LENGTH) + STRIP_LENGTH) % STRIP_LENGTH;
  const offset = -idx * 120; // 120px per symbol
  tracks[reelIdx].style.transform = `translateY(${offset}px)`;
  currentIndex[reelIdx] = idx;
}

// Init each reel to a random position
for (let r = 0; r < REEL_COUNT; r++) {
  const start = Math.floor(Math.random() * STRIP_LENGTH);
  showSymbol(r, start);
}

// ── Spin logic ────────────────────────────────────────────────────────────
function pickResult() {
  // Each reel independently picks a random symbol
  return [randomSymbol(), randomSymbol(), randomSymbol()];
}

function spinReel(reelIdx, targetSymIdx, duration, onDone) {
  const track = tracks[reelIdx];
  const SYMBOL_HEIGHT = 120;
  const total = STRIP_LENGTH;

  let current = currentIndex[reelIdx];
  const spinSteps = Math.floor(duration / 60) + 5 + reelIdx * 8; // stagger
  let steps = 0;
  let frameTime = 40; // ms per step (speed)

  function step() {
    if (steps < spinSteps - 5) {
      // Fast spin
      current = (current + 1) % total;
      track.style.transition = 'transform 0.06s linear';
      track.style.transform = `translateY(${-current * SYMBOL_HEIGHT}px)`;
      steps++;
      setTimeout(step, frameTime);
    } else if (steps < spinSteps) {
      // Slow down
      current = (current + 1) % total;
      const slowT = 0.12 + (steps - (spinSteps - 5)) * 0.04;
      track.style.transition = `transform ${slowT}s linear`;
      track.style.transform = `translateY(${-current * SYMBOL_HEIGHT}px)`;
      steps++;
      setTimeout(step, frameTime * (1 + (steps - (spinSteps - 5)) * 0.8));
    } else {
      // Snap to target
      // We need to place the target symbol at index targetSymIdx into the strip
      // Replace the current position's symbol with the target
      const symbols = track.querySelectorAll('.symbol');
      symbols[current].textContent = targetSymIdx.emoji;
      strips[reelIdx][current] = targetSymIdx;
      track.style.transition = 'transform 0.15s ease-out';
      track.style.transform = `translateY(${-current * SYMBOL_HEIGHT}px)`;
      currentIndex[reelIdx] = current;
      setTimeout(onDone, 180);
    }
  }
  step();
}

function spin() {
  if (spinning) return;
  if (tokens < bet) {
    showMessage('lose', pick(BROKE_QUIPS));
    document.querySelector('.casino-wrapper').classList.add('broke');
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  tokens -= bet;
  updateDisplay();

  const results = pickResult();

  const SPIN_BASE = 600;
  let done = 0;

  for (let r = 0; r < REEL_COUNT; r++) {
    const delay = r * 200;
    setTimeout(() => {
      spinReel(r, results[r], SPIN_BASE + r * 300, () => {
        done++;
        if (done === REEL_COUNT) finishSpin(results);
      });
    }, delay);
  }
}

function finishSpin(results) {
  const [a, b, c] = results;
  let winAmount = 0;
  let msgClass  = 'lose';

  if (a.emoji === b.emoji && b.emoji === c.emoji) {
    const mult = PAYOUTS[a.emoji] ?? 5;
    winAmount = bet * mult;
    if (a.emoji === '🧠') {
      msgClass = 'jackpot';
      showMessage('jackpot', pick(JACKPOT_QUIPS) + ` +${winAmount} tokens!`);
      spawnCoins(20);
    } else {
      msgClass = 'win';
      showMessage('win', `${a.emoji} THREE OF A KIND! ${pick(WIN_QUIPS)} +${winAmount} tokens!`);
      spawnCoins(8);
    }
    flashScreen();
  } else {
    showMessage('lose', pick(LOSE_QUIPS));
  }

  tokens += winAmount;
  lastWinEl.textContent = winAmount;
  updateDisplay();

  spinning = false;
  spinBtn.disabled = false;

  if (tokens <= 0) {
    tokens = 0;
    updateDisplay();
    showMessage('lose', pick(BROKE_QUIPS));
    setTimeout(() => {
      if (confirm('You are out of tokens.\n\nThis is your moment to reflect on the AI hype cycle.\n\nReset to 1000 tokens?')) {
        tokens = 1000;
        document.querySelector('.casino-wrapper').classList.remove('broke');
        updateDisplay();
        showMessage('', 'Tokens replenished. The bubble inflates anew...');
      }
    }, 400);
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────
function updateDisplay() {
  tokenCountEl.textContent = tokens;
  betAmountEl.textContent  = bet;
  spinCostEl.textContent   = `(-${bet} tokens)`;
}

function showMessage(cls, text) {
  messageBox.className = 'message-box' + (cls ? ` ${cls}` : '');
  messageText.textContent = text;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function flashScreen() {
  const el = document.createElement('div');
  el.className = 'win-flash';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 500);
}

function spawnCoins(n) {
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'coin-pop';
      el.textContent = ['💰','🪙','⭐','✨','💎'][Math.floor(Math.random() * 5)];
      el.style.left  = `${20 + Math.random() * 60}vw`;
      el.style.top   = `${30 + Math.random() * 40}vh`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1100);
    }, i * 60);
  }
}

// ── Bet controls ──────────────────────────────────────────────────────────
betDownBtn.addEventListener('click', () => {
  bet = Math.max(MIN_BET, bet - BET_STEP);
  updateDisplay();
});
betUpBtn.addEventListener('click', () => {
  bet = Math.min(MAX_BET, Math.min(tokens, bet + BET_STEP));
  updateDisplay();
});
maxBetBtn.addEventListener('click', () => {
  bet = Math.min(MAX_BET, tokens);
  // Round down to nearest BET_STEP
  bet = Math.max(MIN_BET, Math.floor(bet / BET_STEP) * BET_STEP);
  updateDisplay();
});
spinBtn.addEventListener('click', spin);

// Keyboard shortcut
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    spin();
  }
});

updateDisplay();
