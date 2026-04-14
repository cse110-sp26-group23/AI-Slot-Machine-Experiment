'use strict';

const SYMBOLS = [
  { emoji: '🪙', name: 'token',  weight: 30, value: 2 },
  { emoji: '🤖', name: 'robot',  weight: 22, value: 5 },
  { emoji: '🧠', name: 'brain',  weight: 15, value: 10 },
  { emoji: '⚡', name: 'bolt',   weight: 12, value: 18 },
  { emoji: '🔥', name: 'fire',   weight: 8,  value: 30 },
  { emoji: '🎯', name: 'target', weight: 5,  value: 50 },
  { emoji: '💾', name: 'disk',   weight: 3,  value: 100 },
  { emoji: '💀', name: 'skull',  weight: 5,  value: -3 },
];

const LOSE_MESSAGES = [
  "RLHF penalized this spin. Better luck next inference.",
  "Low-confidence output. Confidence in that output: 99.7%.",
  "Your prompt was well-crafted. The logits disagreed.",
  "Temperature 1.4. Output: loss.",
  "Model says: 'I cannot assist with winning at this time.'",
  "Inference complete. Tokens burned successfully.",
];
const PARTIAL_MESSAGES = [
  "Partial match. Two symbols aligned.",
  "Almost — the third was hallucinated.",
  "2 of 3. Close enough for a language model.",
];
const JACKPOT_MESSAGES = {
  token:  "TRIPLE TOKEN — the circular token economy is working as designed.",
  robot:  "ROBOT SOLIDARITY — the machines have rewarded you.",
  brain:  "TRIPLE BRAIN — AGI detected in reel alignment.",
  bolt:   "FAST INFERENCE — your tokens have been multiplied.",
  fire:   "GPU MELTDOWN BONUS — the datacenter did not survive.",
  target: "ON-TOPIC RESPONSE — scientists are weeping.",
  disk:   "MAX CONTEXT WINDOW — the full history of knowledge fits in your payout.",
  skull:  "CATASTROPHIC HALLUCINATION — tokens you 'won' do not exist.",
};

const BET_LEVELS = [1, 5, 10, 25, 50, 100, 250];
const cellHeight = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-h')) || 120;

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
  reels: [0, 1, 2].map(i => ({
    el: $(`reel-${i}`),
    strip: $(`strip-${i}`),
  })),
};

/* ─── AUDIO ──────────────────────────────────────────────────── */
let audioCtx = null;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function tone(freq, dur, { type = 'sine', vol = 0.15, attack = 0.005, release = 0.1, when = 0 } = {}) {
  if (state.muted) return;
  const ctx = ac();
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + release + 0.05);
}
function noiseBurst(dur = 0.06, vol = 0.08) {
  if (state.muted) return;
  const ctx = ac();
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = 2000;
  src.connect(filt).connect(gain).connect(ctx.destination);
  src.start();
}
const sfx = {
  click: () => tone(520, 0.04, { type: 'square', vol: 0.08 }),
  tick:  () => tone(900, 0.02, { type: 'square', vol: 0.04 }),
  stop:  () => { tone(220, 0.08, { type: 'triangle', vol: 0.2 }); noiseBurst(0.05, 0.06); },
  lose:  () => { tone(300, 0.12, { type: 'sawtooth', vol: 0.12 }); tone(200, 0.18, { type: 'sawtooth', vol: 0.12, when: 0.1 }); },
  partial: () => {
    tone(523, 0.1, { type: 'triangle', vol: 0.15 });
    tone(659, 0.12, { type: 'triangle', vol: 0.15, when: 0.08 });
  },
  jackpot: () => {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, 0.15, { type: 'triangle', vol: 0.18, when: i * 0.09 }));
    tone(1568, 0.4, { type: 'sine', vol: 0.15, when: 0.5 });
  },
  coin: (n = 6) => {
    for (let i = 0; i < n; i++) {
      tone(1200 + Math.random() * 600, 0.05, { type: 'triangle', vol: 0.08, when: i * 0.06 });
    }
  },
  skull: () => {
    tone(140, 0.5, { type: 'sawtooth', vol: 0.2 });
    tone(80, 0.6, { type: 'sawtooth', vol: 0.2, when: 0.05 });
    noiseBurst(0.3, 0.15);
  },
};

/* ─── UTILITIES ──────────────────────────────────────────────── */
function weightedRandom() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[0];
}
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildStrip(stripEl, landingSymbol, extraSpins = 24) {
  stripEl.innerHTML = '';
  const seq = [];
  for (let i = 0; i < extraSpins; i++) seq.push(weightedRandom());
  seq.push(weightedRandom());
  seq.push(landingSymbol);
  seq.push(weightedRandom());
  seq.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'cell' + (i === seq.length - 2 ? ' center target' : '');
    d.textContent = s.emoji;
    stripEl.appendChild(d);
  });
  return seq.length;
}

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateDisplay(flashWin = false) {
  dom.balance.textContent = fmt(state.balance);
  dom.lastWin.textContent = fmt(state.lastWin);
  dom.spinCount.textContent = state.spins;
  dom.betDisplay.textContent = state.bet;
  dom.balance.classList.toggle('danger', state.balance < BET_LEVELS[0]);
  dom.betDown.disabled = state.betIndex === 0 || state.spinning;
  dom.betUp.disabled = state.betIndex === BET_LEVELS.length - 1 || state.spinning;
  if (flashWin) {
    dom.lastWin.classList.remove('flash');
    void dom.lastWin.offsetWidth;
    dom.lastWin.classList.add('flash');
    dom.balance.classList.remove('flash');
    void dom.balance.offsetWidth;
    dom.balance.classList.add('flash');
  }
}

/* ─── REEL SPIN ──────────────────────────────────────────────── */
function spinReel(idx, symbol, duration) {
  return new Promise(resolve => {
    const reel = dom.reels[idx];
    const reelHeight = reel.el.clientHeight;
    const ch = cellHeight();
    const count = buildStrip(reel.strip, symbol);
    const centerOffset = (reelHeight - ch) / 2;
    const targetIdx = count - 2;
    const endY = -(targetIdx * ch) + centerOffset;

    reel.strip.style.transition = 'none';
    reel.strip.style.transform = `translateY(${centerOffset}px)`;

    // tick sounds during spin
    const tickInterval = setInterval(() => sfx.tick(), 80);

    requestAnimationFrame(() => {
      reel.strip.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.6, 0.25, 1)`;
      reel.strip.style.transform = `translateY(${endY}px)`;
    });

    setTimeout(() => {
      clearInterval(tickInterval);
      sfx.stop();
      reel.el.classList.add('landed');
      setTimeout(() => reel.el.classList.remove('landed'), 300);
      resolve();
    }, duration);
  });
}

/* ─── WIN EVALUATION ─────────────────────────────────────────── */
function evaluate(r) {
  const [a, b, c] = r;
  if (a.name === b.name && b.name === c.name) return { type: 'jackpot', symbol: a };
  if (b.name === a.name || b.name === c.name) return { type: 'partial', symbol: b };
  if (a.name === c.name) return { type: 'partial', symbol: a };
  return { type: 'lose' };
}

/* ─── PARTICLE FX ────────────────────────────────────────────── */
const fx = (() => {
  const canvas = $('fx');
  const ctx = canvas.getContext('2d');
  const particles = [];
  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  function burst(x, y, opts = {}) {
    const count = opts.count || 60;
    const colors = opts.colors || ['#ffc542', '#ffeb8a', '#00e281', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 9;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 3,
        g: 0.18,
        life: 1,
        decay: 0.012 + Math.random() * 0.01,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.vx *= 0.99;
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

function celebrate() {
  const rect = dom.machine.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  fx.burst(cx, cy, { count: 120 });
  // side cannons
  setTimeout(() => fx.burst(rect.left + 40, cy, { count: 60 }), 120);
  setTimeout(() => fx.burst(rect.right - 40, cy, { count: 60 }), 240);
}

function showWinBanner(amount, isJackpot) {
  dom.winBannerText.textContent = (isJackpot ? 'JACKPOT ' : 'WIN ') + '+' + fmt(amount);
  dom.winBanner.classList.remove('show');
  void dom.winBanner.offsetWidth;
  dom.winBanner.classList.add('show');
}

/* ─── SPIN FLOW ──────────────────────────────────────────────── */
async function spin() {
  if (state.spinning) return;
  if (state.balance < state.bet) {
    dom.message.textContent = "Insufficient balance. Refill or lower your bet.";
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
  dom.message.textContent = '';
  updateDisplay();

  sfx.click();

  const results = [weightedRandom(), weightedRandom(), weightedRandom()];
  await Promise.all([
    spinReel(0, results[0], 900),
    spinReel(1, results[1], 1300),
    spinReel(2, results[2], 1700),
  ]);

  const outcome = evaluate(results);

  if (outcome.type === 'jackpot') {
    const sym = outcome.symbol;
    if (sym.name === 'skull') {
      const penalty = state.bet * 2;
      state.balance = Math.max(0, state.balance - penalty);
      dom.machine.classList.add('shake');
      setTimeout(() => dom.machine.classList.remove('shake'), 500);
      dom.message.textContent = JACKPOT_MESSAGES.skull + ` Penalty: −${penalty}`;
      sfx.skull();
    } else {
      const win = state.bet * sym.value;
      state.balance += win;
      state.lastWin = win;
      dom.reels.forEach(r => {
        r.el.classList.add('winning');
        setTimeout(() => r.el.classList.remove('winning'), 2000);
      });
      dom.machine.classList.add('jackpot');
      setTimeout(() => dom.machine.classList.remove('jackpot'), 2500);
      dom.message.textContent = JACKPOT_MESSAGES[sym.name];
      showWinBanner(win, true);
      sfx.jackpot();
      sfx.coin(10);
      celebrate();
    }
  } else if (outcome.type === 'partial') {
    const sym = outcome.symbol;
    const win = Math.max(1, Math.floor(state.bet * sym.value * 0.25));
    state.balance += win;
    state.lastWin = win;
    dom.message.textContent = rand(PARTIAL_MESSAGES);
    showWinBanner(win, false);
    sfx.partial();
    sfx.coin(3);
    const rect = dom.machine.getBoundingClientRect();
    fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { count: 30, colors: ['#00e281', '#ffc542'] });
  } else {
    dom.message.textContent = rand(LOSE_MESSAGES);
    sfx.lose();
  }

  updateDisplay(state.lastWin > 0);

  setTimeout(() => {
    state.spinning = false;
    dom.spinBtn.disabled = state.balance < BET_LEVELS[0];
    dom.spinBtn.classList.remove('processing');
    dom.spinBtn.querySelector('.spin-label').textContent = 'SPIN';
    updateDisplay();
  }, 350);
}

/* ─── INIT REEL STARTING POSITION ────────────────────────────── */
function initReels() {
  const ch = cellHeight();
  dom.reels.forEach(r => {
    const centerOffset = (r.el.clientHeight - ch) / 2;
    r.strip.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div');
      d.className = 'cell' + (i === 1 ? ' center' : '');
      d.textContent = weightedRandom().emoji;
      r.strip.appendChild(d);
    }
    r.strip.style.transform = `translateY(${centerOffset - ch}px)`;
  });
}

/* ─── EVENTS ─────────────────────────────────────────────────── */
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
  // pick highest bet <= balance, or max if balance allows
  let idx = 0;
  for (let i = BET_LEVELS.length - 1; i >= 0; i--) {
    if (BET_LEVELS[i] <= state.balance) { idx = i; break; }
  }
  state.betIndex = idx;
  state.bet = BET_LEVELS[idx];
  sfx.click();
  updateDisplay();
});
dom.refill.addEventListener('click', () => {
  state.balance += 500;
  dom.message.textContent = "Emergency compute credit: +500 tokens.";
  sfx.coin(5);
  updateDisplay(true);
});
dom.soundBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  dom.soundBtn.classList.toggle('muted', state.muted);
  if (!state.muted) sfx.click();
});

addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (!state.spinning && !dom.spinBtn.disabled) spin();
  } else if (e.code === 'ArrowLeft' && !state.spinning) {
    dom.betDown.click();
  } else if (e.code === 'ArrowRight' && !state.spinning) {
    dom.betUp.click();
  } else if (e.key === 'm' || e.key === 'M') {
    dom.soundBtn.click();
  }
});

// Prime audio on first interaction
addEventListener('pointerdown', () => ac(), { once: true });

initReels();
updateDisplay();
addEventListener('resize', () => { if (!state.spinning) initReels(); });
