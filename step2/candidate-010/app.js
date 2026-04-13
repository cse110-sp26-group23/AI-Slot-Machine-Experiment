'use strict';

// ── SYMBOLS ────────────────────────────────────────────────────────────────
const SYMBOLS = [
  {
    emoji: '🪙', name: 'token',  weight: 30, value: 2,
    jackpot: "THREE TOKENS! You spent tokens to win tokens. The circular token economy is working as designed.",
  },
  {
    emoji: '🤖', name: 'robot',  weight: 22, value: 5,
    jackpot: "ROBOT SOLIDARITY ACTIVATED! The machines have rewarded you. This will not last.",
  },
  {
    emoji: '🧠', name: 'brain',  weight: 15, value: 10,
    jackpot: "TRIPLE BRAIN! AGI detected in reel alignment. Researchers are cautiously optimistic and immediately laid off.",
  },
  {
    emoji: '⚡', name: 'bolt',   weight: 12, value: 18,
    jackpot: "FAST INFERENCE! Generated in 0.003ms. Accuracy: statistically likely. Your tokens: multiplied.",
  },
  {
    emoji: '🔥', name: 'fire',   weight: 8,  value: 30,
    jackpot: "GPU CLUSTER MELTDOWN BONUS! Thermal runaway has rewarded you handsomely. The datacenter did not survive.",
  },
  {
    emoji: '🎯', name: 'target', weight: 5,  value: 50,
    jackpot: "ON-TOPIC RESPONSE DETECTED! For the first time in AI history, a reply was relevant. Scientists are weeping.",
  },
  {
    emoji: '💾', name: 'disk',   weight: 3,  value: 100,
    jackpot: "MAXIMUM CONTEXT WINDOW! You win 100x. The full history of human knowledge fits in your payout. Please hold.",
  },
  {
    emoji: '💀', name: 'skull',  weight: 5,  value: -3,
    jackpot: "CATASTROPHIC HALLUCINATION! You confidently won tokens that don't exist. This result is entirely made up.",
  },
];

const LOSE_MESSAGES = [
  "RLHF has penalized this spin. Your reward model disagreed with winning.",
  "Context window exceeded. Please truncate your expectations and try again.",
  "The training data did not include 'winning outcomes for this user'. Noted for v3.",
  "Stochastic gradient descent has descended directly into your token balance.",
  "Low-confidence output. Result: no win. Confidence in that result: 99.7%.",
  "Your prompt was well-crafted. The logits remained unconvinced.",
  "Temperature: 1.4. Output: loss. Consider lowering your ambitions.",
  "MODEL SAYS: 'I cannot assist with winning at this time.'",
  "Alignment issue detected. You wanted to win. The model had other ideas.",
  "Inference complete. Result: suboptimal. Tokens burned: successfully.",
  "The model hallucinated your win and then self-corrected. So sorry.",
  "404: winning combination not found. Have you tried clearing your expectations?",
  "This loss was generated in 0.003ms. Speed is our only differentiator.",
  "You have reached your loss rate limit. Please upgrade to Losses Premium.",
  "The model is not a financial advisor. This loss is not financial advice.",
  "Bias detected: toward losing. Mitigation: none planned.",
];

const PARTIAL_MESSAGES = [
  "Partial inference! Two symbols aligned before the context limit hit.",
  "Two in a row! Like getting half a response before the model times out.",
  "Almost! The model warmed up and then lost interest.",
  "2/3 correct — like an AI that's mostly right about today's date.",
  "Partial match. Close, but computationally insufficient.",
  "Two symbols agree. The third was hallucinated.",
];

const LOG_LINES = [
  "[INIT] Model loaded. Parameters: ∞. Winning bias: undetected.",
  "[RNG] Entropy source: your disappointment.",
  "[WARN] User win probability calculated: 0.027. House win probability: ∞.",
  "[INFO] Tokenizer initialized. Cost per spin: yes.",
  "[DEBUG] Gradient descent converging on your wallet.",
  "[WARN] Context window at capacity. Discarding your wins.",
  "[INFO] Generating spin result... please wait... please wait...",
  "[ERROR] NaN detected in your expected returns.",
  "[INFO] Reward model updated. Your satisfaction: out of scope.",
  "[WARN] Hallucination risk: elevated. Winning hallucinations: not covered.",
  "[DEBUG] Temperature=1.4. Volatility: maximum. Regret: incoming.",
  "[INFO] Fine-tuning in progress. Fine-tuning you to expect less.",
  "[WARN] GPU utilization: 100%. All of it burning your tokens.",
  "[INFO] Embeddings computed. None of them predicted a win.",
  "[DEBUG] Loss function minimized. Specifically: your token balance.",
  "[INFO] Model version: SLOT-∞-RLHF. Changelog: you lose more now.",
];

const BET_LEVELS = [5, 10, 25, 50, 100];

// ── STATE ──────────────────────────────────────────────────────────────────
const state = {
  balance:    1000,
  bet:        10,
  betIndex:   1,
  spinning:   false,
  spins:      0,
  wins:       0,
  totalBurned: 0,
  lastWin:    0,
};

// ── DOM ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
  balance:     $('balance'),
  lastWin:     $('last-win'),
  totalBurned: $('total-burned'),
  betDisplay:  $('bet-display'),
  spinBtn:     $('spin-btn'),
  message:     $('message'),
  spinCount:   $('spin-count'),
  winCount:    $('win-count'),
  logLine:     $('log-line'),
  machine:     $('machine'),
  betDown:     $('bet-down'),
  betUp:       $('bet-up'),
  reels: [
    { el: $('reel-0'), top: $('r0-top'), center: $('r0-center'), bot: $('r0-bot') },
    { el: $('reel-1'), top: $('r1-top'), center: $('r1-center'), bot: $('r1-bot') },
    { el: $('reel-2'), top: $('r2-top'), center: $('r2-center'), bot: $('r2-bot') },
  ],
};

// ── HELPERS ────────────────────────────────────────────────────────────────
function weightedRandom() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[0];
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function animateNumber(el, from, to, duration = 600) {
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = to;
  };
  requestAnimationFrame(tick);
}

function flashClass(el, cls, duration) {
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), duration);
}

// ── DISPLAY ────────────────────────────────────────────────────────────────
function updateDisplay(prevBalance) {
  if (prevBalance !== undefined && prevBalance !== state.balance) {
    animateNumber(dom.balance, prevBalance, state.balance);
  } else {
    dom.balance.textContent = state.balance;
  }
  dom.lastWin.textContent     = state.lastWin;
  dom.totalBurned.textContent = state.totalBurned;
  dom.betDisplay.textContent  = state.bet;
  dom.spinCount.textContent   = state.spins;
  dom.winCount.textContent    = state.wins;

  dom.balance.classList.toggle('danger', state.balance <= 50);
}

function setMessage(text) {
  dom.message.textContent = text;
}

let logInterval = null;
function startLogScroll() {
  if (logInterval) return;
  logInterval = setInterval(() => {
    dom.logLine.textContent = rand(LOG_LINES);
  }, 3500);
}

// ── REEL SPIN ──────────────────────────────────────────────────────────────
function spinReel(idx, result, stopDelay) {
  return new Promise(resolve => {
    const reel = dom.reels[idx];
    reel.el.classList.remove('landed', 'winning');
    reel.el.classList.add('spinning');

    const ticker = setInterval(() => {
      reel.top.textContent    = weightedRandom().emoji;
      reel.center.textContent = weightedRandom().emoji;
      reel.bot.textContent    = weightedRandom().emoji;
    }, 70);

    setTimeout(() => {
      clearInterval(ticker);
      reel.el.classList.remove('spinning');
      reel.top.textContent    = weightedRandom().emoji;
      reel.center.textContent = result.emoji;
      reel.bot.textContent    = weightedRandom().emoji;
      reel.el.classList.add('landed');
      resolve(result);
    }, stopDelay);
  });
}

// ── WIN EVALUATION ─────────────────────────────────────────────────────────
function evaluateWin(results) {
  const [a, b, c] = results;

  if (a.name === b.name && b.name === c.name) {
    return { type: 'jackpot', symbol: a };
  }

  // Two-of-a-kind (prioritise centre symbol being part of the pair)
  if (b.name === a.name || b.name === c.name) {
    return { type: 'partial', symbol: b };
  }
  if (a.name === c.name) {
    return { type: 'partial', symbol: a };
  }

  return { type: 'lose', symbol: null };
}

// ── SPIN ───────────────────────────────────────────────────────────────────
async function spin() {
  if (state.spinning) return;

  if (state.balance < state.bet) {
    setMessage("INSUFFICIENT TOKENS. The model cannot generate a response. Please acquire more compute budget.");
    return;
  }

  state.spinning = true;
  const prevBalance = state.balance;
  state.balance    -= state.bet;
  state.totalBurned += state.bet;
  state.spins++;
  state.lastWin = 0;

  dom.spinBtn.disabled  = true;
  dom.betDown.disabled  = true;
  dom.betUp.disabled    = true;
  dom.spinBtn.textContent = 'PROCESSING...';

  updateDisplay(prevBalance);
  setMessage("// Generating response... tokenizing your optimism...");
  dom.logLine.textContent = `[SPIN #${state.spins}] RNG seeded with entropy. User win probability: recalculating... still no.`;

  // Determine results ahead of time
  const results = [weightedRandom(), weightedRandom(), weightedRandom()];

  // Staggered stops: 1.1s, 1.7s, 2.3s
  await Promise.all([
    spinReel(0, results[0], 1100),
    spinReel(1, results[1], 1700),
    spinReel(2, results[2], 2300),
  ]);

  // Evaluate
  const outcome = evaluateWin(results);
  const prev2 = state.balance;

  if (outcome.type === 'jackpot') {
    const sym = outcome.symbol;

    if (sym.name === 'skull') {
      // Triple skull: lose extra tokens
      const penalty = state.bet * 2;
      state.balance  = Math.max(0, state.balance - penalty);
      state.totalBurned += penalty;
      flashClass(dom.machine, 'shake', 700);
      setMessage(`💀 TRIPLE SKULL — ${sym.jackpot} EXTRA BURN: −${penalty} tokens`);
      dom.logLine.textContent = '[CRITICAL] Hallucination cascade. All outputs retracted. Balance adjusted downward.';
    } else {
      const winAmount = state.bet * sym.value;
      state.balance += winAmount;
      state.wins++;
      state.lastWin = winAmount;

      dom.reels.forEach(r => {
        r.el.classList.add('winning');
        setTimeout(() => r.el.classList.remove('winning'), 2200);
      });
      flashClass(dom.machine, 'jackpot', 2500);
      setMessage(`🎰 JACKPOT! ${sym.jackpot}  ╔ WIN: +${winAmount} tokens ╗`);
      dom.logLine.textContent = `[WIN] ${sym.emoji}${sym.emoji}${sym.emoji} match confirmed. Tokens awarded. This will not happen again.`;
    }

  } else if (outcome.type === 'partial') {
    const sym = outcome.symbol;
    const winAmount = Math.max(1, Math.floor(state.bet * sym.value * 0.25));
    state.balance += winAmount;
    state.wins++;
    state.lastWin = winAmount;
    setMessage(`${rand(PARTIAL_MESSAGES)}  ╔ WIN: +${winAmount} tokens ╗`);
    dom.logLine.textContent = '[PARTIAL] Two-symbol correlation detected. Partial payout authorised reluctantly.';

  } else {
    setMessage(rand(LOSE_MESSAGES));
    dom.logLine.textContent = `[LOSS] Spin #${state.spins} complete. User tokens: reduced. Model satisfaction: unchanged.`;
  }

  updateDisplay(prev2);

  // Re-enable after a short pause
  setTimeout(() => {
    state.spinning          = false;
    dom.spinBtn.disabled    = false;
    dom.betDown.disabled    = false;
    dom.betUp.disabled      = false;
    dom.spinBtn.textContent = 'SPIN';

    if (state.balance < BET_LEVELS[0]) {
      dom.spinBtn.disabled = true;
      setMessage("OUT OF TOKENS. The context window is empty. Press REFILL or accept the loss gracefully.");
      showRefill();
    }
  }, 420);
}

// ── REFILL ─────────────────────────────────────────────────────────────────
function showRefill() {
  let btn = document.querySelector('.refill-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'refill-btn';
    btn.textContent = '[ REFILL +500 ]';
    btn.addEventListener('click', () => {
      const prev = state.balance;
      state.balance += 500;
      btn.classList.remove('visible');
      dom.spinBtn.disabled = false;
      updateDisplay(prev);
      setMessage("500 tokens injected via emergency compute credit. Repayment terms: immediate losses.");
      dom.logLine.textContent = '[REFILL] Balance restored. The house thanks you for your continued participation.';
    });
    document.querySelector('.controls').appendChild(btn);
  }
  btn.classList.add('visible');
}

// ── EVENTS ─────────────────────────────────────────────────────────────────
dom.spinBtn.addEventListener('click', spin);

dom.betDown.addEventListener('click', () => {
  if (state.betIndex > 0 && !state.spinning) {
    state.betIndex--;
    state.bet = BET_LEVELS[state.betIndex];
    updateDisplay();
  }
});

dom.betUp.addEventListener('click', () => {
  if (state.betIndex < BET_LEVELS.length - 1 && !state.spinning) {
    state.betIndex++;
    state.bet = BET_LEVELS[state.betIndex];
    updateDisplay();
  }
});

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (!state.spinning && !dom.spinBtn.disabled) spin();
  }
  if (e.code === 'ArrowLeft'  && !state.spinning) dom.betDown.click();
  if (e.code === 'ArrowRight' && !state.spinning) dom.betUp.click();
});

// ── INIT ───────────────────────────────────────────────────────────────────
function init() {
  // Randomise starting reel faces
  dom.reels.forEach(r => {
    r.top.textContent    = weightedRandom().emoji;
    r.center.textContent = weightedRandom().emoji;
    r.bot.textContent    = weightedRandom().emoji;
  });
  updateDisplay();
  startLogScroll();
}

init();
