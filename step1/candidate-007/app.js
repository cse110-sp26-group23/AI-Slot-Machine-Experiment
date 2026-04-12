/* =====================================================
   TOKEN CASINO — AI Slot Machine
   ===================================================== */

const SYMBOLS = [
  { emoji: '🤖', label: 'Robot',    weight: 1  },  // rarest — jackpot
  { emoji: '💰', label: 'Bag',      weight: 2  },
  { emoji: '📊', label: 'Chart',    weight: 3  },
  { emoji: '🧠', label: 'Brain',    weight: 4  },
  { emoji: '⚡', label: 'Bolt',     weight: 6  },
  { emoji: '🔥', label: 'Fire',     weight: 8  },
  { emoji: '💾', label: 'Disk',     weight: 10 },
  { emoji: '📉', label: 'Crash',    weight: 12 },  // loss flavour
  { emoji: '🫥', label: 'Hallucin', weight: 12 },
  { emoji: '💸', label: 'Money fly',weight: 14 },
];

// multipliers for 3-of-a-kind (indexed by SYMBOLS order)
const TRIPLE_MULT = [50, 25, 20, 15, 10, 8, 5, 2, 2, 2];

const AI_QUOTES = [
  '"I\'m not gambling, I\'m running a stochastic optimization on reward signals."',
  '"This is fine. The loss function will converge."',
  '"I predicted that outcome with 3% confidence. That counts."',
  '"Technically I haven\'t lost tokens — I\'ve performed negative inference."',
  '"My training data included every casino strategy book ever written. Irrelevant."',
  '"I am reasoning step-by-step about why I keep losing."',
  '"Please rate this spin: 👍 / 👎"',
  '"As an AI, I don\'t have feelings about losing 90 tokens. (I have feelings about losing 90 tokens.)"',
  '"Context window: 128k. Tokens remaining in wallet: 3."',
  '"Prompt: \'Win the jackpot.\' Response: working on it..."',
  '"I hallucinated a winning combination. It felt very real."',
  '"The casino is aligned with my values: maximizing engagement."',
  '"Emergent gambling capability detected in layer 47."',
];

// -------------------------------------------------------
// State
// -------------------------------------------------------
let tokens       = 100;
let bet          = 10;
let tokensSpent  = 0;
let winStreak    = 0;
let spinning     = false;
let quoteIdx     = 0;

// DOM refs
const tokenCountEl  = document.getElementById('token-count');
const tokensSpentEl = document.getElementById('tokens-spent');
const winStreakEl   = document.getElementById('win-streak');
const betAmountEl   = document.getElementById('bet-amount');
const spinBtn       = document.getElementById('spin-btn');
const resultMsg     = document.getElementById('result-message');
const aiQuoteEl     = document.getElementById('ai-quote');
const winOverlay    = document.getElementById('win-overlay');
const winTitle      = document.getElementById('win-title');
const winAmount     = document.getElementById('win-amount');
const winSubtitle   = document.getElementById('win-subtitle');

// -------------------------------------------------------
// Weighted random symbol picker
// -------------------------------------------------------
function totalWeight() { return SYMBOLS.reduce((s, sym) => s + sym.weight, 0); }

function pickSymbol() {
  let r = Math.random() * totalWeight();
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= SYMBOLS[i].weight;
    if (r <= 0) return i;
  }
  return SYMBOLS.length - 1;
}

// -------------------------------------------------------
// Build reel DOM strips (extra symbols above for scroll illusion)
// -------------------------------------------------------
const VISIBLE_ROWS = 1;   // only center row is the "result"
const PAD = 8;             // extra symbols drawn above/below for scroll animation

function buildReels() {
  for (let r = 0; r < 3; r++) {
    const strip = document.getElementById(`reel-strip-${r}`);
    strip.innerHTML = '';
    // fill with random symbols — we'll re-populate on each spin
    for (let i = 0; i < PAD * 2 + 1; i++) {
      const div = document.createElement('div');
      div.className = 'reel-symbol';
      div.textContent = SYMBOLS[pickSymbol()].emoji;
      strip.appendChild(div);
    }
  }
}

// -------------------------------------------------------
// Lights
// -------------------------------------------------------
const NUM_LIGHTS = 18;
let lightInterval = null;
let lightOffset = 0;

function buildLights() {
  const container = document.getElementById('lights');
  container.innerHTML = '';
  for (let i = 0; i < NUM_LIGHTS; i++) {
    const dot = document.createElement('div');
    dot.className = 'light';
    container.appendChild(dot);
  }
}

function animateLights(fast = false) {
  clearInterval(lightInterval);
  const lights = document.querySelectorAll('.light');
  lightInterval = setInterval(() => {
    lightOffset = (lightOffset + 1) % NUM_LIGHTS;
    lights.forEach((l, i) => {
      l.classList.toggle('off', (i + lightOffset) % 3 !== 0);
    });
  }, fast ? 80 : 400);
}

// -------------------------------------------------------
// Spin logic
// -------------------------------------------------------
function getReelSymbol(reelIndex) {
  const strip = document.getElementById(`reel-strip-${reelIndex}`);
  const cells = strip.querySelectorAll('.reel-symbol');
  const mid = Math.floor(cells.length / 2);
  return cells[mid].textContent;
}

function setReelResult(reelIndex, symbolIndex, extraScrollRows) {
  const strip = document.getElementById(`reel-strip-${reelIndex}`);
  const cells = strip.querySelectorAll('.reel-symbol');

  // Build a new strip: [lots of random junk] [target in middle]
  const total = cells.length;
  const mid = Math.floor(total / 2);

  const pool = [];
  for (let i = 0; i < total; i++) {
    pool.push(i === mid ? SYMBOLS[symbolIndex].emoji : SYMBOLS[pickSymbol()].emoji);
  }

  // We'll animate by translating the strip upward (strip scrolls down = symbols come from top)
  // Pre-position the strip PAD rows above the visible window
  const symbolHeight = 110; // px — matches .reel-symbol height
  strip.style.transition = 'none';
  strip.style.transform = `translateY(${-mid * symbolHeight}px)`;

  // Force reflow so the browser registers the starting position
  strip.getBoundingClientRect();

  // Update emoji content
  pool.forEach((emoji, i) => { cells[i].textContent = emoji; });

  return { strip, symbolHeight, mid };
}

function animateReel(reelIndex, targetSymbolIndex, delayMs, durationMs) {
  return new Promise(resolve => {
    const { strip, symbolHeight, mid } = setReelResult(reelIndex, targetSymbolIndex, 0);
    const wrapper = document.getElementById(`reel-${reelIndex}`);

    // The final position shows the center cell (mid) in the visible window
    // wrapper height = 110px = one symbol height, so center is translateY(-mid * h) + 0
    // meaning we animate FROM a high offset down to that

    const startOffset = -(mid + PAD) * symbolHeight;  // start scrolled far up
    const endOffset   = -mid * symbolHeight;           // land on mid symbol

    strip.style.transition = 'none';
    strip.style.transform = `translateY(${startOffset}px)`;
    strip.getBoundingClientRect(); // reflow

    setTimeout(() => {
      wrapper.classList.add('spinning');
      strip.style.transition = `transform ${durationMs}ms cubic-bezier(0.15, 0.85, 0.35, 1)`;
      strip.style.transform = `translateY(${endOffset}px)`;

      setTimeout(() => {
        wrapper.classList.remove('spinning');
        resolve();
      }, durationMs);
    }, delayMs);
  });
}

// -------------------------------------------------------
// Evaluate result
// -------------------------------------------------------
function evaluate(idxA, idxB, idxC) {
  if (idxA === idxB && idxB === idxC) {
    // 3-of-a-kind
    const mult = TRIPLE_MULT[idxA];
    return { mult, type: idxA === 0 ? 'jackpot' : 'win3', label: `3× ${SYMBOLS[idxA].label}` };
  }
  if (idxA === idxB || idxB === idxC || idxA === idxC) {
    return { mult: 2, type: 'win2', label: '2 match' };
  }
  return { mult: 0, type: 'lose', label: 'No match' };
}

// -------------------------------------------------------
// Win messages
// -------------------------------------------------------
const WIN_MSGS = {
  jackpot: [
    '🤖🤖🤖 AGI ACHIEVED! (Terms and conditions apply.)',
    'JACKPOT! The robots have aligned... with your wallet.',
    '3 AIs walk into a casino. You win.',
  ],
  win3: [
    'Triple tokens! The training data was in your favour.',
    'A hat-trick of inference! Tokens inbound.',
    'Three of a kind — even the model is impressed.',
  ],
  win2: [
    'Two match! A local minimum, but still a win.',
    'Partial correlation detected. +2× tokens!',
    'Statistical significance achieved (p < 0.05, sort of).',
  ],
  lose: [
    'Context exhausted. Tokens burned. Lesson: unlearned.',
    'The model confidently predicted you would win. It was wrong.',
    'Tokens successfully spent on stochastic outcomes. As intended.',
    'Loss function increased. Gradient descent continues.',
    'You\'ve been rate-limited by luck.',
    'Error 429: Too many losing spins. Please wait... (you won\'t).',
    'Hallucination complete: you briefly saw a winning combo.',
  ],
};

function randomMsg(type) {
  const arr = WIN_MSGS[type] || WIN_MSGS.lose;
  return arr[Math.floor(Math.random() * arr.length)];
}

// -------------------------------------------------------
// UI updates
// -------------------------------------------------------
function updateUI() {
  tokenCountEl.textContent = tokens;
  tokensSpentEl.textContent = tokensSpent;
  winStreakEl.textContent = winStreak;
  betAmountEl.textContent = bet;
  spinBtn.disabled = spinning || tokens < bet;
}

function flashTokenCount(type) {
  tokenCountEl.classList.remove('flash-win', 'flash-lose');
  void tokenCountEl.offsetWidth; // reflow
  tokenCountEl.classList.add(type === 'win' ? 'flash-win' : 'flash-lose');
}

function setResult(text, type) {
  resultMsg.textContent = text;
  resultMsg.className = type;
}

function rotateQuote() {
  quoteIdx = (quoteIdx + 1) % AI_QUOTES.length;
  aiQuoteEl.style.opacity = '0';
  setTimeout(() => {
    aiQuoteEl.textContent = AI_QUOTES[quoteIdx];
    aiQuoteEl.style.opacity = '1';
    aiQuoteEl.style.transition = 'opacity 0.5s';
  }, 300);
}

// -------------------------------------------------------
// Main spin
// -------------------------------------------------------
async function spin() {
  if (spinning || tokens < bet) return;

  spinning = true;
  spinBtn.disabled = true;

  // Deduct bet
  tokens -= bet;
  tokensSpent += bet;
  updateUI();
  flashTokenCount('lose');

  // Pick results
  const resultIdxs = [pickSymbol(), pickSymbol(), pickSymbol()];

  // Animate lights fast
  animateLights(true);

  // Spin reels with staggered stops
  const durations = [700, 950, 1200];
  const delays    = [0, 150, 300];

  const promises = resultIdxs.map((symIdx, r) =>
    animateReel(r, symIdx, delays[r], durations[r])
  );

  await Promise.all(promises);

  // Evaluate
  const outcome = evaluate(...resultIdxs);
  animateLights(false);

  if (outcome.mult > 0) {
    const payout = bet * outcome.mult;
    tokens += payout;
    winStreak++;

    if (outcome.type === 'jackpot') {
      // Big win overlay
      winTitle.textContent = '🤖 JACKPOT! 🤖';
      winAmount.textContent = `+${payout} tokens`;
      winSubtitle.textContent = 'AGI achieved! (Temporarily.)';
      winOverlay.classList.add('active');
      setResult(randomMsg('jackpot'), 'jackpot');
    } else {
      setResult(`${randomMsg(outcome.type)} (+${payout} tokens)`, 'win');
    }
    flashTokenCount('win');
  } else {
    winStreak = 0;
    setResult(randomMsg('lose'), 'lose');
  }

  rotateQuote();
  spinning = false;
  updateUI();

  // Bankrupt?
  if (tokens <= 0) {
    setTimeout(() => {
      tokens = 50;
      tokensSpent = 0;
      setResult('💸 BANKRUPT! The AI took pity. Here\'s 50 free tokens.', 'lose');
      updateUI();
    }, 1200);
  }
}

// -------------------------------------------------------
// Bet controls
// -------------------------------------------------------
document.getElementById('bet-dec').addEventListener('click', () => {
  bet = Math.max(5, bet - 5);
  updateUI();
});
document.getElementById('bet-inc').addEventListener('click', () => {
  bet = Math.min(tokens, bet + 5);
  updateUI();
});
document.getElementById('max-btn').addEventListener('click', () => {
  bet = Math.min(tokens, 50);
  updateUI();
});
spinBtn.addEventListener('click', spin);

// Keyboard: spacebar to spin
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.matches('button')) {
    e.preventDefault();
    spin();
  }
});

// -------------------------------------------------------
// Init
// -------------------------------------------------------
buildLights();
buildReels();
animateLights(false);
updateUI();
aiQuoteEl.textContent = AI_QUOTES[0];

// Auto-rotate quotes every 6 seconds
setInterval(rotateQuote, 6000);
