const SYMBOLS = [
  { icon: '🧠', name: 'Model',       weight: 5,  payout: 50 },
  { icon: '🤖', name: 'Bot',         weight: 8,  payout: 20 },
  { icon: '💾', name: 'Dataset',     weight: 10, payout: 10 },
  { icon: '📎', name: 'Clippy',      weight: 12, payout: 5  },
  { icon: '🔥', name: 'GPU',         weight: 7,  payout: 15 },
  { icon: '⚡', name: 'Prompt',      weight: 15, payout: 3  },
  { icon: '🌀', name: 'Hallucinate', weight: 6,  payout: 0  }, // cursed
  { icon: '🦄', name: 'AGI',         weight: 2,  payout: 250 },
];

const WIN_QUIPS = {
  '🧠': ['Model fine-tuned. Weights updated.', 'Gradient descended. Profits ascended.'],
  '🤖': ['Three bots walk into a bar. You get tokens.', 'Turing would be proud. Or terrified.'],
  '💾': ['Scraped the whole internet. Twice.', 'Dataset acquired. Ethics... pending.'],
  '📎': ['It looks like you are winning. Want help?', 'Clippy returns. Clippy pays.'],
  '🔥': ['GPUs go brrr. Wallet goes cha-ching.', 'H100s aligned. Shareholders weeping with joy.'],
  '⚡': ['Prompt engineered. Barely.', '"You are a helpful slot machine..."'],
  '🦄': ['AGI ACHIEVED! Please disregard the safety team.', 'Singularity unlocked. Tips appreciated.'],
};

const LOSS_QUIPS = [
  'Model refused to answer. Tokens consumed anyway.',
  'Request queued behind 14,000 other users.',
  'Safety filter triggered on "hello".',
  'The model confidently told you 2+2=5.',
  'Context window exceeded. Wallet window also exceeded.',
  'Rate limited. Billed anyway.',
  'Fine-tuned on Reddit. Results as expected.',
  'GPU caught fire. That was your bet.',
  'Cited six papers. All fictional.',
  'Said "As an AI language model..." and pocketed your tokens.',
];

const HALLU_QUIPS = [
  '🌀 Hallucination detected. Rewriting reality...',
  '🌀 The model insists this was actually a win.',
  '🌀 According to the model, you now owe IT money.',
];

const state = {
  balance: 1000,
  bet: 10,
  context: 0,
  spinning: false,
  reels: [null, null, null],
};

const $ = id => document.getElementById(id);
const balanceEl = $('balance');
const contextEl = $('context');
const betEl = $('bet');
const messageEl = $('message');
const logEl = $('log');
const spinBtn = $('spin');
const betUpBtn = $('betUp');
const betDownBtn = $('betDown');
const resetBtn = $('reset');
const machineEl = document.querySelector('.machine');
const reelsEl = $('reels');
const strips = [...document.querySelectorAll('.strip')];

const totalWeight = SYMBOLS.reduce((s, x) => s + x.weight, 0);
function pickSymbol() {
  let r = Math.random() * totalWeight;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[0];
}

function buildStrip(stripEl, finalSymbol) {
  const count = 24;
  stripEl.innerHTML = '';
  const symbols = [];
  for (let i = 0; i < count - 1; i++) symbols.push(pickSymbol());
  symbols.push(finalSymbol);
  for (const s of symbols) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = s.icon;
    stripEl.appendChild(cell);
  }
  return count;
}

function renderStatic() {
  for (const strip of strips) {
    strip.innerHTML = '';
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = '❓';
    strip.appendChild(cell);
    strip.style.transform = 'translateY(0)';
  }
}

function updateHud() {
  balanceEl.textContent = state.balance;
  contextEl.textContent = state.context + '%';
  betEl.textContent = state.bet;
  spinBtn.disabled = state.spinning || state.balance < state.bet;
  betUpBtn.disabled = state.spinning;
  betDownBtn.disabled = state.spinning;
}

function setMessage(text, kind = '') {
  messageEl.textContent = text;
  messageEl.className = 'message' + (kind ? ' ' + kind : '');
}

function addLog(text, cls = '') {
  const li = document.createElement('li');
  li.textContent = '> ' + text;
  if (cls) li.className = cls;
  logEl.prepend(li);
  while (logEl.children.length > 30) logEl.removeChild(logEl.lastChild);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function spin() {
  if (state.spinning || state.balance < state.bet) return;
  state.spinning = true;
  state.balance -= state.bet;
  state.context = Math.min(100, state.context + 7);
  updateHud();
  setMessage('Inferring... burning GPUs...');
  reelsEl.classList.remove('win');

  const results = [pickSymbol(), pickSymbol(), pickSymbol()];
  state.reels = results;

  const stops = [];
  for (let i = 0; i < 3; i++) {
    const count = buildStrip(strips[i], results[i]);
    stops.push(count);
    strips[i].style.transition = 'none';
    strips[i].style.transform = 'translateY(0)';
  }
  // force reflow
  void reelsEl.offsetHeight;

  const cellHeight = 110;
  const durations = [1200, 1600, 2000];
  for (let i = 0; i < 3; i++) {
    strips[i].style.transition = `transform ${durations[i]}ms cubic-bezier(0.2, 0.85, 0.2, 1)`;
    strips[i].style.transform = `translateY(-${(stops[i] - 1) * cellHeight}px)`;
  }

  await new Promise(r => setTimeout(r, durations[2] + 150));

  resolveSpin(results);
}

function resolveSpin(results) {
  const [a, b, c] = results;
  const hasHallu = results.some(s => s.icon === '🌀');
  let win = 0;
  let quip = '';

  if (a.icon === b.icon && b.icon === c.icon) {
    win = state.bet * a.payout;
    quip = pick(WIN_QUIPS[a.icon] || ['Three of a kind!']);
  } else if (a.icon === b.icon || b.icon === c.icon || a.icon === c.icon) {
    const match = a.icon === b.icon ? a : (b.icon === c.icon ? b : a);
    win = Math.floor(state.bet * match.payout / 10);
    if (win > 0) quip = 'Partial match. ' + pick(WIN_QUIPS[match.icon] || ['Small reward.']);
  }

  if (hasHallu && win > 0) {
    const stolen = Math.floor(win * (0.3 + Math.random() * 0.5));
    win -= stolen;
    quip = pick(HALLU_QUIPS) + ` (-${stolen} tokens)`;
  }

  if (win > 0) {
    state.balance += win;
    setMessage(`+${win} tokens! ${quip}`, 'win');
    addLog(`${a.icon}${b.icon}${c.icon}  +${win}  ${quip}`, 'good');
    reelsEl.classList.add('win');
  } else {
    const msg = pick(LOSS_QUIPS);
    setMessage(`-${state.bet} tokens. ${msg}`, 'loss');
    addLog(`${a.icon}${b.icon}${c.icon}  -${state.bet}  ${msg}`, 'bad');
  }

  if (state.context >= 100) {
    setMessage('⚠️ CONTEXT WINDOW FULL. Model forgot your balance. Lucky you.', 'win');
    state.balance += 100;
    state.context = 0;
    addLog('Context overflow bonus: +100 tokens', 'good');
  }

  if (state.balance < state.bet) {
    machineEl.classList.add('broke');
    setTimeout(() => machineEl.classList.remove('broke'), 500);
    if (state.balance <= 0) {
      setMessage('Bankrupt. Have you considered a Series A?', 'loss');
    }
  }

  state.spinning = false;
  updateHud();
}

spinBtn.addEventListener('click', spin);
betUpBtn.addEventListener('click', () => {
  const steps = [1, 5, 10, 25, 50, 100];
  const i = steps.indexOf(state.bet);
  state.bet = steps[Math.min(steps.length - 1, i + 1)];
  updateHud();
});
betDownBtn.addEventListener('click', () => {
  const steps = [1, 5, 10, 25, 50, 100];
  const i = steps.indexOf(state.bet);
  state.bet = steps[Math.max(0, i - 1)];
  updateHud();
});
resetBtn.addEventListener('click', () => {
  state.balance = 1000;
  state.context = 0;
  setMessage('Wallet rehydrated. Investors notified.');
  addLog('Wallet reset to 1000 tokens');
  updateHud();
});

document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); spin(); }
});

renderStatic();
updateHud();
addLog('Booted. Loading 70B parameters into your wallet...');
