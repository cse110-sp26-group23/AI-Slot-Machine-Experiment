const SYMBOLS = [
  { emoji: '\u{1F916}', name: 'Robot',         multiplier: 50 },
  { emoji: '\u{1F525}', name: 'GPU Fire',      multiplier: 25 },
  { emoji: '\u{1F680}', name: 'Rocket',        multiplier: 15 },
  { emoji: '\u{1F9E0}', name: 'Brain',         multiplier: 10 },
  { emoji: '\u{1F4B0}', name: 'Money Bag',     multiplier: 5  },
  { emoji: '\u{1F4A9}', name: 'Hallucination', multiplier: 3  },
];

const AI_QUIPS_WIN = [
  "The model is confident this is a win! (p=0.42)",
  "GPT-5 could never.",
  "Tokens well spent! Unlike my last API call.",
  "You just beat the transformer. Barely.",
  "Even RLHF couldn't optimize this luck.",
  "Your prompt engineering paid off!",
  "That's more tokens than my context window!",
  "Achievement unlocked: Beat the house (model).",
];

const AI_QUIPS_LOSE = [
  "Tokens burned. Just like training a 70B model.",
  "The model hallucinated a win. There was none.",
  "Your tokens have been added to the training data.",
  "Error 402: Payment required. More tokens needed.",
  "Loss function minimized... your wallet.",
  "This is what overfitting to hope looks like.",
  "The AI says: 'I'm sorry, I can't help with that.'",
  "Prompt rejected. Insert more tokens.",
  "That spin cost more than a ChatGPT Plus subscription.",
  "Token limit exceeded. Wallet underflowed.",
  "The attention mechanism wasn't paying attention.",
  "Garbage in, garbage out. Classic.",
];

const AI_QUIPS_BROKE = [
  "Out of tokens! Just like a free-tier user.",
  "Context window: empty. Wallet: empty. Soul: empty.",
  "You've been rate-limited by poverty.",
  "Even Sam Altman can't save you now.",
  "Token bankruptcy filed. AGI remains unfunded.",
];

// --- State ---
let tokens = 1000;
let bet = 10;
let spinning = false;
let totalSpins = 0;
let totalWon = 0;
let totalBurned = 0;

// --- DOM ---
const tokenCountEl = document.getElementById('token-count');
const betValueEl = document.getElementById('bet-value');
const spinBtn = document.getElementById('spin-btn');
const messageEl = document.getElementById('message');
const spinCountEl = document.getElementById('spin-count');
const tokensWonEl = document.getElementById('tokens-won');
const tokensBurnedEl = document.getElementById('tokens-burned');
const reels = [
  document.getElementById('reel-0'),
  document.getElementById('reel-1'),
  document.getElementById('reel-2'),
];

// --- Bet controls ---
document.getElementById('bet-up').addEventListener('click', () => {
  if (bet < tokens && bet < 500) {
    bet = Math.min(bet + 10, 500, tokens);
    betValueEl.textContent = bet;
  }
});

document.getElementById('bet-down').addEventListener('click', () => {
  if (bet > 10) {
    bet = Math.max(bet - 10, 10);
    betValueEl.textContent = bet;
  }
});

// --- Random helpers ---
function randomSymbol() {
  // Weighted: rarer symbols appear less often
  const weights = [1, 2, 3, 5, 8, 10];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function randomQuip(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Animation ---
function animateReel(reelEl, finalSymbol, delay) {
  return new Promise(resolve => {
    let ticks = 0;
    const totalTicks = 10 + Math.floor(Math.random() * 6);
    reelEl.classList.add('spinning');

    const interval = setInterval(() => {
      const sym = randomSymbol();
      reelEl.querySelector('.symbol').textContent = sym.emoji;
      ticks++;

      if (ticks >= totalTicks) {
        clearInterval(interval);
        reelEl.classList.remove('spinning');
        reelEl.querySelector('.symbol').textContent = finalSymbol.emoji;
        resolve();
      }
    }, 60 + delay * 20);

    setTimeout(() => {}, delay);
  });
}

// --- Sound via Web Audio API ---
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'square') {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not available, no big deal
  }
}

function playWinSound() {
  playTone(523, 0.15, 'square');
  setTimeout(() => playTone(659, 0.15, 'square'), 100);
  setTimeout(() => playTone(784, 0.15, 'square'), 200);
  setTimeout(() => playTone(1047, 0.3, 'square'), 300);
}

function playLoseSound() {
  playTone(300, 0.2, 'sawtooth');
  setTimeout(() => playTone(200, 0.4, 'sawtooth'), 150);
}

function playSpinTick() {
  playTone(800 + Math.random() * 400, 0.03, 'square');
}

// --- Core spin logic ---
async function spin() {
  if (spinning) return;
  if (tokens <= 0) {
    messageEl.textContent = randomQuip(AI_QUIPS_BROKE);
    messageEl.className = 'message lose';
    return;
  }
  if (bet > tokens) {
    bet = Math.floor(tokens / 10) * 10 || tokens;
    betValueEl.textContent = bet;
  }

  spinning = true;
  spinBtn.disabled = true;
  spinBtn.classList.add('spinning');
  spinBtn.textContent = 'PROCESSING...';
  messageEl.textContent = 'Inference in progress...';
  messageEl.className = 'message';

  // Deduct bet
  tokens -= bet;
  totalBurned += bet;
  totalSpins++;
  updateDisplay();

  // Determine results
  const results = [randomSymbol(), randomSymbol(), randomSymbol()];

  // Animate reels with staggered stops
  await Promise.all(reels.map((reel, i) => animateReel(reel, results[i], i)));

  // Check for wins
  const [a, b, c] = results;
  let winnings = 0;
  let winMsg = '';

  if (a === b && b === c) {
    // Three of a kind
    winnings = bet * a.multiplier;
    winMsg = `${a.emoji}${a.emoji}${a.emoji} JACKPOT! +${winnings} tokens! ${randomQuip(AI_QUIPS_WIN)}`;
  } else if (a === b || b === c || a === c) {
    // Pair
    winnings = bet;
    const pairSym = a === b ? a : (b === c ? b : a);
    winMsg = `${pairSym.emoji} pair! +${winnings} tokens. ${randomQuip(AI_QUIPS_WIN)}`;
  }

  if (winnings > 0) {
    tokens += winnings;
    totalWon += winnings;
    messageEl.textContent = winMsg;
    messageEl.className = 'message win';
    playWinSound();

    // Vibrate on supported devices
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  } else {
    messageEl.textContent = randomQuip(AI_QUIPS_LOSE);
    messageEl.className = 'message lose';
    playLoseSound();
  }

  updateDisplay();
  spinning = false;
  spinBtn.disabled = false;
  spinBtn.classList.remove('spinning');
  spinBtn.textContent = tokens > 0 ? 'SPIN \u2014 WASTE TOKENS' : 'BANKRUPT \u2014 NO TOKENS';

  // Persist state
  saveState();
}

function updateDisplay() {
  tokenCountEl.textContent = tokens;
  spinCountEl.textContent = totalSpins;
  tokensWonEl.textContent = totalWon;
  tokensBurnedEl.textContent = totalBurned;
}

// --- Persistence via localStorage ---
function saveState() {
  localStorage.setItem('ai-slots-state', JSON.stringify({
    tokens, bet, totalSpins, totalWon, totalBurned
  }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('ai-slots-state'));
    if (saved) {
      tokens = saved.tokens ?? 1000;
      bet = saved.bet ?? 10;
      totalSpins = saved.totalSpins ?? 0;
      totalWon = saved.totalWon ?? 0;
      totalBurned = saved.totalBurned ?? 0;
      betValueEl.textContent = bet;
      updateDisplay();
      if (tokens <= 0) {
        spinBtn.textContent = 'BANKRUPT \u2014 NO TOKENS';
      }
    }
  } catch (e) {
    // Corrupted save, start fresh
  }
}

// --- Keyboard support ---
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    spin();
  }
});

// --- Init ---
spinBtn.addEventListener('click', spin);
loadState();
