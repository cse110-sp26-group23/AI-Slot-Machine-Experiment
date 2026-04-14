/* =========================================================================
   Slots — vanilla JS, three reels, staggered stop, polished feedback
   ========================================================================= */

/* ---------- Config ---------- */
const SYMBOLS = [
  { emoji: '🍒', name: 'cherry', payout: 3,  weight: 28 },
  { emoji: '🍋', name: 'lemon',  payout: 4,  weight: 22 },
  { emoji: '🔔', name: 'bell',   payout: 6,  weight: 16 },
  { emoji: '💎', name: 'gem',    payout: 10, weight: 10 },
  { emoji: '⭐', name: 'star',   payout: 15, weight: 6  },
  { emoji: '7️⃣', name: 'seven', payout: 50, weight: 2  },
];
const BET_STEPS    = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
const REEL_VISIBLE = 3;
const SPIN_BUFFER  = 26;       // off-screen symbols to spin through per reel
const SPIN_BASE_MS = 1400;
const SPIN_STAGGER = 380;

/* ---------- State ---------- */
const state = {
  balance: 1000,
  bet: 10,
  spinning: false,
  sound: true,
};

/* ---------- DOM refs ---------- */
const $ = (id) => document.getElementById(id);
const reelEls   = document.querySelectorAll('.reel');
const stripEls  = Array.from(reelEls).map(r => r.querySelector('.strip'));
const balanceEl = $('balance');
const betValueEl = $('bet-value');
const spinBtn   = $('spin-btn');
const betUp     = $('bet-up');
const betDown   = $('bet-down');
const buyBtn    = $('buy-btn');
const soundBtn  = $('sound-btn');
const winOverlay = $('win-overlay');
const winAmount  = $('win-amount');
const winLabel   = $('win-label');
const machineEl  = $('machine');
const balanceChip = $('balance-chip');
const fxCanvas   = $('fx');

/* ---------- Utilities ---------- */
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const fmt  = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pickRandom = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

function weightedPick() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[0];
}

/* ---------- Audio ---------- */
let audioCtx;
const ac = () => (audioCtx ||= new (window.AudioContext || window.webkitAudioContext)());

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
  osc.stop(t + dur + 0.02);
}

function sweep(f1, f2, dur, type = 'sawtooth', vol = 0.05) {
  if (!state.sound) return;
  const ctx = ac();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f1, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const sfx = {
  click: () => tone(620, 0.04, 'square', 0.05),
  tick:  () => tone(1200, 0.02, 'square', 0.03),
  spinStart: () => sweep(180, 520, 0.35, 'sawtooth', 0.04),
  stop:  () => { tone(210, 0.09, 'square', 0.09); tone(160, 0.11, 'triangle', 0.05, 0.015); },
  win:   () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.09, i * 0.08)),
  jackpot: () => {
    [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.17, 'triangle', 0.1, i * 0.08));
    sweep(220, 2200, 0.7, 'sawtooth', 0.04);
  },
  loss: () => sweep(320, 120, 0.3, 'triangle', 0.05),
};

/* ---------- Reel rendering ---------- */
function makeSymbol(sym) {
  const d = document.createElement('div');
  d.className = 'symbol';
  d.textContent = sym.emoji;
  return d;
}

function sizeSymbols() {
  const reelH = reelEls[0].clientHeight;
  if (!reelH) return;
  const h = reelH / REEL_VISIBLE;
  document.documentElement.style.setProperty('--sym-h', `${h}px`);
  document.documentElement.style.setProperty('--sym-font', `${Math.floor(h * 0.55)}px`);
}

function initReels() {
  stripEls.forEach(strip => {
    strip.innerHTML = '';
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0)';
    for (let i = 0; i < REEL_VISIBLE; i++) strip.appendChild(makeSymbol(pickRandom()));
  });
}

/* Build a strip so that the `finalSym` lands on the middle visible row
   after translating by -(targetIndex - middle) * symH. */
function buildSpinStrip(finalSym) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < SPIN_BUFFER; i++) frag.appendChild(makeSymbol(pickRandom()));
  const target = makeSymbol(finalSym);
  target.classList.add('target');
  frag.appendChild(target);
  // Padding below so the target can sit in the middle with symbols above/below.
  for (let i = 0; i < REEL_VISIBLE; i++) frag.appendChild(makeSymbol(pickRandom()));
  return { frag, targetIndex: SPIN_BUFFER };
}

/* ---------- UI ---------- */
function updateUI() {
  balanceEl.textContent = fmt(state.balance);
  betValueEl.textContent = fmt(state.bet);
  const idx = BET_STEPS.indexOf(state.bet);
  spinBtn.disabled = state.spinning || state.balance < state.bet;
  betUp.disabled   = state.spinning || idx >= BET_STEPS.length - 1;
  betDown.disabled = state.spinning || idx <= 0;
  buyBtn.disabled  = state.spinning;
}

function countUp(el, from, to, dur = 700) {
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Particles (win burst) ---------- */
const particles = [];
let fxRunning = false;
const fxCtx = fxCanvas.getContext('2d');

function sizeFx() {
  const r = machineEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  fxCanvas.width  = r.width  * dpr;
  fxCanvas.height = r.height * dpr;
  fxCanvas.style.width  = r.width  + 'px';
  fxCanvas.style.height = r.height + 'px';
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function burst(x, y, count = 40, palette = ['#ffc341', '#ffdd6b', '#fff', '#ff9d3a']) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(2, 7);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - rand(1, 3),
      g: 0.18,
      life: 1,
      decay: rand(0.012, 0.022),
      size: rand(3, 6),
      color: palette[Math.floor(Math.random() * palette.length)],
    });
  }
  if (!fxRunning) { fxRunning = true; requestAnimationFrame(tickFx); }
}

function tickFx() {
  const w = fxCanvas.clientWidth, h = fxCanvas.clientHeight;
  fxCtx.clearRect(0, 0, w, h);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    fxCtx.globalAlpha = Math.max(0, p.life);
    fxCtx.fillStyle = p.color;
    fxCtx.beginPath();
    fxCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    fxCtx.fill();
  }
  fxCtx.globalAlpha = 1;
  if (particles.length) requestAnimationFrame(tickFx);
  else fxRunning = false;
}

function celebrate(jackpot) {
  const r = machineEl.getBoundingClientRect();
  const cx = r.width / 2, cy = r.height / 2;
  burst(cx, cy, jackpot ? 90 : 50);
  if (jackpot) {
    const reels = machineEl.querySelectorAll('.reel');
    reels.forEach((reel, i) => {
      const rr = reel.getBoundingClientRect();
      const mx = rr.left - r.left + rr.width / 2;
      const my = rr.top  - r.top  + rr.height / 2;
      setTimeout(() => burst(mx, my, 45, ['#00e701', '#ffc341', '#fff']), 180 + i * 120);
    });
  }
}

/* ---------- Spin ---------- */
async function spin() {
  if (state.spinning || state.balance < state.bet) return;
  try { ac().resume(); } catch {}

  state.spinning = true;
  state.balance -= state.bet;
  balanceChip.classList.remove('flash-win', 'flash-loss');
  spinBtn.classList.add('spinning');
  machineEl.classList.remove('payline-on');
  winOverlay.classList.remove('show', 'jackpot');
  reelEls.forEach(r => r.classList.remove('win'));
  updateUI();
  sfx.click();
  sfx.spinStart();

  const results = [weightedPick(), weightedPick(), weightedPick()];

  // Prepare strips
  const symH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sym-h')) || 140;
  const targetOffsets = results.map((sym) => {
    const { targetIndex } = { targetIndex: SPIN_BUFFER };
    return (targetIndex - Math.floor(REEL_VISIBLE / 2)) * symH;
  });

  stripEls.forEach((strip, i) => {
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0)';
    strip.innerHTML = '';
    const { frag } = buildSpinStrip(results[i]);
    strip.appendChild(frag);
  });

  // Force reflow so the transition applies from a fresh starting state.
  void machineEl.offsetHeight;

  // Schedule stops with staggered timing and tick-per-reel SFX at settle.
  const stopPromises = stripEls.map((strip, i) => new Promise(resolve => {
    const dur = SPIN_BASE_MS + i * SPIN_STAGGER;
    // Ease-out cubic-bezier tuned to feel like a heavy wheel decelerating.
    strip.style.transition = `transform ${dur}ms cubic-bezier(0.12, 0.82, 0.22, 1.0)`;
    requestAnimationFrame(() => {
      strip.style.transform = `translateY(-${targetOffsets[i]}px)`;
    });
    setTimeout(() => { sfx.stop(); resolve(); }, dur);
  }));

  await Promise.all(stopPromises);
  await wait(120);

  evaluate(results);
  state.spinning = false;
  spinBtn.classList.remove('spinning');
  updateUI();
}

/* ---------- Evaluate ---------- */
function evaluate(results) {
  const [a, b, c] = results;
  let winnings = 0;
  let jackpot = false;

  if (a.name === b.name && b.name === c.name) {
    winnings = state.bet * a.payout;
    jackpot = a.name === 'seven';
    reelEls.forEach(r => r.classList.add('win'));
  } else {
    // Any two adjacent match -> smaller pay
    const pairSym = (a.name === b.name) ? a : (b.name === c.name) ? b : null;
    if (pairSym) {
      winnings = Math.max(1, Math.floor(state.bet * (pairSym.payout / 5)));
      [a, b, c].forEach((s, i) => { if (s.name === pairSym.name) reelEls[i].classList.add('win'); });
    }
  }

  if (winnings > 0) {
    machineEl.classList.add('payline-on');
    const prev = state.balance;
    state.balance += winnings;
    balanceChip.classList.add('flash-win');
    winLabel.textContent = jackpot ? 'JACKPOT' : (winnings >= state.bet * 10 ? 'BIG WIN' : 'WIN');
    winAmount.textContent = `+${fmt(winnings)}`;
    winOverlay.classList.toggle('jackpot', jackpot);
    winOverlay.classList.add('show');
    (jackpot ? sfx.jackpot : sfx.win)();
    celebrate(jackpot);
    countUp(balanceEl, prev, state.balance, 800);
  } else {
    balanceChip.classList.add('flash-loss');
    sfx.loss();
  }
}

/* ---------- Controls ---------- */
function changeBet(dir) {
  const idx = BET_STEPS.indexOf(state.bet);
  const next = idx + dir;
  if (next < 0 || next >= BET_STEPS.length) return;
  state.bet = BET_STEPS[next];
  sfx.tick();
  updateUI();
}

betUp.addEventListener('click',   () => changeBet(+1));
betDown.addEventListener('click', () => changeBet(-1));
spinBtn.addEventListener('click', spin);

buyBtn.addEventListener('click', () => {
  if (state.spinning) return;
  const prev = state.balance;
  state.balance += 1000;
  balanceChip.classList.remove('flash-loss');
  balanceChip.classList.add('flash-win');
  sfx.win();
  countUp(balanceEl, prev, state.balance, 500);
  updateUI();
});

soundBtn.addEventListener('click', () => {
  state.sound = !state.sound;
  soundBtn.classList.toggle('muted', !state.sound);
  soundBtn.textContent = state.sound ? '♪' : '×';
  if (state.sound) { try { ac().resume(); } catch {} sfx.tick(); }
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); spin(); }
  else if (e.code === 'ArrowUp')   { e.preventDefault(); changeBet(+1); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); changeBet(-1); }
});

window.addEventListener('resize', () => { sizeSymbols(); sizeFx(); });

/* ---------- Init ---------- */
requestAnimationFrame(() => {
  sizeSymbols();
  sizeFx();
  initReels();
  updateUI();
});
