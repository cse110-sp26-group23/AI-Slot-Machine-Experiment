const SYMBOLS = [
  { icon: '🧠', name: 'AGI',        weight: 2,  payout: 50 },
  { icon: '🤖', name: 'Robot',      weight: 4,  payout: 25 },
  { icon: '📎', name: 'Clippy',     weight: 4,  payout: 20 },
  { icon: '💾', name: 'Dataset',    weight: 6,  payout: 15 },
  { icon: '🔥', name: 'GPU',        weight: 7,  payout: 10 },
  { icon: '🍓', name: 'Strawberry', weight: 7,  payout: 8  },
  { icon: '🦜', name: 'Parrot',     weight: 8,  payout: 1  },
  { icon: '👻', name: 'Ghost',      weight: 10, payout: 0  },
];

const WIN_LINES = [
  "AGI ACHIEVED. Please update your résumé.",
  "Model collapse averted. For now.",
  "Clippy rises from the recycle bin.",
  "Dataset secured. Lawyers notified.",
  "GPUs go brrr. Power grid weeps.",
  "Strawberry confirmed: 3 R's. Historic.",
  "Partial credit. The model is 'working on it.'",
  "Stochastic parrot squawks. Tokens refunded.",
];

const LOSE_LINES = [
  "As a large language model, I cannot give you tokens.",
  "The model is 'thinking'. Your tokens are not.",
  "Training in progress... on your wallet.",
  "Loss function achieved. By you.",
  "Gradient descended. So did your balance.",
  "Epoch complete. Bank account: undefined.",
];

const HALLUCINATE_LINES = [
  "HALLUCINATION: model claims your balance is ∞. It isn't.",
  "HALLUCINATION: spin never happened (it did, and you lost).",
  "HALLUCINATION: model is 'very confident' that was a win.",
  "HALLUCINATION: dividing by zero users. Please hold.",
];

const state = {
  tokens: 1000,
  bet: 10,
  context: 0,
  maxContext: 8,
  temperature: 0.7,
  spinning: false,
};

const $ = (id) => document.getElementById(id);
const tokensEl = $('tokens');
const contextEl = $('context');
const tempEl = $('temp');
const betEl = $('bet');
const msgEl = $('message');
const spinBtn = $('spin');
const betUp = $('bet-up');
const betDown = $('bet-down');
const maxBet = $('max-bet');
const logEl = $('log');
const reels = [0, 1, 2].map(i => $(`reel-${i}`));

function weightedPick() {
  const total = SYMBOLS.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    if ((r -= s.weight) <= 0) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function buildStrip(reelEl, finalSymbol) {
  const strip = reelEl.querySelector('.strip');
  strip.innerHTML = '';
  const count = 24;
  for (let i = 0; i < count - 1; i++) {
    strip.appendChild(makeSymbol(weightedPick()));
  }
  strip.appendChild(makeSymbol(finalSymbol));
  strip.style.transition = 'none';
  strip.style.transform = `translateY(0px)`;
  return strip;
}

function makeSymbol(sym) {
  const el = document.createElement('div');
  el.className = 'symbol';
  el.textContent = sym.icon;
  el.dataset.name = sym.name;
  return el;
}

function render() {
  tokensEl.textContent = state.tokens;
  contextEl.textContent = `${state.context} / ${state.maxContext}`;
  tempEl.textContent = state.temperature.toFixed(1);
  betEl.textContent = state.bet;
  spinBtn.disabled = state.spinning || state.tokens < state.bet;
  [betUp, betDown, maxBet].forEach(b => b.disabled = state.spinning);
}

function setMessage(text, cls = '') {
  msgEl.textContent = text;
  msgEl.className = 'message' + (cls ? ' ' + cls : '');
}

function addLog(text, cls = '') {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  if (cls) li.className = cls;
  logEl.prepend(li);
  while (logEl.children.length > 40) logEl.lastChild.remove();
}

function evaluate(results) {
  const [a, b, c] = results;
  if (results.some(s => s.name === 'Ghost')) {
    return { type: 'hallucinate', payout: -(state.bet + 5) };
  }
  if (a.name === b.name && b.name === c.name) {
    return { type: 'jackpot', payout: state.bet * a.payout, symbol: a };
  }
  const brains = results.filter(s => s.name === 'AGI').length;
  if (brains === 2) {
    return { type: 'partial', payout: state.bet * 2 };
  }
  if (results.some(s => s.name === 'Parrot')) {
    return { type: 'parrot', payout: state.bet };
  }
  return { type: 'loss', payout: 0 };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function spin() {
  if (state.spinning) return;
  if (state.tokens < state.bet) {
    setMessage("Insufficient tokens. Please contact your AI overlord.", 'lose');
    return;
  }

  state.spinning = true;
  state.tokens -= state.bet;
  state.context = Math.min(state.maxContext, state.context + 1);
  state.temperature = Math.min(2, state.temperature + 0.05);
  render();
  setMessage("Running inference...");

  const finals = [weightedPick(), weightedPick(), weightedPick()];
  const strips = finals.map((f, i) => buildStrip(reels[i], f));

  await new Promise(r => requestAnimationFrame(r));

  const symbolHeight = reels[0].querySelector('.symbol').offsetHeight;
  const strip = strips[0];
  const totalSymbols = strip.children.length;
  const reelHeight = reels[0].offsetHeight;
  const targetY = -(symbolHeight * (totalSymbols - 1)) + (reelHeight / 2 - symbolHeight / 2);

  strips.forEach((s, i) => {
    const duration = 1.2 + i * 0.35;
    s.style.transition = `transform ${duration}s cubic-bezier(0.15, 0.5, 0.2, 1)`;
    s.style.transform = `translateY(${targetY}px)`;
  });

  await new Promise(r => setTimeout(r, 1200 + 2 * 350 + 200));

  const result = evaluate(finals);

  if (result.type === 'jackpot') {
    state.tokens += result.payout;
    reels.forEach(r => r.classList.add('win'));
    setTimeout(() => reels.forEach(r => r.classList.remove('win')), 2000);
    setMessage(`${pick(WIN_LINES)} +${result.payout}`, 'win');
    addLog(`JACKPOT ${finals.map(f=>f.icon).join('')} +${result.payout}`, 'win');
    if (state.context >= state.maxContext) {
      state.context = 0;
      state.temperature = 0.7;
      addLog('Context window cleared after jackpot.', 'win');
    }
  } else if (result.type === 'partial') {
    state.tokens += result.payout;
    setMessage(`Partial credit. +${result.payout}`, 'win');
    addLog(`Partial AGI ${finals.map(f=>f.icon).join('')} +${result.payout}`, 'win');
  } else if (result.type === 'parrot') {
    state.tokens += result.payout;
    setMessage(`Stochastic parrot — bet refunded.`);
    addLog(`Parrot refund ${finals.map(f=>f.icon).join('')}`);
  } else if (result.type === 'hallucinate') {
    state.tokens = Math.max(0, state.tokens - 5);
    setMessage(pick(HALLUCINATE_LINES), 'hallucinate');
    addLog(`Hallucination ${finals.map(f=>f.icon).join('')} −5`, 'loss');
  } else {
    setMessage(pick(LOSE_LINES), 'lose');
    addLog(`Miss ${finals.map(f=>f.icon).join('')} −${state.bet}`, 'loss');
  }

  if (state.context >= state.maxContext) {
    addLog('Context window full. Model hallucinating more.');
    state.temperature = Math.min(2, state.temperature + 0.3);
  }

  state.spinning = false;
  render();

  if (state.tokens <= 0) {
    setMessage("Out of tokens. The model suggests you 'touch grass.'", 'lose');
    spinBtn.disabled = true;
  }
}

function adjustBet(delta) {
  const next = state.bet + delta;
  if (next < 5 || next > Math.max(5, state.tokens)) return;
  state.bet = next;
  render();
}

spinBtn.addEventListener('click', spin);
betUp.addEventListener('click', () => adjustBet(5));
betDown.addEventListener('click', () => adjustBet(-5));
maxBet.addEventListener('click', () => {
  state.bet = Math.max(5, Math.min(100, state.tokens));
  render();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !state.spinning) {
    e.preventDefault();
    spin();
  }
});

function initReels() {
  reels.forEach(r => {
    const strip = r.querySelector('.strip');
    strip.innerHTML = '';
    strip.appendChild(makeSymbol(SYMBOLS[0]));
    const reelHeight = r.offsetHeight;
    const symHeight = strip.firstChild.offsetHeight || 120;
    strip.style.transform = `translateY(${reelHeight / 2 - symHeight / 2}px)`;
  });
}

initReels();
render();
