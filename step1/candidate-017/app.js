const SYMBOLS = [
  { icon: '🧠', name: 'BrainRot',    mult: 50, weight: 1,  quip: 'AGI achieved internally.' },
  { icon: '🤖', name: 'Chatbot',     mult: 20, weight: 3,  quip: 'It agrees with everything you said.' },
  { icon: '📎', name: 'Paperclip',   mult: 15, weight: 3,  quip: 'Maximizing. Relentlessly.' },
  { icon: '💾', name: 'TrainingData',mult: 10, weight: 5,  quip: 'Scraped from a forum, circa 2013.' },
  { icon: '🔥', name: 'GPU',         mult: 8,  weight: 6,  quip: 'A small lake just evaporated.' },
  { icon: '📊', name: 'Benchmark',   mult: 5,  weight: 8,  quip: 'State of the art! (on this one eval)' },
  { icon: '🌀', name: 'Hallucination',mult: 3, weight: 10, quip: 'Confidently incorrect. Again.' },
  { icon: '💸', name: 'BurnRate',    mult: 0,  weight: 12, quip: 'Investors are getting nervous.' },
];

const LOSS_QUIPS = [
  'Model overfit. Try again.',
  'Gradient exploded. Tokens vaporized.',
  'Your prompt was rejected by alignment.',
  'Context window leaked onto the floor.',
  'The reels chose violence. And you lost.',
  'RLHF says: no.',
  'Emergent behavior: you have less money.',
  'The attention heads were looking elsewhere.',
];

const NEAR_MISS_QUIPS = [
  'So close. The model almost got it right.',
  'Off by one token. Classic.',
  'Two out of three ain\'t bad. It\'s worse, actually.',
  'The vibes were there. The payout was not.',
];

const STRIP_LENGTH = 30;
const SYMBOL_HEIGHT = 60;
const VISIBLE_ROWS = 3;
const CENTER_OFFSET = SYMBOL_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

const state = {
  balance: 1000,
  bet: 10,
  spinning: false,
  temperature: 0.7,
  strips: [[], [], []],
};

const els = {
  balance:     document.getElementById('balance'),
  bet:         document.getElementById('bet'),
  temperature: document.getElementById('temperature'),
  betUp:       document.getElementById('betUp'),
  betDown:     document.getElementById('betDown'),
  spin:        document.getElementById('spin'),
  reset:       document.getElementById('reset'),
  message:     document.getElementById('message'),
  paytable:    document.getElementById('paytable'),
  strips:      Array.from(document.querySelectorAll('.strip')),
  reels:       Array.from(document.querySelectorAll('.reel')),
};

const BET_STEPS = [1, 5, 10, 25, 50, 100, 250];

function weightedPick() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function buildStrip(finalSymbol) {
  const strip = [];
  for (let i = 0; i < STRIP_LENGTH - 1; i++) strip.push(weightedPick());
  strip.push(finalSymbol);
  return strip;
}

function renderStrip(reelIndex, symbols) {
  const stripEl = els.strips[reelIndex];
  stripEl.innerHTML = '';
  for (const s of symbols) {
    const d = document.createElement('div');
    d.className = 'symbol';
    d.textContent = s.icon;
    d.title = s.name;
    stripEl.appendChild(d);
  }
}

function setInitialReels() {
  for (let i = 0; i < 3; i++) {
    const seed = [weightedPick(), weightedPick(), weightedPick()];
    state.strips[i] = seed;
    renderStrip(i, seed);
    els.strips[i].style.transition = 'none';
    els.strips[i].style.transform = `translateY(-${SYMBOL_HEIGHT - CENTER_OFFSET}px)`;
  }
}

function updateUI() {
  els.balance.textContent = state.balance.toLocaleString();
  els.bet.textContent = state.bet;
  els.temperature.textContent = state.temperature.toFixed(2);
  els.spin.disabled = state.spinning || state.balance < state.bet;
  els.betUp.disabled   = state.spinning || BET_STEPS.indexOf(state.bet) === BET_STEPS.length - 1;
  els.betDown.disabled = state.spinning || BET_STEPS.indexOf(state.bet) === 0;
}

function setMessage(text, kind = '') {
  els.message.textContent = text;
  els.message.className = 'message' + (kind ? ' ' + kind : '');
}

function spinReel(reelIndex, duration, finalSymbol) {
  return new Promise(resolve => {
    const strip = buildStrip(finalSymbol);
    state.strips[reelIndex] = strip;
    renderStrip(reelIndex, strip);

    const stripEl = els.strips[reelIndex];
    stripEl.style.transition = 'none';
    stripEl.style.transform = `translateY(0px)`;

    // Force reflow so the transition actually runs.
    void stripEl.offsetHeight;

    const finalY = -((STRIP_LENGTH - 1) * SYMBOL_HEIGHT - CENTER_OFFSET);
    stripEl.style.transition = `transform ${duration}ms cubic-bezier(0.22, 0.8, 0.2, 1)`;
    stripEl.style.transform = `translateY(${finalY}px)`;

    setTimeout(resolve, duration + 50);
  });
}

async function spin() {
  if (state.spinning || state.balance < state.bet) return;

  state.spinning = true;
  state.balance -= state.bet;
  state.temperature = +(Math.random() * 1.5 + 0.2).toFixed(2);
  els.reels.forEach(r => r.classList.remove('win'));
  setMessage('Sampling from the latent space…');
  updateUI();

  const finals = [weightedPick(), weightedPick(), weightedPick()];

  await Promise.all([
    spinReel(0, 1400, finals[0]),
    spinReel(1, 1800, finals[1]),
    spinReel(2, 2200, finals[2]),
  ]);

  evaluate(finals);
  state.spinning = false;
  updateUI();
}

function evaluate(finals) {
  const [a, b, c] = finals;
  const allSame = a.name === b.name && b.name === c.name;
  const twoSame = !allSame && (a.name === b.name || b.name === c.name || a.name === c.name);

  if (allSame) {
    const payout = state.bet * a.mult;
    state.balance += payout;
    els.reels.forEach(r => r.classList.add('win'));

    if (a.mult >= 50) {
      setMessage(`💥 JACKPOT! ${a.icon} ${a.icon} ${a.icon} — +${payout} tokens. ${a.quip}`, 'jackpot');
    } else if (payout > 0) {
      setMessage(`WIN! ${a.icon}×3 — +${payout} tokens. ${a.quip}`, 'win');
    } else {
      setMessage(`${a.icon}×3 — the Burn Rate consumed your bet. ${a.quip}`, 'lose');
    }
    return;
  }

  if (twoSame) {
    setMessage(NEAR_MISS_QUIPS[Math.floor(Math.random() * NEAR_MISS_QUIPS.length)], 'lose');
    return;
  }

  setMessage(LOSS_QUIPS[Math.floor(Math.random() * LOSS_QUIPS.length)], 'lose');
}

function changeBet(dir) {
  const idx = BET_STEPS.indexOf(state.bet);
  const next = Math.max(0, Math.min(BET_STEPS.length - 1, idx + dir));
  state.bet = BET_STEPS[next];
  updateUI();
}

function renderPaytable() {
  els.paytable.innerHTML = '';
  SYMBOLS.filter(s => s.mult > 0).forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `<span><span class="sym">${s.icon}</span>${s.name}×3</span><span class="mult">${s.mult}×</span>`;
    li.title = s.quip;
    els.paytable.appendChild(li);
  });
  const li = document.createElement('li');
  li.innerHTML = `<span><span class="sym">💸</span>BurnRate×3</span><span class="mult" style="color: var(--danger)">0×</span>`;
  li.title = 'Investors are getting nervous.';
  els.paytable.appendChild(li);
}

function topUp() {
  if (state.spinning) return;
  state.balance += 1000;
  setMessage('Seed round closed. +1000 tokens. Please do not mention the unit economics.');
  updateUI();
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    spin();
  }
});

els.spin.addEventListener('click', spin);
els.reset.addEventListener('click', topUp);
els.betUp.addEventListener('click', () => changeBet(1));
els.betDown.addEventListener('click', () => changeBet(-1));

renderPaytable();
setInitialReels();
updateUI();
