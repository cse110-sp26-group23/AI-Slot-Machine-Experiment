(() => {
  const SYMBOLS = [
    { id: 'diamond', emoji: '💎', weight: 2,  payout: 50 },
    { id: 'seven',   emoji: '7️⃣', weight: 4,  payout: 25 },
    { id: 'bell',    emoji: '🔔', weight: 6,  payout: 15 },
    { id: 'star',    emoji: '⭐', weight: 8,  payout: 10 },
    { id: 'cherry',  emoji: '🍒', weight: 11, payout: 5  },
    { id: 'lemon',   emoji: '🍋', weight: 14, payout: 3  },
  ];

  const BET_STEPS = [1, 5, 10, 25, 50, 100, 250];
  const START_BALANCE = 1000;
  const STRIP_LEN = 40;

  const pool = SYMBOLS.flatMap(s => Array(s.weight).fill(s));
  const pickSymbol = () => pool[Math.floor(Math.random() * pool.length)];
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const state = {
    balance: START_BALANCE,
    betIdx: 2,
    spinning: false,
    muted: false,
    lastWin: 0,
  };

  const $ = id => document.getElementById(id);
  const reelEls = [...document.querySelectorAll('.reel')];
  const stripEls = reelEls.map(r => r.querySelector('.strip'));
  const machineEl = document.querySelector('.machine');
  const balanceEl = $('balance');
  const betEl = $('bet');
  const spinBtn = $('spin');
  const betUp = $('bet-up');
  const betDown = $('bet-down');
  const resetBtn = $('reset');
  const muteBtn = $('mute');
  const toastEl = $('toast');
  const winBanner = $('winBanner');
  const lastWinValue = $('lastWinValue');
  const fx = $('fx');
  const fxCtx = fx.getContext('2d');

  // ---- AUDIO ----
  let audioCtx;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function beep({ freq = 440, dur = 0.1, type = 'sine', vol = 0.12, attack = 0.005, decay = 0.1, slide = 0 }) {
    if (state.muted) return;
    const ctx = ensureAudio();
    const t = ctx.currentTime;
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
    osc.stop(t + attack + decay + 0.02);
  }

  function noise(dur = 0.1, vol = 0.08) {
    if (state.muted) return;
    const ctx = ensureAudio();
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
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
    spin: () => beep({ freq: 600, dur: 0.08, type: 'square', vol: 0.05, decay: 0.06 }),
    tick: () => beep({ freq: 1200, dur: 0.03, type: 'square', vol: 0.04, decay: 0.03 }),
    stop: () => { noise(0.05, 0.06); beep({ freq: 220, dur: 0.1, type: 'triangle', vol: 0.08, decay: 0.12 }); },
    coin: (i = 0) => beep({ freq: 880 + i * 120, dur: 0.08, type: 'sine', vol: 0.1, decay: 0.12 }),
    win: () => {
      [0, 100, 200, 300, 450].forEach((d, i) => setTimeout(() => beep({ freq: [523, 659, 784, 988, 1319][i], dur: 0.14, type: 'triangle', vol: 0.12, decay: 0.2 }), d));
    },
    jackpot: () => {
      const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
      notes.forEach((f, i) => setTimeout(() => beep({ freq: f, dur: 0.18, type: 'triangle', vol: 0.14, decay: 0.22 }), i * 90));
    },
    lose: () => beep({ freq: 300, dur: 0.25, type: 'sawtooth', vol: 0.06, decay: 0.3, slide: -180 }),
    click: () => beep({ freq: 800, dur: 0.03, type: 'square', vol: 0.05, decay: 0.04 }),
  };

  // ---- REELS ----
  function makeSymbolEl(sym) {
    const d = document.createElement('div');
    d.className = 'symbol';
    d.textContent = sym.emoji;
    d.dataset.id = sym.id;
    return d;
  }

  function getSymbolHeight() {
    const reel = reelEls[0];
    return reel.clientHeight / 3;
  }

  function setSymbolHeight() {
    const h = getSymbolHeight();
    document.documentElement.style.setProperty('--sym', `${h}px`);
    return h;
  }

  function buildStrip(stripEl, finalSymbol) {
    stripEl.innerHTML = '';
    for (let i = 0; i < STRIP_LEN - 1; i++) {
      stripEl.appendChild(makeSymbolEl(pickSymbol()));
    }
    stripEl.appendChild(makeSymbolEl(finalSymbol));
  }

  function placeStatic(i, sym) {
    const h = setSymbolHeight();
    const strip = stripEls[i];
    buildStrip(strip, sym);
    const endY = -((STRIP_LEN - 1) * h - h);
    strip.style.transition = 'none';
    strip.style.transform = `translateY(${endY}px)`;
  }

  function spinReel(i, finalSymbol, duration) {
    return new Promise(resolve => {
      const h = setSymbolHeight();
      const strip = stripEls[i];
      const reelEl = reelEls[i];
      buildStrip(strip, finalSymbol);
      const endY = -((STRIP_LEN - 2) * h);
      const startY = h * 2;
      const overshoot = endY - h * 0.6;

      const anim = strip.animate(
        [
          { transform: `translateY(${startY}px)`, easing: 'cubic-bezier(0.33, 0, 0.2, 1)' },
          { transform: `translateY(${overshoot}px)`, offset: 0.92, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
          { transform: `translateY(${endY}px)` },
        ],
        { duration, fill: 'forwards' }
      );

      anim.onfinish = () => {
        strip.style.transform = `translateY(${endY}px)`;
        reelEl.animate(
          [{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }],
          { duration: 160, easing: 'ease-out' }
        );
        sfx.stop();
        resolve();
      };
    });
  }

  // ---- UI ----
  const fmt = n => n.toFixed(2);

  function render() {
    balanceEl.textContent = fmt(state.balance);
    betEl.textContent = fmt(BET_STEPS[state.betIdx]);
    lastWinValue.textContent = fmt(state.lastWin);
    spinBtn.disabled = state.spinning || state.balance < BET_STEPS[state.betIdx];
    betUp.disabled = state.spinning || state.betIdx >= BET_STEPS.length - 1;
    betDown.disabled = state.spinning || state.betIdx <= 0;
  }

  function toast(msg, kind = '') {
    toastEl.textContent = msg;
    toastEl.className = 'toast show ' + kind;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2000);
  }

  function showBanner(text, mega = false) {
    winBanner.textContent = text;
    winBanner.className = 'win-banner show' + (mega ? ' mega' : '');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => winBanner.classList.remove('show'), 2600);
  }

  // ---- CONFETTI / PARTICLES ----
  const particles = [];
  function resizeFx() {
    fx.width = window.innerWidth * devicePixelRatio;
    fx.height = window.innerHeight * devicePixelRatio;
    fx.style.width = window.innerWidth + 'px';
    fx.style.height = window.innerHeight + 'px';
    fxCtx.scale(devicePixelRatio, devicePixelRatio);
  }
  resizeFx();
  window.addEventListener('resize', () => {
    fxCtx.setTransform(1, 0, 0, 1, 0, 0);
    resizeFx();
  });

  function burst(x, y, count = 60, colors = ['#1fff8f', '#ffd166', '#ffffff', '#00d47a']) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 6;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        g: 0.15,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
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
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      fxCtx.save();
      fxCtx.globalAlpha = p.life;
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      fxCtx.fillStyle = p.color;
      fxCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
      fxCtx.restore();
    }
    requestAnimationFrame(fxLoop);
  }
  fxLoop();

  // ---- SPIN ----
  async function spin() {
    if (state.spinning) return;
    ensureAudio();
    const bet = BET_STEPS[state.betIdx];
    if (state.balance < bet) return;

    state.spinning = true;
    state.balance -= bet;
    state.lastWin = 0;
    machineEl.classList.remove('show-line');
    reelEls.forEach(r => r.classList.remove('win-reel'));
    render();
    spinBtn.classList.add('spinning');
    sfx.spin();

    const tickInterval = setInterval(sfx.tick, 90);

    const results = [pickSymbol(), pickSymbol(), pickSymbol()];
    await Promise.all([
      spinReel(0, results[0], 1100),
      spinReel(1, results[1], 1450),
      spinReel(2, results[2], 1800),
    ]);
    clearInterval(tickInterval);

    evaluate(results, bet);
    state.spinning = false;
    spinBtn.classList.remove('spinning');
    render();
  }

  function evaluate(results, bet) {
    const [a, b, c] = results;
    let payout = 0;
    let winIndices = [];

    if (a.id === b.id && b.id === c.id) {
      payout = bet * a.payout;
      winIndices = [0, 1, 2];
    } else if (a.id === b.id) {
      payout = bet * (a.payout / 10);
      winIndices = [0, 1];
    } else if (b.id === c.id) {
      payout = bet * (b.payout / 10);
      winIndices = [1, 2];
    } else if (a.id === c.id) {
      payout = bet * (a.payout / 10);
      winIndices = [0, 2];
    }

    if (payout > 0) {
      state.balance += payout;
      state.lastWin = payout;
      lastWinValue.classList.remove('flash');
      void lastWinValue.offsetWidth;
      lastWinValue.classList.add('flash');
      machineEl.classList.add('show-line');
      winIndices.forEach(i => {
        reelEls[i].classList.add('win-reel');
        const symEls = stripEls[i].querySelectorAll('.symbol');
        symEls[symEls.length - 1]?.classList.add('winning');
      });

      machineEl.classList.remove('flash');
      void machineEl.offsetWidth;
      machineEl.classList.add('flash');
      setTimeout(() => machineEl.classList.remove('flash'), 650);

      const isJackpot = winIndices.length === 3;
      if (isJackpot) {
        showBanner(`JACKPOT  +${fmt(payout)}`, true);
        sfx.jackpot();
        const rect = machineEl.getBoundingClientRect();
        burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 120);
        setTimeout(() => burst(rect.left + rect.width / 3, rect.top + rect.height / 2, 60), 200);
        setTimeout(() => burst(rect.right - rect.width / 3, rect.top + rect.height / 2, 60), 400);
      } else {
        showBanner(`WIN  +${fmt(payout)}`);
        sfx.win();
        const rect = machineEl.getBoundingClientRect();
        burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
      }

      // Coin patter
      for (let i = 0; i < 5; i++) setTimeout(() => sfx.coin(i), 100 + i * 80);
    } else {
      sfx.lose();
      if (state.balance < BET_STEPS[0]) {
        setTimeout(() => toast('Out of tokens. Tap ↻ to reset.', 'bad'), 300);
      }
    }
  }

  // ---- EVENTS ----
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
    render();
    toast('Balance reset', 'good');
  });
  muteBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    muteBtn.textContent = state.muted ? '🔇' : '🔊';
    if (!state.muted) sfx.click();
  });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); spin(); }
    else if (e.code === 'ArrowUp' || e.code === 'ArrowRight') { e.preventDefault(); betUp.click(); }
    else if (e.code === 'ArrowDown' || e.code === 'ArrowLeft') { e.preventDefault(); betDown.click(); }
    else if (e.code === 'KeyM') { muteBtn.click(); }
  });

  window.addEventListener('resize', () => {
    // Re-place static symbols on resize
    if (!state.spinning) {
      for (let i = 0; i < 3; i++) {
        const sym = stripEls[i].lastElementChild;
        if (sym) placeStatic(i, SYMBOLS.find(s => s.id === sym.dataset.id) || pickSymbol());
      }
    }
  });

  // Init
  setSymbolHeight();
  for (let i = 0; i < 3; i++) placeStatic(i, pickSymbol());
  render();
})();
