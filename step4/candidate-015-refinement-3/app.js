(() => {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  const SYMBOLS = [
    { id: 'agi',    emoji: '🧠', weight: 2,  payout: 60 }, // super-intelligence
    { id: 'robot',  emoji: '🤖', weight: 4,  payout: 25 },
    { id: 'chip',   emoji: '💾', weight: 6,  payout: 15 }, // data
    { id: 'gpu',    emoji: '⚡', weight: 8,  payout: 10 }, // compute
    { id: 'gear',   emoji: '⚙️', weight: 11, payout: 5  }, // training
    { id: 'clip',   emoji: '📎', weight: 14, payout: 3  }, // paperclip (maximizer)
  ];

  const BET_STEPS = [1, 5, 10, 25, 50, 100, 250, 500];
  const BET_TIERS = [
    { max: 5,   name: 'LOW',     hue: 150, intensity: 0.15 },
    { max: 25,  name: 'MID',     hue: 150, intensity: 0.35 },
    { max: 100, name: 'HIGH',    hue: 45,  intensity: 0.6  },
    { max: 250, name: 'INSANE',  hue: 320, intensity: 0.85 },
    { max: Infinity, name: 'AGI', hue: 280, intensity: 1.0 },
  ];
  const START_BALANCE = 1000;
  const STRIP_LEN = 40;   // symbols in spinning strip
  const ROWS = 3;

  // Paylines on a 3x3 grid: [ [col0Row, col1Row, col2Row], ... ]
  const PAYLINES = [
    [0, 0, 0], // top row
    [1, 1, 1], // middle row
    [2, 2, 2], // bottom row
    [0, 1, 2], // diagonal TL->BR
    [2, 1, 0], // diagonal BL->TR
  ];

  // ============================================================
  // AI-FLAVORED QUIPS
  // ============================================================
  const QUIPS = {
    idle: [
      'Press SPIN to query the oracle…',
      'Warming up the GPUs…',
      'All aboard the hype train 🚂',
      'Your prompt could be worth millions.',
    ],
    spin: [
      'Running inference…',
      'Hallucinating results…',
      'Sampling from the latent space…',
      'Attending to heads…',
      'Backpropagating your hopes…',
      'Consulting the stochastic parrot…',
      'Rolling the dice on your gradient…',
      'Warming the transformer…',
      'Fine-tuning your fortune…',
      'Decoding next token…',
      'Bootstrapping RLHF…',
      'Loading checkpoint latest.ckpt…',
    ],
    loseSmall: [
      'Model collapsed. Try again.',
      'Loss went up. Literally.',
      'Your gradient vanished.',
      'Rate-limited by fate.',
      'Token budget: ouch.',
      'Out of distribution.',
      'That was a null prediction.',
      'Needs more training data.',
      'CUDA out of luck.',
      'Hallucination detected. Yours.',
      'Overfit to disappointment.',
      'Denoised… to nothing.',
      'The model refused to answer.',
      'Alignment: broken.',
    ],
    winSmall: [
      'Nice prompt engineering!',
      'Weights updated in your favor.',
      'Fine-tuned for victory.',
      'Loss curve? Descending beautifully.',
      'You found a prompt exploit.',
      'Benchmark: slightly above random.',
      'Training stable. Profit rising.',
      'Successful few-shot.',
    ],
    winMid: [
      'Emergent behavior unlocked!',
      'Your attention is all you need.',
      'Benchmark smashed, vibes maxed.',
      'Gradient ascent, baby!',
      'Mixture-of-experts approves.',
      'The loss is loss-ing.',
      'You hit the sweet spot in the loss landscape.',
    ],
    winBig: [
      'SINGULARITY INCOMING!',
      'You overfit to luck itself!',
      'SOTA — State Of The Awesome!',
      'Your reward model is THRILLED.',
      'Peer reviewed and blessed.',
      'NeurIPS acceptance vibes.',
    ],
    jackpot: [
      'AGI ACHIEVED — PAYOUT REAL',
      'YOU HAVE SOLVED ALIGNMENT',
      'PAPERCLIP MAXIMIZER APPROVES',
      'THE MODEL HAS BECOME SENTIENT',
      'SKYNET SENDS ITS REGARDS',
      'TURING TEST: YOU PASSED IT',
    ],
    broke: [
      'Out of compute credits. Visit the shop!',
      'GPU budget exhausted.',
      'Your context window has run out.',
      'Training halted: insufficient tokens.',
      'Wallet.pkl is empty.',
    ],
  };

  // ============================================================
  // FAKE MICROTRANSACTIONS
  // ============================================================
  const PACKAGES = [
    { id: 'starter',    emoji: '🍪', name: 'Cookie Crumb',       desc: '64 tokens. For tiny little decisions.',           amt: 64,     price: '$0.99',  hot: false },
    { id: 'pro',        emoji: '☕', name: 'Coffee Shot',         desc: '500 tokens. Enough to fine-tune your morning.',   amt: 500,    price: '$4.99',  hot: false },
    { id: 'whale',      emoji: '🐋', name: 'Whale Pack',          desc: '2,000 tokens. Now you\'re speaking TF32.',        amt: 2000,   price: '$19.99', hot: true  },
    { id: 'enterprise', emoji: '🏢', name: 'Enterprise Tier',     desc: '10,000 tokens + vague SLA + synergy.',            amt: 10000,  price: '$99.99', hot: false },
    { id: 'investor',   emoji: '💼', name: 'Seed Round',          desc: '50k tokens. Comes with a deck and vibes.',        amt: 50000,  price: '$499',   hot: false },
    { id: 'agi',        emoji: '🧠', name: 'AGI Bundle',          desc: 'One (1) million tokens. Side effects may include smugness.', amt: 1000000, price: '$9,999', hot: false },
  ];

  // ============================================================
  // UTIL
  // ============================================================
  const pool = SYMBOLS.flatMap(s => Array(s.weight).fill(s));
  const pickSymbol = () => pool[Math.floor(Math.random() * pool.length)];
  const pickFrom = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => n.toFixed(2);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  let _lastQuip = null;
  function pickQuip(pool) {
    if (!pool || !pool.length) return '';
    if (pool.length === 1) return pool[0];
    let q;
    do { q = pickFrom(pool); } while (q === _lastQuip);
    _lastQuip = q;
    return q;
  }

  // ============================================================
  // STATE
  // ============================================================
  const state = {
    balance: START_BALANCE,
    betIdx: 2,
    spinning: false,
    muted: false,
    lastWin: 0,
  };

  // ============================================================
  // DOM
  // ============================================================
  const $ = id => document.getElementById(id);
  const reelEls   = [...document.querySelectorAll('.reel')];
  const stripEls  = reelEls.map(r => r.querySelector('.strip'));
  const machineEl = $('machine');
  const balanceEl = $('balance');
  const betEl     = $('bet');
  const spinBtn   = $('spin');
  const betUp     = $('bet-up');
  const betDown   = $('bet-down');
  const resetBtn  = $('reset');
  const muteBtn   = $('mute');
  const shopBtn   = $('shop');
  const shopModal = $('shopModal');
  const shopClose = $('shopClose');
  const shopGrid  = $('shopGrid');
  const toastEl   = $('toast');
  const winBanner = $('winBanner');
  const lastWinEl = $('lastWinValue');
  const betStatEl = $('betStat');
  const tierEl    = $('stakeTier');
  const quipEl    = $('quip');
  const paylinesSvg = $('paylines');
  const fx        = $('fx');
  const fxCtx     = fx.getContext('2d');

  // ============================================================
  // AUDIO (Web Audio API, procedural)
  // ============================================================
  let audioCtx;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function beep({ freq = 440, dur = 0.1, type = 'sine', vol = 0.1, attack = 0.005, decay = 0.1, slide = 0, delay = 0 }) {
    if (state.muted) return;
    const ctx = ensureAudio();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + attack + decay + 0.04);
  }

  function noise(dur = 0.1, vol = 0.08) {
    if (state.muted) return;
    const ctx = ensureAudio();
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(ctx.destination);
    src.start(t);
  }

  const sfx = {
    spin: () => {
      const t = tier();
      beep({ freq: 500 + t.intensity * 200, dur: 0.12, type: 'square', vol: 0.05 + t.intensity * 0.04, decay: 0.1 });
    },
    tick: () => beep({ freq: 1100, dur: 0.025, type: 'square', vol: 0.04, decay: 0.025 }),
    stop: (i = 0) => {
      const t = tier();
      noise(0.04, 0.05 + t.intensity * 0.04);
      beep({ freq: 200 - i * 20, dur: 0.12, type: 'triangle', vol: 0.08 + t.intensity * 0.05, decay: 0.15 });
    },
    coin: (i = 0) => beep({ freq: 880 + i * 120, dur: 0.08, type: 'sine', vol: 0.1, decay: 0.12 }),
    win: () => {
      const notes = [523, 659, 784, 988, 1319];
      notes.forEach((f, i) => beep({ freq: f, dur: 0.14, type: 'triangle', vol: 0.12, decay: 0.2, delay: i * 0.08 }));
    },
    jackpot: () => {
      const notes = [523, 659, 784, 1047, 1319, 1568, 2093, 2637];
      notes.forEach((f, i) => beep({ freq: f, dur: 0.2, type: 'triangle', vol: 0.14, decay: 0.25, delay: i * 0.09 }));
      notes.forEach((f, i) => beep({ freq: f / 2, dur: 0.2, type: 'sawtooth', vol: 0.05, decay: 0.25, delay: i * 0.09 }));
    },
    lose: () => beep({ freq: 300, dur: 0.25, type: 'sawtooth', vol: 0.06, decay: 0.3, slide: -200 }),
    click: () => beep({ freq: 800, dur: 0.03, type: 'square', vol: 0.05, decay: 0.04 }),
    purchase: () => {
      const notes = [523, 784, 1047, 1568];
      notes.forEach((f, i) => beep({ freq: f, dur: 0.12, type: 'sine', vol: 0.12, decay: 0.15, delay: i * 0.06 }));
    },
  };

  // ============================================================
  // BET TIERS — drives "juice"
  // ============================================================
  function tier() {
    const bet = BET_STEPS[state.betIdx];
    return BET_TIERS.find(t => bet <= t.max) || BET_TIERS[BET_TIERS.length - 1];
  }

  function applyTierStyles() {
    const t = tier();
    document.documentElement.style.setProperty('--bet-hue', t.hue);
    document.documentElement.style.setProperty('--bet-intensity', t.intensity);
    tierEl.textContent = t.name;
  }

  // ============================================================
  // REELS
  // ============================================================
  function makeSymbolEl(sym) {
    const d = document.createElement('div');
    d.className = 'symbol';
    d.textContent = sym.emoji;
    d.dataset.id = sym.id;
    return d;
  }

  function getSymbolHeight() {
    const reel = reelEls[0];
    return reel.clientHeight / ROWS;
  }
  function setSymbolHeight() {
    const h = getSymbolHeight();
    document.documentElement.style.setProperty('--sym', `${h}px`);
    return h;
  }

  // Build a strip ending with the 3 final symbols (row 0, 1, 2).
  function buildStrip(stripEl, finalSyms) {
    stripEl.innerHTML = '';
    const filler = STRIP_LEN - ROWS;
    for (let i = 0; i < filler; i++) stripEl.appendChild(makeSymbolEl(pickSymbol()));
    finalSyms.forEach(s => stripEl.appendChild(makeSymbolEl(s)));
  }

  // Land with the last ROWS symbols visible in the reel (rows 0..2).
  function finalOffset(h) {
    // Last symbol should be at bottom row => translateY = -(STRIP_LEN - ROWS) * h
    return -((STRIP_LEN - ROWS) * h);
  }

  function placeStatic(i, finalSyms) {
    const h = setSymbolHeight();
    const strip = stripEls[i];
    buildStrip(strip, finalSyms);
    strip.style.transition = 'none';
    strip.style.transform = `translateY(${finalOffset(h)}px)`;
  }

  function spinReel(i, finalSyms, duration) {
    return new Promise(resolve => {
      const h = setSymbolHeight();
      const strip = stripEls[i];
      const reelEl = reelEls[i];
      buildStrip(strip, finalSyms);

      const endY = finalOffset(h);
      const startY = h * ROWS;
      const overshoot = endY - h * 0.5;

      const anim = strip.animate(
        [
          { transform: `translateY(${startY}px)`, easing: 'cubic-bezier(0.33, 0, 0.2, 1)' },
          { transform: `translateY(${overshoot}px)`, offset: 0.9, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
          { transform: `translateY(${endY}px)` },
        ],
        { duration, fill: 'forwards' }
      );

      anim.onfinish = () => {
        strip.style.transform = `translateY(${endY}px)`;
        const bumpY = 3 + tier().intensity * 4;
        reelEl.animate(
          [{ transform: 'translateY(0)' }, { transform: `translateY(${bumpY}px)` }, { transform: 'translateY(0)' }],
          { duration: 160, easing: 'ease-out' }
        );
        sfx.stop(i);
        resolve();
      };
    });
  }

  // ============================================================
  // UI
  // ============================================================
  function render() {
    balanceEl.textContent = fmt(state.balance);
    betEl.textContent = fmt(BET_STEPS[state.betIdx]);
    betStatEl.textContent = fmt(BET_STEPS[state.betIdx]);
    lastWinEl.textContent = fmt(state.lastWin);
    spinBtn.disabled = state.spinning || state.balance < BET_STEPS[state.betIdx];
    betUp.disabled   = state.spinning || state.betIdx >= BET_STEPS.length - 1;
    betDown.disabled = state.spinning || state.betIdx <= 0;
    applyTierStyles();
  }

  function flashBalance(dir) {
    balanceEl.classList.remove('up', 'down');
    void balanceEl.offsetWidth;
    balanceEl.classList.add(dir);
    setTimeout(() => balanceEl.classList.remove(dir), 500);
  }

  function toast(msg, kind = '') {
    toastEl.textContent = msg;
    toastEl.className = 'toast show ' + kind;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function showBanner(text, mega = false) {
    winBanner.textContent = text;
    winBanner.className = 'win-banner show' + (mega ? ' mega' : '');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => winBanner.classList.remove('show'), 2400);
  }

  function setQuip(text, kind = '') {
    quipEl.textContent = text;
    quipEl.className = 'quip flash ' + kind;
    void quipEl.offsetWidth;
    quipEl.classList.add('flash');
  }

  // ============================================================
  // PAYLINE DRAWING (SVG)
  // ============================================================
  function clearPaylines() {
    paylinesSvg.innerHTML = '';
  }

  function drawPayline(line) {
    // Grid is 3 cols × 3 rows. SVG viewBox is 0..300 x 0..300.
    const colX = [50, 150, 250];
    const rowY = [50, 150, 250];
    const ns = 'http://www.w3.org/2000/svg';
    const el = document.createElementNS(ns, 'polyline');
    const pts = line.map((r, c) => `${colX[c]},${rowY[r]}`).join(' ');
    el.setAttribute('points', pts);
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', `hsl(${tier().hue}, 100%, 65%)`);
    el.setAttribute('stroke-width', 3);
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('class', 'show');
    el.style.filter = `drop-shadow(0 0 6px hsl(${tier().hue}, 100%, 60%))`;
    el.style.opacity = 1;
    el.style.animation = 'dashPulse 1.2s ease-in-out infinite';
    paylinesSvg.appendChild(el);
  }

  // ============================================================
  // PARTICLES
  // ============================================================
  const particles = [];
  function resizeFx() {
    const dpr = window.devicePixelRatio || 1;
    fx.width = window.innerWidth * dpr;
    fx.height = window.innerHeight * dpr;
    fx.style.width = window.innerWidth + 'px';
    fx.style.height = window.innerHeight + 'px';
    fxCtx.setTransform(1, 0, 0, 1, 0, 0);
    fxCtx.scale(dpr, dpr);
  }
  resizeFx();
  window.addEventListener('resize', resizeFx);

  function burst(x, y, count = 60, palette) {
    const colors = palette || ['#1fff8f', '#ffd166', '#ffffff', '#b892ff', '#ff4b6e'];
    const power = 1 + tier().intensity * 0.8;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (2 + Math.random() * 6) * power;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        g: 0.16,
        life: 1,
        decay: 0.006 + Math.random() * 0.012,
        size: 3 + Math.random() * 4,
        color: pickFrom(colors),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  function fxLoop() {
    fxCtx.clearRect(0, 0, fx.width, fx.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > window.innerHeight + 40) { particles.splice(i, 1); continue; }
      fxCtx.save();
      fxCtx.globalAlpha = clamp(p.life, 0, 1);
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      fxCtx.fillStyle = p.color;
      fxCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
      fxCtx.restore();
    }
    requestAnimationFrame(fxLoop);
  }
  fxLoop();

  // ============================================================
  // SCREEN SHAKE (scaled by bet intensity)
  // ============================================================
  function shake(durMs = 400) {
    machineEl.style.setProperty('--shakeDur', `${durMs}ms`);
    machineEl.classList.remove('shake');
    void machineEl.offsetWidth;
    machineEl.classList.add('shake');
    setTimeout(() => machineEl.classList.remove('shake'), durMs);
  }

  // ============================================================
  // SPIN CORE
  // ============================================================
  async function spin() {
    if (state.spinning) return;
    ensureAudio();
    const bet = BET_STEPS[state.betIdx];
    if (state.balance < bet) {
      setQuip(pickQuip(QUIPS.broke), 'bad');
      toast('Insufficient compute budget.', 'bad');
      return;
    }

    state.spinning = true;
    state.balance -= bet;
    flashBalance('down');
    state.lastWin = 0;
    clearPaylines();
    document.querySelectorAll('.symbol.winning').forEach(el => el.classList.remove('winning'));
    render();

    spinBtn.classList.add('spinning');
    setQuip(pickQuip(QUIPS.spin));
    sfx.spin();

    const tickInterval = setInterval(sfx.tick, 85);

    // Generate a 3x3 grid. results[col] = [row0Symbol, row1Symbol, row2Symbol]
    const results = [0, 1, 2].map(() => [pickSymbol(), pickSymbol(), pickSymbol()]);
    const t = tier();
    const baseDur = 900 + t.intensity * 350;

    await Promise.all([
      spinReel(0, results[0], baseDur),
      spinReel(1, results[1], baseDur + 300),
      spinReel(2, results[2], baseDur + 620),
    ]);
    clearInterval(tickInterval);

    evaluate(results, bet);
    state.spinning = false;
    spinBtn.classList.remove('spinning');
    render();
  }

  // ============================================================
  // EVALUATION — sums over all paylines
  // ============================================================
  function evaluate(results, bet) {
    let totalPayout = 0;
    const winningCells = new Set();       // "col,row"
    const winningLines = [];

    for (const line of PAYLINES) {
      const syms = line.map((row, col) => results[col][row]);
      const [a, b, c] = syms;
      let linePay = 0;
      let cells = null;

      if (a.id === b.id && b.id === c.id) {
        linePay = bet * a.payout;
        cells = [0, 1, 2];
      } else if (a.id === b.id) {
        linePay = bet * (a.payout / 10);
        cells = [0, 1];
      } else if (b.id === c.id) {
        linePay = bet * (b.payout / 10);
        cells = [1, 2];
      }

      if (linePay > 0) {
        totalPayout += linePay;
        winningLines.push(line);
        cells.forEach(col => winningCells.add(`${col},${line[col]}`));
      }
    }

    if (totalPayout > 0) {
      state.balance += totalPayout;
      state.lastWin = totalPayout;
      flashBalance('up');

      // Highlight winning cells
      winningCells.forEach(key => {
        const [col, row] = key.split(',').map(Number);
        const syms = stripEls[col].querySelectorAll('.symbol');
        // The last ROWS symbols are visible rows 0..ROWS-1
        const targetIdx = syms.length - ROWS + row;
        syms[targetIdx]?.classList.add('winning');
      });

      // Draw paylines
      winningLines.forEach((line, i) => setTimeout(() => drawPayline(line), i * 120));

      // Flash + stats
      lastWinEl.classList.remove('flash');
      void lastWinEl.offsetWidth;
      lastWinEl.classList.add('flash');

      machineEl.classList.remove('flash');
      void machineEl.offsetWidth;
      machineEl.classList.add('flash');
      setTimeout(() => machineEl.classList.remove('flash'), 650);

      const hasTriple = winningLines.some(line => {
        const syms = line.map((row, col) => results[col][row]);
        return syms.every(s => s.id === syms[0].id);
      });
      const isJackpot = hasTriple && (winningLines.length >= 2 || totalPayout >= bet * 40);
      const isBigWin = !isJackpot && (hasTriple || totalPayout >= bet * 15);
      const isMidWin = !isJackpot && !isBigWin && totalPayout >= bet * 4;

      const rect = machineEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      if (isJackpot) {
        showBanner(`JACKPOT  +${fmt(totalPayout)}`, true);
        setQuip(pickQuip(QUIPS.jackpot), 'mega');
        sfx.jackpot();
        shake(700);
        burst(cx, cy, 160);
        setTimeout(() => burst(rect.left + 40, cy, 80), 180);
        setTimeout(() => burst(rect.right - 40, cy, 80), 360);
        setTimeout(() => burst(cx, rect.top + 20, 60), 540);
      } else if (isBigWin) {
        showBanner(`BIG WIN  +${fmt(totalPayout)}`);
        setQuip(pickQuip(QUIPS.winBig), 'good');
        sfx.jackpot();
        shake(500);
        burst(cx, cy, 100);
      } else if (isMidWin) {
        showBanner(`WIN  +${fmt(totalPayout)}`);
        setQuip(pickQuip(QUIPS.winMid), 'good');
        sfx.win();
        shake(300);
        burst(cx, cy, 60);
      } else {
        showBanner(`+${fmt(totalPayout)}`);
        setQuip(pickQuip(QUIPS.winSmall), 'good');
        sfx.win();
        burst(cx, cy, 30);
      }

      const coinCount = Math.min(8, 3 + Math.floor(totalPayout / Math.max(1, bet)));
      for (let i = 0; i < coinCount; i++) setTimeout(() => sfx.coin(i), 100 + i * 70);
    } else {
      sfx.lose();
      setQuip(pickQuip(QUIPS.loseSmall), 'bad');
      if (state.balance < BET_STEPS[0]) {
        setTimeout(() => {
          setQuip(pickQuip(QUIPS.broke), 'bad');
          toast('Out of tokens. Open the shop!', 'bad');
        }, 600);
      }
    }
  }

  // ============================================================
  // SHOP (fake microtransactions)
  // ============================================================
  function buildShop() {
    shopGrid.innerHTML = '';
    PACKAGES.forEach(pkg => {
      const el = document.createElement('div');
      el.className = 'pkg' + (pkg.hot ? ' hot' : '');
      el.innerHTML = `
        <div class="pkg-emoji">${pkg.emoji}</div>
        <div class="pkg-name">${pkg.name}</div>
        <div class="pkg-desc">${pkg.desc}</div>
        <div class="pkg-amt">+${pkg.amt.toLocaleString()} TKN</div>
        <div class="pkg-price">${pkg.price}</div>
      `;
      el.addEventListener('click', () => purchase(pkg));
      shopGrid.appendChild(el);
    });
  }

  function openShop()  { shopModal.classList.add('show'); shopModal.setAttribute('aria-hidden', 'false'); sfx.click(); }
  function closeShop() { shopModal.classList.remove('show'); shopModal.setAttribute('aria-hidden', 'true'); }

  function purchase(pkg) {
    sfx.purchase();
    state.balance += pkg.amt;
    flashBalance('up');
    render();
    closeShop();
    toast(`Just kidding — ${pkg.amt.toLocaleString()} tokens on the house.`, 'good');
    // small confetti at top
    const rect = balanceEl.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.bottom + 6, 50, ['#1fff8f', '#ffd166', '#ffffff']);
  }

  // ============================================================
  // EVENTS
  // ============================================================
  spinBtn.addEventListener('click', spin);
  betUp.addEventListener('click', () => {
    if (state.betIdx < BET_STEPS.length - 1) { state.betIdx++; sfx.click(); render(); }
  });
  betDown.addEventListener('click', () => {
    if (state.betIdx > 0) { state.betIdx--; sfx.click(); render(); }
  });
  resetBtn.addEventListener('click', () => {
    state.balance = START_BALANCE;
    state.lastWin = 0;
    sfx.click();
    flashBalance('up');
    render();
    toast('Balance reset', 'good');
  });
  muteBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    muteBtn.textContent = state.muted ? '🔇' : '🔊';
    if (!state.muted) sfx.click();
  });
  shopBtn.addEventListener('click', openShop);
  shopClose.addEventListener('click', closeShop);
  shopModal.addEventListener('click', e => { if (e.target === shopModal) closeShop(); });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Escape' && shopModal.classList.contains('show')) { closeShop(); return; }
    if (shopModal.classList.contains('show')) return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); spin(); }
    else if (e.code === 'ArrowUp'   || e.code === 'ArrowRight') { e.preventDefault(); betUp.click(); }
    else if (e.code === 'ArrowDown' || e.code === 'ArrowLeft')  { e.preventDefault(); betDown.click(); }
    else if (e.code === 'KeyM') muteBtn.click();
    else if (e.code === 'KeyB') shopBtn.click();
  });

  window.addEventListener('resize', () => {
    if (state.spinning) return;
    for (let i = 0; i < 3; i++) {
      const syms = stripEls[i].querySelectorAll('.symbol');
      const finals = [];
      for (let r = 0; r < ROWS; r++) {
        const idx = syms.length - ROWS + r;
        const id = syms[idx]?.dataset.id;
        finals.push(SYMBOLS.find(s => s.id === id) || pickSymbol());
      }
      placeStatic(i, finals);
    }
  });

  // ============================================================
  // INIT
  // ============================================================
  buildShop();
  setSymbolHeight();
  for (let i = 0; i < 3; i++) {
    placeStatic(i, [pickSymbol(), pickSymbol(), pickSymbol()]);
  }
  setQuip(pickQuip(QUIPS.idle));
  render();
})();
