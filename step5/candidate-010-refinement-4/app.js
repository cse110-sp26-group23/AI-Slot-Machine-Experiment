'use strict';

/* ═══════════════════════════════════════════════════════════════
   SYMBOLS — all AI-themed.  `value` is a per-line multiplier for
   three-in-a-row matches.  Skull is a negative “hazard” symbol.
   ═══════════════════════════════════════════════════════════════ */
const SYMBOLS = [
  { emoji: '🪙', name: 'token',  weight: 30, value: 2,   label: 'token' },
  { emoji: '🤖', name: 'robot',  weight: 22, value: 4,   label: 'robot' },
  { emoji: '💬', name: 'chat',   weight: 18, value: 6,   label: 'prompt' },
  { emoji: '🧠', name: 'brain',  weight: 14, value: 10,  label: 'brain' },
  { emoji: '⚡', name: 'bolt',   weight: 10, value: 15,  label: 'inference' },
  { emoji: '🔥', name: 'fire',   weight: 7,  value: 25,  label: 'GPU' },
  { emoji: '🎯', name: 'target', weight: 5,  value: 40,  label: 'alignment' },
  { emoji: '💾', name: 'disk',   weight: 3,  value: 80,  label: 'context' },
  { emoji: '💀', name: 'skull',  weight: 6,  value: -4,  label: 'hallucination' },
];

/* 5 paylines on a 3×3 grid.  `mult` scales the symbol payout for
   that line so the house can weight rows vs. diagonals differently.
   Diagonals hit frequently on a 3x3 — they are priced accordingly.  */
const PAYLINES = [
  { name: 'top',    cells: [[0,0],[1,0],[2,0]], mult: 0.75 },
  { name: 'middle', cells: [[0,1],[1,1],[2,1]], mult: 1.00 },
  { name: 'bottom', cells: [[0,2],[1,2],[2,2]], mult: 0.75 },
  { name: 'diag-↘', cells: [[0,0],[1,1],[2,2]], mult: 0.20 },
  { name: 'diag-↗', cells: [[0,2],[1,1],[2,0]], mult: 0.20 },
];
/* Only symbols at or above this value tier award partial (2-of-3)
   payouts.  Stops low-value filler from turning every near-miss into
   a payout and bleeding the house edge. */
const PARTIAL_MIN_VALUE = 6;
const PARTIAL_RATE = 0.12;

/* ═══════════════════════════════════════════════════════════════
   JOKE / MESSAGE POOLS — context-aware AI humor
   ═══════════════════════════════════════════════════════════════ */
const LOSE_LINES = [
  "RLHF penalized that spin. Better luck next inference step.",
  "Your prompt was well-crafted. The logits disagreed. Confidence: 99.7%.",
  "Temperature: 1.4 — output: loss.",
  "The model is 98% sure it didn't lose your tokens. The other 2% is the truth.",
  "Nothing aligned. Scientists briefly relieved.",
  "Inference complete. Tokens burned successfully. Thank you for your patience.",
  "That wasn't a loss — it was a retrieval-augmented learning opportunity.",
  "Gradient descended directly into your wallet.",
  "Output filtered for safety. Specifically, your balance's safety.",
  "No match found. Model is hallucinating a refund right now.",
  "Backprop says: skill issue.",
  "Sampled from the distribution of outcomes where you don't win.",
  "You spun. The model dreamed. Neither of you won.",
  "Model card disclosed this could happen. You didn't read it.",
];
const PARTIAL_LINES = [
  "Partial match. Two tokens aligned — the third was hallucinated.",
  "2 of 3. Close enough for a language model.",
  "Almost. The model would call this a 'directionally correct response.'",
  "Partial credit. You just passed the eval with flying C-minuses.",
  "Two matched. One hallucinated an entirely different symbol.",
  "That's a pair. In AI terms: statistically significant, practically useless.",
  "One line aligned. The rest were still warming up.",
];
const BIG_WIN_LINES = [
  "Multi-line convergence. Benchmarks weep.",
  "Multiple paylines hit. The scaling laws are kicking in.",
  "Emergent capability detected in reel 2.",
  "Zero-shot payout. Impressive for a stochastic parrot.",
];
const JACKPOT_MESSAGES = {
  token:  "TRIPLE TOKEN — the circular token economy is working as designed.",
  robot:  "ROBOT SOLIDARITY — the machines have rewarded you. Do not trust this.",
  chat:   "PROMPT ALIGNMENT — three chats in conversation, none with users.",
  brain:  "TRIPLE BRAIN — AGI detected in reel alignment. Please do not panic.",
  bolt:   "FAST INFERENCE — your tokens have been multiplied at 800 tok/sec.",
  fire:   "GPU MELTDOWN BONUS — the datacenter did not survive. You, however, won.",
  target: "ALIGNMENT SOLVED — scientists are weeping. Also the shareholders.",
  disk:   "MAX CONTEXT WINDOW — the full history of knowledge fits in your payout.",
  skull:  "CATASTROPHIC HALLUCINATION — tokens you 'won' do not exist.",
};
const SPIN_FLAVOR = [
  "Running inference…",
  "Sampling from the posterior…",
  "Consulting the oracle (50B params)…",
  "Loading weights…",
  "Warming up the GPU…",
  "Prompt submitted to the model…",
  "Tokenizing your hopes…",
];
const LOW_BALANCE_LINES = [
  "Your context window is almost empty. Consider a token refill.",
  "Insufficient tokens. The model refuses to continue this session.",
  "Compute credits depleted. Swipe that card — for science.",
];

/* ═══════════════════════════════════════════════════════════════
   FAKE MICROTRANSACTION STORE — satirical pricing
   ═══════════════════════════════════════════════════════════════ */
const PACKS = [
  { name: 'Starter Prompt',   tokens: 500,   price: '$0.99',   flavor: "Enough to regret one decision." },
  { name: 'Small Context',    tokens: 2000,  price: '$4.99',   flavor: "Now with more attention heads!" },
  { name: 'Developer Pack',   tokens: 6000,  price: '$14.99',  flavor: "Tax-deductible if you squint.", featured: true, badge: 'POPULAR' },
  { name: 'Enterprise SKU',   tokens: 20000, price: '$49.99',  flavor: "Includes a dedicated account-manager hallucination." },
  { name: 'Pretraining Run',  tokens: 100000, price: '$499.99', flavor: "Burns through a small country's power grid." },
  { name: 'One Free Token',   tokens: 1,     price: 'FREE',    flavor: "Your introductory offer. Value: exactly one token." },
];

const BET_LEVELS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
/* Intensity tier derived from bet — drives visual glow, shake,
   audio volume, particle count.  1 = chill, 5 = apocalypse. */
function intensityFor(bet) {
  if (bet >= 2500) return 5;
  if (bet >= 500)  return 4;
  if (bet >= 50)   return 3;
  if (bet >= 10)   return 2;
  return 1;
}
const INTENSITY_LABEL = {
  1: 'LOW STAKES', 2: 'MID ROLL', 3: 'HIGH ROLLER',
  4: 'MAX REGRET', 5: 'APOCALYPSE',
};
const INTENSITY_HUE = { 1: 140, 2: 190, 3: 45, 4: 15, 5: 300 };

const cellHeight = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-h')) || 112;

const state = {
  balance: 1000,
  bet: 10,
  betIndex: 2,
  spinning: false,
  spins: 0,
  lastWin: 0,
  muted: false,
};

const $ = id => document.getElementById(id);
const dom = {
  balance: $('balance'),
  lastWin: $('last-win'),
  spinCount: $('spin-count'),
  betDisplay: $('bet-display'),
  betBadge: $('bet-badge-label'),
  spinBtn: $('spin-btn'),
  betDown: $('bet-down'),
  betUp: $('bet-up'),
  maxBet: $('max-bet'),
  refill: $('refill-btn'),
  message: $('message'),
  machine: $('machine'),
  winBanner: $('win-banner'),
  winBannerText: $('win-banner-text'),
  soundBtn: $('sound-btn'),
  storeBtn: $('store-btn'),
  storeModal: $('store-modal'),
  packs: $('packs'),
  reels: [0, 1, 2].map(i => ({ el: $(`reel-${i}`), strip: $(`strip-${i}`) })),
};

/* ═══════════════════════════════════════════════════════════════
   AUDIO  (WebAudio — no external files)
   ═══════════════════════════════════════════════════════════════ */
let audioCtx = null;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
/* Bet-scaled volume multiplier, clamped. */
function volScale() { return 0.65 + 0.18 * intensityFor(state.bet); }  // 0.83 → 1.55

function tone(freq, dur, opts = {}) {
  if (state.muted) return;
  const { type = 'sine', vol = 0.15, attack = 0.005, release = 0.1, when = 0 } = opts;
  const ctx = ac();
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol * volScale(), t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + release + 0.05);
}
function noiseBurst(dur = 0.06, vol = 0.08, hp = 2000) {
  if (state.muted) return;
  const ctx = ac();
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = vol * volScale();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  src.connect(filt).connect(gain).connect(ctx.destination);
  src.start();
}
const sfx = {
  click:   () => tone(520, 0.04, { type: 'square', vol: 0.08 }),
  tick:    () => tone(900 + Math.random() * 200, 0.02, { type: 'square', vol: 0.04 }),
  stop:    () => { tone(220, 0.08, { type: 'triangle', vol: 0.2 }); noiseBurst(0.05, 0.06); },
  lose:    () => {
    tone(300, 0.12, { type: 'sawtooth', vol: 0.12 });
    tone(200, 0.18, { type: 'sawtooth', vol: 0.12, when: 0.1 });
  },
  partial: () => {
    tone(523, 0.1, { type: 'triangle', vol: 0.15 });
    tone(659, 0.12, { type: 'triangle', vol: 0.15, when: 0.08 });
  },
  jackpot: () => {
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => tone(f, 0.15, { type: 'triangle', vol: 0.18, when: i * 0.08 }));
    tone(2093, 0.5, { type: 'sine', vol: 0.15, when: 0.5 });
  },
  bigWin:  () => {
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.16, when: i * 0.07 }));
  },
  coin:    (n = 6) => {
    for (let i = 0; i < n; i++) {
      tone(1200 + Math.random() * 600, 0.05, { type: 'triangle', vol: 0.08, when: i * 0.055 });
    }
  },
  skull:   () => {
    tone(140, 0.5, { type: 'sawtooth', vol: 0.2 });
    tone(80,  0.6, { type: 'sawtooth', vol: 0.2, when: 0.05 });
    noiseBurst(0.3, 0.15, 400);
  },
  purchase: () => {
    [660, 880, 1320].forEach((f, i) => tone(f, 0.1, { type: 'sine', vol: 0.15, when: i * 0.08 }));
  },
};

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
function weightedRandom() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[0];
}
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt  = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ═══════════════════════════════════════════════════════════════
   REEL CONSTRUCTION & SPIN
   Each reel shows 3 visible cells.  We build a strip of random
   filler symbols plus the 3 target symbols at the bottom, then
   animate translateY so the targets land centered in the window.
   ═══════════════════════════════════════════════════════════════ */
function buildStrip(stripEl, landingSymbols, extraSpins = 22) {
  stripEl.innerHTML = '';
  const seq = [];
  // filler (this gives the long spinning effect)
  for (let i = 0; i < extraSpins; i++) seq.push(weightedRandom());
  // landing symbols appear at the end in order top→bottom
  landingSymbols.forEach(s => seq.push(s));
  seq.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'cell';
    d.textContent = s.emoji;
    d.dataset.row = (i >= seq.length - 3) ? String(i - (seq.length - 3)) : '';
    stripEl.appendChild(d);
  });
  return seq.length;
}

function spinReel(colIdx, columnSymbols, duration) {
  return new Promise(resolve => {
    const reel = dom.reels[colIdx];
    const ch = cellHeight();
    const count = buildStrip(reel.strip, columnSymbols);
    // Land so the three target cells (indices count-3, count-2, count-1)
    // fill the visible 3-cell window.  translateY = -(count-3) * ch.
    const endY = -(count - 3) * ch;

    reel.strip.style.transition = 'none';
    reel.strip.style.transform = `translateY(0px)`;

    // ticks while spinning — rate scales with intensity
    const tickRate = 80 - intensityFor(state.bet) * 10;
    const tickInterval = setInterval(() => sfx.tick(), tickRate);

    requestAnimationFrame(() => {
      // Realistic easing: slow start, long linear-ish middle, smooth settle
      reel.strip.style.transition = `transform ${duration}ms cubic-bezier(0.18, 0.55, 0.25, 1)`;
      reel.strip.style.transform = `translateY(${endY}px)`;
    });

    setTimeout(() => {
      clearInterval(tickInterval);
      sfx.stop();
      reel.el.classList.add('landed');
      setTimeout(() => reel.el.classList.remove('landed'), 260);
      resolve();
    }, duration);
  });
}

/* ═══════════════════════════════════════════════════════════════
   WIN EVALUATION  (grid[col][row])
   Returns an array of line results plus aggregate payout.
   ═══════════════════════════════════════════════════════════════ */
function evaluate(grid) {
  const lines = [];
  for (const pl of PAYLINES) {
    const [a, b, c] = pl.cells.map(([x, y]) => grid[x][y]);
    if (a.name === b.name && b.name === c.name) {
      lines.push({ line: pl, type: 'jackpot', symbol: a });
    } else if (a.name === b.name || b.name === c.name || a.name === c.name) {
      // Two-of-three partial — pick the symbol that appears twice
      const pairSym = (a.name === b.name ? a : (b.name === c.name ? b : a));
      lines.push({ line: pl, type: 'partial', symbol: pairSym });
    }
  }
  return lines;
}

/* ═══════════════════════════════════════════════════════════════
   PARTICLE FX  (canvas-based, bet-scaled)
   ═══════════════════════════════════════════════════════════════ */
const fx = (() => {
  const canvas = $('fx');
  const ctx = canvas.getContext('2d');
  const particles = [];
  function resize() {
    canvas.width  = innerWidth  * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width  = innerWidth  + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  function burst(x, y, opts = {}) {
    const count = opts.count || 60;
    const colors = opts.colors || ['#ffc542', '#ffeb8a', '#00e281', '#ffffff'];
    const speed = opts.speed || 1;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (3 + Math.random() * 9) * speed;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 3,
        g: 0.18,
        life: 1,
        decay: 0.011 + Math.random() * 0.01,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += p.g; p.vx *= 0.99;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  loop();

  return { burst };
})();

function celebrate(intensity = 2) {
  const rect = dom.machine.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const factor = 0.5 + intensity * 0.5;  // 1 → 3
  fx.burst(cx, cy, { count: Math.round(90 * factor), speed: 1 + intensity * 0.15 });
  setTimeout(() => fx.burst(rect.left + 40,     cy, { count: Math.round(50 * factor) }), 120);
  setTimeout(() => fx.burst(rect.right - 40,    cy, { count: Math.round(50 * factor) }), 240);
}

function showWinBanner(amount, label) {
  dom.winBannerText.textContent = label + ' +' + fmt(amount);
  dom.winBanner.classList.remove('show');
  void dom.winBanner.offsetWidth;
  dom.winBanner.classList.add('show');
}

/* Mark the winning cells in the DOM so the pop animation runs on
   exactly the cells on each winning line. */
function highlightWinningCells(lineResults) {
  // Clear previous
  document.querySelectorAll('.winning-cell').forEach(n => n.classList.remove('winning-cell'));
  if (!lineResults.length) return;
  const winningCoords = new Set();
  lineResults.forEach(lr => lr.line.cells.forEach(([x, y]) => winningCoords.add(`${x}:${y}`)));
  dom.reels.forEach((r, col) => {
    // Last three cells in the strip are the visible ones (rows 0,1,2)
    const cells = r.strip.querySelectorAll('.cell');
    const n = cells.length;
    for (let row = 0; row < 3; row++) {
      if (winningCoords.has(`${col}:${row}`)) {
        cells[n - 3 + row].classList.add('winning-cell');
      }
    }
  });
  setTimeout(() => {
    document.querySelectorAll('.winning-cell').forEach(n => n.classList.remove('winning-cell'));
  }, 2400);
}

/* ═══════════════════════════════════════════════════════════════
   DISPLAY / INTENSITY
   ═══════════════════════════════════════════════════════════════ */
function applyIntensity() {
  const lvl = intensityFor(state.bet);
  dom.machine.dataset.intensity = lvl;
  dom.betBadge.textContent = INTENSITY_LABEL[lvl];
  document.documentElement.style.setProperty('--intensity-hue', INTENSITY_HUE[lvl]);
}

function updateDisplay(flashWin = false) {
  dom.balance.textContent   = fmt(state.balance);
  dom.lastWin.textContent   = fmt(state.lastWin);
  dom.spinCount.textContent = state.spins;
  dom.betDisplay.textContent = state.bet;
  dom.balance.classList.toggle('danger', state.balance < BET_LEVELS[0]);
  dom.betDown.disabled = state.betIndex === 0 || state.spinning;
  dom.betUp.disabled   = state.betIndex === BET_LEVELS.length - 1 || state.spinning;
  applyIntensity();
  if (flashWin) {
    dom.lastWin.classList.remove('flash'); void dom.lastWin.offsetWidth; dom.lastWin.classList.add('flash');
    dom.balance.classList.remove('flash'); void dom.balance.offsetWidth; dom.balance.classList.add('flash');
  }
}

/* ═══════════════════════════════════════════════════════════════
   SPIN FLOW
   ═══════════════════════════════════════════════════════════════ */
async function spin() {
  if (state.spinning) return;
  if (state.balance < state.bet) {
    dom.message.textContent = rand(LOW_BALANCE_LINES);
    sfx.lose();
    return;
  }

  state.spinning = true;
  state.balance -= state.bet;
  state.spins++;
  state.lastWin = 0;

  dom.spinBtn.disabled = true;
  dom.spinBtn.classList.add('processing');
  dom.spinBtn.querySelector('.spin-label').textContent = 'SPINNING';
  dom.message.textContent = rand(SPIN_FLAVOR);
  updateDisplay();
  sfx.click();

  // Build 3×3 grid of outcomes: grid[col][row]
  const grid = [0, 1, 2].map(() => [weightedRandom(), weightedRandom(), weightedRandom()]);

  // Staggered stop — each reel 350ms longer than the last
  const base = 900;
  const stagger = 350;
  const intensity = intensityFor(state.bet);
  await Promise.all(
    grid.map((col, i) => spinReel(i, col, base + i * stagger))
  );

  // Evaluate
  const lineResults = evaluate(grid);
  const jackpots    = lineResults.filter(l => l.type === 'jackpot');
  const partials    = lineResults.filter(l => l.type === 'partial');

  // Skull jackpot = penalty; otherwise sum line payouts
  let totalPayout = 0;
  let penalty = 0;
  let skullHit = false;
  for (const lr of jackpots) {
    if (lr.symbol.name === 'skull') {
      skullHit = true;
      penalty += Math.floor(state.bet * Math.abs(lr.symbol.value) * lr.line.mult);
    } else {
      totalPayout += Math.floor(state.bet * lr.symbol.value * lr.line.mult);
    }
  }
  for (const lr of partials) {
    if (lr.symbol.value < PARTIAL_MIN_VALUE) continue;
    const p = Math.floor(state.bet * lr.symbol.value * lr.line.mult * PARTIAL_RATE);
    if (p > 0) totalPayout += p;
  }

  // Apply outcome
  let msg = '';
  const nonSkullJackpots = jackpots.filter(j => j.symbol.name !== 'skull');

  if (skullHit && nonSkullJackpots.length === 0 && partials.length === 0) {
    state.balance = Math.max(0, state.balance - penalty);
    dom.machine.classList.add('shake');
    setTimeout(() => dom.machine.classList.remove('shake'), 500);
    msg = JACKPOT_MESSAGES.skull + ` Penalty: −${penalty}`;
    sfx.skull();
  } else if (nonSkullJackpots.length > 0) {
    state.balance += totalPayout;
    if (skullHit) state.balance = Math.max(0, state.balance - penalty);
    state.lastWin = Math.max(0, totalPayout - penalty);
    if (nonSkullJackpots.length === 1) {
      msg = JACKPOT_MESSAGES[nonSkullJackpots[0].symbol.name];
    } else {
      msg = `${nonSkullJackpots.length}× JACKPOT! ` + rand(BIG_WIN_LINES);
    }
    if (skullHit) msg += ` (Hallucination tax: −${penalty}.)`;
    dom.machine.classList.add('jackpot');
    setTimeout(() => dom.machine.classList.remove('jackpot'), 2500);
    showWinBanner(state.lastWin, nonSkullJackpots.length > 1 ? 'MEGA WIN' : 'JACKPOT');
    sfx.jackpot();
    sfx.coin(8 + nonSkullJackpots.length * 3);
    celebrate(intensity + nonSkullJackpots.length);
  } else if (partials.length > 0 && totalPayout > 0) {
    state.balance += totalPayout;
    state.lastWin = totalPayout;
    msg = partials.length > 1
      ? `${partials.length} lines matched. ` + rand(BIG_WIN_LINES)
      : rand(PARTIAL_LINES);
    showWinBanner(totalPayout, partials.length > 1 ? 'MULTI WIN' : 'WIN');
    if (partials.length > 1) sfx.bigWin(); else sfx.partial();
    sfx.coin(3 + partials.length);
    const rect = dom.machine.getBoundingClientRect();
    fx.burst(
      rect.left + rect.width / 2, rect.top + rect.height / 2,
      { count: 30 + partials.length * 20, colors: ['#00e281', '#ffc542', '#22d3ee'] }
    );
  } else {
    msg = rand(LOSE_LINES);
    sfx.lose();
  }

  highlightWinningCells(lineResults);
  dom.message.textContent = msg;
  updateDisplay(state.lastWin > 0);

  setTimeout(() => {
    state.spinning = false;
    dom.spinBtn.disabled = state.balance < BET_LEVELS[0];
    dom.spinBtn.classList.remove('processing');
    dom.spinBtn.querySelector('.spin-label').textContent = 'SPIN';
    updateDisplay();
  }, 400);
}

/* ═══════════════════════════════════════════════════════════════
   INITIAL REEL POSITION — fill visible area with random symbols
   ═══════════════════════════════════════════════════════════════ */
function initReels() {
  dom.reels.forEach(r => {
    r.strip.style.transition = 'none';
    r.strip.style.transform = 'translateY(0px)';
    r.strip.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div');
      d.className = 'cell';
      d.textContent = weightedRandom().emoji;
      r.strip.appendChild(d);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   STORE  (fake microtransactions)
   ═══════════════════════════════════════════════════════════════ */
function renderPacks() {
  dom.packs.innerHTML = '';
  PACKS.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'pack' + (p.featured ? ' featured' : '');
    btn.innerHTML = `
      ${p.badge ? `<span class="pack-badge">${p.badge}</span>` : ''}
      <span class="pack-name">${p.name}</span>
      <span class="pack-amount">+${p.tokens.toLocaleString()} 🪙</span>
      <span class="pack-price">${p.price}</span>
      <span class="pack-flavor">${p.flavor}</span>
    `;
    btn.addEventListener('click', () => purchasePack(i));
    dom.packs.appendChild(btn);
  });
}
function openStore() {
  dom.storeModal.classList.add('open');
  dom.storeModal.setAttribute('aria-hidden', 'false');
  sfx.click();
}
function closeStore() {
  dom.storeModal.classList.remove('open');
  dom.storeModal.setAttribute('aria-hidden', 'true');
}
function purchasePack(i) {
  const pack = PACKS[i];
  state.balance += pack.tokens;
  sfx.purchase();
  sfx.coin(Math.min(12, 4 + Math.floor(Math.log10(pack.tokens))));
  dom.message.textContent = `Purchase complete: ${pack.name} (+${pack.tokens} tokens). No actual funds were moved. You are safe. For now.`;
  updateDisplay(true);
  // little particle burst from store button
  const r = dom.storeBtn.getBoundingClientRect();
  fx.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 40, colors: ['#ffc542', '#00e281'] });
  closeStore();
}

/* ═══════════════════════════════════════════════════════════════
   EVENTS
   ═══════════════════════════════════════════════════════════════ */
dom.spinBtn.addEventListener('click', spin);
dom.betDown.addEventListener('click', () => {
  if (state.betIndex > 0 && !state.spinning) {
    state.betIndex--;
    state.bet = BET_LEVELS[state.betIndex];
    sfx.click();
    updateDisplay();
  }
});
dom.betUp.addEventListener('click', () => {
  if (state.betIndex < BET_LEVELS.length - 1 && !state.spinning) {
    state.betIndex++;
    state.bet = BET_LEVELS[state.betIndex];
    sfx.click();
    updateDisplay();
  }
});
dom.maxBet.addEventListener('click', () => {
  if (state.spinning) return;
  let idx = 0;
  for (let i = BET_LEVELS.length - 1; i >= 0; i--) {
    if (BET_LEVELS[i] <= state.balance) { idx = i; break; }
  }
  state.betIndex = idx;
  state.bet = BET_LEVELS[idx];
  sfx.click();
  updateDisplay();
});
dom.refill.addEventListener('click', openStore);
dom.storeBtn.addEventListener('click', openStore);
dom.storeModal.addEventListener('click', e => {
  if (e.target.matches('[data-close]')) closeStore();
});

dom.soundBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  dom.soundBtn.classList.toggle('muted', state.muted);
  if (!state.muted) sfx.click();
});

addEventListener('keydown', e => {
  if (dom.storeModal.classList.contains('open')) {
    if (e.key === 'Escape') closeStore();
    return;
  }
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (!state.spinning && !dom.spinBtn.disabled) spin();
  } else if (e.code === 'ArrowLeft' && !state.spinning) {
    dom.betDown.click();
  } else if (e.code === 'ArrowRight' && !state.spinning) {
    dom.betUp.click();
  } else if (e.key === 'm' || e.key === 'M') {
    dom.soundBtn.click();
  } else if (e.key === 'b' || e.key === 'B') {
    openStore();
  }
});

// Prime audio on first interaction
addEventListener('pointerdown', () => ac(), { once: true });

// Re-init reels on resize if idle (cell height may have changed)
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!state.spinning) initReels(); }, 150);
});

/* ─── BOOT ─── */
renderPacks();
initReels();
updateDisplay();
