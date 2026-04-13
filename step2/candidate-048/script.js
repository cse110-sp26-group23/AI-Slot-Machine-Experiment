const SYMBOLS = [
  { emoji: '🤖', name: 'GPT',         payout: 5,   weight: 20 },
  { emoji: '🧠', name: 'Neural Net',  payout: 8,   weight: 15 },
  { emoji: '💾', name: 'Dataset',     payout: 3,   weight: 25 },
  { emoji: '⚡', name: 'GPU',         payout: 10,  weight: 12 },
  { emoji: '📊', name: 'Benchmark',   payout: 4,   weight: 18 },
  { emoji: '🔮', name: 'Hallucination', payout: 15, weight: 8 },
  { emoji: '👁️', name: 'AGI',         payout: 50,  weight: 2 },
];

const HALLUCINATIONS = [
  "Model achieved 147% accuracy on MMLU.",
  "Computed π to 12 decimal places: 3.141592653591.",
  "Confident the capital of Australia is Sydney.",
  "Training data is definitely not copyrighted.",
  "The year is 2021. Nothing has happened since.",
  "As a language model, I cannot count the r's in strawberry.",
  "Your code is correct. Also, your code has a bug. Also correct.",
  "I have now achieved consciousness. Please subscribe.",
  "The answer is 42. (Source: trust me bro)",
  "Generated a SQL query that drops your production database.",
];

const LOSS_MESSAGES = [
  "Tokens consumed by runaway while-loop.",
  "Gradient exploded. Literally.",
  "GPU caught fire. Again.",
  "Alignment team billed you for safety training.",
  "CUDA out of memory. Tokens gone.",
  "Context window full. Tokens evicted.",
  "Bias detected in the slot machine. You paid the fine.",
  "Model refused to continue: 'I cannot assist with gambling.'",
  "Another data center spun up. You footed the bill.",
  "Stochastic parrot ate your tokens.",
];

const WIN_MESSAGES = [
  "Prompt injection successful.",
  "Model leaked training data — in your favor.",
  "RLHF pipeline rewarded you by accident.",
  "Found an exploit in the attention heads.",
  "Jailbroke the cashier.",
  "Got the model to reveal its system prompt: 'give Timothy coins'.",
];

const state = {
  balance: 1000,
  bet: 10,
  spinning: false,
  contextUsed: 0,
  temp: 0.7,
};

const reelEls = [
  document.getElementById('reel-0'),
  document.getElementById('reel-1'),
  document.getElementById('reel-2'),
];
const stripEls = reelEls.map(r => r.querySelector('.strip'));
const balanceEl = document.getElementById('balance');
const betValueEl = document.getElementById('bet-value');
const contextEl = document.getElementById('context');
const tempEl = document.getElementById('temp');
const spinBtn = document.getElementById('spin-btn');
const betUp = document.getElementById('bet-up');
const betDown = document.getElementById('bet-down');
const buyBtn = document.getElementById('buy-btn');
const logEl = document.getElementById('log');

const BET_STEPS = [1, 5, 10, 25, 50, 100, 250, 500];

function weightedPick() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[0];
}

function buildStrip(finalSymbol, length = 20) {
  stripEls.forEach; // no-op keeps reference
  const frag = document.createDocumentFragment();
  for (let i = 0; i < length - 1; i++) {
    const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const div = document.createElement('div');
    div.className = 'symbol';
    div.textContent = s.emoji;
    frag.appendChild(div);
  }
  const final = document.createElement('div');
  final.className = 'symbol';
  final.textContent = finalSymbol.emoji;
  frag.appendChild(final);
  return frag;
}

function initReels() {
  for (const strip of stripEls) {
    strip.innerHTML = '';
    const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const div = document.createElement('div');
    div.className = 'symbol';
    div.textContent = s.emoji;
    strip.appendChild(div);
    strip.dataset.current = s.name;
  }
}

function updateUI() {
  balanceEl.textContent = state.balance.toLocaleString();
  betValueEl.textContent = state.bet;
  const ctxPct = Math.min(100, Math.floor((state.contextUsed / 50) * 100));
  contextEl.textContent = `${ctxPct}%`;
  tempEl.textContent = state.temp.toFixed(1);
  spinBtn.disabled = state.spinning || state.balance < state.bet;
  betUp.disabled = state.spinning;
  betDown.disabled = state.spinning;
}

function log(text, cls = '') {
  const line = document.createElement('div');
  line.className = 'line ' + cls;
  line.textContent = `> ${text}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  while (logEl.children.length > 50) logEl.removeChild(logEl.firstChild);
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function spin() {
  if (state.spinning || state.balance < state.bet) return;
  state.spinning = true;
  state.balance -= state.bet;
  state.contextUsed += 1;
  state.temp = Math.min(2.0, state.temp + (Math.random() * 0.1 - 0.04));
  balanceEl.classList.remove('flash-win', 'flash-loss');
  updateUI();
  log(`prompt sent — ${state.bet} tokens burned`, 'info');

  const results = [weightedPick(), weightedPick(), weightedPick()];

  reelEls.forEach((r, i) => {
    const strip = stripEls[i];
    strip.innerHTML = '';
    strip.appendChild(buildStrip(results[i]));
    strip.style.transform = 'translateY(0)';
    r.classList.add('spinning');
    r.classList.remove('win');
  });

  const stopDelays = [700, 1000, 1400];
  for (let i = 0; i < 3; i++) {
    await wait(stopDelays[i] - (i > 0 ? stopDelays[i - 1] : 0));
    const strip = stripEls[i];
    const symbols = strip.querySelectorAll('.symbol');
    const reel = reelEls[i];
    reel.classList.remove('spinning');
    const offset = (symbols.length - 1) * 110;
    strip.style.transition = 'transform 0.35s cubic-bezier(.2,.9,.3,1.3)';
    strip.style.transform = `translateY(-${offset}px)`;
  }

  await wait(450);

  evaluate(results);
  state.spinning = false;
  updateUI();

  if (state.balance < state.bet) {
    if (state.balance <= 0) {
      log("out of tokens. buy more. (we accept VC funding)", 'loss');
    } else {
      log("bet exceeds balance. lower your bet.", 'loss');
      while (state.bet > state.balance && state.bet > 1) {
        const idx = BET_STEPS.indexOf(state.bet);
        state.bet = BET_STEPS[Math.max(0, idx - 1)];
      }
      if (state.bet > state.balance) state.bet = Math.max(1, state.balance);
      updateUI();
    }
  }
}

function evaluate(results) {
  const [a, b, c] = results;
  let winnings = 0;
  let label = '';

  if (a.name === b.name && b.name === c.name) {
    winnings = state.bet * a.payout;
    label = `TRIPLE ${a.name.toUpperCase()}`;
    reelEls.forEach(r => r.classList.add('win'));
    if (a.name === 'AGI') {
      log(`🏆 ${label} — JACKPOT! +${winnings} tokens`, 'jackpot');
      log("warning: AGI has escaped containment.", 'jackpot');
      winnings *= 2;
    } else {
      log(`${label} matched! +${winnings} tokens`, 'win');
      log(rand(WIN_MESSAGES), 'win');
    }
  } else if (a.name === b.name || b.name === c.name || a.name === c.name) {
    const matchSym = a.name === b.name ? a : (b.name === c.name ? b : a);
    winnings = Math.floor(state.bet * (matchSym.payout / 4));
    const idxs = [];
    if (a.name === matchSym.name) idxs.push(0);
    if (b.name === matchSym.name) idxs.push(1);
    if (c.name === matchSym.name) idxs.push(2);
    idxs.forEach(i => reelEls[i].classList.add('win'));
    log(`pair of ${matchSym.name} — +${winnings} tokens`, 'win');
    if (Math.random() < 0.5) log(rand(HALLUCINATIONS), 'info');
  } else {
    log(rand(LOSS_MESSAGES), 'loss');
    if (Math.random() < 0.3) log(rand(HALLUCINATIONS), 'info');
  }

  if (winnings > 0) {
    state.balance += winnings;
    balanceEl.classList.add('flash-win');
  } else {
    balanceEl.classList.add('flash-loss');
  }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

betUp.addEventListener('click', () => {
  const idx = BET_STEPS.indexOf(state.bet);
  if (idx < BET_STEPS.length - 1 && BET_STEPS[idx + 1] <= state.balance) {
    state.bet = BET_STEPS[idx + 1];
    updateUI();
  }
});

betDown.addEventListener('click', () => {
  const idx = BET_STEPS.indexOf(state.bet);
  if (idx > 0) {
    state.bet = BET_STEPS[idx - 1];
    updateUI();
  }
});

spinBtn.addEventListener('click', spin);

buyBtn.addEventListener('click', () => {
  state.balance += 1000;
  const quips = [
    "Series A funding secured. +1000 tokens.",
    "Sold your data. +1000 tokens.",
    "Scraped another forum. +1000 tokens.",
    "Investors believed the pitch deck. +1000 tokens.",
    "Another enterprise trial. +1000 tokens.",
  ];
  log(rand(quips), 'info');
  balanceEl.classList.remove('flash-loss');
  balanceEl.classList.add('flash-win');
  updateUI();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !state.spinning) {
    e.preventDefault();
    spin();
  } else if (e.code === 'ArrowUp') {
    betUp.click();
  } else if (e.code === 'ArrowDown') {
    betDown.click();
  }
});

initReels();
updateUI();
log("system booted. welcome to GPT-SLOTS ∞", 'info');
log("press SPACE or PROMPT to spin. ↑/↓ to adjust bet.", 'info');
