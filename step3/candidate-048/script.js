const SYMBOLS = [
  { emoji: '🍒', name: 'cherry',  payout: 3,   weight: 28 },
  { emoji: '🍋', name: 'lemon',   payout: 4,   weight: 22 },
  { emoji: '🔔', name: 'bell',    payout: 6,   weight: 16 },
  { emoji: '💎', name: 'gem',     payout: 10,  weight: 10 },
  { emoji: '⭐', name: 'star',    payout: 15,  weight: 6 },
  { emoji: '7️⃣', name: 'seven',  payout: 50,  weight: 2 },
];

const BET_STEPS = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
const REEL_VISIBLE = 3;

const state = {
  balance: 1000,
  bet: 10,
  spinning: false,
  sound: true,
};

const $ = (id) => document.getElementById(id);
const reelEls = document.querySelectorAll('.reel');
const stripEls = Array.from(reelEls).map(r => r.querySelector('.strip'));
const balanceEl = $('balance');
const betValueEl = $('bet-value');
const spinBtn = $('spin-btn');
const betUp = $('bet-up');
const betDown = $('bet-down');
const buyBtn = $('buy-btn');
const soundBtn = $('sound-btn');
const winOverlay = $('win-overlay');
const winAmountEl = $('win-amount');
const machineEl = document.querySelector('.machine');
const balanceChip = document.querySelector('.balance-chip');

/* ---------- Audio ---------- */
let audioCtx;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function tone(freq, dur = 0.08, type = 'square', vol = 0.06, when = 0) {
  if (!state.sound) return;
  const ctx = ac();
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}
function sweep(f1, f2, dur, type = 'sawtooth', vol = 0.05) {
  if (!state.sound) return;
  const ctx = ac();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f1, t);
  osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}
const sfx = {
  click: () => tone(600, 0.04, 'square', 0.04),
  tick: () => tone(1200, 0.02, 'square', 0.03),
  stop: () => { tone(220, 0.08, 'square', 0.08); tone(180, 0.1, 'triangle', 0.05, 0.02); },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.08));
  },
  jackpot: () => {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.09));
    sweep(200, 2000, 0.6, 'sawtooth', 0.04);
  },
  loss: () => sweep(300, 120, 0.3, 'triangle', 0.05),
};

/* ---------- Reels ---------- */
let SYM_H = 140;
function measureSym() {
  const first = stripEls[0].querySelector('.symbol');
  if (first) SYM_H = first.getBoundingClientRect().height;
}

function sizeSymbols() {
  const reelH = reelEls[0].clientHeight;
  const h = reelH / REEL_VISIBLE;
  document.documentElement.style.setProperty('--sym-h', `${h}px`);
  document.documentElement.style.setProperty('--sym-font', `${Math.floor(h * 0.55)}px`);
  SYM_H = h;
}

function weightedPick() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[0];
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function makeSymbolEl(sym) {
  const div = document.createElement('div');
  div.className = 'symbol';
  div.textContent = sym.emoji;
  return div;
}

function initReels() {
  stripEls.forEach(strip => {
    strip.innerHTML = '';
    for (let i = 0; i < REEL_VISIBLE; i++) {
      strip.appendChild(makeSymbolEl(randomSymbol()));
    }
    strip.style.transform = 'translateY(0)';
  });
}

function buildSpinStrip(finalSym, extra = 18) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < extra; i++) frag.appendChild(makeSymbolEl(randomSymbol()));
  const target = makeSymbolEl(finalSym);
  target.classList.add('target');
  frag.appendChild(target);
  frag.appendChild(makeSymbolEl(randomSymbol()));
  frag.appendChild(makeSymbolEl(randomSymbol()));
  return { frag, targetIndex: extra };
}

function fmtMoney(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateUI() {
  balanceEl.textContent = fmtMoney(state.balance);
  betValueEl.textContent = fmtMoney(state.bet);
  spinBtn.disabled = state.spinning || state.balance < state.bet;
  betUp.disabled = state.spinning || BET_STEPS.indexOf(state.bet) >= BET_STEPS.length - 1;
  betDown.disabled = state.spinning || BET_STEPS.indexOf(state.bet) <= 0;
  buyBtn.disabled = state.spinning;
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function spin() {
  if (state.spinning || state.balance < state.bet) return;
  try { ac().resume(); } catch {}

  state.spinning = true;
  state.balance -= state.bet;
  balanceChip.classList.remove('flash-win', 'flash-loss');
  spinBtn.classList.add('spinning');
  machineEl.classList.remove('payline-on');
  winOverlay.classList.remove('show', 'jackpot');
  updateUI();
  sfx.click();

  const results = [weightedPick(), weightedPick(), weightedPick()];
  const reelInfo = [];

  stripEls.forEach((strip, i) => {
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0)';
    strip.innerHTML = '';
    const { frag, targetIndex } = buildSpinStrip(results[i]);
    strip.appendChild(frag);
    reelInfo.push({ targetIndex });
    reelEls[i].classList.remove('win');
  });

  // force reflow
  void machineEl.offsetHeight;

  const baseDur = 1100;
  const stagger = 350;

  stripEls.forEach((strip, i) => {
    const { targetIndex } = reelInfo[i];
    // Put target in the middle visible row
    const offset = (targetIndex - Math.floor(REEL_VISIBLE / 2)) * SYM_H;
    const dur = baseDur + i * stagger;
    strip.style.transition = `transform ${dur}ms cubic-bezier(0.16, 0.84, 0.24, 1)`;
    strip.style.transform = `translateY(-${offset}px)`;

    setTimeout(() => {
      sfx.stop();
      reelEls[i].dataset.settled = '1';
    }, dur);
  });

  await wait(baseDur + 2 * stagger + 80);

  evaluate(results);
  state.spinning = false;
  spinBtn.classList.remove('spinning');
  updateUI();
}

function evaluate(results) {
  const [a, b, c] = results;
  let winnings = 0;
  let jackpot = false;

  if (a.name === b.name && b.name === c.name) {
    winnings = state.bet * a.payout;
    jackpot = a.name === 'seven';
    reelEls.forEach(r => r.classList.add('win'));
  } else if (a.name === b.name || b.name === c.name || a.name === c.name) {
    const matchSym = a.name === b.name ? a : (b.name === c.name ? b : a);
    winnings = Math.floor(state.bet * (matchSym.payout / 4));
    [a, b, c].forEach((s, i) => {
      if (s.name === matchSym.name) reelEls[i].classList.add('win');
    });
  }

  if (winnings > 0) {
    machineEl.classList.add('payline-on');
    state.balance += winnings;
    balanceChip.classList.add('flash-win');
    winAmountEl.textContent = `+${fmtMoney(winnings)}`;
    winOverlay.classList.add('show');
    if (jackpot) {
      winOverlay.classList.add('jackpot');
      sfx.jackpot();
    } else {
      sfx.win();
    }
    countUpBalance(state.balance - winnings, state.balance, 700);
  } else {
    balanceChip.classList.add('flash-loss');
    sfx.loss();
  }
}

function countUpBalance(from, to, dur) {
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    balanceEl.textContent = fmtMoney(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
    else balanceEl.textContent = fmtMoney(to);
  }
  requestAnimationFrame(step);
}

/* ---------- Controls ---------- */
betUp.addEventListener('click', () => {
  const idx = BET_STEPS.indexOf(state.bet);
  if (idx < BET_STEPS.length - 1) {
    state.bet = BET_STEPS[idx + 1];
    sfx.tick();
    updateUI();
  }
});

betDown.addEventListener('click', () => {
  const idx = BET_STEPS.indexOf(state.bet);
  if (idx > 0) {
    state.bet = BET_STEPS[idx - 1];
    sfx.tick();
    updateUI();
  }
});

spinBtn.addEventListener('click', spin);

buyBtn.addEventListener('click', () => {
  state.balance += 1000;
  balanceChip.classList.remove('flash-loss');
  balanceChip.classList.add('flash-win');
  sfx.win();
  countUpBalance(state.balance - 1000, state.balance, 500);
  updateUI();
});

soundBtn.addEventListener('click', () => {
  state.sound = !state.sound;
  soundBtn.classList.toggle('muted', !state.sound);
  soundBtn.textContent = state.sound ? '♪' : '×';
  if (state.sound) sfx.tick();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); spin(); }
  else if (e.code === 'ArrowUp') { e.preventDefault(); betUp.click(); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); betDown.click(); }
});

window.addEventListener('resize', sizeSymbols);

/* ---------- Init ---------- */
requestAnimationFrame(() => {
  sizeSymbols();
  initReels();
  updateUI();
});
